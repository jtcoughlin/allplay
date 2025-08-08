import { LiveProgram } from './tvMazeService.js';

interface TVMediaLineup {
  LineupID: string;
  LineupName: string;
  Location: string;
  Country: string;
  PostalCode: string;
  Type: string;
}

interface TVMediaChannel {
  ChannelID: string;
  ChannelNumber: string;
  ChannelName: string;
  CallSign: string;
  LogoURL: string;
}

interface TVMediaProgram {
  ProgramID: string;
  Title: string;
  EpisodeTitle?: string;
  Description?: string;
  Genre: string[];
  StartTime: string;
  EndTime: string;
  Duration: number;
  Rating?: string;
  Season?: number;
  Episode?: number;
  ChannelID: string;
  ChannelNumber: string;
  ImageURL?: string;
}

export class TVMediaService {
  private apiKey: string;
  private baseUrl = 'https://api.tvmedia.ca';

  constructor() {
    this.apiKey = process.env.TV_MEDIA_API_KEY || '';
    if (!this.apiKey) {
      console.warn('⚠️ TV_MEDIA_API_KEY not found in environment variables');
    }
  }

  private async makeRequest<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
    const url = new URL(`${this.baseUrl}${endpoint}`);
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });

    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`TV Media API Error: ${response.status} - ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get available lineups by postal code
   */
  async getLineupsByPostalCode(postalCode: string): Promise<TVMediaLineup[]> {
    try {
      return await this.makeRequest<TVMediaLineup[]>(`/lineups/postal/${postalCode}`);
    } catch (error) {
      console.error('Error fetching lineups:', error);
      return [];
    }
  }

  /**
   * Get channels for a specific lineup
   */
  async getChannelsForLineup(lineupId: string): Promise<TVMediaChannel[]> {
    try {
      return await this.makeRequest<TVMediaChannel[]>(`/lineups/${lineupId}/channels`);
    } catch (error) {
      console.error('Error fetching channels:', error);
      return [];
    }
  }

  /**
   * Get current and upcoming programs for a lineup
   */
  async getProgramsForLineup(lineupId: string, hours: number = 6): Promise<TVMediaProgram[]> {
    try {
      const startTime = new Date().toISOString();
      const endTime = new Date(Date.now() + (hours * 60 * 60 * 1000)).toISOString();
      
      return await this.makeRequest<TVMediaProgram[]>(`/lineups/${lineupId}/listings`, {
        start: startTime,
        end: endTime,
      });
    } catch (error) {
      console.error('Error fetching programs:', error);
      return [];
    }
  }

  /**
   * Convert TV Media programs to our LiveProgram format
   */
  convertToLivePrograms(programs: TVMediaProgram[]): LiveProgram[] {
    return programs.map(program => ({
      id: `tvmedia-${program.ProgramID}`,
      showTitle: program.Title,
      episodeTitle: program.EpisodeTitle || null,
      title: program.EpisodeTitle ? `${program.Title}: ${program.EpisodeTitle}` : program.Title,
      description: program.Description || null,
      startTime: program.StartTime,
      endTime: program.EndTime,
      duration: program.Duration,
      channel: program.ChannelNumber,
      network: program.ChannelID,
      genre: program.Genre || [],
      rating: program.Rating ? parseFloat(program.Rating) : undefined,
      season: program.Season || null,
      episode: program.Episode || null,
      imageUrl: program.ImageURL || null,
      isLive: true,
    }));
  }

  /**
   * Get live programs for YouTube TV channels specifically
   */
  async getYouTubeTVPrograms(postalCode: string = '90210', hours: number = 6): Promise<LiveProgram[]> {
    try {
      console.log(`📺 Fetching YouTube TV lineup for postal code: ${postalCode}`);
      
      // Get available lineups for the postal code
      const lineups = await this.getLineupsByPostalCode(postalCode);
      
      // Find YouTube TV lineup (may be named differently in API)
      const youtubetvLineup = lineups.find(lineup => 
        lineup.LineupName.toLowerCase().includes('youtube') ||
        lineup.Type.toLowerCase().includes('iptv') ||
        lineup.LineupName.toLowerCase().includes('streaming')
      );

      if (!youtubetvLineup) {
        console.log('📺 No YouTube TV lineup found, using first available lineup');
        if (lineups.length === 0) {
          throw new Error('No lineups available for postal code');
        }
        // Use first available lineup as fallback
        const fallbackLineup = lineups[0];
        console.log(`📺 Using fallback lineup: ${fallbackLineup.LineupName}`);
        
        const programs = await this.getProgramsForLineup(fallbackLineup.LineupID, hours);
        return this.convertToLivePrograms(programs);
      }

      console.log(`📺 Found lineup: ${youtubetvLineup.LineupName}`);
      
      // Get programs for the YouTube TV lineup
      const programs = await this.getProgramsForLineup(youtubetvLineup.LineupID, hours);
      
      console.log(`📋 Retrieved ${programs.length} programs from TV Media API`);
      
      return this.convertToLivePrograms(programs);
      
    } catch (error) {
      console.error('❌ Error fetching YouTube TV programs:', error);
      throw error;
    }
  }

  /**
   * Test API connection
   */
  async testConnection(): Promise<boolean> {
    try {
      // Test with a known postal code
      const lineups = await this.getLineupsByPostalCode('90210');
      return lineups.length > 0;
    } catch (error) {
      console.error('TV Media API connection test failed:', error);
      return false;
    }
  }
}

export const tvMediaService = new TVMediaService();