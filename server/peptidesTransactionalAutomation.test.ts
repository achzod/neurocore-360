import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

process.env.DATABASE_URL ||= "postgresql://test:test@127.0.0.1:5432/test";
const { MemStorage } = await import("./storage");
const {
  buildPeptidesCoachingDeductionBlock,
  PEPTIDES_BLOOD_CREDITS,
  PEPTIDES_COACHING_DEDUCTION,
} = await import("./cta");
const { hashPeptidesReport } = await import("./peptidesReleaseHashGate");
const { getPeptidesGenerationCircuitConfig } = await import("./peptidesGenerationCircuitBreaker");
const { hashPeptidesManualMutationPayload } = await import("./peptidesManualMutationGuard");

async function paidPeptidesOrder(metadata: Record<string, unknown> = {}) {
  const storage = new MemStorage();
  const order = await storage.createOrder({
    email: "client@example.com",
    productType: "PEPTIDES_ENGINE",
    amountCents: 29900,
    metadata,
  });
  await storage.updateOrder(order.id, { status: "paid", paidAt: new Date() });
  return { storage, order: (await storage.getOrder(order.id))! };
}

test("confirmation claim is single-writer and remains terminal after provider ambiguity", async () => {
  const { storage, order } = await paidPeptidesOrder();
  assert.equal(await storage.claimPeptidesAutomation(order.id, "", "peptidesOrderConfirmationClaimId", "claim-1"), true);
  assert.equal(await storage.claimPeptidesAutomation(order.id, "", "peptidesOrderConfirmationClaimId", "claim-2"), false);
});

test("email hold and manual fulfillment block confirmation and report delivery claims", async () => {
  for (const metadata of [
    { peptidesEmailHold: true },
    { peptidesManualFulfillment: true },
  ]) {
    const reportId = "report-held";
    const { storage, order } = await paidPeptidesOrder({ ...metadata, peptidesReportId: reportId });
    assert.equal(await storage.claimPeptidesAutomation(order.id, reportId, "peptidesOrderConfirmationClaimId", "confirm"), false);
    assert.equal(await storage.claimPeptidesDelivery(order.id, reportId, "delivery"), false);
  }
});

test("report delivery claim is bound to the linked artifact and single-writer", async () => {
  const reportId = "report-current";
  const { storage, order } = await paidPeptidesOrder({ peptidesReportId: reportId });
  assert.equal(await storage.claimPeptidesDelivery(order.id, "report-old", "claim-old"), false);
  assert.equal(await storage.claimPeptidesDelivery(order.id, reportId, "claim-current"), true);
  assert.equal(await storage.claimPeptidesDelivery(order.id, reportId, "claim-racer"), false);
  await storage.finalizePeptidesDeliveryClaim(order.id, reportId, "claim-current", "UNKNOWN");
  assert.equal(await storage.claimPeptidesDelivery(order.id, reportId, "claim-retry"), false);
  const updated = await storage.getOrder(order.id);
  assert.equal((updated?.metadata as any)?.peptidesDeliveryReportId, reportId);
  assert.equal((updated?.metadata as any)?.peptidesEmailHold, true);
  assert.equal((updated?.metadata as any)?.peptidesEmailHoldReason, "DELIVERY_PROVIDER_RESULT_UNCERTAIN");
});

test("SMTP reconciliation never clears a manual hold set after provider submission", async () => {
  const reportId = "report-pending";
  const { storage, order } = await paidPeptidesOrder({ peptidesReportId: reportId });
  assert.equal(await storage.claimPeptidesDelivery(order.id, reportId, "claim-pending"), true);
  assert.equal(await storage.finalizePeptidesDeliveryClaim(order.id, reportId, "claim-pending", "UNKNOWN"), true);
  await storage.setOrderMetadataIfPeptidesReportMatches(order.id, reportId, {
    peptidesEmailHold: true,
    peptidesEmailHoldReason: "MANUAL_REVIEW",
    peptidesManualFulfillment: true,
  });
  assert.equal(await storage.finalizePeptidesDeliveryClaim(order.id, reportId, "claim-pending", "ACCEPTED"), true);
  const finalOrder = await storage.getOrder(order.id);
  assert.equal((finalOrder?.metadata as any)?.peptidesDeliveryState, "ACCEPTED");
  assert.equal((finalOrder?.metadata as any)?.peptidesEmailHold, true);
  assert.equal((finalOrder?.metadata as any)?.peptidesEmailHoldReason, "MANUAL_REVIEW");
});

test("stale report mutations lose CAS and a deliberate relink resets delivery under hold", async () => {
  const { storage, order } = await paidPeptidesOrder({
    peptidesReportId: "report-a",
    peptidesDeliveryClaimId: "old-claim",
    peptidesDeliveryReportId: "report-a",
    peptidesDeliveryState: "ACCEPTED",
    peptidesEmailScheduledAt: new Date().toISOString(),
    peptidesCycle2ReorderClaimId: "old-reorder",
    "peptidesAutomationClaim:peptidesReviewJ3": "old-review",
  });
  assert.equal(await storage.setOrderMetadataIfPeptidesReportMatches(order.id, "report-old", { peptidesReportId: "" }), false);
  assert.equal(await storage.replacePeptidesReportSlotIfMatches(order.id, "report-old", "report-b"), false);
  assert.equal(await storage.replacePeptidesReportSlotIfMatches(order.id, "report-a", "report-b"), true);
  const relinked = (await storage.getOrder(order.id))?.metadata as any;
  assert.equal(relinked.peptidesReportId, "report-b");
  assert.equal(relinked.peptidesEmailHold, true);
  assert.equal(relinked.peptidesManualFulfillment, true);
  assert.equal(relinked.peptidesDeliveryClaimId, undefined);
  assert.equal(relinked.peptidesDeliveryReportId, undefined);
  assert.equal(relinked.peptidesDeliveryState, undefined);
  assert.equal(relinked.peptidesEmailScheduledAt, undefined);
  assert.equal(relinked.peptidesCycle2ReorderClaimId, undefined);
  assert.equal(relinked["peptidesAutomationClaim:peptidesReviewJ3"], undefined);
});

test("manual report mutation atomically requires the exact linked report, HOLD and hash", async () => {
  const { storage, order } = await paidPeptidesOrder();
  const original = { qualityVersion: "expert-standard-v1", marker: "before" };
  const record = await storage.createBurnoutReport({
    email: "peptides::client@example.com",
    responses: {},
    report: original,
  });
  await storage.updateOrder(order.id, {
    metadata: {
      peptidesReportId: record.id,
      peptidesEmailHold: true,
      peptidesApprovedReportSha256: hashPeptidesReport(original),
      peptidesReleaseAuditVerdict: "PASS",
    } as any,
  });

  assert.equal(await storage.mutatePeptidesReportUnderHold({
    orderId: order.id,
    reportId: record.id,
    expectedSha256: "0".repeat(64),
    nextReport: { marker: "wrong" },
    mutation: "edit-sections",
  }), undefined);

  const next = { qualityVersion: "expert-standard-v1", marker: "after" };
  const updated = await storage.mutatePeptidesReportUnderHold({
    orderId: order.id,
    reportId: record.id,
    expectedSha256: hashPeptidesReport(original),
    nextReport: next,
    mutation: "edit-sections",
  });
  assert.deepEqual(updated?.report, next);
  const updatedOrder = await storage.getOrder(order.id);
  assert.equal((updatedOrder?.metadata as any)?.peptidesReleaseAuditVerdict, "PENDING_REVALIDATION");
  assert.equal((updatedOrder?.metadata as any)?.peptidesApprovedReportSha256, "");
  assert.equal((updatedOrder?.metadata as any)?.peptidesEmailHold, true);
});

test("expired generation workers are fenced from response, retry and report persistence", async () => {
  const responses = { pep_email: "client@example.com", pep_name: "Client" };
  const responsesHash = hashPeptidesManualMutationPayload(responses);
  const { storage, order } = await paidPeptidesOrder({
    peptidesResponses: responses,
    peptidesResponsesSha256: responsesHash,
  });
  const config = getPeptidesGenerationCircuitConfig({
    PEPTIDES_AUTOGEN_MAX_ATTEMPTS: "2",
    PEPTIDES_AUTOGEN_LEASE_MS: "60000",
  });
  const first = await storage.claimPeptidesGenerationAttempt(order.id, config);
  assert.ok(first);
  const afterFirst = await storage.getOrder(order.id);
  await storage.updateOrder(order.id, {
    metadata: {
      ...((afterFirst?.metadata as any) || {}),
      peptidesGenerationLeaseUntil: new Date(Date.now() - 1_000).toISOString(),
    },
  });
  const second = await storage.claimPeptidesGenerationAttempt(order.id, config);
  assert.ok(second);
  assert.notEqual(first!.claimId, second!.claimId);
  assert.equal(
    await storage.setPeptidesGenerationResponseIdIfClaimMatches(order.id, first!.claimId, "resp-stale"),
    false,
  );
  assert.equal(
    await storage.markPeptidesGenerationRetry(
      order.id,
      first!.attemptCount,
      "stale",
      "stale",
      new Date(Date.now() + 60_000).toISOString(),
      first!.claimId,
    ),
    false,
  );
  assert.equal(await storage.createAndClaimPeptidesReport({
    orderId: order.id,
    email: "peptides::client@example.com",
    responses,
    report: { marker: "stale" },
    expectedResponsesSha256: responsesHash,
    expectedGenerationClaimId: first!.claimId,
  }), undefined);
});

test("production flow centralizes confirmation and claims every report delivery before provider calls", () => {
  const routes = readFileSync(new URL("./routes.ts", import.meta.url), "utf8");
  assert.match(routes, /async function sendPeptidesOrderConfirmationOnce/);
  assert.match(routes, /peptidesOrderConfirmationClaimId/);
  assert.match(routes, /claimPeptidesGenerationAttempt\(/);
  const preGenerationConfirmation = routes.indexOf("[AutoGen PreGeneration] Confirmation email failed");
  const generationProviderCall = routes.indexOf("report = await generatePeptidesProtocol", preGenerationConfirmation);
  assert.ok(preGenerationConfirmation >= 0 && generationProviderCall > preGenerationConfirmation,
    "payment confirmation must be attempted before Peptides generation provider calls");
  assert.match(routes, /claimPeptidesDelivery\(order\.id, recoveryReportId, recoveryClaimId\)/);
  assert.match(routes, /claimPeptidesDelivery\(order\.id, saved\.id, deliveryClaimId\)/);
  assert.match(routes, /finalizePeptidesDeliveryClaim\([\s\S]*"UNKNOWN"/);
  assert.match(routes, /createAndClaimPeptidesReport/);
  assert.doesNotMatch(routes, /Unclaimed report \$\{saved\.id\}/);
});

test("every paid admin generation path confirms before the AI provider call", () => {
  const routes = readFileSync(new URL("./routes.ts", import.meta.url), "utf8");
  const forcePaidStart = routes.indexOf('app.post("/api/admin/orders/:id/force-paid"');
  const forcePaidEnd = routes.indexOf('app.post("/api/admin/orders/:id/cancel"', forcePaidStart);
  const forcePaid = routes.slice(forcePaidStart, forcePaidEnd);
  assert.match(forcePaid, /PEPTIDES_FORCE_PAID_DISABLED/);
  assert.doesNotMatch(forcePaid, /generatePeptidesProtocol/);

  const cases = [
    {
      name: "manual peptides generation",
      start: 'app.post("/api/admin/peptides-generate"',
      end: 'app.post("/api/admin/peptides-link-order-to-report"',
    },
  ];

  for (const route of cases) {
    const start = routes.indexOf(route.start);
    const end = routes.indexOf(route.end, start);
    assert.ok(start >= 0 && end > start, `${route.name} route bounds must exist`);
    const source = routes.slice(start, end);
    const confirmation = source.indexOf("sendPeptidesOrderConfirmationOnce");
    const provider = source.indexOf("generatePeptidesProtocol");
    const sourceRead = source.indexOf("validateTrustedPeptidesOrderSource");
    assert.ok(confirmation >= 0, `${route.name} must attempt confirmation`);
    assert.ok(sourceRead > confirmation, `${route.name} must confirm before source validation`);
    assert.ok(provider > confirmation, `${route.name} must confirm before generation`);
  }

  assert.doesNotMatch(routes, /sendConfirmation\s*!==\s*false/);
});

test("public compatibility endpoint cannot bypass payment or call the provider", () => {
  const routes = readFileSync(new URL("./routes.ts", import.meta.url), "utf8");
  const start = routes.indexOf('app.post("/api/peptides-engine/create"');
  const end = routes.indexOf("// 3. Get generated report by ID", start);
  assert.ok(start >= 0 && end > start, "compatibility endpoint must be present");
  const endpoint = routes.slice(start, end);
  assert.match(endpoint, /PEPTIDES_CREATE_COMPATIBILITY_ENDPOINT_RETIRED/);
  assert.match(endpoint, /status\(410\)/);
  assert.doesNotMatch(endpoint, /generatePeptidesProtocol\(/);
  assert.doesNotMatch(endpoint, /createOrder\(/);
});

test("provider POST ambiguity is terminal for confirmation and report delivery", () => {
  const routes = readFileSync(new URL("./routes.ts", import.meta.url), "utf8");
  const storage = readFileSync(new URL("./storage.ts", import.meta.url), "utf8");
  const emailService = readFileSync(new URL("./emailService.ts", import.meta.url), "utf8");
  const confirmation = routes.slice(
    routes.indexOf("async function sendPeptidesOrderConfirmationOnce"),
    routes.indexOf("async function persistPeptidesFulfillmentIncident"),
  );
  assert.match(confirmation, /claimPeptidesAutomation/);
  assert.match(confirmation, /Provider result uncertain/);
  assert.doesNotMatch(confirmation, /peptidesOrderConfirmationClaimId[\s\S]*setOrderMetadataKey[\s\S]*""/);
  assert.match(routes, /finalizePeptidesDeliveryClaim\([\s\S]*"UNKNOWN"/);
  assert.match(storage, /DELIVERY_PROVIDER_RESULT_UNCERTAIN/);
  assert.match(emailService, /sendPeptidesOrderConfirmation[\s\S]*allowProviderFallback:\s*false/);
  assert.match(emailService, /trackingData\.allowProviderFallback !== false && BREVO_API_KEY/);
  assert.match(emailService, /trackingData\.allowProviderFallback !== false\) \{/);
  const deliveries = routes.match(/allowProviderFallback:\s*false, metadata: \{ orderId:[^}]+reportId:[^}]+\}/g) || [];
  assert.equal(deliveries.length, 3, "every Peptides report delivery must disable provider fallback");
});

test("raw Peptides reports cannot trigger the generic J+3 review cron", () => {
  const routes = readFileSync(new URL("./routes.ts", import.meta.url), "utf8");
  const start = routes.indexOf("let reviewCronRunning = false;");
  const end = routes.indexOf("// Auto-recovery: generate missing peptides reports every 5 minutes", start);
  const reviewCron = routes.slice(start, end);
  assert.match(reviewCron, /Peptides J\+3 is handled exclusively[\s\S]*transactional order[\s\S]*sequence/);
  assert.doesNotMatch(reviewCron, /for \(const report of peptidesReports/);
});

test("every Peptides tier includes its exact coaching conversion code and deduction", () => {
  const matrix = [
    { tier: "solo", code: "PEPTIDES199", amount: 199, label: "Solo", bloodCredits: 0 },
    { tier: "coached", code: "PEPTIDES299", amount: 299, label: "Coached", bloodCredits: 1 },
    { tier: "tracked", code: "PEPTIDES399", amount: 399, label: "Tracked", bloodCredits: 2 },
  ] as const;

  for (const expected of matrix) {
    assert.deepEqual(PEPTIDES_COACHING_DEDUCTION[expected.tier], {
      code: expected.code,
      amount: expected.amount,
      label: expected.label,
    });
    assert.equal(PEPTIDES_BLOOD_CREDITS[expected.tier], expected.bloodCredits);
    const coachingBlock = buildPeptidesCoachingDeductionBlock(expected.tier, {
      now: new Date("2026-08-13T14:36:00.000Z"),
    });
    assert.match(coachingBlock, new RegExp(`TON BONUS COACHING \\(${expected.label}\\)`));
    assert.match(coachingBlock, new RegExp(`Code : ${expected.code}`));
    assert.match(coachingBlock, new RegExp(`${expected.amount}EUR deduits sur ton coaching Essential, Elite ou Private Lab`));
    assert.match(coachingBlock, /Valable sur les engagements 8 ou 12 semaines uniquement/);
    assert.match(coachingBlock, /Expire le 08 octobre 2026/);
    assert.match(coachingBlock, /achzodcoaching\.com\/coaching-essential/);
    assert.match(coachingBlock, /achzodcoaching\.com\/coaching-elite/);
    assert.match(coachingBlock, /achzodcoaching\.com\/coaching-achzod-private-lab/);
  }

  const routes = readFileSync(new URL("./routes.ts", import.meta.url), "utf8");
  const autoGenStart = routes.indexOf("// Auto-recovery: generate missing peptides reports every 5 minutes");
  const autoSendStart = routes.indexOf("// Auto-send READY/SCHEDULED reports", autoGenStart);
  const delivery = routes.slice(autoGenStart, autoSendStart);
  assert.match(delivery, /buildPeptidesCoachingDeductionBlock/);
  assert.match(delivery, /claimPeptidesDelivery/);

  const offerPage = readFileSync(new URL("../client/src/pages/PeptidesEnginePage.tsx", import.meta.url), "utf8");
  assert.match(offerPage, /solo:\s*\{\s*label:\s*"Solo",\s*price:\s*199,\s*bloodCredits:\s*0,\s*supportDays:\s*0\s*\}/);
  assert.match(offerPage, /coached:\s*\{\s*label:\s*"Coached",\s*price:\s*299,\s*bloodCredits:\s*1,\s*supportDays:\s*30\s*\}/);
  assert.match(offerPage, /tracked:\s*\{\s*label:\s*"Tracked",\s*price:\s*399,\s*bloodCredits:\s*2,\s*supportDays:\s*90\s*\}/);
});
