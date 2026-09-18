import assert from "node:assert/strict";
import fs from "node:fs";
import { buildPeptidesPreview, getLivePeptauraPreviewCatalog, peptidesPreviewInputSchema } from "../server/peptidesPreview";

const output = process.argv[2] || "/tmp/peptides-preview-algorithm-v10.json";
const base = {
  firstName: "AuditV10", email: "audit-v10@example.com", age: 36, weightKg: 82, heightCm: 179, sex: "male", bodyFatRange: "15-20",
  primaryGoal: "recovery", secondaryGoals: [], goalDetails: "Audit indépendant des phases, quantités, formats, prix et livraison du pré-calcul.",
  timeline: "12plus", recoveryScope: "localized", glp1History: "never", cognitiveStress: "high", conditions: ["none"], bloodwork: "recent",
  bloodPressure: "normal", sleepHours: 7, injectionComfort: "possible", injectionFrequency: "twice-daily", refrigeration: "yes-private",
  experience: "read", trainingFrequency: "5plus", budgetTotalUsd: 1000, country: "FR", medications: "aucun", allergies: "aucune",
  currentPeptides: "aucun", pastPeptides: "aucun", startWhen: "1-2weeks", consent: true, attribution: {},
} as const;

const expected = {
  recovery: { names: ["BPC-157", "TB500"], needs: [28, 30], duration: "Stratégie 12 semaines · 8 semaines actives" },
  "gh-antiaging": { names: ["CJC-1295 (no DAC)", "Ipamorelin"], needs: [8.4, 8.4], duration: "12 semaines actives" },
  fatloss: { names: ["Semaglutide", "MOTS-c"], needs: [7, 40], duration: "Stratégie 12 semaines · phases actives de 8 à 12 semaines" },
  sleep: { names: ["DSIP", "Selank"], needs: [4.9, 7], duration: "Stratégie 12 semaines · 4 semaines actives" },
  cognitive: { names: ["Semax", "Selank"], needs: [5.6, 7], duration: "Stratégie 12 semaines · 4 semaines actives" },
  libido: { names: ["PT-141", "KissPeptin-10"], needs: [6, 2.4], duration: "Stratégie 12 semaines · phases actives de 8 à 12 semaines" },
  "testo-boost": { names: ["KissPeptin-10", "PT-141"], needs: [2.4, 6], duration: "Stratégie 12 semaines · phases actives de 8 à 12 semaines" },
  "skin-hair": { names: ["GHK-Cu", "BPC-157"], needs: [80, 14], duration: "Stratégie 12 semaines · 8 semaines actives" },
  endurance: { names: ["MOTS-c", "SS-31"], needs: [40, 28], duration: "Stratégie 12 semaines · phases actives de 4 à 8 semaines" },
} as const;

const cents = (value: number) => Math.round(value * 100);
const live = await getLivePeptauraPreviewCatalog("FR");
const rows = [];
for (const [goal, oracle] of Object.entries(expected)) {
  const input = peptidesPreviewInputSchema.parse({ ...base, primaryGoal: goal });
  const result = buildPeptidesPreview(input, live.snapshots, live.checkedAt, live.shippingQuotes);
  assert.deepEqual(result.molecules.map((molecule) => molecule.name), oracle.names, `${goal}: molecules`);
  assert.deepEqual(result.molecules.map((molecule) => molecule.totalRequiredMg), oracle.needs, `${goal}: active milligrams`);
  assert.equal(result.durationLabel, oracle.duration, `${goal}: duration label`);
  assert.equal(result.shippingBreakdown.length, 1, `${goal}: one shipping row`);
  assert.equal(cents(result.estimatedShippingCostUsd!), cents(result.shippingBreakdown[0].shippingUsd), `${goal}: shipping sum`);
  assert.equal(cents(result.estimatedGrandTotalUsd!), cents(result.estimatedProtocolCostUsd! + result.estimatedShippingCostUsd!), `${goal}: landed total`);
  assert.equal(cents(result.estimatedProtocolCostUsd!), result.molecules.reduce((sum, molecule) => sum + cents(molecule.estimatedTotalPriceUsd), 0), `${goal}: product sum`);
  for (const molecule of result.molecules) {
    assert.ok(molecule.purchasedCapacityMg + 1e-9 >= molecule.bufferedRequiredMg, `${goal}/${molecule.name}: 20% target`);
    assert.equal(molecule.vialsPurchased, molecule.vialsRequired, `${goal}/${molecule.name}: no package overstock`);
    assert.equal(molecule.purchasedCapacityMg, molecule.vialsPurchased * molecule.vialStrengthMg, `${goal}/${molecule.name}: capacity`);
    assert.equal(cents(molecule.estimatedTotalPriceUsd), molecule.purchaseLines!.reduce((sum, line) => sum + cents(line.totalPriceUsd), 0), `${goal}/${molecule.name}: line prices`);
    assert.equal(molecule.vialsPurchased, molecule.purchaseLines!.reduce((sum, line) => sum + line.deliveredVials, 0), `${goal}/${molecule.name}: delivered vials`);
  }
  rows.push({
    goal,
    duration: result.durationLabel,
    products: result.estimatedProtocolCostUsd,
    shipping: result.estimatedShippingCostUsd,
    total: result.estimatedGrandTotalUsd,
    vials: result.totalVialsPurchased,
    molecules: result.molecules.map((molecule) => ({
      name: molecule.name,
      activeNeedMg: molecule.totalRequiredMg,
      targetWith20PctMg: molecule.bufferedRequiredMg,
      purchasedCapacityMg: molecule.purchasedCapacityMg,
      vials: molecule.vialsPurchased,
      cost: molecule.estimatedTotalPriceUsd,
    })),
  });
}
const proof = { status: "PASS", checkedAt: new Date().toISOString(), catalogCheckedAt: live.checkedAt, scenarios: rows.length, rows };
fs.writeFileSync(output, JSON.stringify(proof, null, 2));
console.log(JSON.stringify(proof, null, 2));
