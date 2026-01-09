import { scrapeSource } from "./server/knowledge/scraper";
import { writeFileSync } from "fs";
import { join } from "path";

const source = process.argv[2] || "renaissance_periodization";
const limit = parseInt(process.argv[3] || "50", 10);

console.log(`[CLI] Starting scraper for source: ${source}, limit: ${limit}`);

scrapeSource(source as any, limit)
  .then((result) => {
    console.log(`[CLI] Scraping complete!`);
    console.log(`[CLI] Articles scraped: ${result.articles.length}`);
    console.log(`[CLI] Saved to DB: ${result.saved}`);
    console.log(`[CLI] Duplicates: ${result.duplicates}`);
    
    const outputPath = join(__dirname, "scraped-data", "rp-full.json");
    writeFileSync(outputPath, JSON.stringify(result.articles, null, 2), "utf-8");
    console.log(`[CLI] Data saved to: ${outputPath}`);
  })
  .catch((err) => {
    console.error("[CLI] Error:", err);
    process.exit(1);
  });
