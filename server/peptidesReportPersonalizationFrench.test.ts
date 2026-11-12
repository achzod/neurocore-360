import assert from "node:assert/strict";
import test from "node:test";
import { validatePeptidesReport } from "./peptidesReportValidator";

// Content-matching regression only: no compounds, regimen or client data.
function factCountErrors(experienceText: string): string[] {
  return validatePeptidesReport({
    qualityVersion: "expert-standard-v1",
    tier: "solo",
    peptides: [],
    sections: [{
      id: "profil-synthese",
      title: "Synthese de ton profil",
      content: `Tu pèses 80 kg et ton objectif est la perte de gras. Ton budget est de 200 à 300. ${experienceText}`,
    }],
    _validationContext: {
      profile: {
        weightKg: 80,
        primaryGoal: "fatloss",
        budget: "200-300",
        experience: "regular",
      },
    },
  }).errors.filter((issue) => issue.startsWith("personnalisation: seulement"));
}

test("regular experience recognizes the feminine adjective régulière", () => {
  assert.deepEqual(factCountErrors("Tu as une expérience régulière."), []);
});

for (const text of [
  "Tu es un utilisateur régulier.",
  "Tu es une utilisatrice régulière.",
  "Tes usages sont réguliers.",
  "Tes utilisations sont régulières.",
  "Tu as une experience reguliere.",
]) {
  test(`regular experience keeps French agreement equivalent: ${text}`, () => {
    assert.deepEqual(factCountErrors(text), []);
  });
}

for (const text of [
  "",
  "Tu as une expérience théorique.",
  "Tu souhaites réguler ton organisation.",
  "Référence technique : preregulierepost.",
]) {
  test(`missing regular experience still fails fact coverage: ${text || "empty"}`, () => {
    assert.deepEqual(factCountErrors(text), [
      "personnalisation: seulement 3/4 faits du questionnaire repris dans la synthese",
    ]);
  });
}
