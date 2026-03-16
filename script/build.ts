import { build as esbuild } from "esbuild";
import { build as viteBuild } from "vite";
import { rm, readFile } from "fs/promises";

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
  const articles = getAllArticles();
  await writeFile(resolve("client", "public", "blog-articles.json"), JSON.stringify(articles));
  console.log(`blog-articles.json: ${articles.length} articles`);

  // Generate sitemap.xml with all blog articles
  console.log("generating sitemap.xml...");
  const BASE = "https://apexlabs.onrender.com";
  const staticPages = [
    { loc: "/", priority: "1.0", changefreq: "weekly" },
    { loc: "/offers/discovery-scan", priority: "0.9", changefreq: "monthly" },
    { loc: "/offers/anabolic-bioscan", priority: "0.9", changefreq: "monthly" },
    { loc: "/offers/ultimate-scan", priority: "0.9", changefreq: "monthly" },
    { loc: "/offers/blood-analysis", priority: "0.9", changefreq: "monthly" },
    { loc: "/offers/formcheck", priority: "0.8", changefreq: "monthly" },
    { loc: "/blog", priority: "0.8", changefreq: "daily" },
    { loc: "/faq", priority: "0.7", changefreq: "monthly" },
    { loc: "/press", priority: "0.6", changefreq: "monthly" },
    { loc: "/deduction-coaching", priority: "0.6", changefreq: "monthly" },
    { loc: "/politique-confidentialite", priority: "0.3", changefreq: "yearly" },
    { loc: "/mentions-legales", priority: "0.3", changefreq: "yearly" },
    { loc: "/cgv", priority: "0.3", changefreq: "yearly" },
  ];
  const today = new Date().toISOString().split("T")[0];
  const sitemapEntries = staticPages.map(
    (p) => `  <url><loc>${BASE}${p.loc}</loc><lastmod>${today}</lastmod><changefreq>${p.changefreq}</changefreq><priority>${p.priority}</priority></url>`
  );
  for (const article of articles) {
    const lastmod = article.date ? new Date(article.date).toISOString().split("T")[0] : today;
    sitemapEntries.push(
      `  <url><loc>${BASE}/blog/${article.slug}</loc><lastmod>${lastmod}</lastmod><changefreq>monthly</changefreq><priority>0.6</priority></url>`
    );
  }
  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapEntries.join("\n")}\n</urlset>\n`;
  await writeFile(resolve("client", "public", "sitemap.xml"), sitemapXml);
  console.log(`sitemap.xml: ${staticPages.length + articles.length} URLs`);

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
