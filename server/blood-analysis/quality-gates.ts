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
