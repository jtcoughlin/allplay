import { Router } from "express";
import { supabase } from "../supabaseClient.js";

const router = Router();

/**
 * GET /api/catalog/items
 * List content items from Supabase.
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

    let query = supabase
      .from("content_items")
      .select(
        `
        id,
        content_type,
        title,
        original_title,
        description,
        release_year,
        runtime_minutes,
        poster_url,
        backdrop_url,
        tmdb_id,
        imdb_id,
        content_platform_availability (
          is_available,
          region_code,
          platforms ( slug )
        )
      `
      )
      .order("title")
      .range(offset, offset + limit - 1);

    if (type) {
      query = query.eq("content_type", type);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error("[catalog] list error:", error.message);
      return res.status(500).json({ error: "Failed to fetch content items" });
    }

    const items = (data ?? []).map((row: any) => {
      const availability = Array.isArray(row.content_platform_availability)
        ? row.content_platform_availability
        : [];
      const slugs = availability
        .filter((a: any) => a.is_available && a.region_code === "US")
        .map((a: any) => a.platforms?.slug)
        .filter((s: any): s is string => typeof s === "string");
      const platform_slugs = Array.from(new Set(slugs));
      const { content_platform_availability, ...rest } = row;
      return { ...rest, platform_slugs };
    });

    res.json({ items, offset, limit, total: count ?? null });
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

    const { data, error } = await supabase
      .from("content_items")
      .select(
        "id, content_type, title, original_title, description, release_year, runtime_minutes, poster_url, backdrop_url, tmdb_id, imdb_id, season_number, episode_number, parent_series_id"
      )
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return res.status(404).json({ error: "Content item not found" });
      }
      console.error("[catalog] item fetch error:", error.message);
      return res.status(500).json({ error: "Failed to fetch content item" });
    }

    res.json(data);
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

    const { data, error } = await supabase
      .from("content_platform_availability")
      .select(
        `
        id,
        is_available,
        availability_type,
        deep_link_url,
        web_link_url,
        region_code,
        quality_label,
        price_numeric,
        currency_code,
        last_verified_at,
        platforms (
          id,
          slug,
          name,
          logo_url,
          website_url,
          deep_link_base
        )
      `
      )
      .eq("content_item_id", id)
      .eq("region_code", region)
      .eq("is_available", true);

    if (error) {
      console.error("[catalog] availability fetch error:", error.message);
      return res.status(500).json({ error: "Failed to fetch availability" });
    }

    res.json({ content_item_id: id, region, availability: data });
  } catch (err) {
    console.error("[catalog] availability unexpected error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
