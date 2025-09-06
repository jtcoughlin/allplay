import { storage } from './storage';
import { YouTubeTVStaticMapping } from './youtubetvStaticMapping';

interface PosterQualityReport {
  contentId: string;
  title: string;
  service: string;
  currentPoster: string | null;
  posterSource: 'tmdb' | 'youtube' | 'staticMap' | 'fallback' | 'unknown';
  qualityIssues: string[];
  recommended: string;
}

class PosterQualityChecker {
  
  /**
   * Check and fix known problem cases
   */
  async fixKnownProblemCases(): Promise<void> {
    console.log('🔧 FIXING KNOWN PROBLEM CASES\n');
    
    const allContent = await storage.getAllContent();
    
    // Problem cases mentioned by user
    const problemCases = [
      { search: 'tucker carlson', service: 'youtube-tv' },
      { search: 'anderson cooper', service: 'youtube-tv' },
      { search: '30 for 30', service: 'espn-plus' }
    ];

    let fixedCount = 0;

    for (const problemCase of problemCases) {
      console.log(`🎯 Looking for: ${problemCase.search}`);
      
      const items = allContent.filter(item => 
        item.title.toLowerCase().includes(problemCase.search) &&
        item.service === problemCase.service
      );

      if (items.length === 0) {
        console.log(`   ⚠️ No items found matching "${problemCase.search}" in ${problemCase.service}`);
        continue;
      }

      for (const item of items) {
        console.log(`\n   📝 Found: ${item.title}`);
        console.log(`   📍 Current poster: ${item.imageUrl?.substring(0, 80)}...`);
        
        // Check if current poster is obviously wrong
        const hasQualityIssue = this.detectQualityIssues(item.imageUrl, item.title);
        
        if (hasQualityIssue.length > 0) {
          console.log(`   ❌ Quality issues detected: ${hasQualityIssue.join(', ')}`);
          
          // Try to get better poster from static mapping
          const staticPoster = YouTubeTVStaticMapping.getStaticPoster(item.title);
          
          if (staticPoster) {
            await this.updateContentPoster(item, staticPoster, 'staticMap');
            console.log(`   ✅ Fixed with static mapping`);
            fixedCount++;
          } else {
            // Generate appropriate fallback
            const fallbackPoster = this.generateAppropriateeFallback(item.title, item.service);
            await this.updateContentPoster(item, fallbackPoster, 'fallback');
            console.log(`   ✅ Fixed with appropriate fallback`);
            fixedCount++;
          }
        } else {
          console.log(`   ✅ Current poster appears appropriate`);
        }
      }
    }

    console.log(`\n🎯 Fixed ${fixedCount} problem cases`);
  }

  /**
   * Generate comprehensive quality report
   */
  async generateQualityReport(): Promise<void> {
    console.log('📊 POSTER QUALITY ANALYSIS\n');
    
    const allContent = await storage.getAllContent();
    const reports: PosterQualityReport[] = [];
    
    for (const item of allContent) {
      const report: PosterQualityReport = {
        contentId: item.id,
        title: item.title,
        service: item.service || 'unknown',
        currentPoster: item.imageUrl,
        posterSource: this.detectPosterSource(item.imageUrl),
        qualityIssues: this.detectQualityIssues(item.imageUrl, item.title),
        recommended: 'keep'
      };

      if (report.qualityIssues.length > 0) {
        report.recommended = 'replace';
        reports.push(report);
      }
    }

    // Group by service and issue type
    const serviceGroups = new Map<string, PosterQualityReport[]>();
    
    for (const report of reports) {
      if (!serviceGroups.has(report.service)) {
        serviceGroups.set(report.service, []);
      }
      serviceGroups.get(report.service)!.push(report);
    }

    console.log('🚨 QUALITY ISSUES BY SERVICE:');
    for (const [service, serviceReports] of Array.from(serviceGroups.entries())) {
      if (serviceReports.length > 0) {
        console.log(`\n📺 ${service.toUpperCase()}: ${serviceReports.length} issues`);
        
        // Show top 5 issues for each service
        serviceReports.slice(0, 5).forEach((report: PosterQualityReport) => {
          console.log(`   ❌ ${report.title}`);
          console.log(`      Issues: ${report.qualityIssues.join(', ')}`);
          console.log(`      Source: ${report.posterSource}`);
        });
        
        if (serviceReports.length > 5) {
          console.log(`   ... and ${serviceReports.length - 5} more`);
        }
      }
    }

    console.log(`\n📊 Summary: ${reports.length} items need poster fixes`);
  }

  /**
   * Detect poster source type
   */
  private detectPosterSource(imageUrl: string | null): 'tmdb' | 'youtube' | 'staticMap' | 'fallback' | 'unknown' {
    if (!imageUrl) return 'unknown';
    
    if (imageUrl.includes('image.tmdb.org')) return 'tmdb';
    if (imageUrl.includes('ytimg.com') || imageUrl.includes('youtube.com')) return 'youtube';
    if (imageUrl.includes('data:image/svg+xml')) return 'fallback';
    
    // Check if it's likely from static mapping (high-quality TMDb URLs)
    if (imageUrl.includes('image.tmdb.org/t/p/w500/')) return 'staticMap';
    
    return 'unknown';
  }

  /**
   * Detect quality issues with current poster
   */
  private detectQualityIssues(imageUrl: string | null, title: string): string[] {
    const issues: string[] = [];
    
    if (!imageUrl) {
      issues.push('missing poster');
      return issues;
    }

    // Generic placeholder detection
    if (imageUrl.includes('data:image/svg+xml')) {
      if (imageUrl.includes('LIVE%20TV') || imageUrl.includes('YOUTUBE%20TV')) {
        return []; // These are appropriate fallbacks
      }
      issues.push('generic placeholder');
    }

    // Check for known problematic patterns in title vs likely content mismatch
    const titleLower = title.toLowerCase();
    if (titleLower.includes('tucker carlson') || titleLower.includes('anderson cooper')) {
      // These specific shows had quality issues mentioned
      if (imageUrl.includes('ytimg.com')) {
        issues.push('potentially incorrect youtube thumbnail');
      }
    }

    if (titleLower.includes('30 for 30')) {
      if (!imageUrl.includes('image.tmdb.org') && !this.isESPNBranded(imageUrl)) {
        issues.push('missing ESPN 30 for 30 branding');
      }
    }

    return issues;
  }

  /**
   * Check if poster has ESPN branding
   */
  private isESPNBranded(imageUrl: string): boolean {
    return imageUrl.includes('espn') || imageUrl.includes('ESPN');
  }

  /**
   * Generate appropriate fallback for specific content
   */
  private generateAppropriateeFallback(title: string, service?: string): string {
    const titleLower = title.toLowerCase();
    
    // News show fallbacks
    if (titleLower.includes('tucker carlson') || titleLower.includes('fox news')) {
      return this.generateChannelIcon('FOX NEWS', '#003366');
    }
    
    if (titleLower.includes('anderson cooper') || titleLower.includes('cnn')) {
      return this.generateChannelIcon('CNN', '#cc0000');
    }
    
    if (titleLower.includes('30 for 30') || service === 'espn-plus') {
      return this.generateChannelIcon('ESPN+', '#ff0033');
    }

    // Generic service fallbacks
    if (service === 'youtube-tv') {
      return this.generateChannelIcon('LIVE TV', '#e50914');
    }
    
    return this.generateChannelIcon('TV', '#6366f1');
  }

  private generateChannelIcon(channel: string, color: string): string {
    return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='300'%3E%3Crect width='200' height='300' fill='${encodeURIComponent(color)}'/%3E%3Ctext x='100' y='130' text-anchor='middle' fill='white' font-size='18' font-weight='bold' font-family='Arial'%3E${encodeURIComponent(channel)}%3C/text%3E%3Crect x='60' y='170' width='80' height='50' fill='white' opacity='0.2' rx='8'/%3E%3Ccircle cx='100' cy='195' r='15' fill='white' opacity='0.8'/%3E%3C/svg%3E`;
  }

  /**
   * Update content poster with source tracking
   */
  private async updateContentPoster(
    item: any, 
    imageUrl: string, 
    source: 'tmdb' | 'youtube' | 'staticMap' | 'fallback'
  ): Promise<void> {
    try {
      await storage.createOrUpdateContent({
        ...item,
        imageUrl,
        posterSource: source, // Add source tracking
        updatedAt: new Date()
      });
    } catch (error) {
      console.error(`   ❌ Database update failed:`, error);
      throw error;
    }
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const checker = new PosterQualityChecker();

  if (args.includes('--fix')) {
    await checker.fixKnownProblemCases();
  } else if (args.includes('--report')) {
    await checker.generateQualityReport();
  } else {
    console.log('🔍 Poster Quality Checker');
    console.log('Usage:');
    console.log('  npx tsx posterQualityChecker.ts --fix     # Fix known problem cases');
    console.log('  npx tsx posterQualityChecker.ts --report  # Generate quality report');
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { PosterQualityChecker };