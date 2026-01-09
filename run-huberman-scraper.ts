import { scrapeHuberman } from "./server/knowledge/scraper";
import { writeFileSync } from "fs";
import { mkdirSync } from "fs";

async function main() {
  const limit = parseInt(process.argv[2] || "1000");
  console.log("[Huberman Scraper] Starting scrape with limit: " + limit);
  
  try {
    const articles = await scrapeHuberman(limit);
    console.log("[Huberman Scraper] Scraped " + articles.length + " articles");
    
    try {
      mkdirSync("/Users/achzod/Desktop/neurocore/scraped-data", { recursive: true });
    } catch (e) {
    }
    
    const outputPath = "/Users/achzod/Desktop/neurocore/scraped-data/huberman-full.json";
    writeFileSync(outputPath, JSON.stringify(articles, null, 2));
    console.log("[Huberman Scraper] Saved to: " + outputPath);
    
    console.log("\n=== SUMMARY ===");
    console.log("Total articles: " + articles.length);
    if (articles.length > 0) {
      const totalLength = articles.reduce((sum, a) => sum + a.content.length, 0);
      const avgLength = Math.round(totalLength / articles.length);
      console.log("Average content length: " + avgLength + " characters");
      console.log("Total content: " + totalLength + " characters");
    }
  } catch (error) {
    console.error("[Huberman Scraper] Error:", error);
    process.exit(1);
  }
}

main();
