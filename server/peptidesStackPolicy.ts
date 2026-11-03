export interface PeptidesStackPolicy {
  goals: string[];
  activeGoals: string[];
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
  // The HPG axis is operational only when a recent panel confirms low
  // testosterone. Old/missing panels keep the documented conditional phase;
  // a recent-normal panel explicitly excludes a pharmacological HPG phase.
  // Treating recent-normal as active contradicts the generation prompt and
  // creates an impossible attribution gate (the model is correctly told not
  // to add an HPG molecule, then rejected for not adding one).
  const activeGoals = testosteroneGoal && !confirmedLowTestosterone
    ? goals.filter((goal) => goal !== "testo-boost")
    : goals;

  // Count attributable active axes instead of imposing filler products.
  // One molecule can legitimately support more than one goal; forcing five
  // or six molecules for three or four axes creates gadget additions and
  // makes valid live-packaging fallbacks impossible.
  // A single documented axis can legitimately need a single molecule. The
  // old floor of two forced filler products into mono-axis dossiers and also
  // made complete one-molecule reports look invalid downstream.
  let minimumMolecules = activeGoals.length <= 1 ? activeGoals.length : Math.min(4, activeGoals.length);
  const maximumMolecules = goals.length <= 1 ? 2 : goals.length >= 4 ? 6 : 5;

  // A confirmed HPG axis needs its two distinct active levers. A conditional
  // HPG phase keeps the same two cards, but they are inactive and therefore
  // never count toward active-axis coverage. The GH axis still needs its two
  // distinct active secretagogues in addition to the other active axes.
  if (confirmedLowTestosterone && goals.length >= 2) {
    minimumMolecules = Math.max(minimumMolecules, 3);
  }
  if (confirmedLowTestosterone && goals.length >= 3) {
    minimumMolecules = Math.max(minimumMolecules, 4);
  }
  if (conditionalHpgPhase && secretagogueAxisRequired) {
    minimumMolecules = Math.min(4, minimumMolecules + 1);
  }

  return {
    goals,
    activeGoals,
    minimumMolecules,
    maximumMolecules,
    multiAxis: activeGoals.length >= 2,
    confirmedLowTestosterone,
    testosteroneGoal,
    testosteroneBloodworkStatus,
    conditionalHpgPhase,
    secretagogueAxisRequired,
  };
}
