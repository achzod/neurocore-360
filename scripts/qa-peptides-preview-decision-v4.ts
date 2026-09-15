import fs from "node:fs";
import { buildPeptidesPreview, peptidesPreviewInputSchema, type PeptidesPreviewInput } from "../server/peptidesPreview";
import type { PeptauraFeedProductSnapshot } from "../server/peptauraProductFeed";

const outputPath = process.argv[2];
if (!outputPath) throw new Error("Usage: tsx scripts/qa-peptides-preview-decision-v4.ts <output.json>");
const base = {
  firstName: "Audit", email: "audit@example.com", age: 36, weightKg: 82, heightCm: 180, sex: "male", bodyFatRange: "20-25",
  primaryGoal: "sleep", secondaryGoals: [], goalDetails: "Réveils nocturnes depuis plusieurs mois avec baisse nette de récupération et d’énergie en journée.",
  timeline: "8-12", recoveryScope: "not-applicable", glp1History: "not-applicable", cognitiveStress: "not-applicable",
  conditions: ["none"], bloodwork: "recent", bloodPressure: "normal", sleepHours: 6,
  injectionComfort: "comfortable", injectionFrequency: "twice-daily", refrigeration: "yes-private", experience: "none", trainingFrequency: "3-4",
  budgetTotalUsd: 400, country: "FR", medications: "aucun", allergies: "aucune", currentPeptides: "aucun", pastPeptides: "aucun",
  startWhen: "1-2weeks", consent: true, attribution: {},
};
function snapshot(name: string, dosage = "10mg", price = 20): PeptauraFeedProductSnapshot {
  return { slug: name, url: `https://supplier.invalid/${name}`, fetchedAt: new Date().toISOString(), live: true, source: "product_feed", sourceGeneratedAt: new Date().toISOString(), listings: [{ id: Math.random(), name, dosage, supplier: "Verified", supplierDisplayName: "Verified", outOfStock: false, form: name === "Semax" || name === "Selank" ? "nasal spray" : "vial", priceTiers: [{ price, minQty: 1 }], warehouse: "EU", shippingOptionCount: 1, orderingMode: "available", enabled: true, suspended: false, boxSize: 1, marginRate: 0, productUrl: `https://supplier.invalid/${name}` }] };
}
const catalog = [
  snapshot("BPC-157"), snapshot("TB500", "20mg"), snapshot("CJC-1295 (no DAC)", "5mg"), snapshot("Ipamorelin", "5mg"),
  snapshot("Semaglutide"), snapshot("DSIP", "5mg"), snapshot("Semax", "5mg"), snapshot("Selank", "5mg"), snapshot("PT-141"),
  snapshot("KissPeptin-10"), snapshot("GHK-Cu", "50mg"), snapshot("MOTS-c", "20mg"), snapshot("SS-31", "5mg"),
];
type Scenario = { id: string; patch: Record<string, unknown>; status: "eligible" | "review_required"; blocker?: string; blockers?: string[]; molecules?: string[]; next?: string };
const scenarios: Scenario[] = [
  { id: "sleep-baseline", patch: {}, status: "eligible", molecules: ["DSIP", "Selank"] },
  { id: "recovery-local", patch: { primaryGoal: "recovery", recoveryScope: "localized" }, status: "eligible", molecules: ["BPC-157", "TB500"] },
  { id: "recovery-multisite", patch: { primaryGoal: "recovery", recoveryScope: "multi-site" }, status: "eligible", molecules: ["BPC-157", "TB500"] },
  { id: "fatloss-never", patch: { primaryGoal: "fatloss", glp1History: "never" }, status: "eligible", molecules: ["Semaglutide", "MOTS-c"] },
  { id: "fatloss-tolerated", patch: { primaryGoal: "fatloss", glp1History: "tolerated" }, status: "eligible", molecules: ["Semaglutide", "MOTS-c"] },
  { id: "cognitive-moderate", patch: { primaryGoal: "cognitive", cognitiveStress: "moderate", injectionComfort: "refuse", injectionFrequency: "minimal", refrigeration: "no" }, status: "eligible", molecules: ["Semax", "Selank"] },
  { id: "cognitive-high", patch: { primaryGoal: "cognitive", cognitiveStress: "high" }, status: "eligible", molecules: ["Semax", "Selank"] },
  { id: "libido-normal-bp", patch: { primaryGoal: "libido" }, status: "eligible", molecules: ["PT-141", "KissPeptin-10"] },
  { id: "skin-hair", patch: { primaryGoal: "skin-hair" }, status: "eligible", molecules: ["GHK-Cu", "BPC-157"] },
  { id: "endurance-four", patch: { primaryGoal: "endurance", trainingFrequency: "3-4" }, status: "eligible", molecules: ["MOTS-c", "SS-31"] },
  { id: "endurance-five", patch: { primaryGoal: "endurance", trainingFrequency: "5plus" }, status: "eligible", molecules: ["MOTS-c", "SS-31"] },
  { id: "gh-recent", patch: { primaryGoal: "gh-antiaging" }, status: "eligible", molecules: ["CJC-1295 (no DAC)", "Ipamorelin"] },
  { id: "cancer", patch: { conditions: ["cancer"] }, status: "review_required", blocker: "cancer", next: "peptides_engine" },
  { id: "pregnancy", patch: { sex: "female", conditions: ["pregnant"] }, status: "review_required", blocker: "pregnant", next: "peptides_engine" },
  { id: "breastfeeding", patch: { sex: "female", conditions: ["breastfeeding"] }, status: "review_required", blocker: "breastfeeding", next: "peptides_engine" },
  { id: "cardiac", patch: { conditions: ["cardiac"] }, status: "review_required", blocker: "cardiac", next: "peptides_engine" },
  { id: "renal-hepatic", patch: { conditions: ["renal-hepatic"] }, status: "review_required", blocker: "renal-hepatic", next: "peptides_engine" },
  { id: "autoimmune", patch: { conditions: ["autoimmune"] }, status: "review_required", blocker: "maladie_autoimmune_a_integrer", next: "peptides_engine" },
  { id: "testo-no-blood", patch: { primaryGoal: "testo-boost", bloodwork: "never" }, status: "review_required", blocker: "bilan_hormonal_recent_requis", next: "peptides_engine" },
  { id: "testo-old-blood", patch: { primaryGoal: "testo-boost", bloodwork: "old" }, status: "review_required", blocker: "bilan_hormonal_recent_requis", next: "peptides_engine" },
  { id: "testo-values-missing", patch: { primaryGoal: "testo-boost", bloodwork: "recent" }, status: "review_required", blocker: "protocole_hpg_a_personnaliser", next: "peptides_engine" },
  { id: "gh-old-blood", patch: { primaryGoal: "gh-antiaging", bloodwork: "old" }, status: "review_required", blocker: "bilan_gh_recent_requis", next: "peptides_engine" },
  { id: "libido-high-bp", patch: { primaryGoal: "libido", bloodPressure: "high" }, status: "review_required", blocker: "pression_arterielle_a_verifier" },
  { id: "libido-unknown-bp", patch: { primaryGoal: "libido", bloodPressure: "unknown" }, status: "review_required", blocker: "pression_arterielle_a_verifier" },
  { id: "fatloss-diabetes", patch: { primaryGoal: "fatloss", glp1History: "never", conditions: ["diabetes"] }, status: "review_required", blocker: "profil_glycemique_a_revoir" },
  { id: "fatloss-thyroid", patch: { primaryGoal: "fatloss", glp1History: "never", conditions: ["thyroid"] }, status: "review_required", blocker: "thyroide_a_preciser_avant_glp1" },
  { id: "fatloss-current-glp1", patch: { primaryGoal: "fatloss", glp1History: "current" }, status: "review_required", blocker: "historique_glp1_a_revoir" },
  { id: "fatloss-side-effects", patch: { primaryGoal: "fatloss", glp1History: "stopped-side-effects" }, status: "review_required", blocker: "historique_glp1_a_revoir" },
  { id: "fatloss-underweight", patch: { primaryGoal: "fatloss", glp1History: "never", weightKg: 50, heightCm: 180 }, status: "review_required", blocker: "imc_bas_incompatible_avec_preselection_fatloss" },
  { id: "fatloss-low-bodyfat", patch: { primaryGoal: "fatloss", glp1History: "never", bodyFatRange: "under10" }, status: "review_required", blocker: "composition_basse_a_revoir_fatloss" },
  { id: "injections-refused", patch: { primaryGoal: "recovery", recoveryScope: "localized", injectionComfort: "refuse" }, status: "review_required", blocker: "injections_refusees" },
  { id: "cold-storage-missing", patch: { primaryGoal: "recovery", recoveryScope: "localized", refrigeration: "no" }, status: "review_required", blocker: "stockage_froid_indisponible" },
  { id: "active-stack", patch: { currentPeptides: "BPC-157 250 mcg deux fois par jour" }, status: "review_required", blocker: "stack_actuel_a_integrer" },
  { id: "past-side-effect", patch: { pastPeptides: "Semax arrêté pour céphalées" }, status: "review_required", blocker: "historique_peptides_a_interpreter" },
  { id: "medicine", patch: { medications: "lévothyroxine 75 mcg" }, status: "review_required", blocker: "medicaments_a_integrer" },
  { id: "allergy", patch: { allergies: "alcool benzylique" }, status: "review_required", blocker: "allergies_a_integrer" },
  { id: "frequency-mismatch", patch: { primaryGoal: "recovery", recoveryScope: "localized", injectionFrequency: "weekly" }, status: "review_required", blocker: "frequence_administration_incompatible" },
  { id: "testo-plus-medicine", patch: { primaryGoal: "testo-boost", bloodwork: "never", medications: "lévothyroxine 75 mcg" }, status: "review_required", blockers: ["bilan_hormonal_recent_requis", "medicaments_a_integrer"], next: "peptides_engine" },
];
const results = scenarios.map((scenario) => {
  const input = peptidesPreviewInputSchema.parse({ ...base, ...scenario.patch }) as PeptidesPreviewInput;
  const result = buildPeptidesPreview(input, catalog);
  const failures: string[] = [];
  if (result.status !== scenario.status) failures.push(`status=${result.status}`);
  if (scenario.blocker && (result.blockers.length !== 1 || result.blockers[0] !== scenario.blocker)) failures.push(`blockers=${result.blockers.join(",")}`);
  if (scenario.blockers && JSON.stringify(result.blockers) !== JSON.stringify(scenario.blockers)) failures.push(`blockers=${result.blockers.join(",")}`);
  if (scenario.molecules && JSON.stringify(result.molecules.map((molecule) => molecule.name)) !== JSON.stringify(scenario.molecules)) failures.push(`molecules=${result.molecules.map((molecule) => molecule.name).join(",")}`);
  if (scenario.next && result.nextStep !== scenario.next) failures.push(`next=${result.nextStep}`);
  if (result.nextStep !== "peptides_engine") failures.push(`conversion diverted to ${result.nextStep}`);
  if (result.requiredMarkers.length) failures.push("unexpected bloodwork markers");
  if (!/Débloque Peptides Engine/.test(result.nextStepExplanation)) failures.push("missing direct purchase direction");
  if (/Blood Analysis|marqueurs à vérifier|fournir des informations|validation médicale/i.test([result.headline, result.rationale, result.nextStepExplanation].join(" "))) failures.push("medical or intermediate-step diversion");
  if (!result.analysisPoints.length || !result.rationale || !result.nextStepExplanation) failures.push("decision explanation incomplete");
  if (/Au moins une réponse|L'algorithme|_a_|review_required/.test([result.rationale, ...result.analysisPoints].join(" "))) failures.push("generic or technical copy");
  const reserveMissing = result.molecules.some((molecule) => molecule.vialsRequired < molecule.operationalVials || molecule.vialsPurchased !== molecule.vialsRequired || molecule.vialsPurchased * molecule.vialStrengthMg + 1e-9 < molecule.totalRequiredMg * 1.2 || molecule.safetyReserveVials !== molecule.vialsPurchased - molecule.operationalVials);
  if (result.status === "review_required" && (result.moleculeCount < 2 || result.moleculeCount > 4 || typeof result.estimatedGrandTotalUsd !== "number" || result.durationLabel !== "12 semaines" || result.totalVialsRequired == null || reserveMissing)) failures.push("personalized estimate missing 2-4 molecules, twelve-week duration, reserve vials or cost");
  if (result.status === "eligible" && (result.molecules.length < 2 || result.molecules.length > 4 || result.durationLabel !== "12 semaines" || result.totalVialsRequired == null || reserveMissing || result.molecules.some((molecule) => molecule.calculationBasis.length < 20))) failures.push("eligible estimate missing 2-4 molecules, twelve-week math or reserve vials");
  return { id: scenario.id, status: result.status, nextStep: result.nextStep, blockers: result.blockers, molecules: result.molecules.map((molecule) => molecule.name), failures };
});
const report = { status: results.every((result) => result.failures.length === 0) ? "PASS" : "FAIL", scenarioCount: results.length, eligible: results.filter((result) => result.status === "eligible").length, review: results.filter((result) => result.status === "review_required").length, results };
fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
console.log(JSON.stringify({ status: report.status, scenarioCount: report.scenarioCount, eligible: report.eligible, review: report.review, failed: results.filter((result) => result.failures.length).map((result) => ({ id: result.id, failures: result.failures })) }, null, 2));
if (report.status !== "PASS") process.exit(1);
