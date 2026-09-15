import fs from "node:fs";
import assert from "node:assert/strict";
import { buildPeptidesPreview, getLivePeptauraPreviewCatalog, peptidesPreviewInputSchema } from "../server/peptidesPreview";
const goals = ["recovery", "gh-antiaging", "fatloss", "sleep", "cognitive", "libido", "testo-boost", "skin-hair", "endurance"] as const;
const rows: unknown[] = [];
for (const country of ["FR", "AE"] as const) {
  const live = await getLivePeptauraPreviewCatalog(country);
  for (const primaryGoal of goals) {
    const profile = peptidesPreviewInputSchema.parse({
      firstName: "Audit", email: "audit@example.com", age: 36, weightKg: 82, heightCm: 181, sex: "male", bodyFatRange: "15-20",
      primaryGoal, secondaryGoals: [], goalDetails: "Objectif détaillé avec historique, contraintes et résultat mesurable attendu sur le cycle.", timeline: "8-12",
      recoveryScope: primaryGoal === "recovery" ? "multi-site" : "not-applicable", glp1History: primaryGoal === "fatloss" ? "never" : "not-applicable",
      cognitiveStress: primaryGoal === "cognitive" ? "high" : "not-applicable", conditions: ["none"], bloodwork: "recent", bloodPressure: "normal",
      sleepHours: 7, injectionComfort: "possible", injectionFrequency: "twice-daily", refrigeration: "yes-private", experience: "read",
      trainingFrequency: "5plus", budgetTotalUsd: 1000, country, medications: "aucun", allergies: "aucune", currentPeptides: "aucun", pastPeptides: "aucun",
      startWhen: "1-2weeks", consent: true, attribution: {},
    });
    const result = buildPeptidesPreview(profile, live.snapshots, live.checkedAt, live.shippingQuotes);
    if (primaryGoal === "testo-boost") assert.equal(result.status, "review_required");
    if (result.status === "eligible") {
      assert.ok(result.estimatedGrandTotalUsd != null && result.estimatedShippingCostUsd != null);
      const productCents = result.molecules.reduce((sum, item) => sum + Math.round(item.estimatedTotalPriceUsd * 100), 0);
      const shippingCents = result.shippingBreakdown.reduce((sum, item) => sum + Math.round(item.shippingUsd * 100), 0);
      assert.equal(productCents + shippingCents, Math.round(result.estimatedGrandTotalUsd * 100));
      for (const molecule of result.molecules) {
        assert.ok(molecule.operationalVials >= molecule.mathematicalVials);
        assert.ok(molecule.vialsPurchased >= molecule.operationalVials);
      }
    }
    rows.push({ country, primaryGoal, status: result.status, products: result.estimatedProtocolCostUsd, shipping: result.estimatedShippingCostUsd, total: result.estimatedGrandTotalUsd, molecules: result.molecules.map((item) => item.name), blockers: result.blockers });
  }
}
fs.writeFileSync("tasks/pre-peptides-audit-20260915/matrix-v2.json", JSON.stringify({ status: "PASS", scenarios: rows.length, rows }, null, 2));
console.log(JSON.stringify({ status: "PASS", scenarios: rows.length, eligible: rows.filter((row: any) => row.status === "eligible").length, review: rows.filter((row: any) => row.status === "review_required").length }));
