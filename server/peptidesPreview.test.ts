import assert from "node:assert/strict";
import test from "node:test";
import { buildPeptidesPreview, peptidesPreviewInputSchema } from "./peptidesPreview";
import type { PeptauraFeedProductSnapshot } from "./peptauraProductFeed";
import type { PeptauraShippingQuote } from "./peptauraShipping";

const base = {
  firstName: "Alex",
  email: "alex@example.com",
  age: 32,
  weightKg: 82,
  heightCm: 182,
  sex: "male",
  bodyFatRange: "15-20",
  primaryGoal: "fatloss",
  secondaryGoals: [],
  goalDetails: "Perdre huit kilos tout en gardant ma masse musculaire.",
  timeline: "8-12",
  recoveryScope: "multi-site",
  glp1History: "never",
  cognitiveStress: "high",
  conditions: ["none"],
  bloodwork: "recent",
  bloodPressure: "normal",
  sleepHours: 7,
  injectionComfort: "possible",
  injectionFrequency: "twice-daily",
  refrigeration: "yes-private",
  experience: "read",
  trainingFrequency: "5plus",
  budgetTotalUsd: 200,
  country: "FR",
  medications: "aucun",
  allergies: "aucune",
  currentPeptides: "aucun",
  pastPeptides: "aucun",
  startWhen: "1-2weeks",
  consent: true,
  attribution: {},
} as const;

function snapshot(
  name: string,
  price: number,
  dosage = "10mg",
  supplier = "Verified",
  boxSize = 1,
): PeptauraFeedProductSnapshot {
  return {
    slug: name,
    url: `https://www.peptaura.com/catalog/${name}`,
    fetchedAt: "2026-09-14T03:00:00.000Z",
    live: true,
    source: "product_feed",
    sourceGeneratedAt: "2026-09-14T02:59:00.000Z",
    listings: [{
      id: Math.round(price * 100), name, dosage, supplier, supplierDisplayName: supplier,
      outOfStock: false, form: "vial", priceTiers: [{ price, minQty: 1 }], warehouse: "EU",
      shippingOptionCount: 1, orderingMode: "available", enabled: true, suspended: false,
      boxSize, marginRate: 0, productUrl: `https://www.peptaura.com/product/${Math.round(price * 100)}-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    }],
  };
}

test("preview prices complete protocol quantities instead of one starter package", () => {
  const input = peptidesPreviewInputSchema.parse({ ...base, secondaryGoals: ["recovery"] });
  const result = buildPeptidesPreview(input, [snapshot("Semaglutide", 35), snapshot("BPC-157", 15)], "2026-09-14T03:00:00.000Z");
  assert.equal(result.status, "eligible");
  assert.deepEqual(result.molecules.map((item) => item.name), ["Semaglutide", "BPC-157"]);
  assert.equal(result.estimatedProtocolCostUsd, 80);
  assert.equal(result.estimatedStarterCostUsd, 50);
  assert.equal(result.totalVialsRequired, 4);
  assert.equal(result.molecules[1].vialsRequired, 3);
  assert.equal(result.molecules[1].totalRequiredMg, 28);
});

test("hard-risk profiles do not receive molecule suggestions", () => {
  const input = peptidesPreviewInputSchema.parse({ ...base, conditions: ["cancer"] });
  const result = buildPeptidesPreview(input, [snapshot("Semaglutide", 35)]);
  assert.equal(result.status, "review_required");
  assert.equal(result.moleculeCount, 1);
  assert.equal(result.estimatedProtocolCostUsd, 35);
  assert.equal(result.nextStep, "peptides_engine");
});

test("testosterone preview converts directly to Peptides Engine without recent bloodwork", () => {
  const input = peptidesPreviewInputSchema.parse({ ...base, primaryGoal: "testo-boost", bloodwork: "old" });
  const result = buildPeptidesPreview(input, [snapshot("KissPeptin-10", 30)]);
  assert.equal(result.status, "review_required");
  assert.equal(result.nextStep, "peptides_engine");
  assert.ok(result.blockers.includes("bilan_hormonal_recent_requis"));
});

test("recent bloodwork still requires a personalized HPG protocol before pricing", () => {
  const input = peptidesPreviewInputSchema.parse({ ...base, primaryGoal: "testo-boost", bloodwork: "recent" });
  const result = buildPeptidesPreview(input, [snapshot("KissPeptin-10", 30)]);
  assert.equal(result.status, "review_required");
  assert.equal(result.nextStep, "peptides_engine");
  assert.ok(result.blockers.includes("protocole_hpg_a_personnaliser"));
});

test("a secondary testosterone goal is also blocked without recent bloodwork", () => {
  const input = peptidesPreviewInputSchema.parse({ ...base, secondaryGoals: ["testo-boost"], bloodwork: "never" });
  const result = buildPeptidesPreview(input, [snapshot("Semaglutide", 35), snapshot("KissPeptin-10", 30)]);
  assert.equal(result.status, "review_required");
  assert.equal(result.nextStep, "peptides_engine");
});

test("preview converts to Peptides Engine instead of exposing a partial price when one product is unavailable", () => {
  const input = peptidesPreviewInputSchema.parse({ ...base, primaryGoal: "recovery" });
  const result = buildPeptidesPreview(input, [snapshot("BPC-157", 15)]);
  assert.equal(result.status, "review_required");
  assert.equal(result.estimatedProtocolCostUsd, null);
  assert.deepEqual(result.molecules, []);
  assert.ok(result.blockers.includes("catalogue_incomplet_pour_pays"));
  assert.ok(result.analysisPoints.some((point) => /liste d’achat complète.*livrables/.test(point)));
  assert.doesNotMatch(result.rationale, /Au moins une réponse/);
});

test("none cannot be combined with a medical condition", () => {
  assert.equal(peptidesPreviewInputSchema.safeParse({ ...base, conditions: ["none", "hypertension"] }).success, false);
});

test("all public goals resolve to a priced plan or an explicit HPG review", () => {
  const catalog = [
    snapshot("BPC-157", 15), snapshot("TB500", 20), snapshot("CJC-1295 (no DAC)", 18, "5mg"), snapshot("Ipamorelin", 17, "5mg"),
    snapshot("Semaglutide", 35), snapshot("DSIP", 12, "5mg"), snapshot("Semax", 14, "5mg"), snapshot("Selank", 13, "5mg"),
    snapshot("PT-141", 21), snapshot("KissPeptin-10", 30), snapshot("GHK-Cu", 16), snapshot("MOTS-c", 24), snapshot("SS-31", 19),
  ];
  const expected: Record<string, number> = { recovery: 2, "gh-antiaging": 2, fatloss: 1, sleep: 1, cognitive: 2, libido: 1, "testo-boost": 1, "skin-hair": 1, endurance: 2 };
  for (const [primaryGoal, count] of Object.entries(expected)) {
    const input = peptidesPreviewInputSchema.parse({ ...base, primaryGoal, bloodwork: "recent" });
    const result = buildPeptidesPreview(input, catalog);
    assert.equal(result.moleculeCount, count, primaryGoal);
    assert.equal(result.molecules.length, count, primaryGoal);
    assert.equal(result.status, primaryGoal === "testo-boost" ? "review_required" : "eligible", primaryGoal);
  }
});

test("shipping filtering cannot use a non-deliverable listing", () => {
  const input = peptidesPreviewInputSchema.parse(base);
  const catalog = [snapshot("Semaglutide", 20, "5mg", "Blocked Lab"), snapshot("Semaglutide", 35, "10mg", "Deliverable Lab")];
  const result = buildPeptidesPreview(input, catalog, new Date().toISOString(), ["deliverable-lab"]);
  assert.equal(result.estimatedProtocolCostUsd, 35);
  assert.equal(result.molecules[0].startingFormat, "10mg · boîte de 1");
});

test("budget fit uses the full protocol total", () => {
  const input = peptidesPreviewInputSchema.parse({ ...base, primaryGoal: "recovery", budgetTotalUsd: 99.99 });
  const result = buildPeptidesPreview(input, [snapshot("BPC-157", 70), snapshot("TB500", 60)]);
  assert.equal(result.estimatedProtocolCostUsd, 330);
  assert.equal(result.budgetFit, "above");
});

test("refusing injections routes non-cognitive profiles to review", () => {
  const input = peptidesPreviewInputSchema.parse({ ...base, injectionComfort: "refuse" });
  const result = buildPeptidesPreview(input, [snapshot("Semaglutide", 35)]);
  assert.equal(result.status, "review_required");
  assert.ok(result.blockers.includes("injections_refusees"));
});

test("secondary libido and fat-loss goals inherit compatibility checks", () => {
  const hypertension = peptidesPreviewInputSchema.parse({ ...base, primaryGoal: "sleep", secondaryGoals: ["libido"], conditions: ["hypertension"] });
  assert.ok(buildPeptidesPreview(hypertension, [snapshot("DSIP", 12), snapshot("PT-141", 21)]).blockers.includes("pression_arterielle_a_verifier"));
  const diabetes = peptidesPreviewInputSchema.parse({ ...base, primaryGoal: "sleep", secondaryGoals: ["fatloss"], conditions: ["diabetes"] });
  assert.ok(buildPeptidesPreview(diabetes, [snapshot("DSIP", 12), snapshot("Semaglutide", 35)]).blockers.includes("profil_glycemique_a_revoir"));
});

test("GH-axis assumptions use the conservative eight-week canonical basis", () => {
  const input = peptidesPreviewInputSchema.parse({ ...base, primaryGoal: "gh-antiaging" });
  const result = buildPeptidesPreview(input, [
    snapshot("CJC-1295 (no DAC)", 25, "5mg"),
    snapshot("Ipamorelin", 12, "5mg"),
  ]);
  assert.deepEqual(result.molecules.map((item) => ({
    name: item.name,
    needMg: item.totalRequiredMg,
    vials: item.vialsRequired,
    basis: item.calculationBasis,
  })), [
    { name: "CJC-1295 (no DAC)", needMg: 4, vials: 2, basis: "100 mcg × 5 administrations par semaine × 8 semaines = 4 mg au total" },
    { name: "Ipamorelin", needMg: 4, vials: 2, basis: "100 mcg × 5 administrations par semaine × 8 semaines = 4 mg au total" },
  ]);
});

test("cognitive plus sleep exposes four-week vials and full live purchase cost", () => {
  const input = peptidesPreviewInputSchema.parse({ ...base, primaryGoal: "cognitive", secondaryGoals: ["sleep"] });
  const result = buildPeptidesPreview(input, [
    snapshot("Semax", 13.44, "5mg"),
    snapshot("Selank", 12.97, "5mg"),
    snapshot("DSIP", 13.95, "5mg"),
  ]);
  assert.equal(result.estimatedProtocolCostUsd, 79.23);
  assert.equal(result.totalVialsRequired, 6);
  assert.equal(result.totalVialsPurchased, 6);
  assert.equal(result.totalPackages, 6);
  assert.deepEqual(result.molecules.map((item) => ({
    name: item.name,
    duration: item.cycleDurationLabel,
    vials: item.vialsRequired,
    total: item.estimatedTotalPriceUsd,
  })), [
    { name: "Semax", duration: "4 semaines", vials: 3, total: 40.32 },
    { name: "Selank", duration: "4 semaines", vials: 3, total: 38.91 },
  ]);
});

test("secondary goals are explained as secondary and never mislabeled as the primary goal", () => {
  const input = peptidesPreviewInputSchema.parse({ ...base, primaryGoal: "fatloss", secondaryGoals: ["recovery"] });
  const result = buildPeptidesPreview(input, [snapshot("Semaglutide", 35), snapshot("BPC-157", 15)]);
  assert.match(result.molecules[0].reason, /IMC 24\.8.*historique GLP-1/);
  assert.match(result.molecules[1].reason, /La récupération fait partie de tes priorités/);
  assert.doesNotMatch(result.molecules[1].reason, /objectif principal concerne la récupération/);
});

test("budget explanation states whether the complete protocol fits the declared ceiling", () => {
  const input = peptidesPreviewInputSchema.parse({ ...base, primaryGoal: "recovery", budgetTotalUsd: 99.99 });
  const result = buildPeptidesPreview(input, [snapshot("BPC-157", 70), snapshot("TB500", 60)]);
  assert.equal(result.budgetFit, "above");
  assert.match(result.budgetExplanation, /\$330\.00 dépasse ton budget total déclaré de \$99\.99/);
});

test("the under-100 budget boundary treats exactly $100.00 as above", () => {
  const input = peptidesPreviewInputSchema.parse({ ...base, primaryGoal: "sleep", budgetTotalUsd: 99.99 });
  const result = buildPeptidesPreview(input, [snapshot("DSIP", 100, "5mg")]);
  assert.equal(result.estimatedProtocolCostUsd, 100);
  assert.equal(result.budgetFit, "above");
});

test("landed-cost optimization includes shipping once per supplier and can reject a cheaper sticker price", () => {
  const input = peptidesPreviewInputSchema.parse({ ...base, primaryGoal: "recovery", secondaryGoals: [], budgetTotalUsd: 500 });
  const bpc = snapshot("BPC-157", 30, "10mg", "One Lab");
  bpc.listings.push(snapshot("BPC-157", 20, "10mg", "Cheap Lab").listings[0]);
  const tb = snapshot("TB500", 30, "20mg", "One Lab");
  tb.listings.push(snapshot("TB500", 20, "20mg", "Cheap Lab").listings[0]);
  const shipping: PeptauraShippingQuote[] = [
    { supplier: "One Lab", displayName: "One Lab", available: true, minimumOrderUsd: null, tiers: [{ minOrderUsd: 0, maxOrderUsd: null, costUsd: 10, speed: "fast" }] },
    { supplier: "Cheap Lab", displayName: "Cheap Lab", available: true, minimumOrderUsd: null, tiers: [{ minOrderUsd: 0, maxOrderUsd: null, costUsd: 70, speed: "slow" }] },
  ];
  const result = buildPeptidesPreview(input, [bpc, tb], "2026-09-15T02:30:00.000Z", shipping);
  assert.equal(result.status, "eligible");
  assert.deepEqual(result.molecules.map((item) => item.supplier), ["One Lab", "One Lab"]);
  assert.equal(result.estimatedProtocolCostUsd, 120);
  assert.equal(result.estimatedShippingCostUsd, 10);
  assert.equal(result.estimatedGrandTotalUsd, 130);
  assert.equal(result.shippingBreakdown.length, 1);
});

test("declared medicines and incompatible administration frequency fail closed", () => {
  const medicine = peptidesPreviewInputSchema.parse({ ...base, medications: "metformine 500 mg" });
  assert.ok(buildPeptidesPreview(medicine, [snapshot("Semaglutide", 35)]).blockers.includes("medicaments_a_integrer"));
  const frequency = peptidesPreviewInputSchema.parse({ ...base, primaryGoal: "recovery", injectionFrequency: "weekly" });
  assert.ok(buildPeptidesPreview(frequency, [snapshot("BPC-157", 35), snapshot("TB500", 35)]).blockers.includes("frequence_administration_incompatible"));
});

test("identity and consent validation rejects incomplete leads", () => {
  assert.equal(peptidesPreviewInputSchema.safeParse({ ...base, email: "invalid" }).success, false);
  assert.equal(peptidesPreviewInputSchema.safeParse({ ...base, age: 17 }).success, false);
  assert.equal(peptidesPreviewInputSchema.safeParse({ ...base, consent: false }).success, false);
  assert.equal(peptidesPreviewInputSchema.safeParse({ ...base, goalDetails: "trop court" }).success, false);
});
