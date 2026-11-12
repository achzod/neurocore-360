export interface ReservePlanningInput {
  dosage?: string;
  cycleDuration?: string;
}

function doseToMg(value: number, unit: string): number {
  const normalized = unit.toLowerCase();
  if (normalized.startsWith("mcg") || normalized === "µg" || normalized === "ug") return value / 1000;
  if (normalized.startsWith("mg")) return value;
  if (normalized.startsWith("g")) return value * 1000;
  return value;
}

/** null = no explicit count; NaN = unsafe/contradictory. No NL phase inference. */
export function parseExplicitAdministrationsPerWeek(dosage: string): number | null {
  const words: Record<string, number> = { un: 1, une: 1, deux: 2, trois: 3, quatre: 4, cinq: 5, six: 6, sept: 7, huit: 8, neuf: 9, dix: 10, onze: 11, douze: 12, treize: 13, quatorze: 14 };
  const pattern = /(?<![\w.,-])(\d+|un|une|deux|trois|quatre|cinq|six|sept|huit|neuf|dix|onze|douze|treize|quatorze)\s*(?:seul(?:e)?\s+)?(?:fois|injections?|administrations?|jours?|soirs?)\s*(?:par|\/)\s*(semaine|jour)\b/gi;
  const frequencies: number[] = [];
  for (const match of dosage.matchAll(pattern)) {
    const prefix = dosage.slice(Math.max(0, (match.index || 0) - 30), match.index);
    if (/\b(?:pas|jamais|aucune?)\b[^.;,]{0,24}$/i.test(prefix)) return NaN;
    const count = /^\d+$/.test(match[1]) ? Number(match[1]) : words[match[1].toLowerCase()];
    const daily = match[2].toLowerCase() === "jour";
    if (!count || count > (daily ? 3 : 14)) return NaN;
    frequencies.push(count * (daily ? 7 : 1));
  }
  // Do not ignore an unknown second count merely because another count parsed.
  const unparsed = dosage.replace(pattern, "");
  if (/\b(?:fois|injections?|administrations?|jours?|soirs?)\s*(?:par|\/)\s*(?:semaine|jour)\b/i.test(unparsed)) return NaN;
  if (!frequencies.length) {
    // An explicit but unparsed count is not permission to assume once weekly.
    return /\b(?:fois|injections?|administrations?|jours?|soirs?)\s*(?:par|\/)\s*(?:semaine|jour)\b/i.test(dosage) ? NaN : null;
  }
  return frequencies.every((value) => value === frequencies[0]) ? frequencies[0] : NaN;
}

function administrationsPerWeek(dosage: string): number {
  const explicit = parseExplicitAdministrationsPerWeek(dosage);
  if (explicit != null) return explicit;
  if (/chaque\s+(?:soir|matin|jour)|tous\s+les\s+(?:soirs?|jours?)|7\s*(?:jours?|soirs?)\s*\/?\s*7|\b1x\/jour\b|par\s+jour|au coucher|quotidien/i.test(dosage)) return 7;
  return 1;
}

export function estimateHighestWeeklyNeedMg(input: ReservePlanningInput, activeNeedMg: number): number {
  const dosage = String(input.dosage || "").replace(/(\d),(\d)/g, "$1.$2");
  const cycle = String(input.cycleDuration || "").replace(/(\d),(\d)/g, "$1.$2");
  const weeks = Math.max(1, Number(cycle.match(/(\d+)\s*semaines?/i)?.[1] || 1));
  const frequency = administrationsPerWeek(dosage);
  if (!Number.isFinite(frequency)) return NaN;
  // A weight-normalized value alone is not an absolute dose.
  const absoluteDosage = dosage.replace(/\b\d+(?:\.\d+)?\s*(?:mg|mcg|µg|ug)\s*\/\s*kg\b/gi, "");
  if (!/\d+(?:\.\d+)?\s*(?:mg|mcg|µg|ug)\b/i.test(absoluteDosage) && /\/\s*kg\b/i.test(dosage)) return NaN;
  const dailyTotal = absoluteDosage.match(/(\d+(?:\.\d+)?)\s*(mg|mcg|µg|ug)\s*(?:par|\/)\s*jour/i);
  if (dailyTotal) return doseToMg(Number(dailyTotal[1]), dailyTotal[2]) * 7;
  const perAdministration = absoluteDosage.match(/(\d+(?:\.\d+)?)\s*(mg|mcg|µg|ug)\s*par\s*(?:injection|administration)/i);
  if (perAdministration) return doseToMg(Number(perAdministration[1]), perAdministration[2]) * frequency;
  const phased = Array.from(absoluteDosage.matchAll(/semaines?\s*\d+(?:\s*(?:à|a|-)\s*\d+)?\s*(?:à|a|:)?\s*(\d+(?:\.\d+)?)\s*(mg|mcg|µg|ug)\b/gi));
  if (phased.length) return Math.max(...phased.map((match) => doseToMg(Number(match[1]), match[2]))) * frequency;
  const progressive = Array.from(absoluteDosage.matchAll(/(\d+(?:\.\d+)?)\s*(mg|mcg|µg|ug)\s*sem(?:aine)?s?\s*\d+/gi));
  if (progressive.length) return Math.max(...progressive.map((match) => doseToMg(Number(match[1]), match[2]))) * frequency;
  const weeklyTotal = absoluteDosage.match(/(\d+(?:\.\d+)?)\s*(mg|mcg|µg|ug)\s*(?:par\s*|\/\s*)semaine/i);
  if (weeklyTotal) return doseToMg(Number(weeklyTotal[1]), weeklyTotal[2]);
  const simpleDose = absoluteDosage.match(/(\d+(?:\.\d+)?)\s*(mg|mcg|µg|ug)\b/i);
  if (simpleDose && frequency > 1) return doseToMg(Number(simpleDose[1]), simpleDose[2]) * frequency;
  return activeNeedMg / weeks;
}

/** Whole packages must cover the reserve target, not only the active course. */
export function calculateReservePackageCount(input: ReservePlanningInput, activeNeedMg: number, packageMg: number): number {
  const target = calculateReserveTargetMg(input, activeNeedMg);
  if (!Number.isFinite(activeNeedMg) || activeNeedMg <= 0 || !Number.isFinite(packageMg) || packageMg <= 0 || !Number.isFinite(target) || target < activeNeedMg) {
    throw new Error("RESERVE_PACKAGE_COUNT_UNCALCULABLE");
  }
  return Math.max(1, Math.ceil(target / packageMg));
}

export function calculateReserveTargetMg(input: ReservePlanningInput, activeNeedMg: number): number {
  const highestWeekMg = estimateHighestWeeklyNeedMg(input, activeNeedMg);
  return activeNeedMg + Math.max(activeNeedMg * 0.25, highestWeekMg);
}
