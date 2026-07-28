/**
 * scripts/audit-db-state.js
 *
 * PHASE 0 — READ-ONLY audit of both databases before the Supabase → Neon
 * consolidation. This script contains ONLY SELECT statements. It creates,
 * alters, and deletes nothing.
 *
 * What it reports:
 *   Section A (Neon, via DATABASE_URL):
 *     - server version + current database
 *     - every table in the public schema, with row counts
 *     - full column definitions for: content, favorites, watch_history
 *     - all constraints (FK/PK/unique) and indexes on those tables
 *     - whether the three planned new tables already exist (they should NOT)
 *     - safe samples: favorites, watch_history, content (no tokens, no sessions)
 *   Section B (Supabase, via SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY):
 *     - row counts for content_items, platforms, content_platform_availability
 *     - all platforms rows
 *     - observed columns + per-column null rates for content_items and
 *       content_platform_availability (PostgREST cannot see information_schema,
 *       so exact types come from scripts/audit-supabase-schema.sql instead)
 *     - orphan checks on availability foreign keys
 *
 * Usage (Replit Shell):
 *   node scripts/audit-db-state.js
 */

import { neon } from "@neondatabase/serverless";
import { createClient } from "@supabase/supabase-js";

const DATABASE_URL = process.env.DATABASE_URL;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!DATABASE_URL) throw new Error("Missing DATABASE_URL");
if (!SUPABASE_URL) throw new Error("Missing SUPABASE_URL");
if (!SUPABASE_SERVICE_ROLE_KEY) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");

const sql = neon(DATABASE_URL);

// neon 0.10.x supports sql(text, params); 1.x uses sql.query(text, params).
// Support both so a future dependency bump doesn't break the audit.
async function q(text, params = []) {
  if (typeof sql.query === "function") return sql.query(text, params);
  return sql(text, params);
}

const IDENT_RE = /^[a-z_][a-z0-9_]*$/;

function hr(title) {
  console.log("");
  console.log("=".repeat(70));
  console.log(title);
  console.log("=".repeat(70));
}

function sub(title) {
  console.log("");
  console.log("--- " + title + " ---");
}

function table(rows) {
  if (!rows || rows.length === 0) {
    console.log("  (no rows)");
    return;
  }
  console.table(rows);
}

function maskedHost(url) {
  try {
    return new URL(url).host;
  } catch {
    return "(unparseable URL)";
  }
}

// ---------------------------------------------------------------------------
// Section A — Neon
// ---------------------------------------------------------------------------

const AUDIT_TABLES = ["content", "favorites", "watch_history"];
const PLANNED_NEW_TABLES = ["content_items", "platforms", "content_platform_availability"];
// Counts only — never dump rows from these (session blobs, oauth tokens, PII).
const SENSITIVE_TABLES = new Set(["sessions", "users", "service_connections"]);

async function auditNeon() {
  hr("SECTION A — NEON (via DATABASE_URL)");
  console.log("Host:", maskedHost(DATABASE_URL));

  const [meta] = await q(
    "SELECT current_database() AS db, version() AS version"
  );
  console.log("Database:", meta.db);
  console.log("Server:  ", meta.version);

  sub("A1. Tables in public schema");
  const tables = await q(
    `SELECT table_name
       FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name`
  );
  const tableNames = tables.map((t) => t.table_name);
  console.log(tableNames.length ? tableNames.join(", ") : "(none)");

  sub("A2. Row counts");
  const counts = [];
  for (const name of tableNames) {
    if (!IDENT_RE.test(name)) {
      counts.push({ table: name, rows: "(skipped: unusual name)" });
      continue;
    }
    try {
      const [row] = await q(`SELECT count(*)::int AS n FROM "${name}"`);
      counts.push({ table: name, rows: row.n });
    } catch (err) {
      counts.push({ table: name, rows: `(error: ${err.message})` });
    }
  }
  table(counts);

  sub("A3. Planned new table names — must NOT already exist");
  for (const name of PLANNED_NEW_TABLES) {
    const exists = tableNames.includes(name);
    console.log(`  ${name}: ${exists ? "⚠️  ALREADY EXISTS — Phase 1 conflict!" : "✅ absent (good)"}`);
  }

  const present = AUDIT_TABLES.filter((t) => tableNames.includes(t));
  const absent = AUDIT_TABLES.filter((t) => !tableNames.includes(t));
  for (const name of absent) {
    console.log(`\n⚠️  Expected table "${name}" does NOT exist in Neon.`);
  }

  if (present.length > 0) {
    sub("A4. Column definitions (content, favorites, watch_history)");
    const cols = await q(
      `SELECT table_name, ordinal_position, column_name, data_type,
              is_nullable, column_default
         FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = ANY($1)
        ORDER BY table_name, ordinal_position`,
      [present]
    );
    table(cols);

    sub("A5. Constraints (PK / FK / unique / check)");
    const cons = await q(
      `SELECT rel.relname AS table_name,
              con.conname AS constraint_name,
              con.contype AS type,
              pg_get_constraintdef(con.oid) AS definition
         FROM pg_constraint con
         JOIN pg_class rel ON rel.oid = con.conrelid
        WHERE rel.relnamespace = 'public'::regnamespace
          AND rel.relname = ANY($1)
        ORDER BY rel.relname, con.contype, con.conname`,
      [present]
    );
    table(cons);

    sub("A6. Indexes");
    const idx = await q(
      `SELECT tablename AS table_name, indexname, indexdef
         FROM pg_indexes
        WHERE schemaname = 'public' AND tablename = ANY($1)
        ORDER BY tablename, indexname`,
      [present]
    );
    table(idx);
  }

  if (tableNames.includes("favorites")) {
    sub("A7. favorites — sample rows (up to 5)");
    table(await q(`SELECT * FROM favorites ORDER BY created_at DESC NULLS LAST LIMIT 5`));
  }

  if (tableNames.includes("watch_history")) {
    sub("A8. watch_history — sample rows (up to 5)");
    table(await q(`SELECT * FROM watch_history ORDER BY last_watched DESC NULLS LAST LIMIT 5`));
  }

  if (tableNames.includes("content")) {
    sub("A9. legacy content — service breakdown");
    table(
      await q(
        `SELECT service, type, count(*)::int AS rows,
                bool_or(is_live) AS any_live
           FROM content
          GROUP BY service, type
          ORDER BY rows DESC`
      )
    );

    sub("A10. legacy content — sample rows (id/title/type/service only)");
    table(
      await q(
        `SELECT id, title, type, service, is_live, created_at
           FROM content
          ORDER BY created_at DESC NULLS LAST
          LIMIT 5`
      )
    );
  }

  sub("A11. Sensitive tables — counts only, rows never dumped");
  console.log("  " + [...SENSITIVE_TABLES].join(", "));
}

// ---------------------------------------------------------------------------
// Section B — Supabase (PostgREST: data-level audit only; exact types come
// from scripts/audit-supabase-schema.sql run in the Supabase SQL editor)
// ---------------------------------------------------------------------------

function nullRates(rows) {
  if (rows.length === 0) return [];
  const keys = new Set();
  for (const r of rows) Object.keys(r).forEach((k) => keys.add(k));
  return [...keys].map((k) => {
    const nulls = rows.filter((r) => r[k] === null || r[k] === undefined).length;
    const sample = rows.find((r) => r[k] !== null && r[k] !== undefined)?.[k];
    return {
      column: k,
      nulls: `${nulls}/${rows.length}`,
      sample_value:
        sample === undefined
          ? "(always null)"
          : String(sample).slice(0, 60),
    };
  });
}

async function fetchAll(supabase, tableName) {
  const PAGE = 1000;
  let all = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from(tableName)
      .select("*")
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`${tableName}: ${error.message}`);
    all = all.concat(data);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return all;
}

async function auditSupabase() {
  hr("SECTION B — SUPABASE (via SUPABASE_URL, PostgREST)");
  console.log("Host:", maskedHost(SUPABASE_URL));

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const contentItems = await fetchAll(supabase, "content_items");
  const platforms = await fetchAll(supabase, "platforms");
  const availability = await fetchAll(supabase, "content_platform_availability");

  sub("B1. Row counts");
  table([
    { table: "content_items", rows: contentItems.length },
    { table: "platforms", rows: platforms.length },
    { table: "content_platform_availability", rows: availability.length },
  ]);

  sub("B2. platforms — all rows");
  table(platforms);

  sub("B3. content_items — observed columns + null rates");
  table(nullRates(contentItems));

  sub("B4. content_items — type/year sanity");
  const byType = {};
  for (const c of contentItems) byType[c.content_type] = (byType[c.content_type] || 0) + 1;
  console.log("  by content_type:", JSON.stringify(byType));
  const badId = contentItems.filter(
    (c) => !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(c.id))
  );
  console.log(`  non-UUID ids: ${badId.length === 0 ? "none ✅" : badId.map((c) => c.id).join(", ")}`);
  const dupTmdb = new Map();
  for (const c of contentItems) {
    if (c.tmdb_id == null) continue;
    const key = `${c.tmdb_id}/${c.content_type}`;
    dupTmdb.set(key, (dupTmdb.get(key) || 0) + 1);
  }
  const dups = [...dupTmdb.entries()].filter(([, n]) => n > 1);
  console.log(`  duplicate (tmdb_id, content_type): ${dups.length === 0 ? "none ✅" : JSON.stringify(dups)}`);

  sub("B5. content_platform_availability — observed columns + null rates");
  table(nullRates(availability));

  sub("B6. availability — region/type breakdown + FK orphan check");
  const combos = {};
  for (const a of availability) {
    const key = `${a.region_code}/${a.availability_type}/available=${a.is_available}`;
    combos[key] = (combos[key] || 0) + 1;
  }
  console.log("  breakdown:", JSON.stringify(combos, null, 2));
  const itemIds = new Set(contentItems.map((c) => c.id));
  const platformIds = new Set(platforms.map((p) => p.id));
  const orphanItems = availability.filter((a) => !itemIds.has(a.content_item_id));
  const orphanPlatforms = availability.filter((a) => !platformIds.has(a.platform_id));
  console.log(`  rows referencing missing content_item: ${orphanItems.length === 0 ? "none ✅" : orphanItems.length + " ⚠️"}`);
  console.log(`  rows referencing missing platform:     ${orphanPlatforms.length === 0 ? "none ✅" : orphanPlatforms.length + " ⚠️"}`);

  console.log("");
  console.log("NOTE: exact Postgres types/constraints/indexes for these tables");
  console.log("      come from scripts/audit-supabase-schema.sql — run it in the");
  console.log("      Supabase dashboard SQL editor and save the output.");
}

// ---------------------------------------------------------------------------

async function main() {
  console.log("Vuno Phase 0 audit — READ ONLY (SELECTs only, no writes)");
  console.log("Run at:", new Date().toISOString());
  await auditNeon();
  await auditSupabase();
  console.log("");
  console.log("✅ Audit complete. Paste this entire output back into the planning thread.");
}

main().catch((err) => {
  console.error("\n🔥 Audit failed:", err.message);
  process.exit(1);
});
