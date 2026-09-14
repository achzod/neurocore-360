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

function snapshot(name: string, price: number, dosage = "10mg", supplier = "Verified"): PeptauraFeedProductSnapshot {
  return {
    slug: name,
    url: `https://www.peptaura.com/catalog/${name}`,
    fetchedAt: "2026-09-14T03:00:00.000Z",
    live: true,
    source: "product_feed",
    sourceGeneratedAt: "2026-09-14T02:59:00.000Z",
    listings: [{
      id: Math.round(price * 100), name, dosage, supplier, supplierDisplayName: supplier,
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

test("all public goals resolve to the intended exact molecule count", () => {
  const catalog = [
    snapshot("BPC-157", 15), snapshot("TB500", 20), snapshot("CJC-1295 (no DAC)", 18), snapshot("Ipamorelin", 17),
    snapshot("Retatrutide", 35), snapshot("DSIP", 12), snapshot("Semax", 14), snapshot("Selank", 13),
    snapshot("PT-141", 21), snapshot("KissPeptin-10", 30), snapshot("GHK-Cu", 16), snapshot("MOTS-c", 24), snapshot("SS-31", 19),
  ];
  const expected: Record<string, number> = { recovery: 2, "gh-antiaging": 2, fatloss: 1, sleep: 1, cognitive: 2, libido: 1, "testo-boost": 1, "skin-hair": 1, endurance: 2 };
  for (const [primaryGoal, count] of Object.entries(expected)) {
    const input = peptidesPreviewInputSchema.parse({ ...base, primaryGoal, bloodwork: "recent" });
    const result = buildPeptidesPreview(input, catalog);
    assert.equal(result.moleculeCount, count, primaryGoal);
    assert.equal(result.molecules.length, count, primaryGoal);
  }
});

test("shipping vendor filtering cannot silently use a non-deliverable listing", () => {
  const input = peptidesPreviewInputSchema.parse(base);
  const catalog = [snapshot("Retatrutide", 20, "5mg", "Blocked Lab"), snapshot("Retatrutide", 35, "10mg", "Deliverable Lab")];
  const result = buildPeptidesPreview(input, catalog, new Date().toISOString(), ["deliverable-lab"]);
  assert.equal(result.estimatedStarterCostUsd, 35);
  assert.equal(result.molecules[0].startingFormat, "10mg · boîte de 1");
});

test("budget fit is visible without deleting clinically coherent candidates", () => {
  const input = peptidesPreviewInputSchema.parse({ ...base, primaryGoal: "recovery", budget: "under100" });
  const result = buildPeptidesPreview(input, [snapshot("BPC-157", 70), snapshot("TB500", 60)]);
  assert.equal(result.moleculeCount, 2);
  assert.equal(result.budgetFit, "above");
});

test("refusing injections routes non-cognitive profiles to a tailored review", () => {
  const input = peptidesPreviewInputSchema.parse({ ...base, injectionComfort: "refuse" });
  const result = buildPeptidesPreview(input, [snapshot("Retatrutide", 35)]);
  assert.equal(result.status, "review_required");
  assert.ok(result.blockers.includes("injections_refusees"));
});

test("secondary libido and fat-loss goals inherit compatibility checks", () => {
  const hypertension = peptidesPreviewInputSchema.parse({ ...base, primaryGoal: "sleep", secondaryGoals: ["libido"], conditions: ["hypertension"] });
  assert.ok(buildPeptidesPreview(hypertension, [snapshot("DSIP", 12), snapshot("PT-141", 21)]).blockers.includes("pression_arterielle_a_verifier"));
  const diabetes = peptidesPreviewInputSchema.parse({ ...base, primaryGoal: "sleep", secondaryGoals: ["fatloss"], conditions: ["diabetes"] });
  assert.ok(buildPeptidesPreview(diabetes, [snapshot("DSIP", 12), snapshot("Retatrutide", 35)]).blockers.includes("profil_glycemique_a_revoir"));
});

test("identity and consent validation rejects incomplete leads", () => {
  assert.equal(peptidesPreviewInputSchema.safeParse({ ...base, email: "invalid" }).success, false);
  assert.equal(peptidesPreviewInputSchema.safeParse({ ...base, age: 17 }).success, false);
  assert.equal(peptidesPreviewInputSchema.safeParse({ ...base, consent: false }).success, false);
});
