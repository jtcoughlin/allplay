import fetch from 'node-fetch';

export interface MusicArtworkResult {
  albumCover?: string;
  artistImage?: string;
  thumbnailUrl?: string;
  highResUrl?: string;
}

export interface SpotifyTrack {
  name: string;
  artists: { name: string }[];
  album: {
    name: string;
    images: { url: string; height: number; width: number }[];
  };
}

export interface SpotifyArtist {
  name: string;
  images: { url: string; height: number; width: number }[];
}

export interface CoverArtArchiveResponse {
  images: {
    image: string;
    thumbnails: {
      small: string;
      large: string;
      '250': string;
      '500': string;
      '1200': string;
    };
    front: boolean;
    types: string[];
  }[];
}

export class MusicArtworkService {
  private readonly spotifyClientId: string;
  private readonly spotifyClientSecret: string;
  private spotifyAccessToken: string | null = null;
  private tokenExpiryTime: number = 0;

  constructor() {
    this.spotifyClientId = process.env.SPOTIFY_CLIENT_ID || '';
    this.spotifyClientSecret = process.env.SPOTIFY_CLIENT_SECRET || '';
  }

  /**
   * Get Spotify access token using client credentials flow
   */
  private async getSpotifyAccessToken(): Promise<string | null> {
    try {
      // Check if current token is still valid
      if (this.spotifyAccessToken && Date.now() < this.tokenExpiryTime) {
        return this.spotifyAccessToken;
      }

      if (!this.spotifyClientId || !this.spotifyClientSecret) {
        console.log('Spotify credentials not configured');
        return null;
      }

      const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${Buffer.from(`${this.spotifyClientId}:${this.spotifyClientSecret}`).toString('base64')}`
        },
        body: 'grant_type=client_credentials'
      });

      if (!response.ok) {
        console.error('Failed to get Spotify access token:', response.status);
        return null;
      }

      const data = await response.json() as any;
      this.spotifyAccessToken = data.access_token;
      this.tokenExpiryTime = Date.now() + (data.expires_in * 1000) - 60000; // Refresh 1 minute early

      return this.spotifyAccessToken;
    } catch (error) {
      console.error('Error getting Spotify access token:', error);
      return null;
    }
  }

  /**
   * Search for artwork using Spotify API
   */
  async searchSpotifyArtwork(artist: string, track?: string, album?: string): Promise<MusicArtworkResult | null> {
    try {
      const accessToken = await this.getSpotifyAccessToken();
      if (!accessToken) {
        return null;
      }

      let searchQuery = `artist:"${artist}"`;
      if (track) {
        searchQuery += ` track:"${track}"`;
      } else if (album) {
        searchQuery += ` album:"${album}"`;
      }

      // Search for tracks first to get album artwork
      const trackResponse = await fetch(
        `https://api.spotify.com/v1/search?q=${encodeURIComponent(searchQuery)}&type=track&limit=1`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      let albumCover: string | undefined;
      if (trackResponse.ok) {
        const trackData = await trackResponse.json() as any;
        if (trackData.tracks?.items?.length > 0) {
          const trackItem = trackData.tracks.items[0] as SpotifyTrack;
          if (trackItem.album.images.length > 0) {
            // Get the largest available image
            albumCover = trackItem.album.images[0].url;
          }
        }
      }

      // Search for artist to get artist image
      const artistResponse = await fetch(
        `https://api.spotify.com/v1/search?q=${encodeURIComponent(`artist:"${artist}"`)}&type=artist&limit=1`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      let artistImage: string | undefined;
      if (artistResponse.ok) {
        const artistData = await artistResponse.json() as any;
        if (artistData.artists?.items?.length > 0) {
          const artistItem = artistData.artists.items[0] as SpotifyArtist;
          if (artistItem.images.length > 0) {
            // Get the largest available image
            artistImage = artistItem.images[0].url;
          }
        }
      }

      return {
        albumCover,
        artistImage,
        highResUrl: albumCover || artistImage,
        thumbnailUrl: albumCover || artistImage
      };
    } catch (error) {
      console.error('Error searching Spotify artwork:', error);
      return null;
    }
  }

  /**
   * Search for album artwork using Cover Art Archive (MusicBrainz)
   * This is free and unlimited but requires MusicBrainz ID
   */
  async searchCoverArtArchive(mbid: string): Promise<MusicArtworkResult | null> {
    try {
      const response = await fetch(`https://coverartarchive.org/release/${mbid}`);
      
      if (!response.ok) {
        return null;
      }

      const data = await response.json() as CoverArtArchiveResponse;
      
      if (data.images && data.images.length > 0) {
        // Find the front cover
        const frontCover = data.images.find(img => img.front) || data.images[0];
        
        return {
          albumCover: frontCover.image,
          highResUrl: frontCover.image,
          thumbnailUrl: frontCover.thumbnails?.['500'] || frontCover.thumbnails?.large || frontCover.image
        };
      }

      return null;
    } catch (error) {
      console.error('Error searching Cover Art Archive:', error);
      return null;
    }
  }

  /**
   * Search for music artwork using multiple sources
   */
  async searchMusicArtwork(artist: string, track?: string, album?: string): Promise<MusicArtworkResult | null> {
    try {
      // Try Spotify first (has both album and artist artwork)
      const spotifyResult = await this.searchSpotifyArtwork(artist, track, album);
      if (spotifyResult && (spotifyResult.albumCover || spotifyResult.artistImage)) {
        return spotifyResult;
      }

      // Fallback: Try to find artwork from other sources
      // This would be where we could integrate other APIs like TheAudioDB or Last.fm
      
      return null;
    } catch (error) {
      console.error('Error searching music artwork:', error);
      return null;
    }
  }

  /**
   * Get artwork for Apple Music content
   */
  async getAppleMusicArtwork(artist: string, track?: string, album?: string): Promise<string | null> {
    const result = await this.searchMusicArtwork(artist, track, album);
    return result?.albumCover || result?.artistImage || null;
  }

  /**
   * Get artwork for Spotify content
   */
  async getSpotifyArtwork(artist: string, track?: string, album?: string): Promise<string | null> {
    const result = await this.searchMusicArtwork(artist, track, album);
    return result?.albumCover || result?.artistImage || null;
  }
}