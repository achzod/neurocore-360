import assert from "node:assert/strict";
import test from "node:test";

process.env.SESSION_SECRET = "x".repeat(32);

const conversion = await import("./peptidesPreviewConversion");

test("signed preview checkout tokens are scoped, tamper-evident and expire", () => {
  const now = Date.parse("2026-09-18T12:00:00.000Z");
  const leadId = "193ca94c-f293-4513-aba3-ee1edb431a77";
  const token = conversion.createPeptidesPreviewCheckoutToken(leadId, now);
  const claims = conversion.verifyPeptidesPreviewCheckoutToken(token, now + 1_000);

  assert.equal(claims.leadId, leadId);
  assert.equal(claims.v, 1);
  assert.throws(
    () => conversion.verifyPeptidesPreviewCheckoutToken(`${token.slice(0, -1)}x`, now + 1_000),
    /PEPTIDES_PREVIEW_INVALID_TOKEN/,
  );
  assert.throws(
    () => conversion.verifyPeptidesPreviewCheckoutToken(token, now + 15 * 24 * 60 * 60 * 1_000),
    /PEPTIDES_PREVIEW_TOKEN_EXPIRED/,
  );
});

test("preview responses are reused without inventing missing questionnaire facts", () => {
  const input = {
    firstName: "Marc",
    email: "marc@example.com",
    age: 39,
    weightKg: 84,
    heightCm: 182,
    sex: "male",
    bodyFatRange: "15-20",
    primaryGoal: "recovery",
    secondaryGoals: ["sleep"],
    goalDetails: "Recuperer du tendon et retrouver un sommeil stable rapidement.",
    timeline: "8-12",
    recoveryScope: "localized",
    glp1History: "not-applicable",
    cognitiveStress: "not-applicable",
    conditions: ["none"],
    bloodwork: "recent",
    bloodPressure: "normal",
    sleepHours: 7,
    injectionComfort: "possible",
    injectionFrequency: "few-week",
    refrigeration: "yes-private",
    experience: "read",
    trainingFrequency: "3-4",
    budgetTotalUsd: 450,
    country: "FR",
    medications: "aucun",
    allergies: "aucune",
    currentPeptides: "aucun",
    pastPeptides: "aucun",
    startWhen: "asap",
    consent: true,
    attribution: { source: "sendpulse" },
  } as any;
  const result = {
    status: "eligible",
    moleculeCount: 2,
    durationLabel: "12 semaines actives",
    estimatedProtocolCostUsd: 300,
    estimatedShippingCostUsd: 60,
    estimatedGrandTotalUsd: 360,
    budgetFit: "within",
    analysisPoints: ["Point 1"],
    blockers: [],
  } as any;

  const responses = conversion.mapPreviewToPeptidesResponses(
    input,
    result,
    "193ca94c-f293-4513-aba3-ee1edb431a77",
  );

  assert.equal(responses.pep_email, "marc@example.com");
  assert.equal(responses.pep_primary_goal, "recovery");
  assert.equal(responses.pep_budget, "100-200");
  assert.equal(responses.pep_training_freq, "3-4");
  assert.equal(responses.pep_blood_commit, undefined);
  assert.equal(responses.pep_coaching_interest, undefined);
  assert.equal(responses._prePeptidesInput, undefined);
  assert.equal((responses._prePeptidesResult as any).estimatedGrandTotalUsd, 360);
});
