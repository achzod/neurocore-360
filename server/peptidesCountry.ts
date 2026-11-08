export function canonicalizePeptauraCountry(value: string): string {
  const trimmed = value.trim();
  const key = trimmed
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");

  if (["reunion", "ile de la reunion", "la reunion", "reunion island"].includes(key)) {
    return "Réunion";
  }
  // Peptaura's shipping boundary expects the English catalogue label. Keep
  // this allow-list deliberately exact: unknown/localized country values must
  // remain visible and fail the supplier preflight rather than being guessed.
  if (key === "hongrie") return "Hungary";
  return trimmed;
}
