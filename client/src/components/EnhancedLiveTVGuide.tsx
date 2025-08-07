import { useState, useEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tv, Circle, RefreshCw, Loader2 } from 'lucide-react';
import { NetworkLogos, type NetworkLogoKey } from './NetworkLogos';
import { useCurrentlyAiring, useSyncLiveTV, formatProgramTime, isProgramCurrentlyAiring, getTimeUntilStart, type LiveProgram } from '@/hooks/useLiveTV';
import type { Content } from '@shared/schema';

interface EnhancedLiveTVGuideProps {
  content: Content[];
  favorites: string[];
  onToggleFavorite?: (contentId: string) => void;
  onPlay?: (content: Content) => void;
}

export function EnhancedLiveTVGuide({ content, favorites, onToggleFavorite, onPlay }: EnhancedLiveTVGuideProps) {
  const [selectedProgram, setSelectedProgram] = useState<LiveProgram | null>(null);
  const [selectedChannel, setSelectedChannel] = useState<string>('');
  
  // Use the live TV hooks for real-time data
  const { data: livePrograms = [], isLoading, error, refetch } = useCurrentlyAiring();
  const syncMutation = useSyncLiveTV();

  // Channel information mapping
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

  // Group live programs by channel
  const programsByChannel = livePrograms.reduce((acc: Record<string, LiveProgram[]>, program: LiveProgram) => {
    if (!acc[program.channel]) acc[program.channel] = [];
    acc[program.channel].push(program);
    return acc;
  }, {} as Record<string, LiveProgram[]>);

  // Get available channels from the live data
  const availableChannels = Object.keys(programsByChannel).filter(channel => channelInfo[channel]);

  const getCurrentTime = () => {
    return new Date().toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const handleProgramClick = (program: LiveProgram, channel: string) => {
    setSelectedProgram(program);
    setSelectedChannel(channel);
    
    // Create a Content object for compatibility with existing onPlay function
    if (onPlay) {
      const contentItem: Content = {
        id: program.id,
        title: program.title,
        description: program.description || '',
        type: 'show' as const,
        genre: program.genre[0] || 'general',
        service: 'youtube-tv',
        serviceContentId: `${program.channel}-${program.showTitle.toLowerCase().replace(/\s+/g, '-')}`,
        directUrl: `https://tv.youtube.com/watch/${program.channel}`,
        imageUrl: program.imageUrl || null,
        rating: program.rating ? `${program.rating}/10` : null,
        year: new Date(program.startTime).getFullYear(),
        artist: null,
        album: null,
        duration: program.duration,
        isLive: program.isLive,
        category: null,
        availability: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      onPlay(contentItem);
    }
  };

  const handleSyncData = async () => {
    try {
      await syncMutation.mutateAsync();
    } catch (error) {
      console.error('Failed to sync Live TV data:', error);
    }
  };

  if (error) {
    return (
      <div className="space-y-4 h-full" data-testid="live-tv-guide-error">
        <div className="flex items-center justify-between px-4 py-2 bg-black/40 rounded-lg">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-red-600 rounded flex items-center justify-center">
              <Tv className="w-4 h-4 text-white" />
            </div>
            <span className="text-white font-semibold">Live Guide</span>
            <Badge className="bg-red-500 text-white text-xs px-2 py-1">
              ERROR
            </Badge>
          </div>
          <Button
            onClick={handleSyncData}
            variant="outline"
            size="sm"
            className="text-white border-white/20 hover:bg-white/10"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
            Retry
          </Button>
        </div>
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-white mb-2">Failed to Load Live TV Guide</h3>
          <p className="text-white/60 mb-4">
            Unable to fetch live programming data. Please try again.
          </p>
          <Button
            onClick={handleSyncData}
            variant="outline"
            className="text-white border-white/20 hover:bg-white/10"
            disabled={syncMutation.isPending}
          >
            {syncMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Retry Connection
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 h-full" data-testid="enhanced-live-tv-guide">
      {/* Live TV Header */}
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
          {livePrograms.length > 0 && (
            <Badge className="bg-green-600 text-white text-xs px-2 py-1">
              {livePrograms.length} Programs
            </Badge>
          )}
        </div>
        <div className="flex items-center space-x-3">
          <div className="text-white/80 text-sm font-medium">
            {getCurrentTime()}
          </div>
          <Button
            onClick={handleSyncData}
            variant="outline"
            size="sm"
            className="text-white border-white/20 hover:bg-white/10"
            disabled={syncMutation.isPending}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
            Sync
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-white mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">Loading Live TV Guide</h3>
          <p className="text-white/60">
            Fetching real-time programming data...
          </p>
        </div>
      ) : availableChannels.length > 0 ? (
        <>
          {/* Live Programs Grid */}
          <div className="bg-black/20 rounded-lg overflow-hidden">
            <ScrollArea className="h-[600px]">
              <div className="space-y-0">
                {availableChannels.map((channel) => {
                  const channelData = channelInfo[channel];
                  const channelPrograms = programsByChannel[channel] || [];
                  const currentProgram = channelPrograms.find((p: LiveProgram) => isProgramCurrentlyAiring(p));
                  const nextProgram = channelPrograms.find((p: LiveProgram) => new Date(p.startTime) > new Date());

                  return (
                    <div 
                      key={channel} 
                      className="border-b border-white/10 last:border-b-0 hover:bg-white/5 transition-colors"
                    >
                      <div className="flex">
                        {/* Channel Info */}
                        <div className="w-32 p-4 flex flex-col items-center space-y-2 bg-black/20 border-r border-white/10">
                          <div className="flex items-center space-x-2">
                            <span className="text-white/60 text-xs font-medium">{channelData.number}</span>
                            {NetworkLogos[channelData.logoKey]()}
                          </div>
                          <span className="text-white text-xs font-medium">{channelData.name}</span>
                        </div>

                        {/* Current Program */}
                        <div className="flex-1 p-4">
                          {currentProgram ? (
                            <div 
                              className="cursor-pointer group"
                              onClick={() => handleProgramClick(currentProgram, channel)}
                              data-testid={`current-program-${channel}`}
                            >
                              <div className="flex items-start space-x-3">
                                {currentProgram.imageUrl && (
                                  <img 
                                    src={currentProgram.imageUrl} 
                                    alt={currentProgram.title}
                                    className="w-16 h-24 object-cover rounded"
                                  />
                                )}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center space-x-2 mb-1">
                                    <Badge className="bg-red-500 text-white text-xs px-2 py-1">
                                      <Circle className="w-2 h-2 fill-current mr-1 animate-pulse" />
                                      NOW
                                    </Badge>
                                    <span className="text-white/60 text-sm">
                                      {formatProgramTime(currentProgram.startTime, currentProgram.endTime)}
                                    </span>
                                  </div>
                                  <h4 className="text-white font-medium group-hover:text-blue-400 transition-colors">
                                    {currentProgram.episodeTitle ? (
                                      <>
                                        <span className="text-white/80">{currentProgram.showTitle}:</span> {currentProgram.episodeTitle}
                                      </>
                                    ) : (
                                      currentProgram.showTitle
                                    )}
                                  </h4>
                                  {currentProgram.description && (
                                    <p className="text-white/60 text-sm mt-1 overflow-hidden">
                                      {currentProgram.description}
                                    </p>
                                  )}
                                  <div className="flex items-center space-x-2 mt-2">
                                    {currentProgram.genre.length > 0 && (
                                      <Badge variant="outline" className="text-white/60 border-white/20 text-xs">
                                        {currentProgram.genre[0]}
                                      </Badge>
                                    )}
                                    {currentProgram.season && currentProgram.episode && (
                                      <span className="text-white/40 text-xs">
                                        S{currentProgram.season}E{currentProgram.episode}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ) : nextProgram ? (
                            <div className="cursor-pointer group" onClick={() => handleProgramClick(nextProgram, channel)}>
                              <div className="flex items-center space-x-3">
                                <div className="flex-1">
                                  <div className="flex items-center space-x-2 mb-1">
                                    <Badge className="bg-blue-600 text-white text-xs px-2 py-1">
                                      {getTimeUntilStart(nextProgram.startTime)}
                                    </Badge>
                                    <span className="text-white/60 text-sm">
                                      {formatProgramTime(nextProgram.startTime, nextProgram.endTime)}
                                    </span>
                                  </div>
                                  <h4 className="text-white font-medium group-hover:text-blue-400 transition-colors">
                                    {nextProgram.title}
                                  </h4>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="text-white/40 text-sm italic">
                              No programming data available
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>

          {/* Selected Program Details */}
          {selectedProgram && selectedChannel && (
            <div className="bg-black/40 rounded-lg p-6" data-testid="selected-program-details">
              <div className="flex items-start space-x-4">
                {selectedProgram.imageUrl && (
                  <img 
                    src={selectedProgram.imageUrl} 
                    alt={selectedProgram.title}
                    className="w-24 h-36 object-cover rounded"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-2">
                    <Badge className={`text-white text-xs px-2 py-1 ${
                      selectedProgram.isLive ? 'bg-red-500' : 'bg-blue-600'
                    }`}>
                      {selectedProgram.isLive ? 'LIVE NOW' : getTimeUntilStart(selectedProgram.startTime)}
                    </Badge>
                    <span className="text-white/60 text-sm font-medium">
                      {channelInfo[selectedChannel]?.name}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">
                    {selectedProgram.episodeTitle ? (
                      <>
                        <span className="text-white/80">{selectedProgram.showTitle}:</span><br />
                        {selectedProgram.episodeTitle}
                      </>
                    ) : (
                      selectedProgram.showTitle
                    )}
                  </h3>
                  <p className="text-white/80 text-sm mb-3">
                    {formatProgramTime(selectedProgram.startTime, selectedProgram.endTime)} • {selectedProgram.duration} min
                  </p>
                  {selectedProgram.description && (
                    <p className="text-white/70 mb-4">
                      {selectedProgram.description}
                    </p>
                  )}
                  <div className="flex items-center space-x-3">
                    <Button 
                      className="bg-white text-black hover:bg-white/90"
                      onClick={() => selectedProgram && handleProgramClick(selectedProgram, selectedChannel)}
                      data-testid="button-watch-live"
                    >
                      <Tv className="w-4 h-4 mr-2" />
                      Watch on YouTube TV
                    </Button>
                    {selectedProgram.genre.length > 0 && (
                      <Badge variant="outline" className="text-white/60 border-white/20">
                        {selectedProgram.genre.join(', ')}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-white mb-2">No Live TV Content Available</h3>
          <p className="text-white/60 mb-4">
            Connect to YouTube TV to see live programming guide or sync data to fetch current programs.
          </p>
          <Button
            onClick={handleSyncData}
            variant="outline"
            className="text-white border-white/20 hover:bg-white/10"
            disabled={syncMutation.isPending}
          >
            {syncMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Sync Live TV Data
          </Button>
        </div>
      )}
    </div>
  );
}