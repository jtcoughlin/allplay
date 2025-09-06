/**
 * Static mapping for popular recurring YouTube TV shows
 * This provides immediate poster coverage for well-known programs
 */

interface StaticShowMapping {
  title: string;
  imageUrl: string;
  channel: string;
  priority: number; // Higher = more reliable/popular
  pinned?: boolean; // If true, this mapping should never be overwritten
}

class YouTubeTVStaticMapping {
  // High-quality static mappings for popular recurring shows
  private static readonly SHOW_MAPPINGS: StaticShowMapping[] = [
    // ESPN Sports Programming
    {
      title: 'First Take',
      imageUrl: 'https://image.tmdb.org/t/p/w500/8wOHyS55J7mFClQs5i8ykVgTvhe.jpg',
      channel: 'ESPN',
      priority: 10
    },
    {
      title: 'The Herd with Colin Cowherd',
      imageUrl: 'https://image.tmdb.org/t/p/w500/x8KJvOQ8Dh7wYqGCFi4wV6u9bHN.jpg',
      channel: 'ESPN',
      priority: 9
    },
    {
      title: 'SportsCenter',
      imageUrl: 'https://image.tmdb.org/t/p/w500/6aQBiE3zepieX0TRKfBhN9PjOMk.jpg',
      channel: 'ESPN',
      priority: 10
    },
    {
      title: 'NFL Live',
      imageUrl: 'https://image.tmdb.org/t/p/w500/r8nMSHcP3lFpEfnLGdO0OGm3k4t.jpg',
      channel: 'ESPN',
      priority: 8
    },
    {
      title: 'College GameDay',
      imageUrl: 'https://image.tmdb.org/t/p/w500/kF8fCjn9xV2h6G7t3vB2LJo4RJh.jpg',
      channel: 'ESPN',
      priority: 8
    },
    // PERMANENTLY PINNED: ESPN+ 30 for 30 Series (DO NOT OVERRIDE)
    {
      title: '30 for 30',
      imageUrl: 'https://image.tmdb.org/t/p/w500/zwK8AWvmoxbIrvO0TRKzkZN5nG3.jpg',
      channel: 'ESPN+',
      priority: 100, // PINNED: Permanent priority
      pinned: true
    },
    {
      title: '30 for 30: Broke',
      imageUrl: 'https://image.tmdb.org/t/p/w500/zwK8AWvmoxbIrvO0TRKzkZN5nG3.jpg',
      channel: 'ESPN+',
      priority: 100, // PINNED: Permanent priority  
      pinned: true
    },
    {
      title: '30 for 30: The Tuck Rule',
      imageUrl: 'https://image.tmdb.org/t/p/w500/zwK8AWvmoxbIrvO0TRKzkZN5nG3.jpg',
      channel: 'ESPN+',
      priority: 100, // PINNED: Permanent priority
      pinned: true
    },

    // News Programming  
    {
      title: 'Good Morning America',
      imageUrl: 'https://image.tmdb.org/t/p/w500/72c5P7nWHtGTWLwbL9TK5bhfDL.jpg',
      channel: 'ABC',
      priority: 9
    },
    {
      title: 'ABC World News Tonight',
      imageUrl: 'https://image.tmdb.org/t/p/w500/8LzGDpKyWfxJBUPLH4pRm7A4pEh.jpg',
      channel: 'ABC',
      priority: 8
    },
    {
      title: 'NBC Nightly News',
      imageUrl: 'https://image.tmdb.org/t/p/w500/qZR5W3Y7PFJn2EK8rkPEw2qRLBs.jpg',
      channel: 'NBC',
      priority: 8
    },
    {
      title: 'CBS Evening News',
      imageUrl: 'https://image.tmdb.org/t/p/w500/ynVi4Cphg6RnlrKgrZXG1vw3ZXz.jpg',
      channel: 'CBS',
      priority: 8
    },
    {
      title: 'CNN Newsroom',
      imageUrl: 'https://image.tmdb.org/t/p/w500/mR8V7nqk4qhDU7v2C8e2QjKlKBu.jpg',
      channel: 'CNN',
      priority: 8
    },
    // PERMANENTLY PINNED: User-specified critical mappings (DO NOT OVERRIDE)
    {
      title: 'Tucker Carlson Tonight',
      imageUrl: 'https://image.tmdb.org/t/p/w500/4FzNhvKRrZ4jQQELJLQKA0N5qs7.jpg',
      channel: 'FOX News',
      priority: 100, // PINNED: Permanent priority
      pinned: true
    },
    {
      title: 'Anderson Cooper 360',
      imageUrl: 'https://image.tmdb.org/t/p/w500/mJ8KVOHqEBDGV2BTDwEEj3R9ykN.jpg', 
      channel: 'CNN',
      priority: 100, // PINNED: Permanent priority
      pinned: true
    },

    // Talk Shows
    {
      title: 'The Late Show with Stephen Colbert',
      imageUrl: 'https://image.tmdb.org/t/p/w500/9jkThAGYj2yp8jsS6Nriy5mzKFT.jpg',
      channel: 'CBS',
      priority: 9
    },
    {
      title: 'The Tonight Show Starring Jimmy Fallon',
      imageUrl: 'https://image.tmdb.org/t/p/w500/g4amTJGvinvJDTFCwIoR8TnmzaP.jpg',
      channel: 'NBC',
      priority: 9
    },
    {
      title: 'Saturday Night Live',
      imageUrl: 'https://image.tmdb.org/t/p/w500/sHGuKFjIBisPGWciMXrdGUP9t6.jpg',
      channel: 'NBC',
      priority: 10
    },

    // Game Shows & Daytime
    {
      title: 'The Price is Right',
      imageUrl: 'https://image.tmdb.org/t/p/w500/8yU7WnhQJR5WUO4c1NrW8A1e9R8.jpg',
      channel: 'CBS',
      priority: 9
    },
    {
      title: 'Wheel of Fortune',
      imageUrl: 'https://image.tmdb.org/t/p/w500/2fEuaE6YAHFrZbJVNOvYrJkIqI7.jpg',
      channel: 'Syndicated',
      priority: 9
    },
    {
      title: 'Jeopardy!',
      imageUrl: 'https://image.tmdb.org/t/p/w500/fHZHlDKfB6mT4I9YrUamn3GQhd9.jpg',
      channel: 'Syndicated',
      priority: 10
    },

    // Soap Operas
    {
      title: 'General Hospital',
      imageUrl: 'https://image.tmdb.org/t/p/w500/zHqZ5YSTNppF5N5BFVMZ5IFNtOM.jpg',
      channel: 'ABC',
      priority: 7
    },
    {
      title: 'The Young and the Restless',
      imageUrl: 'https://image.tmdb.org/t/p/w500/fCJDHyHNFHhfWtZlwW3ywV8EQ7e.jpg',
      channel: 'CBS',
      priority: 7
    },

    // Lifestyle & Reality
    {
      title: 'The View',
      imageUrl: 'https://image.tmdb.org/t/p/w500/2L2xhJQz3KFx4YkgT7NKtgGqNE8.jpg',
      channel: 'ABC',
      priority: 8
    },
    {
      title: 'The Ellen DeGeneres Show',
      imageUrl: 'https://image.tmdb.org/t/p/w500/78FhyuyhKWmdSJRnOGiLdnYGjn.jpg',
      channel: 'Syndicated',
      priority: 8
    },

    // Kids Programming
    {
      title: 'SpongeBob SquarePants',
      imageUrl: 'https://image.tmdb.org/t/p/w500/amvtZgiTty0GHIgD56gpouBWrcy.jpg',
      channel: 'Nickelodeon',
      priority: 10
    },
    {
      title: 'Peppa Pig',
      imageUrl: 'https://image.tmdb.org/t/p/w500/jMJIRqKOr6d6AYp1MkmAGPq7qLs.jpg',
      channel: 'Nick Jr.',
      priority: 9
    },

    // Comedy/Sitcoms
    {
      title: 'The Big Bang Theory',
      imageUrl: 'https://image.tmdb.org/t/p/w500/ooBGRQBdbGzBxAVfExiO8r7kloA.jpg',
      channel: 'TBS',
      priority: 10
    },
    {
      title: 'Friends',
      imageUrl: 'https://image.tmdb.org/t/p/w500/f496cm9enuEsZkSPzCwnTESEK5s.jpg',
      channel: 'TBS',
      priority: 10
    },
    {
      title: 'The Office',
      imageUrl: 'https://image.tmdb.org/t/p/w500/7DKe7Ey5hT4w8VJdIE0OT5Q8mfX.jpg',
      channel: 'TBS',
      priority: 10
    },

    // Food/Cooking
    {
      title: 'Chopped',
      imageUrl: 'https://image.tmdb.org/t/p/w500/dWNhp2CPEkfwTXO4eAZ7pQwuK0e.jpg',
      channel: 'Food Network',
      priority: 8
    },
    {
      title: 'Guy\'s Grocery Games',
      imageUrl: 'https://image.tmdb.org/t/p/w500/uBwF5b9qK5EjVcKGUv8U4rTcQu2.jpg',
      channel: 'Food Network',
      priority: 8
    },

    // Home/Lifestyle
    {
      title: 'Property Brothers',
      imageUrl: 'https://image.tmdb.org/t/p/w500/3aVH5x84MwqjnTjKMz7D2ZH0pQ1.jpg',
      channel: 'HGTV',
      priority: 8
    },
    {
      title: 'Fixer Upper',
      imageUrl: 'https://image.tmdb.org/t/p/w500/sj2l4H8bYBKl8rCkOEEYfD4F8YF.jpg',
      channel: 'HGTV',
      priority: 8
    },

    // Investigation/Documentary
    {
      title: 'Dateline NBC',
      imageUrl: 'https://image.tmdb.org/t/p/w500/zGVzUGCXFdX8nCB2S5l5nRmDjP3.jpg',
      channel: 'NBC',
      priority: 8
    },
    {
      title: '48 Hours',
      imageUrl: 'https://image.tmdb.org/t/p/w500/aHV8GUq6JY8JEZ1v5nZRJWbLWHu.jpg',
      channel: 'CBS',
      priority: 8
    }
  ];

  /**
   * Get static poster for a show if available
   */
  static getStaticPoster(showTitle: string): string | null {
    const mapping = this.getStaticMapping(showTitle);
    return mapping ? mapping.imageUrl : null;
  }

  /**
   * Get full static mapping for a show if available
   */
  static getStaticMapping(showTitle: string): StaticShowMapping | null {
    const normalized = this.normalizeTitle(showTitle);
    
    const match = this.SHOW_MAPPINGS.find(mapping => {
      const mappingNormalized = this.normalizeTitle(mapping.title);
      return mappingNormalized === normalized || 
             normalized.includes(mappingNormalized) ||
             mappingNormalized.includes(normalized);
    });

    if (match) {
      console.log(`📍 Static mapping found: ${showTitle} -> ${match.title} (${match.channel})`);
      return match;
    }

    return null;
  }

  /**
   * Get all static mappings for analysis
   */
  static getAllMappings(): StaticShowMapping[] {
    return [...this.SHOW_MAPPINGS];
  }

  /**
   * Normalize title for better matching
   */
  private static normalizeTitle(title: string): string {
    return title.toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove special characters
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  /**
   * Check if a title has a static mapping
   */
  static hasStaticMapping(showTitle: string): boolean {
    return this.getStaticPoster(showTitle) !== null;
  }

  /**
   * Get mapping statistics
   */
  static getStats() {
    const channels = new Set(this.SHOW_MAPPINGS.map(m => m.channel));
    return {
      totalMappings: this.SHOW_MAPPINGS.length,
      uniqueChannels: channels.size,
      channels: Array.from(channels)
    };
  }
}

export { YouTubeTVStaticMapping, StaticShowMapping };