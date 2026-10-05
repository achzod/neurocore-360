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

  // Count attributable coverage axes instead of imposing filler products.
  // One molecule can legitimately support more than one goal; forcing five
  // or six molecules for three or four axes creates gadget additions and
  // makes valid live-packaging fallbacks impossible.
  let minimumMolecules = Math.max(2, Math.min(4, goals.length));
  const maximumMolecules = goals.length >= 4 ? 6 : 5;

  // A confirmed HPG axis needs its two distinct levers. When another objective
  // is also present, reserve room for both HPG levers plus the other axes.
  // A conditional HPG phase needs the same two explicit cards.
  if ((confirmedLowTestosterone || conditionalHpgPhase) && goals.length >= 2) {
    minimumMolecules = Math.max(minimumMolecules, 3);
  }
  if ((confirmedLowTestosterone || conditionalHpgPhase) && goals.length >= 3) {
    minimumMolecules = Math.max(minimumMolecules, 4);
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
