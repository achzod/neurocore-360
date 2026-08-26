import assert from "node:assert/strict";
import test from "node:test";

import {
  createBloodAnalysisCheckoutLineItem,
  createProductCheckoutLineItem,
  usesInlineCheckoutLineItem,
} from "./stripeCheckoutProducts";

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

test("paid Apex products with static prices use server-side inline Stripe price data", () => {
  assert.equal(usesInlineCheckoutLineItem("PREMIUM"), true);
  assert.equal(usesInlineCheckoutLineItem("ELITE"), true);
  assert.equal(usesInlineCheckoutLineItem("BLOOD_ANALYSIS"), true);
  assert.equal(usesInlineCheckoutLineItem("PEPTIDES_ENGINE"), false);

  assert.deepEqual(createProductCheckoutLineItem("PREMIUM"), {
    quantity: 1,
    price_data: {
      currency: "eur",
      unit_amount: 5900,
      product_data: {
        name: "Anabolic Bioscan",
        description: "Anabolic Bioscan personnalise avec rapport complet APEXLABS.",
      },
    },
  });

  assert.deepEqual(createProductCheckoutLineItem("ELITE"), {
    quantity: 1,
    price_data: {
      currency: "eur",
      unit_amount: 7900,
      product_data: {
        name: "Ultimate Scan",
        description: "Ultimate Scan personnalise avec rapport complet APEXLABS.",
      },
    },
  });
});
