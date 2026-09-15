import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import { buildPeptidesPreview, peptidesPreviewInputSchema } from "./peptidesPreview";
import type { PeptauraFeedProductSnapshot } from "./peptauraProductFeed";

const base = { firstName: "Karim", email: "karim@example.com", age: 38, weightKg: 88, heightCm: 180, sex: "male", bodyFatRange: "20-25", primaryGoal: "testo-boost", secondaryGoals: [], goalDetails: "Fatigue, libido basse et récupération réduite depuis plusieurs mois.", timeline: "12plus", recoveryScope: "not-applicable", glp1History: "not-applicable", cognitiveStress: "not-applicable", conditions: ["none"], bloodwork: "never", bloodPressure: "normal", sleepHours: 6, injectionComfort: "possible", injectionFrequency: "twice-daily", refrigeration: "yes-private", experience: "none", trainingFrequency: "3-4", budgetTotalUsd: 400, country: "FR", medications: "aucun", allergies: "aucune", currentPeptides: "aucun", pastPeptides: "aucun", startWhen: "1-2weeks", consent: true, attribution: {} } as const;
function snapshot(name: string, price = 20, dosage = "10mg"): PeptauraFeedProductSnapshot { return { slug: name, url: `https://supplier.invalid/${name}`, fetchedAt: new Date().toISOString(), live: true, source: "product_feed", sourceGeneratedAt: new Date().toISOString(), listings: [{ id: Math.round(price * 100), name, dosage, supplier: "Verified", supplierDisplayName: "Verified", outOfStock: false, form: "vial", priceTiers: [{ price, minQty: 1 }], warehouse: "EU", shippingOptionCount: 1, orderingMode: "available", enabled: true, suspended: false, boxSize: 1, marginRate: 0, productUrl: `https://supplier.invalid/product/${name}` }] }; }
const core = [snapshot("KissPeptin-10", 31.19), snapshot("PT-141", 20.03)];

test("Karim produces a two-molecule twelve-week estimate with complete internal math", () => {
  const result = buildPeptidesPreview(peptidesPreviewInputSchema.parse(base), core);
  assert.equal(result.nextStep, "peptides_engine");
  assert.equal(result.moleculeCount, 2);
  assert.equal(result.durationLabel, "12 semaines");
  assert.equal(result.totalVialsRequired, 5);
  assert.ok(result.molecules.every((m) => m.totalRequiredMg > 0 && m.safetyReserveVials >= 1 && m.vialsRequired > m.operationalVials && m.estimatedTotalPriceUsd > 0));
  assert.match(result.quoteExplanation, /2 molécules.*12 semaines/);
  assert.doesNotMatch(result.nextStepExplanation, /Blood Analysis|bilan|marqueur|informations supplémentaires/);
});

test("medicines and history change internal personalization without diverting purchase", () => {
  const input = peptidesPreviewInputSchema.parse({ ...base, medications: "lévothyroxine 75 mcg", pastPeptides: "ancien essai interrompu" });
  const result = buildPeptidesPreview(input, core);
  assert.equal(result.nextStep, "peptides_engine");
  assert.ok(result.blockers.includes("medicaments_a_integrer"));
  assert.ok(result.blockers.includes("historique_peptides_a_interpreter"));
  assert.equal(result.molecules.length, 2);
  assert.equal(result.totalVialsRequired, 5);
});

test("two secondary goals can raise a protocol to four but never beyond four", () => {
  const input = peptidesPreviewInputSchema.parse({ ...base, secondaryGoals: ["sleep", "skin-hair"] });
  const result = buildPeptidesPreview(input, [...core, snapshot("DSIP", 13.95, "5mg"), snapshot("GHK-Cu", 10.65, "50mg")]);
  assert.equal(result.moleculeCount, 4);
  assert.deepEqual(result.molecules.map((m) => m.name), ["KissPeptin-10", "PT-141", "DSIP", "GHK-Cu"]);
});

test("public surfaces hide molecule names and doses while admin content preserves calculations", () => {
  const ui = fs.readFileSync(new URL("../client/src/pages/PeptidesPreviewPage.tsx", import.meta.url), "utf8");
  const routes = fs.readFileSync(new URL("./routes.ts", import.meta.url), "utf8");
  const emails = fs.readFileSync(new URL("./peptidesPreviewEmailContent.ts", import.meta.url), "utf8");
  assert.doesNotMatch(ui, /m\.name|m\.doseSummary|m\.calculationBasis/);
  assert.match(routes, /const publicResult = \{[\s\S]*molecules:\s*\[\]/);
  assert.match(emails, /Calcul interne dosage → fioles → prix/);
  assert.match(emails, /mathematicalVials/);
  assert.match(emails, /operationalVials/);
  assert.match(emails, /safetyReserveVials/);
  assert.match(emails, /vialsPurchased/);
});

test("secondary goals still require their decision inputs", () => {
  assert.equal(peptidesPreviewInputSchema.safeParse({ ...base, primaryGoal: "sleep", secondaryGoals: ["fatloss"], glp1History: "not-applicable" }).success, false);
  assert.equal(peptidesPreviewInputSchema.safeParse({ ...base, primaryGoal: "sleep", secondaryGoals: ["recovery"], recoveryScope: "not-applicable" }).success, false);
});
