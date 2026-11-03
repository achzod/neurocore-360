import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import {
  findMissingActiveLivePricing,
  validateGeneratedPeptideStack,
} from "./peptidesGenerationGate";
import { derivePeptidesStackPolicy } from "./peptidesStackPolicy";

const active = (
  name = "BPC-157",
  purpose = "Recuperation tendineuse",
  coveredAxes?: string[],
) => ({
  name,
  ...(coveredAxes ? { coveredAxes } : {}),
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

test("French apostrophe and aucunement negations never create axis coverage", () => {
  const policy = derivePeptidesStackPolicy({
    pep_primary_goal: "fatloss",
    pep_secondary_goals: ["recovery"],
  });
  for (const purpose of [
    "N’améliore pas la récupération et cible seulement le metabolisme",
    "Ne soutient aucunement la récupération et cible seulement le metabolisme",
    "Doesn't improve recovery and only targets metabolism",
    "Will not improve recovery and only targets metabolism",
    "N’aide pas la récupération et cible seulement le metabolisme",
    "Offers no recovery benefit and only targets metabolism",
    "Does not provide recovery benefits and only targets metabolism",
    "Doesn’t offer recovery support and only targets metabolism",
    "Ne permet pas la récupération et cible seulement le metabolisme",
  ]) {
    const issues = validateGeneratedPeptideStack([
      active("Retatrutide", "Perte de graisse et appetit"),
      active("Semaglutide", purpose),
    ], policy);
    assert.ok(issues.some((issue) => issue.startsWith("AXIS_ATTRIBUTION_GATE:")), purpose);
  }
});

test("a conditional HPG phase is excluded from active-axis attribution", () => {
  const policy = derivePeptidesStackPolicy({
    pep_primary_goal: "testo-boost",
    pep_secondary_goals: ["gh-antiaging", "fatloss", "skin-hair"],
    pep_testo_bloodwork: "old",
  });
  assert.deepEqual(policy.activeGoals, ["gh-antiaging", "fatloss", "skin-hair"]);
  assert.equal(policy.minimumMolecules, 4);
  assert.deepEqual(validateGeneratedPeptideStack([
    active("CJC-1295 sans DAC", "Axe GH et longevite"),
    active("Ipamorelin", "Axe GH et hormone de croissance"),
    active("Retatrutide", "Perte de graisse et appetit"),
    active("GHK-Cu", "Peau et cheveux"),
    conditional("Enclomiphene Citrate"),
    conditional("KissPeptin-10"),
  ], policy), []);
});

test("Esteban recent-normal HPG is excluded and explicit active-axis coverage is enforced", () => {
  const policy = derivePeptidesStackPolicy({
    pep_primary_goal: "recovery",
    pep_secondary_goals: ["gh-antiaging", "testo-boost"],
    pep_testo_bloodwork: "recent-normal",
  });
  assert.deepEqual(policy.activeGoals, ["recovery", "gh-antiaging"]);
  assert.equal(policy.minimumMolecules, 2);

  const rejectedCandidate = [
    active("BPC-157", "Recuperation des epaules"),
    active("TB-500", "Recuperation musculosquelettique"),
    active("CJC-1295 avec DAC", "Axe GH et anti-age"),
  ];
  const issues = validateGeneratedPeptideStack(rejectedCandidate, policy, {
    requireExplicitAxisCoverage: true,
  });
  assert.ok(issues.some((issue) =>
    issue.includes("Axes absents: recovery, gh-antiaging")
    && issue.includes("coveredAxes")
  ));

  assert.deepEqual(validateGeneratedPeptideStack([
    active("BPC-157", "Recuperation des epaules", ["recovery"]),
    active("CJC-1295 sans DAC", "Axe GH", ["gh-antiaging"]),
    active("Ipamorelin", "Secretagogue GH complementaire", ["gh-antiaging"]),
  ], policy, { requireExplicitAxisCoverage: true }), []);
});

test("Jihed requires three explicit and distinct active-axis attributions", () => {
  const policy = derivePeptidesStackPolicy({
    pep_primary_goal: "fatloss",
    pep_secondary_goals: ["recovery", "fatloss", "endurance"],
  });
  assert.deepEqual(policy.activeGoals, ["fatloss", "recovery", "endurance"]);
  assert.equal(policy.minimumMolecules, 3);

  assert.deepEqual(validateGeneratedPeptideStack([
    active("Retatrutide", "Perte de graisse", ["fatloss"]),
    active("BPC-157", "Recuperation", ["recovery"]),
    active("MOTS-c", "Endurance", ["endurance"]),
  ], policy, { requireExplicitAxisCoverage: true }), []);

  const sharedCard = validateGeneratedPeptideStack([
    active("Retatrutide", "Perte de graisse", ["fatloss"]),
    active("BPC-157", "Recuperation et endurance", ["recovery", "endurance"]),
    active("GHK-Cu", "Bonus", []),
  ], policy, { requireExplicitAxisCoverage: true });
  assert.ok(sharedCard.some((issue) =>
    issue.includes("Une meme molecule ne peut pas couvrir plusieurs axes")
  ));
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
  assert.equal((source.match(/requireExplicitAxisCoverage: true/g) || []).length, 2);
  assert.match(source, /"coveredAxes"/);
});
