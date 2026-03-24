import express, { type Express } from "express";
import fs from "fs";
import path from "path";

const BASE_URL = "https://apexlabs.achzodcoaching.com";
const DEFAULT_OG_IMAGE = `${BASE_URL}/og-default.png`;

interface BlogArticle {
  slug: string;
  title: string;
  excerpt: string;
  image?: string;
  imageUrl?: string;
  author: string;
  date: string;
  category: string;
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

  // Build slug → article lookup map
  const articleMap = new Map<string, BlogArticle>();
  for (const a of articles) {
    articleMap.set(a.slug, a);
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

  // Other static files (images, fonts, favicon) — moderate cache
  app.use(
    express.static(distPath, {
      maxAge: "1d",
      etag: true,
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
    const description = esc(article.excerpt.slice(0, 160));
    const url = `${BASE_URL}/blog/${article.slug}`;
    const image = article.image || article.imageUrl || DEFAULT_OG_IMAGE;
    const author = esc(article.author || "ACHZOD");
    const date = article.date || "2026-01-01";
    const category = esc(article.category || "fitness");

    // JSON-LD BlogPosting structured data
    const jsonLd = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: article.title,
      description: article.excerpt.slice(0, 160),
      image: image,
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
      url: url,
      mainEntityOfPage: { "@type": "WebPage", "@id": url },
      articleSection: article.category,
      inLanguage: "fr-FR",
    });

    // Inject meta tags into the HTML <head>
    const injectedHtml = indexHtml
      // Replace title
      .replace(
        /<title>[^<]*<\/title>/,
        `<title>${title}</title>`
      )
      // Replace meta description
      .replace(
        /<meta name="description" content="[^"]*"/,
        `<meta name="description" content="${description}"`
      )
      // Replace OG tags
      .replace(
        /<meta property="og:title" content="[^"]*"/,
        `<meta property="og:title" content="${title}"`
      )
      .replace(
        /<meta property="og:description" content="[^"]*"/,
        `<meta property="og:description" content="${description}"`
      )
      .replace(
        /<meta property="og:url" content="[^"]*"/,
        `<meta property="og:url" content="${url}"`
      )
      .replace(
        /<meta property="og:image" content="[^"]*"/,
        `<meta property="og:image" content="${image}"`
      )
      .replace(
        /<meta property="og:type" content="[^"]*"/,
        `<meta property="og:type" content="article"`
      )
      // Replace Twitter tags
      .replace(
        /<meta name="twitter:title" content="[^"]*"/,
        `<meta name="twitter:title" content="${title}"`
      )
      .replace(
        /<meta name="twitter:description" content="[^"]*"/,
        `<meta name="twitter:description" content="${description}"`
      )
      .replace(
        /<meta name="twitter:image" content="[^"]*"/,
        `<meta name="twitter:image" content="${image}"`
      )
      // Replace canonical
      .replace(
        /<link rel="canonical" href="[^"]*"/,
        `<link rel="canonical" href="${url}"`
      )
      // Inject JSON-LD before closing </head>
      .replace(
        "</head>",
        `<script type="application/ld+json">${jsonLd}</script>\n</head>`
      );

    res.setHeader("Cache-Control", "public, max-age=3600"); // 1h cache for SEO
    res.send(injectedHtml);
  });

  // SSR meta for blog index page
  app.get("/blog", (_req, res) => {
    const title = "Blog Musculation, Nutrition & Biohacking | APEXLABS";
    const description = "Articles experts sur la musculation, nutrition, sommeil, hormones, biohacking et performance. Par ACHZOD, 11 certifications internationales.";

    const injectedHtml = indexHtml
      .replace(/<title>[^<]*<\/title>/, `<title>${esc(title)}</title>`)
      .replace(/<meta name="description" content="[^"]*"/, `<meta name="description" content="${esc(description)}"`)
      .replace(/<meta property="og:title" content="[^"]*"/, `<meta property="og:title" content="${esc(title)}"`)
      .replace(/<meta property="og:description" content="[^"]*"/, `<meta property="og:description" content="${esc(description)}"`)
      .replace(/<meta property="og:url" content="[^"]*"/, `<meta property="og:url" content="${BASE_URL}/blog"`)
      .replace(/<link rel="canonical" href="[^"]*"/, `<link rel="canonical" href="${BASE_URL}/blog"`);

    res.setHeader("Cache-Control", "public, max-age=3600");
    res.send(injectedHtml);
  });

  // SSR meta for offer pages
  const offerMeta: Record<string, { title: string; desc: string }> = {
    "discovery-scan": {
      title: "Discovery Scan Gratuit - Diagnostic Santé IA | APEXLABS",
      desc: "Analyse gratuite de 10 domaines de santé en 66 questions. Score global, radar de performance, identification des blocages. Par ACHZOD.",
    },
    "anabolic-bioscan": {
      title: "Anabolic Bioscan - Profil Hormonal Complet | APEXLABS",
      desc: "Analyse hormonale approfondie: testostérone, cortisol, thyroïde. 137 questions, 16 sections, protocoles personnalisés. 59€ d'acompte coaching.",
    },
    "ultimate-scan": {
      title: "Ultimate Scan - L'Analyse La Plus Complète | APEXLABS",
      desc: "18 sections + analyse posturale 3D + wearables. Le diagnostic le plus complet du marché. 79€ d'acompte coaching.",
    },
    "blood-analysis": {
      title: "Blood Analysis - Bilan Sanguin Optimisé | APEXLABS",
      desc: "39 biomarqueurs analysés avec ranges optimaux. Upload ton PDF, reçois ton rapport complet. 99€ d'acompte coaching.",
    },
  };

  app.get("/offers/:offer", (req, res) => {
    const meta = offerMeta[req.params.offer];
    if (!meta) {
      res.setHeader("Cache-Control", "no-cache");
      return res.send(indexHtml);
    }

    const url = `${BASE_URL}/offers/${req.params.offer}`;
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

  // Default catch-all: serve index.html for all other SPA routes
  app.use("*", (_req, res) => {
    res.setHeader("Cache-Control", "no-cache");
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
