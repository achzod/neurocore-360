import assert from "node:assert/strict";
import test from "node:test";
import { validatePeptidesReport } from "./peptidesReportValidator";

function comfortFactErrors(comfortText: string): string[] {
  return validatePeptidesReport({
    qualityVersion: "expert-standard-v1",
    tier: "solo",
    peptides: [],
    sections: [{
      id: "profil-synthese",
      title: "Synthese de ton profil",
      content: `Tu pèses 80 kg, ton objectif est la perte de gras et ton budget est de 200 à 300. ${comfortText}`,
    }],
    _validationContext: {
      profile: {
        weightKg: 80,
        primaryGoal: "fatloss",
        budget: "200-300",
        injectionComfort: "fine",
      },
    },
  }).errors.filter((issue) => issue.startsWith("personnalisation: seulement"));
}

test("comfort fact recognizes a French typographic apostrophe", () => {
  assert.deepEqual(comfortFactErrors("Tu es à l’aise."), []);
});

for (const text of [
  "Tu es à l'aise.",
  "Tu es a l’aise.",
  "Tu es confortable.",
  "Tu n’as aucun problème.",
]) {
  test(`equivalent documented comfort remains recognized: ${text}`, () => {
    assert.deepEqual(comfortFactErrors(text), []);
  });
}

for (const text of [
  "",
  "Tu es anxieux.",
  "Tu as une question sur les injections.",
  "Tu es mal à l’aise.",
  "Tu es mal à l'aise.",
  "Tu n’es pas à l’aise.",
  "Tu n'es pas à l'aise.",
  "Tu n’es pas du tout à l’aise.",
  "Tu n'es pas du tout à l'aise.",
]) {
  test(`missing positive comfort fact still fails coverage: ${text || "empty"}`, () => {
    assert.deepEqual(comfortFactErrors(text), [
      "personnalisation: seulement 3/4 faits du questionnaire repris dans la synthese",
    ]);
  });
}
