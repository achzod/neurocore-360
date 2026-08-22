import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  needsPaidAuditGenerationRecovery,
  needsPaidAuditRecovery,
  runOrderEffectOnce,
  withPaidAuditOrderLock,
} from "./paidAuditRecovery";

test("only paid PREMIUM/ELITE orders without an audit are recoverable", () => {
  for (const productType of ["PREMIUM", "ELITE"]) {
    assert.equal(needsPaidAuditRecovery({
      id: "order-1",
      status: "paid",
      productType,
      auditId: null,
    }), true);
  }

  for (const candidate of [
    { status: "pending", productType: "ELITE", auditId: null },
    { status: "paid", productType: "ELITE", auditId: "audit-1" },
    { status: "paid", productType: "BLOOD_ANALYSIS", auditId: null },
    { status: "paid", productType: "PEPTIDES_ENGINE", auditId: null },
    { status: "paid", productType: "GRATUIT", auditId: null },
  ]) {
    assert.equal(needsPaidAuditRecovery({ id: "order-1", ...candidate }), false);
  }
});

test("linked paid audits recover only the crash-safe generation states", () => {
  const order = {
    id: "order-1",
    status: "paid",
    productType: "ELITE",
    auditId: "audit-1",
  };
  const baseAudit = {
    id: "audit-1",
    type: "ELITE",
    reportDeliveryStatus: "PENDING",
    reportSentAt: null,
  };

  assert.equal(needsPaidAuditGenerationRecovery(order, baseAudit, null), true);
  assert.equal(needsPaidAuditGenerationRecovery(
    order,
    { ...baseAudit, reportDeliveryStatus: "GENERATING" },
    null,
  ), true);
  assert.equal(needsPaidAuditGenerationRecovery(
    order,
    { ...baseAudit, reportDeliveryStatus: "GENERATING" },
    { status: "pending" },
  ), true, "a crash after durable enqueue but before start must self-heal");

  for (const candidate of [
    { audit: { ...baseAudit, reportDeliveryStatus: "READY" }, job: null },
    { audit: { ...baseAudit, reportDeliveryStatus: "SENT", reportSentAt: new Date() }, job: null },
    { audit: { ...baseAudit, reportDeliveryStatus: "GENERATING" }, job: { status: "generating" } },
    { audit: { ...baseAudit, reportDeliveryStatus: "GENERATING" }, job: { status: "completed" } },
  ]) {
    assert.equal(needsPaidAuditGenerationRecovery(order, candidate.audit, candidate.job), false);
  }

  assert.equal(needsPaidAuditGenerationRecovery(
    { ...order, auditId: "another-audit" },
    baseAudit,
    null,
  ), false, "the audit must be the exact one linked to the paid order");
  assert.equal(needsPaidAuditGenerationRecovery(
    { ...order, productType: "PREMIUM" },
    baseAudit,
    null,
  ), false, "order and audit tiers must match");
});

test("order effects use an atomic claim and fail closed on an unknown provider outcome", async () => {
  const calls: Array<{ text: string; values?: unknown[] }> = [];
  const pool = {
    async query(text: string, values?: unknown[]) {
      calls.push({ text, values });
      if (/RETURNING id/.test(text)) return { rowCount: 1, rows: [{ id: "order-1" }] };
      return { rowCount: 1, rows: [] };
    },
  };
  let attempts = 0;
  const outcome = await runOrderEffectOnce(pool, "order-1", "customerConfirmEmailSentAt", async () => {
    attempts++;
    throw new Error("provider timeout after submission");
  });

  assert.equal(attempts, 1);
  assert.equal(outcome.state, "UNKNOWN");
  assert.match(calls[0].text, /UPDATE orders/);
  assert.match(calls[0].text, /metadata->>\$1::text/);
  assert.match(calls[0].text, /IN \('', 'false', 'FAILED'\)/);
  assert.deepEqual(calls[0].values, ["customerConfirmEmailSentAt", "order-1"]);
  assert.match(calls[1].text, /metadata->>\$1::text = 'SENDING'/);
  assert.deepEqual(calls[1].values, ["customerConfirmEmailSentAt", "order-1", "UNKNOWN"]);
});

test("a losing order-effect claimant never invokes the provider", async () => {
  const pool = {
    async query() {
      return { rowCount: 0, rows: [] };
    },
  };
  let attempts = 0;
  const outcome = await runOrderEffectOnce(pool, "order-1", "customerConfirmEmailSentAt", async () => {
    attempts++;
    return true;
  });

  assert.equal(attempts, 0);
  assert.equal(outcome.state, "SKIPPED");
});

test("the per-order advisory lock wraps work and always releases its client", async () => {
  const calls: Array<{ text: string; values?: unknown[] }> = [];
  let released = false;
  const fakePool = {
    async connect() {
      return {
        async query(text: string, values?: unknown[]) {
          calls.push({ text, values });
        },
        release() {
          released = true;
        },
      };
    },
  };

  const value = await withPaidAuditOrderLock(fakePool, "order-42", async () => "ok");

  assert.equal(value, "ok");
  assert.equal(released, true);
  assert.match(calls[0].text, /pg_advisory_lock/);
  assert.match(calls[1].text, /pg_advisory_unlock/);
  assert.deepEqual(calls[0].values, ["paid-audit:order-42"]);
  assert.deepEqual(calls[1].values, ["paid-audit:order-42"]);
});

test("the per-order advisory lock unlocks when recovery throws", async () => {
  const calls: string[] = [];
  let released = false;
  const fakePool = {
    async connect() {
      return {
        async query(text: string) {
          calls.push(text);
        },
        release() {
          released = true;
        },
      };
    },
  };

  await assert.rejects(
    withPaidAuditOrderLock(fakePool, "order-error", async () => {
      throw new Error("boom");
    }),
    /boom/,
  );

  assert.equal(released, true);
  assert.equal(calls.length, 2);
  assert.match(calls[1], /pg_advisory_unlock/);
});

test("PayPal retries and Stripe paid-order webhooks use the same recovery path", () => {
  const routes = readFileSync(new URL("./routes.ts", import.meta.url), "utf8");

  assert.match(
    routes,
    /existingOrder\.status === "paid"[\s\S]*recoverMissingPaidAudit\(existingOrder, "paypal-capture-retry"\)/,
  );
  assert.match(routes, /recoverMissingPaidAudit\(order, "paypal-reconcile-already-paid"\)/);
  assert.match(routes, /recoverMissingPaidAudit\(paidOrder, "paypal-reconcile-completed"\)/);
  assert.match(
    routes,
    /Recovery must run even when[\s\S]*recoverMissingPaidAudit\(order, "stripe-webhook"\)/,
  );
  assert.match(
    routes,
    /reconcilePaidOrdersMissingAudits[\s\S]*getAllOrders\(\{ status: "paid", limit: 250, offset \}\)[\s\S]*candidate\.productType === "PREMIUM" \|\| candidate\.productType === "ELITE"/,
  );
  assert.match(
    routes,
    /withPaidAuditOrderLock\(pool, order\.id[\s\S]*claimOrderForAudit\(order\.id, created\.id\)/,
  );
  assert.match(routes, /claimAuditForGeneration\(audit\.id\)/);
  assert.match(
    routes,
    /needsPaidAuditGenerationRecovery\(lockedOrder, audit, job\)[\s\S]*startReportGeneration\(/,
  );
  assert.match(routes, /ensurePaidAuditDeliveryWaiter\(audit\)/);
  assert.match(
    routes,
    /runOnceOnOrder\(order\.id, "customerConfirmEmailSentAt"[\s\S]*sendCTAEmail/,
  );
  assert.match(routes, /runOrderEffectOnce\(pool, orderId, flagName, op\)/);
});
