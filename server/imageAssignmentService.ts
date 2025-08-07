import { TMDBService } from './tmdbService';
import { storage } from './storage';
import type { Content } from '../shared/schema';

export class ImageAssignmentService {
  private tmdbService: TMDBService;

  constructor() {
    this.tmdbService = new TMDBService();
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
          const posterUrl = await this.tmdbService.searchTVShow(
            show.title || '', 
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
}