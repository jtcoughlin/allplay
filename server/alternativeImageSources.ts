// Alternative image source strategies for shows without TMDB posters
export class AlternativeImageSources {
  
  /**
   * Get appropriate image strategy for different content types
   */
  static getImageStrategy(title: string, service: string): 'tmdb' | 'tvdb' | 'network_logo' | 'category_icon' | 'skip' {
    const lowerTitle = title.toLowerCase();
    
    // News programs - use network logos
    if (this.isNewsProgram(lowerTitle)) {
      return 'network_logo';
    }
    
    // Sports programs - use category icons
    if (this.isSportsProgram(lowerTitle)) {
      return 'category_icon';
    }
    
    // Music/variety shows - use category icons
    if (this.isMusicOrVariety(lowerTitle)) {
      return 'category_icon';
    }
    
    // Reality/documentary shows - try TVDB as fallback
    if (this.isRealityOrDocumentary(lowerTitle)) {
      return 'tvdb';
    }
    
    // Generic categories or collections
    if (this.isGenericCategory(lowerTitle)) {
      return 'category_icon';
    }
    
    return 'tmdb';
  }
  
  private static isNewsProgram(title: string): boolean {
    const newsKeywords = ['news', 'nightly', 'evening', 'morning', 'good morning', 'tonight show', 'late show', 'daily show'];
    return newsKeywords.some(keyword => title.includes(keyword));
  }
  
  private static isSportsProgram(title: string): boolean {
    const sportsKeywords = ['nfl', 'nba', 'mlb', 'nascar', 'tip-off', 'undisputed'];
    return sportsKeywords.some(keyword => title.includes(keyword));
  }
  
  private static isMusicOrVariety(title: string): boolean {
    const musicKeywords = ['music videos', 'cmt music', 'variety'];
    return musicKeywords.some(keyword => title.includes(keyword));
  }
  
  private static isRealityOrDocumentary(title: string): boolean {
    const realityKeywords = ['deadliest catch', 'teen mom', 'ridiculousness', 'impractical jokers', 'carbonaro effect', 'mythbusters'];
    return realityKeywords.some(keyword => title.includes(keyword));
  }
  
  private static isGenericCategory(title: string): boolean {
    const categoryKeywords = ['christmas movies', 'wild yellowstone'];
    return categoryKeywords.some(keyword => title.includes(keyword));
  }
  
  /**
   * Get network logo URL based on show title
   */
  static getNetworkLogo(title: string): string | null {
    const lowerTitle = title.toLowerCase();
    
    if (lowerTitle.includes('fox')) return '/icons/fox-logo.svg';
    if (lowerTitle.includes('cbs')) return '/icons/cbs-logo.svg';
    if (lowerTitle.includes('nbc')) return '/icons/nbc-logo.svg';
    if (lowerTitle.includes('abc')) return '/icons/abc-logo.svg';
    if (lowerTitle.includes('pbs')) return '/icons/pbs-logo.svg';
    
    return null;
  }
  
  /**
   * Get category icon based on content type
   */
  static getCategoryIcon(title: string): string | null {
    const lowerTitle = title.toLowerCase();
    
    if (this.isSportsProgram(lowerTitle)) return '/icons/sports-icon.svg';
    if (this.isMusicOrVariety(lowerTitle)) return '/icons/music-icon.svg';
    if (lowerTitle.includes('christmas')) return '/icons/holiday-icon.svg';
    if (lowerTitle.includes('nature') || lowerTitle.includes('wild')) return '/icons/nature-icon.svg';
    
    return '/icons/tv-icon.svg'; // Generic TV icon
  }
}