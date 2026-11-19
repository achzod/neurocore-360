/**
 * Discovery Scan : UNE seule offre recommandée selon le profil.
 *
 * Règle (la première qui s'applique gagne) :
 *  1. Peptides Engine, seulement si TOUT est réuni : réponses disponibles, aucun
 *     signal TCA ni sécurité alimentaire stricte, aucun traitement ni diagnostic
 *     déclaré, 25 ans ou plus, objectif prise de muscle / recomposition /
 *     performance, entraînement 3 fois par semaine ou plus en intensité
 *     intense ou extrême, progression qui stagne ou régresse, engagement 8/10
 *     ou plus, prêt à suivre des consignes strictes, et des bases solides
 *     (score global 6,5/10 ou plus, sommeil, stress et nutrition à 6/10 ou plus).
 *     Jamais par défaut, jamais sans réponses.
 *  2. Anabolic Bioscan si l'engagement déclaré est faible (5/10 ou moins) :
 *     une étape plus légère, déduite du coaching ensuite.
 *  3. Private Lab si 4 domaines ou plus sont sous 6/10 ET engagement 8/10 ou plus.
 *  4. Elite si 3 domaines ou plus sont sous 6/10, ou score global sous 5/10.
 *  5. Essential sinon.
 *
 * Aucun prix ici : les montants restent dans leurs sources existantes.
 */

export type DiscoveryOfferId =
  | "essential"
  | "elite"
  | "private-lab"
  | "anabolic-bioscan"
  | "peptides-engine";

export type DiscoveryOfferReason =
  | "plateau_bases_solides"
  | "engagement_faible"
  | "beaucoup_axes_engagement_fort"
  | "plusieurs_axes"
  | "bases_a_structurer";

export interface DiscoveryOfferProfile {
  /** Score global sur 10. */
  globalScore: number;
  /** Scores par domaine sur 10 (sommeil, stress, energie, digestion, training, nutrition, lifestyle, mindset). */
  metrics: ReadonlyArray<{ key: string; value: number }>;
  /** Signal de sécurité alimentaire stricte (TCA) posé par le scan. */
  strictEatingSafety?: boolean;
  /** Réponses brutes du questionnaire, quand elles sont disponibles (serveur). */
  responses?: Record<string, unknown> | null;
}

export interface DiscoveryOfferRecommendation {
  offer: DiscoveryOfferId;
  reason: DiscoveryOfferReason;
  /** Domaines sous 6/10, du plus faible au plus solide. */
  weakDomains: string[];
}

export const DISCOVERY_WEAK_DOMAIN_THRESHOLD = 6;

const PEPTIDES_OBJECTIVES = new Set(["prise-muscle", "recomposition", "performance"]);
const HIGH_ENGAGEMENT = new Set(["8-9", "10"]);
const LOW_ENGAGEMENT = new Set(["1-3", "4-5"]);
const TRAINS_OFTEN = new Set(["3-4", "5+"]);
const TRAINS_HARD = new Set(["intense", "extreme"]);
const PROGRESS_STALLED = new Set(["stagnation", "regression"]);

function answer(responses: Record<string, unknown> | null | undefined, key: string): string {
  const value = responses?.[key];
  if (typeof value === "string") return value.trim().toLowerCase();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "";
}

function answerList(responses: Record<string, unknown> | null | undefined, key: string): string[] {
  const value = responses?.[key];
  const raw = Array.isArray(value) ? value : typeof value === "string" ? value.split(",") : [];
  return raw.map((item) => String(item).trim().toLowerCase()).filter(Boolean);
}

function metricValue(profile: DiscoveryOfferProfile, key: string): number | null {
  const metric = profile.metrics.find((item) => item.key === key);
  return metric && Number.isFinite(metric.value) ? metric.value : null;
}

export function discoveryWeakDomains(profile: DiscoveryOfferProfile): string[] {
  return profile.metrics
    .filter((metric) => Number.isFinite(metric.value) && metric.value < DISCOVERY_WEAK_DOMAIN_THRESHOLD)
    .slice()
    .sort((a, b) => a.value - b.value)
    .map((metric) => metric.key);
}

/** Vrai seulement quand le profil justifie clairement Peptides Engine. */
export function profileJustifiesPeptides(profile: DiscoveryOfferProfile): boolean {
  const r = profile.responses;
  if (!r || typeof r !== "object") return false;
  if (profile.strictEatingSafety) return false;
  if (answer(r, "tca-historique") !== "jamais") return false;
  if (answer(r, "traitement-medical") !== "non") return false;
  const diagnostics = answerList(r, "diagnostic-medical");
  if (diagnostics.length === 0 || diagnostics.some((item) => item !== "aucun")) return false;
  const age = Number.parseInt(answer(r, "age"), 10);
  if (!Number.isFinite(age) || age < 25) return false;
  if (!PEPTIDES_OBJECTIVES.has(answer(r, "objectif"))) return false;
  if (!TRAINS_OFTEN.has(answer(r, "sport-frequence"))) return false;
  if (!TRAINS_HARD.has(answer(r, "intensite"))) return false;
  if (!PROGRESS_STALLED.has(answer(r, "performance-evolution"))) return false;
  if (!HIGH_ENGAGEMENT.has(answer(r, "engagement-niveau"))) return false;
  if (answer(r, "consignes-strictes") !== "oui") return false;
  if (!(Number.isFinite(profile.globalScore) && profile.globalScore >= 6.5)) return false;
  for (const key of ["sommeil", "stress", "nutrition"]) {
    const value = metricValue(profile, key);
    if (value === null || value < DISCOVERY_WEAK_DOMAIN_THRESHOLD) return false;
  }
  return true;
}

export function recommendDiscoveryOffer(profile: DiscoveryOfferProfile): DiscoveryOfferRecommendation {
  const weakDomains = discoveryWeakDomains(profile);
  const engagement = answer(profile.responses, "engagement-niveau");
  const score = Number.isFinite(profile.globalScore) ? profile.globalScore : 0;

  if (profileJustifiesPeptides(profile)) {
    return { offer: "peptides-engine", reason: "plateau_bases_solides", weakDomains };
  }
  if (LOW_ENGAGEMENT.has(engagement)) {
    return { offer: "anabolic-bioscan", reason: "engagement_faible", weakDomains };
  }
  if (weakDomains.length >= 4 && HIGH_ENGAGEMENT.has(engagement)) {
    return { offer: "private-lab", reason: "beaucoup_axes_engagement_fort", weakDomains };
  }
  if (weakDomains.length >= 3 || score < 5) {
    return { offer: "elite", reason: "plusieurs_axes", weakDomains };
  }
  return { offer: "essential", reason: "bases_a_structurer", weakDomains };
}

/**
 * Même règle, à partir d'un rapport Discovery tel qu'il est stocké
 * (score global sur 10 ou sur 100 pour les plus anciens) et des réponses.
 */
export function recommendDiscoveryOfferForReport(
  report: { globalScore?: unknown; metrics?: unknown; generationQuality?: unknown } | null | undefined,
  responses: Record<string, unknown> | null | undefined,
): DiscoveryOfferRecommendation {
  const rawScore = typeof report?.globalScore === "number" && Number.isFinite(report.globalScore) ? report.globalScore : 0;
  const metrics = Array.isArray(report?.metrics)
    ? (report!.metrics as unknown[]).flatMap((metric) => {
        if (!metric || typeof metric !== "object") return [];
        const { key, value } = metric as { key?: unknown; value?: unknown };
        return typeof key === "string" && typeof value === "number" ? [{ key, value }] : [];
      })
    : [];
  const quality = report?.generationQuality as { safety?: { strictEatingSafety?: unknown } } | undefined;
  return recommendDiscoveryOffer({
    globalScore: rawScore > 10 ? rawScore / 10 : rawScore,
    metrics,
    strictEatingSafety: quality?.safety?.strictEatingSafety === true,
    responses: responses && typeof responses === "object" ? responses : null,
  });
}

const OFFER_IDS = new Set<DiscoveryOfferId>(["essential", "elite", "private-lab", "anabolic-bioscan", "peptides-engine"]);
const REASONS = new Set<DiscoveryOfferReason>([
  "plateau_bases_solides", "engagement_faible", "beaucoup_axes_engagement_fort", "plusieurs_axes", "bases_a_structurer",
]);

/** Valide une recommandation reçue de l'API (sinon null). */
export function parseDiscoveryOfferRecommendation(raw: unknown): DiscoveryOfferRecommendation | null {
  if (!raw || typeof raw !== "object") return null;
  const candidate = raw as Record<string, unknown>;
  if (!OFFER_IDS.has(candidate.offer as DiscoveryOfferId)) return null;
  if (!REASONS.has(candidate.reason as DiscoveryOfferReason)) return null;
  const weakDomains = Array.isArray(candidate.weakDomains)
    ? candidate.weakDomains.filter((item): item is string => typeof item === "string").slice(0, 8)
    : [];
  return { offer: candidate.offer as DiscoveryOfferId, reason: candidate.reason as DiscoveryOfferReason, weakDomains };
}

// ─── Textes visibles (tutoiement, voix de Ach) ────────────────────────────

export const DISCOVERY_DOMAIN_LABELS: Readonly<Record<string, string>> = Object.freeze({
  sommeil: "sommeil",
  stress: "stress",
  energie: "énergie",
  digestion: "digestion",
  training: "entraînement",
  nutrition: "nutrition",
  lifestyle: "hygiène de vie",
  mindset: "mental",
});

export const DISCOVERY_COACHING_TIER_PARAM: Readonly<Partial<Record<DiscoveryOfferId, string>>> = Object.freeze({
  essential: "ESSENTIAL",
  elite: "ELITE",
  "private-lab": "PRIVATELAB",
});

export const DISCOVERY_OFFER_LABELS: Readonly<Record<DiscoveryOfferId, string>> = Object.freeze({
  essential: "Coaching Essential",
  elite: "Coaching Elite",
  "private-lab": "Coaching Private Lab",
  "anabolic-bioscan": "Anabolic Bioscan",
  "peptides-engine": "Peptides Engine",
});

const DISCOVERY_COACHING_SHORT_LABELS: Readonly<Partial<Record<DiscoveryOfferId, string>>> = Object.freeze({
  essential: "Essential",
  elite: "Elite",
  "private-lab": "Private Lab",
});

/** Ce que contient l'offre, en une phrase. */
export const DISCOVERY_OFFER_DESCRIPTIONS: Readonly<Record<DiscoveryOfferId, string>> = Object.freeze({
  essential: "Le cadre essentiel pour avancer avec une stratégie claire et un suivi régulier.",
  elite: "Un accompagnement plus poussé pour accélérer ta progression et ajuster chaque détail.",
  "private-lab": "Mon niveau d'accompagnement le plus complet pour une optimisation approfondie.",
  "anabolic-bioscan": "16 domaines analysés en profondeur, tes priorités classées et expliquées, un plan d'action semaine par semaine.",
  "peptides-engine": "Un protocole peptides construit sur ton profil, avec le guide complet pour l'appliquer.",
});

export function isDiscoveryCoachingOffer(offer: DiscoveryOfferId): boolean {
  return offer === "essential" || offer === "elite" || offer === "private-lab";
}

function listDomains(keys: string[]): string {
  const labels = keys.slice(0, 3).map((key) => DISCOVERY_DOMAIN_LABELS[key] || key);
  if (labels.length <= 1) return labels.join("");
  return `${labels.slice(0, -1).join(", ")} et ${labels[labels.length - 1]}`;
}

/** Pourquoi je recommande cette offre, en une ou deux phrases. */
export function discoveryOfferWhy(rec: DiscoveryOfferRecommendation): string {
  switch (rec.reason) {
    case "plateau_bases_solides":
      return "Tu t'entraînes dur, tes bases sont solides et pourtant tu stagnes. C'est exactement le profil où un protocole peptides bien encadré a du sens.";
    case "engagement_faible":
      return "Tu ne veux pas encore t'engager à fond, et c'est normal. Je te propose d'abord d'aller plus loin dans l'analyse pour savoir précisément par où commencer.";
    case "beaucoup_axes_engagement_fort":
      return `Plusieurs domaines sont à reprendre en même temps (${listDomains(rec.weakDomains)}) et tu as envie de t'investir. Là, je veux te suivre au plus près, avec des ajustements très rapprochés.`;
    case "plusieurs_axes":
      return rec.weakDomains.length > 0
        ? `Plusieurs domaines sont sous 6/10 (${listDomains(rec.weakDomains)}). Il faut ajuster chaque détail semaine après semaine, avec moi joignable sur WhatsApp.`
        : "Ton score montre plusieurs axes à reprendre. Il faut ajuster chaque détail semaine après semaine, avec moi joignable sur WhatsApp.";
    case "bases_a_structurer":
    default:
      return "Ta base est là. Ce qui te manque, c'est un cadre clair et un suivi régulier pour tenir dans la durée et transformer ce scan en résultats.";
  }
}

// ─── Déduction coaching et liens ───────────────────────────────────────────

export const DISCOVERY_PROMO_CODE = "DISCOVERY20";
export const DISCOVERY_PROMO_VALIDITY_DAYS = 7;

export const DISCOVERY_COACHING_PAGES: Readonly<Record<"essential" | "elite" | "private-lab", string>> = Object.freeze({
  essential: "https://www.achzodcoaching.com/coaching-essential",
  elite: "https://www.achzodcoaching.com/coaching-elite",
  "private-lab": "https://www.achzodcoaching.com/coaching-achzod-private-lab",
});

export const DISCOVERY_ALL_FORMULAS_URL = "https://www.achzodcoaching.com/formules-coaching";

export interface DiscoveryOfferWindow {
  /** Dernier jour de validité, AAAA-MM-JJ (Europe/Paris). */
  untilIso: string;
  /** Même date en toutes lettres. */
  label: string;
}

/** Fenêtre de 7 jours du code Discovery, comptée depuis la date du rapport (même calcul que le rapport v3). */
export function discoveryOfferWindowFrom(generatedAt: string | Date | null | undefined): DiscoveryOfferWindow | null {
  const base = generatedAt instanceof Date ? generatedAt : new Date(String(generatedAt || ""));
  if (Number.isNaN(base.getTime())) return null;
  const deadline = new Date(base.getTime() + DISCOVERY_PROMO_VALIDITY_DAYS * 24 * 60 * 60 * 1000);
  return {
    untilIso: deadline.toISOString().slice(0, 10),
    label: new Intl.DateTimeFormat("fr-FR", {
      day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris",
    }).format(deadline),
  };
}

/** La fenêtre est encore ouverte aujourd'hui (date de Paris), comme le pont /go/coaching. */
export function isDiscoveryOfferWindowOpen(offerWindow: DiscoveryOfferWindow | null, now: Date = new Date()): boolean {
  if (!offerWindow || !/^\d{4}-\d{2}-\d{2}$/.test(offerWindow.untilIso)) return false;
  const todayParis = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(now);
  return todayParis <= offerWindow.untilIso;
}

export interface DiscoveryOfferDeductionInput {
  /** Fenêtre du code Discovery, déjà vérifiée ouverte (sinon null). */
  openWindow: DiscoveryOfferWindow | null;
  /** Montant de l'Anabolic Bioscan déduit du coaching, lu à sa source existante. */
  anabolicDeductionEuros: number;
}

/** La déduction coaching à mettre en avant pour l'offre recommandée (null si rien à promettre). */
export function discoveryOfferDeduction(
  offer: DiscoveryOfferId,
  input: DiscoveryOfferDeductionInput,
): { title: string; detail: string; code: string | null } | null {
  if (offer === "anabolic-bioscan") {
    if (!(input.anabolicDeductionEuros > 0)) return null;
    return {
      title: `${input.anabolicDeductionEuros}\u00a0€ déduits de ton coaching`,
      detail: `Si tu continues avec moi en coaching ensuite, les ${input.anabolicDeductionEuros}\u00a0€ de ton Anabolic Bioscan sont déduits à 100\u00a0% de ta formule.`,
      code: null,
    };
  }
  if (offer === "peptides-engine") {
    return {
      title: "Montant intégralement déduit de ton coaching",
      detail: "Ce que tu paies pour Peptides Engine est intégralement déduit de ton coaching Essential, Elite ou Private Lab 8 ou 12 semaines (crédit valable 8 semaines).",
      code: null,
    };
  }
  if (!input.openWindow) return null;
  return {
    title: "-20\u00a0% sur ton coaching grâce à ton Discovery",
    detail: `Avec ton code, tu as -20\u00a0% sur les formules 8 et 12 semaines, jusqu'au ${input.openWindow.label}.`,
    code: DISCOVERY_PROMO_CODE,
  };
}

export interface DiscoveryOfferLinkInput {
  openWindow: DiscoveryOfferWindow | null;
  /** utm_medium (report, email). */
  medium: string;
  /** utm_content, ex. offer_card, sticky. */
  content: string;
  /** Origine pour rendre les liens internes absolus (email). Vide = lien relatif. */
  origin?: string;
}

export const DISCOVERY_OFFER_CAMPAIGN = "discovery_offre_unique";

function withUtm(href: string, input: DiscoveryOfferLinkInput, extra: Record<string, string> = {}): string {
  const isAbsolute = /^https?:\/\//.test(href);
  const url = new URL(href, isAbsolute ? undefined : input.origin || "https://apexlabs.achzodcoaching.com");
  for (const [key, value] of Object.entries(extra)) url.searchParams.set(key, value);
  url.searchParams.set("utm_source", "apexlabs");
  url.searchParams.set("utm_medium", input.medium);
  url.searchParams.set("utm_campaign", DISCOVERY_OFFER_CAMPAIGN);
  url.searchParams.set("utm_content", input.content);
  if (isAbsolute || input.origin) return url.toString();
  return `${url.pathname}${url.search}`;
}

/** Lien du bouton principal de l'offre recommandée. */
export function discoveryOfferHref(offer: DiscoveryOfferId, input: DiscoveryOfferLinkInput): string {
  if (offer === "anabolic-bioscan") return withUtm("/offers/anabolic-bioscan", input);
  if (offer === "peptides-engine") return withUtm("/offers/peptides-engine", input);
  if (input.openWindow) {
    return withUtm("/go/coaching", input, {
      code: DISCOVERY_PROMO_CODE,
      until: input.openWindow.untilIso,
      tier: DISCOVERY_COACHING_TIER_PARAM[offer] || "",
    });
  }
  return withUtm(DISCOVERY_COACHING_PAGES[offer], input);
}

/** Lien discret « voir les autres formules ». */
export function discoveryOtherFormulasHref(input: DiscoveryOfferLinkInput): string {
  if (input.openWindow) {
    return withUtm("/go/coaching", input, { code: DISCOVERY_PROMO_CODE, until: input.openWindow.untilIso });
  }
  return withUtm(DISCOVERY_ALL_FORMULAS_URL, input);
}

/** Libellé du bouton principal. */
export function discoveryOfferCtaLabel(offer: DiscoveryOfferId, hasDiscoveryCode: boolean): string {
  switch (offer) {
    case "anabolic-bioscan":
      return "Je fais mon Anabolic Bioscan";
    case "peptides-engine":
      return "Je découvre Peptides Engine";
    default:
      return hasDiscoveryCode
        ? `J'active mes -20\u00a0% sur ${DISCOVERY_COACHING_SHORT_LABELS[offer]}`
        : `Je découvre ${DISCOVERY_COACHING_SHORT_LABELS[offer]}`;
  }
}
