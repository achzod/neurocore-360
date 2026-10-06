import assert from "node:assert/strict";
import { getAllArticles } from "../client/src/data/blogArticles";
import { BLOG_CATEGORIES } from "../client/src/data/blogTypes";
import { getBlogDocumentTitle, getBlogIntentConversion } from "../client/src/pages/BlogArticle";

const TARGET_SLUGS = [
  "meilleurs-peptides-performance-sportive",
  "pct-sarms-protocole-complet",
  "rad-140-testolone-guide-complet",
] as const;

const expected = {
  "meilleurs-peptides-performance-sportive": {
    seoTitle: "Peptides musculation : 9 options, effets et risques",
    category: "hormones",
    campaign: "peptides_performance_preview",
    destination: "/peptides-preview",
  },
  "pct-sarms-protocole-complet": {
    seoTitle: "PCT après SARMs : relance, analyses et risques",
    category: "sarms",
    campaign: "pct_sarms_blood_analysis",
    destination: "/offers/blood-analysis",
  },
  "rad-140-testolone-guide-complet": {
    seoTitle: "RAD-140 (Testolone) : effets, risques et PCT",
    category: "sarms",
    campaign: "rad140_blood_analysis",
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
  `${nonTargetArticle.title} | APEXLABS Blog`,
  "Le titre hydraté des articles hors cible doit rester identique au SSR",
);

for (const article of targetArticles) {
  const rules = expected[article.slug as keyof typeof expected];
  assert.equal(article.seoTitle, rules.seoTitle);
  assert.ok(article.seoTitle.length <= 60, `${article.slug}: titre SEO trop long`);
  assert.ok(article.metaDescription, `${article.slug}: meta description manquante`);
  assert.ok(
    article.metaDescription.length >= 120 && article.metaDescription.length <= 155,
    `${article.slug}: meta description hors plage 120-155 caractères`,
  );
  assert.equal(article.category, rules.category);
  assert.ok(supportedCategories.has(article.category), `${article.slug}: catégorie non supportée`);

  const conversion = getBlogIntentConversion(article);
  assert.ok(conversion.href.startsWith(rules.destination));
  assert.ok(conversion.href.includes("utm_source=blog"));
  assert.ok(conversion.href.includes("utm_medium=article_cta"));
  assert.ok(conversion.href.includes(`utm_campaign=${rules.campaign}`));

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
assert.ok(peptideConversion.offerHref?.includes("utm_campaign=peptides_performance_offer"));
assert.ok(peptideConversion.offerHref?.startsWith("/offers/peptides-engine"));

const campaigns = targetArticles.map((article) => {
  const url = new URL(getBlogIntentConversion(article).href, "https://apexlabs.achzodcoaching.com");
  return url.searchParams.get("utm_campaign");
});
assert.equal(new Set(campaigns).size, TARGET_SLUGS.length, "Chaque page doit avoir un UTM distinct");

console.log(`SEO gagnants: ${targetArticles.length} articles validés`);
