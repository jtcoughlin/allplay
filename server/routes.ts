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

  // TMDb API key endpoint for frontend (for direct API approach as requested)
  app.get("/api/tmdb-config", (req, res) => {
    // Note: In production, consider using a backend proxy instead
    res.json({
      apiKey: process.env.TMDB_API_KEY || '',
      baseUrl: 'https://api.themoviedb.org/3',
      imageBaseUrl: 'https://image.tmdb.org/t/p/w500'
    });
  });

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
    
    <div style="margin:20px 0;padding:15px;border:1px solid #333;">
      <h2>Test 1: Direct SVG Test</h2>
      <img src="data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22200%22%20height%3D%22300%22%3E%3Crect%20width%3D%22200%22%20height%3D%22300%22%20fill%3D%22%2523233a56%22%2F%3E%3Ctext%20x%3D%22100%22%20y%3D%22120%22%20text-anchor%3D%22middle%22%20fill%3D%22white%22%20font-size%3D%2216%22%20font-weight%3D%22bold%22%3ETEST%3C%2Ftext%3E%3Ccircle%20cx%3D%22100%22%20cy%3D%22180%22%20r%3D%2230%22%20fill%3D%22white%22%20opacity%3D%220.3%22%2F%3E%3Cpolygon%20points%3D%2290%2C165%2090%2C195%20120%2C180%22%20fill%3D%22white%22%2F%3E%3C%2Fsvg%3E" 
           onload="document.getElementById('test1').innerHTML='✅ SUCCESS'" 
           onerror="document.getElementById('test1').innerHTML='❌ FAILED'"
           style="max-width:200px;margin:10px;" />
      <div id="test1">Loading...</div>
    </div>

    <div style="margin:20px 0;padding:15px;border:1px solid #333;">
      <h2>Test 2: API Response Test</h2>
      <div id="test2">Loading API data...</div>
      <div id="apiImages"></div>
    </div>

    <script>
      fetch('/api/content')
        .then(r => r.json())
        .then(data => {
          const firstFive = data.slice(0, 5);
          document.getElementById('test2').innerHTML = '✅ SUCCESS: Got ' + data.length + ' content items';
          
          const container = document.getElementById('apiImages');
          firstFive.forEach((item, i) => {
            if (item.imageUrl) {
              const div = document.createElement('div');
              div.innerHTML = \`
                <p><strong>\${item.title}</strong></p>
                <img src="\${item.imageUrl}" 
                     onload="this.nextSibling.innerHTML='✅ LOADED'" 
                     onerror="this.nextSibling.innerHTML='❌ FAILED: ' + this.src.substring(0,50) + '...'"
                     style="max-width:100px;margin:5px;" />
                <span>Loading...</span>
              \`;
              container.appendChild(div);
            }
          });
        })
        .catch(e => {
          document.getElementById('test2').innerHTML = '❌ FAILED: ' + e.message;
        });
    </script>
</body>
</html>`);
  });

  // Live TV routes with new TV Media API integration
  app.use('/api/tv-media', tvMediaRoutes);

  // User authentication and profile
  app.get("/api/auth/user", isAuthenticated, async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    res.json(req.user);
  });

  // Content routes
  app.get("/api/content", async (req, res) => {
    const allContent = await storage.getAllContent();
    res.json(allContent);
  });

  app.get("/api/content/:id", async (req, res) => {
    const content = await storage.getContentById(req.params.id);
    if (!content) {
      return res.status(404).json({ message: "Content not found" });
    }
    res.json(content);
  });

  app.get("/api/search", async (req, res) => {
    const query = req.query.q as string;
    if (!query) {
      return res.status(400).json({ message: "Query parameter 'q' is required" });
    }
    const results = await storage.searchContent(query);
    res.json(results);
  });

  // Favorites routes
  app.get("/api/favorites", isAuthenticated, async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    const userFavorites = await storage.getUserFavorites(req.user.id);
    res.json(userFavorites);
  });

  app.post("/api/favorites", isAuthenticated, async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    const { contentId } = req.body;
    if (!contentId) {
      return res.status(400).json({ message: "Content ID is required" });
    }
    
    const favorite = await storage.addToFavorites({
      userId: req.user.id,
      contentId
    });
    
    res.json(favorite);
  });

  app.delete("/api/favorites/:contentId", isAuthenticated, async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    await storage.removeFromFavorites(req.user.id, req.params.contentId);
    res.json({ message: "Removed from favorites" });
  });

  // Watch history routes
  app.get("/api/continue-watching", isAuthenticated, async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    const continueWatching = await storage.getContinueWatching(req.user.id);
    res.json(continueWatching);
  });

  app.post("/api/watch-progress", isAuthenticated, async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    const { contentId, progress } = req.body;
    if (!contentId || progress === undefined) {
      return res.status(400).json({ message: "Content ID and progress are required" });
    }
    
    const watchHistory = await storage.updateWatchProgress({
      userId: req.user.id,
      contentId,
      progress,
      lastWatched: new Date()
    });
    
    res.json(watchHistory);
  });

  // Service connection routes
  app.get("/api/connections", isAuthenticated, async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    const connections = await storage.getUserConnections(req.user.id);
    res.json(connections);
  });

  app.post("/api/connections", isAuthenticated, async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    const { service } = req.body;
    if (!service) {
      return res.status(400).json({ message: "Service is required" });
    }
    
    const connection = await storage.connectService(req.user.id, service);
    res.json(connection);
  });

  app.delete("/api/connections/:service", isAuthenticated, async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    await storage.disconnectService(req.user.id, req.params.service);
    res.json({ message: "Service disconnected" });
  });

  // User preferences routes
  app.get("/api/preferences", isAuthenticated, async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    const preferences = await storage.getUserPreferences(req.user.id);
    res.json(preferences);
  });

  app.post("/api/preferences", isAuthenticated, async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    const preferences = await storage.upsertUserPreferences({
      userId: req.user.id,
      ...req.body
    });
    
    res.json(preferences);
  });

  // Enhanced features
  app.get("/api/recommendations", isAuthenticated, async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    const recommendations = await storage.getRecommendedContent(req.user.id);
    res.json(recommendations);
  });

  app.post("/api/toggle-favorite", isAuthenticated, async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    const { contentId } = req.body;
    if (!contentId) {
      return res.status(400).json({ message: "Content ID is required" });
    }
    
    const result = await storage.toggleFavorite(req.user.id, contentId);
    res.json(result);
  });

  // Play content routes
  app.post("/api/play/:contentId", async (req, res) => {
    const contentId = req.params.contentId;
    const content = await storage.getContentById(contentId);
    
    if (!content) {
      return res.status(404).json({ message: "Content not found" });
    }
    
    // For non-external services, return basic play response
    res.json({ 
      message: `Now playing ${content.title}`,
      content 
    });
  });

  app.post("/api/play-external/:contentId", async (req, res) => {
    const contentId = req.params.contentId;
    const { service, title } = req.body;
    const content = await storage.getContentById(contentId);
    
    if (!content) {
      return res.status(404).json({ message: "Content not found" });
    }

    // Handle different external services with deep linking
    let appUrl = '';
    let webUrl = '';
    
    try {
      switch (service) {
        case 'netflix':
          const netflixSearchQuery = encodeURIComponent(title);
          appUrl = `netflix://title/${content.serviceContentId || 'search'}`;
          webUrl = content.directUrl || `https://www.netflix.com/search?q=${netflixSearchQuery}`;
          break;
          
        case 'disney-plus':
          appUrl = content.directUrl || `disneyplus://content/${content.serviceContentId || 'home'}`;
          webUrl = content.directUrl || 'https://www.disneyplus.com/';
          break;
          
        case 'hulu':
          appUrl = content.directUrl || `hulu://watch/${content.serviceContentId || 'home'}`;
          webUrl = content.directUrl || 'https://www.hulu.com/';
          break;
          
        case 'amazon-prime':
          const primeSearchQuery = encodeURIComponent(title);
          appUrl = content.directUrl || `primevideo://x-callback-url/deeplink?contentId=${content.serviceContentId || 'home'}`;
          webUrl = content.directUrl || `https://www.amazon.com/gp/video/search?phrase=${primeSearchQuery}`;
          break;
          
        case 'hbo-max':
          appUrl = content.directUrl || `hbomax://feature/${content.serviceContentId || 'home'}`;
          webUrl = content.directUrl || 'https://play.hbomax.com/';
          break;
          
        case 'apple-tv':
          appUrl = content.directUrl || `tv://x-callback-url/openURL?url=${content.serviceContentId || 'home'}`;
          webUrl = content.directUrl || 'https://tv.apple.com/';
          break;
          
        case 'paramount-plus':
          appUrl = content.directUrl || `paramountplus://content/${content.serviceContentId || 'home'}`;
          webUrl = content.directUrl || 'https://www.paramountplus.com/';
          break;
          
        case 'youtube-tv':
          appUrl = content.directUrl || 'https://tv.youtube.com/browse/live-tv';
          webUrl = content.directUrl || 'https://tv.youtube.com/browse/live-tv';
          break;
          
        case 'espn-plus':
          appUrl = content.directUrl || 'espn://home';
          webUrl = content.directUrl || 'https://www.espn.com/watch/';
          break;
          
        default:
          webUrl = content.directUrl || `https://www.google.com/search?q=${encodeURIComponent(title + ' watch online')}`;
          appUrl = webUrl;
      }
      
      console.log(`🎬 Opening ${service} content: ${title}`);
      console.log(`   App URL: ${appUrl}`);
      console.log(`   Web URL: ${webUrl}`);
      
      res.json({ 
        message: `Opening ${title} in ${service}`,
        appUrl,
        webUrl,
        content
      });
      
    } catch (error) {
      console.error('Error generating URLs for external service:', error);
      res.status(500).json({ 
        message: "Failed to generate service URLs",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // OAuth routes
  app.get("/api/oauth/:service/url", isAuthenticated, async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const service = req.params.service;
    const authUrl = generateAuthUrl(service);
    
    if (!authUrl) {
      return res.status(400).json({ message: "Unsupported service" });
    }
    
    res.json({ authUrl });
  });

  app.get("/api/oauth/:service/callback", isAuthenticated, async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const service = req.params.service;
    const { code } = req.query;
    
    if (!code) {
      return res.status(400).json({ message: "Missing authorization code" });
    }
    
    try {
      const tokens = await exchangeCodeForToken(service, code as string);
      const profile = await getUserProfile(service, tokens.access_token);
      
      // Store the connection
      await storage.createUserConnection({
        userId: req.user.id,
        service,
        isConnected: true,
        credentials: tokens
      });
      
      res.json({ 
        message: "Successfully connected",
        profile 
      });
    } catch (error) {
      console.error('OAuth callback error:', error);
      res.status(500).json({ message: "Failed to complete OAuth flow" });
    }
  });

  // Admin/utility routes
  app.post("/api/reseed", async (req, res) => {
    try {
      await seedRealContent();
      res.json({ message: "Database reseeded successfully" });
    } catch (error) {
      console.error('Reseed error:', error);
      res.status(500).json({ message: "Failed to reseed database" });
    }
  });

  app.post("/api/backup", async (req, res) => {
    try {
      const backupManager = new BackupManager();
      const backupInfo = await backupManager.createBackup();
      res.json({ 
        message: "Backup created successfully",
        backup: backupInfo
      });
    } catch (error) {
      console.error('Backup error:', error);
      res.status(500).json({ message: "Failed to create backup" });
    }
  });

  app.post("/api/assign-images", async (req, res) => {
    try {
      const imageService = new ImageAssignmentService();
      const result = await imageService.assignMissingImages();
      res.json({
        message: "Image assignment completed",
        result
      });
    } catch (error) {
      console.error('Image assignment error:', error);
      res.status(500).json({ message: "Failed to assign images" });
    }
  });

  // Live TV sync control endpoints
  app.post("/api/live-tv/sync", async (req, res) => {
    try {
      await liveTVSync.syncLiveTVData();
      res.json({ message: "Live TV sync completed successfully" });
    } catch (error) {
      console.error('Live TV sync error:', error);
      res.status(500).json({ 
        message: "Live TV sync failed",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.get("/api/live-tv/status", (req, res) => {
    const status = liveTVSync.status;
    res.json(status);
  });

  const httpServer = createServer(app);
  return httpServer;
}