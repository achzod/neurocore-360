export interface PeptideVialPlanningInput {
  name?: string;
  dosage?: string;
  cycleDuration?: string;
  reconstitution?: string;
  vialsNeeded?: string;
  pharmacologicalNeedMg?: number | null;
}

export interface DocumentedStabilityWindow {
  days: number;
  source: string;
}

export interface PeptideVialPlan {
  pharmacologicalNeedMg: number | null;
  vialSizeMg: number | null;
  mathematicalMinimumVials: number | null;
  operationalVials: number | null;
  optionalSealedReserveVials: number | null;
  stabilityDays: number | null;
  stabilitySource: string | null;
  cadence: { cycleDays: number; administrationsPerWeek: number } | null;
  status: "documented" | "stability-unverified" | "unparseable";
}

function normalizeName(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function resolveStability(
  name: string,
  stabilityByPeptide: Record<string, DocumentedStabilityWindow>
): DocumentedStabilityWindow | undefined {
  const key = normalizeName(name);
  if (stabilityByPeptide[key]) return stabilityByPeptide[key];
  const entries = Object.entries(stabilityByPeptide);
  if (/^cjc1295/.test(key)) {
    const wantsNoDac = /nodac|sansdac/.test(key);
    return entries.find(([candidate]) =>
      /^cjc1295/.test(candidate) && /nodac|sansdac/.test(candidate) === wantsNoDac
    )?.[1];
  }
  return entries.find(([candidate]) => candidate === key)?.[1];
}

function parseNumber(value: string): number {
  return Number(value.replace(",", "."));
}

function toMg(value: number, unit: string): number {
  return /^(?:mcg|ug|µg)$/i.test(unit) ? value / 1000 : value;
}

export function parseVialSizeMg(input: PeptideVialPlanningInput): number | null {
  const text = `${input.reconstitution || ""} ${input.vialsNeeded || ""}`.replace(/(\d),(\d)/g, "$1.$2");
  const match = text.match(/(?:vial|flacon)s?\s*(?:de)?\s*(\d+(?:\.\d+)?)\s*(mg|mcg|ug|µg)\b/i);
  if (!match) return null;
  const value = toMg(Number(match[1]), match[2]);
  return Number.isFinite(value) && value > 0 ? value : null;
}

export function parsePeptideCadence(input: PeptideVialPlanningInput): { cycleDays: number; administrationsPerWeek: number } | null {
  const dosage = String(input.dosage || "").toLowerCase();
  const cycle = String(input.cycleDuration || "").toLowerCase();
  const consecutive = `${dosage} ${cycle}`.match(/(?:pendant\s+|cure\s+de\s+)?(\d+)\s*jours?\s*cons[eé]cutifs?/i);
  const daysMatch = cycle.match(/(\d+)\s*jours?\b/i);
  const weeksMatch = cycle.match(/(\d+)\s*semaines?\b/i);
  const cycleDays = consecutive
    ? Number(consecutive[1])
    : daysMatch
      ? Number(daysMatch[1])
      : weeksMatch
        ? Number(weeksMatch[1]) * 7
        : 0;
  if (!Number.isFinite(cycleDays) || cycleDays <= 0) return null;

  let administrationsPerWeek = 0;
  const explicit = dosage.match(/(\d+)\s*(?:fois|injections?|jours?|soirs?)\s*(?:par|\/)\s*semaine/i);
  if (explicit) administrationsPerWeek = Number(explicit[1]);
  else if (/une fois par semaine|hebdomadaire|1x\s*\/\s*sem/i.test(dosage)) administrationsPerWeek = 1;
  else if (/deux fois par semaine/i.test(dosage)) administrationsPerWeek = 2;
  else if (/trois fois par semaine/i.test(dosage)) administrationsPerWeek = 3;
  else if (/quatre fois par semaine/i.test(dosage)) administrationsPerWeek = 4;
  else if (/cinq fois par semaine/i.test(dosage)) administrationsPerWeek = 5;
  else if (/six fois par semaine/i.test(dosage)) administrationsPerWeek = 6;
  else if (/chaque\s+(?:jour|soir|matin)|tous\s+les\s+(?:jours|soirs|matins)|par\s+jour|au coucher|quotidien/i.test(dosage)) administrationsPerWeek = 7;
  else if (consecutive) administrationsPerWeek = 7;

  if (!Number.isFinite(administrationsPerWeek) || administrationsPerWeek <= 0 || administrationsPerWeek > 14) return null;
  return { cycleDays, administrationsPerWeek };
}

export function estimatePharmacologicalNeedMg(input: PeptideVialPlanningInput): number | null {
  if (
    input.pharmacologicalNeedMg != null &&
    Number.isFinite(input.pharmacologicalNeedMg) &&
    input.pharmacologicalNeedMg > 0
  ) {
    return input.pharmacologicalNeedMg;
  }
  const dosage = String(input.dosage || "").replace(/(\d),(\d)/g, "$1.$2");
  const cadence = parsePeptideCadence(input);
  if (!cadence) return null;
  const perAdministration = dosage.match(/(\d+(?:\.\d+)?)\s*(mg|mcg|ug|µg)\s*(?:par\s*(?:injection|jour|prise)|\/\s*(?:injection|jour))/i)
    || dosage.match(/(\d+(?:\.\d+)?)\s*(mg|mcg|ug|µg)\b(?!\s*\/\s*kg)/i);
  if (!perAdministration) return null;
  const doseMg = toMg(Number(perAdministration[1]), perAdministration[2]);
  if (!Number.isFinite(doseMg) || doseMg <= 0) return null;
  const administrations = Math.max(1, Math.ceil((cadence.cycleDays / 7) * cadence.administrationsPerWeek - 1e-9));
  return doseMg * administrations;
}

export function parseDocumentedStabilityConfig(raw = process.env.PEPTIDES_RECONSTITUTED_STABILITY_JSON || ""): Record<string, DocumentedStabilityWindow> {
  if (!raw.trim()) return {};
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { throw new Error("PEPTIDES_RECONSTITUTED_STABILITY_JSON invalide: JSON attendu"); }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("PEPTIDES_RECONSTITUTED_STABILITY_JSON invalide: objet attendu");
  const result: Record<string, DocumentedStabilityWindow> = {};
  for (const [name, entry] of Object.entries(parsed as Record<string, unknown>)) {
    if (!entry || typeof entry !== "object") throw new Error(`Stabilite ${name}: objet attendu`);
    const days = Number((entry as any).days);
    const source = String((entry as any).source || "").trim();
    if (!Number.isInteger(days) || days < 1 || days > 365 || source.length < 8) {
      throw new Error(`Stabilite ${name}: days entier 1-365 et source documentee obligatoires`);
    }
    result[normalizeName(name)] = { days, source };
  }
  return result;
}

export function planOperationalVials(
  input: PeptideVialPlanningInput,
  stabilityByPeptide: Record<string, DocumentedStabilityWindow> = {}
): PeptideVialPlan {
  const pharmacologicalNeedMg = estimatePharmacologicalNeedMg(input);
  const vialSizeMg = parseVialSizeMg(input);
  const cadence = parsePeptideCadence(input);
  if (pharmacologicalNeedMg == null || vialSizeMg == null || cadence == null) {
    return { pharmacologicalNeedMg, vialSizeMg, mathematicalMinimumVials: null, operationalVials: null, optionalSealedReserveVials: null, stabilityDays: null, stabilitySource: null, cadence, status: "unparseable" };
  }
  const mathematicalMinimumVials = Math.ceil(pharmacologicalNeedMg / vialSizeMg);
  const stability = resolveStability(input.name || "", stabilityByPeptide);
  if (!stability) {
    return { pharmacologicalNeedMg, vialSizeMg, mathematicalMinimumVials, operationalVials: null, optionalSealedReserveVials: null, stabilityDays: null, stabilitySource: null, cadence, status: "stability-unverified" };
  }

  const totalAdministrations = Math.max(1, Math.ceil((cadence.cycleDays / 7) * cadence.administrationsPerWeek - 1e-9));
  const dosePerAdministrationMg = pharmacologicalNeedMg / totalAdministrations;
  const administrationDays = Array.from({ length: totalAdministrations }, (_, index) =>
    Math.min(cadence.cycleDays - 1, Math.floor(index * cadence.cycleDays / totalAdministrations))
  );
  const mgByStabilityWindow = new Map<number, number>();
  for (const day of administrationDays) {
    const bucket = Math.floor(day / stability.days);
    mgByStabilityWindow.set(bucket, (mgByStabilityWindow.get(bucket) || 0) + dosePerAdministrationMg);
  }
  const operationalVials = [...mgByStabilityWindow.values()].reduce(
    (sum, bucketMg) => sum + Math.ceil((bucketMg - 1e-9) / vialSizeMg),
    0
  );
  return {
    pharmacologicalNeedMg,
    vialSizeMg,
    mathematicalMinimumVials,
    operationalVials: Math.max(mathematicalMinimumVials, operationalVials),
    optionalSealedReserveVials: Math.max(mathematicalMinimumVials, operationalVials) + 1,
    stabilityDays: stability.days,
    stabilitySource: stability.source,
    cadence,
    status: "documented",
  };
}

export function formatOperationalVials(plan: PeptideVialPlan, cycleDuration: string): string {
  if (plan.pharmacologicalNeedMg == null || plan.vialSizeMg == null || plan.mathematicalMinimumVials == null) {
    return "Calcul de flacons impossible: dosage, frequence, duree ou taille de vial non lisible.";
  }
  const need = Number(plan.pharmacologicalNeedMg.toFixed(3));
  if (plan.status !== "documented" || plan.operationalVials == null) {
    return `Besoin brut ${need}mg. Minimum mathematique ${plan.mathematicalMinimumVials} vial${plan.mathematicalMinimumVials > 1 ? "s" : ""} de ${plan.vialSizeMg}mg pour ${cycleDuration}. Achat operationnel non chiffre: aucune fenetre de stabilite apres reconstitution documentee n'est configuree. Aucune reserve n'est ajoutee.`;
  }
  return `Achat operationnel ${plan.operationalVials} vial${plan.operationalVials > 1 ? "s" : ""} de ${plan.vialSizeMg}mg pour ${cycleDuration}. Besoin brut ${need}mg, minimum mathematique ${plan.mathematicalMinimumVials}. Fenetre apres reconstitution ${plan.stabilityDays} jours, source: ${plan.stabilitySource}. Reserve scellee facultative: ${plan.optionalSealedReserveVials} vials au total, sans augmenter la dose ni la duree.`;
}
