import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  evaluatePeptidesGenerationEligibility,
  getPeptidesGenerationCircuitConfig,
  getPeptidesGenerationRetryAt,
  isPeptidesAutogenEnabled,
  readPeptidesGenerationCircuitSnapshot,
} from "./peptidesGenerationCircuitBreaker";
import {
  assertPeptauraGenerationPreflight,
  evaluatePeptauraGenerationPreflight,
  PeptauraSourceUnavailableError,
} from "./peptidesSourcePreflight";

const config = getPeptidesGenerationCircuitConfig({
  PEPTIDES_AUTOGEN_MAX_ATTEMPTS: "1",
  PEPTIDES_AUTOGEN_ATTEMPT_BUDGET_MICRO_USD: "1000000",
  PEPTIDES_AUTOGEN_MAX_BUDGET_MICRO_USD: "1000000",
  PEPTIDES_AUTOGEN_HOURLY_BUDGET_MICRO_USD: "5000000",
  PEPTIDES_AUTOGEN_DAILY_BUDGET_MICRO_USD: "15000000",
  PEPTIDES_AUTOGEN_LEASE_MS: String(40 * 60 * 1000),
});

function liveListing(name: string) {
  return {
    id: 1,
    name,
    dosage: "10mg",
    supplier: "supplier",
    supplierDisplayName: "Supplier",
    outOfStock: false,
    form: "vial",
    priceTiers: [{ price: 20, minQty: 1 }],
    warehouse: "EU",
    shippingOptionCount: 1,
    orderingMode: "available",
    enabled: true,
    suspended: false,
    boxSize: 1,
    marginRate: 0,
  };
}

function contextWithSnapshots(names: string[]) {
  return {
    country: "France",
    shippingUrl: "https://www.peptaura.com/shipping?country=France",
    shippingAvailability: {
      country: "France",
      shippingUrl: "https://www.peptaura.com/shipping?country=France",
      availableVendors: ["supplier"],
      blockedVendors: [],
      fetchedAt: "2026-08-13T00:00:00.000Z",
      live: true,
    },
    liveCatalogSlugs: names,
    catalogRefreshedAt: "2026-08-13T00:00:00.000Z",
    catalogSnapshots: names.map((name) => ({
      slug: name,
      url: `https://www.peptaura.com/catalog/${name}`,
      listings: [liveListing(name)],
      fetchedAt: "2026-08-13T00:00:00.000Z",
      live: true,
    })),
    enclomipheneSource: null,
    promptBlock: "static catalog context",
  } as any;
}

test("Peptides autogen is fail-closed unless explicitly enabled", () => {
  assert.equal(isPeptidesAutogenEnabled({}), false);
  assert.equal(isPeptidesAutogenEnabled({ PEPTIDES_AUTOGEN_ENABLED: "false" }), false);
  assert.equal(isPeptidesAutogenEnabled({ PEPTIDES_AUTOGEN_ENABLED: "true" }), true);
});

test("autogen defaults to two bounded attempts at fifty cents each", () => {
  const defaults = getPeptidesGenerationCircuitConfig({});
  assert.equal(defaults.maxAttempts, 2);
  assert.equal(defaults.attemptBudgetMicroUsd, 500_000);
  assert.equal(defaults.maxBudgetMicroUsd, 1_000_000);
});

test("retry backoff is five minutes and the second failure is terminal", () => {
  const base = Date.parse("2026-09-26T10:00:00.000Z");
  assert.equal(getPeptidesGenerationRetryAt(1, base), "2026-09-26T10:05:00.000Z");
  assert.equal(getPeptidesGenerationRetryAt(2, base), null);
  const retryMetadata = {
    peptidesGenerationState: "RETRY_SCHEDULED",
    peptidesGenerationAttempts: 1,
    peptidesGenerationNextRetryAt: "2026-09-26T10:05:00.000Z",
  };
  assert.equal(evaluatePeptidesGenerationEligibility(retryMetadata, config, base).reason, "BACKOFF");
  assert.equal(evaluatePeptidesGenerationEligibility(retryMetadata, config, base + 5 * 60_000).reason, "ATTEMPT_CAP");
});

test("window budgets cannot be configured below one reserved attempt", () => {
  const bounded = getPeptidesGenerationCircuitConfig({
    PEPTIDES_AUTOGEN_ATTEMPT_BUDGET_MICRO_USD: "3000000",
    PEPTIDES_AUTOGEN_MAX_BUDGET_MICRO_USD: "1",
    PEPTIDES_AUTOGEN_HOURLY_BUDGET_MICRO_USD: "1",
    PEPTIDES_AUTOGEN_DAILY_BUDGET_MICRO_USD: "1",
  });
  assert.equal(bounded.maxBudgetMicroUsd, 3_000_000);
  assert.equal(bounded.maxHourlyBudgetMicroUsd, 3_000_000);
  assert.equal(bounded.maxDailyBudgetMicroUsd, 3_000_000);
});

test("all generation callers inherit one provider call unless manually overridden", () => {
  const engineSource = readFileSync(new URL("./peptidesEngine.ts", import.meta.url), "utf8");
  assert.match(engineSource, /options\.providerRetries \?\? 1/);
  assert.match(engineSource, /options\.maxCandidates \?\? 1/);
});

test("a persisted attempt or cost cap survives cycles and opens the circuit", () => {
  const spent = {
    peptidesGenerationState: "PENDING",
    peptidesGenerationAttempts: 1,
    peptidesGenerationReservedCostMicroUsd: 3_000_000,
  };
  assert.equal(evaluatePeptidesGenerationEligibility(spent, config).reason, "ATTEMPT_CAP");

  const costOnly = {
    peptidesGenerationState: "PENDING",
    peptidesGenerationAttempts: 0,
    peptidesGenerationReservedCostMicroUsd: 3_000_000,
  };
  assert.equal(evaluatePeptidesGenerationEligibility(costOnly, config).reason, "COST_CAP");
});

test("NEEDS_REVIEW blocks retries but a valid existing report remains recoverable", () => {
  assert.equal(
    evaluatePeptidesGenerationEligibility({ peptidesGenerationState: "NEEDS_REVIEW" }, config).reason,
    "NEEDS_REVIEW",
  );
  const withReport = readPeptidesGenerationCircuitSnapshot({
    peptidesGenerationState: "NEEDS_REVIEW",
    peptidesReportId: "report-valid-123",
  });
  assert.equal(withReport.reportId, "report-valid-123");
  assert.equal(
    evaluatePeptidesGenerationEligibility({
      peptidesGenerationState: "NEEDS_REVIEW",
      peptidesReportId: "report-valid-123",
    }, config).reason,
    "REPORT_EXISTS",
  );
});

test("source preflight detects unavailable likely product pages", () => {
  const result = evaluatePeptauraGenerationPreflight(
    { pep_primary_goal: "recovery" },
    contextWithSnapshots(["BPC-157"]),
  );
  assert.equal(result.ok, false);
  assert.deepEqual(result.missingProducts, ["TB-500"]);
  assert.match(result.errors.join("\n"), /pages_produit_live_manquantes:TB-500/);
});

test("source-unavailable preflight makes zero provider calls", async () => {
  let providerCalls = 0;
  const invokeProviderAfterPreflight = async () => {
    assertPeptauraGenerationPreflight(
      { pep_primary_goal: "recovery", pep_name: "Client" },
      contextWithSnapshots(["BPC-157"]),
    );
    providerCalls += 1;
  };
  await assert.rejects(
    invokeProviderAfterPreflight(),
    (error: unknown) => error instanceof PeptauraSourceUnavailableError,
  );
  assert.equal(providerCalls, 0);

  const engineSource = readFileSync(new URL("./peptidesEngine.ts", import.meta.url), "utf8");
  const generationStart = engineSource.indexOf("export async function generatePeptidesProtocol");
  const generationSource = engineSource.slice(generationStart);
  assert.ok(
    generationSource.indexOf("assertPeptauraGenerationPreflight(responses, peptauraContext)")
      < generationSource.indexOf("const providerCandidates:"),
    "generatePeptidesProtocol must run the free source gate before provider candidates",
  );
});

test("the real engine blocks before an injected provider and defaults to one candidate", async () => {
  process.env.DATABASE_URL ||= "postgresql://test:test@127.0.0.1:1/test";
  const { generatePeptidesProtocol } = await import("./peptidesEngine");

  let blockedProviderCalls = 0;
  await assert.rejects(
    generatePeptidesProtocol(
      { pep_primary_goal: "recovery", pep_name: "Client" },
      "client@example.test",
      "coached",
      {
        peptauraContext: contextWithSnapshots(["BPC-157"]),
        providerGenerate: async () => {
          blockedProviderCalls += 1;
          return "{}";
        },
      },
    ),
    (error: unknown) => error instanceof PeptauraSourceUnavailableError,
  );
  assert.equal(blockedProviderCalls, 0);

  let invalidCandidateCalls = 0;
  await assert.rejects(
    generatePeptidesProtocol(
      { pep_primary_goal: "recovery", pep_name: "Client" },
      "client@example.test",
      "coached",
      {
        peptauraContext: contextWithSnapshots(["BPC-157", "TB-500"]),
        providerGenerate: async () => {
          invalidCandidateCalls += 1;
          return "{}";
        },
      },
    ),
  );
  assert.equal(invalidCandidateCalls, 1);
});

test("persistent claims are idempotent and the hourly reservation cap blocks the next order", async () => {
  process.env.DATABASE_URL ||= "postgresql://test:test@127.0.0.1:1/test";
  const { MemStorage } = await import("./storage");
  const storage = new MemStorage();
  const orders = await Promise.all([1, 2, 3, 4, 5, 6].map(async (index) => {
    const order = await storage.createOrder({
      email: `budget-${index}@example.test`,
      productType: "PEPTIDES_ENGINE",
      amountCents: 29900,
    });
    await storage.updateOrder(order.id, { status: "paid", paidAt: new Date() });
    return order;
  }));

  assert.ok(await storage.claimPeptidesGenerationAttempt(orders[0].id, config));
  assert.equal(await storage.claimPeptidesGenerationAttempt(orders[0].id, config), null);
  for (const order of orders.slice(1, 5)) {
    assert.ok(await storage.claimPeptidesGenerationAttempt(order.id, config));
  }
  assert.equal(await storage.claimPeptidesGenerationAttempt(orders[5].id, config), null);

  await storage.markPeptidesGenerationNeedsReview(orders[1].id, "quality", "invalid");
  assert.equal(await storage.claimPeptidesGenerationAttempt(orders[1].id, config), null);
});

test("failed generation persists a future retry and the next claim resumes after backoff", async () => {
  process.env.DATABASE_URL ||= "postgresql://test:***@127.0.0.1:1/test";
  const { MemStorage } = await import("./storage");
  const storage = new MemStorage();
  const order = await storage.createOrder({
    email: "retry@example.test",
    productType: "PEPTIDES_ENGINE",
    amountCents: 19900,
  });
  await storage.updateOrder(order.id, { status: "paid", paidAt: new Date() });
  const retryConfig = getPeptidesGenerationCircuitConfig({
    PEPTIDES_AUTOGEN_MAX_ATTEMPTS: "2",
    PEPTIDES_AUTOGEN_ATTEMPT_BUDGET_MICRO_USD: "500000",
    PEPTIDES_AUTOGEN_MAX_BUDGET_MICRO_USD: "1000000",
  });
  const first = await storage.claimPeptidesGenerationAttempt(order.id, retryConfig);
  assert.equal(first?.attemptCount, 1);
  const retryAt = new Date(Date.now() + 5 * 60_000).toISOString();
  assert.equal(await storage.markPeptidesGenerationRetry(order.id, 1, "quality", "invalid", retryAt), true);
  assert.equal(await storage.claimPeptidesGenerationAttempt(order.id, retryConfig), null);
  await storage.setOrderMetadataKey(order.id, "peptidesGenerationNextRetryAt", new Date(Date.now() - 1_000).toISOString());
  const second = await storage.claimPeptidesGenerationAttempt(order.id, retryConfig);
  assert.equal(second?.attemptCount, 2);
});

test("a durable provider response is resumed without consuming another attempt", async () => {
  process.env.DATABASE_URL ||= "postgresql://test:***@127.0.0.1:1/test";
  const { MemStorage } = await import("./storage");
  const storage = new MemStorage();
  const order = await storage.createOrder({
    email: "resume@example.test",
    productType: "PEPTIDES_ENGINE",
    amountCents: 19900,
  });
  await storage.updateOrder(order.id, { status: "paid", paidAt: new Date() });
  const resumeConfig = getPeptidesGenerationCircuitConfig({});
  const first = await storage.claimPeptidesGenerationAttempt(order.id, resumeConfig);
  assert.equal(first?.attemptCount, 1);
  await storage.setOrderMetadataKey(order.id, "peptidesGenerationResponseId", "resp_durable_1");
  await storage.setOrderMetadataKey(order.id, "peptidesGenerationLeaseUntil", new Date(Date.now() - 1_000).toISOString());
  const resumed = await storage.claimPeptidesGenerationResume(order.id, "resp_durable_1", resumeConfig.leaseMs);
  assert.equal(resumed?.attemptCount, 1);
  const resumedOrder = await storage.getOrder(order.id);
  assert.equal(Number((resumedOrder?.metadata as any)?.peptidesGenerationAttempts), 1);
});

test("manual reset clears the persisted circuit on an undelivered order", async () => {
  process.env.DATABASE_URL ||= "postgresql://test:test@127.0.0.1:1/test";
  const { MemStorage } = await import("./storage");
  const storage = new MemStorage();
  const order = await storage.createOrder({
    email: "reset@example.test",
    productType: "PEPTIDES_ENGINE",
    amountCents: 19900,
  });
  await storage.updateOrder(order.id, { status: "paid", paidAt: new Date() });

  assert.ok(await storage.claimPeptidesGenerationAttempt(order.id, config));
  await storage.markPeptidesGenerationNeedsReview(order.id, "generation_failed", "locked");
  assert.equal(await storage.claimPeptidesGenerationAttempt(order.id, config), null);

  assert.equal(await storage.resetPeptidesGenerationCircuit(order.id), true);
  assert.ok(await storage.claimPeptidesGenerationAttempt(order.id, config));
});
