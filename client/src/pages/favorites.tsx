import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Heart, Filter } from "lucide-react";
import { Header } from "@/components/Header";
import { GenreBanner } from "@/components/GenreBanner";
import { ContentCard } from "@/components/ContentCard";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import type { Content } from "@shared/schema";

export default function Favorites() {
  const { user } = useAuth();
  const [selectedGenre, setSelectedGenre] = useState('all');
  const [selectedPlatform, setSelectedPlatform] = useState('all');
  const [viewMode, setViewMode] = useState<'cards' | 'guide'>('cards');

  // Fetch user favorites
  const { data: favorites = [], isLoading, error } = useQuery({
    queryKey: ["/api/favorites"],
    retry: false,
  });

  if (!user) {
    return null;
  }

  // Extract content from favorites
  const favoriteContent: Content[] = favorites.map((fav: any) => fav.content);
  const favoriteIds = favorites.map((fav: any) => fav.contentId);

  // Filter favorites by genre and platform
  const filteredFavorites = favoriteContent.filter((item: Content) => {
    const genreMatch = selectedGenre === 'all' || item.genre === selectedGenre;
    const platformMatch = selectedPlatform === 'all' || item.platform === selectedPlatform;
    return genreMatch && platformMatch;
  });

  // Group favorites by type
  const movieFavorites = filteredFavorites.filter(item => item.type === 'movie');
  const showFavorites = filteredFavorites.filter(item => item.type === 'show');
  const musicFavorites = filteredFavorites.filter(item => item.type === 'music');

  const platforms = [
    { value: 'all', label: 'All Platforms' },
    { value: 'netflix', label: 'Netflix' },
    { value: 'hulu', label: 'Hulu' },
    { value: 'disney', label: 'Disney+' },
    { value: 'hbo', label: 'HBO Max' },
    { value: 'spotify', label: 'Spotify' },
    { value: 'apple', label: 'Apple Music' },
    { value: 'youtube', label: 'YouTube Music' },
  ];

  const genres = [
    { value: 'all', label: 'All Genres' },
    { value: 'action', label: 'Action' },
    { value: 'comedy', label: 'Comedy' },
    { value: 'drama', label: 'Drama' },
    { value: 'thriller', label: 'Thriller' },
    { value: 'documentaries', label: 'Documentaries' },
    { value: 'music', label: 'Music' },
    { value: 'sports', label: 'Sports' },
  ];

  return (
    <div className="min-h-screen bg-navy text-cream" data-testid="page-favorites">
      <Header viewMode={viewMode} onViewModeChange={setViewMode} />
      <GenreBanner selectedGenre={selectedGenre} onGenreChange={setSelectedGenre} />
      
      <main className="px-2 py-4 max-w-screen-2xl mx-auto">
        <section className="mb-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-cream" data-testid="heading-favorites">
              Your Favorites
            </h2>
            
            {/* Filters */}
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <Filter className="w-4 h-4 text-gray-400" />
                <span className="text-gray-400 text-sm">Filter:</span>
              </div>
              
              <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
                <SelectTrigger className="w-[150px] bg-navy-light border-navy-lighter text-cream text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-navy-light border-navy-lighter">
                  {platforms.map((platform) => (
                    <SelectItem 
                      key={platform.value} 
                      value={platform.value}
                      className="text-cream hover:bg-navy-lighter"
                      data-testid={`filter-platform-${platform.value}`}
                    >
                      {platform.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={selectedGenre} onValueChange={setSelectedGenre}>
                <SelectTrigger className="w-[130px] bg-navy-light border-navy-lighter text-cream text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-navy-light border-navy-lighter">
                  {genres.map((genre) => (
                    <SelectItem 
                      key={genre.value} 
                      value={genre.value}
                      className="text-cream hover:bg-navy-lighter"
                      data-testid={`filter-genre-${genre.value}`}
                    >
                      {genre.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {isLoading && (
            <div className="text-center py-12" data-testid="loading-favorites">
              <div className="animate-spin w-8 h-8 border-2 border-blue-primary border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-gray-400">Loading your favorites...</p>
            </div>
          )}
          
          {error && (
            <div className="text-center py-12" data-testid="error-favorites">
              <p className="text-red-400 mb-2">Failed to load favorites</p>
              <p className="text-gray-400 text-sm">Please try again</p>
            </div>
          )}
          
          {!isLoading && !error && (
            <>
              {filteredFavorites.length > 0 ? (
                <div className="space-y-8">
                  {/* Movies Section */}
                  {movieFavorites.length > 0 && (
                    <div>
                      <h3 className="text-lg font-bold text-cream mb-4" data-testid="heading-favorite-movies">
                        Movies ({movieFavorites.length})
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        {movieFavorites.map((item) => (
                          <ContentCard
                            key={item.id}
                            content={item}
                            isFavorite={true}
                            size="small"
                          />
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* TV Shows Section */}
                  {showFavorites.length > 0 && (
                    <div>
                      <h3 className="text-lg font-bold text-cream mb-4" data-testid="heading-favorite-shows">
                        TV Shows ({showFavorites.length})
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        {showFavorites.map((item) => (
                          <ContentCard
                            key={item.id}
                            content={item}
                            isFavorite={true}
                            size="small"
                          />
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Music Section */}
                  {musicFavorites.length > 0 && (
                    <div>
                      <h3 className="text-lg font-bold text-cream mb-4" data-testid="heading-favorite-music">
                        Music ({musicFavorites.length})
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        {musicFavorites.map((item) => (
                          <ContentCard
                            key={item.id}
                            content={item}
                            isFavorite={true}
                            size="small"
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12" data-testid="empty-favorites">
                  <Heart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-cream mb-2">No Favorites Yet</h3>
                  <p className="text-gray-400 mb-4">
                    Start adding content to your favorites to see them here
                  </p>
                  <p className="text-sm text-gray-500">
                    Click the heart icon on any movie, show, or song to save it
                  </p>
                </div>
              )}
            </>
          )}
        </section>
      </main>
    </div>
  );
}
