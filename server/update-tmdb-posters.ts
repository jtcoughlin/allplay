import { storage } from './storage.js';
import { TMDBService } from './tmdbService.js';

interface ContentItem {
  id: string;
  title: string;
  service: string;
  type: string;
  imageUrl: string | null;
  year?: number;
}

export async function updateContentWithTMDBPosters() {
  console.log('🎬 Starting TMDB poster update process...');
  
  const tmdbService = new TMDBService();
  
  // Get all content with SVG placeholder URLs
  const allContent = await storage.getAllContent();
  const placeholderContent = allContent.filter(item => 
    item.imageUrl && item.imageUrl.includes('data:image/svg+xml')
  );
  
  console.log(`📊 Found ${placeholderContent.length} items with placeholder images`);
  console.log(`📊 Found ${allContent.length - placeholderContent.length} items with existing poster URLs`);
  
  let updatedCount = 0;
  let skippedCount = 0;
  const errors = [];
  
  for (let i = 0; i < placeholderContent.length; i++) {
    const content = placeholderContent[i];
    
    try {
      console.log(`\n🔍 Processing ${i + 1}/${placeholderContent.length}: "${content.title}" (${content.service})`);
      
      let posterUrl: string | null = null;
      
      // Determine content type and search accordingly
      if (content.type === 'movie' || content.service === 'netflix' || content.service === 'amazon-prime' || 
          content.service === 'hulu' || content.service === 'disney-plus' || content.service === 'hbo-max' || 
          content.service === 'paramount-plus' || content.service === 'apple-tv') {
        
        // Try as movie first
        console.log(`   🎥 Searching TMDB for movie: "${content.title}"`);
        posterUrl = await tmdbService.getMoviePosterUrl(content.title, content.year || undefined);
        
        // If no movie result, try as TV show
        if (!posterUrl) {
          console.log(`   📺 No movie found, trying as TV show: "${content.title}"`);
          const tvResult = await tmdbService.searchTVShow(content.title, content.year || undefined);
          if (tvResult && tvResult.poster_path) {
            posterUrl = tmdbService.getPosterUrl(tvResult.poster_path);
          }
        }
        
      } else {
        // For TV content, search as TV show first
        console.log(`   📺 Searching TMDB for TV show: "${content.title}"`);
        const tvResult = await tmdbService.searchTVShow(content.title, content.year || undefined);
        if (tvResult && tvResult.poster_path) {
          posterUrl = tmdbService.getPosterUrl(tvResult.poster_path);
        }
        
        // If no TV result, try as movie
        if (!posterUrl) {
          console.log(`   🎥 No TV show found, trying as movie: "${content.title}"`);
          posterUrl = await tmdbService.getMoviePosterUrl(content.title, content.year || undefined);
        }
      }
      
      if (posterUrl) {
        console.log(`   ✅ Found poster: ${posterUrl}`);
        
        // Update the content in the database
        await storage.createOrUpdateContent({
          ...content,
          imageUrl: posterUrl
        });
        
        updatedCount++;
        console.log(`   💾 Updated database record`);
      } else {
        console.log(`   ❌ No poster found on TMDB`);
        skippedCount++;
      }
      
      // Be respectful to TMDB API - add delay between requests
      await new Promise(resolve => setTimeout(resolve, 300));
      
    } catch (error) {
      console.error(`   💥 Error processing "${content.title}":`, error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      errors.push({ title: content.title, error: errorMessage });
      skippedCount++;
    }
  }
  
  console.log('\n🎉 TMDB poster update complete!');
  console.log(`✅ Successfully updated: ${updatedCount} items`);
  console.log(`⏭️  Skipped (no poster found): ${skippedCount} items`);
  console.log(`❌ Errors: ${errors.length} items`);
  
  if (errors.length > 0) {
    console.log('\nErrors encountered:');
    errors.forEach(error => {
      console.log(`  - ${error.title}: ${error.error}`);
    });
  }
  
  return {
    updated: updatedCount,
    skipped: skippedCount,
    errors: errors.length,
    details: errors
  };
}

// Run the script if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  updateContentWithTMDBPosters()
    .then(result => {
      console.log('\n📊 Final Results:', result);
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Script failed:', error);
      process.exit(1);
    });
}