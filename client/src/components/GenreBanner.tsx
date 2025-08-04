import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

interface GenreBannerProps {
  selectedGenre: string;
  onGenreChange: (genre: string) => void;
}

export function GenreBanner({ selectedGenre, onGenreChange }: GenreBannerProps) {
  const genres = [
    { key: 'all', label: 'All' },
    { key: 'movies', label: 'Movies' },
    { key: 'live-sports', label: 'Live Sports' },
    { key: 'live-tv', label: 'Live TV' },
    { key: 'reality-tv', label: 'Reality TV' },
    { key: 'documentaries', label: 'Documentaries' },
    { key: 'comedy', label: 'Comedy' },
    { key: 'music', label: 'Music' },
  ];

  return (
    <div className="bg-navy-light px-2 py-2 border-b border-navy-lighter" data-testid="genre-banner">
      <div className="max-w-screen-2xl mx-auto">
        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex items-center space-x-4">
            {genres.map((genre) => (
              <Button
                key={genre.key}
                variant={selectedGenre === genre.key ? "default" : "ghost"}
                size="sm"
                onClick={() => onGenreChange(genre.key)}
                className={`px-3 py-1 text-xs font-medium whitespace-nowrap transition-colors ${
                  selectedGenre === genre.key
                    ? 'bg-blue-gradient text-white hover:opacity-90'
                    : 'text-cream hover:text-blue-primary hover:bg-navy-lighter'
                }`}
                data-testid={`genre-${genre.key}`}
              >
                {genre.label}
              </Button>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>
    </div>
  );
}
