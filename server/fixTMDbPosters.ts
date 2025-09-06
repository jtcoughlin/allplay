import fetch from 'node-fetch';
import { TMDBService } from './tmdbService';
import { storage } from './storage';
import { YouTubeTVStaticMapping } from './youtubetvStaticMapping';

interface ContentItem {
  id: string;
  title: string;
  imageUrl: string | null;
  type: string;
  service?: string;
  year?: number | null;
  posterSource?: string;
  posterLocked?: boolean;
}

class TMDbPosterValidator {
  private tmdbService: TMDBService;
  
  constructor() {
    this.tmdbService = new TMDBService();
  }

  /**
   * Validate if a TMDb image URL returns 200 OK
   */
  async validateImageUrl(url: string): Promise<boolean> {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      return response.ok;
    } catch (error) {
      console.error(`Error validating ${url}:`, error);
      return false;
    }
  }

  /**
   * Get fresh poster URL from TMDb API
   */
  async getFreshPosterUrl(title: string, type: string, year?: number | null): Promise<string | null> {
    try {
      const searchYear = year || undefined;
      if (type === 'movie') {
        return await this.tmdbService.getMoviePosterUrl(title, searchYear);
      } else if (type === 'show' || type === 'tv') {
        const tvResult = await this.tmdbService.searchTVShow(title, searchYear);
        if (tvResult && tvResult.poster_path) {
          return this.tmdbService.getPosterUrl(tvResult.poster_path);
        }
      }
      return null;
    } catch (error) {
      console.error(`Error fetching fresh poster for ${title}:`, error);
      return null;
    }
  }

  /**
   * Check if a poster is locked and should not be overwritten
   */
  private isPosterLocked(item: ContentItem): boolean {
    // Check database posterLocked field
    if (item.posterLocked) {
      return true;
    }
    
    // Check static mapping pinned status
    const staticMapping = YouTubeTVStaticMapping.getStaticMapping(item.title);
    if (staticMapping && staticMapping.pinned) {
      return true;
    }
    
    return false;
  }

  /**
   * Detect the source of a poster URL
   */
  private detectPosterSource(imageUrl: string | null): 'tmdb' | 'youtube' | 'staticMap' | 'fallback' | 'missing' {
    if (!imageUrl) return 'missing';
    
    if (imageUrl.includes('image.tmdb.org')) {
      // High-quality TMDb URLs from static mappings
      if (imageUrl.includes('/t/p/w500/') && imageUrl.length > 80) {
        return 'staticMap';
      }
      return 'tmdb';
    }
    
    if (imageUrl.includes('ytimg.com') || imageUrl.includes('youtube.com')) {
      return 'youtube';
    }
    
    if (imageUrl.includes('data:image/svg+xml')) {
      return 'fallback';
    }
    
    return 'tmdb'; // Default assumption
  }

  /**
   * Update content with new poster and metadata
   */
  private async updateContentPoster(
    item: ContentItem, 
    newImageUrl: string, 
    posterSource: string,
    lockPoster: boolean = false
  ): Promise<void> {
    try {
      const updatedContent = {
        ...item,
        imageUrl: newImageUrl,
        posterSource,
        posterLocked: lockPoster
      };
      
      await storage.createOrUpdateContent(updatedContent as any);
      console.log(`   ✅ Updated poster (source: ${posterSource}, locked: ${lockPoster})`);
    } catch (error) {
      console.error(`   ❌ Failed to update poster: ${error}`);
    }
  }

  /**
   * Get smart fallback poster based on service type
   */
  private getSmartFallback(item: ContentItem): string | null {
    const service = item.service?.toLowerCase();
    
    // Generate SVG fallback with service branding
    if (service === 'espn-plus' || service === 'espn') {
      return this.generateSVGFallback('ESPN', '#FF0000');
    } else if (service === 'cnn') {
      return this.generateSVGFallback('CNN', '#CC0000');
    } else if (service === 'fox-news') {
      return this.generateSVGFallback('FOX', '#003366');
    } else if (service === 'youtube-tv') {
      return this.generateSVGFallback('Live TV', '#FF0000');
    } else if (service === 'netflix') {
      return this.generateSVGFallback('Netflix', '#E50914');
    } else if (service === 'hulu') {
      return this.generateSVGFallback('Hulu', '#1CE783');
    } else if (service === 'disney-plus') {
      return this.generateSVGFallback('Disney+', '#113CCF');
    }
    
    // Generic fallback
    return this.generateSVGFallback('Content', '#666666');
  }

  /**
   * Generate branded SVG fallback
   */
  private generateSVGFallback(text: string, color: string): string {
    const svg = `
      <svg width="300" height="450" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="${color}" opacity="0.1"/>
        <rect x="20" y="20" width="260" height="410" fill="none" stroke="${color}" stroke-width="2" stroke-dasharray="10,5"/>
        <text x="150" y="240" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="${color}">${text}</text>
      </svg>
    `.trim();
    
    return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
  }

  /**
   * Fix all broken TMDb posters in the database
   */
  async fixAllBrokenPosters(): Promise<void> {
    console.log('🔍 Starting TMDb poster validation and fix...');
    
    // Get all content with TMDb image URLs
    const allContent = await storage.getAllContent();
    const tmdbContent = allContent.filter(item => 
      item.imageUrl?.includes('image.tmdb.org')
    );

    console.log(`📊 Found ${tmdbContent.length} items with TMDb posters to validate`);

    let fixedCount = 0;
    let validCount = 0;
    let failedCount = 0;

    for (const item of tmdbContent) {
      if (!item.imageUrl) continue;

      // Skip locked posters
      if (this.isPosterLocked(item)) {
        console.log(`🔒 SKIPPED (LOCKED): ${item.title}`);
        continue;
      }

      console.log(`\n🔍 Validating: ${item.title}`);
      console.log(`   Current URL: ${item.imageUrl}`);

      // Check if current URL is valid
      const isValid = await this.validateImageUrl(item.imageUrl);
      
      if (isValid) {
        console.log(`   ✅ Valid poster`);
        
        // Update posterSource if missing
        const currentSource = this.detectPosterSource(item.imageUrl);
        if (!item.posterSource || item.posterSource !== currentSource) {
          await this.updateContentPoster(item, item.imageUrl, currentSource);
        }
        
        validCount++;
      } else {
        console.log(`   ❌ Broken poster - attempting to fix...`);
        
        // Priority 1: Check if there's a static mapping available (highest priority)
        const staticMapping = YouTubeTVStaticMapping.getStaticMapping(item.title);
        if (staticMapping) {
          console.log(`   📍 Applying static mapping: ${staticMapping.channel}`);
          await this.updateContentPoster(item, staticMapping.imageUrl, 'staticMap', staticMapping.pinned);
          fixedCount++;
          continue;
        }
        
        // Priority 2: Try to get a fresh poster URL from TMDb
        const freshUrl = await this.getFreshPosterUrl(item.title, item.type, item.year);
        
        if (freshUrl && await this.validateImageUrl(freshUrl)) {
          await this.updateContentPoster(item, freshUrl, 'tmdb');
          console.log(`   ✅ Fixed with new TMDb URL`);
          fixedCount++;
        } else {
          console.log(`   ❌ No valid TMDb replacement found - applying smart fallback`);
          
          // Priority 3: Apply smart fallback based on service
          const fallbackUrl = this.getSmartFallback(item);
          if (fallbackUrl) {
            await this.updateContentPoster(item, fallbackUrl, 'fallback');
            console.log(`   🔄 Applied branded service fallback`);
            fixedCount++;
          } else {
            failedCount++;
          }
        }
      }

      // Add delay to be respectful to APIs
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    console.log('\n🎯 TMDb Poster Fix Summary:');
    console.log(`   ✅ Valid posters: ${validCount}`);
    console.log(`   🔧 Fixed posters: ${fixedCount}`);
    console.log(`   ❌ Failed to fix: ${failedCount}`);
    console.log(`   📊 Total processed: ${tmdbContent.length}`);
  }

  /**
   * Test a specific title's poster
   */
  async testSpecificTitle(title: string): Promise<void> {
    console.log(`🧪 Testing poster for: ${title}`);
    
    const allContent = await storage.getAllContent();
    const item = allContent.find(c => c.title.toLowerCase().includes(title.toLowerCase()));
    
    if (!item) {
      console.log(`   ❌ Content not found: ${title}`);
      return;
    }

    if (!item.imageUrl?.includes('image.tmdb.org')) {
      console.log(`   ⚠️ Not a TMDb poster: ${item.imageUrl}`);
      return;
    }

    console.log(`   Current URL: ${item.imageUrl}`);
    const isValid = await this.validateImageUrl(item.imageUrl);
    console.log(`   Status: ${isValid ? '✅ Valid' : '❌ Broken'}`);

    if (!isValid) {
      const freshUrl = await this.getFreshPosterUrl(item.title, item.type, item.year);
      console.log(`   Fresh URL: ${freshUrl || 'None found'}`);
      
      if (freshUrl) {
        const isFreshValid = await this.validateImageUrl(freshUrl);
        console.log(`   Fresh Status: ${isFreshValid ? '✅ Valid' : '❌ Also broken'}`);
      }
    }
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const validator = new TMDbPosterValidator();

  if (args.includes('--test') && args[1]) {
    await validator.testSpecificTitle(args[1]);
  } else if (args.includes('--fix-all')) {
    await validator.fixAllBrokenPosters();
  } else {
    console.log('🎬 TMDb Poster Validator');
    console.log('Usage:');
    console.log('  npx tsx fixTMDbPosters.ts --test "The Carbonaro Effect"  # Test specific title');
    console.log('  npx tsx fixTMDbPosters.ts --fix-all                     # Fix all broken posters');
  }
}

// ES module check
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { TMDbPosterValidator };