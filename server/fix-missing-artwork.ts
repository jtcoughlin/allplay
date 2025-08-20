import { db } from './db';
import { content } from '../shared/schema';
import { TMDBService } from './tmdbService';
import { eq, sql } from 'drizzle-orm';

/**
 * Script to fix missing poster artwork by fetching from TMDB
 */
async function fixMissingArtwork() {
  console.log('🎨 Starting artwork fix process...');
  
  try {
    const tmdbService = new TMDBService();
    
    // Get all content with missing or placeholder images
    const itemsWithMissingImages = await db
      .select()
      .from(content)
      .where(sql`image_url IS NULL OR image_url = '' OR image_url LIKE '%placeholder%' OR image_url LIKE '%logo%'`);
    
    console.log(`📋 Found ${itemsWithMissingImages.length} items with missing artwork`);
    
    let successCount = 0;
    let failCount = 0;
    
    for (const item of itemsWithMissingImages) {
      console.log(`🔍 Processing: ${item.title}`);
      
      try {
        let posterUrl: string | null = null;
        
        // For movies, search TMDB movies
        if (item.type === 'movie') {
          const movieResult = await tmdbService.searchMovie(item.title || '', item.year || undefined);
          if (movieResult?.poster_path) {
            posterUrl = `https://image.tmdb.org/t/p/w500${movieResult.poster_path}`;
          }
        }
        // For shows, search TMDB TV
        else if (item.type === 'show') {
          const tvResult = await tmdbService.searchTVShow(item.title || '', item.year || undefined);
          if (tvResult?.poster_path) {
            posterUrl = `https://image.tmdb.org/t/p/w500${tvResult.poster_path}`;
          }
        }
        // For sports content, use sports-specific artwork patterns
        else if (item.genre === 'Sports' || item.genre === 'sports') {
          posterUrl = getSportsArtwork(item.title || '', item.service || '');
        }
        
        // Update the database if we found a poster
        if (posterUrl) {
          await db
            .update(content)
            .set({ imageUrl: posterUrl })
            .where(eq(content.id, item.id));
          
          console.log(`✅ Updated artwork for: ${item.title}`);
          successCount++;
        } else {
          console.log(`❌ No artwork found for: ${item.title}`);
          failCount++;
        }
        
        // Add a small delay to respect API rate limits
        await new Promise(resolve => setTimeout(resolve, 200));
        
      } catch (error) {
        console.error(`❌ Error processing ${item.title}:`, error);
        failCount++;
      }
    }
    
    console.log(`\n🎨 Artwork fix complete:`);
    console.log(`✅ Successfully updated: ${successCount} items`);
    console.log(`❌ Failed to update: ${failCount} items`);
    
  } catch (error) {
    console.error('❌ Error in artwork fix process:', error);
    throw error;
  }
}

/**
 * Get sports-specific artwork based on title and service
 */
function getSportsArtwork(title: string, service: string): string | null {
  const titleLower = title.toLowerCase();
  
  // Team-specific logos
  if (titleLower.includes('patriots')) {
    return 'https://logoeps.com/wp-content/uploads/2013/03/new-england-patriots-vector-logo.png';
  }
  if (titleLower.includes('red sox')) {
    return 'https://logos-world.net/wp-content/uploads/2020/05/Boston-Red-Sox-Logo.png';
  }
  if (titleLower.includes('bruins')) {
    return 'https://logos-world.net/wp-content/uploads/2020/05/Boston-Bruins-Logo.png';
  }
  if (titleLower.includes('celtics')) {
    return 'https://logos-world.net/wp-content/uploads/2020/05/Boston-Celtics-Logo.png';
  }
  
  // Generic sports content
  if (titleLower.includes('nfl') || titleLower.includes('football')) {
    return 'https://logoeps.com/wp-content/uploads/2013/12/nfl-vector-logo.png';
  }
  if (titleLower.includes('mlb') || titleLower.includes('baseball')) {
    return 'https://logoeps.com/wp-content/uploads/2014/05/mlb-vector-logo.png';
  }
  if (titleLower.includes('nba') || titleLower.includes('basketball')) {
    return 'https://logoeps.com/wp-content/uploads/2013/12/nba-vector-logo.png';
  }
  if (titleLower.includes('nhl') || titleLower.includes('hockey')) {
    return 'https://logoeps.com/wp-content/uploads/2013/12/nhl-vector-logo.png';
  }
  if (titleLower.includes('pga') || titleLower.includes('golf')) {
    return 'https://logoeps.com/wp-content/uploads/2013/11/pga-tour-vector-logo.png';
  }
  if (titleLower.includes('premier league') || titleLower.includes('soccer')) {
    return 'https://logoeps.com/wp-content/uploads/2013/11/premier-league-vector-logo.png';
  }
  
  return null;
}

// Auto-run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  fixMissingArtwork()
    .then(() => {
      console.log('✅ Artwork fix completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Artwork fix failed:', error);
      process.exit(1);
    });
}

export { fixMissingArtwork };