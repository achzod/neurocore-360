import assert from "node:assert/strict";
import test from "node:test";
import { parsePeptauraShippingPage, shippingForSubtotal } from "./peptauraShipping";

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

test("minimum supplier order is enforced before quoting shipping", () => {
  const quote = parsePeptauraShippingPage(html)[1];
  assert.equal(shippingForSubtotal(quote, 47.99), null);
  assert.deepEqual(shippingForSubtotal(quote, 48), { costUsd: 55, speed: "8 to 15 days" });
});

test("malformed or missing flight payload fails closed", () => {
  assert.deepEqual(parsePeptauraShippingPage("<html></html>"), []);
  assert.deepEqual(parsePeptauraShippingPage('<script>self.__next_f.push([1,"6:not-json"])</script>'), []);
});
