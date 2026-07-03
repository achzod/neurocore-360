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

function encodePathSegment(value: string): string {
  return encodeURIComponent(value).replace(/%2F/gi, "/");
}

function normalizeRequestPath(value: string): string {
  const pathOnly = value.split("?")[0].split("#")[0] || "/";
  if (pathOnly.length > 1 && pathOnly.endsWith("/")) return pathOnly.slice(0, -1);
  return pathOnly;
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

  function isPrivateOrUtilityPath(pathname: string): boolean {
    const p = normalizeRequestPath(pathname);
    return [
      /^\/ads\/discovery-scan$/,
      /^\/peptides-engine$/,
      /^\/questionnaire$/,
      /^\/audit-complet\/questionnaire$/,
      /^\/audit-complet\/checkout$/,
      /^\/dashboard(?:\/|$)/,
      /^\/blood-dashboard(?:\/|$)/,
      /^\/analysis(?:\/|$)/,
      /^\/blood-report(?:\/|$)/,
      /^\/blood-analysis\/.+/,
      /^\/scan\/.+/,
      /^\/anabolic\/.+/,
      /^\/ultimate\/.+/,
      /^\/peptides\/.+/,
      /^\/report(?:\/|$)/,
      /^\/auth(?:\/|$)/,
      /^\/login$/,
      /^\/admin(?:\/|$)/,
      /^\/conversions(?:\/|$)/,
      /^\/test$/,
    ].some((pattern) => pattern.test(p));
  }

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
    const title = "APEXLABS by Achzod | Optimisation Humaine & Bio-Data";
    const description =
      "Audits metaboliques, scans hormonaux, Blood Analysis et protocoles bio-data pour identifier tes blocages et transformer tes donnees en plan d'action.";
    const landingSchema = {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "APEXLABS",
      url: BASE_URL,
      inLanguage: "fr-FR",
      publisher: {
        "@type": "Organization",
        name: "APEXLABS by Achzod",
        url: BASE_URL,
      },
    };
    const body = renderNoscriptPage({
      h1: "APEXLABS by Achzod",
      lead:
        "APEXLABS transforme questionnaires, bilans sanguins et donnees de performance en rapports actionnables pour la nutrition, les hormones, le sommeil, la recuperation et le coaching.",
      sections: [
        {
          title: "Scans disponibles",
          body: [
            "Discovery Scan gratuit, Anabolic Bioscan, Ultimate Scan, Blood Analysis, FormCheck et Peptides Engine couvrent les principaux leviers de transformation physique et metabolique.",
            "Chaque scan est concu comme une porte d'entree claire: comprendre le probleme, isoler les priorites, eviter les protocoles generiques et construire une suite logique vers un plan coaching plus precis.",
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
          title: "Methode APEXLABS",
          body: [
            "La methode combine questionnaire detaille, lecture des habitudes, marqueurs biologiques quand ils sont disponibles, contexte d'entrainement, niveau de stress, qualite du sommeil et objectif reel du client.",
            "Le but n'est pas d'empiler des recommandations, mais de transformer des signaux disperses en decisions: quoi corriger maintenant, quoi surveiller, quoi laisser de cote et quand passer sur un accompagnement plus encadre.",
          ],
        },
        {
          title: "Lien avec le coaching",
          body: [
            "APEXLABS sert aussi de filtre avant le coaching AchzodCoaching: les rapports montrent les blocages, les risques, la maturite du profil et les leviers les plus rentables pour une transformation durable.",
            "Quand le diagnostic indique qu'un coaching est pertinent, le client arrive avec un dossier plus propre, une priorite d'action et une vision plus nette de ce qui doit etre suivi dans le temps.",
          ],
          links: [{ href: `${BASE_URL}/deduction-coaching`, label: "Comprendre la deduction coaching" }],
        },
        {
          title: "Ressources",
          body: [
            "Le blog APEXLABS publie des analyses longues sur musculation, nutrition, hormones, sommeil, HRV, supplements et biohacking.",
            "Ces contenus completeront les scans en donnant du contexte scientifique, des explications pratiques et des criteres pour mieux interpreter les signaux du corps sans tomber dans le marketing facile.",
          ],
          links: [{ href: `${BASE_URL}/blog`, label: "Lire le blog APEXLABS" }],
        },
      ],
    });
    const html = injectMeta(indexHtml, {
      title,
      desc: description,
      canonical: BASE_URL,
    })
      .replace(
        "</head>",
        `<script type="application/ld+json">${JSON.stringify(landingSchema)}</script>\n</head>`,
      )
      .replace("</body>", `${body}\n</body>`);
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.send(html);
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
    const url = `${BASE_URL}/blog/${encodePathSegment(article.slug)}`;
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
      `<li><a href="${BASE_URL}/blog/${esc(encodePathSegment(r.slug))}">${esc(r.title)}</a></li>`,
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
    const latest = [...articles]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 60);
    const categoryLinks = Object.entries(CATEGORY_LABELS)
      .filter(([slug]) => (byCategory.get(slug) || []).length > 0)
      .map(
        ([slug, label]) =>
          `<li><a href="${BASE_URL}/blog/categorie/${esc(slug)}">${esc(label)}</a> (${(byCategory.get(slug) || []).length} articles)</li>`,
      )
      .join("\n");
    const latestLinks = latest
      .map(
        (a) =>
          `<li><a href="${BASE_URL}/blog/${esc(encodePathSegment(a.slug))}">${esc(a.title)}</a> , ${esc(buildMetaDescription(a).slice(0, 130))}</li>`,
      )
      .join("\n");
    const blogBody = `<noscript><main>
<h1>Blog APEXLABS</h1>
<p>${esc(description)}</p>
<section>
<h2>Categories</h2>
<ul>${categoryLinks}</ul>
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
<h2>Pourquoi cette categorie compte</h2>
<p>${esc(label)} regroupe les articles APEXLABS qui aident a relier les donnees, les habitudes et les decisions de terrain. L'objectif est de donner une lecture pratique, pas seulement theorique.</p>
<p>Chaque contenu est pense pour mieux comprendre les blocages de progression, les erreurs frequentes, les signaux a surveiller et les leviers qui peuvent ensuite etre verifies dans un scan ou un accompagnement plus complet.</p>
</section>
<section>
<h2>Articles a lire</h2>
<ul>
${sorted
  .slice(0, 50)
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
      .replace("</head>", `${schemaBlobs}\n</head>`)
      .replace("</body>", `${articlesHtml}\n</body>`);

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

  const offerContent: Record<
    string,
    { h1: string; lead: string; sections: NoscriptSection[] }
  > = {
    "discovery-scan": {
      h1: "Discovery Scan gratuit",
      lead:
        "Un diagnostic gratuit pour identifier les blocages prioritaires sur nutrition, entrainement, sommeil, stress, metabolisme et recuperation.",
      sections: [
        {
          title: "Ce que le scan analyse",
          body: [
            "Le questionnaire couvre les habitudes alimentaires, la recuperation, la digestion, la motivation, le niveau d'activite, les signaux hormonaux et les points de friction qui limitent ta progression.",
            "Il permet de repérer si le blocage vient plutot d'un probleme d'apport, de sommeil, de stress, de surcharge d'entrainement, de digestion, de manque de structure ou d'un manque de coherence entre l'objectif et les actions du quotidien.",
          ],
        },
        {
          title: "Suite logique",
          body: [
            "Le rapport Discovery sert de point de depart pour choisir entre Anabolic Bioscan, Ultimate Scan, Blood Analysis ou un coaching complet.",
            "Le client obtient une lecture courte, concrete et priorisee. Si le scan montre un besoin plus profond, la suite peut passer par une analyse hormonale, un bilan sanguin, un Ultimate Scan ou une discussion coaching plus ciblee.",
          ],
          links: [
            { href: `${BASE_URL}/offers/anabolic-bioscan`, label: "Passer a Anabolic Bioscan" },
            { href: `${BASE_URL}/deduction-coaching`, label: "Comprendre la deduction coaching" },
          ],
        },
        {
          title: "Pourquoi commencer ici",
          body: [
            "Le Discovery Scan evite de vendre un accompagnement trop tot. Il clarifie d'abord la situation, les attentes, les habitudes et les signaux faibles qui expliquent souvent pourquoi une personne ne progresse plus.",
            "Cette premiere couche de diagnostic rend la relance plus utile: on ne parle pas seulement d'une offre, on revient sur un probleme concret identifie dans le questionnaire et sur la prochaine action la plus rationnelle.",
          ],
        },
      ],
    },
    "anabolic-bioscan": {
      h1: "Anabolic Bioscan",
      lead:
        "Analyse approfondie du profil anabolique: hormones, recuperation, sommeil, digestion, stress, nutrition et strategie de progression.",
      sections: [
        {
          title: "Objectif",
          body: [
            "Identifier pourquoi la prise de muscle, la perte de gras ou l'energie stagnent malgre l'entrainement, puis prioriser les leviers les plus rentables.",
            "L'analyse cherche les incoherences entre volume d'entrainement, sommeil, recuperation, apports, gestion du stress, signes digestifs, libido, energie, faim, humeur et progression reelle sur les charges ou la composition corporelle.",
          ],
        },
        {
          title: "Rapport livre",
          body: [
            "Le client recoit une synthese, des scores, des explications et un plan d'action lisible pour corriger les blocages detectes.",
            "Le rapport n'est pas une liste de conseils generiques: il explique ce qui semble prioritaire, ce qui doit etre surveille, ce qui peut attendre et ce qui merite un accompagnement plus pousse si l'objectif est ambitieux.",
          ],
        },
        {
          title: "Passage vers le coaching",
          body: [
            "Anabolic Bioscan est construit pour transformer un doute flou en decision claire. Si le profil a besoin d'un suivi, la discussion coaching part deja d'un diagnostic exploitable.",
            "Le montant de l'offre peut aussi servir de passerelle commerciale selon les conditions de deduction affichees, ce qui limite la friction entre audit, comprehension du probleme et passage a l'action.",
            "Ce positionnement aide aussi a mieux segmenter les relances: un profil fatigue, un profil qui stagne en prise de muscle et un profil qui gere mal sa recuperation ne doivent pas recevoir le meme message.",
          ],
        },
      ],
    },
    "ultimate-scan": {
      h1: "Ultimate Scan",
      lead:
        "Le diagnostic APEXLABS le plus complet pour croiser questionnaire, posture, habitudes, recuperation, metabolisme et priorites coaching.",
      sections: [
        {
          title: "Pour qui",
          body: [
            "Pour les profils qui veulent une vision globale avant de s'engager dans une transformation serieuse, avec priorisation claire des actions.",
            "Ultimate Scan s'adresse aux personnes qui ont deja essaye plusieurs approches sans resultat stable, aux sportifs qui veulent comprendre leurs limites, et aux clients qui veulent entrer en coaching avec une base d'analyse plus complete.",
          ],
        },
        {
          title: "Positionnement",
          body: [
            "Ultimate Scan sert de passerelle vers un plan coaching structure, avec deduction possible du montant paye selon les conditions affichees.",
            "Le scan croise les reponses, la logique d'entrainement, les habitudes de recuperation, les signaux metabolique et le contexte de vie pour determiner ce qui bloque le plus le rendement de l'effort.",
          ],
          links: [{ href: `${BASE_URL}/deduction-coaching`, label: "Voir la deduction coaching" }],
        },
        {
          title: "Ce que le client gagne",
          body: [
            "Le client obtient une lecture hierarchisee: les erreurs visibles, les facteurs invisibles, les risques de stagnation et les premieres decisions a prendre pour avancer plus vite sans se disperser.",
            "Pour AchzodCoaching, ce scan cree un dossier d'entree plus serieux et facilite une relance commerciale precise, basee sur des problemes reels plutot que sur une promotion vague.",
            "La page doit donc porter une promesse claire: moins d'approximation, plus de contexte, et une transition naturelle entre curiosite, diagnostic puis accompagnement si les signaux le justifient.",
          ],
        },
      ],
    },
    "blood-analysis": {
      h1: "Blood Analysis",
      lead:
        "Analyse de bilan sanguin orientee optimisation: biomarqueurs, ranges optimaux, signaux d'alerte et plan d'action comprehensible.",
      sections: [
        {
          title: "Biomarqueurs",
          body: [
            "La lecture porte sur hormones, metabolisme glucidique, lipides, inflammation, foie, reins, vitamines, mineraux et marqueurs de recuperation selon les donnees disponibles.",
            "L'objectif est de sortir d'une interpretation binaire normal/anormal et de regarder les tendances utiles pour l'energie, la performance, la composition corporelle, la recuperation et la prevention des erreurs de protocole.",
          ],
        },
        {
          title: "Sortie client",
          body: [
            "Le rapport transforme un PDF de laboratoire en lecture claire, avec priorites, explications et actions a discuter avec un professionnel de sante si necessaire.",
            "Chaque analyse rappelle ses limites: elle n'est pas un diagnostic medical et ne remplace pas un medecin. Elle sert a mieux comprendre les signaux, preparer les questions et aligner hygiene de vie, entrainement et suivi.",
          ],
        },
        {
          title: "Utilite commerciale",
          body: [
            "Blood Analysis est un point d'entree fort pour les profils qui veulent des donnees objectives avant d'investir dans un coaching. Le rapport peut montrer pourquoi un suivi structure est plus rentable qu'une accumulation de tests ou de supplements.",
            "La page SEO doit donc presenter clairement la valeur: transformer des resultats de laboratoire en priorites pratiques, avec prudence, contexte et orientation vers les bons prochains choix.",
          ],
        },
      ],
    },
    formcheck: {
      h1: "FormCheck",
      lead:
        "Analyse video de mouvements pour identifier les erreurs techniques, les compensations et les ajustements prioritaires en musculation.",
      sections: [
        {
          title: "Mouvements",
          body: [
            "Squat, developpe couche, souleve de terre et mouvements structurants peuvent etre analyses pour ameliorer securite, tension mecanique et progression.",
            "Le regard porte sur la trajectoire, les amplitudes, la stabilite, les compensations, la respiration, le placement articulaire et les elements qui peuvent limiter la charge ou creer une douleur recurrente.",
          ],
        },
        {
          title: "Resultat",
          body: [
            "Le client recoit des corrections concretes et une explication biomecanique utilisable des la prochaine seance.",
            "L'objectif n'est pas de juger une video, mais de donner un ordre de priorite: ce qu'il faut corriger tout de suite, ce qui peut etre travaille progressivement, et ce qui doit etre surveille si une douleur persiste.",
          ],
        },
        {
          title: "Lien avec la performance",
          body: [
            "Une technique plus propre peut ameliorer la tolerance au volume, la qualite du stimulus et la confiance sous charge. FormCheck devient donc une offre utile pour les clients qui veulent progresser sans attendre une blessure.",
            "La page relie cette valeur au coaching: quand plusieurs erreurs structurelles se repetent, un suivi de programmation, de technique et de recuperation peut devenir plus pertinent qu'une correction isolee.",
            "Elle peut aussi servir de relance intelligente pour les personnes qui consomment du contenu training mais n'ont pas encore ose demander un avis personnalise sur leurs mouvements.",
          ],
        },
      ],
    },
    "peptides-engine": {
      h1: "Peptides Engine",
      lead:
        "Protocole educatif personnalise sur les peptides: selection, logique de stack, timing, precautions, monitoring et coherence avec l'objectif.",
      sections: [
        {
          title: "Approche",
          body: [
            "Le moteur part du profil, de l'historique, du niveau de tolerance au risque, des objectifs et du budget pour produire une lecture structuree et prudente.",
            "La page explique la logique de selection, les incompatibilites possibles, les questions de timing, les limites d'un stack et la necessite de ne jamais confondre contenu educatif et prescription medicale.",
          ],
        },
        {
          title: "Important",
          body: [
            "Les informations fournies sont educatives et ne remplacent pas un avis medical. Le monitoring biologique et la prudence priment sur toute optimisation.",
            "Peptides Engine doit aussi preparer une discussion responsable: objectifs realistes, hygiene de vie, suivi des effets, signaux d'arret, lecture des risques et coherence avec les autres leviers deja en place.",
          ],
        },
        {
          title: "Pourquoi une page dediee",
          body: [
            "Les peptides generent beaucoup de recherches et beaucoup de contenus approximatifs. La landing doit donc clarifier la promesse, poser les limites, rassurer sur le cadre et diriger vers un rapport structure plutot qu'un conseil improvise.",
            "Cote conversion, la valeur repose sur la personnalisation et la prudence: comprendre le contexte du client avant toute recommandation, puis relier le rapport a un accompagnement plus global si le profil le justifie.",
          ],
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
    const productSchema = {
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
    const injectedHtml = indexHtml
      .replace(/<title>[^<]*<\/title>/, `<title>${esc(meta.title)}</title>`)
      .replace(/<meta name="description" content="[^"]*"/, `<meta name="description" content="${esc(meta.desc)}"`)
      .replace(/<meta property="og:title" content="[^"]*"/, `<meta property="og:title" content="${esc(meta.title)}"`)
      .replace(/<meta property="og:description" content="[^"]*"/, `<meta property="og:description" content="${esc(meta.desc)}"`)
      .replace(/<meta property="og:url" content="[^"]*"/, `<meta property="og:url" content="${url}"`)
      .replace(/<link rel="canonical" href="[^"]*"/, `<link rel="canonical" href="${url}"`)
      .replace(
        "</head>",
        `<script type="application/ld+json">${JSON.stringify(productSchema)}</script>\n</head>`,
      )
      .replace("</body>", `${body}\n</body>`);

    res.setHeader("Cache-Control", "public, max-age=3600");
    res.send(injectedHtml);
  });

  // SSR meta for FAQ page
  app.get("/faq", (_req, res) => {
    const title = "FAQ - Questions Fréquentes | APEXLABS";
    const description = "Réponses à toutes vos questions sur Discovery Scan, Anabolic Bioscan, Ultimate Scan et Blood Analysis. Tarifs, fonctionnement, délais.";
    const faqs = [
      {
        question: "Quel scan choisir pour commencer ?",
        answer:
          "Discovery Scan est le point d'entree gratuit. Anabolic Bioscan va plus loin sur hormones, recuperation et progression. Ultimate Scan est le diagnostic le plus complet. Blood Analysis est adapte quand tu as deja un bilan sanguin a interpreter.",
      },
      {
        question: "Est-ce que les rapports remplacent un medecin ?",
        answer:
          "Non. Les rapports APEXLABS sont educatifs et orientes performance. Ils aident a comprendre les donnees, a prioriser les actions et a preparer les bonnes questions, mais ils ne remplacent pas un diagnostic medical ni une prescription.",
      },
      {
        question: "Combien de temps prend la livraison ?",
        answer:
          "La livraison depend de l'offre, des donnees fournies et du niveau d'analyse. Les parcours automatiques generent puis planifient la livraison, tandis que les analyses plus sensibles peuvent demander une verification avant envoi.",
      },
      {
        question: "Pourquoi APEXLABS demande autant de contexte ?",
        answer:
          "Un conseil utile depend du profil: objectif, historique, sommeil, nutrition, entrainement, stress, bilan sanguin, douleurs, contraintes et niveau de risque acceptable. Sans contexte, la recommandation devient trop generique.",
      },
      {
        question: "Quel est le lien avec le coaching AchzodCoaching ?",
        answer:
          "Les scans servent a identifier les blocages et a qualifier la suite. Quand un coaching est pertinent, le rapport permet de discuter d'un plan plus precis et peut faciliter la deduction du montant paye selon les conditions affichees.",
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
      h1: "Questions frequentes APEXLABS",
      lead:
        "Cette FAQ explique les offres, les delais, les limites medicales, la logique de diagnostic et le passage possible vers le coaching AchzodCoaching.",
      sections: faqs.map((faq) => ({ title: faq.question, body: faq.answer })),
      links: [
        { href: `${BASE_URL}/offers/discovery-scan`, label: "Discovery Scan gratuit" },
        { href: `${BASE_URL}/offers/ultimate-scan`, label: "Ultimate Scan" },
        { href: `${BASE_URL}/deduction-coaching`, label: "Deduction coaching" },
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
        res.setHeader("Cache-Control", "public, max-age=3600");
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
    body: {
      h1: "Questionnaire Peptides Engine",
      lead:
        "Cette page est le flow de questionnaire Peptides Engine. La landing SEO canonique est l'offre Peptides Engine.",
      links: [{ href: `${BASE_URL}/offers/peptides-engine`, label: "Voir l'offre Peptides Engine" }],
    },
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
    body: {
      h1: "Questionnaire d'audit sante",
      lead:
        "Cette page est un flow interactif de questionnaire. Elle reste accessible aux utilisateurs mais n'a pas vocation a etre indexee comme contenu SEO.",
    },
  });

  ssrSimplePage(["/press"], {
    title: "Presse & Médias | APEXLABS by Achzod",
    desc: "ACHZOD dans les médias: interviews, publications, références presse autour de l'optimisation humaine et de la bio-data.",
    canonical: `${BASE_URL}/press`,
    body: {
      h1: "Presse et medias",
      lead:
        "References, prises de parole et ressources media autour d'APEXLABS, d'Achzod et de l'optimisation humaine par la bio-data.",
      sections: [
        {
          title: "Positionnement",
          body: [
            "APEXLABS documente une approche pratique de la transformation physique: questionnaires, marqueurs biologiques, coaching et suivi objectif.",
            "Le projet relie contenu educatif, diagnostic personnalise et accompagnement. Les sujets couverts vont de la composition corporelle aux biomarqueurs, en passant par la recuperation, la nutrition, le sommeil et la performance.",
          ],
        },
        {
          title: "Angles media",
          body: [
            "Les prises de parole possibles incluent l'usage responsable des donnees de sante, les limites du biohacking, l'importance du contexte individuel et la facon de convertir une analyse en changement durable.",
            "APEXLABS peut aussi servir de cas pratique sur l'automatisation de rapports, la pedagogie scientifique et la transition entre contenu gratuit, audit payant et coaching premium.",
          ],
        },
        {
          title: "Ressources utiles",
          body: [
            "Pour comprendre le positionnement, les pages d'offres presentent les diagnostics disponibles et le blog fournit des articles longs sur les themes que l'audience recherche deja.",
            "Les demandes media peuvent ainsi s'appuyer sur des exemples concrets: Discovery Scan, Ultimate Scan, Blood Analysis, Peptides Engine et les contenus APEXLABS publies sur le blog.",
            "Cette page garde un role simple: rassembler les signaux de credibilite, orienter vers les ressources publiques et eviter qu'une URL presse trop courte soit interpretee comme une page faible.",
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
      h1: "Deduction coaching",
      lead:
        "Certains scans APEXLABS peuvent etre deduits d'un accompagnement coaching Achzod lorsque les conditions d'eligibilite sont respectees.",
      sections: [
        {
          title: "Principe",
          body: [
            "Le scan sert d'audit initial. Si tu poursuis avec un coaching adapte, le montant eligible peut etre transforme en deduction pour faciliter le passage a l'action.",
            "Cette logique reduit la friction commerciale: le client ne paie pas seulement un rapport, il construit une base de travail qui peut ensuite alimenter un accompagnement plus complet et plus precis.",
          ],
          links: [
            { href: `${BASE_URL}/offers/discovery-scan`, label: "Commencer par Discovery Scan" },
            { href: `${BASE_URL}/offers/ultimate-scan`, label: "Voir Ultimate Scan" },
          ],
        },
        {
          title: "Pourquoi c'est utile",
          body: [
            "Un coaching fonctionne mieux quand le probleme est deja formule. Le scan met en evidence les priorites, les habitudes a corriger, les signaux a suivre et le niveau d'engagement du client.",
            "La deduction encourage donc une progression logique: diagnostic, comprehension, decision, puis suivi. Elle evite de repartir de zero au moment de construire le plan coaching.",
          ],
        },
        {
          title: "Offres concernees",
          body: [
            "Les conditions exactes peuvent varier selon l'offre, le delai, le type d'accompagnement et la situation du client. La page sert a clarifier le principe general avant de discuter du cas individuel.",
            "Les scans les plus utiles comme passerelle sont Anabolic Bioscan, Ultimate Scan et Blood Analysis, car ils donnent suffisamment de contexte pour evaluer la pertinence d'un suivi.",
          ],
        },
      ],
    },
  });

  ssrSimplePage(["/blood-analysis"], {
    title: "Blood Analysis - Upload Ton Bilan Sanguin | APEXLABS",
    desc: "Envoie ton PDF de bilan sanguin et reçois une analyse de 39 biomarqueurs avec ranges optimaux et plan d'action personnalisé. Par ACHZOD.",
    canonical: `${BASE_URL}/offers/blood-analysis`,
    robots: "noindex, follow",
    body: {
      h1: "Blood Analysis APEXLABS",
      lead:
        "Upload de bilan sanguin pour obtenir une lecture structuree des biomarqueurs: metabolisme, hormones, inflammation, foie, reins et micronutriments.",
      sections: [
        {
          title: "Objectif",
          body: [
            "Rendre un PDF de laboratoire exploitable: comprendre les marqueurs, reperer les priorites et preparer une discussion plus claire avec un professionnel de sante si necessaire.",
            "Cette route est un parcours fonctionnel d'upload. La page publique indexable reste l'offre Blood Analysis, afin d'eviter les doublons et de concentrer les signaux SEO sur la bonne URL.",
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
      h1: "Mentions legales",
      lead:
        "Informations legales relatives a l'editeur, l'hebergeur, la responsabilite de publication et l'utilisation du site APEXLABS.",
    },
  });

  ssrSimplePage(["/cgv"], {
    title: "Conditions Générales de Vente | APEXLABS by Achzod",
    desc: "Conditions Générales de Vente APEXLABS by Achzod: modalités d'achat, livraison numérique, droit de rétractation, support.",
    canonical: `${BASE_URL}/cgv`,
    robots: "noindex, follow",
    body: {
      h1: "Conditions generales de vente",
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
      h1: "Politique de confidentialite",
      lead:
        "Informations sur les donnees collectees, les finalites, la securite, les cookies, les droits RGPD et les moyens de contact.",
    },
  });

  // Default catch-all: serve index.html for all other SPA routes. Same
  // strict no-cache as the explicit "/" handler so any SPA route is always
  // fresh.
  app.use("*", (req, res) => {
    const pathname = normalizeRequestPath(req.originalUrl || req.path || "/");
    if (isPrivateOrUtilityPath(pathname)) {
      const canonical = `${BASE_URL}${pathname}`;
      const html = injectMeta(indexHtml, {
        title: "Page non indexable | APEXLABS",
        desc: "Page fonctionnelle APEXLABS reservee aux utilisateurs, aux rapports, a l'administration ou aux parcours de conversion.",
        canonical,
        robots: "noindex, follow",
      });
      res.setHeader("X-Robots-Tag", "noindex, follow");
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      return res.status(200).send(html);
    }

    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
