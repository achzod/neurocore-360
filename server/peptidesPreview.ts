import { z } from "zod";
import {
  PEPTAURA_PRODUCT_FEED_URL,
  parsePeptauraProductFeed,
  type PeptauraFeedListing,
  type PeptauraFeedProductSnapshot,
} from "./peptauraProductFeed";
import { selectBestPurchasePlan } from "./peptidesPurchasePlan";

const goalValues = [
  "recovery",
  "gh-antiaging",
  "fatloss",
  "sleep",
  "cognitive",
  "libido",
  "testo-boost",
  "skin-hair",
  "endurance",
] as const;

const conditionValues = [
  "none",
  "diabetes",
  "cancer",
  "pregnant",
  "breastfeeding",
  "autoimmune",
  "cardiac",
  "hypertension",
  "thyroid",
  "renal-hepatic",
] as const;

const countryValues = ["FR", "BE", "CH", "LU", "CA", "US", "AE", "GB", "DE", "ES", "IT", "NL", "PT", "MA", "DZ", "TN"] as const;

export const peptidesPreviewInputSchema = z.object({
  firstName: z.string().trim().min(2).max(60),
  email: z.string().trim().toLowerCase().email(),
  age: z.coerce.number().int().min(18).max(75),
  weightKg: z.coerce.number().min(40).max(220),
  primaryGoal: z.enum(goalValues),
  secondaryGoals: z.array(z.enum(goalValues)).max(2).default([]),
  conditions: z.array(z.enum(conditionValues)).min(1).max(5),
  bloodwork: z.enum(["recent", "old", "never"]),
  injectionComfort: z.enum(["comfortable", "possible", "anxious", "refuse"]),
  experience: z.enum(["none", "read", "tried", "regular"]),
  budget: z.enum(["under100", "100-200", "200-300", "over300"]),
  country: z.enum(countryValues),
  medications: z.string().trim().max(500).optional().default(""),
  consent: z.literal(true),
  attribution: z.object({
    source: z.string().trim().max(80).optional(),
    medium: z.string().trim().max(80).optional(),
    campaign: z.string().trim().max(120).optional(),
    content: z.string().trim().max(120).optional(),
  }).strict().optional().default({}),
}).superRefine((value, ctx) => {
  if (value.conditions.includes("none") && value.conditions.length > 1) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["conditions"], message: "Choisis soit aucune condition, soit les conditions concernées." });
  }
  if (value.secondaryGoals.includes(value.primaryGoal)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["secondaryGoals"], message: "L'objectif principal ne doit pas être répété." });
  }
});

export type PeptidesPreviewInput = z.infer<typeof peptidesPreviewInputSchema>;

export interface PeptidesPreviewMolecule {
  name: string;
  role: string;
  reason: string;
  startingFormat: string;
  startingPackagePriceUsd: number;
  cycleDurationLabel: string;
  calculationBasis: string;
  totalRequiredMg: number;
  vialStrengthMg: number;
  vialsRequired: number;
  vialsPurchased: number;
  packageCount: number;
  estimatedTotalPriceUsd: number;
}

export interface PeptidesPreviewResult {
  status: "eligible" | "review_required";
  moleculeCount: number;
  molecules: PeptidesPreviewMolecule[];
  estimatedStarterCostUsd: number | null;
  estimatedProtocolCostUsd: number | null;
  totalVialsRequired: number | null;
  totalVialsPurchased: number | null;
  totalPackages: number | null;
  priceCheckedAt: string;
  durationLabel: string;
  budgetFit: "within" | "above" | "unknown";
  headline: string;
  rationale: string;
  budgetExplanation: string;
  blockers: string[];
  nextStep: "peptides_engine" | "blood_analysis" | "manual_review";
}

type Goal = typeof goalValues[number];

const goalLabels: Record<Goal, string> = {
  recovery: "récupération",
  "gh-antiaging": "axe GH",
  fatloss: "perte de graisse",
  sleep: "sommeil",
  cognitive: "cognition",
  libido: "libido",
  "testo-boost": "axe testostérone",
  "skin-hair": "peau et cheveux",
  endurance: "endurance",
};

type Candidate = {
  name: string;
  aliases?: string[];
  role: string;
  reason: (input: PeptidesPreviewInput) => string;
  planning: {
    durationLabel: string;
    calculationBasis: string;
    totalNeedMg: number;
    maxOverstockRatio?: number;
  };
};

const candidatesByGoal: Record<Goal, Candidate[]> = {
  recovery: [
    { name: "BPC-157", role: "Récupération tissulaire ciblée", reason: () => "Cet axe construit la partie locale du protocole autour de la récupération tissulaire.", planning: { durationLabel: "8 semaines", calculationBasis: "250 mcg deux fois par jour × 56 jours = 28 mg", totalNeedMg: 28 } },
    { name: "TB-500", aliases: ["TB500"], role: "Récupération systémique et mobilité tissulaire", reason: () => "Il complète l'axe local lorsque la récupération doit couvrir plusieurs tissus ou une charge d'entraînement élevée.", planning: { durationLabel: "4 semaines d'induction", calculationBasis: "2,5 mg deux fois par semaine × 4 semaines = 20 mg", totalNeedMg: 20 } },
  ],
  "gh-antiaging": [
    { name: "CJC-1295 (no DAC)", aliases: ["CJC-1295 sans DAC", "CJC1295 no DAC"], role: "Signal pulsatile de l'axe GH", reason: () => "La version sans DAC permet au rapport complet de préserver une logique pulsatile plutôt qu'une exposition continue.", planning: { durationLabel: "8 semaines", calculationBasis: "100 mcg, 5 fois/semaine × 8 semaines = 4 mg", totalNeedMg: 4 } },
    { name: "Ipamorelin", role: "Sécrétagogue complémentaire", reason: () => "Il complète le signal GHRH sans ajouter automatiquement un stack plus lourd que nécessaire.", planning: { durationLabel: "8 semaines", calculationBasis: "100 mcg, 5 fois/semaine × 8 semaines = 4 mg", totalNeedMg: 4 } },
  ],
  fatloss: [
    { name: "Semaglutide", role: "Contrôle de l'appétit et axe métabolique", reason: (input) => `Avec un poids déclaré de ${input.weightKg} kg, la base de chiffrage utilise une titration progressive plutôt qu'un dosage maximal artificiel.`, planning: { durationLabel: "12 semaines", calculationBasis: "0,25 mg/sem × 4 + 0,5 mg/sem × 4 + 1 mg/sem × 4 = 7 mg", totalNeedMg: 7, maxOverstockRatio: 1.5 } },
  ],
  sleep: [
    { name: "DSIP", role: "Architecture et qualité du sommeil", reason: () => "L'algorithme privilégie un seul levier ciblé avant d'ajouter des molécules de récupération indirectes.", planning: { durationLabel: "4 semaines", calculationBasis: "175 mcg au coucher × 28 jours = 4,9 mg", totalNeedMg: 4.9 } },
  ],
  cognitive: [
    { name: "Semax", role: "Focus et performance cognitive", reason: () => "Cet axe privilégie l'attention et la clarté mentale plutôt qu'un peptide métabolique sans rapport avec le besoin déclaré.", planning: { durationLabel: "4 semaines", calculationBasis: "500 mcg par jour × 28 jours = 14 mg", totalNeedMg: 14 } },
    { name: "Selank", role: "Stabilité cognitive sous stress", reason: () => "Il complète l'axe focus lorsque la qualité cognitive doit rester stable sous pression, sans multiplier les injections.", planning: { durationLabel: "4 semaines", calculationBasis: "250 mcg deux fois par jour × 28 jours = 14 mg", totalNeedMg: 14 } },
  ],
  libido: [
    { name: "PT-141", role: "Réponse sexuelle centrale", reason: () => "Le choix oriente vers un levier central spécifique ; les facteurs hormonaux restent séparés et doivent être vérifiés par bilan.", planning: { durationLabel: "8 utilisations ponctuelles", calculationBasis: "Base de chiffrage à 1 mg par utilisation = 8 mg", totalNeedMg: 8 } },
  ],
  "testo-boost": [
    { name: "KissPeptin-10", aliases: ["Kisspeptin-10", "Kisspeptin 10"], role: "Axe hypothalamo-hypophyso-gonadique", reason: () => "L'objectif testostérone demande d'abord de vérifier LH, FSH, SHBG, estradiol et prolactine avant toute décision finale sur cet axe.", planning: { durationLabel: "Après validation hormonale", calculationBasis: "Aucun chiffrage automatique sans protocole HPG validé", totalNeedMg: 0 } },
  ],
  "skin-hair": [
    { name: "GHK-Cu", aliases: ["GHK Cu"], role: "Peau, cheveux et matrice extracellulaire", reason: () => "La sélection reste sur un axe unique et directement cohérent, sans ajouter un stack GH automatique.", planning: { durationLabel: "8 semaines", calculationBasis: "2 mg cinq fois par semaine × 8 semaines = 80 mg", totalNeedMg: 80 } },
  ],
  endurance: [
    { name: "MOTS-c", aliases: ["MOTS c"], role: "Efficience métabolique et endurance", reason: () => "La sélection privilégie l'efficience énergétique avant tout axe esthétique.", planning: { durationLabel: "8 semaines", calculationBasis: "5 mg par semaine × 8 semaines = 40 mg", totalNeedMg: 40 } },
    { name: "SS-31", aliases: ["SS-31 (Elamipretide)", "Elamipretide"], role: "Fonction mitochondriale", reason: () => "Il complète l'axe endurance lorsque la priorité est la capacité de travail plutôt que la simple perte de poids.", planning: { durationLabel: "4 semaines", calculationBasis: "1 mg par jour × 28 jours = 28 mg", totalNeedMg: 28 } },
  ],
};

const hardReviewConditions = new Set(["cancer", "pregnant", "breastfeeding", "cardiac", "renal-hepatic"]);

function normalize(value: string): string {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "");
}

function findSnapshot(candidate: Candidate, snapshots: PeptauraFeedProductSnapshot[], shippingVendors?: string[]): PeptauraFeedProductSnapshot | null {
  const wanted = [candidate.name, ...(candidate.aliases || [])].map(normalize);
  const ranked = snapshots.filter((snapshot) => snapshot.live && availableListings(snapshot, shippingVendors).length > 0).map((snapshot) => {
    const values = [snapshot.slug, ...snapshot.listings.map((listing) => listing.name)].map(normalize);
    const exact = values.some((value) => wanted.includes(value));
    const partial = values.some((value) => wanted.some((name) => value.includes(name) || name.includes(value)));
    return { snapshot, score: exact ? 2 : partial ? 1 : 0 };
  }).filter((entry) => entry.score > 0).sort((a, b) => b.score - a.score);
  return ranked[0]?.snapshot || null;
}

function availableListings(snapshot: PeptauraFeedProductSnapshot, shippingVendors?: string[]): PeptauraFeedListing[] {
  const allowed = shippingVendors?.map(normalize).filter(Boolean) || [];
  return snapshot.listings.filter((listing) =>
    listing.enabled
    && !listing.suspended
    && !listing.outOfStock
    && listing.orderingMode === "available"
    && listing.shippingOptionCount > 0
    && (allowed.length === 0 || allowed.some((vendor) => normalize(listing.supplier).includes(vendor) || vendor.includes(normalize(listing.supplier))))
  );
}

function budgetCeilingCents(budget: PeptidesPreviewInput["budget"]): number | null {
  // "under100" is strictly below $100, so $100.00 must not be marked within.
  if (budget === "under100") return 9_999;
  if (budget === "100-200") return 20_000;
  if (budget === "200-300") return 30_000;
  return null;
}

type CandidateSelection = { candidate: Candidate; goal: Goal; priority: "primary" | "secondary" };

function uniqueCandidates(input: PeptidesPreviewInput): CandidateSelection[] {
  const primary = candidatesByGoal[input.primaryGoal].map((candidate) => ({ candidate, goal: input.primaryGoal, priority: "primary" as const }));
  const secondary = input.secondaryGoals.flatMap((goal) => candidatesByGoal[goal].slice(0, 1).map((candidate) => ({ candidate, goal, priority: "secondary" as const })));
  const seen = new Set<string>();
  return [...primary, ...secondary].filter(({ candidate }) => {
    const key = normalize(candidate.name);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 4);
}

export function buildPeptidesPreview(
  input: PeptidesPreviewInput,
  snapshots: PeptauraFeedProductSnapshot[],
  checkedAt = new Date().toISOString(),
  shippingVendors?: string[],
): PeptidesPreviewResult {
  const blockers: string[] = [];
  const conditions = input.conditions.filter((condition) => condition !== "none");
  const goals = [input.primaryGoal, ...input.secondaryGoals];
  for (const condition of conditions) {
    if (hardReviewConditions.has(condition)) blockers.push(condition);
  }
  if (goals.includes("testo-boost") && input.bloodwork !== "recent") blockers.push("bilan_hormonal_recent_requis");
  if (goals.includes("testo-boost") && input.bloodwork === "recent") blockers.push("protocole_hpg_a_personnaliser");
  if (goals.includes("libido") && input.conditions.includes("hypertension")) blockers.push("pression_arterielle_a_verifier");
  if (goals.includes("fatloss") && input.conditions.includes("diabetes")) blockers.push("profil_glycemique_a_revoir");
  if (input.injectionComfort === "refuse" && goals.some((goal) => goal !== "cognitive")) blockers.push("injections_refusees");

  if (blockers.length > 0) {
    return {
      status: "review_required",
      moleculeCount: 0,
      molecules: [],
      estimatedStarterCostUsd: null,
      estimatedProtocolCostUsd: null,
      totalVialsRequired: null,
      totalVialsPurchased: null,
      totalPackages: null,
      priceCheckedAt: checkedAt,
      durationLabel: "À confirmer après revue du profil",
      budgetFit: "unknown",
      headline: "Ton profil demande une validation ciblée avant de chiffrer un stack.",
      rationale: "L'algorithme a détecté un facteur qui change directement le choix des molécules. Il ne remplit pas artificiellement une recommandation dans ce cas.",
      budgetExplanation: "Aucun prix n'est affiché tant que la sélection ne peut pas être calculée proprement.",
      blockers,
      nextStep: blockers.includes("bilan_hormonal_recent_requis") ? "blood_analysis" : "manual_review",
    };
  }

  const desiredCandidates = uniqueCandidates(input);
  const selected = desiredCandidates.map(({ candidate, goal, priority }) => {
    const snapshot = findSnapshot(candidate, snapshots, shippingVendors);
    const purchasePlan = snapshot
      ? selectBestPurchasePlan(
          availableListings(snapshot, shippingVendors),
          candidate.planning.totalNeedMg,
          candidate.planning.maxOverstockRatio || 1.3,
        )
      : null;
    if (!snapshot || !purchasePlan) return null;
    return {
      name: snapshot.slug,
      role: candidate.role,
      reason: `Tu as placé « ${goalLabels[goal]} » comme ${priority === "primary" ? "priorité principale" : "objectif secondaire"}. ${candidate.reason(input)}`,
      startingFormat: `${purchasePlan.listing.dosage} · boîte de ${purchasePlan.listing.boxSize}`,
      startingPackagePriceUsd: purchasePlan.packagePriceUsd,
      cycleDurationLabel: candidate.planning.durationLabel,
      calculationBasis: candidate.planning.calculationBasis,
      totalRequiredMg: purchasePlan.needMg,
      vialStrengthMg: purchasePlan.vialMg,
      vialsRequired: purchasePlan.requestedVials,
      vialsPurchased: purchasePlan.deliveredVials,
      packageCount: purchasePlan.packageCount,
      estimatedTotalPriceUsd: purchasePlan.totalPriceUsd,
    } satisfies PeptidesPreviewMolecule;
  }).filter((item): item is PeptidesPreviewMolecule => item !== null);

  if (selected.length !== desiredCandidates.length) {
    throw new Error("PEPTAURA_PREVIEW_INCOMPLETE_OPERATIONAL_PLAN");
  }

  const starterCostCents = selected.reduce((sum, item) => sum + Math.round(item.startingPackagePriceUsd * 100), 0);
  const protocolCostCents = selected.reduce((sum, item) => sum + Math.round(item.estimatedTotalPriceUsd * 100), 0);
  const estimatedStarterCostUsd = starterCostCents / 100;
  const estimatedProtocolCostUsd = protocolCostCents / 100;
  const totalVialsRequired = selected.reduce((sum, item) => sum + item.vialsRequired, 0);
  const totalVialsPurchased = selected.reduce((sum, item) => sum + item.vialsPurchased, 0);
  const totalPackages = selected.reduce((sum, item) => sum + item.packageCount, 0);
  const ceilingCents = budgetCeilingCents(input.budget);
  const budgetFit = ceilingCents == null || protocolCostCents <= ceilingCents ? "within" : "above";
  const budgetLabel = input.budget === "under100" ? "moins de 100 USD" : input.budget === "100-200" ? "100 à 200 USD" : input.budget === "200-300" ? "200 à 300 USD" : "plus de 300 USD";
  const budgetExplanation = ceilingCents == null
    ? `Tu as déclaré un budget de plus de 300 USD : le total actuel de $${estimatedProtocolCostUsd.toFixed(2)} ne dépasse pas ta capacité annoncée.`
    : budgetFit === "within"
      ? `Le total de $${estimatedProtocolCostUsd.toFixed(2)} respecte ton budget déclaré de ${budgetLabel}.`
      : `Le total de $${estimatedProtocolCostUsd.toFixed(2)} ne tient pas dans ton budget déclaré de ${budgetLabel}. Le rapport complet devra prioriser les axes au lieu de te faire acheter un stack hors budget.`;
  const durations = Array.from(new Set(selected.map((item) => item.cycleDurationLabel)));
  return {
    status: "eligible",
    moleculeCount: selected.length,
    molecules: selected,
    // Preserve the legacy field's original meaning for existing API consumers.
    // The UI and emails use estimatedProtocolCostUsd for the complete cycle.
    estimatedStarterCostUsd,
    estimatedProtocolCostUsd,
    totalVialsRequired,
    totalVialsPurchased,
    totalPackages,
    priceCheckedAt: checkedAt,
    durationLabel: durations.length === 1 ? durations[0] : "Durée indiquée pour chaque molécule",
    budgetFit,
    headline: `Ton aperçu retient ${selected.length} molécule${selected.length > 1 ? "s" : ""} pour un coût molécules de $${estimatedProtocolCostUsd.toFixed(2)} sur les durées affichées.`,
    rationale: "Voici comment le prix est construit : chaque durée est convertie en besoin total, puis en fioles entières et en boîtes réellement achetables dans le catalogue partenaire live. Le total additionne ces boîtes au centime, hors livraison — pas un prix d'appel basé sur une seule boîte.",
    budgetExplanation,
    blockers: [],
    nextStep: "peptides_engine",
  };
}

const countryLabels: Record<string, string> = {
  FR: "France", BE: "Belgium", CH: "Switzerland", LU: "Luxembourg", CA: "Canada", US: "United States",
  AE: "United Arab Emirates", GB: "United Kingdom", DE: "Germany", ES: "Spain", IT: "Italy", NL: "Netherlands",
  PT: "Portugal", MA: "Morocco", DZ: "Algeria", TN: "Tunisia",
};

const cachedCatalog = new Map<string, { expiresAt: number; snapshots: PeptauraFeedProductSnapshot[]; checkedAt: string; shippingVendors: string[] }>();

export async function getLivePeptauraPreviewCatalog(countryCode = "FR", nowMs = Date.now()): Promise<{ snapshots: PeptauraFeedProductSnapshot[]; checkedAt: string; shippingVendors: string[] }> {
  const cacheKey = countryCode.toUpperCase();
  const cached = cachedCatalog.get(cacheKey);
  if (cached && cached.expiresAt > nowMs) return { snapshots: cached.snapshots, checkedAt: cached.checkedAt, shippingVendors: cached.shippingVendors };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8_000);
  try {
    const response = await fetch(PEPTAURA_PRODUCT_FEED_URL, {
      headers: { accept: "application/json", "user-agent": "APEXLABS-PeptidesPreview/1.0" },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`PEPTAURA_PREVIEW_HTTP_${response.status}`);
    const raw = await response.text();
    const checkedAt = new Date(nowMs).toISOString();
    const parsed = parsePeptauraProductFeed(raw, { nowMs, maxAgeMs: 6 * 60 * 60_000, fetchedAt: checkedAt });
    if (!parsed?.snapshots.length) throw new Error("PEPTAURA_PREVIEW_INVALID_FEED");
    const country = countryLabels[cacheKey] || countryCode;
    const shippingResponse = await fetch(`https://www.peptaura.com/shipping?country=${encodeURIComponent(country)}`, {
      headers: { accept: "text/html", "user-agent": "APEXLABS-PeptidesPreview/1.0" },
      signal: controller.signal,
    });
    if (!shippingResponse.ok) throw new Error(`PEPTAURA_PREVIEW_SHIPPING_HTTP_${shippingResponse.status}`);
    const shippingHtml = await shippingResponse.text();
    const shippingVendors = Array.from(shippingHtml.matchAll(/href="\/vendors\/([^"?]+)"/gi))
      .map((match) => decodeURIComponent(match[1]).replace(/[-_]+/g, " ").trim())
      .filter(Boolean);
    if (shippingVendors.length === 0) throw new Error("PEPTAURA_PREVIEW_SHIPPING_UNAVAILABLE");
    const value = { snapshots: parsed.snapshots, checkedAt, shippingVendors: Array.from(new Set(shippingVendors)) };
    cachedCatalog.set(cacheKey, { ...value, expiresAt: nowMs + 15 * 60_000 });
    return value;
  } finally {
    clearTimeout(timer);
  }
}
