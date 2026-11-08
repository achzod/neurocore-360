import assert from "node:assert/strict";
import test from "node:test";
import { preferredStagedVialMgForCycle, validateVialsMath } from "./peptidesEngine";
import { estimateNeedMg } from "./peptidesReportValidator";

test("French une fois par semaine is multiplied across the full cycle", () => {
  for (const frequency of ["une fois par semaine", "1 fois par semaine", "hebdomadaire", "chaque semaine", "1x/sem"]) {
    assert.equal(estimateNeedMg({
      dosage: `5 mg ${frequency}`,
      cycleDuration: "8 semaines",
    }), 40, frequency);
  }
});

test("French daily frequencies are multiplied across the full cycle", () => {
  assert.ok(Math.abs((estimateNeedMg({
    dosage: "300 mcg une fois par jour",
    cycleDuration: "12 semaines",
  }) || 0) - 25.2) < 1e-9);
  assert.equal(estimateNeedMg({
    dosage: "250 mcg deux fois par jour",
    cycleDuration: "9 semaines",
  }), 31.5);
});

test("daily wording wins over a later explanatory weekly phrase", () => {
  assert.equal(estimateNeedMg({
    dosage: "2 mg chaque jour, soit 21,3 mcg/kg, sept administrations par semaine.",
    cycleDuration: "8 semaines actives, soit 56 jours.",
  }), 112);
  assert.equal(estimateNeedMg({
    dosage: "2 mg chaque jour, sept administrations par semaine.",
    cycleDuration: "5 semaines actives, soit 35 jours.",
  }), 70);
  assert.equal(estimateNeedMg({
    dosage: "100 mcg une fois par jour, soit 1,33 mcg/kg pour 75 kg, pendant chaque semaine active.",
    cycleDuration: "12 semaines actives, 4 semaines de pause, puis 12 semaines actives. Besoin actif: 0,1 mg x 7 x 24 égale 16,8 mg.",
  }), 16.8);
});

test("a split active cycle sums active windows but excludes the pause", () => {
  assert.equal(estimateNeedMg({
    dosage: "100 mcg une fois par jour pendant chaque semaine active.",
    cycleDuration: "12 semaines actives, 4 semaines de pause, puis 12 semaines actives.",
  }), 16.8);
  assert.equal(estimateNeedMg({
    dosage: "100 mcg une fois par jour pendant chaque semaine active.",
    cycleDuration: "24 semaines actives au total, réparties en 12 semaines actives, 4 semaines de pause, puis 12 semaines actives.",
  }), 16.8);
});

test("French worded twice-weekly frequency is not collapsed to once weekly", () => {
  assert.equal(estimateNeedMg({
    dosage: "2,5 mg par administration, deux fois par semaine. Total hebdomadaire 5 mg.",
    cycleDuration: "4 semaines actives.",
  }), 20);
});

test("multi-phase weekly titration sums every declared range", () => {
  assert.equal(estimateNeedMg({
    dosage: "0,5 mg par semaine (semaines 1 à 4), puis 1 mg par semaine (semaines 5 à 8), puis 1,625 mg par semaine (semaines 9 à 12)",
    cycleDuration: "12 semaines",
  }), 12.5);
});

test("French et ranges preserve late taper weeks in a staged weekly cycle", () => {
  const dosage = "Semaines 1 à 4: 2,5 mg une fois par semaine. Semaines 5 à 14: 5 mg une fois par semaine. Semaines 15 et 16: 2,5 mg une fois par semaine. Semaines 17 et 18: 1,25 mg une fois par semaine, puis arrêt.";
  assert.equal(estimateNeedMg({ dosage, cycleDuration: "18 semaines au total" }), 67.5);

  const report = validateVialsMath({
    clientName: "Sacha",
    tier: "tracked",
    sections: [],
    peptides: [{
      name: "Tirzepatide",
      purpose: "fatloss",
      dosage,
      timing: "Chaque lundi",
      route: "SC",
      cycleDuration: "18 semaines au total",
      purchaseUrl: "https://www.peptaura.com/catalog/Tirzepatide",
      priceEstimate: "$10/vial × 10 vials = $100 total",
      vialsNeeded: "10 vials de 10mg",
      reconstitution: "Vial de 10 mg + 1 ml de BAC water",
    }],
    bloodMarkers: [],
    weeklySchedule: "",
    shoppingList: "",
    promoCodesGenerated: [],
  });
  assert.equal(report.peptides[0]._vialPlanning?.pharmacologicalNeedMg, 67.5);
  assert.equal(report.peptides[0]._vialPlanning?.mathematicalMinimumVials, 7);
});

test("per administration wins over a later per-kg explanatory value", () => {
  assert.equal(estimateNeedMg({
    dosage: "100 mcg par administration, 5 soirs par semaine, soit 1,34 mcg/kg par injection et 500 mcg par semaine",
    cycleDuration: "10 semaines à dose fixe, puis pause complète de 4 semaines",
  }), 5);
});

test("an explicit weekly total is never multiplied again by another frequency phrase", () => {
  assert.equal(estimateNeedMg({
    dosage: "500 mcg par semaine, répartis sur 5 soirs par semaine",
    cycleDuration: "10 semaines",
  }), 5);
});

test("multi-week weekly MOTS-c uses staged two-dose vials", () => {
  assert.equal(preferredStagedVialMgForCycle({
    name: "MOTS-c",
    dosage: "5 mg une fois par semaine, soit 67,11 mcg/kg par semaine pour 74,5 kg",
    cycleDuration: "8 semaines, de la semaine 3 à la semaine 10",
  }), 10);
});

test("compact French weekly notation remains parseable for MOTS-c delivery repair", () => {
  assert.equal(preferredStagedVialMgForCycle({
    name: "MOTS-c",
    dosage: "5 mg/semaine, soit 5000 mcg/semaine et 51.5 mcg/kg/semaine pour 97 kg, pendant 8 semaines.",
    cycleDuration: "8 semaines, uniquement semaines 1 a 8 du cycle Retatrutide, puis arret.",
  }), 10);
});
