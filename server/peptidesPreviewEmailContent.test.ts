import assert from "node:assert/strict";
import test from "node:test";
import {
  buildPeptidesPreviewAdminNotificationContent,
  buildPeptidesPreviewDestinationPath,
  buildPeptidesPreviewResultEmailContent,
  type PeptidesPreviewEmailInput,
  type PeptidesPreviewEmailResult,
} from "./peptidesPreviewEmailContent";

const input: PeptidesPreviewEmailInput = {
  firstName: "Marc",
  email: "marc@example.com",
  age: 36,
  weightKg: 84,
  heightCm: 181,
  sex: "male",
  bodyFatRange: "15-20",
  primaryGoal: "recovery",
  secondaryGoals: ["sleep"],
  goalDetails: "Douleur rotulienne localisée depuis huit semaines et sommeil fragmenté.",
  timeline: "8-12",
  recoveryScope: "localized",
  glp1History: "not-applicable",
  cognitiveStress: "not-applicable",
  conditions: ["none"],
  bloodwork: "recent",
  bloodPressure: "normal",
  sleepHours: 6.5,
  medications: "aucun",
  allergies: "aucune",
  injectionComfort: "comfortable",
  injectionFrequency: "twice-daily",
  refrigeration: "yes-private",
  experience: "none",
  trainingFrequency: "3-4",
  budgetTotalUsd: 300,
  currentPeptides: "aucun",
  pastPeptides: "aucun",
  startWhen: "1-2weeks",
  country: "FR",
};

const eligible: PeptidesPreviewEmailResult = {
  status: "eligible",
  moleculeCount: 2,
  headline: "Une présélection cohérente avec ta récupération",
  rationale: "La récupération locale reste prioritaire et le sommeil soutient la progression.",
  analysisPoints: ["Une zone prioritaire a été déclarée.", "Le scénario reste limité à un axe principal."],
  requiredMarkers: [],
  nextStepExplanation: "Peptides Engine finalise le calendrier et la liste d’achat.",
  budgetExplanation: "Le cycle complet reste dans ton budget avec la livraison incluse.",
  quoteExplanation: "Prix live vérifiés.",
  molecules: [{
    name: "KissPeptin-10",
    supplier: "Supplier Secret",
    productUrl: "https://supplier.invalid/product",
    role: "Axe testostérone",
    reason: "Cible le besoin principal déclaré.",
    doseSummary: "200 mcg, trois fois par semaine",
    administrationCount: 36,
    startingFormat: "10 mg",
    startingPackagePriceUsd: 31.19,
    cycleDurationLabel: "12 semaines",
    calculationBasis: "200 mcg × 3 administrations par semaine × 12 semaines = 7.2 mg",
    totalRequiredMg: 7.2,
    bufferedRequiredMg: 8.64,
    purchasedCapacityMg: 20,
    reserveCapacityMg: 12.8,
    vialStrengthMg: 10,
    mathematicalVials: 1,
    operationalVials: 1,
    safetyReserveVials: 1,
    vialsRequired: 2,
    vialsPurchased: 2,
    packageCount: 2,
    estimatedTotalPriceUsd: 62.38,
  }, {
    name: "PT-141", supplier: "Supplier Secret", productUrl: "https://supplier.invalid/product-2", role: "Support libido", reason: "Complète le premier axe.",
    doseSummary: "1 mg, une fois par semaine", administrationCount: 12, startingFormat: "10 mg", startingPackagePriceUsd: 20.03,
    cycleDurationLabel: "12 semaines", calculationBasis: "1 mg × 1 administration par semaine × 12 semaines = 12 mg", totalRequiredMg: 12,
    bufferedRequiredMg: 14.4, purchasedCapacityMg: 30, reserveCapacityMg: 18,
    vialStrengthMg: 10, mathematicalVials: 2, operationalVials: 2, safetyReserveVials: 1, vialsRequired: 3, vialsPurchased: 3, packageCount: 3, estimatedTotalPriceUsd: 60.09,
  }],
  estimatedStarterCostUsd: 51.22,
  estimatedProtocolCostUsd: 122.47,
  estimatedShippingCostUsd: 60,
  estimatedGrandTotalUsd: 182.47,
  monthlyEquivalentUsd: 60.82,
  shippingBreakdown: [{ supplier: "Supplier Secret", subtotalUsd: 122.47, shippingUsd: 60, speed: "7 à 14 jours" }],
  totalVialsRequired: 5,
  totalVialsPurchased: 5,
  totalPackages: 5,
  durationLabel: "12 semaines",
  budgetFit: "within",
  blockers: [],
  nextStep: "peptides_engine",
};

function personalized(blocker: string): PeptidesPreviewEmailResult {
  return {
    ...eligible,
    status: "review_required",
    headline: "Ton profil mérite une stratégie Peptides Engine construite sur mesure",
    rationale: "Le pré-calcul transforme tes réponses en règles de personnalisation pour l’analyse complète.",
    analysisPoints: [blocker === "bilan_hormonal_recent_requis" ? "Fatigue et libido basse orientent la personnalisation de l’axe testostérone." : "Le traitement déclaré sera intégré directement aux règles de sélection."],
    requiredMarkers: [],
    nextStepExplanation: "Débloque Peptides Engine maintenant avec les informations déjà fournies, sans étape intermédiaire.",
    budgetExplanation: "Le devis final sera construit dans Peptides Engine.",
    quoteExplanation: "La liste d’achat complète sera finalisée dans Peptides Engine.",
    molecules: [],
    estimatedStarterCostUsd: null,
    estimatedProtocolCostUsd: null,
    estimatedShippingCostUsd: null,
    estimatedGrandTotalUsd: null,
    monthlyEquivalentUsd: null,
    shippingBreakdown: [],
    totalVialsRequired: null,
    totalVialsPurchased: null,
    totalPackages: null,
    budgetFit: "unknown",
    blockers: [blocker],
    nextStep: "peptides_engine",
  };
}

test("eligible client receives the direct recommendation, arithmetic, landed quote and CTA", () => {
  const content = buildPeptidesPreviewResultEmailContent(input, eligible, "/peptides-engine?tier=solo", "https://apexlabs.test");
  assert.match(content.subject, /estimation Peptides Engine.*2 molécules.*12 semaines.*\$182\.47/);
  for (const expected of [input.goalDetails, "Nombre de molécules", "Durée de la stratégie", "$122.47", "$60.00", "$182.47", "marge de 20 %", "protocole plus poussé et plus précis"]) {
    assert.match(content.html, new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.match(content.text, new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.doesNotMatch(content.html, /KissPeptin-10|PT-141|200 mcg|1 mg|Dose de référence/);
  assert.doesNotMatch(content.text, /KissPeptin-10|PT-141|200 mcg|1 mg|Dose de référence/);
  assert.match(content.html, /Débloquer mon analyse Peptides Engine/);
  assert.match(content.text, /https:\/\/apexlabs\.test\/peptides-engine\?tier=solo/);
  assert.doesNotMatch(content.html, /Supplier Secret|supplier\.invalid/);
  assert.doesNotMatch(content.text, /Supplier Secret|supplier\.invalid/);
});

test("personalized profile converts directly to Peptides Engine without another step", () => {
  const content = buildPeptidesPreviewResultEmailContent(input, personalized("medicaments_a_integrer"), buildPeptidesPreviewDestinationPath("peptides_engine", "email"), "https://apexlabs.test");
  assert.match(content.subject, /estimation Peptides Engine.*2 molécules.*12 semaines/);
  assert.match(content.html, /traitement déclaré sera intégré directement/);
  assert.match(content.text, /Débloque Peptides Engine maintenant/);
  assert.match(content.html, /Débloquer mon analyse Peptides Engine/);
  assert.match(content.text, /\/peptides-engine\?tier=solo.*utm_source=peptides_preview_email/);
  assert.doesNotMatch(content.html, /À valider|Blood Analysis|marqueurs à vérifier|validation|BPC-157|250 mcg/);
  assert.doesNotMatch(content.text, /À valider|Blood Analysis|informations supplémentaires|BPC-157|250 mcg/);
});

test("testosterone profile is not diverted to blood analysis", () => {
  const content = buildPeptidesPreviewResultEmailContent(input, personalized("bilan_hormonal_recent_requis"), buildPeptidesPreviewDestinationPath("blood_analysis", "email"), "https://apexlabs.test");
  assert.match(content.subject, /estimation Peptides Engine.*2 molécules.*12 semaines/);
  assert.match(content.text, /Accéder à Peptides Engine/);
  assert.match(content.text, /utm_source=peptides_preview_email&utm_medium=email/);
  assert.doesNotMatch(content.html, /Blood Analysis|MARQUEURS À VÉRIFIER|Vérifier mes marqueurs|peptides_preview_admin|BPC-157|250 mcg/);
  assert.doesNotMatch(content.text, /Blood Analysis|bilan.*avant|marqueurs à vérifier/);
});

test("admin notification is scannable and contains the exact copy-ready client email", () => {
  const content = buildPeptidesPreviewAdminNotificationContent(input, eligible, "lead-123", true, "https://apexlabs.test");
  assert.match(content.subject, /Lead prêt à convertir.*\$182\.47/);
  for (const expected of ["Verdict", "Prochaine étape", "Résultat du pré-calcul", "KissPeptin-10", "cible avec marge 20 % 8.64 mg", "réserve réelle 12.8 mg", "5 à commander réserve incluse", "Email automatique client", "Envoyé", "MAIL PRÊT À COPIER COLLER", "$182.47"]) {
    assert.ok(content.html.includes(expected), `missing ${expected}`);
  }
  assert.match(content.text, /Email automatique client : Envoyé/);
  assert.match(content.text, /Marc, ton estimation Peptides Engine : 2 molécules, 12 semaines, \$182\.47/);
});

test("admin review notification never labels a suspended result as a priced lead", () => {
  const content = buildPeptidesPreviewAdminNotificationContent(input, personalized("medicaments_a_integrer"), "lead-456", true, "https://apexlabs.test");
  assert.match(content.subject, /Lead Peptides Engine.*Conversion directe/);
  assert.doesNotMatch(content.subject, /À valider|Revue requise/);
  assert.match(content.html, /Finalisé dans l’analyse Peptides Engine/);
  assert.match(content.text, /traitement déclaré sera intégré directement/);
  assert.match(content.text, /peptides-engine\?tier=solo.*utm_source=peptides_preview_email/);
});
