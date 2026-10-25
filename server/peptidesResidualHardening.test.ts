import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

process.env.DATABASE_URL ||= "postgresql://test:***@127.0.0.1:5432/test";
const { MemStorage } = await import("./storage");
const { hashPeptidesReport } = await import("./peptidesReleaseHashGate");
const { hashPeptidesManualMutationPayload } = await import("./peptidesManualMutationGuard");
const { getPeptidesGenerationCircuitConfig } = await import("./peptidesGenerationCircuitBreaker");
const { peptidesBloodCreditsForTier } = await import("./peptidesEntitlements");

async function activeOrder(storage: InstanceType<typeof MemStorage>, metadata: Record<string, unknown> = {}, email = "client@example.com") {
  const order = await storage.createOrder({
    email,
    productType: "PEPTIDES_ENGINE",
    amountCents: 29900,
    metadata,
  });
  await storage.updateOrder(order.id, { status: "paid", paidAt: new Date() });
  return (await storage.getOrder(order.id))!;
}

test("ACCEPTED delivery is terminal and cannot be downgraded", async () => {
  const storage = new MemStorage();
  const order = await activeOrder(storage, { peptidesReportId: "report-1" });
  assert.equal(await storage.claimPeptidesDelivery(order.id, "report-1", "claim-1"), true);
  assert.equal(await storage.finalizePeptidesDeliveryClaim(order.id, "report-1", "claim-1", "ACCEPTED"), true);
  assert.equal(await storage.finalizePeptidesDeliveryClaim(order.id, "report-1", "claim-1", "FAILED"), false);
  assert.equal(await storage.finalizePeptidesDeliveryClaim(order.id, "report-1", "claim-1", "UNKNOWN"), false);
  const current = await storage.getOrder(order.id);
  assert.equal((current?.metadata as any)?.peptidesDeliveryState, "ACCEPTED");
  assert.equal((current?.metadata as any)?.peptidesEmailHold, false);
});

test("strict HOLD release rejects a report changed after validation", async () => {
  const storage = new MemStorage();
  const original = { qualityVersion: "expert-standard-v1", marker: "approved" };
  const record = await storage.createBurnoutReport({
    email: "peptides::client@example.com",
    responses: {},
    report: original,
  });
  const approvedHash = hashPeptidesReport(original);
  const order = await activeOrder(storage, {
    peptidesReportId: record.id,
    peptidesEmailHold: true,
    peptidesManualFulfillment: true,
    peptidesApprovedReportSha256: approvedHash,
    peptidesReleaseAuditVerdict: "PASS_STRICT",
  });

  await storage.updateBurnoutReport(record.id, { ...original, marker: "mutated" });
  assert.equal(await storage.releasePeptidesDeliveryHoldIfApproved({
    orderId: order.id,
    reportId: record.id,
    expectedCurrentReportSha256: approvedHash,
    expectedApprovedReportSha256: approvedHash,
    expectedReleaseVerdict: "PASS_STRICT",
  }), false);
  assert.equal(((await storage.getOrder(order.id))?.metadata as any)?.peptidesEmailHold, true);
});

test("legacy delivery tracking backfills exact report state and blocks ambiguous recipient-only evidence", async () => {
  const storage = new MemStorage();
  const first = await activeOrder(storage, { peptidesReportId: "report-a" });
  (storage as any).emailTrackings.set("tracking-exact", {
    id: "tracking-exact",
    auditId: null,
    emailType: "sendCTAEmail",
    recipientEmail: "client@example.com",
    subject: "Ton protocole peptides personnalisé est prêt",
    sendpulseStatus: "success",
    metadata: { orderId: first.id, reportId: "report-a" },
    sentAt: new Date(),
  });
  assert.equal(await storage.backfillAcceptedPeptidesDeliveryFromTracking(first.id, "report-a"), "ACCEPTED");
  assert.equal(((await storage.getOrder(first.id))?.metadata as any)?.peptidesDeliveryState, "ACCEPTED");

  const unscoped = new MemStorage();
  const single = await activeOrder(unscoped, { peptidesReportId: "report-single" }, "single@example.com");
  (unscoped as any).emailTrackings.set("tracking-unscoped", {
    id: "tracking-unscoped",
    auditId: null,
    emailType: "sendCTAEmail",
    recipientEmail: "single@example.com",
    subject: "Ton protocole peptides personnalisé est prêt",
    sendpulseStatus: "success",
    metadata: {},
    sentAt: new Date(),
  });
  assert.equal(await unscoped.backfillAcceptedPeptidesDeliveryFromTracking(single.id, "report-single"), "AMBIGUOUS");
  assert.equal(((await unscoped.getOrder(single.id))?.metadata as any)?.peptidesDeliveryState, undefined);
  assert.equal(((await unscoped.getOrder(single.id))?.metadata as any)?.peptidesEmailHoldReason, "LEGACY_DELIVERY_EVIDENCE_UNSCOPED");

  const ambiguous = new MemStorage();
  const orderA = await activeOrder(ambiguous, { peptidesReportId: "report-a" }, "same@example.com");
  await activeOrder(ambiguous, { peptidesReportId: "report-b" }, "same@example.com");
  (ambiguous as any).emailTrackings.set("tracking-generic", {
    id: "tracking-generic",
    auditId: null,
    emailType: "sendCTAEmail",
    recipientEmail: "same@example.com",
    subject: "Ton protocole peptides personnalisé est prêt",
    sendpulseStatus: "success",
    metadata: {},
    sentAt: new Date(),
  });
  assert.equal(await ambiguous.backfillAcceptedPeptidesDeliveryFromTracking(orderA.id, "report-a"), "AMBIGUOUS");
  const held = await ambiguous.getOrder(orderA.id);
  assert.equal((held?.metadata as any)?.peptidesEmailHold, true);
  assert.equal((held?.metadata as any)?.peptidesEmailHoldReason, "LEGACY_DELIVERY_EVIDENCE_UNSCOPED");
});

test("MemStorage report persistence is atomic and enforces PostgreSQL source parity", async () => {
  const storage = new MemStorage();
  const responses = { pep_email: "client@example.com", pep_name: "Client" };
  const sourceHash = hashPeptidesManualMutationPayload(responses);
  const order = await activeOrder(storage, {
    peptidesResponses: responses,
    peptidesResponsesSha256: sourceHash,
  });
  const [a, b] = await Promise.all([
    storage.createAndClaimPeptidesReport({
      orderId: order.id,
      email: "peptides::client@example.com",
      responses,
      report: { winner: "a" },
      expectedResponsesSha256: sourceHash,
    }),
    storage.createAndClaimPeptidesReport({
      orderId: order.id,
      email: "peptides::client@example.com",
      responses,
      report: { winner: "b" },
      expectedResponsesSha256: sourceHash,
    }),
  ]);
  assert.equal([a, b].filter(Boolean).length, 1);
  assert.equal((await storage.getAllBurnoutReports()).length, 1);

  const mismatchStorage = new MemStorage();
  const mismatchOrder = await activeOrder(mismatchStorage, {
    peptidesResponses: responses,
    peptidesResponsesSha256: sourceHash,
  });
  assert.equal(await mismatchStorage.createAndClaimPeptidesReport({
    orderId: mismatchOrder.id,
    email: "peptides::attacker@example.com",
    responses,
    report: {},
    expectedResponsesSha256: sourceHash,
  }), undefined);
  assert.equal(await mismatchStorage.createAndClaimPeptidesReport({
    orderId: mismatchOrder.id,
    email: "peptides::client@example.com",
    responses: { ...responses, pep_name: "Altered" },
    report: {},
    expectedResponsesSha256: sourceHash,
  }), undefined);
});

test("legacy Peptides orders keep two Blood credits and paid PayPal retries repair grants", () => {
  assert.equal(peptidesBloodCreditsForTier(undefined), 2);
  assert.equal(peptidesBloodCreditsForTier(null), 2);
  assert.equal(peptidesBloodCreditsForTier("solo"), 0);
  assert.equal(peptidesBloodCreditsForTier("coached"), 1);
  assert.equal(peptidesBloodCreditsForTier("tracked"), 2);

  const routes = readFileSync(new URL("./routes.ts", import.meta.url), "utf8");
  const captureStart = routes.indexOf('app.post("/api/paypal/capture-order"');
  const captureEnd = routes.indexOf("// Mark order as paid", captureStart);
  const alreadyPaidPath = routes.slice(captureStart, captureEnd);
  assert.match(alreadyPaidPath, /existingOrder\.status === "paid"[\s\S]*grantBloodCreditsForOrder/);
  assert.match(alreadyPaidPath, /peptidesCreditsGranted/);
  assert.match(routes, /async function repairMissingPaidOrderCredits/);
  assert.match(routes, /await reconcileAllPendingPaypalOrders\(168\);[\s\S]*await repairMissingPaidOrderCredits\(\)/);
});

test("partial_refund orders remain generation-eligible and reservation windows use per-attempt ledger", async () => {
  const storage = new MemStorage();
  const old = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
  const order = await activeOrder(storage, {
    peptidesGenerationReservationLedger: [{ startedAt: old, costMicroUsd: 900, claimId: "old" }],
    peptidesGenerationReservedCostMicroUsd: 900,
    peptidesGenerationAttempts: 1,
  });
  await storage.updateOrder(order.id, { status: "partial_refund" as any });
  const config = getPeptidesGenerationCircuitConfig({
    PEPTIDES_AUTOGEN_MAX_ATTEMPTS: "3",
    PEPTIDES_AUTOGEN_MAX_BUDGET_MICRO_USD: "2000",
    PEPTIDES_AUTOGEN_ATTEMPT_BUDGET_MICRO_USD: "500",
    PEPTIDES_AUTOGEN_HOURLY_BUDGET_MICRO_USD: "500",
    PEPTIDES_AUTOGEN_DAILY_BUDGET_MICRO_USD: "500",
  });
  const claim = await storage.claimPeptidesGenerationAttempt(order.id, config);
  assert.ok(claim);
  const ledger = ((await storage.getOrder(order.id))?.metadata as any)?.peptidesGenerationReservationLedger;
  assert.equal(ledger.length, 1);
  assert.equal(ledger[0].claimId, claim?.claimId);
});
