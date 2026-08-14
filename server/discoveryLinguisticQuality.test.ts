import assert from "node:assert/strict";
import test from "node:test";

import { validateDiscoveryLinguisticQuality } from "./discovery-scan";

test("lowercase sentence gate catches punctuation followed by a lowercase start", () => {
  const fixtures = [
    "La seule nuance se trouve au matin. une fatigue parfois présente au réveil.",
    "Le rythme est stable ! pourtant la récupération baisse.",
    "Le signal est clair ? peut-être, mais il faut vérifier.",
    "Le score est 7. ensuite la récupération baisse.",
    "Une phrase.\nensuite la récupération baisse.",
    "<p>Une phrase.</p><p>ensuite la récupération baisse.</p>",
  ];
  for (const fixture of fixtures) {
    assert.ok(
      validateDiscoveryLinguisticQuality(fixture).includes("grammar:lowercase_sentence_start"),
      fixture,
    );
  }
});

test("lowercase sentence gate ignores controlled abbreviations, URLs and list markers", () => {
  const fixtures = [
    "Compare les données, p. ex. entre lundi et vendredi.",
    "Observe le sommeil, etc. pendant une semaine.",
    "La ressource est https://example.com. puis le protocole continue.",
    "Contacte test@example.com. puis attends la réponse.",
    "1. une semaine de suivi ciblé",
    "La récupération varie... selon la charge récente.",
  ];
  for (const fixture of fixtures) {
    assert.equal(
      validateDiscoveryLinguisticQuality(fixture).includes("grammar:lowercase_sentence_start"),
      false,
      fixture,
    );
  }
});

test("numeric prose is never mistaken for a list marker", () => {
  const fixture = "Le score est 7. ensuite la récupération baisse.";
  assert.ok(
    validateDiscoveryLinguisticQuality(fixture).includes("grammar:lowercase_sentence_start"),
    fixture,
  );
});

test("validated Lenny replacement passes the lowercase sentence gate", () => {
  const replacement = "La seule nuance se trouve au réveil : une fatigue parfois présente et une énergie matinale moyenne.";
  assert.equal(
    validateDiscoveryLinguisticQuality(replacement).includes("grammar:lowercase_sentence_start"),
    false,
  );
});
