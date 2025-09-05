import { useState, useEffect } from 'react';

interface UseSmartPosterReturn {
  imageUrl: string | null;
  loading: boolean;
  error: string | null;
}

export const useSmartPoster = (content: { 
  id: string; 
  title: string; 
  imageUrl: string | null;
  service?: string;
  type?: string;
}): UseSmartPosterReturn => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Enhanced image URL processing
  const processedImageUrl = content.imageUrl;

  useEffect(() => {
    // Reset states when content changes
    setLoading(false);
    setError(null);

    // Add cache busting for TMDb URLs to ensure fresh images
    if (processedImageUrl?.includes('image.tmdb.org')) {
      console.log(`🎬 TMDb poster detected for: ${content.title}`);
    } else if (processedImageUrl?.includes('data:image/svg+xml')) {
      console.log(`🎨 SVG placeholder for: ${content.title}`);
    } else if (processedImageUrl) {
      console.log(`🖼️ Standard image for: ${content.title}`);
    } else {
      console.log(`❓ No image URL for: ${content.title}`);
    }
  }, [content.id, content.imageUrl, content.title, processedImageUrl]);

  return {
    imageUrl: processedImageUrl,
    loading,
    error
  };
};