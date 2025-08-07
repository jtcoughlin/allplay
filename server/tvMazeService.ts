import fetch from 'node-fetch';

export interface TVMazeShow {
  id: number;
  name: string;
  genres: string[];
  runtime?: number;
  premiered?: string;
  rating?: {
    average?: number;
  };
  image?: {
    medium?: string;
    original?: string;
  };
  summary?: string;
  network?: {
    name: string;
    country: {
      name: string;
      code: string;
    };
  };
  webChannel?: {
    name: string;
    country?: {
      name: string;
      code: string;
    };
  };
}

export interface TVMazeEpisode {
  id: number;
  name: string;
  season?: number;
  number?: number;
  airdate: string;
  airtime: string;
  runtime?: number;
  rating?: {
    average?: number;
  };
  summary?: string;
  image?: {
    medium?: string;
    original?: string;
  };
  show: TVMazeShow;
}

export interface LiveProgram {
  id: string;
  title: string;
  showTitle: string;
  episodeTitle?: string;
  description?: string;
  startTime: string;
  endTime: string;
  duration: number; // in minutes
  channel: string;
  network: string;
  genre: string[];
  rating?: number;
  imageUrl?: string;
  season?: number;
  episode?: number;
  isLive: boolean;
  originalData: TVMazeEpisode;
}

// Map TVMaze networks to our channel identifiers
const NETWORK_CHANNEL_MAP: Record<string, string> = {
  'FOX': 'fox',
  'NBC': 'nbc', 
  'ABC': 'abc',
  'CBS': 'cbs',
  'PBS': 'pbs',
  'CNN': 'cnn',
  'ESPN': 'espn',
  'TBS': 'tbs',
  'TNT': 'tnt',
  'FS1': 'fs1',
  'FS2': 'fs2',
  'Disney Channel': 'disney',
  'Nickelodeon': 'nick',
  'truTV': 'trutv',
  'AMC': 'amc',
  'BBC America': 'bbc',
  'Cartoon Network': 'cartoon',
  'CMT': 'cmt',
  'Comedy Central': 'comedy',
  'FX': 'fx',
  'MTV': 'mtv',
  'Hallmark Channel': 'hallmark',
  'National Geographic': 'natgeo',
  'Discovery Channel': 'discovery',
  // Add more mappings as needed
};

export class TVMazeService {
  private baseUrl = 'https://api.tvmaze.com';
  private cache = new Map<string, { data: any; expires: number }>();
  private cacheTimeout = 10 * 60 * 1000; // 10 minutes cache

  async getTodaysSchedule(country: string = 'US'): Promise<TVMazeEpisode[]> {
    const cacheKey = `schedule-${country}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && cached.expires > Date.now()) {
      return cached.data;
    }

    try {
      const today = new Date().toISOString().split('T')[0];
      const url = `${this.baseUrl}/schedule?country=${country}&date=${today}`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`TVMaze API error: ${response.status}`);
      }

      const episodes = await response.json() as TVMazeEpisode[];
      
      // Cache the result
      this.cache.set(cacheKey, {
        data: episodes,
        expires: Date.now() + this.cacheTimeout
      });

      return episodes;
    } catch (error) {
      console.error('Error fetching TVMaze schedule:', error);
      return [];
    }
  }

  async getScheduleForDate(date: string, country: string = 'US'): Promise<TVMazeEpisode[]> {
    const cacheKey = `schedule-${country}-${date}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && cached.expires > Date.now()) {
      return cached.data;
    }

    try {
      const url = `${this.baseUrl}/schedule?country=${country}&date=${date}`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`TVMaze API error: ${response.status}`);
      }

      const episodes = await response.json() as TVMazeEpisode[];
      
      // Cache the result
      this.cache.set(cacheKey, {
        data: episodes,
        expires: Date.now() + this.cacheTimeout
      });

      return episodes;
    } catch (error) {
      console.error('Error fetching TVMaze schedule for date:', error);
      return [];
    }
  }

  convertToLivePrograms(episodes: TVMazeEpisode[]): LiveProgram[] {
    const now = new Date();
    const currentTime = now.getTime();

    return episodes
      .filter(episode => {
        // Only include episodes with known networks that we support
        const networkName = episode.show.network?.name || episode.show.webChannel?.name;
        return networkName && NETWORK_CHANNEL_MAP[networkName];
      })
      .map(episode => {
        const networkName = episode.show.network?.name || episode.show.webChannel?.name || '';
        const channel = NETWORK_CHANNEL_MAP[networkName] || 'unknown';
        
        // Calculate start and end times
        const airdate = new Date(`${episode.airdate}T${episode.airtime || '00:00'}:00`);
        const duration = episode.runtime || episode.show.runtime || 30; // Default to 30 minutes
        const endTime = new Date(airdate.getTime() + (duration * 60 * 1000));
        
        // Check if program is currently airing
        const isCurrentlyAiring = currentTime >= airdate.getTime() && currentTime <= endTime.getTime();

        return {
          id: `tvmaze-${episode.id}`,
          title: episode.show.name,
          showTitle: episode.show.name,
          episodeTitle: episode.name !== episode.show.name ? episode.name : undefined,
          description: this.cleanSummary(episode.summary || episode.show.summary),
          startTime: airdate.toISOString(),
          endTime: endTime.toISOString(),
          duration,
          channel,
          network: networkName,
          genre: episode.show.genres || [],
          rating: episode.rating?.average || episode.show.rating?.average,
          imageUrl: episode.image?.medium || episode.show.image?.medium,
          season: episode.season,
          episode: episode.number,
          isLive: isCurrentlyAiring,
          originalData: episode
        };
      })
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  }

  async getLiveProgramsForChannel(channel: string, hours: number = 4): Promise<LiveProgram[]> {
    const episodes = await this.getTodaysSchedule();
    const livePrograms = this.convertToLivePrograms(episodes);
    
    // Filter for specific channel and upcoming hours
    const now = new Date();
    const endTime = new Date(now.getTime() + (hours * 60 * 60 * 1000));
    
    return livePrograms.filter(program => 
      program.channel === channel &&
      new Date(program.startTime) <= endTime &&
      new Date(program.endTime) >= now
    );
  }

  async getAllCurrentLivePrograms(): Promise<LiveProgram[]> {
    const episodes = await this.getTodaysSchedule();
    const livePrograms = this.convertToLivePrograms(episodes);
    
    // Return programs currently airing or starting within the next 4 hours
    const now = new Date();
    const fourHoursFromNow = new Date(now.getTime() + (4 * 60 * 60 * 1000));
    
    return livePrograms.filter(program => 
      new Date(program.startTime) <= fourHoursFromNow &&
      new Date(program.endTime) >= now
    );
  }

  generateYouTubeTVDeepLink(program: LiveProgram): { serviceContentId: string; directUrl: string } {
    // Generate YouTube TV compatible identifiers and URLs
    const channelSlug = program.channel;
    const showSlug = program.showTitle.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '-');
    
    const serviceContentId = `${channelSlug}-${showSlug}`;
    const directUrl = `https://tv.youtube.com/watch/${serviceContentId}`;
    
    return { serviceContentId, directUrl };
  }

  private cleanSummary(summary?: string): string | undefined {
    if (!summary) return undefined;
    
    // Remove HTML tags and clean up text
    return summary
      .replace(/<[^>]*>/g, '')
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .trim();
  }

  getSupportedChannels(): string[] {
    return Object.values(NETWORK_CHANNEL_MAP);
  }

  getSupportedNetworks(): string[] {
    return Object.keys(NETWORK_CHANNEL_MAP);
  }
}