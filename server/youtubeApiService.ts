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
    'espn', 'nbc', 'cbs', 'abc', 'fox', 'cnn', 'hbo', 'netflix'
  ];

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
   * Search for videos using YouTube API
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
      maxResults: String(options.maxResults || 10),
      order: options.order || 'relevance',
      type: options.type || 'video',
      safeSearch: 'none'
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
    return data.items || [];
  }

  /**
   * Score and rank search results based on quality indicators
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

      // Title relevance scoring
      if (title.includes(originalLower)) score += 10;
      if (title === originalLower) score += 20;
      
      // Word overlap scoring
      const originalWords = originalLower.split(/\s+/);
      const titleWords = title.split(/\s+/);
      const overlap = originalWords.filter(word => titleWords.some(w => w.includes(word))).length;
      score += (overlap / originalWords.length) * 15;

      // Channel quality scoring
      if (this.verifiedPatterns.some(pattern => channel.includes(pattern))) score += 15;
      if (channel.includes('official')) score += 20;
      if (channel.endsWith('vevo')) score += 25;

      // Content type penalties/bonuses
      if (options.excludeMusic && (title.includes('music') || channel.includes('music'))) score -= 10;
      if (options.preferLive && title.includes('live')) score += 10;

      // Recency bonus (newer content gets slight preference)
      const publishedDate = new Date(result.snippet.publishedAt);
      const daysSincePublished = (Date.now() - publishedDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSincePublished < 30) score += 5;
      if (daysSincePublished < 7) score += 3;

      return { ...result, score };
    });

    // Sort by score (highest first) and return top results
    return scoredResults
      .sort((a, b) => b.score - a.score)
      .filter(r => r.score > 0); // Only return results with positive scores
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
    
    for (const [key, entry] of this.cache.entries()) {
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