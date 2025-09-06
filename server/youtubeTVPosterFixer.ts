import { YouTubeAPIService } from './youtubeApiService';
import { YouTubeTVStaticMapping } from './youtubetvStaticMapping';
import { storage } from './storage';

// Use storage types directly instead of custom interface
// interface ContentItem - removed, using storage types

class YouTubeTVPosterFixer {
  private youtubeAPI: YouTubeAPIService;
  
  constructor() {
    this.youtubeAPI = new YouTubeAPIService();
  }

  /**
   * Apply comprehensive poster coverage to ALL YouTube TV content
   */
  async fixAllYouTubeTVPosters(): Promise<void> {
    console.log('🎬 COMPREHENSIVE YOUTUBE TV POSTER FIX\n');
    
    const allContent = await storage.getAllContent();
    
    // Filter for YouTube TV content that needs posters OR has low-quality posters
    const youtubeTVContent = allContent.filter(item => 
      item.service === 'youtube-tv' && 
      this.shouldUpdatePoster(item)
    );

    console.log(`📊 Found ${youtubeTVContent.length} YouTube TV items needing posters`);
    
    if (youtubeTVContent.length === 0) {
      console.log('✅ All YouTube TV content already has posters');
      return;
    }

    let staticMappingHits = 0;
    let youtubeAPIHits = 0;
    let fallbacksApplied = 0;
    let totalProcessed = 0;
    
    // Process in batches to avoid overwhelming APIs
    const batchSize = 10;
    for (let i = 0; i < youtubeTVContent.length; i += batchSize) {
      const batch = youtubeTVContent.slice(i, i + batchSize);
      
      console.log(`\n📦 Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(youtubeTVContent.length/batchSize)}`);
      
      for (const item of batch) {
        const result = await this.fixSingleItem(item);
        totalProcessed++;
        
        if (result.source === 'static') staticMappingHits++;
        else if (result.source === 'youtube') youtubeAPIHits++;
        else if (result.source === 'fallback') fallbacksApplied++;
        
        // Delay between items to respect API limits
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      // Longer delay between batches
      if (i + batchSize < youtubeTVContent.length) {
        console.log('   ⏸️ Batch complete, pausing...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    console.log('\n🎯 COMPREHENSIVE FIX SUMMARY:');
    console.log(`   📊 Total processed: ${totalProcessed}`);
    console.log(`   📍 Static mappings: ${staticMappingHits}`);
    console.log(`   🔍 YouTube API results: ${youtubeAPIHits}`);
    console.log(`   🎨 Fallback icons: ${fallbacksApplied}`);
    console.log(`   ✅ Success rate: ${((staticMappingHits + youtubeAPIHits + fallbacksApplied) / totalProcessed * 100).toFixed(1)}%`);

    // Show cache stats
    const cacheStats = this.youtubeAPI.getCacheStats();
    console.log(`   📦 Cache entries: ${cacheStats.size}`);
  }

  /**
   * Fix a single content item using the three-tier fallback system with overwrite protection
   */
  private async fixSingleItem(item: any): Promise<{
    success: boolean;
    source: 'static' | 'youtube' | 'fallback' | 'failed' | 'protected';
    url?: string;
  }> {
    console.log(`\n🔧 Processing: ${item.title}`);

    // PROTECTION: Check if poster is protected from overwriting
    if (this.isPosterProtected(item)) {
      console.log(`   🔒 Poster protected from overwriting (pinned/high-quality source)`);
      return { success: true, source: 'protected' };
    }

    // Tier 1: Static mapping (fastest, highest quality)
    const staticUrl = YouTubeTVStaticMapping.getStaticPoster(item.title);
    if (staticUrl) {
      await this.updateContentPoster(item, staticUrl, 'staticMap');
      console.log(`   ✅ Applied static mapping`);
      return { success: true, source: 'static', url: staticUrl };
    }

    // Tier 2: YouTube API search (dynamic, high quality)
    try {
      const youtubeUrl = await this.youtubeAPI.getBestThumbnail(item.title, {
        preferLive: item.isLive || this.isLiveContent(item.title),
        excludeMusic: this.shouldExcludeMusic(item.title),
        maxAge: 365 // Prefer content from last year
      });

      if (youtubeUrl) {
        await this.updateContentPoster(item, youtubeUrl, 'youtube');
        console.log(`   ✅ Applied YouTube thumbnail`);
        return { success: true, source: 'youtube', url: youtubeUrl };
      }
    } catch (error) {
      console.log(`   ⚠️ YouTube API failed: ${error}`);
    }

    // Tier 3: Smart fallback (branded channel logos) - only if no existing poster or very low quality
    if (this.shouldApplyFallback(item)) {
      const fallbackUrl = this.generateSmartFallback(item.title);
      if (fallbackUrl) {
        await this.updateContentPoster(item, fallbackUrl, 'fallback');
        console.log(`   ✅ Applied smart fallback`);
        return { success: true, source: 'fallback', url: fallbackUrl };
      }
    } else {
      console.log(`   🔒 Skipping fallback - existing poster is adequate`);
      return { success: true, source: 'protected' };
    }

    console.log(`   ❌ All methods failed`);
    return { success: false, source: 'failed' };
  }

  /**
   * Update content poster in database with source tracking
   */
  private async updateContentPoster(
    item: any, 
    imageUrl: string, 
    source: 'tmdb' | 'youtube' | 'staticMap' | 'fallback' = 'fallback'
  ): Promise<void> {
    try {
      await storage.createOrUpdateContent({
        ...item,
        imageUrl,
        posterSource: source,
        updatedAt: new Date()
      });
    } catch (error) {
      console.error(`   ❌ Database update failed:`, error);
      throw error;
    }
  }

  /**
   * Check if an item's poster should be updated (protection logic)
   */
  private shouldUpdatePoster(item: any): boolean {
    // Always update if no poster
    if (!item.imageUrl) return true;
    
    // Always update if generic placeholder
    if (item.imageUrl.includes('data:image/svg+xml')) {
      // But not if it's an appropriate branded fallback
      const title = item.title.toLowerCase();
      if (this.isAppropriatedBrandedFallback(item.imageUrl, title)) {
        return false; // Keep good branded fallbacks
      }
      return true;
    }
    
    // Don't update if it's a high-quality source
    const currentSource = this.detectPosterSource(item.imageUrl);
    if (currentSource === 'tmdb' || currentSource === 'staticMap') {
      return false; // Protect TMDb and static mappings
    }
    
    // Update low-quality YouTube thumbnails that might be inappropriate
    if (currentSource === 'youtube') {
      return this.isLowQualityYouTubeThumbnail(item.imageUrl, item.title);
    }
    
    return false; // Default: don't update if unsure
  }

  /**
   * Check if poster is protected from overwriting
   */
  private isPosterProtected(item: any): boolean {
    if (!item.imageUrl) return false;
    
    // Check if it's from a pinned static mapping
    const staticMapping = YouTubeTVStaticMapping.getStaticMapping(item.title);
    if (staticMapping && staticMapping.pinned) {
      return true;
    }
    
    // Check if it's from a high-quality source
    const source = this.detectPosterSource(item.imageUrl);
    if (source === 'tmdb' || source === 'staticMap') {
      return true;
    }
    
    // Protect verified YouTube thumbnails from good channels
    if (source === 'youtube' && this.isVerifiedYouTubeThumbnail(item.imageUrl, item.title)) {
      return true;
    }
    
    return false;
  }

  /**
   * Check if fallback should be applied over existing poster
   */
  private shouldApplyFallback(item: any): boolean {
    if (!item.imageUrl) return true;
    
    // Only apply fallback over generic placeholders or very low-quality content
    if (item.imageUrl.includes('data:image/svg+xml')) {
      return !this.isAppropriatedBrandedFallback(item.imageUrl, item.title);
    }
    
    // Apply fallback over obviously broken YouTube thumbnails
    if (this.isLowQualityYouTubeThumbnail(item.imageUrl, item.title)) {
      return true;
    }
    
    return false;
  }

  /**
   * Detect the source type of a poster URL
   */
  private detectPosterSource(imageUrl: string): 'tmdb' | 'youtube' | 'staticMap' | 'fallback' | 'unknown' {
    if (!imageUrl) return 'unknown';
    
    if (imageUrl.includes('image.tmdb.org')) return 'tmdb';
    if (imageUrl.includes('ytimg.com') || imageUrl.includes('youtube.com')) return 'youtube';
    if (imageUrl.includes('data:image/svg+xml')) return 'fallback';
    
    // High-quality TMDb URLs are likely from static mappings
    if (imageUrl.includes('image.tmdb.org/t/p/w500/')) return 'staticMap';
    
    return 'unknown';
  }

  /**
   * Check if it's an appropriate branded fallback
   */
  private isAppropriatedBrandedFallback(imageUrl: string, title: string): boolean {
    const titleLower = title.toLowerCase();
    
    // Check for appropriate channel branding
    if (titleLower.includes('cnn') && imageUrl.includes('CNN')) return true;
    if (titleLower.includes('fox') && imageUrl.includes('FOX')) return true;
    if (titleLower.includes('espn') && imageUrl.includes('ESPN')) return true;
    if (titleLower.includes('nbc') && imageUrl.includes('NBC')) return true;
    if (titleLower.includes('cbs') && imageUrl.includes('CBS')) return true;
    if (titleLower.includes('abc') && imageUrl.includes('ABC')) return true;
    
    return false;
  }

  /**
   * Check if YouTube thumbnail is low quality or inappropriate
   */
  private isLowQualityYouTubeThumbnail(imageUrl: string, title: string): boolean {
    // This would need more sophisticated checking, but for now
    // we'll assume user-reported problem cases are low quality
    const titleLower = title.toLowerCase();
    
    if (titleLower.includes('tucker carlson') || titleLower.includes('anderson cooper')) {
      return true; // These were specifically mentioned as having quality issues
    }
    
    return false; // Default to keeping existing
  }

  /**
   * Check if YouTube thumbnail is from verified source
   */
  private isVerifiedYouTubeThumbnail(imageUrl: string, title: string): boolean {
    // For now, assume TMDb sources mixed in are verified
    return imageUrl.includes('image.tmdb.org');
  }

  /**
   * Check if content should be treated as live
   */
  private isLiveContent(title: string): boolean {
    const liveIndicators = [
      'live', 'news', 'breaking', 'tonight', 'today', 'morning', 
      'evening', 'now', 'report', 'update', 'alert'
    ];
    
    const titleLower = title.toLowerCase();
    return liveIndicators.some(indicator => titleLower.includes(indicator));
  }

  /**
   * Check if music content should be excluded from general searches
   */
  private shouldExcludeMusic(title: string): boolean {
    const titleLower = title.toLowerCase();
    
    // Exclude music unless it's clearly a TV show about music
    return !['american idol', 'the voice', 'masked singer', 'music awards'].some(
      show => titleLower.includes(show)
    );
  }

  /**
   * Generate smart fallback based on show characteristics
   */
  private generateSmartFallback(title: string): string {
    const titleLower = title.toLowerCase();
    
    // Channel-specific branding
    if (titleLower.includes('cnn')) {
      return this.generateChannelIcon('CNN', '#cc0000');
    }
    if (titleLower.includes('fox news') || titleLower.includes('fox & friends')) {
      return this.generateChannelIcon('FOX NEWS', '#003366');
    }
    if (titleLower.includes('msnbc')) {
      return this.generateChannelIcon('MSNBC', '#0085c3');
    }
    if (titleLower.includes('espn') || titleLower.includes('sportscenter')) {
      return this.generateChannelIcon('ESPN', '#ff0033');
    }
    if (titleLower.includes('nbc')) {
      return this.generateChannelIcon('NBC', '#000000');
    }
    if (titleLower.includes('cbs')) {
      return this.generateChannelIcon('CBS', '#000080');
    }
    if (titleLower.includes('abc')) {
      return this.generateChannelIcon('ABC', '#ffc72c');
    }

    // Content type-based icons
    if (this.isNewsContent(title)) {
      return this.generateContentIcon('📺 NEWS', '#1e3a8a');
    }
    if (this.isSportsContent(title)) {
      return this.generateContentIcon('⚽ SPORTS', '#059669');
    }
    if (this.isKidsContent(title)) {
      return this.generateContentIcon('🎈 KIDS', '#f59e0b');
    }
    if (this.isCookingContent(title)) {
      return this.generateContentIcon('👨‍🍳 COOKING', '#dc2626');
    }

    // Generic live TV fallback
    return this.generateContentIcon('📺 LIVE TV', '#6366f1');
  }

  private generateChannelIcon(channel: string, color: string): string {
    return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='300'%3E%3Crect width='200' height='300' fill='${encodeURIComponent(color)}'/%3E%3Ctext x='100' y='130' text-anchor='middle' fill='white' font-size='18' font-weight='bold' font-family='Arial'%3E${encodeURIComponent(channel)}%3C/text%3E%3Crect x='60' y='170' width='80' height='50' fill='white' opacity='0.2' rx='8'/%3E%3Ccircle cx='100' cy='195' r='15' fill='white' opacity='0.8'/%3E%3C/svg%3E`;
  }

  private generateContentIcon(label: string, color: string): string {
    return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='300'%3E%3Crect width='200' height='300' fill='${encodeURIComponent(color)}'/%3E%3Ctext x='100' y='130' text-anchor='middle' fill='white' font-size='16' font-weight='bold' font-family='Arial'%3E${encodeURIComponent(label)}%3C/text%3E%3Crect x='60' y='170' width='80' height='50' fill='white' opacity='0.3' rx='8'/%3E%3C/svg%3E`;
  }

  private isNewsContent(title: string): boolean {
    const newsKeywords = ['news', 'report', 'tonight', 'morning', 'evening', 'breaking', 'headlines', 'update'];
    return newsKeywords.some(keyword => title.toLowerCase().includes(keyword));
  }

  private isSportsContent(title: string): boolean {
    const sportsKeywords = ['sports', 'game', 'match', 'vs', 'football', 'basketball', 'baseball', 'soccer', 'nfl', 'nba', 'mlb'];
    return sportsKeywords.some(keyword => title.toLowerCase().includes(keyword));
  }

  private isKidsContent(title: string): boolean {
    const kidsKeywords = ['kids', 'children', 'cartoon', 'peppa', 'spongebob', 'nick jr', 'disney'];
    return kidsKeywords.some(keyword => title.toLowerCase().includes(keyword));
  }

  private isCookingContent(title: string): boolean {
    const cookingKeywords = ['cooking', 'chef', 'kitchen', 'recipe', 'chopped', 'baking', 'food'];
    return cookingKeywords.some(keyword => title.toLowerCase().includes(keyword));
  }

  /**
   * Generate comprehensive report
   */
  async generateReport(): Promise<void> {
    console.log('📊 YOUTUBE TV POSTER STATUS REPORT\n');
    
    const allContent = await storage.getAllContent();
    const youtubeTVContent = allContent.filter(item => item.service === 'youtube-tv');
    
    let hasPosters = 0;
    let needsPosters = 0;
    let staticMappings = 0;
    
    for (const item of youtubeTVContent) {
      if (item.imageUrl && !item.imageUrl.includes('data:image/svg+xml')) {
        hasPosters++;
        
        // Check if it's from static mapping
        if (YouTubeTVStaticMapping.hasStaticMapping(item.title)) {
          staticMappings++;
        }
      } else {
        needsPosters++;
      }
    }

    console.log(`Total YouTube TV content: ${youtubeTVContent.length}`);
    console.log(`✅ Has posters: ${hasPosters} (${(hasPosters/youtubeTVContent.length*100).toFixed(1)}%)`);
    console.log(`🚫 Needs posters: ${needsPosters} (${(needsPosters/youtubeTVContent.length*100).toFixed(1)}%)`);
    console.log(`📍 Static mappings available: ${staticMappings}`);
    
    const mappingStats = YouTubeTVStaticMapping.getStats();
    console.log(`📋 Static mapping coverage: ${mappingStats.totalMappings} shows across ${mappingStats.uniqueChannels} channels`);
  }

  /**
   * Fix ESPN+ content specifically
   */
  async fixESPNPlusContent(): Promise<void> {
    console.log('🏀 TARGETED ESPN+ CONTENT FIX\n');
    
    const allContent = await storage.getAllContent();
    const espnPlusContent = allContent.filter(item => 
      item.service === 'espn-plus' && this.shouldUpdatePoster(item)
    );

    console.log(`📊 Found ${espnPlusContent.length} ESPN+ items needing poster updates`);
    
    if (espnPlusContent.length === 0) {
      console.log('✅ All ESPN+ content already has appropriate posters');
      return;
    }

    for (const item of espnPlusContent) {
      await this.fixSingleItem(item);
    }
  }

  /**
   * Fix TMDb content with specific titles (30 for 30, Untold)
   */
  async fixSpecificTMDbContent(): Promise<void> {
    console.log('🎬 TARGETED TMDb CONTENT FIX (30 for 30, Untold)\n');
    
    const allContent = await storage.getAllContent();
    const targetContent = allContent.filter(item => {
      const title = item.title.toLowerCase();
      return (title.includes('30 for 30') || title.includes('untold')) && 
             this.shouldUpdatePoster(item);
    });

    console.log(`📊 Found ${targetContent.length} targeted TMDb items needing poster updates`);
    
    if (targetContent.length === 0) {
      console.log('✅ All targeted TMDb content already has appropriate posters');
      return;
    }

    for (const item of targetContent) {
      await this.fixSingleItem(item);
    }
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const fixer = new YouTubeTVPosterFixer();

  if (args.includes('--fix')) {
    if (args.includes('--espn-plus')) {
      await fixer.fixESPNPlusContent();
    } else if (args.includes('--tmdb-targeted')) {
      await fixer.fixSpecificTMDbContent();
    } else {
      await fixer.fixAllYouTubeTVPosters();
    }
  } else if (args.includes('--report')) {
    await fixer.generateReport();
  } else {
    console.log('🎬 YouTube TV Poster Fixer');
    console.log('Usage:');
    console.log('  npx tsx youtubeTVPosterFixer.ts --fix                # Fix all YouTube TV posters');
    console.log('  npx tsx youtubeTVPosterFixer.ts --fix --espn-plus    # Fix ESPN+ content only');
    console.log('  npx tsx youtubeTVPosterFixer.ts --fix --tmdb-targeted # Fix 30 for 30/Untold content');
    console.log('  npx tsx youtubeTVPosterFixer.ts --report             # Generate status report');
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { YouTubeTVPosterFixer };