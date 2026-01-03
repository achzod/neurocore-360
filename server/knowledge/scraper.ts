/**
 * NEUROCORE 360 - Knowledge Base Scraper V2
 * Scrape les sources de connaissances pour l'apprentissage IA
 * Version améliorée avec meilleure extraction de contenu
 */

import { ScrapedArticle, saveArticles } from "./storage";

// URLs des sources
const HUBERMAN_RSS = "https://feeds.megaphone.fm/hubaboratory";
const SBS_BASE = "https://www.strongerbyscience.com";
const APPLIED_METABOLICS_URL = "https://www.appliedmetabolics.com";

// Credentials
const APPLIED_METABOLICS_EMAIL = "achkou@gmail.com";
const APPLIED_METABOLICS_PASSWORD = process.env.APPLIED_METABOLICS_PASSWORD || "";
const SENDPULSE_CLIENT_ID = process.env.SENDPULSE_USER_ID || "";
const SENDPULSE_SECRET = process.env.SENDPULSE_SECRET || "";

/**
 * Catégorisation automatique basée sur le contenu
 */
function categorizeContent(title: string, content: string): string {
  const text = `${title} ${content}`.toLowerCase();

  const categories: Record<string, string[]> = {
    sommeil: ["sleep", "sommeil", "melatonin", "circadian", "insomnia", "rêve", "nuit", "adenosine"],
    hormones: ["testosterone", "cortisol", "hormone", "thyroid", "estrogen", "prolactin", "gh", "igf", "dhea"],
    nutrition: ["protein", "protéine", "calorie", "macro", "diet", "nutrition", "glucide", "lipide", "carb"],
    performance: ["vo2max", "endurance", "strength", "force", "hypertrophy", "training", "entraînement", "muscle"],
    recuperation: ["recovery", "récupération", "hrv", "rest", "repos", "overtraining", "deload"],
    stress: ["stress", "anxiety", "anxiété", "cortisol", "burnout", "adaptation", "resilience"],
    digestion: ["gut", "microbiome", "digestif", "intestin", "probiotic", "fiber", "digestion"],
    focus: ["focus", "concentration", "dopamine", "nootropic", "cognitive", "brain", "attention"],
    supplements: ["supplement", "supplément", "vitamine", "mineral", "creatine", "omega", "magnesium"],
    metabolisme: ["metabolism", "métabolisme", "insulin", "glucose", "fat loss", "thermogenesis", "metabolic"]
  };

  for (const [category, keywords] of Object.entries(categories)) {
    if (keywords.some(kw => text.includes(kw))) {
      return category;
    }
  }

  return "general";
}

/**
 * Extrait les mots-clés d'un texte
 */
function extractKeywords(title: string, content: string): string[] {
  const text = `${title} ${content}`.toLowerCase();

  const importantTerms = [
    "testosterone", "cortisol", "sommeil", "sleep", "hrv", "protein", "protéine",
    "créatine", "creatine", "magnésium", "zinc", "vitamine d", "omega-3",
    "jeûne", "fasting", "hiit", "zone 2", "vo2max", "hypertrophie", "hypertrophy",
    "dopamine", "sérotonine", "gaba", "mélatonine", "ashwagandha", "rhodiola",
    "microbiome", "probiotique", "insuline", "glucose", "thyroïde", "t3", "t4",
    "récupération", "recovery", "inflammation", "stress oxydatif", "mitochondrie",
    "leucine", "mtor", "autophagie", "circadien", "lumière bleue", "caffeine"
  ];

  return importantTerms.filter(term => text.includes(term));
}

/**
 * Nettoie le HTML et extrait le texte
 */
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

// ============================================
// HUBERMAN LAB SCRAPER - Via RSS Feed
// ============================================

export async function scrapeHuberman(limit: number = 20): Promise<ScrapedArticle[]> {
  console.log("[Scraper] Starting Huberman Lab scrape via RSS...");
  const articles: ScrapedArticle[] = [];

  try {
    // Fetch RSS feed
    const response = await fetch(HUBERMAN_RSS);
    const xml = await response.text();

    // Parse RSS items
    const itemPattern = /<item>([\s\S]*?)<\/item>/gi;
    const items = [...xml.matchAll(itemPattern)];

    console.log(`[Scraper] Found ${items.length} Huberman episodes in RSS`);

    for (const item of items.slice(0, limit)) {
      const itemContent = item[1];

      // Extract title
      const titleMatch = itemContent.match(/<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/i);
      const title = titleMatch ? titleMatch[1].trim() : "";

      // Extract description
      const descMatch = itemContent.match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i) ||
                       itemContent.match(/<content:encoded>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/content:encoded>/i);
      const description = descMatch ? cleanHtml(descMatch[1]) : "";

      // Extract link
      const linkMatch = itemContent.match(/<link>([^<]+)<\/link>/i);
      const link = linkMatch ? linkMatch[1].trim() : "";

      // Extract publication date
      const pubDateMatch = itemContent.match(/<pubDate>([^<]+)<\/pubDate>/i);
      const pubDate = pubDateMatch ? new Date(pubDateMatch[1]) : new Date();

      if (title && description.length > 200) {
        articles.push({
          source: "huberman",
          title,
          content: description.substring(0, 50000),
          url: link || `https://www.hubermanlab.com/episode/${title.toLowerCase().replace(/\s+/g, '-')}`,
          category: categorizeContent(title, description),
          keywords: extractKeywords(title, description),
          scrapedAt: pubDate
        });
      }
    }
  } catch (error) {
    console.error("[Scraper] Huberman RSS scrape failed:", error);
  }

  console.log(`[Scraper] Scraped ${articles.length} Huberman episodes`);
  return articles;
}

// ============================================
// STRONGER BY SCIENCE SCRAPER - Improved
// ============================================

export async function scrapeSBS(limit: number = 20): Promise<ScrapedArticle[]> {
  console.log("[Scraper] Starting Stronger By Science scrape...");
  const articles: ScrapedArticle[] = [];

  // Direct article URLs to scrape (known good articles)
  const articleUrls = [
    "/the-science-of-protein/",
    "/creatine/",
    "/the-belt-bible/",
    "/hypertrophy-range-fact-fiction/",
    "/training-frequency/",
    "/muscle-math/",
    "/periodization-data/",
    "/avoiding-cardio-could-be-holding-you-back/",
    "/the-science-of-deloads/",
    "/sleep/",
    "/caffeine/",
    "/research-spotlight-protein-timing/",
    "/research-spotlight-volume/",
    "/the-3-laws-of-protein/",
    "/training-to-failure/",
  ];

  for (const path of articleUrls.slice(0, limit)) {
    const articleUrl = `${SBS_BASE}${path}`;

    try {
      console.log(`[Scraper] Fetching SBS: ${articleUrl}`);
      const response = await fetch(articleUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; NeurocoreBot/1.0)"
        }
      });

      if (!response.ok) {
        console.log(`[Scraper] SBS ${path} returned ${response.status}`);
        continue;
      }

      const html = await response.text();

      // Extract title
      const titleMatch = html.match(/<h1[^>]*class="[^"]*entry-title[^"]*"[^>]*>([\s\S]*?)<\/h1>/i) ||
                        html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
      const title = titleMatch ? cleanHtml(titleMatch[1]) : path.replace(/\//g, "").replace(/-/g, " ");

      // Extract main content
      const contentMatch = html.match(/<div[^>]*class="[^"]*entry-content[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<(?:footer|div class="author)/i) ||
                          html.match(/<article[^>]*>([\s\S]*?)<\/article>/i);

      let content = "";
      if (contentMatch) {
        content = cleanHtml(contentMatch[1]);
      }

      if (content.length > 1000) {
        articles.push({
          source: "sbs",
          title: title.trim(),
          content: content.substring(0, 50000),
          url: articleUrl,
          category: categorizeContent(title, content),
          keywords: extractKeywords(title, content),
          scrapedAt: new Date()
        });
        console.log(`[Scraper] ✓ Saved: ${title.substring(0, 50)}... (${content.length} chars)`);
      } else {
        console.log(`[Scraper] ✗ Skipped: ${path} (content too short: ${content.length})`);
      }

      // Rate limiting
      await new Promise(r => setTimeout(r, 1500));
    } catch (err) {
      console.error(`[Scraper] Error fetching SBS article: ${articleUrl}`, err);
    }
  }

  console.log(`[Scraper] Scraped ${articles.length} SBS articles`);
  return articles;
}

// ============================================
// APPLIED METABOLICS SCRAPER (Login Required)
// ============================================

export async function scrapeAppliedMetabolics(limit: number = 10): Promise<ScrapedArticle[]> {
  console.log("[Scraper] Starting Applied Metabolics scrape...");
  const articles: ScrapedArticle[] = [];

  if (!APPLIED_METABOLICS_PASSWORD) {
    console.error("[Scraper] Applied Metabolics password not configured (APPLIED_METABOLICS_PASSWORD)");
    return articles;
  }

  try {
    // WordPress login URL
    const loginUrl = `${APPLIED_METABOLICS_URL}/wp-login.php`;

    console.log(`[Scraper] Logging into Applied Metabolics...`);

    // Step 1: Get login page to get any cookies/nonces
    const loginPageRes = await fetch(loginUrl);
    const loginPageCookies = loginPageRes.headers.get("set-cookie") || "";

    // Step 2: Submit login
    const loginResponse = await fetch(loginUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Cookie": loginPageCookies,
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
      },
      body: new URLSearchParams({
        log: APPLIED_METABOLICS_EMAIL,
        pwd: APPLIED_METABOLICS_PASSWORD,
        "wp-submit": "Log In",
        redirect_to: APPLIED_METABOLICS_URL,
        testcookie: "1"
      }).toString(),
      redirect: "manual"
    });

    // Get session cookies
    const allCookies = loginResponse.headers.get("set-cookie") || "";
    console.log(`[Scraper] Login response: ${loginResponse.status}`);

    if (!allCookies.includes("wordpress_logged_in")) {
      console.error("[Scraper] Applied Metabolics login failed - check credentials");
      console.log("[Scraper] Response cookies:", allCookies.substring(0, 200));
      return articles;
    }

    console.log("[Scraper] Applied Metabolics login successful!");

    // Step 3: Fetch main content pages
    const contentPages = [
      "/category/articles/",
      "/category/protocols/",
      "/",
    ];

    for (const pagePath of contentPages) {
      try {
        const pageResponse = await fetch(`${APPLIED_METABOLICS_URL}${pagePath}`, {
          headers: {
            "Cookie": allCookies,
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
          }
        });

        const html = await pageResponse.text();

        // Find article links
        const linkPattern = /<a[^>]*href="(https:\/\/www\.appliedmetabolics\.com\/[^"]*\/)"[^>]*>/gi;
        const links = [...html.matchAll(linkPattern)];
        const uniqueLinks = [...new Set(links.map(m => m[1]))];

        for (const link of uniqueLinks.slice(0, Math.ceil(limit / contentPages.length))) {
          if (link.includes("/category/") || link.includes("/tag/") || link.includes("/page/")) {
            continue;
          }

          try {
            const articleRes = await fetch(link, {
              headers: {
                "Cookie": allCookies,
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
              }
            });

            const articleHtml = await articleRes.text();

            const titleMatch = articleHtml.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
            const contentMatch = articleHtml.match(/<div[^>]*class="[^"]*entry-content[^"]*"[^>]*>([\s\S]*?)<\/div>/i) ||
                                articleHtml.match(/<article[^>]*>([\s\S]*?)<\/article>/i);

            const title = titleMatch ? cleanHtml(titleMatch[1]) : "";
            const content = contentMatch ? cleanHtml(contentMatch[1]) : "";

            if (title && content.length > 500) {
              articles.push({
                source: "applied_metabolics",
                title,
                content: content.substring(0, 50000),
                url: link,
                category: categorizeContent(title, content),
                keywords: extractKeywords(title, content),
                scrapedAt: new Date()
              });
              console.log(`[Scraper] ✓ AM Saved: ${title.substring(0, 50)}...`);
            }

            await new Promise(r => setTimeout(r, 2000));
          } catch (err) {
            console.error(`[Scraper] Error fetching AM article: ${link}`, err);
          }

          if (articles.length >= limit) break;
        }
      } catch (err) {
        console.error(`[Scraper] Error fetching AM page: ${pagePath}`, err);
      }

      if (articles.length >= limit) break;
    }
  } catch (error) {
    console.error("[Scraper] Applied Metabolics scrape failed:", error);
  }

  console.log(`[Scraper] Scraped ${articles.length} Applied Metabolics articles`);
  return articles;
}

// ============================================
// SENDPULSE NEWSLETTERS SCRAPER
// ============================================

export async function scrapeSendPulseNewsletters(limit: number = 20): Promise<ScrapedArticle[]> {
  console.log("[Scraper] Starting SendPulse newsletters scrape...");
  const articles: ScrapedArticle[] = [];

  if (!SENDPULSE_CLIENT_ID || !SENDPULSE_SECRET) {
    console.error("[Scraper] SendPulse credentials not configured");
    return articles;
  }

  try {
    // Step 1: Get access token
    console.log("[Scraper] Getting SendPulse token...");
    const tokenResponse = await fetch("https://api.sendpulse.com/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "client_credentials",
        client_id: SENDPULSE_CLIENT_ID,
        client_secret: SENDPULSE_SECRET
      })
    });

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      console.error("[Scraper] Failed to get SendPulse token:", tokenData);
      return articles;
    }

    console.log("[Scraper] SendPulse token obtained");

    // Step 2: Get email campaigns
    const campaignsResponse = await fetch("https://api.sendpulse.com/campaigns", {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    const campaigns = await campaignsResponse.json();
    console.log(`[Scraper] Found ${Array.isArray(campaigns) ? campaigns.length : 0} SendPulse campaigns`);

    if (Array.isArray(campaigns)) {
      for (const campaign of campaigns.slice(0, limit)) {
        // Get campaign details
        try {
          const detailRes = await fetch(`https://api.sendpulse.com/campaigns/${campaign.id}`, {
            headers: { Authorization: `Bearer ${accessToken}` }
          });
          const detail = await detailRes.json();

          const title = detail.message?.subject || campaign.name || "Newsletter ACHZOD";
          const content = cleanHtml(detail.message?.body?.html || detail.message?.body?.text || "");

          if (content.length > 200) {
            articles.push({
              source: "newsletter",
              title,
              content: content.substring(0, 20000),
              url: `sendpulse://campaign/${campaign.id}`,
              category: categorizeContent(title, content),
              keywords: extractKeywords(title, content),
              scrapedAt: new Date(campaign.send_date || campaign.created || Date.now())
            });
            console.log(`[Scraper] ✓ Newsletter: ${title.substring(0, 50)}...`);
          }

          await new Promise(r => setTimeout(r, 500));
        } catch (err) {
          console.error(`[Scraper] Error fetching campaign ${campaign.id}:`, err);
        }
      }
    }
  } catch (error) {
    console.error("[Scraper] SendPulse scrape failed:", error);
  }

  console.log(`[Scraper] Scraped ${articles.length} newsletters`);
  return articles;
}

// ============================================
// MAIN SCRAPER FUNCTIONS
// ============================================

export type ScraperSource = "huberman" | "sbs" | "applied_metabolics" | "newsletter" | "all";

/**
 * Scrape une source spécifique
 */
export async function scrapeSource(
  source: ScraperSource,
  limit: number = 20
): Promise<{ articles: ScrapedArticle[]; saved: number; duplicates: number }> {
  let articles: ScrapedArticle[] = [];

  switch (source) {
    case "huberman":
      articles = await scrapeHuberman(limit);
      break;
    case "sbs":
      articles = await scrapeSBS(limit);
      break;
    case "applied_metabolics":
      articles = await scrapeAppliedMetabolics(limit);
      break;
    case "newsletter":
      articles = await scrapeSendPulseNewsletters(limit);
      break;
    case "all":
      const [hub, sbs, am, nl] = await Promise.all([
        scrapeHuberman(limit),
        scrapeSBS(limit),
        scrapeAppliedMetabolics(limit),
        scrapeSendPulseNewsletters(limit)
      ]);
      articles = [...hub, ...sbs, ...am, ...nl];
      break;
  }

  const { saved, duplicates } = await saveArticles(articles);

  return { articles, saved, duplicates };
}

/**
 * Build complet de la base de connaissances
 */
export async function buildKnowledgeBase(): Promise<{
  totalScraped: number;
  saved: number;
  duplicates: number;
  bySource: Record<string, number>;
}> {
  console.log("[Scraper] ========================================");
  console.log("[Scraper] Building complete knowledge base...");
  console.log("[Scraper] ========================================");

  const results = {
    totalScraped: 0,
    saved: 0,
    duplicates: 0,
    bySource: {} as Record<string, number>
  };

  // Scrape all sources sequentially to avoid rate limits
  const sources: ScraperSource[] = ["huberman", "sbs", "applied_metabolics", "newsletter"];

  for (const source of sources) {
    console.log(`\n[Scraper] === Scraping ${source.toUpperCase()} ===`);
    try {
      const { articles, saved, duplicates } = await scrapeSource(source, 15);
      results.totalScraped += articles.length;
      results.saved += saved;
      results.duplicates += duplicates;
      results.bySource[source] = articles.length;
      console.log(`[Scraper] ${source}: ${articles.length} scraped, ${saved} saved`);
    } catch (err) {
      console.error(`[Scraper] ${source} failed:`, err);
      results.bySource[source] = 0;
    }

    // Wait between sources
    await new Promise(r => setTimeout(r, 3000));
  }

  console.log("\n[Scraper] ========================================");
  console.log(`[Scraper] Build complete: ${results.saved} saved, ${results.duplicates} duplicates`);
  console.log("[Scraper] ========================================");

  return results;
}
