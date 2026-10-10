import assert from "node:assert/strict";
import { createServer } from "vite";
import { getAllArticles } from "../client/src/data/blogArticles";
import { BLOG_CATEGORIES } from "../client/src/data/blogTypes";

const vite = await createServer({
  appType: "custom",
  logLevel: "error",
  optimizeDeps: { noDiscovery: true },
  server: { middlewareMode: true },
});
const blogArticleModule = await vite.ssrLoadModule("/src/pages/BlogArticle.tsx");
await vite.close();
const {
  getBlogDocumentTitle,
  getBlogIntentConversion,
  getBlogMetaDescription,
} = blogArticleModule as typeof import("../client/src/pages/BlogArticle");

const TARGET_SLUGS = [
  "meilleurs-peptides-performance-sportive",
  "pct-sarms-protocole-complet",
  "rad-140-testolone-guide-complet",
] as const;

const expected = {
  "meilleurs-peptides-performance-sportive": {
    seoTitle: "Peptides musculation : 9 options, effets et risques",
    category: "hormones",
    destination: "/peptides-preview",
  },
  "pct-sarms-protocole-complet": {
    seoTitle: "PCT après SARMs : relance, analyses et risques",
    category: "sarms",
    destination: "/offers/blood-analysis",
  },
  "rad-140-testolone-guide-complet": {
    seoTitle: "RAD-140 (Testolone) : effets, risques et PCT",
    category: "sarms",
    destination: "/offers/blood-analysis",
  },
} as const;

const articles = getAllArticles();
const supportedCategories = new Set<string>(
  BLOG_CATEGORIES.filter((category) => category.id !== "all").map((category) => category.id),
);
const targetArticles = TARGET_SLUGS.map((slug) => {
  const matches = articles.filter((article) => article.slug === slug);
  assert.equal(matches.length, 1, `Le slug ${slug} doit rester présent une seule fois`);
  return matches[0];
});

const nonTargetArticle = articles.find((article) => !TARGET_SLUGS.includes(article.slug as typeof TARGET_SLUGS[number]));
assert.ok(nonTargetArticle, "Un article hors cible doit exister pour vérifier le fallback global");
assert.equal(
  getBlogDocumentTitle(nonTargetArticle),
  nonTargetArticle.title,
  "Le titre hydraté des articles hors cible doit éviter le suffixe qui rallonge les SERP",
);
const nonTargetMeta = getBlogMetaDescription(nonTargetArticle);
assert.ok(nonTargetMeta.length <= 155, "La meta fallback doit rester sous 155 caractères");
assert.ok(
  !nonTargetMeta.toLowerCase().startsWith(nonTargetArticle.title.toLowerCase()),
  "La meta fallback ne doit pas dupliquer le titre",
);

for (const article of targetArticles) {
  const rules = expected[article.slug as keyof typeof expected];
  assert.equal(article.seoTitle, rules.seoTitle);
  assert.ok(article.seoTitle.length <= 60, `${article.slug}: titre SEO trop long`);
  assert.ok(article.metaDescription, `${article.slug}: meta description manquante`);
  const metaDescription = getBlogMetaDescription(article);
  assert.ok(metaDescription.length <= 155, `${article.slug}: meta description trop longue`);
  assert.ok(!metaDescription.toLowerCase().startsWith(article.title.toLowerCase()), `${article.slug}: meta duplique le titre`);
  assert.ok(!metaDescription.toLowerCase().startsWith("introduction :"), `${article.slug}: meta commence par Introduction`);
  assert.equal(article.category, rules.category);
  assert.ok(supportedCategories.has(article.category), `${article.slug}: catégorie non supportée`);

  const conversion = getBlogIntentConversion(article);
  assert.ok(conversion.href.startsWith(rules.destination));
  assert.ok(!conversion.href.includes("utm_"), `${article.slug}: les liens internes ne doivent pas recréer une session GA4`);

  for (const linkedSlug of TARGET_SLUGS) {
    if (linkedSlug !== article.slug) {
      assert.ok(article.content.includes(`/blog/${linkedSlug}`), `${article.slug}: lien vers ${linkedSlug} manquant`);
    }
  }
  assert.ok(
    article.content.includes("/blog/sarms-guide-complet-debutant"),
    `${article.slug}: lien vers le guide SARMs manquant`,
  );
}

const peptide = targetArticles[0];
assert.notEqual(peptide.category, "sarms");
const peptideConversion = getBlogIntentConversion(peptide);
assert.ok(peptideConversion.offerHref?.startsWith("/offers/peptides-engine"));
assert.ok(!peptideConversion.offerHref?.includes("utm_"));

const coachingArticle = articles.find((article) => article.category === "musculation");
assert.ok(coachingArticle, "Un article musculation doit exister");
const coachingConversion = getBlogIntentConversion(coachingArticle);
assert.equal(coachingConversion.intent, "coaching");
assert.equal(coachingConversion.href, "https://www.achzodcoaching.com/formules-coaching");

console.log(`SEO gagnants: ${targetArticles.length} articles validés`);
