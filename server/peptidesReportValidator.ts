/**
 * APEXLABS - Peptides Report Validator
 *
 * Strict gate that runs BEFORE the delivery email cron. A report failing any
 * critical check is BLOCKED from delivery. The flagship 199-399 EUR product
 * has zero tolerance for content errors (over-ordered vials, missing
 * sections, posology contradictions).
 *
 * Returns { ok, errors, warnings }. Only ok=true passes the gate.
 */

import {
  auditClientFacingText,
  collectClientFacingStrings,
} from "./clientFacingQuality";

export interface PeptidesPeptide {
  name?: string;
  route?: string;
  dosage?: string;
  timing?: string;
  purpose?: string;
  purchaseUrl?: string;
  vialsNeeded?: string;
  priceEstimate?: string;
  cycleDuration?: string;
  reconstitution?: string;
  whyThisPeptide?: string;
  _vialPlanning?: {
    status?: "documented" | "stability-unverified" | "unparseable";
    pharmacologicalNeedMg?: number | null;
    mathematicalMinimumVials?: number | null;
    operationalVials?: number | null;
    stabilityDays?: number | null;
    stabilitySource?: string | null;
  };
}

export interface PeptidesReport {
  tier?: string;
  qualityVersion?: "expert-standard-v1" | "medical-review-v1";
  peptides?: PeptidesPeptide[];
  sections?: Array<{ id?: string; title?: string; content?: string }>;
  clientName?: string;
  promoCodesGenerated?: any[];
  weeklySchedule?: string;
  shoppingList?: string;
  bloodMarkers?: string[];
  _validationContext?: {
    confirmedLowTestosterone?: boolean;
    consentAccepted?: boolean;
    profile?: {
      weightKg?: number;
      primaryGoal?: string;
      secondaryGoals?: string[];
      country?: string;
      budget?: string;
      timeline?: string;
      experience?: string;
      injectionComfort?: string;
    };
  };
  _enclomipheneSourceSync?: {
    url?: string;
    fetchedAt?: string;
    available?: boolean;
    format?: string;
    priceGbp?: number;
  };
  _peptauraLiveSync?: {
    syncedAt?: string;
    catalogRefreshedAt?: string;
    shippingLive?: boolean;
    applied?: string[];
    failures?: string[];
    listingSnapshots?: Array<{
      peptide?: string;
      fetchedAt?: string;
      supplier?: string;
      dosage?: string;
      requestedVials?: number;
      deliveredVials?: number;
      packageCount?: number;
      boxSize?: number;
      totalPriceUsd?: number;
      totalPriceGbp?: number;
      needMg?: number;
      deliveredMg?: number;
    }>;
  };
}

export interface PeptidesValidation {
  ok: boolean;
  errors: string[];
  warnings: string[];
  details: {
    peptideCount: number;
    sectionCount: number;
    totalChars: number;
    peptidesChecked: Array<{ name: string; issues: string[] }>;
  };
}

const REQUIRED_PEPTIDE_FIELDS = [
  "name",
  "route",
  "dosage",
  "timing",
  "purpose",
  "purchaseUrl",
  "vialsNeeded",
  "priceEstimate",
  "cycleDuration",
  "reconstitution",
  "whyThisPeptide",
] as const;

const MIN_SECTIONS = 12;
const MIN_SECTION_CHARS = 350;
const ENCLOMIPHENE_SOURCE_URL = "https://receptorchem.co.uk/enclomiphene-citrate/";
const MIN_TOTAL_CHARS = 30_000;
const MAX_PEPTAURA_DELIVERY_AGE_MS = Number(
  process.env.PEPTAURA_DELIVERY_MAX_AGE_MS || 45 * 60 * 1000
);

const PRIMARY_GOAL_PATTERNS: Record<string, RegExp> = {
  recovery: /\b(?:recuperation|guerison|tendon|articulation|blessure)\b/i,
  "gh-antiaging": /\b(?:gh|hormone de croissance|anti[ -]?age|longevite)\b/i,
  fatloss: /\b(?:perte de (?:gras|graisse|masse grasse)|fat loss|seche|recomposition)\b/i,
  sleep: /\b(?:sommeil|endormissement|reveils? nocturnes?|nuit)\b/i,
  cognitive: /\b(?:cognitif|focus|memoire|concentration|brain fog)\b/i,
  libido: /\b(?:libido|sexuel|erection)\b/i,
  "testo-boost": /\b(?:testosterone|axe hpg|lh|fsh|hypogonad)\b/i,
  "skin-hair": /\b(?:peau|cheveux|capillaire|anti[ -]?age)\b/i,
  endurance: /\b(?:endurance|cardio|capacite aerobie)\b/i,
};

function escaped(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function weightKgPattern(weightKg: number): RegExp | null {
  if (!Number.isFinite(weightKg) || weightKg <= 0) return null;

  const [integerPart, rawFraction = ""] = String(weightKg).split(".");
  const fraction = rawFraction.replace(/0+$/, "");
  const decimalPart = fraction
    ? `\\s*[.,]\\s*${escaped(fraction)}0*`
    : "(?:\\s*[.,]\\s*0+)?";

  // Numeric boundaries are stricter than \b: they reject 174.5 kg and
  // 74.55 kg while accepting French/English decimal separators, optional
  // spaces around the separator and harmless trailing zeroes.
  return new RegExp(
    `(?:^|[^0-9.,])${escaped(integerPart)}${decimalPart}\\s*kg\\b`,
    "i",
  );
}

export function reportMentionsWeightKg(value: string, weightKg: number): boolean {
  return weightKgPattern(weightKg)?.test(searchable(String(value || ""))) ?? false;
}

function searchable(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function numericRangePattern(value: string): RegExp | null {
  const numbers = value.match(/\d+(?:[.,]\d+)?/g);
  if (!numbers || numbers.length === 0) return null;
  const parts = numbers.map((entry) =>
    entry.split(/[.,]/).map(escaped).join("[.,]")
  );
  return new RegExp(parts.join("[\\s\\S]{0,24}"), "i");
}

function validateReportPersonalization(
  report: PeptidesReport
): string[] {
  if (report.qualityVersion !== "expert-standard-v1") return [];
  const profile = report._validationContext?.profile;
  if (!profile || Object.keys(profile).length === 0) return [];

  const errors: string[] = [];
  const synthesis = (report.sections || []).find((section) =>
    /profil-synthese|synthese de ton profil/i.test(`${section.id || ""} ${section.title || ""}`)
  );
  const synthesisText = String(synthesis?.content || "");
  const synthesisSearch = searchable(synthesisText);
  if (!synthesis) {
    return ["personnalisation: synthese de profil absente"];
  }

  const matchedFacts: string[] = [];
  const weightKg = Number(profile.weightKg || 0);
  const weightPattern = weightKgPattern(weightKg);
  if (Number.isFinite(weightKg) && weightKg > 0) {
    if (!weightPattern?.test(synthesisSearch)) {
      errors.push(`personnalisation: poids ${weightKg} kg absent de la synthese`);
    } else {
      matchedFacts.push("poids");
    }
  }

  const goal = String(profile.primaryGoal || "").toLowerCase();
  const goalPattern = PRIMARY_GOAL_PATTERNS[goal] || (goal ? new RegExp(escaped(goal), "i") : null);
  if (goalPattern) {
    if (!goalPattern.test(synthesisSearch)) {
      errors.push(`personnalisation: objectif principal ${profile.primaryGoal} absent de la synthese`);
    } else {
      matchedFacts.push("objectif");
    }
  }

  const contextualFacts: Array<[string, string | undefined, RegExp | null]> = [
    ["pays", profile.country, ({
      france: /\bfrance\b/i,
      belgium: /\b(?:belgique|belgium)\b/i,
      switzerland: /\b(?:suisse|switzerland)\b/i,
      "united arab emirates": /\b(?:emirats arabes unis|united arab emirates|uae|dubai)\b/i,
      "united states": /\b(?:etats-unis|united states|usa)\b/i,
      "united kingdom": /\b(?:royaume-uni|united kingdom|uk)\b/i,
      germany: /\b(?:allemagne|germany)\b/i,
      spain: /\b(?:espagne|spain)\b/i,
      italy: /\b(?:italie|italy)\b/i,
      morocco: /\b(?:maroc|morocco)\b/i,
    } as Record<string, RegExp>)[searchable(String(profile.country || ""))]
      || (profile.country ? new RegExp(escaped(searchable(profile.country)), "i") : null)],
    ["budget", profile.budget, numericRangePattern(String(profile.budget || ""))],
    ["timeline", profile.timeline, ({
      fast: /\b(?:4\s*(?:a|-|à)\s*6 semaines|rapide)\b/i,
      solid: /\b(?:8\s*(?:a|-|à)\s*12 semaines|solide)\b/i,
      longterm: /\b(?:12\+? semaines|long terme)\b/i,
    } as Record<string, RegExp>)[String(profile.timeline || "").toLowerCase()] || null],
    ["experience", profile.experience, ({
      none: /\b(?:debutant|premiere utilisation|jamais utilise|aucune experience)\b/i,
      read: /\b(?:lu|regarde|theorique|contenu)\b/i,
      tried: /\b(?:deja utilise|1\s*(?:a|-|à)\s*2 peptides)\b/i,
      regular: /\b(?:regulier|3\+? peptides)\b/i,
      advanced: /\b(?:avance|stacks? complexes?)\b/i,
    } as Record<string, RegExp>)[String(profile.experience || "").toLowerCase()] || null],
    ["injection", profile.injectionComfort, ({
      fine: /\b(?:a l'aise|aucun probleme|confortable)\b/i,
      anxious: /\b(?:anxieux|apprehension|injection)\b/i,
      "very-anxious": /\b(?:tres anxieux|alternative|apprehension forte)\b/i,
      refuse: /\b(?:refuse|sans injection|non injectable)\b/i,
    } as Record<string, RegExp>)[String(profile.injectionComfort || "").toLowerCase()] || null],
  ];
  for (const [label, rawValue, pattern] of contextualFacts) {
    if (rawValue && pattern && pattern.test(synthesisSearch)) matchedFacts.push(label);
  }

  const availableFacts = 2 + contextualFacts.filter(([, rawValue, pattern]) => rawValue && pattern).length;
  const requiredFacts = Math.min(4, availableFacts);
  if (matchedFacts.length < requiredFacts) {
    errors.push(`personnalisation: seulement ${matchedFacts.length}/${requiredFacts} faits du questionnaire repris dans la synthese`);
  }

  for (const peptide of report.peptides || []) {
    const rationale = String(peptide.whyThisPeptide || "").trim();
    const rationaleSearch = searchable(rationale);
    if (rationale.length < 120) {
      errors.push(`[${peptide.name || "?"}] personnalisation trop courte dans whyThisPeptide (${rationale.length} caracteres)`);
    }
    if (!/\b(?:tu|ton|ta|tes|chez toi|dans ton)\b/i.test(rationale)) {
      errors.push(`[${peptide.name || "?"}] whyThisPeptide ne parle pas directement au client`);
    }
    const rationaleFacts = [
      goalPattern?.test(rationaleSearch) ? "objectif" : "",
      weightPattern?.test(rationaleSearch) ? "poids" : "",
      ...contextualFacts
        .filter(([, rawValue, pattern]) => rawValue && pattern?.test(rationaleSearch))
        .map(([label]) => label),
    ].filter(Boolean);
    if (new Set(rationaleFacts).size < 2) {
      errors.push(`[${peptide.name || "?"}] whyThisPeptide relie moins de 2 faits concrets du questionnaire`);
    }
  }

  if (Number.isFinite(weightKg) && weightKg > 0) {
    const nutrition = (report.sections || []).find((section) =>
      /nutrition/i.test(`${section.id || ""} ${section.title || ""}`)
    );
    const nutritionText = String(nutrition?.content || "");
    const lowGrams = Math.round(weightKg * 1.8);
    const highGrams = Math.round(weightKg * 2.2);
    if (!/1[,.]8\s*(?:a|à|-)\s*2[,.]2\s*g\s*\/\s*kg\s*\/\s*jour/i.test(nutritionText)) {
      errors.push("nutrition personnalisee: repere 1,8 a 2,2 g/kg/jour absent");
    }
    const dailyTargetPattern = new RegExp(
      `\\b${lowGrams}\\s*(?:a|à|-)\\s*${highGrams}\\s*g\\s+de\\s+prot[ée]ines?\\s+par\\s+jour\\b`,
      "i"
    );
    if (!dailyTargetPattern.test(nutritionText)) {
      errors.push(`nutrition personnalisee: cible calculee ${lowGrams} a ${highGrams} g/jour absente pour ${weightKg} kg`);
    }
  }

  return errors;
}

function normalizeSentenceForRepetition(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function findRepeatedReportSentences(
  sections: Array<{ content?: string }>
): Array<{ sentence: string; count: number }> {
  const counts = new Map<string, { sentence: string; count: number }>();

  for (const section of sections) {
    const sentences = String(section.content || "")
      .split(/(?<=[.!?])\s+|\n{2,}/)
      .map((entry) => entry.trim())
      .filter((entry) => entry.length >= 60);

    for (const sentence of sentences) {
      const normalized = normalizeSentenceForRepetition(sentence);
      if (normalized.length < 50) continue;
      const previous = counts.get(normalized);
      counts.set(normalized, {
        sentence: previous?.sentence || sentence,
        count: (previous?.count || 0) + 1,
      });
    }
  }

  return [...counts.values()]
    .filter((entry) => entry.count >= 4)
    .sort((a, b) => b.count - a.count);
}

const OPERATIONAL_PEPTIDE_ALIASES: Array<{
  key: string;
  aliases: string[];
}> = [
  { key: "bpc157", aliases: ["bpc-157", "bpc157"] },
  { key: "tb500", aliases: ["tb-500", "tb500"] },
  { key: "cjc1295", aliases: ["cjc-1295", "cjc1295"] },
  { key: "ipamorelin", aliases: ["ipamorelin"] },
  { key: "retatrutide", aliases: ["retatrutide"] },
  { key: "mk677", aliases: ["mk-677", "mk677", "ibutamoren"] },
  { key: "epitalon", aliases: ["epitalon"] },
  { key: "ghkcu", aliases: ["ghk-cu", "ghkcu"] },
  { key: "semax", aliases: ["semax"] },
  { key: "selank", aliases: ["selank"] },
  { key: "dsip", aliases: ["dsip"] },
  { key: "melanotan", aliases: ["melanotan"] },
  { key: "hexarelin", aliases: ["hexarelin"] },
  { key: "tesamorelin", aliases: ["tesamorelin"] },
  { key: "sermorelin", aliases: ["sermorelin"] },
  { key: "semaglutide", aliases: ["semaglutide"] },
  { key: "tirzepatide", aliases: ["tirzepatide"] },
];

function normalizeOperationalText(value: unknown): string {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizedTextContains(haystack: string, needle: string): boolean {
  const normalizedHaystack = normalizeOperationalText(haystack);
  const normalizedNeedle = normalizeOperationalText(needle);
  return Boolean(normalizedNeedle) && normalizedHaystack.includes(normalizedNeedle);
}

function containsOperationalAlias(value: string, aliases: string[]): boolean {
  const paddedValue = ` ${normalizeOperationalText(value)} `;
  return aliases.some((alias) =>
    paddedValue.includes(` ${normalizeOperationalText(alias)} `)
  );
}

function aliasesForStructuredPeptide(name: string): string[] {
  const matchedAliases = OPERATIONAL_PEPTIDE_ALIASES
    .filter(({ aliases }) => containsOperationalAlias(name, aliases))
    .flatMap(({ aliases }) => aliases);
  return matchedAliases.length > 0 ? matchedAliases : [name];
}

export function findStructuredPeptideCoverageIssues(
  report: Pick<
    PeptidesReport,
    "peptides" | "sections" | "weeklySchedule" | "shoppingList"
  >
): string[] {
  const sections = report.sections || [];
  const rationaleText = sections
    .filter((section) =>
      /rationale|pourquoi|choix/i.test(`${section.id || ""} ${section.title || ""}`)
    )
    .map((section) => section.content || "")
    .join("\n");
  const reconstitutionText = sections
    .filter((section) =>
      /reconstitution/i.test(`${section.id || ""} ${section.title || ""}`)
    )
    .map((section) => section.content || "")
    .join("\n");
  const protocolSectionText = sections
    .filter((section) =>
      /protocole|semaine type|calendrier/i.test(
        `${section.id || ""} ${section.title || ""}`
      )
    )
    .map((section) => section.content || "")
    .join("\n");
  const protocolText = [
    String(report.weeklySchedule || ""),
    protocolSectionText,
  ].join("\n");
  const shoppingText = [
    String(report.shoppingList || ""),
    ...sections
      .filter((section) =>
        /shopping|liste de courses/i.test(
          `${section.id || ""} ${section.title || ""}`
        )
      )
      .map((section) => section.content || ""),
  ].join("\n");

  const issues: string[] = [];
  for (const peptide of report.peptides || []) {
    const name = String(peptide.name || "");
    const aliases = aliasesForStructuredPeptide(name);
    if (rationaleText && !containsOperationalAlias(rationaleText, aliases)) {
      issues.push(`${name}: absent de la justification`);
    }
    if (
      /^sc\b|sous[- ]?cutan/i.test(String(peptide.route || "")) &&
      reconstitutionText &&
      !containsOperationalAlias(reconstitutionText, aliases)
    ) {
      issues.push(`${name}: absent du guide de reconstitution`);
    }
    if (!containsOperationalAlias(protocolText, aliases)) {
      issues.push(`${name}: absent du calendrier operationnel`);
    }
    if (!containsOperationalAlias(shoppingText, aliases)) {
      issues.push(`${name}: absent de la liste de commande`);
    }
    if (
      protocolSectionText &&
      !normalizedTextContains(
        protocolSectionText,
        String(peptide.dosage || "")
      )
    ) {
      issues.push(`${name}: dosage de la fiche absent du protocole`);
    }
    if (
      protocolSectionText &&
      !normalizedTextContains(
        protocolSectionText,
        String(peptide.cycleDuration || "")
      )
    ) {
      issues.push(`${name}: duree de la fiche absente du protocole`);
    }
    if (
      reconstitutionText &&
      !normalizedTextContains(
        reconstitutionText,
        String(peptide.reconstitution || "")
      )
    ) {
      issues.push(`${name}: calcul de reconstitution non aligne sur la fiche`);
    }
  }
  return issues;
}

/**
 * Detects a peptide that is actively scheduled or ordered but missing from
 * report.peptides. Narrative-only mentions are deliberately ignored because
 * they can describe past use, a rejected option or a comparison.
 */
export function findOperationalPeptidesMissingFromArray(
  report: Pick<PeptidesReport, "peptides" | "weeklySchedule" | "shoppingList">
): string[] {
  const peptideNames = (report.peptides || []).map((peptide) =>
    String(peptide.name || "")
  );
  const coveredKeys = new Set(
    OPERATIONAL_PEPTIDE_ALIASES
      .filter(({ aliases }) =>
        peptideNames.some((name) => containsOperationalAlias(name, aliases))
      )
      .map(({ key }) => key)
  );

  const operationalSegments = [
    String(report.weeklySchedule || ""),
    String(report.shoppingList || ""),
  ]
    .flatMap((value) => value.split(/[\n|;]+/))
    .map((value) => value.trim())
    .filter(Boolean);

  const operationalSignal =
    /\b(?:dose|dosage|inject|injection|sous cutan|vial|vials|flacon|flacons|commande|commander|acheter|achat|matin|soir|coucher|lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)\b|\b\d+(?:[.,]\d+)?\s*(?:mcg|ug|mg|ml|iu|ui)\b|(?:x|×)\s*\d+\b/i;
  const exclusionSignal =
    /\b(?:ne\s+pas|pas\s+de|aucun|aucune|exclu|exclure|eviter|evite|arreter|arrete|stop|historique|ancien|ancienne|non\s+retenu|non\s+retenue)\b/i;

  return OPERATIONAL_PEPTIDE_ALIASES
    .filter(({ key, aliases }) => {
      if (coveredKeys.has(key)) return false;
      return operationalSegments.some((segment) => {
        if (!containsOperationalAlias(segment, aliases)) return false;
        const normalizedSegment = normalizeOperationalText(segment);
        return (
          operationalSignal.test(normalizedSegment) &&
          !exclusionSignal.test(normalizedSegment)
        );
      });
    })
    .map(({ key }) => key);
}

function extractFirstNumber(text: string | undefined): number | null {
  if (!text) return null;
  const m = text.match(/(\d+(?:[.,]\d+)?)/);
  if (!m) return null;
  return parseFloat(m[1].replace(",", "."));
}

export function hasCompleteConditionalReconstitution(
  reconstitution: string | undefined
): boolean {
  const text = String(reconstitution || "").replace(/(\d),(\d)/g, "$1.$2");
  const hasFormula =
    /concentration en mg\/ml\s*=/i.test(text)
    && /volume de dose\s*=/i.test(text)
    && /unites U-100\s*=/i.test(text);
  if (!hasFormula) return false;

  return [1, 2].every((solventMl) => {
    const scenario = text.match(
      new RegExp(
        `Si\\s+${solventMl}(?:\\.0+)?\\s*ml\\s+est\\s+confirm(?:e|ee|é|ée)\\s*:\\s*` +
        `[\\s\\S]{0,180}?concentration\\s+\\d+(?:\\.\\d+)?\\s*mg\\/ml\\s*;\\s*` +
        `pour\\s+\\d+(?:\\.\\d+)?\\s*(?:mcg|ug|µg|mg)\\s*,\\s*` +
        `volume\\s+\\d+(?:\\.\\d+)?\\s*ml\\s*,\\s*soit\\s+` +
        `\\d+(?:\\.\\d+)?\\s*unites?\\s+U-100`,
        "i"
      )
    );
    return Boolean(scenario);
  });
}

export function extractVialQty(vialsNeeded: string | undefined): number | null {
  if (!vialsNeeded) return null;
  const m = vialsNeeded.match(/(\d+)\s*vials?\b/i);
  return m ? parseInt(m[1], 10) : null;
}

export function extractVialMg(vialsNeeded: string | undefined): number | null {
  if (!vialsNeeded) return null;
  const m = vialsNeeded.match(/vials?\s*(?:de|of)?\s*(\d+(?:[.,]\d+)?)\s*mg\b/i);
  if (!m) return null;
  return parseFloat(m[1].replace(",", "."));
}

function extractPriceQty(priceEstimate: string | undefined): number | null {
  if (!priceEstimate) return null;
  const m = priceEstimate.match(/(?:[x×])\s*(\d+)\s*vials?\b/i);
  return m ? parseInt(m[1], 10) : null;
}

export function extractTotalMgFromVials(vialsNeeded: string | undefined): number | null {
  if (!vialsNeeded) return null;
  // Prefer the actual capacity (qty × vialMg) over the AI's "total ~Xmg"
  // claim, because the AI sometimes states a misleading "total" value (the
  // BUDGET needed) while the qty × mg gives the real ordered capacity.
  const qty = extractVialQty(vialsNeeded);
  const mg = extractVialMg(vialsNeeded);
  if (qty && mg) return qty * mg;
  const totalMatch = vialsNeeded.match(/total\s*[~≈]?\s*(\d+(?:[.,]\d+)?)\s*mg/i);
  if (totalMatch) return parseFloat(totalMatch[1].replace(",", "."));
  return null;
}

export function calculateBacWaterNeedMl(
  report: Pick<PeptidesReport, "peptides">
): number {
  return (report.peptides || []).reduce((totalMl, peptide) => {
    const solventMatch = String(peptide.reconstitution || "")
      .replace(/(\d),(\d)/g, "$1.$2")
      .match(/\+\s*(\d+(?:\.\d+)?)\s*ml\b/i);
    const solventPerVialMl = solventMatch ? Number(solventMatch[1]) : 0;
    const vialQty = extractVialQty(peptide.vialsNeeded) || 0;
    if (
      !Number.isFinite(solventPerVialMl) ||
      solventPerVialMl <= 0 ||
      vialQty <= 0
    ) {
      return totalMl;
    }
    return totalMl + solventPerVialMl * vialQty;
  }, 0);
}

export function estimateNeedMg(p: PeptidesPeptide): number | null {
  // Normalize French decimal commas so regex captures match.
  const dose = (p.dosage || "").replace(/(\d),(\d)/g, "$1.$2");
  const cycle = (p.cycleDuration || "").replace(/(\d),(\d)/g, "$1.$2");

  // Progressive weekly with range: "0.25 mg par semaine (semaines 1 a 4), puis 0.5 mg par semaine (semaines 5 a 8)"
  let weeksFromCycle = 0;
  const wkMatchEarly = cycle.match(/(\d+)\s*semaines?\b/i);
  if (wkMatchEarly) weeksFromCycle = parseInt(wkMatchEarly[1], 10);

  const rangeMatches = Array.from(
    dose.matchAll(/(\d+(?:\.\d+)?)\s*(mg|mcg|µg|ug)\s*par\s*semaine\s*\(\s*semaines?\s*(\d+)\s*(?:à|a|-)\s*(\d+)\s*\)/gi)
  );
  if (rangeMatches.length >= 2) {
    let totalMg = 0;
    let lastDose = 0;
    let lastEnd = 0;
    for (const m of rangeMatches) {
      const v = parseFloat(m[1]);
      const u = m[2].toLowerCase();
      const mgVal = u.startsWith("mg") ? v : v / 1000;
      const start = parseInt(m[3], 10);
      const end = parseInt(m[4], 10);
      const phaseWeeks = Math.max(0, end - start + 1);
      totalMg += mgVal * phaseWeeks;
      lastDose = mgVal;
      if (end > lastEnd) lastEnd = end;
    }
    if (weeksFromCycle > lastEnd && lastDose > 0) totalMg += lastDose * (weeksFromCycle - lastEnd);
    if (totalMg > 0) return totalMg;
  }

  let weeks = 0;
  let days = 0;
  const wkMatch = cycle.match(/(\d+)\s*semaines?\b/i);
  if (wkMatch) weeks = parseInt(wkMatch[1], 10);
  const dyMatch = cycle.match(/(\d+)\s*jours?\b/i);
  if (dyMatch) days = parseInt(dyMatch[1], 10);

  // Cure pattern (Epitalon-style): X mg/jour pendant N jours consecutifs.
  const consecutiveDays =
    /(\d+)\s*jours?\s*cons[ée]cutifs?/i.exec(dose) ||
    /(\d+)\s*jours?\s*cons[ée]cutifs?/i.exec(cycle);
  if (consecutiveDays) {
    const cureDays = parseInt(consecutiveDays[1], 10);
    const perDayMatch = dose.match(/(\d+(?:[.,]\d+)?)\s*(mg|mcg|µg|ug)\s*(?:par|\/)\s*jour/i);
    if (perDayMatch) {
      const v = parseFloat(perDayMatch[1].replace(",", "."));
      const u = perDayMatch[2].toLowerCase();
      const dpd = u.startsWith("mg") ? v : v / 1000;
      return dpd * cureDays;
    }
  }

  // Frequency detection ahead of titration: titration steps express
  // PER-INJECTION doses, not weekly totals, so we need the frequency to
  // scale correctly. "150 mcg semaine 1, 200 mcg semaine 2" combined with
  // "300 mcg par injection le soir" = daily injections, scale ×7.
  const detectInjPerWeek = (txt: string): number => {
    if (/\b1\s*(?:fois|injection)\s*(?:par|\/)\s*semaine|hebdomadaire|1x\/sem\b/i.test(txt)) return 1;
    if (/\b2\s*(?:fois|injections?|jours?)\s*(?:par|\/)\s*semaine/i.test(txt)) return 2;
    if (/\b3\s*(?:fois|injections?|jours?|soirs?)\s*(?:par|\/)\s*semaine/i.test(txt)) return 3;
    if (/\b4\s*(?:fois|injections?|jours?|soirs?)\s*(?:par|\/)\s*semaine/i.test(txt)) return 4;
    if (/\b5\s*(?:fois|injections?|jours?|soirs?)\s*(?:par|\/)\s*semaine/i.test(txt)) return 5;
    if (/\b6\s*(?:fois|injections?|jours?|soirs?)\s*(?:par|\/)\s*semaine/i.test(txt)) return 6;
    if (/chaque\s+(?:soir|matin|jour)|tous\s+les\s+(?:soirs?|jours?)|\bpar\s+(?:injection|jour|soir)\b|\ble\s+soir\b|\bavant\s+le\s+coucher\b|7\s*(?:jours?|soirs?)\s*\/?\s*7|\b1x\/jour\b/i.test(txt)) return 7;
    return 1;
  };
  const injectionsPerWeekTit = detectInjPerWeek(dose);

  // Reverse titration syntax used by natural French:
  // "semaine 1 a 1 mg, semaine 2 a 2 mg, semaines 4 a 12 a 8 mg".
  // The previous estimator only understood "1 mg semaine 1" and silently
  // accepted severe under-orders such as 20 mg for a real 79 mg cycle.
  const reverseProgressive = Array.from(
    dose.matchAll(/semaines?\s*(\d+)(?:\s*(?:à|a|-)\s*(\d+))?\s*(?:à|a|:)\s*(\d+(?:[.,]\d+)?)\s*(mg|mcg|µg|ug)\b/gi)
  );
  if (reverseProgressive.length >= 2 && weeks > 0) {
    const dosesByWeek = new Map<number, number>();
    for (const match of reverseProgressive) {
      const start = parseInt(match[1], 10);
      const end = match[2] ? parseInt(match[2], 10) : start;
      const rawValue = parseFloat(match[3].replace(",", "."));
      const unit = match[4].toLowerCase();
      const valueMg = unit.startsWith("mg") ? rawValue : rawValue / 1000;
      for (let week = start; week <= Math.min(end, weeks); week++) {
        dosesByWeek.set(week, valueMg);
      }
    }
    const definedWeeks = [...dosesByWeek.keys()].sort((a, b) => a - b);
    if (definedWeeks.length > 0) {
      let lastDose = dosesByWeek.get(definedWeeks[0]) || 0;
      let totalMg = 0;
      for (let week = 1; week <= weeks; week++) {
        if (dosesByWeek.has(week)) lastDose = dosesByWeek.get(week) || lastDose;
        totalMg += lastDose;
      }
      totalMg *= injectionsPerWeekTit;
      if (totalMg > 0) return totalMg;
    }
  }

  // Titration / progressive: take the steady-state dose × steady-state weeks.
  // Regex accepts plural "semaines": "8mg semaines 4 à 12" used to fall
  // through, causing Simon Leveque's Retatrutide 79mg need to be calculated
  // as 43mg (5 vials ordered, but 8 needed).
  const progressive = Array.from(
    dose.matchAll(/(\d+(?:[.,]\d+)?)\s*(mg|mcg)\s*sem(?:aine)?s?\s*(\d+)/gi)
  );
  if (progressive.length >= 2 && weeks > 0) {
    const dosesByWeek = new Map<number, number>();
    for (const m of progressive) {
      const v = parseFloat(m[1].replace(",", "."));
      const u = m[2].toLowerCase();
      const w = parseInt(m[3], 10);
      dosesByWeek.set(w, u.startsWith("mcg") ? v / 1000 : v);
    }
    const sortedWeeks = [...dosesByWeek.keys()].sort((a, b) => a - b);
    const lastDefined = sortedWeeks[sortedWeeks.length - 1];
    const lastDose = dosesByWeek.get(lastDefined)!;
    let total = 0;
    for (let w = 1; w <= weeks; w++) {
      if (dosesByWeek.has(w)) total += dosesByWeek.get(w)!;
      else if (w > lastDefined) total += lastDose;
    }
    // Apply injection frequency multiplier: titration steps are per-injection,
    // so daily protocols multiply by 7.
    total = total * injectionsPerWeekTit;
    if (total > 0) return total;
  }

  // Frequency-based estimation (per-week pattern).
  // We extract the dose VALUE robustly: prefer "per injection" / "par jour" / "par semaine"
  // matches. Fallback to "first number with unit", but skip values that obviously refer to
  // body weight ("X kg") or to mcg/kg context.
  const valueMatch =
    dose.match(/(\d+(?:[.,]\d+)?)\s*(mg|mcg|µg|ug)\s*par\s*(administration|injection|jour|semaine)/i) ||
    dose.match(/(\d+(?:[.,]\d+)?)\s*(mg|mcg|µg|ug)\b(?!\s*\/\s*kg)/i);
  if (!valueMatch) return null;
  const doseVal = parseFloat(valueMatch[1].replace(",", "."));
  const isMcg = /^(mcg|µg|ug)/i.test(valueMatch[2]);
  const doseMg = isMcg ? doseVal / 1000 : doseVal;
  if (doseMg <= 0) return null;

  let perWeek = 0;
  const everyDay = /chaque jour|chaque soir|tous les jours|\b7\s*(?:soirs?|jours?)\s*\/?\s*7|\b1x\/jour\b|par jour\b|au coucher\b/i.test(dose);
  const fivePerWeek = /\b5\s*(?:soirs?|jours?|fois)\s*(?:par|\/)\s*semaine/i.test(dose);
  const fourPerWeek = /\b4\s*(?:soirs?|jours?|fois)\s*(?:par|\/)\s*semaine/i.test(dose);
  const threePerWeek = /\b3\s*(?:fois|soirs?|jours?|injections?)\s*(?:par|\/)\s*semaine/i.test(dose);
  const twoPerWeek = /\b2\s*(?:fois|soirs?|jours?|injections?)\s*(?:par|\/)\s*semaine/i.test(dose);
  const oncePerWeek = /(?:\b1\s*|\bune\s+)(?:fois|injection)\s*(?:par|\/)\s*semaine|hebdomadaire|chaque\s+semaine|1x\/sem/i.test(dose);
  const barePerWeek = /\bpar\s+semaine\b/i.test(dose);

  if (fivePerWeek) perWeek = 5;
  else if (fourPerWeek) perWeek = 4;
  else if (threePerWeek) perWeek = 3;
  else if (twoPerWeek) perWeek = 2;
  else if (oncePerWeek) perWeek = 1;
  else if (barePerWeek) perWeek = 1;
  else if (everyDay) perWeek = 7;
  else return null;

  if (!weeks && days) weeks = Math.ceil(days / 7);
  if (!weeks) return null;

  // A value explicitly stated "par semaine" is already the weekly total.
  // Do not multiply it again by a separate frequency phrase in the prose.
  const cadence = String(valueMatch[3] || "").toLowerCase();
  const total = doseMg * (cadence === "semaine" ? 1 : perWeek) * weeks;
  return total >= 0.5 ? total : null;
}

function checkPeptide(p: PeptidesPeptide): string[] {
  const issues: string[] = [];

  for (const fld of REQUIRED_PEPTIDE_FIELDS) {
    const v = (p as any)[fld];
    if (!v || (typeof v === "string" && v.trim().length === 0)) {
      issues.push(`field manquant: ${fld}`);
    }
  }

  const isEnclomiphene = /\benclomiph[eè]ne(?:\s+citrate)?\b/i.test(p.name || "");
  if (isEnclomiphene) {
    if (p.purchaseUrl !== ENCLOMIPHENE_SOURCE_URL) {
      issues.push(`source Enclomiphene invalide: ${p.purchaseUrl}`);
    }
  } else if (!p.purchaseUrl?.toLowerCase().includes("peptaura.com")) {
    issues.push(`purchaseUrl pas Peptaura: ${p.purchaseUrl}`);
  }

  const vialsQty = extractVialQty(p.vialsNeeded);
  const priceQty = extractPriceQty(p.priceEstimate);
  if (vialsQty != null && priceQty != null && vialsQty !== priceQty) {
    const ratio = Math.max(vialsQty, priceQty) / Math.min(vialsQty, priceQty);
    if (ratio > 1.35) {
      issues.push(
        `vialsNeeded qty (${vialsQty}) vs priceEstimate qty (${priceQty}) divergent (ratio ${ratio.toFixed(2)})`
      );
    }
  }

  const totalMgOrdered = extractTotalMgFromVials(p.vialsNeeded);
  const needMg = estimateNeedMg(p);
  if (totalMgOrdered != null && needMg != null && needMg > 0) {
    const overshoot = totalMgOrdered / needMg;
    // Incompressible-minimum exception: when one vial of the smallest
    // available format already exceeds the cycle need (e.g. GHK-Cu sold only
    // as 50mg vials but the protocol calls for 8mg), there is nothing the
    // recommendation can do to lower the order. Flagging it as "surcommande"
    // is a false positive (Farhan 2026-06-10 GHK-Cu 50mg vs 8mg, x6.3).
    const orderedVialCount = extractVialQty(p.vialsNeeded);
    const orderedVialMg = extractVialMg(p.vialsNeeded);
    const isSingleVialFloor =
      orderedVialCount === 1 &&
      orderedVialMg != null &&
      orderedVialMg > 0 &&
      orderedVialMg >= needMg;
    const documentedOperationalOrder =
      p._vialPlanning?.status === "documented" &&
      p._vialPlanning?.operationalVials === orderedVialCount &&
      Number(p._vialPlanning?.stabilityDays || 0) > 0 &&
      String(p._vialPlanning?.stabilitySource || "").length >= 8;
    if (overshoot > 2.5 && !isSingleVialFloor && !documentedOperationalOrder) {
      issues.push(
        `surcommande detectee: ${totalMgOrdered}mg commandes vs ${needMg.toFixed(1)}mg besoin (x${overshoot.toFixed(1)})`
      );
    }
    // Skip sous-commande when the cycle duration is a range like "8 à 12 semaines":
    // the AI legitimately sizes for the lower bound. Only flag a HARD undershoot
    // (< 60% of estimator's need) to avoid noisy false positives.
    const cycleHasRange = /(\d+)\s*(?:à|a|-)\s*(\d+)\s*semaines?/i.test(p.cycleDuration || "");
    if (!cycleHasRange && overshoot < 0.6) {
      issues.push(
        `sous-commande detectee: ${totalMgOrdered}mg commandes vs ${needMg.toFixed(1)}mg besoin (${(overshoot * 100).toFixed(0)}%)`
      );
    }
  }

  if (p.purchaseUrl && !/^https?:\/\//.test(p.purchaseUrl)) {
    issues.push(`purchaseUrl mal formee: ${p.purchaseUrl}`);
  }

  if (/descente|diminution progressive|reduction progressive/i.test(p.cycleDuration || "")
    && !/descente|diminu|reduction|réduction|baisse/i.test(p.dosage || "")) {
    issues.push("cycleDuration annonce une descente progressive absente du dosage");
  }
  if (/\b1\s+vials\b/i.test(`${p.vialsNeeded || ""} ${p.priceEstimate || ""}`)) {
    issues.push("grammaire quantite invalide: 1 vials");
  }
  if (/reconstitution et (?:les )?unit[ée]s?.{0,80}(?:suspend|bloqu)|aucune offre live exploitable.{0,120}reconstitution/i.test(p.reconstitution || "")) {
    issues.push("reconstitution et unites U-100 non resolues");
  }
  if (/Peptaura ne publie pas le volume de solvant/i.test(p.reconstitution || "")) {
    if (!hasCompleteConditionalReconstitution(p.reconstitution)) {
      issues.push("calcul conditionnel de reconstitution incomplet");
    }
  }
  for (const [field, value] of [
    ["dosage", p.dosage],
    ["timing", p.timing],
    ["cycleDuration", p.cycleDuration],
    ["reconstitution", p.reconstitution],
    ["vialsNeeded", p.vialsNeeded],
    ["priceEstimate", p.priceEstimate],
  ] as const) {
    const text = String(value || "");
    const opening = (text.match(/\(/g) || []).length;
    const closing = (text.match(/\)/g) || []).length;
    if (opening !== closing) {
      issues.push(`${field} contient des parentheses desequilibrees`);
    }
  }

  return issues;
}

function validateConfirmedLowTestosteroneProtocol(
  report: PeptidesReport,
  clientFacingText: string
): string[] {
  if (report._validationContext?.confirmedLowTestosterone !== true) return [];

  const errors: string[] = [];
  const peptides = report.peptides || [];
  const enclomiphene = peptides.find((peptide) =>
    /\benclomiph[eè]ne(?:\s+citrate)?\b/i.test(peptide.name || "")
  );
  const kisspeptin = peptides.find((peptide) =>
    /\bkisspeptin[\s-]*10\b/i.test(peptide.name || "")
  );

  if (!enclomiphene) errors.push("testo basse confirmee: Enclomiphene obligatoire absent");
  if (!kisspeptin) errors.push("testo basse confirmee: KissPeptin-10 obligatoire absent");

  for (const [label, peptide, pattern] of [
    ["Enclomiphene", enclomiphene, /\benclomiph[eè]ne(?:\s+citrate)?\b/i],
    ["KissPeptin-10", kisspeptin, /\bkisspeptin[\s-]*10\b/i],
  ] as const) {
    if (!peptide) continue;
    if (String(peptide.whyThisPeptide || "").trim().length < 80) {
      errors.push(`testo basse confirmee: explication trop courte pour ${label}`);
    }
    if (!pattern.test(report.weeklySchedule || "")) {
      errors.push(`testo basse confirmee: ${label} absent de la semaine type`);
    }
    if (!pattern.test(report.shoppingList || "")) {
      errors.push(`testo basse confirmee: ${label} absent de la liste de commande`);
    }
    const narrativeMentions = (report.sections || []).filter((section) =>
      pattern.test(`${section.title || ""} ${section.content || ""}`)
    ).length;
    if (narrativeMentions < 2) {
      errors.push(`testo basse confirmee: ${label} insuffisamment explique dans les sections`);
    }
  }

  if (enclomiphene) {
    if (enclomiphene.purchaseUrl !== ENCLOMIPHENE_SOURCE_URL) {
      errors.push("testo basse confirmee: URL ReceptorChem Enclomiphene incorrecte");
    }
    if (!/orale?|buccale?/i.test(enclomiphene.route || "")) {
      errors.push("testo basse confirmee: voie orale Enclomiphene absente");
    }
    if (!/aucune reconstitution|sans reconstitution|solution liquide/i.test(enclomiphene.reconstitution || "")) {
      errors.push("testo basse confirmee: format liquide Enclomiphene mal decrit");
    }
  }

  if (kisspeptin && !/peptaura\.com\/catalog\/KissPeptin-10/i.test(kisspeptin.purchaseUrl || "")) {
    errors.push("testo basse confirmee: URL Peptaura KissPeptin-10 incorrecte");
  }

  const source = report._enclomipheneSourceSync;
  const sourceFetchedAt = new Date(String(source?.fetchedAt || "")).getTime();
  if (!source || source.available !== true || source.url !== ENCLOMIPHENE_SOURCE_URL) {
    errors.push("testo basse confirmee: source ReceptorChem non validee en direct");
  } else if (!Number.isFinite(sourceFetchedAt)
    || Date.now() - sourceFetchedAt > MAX_PEPTAURA_DELIVERY_AGE_MS) {
    errors.push("testo basse confirmee: verification ReceptorChem trop ancienne");
  }
  if (!/30\s*ml[\s\S]*12[,.]5\s*mg\s*\/\s*ml/i.test(source?.format || "")) {
    errors.push("testo basse confirmee: format ReceptorChem inattendu");
  }
  if (!Number.isFinite(source?.priceGbp) || Number(source?.priceGbp) <= 0) {
    errors.push("testo basse confirmee: prix ReceptorChem non verifie");
  }

  const normalizedMarkers = (report.bloodMarkers || [])
    .join(" ")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  for (const [label, pattern] of [
    ["testosterone totale", /testosterone\s+totale/],
    ["testosterone libre", /testosterone\s+libre/],
    ["LH", /\blh\b/],
    ["FSH", /\bfsh\b/],
    ["E2", /\b(?:e2|estradiol)\b/],
    ["SHBG", /\bshbg\b/],
    ["prolactine", /\bprolactine\b/],
  ] as const) {
    if (!pattern.test(normalizedMarkers)) {
      errors.push(`testo basse confirmee: marqueur de suivi absent, ${label}`);
    }
  }

  if (/\b(?:Androtardyl|Andractim)\b/i.test(clientFacingText)) {
    errors.push("testo basse confirmee: confusion androgenes et Enclomiphene interdite");
  }

  return errors;
}

export function validatePeptidesReport(report: PeptidesReport | null | undefined): PeptidesValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  const peptidesChecked: Array<{ name: string; issues: string[] }> = [];

  if (!report || typeof report !== "object") {
    errors.push("rapport vide ou invalide");
    return {
      ok: false,
      errors,
      warnings,
      details: { peptideCount: 0, sectionCount: 0, totalChars: 0, peptidesChecked: [] },
    };
  }

  const peptides = report.peptides || [];
  const sections = report.sections || [];
  const totalChars = sections.reduce((s, sec) => s + (sec.content?.length || 0), 0);
  const clientFacingText = collectClientFacingStrings(report).join("\n");
  const styleAudit = auditClientFacingText(clientFacingText);

  if (styleAudit.forbiddenDashes > 0) {
    errors.push(`ponctuation Unicode interdite: ${styleAudit.forbiddenDashes} occurrence(s)`);
  }
  if (styleAudit.vouvoiement.length > 0) {
    errors.push(`vouvoiement interdit: ${styleAudit.vouvoiement.join(", ")}`);
  }
  if (styleAudit.roboticPhrases.length > 0) {
    errors.push(`style artificiel detecte: ${styleAudit.roboticPhrases.join(", ")}`);
  }

  const repeatedSentences = findRepeatedReportSentences(sections);
  if (repeatedSentences.length > 0) {
    const examples = repeatedSentences
      .slice(0, 3)
      .map((entry) => `${entry.count}x "${entry.sentence.slice(0, 100)}"`)
      .join(" | ");
    errors.push(`phrases repetees detectees, rendu artificiel: ${examples}`);
  }

  if (report.qualityVersion === "expert-standard-v1") {
    const medicalMentions = (clientFacingText.match(/\b(?:m[ée]decin|pharmacien|professionnel de sant[ée])\b/gi) || []).length;
    const cautionMentions = (clientFacingText.match(/\b(?:exp[ée]rimental|non approuv[ée]|validation m[ée]dicale|avis m[ée]dical|accord m[ée]dical)\b/gi) || []).length;
    if (medicalMentions > 8 || cautionMentions > 10) {
      errors.push(
        `surcouche medicale excessive pour un rapport standard: ${medicalMentions} renvois professionnels, ${cautionMentions} warnings`
      );
    }
    const coverageIssues = findStructuredPeptideCoverageIssues(report);
    if (coverageIssues.length > 0) {
      errors.push(
        `coherence cartes/sections incomplete: ${coverageIssues.join(" | ")}`
      );
    }
  }

  if (
    String(report.tier || "").toLowerCase() === "solo" &&
    /(?:\b(?:1|2|un|deux)\s+cr[ée]dits?\s+Blood Analysis\b|\b(?:premier|deuxi[èe]me)\s+cr[ée]dit\s+Blood Analysis\b)/i.test(
      clientFacingText
    )
  ) {
    errors.push("offre Solo: faux credit Blood Analysis annonce");
  }
  if (/\bapexlabs\.(?:fr|com)\b/i.test(clientFacingText)) {
    errors.push("ancien domaine Blood Analysis interdit: apexlabs.fr ou apexlabs.com");
  }
  if (/\[(?:dose|dosage|peptide|timing)[^\]]*\]/i.test(clientFacingText)) {
    errors.push("placeholder operationnel non resolu");
  }
  if (
    /\[(?:x+|nom|description|fournisseur|raison|r[ée]ponse|liste|marqueurs?|prix|total|duree|objectif|si pertinent|si applicable)[^\]]*\]/i.test(
      clientFacingText
    )
    || /\b(?:a completer|placeholder|insere ici|remplir ici)\b/i.test(clientFacingText)
  ) {
    errors.push("placeholder generique non resolu");
  }
  if (/\b(?:valeur|dose exacte)\s+indiqu[ée]e\s+dans la fiche\b/i.test(clientFacingText)) {
    errors.push("consigne operationnelle vague non resolue");
  }
  if (/\b\d+\s*(?:[àa]|-)\s*\d+\s+jours ouvr[ée]s\b/i.test(clientFacingText)) {
    errors.push("promesse de delai fournisseur interdite");
  }
  if (
    /commence [àa] \d+\s*% de la dose cible[^.]*premi[èe]re semaine|reste au palier pr[ée]c[ée]dent[^.]*avant de monter|cycle court de \d+\s*[àa-]\s*\d+ semaines [àa] dose r[ée]duite est possible/i.test(
      clientFacingText
    )
  ) {
    errors.push("ajustement de dose contradictoire hors fiche");
  }

  const verificationAction = "(?:valid(?:e|er|ation)|v[ée]rifi(?:e|er|cation)|avis|accord|confirm(?:e|er|ation))";
  const hasMedicalVerification = new RegExp(
    `\\b(?:m[ée]decin|pharmacien)\\b[\\s\\S]{0,180}\\b${verificationAction}\\b|\\b${verificationAction}\\b[\\s\\S]{0,180}\\b(?:m[ée]decin|pharmacien)\\b`,
    "i"
  ).test(clientFacingText);
  if (report.qualityVersion === "medical-review-v1" && !hasMedicalVerification) {
    errors.push("warning de verification medecin ou pharmacien manquant");
  }
  if (
    report.qualityVersion === "expert-standard-v1" &&
    report._validationContext?.consentAccepted === true &&
    !/contenu [ée]ducatif|ne remplace pas (?:un )?(?:diagnostic|avis m[ée]dical|ordonnance)/i.test(clientFacingText)
  ) {
    errors.push("disclaimer legal court manquant pour le protocole standard");
  }
  if (
    report.qualityVersion === "expert-standard-v1" &&
    /(?:sans validation[^.]{0,80}tu ne commences pas|projet de protocole [àa] faire valider|s['’]il manque une seule case[^.]{0,60}tu ne commences pas)/i.test(clientFacingText)
  ) {
    errors.push("gate medical bloquant reintroduit dans un protocole standard consenti");
  }
  const hasExperimentalPeptide = (report.peptides || []).some((peptide) =>
    /\b(?:retatrutide|bpc[\s-]?157|tb[\s-]?500|ipamorelin|cjc[\s-]?1295|dsip|epitalon)\b/i.test(peptide.name || "")
  );
  if (hasExperimentalPeptide
    && !/\b(?:experimental|non approuv[ée]|donn[ée]es humaines.{0,40}limit[ée]es|produit de recherche)\b/i.test(clientFacingText)) {
    errors.push("statut experimental ou non approuve absent pour le stack propose");
  }

  errors.push(...validateReportPersonalization(report));

  if (peptides.length === 0) {
    errors.push("aucun peptide recommande");
  }
  if (peptides.length < 2) {
    warnings.push(`tres peu de peptides (${peptides.length})`);
  }

  errors.push(...validateConfirmedLowTestosteroneProtocol(report, clientFacingText));

  if (sections.length < MIN_SECTIONS) {
    errors.push(`sections insuffisantes: ${sections.length} < ${MIN_SECTIONS}`);
  }
  if (totalChars < MIN_TOTAL_CHARS) {
    errors.push(`contenu trop court: ${totalChars} chars < ${MIN_TOTAL_CHARS}`);
  }

  for (let i = 0; i < sections.length; i++) {
    const s = sections[i];
    const c = (s.content || "").trim();
    const title = s.title || `section[${i}]`;
    if (!c) {
      errors.push(`section vide: ${title}`);
    } else if (c.length < MIN_SECTION_CHARS) {
      errors.push(`section trop courte (${c.length}): ${title}`);
    }
    if (/\{\{[^}]+\}\}|\$\{[^}]+\}/.test(c)) {
      errors.push(`template non resolu dans ${title}`);
    }
    if (/^\s*>\s/m.test(c)) {
      errors.push(`blockquote interdit dans ${title}`);
    }
    if (/\b(ChatGPT|Claude|GPT-?\d|Anthropic|OpenAI|LLM|intelligence artificielle|algorithme)\b/i.test(c)) {
      errors.push(`mention IA/algo interdite dans ${title}`);
    }
    if (!/[.!?:)»\]\s]$/.test(c)) {
      warnings.push(`pas de ponctuation finale dans ${title}`);
    }
  }

  for (const p of peptides) {
    const issues = checkPeptide(p);
    peptidesChecked.push({ name: p.name || "?", issues });
    for (const iss of issues) {
      errors.push(`[${p.name || "?"}] ${iss}`);
    }
  }

  const liveSync = report._peptauraLiveSync;
  if (!liveSync?.syncedAt) {
    errors.push("preuve de synchronisation Peptaura manquante");
  } else {
    const syncedAtMs = new Date(liveSync.syncedAt).getTime();
    const ageMs = Date.now() - syncedAtMs;
    if (!Number.isFinite(syncedAtMs)) {
      errors.push("horodatage Peptaura invalide");
    } else if (ageMs > MAX_PEPTAURA_DELIVERY_AGE_MS) {
      errors.push(`catalogue Peptaura trop ancien pour livraison: ${Math.round(ageMs / 60000)} min`);
    }
  }
  if (!liveSync?.catalogRefreshedAt) {
    errors.push("horodatage du crawl catalogue Peptaura manquant");
  } else {
    const catalogAtMs = new Date(liveSync.catalogRefreshedAt).getTime();
    const ageMs = Date.now() - catalogAtMs;
    if (!Number.isFinite(catalogAtMs)) {
      errors.push("horodatage du crawl catalogue Peptaura invalide");
    } else if (ageMs > MAX_PEPTAURA_DELIVERY_AGE_MS) {
      errors.push(`crawl catalogue Peptaura trop ancien: ${Math.round(ageMs / 60000)} min`);
    }
  }
  if (liveSync?.shippingLive !== true) {
    errors.push("verification live des fournisseurs par pays indisponible");
  }
  if ((liveSync?.failures || []).length > 0) {
    errors.push(`echecs de verification Peptaura: ${(liveSync?.failures || []).join(" | ")}`);
  }
  const appliedNames = new Set(
    (liveSync?.listingSnapshots || [])
      .map((entry) => String(entry.peptide || "").toLowerCase())
      .filter(Boolean)
  );
  if (peptides.length > 0 && appliedNames.size < peptides.length) {
    errors.push(`prix live incomplets: ${appliedNames.size}/${peptides.length} peptides verifies`);
  }
  for (const snapshot of liveSync?.listingSnapshots || []) {
    const fetchedAtMs = new Date(String(snapshot.fetchedAt || "")).getTime();
    if (!Number.isFinite(fetchedAtMs)
      || Date.now() - fetchedAtMs > MAX_PEPTAURA_DELIVERY_AGE_MS) {
      errors.push(`offre Peptaura trop ancienne ou invalide: ${snapshot.peptide || "?"}`);
    }
    const peptide = peptides.find((entry) =>
      String(entry.name || "").toLowerCase() === String(snapshot.peptide || "").toLowerCase()
    );
    const declaredQty = extractVialQty(peptide?.vialsNeeded);
    if (declaredQty != null && snapshot.requestedVials != null && declaredQty !== snapshot.requestedVials) {
      errors.push(`[${snapshot.peptide || "?"}] quantite prix live ${snapshot.requestedVials} differente de vialsNeeded ${declaredQty}`);
    }
    const declaredPriceTotal = String(peptide?.priceEstimate || "")
      .match(/\btotal\s*([$£])(\d+(?:[.,]\d+)?)/i);
    const declaredPrice = declaredPriceTotal
      ? Number(declaredPriceTotal[2].replace(",", "."))
      : null;
    const declaredCurrency = declaredPriceTotal?.[1];
    const livePrice = declaredCurrency === "£"
      ? Number(snapshot.totalPriceGbp)
      : Number(snapshot.totalPriceUsd);
    if (declaredPrice == null || !Number.isFinite(declaredPrice)) {
      errors.push(`[${snapshot.peptide || "?"}] total prix absent de priceEstimate`);
    } else if (Number.isFinite(livePrice) && Math.abs(declaredPrice - livePrice) > 0.01) {
      errors.push(`[${snapshot.peptide || "?"}] total prix affiche ${declaredCurrency}${declaredPrice.toFixed(2)} different du live ${declaredCurrency}${livePrice.toFixed(2)}`);
    }
    const needMg = Number(snapshot.needMg);
    const deliveredMg = Number(snapshot.deliveredMg);
    if (Number.isFinite(needMg) && Number.isFinite(deliveredMg) && deliveredMg + 1e-9 < needMg) {
      errors.push(`[${snapshot.peptide || "?"}] quantite livree ${deliveredMg} mg inferieure au besoin ${needMg} mg`);
    }
    if (snapshot.deliveredVials != null
      && snapshot.requestedVials != null
      && snapshot.deliveredVials / snapshot.requestedVials > 1.2) {
      errors.push(`[${snapshot.peptide || "?"}] boite live impose trop de surstock: ${snapshot.deliveredVials} recus pour ${snapshot.requestedVials} demandes`);
    }
  }

  const weeklySection = sections.find(
    (s) => /semaine type|protocole pratique|semaine\s+type/i.test(s.title || "")
  );
  if (weeklySection) {
    const c = weeklySection.content || "";
    const daysFound = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"]
      .filter((d) => new RegExp(`\\b${d}\\b`, "i").test(c)).length;
    const everyDayPattern = /chaque\s+(matin|soir|jour)|tous\s+les\s+jours|7\s*(?:jours?|soirs?)\s*\/?\s*7/i.test(c);

    // Compute max injection frequency across the stack to know whether a
    // sparsely-named-week is legitimate. Low-frequency stacks (GHK-Cu 1x/sem,
    // TB-500 2x/sem) naturally list only 2-4 weekdays in the practical-week
    // section; flagging that as "incomplete" was a false positive on Farhan
    // 2026-06-10 (3 named days, all peptides ≤2x/sem).
    const maxFreqPerWeek = peptides.reduce((max, p) => {
      const txt = `${p.dosage || ""} ${p.timing || ""}`;
      if (/chaque jour|tous les jours|7\s*(?:jours?|soirs?)\s*\/?\s*7|\b1x\/jour\b|par jour\b/i.test(txt)) return Math.max(max, 7);
      const m = txt.match(/(\d)\s*(?:fois|injections?|jours?|soirs?)\s*(?:par|\/)\s*semaine/i);
      if (m) return Math.max(max, parseInt(m[1], 10));
      return max;
    }, 0);
    const hasRestDayMention = /repos|off|pause|aucune\s+injection|hors\s+protocole/i.test(c);
    const sparseWeekIsLegit = maxFreqPerWeek > 0 && maxFreqPerWeek <= 4 && daysFound >= maxFreqPerWeek;

    if (everyDayPattern || sparseWeekIsLegit) {
      // OK, nothing to flag.
    } else if (daysFound < 3) {
      errors.push(`semaine type incomplete: ${daysFound}/7 jours nommes (max freq stack = ${maxFreqPerWeek}/sem)`);
    } else if (daysFound < 5 && !hasRestDayMention) {
      // Weak signal, keep as a warning so admins see it but delivery is not blocked.
      warnings.push(`semaine type peu detaillee: ${daysFound}/7 jours, pas de mention repos explicite`);
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    details: {
      peptideCount: peptides.length,
      sectionCount: sections.length,
      totalChars,
      peptidesChecked,
    },
  };
}
