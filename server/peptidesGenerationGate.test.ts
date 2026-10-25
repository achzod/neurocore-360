import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import {
  findMissingActiveLivePricing,
  validateGeneratedPeptideStack,
} from "./peptidesGenerationGate";
import { derivePeptidesStackPolicy } from "./peptidesStackPolicy";

const active = (name = "BPC-157", purpose = "Recuperation tendineuse") => ({
  name,
  dosage: "250 mcg par jour",
  route: "Sous-cutanee",
  purpose,
  activationStatus: "active" as const,
});

const conditional = (name = "KissPeptin-10") => ({
  name,
  dosage: "Aucune dose personnelle activee.",
  route: "Phase conditionnelle inactive.",
  activationStatus: "conditional-inactive" as const,
});

test("the real generation gate accepts one active molecule for one axis", () => {
  const policy = derivePeptidesStackPolicy({ pep_primary_goal: "recovery" });
  assert.deepEqual(validateGeneratedPeptideStack([active()], policy), []);
});

test("a conditional card needs no numeric dosage and does not count as an active axis", () => {
  const policy = derivePeptidesStackPolicy({ pep_primary_goal: "recovery" });
  assert.deepEqual(validateGeneratedPeptideStack([active(), conditional()], policy), []);
  assert.ok(
    validateGeneratedPeptideStack([conditional()], policy).some((issue) =>
      issue.startsWith("ACTIVE_AXIS_GATE:"),
    ),
  );
});

test("the gate still enforces attributable multi-axis coverage", () => {
  const policy = derivePeptidesStackPolicy({
    pep_primary_goal: "fatloss",
    pep_secondary_goals: ["recovery", "skin-hair"],
  });
  assert.ok(
    validateGeneratedPeptideStack([active()], policy).some((issue) =>
      issue.startsWith("AXIS_COVERAGE_GATE:"),
    ),
  );
});

test("multi-axis coverage requires distinct active and attributable molecules", () => {
  const policy = derivePeptidesStackPolicy({
    pep_primary_goal: "fatloss",
    pep_secondary_goals: ["recovery", "skin-hair"],
  });
  assert.deepEqual(validateGeneratedPeptideStack([
    active("Retatrutide", "Perte de graisse et appetit"),
    active("BPC-157", "Recuperation tendineuse"),
    active("GHK-Cu", "Peau et cheveux"),
  ], policy), []);

  const duplicateCoverage = validateGeneratedPeptideStack([
    active("Retatrutide", "Perte de graisse et appetit"),
    active("Retatrutide", "Recuperation tendineuse"),
    active("GHK-Cu", "Peau et cheveux"),
  ], policy);
  assert.ok(duplicateCoverage.some((issue) => issue.startsWith("AXIS_COVERAGE_GATE:")));
  assert.ok(duplicateCoverage.some((issue) => issue.startsWith("AXIS_ATTRIBUTION_GATE:")));
});

test("a negated objective mention never creates attributable axis coverage", () => {
  const policy = derivePeptidesStackPolicy({
    pep_primary_goal: "fatloss",
    pep_secondary_goals: ["recovery"],
  });
  const issues = validateGeneratedPeptideStack([
    active("Retatrutide", "Perte de graisse et appetit"),
    active("Semaglutide", "N’est pas destiné à la récupération et ne couvre que le metabolisme"),
  ], policy);
  assert.ok(issues.some((issue) => issue.startsWith("AXIS_ATTRIBUTION_GATE:")));
});

test("conditional cards never satisfy the active minimum", () => {
  const policy = derivePeptidesStackPolicy({
    pep_primary_goal: "fatloss",
    pep_secondary_goals: ["recovery", "skin-hair"],
  });
  const issues = validateGeneratedPeptideStack([
    active("Retatrutide", "Perte de graisse et appetit"),
    active("BPC-157", "Recuperation tendineuse"),
    conditional("GHK-Cu"),
  ], policy);
  assert.ok(issues.some((issue) => issue.startsWith("AXIS_COVERAGE_GATE:")));
  assert.ok(issues.some((issue) => issue.startsWith("AXIS_ATTRIBUTION_GATE:")));
});

test("live pricing is mandatory only for active molecules", () => {
  assert.deepEqual(
    findMissingActiveLivePricing(
      [active("MOTS-c"), conditional("KissPeptin-10")],
      [{ peptide: "MOTS-c" }],
    ),
    [],
  );
  assert.deepEqual(findMissingActiveLivePricing([active("MOTS-c")], []), ["MOTS-c"]);
});

test("the engine applies the same gate before and after deterministic pruning", () => {
  const source = readFileSync(new URL("./peptidesEngine.ts", import.meta.url), "utf8");
  assert.equal((source.match(/validateGeneratedPeptideStack\(/g) || []).length, 2);
  assert.doesNotMatch(source, /report\.peptides\.length < 2/);
  assert.match(source, /findMissingActiveLivePricing\(/);
});
