#!/usr/bin/env tsx

import { storage } from "./storage";

interface DiagnosticResult {
  title: string;
  service: string;
  imageUrl: string | null;
  posterSource: string | null;
  posterLocked: boolean | null;
  urlStatus: "valid" | "broken" | "missing";
  found: boolean;
}

class PosterDiagnosticChecker {
  private problemTitles = [
    "Tucker Carlson Tonight",
    "Anderson Cooper 360°",
    "30 for 30: The Tuck Rule",
    "College GameDay",
    "SportsCenter",
    "House of Cards",
    "Untold: The Girlfriend Who Didn't Exist",
    "First Take",
    "PTI",
    "NFL Live",
    "The Big Bang Theory",
    "CBS Evening News",
    "ABC World News Tonight",
    "NBC Nightly News",
    "CNN Newsroom",
    "The Price is Right",
    "General Hospital",
    "SpongeBob SquarePants",
  ];

  /**
   * Validate if an image URL returns 200 OK
   */
  private async validateImageUrl(url: string): Promise<boolean> {
    try {
      if (url.startsWith("data:image/")) {
        return true; // Data URLs are always valid if properly formatted
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(url, {
        method: "HEAD",
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const contentType = response.headers.get("content-type");
      return response.ok && (contentType?.startsWith("image/") ?? false);
    } catch (error) {
      return false;
    }
  }

  /**
   * Get emoji indicator for poster source
   */
  private getSourceEmoji(source: string | null): string {
    switch (source) {
      case "staticMap":
        return "📍"; // Pinned/Static mapping
      case "tmdb":
        return "🎬"; // TMDb database
      case "youtube":
        return "📺"; // YouTube thumbnail
      case "fallback":
        return "🔄"; // Service fallback
      case "missing":
        return "❓"; // Missing/unknown
      default:
        return "❓";
    }
  }

  /**
   * Get emoji indicator for URL status
   */
  private getUrlStatusEmoji(status: "valid" | "broken" | "missing"): string {
    switch (status) {
      case "valid":
        return "✅";
      case "broken":
        return "❌";
      case "missing":
        return "⚪";
    }
  }

  /**
   * Get emoji indicator for locked status
   */
  private getLockedEmoji(locked: boolean | null): string {
    if (locked === true) return "🔒";
    if (locked === false) return "🔓";
    return "❓";
  }

  /**
   * Run comprehensive diagnostic check
   */
  async runDiagnostic(): Promise<void> {
    console.log("🔍 POSTER DIAGNOSTIC CHECK\n");
    console.log(
      "Checking specific problem titles for poster quality and storage...\n",
    );

    const results: DiagnosticResult[] = [];
    const allContent = await storage.getAllContent();

    // Check each problem title
    for (const problemTitle of this.problemTitles) {
      console.log(`🔍 Searching for: "${problemTitle}"`);

      // Find all matching items (there might be duplicates across services)
      const matchingItems = allContent.filter(
        (item) =>
          item.title &&
          item.title.toLowerCase().includes(problemTitle.toLowerCase()),
      );

      if (matchingItems.length === 0) {
        console.log(`   ❌ Not found in database\n`);
        results.push({
          title: problemTitle,
          service: "N/A",
          imageUrl: null,
          posterSource: null,
          posterLocked: null,
          urlStatus: "missing",
          found: false,
        });
        continue;
      }

      // Check each matching item
      for (const item of matchingItems) {
        let urlStatus: "valid" | "broken" | "missing" = "missing";

        if (item.imageUrl) {
          const isValid = await this.validateImageUrl(item.imageUrl);
          urlStatus = isValid ? "valid" : "broken";
        }

        const result: DiagnosticResult = {
          title: item.title || problemTitle,
          service: item.service || "unknown",
          imageUrl: item.imageUrl,
          posterSource: (item as any).posterSource || null,
          posterLocked: (item as any).posterLocked || null,
          urlStatus,
          found: true,
        };

        results.push(result);

        // Display detailed info
        console.log(`   ✅ Found: ${item.title}`);
        console.log(`      🏷️  Service: ${item.service}`);
        console.log(
          `      ${this.getUrlStatusEmoji(urlStatus)} Image URL: ${item.imageUrl || "MISSING"}`,
        );
        console.log(
          `      ${this.getSourceEmoji(result.posterSource)} Source: ${result.posterSource || "UNKNOWN"}`,
        );
        console.log(
          `      ${this.getLockedEmoji(result.posterLocked)} Locked: ${result.posterLocked ?? "UNKNOWN"}`,
        );

        if (urlStatus === "broken") {
          console.log(
            `      ⚠️  URL VALIDATION FAILED - This poster is broken!`,
          );
        }

        console.log("");
      }
    }

    // Generate summary report
    this.generateSummaryReport(results);
  }

  /**
   * Generate comprehensive summary report
   */
  private generateSummaryReport(results: DiagnosticResult[]): void {
    console.log("\n📊 DIAGNOSTIC SUMMARY REPORT\n");

    const foundItems = results.filter((r) => r.found);
    const notFoundTitles = results.filter((r) => !r.found);

    console.log(`🔍 Titles searched: ${this.problemTitles.length}`);
    console.log(`✅ Titles found in database: ${foundItems.length}`);
    console.log(`❌ Titles not found: ${notFoundTitles.length}`);

    if (notFoundTitles.length > 0) {
      console.log("\n❌ MISSING TITLES:");
      notFoundTitles.forEach((item) => {
        console.log(`   • ${item.title}`);
      });
    }

    if (foundItems.length > 0) {
      // URL Status breakdown
      const validUrls = foundItems.filter(
        (r) => r.urlStatus === "valid",
      ).length;
      const brokenUrls = foundItems.filter(
        (r) => r.urlStatus === "broken",
      ).length;
      const missingUrls = foundItems.filter(
        (r) => r.urlStatus === "missing",
      ).length;

      console.log("\n🔗 URL STATUS:");
      console.log(`   ✅ Valid URLs: ${validUrls}`);
      console.log(`   ❌ Broken URLs: ${brokenUrls}`);
      console.log(`   ⚪ Missing URLs: ${missingUrls}`);

      // Source breakdown
      const sourceBreakdown = foundItems.reduce(
        (acc, item) => {
          const source = item.posterSource || "unknown";
          acc[source] = (acc[source] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      );

      console.log("\n📸 POSTER SOURCES:");
      Object.entries(sourceBreakdown).forEach(([source, count]) => {
        const emoji = this.getSourceEmoji(source);
        console.log(`   ${emoji} ${source}: ${count}`);
      });

      // Lock status
      const lockedCount = foundItems.filter(
        (r) => r.posterLocked === true,
      ).length;
      const unlockedCount = foundItems.filter(
        (r) => r.posterLocked === false,
      ).length;
      const unknownLockCount = foundItems.filter(
        (r) => r.posterLocked === null,
      ).length;

      console.log("\n🔒 LOCK STATUS:");
      console.log(`   🔒 Locked: ${lockedCount}`);
      console.log(`   🔓 Unlocked: ${unlockedCount}`);
      console.log(`   ❓ Unknown: ${unknownLockCount}`);

      // Service breakdown
      const serviceBreakdown = foundItems.reduce(
        (acc, item) => {
          acc[item.service] = (acc[item.service] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      );

      console.log("\n🏷️  SERVICE DISTRIBUTION:");
      Object.entries(serviceBreakdown).forEach(([service, count]) => {
        console.log(`   • ${service}: ${count}`);
      });

      // Problem items
      const problemItems = foundItems.filter(
        (r) => r.urlStatus === "broken" || r.urlStatus === "missing",
      );

      if (problemItems.length > 0) {
        console.log("\n🚨 ITEMS NEEDING ATTENTION:");
        problemItems.forEach((item) => {
          const statusEmoji = this.getUrlStatusEmoji(item.urlStatus);
          console.log(
            `   ${statusEmoji} ${item.title} (${item.service}) - ${item.urlStatus.toUpperCase()}`,
          );
        });
      }

      // Success metrics
      const successRate = ((validUrls / foundItems.length) * 100).toFixed(1);
      console.log(
        `\n🎯 SUCCESS RATE: ${successRate}% (${validUrls}/${foundItems.length})`,
      );

      if (brokenUrls === 0 && missingUrls === 0) {
        console.log("\n🎉 PERFECT! All found titles have valid poster URLs!");
      } else {
        console.log(
          `\n⚠️  NEEDS WORK: ${brokenUrls + missingUrls} items need poster fixes`,
        );
      }
    }

    console.log("\n✅ Diagnostic check complete!");
  }
}

// Main execution
async function main() {
  try {
    const checker = new PosterDiagnosticChecker();
    await checker.runDiagnostic();
  } catch (error) {
    console.error("❌ Diagnostic failed:", error);
    process.exit(1);
  }
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { PosterDiagnosticChecker };
