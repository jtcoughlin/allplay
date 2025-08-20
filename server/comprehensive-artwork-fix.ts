import { db } from './db';
import { content } from '../shared/schema';
import { TMDBService } from './tmdbService';
import { eq, sql, or, like, isNull } from 'drizzle-orm';

/**
 * Comprehensive artwork fix for all visible content
 */
async function comprehensiveArtworkFix() {
  console.log('🎨 Starting comprehensive artwork fix...');
  
  try {
    const tmdbService = new TMDBService();
    
    // Get all content that needs artwork fixes
    const contentNeedingArtwork = await db
      .select()
      .from(content)
      .where(
        or(
          isNull(content.imageUrl),
          eq(content.imageUrl, ''),
          like(content.imageUrl, '%placeholder%'),
          like(content.imageUrl, '%example%')
        )
      );
    
    console.log(`📋 Found ${contentNeedingArtwork.length} items needing artwork`);
    
    // Comprehensive artwork mappings for all major content
    const artworkMappings = [
      // Netflix Content
      { title: 'Stranger Things', url: 'https://image.tmdb.org/t/p/w500/49WJfeN0moxb9IPfGn8AIqMGskD.jpg' },
      { title: 'Wednesday', url: 'https://image.tmdb.org/t/p/w500/9PFonBhy4cQy7Jz20NpMygczOkv.jpg' },
      { title: 'The Crown', url: 'https://image.tmdb.org/t/p/w500/1M876KPjulVwppEpldhdc8V4o68.jpg' },
      { title: 'Ozark', url: 'https://image.tmdb.org/t/p/w500/m73QAnDO6zF0IrF9rvrv9GqKlbn.jpg' },
      { title: 'House of Cards', url: 'https://image.tmdb.org/t/p/w500/vZGKLJZ0ykAW4dHGAOl4Hk2MZ3s.jpg' },
      { title: 'Red Notice', url: 'https://image.tmdb.org/t/p/w500/lAXONuqg41NwUMuzMiFvicDET9Y.jpg' },
      { title: 'Glass Onion: A Knives Out Mystery', url: 'https://image.tmdb.org/t/p/w500/vDGr1YdrlfbU9wxTOdpf3zChmv9.jpg' },
      
      // Disney+ Content
      { title: 'The Mandalorian', url: 'https://image.tmdb.org/t/p/w500/sWgBv7LV2PRoQgkxwlibdGXKz1S.jpg' },
      { title: 'Encanto', url: 'https://image.tmdb.org/t/p/w500/4j0PNHkMr5ax3IA8tjtxcmPU3QT.jpg' },
      { title: 'Luca', url: 'https://image.tmdb.org/t/p/w500/jTswp6KyDYKtvC52GbHagrZbGvD.jpg' },
      { title: 'Turning Red', url: 'https://image.tmdb.org/t/p/w500/qsdjk9oAKSQMWs0Vt5Pyfh6O4GZ.jpg' },
      { title: 'Moana', url: 'https://image.tmdb.org/t/p/w500/4JeejGugONWpJkbnvL12hVoYEDa.jpg' },
      
      // Amazon Prime Content
      { title: 'The Boys', url: 'https://image.tmdb.org/t/p/original/7cqKGQMnNabzOpi7qaIgZvQ7NGV.jpg' },
      { title: 'The Lord of the Rings: The Rings of Power', url: 'https://image.tmdb.org/t/p/w500/mYLOqiStMxDK3fYZFirgrMt8z5d.jpg' },
      { title: 'Tom Clancy\'s Jack Ryan', url: 'https://image.tmdb.org/t/p/w500/r2BRmVqyGYN3n2IhYnv3N3vQiYW.jpg' },
      { title: 'The Tomorrow War', url: 'https://image.tmdb.org/t/p/w500/34nDCQZwaEvsy4CFO5hkGRFDCVU.jpg' },
      { title: 'Coming 2 America', url: 'https://image.tmdb.org/t/p/w500/nWBPLkqNApY5pgrJFMiI9joSI30.jpg' },
      { title: 'Borat Subsequent Moviefilm', url: 'https://image.tmdb.org/t/p/w500/3L1Ml5RWjFVfVq3rQENvgFymT0U.jpg' },
      { title: 'Sound of Metal', url: 'https://image.tmdb.org/t/p/w500/3178oOJKKPDeQ2legWQvMPpllv.jpg' },
      { title: 'The Marvelous Mrs. Maisel', url: 'https://image.tmdb.org/t/p/w500/zS7fQiOZiKCVH2vlYSiIsFWW8hh.jpg' },
      { title: 'Fleabag', url: 'https://image.tmdb.org/t/p/w500/27jbcTrKGfmspAqKqtjhfNaOOlN.jpg' },
      { title: 'Invincible', url: 'https://image.tmdb.org/t/p/w500/jBn4LWlgdsf6xIUYhYBwpctBVsj.jpg' },
      
      // HBO Max Content
      { title: 'Dune', url: 'https://image.tmdb.org/t/p/w500/d5NXSklXo0qyIYkgV94XAgMIckC.jpg' },
      { title: 'Game Night', url: 'https://image.tmdb.org/t/p/w500/85R8LMyn9f2Lev2YPBF8Nughrkv.jpg' },
      { title: 'King Richard', url: 'https://image.tmdb.org/t/p/w500/1Wg6UbZpGrkn3LpNxU2wJlhCQCP.jpg' },
      { title: 'The Matrix Resurrections', url: 'https://image.tmdb.org/t/p/w500/8c4a8kE7PizaGQQnditMmI1xbRp.jpg' },
      { title: 'Space Jam: A New Legacy', url: 'https://image.tmdb.org/t/p/w500/5hoS3nEkGGXUfmnu39yw1k52JX5.jpg' },
      
      // Hulu Content
      { title: 'The Bear', url: 'https://image.tmdb.org/t/p/w500/zPyYmhzpxtK1A8EJhpNKCNyG7hA.jpg' },
      { title: 'Nomadland', url: 'https://image.tmdb.org/t/p/w500/kjEgTda5LNhfgONTKbqV6eDCDDW.jpg' },
      { title: 'Palm Springs', url: 'https://image.tmdb.org/t/p/w500/yf5IuMW6GHghu39kxA0oFx7Bxmj.jpg' },
      { title: 'The Adam Project', url: 'https://image.tmdb.org/t/p/w500/wFjboE0aFZNbVOF05fzrka9Fqyx.jpg' },
      
      // Apple TV+ Content
      { title: 'Ted Lasso', url: 'https://image.tmdb.org/t/p/w500/5fhZdwP1DVJ0FyVH6vrFdHwpXIn.jpg' },
      { title: 'CODA', url: 'https://image.tmdb.org/t/p/w500/ilKb8eHp3WnpTOsj5QsW7PUqAA4.jpg' },
      { title: 'Top Gun: Maverick', url: 'https://image.tmdb.org/t/p/original/kBSSbN1sOiJtXjAGVZXxHJR9Kox.jpg' },
      
      // Comedy Content
      { title: 'Friends', url: 'https://image.tmdb.org/t/p/w500/2koX1xLkpTQM4IZebYvKysFW1Nh.jpg' },
      { title: 'The Big Bang Theory', url: 'https://image.tmdb.org/t/p/w500/ooBGRQBdbGzBxAVfExiO8r7kloA.jpg' },
      { title: 'Family Guy', url: 'https://image.tmdb.org/t/p/w500/q3E71oY6qgAEiw6XQlHdZpmeKyr.jpg' },
      { title: 'American Dad!', url: 'https://image.tmdb.org/t/p/w500/xnFFz3etm1vftF0ns8RMHA8XdqJ.jpg' },
      { title: 'The Simpsons', url: 'https://image.tmdb.org/t/p/w500/KJqkRXX9Z4rLhfBo7kPiQvh7dUJ.jpg' },
      { title: 'Impractical Jokers', url: 'https://image.tmdb.org/t/p/w500/sEIaGsRO5vWVeHrNWlJpzMJyZyp.jpg' },
      { title: 'The Carbonaro Effect', url: 'https://image.tmdb.org/t/p/w500/jmZN7ZhgCILzjUU0a7PU5KV9g8m.jpg' },
      { title: 'Ridiculousness', url: 'https://image.tmdb.org/t/p/w500/fLFydgKgbVUQ1w5xjhQccIy5bXr.jpg' },
      { title: 'Teen Mom', url: 'https://image.tmdb.org/t/p/w500/rvF6yLK7L3FNJzM3oePZCqIZxv5.jpg' },
      
      // Sports Documentaries
      { title: 'The Last Dance', url: 'https://image.tmdb.org/t/p/original/kY0h95L73t7a6ev6Rv0aHSCtN7y.jpg' },
      { title: 'Formula 1: Drive to Survive', url: 'https://image.tmdb.org/t/p/w500/wtfeqYKGF6fZQwJ3MJ6YF4p4Nzh.jpg' },
      { title: 'Quarterback', url: 'https://image.tmdb.org/t/p/w500/uYhEZN6tn3YJqJPXkuQVCAqCQjT.jpg' },
      { title: 'O.J.: Made in America', url: 'https://image.tmdb.org/t/p/w500/hGEoZGAfiQaBCANFRvOiL1yGPvZ.jpg' },
      { title: '30 for 30: Broke', url: 'https://image.tmdb.org/t/p/w500/sJJUZfVKCtxXzllVhEHt5z3n6qb.jpg' },
      
      // Comedy Movies
      { title: 'Superbad', url: 'https://image.tmdb.org/t/p/w500/ek8e8txUyUwd2BNqj6lFEerJfbq.jpg' },
      { title: 'The Grand Budapest Hotel', url: 'https://image.tmdb.org/t/p/w500/pSr9eGqmCsGbNBJ9sB6r1A0dg8J.jpg' },
      { title: 'Happy Gilmore 2', url: 'https://image.tmdb.org/t/p/w500/38i1ru7iOdF9q8lSfgqYbKdw8Cp.jpg' },
      
      // Stand-up Specials
      { title: 'Dave Chappelle: Sticks & Stones', url: 'https://image.tmdb.org/t/p/w500/lhKd2ILUlFzGZLQTxs9hNgY1FzE.jpg' },
      { title: 'Bo Burnham: Inside', url: 'https://image.tmdb.org/t/p/w500/fQ2FbCUq6oyHbBmr0zZzGafaKA6.jpg' },
      { title: 'Hannah Gadsby: Nanette', url: 'https://image.tmdb.org/t/p/w500/pVFDfX77EDeMmwU0FZ33ZPUYcDT.jpg' },
      
      // Popular Shows
      { title: 'Yellowstone', url: 'https://image.tmdb.org/t/p/w500/peNC0aWkH67vROaGPHRcAq2H0HI.jpg' },
      { title: 'Atlanta', url: 'https://image.tmdb.org/t/p/w500/8HZaJeCzOKTN7hwjqQhMI7X2kBl.jpg' },
      { title: 'Better Call Saul', url: 'https://image.tmdb.org/t/p/w500/fC2HDm5t0kHl7mTm7jxMR31jqP0.jpg' },
      { title: 'American Horror Story', url: 'https://image.tmdb.org/t/p/w500/t8rQuNk5kWCbGhMSSNcDcKRrHaK.jpg' },
      { title: 'South Park', url: 'https://image.tmdb.org/t/p/w500/l43YBiNj3tqMDSRrM7zfIHFkqfE.jpg' },
    ];
    
    let updateCount = 0;
    
    // Apply artwork mappings
    for (const mapping of artworkMappings) {
      const result = await db
        .update(content)
        .set({ imageUrl: mapping.url })
        .where(eq(content.title, mapping.title));
      
      console.log(`✅ Updated artwork for: ${mapping.title}`);
      updateCount++;
    }
    
    // For any remaining content without artwork, try TMDB lookup
    const remainingContent = await db
      .select()
      .from(content)
      .where(
        or(
          isNull(content.imageUrl),
          eq(content.imageUrl, '')
        )
      );
    
    console.log(`🔍 Attempting TMDB lookup for ${remainingContent.length} remaining items...`);
    
    for (const item of remainingContent.slice(0, 50)) { // Limit to avoid rate limits
      try {
        let posterUrl: string | null = null;
        
        if (item.type === 'movie') {
          const movieResult = await tmdbService.searchMovie(item.title || '', item.year || undefined);
          if (movieResult?.poster_path) {
            posterUrl = `https://image.tmdb.org/t/p/w500${movieResult.poster_path}`;
          }
        } else if (item.type === 'show') {
          const tvResult = await tmdbService.searchTVShow(item.title || '', item.year || undefined);
          if (tvResult?.poster_path) {
            posterUrl = `https://image.tmdb.org/t/p/w500${tvResult.poster_path}`;
          }
        }
        
        if (posterUrl) {
          await db
            .update(content)
            .set({ imageUrl: posterUrl })
            .where(eq(content.id, item.id));
          
          console.log(`✅ TMDB lookup success: ${item.title}`);
          updateCount++;
        }
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.log(`❌ TMDB lookup failed: ${item.title}`);
      }
    }
    
    console.log(`\n🎨 Comprehensive artwork fix complete: Updated ${updateCount} items`);
    
  } catch (error) {
    console.error('❌ Error in comprehensive artwork fix:', error);
    throw error;
  }
}

// Auto-run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  comprehensiveArtworkFix()
    .then(() => {
      console.log('✅ Comprehensive artwork fix completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Comprehensive artwork fix failed:', error);
      process.exit(1);
    });
}

export { comprehensiveArtworkFix };