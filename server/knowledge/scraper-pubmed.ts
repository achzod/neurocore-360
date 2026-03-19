/**
 * NEUROCORE 360 - PubMed Blood Marker Scraper
 * Scrape systematic reviews & meta-analyses from PubMed for blood biomarkers
 *
 * Uses PubMed E-utilities API (free, no API key required for <3 req/sec)
 * https://www.ncbi.nlm.nih.gov/books/NBK25500/
 */

import { ScrapedArticle, saveArticles } from "./storage";

const PUBMED_BASE = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils";
const UA = "Neurocore360/1.0 (contact: support@achzod.com)";

// ============================================
// PUBMED SEARCH QUERIES BY BIOMARKER PANEL
// ============================================

export const PUBMED_QUERIES: Record<string, string[]> = {
  // Panel Hormonal
  hormonal: [
    "testosterone resistance exercise meta-analysis",
    "testosterone deficiency body composition systematic review",
    "cortisol overtraining athletes systematic review",
    "SHBG testosterone bioavailability",
    "estradiol male health systematic review",
    "IGF-1 muscle protein synthesis review",
    "DHEA-S aging performance review",
    "prolactin male hypogonadism",
  ],

  // Panel Thyroidien
  thyroid: [
    "subclinical hypothyroidism body composition meta-analysis",
    "T3 reverse thyroid caloric deficit",
    "thyroid function exercise performance review",
    "selenium iodine thyroid function meta-analysis",
    "TSH optimal range systematic review",
    "thyroid hormones metabolic rate meta-analysis",
  ],

  // Panel Metabolique
  metabolic: [
    "insulin resistance early detection biomarkers systematic review",
    "HOMA-IR metabolic syndrome meta-analysis",
    "HbA1c cardiovascular risk meta-analysis",
    "fasting insulin body fat percentage correlation",
    "berberine insulin sensitivity meta-analysis",
    "chromium insulin resistance meta-analysis",
    "intermittent fasting insulin sensitivity systematic review",
  ],

  // Panel Lipidique
  lipid: [
    "ApoB cardiovascular risk prediction meta-analysis",
    "lipoprotein(a) cardiovascular disease systematic review",
    "triglyceride HDL ratio insulin resistance",
    "LDL particle size atherosclerosis review",
    "omega-3 triglycerides meta-analysis",
    "exercise lipid profile improvement meta-analysis",
    "berberine lipid lowering meta-analysis",
  ],

  // Panel Inflammatoire
  inflammation: [
    "CRP exercise training systematic review",
    "homocysteine B vitamins methylation meta-analysis",
    "chronic inflammation body composition review",
    "omega-3 CRP reduction meta-analysis",
    "curcumin anti-inflammatory systematic review",
  ],

  // Panel Fer
  iron: [
    "iron deficiency athletes performance meta-analysis",
    "ferritin optimal range exercise performance",
    "iron supplementation VO2max meta-analysis",
    "ferritin thyroid function conversion T4 T3",
    "iron bisglycinate absorption meta-analysis",
  ],

  // Panel Micronutriments
  micronutrients: [
    "vitamin D muscle strength meta-analysis",
    "vitamin D testosterone systematic review",
    "magnesium exercise performance meta-analysis",
    "zinc testosterone immune function review",
    "B12 deficiency athletes systematic review",
    "folate MTHFR homocysteine review",
  ],

  // Panel Hepatique/Renal
  liver_kidney: [
    "ALT AST exercise muscle damage review",
    "creatinine bodybuilders muscle mass false positive",
    "high protein diet kidney function meta-analysis",
    "NAFLD exercise intervention meta-analysis",
    "NAC liver protection systematic review",
    "cystatin C vs creatinine athletes",
  ],

  // Composition corporelle & Performance
  performance: [
    "creatine monohydrate strength meta-analysis",
    "ashwagandha testosterone cortisol meta-analysis",
    "protein intake muscle hypertrophy meta-analysis",
    "resistance training hormonal response review",
    "sleep deprivation testosterone cortisol systematic review",
    "metabolic adaptation weight loss athletes systematic review",
    "body composition biomarkers athletic performance review",
  ],
};

// ============================================
// PUBMED API FUNCTIONS
// ============================================

interface PubMedArticle {
  pmid: string;
  title: string;
  abstract: string;
  authors: string;
  journal: string;
  year: string;
  doi: string;
}

/**
 * Search PubMed and return PMIDs
 */
async function searchPubMed(query: string, maxResults: number = 10): Promise<string[]> {
  const params = new URLSearchParams({
    db: "pubmed",
    term: query,
    retmax: String(maxResults),
    sort: "relevance",
    retmode: "json",
  });

  const response = await fetch(`${PUBMED_BASE}/esearch.fcgi?${params}`, {
    headers: { "User-Agent": UA },
  });

  if (!response.ok) {
    console.log(`[PubMed] Search failed for "${query}": ${response.status}`);
    return [];
  }

  const data = await response.json();
  return data.esearchresult?.idlist || [];
}

/**
 * Fetch article details by PMIDs
 */
async function fetchArticleDetails(pmids: string[]): Promise<PubMedArticle[]> {
  if (!pmids.length) return [];

  const params = new URLSearchParams({
    db: "pubmed",
    id: pmids.join(","),
    retmode: "xml",
    rettype: "abstract",
  });

  const response = await fetch(`${PUBMED_BASE}/efetch.fcgi?${params}`, {
    headers: { "User-Agent": UA },
  });

  if (!response.ok) {
    console.log(`[PubMed] Fetch failed: ${response.status}`);
    return [];
  }

  const xml = await response.text();
  return parsePubMedXml(xml);
}

/**
 * Parse PubMed XML response (simplified)
 */
function parsePubMedXml(xml: string): PubMedArticle[] {
  const articles: PubMedArticle[] = [];
  const articlePattern = /<PubmedArticle>([\s\S]*?)<\/PubmedArticle>/gi;
  const matches = [...xml.matchAll(articlePattern)];

  for (const match of matches) {
    const content = match[1];

    const pmidMatch = content.match(/<PMID[^>]*>(\d+)<\/PMID>/i);
    const titleMatch = content.match(/<ArticleTitle>([\s\S]*?)<\/ArticleTitle>/i);
    const abstractMatch = content.match(/<AbstractText[^>]*>([\s\S]*?)<\/AbstractText>/gi);
    const journalMatch = content.match(/<Title>([\s\S]*?)<\/Title>/i);
    const yearMatch = content.match(/<PubDate>\s*<Year>(\d{4})<\/Year>/i);
    const doiMatch = content.match(/<ArticleId IdType="doi">([\s\S]*?)<\/ArticleId>/i);

    // Extract authors
    const authorPattern = /<LastName>([\s\S]*?)<\/LastName>\s*<ForeName>([\s\S]*?)<\/ForeName>/gi;
    const authorMatches = [...content.matchAll(authorPattern)];
    const authors = authorMatches.slice(0, 3).map(a => `${a[1]} ${a[2]}`).join(", ");

    // Combine multiple abstract sections
    const abstractText = abstractMatch
      ? abstractMatch.map(a => {
          const labelMatch = a.match(/Label="([^"]+)"/i);
          const textContent = a.replace(/<[^>]+>/g, "").trim();
          return labelMatch ? `${labelMatch[1]}: ${textContent}` : textContent;
        }).join("\n\n")
      : "";

    if (pmidMatch && titleMatch && abstractText.length > 200) {
      articles.push({
        pmid: pmidMatch[1],
        title: titleMatch[1].replace(/<[^>]+>/g, "").trim(),
        abstract: abstractText,
        authors: authors || "Unknown",
        journal: journalMatch ? journalMatch[1].replace(/<[^>]+>/g, "").trim() : "Unknown",
        year: yearMatch ? yearMatch[1] : "Unknown",
        doi: doiMatch ? doiMatch[1].trim() : "",
      });
    }
  }

  return articles;
}

/**
 * Convert PubMed article to ScrapedArticle format
 */
function toScrapedArticle(article: PubMedArticle, category: string, keywords: string[]): ScrapedArticle {
  const content = `
${article.title}

AUTHORS: ${article.authors}
JOURNAL: ${article.journal} (${article.year})
PMID: ${article.pmid}
${article.doi ? `DOI: ${article.doi}` : ""}

ABSTRACT:
${article.abstract}
`.trim();

  return {
    source: "manual",
    title: `[PubMed] ${article.title}`,
    content,
    url: `https://pubmed.ncbi.nlm.nih.gov/${article.pmid}/`,
    category: "bloodwork",
    keywords: [...keywords, "pubmed", "evidence-based", category],
    scrapedAt: new Date(),
  };
}

// ============================================
// MAIN SCRAPER FUNCTION
// ============================================

/**
 * Scrape PubMed for blood marker-related systematic reviews
 */
export async function scrapePubMed(
  panels?: string[],
  maxPerQuery: number = 5
): Promise<ScrapedArticle[]> {
  console.log("[PubMed] Starting blood marker scrape...");
  const allArticles: ScrapedArticle[] = [];
  const seenPmids = new Set<string>();

  const panelsToScrape = panels || Object.keys(PUBMED_QUERIES);

  for (const panel of panelsToScrape) {
    const queries = PUBMED_QUERIES[panel];
    if (!queries) {
      console.log(`[PubMed] Unknown panel: ${panel}`);
      continue;
    }

    console.log(`\n[PubMed] === ${panel.toUpperCase()} (${queries.length} queries) ===`);

    for (const query of queries) {
      try {
        console.log(`[PubMed] Searching: "${query}"`);
        const pmids = await searchPubMed(query, maxPerQuery);

        if (pmids.length === 0) {
          console.log(`[PubMed] No results for: "${query}"`);
          continue;
        }

        // Filter already seen
        const newPmids = pmids.filter(id => !seenPmids.has(id));
        if (newPmids.length === 0) {
          console.log(`[PubMed] All duplicates for: "${query}"`);
          continue;
        }

        newPmids.forEach(id => seenPmids.add(id));

        const articles = await fetchArticleDetails(newPmids);
        console.log(`[PubMed] Fetched ${articles.length} articles for "${query.substring(0, 40)}..."`);

        // Extract keywords from query
        const queryKeywords = query.toLowerCase().split(/\s+/).filter(w => w.length > 3);

        for (const article of articles) {
          allArticles.push(toScrapedArticle(article, panel, queryKeywords));
        }

        // Rate limit: PubMed allows 3 requests/sec without API key
        await new Promise(r => setTimeout(r, 400));
      } catch (err) {
        console.error(`[PubMed] Error for query "${query}":`, err);
      }
    }
  }

  console.log(`\n[PubMed] Total articles scraped: ${allArticles.length}`);
  return allArticles;
}

/**
 * Scrape PubMed and save to knowledge base
 */
export async function scrapePubMedAndSave(
  panels?: string[],
  maxPerQuery: number = 5
): Promise<{ articles: ScrapedArticle[]; saved: number; duplicates: number }> {
  const articles = await scrapePubMed(panels, maxPerQuery);
  const { saved, duplicates } = await saveArticles(articles);

  console.log(`[PubMed] Saved: ${saved}, Duplicates: ${duplicates}`);
  return { articles, saved, duplicates };
}

// Run if called directly
if (require.main === module) {
  scrapePubMedAndSave()
    .then(result => {
      console.log(`\n=== PUBMED SCRAPE COMPLETE ===`);
      console.log(`Total: ${result.articles.length}, Saved: ${result.saved}, Duplicates: ${result.duplicates}`);
      process.exit(0);
    })
    .catch(err => {
      console.error("PubMed scrape failed:", err);
      process.exit(1);
    });
}
