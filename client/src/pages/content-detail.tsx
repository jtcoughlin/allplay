import { useParams, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Heart, Play, AlertCircle, Film } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";

interface CatalogItemDetail {
  id: string;
  content_type: string;
  title: string;
  original_title: string | null;
  description: string | null;
  release_year: number | null;
  runtime_minutes: number | null;
  poster_url: string | null;
  backdrop_url: string | null;
  tmdb_id: number | null;
  imdb_id: string | null;
  season_number: number | null;
  episode_number: number | null;
  parent_series_id: string | null;
}

interface AvailabilityRow {
  id: string;
  is_available: boolean;
  availability_type: string;
  deep_link_url: string | null;
  web_link_url: string | null;
  region_code: string;
  quality_label: string | null;
  price_numeric: number | null;
  currency_code: string | null;
  last_verified_at: string;
  platforms: {
    id: string;
    slug: string;
    name: string;
    logo_url: string | null;
    website_url: string | null;
    deep_link_base: string | null;
  } | null;
}

interface AvailabilityResponse {
  content_item_id: string;
  region: string;
  availability: AvailabilityRow[];
}

interface FavoriteRow {
  contentId: string;
}

export default function ContentDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const {
    data: item,
    isLoading: itemLoading,
    isError: itemIsError,
    error: itemError,
  } = useQuery<CatalogItemDetail>({
    queryKey: [`/api/catalog/items/${id}`],
    queryFn: async () => {
      const res = await fetch(`/api/catalog/items/${id}`);
      if (!res.ok) {
        if (res.status === 404) throw new Error("404: Content item not found");
        throw new Error(`Failed to fetch item: ${res.status}`);
      }
      return res.json();
    },
    retry: false,
    enabled: !!id,
  });

  const { data: availabilityResp, isLoading: avLoading } =
    useQuery<AvailabilityResponse>({
      queryKey: [`/api/catalog/items/${id}/availability`],
      queryFn: async () => {
        const res = await fetch(`/api/catalog/items/${id}/availability`);
        if (!res.ok) throw new Error(`Failed to fetch availability: ${res.status}`);
        return res.json();
      },
      retry: false,
      enabled: !!id,
    });

  const { data: favorites = [] } = useQuery<FavoriteRow[]>({
    queryKey: ["/api/favorites"],
    retry: false,
  });

  const isFavorite = favorites.some((f) => f.contentId === id);
  const allAvailability = availabilityResp?.availability ?? [];
  const subscriptionAvailability = allAvailability.filter(
    (a) => a.availability_type === "subscription"
  );

  const toggleFavoriteMutation = useMutation({
    mutationFn: async () => {
      if (isFavorite) {
        await apiRequest("DELETE", `/api/favorites/${id}`);
      } else {
        await apiRequest("POST", "/api/favorites", { contentId: id });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/favorites"] });
      toast({
        title: isFavorite ? "Removed from favorites" : "Added to favorites",
        description: item?.title,
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error as Error)) {
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
        description: "Failed to update favorites",
        variant: "destructive",
      });
    },
  });

  if (!user) return null;

  if (itemLoading) {
    return (
      <div
        className="min-h-screen bg-navy text-cream flex items-center justify-center"
        data-testid="loading-content-detail"
      >
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-blue-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-400">Loading details…</p>
        </div>
      </div>
    );
  }

  if (itemIsError || !item) {
    const errorMessage = (itemError as Error | null)?.message ?? "";
    const is404 = /404|not found/i.test(errorMessage);
    return (
      <div
        className="min-h-screen bg-navy text-cream"
        data-testid={is404 ? "error-not-found" : "error-content-detail"}
      >
        <header className="sticky top-0 z-30 bg-navy/95 backdrop-blur-sm border-b border-white/5 px-6 py-3 flex items-center gap-4">
          <Link href="/">
            <Button
              variant="ghost"
              size="sm"
              className="text-cream hover:text-blue-primary"
              data-testid="button-back"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to home
            </Button>
          </Link>
        </header>
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-center px-6">
          <div
            className={`w-14 h-14 rounded-full flex items-center justify-center ${
              is404 ? "bg-white/5" : "bg-red-500/10"
            }`}
          >
            {is404 ? (
              <Film className="w-7 h-7 text-gray-400" />
            ) : (
              <AlertCircle className="w-7 h-7 text-red-400" />
            )}
          </div>
          <div>
            <p className="text-cream font-semibold mb-1">
              {is404 ? "Content not found" : "Couldn't load this title"}
            </p>
            <p className="text-gray-500 text-sm max-w-xs">
              {is404
                ? "This title isn't in the catalog. It may have been removed."
                : "There was a problem fetching this title. Try refreshing the page."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-navy text-cream"
      data-testid="page-content-detail"
    >
      <header className="sticky top-0 z-30 bg-navy/95 backdrop-blur-sm border-b border-white/5 px-6 py-3 flex items-center gap-4">
        <Link href="/">
          <Button
            variant="ghost"
            size="sm"
            className="text-cream hover:text-blue-primary"
            data-testid="button-back"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </Link>
        <Logo size="small" />
      </header>

      <section className="relative">
        {item.backdrop_url ? (
          <div className="relative h-72 md:h-96 overflow-hidden">
            <img
              src={item.backdrop_url}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
              data-testid="img-backdrop"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-navy via-navy/60 to-transparent" />
          </div>
        ) : (
          <div className="h-72 md:h-96 bg-gradient-to-b from-[#0d1b2a] to-navy" />
        )}

        <div className="relative -mt-32 px-6 max-w-4xl mx-auto pb-16">
          {item.poster_url && (
            <img
              src={item.poster_url}
              alt={item.title}
              className="w-32 md:w-40 rounded-lg shadow-lg shadow-black/50 mb-4"
              data-testid="img-poster"
            />
          )}

          <h1
            className="text-3xl md:text-5xl font-black text-cream mb-2"
            data-testid="text-title"
          >
            {item.title}
          </h1>

          <p
            className="text-gray-400 text-sm md:text-base flex flex-wrap gap-2 items-center mb-6"
            data-testid="text-meta"
          >
            <span>{item.content_type === "series" ? "Series" : "Movie"}</span>
            {item.release_year != null && (
              <>
                <span>·</span>
                <span>{item.release_year}</span>
              </>
            )}
            {item.runtime_minutes != null && (
              <>
                <span>·</span>
                <span>{item.runtime_minutes} min</span>
              </>
            )}
          </p>

          <div className="flex flex-wrap gap-3 items-center mb-8">
            <Button
              onClick={() => toggleFavoriteMutation.mutate()}
              disabled={toggleFavoriteMutation.isPending}
              variant="outline"
              className="border-white/20 text-cream hover:bg-white/10"
              data-testid="button-favorite"
            >
              <Heart
                className={`w-4 h-4 mr-2 ${
                  isFavorite ? "fill-red-400 text-red-400" : ""
                }`}
              />
              {isFavorite ? "In favorites" : "Add to favorites"}
            </Button>

            {avLoading ? (
              <span
                className="text-gray-500 text-sm"
                data-testid="text-availability-loading"
              >
                Loading availability…
              </span>
            ) : subscriptionAvailability.length > 0 ? (
              subscriptionAvailability.map((a) => {
                const url =
                  a.deep_link_url || a.web_link_url || a.platforms?.website_url;
                const disabled = !url;
                const label = a.platforms?.name || a.platforms?.slug || "Platform";
                const slugTag = a.platforms?.slug ?? a.id;
                return (
                  <Button
                    key={a.id}
                    onClick={() => {
                      if (url) window.open(url, "_blank", "noopener,noreferrer");
                    }}
                    disabled={disabled}
                    className={`bg-blue-primary hover:bg-blue-600 text-white ${
                      disabled ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                    data-testid={`button-watch-${slugTag}`}
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Watch on {label}
                  </Button>
                );
              })
            ) : (
              <span
                className="text-gray-400 text-sm italic"
                data-testid="text-no-availability"
              >
                Not currently streaming in the US
              </span>
            )}
          </div>

          {item.description && (
            <div className="max-w-2xl">
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Overview
              </h2>
              <p
                className="text-cream leading-relaxed"
                data-testid="text-description"
              >
                {item.description}
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
