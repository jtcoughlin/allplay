import { MediaCard } from '@/components/MediaCard';

export function MediaCardTest() {
  const testMovies = [
    {
      movieId: 550, // Fight Club
      title: "Fight Club",
      genre: "Drama",
      year: 1999,
      rating: 8.8,
      service: "netflix"
    },
    {
      movieId: 157336, // Interstellar
      title: "Interstellar", 
      genre: "Sci-Fi",
      year: 2014,
      rating: 8.6,
      service: "amazon-prime"
    },
    {
      movieId: 13, // Forrest Gump
      title: "Forrest Gump",
      genre: "Drama",
      year: 1994,
      rating: 8.8,
      service: "hulu"
    },
    {
      movieId: 278, // The Shawshank Redemption
      title: "The Shawshank Redemption",
      genre: "Drama", 
      year: 1994,
      rating: 9.3,
      service: "hbo-max"
    },
    {
      movieId: 238, // The Godfather
      title: "The Godfather",
      genre: "Crime",
      year: 1972,
      rating: 9.2,
      service: "paramount-plus"
    },
    {
      movieId: 424, // Schindler's List
      title: "Schindler's List",
      genre: "Drama",
      year: 1993,
      rating: 9.0,
      service: "apple-tv"
    }
  ];

  const handlePlay = (title: string) => {
    console.log(`🎬 Playing: ${title}`);
    alert(`Now playing: ${title}`);
  };

  const handleToggleFavorite = (title: string, isFavorite: boolean) => {
    console.log(`❤️ ${isFavorite ? 'Removed from' : 'Added to'} favorites: ${title}`);
  };

  return (
    <div className="min-h-screen bg-navy-darker text-white p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-cream mb-4">
            🎬 TMDb MediaCard Test
          </h1>
          <p className="text-gray-300 text-lg mb-2">
            Testing the new MediaCard component with real TMDb API integration
          </p>
          <p className="text-gray-400 text-sm">
            Each card fetches poster images directly from TMDb using the useTMDbPoster hook
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
          {testMovies.map((movie, index) => (
            <MediaCard
              key={movie.movieId}
              movieId={movie.movieId}
              title={movie.title}
              genre={movie.genre}
              year={movie.year}
              rating={movie.rating}
              service={movie.service}
              size="medium"
              onPlay={() => handlePlay(movie.title)}
              onToggleFavorite={() => handleToggleFavorite(movie.title, false)}
              isFavorite={false}
            />
          ))}
        </div>

        <div className="mt-12 p-6 bg-gray-800/50 rounded-lg">
          <h2 className="text-xl font-semibold text-cream mb-3">
            🔍 Debug Information
          </h2>
          <p className="text-gray-300 text-sm mb-2">
            Open browser console (F12 → Console) to see detailed logging:
          </p>
          <ul className="text-gray-400 text-sm list-disc list-inside space-y-1">
            <li><span className="text-green-400">✅ Image loaded successfully</span> - When posters load</li>
            <li><span className="text-red-400">❌ Image failed to load</span> - When posters fail</li>
            <li><span className="text-blue-400">🎬 Playing</span> - When play button clicked</li>
            <li><span className="text-pink-400">❤️ Added to favorites</span> - When favorite button clicked</li>
          </ul>
        </div>

        <div className="mt-8 p-6 bg-blue-900/30 rounded-lg border border-blue-700/50">
          <h2 className="text-xl font-semibold text-blue-200 mb-3">
            ⚙️ Implementation Features
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h3 className="font-semibold text-blue-300 mb-2">✅ API Integration</h3>
              <ul className="text-gray-300 space-y-1">
                <li>• Direct TMDb API calls using movie IDs</li>
                <li>• <code className="bg-gray-700 px-1 rounded">/movie/{'{'}movieId{'}'}</code> endpoint</li>
                <li>• Full image URL construction</li>
                <li>• Cache busting with <code className="bg-gray-700 px-1 rounded">?v=timestamp</code></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-blue-300 mb-2">🎣 useTMDbPoster Hook</h3>
              <ul className="text-gray-300 space-y-1">
                <li>• Returns imageUrl, loading, error states</li>
                <li>• Prevents re-fetch unless movieId changes</li>
                <li>• Proper error handling with try/catch</li>
                <li>• Console logging for debugging</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}