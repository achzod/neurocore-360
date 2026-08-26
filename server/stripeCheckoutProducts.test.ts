import assert from "node:assert/strict";
import test from "node:test";

import { createBloodAnalysisCheckoutLineItem } from "./stripeCheckoutProducts";

test("Blood Analysis checkout uses server-side inline Stripe price data", () => {
  process.env.BLOOD_ANALYSIS_PRICE_ID = "price_wrong_account";

  const lineItem = createBloodAnalysisCheckoutLineItem();

  assert.equal(lineItem.quantity, 1);
  assert.equal(lineItem.price, undefined);
  assert.deepEqual(lineItem.price_data, {
    currency: "eur",
    unit_amount: 9900,
    product_data: {
      name: "Blood Analysis",
      description: "2 credits Blood Analysis sans expiration.",
    },
  });
});
