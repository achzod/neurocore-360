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
  assert.equal((updated?.metadata as any)?.peptidesEmailHold, true);
  assert.equal((updated?.metadata as any)?.peptidesEmailHoldReason, "DELIVERY_PROVIDER_RESULT_UNCERTAIN");
});

test("stale report mutations and relinks lose compare-and-swap", async () => {
  const { storage, order } = await paidPeptidesOrder({ peptidesReportId: "report-a" });
  assert.equal(await storage.setOrderMetadataIfPeptidesReportMatches(order.id, "report-old", { peptidesReportId: "" }), false);
  assert.equal(await storage.replacePeptidesReportSlotIfMatches(order.id, "report-old", "report-b"), false);
  assert.equal(await storage.replacePeptidesReportSlotIfMatches(order.id, "report-a", "report-b"), true);
});

test("production flow centralizes confirmation and claims every report delivery before provider calls", () => {
  const routes = readFileSync(new URL("./routes.ts", import.meta.url), "utf8");
  assert.match(routes, /async function sendPeptidesOrderConfirmationOnce/);
  assert.match(routes, /peptidesOrderConfirmationClaimId/);
  assert.match(routes, /claimPeptidesGenerationAttempt\(/);
  assert.match(routes, /claimPeptidesDelivery\(order\.id, recoveryReportId, recoveryClaimId\)/);
  assert.match(routes, /claimPeptidesDelivery\(order\.id, saved\.id, deliveryClaimId\)/);
  assert.match(routes, /finalizePeptidesDeliveryClaim\([\s\S]*"UNKNOWN"/);
  assert.match(routes, /deleteBurnoutReport\(saved\.id\)/);
});

test("public compatibility endpoint cannot bypass payment or call the provider", () => {
  const routes = readFileSync(new URL("./routes.ts", import.meta.url), "utf8");
  const start = routes.indexOf('app.post("/api/peptides-engine/create"');
  const end = routes.indexOf("// 3. Get generated report by ID", start);
  assert.ok(start >= 0 && end > start, "compatibility endpoint must be present");
  const endpoint = routes.slice(start, end);
  assert.match(endpoint, /Le contournement du paiement est desactive/);
  assert.match(endpoint, /generation:\s*"durable_cron"/);
  assert.doesNotMatch(endpoint, /generatePeptidesProtocol\(/);
  assert.doesNotMatch(endpoint, /createOrder\(/);
});

test("provider POST ambiguity is terminal for confirmation and report delivery", () => {
  const routes = readFileSync(new URL("./routes.ts", import.meta.url), "utf8");
  const storage = readFileSync(new URL("./storage.ts", import.meta.url), "utf8");
  const confirmation = routes.slice(
    routes.indexOf("async function sendPeptidesOrderConfirmationOnce"),
    routes.indexOf("async function persistPeptidesFulfillmentIncident"),
  );
  assert.match(confirmation, /claimPeptidesAutomation/);
  assert.match(confirmation, /Provider result uncertain/);
  assert.doesNotMatch(confirmation, /peptidesOrderConfirmationClaimId[\s\S]*setOrderMetadataKey[\s\S]*""/);
  assert.match(routes, /finalizePeptidesDeliveryClaim\([\s\S]*"UNKNOWN"/);
  assert.match(storage, /DELIVERY_PROVIDER_RESULT_UNCERTAIN/);
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
