import assert from "node:assert/strict";
import test from "node:test";
import { buildPeptidesPreviewResultEmailContent } from "./peptidesPreviewEmailContent";
import type { PeptidesPreviewInput, PeptidesPreviewResult } from "./peptidesPreview";

const input = {
  firstName: "Karim", email: "karim@example.com", age: 36, weightKg: 82, heightCm: 179, sex: "male", bodyFatRange: "15-20",
  primaryGoal: "gh-antiaging", secondaryGoals: [], goalDetails: "Optimisation de la récupération, du sommeil et de la composition corporelle via un axe GH pulsatile.", timeline: "12plus",
  recoveryScope: "not-applicable", glp1History: "not-applicable", cognitiveStress: "not-applicable", conditions: ["none"], bloodwork: "recent", bloodPressure: "normal", sleepHours: 7,
  injectionComfort: "possible", injectionFrequency: "twice-daily", refrigeration: "yes-private", experience: "read", trainingFrequency: "3-4", budgetTotalUsd: 400, country: "FR",
  medications: "aucun", allergies: "aucune", currentPeptides: "aucun", pastPeptides: "aucun", startWhen: "1-2weeks", consent: true, attribution: {},
} satisfies PeptidesPreviewInput;

const result = {
  status: "eligible", moleculeCount: 2, molecules: [], estimatedStarterCostUsd: 37.52, estimatedProtocolCostUsd: 112.56, estimatedShippingCostUsd: 60,
  estimatedGrandTotalUsd: 172.56, monthlyEquivalentUsd: 57.52, shippingBreakdown: [{ supplier: "Expédition 1", subtotalUsd: 112.56, shippingUsd: 60, speed: "Standard" }],
  totalVialsRequired: 6, totalVialsPurchased: 6, totalPackages: 6, priceCheckedAt: "2026-09-15T13:05:53Z", durationLabel: "12 semaines actives", budgetFit: "within",
  headline: "Ton estimation retient 2 molécules pour ta priorité axe GH.",
  rationale: "Ton aperçu construit un signal pulsatile et un axe complémentaire.",
  analysisPoints: ["Le calendrier et le budget sont adaptés à ton profil."], requiredMarkers: [],
  nextStepExplanation: "Commence Peptides Engine et complète son questionnaire dédié.",
  budgetExplanation: "Le devis respecte ton budget.", quoteExplanation: "Molécules : $112.56. Livraison : $60.00. Total : $172.56.", blockers: [], nextStep: "peptides_engine",
} satisfies PeptidesPreviewResult;

test("client email answers conversion objections and keeps two visible purchase paths", () => {
  const content = buildPeptidesPreviewResultEmailContent(input, result, "/peptides-engine?tier=solo", "https://apexlabs.onrender.com");
  for (const expected of [
    "Ton estimation Pré-Peptides reste enregistrée",
    "Ce que Peptides Engine débloque pour 199 €",
    "La sélection nominative",
    "Le calendrier semaine par semaine",
    "La reconstitution",
    "La liste d’achat finale",
    "au lieu d’un stack générique",
    "Peptides Engine commence par son propre questionnaire complet",
    "une seule livraison",
  ]) {
    assert.match(content.text, new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"), `text missing: ${expected}`);
    assert.match(content.html, new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"), `html missing: ${expected}`);
  }
  assert.doesNotMatch(content.text, /sans remplir un second questionnaire/i);
  assert.doesNotMatch(content.html, /sans remplir un second questionnaire/i);
  const hrefs = content.html.match(/href="https:\/\/apexlabs\.onrender\.com\/peptides-engine[^"]*"/g) || [];
  assert.ok(hrefs.length >= 2, `client email must expose the purchase CTA after the estimate and again at the close; found ${hrefs.length}`);
});
