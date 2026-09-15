import fs from "node:fs";
import assert from "node:assert/strict";
import { buildPeptidesPreview, getLivePeptauraPreviewCatalog, peptidesPreviewInputSchema } from "../server/peptidesPreview";

const goals = ["recovery", "gh-antiaging", "fatloss", "sleep", "cognitive", "libido", "testo-boost", "skin-hair", "endurance"] as const;
const live = await getLivePeptauraPreviewCatalog("FR");
const rows = [];
for (const primaryGoal of goals) {
  const input = peptidesPreviewInputSchema.parse({
    firstName: "Audit", email: "audit@example.com", age: 36, weightKg: 82, heightCm: 181, sex: "male", bodyFatRange: "15-20",
    primaryGoal, secondaryGoals: [], goalDetails: "Objectif détaillé avec historique, contraintes et résultat mesurable attendu sur le cycle.", timeline: "12plus",
    recoveryScope: primaryGoal === "recovery" ? "multi-site" : "not-applicable", glp1History: primaryGoal === "fatloss" ? "never" : "not-applicable",
    cognitiveStress: primaryGoal === "cognitive" ? "high" : "not-applicable", conditions: ["none"], bloodwork: "recent", bloodPressure: "normal",
    sleepHours: 7, injectionComfort: "possible", injectionFrequency: "twice-daily", refrigeration: "yes-private", experience: "read",
    trainingFrequency: "5plus", budgetTotalUsd: 1000, country: "FR", medications: "aucun", allergies: "aucune", currentPeptides: "aucun", pastPeptides: "aucun",
    startWhen: "1-2weeks", consent: true, attribution: {},
  });
  const result = buildPeptidesPreview(input, live.snapshots, live.checkedAt, live.shippingQuotes);
  assert.equal(result.shippingBreakdown.length, 1, `${primaryGoal}: shipping must appear once`);
  assert.equal(result.estimatedShippingCostUsd, result.shippingBreakdown[0].shippingUsd, `${primaryGoal}: shipping duplicated`);
  assert.equal(Math.round((result.estimatedProtocolCostUsd! + result.estimatedShippingCostUsd!) * 100), Math.round(result.estimatedGrandTotalUsd! * 100), `${primaryGoal}: total mismatch`);
  for (const molecule of result.molecules) {
    assert.equal(molecule.purchaseLines?.reduce((sum, line) => sum + line.deliveredVials, 0), molecule.vialsPurchased, `${primaryGoal}: vial line mismatch`);
    assert.equal(Math.round((molecule.purchaseLines?.reduce((sum, line) => sum + line.totalPriceUsd, 0) || 0) * 100), Math.round(molecule.estimatedTotalPriceUsd * 100), `${primaryGoal}: price line mismatch`);
  }
  rows.push({ goal: primaryGoal, status: result.status, moleculeCount: result.moleculeCount, products: result.estimatedProtocolCostUsd, shipping: result.estimatedShippingCostUsd, total: result.estimatedGrandTotalUsd, vialsRequired: result.totalVialsRequired, vialsPurchased: result.totalVialsPurchased, shippingRows: result.shippingBreakdown.length, internal: result.molecules.map((molecule) => ({ name: molecule.name, required: molecule.vialsRequired, purchased: molecule.vialsPurchased, cost: molecule.estimatedTotalPriceUsd, lines: molecule.purchaseLines?.map((line) => ({ boxSize: line.boxSize, packageCount: line.packageCount, deliveredVials: line.deliveredVials, packagePrice: line.packagePriceUsd, total: line.totalPriceUsd })) })) });
}
const report = { status: "PASS", checkedAt: live.checkedAt, scenarios: rows.length, rows };
fs.writeFileSync("/Users/achzod/.openclaw/workspace/tasks/pre-peptides-audit-v2/live-v8-corrected-pricing.json", JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
