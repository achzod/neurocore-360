import assert from "node:assert/strict";

import {
  PEPTAURA_PRODUCT_FEED_URL,
  parsePeptauraProductFeed,
} from "../server/peptauraProductFeed";

const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 20_000);

try {
  const response = await fetch(PEPTAURA_PRODUCT_FEED_URL, {
    method: "GET",
    signal: controller.signal,
    headers: {
      accept: "application/json",
      "cache-control": "no-cache",
      "user-agent": "APEXLABS-PeptauraFeedReadOnlyTest/1.0",
    },
  });
  assert.equal(response.ok, true, `Official Peptaura feed returned HTTP ${response.status}`);
  assert.match(response.headers.get("content-type") || "", /^application\/json\b/i);

  const nowMs = Date.now();
  const parsed = parsePeptauraProductFeed(await response.text(), {
    nowMs,
    maxAgeMs: 20 * 60_000,
    fetchedAt: new Date(nowMs).toISOString(),
  });
  assert.ok(parsed, "Official Peptaura feed failed identity/freshness/content validation");

  for (const target of ["CJC-1295 (no DAC)", "Ipamorelin", "MOTS-c"]) {
    const snapshot = parsed.snapshots.find((item) => item.slug === target);
    assert.ok(snapshot, `${target}: missing from official product feed`);
    assert.equal(snapshot.live, true, `${target}: no live offer`);
    assert.ok(snapshot.listings.some((listing) =>
      listing.enabled
      && !listing.outOfStock
      && listing.orderingMode === "available"
      && listing.shippingOptionCount > 0
      && listing.priceTiers.some((tier) => tier.price > 0)
      && listing.productUrl.startsWith("https://www.peptaura.com/product/")
    ), `${target}: no canonical positive-price stock/search/checkout/shipping offer`);
  }

  console.log(`Peptaura official product feed live read-only: OK (${parsed.snapshots.length} live groups)`);
} finally {
  clearTimeout(timeout);
}
