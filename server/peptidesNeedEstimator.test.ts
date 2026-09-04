import assert from "node:assert/strict";
import test from "node:test";
import { preferredStagedVialMgForCycle } from "./peptidesEngine";
import { estimateNeedMg } from "./peptidesReportValidator";

test("French une fois par semaine is multiplied across the full cycle", () => {
  for (const frequency of ["une fois par semaine", "1 fois par semaine", "hebdomadaire", "chaque semaine", "1x/sem"]) {
    assert.equal(estimateNeedMg({
      dosage: `5 mg ${frequency}`,
      cycleDuration: "8 semaines",
    }), 40, frequency);
  }
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
