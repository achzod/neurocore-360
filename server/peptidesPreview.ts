import { z } from "zod";
import {
  PEPTAURA_PRODUCT_FEED_URL,
  parsePeptauraProductFeed,
  type PeptauraFeedListing,
  type PeptauraFeedProductSnapshot,
} from "./peptauraProductFeed";
import { effectivePackagePrice } from "./peptidesPurchasePlan";

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
}

export interface PeptidesPreviewResult {
  status: "eligible" | "review_required";
  moleculeCount: number;
  molecules: PeptidesPreviewMolecule[];
  estimatedStarterCostUsd: number | null;
  priceCheckedAt: string;
  durationLabel: string;
  budgetFit: "within" | "above" | "unknown";
  headline: string;
  rationale: string;
  blockers: string[];
  nextStep: "peptides_engine" | "blood_analysis" | "manual_review";
}

type Goal = typeof goalValues[number];

type Candidate = {
  name: string;
  aliases?: string[];
  role: string;
  reason: (input: PeptidesPreviewInput) => string;
};

const candidatesByGoal: Record<Goal, Candidate[]> = {
  recovery: [
    { name: "BPC-157", role: "Récupération tissulaire ciblée", reason: () => "Ton objectif principal concerne la récupération : cet axe est retenu pour construire la partie locale du protocole." },
    { name: "TB-500", aliases: ["TB500"], role: "Récupération systémique et mobilité tissulaire", reason: () => "Il complète l'axe local lorsque la récupération doit couvrir plusieurs tissus ou une charge d'entraînement élevée." },
  ],
  "gh-antiaging": [
    { name: "CJC-1295 (no DAC)", aliases: ["CJC-1295 sans DAC", "CJC1295 no DAC"], role: "Signal pulsatile de l'axe GH", reason: () => "Ton objectif vise l'axe GH : la version sans DAC permet au rapport complet de préserver une logique pulsatile plutôt qu'une exposition continue." },
    { name: "Ipamorelin", role: "Sécrétagogue complémentaire", reason: () => "Il complète le signal GHRH sans ajouter automatiquement un stack plus lourd que nécessaire." },
  ],
  fatloss: [
    { name: "Retatrutide", aliases: ["Tirzepatide", "Semaglutide"], role: "Contrôle de l'appétit et axe métabolique", reason: (input) => `Ton objectif prioritaire est la perte de graisse et ton poids déclaré est ${input.weightKg} kg : le rapport complet devra calibrer progressivement l'axe métabolique au lieu d'empiler plusieurs molécules.` },
  ],
  sleep: [
    { name: "DSIP", role: "Architecture et qualité du sommeil", reason: () => "Le sommeil est ton axe principal : l'algorithme privilégie un seul levier ciblé avant d'ajouter des molécules de récupération indirectes." },
  ],
  cognitive: [
    { name: "Semax", role: "Focus et performance cognitive", reason: () => "Ton objectif demande un levier orienté attention et clarté mentale plutôt qu'un peptide métabolique sans rapport avec ta priorité." },
    { name: "Selank", role: "Stabilité cognitive sous stress", reason: () => "Il complète l'axe focus lorsque la qualité cognitive doit rester stable sous pression, sans multiplier les injections." },
  ],
  libido: [
    { name: "PT-141", role: "Réponse sexuelle centrale", reason: () => "La priorité libido oriente vers un levier central spécifique ; les facteurs hormonaux restent séparés et doivent être vérifiés par bilan." },
  ],
  "testo-boost": [
    { name: "KissPeptin-10", aliases: ["Kisspeptin-10", "Kisspeptin 10"], role: "Axe hypothalamo-hypophyso-gonadique", reason: () => "L'objectif testostérone demande d'abord de vérifier LH, FSH, SHBG, estradiol et prolactine avant toute décision finale sur cet axe." },
  ],
  "skin-hair": [
    { name: "GHK-Cu", aliases: ["GHK Cu"], role: "Peau, cheveux et matrice extracellulaire", reason: () => "Ton objectif peau et cheveux permet de rester sur un axe unique et directement cohérent, sans ajouter un stack GH automatique." },
  ],
  endurance: [
    { name: "MOTS-c", aliases: ["MOTS c"], role: "Efficience métabolique et endurance", reason: () => "Ton objectif endurance oriente vers l'efficience énergétique avant tout axe esthétique." },
    { name: "SS-31", aliases: ["SS-31 (Elamipretide)", "Elamipretide"], role: "Fonction mitochondriale", reason: () => "Il complète l'axe endurance lorsque la priorité est la capacité de travail plutôt que la simple perte de poids." },
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

function cheapestListing(listings: PeptauraFeedListing[]): PeptauraFeedListing | null {
  return [...listings].sort((a, b) => effectivePackagePrice(a, 1) - effectivePackagePrice(b, 1))[0] || null;
}

function budgetCeilingUsd(budget: PeptidesPreviewInput["budget"]): number | null {
  if (budget === "under100") return 100;
  if (budget === "100-200") return 200;
  if (budget === "200-300") return 300;
  return null;
}

function uniqueCandidates(input: PeptidesPreviewInput): Candidate[] {
  const primary = candidatesByGoal[input.primaryGoal];
  const secondary = input.secondaryGoals.flatMap((goal) => candidatesByGoal[goal].slice(0, 1));
  const seen = new Set<string>();
  return [...primary, ...secondary].filter((candidate) => {
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
  if (goals.includes("libido") && input.conditions.includes("hypertension")) blockers.push("pression_arterielle_a_verifier");
  if (goals.includes("fatloss") && input.conditions.includes("diabetes")) blockers.push("profil_glycemique_a_revoir");
  if (input.injectionComfort === "refuse" && goals.some((goal) => goal !== "cognitive")) blockers.push("injections_refusees");

  if (blockers.length > 0) {
    return {
      status: "review_required",
      moleculeCount: 0,
      molecules: [],
      estimatedStarterCostUsd: null,
      priceCheckedAt: checkedAt,
      durationLabel: "À confirmer après revue du profil",
      budgetFit: "unknown",
      headline: "Ton profil demande une validation ciblée avant de chiffrer un stack.",
      rationale: "L'algorithme a détecté un facteur qui change directement le choix des molécules. Il ne remplit pas artificiellement une recommandation dans ce cas.",
      blockers,
      nextStep: blockers.includes("bilan_hormonal_recent_requis") ? "blood_analysis" : "manual_review",
    };
  }

  const desiredCandidates = uniqueCandidates(input);
  const selected = desiredCandidates.map((candidate) => {
    const snapshot = findSnapshot(candidate, snapshots, shippingVendors);
    const listing = snapshot ? cheapestListing(availableListings(snapshot, shippingVendors)) : null;
    if (!snapshot || !listing) return null;
    const price = effectivePackagePrice(listing, 1);
    if (!Number.isFinite(price) || price <= 0) return null;
    return {
      name: snapshot.slug,
      role: candidate.role,
      reason: candidate.reason(input),
      startingFormat: `${listing.dosage} · boîte de ${listing.boxSize}`,
      startingPackagePriceUsd: price,
    } satisfies PeptidesPreviewMolecule;
  }).filter((item): item is PeptidesPreviewMolecule => item !== null);

  if (selected.length !== desiredCandidates.length) {
    throw new Error("PEPTAURA_PREVIEW_INCOMPLETE_LIVE_MATCH");
  }

  const estimatedStarterCostUsd = Math.round(selected.reduce((sum, item) => sum + item.startingPackagePriceUsd, 0) * 100) / 100;
  const ceiling = budgetCeilingUsd(input.budget);
  const budgetFit = ceiling == null || estimatedStarterCostUsd <= ceiling ? "within" : "above";
  return {
    status: "eligible",
    moleculeCount: selected.length,
    molecules: selected,
    estimatedStarterCostUsd,
    priceCheckedAt: checkedAt,
    durationLabel: input.primaryGoal === "fatloss" ? "Cycle progressif, durée exacte calculée dans le rapport" : "Base de 8 à 12 semaines, durée exacte calculée dans le rapport",
    budgetFit,
    headline: `Ton aperçu retient ${selected.length} molécule${selected.length > 1 ? "s" : ""}, sans empiler d'axes inutiles.`,
    rationale: "Le résultat croise ta priorité, tes objectifs secondaires, tes contraintes, ton bilan et les produits réellement disponibles sur PeptAura au moment du calcul.",
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
