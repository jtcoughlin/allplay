#!/usr/bin/env tsx

import { storage } from "./storage";

interface StaticMapping {
  title: string;
  imageUrl: string;
  description: string;
}

class BrokenPosterFixer {
  private staticMappings: StaticMapping[] = [
    {
      title: "Tucker Carlson Tonight",
      imageUrl:
        "https://upload.wikimedia.org/wikipedia/commons/thumb/6/65/Fox_News_Channel_logo.svg/2560px-Fox_News_Channel_logo.svg.png",
      description: "FOX News branding",
    },
    {
      title: "Anderson Cooper 360°",
      imageUrl:
        "https://upload.wikimedia.org/wikipedia/commons/6/6d/CNN_International_logo.svg",
      description: "CNN branding",
    },
    {
      title: "30 for 30",
      imageUrl:
        "https://upload.wikimedia.org/wikipedia/en/7/7b/30for30_logo.jpg",
      description: "ESPN 30 for 30 logo",
    },
    {
      title: "College GameDay",
      imageUrl:
        "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/ESPN_wordmark.svg/2560px-ESPN_wordmark.svg.png",
      description: "ESPN branding",
    },
    {
      title: "SportsCenter",
      imageUrl:
        "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/ESPN_wordmark.svg/2560px-ESPN_wordmark.svg.png",
      description: "ESPN branding",
    },
    {
      title: "First Take",
      imageUrl:
        "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/ESPN_wordmark.svg/2560px-ESPN_wordmark.svg.png",
      description: "ESPN branding",
    },
    {
      title: "PTI",
      imageUrl:
        "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/ESPN_wordmark.svg/2560px-ESPN_wordmark.svg.png",
      description: "ESPN branding",
    },
    {
      title: "NFL Live",
      imageUrl:
        "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/ESPN_wordmark.svg/2560px-ESPN_wordmark.svg.png",
      description: "ESPN branding",
    },
    {
      title: "CBS Evening News",
      imageUrl:
        "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/CBS_logo.svg/2048px-CBS_logo.svg.png",
      description: "CBS branding",
    },
    {
      title: "ABC World News Tonight",
      imageUrl:
        "https://upload.wikimedia.org/wikipedia/commons/thumb/0/06/ABC-2021-LOGO.svg/2560px-ABC-2021-LOGO.svg.png",
      description: "ABC branding",
    },
    {
      title: "NBC Nightly News",
      imageUrl:
        "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/NBC_logo.svg/2560px-NBC_logo.svg.png",
      description: "NBC branding",
    },
    {
      title: "CNN Newsroom",
      imageUrl:
        "https://upload.wikimedia.org/wikipedia/commons/6/6d/CNN_International_logo.svg",
      description: "CNN branding",
    },
  ];

  /**
   * Validate if an image URL returns 200 OK
   */
  private async validateImageUrl(url: string | null): Promise<boolean> {
    if (!url) return false;

    try {
      // Data URLs are always considered valid
      if (url.startsWith("data:image/")) {
        return true;
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
   * Check if an image URL is considered invalid/broken
   */
  private isInvalidImageUrl(imageUrl: string | null): boolean {
    if (!imageUrl) return true;

    // Check for obvious invalid patterns
    if (imageUrl.toLowerCase().includes("null")) return true;
    if (imageUrl.toLowerCase().includes("placeholder")) return true;
    if (imageUrl.trim().length === 0) return true;
    if (imageUrl === "undefined") return true;

    return false;
  }

  /**
   * Find matching static mapping for a title
   */
  private findStaticMapping(title: string): StaticMapping | null {
    // Exact match first
    const exactMatch = this.staticMappings.find(
      (mapping) => mapping.title.toLowerCase() === title.toLowerCase(),
    );
    if (exactMatch) return exactMatch;

    // Partial match for titles that contain the mapping title
    const partialMatch = this.staticMappings.find((mapping) =>
      title.toLowerCase().includes(mapping.title.toLowerCase()),
    );

    return partialMatch || null;
  }

  /**
   * Fix all broken posters in the database
   */
  async fixBrokenPosters(): Promise<void> {
    console.log("🔧 BROKEN POSTER FIXER\n");
    console.log(
      "Scanning database for invalid image URLs and applying static mappings...\n",
    );

    try {
      // Fetch all content from database
      const allContent = await storage.getAllContent();
      console.log(`📊 Found ${allContent.length} total content items`);

      let checkedCount = 0;
      let brokenCount = 0;
      let updatedCount = 0;
      let validationFailures = 0;

      for (const item of allContent) {
        checkedCount++;

        // Show progress every 50 items
        if (checkedCount % 50 === 0) {
          console.log(
            `   Progress: ${checkedCount}/${allContent.length} items checked...`,
          );
        }

        let needsUpdate = false;
        let reason = "";

        // Check if image URL is obviously invalid first
        if (this.isInvalidImageUrl(item.imageUrl)) {
          needsUpdate = true;
          reason = "Invalid URL pattern";
          brokenCount++;
        } else {
          // Validate the URL with HTTP request
          const isValid = await this.validateImageUrl(item.imageUrl);
          if (!isValid) {
            needsUpdate = true;
            reason = "URL validation failed";
            brokenCount++;
            validationFailures++;
          }
        }

        // If the image needs updating, try to find a static mapping
        if (needsUpdate) {
          const mapping = this.findStaticMapping(item.title || "");

          if (mapping) {
            console.log(`\n🔧 Fixing: ${item.title}`);
            console.log(`   Service: ${item.service}`);
            console.log(`   Reason: ${reason}`);
            console.log(`   Old URL: ${item.imageUrl || "NULL"}`);
            console.log(`   New URL: ${mapping.imageUrl}`);
            console.log(`   Source: ${mapping.description}`);

            try {
              // Update the content with the static mapping
              await storage.createOrUpdateContent({
                ...item,
                imageUrl: mapping.imageUrl,
                posterSource: "staticMap",
                posterLocked: true,
                updatedAt: new Date(),
              } as any);

              console.log(`   ✅ Successfully updated (locked & tracked)`);
              updatedCount++;
            } catch (error) {
              console.error(`   ❌ Failed to update: ${error}`);
            }
          }
        }

        // Add small delay to avoid overwhelming the database
        if (checkedCount % 10 === 0) {
          await new Promise((resolve) => setTimeout(resolve, 50));
        }
      }

      // Final summary
      console.log("\n🎯 BROKEN POSTER FIX SUMMARY:");
      console.log(`   📊 Total items checked: ${checkedCount}`);
      console.log(`   ❌ Broken/invalid URLs found: ${brokenCount}`);
      console.log(`   🔧 Items updated with static mappings: ${updatedCount}`);
      console.log(`   🔍 URL validation failures: ${validationFailures}`);
      console.log(
        `   ✅ Success rate: ${updatedCount > 0 ? ((updatedCount / brokenCount) * 100).toFixed(1) + "%" : "N/A"}`,
      );

      if (updatedCount === 0) {
        console.log(
          "\n🎉 No items needed updating - all posters are already in good shape!",
        );
      } else {
        console.log(
          `\n🎉 Successfully fixed ${updatedCount} broken posters with quality static mappings!`,
        );
        console.log(
          "   All updated items are now locked to prevent future quality regressions.",
        );
      }
    } catch (error) {
      console.error("❌ Error during broken poster fix:", error);
      throw error;
    }
  }

  /**
   * Test the URL validation function
   */
  async testUrlValidation(): Promise<void> {
    console.log("🧪 TESTING URL VALIDATION\n");

    const testUrls = [
      "https://image.tmdb.org/t/p/w500/valid-poster.jpg",
      "https://invalid-url-404.example.com/poster.jpg",
      null,
      "null",
      "placeholder",
      "https://upload.wikimedia.org/wikipedia/commons/thumb/6/65/Fox_News_Channel_logo.svg/2560px-Fox_News_Channel_logo.svg.png",
    ];

    for (const url of testUrls) {
      const isValid = await this.validateImageUrl(url);
      const isInvalid = this.isInvalidImageUrl(url);

      console.log(`🔍 Testing: ${url || "NULL"}`);
      console.log(`   Pattern check: ${isInvalid ? "❌ Invalid" : "✅ Valid"}`);
      console.log(`   HTTP check: ${isValid ? "✅ Valid" : "❌ Invalid"}`);
      console.log("");
    }
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);

  try {
    const fixer = new BrokenPosterFixer();

    if (args.includes("--test")) {
      await fixer.testUrlValidation();
    } else {
      await fixer.fixBrokenPosters();
    }
  } catch (error) {
    console.error("❌ Script failed:", error);
    process.exit(1);
  }
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { BrokenPosterFixer };
