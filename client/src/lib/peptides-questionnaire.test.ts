import assert from "node:assert/strict";
import test from "node:test";

import { PEPTIDES_QUESTIONS, shouldShowQuestion } from "./peptides-questionnaire";

const testosteroneBloodwork = PEPTIDES_QUESTIONS.find(
  (question) => question.id === "pep_testo_bloodwork",
);

if (!testosteroneBloodwork) throw new Error("pep_testo_bloodwork missing");

test("shows testosterone detail questions for a primary testosterone goal", () => {
  assert.equal(shouldShowQuestion(testosteroneBloodwork, {
    pep_primary_goal: "testo-boost",
  }), true);
});

test("shows testosterone detail questions for a secondary testosterone goal", () => {
  assert.equal(shouldShowQuestion(testosteroneBloodwork, {
    pep_primary_goal: "fatloss",
    pep_secondary_goals: ["fatloss", "testo-boost"],
  }), true);
});

test("hides testosterone detail questions when testosterone is not selected", () => {
  assert.equal(shouldShowQuestion(testosteroneBloodwork, {
    pep_primary_goal: "fatloss",
    pep_secondary_goals: ["skin-hair"],
  }), false);
});
