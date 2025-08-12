import { TMDBService } from './tmdbService';
import { MusicArtworkService } from './musicArtworkService';
import { storage } from './storage';
import { youtubeTVMappings, nonPosterShows } from './youtubeTVMappings';
import type { Content } from '../shared/schema';

export class ImageAssignmentService {
  private tmdbService: TMDBService;
  private musicArtworkService: MusicArtworkService;

  constructor() {
    this.tmdbService = new TMDBService();
    this.musicArtworkService = new MusicArtworkService();
  }

  /**
   * Auto-assign TMDB poster artwork to TV shows from specific streaming services
   */
  async updateShowPostersForServices(services: string[]): Promise<void> {
    try {
      console.log(`📺 Starting TMDB poster update for TV shows: ${services.join(', ')}`);
      
      // Get all shows from the specified services
      const allContent = await storage.getAllContent();
      const showsFromServices = allContent.filter((content: Content) => 
        content.type === 'show' && 
        services.includes(content.service || '') &&
        !['spotify', 'apple-music'].includes(content.service || '')
      );

      console.log(`📋 Found ${showsFromServices.length} shows to update`);

      // Update each show with TMDB poster artwork
      for (const show of showsFromServices) {
        try {
          // Skip shows that definitely don't have posters
          if (nonPosterShows.has(show.title || '')) {
            console.log(`⏭️ Skipping "${show.title}" (news/sports/music content)`);
            continue;
          }

          // Use manual mapping for YouTube TV shows if available
          let searchTitle = show.title || '';
          if (show.service === 'youtube-tv' && youtubeTVMappings[searchTitle]) {
            searchTitle = youtubeTVMappings[searchTitle];
            console.log(`🎯 Using mapping: "${show.title}" → "${searchTitle}"`);
          }

          const posterUrl = await this.tmdbService.searchTVShow(
            searchTitle, 
            show.year || undefined
          ).then(result => result?.poster_path ? this.tmdbService.getPosterUrl(result.poster_path) : null);

          if (posterUrl) {
            // Update the show with the new poster URL
            const updatedShow = {
              ...show,
              imageUrl: posterUrl
            };
            await storage.createOrUpdateContent(updatedShow);
            console.log(`✅ Updated "${show.title}" with TMDB poster`);
          } else {
            console.log(`❌ No TMDB poster found for "${show.title}"`);
          }

          // Be respectful to TMDB API
          await new Promise(resolve => setTimeout(resolve, 300));
        } catch (error) {
          console.error(`Error updating poster for "${show.title}":`, error);
        }
      }

      console.log(`🎉 Completed TMDB poster update for TV shows: ${services.join(', ')}`);
    } catch (error) {
      console.error('Error in updateShowPostersForServices:', error);
      throw error;
    }
  }

  /**
   * Auto-assign TMDB poster artwork to movies from specific streaming services
   */
  async updateMoviePostersForServices(services: string[]): Promise<void> {
    try {
      console.log(`🎬 Starting TMDB poster update for services: ${services.join(', ')}`);
      
      // Get all movies from the specified services
      const allContent = await storage.getAllContent();
      const moviesFromServices = allContent.filter((content: Content) => 
        content.type === 'movie' && 
        services.includes(content.service || '')
      );

      console.log(`📋 Found ${moviesFromServices.length} movies to update`);

      // Update each movie with TMDB poster artwork
      for (const movie of moviesFromServices) {
        try {
          const posterUrl = await this.tmdbService.getMoviePosterUrl(
            movie.title || '', 
            movie.year || undefined
          );

          if (posterUrl) {
            // Update the movie with the new poster URL
            const updatedMovie = {
              ...movie,
              imageUrl: posterUrl
            };
            await storage.createOrUpdateContent(updatedMovie);
            console.log(`✅ Updated "${movie.title}" with TMDB poster`);
          } else {
            console.log(`❌ No TMDB poster found for "${movie.title}"`);
          }

          // Be respectful to TMDB API
          await new Promise(resolve => setTimeout(resolve, 300));
        } catch (error) {
          console.error(`Error updating poster for "${movie.title}":`, error);
        }
      }

      console.log(`🎉 Completed TMDB poster update for ${services.join(', ')}`);
    } catch (error) {
      console.error('Error in updateMoviePostersForServices:', error);
      throw error;
    }
  }

  /**
   * Update specific movies by title with TMDB artwork
   */
  async updateSpecificMovies(movieTitles: string[]): Promise<void> {
    try {
      console.log(`🎬 Starting TMDB poster update for specific movies`);
      
      const allContent = await storage.getAllContent();
      
      for (const title of movieTitles) {
        const movie = allContent.find((content: Content) => 
          content.type === 'movie' && 
          content.title === title
        );

        if (movie) {
          const posterUrl = await this.tmdbService.getMoviePosterUrl(
            movie.title || '', 
            movie.year || undefined
          );

          if (posterUrl) {
            const updatedMovie = {
              ...movie,
              imageUrl: posterUrl
            };
            await storage.createOrUpdateContent(updatedMovie);
            console.log(`✅ Updated "${movie.title}" with TMDB poster`);
          } else {
            console.log(`❌ No TMDB poster found for "${movie.title}"`);
          }

          await new Promise(resolve => setTimeout(resolve, 300));
        } else {
          console.log(`❌ Movie "${title}" not found in database`);
        }
      }

      console.log(`🎉 Completed TMDB poster update for specific movies`);
    } catch (error) {
      console.error('Error in updateSpecificMovies:', error);
      throw error;
    }
  }

  /**
   * Auto-assign music artwork to Apple Music and Spotify content
   */
  async updateMusicArtwork(services: string[] = ['apple-music', 'spotify']): Promise<void> {
    try {
      console.log(`🎵 Starting music artwork update for services: ${services.join(', ')}`);
      
      // Get all music content from the specified services
      const allContent = await storage.getAllContent();
      const musicContent = allContent.filter((content: Content) => 
        content.type === 'music' && 
        services.includes(content.service || '') &&
        !content.imageUrl // Only update items without artwork
      );

      console.log(`📋 Found ${musicContent.length} music items to update`);

      // Update each music item with artwork
      for (const musicItem of musicContent) {
        try {
          const artist = musicItem.artist || '';
          const track = musicItem.title || '';
          const album = musicItem.album || '';

          if (!artist) {
            console.log(`⏭️ Skipping "${track}" (no artist information)`);
            continue;
          }

          let artworkUrl: string | null = null;

          // Get artwork based on service
          if (musicItem.service === 'spotify') {
            artworkUrl = await this.musicArtworkService.getSpotifyArtwork(artist, track, album);
          } else if (musicItem.service === 'apple-music') {
            artworkUrl = await this.musicArtworkService.getAppleMusicArtwork(artist, track, album);
          } else {
            // For other services, try general search
            const result = await this.musicArtworkService.searchMusicArtwork(artist, track, album);
            artworkUrl = result?.albumCover || result?.artistImage || null;
          }

          if (artworkUrl) {
            // Update the music item with the new artwork URL
            const updatedItem = {
              ...musicItem,
              imageUrl: artworkUrl
            };
            await storage.createOrUpdateContent(updatedItem);
            console.log(`✅ Updated "${track}" by ${artist} with artwork`);
          } else {
            console.log(`❌ No artwork found for "${track}" by ${artist}`);
          }

          // Be respectful to API rate limits
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
          console.error(`Error updating artwork for "${musicItem.title}":`, error);
        }
      }

      console.log(`🎉 Completed music artwork update for services: ${services.join(', ')}`);
    } catch (error) {
      console.error('Error in updateMusicArtwork:', error);
      throw error;
    }
  }

  /**
   * Update all content with appropriate artwork
   */
  async updateAllArtwork(): Promise<void> {
    try {
      console.log('🎨 Starting comprehensive artwork update...');
      
      // Update TV show posters from TMDB
      await this.updateShowPostersForServices(['youtube-tv', 'netflix', 'hulu', 'disney-plus', 'max', 'amazon-prime', 'apple-tv', 'paramount-plus']);
      
      // Update movie posters from TMDB
      await this.updateMoviePostersForServices(['netflix', 'hulu', 'disney-plus', 'max', 'amazon-prime', 'apple-tv', 'paramount-plus']);
      
      // Update music artwork from music APIs
      await this.updateMusicArtwork(['apple-music', 'spotify']);
      
      console.log('🎉 Completed comprehensive artwork update');
    } catch (error) {
      console.error('Error in updateAllArtwork:', error);
      throw error;
    }
  }
}