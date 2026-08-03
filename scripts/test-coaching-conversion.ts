import assert from "node:assert/strict";
import crypto from "node:crypto";
import {
  coachingConversionTrackingId,
  parseCoachingOrderWebhook,
  verifyWebflowWebhookSignature,
  verifyWebhookToken,
  verifyWooWebhookSignature,
} from "../server/coachingConversion";

const payload = {
  id: 4812,
  status: "processing",
  date_paid_gmt: "2026-08-02T12:30:00Z",
  total: "454.00",
  billing: { email: "Client@Example.com" },
  coupon_lines: [{ code: "discovery30" }],
  line_items: [{ name: "Coaching Elite 8 semaines" }],
};
const raw = Buffer.from(JSON.stringify(payload));
const secret = "qa-webhook-secret";
const signature = crypto.createHmac("sha256", secret).update(raw).digest("base64");

assert.equal(verifyWooWebhookSignature(raw, signature, secret), true);
assert.equal(verifyWooWebhookSignature(raw, signature + "x", secret), false);
assert.deepEqual(parseCoachingOrderWebhook(payload), {
  orderId: "4812",
  email: "client@example.com",
  amountCents: 45400,
  status: "processing",
  couponCodes: ["DISCOVERY30"],
  productNames: ["Coaching Elite 8 semaines"],
  source: "woocommerce",
  convertedAt: "2026-08-02T12:30:00.000Z",
});
assert.equal(parseCoachingOrderWebhook({ ...payload, status: "pending" }), null);
assert.equal(parseCoachingOrderWebhook({ ...payload, coupon_lines: [], line_items: [{ name: "Formation vidéo" }] }), null);

const webflowPayload = {
  triggerType: "ecomm_new_order",
  payload: {
    status: "unfulfilled",
    acceptedOn: "2026-08-03T16:27:51Z",
    orderId: "42f-a34",
    customerPaid: { unit: "EUR", value: "43920", string: "€ 439,20 EUR" },
    customerInfo: { email: "Webflow.Client@example.com" },
    purchasedItems: [{ productName: "12 semaines Essential" }],
    totals: { extras: [{ type: "discount", name: "ZOD20" }] },
  },
};
assert.deepEqual(parseCoachingOrderWebhook(webflowPayload), {
  orderId: "42f-a34",
  email: "webflow.client@example.com",
  amountCents: 43920,
  status: "processing",
  couponCodes: ["ZOD20"],
  productNames: ["12 semaines Essential"],
  source: "webflow",
  convertedAt: "2026-08-03T16:27:51.000Z",
});
assert.equal(parseCoachingOrderWebhook({ ...webflowPayload, payload: { ...webflowPayload.payload, status: "refunded" } }), null);

const webflowTimestamp = String(Date.now());
const webflowRaw = Buffer.from(JSON.stringify(webflowPayload));
const webflowSignature = crypto
  .createHmac("sha256", secret)
  .update(`${webflowTimestamp}:${webflowRaw.toString("utf8")}`)
  .digest("hex");
assert.equal(verifyWebflowWebhookSignature(webflowRaw, webflowTimestamp, webflowSignature, secret), true);
assert.equal(verifyWebflowWebhookSignature(webflowRaw, String(Date.now() - 600_000), webflowSignature, secret), false);
assert.equal(verifyWebhookToken(secret, secret), true);
assert.equal(verifyWebhookToken(secret + "x", secret), false);
assert.match(coachingConversionTrackingId("4812"), /^[0-9a-f-]{36}$/);
assert.equal(coachingConversionTrackingId("4812"), coachingConversionTrackingId("4812"));

console.log("Coaching conversion webhook passed: Webflow/Woo auth, paid-order parsing and idempotency are valid");
