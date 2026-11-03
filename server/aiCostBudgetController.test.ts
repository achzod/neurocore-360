import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  evaluateAICostBudget,
  getAICostBudgetLimits,
  isAICostBudgetControllerEnabled,
  resolveAICostBudgetActualUsd,
} from "./aiCostBudgetController";

const limits = getAICostBudgetLimits("peptides", {});

test("Peptides cost controller defaults to fail-on-spend thresholds", () => {
  assert.equal(isAICostBudgetControllerEnabled({}), true);
  assert.equal(
    isAICostBudgetControllerEnabled({
      NODE_ENV: "production",
      AI_COST_BUDGET_CONTROLLER_ENABLED: "false",
    }),
    true,
  );
  assert.deepEqual(limits, {
    perOrderUsd: 2.75,
    perHourUsd: 27.5,
    perDayUsd: 82.5,
    reservationTtlMinutes: 45,
  });
});

test("one realistic Peptides reservation is allowed at the exact order cap", () => {
  const decision = evaluateAICostBudget(
    { orderUsd: 0, hourUsd: 0, dayUsd: 0 },
    2.75,
    limits,
  );
  assert.equal(decision.allowed, true);
  assert.equal(decision.blockedBy, null);
  assert.equal(decision.projected.orderUsd, 2.75);
});

test("a second Peptides request for the same order is blocked pre-call", () => {
  const decision = evaluateAICostBudget(
    { orderUsd: 0.01, hourUsd: 0.01, dayUsd: 0.01 },
    2.75,
    limits,
  );
  assert.equal(decision.allowed, false);
  assert.equal(decision.blockedBy, "order");
});

test("hour and Dubai-day caps block even when order spend is fresh", () => {
  const hour = evaluateAICostBudget(
    { orderUsd: 0, hourUsd: 25, dayUsd: 25 },
    2.75,
    limits,
  );
  assert.equal(hour.blockedBy, "hour");

  const day = evaluateAICostBudget(
    { orderUsd: 0, hourUsd: 0, dayUsd: 81 },
    2.75,
    limits,
  );
  assert.equal(day.blockedBy, "day");
});

test("thresholds can only be changed explicitly and stay bounded", () => {
  const configured = getAICostBudgetLimits("peptides", {
    AI_COST_PEPTIDES_CUSTOMER_PER_ORDER_USD: "2.5",
    AI_COST_PEPTIDES_CUSTOMER_PER_HOUR_USD: "20",
    AI_COST_PEPTIDES_CUSTOMER_PER_DAY_USD: "70",
    AI_COST_BUDGET_RESERVATION_TTL_MINUTES: "30",
  });
  assert.deepEqual(configured, {
    perOrderUsd: 2.5,
    perHourUsd: 20,
    perDayUsd: 70,
    reservationTtlMinutes: 30,
  });
});

test("Discovery has its own fail-closed audit/hour/day budget", () => {
  const discovery = getAICostBudgetLimits("discovery", {});
  assert.deepEqual(discovery, {
    perOrderUsd: 0.75,
    perHourUsd: 1.5,
    perDayUsd: 5,
    reservationTtlMinutes: 45,
  });
  assert.equal(evaluateAICostBudget(
    { orderUsd: 0, hourUsd: 0, dayUsd: 0 },
    0.75,
    discovery,
  ).allowed, true);
  assert.equal(evaluateAICostBudget(
    { orderUsd: 0.1, hourUsd: 0.1, dayUsd: 0.1 },
    0.75,
    discovery,
  ).blockedBy, "order");

  const controllerSource = readFileSync(new URL("./aiCostBudgetController.ts", import.meta.url), "utf8");
  assert.match(controllerSource, /requestedProduct !== "discovery" && !isAICostBudgetControllerEnabled/);
  assert.match(controllerSource, /context\.product === "discovery"[\s\S]*DEFAULT_DISCOVERY_LIMITS\.perOrderUsd/);
  assert.match(controllerSource, /DISCOVERY_MONO_CALL_ALREADY_RESERVED/);
  assert.match(controllerSource, /legacyRepairRetryAuthorized[\s\S]*context\.discoveryAllowLegacy[\s\S]*previousCount === 1[\s\S]*unsettled === 0/);
  assert.match(controllerSource, /regenerationAuthorized \|\| legacyRepairRetryAuthorized[\s\S]*perOrderUsd: 1\.50/);
});

test("Peptides provider calls inherit the pre-call controller and exact order context", () => {
  const responsesSource = readFileSync(new URL("./openaiResponses.ts", import.meta.url), "utf8");
  const runStart = responsesSource.indexOf("export async function runOpenAIText");
  const runSource = responsesSource.slice(runStart);
  assert.ok(
    runSource.indexOf("reserveAICostBudget(budgetContext)")
      < runSource.indexOf("client.responses.create"),
    "budget reservation must be acquired before the paid provider call",
  );
  assert.match(runSource, /request\.costBudget\s*\?\s*\{\s*\.\.\.request\.costBudget,[\s\S]*profile: request\.profile/);

  const routesSource = readFileSync(new URL("./routes.ts", import.meta.url), "utf8");
  const cronCall = routesSource.lastIndexOf("maxCandidates: 1");
  assert.match(routesSource.slice(cronCall, cronCall + 320), /orderId:\s*order\.id/);
  assert.match(routesSource, /resetAICostBudgetReservations\(/);
});

test("admin cost summary endpoint is authenticated, allowlisted and read-only", () => {
  const routesSource = readFileSync(new URL("./routes.ts", import.meta.url), "utf8");
  const endpointStart = routesSource.indexOf('app.get("/api/admin/ai-cost-budget-summary"');
  assert.ok(endpointStart >= 0, "admin summary endpoint must exist");
  const endpointEnd = routesSource.indexOf(
    'app.post("/api/admin/ai-usage-costs/check-alert"',
    endpointStart,
  );
  const endpointSource = routesSource.slice(endpointStart, endpointEnd);
  assert.match(endpointSource, /requireAdminAuth\(req, res\)/);
  assert.match(endpointSource, /new Set\(\["peptides", "discovery"\]\)/);
  assert.match(endpointSource, /allowedProducts\.has\(product\)/);
  assert.match(endpointSource, /getAICostBudgetSummary\(product\)/);
  assert.doesNotMatch(endpointSource, /app\.(?:post|put|patch|delete)\(/);
});

test("missing or malformed provider usage keeps the reservation fail-closed", () => {
  const reservation = { reservedUsd: 2.75 };
  assert.equal(resolveAICostBudgetActualUsd(reservation, undefined), 2.75);
  assert.equal(resolveAICostBudgetActualUsd(reservation, null), 2.75);
  assert.equal(resolveAICostBudgetActualUsd(reservation, Number.NaN), 2.75);
  assert.equal(resolveAICostBudgetActualUsd(reservation, Number.POSITIVE_INFINITY), 2.75);
  assert.equal(resolveAICostBudgetActualUsd(reservation, 0.74), 0.74);
  assert.equal(resolveAICostBudgetActualUsd(reservation, 0), 0);
});

test("manual reset never erases completed spend and categories remain fail-closed", () => {
  const controllerSource = readFileSync(new URL("./aiCostBudgetController.ts", import.meta.url), "utf8");
  const reset = controllerSource.slice(controllerSource.indexOf("export async function resetAICostBudgetReservations"));
  assert.match(reset, /status IN \('RESERVED', 'UNCERTAIN'\)/);
  assert.doesNotMatch(reset.slice(0, 1800), /status IN \('RESERVED', 'UNCERTAIN', 'COMPLETED'\)/);
  assert.match(controllerSource, /ai_cost_budget_customer_auto_once_idx/);
  assert.match(controllerSource, /ai_cost_budget_manual_incident_once_idx/);
  assert.match(controllerSource, /ai_cost_budget_response_once_idx/);
  assert.match(controllerSource, /Provider-reported ai_usage_events is authoritative/);
});

test("manual repair and test budgets are isolated from customer auto capacity", () => {
  assert.deepEqual(getAICostBudgetLimits("peptides", {}, "manual_repair"), {
    perOrderUsd: 2.75, perHourUsd: 2.75, perDayUsd: 5.5, reservationTtlMinutes: 45,
  });
  assert.deepEqual(getAICostBudgetLimits("peptides", {}, "test"), {
    perOrderUsd: 1, perHourUsd: 2, perDayUsd: 5, reservationTtlMinutes: 45,
  });
});
