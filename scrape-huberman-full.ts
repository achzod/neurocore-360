/**
 * Scraper Huberman Lab COMPLET avec transcriptions
 */

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36";

interface HubermanArticle {
  source: string;
  title: string;
  content: string;
  url: string;
  category: string;
  keywords: string[];
  scrapedAt: Date;
}

async function fetchWithRetry(url: string, retries = 3): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, {
        headers: { "User-Agent": UA }
      });
      if (response.ok) return response;
    } catch (e) {
      if (i === retries - 1) throw e;
      await new Promise(r => setTimeout(r, 2000 * (i + 1)));
    }
  }
  throw new Error("Failed after retries");
}

function cleanHtml(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
    .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, "")
    .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, "")
    .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, "")
    .replace(/<aside\b[^<]*(?:(?!<\/aside>)<[^<]*)*<\/aside>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

async function getEpisodeFullContent(url: string): Promise<string> {
  try {
    console.log("  Fetching full content from:", url);
    const response = await fetchWithRetry(url);
    const html = await response.text();
    
    // Chercher la transcription dans différents formats possibles
    let content = "";
    
    // Format 1: <div class="transcript"> ou similaire
    const transcriptMatch = html.match(/<div[^>]*class="[^"]*transcript[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
    if (transcriptMatch) {
      content = cleanHtml(transcriptMatch[1]);
    }
    
    // Format 2: <article> ou <main>
    if (!content || content.length < 1000) {
      const articleMatch = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
      if (articleMatch) {
        content = cleanHtml(articleMatch[1]);
      }
    }
    
    // Format 3: Main content div
    if (!content || content.length < 1000) {
      const mainMatch = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
      if (mainMatch) {
        content = cleanHtml(mainMatch[1]);
      }
    }
    
    // Format 4: Body content (fallback)
    if (!content || content.length < 1000) {
      const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
      if (bodyMatch) {
        content = cleanHtml(bodyMatch[1]);
      }
    }
    
    return content || "";
  } catch (error) {
    console.error("  Error fetching episode content:", error);
    return "";
  }
}

async function scrapeHubermanFull(limit: number = 1000): Promise<HubermanArticle[]> {
  console.log("[Huberman Full Scraper] Starting...");
  const articles: HubermanArticle[] = [];
  
  try {
    const rssUrl = "https://feeds.megaphone.fm/hubermanlab";
    const response = await fetchWithRetry(rssUrl);
    const xml = await response.text();
    
    const itemPattern = /<item>([\s\S]*?)<\/item>/gi;
    const items = [...xml.matchAll(itemPattern)];
    console.log(`[Huberman Full Scraper] Found ${items.length} episodes in RSS`);
    
    let processed = 0;
    for (const item of items.slice(0, limit)) {
      processed++;
      const itemContent = item[1];
      
      const titleMatch = itemContent.match(/<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/i);
      const title = titleMatch ? titleMatch[1].replace(/<!\[CDATA\[|\]\]>/g, "").trim() : "";
      
      const linkMatch = itemContent.match(/<link>([^<]+)<\/link>/i);
      const link = linkMatch ? linkMatch[1].trim() : "";
      
      const descMatch = itemContent.match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i);
      const description = descMatch ? cleanHtml(descMatch[1]) : "";
      
      if (!title || !link) {
        console.log(`[${processed}/${items.length}] Skipping - missing title or link`);
        continue;
      }
      
      console.log(`[${processed}/${items.length}] Processing: ${title.substring(0, 60)}...`);
      
      // Récupérer le contenu complet de la page
      const fullContent = await getEpisodeFullContent(link);
      
      // Utiliser le contenu complet s'il est disponible, sinon la description
      const content = fullContent && fullContent.length > description.length 
        ? fullContent 
        : description;
      
      if (content.length > 200) {
        articles.push({
          source: "huberman",
          title,
          content,
          url: link,
          category: "general",
          keywords: [],
          scrapedAt: new Date()
        });
        
        console.log(`  Content length: ${content.length} characters`);
      }
      
      // Délai entre les requêtes pour ne pas surcharger le serveur
      await new Promise(r => setTimeout(r, 1000));
    }
  } catch (error) {
    console.error("[Huberman Full Scraper] Error:", error);
  }
  
  console.log(`[Huberman Full Scraper] Completed: ${articles.length} articles`);
  return articles;
}

// Main execution
import { writeFileSync, mkdirSync } from "fs";

async function main() {
  const limit = parseInt(process.argv[2] || "1000");
  console.log("Starting Huberman Lab full scraper with limit:", limit);
  
  const articles = await scrapeHubermanFull(limit);
  
  try {
    mkdirSync("/Users/achzod/Desktop/neurocore/scraped-data", { recursive: true });
  } catch (e) {}
  
  const outputPath = "/Users/achzod/Desktop/neurocore/scraped-data/huberman-full.json";
  writeFileSync(outputPath, JSON.stringify(articles, null, 2));
  
  console.log("\n=== SUMMARY ===");
  console.log("Total articles:", articles.length);
  console.log("Saved to:", outputPath);
  
  if (articles.length > 0) {
    const totalLength = articles.reduce((sum, a) => sum + a.content.length, 0);
    const avgLength = Math.round(totalLength / articles.length);
    console.log("Average content length:", avgLength, "characters");
    console.log("Total content:", totalLength, "characters");
    
    const lengths = articles.map(a => a.content.length).sort((a, b) => a - b);
    console.log("Min length:", lengths[0]);
    console.log("Max length:", lengths[lengths.length - 1]);
    console.log("Median length:", lengths[Math.floor(lengths.length / 2)]);
  }
}

main();
