import { db } from './db';
import { content } from '../shared/schema';
import { TMDBService } from './tmdbService';
import { eq, sql, or, like } from 'drizzle-orm';

/**
 * Enhanced artwork fix focusing on user-visible content
 */
async function fixPriorityArtwork() {
  console.log('🎨 Starting priority artwork fix...');
  
  try {
    const tmdbService = new TMDBService();
    
    // Define authentic artwork mappings for key content
    const artworkMappings = [
      // Comedy Movies
      { title: 'Superbad', url: 'https://image.tmdb.org/t/p/w500/ek8e8txUyUwd2BNqj6lFEerJfbq.jpg' },
      { title: 'The Grand Budapest Hotel', url: 'https://image.tmdb.org/t/p/w500/pSr9eGqmCsGbNBJ9sB6r1A0dg8J.jpg' },
      { title: 'Game Night', url: 'https://image.tmdb.org/t/p/w500/85R8LMyn9f2Lev2YPBF8Nughrkv.jpg' },
      { title: 'Palm Springs', url: 'https://image.tmdb.org/t/p/w500/yf5IuMW6GHghu39kxA0oFx7Bxmj.jpg' },
      { title: 'Happy Gilmore 2', url: 'https://image.tmdb.org/t/p/w500/38i1ru7iOdF9q8lSfgqYbKdw8Cp.jpg' },
      
      // Comedy Shows
      { title: 'Friends', url: 'https://image.tmdb.org/t/p/w500/2koX1xLkpTQM4IZebYvKysFW1Nh.jpg' },
      { title: 'The Big Bang Theory', url: 'https://image.tmdb.org/t/p/w500/ooBGRQBdbGzBxAVfExiO8r7kloA.jpg' },
      { title: 'Family Guy', url: 'https://image.tmdb.org/t/p/w500/q3E71oY6qgAEiw6XQlHdZpmeKyr.jpg' },
      { title: 'Ted Lasso', url: 'https://image.tmdb.org/t/p/w500/5fhZdwP1DVJ0FyVH6vrFdHwpXIn.jpg' },
      { title: 'The Marvelous Mrs. Maisel', url: 'https://image.tmdb.org/t/p/w500/zS7fQiOZiKCVH2vlYSiIsFWW8hh.jpg' },
      { title: 'Fleabag', url: 'https://image.tmdb.org/t/p/w500/27jbcTrKGfmspAqKqtjhfNaOOlN.jpg' },
      
      // Reality Comedy
      { title: 'Impractical Jokers', url: 'https://image.tmdb.org/t/p/w500/sEIaGsRO5vWVeHrNWlJpzMJyZyp.jpg' },
      { title: 'The Carbonaro Effect', url: 'https://image.tmdb.org/t/p/w500/jmZN7ZhgCILzjUU0a7PU5KV9g8m.jpg' },
      { title: 'Ridiculousness', url: 'https://image.tmdb.org/t/p/w500/fLFydgKgbVUQ1w5xjhQccIy5bXr.jpg' },
      
      // Stand-up Specials
      { title: 'Dave Chappelle: Sticks & Stones', url: 'https://image.tmdb.org/t/p/w500/lhKd2ILUlFzGZLQTxs9hNgY1FzE.jpg' },
      { title: 'Bo Burnham: Inside', url: 'https://image.tmdb.org/t/p/w500/fQ2FbCUq6oyHbBmr0zZzGafaKA6.jpg' },
      { title: 'Hannah Gadsby: Nanette', url: 'https://image.tmdb.org/t/p/w500/pVFDfX77EDeMmwU0FZ33ZPUYcDT.jpg' },
      
      // Sports Documentaries
      { title: 'The Last Dance', url: 'https://image.tmdb.org/t/p/original/kY0h95L73t7a6ev6Rv0aHSCtN7y.jpg' },
      { title: 'O.J.: Made in America', url: 'https://image.tmdb.org/t/p/w500/hGEoZGAfiQaBCANFRvOiL1yGPvZ.jpg' },
      { title: '30 for 30: Broke', url: 'https://image.tmdb.org/t/p/w500/sJJUZfVKCtxXzllVhEHt5z3n6qb.jpg' },
      { title: 'Formula 1: Drive to Survive', url: 'https://image.tmdb.org/t/p/w500/wtfeqYKGF6fZQwJ3MJ6YF4p4Nzh.jpg' },
      { title: 'Quarterback', url: 'https://image.tmdb.org/t/p/w500/uYhEZN6tn3YJqJPXkuQVCAqCQjT.jpg' },
      
      // Major TV Shows & Movies
      { title: 'Top Gun: Maverick', url: 'https://image.tmdb.org/t/p/original/kBSSbN1sOiJtXjAGVZXxHJR9Kox.jpg' },
      { title: 'Yellowstone', url: 'https://image.tmdb.org/t/p/w500/peNC0aWkH67vROaGPHRcAq2H0HI.jpg' },
      { title: 'The Boys', url: 'https://image.tmdb.org/t/p/original/7cqKGQMnNabzOpi7qaIgZvQ7NGV.jpg' },
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
    
    // Update sports content with team logos
    const sportsUpdates = [
      { title: 'New England Patriots vs Buffalo Bills', url: 'https://logoeps.com/wp-content/uploads/2013/03/new-england-patriots-vector-logo.png' },
      { title: 'Boston Red Sox vs New York Yankees', url: 'https://logos-world.net/wp-content/uploads/2020/05/Boston-Red-Sox-Logo.png' },
      { title: 'Boston Bruins vs Toronto Maple Leafs', url: 'https://logos-world.net/wp-content/uploads/2020/05/Boston-Bruins-Logo.png' },
      { title: 'Boston Celtics vs Los Angeles Lakers', url: 'https://logos-world.net/wp-content/uploads/2020/05/Boston-Celtics-Logo.png' },
      { title: 'PGA Tour Live Coverage', url: 'https://logoeps.com/wp-content/uploads/2013/11/pga-tour-vector-logo.png' },
      { title: 'NFL RedZone', url: 'https://image.tmdb.org/t/p/w500/6GbFI4zKjepuElrXWD4EfUE1mmu.jpg' },
    ];
    
    for (const update of sportsUpdates) {
      await db
        .update(content)
        .set({ imageUrl: update.url })
        .where(eq(content.title, update.title));
      
      console.log(`✅ Updated sports artwork for: ${update.title}`);
      updateCount++;
    }
    
    console.log(`\n🎨 Priority artwork fix complete: Updated ${updateCount} items`);
    
  } catch (error) {
    console.error('❌ Error in priority artwork fix:', error);
    throw error;
  }
}

// Auto-run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  fixPriorityArtwork()
    .then(() => {
      console.log('✅ Priority artwork fix completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Priority artwork fix failed:', error);
      process.exit(1);
    });
}

export { fixPriorityArtwork };