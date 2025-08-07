import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { GenreBanner } from "@/components/GenreBanner";
import { ContentRow } from "@/components/ContentRow";
import { MusicPlayer } from "@/components/MusicPlayer";
import { HeadlinerBanner } from "@/components/HeadlinerBanner";
import { GuideView } from "@/components/GuideView";
import { LiveTVGuide } from "@/components/LiveTVGuide";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { Content } from "@shared/schema";

export default function Home() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedGenre, setSelectedGenre] = useState('all');
  const [viewMode, setViewMode] = useState<'cards' | 'guide'>('cards');
  const [currentTrack, setCurrentTrack] = useState<Content | undefined>();
  const [isPlaying, setIsPlaying] = useState(false);

  // Fetch content based on selected genre
  const { data: content = [], isLoading: isLoadingContent } = useQuery({
    queryKey: ["/api/content"],
    retry: false,
    staleTime: 0, // No caching to ensure fresh data
    refetchOnMount: true,
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

  // Type-safe content filtering
  const typedContent = (content as Content[]) || [];
  const typedFavorites = (favorites as any[]) || [];
  const typedContinueWatching = (continueWatching as any[]) || [];

  // Filter content by type for different sections
  const movies = typedContent.filter((item: Content) => item.type === 'movie');
  const shows = typedContent.filter((item: Content) => item.type === 'show' && !['spotify', 'apple-music'].includes(item.service || ''));
  const liveContent = typedContent.filter((item: Content) => 
    item.isLive === true || 
    ['youtube-tv', 'espn-plus'].includes(item.service || '') ||
    item.type === 'live'
  );

  // Organize TV shows by categories - ordered by content volume for fuller screen
  const showsByCategory = {
    'Streaming Hits': shows.filter((item: Content) => 
      ['The Bear', 'Stranger Things', 'Wednesday', 'The Boys', 'Ozark', 'House of Cards'].includes(item.title || '')
    ),
    'Comedy & Sitcoms': shows.filter((item: Content) => 
      item.genre === 'comedy' || ['Friends', 'American Dad!', 'Family Guy', 'The Misery Index'].includes(item.title || '')
    ),
    'Crime & Drama': shows.filter((item: Content) => 
      item.genre === 'drama' || item.genre === 'crime' || ['Animal Kingdom', 'Law & Order', 'The Closer'].includes(item.title || '')
    ),
    'Action & Thriller': shows.filter((item: Content) => 
      item.genre === 'action' || item.genre === 'thriller' || ['The Boys', 'Animal Kingdom'].includes(item.title || '')
    ),
    'Award Winners': shows.filter((item: Content) => 
      ['The Bear', 'Ozark', 'House of Cards'].includes(item.title || '')
    ),
    'Trending Now': shows.filter((item: Content) => 
      item.category === 'Popular in the US Today' || ['Wednesday', 'Stranger Things', 'The Bear'].includes(item.title || '')
    ),
    'Binge-Worthy': shows.filter((item: Content) => 
      item.category === 'Your Next Watch' || ['Ozark', 'House of Cards', 'The Boys'].includes(item.title || '')
    ),
  };

  // Organize movies by categories - ordered by content volume for fuller screen
  const moviesByCategory = {
    'Comedy Collection': movies.filter((item: Content) => 
      item.category === 'Comedies' || item.genre === 'comedy' || item.genre === 'family'
    ),
    'Action & Adventure': movies.filter((item: Content) => 
      item.genre === 'action' || item.genre === 'sci-fi' || 
      ['Red Notice', 'The Tomorrow War', 'Dune', 'The Matrix Resurrections', 'Top Gun: Maverick'].includes(item.title || '')
    ),
    '90%+ on Rotten Tomatoes': movies.filter((item: Content) => 
      ['Glass Onion: A Knives Out Mystery', 'Palm Springs', 'Encanto', 'Luca', 'CODA'].includes(item.title || '')
    ),
    'Popular in the US Today': movies.filter((item: Content) => item.category === 'Popular in the US Today'),
    'Award Winners': movies.filter((item: Content) => 
      ['CODA', 'Nomadland', 'Sound of Metal', 'King Richard', 'Encanto'].includes(item.title || '')
    ),
    'Your Next Watch': movies.filter((item: Content) => item.category === 'Your Next Watch'),
    'Critically Acclaimed': movies.filter((item: Content) => 
      item.category === 'Dramas' || 
      ['CODA', 'Nomadland', 'Sound of Metal', 'King Richard'].includes(item.title || '')
    ),
    '2025 Biggest Hits': movies.filter((item: Content) => item.category === '2025 Biggest Hits'),
  };
  
  // Debug logging
  console.log('Content Query Result:', { 
    totalContent: typedContent.length,
    liveContent: liveContent.length,
    selectedGenre,
    isLoadingContent,
    rawContentLength: (content as any)?.length || 0
  });
  
  if (selectedGenre === 'live-tv') {
    console.log('Live TV Debug:', {
      liveContentDetails: liveContent.map(item => ({
        id: item.id,
        title: item.title,
        service: item.service,
        isLive: item.isLive,
        type: item.type
      })),
      allContentSample: typedContent.slice(0, 5).map(item => ({
        id: item.id,
        title: item.title,
        service: item.service,
        isLive: item.isLive
      }))
    });
  }

  // Extract favorite content IDs
  const favoriteIds = typedFavorites.map((fav: any) => fav.contentId);

  // Get top-rated content
  const topPicks = typedContent
    .filter((item: Content) => item.rating && parseFloat(item.rating) >= 8.0)
    .sort((a: Content, b: Content) => parseFloat(b.rating || '0') - parseFloat(a.rating || '0'))
    .slice(0, 10);

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
        description: "Failed to update favorites. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleToggleFavorite = (contentId: string) => {
    toggleFavorite.mutate(contentId);
  };

  const handlePlayTrack = (track: Content) => {
    setCurrentTrack(track);
    setIsPlaying(true);
  };

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handlePlay = async (content: Content) => {
    if (content.type === 'music') {
      handlePlayTrack(content);
    } else {
      try {
        // For deep link services, use the external play endpoint
        const isDeepLinkService = ['netflix', 'disney-plus', 'hulu', 'amazon-prime', 'hbo-max', 'apple-tv', 'paramount', 'peacock', 'youtube-tv', 'espn-plus'].includes(content.service || '');
        
        if (isDeepLinkService) {
          const response = await fetch(`/api/play-external/${content.id}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
          });
          
          if (response.ok) {
            const data = await response.json();
            if (data.appUrl && data.webUrl) {
              // Open web URL directly - this works reliably on all platforms
              const newTab = window.open(data.webUrl, '_blank');
              
              if (!newTab) {
                // If popup was blocked, try navigating in same window
                window.location.href = data.webUrl;
              }
              
              toast({
                title: `Opening ${content.title}`,
                description: `Opening in ${content.service} app`,
              });
            }
            
            // Invalidate continue watching to refresh the data
            queryClient.invalidateQueries({ queryKey: ['/api/continue-watching'] });
          }
        } else {
          // Call play endpoint to simulate in-Allplay streaming
          const response = await fetch(`/api/play/${content.id}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
          });
          
          if (response.ok) {
            console.log('Now streaming within Allplay:', content.title);
            toast({
              title: "Now Playing in Allplay",
              description: `${content.title} is streaming directly in Allplay - no app switching needed!`,
            });
            
            // Invalidate continue watching to refresh the data
            queryClient.invalidateQueries({ queryKey: ['/api/continue-watching'] });
          }
        }
      } catch (error) {
        console.error('Error starting playback:', error);
        toast({
          title: "Playback Error",
          description: "Unable to start streaming. Please check your connection.",
          variant: "destructive",
        });
      }
    }
  };

  // Get headliner content based on selected genre
  const getHeadlinerContent = () => {
    switch (selectedGenre) {
      case 'sports':
        // For sports: prioritize Jake Paul vs Tyson, then other live sports
        return typedContent.find((item: Content) => 
          item.id === 'netflix-paul-tyson'
        ) || typedContent.find((item: Content) => 
          item.isLive && item.genre === 'live-sports'
        ) || typedContent.find((item: Content) => 
          item.genre === 'sports'
        );
      
      case 'news':
        // For news: prioritize Presidential Debate, then other live news
        return typedContent.find((item: Content) => 
          item.id === 'cnn-presidential-debate'
        ) || typedContent.find((item: Content) => 
          item.isLive && item.genre === 'news'
        ) || typedContent.find((item: Content) => 
          item.genre === 'news'
        );
      
      case 'comedy':
        // For comedy: prioritize Happy Gilmore 2, then Bill Burr Drop Dead Years
        return typedContent.find((item: Content) => 
          item.title === 'Happy Gilmore 2'
        ) || typedContent.find((item: Content) => 
          item.id === 'hulu-bill-burr-drop-dead'
        ) || typedContent.find((item: Content) => 
          item.genre === 'comedy'
        );
      
      case 'live-tv':
        // For live-tv: prioritize ABC World News Tonight
        return typedContent.find((item: Content) => 
          item.title === 'ABC World News Tonight'
        ) || typedContent.find((item: Content) => 
          item.isLive && item.genre === 'news'
        ) || liveContent[0];
      
      case 'movies':
        // For movies: prioritize Top Gun: Maverick
        return typedContent.find((item: Content) => 
          item.title === 'Top Gun: Maverick'
        ) || typedContent.find((item: Content) => item.type === 'movie');
      
      case 'shows':
        // For shows: prioritize Yellowstone
        return typedContent.find((item: Content) => 
          item.title === 'Yellowstone'
        ) || typedContent.find((item: Content) => item.type === 'show');
      
      case 'all':
      default:
        // For "all": prioritize House of the Dragon
        return typedContent.find((item: Content) => 
          item.title === 'House of the Dragon'
        ) || topPicks[0];
    }
  };
  
  const headlinerContent = getHeadlinerContent();

  // Force guide view for live TV tab
  const effectiveViewMode = selectedGenre === 'live-tv' ? 'guide' : viewMode;

  return (
    <div className="min-h-screen bg-navy text-cream w-full overflow-x-hidden" data-testid="page-home">
      <Header 
        viewMode={effectiveViewMode} 
        onViewModeChange={setViewMode}
        hideViewToggle={selectedGenre === 'live-tv'}
      />
      <GenreBanner selectedGenre={selectedGenre} onGenreChange={setSelectedGenre} />
      
      <main className="px-2 py-4 w-full max-w-none pb-20">
        {/* Headliner Banner - Only show in card view, but never in live TV */}
        {effectiveViewMode === 'cards' && selectedGenre !== 'live-tv' && headlinerContent && (
          <HeadlinerBanner
            title={headlinerContent.title}
            description={headlinerContent.description || "Experience premium entertainment"}
            imageUrl={headlinerContent.id === 'espn-5' ? 'https://image.tmdb.org/t/p/original/kY0h95L73t7a6ev6Rv0aHSCtN7y.jpg' : 
                     headlinerContent.title === 'Top Gun: Maverick' ? 'https://image.tmdb.org/t/p/original/kBSSbN1sOiJtXjAGVZXxHJR9Kox.jpg' : 
                     headlinerContent.title === 'House of the Dragon' ? 'https://image.tmdb.org/t/p/original/etj8E2o0Bud0HkONVQPjyCkIvpv.jpg' : 
                     headlinerContent.imageUrl || ""}
            platform={headlinerContent.service || "allplay"}
            eventDate={headlinerContent.isLive ? "Live Now" : undefined}
            eventTime={headlinerContent.isLive ? "Currently Broadcasting" : undefined}
            type={headlinerContent.isLive ? 'live-event' : headlinerContent.type as any}
            onPlay={() => handlePlay(headlinerContent)}
          />
        )}

        {/* Guide View or Live TV Guide */}
        {effectiveViewMode === 'guide' ? (
          selectedGenre === 'live-tv' ? (
            <LiveTVGuide
              content={liveContent}
              favorites={favoriteIds}
              onToggleFavorite={handleToggleFavorite}
              onPlay={handlePlay}
            />
          ) : (
            <GuideView
              content={typedContent.filter((item: Content) => {
                if (selectedGenre === 'all') return true;
                if (selectedGenre === 'movies') return item.type === 'movie';
                if (selectedGenre === 'shows') return item.type === 'show' && !['spotify', 'apple-music'].includes(item.service || '');
                if (selectedGenre === 'sports') return item.genre === 'sports' || item.genre === 'live-sports';
                if (selectedGenre === 'news') return item.genre === 'news';
                return item.genre === selectedGenre;
              })}
              favorites={favoriteIds}
              onToggleFavorite={handleToggleFavorite}
              onPlay={handlePlay}
            />
          )
        ) : (
          /* Card View - Existing Content Rows */
          <>
            {/* Continue Watching Section - Only show in "All" tab */}
            {selectedGenre === 'all' && typedContinueWatching.length > 0 && (
              <ContentRow
                title="Continue Watching"
                content={typedContinueWatching.map((item: any) => item.content)}
                watchHistory={typedContinueWatching}
                favorites={favoriteIds}
                showProgress={true}
                size="medium"
              />
            )}

            {/* Filter content based on selected genre */}
            {selectedGenre === 'all' && (
              <>
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
              </>
            )}

            {/* Movies Genre - Organized by Categories */}
            {selectedGenre === 'movies' && movies.length > 0 && (
              <>
                {Object.entries(moviesByCategory).map(([categoryName, categoryMovies]) => {
                  if (categoryMovies.length === 0) return null;
                  return (
                    <ContentRow
                      key={categoryName}
                      title={categoryName}
                      content={categoryMovies}
                      favorites={favoriteIds}
                      size="small"
                    />
                  );
                })}
                
                {/* Show all movies if no categories have content */}
                {Object.values(moviesByCategory).every(cat => cat.length === 0) && (
                  <ContentRow
                    title="All Movies"
                    content={movies}
                    favorites={favoriteIds}
                    size="small"
                  />
                )}
              </>
            )}

            {/* Shows Genre - Organized by Categories */}
            {selectedGenre === 'shows' && shows.length > 0 && (
              <>
                {Object.entries(showsByCategory).map(([categoryName, categoryShows]) => {
                  if (categoryShows.length === 0) return null;
                  return (
                    <ContentRow
                      key={categoryName}
                      title={categoryName}
                      content={categoryShows}
                      favorites={favoriteIds}
                      size="small"
                    />
                  );
                })}
                
                {/* Show all shows if no categories have content */}
                {Object.values(showsByCategory).every(cat => cat.length === 0) && (
                  <ContentRow
                    title="All TV Shows"
                    content={shows}
                    favorites={favoriteIds}
                    size="small"
                  />
                )}
              </>
            )}

            {/* Live TV Genre */}
            {selectedGenre === 'live-tv' && (
              <>
                <div className="mb-4">
                  <p className="text-gray-400 text-sm">
                    Found {liveContent.length} live TV channels
                  </p>
                  {liveContent.length === 0 && (
                    <div className="bg-red-900/20 border border-red-500 rounded p-4 mt-4">
                      <p className="text-red-400">Debug: No live content found</p>
                      <p className="text-gray-400 text-sm">Total content: {typedContent.length}</p>
                      <p className="text-gray-400 text-sm">isLoadingContent: {isLoadingContent ? 'true' : 'false'}</p>
                    </div>
                  )}
                </div>
                {liveContent.length > 0 && (
                  <ContentRow
                    title="Live TV"
                    content={liveContent}
                    favorites={favoriteIds}
                    size="large"
                  />
                )}
              </>
            )}

            {/* Sports Genre */}
            {selectedGenre === 'sports' && (
              <ContentRow
                title="Sports"
                content={typedContent.filter((item: Content) => 
                  item.genre === 'sports' || item.genre === 'live-sports'
                )}
                favorites={favoriteIds}
                size="large"
              />
            )}

            {/* News Genre */}
            {selectedGenre === 'news' && (
              <ContentRow
                title="News"
                content={typedContent.filter((item: Content) => 
                  item.genre === 'news'
                )}
                favorites={favoriteIds}
                size="small"
              />
            )}

            {/* Other Genres */}
            {!['all', 'movies', 'shows', 'live-tv', 'sports', 'news'].includes(selectedGenre) && (
              <ContentRow
                title={selectedGenre.charAt(0).toUpperCase() + selectedGenre.slice(1)}
                content={typedContent.filter((item: Content) => 
                  item.genre === selectedGenre
                )}
                favorites={favoriteIds}
                size="small"
              />
            )}


          </>
        )}

        {/* Loading State */}
        {(isLoadingContent || isLoadingContinue || isLoadingFavorites) && (
          <div className="text-center py-12" data-testid="loading-content">
            <div className="animate-spin w-8 h-8 border-2 border-blue-primary border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-400">Loading your content...</p>
          </div>
        )}

        {/* Empty State */}
        {!isLoadingContent && typedContent.length === 0 && (
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
