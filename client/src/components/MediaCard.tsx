import { useState } from 'react';
import { Play, Heart, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useTMDbPoster } from '@/hooks/useTMDbPoster';

interface MediaCardProps {
  movieId: string | number;
  title: string;
  genre?: string;
  year?: number;
  rating?: number;
  service?: string;
  size?: 'small' | 'medium' | 'large';
  onPlay?: () => void;
  onToggleFavorite?: () => void;
  isFavorite?: boolean;
}

export function MediaCard({
  movieId,
  title,
  genre,
  year,
  rating,
  service,
  size = 'medium',
  onPlay,
  onToggleFavorite,
  isFavorite = false
}: MediaCardProps) {
  const { imageUrl, loading, error } = useTMDbPoster(movieId);
  const [imageFailed, setImageFailed] = useState(false);

  const sizeClasses = {
    small: 'w-36',
    medium: 'w-40',
    large: 'w-48'
  };

  const imageSizeClasses = {
    small: 'h-48',
    medium: 'h-60',
    large: 'h-72'
  };

  const getPlatformColor = (platform: string | undefined) => {
    if (!platform) return 'bg-gray-600';
    const colors: { [key: string]: string } = {
      netflix: 'bg-red-600',
      'disney-plus': 'bg-blue-600',
      hulu: 'bg-green-600',
      'hbo-max': 'bg-purple-600',
      'amazon-prime': 'bg-orange-600',
      'apple-tv': 'bg-gray-800',
      'paramount-plus': 'bg-blue-800'
    };
    return colors[platform.toLowerCase()] || 'bg-gray-600';
  };

  const handleImageLoad = () => {
    console.log(`✅ Image loaded successfully for: ${title}`);
    setImageFailed(false);
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    console.error(`❌ Image failed to load for: ${title}`);
    console.error(`   URL: ${imageUrl}`);
    console.error(`   Error:`, e);
    setImageFailed(true);
  };

  const showFallback = loading || error || !imageUrl || imageFailed;

  return (
    <div 
      className={`flex-shrink-0 ${sizeClasses[size]} cursor-pointer mr-4 mb-4 transition-transform hover:scale-105`}
      data-testid={`media-card-${movieId}`}
    >
      <div className="relative mb-2">
        {!showFallback ? (
          <img 
            src={imageUrl}
            alt={title}
            className={`w-full ${imageSizeClasses[size]} object-cover rounded-lg shadow-lg`}
            onLoad={handleImageLoad}
            onError={handleImageError}
            data-testid={`media-img-${movieId}`}
          />
        ) : (
          <div 
            className={`w-full ${imageSizeClasses[size]} bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg flex flex-col items-center justify-center relative overflow-hidden shadow-lg`}
            data-testid={`media-fallback-${movieId}`}
          >
            {/* Fallback content */}
            <div className="text-center p-4">
              {loading ? (
                <>
                  <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                  <div className="text-gray-400 text-sm">Loading poster...</div>
                </>
              ) : error ? (
                <>
                  <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mb-3">
                    <span className="text-red-400 text-2xl">!</span>
                  </div>
                  <div className="text-red-400 text-xs">Failed to load</div>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 bg-gray-600/30 rounded-full flex items-center justify-center mb-3">
                    <span className="text-gray-400 text-3xl">?</span>
                  </div>
                  <div className="text-gray-400 text-xs font-medium">No poster available</div>
                </>
              )}
              
              {service && (
                <div className="text-gray-500 text-xs font-medium uppercase tracking-wider mt-2">
                  {service === 'netflix' ? 'Netflix' :
                   service === 'amazon-prime' ? 'Prime Video' :
                   service === 'disney-plus' ? 'Disney+' :
                   service === 'hbo-max' ? 'HBO Max' :
                   service === 'hulu' ? 'Hulu' :
                   service === 'apple-tv' ? 'Apple TV+' :
                   service === 'paramount-plus' ? 'Paramount+' :
                   service}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Favorite button */}
        {onToggleFavorite && (
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite();
            }}
            className="absolute top-2 right-2 w-8 h-8 bg-black/60 hover:bg-black/80 rounded-full p-0"
            data-testid={`media-favorite-${movieId}`}
          >
            <Heart 
              className={`w-4 h-4 ${isFavorite ? 'text-red-400 fill-current' : 'text-white'}`} 
            />
          </Button>
        )}
      </div>

      <div className="space-y-2 px-1">
        <h3 
          className="text-sm font-semibold text-white truncate leading-tight" 
          title={title}
          data-testid={`media-title-${movieId}`}
        >
          {title}
        </h3>
        
        <div className="flex flex-wrap items-center gap-1 text-xs text-gray-400">
          {genre && year && (
            <span data-testid={`media-info-${movieId}`}>
              {genre} • {year}
            </span>
          )}
          
          {service && (
            <>
              {genre && year && <span>•</span>}
              <Badge 
                className={`${getPlatformColor(service)} text-white text-xs font-bold px-1.5 py-0.5`}
                data-testid={`media-service-${movieId}`}
              >
                {service.toUpperCase()}
              </Badge>
            </>
          )}
          
          {rating && (
            <>
              <span>•</span>
              <Badge 
                className="bg-yellow-600 text-white text-xs font-bold px-1.5 py-0.5 flex items-center gap-1"
                data-testid={`media-rating-${movieId}`}
              >
                <Star className="w-2.5 h-2.5 text-yellow-200 fill-current" />
                {rating}
              </Badge>
            </>
          )}
        </div>
        
        {onPlay && (
          <Button
            onClick={(e) => {
              e.stopPropagation();
              onPlay();
            }}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold mt-2 px-2 py-1.5"
            data-testid={`media-play-${movieId}`}
          >
            <Play className="w-3 h-3 mr-1.5" />
            <span className="text-xs">Play</span>
          </Button>
        )}
      </div>
    </div>
  );
}