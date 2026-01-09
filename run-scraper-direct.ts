import { writeFileSync } from "fs";
import { join } from "path";

async function scrapeRP(limit: number) {
  const Parser = (await import("rss-parser")).default;
  const parser = new Parser();
  const articles: any[] = [];
  const RSS_URL = "https://rpstrength.com/blogs/articles.atom";
  console.log(`[Scraper] Starting Renaissance Periodization...`);
  try {
    const feed = await parser.parseURL(RSS_URL);
    const items = feed.items.slice(0, limit);
    for (const item of items) {
      const article = {
        source: "renaissance_periodization",
        title: item.title || "",
        url: item.link || "",
        content: item.contentSnippet || item.content || "",
        publishedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
        scrapedAt: new Date()
      };
      articles.push(article);
      console.log(`[Scraper] Article: ${article.title}`);
    }
  } catch (error) {
    console.error("[Scraper] Error:", error);
  }
  console.log(`[Scraper] Total: ${articles.length} articles`);
  return articles;
}

const limit = parseInt(process.argv[2] || "50", 10);
console.log(`[CLI] Starting RP scraper, limit: ${limit}`);
scrapeRP(limit).then((articles) => {
  console.log(`[CLI] Complete\! Total: ${articles.length}`);
  const outputPath = join(process.cwd(), "scraped-data", "rp-full.json");
  writeFileSync(outputPath, JSON.stringify(articles, null, 2), "utf-8");
  console.log(`[CLI] Saved to: ${outputPath}`);
}).catch((err) => { console.error("[CLI] Error:", err); process.exit(1); });
