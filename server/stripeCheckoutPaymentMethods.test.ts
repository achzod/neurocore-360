import assert from "node:assert/strict";
import test from "node:test";

import {
  getCheckoutPaymentMethodParams,
  getCheckoutPaymentMethodTypes,
  isKlarnaCheckoutEnabled,
  isKlarnaUnsupportedCheckoutError,
} from "./stripeCheckoutPaymentMethods";

const originalKlarnaFlag = process.env.STRIPE_ENABLE_KLARNA;

test.afterEach(() => {
  if (originalKlarnaFlag === undefined) {
    delete process.env.STRIPE_ENABLE_KLARNA;
  } else {
    process.env.STRIPE_ENABLE_KLARNA = originalKlarnaFlag;
  }
});

test("Klarna is enabled by default and can be disabled by env", () => {
  delete process.env.STRIPE_ENABLE_KLARNA;
  assert.equal(isKlarnaCheckoutEnabled(), true);
  assert.deepEqual(getCheckoutPaymentMethodTypes(), ["card", "klarna"]);
  assert.deepEqual(getCheckoutPaymentMethodParams(), { automatic_payment_methods: { enabled: true } });

  for (const value of ["false", "0", "off", "no", " FALSE "]) {
    process.env.STRIPE_ENABLE_KLARNA = value;
    assert.equal(isKlarnaCheckoutEnabled(), false);
    assert.deepEqual(getCheckoutPaymentMethodTypes(), ["card"]);
    assert.deepEqual(getCheckoutPaymentMethodParams(), { payment_method_types: ["card"] });
  }
});

test("only Klarna payment-method errors trigger the card-only fallback", () => {
  assert.equal(isKlarnaUnsupportedCheckoutError({
    type: "StripeInvalidRequestError",
    param: "payment_method_types[1]",
    message: "The payment method klarna is not available on this account.",
  }), true);

  assert.equal(isKlarnaUnsupportedCheckoutError({
    type: "StripeInvalidRequestError",
    message: "No such price: price_missing",
  }), false);

  assert.equal(isKlarnaUnsupportedCheckoutError(new Error("network timeout")), false);
});
