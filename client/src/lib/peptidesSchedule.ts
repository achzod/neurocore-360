const WEEK_DAYS = [
  "LUNDI",
  "MARDI",
  "MERCREDI",
  "JEUDI",
  "VENDREDI",
  "SAMEDI",
  "DIMANCHE",
];

const NEXT_DAY_SEPARATOR = new RegExp(
  `\\s*\\|\\s*(?=(?:${WEEK_DAYS.join("|")})\\b)`,
  "i"
);

export function splitWeeklyScheduleEntries(schedule: string): string[] {
  return String(schedule || "")
    .split(NEXT_DAY_SEPARATOR)
    .map((entry) => entry.trim())
    .filter(Boolean);
}
