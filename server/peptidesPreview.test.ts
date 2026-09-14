import assert from "node:assert/strict";
import test from "node:test";
import { buildPeptidesPreview, peptidesPreviewInputSchema } from "./peptidesPreview";
import type { PeptauraFeedProductSnapshot } from "./peptauraProductFeed";

const base = {
  firstName: "Alex",
  email: "alex@example.com",
  age: 32,
  weightKg: 82,
  primaryGoal: "fatloss",
  secondaryGoals: [],
  conditions: ["none"],
  bloodwork: "recent",
  injectionComfort: "possible",
  experience: "read",
  budget: "100-200",
  country: "FR",
  medications: "",
  consent: true,
  attribution: {},
} as const;

function snapshot(name: string, price: number, dosage = "10mg"): PeptauraFeedProductSnapshot {
  return {
    slug: name,
    url: `https://www.peptaura.com/catalog/${name}`,
    fetchedAt: "2026-09-14T03:00:00.000Z",
    live: true,
    source: "product_feed",
    sourceGeneratedAt: "2026-09-14T02:59:00.000Z",
    listings: [{
      id: Math.round(price * 100), name, dosage, supplier: "Verified", supplierDisplayName: "Verified",
      outOfStock: false, form: "vial", priceTiers: [{ price, minQty: 1 }], warehouse: "EU",
      shippingOptionCount: 1, orderingMode: "available", enabled: true, suspended: false,
      boxSize: 1, marginRate: 0, productUrl: `https://www.peptaura.com/product/${Math.round(price * 100)}-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    }],
  };
}

test("preview returns an exact stack and live starter subtotal", () => {
  const input = peptidesPreviewInputSchema.parse({ ...base, secondaryGoals: ["recovery"] });
  const result = buildPeptidesPreview(input, [snapshot("Retatrutide", 35), snapshot("BPC-157", 15)], "2026-09-14T03:00:00.000Z");
  assert.equal(result.status, "eligible");
  assert.equal(result.moleculeCount, 2);
  assert.deepEqual(result.molecules.map((item) => item.name), ["Retatrutide", "BPC-157"]);
  assert.equal(result.estimatedStarterCostUsd, 50);
  assert.equal(result.nextStep, "peptides_engine");
});

test("hard-risk profiles do not receive molecule suggestions", () => {
  const input = peptidesPreviewInputSchema.parse({ ...base, conditions: ["cancer"] });
  const result = buildPeptidesPreview(input, [snapshot("Retatrutide", 35)]);
  assert.equal(result.status, "review_required");
  assert.equal(result.moleculeCount, 0);
  assert.equal(result.estimatedStarterCostUsd, null);
  assert.equal(result.nextStep, "manual_review");
});

test("testosterone preview routes to blood analysis without recent bloodwork", () => {
  const input = peptidesPreviewInputSchema.parse({ ...base, primaryGoal: "testo-boost", bloodwork: "old" });
  const result = buildPeptidesPreview(input, [snapshot("KissPeptin-10", 30)]);
  assert.equal(result.status, "review_required");
  assert.equal(result.nextStep, "blood_analysis");
  assert.ok(result.blockers.includes("bilan_hormonal_recent_requis"));
});

test("a secondary testosterone goal is also blocked without recent bloodwork", () => {
  const input = peptidesPreviewInputSchema.parse({ ...base, secondaryGoals: ["testo-boost"], bloodwork: "never" });
  const result = buildPeptidesPreview(input, [snapshot("Retatrutide", 35), snapshot("KissPeptin-10", 30)]);
  assert.equal(result.status, "review_required");
  assert.equal(result.nextStep, "blood_analysis");
});

test("preview fails closed when one required live product is unavailable", () => {
  const input = peptidesPreviewInputSchema.parse({ ...base, primaryGoal: "recovery" });
  assert.throws(() => buildPeptidesPreview(input, [snapshot("BPC-157", 15)]), /INCOMPLETE_LIVE_MATCH/);
});

test("none cannot be combined with a medical condition", () => {
  const parsed = peptidesPreviewInputSchema.safeParse({ ...base, conditions: ["none", "hypertension"] });
  assert.equal(parsed.success, false);
});
