import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import { buildPeptidesPreview, peptidesPreviewInputSchema } from "./peptidesPreview";
import type { PeptauraFeedProductSnapshot } from "./peptauraProductFeed";

const base = {
  firstName: "Karim",
  email: "karim@example.com",
  age: 38,
  weightKg: 88,
  heightCm: 180,
  sex: "male",
  bodyFatRange: "20-25",
  primaryGoal: "testo-boost",
  secondaryGoals: ["libido"],
  goalDetails: "Fatigue, libido basse et récupération réduite depuis plusieurs mois sans bilan hormonal récent ni protocole actuel.",
  timeline: "8-12",
  recoveryScope: "not-applicable",
  glp1History: "not-applicable",
  cognitiveStress: "not-applicable",
  conditions: ["none"],
  bloodwork: "never",
  bloodPressure: "normal",
  sleepHours: 6,
  injectionComfort: "possible",
  injectionFrequency: "few-week",
  refrigeration: "yes-private",
  experience: "none",
  trainingFrequency: "3-4",
  budgetTotalUsd: 300,
  country: "AE",
  medications: "aucun",
  allergies: "aucune",
  currentPeptides: "aucun actuellement",
  pastPeptides: "néant",
  startWhen: "1-2weeks",
  consent: true,
  attribution: {},
} as const;

function snapshot(name: string, price = 20, dosage = "10mg"): PeptauraFeedProductSnapshot {
  return {
    slug: name,
    url: `https://supplier.invalid/${name}`,
    fetchedAt: new Date().toISOString(),
    live: true,
    source: "product_feed",
    sourceGeneratedAt: new Date().toISOString(),
    listings: [{
      id: Math.round(price * 100), name, dosage, supplier: "Verified", supplierDisplayName: "Verified",
      outOfStock: false, form: "vial", priceTiers: [{ price, minQty: 1 }], warehouse: "EU",
      shippingOptionCount: 1, orderingMode: "available", enabled: true, suspended: false,
      boxSize: 1, marginRate: 0, productUrl: `https://supplier.invalid/product/${name}`,
    }],
  };
}

test("Karim testosterone symptoms convert directly to Peptides Engine without a generic pseudo-quote", () => {
  const input = peptidesPreviewInputSchema.parse(base);
  const result = buildPeptidesPreview(input, [snapshot("KissPeptin-10"), snapshot("PT-141")]);
  assert.equal(result.status, "review_required");
  assert.equal(result.nextStep, "peptides_engine");
  assert.equal(result.moleculeCount, 2);
  assert.equal(result.molecules.length, 2);
  assert.equal(typeof result.estimatedGrandTotalUsd, "number");
  assert.match(result.headline, /stratégie complète.*stack copié collé/);
  assert.match(result.rationale, /règles de personnalisation.*sélectionne les axes cohérents/);
  assert.doesNotMatch(result.rationale, /Au moins une réponse|L'algorithme/);
  assert.ok(result.analysisPoints.some((point) => /fatigue, libido basse et récupération réduite/i.test(point)));
  assert.deepEqual(result.requiredMarkers, []);
  assert.match(result.nextStepExplanation, /Débloque Peptides Engine maintenant/);
  assert.doesNotMatch(result.nextStepExplanation, /Blood Analysis|bilan|marqueur|informations supplémentaires/);
});

test("a medicine is integrated without diverting the buyer from Peptides Engine", () => {
  const input = peptidesPreviewInputSchema.parse({ ...base, medications: "lévothyroxine 75 mcg" });
  const result = buildPeptidesPreview(input, [snapshot("KissPeptin-10")]);
  assert.equal(result.nextStep, "peptides_engine");
  assert.ok(result.blockers.includes("bilan_hormonal_recent_requis"));
  assert.ok(result.blockers.includes("medicaments_a_integrer"));
  assert.ok(result.analysisPoints.some((point) => /lévothyroxine 75 mcg/.test(point)));
});

test("GH axis converts directly to Peptides Engine when free pricing is not personalized", () => {
  const input = peptidesPreviewInputSchema.parse({ ...base, primaryGoal: "gh-antiaging", secondaryGoals: [], bloodwork: "old" });
  const result = buildPeptidesPreview(input, [snapshot("CJC-1295 (no DAC)"), snapshot("Ipamorelin")]);
  assert.equal(result.status, "review_required");
  assert.equal(result.nextStep, "peptides_engine");
  assert.deepEqual(result.requiredMarkers, []);
  assert.match(result.nextStepExplanation, /Débloque Peptides Engine/);
  assert.equal(typeof result.estimatedProtocolCostUsd, "number");
});

test("past peptide outcomes and declared allergies are never ignored", () => {
  const input = peptidesPreviewInputSchema.parse({
    ...base,
    primaryGoal: "cognitive",
    secondaryGoals: [],
    cognitiveStress: "moderate",
    bloodwork: "recent",
    pastPeptides: "Semax arrêté pour céphalées",
    allergies: "alcool benzylique",
  });
  const result = buildPeptidesPreview(input, [snapshot("Semax", 20, "5mg")]);
  assert.equal(result.status, "review_required");
  assert.ok(result.blockers.includes("historique_peptides_a_interpreter"));
  assert.ok(result.blockers.includes("allergies_a_integrer"));
  assert.ok(result.analysisPoints.some((point) => /céphalées/.test(point)));
  assert.ok(result.analysisPoints.some((point) => /alcool benzylique/.test(point)));
});

test("an experienced profile still receives at most two attributable molecules", () => {
  const input = peptidesPreviewInputSchema.parse({
    ...base,
    primaryGoal: "cognitive",
    secondaryGoals: ["sleep", "skin-hair"],
    cognitiveStress: "high",
    bloodwork: "recent",
    experience: "regular",
  });
  const result = buildPeptidesPreview(input, [snapshot("Semax", 20, "5mg"), snapshot("Selank", 20, "5mg"), snapshot("DSIP", 20, "5mg"), snapshot("GHK-Cu", 20, "50mg")]);
  assert.equal(result.status, "eligible");
  assert.equal(result.molecules.length, 2);
  assert.deepEqual(result.molecules.map((molecule) => molecule.name), ["Semax", "Selank"]);
  assert.match(result.rationale, /retient 2 leviers directement reliés/);
  assert.doesNotMatch(result.rationale, /Chaque dose de référence est multipliée/);
});

test("secondary goals require the same decision inputs as primary goals", () => {
  assert.equal(peptidesPreviewInputSchema.safeParse({ ...base, primaryGoal: "sleep", secondaryGoals: ["fatloss"], glp1History: "not-applicable", bloodwork: "recent" }).success, false);
  assert.equal(peptidesPreviewInputSchema.safeParse({ ...base, primaryGoal: "sleep", secondaryGoals: ["recovery"], recoveryScope: "not-applicable", bloodwork: "recent" }).success, false);
  assert.equal(peptidesPreviewInputSchema.safeParse({ ...base, primaryGoal: "sleep", secondaryGoals: ["cognitive"], cognitiveStress: "not-applicable", bloodwork: "recent" }).success, false);
});

test("review UI has a dedicated decision surface and no empty quote placeholders", () => {
  const source = fs.readFileSync(new URL("../client/src/pages/PeptidesPreviewPage.tsx", import.meta.url), "utf8");
  assert.match(source, /result\.status === "eligible"/);
  assert.match(source, /Nombre de molécules/);
  assert.match(source, /Durée estimée/);
  assert.match(source, /Total rendu estimé/);
  assert.match(source, /protocole plus poussé et plus précis/);
  assert.match(source, /Débloquer mon analyse Peptides Engine/);
  assert.match(source, /result\.nextStepExplanation/);
  assert.doesNotMatch(source, /Blood Analysis|Vérifier mes marqueurs|Obtenir ma sélection personnalisée|m\.name|m\.doseSummary|m\.calculationBasis/);
  assert.doesNotMatch(source, /À valider/);
});
