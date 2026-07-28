import { Router } from "express";
import { and, asc, eq } from "drizzle-orm";
import { db } from "../db";
import {
  contentItems,
  contentPlatformAvailability,
  contentTypeEnum,
  platforms,
} from "@shared/schema";

const router = Router();

// Response shapes are kept byte-compatible with the previous Supabase-backed
// implementation (snake_case keys, same key order, same nesting — including
// the plural "platforms" embed key PostgREST used) so no client changes are
// needed. See the consolidation plan for the field-level audit.

/**
 * GET /api/catalog/items
 * List content items from the catalog.
 * Optional query params:
 *   type   - filter by content_type ("movie" | "series")
 *   limit  - max rows to return (default 50, max 200)
 *   offset - pagination offset (default 0)
 */
router.get("/items", async (req, res) => {
  try {
    const type = req.query.type as string | undefined;
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const offset = Number(req.query.offset) || 0;

    const rows = await db.query.contentItems.findMany({
      where: type
        ? eq(contentItems.contentType, type as (typeof contentTypeEnum.enumValues)[number])
        : undefined,
      orderBy: asc(contentItems.title),
      limit,
      offset,
      with: {
        availability: {
          with: { platform: true },
        },
      },
    });

    const items = rows.map((row) => {
      const slugs = row.availability
        .filter((a) => a.isAvailable && a.regionCode === "US")
        .map((a) => a.platform?.slug)
        .filter((s): s is string => typeof s === "string");
      return {
        id: row.id,
        content_type: row.contentType,
        title: row.title,
        original_title: row.originalTitle,
        description: row.description,
        release_year: row.releaseYear,
        runtime_minutes: row.runtimeMinutes,
        poster_url: row.posterUrl,
        backdrop_url: row.backdropUrl,
        tmdb_id: row.tmdbId,
        imdb_id: row.imdbId,
        platform_slugs: Array.from(new Set(slugs)),
      };
    });

    // The Supabase implementation never requested a count, so `total` was
    // always null. Preserved as-is; no client reads it.
    res.json({ items, offset, limit, total: null });
  } catch (err) {
    console.error("[catalog] list unexpected error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /api/catalog/items/:id
 * Fetch a single content item by its UUID.
 */
router.get("/items/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const [row] = await db
      .select()
      .from(contentItems)
      .where(eq(contentItems.id, id))
      .limit(1);

    if (!row) {
      return res.status(404).json({ error: "Content item not found" });
    }

    res.json({
      id: row.id,
      content_type: row.contentType,
      title: row.title,
      original_title: row.originalTitle,
      description: row.description,
      release_year: row.releaseYear,
      runtime_minutes: row.runtimeMinutes,
      poster_url: row.posterUrl,
      backdrop_url: row.backdropUrl,
      tmdb_id: row.tmdbId,
      imdb_id: row.imdbId,
      season_number: row.seasonNumber,
      episode_number: row.episodeNumber,
      parent_series_id: row.parentSeriesId,
    });
  } catch (err) {
    console.error("[catalog] item unexpected error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /api/catalog/items/:id/availability
 * Fetch availability rows for a content item, joined with platform info.
 * Returns which platforms carry this content and with what details.
 */
router.get("/items/:id/availability", async (req, res) => {
  try {
    const { id } = req.params;
    const region = (req.query.region as string) || "US";

    const rows = await db
      .select()
      .from(contentPlatformAvailability)
      .innerJoin(platforms, eq(contentPlatformAvailability.platformId, platforms.id))
      .where(
        and(
          eq(contentPlatformAvailability.contentItemId, id),
          eq(contentPlatformAvailability.regionCode, region),
          eq(contentPlatformAvailability.isAvailable, true),
        ),
      );

    const availability = rows.map(({ content_platform_availability: a, platforms: p }) => ({
      id: a.id,
      is_available: a.isAvailable,
      availability_type: a.availabilityType,
      deep_link_url: a.deepLinkUrl,
      web_link_url: a.webLinkUrl,
      region_code: a.regionCode,
      quality_label: a.qualityLabel,
      // PostgREST serialized numeric as a JSON number; node-postgres returns
      // a string. Normalize so the contract doesn't drift when prices land.
      price_numeric: a.priceNumeric === null ? null : Number(a.priceNumeric),
      currency_code: a.currencyCode,
      last_verified_at: a.lastVerifiedAt,
      platforms: {
        id: p.id,
        slug: p.slug,
        name: p.name,
        logo_url: p.logoUrl,
        website_url: p.websiteUrl,
        deep_link_base: p.deepLinkBase,
      },
    }));

    res.json({ content_item_id: id, region, availability });
  } catch (err) {
    console.error("[catalog] availability unexpected error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
