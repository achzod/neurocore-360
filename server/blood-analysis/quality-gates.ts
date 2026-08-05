const normalizeForQualityGate = (value: string): string =>
  String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

export const isValidEmptySourcesDisclosure = (
  content: string,
  availableSourceIds?: Set<string>,
): boolean => {
  if (availableSourceIds && availableSourceIds.size > 0) return false;
  const normalized = normalizeForQualityGate(content);
  return /\baucune source externe citee(?: dans ce rapport)?\b/.test(normalized) ||
    /\baucune source bibliographique disponible\b/.test(normalized);
};

export const hasExactNumericMention = (text: string, value: number): boolean => {
  if (!Number.isFinite(value)) return false;
  const raw = String(value);
  const escaped = raw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace("\\.", "[.,]");
  const suffix = raw.includes(".") ? "(?!\\d)" : "(?!\\d|[.,]\\d)";
  return new RegExp(`(^|[^\\d])${escaped}${suffix}`).test(String(text || ""));
};
