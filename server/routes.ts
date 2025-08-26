import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { generateAuthUrl, exchangeCodeForToken, getUserProfile, generateDeepLink } from "./oauth";
import { nanoid } from 'nanoid';
import { insertContentSchema, insertFavoriteSchema, insertWatchHistorySchema, insertUserPreferencesSchema } from "@shared/schema";
import { seedRealContent } from "./seed-content";
import { BackupManager } from "./backup-manager";
import { ImageAssignmentService } from "./imageAssignmentService";
import { liveTVSync } from "./liveTVSync";
import tvMediaRoutes from "./routes/tvMedia.js";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Image debug endpoint to capture client-side errors
  app.post('/api/image-debug', (req, res) => {
    console.error('🖼️ CLIENT IMAGE ERROR:', req.body);
    res.json({ received: true });
  });

  // Debug route for testing images  
  app.get('/debug-images', (req, res) => {
    res.send(`<!DOCTYPE html>
<html>
<head><title>Debug Images</title></head>
<body style="background:#111;color:white;font-family:Arial;padding:20px;">
    <h1>Image Debug Test</h1>
    <h2>Test 1: Direct SVG Test</h2>
    <img id="test1" style="width:200px;height:300px;border:2px solid red;" 
         src="data:image/svg+xml;charset=utf-8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='300'><rect width='200' height='300' fill='red'/><text x='100' y='150' text-anchor='middle' fill='white' font-size='20'>TEST</text></svg>" 
         onload="console.log('Direct SVG loaded!'); document.getElementById('result1').innerHTML='✅ SUCCESS';"
         onerror="console.log('Direct SVG failed!'); document.getElementById('result1').innerHTML='❌ ERROR';" />
    <div id="result1">Loading...</div>
    
    <h2>Test 2: API Response Test</h2>
    <div id="api-test">Loading API data...</div>
    
    <script>
      console.log('🔍 Starting comprehensive image test...');
      
      // Test API response
      fetch('/api/content').then(r=>r.json()).then(d=>{
        console.log('📦 API data received, total items:', d.length);
        
        const testItem = d.find(i => i.title === 'Boston Bruins vs Toronto Maple Leafs');
        if (testItem) {
          console.log('🎯 Found test item:', testItem.title);
          console.log('🖼️ Image URL:', testItem.imageUrl);
          
          document.getElementById('api-test').innerHTML = 
            '<h3>Test Item: ' + testItem.title + '</h3>' +
            '<p><strong>Image URL:</strong> ' + (testItem.imageUrl || 'NULL') + '</p>' +
            '<img style="width:200px;height:300px;border:2px solid blue;" ' +
            'src="' + (testItem.imageUrl || '') + '" ' +
            'onload="console.log(\'API image loaded!\'); this.nextElementSibling.innerHTML=\'✅ SUCCESS\';" ' +
            'onerror="console.log(\'API image failed!\'); this.nextElementSibling.innerHTML=\'❌ ERROR\';" />' +
            '<div>Loading...</div>';
        } else {
          document.getElementById('api-test').innerHTML = '❌ Test item not found';
        }
      }).catch(err => {
        console.error('❌ API Error:', err);
        document.getElementById('api-test').innerHTML = '❌ API Error: ' + err;
      });
    </script>
</body>
</html>`);
  });

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Seed content endpoint with automatic backup
  app.post('/api/seed-content', async (req, res) => {
    try {
      // Create backup before seeding
      console.log('🔄 Creating backup before content seeding...');
      await BackupManager.createContentBackup(`pre-seed-${new Date().toISOString().split('T')[0]}`);
      
      await seedRealContent();
      
      // Sync to seed file after seeding
      console.log('🔄 Synchronizing database to seed file...');
      await BackupManager.syncDatabaseToSeed();
      
      res.json({ message: 'Content seeded successfully with automatic backup and sync' });
    } catch (error) {
      console.error('Error seeding content:', error);
      res.status(500).json({ message: 'Failed to seed content' });
    }
  });

  // TMDB Movie Poster Update endpoint
  app.post('/api/update-movie-posters', async (req, res) => {
    try {
      const { services } = req.body;
      const validServices = services || ['hulu', 'hbo-max'];
      
      console.log(`🎬 Starting TMDB poster update for: ${validServices.join(', ')}`);
      
      // Create backup before updating
      await BackupManager.createContentBackup(`pre-tmdb-update-${new Date().toISOString().split('T')[0]}`);
      
      const imageService = new ImageAssignmentService();
      await imageService.updateMoviePostersForServices(validServices);
      
      // Sync to seed file after updating
      await BackupManager.syncDatabaseToSeed();
      
      res.json({ 
        message: `Successfully updated movie posters for ${validServices.join(', ')} using TMDB API`,
        services: validServices
      });
    } catch (error) {
      console.error('Error updating movie posters:', error);
      res.status(500).json({ 
        message: 'Failed to update movie posters',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // TMDB TV Show Poster Update endpoint
  app.post('/api/update-show-posters', async (req, res) => {
    try {
      const { services } = req.body;
      const validServices = services || ['netflix', 'amazon-prime', 'hulu', 'hbo-max', 'apple-tv', 'disney-plus', 'paramount-plus'];
      
      console.log(`📺 Starting TMDB TV show poster update for: ${validServices.join(', ')}`);
      
      // Create backup before updating
      await BackupManager.createContentBackup(`pre-tmdb-shows-update-${new Date().toISOString().split('T')[0]}`);
      
      const imageService = new ImageAssignmentService();
      await imageService.updateShowPostersForServices(validServices);
      
      // Sync to seed file after updating
      await BackupManager.syncDatabaseToSeed();
      
      res.json({ 
        message: `Successfully updated TV show posters for ${validServices.join(', ')} using TMDB API`,
        services: validServices
      });
    } catch (error) {
      console.error('Error updating movie posters:', error);
      res.status(500).json({ 
        message: 'Failed to update movie posters',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Data URL Fix endpoint
  app.post('/api/fix-data-urls', async (req, res) => {
    try {
      console.log('🔧 Starting data URL fix process...');
      
      // Create backup before fixing
      await BackupManager.createContentBackup(`pre-dataurl-fix-${new Date().toISOString().split('T')[0]}`);
      
      const { DataUrlFixer } = await import('./utils/dataUrlFixer');
      const fixedCount = await DataUrlFixer.fixAllDataUrls();
      
      // Sync to seed file after fixing
      await BackupManager.syncDatabaseToSeed();
      
      res.json({ 
        message: `Successfully fixed ${fixedCount} malformed data URLs`,
        fixedCount
      });
    } catch (error) {
      console.error('Error fixing data URLs:', error);
      res.status(500).json({ 
        message: 'Failed to fix data URLs',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Automated backup endpoints
  app.post('/api/backup/create', async (req, res) => {
    try {
      const { name } = req.body;
      const backupPath = await BackupManager.createContentBackup(name);
      await BackupManager.syncDatabaseToSeed();
      res.json({ 
        message: 'Backup created and synchronized successfully',
        backupPath,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error creating backup:', error);
      res.status(500).json({ message: 'Failed to create backup' });
    }
  });

  app.get('/api/backup/list', async (req, res) => {
    try {
      const backups = await BackupManager.listBackups();
      res.json({ backups });
    } catch (error) {
      console.error('Error listing backups:', error);
      res.status(500).json({ message: 'Failed to list backups' });
    }
  });

  // Content routes
  app.get('/api/content', async (req, res) => {
    try {
      const { genre, platform, search, type } = req.query;
      
      let content;
      if (search) {
        content = await storage.searchContent(search as string);
      } else if (genre && genre !== 'all') {
        content = await storage.getContentByGenre(genre as string);
      } else if (platform) {
        content = await storage.getContentByPlatform(platform as string);
      } else {
        content = await storage.getAllContent();
      }
      
      // Filter by type if specified
      if (type && type !== 'all') {
        content = content.filter(item => item.type === type);
      }
      
      res.json(content);
    } catch (error) {
      console.error("Error fetching content:", error);
      res.status(500).json({ message: "Failed to fetch content" });
    }
  });

  app.get('/api/content/:id', async (req, res) => {
    try {
      const content = await storage.getContentById(req.params.id);
      if (!content) {
        return res.status(404).json({ message: "Content not found" });
      }
      res.json(content);
    } catch (error) {
      console.error("Error fetching content:", error);
      res.status(500).json({ message: "Failed to fetch content" });
    }
  });

  app.post('/api/content', isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertContentSchema.parse(req.body);
      const content = await storage.createContent(validatedData);
      res.status(201).json(content);
    } catch (error) {
      console.error("Error creating content:", error);
      res.status(400).json({ message: "Invalid content data" });
    }
  });

  // Favorites routes
  app.get('/api/favorites', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const favorites = await storage.getUserFavorites(userId);
      res.json(favorites);
    } catch (error) {
      console.error("Error fetching favorites:", error);
      res.status(500).json({ message: "Failed to fetch favorites" });
    }
  });

  app.post('/api/favorites', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = insertFavoriteSchema.parse({
        ...req.body,
        userId
      });
      const favorite = await storage.addToFavorites(validatedData);
      res.status(201).json(favorite);
    } catch (error) {
      console.error("Error adding favorite:", error);
      res.status(400).json({ message: "Invalid favorite data" });
    }
  });

  app.delete('/api/favorites/:contentId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      await storage.removeFromFavorites(userId, req.params.contentId);
      res.status(204).send();
    } catch (error) {
      console.error("Error removing favorite:", error);
      res.status(500).json({ message: "Failed to remove favorite" });
    }
  });

  // Favorites toggle endpoint
  app.post('/api/favorites/toggle', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { contentId } = req.body;
      const result = await storage.toggleFavorite(userId, contentId);
      res.json(result);
    } catch (error) {
      console.error("Error toggling favorite:", error);
      res.status(500).json({ message: "Failed to toggle favorite" });
    }
  });

  // Service authentication route (simulates OAuth flow)
  app.get("/api/auth/:service/login", isAuthenticated, async (req: any, res) => {
    const { service } = req.params;
    const userId = req.user.claims.sub;
    
    try {
      // Simulate OAuth connection
      await storage.connectService(userId, service);
      
      // Redirect back to profile with success message
      res.redirect(`/profile?connected=${service}`);
    } catch (error) {
      console.error(`Error connecting to ${service}:`, error);
      res.redirect(`/profile?error=connection_failed&service=${service}`);
    }
  });

  // User connections endpoints
  app.get('/api/user/connections', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const connections = await storage.getUserConnections(userId);
      res.json(connections);
    } catch (error) {
      console.error("Error fetching user connections:", error);
      res.status(500).json({ message: "Failed to fetch connections" });
    }
  });

    // Real OAuth initiation route
  app.get('/api/oauth/initiate/:service', isAuthenticated, async (req: any, res) => {
    try {
      const { service } = req.params;
      const userId = req.user.claims.sub;
      
      // Generate state parameter for security
      const state = nanoid();
      
      // Store state temporarily (in production, use Redis or similar)
      req.session.oauthState = { state, service, userId };
      
      const authUrl = generateAuthUrl(service, state);
      res.json({ authUrl });
    } catch (error) {
      console.error('Error initiating OAuth:', error);
      res.status(500).json({ message: 'Failed to initiate OAuth' });
    }
  });

  // OAuth callback route
  app.get('/api/oauth/callback/:service', async (req: any, res) => {
    try {
      const { service } = req.params;
      const { code, state } = req.query;
      
      // Verify state parameter
      if (!req.session.oauthState || req.session.oauthState.state !== state) {
        return res.status(400).json({ message: 'Invalid state parameter' });
      }
      
      const { userId } = req.session.oauthState;
      
      // Exchange code for tokens
      const tokens = await exchangeCodeForToken(service, code);
      
      // Get user profile from the service
      const profile = await getUserProfile(service, tokens.access_token);
      
      // Store the connection
      const connection = await storage.createUserConnection({
        userId,
        service,
        credentials: {
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          expiresAt: tokens.expires_in ? Date.now() + (tokens.expires_in * 1000) : null,
          serviceUserId: profile.id,
          serviceUserName: profile.display_name || profile.name,
          serviceUserEmail: profile.email,
        }
      });
      
      // Clean up session
      delete req.session.oauthState;
      
      // Redirect back to the app
      res.redirect('/?connected=' + service);
    } catch (error) {
      console.error('Error in OAuth callback:', error);
      res.redirect('/?error=connection_failed');
    }
  });

  app.post('/api/user/connect', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { service } = req.body;
      
      // Services with OAuth support
      if (['spotify', 'youtube', 'apple-music'].includes(service)) {
        const state = nanoid();
        req.session.oauthState = { state, service, userId };
        
        try {
          const authUrl = generateAuthUrl(service, state);
          res.json({ authUrl, requiresOAuth: true, connectionType: 'oauth' });
        } catch (error: any) {
          console.error(`OAuth error for ${service}:`, error);
          res.status(400).json({ 
            message: `OAuth not available for ${service}. Please ensure API keys are configured.`,
            requiresOAuth: false,
            connectionType: 'unavailable'
          });
        }
      } 
      // Services with deep link support - require verification
      else if (['netflix', 'disney-plus', 'hulu', 'amazon-prime', 'max', 'apple-tv', 'paramount-plus', 'peacock', 'youtube-tv', 'espn-plus'].includes(service)) {
        // Don't auto-connect, require verification
        res.json({ 
          requiresVerification: true,
          connectionType: 'deeplink',
          service,
          message: `To connect ${service}, please confirm you have an active subscription.`
        });
      } 
      // Other services - simulated connection
      else {
        const connection = await storage.connectService(userId, service);
        res.json({ connection, requiresOAuth: false, connectionType: 'simulated' });
      }
    } catch (error) {
      console.error("Error connecting service:", error);
      res.status(500).json({ message: "Failed to connect service" });
    }
  });

  // Verify deep link service subscription
  app.post('/api/user/verify-subscription', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { service, hasSubscription } = req.body;

      console.log('Verify subscription request:', { service, hasSubscription, body: req.body });

      if (!service || hasSubscription === undefined) {
        console.log('Missing required parameters:', { service, hasSubscription });
        return res.status(400).json({ message: 'Service and subscription status required' });
      }

      if (!hasSubscription) {
        return res.status(400).json({ 
          message: `You need an active ${service} subscription to connect this service.` 
        });
      }

      // Create the deep link connection
      const connection = await storage.connectService(userId, service);
      res.json({ 
        connection,
        connectionType: 'deeplink',
        message: `${service} connected! Content will open in the ${service} app when played.`
      });
    } catch (error) {
      console.error('Error verifying subscription:', error);
      res.status(500).json({ message: 'Failed to verify subscription' });
    }
  });

  // Deep link content route
  app.post('/api/play-external/:contentId', async (req, res) => {
    try {
      const { contentId } = req.params;
      const userId = 'anonymous'; // Allow anonymous access for live TV deep linking
      
      // Get content details from database
      const contentDetails = await storage.getContentById(contentId);
      if (!contentDetails) {
        return res.status(404).json({ message: "Content not found" });
      }
      
      // Generate deep links for the service using content's service_content_id and direct URL
      const { appUrl, webUrl } = generateDeepLink(contentDetails.service, 'play', contentDetails.serviceContentId, contentDetails.directUrl || undefined);
      
      // Skip watch progress logging for anonymous users (live TV)
      if (userId !== 'anonymous') {
        await storage.updateWatchProgress({
          userId,
          contentId,
          progress: 0,
          isCompleted: false
        });
      }
      
      res.json({ 
        appUrl, 
        webUrl,
        title: contentDetails.title,
        service: contentDetails.service,
        message: `Opening ${contentDetails.title} in ${contentDetails.service}...`,
        returnUrl: `${req.protocol}://${req.get('host')}?returning=true&service=${contentDetails.service}&content=${contentId}`
      });
    } catch (error) {
      console.error("Error generating deep link:", error);
      res.status(500).json({ message: "Failed to open content" });
    }
  });

  app.delete('/api/user/connect/:service', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { service } = req.params;
      
      await storage.disconnectService(userId, service);
      res.json({ message: "Service disconnected successfully" });
    } catch (error) {
      console.error("Error disconnecting service:", error);
      res.status(500).json({ message: "Failed to disconnect service" });
    }
  });



  // Play content endpoint - simulate direct streaming
  app.post('/api/play/:contentId', isAuthenticated, async (req: any, res) => {
    try {
      const { contentId } = req.params;
      const userId = req.user.claims.sub;
      
      // Log play event and update watch history
      await storage.updateWatchProgress({
        userId,
        contentId,
        progress: 0,
        isCompleted: false
      });
      
      // Return streaming URL (simulated)
      res.json({ 
        streamUrl: `https://stream.allplay.tv/${contentId}`,
        message: "Now playing within Allplay interface" 
      });
    } catch (error) {
      console.error("Error starting playback:", error);
      res.status(500).json({ message: "Failed to start playback" });
    }
  });

  app.get('/api/favorites/:contentId/check', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const isFavorite = await storage.isFavorite(userId, req.params.contentId);
      res.json({ isFavorite });
    } catch (error) {
      console.error("Error checking favorite:", error);
      res.status(500).json({ message: "Failed to check favorite status" });
    }
  });

  // Watch history routes
  app.get('/api/watch-history', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const history = await storage.getUserWatchHistory(userId);
      res.json(history);
    } catch (error) {
      console.error("Error fetching watch history:", error);
      res.status(500).json({ message: "Failed to fetch watch history" });
    }
  });

  app.get('/api/continue-watching', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const continueWatching = await storage.getContinueWatching(userId);
      res.json(continueWatching);
    } catch (error) {
      console.error("Error fetching continue watching:", error);
      res.status(500).json({ message: "Failed to fetch continue watching" });
    }
  });

  app.post('/api/watch-progress', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = insertWatchHistorySchema.parse({
        ...req.body,
        userId
      });
      const watchHistory = await storage.updateWatchProgress(validatedData);
      res.json(watchHistory);
    } catch (error) {
      console.error("Error updating watch progress:", error);
      res.status(400).json({ message: "Invalid watch progress data" });
    }
  });

  // User preferences routes
  app.get('/api/user/preferences', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const preferences = await storage.getUserPreferences(userId);
      res.json(preferences || null);
    } catch (error) {
      console.error("Error fetching user preferences:", error);
      res.status(500).json({ message: "Failed to fetch preferences" });
    }
  });

  app.post('/api/user/preferences', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = insertUserPreferencesSchema.parse({ ...req.body, userId });
      const preferences = await storage.upsertUserPreferences(validatedData);
      res.json(preferences);
    } catch (error) {
      console.error("Error updating user preferences:", error);
      res.status(500).json({ message: "Failed to update preferences" });
    }
  });

  // Get recommended content based on user preferences
  app.get('/api/user/recommendations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const recommendations = await storage.getRecommendedContent(userId);
      res.json(recommendations);
    } catch (error) {
      console.error("Error fetching recommendations:", error);
      res.status(500).json({ message: "Failed to fetch recommendations" });
    }
  });

  // Live TV data routes
  app.post('/api/live-tv/sync', async (req, res) => {
    try {
      await liveTVSync.forceSync();
      res.json({ message: 'Live TV data synchronized successfully' });
    } catch (error) {
      console.error('Error syncing live TV data:', error);
      res.status(500).json({ message: 'Failed to sync live TV data' });
    }
  });

  app.get('/api/live-tv/channels', async (req, res) => {
    try {
      const channels = liveTVSync.getSupportedChannels();
      res.json({ channels });
    } catch (error) {
      console.error('Error fetching supported channels:', error);
      res.status(500).json({ message: 'Failed to fetch channels' });
    }
  });

  app.get('/api/live-tv/currently-airing', async (req, res) => {
    try {
      const programs = await liveTVSync.getCurrentlyAiringPrograms();
      
      // Add deep links to each program before returning  
      const programsWithDeepLinks = programs.map(program => ({
        ...program,
        directUrl: liveTVSync.generateYouTubeTVWatchUrl ? liveTVSync.generateYouTubeTVWatchUrl(program) : 'https://tv.youtube.com/browse/live-tv'
      }));
      
      res.json(programsWithDeepLinks);
    } catch (error) {
      console.error('Error fetching currently airing programs:', error);
      res.status(500).json({ message: 'Failed to fetch currently airing programs' });
    }
  });

  app.get('/api/live-tv/channel/:channelId/guide', async (req, res) => {
    try {
      const { channelId } = req.params;
      const hours = parseInt(req.query.hours as string) || 6;
      const guide = await liveTVSync.getChannelProgramGuide(channelId, hours);
      res.json(guide);
    } catch (error) {
      console.error('Error fetching channel guide:', error);
      res.status(500).json({ message: 'Failed to fetch channel guide' });
    }
  });

  app.post('/api/live-tv/sync-channels', async (req, res) => {
    try {
      const { channels } = req.body;
      if (!Array.isArray(channels)) {
        return res.status(400).json({ message: 'Channels must be an array' });
      }
      await liveTVSync.syncSpecificChannels(channels);
      res.json({ 
        message: `Successfully synced ${channels.length} channels`,
        channels 
      });
    } catch (error) {
      console.error('Error syncing specific channels:', error);
      res.status(500).json({ message: 'Failed to sync channels' });
    }
  });

  // TV Media API routes
  app.use('/api/tv-media', tvMediaRoutes);

  const httpServer = createServer(app);
  return httpServer;
}
