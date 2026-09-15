import assert from "node:assert/strict";
import test from "node:test";
import {
  buildPeptidesPreviewAdminNotificationContent,
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
  headline: "Une présélection cohérente avec ta récupération",
  rationale: "La récupération locale reste prioritaire et le sommeil soutient la progression.",
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

function review(nextStep: "manual_review" | "blood_analysis", blocker: string): PeptidesPreviewEmailResult {
  return {
    ...eligible,
    status: "review_required",
    headline: nextStep === "blood_analysis" ? "Tes marqueurs doivent être vérifiés" : "Une validation individuelle est nécessaire",
    rationale: "Une donnée du profil change directement la compatibilité.",
    budgetExplanation: "Le budget sera évalué après validation.",
    quoteExplanation: "Aucun devis partiel.",
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
    nextStep,
  };
}

test("eligible client receives the direct recommendation, arithmetic, landed quote and CTA", () => {
  const content = buildPeptidesPreviewResultEmailContent(input, eligible, "/peptides-engine?tier=solo", "https://apexlabs.test");
  assert.match(content.subject, /recommandation Peptides Engine et ton devis complet/);
  for (const expected of [input.goalDetails, "BPC-157", "250 mcg, deux fois par jour", "0,5 mg\/jour × 56 jours = 28 mg", "$77.82", "$60.00", "$137.82"]) {
    assert.match(content.html, new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.match(content.text, new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.match(content.html, /Débloquer mon protocole complet/);
  assert.match(content.text, /https:\/\/apexlabs\.test\/peptides-engine\?tier=solo/);
  assert.doesNotMatch(content.html, /Supplier Secret|supplier\.invalid/);
  assert.doesNotMatch(content.text, /Supplier Secret|supplier\.invalid/);
});

test("manual review client receives the exact reason and next step without a fake quote", () => {
  const content = buildPeptidesPreviewResultEmailContent(input, review("manual_review", "medicaments_a_integrer"), "/offers/peptides-engine#offres", "https://apexlabs.test");
  assert.match(content.subject, /validation est nécessaire/);
  assert.match(content.html, /traitement actuellement déclaré doit être intégré/);
  assert.match(content.text, /traitement actuellement déclaré doit être intégré/);
  assert.match(content.html, /Obtenir ma validation personnalisée/);
  assert.doesNotMatch(content.html, /DEVIS COMPLET ESTIMÉ|À valider|medicaments_a_integrer/);
  assert.doesNotMatch(content.text, /Ton devis estimatif complet|À valider|medicaments_a_integrer/);
});

test("blood review explains marker verification and links to Blood Analysis", () => {
  const content = buildPeptidesPreviewResultEmailContent(input, review("blood_analysis", "bilan_hormonal_recent_requis"), "/offers/blood-analysis", "https://apexlabs.test");
  assert.match(content.subject, /marqueurs à vérifier/);
  assert.match(content.html, /bilan hormonal récent est nécessaire/);
  assert.match(content.html, /Vérifier mes marqueurs/);
  assert.match(content.text, /Blood Analysis/);
  assert.doesNotMatch(content.html, /DEVIS COMPLET ESTIMÉ|À valider/);
});

test("admin notification is scannable and contains the exact copy-ready client email", () => {
  const content = buildPeptidesPreviewAdminNotificationContent(input, eligible, "lead-123", true, "https://apexlabs.test");
  assert.match(content.subject, /Lead prêt à convertir.*\$137\.82/);
  for (const expected of ["Verdict", "Prochaine étape", "Recommandation", "BPC-157", "Email automatique client", "Envoyé", "MAIL PRÊT À COPIER COLLER", "$137.82"]) {
    assert.ok(content.html.includes(expected), `missing ${expected}`);
  }
  assert.match(content.text, /Email automatique client : Envoyé/);
  assert.match(content.text, /Marc, ta recommandation Peptides Engine et ton devis complet/);
});

test("admin review notification never labels a suspended result as a priced lead", () => {
  const content = buildPeptidesPreviewAdminNotificationContent(input, review("manual_review", "medicaments_a_integrer"), "lead-456", true, "https://apexlabs.test");
  assert.match(content.subject, /Revue requise/);
  assert.doesNotMatch(content.subject, /À valider|Lead prêt à convertir/);
  assert.match(content.html, /Suspendu — aucune estimation partielle/);
  assert.match(content.text, /traitement actuellement déclaré doit être intégré/);
  assert.match(content.text, /offers\/peptides-engine\?.*#offres/);
});
