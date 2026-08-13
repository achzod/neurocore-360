import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

process.env.DATABASE_URL ||= "postgresql://test:test@127.0.0.1:5432/test";
const { MemStorage } = await import("./storage");

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

test("confirmation claim is single-writer and terminal acceptance blocks retries", async () => {
  const { storage, order } = await paidPeptidesOrder();
  assert.equal(await storage.claimPeptidesOrderConfirmation(order.id), true);
  assert.equal(await storage.claimPeptidesOrderConfirmation(order.id), false);
  await storage.finalizePeptidesOrderConfirmation(order.id, "ACCEPTED");
  assert.equal(await storage.claimPeptidesOrderConfirmation(order.id), false);
});

test("email hold blocks confirmation and report delivery claims", async () => {
  const reportId = "report-held";
  const { storage, order } = await paidPeptidesOrder({
    peptidesEmailHold: true,
    peptidesReportId: reportId,
  });
  assert.equal(await storage.claimPeptidesOrderConfirmation(order.id), false);
  assert.equal(await storage.claimPeptidesReportDelivery(order.id, reportId), false);
});

test("report delivery claim is bound to the linked artifact and single-writer", async () => {
  const reportId = "report-current";
  const { storage, order } = await paidPeptidesOrder({ peptidesReportId: reportId });
  assert.equal(await storage.claimPeptidesReportDelivery(order.id, "report-old"), false);
  assert.equal(await storage.claimPeptidesReportDelivery(order.id, reportId), true);
  assert.equal(await storage.claimPeptidesReportDelivery(order.id, reportId), false);
  await storage.finalizePeptidesReportDelivery(order.id, reportId, "UNKNOWN");
  assert.equal(await storage.claimPeptidesReportDelivery(order.id, reportId), false);
});

test("production flow separates payment confirmation from provider generation", () => {
  const routes = readFileSync(new URL("./routes.ts", import.meta.url), "utf8");
  const confirmation = routes.indexOf("await ensurePeptidesOrderConfirmation(order)");
  const generationSwitch = routes.indexOf("if (!peptidesAutogenEnabled)");
  assert.ok(confirmation >= 0, "paid-order confirmation recovery must exist");
  assert.ok(generationSwitch >= 0, "provider generation kill switch must exist");
  assert.ok(
    confirmation < generationSwitch,
    "confirmation must run before the paid-provider generation kill switch",
  );
  assert.match(routes, /claimPeptidesGenerationAttempt\(/);
  assert.match(routes, /maxCandidates:\s*1/);
  assert.match(routes, /providerRetries:\s*1/);
  assert.match(routes, /deliverPeptidesReportOnce\(/);
  assert.match(routes, /PEPTIDES_TRANSACTIONAL_AUTOMATION_ENABLED/);
  assert.match(routes, /PEPTIDES_AUTOMATION_START_AT/);
  assert.match(
    routes,
    /if \(!isPeptidesTransactionalAutomationEligible\(order\)\) continue;/,
    "historical paid orders must be excluded before confirmation, recovery or generation",
  );
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

test("provider POST ambiguity is terminal for both transactional emails", () => {
  const emailService = readFileSync(new URL("./emailService.ts", import.meta.url), "utf8");
  const confirmation = emailService.slice(
    emailService.indexOf("export async function sendPeptidesOrderConfirmationEmailResult"),
    emailService.indexOf("export async function sendPeptidesOrderConfirmationEmail(", emailService.indexOf("export async function sendPeptidesOrderConfirmationEmailResult")),
  );
  const delivery = emailService.slice(emailService.indexOf("export async function sendPeptidesReportReadyEmail"));
  assert.match(confirmation, /beforeProviderPost:\s*async \(\) => \{\}/);
  assert.match(confirmation, /allowProviderFallback:\s*false/);
  assert.match(delivery, /beforeProviderPost:\s*async \(\) => \{\}/);
  assert.match(delivery, /allowProviderFallback:\s*false/);
  assert.match(
    emailService,
    /allowAcceptedWithoutLiveVerification[\s\S]{0,220}sendPeptidesOrderConfirmation/,
  );
});
