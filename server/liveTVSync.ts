import { TVMazeService, LiveProgram } from './tvMazeService.js';
import { tvMediaService } from './tvMediaService.js';
import { storage } from './storage.js';
import { getYouTubeTVChannelUrl } from './youtubeTVChannelMappings.js';
import type { Content } from '../shared/schema.js';

export class LiveTVSyncService {
  private tvMazeService: TVMazeService;
  private syncInterval: NodeJS.Timeout | null = null;
  private isRunning = false;

  constructor() {
    this.tvMazeService = new TVMazeService();
  }

  async startAutoSync(intervalMinutes: number = 30): Promise<void> {
    if (this.isRunning) {
      console.log('📺 Live TV sync already running');
      return;
    }

    console.log(`📺 Starting Live TV auto-sync every ${intervalMinutes} minutes`);
    
    // Initial sync
    await this.syncLiveTVData();
    
    // Set up interval
    this.syncInterval = setInterval(async () => {
      await this.syncLiveTVData();
    }, intervalMinutes * 60 * 1000);
    
    this.isRunning = true;
  }

  stopAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    this.isRunning = false;
    console.log('📺 Live TV auto-sync stopped');
  }

  async syncLiveTVData(): Promise<void> {
    try {
      console.log('📺 Starting Live TV data sync...');
      
      let livePrograms: LiveProgram[] = [];
      
      // Try TV Media API first (if API key is available)
      if (process.env.TV_MEDIA_API_KEY) {
        try {
          console.log('📺 Using TV Media API for live programming data');
          livePrograms = await tvMediaService.getYouTubeTVPrograms('90210', 6); // LA postal code, 6 hours
          console.log(`📋 Found ${livePrograms.length} programs from TV Media API`);
        } catch (error) {
          console.error('❌ TV Media API failed, falling back to TVMaze:', error);
          // Fall back to TVMaze if TV Media API fails
          livePrograms = await this.tvMazeService.getAllCurrentLivePrograms();
          console.log(`📋 Found ${livePrograms.length} programs from TVMaze (fallback)`);
        }
      } else {
        // Use TVMaze as default when no TV Media API key
        console.log('📺 Using TVMaze API (no TV Media API key found)');
        livePrograms = await this.tvMazeService.getAllCurrentLivePrograms();
        console.log(`📋 Found ${livePrograms.length} programs from TVMaze`);
      }
      
      const updatedCount = await this.updateContentFromPrograms(livePrograms);
      
      console.log(`✅ Live TV sync complete: ${updatedCount} programs updated`);
    } catch (error) {
      console.error('❌ Error during Live TV sync:', error);
    }
  }

  async syncSpecificChannels(channels: string[]): Promise<void> {
    try {
      console.log(`📺 Syncing specific channels: ${channels.join(', ')}`);
      
      const allPrograms: LiveProgram[] = [];
      
      // Get programs for each requested channel
      for (const channel of channels) {
        const channelPrograms = await this.tvMazeService.getLiveProgramsForChannel(channel, 6); // 6 hours
        allPrograms.push(...channelPrograms);
      }
      
      console.log(`📋 Found ${allPrograms.length} programs for specified channels`);
      
      // Update database
      const updatedCount = await this.updateContentFromPrograms(allPrograms);
      
      console.log(`✅ Channel sync complete: ${updatedCount} programs updated`);
    } catch (error) {
      console.error('❌ Error during channel sync:', error);
    }
  }

  private async updateContentFromPrograms(programs: LiveProgram[]): Promise<number> {
    let updatedCount = 0;
    
    for (const program of programs) {
      try {
        // Generate YouTube TV deep link data with program-specific URLs
        const { serviceContentId } = this.tvMazeService.generateYouTubeTVDeepLink(program);
        
        // Generate program-specific YouTube TV watch URL
        const directUrl = this.generateYouTubeTVWatchUrl(program);
        
        console.log(`📺 Mapping program: ${program.showTitle} on channel ${program.channel}/${program.network} -> ${directUrl}`);
        
        // Create Content object
        const content = {
          id: program.id,
          title: program.episodeTitle ? `${program.showTitle}: ${program.episodeTitle}` : program.showTitle,
          description: program.description || `${program.showTitle} on ${program.network}`,
          type: 'show',
          genre: program.genre.length > 0 ? program.genre[0] : 'general',
          service: 'youtube-tv',
          serviceContentId,
          directUrl,
          imageUrl: program.imageUrl || null,
          rating: this.formatRating(program.rating),
          year: new Date(program.startTime).getFullYear(),
          artist: null,
          album: null,
          duration: program.duration,
          isLive: true, // All programs from live TV sync are live
          category: this.categorizeByGenre(program.genre),
          availability: null
        } as Content;

        // Store in database
        await storage.createOrUpdateContent(content);
        updatedCount++;
        
        // Rate limiting - be respectful to the database
        if (updatedCount % 20 === 0) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
      } catch (error) {
        console.error(`Error updating program ${program.id}:`, error);
      }
    }
    
    return updatedCount;
  }

  /**
   * Generate YouTube TV live stream watch URL
   * Made public for API route access
   */
  public generateYouTubeTVWatchUrl(program: LiveProgram): string {
    // Known working live stream URLs (CBS confirmed working)
    const knownLiveStreamMap: Record<string, string> = {
      // CBS - Confirmed working
      'cbs': 'https://tv.youtube.com/watch/2OGfFsEyTU8?vp=0gEEEgIwAQ%3D%3D',
      '2': 'https://tv.youtube.com/watch/2OGfFsEyTU8?vp=0gEEEgIwAQ%3D%3D',
      'CHcbs': 'https://tv.youtube.com/watch/2OGfFsEyTU8?vp=0gEEEgIwAQ%3D%3D',
      'KCBS': 'https://tv.youtube.com/watch/2OGfFsEyTU8?vp=0gEEEgIwAQ%3D%3D',
      'KTVT': 'https://tv.youtube.com/watch/2OGfFsEyTU8?vp=0gEEEgIwAQ%3D%3D',
    };

    // Try known working URLs first
    const knownUrl = knownLiveStreamMap[program.channel] || knownLiveStreamMap[program.network];
    if (knownUrl) {
      return knownUrl;
    }

    // For unmapped channels, create targeted deep links to YouTube TV live guide
    // This will take users to YouTube TV's live guide where they can find the specific channel
    const networkDisplayMap: Record<string, string> = {
      'CHnbc': 'NBC',
      'CHabc': 'ABC', 
      'CHfox': 'FOX',
      'CHpbs': 'PBS',
      'CHcnn': 'CNN',
      'CHespn': 'ESPN',
      'CHtnt': 'TNT',
      'CHtbs': 'TBS',
      'nbc': 'NBC',
      'abc': 'ABC',
      'fox': 'FOX',
      'pbs': 'PBS',
      'cnn': 'CNN',
      'espn': 'ESPN',
      'tnt': 'TNT',
      'tbs': 'TBS',
    };

    const networkName = networkDisplayMap[program.channel] || networkDisplayMap[program.network];
    if (networkName) {
      // Deep link to YouTube TV live guide with network filter
      return `https://tv.youtube.com/browse/live-tv`;
    }

    // Default fallback to YouTube TV live guide
    return 'https://tv.youtube.com/browse/live-tv';
  }

  private formatRating(rating?: number): string | null {
    if (!rating) return null;
    
    // Convert TVMaze rating (0-10) to TV rating format
    if (rating >= 8.5) return 'TV-MA';
    if (rating >= 7.5) return 'TV-14';
    if (rating >= 6.0) return 'TV-PG';
    return 'TV-G';
  }

  private categorizeByGenre(genres: string[]): string | null {
    if (genres.length === 0) return null;
    
    const genre = genres[0].toLowerCase();
    
    // Map TVMaze genres to our categories
    const categoryMap: Record<string, string> = {
      'drama': 'Drama',
      'comedy': 'Comedy',
      'action': 'Action & Adventure',
      'thriller': 'Action & Adventure',
      'crime': 'Crime',
      'mystery': 'Mystery',
      'horror': 'Horror',
      'science-fiction': 'Sci-Fi',
      'fantasy': 'Fantasy',
      'romance': 'Romance',
      'family': 'Family',
      'animation': 'Animation',
      'documentary': 'Documentary',
      'news': 'News',
      'talk-show': 'Talk Shows',
      'game-show': 'Game Shows',
      'reality': 'Reality',
      'sports': 'Sports'
    };
    
    return categoryMap[genre] || 'General';
  }

  private formatTime(isoString: string): string {
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  }

  async getChannelProgramGuide(channel: string, hours: number = 6): Promise<LiveProgram[]> {
    return await this.tvMazeService.getLiveProgramsForChannel(channel, hours);
  }

  async getCurrentlyAiringPrograms(): Promise<LiveProgram[]> {
    try {
      // Get live TV content from database
      const liveContent = await storage.getAllContent();
      const liveTVContent = liveContent.filter(content => 
        content.service === 'youtube-tv' && content.isLive === true
      );

      // Convert Content objects to LiveProgram objects
      const livePrograms: LiveProgram[] = liveTVContent.map(content => {
        // Use current time for live programs - they are happening now
        const now = new Date();
        const startTime = new Date(now.getTime() - (15 * 60 * 1000)); // Started 15 minutes ago
        
        // End time is start time plus duration
        const endTime = new Date(startTime.getTime() + (content.duration || 60) * 60 * 1000);
        
        // For TV Media API data, extract channel number and map to network callsign
        const channelNumber = content.serviceContentId?.split('-')[0] || 'unknown';
        
        // Map TV Media channel numbers to network callsigns for proper display
        const networkCallsign = this.mapChannelNumberToNetwork(channelNumber);
        
        // Generate direct URL using our improved deep linking logic
        const liveProgram: LiveProgram = {
          id: content.id,
          showTitle: content.title.split(':')[0] || content.title,
          title: content.title,
          channel: channelNumber,
          network: networkCallsign,
          startTime: '',
          endTime: '',
          duration: content.duration || 60,
          genre: [content.genre],
          isLive: true,
          episodeTitle: content.title.includes(':') ? content.title.split(':').slice(1).join(':').trim() : undefined,
          description: content.description || undefined,
          rating: undefined,
          season: undefined,
          episode: undefined,
          imageUrl: content.imageUrl || undefined,
          originalData: {} as any
        };
        
        const directUrl = this.generateYouTubeTVWatchUrl(liveProgram);
        
        return {
          id: content.id,
          title: content.title,
          showTitle: content.title.split(':')[0] || content.title,
          episodeTitle: content.title.includes(':') ? content.title.split(':').slice(1).join(':').trim() : undefined,
          description: content.description || undefined,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          duration: content.duration || 60,
          channel: channelNumber,
          network: networkCallsign,
          genre: [content.genre],
          rating: content.rating ? parseFloat(content.rating) : undefined,
          imageUrl: content.imageUrl || undefined,
          isLive: true,
          originalData: {
            id: content.id,
            name: content.title,
            airdate: new Date().toISOString().split('T')[0],
            airtime: new Date().toLocaleTimeString(),
            show: {
              id: 1,
              name: content.title,
              genres: [content.genre],
              image: content.imageUrl ? { medium: content.imageUrl, original: content.imageUrl } : undefined
            } as any
          } as any
        };
      });

      return livePrograms;
    } catch (error) {
      console.error('Error getting currently airing programs from database:', error);
      
      // Fallback to TVMaze API
      const allPrograms = await this.tvMazeService.getAllCurrentLivePrograms();
      return allPrograms.filter(program => program.isLive);
    }
  }

  private mapChannelNumberToNetwork(channelNumber: string): string {
    // Map YouTube TV Los Angeles channel numbers to network callsigns based on TV Media API data
    const channelNumberToNetworkMap: Record<string, string> = {
      // Major Networks
      '2': 'FOX',
      '4': 'NBC', 
      '7': 'ABC',
      '9': 'CBS',
      
      // Cable Networks  
      '6': 'AMC',
      '12': 'TBS',
      '13': 'TNT',
      '16': 'CNN',
      '17': 'CNBC',
      '18': 'CNN',
      '24': 'DISNEY',
      '47': 'FS1',
      '91': 'STARZ',
      '107': 'Tennis Channel',
      '108': 'TBS',
      '109': 'TLC',
      '110': 'SYFY',
      '112': 'TRUTV',
      '115': 'Unknown',
      '117': 'SYFY',
      '118': 'CBS'
    };
    
    return channelNumberToNetworkMap[channelNumber] || `CH${channelNumber}`;
  }

  private channelToNetwork(channel: string): string {
    const channelToNetworkMap: Record<string, string> = {
      'cnn': 'CNN',
      'fox': 'FOX',
      'nbc': 'NBC',
      'abc': 'ABC',
      'cbs': 'CBS',
      'pbs': 'PBS',
      'espn': 'ESPN',
      'fs1': 'FS1',
      'tbs': 'TBS',
      'tnt': 'TNT',
      'amc': 'AMC',
      'fx': 'FX',
      'disney': 'Disney Channel',
      'nick': 'Nickelodeon',
      'cartoon': 'Cartoon Network',
      'comedy': 'Comedy Central',
      'mtv': 'MTV',
      'cmt': 'CMT',
      'hallmark': 'Hallmark Channel',
      'natgeo': 'National Geographic',
      'discovery': 'Discovery Channel',
      'bbc': 'BBC America'
    };
    
    return channelToNetworkMap[channel] || channel.toUpperCase();
  }

  getSupportedChannels(): string[] {
    return this.tvMazeService.getSupportedChannels();
  }

  async forceSync(): Promise<void> {
    await this.syncLiveTVData();
  }
}

// Global instance for the application
export const liveTVSync = new LiveTVSyncService();