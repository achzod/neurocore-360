import assert from "node:assert/strict";
import test from "node:test";

import { parsePeptauraProductFeed } from "./peptauraProductFeed";

const NOW = Date.parse("2026-08-13T10:20:00.000Z");
const MAX_AGE_MS = 20 * 60_000;

function product(overrides: Record<string, unknown> = {}) {
  return {
    id: "product-ipamorelin-5mg-test-labs-box-10",
    enable_search: "true",
    enable_checkout: "true",
    title: "Ipamorelin 5mg from Test Labs",
    description: "Ipamorelin supplied for laboratory research use. Sold as a box of 10 vials.",
    link: "https://www.peptaura.com/product/204-ipamorelin-5mg-test-labs",
    brand: "Test Labs",
    weight: "5 mg",
    price: "66.70 USD",
    availability: "in_stock",
    item_group_id: "group-ipamorelin",
    item_group_title: "Ipamorelin",
    size: "5mg",
    shipping: ["FR:ALL:Regular 7-21 days:12.00 USD"],
    seller_name: "Test Labs",
    ...overrides,
  };
}

function feed(products: unknown[] = [product()], overrides: Record<string, unknown> = {}) {
  return JSON.stringify({
    version: "openai-product-feed-v1",
    generated_at: "2026-08-13T10:19:43.452Z",
    merchant: {
      name: "Peptaura",
      base_url: "https://www.peptaura.com",
    },
    products,
    ...overrides,
  });
}

function parse(raw: string, overrides: Partial<Parameters<typeof parsePeptauraProductFeed>[1]> = {}) {
  return parsePeptauraProductFeed(raw, {
    nowMs: NOW,
    maxAgeMs: MAX_AGE_MS,
    fetchedAt: new Date(NOW).toISOString(),
    ...overrides,
  });
}

test("accepts only the exact Peptaura feed identity", () => {
  assert.equal(parse(feed())?.snapshots.length, 1);
  assert.equal(parse(feed([], { version: "other-feed-v1" })), null);
  assert.equal(parse(feed([], { merchant: { name: "Peptaura mirror", base_url: "https://www.peptaura.com" } })), null);
  assert.equal(parse(feed([], { merchant: { name: "Peptaura", base_url: "https://peptaura.example" } })), null);
  assert.equal(parse("not-json"), null);
});

test("rejects stale, far-future and malformed source timestamps", () => {
  assert.equal(parse(feed([], { generated_at: "2026-08-13T09:59:59.999Z" })), null);
  assert.equal(parse(feed([], { generated_at: "2026-08-13T10:25:00.001Z" })), null);
  assert.equal(parse(feed([], { generated_at: "Thu, 13 Aug 2026 10:19:43 GMT" })), null);
  assert.equal(parse(feed(), { nowMs: Number.NaN }), null);
  assert.equal(parse(feed(), { fetchedAt: "not-a-date" }), null);
  assert.equal(parse(feed(), { fetchedAt: "2026-08-13T10:25:00.001Z" }), null);
});

test("keeps only canonical Peptaura product URLs and strips query or fragment", () => {
  const parsed = parse(feed([
    product({ link: "https://www.peptaura.com/product/204-ipamorelin-5mg-test-labs?utm_source=test#offer" }),
    product({ link: "https://evil.example/product/205-ipamorelin-10mg-test-labs" }),
    product({ link: "https://www.peptaura.com/catalog/Ipamorelin" }),
    product({ link: "https://user:pass@www.peptaura.com/product/206-ipamorelin-2mg-test-labs" }),
  ]));
  assert.ok(parsed);
  assert.equal(parsed.snapshots[0].listings.length, 1);
  assert.equal(
    parsed.snapshots[0].listings[0].productUrl,
    "https://www.peptaura.com/product/204-ipamorelin-5mg-test-labs",
  );
  assert.equal(parsed.snapshots[0].url, "https://www.peptaura.com/catalog/Ipamorelin");
});

test("retains only strictly positive USD prices", () => {
  const parsed = parse(feed([
    product({ price: "66.70 USD", link: "https://www.peptaura.com/product/204-ipamorelin-5mg-test-labs" }),
    product({ price: "0.00 USD", link: "https://www.peptaura.com/product/205-ipamorelin-5mg-test-labs" }),
    product({ price: "-1.00 USD", link: "https://www.peptaura.com/product/206-ipamorelin-5mg-test-labs" }),
    product({ price: "66.70 EUR", link: "https://www.peptaura.com/product/207-ipamorelin-5mg-test-labs" }),
    product({ price: "USD 66.70", link: "https://www.peptaura.com/product/208-ipamorelin-5mg-test-labs" }),
    product({ price: "66.701 USD", link: "https://www.peptaura.com/product/209-ipamorelin-5mg-test-labs" }),
  ]));
  assert.ok(parsed);
  assert.equal(parsed.snapshots[0].listings.length, 1);
  assert.equal(parsed.snapshots[0].listings[0].priceTiers[0].price, 66.7);
});

test("requires stock, search, checkout and valid shipping before a group is live", () => {
  const unavailable = [
    product({ enable_search: "false" }),
    product({ enable_checkout: "false", link: "https://www.peptaura.com/product/205-ipamorelin-5mg-test-labs" }),
    product({ availability: "out_of_stock", link: "https://www.peptaura.com/product/206-ipamorelin-5mg-test-labs" }),
    product({ shipping: [], link: "https://www.peptaura.com/product/207-ipamorelin-5mg-test-labs" }),
    product({ shipping: ["invalid"], link: "https://www.peptaura.com/product/208-ipamorelin-5mg-test-labs" }),
  ];
  assert.equal(parse(feed(unavailable)), null);

  const parsed = parse(feed([...unavailable, product({
    link: "https://www.peptaura.com/product/209-ipamorelin-5mg-test-labs",
  })]));
  assert.ok(parsed);
  assert.equal(parsed.snapshots[0].live, true);
  assert.equal(parsed.snapshots[0].listings.length, 6);
  assert.equal(parsed.snapshots[0].listings.filter((listing) => listing.orderingMode === "available").length, 3);
  assert.equal(
    parsed.snapshots[0].listings.filter((listing) =>
      listing.orderingMode === "available"
      && !listing.outOfStock
      && listing.shippingOptionCount > 0
    ).length,
    1,
  );
});

test("maps CJC-1295, Ipamorelin and MOTS-c to their exact catalog targets", () => {
  const targets = [
    product({
      item_group_id: "group-cjc-1295-no-dac",
      item_group_title: "CJC-1295 (no DAC)",
      link: "https://www.peptaura.com/product/616-cjc-1295-no-dac-5mg-test-labs",
    }),
    product(),
    product({
      item_group_id: "group-mots-c",
      item_group_title: "MOTS-c",
      link: "https://www.peptaura.com/product/214-mots-c-10mg-test-labs",
    }),
  ];
  const parsed = parse(feed(targets));
  assert.ok(parsed);
  assert.deepEqual(
    parsed.snapshots.map(({ slug, url }) => ({ slug, url })),
    [
      { slug: "CJC-1295 (no DAC)", url: "https://www.peptaura.com/catalog/CJC-1295%20(no%20DAC)" },
      { slug: "Ipamorelin", url: "https://www.peptaura.com/catalog/Ipamorelin" },
      { slug: "MOTS-c", url: "https://www.peptaura.com/catalog/MOTS-c" },
    ],
  );
});

test("drops products whose group id does not match the canonical title", () => {
  assert.equal(parse(feed([product({ item_group_id: "group-mots-c" })])), null);
  assert.equal(parse(feed([product({ item_group_id: "group-IPAMORELIN" })])), null);
});
