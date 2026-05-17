/**
 * Test the new vials math + validator on Simon's report
 * (replicates validateVialsMath inline to avoid storage import).
 */
import * as fs from "fs";
import { validatePeptidesReport } from "../server/peptidesReportValidator";

function parseDoseToMg(value: number, unit: string): number {
  const u = unit.toLowerCase();
  if (u.startsWith("mcg") || u === "µg" || u === "ug") return value / 1000;
  if (u.startsWith("mg")) return value;
  if (u.startsWith("g")) return value * 1000;
  return value;
}

function detectInjectionsPerWeek(dosageText: string): number {
  if (/\b1\s*(?:fois|injection)\s*(?:par|\/)\s*semaine|hebdomadaire|1x\/sem\b/i.test(dosageText)) return 1;
  if (/\b2\s*(?:fois|injections?|jours?)\s*(?:par|\/)\s*semaine/i.test(dosageText)) return 2;
  if (/\b3\s*(?:fois|injections?|jours?|soirs?)\s*(?:par|\/)\s*semaine/i.test(dosageText)) return 3;
  if (/\b4\s*(?:fois|injections?|jours?|soirs?)\s*(?:par|\/)\s*semaine/i.test(dosageText)) return 4;
  if (/\b5\s*(?:fois|injections?|jours?|soirs?)\s*(?:par|\/)\s*semaine/i.test(dosageText)) return 5;
  if (/\b6\s*(?:fois|injections?|jours?|soirs?)\s*(?:par|\/)\s*semaine/i.test(dosageText)) return 6;
  if (/chaque\s+(?:soir|matin|jour)|tous\s+les\s+(?:soirs?|jours?)|\bpar\s+(?:injection|jour|soir)\b|\ble\s+soir\b|\bavant\s+le\s+coucher\b|7\s*(?:jours?|soirs?)\s*\/?\s*7|\b1x\/jour\b/i.test(dosageText)) return 7;
  return 1;
}

function deriveVialsForPeptide(pep: any): { totalMg: number; vialMg: number; weeks: number; computed: number } | null {
  const dosage = (pep.dosage || "").replace(/(\d),(\d)/g, "$1.$2");
  const cycle = (pep.cycleDuration || "").replace(/(\d),(\d)/g, "$1.$2");
  const reconstitution = (pep.reconstitution || "").replace(/(\d),(\d)/g, "$1.$2");
  const allText = `${dosage} ${cycle}`;

  const weeksMatch = cycle.match(/(\d+)\s*semaines?/i);
  const weeks = weeksMatch ? parseInt(weeksMatch[1], 10) : 12;
  if (weeks <= 0 || weeks > 52) return null;

  const vialMatch = reconstitution.match(/vial\s*(\d+(?:\.\d+)?)\s*(mg|mcg)/i);
  if (!vialMatch) return null;
  const vialMg = parseDoseToMg(parseFloat(vialMatch[1]), vialMatch[2]);
  if (!isFinite(vialMg) || vialMg <= 0) return null;

  // Cure consécutive
  const consecutiveDaysMatch = allText.match(/(\d+)\s*jours?\s*cons[eé]cutifs?/i);
  if (consecutiveDaysMatch) {
    const cureDays = parseInt(consecutiveDaysMatch[1], 10);
    const perDay = dosage.match(/(\d+(?:\.\d+)?)\s*(mg|mcg)\s*(?:par|\/)\s*jour/i);
    if (perDay) {
      const perDayMg = parseDoseToMg(parseFloat(perDay[1]), perDay[2]);
      const totalMg = perDayMg * cureDays;
      return { totalMg, vialMg, weeks: Math.ceil(cureDays / 7), computed: Math.ceil(totalMg / vialMg) };
    }
  }

  // Range pattern (0.25mg par semaine (semaines 1 à 4))
  const rangeMatches = Array.from(
    dosage.matchAll(/(\d+(?:\.\d+)?)\s*(mg|mcg)\s*par\s*semaine\s*\(\s*semaines?\s*(\d+)\s*(?:à|a|-|–)\s*(\d+)\s*\)/gi)
  ) as RegExpMatchArray[];
  if (rangeMatches.length >= 2) {
    let totalMg = 0, lastDose = 0, lastEnd = 0;
    for (const m of rangeMatches) {
      const v = parseDoseToMg(parseFloat(m[1]), m[2]);
      const start = parseInt(m[3], 10);
      const end = parseInt(m[4], 10);
      totalMg += v * Math.max(0, end - start + 1);
      lastDose = v;
      if (end > lastEnd) lastEnd = end;
    }
    if (weeks > lastEnd) totalMg += lastDose * (weeks - lastEnd);
    return { totalMg, vialMg, weeks, computed: Math.ceil(totalMg / vialMg) };
  }

  const injectionsPerWeek = detectInjectionsPerWeek(dosage);

  // Pattern A: progressive titration with plural "semaines" support
  const progressive = Array.from(
    dosage.matchAll(/(\d+(?:\.\d+)?)\s*(mg|mcg)\s*sem(?:aine)?s?\s*(\d+)/gi)
  ) as RegExpMatchArray[];
  if (progressive.length >= 2) {
    const dosesByWeek = new Map<number, number>();
    for (const m of progressive) {
      const v = parseDoseToMg(parseFloat(m[1]), m[2]);
      const w = parseInt(m[3], 10);
      dosesByWeek.set(w, v);
    }
    const sorted = [...dosesByWeek.keys()].sort((a, b) => a - b);
    const lastDef = sorted[sorted.length - 1];
    const lastDose = dosesByWeek.get(lastDef)!;
    let total = 0;
    for (let w = 1; w <= weeks; w++) {
      if (dosesByWeek.has(w)) total += dosesByWeek.get(w)!;
      else if (w > lastDef) total += lastDose;
    }
    total = total * injectionsPerWeek;
    return { totalMg: total, vialMg, weeks, computed: Math.ceil(total / vialMg) };
  }

  return null;
}

function extractUnitPriceUsd(priceEstimate: string): number | null {
  if (!priceEstimate) return null;
  const m = priceEstimate.match(/[~≈]?\$?\s*(\d+(?:[.,]\d+)?)\s*(?:USD|\$|US)?\s*\/?\s*vial/i);
  if (!m) return null;
  return parseFloat(m[1].replace(",", "."));
}

function syncPriceEstimate(pep: any, newQty: number): void {
  const unit = extractUnitPriceUsd(pep.priceEstimate || "");
  if (!unit) return;
  const total = Math.round(unit * newQty * 100) / 100;
  const eur = Math.round(total * 0.92);
  pep.priceEstimate = `~$${unit.toFixed(2)}/vial × ${newQty} vials = $${total.toFixed(2)} total (~${eur}€)`;
}

function validateVialsMath(report: any): any {
  for (const pep of report.peptides || []) {
    const derived = deriveVialsForPeptide(pep);
    const aiVialsMatch = (pep.vialsNeeded || "").match(/(\d+)\s*vials?/i);
    const aiCount = aiVialsMatch ? parseInt(aiVialsMatch[1], 10) : null;
    if (!derived) continue;
    const shouldOverride = aiCount === null || aiCount < derived.computed || Math.abs(aiCount - derived.computed) / derived.computed > 0.3;
    if (shouldOverride) {
      const totalDisp = derived.totalMg >= 1 ? `${Math.round(derived.totalMg * 10) / 10}mg` : `${Math.round(derived.totalMg * 1000)}mcg`;
      const cureMatch = (pep.dosage + " " + pep.cycleDuration).match(/(\d+)\s*jours?\s*cons[eé]cutifs?/i);
      const dur = cureMatch ? `${cureMatch[1]} jours consecutifs` : `${derived.weeks} semaines`;
      pep.vialsNeeded = `${derived.computed} vials de ${derived.vialMg}mg pour ${dur} (total ~${totalDisp})`;
      syncPriceEstimate(pep, derived.computed);
    }
  }
  return report;
}

const data = JSON.parse(fs.readFileSync("/tmp/simon.json", "utf-8"));
const report = data.report;

console.log("=== AVANT ===");
for (const p of report.peptides) {
  console.log(`  ${p.name.padEnd(20)}: ${p.vialsNeeded}`);
  console.log(`                      ${p.priceEstimate}`);
}

const fixed = validateVialsMath(JSON.parse(JSON.stringify(report)));

console.log("\n=== APRÈS new validateVialsMath ===");
for (const p of fixed.peptides) {
  console.log(`  ${p.name.padEnd(20)}: ${p.vialsNeeded}`);
  console.log(`                      ${p.priceEstimate}`);
}

const v = validatePeptidesReport(fixed);
console.log(`\n=== Validation: ok=${v.ok} ${v.errors.length} errors ===`);
for (const e of v.errors) console.log(`  ❌ ${e}`);
