import assert from "node:assert/strict";
import { test } from "node:test";
import { trackVerifiedStripePurchase } from "./analytics";

const purchase = {
  transactionId: "cs_test_paid_123",
  itemId: "PREMIUM",
  itemName: "Anabolic Bioscan",
  value: 59,
  currency: "EUR",
};

test("sends a paid Stripe purchase only once with consent and a matching Meta event ID", () => {
  const previousWindow = (globalThis as any).window;
  const events: unknown[][] = [];
  const pixels: unknown[][] = [];
  const stored = new Map<string, string>();
  try {
    (globalThis as any).window = {
      localStorage: { getItem: () => "all" },
      sessionStorage: {
        getItem: (key: string) => stored.get(key) || null,
        setItem: (key: string, value: string) => stored.set(key, value),
      },
      gtag: (...args: unknown[]) => events.push(args),
      fbq: (...args: unknown[]) => pixels.push(args),
    };
    assert.equal(trackVerifiedStripePurchase(purchase), true);
    assert.equal(trackVerifiedStripePurchase(purchase), false);
    assert.equal(events.length, 2);
    assert.equal((events[0][2] as any).transaction_id, purchase.transactionId);
    assert.equal((events[0][2] as any).value, 59);
    assert.deepEqual(pixels[0][3], { eventID: "stripe_cs_test_paid_123" });

    (globalThis as any).window.localStorage.getItem = () => "essential";
    assert.equal(trackVerifiedStripePurchase({ ...purchase, transactionId: "cs_test_other" }), false);
    assert.equal(events.length, 2);
  } finally {
    if (previousWindow === undefined) delete (globalThis as any).window;
    else (globalThis as any).window = previousWindow;
  }
});

test("rejects malformed amounts and blocked storage without breaking checkout", () => {
  const previousWindow = (globalThis as any).window;
  try {
    (globalThis as any).window = {
      localStorage: { getItem: () => "all" },
      sessionStorage: { getItem: () => { throw new Error("storage blocked"); } },
    };
    assert.equal(trackVerifiedStripePurchase({ ...purchase, value: 0 }), false);
    assert.doesNotThrow(() => trackVerifiedStripePurchase(purchase));
    assert.equal(trackVerifiedStripePurchase(purchase), false);
  } finally {
    if (previousWindow === undefined) delete (globalThis as any).window;
    else (globalThis as any).window = previousWindow;
  }
});
