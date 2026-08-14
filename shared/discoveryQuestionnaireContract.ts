export const DISCOVERY_REQUIRED_RESPONSE_KEYS = Object.freeze([
  "sexe", "prenom", "age", "taille", "poids", "objectif",
  "traitement-medical", "diagnostic-medical", "tca-historique",
  "heures-sommeil", "qualite-sommeil", "endormissement", "reveil-fatigue",
  "reveils-nocturnes", "heure-coucher",
  "niveau-stress", "anxiete", "concentration", "humeur-fluctuation",
  "energie-matin", "energie-aprem", "coup-fatigue", "envies-sucre", "motivation", "thermogenese",
  "digestion-qualite", "ballonnements", "transit", "reflux", "intolerance",
  "sport-frequence", "intensite", "recuperation", "courbatures", "performance-evolution",
  "nb-repas", "proteines-jour", "eau-jour", "aliments-transformes", "sucres-ajoutes", "alcool",
  "cafe-jour", "tabac", "temps-ecran", "exposition-soleil", "heures-assis",
  "engagement-niveau", "motivation-principale", "consignes-strictes", "temps-training-semaine",
] as const);

export const DISCOVERY_REQUIRED_RESPONSE_KEY_SET = new Set<string>(DISCOVERY_REQUIRED_RESPONSE_KEYS);

export const DISCOVERY_QUESTIONNAIRE_CONTRACT_VERSION_KEY = "_discoveryQuestionnaireVersion";
export const DISCOVERY_QUESTIONNAIRE_CURRENT_VERSION = 2 as const;

export const DISCOVERY_LEGACY_DOMAIN_KEYS = Object.freeze({
  sommeil: ["heures-sommeil", "qualite-sommeil", "endormissement", "reveil-fatigue", "reveils-nocturnes", "heure-coucher"],
  stress: ["niveau-stress", "anxiete", "concentration", "irritabilite", "humeur-fluctuation", "gestion-stress"],
  energie: ["energie-matin", "energie-aprem", "coup-fatigue", "envies-sucre", "motivation", "thermogenese"],
  digestion: ["digestion-qualite", "ballonnements", "transit", "reflux", "energie-post-repas"],
  training: ["sport-frequence", "type-sport", "intensite", "recuperation", "courbatures", "performance-evolution"],
  nutrition: ["nb-repas", "petit-dejeuner", "proteines-jour", "eau-jour", "regime-alimentaire", "aliments-transformes", "sucres-ajoutes", "alcool"],
  lifestyle: ["cafe-jour", "tabac", "temps-ecran", "exposition-soleil", "profession", "heures-assis"],
  mindset: ["engagement-niveau", "motivation-principale", "consignes-strictes", "temps-training-semaine"],
} as const);

export type DiscoveryQuestionnaireDomain = keyof typeof DISCOVERY_LEGACY_DOMAIN_KEYS;

// These thresholds are the minimum evidence needed to score a historical
// questionnaire without interpreting absence as a positive answer. They are
// derived from the production legacy schemas; any thinner record is held for
// review before a provider call.
export const DISCOVERY_LEGACY_MIN_DOMAIN_COVERAGE: Readonly<Record<DiscoveryQuestionnaireDomain, number>> = Object.freeze({
  sommeil: 4,
  stress: 5,
  energie: 3,
  digestion: 3,
  training: 2,
  nutrition: 8,
  lifestyle: 6,
  mindset: 2,
});

export interface DiscoveryQuestionnaireCoverage {
  version: 1 | 2;
  confidence: "complete" | "legacy_partial";
  unknownKeys: string[];
  domainCoverage: Record<DiscoveryQuestionnaireDomain, { answered: number; total: number }>;
}

export function getDiscoveryQuestionnaireVersion(responses: Record<string, unknown>): 1 | 2 | null {
  const value = responses[DISCOVERY_QUESTIONNAIRE_CONTRACT_VERSION_KEY];
  if (value === undefined || value === null || value === "") return 1;
  if (value === DISCOVERY_QUESTIONNAIRE_CURRENT_VERSION || value === String(DISCOVERY_QUESTIONNAIRE_CURRENT_VERSION)) return 2;
  return null;
}

export function getDiscoveryQuestionnaireCoverage(responses: Record<string, unknown>): DiscoveryQuestionnaireCoverage {
  const version = getDiscoveryQuestionnaireVersion(responses) ?? 1;
  const domainCoverage = Object.fromEntries(Object.entries(DISCOVERY_LEGACY_DOMAIN_KEYS).map(([domain, keys]) => [
    domain,
    { answered: keys.filter((key) => hasDiscoveryRequiredResponseValue(responses[key])).length, total: keys.length },
  ])) as DiscoveryQuestionnaireCoverage["domainCoverage"];
  const unknownKeys = version === 1
    ? [...new Set(Object.values(DISCOVERY_LEGACY_DOMAIN_KEYS).flat().filter((key) => !hasDiscoveryRequiredResponseValue(responses[key])))].sort()
    : [];
  return {
    version,
    confidence: version === 2 ? "complete" : "legacy_partial",
    unknownKeys,
    domainCoverage,
  };
}

export function hasDiscoveryRequiredResponseValue(value: unknown): boolean {
  if (value === undefined || value === null) return false;
  if (Array.isArray(value)) return value.length > 0;
  return typeof value !== "string" || value.trim().length > 0;
}
