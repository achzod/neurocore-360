import fs from "node:fs";
import assert from "node:assert/strict";
import { buildPeptidesPreview, getLivePeptauraPreviewCatalog, peptidesPreviewInputSchema } from "../server/peptidesPreview";

const profile = peptidesPreviewInputSchema.parse({
  firstName: "Audit", email: "audit@example.com", age: 36, weightKg: 82, heightCm: 181, sex: "male", bodyFatRange: "15-20",
  primaryGoal: "recovery", secondaryGoals: ["sleep"], goalDetails: "Récupération de plusieurs zones après une charge sportive élevée.", timeline: "8-12",
  recoveryScope: "multi-site", glp1History: "not-applicable", cognitiveStress: "not-applicable", conditions: ["none"], bloodwork: "recent",
  bloodPressure: "normal", sleepHours: 7, injectionComfort: "possible", injectionFrequency: "twice-daily", refrigeration: "yes-private",
  experience: "read", trainingFrequency: "5plus", budgetTotalUsd: 500, country: "FR", medications: "aucun", allergies: "aucune",
  currentPeptides: "aucun", pastPeptides: "aucun", startWhen: "1-2weeks", consent: true, attribution: {},
});
const live = await getLivePeptauraPreviewCatalog("FR");
const result = buildPeptidesPreview(profile, live.snapshots, live.checkedAt, live.shippingQuotes);
assert.equal(result.status, "eligible");
assert.ok(result.molecules.length >= 2);
assert.ok(result.estimatedProtocolCostUsd != null && result.estimatedShippingCostUsd != null && result.estimatedGrandTotalUsd != null);
const products = result.molecules.reduce((sum, molecule) => sum + Math.round(molecule.estimatedTotalPriceUsd * 100), 0);
const shipping = result.shippingBreakdown.reduce((sum, line) => sum + Math.round(line.shippingUsd * 100), 0);
assert.equal(products, Math.round(result.estimatedProtocolCostUsd * 100));
assert.equal(shipping, Math.round(result.estimatedShippingCostUsd * 100));
assert.equal(products + shipping, Math.round(result.estimatedGrandTotalUsd * 100));
for (const molecule of result.molecules) {
  assert.equal(Math.round(molecule.packageCount * molecule.startingPackagePriceUsd * 100), Math.round(molecule.estimatedTotalPriceUsd * 100));
  assert.ok(molecule.operationalVials >= molecule.mathematicalVials);
  assert.ok(molecule.vialsPurchased >= molecule.operationalVials);
  assert.match(molecule.calculationBasis, /= .* mg au total$/);
}
fs.mkdirSync("tasks/pre-peptides-audit-20260915", { recursive: true });
fs.writeFileSync("tasks/pre-peptides-audit-20260915/live-v2-result.json", JSON.stringify({ checkedAt: live.checkedAt, profile, result }, null, 2));
console.log(JSON.stringify({ status: "PASS", molecules: result.molecules.map((molecule) => molecule.name), products: result.estimatedProtocolCostUsd, shipping: result.estimatedShippingCostUsd, grandTotal: result.estimatedGrandTotalUsd, vendors: result.shippingBreakdown.length }, null, 2));
