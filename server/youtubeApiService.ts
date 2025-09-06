import fetch from 'node-fetch';

interface YouTubeSearchResult {
  id: { videoId: string };
  snippet: {
    title: string;
    channelTitle: string;
    thumbnails: {
      default?: { url: string };
      medium?: { url: string };
      high?: { url: string };
      standard?: { url: string };
      maxres?: { url: string };
    };
    channelId: string;
    publishedAt: string;
  };
}

interface YouTubeChannel {
  snippet: {
    customUrl?: string;
    title: string;
  };
  status: {
    isLinked?: boolean;
  };
  contentDetails?: {
    relatedPlaylists?: {
      uploads?: string;
    };
  };
}

interface CacheEntry {
  url: string;
  cachedAt: number;
  title: string;
  channelTitle: string;
}

class YouTubeAPIService {
  private apiKey: string;
  private cache = new Map<string, CacheEntry>();
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
  
  // Verified channel patterns that indicate official/quality content
  private verifiedPatterns = [
    'vevo', 'records', 'entertainment', 'official', 'music',
    'espn', 'nbc', 'cbs', 'abc', 'fox', 'cnn', 'hbo', 'netflix',
    'paramount', 'disney', 'hulu', 'primevideo', 'hgtv', 'discovery',
    'foodnetwork', 'travelchannel', 'animalplanet', 'tlc', 'history'
  ];

  // Minimum view count for quality filtering
  private readonly MIN_VIEW_COUNT = 50000;

  constructor() {
    this.apiKey = process.env.YOUTUBE_API_KEY || '';
    if (!this.apiKey) {
      console.warn('⚠️ YouTube API key not found');
    }
  }

  /**
   * Get the best thumbnail for a show title with intelligent channel prioritization
   */
  async getBestThumbnail(
    showTitle: string, 
    options: {
      preferLive?: boolean;
      excludeMusic?: boolean;
      maxAge?: number; // in days
    } = {}
  ): Promise<string | null> {
    const cacheKey = `${showTitle}_${JSON.stringify(options)}`;
    
    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached && (Date.now() - cached.cachedAt) < this.CACHE_DURATION) {
      console.log(`📦 Cache hit for: ${showTitle}`);
      return cached.url;
    }

    try {
      console.log(`🔍 Searching YouTube for: ${showTitle}`);
      
      // Search for videos
      const searchResults = await this.searchVideos(showTitle, {
        maxResults: 20,
        order: options.preferLive ? 'relevance' : 'viewCount',
        type: 'video'
      });

      if (!searchResults || searchResults.length === 0) {
        console.log(`   ⚠️ No results found`);
        return null;
      }

      // Score and rank results
      const scoredResults = await this.scoreResults(searchResults, showTitle, options);
      
      if (scoredResults.length === 0) {
        console.log(`   ⚠️ No suitable results after scoring`);
        return null;
      }

      // Get the best result
      const best = scoredResults[0];
      const thumbnailUrl = this.getBestThumbnailUrl(best.snippet.thumbnails);
      
      if (thumbnailUrl) {
        // Cache the result
        this.cache.set(cacheKey, {
          url: thumbnailUrl,
          cachedAt: Date.now(),
          title: best.snippet.title,
          channelTitle: best.snippet.channelTitle
        });

        console.log(`   ✅ Found thumbnail: ${best.snippet.channelTitle} - "${best.snippet.title}"`);
        return thumbnailUrl;
      }

      console.log(`   ⚠️ No valid thumbnail URL found`);
      return null;

    } catch (error) {
      console.error(`   ❌ YouTube API error for "${showTitle}":`, error);
      return null;
    }
  }

  /**
   * Search for videos using YouTube API with enhanced filtering
   */
  private async searchVideos(
    query: string,
    options: {
      maxResults?: number;
      order?: 'relevance' | 'date' | 'rating' | 'viewCount' | 'title';
      type?: 'video' | 'channel' | 'playlist';
      publishedAfter?: string;
    } = {}
  ): Promise<YouTubeSearchResult[]> {
    const params = new URLSearchParams({
      part: 'snippet',
      q: query,
      key: this.apiKey,
      maxResults: String(options.maxResults || 20), // Get more to filter better
      order: options.order || 'relevance',
      type: options.type || 'video',
      safeSearch: 'none',
      videoDuration: 'any', // Exclude shorts by allowing any duration (will filter later)
      videoType: 'any'
    });

    if (options.publishedAfter) {
      params.append('publishedAfter', options.publishedAfter);
    }

    const url = `https://www.googleapis.com/youtube/v3/search?${params}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`YouTube API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as { items: YouTubeSearchResult[] };
    
    // Enhanced filtering to get video statistics and filter out shorts/low quality
    if (data.items && data.items.length > 0) {
      return await this.filterHighQualityVideos(data.items, query);
    }
    
    return data.items || [];
  }

  /**
   * Filter videos by view count and quality indicators
   */
  private async filterHighQualityVideos(
    videos: YouTubeSearchResult[], 
    originalQuery: string
  ): Promise<YouTubeSearchResult[]> {
    try {
      // Get video IDs to fetch statistics
      const videoIds = videos.map(v => v.id.videoId).filter(Boolean);
      
      if (videoIds.length === 0) return videos;

      // Fetch video statistics
      const statsUrl = `https://www.googleapis.com/youtube/v3/videos?part=statistics,contentDetails&id=${videoIds.join(',')}&key=${this.apiKey}`;
      const statsResponse = await fetch(statsUrl);
      
      if (!statsResponse.ok) {
        console.log('   ⚠️ Could not fetch video statistics, using original results');
        return videos;
      }

      const statsData = await statsResponse.json() as { 
        items: Array<{
          id: string;
          statistics: { viewCount: string; likeCount?: string };
          contentDetails: { duration: string };
        }> 
      };

      // Create a map of video stats
      const statsMap = new Map(
        statsData.items.map(item => [item.id, item])
      );

      // Filter videos by quality criteria
      const filteredVideos = videos.filter(video => {
        const stats = statsMap.get(video.id.videoId);
        if (!stats) return false;

        const viewCount = parseInt(stats.statistics.viewCount);
        const duration = stats.contentDetails.duration;

        // Filter out YouTube Shorts (< 60 seconds) and low view count
        const isShort = this.isYouTubeShort(duration);
        const hasMinViews = viewCount >= this.MIN_VIEW_COUNT;

        // Additional quality checks
        const title = video.snippet.title.toLowerCase();
        const hasRelevantTitle = this.titleMatchesQuery(title, originalQuery);
        
        return !isShort && hasMinViews && hasRelevantTitle;
      });

      console.log(`   🔍 Filtered ${videos.length} → ${filteredVideos.length} high-quality videos`);
      return filteredVideos;

    } catch (error) {
      console.log('   ⚠️ Error filtering videos, using original results');
      return videos;
    }
  }

  /**
   * Check if video is a YouTube Short based on duration
   */
  private isYouTubeShort(duration: string): boolean {
    // Parse ISO 8601 duration (e.g., "PT1M30S" = 1 minute 30 seconds)
    const match = duration.match(/PT(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return false;
    
    const minutes = parseInt(match[1] || '0');
    const seconds = parseInt(match[2] || '0');
    const totalSeconds = minutes * 60 + seconds;
    
    return totalSeconds < 60; // Less than 60 seconds = Short
  }

  /**
   * Check if title relevantly matches the query
   */
  private titleMatchesQuery(title: string, query: string): boolean {
    const queryWords = query.toLowerCase().split(/\s+/);
    const titleWords = title.toLowerCase().split(/\s+/);
    
    // Must contain at least 50% of query words
    const matchingWords = queryWords.filter(word => 
      titleWords.some(titleWord => titleWord.includes(word) || word.includes(titleWord))
    );
    
    return matchingWords.length >= Math.ceil(queryWords.length * 0.5);
  }

  /**
   * Score and rank search results based on quality indicators with enhanced verification
   */
  private async scoreResults(
    results: YouTubeSearchResult[],
    originalTitle: string,
    options: any = {}
  ): Promise<YouTubeSearchResult[]> {
    const scoredResults = results.map(result => {
      let score = 0;
      const title = result.snippet.title.toLowerCase();
      const channel = result.snippet.channelTitle.toLowerCase();
      const originalLower = originalTitle.toLowerCase();

      // Enhanced title relevance scoring
      if (title.includes(originalLower)) score += 15;
      if (title === originalLower) score += 30;
      
      // Exact show name match in title gets huge boost
      const showName = this.extractShowName(originalTitle);
      if (showName && title.includes(showName.toLowerCase())) score += 25;
      
      // Word overlap scoring with higher standards
      const originalWords = originalLower.split(/\s+/);
      const titleWords = title.split(/\s+/);
      const overlap = originalWords.filter(word => titleWords.some(w => w.includes(word))).length;
      const overlapRatio = overlap / originalWords.length;
      score += overlapRatio * 20;

      // STRICT channel verification - much higher standards
      const isVerifiedChannel = this.isVerifiedChannel(channel, originalTitle);
      if (isVerifiedChannel) {
        score += 40; // Big bonus for verified channels
      } else {
        score -= 20; // Penalty for unverified channels
      }

      // Channel name should match show context
      if (this.channelMatchesShow(channel, originalTitle)) score += 20;

      // Content type penalties/bonuses
      if (options.excludeMusic && (title.includes('music') || channel.includes('music'))) score -= 15;
      if (options.preferLive && title.includes('live')) score += 15;

      // Penalty for obviously wrong content
      if (this.isObviouslyWrongContent(title, channel, originalTitle)) score -= 50;

      // Recency scoring for news/live content
      const publishedDate = new Date(result.snippet.publishedAt);
      const daysSincePublished = (Date.now() - publishedDate.getTime()) / (1000 * 60 * 60 * 24);
      if (options.preferLive) {
        if (daysSincePublished < 7) score += 10;
        if (daysSincePublished < 1) score += 5;
      }

      return { ...result, score };
    });

    // Sort by score and apply much stricter filtering
    const highQualityResults = scoredResults
      .sort((a, b) => b.score - a.score)
      .filter(r => r.score > 20); // Much higher threshold

    console.log(`   📊 Scored ${results.length} results, ${highQualityResults.length} meet quality threshold`);
    
    return highQualityResults;
  }

  /**
   * Check if channel is truly verified/official
   */
  private isVerifiedChannel(channel: string, showTitle: string): boolean {
    // Major network verification
    const majorNetworks = ['nbc', 'cbs', 'abc', 'fox', 'cnn', 'espn', 'hbo', 'netflix', 'hulu', 'disney'];
    
    if (majorNetworks.some(network => channel.includes(network))) {
      return true;
    }

    // Official channel indicators
    if (channel.includes('official') || channel.endsWith('vevo')) {
      return true;
    }

    // Show-specific official channels
    const showLower = showTitle.toLowerCase();
    if (showLower.includes('tucker carlson') && channel.includes('fox')) return true;
    if (showLower.includes('anderson cooper') && channel.includes('cnn')) return true;
    if (showLower.includes('30 for 30') && channel.includes('espn')) return true;

    return false;
  }

  /**
   * Check if channel name matches the show context
   */
  private channelMatchesShow(channel: string, showTitle: string): boolean {
    const showLower = showTitle.toLowerCase();
    const channelLower = channel.toLowerCase();

    // News show mappings
    if (showLower.includes('cnn') && channelLower.includes('cnn')) return true;
    if (showLower.includes('fox') && channelLower.includes('fox')) return true;
    if (showLower.includes('nbc') && channelLower.includes('nbc')) return true;
    if (showLower.includes('cbs') && channelLower.includes('cbs')) return true;
    if (showLower.includes('abc') && channelLower.includes('abc')) return true;
    if (showLower.includes('espn') && channelLower.includes('espn')) return true;

    return false;
  }

  /**
   * Detect obviously wrong/irrelevant content
   */
  private isObviouslyWrongContent(title: string, channel: string, originalTitle: string): boolean {
    const titleLower = title.toLowerCase();
    const originalLower = originalTitle.toLowerCase();

    // Red flags for wrong content
    const redFlags = [
      'baby', 'toddler', 'kids playing', 'funny moments', 'compilation',
      'reaction', 'react', 'review', 'parody', 'remix', 'cover',
      'minecraft', 'fortnite', 'gaming', 'unboxing', 'vlog'
    ];

    if (redFlags.some(flag => titleLower.includes(flag))) {
      return true;
    }

    // Check for completely unrelated content
    const originalWords = originalLower.split(/\s+/).filter(w => w.length > 2);
    const titleWords = titleLower.split(/\s+/);
    const hasAnyRelevantWord = originalWords.some(word => 
      titleWords.some(titleWord => titleWord.includes(word))
    );

    return !hasAnyRelevantWord;
  }

  /**
   * Extract main show name from title
   */
  private extractShowName(title: string): string | null {
    // Common patterns to extract show name
    const colonMatch = title.match(/^([^:]+):/);
    if (colonMatch) return colonMatch[1].trim();

    const withMatch = title.match(/^(.+)\s+with\s+/i);
    if (withMatch) return withMatch[1].trim();

    return null;
  }

  /**
   * Get the highest quality thumbnail URL available
   */
  private getBestThumbnailUrl(thumbnails: YouTubeSearchResult['snippet']['thumbnails']): string | null {
    // Prefer higher resolution thumbnails
    if (thumbnails.maxres?.url) return thumbnails.maxres.url;
    if (thumbnails.standard?.url) return thumbnails.standard.url;
    if (thumbnails.high?.url) return thumbnails.high.url;
    if (thumbnails.medium?.url) return thumbnails.medium.url;
    if (thumbnails.default?.url) return thumbnails.default.url;
    return null;
  }

  /**
   * Get cached thumbnail URLs for bulk operations
   */
  getCachedThumbnails(): Map<string, CacheEntry> {
    return new Map(this.cache);
  }

  /**
   * Clear old cache entries
   */
  clearExpiredCache(): number {
    const before = this.cache.size;
    const now = Date.now();
    
    for (const [key, entry] of Array.from(this.cache.entries())) {
      if (now - entry.cachedAt > this.CACHE_DURATION) {
        this.cache.delete(key);
      }
    }
    
    const cleared = before - this.cache.size;
    if (cleared > 0) {
      console.log(`🗑️ Cleared ${cleared} expired cache entries`);
    }
    return cleared;
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; hitRate?: number } {
    return {
      size: this.cache.size
    };
  }
}

export { YouTubeAPIService };