/**
 * NEUROCORE 360 - Blog Import & Translation
 *
 * Objectif :
 * - Prendre une URL d'article (Ultrahuman, Predator Nutrition, TheMusclePhD, etc.)
 * - Récupérer le HTML complet (sans résumé type WebFetch)
 * - Extraire le corps de l'article en texte brut
 * - Le traduire 100% en français, sans résumé, en rebrandant l'auteur en ACHZOD
 * - Ajouter un CTA optionnel fourni côté requête
 *
 * Ce module est utilisé par un endpoint admin dans `routes.ts`.
 */

import OpenAI from "openai";
import { OPENAI_CONFIG } from "./openaiConfig";

export interface ScrapedBlogArticle {
  url: string;
  domain: string;
  title: string;
  content: string;
  wordCount: number;
}

export interface TranslatedBlogArticle {
  titleFr: string;
  contentFr: string;
}

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

function cleanHtmlToText(html: string): string {
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

function extractDomain(url: string): string {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return "unknown";
  }
}

function pickFirstMatch(html: string, patterns: RegExp[]): string | null {
  for (const pattern of patterns) {
    const m = html.match(pattern);
    if (m && m[1]) {
      const txt = cleanHtmlToText(m[1]);
      if (txt.length > 1000) {
        return txt;
      }
    }
  }
  return null;
}

/**
 * Extraction générique du corps d'un article à partir du HTML.
 * On priorise les structures fréquentes (article, entry-content, etc.),
 * puis on retombe sur tous les <p>.
 */
function extractArticleFromHtml(html: string): { title: string; content: string } {
  const h1 =
    html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] ??
    html.match(/<title>([^<]+)<\/title>/i)?.[1] ??
    "Article sans titre";

  const title = cleanHtmlToText(h1);

  const contentPatterns: RegExp[] = [
    /<article[^>]*>([\s\S]*?)<\/article>/i,
    /<div[^>]*class="[^"]*entry-content[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
    /<div[^>]*class="[^"]*post-content[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
    /<div[^>]*class="[^"]*article-content[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
    /<main[^>]*>([\s\S]*?)<\/main>/i,
  ];

  let content = pickFirstMatch(html, contentPatterns);

  if (!content) {
    const paragraphs = html.match(/<p[^>]*>([\s\S]*?)<\/p>/gi);
    if (paragraphs) {
      const texts = paragraphs
        .map((p) => cleanHtmlToText(p))
        .filter((p) => p.length > 80);
      content = texts.join("\n\n");
    }
  }

  if (!content) {
    content = cleanHtmlToText(html);
  }

  return { title, content };
}

export async function scrapeArticleFromUrl(url: string): Promise<ScrapedBlogArticle> {
  const domain = extractDomain(url);

  const response = await fetch(url, {
    headers: {
      "User-Agent": UA,
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
  });

  if (!response.ok) {
    throw new Error(`Echec du fetch (${response.status}) pour ${url}`);
  }

  const html = await response.text();
  const { title, content } = extractArticleFromHtml(html);
  const wordCount = content.split(/\s+/).filter(Boolean).length;

  if (wordCount < 300) {
    throw new Error(
      `Contenu trop court après extraction (${wordCount} mots). Vérifier l'URL ou adapter les patterns pour ${domain}.`
    );
  }

  return {
    url,
    domain,
    title,
    content,
    wordCount,
  };
}

// ====================== TRADUCTION OPENAI ======================

const openai = new OpenAI({
  apiKey: OPENAI_CONFIG.OPENAI_API_KEY,
});

const TRANSLATION_MODEL = OPENAI_CONFIG.OPENAI_MODEL || "gpt-4.1";

async function callOpenAITranslate(prompt: string): Promise<string> {
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const resp = await openai.chat.completions.create({
        model: TRANSLATION_MODEL,
        temperature: 0.4,
        max_tokens: 4000,
        messages: [
          {
            role: "system",
            content:
              "Tu es un traducteur expert FR. Tu traduis les articles mot à mot en conservant 100% des idées, sans résumé ni suppression de sections.",
          },
          { role: "user", content: prompt },
        ],
      });

      const text = resp.choices[0]?.message?.content || "";
      if (text.trim().length === 0) {
        throw new Error("Réponse vide d'OpenAI");
      }
      return text;
    } catch (err: any) {
      lastError = err;
      const status = err?.status ?? err?.response?.status;
      const isRetryable = status === 429 || (typeof status === "number" && status >= 500);
      if (!isRetryable || attempt === 3) {
        break;
      }
      const delay = 2000 * attempt + Math.floor(Math.random() * 500);
      await new Promise((r) => setTimeout(r, delay));
    }
  }

  throw lastError ?? new Error("Echec de la traduction OpenAI");
}

export async function translateArticleToFrench(params: {
  scraped: ScrapedBlogArticle;
  cta?: string;
}): Promise<TranslatedBlogArticle> {
  const { scraped, cta } = params;

  const basePromptLines: string[] = [
    "Contexte :",
    "- Tu reçois un article de blog en anglais, déjà nettoyé (titre + contenu).",
    "- Tu dois produire une version française complète, sans perte d'information.",
    "",
    "Contraintes STRICTES :",
    "1. Ne résume rien. Aucune phrase ni paragraphe important ne doit disparaître.",
    "2. Garde la structure : titres, intertitres, listes, paragraphes.",
    "3. Longueur en français ≥ 80% de la longueur de l'original (en nombre de mots approximatif).",
    "4. Supprime l'auteur, la date et le média d'origine. Ne mentionne pas la marque ou le site source.",
    '5. Considère que l\'article est signé par "ACHZOD" (mais ne l\'ajoute pas forcément dans le texte).',
  ];

  if (cta) {
    basePromptLines.push(
      "",
      "CTA :",
      "À la toute fin de l'article (après le dernier paragraphe), ajoute ce bloc CTA séparé par un séparateur `---`.",
      "Tu dois reprendre le CTA EXACTEMENT comme fourni, sans le résumer ni le reformuler.",
      "",
      "CTA_FOURNI :",
      cta
    );
  }

  basePromptLines.push(
    "",
    "Format de sortie :",
    "- Article complet en **markdown**.",
    "- Première ligne : `# Titre de l'article en français`.",
    "- Ensuite, le corps du texte structuré.",
    "- Ne renvoie aucun commentaire méta, uniquement le markdown final.",
    "",
    "ARTICLE ORIGINAL (ANGLAIS) :",
    `TITRE : ${scraped.title}`,
    "",
    scraped.content
  );

  const prompt = basePromptLines.join("\n");
  const contentFr = await callOpenAITranslate(prompt);

  const lines = contentFr.split("\n");
  const h1Line = lines.find((l) => l.trim().startsWith("# "));
  const titleFr = h1Line ? h1Line.replace(/^#\s+/, "").trim() : scraped.title;

  return {
    titleFr,
    contentFr,
  };
}

export function estimateReadTimeFromWords(wordCount: number): string {
  const minutes = Math.max(3, Math.round(wordCount / 200));
  return `${minutes} min`;
}

export function buildExcerpt(markdown: string, maxChars: number = 260): string {
  const text = markdown
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`[^`]*`/g, "")
    .replace(/#+\s+/g, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/\[(.*?)\]\([^)]+\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();

  if (text.length <= maxChars) return text;

  const cut = text.slice(0, maxChars);
  const lastSpace = cut.lastIndexOf(" ");
  const safe = lastSpace > 80 ? cut.slice(0, lastSpace) : cut;
  return `${safe}…`;
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "article";
}

