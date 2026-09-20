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
    },
  );
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
});
