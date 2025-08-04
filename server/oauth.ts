import { nanoid } from 'nanoid';

// Base OAuth configuration interface
interface BaseOAuthConfig {
  redirectUri: string;
  authUrl: string;
}

// Standard OAuth2 configuration
interface StandardOAuthConfig extends BaseOAuthConfig {
  clientId: string | undefined;
  clientSecret: string | undefined;
  tokenUrl: string;
  scopes: string[];
}

// Apple Music specific configuration
interface AppleMusicConfig extends BaseOAuthConfig {
  teamId: string | undefined;
  keyId: string | undefined;
  privateKey: string | undefined;
}

type OAuthConfig = StandardOAuthConfig | AppleMusicConfig;

// Deep link configurations for services without public APIs
export const deepLinkConfigs = {
  netflix: {
    webUrl: 'https://www.netflix.com',
    appUrl: 'netflix://',
    playUrl: (contentId: string) => `netflix://title/${contentId}`,
    searchUrl: (query: string) => `netflix://search?q=${encodeURIComponent(query)}`,
  },
  'disney-plus': {
    webUrl: 'https://www.disneyplus.com',
    appUrl: 'disneyplus://',
    playUrl: (contentId: string) => `disneyplus://content/movies/${contentId}`,
    searchUrl: (query: string) => `disneyplus://search?q=${encodeURIComponent(query)}`,
  },
  hulu: {
    webUrl: 'https://www.hulu.com',
    appUrl: 'hulu://',
    playUrl: (contentId: string) => `hulu://watch/${contentId}`,
    searchUrl: (query: string) => `hulu://search?q=${encodeURIComponent(query)}`,
  },
  'amazon-prime': {
    webUrl: 'https://www.amazon.com/gp/video',
    appUrl: 'aiv://',
    playUrl: (contentId: string) => `aiv://aiv/resume?_encoding=UTF8&asin=${contentId}`,
    searchUrl: (query: string) => `aiv://aiv/search?phrase=${encodeURIComponent(query)}`,
  },
  'hbo-max': {
    webUrl: 'https://www.max.com',
    appUrl: 'max://',
    playUrl: (contentId: string) => `max://feature/${contentId}`,
    searchUrl: (query: string) => `max://search?q=${encodeURIComponent(query)}`,
  },
  'apple-tv': {
    webUrl: 'https://tv.apple.com',
    appUrl: 'com.apple.tv://',
    playUrl: (contentId: string) => `com.apple.tv://us/movie/${contentId}`,
    searchUrl: (query: string) => `com.apple.tv://search?term=${encodeURIComponent(query)}`,
  },
  paramount: {
    webUrl: 'https://www.paramountplus.com',
    appUrl: 'cbsaa://',
    playUrl: (contentId: string) => `cbsaa://video/${contentId}`,
    searchUrl: (query: string) => `cbsaa://search?q=${encodeURIComponent(query)}`,
  },
  peacock: {
    webUrl: 'https://www.peacocktv.com',
    appUrl: 'peacocktv://',
    playUrl: (contentId: string) => `peacocktv://entity/${contentId}`,
    searchUrl: (query: string) => `peacocktv://search?q=${encodeURIComponent(query)}`,
  },
  'youtube-tv': {
    webUrl: 'https://tv.youtube.com',
    appUrl: 'youtubetv://',
    playUrl: (contentId: string) => `youtubetv://browse/${contentId}`,
    searchUrl: (query: string) => `youtubetv://search?q=${encodeURIComponent(query)}`,
  },
  'espn-plus': {
    webUrl: 'https://www.espn.com/watch',
    appUrl: 'espn://',
    playUrl: (contentId: string) => `espn://watch/${contentId}`,
    searchUrl: (query: string) => `espn://search?q=${encodeURIComponent(query)}`,
  },
};

// OAuth configuration for services with public APIs
export const oauthConfigs: Record<string, OAuthConfig> = {
  spotify: {
    clientId: process.env.SPOTIFY_CLIENT_ID,
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
    redirectUri: `https://${process.env.REPLIT_DOMAINS?.split(',')[0] || 'localhost:5000'}/api/oauth/callback/spotify`,
    authUrl: 'https://accounts.spotify.com/authorize',
    tokenUrl: 'https://accounts.spotify.com/api/token',
    scopes: ['user-read-private', 'user-read-email', 'user-library-read', 'user-read-playback-state', 'user-modify-playback-state', 'streaming'],
  },
  youtube: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    redirectUri: `https://${process.env.REPLIT_DOMAINS?.split(',')[0] || 'localhost:5000'}/api/oauth/callback/youtube`,
    authUrl: 'https://accounts.google.com/o/oauth2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    scopes: ['https://www.googleapis.com/auth/youtube.readonly', 'https://www.googleapis.com/auth/userinfo.email'],
  },
  'apple-music': {
    // Apple Music uses MusicKit for web, not OAuth2
    teamId: process.env.APPLE_TEAM_ID,
    keyId: process.env.APPLE_KEY_ID,
    privateKey: process.env.APPLE_PRIVATE_KEY,
    authUrl: 'https://music.apple.com/us/subscribe',
    redirectUri: `https://${process.env.REPLIT_DOMAINS?.split(',')[0] || 'localhost:5000'}/api/oauth/callback/apple-music`,
  }
};

// Type guard functions
function isStandardOAuth(config: OAuthConfig): config is StandardOAuthConfig {
  return 'clientId' in config && 'scopes' in config;
}

function isAppleMusicConfig(config: OAuthConfig): config is AppleMusicConfig {
  return 'teamId' in config;
}

// Generate OAuth authorization URL
export function generateAuthUrl(service: string, state: string): string {
  const config = oauthConfigs[service];
  if (!config) {
    throw new Error(`OAuth not configured for service: ${service}`);
  }

  if (service === 'apple-music' && isAppleMusicConfig(config)) {
    // Apple Music has a different flow
    return `${config.authUrl}?response_type=code&client_id=${config.teamId}&state=${state}`;
  }

  if (isStandardOAuth(config)) {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: config.clientId!,
      redirect_uri: config.redirectUri,
      scope: config.scopes.join(' '),
      state: state,
      access_type: 'offline', // For refresh tokens
      prompt: 'consent'
    });

    return `${config.authUrl}?${params.toString()}`;
  }

  throw new Error(`Invalid OAuth configuration for service: ${service}`);
}

// Exchange authorization code for access token
export async function exchangeCodeForToken(service: string, code: string): Promise<any> {
  const config = oauthConfigs[service];
  if (!config || !isStandardOAuth(config)) {
    throw new Error(`OAuth not configured for service: ${service}`);
  }

  const tokenData = {
    grant_type: 'authorization_code',
    code: code,
    redirect_uri: config.redirectUri,
    client_id: config.clientId!,
    client_secret: config.clientSecret!,
  };

  const response = await fetch(config.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(tokenData).toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token exchange failed: ${error}`);
  }

  return await response.json();
}

// Refresh access token
export async function refreshAccessToken(service: string, refreshToken: string): Promise<any> {
  const config = oauthConfigs[service];
  if (!config || !isStandardOAuth(config)) {
    throw new Error(`OAuth not configured for service: ${service}`);
  }

  const tokenData = {
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: config.clientId!,
    client_secret: config.clientSecret!,
  };

  const response = await fetch(config.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(tokenData).toString(),
  });

  if (!response.ok) {
    throw new Error(`Token refresh failed: ${response.statusText}`);
  }

  return await response.json();
}

// Get user profile from service
export async function getUserProfile(service: string, accessToken: string): Promise<any> {
  let profileUrl = '';
  let headers: Record<string, string> = {
    'Authorization': `Bearer ${accessToken}`,
  };

  switch (service) {
    case 'spotify':
      profileUrl = 'https://api.spotify.com/v1/me';
      break;
    case 'youtube':
      profileUrl = 'https://www.googleapis.com/oauth2/v2/userinfo';
      break;
    default:
      throw new Error(`Profile fetching not implemented for service: ${service}`);
  }

  const response = await fetch(profileUrl, { headers });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch user profile: ${response.statusText}`);
  }

  return await response.json();
}

// Generate deep link for playing content on services without APIs
export function generateDeepLink(service: string, action: 'play' | 'search', identifier: string, directUrl?: string): { appUrl: string; webUrl: string } {
  const config = deepLinkConfigs[service as keyof typeof deepLinkConfigs];
  if (!config) {
    throw new Error(`Deep link not configured for service: ${service}`);
  }

  let appUrl = config.appUrl;
  let webUrl = config.webUrl;

  if (action === 'play' && config.playUrl) {
    appUrl = config.playUrl(identifier);
    
    // Use direct URL if provided, otherwise generate URLs
    if (directUrl) {
      webUrl = directUrl;
    } else {
      // Generate proper web URLs for each service
      switch (service) {
        case 'netflix':
          // Netflix uses title IDs
          webUrl = `${config.webUrl}/title/${identifier}`;
          break;
        case 'amazon-prime':
          // Amazon Prime uses ASIN IDs
          webUrl = `${config.webUrl}/detail/${identifier}/`;
          break;
        case 'disney-plus':
          webUrl = `${config.webUrl}/search/?q=${encodeURIComponent(identifier.replace('-disney', '').replace(/-/g, ' '))}`;
          break;
        case 'hulu':
          webUrl = `${config.webUrl}/search?q=${encodeURIComponent(identifier.replace('-hulu', '').replace(/-/g, ' '))}`;
          break;
        case 'youtube-tv':
          // Use direct URL if available, otherwise browse to content
          webUrl = directUrl || `${config.webUrl}/browse/${identifier}`;
          break;
        case 'espn-plus':
          // Use direct URL if available, otherwise watch page
          webUrl = directUrl || `${config.webUrl}/${identifier}`;
          break;
        default:
          // Fallback to service homepage
          webUrl = config.webUrl;
      }
    }
  } else if (action === 'search' && config.searchUrl) {
    appUrl = config.searchUrl(identifier);
    webUrl = `${config.webUrl}/search?q=${encodeURIComponent(identifier)}`;
  }

  return { appUrl, webUrl };
}