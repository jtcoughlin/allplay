import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { generateAuthUrl, exchangeCodeForToken, getUserProfile, generateDeepLink } from "./oauth";
import { nanoid } from 'nanoid';
import { insertContentSchema, insertFavoriteSchema, insertWatchHistorySchema, insertUserPreferencesSchema } from "@shared/schema";
import { seedRealContent } from "./seed-content";
import { BackupManager } from "./backup-manager";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

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
  app.post('/api/play-external/:contentId', isAuthenticated, async (req: any, res) => {
    try {
      const { contentId } = req.params;
      const userId = req.user.claims.sub;
      
      // Get content details from database
      const contentDetails = await storage.getContentById(contentId);
      if (!contentDetails) {
        return res.status(404).json({ message: "Content not found" });
      }
      
      // Generate deep links for the service using content's service_content_id and direct URL
      const { appUrl, webUrl } = generateDeepLink(contentDetails.service, 'play', contentDetails.serviceContentId, contentDetails.directUrl || undefined);
      
      // Log the play attempt
      await storage.updateWatchProgress({
        userId,
        contentId,
        progress: 0,
        isCompleted: false
      });
      
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

  const httpServer = createServer(app);
  return httpServer;
}
