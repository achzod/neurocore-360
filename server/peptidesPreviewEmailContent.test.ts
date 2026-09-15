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
  moleculeCount: 1,
  headline: "Une présélection cohérente avec ta récupération",
  rationale: "La récupération locale reste prioritaire et le sommeil soutient la progression.",
  analysisPoints: ["Une zone prioritaire a été déclarée.", "Le scénario reste limité à un axe principal."],
  requiredMarkers: [],
  nextStepExplanation: "Peptides Engine finalise le calendrier et la liste d’achat.",
  budgetExplanation: "Le cycle complet reste dans ton budget avec la livraison incluse.",
  quoteExplanation: "Prix live vérifiés.",
  molecules: [{
    name: "BPC-157",
    supplier: "Supplier Secret",
    productUrl: "https://supplier.invalid/product",
    role: "Récupération locale",
    reason: "Cible le besoin principal déclaré.",
    doseSummary: "250 mcg, deux fois par jour",
    administrationCount: 112,
    startingFormat: "5 mg",
    startingPackagePriceUsd: 12.97,
    cycleDurationLabel: "8 semaines",
    calculationBasis: "0,5 mg/jour × 56 jours = 28 mg",
    totalRequiredMg: 28,
    vialStrengthMg: 5,
    mathematicalVials: 6,
    operationalVials: 6,
    vialsRequired: 6,
    vialsPurchased: 6,
    packageCount: 2,
    estimatedTotalPriceUsd: 25.94,
  }],
  estimatedStarterCostUsd: 12.97,
  estimatedProtocolCostUsd: 77.82,
  estimatedShippingCostUsd: 60,
  estimatedGrandTotalUsd: 137.82,
  monthlyEquivalentUsd: 68.91,
  shippingBreakdown: [{ supplier: "Supplier Secret", subtotalUsd: 77.82, shippingUsd: 60, speed: "7 à 14 jours" }],
  totalVialsRequired: 6,
  totalVialsPurchased: 6,
  totalPackages: 2,
  durationLabel: "8 semaines",
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
  assert.match(content.subject, /estimation Peptides Engine.*1 molécule.*8 semaines.*\$137\.82/);
  for (const expected of [input.goalDetails, "Nombre de molécules", "Durée estimée", "$77.82", "$60.00", "$137.82", "protocole plus poussé et plus précis"]) {
    assert.match(content.html, new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.match(content.text, new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.doesNotMatch(content.html, /BPC-157|250 mcg|28 mg|Dose de référence/);
  assert.doesNotMatch(content.text, /BPC-157|250 mcg|28 mg|Dose de référence/);
  assert.match(content.html, /Débloquer mon analyse Peptides Engine/);
  assert.match(content.text, /https:\/\/apexlabs\.test\/peptides-engine\?tier=solo/);
  assert.doesNotMatch(content.html, /Supplier Secret|supplier\.invalid/);
  assert.doesNotMatch(content.text, /Supplier Secret|supplier\.invalid/);
});

test("personalized profile converts directly to Peptides Engine without another step", () => {
  const content = buildPeptidesPreviewResultEmailContent(input, personalized("medicaments_a_integrer"), buildPeptidesPreviewDestinationPath("peptides_engine", "email"), "https://apexlabs.test");
  assert.match(content.subject, /estimation Peptides Engine.*1 molécule.*8 semaines/);
  assert.match(content.html, /traitement déclaré sera intégré directement/);
  assert.match(content.text, /Débloque Peptides Engine maintenant/);
  assert.match(content.html, /Débloquer mon analyse Peptides Engine/);
  assert.match(content.text, /\/peptides-engine\?tier=solo.*utm_source=peptides_preview_email/);
  assert.doesNotMatch(content.html, /À valider|Blood Analysis|marqueurs à vérifier|validation|BPC-157|250 mcg/);
  assert.doesNotMatch(content.text, /À valider|Blood Analysis|informations supplémentaires|BPC-157|250 mcg/);
});

test("testosterone profile is not diverted to blood analysis", () => {
  const content = buildPeptidesPreviewResultEmailContent(input, personalized("bilan_hormonal_recent_requis"), buildPeptidesPreviewDestinationPath("blood_analysis", "email"), "https://apexlabs.test");
  assert.match(content.subject, /estimation Peptides Engine.*1 molécule.*8 semaines/);
  assert.match(content.text, /Accéder à Peptides Engine/);
  assert.match(content.text, /utm_source=peptides_preview_email&utm_medium=email/);
  assert.doesNotMatch(content.html, /Blood Analysis|MARQUEURS À VÉRIFIER|Vérifier mes marqueurs|peptides_preview_admin|BPC-157|250 mcg/);
  assert.doesNotMatch(content.text, /Blood Analysis|bilan.*avant|marqueurs à vérifier/);
});

test("admin notification is scannable and contains the exact copy-ready client email", () => {
  const content = buildPeptidesPreviewAdminNotificationContent(input, eligible, "lead-123", true, "https://apexlabs.test");
  assert.match(content.subject, /Lead prêt à convertir.*\$137\.82/);
  for (const expected of ["Verdict", "Prochaine étape", "Résultat du pré-calcul", "BPC-157", "Email automatique client", "Envoyé", "MAIL PRÊT À COPIER COLLER", "$137.82"]) {
    assert.ok(content.html.includes(expected), `missing ${expected}`);
  }
  assert.match(content.text, /Email automatique client : Envoyé/);
  assert.match(content.text, /Marc, ton estimation Peptides Engine : 1 molécule, 8 semaines, \$137\.82/);
});

test("admin review notification never labels a suspended result as a priced lead", () => {
  const content = buildPeptidesPreviewAdminNotificationContent(input, personalized("medicaments_a_integrer"), "lead-456", true, "https://apexlabs.test");
  assert.match(content.subject, /Lead Peptides Engine.*Conversion directe/);
  assert.doesNotMatch(content.subject, /À valider|Revue requise/);
  assert.match(content.html, /Finalisé dans l’analyse Peptides Engine/);
  assert.match(content.text, /traitement déclaré sera intégré directement/);
  assert.match(content.text, /peptides-engine\?tier=solo.*utm_source=peptides_preview_email/);
});
