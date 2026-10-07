export const BLOG_ARTICLE_REDIRECTS = {
  "les-squats-sont-ils-mauvais-pour-vos-genoux": "squats-mauvais-genoux-mythe",
  "les-souleves-de-terre-sont-ils-dangereux": "souleve-terre-dangereux",
  "des-souleves-de-terre-le-jour-de-larriere": "souleve-terre-jour-dos",
  "soulevé-terre-dangereux": "souleve-terre-dangereux",
  "soulevé-terre-jour-dos": "souleve-terre-jour-dos",
  "erreurs-courantes-liees-aux-supplements": "erreurs-supplements-courantes",
  "periodisation-en-musculation": "periodisation-musculation",
  "calories-et-bilan-energetique": "calories-balance-energetique",
  "collagene-peau-articulations-guide": "collagene-peau-articulations-guide-complet",
  "ischio-jambiers-dans-le-squat": "ischio-jambiers-squat-activation",
  "amplitude-de-mouvement-et-croissance": "amplitude-mouvement-croissance",
  "entrainement-des-types-de-fibres-musculaires": "entrainer-types-fibres-musculaires",
  "potentiel-genetique": "potentiel-genetique-musculation",
  "lats-dans-le-developpe-couche": "dorsaux-developpe-couche-mythe",
  "proteines-vegetales-ou-animales": "proteine-vegetale-animale",
  "biomecanique-et-croissance": "biomecanique-croissance-musculaire",
  "sentrainer-jusqua-lechec": "entrainement-echec-necessaire",
  "differences-entre-les-sexes-dans-la-formation": "differences-genre-entrainement",
  "hypertrophie-vs-hyperplasie-musculaire": "hypertrophie-vs-hyperplasie",
  "strategies-stimulant-le-metabolisme": "strategies-boost-metabolisme",
  "variation-dexercice": "variation-exercices-necessaire",
  "surcharge-progressive": "surcharge-progressive-guide",
  "quest-ce-qui-cause-la-croissance": "causes-croissance-musculaire",
  "excentriques-et-croissance": "excentriques-croissance-musculaire",
  "yam-the-new-era-of-supplements-mcu-20-ACHZOD-748":
    "yam-the-new-era-of-supplements-mcu-20-achzod-748",
} as const;

export const BLOG_REDIRECT_SLUGS = new Set<string>(
  Object.keys(BLOG_ARTICLE_REDIRECTS),
);

// URLs signalees comme inconnues/detectees dans le dernier export GSC et qui
// restent canoniques. Elles sont exposees directement depuis le hub /blog afin
// de ne pas dependre uniquement d'une pagination ou d'un rendu client.
export const BLOG_INDEXATION_PRIORITY_SLUGS = [
  "excentriques-croissance-musculaire",
  "le-livre-de-regles-du-partenaire-de-formation",
  "nerf-vague-hrv-superpower",
  "sarms-vs-steroides-comparatif",
  "stack-sarms-seche-cutting",
  "techniques-intensification-guide",
  "yam-the-new-era-of-supplements-mcu-20-achzod-748",
] as const;

export const BLOG_CATEGORY_SLUGS = [
  "musculation",
  "sarms",
  "supplements",
  "hormones",
  "sommeil",
  "stress",
  "nutrition",
  "performance",
  "metabolisme",
  "longevite",
  "biohacking",
  "femmes",
] as const;

export function isCanonicalBlogArticleSlug(slug: string): boolean {
  return !BLOG_REDIRECT_SLUGS.has(slug);
}
