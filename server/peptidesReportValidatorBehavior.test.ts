import assert from "node:assert/strict";
import test from "node:test";

import {
  checkPeptide,
  estimateNeedMg,
  findConditionalInactiveOperationalMentions,
  validatePeptidesReport,
  validateU100Reconstitution,
} from "./peptidesReportValidator";

test("U-100 validation rejects arithmetic based on a cycle total instead of an operational dose", () => {
  const issues = validateU100Reconstitution(
    "Vial 5mg + 2ml BAC water = 2.50 mg/ml. Pour 25.2mg = 1008.0 unites U-100 (soit 10.08 ml).",
    "300 mcg par injection, 7/7 pendant 12 semaines, total du cycle 25,2 mg",
  );
  assert.ok(issues.some((issue) => /absente du dosage operationnel/.test(issue)));
});

test("strict validator enforces explicit Esteban and Jihed active-axis contracts", () => {
  const strict = (profile: { primaryGoal: string; secondaryGoals: string[] }, peptides: any[]) =>
    validatePeptidesReport({
      qualityVersion: "expert-standard-v1",
      tier: "coached",
      clientName: "Axis fixture",
      peptides,
      sections: [],
      weeklySchedule: "",
      shoppingList: "",
      bloodMarkers: [],
      _validationContext: {
        confirmedLowTestosterone: false,
        profile,
      },
    }).errors.filter((issue) => issue.startsWith("AXIS_") || issue.startsWith("ACTIVE_AXIS_"));

  const card = (name: string, coveredAxes?: string[]) => ({
    name,
    coveredAxes,
    activationStatus: "active" as const,
    dosage: "1 mg par semaine",
    route: "Sous-cutanee",
    purpose: coveredAxes?.join(", ") || "objectif",
  });

  assert.deepEqual(strict({
    primaryGoal: "recovery",
    secondaryGoals: ["gh-antiaging", "testo-boost"],
  }, [
    card("BPC-157", ["recovery"]),
    card("CJC-1295 sans DAC", ["gh-antiaging"]),
    card("Ipamorelin", ["gh-antiaging"]),
  ]), []);

  assert.deepEqual(strict({
    primaryGoal: "fatloss",
    secondaryGoals: ["recovery", "fatloss", "endurance"],
  }, [
    card("Retatrutide", ["fatloss"]),
    card("BPC-157", ["recovery"]),
    card("MOTS-c", ["endurance"]),
  ]), []);

  const missingEndurance = strict({
    primaryGoal: "fatloss",
    secondaryGoals: ["recovery", "endurance"],
  }, [
    card("Retatrutide", ["fatloss"]),
    card("BPC-157", ["recovery"]),
    card("GHK-Cu", []),
  ]);
  assert.ok(missingEndurance.some((issue) => issue.includes("Axes absents: endurance")));
});

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

test("U-100 validation catches common graduation wording", () => {
  const issues = validateU100Reconstitution(
    "Vial 10mg + 2ml BAC water. Pour 1mg = 20 unites U-100 (0.20 ml). "
      + "2 mg correspondent à 99 graduations sur la seringue U-100, soit 0.99 ml.",
  );
  assert.ok(issues.some((issue) => issue.includes("99 unites affichees vs 40.0")));
  assert.ok(issues.some((issue) => issue.includes("0.99 ml affiche vs 0.40 ml")));
});

test("U-100 validation catches compact U and U-100 notation", () => {
  const compact = validateU100Reconstitution(
    "Vial 10mg + 2ml BAC water. Pour 1mg = 20 U (0.20 ml). 2mg = 99 U (0.99 ml).",
  );
  assert.ok(compact.some((issue) => issue.includes("99 unites affichees vs 40.0")));
  assert.ok(compact.some((issue) => issue.includes("0.99 ml affiche vs 0.40 ml")));

  const labeled = validateU100Reconstitution(
    "Vial 10mg + 2ml BAC water. Pour 1mg = 20 U-100 (0.20 ml). "
      + "2mg correspond à 99 U-100, soit 0.99 ml.",
  );
  assert.ok(labeled.some((issue) => issue.includes("99 unites affichees vs 40.0")));
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

test("U-100 validation accepts complete natural French plus and preleve wording", () => {
  assert.deepEqual(validateU100Reconstitution(
    "Vial 10 mg plus 2 mL de BAC water égale 5 mg/mL. "
      + "Pour 2 mg, prélève 40 unités, soit 0,40 mL. "
      + "Pour 4 mg, prélève 80 unités, soit 0,80 mL. "
      + "Pour 1 mg, prélève 20 unités, soit 0,20 mL.",
  ), []);
  assert.deepEqual(validateU100Reconstitution(
    "Vial 10 mg plus 1 mL de BAC water égale 10 mg/mL. "
      + "Pour 10 mg, prélève 100 unités U-100, soit 1 mL.",
  ), []);
});

test("an injectable card accepts the same complete natural French U-100 wording", () => {
  const issues = checkPeptide({
    name: "Epitalon",
    activationStatus: "active",
    activationRequirements: [],
    evidenceSummary: "Données et limites documentées.",
    purpose: "Phase courte",
    whyThisPeptide: "Choix attribuable.",
    dosage: "10 mg par jour pendant 20 jours consécutifs",
    timing: "Le matin",
    route: "Sous-cutanée",
    cycleDuration: "20 jours consécutifs",
    reconstitution: "Vial 10 mg plus 1 mL de BAC water égale 10 mg/mL. Pour 10 mg, prélève 100 unités U-100, soit 1 mL.",
    vialsNeeded: "20 vials de 10 mg",
    priceEstimate: "$7/vial × 20 vials = $140 total",
    purchaseUrl: "https://www.peptaura.com/product/epitalon",
    expectedEffects: "Effets documentés sans garantie.",
    contraindications: "Contre-indications documentées.",
    monitoring: "Suivi documenté.",
  });
  assert.equal(issues.includes("calcul complet de reconstitution U-100 absent"), false);
});

test("commercial vial quantities must match exactly", () => {
  const issues = checkPeptide({
    name: "BPC-157",
    activationStatus: "active",
    activationRequirements: [],
    evidenceSummary: "Donnees et limites documentees.",
    purpose: "Recuperation",
    whyThisPeptide: "Choix attribuable.",
    dosage: "1 mg par semaine",
    timing: "Lundi",
    route: "Sous-cutanee",
    cycleDuration: "4 semaines",
    reconstitution: "Vial de 10mg + 2ml BAC; 1mg = 20 U = 0.20 ml.",
    vialsNeeded: "4 vials de 10mg",
    priceEstimate: "$50/vial × 5 vials = $250 total",
    purchaseUrl: "https://www.peptaura.com/catalog/bpc-157",
  });
  assert.ok(issues.some((issue) => issue.includes("vialsNeeded qty (4) vs priceEstimate qty (5) divergent")));
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

  const compoundAliases = findConditionalInactiveOperationalMentions({
    peptides: [{ name: "CJC-1295 sans DAC + Ipamorelin", activationStatus: "conditional-inactive" }],
    weeklySchedule: "CJC sans DAC 100 mcg + Ipamoréline 100 mcg chaque nuit.",
    shoppingList: "Commander 2 vials CJC sans DAC.",
    sections: [{ id: "protocole", content: "Injecte CJC sans DAC chaque nuit." }],
  });
  assert.ok(compoundAliases.some((issue) => issue.includes("weeklySchedule")));
  assert.ok(compoundAliases.some((issue) => issue.includes("shoppingList")));
  assert.ok(compoundAliases.some((issue) => issue.includes("section protocole")));
});

test("progressive titration accepts microgram aliases without falling through", () => {
  assert.equal(estimateNeedMg({
    dosage: "100 µg semaine 1, 200 ug semaine 2, 300 mcg semaine 3, 400 µg semaine 4, chaque jour",
    cycleDuration: "4 semaines",
  }), 7);
  assert.equal(estimateNeedMg({
    dosage: "S1: 100 mcg, S2: 200 mcg, S3: 300 mcg, S4: 400 mcg, chaque jour",
    cycleDuration: "4 semaines",
  }), 7);
});

test("shorthand week ranges apply every plateau without treating range ends as points", () => {
  assert.equal(estimateNeedMg({
    dosage: "S1-S4: 100 mcg, S5-S8: 200 mcg, chaque jour",
    cycleDuration: "8 semaines",
  }), 8.4);
});

test("compact weekly frequencies scale every shorthand plateau", () => {
  assert.equal(estimateNeedMg({
    dosage: "S1-S4: 1 mg, S5-S8: 2 mg, 2x/semaine",
    cycleDuration: "8 semaines",
  }), 24);
  assert.equal(estimateNeedMg({
    dosage: "S1-S2: 1 mg, S3-S4: 2 mg, 3x/sem",
    cycleDuration: "4 semaines",
  }), 18);
});

test("weekly ranges use the chronologically last plateau even when written out of order", () => {
  assert.equal(estimateNeedMg({
    dosage: "2 mg par semaine (semaines 5 à 8), puis 1 mg par semaine (semaines 1 à 4)",
    cycleDuration: "10 semaines",
  }), 16);
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
