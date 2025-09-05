import { useState, useEffect } from 'react';

interface TMDbMovieResponse {
  id: number;
  title: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  overview: string;
}

interface UseTMDbPosterReturn {
  imageUrl: string | null;
  loading: boolean;
  error: string | null;
}

export const useTMDbPoster = (movieId: string | number | null): UseTMDbPosterReturn => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!movieId) {
      setImageUrl(null);
      setLoading(false);
      setError(null);
      return;
    }

    const fetchPoster = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Get TMDb API key from backend endpoint
        const configResponse = await fetch('/api/tmdb-config');
        if (!configResponse.ok) {
          throw new Error('Failed to get TMDb configuration');
        }
        
        const config = await configResponse.json();
        const API_KEY = config.apiKey;
        
        if (!API_KEY) {
          console.error('❌ TMDB_API_KEY not found in configuration');
          throw new Error('TMDb API key not configured');
        }

        const response = await fetch(
          `https://api.themoviedb.org/3/movie/${movieId}?api_key=${API_KEY}`
        );

        if (!response.ok) {
          throw new Error(`TMDb API error: ${response.status} ${response.statusText}`);
        }

        const data: TMDbMovieResponse = await response.json();
        
        if (data.poster_path) {
          // Construct the full image URL with cache busting
          const fullImageUrl = `https://image.tmdb.org/t/p/w500${data.poster_path}?v=${Date.now()}`;
          setImageUrl(fullImageUrl);
          console.log(`✅ TMDb poster loaded successfully for movie ID ${movieId}: ${fullImageUrl}`);
        } else {
          console.warn(`⚠️ No poster available for movie ID ${movieId}`);
          setImageUrl(null);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
        console.error(`❌ Error fetching TMDb poster for movie ID ${movieId}:`, errorMessage);
        setError(errorMessage);
        setImageUrl(null);
      } finally {
        setLoading(false);
      }
    };

    fetchPoster();
  }, [movieId]); // Only re-fetch when movieId changes

  return { imageUrl, loading, error };
};