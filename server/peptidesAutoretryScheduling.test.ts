import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const routes = readFileSync(new URL("./routes.ts", import.meta.url), "utf8");
const storage = readFileSync(new URL("./storage.ts", import.meta.url), "utf8");
const openai = readFileSync(new URL("./openaiResponses.ts", import.meta.url), "utf8");
const budget = readFileSync(new URL("./aiCostBudgetController.ts", import.meta.url), "utf8");

test("automatic Peptides generation claims each attempt and persists bounded retries", () => {
  assert.match(routes, /claimPeptidesGenerationAttempt\(\s*order\.id,\s*peptidesCircuitConfig/);
  assert.match(routes, /maxCandidates:\s*1/);
  assert.match(routes, /providerRetries:\s*1/);
  assert.match(routes, /costBudgetEstimatedUsd:\s*2\.75/);
  assert.match(routes, /markPeptidesGenerationRetry\(/);
  assert.match(routes, /getPeptidesGenerationRetryAt\(generationClaim\.attemptCount\)/);
  assert.match(routes, /markPeptidesGenerationNeedsReview\(/);
  assert.match(storage, /peptidesGenerationState', 'RETRY_SCHEDULED'/);
  assert.match(storage, /peptidesGenerationNextRetryAt/);
  assert.match(routes, /claimPeptidesGenerationResume\(/);
  assert.match(routes, /peptidesGenerationResponseId/);
  assert.match(routes, /resumeResponseId:\s*resumeResponseId \|\| undefined/);
  assert.match(routes, /getPeptidesStoredResumeRetryAt\(storedResumeAttemptCount\)/);
  assert.match(routes, /claimPeptidesSourceCheck\([\s\S]{0,180}peptidesCircuitConfig\.leaseMs/);
  assert.match(routes, /preparePeptauraGenerationSource\(responses\)/);
  assert.match(routes, /getPeptidesSourceRetryAt\(sourceClaim\.attemptCount, sourceClaim\.phaseStartedAt\)/);
  assert.match(routes, /finalizePeptidesSourceCheck\([\s\S]{0,260}"READY"/);
  assert.match(routes, /finalizePeptidesSourceCheck\([\s\S]{0,300}outcome/);
  assert.match(routes, /peptidesSourceContext/);
  assert.match(routes, /source_questionnaire_hash_changed/);
  assert.match(routes, /source_owner_changed/);
  assert.match(routes, /source_context_expired/);
  const sourcePhase = routes.indexOf('if (sourceState !== "READY")');
  const sourceCycleExit = routes.indexOf("continue;", routes.indexOf("try {", sourcePhase));
  const providerClaim = routes.indexOf("claimPeptidesGenerationAttempt", sourcePhase);
  const confirmationDelivery = routes.indexOf("sendPeptidesOrderConfirmationOnce(order", sourcePhase);
  assert.ok(sourcePhase > 0 && sourceCycleExit > sourcePhase
    && sourceCycleExit < providerClaim && sourceCycleExit < confirmationDelivery,
    "every source-only cycle must exit before provider claim/report/delivery");
  assert.match(routes, /Peptides automation stopped by HOLD\/manual workflow/);
  assert.match(routes, /deliveryHeld = scheduledMeta\.peptidesEmailHold[\s\S]{0,260}const stillNotEmailed = !deliveryHeld/);
  const retryMethod = storage.slice(
    storage.lastIndexOf("async markPeptidesGenerationRetry"),
    storage.lastIndexOf("async markPeptidesGenerationNeedsReview"),
  );
  const sourceClaimMethod = storage.slice(
    storage.lastIndexOf("async claimPeptidesSourceCheck"),
    storage.lastIndexOf("async claimPeptidesGenerationAttempt"),
  );
  const reviewMethod = storage.slice(
    storage.lastIndexOf("async markPeptidesGenerationNeedsReview"),
    storage.lastIndexOf("async resetPeptidesGenerationCircuit"),
  );
  assert.doesNotMatch(retryMethod, /peptidesGenerationResponseId/);
  assert.match(sourceClaimMethod, /'peptidesSourceAttempts'/);
  assert.match(sourceClaimMethod, /'peptidesSourceProviderHold', true/);
  assert.match(sourceClaimMethod, /'peptidesSourceDeliveryHold', true/);
  assert.match(sourceClaimMethod, /'source_retry_exhausted'/);
  assert.doesNotMatch(sourceClaimMethod, /peptidesGenerationReservedCostMicroUsd|attemptBudgetMicroUsd/);
  assert.match(sourceClaimMethod, /peptidesSourceResponsesSha256/);
  assert.match(sourceClaimMethod, /peptidesSourceOwnerEmail/);
  assert.match(storage, /peptidesSourceContextExpiresAt/);
  assert.doesNotMatch(reviewMethod, /peptidesGenerationResponseId/);
});

test("a process restart resumes the same durable OpenAI response", () => {
  assert.match(openai, /request\.resumeResponseId[\s\S]*client\.responses\.retrieve\(request\.resumeResponseId\)/);
  assert.match(openai, /bindAICostBudgetReservationResponse\(budgetReservation/);
  assert.match(openai, /await request\.onResponseCreated\(String\(response\.id\)\)/);
  assert.match(budget, /resumeAICostBudgetReservation/);
  assert.match(budget, /status IN \('RESERVED', 'UNCERTAIN', 'COMPLETED'\)/);
});

test("successful report claim freezes delivery at generation plus exactly 24 hours", () => {
  assert.match(storage, /'peptidesGenerationCompletedAt', NOW\(\)::text/);
  assert.match(storage, /'peptidesEmailScheduledAt', \(NOW\(\) \+ INTERVAL '24 hours'\)::text/);
  assert.match(storage, /'peptidesEmailScheduleAnchor', 'generation_plus_24h_v1'/);
  assert.match(routes, /const scheduledOrder = await storage\.getOrder\(order\.id\)/);
  assert.match(routes, /isPeptidesEmailDeliveryDue\(scheduledOrder\)/);
  assert.doesNotMatch(routes, /const delayMs = \(4 \+ Math\.random\(\) \* 4\)/);
});
