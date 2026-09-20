export interface PeptidesStackPolicy {
  goals: string[];
  minimumMolecules: number;
  maximumMolecules: number;
  multiAxis: boolean;
  confirmedLowTestosterone: boolean;
  testosteroneGoal: boolean;
  testosteroneBloodworkStatus: string;
  conditionalHpgPhase: boolean;
  secretagogueAxisRequired: boolean;
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
  const testosteroneGoal = goals.includes("testo-boost");
  const testosteroneBloodworkStatus = String(
    responses.pep_testo_bloodwork || "",
  ).trim().toLowerCase();
  const confirmedLowTestosterone =
    testosteroneGoal && testosteroneBloodworkStatus === "recent-low";
  const conditionalHpgPhase =
    testosteroneGoal && ["old", "never"].includes(testosteroneBloodworkStatus);
  const secretagogueAxisRequired = goals.includes("gh-antiaging");

  let minimumMolecules = 2;
  if (goals.length === 2) minimumMolecules = 3;
  if (goals.length === 3) minimumMolecules = 5;
  if (goals.length >= 4) minimumMolecules = 6;
  const maximumMolecules = goals.length >= 4 ? 6 : 5;

  // A confirmed HPG axis needs its two distinct levers. When another objective
  // is also present, a two-peptide fallback cannot cover the dossier.
  if (confirmedLowTestosterone && goals.length >= 2) {
    minimumMolecules = Math.max(minimumMolecules, 4);
  }
  if (confirmedLowTestosterone && goals.length >= 3) {
    minimumMolecules = Math.max(minimumMolecules, 5);
  }

  return {
    goals,
    minimumMolecules,
    maximumMolecules,
    multiAxis: goals.length >= 2,
    confirmedLowTestosterone,
    testosteroneGoal,
    testosteroneBloodworkStatus,
    conditionalHpgPhase,
    secretagogueAxisRequired,
  };
}
