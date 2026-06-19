import { EnhancedLiveTVGuide } from "@/components/EnhancedLiveTVGuide";
import { useAuth } from "@/hooks/useAuth";
import type { Content } from "@shared/schema";

export default function LiveTV() {
  const { user } = useAuth();

  if (!user) return null;

  const handlePlay = (content: Content) => {
    if (content.directUrl) {
      window.open(content.directUrl, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div className="min-h-screen bg-navy text-cream p-6" data-testid="page-live-tv">
      <div className="h-[calc(100vh-3rem)]">
        <EnhancedLiveTVGuide
          content={[]}
          favorites={[]}
          onPlay={handlePlay}
        />
      </div>
    </div>
  );
}
