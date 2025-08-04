import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  decimal,
  boolean,
} from "drizzle-orm/pg-core";
import { relations } from 'drizzle-orm';
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table for Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Service connections for streaming platforms
export const serviceConnections = pgTable("service_connections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  service: varchar("service").notNull(), // netflix, disney, hulu, etc.
  accessToken: varchar("access_token"),
  refreshToken: varchar("refresh_token"),
  expiresAt: timestamp("expires_at"),
  accountId: varchar("account_id"), // service-specific user ID
  accountEmail: varchar("account_email"),
  profileName: varchar("profile_name"),
  status: varchar("status").notNull().default("connected"), // connected, expired, error
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Content table for movies, shows, music, etc.
export const content = pgTable("content", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  type: varchar("type").notNull(), // 'movie', 'show', 'music', 'live'
  genre: varchar("genre").notNull(),
  service: varchar("service").notNull(), // 'netflix', 'spotify', etc.
  serviceContentId: varchar("service_content_id").notNull(), // ID in the source service
  imageUrl: text("image_url"),
  rating: varchar("rating"), // PG, R, TV-14, etc.
  year: integer("year"),
  artist: text("artist"), // for music content
  album: text("album"), // for music content
  duration: integer("duration"), // in minutes
  isLive: boolean("is_live").default(false),
  availability: jsonb("availability"), // regions, subscription tiers
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User favorites
export const favorites = pgTable("favorites", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  contentId: varchar("content_id").notNull().references(() => content.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
});

// Watch history and progress
export const watchHistory = pgTable("watch_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  contentId: varchar("content_id").notNull().references(() => content.id, { onDelete: "cascade" }),
  progress: integer("progress").default(0), // percentage or time in seconds
  lastWatched: timestamp("last_watched").defaultNow(),
  isCompleted: boolean("is_completed").default(false),
  season: varchar("season"), // for TV shows
  episode: varchar("episode"), // for TV shows
});

// Define relations
export const usersRelations = relations(users, ({ many }) => ({
  serviceConnections: many(serviceConnections),
  favorites: many(favorites),
  watchHistory: many(watchHistory),
}));

export const serviceConnectionsRelations = relations(serviceConnections, ({ one }) => ({
  user: one(users, {
    fields: [serviceConnections.userId],
    references: [users.id],
  }),
}));

export const contentRelations = relations(content, ({ many }) => ({
  favorites: many(favorites),
  watchHistory: many(watchHistory),
}));

export const favoritesRelations = relations(favorites, ({ one }) => ({
  user: one(users, {
    fields: [favorites.userId],
    references: [users.id],
  }),
  content: one(content, {
    fields: [favorites.contentId],
    references: [content.id],
  }),
}));

export const watchHistoryRelations = relations(watchHistory, ({ one }) => ({
  user: one(users, {
    fields: [watchHistory.userId],
    references: [users.id],
  }),
  content: one(content, {
    fields: [watchHistory.contentId],
    references: [content.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  email: true,
  firstName: true,
  lastName: true,
  profileImageUrl: true,
});

export const insertServiceConnectionSchema = createInsertSchema(serviceConnections).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertContentSchema = createInsertSchema(content).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertFavoriteSchema = createInsertSchema(favorites).omit({
  id: true,
  createdAt: true,
});

export const insertWatchHistorySchema = createInsertSchema(watchHistory).omit({
  id: true,
  lastWatched: true,
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type ServiceConnection = typeof serviceConnections.$inferSelect;
export type InsertServiceConnection = z.infer<typeof insertServiceConnectionSchema>;
export type Content = typeof content.$inferSelect;
export type InsertContent = z.infer<typeof insertContentSchema>;
export type Favorite = typeof favorites.$inferSelect;
export type InsertFavorite = z.infer<typeof insertFavoriteSchema>;
export type WatchHistory = typeof watchHistory.$inferSelect;
export type InsertWatchHistory = z.infer<typeof insertWatchHistorySchema>;
export type Favorite = typeof favorites.$inferSelect;
export type InsertFavorite = z.infer<typeof insertFavoriteSchema>;
export type WatchHistory = typeof watchHistory.$inferSelect;
export type InsertWatchHistory = z.infer<typeof insertWatchHistorySchema>;
