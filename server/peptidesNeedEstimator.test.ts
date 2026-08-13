import assert from "node:assert/strict";
import test from "node:test";
import { estimateNeedMg } from "./peptidesReportValidator";

test("French une fois par semaine is multiplied across the full cycle", () => {
  for (const frequency of ["une fois par semaine", "1 fois par semaine", "hebdomadaire", "chaque semaine", "1x/sem"]) {
    assert.equal(estimateNeedMg({
      dosage: `5 mg ${frequency}`,
      cycleDuration: "8 semaines",
    }), 40, frequency);
  }
});
