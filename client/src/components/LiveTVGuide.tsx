import { useState } from "react";
import { Play, Clock, Star, Tv } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { Content } from "@shared/schema";

interface LiveTVGuideProps {
  content: Content[];
  favorites: string[];
  onToggleFavorite?: (contentId: string) => void;
  onPlay?: (content: Content) => void;
}

export function LiveTVGuide({ content, favorites, onToggleFavorite, onPlay }: LiveTVGuideProps) {
  const [selectedContent, setSelectedContent] = useState<Content | null>(content[0] || null);

  // Filter for Live TV content (YouTube TV, ESPN+, etc.)
  const liveTVContent = content.filter(item => 
    item.service === 'youtube-tv' || item.service === 'espn-plus' || item.isLive
  );

  // Group content by service
  const contentByService = liveTVContent.reduce((acc, item) => {
    const service = item.service || 'other';
    if (!acc[service]) acc[service] = [];
    acc[service].push(item);
    return acc;
  }, {} as Record<string, Content[]>);

  const getServiceIcon = (service: string) => {
    switch (service) {
      case 'youtube-tv':
        return '📺';
      case 'espn-plus':
        return '🏈';
      default:
        return '📡';
    }
  };

  const getServiceName = (service: string) => {
    switch (service) {
      case 'youtube-tv':
        return 'YouTube TV';
      case 'espn-plus':
        return 'ESPN+';
      default:
        return service.toUpperCase();
    }
  };

  const getCurrentTime = () => {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-6" data-testid="live-tv-guide">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Tv className="w-6 h-6 text-blue-primary" />
          <h2 className="text-2xl font-bold text-cream">Live TV Guide</h2>
          <Badge className="bg-red-500 text-white">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse mr-2"></div>
            LIVE
          </Badge>
        </div>
        <div className="flex items-center space-x-2 text-sm text-gray-400">
          <Clock className="w-4 h-4" />
          <span>Current Time: {getCurrentTime()}</span>
        </div>
      </div>

      {/* YouTube TV Style Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {Object.entries(contentByService).map(([service, serviceContent]) => (
          <div key={service} className="space-y-3">
            {/* Service Header */}
            <div className="flex items-center space-x-2 px-2">
              <span className="text-lg">{getServiceIcon(service)}</span>
              <h3 className="text-lg font-semibold text-cream">{getServiceName(service)}</h3>
              <Badge variant="outline" className="text-xs">
                {serviceContent.length} shows
              </Badge>
            </div>

            {/* Service Content */}
            <div className="space-y-2">
              {serviceContent.map((item) => (
                <Card 
                  key={item.id}
                  className={`bg-navy-light border-navy-lighter hover:border-blue-primary transition-all cursor-pointer ${
                    selectedContent?.id === item.id ? 'border-blue-primary bg-navy-lighter' : ''
                  }`}
                  onClick={() => setSelectedContent(item)}
                  data-testid={`live-guide-item-${item.id}`}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center space-x-3">
                      {/* Thumbnail */}
                      <div className="w-16 h-12 rounded overflow-hidden flex-shrink-0 bg-navy-lighter">
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Tv className="w-6 h-6 text-gray-400" />
                          </div>
                        )}
                      </div>

                      {/* Content Info */}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-cream truncate text-sm">
                          {item.title}
                        </h4>
                        <p className="text-xs text-gray-400 truncate mt-1">
                          {item.description?.slice(0, 60)}...
                        </p>
                        
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center space-x-2">
                            {item.genre && (
                              <Badge variant="secondary" className="text-xs">
                                {item.genre}
                              </Badge>
                            )}
                            {item.isLive && (
                              <div className="flex items-center space-x-1">
                                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                                <span className="text-xs text-red-400">LIVE</span>
                              </div>
                            )}
                          </div>
                          
                          {item.rating && (
                            <div className="flex items-center space-x-1">
                              <Star className="w-3 h-3 text-yellow-400 fill-current" />
                              <span className="text-xs text-gray-400">{item.rating}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Play Button */}
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onPlay?.(item);
                        }}
                        className="bg-blue-primary hover:bg-blue-600 text-white"
                        data-testid={`button-play-${item.id}`}
                      >
                        <Play className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Selected Content Preview */}
      {selectedContent && (
        <Card className="bg-navy-light border-navy-lighter">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Preview Image */}
              <div className="md:col-span-1">
                <div className="aspect-video rounded-lg overflow-hidden bg-navy-lighter">
                  {selectedContent.imageUrl ? (
                    <img
                      src={selectedContent.imageUrl}
                      alt={selectedContent.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Tv className="w-12 h-12 text-gray-400" />
                    </div>
                  )}
                </div>
              </div>

              {/* Content Details */}
              <div className="md:col-span-2 space-y-4">
                <div>
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-xl font-bold text-cream">{selectedContent.title}</h3>
                    {selectedContent.isLive && (
                      <Badge className="bg-red-500 text-white">
                        <div className="w-2 h-2 bg-white rounded-full animate-pulse mr-1"></div>
                        LIVE
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-4 text-sm text-gray-400 mb-3">
                    <span>{getServiceName(selectedContent.service || '')}</span>
                    {selectedContent.year && <span>{selectedContent.year}</span>}
                    {selectedContent.rating && (
                      <div className="flex items-center space-x-1">
                        <Star className="w-4 h-4 text-yellow-400 fill-current" />
                        <span>{selectedContent.rating}</span>
                      </div>
                    )}
                    {selectedContent.genre && (
                      <Badge variant="outline">{selectedContent.genre}</Badge>
                    )}
                  </div>
                </div>

                <p className="text-gray-300 text-sm leading-relaxed">
                  {selectedContent.description}
                </p>

                <div className="flex items-center space-x-3">
                  <Button
                    size="lg"
                    onClick={() => onPlay?.(selectedContent)}
                    className="bg-blue-primary hover:bg-blue-600 text-white"
                    data-testid="button-play-selected"
                  >
                    <Play className="w-5 h-5 mr-2" />
                    {selectedContent.isLive ? 'Watch Live' : 'Play'}
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={() => onToggleFavorite?.(selectedContent.id)}
                    className="border-navy-lighter text-cream hover:bg-navy-lighter"
                    data-testid="button-favorite-selected"
                  >
                    {favorites.includes(selectedContent.id) ? 'Remove from Favorites' : 'Add to Favorites'}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Content Message */}
      {liveTVContent.length === 0 && (
        <div className="text-center py-12">
          <Tv className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-cream mb-2">No Live TV Content Available</h3>
          <p className="text-gray-400">
            Connect to YouTube TV or ESPN+ to see live programming
          </p>
        </div>
      )}
    </div>
  );
}