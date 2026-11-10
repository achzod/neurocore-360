import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const source = (name: string) => readFileSync(join(here, name), "utf8");

test("durable background response is never cancelled at the local timeout", () => {
  const openai = source("openaiResponses.ts");
  assert.match(openai, /if \(background && response\?\.id\)[\s\S]{0,700}OPENAI_DURABLE_RESPONSE_PENDING/);
  const durableStart = openai.indexOf("if (background && response?.id)");
  const durableBranch = openai.slice(durableStart, openai.indexOf("          try {", durableStart));
  assert.doesNotMatch(durableBranch, /responses\.cancel/);
});

test("response id callback is retried and the budget ledger remains the recovery journal", () => {
  const openai = source("openaiResponses.ts");
  assert.match(openai, /for \(const delayMs of \[0, 250, 1_000\]\)[\s\S]{0,350}bindAICostBudgetReservationResponse/);
  assert.match(openai, /OPENAI_RESPONSE_ID_CALLBACK_FAILED:\$\{response\.id\}/);
  const storage = source("storage.ts");
  assert.match(storage, /recoverPeptidesGenerationResponseIdFromBudget/);
  assert.match(storage, /ai_cost_budget_reservations/);
  assert.match(storage, /peptidesGenerationResponseRecoveredFrom/);
  const budget = source("aiCostBudgetController.ts");
  assert.match(budget, /response_id IS NULL[\s\S]{0,500}SET response_id = \$4/);
});

test("AutoGen promotes a journaled response before claiming another provider call", () => {
  const routes = source("routes.ts");
  const recovery = routes.indexOf("recoverPeptidesGenerationResponseIdFromBudget");
  const resume = routes.indexOf("claimPeptidesGenerationResume", recovery);
  const paidClaim = routes.indexOf("claimPeptidesGenerationAttempt", recovery);
  assert.ok(recovery > 0);
  assert.ok(resume > recovery);
  assert.ok(paidClaim > resume);
  assert.match(routes.slice(recovery, paidClaim + 200), /no new provider call/);
});

test("invalid historical reports stay linked under fail-closed manual hold", () => {
  const routes = source("routes.ts");
  const incident = routes.slice(routes.indexOf("peptidesPreviousInvalidReportId"), routes.indexOf("peptidesPreviousInvalidReportId") + 900);
  assert.doesNotMatch(incident, /peptidesReportId:\s*""/);
  assert.match(incident, /peptidesEmailHold:\s*true/);
  assert.match(incident, /peptidesManualFulfillment:\s*true/);
  assert.match(incident, /REQUIRES_MANUAL_REPAIR/);
});

test("historical duplicate orders become terminal without alert, generation or delivery", () => {
  const routes = source("routes.ts");
  assert.match(routes, /DUPLICATE_ORDER_TERMINAL_NO_REGENERATION/);
  assert.match(routes, /Operator-reviewed duplicate order[\s\S]{0,180}no alert, generation or delivery/);
  assert.match(routes, /siblingDelivery\?\.immutable/);
  assert.match(routes, /RESOLVED_DUPLICATE_ORDER/);
  assert.match(routes, /no alert, generation or delivery/);
});

test("stored-response apply atomically retains hold and manual mode and resolves stale incident", () => {
  const recovery = source("peptidesStoredRecovery.ts");
  assert.match(recovery, /'peptidesEmailHold', true/);
  assert.match(recovery, /'peptidesManualFulfillment', true/);
  assert.match(recovery, /'peptidesManualFulfillmentState', 'STORED_RESPONSE_RECOVERY_UNDER_HOLD'/);
  assert.match(recovery, /'peptidesFulfillmentState', 'RESOLVED_UNDER_HOLD'/);
  assert.match(recovery, /BEGIN[\s\S]{0,5000}INSERT INTO burnout_reports[\s\S]{0,5000}UPDATE orders[\s\S]{0,5000}COMMIT/);
});
