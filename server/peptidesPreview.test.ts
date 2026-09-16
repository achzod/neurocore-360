import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import { buildPeptidesPreview, peptidesPreviewInputSchema } from "./peptidesPreview";
import type { PeptauraFeedProductSnapshot } from "./peptauraProductFeed";
import type { PeptauraShippingQuote } from "./peptauraShipping";

const base = {
  firstName: "Karim", email: "karim@example.com", age: 36, weightKg: 84, heightCm: 181, sex: "male", bodyFatRange: "20-25",
  primaryGoal: "testo-boost", secondaryGoals: [], goalDetails: "Production endogène et fertilité à soutenir depuis plusieurs mois.",
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

test("a single-axis profile can receive one fully calculated molecule", () => {
  const result = buildPeptidesPreview(peptidesPreviewInputSchema.parse(base), catalog, "2026-09-15T09:00:00Z", franceShipping);
  assert.equal(result.moleculeCount, 1);
  assert.equal(result.durationLabel, "Stratégie 12 semaines · 8 semaines actives");
  assert.deepEqual(result.molecules.map((m) => ({ name: m.name, dose: m.doseSummary, need: m.totalRequiredMg, vials: m.vialsRequired, bought: m.vialsPurchased, cost: m.estimatedTotalPriceUsd })), [
    { name: "KissPeptin-10", dose: "100 mcg par administration, 3 fois par semaine pendant 8 semaines dans une stratégie de 12 semaines", need: 2.4, vials: 2, bought: 2, cost: 62.38 },
  ]);
  assert.deepEqual(result.molecules.map((m) => ({ operational: m.operationalVials, reserve: m.safetyReserveVials, ordered: m.vialsRequired })), [
    { operational: 2, reserve: 0, ordered: 2 },
  ]);
  assert.ok(result.molecules.every((m) => m.vialsPurchased * m.vialStrengthMg >= m.totalRequiredMg * 1.2));
  assert.equal(result.totalVialsRequired, 2);
  assert.equal(result.totalVialsPurchased, 2);
  assert.equal(result.estimatedProtocolCostUsd, 62.38);
  assert.equal(result.estimatedShippingCostUsd, 60);
  assert.equal(result.estimatedGrandTotalUsd, 122.38);
});

test("eligible copy explains the actual axes, execution constraints and budget instead of generic filler", () => {
  const input = peptidesPreviewInputSchema.parse({
    ...base,
    primaryGoal: "gh-antiaging",
    bloodwork: "recent",
    trainingFrequency: "3-4",
    budgetTotalUsd: 400,
  });
  const result = buildPeptidesPreview(input, catalog, "2026-09-15T09:00:00Z", franceShipping);
  const copy = [result.rationale, ...result.analysisPoints, result.nextStepExplanation].join(" ");
  assert.match(copy, /signal pulsatile de l’axe gh/i);
  assert.match(copy, /sécrétagogue complémentaire/i);
  assert.match(copy, /deux administrations par jour/i);
  assert.match(copy, /réfrigérateur privé/i);
  assert.match(copy, /budget déclaré de \$400\.00/i);
  assert.match(copy, /sans remplir un second questionnaire/i);
  assert.doesNotMatch(copy, /Ton objectif .* pilote la sélection|La stratégie de référence est chiffrée/i);
});

test("primary goals produce the profile-driven count and never less than twelve strategic weeks", () => {
  const expectedCounts = { recovery: 2, "gh-antiaging": 2, fatloss: 2, sleep: 1, cognitive: 2, libido: 1, "testo-boost": 1, "skin-hair": 1, endurance: 2 } as const;
  for (const primaryGoal of ["recovery", "gh-antiaging", "fatloss", "sleep", "cognitive", "libido", "testo-boost", "skin-hair", "endurance"] as const) {
    const result = buildPeptidesPreview(peptidesPreviewInputSchema.parse({ ...base, primaryGoal }), catalog, new Date().toISOString(), franceShipping);
    assert.equal(result.moleculeCount, expectedCounts[primaryGoal], primaryGoal);
    assert.equal(result.molecules.length, result.moleculeCount, primaryGoal);
    assert.ok(result.molecules.every((m) => /12 semaines/.test(m.cycleDurationLabel)), primaryGoal);
    assert.match(result.durationLabel, /12 semaines/, primaryGoal);
    assert.match(result.durationLabel, /actives/, primaryGoal);
    assert.ok(result.molecules.every((m) => m.calculationBasis.length > 20 && m.totalRequiredMg > 0 && m.vialsRequired >= m.operationalVials && m.vialsPurchased >= m.vialsRequired && m.safetyReserveVials === m.vialsPurchased - m.operationalVials && m.vialsPurchased * m.vialStrengthMg >= m.totalRequiredMg * 1.2), primaryGoal);
  }
});

test("reference phases never stretch every molecule across twelve active weeks", () => {
  const expectedNeeds: Record<string, Record<string, number>> = {
    recovery: { "BPC-157": 18.816, TB500: 30 },
    "gh-antiaging": { "CJC-1295 (no DAC)": 10.584, Ipamorelin: 10.584 },
    fatloss: { Semaglutide: 7, "MOTS-c": 40 },
    sleep: { DSIP: 4.2 },
    cognitive: { Semax: 11.2, Selank: 14 },
    libido: { "PT-141": 6 },
    "testo-boost": { "KissPeptin-10": 2.4 },
    "skin-hair": { "GHK-Cu": 112 },
    endurance: { "MOTS-c": 80, "SS-31": 56 },
  };
  for (const [primaryGoal, needs] of Object.entries(expectedNeeds)) {
    const result = buildPeptidesPreview(peptidesPreviewInputSchema.parse({ ...base, primaryGoal }), catalog, new Date().toISOString(), franceShipping);
    assert.deepEqual(Object.fromEntries(result.molecules.map((molecule) => [molecule.name, molecule.totalRequiredMg])), needs, primaryGoal);
    assert.ok(result.molecules.every((molecule) => molecule.purchasedCapacityMg >= molecule.bufferedRequiredMg), primaryGoal);
    assert.ok(result.molecules.every((molecule) => molecule.reserveCapacityMg >= molecule.totalRequiredMg * 0.2 - 1e-9), primaryGoal);
  }
});

test("GHK-Cu uses a full daily protocol and plans every 28-day window by vial strength", () => {
  const fiftyMgOnly = [snapshot("GHK-Cu", 10.65, "50mg")];
  const ghk = buildPeptidesPreview(peptidesPreviewInputSchema.parse({ ...base, primaryGoal: "skin-hair", trainingFrequency: "3-4" }), fiftyMgOnly, new Date().toISOString(), franceShipping).molecules[0];
  assert.equal(ghk.totalRequiredMg, 112);
  assert.equal(ghk.administrationCount, 56);
  assert.match(ghk.doseSummary, /2 mg par administration, 7 fois par semaine pendant 8 semaines/);
  assert.equal(ghk.openingWindowDays, 28);
  assert.equal(ghk.vialStrengthMg, 50);
  assert.equal(ghk.mathematicalVials, 3);
  assert.equal(ghk.operationalVials, 4);
  assert.equal(ghk.vialsPurchased, 4);
  assert.equal(ghk.bufferedRequiredMg, 140);
  assert.equal(ghk.purchasedCapacityMg, 200);
  assert.equal(ghk.estimatedTotalPriceUsd, 42.6);

  const hundredMgOnly = [snapshot("GHK-Cu", 15.21, "100mg")];
  const ghk100 = buildPeptidesPreview(peptidesPreviewInputSchema.parse({ ...base, primaryGoal: "skin-hair", trainingFrequency: "3-4" }), hundredMgOnly, new Date().toISOString(), franceShipping).molecules[0];
  assert.equal(ghk100.totalRequiredMg, 112);
  assert.equal(ghk100.vialStrengthMg, 100);
  assert.equal(ghk100.mathematicalVials, 2);
  assert.equal(ghk100.operationalVials, 2);
  assert.equal(ghk100.vialsPurchased, 2);
  assert.equal(ghk100.purchasedCapacityMg, 200);

  const semaglutideCatalog = [snapshot("Semaglutide", 11.92, "5mg"), snapshot("Semaglutide", 16.47, "10mg")];
  const semaglutide = buildPeptidesPreview(peptidesPreviewInputSchema.parse({ ...base, primaryGoal: "fatloss", trainingFrequency: "3-4" }), semaglutideCatalog, new Date().toISOString(), franceShipping).molecules[0];
  assert.equal(semaglutide.totalRequiredMg, 7);
  assert.equal(semaglutide.mathematicalVials, 2);
  assert.equal(semaglutide.operationalVials, 3);
  assert.equal(semaglutide.vialStrengthMg, 5);
  assert.equal(semaglutide.vialsPurchased, 3);
  assert.equal(semaglutide.estimatedTotalPriceUsd, 35.76);
});

test("dose, frequency and total need change from the measurable profile instead of a universal hardcode", () => {
  const lightRecovery = buildPeptidesPreview(peptidesPreviewInputSchema.parse({ ...base, primaryGoal: "recovery", recoveryScope: "localized", weightKg: 60, trainingFrequency: "3-4" }), catalog, new Date().toISOString(), franceShipping).molecules[0];
  const systemicRecovery = buildPeptidesPreview(peptidesPreviewInputSchema.parse({ ...base, primaryGoal: "recovery", recoveryScope: "systemic", weightKg: 100, trainingFrequency: "3-4" }), catalog, new Date().toISOString(), franceShipping).molecules[0];
  assert.equal(lightRecovery.totalRequiredMg, 11.2);
  assert.equal(systemicRecovery.totalRequiredMg, 28);

  const moderateSleep = buildPeptidesPreview(peptidesPreviewInputSchema.parse({ ...base, primaryGoal: "sleep", sleepHours: 6 }), catalog, new Date().toISOString(), franceShipping).molecules[0];
  const severeSleep = buildPeptidesPreview(peptidesPreviewInputSchema.parse({ ...base, primaryGoal: "sleep", sleepHours: 5 }), catalog, new Date().toISOString(), franceShipping).molecules[0];
  assert.equal(moderateSleep.totalRequiredMg, 4.2);
  assert.equal(severeSleep.totalRequiredMg, 5.6);

  const firstGlp1 = buildPeptidesPreview(peptidesPreviewInputSchema.parse({ ...base, primaryGoal: "fatloss", trainingFrequency: "3-4", glp1History: "never" }), catalog, new Date().toISOString(), franceShipping).molecules[0];
  const toleratedGlp1 = buildPeptidesPreview(peptidesPreviewInputSchema.parse({ ...base, primaryGoal: "fatloss", trainingFrequency: "3-4", glp1History: "tolerated" }), catalog, new Date().toISOString(), franceShipping).molecules[0];
  assert.equal(firstGlp1.totalRequiredMg, 7);
  assert.equal(toleratedGlp1.totalRequiredMg, 12.8);

  const lowStress = buildPeptidesPreview(peptidesPreviewInputSchema.parse({ ...base, primaryGoal: "cognitive", cognitiveStress: "low", trainingFrequency: "3-4" }), catalog, new Date().toISOString(), franceShipping).molecules[0];
  const highStress = buildPeptidesPreview(peptidesPreviewInputSchema.parse({ ...base, primaryGoal: "cognitive", cognitiveStress: "high", trainingFrequency: "3-4" }), catalog, new Date().toISOString(), franceShipping).molecules[0];
  assert.equal(lowStress.totalRequiredMg, 5.6);
  assert.equal(highStress.totalRequiredMg, 11.2);
});

test("secondary goals can add several molecules while duplicate candidates are merged", () => {
  const result = buildPeptidesPreview(peptidesPreviewInputSchema.parse({ ...base, primaryGoal: "cognitive", secondaryGoals: ["sleep", "skin-hair"] }), catalog, new Date().toISOString(), franceShipping);
  assert.equal(result.moleculeCount, 4);
  assert.deepEqual(result.molecules.map((m) => m.name), ["Semax", "Selank", "DSIP", "GHK-Cu"]);
  const ghk = result.molecules.find((molecule) => molecule.name === "GHK-Cu");
  assert.ok(ghk);
  assert.equal(ghk.totalRequiredMg, 112);
  assert.equal(ghk.administrationCount, 56);
  assert.equal(ghk.vialStrengthMg, 50);
  assert.equal(ghk.mathematicalVials, 3);
  assert.equal(ghk.operationalVials, 4);
  assert.equal(ghk.vialsPurchased, 4);
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
  assert.equal(result.moleculeCount, 1);
  assert.equal(result.totalVialsRequired, 2);
  assert.equal(result.estimatedProtocolCostUsd, 62.38);
  assert.equal(result.estimatedGrandTotalUsd, 122.38);
});

test("a blend cannot impersonate and double-price two standalone molecules", () => {
  const blend = snapshot("CJC-1295 (no DAC) + Ipamorelin", 40, "10mg");
  const result = buildPeptidesPreview(peptidesPreviewInputSchema.parse({ ...base, primaryGoal: "gh-antiaging" }), [blend], new Date().toISOString(), franceShipping);
  assert.equal(result.status, "review_required");
  assert.equal(result.estimatedProtocolCostUsd, null);
  assert.equal(result.estimatedGrandTotalUsd, null);
  assert.deepEqual(result.molecules, []);
  assert.ok(result.blockers.includes("catalogue_incomplet_pour_pays"));
});

test("missing one molecule closes the whole quote rather than pricing a partial stack", () => {
  const result = buildPeptidesPreview(peptidesPreviewInputSchema.parse({ ...base, secondaryGoals: ["libido"] }), [snapshot("KissPeptin-10", 31.19)], new Date().toISOString(), franceShipping);
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

test("a box of 10 is preferred when it adds stock for no more than fifteen percent extra", () => {
  const bpc = snapshot("BPC-157", 30, "10mg", "One Lab", 1);
  bpc.listings.push(snapshot("BPC-157", 100, "10mg", "One Lab", 10).listings[0]);
  const tb = snapshot("TB500", 20, "10mg", "One Lab", 1);
  const shipping: PeptauraShippingQuote[] = [{ supplier: "One Lab", displayName: "One Lab", available: true, minimumOrderUsd: null, tiers: [{ minOrderUsd: 0, maxOrderUsd: null, costUsd: 60, speed: "standard" }] }];
  const result = buildPeptidesPreview(peptidesPreviewInputSchema.parse({ ...base, primaryGoal: "recovery" }), [bpc, tb], new Date().toISOString(), shipping);
  const selected = result.molecules.find((molecule) => molecule.name === "BPC-157")!;
  assert.equal(selected.vialsRequired, 3);
  assert.equal(selected.vialsPurchased, 10);
  assert.equal(selected.estimatedTotalPriceUsd, 100);
  assert.deepEqual(selected.purchaseLines?.map((line) => ({ boxSize: line.boxSize, packages: line.packageCount })), [{ boxSize: 10, packages: 1 }]);
  assert.equal(result.estimatedShippingCostUsd, 60);
  assert.equal(result.shippingBreakdown.length, 1);
});

test("a same-format listing with the better quantity tier is not discarded", () => {
  const bpc = snapshot("BPC-157", 20, "10mg", "One Lab", 1);
  const tiered = snapshot("BPC-157", 30, "10mg", "One Lab", 1).listings[0];
  tiered.id = 9999;
  tiered.priceTiers = [{ minQty: 1, price: 30 }, { minQty: 3, price: 10 }];
  bpc.listings.push(tiered);
  const tb = snapshot("TB500", 20, "10mg", "One Lab", 1);
  const shipping: PeptauraShippingQuote[] = [{ supplier: "One Lab", displayName: "One Lab", available: true, minimumOrderUsd: null, tiers: [{ minOrderUsd: 0, maxOrderUsd: null, costUsd: 60, speed: "standard" }] }];
  const result = buildPeptidesPreview(peptidesPreviewInputSchema.parse({ ...base, primaryGoal: "recovery" }), [bpc, tb], new Date().toISOString(), shipping);
  const selected = result.molecules.find((molecule) => molecule.name === "BPC-157")!;
  assert.equal(selected.vialsPurchased, 3);
  assert.equal(selected.estimatedTotalPriceUsd, 30);
  assert.equal(selected.purchaseLines?.[0].packagePriceUsd, 10);
});

test("a mandatory box remains quotable and exposes the real purchased quantity", () => {
  const bpc = snapshot("BPC-157", 100, "10mg", "One Lab", 10);
  const tb = snapshot("TB500", 20, "10mg", "One Lab", 1);
  const shipping: PeptauraShippingQuote[] = [{ supplier: "One Lab", displayName: "One Lab", available: true, minimumOrderUsd: null, tiers: [{ minOrderUsd: 0, maxOrderUsd: null, costUsd: 60, speed: "standard" }] }];
  const result = buildPeptidesPreview(peptidesPreviewInputSchema.parse({ ...base, primaryGoal: "recovery" }), [bpc, tb], new Date().toISOString(), shipping);
  assert.equal(result.status, "eligible");
  const selected = result.molecules.find((molecule) => molecule.name === "BPC-157")!;
  assert.equal(selected.vialsRequired, 3);
  assert.equal(selected.vialsPurchased, 10);
  assert.equal(selected.packageCount, 1);
  assert.equal(selected.estimatedTotalPriceUsd, 100);
});

test("bulk and single SKUs can be combined instead of buying every vial singly", () => {
  const mots = snapshot("MOTS-c", 15, "20mg", "One Lab", 1);
  const ss = snapshot("SS-31", 29.91, "3mg", "One Lab", 1);
  ss.listings.push(snapshot("SS-31", 180, "3mg", "One Lab", 10).listings[0]);
  const shipping: PeptauraShippingQuote[] = [{ supplier: "One Lab", displayName: "One Lab", available: true, minimumOrderUsd: null, tiers: [{ minOrderUsd: 0, maxOrderUsd: null, costUsd: 60, speed: "standard" }] }];
  const result = buildPeptidesPreview(peptidesPreviewInputSchema.parse({ ...base, primaryGoal: "endurance" }), [mots, ss], new Date().toISOString(), shipping);
  const selected = result.molecules.find((molecule) => molecule.name === "SS-31")!;
  assert.equal(selected.vialsRequired, 24);
  assert.equal(selected.vialsPurchased, 30);
  assert.equal(selected.estimatedTotalPriceUsd, 540);
  assert.deepEqual(selected.purchaseLines?.map((line) => ({ boxSize: line.boxSize, packages: line.packageCount })), [{ boxSize: 10, packages: 3 }]);
  assert.equal(result.estimatedShippingCostUsd, 60);
  assert.equal(result.shippingBreakdown.length, 1);
});

test("the client UI defaults to France and advertises profile-driven counts", () => {
  const source = fs.readFileSync(new URL("../client/src/pages/PeptidesPreviewPage.tsx", import.meta.url), "utf8");
  assert.match(source, /country: "FR"/);
  assert.match(source, /une seule molécule ou plusieurs par axe/);
  assert.match(source, /12 semaines minimum/);
  assert.match(source, /Livraison · une seule fois/);
  assert.match(source, /livraison est comptée une seule fois pour la commande complète/i);
  assert.doesNotMatch(source, /m\.name|m\.doseSummary|m\.calculationBasis/);
});

test("identity, consent and incompatible conditions remain structurally validated", () => {
  assert.equal(peptidesPreviewInputSchema.safeParse({ ...base, email: "invalid" }).success, false);
  assert.equal(peptidesPreviewInputSchema.safeParse({ ...base, consent: false }).success, false);
  assert.equal(peptidesPreviewInputSchema.safeParse({ ...base, conditions: ["none", "hypertension"] }).success, false);
});
