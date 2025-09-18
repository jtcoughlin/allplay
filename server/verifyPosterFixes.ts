#!/usr/bin/env tsx

import { storage } from './storage';

interface VerificationResult {
  title: string;
  service: string;
  imageUrl: string | null;
  posterSource: string | null;
  posterLocked: boolean | null;
  isValidUrl: boolean;
  hasCorrectBranding: boolean;
}

class PosterFixVerifier {
  private brandedTitles = [
    'Tucker Carlson Tonight',
    'Anderson Cooper 360°',
    '30 for 30',
    'College GameDay',
    'SportsCenter',
    'First Take',
    'PTI', 
    'NFL Live',
    'CBS Evening News',
    'ABC World News Tonight',
    'NBC Nightly News',
    'CNN Newsroom'
  ];

  /**
   * Validate if an image URL returns 200 OK
   */
  private async validateImageUrl(url: string | null): Promise<boolean> {
    if (!url) return false;

    try {
      if (url.startsWith('data:image/')) {
        return true; // Data URLs are always valid if properly formatted
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(url, { 
        method: 'HEAD',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      const contentType = response.headers.get('content-type');
      return response.ok && (contentType?.startsWith('image/') ?? false);
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if the poster has correct branded URL
   */
  private hasCorrectBranding(title: string, imageUrl: string | null): boolean {
    if (!imageUrl) return false;
    
    const titleLower = title.toLowerCase();
    
    // Check for branded URLs
    if (titleLower.includes('tucker carlson') && imageUrl.includes('Fox_News_Channel_logo')) return true;
    if (titleLower.includes('anderson cooper') && imageUrl.includes('CNN')) return true;
    if (titleLower.includes('30 for 30') && imageUrl.includes('30for30_logo')) return true;
    if ((titleLower.includes('college gameday') || titleLower.includes('sportscenter') || 
         titleLower.includes('first take') || titleLower.includes('pti') || 
         titleLower.includes('nfl live')) && imageUrl.includes('ESPN')) return true;
    if (titleLower.includes('cbs evening news') && imageUrl.includes('CBS_logo')) return true;
    if (titleLower.includes('abc world news') && imageUrl.includes('ABC')) return true;
    if (titleLower.includes('nbc nightly news') && imageUrl.includes('NBC_logo')) return true;
    if (titleLower.includes('cnn newsroom') && imageUrl.includes('CNN')) return true;
    
    return false;
  }

  /**
   * Verify all poster fixes
   */
  async verifyPosterFixes(): Promise<void> {
    console.log('🧪 POSTER FIX VERIFICATION\n');
    console.log('Testing all content tiles to confirm poster fixes are working correctly...\n');

    try {
      // Get all content from /api/content endpoint equivalent
      const allContent = await storage.getAllContent();
      console.log(`📊 Checking ${allContent.length} total content tiles\n`);

      const results: VerificationResult[] = [];
      let validPosters = 0;
      let invalidPosters = 0;
      let lockedPosters = 0;
      let staticMappedPosters = 0;
      let brandedPosters = 0;

      // Check each content item
      for (const item of allContent) {
        const isValidUrl = await this.validateImageUrl(item.imageUrl);
        const hasCorrectBranding = this.hasCorrectBranding(item.title || '', item.imageUrl);
        
        const result: VerificationResult = {
          title: item.title || 'Unknown',
          service: item.service || 'unknown',
          imageUrl: item.imageUrl,
          posterSource: (item as any).posterSource || null,
          posterLocked: (item as any).posterLocked || null,
          isValidUrl,
          hasCorrectBranding
        };

        results.push(result);

        // Count statistics
        if (isValidUrl) {
          validPosters++;
        } else {
          invalidPosters++;
        }

        if ((item as any).posterLocked === true) {
          lockedPosters++;
        }

        if ((item as any).posterSource === 'staticMap') {
          staticMappedPosters++;
        }

        if (hasCorrectBranding) {
          brandedPosters++;
        }
      }

      // Check specific branded titles
      console.log('🎯 BRANDED TITLE VERIFICATION:\n');
      
      for (const brandedTitle of this.brandedTitles) {
        const matchingItems = results.filter(r => 
          r.title.toLowerCase().includes(brandedTitle.toLowerCase())
        );

        if (matchingItems.length > 0) {
          const firstMatch = matchingItems[0];
          const statusEmoji = firstMatch.isValidUrl ? '✅' : '❌';
          const brandEmoji = firstMatch.hasCorrectBranding ? '🎨' : '⚪';
          const lockEmoji = firstMatch.posterLocked ? '🔒' : '🔓';
          
          console.log(`${statusEmoji} ${brandedTitle}`);
          console.log(`   URL: ${firstMatch.isValidUrl ? 'VALID' : 'BROKEN'}`);
          console.log(`   ${brandEmoji} Branding: ${firstMatch.hasCorrectBranding ? 'CORRECT' : 'GENERIC'}`);
          console.log(`   ${lockEmoji} Lock: ${firstMatch.posterLocked ? 'LOCKED' : 'UNLOCKED'}`);
          console.log(`   Source: ${firstMatch.posterSource || 'UNKNOWN'}`);
          console.log('');
        } else {
          console.log(`❌ ${brandedTitle} - NOT FOUND IN DATABASE\n`);
        }
      }

      // Overall summary
      console.log('📊 VERIFICATION SUMMARY:\n');
      console.log(`✅ Valid poster URLs: ${validPosters}/${allContent.length} (${((validPosters/allContent.length)*100).toFixed(1)}%)`);
      console.log(`❌ Invalid poster URLs: ${invalidPosters}`);
      console.log(`🔒 Locked posters: ${lockedPosters}`);
      console.log(`📍 Static mapped posters: ${staticMappedPosters}`);
      console.log(`🎨 Correctly branded posters: ${brandedPosters}`);

      // Success criteria check
      const successRate = (validPosters / allContent.length) * 100;
      console.log('\n🎯 SUCCESS CRITERIA:\n');
      
      if (invalidPosters === 0) {
        console.log('✅ PERFECT: No broken poster URLs found!');
      } else {
        console.log(`⚠️  ${invalidPosters} posters still need attention`);
      }

      if (staticMappedPosters >= this.brandedTitles.length) {
        console.log('✅ EXCELLENT: All major branded titles have static mappings');
      } else {
        console.log(`⚠️  Only ${staticMappedPosters} static mappings applied`);
      }

      if (successRate >= 95) {
        console.log('✅ OUTSTANDING: 95%+ poster success rate achieved!');
      } else if (successRate >= 90) {
        console.log('✅ GOOD: 90%+ poster success rate achieved');
      } else {
        console.log(`⚠️  NEEDS IMPROVEMENT: ${successRate.toFixed(1)}% success rate`);
      }

      console.log('\n🏁 VERIFICATION COMPLETE!');
      
      if (invalidPosters === 0 && staticMappedPosters > 0) {
        console.log('🎉 ALL POSTER FIXES SUCCESSFUL - ISSUE RESOLVED!');
      }

    } catch (error) {
      console.error('❌ Verification failed:', error);
      throw error;
    }
  }
}

// Main execution
async function main() {
  try {
    const verifier = new PosterFixVerifier();
    await verifier.verifyPosterFixes();
  } catch (error) {
    console.error('❌ Script failed:', error);
    process.exit(1);
  }
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { PosterFixVerifier };