/**
 * Test: applique le nouveau validateVialsMath + nouveau validator sur les rapports
 * existants pour verifier que les patches corrigent bien chaque cas.
 */
import * as fs from "fs";
import { validatePeptidesReport } from "../server/peptidesReportValidator";

// Re-implement the post-processor here to test in isolation
// (the real one is inside peptidesEngine.ts and pulls many deps)
function parseDoseToMg(value: number, unit: string): number {
  const u = unit.toLowerCase();
  if (u.startsWith("mcg") || u === "µg" || u === "ug") return value / 1000;
  if (u.startsWith("mg")) return value;
  if (u.startsWith("g")) return value * 1000;
  return value;
}

function deriveVialsForPeptide(pep: any): { totalMg: number; vialMg: number; weeks: number; computed: number } | null {
  const dosage = pep.dosage || "";
  const cycle = pep.cycleDuration || "";
  const reconstitution = pep.reconstitution || "";
  const allText = `${dosage} ${cycle}`;

  const weeksMatch = cycle.match(/(\d+)\s*semaines?/i);
  const weeks = weeksMatch ? parseInt(weeksMatch[1], 10) : 12;
  if (weeks <= 0 || weeks > 52) return null;

  const vialMatch = reconstitution.match(/vial\s*(\d+(?:\.\d+)?)\s*(mg|mcg)/i);
  if (!vialMatch) return null;
  const vialMg = parseDoseToMg(parseFloat(vialMatch[1]), vialMatch[2]);
  if (!isFinite(vialMg) || vialMg <= 0) return null;

  const consecutiveDaysMatch =
    allText.match(/(\d+)\s*jours?\s*cons[eé]cutifs?/i) ||
    allText.match(/cure\s+de\s+(\d+)\s*jours?/i);
  if (consecutiveDaysMatch) {
    const cureDays = parseInt(consecutiveDaysMatch[1], 10);
    if (cureDays > 0 && cureDays <= 365) {
      const perDay = dosage.match(/(\d+(?:\.\d+)?)\s*(mg|mcg)\s*(?:par|\/)\s*jour/i);
      if (perDay) {
        const perDayMg = parseDoseToMg(parseFloat(perDay[1]), perDay[2]);
        const totalMg = perDayMg * cureDays;
        return { totalMg, vialMg, weeks: Math.ceil(cureDays / 7), computed: Math.ceil(totalMg / vialMg) };
      }
    }
  }

  const progressive = Array.from(dosage.matchAll(/(\d+(?:\.\d+)?)\s*(mg|mcg)\s*sem(?:aine)?\s*(\d+)/gi)) as RegExpMatchArray[];
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
    return { totalMg: total, vialMg, weeks, computed: Math.ceil(total / vialMg) };
  }

  const perInj = dosage.match(/(\d+(?:\.\d+)?)\s*(mg|mcg)\s*par\s*injection/i);
  const injPerDay = dosage.match(/(\d+)\s*injections?\s*par\s*jour/i);
  if (perInj && injPerDay) {
    const perInjMg = parseDoseToMg(parseFloat(perInj[1]), perInj[2]);
    const ipd = parseInt(injPerDay[1], 10);
    const total = perInjMg * ipd * 7 * weeks;
    return { totalMg: total, vialMg, weeks, computed: Math.ceil(total / vialMg) };
  }

  const perDay = dosage.match(/(\d+(?:\.\d+)?)\s*(mg|mcg)\s*par\s*jour/i);
  if (perDay) {
    const perDayMg = parseDoseToMg(parseFloat(perDay[1]), perDay[2]);
    const total = perDayMg * 7 * weeks;
    return { totalMg: total, vialMg, weeks, computed: Math.ceil(total / vialMg) };
  }

  const perWk = dosage.match(/(\d+(?:\.\d+)?)\s*(mg|mcg)\s*par\s*semaine/i);
  if (perWk) {
    const perWkMg = parseDoseToMg(parseFloat(perWk[1]), perWk[2]);
    const total = perWkMg * weeks;
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
    const priceMatch = (pep.priceEstimate || "").match(/[x×]\s*(\d+)\s*vials?/i);
    const priceCount = priceMatch ? parseInt(priceMatch[1], 10) : null;

    if (derived) {
      const shouldOverride =
        aiCount === null ||
        aiCount < derived.computed ||
        Math.abs(aiCount - derived.computed) / derived.computed > 0.3;
      if (shouldOverride) {
        const totalDisplay = derived.totalMg >= 1 ? `${Math.round(derived.totalMg * 10) / 10}mg` : `${Math.round(derived.totalMg * 1000)}mcg`;
        const cureMatch = (pep.dosage + " " + pep.cycleDuration).match(/(\d+)\s*jours?\s*cons[eé]cutifs?/i);
        const dur = cureMatch ? `${cureMatch[1]} jours consecutifs` : `${derived.weeks} semaines`;
        pep.vialsNeeded = `${derived.computed} vials de ${derived.vialMg}mg pour ${dur} (total ~${totalDisplay})`;
        syncPriceEstimate(pep, derived.computed);
        continue;
      }
    }
    if (aiCount != null && priceCount != null && aiCount !== priceCount) {
      const ratio = Math.max(aiCount, priceCount) / Math.min(aiCount, priceCount);
      if (ratio > 1.35) syncPriceEstimate(pep, aiCount);
    }
  }
  return report;
}

const files = ["thomass77100", "pasqal18", "aliane", "willy", "hadi", "imd83", "afantrous", "parrinello", "baldy"];
for (const f of files) {
  const data = JSON.parse(fs.readFileSync(`/tmp/pep_audit/${f}.json`, "utf-8"));
  const fixed = validateVialsMath(JSON.parse(JSON.stringify(data.report)));
  const v = validatePeptidesReport(fixed);
  console.log(`\n========== ${f} ==========`);
  console.log(`  AFTER PATCH: ok=${v.ok} errors=${v.errors.length} warnings=${v.warnings.length}`);
  for (const e of v.errors) console.log(`    ❌ ${e}`);
  // Show what changed
  for (let i = 0; i < data.report.peptides.length; i++) {
    const before = data.report.peptides[i];
    const after = fixed.peptides[i];
    if (before.vialsNeeded !== after.vialsNeeded || before.priceEstimate !== after.priceEstimate) {
      console.log(`    🔧 ${after.name}:`);
      console.log(`       vials: ${before.vialsNeeded} → ${after.vialsNeeded}`);
      console.log(`       price: ${before.priceEstimate} → ${after.priceEstimate}`);
    }
  }
}
