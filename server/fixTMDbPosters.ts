import fetch from 'node-fetch';
import { TMDBService } from './tmdbService';
import { storage } from './storage';

interface ContentItem {
  id: string;
  title: string;
  imageUrl: string | null;
  type: string;
  year?: number;
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
  async getFreshPosterUrl(title: string, type: string, year?: number): Promise<string | null> {
    try {
      if (type === 'movie') {
        return await this.tmdbService.getMoviePosterUrl(title, year);
      } else if (type === 'show' || type === 'tv') {
        const tvResult = await this.tmdbService.searchTVShow(title, year);
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

      console.log(`\n🔍 Validating: ${item.title}`);
      console.log(`   Current URL: ${item.imageUrl}`);

      // Check if current URL is valid
      const isValid = await this.validateImageUrl(item.imageUrl);
      
      if (isValid) {
        console.log(`   ✅ Valid - no action needed`);
        validCount++;
        continue;
      }

      console.log(`   ❌ Broken - fetching fresh poster...`);

      // Get fresh poster URL
      const freshUrl = await this.getFreshPosterUrl(item.title, item.type, item.year);
      
      if (freshUrl && freshUrl !== item.imageUrl) {
        // Validate the fresh URL
        const isFreshValid = await this.validateImageUrl(freshUrl);
        
        if (isFreshValid) {
          console.log(`   🔧 Updating with: ${freshUrl}`);
          
          // Update in database
          try {
            await storage.createOrUpdateContent({
              ...item,
              imageUrl: freshUrl,
              updatedAt: new Date()
            });
            
            console.log(`   ✅ Successfully updated ${item.title}`);
            fixedCount++;
          } catch (error) {
            console.error(`   ❌ Failed to update database for ${item.title}:`, error);
            failedCount++;
          }
        } else {
          console.log(`   ⚠️ Fresh URL also broken: ${freshUrl}`);
          failedCount++;
        }
      } else {
        console.log(`   ⚠️ No fresh poster found for ${item.title}`);
        failedCount++;
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