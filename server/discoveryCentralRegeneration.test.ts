import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  buildDiscoveryDefaultMechanismSelection,
  buildDiscoveryDeterministicCta,
  buildDiscoveryReportAssets,
  buildDiscoveryQuestionnaireFacts,
  calculateDiscoveryDeterministicProfile,
  convertToNarrativeReport,
  DISCOVERY_MECHANISM_CATALOG_SHA256,
  DISCOVERY_MECHANISM_CATALOG_VERSION,
  DISCOVERY_MECHANISM_EDITORIAL_SOURCE_SHA256,
  DISCOVERY_PREMIUM_DOMAINS,
  discoveryCatalogSelectionSha256,
  getDiscoveryMechanismCatalogSnapshot,
  validateDiscoveryFactualConsistency,
  validateDiscoveryGeneratedNarrative,
  validateDiscoveryLinguisticQuality,
  validateDiscoveryPlainTextCandidate,
  validateDiscoveryQuestionnaireContract,
  validateDiscoveryReportAgainstResponses,
  validateDiscoveryReportForDelivery,
} from "./discovery-scan";
import {
  attachDiscoveryDeliveryGateResult,
  canExposeDiscoveryReport,
} from "./discoveryDeliveryGate";
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
    prenom: "Canary", email: "case_00@example.test", "reveil-fatigue": "parfois",
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
      .map((id) => ({ id, title: id, content: "<p>La régulation repose sur une explication prudente et non diagnostique.</p>" })),
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

function exactCatalogReport(responses: any): any {
  const deterministic = calculateDiscoveryDeterministicProfile(responses);
  const selection = buildDiscoveryDefaultMechanismSelection();
  const generated = validateDiscoveryGeneratedNarrative(selection, responses, deterministic.safetyPolicy);
  assert.ok(generated.catalogProvenance);
  generated.catalogProvenance.providerResponseId = "resp-catalog-seal";
  const report = convertToNarrativeReport({
    globalScore: deterministic.globalScore,
    scoresByDomain: deterministic.scoresByDomain,
    blocages: deterministic.blocages,
    synthese: generated.synthesis,
    sectionContents: generated.sections,
    ctaMessage: buildDiscoveryDeterministicCta(deterministic.blocages, deterministic.safetyPolicy),
    knowledgePreflight: { synthesis: "", domains: {} },
    safetyPolicy: deterministic.safetyPolicy,
    questionnaireCoverage: deterministic.questionnaireCoverage,
    catalogProvenance: generated.catalogProvenance,
  }, responses, { generatedAt: "2026-08-14T00:00:00.000Z" });
  return attachDiscoveryDeliveryGateResult(report, {
    name: "discovery_delivery",
    version: 4,
    ok: true,
    errors: [],
    checkedAt: "2026-08-14T00:00:01.000Z",
    retryable: false,
  });
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
  const initialValidation = validateDiscoveryReportAgainstResponses(report, responses, report.analysisMetadata);
  assert.equal(initialValidation.ok, true, JSON.stringify(initialValidation.errors));
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

test("case_07: le catalogue éditorial et le catalogue runtime sont scellés séparément", () => {
  const editorialRaw = readFileSync(
    new URL("./fixtures/discovery-mechanism-editorial-source.json", import.meta.url),
    "utf8",
  );
  assert.equal(
    createHash("sha256").update(editorialRaw).digest("hex"),
    DISCOVERY_MECHANISM_EDITORIAL_SOURCE_SHA256,
  );
  const editorial = JSON.parse(editorialRaw) as Array<{
    domain: string;
    synthesis: string;
    snippets: Array<{ id: string; text: string }>;
  }>;
  assert.deepEqual(editorial.map(({ domain }) => domain).sort(), [...DISCOVERY_PREMIUM_DOMAINS].sort());
  assert.equal(new Set(editorial.map(({ domain }) => domain)).size, DISCOVERY_PREMIUM_DOMAINS.length);
  assert.equal(editorial.every(({ snippets }) => snippets.length === 4), true);
  for (const { domain, synthesis, snippets } of editorial) {
    for (const [label, text] of [
      [`${domain}:synthesis`, synthesis],
      ...snippets.map(({ id, text }) => [`${domain}:${id}`, text]),
    ] as Array<[string, string]>) {
      assert.deepEqual(
        validateDiscoveryLinguisticQuality(text).filter((error) => error.startsWith("accentless_french:")),
        [],
        `editorial:${label}`,
      );
    }
  }

  const snapshot = getDiscoveryMechanismCatalogSnapshot() as any;
  const expectedSnapshot = {
    editorialSourceSha256: DISCOVERY_MECHANISM_EDITORIAL_SOURCE_SHA256,
    version: DISCOVERY_MECHANISM_CATALOG_VERSION,
    domainOrder: [...DISCOVERY_PREMIUM_DOMAINS],
    synthesis: Object.fromEntries(editorial.map(({ domain, synthesis }) => [domain, synthesis])),
    sections: Object.fromEntries(editorial.map(({ domain, snippets }) => [domain, {
      entries: Object.fromEntries(snippets.map(({ id, text }) => [id, text])),
    }])),
  };
  assert.deepEqual(snapshot, expectedSnapshot, "editorial JSON and runtime TypeScript catalog diverged");
  for (const domain of DISCOVERY_PREMIUM_DOMAINS) {
    for (const [label, text] of [
      [`${domain}:synthesis`, snapshot.synthesis[domain]],
      ...Object.entries(snapshot.sections[domain].entries).map(([id, text]) => [`${domain}:${id}`, String(text)]),
    ] as Array<[string, string]>) {
      assert.deepEqual(
        validateDiscoveryLinguisticQuality(text).filter((error) => error.startsWith("accentless_french:")),
        [],
        `runtime:${label}`,
      );
    }
  }
  assert.doesNotMatch(snapshot.sections.lifestyle.entries.lifestyle_01, /réduit[^.]+réduit/u);
  assert.equal(createHash("sha256").update(JSON.stringify(snapshot)).digest("hex"), DISCOVERY_MECHANISM_CATALOG_SHA256);
  const mutated = structuredClone(snapshot);
  mutated.sections.sommeil.entries.sommeil_01 += " mutation";
  assert.notEqual(createHash("sha256").update(JSON.stringify(mutated)).digest("hex"), DISCOVERY_MECHANISM_CATALOG_SHA256);
});

test("case_08: une sélection structurée assemble la synthèse et quatre snippets uniques par domaine", () => {
  const responses = baseResponses();
  const selection = buildDiscoveryDefaultMechanismSelection();
  const validated = validateDiscoveryGeneratedNarrative(selection, responses, calculateDiscoveryDeterministicProfile(responses).safetyPolicy);
  assert.equal(validated.catalogProvenance?.selectionSha256, discoveryCatalogSelectionSha256(selection));
  for (const domain of DISCOVERY_PREMIUM_DOMAINS) {
    const paragraphs = validated.sections[domain].split(/\n{2,}/u);
    assert.equal(paragraphs.length, 5, domain);
    assert.equal(new Set(paragraphs).size, 5, domain);
    assert.ok(paragraphs.join(" ").length >= 1_400, domain);
  }
});

test("case_09: les six paires possibles par domaine restent déterministes et complètes", () => {
  const responses = baseResponses();
  const policy = calculateDiscoveryDeterministicProfile(responses).safetyPolicy;
  for (const domain of DISCOVERY_PREMIUM_DOMAINS) {
    const ids = [1, 2, 3, 4].map((index) => domain + "_0" + index);
    for (let left = 0; left < ids.length; left += 1) {
      for (let right = left + 1; right < ids.length; right += 1) {
        const selection = buildDiscoveryDefaultMechanismSelection();
        selection.sections[domain] = [ids[left], ids[right]];
        const validated = validateDiscoveryGeneratedNarrative(selection, responses, policy);
        assert.deepEqual(
          validateDiscoveryLinguisticQuality([
            validated.synthesis,
            ...Object.values(validated.sections),
          ].join("\n\n")).filter((error) => error.startsWith("accentless_french:")),
          [],
          `selection:${domain}:${ids[left]}:${ids[right]}`,
        );
        const paragraphs = validated.sections[domain].split(/\n{2,}/u);
        assert.equal(paragraphs.length, 5, domain + ":" + ids[left] + ":" + ids[right]);
        assert.equal(new Set(paragraphs).size, 5, domain);
      }
    }
  }
});

test("case_09b: la sélection Alexandre garde les enums apres-* internes hors du gate linguistique", () => {
  const responses = baseResponses({
    prenom: "Alexandre",
    "heure-coucher": "apres-00h",
    ballonnements: "apres-repas",
  });
  const report = exactCatalogReport(responses);
  const assets = buildDiscoveryReportAssets(report);
  assert.equal(responses["heure-coucher"], "apres-00h");
  assert.equal(responses.ballonnements, "apres-repas");
  const visibleProse = report.sections.map((section) => section.content).join("\n");
  assert.match(visibleProse, /ballonnements\s*:\s*après-repas/u);
  assert.doesNotMatch(visibleProse, /\bapres\b/iu);
  const validation = validateDiscoveryReportForDelivery(report, assets, report.analysisMetadata);
  assert.equal(validation.ok, true, JSON.stringify(validation.errors));
  assert.equal(validation.errors.includes("linguistic:accentless_french:apres"), false);
  assert.equal(validation.errors.includes("metadata_linguistic:accentless_french:apres"), false);
});

test("case_10: champs libres, ID inconnu, doublon, hash et version divergent sont refusés", () => {
  const responses = baseResponses();
  const policy = calculateDiscoveryDeterministicProfile(responses).safetyPolicy;
  const base = buildDiscoveryDefaultMechanismSelection();
  for (const candidate of [
    { ...base, prose: "texte libre" },
    { ...base, catalogVersion: "other" },
    { ...base, catalogSha256: "0".repeat(64) },
    { ...base, sections: { ...base.sections, sommeil: ["sommeil_03", "sommeil_03"] } },
    { ...base, sections: { ...base.sections, sommeil: ["sommeil_03", "sommeil_99"] } },
  ]) assert.throws(() => validateDiscoveryGeneratedNarrative(candidate, responses, policy));
});

test("case_11: le sceau catalogue ignore seulement le deliveryGate attaché et refuse toute autre mutation", () => {
  const responses = baseResponses();
  const report = exactCatalogReport(responses);
  const baseline = validateDiscoveryReportAgainstResponses(report, responses, report.analysisMetadata);
  assert.equal(baseline.ok, true, JSON.stringify(baseline.errors));

  const mutations: Array<[string, (candidate: any) => void]> = [
    ["prefixe", (candidate) => { candidate.sections.find((section: any) => section.id === "sommeil").content = `<p>Phrase ajoutée.</p>${candidate.sections.find((section: any) => section.id === "sommeil").content}`; }],
    ["suffixe", (candidate) => { candidate.sections.find((section: any) => section.id === "stress").content += "<p>Phrase ajoutée.</p>"; }],
    ["ordre", (candidate) => { [candidate.sections[2], candidate.sections[3]] = [candidate.sections[3], candidate.sections[2]]; }],
    ["client", (candidate) => { candidate.clientName = "MutationSynthetic"; }],
    ["titre", (candidate) => { candidate.sections[0].title += " modifié"; }],
    ["chip", (candidate) => { candidate.sections.find((section: any) => section.id === "nutrition").chips.push("Ajout"); }],
    ["metadata", (candidate) => { candidate.analysisMetadata.extra = true; }],
    ["validation imbriquée", (candidate) => { candidate.validationResult.review = "approved"; }],
  ];
  for (const [label, mutate] of mutations) {
    const candidate = structuredClone(report);
    mutate(candidate);
    const validation = validateDiscoveryReportAgainstResponses(candidate, responses, candidate.analysisMetadata);
    assert.equal(validation.ok, false, label);
    assert.ok(validation.errors.includes("report:catalog_deterministic_reconstruction_mismatch"), label);
  }
});

test("case_12: un rapport catalogue public exige sa preuve ledger durable exacte", () => {
  const responses = baseResponses();
  const report = exactCatalogReport(responses);
  const assets = buildDiscoveryReportAssets(report);
  const source = {
    type: "GRATUIT",
    reportDeliveryStatus: "READY",
    narrativeReport: report,
    reportTxt: assets.txt,
    reportHtml: assets.html,
    responses,
    reportArtifacts: [{
      txt: assets.txt,
      html: assets.html,
      contentSha256: createHash("sha256")
        .update(`txt\0${assets.txt}\0html\0${assets.html}`)
        .digest("hex"),
    }],
  };
  assert.equal(canExposeDiscoveryReport(source), false, "missing durable ledger binding");
  assert.equal(canExposeDiscoveryReport({ ...source, catalogLedgerBound: false }), false);
  assert.equal(canExposeDiscoveryReport({ ...source, catalogLedgerBound: true }), true);

  const reorderObjectKeys = (value: any): any => {
    if (Array.isArray(value)) return value.map(reorderObjectKeys);
    if (!value || typeof value !== "object") return value;
    return Object.fromEntries(Object.keys(value).sort().reverse()
      .map((key) => [key, reorderObjectKeys(value[key])]));
  };
  assert.equal(canExposeDiscoveryReport({
    ...source,
    narrativeReport: reorderObjectKeys(report),
    catalogLedgerBound: true,
  }), true, "JSONB key reordering must not invalidate deterministic metadata");

  const mutatedReport = structuredClone(report);
  mutatedReport.sections.find((section: any) => section.id === "lifestyle").content += "<p>Mutation.</p>";
  assert.equal(canExposeDiscoveryReport({
    ...source,
    narrativeReport: mutatedReport,
    catalogLedgerBound: true,
  }), false, "a ledger boolean cannot authorize mutated report content");

  const mutatedProvenance = structuredClone(report);
  mutatedProvenance.analysisMetadata.catalogProvenance.selectionSha256 = "0".repeat(64);
  assert.equal(canExposeDiscoveryReport({
    ...source,
    narrativeReport: mutatedProvenance,
    catalogLedgerBound: true,
  }), false, "a ledger boolean cannot authorize mutated catalogue provenance");

  const mutatedArtifact = structuredClone(source.reportArtifacts[0]);
  mutatedArtifact.txt += "\nmutation";
  assert.equal(canExposeDiscoveryReport({
    ...source,
    reportArtifacts: [mutatedArtifact],
    catalogLedgerBound: true,
  }), false, "a ledger boolean cannot authorize mutated public artifacts");
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
  const fixture = readFileSync(
    new URL("./fixtures/discovery-legacy-safe-cases.json", import.meta.url),
    "utf8",
  );
  assertNoLiveIdentityInTrackedAsset(fixture, "synthetic_fixture");
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
