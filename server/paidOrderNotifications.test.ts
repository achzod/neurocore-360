import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import { buildPaidOrderNotificationPlan } from "./paidOrderNotifications";

test("Ultimate confirmation uses paid amount, questionnaire first name and exact promo", () => {
  const plan = buildPaidOrderNotificationPlan({
    id: "order-anthony",
    email: "Anthony.Rebouillat74@gmail.com",
    productType: "ELITE",
    finalAmountCents: 7900,
    promoCode: null,
    metadata: { questionnaireResponses: { prenom: "Anthony" } },
  });
  assert.ok(plan);
  assert.equal(plan.clientEmail, "anthony.rebouillat74@gmail.com");
  assert.equal(plan.customerSubject, "Ultimate Scan : commande reçue");
  assert.match(plan.customerMessage, /paiement de 79\.00€/);
  assert.match(plan.customerMessage, /ULTIMATE79/);
  assert.match(plan.adminSubject, /PAIEMENT 79\.00EUR/);
  assert.match(plan.adminMessage, /Order ID: order-anthony/);
});

test("unsupported products do not enter the paid scan reconciliation", () => {
  assert.equal(buildPaidOrderNotificationPlan({
    id: "discovery",
    email: "client@example.com",
    productType: "GRATUIT",
    finalAmountCents: 0,
  }), null);
});

test("all report delivery paths share the persisted order hold gate", () => {
  const source = fs.readFileSync(new URL("./routes.ts", import.meta.url), "utf8");
  const safeSendStart = source.indexOf("async function safeSendReportReadyEmail(");
  const safeSendEnd = source.indexOf("const auditCreateLimiter", safeSendStart);
  const safeSend = source.slice(safeSendStart, safeSendEnd);
  assert.match(safeSend, /metadata->>'auditEmailHold'/);
  assert.match(safeSend, /delivery_hold:/);
});

test("confirm-session and webhook both reconcile paid notifications", () => {
  const source = fs.readFileSync(new URL("./routes.ts", import.meta.url), "utf8");
  const calls = source.match(/await ensurePaidOrderNotifications\(/g) || [];
  assert.ok(calls.length >= 3, `expected at least three reconciliation paths, got ${calls.length}`);
  assert.match(source, /paidOrderNotificationRecoveryRunning/);
  assert.match(source, /customerConfirmEmailSentAt/);
  assert.match(source, /adminPaymentNotifSentAt/);
});
