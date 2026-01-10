/**
 * SYNC ALL BLOG ARTICLES - MASTER SCRIPT
 * 
 * Ce script:
 * 1. Scrape et traduit les 80 articles TheMusclePhD incomplets/partiels
 * 2. Complète les 16 articles Ultrahuman partiels depuis les JSON sources
 * 3. Génère les fichiers TypeScript finaux
 * 
 * Usage: OPENAI_API_KEY=sk-xxx npx tsx scripts/sync-all-blog-articles.ts
 */

import OpenAI from "openai";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============== CONFIG ==============
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const MUSCLEPHD_OUTPUT = path.join(__dirname, "../client/src/data/musclephdArticles.ts");
const ULTRAHUMAN_OUTPUT = path.join(__dirname, "../client/src/data/ultrahumanArticles.ts");
const ULTRAHUMAN_JSON_DIR = path.join(__dirname, "../data/ultrahuman-fr/");

const CTA_ACHZOD = `

---

[![Anabolic Code](https://cdn.prod.website-files.com/5fd0a9c447b7bb9814a00d71/6851ebc888d485c358317cfe_Ebook%20Anabolic%20Code%20Cover-min.jpg)](https://achzodcoaching.com)

**Découvre Anabolic Code** - Le guide complet sur l'optimisation hormonale et la transformation physique sur [achzodcoaching.com](https://achzodcoaching.com)`;

// Liste complète des URLs TheMusclePhD à scraper
const MUSCLEPHD_URLS = [
  // Articles de base du site
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
  "https://themusclephd.com/writing-your-own-program-part-1/",
  "https://themusclephd.com/writing-your-own-program-part-2/",
  "https://themusclephd.com/writing-your-own-program-part-3/",
  "https://themusclephd.com/writing-your-own-program-part-4/",
  // Articles additionnels
  "https://themusclephd.com/mind-muscle-connection/",
  "https://themusclephd.com/training-to-failure/",
  "https://themusclephd.com/what-causes-growth/",
  "https://themusclephd.com/eccentric-training/",
  "https://themusclephd.com/range-of-motion/",
  "https://themusclephd.com/bcaas-useful-or-useless/",
  "https://themusclephd.com/nutrient-timing/",
  "https://themusclephd.com/rep-ranges/",
  "https://themusclephd.com/rest-periods/",
  "https://themusclephd.com/training-frequency/",
  "https://themusclephd.com/volume/",
  "https://themusclephd.com/intensity/",
  "https://themusclephd.com/micronutrients/",
  "https://themusclephd.com/supplements-that-work/",
  "https://themusclephd.com/creatine/",
  "https://themusclephd.com/protein-intake/",
  "https://themusclephd.com/carbs-and-performance/",
  "https://themusclephd.com/fats-in-diet/",
  "https://themusclephd.com/sleep-and-gains/",
  "https://themusclephd.com/stress-and-training/",
  "https://themusclephd.com/warm-up/",
  "https://themusclephd.com/cool-down/",
  "https://themusclephd.com/stretching/",
  "https://themusclephd.com/foam-rolling/",
  "https://themusclephd.com/calf-training/",
  "https://themusclephd.com/arm-training/",
  "https://themusclephd.com/back-training/",
  "https://themusclephd.com/shoulder-training/",
  "https://themusclephd.com/leg-training/",
  "https://themusclephd.com/ab-training/",
  "https://themusclephd.com/compound-vs-isolation/",
  "https://themusclephd.com/free-weights-vs-machines/",
  "https://themusclephd.com/unilateral-training/",
  "https://themusclephd.com/partial-reps/",
  "https://themusclephd.com/isometrics/",
  "https://themusclephd.com/cluster-sets/",
  "https://themusclephd.com/supersets/",
  "https://themusclephd.com/giant-sets/",
  "https://themusclephd.com/pre-exhaust/",
  "https://themusclephd.com/post-workout-nutrition/",
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

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============== SCRAPER ==============

async function scrapeArticle(url: string): Promise<{ title: string; content: string; image: string } | null> {
  console.log(`  [SCRAPE] ${url}`);
  
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });

    if (!response.ok) {
      console.error(`  [SCRAPE] HTTP ${response.status}`);
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

    // Extract article content
    let content = "";
    const entryContentMatch = html.match(/<div[^>]*class="[^"]*entry-content[^"]*"[^>]*>([\s\S]*?)<\/div>\s*(?:<div class="(?:post-tags|related|comments)|<footer)/i);
    if (entryContentMatch) {
      content = entryContentMatch[1];
    } else {
      const articleMatch = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
      if (articleMatch) {
        content = articleMatch[1];
      }
    }

    // Clean HTML to text
    content = content
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, "")
      .replace(/<!--[\s\S]*?-->/g, "")
      .replace(/<nav[\s\S]*?<\/nav>/gi, "")
      .replace(/<footer[\s\S]*?<\/footer>/gi, "")
      .replace(/<aside[\s\S]*?<\/aside>/gi, "")
      .replace(/<form[\s\S]*?<\/form>/gi, "")
      .replace(/<div[^>]*class="[^"]*(?:share|social|related|crp_related)[^"]*"[\s\S]*?<\/div>/gi, "")
      .replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, "\n# $1\n")
      .replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, "\n## $1\n")
      .replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, "\n### $1\n")
      .replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, "\n#### $1\n")
      .replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, "\n$1\n")
      .replace(/<ul[^>]*>/gi, "\n")
      .replace(/<\/ul>/gi, "\n")
      .replace(/<ol[^>]*>/gi, "\n")
      .replace(/<\/ol>/gi, "\n")
      .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, "- $1\n")
      .replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi, "**$1**")
      .replace(/<b[^>]*>([\s\S]*?)<\/b>/gi, "**$1**")
      .replace(/<em[^>]*>([\s\S]*?)<\/em>/gi, "*$1*")
      .replace(/<i[^>]*>([\s\S]*?)<\/i>/gi, "*$1*")
      .replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, "\n> $1\n")
      .replace(/<[^>]+>/g, "")
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
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    if (content.length < 300) {
      console.warn(`  [SCRAPE] Content too short (${content.length} chars)`);
      return null;
    }

    console.log(`  [SCRAPE] OK: "${title.substring(0, 40)}..." (${content.length} chars)`);
    return { title, content, image };
  } catch (error: any) {
    console.error(`  [SCRAPE] Error: ${error.message}`);
    return null;
  }
}

// ============== TRANSLATOR ==============

async function translateToFrench(
  openai: OpenAI,
  title: string,
  content: string,
  retries = 3
): Promise<{ titleFr: string; contentFr: string } | null> {
  const prompt = `Tu es un traducteur expert en fitness et musculation.

MISSION: Traduire cet article EN ENTIER de l'anglais vers le français.

RÈGLES STRICTES:
1. Traduis 100% du contenu, CHAQUE paragraphe, CHAQUE phrase
2. NE RÉSUME PAS, NE COUPE PAS, NE SIMPLIFIE PAS
3. Garde la structure exacte (titres ##, listes -, paragraphes)
4. Utilise un français naturel et expert
5. Format Markdown

TITRE: ${title}

CONTENU:
${content}

RÉPONDS AVEC:
TITRE_FR: [titre traduit]
---
[contenu traduit complet]`;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4.1",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 8000,
        temperature: 0.3,
      });

      const result = response.choices[0]?.message?.content;
      if (!result || result.length < 500) {
        await sleep(2000);
        continue;
      }

      const titleMatch = result.match(/TITRE_FR:\s*(.+)/);
      const titleFr = titleMatch ? titleMatch[1].trim() : title;
      
      const contentStart = result.indexOf("---");
      const contentFr = contentStart > -1 
        ? result.substring(contentStart + 3).trim()
        : result.replace(/TITRE_FR:.*\n?/, "").trim();

      if (contentFr.length < content.length * 0.4) {
        await sleep(2000);
        continue;
      }

      return { titleFr, contentFr };
    } catch (error: any) {
      console.error(`  [TRANSLATE] Error: ${error.message}`);
      if (attempt < retries) await sleep(3000 * attempt);
    }
  }
  return null;
}

// ============== ARTICLE INTERFACES ==============

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
  featured?: boolean;
  content: string;
}

// ============== PROCESS MUSCLEPHD ==============

async function processMusclePHD(openai: OpenAI): Promise<Article[]> {
  console.log("\n" + "=".repeat(60));
  console.log("PROCESSING MUSCLEPHD ARTICLES");
  console.log("=".repeat(60));

  const articles: Article[] = [];
  const processedUrls = new Set<string>();

  for (let i = 0; i < MUSCLEPHD_URLS.length; i++) {
    const url = MUSCLEPHD_URLS[i];
    
    // Skip duplicates
    if (processedUrls.has(url)) continue;
    processedUrls.add(url);

    console.log(`\n[${i + 1}/${MUSCLEPHD_URLS.length}] ${url}`);

    // Scrape
    const scraped = await scrapeArticle(url);
    if (!scraped) {
      console.log("  [SKIP] Could not scrape");
      continue;
    }

    // Translate
    console.log("  [TRANSLATE] Starting...");
    const translated = await translateToFrench(openai, scraped.title, scraped.content);
    if (!translated) {
      console.log("  [SKIP] Could not translate");
      continue;
    }

    // Build article
    const wordCount = translated.contentFr.split(/\s+/).length;
    const excerpt = translated.contentFr
      .replace(/^#.*\n/gm, "")
      .replace(/\*\*/g, "")
      .substring(0, 180)
      .trim() + "...";

    const article: Article = {
      id: `mphd-${articles.length + 1}`,
      slug: slugify(translated.titleFr),
      title: translated.titleFr,
      excerpt,
      category: "musculation",
      author: "ACHZOD",
      date: new Date().toISOString().split("T")[0],
      readTime: estimateReadTime(wordCount),
      image: scraped.image,
      content: translated.contentFr,
    };

    articles.push(article);
    console.log(`  [OK] ${article.title} (${wordCount} mots, ${article.readTime})`);

    // Rate limit
    await sleep(1500);
  }

  return articles;
}

// ============== PROCESS ULTRAHUMAN ==============

async function processUltrahuman(): Promise<Article[]> {
  console.log("\n" + "=".repeat(60));
  console.log("PROCESSING ULTRAHUMAN ARTICLES FROM JSON");
  console.log("=".repeat(60));

  const articles: Article[] = [];
  
  if (!fs.existsSync(ULTRAHUMAN_JSON_DIR)) {
    console.log("  [SKIP] No ultrahuman-fr JSON directory");
    return articles;
  }

  const jsonFiles = fs.readdirSync(ULTRAHUMAN_JSON_DIR).filter(f => f.endsWith(".json"));
  console.log(`  Found ${jsonFiles.length} JSON files`);

  for (let i = 0; i < jsonFiles.length; i++) {
    const file = jsonFiles[i];
    console.log(`\n[${i + 1}/${jsonFiles.length}] ${file}`);

    try {
      const data = JSON.parse(fs.readFileSync(path.join(ULTRAHUMAN_JSON_DIR, file), "utf-8"));
      
      const wordCount = (data.content || "").split(/\s+/).length;
      const excerpt = (data.excerpt || data.content?.substring(0, 180) || "") + "...";

      const article: Article = {
        id: `uh-${i + 1}`,
        slug: data.slug || slugify(data.title || file.replace(".json", "")),
        title: data.title || file.replace(".json", "").replace(/-/g, " "),
        excerpt: excerpt.substring(0, 200),
        category: data.category || "sante",
        author: "ACHZOD",
        date: data.date || new Date().toISOString().split("T")[0],
        readTime: estimateReadTime(wordCount),
        image: data.image || "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800",
        featured: data.featured || false,
        content: data.content || "",
      };

      articles.push(article);
      console.log(`  [OK] ${article.title} (${wordCount} mots)`);
    } catch (error: any) {
      console.error(`  [ERROR] ${error.message}`);
    }
  }

  return articles;
}

// ============== GENERATE OUTPUT FILES ==============

function generateMusclePHDFile(articles: Article[]): void {
  console.log("\n" + "=".repeat(60));
  console.log("GENERATING MUSCLEPHD OUTPUT FILE");
  console.log("=".repeat(60));

  const ctaBlock = `const CTA_IMAGE = \`${CTA_ACHZOD}\`;`;

  let content = `// TheMusclePhD Articles - Translated by ACHZOD
// Auto-generated on ${new Date().toISOString()}
// Source: https://themusclephd.com/

import type { BlogArticle } from "./blogArticles";

${ctaBlock}

export const MUSCLEPHD_ARTICLES: BlogArticle[] = [
`;

  for (const article of articles) {
    const escapedContent = article.content
      .replace(/\\/g, "\\\\")
      .replace(/`/g, "\\`")
      .replace(/\$/g, "\\$");

    content += `  {
    id: "${article.id}",
    slug: "${article.slug}",
    title: "${article.title.replace(/"/g, '\\"')}",
    excerpt: "${article.excerpt.replace(/"/g, '\\"')}",
    category: "${article.category}",
    author: "${article.author}",
    date: "${article.date}",
    readTime: "${article.readTime}",
    image: "${article.image}",
    content: \`${escapedContent}\` + CTA_IMAGE
  },
`;
  }

  content += `];
`;

  fs.writeFileSync(MUSCLEPHD_OUTPUT, content, "utf-8");
  console.log(`  Written: ${MUSCLEPHD_OUTPUT}`);
  console.log(`  Articles: ${articles.length}`);
}

function generateUltrahumanFile(articles: Article[]): void {
  console.log("\n" + "=".repeat(60));
  console.log("GENERATING ULTRAHUMAN OUTPUT FILE");
  console.log("=".repeat(60));

  const ctaBlock = `

---

[![Anabolic Code](https://cdn.prod.website-files.com/5fd0a9c447b7bb9814a00d71/6851ebc888d485c358317cfe_Ebook%20Anabolic%20Code%20Cover-min.jpg)](https://achzodcoaching.com)

**Decouvrez Anabolic Code** - Le guide complet sur l'optimisation hormonale sur [achzodcoaching.com](https://achzodcoaching.com)`;

  let content = `// Ultrahuman French blog articles
// Auto-generated on ${new Date().toISOString()}
// Source: data/ultrahuman-fr/

import type { BlogArticle } from "./blogArticles";

export const ULTRAHUMAN_ARTICLES: BlogArticle[] = [
`;

  for (const article of articles) {
    const escapedContent = (article.content + ctaBlock)
      .replace(/\\/g, "\\\\")
      .replace(/`/g, "\\`")
      .replace(/\$/g, "\\$");

    content += `  {
    id: "${article.id}",
    slug: "${article.slug}",
    title: "${article.title.replace(/"/g, '\\"')}",
    excerpt: "${article.excerpt.replace(/"/g, '\\"')}",
    content: \`${escapedContent}\`,
    category: "${article.category}",
    author: "${article.author}",
    date: "${article.date}",
    readTime: "${article.readTime}",
    image: "${article.image}",
    featured: ${article.featured || false},
  },
`;
  }

  content += `];
`;

  fs.writeFileSync(ULTRAHUMAN_OUTPUT, content, "utf-8");
  console.log(`  Written: ${ULTRAHUMAN_OUTPUT}`);
  console.log(`  Articles: ${articles.length}`);
}

// ============== MAIN ==============

async function main() {
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║     SYNC ALL BLOG ARTICLES - MASTER SCRIPT                 ║");
  console.log("║     TheMusclePhD + Ultrahuman → FR + ACHZOD + CTA          ║");
  console.log("╚════════════════════════════════════════════════════════════╝");

  if (!OPENAI_API_KEY) {
    console.error("\n❌ ERROR: OPENAI_API_KEY is required");
    console.error("Usage: OPENAI_API_KEY=sk-xxx npx tsx scripts/sync-all-blog-articles.ts");
    process.exit(1);
  }

  const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

  // 1. Process MusclePhD (scrape + translate)
  const mphdArticles = await processMusclePHD(openai);
  
  // 2. Process Ultrahuman (from JSON)
  const uhArticles = await processUltrahuman();

  // 3. Generate output files
  if (mphdArticles.length > 0) {
    generateMusclePHDFile(mphdArticles);
  }
  
  if (uhArticles.length > 0) {
    generateUltrahumanFile(uhArticles);
  }

  // Summary
  console.log("\n" + "═".repeat(60));
  console.log("SUMMARY");
  console.log("═".repeat(60));
  console.log(`MusclePhD articles: ${mphdArticles.length}`);
  console.log(`Ultrahuman articles: ${uhArticles.length}`);
  console.log(`Total: ${mphdArticles.length + uhArticles.length}`);
  console.log("\n✅ DONE!");
}

main().catch(console.error);
