// PosterApiAudit.ts
import fetch from "node-fetch";

// Replace this with your actual deployed API endpoint
const API_ENDPOINT =
  "https://6149a332-8c95-45c0-83f4-c9d714c6c085-00-3t2eld2f0yizx.worf.replit.dev"; // Example: https://your-app-name.replit.app/api/allplay

const staticMappings = {
  "Tucker Carlson Tonight":
    "https://upload.wikimedia.org/wikipedia/commons/thumb/6/65/Fox_News_Channel_logo.svg/2560px-Fox_News_Channel_logo.svg.png",
  "Anderson Cooper 360°":
    "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b1/CNN_International_logo.svg/1280px-CNN_International_logo.svg.png",
  "30 for 30":
    "https://upload.wikimedia.org/wikipedia/en/thumb/b/b9/30_for_30_2019_logo.svg/1280px-30_for_30_2019_logo.svg.png",
  "College GameDay":
    "https://upload.wikimedia.org/wikipedia/en/1/17/ESPN_College_GameDay_logo.png",
  SportsCenter:
    "https://upload.wikimedia.org/wikipedia/en/thumb/7/7f/SportsCenter_Logo.svg/2560px-SportsCenter_Logo.svg.png",
  "First Take":
    "https://upload.wikimedia.org/wikipedia/en/d/db/ESPN_First_Take_logo.png",
  "Pardon the Interruption":
    "https://upload.wikimedia.org/wikipedia/en/b/bb/Pardon_the_Interruption_logo.png",
  "NFL Live":
    "https://upload.wikimedia.org/wikipedia/en/e/e3/NFL_Live_logo.png",
  "CBS Evening News":
    "https://upload.wikimedia.org/wikipedia/commons/thumb/1/12/CBS_News_logo.svg/1280px-CBS_News_logo.svg.png",
  "ABC World News Tonight":
    "https://upload.wikimedia.org/wikipedia/en/7/76/ABC_World_News_Tonight_Logo.png",
  "NBC Nightly News":
    "https://upload.wikimedia.org/wikipedia/en/3/39/NBC_Nightly_News_logo.png",
  "CNN Newsroom":
    "https://upload.wikimedia.org/wikipedia/en/f/fb/CNN_Newsroom_logo.png",
};

async function runAudit() {
  try {
    console.log("📡 Fetching tiles from API...\n");

    const res = await fetch(API_ENDPOINT);
    const data = await res.json();

    if (!Array.isArray(data)) {
      throw new Error("API did not return an array of tiles");
    }

    let total = 0;
    let broken = 0;
    let mismatched = 0;

    for (const item of data) {
      total++;
      const title = item.title;
      const url = item.imageUrl;
      const expected = staticMappings[title];

      if (expected) {
        if (!url || url.includes("placeholder") || url.includes("null")) {
          broken++;
          console.log(`❌ MISSING: "${title}" — No poster found`);
        } else if (url !== expected) {
          mismatched++;
          console.log(`⚠️  MISMATCH: "${title}"`);
          console.log(`    🔎 Expected: ${expected}`);
          console.log(`    🖼️  Actual:   ${url}`);
        } else {
          console.log(`✅ MATCHED: "${title}"`);
        }
      }
    }

    console.log("\n📊 AUDIT REPORT");
    console.log(`🔹 Total titles checked: ${total}`);
    console.log(`❌ Missing posters: ${broken}`);
    console.log(`⚠️  Mismatched posters: ${mismatched}`);
    console.log(`✅ Matched posters: ${total - broken - mismatched}`);
  } catch (err) {
    console.error("🚨 Error auditing API:", err);
  }
}

// Start the audit
runAudit();
