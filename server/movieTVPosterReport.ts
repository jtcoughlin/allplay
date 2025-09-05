import { storage } from './storage';

async function generateMovieTVReport() {
  console.log('🎬 Movies & TV Series Poster Analysis\n');
  
  const allContent = await storage.getAllContent();
  
  // Filter for actual movies and TV series (not live TV, music, etc.)
  const moviesTVSeries = allContent.filter(item => 
    (item.type === 'movie' || item.type === 'show') && 
    !item.service?.includes('youtube-tv') && 
    !item.service?.includes('spotify') && 
    !item.service?.includes('apple-music') &&
    !item.isLive
  );
  
  let validTMDb = 0;
  let brokenTMDb = 0; 
  let missingPosters = 0;
  let otherPosters = 0;
  
  const missingList: string[] = [];
  
  for (const item of moviesTVSeries) {
    if (item.imageUrl?.includes('image.tmdb.org')) {
      validTMDb++;
    } else if (!item.imageUrl || item.imageUrl.includes('data:image/svg+xml')) {
      missingPosters++;
      missingList.push(`${item.title} (${item.service})`);
    } else {
      otherPosters++;
    }
  }
  
  console.log('📊 Summary:');
  console.log(`Total movies/TV series: ${moviesTVSeries.length}`);
  console.log(`✅ TMDb posters: ${validTMDb}`);
  console.log(`🚫 Missing posters: ${missingPosters}`);
  console.log(`📦 Other posters: ${otherPosters}`);
  console.log(`📈 TMDb coverage: ${((validTMDb / moviesTVSeries.length) * 100).toFixed(1)}%`);
  
  if (missingList.length > 0) {
    console.log('\n🚫 Movies/TV series missing posters:');
    missingList.slice(0, 20).forEach(item => console.log(`   - ${item}`));
    if (missingList.length > 20) {
      console.log(`   ... and ${missingList.length - 20} more`);
    }
  }
}

generateMovieTVReport().catch(console.error);