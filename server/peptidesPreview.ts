import { z } from "zod";
import {
  PEPTAURA_PRODUCT_FEED_URL,
  parsePeptauraProductFeed,
  type PeptauraFeedListing,
  type PeptauraFeedProductSnapshot,
} from "./peptauraProductFeed";
import { buildPurchasePlan, parseListingMg, type PeptidePurchasePlan } from "./peptidesPurchasePlan";
import {
  parsePeptauraShippingPage,
  shippingForSubtotal,
  type PeptauraShippingQuote,
} from "./peptauraShipping";

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
  heightCm: z.coerce.number().min(140).max(220),
  sex: z.enum(["female", "male"]),
  bodyFatRange: z.enum(["under10", "10-15", "15-20", "20-25", "25-30", "over30", "unknown"]),
  primaryGoal: z.enum(goalValues),
  secondaryGoals: z.array(z.enum(goalValues)).max(2).default([]),
  goalDetails: z.string().trim().min(20).max(1200),
  timeline: z.enum(["4-6", "8-12", "12plus"]),
  recoveryScope: z.enum(["localized", "multi-site", "systemic", "not-applicable"]).default("not-applicable"),
  glp1History: z.enum(["never", "tolerated", "stopped-side-effects", "current", "not-applicable"]).default("not-applicable"),
  cognitiveStress: z.enum(["low", "moderate", "high", "not-applicable"]).default("not-applicable"),
  conditions: z.array(z.enum(conditionValues)).min(1).max(5),
  bloodwork: z.enum(["recent", "old", "never"]),
  bloodPressure: z.enum(["normal", "controlled", "high", "unknown"]),
  sleepHours: z.coerce.number().min(2).max(12),
  injectionComfort: z.enum(["comfortable", "possible", "anxious", "refuse"]),
  injectionFrequency: z.enum(["twice-daily", "daily", "few-week", "weekly", "minimal"]),
  refrigeration: z.enum(["yes-private", "yes-shared", "no"]),
  experience: z.enum(["none", "read", "tried", "regular"]),
  trainingFrequency: z.enum(["none", "1-2", "3-4", "5plus"]),
  budgetTotalUsd: z.coerce.number().min(50).max(5000),
  country: z.enum(countryValues),
  medications: z.string().trim().min(2).max(800),
  allergies: z.string().trim().min(2).max(500),
  currentPeptides: z.string().trim().min(2).max(1000),
  pastPeptides: z.string().trim().min(2).max(1000),
  startWhen: z.enum(["asap", "1-2weeks", "1month", "planning"]),
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
  if (value.primaryGoal === "recovery" && value.recoveryScope === "not-applicable") {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["recoveryScope"], message: "Précise si la récupération concerne une zone ou plusieurs." });
  }
  if (value.primaryGoal === "fatloss" && value.glp1History === "not-applicable") {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["glp1History"], message: "Précise ton expérience avec les GLP-1." });
  }
});

export type PeptidesPreviewInput = z.infer<typeof peptidesPreviewInputSchema>;

export interface PeptidesPreviewMolecule {
  name: string;
  supplier: string;
  productUrl: string;
  role: string;
  reason: string;
  doseSummary: string;
  administrationCount: number;
  startingFormat: string;
  startingPackagePriceUsd: number;
  cycleDurationLabel: string;
  calculationBasis: string;
  totalRequiredMg: number;
  vialStrengthMg: number;
  mathematicalVials: number;
  operationalVials: number;
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
  estimatedShippingCostUsd: number | null;
  estimatedGrandTotalUsd: number | null;
  monthlyEquivalentUsd: number | null;
  shippingBreakdown: Array<{ supplier: string; subtotalUsd: number; shippingUsd: number; speed: string }>;
  totalVialsRequired: number | null;
  totalVialsPurchased: number | null;
  totalPackages: number | null;
  priceCheckedAt: string;
  durationLabel: string;
  budgetFit: "within" | "above" | "unknown";
  headline: string;
  rationale: string;
  budgetExplanation: string;
  quoteExplanation: string;
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
    doseMg?: number;
    administrationsPerWeek?: number;
    durationWeeks?: number;
    phasedWeeklyDosesMg?: Array<{ doseMg: number; weeks: number }>;
    openingWindowDays?: number;
    maxOverstockRatio?: number;
  };
};

const candidatesByGoal: Record<Goal, Candidate[]> = {
  recovery: [
    { name: "BPC-157", role: "Récupération tissulaire ciblée", reason: () => "Cet axe construit la partie locale du scénario autour de la récupération tissulaire.", planning: { durationLabel: "8 semaines", doseMg: 0.25, administrationsPerWeek: 14, durationWeeks: 8 } },
    { name: "TB-500", aliases: ["TB500"], role: "Récupération systémique complémentaire", reason: () => "Il n'est ajouté que lorsque la récupération concerne plusieurs zones ou une contrainte systémique déclarée.", planning: { durationLabel: "4 semaines d'induction", doseMg: 2.5, administrationsPerWeek: 2, durationWeeks: 4 } },
  ],
  "gh-antiaging": [
    { name: "CJC-1295 (no DAC)", aliases: ["CJC-1295 sans DAC", "CJC1295 no DAC"], role: "Signal pulsatile de l'axe GH", reason: () => "La version sans DAC conserve une logique pulsatile plutôt qu'une exposition continue.", planning: { durationLabel: "8 semaines", doseMg: 0.1, administrationsPerWeek: 5, durationWeeks: 8, openingWindowDays: 28 } },
    { name: "Ipamorelin", role: "Sécrétagogue complémentaire", reason: () => "Il complète le signal GHRH dans le scénario de référence sans ajouter un troisième axe.", planning: { durationLabel: "8 semaines", doseMg: 0.1, administrationsPerWeek: 5, durationWeeks: 8, openingWindowDays: 28 } },
  ],
  fatloss: [
    { name: "Semaglutide", role: "Contrôle de l'appétit et axe métabolique", reason: (input) => `À ${input.weightKg} kg pour ${input.heightCm} cm, le pré-calcul conserve une titration progressive et vérifie d'abord l'historique GLP-1.`, planning: { durationLabel: "12 semaines", phasedWeeklyDosesMg: [{ doseMg: 0.25, weeks: 4 }, { doseMg: 0.5, weeks: 4 }, { doseMg: 1, weeks: 4 }], durationWeeks: 12, maxOverstockRatio: 1.5 } },
  ],
  sleep: [
    { name: "DSIP", role: "Architecture et qualité du sommeil", reason: () => "Le scénario reste sur un seul levier ciblé au lieu d'empiler des molécules de récupération indirectes.", planning: { durationLabel: "4 semaines", doseMg: 0.175, administrationsPerWeek: 7, durationWeeks: 4 } },
  ],
  cognitive: [
    { name: "Semax", role: "Focus et performance cognitive", reason: () => "Cet axe cible l'attention et la clarté mentale plutôt qu'un peptide métabolique sans rapport avec le besoin déclaré.", planning: { durationLabel: "4 semaines", doseMg: 0.5, administrationsPerWeek: 7, durationWeeks: 4 } },
    { name: "Selank", role: "Stabilité cognitive sous stress", reason: () => "Il n'est ajouté que lorsque le stress cognitif déclaré est élevé.", planning: { durationLabel: "4 semaines", doseMg: 0.25, administrationsPerWeek: 14, durationWeeks: 4 } },
  ],
  libido: [
    { name: "PT-141", role: "Réponse sexuelle centrale", reason: () => "Le scénario isole un levier central spécifique ; les facteurs hormonaux restent séparés.", planning: { durationLabel: "8 utilisations ponctuelles", doseMg: 1, administrationsPerWeek: 1, durationWeeks: 8 } },
  ],
  "testo-boost": [
    { name: "KissPeptin-10", aliases: ["Kisspeptin-10", "Kisspeptin 10"], role: "Axe hypothalamo-hypophyso-gonadique", reason: () => "Cet axe ne peut pas être chiffré automatiquement sans valeurs hormonales exploitables.", planning: { durationLabel: "Après validation hormonale" } },
  ],
  "skin-hair": [
    { name: "GHK-Cu", aliases: ["GHK Cu"], role: "Peau, cheveux et matrice extracellulaire", reason: () => "La sélection reste sur un axe unique directement cohérent avec l'objectif déclaré.", planning: { durationLabel: "8 semaines", doseMg: 2, administrationsPerWeek: 5, durationWeeks: 8 } },
  ],
  endurance: [
    { name: "MOTS-c", aliases: ["MOTS c"], role: "Efficience métabolique et endurance", reason: () => "La sélection privilégie l'efficience énergétique avant tout axe esthétique.", planning: { durationLabel: "8 semaines", doseMg: 5, administrationsPerWeek: 1, durationWeeks: 8, openingWindowDays: 28 } },
    { name: "SS-31", aliases: ["SS-31 (Elamipretide)", "Elamipretide"], role: "Fonction mitochondriale", reason: () => "Il n'est ajouté que pour une fréquence d'entraînement élevée avec priorité de capacité de travail.", planning: { durationLabel: "4 semaines", doseMg: 1, administrationsPerWeek: 7, durationWeeks: 4 } },
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

function cents(value: number): number {
  return Math.round(value * 100);
}

function formatDose(doseMg: number): string {
  return doseMg < 1 ? `${Number((doseMg * 1000).toFixed(3))} mcg` : `${Number(doseMg.toFixed(3))} mg`;
}

type ProtocolMath = {
  totalNeedMg: number;
  administrationCount: number;
  durationWeeks: number;
  doseSummary: string;
  calculationBasis: string;
};

function calculateProtocolMath(candidate: Candidate): ProtocolMath | null {
  const planning = candidate.planning;
  if (planning.phasedWeeklyDosesMg?.length) {
    const totalNeedMg = planning.phasedWeeklyDosesMg.reduce((sum, phase) => sum + phase.doseMg * phase.weeks, 0);
    const administrationCount = planning.phasedWeeklyDosesMg.reduce((sum, phase) => sum + phase.weeks, 0);
    const durationWeeks = planning.phasedWeeklyDosesMg.reduce((sum, phase) => sum + phase.weeks, 0);
    const phases = planning.phasedWeeklyDosesMg.map((phase) => `${formatDose(phase.doseMg)} par semaine pendant ${phase.weeks} semaines`);
    return {
      totalNeedMg,
      administrationCount,
      durationWeeks,
      doseSummary: phases.join(" puis "),
      calculationBasis: `${phases.join(" + ")} = ${Number(totalNeedMg.toFixed(3))} mg au total`,
    };
  }
  const { doseMg, administrationsPerWeek, durationWeeks } = planning;
  if (![doseMg, administrationsPerWeek, durationWeeks].every((value) => Number.isFinite(value) && Number(value) > 0)) return null;
  const administrationCount = Number(administrationsPerWeek) * Number(durationWeeks);
  const totalNeedMg = Number(doseMg) * administrationCount;
  return {
    totalNeedMg,
    administrationCount,
    durationWeeks: Number(durationWeeks),
    doseSummary: `${formatDose(Number(doseMg))} par administration, ${administrationsPerWeek} fois par semaine`,
    calculationBasis: `${formatDose(Number(doseMg))} × ${administrationsPerWeek} administrations par semaine × ${durationWeeks} semaines = ${Number(totalNeedMg.toFixed(3))} mg au total`,
  };
}

type CandidateSelection = { candidate: Candidate; goal: Goal; priority: "primary" | "secondary" };

function candidatesForGoal(input: PeptidesPreviewInput, goal: Goal, primary: boolean): Candidate[] {
  const candidates = candidatesByGoal[goal];
  if (!primary) return candidates.slice(0, 1);
  if (goal === "recovery" && input.recoveryScope === "localized") return candidates.slice(0, 1);
  if (goal === "cognitive" && input.cognitiveStress !== "high") return candidates.slice(0, 1);
  if (goal === "endurance" && input.trainingFrequency !== "5plus") return candidates.slice(0, 1);
  return candidates;
}

function uniqueCandidates(input: PeptidesPreviewInput): CandidateSelection[] {
  const primary = candidatesForGoal(input, input.primaryGoal, true).map((candidate) => ({ candidate, goal: input.primaryGoal, priority: "primary" as const }));
  const secondary = input.secondaryGoals.flatMap((goal) => candidatesForGoal(input, goal, false).map((candidate) => ({ candidate, goal, priority: "secondary" as const })));
  const seen = new Set<string>();
  const maximumMolecules = input.experience === "none" ? 2 : 4;
  return [...primary, ...secondary].filter(({ candidate }) => {
    const key = normalize(candidate.name);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, maximumMolecules);
}

function operationalVials(candidate: Candidate, math: ProtocolMath, vialMg: number): number {
  const minimum = Math.ceil((math.totalNeedMg - Number.EPSILON) / vialMg);
  const windowDays = candidate.planning.openingWindowDays;
  if (!windowDays) return minimum;
  const cycleDays = math.durationWeeks * 7;
  const doseMg = math.totalNeedMg / math.administrationCount;
  const buckets = new Map<number, number>();
  for (let index = 0; index < math.administrationCount; index += 1) {
    const day = Math.min(cycleDays - 1, Math.floor(index * cycleDays / math.administrationCount));
    const bucket = Math.floor(day / windowDays);
    buckets.set(bucket, (buckets.get(bucket) || 0) + doseMg);
  }
  const operational = [...buckets.values()].reduce((sum, needMg) => sum + Math.ceil((needMg - Number.EPSILON) / vialMg), 0);
  return Math.max(minimum, operational);
}

type PlannedOption = {
  selection: CandidateSelection;
  math: ProtocolMath;
  plan: PeptidePurchasePlan<PeptauraFeedListing>;
  mathematicalVials: number;
  operationalVials: number;
};

function candidatePlanOptions(
  selection: CandidateSelection,
  snapshots: PeptauraFeedProductSnapshot[],
  allowedSuppliers?: string[],
): PlannedOption[] {
  const math = calculateProtocolMath(selection.candidate);
  const snapshot = findSnapshot(selection.candidate, snapshots, allowedSuppliers);
  if (!math || !snapshot) return [];
  const maxOverstockRatio = selection.candidate.planning.maxOverstockRatio || 1.3;
  const options = availableListings(snapshot, allowedSuppliers).flatMap((listing) => {
    const vialMg = parseListingMg(listing.dosage);
    if (!vialMg) return [];
    const mathematicalVials = Math.ceil((math.totalNeedMg - Number.EPSILON) / vialMg);
    const requiredOperationalVials = operationalVials(selection.candidate, math, vialMg);
    if (!selection.candidate.planning.openingWindowDays && (mathematicalVials * vialMg) / math.totalNeedMg > maxOverstockRatio + 1e-9) return [];
    const effectiveNeedMg = requiredOperationalVials * vialMg;
    const plan = buildPurchasePlan(listing, effectiveNeedMg, maxOverstockRatio);
    if (!plan || plan.requestedVials !== requiredOperationalVials) return [];
    return [{ selection, math, plan, mathematicalVials, operationalVials: requiredOperationalVials }];
  }).sort((a, b) => cents(a.plan.totalPriceUsd) - cents(b.plan.totalPriceUsd));
  const bySupplier = new Map<string, PlannedOption[]>();
  for (const option of options) {
    const key = normalize(option.plan.listing.supplier);
    const group = bySupplier.get(key) || [];
    if (group.length < 4) group.push(option);
    bySupplier.set(key, group);
  }
  return [...bySupplier.values()].flat();
}

type QuotedCombination = {
  options: PlannedOption[];
  productSubtotalUsd: number;
  shippingUsd: number;
  grandTotalUsd: number;
  shippingBreakdown: Array<{ supplier: string; subtotalUsd: number; shippingUsd: number; speed: string }>;
};

function selectQuotedCombination(
  optionGroups: PlannedOption[][],
  shippingQuotes?: PeptauraShippingQuote[],
): QuotedCombination | null {
  const combinations: PlannedOption[][] = [];
  const visit = (index: number, chosen: PlannedOption[]) => {
    if (index === optionGroups.length) {
      combinations.push([...chosen]);
      return;
    }
    for (const option of optionGroups[index]) {
      chosen.push(option);
      visit(index + 1, chosen);
      chosen.pop();
    }
  };
  visit(0, []);

  const quoted = combinations.flatMap((options): QuotedCombination[] => {
    const productSubtotalCents = options.reduce((sum, option) => sum + cents(option.plan.totalPriceUsd), 0);
    const bySupplier = new Map<string, { supplier: string; subtotalCents: number }>();
    for (const option of options) {
      const supplier = option.plan.listing.supplierDisplayName || option.plan.listing.supplier;
      const key = normalize(supplier);
      const current = bySupplier.get(key) || { supplier, subtotalCents: 0 };
      current.subtotalCents += cents(option.plan.totalPriceUsd);
      bySupplier.set(key, current);
    }
    const shippingBreakdown: QuotedCombination["shippingBreakdown"] = [];
    let shippingCents = 0;
    for (const [key, group] of bySupplier) {
      if (!shippingQuotes) {
        shippingBreakdown.push({ supplier: group.supplier, subtotalUsd: group.subtotalCents / 100, shippingUsd: 0, speed: "non calculé" });
        continue;
      }
      const quote = shippingQuotes.find((candidate) => normalize(candidate.supplier) === key);
      if (!quote) return [];
      const shipping = shippingForSubtotal(quote, group.subtotalCents / 100);
      if (!shipping) return [];
      shippingCents += cents(shipping.costUsd);
      shippingBreakdown.push({ supplier: quote.displayName, subtotalUsd: group.subtotalCents / 100, shippingUsd: shipping.costUsd, speed: shipping.speed });
    }
    return [{
      options,
      productSubtotalUsd: productSubtotalCents / 100,
      shippingUsd: shippingCents / 100,
      grandTotalUsd: (productSubtotalCents + shippingCents) / 100,
      shippingBreakdown,
    }];
  }).sort((a, b) =>
    cents(a.grandTotalUsd) - cents(b.grandTotalUsd)
    || a.shippingBreakdown.length - b.shippingBreakdown.length
    || cents(a.productSubtotalUsd) - cents(b.productSubtotalUsd)
  );
  return quoted[0] || null;
}

function emptyReviewResult(blockers: string[], nextStep: PeptidesPreviewResult["nextStep"], headline: string, rationale: string): PeptidesPreviewResult {
  return {
    status: "review_required",
    moleculeCount: 0,
    molecules: [],
    estimatedStarterCostUsd: null,
    estimatedProtocolCostUsd: null,
    estimatedShippingCostUsd: null,
    estimatedGrandTotalUsd: null,
    monthlyEquivalentUsd: null,
    shippingBreakdown: [],
    totalVialsRequired: null,
    totalVialsPurchased: null,
    totalPackages: null,
    priceCheckedAt: new Date().toISOString(),
    durationLabel: "À confirmer après revue du profil",
    budgetFit: "unknown",
    headline,
    rationale,
    budgetExplanation: "Aucun devis n'est affiché tant que les variables qui changent le scénario ne sont pas résolues.",
    quoteExplanation: "Le calcul est volontairement suspendu plutôt que de produire un dosage, une quantité ou un prix partiel.",
    blockers,
    nextStep,
  };
}

export function buildPeptidesPreview(
  input: PeptidesPreviewInput,
  snapshots: PeptauraFeedProductSnapshot[],
  checkedAt = new Date().toISOString(),
  shippingContext?: PeptauraShippingQuote[] | string[],
): PeptidesPreviewResult {
  const blockers: string[] = [];
  const conditions = input.conditions.filter((condition) => condition !== "none");
  const goals = [input.primaryGoal, ...input.secondaryGoals];
  for (const condition of conditions) if (hardReviewConditions.has(condition)) blockers.push(condition);
  if (goals.includes("testo-boost") && input.bloodwork !== "recent") blockers.push("bilan_hormonal_recent_requis");
  if (goals.includes("testo-boost") && input.bloodwork === "recent") blockers.push("protocole_hpg_a_personnaliser");
  if (goals.includes("libido") && (input.conditions.includes("hypertension") || ["high", "unknown"].includes(input.bloodPressure))) blockers.push("pression_arterielle_a_verifier");
  if (goals.includes("fatloss") && input.conditions.includes("diabetes")) blockers.push("profil_glycemique_a_revoir");
  if (goals.includes("fatloss") && ["stopped-side-effects", "current"].includes(input.glp1History)) blockers.push("historique_glp1_a_revoir");
  const bmi = input.weightKg / ((input.heightCm / 100) ** 2);
  if (goals.includes("fatloss") && bmi < 18.5) blockers.push("imc_bas_incompatible_avec_preselection_fatloss");
  if (input.injectionComfort === "refuse" && goals.some((goal) => goal !== "cognitive")) blockers.push("injections_refusees");
  if (input.refrigeration === "no" && goals.some((goal) => goal !== "cognitive")) blockers.push("stockage_froid_indisponible");
  if (!/^(aucun|none|non)$/i.test(input.currentPeptides.trim())) blockers.push("stack_actuel_a_integrer");
  if (!/^(aucun|none|non)$/i.test(input.medications.trim())) blockers.push("medicaments_a_integrer");
  const preliminaryCandidates = uniqueCandidates(input);
  const acceptedAdministrationsPerWeek = input.injectionFrequency === "twice-daily" ? 14 : input.injectionFrequency === "daily" ? 7 : input.injectionFrequency === "few-week" ? 5 : 1;
  const incompatibleFrequency = preliminaryCandidates.some(({ candidate }) => {
    if (["Semax", "Selank"].includes(candidate.name)) return false;
    return Number(candidate.planning.administrationsPerWeek || 1) > acceptedAdministrationsPerWeek;
  });
  if (incompatibleFrequency) blockers.push("frequence_administration_incompatible");

  if (blockers.length > 0) {
    const nextStep = blockers.includes("bilan_hormonal_recent_requis") ? "blood_analysis" : "manual_review";
    return { ...emptyReviewResult(blockers, nextStep, "Ton profil demande une validation ciblée avant tout devis.", "Au moins une réponse change directement le choix, la compatibilité ou la quantité. L'algorithme ne remplit pas artificiellement un protocole dans ce cas."), priceCheckedAt: checkedAt };
  }

  const shippingQuotes = shippingContext && (shippingContext.length === 0 || typeof shippingContext[0] !== "string")
    ? shippingContext as PeptauraShippingQuote[]
    : undefined;
  const allowedSuppliers = shippingQuotes
    ? shippingQuotes.filter((quote) => quote.available).map((quote) => quote.supplier)
    : shippingContext as string[] | undefined;
  const desiredCandidates = preliminaryCandidates;
  const optionGroups = desiredCandidates.map((selection) => candidatePlanOptions(selection, snapshots, allowedSuppliers));
  if (optionGroups.some((options) => options.length === 0)) {
    return { ...emptyReviewResult(["catalogue_incomplet_pour_pays"], "manual_review", "Je ne t'affiche pas un devis incomplet.", "Au moins un format nécessaire n'est pas achetable dans la bonne quantité pour ta destination."), priceCheckedAt: checkedAt };
  }
  const quote = selectQuotedCombination(optionGroups, shippingQuotes);
  if (!quote) {
    return { ...emptyReviewResult(["aucune_combinaison_livree_chiffree"], "manual_review", "Aucune commande complète et livrable ne passe les contrôles.", "Les minimums de commande, conditionnements ou frais de livraison empêchent un devis complet avec les offres actuelles."), priceCheckedAt: checkedAt };
  }

  const selected = quote.options.map(({ selection, math, plan, mathematicalVials, operationalVials }) => ({
    name: plan.listing.name || selection.candidate.name,
    supplier: plan.listing.supplierDisplayName || plan.listing.supplier,
    productUrl: plan.listing.productUrl,
    role: selection.candidate.role,
    reason: `Tu as placé « ${goalLabels[selection.goal]} » comme ${selection.priority === "primary" ? "priorité principale" : "objectif secondaire"}. ${selection.candidate.reason(input)}`,
    doseSummary: math.doseSummary,
    administrationCount: math.administrationCount,
    startingFormat: `${plan.listing.dosage} · boîte de ${plan.listing.boxSize}`,
    startingPackagePriceUsd: plan.packagePriceUsd,
    cycleDurationLabel: selection.candidate.planning.durationLabel,
    calculationBasis: math.calculationBasis,
    totalRequiredMg: Number(math.totalNeedMg.toFixed(3)),
    vialStrengthMg: plan.vialMg,
    mathematicalVials,
    operationalVials,
    vialsRequired: operationalVials,
    vialsPurchased: plan.deliveredVials,
    packageCount: plan.packageCount,
    estimatedTotalPriceUsd: plan.totalPriceUsd,
  } satisfies PeptidesPreviewMolecule));

  const maxDurationWeeks = Math.max(...quote.options.map((option) => option.math.durationWeeks));
  const monthlyEquivalentUsd = Math.round((quote.grandTotalUsd / (maxDurationWeeks / 4)) * 100) / 100;
  const budgetFit = cents(quote.grandTotalUsd) <= cents(input.budgetTotalUsd) ? "within" : "above";
  const budgetExplanation = budgetFit === "within"
    ? `Le devis rendu estimé de $${quote.grandTotalUsd.toFixed(2)} respecte ton budget total déclaré de $${input.budgetTotalUsd.toFixed(2)}.`
    : `Le devis rendu estimé de $${quote.grandTotalUsd.toFixed(2)} dépasse ton budget total déclaré de $${input.budgetTotalUsd.toFixed(2)}. Le rapport complet devra prioriser les axes au lieu de masquer le dépassement.`;
  const durations = Array.from(new Set(selected.map((item) => item.cycleDurationLabel)));
  return {
    status: "eligible",
    moleculeCount: selected.length,
    molecules: selected,
    estimatedStarterCostUsd: selected.reduce((sum, item) => sum + item.startingPackagePriceUsd, 0),
    estimatedProtocolCostUsd: quote.productSubtotalUsd,
    estimatedShippingCostUsd: shippingQuotes ? quote.shippingUsd : null,
    estimatedGrandTotalUsd: quote.grandTotalUsd,
    monthlyEquivalentUsd,
    shippingBreakdown: quote.shippingBreakdown,
    totalVialsRequired: selected.reduce((sum, item) => sum + item.vialsRequired, 0),
    totalVialsPurchased: selected.reduce((sum, item) => sum + item.vialsPurchased, 0),
    totalPackages: selected.reduce((sum, item) => sum + item.packageCount, 0),
    priceCheckedAt: checkedAt,
    durationLabel: durations.length === 1 ? durations[0] : "Durée indiquée pour chaque molécule",
    budgetFit,
    headline: `Ton pré-calcul retient ${selected.length} molécule${selected.length > 1 ? "s" : ""} pour un devis rendu estimé de $${quote.grandTotalUsd.toFixed(2)}.`,
    rationale: "Chaque dose de référence est multipliée par sa fréquence et sa durée. Le besoin est ensuite converti en fioles opérationnelles, en boîtes réellement achetables et en frais de livraison par fournisseur. Aucun prix d'appel ni boîte unique ne remplace le coût du scénario complet.",
    budgetExplanation,
    quoteExplanation: shippingQuotes
      ? `Molécules : $${quote.productSubtotalUsd.toFixed(2)}. Livraison : $${quote.shippingUsd.toFixed(2)}. Total rendu estimé : $${quote.grandTotalUsd.toFixed(2)}. Équivalent sur ${maxDurationWeeks} semaines : environ $${monthlyEquivalentUsd.toFixed(2)} par période de quatre semaines.`
      : `Molécules : $${quote.productSubtotalUsd.toFixed(2)}. Livraison non calculée dans ce contexte de test.`,
    blockers: [],
    nextStep: "peptides_engine",
  };
}

const countryLabels: Record<string, string> = {
  FR: "France", BE: "Belgium", CH: "Switzerland", LU: "Luxembourg", CA: "Canada", US: "United States",
  AE: "United Arab Emirates", GB: "United Kingdom", DE: "Germany", ES: "Spain", IT: "Italy", NL: "Netherlands",
  PT: "Portugal", MA: "Morocco", DZ: "Algeria", TN: "Tunisia",
};

const cachedCatalog = new Map<string, { expiresAt: number; snapshots: PeptauraFeedProductSnapshot[]; checkedAt: string; shippingQuotes: PeptauraShippingQuote[] }>();

export async function getLivePeptauraPreviewCatalog(countryCode = "FR", nowMs = Date.now()): Promise<{ snapshots: PeptauraFeedProductSnapshot[]; checkedAt: string; shippingQuotes: PeptauraShippingQuote[] }> {
  const cacheKey = countryCode.toUpperCase();
  const cached = cachedCatalog.get(cacheKey);
  if (cached && cached.expiresAt > nowMs) return { snapshots: cached.snapshots, checkedAt: cached.checkedAt, shippingQuotes: cached.shippingQuotes };
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
    const shippingQuotes = parsePeptauraShippingPage(shippingHtml).filter((quote) => quote.available && quote.tiers.length > 0);
    if (shippingQuotes.length === 0) throw new Error("PEPTAURA_PREVIEW_SHIPPING_UNAVAILABLE");
    const value = { snapshots: parsed.snapshots, checkedAt, shippingQuotes };
    cachedCatalog.set(cacheKey, { ...value, expiresAt: nowMs + 15 * 60_000 });
    return value;
  } finally {
    clearTimeout(timer);
  }
}
