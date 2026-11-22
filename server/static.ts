import express, { type Express, type Response } from "express";
import fs from "fs";
import path from "path";
import { marked } from "marked";
import {
  BLOG_ARTICLE_REDIRECTS,
  BLOG_INDEXATION_PRIORITY_SLUGS,
} from "../client/src/data/blogSeo";
import { PEPTIDES_OFFER_FAQ } from "../shared/peptidesOfferFaq";
import { isNoindexPath } from "../shared/indexingRules";
import { INTERACTIVE_FLOW_CACHE_CONTROL, resolveSsrCacheControl } from "./cachePolicy";

const BASE_URL = "https://apexlabs.achzodcoaching.com";
const DEFAULT_OG_IMAGE = `${BASE_URL}/og-default.png`;

// marked: GFM + breaks. Output is injected into a server-side <noscript>
// block consumed by Googlebot, so we render trusted in-repo markdown only.
marked.setOptions({ gfm: true, breaks: true });

interface BlogArticle {
  slug: string;
  title: string;
  seoTitle?: string;
  excerpt: string;
  metaDescription?: string;
  content?: string;
  image?: string;
  imageUrl?: string;
  author: string;
  date: string;
  category: string;
  readTime?: string;
}

type BlogIntent = "discovery" | "anabolic" | "blood" | "ultimate" | "formcheck" | "peptides" | "coaching";

type BlogIntentCta = {
  intent: BlogIntent;
  title: string;
  body: string;
  href: string;
  label: string;
};

type BlogPillar = {
  slug: string;
  label: string;
  title: string;
  description: string;
  offerHref: string;
  offerLabel: string;
  keywords: RegExp;
};

// Escape HTML entities for safe injection
function esc(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Render an article's markdown body to an HTML block. Injected verbatim into
// a server-side <noscript> region so Googlebot sees the full prose, headings,
// lists and in-article links. Fixes "crawled but not indexed" caused by the
// React SPA shell that ships an empty <div id="root"></div> to crawlers.
function renderArticleBodyHtml(content: string | undefined, articleTitle?: string): string {
  if (!content) return "";
  try {
    let markdown = content;
    if (articleTitle) {
      const escapedTitle = articleTitle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      markdown = markdown.replace(new RegExp(`^\\s*#\\s+${escapedTitle}\\s*\\n+`, "i"), "");
    }
    const html = marked.parse(markdown, { async: false }) as string;
    return html
      .replace(/^\s*<h1\b[\s\S]*?<\/h1>\s*/i, "")
      // Affiliate links (iHerb referral) are flagged as sponsored for crawlers.
      .replace(
        /<a href="(https?:\/\/(?:[a-z0-9-]+\.)*iherb\.com\/[^"]*)"/gi,
        '<a href="$1" rel="sponsored nofollow noopener noreferrer"',
      );
  } catch {
    return `<p>${esc(content).slice(0, 2000)}</p>`;
  }
}

// Strip common markdown so extracted snippets read as plain prose.
function stripMarkdown(input: string): string {
  return input
    .replace(/```[\s\S]*?```/g, " ")           // code blocks
    .replace(/`([^`]+)`/g, "$1")                 // inline code
    .replace(/!\[[^\]]*\]\([^)]+\)/g, " ")       // images
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")     // links -> text
    .replace(/^#{1,6}\s+/gm, "")                  // headings
    .replace(/\*\*([^*]+)\*\*/g, "$1")          // bold
    .replace(/\*([^*]+)\*/g, "$1")                // italic
    .replace(/^>\s+/gm, "")                       // blockquotes
    .replace(/^[-*+]\s+/gm, "")                  // bullet markers
    .replace(/^\s*\d+\.\s+/gm, "")               // numbered list markers
    .replace(/\|/g, " ")                          // table pipes
    .replace(/-{3,}/g, " ")                       // hr
    .replace(/\s+/g, " ")
    .trim();
}

// Extract a clean, click-worthy meta description from article content.
// Strategy: walk first non-trivial paragraphs until we have ~145-160 chars
// ending on sentence boundary. Falls back to excerpt when content is missing.
function buildMetaDescription(article: BlogArticle): string {
  const target = 155;
  const floor = 80;
  const escapedTitle = article.title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const cleanLead = (value: string): string => stripMarkdown(value)
    .replace(new RegExp(`^${escapedTitle}\\s*(?:[-:–—]\\s*)?`, "i"), "")
    .replace(/^introduction\s*:\s*/i, "")
    .trim();

  const shorten = (source: string): string => {
    if (source.length <= target) return source;
    const slice = source.slice(0, target);
    const lastSentence = Math.max(
      slice.lastIndexOf(". "),
      slice.lastIndexOf("? "),
      slice.lastIndexOf("! "),
    );
    if (lastSentence >= floor) return slice.slice(0, lastSentence + 1);
    const lastSpace = slice.lastIndexOf(" ", target - 1);
    if (lastSpace >= floor) return `${slice.slice(0, lastSpace)}…`;
    return `${slice.slice(0, target - 1)}…`;
  };

  const explicit = cleanLead(article.metaDescription || "");
  if (explicit) return shorten(explicit);

  const excerpt = cleanLead(article.excerpt || "");
  const content = cleanLead(article.content || "");
  // Prefer the authored excerpt. Imported markdown occasionally contains a
  // truncated duplicate H1, which otherwise becomes a low-quality SERP meta.
  const source = excerpt || content;
  return source ? shorten(source) : "";
}

function encodePathSegment(value: string): string {
  return encodeURIComponent(value).replace(/%2F/gi, "/");
}

function normalizeRequestPath(value: string): string {
  const pathOnly = value.split("?")[0].split("#")[0] || "/";
  if (pathOnly.length > 1 && pathOnly.endsWith("/")) return pathOnly.slice(0, -1);
  return pathOnly;
}

function normalizeBlogCategory(category: string | undefined): string {
  if (!category) return "fitness";
  // Legacy import created one orphan `peptides` category. Keep the article in
  // the closest real pillar so sitemap/category pages do not create a dead hub.
  if (category === "peptides") return "nutrition";
  return category;
}

function getBlogIntentCta(article: BlogArticle): BlogIntentCta {
  if (article.slug === "retatrutide-ce-quon-sait-vraiment-2026") {
    return {
      intent: "peptides",
      title: "Avant de penser rétatrutide, fais le point sur ton contexte.",
      body:
        "Le Pré-Peptides Engine gratuit cadre ton objectif, ton contexte et les points de vigilance à aborder avec ton médecin, sans dosage ni promesse.",
      href: `${BASE_URL}/peptides-preview`,
      label: "Lancer mon Pré-Peptides gratuit",
    };
  }

  if (article.slug === "meilleurs-peptides-performance-sportive") {
    return {
      intent: "peptides",
      title: "Quel protocole peptides correspond vraiment à ton profil ?",
      body:
        "Le Pre-Peptides Engine gratuit cadre d'abord ton objectif, ton contexte et ton budget avant l'analyse complète.",
      href: `${BASE_URL}/peptides-preview`,
      label: "Lancer mon Pre-Peptides gratuit",
    };
  }

  if (article.slug === "pct-sarms-protocole-complet") {
    return {
      intent: "blood",
      title: "Tu as les résultats : transforme-les en priorités lisibles.",
      body:
        "Blood Analysis structure la lecture des marqueurs autour de la récupération, du profil hormonal, des lipides et du foie.",
      href: `${BASE_URL}/offers/blood-analysis`,
      label: "Analyser mon bilan post-cycle",
    };
  }

  if (article.slug === "rad-140-testolone-guide-complet") {
    return {
      intent: "blood",
      title: "Un cycle ne se pilote pas uniquement au ressenti.",
      body:
        "Blood Analysis organise les marqueurs disponibles pour repérer les priorités de suivi avant de conclure sur la récupération.",
      href: `${BASE_URL}/offers/blood-analysis`,
      label: "Faire lire mes marqueurs",
    };
  }

  const category = normalizeBlogCategory(article.category);
  const text = `${category} ${article.title} ${article.excerpt}`.toLowerCase();

  if (category === "sarms" || /peptide|sarm|mk-677|rad-140|lgd|ostarine|pct/.test(text)) {
    return {
      intent: "peptides",
      title: "Avant de toucher aux peptides, cadre le protocole et le monitoring.",
      body:
        "Peptides Engine aide à relier objectif, contexte, risques, bilan sanguin, timing et cohérence du protocole avant toute décision.",
      href: `${BASE_URL}/offers/peptides-engine`,
      label: "Voir Peptides Engine",
    };
  }

  if (category === "hormones" || /testost|hormone|libido|cortisol|thyro|estradiol|igf/.test(text)) {
    return {
      intent: "anabolic",
      title: "Si tu stagnes malgré l'entraînement, lis ton profil complet.",
      body:
        "Anabolic Bioscan relie sommeil, stress, récupération, nutrition et signaux hormonaux pour sortir du conseil générique.",
      href: `${BASE_URL}/offers/anabolic-bioscan`,
      label: "Faire l'Anabolic Bioscan",
    };
  }

  if (/bilan sanguin|biomarqueur|glyc|cholest|foie|rein|crp|ferritine|vitamine d|thyro/.test(text)) {
    return {
      intent: "blood",
      title: "Ton bilan sanguin peut expliquer ce que les photos ne montrent pas.",
      body:
        "Blood Analysis transforme les marqueurs en priorités concrètes pour énergie, récupération, métabolisme et suivi.",
      href: `${BASE_URL}/offers/blood-analysis`,
      label: "Analyser mon bilan",
    };
  }

  if (category === "musculation" || /prise de masse|seche|sèche|perte de gras|recomposition|deficit calorique|déficit calorique/.test(text)) {
    return {
      intent: "coaching",
      title: "Tu veux ce plan adapté à ton niveau, ton rythme et ton objectif ?",
      body:
        "Le coaching AchZod transforme la théorie en plan d'entraînement et nutrition ajustés chaque semaine selon ta progression.",
      href: "https://www.achzodcoaching.com/formules-coaching",
      label: "Voir les suivis coaching",
    };
  }

  if (category === "performance" || /squat|bench|developpe|souleve|mouvement|technique|biomécanique|douleur/.test(text)) {
    return {
      intent: "formcheck",
      title: "Si le blocage vient du mouvement, il faut voir l'execution.",
      body:
        "FormCheck donne une lecture biomécanique sur vidéo avec les corrections prioritaires à appliquer dès la prochaine séance.",
      href: `${BASE_URL}/offers/formcheck`,
      label: "Faire analyser ma technique",
    };
  }

  if (["sommeil", "stress", "biohacking"].includes(category) || /hrv|sommeil|stress|recup|fatigue|wearable|oura|whoop/.test(text)) {
    return {
      intent: "ultimate",
      title: "Quand plusieurs signaux se croisent, priorise le vrai limiteur.",
      body:
        "Ultimate Scan relie sommeil, stress, récupération, nutrition, posture et habitudes pour savoir quoi corriger en premier.",
      href: `${BASE_URL}/offers/ultimate-scan`,
      label: "Voir Ultimate Scan",
    };
  }

  return {
    intent: "discovery",
    title: "Tu veux savoir ce qui bloque vraiment ta progression ?",
    body:
      "Le Discovery Scan gratuit analyse les grands leviers en quelques minutes et sort une prochaine action claire.",
    href: `${BASE_URL}/offers/discovery-scan`,
    label: "Faire mon Discovery Scan",
  };
}

function renderBlogIntentCtaHtml(article: BlogArticle): string {
  const cta = getBlogIntentCta(article);
  return `<aside aria-label="Prochaine action APEXLABS" data-blog-cta-intent="${esc(cta.intent)}">
<h2>${esc(cta.title)}</h2>
<p>${esc(cta.body)}</p>
<p><a href="${esc(cta.href)}">${esc(cta.label)}</a></p>
</aside>`;
}

// Detect FAQ pairs from markdown content ,  headings that end with "?" or
// start with common question words. Answer = next non-empty paragraph(s)
// before the following heading.
function detectFaqPairs(
  content: string | undefined,
  maxPairs = 8,
): Array<{ q: string; a: string }> {
  if (!content) return [];
  // FAQPage is only emitted for a real FAQ block: an H2 titled "FAQ" or
  // "Questions fréquentes" followed by H3 questions. Question-shaped section
  // titles in the body of an article are not a FAQ and must not be marked up.
  const lines = content.split(/\r?\n/);
  const pairs: Array<{ q: string; a: string }> = [];
  const faqStart = lines.findIndex((line) =>
    /^\s{0,3}##\s+(?:\*\*)?\s*(?:FAQ\b|Questions?\s+fr[ée]quentes|Foire aux questions)/i.test(line),
  );
  if (faqStart < 0) return [];

  for (let i = faqStart + 1; i < lines.length && pairs.length < maxPairs; i++) {
    const raw = lines[i];
    if (/^\s{0,3}##\s+/.test(raw)) break; // end of the FAQ section
    const headingMatch = raw.match(/^\s{0,3}###\s+(.+?)\s*$/);
    if (!headingMatch) continue;
    const title = headingMatch[1].replace(/\*\*/g, "").trim();
    if (!title) continue;

    const answerLines: string[] = [];
    for (let j = i + 1; j < lines.length; j++) {
      const next = lines[j];
      if (/^\s{0,3}#{2,3}\s+/.test(next)) break;
      answerLines.push(next);
      if (answerLines.join(" ").length > 900) break;
    }
    const answer = stripMarkdown(answerLines.join(" ")).trim().slice(0, 600);
    if (answer.length < 40) continue;

    pairs.push({
      q: /\?\s*$/.test(title) ? title : `${title} ?`,
      a: answer,
    });
  }
  return pairs;
}

// Find up to `limit` related articles sharing the same category.
// Prioritizes featured/recent articles within the same bucket.
function getRelatedArticles(
  current: BlogArticle,
  all: BlogArticle[],
  limit = 4,
): BlogArticle[] {
  const same = all.filter(
    (a) => a.category === current.category && a.slug !== current.slug,
  );
  same.sort((a, b) => {
    const aFeat = (a as any).featured ? 1 : 0;
    const bFeat = (b as any).featured ? 1 : 0;
    if (aFeat !== bFeat) return bFeat - aFeat;
    const aPri = (a as any).priority ?? 0;
    const bPri = (b as any).priority ?? 0;
    if (aPri !== bPri) return bPri - aPri;
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });
  return same.slice(0, limit);
}

function getArticlePillars(article: BlogArticle): BlogPillar[] {
  const text = `${article.slug} ${article.title} ${article.excerpt} ${normalizeBlogCategory(article.category)}`;
  return BLOG_PILLARS.filter((pillar) => pillar.keywords.test(text)).slice(0, 2);
}

function renderPillarLinksHtml(pillars = BLOG_PILLARS): string {
  return `<nav aria-label="Guides piliers APEXLABS">
<h2>Guides piliers</h2>
<ul>
${pillars
  .map((pillar) => `<li><a href="${BASE_URL}/blog/pilier/${esc(pillar.slug)}">${esc(pillar.label)}</a> , ${esc(pillar.description.slice(0, 120))}</li>`)
  .join("\n")}
</ul>
</nav>`;
}

// Matches client/src/data/blogTypes.ts BLOG_CATEGORIES ,  kept in sync here
// so the server can render category pillar pages without importing client code.
const CATEGORY_LABELS: Record<string, string> = {
  musculation: "Musculation",
  sarms: "SARMs & PEDs",
  supplements: "Suppléments",
  hormones: "Hormones",
  sommeil: "Sommeil",
  stress: "Stress & HRV",
  nutrition: "Nutrition",
  performance: "Performance",
  metabolisme: "Métabolisme",
  longevite: "Longévité",
  biohacking: "Biohacking",
  femmes: "Santé Femme",
};

const CATEGORY_INTROS: Record<string, string> = {
  musculation:
    "Programmation force/hypertrophie, périodisation, densité d'entraînement et recovery. Les articles qui expliquent POURQUOI ça marche, pas juste QUOI faire.",
  sarms:
    "Analyses objectives des SARMs et PEDs : mécanismes, risques, cycles raisonnés, monitoring sanguin. Lecture adulte, sans prosélytisme.",
  supplements:
    "Revues basées sur la science : ce qui marche vraiment, doses efficaces, timing, interactions, ce qui est du marketing.",
  hormones:
    "Testostérone, cortisol, thyroïde, IGF-1, estradiol. Comment les lire, les optimiser naturellement, quand intervenir médicalement.",
  sommeil:
    "Architecture du sommeil, HRV nocturne, chronotypes, protocoles de wind-down. Le premier levier de performance, trop souvent bâclé.",
  stress:
    "Cortisol chronique, système nerveux autonome, HRV et adaptations training. Pourquoi tu stagnes quand tu pousses trop fort.",
  nutrition:
    "Macros, timing, satiété, glycémie, micronutriments. Nutrition performance, pas régime minceur. Avec les chiffres qui comptent.",
  performance:
    "Force, puissance, endurance, capacité de travail. Programmer pour progresser, pas pour transpirer.",
  metabolisme:
    "Résistance à l'insuline, flexibilité métabolique, thermogénèse, NEAT. Comprendre ton moteur avant de toucher au carburant.",
  longevite:
    "Biomarqueurs du vieillissement, ApoB, CRP, zone cardio, VO2max, composition corporelle. Vieillir fort, pas juste vieillir.",
  biohacking:
    "Wearables, protocoles, tracking objectif. Ce qui se mesure se pilote. Filtrer le bruit, garder ce qui a des données derrière.",
  femmes:
    "Cycle menstruel, contraception, ménopause, entraînement par phase, anomalies hormonales. Protocoles calibrés sur la physiologie féminine.",
};

const BLOG_PILLARS: BlogPillar[] = [
  {
    slug: "perte-de-gras",
    label: "Perte de gras",
    title: "Perte de gras : métabolisme, nutrition et progression",
    description:
      "Articles APEXLABS pour comprendre pourquoi la perte de gras bloque : calories, glycémie, sommeil, stress, NEAT, digestion et signaux hormonaux.",
    offerHref: `${BASE_URL}/offers/discovery-scan`,
    offerLabel: "Faire le Discovery Scan",
    keywords: /perte de gras|maigr|seche|sèche|cut|coupe|calorie|recomposition|glyc|insuline|metabol|métabol|ventre|graisse|poids/i,
  },
  {
    slug: "testosterone-hormones",
    label: "Testostérone & hormones",
    title: "Testostérone et hormones : lire les vrais signaux",
    description:
      "Guides sur testostérone, cortisol, thyroïde, libido, récupération et hormones pour relier les symptômes, l'entraînement et les données.",
    offerHref: `${BASE_URL}/offers/anabolic-bioscan`,
    offerLabel: "Faire l'Anabolic Bioscan",
    keywords: /testost|hormone|cortisol|thyro|libido|estradiol|igf|anabol|récup|recup|stress/i,
  },
  {
    slug: "bilan-sanguin",
    label: "Bilan sanguin",
    title: "Bilan sanguin : biomarqueurs pour performance et santé",
    description:
      "Articles pour savoir quels marqueurs regarder : glycémie, lipides, CRP, ferritine, vitamine D, foie, reins, thyroïde et inflammation.",
    offerHref: `${BASE_URL}/offers/blood-analysis`,
    offerLabel: "Analyser mon bilan",
    keywords: /bilan sanguin|biomarqueur|prise de sang|glyc|cholest|ldl|hdl|foie|rein|crp|ferritine|vitamine d|insuline|inflammation/i,
  },
  {
    slug: "peptides-peds",
    label: "Peptides & PEDs",
    title: "Peptides, SARMs et PEDs : risques, logique et monitoring",
    description:
      "Analyses éducatives sur peptides, SARMs, HGH, IGF-1, bénéfices supposés, limites, risques et suivi nécessaire avant toute décision.",
    offerHref: `${BASE_URL}/offers/peptides-engine`,
    offerLabel: "Voir Peptides Engine",
    keywords: /peptide|sarm|peds|hgh|igf|mk-677|rad-140|lgd|ostarine|pct|steroid|stéro/i,
  },
];

function getPillarArticles(pillar: BlogPillar, all: BlogArticle[], limit = 50): BlogArticle[] {
  return all
    .filter((article) =>
      pillar.keywords.test(
        `${article.slug} ${article.title} ${article.excerpt} ${normalizeBlogCategory(article.category)}`,
      ),
    )
    .sort((a, b) => {
      const aPri = (a as any).priority ?? 0;
      const bPri = (b as any).priority ?? 0;
      if (aPri !== bPri) return bPri - aPri;
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    })
    .slice(0, limit);
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  // Load blog articles index for SSR meta injection
  let articles: BlogArticle[] = [];
  const articlesPath = path.join(distPath, "blog-articles.json");
  if (fs.existsSync(articlesPath)) {
    try {
      articles = JSON.parse(fs.readFileSync(articlesPath, "utf-8"));
      console.log(`[SSR] Loaded ${articles.length} blog articles for meta injection`);
    } catch (e) {
      console.error("[SSR] Failed to load blog-articles.json:", e);
    }
  }

  // Build slug → article lookup map + category → articles map.
  const articleMap = new Map<string, BlogArticle>();
  const byCategory = new Map<string, BlogArticle[]>();
  for (const a of articles) {
    articleMap.set(a.slug, a);
    const category = normalizeBlogCategory(a.category);
    const bucket = byCategory.get(category) || [];
    bucket.push(a);
    byCategory.set(category, bucket);
  }

  // Read the base index.html template
  const indexHtml = fs.readFileSync(path.resolve(distPath, "index.html"), "utf-8");

  function injectMeta(
    html: string,
    meta: {
      title: string;
      desc: string;
      canonical: string;
      ogType?: string;
      robots?: string;
      image?: string;
    },
  ): string {
    const t = esc(meta.title);
    const d = esc(meta.desc);
    const u = meta.canonical;
    const image = meta.image || DEFAULT_OG_IMAGE;
    return html
      .replace(/<title>[^<]*<\/title>/, `<title>${t}</title>`)
      .replace(
        /<meta name="description" content="[^"]*"/,
        `<meta name="description" content="${d}"`,
      )
      .replace(
        /<meta name="robots" content="[^"]*"/,
        `<meta name="robots" content="${meta.robots || "index, follow"}"`,
      )
      .replace(
        /<meta property="og:title" content="[^"]*"/,
        `<meta property="og:title" content="${t}"`,
      )
      .replace(
        /<meta property="og:description" content="[^"]*"/,
        `<meta property="og:description" content="${d}"`,
      )
      .replace(
        /<meta property="og:url" content="[^"]*"/,
        `<meta property="og:url" content="${u}"`,
      )
      .replace(
        /<meta property="og:image" content="[^"]*"/,
        `<meta property="og:image" content="${image}"`,
      )
      .replace(
        /<meta property="og:type" content="[^"]*"/,
        `<meta property="og:type" content="${meta.ogType || "website"}"`,
      )
      .replace(
        /<meta name="twitter:title" content="[^"]*"/,
        `<meta name="twitter:title" content="${t}"`,
      )
      .replace(
        /<meta name="twitter:description" content="[^"]*"/,
        `<meta name="twitter:description" content="${d}"`,
      )
      .replace(
        /<meta name="twitter:image" content="[^"]*"/,
        `<meta name="twitter:image" content="${image}"`,
      )
      .replace(
        /<link rel="canonical" href="[^"]*"/,
        `<link rel="canonical" href="${u}"`,
      );
  }

  function renderNotFound(pathname: string): string {
    const canonical = `${BASE_URL}${normalizeRequestPath(pathname)}`;
    const body = `<noscript><main><h1>Page introuvable</h1><p>La page demandée n'existe pas ou a été déplacée.</p><p><a href="${BASE_URL}">Retour à l'accueil APEXLABS</a></p></main></noscript>`;
    return injectMeta(indexHtml, {
      title: "Page introuvable | APEXLABS",
      desc: "La page demandée n'existe pas ou a été déplacée.",
      canonical,
      robots: "noindex, follow",
    }).replace("</body>", `${body}\n</body>`);
  }

  function sendNotFound(res: Response, pathname: string) {
    res.setHeader("X-Robots-Tag", "noindex, follow");
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    return res.status(404).type("html").send(renderNotFound(pathname));
  }

  function sendMissingAsset(res: Response) {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    return res.status(404).type("text/plain").send("Not Found");
  }

  type NoscriptSection = {
    title: string;
    body: string | string[];
    links?: Array<{ href: string; label: string }>;
  };

  function renderNoscriptPage(input: {
    h1: string;
    lead: string;
    sections?: NoscriptSection[];
    links?: Array<{ href: string; label: string }>;
  }): string {
    const sections = (input.sections || [])
      .map((section) => {
        const body = (Array.isArray(section.body) ? section.body : [section.body])
          .map((paragraph) => `<p>${esc(paragraph)}</p>`)
          .join("\n");
        const links = (section.links || [])
          .map((link) => `<li><a href="${esc(link.href)}">${esc(link.label)}</a></li>`)
          .join("\n");
        return `<section>
<h2>${esc(section.title)}</h2>
${body}
${links ? `<ul>${links}</ul>` : ""}
</section>`;
      })
      .join("\n");
    const links = (input.links || [])
      .map((link) => `<li><a href="${esc(link.href)}">${esc(link.label)}</a></li>`)
      .join("\n");
    return `<noscript><main>
<h1>${esc(input.h1)}</h1>
<p>${esc(input.lead)}</p>
${sections}
${links ? `<nav aria-label="Pages principales"><ul>${links}</ul></nav>` : ""}
</main></noscript>`;
  }

  // Single source of truth shared with the client router (shared/indexingRules.ts).
  function isPrivateOrUtilityPath(pathname: string): boolean {
    return isNoindexPath(normalizeRequestPath(pathname));
  }

  // Hashed assets (js/css with content hash in filename) ,  long cache
  app.use(
    "/assets",
    express.static(path.join(distPath, "assets"), {
      maxAge: "1y",
      immutable: true,
    }),
  );

  // index.html (root + explicit path) must NEVER be browser-cached. Browsers
  // were holding 24h of stale HTML referencing old chunk paths, blocking
  // shipped frontend fixes from reaching returning visitors (Achzod incident
  // 2026-05-19 : a fresh /peptides-engine bugfix was deployed but visitors who
  // had loaded the page earlier the same day stayed on the broken bundle for
  // up to 24h because the previous "express.static maxAge=1d" sent
  // Cache-Control: max-age=86400 on the root document). Hashed /assets/* keep
  // the immutable 1y cache, so this only forces a fresh HTML lookup ; the
  // referenced chunks are still served from the long browser cache when they
  // haven't changed.
  app.get(["/", "/index.html"], (_req, res) => {
    const title = "APEXLABS by Achzod | Optimisation Humaine & Bio-Data";
    const description =
      "Audits métaboliques, scans hormonaux, Blood Analysis et protocoles bio-data pour identifier tes blocages et transformer tes données en plan d'action.";
    // The WebSite JSON-LD lives once in client/index.html (shared by every page).
    const body = renderNoscriptPage({
      h1: "APEXLABS by Achzod",
      lead:
        "APEXLABS transforme questionnaires, bilans sanguins et données de performance en rapports actionnables pour la nutrition, les hormones, le sommeil, la récupération et le coaching.",
      sections: [
        {
          title: "Scans disponibles",
          body: [
            "Discovery Scan gratuit, Anabolic Bioscan, Ultimate Scan, Blood Analysis, FormCheck et Peptides Engine couvrent les principaux leviers de transformation physique et métabolique.",
            "Chaque scan est conçu comme une porte d'entrée claire: comprendre le problème, isoler les priorités, éviter les protocoles génériques et construire une suite logique vers un plan coaching plus précis.",
          ],
          links: [
            { href: `${BASE_URL}/offers/discovery-scan`, label: "Discovery Scan gratuit" },
            { href: `${BASE_URL}/offers/anabolic-bioscan`, label: "Anabolic Bioscan" },
            { href: `${BASE_URL}/offers/ultimate-scan`, label: "Ultimate Scan" },
            { href: `${BASE_URL}/offers/blood-analysis`, label: "Blood Analysis" },
            { href: `${BASE_URL}/offers/peptides-engine`, label: "Peptides Engine" },
          ],
        },
        {
          title: "Méthode APEXLABS",
          body: [
            "La méthode combine questionnaire détaillé, lecture des habitudes, marqueurs biologiques quand ils sont disponibles, contexte d'entraînement, niveau de stress, qualité du sommeil et objectif réel du client.",
            "Le but n'est pas d'empiler des recommandations, mais de transformer des signaux dispersés en décisions: quoi corriger maintenant, quoi surveiller, quoi laisser de côté et quand passer sur un accompagnement plus encadré.",
          ],
        },
        {
          title: "Lien avec le coaching",
          body: [
            "APEXLABS sert aussi de filtre avant le coaching AchzodCoaching: les rapports montrent les blocages, les risques, la maturité du profil et les leviers les plus rentables pour une transformation durable.",
            "Quand le diagnostic indique qu'un coaching est pertinent, le client arrive avec un dossier plus propre, une priorité d'action et une vision plus nette de ce qui doit être suivi dans le temps.",
          ],
          links: [{ href: `${BASE_URL}/deduction-coaching`, label: "Comprendre la deduction coaching" }],
        },
        {
          title: "Ressources",
          body: [
            "Le blog APEXLABS publie des analyses longues sur musculation, nutrition, hormones, sommeil, HRV, supplements et biohacking.",
            "Ces contenus complètent les scans en donnant du contexte scientifique, des explications pratiques et des critères pour mieux interpréter les signaux du corps sans tomber dans le marketing facile.",
          ],
          links: [{ href: `${BASE_URL}/blog`, label: "Lire le blog APEXLABS" }],
        },
      ],
    });
    const html = injectMeta(indexHtml, {
      title,
      desc: description,
      canonical: BASE_URL,
    }).replace("</body>", `${body}\n</body>`);
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.send(html);
  });

  // Other static files (images, fonts, favicon) ,  moderate cache. We exclude
  // index.html via the explicit handler above so the SPA shell stays fresh.
  app.use(
    express.static(distPath, {
      maxAge: "1d",
      etag: true,
      index: false, // do NOT auto-serve index.html (covered by the explicit handler)
      setHeaders: (res, filePath) => {
        // Blog data changes with each deploy: keep it fresh (ETag revalidation is cheap).
        if (filePath.endsWith(".json") || filePath.endsWith(".webmanifest")) {
          res.setHeader("Cache-Control", "public, max-age=3600");
        } else if (/\.(woff2?|otf|ttf)$/i.test(filePath)) {
          // Font files never change in place: cache them for 30 days.
          res.setHeader("Cache-Control", "public, max-age=2592000");
        }
      },
    }),
  );

  // Consolidate legacy/topic-duplicate article URLs before rendering. Redirected
  // aliases stay in source control for editorial history, but are absent from
  // blog-articles.json and sitemap.xml.
  app.get("/blog/:slug", (req, res, next) => {
    const target = BLOG_ARTICLE_REDIRECTS[
      req.params.slug as keyof typeof BLOG_ARTICLE_REDIRECTS
    ];
    if (!target) return next();
    const queryIndex = req.originalUrl.indexOf("?");
    const query = queryIndex >= 0 ? req.originalUrl.slice(queryIndex) : "";
    return res.redirect(301, `/blog/${encodePathSegment(target)}${query}`);
  });

  // SSR meta injection for canonical blog articles
  app.get("/blog/:slug", (req, res) => {
    const article = articleMap.get(req.params.slug);

    if (!article) {
      return sendNotFound(res, req.path);
    }

    const title = article.seoTitle || article.title;
    const description = esc(buildMetaDescription(article));
    const url = `${BASE_URL}/blog/${encodePathSegment(article.slug)}`;
    const rawImage = article.image || article.imageUrl || DEFAULT_OG_IMAGE;
    // Self-hosted article images are stored as site-relative paths; social
    // cards and JSON-LD need an absolute URL.
    const image = rawImage.startsWith("/") ? `${BASE_URL}${rawImage}` : rawImage;
    const author = esc(article.author || "ACHZOD");
    const date = article.date || "2026-01-01";
    const category = normalizeBlogCategory(article.category);
    const categoryLabel = CATEGORY_LABELS[category] || category;
    void author; // kept for future extensions (authorLinked JSON-LD)

    // JSON-LD BlogPosting
    const blogPosting = {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: article.title,
      alternativeHeadline: article.seoTitle || article.title,
      description: buildMetaDescription(article),
      image,
      author: {
        "@type": "Person",
        name: article.author || "ACHZOD",
      },
      publisher: {
        "@type": "Organization",
        name: "APEXLABS by Achzod",
        logo: {
          "@type": "ImageObject",
          url: `${BASE_URL}/favicon.png`,
        },
      },
      datePublished: date,
      url,
      mainEntityOfPage: { "@type": "WebPage", "@id": url },
      articleSection: categoryLabel,
      inLanguage: "fr-FR",
    };

    // JSON-LD BreadcrumbList ,  helps Google render the pagination path.
    const breadcrumb = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Accueil",
          item: `${BASE_URL}/`,
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Blog",
          item: `${BASE_URL}/blog`,
        },
        {
          "@type": "ListItem",
          position: 3,
          name: categoryLabel,
          item: `${BASE_URL}/blog/catégorie/${category}`,
        },
        {
          "@type": "ListItem",
          position: 4,
          name: article.title,
          item: url,
        },
      ],
    };

    // JSON-LD FAQPage ,  only if we detect enough genuine Q/A pairs.
    const faqPairs = detectFaqPairs(article.content, 8);
    const faqSchema =
      faqPairs.length >= 2
        ? {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faqPairs.map((p) => ({
              "@type": "Question",
              name: p.q,
              acceptedAnswer: {
                "@type": "Answer",
                text: p.a,
              },
            })),
          }
        : null;

    // Related articles as crawlable <a> links inside a <noscript> block,
    // so Google follows them even before the SPA hydrates.
    const related = getRelatedArticles(article, articles, 4);
    const articlePillars = getArticlePillars(article);
    const relatedHtml =
      related.length > 0
        ? `<nav aria-label="Articles connexes">
<h2>Articles connexes (${esc(categoryLabel)})</h2>
<ul>
${related
  .map(
    (r) =>
      `<li><a href="${BASE_URL}/blog/${esc(encodePathSegment(r.slug))}">${esc(r.title)}</a></li>`,
  )
  .join("\n")}
<li><a href="${BASE_URL}/blog/catégorie/${esc(category)}">Voir tous les articles ${esc(categoryLabel)}</a></li>
</ul>
</nav>`
        : "";
    const pillarLinksHtml = articlePillars.length > 0 ? renderPillarLinksHtml(articlePillars) : "";

    // Server-rendered article body for crawlers. Wraps the converted markdown
    // in <noscript> so users (JS-enabled) see the React render, while
    // Googlebot indexes the full text. This is the fix for the 123 blog URLs
    // marked "crawled, currently not indexed" by Search Console.
    const articleBodyHtml = renderArticleBodyHtml(article.content, article.title);
    const intentCtaHtml = renderBlogIntentCtaHtml(article);
    const noscriptBlock = `<noscript><article>
<h1>${esc(article.title)}</h1>
<p><em>${esc(categoryLabel)} , ${esc(article.date || "")}${article.readTime ? " , " + esc(article.readTime) : ""}</em></p>
${intentCtaHtml}
${articleBodyHtml}
${intentCtaHtml}
${pillarLinksHtml}
${relatedHtml}
</article></noscript>`;

    const schemaBlobs = [blogPosting, breadcrumb, faqSchema]
      .filter(Boolean)
      .map(
        (s) =>
          `<script type="application/ld+json">${JSON.stringify(s)}</script>`,
      )
      .join("\n");

    const escTitle = esc(title);
    // Conservative, reversible compliance measure: SARMs/PED articles remain
    // available for editorial review, but are removed from search indexing.
    const shouldNoindex = category === "sarms";
    // Inject meta tags into the HTML <head>, then push the noscript body
    // block right before </body> so crawlers see full content even with an
    // empty React root.
    const injectedHtml = indexHtml
      .replace(/<title>[^<]*<\/title>/, `<title>${escTitle}</title>`)
      .replace(
        /<meta name="robots" content="[^"]*"/,
        `<meta name="robots" content="${shouldNoindex ? "noindex, follow" : "index, follow"}"`,
      )
      .replace(
        /<meta name="description" content="[^"]*"/,
        `<meta name="description" content="${description}"`,
      )
      .replace(
        /<meta property="og:title" content="[^"]*"/,
        `<meta property="og:title" content="${escTitle}"`,
      )
      .replace(
        /<meta property="og:description" content="[^"]*"/,
        `<meta property="og:description" content="${description}"`,
      )
      .replace(
        /<meta property="og:url" content="[^"]*"/,
        `<meta property="og:url" content="${url}"`,
      )
      .replace(
        /<meta property="og:image" content="[^"]*"/,
        `<meta property="og:image" content="${image}"`,
      )
      .replace(
        /<meta property="og:type" content="[^"]*"/,
        `<meta property="og:type" content="article"`,
      )
      .replace(
        /<meta name="twitter:title" content="[^"]*"/,
        `<meta name="twitter:title" content="${escTitle}"`,
      )
      .replace(
        /<meta name="twitter:description" content="[^"]*"/,
        `<meta name="twitter:description" content="${description}"`,
      )
      .replace(
        /<meta name="twitter:image" content="[^"]*"/,
        `<meta name="twitter:image" content="${image}"`,
      )
      .replace(
        /<link rel="canonical" href="[^"]*"/,
        `<link rel="canonical" href="${url}"`,
      )
      .replace("</head>", `${schemaBlobs}\n</head>`)
      .replace("</body>", `${noscriptBlock}\n</body>`);

    if (shouldNoindex) res.setHeader("X-Robots-Tag", "noindex, follow");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.send(injectedHtml);
  });

  // SSR meta for blog index page
  app.get("/blog", (_req, res) => {
    const title = "Blog Musculation, Nutrition & Biohacking | APEXLABS";
    const description = "Articles experts sur la musculation, nutrition, sommeil, hormones, biohacking et performance. Par ACHZOD, 12 certifications internationales.";

    // Emit a CollectionPage + ItemList so Google sees the blog as a hub
    const blogListSchema = {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "Blog APEXLABS",
      description,
      url: `${BASE_URL}/blog`,
      isPartOf: { "@type": "WebSite", url: BASE_URL, name: "APEXLABS" },
      inLanguage: "fr-FR",
    };
    const latest = [...articles]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 60);
    const categoryLinks = Object.entries(CATEGORY_LABELS)
      .filter(([slug]) => (byCategory.get(slug) || []).length > 0)
      .map(
        ([slug, label]) =>
          `<li><a href="${BASE_URL}/blog/catégorie/${esc(slug)}">${esc(label)}</a> (${(byCategory.get(slug) || []).length} articles)</li>`,
      )
      .join("\n");
    const pillarLinks = renderPillarLinksHtml();
    const latestLinks = latest
      .map(
        (a) =>
          `<li><a href="${BASE_URL}/blog/${esc(encodePathSegment(a.slug))}">${esc(a.title)}</a> , ${esc(buildMetaDescription(a).slice(0, 130))}</li>`,
      )
      .join("\n");
    const priorityLinks = BLOG_INDEXATION_PRIORITY_SLUGS
      .map((slug) => articleMap.get(slug))
      .filter((article): article is BlogArticle => Boolean(article))
      .map(
        (a) =>
          `<li><a href="${BASE_URL}/blog/${esc(encodePathSegment(a.slug))}">${esc(a.title)}</a></li>`,
      )
      .join("\n");
    const blogBody = `<noscript><main>
<h1>Blog APEXLABS</h1>
<p>${esc(description)}</p>
<section>
<h2>Catégories</h2>
<ul>${categoryLinks}</ul>
</section>
${pillarLinks}
<section>
<h2>Guides à découvrir</h2>
<ul>${priorityLinks}</ul>
</section>
<section>
<h2>Derniers articles</h2>
<ul>${latestLinks}</ul>
</section>
</main></noscript>`;

    const injectedHtml = indexHtml
      .replace(/<title>[^<]*<\/title>/, `<title>${esc(title)}</title>`)
      .replace(/<meta name="description" content="[^"]*"/, `<meta name="description" content="${esc(description)}"`)
      .replace(/<meta property="og:title" content="[^"]*"/, `<meta property="og:title" content="${esc(title)}"`)
      .replace(/<meta property="og:description" content="[^"]*"/, `<meta property="og:description" content="${esc(description)}"`)
      .replace(/<meta property="og:url" content="[^"]*"/, `<meta property="og:url" content="${BASE_URL}/blog"`)
      .replace(/<link rel="canonical" href="[^"]*"/, `<link rel="canonical" href="${BASE_URL}/blog"`)
      .replace(
        "</head>",
        `<script type="application/ld+json">${JSON.stringify(blogListSchema)}</script>\n</head>`,
      )
      .replace("</body>", `${blogBody}\n</body>`);

    res.setHeader("Cache-Control", "public, max-age=3600");
    res.send(injectedHtml);
  });

  // Business SEO pillar pages ,  /blog/pilier/:slug
  app.get("/blog/pilier/:slug", (req, res) => {
    const pillar = BLOG_PILLARS.find((p) => p.slug === req.params.slug);
    if (!pillar) {
      return sendNotFound(res, req.path);
    }

    const pillarArticles = getPillarArticles(pillar, articles, 60);
    const url = `${BASE_URL}/blog/pilier/${pillar.slug}`;
    const collection = {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: pillar.title,
      description: pillar.description,
      url,
      inLanguage: "fr-FR",
      isPartOf: { "@type": "WebSite", url: BASE_URL, name: "APEXLABS" },
      about: pillar.label,
      mainEntity: {
        "@type": "ItemList",
        numberOfItems: pillarArticles.length,
        itemListElement: pillarArticles.slice(0, 30).map((a, idx) => ({
          "@type": "ListItem",
          position: idx + 1,
          url: `${BASE_URL}/blog/${encodePathSegment(a.slug)}`,
          name: a.title,
        })),
      },
    };

    const breadcrumb = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Accueil", item: `${BASE_URL}/` },
        { "@type": "ListItem", position: 2, name: "Blog", item: `${BASE_URL}/blog` },
        { "@type": "ListItem", position: 3, name: pillar.label, item: url },
      ],
    };

    const articleLinks = pillarArticles
      .map(
        (a) =>
          `<li><a href="${BASE_URL}/blog/${esc(encodePathSegment(a.slug))}">${esc(a.title)}</a> , ${esc(
            buildMetaDescription(a).slice(0, 125),
          )}</li>`,
      )
      .join("\n");

    const body = `<noscript><main>
<h1>${esc(pillar.title)}</h1>
<p>${esc(pillar.description)}</p>
<p><a href="${esc(pillar.offerHref)}">${esc(pillar.offerLabel)}</a></p>
<section>
<h2>Articles prioritaires</h2>
<ul>${articleLinks}</ul>
</section>
${renderPillarLinksHtml(BLOG_PILLARS.filter((p) => p.slug !== pillar.slug))}
</main></noscript>`;

    const schemaBlobs = [collection, breadcrumb]
      .map((s) => `<script type="application/ld+json">${JSON.stringify(s)}</script>`)
      .join("\n");

    const injectedHtml = indexHtml
      .replace(/<title>[^<]*<\/title>/, `<title>${esc(pillar.label)} | Guides APEXLABS by Achzod</title>`)
      .replace(/<meta name="description" content="[^"]*"/, `<meta name="description" content="${esc(pillar.description)}"`)
      .replace(/<meta property="og:title" content="[^"]*"/, `<meta property="og:title" content="${esc(pillar.title)}"`)
      .replace(/<meta property="og:description" content="[^"]*"/, `<meta property="og:description" content="${esc(pillar.description)}"`)
      .replace(/<meta property="og:url" content="[^"]*"/, `<meta property="og:url" content="${url}"`)
      .replace(/<link rel="canonical" href="[^"]*"/, `<link rel="canonical" href="${url}"`)
      .replace("</head>", `${schemaBlobs}\n</head>`)
      .replace("</body>", `${body}\n</body>`);

    res.setHeader("Cache-Control", "public, max-age=3600");
    res.send(injectedHtml);
  });

  // Category pillar page ,  /blog/catégorie/:slug
  // Route unknown catégories to the default SPA (client will 404 or fall back
  // to the generic /blog page).
  app.get("/blog/catégorie/:slug", (req, res) => {
    const slug = req.params.slug;
    const label = CATEGORY_LABELS[slug];
    const intro = CATEGORY_INTROS[slug];
    const bucket = byCategory.get(slug) || [];

    if (!label || bucket.length === 0) {
      return sendNotFound(res, req.path);
    }

    const sorted = [...bucket].sort((a, b) => {
      const aPri = (a as any).priority ?? 0;
      const bPri = (b as any).priority ?? 0;
      if (aPri !== bPri) return bPri - aPri;
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });

    const url = `${BASE_URL}/blog/catégorie/${slug}`;
    const title = `${label} : articles APEXLABS by Achzod`;
    const description = (intro || `Tous les articles ${label.toLowerCase()} par ACHZOD.`).slice(0, 160);

    // JSON-LD CollectionPage + ItemList referencing the top articles.
    const collection = {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: title,
      description,
      url,
      inLanguage: "fr-FR",
      isPartOf: { "@type": "WebSite", url: BASE_URL, name: "APEXLABS" },
      mainEntity: {
        "@type": "ItemList",
        numberOfItems: sorted.length,
        itemListElement: sorted.slice(0, 20).map((a, idx) => ({
          "@type": "ListItem",
          position: idx + 1,
          url: `${BASE_URL}/blog/${encodePathSegment(a.slug)}`,
          name: a.title,
        })),
      },
    };

    const breadcrumb = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Accueil", item: `${BASE_URL}/` },
        { "@type": "ListItem", position: 2, name: "Blog", item: `${BASE_URL}/blog` },
        { "@type": "ListItem", position: 3, name: label, item: url },
      ],
    };

    // Server-rendered article list inside <noscript> so Google indexes the
    // pillar links even before client hydration. The React page (below) takes
    // over for JS-capable users.
    const articlesHtml = `<noscript><main>
<h1>${esc(label)}</h1>
<p>${esc(intro || "")}</p>
<section>
<h2>Pourquoi cette catégorie compte</h2>
<p>${esc(label)} regroupe les articles APEXLABS qui aident a relier les données, les habitudes et les décisions de terrain. L'objectif est de donner une lecture pratique, pas seulement théorique.</p>
<p>Chaque contenu est pensé pour mieux comprendre les blocages de progression, les erreurs fréquentes, les signaux à surveiller et les leviers qui peuvent ensuite être vérifiés dans un scan ou un accompagnement plus complet.</p>
</section>
${renderPillarLinksHtml()}
<section>
<h2>Articles a lire</h2>
<ul>
${sorted
  .map(
    (a) =>
      `<li><a href="${BASE_URL}/blog/${esc(encodePathSegment(a.slug))}">${esc(a.title)}</a> , ${esc(
        buildMetaDescription(a).slice(0, 120),
      )}</li>`,
  )
  .join("\n")}
</ul>
</section>
</main></noscript>`;

    const schemaBlobs = [collection, breadcrumb]
      .map(
        (s) =>
          `<script type="application/ld+json">${JSON.stringify(s)}</script>`,
      )
      .join("\n");

    const shouldNoindex = slug === "sarms";
    const injectedHtml = indexHtml
      .replace(/<title>[^<]*<\/title>/, `<title>${esc(title)}</title>`)
      .replace(
        /<meta name="robots" content="[^"]*"/,
        `<meta name="robots" content="${shouldNoindex ? "noindex, follow" : "index, follow"}"`,
      )
      .replace(
        /<meta name="description" content="[^"]*"/,
        `<meta name="description" content="${esc(description)}"`,
      )
      .replace(
        /<meta property="og:title" content="[^"]*"/,
        `<meta property="og:title" content="${esc(title)}"`,
      )
      .replace(
        /<meta property="og:description" content="[^"]*"/,
        `<meta property="og:description" content="${esc(description)}"`,
      )
      .replace(
        /<meta property="og:url" content="[^"]*"/,
        `<meta property="og:url" content="${url}"`,
      )
      .replace(
        /<link rel="canonical" href="[^"]*"/,
        `<link rel="canonical" href="${url}"`,
      )
      .replace("</head>", `${schemaBlobs}\n</head>`)
      .replace("</body>", `${articlesHtml}\n</body>`);

    if (shouldNoindex) res.setHeader("X-Robots-Tag", "noindex, follow");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.send(injectedHtml);
  });

  // SSR meta for offer pages
  const offerMeta: Record<string, { title: string; desc: string }> = {
    "discovery-scan": {
      title: "Discovery Scan Gratuit - Diagnostic Santé Complet | APEXLABS",
      desc: "Analyse gratuite de 10 domaines de santé en 66 questions. Score global, radar de performance, identification des blocages. Par ACHZOD.",
    },
    "anabolic-bioscan": {
      title: "Anabolic Bioscan - Profil Hormonal Complet | APEXLABS",
      desc: "Analyse hormonale approfondie: testostérone, cortisol, thyroïde. 137 questions, 16 sections, protocoles personnalisés. 59€ d'acompte coaching.",
    },
    "ultimate-scan": {
      title: "Ultimate Scan - L'Analyse La Plus Complète | APEXLABS",
      desc: "18 sections + analyse posturale 3D. Le diagnostic le plus complet du marché. 79€ d'acompte coaching.",
    },
    "blood-analysis": {
      title: "Blood Analysis - Bilan Sanguin Optimisé | APEXLABS",
      desc: "99€ inclut 2 analyses de 39 biomarqueurs, utilisables sans expiration. Bilan initial puis contrôle à 2-3 mois avec ranges optimaux.",
    },
    formcheck: {
      title: "FormCheck - Analyse Vidéo de Tes Mouvements | APEXLABS",
      desc: "Filme ta série, envoie la vidéo et reçois ton analyse technique en PDF : note sur 100, erreurs annotées, 3 corrections prioritaires. Dès 9,90 €. Par ACHZOD.",
    },
    "peptides-engine": {
      title: "Peptides Engine - Protocole Peptides Personnalisé | APEXLABS",
      desc: "Protocole peptides sur-mesure basé sur ton profil hormonal et tes objectifs. Stack, dosage, timing, monitoring. Approche structurée par ACHZOD.",
    },    "guide-peptides": {
      title: "Peptides, le guide de référence par AchZod | Ebook PDF 99 €",
      desc: "194 pages, 83 molécules décryptées : mécanismes, ce que dit la science face au marketing, repérer une source fiable, reconstitution, logique de stacking et de timing. Ebook PDF par AchZod.",
    },
  };

  const peptidesOfferFaqs = PEPTIDES_OFFER_FAQ;

  const offerContent: Record<
    string,
    { h1: string; lead: string; sections: NoscriptSection[] }
  > = {
    "discovery-scan": {
      h1: "Discovery Scan gratuit",
      lead:
        "Un diagnostic gratuit pour identifier les blocages prioritaires sur nutrition, entraînement, sommeil, stress, métabolisme et récupération.",
      sections: [
        {
          title: "Ce que le scan analyse",
          body: [
            "Le questionnaire couvre les habitudes alimentaires, la récupération, la digestion, la motivation, le niveau d'activité, les signaux hormonaux et les points de friction qui limitent ta progression.",
            "Il permet de repérer si le blocage vient plutôt d'un problème d'apport, de sommeil, de stress, de surcharge d'entraînement, de digestion, de manque de structure ou d'un manque de cohérence entre l'objectif et les actions du quotidien.",
          ],
        },
        {
          title: "Suite logique",
          body: [
            "Le rapport Discovery sert de point de départ pour choisir entre Anabolic Bioscan, Ultimate Scan, Blood Analysis ou un coaching complet.",
            "Le client obtient une lecture courte, concrete et priorisee. Si le scan montre un besoin plus profond, la suite peut passer par une analyse hormonale, un bilan sanguin, un Ultimate Scan ou une discussion coaching plus ciblée.",
          ],
          links: [
            { href: `${BASE_URL}/offers/anabolic-bioscan`, label: "Passer a Anabolic Bioscan" },
            { href: `${BASE_URL}/deduction-coaching`, label: "Comprendre la deduction coaching" },
          ],
        },
        {
          title: "Pourquoi commencer ici",
          body: [
            "Le Discovery Scan évite de vendre un accompagnement trop tôt. Il clarifie d'abord la situation, les attentes, les habitudes et les signaux faibles qui expliquent souvent pourquoi une personne ne progresse plus.",
            "Cette première couché de diagnostic rend la relance plus utile: on ne parle pas seulement d'une offre, on revient sur un problème concret identifie dans le questionnaire et sur la prochaine action la plus rationnelle.",
          ],
        },
      ],
    },
    "anabolic-bioscan": {
      h1: "Anabolic Bioscan",
      lead:
        "Analyse approfondie du profil anabolique: hormones, récupération, sommeil, digestion, stress, nutrition et stratégie de progression.",
      sections: [
        {
          title: "Objectif",
          body: [
            "Identifier pourquoi la prise de muscle, la perte de gras ou l'énergie stagnent malgré l'entraînement, puis prioriser les leviers les plus rentables.",
            "L'analyse cherche les incohérences entre volume d'entraînement, sommeil, récupération, apports, gestion du stress, signes digestifs, libido, énergie, faim, humeur et progression réelle sur les charges ou la composition corporelle.",
          ],
        },
        {
          title: "Rapport livre",
          body: [
            "Le client reçoit une synthèse, des scores, des explications et un plan d'action lisible pour corriger les blocages détectés.",
            "Le rapport n'est pas une liste de conseils génériques: il explique ce qui semble prioritaire, ce qui doit être surveillé, ce qui peut attendre et ce qui mérite un accompagnement plus pousse si l'objectif est ambitieux.",
          ],
        },
        {
          title: "Passage vers le coaching",
          body: [
            "Anabolic Bioscan est construit pour transformer un doute flou en décision claire. Si le profil a besoin d'un suivi, la discussion coaching part déjà d'un diagnostic exploitable.",
            "Le montant de l'offre peut aussi servir de passerelle commerciale selon les conditions de déduction affichées, ce qui limite la friction entre audit, compréhension du problème et passage à l'action.",
            "Ce positionnement aide aussi a mieux segmenter les relances: un profil fatigue, un profil qui stagne en prise de muscle et un profil qui gère mal sa récupération ne doivent pas recevoir le même message.",
          ],
        },
      ],
    },
    "ultimate-scan": {
      h1: "Ultimate Scan",
      lead:
        "Le diagnostic APEXLABS le plus complet pour croiser questionnaire, posture, habitudes, récupération, métabolisme et priorités coaching.",
      sections: [
        {
          title: "Pour qui",
          body: [
            "Pour les profils qui veulent une vision globale avant de s'engager dans une transformation sérieuse, avec priorisation claire des actions.",
            "Ultimate Scan s'adresse aux personnes qui ont déjà essayé plusieurs approches sans résultat stable, aux sportifs qui veulent comprendre leurs limites, et aux clients qui veulent entrer en coaching avec une base d'analyse plus complète.",
          ],
        },
        {
          title: "Positionnement",
          body: [
            "Ultimate Scan sert de passerelle vers un plan coaching structure, avec deduction possible du montant paye selon les conditions affichees.",
            "Le scan croise les réponses, la logique d'entraînement, les habitudes de récupération, les signaux métaboliques et le contexte de vie pour déterminer ce qui bloque le plus le rendement de l'effort.",
          ],
          links: [{ href: `${BASE_URL}/deduction-coaching`, label: "Voir la deduction coaching" }],
        },
        {
          title: "Ce que le client gagne",
          body: [
            "Le client obtient une lecture hiérarchisée: les erreurs visibles, les facteurs invisibles, les risques de stagnation et les premières décisions à prendre pour avancer plus vite sans se disperser.",
            "Pour AchzodCoaching, ce scan crée un dossier d'entrée plus sérieux et facilite une relance commerciale précise, basée sur des problèmes réels plutôt que sur une promotion vague.",
            "La page doit donc porter une promesse claire: moins d'approximation, plus de contexte, et une transition naturelle entre curiosite, diagnostic puis accompagnement si les signaux le justifient.",
          ],
        },
      ],
    },
    "blood-analysis": {
      h1: "Blood Analysis",
      lead:
        "Deux analyses de bilan sanguin utilisables sans expiration: une baseline avant les recommandations, puis un contrôle idéalement 2 à 3 mois après.",
      sections: [
        {
          title: "Deux crédits inclus",
          body: [
            "Le paiement unique de 99 EUR ajoute deux crédits Blood Analysis au compte client. Chaque upload de bilan validé consomme un crédit; les crédits n'expirent pas.",
            "Le parcours recommandé consiste à analyser un bilan initial avant la mise en place des recommandations, puis un second bilan 2 à 3 mois après pour mesurer l'évolution. Les crédits restent utilisables librement.",
          ],
        },
        {
          title: "Biomarqueurs",
          body: [
            "La lecture porte sur hormones, métabolisme glucidique, lipides, inflammation, foie, reins, vitamines, minéraux et marqueurs de récupération selon les données disponibles.",
            "L'objectif est de sortir d'une interprétation binaire normal/anormal et de regarder les tendances utiles pour l'énergie, la performance, la composition corporelle, la récupération et la prévention des erreurs de protocole.",
          ],
        },
        {
          title: "Sortie client",
          body: [
            "Le rapport transforme un PDF de laboratoire en lecture claire, avec priorités, explications et actions à discuter avec un professionnel de santé si nécessaire.",
            "Chaque analyse rappelle ses limites: elle n'est pas un diagnostic médical et ne remplace pas un médecin. Elle sert à mieux comprendre les signaux, préparer les questions et aligner hygiène de vie, entraînement et suivi.",
          ],
        },
        {
          title: "Utilité commerciale",
          body: [
            "Blood Analysis est un point d'entrée fort pour les profils qui veulent des données objectives avant d'investir dans un coaching. Le rapport peut montrer pourquoi un suivi structuré est plus rentable qu'une accumulation de tests ou de supplements.",
            "La page SEO doit donc présenter clairement la valeur: transformer des résultats de laboratoire en priorités pratiques, avec prudence, contexte et orientation vers les bons prochains choix.",
          ],
        },
      ],
    },
    formcheck: {
      h1: "FormCheck",
      lead:
        "Analyse vidéo de mouvements pour identifier les erreurs techniques, les compensations et les ajustements prioritaires en musculation.",
      sections: [
        {
          title: "Mouvements",
          body: [
            "Squat, développé couché, soulevé de terre et mouvements structurants peuvent être analysés pour améliorer sécurité, tension mécanique et progression.",
            "Le regard porte sur la trajectoire, les amplitudes, la stabilité, les compensations, la respiration, le placement articulaire et les éléments qui peuvent limiter la charge ou créer une douleur recurrente.",
          ],
        },
        {
          title: "Resultat",
          body: [
            "Le client reçoit des corrections concrètes et une explication biomécanique utilisable dès la prochaine séance.",
            "L'objectif n'est pas de juger une vidéo, mais de donner un ordre de priorité: ce qu'il faut corriger tout de suite, ce qui peut être travaillé progressivement, et ce qui doit être surveillé si une douleur persiste.",
          ],
        },
        {
          title: "Lien avec la performance",
          body: [
            "Une technique plus propre peut améliorer la tolérance au volume, la qualité du stimulus et la confiance sous charge. FormCheck devient donc une offre utile pour les clients qui veulent progresser sans attendre une blessure.",
            "La page relie cette valeur au coaching: quand plusieurs erreurs structurelles se répètent, un suivi de programmation, de technique et de récupération peut devenir plus pertinent qu'une correction isolée.",
            "Elle peut aussi servir de relance intelligente pour les personnes qui consomment du contenu training mais n'ont pas encore ose demander un avis personnalise sur leurs mouvements.",
          ],
        },
      ],
    },
    "guide-peptides": {
      h1: "Peptides, le guide de référence",
      lead:
        "L'ebook de 194 pages d'AchZod pour comprendre les peptides sans le marketing : 83 molécules décryptées, de la science à la pratique.",
      sections: [
        {
          title: "Ce que contient le guide",
          body: [
            "Les mécanismes de chaque molécule, ce que disent réellement les études face aux promesses commerciales, la méthode pour juger une source, une masterclass de reconstitution et la logique du stacking et du timing.",
            "18 chapitres : introduction, ce qu'est un peptide, le marché des peptides en 2026, repérer une source fiable, la masterclass de reconstitution, la pharmacopée complète, axe GH/IGF-1 et myogenèse, réparation tissulaire et inflammation, métabolisme GLP-1 et perte de gras, longévité, mitochondries et biorégulateurs, peau, cheveux et pigmentation, cognition, humeur et sommeil, autres axes, les blends, consommables et composés d'appoint, l'art du stacking et du timing, conclusion, références.",
          ],
        },
        {
          title: "Ce que le guide ne contient pas",
          body: [
            "Aucun protocole, volontairement. Un protocole se construit au cas par cas, selon le profil, l'historique et les objectifs : c'est le rôle de Peptides Engine.",
            "Contenu éducatif, réservé à la recherche. Le guide ne constitue pas un avis médical.",
          ],
        },
        {
          title: "Livraison",
          body: [
            "Ebook PDF, 99 €. Paiement sécurisé par Stripe, sans compte. Le lien de téléchargement arrive par email juste après le paiement, avec un code de 99 € valable sur Peptides Engine ou un coaching AchZod.",
          ],
        },
      ],
    },
    "peptides-engine": {
      h1: "Peptides Engine",
      lead:
        "Protocole éducatif sur les peptides: sélection, logique de stack, timing, précautions, monitoring et cohérence avec l'objectif.",
      sections: [
        {
          title: "Approche",
          body: [
            "Le moteur part du profil, de l'historique, du niveau de tolérance au risque, des objectifs et du budget pour produire une lecture structurée et prudente.",
            "La page explique la logique de sélection, les incompatibilités possibles, les questions de timing, les limites d'un stack et la nécessité de ne jamais confondre contenu éducatif et prescription médicale.",
          ],
        },
        {
          title: "Important",
          body: [
            "Les informations fournies sont éducatives et ne remplacent pas un avis médical. Le monitoring biologique et la prudence priment sur toute optimisation.",
            "Peptides Engine doit aussi préparer une discussion responsable: objectifs réalistes, hygiène de vie, suivi des effets, signaux d'arrêt, lecture des risques et cohérence avec les autres leviers déjà en place.",
          ],
        },
        {
          title: "Pourquoi une page dediee",
          body: [
            "Les peptides génèrent beaucoup de recherches et beaucoup de contenus approximatifs. La landing doit donc clarifier la promesse, poser les limites, rassurer sur le cadre et diriger vers un rapport structure plutôt qu'un conseil improvise.",
            "Cote conversion, la valeur repose sur la personnalisation et la prudence: comprendre le contexte du client avant toute recommandation, puis relier le rapport a un accompagnement plus global si le profil le justifie.",
          ],
        },
        {
          title: "FAQ Peptides Engine",
          body: peptidesOfferFaqs.map(
            (faq) => `${faq.question} ${faq.answer}`,
          ),
        },
      ],
    },
  };

  // Permanent redirects (301) for legacy/broken offer URLs flagged by Google
  // Search Console as Soft 404. Each maps to its closest real equivalent so
  // we consolidate link equity instead of losing it on a 404.
  //   /offers/complete-scan        -> /offers/ultimate-scan
  //     (8 in-article references in client/src/data/blogArticles.ts called
  //      our most complete scan "complete-scan" before the rename)
  //   /offers/peptides-engine-     -> /offers/peptides-engine
  //     (Google indexed a typo'd URL with a trailing dash; same product)
  const offerRedirects: Record<string, string> = {
    "complete-scan": "/offers/ultimate-scan",
    "audit-gratuit": "/offers/discovery-scan",
    "audit-premium": "/offers/anabolic-bioscan",
    "pro-panel": "/offers/ultimate-scan",
    "peptides-engine-": "/offers/peptides-engine",
  };

  app.get("/offers/:offer", (req, res) => {
    const offerSlug = req.params.offer;

    const redirectTo = offerRedirects[offerSlug];
    if (redirectTo) {
      return res.redirect(301, redirectTo);
    }

    const meta = offerMeta[offerSlug];
    if (!meta) {
      // Unknown offer: serve a real 404 with noindex so Google de-lists it
      // instead of treating the SPA shell as duplicate content (Soft 404).
      res.status(404);
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("X-Robots-Tag", "noindex, follow");
      const html404 = indexHtml
        .replace(
          /<title>[^<]*<\/title>/,
          `<title>Page introuvable | APEXLABS</title>`,
        )
        .replace(
          /<meta name="robots" content="[^"]*"/,
          `<meta name="robots" content="noindex, follow"`,
        )
        .replace(
          /<meta name="description" content="[^"]*"/,
          `<meta name="description" content="Cette offre n'existe pas ou a été déplacée. Découvre toutes les offres APEXLABS."`,
        );
      return res.send(html404);
    }

    const url = `${BASE_URL}/offers/${offerSlug}`;
    const body = offerContent[offerSlug]
      ? renderNoscriptPage(offerContent[offerSlug])
      : "";
    const productSchema = offerSlug === "guide-peptides"
      ? {
          "@context": "https://schema.org",
          "@type": "Book",
          name: "Peptides, le guide de référence",
          description: meta.desc,
          author: { "@type": "Person", name: "AchZod" },
          bookFormat: "https://schema.org/EBook",
          inLanguage: "fr",
          numberOfPages: 194,
          image: `${BASE_URL}/images/guide-peptides/guide-peptides-og.jpg`,
          url,
          offers: {
            "@type": "Offer",
            price: "99.00",
            priceCurrency: "EUR",
            availability: "https://schema.org/InStock",
            url,
          },
        }
      : {
      "@context": "https://schema.org",
      "@type": "Service",
      name: offerContent[offerSlug]?.h1 || meta.title,
      description: meta.desc,
      provider: {
        "@type": "Organization",
        name: "APEXLABS by Achzod",
        url: BASE_URL,
      },
      areaServed: "FR",
      url,
    };
    const faqSchema =
      offerSlug === "peptides-engine"
        ? {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: peptidesOfferFaqs.map((faq) => ({
              "@type": "Question",
              name: faq.question,
              acceptedAnswer: {
                "@type": "Answer",
                text: faq.answer,
              },
            })),
          }
        : null;
    const schemaMarkup = [productSchema, faqSchema]
      .filter(Boolean)
      .map(
        (schema) =>
          `<script type="application/ld+json">${JSON.stringify(schema)}</script>`,
      )
      .join("\n");
    const injectedHtml = indexHtml
      .replace(/<title>[^<]*<\/title>/, `<title>${esc(meta.title)}</title>`)
      .replace(/<meta name="description" content="[^"]*"/, `<meta name="description" content="${esc(meta.desc)}"`)
      .replace(/<meta property="og:title" content="[^"]*"/, `<meta property="og:title" content="${esc(meta.title)}"`)
      .replace(/<meta property="og:description" content="[^"]*"/, `<meta property="og:description" content="${esc(meta.desc)}"`)
      .replace(/<meta property="og:url" content="[^"]*"/, `<meta property="og:url" content="${url}"`)
      .replace(/<link rel="canonical" href="[^"]*"/, `<link rel="canonical" href="${url}"`)
      .replace("</head>", `${schemaMarkup}\n</head>`)
      .replace("</body>", `${body}\n</body>`);

    // Guide Peptides : la couverture du guide comme image de partage.
    const finalHtml = offerSlug === "guide-peptides"
      ? injectedHtml
          .replace(/<meta property="og:image" content="[^"]*"/, `<meta property="og:image" content="${BASE_URL}/images/guide-peptides/guide-peptides-og.jpg"`)
          .replace(/<meta property="og:image:type" content="[^"]*"/, `<meta property="og:image:type" content="image/jpeg"`)
          .replace(/<meta name="twitter:image" content="[^"]*"/, `<meta name="twitter:image" content="${BASE_URL}/images/guide-peptides/guide-peptides-og.jpg"`)
      : injectedHtml;
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.send(finalHtml);
  });

  // SSR meta for FAQ page
  app.get("/faq", (_req, res) => {
    const title = "FAQ - Questions Fréquentes | APEXLABS";
    const description = "Réponses à toutes vos questions sur Discovery Scan, Anabolic Bioscan, Ultimate Scan et Blood Analysis. Tarifs, fonctionnement, délais.";
    const faqs = [
      {
        question: "Quel scan choisir pour commencer ?",
        answer:
          "Discovery Scan est le point d'entrée gratuit. Anabolic Bioscan va plus loin sur hormones, récupération et progression. Ultimate Scan est le diagnostic le plus complet. Blood Analysis est adapte quand tu as déjà un bilan sanguin a interpréter.",
      },
      {
        question: "Est-ce que les rapports remplacent un médecin ?",
        answer:
          "Non. Les rapports APEXLABS sont éducatifs et orientés performance. Ils aident à comprendre les données, à prioriser les actions et à préparer les bonnes questions, mais ils ne remplacent pas un diagnostic médical ni une prescription.",
      },
      {
        question: "Combien de temps prend la livraison ?",
        answer:
          "La livraison dépend de l'offre, des données fournies et du niveau d'analyse. Les parcours automatiques génèrent puis planifient la livraison, tandis que les analyses plus sensibles peuvent demander une vérification avant envoi.",
      },
      {
        question: "C'est un paiement unique ou un abonnement ?",
        answer:
          "Discovery Scan est gratuit. Anabolic Bioscan, Ultimate Scan, Blood Analysis et Peptides Engine sont des paiements uniques. FormCheck est vendu en packs à paiement unique, sans abonnement : 1 analyse à 9,90 €, 3 analyses à 24,90 € ou 6 analyses à 44,90 €.",
      },
      {
        question: "Pourquoi APEXLABS demande autant de contexte ?",
        answer:
          "Un conseil utile dépend du profil: objectif, historique, sommeil, nutrition, entraînement, stress, bilan sanguin, douleurs, contraintes et niveau de risque acceptable. Sans contexte, la recommandation devient trop générique.",
      },
      {
        question: "Quel est le lien avec le coaching AchzodCoaching ?",
        answer:
          "Les scans servent à identifier les blocages et à qualifier la suite. Quand un coaching est pertinent, le rapport permet de discuter d'un plan plus précis et peut faciliter la déduction du montant paye selon les conditions affichees.",
      },
    ];
    const faqSchema = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqs.map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: faq.answer,
        },
      })),
    };
    const body = renderNoscriptPage({
      h1: "Questions fréquentes APEXLABS",
      lead:
        "Cette FAQ explique les offres, les délais, les limites médicales, la logique de diagnostic et le passage possible vers le coaching AchzodCoaching.",
      sections: faqs.map((faq) => ({ title: faq.question, body: faq.answer })),
      links: [
        { href: `${BASE_URL}/offers/discovery-scan`, label: "Discovery Scan gratuit" },
        { href: `${BASE_URL}/offers/ultimate-scan`, label: "Ultimate Scan" },
        { href: `${BASE_URL}/deduction-coaching`, label: "Déduction coaching" },
      ],
    });

    const injectedHtml = injectMeta(indexHtml, {
      title,
      desc: description,
      canonical: `${BASE_URL}/faq`,
    })
      .replace(
        "</head>",
        `<script type="application/ld+json">${JSON.stringify(faqSchema)}</script>\n</head>`,
      )
      .replace("</body>", `${body}\n</body>`);

    res.setHeader("Cache-Control", "public, max-age=3600");
    res.send(injectedHtml);
  });

  // Generic SSR meta injection helper for content pages that don't need
  // structured data or noscript bodies (legal, press, simple landings).
  // For pages reachable via tracked query params (?plan=, ?promo=, ?utm_*),
  // the canonical URL stays parameter-free so Google consolidates duplicate
  // signals instead of marking them "alternate page with proper canonical".
  function ssrSimplePage(
    routes: string[],
    meta: {
      title: string;
      desc: string;
      canonical: string;
      ogType?: string;
      robots?: string;
      cacheControl?: string;
      body?: {
        h1: string;
        lead: string;
        sections?: NoscriptSection[];
        links?: Array<{ href: string; label: string }>;
      };
    },
  ) {
    for (const route of routes) {
      app.get(route, (_req, res) => {
        const body = meta.body ? renderNoscriptPage(meta.body) : "";
        const html = injectMeta(indexHtml, meta).replace("</body>", `${body}\n</body>`);
        if (meta.robots?.toLowerCase().includes("noindex")) {
          res.setHeader("X-Robots-Tag", meta.robots);
        }
        res.setHeader("Cache-Control", resolveSsrCacheControl(meta.cacheControl));
        res.send(html);
      });
    }
  }

  ssrSimplePage(["/peptides-engine"], {
    title: "Peptides Engine - Protocole Peptides Personnalisé | APEXLABS",
    desc: "Protocole peptides sur-mesure: stack, dosage, timing, monitoring. Calibré sur ton profil hormonal et tes objectifs. Approche structurée par ACHZOD.",
    canonical: `${BASE_URL}/offers/peptides-engine`,
    ogType: "product",
    robots: "noindex, follow",
    cacheControl: INTERACTIVE_FLOW_CACHE_CONTROL,
    body: {
      h1: "Questionnaire Peptides Engine",
      lead:
        "Cette page est le flow de questionnaire Peptides Engine. La landing SEO canonique est l'offre Peptides Engine.",
      links: [{ href: `${BASE_URL}/offers/peptides-engine`, label: "Voir l'offre Peptides Engine" }],
    },
  });

  // The preview is an interactive conversion flow, not a search landing page.
  // Give crawlers and link previews its real identity instead of the generic
  // homepage metadata while keeping the public offer as the indexable page.
  ssrSimplePage(["/peptides-preview"], {
    title: "Aperçu Peptides Personnalisé | APEXLABS",
    desc: "Lance le Pré-Peptides Engine gratuit pour cadrer ton objectif, ton profil et ton budget avant de découvrir l'analyse complète.",
    canonical: `${BASE_URL}/peptides-preview`,
    robots: "noindex, follow",
    cacheControl: INTERACTIVE_FLOW_CACHE_CONTROL,
  });

  ssrSimplePage(["/audit-complet"], {
    title: "Audit Complet - Diagnostic Santé Premium | APEXLABS",
    desc: "Audit santé complet basé sur ton questionnaire détaillé: hormones, métabolisme, sommeil, stress, performance. Rapport personnalisé par ACHZOD.",
    canonical: `${BASE_URL}/audit-complet`,
    robots: "noindex, follow",
    body: {
      h1: "Audit complet APEXLABS",
      lead:
        "Cette page correspond a un ancien parcours d'audit complet. Les offres SEO principales sont maintenant structurees dans la section offres APEXLABS.",
      sections: [
        {
          title: "Parcours recommande",
          body:
            "Pour un diagnostic public et indexable, utilise les offres actuelles: Discovery Scan, Anabolic Bioscan, Ultimate Scan ou Blood Analysis selon le niveau d'analyse recherche.",
          links: [{ href: `${BASE_URL}/offers/ultimate-scan`, label: "Voir Ultimate Scan" }],
        },
      ],
    },
  });

  ssrSimplePage(["/questionnaire", "/audit-complet/questionnaire"], {
    title: "Questionnaire d'Audit Santé | APEXLABS",
    desc: "Réponds au questionnaire APEXLABS pour générer ton audit santé personnalisé. Hormones, métabolisme, sommeil, performance.",
    canonical: `${BASE_URL}/questionnaire`,
    robots: "noindex, follow",
    cacheControl: INTERACTIVE_FLOW_CACHE_CONTROL,
    body: {
      h1: "Questionnaire d'audit santé",
      lead:
        "Cette page est un flow interactif de questionnaire. Elle reste accessible aux utilisateurs mais n'a pas vocation à être indexée comme contenu SEO.",
    },
  });

  ssrSimplePage(["/press"], {
    title: "Presse & Médias | APEXLABS by Achzod",
    desc: "ACHZOD dans les médias: interviews, publications, références presse autour de l'optimisation humaine et de la bio-data.",
    canonical: `${BASE_URL}/press`,
    body: {
      h1: "Presse et médias",
      lead:
        "Références, prises de parole et ressources média autour d'APEXLABS, d'Achzod et de l'optimisation humaine par la bio-data.",
      sections: [
        {
          title: "Positionnement",
          body: [
            "APEXLABS documente une approche pratique de la transformation physique: questionnaires, marqueurs biologiques, coaching et suivi objectif.",
            "Le projet relie contenu éducatif, diagnostic et accompagnement. Les sujets couverts vont de la composition corporelle aux biomarqueurs, en passant par la récupération, la nutrition, le sommeil et la performance.",
          ],
        },
        {
          title: "Angles media",
          body: [
            "Les prises de parole possibles incluent l'usage responsable des données de santé, les limites du biohacking, l'importance du contexte individuel et la façon de convertir une analyse en changement durable.",
            "APEXLABS peut aussi servir de cas pratique sur l'automatisation de rapports, la pedagogie scientifique et la transition entre contenu gratuit, audit payant et coaching premium.",
          ],
        },
        {
          title: "Ressources utiles",
          body: [
            "Pour comprendre le positionnement, les pages d'offres présentent les diagnostics disponibles et le blog fournit des articles longs sur les thèmes que l'audience recherche déjà.",
            "Les demandes media peuvent ainsi s'appuyer sur des exemples concrets: Discovery Scan, Ultimate Scan, Blood Analysis, Peptides Engine et les contenus APEXLABS publiés sur le blog.",
            "Cette page garde un rôle simple: rassembler les signaux de crédibilité, orienter vers les ressources publiques et éviter qu'une URL presse trop courte soit interprétée comme une page faible.",
          ],
          links: [
            { href: `${BASE_URL}/offers/discovery-scan`, label: "Discovery Scan" },
            { href: `${BASE_URL}/blog`, label: "Blog APEXLABS" },
          ],
        },
      ],
    },
  });

  ssrSimplePage(["/deduction-coaching"], {
    title: "Déduction Coaching - Vos Scans Déductibles | APEXLABS",
    desc: "Le montant de ton scan APEXLABS est intégralement déductible si tu poursuis avec un coaching ACHZOD. Détails, conditions et offres applicables.",
    canonical: `${BASE_URL}/deduction-coaching`,
    body: {
      h1: "Déduction coaching",
      lead:
        "Certains scans APEXLABS peuvent être déduits d'un accompagnement coaching Achzod lorsque les conditions d'éligibilité sont respectées.",
      sections: [
        {
          title: "Principe",
          body: [
            "Le scan sert d'audit initial. Si tu poursuis avec un coaching adapté, le montant éligible peut être transformé en déduction pour faciliter le passage à l'action.",
            "Cette logique réduit la friction commerciale: le client ne paie pas seulement un rapport, il construit une base de travail qui peut ensuite alimenter un accompagnement plus complet et plus précis.",
          ],
          links: [
            { href: `${BASE_URL}/offers/discovery-scan`, label: "Commencer par Discovery Scan" },
            { href: `${BASE_URL}/offers/ultimate-scan`, label: "Voir Ultimate Scan" },
          ],
        },
        {
          title: "Pourquoi c'est utile",
          body: [
            "Un coaching fonctionne mieux quand le problème est déjà formulé. Le scan met en évidence les priorités, les habitudes à corriger, les signaux à suivre et le niveau d'engagement du client.",
            "La déduction encourage donc une progression logique: diagnostic, compréhension, décision, puis suivi. Elle évite de repartir de zéro au moment de construire le plan coaching.",
          ],
        },
        {
          title: "Offres concernees",
          body: [
            "Les conditions exactes peuvent varier selon l'offre, le délai, le type d'accompagnement et la situation du client. La page sert à clarifier le principe général avant de discuter du cas individuel.",
            "Les scans les plus utiles comme passerelle sont Anabolic Bioscan, Ultimate Scan et Blood Analysis, car ils donnent suffisamment de contexte pour évaluer la pertinence d'un suivi.",
          ],
        },
      ],
    },
  });

  ssrSimplePage(["/blood-analysis"], {
    title: "Blood Analysis - Upload Ton Bilan Sanguin | APEXLABS",
    desc: "2 crédits sans expiration pour analyser deux bilans sanguins de 39 biomarqueurs, avec ranges optimaux et suivi avant/après. Par ACHZOD.",
    canonical: `${BASE_URL}/offers/blood-analysis`,
    robots: "noindex, follow",
    body: {
      h1: "Blood Analysis APEXLABS",
      lead:
        "Deux crédits sans expiration pour analyser un bilan initial, puis mesurer l'évolution 2 à 3 mois après les recommandations.",
      sections: [
        {
          title: "Objectif",
          body: [
            "Rendre un PDF de laboratoire exploitable: comprendre les marqueurs, repérer les priorités et préparer une discussion plus claire avec un professionnel de santé si nécessaire.",
            "Cette route est un parcours fonctionnel d'upload. La page publique indexable reste l'offre Blood Analysis, afin d'éviter les doublons et de concentrer les signaux SEO sur la bonne URL.",
          ],
          links: [{ href: `${BASE_URL}/offers/blood-analysis`, label: "Voir l'offre Blood Analysis" }],
        },
      ],
    },
  });

  ssrSimplePage(["/mentions-legales"], {
    title: "Mentions Légales | APEXLABS by Achzod",
    desc: "Mentions légales du site APEXLABS by Achzod: éditeur, hébergeur, responsable de publication.",
    canonical: `${BASE_URL}/mentions-legales`,
    robots: "noindex, follow",
    body: {
      h1: "Mentions légales",
      lead:
        "Informations légales relatives à l'éditeur, l'hébergeur, la responsabilité de publication et l'utilisation du site APEXLABS.",
    },
  });

  // Page d'envoi de vidéo FormCheck : lien personnel reçu par email après paiement.
  // Route SPA réelle (pas de 404), jamais indexée.
  ssrSimplePage(["/guide-peptides/merci"], {
    title: "Merci, ton guide Peptides arrive | AchZod",
    desc: "Ton paiement est confirmé : télécharge ton guide Peptides. Le lien arrive aussi par email.",
    canonical: `${BASE_URL}/offers/guide-peptides`,
    robots: "noindex, follow",
    cacheControl: INTERACTIVE_FLOW_CACHE_CONTROL,
  });

  ssrSimplePage(["/formcheck/upload"], {
    title: "Envoyer ma vidéo FormCheck | APEXLABS",
    desc: "Envoie la vidéo de ta série pour recevoir ton analyse technique FormCheck en PDF par email.",
    canonical: `${BASE_URL}/offers/formcheck`,
    robots: "noindex, follow",
    cacheControl: INTERACTIVE_FLOW_CACHE_CONTROL,
  });

  ssrSimplePage(["/cgv"], {
    title: "Conditions Générales de Vente | APEXLABS by Achzod",
    desc: "Conditions Générales de Vente APEXLABS by Achzod: modalités d'achat, livraison numérique, droit de rétractation, support.",
    canonical: `${BASE_URL}/cgv`,
    robots: "noindex, follow",
    body: {
      h1: "Conditions générales de vente",
      lead:
        "Modalites d'achat, livraison numerique, support, droit de retractation et conditions applicables aux produits APEXLABS.",
    },
  });

  ssrSimplePage(["/politique-confidentialite"], {
    title: "Politique de Confidentialité | APEXLABS by Achzod",
    desc: "Politique de confidentialité APEXLABS by Achzod: données collectées, RGPD, droits d'accès, sécurité, cookies.",
    canonical: `${BASE_URL}/politique-confidentialite`,
    robots: "noindex, follow",
    body: {
      h1: "Politique de confidentialité",
      lead:
        "Informations sur les données collectées, les finalités, la sécurité, les cookies, les droits RGPD et les moyens de contact.",
    },
  });

  ssrSimplePage(["/offre-coaching"], {
    title: "Offre coaching exceptionnelle | AchZod Coaching",
    desc: "2, 4 ou 6 semaines de coaching supplémentaires offertes, avec 99 € de réduction sur les suivis 8 et 12 semaines.",
    canonical: `${BASE_URL}/offre-coaching`,
    robots: "noindex, follow",
    body: {
      h1: "L'offre coaching que je n'ai encore jamais proposée",
      lead:
        "Une offre accessible à tous sur les suivis Essential, Elite et Private Lab, valable jusqu'au 20 octobre 2026 à 23 h 59, heure de Paris.",
    },
  });

  // Default catch-all: serve index.html for all other SPA routes. Same
  // strict no-cache as the explicit "/" handler so any SPA route is always
  // fresh.
  app.use("*", (req, res) => {
    const pathname = normalizeRequestPath(req.originalUrl || req.path || "/");
    if (/\.[a-z0-9]{2,8}$/i.test(pathname)) {
      return sendMissingAsset(res);
    }
    if (isPrivateOrUtilityPath(pathname)) {
      const canonical = `${BASE_URL}${pathname}`;
      const html = injectMeta(indexHtml, {
        title: "Page non indexable | APEXLABS",
        desc: "Page fonctionnelle APEXLABS réservée aux utilisateurs, aux rapports, à l'administration ou aux parcours de conversion.",
        canonical,
        robots: "noindex, follow",
      });
      res.setHeader("X-Robots-Tag", "noindex, follow");
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      return res.status(200).send(html);
    }

    return sendNotFound(res, pathname);
  });
}
