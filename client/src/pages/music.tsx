import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Play, Pause, Heart, MoreHorizontal, Plus, Search, Clock, Music as MusicIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { MusicPlayer } from "@/components/MusicPlayer";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Content } from "@shared/schema";

export default function Music() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [currentTrack, setCurrentTrack] = useState<Content | undefined>();
  const [isPlaying, setIsPlaying] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch music content
  const { data: content = [], isLoading } = useQuery({
    queryKey: ["/api/content", { type: "music" }],
    retry: false,
  });

  // Fetch favorites
  const { data: favorites = [] } = useQuery({
    queryKey: ["/api/favorites"],
    retry: false,
  });

  // Fetch recently played
  const { data: recentlyPlayed = [] } = useQuery({
    queryKey: ["/api/continue-watching"],
    retry: false,
  });

  if (!user) {
    return null;
  }

  const musicContent = (content as Content[]).filter(item => item.type === 'music');
  const favoriteIds = (favorites as any[]).map((fav: any) => fav.contentId);
  const favoriteMusic = musicContent.filter(track => favoriteIds.includes(track.id));
  const recentMusic = (recentlyPlayed as any[]).filter(item => 
    musicContent.some(track => track.id === item.contentId)
  );

  // Filter music based on search
  const filteredMusic = searchQuery 
    ? musicContent.filter(track => 
        track.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (track.artist && track.artist.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : musicContent;

  // Toggle favorite mutation
  const toggleFavorite = useMutation({
    mutationFn: async (contentId: string) => {
      const response = await apiRequest("POST", "/api/favorites/toggle", { contentId });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/favorites"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update favorites",
        variant: "destructive",
      });
    },
  });

  const handlePlay = (track: Content) => {
    setCurrentTrack(track);
    setIsPlaying(true);
  };

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleToggleFavorite = (contentId: string) => {
    toggleFavorite.mutate(contentId);
  };

  const TrackCard = ({ track, showArtist = true }: { track: Content; showArtist?: boolean }) => {
    const isFavorite = favoriteIds.includes(track.id);
    
    return (
      <Card 
        className="bg-navy-light hover:bg-navy-lighter transition-colors cursor-pointer group"
        data-testid={`card-track-${track.id}`}
      >
        <CardContent className="p-4">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <div className="w-12 h-12 rounded bg-navy-lighter flex items-center justify-center overflow-hidden">
                {track.imageUrl ? (
                  <img 
                    src={track.imageUrl} 
                    alt={track.title}
                    className="w-full h-full object-cover"
                    data-testid={`img-track-${track.id}`}
                  />
                ) : (
                  <MusicIcon className="w-6 h-6 text-gray-400" />
                )}
              </div>
              <Button
                onClick={() => handlePlay(track)}
                className="absolute inset-0 bg-black bg-opacity-60 opacity-0 group-hover:opacity-100 transition-opacity w-12 h-12 rounded flex items-center justify-center"
                data-testid={`button-play-${track.id}`}
              >
                <Play className="w-4 h-4 text-white fill-white" />
              </Button>
            </div>
            
            <div className="flex-1 min-w-0">
              <h3 
                className="text-sm font-medium text-cream truncate" 
                title={track.title}
                data-testid={`text-title-${track.id}`}
              >
                {track.title}
              </h3>
              {showArtist && (
                <p 
                  className="text-xs text-gray-400 truncate" 
                  title={track.artist}
                  data-testid={`text-artist-${track.id}`}
                >
                  {track.artist || 'Unknown Artist'}
                </p>
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleToggleFavorite(track.id)}
                className={`text-red-400 hover:text-red-300 transition-colors w-8 h-8 p-0 ${
                  isFavorite ? 'text-red-400' : 'text-gray-400'
                }`}
                data-testid={`button-favorite-${track.id}`}
              >
                <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                className="text-gray-400 hover:text-cream transition-colors w-8 h-8 p-0"
                data-testid={`button-more-${track.id}`}
              >
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-navy text-cream">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-navy border-b border-navy-lighter">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-cream" data-testid="heading-music">
              Music
            </h1>
            
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search songs, artists..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-navy-light border-navy-lighter text-cream placeholder-gray-400 w-64"
                  data-testid="input-search-music"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-6 py-6">
        <Tabs defaultValue="library" className="w-full">
          <TabsList className="bg-navy-light" data-testid="tabs-music-navigation">
            <TabsTrigger value="library" data-testid="tab-library">Your Library</TabsTrigger>
            <TabsTrigger value="favorites" data-testid="tab-favorites">Liked Songs</TabsTrigger>
            <TabsTrigger value="recent" data-testid="tab-recent">Recently Played</TabsTrigger>
            <TabsTrigger value="discover" data-testid="tab-discover">Discover</TabsTrigger>
          </TabsList>

          <TabsContent value="library" className="mt-6">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-cream" data-testid="heading-all-songs">
                  All Songs
                </h2>
                <Button variant="outline" size="sm" data-testid="button-create-playlist">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Playlist
                </Button>
              </div>
              
              {isLoading ? (
                <div className="space-y-3">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="h-16 bg-navy-light rounded animate-pulse" />
                  ))}
                </div>
              ) : filteredMusic.length > 0 ? (
                <div className="space-y-2">
                  {filteredMusic.map((track) => (
                    <TrackCard key={track.id} track={track} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <MusicIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-400" data-testid="text-no-songs">
                    {searchQuery ? 'No songs match your search' : 'No songs in your library'}
                  </p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="favorites" className="mt-6">
            <div className="space-y-6">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-red-500 rounded flex items-center justify-center">
                  <Heart className="w-6 h-6 text-white fill-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-cream" data-testid="heading-liked-songs">
                    Liked Songs
                  </h2>
                  <p className="text-sm text-gray-400" data-testid="text-liked-count">
                    {favoriteMusic.length} songs
                  </p>
                </div>
              </div>
              
              {favoriteMusic.length > 0 ? (
                <div className="space-y-2">
                  {favoriteMusic.map((track) => (
                    <TrackCard key={track.id} track={track} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Heart className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-400" data-testid="text-no-favorites">
                    No liked songs yet. Start by hearting some tracks!
                  </p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="recent" className="mt-6">
            <div className="space-y-6">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-blue-500 rounded flex items-center justify-center">
                  <Clock className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-cream" data-testid="heading-recent">
                    Recently Played
                  </h2>
                  <p className="text-sm text-gray-400" data-testid="text-recent-count">
                    {recentMusic.length} songs
                  </p>
                </div>
              </div>
              
              {recentMusic.length > 0 ? (
                <div className="space-y-2">
                  {recentMusic.map((item: any) => {
                    const track = musicContent.find(t => t.id === item.contentId);
                    return track ? <TrackCard key={track.id} track={track} /> : null;
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-400" data-testid="text-no-recent">
                    No recently played songs
                  </p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="discover" className="mt-6">
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-cream" data-testid="heading-discover">
                Discover New Music
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {musicContent.slice(0, 9).map((track) => (
                  <Card key={track.id} className="bg-navy-light hover:bg-navy-lighter transition-colors cursor-pointer group">
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div className="relative">
                          <div className="w-full aspect-square rounded bg-navy-lighter flex items-center justify-center overflow-hidden">
                            {track.imageUrl ? (
                              <img 
                                src={track.imageUrl} 
                                alt={track.title}
                                className="w-full h-full object-cover"
                                data-testid={`img-discover-${track.id}`}
                              />
                            ) : (
                              <MusicIcon className="w-8 h-8 text-gray-400" />
                            )}
                          </div>
                          <Button
                            onClick={() => handlePlay(track)}
                            className="absolute bottom-2 right-2 bg-blue-gradient opacity-0 group-hover:opacity-100 transition-opacity w-12 h-12 rounded-full flex items-center justify-center"
                            data-testid={`button-play-discover-${track.id}`}
                          >
                            <Play className="w-5 h-5 text-white fill-white" />
                          </Button>
                        </div>
                        
                        <div>
                          <h3 className="text-sm font-medium text-cream truncate" title={track.title}>
                            {track.title}
                          </h3>
                          <p className="text-xs text-gray-400 truncate" title={track.artist}>
                            {track.artist || 'Unknown Artist'}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Music Player */}
      <MusicPlayer
        currentTrack={currentTrack}
        isPlaying={isPlaying}
        isVisible={!!currentTrack}
        onPlayPause={handlePlayPause}
        onNext={() => {
          const currentIndex = musicContent.findIndex(track => track.id === currentTrack?.id);
          const nextTrack = musicContent[currentIndex + 1];
          if (nextTrack) {
            setCurrentTrack(nextTrack);
          }
        }}
        onPrevious={() => {
          const currentIndex = musicContent.findIndex(track => track.id === currentTrack?.id);
          const prevTrack = musicContent[currentIndex - 1];
          if (prevTrack) {
            setCurrentTrack(prevTrack);
          }
        }}
        onToggleFavorite={() => {
          if (currentTrack) {
            handleToggleFavorite(currentTrack.id);
          }
        }}
        isFavorite={currentTrack ? favoriteIds.includes(currentTrack.id) : false}
      />
    </div>
  );
}