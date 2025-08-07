import { useState } from "react";
import { Play, Clock, Star, Tv, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { NetworkLogos, type NetworkLogoKey } from "./NetworkLogos";
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
  const channelInfo: Record<string, { name: string; logoKey: NetworkLogoKey; number: string }> = {
    'fox': { name: 'FOX', logoKey: 'FOX', number: '2.1' },
    'nbc': { name: 'NBC', logoKey: 'NBC', number: '4.1' },
    'abc': { name: 'ABC', logoKey: 'ABC', number: '7.1' },
    'cbs': { name: 'CBS', logoKey: 'CBS', number: '2.1' },
    'pbs': { name: 'PBS', logoKey: 'PBS', number: '8.1' },
    'tbs': { name: 'TBS', logoKey: 'TBS', number: '247' },
    'tnt': { name: 'TNT', logoKey: 'TNT', number: '245' },
    'fs1': { name: 'FS1', logoKey: 'FS1', number: '150' },
    'fs2': { name: 'FS2', logoKey: 'FS2', number: '618' },
    'disney': { name: 'DISNEY', logoKey: 'DISNEY', number: '290' },
    'nick': { name: 'NICK', logoKey: 'NICK', number: '299' },
    'trutv': { name: 'truTV', logoKey: 'TRUTV', number: '246' },
    'amc': { name: 'AMC', logoKey: 'AMC', number: '254' },
    'bbc': { name: 'BBC', logoKey: 'BBC', number: '135' },
    'cartoon': { name: 'CARTOON', logoKey: 'CARTOON', number: '296' },
    'cmt': { name: 'CMT', logoKey: 'CMT', number: '327' },
    'comedy': { name: 'COMEDY', logoKey: 'COMEDY', number: '249' },
    'fx': { name: 'FX', logoKey: 'FX', number: '248' },
    'mtv': { name: 'MTV', logoKey: 'MTV', number: '331' },
    'hallmark': { name: 'HALLMARK', logoKey: 'HALLMARK', number: '312' },
    'natgeo': { name: 'NAT GEO', logoKey: 'NATGEO', number: '276' },
    'discovery': { name: 'DISCOVERY', logoKey: 'DISCOVERY', number: '278' },
    'cnn': { name: 'CNN', logoKey: 'CNN', number: '202' },
    'espn': { name: 'ESPN', logoKey: 'ESPN', number: '206' },
  };

  const channels = [
    'fox', 'nbc', 'abc', 'cbs', 'pbs', 'cnn', 'espn',
    'tbs', 'tnt', 'fs1', 'fs2', 'disney', 'nick', 
    'trutv', 'amc', 'bbc', 'cartoon', 'cmt', 'comedy', 
    'fx', 'mtv', 'hallmark', 'natgeo', 'discovery'
  ];

  // Get current time slots aligned to :00 and :30 minute marks
  const getCurrentTimeSlots = () => {
    const now = new Date();
    const currentMinute = now.getMinutes();
    const currentSecond = now.getSeconds();
    
    // Calculate progress through current 30-minute window
    const progressInCurrentSlot = currentMinute < 30 
      ? (currentMinute + currentSecond / 60) / 30 
      : ((currentMinute - 30) + currentSecond / 60) / 30;
    
    // Find the current :00 or :30 time
    const currentSlotStart = new Date(now);
    if (currentMinute < 30) {
      currentSlotStart.setMinutes(0, 0, 0);
    } else {
      currentSlotStart.setMinutes(30, 0, 0);
    }
    
    const slots = [];
    for (let i = 0; i < 4; i++) {
      const slotTime = new Date(currentSlotStart.getTime() + (i * 30 * 60 * 1000));
      slots.push({
        time: slotTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        hour: slotTime.getHours(),
        minute: slotTime.getMinutes(),
        isCurrentSlot: i === 0,
        progressPercent: i === 0 ? progressInCurrentSlot * 100 : 0
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
                    <div className="flex flex-col items-center space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-white/60 text-xs font-medium">{channelData.number}</span>
                        {NetworkLogos[channelData.logoKey]()}
                      </div>
                      <span className="text-white text-xs font-medium">{channelData.name}</span>
                    </div>
                  </div>

                  {/* Program Time Slots */}
                  {timeSlots.map((slot, slotIndex) => {
                    const program = getProgramForSlot(channel, slotIndex);
                    const isCurrentSlot = slot.isCurrentSlot;
                    const progressPercent = slot.progressPercent;
                    
                    return (
                      <div
                        key={slotIndex}
                        className={`relative border-l border-white/10 first:border-l-0 cursor-pointer transition-all hover:bg-white/10 ${
                          isCurrentSlot ? 'bg-blue-600/20 border-l-2 border-l-blue-500' : ''
                        }`}
                        onClick={() => program && handleProgramClick(program, channel)}
                        data-testid={`program-slot-${channel}-${slotIndex}`}
                        style={{
                          // Adjust width based on remaining time for current slot
                          width: isCurrentSlot ? `${100 - progressPercent}%` : '100%',
                          minWidth: isCurrentSlot ? '30%' : '100%'
                        }}
                      >
                        <div className="p-2 h-full">
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
                                {program.description?.slice(0, 60)}...
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
                              
                              {/* Progress bar for current slot */}
                              {isCurrentSlot && (
                                <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
                                  <div 
                                    className="h-full bg-blue-500 transition-all duration-1000"
                                    style={{ width: `${progressPercent}%` }}
                                  />
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="h-full flex items-center justify-center">
                              <span className="text-white/40 text-xs">No Program</span>
                            </div>
                          )}
                        </div>
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
                <span className="flex items-center space-x-2">
                  {channelInfo[selectedChannel] && NetworkLogos[channelInfo[selectedChannel].logoKey]()}
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