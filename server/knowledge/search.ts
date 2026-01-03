/**
 * NEUROCORE 360 - Knowledge Search Integration
 * Intègre la base de connaissances dans la génération de rapports
 */

import { searchArticles, ScrapedArticle } from "./storage";

/**
 * Patterns de recherche par symptôme/problématique
 */
export const SEARCH_PATTERNS: Record<string, string[]> = {
  // Énergie & Fatigue
  fatigue: ["fatigue", "cortisol", "énergie", "energy", "thyroïde", "thyroid", "fer", "iron", "mitochondrie", "atp", "b12"],
  energie_basse: ["low energy", "fatigue chronique", "burnout", "surmenage", "adrenal"],

  // Sommeil
  sommeil: ["sommeil", "sleep", "mélatonine", "melatonin", "circadien", "circadian", "gaba", "magnésium", "adenosine", "insomnie"],
  reveils_nocturnes: ["night waking", "réveil nocturne", "cortisol nocturne", "glycémie nuit"],

  // Hormones
  testosterone: ["testosterone", "testostérone", "libido", "shbg", "dht", "lh", "fsh"],
  cortisol: ["cortisol", "hpa", "stress", "adaptogènes", "ashwagandha", "rhodiola", "surrénales"],
  thyroide: ["thyroïde", "t3", "t4", "tsh", "iode", "sélénium", "hypothyroïdie"],

  // Composition corporelle
  perte_gras: ["fat loss", "perte gras", "métabolisme", "metabolism", "t3", "insuline", "leptine", "déficit", "neat", "thermogenèse"],
  prise_muscle: ["muscle", "hypertrophie", "hypertrophy", "protéines", "protein", "mtor", "leucine", "anabolisme", "recovery"],

  // Performance
  performance: ["vo2max", "endurance", "performance", "créatine", "creatine", "béta-alanine", "périodisation", "training"],
  recuperation: ["récupération", "recovery", "hrv", "sommeil", "inflammation", "oméga-3", "omega-3"],

  // Mental & Focus
  focus: ["focus", "concentration", "dopamine", "nootropiques", "nootropics", "caféine", "caffeine", "acétylcholine", "l-tyrosine"],
  stress_mental: ["stress", "anxiété", "anxiety", "gaba", "l-théanine", "magnésium", "ashwagandha"],

  // Digestion
  digestion: ["digestion", "microbiome", "gut", "sibo", "enzymes", "acidité", "perméabilité", "probiotiques"],
  ballonnements: ["bloating", "ballonnements", "fodmap", "sibo", "dysbiose"],

  // Cardiovasculaire
  cardio: ["cardiovasculaire", "cardio", "coeur", "heart", "zone2", "vo2max", "endurance", "hiit"],
  hrv: ["hrv", "heart rate variability", "variabilité cardiaque", "système nerveux autonome", "parasympathique"],
};

/**
 * Extrait les mots-clés pertinents du profil utilisateur
 */
export function extractKeywordsFromProfile(responses: Record<string, any>): string[] {
  const keywords: Set<string> = new Set();

  // Mapping réponses → patterns de recherche
  const responsePatterns: Record<string, string[]> = {
    // Objectifs
    "perte-gras": ["perte_gras"],
    "prise-muscle": ["prise_muscle"],
    "recomposition": ["perte_gras", "prise_muscle"],
    "performance": ["performance"],
    "sante": ["recuperation", "sommeil"],

    // Énergie
    "energie-basse": ["fatigue", "energie_basse"],
    "coup-fatigue": ["fatigue", "cortisol"],

    // Sommeil
    "sommeil-mauvais": ["sommeil"],
    "reveils-nocturnes": ["reveils_nocturnes", "sommeil"],
    "insomnie": ["sommeil"],

    // Stress
    "stress-eleve": ["stress_mental", "cortisol"],
    "anxiete": ["stress_mental"],

    // Digestion
    "ballonnements": ["ballonnements", "digestion"],
    "transit-lent": ["digestion"],
    "reflux": ["digestion"],

    // Hormones
    "libido-basse": ["testosterone"],
    "fatigue-chronique": ["thyroide", "fatigue"],
  };

  // Analyser les réponses
  for (const [key, value] of Object.entries(responses)) {
    if (typeof value === "string") {
      const pattern = responsePatterns[value];
      if (pattern) {
        pattern.forEach(p => {
          const searchTerms = SEARCH_PATTERNS[p];
          if (searchTerms) {
            searchTerms.forEach(t => keywords.add(t));
          }
        });
      }

      // Détection directe dans la valeur
      const lowerValue = value.toLowerCase();
      for (const [patternKey, terms] of Object.entries(SEARCH_PATTERNS)) {
        if (terms.some(t => lowerValue.includes(t))) {
          terms.forEach(t => keywords.add(t));
        }
      }
    }

    // Check for specific response keys
    if (key.includes("sommeil") || key.includes("sleep")) {
      SEARCH_PATTERNS.sommeil.forEach(t => keywords.add(t));
    }
    if (key.includes("energie") || key.includes("fatigue")) {
      SEARCH_PATTERNS.fatigue.forEach(t => keywords.add(t));
    }
    if (key.includes("stress") || key.includes("anxie")) {
      SEARCH_PATTERNS.stress_mental.forEach(t => keywords.add(t));
    }
    if (key.includes("digest") || key.includes("ballonne")) {
      SEARCH_PATTERNS.digestion.forEach(t => keywords.add(t));
    }
    if (key.includes("hrv")) {
      SEARCH_PATTERNS.hrv.forEach(t => keywords.add(t));
    }
  }

  return Array.from(keywords).slice(0, 30); // Limit to 30 keywords
}

/**
 * Recherche les connaissances pertinentes pour un profil
 */
export async function searchKnowledgeForProfile(
  responses: Record<string, any>,
  limit: number = 5
): Promise<{
  keywords: string[];
  articles: ScrapedArticle[];
  context: string;
}> {
  const keywords = extractKeywordsFromProfile(responses);

  if (keywords.length === 0) {
    return { keywords: [], articles: [], context: "" };
  }

  const articles = await searchArticles(keywords, limit);

  // Build context string for AI prompt
  const context = articles
    .map(a => {
      const sourceLabel = {
        huberman: "Huberman Lab",
        sbs: "Stronger By Science",
        applied_metabolics: "Applied Metabolics",
        newsletter: "ACHZOD Newsletter"
      }[a.source] || a.source;

      return `[Source: ${sourceLabel}]
Titre: ${a.title}
Catégorie: ${a.category || "N/A"}

${a.content.substring(0, 3000)}`;
    })
    .join("\n\n---\n\n");

  return { keywords, articles, context };
}

/**
 * Recherche ciblée pour une section spécifique du rapport
 */
export async function searchForSection(
  sectionType: string,
  limit: number = 3
): Promise<ScrapedArticle[]> {
  const sectionKeywords: Record<string, string[]> = {
    "executive-summary": ["optimisation", "performance", "santé", "health"],
    "sommeil-recuperation": ["sommeil", "sleep", "récupération", "recovery", "hrv", "mélatonine"],
    "hormones": ["testosterone", "cortisol", "hormone", "thyroïde", "shbg"],
    "metabolisme-nutrition": ["métabolisme", "nutrition", "protéines", "glucides", "calories"],
    "entrainement": ["training", "entraînement", "hypertrophie", "performance", "périodisation"],
    "cardiovasculaire": ["cardio", "vo2max", "zone2", "endurance", "hiit"],
    "digestion-microbiote": ["digestion", "microbiome", "probiotiques", "gut", "sibo"],
    "supplements": ["supplément", "supplement", "vitamines", "magnésium", "créatine"],
    "stress-mental": ["stress", "cortisol", "anxiété", "dopamine", "adaptogènes"],
    "lifestyle": ["lifestyle", "lumière", "écrans", "soleil", "douche froide"],
  };

  const keywords = sectionKeywords[sectionType] || ["santé", "optimisation"];
  return searchArticles(keywords, limit);
}

/**
 * Génère le contexte de connaissances pour un prompt IA
 */
export async function generateKnowledgeContext(
  responses: Record<string, any>,
  sectionType?: string
): Promise<string> {
  let articles: ScrapedArticle[] = [];

  if (sectionType) {
    articles = await searchForSection(sectionType, 3);
  } else {
    const result = await searchKnowledgeForProfile(responses, 5);
    articles = result.articles;
  }

  if (articles.length === 0) {
    return "";
  }

  const contextHeader = `
CONNAISSANCES PERTINENTES (utilise ces informations pour enrichir ton analyse):
=============================================================================
`;

  const contextBody = articles
    .map(a => {
      const sourceLabel = {
        huberman: "[Huberman Lab]",
        sbs: "[Stronger By Science]",
        applied_metabolics: "[Applied Metabolics]",
        newsletter: "[ACHZOD]"
      }[a.source] || `[${a.source}]`;

      return `${sourceLabel} ${a.title}
${a.content.substring(0, 2500)}`;
    })
    .join("\n\n---\n\n");

  return contextHeader + contextBody + "\n\n=============================================================================\n";
}
