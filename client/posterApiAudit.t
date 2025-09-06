import axios from "axios";

const staticMap: Record<string, string> = {
  "Tucker Carlson Tonight": "Fox_News_Channel_logo.svg.png",
  "Anderson Cooper 360°": "CNN_International_logo.svg",
  "ABC World News Tonight": "ABC-2021-LOGO.svg.png",
  "NBC Nightly News": "NBC_logo.svg.png",
  "CNN Newsroom": "CNN_International_logo.svg",
  "College GameDay": "ESPN_wordmark.svg.png",
  "First Take": "ESPN_wordmark.svg.png",
  "NFL Live": "ESPN_wordmark.svg.png",
};

const titlesToCheck = Object.keys(staticMap);

const https://6149a332-8c95-45c0-83f4-c9d714c6c085-00-3t2eld2f0yizx.worf.replit.dev= "https://your-allplay-api-url.com/api/content"; // 🔁 Replace with your real endpoint

async function runAudit() {
  try {
    const res = await axios.get(API_URL);
    const content = res.data;

    const summary = {
      totalChecked: 0,
      correct: 0,
      incorrect: 0,
      notFound: 0,
    };

    for (const title of titlesToCheck) {
      const entry = content.find((c: any) => c.title === title);
      summary.totalChecked++;

      if (!entry) {
        console.warn(`❌ Not found in API: "${title}"`);
        summary.notFound++;
        continue;
      }

      const posterUrl: string = entry.imageUrl || "";
      const expectedSnippet = staticMap[title];

      const isMatch = posterUrl.includes(expectedSnippet);

      if (isMatch) {
        console.log(`✅ ${title}: Poster matches expected static image`);
        summary.correct++;
      } else {
        console.warn(`❌ ${title}: Poster mismatch`);
        console.log(`   → Found: ${posterUrl}`);
        console.log(`   → Expected to include: ${expectedSnippet}`);
        summary.incorrect++;
      }
    }

    console.log(`\n📊 SUMMARY`);
    console.log(`Checked: ${summary.totalChecked}`);
    console.log(`✅ Correct: ${summary.correct}`);
    console.log(`❌ Incorrect: ${summary.incorrect}`);
    console.log(`🚫 Not Found: ${summary.notFound}`);
  } catch (err) {
    console.error("Error checking poster URLs:", err);
  }
}

runAudit();
