import assert from "node:assert/strict";
import test from "node:test";
import {
  parsePeptauraShippingAvailabilityPage,
  parsePeptauraShippingPage,
  quotePeptauraShippingBasket,
  shippingForSubtotal,
} from "./peptauraShipping";

const availability = [{
  supplierName: "Lumira", displayName: "Lumira", available: true, minimumOrder: null,
  tiers: [
    { minOrder: 0, maxOrder: 1300, options: [{ speed: "Standard", cost: 60 }] },
    { minOrder: 1300, maxOrder: null, options: [{ speed: "Standard", cost: 0 }] },
  ],
}, {
  supplierName: "Hang Sciences", displayName: "Hang Sciences", available: true, minimumOrder: 48,
  tiers: [{ minOrder: 48, maxOrder: null, options: [{ speed: "8 to 15 days", cost: 55 }] }],
}];
const flight = JSON.stringify(["$", "$L2d", null, { country: "France", availability, navNumeral: null }]);
const encoded = JSON.stringify(flight).slice(1, -1);
const html = `<script>self.__next_f.push([1,"6:${encoded}"])</script>`;

test("shipping parser reads the structured Peptaura country payload", () => {
  const quotes = parsePeptauraShippingPage(html);
  assert.equal(quotes.length, 2);
  assert.deepEqual(shippingForSubtotal(quotes[0], 125), { costUsd: 60, speed: "Standard" });
  assert.deepEqual(shippingForSubtotal(quotes[0], 1300), { costUsd: 0, speed: "Standard" });
});

test("shipping parser reads availability when Next.js batches several Flight records", () => {
  const batched = `1:${JSON.stringify("$Sreact.fragment")}\n3:${JSON.stringify(["$", "component"])}\n6:${flight}\n7:${JSON.stringify(["$", "footer"])}`;
  const batchedHtml = `<script>self.__next_f.push([1,${JSON.stringify(batched)}])</script>`;
  const quotes = parsePeptauraShippingPage(batchedHtml);
  assert.equal(quotes.length, 2);
  assert.deepEqual(shippingForSubtotal(quotes[0], 125), { costUsd: 60, speed: "Standard" });
});

test("shipping parser reads the current section-based Peptaura payload", () => {
  const sectionAvailability = [{
    supplierName: "Lumira",
    displayName: "Lumira",
    available: true,
    minimumOrder: null,
    sections: [{
      available: true,
      flatOptions: [],
      tiers: [
        { minOrder: 0, maxOrder: 1300, options: [{ speed: "Standard (10-15 days)", cost: 60 }] },
        { minOrder: 1300, maxOrder: null, options: [{ speed: "Standard (10-15 days)", cost: 0 }] },
      ],
    }],
  }];
  const sectionFlight = JSON.stringify(["$", "$L2e", null, { country: "France", availability: sectionAvailability }]);
  const sectionHtml = `<script>self.__next_f.push([1,${JSON.stringify(`6:${sectionFlight}`)}])</script>`;
  const quotes = parsePeptauraShippingPage(sectionHtml);
  assert.equal(quotes.length, 1);
  assert.deepEqual(shippingForSubtotal(quotes[0], 290), { costUsd: 60, speed: "Standard (10-15 days)" });
  assert.deepEqual(shippingForSubtotal(quotes[0], 1300), { costUsd: 0, speed: "Standard (10-15 days)" });
});

test("paid-engine availability uses the same Flight source as shipping quotes", () => {
  const summary = parsePeptauraShippingAvailabilityPage(html);
  assert.equal(summary.source, "flight");
  assert.equal(summary.live, true);
  assert.deepEqual(summary.availableVendors, ["Lumira", "Hang Sciences"]);
  assert.deepEqual(summary.blockedVendors, []);
  assert.equal(summary.quotes[1].minimumOrderUsd, 48);
  assert.deepEqual(shippingForSubtotal(summary.quotes[1], 48), { costUsd: 55, speed: "8 to 15 days" });
});

test("Flight availability fails closed for available vendors without a usable quote", () => {
  const unavailable = [{
    supplierName: "No Quote Lab", displayName: "No Quote Lab", available: true,
    sections: [{ available: true, flatOptions: [], tiers: [] }],
  }];
  const payload = JSON.stringify(["$", "$L2e", null, { country: "France", availability: unavailable }]);
  const summary = parsePeptauraShippingAvailabilityPage(
    `<script>self.__next_f.push([1,${JSON.stringify(`6:${payload}`)}])</script>`,
  );
  assert.equal(summary.source, "flight");
  assert.equal(summary.live, false);
  assert.deepEqual(summary.availableVendors, []);
  assert.deepEqual(summary.blockedVendors, ["No Quote Lab"]);
});

test("legacy DOM remains a compatibility fallback when Flight data is absent", () => {
  const legacyHtml = `
    <a class="flex items-center gap-3 px-3 py-3 active" href="/vendors/lumira"><span>Lumira</span></a>
    <div class="flex items-center gap-3 rounded-lg px-3 py-3 opacity-60"><span>Blocked Lab</span> — unavailable</div>`;
  const summary = parsePeptauraShippingAvailabilityPage(legacyHtml);
  assert.equal(summary.source, "legacy_dom");
  assert.deepEqual(summary.availableVendors, ["Lumira"]);
  assert.deepEqual(summary.blockedVendors, ["Blocked Lab"]);
  assert.deepEqual(summary.quotes, []);
});

test("minimum supplier order is enforced before quoting shipping", () => {
  const quote = parsePeptauraShippingPage(html)[1];
  assert.equal(shippingForSubtotal(quote, 47.99), null);
  assert.deepEqual(shippingForSubtotal(quote, 48), { costUsd: 55, speed: "8 to 15 days" });
});

test("multi-axis basket aggregates supplier subtotal before enforcing its minimum", () => {
  const summary = parsePeptauraShippingAvailabilityPage(html);
  const quoted = quotePeptauraShippingBasket([
    { supplier: "Hang Sciences", totalPriceUsd: 24 },
    { supplier: "Hang Sciences", totalPriceUsd: 24 },
  ], summary);
  assert.deepEqual(quoted.failures, []);
  assert.deepEqual(quoted.breakdown, [{
    supplier: "Hang Sciences",
    subtotalUsd: 48,
    minimumOrderUsd: 48,
    shippingUsd: 55,
    speed: "8 to 15 days",
  }]);

  const belowMinimum = quotePeptauraShippingBasket([
    { supplier: "Hang Sciences", totalPriceUsd: 47.99 },
  ], summary);
  assert.deepEqual(belowMinimum.breakdown, []);
  assert.match(belowMinimum.failures[0], /minimum fournisseur \$48\.00/);
});

test("Flight basket fails closed when a selected supplier has no matching quote", () => {
  const quoted = quotePeptauraShippingBasket(
    [{ supplier: "Unknown Lab", totalPriceUsd: 100 }],
    { source: "flight", quotes: parsePeptauraShippingPage(html) },
  );
  assert.deepEqual(quoted.breakdown, []);
  assert.deepEqual(quoted.failures, ["Unknown Lab: devis livraison live introuvable"]);
});

test("malformed or missing flight payload fails closed", () => {
  assert.deepEqual(parsePeptauraShippingPage("<html></html>"), []);
  assert.deepEqual(parsePeptauraShippingPage('<script>self.__next_f.push([1,"6:not-json"])</script>'), []);
});
