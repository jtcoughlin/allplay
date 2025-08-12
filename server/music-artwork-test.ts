/**
 * Test script for music artwork functionality
 */
import { MusicArtworkService } from './musicArtworkService';

async function testMusicArtwork() {
  const musicService = new MusicArtworkService();
  
  console.log('🎵 Testing Music Artwork Service...\n');
  
  // Test cases for different artists and tracks
  const testCases = [
    { artist: 'Taylor Swift', track: 'Anti-Hero', album: 'Midnights' },
    { artist: 'Ed Sheeran', track: 'Shape of You' },
    { artist: 'Billie Eilish', track: 'Bad Guy' },
    { artist: 'The Weeknd', track: 'Blinding Lights' },
    { artist: 'Ariana Grande', track: 'positions' }
  ];
  
  for (const testCase of testCases) {
    console.log(`Testing: ${testCase.artist} - ${testCase.track}`);
    
    try {
      const result = await musicService.searchMusicArtwork(
        testCase.artist, 
        testCase.track, 
        testCase.album
      );
      
      if (result) {
        console.log(`✅ Found artwork:`);
        if (result.albumCover) console.log(`   Album: ${result.albumCover}`);
        if (result.artistImage) console.log(`   Artist: ${result.artistImage}`);
      } else {
        console.log(`❌ No artwork found`);
      }
    } catch (error) {
      console.error(`Error: ${error}`);
    }
    
    console.log(''); // Empty line for spacing
    
    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testMusicArtwork().catch(console.error);
}