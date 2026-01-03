/**
 * NEUROCORE 360 - Knowledge Base Scraper
 * Scrape les sources de connaissances pour l'apprentissage IA
 *
 * Sources:
 * 1. Huberman Lab - Podcasts neuroscience
 * 2. Stronger By Science - Analyses scientifiques
 * 3. Applied Metabolics - Articles métabolisme (login requis)
 * 4. Newsletters SendPulse - Tips ACHZOD
 */

import { ScrapedArticle, saveArticles } from "./storage";

const HUBERMAN_URL = "https://www.hubermanlab.com/episodes";
const SBS_RESEARCH_URL = "https://www.strongerbyscience.com/research-spotlight/";
const SBS_ARTICLES_URL = "https://www.strongerbyscience.com/articles/";
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
    sommeil: ["sleep", "sommeil", "melatonin", "circadian", "insomnia", "rêve", "nuit"],
    hormones: ["testosterone", "cortisol", "hormone", "thyroid", "estrogen", "prolactin", "gh", "igf"],
    nutrition: ["protein", "protéine", "calorie", "macro", "diet", "nutrition", "glucide", "lipide"],
    performance: ["vo2max", "endurance", "strength", "force", "hypertrophy", "training", "entraînement"],
    recuperation: ["recovery", "récupération", "hrv", "rest", "repos", "overtraining"],
    stress: ["stress", "anxiety", "anxiété", "cortisol", "burnout", "adaptation"],
    digestion: ["gut", "microbiome", "digestif", "intestin", "probiotic", "fiber"],
    focus: ["focus", "concentration", "dopamine", "nootropic", "cognitive", "brain"],
    supplements: ["supplement", "supplément", "vitamine", "mineral", "creatine", "omega"],
    metabolisme: ["metabolism", "métabolisme", "insulin", "glucose", "fat loss", "thermogenesis"]
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
    "leucine", "mtor", "autophagie", "circadien", "lumière bleue"
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
// HUBERMAN LAB SCRAPER
// ============================================

export async function scrapeHuberman(limit: number = 20): Promise<ScrapedArticle[]> {
  console.log("[Scraper] Starting Huberman Lab scrape...");
  const articles: ScrapedArticle[] = [];

  try {
    // Fetch episodes page
    const response = await fetch(HUBERMAN_URL);
    const html = await response.text();

    // Extract episode links (basic pattern matching)
    const episodePattern = /<a[^>]*href="(\/episode\/[^"]+)"[^>]*>([^<]+)</gi;
    const matches = [...html.matchAll(episodePattern)];

    console.log(`[Scraper] Found ${matches.length} Huberman episodes`);

    for (const match of matches.slice(0, limit)) {
      const episodeUrl = `https://www.hubermanlab.com${match[1]}`;
      const episodeTitle = cleanHtml(match[2]);

      try {
        // Fetch episode page
        const episodeResponse = await fetch(episodeUrl);
        const episodeHtml = await episodeResponse.text();

        // Extract transcript/content
        const contentMatch = episodeHtml.match(/<article[^>]*>([\s\S]*?)<\/article>/i) ||
                            episodeHtml.match(/<div[^>]*class="[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/div>/i);

        const content = contentMatch ? cleanHtml(contentMatch[1]) : "";

        if (content.length > 500) {
          articles.push({
            source: "huberman",
            title: episodeTitle,
            content: content.substring(0, 50000), // Limit content size
            url: episodeUrl,
            category: categorizeContent(episodeTitle, content),
            keywords: extractKeywords(episodeTitle, content),
            scrapedAt: new Date()
          });
        }

        // Rate limiting
        await new Promise(r => setTimeout(r, 1000));
      } catch (err) {
        console.error(`[Scraper] Error fetching Huberman episode: ${episodeUrl}`, err);
      }
    }
  } catch (error) {
    console.error("[Scraper] Huberman scrape failed:", error);
  }

  console.log(`[Scraper] Scraped ${articles.length} Huberman articles`);
  return articles;
}

// ============================================
// STRONGER BY SCIENCE SCRAPER
// ============================================

export async function scrapeSBS(limit: number = 20): Promise<ScrapedArticle[]> {
  console.log("[Scraper] Starting Stronger By Science scrape...");
  const articles: ScrapedArticle[] = [];

  const urls = [SBS_RESEARCH_URL, SBS_ARTICLES_URL];

  for (const baseUrl of urls) {
    try {
      const response = await fetch(baseUrl);
      const html = await response.text();

      // Extract article links
      const articlePattern = /<a[^>]*href="(https:\/\/www\.strongerbyscience\.com\/[^"]+\/?)"[^>]*>([^<]*)</gi;
      const matches = [...html.matchAll(articlePattern)];

      const uniqueUrls = new Set<string>();

      for (const match of matches) {
        const articleUrl = match[1];
        if (uniqueUrls.has(articleUrl) || articleUrl.includes("/category/") || articleUrl.includes("/tag/")) {
          continue;
        }
        uniqueUrls.add(articleUrl);

        if (articles.length >= limit) break;

        try {
          const articleResponse = await fetch(articleUrl);
          const articleHtml = await articleResponse.text();

          // Extract title
          const titleMatch = articleHtml.match(/<h1[^>]*>([^<]+)<\/h1>/i);
          const title = titleMatch ? cleanHtml(titleMatch[1]) : match[2];

          // Extract content
          const contentMatch = articleHtml.match(/<article[^>]*>([\s\S]*?)<\/article>/i) ||
                              articleHtml.match(/<div[^>]*class="[^"]*entry-content[^"]*"[^>]*>([\s\S]*?)<\/div>/i);

          const content = contentMatch ? cleanHtml(contentMatch[1]) : "";

          if (content.length > 500 && title) {
            articles.push({
              source: "sbs",
              title,
              content: content.substring(0, 50000),
              url: articleUrl,
              category: categorizeContent(title, content),
              keywords: extractKeywords(title, content),
              scrapedAt: new Date()
            });
          }

          await new Promise(r => setTimeout(r, 1000));
        } catch (err) {
          console.error(`[Scraper] Error fetching SBS article: ${articleUrl}`, err);
        }
      }
    } catch (error) {
      console.error(`[Scraper] SBS scrape failed for ${baseUrl}:`, error);
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
    console.error("[Scraper] Applied Metabolics password not configured");
    return articles;
  }

  try {
    // Step 1: Login to get session cookie
    const loginResponse = await fetch(`${APPLIED_METABOLICS_URL}/wp-login.php`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
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

    // Get cookies from response
    const cookies = loginResponse.headers.get("set-cookie") || "";

    if (!cookies.includes("wordpress_logged_in")) {
      console.error("[Scraper] Applied Metabolics login failed - no session cookie");
      return articles;
    }

    console.log("[Scraper] Applied Metabolics login successful");

    // Step 2: Fetch articles with session
    const articlesResponse = await fetch(`${APPLIED_METABOLICS_URL}/category/articles/`, {
      headers: {
        Cookie: cookies
      }
    });

    const html = await articlesResponse.text();

    // Extract article links
    const articlePattern = /<a[^>]*href="(https:\/\/www\.appliedmetabolics\.com\/[^"]+\/?)"[^>]*class="[^"]*post[^"]*"[^>]*>/gi;
    const matches = [...html.matchAll(articlePattern)];

    for (const match of matches.slice(0, limit)) {
      const articleUrl = match[1];

      try {
        const articleResponse = await fetch(articleUrl, {
          headers: { Cookie: cookies }
        });
        const articleHtml = await articleResponse.text();

        const titleMatch = articleHtml.match(/<h1[^>]*class="[^"]*entry-title[^"]*"[^>]*>([^<]+)<\/h1>/i);
        const contentMatch = articleHtml.match(/<div[^>]*class="[^"]*entry-content[^"]*"[^>]*>([\s\S]*?)<\/div>/i);

        const title = titleMatch ? cleanHtml(titleMatch[1]) : "";
        const content = contentMatch ? cleanHtml(contentMatch[1]) : "";

        if (title && content.length > 500) {
          articles.push({
            source: "applied_metabolics",
            title,
            content: content.substring(0, 50000),
            url: articleUrl,
            category: categorizeContent(title, content),
            keywords: extractKeywords(title, content),
            scrapedAt: new Date()
          });
        }

        await new Promise(r => setTimeout(r, 2000)); // Slower for private site
      } catch (err) {
        console.error(`[Scraper] Error fetching AM article: ${articleUrl}`, err);
      }
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
      console.error("[Scraper] Failed to get SendPulse token");
      return articles;
    }

    // Step 2: Get campaigns/newsletters
    const campaignsResponse = await fetch("https://api.sendpulse.com/smtp/emails", {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    const campaigns = await campaignsResponse.json();

    if (Array.isArray(campaigns)) {
      for (const campaign of campaigns.slice(0, limit)) {
        const title = campaign.subject || campaign.name || "Newsletter ACHZOD";
        const content = cleanHtml(campaign.body || campaign.html || "");

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
  console.log("[Scraper] Building complete knowledge base...");

  const results = {
    totalScraped: 0,
    saved: 0,
    duplicates: 0,
    bySource: {} as Record<string, number>
  };

  // Scrape all sources
  const sources: ScraperSource[] = ["huberman", "sbs", "applied_metabolics", "newsletter"];

  for (const source of sources) {
    console.log(`[Scraper] Scraping ${source}...`);
    const { articles, saved, duplicates } = await scrapeSource(source, 30);
    results.totalScraped += articles.length;
    results.saved += saved;
    results.duplicates += duplicates;
    results.bySource[source] = articles.length;
  }

  console.log(`[Scraper] Build complete: ${results.saved} saved, ${results.duplicates} duplicates`);
  return results;
}
