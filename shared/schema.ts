import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  pgEnum,
  timestamp,
  varchar,
  text,
  integer,
  bigint,
  decimal,
  boolean,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
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
  directUrl: text("direct_url"), // Direct URL to content page on streaming service
  imageUrl: text("image_url"),
  posterSource: varchar("poster_source"), // 'tmdb', 'youtube', 'staticMap', 'fallback', 'missing'
  posterLocked: boolean("poster_locked").default(false), // If true, poster cannot be overwritten
  rating: varchar("rating"), // PG, R, TV-14, etc.
  year: integer("year"),
  artist: text("artist"), // for music content
  album: text("album"), // for music content
  duration: integer("duration"), // in minutes
  isLive: boolean("is_live").default(false),
  category: text("category"), // content curation categories like "Popular in US", "2025 Biggest Hits"
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
}, (table) => [
  unique("unique_user_content").on(table.userId, table.contentId),
]);

// User preferences for personalized recommendations
export const userPreferences = pgTable("user_preferences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  preferredGenres: text("preferred_genres").array().default([]), // fantasy, sitcom, reality, news, etc.
  preferredContentTypes: text("preferred_content_types").array().default([]), // movie, show, music, live, sports
  preferredSports: text("preferred_sports").array().default([]), // nfl, nba, mlb, nhl, soccer, tennis, etc.
  favoriteTeams: jsonb("favorite_teams").default({}), // {nfl: ["patriots", "cowboys"], nba: ["lakers"]}
  interests: text("interests").array().default([]), // finance, business, politics, entertainment, etc.
  contentRatings: text("content_ratings").array().default([]), // G, PG, PG-13, R, etc.
  preferredLanguages: text("preferred_languages").array().default(["en"]),
  autoAddLikedContent: boolean("auto_add_liked_content").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  unique("unique_user_preferences").on(table.userId),
]);

// Define relations
export const usersRelations = relations(users, ({ many, one }) => ({
  serviceConnections: many(serviceConnections),
  favorites: many(favorites),
  watchHistory: many(watchHistory),
  preferences: one(userPreferences),
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

export const userPreferencesRelations = relations(userPreferences, ({ one }) => ({
  user: one(users, {
    fields: [userPreferences.userId],
    references: [users.id],
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

export const insertUserPreferencesSchema = createInsertSchema(userPreferences).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
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
export type UserPreferences = typeof userPreferences.$inferSelect;
export type InsertUserPreferences = z.infer<typeof insertUserPreferencesSchema>;

// ---------------------------------------------------------------------------
// Catalog tables (consolidated from Supabase — see migrations/0001)
//
// These mirror the Supabase schema exactly, as introspected 2026-07-27:
// column types, defaults, constraint names, and indexes all match so the
// ingestion scripts' upsert conflict targets keep working unchanged.
// The legacy `content` table above is NOT part of the catalog — it belongs
// to Live TV (liveTVSync writes it) and is intentionally left untouched.
// ---------------------------------------------------------------------------

// Full enum as designed in Supabase. Only 'movie' and 'series' are used
// today; the other values anticipate future unification of live TV, sports,
// and podcasts into the catalog.
export const contentTypeEnum = pgEnum("content_type", [
  "movie",
  "series",
  "episode",
  "live_channel",
  "sports_event",
  "podcast",
  "other",
]);

export const contentItems = pgTable("content_items", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  contentType: contentTypeEnum("content_type").notNull(),
  title: text("title").notNull(),
  originalTitle: text("original_title"),
  description: text("description"),
  releaseYear: integer("release_year"),
  runtimeMinutes: integer("runtime_minutes"),
  posterUrl: text("poster_url"),
  backdropUrl: text("backdrop_url"),
  tmdbId: bigint("tmdb_id", { mode: "number" }),
  imdbId: text("imdb_id"),
  seasonNumber: integer("season_number"),
  episodeNumber: integer("episode_number"),
  parentSeriesId: uuid("parent_series_id").references(
    (): AnyPgColumn => contentItems.id,
    { onDelete: "set null" },
  ),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  unique("content_items_tmdb_unique").on(table.tmdbId, table.contentType),
  index("idx_content_items_title").on(table.title),
  index("idx_content_items_release_year").on(table.releaseYear),
  index("idx_content_items_parent_series_id").on(table.parentSeriesId),
]);

export const platforms = pgTable("platforms", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  slug: text("slug").notNull().unique("platforms_slug_key"),
  name: text("name").notNull().unique("platforms_name_key"),
  logoUrl: text("logo_url"),
  appStoreUrl: text("app_store_url"),
  websiteUrl: text("website_url"),
  deepLinkBase: text("deep_link_base"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const contentPlatformAvailability = pgTable("content_platform_availability", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  contentItemId: uuid("content_item_id").notNull()
    .references(() => contentItems.id, { onDelete: "cascade" }),
  platformId: uuid("platform_id").notNull()
    .references(() => platforms.id, { onDelete: "cascade" }),
  isAvailable: boolean("is_available").notNull().default(true),
  availabilityType: text("availability_type"),
  deepLinkUrl: text("deep_link_url").notNull(),
  webLinkUrl: text("web_link_url"),
  regionCode: text("region_code").default("US"),
  qualityLabel: text("quality_label"),
  priceNumeric: decimal("price_numeric"),
  currencyCode: text("currency_code"),
  lastVerifiedAt: timestamp("last_verified_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  unique("content_platform_unique").on(
    table.contentItemId, table.platformId, table.regionCode, table.availabilityType,
  ),
  index("idx_cpa_content_item_id").on(table.contentItemId),
  index("idx_cpa_platform_id").on(table.platformId),
  index("idx_cpa_region_code").on(table.regionCode),
]);

export const contentItemsRelations = relations(contentItems, ({ one, many }) => ({
  availability: many(contentPlatformAvailability),
  parentSeries: one(contentItems, {
    fields: [contentItems.parentSeriesId],
    references: [contentItems.id],
  }),
}));

export const platformsRelations = relations(platforms, ({ many }) => ({
  availability: many(contentPlatformAvailability),
}));

export const contentPlatformAvailabilityRelations = relations(
  contentPlatformAvailability,
  ({ one }) => ({
    contentItem: one(contentItems, {
      fields: [contentPlatformAvailability.contentItemId],
      references: [contentItems.id],
    }),
    platform: one(platforms, {
      fields: [contentPlatformAvailability.platformId],
      references: [platforms.id],
    }),
  }),
);

export const insertContentItemSchema = createInsertSchema(contentItems).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPlatformSchema = createInsertSchema(platforms).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertContentPlatformAvailabilitySchema =
  createInsertSchema(contentPlatformAvailability).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  });

export type ContentItem = typeof contentItems.$inferSelect;
export type InsertContentItem = z.infer<typeof insertContentItemSchema>;
export type Platform = typeof platforms.$inferSelect;
export type InsertPlatform = z.infer<typeof insertPlatformSchema>;
export type ContentPlatformAvailability = typeof contentPlatformAvailability.$inferSelect;
export type InsertContentPlatformAvailability =
  z.infer<typeof insertContentPlatformAvailabilitySchema>;
