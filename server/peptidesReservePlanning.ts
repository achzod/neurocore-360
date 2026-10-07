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

function administrationsPerWeek(dosage: string): number {
  if (/\b(?:2|deux)\s*(?:fois|injections?|jours?|soirs?)\s*(?:par|\/)\s*semaine/i.test(dosage)) return 2;
  if (/\b(?:3|trois)\s*(?:fois|injections?|jours?|soirs?)\s*(?:par|\/)\s*semaine/i.test(dosage)) return 3;
  if (/\b(?:4|quatre)\s*(?:fois|injections?|jours?|soirs?)\s*(?:par|\/)\s*semaine/i.test(dosage)) return 4;
  if (/\b(?:5|cinq)\s*(?:fois|injections?|jours?|soirs?)\s*(?:par|\/)\s*semaine/i.test(dosage)) return 5;
  if (/\b(?:6|six)\s*(?:fois|injections?|jours?|soirs?)\s*(?:par|\/)\s*semaine/i.test(dosage)) return 6;
  if (/\b(?:2|deux)\s*(?:fois|injections?)\s*(?:par|\/)\s*jour/i.test(dosage)) return 14;
  if (/\b(?:3|trois)\s*(?:fois|injections?)\s*(?:par|\/)\s*jour/i.test(dosage)) return 21;
  if (/chaque\s+(?:soir|matin|jour)|tous\s+les\s+(?:soirs?|jours?)|7\s*(?:jours?|soirs?)\s*\/?\s*7|\b1x\/jour\b/i.test(dosage)) return 7;
  return 1;
}

export function estimateHighestWeeklyNeedMg(input: ReservePlanningInput, activeNeedMg: number): number {
  const dosage = String(input.dosage || "").replace(/(\d),(\d)/g, "$1.$2");
  const cycle = String(input.cycleDuration || "").replace(/(\d),(\d)/g, "$1.$2");
  const weeks = Math.max(1, Number(cycle.match(/(\d+)\s*semaines?/i)?.[1] || 1));
  const frequency = administrationsPerWeek(dosage);
  const dailyTotal = dosage.match(/(\d+(?:\.\d+)?)\s*(mg|mcg|µg|ug)\s*(?:par|\/)\s*jour/i);
  if (dailyTotal) return doseToMg(Number(dailyTotal[1]), dailyTotal[2]) * 7;
  const perAdministration = dosage.match(/(\d+(?:\.\d+)?)\s*(mg|mcg|µg|ug)\s*par\s*(?:injection|administration)/i);
  if (perAdministration) return doseToMg(Number(perAdministration[1]), perAdministration[2]) * frequency;
  const phased = Array.from(dosage.matchAll(/semaines?\s*\d+(?:\s*(?:à|a|-)\s*\d+)?\s*(?:à|a|:)?\s*(\d+(?:\.\d+)?)\s*(mg|mcg|µg|ug)\b/gi));
  if (phased.length) return Math.max(...phased.map((match) => doseToMg(Number(match[1]), match[2]))) * frequency;
  const progressive = Array.from(dosage.matchAll(/(\d+(?:\.\d+)?)\s*(mg|mcg|µg|ug)\s*sem(?:aine)?s?\s*\d+/gi));
  if (progressive.length) return Math.max(...progressive.map((match) => doseToMg(Number(match[1]), match[2]))) * frequency;
  const weeklyTotal = dosage.match(/(\d+(?:\.\d+)?)\s*(mg|mcg|µg|ug)\s*(?:par\s*|\/\s*)semaine/i);
  if (weeklyTotal) return doseToMg(Number(weeklyTotal[1]), weeklyTotal[2]);
  const simpleDose = dosage.match(/(\d+(?:\.\d+)?)\s*(mg|mcg|µg|ug)\b/i);
  if (simpleDose && frequency > 1) return doseToMg(Number(simpleDose[1]), simpleDose[2]) * frequency;
  return activeNeedMg / weeks;
}

export function calculateReserveTargetMg(input: ReservePlanningInput, activeNeedMg: number): number {
  const highestWeekMg = estimateHighestWeeklyNeedMg(input, activeNeedMg);
  return activeNeedMg + Math.max(activeNeedMg * 0.25, highestWeekMg);
}
