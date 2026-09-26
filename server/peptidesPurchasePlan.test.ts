import assert from "node:assert/strict";
import test from "node:test";
import {
  buildConditionalReconstitutionExamples,
  buildPurchasePlan,
  effectivePackagePrice,
  selectBestPurchasePlan,
  selectBestPurchasePlanWithMandatoryFallback,
} from "./peptidesPurchasePlan";

const listing = (dosage: string, price: number, boxSize = 1) => ({
  dosage,
  boxSize,
  marginRate: 0,
  priceTiers: [{ minQty: 1, price }],
});

test("MOTS-c 40 mg with official 10 mg vials requires four vials and four prices", () => {
  const plan = buildPurchasePlan(listing("10mg", 20.36), 40);
  assert.ok(plan);
  assert.equal(plan.requestedVials, 4);
  assert.equal(plan.deliveredMg, 40);
  assert.equal(plan.totalPriceUsd, 81.44);
});

test("exact five milligram needs retain a single official five milligram vial", () => {
  const plan = buildPurchasePlan(listing("5mg", 23.16), 5);
  assert.ok(plan);
  assert.equal(plan.requestedVials, 1);
  assert.equal(plan.totalPriceUsd, 23.16);
});

test("forced package overstock above twenty percent blocks the strict plan", () => {
  assert.equal(buildPurchasePlan(listing("10mg", 40, 10), 40), null);
});

test("mandatory fallback keeps the smallest official box that covers the need", () => {
  const plan = selectBestPurchasePlanWithMandatoryFallback([
    listing("10mg", 40, 10),
  ], 40, 1.3);
  assert.ok(plan);
  assert.equal(plan.requestedVials, 4);
  assert.equal(plan.deliveredVials, 10);
  assert.equal(plan.deliveredMg, 100);
  assert.equal(plan.forcedPackaging, true);
});

test("mandatory fallback composes enough boxes when one box undercovers", () => {
  const plan = selectBestPurchasePlanWithMandatoryFallback([
    listing("5mg", 30, 10),
  ], 70, 1.3);
  assert.ok(plan);
  assert.equal(plan.requestedVials, 14);
  assert.equal(plan.packageCount, 2);
  assert.equal(plan.deliveredVials, 20);
  assert.equal(plan.deliveredMg, 100);
});

test("mandatory fallback keeps a hard six-cycle coverage ceiling", () => {
  assert.equal(selectBestPurchasePlanWithMandatoryFallback([
    listing("1mg", 40, 100),
  ], 10, 1.3), null);
});

test("up to fifteen percent more selects the better-covered basket", () => {
  const plan = selectBestPurchasePlanWithMandatoryFallback([
    listing("10mg", 10),
    listing("50mg", 44),
  ], 40, 1.3);
  assert.ok(plan);
  assert.equal(plan.vialMg, 50);
  assert.equal(plan.totalPriceUsd, 44);
});

test("more than fifteen percent premium keeps the cheapest compliant basket", () => {
  const plan = selectBestPurchasePlanWithMandatoryFallback([
    listing("10mg", 10),
    listing("50mg", 47),
  ], 40, 1.3);
  assert.ok(plan);
  assert.equal(plan.vialMg, 10);
  assert.equal(plan.totalPriceUsd, 40);
});

test("selection compares the full cycle price instead of one-vial price", () => {
  const best = selectBestPurchasePlan([
    listing("5mg", 12),
    listing("10mg", 20.36),
    listing("40mg", 90),
  ], 40);
  assert.ok(best);
  assert.equal(best.vialMg, 10);
  assert.equal(best.requestedVials, 4);
  assert.equal(best.totalPriceUsd, 81.44);
});

test("volume discounts use the deepest eligible quantity tier without mutating source", () => {
  const source = {
    dosage: "10mg",
    boxSize: 1,
    marginRate: 0,
    priceTiers: [
      { minQty: 4, price: 18 },
      { minQty: 1, price: 20 },
    ],
  };
  assert.equal(effectivePackagePrice(source, 4), 18);
  assert.deepEqual(source.priceTiers.map((tier) => tier.minQty), [4, 1]);
});

test("conditional syringe calculations never choose a solvent volume", () => {
  assert.deepEqual(buildConditionalReconstitutionExamples(5, 100, "mcg"), [
    { solventMl: 1, concentrationPerMl: 5, doseVolumeMl: 0.02, u100Units: 2 },
    { solventMl: 2, concentrationPerMl: 2.5, doseVolumeMl: 0.04, u100Units: 4 },
    { solventMl: 3, concentrationPerMl: 5 / 3, doseVolumeMl: 0.06, u100Units: 6 },
  ]);
});

test("MOTS-c conditional calculations expose an over-capacity U-100 option", () => {
  const examples = buildConditionalReconstitutionExamples(10, 5, "mg");
  assert.equal(examples[0].u100Units, 50);
  assert.equal(examples[1].u100Units, 100);
  assert.equal(examples[2].u100Units, 150);
});
