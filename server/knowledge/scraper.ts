/**
 * NEUROCORE 360 - Knowledge Base Scraper V3
 * Sources: Huberman, SBS, Applied Metabolics, SendPulse, Examine, Peter Attia, Marek, Masterjohn, RP, MPMD
 */

import { ScrapedArticle, saveArticles } from "./storage";

// ============================================
// CONFIGURATION
// ============================================

const SOURCES = {
  huberman: {
    name: "Huberman Lab",
    rss: "https://feeds.megaphone.fm/hubermanlab",
    url: "https://www.hubermanlab.com"
  },
  sbs: {
    name: "Stronger By Science",
    url: "https://www.strongerbyscience.com"
  },
  applied_metabolics: {
    name: "Applied Metabolics",
    url: "https://www.appliedmetabolics.com"
  },
  examine: {
    name: "Examine.com",
    url: "https://examine.com"
  },
  peter_attia: {
    name: "Peter Attia - The Drive",
    url: "https://peterattiamd.com"
  },
  marek_health: {
    name: "Marek Health",
    url: "https://marekhealth.com"
  },
  chris_masterjohn: {
    name: "Chris Masterjohn PhD",
    url: "https://chrismasterjohnphd.com"
  },
  renaissance_periodization: {
    name: "Renaissance Periodization",
    url: "https://rpstrength.com"
  },
  mpmd: {
    name: "More Plates More Dates",
    url: "https://moreplatesmoredates.com"
  },
  newsletter: {
    name: "Newsletters ACHZOD",
    url: "SendPulse"
  }
};

// Credentials from env
const AM_EMAIL = "achkou@gmail.com";
const AM_PASSWORD = process.env.APPLIED_METABOLICS_PASSWORD || "";
const SENDPULSE_CLIENT_ID = process.env.SENDPULSE_USER_ID || "";
const SENDPULSE_SECRET = process.env.SENDPULSE_SECRET || "";

// User agent
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

// ============================================
// HELPER FUNCTIONS
// ============================================

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

function categorizeContent(title: string, content: string): string {
  const text = `${title} ${content}`.toLowerCase();

  const categories: Record<string, string[]> = {
    bloodwork: ["bloodwork", "blood test", "lab", "biomarker", "testosterone", "estradiol", "tsh", "t3", "t4", "ldl", "hdl", "triglyceride", "apob", "hba1c", "insulin", "ferritin", "crp", "homocysteine"],
    hormones: ["testosterone", "cortisol", "hormone", "thyroid", "estrogen", "prolactin", "gh", "igf", "dhea", "trt", "hrt"],
    sommeil: ["sleep", "sommeil", "melatonin", "circadian", "insomnia", "rêve", "nuit", "adenosine"],
    nutrition: ["protein", "protéine", "calorie", "macro", "diet", "nutrition", "glucide", "lipide", "carb", "eating"],
    performance: ["vo2max", "endurance", "strength", "force", "hypertrophy", "training", "entraînement", "muscle", "periodization"],
    recuperation: ["recovery", "récupération", "hrv", "rest", "repos", "overtraining", "deload"],
    stress: ["stress", "anxiety", "anxiété", "cortisol", "burnout", "adaptation", "resilience", "hpa"],
    supplements: ["supplement", "supplément", "vitamine", "mineral", "creatine", "omega", "magnesium", "zinc", "examine"],
    metabolisme: ["metabolism", "métabolisme", "insulin", "glucose", "fat loss", "thermogenesis", "metabolic", "longevity"],
    inflammation: ["inflammation", "crp", "cytokine", "autoimmune", "anti-inflammatory"]
  };

  for (const [category, keywords] of Object.entries(categories)) {
    if (keywords.some(kw => text.includes(kw))) {
      return category;
    }
  }

  return "general";
}

function extractKeywords(title: string, content: string): string[] {
  const text = `${title} ${content}`.toLowerCase();

  const importantTerms = [
    "testosterone", "cortisol", "sommeil", "sleep", "hrv", "protein", "protéine",
    "créatine", "creatine", "magnésium", "zinc", "vitamine d", "omega-3", "b12",
    "jeûne", "fasting", "hiit", "zone 2", "vo2max", "hypertrophie", "hypertrophy",
    "dopamine", "sérotonine", "gaba", "mélatonine", "ashwagandha", "rhodiola",
    "microbiome", "probiotique", "insuline", "glucose", "thyroïde", "t3", "t4", "tsh",
    "récupération", "recovery", "inflammation", "stress oxydatif", "mitochondrie",
    "leucine", "mtor", "autophagie", "circadien", "lumière bleue", "caffeine",
    "apob", "ldl", "hdl", "triglycerides", "ferritine", "crp", "homocysteine",
    "trt", "estradiol", "shbg", "prolactine", "dhea", "igf-1", "hba1c",
    "bloodwork", "biomarker", "longevity", "péter attia", "marek"
  ];

  return importantTerms.filter(term => text.includes(term));
}

async function fetchWithRetry(url: string, options: RequestInit = {}, retries = 3): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          "User-Agent": UA,
          ...options.headers
        }
      });
      if (response.ok || response.status === 404) return response;
      console.log(`[Scraper] Retry ${i + 1}/${retries} for ${url} (status ${response.status})`);
    } catch (err) {
      console.log(`[Scraper] Retry ${i + 1}/${retries} for ${url}: ${err}`);
    }
    await new Promise(r => setTimeout(r, 2000 * (i + 1)));
  }
  throw new Error(`Failed to fetch ${url} after ${retries} retries`);
}

// ============================================
// 1. HUBERMAN LAB - RSS Feed
// ============================================

export async function scrapeHuberman(limit: number = 20): Promise<ScrapedArticle[]> {
  console.log("[Scraper] Starting Huberman Lab (RSS)...");
  const articles: ScrapedArticle[] = [];

  try {
    const response = await fetchWithRetry(SOURCES.huberman.rss);
    const xml = await response.text();

    const itemPattern = /<item>([\s\S]*?)<\/item>/gi;
    const items = [...xml.matchAll(itemPattern)];
    console.log(`[Scraper] Found ${items.length} Huberman episodes`);

    for (const item of items.slice(0, limit)) {
      const itemContent = item[1];

      const titleMatch = itemContent.match(/<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/i);
      const title = titleMatch ? titleMatch[1].replace(/<!\[CDATA\[|\]\]>/g, "").trim() : "";

      const descMatch = itemContent.match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i) ||
                       itemContent.match(/<content:encoded>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/content:encoded>/i);
      const description = descMatch ? cleanHtml(descMatch[1]) : "";

      const linkMatch = itemContent.match(/<link>([^<]+)<\/link>/i);
      const link = linkMatch ? linkMatch[1].trim() : "";

      if (title && description.length > 200) {
        articles.push({
          source: "huberman",
          title,
          content: description.substring(0, 50000),
          url: link || `https://www.hubermanlab.com`,
          category: categorizeContent(title, description),
          keywords: extractKeywords(title, description),
          scrapedAt: new Date()
        });
      }
    }
  } catch (error) {
    console.error("[Scraper] Huberman failed:", error);
  }

  console.log(`[Scraper] ✓ Huberman: ${articles.length} episodes`);
  return articles;
}

// ============================================
// 2. STRONGER BY SCIENCE - Direct URLs
// ============================================

const SBS_ARTICLES = [
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
  "/how-to-get-stronger/",
  "/strength-training-for-endurance/",
  "/progressive-overload/",
  "/joint-health-for-lifters/",
  "/plateau-busting/"
];

export async function scrapeSBS(limit: number = 20): Promise<ScrapedArticle[]> {
  console.log("[Scraper] Starting SBS...");
  const articles: ScrapedArticle[] = [];

  for (const path of SBS_ARTICLES.slice(0, limit)) {
    const url = `${SOURCES.sbs.url}${path}`;
    try {
      const response = await fetchWithRetry(url);
      if (!response.ok) continue;

      const html = await response.text();

      // Extract title
      const titleMatch = html.match(/<h1[^>]*class="[^"]*entry-title[^"]*"[^>]*>([\s\S]*?)<\/h1>/i) ||
                        html.match(/<title>([^<|]+)/i);
      const title = titleMatch ? cleanHtml(titleMatch[1]) : path.replace(/\//g, "");

      // Extract content - try multiple patterns
      let content = "";
      const contentPatterns = [
        /<div[^>]*class="[^"]*entry-content[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<(?:footer|div class="(?:author|post-nav))/i,
        /<article[^>]*class="[^"]*post[^"]*"[^>]*>([\s\S]*?)<\/article>/i,
        /<div[^>]*class="[^"]*article-content[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
        /<main[^>]*>([\s\S]*?)<\/main>/i
      ];

      for (const pattern of contentPatterns) {
        const match = html.match(pattern);
        if (match && cleanHtml(match[1]).length > 1000) {
          content = cleanHtml(match[1]);
          break;
        }
      }

      if (!content) {
        // Fallback: extract all paragraphs
        const paragraphs = html.match(/<p[^>]*>([\s\S]*?)<\/p>/gi);
        if (paragraphs) {
          content = paragraphs.map(p => cleanHtml(p)).filter(p => p.length > 50).join("\n\n");
        }
      }

      if (content.length > 1000) {
        articles.push({
          source: "sbs",
          title: title.trim(),
          content: content.substring(0, 50000),
          url,
          category: categorizeContent(title, content),
          keywords: extractKeywords(title, content),
          scrapedAt: new Date()
        });
        console.log(`[Scraper] ✓ SBS: ${title.substring(0, 40)}... (${content.length} chars)`);
      }

      await new Promise(r => setTimeout(r, 1500));
    } catch (err) {
      console.error(`[Scraper] SBS error: ${path}`, err);
    }
  }

  console.log(`[Scraper] ✓ SBS: ${articles.length} articles`);
  return articles;
}

// ============================================
// 3. APPLIED METABOLICS - WordPress Login
// ============================================

export async function scrapeAppliedMetabolics(limit: number = 10): Promise<ScrapedArticle[]> {
  console.log("[Scraper] Starting Applied Metabolics...");
  const articles: ScrapedArticle[] = [];

  if (!AM_PASSWORD) {
    console.log("[Scraper] ✗ Applied Metabolics: no password configured");
    return articles;
  }

  try {
    // Login to WordPress
    const loginRes = await fetch(`${SOURCES.applied_metabolics.url}/wp-login.php`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": UA
      },
      body: new URLSearchParams({
        log: AM_EMAIL,
        pwd: AM_PASSWORD,
        "wp-submit": "Log In",
        redirect_to: SOURCES.applied_metabolics.url,
        testcookie: "1"
      }).toString(),
      redirect: "manual"
    });

    const cookies = loginRes.headers.get("set-cookie") || "";
    if (!cookies.includes("wordpress_logged_in")) {
      console.log("[Scraper] ✗ Applied Metabolics login failed");
      return articles;
    }

    console.log("[Scraper] Applied Metabolics logged in");

    // Fetch content pages
    for (const page of ["/", "/category/articles/", "/category/protocols/"]) {
      try {
        const pageRes = await fetch(`${SOURCES.applied_metabolics.url}${page}`, {
          headers: { Cookie: cookies, "User-Agent": UA }
        });
        const html = await pageRes.text();

        // Find article links
        const linkPattern = /href="(https:\/\/www\.appliedmetabolics\.com\/[^"\/]+\/)"/gi;
        const links = [...new Set([...html.matchAll(linkPattern)].map(m => m[1]))];

        for (const link of links.slice(0, Math.ceil(limit / 3))) {
          if (link.includes("/category/") || link.includes("/tag/") || link.includes("/page/")) continue;

          try {
            const artRes = await fetch(link, { headers: { Cookie: cookies, "User-Agent": UA } });
            const artHtml = await artRes.text();

            const titleMatch = artHtml.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
            const contentMatch = artHtml.match(/<div[^>]*class="[^"]*entry-content[^"]*"[^>]*>([\s\S]*?)<\/div>/i);

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
              console.log(`[Scraper] ✓ AM: ${title.substring(0, 40)}...`);
            }

            await new Promise(r => setTimeout(r, 2000));
          } catch (e) {}

          if (articles.length >= limit) break;
        }
      } catch (e) {}
      if (articles.length >= limit) break;
    }
  } catch (error) {
    console.error("[Scraper] Applied Metabolics failed:", error);
  }

  console.log(`[Scraper] ✓ Applied Metabolics: ${articles.length} articles`);
  return articles;
}

// ============================================
// 4. EXAMINE.COM - Supplements Database
// ============================================

const EXAMINE_SUPPLEMENTS = [
  "creatine", "caffeine", "vitamin-d", "magnesium", "omega-3", "zinc",
  "ashwagandha", "melatonin", "berberine", "curcumin", "fish-oil",
  "vitamin-b12", "iron", "calcium", "vitamin-k", "coq10", "alpha-gpc",
  "rhodiola-rosea", "l-theanine", "beta-alanine", "citrulline"
];

export async function scrapeExamine(limit: number = 20): Promise<ScrapedArticle[]> {
  console.log("[Scraper] Starting Examine.com...");
  const articles: ScrapedArticle[] = [];

  for (const supp of EXAMINE_SUPPLEMENTS.slice(0, limit)) {
    const url = `${SOURCES.examine.url}/supplements/${supp}/`;
    try {
      const response = await fetchWithRetry(url);
      if (!response.ok) continue;

      const html = await response.text();

      const titleMatch = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
      const title = titleMatch ? cleanHtml(titleMatch[1]) : supp;

      // Extract summary and research content
      const summaryMatch = html.match(/<div[^>]*class="[^"]*summary[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
      const contentMatch = html.match(/<div[^>]*class="[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/div>/i) ||
                          html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);

      let content = "";
      if (summaryMatch) content += cleanHtml(summaryMatch[1]) + "\n\n";
      if (contentMatch) content += cleanHtml(contentMatch[1]);

      if (!content || content.length < 500) {
        // Fallback: all paragraphs
        const paragraphs = html.match(/<p[^>]*>([\s\S]*?)<\/p>/gi);
        if (paragraphs) {
          content = paragraphs.map(p => cleanHtml(p)).filter(p => p.length > 30).join("\n\n");
        }
      }

      if (content.length > 500) {
        articles.push({
          source: "examine",
          title: `${title} - Examine Research`,
          content: content.substring(0, 50000),
          url,
          category: "supplements",
          keywords: extractKeywords(title, content),
          scrapedAt: new Date()
        });
        console.log(`[Scraper] ✓ Examine: ${title.substring(0, 40)}...`);
      }

      await new Promise(r => setTimeout(r, 2000));
    } catch (err) {
      console.error(`[Scraper] Examine error: ${supp}`, err);
    }
  }

  console.log(`[Scraper] ✓ Examine: ${articles.length} supplements`);
  return articles;
}

// ============================================
// 5. PETER ATTIA - The Drive Podcast
// ============================================

export async function scrapePeterAttia(limit: number = 15): Promise<ScrapedArticle[]> {
  console.log("[Scraper] Starting Peter Attia...");
  const articles: ScrapedArticle[] = [];

  try {
    // Try podcast page
    const url = `${SOURCES.peter_attia.url}/podcast/`;
    const response = await fetchWithRetry(url);
    const html = await response.text();

    // Find episode links
    const linkPattern = /href="(https:\/\/peterattiamd\.com\/[^"]+)"/gi;
    const links = [...new Set([...html.matchAll(linkPattern)].map(m => m[1]))];

    const episodeLinks = links.filter(l =>
      !l.includes("/podcast/") &&
      !l.includes("/category/") &&
      !l.includes("/tag/") &&
      !l.includes("/page/") &&
      !l.includes(".xml") &&
      !l.includes("/author/")
    );

    console.log(`[Scraper] Found ${episodeLinks.length} Peter Attia links`);

    for (const link of episodeLinks.slice(0, limit)) {
      try {
        const artRes = await fetchWithRetry(link);
        if (!artRes.ok) continue;

        const artHtml = await artRes.text();

        const titleMatch = artHtml.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
        const title = titleMatch ? cleanHtml(titleMatch[1]) : "";

        // Extract content
        const contentMatch = artHtml.match(/<div[^>]*class="[^"]*entry-content[^"]*"[^>]*>([\s\S]*?)<\/div>/i) ||
                            artHtml.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
        let content = contentMatch ? cleanHtml(contentMatch[1]) : "";

        if (!content || content.length < 500) {
          const paragraphs = artHtml.match(/<p[^>]*>([\s\S]*?)<\/p>/gi);
          if (paragraphs) {
            content = paragraphs.map(p => cleanHtml(p)).filter(p => p.length > 30).join("\n\n");
          }
        }

        if (title && content.length > 500) {
          articles.push({
            source: "peter_attia",
            title,
            content: content.substring(0, 50000),
            url: link,
            category: categorizeContent(title, content),
            keywords: extractKeywords(title, content),
            scrapedAt: new Date()
          });
          console.log(`[Scraper] ✓ Attia: ${title.substring(0, 40)}...`);
        }

        await new Promise(r => setTimeout(r, 2000));
      } catch (e) {}

      if (articles.length >= limit) break;
    }
  } catch (error) {
    console.error("[Scraper] Peter Attia failed:", error);
  }

  console.log(`[Scraper] ✓ Peter Attia: ${articles.length} articles`);
  return articles;
}

// ============================================
// 6. MAREK HEALTH - Hormone Optimization
// ============================================

export async function scrapeMarekHealth(limit: number = 10): Promise<ScrapedArticle[]> {
  console.log("[Scraper] Starting Marek Health...");
  const articles: ScrapedArticle[] = [];

  try {
    const urls = [
      `${SOURCES.marek_health.url}/blog/`,
      `${SOURCES.marek_health.url}/resources/`
    ];

    for (const pageUrl of urls) {
      try {
        const response = await fetchWithRetry(pageUrl);
        const html = await response.text();

        const linkPattern = /href="(https:\/\/marekhealth\.com\/(?:blog|resources)\/[^"]+)"/gi;
        const links = [...new Set([...html.matchAll(linkPattern)].map(m => m[1]))];

        for (const link of links.slice(0, Math.ceil(limit / 2))) {
          try {
            const artRes = await fetchWithRetry(link);
            if (!artRes.ok) continue;

            const artHtml = await artRes.text();

            const titleMatch = artHtml.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
            const title = titleMatch ? cleanHtml(titleMatch[1]) : "";

            const paragraphs = artHtml.match(/<p[^>]*>([\s\S]*?)<\/p>/gi);
            const content = paragraphs ? paragraphs.map(p => cleanHtml(p)).filter(p => p.length > 30).join("\n\n") : "";

            if (title && content.length > 500) {
              articles.push({
                source: "marek_health",
                title,
                content: content.substring(0, 50000),
                url: link,
                category: "bloodwork",
                keywords: extractKeywords(title, content),
                scrapedAt: new Date()
              });
              console.log(`[Scraper] ✓ Marek: ${title.substring(0, 40)}...`);
            }

            await new Promise(r => setTimeout(r, 2000));
          } catch (e) {}

          if (articles.length >= limit) break;
        }
      } catch (e) {}
      if (articles.length >= limit) break;
    }
  } catch (error) {
    console.error("[Scraper] Marek Health failed:", error);
  }

  console.log(`[Scraper] ✓ Marek Health: ${articles.length} articles`);
  return articles;
}

// ============================================
// 7. CHRIS MASTERJOHN PhD - Micronutrients
// ============================================

export async function scrapeMasterjohn(limit: number = 10): Promise<ScrapedArticle[]> {
  console.log("[Scraper] Starting Chris Masterjohn...");
  const articles: ScrapedArticle[] = [];

  try {
    const response = await fetchWithRetry(`${SOURCES.chris_masterjohn.url}/blog`);
    const html = await response.text();

    const linkPattern = /href="(https:\/\/chrismasterjohnphd\.com\/[^"]+)"/gi;
    const links = [...new Set([...html.matchAll(linkPattern)].map(m => m[1]))];

    const blogLinks = links.filter(l =>
      !l.includes("/category/") &&
      !l.includes("/tag/") &&
      !l.includes("/page/") &&
      l !== SOURCES.chris_masterjohn.url
    );

    for (const link of blogLinks.slice(0, limit)) {
      try {
        const artRes = await fetchWithRetry(link);
        if (!artRes.ok) continue;

        const artHtml = await artRes.text();

        const titleMatch = artHtml.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
        const title = titleMatch ? cleanHtml(titleMatch[1]) : "";

        const paragraphs = artHtml.match(/<p[^>]*>([\s\S]*?)<\/p>/gi);
        const content = paragraphs ? paragraphs.map(p => cleanHtml(p)).filter(p => p.length > 30).join("\n\n") : "";

        if (title && content.length > 500) {
          articles.push({
            source: "chris_masterjohn",
            title,
            content: content.substring(0, 50000),
            url: link,
            category: categorizeContent(title, content),
            keywords: extractKeywords(title, content),
            scrapedAt: new Date()
          });
          console.log(`[Scraper] ✓ Masterjohn: ${title.substring(0, 40)}...`);
        }

        await new Promise(r => setTimeout(r, 2000));
      } catch (e) {}

      if (articles.length >= limit) break;
    }
  } catch (error) {
    console.error("[Scraper] Chris Masterjohn failed:", error);
  }

  console.log(`[Scraper] ✓ Chris Masterjohn: ${articles.length} articles`);
  return articles;
}

// ============================================
// 8. RENAISSANCE PERIODIZATION - Training
// ============================================

export async function scrapeRP(limit: number = 15): Promise<ScrapedArticle[]> {
  console.log("[Scraper] Starting Renaissance Periodization...");
  const articles: ScrapedArticle[] = [];

  try {
    const response = await fetchWithRetry(`${SOURCES.renaissance_periodization.url}/blogs/articles`);
    const html = await response.text();

    // Shopify blog format
    const linkPattern = /href="(\/blogs\/articles\/[^"]+)"/gi;
    const paths = [...new Set([...html.matchAll(linkPattern)].map(m => m[1]))];

    for (const path of paths.slice(0, limit)) {
      const link = `${SOURCES.renaissance_periodization.url}${path}`;
      try {
        const artRes = await fetchWithRetry(link);
        if (!artRes.ok) continue;

        const artHtml = await artRes.text();

        const titleMatch = artHtml.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
        const title = titleMatch ? cleanHtml(titleMatch[1]) : "";

        const contentMatch = artHtml.match(/<div[^>]*class="[^"]*article[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/div>/i) ||
                            artHtml.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
        let content = contentMatch ? cleanHtml(contentMatch[1]) : "";

        if (!content || content.length < 500) {
          const paragraphs = artHtml.match(/<p[^>]*>([\s\S]*?)<\/p>/gi);
          if (paragraphs) {
            content = paragraphs.map(p => cleanHtml(p)).filter(p => p.length > 30).join("\n\n");
          }
        }

        if (title && content.length > 500) {
          articles.push({
            source: "renaissance_periodization",
            title,
            content: content.substring(0, 50000),
            url: link,
            category: categorizeContent(title, content),
            keywords: extractKeywords(title, content),
            scrapedAt: new Date()
          });
          console.log(`[Scraper] ✓ RP: ${title.substring(0, 40)}...`);
        }

        await new Promise(r => setTimeout(r, 1500));
      } catch (e) {}

      if (articles.length >= limit) break;
    }
  } catch (error) {
    console.error("[Scraper] RP failed:", error);
  }

  console.log(`[Scraper] ✓ RP: ${articles.length} articles`);
  return articles;
}

// ============================================
// 9. MORE PLATES MORE DATES - Hormones
// ============================================

export async function scrapeMPMD(limit: number = 15): Promise<ScrapedArticle[]> {
  console.log("[Scraper] Starting More Plates More Dates...");
  const articles: ScrapedArticle[] = [];

  try {
    const response = await fetchWithRetry(`${SOURCES.mpmd.url}/articles/`);
    const html = await response.text();

    const linkPattern = /href="(https:\/\/moreplatesmoredates\.com\/[^"]+)"/gi;
    const links = [...new Set([...html.matchAll(linkPattern)].map(m => m[1]))];

    const articleLinks = links.filter(l =>
      !l.includes("/articles/") &&
      !l.includes("/category/") &&
      !l.includes("/tag/") &&
      !l.includes("/page/") &&
      !l.includes("/shop/") &&
      !l.includes("/product/") &&
      l !== SOURCES.mpmd.url
    );

    for (const link of articleLinks.slice(0, limit)) {
      try {
        const artRes = await fetchWithRetry(link);
        if (!artRes.ok) continue;

        const artHtml = await artRes.text();

        const titleMatch = artHtml.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
        const title = titleMatch ? cleanHtml(titleMatch[1]) : "";

        const contentMatch = artHtml.match(/<div[^>]*class="[^"]*entry-content[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
        let content = contentMatch ? cleanHtml(contentMatch[1]) : "";

        if (!content || content.length < 500) {
          const paragraphs = artHtml.match(/<p[^>]*>([\s\S]*?)<\/p>/gi);
          if (paragraphs) {
            content = paragraphs.map(p => cleanHtml(p)).filter(p => p.length > 30).join("\n\n");
          }
        }

        if (title && content.length > 500) {
          articles.push({
            source: "mpmd",
            title,
            content: content.substring(0, 50000),
            url: link,
            category: categorizeContent(title, content),
            keywords: extractKeywords(title, content),
            scrapedAt: new Date()
          });
          console.log(`[Scraper] ✓ MPMD: ${title.substring(0, 40)}...`);
        }

        await new Promise(r => setTimeout(r, 1500));
      } catch (e) {}

      if (articles.length >= limit) break;
    }
  } catch (error) {
    console.error("[Scraper] MPMD failed:", error);
  }

  console.log(`[Scraper] ✓ MPMD: ${articles.length} articles`);
  return articles;
}

// ============================================
// 10. SENDPULSE NEWSLETTERS
// ============================================

export async function scrapeSendPulseNewsletters(limit: number = 20): Promise<ScrapedArticle[]> {
  console.log("[Scraper] Starting SendPulse newsletters...");
  const articles: ScrapedArticle[] = [];

  if (!SENDPULSE_CLIENT_ID || !SENDPULSE_SECRET) {
    console.log("[Scraper] ✗ SendPulse: no credentials configured");
    return articles;
  }

  try {
    // Get OAuth token
    const tokenRes = await fetch("https://api.sendpulse.com/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "client_credentials",
        client_id: SENDPULSE_CLIENT_ID,
        client_secret: SENDPULSE_SECRET
      })
    });

    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      console.log("[Scraper] ✗ SendPulse: failed to get token");
      return articles;
    }

    const token = tokenData.access_token;

    // Get campaigns
    const campaignsRes = await fetch("https://api.sendpulse.com/campaigns", {
      headers: { Authorization: `Bearer ${token}` }
    });

    const campaigns = await campaignsRes.json();
    console.log(`[Scraper] Found ${Array.isArray(campaigns) ? campaigns.length : 0} campaigns`);

    if (Array.isArray(campaigns)) {
      for (const camp of campaigns.slice(0, limit)) {
        try {
          const detailRes = await fetch(`https://api.sendpulse.com/campaigns/${camp.id}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const detail = await detailRes.json();

          const title = detail.message?.subject || camp.name || "Newsletter ACHZOD";
          const content = cleanHtml(detail.message?.body?.html || detail.message?.body?.text || "");

          if (content.length > 200) {
            articles.push({
              source: "newsletter",
              title,
              content: content.substring(0, 20000),
              url: `sendpulse://campaign/${camp.id}`,
              category: categorizeContent(title, content),
              keywords: extractKeywords(title, content),
              scrapedAt: new Date(camp.send_date || camp.created || Date.now())
            });
            console.log(`[Scraper] ✓ Newsletter: ${title.substring(0, 40)}...`);
          }

          await new Promise(r => setTimeout(r, 500));
        } catch (e) {}
      }
    }
  } catch (error) {
    console.error("[Scraper] SendPulse failed:", error);
  }

  console.log(`[Scraper] ✓ Newsletters: ${articles.length}`);
  return articles;
}

// ============================================
// MAIN FUNCTIONS
// ============================================

export type ScraperSource =
  | "huberman"
  | "sbs"
  | "applied_metabolics"
  | "newsletter"
  | "examine"
  | "peter_attia"
  | "marek_health"
  | "chris_masterjohn"
  | "renaissance_periodization"
  | "mpmd"
  | "all";

export async function scrapeSource(
  source: ScraperSource,
  limit: number = 15
): Promise<{ articles: ScrapedArticle[]; saved: number; duplicates: number }> {
  let articles: ScrapedArticle[] = [];

  const scrapers: Record<string, (limit: number) => Promise<ScrapedArticle[]>> = {
    huberman: scrapeHuberman,
    sbs: scrapeSBS,
    applied_metabolics: scrapeAppliedMetabolics,
    newsletter: scrapeSendPulseNewsletters,
    examine: scrapeExamine,
    peter_attia: scrapePeterAttia,
    marek_health: scrapeMarekHealth,
    chris_masterjohn: scrapeMasterjohn,
    renaissance_periodization: scrapeRP,
    mpmd: scrapeMPMD
  };

  if (source === "all") {
    for (const [name, scraper] of Object.entries(scrapers)) {
      console.log(`\n[Scraper] === ${name.toUpperCase()} ===`);
      try {
        const results = await scraper(limit);
        articles.push(...results);
      } catch (err) {
        console.error(`[Scraper] ${name} failed:`, err);
      }
      await new Promise(r => setTimeout(r, 3000));
    }
  } else if (scrapers[source]) {
    articles = await scrapers[source](limit);
  }

  const { saved, duplicates } = await saveArticles(articles);
  return { articles, saved, duplicates };
}

export async function buildKnowledgeBase(): Promise<{
  totalScraped: number;
  saved: number;
  duplicates: number;
  bySource: Record<string, number>;
}> {
  console.log("[Scraper] ========================================");
  console.log("[Scraper] Building COMPLETE knowledge base V3...");
  console.log("[Scraper] Sources: Huberman, SBS, AM, SendPulse, Examine, Attia, Marek, Masterjohn, RP, MPMD");
  console.log("[Scraper] ========================================");

  const { articles, saved, duplicates } = await scrapeSource("all", 15);

  const bySource: Record<string, number> = {};
  for (const art of articles) {
    bySource[art.source] = (bySource[art.source] || 0) + 1;
  }

  console.log("\n[Scraper] ========================================");
  console.log(`[Scraper] Build complete: ${saved} saved, ${duplicates} duplicates`);
  console.log("[Scraper] By source:", bySource);
  console.log("[Scraper] ========================================");

  return {
    totalScraped: articles.length,
    saved,
    duplicates,
    bySource
  };
}

export { SOURCES };
