import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import { buildPeptidesPreview, peptidesPreviewInputSchema } from "./peptidesPreview";
import type { PeptauraFeedProductSnapshot, PeptauraShippingQuote } from "./peptauraProductFeed";

const base = { firstName: "Karim", email: "karim@example.com", age: 38, weightKg: 88, heightCm: 180, sex: "male", bodyFatRange: "20-25", primaryGoal: "testo-boost", secondaryGoals: [], goalDetails: "Production endogène et fertilité à soutenir depuis plusieurs mois.", timeline: "12plus", recoveryScope: "not-applicable", glp1History: "not-applicable", cognitiveStress: "not-applicable", conditions: ["none"], bloodwork: "never", bloodPressure: "normal", sleepHours: 6, injectionComfort: "possible", injectionFrequency: "twice-daily", refrigeration: "yes-private", experience: "none", trainingFrequency: "3-4", budgetTotalUsd: 400, country: "FR", medications: "aucun", allergies: "aucune", currentPeptides: "aucun", pastPeptides: "aucun", startWhen: "1-2weeks", consent: true, attribution: {} } as const;
function snapshot(name: string, price = 20, dosage = "10mg"): PeptauraFeedProductSnapshot { return { slug: name, url: `https://supplier.invalid/${name}`, fetchedAt: new Date().toISOString(), live: true, source: "product_feed", sourceGeneratedAt: new Date().toISOString(), listings: [{ id: Math.round(price * 100), name, dosage, supplier: "Verified", supplierDisplayName: "Verified", outOfStock: false, form: "vial", priceTiers: [{ price, minQty: 1 }], warehouse: "EU", shippingOptionCount: 1, orderingMode: "available", enabled: true, suspended: false, boxSize: 1, marginRate: 0, productUrl: `https://supplier.invalid/product/${name}` }] }; }
const core = [snapshot("KissPeptin-10", 31.19), snapshot("PT-141", 20.03)];

test("Karim can produce a one-molecule estimate with complete internal math", () => {
  const result = buildPeptidesPreview(peptidesPreviewInputSchema.parse(base), core);
  assert.equal(result.nextStep, "peptides_engine");
  assert.equal(result.moleculeCount, 1);
  assert.equal(result.durationLabel, "Stratégie 12 semaines · 8 semaines actives");
  assert.equal(result.totalVialsRequired, 2);
  assert.ok(result.molecules.every((m) => m.totalRequiredMg > 0 && m.vialsPurchased === m.vialsRequired && m.vialsPurchased * m.vialStrengthMg >= m.totalRequiredMg * 1.2 && m.estimatedTotalPriceUsd > 0));
  assert.match(result.quoteExplanation, /1 molécule.*12 semaines/);
  assert.doesNotMatch(result.nextStepExplanation, /Blood Analysis|bilan|marqueur|informations supplémentaires/);
});

test("medicines and history change internal personalization without diverting purchase", () => {
  const input = peptidesPreviewInputSchema.parse({ ...base, medications: "lévothyroxine 75 mcg", pastPeptides: "ancien essai interrompu" });
  const result = buildPeptidesPreview(input, core);
  assert.equal(result.nextStep, "peptides_engine");
  assert.ok(result.blockers.includes("medicaments_a_integrer"));
  assert.ok(result.blockers.includes("historique_peptides_a_interpreter"));
  assert.equal(result.molecules.length, 1);
  assert.equal(result.totalVialsRequired, 2);
});

test("two secondary goals add only their attributable molecules", () => {
  const input = peptidesPreviewInputSchema.parse({ ...base, secondaryGoals: ["sleep", "skin-hair"] });
  const result = buildPeptidesPreview(input, [...core, snapshot("DSIP", 13.95, "5mg"), snapshot("GHK-Cu", 10.65, "50mg")]);
  assert.equal(result.moleculeCount, 3);
  assert.deepEqual(result.molecules.map((m) => m.name), ["KissPeptin-10", "DSIP", "GHK-Cu"]);
  const ghk = result.molecules.find((molecule) => molecule.name === "GHK-Cu");
  assert.ok(ghk);
  assert.equal(ghk.totalRequiredMg, 112);
  assert.equal(ghk.bufferedRequiredMg, 140);
  assert.equal(ghk.vialStrengthMg, 50);
  assert.equal(ghk.operationalVials, 4);
  assert.equal(ghk.vialsPurchased, 4);
});

test("one axis can legitimately expand from one to two molecules", () => {
  const single = buildPeptidesPreview(peptidesPreviewInputSchema.parse({ ...base, primaryGoal: "recovery", recoveryScope: "localized" }), [snapshot("BPC-157", 6.89, "5mg")]);
  const combined = buildPeptidesPreview(peptidesPreviewInputSchema.parse({ ...base, primaryGoal: "recovery", recoveryScope: "systemic" }), [snapshot("BPC-157", 6.89, "5mg"), snapshot("TB500", 6, "2mg")]);
  assert.deepEqual(single.molecules.map((molecule) => molecule.name), ["BPC-157"]);
  assert.deepEqual(combined.molecules.map((molecule) => molecule.name), ["BPC-157", "TB500"]);
});

test("public surfaces hide molecule names and doses while admin content preserves calculations", () => {
  const ui = fs.readFileSync(new URL("../client/src/pages/PeptidesPreviewPage.tsx", import.meta.url), "utf8");
  const routes = fs.readFileSync(new URL("./routes.ts", import.meta.url), "utf8");
  const emails = fs.readFileSync(new URL("./peptidesPreviewEmailContent.ts", import.meta.url), "utf8");
  assert.doesNotMatch(ui, /m\.name|m\.doseSummary|m\.calculationBasis/);
  assert.match(routes, /molecules:\s*_privateMolecules/);
  assert.match(routes, /totalVialsPurchased:\s*_privatePurchasedVials/);
  assert.match(emails, /Calcul interne dosage → fioles → prix/);
  assert.match(emails, /mathematicalVials/);
  assert.match(emails, /operationalVials/);
  assert.match(emails, /safetyReserveVials/);
  assert.match(emails, /vialsPurchased/);
  assert.match(emails, /protocolBasis/);
  assert.match(emails, /openingWindowDays/);
});

test("public quote exposes anonymous families, exact line prices and a twelve-week effect timeline", () => {
  const shipping: PeptauraShippingQuote[] = [{ supplier: "Verified", displayName: "Verified", available: true, minimumOrderUsd: null, tiers: [{ minOrderUsd: 0, maxOrderUsd: null, costUsd: 60, speed: "7 à 14 jours" }] }];
  const result = buildPeptidesPreview(peptidesPreviewInputSchema.parse(base), core, "2026-09-16T00:00:00.000Z", shipping);
  assert.equal(result.moleculeQuotes.length, result.moleculeCount);
  assert.equal(result.effectTimeline.length, 12);
  assert.ok(result.effectTimeline.every((entry) => entry.effects.length === result.moleculeCount));
  assert.equal(
    Number(result.moleculeQuotes.reduce((sum, line) => sum + line.estimatedTotalPriceUsd, 0).toFixed(2)),
    result.estimatedProtocolCostUsd,
  );
  assert.equal(Number(((result.estimatedProtocolCostUsd || 0) + (result.estimatedShippingCostUsd || 0)).toFixed(2)), result.estimatedGrandTotalUsd);
  assert.equal(result.estimatedShippingCostUsd, 60);
  result.molecules.forEach((molecule, index) => {
    assert.equal(molecule.bufferedRequiredMg, Number((molecule.totalRequiredMg * 1.25).toFixed(3)));
    assert.ok(molecule.purchasedCapacityMg >= molecule.bufferedRequiredMg);
    assert.equal(molecule.purchasedCapacityMg, Number((molecule.vialsPurchased * molecule.vialStrengthMg).toFixed(3)));
    assert.equal(molecule.reserveCapacityMg, Number((molecule.purchasedCapacityMg - molecule.totalRequiredMg).toFixed(3)));
    assert.equal(result.moleculeQuotes[index].estimatedTotalPriceUsd, molecule.estimatedTotalPriceUsd);
  });
  assert.deepEqual(result.moleculeQuotes.map((line) => line.label), ["Molécule 1"]);
  assert.ok(result.moleculeQuotes.every((line) => line.family.startsWith("Peptides ") && line.activeDurationWeeks > 0));
  const { molecules: _molecules, estimatedStarterCostUsd: _starter, totalVialsRequired: _required, totalVialsPurchased: _purchased, totalPackages: _packages, ...publicResult } = result;
  const publicPayload = JSON.stringify(publicResult);
  assert.doesNotMatch(publicPayload, /KissPeptin|Kisspeptin|PT-141|\b\d+(?:\.\d+)?\s*(?:mcg|mg)\b|doseSummary|vialsPurchased|supplier\.invalid/i);
  assert.match(publicPayload, /Peptides neuroendocriniens/);
});

test("secondary goals still require their decision inputs", () => {
  assert.equal(peptidesPreviewInputSchema.safeParse({ ...base, primaryGoal: "sleep", secondaryGoals: ["fatloss"], glp1History: "not-applicable" }).success, false);
  assert.equal(peptidesPreviewInputSchema.safeParse({ ...base, primaryGoal: "sleep", secondaryGoals: ["recovery"], recoveryScope: "not-applicable" }).success, false);
});
