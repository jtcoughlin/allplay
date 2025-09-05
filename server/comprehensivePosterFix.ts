import fetch from 'node-fetch';
import { TMDBService } from './tmdbService';
import { storage } from './storage';

interface ContentItem {
  id: string;
  title: string;
  imageUrl: string | null;
  type: string;
  year?: number;
  service?: string;
}

class ComprehensivePosterFixer {
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
      return null;
    }
  }

  /**
   * Comprehensive scan and fix of all poster issues
   */
  async fixAllPosterIssues(): Promise<void> {
    console.log('🔍 Starting comprehensive poster scan and fix...');
    
    const allContent = await storage.getAllContent();
    console.log(`📊 Total content items: ${allContent.length}`);

    // Categorize content by poster status
    const categories = {
      brokenTMDb: [] as ContentItem[],
      missingPosters: [] as ContentItem[],
      nonTMDbCandidates: [] as ContentItem[],
      validTMDb: [] as ContentItem[],
      other: [] as ContentItem[]
    };

    // Categorize all content
    for (const item of allContent) {
      if (item.imageUrl?.includes('image.tmdb.org')) {
        // Has TMDb URL - check if it's valid
        const isValid = await this.validateImageUrl(item.imageUrl);
        if (isValid) {
          categories.validTMDb.push(item);
        } else {
          categories.brokenTMDb.push(item);
        }
      } else if (!item.imageUrl || item.imageUrl.includes('data:image/svg+xml')) {
        // Missing poster or has SVG placeholder
        if (item.type === 'movie' || item.type === 'show' || item.type === 'tv') {
          categories.missingPosters.push(item);
        } else {
          categories.other.push(item);
        }
      } else {
        // Has non-TMDb poster but could benefit from TMDb upgrade
        if ((item.type === 'movie' || item.type === 'show' || item.type === 'tv') && 
            !item.service?.includes('youtube') && !item.service?.includes('spotify') && !item.service?.includes('apple-music')) {
          categories.nonTMDbCandidates.push(item);
        } else {
          categories.other.push(item);
        }
      }
      
      // Small delay to avoid overwhelming the API
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    console.log('\n📊 Content Categorization:');
    console.log(`   ✅ Valid TMDb posters: ${categories.validTMDb.length}`);
    console.log(`   ❌ Broken TMDb posters: ${categories.brokenTMDb.length}`);
    console.log(`   🚫 Missing posters: ${categories.missingPosters.length}`);
    console.log(`   🔄 Non-TMDb candidates: ${categories.nonTMDbCandidates.length}`);
    console.log(`   📦 Other content: ${categories.other.length}`);

    let totalFixed = 0;
    let totalFailed = 0;

    // Fix broken TMDb posters
    console.log('\n🔧 Fixing broken TMDb posters...');
    for (const item of categories.brokenTMDb) {
      const result = await this.fixSinglePoster(item, 'Broken TMDb');
      if (result) totalFixed++;
      else totalFailed++;
    }

    // Fix missing posters
    console.log('\n🔧 Adding posters to content without them...');
    for (const item of categories.missingPosters) {
      const result = await this.fixSinglePoster(item, 'Missing');
      if (result) totalFixed++;
      else totalFailed++;
    }

    // Upgrade non-TMDb candidates (optional - only if they don't have good posters)
    console.log('\n🔧 Checking non-TMDb candidates for upgrades...');
    for (const item of categories.nonTMDbCandidates.slice(0, 20)) { // Limit to first 20 to avoid overwhelming
      const freshUrl = await this.getFreshPosterUrl(item.title, item.type, item.year);
      if (freshUrl && freshUrl !== item.imageUrl) {
        const isValid = await this.validateImageUrl(freshUrl);
        if (isValid) {
          console.log(`   🔄 Upgrading ${item.title} to TMDb poster`);
          await this.updatePoster(item, freshUrl);
          totalFixed++;
        }
      }
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    console.log('\n🎯 Comprehensive Fix Summary:');
    console.log(`   ✅ Total fixed: ${totalFixed}`);
    console.log(`   ❌ Total failed: ${totalFailed}`);
    console.log(`   📊 Valid TMDb posters: ${categories.validTMDb.length}`);
    console.log(`   📈 Coverage improvement: ${totalFixed} new working posters`);
  }

  /**
   * Fix a single poster
   */
  private async fixSinglePoster(item: ContentItem, category: string): Promise<boolean> {
    console.log(`\n🔍 ${category}: ${item.title}`);
    console.log(`   Current: ${item.imageUrl || 'None'}`);

    const freshUrl = await this.getFreshPosterUrl(item.title, item.type, item.year);
    
    if (freshUrl) {
      const isValid = await this.validateImageUrl(freshUrl);
      if (isValid) {
        console.log(`   🔧 Updating with: ${freshUrl}`);
        return await this.updatePoster(item, freshUrl);
      } else {
        console.log(`   ⚠️ Fresh URL also broken: ${freshUrl}`);
      }
    } else {
      console.log(`   ⚠️ No TMDb match found`);
    }

    return false;
  }

  /**
   * Update poster in database
   */
  private async updatePoster(item: ContentItem, newUrl: string): Promise<boolean> {
    try {
      await storage.createOrUpdateContent({
        ...item,
        imageUrl: newUrl,
        updatedAt: new Date()
      });
      console.log(`   ✅ Successfully updated database`);
      return true;
    } catch (error) {
      console.error(`   ❌ Database update failed:`, error);
      return false;
    }
  }

  /**
   * Quick status report
   */
  async generateStatusReport(): Promise<void> {
    console.log('📋 Poster Status Report\n');
    
    const allContent = await storage.getAllContent();
    let validTMDb = 0;
    let brokenTMDb = 0;
    let missingPosters = 0;
    let otherPosters = 0;

    for (const item of allContent) {
      if (item.imageUrl?.includes('image.tmdb.org')) {
        const isValid = await this.validateImageUrl(item.imageUrl);
        if (isValid) validTMDb++;
        else brokenTMDb++;
      } else if (!item.imageUrl || item.imageUrl.includes('data:image/svg+xml')) {
        missingPosters++;
      } else {
        otherPosters++;
      }
      await new Promise(resolve => setTimeout(resolve, 30));
    }

    console.log(`Total content items: ${allContent.length}`);
    console.log(`✅ Valid TMDb posters: ${validTMDb}`);
    console.log(`❌ Broken TMDb posters: ${brokenTMDb}`);
    console.log(`🚫 Missing posters: ${missingPosters}`);
    console.log(`📦 Other poster types: ${otherPosters}`);
    console.log(`📈 TMDb coverage: ${((validTMDb / allContent.length) * 100).toFixed(1)}%`);
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const fixer = new ComprehensivePosterFixer();

  if (args.includes('--report')) {
    await fixer.generateStatusReport();
  } else if (args.includes('--fix-all')) {
    await fixer.fixAllPosterIssues();
  } else {
    console.log('🎬 Comprehensive Poster Fixer');
    console.log('Usage:');
    console.log('  npx tsx comprehensivePosterFix.ts --report    # Generate status report');
    console.log('  npx tsx comprehensivePosterFix.ts --fix-all  # Fix all poster issues');
  }
}

// ES module check
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { ComprehensivePosterFixer };