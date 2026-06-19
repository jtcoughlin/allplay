/**
 * scripts/ingest-tmdb-availability.js
 *
 * Pull real US flatrate (subscription) watch-provider data from TMDb for every
 * content_items row that has a tmdb_id, and upsert it into
 * content_platform_availability.
 *
 * IMPORTANT: this script does NOT delete stale rows. It upserts on the unique
 * constraint (content_item_id, platform_id, region_code, availability_type).
 * Existing subscription rows for an (item, platform) pair are overwritten,
 * but rows for pairs the script does NOT touch are left in place. For the
 * first real-data run, consider clearing synthetic leftovers manually first:
 *
 *   DELETE FROM content_platform_availability
 *    WHERE region_code = 'US' AND availability_type = 'subscription';
 *
 * Usage:
 *   node scripts/ingest-tmdb-availability.js [--dry-run] [--limit N] [--sleep-ms M]
 *
 * Required env vars:
 *   TMDB_API_KEY                 (v3 API key, query-param style)
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Flags:
 *   --dry-run       Fetch from TMDb and compute the rows we'd insert, but do
 *                   not touch the database. Prints the same summary.
 *   --limit N       Only process the first N content items (by title order).
 *   --sleep-ms M    Politeness sleep between TMDb calls (default 300).
 */

import { createClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!TMDB_API_KEY) throw new Error("Missing TMDB_API_KEY");
if (!SUPABASE_URL) throw new Error("Missing SUPABASE_URL");
if (!SUPABASE_SERVICE_ROLE_KEY) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");

const REGION = "US";
const AVAILABILITY_TYPE = "subscription";
const QUALITY_LABEL = "HD";
const TMDB_BASE = "https://api.themoviedb.org/3";
const DEFAULT_SLEEP_MS = 300;
const UPSERT_BATCH_SIZE = 100;
const UPSERT_CONFLICT_TARGET =
  "content_item_id,platform_id,region_code,availability_type";

// Mapping locked in by user — maps TMDb watch-provider IDs to our platform
// slugs. Multiple TMDb IDs can map to the same slug (different tiers, ad
// variants). The comments record the provider_name TMDb uses today for each ID
// so we can cross-check if TMDb ever changes things.
const TMDB_PROVIDER_ID_TO_SLUG = new Map([
  [8, "netflix"],            // Netflix
  [15, "hulu"],              // Hulu
  [337, "disney-plus"],      // Disney Plus
  [1899, "max"],             // TMDb still labels this "HBO Max" — map by ID
  [9, "prime-video"],        // Amazon Prime Video
  [2100, "prime-video"],     // Amazon Prime Video with Ads
  [613, "prime-video"],      // Freevee / free-with-ads variant
  [350, "apple-tv-plus"],    // Apple TV+ (do NOT include 2 — that's the Store rent/buy)
  [386, "peacock"],          // Peacock Premium
  [387, "peacock"],          // Peacock Premium Plus
  [2303, "paramount-plus"],  // Paramount+ Premium
  [2616, "paramount-plus"],  // Paramount+ Essential
]);

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const args = { dryRun: false, limit: null, sleepMs: DEFAULT_SLEEP_MS };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dry-run") {
      args.dryRun = true;
    } else if (a === "--limit") {
      args.limit = Number(argv[++i]);
    } else if (a.startsWith("--limit=")) {
      args.limit = Number(a.slice("--limit=".length));
    } else if (a === "--sleep-ms") {
      args.sleepMs = Number(argv[++i]);
    } else if (a.startsWith("--sleep-ms=")) {
      args.sleepMs = Number(a.slice("--sleep-ms=".length));
    } else {
      throw new Error(`Unknown argument: ${a}`);
    }
  }
  if (args.limit !== null && (!Number.isFinite(args.limit) || args.limit <= 0)) {
    throw new Error(`--limit must be a positive number, got: ${args.limit}`);
  }
  if (!Number.isFinite(args.sleepMs) || args.sleepMs < 0) {
    throw new Error(`--sleep-ms must be a non-negative number, got: ${args.sleepMs}`);
  }
  return args;
}

// ---------------------------------------------------------------------------
// Data access
// ---------------------------------------------------------------------------

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

async function fetchAllContentItems(supabase, limit) {
  const PAGE_SIZE = 1000;
  let all = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("content_items")
      .select("id, content_type, title, tmdb_id")
      .not("tmdb_id", "is", null)
      .order("title")
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw new Error(`Failed to fetch content_items: ${error.message}`);

    all = all.concat(data);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  if (limit !== null) all = all.slice(0, limit);
  return all;
}

async function fetchActivePlatformsBySlug(supabase) {
  const { data, error } = await supabase
    .from("platforms")
    .select("id, slug, name, website_url, deep_link_base, is_active")
    .eq("is_active", true);

  if (error) throw new Error(`Failed to fetch platforms: ${error.message}`);

  const bySlug = new Map();
  for (const p of data) bySlug.set(p.slug, p);
  return bySlug;
}

async function fetchTmdbWatchProviders(tmdbId, contentType) {
  const path = contentType === "series" ? "tv" : "movie";
  const url = `${TMDB_BASE}/${path}/${tmdbId}/watch/providers?api_key=${TMDB_API_KEY}`;

  try {
    const res = await fetch(url);
    if (res.status === 404) return { kind: "not_found" };
    if (!res.ok) {
      const text = await res.text();
      return {
        kind: "http_error",
        message: `${res.status} ${res.statusText}: ${text.slice(0, 200)}`,
      };
    }
    const json = await res.json();
    return { kind: "ok", data: json };
  } catch (err) {
    return { kind: "network_error", message: err.message };
  }
}

// ---------------------------------------------------------------------------
// Mapping / extraction
// ---------------------------------------------------------------------------

function extractUsFlatrateSlugs(tmdbData) {
  const us = tmdbData?.results?.US;
  if (!us) return { kind: "no_us_data" };

  const flatrate = us.flatrate;
  if (!Array.isArray(flatrate) || flatrate.length === 0) {
    return { kind: "no_flatrate" };
  }

  const slugs = new Set();
  const unmapped = [];
  for (const entry of flatrate) {
    const slug = TMDB_PROVIDER_ID_TO_SLUG.get(entry.provider_id);
    if (slug) {
      slugs.add(slug);
    } else {
      unmapped.push({ provider_id: entry.provider_id, provider_name: entry.provider_name });
    }
  }

  if (slugs.size === 0) {
    return { kind: "no_mapped_providers", unmapped };
  }
  return { kind: "ok", slugs: Array.from(slugs), unmapped };
}

function buildRowsForItem(item, slugs, platformsBySlug, nowIso) {
  const rows = [];
  for (const slug of slugs) {
    const platform = platformsBySlug.get(slug);
    if (!platform) continue; // defensive — mapping references unknown slug
    rows.push({
      content_item_id: item.id,
      platform_id: platform.id,
      is_available: true,
      availability_type: AVAILABILITY_TYPE,
      deep_link_url: platform.deep_link_base || null,
      web_link_url: platform.website_url || null,
      region_code: REGION,
      quality_label: QUALITY_LABEL,
      last_verified_at: nowIso,
    });
  }
  return rows;
}

// ---------------------------------------------------------------------------
// Upsert
// ---------------------------------------------------------------------------

async function upsertBatches(supabase, rows) {
  let totalUpserted = 0;
  let totalErrored = 0;
  const batchErrors = [];

  for (let b = 0; b < rows.length; b += UPSERT_BATCH_SIZE) {
    const batch = rows.slice(b, b + UPSERT_BATCH_SIZE);
    const batchNum = Math.floor(b / UPSERT_BATCH_SIZE) + 1;

    const { error } = await supabase
      .from("content_platform_availability")
      .upsert(batch, { onConflict: UPSERT_CONFLICT_TARGET });

    if (error) {
      console.error(`  ❌ Batch ${batchNum} failed: [${error.code}] ${error.message}`);
      batchErrors.push({ batchNum, error: error.message, code: error.code });
      totalErrored += batch.length;
    } else {
      console.log(`  ✅ Batch ${batchNum}: ${batch.length} rows upserted`);
      totalUpserted += batch.length;
    }
  }

  return { totalUpserted, totalErrored, batchErrors };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const nowIso = new Date().toISOString();

  console.log("=== Vuno Real Availability Ingestion (TMDb) ===");
  console.log(`  Mode:               ${args.dryRun ? "DRY RUN (no DB writes)" : "LIVE (will upsert)"}`);
  console.log(`  Region:             ${REGION}`);
  console.log(`  Access type:        ${AVAILABILITY_TYPE} (flatrate only)`);
  console.log(`  Sleep between calls:${args.sleepMs}ms`);
  if (args.limit !== null) console.log(`  Limit:              first ${args.limit} items`);
  console.log("");

  console.log("🏷️  Fetching active platforms...");
  const platformsBySlug = await fetchActivePlatformsBySlug(supabase);
  console.log(`   Found ${platformsBySlug.size} active platforms: ${Array.from(platformsBySlug.keys()).join(", ")}`);

  // Coverage sanity check — surface any mapping/DB drift up front
  const slugsFromMapping = new Set(TMDB_PROVIDER_ID_TO_SLUG.values());
  const dbSlugsNotInMapping = Array.from(platformsBySlug.keys()).filter((s) => !slugsFromMapping.has(s));
  const mappingSlugsNotInDb = Array.from(slugsFromMapping).filter((s) => !platformsBySlug.has(s));
  if (dbSlugsNotInMapping.length > 0) {
    console.warn(`   ⚠️  Active platforms with no TMDb mapping (ingest will skip them): ${dbSlugsNotInMapping.join(", ")}`);
  }
  if (mappingSlugsNotInDb.length > 0) {
    console.warn(`   ⚠️  Mapping references slugs not in active platforms (rows will be dropped): ${mappingSlugsNotInDb.join(", ")}`);
  }
  console.log("");

  console.log("📋 Fetching content_items with tmdb_id...");
  const items = await fetchAllContentItems(supabase, args.limit);
  const movies = items.filter((c) => c.content_type === "movie");
  const series = items.filter((c) => c.content_type === "series");
  console.log(`   Total: ${items.length}  (${movies.length} movies, ${series.length} series)`);
  console.log("");

  console.log(`🌐 Fetching watch-providers from TMDb (${args.sleepMs}ms between calls)...`);

  const categorized = {
    withMappedProviders: [],
    noUsData: [],
    noFlatrate: [],
    noMappedProviders: [],
    tmdbNotFound: [],
    tmdbError: [],
  };
  const allUnmapped = new Map(); // provider_id -> { provider_name, count, sampleItems }
  const rowsToUpsert = [];

  function recordUnmapped(unmapped, item) {
    for (const u of unmapped) {
      const existing = allUnmapped.get(u.provider_id) || {
        provider_name: u.provider_name,
        count: 0,
        sampleItems: [],
      };
      existing.count++;
      if (existing.sampleItems.length < 3) existing.sampleItems.push(item.title);
      allUnmapped.set(u.provider_id, existing);
    }
  }

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const label = `[${i + 1}/${items.length}] ${item.content_type} "${item.title}" (tmdb_id ${item.tmdb_id})`;

    const fetchResult = await fetchTmdbWatchProviders(item.tmdb_id, item.content_type);

    if (fetchResult.kind === "not_found") {
      categorized.tmdbNotFound.push(item);
      console.log(`  ❓ ${label} — TMDb 404`);
    } else if (fetchResult.kind === "http_error" || fetchResult.kind === "network_error") {
      categorized.tmdbError.push({ item, error: fetchResult.message });
      console.log(`  ❌ ${label} — ${fetchResult.kind}: ${fetchResult.message}`);
    } else {
      const extracted = extractUsFlatrateSlugs(fetchResult.data);
      if (extracted.kind === "no_us_data") {
        categorized.noUsData.push(item);
        console.log(`  ⬜ ${label} — no US availability data`);
      } else if (extracted.kind === "no_flatrate") {
        categorized.noFlatrate.push(item);
        console.log(`  ⬜ ${label} — US has rent/buy/ads only, no flatrate`);
      } else if (extracted.kind === "no_mapped_providers") {
        categorized.noMappedProviders.push({ item, unmapped: extracted.unmapped });
        recordUnmapped(extracted.unmapped, item);
        const unmappedSummary = extracted.unmapped
          .map((u) => `${u.provider_name}(${u.provider_id})`)
          .join(", ");
        console.log(`  ⚠️  ${label} — no mapped providers (got: ${unmappedSummary})`);
      } else {
        categorized.withMappedProviders.push({ item, slugs: extracted.slugs });
        rowsToUpsert.push(...buildRowsForItem(item, extracted.slugs, platformsBySlug, nowIso));
        recordUnmapped(extracted.unmapped, item);
        console.log(`  ✅ ${label} — ${extracted.slugs.join(", ")}`);
      }
    }

    if (i < items.length - 1) await sleep(args.sleepMs);
  }

  // -------------------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------------------

  console.log("");
  console.log("=== Summary ===");
  console.log(`  ✅ Items with mapped flatrate providers: ${categorized.withMappedProviders.length}`);
  console.log(`  ⚠️  Items with only unmapped providers:   ${categorized.noMappedProviders.length}`);
  console.log(`  ⬜ Items with no US data:                ${categorized.noUsData.length}`);
  console.log(`  ⬜ Items with US but no flatrate:        ${categorized.noFlatrate.length}`);
  console.log(`  ❓ TMDb 404 (no record):                 ${categorized.tmdbNotFound.length}`);
  console.log(`  ❌ TMDb errors:                          ${categorized.tmdbError.length}`);
  console.log(`  📦 Total rows to upsert:                 ${rowsToUpsert.length}`);
  console.log("");

  if (categorized.tmdbError.length > 0) {
    console.log("--- TMDb errors ---");
    for (const e of categorized.tmdbError) {
      console.log(`  ${e.item.content_type} "${e.item.title}" (tmdb_id ${e.item.tmdb_id}): ${e.error}`);
    }
    console.log("");
  }

  if (allUnmapped.size > 0) {
    console.log("--- Unmapped TMDb providers seen ---");
    console.log("    (TMDb returned these but our mapping table doesn't know about them — ");
    console.log("     consider adding them if any are services Vuno should support)");
    const sortedUnmapped = Array.from(allUnmapped.entries()).sort((a, b) => b[1].count - a[1].count);
    for (const [id, info] of sortedUnmapped) {
      console.log(`  provider_id ${id} (${info.provider_name}): ${info.count} item(s) — e.g. ${info.sampleItems.join(", ")}`);
    }
    console.log("");
  }

  const emptyItems = [
    ...categorized.noUsData,
    ...categorized.noFlatrate,
    ...categorized.noMappedProviders.map((x) => x.item),
    ...categorized.tmdbNotFound,
  ];
  if (emptyItems.length > 0) {
    console.log(`--- Items that will end up with no platform_slugs (${emptyItems.length}) ---`);
    for (const it of emptyItems) {
      console.log(`  ${it.content_type} "${it.title}" (tmdb_id ${it.tmdb_id})`);
    }
    console.log("");
  }

  // -------------------------------------------------------------------------
  // Write phase
  // -------------------------------------------------------------------------

  if (args.dryRun) {
    console.log("🟡 DRY RUN — no database writes performed.");
    return;
  }

  if (rowsToUpsert.length === 0) {
    console.log("🟡 No rows to upsert. Database not touched.");
    return;
  }

  console.log(`🔄 Upserting ${rowsToUpsert.length} rows into content_platform_availability...`);
  const { totalUpserted, totalErrored, batchErrors } = await upsertBatches(supabase, rowsToUpsert);

  console.log("");
  console.log("=== DB write result ===");
  console.log(`  ✅ Rows upserted: ${totalUpserted}`);
  console.log(`  ❌ Rows errored:  ${totalErrored}`);
  if (batchErrors.length > 0) {
    console.log("  Batch errors:");
    for (const e of batchErrors) {
      console.log(`    Batch ${e.batchNum}: [${e.code}] ${e.error}`);
    }
  }

  console.log("");
  console.log("NOTE: this script does NOT delete rows. Any pre-existing subscription rows");
  console.log("      in content_platform_availability for (item, platform) pairs that this");
  console.log("      run did NOT write will remain in place. If this is the first real-data");
  console.log("      run and you want to clear synthetic leftovers, run this manually in");
  console.log("      Supabase BEFORE the next run:");
  console.log("");
  console.log("        DELETE FROM content_platform_availability");
  console.log("         WHERE region_code = 'US' AND availability_type = 'subscription';");
  console.log("");

  if (totalErrored > 0) process.exit(1);
}

main().catch((err) => {
  console.error("\n🔥 Fatal error:", err.message);
  process.exit(1);
});
