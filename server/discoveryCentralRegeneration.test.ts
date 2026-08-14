import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  buildDiscoveryDeterministicCta,
  buildDiscoveryQuestionnaireFacts,
  calculateDiscoveryDeterministicProfile,
  DISCOVERY_PREMIUM_DOMAINS,
  validateDiscoveryFactualConsistency,
  validateDiscoveryPlainTextCandidate,
  validateDiscoveryQuestionnaireContract,
  validateDiscoveryReportAgainstResponses,
} from "./discovery-scan";
import { validateDiscoverySafetyContent } from "./discoverySafetyPolicy";

const labels: Record<string, [string, string]> = {
  sommeil: ["Sommeil", "Récupération"], stress: ["Stress", "Système Nerveux"],
  energie: ["Énergie", "Vitalité"], digestion: ["Digestion", "Absorption"],
  training: ["Entraînement", "Performance"], nutrition: ["Nutrition", "Métabolisme"],
  lifestyle: ["Style de vie", "Habitudes"], mindset: ["Mental", "État d'esprit"],
};

const forbiddenLiveIdentityTokenHashes = new Set([
  "5e0176c9d2070a5a2a22bf74b4abed303654690d58d64221ccbd022af827abc4",
  "c7c084318b6f1bece6f74ffce1ea53596070345272dee8040037497c7d4cbffe",
  "fcddb3ba91ab8b4ff38a08424f343f7f465e93ac1e61926e2cf283b9d493ce09",
  "16019fea43d823bf1d80e183484127fec43287e5b6ad8cc3d4ac42b9523af3e6",
  "97cf94ea5536d9ce870ce055760f81c6b355df478d4566ae3140a4dc1cdec3d5",
  "90be0995aa2c8b9e273ce6b3ce732ba1d325245dd1d4547b843127649c435777",
  "43d26e8db66a76f646f2d559e592493070c7e02048ada7fd8b96fcc0369f5d11",
  "4b9e5c3f6ea3585cf24b7bbc5e577694158effa19ed61ff707f2a9ce9b208263",
  "76baa2c486977e326cffa06d7d80cb4973f587d5ed34b2d5e8ad4199a222fad1",
]);

function assertNoLiveIdentityInTrackedAsset(raw: string, label: string): void {
  const tokens = raw.normalize("NFKC").toLocaleLowerCase("fr-FR").match(/\p{L}+/gu) || [];
  for (const token of tokens) {
    const tokenHash = createHash("sha256").update(token).digest("hex");
    assert.equal(forbiddenLiveIdentityTokenHashes.has(tokenHash), false, `${label}:live_identity_token`);
  }
  assert.doesNotMatch(raw, /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i, label);
  assert.doesNotMatch(raw, /\b\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/, label);
  const emails = raw.match(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi) || [];
  assert.equal(emails.every((email) => email.toLowerCase().endsWith("@example.test")), true, `${label}:non_reserved_email`);
}

function baseResponses(overrides: Record<string, unknown> = {}): any {
  return {
    prenom: "Profil", email: "case_00@example.test", "reveil-fatigue": "parfois",
    "reveils-nocturnes": "jamais", "tca-historique": "non",
    "traitement-medical": "non", "diagnostic-medical": ["aucun"],
    ...overrides,
  };
}

function exactContractReport(responses: any): any {
  const deterministic = calculateDiscoveryDeterministicProfile(responses);
  const domains = [...DISCOVERY_PREMIUM_DOMAINS].sort((a, b) => (
    deterministic.scoresByDomain[a] - deterministic.scoresByDomain[b]
    || DISCOVERY_PREMIUM_DOMAINS.indexOf(a) - DISCOVERY_PREMIUM_DOMAINS.indexOf(b)
  ));
  const analysisMetadata = {
    blocages: deterministic.blocages,
    ctaMessage: buildDiscoveryDeterministicCta(deterministic.blocages, deterministic.safetyPolicy),
    questionnaireCoverage: deterministic.questionnaireCoverage,
  };
  return {
    globalScore: Math.round((deterministic.globalScore / 10) * 10) / 10,
    metrics: DISCOVERY_PREMIUM_DOMAINS.map((domain) => ({
      key: domain, label: labels[domain][0],
      value: Math.round((deterministic.scoresByDomain[domain] / 10) * 10) / 10,
      max: 10, description: labels[domain][1],
    })),
    sections: ["intro", "global", ...domains, "scans", "coaching"]
      .map((id) => ({ id, title: id, content: "Observation prudente et non diagnostique." })),
    analysisMetadata,
    generationQuality: {
      safety: {
        version: 1,
        tcaMode: deterministic.safetyPolicy.tcaMode,
        bodyCheckingSignal: deterministic.safetyPolicy.bodyCheckingSignal,
        strictEatingSafety: deterministic.safetyPolicy.strictEatingSafety,
        gatePassed: true,
      },
    },
  };
}

test("case_01: parfois fatigué ne devient jamais lever difficile", () => {
  const responses = baseResponses();
  assert.ok(validateDiscoveryFactualConsistency("La fatigue est parfois présente au réveil.", responses).length === 0);
  assert.ok(validateDiscoveryFactualConsistency("Ton lever est difficile.", responses)
    .includes("factual_intensity_contradiction:reveil-fatigue"));
});

test("case_02: criticité, métriques, ordre et metadata sont liés au contrat déterministe", () => {
  const responses = baseResponses({ "reveil-fatigue": "toujours", "reveils-nocturnes": "souvent" });
  const report = exactContractReport(responses);
  assert.equal(validateDiscoveryReportAgainstResponses(report, responses, report.analysisMetadata).ok, true);
  const contradiction = structuredClone(report);
  contradiction.sections[0].content = "BLOCAGE CRITIQUE, mais sans atteindre le niveau critique calculé.";
  assert.equal(validateDiscoveryReportAgainstResponses(contradiction, responses, contradiction.analysisMetadata).ok, false);
  const alteredMetric = structuredClone(report);
  alteredMetric.metrics[0].value = 10;
  assert.ok(validateDiscoveryReportAgainstResponses(alteredMetric, responses, alteredMetric.analysisMetadata)
    .errors.includes("score:deterministic_metrics_mismatch"));
});

test("case_03: les diagnostics digestifs restent interdits même comme hypothèse", () => {
  const policy = calculateDiscoveryDeterministicProfile(baseResponses({ "tca-historique": "passé" })).safetyPolicy;
  assert.ok(validateDiscoverySafetyContent("Une dysbiose est possible.", policy).errors.includes("digestive_diagnosis"));
});

test("case_04: aucun contexte TCA individuel n'entre dans le prompt", () => {
  for (const value of ["passé", "actuel", "incertain"]) {
    const facts = buildDiscoveryQuestionnaireFacts(baseResponses({
      "tca-historique": value,
      "tca-type": "restriction sévère confidentielle",
      "relation-nourriture": "difficile",
    }));
    assert.equal(facts.includes("restriction sévère confidentielle"), false);
    assert.doesNotMatch(facts, /contexte-tca|history|current_or_uncertain|passé|actuel|incertain/);
  }
});

test("case_05: nom et dose du traitement ne sont jamais exposés au provider", () => {
  const facts = buildDiscoveryQuestionnaireFacts(baseResponses({
    "traitement-medical": "Produit confidentiel 40 mg",
    medicaments: "Produit confidentiel 40 mg",
  }));
  assert.equal(facts.includes("Produit confidentiel"), false);
  assert.doesNotMatch(facts, /traitement|medicament|40 mg/);
});

test("case_06: HTML, URL, markdown et promo sont refusés avant assemblage", () => {
  for (const raw of [
    "<img src=x>", "https://example.com", "//evil.example/path", "ftp://evil.example/path",
    "mailto:evil@example.test", "# Titre", "Titre\n===", "_italique_", "- liste",
    ["DISCOVERY", "20"].join(""), "DISCOVERY 20", "DISCOVERY-20", "DISCOVERY‑20",
  ]) {
    assert.ok(validateDiscoveryPlainTextCandidate(raw).length > 0, raw);
  }
});

test("le reconciler expose un vrai cycle prepare/preflight/run de régénération", () => {
  const source = readFileSync(new URL("../scripts/discovery-safe-reconciler.ts", import.meta.url), "utf8");
  for (const token of ["--prepare-regeneration", "--preflight-regeneration", "--run-regeneration", "retryOfCandidateId"]) {
    assert.ok(source.includes(token), token);
  }
});

test("les neuf cas legacy synthétiques et versionnés satisfont le contrat exact", () => {
  const rawFixture = readFileSync(
    new URL("./fixtures/discovery-legacy-safe-cases.json", import.meta.url),
    "utf8",
  );
  assertNoLiveIdentityInTrackedAsset(rawFixture, "synthetic_fixture");
  assert.doesNotMatch(rawFixture, /https?:\/\/|<\/?[a-z][^>]*>/i);

  const document = JSON.parse(rawFixture);
  assert.deepEqual(Object.keys(document).sort(), ["cases", "fixtureSource", "schemaVersion"]);
  assert.equal(document.schemaVersion, 1);
  assert.equal(document.fixtureSource, "synthetic");
  assert.equal(document.cases.length, 9);
  assert.deepEqual(
    document.cases.map((fixture: any) => fixture.caseId),
    Array.from({ length: 9 }, (_, index) => `case_${String(index + 1).padStart(2, "0")}`),
  );

  const expectedFlagKeys = [
    "diagnosisDeclared", "freeTextMindsetDeclared", "injuryContextDeclared",
    "intoleranceDeclared", "tcaContextDeclared", "tcaCurrentConcern", "treatmentDeclared",
  ];
  for (const fixture of document.cases) {
    assert.deepEqual(Object.keys(fixture).sort(), ["caseId", "sensitiveFlags", "typedResponses"]);
    assert.deepEqual(Object.keys(fixture.sensitiveFlags).sort(), expectedFlagKeys);
    assert.equal(Object.values(fixture.sensitiveFlags).every((value) => typeof value === "boolean"), true);
    const flags = fixture.sensitiveFlags;
    const responses = {
      prenom: "Profil",
      ...fixture.typedResponses,
      "traitement-medical": flags.treatmentDeclared ? "oui-autre" : "non",
      "diagnostic-medical": flags.diagnosisDeclared ? ["autre"] : ["aucun"],
      "tca-historique": flags.tcaCurrentConcern ? "actuel" : flags.tcaContextDeclared ? "passe" : "jamais",
      intolerance: flags.intoleranceDeclared ? ["autres"] : ["aucune"],
    };
    assert.deepEqual(validateDiscoveryQuestionnaireContract(responses), [], fixture.caseId);
    const profile = calculateDiscoveryDeterministicProfile(responses);
    assert.equal(profile.questionnaireCoverage.version, 1);
    assert.equal(profile.questionnaireCoverage.confidence, "legacy_partial");
    assert.equal(Object.values(profile.scoresByDomain).every(Number.isFinite), true);
    const providerFacts = buildDiscoveryQuestionnaireFacts(responses);
    assert.equal(providerFacts, buildDiscoveryQuestionnaireFacts({}));
    assert.doesNotMatch(providerFacts, /https?:|@|\bmg\b/i);
  }
});

test("les assets centraux tracked ne contiennent aucun identifiant live", () => {
  for (const [label, url] of [
    ["central_test_source", new URL("./discoveryCentralRegeneration.test.ts", import.meta.url)],
    ["synthetic_fixture", new URL("./fixtures/discovery-legacy-safe-cases.json", import.meta.url)],
  ] as const) {
    assertNoLiveIdentityInTrackedAsset(readFileSync(url, "utf8"), label);
  }
});

test("legacy vide, domaine trop incomplet et enum forgée sont bloqués avant provider", () => {
  assert.ok(validateDiscoveryQuestionnaireContract({}).some((error) => error.includes("insufficient_legacy_coverage")));
  const thin = baseResponses({ sexe: "homme", age: "30", poids: "80", objectif: "sante" });
  assert.ok(validateDiscoveryQuestionnaireContract(thin).some((error) => error.includes("insufficient_legacy_coverage")));
  const forged = { ...thin, "niveau-stress": "valeur-inventee" };
  assert.ok(validateDiscoveryQuestionnaireContract(forged).includes("questionnaire:invalid:niveau-stress"));
});

test("la provenance sépare la prose provider des faits assemblés déterministement", () => {
  const responses = baseResponses({ "eau-jour": "2-3L", "cafe-jour": "1-2", alcool: "0" });
  for (const raw of [
    "Énergie matinale : bonne.",
    "Hydratation : 2 à 3 L.",
    "Aucun blocage critique n'est calculé.",
  ]) {
    assert.ok(validateDiscoveryFactualConsistency(raw, responses, { source: "provider" }).length > 0, raw);
  }
  assert.deepEqual(
    validateDiscoveryFactualConsistency(
      "Hydratation : 2 à 3 L. Café : 1 à 2. Alcool : 0. Aucun blocage critique n'est calculé.",
      responses,
      { source: "assembled" },
    ),
    [],
  );
});
