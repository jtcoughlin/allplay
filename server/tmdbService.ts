import fetch from 'node-fetch';

export interface TMDBMovieResult {
  id: number;
  title: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  overview: string;
  vote_average: number;
  genre_ids: number[];
}

export interface TMDBSearchResponse {
  page: number;
  results: TMDBMovieResult[];
  total_pages: number;
  total_results: number;
}

export class TMDBService {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.themoviedb.org/3';
  private readonly imageBaseUrl = 'https://image.tmdb.org/t/p/w500';

  constructor() {
    this.apiKey = process.env.TMDB_API_KEY || '';
    if (!this.apiKey) {
      throw new Error('TMDB_API_KEY environment variable is required');
    }
  }

  /**
   * Search for a TV show by title and optionally year
   */
  async searchTVShow(title: string, year?: number): Promise<TMDBMovieResult | null> {
    try {
      // Clean the title for better matching
      let cleanTitle = title
        .replace(/^The\s+/i, '') // Remove "The" prefix for better matching
        .replace(/[:\-–—]/g, ' ') // Replace colons and dashes with spaces
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim();

      // Try exact title first
      let result = await this.searchTVShowByTitle(title, year);
      
      // If no result, try cleaned title
      if (!result && cleanTitle !== title) {
        result = await this.searchTVShowByTitle(cleanTitle, year);
      }
      
      // For shows with common patterns, try specific variations
      if (!result) {
        if (title.includes('American Dad')) {
          result = await this.searchTVShowByTitle('American Dad!', year);
        } else if (title.includes('Big Bang Theory')) {
          result = await this.searchTVShowByTitle('The Big Bang Theory', year);
        } else if (title.includes('South Park')) {
          result = await this.searchTVShowByTitle('South Park', year);
        } else if (title.includes('Family Guy')) {
          result = await this.searchTVShowByTitle('Family Guy', year);
        } else if (title.includes('Better Call Saul')) {
          result = await this.searchTVShowByTitle('Better Call Saul', year);
        } else if (title.includes('American Horror Story')) {
          result = await this.searchTVShowByTitle('American Horror Story', year);
        } else if (title.includes('Atlanta')) {
          result = await this.searchTVShowByTitle('Atlanta', year);
        }
      }

      return result;
    } catch (error) {
      console.error('Error searching TMDB TV:', error);
      return null;
    }
  }

  private async searchTVShowByTitle(title: string, year?: number): Promise<TMDBMovieResult | null> {
    try {
      const searchTitle = encodeURIComponent(title);
      let url = `${this.baseUrl}/search/tv?api_key=${this.apiKey}&query=${searchTitle}`;
      
      if (year) {
        url += `&first_air_date_year=${year}`;
      }

      const response = await fetch(url);
      if (!response.ok) {
        console.error(`TMDB API error: ${response.status} ${response.statusText}`);
        return null;
      }

      const data = await response.json() as TMDBSearchResponse;
      
      if (data.results && data.results.length > 0) {
        // Return the first (most relevant) result
        return data.results[0];
      }

      return null;
    } catch (error) {
      console.error('Error in searchTVShowByTitle:', error);
      return null;
    }
  }

  /**
   * Search for a movie by title and optionally year
   */
  async searchMovie(title: string, year?: number): Promise<TMDBMovieResult | null> {
    try {
      const searchTitle = encodeURIComponent(title);
      let url = `${this.baseUrl}/search/movie?api_key=${this.apiKey}&query=${searchTitle}`;
      
      if (year) {
        url += `&year=${year}`;
      }

      const response = await fetch(url);
      if (!response.ok) {
        console.error(`TMDB API error: ${response.status} ${response.statusText}`);
        return null;
      }

      const data = await response.json() as TMDBSearchResponse;
      
      if (data.results && data.results.length > 0) {
        // Return the first (most relevant) result
        return data.results[0];
      }

      return null;
    } catch (error) {
      console.error('Error searching TMDB:', error);
      return null;
    }
  }

  /**
   * Get full poster URL from poster_path
   */
  getPosterUrl(posterPath: string | null): string | null {
    if (!posterPath) return null;
    return `${this.imageBaseUrl}${posterPath}`;
  }

  /**
   * Get full backdrop URL from backdrop_path
   */
  getBackdropUrl(backdropPath: string | null): string | null {
    if (!backdropPath) return null;
    return `${this.imageBaseUrl}${backdropPath}`;
  }

  /**
   * Auto-assign poster image for a movie title
   */
  async getMoviePosterUrl(title: string, year?: number): Promise<string | null> {
    const movie = await this.searchMovie(title, year);
    if (movie && movie.poster_path) {
      return this.getPosterUrl(movie.poster_path);
    }
    return null;
  }

  /**
   * Batch update movies with TMDB poster artwork
   */
  async batchUpdateMoviePosters(movies: Array<{title: string, year?: number}>): Promise<Array<{title: string, posterUrl: string | null}>> {
    const results = [];
    
    for (const movie of movies) {
      const posterUrl = await this.getMoviePosterUrl(movie.title, movie.year);
      results.push({
        title: movie.title,
        posterUrl
      });
      
      // Add small delay to be respectful to TMDB API
      await new Promise(resolve => setTimeout(resolve, 250));
    }
    
    return results;
  }
}