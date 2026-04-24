import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, SlidersHorizontal, Film, AlertCircle } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { ContentRow } from "@/components/ContentRow";
import { useAuth } from "@/hooks/useAuth";
import type { Content } from "@shared/schema";

// ---------------------------------------------------------------------------
// Supabase catalog types & adapter
// ---------------------------------------------------------------------------

interface CatalogItem {
  id: string;
  content_type: string;
  title: string;
  description: string | null;
  release_year: number | null;
  runtime_minutes: number | null;
  poster_url: string | null;
  backdrop_url: string | null;
  tmdb_id: number | null;
  imdb_id: string | null;
  original_title: string | null;
}

function adaptCatalogItem(item: CatalogItem): Content {
  return {
    id: item.id,
    title: item.title,
    description: item.description ?? "",
    type: item.content_type === "series" ? "show" : "movie",
    genre: item.content_type === "series" ? "drama" : "action",
    service: "catalog",
    serviceContentId: item.id,
    imageUrl: item.poster_url ?? "",
    rating: null,
    year: item.release_year ?? null,
    isLive: false,
    category: null,
    availability: null,
    createdAt: null,
    updatedAt: null,
    directUrl: null,
    posterSource: "tmdb",
    posterLocked: false,
    artist: null,
    album: null,
    duration: item.runtime_minutes ?? null,
  } as unknown as Content;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PLATFORMS = [
  { slug: "all", label: "All" },
  { slug: "netflix", label: "Netflix" },
  { slug: "hulu", label: "Hulu" },
  { slug: "disney-plus", label: "Disney+" },
  { slug: "prime-video", label: "Prime" },
  { slug: "max", label: "Max" },
  { slug: "apple-tv-plus", label: "Apple TV+" },
  { slug: "peacock", label: "Peacock" },
  { slug: "paramount-plus", label: "Paramount+" },
];

type SortOrder = "default" | "az" | "year-desc" | "year-asc";

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function RowSkeleton({ label }: { label: string }) {
  return (
    <section className="mb-6">
      <div className="h-5 w-32 bg-white/5 rounded mb-3 animate-pulse" />
      <div className="flex gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex-shrink-0 w-32 h-44 bg-white/5 rounded-lg animate-pulse"
            style={{ animationDelay: `${i * 60}ms` }}
          />
        ))}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function HomeV2() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [selectedPlatform, setSelectedPlatform] = useState("all");
  const [sortOrder, setSortOrder] = useState<SortOrder>("default");

  // Catalog query
  const {
    data: catalogResponse,
    isLoading,
    isError,
  } = useQuery<{ items: CatalogItem[] }>({
    queryKey: ["/api/catalog/items"],
    retry: false,
    staleTime: 0,
    refetchOnMount: true,
  });

  // Continue watching
  const { data: continueWatching = [] } = useQuery<any[]>({
    queryKey: ["/api/continue-watching"],
    retry: false,
  });

  // Favorites
  const { data: favorites = [] } = useQuery<any[]>({
    queryKey: ["/api/favorites"],
    retry: false,
  });

  const favoriteIds = (favorites as any[]).map((f: any) => f.contentId);

  // Adapt catalog items
  const allContent: Content[] = useMemo(
    () => (catalogResponse?.items ?? []).map(adaptCatalogItem),
    [catalogResponse]
  );

  // Apply search + sort
  const filtered = useMemo(() => {
    let base = allContent;
    if (search.trim()) {
      const q = search.toLowerCase();
      base = base.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          (c.description ?? "").toLowerCase().includes(q)
      );
    }
    // Platform filter is ready for future availability join; currently shows all.
    const sorted = [...base];
    if (sortOrder === "az")
      sorted.sort((a, b) => a.title.localeCompare(b.title));
    else if (sortOrder === "year-desc")
      sorted.sort((a, b) => (b.year ?? 0) - (a.year ?? 0));
    else if (sortOrder === "year-asc")
      sorted.sort((a, b) => (a.year ?? 0) - (b.year ?? 0));
    return sorted;
  }, [allContent, search, sortOrder]);

  const movies = filtered.filter((c) => c.type === "movie");
  const shows = filtered.filter((c) => c.type === "show");

  // "For You" — deterministic curation: mix of recent + older, movies + series,
  // only items with both a poster and a description, deduplicated, max 10.
  const forYou = useMemo(() => {
    const withAssets = allContent.filter(
      (c) => c.imageUrl && c.imageUrl.trim() !== "" && c.description && c.description.trim() !== ""
    );
    const recent = withAssets.filter((c) => (c.year ?? 0) >= 2020);
    const older  = withAssets.filter((c) => (c.year ?? 0)  < 2020);

    const recentMovies = recent.filter((c) => c.type === "movie");
    const recentShows  = recent.filter((c) => c.type === "show");
    const olderMovies  = older.filter((c)  => c.type === "movie");
    const olderShows   = older.filter((c)  => c.type === "show");

    // Interleave: 3 recent movies, 3 recent shows, 2 older movies, 2 older shows
    const picks = [
      ...recentMovies.slice(0, 3),
      ...recentShows.slice(0, 3),
      ...olderMovies.slice(0, 2),
      ...olderShows.slice(0, 2),
    ];

    // Deduplicate by id
    const seen = new Set<string>();
    const deduped = picks.filter((c) => {
      if (seen.has(c.id)) return false;
      seen.add(c.id);
      return true;
    });

    return deduped.slice(0, 10);
  }, [allContent]);

  const continueWatchingContent = (continueWatching as any[])
    .map((item: any) => item.content)
    .filter(Boolean);

  const hasContent = allContent.length > 0;
  const searchActive = search.trim().length > 0;
  const noSearchResults = searchActive && filtered.length === 0;

  if (!user) return null;

  return (
    <div
      className="min-h-screen bg-navy text-cream"
      data-testid="page-home-v2"
    >
      {/* ------------------------------------------------------------------ */}
      {/* Top nav                                                             */}
      {/* ------------------------------------------------------------------ */}
      <header className="sticky top-0 z-30 bg-navy/95 backdrop-blur-sm border-b border-white/5 px-6 py-3 flex items-center gap-4">
        <Logo size="small" className="flex-shrink-0" />

        {/* Search input */}
        <div className="flex-1 max-w-sm relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search movies and shows…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-navy-light text-cream placeholder-gray-500 rounded-full pl-9 pr-4 py-2 text-sm border border-white/10 focus:outline-none focus:border-blue-primary transition-colors"
          />
        </div>

        {/* User avatar */}
        <div className="ml-auto">
          <div className="w-8 h-8 rounded-full bg-blue-primary/20 border border-blue-primary/30 flex items-center justify-center text-xs font-bold text-blue-primary select-none">
            {(
              (user as any).firstName?.[0] ??
              (user as any).claims?.name?.[0] ??
              "U"
            ).toUpperCase()}
          </div>
        </div>
      </header>

      {/* ------------------------------------------------------------------ */}
      {/* Hero                                                                */}
      {/* ------------------------------------------------------------------ */}
      {!searchActive && (
        <section className="relative overflow-hidden px-6 py-14 flex flex-col items-center text-center bg-gradient-to-b from-[#0d1b2a] to-navy">
          {/* Subtle radial glow */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(59,130,246,0.13),transparent_65%)] pointer-events-none" />

          <div className="relative z-10 max-w-2xl mx-auto">
            <p className="text-blue-primary text-xs font-semibold uppercase tracking-widest mb-3">
              Your unified streaming control center
            </p>
            <h1 className="text-4xl md:text-5xl font-black text-cream leading-tight mb-4">
              TV was broken.
              <br />
              We fixed it.
            </h1>
            <p className="text-gray-400 text-base md:text-lg leading-relaxed mb-8 max-w-lg mx-auto">
              One screen for Netflix, Hulu, Disney+, Prime, and everything else
              you subscribe to. No app-switching. No searching across six
              remotes. Just your content, instantly.
            </p>

            {/* Platform badge strip */}
            <div className="flex flex-wrap justify-center gap-2">
              {[
                "Netflix",
                "Hulu",
                "Disney+",
                "Prime Video",
                "Max",
                "Apple TV+",
                "Peacock",
                "Paramount+",
              ].map((name) => (
                <span
                  key={name}
                  className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-gray-400"
                >
                  {name}
                </span>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Filter bar                                                          */}
      {/* ------------------------------------------------------------------ */}
      <div className="px-6 py-4 border-b border-white/5 flex flex-col gap-3">
        {/* Platform pills */}
        <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-hide">
          {PLATFORMS.map((p) => (
            <button
              key={p.slug}
              onClick={() => setSelectedPlatform(p.slug)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                selectedPlatform === p.slug
                  ? "bg-blue-primary text-white"
                  : "bg-navy-light text-gray-400 hover:text-cream"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Sort control */}
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
          <span className="text-xs text-gray-500">Sort:</span>
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as SortOrder)}
            className="text-xs bg-navy-light text-cream border border-white/10 rounded px-2 py-1 cursor-pointer focus:outline-none"
          >
            <option value="default">Default</option>
            <option value="az">A – Z</option>
            <option value="year-desc">Newest first</option>
            <option value="year-asc">Oldest first</option>
          </select>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Main content                                                        */}
      {/* ------------------------------------------------------------------ */}
      <main className="px-4 py-6 pb-24">
        {/* Loading state */}
        {isLoading && (
          <>
            <RowSkeleton label="For You" />
            <RowSkeleton label="Movies" />
            <RowSkeleton label="TV Shows" />
          </>
        )}

        {/* Error state */}
        {isError && !isLoading && (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
            <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center">
              <AlertCircle className="w-7 h-7 text-red-400" />
            </div>
            <div>
              <p className="text-cream font-semibold mb-1">
                Couldn't load catalog
              </p>
              <p className="text-gray-500 text-sm max-w-xs">
                There was a problem connecting to the content service. Try
                refreshing the page.
              </p>
            </div>
          </div>
        )}

        {/* Empty catalog state */}
        {!isLoading && !isError && !hasContent && (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
            <div className="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center">
              <Film className="w-7 h-7 text-gray-500" />
            </div>
            <div>
              <p className="text-cream font-semibold mb-1">No content yet</p>
              <p className="text-gray-500 text-sm">
                Run the catalog seed script to populate your library.
              </p>
            </div>
          </div>
        )}

        {/* No search results state */}
        {!isLoading && !isError && noSearchResults && (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <Search className="w-8 h-8 text-gray-600" />
            <p className="text-cream font-semibold">
              No results for &ldquo;{search}&rdquo;
            </p>
            <p className="text-gray-500 text-sm">
              Try different keywords or clear the search.
            </p>
          </div>
        )}

        {/* Content rows */}
        {!isLoading && !isError && hasContent && !noSearchResults && (
          <>
            {/* Continue Watching */}
            {continueWatchingContent.length > 0 && (
              <ContentRow
                title="Continue Watching"
                content={continueWatchingContent}
                watchHistory={continueWatching as any[]}
                favorites={favoriteIds}
                showProgress
                size="medium"
              />
            )}

            {/* For You — newest releases, not affected by search/sort */}
            {!searchActive && forYou.length > 0 && (
              <ContentRow
                title="For You"
                content={forYou}
                favorites={favoriteIds}
                size="small"
              />
            )}

            {/* Movies */}
            {movies.length > 0 && (
              <ContentRow
                title="Movies"
                content={movies}
                favorites={favoriteIds}
                size="small"
              />
            )}

            {/* TV Shows */}
            {shows.length > 0 && (
              <ContentRow
                title="TV Shows"
                content={shows}
                favorites={favoriteIds}
                size="small"
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}
