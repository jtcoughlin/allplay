import { TMDBService } from './tmdbService';
import { storage } from './storage';

class SpecificTitleFixer {
  private tmdbService: TMDBService;
  
  constructor() {
    this.tmdbService = new TMDBService();
  }

  async fixNetflixTitles(): Promise<void> {
    console.log('🔧 FIXING SPECIFIC NETFLIX TITLES\n');
    
    const allContent = await storage.getAllContent();
    
    // Specific titles with search variations
    const titleFixes = [
      {
        original: 'House of Cards',
        searchTerms: ['House of Cards', 'House of Cards (US)', 'House of Cards 2013'],
        year: 2013,
        type: 'show'
      },
      {
        original: 'Formula 1: Drive to Survive',
        searchTerms: ['Formula 1 Drive to Survive', 'Formula 1: Drive to Survive', 'Drive to Survive'],
        year: 2019,
        type: 'show'
      },
      {
        original: 'Untold: The Girlfriend Who Didnt Exist',
        searchTerms: ['Untold The Girlfriend Who Didnt Exist', 'The Girlfriend Who Didnt Exist', 'Untold'],
        year: 2022,
        type: 'show'
      },
      {
        original: '30 for 30: Broke',
        searchTerms: ['30 for 30 Broke', 'Broke 30 for 30', 'Broke'],
        year: 2012,
        type: 'show'
      }
    ];

    for (const fix of titleFixes) {
      console.log(`\n🎯 Fixing: ${fix.original}`);
      
      // Find content item
      const contentItem = allContent.find(item => 
        item.title.toLowerCase().includes(fix.original.toLowerCase()) ||
        fix.original.toLowerCase().includes(item.title.toLowerCase())
      );
      
      if (!contentItem) {
        console.log(`   ❌ Content not found in database`);
        continue;
      }
      
      console.log(`   📍 Found: ${contentItem.title} (${contentItem.service})`);
      console.log(`   📍 Current URL: ${contentItem.imageUrl}`);
      
      // Try multiple search terms
      let posterUrl = null;
      
      for (const searchTerm of fix.searchTerms) {
        console.log(`   🔍 Trying search term: "${searchTerm}"`);
        
        if (fix.type === 'movie') {
          posterUrl = await this.tmdbService.getMoviePosterUrl(searchTerm, fix.year);
        } else {
          const tvResult = await this.tmdbService.searchTVShow(searchTerm, fix.year);
          if (tvResult?.poster_path) {
            posterUrl = this.tmdbService.getPosterUrl(tvResult.poster_path);
          }
        }
        
        if (posterUrl) {
          console.log(`   ✅ Found poster: ${posterUrl}`);
          break;
        }
        
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      if (posterUrl) {
        try {
          await storage.createOrUpdateContent({
            ...contentItem,
            imageUrl: posterUrl,
            updatedAt: new Date()
          });
          console.log(`   ✅ Successfully updated database`);
        } catch (error) {
          console.log(`   ❌ Database update failed:`, error);
        }
      } else {
        console.log(`   ⚠️ No poster found with any search term - will need fallback`);
      }
    }
  }

  async fixWithFallbacks(): Promise<void> {
    console.log('\n🔧 IMPLEMENTING SMART FALLBACKS\n');
    
    const allContent = await storage.getAllContent();
    
    // Content that needs fallbacks
    const needsFallback = allContent.filter(item => 
      !item.imageUrl || 
      item.imageUrl.includes('data:image/svg+xml') ||
      (item.imageUrl.includes('image.tmdb.org') && !this.isValidTMDbUrl(item.imageUrl))
    );
    
    console.log(`📊 Found ${needsFallback.length} items needing fallbacks`);
    
    let fixed = 0;
    
    for (const item of needsFallback.slice(0, 50)) { // Process first 50
      console.log(`\n🔧 Processing: ${item.title} (${item.service})`);
      
      let fallbackUrl = null;
      
      // Try different fallback strategies
      if (item.service === 'youtube-tv' || item.isLive) {
        fallbackUrl = this.generateLiveTVIcon(item.title, item.service);
      } else if (item.type === 'music') {
        fallbackUrl = this.generateMusicIcon(item.title, item.artist);
      } else if (item.service === 'espn-plus' && item.type === 'show') {
        fallbackUrl = this.generateSportsIcon(item.title);
      } else if (item.type === 'movie' || item.type === 'show') {
        fallbackUrl = this.generateGenreIcon(item.type, item.genre);
      }
      
      if (fallbackUrl && fallbackUrl !== item.imageUrl) {
        try {
          await storage.createOrUpdateContent({
            ...item,
            imageUrl: fallbackUrl,
            updatedAt: new Date()
          });
          console.log(`   ✅ Applied fallback: ${fallbackUrl}`);
          fixed++;
        } catch (error) {
          console.log(`   ❌ Failed to apply fallback`);
        }
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log(`\n🎯 Fallback Summary: ${fixed} items updated with fallbacks`);
  }

  private isValidTMDbUrl(url: string): boolean {
    // Basic validation - real validation would require network request
    return url.includes('image.tmdb.org') && url.includes('/w500/') && url.length > 50;
  }

  private generateLiveTVIcon(title: string, service?: string): string {
    // Generate channel-specific icons for live TV
    const channel = this.getChannelFromTitle(title);
    
    if (channel) {
      return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='300'%3E%3Crect width='200' height='300' fill='%23e50914'/%3E%3Ctext x='100' y='120' text-anchor='middle' fill='white' font-size='16' font-weight='bold'%3E${encodeURIComponent(channel)}%3C/text%3E%3Ccircle cx='100' cy='180' r='30' fill='white' opacity='0.3'/%3E%3Cpolygon points='90,165 90,195 120,180' fill='white'/%3E%3C/svg%3E`;
    }
    
    return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='300'%3E%3Crect width='200' height='300' fill='%23e50914'/%3E%3Ctext x='100' y='120' text-anchor='middle' fill='white' font-size='16' font-weight='bold'%3ELIVE TV%3C/text%3E%3Ccircle cx='100' cy='180' r='30' fill='white' opacity='0.3'/%3E%3Cpolygon points='90,165 90,195 120,180' fill='white'/%3E%3C/svg%3E`;
  }

  private generateMusicIcon(title: string, artist?: string): string {
    return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='300'%3E%3Crect width='200' height='300' fill='%231ed760'/%3E%3Ctext x='100' y='120' text-anchor='middle' fill='white' font-size='16' font-weight='bold'%3EMUSIC%3C/text%3E%3Ccircle cx='100' cy='180' r='30' fill='white' opacity='0.3'/%3E%3Cpath d='M85,165 L85,195 Q85,205 95,205 Q105,205 105,195 L105,175 L115,175 L115,155 L105,155 L105,165 Z' fill='white'/%3E%3C/svg%3E`;
  }

  private generateSportsIcon(title: string): string {
    return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='300'%3E%3Crect width='200' height='300' fill='%23ff6600'/%3E%3Ctext x='100' y='120' text-anchor='middle' fill='white' font-size='16' font-weight='bold'%3ESPORTS%3C/text%3E%3Ccircle cx='100' cy='180' r='25' fill='white'/%3E%3Cpath d='M85,180 Q100,160 115,180 Q100,200 85,180' fill='%23ff6600'/%3E%3C/svg%3E`;
  }

  private generateGenreIcon(type: string, genre?: string): string {
    const color = type === 'movie' ? '%234282f7' : '%237c3aed';
    const text = type === 'movie' ? 'MOVIE' : 'TV SHOW';
    
    return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='300'%3E%3Crect width='200' height='300' fill='${color}'/%3E%3Ctext x='100' y='120' text-anchor='middle' fill='white' font-size='16' font-weight='bold'%3E${text}%3C/text%3E%3Crect x='75' y='160' width='50' height='40' fill='white' opacity='0.3' rx='5'/%3E%3C/svg%3E`;
  }

  private getChannelFromTitle(title: string): string | null {
    const channelMap: Record<string, string> = {
      'cnn': 'CNN',
      'fox news': 'FOX NEWS',
      'msnbc': 'MSNBC',
      'espn': 'ESPN',
      'cbs': 'CBS',
      'nbc': 'NBC',
      'abc': 'ABC',
      'fox': 'FOX',
      'cnbc': 'CNBC',
      'bloomberg': 'BLOOMBERG'
    };
    
    const titleLower = title.toLowerCase();
    for (const [key, value] of Object.entries(channelMap)) {
      if (titleLower.includes(key)) {
        return value;
      }
    }
    
    return null;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const fixer = new SpecificTitleFixer();

  if (args.includes('--netflix')) {
    await fixer.fixNetflixTitles();
  } else if (args.includes('--fallbacks')) {
    await fixer.fixWithFallbacks();
  } else if (args.includes('--all')) {
    await fixer.fixNetflixTitles();
    await fixer.fixWithFallbacks();
  } else {
    console.log('🎬 Specific Title Fixer');
    console.log('Usage:');
    console.log('  npx tsx fixSpecificTitles.ts --netflix    # Fix specific Netflix titles');
    console.log('  npx tsx fixSpecificTitles.ts --fallbacks  # Apply smart fallbacks');
    console.log('  npx tsx fixSpecificTitles.ts --all        # Do both');
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { SpecificTitleFixer };