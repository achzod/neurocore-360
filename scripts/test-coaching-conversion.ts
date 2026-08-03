import assert from "node:assert/strict";
import crypto from "node:crypto";
import {
  coachingConversionTrackingId,
  parseCoachingOrderWebhook,
  verifyWooWebhookSignature,
} from "../server/coachingConversion";

const payload = {
  id: 4812,
  status: "processing",
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
});
assert.equal(parseCoachingOrderWebhook({ ...payload, status: "pending" }), null);
assert.equal(parseCoachingOrderWebhook({ ...payload, coupon_lines: [], line_items: [{ name: "Formation vidéo" }] }), null);
assert.match(coachingConversionTrackingId("4812"), /^[0-9a-f-]{36}$/);
assert.equal(coachingConversionTrackingId("4812"), coachingConversionTrackingId("4812"));

console.log("Coaching conversion webhook passed: signature, paid-order parsing and idempotency are valid");
