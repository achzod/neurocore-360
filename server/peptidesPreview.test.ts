import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import { buildPeptidesPreview, peptidesPreviewInputSchema } from "./peptidesPreview";
import type { PeptauraFeedProductSnapshot } from "./peptauraProductFeed";
import type { PeptauraShippingQuote } from "./peptauraShipping";

const base = {
  firstName: "Karim", email: "karim@example.com", age: 36, weightKg: 84, heightCm: 181, sex: "male", bodyFatRange: "20-25",
  primaryGoal: "testo-boost", secondaryGoals: [], goalDetails: "Fatigue, libido basse et récupération réduite depuis plusieurs mois.",
  timeline: "12plus", recoveryScope: "multi-site", glp1History: "never", cognitiveStress: "high", conditions: ["none"],
  bloodwork: "never", bloodPressure: "normal", sleepHours: 6, injectionComfort: "possible", injectionFrequency: "twice-daily",
  refrigeration: "yes-private", experience: "read", trainingFrequency: "5plus", budgetTotalUsd: 400, country: "FR",
  medications: "aucun", allergies: "aucune", currentPeptides: "aucun", pastPeptides: "aucun", startWhen: "1-2weeks", consent: true, attribution: {},
} as const;

function snapshot(name: string, price: number, dosage = "10mg", supplier = "Verified", boxSize = 1): PeptauraFeedProductSnapshot {
  return { slug: name, url: `https://supplier.invalid/${name}`, fetchedAt: new Date().toISOString(), live: true, source: "product_feed", sourceGeneratedAt: new Date().toISOString(), listings: [{ id: Math.round(price * 100), name, dosage, supplier, supplierDisplayName: supplier, outOfStock: false, form: "vial", priceTiers: [{ price, minQty: 1 }], warehouse: "EU", shippingOptionCount: 1, orderingMode: "available", enabled: true, suspended: false, boxSize, marginRate: 0, productUrl: `https://supplier.invalid/product/${name}` }] };
}

const catalog = [
  snapshot("BPC-157", 6.89, "5mg"), snapshot("TB500", 6, "2mg"), snapshot("CJC-1295 (no DAC)", 25.09, "5mg"), snapshot("Ipamorelin", 12.43, "5mg"),
  snapshot("Semaglutide", 16.47, "10mg"), snapshot("DSIP", 13.95, "5mg"), snapshot("Semax", 5.7, "5mg"), snapshot("Selank", 6.63, "5mg"),
  snapshot("PT-141", 20.03, "10mg"), snapshot("KissPeptin-10", 31.19, "10mg"), snapshot("GHK-Cu", 10.65, "50mg"), snapshot("MOTS-c", 40.56, "20mg", "Verified", 1), snapshot("SS-31", 15.34, "10mg"),
];
const franceShipping: PeptauraShippingQuote[] = [{ supplier: "Verified", displayName: "Verified", available: true, minimumOrderUsd: null, tiers: [{ minOrderUsd: 0, maxOrderUsd: null, costUsd: 60, speed: "7 à 14 jours" }] }];
const emiratesShipping: PeptauraShippingQuote[] = [{ supplier: "Verified", displayName: "Verified", available: true, minimumOrderUsd: null, tiers: [{ minOrderUsd: 0, maxOrderUsd: null, costUsd: 90, speed: "10 à 15 jours" }] }];

test("Karim receives two fully calculated molecules over twelve weeks for France", () => {
  const result = buildPeptidesPreview(peptidesPreviewInputSchema.parse(base), catalog, "2026-09-15T09:00:00Z", franceShipping);
  assert.equal(result.moleculeCount, 2);
  assert.equal(result.durationLabel, "12 semaines");
  assert.deepEqual(result.molecules.map((m) => ({ name: m.name, dose: m.doseSummary, need: m.totalRequiredMg, vials: m.vialsRequired, bought: m.vialsPurchased, cost: m.estimatedTotalPriceUsd })), [
    { name: "KissPeptin-10", dose: "200 mcg par administration, 3 fois par semaine", need: 7.2, vials: 2, bought: 2, cost: 62.38 },
    { name: "PT-141", dose: "1 mg par administration, 1 fois par semaine", need: 12, vials: 3, bought: 3, cost: 60.09 },
  ]);
  assert.deepEqual(result.molecules.map((m) => ({ operational: m.operationalVials, reserve: m.safetyReserveVials, ordered: m.vialsRequired })), [
    { operational: 1, reserve: 1, ordered: 2 },
    { operational: 2, reserve: 1, ordered: 3 },
  ]);
  assert.equal(result.totalVialsRequired, 5);
  assert.equal(result.totalVialsPurchased, 5);
  assert.equal(result.estimatedProtocolCostUsd, 122.47);
  assert.equal(result.estimatedShippingCostUsd, 60);
  assert.equal(result.estimatedGrandTotalUsd, 182.47);
});

test("all primary goals produce between two and four molecules and never less than twelve weeks", () => {
  for (const primaryGoal of ["recovery", "gh-antiaging", "fatloss", "sleep", "cognitive", "libido", "testo-boost", "skin-hair", "endurance"] as const) {
    const result = buildPeptidesPreview(peptidesPreviewInputSchema.parse({ ...base, primaryGoal }), catalog, new Date().toISOString(), franceShipping);
    assert.ok(result.moleculeCount >= 2 && result.moleculeCount <= 4, primaryGoal);
    assert.equal(result.molecules.length, result.moleculeCount, primaryGoal);
    assert.ok(result.molecules.every((m) => m.cycleDurationLabel === "12 semaines"), primaryGoal);
    assert.equal(result.durationLabel, "12 semaines", primaryGoal);
    assert.ok(result.molecules.every((m) => m.calculationBasis.length > 20 && m.totalRequiredMg > 0 && m.safetyReserveVials >= Math.ceil(m.operationalVials * 0.2) && m.vialsRequired === m.operationalVials + m.safetyReserveVials && m.vialsPurchased >= m.vialsRequired), primaryGoal);
  }
});

test("secondary goals expand the estimate up to four unique molecules", () => {
  const result = buildPeptidesPreview(peptidesPreviewInputSchema.parse({ ...base, primaryGoal: "cognitive", secondaryGoals: ["sleep", "skin-hair"] }), catalog, new Date().toISOString(), franceShipping);
  assert.equal(result.moleculeCount, 4);
  assert.deepEqual(result.molecules.map((m) => m.name), ["Semax", "Selank", "DSIP", "GHK-Cu"]);
});

test("country-specific shipping changes landed total without changing product math", () => {
  const input = peptidesPreviewInputSchema.parse(base);
  const fr = buildPeptidesPreview(input, catalog, new Date().toISOString(), franceShipping);
  const ae = buildPeptidesPreview({ ...input, country: "AE" }, catalog, new Date().toISOString(), emiratesShipping);
  assert.equal(fr.estimatedProtocolCostUsd, ae.estimatedProtocolCostUsd);
  assert.equal(fr.estimatedShippingCostUsd, 60);
  assert.equal(ae.estimatedShippingCostUsd, 90);
  assert.equal(ae.estimatedGrandTotalUsd! - fr.estimatedGrandTotalUsd!, 30);
});

test("review-class profiles retain exact vial and price totals instead of a one-vial pseudo-quote", () => {
  const result = buildPeptidesPreview(peptidesPreviewInputSchema.parse({ ...base, medications: "traitement déclaré" }), catalog, new Date().toISOString(), franceShipping);
  assert.equal(result.status, "review_required");
  assert.equal(result.moleculeCount, 2);
  assert.equal(result.totalVialsRequired, 5);
  assert.equal(result.estimatedProtocolCostUsd, 122.47);
  assert.equal(result.estimatedGrandTotalUsd, 182.47);
});

test("missing one molecule closes the whole quote rather than pricing a partial stack", () => {
  const result = buildPeptidesPreview(peptidesPreviewInputSchema.parse(base), [snapshot("KissPeptin-10", 31.19)], new Date().toISOString(), franceShipping);
  assert.equal(result.moleculeCount, 2);
  assert.equal(result.estimatedProtocolCostUsd, null);
  assert.equal(result.estimatedShippingCostUsd, null);
  assert.equal(result.estimatedGrandTotalUsd, null);
  assert.deepEqual(result.molecules, []);
});

test("landed-cost optimization includes shipping once per supplier", () => {
  const bpc = snapshot("BPC-157", 10, "5mg", "One Lab"); bpc.listings.push(snapshot("BPC-157", 8, "5mg", "Cheap Lab").listings[0]);
  const tb = snapshot("TB500", 10, "10mg", "One Lab"); tb.listings.push(snapshot("TB500", 8, "10mg", "Cheap Lab").listings[0]);
  const shipping: PeptauraShippingQuote[] = [
    { supplier: "One Lab", displayName: "One Lab", available: true, minimumOrderUsd: null, tiers: [{ minOrderUsd: 0, maxOrderUsd: null, costUsd: 10, speed: "fast" }] },
    { supplier: "Cheap Lab", displayName: "Cheap Lab", available: true, minimumOrderUsd: null, tiers: [{ minOrderUsd: 0, maxOrderUsd: null, costUsd: 100, speed: "slow" }] },
  ];
  const result = buildPeptidesPreview(peptidesPreviewInputSchema.parse({ ...base, primaryGoal: "recovery" }), [bpc, tb], new Date().toISOString(), shipping);
  assert.deepEqual(result.molecules.map((m) => m.supplier), ["One Lab", "One Lab"]);
  assert.equal(result.shippingBreakdown.length, 1);
  assert.equal(result.estimatedShippingCostUsd, 10);
});

test("the client UI defaults to France and advertises the exact V7 boundaries", () => {
  const source = fs.readFileSync(new URL("../client/src/pages/PeptidesPreviewPage.tsx", import.meta.url), "utf8");
  assert.match(source, /country: "FR"/);
  assert.match(source, /2 à 4 molécules/);
  assert.match(source, /12 semaines minimum/);
  assert.doesNotMatch(source, /m\.name|m\.doseSummary|m\.calculationBasis/);
});

test("identity, consent and incompatible conditions remain structurally validated", () => {
  assert.equal(peptidesPreviewInputSchema.safeParse({ ...base, email: "invalid" }).success, false);
  assert.equal(peptidesPreviewInputSchema.safeParse({ ...base, consent: false }).success, false);
  assert.equal(peptidesPreviewInputSchema.safeParse({ ...base, conditions: ["none", "hypertension"] }).success, false);
});
