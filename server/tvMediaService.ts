import { LiveProgram } from './tvMazeService.js';

interface TVMediaLineup {
  lineupID: string;
  lineupName: string;
  lineupType: string;
  providerID: string;
  providerName: string;
  serviceArea: string;
  country: string;
  status: string;
}

interface TVMediaChannel {
  number: string;
  channelNumber: number;
  subChannelNumber: number;
  stationID: number;
  callsign: string;
  logoFilename: string;
}

interface TVMediaProgram {
  number: string;
  channelNumber: number;
  subChannelNumber: number;
  stationID: number;
  callsign: string;
  logoFilename: string;
  listDateTime: string;
  duration: number;
  showID: number;
  seriesID?: number;
  showName: string;
  episodeTitle?: string;
  repeat: boolean;
  new: boolean;
  live: boolean;
  hd: boolean;
  showTypeID: string;
  starRating: number;
  description?: string;
  showPicture?: string;
}

export class TVMediaService {
  private apiKey: string;
  private baseUrl = 'http://api.tvmedia.ca/tv/v4';

  constructor() {
    this.apiKey = process.env.TV_MEDIA_API_KEY || '';
    if (!this.apiKey) {
      console.warn('⚠️ TV_MEDIA_API_KEY not found in environment variables');
    }
  }

  private async makeRequest<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
    const url = new URL(`${this.baseUrl}${endpoint}`);
    
    // Add API key as query parameter (TV Media API style)
    url.searchParams.append('api_key', this.apiKey);
    
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });

    const response = await fetch(url.toString(), {
      headers: {
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
      return await this.makeRequest<TVMediaLineup[]>(`/lineups`, { postalCode });
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
   * Get current and upcoming programs for a lineup (using correct API format)
   */
  async getProgramsForLineup(lineupId: string, hours: number = 3): Promise<TVMediaProgram[]> {
    try {
      // Get current time in America/Los_Angeles timezone (matching YouTube TV Los Angeles lineup)
      const now = new Date();
      const startTime = now.toISOString().slice(0, 19).replace('T', ' ');
      const endTime = new Date(now.getTime() + (hours * 60 * 60 * 1000)).toISOString().slice(0, 19).replace('T', ' ');
      
      const params = {
        start: startTime,
        end: endTime,
        timezone: 'America/Los_Angeles'
      };
      
      console.log(`📺 Requesting TV Media API programs from ${startTime} to ${endTime} (${hours} hours)`);
      
      const allPrograms = await this.makeRequest<TVMediaProgram[]>(`/lineups/${lineupId}/listings`, params);
      
      // Filter to only current and next few hours locally to reduce data transfer
      const filterTime = new Date();
      const futureLimit = new Date(filterTime.getTime() + (hours * 60 * 60 * 1000));
      
      const filteredPrograms = allPrograms.filter(program => {
        const programStart = new Date(program.listDateTime);
        const programEnd = new Date(programStart.getTime() + (program.duration * 60 * 1000));
        
        // Include programs that are currently on or starting within our time window
        return programEnd > filterTime && programStart <= futureLimit;
      });
      
      console.log(`📺 Filtered ${filteredPrograms.length} relevant programs from ${allPrograms.length} total`);
      return filteredPrograms;
      
    } catch (error) {
      console.error('Error fetching programs:', error);
      return [];
    }
  }

  /**
   * Map TV Media genre codes to full genre names
   */
  private mapGenreCode(genreCode: string): string {
    const genreMap: Record<string, string> = {
      'a': 'Adventure',
      'b': 'Biography', 
      'c': 'Comedy',
      'd': 'Drama',
      'e': 'Educational',
      'f': 'Family',
      'g': 'Game Show',
      'h': 'Horror',
      'i': 'International',
      'j': 'Japanese',
      'k': 'Kids',
      'l': 'Live',
      'm': 'Movie',
      'n': 'News',
      'o': 'Sports',
      'p': 'Public Affairs',
      'q': 'Documentary',
      'r': 'Reality',
      's': 'Sitcom',
      't': 'Talk Show',
      'u': 'Music',
      'v': 'Variety',
      'w': 'Western',
      'x': 'Special',
      'y': 'News Magazine',
      'z': 'Other'
    };
    
    return genreMap[genreCode.toLowerCase()] || 'General';
  }

  /**
   * Convert TV Media programs to our LiveProgram format
   */
  convertToLivePrograms(programs: TVMediaProgram[]): LiveProgram[] {
    return programs.map(program => {
      // Calculate end time from start time and duration
      const startTime = new Date(program.listDateTime);
      const endTime = new Date(startTime.getTime() + (program.duration * 60 * 1000));
      
      // Convert genre code to full genre name
      const fullGenre = this.mapGenreCode(program.showTypeID || 'z');
      
      return {
        id: `tvmedia-${program.showID}`,
        showTitle: program.showName,
        episodeTitle: program.episodeTitle || null,
        title: program.episodeTitle ? `${program.showName}: ${program.episodeTitle}` : program.showName,
        description: program.description || null,
        startTime: program.listDateTime,
        endTime: endTime.toISOString().slice(0, 19).replace('T', ' '),
        duration: program.duration,
        channel: program.channelNumber.toString(),
        network: program.callsign,
        genre: [fullGenre],
        rating: program.starRating || undefined,
        season: null,
        episode: null,
        imageUrl: program.showPicture ? `https://tvmedia.ca/images/${program.showPicture}` : null,
        isLive: program.live,
      };
    });
  }

  /**
   * Get live programs for YouTube TV channels specifically
   */
  async getYouTubeTVPrograms(postalCode: string = '90210', hours: number = 6): Promise<LiveProgram[]> {
    try {
      console.log(`📺 Fetching YouTube TV lineup for postal code: ${postalCode}`);
      
      // Get available lineups for the postal code
      const lineups = await this.getLineupsByPostalCode(postalCode);
      
      // Find YouTube TV lineup specifically
      let youtubetvLineup = lineups.find(lineup => 
        lineup.providerName.toLowerCase().includes('youtube tv') ||
        lineup.lineupName.toLowerCase().includes('youtube tv')
      );
      
      // If YouTube TV not found, look for it by provider name or ID  
      if (!youtubetvLineup) {
        youtubetvLineup = lineups.find(lineup => 
          lineup.lineupID === '139014' || // Known YouTube TV LA lineup ID 
          lineup.lineupID === '139095' || // YouTube TV Dallas lineup ID (alternative)
          (lineup.providerName.toLowerCase().includes('youtube') && lineup.lineupType === 'VMVPD')
        );
      }

      if (!youtubetvLineup) {
        console.log('📺 No YouTube TV lineup found, using first available lineup');
        if (lineups.length === 0) {
          throw new Error('No lineups available for postal code');
        }
        // Use first available lineup as fallback
        const fallbackLineup = lineups[0];
        console.log(`📺 Using fallback lineup: ${fallbackLineup.lineupName}`);
        
        const programs = await this.getProgramsForLineup(fallbackLineup.lineupID, hours);
        return this.convertToLivePrograms(programs);
      }

      console.log(`📺 Found lineup: ${youtubetvLineup.lineupName}`);
      
      // Get programs for the YouTube TV lineup
      const programs = await this.getProgramsForLineup(youtubetvLineup.lineupID, hours);
      
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