import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { marked } from "marked";

const BASE_URL = "https://apexlabs.achzodcoaching.com";
const DEFAULT_OG_IMAGE = `${BASE_URL}/og-default.png`;

// marked: GFM + breaks. Output is injected into a server-side <noscript>
// block consumed by Googlebot, so we render trusted in-repo markdown only.
marked.setOptions({ gfm: true, breaks: true });

interface BlogArticle {
  slug: string;
  title: string;
  excerpt: string;
  content?: string;
  image?: string;
  imageUrl?: string;
  author: string;
  date: string;
  category: string;
  readTime?: string;
}

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
function renderArticleBodyHtml(content: string | undefined): string {
  if (!content) return "";
  try {
    return marked.parse(content, { async: false }) as string;
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

  const content = article.content ? stripMarkdown(article.content) : "";
  const excerpt = stripMarkdown(article.excerpt || "");

  // Prefer content first-meaningful-sentence; fall back to excerpt.
  const source = content.length > floor ? content : excerpt;
  if (!source) return excerpt.slice(0, target);

  if (source.length <= target) return source;

  // Cut at sentence boundary closest to target without passing 170.
  const hard = Math.min(source.length, target + 20);
  const slice = source.slice(0, hard);
  const lastSentence = Math.max(
    slice.lastIndexOf(". "),
    slice.lastIndexOf("? "),
    slice.lastIndexOf("! "),
  );
  if (lastSentence >= floor) {
    return slice.slice(0, lastSentence + 1);
  }
  // Otherwise cut at last space before target to avoid mid-word.
  const lastSpace = slice.lastIndexOf(" ", target);
  if (lastSpace >= floor) return slice.slice(0, lastSpace) + "...";
  return slice.slice(0, target) + "...";
}

// Detect FAQ pairs from markdown content — headings that end with "?" or
// start with common question words. Answer = next non-empty paragraph(s)
// before the following heading.
function detectFaqPairs(
  content: string | undefined,
  maxPairs = 8,
): Array<{ q: string; a: string }> {
  if (!content) return [];
  const lines = content.split(/\r?\n/);
  const pairs: Array<{ q: string; a: string }> = [];
  const questionRegex =
    /^(pourquoi|comment|quand|que(?:lle?s?)?|qu['’]est-ce|qui|ou|combien|est[- ]ce|faut[- ]il|peut[- ]on|doit[- ]on|puis[- ]je)\b/i;

  for (let i = 0; i < lines.length && pairs.length < maxPairs; i++) {
    const raw = lines[i];
    const headingMatch = raw.match(/^\s{0,3}(#{2,3})\s+(.+?)\s*$/);
    if (!headingMatch) continue;
    const title = headingMatch[2].replace(/\*\*/g, "").trim();
    if (!title) continue;
    const isQuestion =
      title.endsWith("?") ||
      title.endsWith(" ?") ||
      questionRegex.test(title);
    if (!isQuestion) continue;

    // Collect answer lines until next heading.
    const answerLines: string[] = [];
    for (let j = i + 1; j < lines.length; j++) {
      const next = lines[j];
      if (/^\s{0,3}#{2,3}\s+/.test(next)) break;
      answerLines.push(next);
      if (answerLines.join(" ").length > 600) break;
    }
    const answer = stripMarkdown(answerLines.join(" "))
      .trim()
      .slice(0, 300);
    if (answer.length < 40) continue;

    pairs.push({
      q: title.endsWith("?") ? title : `${title} ?`,
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

// Matches client/src/data/blogTypes.ts BLOG_CATEGORIES — kept in sync here
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
    const bucket = byCategory.get(a.category) || [];
    bucket.push(a);
    byCategory.set(a.category, bucket);
  }

  // Read the base index.html template
  const indexHtml = fs.readFileSync(path.resolve(distPath, "index.html"), "utf-8");

  // Hashed assets (js/css with content hash in filename) — long cache
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
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.sendFile(path.resolve(distPath, "index.html"));
  });

  // Other static files (images, fonts, favicon) — moderate cache. We exclude
  // index.html via the explicit handler above so the SPA shell stays fresh.
  app.use(
    express.static(distPath, {
      maxAge: "1d",
      etag: true,
      index: false, // do NOT auto-serve index.html (covered by the explicit handler)
    }),
  );

  // SSR meta injection for blog articles
  app.get("/blog/:slug", (req, res) => {
    const article = articleMap.get(req.params.slug);

    if (!article) {
      // Article not found - serve default index.html
      res.setHeader("Cache-Control", "no-cache");
      return res.send(indexHtml);
    }

    const title = esc(`${article.title} | APEXLABS Blog`);
    const description = esc(buildMetaDescription(article));
    const url = `${BASE_URL}/blog/${article.slug}`;
    const image = article.image || article.imageUrl || DEFAULT_OG_IMAGE;
    const author = esc(article.author || "ACHZOD");
    const date = article.date || "2026-01-01";
    const category = article.category || "fitness";
    const categoryLabel = CATEGORY_LABELS[category] || category;
    void author; // kept for future extensions (authorLinked JSON-LD)

    // JSON-LD BlogPosting
    const blogPosting = {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: article.title,
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
      dateModified: date,
      url,
      mainEntityOfPage: { "@type": "WebPage", "@id": url },
      articleSection: categoryLabel,
      inLanguage: "fr-FR",
    };

    // JSON-LD BreadcrumbList — helps Google render the pagination path.
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
          item: `${BASE_URL}/blog/categorie/${category}`,
        },
        {
          "@type": "ListItem",
          position: 4,
          name: article.title,
          item: url,
        },
      ],
    };

    // JSON-LD FAQPage — only if we detect enough genuine Q/A pairs.
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
    const relatedHtml =
      related.length > 0
        ? `<nav aria-label="Articles connexes">
<h2>Articles connexes (${esc(categoryLabel)})</h2>
<ul>
${related
  .map(
    (r) =>
      `<li><a href="${BASE_URL}/blog/${esc(r.slug)}">${esc(r.title)}</a></li>`,
  )
  .join("\n")}
<li><a href="${BASE_URL}/blog/categorie/${esc(category)}">Voir tous les articles ${esc(categoryLabel)}</a></li>
</ul>
</nav>`
        : "";

    // Server-rendered article body for crawlers. Wraps the converted markdown
    // in <noscript> so users (JS-enabled) see the React render, while
    // Googlebot indexes the full text. This is the fix for the 123 blog URLs
    // marked "crawled, currently not indexed" by Search Console.
    const articleBodyHtml = renderArticleBodyHtml(article.content);
    const noscriptBlock = `<noscript><article>
<h1>${esc(article.title)}</h1>
<p><em>${esc(categoryLabel)} , ${esc(article.date || "")}${article.readTime ? " , " + esc(article.readTime) : ""}</em></p>
${articleBodyHtml}
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
    // Inject meta tags into the HTML <head>, then push the noscript body
    // block right before </body> so crawlers see full content even with an
    // empty React root.
    const injectedHtml = indexHtml
      .replace(/<title>[^<]*<\/title>/, `<title>${escTitle}</title>`)
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
      );

    res.setHeader("Cache-Control", "public, max-age=3600");
    res.send(injectedHtml);
  });

  // Category pillar page — /blog/categorie/:slug
  // Route unknown categories to the default SPA (client will 404 or fall back
  // to the generic /blog page).
  app.get("/blog/categorie/:slug", (req, res) => {
    const slug = req.params.slug;
    const label = CATEGORY_LABELS[slug];
    const intro = CATEGORY_INTROS[slug];
    const bucket = byCategory.get(slug) || [];

    if (!label || bucket.length === 0) {
      res.setHeader("Cache-Control", "no-cache");
      return res.send(indexHtml);
    }

    const sorted = [...bucket].sort((a, b) => {
      const aPri = (a as any).priority ?? 0;
      const bPri = (b as any).priority ?? 0;
      if (aPri !== bPri) return bPri - aPri;
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });

    const url = `${BASE_URL}/blog/categorie/${slug}`;
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
          url: `${BASE_URL}/blog/${a.slug}`,
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
<ul>
${sorted
  .slice(0, 50)
  .map(
    (a) =>
      `<li><a href="${BASE_URL}/blog/${esc(a.slug)}">${esc(a.title)}</a> , ${esc(
        buildMetaDescription(a).slice(0, 120),
      )}</li>`,
  )
  .join("\n")}
</ul>
</main></noscript>`;

    const schemaBlobs = [collection, breadcrumb]
      .map(
        (s) =>
          `<script type="application/ld+json">${JSON.stringify(s)}</script>`,
      )
      .join("\n");

    const injectedHtml = indexHtml
      .replace(/<title>[^<]*<\/title>/, `<title>${esc(title)}</title>`)
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
      .replace("</head>", `${schemaBlobs}\n${articlesHtml}\n</head>`);

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
      desc: "39 biomarqueurs analysés avec ranges optimaux. Upload ton PDF, reçois ton rapport complet. 99€ d'acompte coaching.",
    },
    formcheck: {
      title: "FormCheck - Analyse Vidéo de Tes Mouvements | APEXLABS",
      desc: "Envoie ta vidéo de squat, soulevé de terre ou développé couché. Reçois une analyse biomécanique détaillée et des corrections actionnables. Par ACHZOD.",
    },
    "peptides-engine": {
      title: "Peptides Engine - Protocole Peptides Personnalisé | APEXLABS",
      desc: "Protocole peptides sur-mesure basé sur ton profil hormonal et tes objectifs. Stack, dosage, timing, monitoring. Approche structurée par ACHZOD.",
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
    const injectedHtml = indexHtml
      .replace(/<title>[^<]*<\/title>/, `<title>${esc(meta.title)}</title>`)
      .replace(/<meta name="description" content="[^"]*"/, `<meta name="description" content="${esc(meta.desc)}"`)
      .replace(/<meta property="og:title" content="[^"]*"/, `<meta property="og:title" content="${esc(meta.title)}"`)
      .replace(/<meta property="og:description" content="[^"]*"/, `<meta property="og:description" content="${esc(meta.desc)}"`)
      .replace(/<meta property="og:url" content="[^"]*"/, `<meta property="og:url" content="${url}"`)
      .replace(/<link rel="canonical" href="[^"]*"/, `<link rel="canonical" href="${url}"`);

    res.setHeader("Cache-Control", "public, max-age=3600");
    res.send(injectedHtml);
  });

  // SSR meta for FAQ page
  app.get("/faq", (_req, res) => {
    const title = "FAQ - Questions Fréquentes | APEXLABS";
    const description = "Réponses à toutes vos questions sur Discovery Scan, Anabolic Bioscan, Ultimate Scan et Blood Analysis. Tarifs, fonctionnement, délais.";

    const injectedHtml = indexHtml
      .replace(/<title>[^<]*<\/title>/, `<title>${esc(title)}</title>`)
      .replace(/<meta name="description" content="[^"]*"/, `<meta name="description" content="${esc(description)}"`)
      .replace(/<meta property="og:title" content="[^"]*"/, `<meta property="og:title" content="${esc(title)}"`)
      .replace(/<meta property="og:description" content="[^"]*"/, `<meta property="og:description" content="${esc(description)}"`)
      .replace(/<meta property="og:url" content="[^"]*"/, `<meta property="og:url" content="${BASE_URL}/faq"`)
      .replace(/<link rel="canonical" href="[^"]*"/, `<link rel="canonical" href="${BASE_URL}/faq"`);

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
    meta: { title: string; desc: string; canonical: string; ogType?: string },
  ) {
    for (const route of routes) {
      app.get(route, (_req, res) => {
        const t = esc(meta.title);
        const d = esc(meta.desc);
        const u = meta.canonical;
        const html = indexHtml
          .replace(/<title>[^<]*<\/title>/, `<title>${t}</title>`)
          .replace(
            /<meta name="description" content="[^"]*"/,
            `<meta name="description" content="${d}"`,
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
            /<link rel="canonical" href="[^"]*"/,
            `<link rel="canonical" href="${u}"`,
          );
        res.setHeader("Cache-Control", "public, max-age=3600");
        res.send(html);
      });
    }
  }

  ssrSimplePage(["/peptides-engine"], {
    title: "Peptides Engine - Protocole Peptides Personnalisé | APEXLABS",
    desc: "Protocole peptides sur-mesure: stack, dosage, timing, monitoring. Calibré sur ton profil hormonal et tes objectifs. Approche structurée par ACHZOD.",
    canonical: `${BASE_URL}/peptides-engine`,
    ogType: "product",
  });

  ssrSimplePage(["/audit-complet"], {
    title: "Audit Complet - Diagnostic Santé Premium | APEXLABS",
    desc: "Audit santé complet basé sur ton questionnaire détaillé: hormones, métabolisme, sommeil, stress, performance. Rapport personnalisé par ACHZOD.",
    canonical: `${BASE_URL}/audit-complet`,
  });

  ssrSimplePage(["/questionnaire", "/audit-complet/questionnaire"], {
    title: "Questionnaire d'Audit Santé | APEXLABS",
    desc: "Réponds au questionnaire APEXLABS pour générer ton audit santé personnalisé. Hormones, métabolisme, sommeil, performance.",
    canonical: `${BASE_URL}/questionnaire`,
  });

  ssrSimplePage(["/press"], {
    title: "Presse & Médias | APEXLABS by Achzod",
    desc: "ACHZOD dans les médias: interviews, publications, références presse autour de l'optimisation humaine et de la bio-data.",
    canonical: `${BASE_URL}/press`,
  });

  ssrSimplePage(["/deduction-coaching"], {
    title: "Déduction Coaching - Vos Scans Déductibles | APEXLABS",
    desc: "Le montant de ton scan APEXLABS est intégralement déductible si tu poursuis avec un coaching ACHZOD. Détails, conditions et offres applicables.",
    canonical: `${BASE_URL}/deduction-coaching`,
  });

  ssrSimplePage(["/blood-analysis"], {
    title: "Blood Analysis - Upload Ton Bilan Sanguin | APEXLABS",
    desc: "Envoie ton PDF de bilan sanguin et reçois une analyse de 39 biomarqueurs avec ranges optimaux et plan d'action personnalisé. Par ACHZOD.",
    canonical: `${BASE_URL}/blood-analysis`,
  });

  ssrSimplePage(["/mentions-legales"], {
    title: "Mentions Légales | APEXLABS by Achzod",
    desc: "Mentions légales du site APEXLABS by Achzod: éditeur, hébergeur, responsable de publication.",
    canonical: `${BASE_URL}/mentions-legales`,
  });

  ssrSimplePage(["/cgv"], {
    title: "Conditions Générales de Vente | APEXLABS by Achzod",
    desc: "Conditions Générales de Vente APEXLABS by Achzod: modalités d'achat, livraison numérique, droit de rétractation, support.",
    canonical: `${BASE_URL}/cgv`,
  });

  ssrSimplePage(["/politique-confidentialite"], {
    title: "Politique de Confidentialité | APEXLABS by Achzod",
    desc: "Politique de confidentialité APEXLABS by Achzod: données collectées, RGPD, droits d'accès, sécurité, cookies.",
    canonical: `${BASE_URL}/politique-confidentialite`,
  });

  // Default catch-all: serve index.html for all other SPA routes. Same
  // strict no-cache as the explicit "/" handler so any SPA route is always
  // fresh.
  app.use("*", (_req, res) => {
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
