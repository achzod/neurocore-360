import assert from "node:assert/strict";
import test from "node:test";

import {
  countEnglishMarkers,
  hasEnglishMarkers,
  normalizeSingleVoice,
  stripEnglishLines,
} from "./textNormalization";

test("repeated French performance wording does not become English evidence", () => {
  const paragraph =
    "Ta performance dépend de la régularité, et cette performance progresse quand la récupération, " +
    "la confiance et la discipline restent cohérentes. La performance mentale soutient aussi la performance physique. ";
  const frenchProxy = paragraph.repeat(85);
  assert.ok(frenchProxy.length > 13_000);
  assert.equal(countEnglishMarkers(frenchProxy), 0);
  assert.equal(hasEnglishMarkers(frenchProxy, 4), false);
});

test("long technical French corpus tolerates shared scientific vocabulary", () => {
  const sentences = [
    "La performance reste mesurable par la progression, la puissance et la qualité de récupération.",
    "Le stress modifie le cortisol, la dopamine, la motivation et l'adhérence comportementale.",
    "La composition corporelle et la santé métabolique demandent une lecture longitudinale.",
    "Le sommeil profond soutient la récupération nerveuse et la performance du lendemain.",
  ];
  for (let seed = 0; seed < 64; seed += 1) {
    const corpus = Array.from({ length: 180 }, (_, index) => sentences[(index * 17 + seed) % sentences.length]).join(" ");
    assert.equal(hasEnglishMarkers(corpus, 4), false, `seed=${seed}`);
  }
});

test("an embedded English sentence is still rejected inside long French content", () => {
  const french = "Ta progression repose sur une méthode claire et mesurable. ".repeat(220);
  const mixed = `${french}\nThis is your body and this is your health.\n${french}`;
  assert.equal(hasEnglishMarkers(mixed, 4), true);
});

test("obvious English headings and phrases remain forbidden", () => {
  for (const sample of [
    "KEY TAKEAWAY",
    "What this means for your body",
    "Research shows that sleep quality matters",
    "Next steps",
    "Overall health and exercise performance",
  ]) {
    assert.equal(hasEnglishMarkers(sample, 4), true, sample);
  }
});

test("isolated English labels are translated deterministically", () => {
  const input = "Key takeaway\nTa performance reste stable.\nSleep quality\nNext steps";
  const cleaned = stripEnglishLines(input);
  assert.equal(cleaned, "points clés\nTa performance reste stable.\nqualité du sommeil\nprochaines étapes");
  assert.equal(hasEnglishMarkers(cleaned, 4), false);
});

test("a genuine English sentence is removed instead of cosmetically translated", () => {
  const input = "Ta performance reste stable.\nThis is your body and this is your health.\nContinue avec une action précise.";
  const cleaned = stripEnglishLines(input);
  assert.equal(cleaned, "Ta performance reste stable.\nContinue avec une action précise.");
});

test("inline artifacts are normalized without deleting valid French", () => {
  const normalized = normalizeSingleVoice("Ta sleep quality progresse and ta performance reste cohérente.");
  assert.equal(normalized, "Ta qualité du sommeil progresse et ta performance reste cohérente.");
  assert.equal(hasEnglishMarkers(normalized), false);
});

test("single-voice normalization preserves French words containing on after a cedilla", () => {
  assert.equal(
    normalizeSingleVoice("On avance de façon régulière avec une leçon utile pour ce garçon."),
    "J'avance de façon régulière avec une leçon utile pour ce garçon.",
  );
  assert.doesNotMatch(normalizeSingleVoice("façon leçon garçon"), /çj/);
});

test("single-voice fallback emits accented éléments directly", () => {
  assert.equal(
    normalizeSingleVoice("Je ne peux pas confirmer cette hypothèse."),
    "je n'ai pas les éléments pour confirmer cette hypothèse.",
  );
  assert.doesNotMatch(normalizeSingleVoice("Je ne peux pas conclure."), /\belements?\b/i);
});
