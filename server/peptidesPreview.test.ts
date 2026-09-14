import assert from "node:assert/strict";
import test from "node:test";
import { buildPeptidesPreview, peptidesPreviewInputSchema } from "./peptidesPreview";
import type { PeptauraFeedProductSnapshot } from "./peptauraProductFeed";

const base = {
  firstName: "Alex",
  email: "alex@example.com",
  age: 32,
  weightKg: 82,
  primaryGoal: "fatloss",
  secondaryGoals: [],
  conditions: ["none"],
  bloodwork: "recent",
  injectionComfort: "possible",
  experience: "read",
  budget: "100-200",
  country: "FR",
  medications: "",
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
  assert.equal(result.moleculeCount, 0);
  assert.equal(result.estimatedProtocolCostUsd, null);
  assert.equal(result.nextStep, "manual_review");
});

test("testosterone preview routes to blood analysis without recent bloodwork", () => {
  const input = peptidesPreviewInputSchema.parse({ ...base, primaryGoal: "testo-boost", bloodwork: "old" });
  const result = buildPeptidesPreview(input, [snapshot("KissPeptin-10", 30)]);
  assert.equal(result.status, "review_required");
  assert.equal(result.nextStep, "blood_analysis");
  assert.ok(result.blockers.includes("bilan_hormonal_recent_requis"));
});

test("recent bloodwork still requires a personalized HPG protocol before pricing", () => {
  const input = peptidesPreviewInputSchema.parse({ ...base, primaryGoal: "testo-boost", bloodwork: "recent" });
  const result = buildPeptidesPreview(input, [snapshot("KissPeptin-10", 30)]);
  assert.equal(result.status, "review_required");
  assert.equal(result.nextStep, "manual_review");
  assert.ok(result.blockers.includes("protocole_hpg_a_personnaliser"));
});

test("a secondary testosterone goal is also blocked without recent bloodwork", () => {
  const input = peptidesPreviewInputSchema.parse({ ...base, secondaryGoals: ["testo-boost"], bloodwork: "never" });
  const result = buildPeptidesPreview(input, [snapshot("Semaglutide", 35), snapshot("KissPeptin-10", 30)]);
  assert.equal(result.status, "review_required");
  assert.equal(result.nextStep, "blood_analysis");
});

test("preview explains the review path instead of exposing a partial price when one product is unavailable", () => {
  const input = peptidesPreviewInputSchema.parse({ ...base, primaryGoal: "recovery" });
  const result = buildPeptidesPreview(input, [snapshot("BPC-157", 15)]);
  assert.equal(result.status, "review_required");
  assert.equal(result.estimatedProtocolCostUsd, null);
  assert.deepEqual(result.molecules, []);
  assert.ok(result.blockers.includes("catalogue_incomplet_pour_pays"));
  assert.match(result.headline, /prix incomplet/);
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
  const expected: Record<string, number> = { recovery: 2, "gh-antiaging": 2, fatloss: 1, sleep: 1, cognitive: 2, libido: 1, "testo-boost": 0, "skin-hair": 1, endurance: 2 };
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
  const input = peptidesPreviewInputSchema.parse({ ...base, primaryGoal: "recovery", budget: "under100" });
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
    { name: "CJC-1295 (no DAC)", needMg: 4, vials: 1, basis: "100 mcg, 5 fois/semaine × 8 semaines = 4 mg" },
    { name: "Ipamorelin", needMg: 4, vials: 1, basis: "100 mcg, 5 fois/semaine × 8 semaines = 4 mg" },
  ]);
});

test("cognitive plus sleep exposes four-week vials and full live purchase cost", () => {
  const input = peptidesPreviewInputSchema.parse({ ...base, primaryGoal: "cognitive", secondaryGoals: ["sleep"] });
  const result = buildPeptidesPreview(input, [
    snapshot("Semax", 13.44, "5mg"),
    snapshot("Selank", 12.97, "5mg"),
    snapshot("DSIP", 13.95, "5mg"),
  ]);
  assert.equal(result.estimatedProtocolCostUsd, 93.18);
  assert.equal(result.totalVialsRequired, 7);
  assert.equal(result.totalVialsPurchased, 7);
  assert.equal(result.totalPackages, 7);
  assert.deepEqual(result.molecules.map((item) => ({
    name: item.name,
    duration: item.cycleDurationLabel,
    vials: item.vialsRequired,
    total: item.estimatedTotalPriceUsd,
  })), [
    { name: "Semax", duration: "4 semaines", vials: 3, total: 40.32 },
    { name: "Selank", duration: "4 semaines", vials: 3, total: 38.91 },
    { name: "DSIP", duration: "4 semaines", vials: 1, total: 13.95 },
  ]);
});

test("secondary goals are explained as secondary and never mislabeled as the primary goal", () => {
  const input = peptidesPreviewInputSchema.parse({ ...base, primaryGoal: "fatloss", secondaryGoals: ["recovery"] });
  const result = buildPeptidesPreview(input, [snapshot("Semaglutide", 35), snapshot("BPC-157", 15)]);
  assert.match(result.molecules[0].reason, /priorité principale/);
  assert.match(result.molecules[1].reason, /objectif secondaire/);
  assert.doesNotMatch(result.molecules[1].reason, /objectif principal concerne la récupération/);
});

test("budget explanation states whether the complete protocol fits the declared ceiling", () => {
  const input = peptidesPreviewInputSchema.parse({ ...base, primaryGoal: "recovery", budget: "under100" });
  const result = buildPeptidesPreview(input, [snapshot("BPC-157", 70), snapshot("TB500", 60)]);
  assert.equal(result.budgetFit, "above");
  assert.match(result.budgetExplanation, /\$330\.00 ne tient pas dans ton budget déclaré de moins de 100 USD/);
});

test("the under-100 budget boundary treats exactly $100.00 as above", () => {
  const input = peptidesPreviewInputSchema.parse({ ...base, primaryGoal: "sleep", budget: "under100" });
  const result = buildPeptidesPreview(input, [snapshot("DSIP", 100, "5mg")]);
  assert.equal(result.estimatedProtocolCostUsd, 100);
  assert.equal(result.budgetFit, "above");
});

test("identity and consent validation rejects incomplete leads", () => {
  assert.equal(peptidesPreviewInputSchema.safeParse({ ...base, email: "invalid" }).success, false);
  assert.equal(peptidesPreviewInputSchema.safeParse({ ...base, age: 17 }).success, false);
  assert.equal(peptidesPreviewInputSchema.safeParse({ ...base, consent: false }).success, false);
});
