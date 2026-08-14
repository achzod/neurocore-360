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
    perOrderUsd: 1,
    perHourUsd: 5,
    perDayUsd: 15,
    reservationTtlMinutes: 45,
  });
});

test("first one-dollar Peptides reservation is allowed at the exact order cap", () => {
  const decision = evaluateAICostBudget(
    { orderUsd: 0, hourUsd: 0, dayUsd: 0 },
    1,
    limits,
  );
  assert.equal(decision.allowed, true);
  assert.equal(decision.blockedBy, null);
  assert.equal(decision.projected.orderUsd, 1);
});

test("a second Peptides request for the same order is blocked pre-call", () => {
  const decision = evaluateAICostBudget(
    { orderUsd: 0.72, hourUsd: 0.72, dayUsd: 0.72 },
    1,
    limits,
  );
  assert.equal(decision.allowed, false);
  assert.equal(decision.blockedBy, "order");
});

test("hour and Dubai-day caps block even when order spend is fresh", () => {
  const hour = evaluateAICostBudget(
    { orderUsd: 0, hourUsd: 4.2, dayUsd: 4.2 },
    1,
    limits,
  );
  assert.equal(hour.blockedBy, "hour");

  const day = evaluateAICostBudget(
    { orderUsd: 0, hourUsd: 0, dayUsd: 14.2 },
    1,
    limits,
  );
  assert.equal(day.blockedBy, "day");
});

test("thresholds can only be changed explicitly and stay bounded", () => {
  const configured = getAICostBudgetLimits("peptides", {
    AI_COST_PEPTIDES_PER_ORDER_USD: "0.5",
    AI_COST_PEPTIDES_PER_HOUR_USD: "3",
    AI_COST_PEPTIDES_PER_DAY_USD: "12",
    AI_COST_BUDGET_RESERVATION_TTL_MINUTES: "30",
  });
  assert.deepEqual(configured, {
    perOrderUsd: 0.5,
    perHourUsd: 3,
    perDayUsd: 12,
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
  const cronCall = routesSource.indexOf("maxCandidates: 1");
  assert.match(routesSource.slice(cronCall, cronCall + 240), /orderId:\s*order\.id/);
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
  const reservation = { reservedUsd: 1 };
  assert.equal(resolveAICostBudgetActualUsd(reservation, undefined), 1);
  assert.equal(resolveAICostBudgetActualUsd(reservation, null), 1);
  assert.equal(resolveAICostBudgetActualUsd(reservation, Number.NaN), 1);
  assert.equal(resolveAICostBudgetActualUsd(reservation, Number.POSITIVE_INFINITY), 1);
  assert.equal(resolveAICostBudgetActualUsd(reservation, 0.74), 0.74);
  assert.equal(resolveAICostBudgetActualUsd(reservation, 0), 0);
});
