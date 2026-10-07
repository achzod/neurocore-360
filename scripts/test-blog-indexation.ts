import assert from "node:assert/strict";
import fs from "node:fs";
import {
  BLOG_ARTICLE_REDIRECTS,
  BLOG_CATEGORY_SLUGS,
  BLOG_INDEXATION_PRIORITY_SLUGS,
  BLOG_REDIRECT_SLUGS,
} from "../client/src/data/blogSeo";
import { getAllArticles } from "../client/src/data/blogArticles";

const BASE = "https://apexlabs.achzodcoaching.com";
const generatedArticles = JSON.parse(
  fs.readFileSync("client/public/blog-articles.json", "utf8"),
) as Array<{ slug: string; title: string; category: string }>;
const sitemap = fs.readFileSync("client/public/sitemap.xml", "utf8");
const serverSource = fs.readFileSync("server/static.ts", "utf8");
const blogSource = fs.readFileSync("client/src/pages/Blog.tsx", "utf8");
const sitemapUrls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
const allArticles = getAllArticles();
const allSlugs = new Set(allArticles.map((article) => article.slug));
const generatedSlugs = new Set(generatedArticles.map((article) => article.slug));

assert.equal(generatedSlugs.size, generatedArticles.length, "duplicate canonical slug");

for (const [source, target] of Object.entries(BLOG_ARTICLE_REDIRECTS)) {
  assert.notEqual(source, target, `self redirect: ${source}`);
  assert.ok(allSlugs.has(target), `redirect target is missing: ${target}`);
  assert.ok(!generatedSlugs.has(source), `redirect source leaked into article feed: ${source}`);
  assert.ok(
    !sitemapUrls.includes(`${BASE}/blog/${encodeURIComponent(source)}`),
    `redirect source leaked into sitemap: ${source}`,
  );
  assert.ok(generatedSlugs.has(target), `redirect target missing from article feed: ${target}`);
}

for (const source of BLOG_REDIRECT_SLUGS) {
  const seen = new Set<string>();
  let cursor: string | undefined = source;
  while (cursor && BLOG_REDIRECT_SLUGS.has(cursor)) {
    assert.ok(!seen.has(cursor), `redirect cycle: ${source}`);
    seen.add(cursor);
    cursor = BLOG_ARTICLE_REDIRECTS[cursor as keyof typeof BLOG_ARTICLE_REDIRECTS];
  }
}

assert.equal(new Set(sitemapUrls).size, sitemapUrls.length, "duplicate sitemap URL");
for (const url of sitemapUrls) {
  assert.ok(url.startsWith(BASE), `off-domain sitemap URL: ${url}`);
  assert.ok(!url.includes("?") && !url.includes("#"), `non-canonical sitemap URL: ${url}`);
  const pathname = new URL(url).pathname;
  assert.ok(
    pathname === "/" ||
      pathname === "/blog" ||
      pathname === "/faq" ||
      pathname === "/press" ||
      pathname === "/deduction-coaching" ||
      pathname.startsWith("/offers/") ||
      pathname.startsWith("/blog/pilier/") ||
      pathname.startsWith("/blog/categorie/") ||
      (pathname.startsWith("/blog/") && generatedSlugs.has(decodeURIComponent(pathname.slice(6)))),
    `sitemap path is not a known indexable route: ${pathname}`,
  );
}

for (const article of generatedArticles) {
  const encodedUrl = `${BASE}/blog/${article.slug
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;
  assert.ok(sitemapUrls.includes(encodedUrl), `canonical article missing from sitemap: ${article.slug}`);
}
for (const slug of BLOG_CATEGORY_SLUGS) {
  if (!generatedArticles.some((article) => article.category === slug)) continue;
  assert.ok(sitemapUrls.includes(`${BASE}/blog/categorie/${slug}`), `category missing from sitemap: ${slug}`);
}

for (const slug of BLOG_INDEXATION_PRIORITY_SLUGS) {
  assert.ok(generatedSlugs.has(slug), `priority article missing: ${slug}`);
}
assert.ok(serverSource.includes("BLOG_INDEXATION_PRIORITY_SLUGS"), "SSR blog hub misses priority links");
assert.ok(blogSource.includes("BLOG_INDEXATION_PRIORITY_SLUGS"), "client blog hub misses priority links");
assert.ok(serverSource.includes("res.redirect(301"), "server misses permanent blog redirects");

console.log(
  `blog indexation: ${generatedArticles.length} canonical articles, ${BLOG_REDIRECT_SLUGS.size} aliases, ${sitemapUrls.length} sitemap URLs`,
);
