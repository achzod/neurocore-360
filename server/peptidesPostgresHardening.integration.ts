import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test, { after, before } from "node:test";
import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL || "";
if (!/127\.0\.0\.1|localhost/.test(databaseUrl)) {
  throw new Error("peptidesPostgresHardening.test.ts requires an ephemeral localhost PostgreSQL database");
}

const { PgStorage, closeStoragePoolForTests } = await import("./storage");
const { hashPeptidesManualMutationPayload } = await import("./peptidesManualMutationGuard");
const { hashPeptidesReport } = await import("./peptidesReleaseHashGate");
const { getPeptidesGenerationCircuitConfig } = await import("./peptidesGenerationCircuitBreaker");
const adminPool = new Pool({ connectionString: databaseUrl });

before(async () => {
  await adminPool.query(`
    CREATE TABLE IF NOT EXISTS email_tracking (
      id VARCHAR(36) PRIMARY KEY,
      audit_id VARCHAR(255),
      email_type VARCHAR(100),
      recipient_email VARCHAR(255),
      subject TEXT,
      sendpulse_status VARCHAR(100),
      sendpulse_error TEXT,
      metadata JSONB DEFAULT '{}'::jsonb,
      sent_at TIMESTAMP DEFAULT NOW(),
      converted TIMESTAMP,
      conversion_type VARCHAR(100),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);
});

after(async () => {
  await adminPool.end();
  await closeStoragePoolForTests();
});

async function createActiveOrder(storage: InstanceType<typeof PgStorage>, email: string, metadata: Record<string, unknown>) {
  const order = await storage.createOrder({
    email,
    productType: "PEPTIDES_ENGINE",
    amountCents: 29900,
    metadata,
  });
  await storage.updateOrder(order.id, { status: "paid", paidAt: new Date() });
  return (await storage.getOrder(order.id))!;
}

test("PostgreSQL enforces one report, monotone delivery and an atomic release/mutation race", async () => {
  const storage = new PgStorage();
  const email = `pg-${randomUUID()}@example.com`;
  const responses = { pep_email: email, pep_name: "PG" };
  const sourceHash = hashPeptidesManualMutationPayload(responses);
  const order = await createActiveOrder(storage, email, {
    peptidesResponses: responses,
    peptidesResponsesSha256: sourceHash,
  });
  const report = { qualityVersion: "expert-standard-v1", marker: "approved" };
  const [first, second] = await Promise.all([
    storage.createAndClaimPeptidesReport({
      orderId: order.id,
      email: `peptides::${email}`,
      responses,
      report,
      expectedResponsesSha256: sourceHash,
    }),
    storage.createAndClaimPeptidesReport({
      orderId: order.id,
      email: `peptides::${email}`,
      responses,
      report: { ...report, marker: "loser" },
      expectedResponsesSha256: sourceHash,
    }),
  ]);
  assert.equal([first, second].filter(Boolean).length, 1);
  const winner = first || second;
  assert.ok(winner);
  const count = await adminPool.query(
    "SELECT COUNT(*)::int AS count FROM burnout_reports WHERE LOWER(email) = LOWER($1)",
    [`peptides::${email}`],
  );
  assert.equal(count.rows[0].count, 1);

  assert.equal(await storage.claimPeptidesDelivery(order.id, winner!.id, "claim-pg"), true);
  assert.equal(await storage.finalizePeptidesDeliveryClaim(order.id, winner!.id, "claim-pg", "ACCEPTED"), true);
  assert.equal(await storage.finalizePeptidesDeliveryClaim(order.id, winner!.id, "claim-pg", "FAILED"), false);
  assert.equal(((await storage.getOrder(order.id))?.metadata as any)?.peptidesDeliveryState, "ACCEPTED");

  const currentHash = hashPeptidesReport(winner!.report);
  await storage.setOrderMetadataIfPeptidesReportMatches(order.id, winner!.id, {
    peptidesEmailHold: true,
    peptidesManualFulfillment: true,
    peptidesApprovedReportSha256: currentHash,
    peptidesReleaseAuditVerdict: "PASS_STRICT",
  });
  const [released, mutated] = await Promise.all([
    storage.releasePeptidesDeliveryHoldIfApproved({
      orderId: order.id,
      reportId: winner!.id,
      expectedCurrentReportSha256: currentHash,
      expectedApprovedReportSha256: currentHash,
      expectedReleaseVerdict: "PASS_STRICT",
    }),
    storage.mutatePeptidesReportUnderHold({
      orderId: order.id,
      reportId: winner!.id,
      expectedSha256: currentHash,
      nextReport: { ...winner!.report as any, marker: "mutated" },
      mutation: "race-test",
    }),
  ]);
  assert.equal(Number(released) + Number(Boolean(mutated)), 1, "release and mutation cannot both commit");
  const finalOrder = await storage.getOrder(order.id);
  const finalReport = await storage.getBurnoutReport(winner!.id);
  if (released) {
    assert.equal((finalOrder?.metadata as any)?.peptidesEmailHold, false);
    assert.equal(hashPeptidesReport(finalReport?.report), currentHash);
  } else {
    assert.equal((finalOrder?.metadata as any)?.peptidesEmailHold, true);
    assert.equal((finalOrder?.metadata as any)?.peptidesReleaseAuditVerdict, "PENDING_REVALIDATION");
    assert.notEqual(hashPeptidesReport(finalReport?.report), currentHash);
  }
});

test("PostgreSQL backfills exact legacy delivery and claims partial-refund generation with a per-attempt ledger", async () => {
  const storage = new PgStorage();
  const email = `legacy-${randomUUID()}@example.com`;
  const responses = { pep_email: email, pep_name: "Legacy" };
  const sourceHash = hashPeptidesManualMutationPayload(responses);
  const order = await createActiveOrder(storage, email, {
    peptidesResponses: responses,
    peptidesResponsesSha256: sourceHash,
  });
  const saved = await storage.createAndClaimPeptidesReport({
    orderId: order.id,
    email: `peptides::${email}`,
    responses,
    report: { qualityVersion: "expert-standard-v1" },
    expectedResponsesSha256: sourceHash,
  });
  assert.ok(saved);
  await adminPool.query(
    `INSERT INTO email_tracking
      (id, audit_id, email_type, recipient_email, subject, sendpulse_status, metadata, sent_at)
     VALUES ($1, NULL, 'sendCTAEmail', $2, $3, 'success', $4::jsonb, NOW())`,
    [randomUUID(), email, "Ton protocole peptides personnalisé est prêt", JSON.stringify({ orderId: order.id, reportId: saved!.id })],
  );
  assert.equal(await storage.backfillAcceptedPeptidesDeliveryFromTracking(order.id, saved!.id), "ACCEPTED");
  assert.equal(((await storage.getOrder(order.id))?.metadata as any)?.peptidesDeliveryState, "ACCEPTED");

  const pendingEmail = `pending-${randomUUID()}@example.com`;
  const pendingOrder = await createActiveOrder(storage, pendingEmail, { peptidesReportId: "report-pending" });
  await adminPool.query(
    `INSERT INTO email_tracking
      (id, audit_id, email_type, recipient_email, subject, sendpulse_status, metadata, sent_at)
     VALUES ($1, NULL, 'sendCTAEmail', $2, $3, 'pending', $4::jsonb, NOW())`,
    [randomUUID(), pendingEmail, "Ton protocole peptides personnalisé est prêt", JSON.stringify({ orderId: pendingOrder.id, reportId: "report-pending" })],
  );
  assert.equal(await storage.backfillAcceptedPeptidesDeliveryFromTracking(pendingOrder.id, "report-pending"), "AMBIGUOUS");
  assert.equal(((await storage.getOrder(pendingOrder.id))?.metadata as any)?.peptidesEmailHoldReason, "LEGACY_DELIVERY_EVIDENCE_NOT_POSITIVE");

  const retryEmail = `retry-${randomUUID()}@example.com`;
  const retryOrder = await createActiveOrder(storage, retryEmail, { peptidesReportId: "report-retry" });
  assert.equal(await storage.claimPeptidesDelivery(retryOrder.id, "report-retry", "claim-failed"), true);
  assert.equal(await storage.finalizePeptidesDeliveryClaim(retryOrder.id, "report-retry", "claim-failed", "FAILED"), true);
  assert.equal(((await storage.getOrder(retryOrder.id))?.metadata as any)?.peptidesDeliveryClaimId, "");
  await storage.setOrderMetadataIfPeptidesReportMatches(retryOrder.id, "report-retry", {
    peptidesEmailHold: false,
    peptidesManualFulfillment: false,
  });
  assert.equal(await storage.claimPeptidesDelivery(retryOrder.id, "report-retry", "claim-retry"), true);

  const inflightEmail = `inflight-${randomUUID()}@example.com`;
  const inflightResponses = { pep_email: inflightEmail, pep_name: "Inflight" };
  const inflightHash = hashPeptidesManualMutationPayload(inflightResponses);
  const inflightOrder = await createActiveOrder(storage, inflightEmail, {
    peptidesResponses: inflightResponses,
    peptidesResponsesSha256: inflightHash,
  });
  const inflightReport = await storage.createAndClaimPeptidesReport({
    orderId: inflightOrder.id,
    email: `peptides::${inflightEmail}`,
    responses: inflightResponses,
    report: { qualityVersion: "expert-standard-v1", marker: "before" },
    expectedResponsesSha256: inflightHash,
  });
  assert.ok(inflightReport);
  assert.equal(await storage.claimPeptidesDelivery(inflightOrder.id, inflightReport!.id, "claim-inflight"), true);
  await storage.setOrderMetadataIfPeptidesReportMatches(inflightOrder.id, inflightReport!.id, {
    peptidesEmailHold: true,
    peptidesManualFulfillment: true,
  });
  assert.equal(await storage.mutatePeptidesReportUnderHold({
    orderId: inflightOrder.id,
    reportId: inflightReport!.id,
    expectedSha256: hashPeptidesReport(inflightReport!.report),
    nextReport: { ...inflightReport!.report as any, marker: "during-send" },
    mutation: "inflight-test",
  }), undefined);
  const inflightReportHash = hashPeptidesReport(inflightReport!.report);
  await storage.setOrderMetadataIfPeptidesReportMatches(inflightOrder.id, inflightReport!.id, {
    peptidesApprovedReportSha256: inflightReportHash,
    peptidesReleaseAuditVerdict: "PASS_STRICT",
  });
  assert.equal(await storage.releasePeptidesDeliveryHoldIfApproved({
    orderId: inflightOrder.id,
    reportId: inflightReport!.id,
    expectedCurrentReportSha256: inflightReportHash,
    expectedApprovedReportSha256: inflightReportHash,
    expectedReleaseVerdict: "PASS_STRICT",
  }), false);
  assert.equal(((await storage.getOrder(inflightOrder.id))?.metadata as any)?.peptidesEmailHold, true);

  const releasedEmail = `released-${randomUUID()}@example.com`;
  const releasedResponses = { pep_email: releasedEmail, pep_name: "Released" };
  const releasedSourceHash = hashPeptidesManualMutationPayload(releasedResponses);
  const releasedOrder = await createActiveOrder(storage, releasedEmail, {
    peptidesResponses: releasedResponses,
    peptidesResponsesSha256: releasedSourceHash,
  });
  const releasedReport = await storage.createAndClaimPeptidesReport({
    orderId: releasedOrder.id,
    email: `peptides::${releasedEmail}`,
    responses: releasedResponses,
    report: { qualityVersion: "expert-standard-v1", marker: "approved" },
    expectedResponsesSha256: releasedSourceHash,
  });
  assert.ok(releasedReport);
  const releasedHash = hashPeptidesReport(releasedReport!.report);
  await storage.setOrderMetadataIfPeptidesReportMatches(releasedOrder.id, releasedReport!.id, {
    peptidesEmailHold: false,
    peptidesManualFulfillment: false,
    peptidesApprovedReportSha256: releasedHash,
    peptidesReleaseAuditVerdict: "PASS_STRICT",
  });
  assert.equal(await storage.updateBurnoutReportIfHashMatches(
    releasedOrder.id,
    releasedReport!.id,
    releasedHash,
    { ...releasedReport!.report as any, marker: "stale-refresh" },
  ), undefined);

  const budgetEmail = `budget-${randomUUID()}@example.com`;
  const budgetOrder = await createActiveOrder(storage, budgetEmail, {
    peptidesGenerationAttempts: 1,
    peptidesGenerationReservedCostMicroUsd: 900,
    peptidesGenerationReservationLedger: [{
      startedAt: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(),
      costMicroUsd: 900,
      claimId: "expired",
    }],
  });
  await storage.updateOrder(budgetOrder.id, { status: "partial_refund" as any });
  const config = getPeptidesGenerationCircuitConfig({
    PEPTIDES_AUTOGEN_MAX_ATTEMPTS: "2",
    PEPTIDES_AUTOGEN_ATTEMPT_BUDGET_MICRO_USD: "500",
    PEPTIDES_AUTOGEN_MAX_BUDGET_MICRO_USD: "2000",
    PEPTIDES_AUTOGEN_HOURLY_BUDGET_MICRO_USD: "500",
    PEPTIDES_AUTOGEN_DAILY_BUDGET_MICRO_USD: "500",
  });
  const claim = await storage.claimPeptidesGenerationAttempt(budgetOrder.id, config);
  assert.ok(claim);
  const refreshed = await storage.getOrder(budgetOrder.id);
  const ledger = (refreshed?.metadata as any)?.peptidesGenerationReservationLedger;
  assert.equal(Array.isArray(ledger), true);
  assert.equal(ledger.at(-1).claimId, claim?.claimId);

  const heldOrder = await createActiveOrder(storage, `held-${randomUUID()}@example.com`, {
    peptidesEmailHold: true,
    peptidesManualFulfillment: true,
    peptidesGenerationResponseId: "resp-held",
  });
  assert.equal(await storage.claimPeptidesGenerationAttempt(heldOrder.id, config), null);
  assert.equal(await storage.claimPeptidesGenerationResume(heldOrder.id, "resp-held", config.leaseMs), null);

  await storage.updateOrder(budgetOrder.id, { status: "refunded" as any });
  const budgetBlocked = await createActiveOrder(storage, `budget-blocked-${randomUUID()}@example.com`, {});
  assert.equal(await storage.claimPeptidesGenerationAttempt(budgetBlocked.id, config), null);
});
