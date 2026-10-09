import { build as esbuild } from "esbuild";
import { build as viteBuild } from "vite";
import { rm, readFile } from "fs/promises";
import {
  BLOG_CATEGORY_SLUGS,
  isCanonicalBlogArticleSlug,
} from "../client/src/data/blogSeo";

// server deps to bundle to reduce openat(2) syscalls
// which helps cold start times
const allowlist = [
  "@google/generative-ai",
  "axios",
  "connect-pg-simple",
  "cors",
  "date-fns",
  "drizzle-orm",
  "drizzle-zod",
  "express",
  "express-rate-limit",
  "express-session",
  "jsonwebtoken",
  "marked",
  "memorystore",
  "multer",
  "nanoid",
  "nodemailer",
  "openai",
  "passport",
  "passport-local",
  "pg",
  "p-limit",
  "stripe",
  "uuid",
  "ws",
  "xlsx",
  "zod",
  "zod-validation-error",
];

async function buildAll() {
  await rm("dist", { recursive: true, force: true });

  // Generate blog-articles.json before Vite build so it's included in public/
  console.log("generating blog-articles.json...");
  const { getAllArticles } = await import("../client/src/data/blogArticles");
  const { writeFile } = await import("fs/promises");
  const { resolve } = await import("path");
  const allArticles = getAllArticles();
  const articles = allArticles.filter((article) =>
    isCanonicalBlogArticleSlug(article.slug),
  );
  await writeFile(resolve("client", "public", "blog-articles.json"), JSON.stringify(articles));
  console.log(
    `blog-articles.json: ${articles.length} canonical articles (${allArticles.length - articles.length} redirected aliases excluded)`,
  );

  // Generate sitemap.xml with all blog articles
  console.log("generating sitemap.xml...");
  const BASE = "https://apexlabs.achzodcoaching.com";
  const sitemapLoc = (pathname: string) =>
    `${BASE}${pathname
      .split("/")
      .map((segment, index) => (index === 0 ? "" : encodeURIComponent(segment)))
      .join("/")}`;
  const staticPages = [
    "/",
    "/offers/discovery-scan",
    "/offers/anabolic-bioscan",
    "/offers/ultimate-scan",
    "/offers/blood-analysis",
    "/offers/formcheck",
    "/offers/peptides-engine",
    "/blog",
    "/faq",
    "/press",
    "/deduction-coaching",
  ];
  const pillarPages = [
    "/blog/pilier/perte-de-gras",
    "/blog/pilier/testosterone-hormones",
    "/blog/pilier/bilan-sanguin",
    "/blog/pilier/peptides-peds",
  ];
  // No trustworthy modification timestamps are stored for these pages.
  // Omit lastmod instead of claiming each build or publication date was an edit.
  const sitemapEntries = [...staticPages, ...pillarPages].map(
    (pathname) => `  <url><loc>${sitemapLoc(pathname)}</loc></url>`
  );
  const indexableArticles = articles.filter((article: any) => article.category !== "sarms");
  for (const article of indexableArticles) {
    sitemapEntries.push(
      `  <url><loc>${sitemapLoc(`/blog/${article.slug}`)}</loc></url>`
    );
  }

  // Category pillar pages — one URL per non-empty canonical category.
  for (const slug of BLOG_CATEGORY_SLUGS) {
    // SARMs/PED content stays online pending legal/business review, but is
    // intentionally noindex and therefore must not be advertised in sitemap.
    if (slug === "sarms") continue;
    const count = articles.filter((a: any) => a.category === slug).length;
    if (count === 0) continue;
    sitemapEntries.push(
      `  <url><loc>${sitemapLoc(`/blog/categorie/${slug}`)}</loc></url>`
    );
  }
  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapEntries.join("\n")}\n</urlset>\n`;
  await writeFile(resolve("client", "public", "sitemap.xml"), sitemapXml);
  console.log(`sitemap.xml: ${sitemapEntries.length} URLs`);

  console.log("building client...");
  await viteBuild();

  console.log("building server...");
  const pkg = JSON.parse(await readFile("package.json", "utf-8"));
  const allDeps = [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.devDependencies || {}),
  ];
  const externals = allDeps.filter((dep) => !allowlist.includes(dep));

  await esbuild({
    entryPoints: ["server/index.ts"],
    platform: "node",
    bundle: true,
    format: "cjs",
    outfile: "dist/index.cjs",
    define: {
      "process.env.NODE_ENV": '"production"',
    },
    minify: true,
    sourcemap: true,
    external: externals,
    logLevel: "info",
  });
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
