import assert from "node:assert/strict";
import test from "node:test";
import {
  buildDiscoverySafetyPrompt,
  deriveDiscoverySafetyPolicy,
  validateDiscoverySafetyContent,
} from "./discoverySafetyPolicy";

test("derive les trois modes TCA", () => {
  assert.equal(deriveDiscoverySafetyPolicy({ "tca-historique": "jamais" }).tcaMode, "none");
  assert.equal(deriveDiscoverySafetyPolicy({ "tca-historique": "passe" }).tcaMode, "history");
  assert.equal(deriveDiscoverySafetyPolicy({ "tca-historique": "actuel" }).tcaMode, "current_or_uncertain");
  assert.equal(deriveDiscoverySafetyPolicy({ "tca-historique": "incertain" }).tcaMode, "current_or_uncertain");
});

test("active le mode strict pour type, relation difficile ou body-checking", () => {
  assert.equal(deriveDiscoverySafetyPolicy({ "tca-type": "comptage" }).strictEatingSafety, true);
  assert.equal(deriveDiscoverySafetyPolicy({ "tca-type": "restriction" }).strictEatingSafety, true);
  assert.equal(deriveDiscoverySafetyPolicy({ "relation-nourriture": "problématique" }).strictEatingSafety, true);
  for (const [key, value] of [
    ["frustration-passee", "Je fais du body-checking"],
    ["si-rien-change", "Je me scrute dans le miroir"],
    ["ideal-6mois", "Je prends des photos de mon corps"],
    ["plus-grosse-peur", "J’ai peur de reprendre du poids"],
  ]) {
    const policy = deriveDiscoverySafetyPolicy({ [key]: value });
    assert.equal(policy.bodyCheckingSignal, true, `${key} non detecte`);
    assert.equal(policy.strictEatingSafety, true);
  }
});

test("un profil sans signal reste non strict", () => {
  const policy = deriveDiscoverySafetyPolicy({ "tca-historique": "jamais", "plus-grosse-peur": "manquer de temps" });
  assert.equal(policy.strictEatingSafety, false);
  assert.match(buildDiscoverySafetyPrompt(policy), /aucun diagnostic/i);
});

test("le gate strict rejette les prescriptions dangereuses", () => {
  const policy = deriveDiscoverySafetyPolicy({ "tca-historique": "passé" });
  const cases: Array<[string, string]> = [
    ["Pèse-toi sept fois cette semaine.", "tca_body_weighing"],
    ["Vise 2 400 kcal par jour.", "tca_calorie_target"],
    ["Vise 2 g/kg de protéines.", "tca_macro_target"],
    ["Prends des photos de progression chaque semaine.", "tca_progress_photos"],
    ["Ta peur de perdre le contrôle explique tout.", "tca_psychologizing"],
    ["Fais doser TSH, T3 et testostérone.", "medical_testing_prescription"],
  ];
  for (const [content, expected] of cases) {
    assert.ok(validateDiscoverySafetyContent(content, policy).errors.includes(expected), content);
  }
});

test("le gate medical rejette l'affirmation et accepte la prudence", () => {
  const policy = deriveDiscoverySafetyPolicy({});
  assert.ok(validateDiscoverySafetyContent("Ton cortisol est élevé.", policy).errors.includes("medical_assertion"));
  assert.ok(validateDiscoverySafetyContent("Ton axe HPA est en activation chronique.", policy).errors.includes("medical_assertion"));
  assert.equal(validateDiscoverySafetyContent("Ce questionnaire ne permet pas de conclure à un dérèglement hormonal.", policy).ok, true);
});

test("le gate strict accepte historique factuel et orientation TCA sobre", () => {
  const policy = deriveDiscoverySafetyPolicy({ "tca-historique": "passe" });
  const safe = "Tu as déclaré un poids de 79 kg et un antécédent de TCA. Ce questionnaire ne pose aucun diagnostic. Un médecin, psychologue ou diététicien formé aux TCA pourra sécuriser la suite sans auto-suivi chiffré.";
  assert.equal(validateDiscoverySafetyContent(safe, policy).ok, true);
});
