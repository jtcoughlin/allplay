#!/usr/bin/env tsx

import { storage } from './storage';

interface PosterFix {
  serviceMatch: string;
  titleMatch: string;
  imageUrl: string;
  description: string;
}

class ESPNYouTubeTVPosterFixer {
  private posterFixes: PosterFix[] = [
    // ESPN+ Content
    {
      serviceMatch: 'espn-plus',
      titleMatch: 'sportscenter',
      imageUrl: 'https://1000logos.net/wp-content/uploads/2021/05/ESPN-logo.png',
      description: 'ESPN SportsCenter branding'
    },
    {
      serviceMatch: 'espn-plus',
      titleMatch: 'college gameday',
      imageUrl: 'https://1000logos.net/wp-content/uploads/2021/05/ESPN-logo.png',
      description: 'ESPN College GameDay branding'
    },
    {
      serviceMatch: 'espn-plus',
      titleMatch: 'first take',
      imageUrl: 'https://1000logos.net/wp-content/uploads/2021/05/ESPN-logo.png',
      description: 'ESPN First Take branding'
    },
    {
      serviceMatch: 'espn-plus',
      titleMatch: 'nfl live',
      imageUrl: 'https://1000logos.net/wp-content/uploads/2021/05/ESPN-logo.png',
      description: 'ESPN NFL Live branding'
    },
    {
      serviceMatch: 'espn-plus',
      titleMatch: '30 for 30',
      imageUrl: 'https://1000logos.net/wp-content/uploads/2021/05/ESPN-logo.png',
      description: 'ESPN 30 for 30 documentary branding'
    },
    
    // YouTube TV Content
    {
      serviceMatch: 'youtube-tv',
      titleMatch: 'sportscenter',
      imageUrl: 'https://1000logos.net/wp-content/uploads/2021/05/ESPN-logo.png',
      description: 'ESPN SportsCenter branding'
    },
    {
      serviceMatch: 'youtube-tv',
      titleMatch: 'first take',
      imageUrl: 'https://1000logos.net/wp-content/uploads/2021/05/ESPN-logo.png',
      description: 'ESPN First Take branding'
    },
    {
      serviceMatch: 'youtube-tv',
      titleMatch: 'nfl live',
      imageUrl: 'https://1000logos.net/wp-content/uploads/2021/05/ESPN-logo.png',
      description: 'ESPN NFL Live branding'
    },
    {
      serviceMatch: 'youtube-tv',
      titleMatch: 'college gameday',
      imageUrl: 'https://1000logos.net/wp-content/uploads/2021/05/ESPN-logo.png',
      description: 'ESPN College GameDay branding'
    }
  ];

  /**
   * Check if content matches a poster fix rule
   */
  private findMatchingFix(title: string, service: string): PosterFix | null {
    const titleLower = title.toLowerCase();
    const serviceLower = service.toLowerCase();
    
    return this.posterFixes.find(fix => 
      serviceLower === fix.serviceMatch && 
      titleLower.includes(fix.titleMatch.toLowerCase())
    ) || null;
  }

  /**
   * Fix all ESPN+ and YouTube TV posters comprehensively
   */
  async fixAllESPNYouTubeTVPosters(): Promise<void> {
    console.log('🔧 COMPREHENSIVE ESPN+ & YOUTUBE TV POSTER FIX\n');
    console.log('Applying branded static mappings to all ESPN+ and YouTube TV content...\n');

    try {
      const allContent = await storage.getAllContent();
      
      // Filter for ESPN+ and YouTube TV content
      const targetContent = allContent.filter(item => 
        item.service === 'espn-plus' || item.service === 'youtube-tv'
      );

      console.log(`📊 Found ${targetContent.length} ESPN+ and YouTube TV items to check`);
      console.log(`📊 Total items in database: ${allContent.length}`);

      let checkedCount = 0;
      let updatedCount = 0;
      let skippedCount = 0;
      let lockedCount = 0;

      for (const item of targetContent) {
        checkedCount++;
        
        // Show progress
        if (checkedCount % 25 === 0) {
          console.log(`   Progress: ${checkedCount}/${targetContent.length} items checked...`);
        }

        // Skip if already locked
        if ((item as any).posterLocked === true) {
          lockedCount++;
          continue;
        }

        // Find matching poster fix
        const posterFix = this.findMatchingFix(item.title || '', item.service || '');
        
        if (posterFix) {
          console.log(`\n🔧 Fixing: ${item.title}`);
          console.log(`   Service: ${item.service}`);
          console.log(`   Rule: ${posterFix.description}`);
          console.log(`   Old URL: ${item.imageUrl || 'NULL'}`);

          try {
            // Apply the poster fix
            await storage.createOrUpdateContent({
              ...item,
              imageUrl: posterFix.imageUrl,
              posterSource: 'staticMap',
              posterLocked: true,
              updatedAt: new Date(),
            } as any);

            console.log(`   ✅ Updated with branded poster (locked)`);
            updatedCount++;
          } catch (error) {
            console.error(`   ❌ Failed to update: ${error}`);
          }
        } else {
          skippedCount++;
        }
      }

      // Final summary
      console.log('\n🎯 ESPN+ & YOUTUBE TV POSTER FIX SUMMARY:');
      console.log(`   📊 Total ESPN+/YouTube TV items checked: ${checkedCount}`);
      console.log(`   🔧 Items updated with branded posters: ${updatedCount}`);
      console.log(`   🔒 Items already locked (skipped): ${lockedCount}`);
      console.log(`   ⚪ Items without matching rules: ${skippedCount}`);
      console.log(`   ✅ Success rate: ${updatedCount > 0 ? ((updatedCount / (checkedCount - lockedCount)) * 100).toFixed(1) + '%' : 'N/A'}`);

      if (updatedCount > 0) {
        console.log(`\n🎉 Successfully applied ${updatedCount} branded poster fixes!`);
        console.log('   All updated items are now locked to prevent future overwrites.');
      } else {
        console.log('\n✅ No updates needed - all targeted content already has appropriate posters.');
      }

    } catch (error) {
      console.error('❌ ESPN+/YouTube TV poster fix failed:', error);
      throw error;
    }
  }
}

// Main execution
async function main() {
  try {
    const fixer = new ESPNYouTubeTVPosterFixer();
    await fixer.fixAllESPNYouTubeTVPosters();
  } catch (error) {
    console.error('❌ Script failed:', error);
    process.exit(1);
  }
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { ESPNYouTubeTVPosterFixer };