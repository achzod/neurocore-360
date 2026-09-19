import assert from "node:assert/strict";
import test from "node:test";
import { validatePeptidesEngineResponses } from "./peptidesEngineQuestionnaire";

process.env.SESSION_SECRET = "x".repeat(32);

const {
  createPeptidesPreviewCheckoutToken,
  mapPreviewToPeptidesResponses,
  previewCheckoutConfirmationFields,
  verifyPeptidesPreviewCheckoutToken,
} = await import("./peptidesPreviewConversion");

test("signed preview attribution tokens are scoped, tamper-evident and expire", () => {
  const now = Date.parse("2026-09-18T12:00:00.000Z");
  const leadId = "193ca94c-f293-4513-aba3-ee1edb431a77";
  const token = createPeptidesPreviewCheckoutToken(leadId, now);

  assert.deepEqual(verifyPeptidesPreviewCheckoutToken(token, now + 1_000), {
    v: 1,
    leadId,
    exp: now + 14 * 24 * 60 * 60 * 1_000,
  });
  assert.throws(
    () => verifyPeptidesPreviewCheckoutToken(`${token.slice(0, -1)}x`, now + 1_000),
    /PEPTIDES_PREVIEW_INVALID_TOKEN/,
  );

  // Node accepts non-canonical base64url spellings whose discarded padding
  // bits decode to the same bytes. Reject those textual mutations too.
  const [payload, encodedSignature] = token.split(".");
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
  const finalIndex = alphabet.indexOf(encodedSignature.at(-1)!);
  assert.equal(finalIndex % 4, 0);
  const nonCanonicalSignature = `${encodedSignature.slice(0, -1)}${alphabet[finalIndex + 1]}`;
  assert.deepEqual(
    Buffer.from(nonCanonicalSignature, "base64url"),
    Buffer.from(encodedSignature, "base64url"),
  );
  assert.throws(
    () => verifyPeptidesPreviewCheckoutToken(`${payload}.${nonCanonicalSignature}`, now + 1_000),
    /PEPTIDES_PREVIEW_INVALID_TOKEN/,
  );

  assert.throws(
    () => verifyPeptidesPreviewCheckoutToken(token, now + 15 * 24 * 60 * 60 * 1_000),
    /PEPTIDES_PREVIEW_TOKEN_EXPIRED/,
  );
});

test("token creation rejects non UUID lead identifiers", () => {
  assert.throws(
    () => createPeptidesPreviewCheckoutToken("not-a-lead"),
    /PEPTIDES_PREVIEW_INVALID_LEAD_ID/,
  );
});

test("preview answers map to Engine fields without inventing the final confirmations", () => {
  const leadId = "193ca94c-f293-4513-aba3-ee1edb431a77";
  const responses = mapPreviewToPeptidesResponses({
    firstName: "Karim", email: "karim@example.com", age: 36, weightKg: 84, heightCm: 181,
    sex: "male", bodyFatRange: "15-20", primaryGoal: "recovery", secondaryGoals: [],
    goalDetails: "Récupération du tendon rotulien depuis plusieurs mois.", timeline: "12plus",
    recoveryScope: "localized", glp1History: "not-applicable", cognitiveStress: "not-applicable",
    conditions: ["none"], bloodwork: "recent", bloodPressure: "normal", sleepHours: 7,
    medications: "Aucun", allergies: "Aucune", experience: "read", currentPeptides: "Aucun",
    pastPeptides: "Aucun", trainingFrequency: "3-4", injectionComfort: "possible",
    injectionFrequency: "few-week", refrigeration: "yes-private", budgetTotalUsd: 300,
    country: "FR", startWhen: "1-2weeks", consent: true, attribution: {},
  } as any, {
    status: "eligible", moleculeCount: 2, durationLabel: "12 semaines",
    estimatedProtocolCostUsd: 180, estimatedShippingCostUsd: 25, estimatedGrandTotalUsd: 205,
    budgetFit: "within",
  } as any, leadId);

  assert.equal(responses.pep_email, "karim@example.com");
  assert.equal(responses.pep_primary_goal, "recovery");
  assert.equal(responses.pep_budget, "100-200");
  assert.equal(responses.pep_blood_commit, undefined);
  assert.deepEqual(previewCheckoutConfirmationFields(responses), ["pep_blood_commit"]);
  responses.pep_blood_commit = "yes-before";
  assert.deepEqual(validatePeptidesEngineResponses(responses, "karim@example.com"), { valid: true });
});

test("testosterone preview asks only the exact missing hormone confirmations", () => {
  assert.deepEqual(previewCheckoutConfirmationFields({
    pep_primary_goal: "testo-boost",
    pep_blood_commit: "yes-before",
    pep_testo_bloodwork: "old",
  }), ["pep_testo_fertility"]);
});
