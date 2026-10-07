import assert from "node:assert/strict";
import test from "node:test";

import { validatePeptidesEngineResponses, validatePeptidesProfileConfirmation } from "./peptidesEngineQuestionnaire";

const complete = {
  pep_name: "Karim",
  pep_email: "karim@example.com",
  pep_age: 36,
  pep_weight: 84,
  pep_height: 181,
  pep_experience: "read",
  pep_primary_goal: "recovery",
  pep_conditions: ["none"],
  pep_country: "FR",
  pep_budget: "100-200",
  pep_injection_comfort: "anxious",
  pep_blood_commit: "yes-before",
};

test("accepts a completed dedicated Peptides Engine questionnaire", () => {
  assert.deepEqual(validatePeptidesEngineResponses(complete, "karim@example.com"), { valid: true });
});

test("rejects a mapped or partial Pre-Peptides payload before checkout", () => {
  const result = validatePeptidesEngineResponses({
    pep_name: "Karim",
    pep_email: "karim@example.com",
    pep_age: 36,
    pep_primary_goal: "recovery",
  }, "karim@example.com");
  assert.equal(result.valid, false);
  if (!result.valid) {
    assert.ok(result.missing.includes("pep_blood_commit"));
    assert.ok(result.missing.includes("pep_conditions"));
  }
});

test("requires testosterone-specific answers when that goal is selected", () => {
  const result = validatePeptidesEngineResponses({ ...complete, pep_primary_goal: "testo-boost" }, "karim@example.com");
  assert.deepEqual(result, {
    valid: false,
    missing: ["pep_testo_bloodwork", "pep_testo_fertility"],
  });
});

test("requires testosterone-specific answers when testosterone is a secondary goal", () => {
  const result = validatePeptidesEngineResponses({
    ...complete,
    pep_secondary_goals: ["fatloss", "testo-boost"],
  }, "karim@example.com");
  assert.deepEqual(result, {
    valid: false,
    missing: ["pep_testo_bloodwork", "pep_testo_fertility"],
  });
});

test("rejects an email mismatch between checkout and questionnaire", () => {
  const result = validatePeptidesEngineResponses(complete, "other@example.com");
  assert.deepEqual(result, { valid: false, missing: ["pep_email"] });
});

test("accepts an explicit profile confirmation that exactly matches the questionnaire", () => {
  const confirmation = {
    accepted: true,
    pep_name: "Karim",
    pep_age: 36,
    pep_weight: 84,
    pep_height: 181,
  };
  assert.deepEqual(validatePeptidesProfileConfirmation(confirmation, complete), { valid: true });
});

test("rejects a profile confirmation when the displayed height differs", () => {
  const confirmation = {
    accepted: true,
    pep_name: "Karim",
    pep_age: 36,
    pep_weight: 84,
    pep_height: 170,
  };
  const result = validatePeptidesProfileConfirmation(confirmation, complete);
  assert.equal(result.valid, false);
  if (!result.valid) assert.deepEqual(result.mismatched, ["pep_height"]);
});

test("rejects checkout when profile confirmation is absent", () => {
  const result = validatePeptidesProfileConfirmation(undefined, complete);
  assert.equal(result.valid, false);
  if (!result.valid) {
    assert.deepEqual(result.mismatched, ["pep_name", "pep_age", "pep_weight", "pep_height"]);
  }
});
