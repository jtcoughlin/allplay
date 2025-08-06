import {
  users,
  serviceConnections,
  content,
  favorites,
  watchHistory,
  userPreferences,
  type User,
  type UpsertUser,
  type ServiceConnection,
  type InsertServiceConnection,
  type Content,
  type InsertContent,
  type Favorite,
  type InsertFavorite,
  type WatchHistory,
  type InsertWatchHistory,
  type UserPreferences,
  type InsertUserPreferences,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, ilike, or } from "drizzle-orm";

export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Content operations
  getAllContent(): Promise<Content[]>;
  getContentByGenre(genre: string): Promise<Content[]>;
  getContentByPlatform(platform: string): Promise<Content[]>;
  searchContent(query: string): Promise<Content[]>;
  getContentById(id: string): Promise<Content | undefined>;
  createContent(content: InsertContent): Promise<Content>;
  
  // Favorites operations
  getUserFavorites(userId: string): Promise<(Favorite & { content: Content })[]>;
  addToFavorites(favorite: InsertFavorite): Promise<Favorite>;
  removeFromFavorites(userId: string, contentId: string): Promise<void>;
  isFavorite(userId: string, contentId: string): Promise<boolean>;
  
  // Watch history operations
  getUserWatchHistory(userId: string): Promise<(WatchHistory & { content: Content })[]>;
  getContinueWatching(userId: string): Promise<(WatchHistory & { content: Content })[]>;
  updateWatchProgress(watchHistory: InsertWatchHistory): Promise<WatchHistory>;
  
  // User connections operations
  getUserConnections(userId: string): Promise<ServiceConnection[]>;
  createUserConnection(connection: Omit<InsertServiceConnection, 'id' | 'createdAt' | 'updatedAt'> & { credentials: any }): Promise<ServiceConnection>;
  connectService(userId: string, service: string): Promise<ServiceConnection>;
  disconnectService(userId: string, service: string): Promise<void>;
  
  // User preferences operations
  getUserPreferences(userId: string): Promise<UserPreferences | undefined>;
  upsertUserPreferences(preferences: InsertUserPreferences): Promise<UserPreferences>;
  getRecommendedContent(userId: string): Promise<Content[]>;
  
  // Enhanced favorites operations
  toggleFavorite(userId: string, contentId: string): Promise<any>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Content operations
  async getAllContent(): Promise<Content[]> {
    return await db.select().from(content).orderBy(desc(content.createdAt));
  }

  async getContentByGenre(genre: string): Promise<Content[]> {
    return await db.select().from(content).where(eq(content.genre, genre));
  }

  async getContentByPlatform(platform: string): Promise<Content[]> {
    return await db.select().from(content).where(eq(content.service, platform));
  }

  async searchContent(query: string): Promise<Content[]> {
    return await db
      .select()
      .from(content)
      .where(
        or(
          ilike(content.title, `%${query}%`),
          ilike(content.description, `%${query}%`),
          ilike(content.artist, `%${query}%`),
          ilike(content.album, `%${query}%`)
        )
      );
  }

  async getContentById(id: string): Promise<Content | undefined> {
    const [contentItem] = await db.select().from(content).where(eq(content.id, id));
    return contentItem;
  }

  async createContent(contentData: InsertContent): Promise<Content> {
    const [newContent] = await db
      .insert(content)
      .values(contentData)
      .returning();
    return newContent;
  }

  // Favorites operations
  async getUserFavorites(userId: string): Promise<(Favorite & { content: Content })[]> {
    return await db
      .select()
      .from(favorites)
      .innerJoin(content, eq(favorites.contentId, content.id))
      .where(eq(favorites.userId, userId))
      .then(rows => rows.map(row => ({ ...row.favorites, content: row.content })));
  }

  async addToFavorites(favorite: InsertFavorite): Promise<Favorite> {
    const [newFavorite] = await db
      .insert(favorites)
      .values(favorite)
      .returning();
    return newFavorite;
  }

  async removeFromFavorites(userId: string, contentId: string): Promise<void> {
    await db
      .delete(favorites)
      .where(and(eq(favorites.userId, userId), eq(favorites.contentId, contentId)));
  }

  async isFavorite(userId: string, contentId: string): Promise<boolean> {
    const [favorite] = await db
      .select()
      .from(favorites)
      .where(and(eq(favorites.userId, userId), eq(favorites.contentId, contentId)));
    return !!favorite;
  }

  // Watch history operations
  async getUserWatchHistory(userId: string): Promise<(WatchHistory & { content: Content })[]> {
    return await db
      .select()
      .from(watchHistory)
      .innerJoin(content, eq(watchHistory.contentId, content.id))
      .where(eq(watchHistory.userId, userId))
      .orderBy(desc(watchHistory.lastWatched))
      .then(rows => rows.map(row => ({ ...row.watch_history, content: row.content })));
  }

  async getContinueWatching(userId: string): Promise<(WatchHistory & { content: Content })[]> {
    return await db
      .select()
      .from(watchHistory)
      .innerJoin(content, eq(watchHistory.contentId, content.id))
      .where(
        and(
          eq(watchHistory.userId, userId),
          eq(watchHistory.isCompleted, false)
        )
      )
      .orderBy(desc(watchHistory.lastWatched))
      .limit(10)
      .then(rows => rows.map(row => ({ ...row.watch_history, content: row.content })));
  }

  async updateWatchProgress(watchHistoryData: InsertWatchHistory): Promise<WatchHistory> {
    const [updatedHistory] = await db
      .insert(watchHistory)
      .values(watchHistoryData)
      .onConflictDoUpdate({
        target: [watchHistory.userId, watchHistory.contentId],
        set: {
          progress: watchHistoryData.progress,
          lastWatched: new Date(),
          isCompleted: watchHistoryData.isCompleted,
        },
      })
      .returning();
    return updatedHistory;
  }

  // Enhanced favorites operations
  async toggleFavorite(userId: string, contentId: string): Promise<any> {
    const existing = await this.isFavorite(userId, contentId);
    
    if (existing) {
      await this.removeFromFavorites(userId, contentId);
      return { action: 'removed', isFavorite: false };
    } else {
      await this.addToFavorites({ userId, contentId });
      return { action: 'added', isFavorite: true };
    }
  }

  // Service connection operations
  async getUserConnections(userId: string): Promise<ServiceConnection[]> {
    return await db.select().from(serviceConnections).where(eq(serviceConnections.userId, userId));
  }

  async getConnection(userId: string, service: string): Promise<ServiceConnection | undefined> {
    const [connection] = await db
      .select()
      .from(serviceConnections)
      .where(and(eq(serviceConnections.userId, userId), eq(serviceConnections.service, service)));
    return connection;
  }

  async createConnection(connectionData: InsertServiceConnection): Promise<ServiceConnection> {
    const [connection] = await db
      .insert(serviceConnections)
      .values(connectionData)
      .returning();
    return connection;
  }

  async updateConnection(id: string, updates: Partial<InsertServiceConnection>): Promise<ServiceConnection> {
    const [connection] = await db
      .update(serviceConnections)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(serviceConnections.id, id))
      .returning();
    return connection;
  }

  async deleteConnection(id: string): Promise<void> {
    await db.delete(serviceConnections).where(eq(serviceConnections.id, id));
  }

  async connectService(userId: string, service: string): Promise<ServiceConnection> {
    // Create or update connection
    const existing = await this.getConnection(userId, service);
    if (existing) {
      return await this.updateConnection(existing.id, { status: 'connected' });
    } else {
      return await this.createConnection({
        userId,
        service,
        status: 'connected',
      });
    }
  }

  async disconnectService(userId: string, service: string): Promise<void> {
    const connection = await this.getConnection(userId, service);
    if (connection) {
      await this.deleteConnection(connection.id);
    }
  }

  async createUserConnection(connectionData: Omit<InsertServiceConnection, 'id' | 'createdAt' | 'updatedAt'> & { credentials: any }): Promise<ServiceConnection> {
    // Extract credentials and map to individual fields
    const { credentials, ...baseData } = connectionData;
    
    const insertData: InsertServiceConnection = {
      ...baseData,
      accessToken: credentials.accessToken,
      refreshToken: credentials.refreshToken,
      expiresAt: credentials.expiresAt ? new Date(credentials.expiresAt) : null,
      accountId: credentials.serviceUserId,
      accountEmail: credentials.serviceUserEmail,
      profileName: credentials.serviceUserName,
      status: 'connected'
    };

    return await this.createConnection(insertData);
  }

  // Enhanced content operations
  async getContentByService(service: string): Promise<Content[]> {
    return await db.select().from(content).where(eq(content.service, service));
  }

  // User preferences operations
  async getUserPreferences(userId: string): Promise<UserPreferences | undefined> {
    const [prefs] = await db.select().from(userPreferences).where(eq(userPreferences.userId, userId));
    return prefs;
  }

  async upsertUserPreferences(preferences: InsertUserPreferences): Promise<UserPreferences> {
    const [prefs] = await db
      .insert(userPreferences)
      .values(preferences)
      .onConflictDoUpdate({
        target: userPreferences.userId,
        set: {
          ...preferences,
          updatedAt: new Date(),
        },
      })
      .returning();
    return prefs;
  }

  async getRecommendedContent(userId: string): Promise<Content[]> {
    const prefs = await this.getUserPreferences(userId);
    
    if (!prefs) {
      // Return general popular content if no preferences set
      return await db.select().from(content).limit(20);
    }

    // Build query based on user preferences
    const conditions = [];
    
    if (prefs.preferredGenres && prefs.preferredGenres.length > 0) {
      const genreConditions = prefs.preferredGenres.map(genre => eq(content.genre, genre));
      conditions.push(or(...genreConditions));
    }
    
    if (prefs.preferredContentTypes && prefs.preferredContentTypes.length > 0) {
      const typeConditions = prefs.preferredContentTypes.map(type => eq(content.type, type));
      conditions.push(or(...typeConditions));
    }

    const baseQuery = db.select().from(content);
    
    if (conditions.length > 0) {
      return await baseQuery.where(or(...conditions)).limit(50);
    }
    
    return await baseQuery.limit(20);
  }

  // Legacy preference method for compatibility
  async updateUserPreferences(userId: string, preferences: any): Promise<any> {
    // Simulate update - would save to database
    console.log(`Updating preferences for user ${userId}:`, preferences);
    return { userId, ...preferences, updatedAt: new Date() };
  }
}

export const storage = new DatabaseStorage();
