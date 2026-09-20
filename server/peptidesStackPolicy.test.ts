import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { derivePeptidesStackPolicy } from "./peptidesStackPolicy";

test("three distinct goals require a five-molecule stack", () => {
  assert.deepEqual(
    derivePeptidesStackPolicy({
      pep_primary_goal: "fatloss",
      pep_secondary_goals: ["recovery", "skin-hair"],
      pep_budget: "50-100",
    }),
    {
      goals: ["fatloss", "recovery", "skin-hair"],
      minimumMolecules: 5,
      maximumMolecules: 5,
      multiAxis: true,
      confirmedLowTestosterone: false,
      testosteroneGoal: false,
      testosteroneBloodworkStatus: "",
      conditionalHpgPhase: false,
      secretagogueAxisRequired: false,
    },
  );
});

test("old testosterone bloodwork keeps KissPeptin and Enclomiphene as a conditional HPG phase", () => {
  const policy = derivePeptidesStackPolicy({
    pep_primary_goal: "fatloss",
    pep_secondary_goals: ["testo-boost", "gh-antiaging"],
    pep_testo_bloodwork: "old",
  });
  assert.equal(policy.minimumMolecules, 5);
  assert.equal(policy.conditionalHpgPhase, true);
  assert.equal(policy.secretagogueAxisRequired, true);
});

test("confirmed HPG plus two other axes requires five molecules", () => {
  assert.equal(
    derivePeptidesStackPolicy({
      pep_primary_goal: "fatloss",
      pep_secondary_goals: ["testo-boost", "gh-antiaging"],
      pep_testo_bloodwork: "recent-low",
    }).minimumMolecules,
    5,
  );
});

test("final retry cannot collapse to two molecules", () => {
  const source = readFileSync(new URL("./peptidesEngine.ts", import.meta.url), "utf8");
  assert.doesNotMatch(source, /2 peptides maximum si necessaire/);
  assert.match(source, /AXIS_COVERAGE_GATE/);
  assert.match(source, /Ne supprime jamais silencieusement un objectif valide/);
  assert.match(source, /CONDITIONAL_HPG_GATE/);
  assert.match(source, /SECRETAGOGUE_AXIS_GATE/);
  assert.match(source, /Enclomiphene et KissPeptin-10 doivent rester dans le stack/);
});
