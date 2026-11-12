import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { derivePeptidesStackPolicy } from "./peptidesStackPolicy";

test("one documented axis accepts one attributable molecule without filler", () => {
  const policy = derivePeptidesStackPolicy({
    pep_primary_goal: "fatloss",
    pep_secondary_goals: [],
  });
  assert.deepEqual(policy.goals, ["fatloss"]);
  assert.equal(policy.minimumMolecules, 1);
  assert.equal(policy.maximumMolecules, 2);
  assert.equal(policy.multiAxis, false);
});

test("three distinct goals require attributable coverage without gadget molecules", () => {
  assert.deepEqual(
    derivePeptidesStackPolicy({
      pep_primary_goal: "fatloss",
      pep_secondary_goals: ["recovery", "skin-hair"],
      pep_budget: "50-100",
    }),
    {
      goals: ["fatloss", "recovery", "skin-hair"],
      activeGoals: ["fatloss", "recovery", "skin-hair"],
      minimumMolecules: 3,
      maximumMolecules: 5,
      multiAxis: true,
      confirmedLowTestosterone: false,
      testosteroneGoal: false,
      testosteroneBloodworkStatus: "",
      conditionalHpgPhase: false,
      secretagogueAxisRequired: false,
      secretagogueDiabetesReviewRequired: false,
    },
  );
});

test("old testosterone bloodwork keeps KissPeptin and Enclomiphene as a conditional HPG phase", () => {
  const policy = derivePeptidesStackPolicy({
    pep_primary_goal: "fatloss",
    pep_secondary_goals: ["testo-boost", "gh-antiaging"],
    pep_testo_bloodwork: "old",
  });
  assert.deepEqual(policy.activeGoals, ["fatloss", "gh-antiaging"]);
  assert.equal(policy.minimumMolecules, 3);
  assert.equal(policy.conditionalHpgPhase, true);
  assert.equal(policy.secretagogueAxisRequired, true);
});

test("four distinct axes do not force six molecules", () => {
  const policy = derivePeptidesStackPolicy({
    pep_primary_goal: "fatloss",
    pep_secondary_goals: ["recovery", "gh-antiaging", "testo-boost"],
    pep_testo_bloodwork: "recent-low",
  });
  assert.equal(policy.minimumMolecules, 4);
  assert.equal(policy.maximumMolecules, 6);
  assert.equal(policy.confirmedLowTestosterone, true);
  assert.equal(policy.secretagogueAxisRequired, true);
});

test("confirmed HPG plus two other axes keeps both HPG levers without filler", () => {
  assert.equal(
    derivePeptidesStackPolicy({
      pep_primary_goal: "fatloss",
      pep_secondary_goals: ["testo-boost", "gh-antiaging"],
      pep_testo_bloodwork: "recent-low",
    }).minimumMolecules,
    4,
  );
});

test("four non-HPG axes accept one attributable molecule per axis", () => {
  const policy = derivePeptidesStackPolicy({
    pep_primary_goal: "fatloss",
    pep_secondary_goals: ["recovery", "skin-hair", "endurance"],
  });
  assert.deepEqual(policy.goals, ["fatloss", "recovery", "skin-hair", "endurance"]);
  assert.deepEqual(policy.activeGoals, policy.goals);
  assert.equal(policy.minimumMolecules, 4);
  assert.equal(policy.maximumMolecules, 6);
});

test("final retry cannot collapse to two molecules", () => {
  const engine = readFileSync(new URL("./peptidesEngine.ts", import.meta.url), "utf8");
  const generationGate = readFileSync(new URL("./peptidesGenerationGate.ts", import.meta.url), "utf8");
  assert.doesNotMatch(engine, /2 peptides maximum si necessaire/);
  assert.match(generationGate, /AXIS_COVERAGE_GATE/);
  assert.match(generationGate, /STACK_REDUNDANCY_GATE/);
  assert.match(engine, /validateGeneratedPeptideStack/);
  assert.match(engine, /requireExplicitAxisCoverage: true/);
  assert.match(engine, /POST_PRUNING_/);
  assert.match(engine, /CONDITIONAL_HPG_GATE/);
  assert.match(engine, /SECRETAGOGUE_AXIS_GATE/);
  assert.match(engine, /Enclomiphene et KissPeptin-10 doivent rester dans le stack/);
  assert.match(engine, /Sur un dossier mono-axe actif, vise une seule molecule par defaut/);
});

test("declared diabetes does not force the GH pair for a longevity objective", () => {
  for (const conditions of [["diabetes"], "diabetes", ["DIABETES"]]) {
    const policy = derivePeptidesStackPolicy({
      pep_primary_goal: "fatloss",
      pep_secondary_goals: ["gh-antiaging", "cognitive", "testo-boost", "libido"],
      pep_testo_bloodwork: "recent-normal",
      pep_conditions: conditions,
    });
    assert.equal(policy.secretagogueAxisRequired, false);
    assert.equal(policy.secretagogueDiabetesReviewRequired, true);
    assert.deepEqual(policy.activeGoals, ["fatloss", "gh-antiaging", "cognitive", "libido"]);
    assert.equal(policy.minimumMolecules, 4);
  }
});

test("GH request without declared diabetes retains its existing coverage gate", () => {
  for (const conditions of [undefined, [], ["none"], ["thyroid"]]) {
    const policy = derivePeptidesStackPolicy({pep_primary_goal: "gh-antiaging", pep_conditions: conditions});
    assert.equal(policy.secretagogueAxisRequired, true);
    assert.equal(policy.secretagogueDiabetesReviewRequired, false);
  }
});
