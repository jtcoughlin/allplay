import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL) throw new Error("Missing SUPABASE_URL");
if (!SUPABASE_SERVICE_ROLE_KEY) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const REGION = "US";
const AVAILABILITY_TYPE = "subscription";
const QUALITY_LABEL = "HD";
const PLATFORMS_PER_ITEM = 2;
const BATCH_SIZE = 100;

async function fetchAllContentItems() {
  const PAGE_SIZE = 1000;
  let all = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("content_items")
      .select("id, content_type, title, tmdb_id")
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw new Error(`Failed to fetch content_items: ${error.message}`);

    all = all.concat(data);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return all;
}

async function fetchActivePlatforms() {
  const { data, error } = await supabase
    .from("platforms")
    .select("id, slug, name, website_url, deep_link_base")
    .eq("is_active", true)
    .order("name");

  if (error) throw new Error(`Failed to fetch platforms: ${error.message}`);
  return data;
}

function buildAvailabilityRows(contentItems, platforms) {
  const rows = [];
  const skipped = [];
  const now = new Date().toISOString();

  for (let i = 0; i < contentItems.length; i++) {
    const item = contentItems[i];

    if (!item.id) {
      skipped.push({ reason: "missing content item id", item });
      continue;
    }

    for (let j = 0; j < PLATFORMS_PER_ITEM; j++) {
      const platform = platforms[(i + j) % platforms.length];

      if (!platform?.id) {
        skipped.push({ reason: "missing platform id", item, platformIndex: (i + j) % platforms.length });
        continue;
      }

      rows.push({
        content_item_id: item.id,
        platform_id: platform.id,
        is_available: true,
        availability_type: AVAILABILITY_TYPE,
        deep_link_url: platform.deep_link_base || null,
        web_link_url: platform.website_url || null,
        region_code: REGION,
        quality_label: QUALITY_LABEL,
        last_verified_at: now,
      });
    }
  }

  return { rows, skipped };
}

async function deleteExistingRows(contentItemIds) {
  if (contentItemIds.length === 0) return;

  const { error } = await supabase
    .from("content_platform_availability")
    .delete()
    .in("content_item_id", contentItemIds)
    .eq("region_code", REGION);

  if (error) {
    throw new Error(`Failed to clear existing availability rows: ${error.message}`);
  }
}

async function insertBatches(rows) {
  let totalInserted = 0;
  let totalErrored = 0;
  const batchErrors = [];

  for (let b = 0; b < rows.length; b += BATCH_SIZE) {
    const batch = rows.slice(b, b + BATCH_SIZE);
    const batchNum = Math.floor(b / BATCH_SIZE) + 1;

    const { error } = await supabase
      .from("content_platform_availability")
      .insert(batch);

    if (error) {
      console.error(`  ❌ Batch ${batchNum} failed: [${error.code}] ${error.message}`);
      batchErrors.push({ batchNum, error: error.message, code: error.code });
      totalErrored += batch.length;
    } else {
      console.log(`  ✅ Batch ${batchNum}: ${batch.length} rows inserted`);
      totalInserted += batch.length;
    }
  }

  return { totalInserted, totalErrored, batchErrors };
}

async function main() {
  console.log("=== Vuno Availability Ingestion (first-pass placeholder) ===");
  console.log(`  Region:             ${REGION}`);
  console.log(`  Availability type:  ${AVAILABILITY_TYPE}`);
  console.log(`  Platforms per item: ${PLATFORMS_PER_ITEM}`);
  console.log(`  Batch size:         ${BATCH_SIZE}`);
  console.log("");

  console.log("📋 Fetching content_items...");
  const contentItems = await fetchAllContentItems();
  const movies = contentItems.filter((c) => c.content_type === "movie");
  const series = contentItems.filter((c) => c.content_type === "series");
  console.log(
    `   Total: ${contentItems.length}  (${movies.length} movies, ${series.length} series)`
  );

  console.log("");
  console.log("🏷️  Fetching active platforms...");
  const platforms = await fetchActivePlatforms();
  if (platforms.length === 0) {
    throw new Error("No active platforms found — seed the platforms table first.");
  }
  console.log(
    `   Found ${platforms.length} platforms: ${platforms.map((p) => p.slug).join(", ")}`
  );

  console.log("");
  console.log("🔧 Building availability rows...");
  const { rows, skipped } = buildAvailabilityRows(contentItems, platforms);
  console.log(`   Rows to upsert: ${rows.length}`);
  if (skipped.length > 0) {
    console.warn(`   ⚠️  Skipped ${skipped.length} rows:`);
    for (const s of skipped) {
      console.warn(`      - ${s.reason} (content: ${s.item?.title ?? "unknown"})`);
    }
  }

  console.log("");
  console.log("🗑️  Clearing existing US availability rows for these content items...");
  const contentItemIds = contentItems.map((c) => c.id).filter(Boolean);
  await deleteExistingRows(contentItemIds);
  console.log(`   Cleared rows for ${contentItemIds.length} content items`);

  console.log("");
  console.log(`🔄 Inserting ${rows.length} rows into content_platform_availability...`);
  const { totalInserted, totalErrored, batchErrors } = await insertBatches(rows);

  console.log("");
  console.log("=== Summary ===");
  console.log(`  ✅ Rows inserted:  ${totalInserted}`);
  console.log(`  ⚠️  Rows skipped:  ${skipped.length}`);
  console.log(`  ❌ Rows errored:   ${totalErrored}`);

  if (batchErrors.length > 0) {
    console.log("");
    console.log("  Batch errors:");
    for (const e of batchErrors) {
      console.log(`    Batch ${e.batchNum}: [${e.code}] ${e.error}`);
    }
  }

  console.log("");
  if (totalErrored === 0) {
    console.log("✅ Availability ingestion complete");
  } else {
    console.log("⚠️  Availability ingestion finished with errors — see above");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("\n🔥 Fatal error:", err.message);
  process.exit(1);
});
