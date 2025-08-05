import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search as SearchIcon, Filter } from "lucide-react";
import { Header } from "@/components/Header";
import { GenreBanner } from "@/components/GenreBanner";
import { ContentCard } from "@/components/ContentCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import type { Content } from "@shared/schema";

export default function Search() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPlatform, setSelectedPlatform] = useState("all");
  const [selectedGenre, setSelectedGenre] = useState("all");
  const [viewMode, setViewMode] = useState<'cards' | 'guide'>('cards');

  // Fetch search results
  const { data: searchResults = [], isLoading, error } = useQuery({
    queryKey: ["/api/content", { search: searchQuery }],
    enabled: searchQuery.length > 0,
    retry: false,
  });

  // Fetch favorites for heart indicators
  const { data: favorites = [] } = useQuery({
    queryKey: ["/api/favorites"],
    retry: false,
  });

  if (!user) {
    return null;
  }

  const favoriteIds = (favorites as any[]).map((fav: any) => fav.contentId);

  // Filter results by platform and genre
  const filteredResults = (searchResults as Content[]).filter((item: Content) => {
    const platformMatch = selectedPlatform === "all" || item.service === selectedPlatform;
    const genreMatch = selectedGenre === "all" || item.genre === selectedGenre;
    return platformMatch && genreMatch;
  });

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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Search is triggered by the query change via useQuery
  };

  return (
    <div className="min-h-screen bg-navy text-cream w-full overflow-x-hidden" data-testid="page-search">
      <Header viewMode={viewMode} onViewModeChange={setViewMode} />
      <GenreBanner selectedGenre={selectedGenre} onGenreChange={setSelectedGenre} />
      
      <main className="px-2 py-4 w-full max-w-none">
        {/* Search Header */}
        <section className="mb-6">
          <form onSubmit={handleSearch} className="flex items-center space-x-4 mb-4">
            <div className="flex-1 relative">
              <Input
                type="text"
                placeholder="Search across all platforms..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-navy-light border-navy-lighter text-cream placeholder-gray-400 focus:border-blue-primary pl-4 pr-10"
                data-testid="input-search"
              />
              <SearchIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            </div>
            <Button 
              type="submit"
              className="bg-blue-gradient hover:opacity-90 transition-opacity px-6"
              data-testid="button-search"
            >
              Search
            </Button>
          </form>
          
          {/* Filters */}
          <div className="flex items-center space-x-3 text-xs">
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <span className="text-gray-400">Filter by:</span>
            </div>
            
            <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
              <SelectTrigger className="w-[180px] bg-navy-light border-navy-lighter text-cream">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-navy-light border-navy-lighter">
                {platforms.map((platform) => (
                  <SelectItem 
                    key={platform.value} 
                    value={platform.value}
                    className="text-cream hover:bg-navy-lighter"
                    data-testid={`option-platform-${platform.value}`}
                  >
                    {platform.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={selectedGenre} onValueChange={setSelectedGenre}>
              <SelectTrigger className="w-[150px] bg-navy-light border-navy-lighter text-cream">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-navy-light border-navy-lighter">
                {genres.map((genre) => (
                  <SelectItem 
                    key={genre.value} 
                    value={genre.value}
                    className="text-cream hover:bg-navy-lighter"
                    data-testid={`option-genre-${genre.value}`}
                  >
                    {genre.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </section>
        
        {/* Search Results */}
        <section>
          {searchQuery ? (
            <>
              <h2 className="text-lg font-bold text-cream mb-4" data-testid="heading-search-results">
                Search Results for "{searchQuery}"
              </h2>
              
              {isLoading && (
                <div className="text-center py-12" data-testid="loading-search">
                  <div className="animate-spin w-8 h-8 border-2 border-blue-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                  <p className="text-gray-400">Searching...</p>
                </div>
              )}
              
              {error && (
                <div className="text-center py-12" data-testid="error-search">
                  <p className="text-red-400 mb-2">Search failed</p>
                  <p className="text-gray-400 text-sm">Please try again</p>
                </div>
              )}
              
              {!isLoading && !error && (
                <>
                  {filteredResults.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4" data-testid="grid-search-results">
                      {filteredResults.map((item: Content) => (
                        <ContentCard
                          key={item.id}
                          content={item}
                          isFavorite={favoriteIds.includes(item.id)}
                          size="small"
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12" data-testid="no-search-results">
                      <SearchIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-lg text-gray-400 mb-2">No results found</p>
                      <p className="text-sm text-gray-500">
                        Try adjusting your search terms or filters
                      </p>
                    </div>
                  )}
                </>
              )}
            </>
          ) : (
            <div className="text-center py-12" data-testid="search-prompt">
              <SearchIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-cream mb-2">Search Across All Platforms</h2>
              <p className="text-gray-400 mb-4">
                Find movies, shows, and music from Netflix, Hulu, Spotify, and more
              </p>
              <p className="text-sm text-gray-500">
                Start typing to search across all your streaming platforms
              </p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
