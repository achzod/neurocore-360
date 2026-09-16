import { z } from "zod";
import {
  PEPTAURA_PRODUCT_FEED_URL,
  parsePeptauraProductFeed,
  type PeptauraFeedListing,
  type PeptauraFeedProductSnapshot,
} from "./peptauraProductFeed";
import { effectivePackagePrice, parseListingMg, type PeptidePurchasePlan } from "./peptidesPurchasePlan";
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
  country: z.enum(countryValues).default("FR"),
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
  route: "subcutaneous" | "intranasal";
  protocolBasis: string;
  openingWindowDays: number;
  calculationBasis: string;
  totalRequiredMg: number;
  bufferedRequiredMg: number;
  purchasedCapacityMg: number;
  reserveCapacityMg: number;
  vialStrengthMg: number;
  mathematicalVials: number;
  operationalVials: number;
  safetyReserveVials: number;
  vialsRequired: number;
  vialsPurchased: number;
  packageCount: number;
  purchaseLines?: Array<{ format: string; boxSize: number; packageCount: number; deliveredVials: number; packagePriceUsd: number; totalPriceUsd: number; productUrl: string }>;
  estimatedTotalPriceUsd: number;
}

export interface PeptidesPreviewPublicQuoteLine {
  label: string;
  family: string;
  role: string;
  activeDurationWeeks: number;
  estimatedTotalPriceUsd: number;
}

export interface PeptidesPreviewEffectWeek {
  week: number;
  title: string;
  effects: string[];
}

export interface PeptidesPreviewResult {
  status: "eligible" | "review_required";
  moleculeCount: number;
  molecules: PeptidesPreviewMolecule[];
  moleculeQuotes: PeptidesPreviewPublicQuoteLine[];
  effectTimeline: PeptidesPreviewEffectWeek[];
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
  "4-6": "douze semaines minimum",
  "8-12": "douze semaines minimum",
  "12plus": "douze semaines minimum",
};

type Candidate = {
  name: string;
  aliases?: string[];
  role: string;
  reason: (input: PeptidesPreviewInput) => string;
  protocol: (input: PeptidesPreviewInput, goal: Goal) => ResolvedProtocol;
};

type DosePhase = {
  doseMg: number;
  administrationsPerWeek: number;
  weeks: number;
};

type ResolvedProtocol = {
  durationLabel: string;
  protocolWeeks: number;
  phases: DosePhase[];
  route: "subcutaneous" | "intranasal";
  openingWindowDays: number;
  protocolBasis: string;
};

const CONSERVATIVE_OPEN_VIAL_DAYS = 28;

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function fixedProtocol(
  phases: DosePhase[],
  protocolWeeks: number,
  route: ResolvedProtocol["route"],
  protocolBasis: string,
): ResolvedProtocol {
  const activeWeeks = phases.reduce((sum, phase) => sum + phase.weeks, 0);
  return {
    durationLabel: activeWeeks === protocolWeeks
      ? `${protocolWeeks} semaines actives`
      : `Stratégie ${protocolWeeks} semaines · ${activeWeeks} semaines actives`,
    protocolWeeks,
    phases,
    route,
    // This is an operational planning ceiling, not a chemical-stability claim.
    // It prevents one reconstituted vial from being stretched across a whole
    // multi-month strategy merely because its milligram capacity is large.
    openingWindowDays: CONSERVATIVE_OPEN_VIAL_DAYS,
    protocolBasis,
  };
}

function bpcProtocol(input: PeptidesPreviewInput, goal: Goal): ResolvedProtocol {
  const intensityMcgKg = goal === "skin-hair" ? 3 : input.recoveryScope === "localized" ? 3 : input.recoveryScope === "multi-site" ? 4 : 5;
  const dailyMg = clamp(input.weightKg * intensityMcgKg / 1000, 0.2, 0.5);
  const administrationsPerWeek = input.injectionFrequency === "twice-daily" ? 14 : 7;
  return fixedProtocol([{ doseMg: dailyMg / (administrationsPerWeek / 7), administrationsPerWeek, weeks: 8 }], 12, "subcutaneous", `${intensityMcgKg} mcg/kg/jour, borné à 200–500 mcg/jour, réparti selon la fréquence acceptable`);
}

function ghSecretagogueProtocol(input: PeptidesPreviewInput, name: "cjc" | "ipamorelin"): ResolvedProtocol {
  const experienced = ["tried", "regular"].includes(input.experience);
  const mcgKg = name === "cjc" ? (experienced ? 2 : 1.5) : (experienced ? 2.5 : 1.5);
  const bounds = name === "cjc" ? [0.1, 0.2] as const : [0.1, 0.3] as const;
  const doseMg = clamp(input.weightKg * mcgKg / 1000, bounds[0], bounds[1]);
  return fixedProtocol([{ doseMg, administrationsPerWeek: 7, weeks: 12 }], 12, "subcutaneous", `${mcgKg} mcg/kg par administration, borné à ${bounds[0] * 1000}–${bounds[1] * 1000} mcg`);
}

function semaglutideProtocol(input: PeptidesPreviewInput): ResolvedProtocol {
  const phases = input.glp1History === "tolerated"
    ? [{ doseMg: 0.5, administrationsPerWeek: 1, weeks: 4 }, { doseMg: 1, administrationsPerWeek: 1, weeks: 4 }, { doseMg: 1.7, administrationsPerWeek: 1, weeks: 4 }]
    : [{ doseMg: 0.25, administrationsPerWeek: 1, weeks: 4 }, { doseMg: 0.5, administrationsPerWeek: 1, weeks: 4 }, { doseMg: 1, administrationsPerWeek: 1, weeks: 4 }];
  return fixedProtocol(phases, 12, "subcutaneous", input.glp1History === "tolerated" ? "titration 0,5 → 1 → 1,7 mg selon tolérance antérieure" : "titration initiale 0,25 → 0,5 → 1 mg");
}

function motsProtocol(input: PeptidesPreviewInput, goal: Goal): ResolvedProtocol {
  const doseMg = goal === "endurance" && (input.trainingFrequency === "5plus" || input.experience === "regular") ? 10 : 5;
  return fixedProtocol([{ doseMg, administrationsPerWeek: 1, weeks: 8 }], 12, "subcutaneous", `${doseMg} mg/semaine selon charge d’entraînement et expérience`);
}

function dsipProtocol(input: PeptidesPreviewInput): ResolvedProtocol {
  const doseMg = input.sleepHours <= 5 ? 0.2 : input.sleepHours < 6.5 ? 0.15 : 0.1;
  return fixedProtocol([{ doseMg, administrationsPerWeek: 7, weeks: 4 }], 12, "subcutaneous", `${doseMg * 1000} mcg au coucher selon le sommeil déclaré`);
}

function semaxProtocol(input: PeptidesPreviewInput): ResolvedProtocol {
  const administrationsPerWeek = input.cognitiveStress === "low" ? 7 : 14;
  return fixedProtocol([{ doseMg: 0.2, administrationsPerWeek, weeks: 4 }], 12, "intranasal", `200 mcg par administration, ${administrationsPerWeek / 7} fois/jour selon la charge cognitive`);
}

function selankProtocol(input: PeptidesPreviewInput): ResolvedProtocol {
  const administrationsPerWeek = input.cognitiveStress === "low" ? 7 : 14;
  return fixedProtocol([{ doseMg: 0.25, administrationsPerWeek, weeks: 4 }], 12, "intranasal", `250 mcg par administration, ${administrationsPerWeek / 7} fois/jour selon le stress cognitif`);
}

function ghkProtocol(_input: PeptidesPreviewInput, _goal: Goal): ResolvedProtocol {
  // Once GHK-Cu is justified by the profile, it receives the complete active
  // protocol. A secondary goal decides whether the molecule is included; it
  // must never silently halve the dose of an included molecule.
  return fixedProtocol(
    [{ doseMg: 2, administrationsPerWeek: 7, weeks: 8 }],
    12,
    "subcutaneous",
    "2 mg par jour pendant 8 semaines ; protocole complet identique que l’axe cutané soit primaire ou secondaire",
  );
}

function ss31Protocol(input: PeptidesPreviewInput): ResolvedProtocol {
  const doseMg = input.trainingFrequency === "5plus" || input.experience === "regular" ? 2 : 1;
  return fixedProtocol([{ doseMg, administrationsPerWeek: 7, weeks: 4 }], 12, "subcutaneous", `${doseMg} mg/jour selon charge d’entraînement et expérience`);
}

const candidatesByGoal: Record<Goal, Candidate[]> = {
  recovery: [
    { name: "BPC-157", role: "Récupération tissulaire ciblée", reason: (input) => input.recoveryScope === "localized" ? "Tu as décrit une zone prioritaire : ce premier axe couvre huit semaines actives dans la stratégie globale." : "La récupération fait partie de tes priorités : ce premier axe constitue la base tissulaire active de la stratégie.", protocol: bpcProtocol },
    { name: "TB-500", aliases: ["TB500"], role: "Récupération systémique complémentaire", reason: (input) => input.recoveryScope === "systemic" ? "Tu as décrit une récupération générale : ce second axe couvre huit semaines actives avec induction puis maintenance." : "Ce second axe complète la récupération locale pendant huit semaines actives avec induction puis maintenance.", protocol: () => fixedProtocol([{ doseMg: 2.5, administrationsPerWeek: 2, weeks: 4 }, { doseMg: 1.25, administrationsPerWeek: 2, weeks: 4 }], 12, "subcutaneous", "induction 2,5 mg deux fois/semaine puis maintenance 1,25 mg deux fois/semaine") },
  ],
  "gh-antiaging": [
    { name: "CJC-1295 (no DAC)", aliases: ["CJC-1295 sans DAC", "CJC1295 no DAC"], role: "Signal pulsatile de l’axe GH", reason: () => "Tu as choisi l’axe GH comme priorité : ce premier levier porte le signal pulsatile sur le cycle minimal de douze semaines.", protocol: (input) => ghSecretagogueProtocol(input, "cjc") },
    { name: "Ipamorelin", role: "Sécrétagogue complémentaire", reason: () => "Ce second levier complète le signal GHRH sur le même cycle de douze semaines.", protocol: (input) => ghSecretagogueProtocol(input, "ipamorelin") },
  ],
  fatloss: [
    { name: "Semaglutide", role: "Contrôle de l’appétit et axe métabolique", reason: (input) => `À ${input.weightKg} kg pour ${input.heightCm} cm (IMC ${Number((input.weightKg / ((input.heightCm / 100) ** 2)).toFixed(1))}), avec un historique GLP-1 « ${input.glp1History === "never" ? "jamais utilisé" : "déjà utilisé et bien toléré"} », ce premier axe suit une progression calculée sur douze semaines.`, protocol: semaglutideProtocol },
    { name: "MOTS-c", aliases: ["MOTS c"], role: "Support métabolique complémentaire", reason: () => "Ce second axe complète la stratégie métabolique sur le cycle estimé.", protocol: motsProtocol },
  ],
  sleep: [
    { name: "DSIP", role: "Architecture et qualité du sommeil", reason: (input) => `Tu déclares en moyenne ${input.sleepHours} heures de sommeil et tu as placé le sommeil parmi les objectifs. Le pré-calcul isole cet axe au lieu de le confondre avec une stratégie GH ou récupération générale.`, protocol: dsipProtocol },
    { name: "Selank", role: "Stabilité sous stress", reason: () => "Ce second levier complète l’axe sommeil par un soutien de la stabilité nerveuse.", protocol: selankProtocol },
  ],
  cognitive: [
    { name: "Semax", role: "Focus et performance cognitive", reason: (input) => `Ton objectif porte sur la cognition avec un stress déclaré ${input.cognitiveStress === "high" ? "élevé" : input.cognitiveStress === "moderate" ? "modéré" : "faible"}. Ce premier axe porte le focus pendant la phase active de quatre semaines.`, protocol: semaxProtocol },
    { name: "Selank", role: "Stabilité cognitive sous stress", reason: () => "Ce second axe complète le focus par la stabilité cognitive pendant la phase active de quatre semaines.", protocol: selankProtocol },
  ],
  libido: [
    { name: "PT-141", role: "Réponse sexuelle centrale", reason: (input) => `L’objectif déclaré concerne la libido et ta tension est ${input.bloodPressure === "normal" ? "déclarée normale" : "déclarée contrôlée"}. Le scénario isole un levier central ponctuel ; il ne prétend pas corriger un éventuel facteur hormonal non mesuré.`, protocol: (input) => fixedProtocol([{ doseMg: ["tried", "regular"].includes(input.experience) ? 1 : 0.5, administrationsPerWeek: 1, weeks: 12 }], 12, "subcutaneous", "usage ponctuel hebdomadaire, dose ajustée à l’expérience") },
    { name: "KissPeptin-10", aliases: ["Kisspeptin-10", "Kisspeptin 10"], role: "Support de l’axe hormonal", reason: () => "Ce second levier complète l’axe libido dans l’estimation multi-molécules.", protocol: () => fixedProtocol([{ doseMg: 0.1, administrationsPerWeek: 3, weeks: 8 }], 12, "subcutaneous", "100 mcg, trois fois/semaine pendant 8 semaines") },
  ],
  "testo-boost": [
    { name: "KissPeptin-10", aliases: ["Kisspeptin-10", "Kisspeptin 10"], role: "Axe hypothalamo-hypophyso-gonadique", reason: () => "Peptides Engine personnalise cet axe autour de l’objectif testostérone, de l’historique et des autres réponses du profil.", protocol: () => fixedProtocol([{ doseMg: 0.1, administrationsPerWeek: 3, weeks: 8 }], 12, "subcutaneous", "100 mcg, trois fois/semaine pendant 8 semaines") },
    { name: "PT-141", role: "Support libido complémentaire", reason: () => "La libido basse déclarée justifie ce second axe dans l’estimation commerciale.", protocol: (input) => fixedProtocol([{ doseMg: ["tried", "regular"].includes(input.experience) ? 1 : 0.5, administrationsPerWeek: 1, weeks: 12 }], 12, "subcutaneous", "usage ponctuel hebdomadaire, dose ajustée à l’expérience") },
  ],
  "skin-hair": [
    { name: "GHK-Cu", aliases: ["GHK Cu"], role: "Peau, cheveux et matrice extracellulaire", reason: () => "L’objectif déclaré est cutané ou capillaire : ce premier axe porte la matrice et la qualité tissulaire pendant huit semaines actives.", protocol: ghkProtocol },
    { name: "BPC-157", role: "Support tissulaire complémentaire", reason: () => "Ce second levier complète l’axe peau et cheveux sur le cycle estimé.", protocol: bpcProtocol },
  ],
  endurance: [
    { name: "MOTS-c", aliases: ["MOTS c"], role: "Efficience métabolique et endurance", reason: (input) => `Tu déclares ${input.trainingFrequency === "5plus" ? "au moins cinq" : input.trainingFrequency === "3-4" ? "trois à quatre" : input.trainingFrequency === "1-2" ? "une à deux" : "aucune"} séances par semaine avec une priorité endurance. MOTS-c constitue le levier énergétique principal du scénario.`, protocol: motsProtocol },
    { name: "SS-31", aliases: ["SS-31 (Elamipretide)", "Elamipretide"], role: "Fonction mitochondriale", reason: () => "Ce second axe complète l’efficience énergétique pendant une phase active de quatre semaines.", protocol: ss31Protocol },
  ],
};

const hardReviewConditions = new Set(["cancer", "pregnant", "breastfeeding", "cardiac", "renal-hepatic"]);

function normalize(value: string): string {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "");
}

function findSnapshot(candidate: Candidate, snapshots: PeptauraFeedProductSnapshot[], shippingVendors?: string[]): PeptauraFeedProductSnapshot | null {
  const wanted = [candidate.name, ...(candidate.aliases || [])].map(normalize);
  return snapshots.find((snapshot) => {
    if (!snapshot.live || availableListings(snapshot, shippingVendors).length === 0) return false;
    const values = [snapshot.slug, ...snapshot.listings.map((listing) => listing.name)].map(normalize);
    return values.some((value) => wanted.includes(value));
  }) || null;
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
  activeDurationWeeks: number;
  doseSummary: string;
  calculationBasis: string;
  protocol: ResolvedProtocol;
  administrations: Array<{ day: number; doseMg: number }>;
};

function phaseLabel(phase: DosePhase): string {
  return `${formatDose(phase.doseMg)} par administration, ${phase.administrationsPerWeek} fois par semaine pendant ${phase.weeks} semaines`;
}

function calculateProtocolMath(selection: CandidateSelection, input: PeptidesPreviewInput): ProtocolMath | null {
  const protocol = selection.candidate.protocol(input, selection.goal);
  if (!protocol.phases.length || !Number.isInteger(protocol.protocolWeeks) || protocol.protocolWeeks < 1) return null;
  const administrations: Array<{ day: number; doseMg: number }> = [];
  let phaseStartDay = 0;
  for (const phase of protocol.phases) {
    if (![phase.doseMg, phase.administrationsPerWeek, phase.weeks].every((value) => Number.isFinite(value) && value > 0)) return null;
    const count = phase.administrationsPerWeek * phase.weeks;
    if (!Number.isInteger(count) || count < 1) return null;
    const phaseDays = phase.weeks * 7;
    for (let index = 0; index < count; index += 1) {
      administrations.push({
        day: phaseStartDay + Math.min(phaseDays - 1, Math.floor(index * phaseDays / count)),
        doseMg: phase.doseMg,
      });
    }
    phaseStartDay += phaseDays;
  }
  const totalNeedMg = administrations.reduce((sum, administration) => sum + administration.doseMg, 0);
  const activeWeeks = protocol.phases.reduce((sum, phase) => sum + phase.weeks, 0);
  const phaseLabels = protocol.phases.map(phaseLabel);
  return {
    totalNeedMg,
    administrationCount: administrations.length,
    durationWeeks: protocol.protocolWeeks,
    activeDurationWeeks: activeWeeks,
    doseSummary: `${phaseLabels.join(" puis ")}${activeWeeks < protocol.protocolWeeks ? ` dans une stratégie de ${protocol.protocolWeeks} semaines` : ""}`,
    calculationBasis: `${phaseLabels.join(" + ")} = ${Number(totalNeedMg.toFixed(3))} mg au total sur la stratégie de ${protocol.protocolWeeks} semaines`,
    protocol,
    administrations,
  };
}

type CandidateSelection = { candidate: Candidate; goal: Goal; priority: "primary" | "secondary" };

function needsSecondCandidateForGoal(input: PeptidesPreviewInput, goal: Goal): boolean {
  const selectedGoals = new Set<Goal>([input.primaryGoal, ...input.secondaryGoals]);
  switch (goal) {
    case "recovery":
      return input.recoveryScope === "multi-site" || input.recoveryScope === "systemic";
    case "gh-antiaging":
      return input.sleepHours < 7 || input.trainingFrequency === "5plus" || selectedGoals.has("recovery") || selectedGoals.has("sleep");
    case "fatloss":
      return input.trainingFrequency === "5plus" || selectedGoals.has("endurance");
    case "sleep":
      return selectedGoals.has("cognitive") && ["moderate", "high"].includes(input.cognitiveStress);
    case "cognitive":
      return ["moderate", "high"].includes(input.cognitiveStress);
    case "libido":
      return selectedGoals.has("testo-boost");
    case "testo-boost":
      return selectedGoals.has("libido");
    case "skin-hair":
      return selectedGoals.has("recovery") && input.recoveryScope !== "localized";
    case "endurance":
      return input.trainingFrequency === "5plus" || selectedGoals.has("recovery");
  }
  return false;
}

function candidatesForGoal(input: PeptidesPreviewInput, goal: Goal): Candidate[] {
  const candidates = candidatesByGoal[goal];
  return candidates.slice(0, needsSecondCandidateForGoal(input, goal) ? 2 : 1);
}

function uniqueCandidates(input: PeptidesPreviewInput): CandidateSelection[] {
  const primary = candidatesForGoal(input, input.primaryGoal).map((candidate) => ({ candidate, goal: input.primaryGoal, priority: "primary" as const }));
  const secondary = input.secondaryGoals.flatMap((goal) => candidatesForGoal(input, goal).map((candidate) => ({ candidate, goal, priority: "secondary" as const })));
  const seen = new Set<string>();
  // Every included molecule must be attributable to a profile condition. A
  // client can need one molecule or several per selected axis; never pad the
  // estimate to reach a minimum count.
  return [...primary, ...secondary].filter(({ candidate }) => {
    const key = normalize(candidate.name);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function operationalVials(math: ProtocolMath, vialMg: number): number {
  const minimum = Math.ceil((math.totalNeedMg - Number.EPSILON) / vialMg);
  const windowDays = math.protocol.openingWindowDays;
  const buckets = new Map<number, number>();
  for (const administration of math.administrations) {
    const bucket = Math.floor(administration.day / windowDays);
    buckets.set(bucket, (buckets.get(bucket) || 0) + administration.doseMg);
  }
  const operational = [...buckets.values()].reduce((sum, needMg) => sum + Math.ceil((needMg - Number.EPSILON) / vialMg), 0);
  return Math.max(minimum, operational);
}

type PreviewPurchaseLine = {
  listing: PeptauraFeedListing;
  packageCount: number;
  deliveredVials: number;
  packagePriceUsd: number;
  totalPriceUsd: number;
};

type PreviewPurchasePlan = PeptidePurchasePlan<PeptauraFeedListing> & {
  purchaseLines: PreviewPurchaseLine[];
};

type PlannedOption = {
  selection: CandidateSelection;
  math: ProtocolMath;
  plan: PreviewPurchasePlan;
  mathematicalVials: number;
  operationalVials: number;
  safetyReserveVials: number;
};

function publicPeptideFamily(candidateName: string): string {
  const normalized = normalize(candidateName);
  if (["bpc157", "tb500"].includes(normalized)) return "Peptides de réparation tissulaire";
  if (normalized.startsWith("cjc1295")) return "Analogues GHRH";
  if (normalized === "ipamorelin") return "Sécrétagogues de l’axe GH";
  if (normalized === "semaglutide") return "Agonistes GLP-1";
  if (["motsc", "ss31", "elamipretide"].includes(normalized)) return "Peptides mitochondriaux";
  if (normalized === "dsip") return "Peptides régulateurs du sommeil";
  if (normalized === "selank") return "Peptides régulateurs du stress";
  if (normalized === "semax") return "Peptides nootropiques";
  if (normalized === "pt141") return "Peptides mélanocortinergiques";
  if (normalized.startsWith("kisspeptin")) return "Peptides neuroendocriniens de l’axe HPG";
  if (normalized === "ghkcu") return "Peptides de cuivre réparateurs";
  return "Peptides de signalisation ciblée";
}

function expectedEffectForWeek(option: PlannedOption, week: number): string {
  const family = publicPeptideFamily(option.selection.candidate.name);
  const candidate = normalize(option.selection.candidate.name);
  const activeWeeks = option.math.activeDurationWeeks;
  const targets: Record<string, [string, string, string, string]> = {
    bpc157: ["confort de la zone prioritaire", "mobilité et récupération locale", "tolérance aux mouvements et à l’entraînement", "stabilité du confort tissulaire"],
    tb500: ["souplesse et récupération générale", "raideurs et mobilité", "récupération entre les séances", "stabilité de la récupération systémique"],
    cjc1295nodac: ["qualité du sommeil et récupération nocturne", "réveil et récupération entre les séances", "capacité de récupération et composition corporelle", "stabilité du sommeil, de la récupération et de la composition"],
    ipamorelin: ["endormissement et récupération nocturne", "qualité du sommeil et sensation au réveil", "récupération et tolérance à la charge", "stabilité du bénéfice sur récupération et composition"],
    semaglutide: ["satiété et contrôle de l’appétit", "régularité alimentaire et réduction des envies", "adhérence au déficit et évolution du poids", "stabilité de la satiété et de la trajectoire pondérale"],
    motsc: ["énergie quotidienne et tolérance à l’effort", "capacité de travail et récupération énergétique", "endurance et efficience métabolique", "stabilité de l’énergie et de la capacité de travail"],
    dsip: ["endormissement et profondeur du sommeil", "réveils nocturnes et qualité perçue", "régularité du sommeil et récupération", "maintien des acquis sur le sommeil"],
    selank: ["apaisement et stabilité sous stress", "réactivité émotionnelle et concentration", "stabilité nerveuse dans les journées chargées", "maintien du calme et de la constance cognitive"],
    semax: ["clarté mentale et mise en action", "focus et endurance cognitive", "productivité et stabilité de l’attention", "maintien des acquis cognitifs"],
    pt141: ["réponse et intérêt sexuels", "qualité et régularité de la réponse", "confiance et constance de la réponse sexuelle", "stabilité du bénéfice sur la libido"],
    kisspeptin10: ["signal neuroendocrinien et vitalité", "libido, énergie et ressenti hormonal", "régularité des signaux de l’axe HPG", "stabilité de la vitalité et du ressenti hormonal"],
    ghkcu: ["qualité et hydratation perçues de la peau", "texture cutanée et vitalité capillaire", "qualité de la matrice et aspect global", "stabilité des progrès cutanés et capillaires"],
    ss31: ["énergie cellulaire et tolérance à l’effort", "fatigue perçue et récupération énergétique", "endurance et capacité de travail", "maintien des gains de capacité énergétique"],
  };
  const stages = targets[candidate] || [option.selection.candidate.role.toLocaleLowerCase("fr-FR"), option.selection.candidate.role.toLocaleLowerCase("fr-FR"), option.selection.candidate.role.toLocaleLowerCase("fr-FR"), option.selection.candidate.role.toLocaleLowerCase("fr-FR")];
  const target = week <= 2 ? stages[0] : week <= 4 ? stages[1] : week <= 8 ? stages[2] : stages[3];
  if (week > activeWeeks) return `${family} · phase d’observation : maintien et lecture de ${target}.`;
  const progress = [
    "mise en route et premiers signaux attendus sur",
    "adaptation progressive avec une première tendance sur",
    "effets positifs plus perceptibles attendus sur",
    "premier palier à comparer au point de départ sur",
    "consolidation progressive attendue sur",
    "régularité plus lisible attendue sur",
    "effets plus nets et plus constants attendus sur",
    "palier de progression à confirmer sur",
    "maintien du bénéfice attendu sur",
    "stabilité du bénéfice à observer sur",
    "consolidation de fin de cycle sur",
    "bilan global de la progression sur",
  ][Math.min(week, 12) - 1];
  return `${family} · ${progress} ${target}.`;
}

function buildEffectTimeline(options: PlannedOption[], durationWeeks: number): PeptidesPreviewEffectWeek[] {
  return Array.from({ length: durationWeeks }, (_, index) => {
    const week = index + 1;
    return {
      week,
      title: week === 1 ? "Mise en route" : week <= 4 ? "Installation progressive" : week <= 8 ? "Consolidation" : "Stabilisation",
      effects: options.map((option) => expectedEffectForWeek(option, week)),
    };
  });
}

function cheapestMixedPackagePlan(
  listings: PeptauraFeedListing[],
  requestedVials: number,
  vialMg: number,
): PreviewPurchasePlan | null {
  if (listings.length === 0 || requestedVials < 1) return null;
  const listingsByBoxSize = new Map<number, PeptauraFeedListing[]>();
  for (const listing of listings) {
    const group = listingsByBoxSize.get(listing.boxSize) || [];
    group.push(listing);
    listingsByBoxSize.set(listing.boxSize, group);
  }
  const packageOptions = [...listingsByBoxSize.entries()].map(([boxSize, group]) => ({ boxSize, listings: group }));
  if (packageOptions.length === 0) return null;
  // The 20% milligram buffer is already included in requestedVials. Require an
  // exact vial count so packaging can never create a second hidden reserve.
  // If a supplier only exposes oversized boxes, reject that option rather than
  // making the customer fund unused stock.
  const maximumDeliveredVials = requestedVials;
  let best: { lines: PreviewPurchaseLine[]; deliveredVials: number; totalPriceUsd: number; packageCount: number } | null = null;

  const visit = (index: number, deliveredVials: number, lines: PreviewPurchaseLine[]) => {
    if (deliveredVials > maximumDeliveredVials) return;
    if (index === packageOptions.length) {
      if (deliveredVials < requestedVials) return;
      const totalPriceUsd = lines.reduce((sum, line) => sum + line.totalPriceUsd, 0);
      const packageCount = lines.reduce((sum, line) => sum + line.packageCount, 0);
      if (!best || deliveredVials < best.deliveredVials
        || (deliveredVials === best.deliveredVials && cents(totalPriceUsd) < cents(best.totalPriceUsd))
        || (deliveredVials === best.deliveredVials && cents(totalPriceUsd) === cents(best.totalPriceUsd) && packageCount < best.packageCount)) {
        best = { lines: [...lines], deliveredVials, totalPriceUsd, packageCount };
      }
      return;
    }
    const option = packageOptions[index];
    const maxPackages = Math.floor((maximumDeliveredVials - deliveredVials) / option.boxSize);
    for (let packageCount = 0; packageCount <= maxPackages; packageCount += 1) {
      if (packageCount === 0) {
        visit(index + 1, deliveredVials, lines);
        continue;
      }
      const pricedListings = option.listings.map((listing) => ({
        listing,
        packagePriceUsd: effectivePackagePrice(listing, packageCount * option.boxSize),
      })).filter((entry) => Number.isFinite(entry.packagePriceUsd) && entry.packagePriceUsd > 0)
        .sort((a, b) => cents(a.packagePriceUsd) - cents(b.packagePriceUsd));
      const priced = pricedListings[0];
      if (!priced) continue;
      const line: PreviewPurchaseLine = {
        listing: priced.listing,
        packageCount,
        deliveredVials: packageCount * option.boxSize,
        packagePriceUsd: priced.packagePriceUsd,
        totalPriceUsd: Math.round(priced.packagePriceUsd * packageCount * 100) / 100,
      };
      lines.push(line);
      visit(index + 1, deliveredVials + line.deliveredVials, lines);
      lines.pop();
    }
  };
  visit(0, 0, []);
  if (!best) return null;
  const selected = best as { lines: PreviewPurchaseLine[]; deliveredVials: number; totalPriceUsd: number; packageCount: number };
  const representative = selected.lines[0].listing;
  return {
    listing: representative,
    needMg: requestedVials * vialMg,
    vialMg,
    requestedVials,
    packageCount: selected.packageCount,
    deliveredVials: selected.deliveredVials,
    deliveredMg: selected.deliveredVials * vialMg,
    packagePriceUsd: Math.min(...selected.lines.map((line) => line.packagePriceUsd)),
    totalPriceUsd: selected.totalPriceUsd,
    overstockRatio: selected.deliveredVials / requestedVials,
    purchaseLines: selected.lines,
  };
}

function candidatePlanOptions(
  selection: CandidateSelection,
  input: PeptidesPreviewInput,
  snapshots: PeptauraFeedProductSnapshot[],
  allowedSuppliers?: string[],
): PlannedOption[] {
  const math = calculateProtocolMath(selection, input);
  const snapshot = findSnapshot(selection.candidate, snapshots, allowedSuppliers);
  if (!math || !snapshot) return [];
  const groupedListings = new Map<string, PeptauraFeedListing[]>();
  for (const listing of availableListings(snapshot, allowedSuppliers)) {
    const vialMg = parseListingMg(listing.dosage);
    if (!vialMg) continue;
    const key = `${normalize(listing.supplier)}:${vialMg}`;
    const group = groupedListings.get(key) || [];
    group.push(listing);
    groupedListings.set(key, group);
  }
  const options = [...groupedListings.values()].flatMap((listings) => {
    const vialMg = parseListingMg(listings[0].dosage);
    if (!vialMg) return [];
    const mathematicalVials = Math.ceil((math.totalNeedMg - Number.EPSILON) / vialMg);
    const requiredOperationalVials = operationalVials(math, vialMg);
    // Keep the prescribed dose unchanged, then provision enough stock to avoid
    // a mid-cycle reorder with a 20% buffer in total milligram capacity.
    // Reserve is calculated in milligrams, not as a blind extra vial per
    // molecule. Existing unused capacity counts toward the 20% buffer.
    const reserveTargetVials = Math.ceil((math.totalNeedMg * 1.2 - Number.EPSILON) / vialMg);
    const vialsRequiredWithReserve = Math.max(requiredOperationalVials, reserveTargetVials);
    // Optimize the real cart across single-vial and bulk-box SKUs from the same
    // supplier, without adding packaging overfill beyond the 20% mg buffer.
    const plan = cheapestMixedPackagePlan(listings, vialsRequiredWithReserve, vialMg);
    if (!plan || plan.requestedVials !== vialsRequiredWithReserve) return [];
    const safetyReserveVials = Math.max(0, plan.deliveredVials - requiredOperationalVials);
    return [{ selection, math, plan, mathematicalVials, operationalVials: requiredOperationalVials, safetyReserveVials }];
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
    // One client order must use one supplier, so shipping is charged exactly
    // once for the complete multi-molecule cart — never once per molecule.
    const suppliers = new Set(options.map((option) => normalize(option.plan.listing.supplier)));
    if (suppliers.size !== 1) return [];
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

function personalizationPoint(input: PeptidesPreviewInput, blocker: string): string {
  const bmi = input.weightKg / ((input.heightCm / 100) ** 2);
  const points: Record<string, string> = {
    cancer: "Peptides Engine intégrera ton historique oncologique et écartera les axes qui ne correspondent pas à ce terrain.",
    pregnant: "Peptides Engine construira une stratégie adaptée à la grossesse déclarée au lieu de reprendre un stack standard.",
    breastfeeding: "Peptides Engine intégrera l’allaitement déclaré et retirera les options qui ne correspondent pas à cette période.",
    cardiac: "Ton profil cardiaque sera intégré directement dans le choix des axes, de la fréquence et des exclusions.",
    "renal-hepatic": "Peptides Engine adaptera la sélection à ton terrain rénal ou hépatique et supprimera les options non pertinentes.",
    maladie_autoimmune_a_integrer: "La maladie auto-immune déclarée devient une règle de personnalisation pour sélectionner les axes cohérents et écarter les autres.",
    bilan_hormonal_recent_requis: "Fatigue, libido basse et récupération réduite orientent l’analyse vers l’axe testostérone, mais Peptides Engine croisera aussi sommeil, récupération et contexte hormonal pour construire la stratégie complète.",
    protocole_hpg_a_personnaliser: "L’axe testostérone est bien identifié ; Peptides Engine va maintenant personnaliser les leviers, la progression et le calendrier au lieu de livrer une formule identique à tous.",
    bilan_gh_recent_requis: "L’objectif GH est identifié ; Peptides Engine déterminera la combinaison, la progression et le calendrier adaptés à ton profil complet.",
    pression_arterielle_a_verifier: "La tension déclarée sera intégrée dans l’axe libido pour sélectionner l’approche la plus cohérente et retirer ce qui ne convient pas.",
    profil_glycemique_a_revoir: "Le diabète déclaré change la construction de l’axe perte de graisse ; Peptides Engine l’intègre directement dans la stratégie personnalisée.",
    historique_glp1_a_revoir: input.glp1History === "current" ? "Ton GLP-1 actuel devient le point de départ : Peptides Engine construira la suite autour de ce que tu utilises déjà, sans repartir sur un scénario générique." : "Ton expérience GLP-1 et les effets ressentis guideront la prochaine stratégie afin de ne pas répéter la même approche.",
    thyroide_a_preciser_avant_glp1: "Le contexte thyroïdien sera croisé avec l’objectif perte de graisse pour personnaliser l’axe métabolique dans Peptides Engine.",
    composition_basse_a_revoir_fatloss: `Avec un IMC d’environ ${bmi.toFixed(1)} et la masse grasse déclarée, Peptides Engine réorientera la stratégie vers l’objectif réellement prioritaire plutôt que d’appliquer un modèle perte de poids standard.`,
    imc_bas_incompatible_avec_preselection_fatloss: `Avec un IMC d’environ ${bmi.toFixed(1)}, Peptides Engine ajustera l’objectif et les leviers au profil réel au lieu de reprendre une stratégie de perte de poids générique.`,
    injections_refusees: "Ton refus des injections devient une contrainte de conception : Peptides Engine privilégiera les voies et les options compatibles avec ton choix.",
    stockage_froid_indisponible: "L’absence de stockage au froid sera intégrée à la sélection et à la liste d’achat pour construire une solution réellement exécutable.",
    stack_actuel_a_integrer: `Ton stack actuel (« ${input.currentPeptides} ») sera intégré afin d’éviter les doublons et de construire la suite autour de l’existant.`,
    historique_peptides_a_interpreter: `Ton expérience passée (« ${input.pastPeptides} ») servira à conserver ce qui a fonctionné et à écarter ce qui n’a pas produit le résultat attendu.`,
    medicaments_a_integrer: `Ton traitement actuel (« ${input.medications} ») sera intégré directement aux règles de sélection de Peptides Engine.`,
    allergies_a_integrer: `L’allergie ou intolérance déclarée (« ${input.allergies} ») sera utilisée pour filtrer les formulations et la liste d’achat.`,
    frequence_administration_incompatible: "Ta fréquence acceptable devient une règle de construction : Peptides Engine adaptera le choix et le calendrier à ce que tu peux réellement suivre.",
    catalogue_incomplet_pour_pays: "Peptides Engine optimisera la liste d’achat complète selon les formats réellement livrables vers ton pays.",
    aucune_combinaison_livree_chiffree: "Peptides Engine reconstruira la combinaison et les quantités pour obtenir une commande complète, cohérente et livrable.",
  };
  return points[blocker] || "Cette réponse sera transformée en règle de personnalisation dans Peptides Engine.";
}

function reviewNarrative(input: PeptidesPreviewInput, blockers: string[]): Pick<PeptidesPreviewResult, "headline" | "rationale" | "analysisPoints" | "requiredMarkers" | "nextStepExplanation"> {
  const hormonal = blockers.includes("bilan_hormonal_recent_requis") || blockers.includes("protocole_hpg_a_personnaliser");
  const gh = blockers.includes("bilan_gh_recent_requis");
  const glp1 = blockers.includes("historique_glp1_a_revoir");
  const history = blockers.some((blocker) => ["medicaments_a_integrer", "stack_actuel_a_integrer", "historique_peptides_a_interpreter", "allergies_a_integrer"].includes(blocker));
  const logistics = blockers.includes("catalogue_incomplet_pour_pays") || blockers.includes("aucune_combinaison_livree_chiffree");
  const constraints = blockers.some((blocker) => ["injections_refusees", "stockage_froid_indisponible", "frequence_administration_incompatible"].includes(blocker));
  const headline = hormonal
    ? "Ton axe testostérone mérite une stratégie complète, pas un stack copié collé."
    : gh
      ? "Ton objectif GH doit devenir une stratégie personnalisée, pas une combinaison standard."
      : glp1
        ? "Ton expérience GLP-1 devient le point de départ de ta stratégie Peptides Engine."
        : history
          ? "Ton historique va servir à construire une stratégie Peptides Engine réellement personnalisée."
          : logistics
            ? "Peptides Engine va reconstruire une commande complète et livrable pour ton profil."
            : constraints
              ? "Tes contraintes changent la forme du protocole, pas ton accès à Peptides Engine."
              : "Ton profil mérite une stratégie Peptides Engine construite sur mesure.";
  const rationale = "Le pré-calcul a identifié les réponses qui rendent un stack standard trop simpliste pour ton cas. Dans Peptides Engine, elles deviennent des règles de personnalisation : l’analyse sélectionne les axes cohérents, écarte ce qui ne convient pas, construit le calendrier et finalise la liste d’achat.";
  return {
    headline,
    rationale,
    analysisPoints: blockers.map((blocker) => personalizationPoint(input, blocker)),
    requiredMarkers: [],
    nextStepExplanation: "Débloque Peptides Engine maintenant. L’analyse complète utilisera toutes les réponses déjà fournies pour construire ta stratégie, tes ajustements et ta liste d’achat sans te renvoyer vers un autre questionnaire ou une étape intermédiaire.",
  };
}

function frenchList(values: string[]): string {
  if (values.length <= 1) return values[0] || "";
  return `${values.slice(0, -1).join(", ")} et ${values.at(-1)}`;
}

const trainingFrequencyLabels: Record<PeptidesPreviewInput["trainingFrequency"], string> = {
  none: "aucune séance structurée",
  "1-2": "une à deux séances par semaine",
  "3-4": "trois à quatre séances par semaine",
  "5plus": "au moins cinq séances par semaine",
};

function eligibleNarrative(
  input: PeptidesPreviewInput,
  selected: PeptidesPreviewMolecule[],
  grandTotalUsd: number,
  durationLabel: string,
): Pick<PeptidesPreviewResult, "headline" | "rationale" | "analysisPoints" | "requiredMarkers" | "nextStepExplanation"> {
  const primary = goalLabels[input.primaryGoal];
  const roles = selected.map((item) => item.role.toLocaleLowerCase("fr-FR"));
  const primaryMoleculeCount = candidatesForGoal(input, input.primaryGoal).length;
  const points = [
    `Ta priorité ${primary} est traduite en ${selected.length} axe${selected.length > 1 ? "s" : ""} justifié${selected.length > 1 ? "s" : ""} : ${frenchList(roles)}.`,
  ];
  if (input.primaryGoal === "recovery") {
    const scope = input.recoveryScope === "localized" ? "une zone précise" : input.recoveryScope === "systemic" ? "une récupération générale" : "plusieurs zones";
    points.push(primaryMoleculeCount > 1
      ? `Tu as décrit ${scope} : ce besoin justifie une action ciblée et un soutien systémique distincts.`
      : `Tu as décrit ${scope} : un seul axe ciblé suffit dans cette estimation, sans ajouter une seconde molécule artificiellement.`);
  }
  if (input.primaryGoal === "gh-antiaging") points.push(primaryMoleculeCount > 1
    ? `Ton sommeil, ta charge d’entraînement ou tes objectifs associés justifient deux leviers complémentaires, tous deux chiffrés sur leurs semaines réellement actives.`
    : `Ton profil ne justifie qu’un seul levier GH dans cette estimation ; aucun sécrétagogue complémentaire n’est ajouté par défaut.`);
  if (input.primaryGoal === "cognitive") points.push(primaryMoleculeCount > 1
    ? `Ton stress cognitif déclaré ${input.cognitiveStress === "high" ? "élevé" : "modéré"} justifie d’associer performance mentale et stabilité.`
    : "Ton stress cognitif déclaré faible permet de conserver un seul axe de performance mentale dans cette estimation.");
  if (input.primaryGoal === "fatloss") {
    const bmi = input.weightKg / ((input.heightCm / 100) ** 2);
    points.push(`À ${input.weightKg} kg pour ${input.heightCm} cm, avec un IMC d’environ ${bmi.toFixed(1)} et un historique GLP-1 « ${input.glp1History === "never" ? "jamais utilisé" : "déjà utilisé et bien toléré"} », la progression métabolique est chiffrée sur les phases actives complètes.`);
  }
  if (input.primaryGoal === "sleep") points.push(primaryMoleculeCount > 1
    ? `Avec ${input.sleepHours} heures de sommeil et le stress cognitif déclaré, le scénario sépare architecture du sommeil et stabilité nerveuse.`
    : `Avec ${input.sleepHours} heures de sommeil déclarées, le scénario conserve un seul axe centré sur l’architecture du sommeil.`);
  if (input.primaryGoal === "endurance") points.push(primaryMoleculeCount > 1
    ? `Avec ${trainingFrequencyLabels[input.trainingFrequency]}, la charge justifie d’associer efficience énergétique et fonction mitochondriale.`
    : `Avec ${trainingFrequencyLabels[input.trainingFrequency]}, un seul axe d’efficience énergétique suffit dans cette estimation.`);
  if (input.secondaryGoals.length) points.push(`Tes objectifs secondaires, ${frenchList(input.secondaryGoals.map((goal) => goalLabels[goal]))}, n’ajoutent une molécule que lorsqu’un besoin distinct de ton profil le justifie.`);
  points.push(`L’exécution tient compte de ta limite de ${frequencyLabels[input.injectionFrequency]} et de ton accès à ${refrigerationLabels[input.refrigeration]}.`);
  const budgetDelta = input.budgetTotalUsd - grandTotalUsd;
  points.push(budgetDelta >= 0
    ? `Le total rendu de $${grandTotalUsd.toFixed(2)} reste $${budgetDelta.toFixed(2)} sous ton budget déclaré de $${input.budgetTotalUsd.toFixed(2)}.`
    : `Le total rendu de $${grandTotalUsd.toFixed(2)} dépasse ton budget déclaré de $${input.budgetTotalUsd.toFixed(2)} de $${Math.abs(budgetDelta).toFixed(2)} ; Peptides Engine devra donc hiérarchiser les axes.`);
  return {
    headline: `Ton estimation retient ${selected.length} molécule${selected.length > 1 ? "s" : ""} pour ta priorité ${primary}.`,
    rationale: `Ton aperçu ne se contente plus de nommer un objectif : il construit ${frenchList(roles)}, distingue les phases actives dans « ${durationLabel} » et chiffre la commande complète à $${grandTotalUsd.toFixed(2)} livraison comprise. Peptides Engine transforme ensuite cette architecture en calendrier individualisé, unités et liste d’achat finale.`,
    analysisPoints: points,
    requiredMarkers: [],
    nextStepExplanation: "Débloque Peptides Engine pour recevoir la sélection nominative, la progression semaine par semaine, les ajustements selon ton profil, la reconstitution, les unités et la liste d’achat finale sans remplir un second questionnaire.",
  };
}

function emptyReviewResult(blockers: string[], nextStep: PeptidesPreviewResult["nextStep"], narrative: Pick<PeptidesPreviewResult, "headline" | "rationale" | "analysisPoints" | "requiredMarkers" | "nextStepExplanation">): PeptidesPreviewResult {
  return {
    status: "review_required",
    moleculeCount: 0,
    molecules: [],
    moleculeQuotes: [],
    effectTimeline: [],
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
    durationLabel: "Personnalisation complète dans Peptides Engine",
    budgetFit: "unknown",
    ...narrative,
    budgetExplanation: "Le devis final sera construit dans Peptides Engine avec la sélection, les quantités et la livraison adaptées à ton profil.",
    quoteExplanation: "Peptides Engine finalise la sélection et chiffre la commande complète au lieu d’afficher un sous-total incomplet.",
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
  const incompatibleFrequency = preliminaryCandidates.some((selection) => {
    const protocol = selection.candidate.protocol(input, selection.goal);
    if (protocol.route === "intranasal") return false;
    return Math.max(...protocol.phases.map((phase) => phase.administrationsPerWeek)) > acceptedAdministrationsPerWeek;
  });
  if (incompatibleFrequency) addBlocker("frequence_administration_incompatible");

  const shippingQuotes = shippingContext && (shippingContext.length === 0 || typeof shippingContext[0] !== "string")
    ? shippingContext as PeptauraShippingQuote[]
    : undefined;
  const allowedSuppliers = shippingQuotes
    ? shippingQuotes.filter((quote) => quote.available).map((quote) => quote.supplier)
    : shippingContext as string[] | undefined;
  const desiredCandidates = preliminaryCandidates;
  const optionGroups = desiredCandidates.map((selection) => candidatePlanOptions(selection, input, snapshots, allowedSuppliers));
  if (optionGroups.some((options) => options.length === 0)) {
    const unavailableBlockers = [...blockers, "catalogue_incomplet_pour_pays"].filter((blocker, index, all) => all.indexOf(blocker) === index);
    return { ...emptyReviewResult(unavailableBlockers, "peptides_engine", reviewNarrative(input, unavailableBlockers)), moleculeCount: desiredCandidates.length, priceCheckedAt: checkedAt };
  }
  const quote = selectQuotedCombination(optionGroups, shippingQuotes);
  if (!quote) {
    const unavailableBlockers = [...blockers, "aucune_combinaison_livree_chiffree"].filter((blocker, index, all) => all.indexOf(blocker) === index);
    return { ...emptyReviewResult(unavailableBlockers, "peptides_engine", reviewNarrative(input, unavailableBlockers)), moleculeCount: desiredCandidates.length, priceCheckedAt: checkedAt };
  }

  const selected = quote.options.map(({ selection, math, plan, mathematicalVials, operationalVials, safetyReserveVials }) => ({
    name: plan.listing.name || selection.candidate.name,
    supplier: plan.listing.supplierDisplayName || plan.listing.supplier,
    productUrl: plan.listing.productUrl,
    role: selection.candidate.role,
    reason: selection.candidate.reason(input),
    doseSummary: math.doseSummary,
    administrationCount: math.administrationCount,
    startingFormat: plan.purchaseLines.map((line) => `${line.listing.dosage} · boîte de ${line.listing.boxSize}`).join(" + "),
    startingPackagePriceUsd: plan.packagePriceUsd,
    cycleDurationLabel: math.protocol.durationLabel,
    route: math.protocol.route,
    protocolBasis: math.protocol.protocolBasis,
    openingWindowDays: math.protocol.openingWindowDays,
    calculationBasis: math.calculationBasis,
    totalRequiredMg: Number(math.totalNeedMg.toFixed(3)),
    bufferedRequiredMg: Number((math.totalNeedMg * 1.2).toFixed(3)),
    purchasedCapacityMg: Number((plan.deliveredVials * plan.vialMg).toFixed(3)),
    reserveCapacityMg: Number((plan.deliveredVials * plan.vialMg - math.totalNeedMg).toFixed(3)),
    vialStrengthMg: plan.vialMg,
    mathematicalVials,
    operationalVials,
    safetyReserveVials,
    vialsRequired: plan.requestedVials,
    vialsPurchased: plan.deliveredVials,
    packageCount: plan.packageCount,
    purchaseLines: plan.purchaseLines.map((line) => ({
      format: line.listing.dosage,
      boxSize: line.listing.boxSize,
      packageCount: line.packageCount,
      deliveredVials: line.deliveredVials,
      packagePriceUsd: line.packagePriceUsd,
      totalPriceUsd: line.totalPriceUsd,
      productUrl: line.listing.productUrl,
    })),
    estimatedTotalPriceUsd: plan.totalPriceUsd,
  } satisfies PeptidesPreviewMolecule));

  const maxDurationWeeks = Math.max(...quote.options.map((option) => option.math.durationWeeks));
  const moleculeQuotes = quote.options.map((option, index) => ({
    label: `Molécule ${index + 1}`,
    family: publicPeptideFamily(option.selection.candidate.name),
    role: option.selection.candidate.role,
    activeDurationWeeks: option.math.activeDurationWeeks,
    estimatedTotalPriceUsd: option.plan.totalPriceUsd,
  } satisfies PeptidesPreviewPublicQuoteLine));
  const effectTimeline = buildEffectTimeline(quote.options, maxDurationWeeks);
  const monthlyEquivalentUsd = Math.round((quote.grandTotalUsd / (maxDurationWeeks / 4)) * 100) / 100;
  const budgetFit = cents(quote.grandTotalUsd) <= cents(input.budgetTotalUsd) ? "within" : "above";
  const budgetExplanation = budgetFit === "within"
    ? `Le devis rendu estimé de $${quote.grandTotalUsd.toFixed(2)} respecte ton budget total déclaré de $${input.budgetTotalUsd.toFixed(2)}.`
    : `Le devis rendu estimé de $${quote.grandTotalUsd.toFixed(2)} dépasse ton budget total déclaré de $${input.budgetTotalUsd.toFixed(2)}. Le rapport complet devra prioriser les axes au lieu de masquer le dépassement.`;
  const activeWeeks = quote.options.map((option) => option.math.activeDurationWeeks);
  const minimumActiveWeeks = Math.min(...activeWeeks);
  const maximumActiveWeeks = Math.max(...activeWeeks);
  const durationLabel = minimumActiveWeeks === maxDurationWeeks && maximumActiveWeeks === maxDurationWeeks
    ? `${maxDurationWeeks} semaines actives`
    : minimumActiveWeeks === maximumActiveWeeks
      ? `Stratégie ${maxDurationWeeks} semaines · ${minimumActiveWeeks} semaines actives`
      : `Stratégie ${maxDurationWeeks} semaines · phases actives de ${minimumActiveWeeks} à ${maximumActiveWeeks} semaines`;
  if (blockers.length > 0) {
    const narrative = reviewNarrative(input, blockers);
    return {
      status: "review_required",
      moleculeCount: selected.length,
      molecules: selected,
      moleculeQuotes,
      effectTimeline,
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
      durationLabel,
      budgetFit,
      ...narrative,
      budgetExplanation: `Estimation actuelle : $${quote.productSubtotalUsd.toFixed(2)} de produits + $${quote.shippingUsd.toFixed(2)} de livraison = $${quote.grandTotalUsd.toFixed(2)} rendu estimé. Ce montant peut varier après l’achat de Peptides Engine, lorsque le protocole plus poussé et plus précis sera construit.`,
      quoteExplanation: `Le pré-calcul estime ${selected.length} molécule${selected.length > 1 ? "s" : ""} sur ${durationLabel}. Les noms et dosages sont réservés à l’analyse Peptides Engine complète.`,
      blockers,
      nextStep: "peptides_engine",
    };
  }
  const narrative = eligibleNarrative(input, selected, quote.grandTotalUsd, durationLabel);
  return {
    status: "eligible",
    moleculeCount: selected.length,
    molecules: selected,
    moleculeQuotes,
    effectTimeline,
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
    durationLabel,
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
  const fetchWithTimeout = async (url: string, accept: string): Promise<Response> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12_000);
    try {
      return await fetch(url, {
        headers: { accept, "user-agent": "APEXLABS-PeptidesPreview/1.0" },
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }
  };
  {
    const response = await fetchWithTimeout(PEPTAURA_PRODUCT_FEED_URL, "application/json");
    if (!response.ok) throw new Error(`PEPTAURA_PREVIEW_HTTP_${response.status}`);
    const raw = await response.text();
    const checkedAt = new Date(nowMs).toISOString();
    const parsed = parsePeptauraProductFeed(raw, { nowMs, maxAgeMs: 6 * 60 * 60_000, fetchedAt: checkedAt });
    if (!parsed?.snapshots.length) throw new Error("PEPTAURA_PREVIEW_INVALID_FEED");
    const country = countryLabels[cacheKey] || countryCode;
    const shippingResponse = await fetchWithTimeout(`https://www.peptaura.com/shipping?country=${encodeURIComponent(country)}`, "text/html");
    if (!shippingResponse.ok) throw new Error(`PEPTAURA_PREVIEW_SHIPPING_HTTP_${shippingResponse.status}`);
    const shippingHtml = await shippingResponse.text();
    const shippingQuotes = parsePeptauraShippingPage(shippingHtml).filter((quote) => quote.available && quote.tiers.length > 0);
    if (shippingQuotes.length === 0) throw new Error("PEPTAURA_PREVIEW_SHIPPING_UNAVAILABLE");
    const value = { snapshots: parsed.snapshots, checkedAt, shippingQuotes };
    cachedCatalog.set(cacheKey, { ...value, expiresAt: nowMs + 15 * 60_000 });
    return value;
  }
}
