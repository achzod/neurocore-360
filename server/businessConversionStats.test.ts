import assert from "node:assert/strict";
import { test } from "node:test";
import { summarizeBusinessOrders, type BusinessOrder } from "./businessConversionStats";

const order = (overrides: Partial<BusinessOrder> = {}): BusinessOrder => ({
  email: "client@example.com", productType: "PEPTIDES_ENGINE", status: "paid",
  finalAmountCents: 19900, refundAmountCents: 0, metadata: null, ...overrides,
});

test("counts real paid orders, refunds and unique checkout contacts without list prices", () => {
  assert.deepEqual(summarizeBusinessOrders([
    order(),
    order({ status: "cancelled", email: " CLIENT@example.com " }),
    order({ email: "another@example.com", status: "partial_refund", finalAmountCents: 7900, refundAmountCents: 2000 }),
    order({ email: "free@example.com", productType: "GRATUIT", finalAmountCents: 0 }),
  ]), {
    paidOrders: 2, refundedOrders: 1, cancelledCheckouts: 1, checkoutContacts: 2,
    grossRevenueCents: 27800, refundedCents: 2000, netRevenueCents: 25800, qaOrdersExcluded: 0,
  });
});

test("excludes QA checkout attempts from sales and abandonment metrics", () => {
  const stats = summarizeBusinessOrders([
    order({ status: "cancelled", metadata: { qaSmoke: true } }),
    order({ status: "cancelled", metadata: { qaSmokeCleanup: true } }),
    order({ status: "cancelled", metadata: { qaExpiredSession: true } }),
    order({ status: "cancelled" }),
  ]);
  assert.equal(stats.qaOrdersExcluded, 3);
  assert.equal(stats.cancelledCheckouts, 1);
  assert.equal(stats.checkoutContacts, 1);
});
