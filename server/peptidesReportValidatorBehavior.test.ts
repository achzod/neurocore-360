import assert from "node:assert/strict";
import test from "node:test";

import {
  checkPeptide,
  estimateNeedMg,
  findConditionalInactiveOperationalMentions,
  validateU100Reconstitution,
} from "./peptidesReportValidator";

test("U-100 validation checks every conversion in one text", () => {
  const issues = validateU100Reconstitution(
    "Vial 5mg + 2ml BAC water = 2.5 mg/ml. "
      + "Pour 0.5mg = 20 unites U-100 (soit 0.20 ml). "
      + "Pour 1mg = 90 unites U-100 (soit 0.90 ml).",
  );
  assert.ok(issues.some((issue) => issue.includes("90 unites affichees vs 40.0")));
  assert.ok(issues.some((issue) => issue.includes("0.90 ml affiche vs 0.40 ml")));
});

test("U-100 validation rejects a later false conversion written with parenthetical ml", () => {
  const issues = validateU100Reconstitution(
    "Vial 10mg + 2ml BAC water. Pour 1mg = 20 unites U-100 (0.20 ml). "
      + "Puis pour 2mg = 99 unites U-100 (0.40 ml).",
  );
  assert.ok(issues.some((issue) => issue.includes("99 unites affichees vs 40.0")));
});

test("U-100 validation catches a false conversion introduced as a palier", () => {
  const issues = validateU100Reconstitution(
    "Vial 10mg + 2ml BAC water. Pour 1mg = 20 unites U-100 (0.20 ml). "
      + "Palier 2mg = 99 unites U-100 (0.40 ml).",
  );
  assert.ok(issues.some((issue) => issue.includes("99 unites affichees vs 40.0")));
});

test("U-100 validation blocks an unpaired dose instead of silently skipping it", () => {
  const issues = validateU100Reconstitution(
    "Vial 10mg + 2ml BAC water. Pour 1mg = 20 unites U-100 (0.20 ml). Pour 2mg, voir tableau.",
  );
  assert.ok(issues.some((issue) => issue.includes("conversion U-100 incomplete")));
});

test("U-100 validation keeps each conversion attached to its vial context", () => {
  const issues = validateU100Reconstitution(
    "Vial 5mg + 1ml BAC water. Pour 1mg = 20 unites U-100 (soit 0.20 ml). "
      + "Vial 10mg + 2ml BAC water. Pour 1mg = 50 unites U-100 (soit 0.50 ml).",
  );
  assert.ok(issues.some((issue) => issue.includes("50 unites affichees vs 20.0")));
});

test("conditional inactive cards require every operational field to be structurally empty", () => {
  const issues = checkPeptide({
    name: "KissPeptin-10",
    activationStatus: "conditional-inactive",
    activationRequirements: ["Bilan recent", "Validation explicite"],
    evidenceSummary: "Option documentee mais inactive.",
    purpose: "Documenter l axe HPG.",
    whyThisPeptide: "Piste conditionnelle.",
    dosage: "Prendre selon tolerance",
    timing: "Chaque nuit",
    route: "Voie sous-cutanee",
    cycleDuration: "",
    reconstitution: "",
    vialsNeeded: "",
    priceEstimate: "",
    purchaseUrl: "https://www.peptaura.com/catalog/KissPeptin-10",
  });
  assert.ok(issues.some((issue) => issue.includes("champs operationnels non vides")));
});

test("conditional inactive cards cannot leak into operational report surfaces", () => {
  const peptide = { name: "KissPeptin-10", activationStatus: "conditional-inactive" as const };
  assert.deepEqual(findConditionalInactiveOperationalMentions({
    peptides: [peptide],
    weeklySchedule: "LUNDI: KissPeptin-10 100 mcg.",
    shoppingList: "KissPeptin-10: 2 vials a commander.",
    sections: [
      { id: "rationale", content: "KissPeptin-10 reste une option conditionnelle non active." },
      { id: "securite", content: "Injecte KissPeptin-10 le soir a 100 mcg." },
    ],
  }), [
    "KissPeptin-10: mention interdite dans weeklySchedule",
    "KissPeptin-10: mention interdite dans shoppingList",
    "KissPeptin-10: mention operationnelle interdite dans la section securite",
  ]);
});

test("a purely narrative conditional mention remains allowed", () => {
  assert.deepEqual(findConditionalInactiveOperationalMentions({
    peptides: [{ name: "KissPeptin-10", activationStatus: "conditional-inactive" }],
    weeklySchedule: "LUNDI: repos.",
    shoppingList: "BAC Water uniquement.",
    sections: [{ id: "rationale", content: "KissPeptin-10 reste une option conditionnelle non active." }],
  }), []);

  const operational = findConditionalInactiveOperationalMentions({
    peptides: [{ name: "KissPeptin-10", activationStatus: "conditional-inactive" }],
    weeklySchedule: "LUNDI: repos.",
    shoppingList: "BAC Water uniquement.",
    sections: [{ id: "rationale", content: "Administre KissPeptin-10 chaque nuit selon tolerance." }],
  });
  assert.ok(operational.some((issue) => issue.includes("section rationale")));
});

test("progressive titration accepts microgram aliases without falling through", () => {
  assert.equal(estimateNeedMg({
    dosage: "100 µg semaine 1, 200 ug semaine 2, 300 mcg semaine 3, 400 µg semaine 4, chaque jour",
    cycleDuration: "4 semaines",
  }), 7);
});

test("reverse titration starts at its first declared week and forward-fills holes", () => {
  assert.equal(estimateNeedMg({
    dosage: "semaine 3 a 1 mg, semaine 6 a 2 mg, une injection par semaine",
    cycleDuration: "8 semaines",
  }), 9);
});

test("reverse titration is chronological even when points are written backwards", () => {
  assert.equal(estimateNeedMg({
    dosage: "semaine 5 a 2 mg, semaine 2 a 1 mg, une injection par semaine",
    cycleDuration: "6 semaines",
  }), 7);
});

test("reverse titration ignores inverted ranges without retro-propagating", () => {
  assert.equal(estimateNeedMg({
    dosage: "semaines 6 a 4 a 9 mg, semaine 3 a 1 mg, semaine 5 a 2 mg, une injection par semaine",
    cycleDuration: "7 semaines",
  }), 8);
});
