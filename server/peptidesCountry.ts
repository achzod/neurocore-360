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
  return trimmed;
}
