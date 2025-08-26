/**
 * Script to fix the remaining 22 unencoded SVG data URLs
 */
import { db } from './db.js';
import { content } from '@shared/schema';
import { like, eq } from 'drizzle-orm';

async function fixRemainingUncodedSVGs() {
  try {
    console.log('🚀 Fixing remaining unencoded SVG data URLs...');
    
    // Get all content with unencoded SVG data URLs
    const uncodedContent = await db.select()
      .from(content)
      .where(like(content.imageUrl, 'data:image/svg+xml,<svg%'));
    
    console.log(`📋 Found ${uncodedContent.length} items with unencoded SVG data URLs`);
    
    let fixedCount = 0;
    
    for (const item of uncodedContent) {
      try {
        if (!item.imageUrl) continue;
        
        // Extract the SVG part after 'data:image/svg+xml,'
        const svgMatch = item.imageUrl.match(/^data:image\/svg\+xml,(.+)$/);
        if (!svgMatch) continue;
        
        const svgContent = svgMatch[1];
        
        // Properly encode the SVG content
        const encodedSvg = encodeURIComponent(svgContent);
        const fixedUrl = `data:image/svg+xml,${encodedSvg}`;
        
        // Update the database
        await db.update(content)
          .set({ imageUrl: fixedUrl })
          .where(eq(content.id, item.id));
        
        console.log(`✅ Fixed unencoded SVG for "${item.title}" (${item.service})`);
        fixedCount++;
        
      } catch (error) {
        console.error(`❌ Error fixing SVG for "${item.title}":`, error);
      }
    }
    
    console.log(`🎉 Fixed ${fixedCount} unencoded SVG URLs successfully`);
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error in fixRemainingUncodedSVGs:', error);
    process.exit(1);
  }
}

fixRemainingUncodedSVGs();