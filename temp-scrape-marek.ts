import { scrapeMarekHealth } from "./server/knowledge/scraper";
import * as fs from "fs";
import * as path from "path";

async function main() {
  console.log("Starting Marek Health scraping...");
  
  const articles = await scrapeMarekHealth(50);
  
  const outputPath = "/Users/achzod/Desktop/neurocore/scraped-data/marek-full.json";
  fs.writeFileSync(outputPath, JSON.stringify(articles, null, 2));
  
  console.log(`\n✓ Scraped ${articles.length} articles`);
  console.log(`✓ Saved to: ${outputPath}`);
  console.log(`\nFirst article preview:`);
  if (articles.length > 0) {
    console.log(`Title: ${articles[0].title}`);
    console.log(`Content length: ${articles[0].content.length} characters`);
    console.log(`URL: ${articles[0].url}`);
  }
}

main().catch(console.error);
