/**
 * Utility to fix malformed SVG data URLs in the database
 * The issue: SVG data URLs with improperly escaped quotes and URL encoding
 */

export class DataUrlFixer {
  /**
   * Creates a properly encoded SVG data URL for content placeholders
   */
  static createPlaceholderSVG(service: string, contentType?: string): string {
    const serviceColors: { [key: string]: string } = {
      'netflix': '#e50914',
      'disney-plus': '#113ccf',
      'hulu': '#1ce783',
      'amazon-prime': '#00a8e1',
      'hbo-max': '#673ab7',
      'apple-tv': '#000000',
      'paramount-plus': '#0064ff',
      'youtube-tv': '#e50914',
      'espn-plus': '#cf0a2c',
      'cnn': '#cc0000',
      'default': '#233a56'
    };

    const serviceLabels: { [key: string]: string } = {
      'netflix': 'NETFLIX',
      'disney-plus': 'DISNEY+',
      'hulu': 'HULU',
      'amazon-prime': 'PRIME VIDEO',
      'hbo-max': 'HBO MAX',
      'apple-tv': 'APPLE TV+',
      'paramount-plus': 'PARAMOUNT+',
      'youtube-tv': 'YOUTUBE TV',
      'espn-plus': 'ESPN+',
      'cnn': 'CNN',
      'default': 'STREAMING'
    };

    const color = serviceColors[service] || serviceColors.default;
    const label = serviceLabels[service] || serviceLabels.default;

    // Create properly formatted SVG
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="300">
      <rect width="200" height="300" fill="${color}"/>
      <text x="100" y="120" text-anchor="middle" fill="white" font-size="16" font-weight="bold">${label}</text>
      <circle cx="100" cy="180" r="30" fill="white" opacity="0.3"/>
      <polygon points="90,165 90,195 120,180" fill="white"/>
    </svg>`;

    // Properly encode the SVG for data URL
    const encodedSvg = encodeURIComponent(svg);
    return `data:image/svg+xml,${encodedSvg}`;
  }

  /**
   * Fix a malformed data URL by recreating it properly
   */
  static fixDataUrl(originalUrl: string, service: string): string {
    // If it's already a proper TMDB URL or other valid URL, don't change it
    if (!originalUrl.startsWith('data:image/svg+xml')) {
      return originalUrl;
    }

    // Extract service from the malformed data URL or use provided service
    const serviceMatch = originalUrl.match(/font-weight="bold">([^<]+)</);
    let detectedService = service;
    
    if (serviceMatch) {
      const serviceText = serviceMatch[1];
      if (serviceText.includes('YOUTUBE TV')) detectedService = 'youtube-tv';
      else if (serviceText.includes('ESPN')) detectedService = 'espn-plus';
      else if (serviceText.includes('CNN')) detectedService = 'cnn';
    }

    // Create a new properly encoded data URL
    return this.createPlaceholderSVG(detectedService);
  }

  /**
   * Update all malformed data URLs in the database
   */
  static async fixAllDataUrls(): Promise<number> {
    try {
      const { db } = await import('../db');
      const { content } = await import('@shared/schema');
      const { eq, like } = await import('drizzle-orm');
      
      console.log('🔧 Starting data URL fix process...');
      
      // Get all content with malformed SVG data URLs
      const malformedContent = await db.select()
        .from(content)
        .where(like(content.imageUrl, 'data:image/svg+xml;charset=utf-8,<svg%'));
      
      console.log(`📋 Found ${malformedContent.length} items with malformed SVG data URLs to fix`);
      
      let fixedCount = 0;
      
      for (const item of malformedContent) {
        try {
          const fixedUrl = this.fixDataUrl(item.imageUrl || '', item.service || '');
          
          if (fixedUrl !== item.imageUrl) {
            await db.update(content)
              .set({ imageUrl: fixedUrl })
              .where(eq(content.id, item.id));
            
            console.log(`✅ Fixed data URL for "${item.title}" (${item.service})`);
            fixedCount++;
          }
        } catch (error) {
          console.error(`❌ Error fixing data URL for "${item.title}":`, error);
        }
      }
      
      console.log(`🎉 Fixed ${fixedCount} data URLs successfully`);
      return fixedCount;
    } catch (error) {
      console.error('❌ Error in fixAllDataUrls:', error);
      throw error;
    }
  }
}