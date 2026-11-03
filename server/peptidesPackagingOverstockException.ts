export const GH_DUO_PACKAGING_OVERSTOCK_CONFIRMATION =
  "ALLOW_GH_DUO_PACKAGING_OVERSTOCK_UNDER_HOLD";

export const GH_DUO_PACKAGING_OVERSTOCK_PEPTIDES = [
  "CJC-1295 sans DAC",
  "Ipamorelin",
] as const;

export type GhDuoPackagingOverstockPeptide =
  (typeof GH_DUO_PACKAGING_OVERSTOCK_PEPTIDES)[number];

export interface GhDuoPackagingOverstockException {
  confirmation: typeof GH_DUO_PACKAGING_OVERSTOCK_CONFIRMATION;
  peptides: GhDuoPackagingOverstockPeptide[];
  maxOverstockRatio: number;
  reason: string;
  authenticatedAdmin: true;
  holdRequired: true;
  skipEmailRequired: true;
}

function normalizedName(value: unknown): string {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

export function isGhDuoPackagingOverstockPeptide(
  value: unknown,
): value is GhDuoPackagingOverstockPeptide {
  const key = normalizedName(value).replace("nodac", "sansdac");
  return key === "cjc1295sansdac" || key === "ipamorelin";
}

export function parseGhDuoPackagingOverstockException(
  value: unknown,
): GhDuoPackagingOverstockException | null {
  if (!value || typeof value !== "object") return null;
  const source = value as Record<string, unknown>;
  if (source.confirmation !== GH_DUO_PACKAGING_OVERSTOCK_CONFIRMATION) return null;
  if (source.authenticatedAdmin !== true || source.holdRequired !== true || source.skipEmailRequired !== true) return null;
  const maxOverstockRatio = Number(source.maxOverstockRatio);
  if (!Number.isFinite(maxOverstockRatio) || maxOverstockRatio <= 1.3 || maxOverstockRatio > 2.5) return null;
  const names = Array.isArray(source.peptides) ? source.peptides.map(String) : [];
  if (names.length !== 2 || !names.every(isGhDuoPackagingOverstockPeptide)) return null;
  const canonical = new Set(names.map((name) => normalizedName(name).replace("nodac", "sansdac")));
  if (!canonical.has("cjc1295sansdac") || !canonical.has("ipamorelin") || canonical.size !== 2) return null;
  const reason = String(source.reason || "").trim();
  if (reason.length < 12 || reason.length > 500) return null;
  return {
    confirmation: GH_DUO_PACKAGING_OVERSTOCK_CONFIRMATION,
    peptides: [...GH_DUO_PACKAGING_OVERSTOCK_PEPTIDES],
    maxOverstockRatio,
    reason,
    authenticatedAdmin: true,
    holdRequired: true,
    skipEmailRequired: true,
  };
}

export function packagingOverstockLimitForPeptide(
  peptideName: unknown,
  exception: GhDuoPackagingOverstockException | null | undefined,
  defaultRatio = 1.3,
): number {
  if (!exception || !isGhDuoPackagingOverstockPeptide(peptideName)) return defaultRatio;
  return exception.maxOverstockRatio;
}
