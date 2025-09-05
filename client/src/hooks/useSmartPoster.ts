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

    // COMPREHENSIVE SMART POSTER AUDIT LOGGING
    console.log(`
🎯 SMARTPOSTER AUDIT: ${content.title}
   📍 Content ID: ${content.id}
   📍 Service: ${content.service || 'unknown'}
   📍 Type: ${content.type || 'unknown'}
   🖼️ Raw imageUrl: ${content.imageUrl || 'NULL'}
   🔄 Processed URL: ${processedImageUrl || 'NULL'}
   📊 URL Classification: ${
     processedImageUrl?.includes('image.tmdb.org') ? '🎬 TMDB POSTER' :
     processedImageUrl?.includes('data:image/svg+xml') ? '🎨 SVG PLACEHOLDER' :
     processedImageUrl ? '🖼️ OTHER IMAGE' : '❓ NO IMAGE'
   }
   ⚙️ Loading: ${loading}
   ❌ Error: ${error || 'none'}
    `);
  }, [content.id, content.imageUrl, content.title, processedImageUrl, content.service, content.type, loading, error]);

  return {
    imageUrl: processedImageUrl,
    loading,
    error
  };
};