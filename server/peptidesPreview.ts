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
  const selectedGoals = [value.primaryGoal, ...value.secondaryGoals];
  if (selectedGoals.includes("recovery") && value.recoveryScope === "not-applicable") {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["recoveryScope"], message: "Précise si la récupération concerne une zone ou plusieurs." });
  }
  if (selectedGoals.includes("fatloss") && value.glp1History === "not-applicable") {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["glp1History"], message: "Précise ton expérience avec les GLP-1." });
  }
  if (selectedGoals.includes("cognitive") && value.cognitiveStress === "not-applicable") {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["cognitiveStress"], message: "Précise le niveau de stress cognitif." });
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
  analysisPoints: string[];
  requiredMarkers: string[];
  nextStepExplanation: string;
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

const experienceLabels: Record<PeptidesPreviewInput["experience"], string> = {
  none: "débutant",
  read: "renseigné mais sans utilisation",
  tried: "déjà utilisateur",
  regular: "utilisateur régulier",
};

const frequencyLabels: Record<PeptidesPreviewInput["injectionFrequency"], string> = {
  "twice-daily": "jusqu’à deux administrations par jour",
  daily: "une administration par jour",
  "few-week": "deux à cinq administrations par semaine",
  weekly: "une administration par semaine",
  minimal: "la fréquence minimale possible",
};

const refrigerationLabels: Record<PeptidesPreviewInput["refrigeration"], string> = {
  "yes-private": "un réfrigérateur privé",
  "yes-shared": "un réfrigérateur partagé",
  no: "aucun stockage au froid",
};

const timelineLabels: Record<PeptidesPreviewInput["timeline"], string> = {
  "4-6": "quatre à six semaines",
  "8-12": "huit à douze semaines",
  "12plus": "plus de douze semaines",
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
    { name: "BPC-157", role: "Récupération tissulaire ciblée", reason: (input) => input.recoveryScope === "localized" ? "Tu as décrit une seule zone prioritaire : le pré-calcul retient donc un levier local et n’ajoute pas automatiquement TB-500." : "La récupération fait partie de tes priorités ; ce levier constitue la base tissulaire du scénario sans multiplier les axes.", planning: { durationLabel: "8 semaines", doseMg: 0.25, administrationsPerWeek: 14, durationWeeks: 8 } },
    { name: "TB-500", aliases: ["TB500"], role: "Récupération systémique complémentaire", reason: (input) => input.recoveryScope === "systemic" ? "Tu as décrit une récupération générale plutôt qu’une zone isolée : ce second levier couvre la dimension systémique que BPC-157 seul ne représente pas dans ce pré-calcul." : "Tu as signalé plusieurs zones : ce second levier est retenu pour la dimension multisite, pas comme ajout décoratif.", planning: { durationLabel: "4 semaines d’induction", doseMg: 2.5, administrationsPerWeek: 2, durationWeeks: 4 } },
  ],
  "gh-antiaging": [
    { name: "CJC-1295 (no DAC)", aliases: ["CJC-1295 sans DAC", "CJC1295 no DAC"], role: "Signal pulsatile de l’axe GH", reason: (input) => `Tu as choisi l’axe GH comme priorité sur un horizon ${input.timeline === "4-6" ? "court" : input.timeline === "8-12" ? "de huit à douze semaines" : "supérieur à douze semaines"}. Le pré-calcul conserve la version sans DAC pour une logique pulsatile et exclut la version DAC automatique.`, planning: { durationLabel: "8 semaines", doseMg: 0.1, administrationsPerWeek: 5, durationWeeks: 8, openingWindowDays: 28 } },
    { name: "Ipamorelin", role: "Sécrétagogue complémentaire", reason: () => "Il complète le signal GHRH du scénario de référence ; le moteur limite volontairement l’axe GH à cette paire au lieu d’ajouter un troisième peptide.", planning: { durationLabel: "8 semaines", doseMg: 0.1, administrationsPerWeek: 5, durationWeeks: 8, openingWindowDays: 28 } },
  ],
  fatloss: [
    { name: "Semaglutide", role: "Contrôle de l’appétit et axe métabolique", reason: (input) => `À ${input.weightKg} kg pour ${input.heightCm} cm (IMC ${Number((input.weightKg / ((input.heightCm / 100) ** 2)).toFixed(1))}), avec un historique GLP-1 « ${input.glp1History === "never" ? "jamais utilisé" : "déjà utilisé et bien toléré"} », le scénario reste sur une titration progressive unique. Aucun peptide GH ou de récupération n’est ajouté sans justification indépendante.`, planning: { durationLabel: "12 semaines", phasedWeeklyDosesMg: [{ doseMg: 0.25, weeks: 4 }, { doseMg: 0.5, weeks: 4 }, { doseMg: 1, weeks: 4 }], durationWeeks: 12, maxOverstockRatio: 1.5 } },
  ],
  sleep: [
    { name: "DSIP", role: "Architecture et qualité du sommeil", reason: (input) => `Tu déclares en moyenne ${input.sleepHours} heures de sommeil et tu as placé le sommeil parmi les objectifs. Le pré-calcul isole cet axe au lieu de le confondre avec une stratégie GH ou récupération générale.`, planning: { durationLabel: "4 semaines", doseMg: 0.175, administrationsPerWeek: 7, durationWeeks: 4 } },
  ],
  cognitive: [
    { name: "Semax", role: "Focus et performance cognitive", reason: (input) => `Ton objectif porte sur la cognition avec un stress déclaré ${input.cognitiveStress === "high" ? "élevé" : input.cognitiveStress === "moderate" ? "modéré" : "faible"}. Semax constitue le levier focus du scénario ; aucun peptide métabolique n’est ajouté sans rapport avec ce besoin.`, planning: { durationLabel: "4 semaines", doseMg: 0.5, administrationsPerWeek: 7, durationWeeks: 4 } },
    { name: "Selank", role: "Stabilité cognitive sous stress", reason: () => "Le stress cognitif a été déclaré élevé : Selank est ajouté comme axe de stabilité, alors qu’il est explicitement omis pour un stress faible ou modéré.", planning: { durationLabel: "4 semaines", doseMg: 0.25, administrationsPerWeek: 14, durationWeeks: 4 } },
  ],
  libido: [
    { name: "PT-141", role: "Réponse sexuelle centrale", reason: (input) => `L’objectif déclaré concerne la libido et ta tension est ${input.bloodPressure === "normal" ? "déclarée normale" : "déclarée contrôlée"}. Le scénario isole un levier central ponctuel ; il ne prétend pas corriger un éventuel facteur hormonal non mesuré.`, planning: { durationLabel: "8 utilisations ponctuelles", doseMg: 1, administrationsPerWeek: 1, durationWeeks: 8 } },
  ],
  "testo-boost": [
    { name: "KissPeptin-10", aliases: ["Kisspeptin-10", "Kisspeptin 10"], role: "Axe hypothalamo-hypophyso-gonadique", reason: () => "Cet axe n’est jamais sélectionné ni chiffré automatiquement : des valeurs hormonales interprétables et le contexte de fertilité sont nécessaires avant toute décision.", planning: { durationLabel: "Après validation hormonale" } },
  ],
  "skin-hair": [
    { name: "GHK-Cu", aliases: ["GHK Cu"], role: "Peau, cheveux et matrice extracellulaire", reason: () => "L’objectif déclaré est cutané ou capillaire : la sélection reste sur cet axe unique et n’ajoute ni levier GH ni peptide métabolique sans lien direct.", planning: { durationLabel: "8 semaines", doseMg: 2, administrationsPerWeek: 5, durationWeeks: 8 } },
  ],
  endurance: [
    { name: "MOTS-c", aliases: ["MOTS c"], role: "Efficience métabolique et endurance", reason: (input) => `Tu déclares ${input.trainingFrequency === "5plus" ? "au moins cinq" : input.trainingFrequency === "3-4" ? "trois à quatre" : input.trainingFrequency === "1-2" ? "une à deux" : "aucune"} séances par semaine avec une priorité endurance. MOTS-c constitue le levier énergétique principal du scénario.`, planning: { durationLabel: "8 semaines", doseMg: 5, administrationsPerWeek: 1, durationWeeks: 8, openingWindowDays: 28 } },
    { name: "SS-31", aliases: ["SS-31 (Elamipretide)", "Elamipretide"], role: "Fonction mitochondriale", reason: () => "La fréquence d’entraînement est d’au moins cinq séances par semaine : SS-31 est ajouté pour la capacité de travail, alors qu’il est omis lorsque la charge est inférieure.", planning: { durationLabel: "4 semaines", doseMg: 1, administrationsPerWeek: 7, durationWeeks: 4 } },
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
  // A free deterministic preview must stay interpretable: one principal axis
  // and at most one supporting lever. Experience never justifies stack bloat.
  const maximumMolecules = 2;
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

function isNoneDeclared(value: string): boolean {
  return /^(aucun(?:e)?|none|non|no|rien|néant|neant|ras)(?:\s+(?:actuellement|à signaler|a signaler))?[.!]?$/i.test(value.trim());
}

function hormoneMarkers(input: PeptidesPreviewInput): string[] {
  return input.sex === "male"
    ? ["Testostérone totale", "Testostérone libre ou calculée", "SHBG", "LH", "FSH", "Estradiol sensible", "Prolactine", "TSH", "T4 libre"]
    : ["LH", "FSH", "Estradiol", "Progestérone avec jour du cycle", "Prolactine", "SHBG", "Testostérone totale et libre", "TSH", "T4 libre"];
}

function reviewPoint(input: PeptidesPreviewInput, blocker: string): string {
  const bmi = input.weightKg / ((input.heightCm / 100) ** 2);
  const points: Record<string, string> = {
    cancer: "L’antécédent oncologique déclaré exclut une présélection automatique des axes angiogéniques ou GH.",
    pregnant: "La grossesse déclarée exclut ce parcours automatisé : aucune molécule ni quantité ne doit être proposée.",
    breastfeeding: "L’allaitement déclaré exclut ce parcours automatisé : aucune molécule ni quantité ne doit être proposée.",
    cardiac: "Le problème cardiaque déclaré doit être intégré avant toute décision sur une molécule ou une fréquence.",
    "renal-hepatic": "L’atteinte rénale ou hépatique déclarée change l’évaluation du risque et bloque tout devis automatisé.",
    maladie_autoimmune_a_integrer: "La maladie auto-immune déclarée nécessite une revue du diagnostic, de l’activité de la maladie et des traitements avant sélection.",
    bilan_hormonal_recent_requis: `Ton objectif concerne l’axe testostérone, mais ton bilan est ${input.bloodwork === "never" ? "absent" : "daté de plus de trois mois"}. Fatigue et libido basse ne permettent pas, seules, de localiser le problème hormonal.`,
    protocole_hpg_a_personnaliser: "Tu déclares un bilan récent, mais le questionnaire ne contient pas les valeurs hormonales elles-mêmes. Sans leur interprétation, choisir ou doser un peptide de l’axe HPG serait arbitraire.",
    bilan_gh_recent_requis: `L’axe GH est demandé, mais ton bilan est ${input.bloodwork === "never" ? "absent" : "ancien"}. IGF-1 et les marqueurs métaboliques doivent être lus avant de chiffrer CJC-1295/Ipamorelin.`,
    pression_arterielle_a_verifier: `La libido est un objectif, mais la tension est ${input.bloodPressure === "high" ? "déclarée élevée" : "inconnue"}. PT-141 n’est donc ni proposé ni chiffré automatiquement.`,
    profil_glycemique_a_revoir: "Le diabète déclaré change directement la stratégie GLP-1 et le suivi glycémique ; un devis automatique serait insuffisant.",
    historique_glp1_a_revoir: input.glp1History === "current" ? "Un GLP-1 est déjà en cours : le moteur refuse d’empiler ou de redoser automatiquement." : "Tu as arrêté un GLP-1 pour effets indésirables : la cause, la molécule et la dose doivent être revues avant toute nouvelle proposition.",
    thyroide_a_preciser_avant_glp1: "Le trouble thyroïdien déclaré doit être précisé avant une présélection GLP-1 ; le libellé actuel ne suffit pas à distinguer les situations compatibles des contre-indications spécifiques.",
    composition_basse_a_revoir_fatloss: `Avec un IMC d’environ ${bmi.toFixed(1)} et la masse grasse déclarée, une présélection pharmacologique de perte de graisse n’est pas justifiée automatiquement.`,
    imc_bas_incompatible_avec_preselection_fatloss: `L’IMC calculé est d’environ ${bmi.toFixed(1)} : le moteur bloque une présélection orientée perte de poids.`,
    injections_refusees: "Tu refuses les injections alors qu’au moins un axe demandé repose sur une administration injectable ; le moteur ne remplace pas cette contrainte par une recommandation incohérente.",
    stockage_froid_indisponible: "Tu n’as pas de stockage au froid alors qu’au moins un axe demandé exige une conservation compatible après reconstitution.",
    stack_actuel_a_integrer: `Tu as déclaré un stack actuel (« ${input.currentPeptides} »). Il doit être vérifié pour éviter doublons, cumul de doses et incompatibilités.`,
    historique_peptides_a_interpreter: `Tu as déclaré un historique peptides (« ${input.pastPeptides} »). Les résultats, effets indésirables et raisons d’arrêt doivent influencer la prochaine sélection.`,
    medicaments_a_integrer: `Tu as déclaré un traitement actuel (« ${input.medications} »). Il doit être intégré avant de confirmer une molécule, un dosage ou un devis.`,
    allergies_a_integrer: `Tu as déclaré une allergie ou intolérance (« ${input.allergies} »). La formulation et les excipients doivent être vérifiés avant toute commande.`,
    frequence_administration_incompatible: "La fréquence maximale que tu acceptes est inférieure à celle requise par au moins un axe demandé ; le moteur refuse de présenter un protocole inexécutable.",
    catalogue_incomplet_pour_pays: "Au moins un produit nécessaire n’est pas disponible dans un format et une quantité livrables vers ton pays ; aucun sous-total partiel n’est présenté.",
    aucune_combinaison_livree_chiffree: "Les formats, minimums de commande ou frais de livraison empêchent actuellement de produire une commande complète et cohérente.",
  };
  return points[blocker] || blocker.replace(/_/g, " ");
}

function reviewNarrative(input: PeptidesPreviewInput, blockers: string[], nextStep: PeptidesPreviewResult["nextStep"]): Pick<PeptidesPreviewResult, "headline" | "rationale" | "analysisPoints" | "requiredMarkers" | "nextStepExplanation"> {
  const hormonal = blockers.includes("bilan_hormonal_recent_requis") || blockers.includes("protocole_hpg_a_personnaliser");
  const gh = blockers.includes("bilan_gh_recent_requis");
  const medications = blockers.includes("medicaments_a_integrer") || blockers.includes("stack_actuel_a_integrer") || blockers.includes("historique_peptides_a_interpreter");
  const catalogue = blockers.includes("catalogue_incomplet_pour_pays") || blockers.includes("aucune_combinaison_livree_chiffree");
  const hardSafety = blockers.some((blocker) => ["cancer", "pregnant", "breastfeeding", "cardiac", "renal-hepatic", "maladie_autoimmune_a_integrer"].includes(blocker));
  const headline = hormonal
    ? "Avant de parler de peptide, il faut comprendre ce qui tire ton énergie et ta libido vers le bas."
    : gh
      ? "L’axe GH ne doit pas être chiffré sans données biologiques récentes."
      : medications
        ? "Ton traitement et ton historique doivent être intégrés avant toute recommandation."
        : catalogue
          ? "Je ne t’affiche pas une commande incomplète ou impossible à livrer."
          : hardSafety
            ? "Les données de santé déclarées excluent une recommandation automatisée."
            : "Ton profil nécessite une décision ciblée avant toute recommandation ou devis.";
  const rationale = hormonal
    ? "Les symptômes décrits peuvent venir de niveaux hormonaux, de la régulation hypophysaire, de la thyroïde, de la prolactine, du sommeil ou d’autres facteurs. Le questionnaire ne permet pas de choisir honnêtement un peptide de l’axe HPG sans les valeurs correspondantes."
    : gh
      ? "CJC-1295 et Ipamorelin agissent sur un axe endocrine. Sans lecture récente d’IGF-1 et du terrain métabolique, un dosage standard donnerait une précision artificielle."
      : medications
        ? "Un traitement, un stack actuel ou une expérience passée ne sont pas de simples notes de dossier : ils peuvent changer le choix, la dose ou l’intérêt même d’un peptide. Je les fais donc passer avant le devis."
        : catalogue
          ? "La présélection ne vaut rien si les formats nécessaires ne permettent pas une commande complète vers ta destination. Je bloque donc le chiffrage plutôt que d’afficher un prix d’appel irréalisable."
          : hardSafety
            ? "La condition déclarée modifie directement le niveau de risque. Aucun algorithme gratuit ne doit la contourner avec une molécule ou un dosage standard."
            : "Une ou plusieurs réponses changent directement la compatibilité ou la possibilité d’exécuter le protocole. Je suspends donc toute molécule et tout prix jusqu’à résolution.";
  const requiredMarkers = hormonal
    ? hormoneMarkers(input)
    : gh
      ? ["IGF-1", "Glycémie à jeun", "HbA1c", "Insuline à jeun", "TSH", "T4 libre", "Prolactine"]
      : [];
  const nextStepExplanation = nextStep === "blood_analysis"
    ? `Blood Analysis doit d’abord interpréter ${hormonal ? "l’axe hormonal et les facteurs qui peuvent reproduire les mêmes symptômes" : "l’axe GH et le terrain métabolique"}. La recommandation Peptides Engine vient ensuite, à partir des résultats réels.`
    : "Une revue personnalisée doit d’abord intégrer les éléments bloquants ci-dessus. La sélection, les doses, les quantités et le devis pourront ensuite être recalculés d’un seul bloc.";
  return { headline, rationale, analysisPoints: blockers.map((blocker) => reviewPoint(input, blocker)), requiredMarkers, nextStepExplanation };
}

function eligibleNarrative(input: PeptidesPreviewInput, selected: PeptidesPreviewMolecule[], grandTotalUsd: number): Pick<PeptidesPreviewResult, "headline" | "rationale" | "analysisPoints" | "requiredMarkers" | "nextStepExplanation"> {
  const names = selected.map((item) => item.name).join(" + ");
  const primary = goalLabels[input.primaryGoal];
  const secondary = input.secondaryGoals.length ? input.secondaryGoals.map((goal) => goalLabels[goal]).join(" et ") : "aucun axe secondaire";
  return {
    headline: `${names} : la présélection la plus cohérente avec ta priorité ${primary}.`,
    rationale: `La priorité déclarée est ${primary}, avec ${secondary}. J’ai limité la présélection à ${selected.length} levier${selected.length > 1 ? "s" : ""} attribuable${selected.length > 1 ? "s" : ""}, compatible${selected.length > 1 ? "s" : ""} avec les contraintes renseignées, puis chiffré l’intégralité du cycle à $${grandTotalUsd.toFixed(2)} livraison comprise.`,
    analysisPoints: [
      `Priorité pilotée : ${primary}.`,
      input.secondaryGoals.length ? `Axe secondaire retenu seulement s’il reste compatible : ${secondary}.` : "Aucun axe secondaire n’a été ajouté artificiellement.",
      `Horizon de résultat déclaré : ${timelineLabels[input.timeline]}. La durée de référence de chaque molécule reste affichée séparément et n’est pas raccourcie artificiellement pour correspondre à cet horizon.`,
      `Complexité limitée à ${selected.length} molécule${selected.length > 1 ? "s" : ""}, même avec un profil ${experienceLabels[input.experience]}.`,
      `La contrainte de fréquence (« ${frequencyLabels[input.injectionFrequency]} ») et le stockage (« ${refrigerationLabels[input.refrigeration]} ») ont été appliqués avant le chiffrage.`,
    ],
    requiredMarkers: [],
    nextStepExplanation: "Peptides Engine transforme cette présélection en calendrier individualisé, vérifie les unités et la reconstitution, puis fige la liste d’achat finale.",
  };
}

function emptyReviewResult(blockers: string[], nextStep: PeptidesPreviewResult["nextStep"], narrative: Pick<PeptidesPreviewResult, "headline" | "rationale" | "analysisPoints" | "requiredMarkers" | "nextStepExplanation">): PeptidesPreviewResult {
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
    ...narrative,
    budgetExplanation: "Aucun devis n’est affiché tant que les données qui changent la décision ne sont pas résolues.",
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
  const addBlocker = (blocker: string) => { if (!blockers.includes(blocker)) blockers.push(blocker); };
  const conditions = input.conditions.filter((condition) => condition !== "none");
  const goals = [input.primaryGoal, ...input.secondaryGoals];
  for (const condition of conditions) if (hardReviewConditions.has(condition)) addBlocker(condition);
  if (conditions.includes("autoimmune")) addBlocker("maladie_autoimmune_a_integrer");
  if (goals.includes("testo-boost") && input.bloodwork !== "recent") addBlocker("bilan_hormonal_recent_requis");
  if (goals.includes("testo-boost") && input.bloodwork === "recent") addBlocker("protocole_hpg_a_personnaliser");
  if (goals.includes("gh-antiaging") && input.bloodwork !== "recent") addBlocker("bilan_gh_recent_requis");
  if (goals.includes("libido") && (input.conditions.includes("hypertension") || ["high", "unknown"].includes(input.bloodPressure))) addBlocker("pression_arterielle_a_verifier");
  if (goals.includes("fatloss") && input.conditions.includes("diabetes")) addBlocker("profil_glycemique_a_revoir");
  if (goals.includes("fatloss") && input.conditions.includes("thyroid")) addBlocker("thyroide_a_preciser_avant_glp1");
  if (goals.includes("fatloss") && ["stopped-side-effects", "current"].includes(input.glp1History)) addBlocker("historique_glp1_a_revoir");
  const bmi = input.weightKg / ((input.heightCm / 100) ** 2);
  if (goals.includes("fatloss") && bmi < 18.5) addBlocker("imc_bas_incompatible_avec_preselection_fatloss");
  else if (goals.includes("fatloss") && (bmi < 20 || input.bodyFatRange === "under10")) addBlocker("composition_basse_a_revoir_fatloss");
  if (input.injectionComfort === "refuse" && goals.some((goal) => goal !== "cognitive")) addBlocker("injections_refusees");
  if (input.refrigeration === "no" && goals.some((goal) => goal !== "cognitive")) addBlocker("stockage_froid_indisponible");
  if (!isNoneDeclared(input.currentPeptides)) addBlocker("stack_actuel_a_integrer");
  if (!isNoneDeclared(input.pastPeptides)) addBlocker("historique_peptides_a_interpreter");
  if (!isNoneDeclared(input.medications)) addBlocker("medicaments_a_integrer");
  if (!isNoneDeclared(input.allergies)) addBlocker("allergies_a_integrer");
  const preliminaryCandidates = uniqueCandidates(input);
  const acceptedAdministrationsPerWeek = input.injectionFrequency === "twice-daily" ? 14 : input.injectionFrequency === "daily" ? 7 : input.injectionFrequency === "few-week" ? 5 : 1;
  const incompatibleFrequency = preliminaryCandidates.some(({ candidate }) => {
    if (["Semax", "Selank"].includes(candidate.name)) return false;
    return Number(candidate.planning.administrationsPerWeek || 1) > acceptedAdministrationsPerWeek;
  });
  if (incompatibleFrequency) addBlocker("frequence_administration_incompatible");

  if (blockers.length > 0) {
    const bloodResolvable = new Set(["bilan_hormonal_recent_requis", "bilan_gh_recent_requis"]);
    const nextStep = blockers.every((blocker) => bloodResolvable.has(blocker)) ? "blood_analysis" : "manual_review";
    return { ...emptyReviewResult(blockers, nextStep, reviewNarrative(input, blockers, nextStep)), priceCheckedAt: checkedAt };
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
    const blockers = ["catalogue_incomplet_pour_pays"];
    return { ...emptyReviewResult(blockers, "manual_review", reviewNarrative(input, blockers, "manual_review")), priceCheckedAt: checkedAt };
  }
  const quote = selectQuotedCombination(optionGroups, shippingQuotes);
  if (!quote) {
    const blockers = ["aucune_combinaison_livree_chiffree"];
    return { ...emptyReviewResult(blockers, "manual_review", reviewNarrative(input, blockers, "manual_review")), priceCheckedAt: checkedAt };
  }

  const selected = quote.options.map(({ selection, math, plan, mathematicalVials, operationalVials }) => ({
    name: plan.listing.name || selection.candidate.name,
    supplier: plan.listing.supplierDisplayName || plan.listing.supplier,
    productUrl: plan.listing.productUrl,
    role: selection.candidate.role,
    reason: selection.candidate.reason(input),
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
  const narrative = eligibleNarrative(input, selected, quote.grandTotalUsd);
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
    ...narrative,
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
