export interface PeptidesStackPolicy {
  goals: string[];
  minimumMolecules: number;
  maximumMolecules: number;
  multiAxis: boolean;
  confirmedLowTestosterone: boolean;
}

function normalizeGoalList(value: unknown): string[] {
  const values = Array.isArray(value)
    ? value
    : String(value || "").split(/[,;|]/);
  return values
    .map((goal) => String(goal || "").trim().toLowerCase())
    .filter(Boolean);
}

export function derivePeptidesStackPolicy(
  responses: Record<string, unknown>,
): PeptidesStackPolicy {
  const primary = String(
    responses.pep_primary_goal || responses.objectifPrincipal || "",
  ).trim().toLowerCase();
  const secondary = normalizeGoalList(
    responses.pep_secondary_goals || responses.objectifSecondaire,
  );
  const goals = [...new Set([primary, ...secondary].filter(Boolean))];
  const confirmedLowTestosterone =
    goals.includes("testo-boost")
    && String(responses.pep_testo_bloodwork || "").trim().toLowerCase() === "recent-low";

  let minimumMolecules = 2;
  if (goals.length === 2) minimumMolecules = 3;
  if (goals.length >= 3) minimumMolecules = 5;

  // A confirmed HPG axis needs its two distinct levers. When another objective
  // is also present, a two-peptide fallback cannot cover the dossier.
  if (confirmedLowTestosterone && goals.length >= 2) {
    minimumMolecules = Math.max(minimumMolecules, 4);
  }
  if (confirmedLowTestosterone && goals.length >= 3) {
    minimumMolecules = 5;
  }

  return {
    goals,
    minimumMolecules,
    maximumMolecules: 5,
    multiAxis: goals.length >= 2,
    confirmedLowTestosterone,
  };
}
