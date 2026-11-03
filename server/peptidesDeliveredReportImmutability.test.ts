import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

process.env.DATABASE_URL ||= "postgresql://test:***@127.0.0.1:5432/test";
const {
  classifyDeliveredReportImmutability,
  DELIVERED_REPAIR_CONFIRMATION,
  deliveredUsageTrackingKind,
  validateDeliveredReportRepairOverride,
} = await import("./peptidesDeliveredReportImmutability");
const { hashPeptidesReport } = await import("./peptidesReleaseHashGate");
const { MemStorage } = await import("./storage");

const esteban = {
  orderId: "6971a9e5-6cfb-4dfd-b5d7-b77796cf3f78",
  reportId: "2b2c7b6d-e41b-43c1-b1d9-9dba29093f29",
  reportSha256: "a".repeat(64),
};

function ownerOverride(reason = "Correction déterministe du rapport livré") {
  return {
    owner: "achzod",
    confirmation: DELIVERED_REPAIR_CONFIRMATION,
    ...esteban,
    reason,
  };
}

test("Esteban review/reorder evidence makes his existing report immutable", () => {
  const snapshot = classifyDeliveredReportImmutability({
    ...esteban,
    metadata: {},
    externalEvidence: [{ kind: "review_or_reorder", id: "review-esteban", at: "2026-10-09T00:00:00Z" }],
  });
  assert.equal(snapshot.immutable, true);
  assert.equal(snapshot.reportId, esteban.reportId);
});

test("Laurent confirmation-only history is not delivery evidence", () => {
  const laurentConfirmation = {
    id: "fe4124c2-4cc6-49f1-a7fa-cd7fe0262472",
    email_type: "sendPeptidesOrderConfirmation",
    subject: "Commande Peptides Engine confirmée , ton protocole arrive bientôt",
    sendpulse_status: "success",
    at: "2026-11-02T17:15:48.374Z",
    metadata: { sendpulseSmtpAnswerCode: 250 },
  };
  assert.equal(deliveredUsageTrackingKind(laurentConfirmation), null);
  const snapshot = classifyDeliveredReportImmutability({
    orderId: "f7432eba-159a-4b82-b0d6-afd273b67d37",
    reportId: "b83bf9e7-2e41-417a-81d5-b47c091363ad",
    reportSha256: "b".repeat(64),
    metadata: { peptidesOrderConfirmationSentAt: "2026-11-02T17:15:48.374Z" },
    externalEvidence: [],
  });
  assert.equal(snapshot.immutable, false);
  assert.deepEqual(snapshot.evidence, []);
});

test("report-scoped accepted delivery and exact Gmail evidence are terminal", () => {
  const snapshot = classifyDeliveredReportImmutability({
    ...esteban,
    metadata: {
      peptidesDeliveryAcceptedReportId: esteban.reportId,
      peptidesDeliveryState: "ACCEPTED",
      peptidesGmailDeliveryEvidence: {
        ...esteban,
        messageId: "gmail-message-esteban",
      },
    },
  });
  assert.equal(snapshot.immutable, true);
  assert.deepEqual(snapshot.evidence.map((item: any) => item.kind).sort(), [
    "delivery_metadata",
    "gmail_owner_evidence",
  ]);
});

test("Gmail evidence cannot cross order, report or hash identity", () => {
  const snapshot = classifyDeliveredReportImmutability({
    ...esteban,
    metadata: {
      peptidesGmailDeliveryEvidence: {
        orderId: esteban.orderId,
        reportId: esteban.reportId,
        reportSha256: "c".repeat(64),
        messageId: "wrong-hash",
      },
    },
  });
  assert.equal(snapshot.immutable, false);
});

test("provider regenerate, rebuild and reset stay forbidden even with owner override", () => {
  const snapshot = classifyDeliveredReportImmutability({
    ...esteban,
    externalEvidence: [{ kind: "delivery_tracking", id: "ready-email" }],
  });
  for (const mutation of ["generate-report", "replace-report", "reset-generation-lock", "link-order-to-report"]) {
    const verdict = validateDeliveredReportRepairOverride({ snapshot, mutation, override: ownerOverride() });
    assert.equal(verdict.ok, false, mutation);
    assert.match(verdict.error || "", /provider_or_identity_mutation_forbidden/);
  }
});

test("deterministic same-report repair requires exact owner-bound override", () => {
  const snapshot = classifyDeliveredReportImmutability({
    ...esteban,
    externalEvidence: [{ kind: "review_or_reorder", id: "review" }],
  });
  for (const mutation of ["recompute-vials", "repair-live", "edit-sections"]) {
    assert.equal(validateDeliveredReportRepairOverride({ snapshot, mutation }).ok, false);
    assert.equal(validateDeliveredReportRepairOverride({
      snapshot,
      mutation,
      override: { ...ownerOverride(), reportId: "sibling-report" },
    }).ok, false);
    assert.equal(validateDeliveredReportRepairOverride({ snapshot, mutation, override: ownerOverride() }).ok, true);
  }
});

test("concurrent delivery evidence closes mutation after preview and stale hash stays fenced", async () => {
  const storage = new MemStorage();
  const original = { marker: "before" };
  const report = await storage.createBurnoutReport({
    email: "peptides::esteban.vichera@hotmail.fr",
    responses: {},
    report: original,
  });
  const order = await storage.createOrder({
    email: "esteban.vichera@hotmail.fr",
    productType: "PEPTIDES_ENGINE",
    amountCents: 19900,
    metadata: {
      peptidesReportId: report.id,
      peptidesEmailHold: true,
    },
  });
  const reportHash = hashPeptidesReport(original);
  await storage.updateOrder(order.id, {
    status: "paid",
    metadata: {
      ...((await storage.getOrder(order.id))?.metadata as any),
      peptidesDeliveryAcceptedReportId: report.id,
      peptidesDeliveryState: "ACCEPTED",
    },
  });
  assert.equal(await storage.mutatePeptidesReportUnderHold({
    orderId: order.id,
    reportId: report.id,
    expectedSha256: reportHash,
    nextReport: { marker: "blocked" },
    mutation: "edit-sections",
  }), undefined);
  const exactOverride = {
    owner: "achzod",
    confirmation: DELIVERED_REPAIR_CONFIRMATION,
    orderId: order.id,
    reportId: report.id,
    reportSha256: reportHash,
    reason: "Correction déterministe post-livraison",
  };
  assert.ok(await storage.mutatePeptidesReportUnderHold({
    orderId: order.id,
    reportId: report.id,
    expectedSha256: reportHash,
    nextReport: { marker: "allowed" },
    mutation: "edit-sections",
    deliveredReportRepairOverride: exactOverride,
  }));
  assert.equal(await storage.mutatePeptidesReportUnderHold({
    orderId: order.id,
    reportId: report.id,
    expectedSha256: reportHash,
    nextReport: { marker: "stale" },
    mutation: "edit-sections",
    deliveredReportRepairOverride: exactOverride,
  }), undefined);
});

test("admin, reset and AutoGen paths all invoke the delivered immutability gate", () => {
  const routes = readFileSync(new URL("./routes.ts", import.meta.url), "utf8");
  const migration = readFileSync(new URL("../migrations/012_peptides_delivered_report_immutability.sql", import.meta.url), "utf8");
  const reset = routes.indexOf('/api/admin/orders/:id/peptides-reset-generation-lock');
  const manual = routes.indexOf('/api/admin/peptides-generate');
  const autoGen = routes.indexOf('DELIVERED_REPORT_IMMUTABILITY_GATE retained');
  const provider = routes.indexOf('report = await generatePeptidesProtocol', manual);
  assert.ok(reset >= 0 && routes.indexOf('readDeliveredReportImmutability(order)', reset) > reset);
  assert.ok(manual >= 0 && routes.indexOf('validateManualPeptidesOrderTargetOrRespond', manual) < provider);
  assert.ok(autoGen >= 0 && autoGen < routes.indexOf('evaluatePeptidesFulfillmentInvariant', autoGen));
  assert.match(routes, /deliveredReportRepairOverride: req\.body\?\.deliveredReportRepairOverride/);
  const testGenerate = routes.indexOf('/api/admin/peptides/test-generate');
  assert.ok(testGenerate >= 0);
  assert.ok(routes.indexOf('restricted to synthetic QA identities', testGenerate) > testGenerate);
  assert.ok(routes.indexOf('costCategory: "test"', testGenerate) > testGenerate);
  assert.match(migration, /PRIMARY KEY \(order_id, report_id, report_sha256, evidence_type, evidence_id\)/);
  assert.match(migration, /gmail_owner_evidence/);
});
