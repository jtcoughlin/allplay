/**
 * scripts/seed-tmdb.js
 *
 * Seed the catalog from TMDb's popular movie/series lists, upserting into
 * Neon's content_items table on the (tmdb_id, content_type) unique
 * constraint. Re-running refreshes titles/descriptions/artwork for known
 * items and inserts newly-popular ones.
 *
 * Ported from Supabase to Neon 2026-07-27 (consolidation Phase 5); the TMDb
 * fetching and row mapping are unchanged.
 *
 * Usage (Replit Shell):
 *   node scripts/seed-tmdb.js --dry-run   # fetch + report, no DB writes
 *   node scripts/seed-tmdb.js             # live upsert into Neon
 */

import { neon } from "@neondatabase/serverless";

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const DATABASE_URL = process.env.DATABASE_URL;

if (!TMDB_API_KEY) throw new Error("Missing TMDB_API_KEY");
if (!DATABASE_URL) throw new Error("Missing DATABASE_URL");

const DRY_RUN = process.argv.includes("--dry-run");

const sql = neon(DATABASE_URL);
async function q(text, params = []) {
  if (typeof sql.query === "function") return sql.query(text, params);
  return sql(text, params);
}

const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w500";

const UPSERT_SQL = `
  INSERT INTO content_items
    (content_type, title, description, release_year, poster_url, backdrop_url, tmdb_id)
  VALUES ($1::content_type, $2, $3, $4, $5, $6, $7)
  ON CONFLICT (tmdb_id, content_type) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    release_year = EXCLUDED.release_year,
    poster_url = EXCLUDED.poster_url,
    backdrop_url = EXCLUDED.backdrop_url,
    updated_at = now()
`;

function yearFromDate(dateStr) {
  if (!dateStr) return null;
  const year = Number(String(dateStr).slice(0, 4));
  return Number.isNaN(year) ? null : year;
}

async function fetchTmdb(endpoint) {
  const url = `https://api.themoviedb.org/3/${endpoint}?api_key=${TMDB_API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`TMDb request failed: ${res.status} ${res.statusText} - ${text}`);
  }
  return res.json();
}

async function upsertRows(rows, label) {
  if (DRY_RUN) {
    console.log(`DRY RUN — would insert/update ${rows.length} ${label}:`);
    for (const r of rows) {
      console.log(`  ${r.content_type} "${r.title}" (${r.release_year ?? "?"}, tmdb_id ${r.tmdb_id})`);
    }
    return;
  }
  for (const r of rows) {
    await q(UPSERT_SQL, [
      r.content_type,
      r.title,
      r.description,
      r.release_year,
      r.poster_url,
      r.backdrop_url,
      r.tmdb_id,
    ]);
  }
  console.log(`Inserted/updated ${rows.length} ${label}`);
}

async function upsertMovies() {
  const data = await fetchTmdb("movie/popular");

  const rows = data.results.map((movie) => ({
    content_type: "movie",
    title: movie.title,
    description: movie.overview || null,
    release_year: yearFromDate(movie.release_date),
    poster_url: movie.poster_path ? `${TMDB_IMAGE_BASE}${movie.poster_path}` : null,
    backdrop_url: movie.backdrop_path ? `${TMDB_IMAGE_BASE}${movie.backdrop_path}` : null,
    tmdb_id: movie.id,
  }));

  await upsertRows(rows, "movies");
}

async function upsertSeries() {
  const data = await fetchTmdb("tv/popular");

  const rows = data.results.map((show) => ({
    content_type: "series",
    title: show.name,
    description: show.overview || null,
    release_year: yearFromDate(show.first_air_date),
    poster_url: show.poster_path ? `${TMDB_IMAGE_BASE}${show.poster_path}` : null,
    backdrop_url: show.backdrop_path ? `${TMDB_IMAGE_BASE}${show.backdrop_path}` : null,
    tmdb_id: show.id,
  }));

  await upsertRows(rows, "series");
}

async function main() {
  console.log(`TMDb seed — target: Neon content_items ${DRY_RUN ? "(DRY RUN, no writes)" : "(LIVE)"}`);
  await upsertMovies();
  await upsertSeries();
  console.log("TMDb seed complete");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
