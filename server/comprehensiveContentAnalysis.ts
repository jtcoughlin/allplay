import fetch from 'node-fetch';
import { TMDBService } from './tmdbService';
import { storage } from './storage';

interface ContentAnalysis {
  id: string;
  title: string;
  service: string;
  type: string;
  imageUrl: string | null;
  year?: number;
  category: 'valid_tmdb' | 'broken_tmdb' | 'missing_poster' | 'needs_fallback' | 'other';
  priority: 'high' | 'medium' | 'low';
}

class ComprehensiveContentAnalyzer {
  private tmdbService: TMDBService;
  
  constructor() {
    this.tmdbService = new TMDBService();
  }

  async validateImageUrl(url: string): Promise<boolean> {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  async analyzeAllContent(): Promise<void> {
    console.log('🔍 COMPREHENSIVE CONTENT ANALYSIS\n');
    
    const allContent = await storage.getAllContent();
    console.log(`📊 Total content items: ${allContent.length}`);

    const analysis: ContentAnalysis[] = [];
    
    // High priority streaming services that should have good poster coverage
    const highPriorityServices = ['netflix', 'hulu', 'disney-plus', 'hbo-max', 'amazon-prime', 'apple-tv-plus', 'paramount-plus'];
    
    // Analyze each content item
    for (const item of allContent) {
      const isHighPriority = highPriorityServices.includes(item.service || '');
      const isMovieOrShow = item.type === 'movie' || item.type === 'show';
      
      let category: ContentAnalysis['category'] = 'other';
      let priority: ContentAnalysis['priority'] = 'low';
      
      // Determine priority
      if (isHighPriority && isMovieOrShow) {
        priority = 'high';
      } else if (isMovieOrShow || item.service === 'espn-plus' || item.service === 'youtube-tv') {
        priority = 'medium';
      }
      
      // Determine category
      if (item.imageUrl?.includes('image.tmdb.org')) {
        const isValid = await this.validateImageUrl(item.imageUrl);
        category = isValid ? 'valid_tmdb' : 'broken_tmdb';
      } else if (!item.imageUrl || item.imageUrl.includes('data:image/svg+xml')) {
        if (isMovieOrShow) {
          category = 'missing_poster';
        } else {
          category = 'needs_fallback';
        }
      } else {
        category = 'other';
      }
      
      analysis.push({
        id: item.id,
        title: item.title,
        service: item.service || 'unknown',
        type: item.type,
        imageUrl: item.imageUrl,
        year: item.year,
        category,
        priority
      });
      
      // Small delay to avoid overwhelming API
      await new Promise(resolve => setTimeout(resolve, 30));
    }

    // Generate comprehensive report
    this.generateReport(analysis);
    
    // Focus on high priority missing items
    await this.analyzeHighPriorityMissing(analysis);
  }

  private generateReport(analysis: ContentAnalysis[]): void {
    console.log('\n📊 POSTER STATUS BY CATEGORY:');
    
    const categories = {
      valid_tmdb: analysis.filter(a => a.category === 'valid_tmdb'),
      broken_tmdb: analysis.filter(a => a.category === 'broken_tmdb'),
      missing_poster: analysis.filter(a => a.category === 'missing_poster'),
      needs_fallback: analysis.filter(a => a.category === 'needs_fallback'),
      other: analysis.filter(a => a.category === 'other')
    };

    console.log(`✅ Valid TMDb posters: ${categories.valid_tmdb.length}`);
    console.log(`❌ Broken TMDb posters: ${categories.broken_tmdb.length}`);
    console.log(`🚫 Missing posters (movies/shows): ${categories.missing_poster.length}`);
    console.log(`📺 Needs fallback (live TV/other): ${categories.needs_fallback.length}`);
    console.log(`📦 Other: ${categories.other.length}`);

    console.log('\n📊 POSTER STATUS BY SERVICE:');
    const services = {} as Record<string, ContentAnalysis[]>;
    analysis.forEach(item => {
      if (!services[item.service]) services[item.service] = [];
      services[item.service].push(item);
    });

    Object.entries(services)
      .sort(([,a], [,b]) => b.length - a.length)
      .slice(0, 10)
      .forEach(([service, items]) => {
        const missing = items.filter(i => i.category === 'missing_poster' || i.category === 'broken_tmdb').length;
        const total = items.length;
        const coverage = ((total - missing) / total * 100).toFixed(1);
        console.log(`   ${service}: ${total - missing}/${total} (${coverage}%) - ${missing} missing`);
      });

    console.log('\n📊 HIGH PRIORITY MISSING POSTERS:');
    const highPriorityMissing = analysis.filter(a => 
      a.priority === 'high' && (a.category === 'missing_poster' || a.category === 'broken_tmdb')
    );
    
    highPriorityMissing.slice(0, 20).forEach(item => {
      console.log(`   ❌ ${item.title} (${item.service}) - ${item.category}`);
    });
    
    if (highPriorityMissing.length > 20) {
      console.log(`   ... and ${highPriorityMissing.length - 20} more high priority items`);
    }
  }

  private async analyzeHighPriorityMissing(analysis: ContentAnalysis[]): Promise<void> {
    console.log('\n🔧 ANALYZING HIGH PRIORITY MISSING ITEMS:');
    
    const highPriorityMissing = analysis.filter(a => 
      a.priority === 'high' && (a.category === 'missing_poster' || a.category === 'broken_tmdb')
    );

    // Check specific titles mentioned by user
    const userMentioned = ['House of Cards', 'Formula 1: Drive to Survive', 'Untold'];
    
    for (const title of userMentioned) {
      const found = analysis.find(a => a.title.toLowerCase().includes(title.toLowerCase()));
      if (found) {
        console.log(`\n🎯 USER MENTIONED: ${found.title}`);
        console.log(`   Service: ${found.service}`);
        console.log(`   Current status: ${found.category}`);
        console.log(`   Image URL: ${found.imageUrl || 'None'}`);
        
        if (found.category === 'missing_poster' || found.category === 'broken_tmdb') {
          // Try to get fresh TMDb poster
          const freshUrl = await this.getFreshPosterUrl(found.title, found.type, found.year);
          if (freshUrl) {
            console.log(`   🔧 Fresh TMDb URL available: ${freshUrl}`);
          } else {
            console.log(`   ⚠️ No TMDb match found - needs alternative source`);
          }
        }
      } else {
        console.log(`\n❓ USER MENTIONED: ${title} - NOT FOUND in content catalog`);
      }
    }
  }

  private async getFreshPosterUrl(title: string, type: string, year?: number): Promise<string | null> {
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

  async fixHighPriorityMissing(): Promise<void> {
    console.log('\n🔧 FIXING HIGH PRIORITY MISSING POSTERS:');
    
    const allContent = await storage.getAllContent();
    const highPriorityServices = ['netflix', 'hulu', 'disney-plus', 'hbo-max', 'amazon-prime', 'apple-tv-plus', 'paramount-plus'];
    
    let fixed = 0;
    let failed = 0;

    for (const item of allContent) {
      const isHighPriority = highPriorityServices.includes(item.service || '') && 
                           (item.type === 'movie' || item.type === 'show');
      
      if (!isHighPriority) continue;

      let needsFix = false;
      
      // Check if needs fixing
      if (!item.imageUrl || item.imageUrl.includes('data:image/svg+xml')) {
        needsFix = true;
      } else if (item.imageUrl.includes('image.tmdb.org')) {
        const isValid = await this.validateImageUrl(item.imageUrl);
        if (!isValid) needsFix = true;
      }

      if (needsFix) {
        console.log(`\n🔧 Fixing: ${item.title} (${item.service})`);
        
        const freshUrl = await this.getFreshPosterUrl(item.title, item.type, item.year);
        
        if (freshUrl) {
          const isValid = await this.validateImageUrl(freshUrl);
          if (isValid) {
            try {
              await storage.createOrUpdateContent({
                ...item,
                imageUrl: freshUrl,
                updatedAt: new Date()
              });
              console.log(`   ✅ Updated with: ${freshUrl}`);
              fixed++;
            } catch (error) {
              console.log(`   ❌ Database update failed`);
              failed++;
            }
          } else {
            console.log(`   ⚠️ Fresh URL also invalid: ${freshUrl}`);
            failed++;
          }
        } else {
          console.log(`   ⚠️ No TMDb match found`);
          failed++;
        }
        
        // Delay to be respectful to APIs
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }

    console.log(`\n🎯 High Priority Fix Summary:`);
    console.log(`   ✅ Fixed: ${fixed}`);
    console.log(`   ❌ Failed: ${failed}`);
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const analyzer = new ComprehensiveContentAnalyzer();

  if (args.includes('--analyze')) {
    await analyzer.analyzeAllContent();
  } else if (args.includes('--fix')) {
    await analyzer.fixHighPriorityMissing();
  } else {
    console.log('🎬 Comprehensive Content Analyzer');
    console.log('Usage:');
    console.log('  npx tsx comprehensiveContentAnalysis.ts --analyze  # Full analysis');
    console.log('  npx tsx comprehensiveContentAnalysis.ts --fix      # Fix high priority missing');
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { ComprehensiveContentAnalyzer };