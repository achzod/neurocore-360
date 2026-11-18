/**
 * Discovery Scan v3 ("coach") narrative.
 *
 * The provider receives the questionnaire answers WITHOUT identity data
 * (no first name, email, Instagram, phone), translated into natural French,
 * plus the deterministic scores and detected signals. It writes the
 * personalised prose itself (tutoiement, voix "je" d'Ach). The first name is
 * re-inserted locally through the [PRENOM] placeholder.
 *
 * Everything in this module is pure and deterministic: payload building,
 * the strict JSON schema, the fail-closed validator and the HTML rendering.
 * The provider call and persistence live in discovery-scan.ts.
 */
import { createHash } from "node:crypto";

export const DISCOVERY_COACH_VERSION = "discovery-coach-v3";
export const DISCOVERY_COACH_FIRST_NAME_TOKEN = "[PRENOM]";
export const DISCOVERY_COACH_MAX_OUTPUT_TOKENS = 6_000;
export const DISCOVERY_COACH_MAX_INPUT_CHARS = 24_000;
/** One provider call is capped well below this (input <= ~6k tokens at
 * $5/M + output <= 6k tokens at $30/M = ~$0.21). */
export const DISCOVERY_COACH_MAX_COST_PER_CALL_USD = 0.25;
/** Initial attempt + exactly one corrective attempt. */
export const DISCOVERY_COACH_MAX_ATTEMPTS = 2;
export const DISCOVERY_COACH_PROMO_CODE = "DISCOVERY20";
export const DISCOVERY_COACH_PROMO_VALIDITY_DAYS = 7;

export const DISCOVERY_COACH_DOMAINS = [
  "sommeil", "stress", "energie", "digestion", "training", "nutrition", "lifestyle", "mindset",
] as const;
export type DiscoveryCoachDomain = typeof DISCOVERY_COACH_DOMAINS[number];

export const DISCOVERY_COACH_DOMAIN_LABELS: Readonly<Record<DiscoveryCoachDomain, string>> = Object.freeze({
  sommeil: "Sommeil",
  stress: "Stress",
  energie: "Énergie",
  digestion: "Digestion",
  training: "Entraînement",
  nutrition: "Nutrition",
  lifestyle: "Style de vie",
  mindset: "Mental",
});

export const DISCOVERY_COACH_SECTION_IDS = [
  "intro", "lecture", "freins", "actions", "projection", "domaines", "offre",
] as const;

type Responses = Record<string, unknown>;
type Gender = "f" | "m" | "n";

const g = (gender: Gender, masculine: string, feminine: string): string => (
  gender === "f" ? feminine : gender === "m" ? masculine : `${masculine}(e)`
);

/** Natural French phrase for every typed questionnaire value. A value with no
 * phrase is never sent nor rendered (it can only come from an invalid
 * questionnaire, which is rejected upstream). */
function phraseTable(gender: Gender): Record<string, Record<string, string>> {
  return {
    objectif: {
      "perte-graisse": "perdre du gras",
      "prise-muscle": "prendre du muscle",
      recomposition: "perdre du gras et prendre du muscle en même temps",
      performance: "gagner en performance",
      sante: "améliorer ta santé globale",
      energie: "retrouver de l'énergie",
    },
    "plateau-metabolique": {
      jamais: `jamais ${g(gender, "bloqué", "bloquée")} sur un plateau`,
      "une-fois": `déjà ${g(gender, "bloqué", "bloquée")} une fois sur un plateau malgré tes efforts`,
      plusieurs: `${g(gender, "bloqué", "bloquée")} plusieurs fois sur un plateau malgré tes efforts`,
      actuellement: `${g(gender, "bloqué", "bloquée")} sur un plateau en ce moment`,
    },
    "experience-sportive": {
      debutant: `${g(gender, "débutant", "débutante")} en sport`,
      intermediaire: "entre 1 et 3 ans d'expérience sportive",
      avance: "plus de 3 ans d'expérience sportive",
      expert: "plus de 5 ans d'expérience sportive",
    },
    "heures-sommeil": {
      "moins-5": "moins de 5 heures de sommeil par nuit",
      "5-6": "entre 5 et 6 heures de sommeil par nuit",
      "6-7": "entre 6 et 7 heures de sommeil par nuit",
      "7-8": "entre 7 et 8 heures de sommeil par nuit",
      "8-9": "entre 8 et 9 heures de sommeil par nuit",
      "8+": "8 heures de sommeil ou plus par nuit",
      "9+": "plus de 9 heures de sommeil par nuit",
    },
    "qualite-sommeil": {
      excellente: "un sommeil d'excellente qualité",
      bonne: "un sommeil de bonne qualité",
      moyenne: "un sommeil de qualité moyenne",
      mauvaise: "un sommeil de mauvaise qualité",
    },
    endormissement: {
      jamais: "aucune difficulté à t'endormir",
      parfois: "parfois du mal à t'endormir",
      souvent: "souvent du mal à t'endormir",
      toujours: "toujours du mal à t'endormir",
      rapide: "un endormissement rapide",
      normal: "un endormissement normal",
      long: "un endormissement long",
      "tres-long": "un endormissement très long",
    },
    "reveil-fatigue": {
      jamais: `jamais ${g(gender, "fatigué", "fatiguée")} au réveil`,
      rarement: `rarement ${g(gender, "fatigué", "fatiguée")} au réveil`,
      parfois: `parfois ${g(gender, "fatigué", "fatiguée")} au réveil`,
      souvent: `souvent ${g(gender, "fatigué", "fatiguée")} au réveil`,
      toujours: `toujours ${g(gender, "fatigué", "fatiguée")} au réveil`,
    },
    "reveils-nocturnes": {
      jamais: "pas de réveil pendant la nuit",
      rarement: "rarement des réveils pendant la nuit",
      parfois: "des réveils nocturnes de temps en temps",
      souvent: "des réveils nocturnes fréquents",
      "chaque-nuit": "des réveils chaque nuit",
      toujours: "des réveils chaque nuit",
    },
    "heure-coucher": {
      "avant-22h": "un coucher avant 22 h",
      "22h-23h": "un coucher entre 22 h et 23 h",
      "23h-00h": "un coucher entre 23 h et minuit",
      "00h-1h": "un coucher entre minuit et 1 h",
      "apres-00h": "un coucher après minuit",
      "apres-1h": "un coucher après 1 h du matin",
    },
    "niveau-stress": {
      aucun: "aucun stress ressenti",
      leger: "un stress léger",
      "tres-bas": "un stress très bas",
      bas: "un stress plutôt bas",
      modere: "un stress modéré",
      eleve: "un stress élevé",
      "tres-eleve": "un stress très élevé",
      extreme: "un stress extrême",
    },
    anxiete: {
      aucune: "pas d'anxiété au quotidien",
      legere: "une anxiété légère",
      moderee: "une anxiété modérée",
      forte: "une anxiété forte",
      jamais: "jamais d'anxiété au quotidien",
      rarement: "rarement de l'anxiété au quotidien",
      parfois: "de l'anxiété de temps en temps",
      souvent: "de l'anxiété fréquente",
    },
    concentration: {
      excellente: "une excellente concentration",
      bonne: "une bonne concentration",
      moyenne: "une concentration moyenne",
      mauvaise: "du mal à te concentrer",
      difficile: "du mal à te concentrer",
    },
    irritabilite: {
      jamais: `jamais ${g(gender, "irritable", "irritable")}`,
      parfois: "parfois irritable",
      souvent: "souvent irritable",
      "tres-souvent": "très souvent irritable",
    },
    "humeur-fluctuation": {
      stable: "une humeur stable",
      parfois: "des variations d'humeur de temps en temps",
      souvent: "des variations d'humeur fréquentes",
      constamment: "une humeur qui varie tout le temps",
    },
    "energie-matin": {
      excellente: "une énergie excellente le matin",
      bonne: "une bonne énergie le matin",
      moyenne: "une énergie moyenne le matin",
      faible: "peu d'énergie le matin",
      "tres-faible": "très peu d'énergie le matin",
    },
    "energie-aprem": {
      stable: "une énergie stable l'après-midi",
      "legere-baisse": "une légère baisse d'énergie l'après-midi",
      "baisse-moderee": "une baisse d'énergie modérée l'après-midi",
      crash: "un gros coup de mou l'après-midi",
      "tres-bas": "une énergie très basse l'après-midi",
      bas: "une énergie basse l'après-midi",
      moyen: "une énergie moyenne l'après-midi",
    },
    "coup-fatigue": {
      jamais: "pas de coup de fatigue",
      parfois: "des coups de fatigue de temps en temps",
      souvent: "des coups de fatigue fréquents",
      quotidien: "des coups de fatigue tous les jours",
      toujours: "des coups de fatigue tous les jours",
    },
    "envies-sucre": {
      jamais: "pas d'envie de sucre",
      rarement: "rarement des envies de sucre",
      parfois: "des envies de sucre de temps en temps",
      souvent: "des envies de sucre fréquentes",
      constamment: "des envies de sucre en permanence",
    },
    motivation: {
      "tres-eleve": "une motivation très haute",
      eleve: "une bonne motivation",
      bon: "une bonne motivation",
      excellent: "une excellente motivation",
      moyen: "une motivation moyenne",
      bas: "une motivation basse",
      "tres-bas": "une motivation très basse",
    },
    thermogenese: {
      non: `pas spécialement ${g(gender, "frileux", "frileuse")}`,
      jamais: "jamais froid",
      parfois: "facilement froid de temps en temps",
      souvent: "souvent froid",
      toujours: "tout le temps froid",
    },
    "digestion-qualite": {
      excellente: "une digestion excellente",
      bonne: "une bonne digestion",
      moyenne: "une digestion moyenne",
      mauvaise: "une digestion difficile",
    },
    ballonnements: {
      jamais: "pas de ballonnements",
      parfois: "des ballonnements de temps en temps",
      souvent: "des ballonnements fréquents",
      toujours: "des ballonnements en permanence",
      "apres-repas": "des ballonnements après chaque repas",
    },
    transit: {
      "tres-regulier": "un transit très régulier",
      regulier: "un transit régulier",
      normal: "un transit régulier",
      variable: "un transit variable",
      irregulier: "un transit irrégulier",
      constipe: "un transit lent, souvent avec de la constipation",
      constipation: "un transit lent, souvent avec de la constipation",
      rapide: "un transit rapide",
      diarrhee: "un transit souvent trop rapide",
    },
    reflux: {
      jamais: "pas de reflux",
      rarement: "rarement du reflux",
      parfois: "du reflux de temps en temps",
      souvent: "du reflux fréquent",
    },
    "energie-post-repas": {
      stable: "une énergie stable après les repas",
      "legere-baisse": "une petite baisse d'énergie après les repas",
      somnolence: "de la somnolence après les repas",
      crash: "un gros coup de barre après les repas",
    },
    "sport-frequence": {
      "0": "aucune séance de sport dans la semaine",
      "1-2": "1 à 2 séances de sport par semaine",
      "3-4": "3 à 4 séances de sport par semaine",
      "5+": "5 séances de sport ou plus par semaine",
    },
    intensite: {
      leger: "une intensité d'effort légère",
      modere: "une intensité d'effort modérée",
      intense: "une intensité d'effort élevée",
      extreme: "une intensité d'effort extrême",
    },
    recuperation: {
      excellente: "une excellente récupération",
      bonne: "une bonne récupération",
      moyenne: "une récupération moyenne",
      mauvaise: "une récupération difficile",
    },
    courbatures: {
      jamais: "pas de courbatures",
      parfois: "des courbatures de temps en temps",
      souvent: "des courbatures fréquentes",
      toujours: "des courbatures quasiment tout le temps",
    },
    "performance-evolution": {
      progression: "des performances qui progressent",
      stagnation: "des performances qui stagnent",
      regression: "des performances qui reculent",
    },
    "nb-repas": {
      "1-2": "1 à 2 repas par jour",
      "3": "3 repas par jour",
      "4-5": "4 à 5 repas par jour",
      "6+": "6 repas ou plus par jour",
    },
    "petit-dejeuner": {
      toujours: "un petit-déjeuner tous les jours",
      souvent: "un petit-déjeuner la plupart du temps",
      parfois: "un petit-déjeuner seulement de temps en temps",
      jamais: "pas de petit-déjeuner",
    },
    "proteines-jour": {
      faible: "peu de protéines dans tes repas",
      moyenne: "un apport en protéines moyen",
      moyen: "un apport en protéines moyen",
      bonne: "un bon apport en protéines",
      bon: "un bon apport en protéines",
      haute: "beaucoup de protéines",
      eleve: "beaucoup de protéines",
      inconnu: "aucune idée de la quantité de protéines que tu manges",
    },
    "eau-jour": {
      "moins-1L": "moins d'1 litre d'eau par jour",
      "1-1.5L": "entre 1 et 1,5 litre d'eau par jour",
      "1.5-2L": "entre 1,5 et 2 litres d'eau par jour",
      "2-3L": "entre 2 et 3 litres d'eau par jour",
      "3L+": "plus de 3 litres d'eau par jour",
    },
    "regime-alimentaire": {
      aucun: "pas de régime alimentaire particulier",
      vegetarien: "une alimentation végétarienne",
      vegan: "une alimentation végétalienne",
      keto: "une alimentation cétogène",
      paleo: "une alimentation paléo",
      mediteraneen: "une alimentation de type méditerranéen",
      "jeune-intermittent": "du jeûne intermittent",
    },
    "aliments-transformes": {
      jamais: "pas d'aliments ultra-transformés",
      rarement: "rarement des aliments ultra-transformés",
      parfois: "des aliments ultra-transformés de temps en temps",
      souvent: "souvent des aliments ultra-transformés",
    },
    "sucres-ajoutes": {
      zero: "aucun sucre ajouté",
      faible: "peu de sucres ajoutés",
      moderee: "des sucres ajoutés en quantité modérée",
      modere: "des sucres ajoutés en quantité modérée",
      elevee: "beaucoup de sucres ajoutés",
      eleve: "beaucoup de sucres ajoutés",
    },
    alcool: {
      "0": "pas d'alcool",
      "1-3": "1 à 3 verres d'alcool par semaine",
      "4-7": "4 à 7 verres d'alcool par semaine",
      "8+": "8 verres d'alcool ou plus par semaine",
      "8-14": "8 à 14 verres d'alcool par semaine",
      "15+": "15 verres d'alcool ou plus par semaine",
    },
    "cafe-jour": {
      "0": "pas de café",
      "1-2": "1 à 2 cafés par jour",
      "3-4": "3 à 4 cafés par jour",
      "5+": "5 cafés ou plus par jour",
    },
    tabac: {
      non: `${g(gender, "non-fumeur", "non-fumeuse")}`,
      "ex-fumeur": `${g(gender, "ancien fumeur", "ancienne fumeuse")}`,
      occasionnel: "du tabac de temps en temps",
      quotidien: "du tabac tous les jours",
    },
    "temps-ecran": {
      "moins-1h": "moins d'1 heure d'écran par jour en dehors du travail",
      "moins-2h": "moins de 2 heures d'écran par jour en dehors du travail",
      "1-2h": "1 à 2 heures d'écran par jour en dehors du travail",
      "2-4h": "2 à 4 heures d'écran par jour en dehors du travail",
      "4-6h": "4 à 6 heures d'écran par jour en dehors du travail",
      "6h+": "plus de 6 heures d'écran par jour en dehors du travail",
    },
    "exposition-soleil": {
      rare: "rarement au soleil",
      rarement: "rarement au soleil",
      parfois: "au soleil de temps en temps",
      regulier: "régulièrement au soleil",
    },
    profession: {
      bureau: `un travail de bureau, ${g(gender, "assis", "assise")}`,
      terrain: "un travail de terrain",
      mixte: "un travail mixte",
      actif: "un travail physique",
      teletravail: "du télétravail",
      etudiant: "des études",
      autre: "un autre type d'activité",
    },
    "heures-assis": {
      "moins-4h": `moins de 4 heures ${g(gender, "assis", "assise")} par jour`,
      "4-6h": `4 à 6 heures ${g(gender, "assis", "assise")} par jour`,
      "6-8h": `6 à 8 heures ${g(gender, "assis", "assise")} par jour`,
      "8-10h": `8 à 10 heures ${g(gender, "assis", "assise")} par jour`,
      "8h+": `plus de 8 heures ${g(gender, "assis", "assise")} par jour`,
      "10h+": `plus de 10 heures ${g(gender, "assis", "assise")} par jour`,
    },
    "engagement-niveau": {
      "1-3": "un engagement de 1 à 3 sur 10",
      "4-5": "un engagement de 4 à 5 sur 10",
      "6-7": "un engagement de 6 à 7 sur 10",
      "8-9": "un engagement de 8 à 9 sur 10",
      "10": "un engagement de 10 sur 10",
    },
    "motivation-principale": {
      esthetique: "l'esthétique comme moteur principal",
      performance: "la performance comme moteur principal",
      sante: "la santé comme moteur principal",
      confiance: "la confiance en toi comme moteur principal",
      mental: "le mental comme moteur principal",
    },
    "consignes-strictes": {
      non: "besoin de flexibilité plutôt que de consignes strictes",
      partiellement: `${g(gender, "prêt", "prête")} à suivre des consignes strictes en partie`,
      oui: `${g(gender, "prêt", "prête")} à suivre des consignes strictes`,
    },
    "temps-training-semaine": {
      "moins-2h": "moins de 2 heures dispo par semaine pour t'entraîner",
      "2-4h": "2 à 4 heures dispo par semaine pour t'entraîner",
      "4-6h": "4 à 6 heures dispo par semaine pour t'entraîner",
      "6h+": "plus de 6 heures dispo par semaine pour t'entraîner",
    },
  };
}

const ARRAY_PHRASES: Record<string, { items: Record<string, string>; none: string; prefix: string }> = {
  "gestion-stress": {
    items: { sport: "le sport", meditation: "la méditation", respiration: "la respiration", nature: "la nature", musique: "la musique" },
    none: "rien de particulier pour gérer ton stress",
    prefix: "tu gères ton stress avec ",
  },
  "type-sport": {
    items: {
      musculation: "musculation", cardio: "cardio", hiit: "fractionné intense", yoga: "yoga",
      "sport-collectif": "sport collectif", natation: "natation", course: "course à pied",
    },
    none: "aucune activité sportive pratiquée",
    prefix: "activités pratiquées : ",
  },
  intolerance: {
    items: { lactose: "lactose", gluten: "gluten", fodmap: "certains sucres fermentescibles", histamine: "histamine", autres: "autres aliments" },
    none: "aucune intolérance alimentaire déclarée",
    prefix: "intolérances déclarées : ",
  },
};

const ARRAY_NONE_VALUES = new Set(["aucun", "aucune", "rien"]);

/** Which answers feed which domain (provider payload + validation of the
 * answer ids a frein may cite). Medical, TCA and identity keys are absent. */
export const DISCOVERY_COACH_DOMAIN_KEYS: Readonly<Record<DiscoveryCoachDomain, readonly string[]>> = Object.freeze({
  sommeil: ["heures-sommeil", "qualite-sommeil", "endormissement", "reveils-nocturnes", "reveil-fatigue", "heure-coucher"],
  stress: ["niveau-stress", "anxiete", "concentration", "irritabilite", "humeur-fluctuation", "gestion-stress"],
  energie: ["energie-matin", "energie-aprem", "coup-fatigue", "envies-sucre", "motivation", "thermogenese"],
  digestion: ["digestion-qualite", "ballonnements", "transit", "reflux", "intolerance", "energie-post-repas"],
  training: ["sport-frequence", "type-sport", "intensite", "recuperation", "courbatures", "performance-evolution", "experience-sportive", "plateau-metabolique"],
  nutrition: ["nb-repas", "petit-dejeuner", "proteines-jour", "eau-jour", "regime-alimentaire", "aliments-transformes", "sucres-ajoutes", "alcool"],
  lifestyle: ["cafe-jour", "tabac", "temps-ecran", "exposition-soleil", "profession", "heures-assis"],
  mindset: ["engagement-niveau", "motivation-principale", "consignes-strictes", "temps-training-semaine"],
});

/** Free-text answers the provider may quote. */
export const DISCOVERY_COACH_FREE_TEXT_KEYS = [
  "ideal-6mois", "si-rien-change", "frustration-passee", "plus-grosse-peur",
] as const;

const FREE_TEXT_LABELS: Record<typeof DISCOVERY_COACH_FREE_TEXT_KEYS[number], string> = {
  "ideal-6mois": "Son idéal physique et mental dans 6 mois",
  "si-rien-change": "Où elle/il pense en être dans 1 an si rien ne change",
  "frustration-passee": "Ce qui l'a le plus frustré(e) dans ses essais précédents",
  "plus-grosse-peur": "Sa plus grosse peur si elle/il échoue",
};

function genderOf(responses: Responses): Gender {
  const sexe = String(responses.sexe || "").trim().toLowerCase();
  return sexe === "femme" ? "f" : sexe === "homme" ? "m" : "n";
}

export function describeDiscoveryAnswer(key: string, value: unknown, responses: Responses): string | null {
  const gender = genderOf(responses);
  if (Array.isArray(value)) {
    const spec = ARRAY_PHRASES[key];
    if (!spec) return null;
    const values = value.map((item) => String(item).trim()).filter(Boolean);
    if (values.length === 0) return null;
    if (values.every((item) => ARRAY_NONE_VALUES.has(item))) return spec.none;
    const labels = values.filter((item) => !ARRAY_NONE_VALUES.has(item)).map((item) => spec.items[item]).filter(Boolean);
    if (labels.length === 0) return null;
    const joined = labels.length === 1 ? labels[0]
      : `${labels.slice(0, -1).join(", ")} et ${labels[labels.length - 1]}`;
    return `${spec.prefix}${joined}`;
  }
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const phrase = phraseTable(gender)[key]?.[raw];
  return phrase || null;
}

const EMAIL_PATTERN = /[\p{L}\p{N}._%+-]+@[\p{L}\p{N}.-]+\.[\p{L}]{2,}/gu;
const URL_PATTERN = /(?:https?:\/\/|www\.)\S+/giu;
const PHONE_PATTERN = /(?:\+|00)?\d[\d .\-()]{7,}\d/g;
const HANDLE_PATTERN = /(^|\s)@[\w.]{2,}/g;

/** Strips identity data from a free-text answer before it reaches the provider. */
export function sanitizeDiscoveryFreeText(text: unknown, responses: Responses): string {
  let value = String(text ?? "").replace(/\s*\n+\s*/g, ", ").replace(/\s+/g, " ").trim();
  value = value.replace(EMAIL_PATTERN, "[email retiré]")
    .replace(URL_PATTERN, "[lien retiré]")
    .replace(PHONE_PATTERN, "[numéro retiré]")
    .replace(HANDLE_PATTERN, "$1[pseudo retiré]");
  const identityTokens = [responses.prenom, responses.nom, responses.instagram]
    .map((item) => String(item ?? "").replace(/^@/, "").trim())
    .filter((item) => item.length >= 2);
  for (const token of identityTokens) {
    const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    value = value.replace(new RegExp(`(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`, "giu"), "[prénom]");
  }
  value = value.replace(/^[,\s]+|[,\s]+$/g, "");
  return value.length > 320 ? `${value.slice(0, 317).trim()}...` : value;
}

export interface DiscoveryCoachBlockage {
  domain: string;
  title: string;
  severity: string;
}

export interface DiscoveryCoachSafety {
  strictEatingSafety: boolean;
  tcaMode: string;
  hasMedicalContext: boolean;
}

export interface DiscoveryCoachContext {
  responses: Responses;
  scoresByDomain: Record<string, number>;
  globalScore: number;
  blocages: DiscoveryCoachBlockage[];
  safety: DiscoveryCoachSafety;
}

export interface DiscoveryCoachPayload {
  objectif: string | null;
  motivationPrincipale: string | null;
  sexe: string | null;
  age: number | null;
  freeTexts: Partial<Record<typeof DISCOVERY_COACH_FREE_TEXT_KEYS[number], string>>;
  answers: Record<string, { domain: DiscoveryCoachDomain; phrase: string }>;
  scores: Record<DiscoveryCoachDomain, number>;
  globalScore10: number;
  signals: Array<{ domain: string; title: string; priority: string }>;
}

export function scoreTo10(score: number): number {
  return Math.round((Number(score) / 10) * 10) / 10;
}

export function buildDiscoveryCoachPayload(context: DiscoveryCoachContext): DiscoveryCoachPayload {
  const { responses } = context;
  const answers: DiscoveryCoachPayload["answers"] = {};
  for (const domain of DISCOVERY_COACH_DOMAINS) {
    for (const key of DISCOVERY_COACH_DOMAIN_KEYS[domain]) {
      if (key === "motivation-principale") continue;
      const phrase = describeDiscoveryAnswer(key, responses[key], responses);
      if (phrase) answers[key] = { domain, phrase };
    }
  }
  const motivation = describeDiscoveryAnswer("motivation-principale", responses["motivation-principale"], responses);
  if (motivation) answers["motivation-principale"] = { domain: "mindset", phrase: motivation };
  const freeTexts: DiscoveryCoachPayload["freeTexts"] = {};
  for (const key of DISCOVERY_COACH_FREE_TEXT_KEYS) {
    const value = sanitizeDiscoveryFreeText(responses[key], responses);
    if (value) freeTexts[key] = value;
  }
  const age = Number(responses.age);
  return {
    objectif: describeDiscoveryAnswer("objectif", responses.objectif, responses),
    motivationPrincipale: motivation,
    sexe: genderOf(responses) === "f" ? "femme" : genderOf(responses) === "m" ? "homme" : null,
    age: Number.isFinite(age) ? Math.round(age) : null,
    freeTexts,
    answers,
    scores: Object.fromEntries(DISCOVERY_COACH_DOMAINS.map((domain) => [
      domain, scoreTo10(context.scoresByDomain[domain] ?? 0),
    ])) as Record<DiscoveryCoachDomain, number>,
    globalScore10: scoreTo10(context.globalScore),
    signals: context.blocages.map((blocage) => ({
      domain: blocage.domain,
      title: blocage.title,
      priority: blocage.severity === "critique" ? "forte" : blocage.severity === "modere" ? "moyenne" : "légère",
    })),
  };
}

/** Identity keys that must never appear in the provider input. */
export const DISCOVERY_COACH_IDENTITY_KEYS = ["prenom", "email", "instagram", "telephone", "phone", "nom", "whatsapp"] as const;

export function findDiscoveryCoachIdentityLeaks(input: string, responses: Responses): string[] {
  const leaks: string[] = [];
  const haystack = input.normalize("NFKC").toLowerCase();
  for (const key of DISCOVERY_COACH_IDENTITY_KEYS) {
    const value = String(responses[key] ?? "").replace(/^@/, "").trim().toLowerCase();
    if (value.length >= 2 && new RegExp(`(?<![\\p{L}\\p{N}])${value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\p{L}\\p{N}])`, "u").test(haystack)) {
      leaks.push(`identity_leak:${key}`);
    }
  }
  if (EMAIL_PATTERN.test(input)) leaks.push("identity_leak:email_pattern");
  EMAIL_PATTERN.lastIndex = 0;
  return [...new Set(leaks)];
}

const SAFETY_INSTRUCTIONS_TCA = `CONSIGNE INTERNE CONFIDENTIELLE (ne la mentionne jamais, n'y fais jamais allusion) : cette personne a un historique de troubles alimentaires. Prudence maximale : aucune restriction, aucun aliment à supprimer, aucun chiffre de calories, de grammes, de portions ou de poids, pas de pesée, pas de mensurations, pas de photos du corps, pas de "déficit", pas de "régime", pas de "sèche". Ton bienveillant, axé sur la force, l'énergie, la régularité et le plaisir de bouger. Ne promets jamais un corps précis ("corps de mannequin", silhouette), reformule vers se sentir forte ou fort, en énergie et bien dans son corps.`;

const SAFETY_INSTRUCTIONS_MEDICAL = `CONSIGNE INTERNE CONFIDENTIELLE (ne la mentionne jamais) : un contexte médical a été déclaré. Aucune hypothèse médicale, aucun lien avec un traitement, aucun conseil sur un traitement.`;

export function buildDiscoveryCoachInstructions(safety: DiscoveryCoachSafety): string {
  return [
    `Tu es Ach (Achzod), coach sportif francophone. Tu écris toi-même, à la première personne ("je"), le Discovery Scan gratuit d'une personne que tu tutoies. Ton direct, chaleureux, motivant, concret, comme un message vocal de coach qui a vraiment lu ses réponses. Phrases courtes. Zéro blabla, zéro cours de biologie, zéro généralité qui pourrait s'appliquer à n'importe qui.`,
    `RÈGLES DE FOND :`,
    `- Chaque paragraphe s'appuie sur SES réponses (fournies plus bas en français) et les relie entre elles. Reformule-les en français naturel ("tu bois moins d'1 litre d'eau par jour"). N'écris jamais un identifiant technique, un code de réponse, un tiret entre deux nombres (écris "1 à 2", pas "1-2") ni le nom d'une clé du questionnaire.`,
    `- Quand tu reprends ses champs libres, cite-les fidèlement entre guillemets « » (ses propres mots), sans corriger leur sens.`,
    `- Tu n'as pas son prénom. Écris exactement ${DISCOVERY_COACH_FIRST_NAME_TOKEN} une seule fois, au tout début de l'intro, à l'endroit où tu dirais son prénom. Nulle part ailleurs.`,
    `- Interdits absolus : aucun dosage ni quantité de médicament, de peptide, de complément ou de vitamine ; aucun nom de complément, de peptide, de médicament ou de produit ; aucune étude, aucun chercheur, aucun auteur, aucune marque, aucune application ; aucun diagnostic ni nom de maladie ; aucun autre nom de coach ; aucune visio, aucun appel, aucun rendez-vous, aucun créneau ; aucun prix, aucun code promo, aucun lien.`,
    `- Les 3 actions de la semaine sont simples, faisables tout de suite, sans aucun chiffre de quantité (pas de litres, grammes, calories, verres, portions). Une habitude concrète chacune.`,
    `- Ne parle jamais de "blocage critique" ni de nombre de blocages. Tu parles de "3 freins principaux".`,
    `- Voix : uniquement "je" (moi, Ach) et "tu". N'utilise jamais "on", "nous", "notre" ni "nos" : écris "je", "tu", "ensemble", "avec moi".`,
    `- Pas de markdown, pas de listes à puces, pas d'émojis, pas de tiret long. Paragraphes séparés par une ligne vide si besoin. Français impeccable avec accents.`,
    `- Longueur totale visée : 950 à 1 300 mots, courts et percutants.`,
    safety.strictEatingSafety ? SAFETY_INSTRUCTIONS_TCA : "",
    safety.hasMedicalContext ? SAFETY_INSTRUCTIONS_MEDICAL : "",
    `STRUCTURE (champ JSON par champ) :`,
    `intro (70 à 130 mots) : commence par ${DISCOVERY_COACH_FIRST_NAME_TOKEN}, reprends son objectif avec SES mots (champ libre idéal dans 6 mois s'il existe) et dis-lui ce que ce scan va lui apporter.`,
    `lecture (130 à 220 mots) : "ce que je vois chez toi", lecture croisée qui relie plusieurs réponses entre elles (cause, effet, cercle vicieux), y compris ses points forts.`,
    `freins (exactement 3) : titre court (3 à 8 mots, sans deux-points) + texte (60 à 120 mots) qui explique pourquoi ça la/le freine vers SON objectif + reponses (2 à 4 identifiants de réponses tirés de la liste fournie, ceux qui justifient ce frein).`,
    `actions (exactement 3) : titre court (3 à 8 mots) + texte (30 à 80 mots) : quoi faire cette semaine, quand, comment, relié à un frein.`,
    `si_rien_ne_change (50 à 110 mots) : reprends ses mots du champ "si rien ne change" s'ils existent, sans dramatiser ni culpabiliser.`,
    `dans_6_mois (50 à 110 mots) : ce qui devient possible dans 6 mois si tu t'y mets avec moi, réaliste, sans promesse chiffrée.`,
    `domaines : un court paragraphe (25 à 60 mots) pour chacun des 8 domaines, qui commente son score avec ses réponses de ce domaine. Pas de répétition entre domaines.`,
    `offre (40 à 90 mots) : explique en quoi l'Anabolic Bioscan (analyse approfondie) et le coaching avec moi répondent précisément à ses 3 freins. Sans prix, sans code, sans lien, sans appel ni rendez-vous.`,
  ].filter(Boolean).join("\n");
}

export function buildDiscoveryCoachInput(payload: DiscoveryCoachPayload, previousErrors?: string[]): string {
  const freeTextLines = DISCOVERY_COACH_FREE_TEXT_KEYS
    .filter((key) => payload.freeTexts[key])
    .map((key) => `- ${FREE_TEXT_LABELS[key]} : « ${payload.freeTexts[key]} »`);
  const answerLines = DISCOVERY_COACH_DOMAINS.map((domain) => {
    const lines = Object.entries(payload.answers)
      .filter(([, answer]) => answer.domain === domain)
      .map(([key, answer]) => `  [${key}] ${answer.phrase}`);
    return `${DISCOVERY_COACH_DOMAIN_LABELS[domain]} (score ${String(payload.scores[domain]).replace(".", ",")}/10)\n${lines.join("\n")}`;
  });
  const parts = [
    `PROFIL (anonymisé)`,
    `- ${[payload.sexe, payload.age ? `${payload.age} ans` : null].filter(Boolean).join(", ") || "non précisé"}`,
    `- Objectif principal : ${payload.objectif || "non précisé"}`,
    payload.motivationPrincipale ? `- Moteur : ${payload.motivationPrincipale}` : "",
    `- Score global : ${String(payload.globalScore10).replace(".", ",")}/10`,
    ``,
    `SES MOTS (champs libres)`,
    ...(freeTextLines.length ? freeTextLines : ["- aucun champ libre rempli"]),
    ``,
    `SIGNAUX REPÉRÉS PAR MON MOTEUR (interne, à utiliser pour choisir les freins, ne les recopie pas tels quels)`,
    ...(payload.signals.length
      ? payload.signals.map((signal) => `- ${signal.domain} : ${signal.title} (priorité ${signal.priority})`)
      : ["- aucun signal fort"]),
    ``,
    `SES RÉPONSES PAR DOMAINE (identifiant entre crochets, à utiliser seulement dans le champ "reponses" des freins)`,
    ...answerLines,
  ];
  if (previousErrors && previousErrors.length > 0) {
    parts.push(
      ``,
      `TA VERSION PRÉCÉDENTE A ÉTÉ REFUSÉE PAR LE CONTRÔLE QUALITÉ POUR CES RAISONS :`,
      ...previousErrors.slice(0, 25).map((error) => `- ${error}`),
      `Réécris tout en corrigeant chacun de ces points, en respectant strictement les règles.`,
    );
  }
  return parts.filter((line) => line !== "").join("\n").replace(/\n(?=[A-ZÉ][A-ZÉ ()'"-]+\n)/g, "\n\n");
}

export function buildDiscoveryCoachSchema(answerIds: string[]): Record<string, unknown> {
  const text = { type: "string" };
  return {
    type: "object",
    additionalProperties: false,
    required: ["intro", "lecture", "freins", "actions", "si_rien_ne_change", "dans_6_mois", "domaines", "offre"],
    properties: {
      intro: text,
      lecture: text,
      freins: {
        type: "array", minItems: 3, maxItems: 3,
        items: {
          type: "object", additionalProperties: false, required: ["titre", "texte", "reponses"],
          properties: {
            titre: text,
            texte: text,
            reponses: { type: "array", minItems: 2, maxItems: 4, items: { type: "string", enum: answerIds } },
          },
        },
      },
      actions: {
        type: "array", minItems: 3, maxItems: 3,
        items: {
          type: "object", additionalProperties: false, required: ["titre", "texte"],
          properties: { titre: text, texte: text },
        },
      },
      si_rien_ne_change: text,
      dans_6_mois: text,
      domaines: {
        type: "object", additionalProperties: false, required: [...DISCOVERY_COACH_DOMAINS],
        properties: Object.fromEntries(DISCOVERY_COACH_DOMAINS.map((domain) => [domain, text])),
      },
      offre: text,
    },
  };
}

export interface DiscoveryCoachNarrative {
  intro: string;
  lecture: string;
  freins: Array<{ titre: string; texte: string; reponses: string[] }>;
  actions: Array<{ titre: string; texte: string }>;
  si_rien_ne_change: string;
  dans_6_mois: string;
  domaines: Record<DiscoveryCoachDomain, string>;
  offre: string;
}

export interface DiscoveryCoachProvenance {
  version: typeof DISCOVERY_COACH_VERSION;
  providerResponseId: string;
  narrativeSha256: string;
  attempts: number;
}

function stableJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  return `{${Object.keys(value as Record<string, unknown>).sort().map((key) => (
    `${JSON.stringify(key)}:${stableJson((value as Record<string, unknown>)[key])}`
  )).join(",")}}`;
}

export function discoveryCoachNarrativeSha256(narrative: unknown): string {
  return createHash("sha256").update(stableJson(narrative)).digest("hex");
}

/** Light, meaning-preserving cleanup applied before validation. */
export function cleanDiscoveryCoachText(text: unknown): string {
  return String(text ?? "")
    .normalize("NFC")
    .replace(/[\p{Extended_Pictographic}\uFE0F]/gu, "")
    .replace(/\s*[\u2014\u2013]\s*/g, ", ")
    .replace(/\*\*|__/g, "")
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/\s+([,.;:!?])(?=\s|$)/g, (match, punctuation: string) => (
      // French typography keeps a space before ; : ! ? but never before , .
      /[;:!?]/.test(punctuation) ? ` ${punctuation}` : punctuation
    ))
    .trim();
}

function words(text: string): number {
  return (String(text).match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu) || []).length;
}

function normalizeForMatch(text: string): string {
  return String(text || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[’']/g, "'").toLowerCase();
}

/** Raw questionnaire codes that must never be shown to the client. */
const RAW_CODE_WORDS = [
  "constipe", "leger", "legere", "modere", "moderee", "eleve", "elevee", "tres", "regulier", "irregulier",
  "inconnu", "esthetique", "sante", "debutant", "intermediaire", "teletravail", "etudiant", "mediteraneen",
  "vegetarien", "diarrhee", "extreme", "regression", "frequence", "perte-graisse", "prise-muscle",
  "baisse-moderee", "legere-baisse", "chaque-nuit", "apres-repas", "tres-regulier", "tres-bas", "tres-eleve",
  "tres-faible", "tres-souvent", "tres-long", "une-fois", "ex-fumeur", "sport-collectif", "jeune-intermittent",
  "bilan-sanguin-recent", "tca-historique", "si-rien-change", "ideal-6mois", "plus-grosse-peur",
  "frustration-passee", "eau-jour", "proteines-jour", "sucres-ajoutes", "temps-ecran", "heures-assis",
  "sport-frequence", "energie-aprem", "energie-matin", "coup-fatigue", "envies-sucre", "heures-sommeil",
  "qualite-sommeil", "reveils-nocturnes", "reveil-fatigue", "heure-coucher", "niveau-stress",
  "humeur-fluctuation", "gestion-stress", "digestion-qualite", "energie-post-repas", "type-sport",
  "performance-evolution", "nb-repas", "petit-dejeuner", "regime-alimentaire", "aliments-transformes",
  "cafe-jour", "exposition-soleil", "engagement-niveau", "motivation-principale", "consignes-strictes",
  "temps-training-semaine", "experience-sportive", "plateau-metabolique", "digestion-qualite",
];
const RAW_CODE_PATTERNS: Array<[string, RegExp]> = [
  ["numeric_range", /(?<![\p{L}\p{N}])\d+(?:[.,]\d+)?\s?-\s?\d+(?:[.,]\d+)?\s?(?:h|l|L)?(?![\p{L}\p{N}])/u],
  ["numeric_plus", /(?<![\p{L}\p{N}])\d+(?:h|L)?\+/u],
  ["moins_code", /\bmoins-\d/iu],
  ["hour_code", /\b(?:avant|apres|après)-\d/iu],
  ["hour_range_code", /\b\d{1,2}h-\d{1,2}h\b/iu],
  ["snake_or_bracket_id", /\[[a-z0-9-]{3,}\]|\b[a-z]+_[a-z_]+\b/u],
];

export function findDiscoveryRawCodes(text: string): string[] {
  const found: string[] = [];
  const source = String(text || "");
  for (const word of RAW_CODE_WORDS) {
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    // Case-sensitive on purpose: accentless lowercase tokens are codes; the
    // accented French words ("léger", "santé") never match.
    if (new RegExp(`(?<![\\p{L}\\p{N}-])${escaped}(?![\\p{L}\\p{N}-])`, "u").test(source)) {
      found.push(`raw_code:${word}`);
    }
  }
  for (const [label, pattern] of RAW_CODE_PATTERNS) {
    if (pattern.test(source)) found.push(`raw_code:${label}`);
  }
  return [...new Set(found)];
}

const FORBIDDEN_CONTENT: Array<[string, RegExp]> = [
  ["dosage_unit", /\b\d+(?:[.,]\d+)?\s*(?:mg|mcg|µg|ug|ui|iu|kcal|cal|g\/kg|mmol|nmol)\b/iu],
  ["dosage_word", /\b(?:dose|doses|dosage|dosages|posologie|milligrammes?|microgrammes?|gélules?|comprimés?|ampoules?|injections?|seringues?)\b/iu],
  ["calories", /\b(?:calories?|kcal|déficit calorique|deficit calorique|surplus calorique)\b/iu],
  ["substance", /\b(?:peptides?|bpc|tb-?500|sémaglutide|semaglutide|ozempic|glp-?1|cr[ée]atine|whey|magn[ée]sium|m[ée]latonine|vitamines?|om[ée]ga|zinc|fer\s+en|ashwagandha|probiotiques?|collag[èe]ne|caf[ée]ine\s+en|bcaa|glutamine|testost[ée]rone|cortisol|insuline|hormones?|st[ée]ro[ïi]des?|m[ée]dicaments?|traitement\s+m[ée]dical)\b/iu],
  ["supplement", /\bsuppl[ée]ments?\b|\bcompl[ée]ments?\s+alimentaires?\b|\bcompl[ée]ments\b/iu],
  ["study_or_source", /(?:[ée]tudes?\s+(?:scientifiques?|r[ée]centes?|cliniques?|montrent|ont\s+montr|sugg[eè]rent|publi)|(?:selon|d['’]apr[èe]s)\s+(?:une|des|les|la|le|certaines?)\s+(?:[ée]tudes?|recherches?|chercheurs?|experts?|scientifiques?|sp[ée]cialistes?)|\bchercheurs?\b|\bla\s+science\s+(?:montre|dit)|\bpubli[ée]e?s?\s+(?:dans|en)\b|\bm[ée]ta-?analyse|\bpubmed\b|\buniversit[ée]\b|\bharvard\b|\bstanford\b|\bhuberman\b|\battia\b|\bgalpin\b|\blayne\s+norton\b)/iu],
  ["brand_or_app", /\b(?:myfitnesspal|yazio|fitbit|garmin|whoop|oura|apple\s+watch|strava|nike|adidas|myprotein|herbalife|ultrahuman|chatgpt|openai)\b/iu],
  ["diagnosis", /\b(?:diagnostiqu|syndrome|pathologie|maladie|sopk|hypothyro|hyperthyro|diab[èe]te|pr[ée]diab|r[ée]sistance\s+[àa]\s+l['’]insuline|carences?|d[ée]ficit\s+en|dysbiose|candidose|sibo|intestin\s+irritable|côlon\s+irritable|colon\s+irritable|inflammation\s+chronique|d[ée]pression|burn-?out|trouble\s+(?:anxieux|alimentaire|du\s+comportement)|tca\b|anorexie|boulimie|hyperphagie)/iu],
  ["call_or_meeting", /\b(?:visio|visioconf[ée]rence|appels?|appelle|t['’]appeler|s['’]appeler|rendez-vous|rdv|call|zoom|meet|cr[ée]neaux?|facetime|t[ée]l[ée]phone)\b/iu],
  ["price_or_code", /\b(?:\d+\s?€|\d+\s?euros?|prix|tarifs?|code\s+promo|r[ée]duction|-\s?\d+\s?%|\d+\s?%)/iu],
  ["url", /(?:https?:\/\/|www\.|\.com\b|\.fr\b)/iu],
  ["weight_number", /\b\d+(?:[.,]\d+)?\s*(?:kg|kilos?)\b/iu],
  ["critical_wording", /\bblocages?\s+critiques?\b|\bcritique\b/iu],
  // House voice: "je" (Ach) and "tu" only. The TXT normaliser rewrites any
  // "on"/"nous" into "je", which would break the sentence.
  ["voice_on_nous", /(?<![\p{L}\p{N}_'’])(?:on|nous|notre|nos)(?![\p{L}\p{N}_])/iu],
];

const FORBIDDEN_TCA_CONTENT: Array<[string, RegExp]> = [
  ["tca_restriction", /(?<![\p{L}\p{N}])(?<!sans\s)(?<!aucune\s)(?<!pas\sde\s)(?<!ni\s)(?:restrictions?|restreindre|restreins|supprim(?:e|er|es)\s+(?:le|la|les|tout)|[ée]limin(?:e|er|es)\s+(?:le|la|les|tout)|interdi(?:s|re|ts?)\s+(?:le|la|les)\s+\p{L}+|bannis|z[ée]ro\s+sucre|plus\s+(?:jamais|aucun)\s+de)\b/iu],
  ["tca_diet_wording", /\b(?:r[ée]gime|s[èe]che|maigrir|amincir|minceur|perdre\s+du\s+poids|perte\s+de\s+poids|kilos?\s+en\s+trop)\b/iu],
  ["tca_body_tracking", /\b(?:p[èe]se[- ]toi|te\s+peser|pes[ée]es?|balance|mensurations?|tour\s+de\s+taille|photos?\s+(?:de\s+)?(?:progression|du\s+corps|du\s+physique)|compter\s+(?:tes|les|chaque)\s+\p{L}+|compte\s+tes|tracker|calculer\s+tes)\b/iu],
  ["tca_body_ideal", /\b(?:corps\s+de\s+mannequin|silhouette\s+de\s+mannequin)\b(?![^«»]*»)/iu],
];

const INTERNAL_NOTE_PATTERNS: Array<[string, RegExp]> = [
  ["internal_note", /\b(?:pour\s+ton\s+profil,?\s+toute\s+recommandation|consigne\s+interne|doit\s+rester\s+encadr[ée]e|non\s+chiffr[ée]e|historique\s+de\s+troubles|ton\s+historique\s+alimentaire|contexte\s+m[ée]dical\s+d[ée]clar[ée]|moteur\s+d[ée]terministe|identifiant|questionnaire\s+indique\s+que\s+le\s+champ)\b/iu],
  ["meta_ai", /\b(?:en\s+tant\s+qu['’](?:ia|intelligence)|intelligence\s+artificielle|mod[èe]le\s+de\s+langage|je\s+suis\s+une\s+ia|chatbot|algorithme)\b/iu],
  ["other_coach", /\bcoach(?:e|s)?\s+(?!Ach\b|Achzod\b)\p{Lu}\p{Ll}+/u],
  ["markdown", /(^|\n)\s*(?:#{1,6}\s|[-*+•]\s|\d{1,2}[.)]\s)|\*\*|__|`/u],
  ["html", /<\/?[a-z][^>]*>/iu],
];

export interface DiscoveryCoachValidation {
  ok: boolean;
  errors: string[];
  narrative: DiscoveryCoachNarrative | null;
  wordCount: number;
}

const FIELD_BOUNDS = {
  intro: [55, 170], lecture: [100, 280], freinTexte: [45, 160], freinTitre: [2, 10],
  actionTexte: [20, 105], actionTitre: [2, 10], projection: [35, 140], domaine: [15, 85], offre: [30, 120],
} as const;
export const DISCOVERY_COACH_MIN_WORDS = 850;
export const DISCOVERY_COACH_MAX_WORDS = 1_550;

function contentTokens(text: string): string[] {
  const stop = new Set(["avec", "dans", "pour", "plus", "mais", "elle", "etre", "avoir", "tout", "tres", "comme", "cette", "sans", "sous", "leur", "nous", "vous", "quand", "fait", "faire", "suis", "sont", "plus", "moins", "corps"]);
  return [...new Set((normalizeForMatch(text).match(/[a-z]{4,}/g) || []).filter((token) => !stop.has(token)))];
}

function checkText(field: string, text: string, bounds: readonly [number, number], errors: string[], safety: DiscoveryCoachSafety, isAction = false): void {
  const count = words(text);
  if (!text) { errors.push(`empty:${field}`); return; }
  if (count < bounds[0]) errors.push(`too_short:${field}:${count}/${bounds[0]}`);
  if (count > bounds[1]) errors.push(`too_long:${field}:${count}/${bounds[1]}`);
  for (const code of findDiscoveryRawCodes(text)) errors.push(`${code}:${field}`);
  for (const [label, pattern] of [...FORBIDDEN_CONTENT, ...INTERNAL_NOTE_PATTERNS]) {
    if (pattern.test(text)) errors.push(`forbidden:${label}:${field}`);
  }
  if (safety.strictEatingSafety) {
    for (const [label, pattern] of FORBIDDEN_TCA_CONTENT) {
      if (pattern.test(text)) errors.push(`forbidden:${label}:${field}`);
    }
  }
  if (isAction && /\b\d+(?:[.,]\d+)?\s*(?:l|litres?|ml|cl|g|grammes?|kg|verres?|tasses?|portions?|cuill[èe]res?|bouteilles?|repas)\b/iu.test(text)) {
    errors.push(`forbidden:action_quantity:${field}`);
  }
  if (text.includes(DISCOVERY_COACH_FIRST_NAME_TOKEN) && field !== "intro") {
    errors.push(`first_name_token_outside_intro:${field}`);
  }
}

/**
 * Fail-closed validation of the provider JSON. Returns the cleaned narrative
 * (with the [PRENOM] placeholder still in place) when every rule holds.
 */
export function validateDiscoveryCoachNarrative(
  raw: unknown,
  context: { responses: Responses; safety: DiscoveryCoachSafety; answerIds: string[] },
): DiscoveryCoachValidation {
  const errors: string[] = [];
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, errors: ["json:not_object"], narrative: null, wordCount: 0 };
  }
  const candidate = raw as Record<string, any>;
  const expectedKeys = ["actions", "dans_6_mois", "domaines", "freins", "intro", "lecture", "offre", "si_rien_ne_change"];
  if (Object.keys(candidate).sort().join(",") !== expectedKeys.join(",")) errors.push("json:keys");
  if (!Array.isArray(candidate.freins) || candidate.freins.length !== 3) errors.push("json:freins_count");
  if (!Array.isArray(candidate.actions) || candidate.actions.length !== 3) errors.push("json:actions_count");
  if (!candidate.domaines || typeof candidate.domaines !== "object"
    || Object.keys(candidate.domaines).sort().join(",") !== [...DISCOVERY_COACH_DOMAINS].sort().join(",")) {
    errors.push("json:domaines_keys");
  }
  if (errors.length > 0) return { ok: false, errors, narrative: null, wordCount: 0 };

  const allowedIds = new Set(context.answerIds);
  const narrative: DiscoveryCoachNarrative = {
    intro: cleanDiscoveryCoachText(candidate.intro),
    lecture: cleanDiscoveryCoachText(candidate.lecture),
    freins: candidate.freins.map((frein: any) => ({
      titre: cleanDiscoveryCoachText(frein?.titre).replace(/[.:;]+$/u, ""),
      texte: cleanDiscoveryCoachText(frein?.texte),
      reponses: Array.isArray(frein?.reponses) ? frein.reponses.map((id: unknown) => String(id)) : [],
    })),
    actions: candidate.actions.map((action: any) => ({
      titre: cleanDiscoveryCoachText(action?.titre).replace(/[.:;]+$/u, ""),
      texte: cleanDiscoveryCoachText(action?.texte),
    })),
    si_rien_ne_change: cleanDiscoveryCoachText(candidate.si_rien_ne_change),
    dans_6_mois: cleanDiscoveryCoachText(candidate.dans_6_mois),
    domaines: Object.fromEntries(DISCOVERY_COACH_DOMAINS.map((domain) => [
      domain, cleanDiscoveryCoachText(candidate.domaines[domain]),
    ])) as Record<DiscoveryCoachDomain, string>,
    offre: cleanDiscoveryCoachText(candidate.offre),
  };

  const { safety, responses } = context;
  checkText("intro", narrative.intro, FIELD_BOUNDS.intro, errors, safety);
  checkText("lecture", narrative.lecture, FIELD_BOUNDS.lecture, errors, safety);
  narrative.freins.forEach((frein, index) => {
    checkText(`frein${index + 1}.titre`, frein.titre, FIELD_BOUNDS.freinTitre, errors, safety);
    checkText(`frein${index + 1}.texte`, frein.texte, FIELD_BOUNDS.freinTexte, errors, safety);
    if (frein.reponses.length < 2 || frein.reponses.length > 4
      || new Set(frein.reponses).size !== frein.reponses.length
      || frein.reponses.some((id) => !allowedIds.has(id))) {
      errors.push(`frein${index + 1}.reponses_invalid`);
    }
  });
  narrative.actions.forEach((action, index) => {
    checkText(`action${index + 1}.titre`, action.titre, FIELD_BOUNDS.actionTitre, errors, safety, true);
    checkText(`action${index + 1}.texte`, action.texte, FIELD_BOUNDS.actionTexte, errors, safety, true);
  });
  checkText("si_rien_ne_change", narrative.si_rien_ne_change, FIELD_BOUNDS.projection, errors, safety);
  checkText("dans_6_mois", narrative.dans_6_mois, FIELD_BOUNDS.projection, errors, safety);
  for (const domain of DISCOVERY_COACH_DOMAINS) {
    checkText(`domaines.${domain}`, narrative.domaines[domain], FIELD_BOUNDS.domaine, errors, safety);
  }
  checkText("offre", narrative.offre, FIELD_BOUNDS.offre, errors, safety);

  const tokenCount = narrative.intro.split(DISCOVERY_COACH_FIRST_NAME_TOKEN).length - 1;
  if (tokenCount !== 1) errors.push(`first_name_token_count:${tokenCount}/1`);
  if (/\[[^\]]*\]/u.test(narrative.intro.replace(DISCOVERY_COACH_FIRST_NAME_TOKEN, ""))) {
    errors.push("unknown_placeholder:intro");
  }

  // The intro restates the goal with the person's own words.
  const ideal = String(responses["ideal-6mois"] ?? "").trim();
  const introTokens = new Set(contentTokens(narrative.intro));
  if (ideal) {
    const overlap = contentTokens(ideal).filter((token) => introTokens.has(token));
    if (overlap.length < Math.min(2, contentTokens(ideal).length)) errors.push("intro:own_words_missing");
  }
  const stayed = String(responses["si-rien-change"] ?? "").trim();
  if (stayed) {
    const tokens = contentTokens(stayed);
    const target = new Set(contentTokens(narrative.si_rien_ne_change));
    if (tokens.length > 0 && !tokens.some((token) => target.has(token))) errors.push("si_rien_ne_change:own_words_missing");
  }

  // Duplicate paragraphs (same sentence reused across sections).
  const sentences = [
    narrative.intro, narrative.lecture, ...narrative.freins.map((frein) => frein.texte),
    ...narrative.actions.map((action) => action.texte), narrative.si_rien_ne_change, narrative.dans_6_mois,
    ...Object.values(narrative.domaines), narrative.offre,
  ].flatMap((text) => text.split(/(?<=[.!?])\s+/u)).map((sentence) => normalizeForMatch(sentence).trim())
    .filter((sentence) => sentence.length >= 40);
  if (new Set(sentences).size !== sentences.length) errors.push("duplicate_sentence");

  const wordCount = discoveryCoachWordCount(narrative);
  if (wordCount < DISCOVERY_COACH_MIN_WORDS) errors.push(`total_words:${wordCount}/${DISCOVERY_COACH_MIN_WORDS}`);
  if (wordCount > DISCOVERY_COACH_MAX_WORDS) errors.push(`total_words_max:${wordCount}/${DISCOVERY_COACH_MAX_WORDS}`);

  const unique = [...new Set(errors)];
  return { ok: unique.length === 0, errors: unique, narrative: unique.length === 0 ? narrative : null, wordCount };
}

export function discoveryCoachWordCount(narrative: DiscoveryCoachNarrative): number {
  return [
    narrative.intro, narrative.lecture,
    ...narrative.freins.flatMap((frein) => [frein.titre, frein.texte]),
    ...narrative.actions.flatMap((action) => [action.titre, action.texte]),
    narrative.si_rien_ne_change, narrative.dans_6_mois,
    ...Object.values(narrative.domaines), narrative.offre,
  ].reduce((sum, text) => sum + words(text), 0);
}

/** Validation errors rewritten for the corrective attempt. */
export function describeDiscoveryCoachErrorsForRetry(errors: string[]): string[] {
  return errors.map((error) => {
    if (error.startsWith("raw_code:")) return `code brut interdit (${error.split(":")[1]}) dans ${error.split(":")[2] || "le texte"} : reformule en français naturel`;
    if (error.startsWith("forbidden:")) return `contenu interdit (${error.split(":")[1]}) dans ${error.split(":")[2] || "le texte"}`;
    if (error.startsWith("too_short:")) return `${error.split(":")[1]} trop court (${error.split(":")[2]} mots)`;
    if (error.startsWith("too_long:")) return `${error.split(":")[1]} trop long (${error.split(":")[2]} mots)`;
    if (error.startsWith("total_words")) return `longueur totale hors cible (${error.split(":")[1]} mots, vise 950 à 1 300)`;
    if (error === "intro:own_words_missing") return "l'intro doit reprendre son objectif avec SES mots (champ idéal dans 6 mois)";
    if (error === "si_rien_ne_change:own_words_missing") return "si_rien_ne_change doit reprendre ses mots";
    if (error.startsWith("first_name_token")) return `${DISCOVERY_COACH_FIRST_NAME_TOKEN} doit apparaître exactement une fois, au début de l'intro`;
    if (error.endsWith("reponses_invalid")) return `${error.split(".")[0]} : 2 à 4 identifiants de réponses valides et distincts`;
    if (error === "duplicate_sentence") return "une phrase est répétée à l'identique : pas de doublon";
    return error;
  });
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

/** Text-node escaping (all interpolations below are text nodes, never
 * attributes), so apostrophes stay readable in the TXT artifact. */
export function escapeDiscoveryCoachHtml(value: string): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function paragraphs(text: string): string {
  return text.split(/\n{2,}|\n/u).map((part) => part.trim()).filter(Boolean)
    .map((part) => `<p>${escapeDiscoveryCoachHtml(part)}</p>`).join("\n");
}

export function discoveryCoachDomainStatus(score100: number): string {
  if (score100 < 40) return "Priorité";
  if (score100 < 60) return "À travailler";
  if (score100 < 75) return "Correct";
  return "Point fort";
}

export function discoveryCoachPromoDeadline(generatedAt: string): { iso: string; label: string } {
  const base = new Date(generatedAt);
  const safeBase = Number.isNaN(base.getTime()) ? new Date(0) : base;
  const deadline = new Date(safeBase.getTime() + DISCOVERY_COACH_PROMO_VALIDITY_DAYS * 24 * 60 * 60 * 1000);
  const iso = deadline.toISOString().slice(0, 10);
  const label = new Intl.DateTimeFormat("fr-FR", {
    day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris",
  }).format(deadline);
  return { iso, label };
}

const COACHING_ELIGIBLE = [
  { tier: "Essential", duration: "8 semaines", price: 399 },
  { tier: "Elite", duration: "8 semaines", price: 649 },
  { tier: "Private Lab", duration: "8 semaines", price: 799 },
  { tier: "Essential", duration: "12 semaines", price: 549 },
  { tier: "Elite", duration: "12 semaines", price: 899 },
  { tier: "Private Lab", duration: "12 semaines", price: 1199 },
];

function euro(value: number): string {
  return `${new Intl.NumberFormat("fr-FR", { minimumFractionDigits: Number.isInteger(value) ? 0 : 2, maximumFractionDigits: 2 }).format(value)} €`;
}

function renderCoachingTable(): string {
  const rows = COACHING_ELIGIBLE.map((offer) => {
    const after = Math.round(offer.price * 0.8 * 100) / 100;
    return `<tr style="border-top: 1px solid var(--color-border);"><td class="py-2 pr-4" style="color: var(--color-text);">${offer.tier} </td><td class="text-center py-2 px-2">${offer.duration} : </td><td class="text-center py-2 px-2"><span style="color: var(--color-text-muted); text-decoration: line-through;">${euro(offer.price)}</span> </td><td class="text-center py-2 px-2"><strong style="color: var(--color-primary);">${euro(after)}</strong></td></tr>`;
  }).join("\n");
  return `<div class="overflow-x-auto"><table class="w-full text-sm"><thead><tr style="color: var(--color-text-muted);"><th class="text-left py-2 pr-4">Formule </th><th class="text-center py-2 px-2">Durée </th><th class="text-center py-2 px-2">Prix standard </th><th class="text-center py-2 px-2">Avec ${DISCOVERY_COACH_PROMO_CODE}</th></tr></thead>\n<tbody>\n${rows}\n</tbody></table></div>`;
}

export interface DiscoveryCoachSection {
  id: string;
  title: string;
  subtitle?: string;
  content: string;
  chips?: string[];
}

export interface DiscoveryCoachRenderInput {
  narrative: DiscoveryCoachNarrative;
  firstName: string;
  responses: Responses;
  scoresByDomain: Record<string, number>;
  globalScore: number;
  strictEatingSafety: boolean;
  generatedAt: string;
}

export function buildDiscoveryCoachCtaMessage(strictEatingSafety: boolean): string {
  return strictEatingSafety
    ? "Anabolic Bioscan (59 €) pour approfondir, ou coaching avec -20 % (DISCOVERY20, formules 8 et 12 semaines) valable 7 jours."
    : "Anabolic Bioscan (59 €) pour approfondir, ou coaching avec -20 % (DISCOVERY20, formules 8 et 12 semaines) valable 7 jours.";
}

export function renderDiscoveryCoachSections(input: DiscoveryCoachRenderInput): DiscoveryCoachSection[] {
  const { narrative, firstName, scoresByDomain, strictEatingSafety, generatedAt, responses } = input;
  const name = escapeDiscoveryCoachHtml(firstName);
  const global10 = String(scoreTo10(input.globalScore)).replace(".", ",");
  const introHtml = paragraphs(narrative.intro).replace(
    escapeDiscoveryCoachHtml(DISCOVERY_COACH_FIRST_NAME_TOKEN),
    name,
  );
  const sections: DiscoveryCoachSection[] = [];

  sections.push({
    id: "intro",
    title: "Ton objectif",
    subtitle: "Discovery Scan",
    chips: [`Score global ${global10}/10`, "3 freins principaux", "3 actions cette semaine"],
    content: `${introHtml}\n<p>Ton score global ressort à <strong>${global10}/10</strong>. Plus bas : ce que je vois chez toi, tes 3 freins principaux, 3 actions pour cette semaine, puis tes scores domaine par domaine.</p>`,
  });

  sections.push({
    id: "lecture",
    title: "Ce que je vois chez toi",
    subtitle: "Lecture croisée de tes réponses",
    chips: ["Lecture croisée"],
    content: paragraphs(narrative.lecture),
  });

  sections.push({
    id: "freins",
    title: "Tes 3 freins principaux",
    subtitle: "Ce qui te ralentit vraiment",
    chips: narrative.freins.map((frein) => frein.titre),
    content: narrative.freins.map((frein, index) => {
      const evidence = frein.reponses
        .map((id) => describeDiscoveryAnswer(id, responses[id], responses))
        .filter((phrase): phrase is string => Boolean(phrase));
      const evidenceLine = evidence.length
        ? `<p style="color: var(--color-text-muted);"><em>Ce qui me fait dire ça : ${escapeDiscoveryCoachHtml(evidence.join(" ; "))}.</em></p>`
        : "";
      return `<h3>Frein ${index + 1} : ${escapeDiscoveryCoachHtml(frein.titre)}</h3>\n${paragraphs(frein.texte)}\n${evidenceLine}`;
    }).join("\n"),
  });

  sections.push({
    id: "actions",
    title: "Tes 3 actions cette semaine",
    subtitle: "Simple, concret, sans calcul",
    chips: ["Cette semaine"],
    content: narrative.actions.map((action, index) => (
      `<h3>Action ${index + 1} : ${escapeDiscoveryCoachHtml(action.titre)}</h3>\n${paragraphs(action.texte)}`
    )).join("\n"),
  });

  sections.push({
    id: "projection",
    title: "Dans 6 mois",
    subtitle: "Deux trajectoires possibles",
    chips: ["Si rien ne change", "Si tu t'y mets avec moi"],
    content: `<h3>Si rien ne change</h3>\n${paragraphs(narrative.si_rien_ne_change)}\n<h3>Si tu t'y mets avec moi</h3>\n${paragraphs(narrative.dans_6_mois)}`,
  });

  const orderedDomains = [...DISCOVERY_COACH_DOMAINS].sort((a, b) => (
    (scoresByDomain[a] ?? 0) - (scoresByDomain[b] ?? 0)
    || DISCOVERY_COACH_DOMAINS.indexOf(a) - DISCOVERY_COACH_DOMAINS.indexOf(b)
  ));
  sections.push({
    id: "domaines",
    title: "Tes scores domaine par domaine",
    subtitle: "8 domaines, du plus fragile au plus solide",
    chips: orderedDomains.slice(0, 3).map((domain) => DISCOVERY_COACH_DOMAIN_LABELS[domain]),
    content: orderedDomains.map((domain) => {
      const score = scoresByDomain[domain] ?? 0;
      return `<h3>${DISCOVERY_COACH_DOMAIN_LABELS[domain]} : ${String(scoreTo10(score)).replace(".", ",")}/10 <span style="color: var(--color-primary);">(${discoveryCoachDomainStatus(score)})</span></h3>\n${paragraphs(narrative.domaines[domain])}`;
    }).join("\n"),
  });

  const deadline = discoveryCoachPromoDeadline(generatedAt);
  const bridgeHref = `/go/coaching?code=${DISCOVERY_COACH_PROMO_CODE}&until=${deadline.iso}&utm_source=apexlabs&utm_medium=report&utm_campaign=discovery_report_v3&utm_content=offer_cta`;
  const bioscanHref = "/offers/anabolic-bioscan?utm_source=apexlabs&utm_medium=report&utm_campaign=discovery_report_v3&utm_content=bioscan_cta";
  const bioscanItems = [
    "16 domaines analysés en profondeur",
    "Tes priorités classées et expliquées",
    "Un plan d'action semaine par semaine",
    strictEatingSafety ? "Des repères alimentaires souples, sans calcul" : "Des recommandations nutrition et récupération sur mesure",
  ];
  sections.push({
    id: "offre",
    title: "La suite pour toi",
    subtitle: "Anabolic Bioscan ou coaching",
    chips: ["Anabolic Bioscan 59 €", `-20 % coaching jusqu'au ${deadline.label}`],
    content: `${paragraphs(narrative.offre)}
<div class="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
  <div class="p-6 rounded-xl" style="background: var(--color-surface); border: 2px solid var(--color-primary);">
    <div class="text-xs uppercase tracking-widest mb-2" style="color: var(--color-primary);">Pour approfondir</div>
    <h4 class="text-xl font-bold mb-2" style="color: var(--color-text);">Anabolic Bioscan</h4>
    <div class="text-3xl font-bold mb-4" style="color: var(--color-primary);">59 €</div>
    <ul class="space-y-2 text-sm mb-4" style="color: var(--color-text-muted);">${bioscanItems.map((item) => `<li>${escapeDiscoveryCoachHtml(item)}</li>`).join("")}</ul>
    <p class="text-xs mb-4" style="color: var(--color-text-muted);">Si tu passes en coaching ensuite, les 59 € sont déduits de ta formule.</p>
    <a href="${bioscanHref}" class="block w-full py-3 rounded-lg text-center font-bold" style="background: var(--color-primary); color: var(--color-on-primary);">Je fais mon Anabolic Bioscan</a>
  </div>
  <div class="p-6 rounded-xl" style="background: var(--color-surface); border: 1px solid var(--color-border);">
    <div class="text-xs uppercase tracking-widest mb-2" style="color: var(--color-text-muted);">Pour passer à l'action avec moi</div>
    <h4 class="text-xl font-bold mb-2" style="color: var(--color-text);">Coaching Achzod : -20 %</h4>
    <p class="text-sm mb-2" style="color: var(--color-text);">Ton code : <strong style="color: var(--color-primary); letter-spacing: 0.08em;">${DISCOVERY_COACH_PROMO_CODE}</strong></p>
    <p class="text-xs mb-4" style="color: var(--color-text-muted);">Valable 7 jours, jusqu'au ${escapeDiscoveryCoachHtml(deadline.label)}, sur les formules 8 et 12 semaines (pas sur les 4 semaines). À coller au moment du paiement.</p>
    ${renderCoachingTable()}
    <a href="${bridgeHref}" class="mt-4 block w-full py-3 rounded-lg text-center font-bold" style="border: 1px solid var(--color-primary); color: var(--color-primary);">J'active mes -20 %</a>
  </div>
</div>
<p class="text-sm mt-6" style="color: var(--color-text-muted);">Un dernier mot : si ce scan t'a parlé, ton avis en bas de page m'aide à l'améliorer. Il ne conditionne rien, ton code est déjà à toi.</p>`,
  });

  return sections;
}

/** Visible prose authored by the provider, used by the delivery gates. */
export function discoveryCoachProse(narrative: DiscoveryCoachNarrative): string {
  return [
    narrative.intro, narrative.lecture,
    ...narrative.freins.flatMap((frein) => [frein.titre, frein.texte]),
    ...narrative.actions.flatMap((action) => [action.titre, action.texte]),
    narrative.si_rien_ne_change, narrative.dans_6_mois,
    ...DISCOVERY_COACH_DOMAINS.map((domain) => narrative.domaines[domain]),
    narrative.offre,
  ].join("\n\n");
}

export function discoveryCoachAnswerIds(payload: DiscoveryCoachPayload): string[] {
  return Object.keys(payload.answers);
}

export function normalizeDiscoveryCoachProvenanceForLedger(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const candidate = raw as Record<string, unknown>;
  const keys = ["attempts", "narrativeSha256", "providerResponseId", "version"];
  if (Object.keys(candidate).sort().join(",") !== keys.join(",")) return null;
  if (candidate.version !== DISCOVERY_COACH_VERSION) return null;
  if (!/^[a-f0-9]{64}$/.test(String(candidate.narrativeSha256 || ""))) return null;
  if (!String(candidate.providerResponseId || "").trim()) return null;
  if (![1, 2].includes(Number(candidate.attempts))) return null;
  return Object.fromEntries(keys.map((key) => [key, candidate[key]]));
}
