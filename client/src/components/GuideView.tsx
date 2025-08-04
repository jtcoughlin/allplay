import { useState } from "react";
import { Play, Heart, Info, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Content } from "@shared/schema";

interface GuideViewProps {
  content: Content[];
  favorites: string[];
  onToggleFavorite?: (contentId: string) => void;
  onPlay?: (content: Content) => void;
}

export function GuideView({ content, favorites, onToggleFavorite, onPlay }: GuideViewProps) {
  const [selectedContent, setSelectedContent] = useState<Content | null>(content[0] || null);

  const getPlatformColor = (platform: string | null | undefined) => {
    if (!platform) return 'bg-blue-primary';
    switch (platform.toLowerCase()) {
      case 'netflix': return 'bg-red-600';
      case 'disney-plus': return 'bg-blue-600';
      case 'hulu': return 'bg-green-600';
      case 'max': return 'bg-purple-600';
      case 'amazon-prime': return 'bg-orange-600';
      case 'apple-tv': return 'bg-gray-800';
      case 'apple-music': return 'bg-gray-800';
      case 'spotify': return 'bg-green-500';
      case 'youtube': return 'bg-red-600';
      case 'youtube-tv': return 'bg-red-600';
      case 'paramount-plus': return 'bg-blue-800';
      default: return 'bg-blue-primary';
    }
  };

  return (
    <div className="flex gap-4 h-screen pt-4 pb-4 overflow-hidden" data-testid="guide-view">
      {/* Left Side - Content List */}
      <div className="w-2/5 flex flex-col overflow-hidden">
        <div className="bg-gray-900/50 rounded-lg p-4 flex-1 flex flex-col overflow-hidden">
          <h2 className="text-xl font-semibold text-cream mb-4">Browse Content</h2>
          <div className="space-y-2 flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
            {content.map((item) => (
              <div
                key={item.id}
                className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                  selectedContent?.id === item.id 
                    ? 'bg-blue-primary/20 border border-blue-primary/30' 
                    : 'bg-gray-800/30 hover:bg-gray-800/50'
                }`}
                onClick={() => setSelectedContent(item)}
                data-testid={`guide-item-${item.id}`}
              >
                {/* Thumbnail */}
                <div className="w-16 h-12 rounded overflow-hidden flex-shrink-0">
                  <img
                    src={item.imageUrl || ''}
                    alt={item.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                
                {/* Content Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-cream truncate">{item.title}</h3>
                    <div className="flex items-center gap-1">
                      {item.rating && (
                        <div className="flex items-center gap-1 text-yellow-400">
                          <Star className="w-3 h-3 fill-current" />
                          <span className="text-xs">{item.rating}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 mt-1">
                    {item.service && (
                      <Badge 
                        className={`${getPlatformColor(item.service)} text-white text-xs`}
                      >
                        {item.service.toUpperCase()}
                      </Badge>
                    )}
                    {item.year && (
                      <span className="text-xs text-gray-400">{item.year}</span>
                    )}
                    {item.duration && (
                      <span className="text-xs text-gray-400">
                        {item.type === 'music' ? `${item.duration}m` : `${item.duration}min`}
                      </span>
                    )}
                  </div>
                </div>
                
                {/* Live Indicator */}
                {item.isLive && (
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Side - Preview */}
      <div className="w-3/5 flex flex-col overflow-hidden">
        {selectedContent ? (
          <div className="bg-gray-900/50 rounded-lg overflow-hidden flex-1 flex flex-col">
            {/* Preview Image */}
            <div className="relative h-80">
              <img
                src={selectedContent.imageUrl || ''}
                alt={selectedContent.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
              
              {/* Play Button Overlay */}
              <div className="absolute inset-0 flex items-center justify-center">
                <Button
                  size="lg"
                  className="bg-blue-primary hover:bg-blue-600 text-white rounded-full p-4"
                  onClick={() => onPlay?.(selectedContent)}
                  data-testid="button-play-preview"
                >
                  <Play className="w-6 h-6" />
                </Button>
              </div>
            </div>
            
            {/* Content Details */}
            <div className="p-6 flex-1 overflow-y-auto">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-cream mb-2">
                    {selectedContent.title}
                  </h2>
                  
                  <div className="flex items-center gap-3 mb-3">
                    {selectedContent.service && (
                      <Badge 
                        className={`${getPlatformColor(selectedContent.service)} text-white`}
                      >
                        {selectedContent.service.toUpperCase()}
                      </Badge>
                    )}
                    
                    {selectedContent.rating && (
                      <div className="flex items-center gap-1 text-yellow-400">
                        <Star className="w-4 h-4 fill-current" />
                        <span className="font-medium">{selectedContent.rating}</span>
                      </div>
                    )}
                    
                    {selectedContent.year && (
                      <span className="text-gray-400">{selectedContent.year}</span>
                    )}
                    
                    {selectedContent.isLive && (
                      <Badge variant="destructive" className="bg-red-600 text-white animate-pulse">
                        LIVE
                      </Badge>
                    )}
                  </div>
                </div>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onToggleFavorite?.(selectedContent.id)}
                  data-testid={`button-favorite-${selectedContent.id}`}
                >
                  <Heart
                    className={`w-5 h-5 ${
                      favorites.includes(selectedContent.id)
                        ? 'fill-red-500 text-red-500'
                        : 'text-gray-400 hover:text-red-500'
                    }`}
                  />
                </Button>
              </div>
              
              {/* Description */}
              <p className="text-gray-300 leading-relaxed mb-4">
                {selectedContent.description}
              </p>
              
              {/* Music-specific info */}
              {selectedContent.type === 'music' && (
                <div className="text-sm text-gray-400 mb-4">
                  <p><strong>Artist:</strong> {selectedContent.artist}</p>
                  {selectedContent.album && (
                    <p><strong>Album:</strong> {selectedContent.album}</p>
                  )}
                </div>
              )}
              
              {/* Action Buttons */}
              <div className="flex items-center gap-3">
                <Button
                  className="bg-blue-primary hover:bg-blue-600 text-white"
                  onClick={() => onPlay?.(selectedContent)}
                  data-testid="button-play-selected"
                >
                  <Play className="w-4 h-4 mr-2" />
                  {selectedContent.type === 'music' ? 'Play Song' : 'Watch Now'}
                </Button>
                
                <Button
                  variant="outline"
                  className="border-gray-600 text-gray-300 hover:bg-gray-800"
                  data-testid="button-info-selected"
                >
                  <Info className="w-4 h-4 mr-2" />
                  More Info
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-gray-900/50 rounded-lg p-8 text-center">
            <p className="text-gray-400 text-lg">Select content to preview</p>
          </div>
        )}
      </div>
    </div>
  );
}