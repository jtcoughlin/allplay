import { useState } from "react";
import { Play, Clock, Star, Tv, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Content } from "@shared/schema";

interface LiveTVGuideProps {
  content: Content[];
  favorites: string[];
  onToggleFavorite?: (contentId: string) => void;
  onPlay?: (content: Content) => void;
}

export function LiveTVGuide({ content, favorites, onToggleFavorite, onPlay }: LiveTVGuideProps) {
  const [selectedContent, setSelectedContent] = useState<Content | null>(null);
  const [selectedChannel, setSelectedChannel] = useState<string>('');

  // Filter for YouTube TV content
  const liveTVContent = content.filter(item => 
    item.service === 'youtube-tv'
  );

  // Group content by channel (extract from service_content_id)
  const contentByChannel = liveTVContent.reduce((acc, item) => {
    // Extract channel from service_content_id (e.g., "fox-news-live" -> "fox")
    const channel = item.serviceContentId?.split('-')[0] || 'unknown';
    if (!acc[channel]) acc[channel] = [];
    acc[channel].push(item);
    return acc;
  }, {} as Record<string, Content[]>);

  // Define channel order and display info
  const channelInfo: Record<string, { name: string; logo: string; number: string }> = {
    'fox': { name: 'FOX', logo: '🦊', number: '2.1' },
    'nbc': { name: 'NBC', logo: '🦚', number: '4.1' },
    'abc': { name: 'ABC', logo: '🔤', number: '7.1' },
    'cbs': { name: 'CBS', logo: '👁️', number: '2.1' },
    'pbs': { name: 'PBS', logo: '📺', number: '8.1' },
    'tbs': { name: 'TBS', logo: '😂', number: '247' },
    'tnt': { name: 'TNT', logo: '🏀', number: '245' },
  };

  const channels = ['fox', 'nbc', 'abc', 'cbs', 'pbs', 'tbs', 'tnt'];

  // Get current time slots (now, +30min, +1hr, +1.5hr)
  const getCurrentTimeSlots = () => {
    const now = new Date();
    const slots = [];
    for (let i = 0; i < 4; i++) {
      const time = new Date(now.getTime() + (i * 30 * 60 * 1000));
      slots.push({
        time: time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        hour: time.getHours(),
        minute: time.getMinutes()
      });
    }
    return slots;
  };

  const timeSlots = getCurrentTimeSlots();

  const getCurrentTime = () => {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Get program for specific channel and time slot
  const getProgramForSlot = (channel: string, slotIndex: number) => {
    const channelContent = contentByChannel[channel] || [];
    // For demo, alternate between first 2 programs per channel
    return channelContent[slotIndex % channelContent.length] || null;
  };

  const handleProgramClick = (program: Content, channel: string) => {
    setSelectedContent(program);
    setSelectedChannel(channel);
    onPlay?.(program);
  };

  return (
    <div className="space-y-4 h-full" data-testid="live-tv-guide">
      {/* YouTube TV Style Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-black/40 rounded-lg">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-red-600 rounded flex items-center justify-center">
              <Tv className="w-4 h-4 text-white" />
            </div>
            <span className="text-white font-semibold">Live Guide</span>
          </div>
          <Badge className="bg-red-500 text-white text-xs px-2 py-1">
            <Circle className="w-2 h-2 fill-current mr-1 animate-pulse" />
            LIVE
          </Badge>
        </div>
        <div className="text-white/80 text-sm font-medium">
          {getCurrentTime()}
        </div>
      </div>

      {/* YouTube TV Channel Guide Grid */}
      <div className="bg-black/20 rounded-lg overflow-hidden">
        {/* Time Header Row */}
        <div className="grid grid-cols-[120px_repeat(4,1fr)] bg-black/40 border-b border-white/10">
          <div className="p-3">
            <span className="text-white/60 text-sm font-medium">Channel</span>
          </div>
          {timeSlots.map((slot, index) => (
            <div key={index} className="p-3 text-center border-l border-white/10 first:border-l-0">
              <span className="text-white text-sm font-medium">{slot.time}</span>
            </div>
          ))}
        </div>

        {/* Channel Rows */}
        <ScrollArea className="h-[600px]">
          <div className="space-y-0">
            {channels.map((channel) => {
              const channelData = channelInfo[channel];
              const channelContent = contentByChannel[channel] || [];
              
              return (
                <div key={channel} className="grid grid-cols-[120px_repeat(4,1fr)] border-b border-white/10 last:border-b-0 hover:bg-white/5 transition-colors">
                  {/* Channel Info */}
                  <div className="p-3 flex items-center space-x-3 bg-black/20">
                    <div className="flex flex-col items-center">
                      <span className="text-2xl">{channelData.logo}</span>
                      <span className="text-white text-xs font-medium">{channelData.name}</span>
                      <span className="text-white/60 text-xs">{channelData.number}</span>
                    </div>
                  </div>

                  {/* Program Time Slots */}
                  {timeSlots.map((slot, slotIndex) => {
                    const program = getProgramForSlot(channel, slotIndex);
                    const isCurrentSlot = slotIndex === 0; // First slot is "current"
                    
                    return (
                      <div
                        key={slotIndex}
                        className={`p-2 border-l border-white/10 first:border-l-0 cursor-pointer transition-all hover:bg-white/10 ${
                          isCurrentSlot ? 'bg-blue-600/20 border-l-2 border-l-blue-500' : ''
                        }`}
                        onClick={() => program && handleProgramClick(program, channel)}
                        data-testid={`program-slot-${channel}-${slotIndex}`}
                      >
                        {program ? (
                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <h4 className="text-white text-sm font-medium truncate pr-1">
                                {program.title}
                              </h4>
                              {program.isLive && isCurrentSlot && (
                                <div className="flex items-center space-x-1">
                                  <Circle className="w-2 h-2 fill-red-500 text-red-500 animate-pulse" />
                                </div>
                              )}
                            </div>
                            
                            <p className="text-white/70 text-xs line-clamp-2 leading-tight">
                              {program.description?.slice(0, 80)}...
                            </p>
                            
                            <div className="flex items-center justify-between mt-2">
                              <div className="flex items-center space-x-2">
                                {program.genre && (
                                  <Badge 
                                    variant="secondary" 
                                    className="text-xs bg-white/10 text-white/80 border-0 px-1 py-0"
                                  >
                                    {program.genre}
                                  </Badge>
                                )}
                                {program.rating && (
                                  <span className="text-white/60 text-xs">{program.rating}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="h-full flex items-center justify-center">
                            <span className="text-white/40 text-xs">No Program</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </div>

      {/* Now Playing / Selected Program Info (YouTube TV Style) */}
      {selectedContent && selectedChannel && (
        <div className="bg-black/40 rounded-lg p-4">
          <div className="flex items-start space-x-4">
            {/* Program Thumbnail */}
            <div className="w-32 h-20 rounded-lg overflow-hidden bg-black/40 flex-shrink-0">
              {selectedContent.imageUrl ? (
                <img
                  src={selectedContent.imageUrl}
                  alt={selectedContent.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Tv className="w-8 h-8 text-white/40" />
                </div>
              )}
            </div>

            {/* Program Details */}
            <div className="flex-1 space-y-2">
              <div className="flex items-center space-x-3">
                <h3 className="text-white text-lg font-semibold">{selectedContent.title}</h3>
                {selectedContent.isLive && (
                  <Badge className="bg-red-500 text-white text-xs">
                    <Circle className="w-2 h-2 fill-current mr-1 animate-pulse" />
                    LIVE
                  </Badge>
                )}
              </div>
              
              <div className="flex items-center space-x-4 text-sm text-white/70">
                <span className="flex items-center space-x-1">
                  <span className="text-lg">{channelInfo[selectedChannel]?.logo}</span>
                  <span>{channelInfo[selectedChannel]?.name}</span>
                </span>
                {selectedContent.rating && <span>{selectedContent.rating}</span>}
                {selectedContent.genre && (
                  <Badge variant="outline" className="text-xs border-white/30 text-white/80">
                    {selectedContent.genre}
                  </Badge>
                )}
              </div>

              <p className="text-white/80 text-sm leading-relaxed">
                {selectedContent.description}
              </p>

              {/* Action Button */}
              <Button
                onClick={() => onPlay?.(selectedContent)}
                className="bg-white text-black hover:bg-white/90 font-medium"
                data-testid="button-watch-now"
              >
                <Play className="w-4 h-4 mr-2" />
                {selectedContent.isLive ? 'Watch Live' : 'Watch Now'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {liveTVContent.length === 0 && (
        <div className="text-center py-12 bg-black/20 rounded-lg">
          <Tv className="w-16 h-16 text-white/40 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No Live TV Content Available</h3>
          <p className="text-white/60">
            Connect to YouTube TV to see live programming guide
          </p>
        </div>
      )}
    </div>
  );
}