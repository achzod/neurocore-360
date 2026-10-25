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
  assert.match(routes, /costBudgetEstimatedUsd:\s*0\.5/);
  assert.match(routes, /markPeptidesGenerationRetry\(/);
  assert.match(routes, /getPeptidesGenerationRetryAt\(generationClaim\.attemptCount\)/);
  assert.match(routes, /markPeptidesGenerationNeedsReview\(/);
  assert.match(storage, /peptidesGenerationState', 'RETRY_SCHEDULED'/);
  assert.match(storage, /peptidesGenerationNextRetryAt/);
  assert.match(routes, /claimPeptidesGenerationResume\(/);
  assert.match(routes, /peptidesGenerationResponseId/);
  assert.match(routes, /resumeResponseId:\s*resumeResponseId \|\| undefined/);
  assert.match(routes, /getPeptidesStoredResumeRetryAt\(storedResumeAttemptCount\)/);
  assert.match(routes, /isRetryablePeptauraSourceOutage\(generationError\)/);
  assert.match(routes, /markPeptidesGenerationSourceRetry\([\s\S]{0,240}peptidesCircuitConfig\.attemptBudgetMicroUsd/);
  assert.match(routes, /SOURCE_RETRY_SCHEDULED/);
  const sourceOutageBranch = routes.indexOf("if (retryableSourceOutage)");
  const sourceOutageBreak = routes.indexOf("break;", sourceOutageBranch);
  const reportPersistence = routes.indexOf("storage.createAndClaimPeptidesReport", sourceOutageBranch);
  assert.ok(sourceOutageBranch > 0 && sourceOutageBreak > sourceOutageBranch);
  assert.ok(sourceOutageBreak < reportPersistence, "source outage must exit before report persistence or any delivery email");
  assert.match(routes, /Peptides automation stopped by HOLD\/manual workflow/);
  assert.match(routes, /deliveryHeld = scheduledMeta\.peptidesEmailHold[\s\S]{0,260}const stillNotEmailed = !deliveryHeld/);
  const retryMethod = storage.slice(
    storage.lastIndexOf("async markPeptidesGenerationRetry"),
    storage.lastIndexOf("async markPeptidesGenerationNeedsReview"),
  );
  const sourceRetryMethod = storage.slice(
    storage.lastIndexOf("async markPeptidesGenerationSourceRetry"),
    storage.lastIndexOf("async markPeptidesGenerationNeedsReview"),
  );
  const reviewMethod = storage.slice(
    storage.lastIndexOf("async markPeptidesGenerationNeedsReview"),
    storage.lastIndexOf("async resetPeptidesGenerationCircuit"),
  );
  assert.doesNotMatch(retryMethod, /peptidesGenerationResponseId/);
  assert.match(sourceRetryMethod, /'peptidesGenerationState', 'RETRY_SCHEDULED'/);
  assert.match(sourceRetryMethod, /'peptidesGenerationAttempts', GREATEST/);
  assert.match(sourceRetryMethod, /'peptidesGenerationReservedCostMicroUsd', GREATEST/);
  assert.match(sourceRetryMethod, /'peptidesGenerationStoredResumeAttempts', GREATEST/);
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
