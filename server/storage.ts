import {
  users,
  content,
  favorites,
  watchHistory,
  type User,
  type UpsertUser,
  type Content,
  type InsertContent,
  type Favorite,
  type InsertFavorite,
  type WatchHistory,
  type InsertWatchHistory,
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
  getUserConnections(userId: string): Promise<any[]>;
  connectService(userId: string, service: string): Promise<any>;
  disconnectService(userId: string, service: string): Promise<void>;
  
  // Preferences operations
  getUserPreferences(userId: string): Promise<any>;
  updateUserPreferences(userId: string, preferences: any): Promise<any>;
  
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
    return await db.select().from(content).where(eq(content.platform, platform));
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

  // User connections operations
  async getUserConnections(userId: string): Promise<any[]> {
    // Simulate connections for now - would connect to actual database table
    return [
      { service: 'netflix', status: 'connected' },
      { service: 'spotify', status: 'connected' },
    ];
  }

  async connectService(userId: string, service: string): Promise<any> {
    // Simulate connection - would save to database
    return { userId, service, status: 'connected', connectedAt: new Date() };
  }

  async disconnectService(userId: string, service: string): Promise<void> {
    // Simulate disconnection - would remove from database
    console.log(`Disconnecting ${service} for user ${userId}`);
  }

  // Preferences operations
  async getUserPreferences(userId: string): Promise<any> {
    // Simulate preferences - would fetch from database
    return {
      defaultViewMode: 'cards',
      autoplayPreviews: true,
      showAdultContent: true,
      newContentAlerts: true,
      liveEventReminders: true,
      trackWatchHistory: true,
      shareData: false,
    };
  }

  async updateUserPreferences(userId: string, preferences: any): Promise<any> {
    // Simulate update - would save to database
    console.log(`Updating preferences for user ${userId}:`, preferences);
    return { userId, ...preferences, updatedAt: new Date() };
  }
}

export const storage = new DatabaseStorage();
