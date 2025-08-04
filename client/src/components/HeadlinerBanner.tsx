import { Play, Calendar, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface HeadlinerBannerProps {
  title: string;
  description: string;
  imageUrl: string;
  platform: string;
  eventDate?: string;
  eventTime?: string;
  type: 'live-event' | 'movie' | 'show';
}

export function HeadlinerBanner({ 
  title, 
  description, 
  imageUrl, 
  platform, 
  eventDate, 
  eventTime, 
  type 
}: HeadlinerBannerProps) {
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
    <div className="relative h-80 md:h-96 mb-8 rounded-lg overflow-hidden bg-gray-900" data-testid="headliner-banner">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${imageUrl})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent"></div>
      </div>
      
      {/* Content */}
      <div className="relative z-10 h-full flex items-center px-4 md:px-8">
        <div className="max-w-2xl">
          {/* Event Badge */}
          {type === 'live-event' && (
            <div className="flex items-center gap-2 mb-4">
              <Badge variant="destructive" className="bg-red-600 text-white">
                LIVE EVENT
              </Badge>
              {platform && (
                <Badge className={`${getPlatformColor(platform)} text-white`}>
                  {platform.toUpperCase()}
                </Badge>
              )}
            </div>
          )}
          
          {type !== 'live-event' && platform && (
            <Badge className={`${getPlatformColor(platform)} text-white mb-4`}>
              {platform.toUpperCase()}
            </Badge>
          )}
          
          {/* Title */}
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-4 leading-tight">
            {title}
          </h1>
          
          {/* Description */}
          <p className="text-lg md:text-xl text-gray-200 mb-6 leading-relaxed max-w-xl">
            {description}
          </p>
          
          {/* Event Details */}
          {(eventDate || eventTime) && (
            <div className="flex items-center gap-4 mb-6 text-gray-300">
              {eventDate && (
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  <span>{eventDate}</span>
                </div>
              )}
              {eventTime && (
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>{eventTime}</span>
                </div>
              )}
            </div>
          )}
          
          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <Button 
              size="lg" 
              className="bg-blue-primary hover:bg-blue-600 text-white font-semibold px-8"
              data-testid="button-play-headliner"
            >
              <Play className="w-5 h-5 mr-2" />
              {type === 'live-event' ? 'Watch Live' : 'Play Now'}
            </Button>
            
            <Button 
              variant="outline" 
              size="lg" 
              className="border-white/30 text-white hover:bg-white/10 px-6"
              data-testid="button-info-headliner"
            >
              More Info
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}