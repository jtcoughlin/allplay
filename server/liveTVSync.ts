import { TVMazeService, LiveProgram } from './tvMazeService.js';
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
      
      // Get current live programs from TVMaze
      const livePrograms = await this.tvMazeService.getAllCurrentLivePrograms();
      console.log(`📋 Found ${livePrograms.length} live programs`);

      // Convert to our Content format and update database
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
        // Generate YouTube TV deep link data with channel-specific URLs
        const { serviceContentId } = this.tvMazeService.generateYouTubeTVDeepLink(program);
        
        // Get channel-specific YouTube TV URL for better deep linking
        const channelUrlMapping = getYouTubeTVChannelUrl(program.channel);
        const directUrl = channelUrlMapping?.webUrl || `https://tv.youtube.com/browse/${program.channel}`;
        
        // Create Content object
        const content = {
          id: program.id,
          title: program.episodeTitle ? `${program.showTitle}: ${program.episodeTitle}` : program.showTitle,
          description: program.description || `${program.showTitle} on ${program.network}`,
          type: 'show',
          genre: program.genre.length > 0 ? program.genre[0].toLowerCase() : 'general',
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
        // Generate realistic program times based on TV scheduling (typically :00 and :30)
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinutes = now.getMinutes();
        
        // Round to nearest 30-minute slot
        let startMinutes = currentMinutes < 15 ? 0 : currentMinutes < 45 ? 30 : 0;
        let startHour = currentHour;
        
        // If we rounded up to next hour
        if (startMinutes === 0 && currentMinutes >= 45) {
          startHour = (startHour + 1) % 24;
        }
        
        // Create start time at the rounded time
        const startTime = new Date();
        startTime.setHours(startHour, startMinutes, 0, 0);
        
        // End time is start time plus duration
        const endTime = new Date(startTime.getTime() + (content.duration || 60) * 60 * 1000);
        
        // Extract channel from serviceContentId
        const channel = content.serviceContentId?.split('-')[0] || 'unknown';
        
        // Get channel-specific YouTube TV URL
        const channelUrlMapping = getYouTubeTVChannelUrl(channel);
        const directUrl = channelUrlMapping?.webUrl || content.directUrl;
        
        return {
          id: content.id,
          title: content.title,
          showTitle: content.title.split(':')[0] || content.title,
          episodeTitle: content.title.includes(':') ? content.title.split(':').slice(1).join(':').trim() : undefined,
          description: content.description || undefined,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          duration: content.duration || 60,
          channel,
          network: this.channelToNetwork(channel),
          genre: [content.genre],
          rating: content.rating ? parseFloat(content.rating) : undefined,
          imageUrl: content.imageUrl || undefined,
          isLive: true,
          originalData: { ...content, directUrl } // Add the updated directUrl
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