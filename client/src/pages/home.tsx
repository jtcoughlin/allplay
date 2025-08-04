import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { GenreBanner } from "@/components/GenreBanner";
import { ContentRow } from "@/components/ContentRow";
import { MusicPlayer } from "@/components/MusicPlayer";
import { useAuth } from "@/hooks/useAuth";
import type { Content } from "@shared/schema";

export default function Home() {
  const { user } = useAuth();
  const [selectedGenre, setSelectedGenre] = useState('all');
  const [viewMode, setViewMode] = useState<'cards' | 'guide'>('cards');
  const [currentTrack, setCurrentTrack] = useState<Content | undefined>();
  const [isPlaying, setIsPlaying] = useState(false);

  // Fetch content based on selected genre
  const { data: content = [], isLoading: isLoadingContent } = useQuery({
    queryKey: ["/api/content", { genre: selectedGenre }],
    retry: false,
  });

  // Fetch continue watching
  const { data: continueWatching = [], isLoading: isLoadingContinue } = useQuery({
    queryKey: ["/api/continue-watching"],
    retry: false,
  });

  // Fetch favorites
  const { data: favorites = [], isLoading: isLoadingFavorites } = useQuery({
    queryKey: ["/api/favorites"],
    retry: false,
  });

  if (!user) {
    return null;
  }

  // Filter content by type for different sections
  const movies = content.filter((item: Content) => item.type === 'movie');
  const shows = content.filter((item: Content) => item.type === 'show');
  const music = content.filter((item: Content) => item.type === 'music');
  const liveContent = content.filter((item: Content) => item.isLive);

  // Extract favorite content IDs
  const favoriteIds = favorites.map((fav: any) => fav.contentId);

  // Get top-rated content
  const topPicks = content
    .filter((item: Content) => item.rating && parseFloat(item.rating) >= 8.0)
    .sort((a: Content, b: Content) => parseFloat(b.rating || '0') - parseFloat(a.rating || '0'))
    .slice(0, 10);

  const handlePlayTrack = (track: Content) => {
    setCurrentTrack(track);
    setIsPlaying(true);
  };

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  return (
    <div className="min-h-screen bg-navy text-cream" data-testid="page-home">
      <Header viewMode={viewMode} onViewModeChange={setViewMode} />
      <GenreBanner selectedGenre={selectedGenre} onGenreChange={setSelectedGenre} />
      
      <main className="px-2 py-4 max-w-screen-2xl mx-auto pb-20">
        {/* Continue Watching Section */}
        {continueWatching.length > 0 && (
          <ContentRow
            title="Continue Watching"
            content={continueWatching.map((item: any) => item.content)}
            watchHistory={continueWatching}
            favorites={favoriteIds}
            showProgress={true}
            size="medium"
          />
        )}

        {/* Top Picks Section */}
        {topPicks.length > 0 && (
          <ContentRow
            title="Top Picks for You"
            content={topPicks}
            favorites={favoriteIds}
            size="small"
          />
        )}

        {/* Live Sports & TV Section */}
        {liveContent.length > 0 && (
          <ContentRow
            title="Live Now"
            content={liveContent}
            favorites={favoriteIds}
            size="large"
          />
        )}

        {/* Movies Section */}
        {movies.length > 0 && (
          <ContentRow
            title="Movies"
            content={movies.slice(0, 10)}
            favorites={favoriteIds}
            size="small"
          />
        )}

        {/* TV Shows Section */}
        {shows.length > 0 && (
          <ContentRow
            title="TV Shows"
            content={shows.slice(0, 10)}
            favorites={favoriteIds}
            size="small"
          />
        )}

        {/* Music Section */}
        {music.length > 0 && (
          <ContentRow
            title="Trending Music"
            content={music.slice(0, 10)}
            favorites={favoriteIds}
            size="small"
          />
        )}

        {/* Loading State */}
        {(isLoadingContent || isLoadingContinue || isLoadingFavorites) && (
          <div className="text-center py-12" data-testid="loading-content">
            <div className="animate-spin w-8 h-8 border-2 border-blue-primary border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-400">Loading your content...</p>
          </div>
        )}

        {/* Empty State */}
        {!isLoadingContent && content.length === 0 && (
          <div className="text-center py-12" data-testid="empty-content">
            <p className="text-gray-400 text-lg mb-4">No content available</p>
            <p className="text-gray-500 text-sm">
              Content will appear here once it's added to the platform
            </p>
          </div>
        )}
      </main>

      {/* Music Player */}
      <MusicPlayer
        currentTrack={currentTrack}
        isPlaying={isPlaying}
        isVisible={!!currentTrack}
        onPlayPause={handlePlayPause}
        isFavorite={currentTrack ? favoriteIds.includes(currentTrack.id) : false}
      />
    </div>
  );
}
