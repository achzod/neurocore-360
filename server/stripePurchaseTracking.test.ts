import assert from "node:assert/strict";
import { test } from "node:test";
import { buildVerifiedStripePurchase, isStripeCheckoutPaid } from "./stripePurchaseTracking";

const session = { id: "cs_test_123", payment_status: "paid" as const, amount_total: 5900, currency: "eur" };

test("uses Stripe's paid total for a verified purchase", () => {
  assert.deepEqual(buildVerifiedStripePurchase(session, "PREMIUM", "Anabolic Bioscan"), {
    transactionId: "cs_test_123", itemId: "PREMIUM", itemName: "Anabolic Bioscan", value: 59, currency: "EUR",
  });
});

test("never reports unpaid, completed-only, zero or missing totals as purchases", () => {
  assert.equal(isStripeCheckoutPaid({ payment_status: "paid" }), true);
  assert.equal(isStripeCheckoutPaid({ payment_status: "unpaid" }), false);
  assert.equal(isStripeCheckoutPaid({ payment_status: "no_payment_required" }), false);
  assert.equal(buildVerifiedStripePurchase({ ...session, payment_status: "unpaid" }, "PREMIUM", "Anabolic Bioscan"), null);
  assert.equal(buildVerifiedStripePurchase({ ...session, amount_total: 0 }, "PREMIUM", "Anabolic Bioscan"), null);
  assert.equal(buildVerifiedStripePurchase({ ...session, amount_total: null }, "PREMIUM", "Anabolic Bioscan"), null);
});
