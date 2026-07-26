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
] as const;

const MIN_SECTIONS = 12;
const MIN_SECTION_CHARS = 350;
const MIN_TOTAL_CHARS = 30_000;
const MAX_PEPTAURA_DELIVERY_AGE_MS = Number(
  process.env.PEPTAURA_DELIVERY_MAX_AGE_MS || 45 * 60 * 1000
);

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
  const protocolText = [
    String(report.weeklySchedule || ""),
    ...sections
      .filter((section) =>
        /protocole|semaine type|calendrier/i.test(
          `${section.id || ""} ${section.title || ""}`
        )
      )
      .map((section) => section.content || ""),
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
    dose.match(/(\d+(?:[.,]\d+)?)\s*(mg|mcg|µg|ug)\s*(?:par\s*(?:injection|jour|semaine))/i) ||
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
  const oncePerWeek = /\b1\s*(?:fois|injection)\s*(?:par|\/)\s*semaine|hebdomadaire|1x\/sem/i.test(dose);

  if (fivePerWeek) perWeek = 5;
  else if (fourPerWeek) perWeek = 4;
  else if (threePerWeek) perWeek = 3;
  else if (twoPerWeek) perWeek = 2;
  else if (oncePerWeek) perWeek = 1;
  else if (everyDay) perWeek = 7;
  else return null;

  if (!weeks && days) weeks = Math.ceil(days / 7);
  if (!weeks) return null;

  const total = doseMg * perWeek * weeks;
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

  if (!p.purchaseUrl?.toLowerCase().includes("peptaura.com")) {
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
    if (overshoot > 2.5 && !isSingleVialFloor) {
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
    if (medicalMentions > 22 || cautionMentions > 28) {
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

  const verificationAction = "(?:valid(?:e|er|ation)|v[ée]rifi(?:e|er|cation)|avis|accord|confirm(?:e|er|ation))";
  const hasMedicalVerification = new RegExp(
    `\\b(?:m[ée]decin|pharmacien)\\b[\\s\\S]{0,180}\\b${verificationAction}\\b|\\b${verificationAction}\\b[\\s\\S]{0,180}\\b(?:m[ée]decin|pharmacien)\\b`,
    "i"
  ).test(clientFacingText);
  if (!hasMedicalVerification) {
    errors.push("warning de verification medecin ou pharmacien manquant");
  }
  const hasExperimentalPeptide = (report.peptides || []).some((peptide) =>
    /\b(?:retatrutide|bpc[\s-]?157|tb[\s-]?500|ipamorelin|cjc[\s-]?1295|dsip|epitalon)\b/i.test(peptide.name || "")
  );
  if (hasExperimentalPeptide
    && !/\b(?:experimental|non approuv[ée]|donn[ée]es humaines.{0,40}limit[ée]es|produit de recherche)\b/i.test(clientFacingText)) {
    errors.push("statut experimental ou non approuve absent pour le stack propose");
  }

  if (peptides.length === 0) {
    errors.push("aucun peptide recommande");
  }
  if (peptides.length < 2) {
    warnings.push(`tres peu de peptides (${peptides.length})`);
  }

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
