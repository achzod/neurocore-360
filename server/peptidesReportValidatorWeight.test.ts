import assert from "node:assert/strict";
import test from "node:test";

import { reportMentionsWeightKg } from "./peptidesReportValidator.ts";

test("weight validator accepts equivalent point and comma decimals", () => {
  assert.equal(reportMentionsWeightKg("Poids mesure : 74.5 kg.", 74.5), true);
  assert.equal(reportMentionsWeightKg("Poids mesure : 74,5 kg.", 74.5), true);
  assert.equal(reportMentionsWeightKg("Poids mesure : 74,50 kg.", 74.5), true);
});

test("weight validator accepts whitespace without changing the numeric value", () => {
  assert.equal(reportMentionsWeightKg("Poids mesure : 74 , 5   kg.", 74.5), true);
  assert.equal(reportMentionsWeightKg("Poids mesure : 74,5\u00a0kg.", 74.5), true);
});

test("weight validator accepts integer weights with optional zero decimals", () => {
  assert.equal(reportMentionsWeightKg("Poids mesure : 74 kg.", 74), true);
  assert.equal(reportMentionsWeightKg("Poids mesure : 74,00 kg.", 74), true);
});

test("weight validator rejects nearby values and embedded numeric false positives", () => {
  for (const text of [
    "Poids mesure : 74 kg.",
    "Poids mesure : 74,55 kg.",
    "Poids mesure : 174,5 kg.",
    "Poids mesure : 274.50 kg.",
    "Dose : 74,5 mg.",
    "Reference interne : 74,5 sans unite.",
  ]) {
    assert.equal(reportMentionsWeightKg(text, 74.5), false, text);
  }
});

test("weight validator rejects invalid profile weights", () => {
  assert.equal(reportMentionsWeightKg("74,5 kg", 0), false);
  assert.equal(reportMentionsWeightKg("74,5 kg", -74.5), false);
  assert.equal(reportMentionsWeightKg("74,5 kg", Number.NaN), false);
});
