/**
 * scripts/migrate-supabase-to-neon.js
 *
 * Phase 2 of the Supabase -> Neon consolidation: copy all catalog data
 * (platforms, content_items, content_platform_availability) from Supabase
 * into the Neon tables created by migrations/0001_add_catalog_tables.sql.
 *
 * Guarantees:
 *   - Supabase is READ-ONLY here, always. Nothing in this script can write
 *     to Supabase.
 *   - UUIDs and timestamps are preserved exactly (explicit values, so no
 *     defaults fire on insert).
 *   - Idempotent: every write is an upsert on the primary key. Running it
 *     twice converges to the same state.
 *   - Insert order respects FKs: platforms -> content_items (parent links
 *     nulled on first pass, patched in a second pass) -> availability.
 *   - Built-in verification: after writing, every Neon row is read back and
 *     field-by-field compared against its Supabase source. Any mismatch
 *     exits non-zero.
 *
 * Rollback: TRUNCATE content_platform_availability, content_items, platforms
 * in Neon (see the command in the planning thread) and re-run. Supabase is
 * untouched either way.
 *
 * Usage (Replit Shell):
 *   node scripts/migrate-supabase-to-neon.js --dry-run   # no Neon writes
 *   node scripts/migrate-supabase-to-neon.js             # live run (HARD STOP: needs approval)
 */

import { neon } from "@neondatabase/serverless";
import { createClient } from "@supabase/supabase-js";

const DATABASE_URL = process.env.DATABASE_URL;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!DATABASE_URL) throw new Error("Missing DATABASE_URL");
if (!SUPABASE_URL) throw new Error("Missing SUPABASE_URL");
if (!SUPABASE_SERVICE_ROLE_KEY) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");

const DRY_RUN = process.argv.includes("--dry-run");

const sql = neon(DATABASE_URL);
async function q(text, params = []) {
  if (typeof sql.query === "function") return sql.query(text, params);
  return sql(text, params);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// ---------------------------------------------------------------------------
// Column manifests — explicit, so a surprise column in either database is a
// loud failure instead of a silent drop.
// ---------------------------------------------------------------------------

const TABLES = [
  {
    name: "platforms",
    columns: [
      "id", "slug", "name", "logo_url", "app_store_url", "website_url",
      "deep_link_base", "is_active", "created_at", "updated_at",
    ],
    casts: {},
  },
  {
    name: "content_items",
    columns: [
      "id", "content_type", "title", "original_title", "description",
      "release_year", "runtime_minutes", "poster_url", "backdrop_url",
      "tmdb_id", "imdb_id", "season_number", "episode_number",
      "parent_series_id", "created_at", "updated_at",
    ],
    casts: { content_type: "::content_type" },
  },
  {
    name: "content_platform_availability",
    columns: [
      "id", "content_item_id", "platform_id", "is_available",
      "availability_type", "deep_link_url", "web_link_url", "region_code",
      "quality_label", "price_numeric", "currency_code", "last_verified_at",
      "created_at", "updated_at",
    ],
    casts: {},
  },
];

// ---------------------------------------------------------------------------
// Fetch (Supabase, read-only)
// ---------------------------------------------------------------------------

async function fetchAll(tableName) {
  const PAGE = 1000;
  let all = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from(tableName)
      .select("*")
      .order("id")
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`Supabase read ${tableName}: ${error.message}`);
    all = all.concat(data);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return all;
}

// ---------------------------------------------------------------------------
// Pre-flight checks
// ---------------------------------------------------------------------------

async function preflight() {
  const rows = await q(
    `SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = ANY($1)`,
    [TABLES.map((t) => t.name)]
  );
  const present = new Set(rows.map((r) => r.table_name));
  const missing = TABLES.map((t) => t.name).filter((n) => !present.has(n));
  if (missing.length > 0) {
    throw new Error(
      `Neon is missing target table(s): ${missing.join(", ")}. ` +
      `Run migrations/0001_add_catalog_tables.sql first (Phase 1).`
    );
  }
  for (const t of TABLES) {
    const [row] = await q(`SELECT count(*)::int AS n FROM "${t.name}"`);
    if (row.n > 0) {
      console.log(`  ℹ️  Neon ${t.name} already has ${row.n} rows — upserts will converge, not duplicate.`);
    }
  }
}

function checkSourceIntegrity(data) {
  const problems = [];
  for (const t of TABLES) {
    const rows = data[t.name];
    const seen = new Set();
    for (const r of rows) {
      if (!r.id) problems.push(`${t.name}: row with missing id`);
      if (seen.has(r.id)) problems.push(`${t.name}: duplicate id ${r.id}`);
      seen.add(r.id);
      const extra = Object.keys(r).filter((k) => !t.columns.includes(k));
      if (extra.length > 0) {
        problems.push(`${t.name}: unexpected column(s) in Supabase: ${extra.join(", ")} (row ${r.id})`);
      }
    }
  }
  const itemIds = new Set(data.content_items.map((r) => r.id));
  const platformIds = new Set(data.platforms.map((r) => r.id));
  for (const a of data.content_platform_availability) {
    if (!itemIds.has(a.content_item_id)) problems.push(`availability ${a.id}: orphan content_item_id`);
    if (!platformIds.has(a.platform_id)) problems.push(`availability ${a.id}: orphan platform_id`);
  }
  for (const c of data.content_items) {
    if (c.parent_series_id && !itemIds.has(c.parent_series_id)) {
      problems.push(`content_items ${c.id}: orphan parent_series_id`);
    }
  }
  return problems;
}

// ---------------------------------------------------------------------------
// Upsert
// ---------------------------------------------------------------------------

function buildUpsert(t, row, { nullParentLink = false } = {}) {
  const cols = t.columns;
  const params = cols.map((c) =>
    nullParentLink && c === "parent_series_id" ? null : (row[c] ?? null)
  );
  const placeholders = cols.map((c, i) => `$${i + 1}${t.casts[c] || ""}`);
  const updates = cols
    .filter((c) => c !== "id")
    .map((c) => `"${c}" = EXCLUDED."${c}"`);
  const text =
    `INSERT INTO "${t.name}" (${cols.map((c) => `"${c}"`).join(", ")}) ` +
    `VALUES (${placeholders.join(", ")}) ` +
    `ON CONFLICT (id) DO UPDATE SET ${updates.join(", ")}`;
  return { text, params };
}

async function copyAll(data) {
  const written = {};

  for (const t of TABLES) {
    const rows = data[t.name];
    const isContentItems = t.name === "content_items";
    let n = 0;
    for (const row of rows) {
      // content_items pass 1: null out self-referencing parent links so
      // insert order can't violate the self-FK.
      const { text, params } = buildUpsert(t, row, { nullParentLink: isContentItems });
      await q(text, params);
      n++;
    }
    // content_items pass 2: patch parent links (no-op while all are null).
    if (isContentItems) {
      const withParents = rows.filter((r) => r.parent_series_id != null);
      for (const r of withParents) {
        await q(
          `UPDATE content_items SET parent_series_id = $1 WHERE id = $2`,
          [r.parent_series_id, r.id]
        );
      }
      if (withParents.length > 0) {
        console.log(`  content_items: patched ${withParents.length} parent_series_id link(s)`);
      }
    }
    written[t.name] = n;
    console.log(`  ✅ ${t.name}: upserted ${n} rows`);
  }
  return written;
}

// ---------------------------------------------------------------------------
// Verification — every Neon row compared field-by-field against Supabase
// ---------------------------------------------------------------------------

const TS_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;

function normalize(v) {
  if (v === null || v === undefined) return "null";
  if (v instanceof Date) return `ts:${v.getTime()}`;
  if (typeof v === "boolean") return `bool:${v}`;
  if (typeof v === "number") return `num:${v}`;
  if (typeof v === "string") {
    if (TS_RE.test(v)) {
      const t = new Date(v).getTime();
      if (!Number.isNaN(t)) return `ts:${t}`;
    }
    if (/^-?\d+(\.\d+)?$/.test(v)) return `num:${Number(v)}`;
    return `str:${v}`;
  }
  return `other:${JSON.stringify(v)}`;
}

async function verify(data) {
  const failures = [];
  const report = [];

  for (const t of TABLES) {
    const source = data[t.name];
    const neonRows = await q(`SELECT * FROM "${t.name}"`);
    const neonById = new Map(neonRows.map((r) => [String(r.id), r]));

    let mismatches = 0;
    for (const src of source) {
      const dst = neonById.get(String(src.id));
      if (!dst) {
        failures.push(`${t.name} ${src.id}: missing in Neon`);
        continue;
      }
      for (const c of t.columns) {
        const a = normalize(src[c]);
        const b = normalize(dst[c]);
        if (a !== b) {
          mismatches++;
          failures.push(`${t.name} ${src.id} .${c}: supabase=${a} neon=${b}`);
        }
      }
    }
    const extraInNeon = neonRows.length - source.length;
    report.push({
      table: t.name,
      supabase_rows: source.length,
      neon_rows: neonRows.length,
      field_mismatches: mismatches,
      extra_neon_rows: extraInNeon > 0 ? extraInNeon : 0,
    });
    if (extraInNeon > 0) {
      failures.push(`${t.name}: Neon has ${extraInNeon} row(s) with ids not present in Supabase`);
    }
  }

  console.table(report);
  return failures;
}

// ---------------------------------------------------------------------------

async function main() {
  console.log(`=== Supabase -> Neon catalog data migration ===`);
  console.log(`Mode: ${DRY_RUN ? "🟡 DRY RUN (no Neon writes)" : "🔴 LIVE (will upsert into Neon)"}`);
  console.log("");

  console.log("🔎 Pre-flight: checking Neon target tables...");
  await preflight();

  console.log("📥 Reading all catalog data from Supabase (read-only)...");
  const data = {};
  for (const t of TABLES) {
    data[t.name] = await fetchAll(t.name);
    console.log(`  ${t.name}: ${data[t.name].length} rows`);
  }

  console.log("");
  console.log("🔎 Source integrity checks...");
  const problems = checkSourceIntegrity(data);
  if (problems.length > 0) {
    console.error("❌ Source data problems — aborting before any write:");
    for (const p of problems) console.error("   - " + p);
    process.exit(1);
  }
  console.log("  ✅ no duplicate ids, no orphans, no unexpected columns");

  if (DRY_RUN) {
    console.log("");
    console.log("🟡 DRY RUN — stopping before writes. Sample of what would be upserted:");
    for (const t of TABLES) {
      const sample = data[t.name][0];
      console.log(`\n--- ${t.name} (first row of ${data[t.name].length}) ---`);
      console.log(JSON.stringify(sample, null, 2));
    }
    console.log("\nRe-run without --dry-run (after approval) to execute.");
    return;
  }

  console.log("");
  console.log("✍️  Upserting into Neon (platforms -> content_items -> availability)...");
  await copyAll(data);

  console.log("");
  console.log("🔍 Verifying: comparing every Neon row against Supabase, field by field...");
  const failures = await verify(data);

  if (failures.length > 0) {
    console.error(`\n❌ VERIFICATION FAILED — ${failures.length} problem(s):`);
    for (const f of failures.slice(0, 50)) console.error("   - " + f);
    if (failures.length > 50) console.error(`   ... and ${failures.length - 50} more`);
    console.error("\nNeon state is recoverable: truncate the three tables and re-run.");
    process.exit(1);
  }

  console.log("");
  console.log("✅ Migration verified: every row and field matches the Supabase source.");
  console.log("   Supabase was not modified and remains the frozen fallback.");
}

main().catch((err) => {
  console.error("\n🔥 Fatal:", err.message);
  process.exit(1);
});
