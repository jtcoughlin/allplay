import { useState } from "react";
import { Play, Pause, SkipBack, SkipForward, Volume2, Maximize, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import type { Content } from "@shared/schema";

interface MusicPlayerProps {
  currentTrack?: Content;
  isPlaying?: boolean;
  isVisible?: boolean;
  onPlayPause?: () => void;
  onNext?: () => void;
  onPrevious?: () => void;
  onVolumeChange?: (volume: number) => void;
  onToggleFavorite?: () => void;
  isFavorite?: boolean;
}

export function MusicPlayer({
  currentTrack,
  isPlaying = false,
  isVisible = false,
  onPlayPause,
  onNext,
  onPrevious,
  onVolumeChange,
  onToggleFavorite,
  isFavorite = false
}: MusicPlayerProps) {
  const [volume, setVolume] = useState([75]);

  if (!isVisible || !currentTrack) {
    return null;
  }

  const handleVolumeChange = (value: number[]) => {
    setVolume(value);
    onVolumeChange?.(value[0]);
  };

  return (
    <div 
      className="fixed bottom-0 left-0 right-0 bg-navy-light border-t border-navy-lighter px-4 py-3 z-50"
      data-testid="music-player"
    >
      <div className="flex items-center justify-between max-w-screen-2xl mx-auto">
        {/* Currently Playing Info */}
        <div className="flex items-center space-x-3 flex-1 min-w-0">
          <div className="w-12 h-12 rounded object-cover bg-navy-lighter flex items-center justify-center flex-shrink-0">
            {currentTrack.imageUrl ? (
              <img 
                src={currentTrack.imageUrl} 
                alt={currentTrack.title}
                className="w-12 h-12 rounded object-cover"
                data-testid="img-current-track"
              />
            ) : (
              <div className="w-8 h-8 bg-blue-gradient rounded flex items-center justify-center">
                <Play className="w-4 h-4 text-white fill-white" />
              </div>
            )}
          </div>
          
          <div className="min-w-0 flex-1">
            <h4 
              className="text-sm font-medium text-cream truncate" 
              title={currentTrack.title}
              data-testid="text-current-title"
            >
              {currentTrack.title}
            </h4>
            <p 
              className="text-xs text-gray-400 truncate" 
              title={currentTrack.artist}
              data-testid="text-current-artist"
            >
              {currentTrack.artist || 'Unknown Artist'}
            </p>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleFavorite}
            className="text-red-400 hover:text-red-300 transition-colors flex-shrink-0 w-8 h-8 p-0"
            data-testid="button-toggle-favorite-player"
          >
            <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
          </Button>
        </div>
        
        {/* Player Controls */}
        <div className="flex items-center space-x-4 px-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={onPrevious}
            className="text-cream hover:text-blue-primary transition-colors w-8 h-8 p-0"
            data-testid="button-previous"
          >
            <SkipBack className="w-4 h-4" />
          </Button>
          
          <Button
            onClick={onPlayPause}
            className="w-8 h-8 bg-blue-gradient rounded-full flex items-center justify-center hover:opacity-90 transition-opacity p-0"
            data-testid="button-play-pause"
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 text-white" />
            ) : (
              <Play className="w-4 h-4 text-white fill-white" />
            )}
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={onNext}
            className="text-cream hover:text-blue-primary transition-colors w-8 h-8 p-0"
            data-testid="button-next"
          >
            <SkipForward className="w-4 h-4" />
          </Button>
        </div>
        
        {/* Volume and Options */}
        <div className="flex items-center space-x-3 flex-1 justify-end">
          <div className="flex items-center space-x-2">
            <Volume2 className="w-4 h-4 text-gray-400" />
            <div className="w-20">
              <Slider
                value={volume}
                onValueChange={handleVolumeChange}
                max={100}
                step={1}
                className="cursor-pointer"
                data-testid="slider-volume"
              />
            </div>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            className="text-gray-400 hover:text-cream transition-colors w-8 h-8 p-0"
            data-testid="button-expand-player"
          >
            <Maximize className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
