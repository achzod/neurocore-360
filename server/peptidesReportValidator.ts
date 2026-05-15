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
  peptides?: PeptidesPeptide[];
  sections?: Array<{ id?: string; title?: string; content?: string }>;
  clientName?: string;
  promoCodesGenerated?: any[];
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

function extractFirstNumber(text: string | undefined): number | null {
  if (!text) return null;
  const m = text.match(/(\d+(?:[.,]\d+)?)/);
  if (!m) return null;
  return parseFloat(m[1].replace(",", "."));
}

function extractVialQty(vialsNeeded: string | undefined): number | null {
  if (!vialsNeeded) return null;
  const m = vialsNeeded.match(/(\d+)\s*vials?\b/i);
  return m ? parseInt(m[1], 10) : null;
}

function extractVialMg(vialsNeeded: string | undefined): number | null {
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

function extractTotalMgFromVials(vialsNeeded: string | undefined): number | null {
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

function estimateNeedMg(p: PeptidesPeptide): number | null {
  // Normalize French decimal commas so regex captures match.
  const dose = (p.dosage || "").replace(/(\d),(\d)/g, "$1.$2");
  const cycle = (p.cycleDuration || "").replace(/(\d),(\d)/g, "$1.$2");

  // Progressive weekly with range: "0.25 mg par semaine (semaines 1 a 4), puis 0.5 mg par semaine (semaines 5 a 8)"
  let weeksFromCycle = 0;
  const wkMatchEarly = cycle.match(/(\d+)\s*semaines?\b/i);
  if (wkMatchEarly) weeksFromCycle = parseInt(wkMatchEarly[1], 10);

  const rangeMatches = Array.from(
    dose.matchAll(/(\d+(?:\.\d+)?)\s*(mg|mcg|µg|ug)\s*par\s*semaine\s*\(\s*semaines?\s*(\d+)\s*(?:à|a|-|–)\s*(\d+)\s*\)/gi)
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

  // Titration / progressive: take the steady-state dose × steady-state weeks.
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
  const everyDay = /chaque jour|tous les jours|\b7\s*(?:soirs?|jours?)\s*\/?\s*7|\b1x\/jour\b|par jour\b/i.test(dose);
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
    if (overshoot > 2.5) {
      issues.push(
        `surcommande detectee: ${totalMgOrdered}mg commandes vs ${needMg.toFixed(1)}mg besoin (x${overshoot.toFixed(1)})`
      );
    }
    // Skip sous-commande when the cycle duration is a range like "8 à 12 semaines":
    // the AI legitimately sizes for the lower bound. Only flag a HARD undershoot
    // (< 60% of estimator's need) to avoid noisy false positives.
    const cycleHasRange = /(\d+)\s*(?:à|a|-|–)\s*(\d+)\s*semaines?/i.test(p.cycleDuration || "");
    if (!cycleHasRange && overshoot < 0.6) {
      issues.push(
        `sous-commande detectee: ${totalMgOrdered}mg commandes vs ${needMg.toFixed(1)}mg besoin (${(overshoot * 100).toFixed(0)}%)`
      );
    }
  }

  if (p.purchaseUrl && !/^https?:\/\//.test(p.purchaseUrl)) {
    issues.push(`purchaseUrl mal formee: ${p.purchaseUrl}`);
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
    if (/—|&mdash;/.test(c)) {
      errors.push(`em-dash interdit dans ${title}`);
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

  const weeklySection = sections.find(
    (s) => /semaine type|protocole pratique|semaine\s+type/i.test(s.title || "")
  );
  if (weeklySection) {
    const c = weeklySection.content || "";
    const daysFound = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"]
      .filter((d) => new RegExp(`\\b${d}\\b`, "i").test(c)).length;
    const everyDayPattern = /chaque\s+(matin|soir|jour)|tous\s+les\s+jours|7\s*(?:jours?|soirs?)\s*\/?\s*7/i.test(c);
    if (daysFound < 5 && !everyDayPattern) {
      errors.push(`semaine type incomplete: ${daysFound}/7 jours et pas de pattern 'chaque jour'`);
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
