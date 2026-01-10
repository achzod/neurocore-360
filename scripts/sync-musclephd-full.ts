/**
 * SYNC MUSCLEPHD ARTICLES - FULL SCRAPE + TRANSLATE + REBRAND
 * 
 * Ce script:
 * 1. Scrape tous les articles TheMusclePhD
 * 2. Traduit 100% du contenu en français via OpenAI
 * 3. Rebrand avec auteur ACHZOD
 * 4. Ajoute CTA vers achzodcoaching.com
 * 5. Génère le fichier TypeScript final
 * 
 * Usage: OPENAI_API_KEY=sk-xxx npx tsx scripts/sync-musclephd-full.ts
 */

import OpenAI from "openai";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============== CONFIG ==============
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const OUTPUT_FILE = path.join(__dirname, "../client/src/data/musclephdArticles.ts");

const CTA_BLOCK = `

---

[![Anabolic Code](https://cdn.prod.website-files.com/5fd0a9c447b7bb9814a00d71/6851ebc888d485c358317cfe_Ebook%20Anabolic%20Code%20Cover-min.jpg)](https://achzodcoaching.com)

**Découvre Anabolic Code** - Le guide complet sur l'optimisation hormonale et la transformation physique sur [achzodcoaching.com](https://achzodcoaching.com)`;

const MUSCLEPHD_URLS = [
  "https://themusclephd.com/a-motivation-secret/",
  "https://themusclephd.com/a-tale-of-three-bodybuilders/",
  "https://themusclephd.com/accommodating-resistance-2/",
  "https://themusclephd.com/are-deadlifts-dangerous/",
  "https://themusclephd.com/beast-mode/",
  "https://themusclephd.com/biomechanics-and-growth/",
  "https://themusclephd.com/body-recomposition/",
  "https://themusclephd.com/bodybuilding-mishaps/",
  "https://themusclephd.com/bodybuilding-vs-powerlifting/",
  "https://themusclephd.com/calories-and-energy-balance/",
  "https://themusclephd.com/chest-training-101/",
  "https://themusclephd.com/cns-fatigue/",
  "https://themusclephd.com/deadlifts-on-back-day/",
  "https://themusclephd.com/deloads-2/",
  "https://themusclephd.com/does-size-strength/",
  "https://themusclephd.com/exercise-variation/",
  "https://themusclephd.com/gender-differences-in-training-2/",
  "https://themusclephd.com/gender-differences-in-training/",
  "https://themusclephd.com/genetic-potential/",
  "https://themusclephd.com/hormesis/",
  "https://themusclephd.com/hydration-2/",
  "https://themusclephd.com/meal-frequency/",
  "https://themusclephd.com/muscle-memory/",
  "https://themusclephd.com/muscle-science-for-gearheads/",
  "https://themusclephd.com/nutrition-inconvenience/",
  "https://themusclephd.com/periodization-in-bodybuilding/",
  "https://themusclephd.com/plant-vs-animal-protein/",
  "https://themusclephd.com/progressive-overload/",
  "https://themusclephd.com/quantifying-mechanical-tension/",
  "https://themusclephd.com/the-3-rule/",
  "https://themusclephd.com/the-lunchbox/",
  "https://themusclephd.com/time-under-tension-2/",
  "https://themusclephd.com/time-under-tension/",
  "https://themusclephd.com/training-at-home/",
  "https://themusclephd.com/what-id-do-differently/",
  "https://themusclephd.com/what-is-broscience/",
  "https://themusclephd.com/working-out-with-masks/",
  "https://themusclephd.com/writing-your-own-program-part-2/",
  "https://themusclephd.com/writing-your-own-program-part-3/",
  "https://themusclephd.com/writing-your-own-program-part-4/",
];

// ============== HELPERS ==============

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 60);
}

function estimateReadTime(wordCount: number): string {
  const minutes = Math.max(3, Math.ceil(wordCount / 200));
  return `${minutes} min`;
}

function extractSlugFromUrl(url: string): string {
  const match = url.match(/themusclephd\.com\/([^\/]+)\/?$/);
  return match ? match[1] : "article";
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============== SCRAPER ==============

async function scrapeArticle(url: string): Promise<{ title: string; content: string; image: string } | null> {
  console.log(`[SCRAPE] ${url}`);
  
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });

    if (!response.ok) {
      console.error(`[SCRAPE] HTTP ${response.status} for ${url}`);
      return null;
    }

    const html = await response.text();

    // Extract title
    const titleMatch = html.match(/<h1[^>]*class="[^"]*entry-title[^"]*"[^>]*>([^<]+)<\/h1>/i) ||
                       html.match(/<title>([^<|]+)/i) ||
                       html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
    const title = titleMatch ? titleMatch[1].trim().replace(/\s*[-–|].*$/, "") : "Article";

    // Extract featured image
    const imageMatch = html.match(/og:image[^>]*content="([^"]+)"/i) ||
                       html.match(/<img[^>]*class="[^"]*wp-post-image[^"]*"[^>]*src="([^"]+)"/i);
    const image = imageMatch ? imageMatch[1] : "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800";

    // Extract article content - multiple selectors
    let content = "";
    
    // Try entry-content first
    const entryContentMatch = html.match(/<div[^>]*class="[^"]*entry-content[^"]*"[^>]*>([\s\S]*?)<\/div>\s*(?:<div class="(?:post-tags|related|comments)|<footer)/i);
    if (entryContentMatch) {
      content = entryContentMatch[1];
    } else {
      // Try article tag
      const articleMatch = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
      if (articleMatch) {
        content = articleMatch[1];
      }
    }

    // Clean HTML
    content = content
      // Remove scripts and styles
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, "")
      // Remove comments
      .replace(/<!--[\s\S]*?-->/g, "")
      // Remove nav, footer, aside, forms
      .replace(/<nav[\s\S]*?<\/nav>/gi, "")
      .replace(/<footer[\s\S]*?<\/footer>/gi, "")
      .replace(/<aside[\s\S]*?<\/aside>/gi, "")
      .replace(/<form[\s\S]*?<\/form>/gi, "")
      // Remove social shares and related posts
      .replace(/<div[^>]*class="[^"]*(?:share|social|related|crp_related)[^"]*"[\s\S]*?<\/div>/gi, "")
      // Convert headers
      .replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, "\n# $1\n")
      .replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, "\n## $1\n")
      .replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, "\n### $1\n")
      .replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, "\n#### $1\n")
      // Convert paragraphs
      .replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, "\n$1\n")
      // Convert lists
      .replace(/<ul[^>]*>/gi, "\n")
      .replace(/<\/ul>/gi, "\n")
      .replace(/<ol[^>]*>/gi, "\n")
      .replace(/<\/ol>/gi, "\n")
      .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, "- $1\n")
      // Convert emphasis
      .replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi, "**$1**")
      .replace(/<b[^>]*>([\s\S]*?)<\/b>/gi, "**$1**")
      .replace(/<em[^>]*>([\s\S]*?)<\/em>/gi, "*$1*")
      .replace(/<i[^>]*>([\s\S]*?)<\/i>/gi, "*$1*")
      // Convert blockquotes
      .replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, "\n> $1\n")
      // Remove remaining HTML tags
      .replace(/<[^>]+>/g, "")
      // Decode HTML entities
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#8217;/g, "'")
      .replace(/&#8220;/g, '"')
      .replace(/&#8221;/g, '"')
      .replace(/&#8211;/g, "–")
      .replace(/&#8212;/g, "—")
      // Clean up whitespace
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    if (content.length < 500) {
      console.warn(`[SCRAPE] Short content (${content.length} chars) for ${url}`);
    }

    console.log(`[SCRAPE] OK: "${title}" (${content.length} chars)`);
    return { title, content, image };
  } catch (error) {
    console.error(`[SCRAPE] Error for ${url}:`, error);
    return null;
  }
}

// ============== TRANSLATOR ==============

async function translateArticle(
  openai: OpenAI,
  title: string,
  content: string,
  retries = 3
): Promise<{ titleFr: string; contentFr: string } | null> {
  const prompt = `Tu es un traducteur expert en fitness et musculation.

MISSION: Traduire cet article EN ENTIER de l'anglais vers le français.

RÈGLES STRICTES:
1. Traduis 100% du contenu, CHAQUE paragraphe, CHAQUE phrase, CHAQUE mot
2. NE RÉSUME PAS, NE COUPE PAS, NE SIMPLIFIE PAS
3. Garde la structure exacte (titres, sous-titres, listes, paragraphes)
4. Utilise un français naturel et fluide
5. Garde les termes techniques anglais entre parenthèses si nécessaire (ex: "surcharge progressive (progressive overload)")
6. Le texte doit être formaté en Markdown

TITRE ORIGINAL:
${title}

CONTENU ORIGINAL:
${content}

RÉPONDS AVEC CE FORMAT EXACT:
TITRE_FR: [titre traduit]
---
[contenu traduit complet en markdown]`;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`[TRANSLATE] Attempt ${attempt}/${retries} for "${title.substring(0, 40)}..."`);
      
      const response = await openai.chat.completions.create({
        model: "gpt-4.1",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 8000,
        temperature: 0.3,
      });

      const result = response.choices[0]?.message?.content;
      if (!result) {
        console.warn(`[TRANSLATE] Empty response, retrying...`);
        await sleep(2000);
        continue;
      }

      // Parse response
      const titleMatch = result.match(/TITRE_FR:\s*(.+)/);
      const titleFr = titleMatch ? titleMatch[1].trim() : title;
      
      const contentStart = result.indexOf("---");
      const contentFr = contentStart > -1 
        ? result.substring(contentStart + 3).trim()
        : result.replace(/TITRE_FR:.*\n?/, "").trim();

      if (contentFr.length < content.length * 0.5) {
        console.warn(`[TRANSLATE] Content seems truncated (${contentFr.length} vs ${content.length}), retrying...`);
        await sleep(2000);
        continue;
      }

      console.log(`[TRANSLATE] OK: "${titleFr.substring(0, 40)}..." (${contentFr.length} chars)`);
      return { titleFr, contentFr };
    } catch (error: any) {
      console.error(`[TRANSLATE] Error:`, error.message);
      if (attempt < retries) {
        await sleep(3000 * attempt);
      }
    }
  }

  return null;
}

// ============== MAIN ==============

interface Article {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  author: string;
  date: string;
  readTime: string;
  image: string;
  content: string;
}

async function main() {
  console.log("=".repeat(60));
  console.log("SYNC MUSCLEPHD ARTICLES - FULL PIPELINE");
  console.log("=".repeat(60));

  if (!OPENAI_API_KEY) {
    console.error("ERROR: OPENAI_API_KEY is required");
    console.error("Usage: OPENAI_API_KEY=sk-xxx npx tsx scripts/sync-musclephd-full.ts");
    process.exit(1);
  }

  const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
  const articles: Article[] = [];
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < MUSCLEPHD_URLS.length; i++) {
    const url = MUSCLEPHD_URLS[i];
    const slugEn = extractSlugFromUrl(url);
    
    console.log(`\n[${i + 1}/${MUSCLEPHD_URLS.length}] Processing: ${slugEn}`);
    console.log("-".repeat(50));

    // 1. Scrape
    const scraped = await scrapeArticle(url);
    if (!scraped) {
      console.error(`[FAIL] Could not scrape ${url}`);
      failCount++;
      continue;
    }

    // 2. Translate
    const translated = await translateArticle(openai, scraped.title, scraped.content);
    if (!translated) {
      console.error(`[FAIL] Could not translate ${url}`);
      failCount++;
      continue;
    }

    // 3. Build article object
    const wordCount = translated.contentFr.split(/\s+/).length;
    const excerpt = translated.contentFr
      .replace(/^#.*\n/gm, "")
      .replace(/\*\*/g, "")
      .substring(0, 200)
      .trim() + "...";

    const article: Article = {
      id: `mphd-${i + 1}`,
      slug: slugify(translated.titleFr),
      title: translated.titleFr,
      excerpt,
      category: "musculation",
      author: "ACHZOD",
      date: new Date().toISOString().split("T")[0],
      readTime: estimateReadTime(wordCount),
      image: scraped.image,
      content: translated.contentFr + CTA_BLOCK,
    };

    articles.push(article);
    successCount++;
    console.log(`[SUCCESS] ${article.title} (${article.readTime})`);

    // Rate limit
    await sleep(1500);
  }

  // 4. Generate TypeScript file
  console.log("\n" + "=".repeat(60));
  console.log("GENERATING OUTPUT FILE");
  console.log("=".repeat(60));

  const tsContent = `// TheMusclePhD Articles - Translated by ACHZOD
// Auto-generated on ${new Date().toISOString()}
// Source: https://themusclephd.com/

import type { BlogArticle } from "./blogArticles";

export const MUSCLEPHD_ARTICLES: BlogArticle[] = ${JSON.stringify(articles, null, 2)
  .replace(/"content": "/g, 'content: `')
  .replace(/",\n    "category"/g, '`,\n    category')
  .replace(/\\n/g, '\n')};
`;

  fs.writeFileSync(OUTPUT_FILE, tsContent, "utf-8");

  console.log(`\nOutput: ${OUTPUT_FILE}`);
  console.log(`Success: ${successCount}/${MUSCLEPHD_URLS.length}`);
  console.log(`Failed: ${failCount}/${MUSCLEPHD_URLS.length}`);
  console.log("\nDONE!");
}

main().catch(console.error);
