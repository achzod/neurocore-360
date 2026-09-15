import assert from "node:assert/strict";
import fs from "node:fs";
import { buildPeptidesPreview, getLivePeptauraPreviewCatalog, peptidesPreviewInputSchema } from "../server/peptidesPreview";

const output = process.argv[2] || "/tmp/peptides-preview-countries-v10.json";
const countries = ["FR", "BE", "CH", "LU", "CA", "US", "AE", "GB", "DE", "ES", "IT", "NL", "PT", "MA", "DZ", "TN"] as const;
const goals = ["recovery", "gh-antiaging", "fatloss", "sleep", "cognitive", "libido", "testo-boost", "skin-hair", "endurance"] as const;
const base = {
  firstName: "AuditPays", email: "audit-pays@example.com", age: 36, weightKg: 82, heightCm: 179, sex: "male", bodyFatRange: "15-20",
  primaryGoal: "recovery", secondaryGoals: [], goalDetails: "Audit multi-pays complet des devis, quantités, confidentialité logistique et total rendu.",
  timeline: "12plus", recoveryScope: "localized", glp1History: "never", cognitiveStress: "high", conditions: ["none"], bloodwork: "recent",
  bloodPressure: "normal", sleepHours: 7, injectionComfort: "possible", injectionFrequency: "twice-daily", refrigeration: "yes-private",
  experience: "read", trainingFrequency: "5plus", budgetTotalUsd: 5000, country: "FR", medications: "aucun", allergies: "aucune",
  currentPeptides: "aucun", pastPeptides: "aucun", startWhen: "1-2weeks", consent: true, attribution: {},
} as const;
const cents = (value: number) => Math.round(value * 100);
const rows = [];
for (const country of countries) {
  const live = await getLivePeptauraPreviewCatalog(country);
  for (const goal of goals) {
    const input = peptidesPreviewInputSchema.parse({ ...base, country, primaryGoal: goal });
    const result = buildPeptidesPreview(input, live.snapshots, live.checkedAt, live.shippingQuotes);
    const quoted = result.estimatedGrandTotalUsd != null;
    if (quoted) {
      assert.ok(result.molecules.length >= 2 && result.molecules.length <= 4, `${country}/${goal}: complete stack`);
      assert.equal(result.shippingBreakdown.length, 1, `${country}/${goal}: one shipping row`);
      assert.equal(cents(result.estimatedGrandTotalUsd!), cents(result.estimatedProtocolCostUsd! + result.estimatedShippingCostUsd!), `${country}/${goal}: total`);
      assert.ok(result.molecules.every((molecule) => molecule.purchasedCapacityMg + 1e-9 >= molecule.bufferedRequiredMg), `${country}/${goal}: reserve`);
      assert.ok(result.molecules.every((molecule) => molecule.vialsPurchased === molecule.vialsRequired), `${country}/${goal}: no package overstock`);
    } else {
      assert.deepEqual(result.molecules, [], `${country}/${goal}: no partial quote`);
      assert.equal(result.estimatedProtocolCostUsd, null, `${country}/${goal}: no partial product subtotal`);
      assert.equal(result.estimatedShippingCostUsd, null, `${country}/${goal}: no orphan shipping`);
      assert.ok(result.blockers.includes("catalogue_incomplet_pour_pays") || result.blockers.includes("aucune_combinaison_livree_chiffree"), `${country}/${goal}: fail-closed reason`);
    }
    rows.push({ country, goal, quoted, status: result.status, products: result.estimatedProtocolCostUsd, shipping: result.estimatedShippingCostUsd, total: result.estimatedGrandTotalUsd, shippingRows: result.shippingBreakdown.length });
  }
}
const proof = { status: "PASS", checkedAt: new Date().toISOString(), scenarios: rows.length, quoted: rows.filter((row) => row.quoted).length, failClosed: rows.filter((row) => !row.quoted).length, rows };
fs.writeFileSync(output, JSON.stringify(proof, null, 2));
console.log(JSON.stringify({ status: proof.status, checkedAt: proof.checkedAt, scenarios: proof.scenarios, quoted: proof.quoted, failClosed: proof.failClosed }, null, 2));
