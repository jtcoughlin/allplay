import { useState } from "react";
import { Heart, Play, Music, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { Content, WatchHistory } from "@shared/schema";

interface ContentCardProps {
  content: Content;
  watchHistory?: WatchHistory;
  isFavorite?: boolean;
  size?: 'small' | 'medium' | 'large';
  showProgress?: boolean;
}

export function ContentCard({ 
  content, 
  watchHistory, 
  isFavorite = false, 
  size = 'medium',
  showProgress = false 
}: ContentCardProps) {
  const [imageError, setImageError] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const sizeClasses = {
    small: 'w-36',
    medium: 'w-44',
    large: 'w-52'
  };

  const imageSizeClasses = {
    small: 'h-48',
    medium: 'h-24',
    large: 'h-28'
  };

  const toggleFavoriteMutation = useMutation({
    mutationFn: async () => {
      if (isFavorite) {
        await apiRequest("DELETE", `/api/favorites/${content.id}`);
      } else {
        await apiRequest("POST", "/api/favorites", { contentId: content.id });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/favorites"] });
      toast({
        title: isFavorite ? "Removed from favorites" : "Added to favorites",
        description: content.title,
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to update favorites",
        variant: "destructive",
      });
    },
  });

  const playContent = useMutation({
    mutationFn: async (contentId: string) => {
      // For deep link services, use the external play endpoint
      if (['netflix', 'disney-plus', 'hulu', 'amazon-prime', 'hbo-max', 'apple-tv', 'paramount', 'peacock'].includes(content.service || '')) {
        const response = await apiRequest("POST", `/api/play-external/${contentId}`, {
          service: content.service,
          title: content.title
        });
        return response.json();
      } else {
        // For other services, use the regular play endpoint
        const response = await apiRequest("POST", `/api/play/${contentId}`);
        return response.json();
      }
    },
    onSuccess: (data) => {
      if (data.appUrl && data.webUrl) {
        // Try to open the app using window.location.href for better Safari compatibility
        try {
          window.location.href = data.appUrl;
        } catch (error) {
          console.log('App URL failed, opening web URL:', error);
          window.open(data.webUrl, '_blank');
        }
        
        // Fallback to web after a delay if app doesn't open
        setTimeout(() => {
          if (confirm(`If ${content.service} app didn't open, click OK to open in browser.`)) {
            window.open(data.webUrl, '_blank');
          }
        }, 3000);
        
        toast({
          title: `Opening in ${content.service}`,
          description: data.message || `Content will open in ${content.service} app`,
        });
      } else {
        toast({
          title: "Now Playing",
          description: data.message || "Content is now playing in Allplay interface",
        });
      }
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Playback Error",
        description: "Failed to start playback. Please try again.",
        variant: "destructive",
      });
    },
  });

  const getPlatformColor = (platform: string | null | undefined) => {
    if (!platform) return 'bg-gray-600';
    const colors: { [key: string]: string } = {
      netflix: 'bg-red-600',
      'disney-plus': 'bg-blue-600',
      hulu: 'bg-green-600',
      max: 'bg-purple-600',
      'amazon-prime': 'bg-orange-600',
      'apple-tv': 'bg-gray-800',
      'apple-music': 'bg-gray-800',
      spotify: 'bg-green-500',
      youtube: 'bg-red-600',
      'youtube-tv': 'bg-red-600',
      'paramount-plus': 'bg-blue-800'
    };
    return colors[platform.toLowerCase()] || 'bg-gray-600';
  };

  const getProgressPercentage = () => {
    if (!watchHistory || !content.duration || !watchHistory.progress) return 0;
    return Math.min((watchHistory.progress / content.duration) * 100, 100);
  };

  return (
    <div 
      className={`flex-shrink-0 ${sizeClasses[size]} card-hover cursor-pointer`}
      data-testid={`card-content-${content.id}`}
    >
      <div className="relative mb-2">
        {!imageError && content.imageUrl ? (
          <img 
            src={content.imageUrl}
            alt={content.title}
            className={`w-full ${imageSizeClasses[size]} object-cover rounded-lg`}
            onError={() => setImageError(true)}
            data-testid={`img-content-${content.id}`}
          />
        ) : (
          <div 
            className={`w-full ${imageSizeClasses[size]} bg-navy-lighter rounded-lg flex items-center justify-center`}
            data-testid={`placeholder-content-${content.id}`}
          >
            {content.type === 'music' ? (
              <Music className="w-8 h-8 text-gray-400" />
            ) : (
              <Play className="w-8 h-8 text-gray-400" />
            )}
          </div>
        )}

        {/* Progress bar for continue watching */}
        {showProgress && watchHistory && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent rounded-b-lg p-2">
            <div className="flex items-center space-x-2">
              {content.type === 'music' ? (
                <Music className="w-3 h-3 text-white" />
              ) : (
                <Play className="w-3 h-3 text-white" />
              )}
              <div className="flex-1 bg-gray-600 rounded-full h-1">
                <div 
                  className="bg-blue-primary h-1 rounded-full transition-all duration-300"
                  style={{ width: `${getProgressPercentage()}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Service badge */}
        {content.service && (
          <Badge 
            className={`absolute top-2 right-2 ${getPlatformColor(content.service)} text-white text-xs font-bold px-2 py-1`}
            data-testid={`badge-service-${content.id}`}
          >
            {content.service.toUpperCase()}
          </Badge>
        )}

        {/* Rating */}
        {content.rating && (
          <Badge 
            className="absolute top-2 left-2 bg-gray-800 text-white text-xs font-bold px-2 py-1"
            data-testid={`badge-rating-${content.id}`}
          >
            <Star className="w-3 h-3 text-yellow-400 mr-1 fill-current" />
            {content.rating}
          </Badge>
        )}

        {/* Live indicator */}
        {content.isLive && (
          <Badge 
            className="absolute top-2 left-2 bg-red-600 text-white text-xs font-bold px-2 py-1 animate-pulse"
            data-testid={`badge-live-${content.id}`}
          >
            <div className="w-2 h-2 bg-red-400 rounded-full mr-1 animate-pulse" />
            LIVE
          </Badge>
        )}

        {/* Favorite button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            toggleFavoriteMutation.mutate();
          }}
          className="absolute bottom-2 right-2 w-8 h-8 bg-black/50 hover:bg-black/70 rounded-full p-0"
          disabled={toggleFavoriteMutation.isPending}
          data-testid={`button-favorite-${content.id}`}
        >
          <Heart 
            className={`w-4 h-4 ${isFavorite ? 'text-red-400 fill-current' : 'text-white'}`} 
          />
        </Button>
      </div>

      <div className="space-y-1">
        <h3 
          className="text-sm font-medium text-cream truncate" 
          title={content.title}
          data-testid={`text-title-${content.id}`}
        >
          {content.title}
        </h3>
        
        <p 
          className="text-xs text-gray-400 truncate"
          data-testid={`text-info-${content.id}`}
        >
          {content.type === 'music' && content.artist 
            ? content.artist
            : `${content.genre} • ${content.year || 'N/A'}`
          }
        </p>

        {showProgress && watchHistory && (
          <p 
            className="text-xs text-gray-400"
            data-testid={`text-progress-${content.id}`}
          >
            {content.type === 'music' 
              ? `Track ${watchHistory.progress} of ${content.duration}`
              : `${Math.round(getProgressPercentage())}% watched`
            }
          </p>
        )}
        
        {/* Play button */}
        <Button
          onClick={(e) => {
            e.stopPropagation();
            playContent.mutate(content.id);
          }}
          className="w-full bg-blue-primary hover:bg-blue-600 text-white font-semibold mt-2"
          disabled={playContent.isPending}
          data-testid={`button-play-${content.id}`}
        >
          <Play className="w-4 h-4 mr-2" />
          {playContent.isPending ? 'Opening...' : 
           ['netflix', 'disney-plus', 'hulu', 'amazon-prime', 'hbo-max', 'apple-tv', 'paramount', 'peacock'].includes(content.service || '') 
             ? `Open in ${content.service}`
             : 'Play'
          }
        </Button>
      </div>
    </div>
  );
}
