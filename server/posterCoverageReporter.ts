import { storage } from './storage';
import { YouTubeTVStaticMapping } from './youtubetvStaticMapping';

interface PosterAnalysis {
  id: string;
  title: string;
  service: string;
  imageUrl: string | null;
  posterSource: 'tmdb' | 'youtube' | 'staticMap' | 'fallback' | 'unknown';
  isValidImage: boolean;
  isFallback: boolean;
  posterLocked: boolean;
  validationError?: string;
  urlResponseCode?: number;
}

interface ServiceStats {
  total: number;
  withPosters: number;
  validPosters: number;
  fallbacks: number;
  broken: number;
  locked: number;
  coverage: number;
}

interface PosterSourceStats {
  count: number;
  valid: number;
  broken: number;
  percentage: number;
}

class PosterCoverageReporter {

  /**
   * Generate comprehensive poster coverage report
   */
  async generateFullReport(): Promise<void> {
    console.log('🎬 COMPREHENSIVE POSTER COVERAGE REPORT\n');
    console.log('Analyzing all content items for poster coverage, quality, and sources...\n');

    const allContent = await storage.getAllContent();
    console.log(`📊 Total content items: ${allContent.length}\n`);

    // Analyze each content item
    const analyses: PosterAnalysis[] = [];
    
    console.log('🔍 ANALYZING CONTENT:');
    let processed = 0;
    for (const item of allContent) {
      const analysis = await this.analyzeContentPoster(item);
      analyses.push(analysis);
      
      processed++;
      if (processed % 50 === 0) {
        console.log(`   Processed ${processed}/${allContent.length} items...`);
      }
    }

    console.log(`✅ Analysis complete: ${analyses.length} items processed\n`);

    // Generate reports
    await this.generateServiceReport(analyses);
    await this.generateSourceReport(analyses);
    await this.generateIssuesReport(analyses);
    await this.generateRecommendationsReport(analyses);
  }

  /**
   * Analyze a single content item's poster
   */
  private async analyzeContentPoster(item: any): Promise<PosterAnalysis> {
    const analysis: PosterAnalysis = {
      id: item.id,
      title: item.title,
      service: item.service || 'unknown',
      imageUrl: item.imageUrl,
      posterSource: this.detectPosterSource(item.imageUrl),
      isValidImage: false,
      isFallback: false,
      posterLocked: false
    };

    // Check if poster is locked (from static mapping)
    const staticMapping = YouTubeTVStaticMapping.getStaticMapping(item.title);
    if (staticMapping && staticMapping.pinned) {
      analysis.posterLocked = true;
    }

    // Validate image URL
    if (item.imageUrl) {
      const validation = await this.validateImageUrl(item.imageUrl);
      analysis.isValidImage = validation.isValid;
      analysis.validationError = validation.error;
      analysis.urlResponseCode = validation.responseCode;
      
      // Check if it's a fallback
      analysis.isFallback = this.isFallbackImage(item.imageUrl);
    }

    return analysis;
  }

  /**
   * Detect the source type of a poster URL
   */
  private detectPosterSource(imageUrl: string | null): 'tmdb' | 'youtube' | 'staticMap' | 'fallback' | 'unknown' {
    if (!imageUrl) return 'unknown';
    
    // TMDb sources
    if (imageUrl.includes('image.tmdb.org')) {
      // High-quality TMDb URLs from static mappings
      if (imageUrl.includes('/t/p/w500/') && imageUrl.length > 80) {
        return 'staticMap';
      }
      return 'tmdb';
    }
    
    // YouTube sources
    if (imageUrl.includes('ytimg.com') || imageUrl.includes('youtube.com')) {
      return 'youtube';
    }
    
    // SVG fallbacks
    if (imageUrl.includes('data:image/svg+xml')) {
      return 'fallback';
    }
    
    return 'unknown';
  }

  /**
   * Check if image is a fallback placeholder
   */
  private isFallbackImage(imageUrl: string): boolean {
    if (!imageUrl) return true;
    
    // SVG fallbacks
    if (imageUrl.includes('data:image/svg+xml')) return true;
    
    // Generic placeholder patterns
    if (imageUrl.includes('placeholder') || imageUrl.includes('default')) return true;
    
    return false;
  }

  /**
   * Validate image URL by making a HEAD request
   */
  private async validateImageUrl(imageUrl: string): Promise<{
    isValid: boolean;
    error?: string;
    responseCode?: number;
  }> {
    try {
      // Skip validation for data URLs (they're always valid if properly formatted)
      if (imageUrl.startsWith('data:image/')) {
        return { isValid: true };
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(imageUrl, { 
        method: 'HEAD',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      const contentType = response.headers.get('content-type');
      const isValid = response.ok && (contentType?.startsWith('image/') ?? false);
      
      return {
        isValid,
        responseCode: response.status,
        error: isValid ? undefined : `HTTP ${response.status}: ${response.statusText}`
      };
    } catch (error) {
      return {
        isValid: false,
        error: error instanceof Error ? error.message : 'Network error'
      };
    }
  }

  /**
   * Generate service-based coverage report
   */
  private async generateServiceReport(analyses: PosterAnalysis[]): Promise<void> {
    console.log('📺 COVERAGE BY SERVICE:\n');

    const serviceMap = new Map<string, ServiceStats>();
    
    // Initialize service stats
    for (const analysis of analyses) {
      if (!serviceMap.has(analysis.service)) {
        serviceMap.set(analysis.service, {
          total: 0,
          withPosters: 0,
          validPosters: 0,
          fallbacks: 0,
          broken: 0,
          locked: 0,
          coverage: 0
        });
      }
    }

    // Calculate stats
    for (const analysis of analyses) {
      const stats = serviceMap.get(analysis.service)!;
      stats.total++;
      
      if (analysis.imageUrl) {
        stats.withPosters++;
        
        if (analysis.isValidImage) {
          stats.validPosters++;
        } else {
          stats.broken++;
        }
        
        if (analysis.isFallback) {
          stats.fallbacks++;
        }
        
        if (analysis.posterLocked) {
          stats.locked++;
        }
      }
      
      stats.coverage = stats.validPosters / stats.total * 100;
    }

    // Display results
    const sortedServices = Array.from(serviceMap.entries())
      .sort(([,a], [,b]) => b.total - a.total);

    for (const [service, stats] of sortedServices) {
      console.log(`🎯 ${service.toUpperCase()}`);
      console.log(`   Total items: ${stats.total}`);
      console.log(`   With posters: ${stats.withPosters} (${(stats.withPosters/stats.total*100).toFixed(1)}%)`);
      console.log(`   Valid posters: ${stats.validPosters} (${stats.coverage.toFixed(1)}%)`);
      console.log(`   Fallbacks: ${stats.fallbacks}`);
      console.log(`   Broken URLs: ${stats.broken}`);
      console.log(`   Locked posters: ${stats.locked}`);
      
      // Coverage assessment
      if (stats.coverage >= 90) {
        console.log(`   🟢 EXCELLENT coverage`);
      } else if (stats.coverage >= 70) {
        console.log(`   🟡 GOOD coverage`);
      } else if (stats.coverage >= 50) {
        console.log(`   🟠 FAIR coverage`);
      } else {
        console.log(`   🔴 POOR coverage`);
      }
      console.log('');
    }
  }

  /**
   * Generate poster source report
   */
  private async generateSourceReport(analyses: PosterAnalysis[]): Promise<void> {
    console.log('🎨 POSTER SOURCES BREAKDOWN:\n');

    const sourceMap = new Map<string, PosterSourceStats>();
    const totalWithPosters = analyses.filter(a => a.imageUrl).length;

    // Calculate source stats
    for (const analysis of analyses) {
      if (!analysis.imageUrl) continue;
      
      const source = analysis.posterSource;
      if (!sourceMap.has(source)) {
        sourceMap.set(source, { count: 0, valid: 0, broken: 0, percentage: 0 });
      }
      
      const stats = sourceMap.get(source)!;
      stats.count++;
      
      if (analysis.isValidImage) {
        stats.valid++;
      } else {
        stats.broken++;
      }
    }

    // Calculate percentages
    for (const stats of Array.from(sourceMap.values())) {
      stats.percentage = (stats.count / totalWithPosters) * 100;
    }

    // Display results
    const sortedSources = Array.from(sourceMap.entries())
      .sort(([,a], [,b]) => b.count - a.count);

    for (const [source, stats] of sortedSources) {
      const reliability = stats.count > 0 ? (stats.valid / stats.count * 100) : 0;
      
      console.log(`📸 ${source.toUpperCase()}`);
      console.log(`   Count: ${stats.count} (${stats.percentage.toFixed(1)}% of all posters)`);
      console.log(`   Valid: ${stats.valid}`);
      console.log(`   Broken: ${stats.broken}`);
      console.log(`   Reliability: ${reliability.toFixed(1)}%`);
      
      if (reliability >= 95) {
        console.log(`   🟢 EXCELLENT source`);
      } else if (reliability >= 80) {
        console.log(`   🟡 GOOD source`);
      } else if (reliability >= 60) {
        console.log(`   🟠 FAIR source`);
      } else {
        console.log(`   🔴 UNRELIABLE source`);
      }
      console.log('');
    }
  }

  /**
   * Generate issues report
   */
  private async generateIssuesReport(analyses: PosterAnalysis[]): Promise<void> {
    console.log('🚨 ISSUES REPORT:\n');

    const missingPosters = analyses.filter(a => !a.imageUrl);
    const brokenUrls = analyses.filter(a => a.imageUrl && !a.isValidImage);
    const fallbacksUsed = analyses.filter(a => a.isFallback);

    console.log(`❌ Missing posters: ${missingPosters.length}`);
    if (missingPosters.length > 0 && missingPosters.length <= 10) {
      missingPosters.forEach(item => {
        console.log(`   • ${item.title} (${item.service})`);
      });
    } else if (missingPosters.length > 10) {
      missingPosters.slice(0, 10).forEach(item => {
        console.log(`   • ${item.title} (${item.service})`);
      });
      console.log(`   ... and ${missingPosters.length - 10} more`);
    }
    console.log('');

    console.log(`🔗 Broken URLs: ${brokenUrls.length}`);
    if (brokenUrls.length > 0 && brokenUrls.length <= 10) {
      brokenUrls.forEach(item => {
        console.log(`   • ${item.title} (${item.service}) - ${item.validationError}`);
      });
    } else if (brokenUrls.length > 10) {
      brokenUrls.slice(0, 10).forEach(item => {
        console.log(`   • ${item.title} (${item.service}) - ${item.validationError}`);
      });
      console.log(`   ... and ${brokenUrls.length - 10} more`);
    }
    console.log('');

    console.log(`🔄 Fallbacks used: ${fallbacksUsed.length}`);
    
    // Group fallbacks by service for better insights
    const fallbacksByService = new Map<string, number>();
    for (const item of fallbacksUsed) {
      fallbacksByService.set(item.service, (fallbacksByService.get(item.service) || 0) + 1);
    }
    
    for (const [service, count] of Array.from(fallbacksByService.entries()).sort((a, b) => b[1] - a[1])) {
      console.log(`   • ${service}: ${count} fallbacks`);
    }
    console.log('');
  }

  /**
   * Generate recommendations report
   */
  private async generateRecommendationsReport(analyses: PosterAnalysis[]): Promise<void> {
    console.log('💡 RECOMMENDATIONS:\n');

    const totalItems = analyses.length;
    const withPosters = analyses.filter(a => a.imageUrl).length;
    const validPosters = analyses.filter(a => a.isValidImage).length;
    const overallCoverage = (validPosters / totalItems) * 100;

    console.log(`📊 Overall Coverage: ${validPosters}/${totalItems} (${overallCoverage.toFixed(1)}%)\n`);

    // Service-specific recommendations
    const serviceIssues = new Map<string, { missing: number, broken: number, total: number }>();
    
    for (const analysis of analyses) {
      if (!serviceIssues.has(analysis.service)) {
        serviceIssues.set(analysis.service, { missing: 0, broken: 0, total: 0 });
      }
      
      const issues = serviceIssues.get(analysis.service)!;
      issues.total++;
      
      if (!analysis.imageUrl) {
        issues.missing++;
      } else if (!analysis.isValidImage) {
        issues.broken++;
      }
    }

    console.log('🎯 Priority Actions:');
    
    // Find services with most issues
    const sortedByIssues = Array.from(serviceIssues.entries())
      .map(([service, issues]) => ({
        service,
        issues: issues.missing + issues.broken,
        missing: issues.missing,
        broken: issues.broken,
        total: issues.total,
        coverage: ((issues.total - issues.missing - issues.broken) / issues.total) * 100
      }))
      .sort((a, b) => b.issues - a.issues);

    for (const item of sortedByIssues.slice(0, 5)) {
      if (item.issues > 0) {
        console.log(`   1. Fix ${item.service}: ${item.missing} missing + ${item.broken} broken (${item.coverage.toFixed(1)}% coverage)`);
      }
    }

    console.log('\n🔧 Technical Recommendations:');
    
    // Specific technical recommendations
    const youtubeIssues = analyses.filter(a => a.posterSource === 'youtube' && !a.isValidImage).length;
    const tmdbIssues = analyses.filter(a => a.posterSource === 'tmdb' && !a.isValidImage).length;
    const fallbackCount = analyses.filter(a => a.isFallback).length;
    
    if (youtubeIssues > 10) {
      console.log(`   • Implement enhanced YouTube validation (${youtubeIssues} broken YouTube thumbnails)`);
    }
    
    if (tmdbIssues > 5) {
      console.log(`   • Review TMDb API integration (${tmdbIssues} broken TMDb URLs)`);
    }
    
    if (fallbackCount > 50) {
      console.log(`   • Expand static mappings to reduce fallback usage (${fallbackCount} items using fallbacks)`);
    }
    
    const unlockedCritical = analyses.filter(a => 
      (a.title.toLowerCase().includes('tucker carlson') || 
       a.title.toLowerCase().includes('anderson cooper') ||
       a.title.toLowerCase().includes('30 for 30')) && 
      !a.posterLocked
    ).length;
    
    if (unlockedCritical > 0) {
      console.log(`   • Lock critical content posters to prevent regressions (${unlockedCritical} unlocked critical items)`);
    }

    console.log('\n🎯 Success Metrics:');
    console.log(`   • Target overall coverage: 95% (currently ${overallCoverage.toFixed(1)}%)`);
    console.log(`   • Target YouTube TV coverage: 90% (critical for user experience)`);
    console.log(`   • Target ESPN+ coverage: 95% (sports content priority)`);
    console.log(`   • Zero inappropriate thumbnails (babies, eye patches, etc.)`);
  }

  /**
   * Export detailed analysis for further processing
   */
  async exportDetailedAnalysis(): Promise<void> {
    console.log('💾 EXPORTING DETAILED ANALYSIS...\n');

    const allContent = await storage.getAllContent();
    const analyses: PosterAnalysis[] = [];
    
    for (const item of allContent) {
      const analysis = await this.analyzeContentPoster(item);
      analyses.push(analysis);
    }

    // Group by issues for focused fixes
    const problemAreas = {
      missingPosters: analyses.filter(a => !a.imageUrl),
      brokenUrls: analyses.filter(a => a.imageUrl && !a.isValidImage),
      inappropriateContent: analyses.filter(a => 
        a.title.toLowerCase().includes('tucker carlson') ||
        a.title.toLowerCase().includes('anderson cooper') ||
        a.title.toLowerCase().includes('30 for 30')
      ),
      highPriorityServices: analyses.filter(a => 
        a.service === 'youtube-tv' || 
        a.service === 'espn-plus' || 
        a.service === 'netflix'
      )
    };

    console.log('📋 EXPORT SUMMARY:');
    console.log(`   Missing posters: ${problemAreas.missingPosters.length} items`);
    console.log(`   Broken URLs: ${problemAreas.brokenUrls.length} items`);
    console.log(`   Critical content needing review: ${problemAreas.inappropriateContent.length} items`);
    console.log(`   High-priority services: ${problemAreas.highPriorityServices.length} items`);
    
    console.log('\n✅ Analysis export complete. Ready for automated fixes.');
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const reporter = new PosterCoverageReporter();

  if (args.includes('--full')) {
    await reporter.generateFullReport();
  } else if (args.includes('--export')) {
    await reporter.exportDetailedAnalysis();
  } else {
    console.log('🎬 Poster Coverage Reporter');
    console.log('Usage:');
    console.log('  npx tsx posterCoverageReporter.ts --full     # Generate comprehensive coverage report');
    console.log('  npx tsx posterCoverageReporter.ts --export   # Export detailed analysis for fixes');
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { PosterCoverageReporter };