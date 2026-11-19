import assert from "node:assert/strict";
import { test } from "node:test";

import {
  discoveryOfferCtaLabel,
  discoveryOfferDeduction,
  discoveryOfferHref,
  discoveryOfferWhy,
  discoveryOfferWindowFrom,
  discoveryOtherFormulasHref,
  isDiscoveryOfferWindowOpen,
  parseDiscoveryOfferRecommendation,
  profileJustifiesPeptides,
  recommendDiscoveryOffer,
  type DiscoveryOfferProfile,
} from "./discoveryOfferRecommendation";

const DOMAINS = ["sommeil", "stress", "energie", "digestion", "training", "nutrition", "lifestyle", "mindset"];

function metrics(values: Partial<Record<string, number>> = {}, base = 7) {
  return DOMAINS.map((key) => ({ key, value: values[key] ?? base }));
}

// Pratiquant avancé, bases solides, qui stagne : le seul profil Peptides.
const PEPTIDES_RESPONSES = {
  age: "32",
  objectif: "prise-muscle",
  "tca-historique": "jamais",
  "traitement-medical": "non",
  "diagnostic-medical": ["aucun"],
  "sport-frequence": "5+",
  intensite: "intense",
  "performance-evolution": "stagnation",
  "engagement-niveau": "8-9",
  "consignes-strictes": "oui",
};

function peptidesProfile(overrides: Partial<DiscoveryOfferProfile> = {}): DiscoveryOfferProfile {
  return { globalScore: 7.2, metrics: metrics(), strictEatingSafety: false, responses: { ...PEPTIDES_RESPONSES }, ...overrides };
}

test("Essential par défaut : bonne base, pas de réponses", () => {
  const rec = recommendDiscoveryOffer({ globalScore: 7, metrics: metrics() });
  assert.equal(rec.offer, "essential");
  assert.equal(rec.reason, "bases_a_structurer");
  assert.deepEqual(rec.weakDomains, []);
});

test("Elite quand 3 domaines sont sous 6/10 ou que le score global est sous 5", () => {
  const rec = recommendDiscoveryOffer({ globalScore: 6, metrics: metrics({ sommeil: 4, stress: 5.5, nutrition: 5 }) });
  assert.equal(rec.offer, "elite");
  assert.deepEqual(rec.weakDomains, ["sommeil", "nutrition", "stress"]);
  assert.equal(recommendDiscoveryOffer({ globalScore: 4.8, metrics: metrics({ sommeil: 5 }) }).offer, "elite");
  // 2 domaines faibles et score correct : on reste sur Essential.
  assert.equal(recommendDiscoveryOffer({ globalScore: 6, metrics: metrics({ sommeil: 4, stress: 5 }) }).offer, "essential");
});

test("Private Lab seulement avec 4 domaines faibles ET un engagement de 8/10 ou plus", () => {
  const weak = metrics({ sommeil: 4, stress: 4, energie: 5, nutrition: 5 });
  assert.equal(recommendDiscoveryOffer({ globalScore: 5.5, metrics: weak, responses: { "engagement-niveau": "10" } }).offer, "private-lab");
  assert.equal(recommendDiscoveryOffer({ globalScore: 5.5, metrics: weak, responses: { "engagement-niveau": "6-7" } }).offer, "elite");
  assert.equal(recommendDiscoveryOffer({ globalScore: 5.5, metrics: weak }).offer, "elite");
});

test("Anabolic Bioscan quand l'engagement déclaré est faible", () => {
  for (const level of ["1-3", "4-5"]) {
    const rec = recommendDiscoveryOffer({ globalScore: 4, metrics: metrics({ sommeil: 3, stress: 3, energie: 3, nutrition: 3 }), responses: { "engagement-niveau": level } });
    assert.equal(rec.offer, "anabolic-bioscan", level);
    assert.equal(rec.reason, "engagement_faible");
  }
});

test("Peptides Engine quand tout le profil le justifie", () => {
  const rec = recommendDiscoveryOffer(peptidesProfile());
  assert.equal(rec.offer, "peptides-engine");
  assert.equal(rec.reason, "plateau_bases_solides");
  // Diagnostic envoyé en texte simple par d'anciens formulaires.
  assert.equal(profileJustifiesPeptides(peptidesProfile({ responses: { ...PEPTIDES_RESPONSES, "diagnostic-medical": "aucun" } })), true);
});

test("Peptides Engine n'est jamais recommandé par défaut ni sans réponses", () => {
  assert.equal(profileJustifiesPeptides({ globalScore: 9, metrics: metrics({}, 9) }), false);
  assert.equal(profileJustifiesPeptides({ globalScore: 9, metrics: metrics({}, 9), responses: null }), false);
  assert.equal(profileJustifiesPeptides({ globalScore: 9, metrics: metrics({}, 9), responses: {} }), false);
});

test("un seul signal manquant ou à risque suffit à écarter Peptides Engine", () => {
  const blockers: Array<[string, Partial<DiscoveryOfferProfile>]> = [
    ["sécurité alimentaire stricte", { strictEatingSafety: true }],
    ["TCA passé", { responses: { ...PEPTIDES_RESPONSES, "tca-historique": "passe" } }],
    ["TCA incertain", { responses: { ...PEPTIDES_RESPONSES, "tca-historique": "incertain" } }],
    ["traitement", { responses: { ...PEPTIDES_RESPONSES, "traitement-medical": "oui-hormones" } }],
    ["diagnostic", { responses: { ...PEPTIDES_RESPONSES, "diagnostic-medical": ["aucun", "thyroide"] } }],
    ["diagnostic absent", { responses: { ...PEPTIDES_RESPONSES, "diagnostic-medical": [] } }],
    ["moins de 25 ans", { responses: { ...PEPTIDES_RESPONSES, age: "22" } }],
    ["âge inconnu", { responses: { ...PEPTIDES_RESPONSES, age: "" } }],
    ["objectif perte de graisse", { responses: { ...PEPTIDES_RESPONSES, objectif: "perte-graisse" } }],
    ["objectif santé", { responses: { ...PEPTIDES_RESPONSES, objectif: "sante" } }],
    ["s'entraîne peu", { responses: { ...PEPTIDES_RESPONSES, "sport-frequence": "1-2" } }],
    ["intensité modérée", { responses: { ...PEPTIDES_RESPONSES, intensite: "modere" } }],
    ["progresse encore", { responses: { ...PEPTIDES_RESPONSES, "performance-evolution": "progression" } }],
    ["engagement moyen", { responses: { ...PEPTIDES_RESPONSES, "engagement-niveau": "6-7" } }],
    ["consignes partielles", { responses: { ...PEPTIDES_RESPONSES, "consignes-strictes": "partiellement" } }],
    ["score global trop bas", { globalScore: 6.4 }],
    ["sommeil faible", { metrics: metrics({ sommeil: 5.9 }) }],
    ["stress faible", { metrics: metrics({ stress: 5 }) }],
    ["nutrition faible", { metrics: metrics({ nutrition: 4 }) }],
    ["nutrition absente", { metrics: metrics().filter((m) => m.key !== "nutrition") }],
  ];
  for (const [label, override] of blockers) {
    const profile = peptidesProfile(override);
    assert.equal(profileJustifiesPeptides(profile), false, label);
    assert.notEqual(recommendDiscoveryOffer(profile).offer, "peptides-engine", label);
  }
});

test("scores non numériques ignorés sans faire planter la règle", () => {
  const rec = recommendDiscoveryOffer({ globalScore: Number.NaN, metrics: [{ key: "sommeil", value: Number.NaN }] });
  assert.equal(rec.offer, "elite");
  assert.deepEqual(rec.weakDomains, []);
});

test("la recommandation reçue de l'API est validée", () => {
  assert.deepEqual(
    parseDiscoveryOfferRecommendation({ offer: "elite", reason: "plusieurs_axes", weakDomains: ["sommeil", 3] }),
    { offer: "elite", reason: "plusieurs_axes", weakDomains: ["sommeil"] },
  );
  assert.equal(parseDiscoveryOfferRecommendation({ offer: "ultimate", reason: "plusieurs_axes" }), null);
  assert.equal(parseDiscoveryOfferRecommendation({ offer: "elite", reason: "autre" }), null);
  assert.equal(parseDiscoveryOfferRecommendation(null), null);
});

test("fenêtre du code Discovery : 7 jours depuis le rapport, date de Paris", () => {
  const offerWindow = discoveryOfferWindowFrom("2026-11-19T10:00:00.000Z");
  assert.deepEqual(offerWindow, { untilIso: "2026-11-26", label: "26 novembre 2026" });
  assert.equal(isDiscoveryOfferWindowOpen(offerWindow, new Date("2026-11-26T20:00:00Z")), true);
  assert.equal(isDiscoveryOfferWindowOpen(offerWindow, new Date("2026-11-27T00:30:00Z")), false);
  assert.equal(discoveryOfferWindowFrom("pas une date"), null);
  assert.equal(isDiscoveryOfferWindowOpen(null), false);
});

test("déduction coaching mise en avant selon l'offre", () => {
  const openWindow = { untilIso: "2026-11-26", label: "26 novembre 2026" };
  const coaching = discoveryOfferDeduction("elite", { openWindow, anabolicDeductionEuros: 59 });
  assert.equal(coaching?.code, "DISCOVERY20");
  assert.match(coaching!.detail, /-20\s% sur les formules 8 et 12 semaines, jusqu'au 26 novembre 2026/);
  assert.equal(discoveryOfferDeduction("essential", { openWindow: null, anabolicDeductionEuros: 59 }), null);

  const bioscan = discoveryOfferDeduction("anabolic-bioscan", { openWindow: null, anabolicDeductionEuros: 59 });
  assert.match(bioscan!.detail, /59\s€ de ton Anabolic Bioscan sont déduits à 100\s%/);
  assert.equal(bioscan!.code, null);

  const peptides = discoveryOfferDeduction("peptides-engine", { openWindow, anabolicDeductionEuros: 59 });
  assert.match(peptides!.detail, /intégralement déduit de ton coaching/);
  // Aucun prix de molécule ni de tier Peptides affiché.
  assert.doesNotMatch(peptides!.detail, /\d+\s?€/);
});

test("liens : une seule formule mise en avant, les autres derrière un lien discret", () => {
  const openWindow = { untilIso: "2026-11-26", label: "26 novembre 2026" };
  const href = discoveryOfferHref("private-lab", { openWindow, medium: "report", content: "offer_card" });
  assert.match(href, /^\/go\/coaching\?/);
  assert.match(href, /code=DISCOVERY20/);
  assert.match(href, /until=2026-11-26/);
  assert.match(href, /tier=PRIVATELAB/);
  assert.match(href, /utm_campaign=discovery_offre_unique/);

  assert.match(discoveryOfferHref("elite", { openWindow: null, medium: "report", content: "offer_card" }),
    /^https:\/\/www\.achzodcoaching\.com\/coaching-elite\?/);
  assert.match(discoveryOfferHref("peptides-engine", { openWindow, medium: "report", content: "offer_card" }),
    /^\/offers\/peptides-engine\?/);
  assert.match(discoveryOfferHref("anabolic-bioscan", { openWindow: null, medium: "email", content: "offer_card", origin: "https://apexlabs.achzodcoaching.com" }),
    /^https:\/\/apexlabs\.achzodcoaching\.com\/offers\/anabolic-bioscan\?/);

  const others = discoveryOtherFormulasHref({ openWindow, medium: "report", content: "other_formulas" });
  assert.match(others, /^\/go\/coaching\?/);
  assert.doesNotMatch(others, /tier=/);
  assert.match(discoveryOtherFormulasHref({ openWindow: null, medium: "report", content: "other_formulas" }),
    /^https:\/\/www\.achzodcoaching\.com\/formules-coaching\?/);
});

test("textes visibles : tutoiement, pas de tiret long, pas d'emoji, pas de mots interdits", () => {
  const forbidden = /\bIA\b|moteur|g[ée]n[ée]r[ée]|r[ée]g[ée]n[ée]r|personnalis|automatique|—|–/i;
  const emoji = /\p{Extended_Pictographic}/u;
  const openWindow = { untilIso: "2026-11-26", label: "26 novembre 2026" };
  const texts: string[] = [];
  for (const [offer, reason, weakDomains] of [
    ["peptides-engine", "plateau_bases_solides", []],
    ["anabolic-bioscan", "engagement_faible", []],
    ["private-lab", "beaucoup_axes_engagement_fort", ["sommeil", "stress", "energie", "nutrition"]],
    ["elite", "plusieurs_axes", ["sommeil", "stress", "lifestyle"]],
    ["elite", "plusieurs_axes", []],
    ["essential", "bases_a_structurer", []],
  ] as const) {
    texts.push(discoveryOfferWhy({ offer, reason, weakDomains: [...weakDomains] }));
    texts.push(discoveryOfferCtaLabel(offer, true), discoveryOfferCtaLabel(offer, false));
    const deduction = discoveryOfferDeduction(offer, { openWindow, anabolicDeductionEuros: 59 });
    if (deduction) texts.push(deduction.title, deduction.detail);
  }
  for (const text of texts) {
    assert.doesNotMatch(text, forbidden, text);
    assert.doesNotMatch(text, emoji, text);
    assert.doesNotMatch(text, /\bvous\b|\bvotre\b/i, text);
  }
  assert.match(discoveryOfferWhy({ offer: "elite", reason: "plusieurs_axes", weakDomains: ["sommeil", "stress", "lifestyle"] }),
    /\(sommeil, stress et hygiène de vie\)/);
});
