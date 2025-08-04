import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { ContentCard } from "./ContentCard";
import type { Content, WatchHistory } from "@shared/schema";

interface ContentRowProps {
  title: string;
  content: Content[];
  watchHistory?: WatchHistory[];
  favorites?: string[];
  showProgress?: boolean;
  size?: 'small' | 'medium' | 'large';
}

export function ContentRow({ 
  title, 
  content, 
  watchHistory = [], 
  favorites = [], 
  showProgress = false,
  size = 'medium' 
}: ContentRowProps) {
  if (content.length === 0) {
    return null;
  }

  const getWatchHistoryForContent = (contentId: string) => {
    return watchHistory.find(wh => wh.contentId === contentId);
  };

  const isFavorite = (contentId: string) => {
    return favorites.includes(contentId);
  };

  return (
    <section className="mb-6" data-testid={`section-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-bold text-cream" data-testid={`heading-${title.toLowerCase().replace(/\s+/g, '-')}`}>
          {title}
        </h2>
        <Button 
          variant="ghost" 
          size="sm"
          className="text-blue-primary text-xs hover:text-blue-secondary transition-colors h-auto p-1"
          data-testid={`button-see-all-${title.toLowerCase().replace(/\s+/g, '-')}`}
        >
          See All
        </Button>
      </div>
      
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex space-x-4 pb-4">
          {content.map((item) => (
            <ContentCard
              key={item.id}
              content={item}
              watchHistory={getWatchHistoryForContent(item.id)}
              isFavorite={isFavorite(item.id)}
              size={size}
              showProgress={showProgress}
            />
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </section>
  );
}
