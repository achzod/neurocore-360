import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  assertDiscoveryPremiumKnowledgeContext,
  getDiscoveryKnowledgePreflightDiagnostic,
  sanitizeDiscoveryKnowledgeContext,
} from "./discoveryKnowledgePolicy";
import {
  analyzeDiscoveryScan,
  buildDiscoveryReportAssets,
  buildDiscoveryKnowledgeFallbackQueries,
  buildDiscoveryQuestionnaireFacts,
  countDiscoveryVisibleChars,
  convertToNarrativeReport,
  DISCOVERY_KNOWLEDGE_CANDIDATE_LIMIT,
  DISCOVERY_UNIFIED_MAX_ESTIMATED_COST_USD,
  DISCOVERY_UNIFIED_MAX_INPUT_CHARS,
  DISCOVERY_UNIFIED_MAX_OUTPUT_TOKENS,
  DISCOVERY_PREMIUM_DOMAINS,
  filterDiscoveryRelevantArticles,
  neutralizeDiscoverySourceAttribution,
  normalizeDiscoveryFrenchSurface,
  repairDiscoveryKnownFrenchCorruptions,
  repairDiscoveryProvidedFactAbsenceClaims,
  calculateDiscoveryGlobalScore,
  scoreDiscoveryTraining,
  validateDiscoveryFactualConsistency,
  validateDiscoveryGeneratedNarrative,
  validateDiscoveryLinguisticQuality,
  validateDiscoveryNonRenderedMetadata,
  validateDiscoveryReportForDelivery,
  validateDiscoverySectionContent,
} from "./discovery-scan";
import { deriveDiscoverySafetyPolicy } from "./discoverySafetyPolicy";
import { normalizeResponses } from "./responseNormalizer";
import {
  assertDiscoveryCanaryBudget,
  compactDiscoveryCanaryKnowledge,
  DISCOVERY_CANARY_KNOWLEDGE_CHARS_PER_SCOPE,
  estimateDiscoveryCanaryBudget,
  runDiscoveryCanaryProviderStage,
} from "../scripts/discovery-unified-isolated-canary";

test("canonical English scientific evidence is preserved while source attribution is removed", () => {
  const raw = `Huberman Lab\nThe circadian system coordinates sleep timing with cortisol and melatonin.\nThis evidence explains how light exposure changes the phase response curve and sleep pressure.\nThe mechanism is directly relevant to recovery, glucose regulation and endocrine health.`;
  const sanitized = sanitizeDiscoveryKnowledgeContext(raw);

  assert.match(sanitized, /The circadian system coordinates sleep timing/);
  assert.match(sanitized, /light exposure changes the phase response curve/);
  assert.doesNotMatch(sanitized, /Huberman/i);
});

test("knowledge selection removes irrelevant disease filler and keeps direct domain evidence", () => {
  const selected = filterDiscoveryRelevantArticles([
    { title: "Parkinson and sleep", content: "sleep circadian melatonin" },
    { title: "Road accidents after sleep loss", content: "sleep deprivation and driving" },
    { title: "Sleep regularity and circadian rhythm", content: "sleep quality circadian rhythm melatonin recovery" },
    { title: "Foot and ankle mobility", content: "sleep mentioned once" },
  ], ["sleep", "circadian", "melatonin"], 2);

  assert.deepEqual(selected.map((article) => article.title), ["Sleep regularity and circadian rhythm"]);
});

test("Discovery ranks a bounded candidate pool before top-two selection", () => {
  const recentNoise = Array.from({ length: 6 }, (_, index) => ({
    title: `Recent generic item ${index}`,
    content: "sleep appears once beside unrelated Parkinson and foot material",
  }));
  const olderDirectEvidence = {
    title: "Sleep regularity and circadian rhythm",
    content: "sleep quality circadian rhythm melatonin adenosine recovery ".repeat(8),
  };

  assert.deepEqual(
    filterDiscoveryRelevantArticles(recentNoise, ["sleep", "circadian", "melatonin"], 2),
    [],
    "the former SQL LIMIT 6 candidate window reproduces the 0/200 regression",
  );
  const selected = filterDiscoveryRelevantArticles(
    [...recentNoise, olderDirectEvidence],
    ["sleep", "circadian", "melatonin"],
    2,
  );
  assert.deepEqual(selected.map((article) => article.title), [olderDirectEvidence.title]);
  assert.ok(DISCOVERY_KNOWLEDGE_CANDIDATE_LIMIT > recentNoise.length);
});

test("sleep fallback queries use corpus-language scientific terms, not the French UI label", () => {
  const queries = buildDiscoveryKnowledgeFallbackQueries([
    "sleep", "circadian", "melatonin", "adenosine", "insomnia", "sommeil",
  ]);
  assert.deepEqual(queries, ["sleep", "circadian", "melatonin", "adenosine", "insomnia"]);
  assert.equal(queries.includes("sommeil"), false);
});

test("premium knowledge validation fails closed for empty or undersized context", () => {
  assert.throws(
    () => assertDiscoveryPremiumKnowledgeContext("", "synthesis"),
    /0\/200 characters.*fail-closed.*forbidden/i,
  );
  assert.throws(
    () => assertDiscoveryPremiumKnowledgeContext("short evidence", "section sleep"),
    /Knowledge context unavailable for section sleep/i,
  );
});

test("premium knowledge validation accepts a canonical context above the threshold", () => {
  const context = "Scientific mechanism and clinically relevant detail. ".repeat(8);
  assert.equal(assertDiscoveryPremiumKnowledgeContext(context, "synthesis"), context.trim());
});

test("zero training cannot be presented as a correct 70/100", () => {
  assert.equal(scoreDiscoveryTraining({ "sport-frequence": "0" }), 45);
  assert.equal(scoreDiscoveryTraining({ "sport-frequence": "1-2" }), 85);
  assert.equal(scoreDiscoveryTraining({ "sport-frequence": "3-4" }), 100);
  assert.equal(calculateDiscoveryGlobalScore({
    sommeil: 65,
    stress: 55,
    energie: 80,
    digestion: 75,
    training: 45,
    nutrition: 75,
    lifestyle: 55,
    mindset: 95,
  }), 67);
});

test("Discovery generation has no degraded path and preflights all knowledge before OpenAI", () => {
  const source = readFileSync(new URL("./discovery-scan.ts", import.meta.url), "utf8");

  assert.doesNotMatch(source, /Generation en mode degrade/);
  assert.match(source, /const knowledgePreflight = await preflightDiscoveryKnowledge/);
  assert.match(source, /for \(const domain of domains\)/);
  assert.match(source, /dependencies\.generateNarrative \|\| generateDiscoveryNarrativeAI/);
  assert.match(source, /label:\s*"discovery-unified-report"/);
  assert.doesNotMatch(source, /knowledgeContexts = await Promise\.all/);
});

test("transient DB timeout exhausts bounded retries with zero OpenAI calls", async () => {
  const canonicalContext = "Canonical scientific mechanism with enough precise evidence for premium generation. ".repeat(6);
  let openAICalls = 0;
  let domainCalls = 0;
  const retryDelays: number[] = [];

  await assert.rejects(
    analyzeDiscoveryScan(
      { prenom: "Canary", email: "canary@example.test", objectif: "performance" },
      {
        loadSynthesisKnowledge: async () => canonicalContext,
        loadDomainKnowledge: async () => {
          domainCalls += 1;
          const error = new Error("timeout exceeded when trying to connect");
          (error as Error & { code?: string }).code = "ETIMEDOUT";
          throw error;
        },
        generateNarrative: async () => {
          openAICalls += 1;
          return { synthesis: "must not run", sections: {} };
        },
        retryDelay: async (milliseconds) => { retryDelays.push(milliseconds); },
      },
    ),
    /timeout exceeded/i,
  );

  assert.equal(domainCalls, 3);
  assert.deepEqual(retryDelays, [250, 750]);
  assert.equal(openAICalls, 0);
});

test("sleep 0/200 fails closed before OpenAI and exposes only safe structured metadata", async () => {
  const canonicalContext = "Canonical scientific mechanism with enough precise evidence for premium generation. ".repeat(6);
  let openAICalls = 0;
  let capturedError: unknown;

  try {
    await analyzeDiscoveryScan(
      { prenom: "Canary", email: "secret@example.test", objectif: "performance" },
      {
        loadSynthesisKnowledge: async () => canonicalContext,
        loadDomainKnowledge: async (domain) => domain === "sommeil" ? "" : canonicalContext,
        generateNarrative: async () => {
          openAICalls += 1;
          return { synthesis: "must not run", sections: {} };
        },
        retryDelay: async () => {},
      },
    );
  } catch (error) {
    capturedError = error;
  }

  assert.equal(openAICalls, 0);
  assert.match(String(capturedError), /section sommeil: 0\/200 characters/i);
  const diagnostic = getDiscoveryKnowledgePreflightDiagnostic(capturedError);
  assert.deepEqual(diagnostic, {
    stage: "knowledge_preflight",
    failureKind: "undersized_context",
    scope: "section sommeil",
    actualChars: 0,
    minimumChars: 200,
    errorCode: "DISCOVERY_KNOWLEDGE_CONTEXT_UNDERSIZED",
  });
  const serialized = JSON.stringify(diagnostic);
  assert.doesNotMatch(serialized, /secret@example\.test|Canonical scientific mechanism/);
});

test("knowledge loader diagnostics never echo an arbitrary error message or unsafe code", () => {
  const error = new Error("password=top-secret knowledge body must never reach stdout") as Error & { code?: string };
  error.code = "57P01 password=top-secret";
  const serialized = JSON.stringify(getDiscoveryKnowledgePreflightDiagnostic(error));

  assert.doesNotMatch(serialized, /top-secret|knowledge body|password/i);
  assert.match(serialized, /DISCOVERY_KNOWLEDGE_LOAD_ERROR/);
});

test("isolated canary preflight-only mode succeeds without an OpenAI key and never enters the provider", async () => {
  const canonicalContext = "Canonical scientific mechanism with enough precise evidence for premium generation. ".repeat(6);
  const knowledge = {
    synthesis: canonicalContext,
    domains: Object.fromEntries(DISCOVERY_PREMIUM_DOMAINS.map((domain) => [domain, canonicalContext])),
  };
  let providerCalls = 0;
  let budgetChecks = 0;
  const output: string[] = [];
  const result = await runDiscoveryCanaryProviderStage(
    knowledge,
    async () => {
      providerCalls += 1;
      return { forbidden: true };
    },
    {
      env: {
        DISCOVERY_CANARY_PREFLIGHT_ONLY: "true",
        OPENAI_API_KEY: undefined,
      },
      emit: (line) => output.push(line),
      validateBudget: () => {
        budgetChecks += 1;
        assertDiscoveryCanaryBudget(52_825);
      },
    },
  );

  assert.equal(result, null);
  assert.equal(providerCalls, 0);
  assert.equal(budgetChecks, 0, "preflight-only must return before the full prompt budget guard");
  assert.equal(output.length, 1);
  const summary = JSON.parse(output[0].slice(output[0].indexOf(":") + 1));
  assert.equal(summary.providerCalls, 0);
  assert.deepEqual(summary.scopes.map((scope: { scope: string }) => scope.scope), [
    "synthesis",
    ...DISCOVERY_PREMIUM_DOMAINS.map((domain) => `section ${domain}`),
  ]);
  assert.doesNotMatch(output[0], /Canonical scientific mechanism/);

  const source = readFileSync(
    new URL("../scripts/discovery-unified-isolated-canary.ts", import.meta.url),
    "utf8",
  );
  const preflightOnlyBranch = source.indexOf(
    'if (env.DISCOVERY_CANARY_PREFLIGHT_ONLY === "true") {',
  );
  const branchEnd = source.indexOf("\n  options.validateBudget?.();", preflightOnlyBranch);
  const providerPath = source.indexOf("const result = await runDiscoveryCanaryProviderStage(");

  assert.ok(preflightOnlyBranch >= 0, "explicit preflight-only flag is required");
  assert.ok(branchEnd > preflightOnlyBranch, "preflight-only helper must have a bounded body");
  assert.ok(providerPath > branchEnd, "provider stage must use the guarded helper");
  const branchSource = source.slice(preflightOnlyBranch, branchEnd);
  assert.match(branchSource, /providerCalls:\s*0/);
  assert.match(branchSource, /return null;/);
  assert.doesNotMatch(branchSource, /email|JSON\.stringify\(knowledge\)/);
  assert.ok(
    source.indexOf("options.validateBudget?.();") > branchEnd,
    "full prompt budget validation must stay after the preflight-only return",
  );
});

test("isolated canary normal mode rejects 52825/52800 at the budget guard before provider", async () => {
  const canonicalContext = "Canonical scientific mechanism with enough precise evidence for premium generation. ".repeat(6);
  const knowledge = {
    synthesis: canonicalContext,
    domains: Object.fromEntries(DISCOVERY_PREMIUM_DOMAINS.map((domain) => [domain, canonicalContext])),
  };
  let providerCalls = 0;

  await assert.rejects(
    runDiscoveryCanaryProviderStage(
      knowledge,
      async () => {
        providerCalls += 1;
        return { forbidden: true };
      },
      {
        env: {
          DISCOVERY_CANARY_PREFLIGHT_ONLY: "false",
          OPENAI_API_KEY: "must-not-be-used",
        },
        validateBudget: () => {
          assertDiscoveryCanaryBudget(52_825);
        },
      },
    ),
    /CANARY_PREFLIGHT_BLOCKED:input_budget:52825\/52800/,
  );
  assert.equal(providerCalls, 0);
});

test("isolated canary normal mode keeps nine useful scientific excerpts and passes the real budget with one provider call", async () => {
  const keywords: Record<string, string> = {
    synthesis: "recovery",
    sommeil: "circadian",
    stress: "cortisol",
    energie: "mitochondria",
    digestion: "microbiome",
    training: "hypertrophy",
    nutrition: "protein",
    lifestyle: "sunlight",
    mindset: "adherence",
  };
  const evidence = (scope: string, keyword: string) => [
    `${scope} evidence explains the ${keyword} mechanism with a direct physiological pathway.`,
    `The observed response depends on dose, timing, baseline status, and recovery context.`,
    `Controlled evidence supports a cautious interpretation instead of a diagnostic claim.`,
    `The practical implication is measurable, reversible, and linked to the questionnaire facts.`,
    `Limits and uncertainty remain explicit so the report never overstates causality.`,
    `This final sentence preserves enough domain detail for a precise premium explanation.`,
  ].join(" ");
  const fullKnowledge = {
    synthesis: evidence("synthesis", keywords.synthesis),
    domains: Object.fromEntries(
      DISCOVERY_PREMIUM_DOMAINS.map((domain) => [domain, evidence(domain, keywords[domain])]),
    ),
  };
  const compactKnowledge = compactDiscoveryCanaryKnowledge(fullKnowledge);
  const excerpts = [
    ["synthesis", compactKnowledge.synthesis],
    ...DISCOVERY_PREMIUM_DOMAINS.map((domain) => [domain, compactKnowledge.domains[domain]]),
  ] as Array<[string, string]>;

  assert.equal(excerpts.length, 9);
  for (const [scope, excerpt] of excerpts) {
    assert.equal(excerpt.length, DISCOVERY_CANARY_KNOWLEDGE_CHARS_PER_SCOPE);
    assert.ok(excerpt.length >= 400, `${scope} must retain at least twice the 200-character gate`);
    assert.match(excerpt, new RegExp(`\\b${keywords[scope]}\\b`, "i"));
    assert.ok((excerpt.match(/[.!?]/g) || []).length >= 3, `${scope} must retain multiple complete evidence statements`);
    assert.doesNotMatch(excerpt, /placeholder|lorem ipsum/i);
  }

  const budget = estimateDiscoveryCanaryBudget(compactKnowledge);
  assert.ok(budget.inputTokenUpperBound <= 52_200, `expected robust input margin, got ${budget.inputTokenUpperBound}`);
  assert.ok(52_800 - budget.inputTokenUpperBound >= 600);
  assert.ok(0.75 - budget.worstCaseCostUsd >= 0.004);

  let providerCalls = 0;
  let budgetChecks = 0;
  const result = await runDiscoveryCanaryProviderStage(
    compactKnowledge,
    async () => {
      providerCalls += 1;
      return { generated: true };
    },
    {
      env: {
        DISCOVERY_CANARY_PREFLIGHT_ONLY: "false",
        OPENAI_API_KEY: "provider-mock-only",
      },
      validateBudget: () => {
        budgetChecks += 1;
        assertDiscoveryCanaryBudget(budget.inputTokenUpperBound);
      },
    },
  );

  assert.deepEqual(result, { generated: true });
  assert.equal(budgetChecks, 1);
  assert.equal(providerCalls, 1);
});

test("isolated canary normal mode without an OpenAI key blocks before the provider", async () => {
  const canonicalContext = "Canonical scientific mechanism with enough precise evidence for premium generation. ".repeat(6);
  const knowledge = {
    synthesis: canonicalContext,
    domains: Object.fromEntries(DISCOVERY_PREMIUM_DOMAINS.map((domain) => [domain, canonicalContext])),
  };
  let providerCalls = 0;

  await assert.rejects(
    runDiscoveryCanaryProviderStage(
      knowledge,
      async () => {
        providerCalls += 1;
        return { forbidden: true };
      },
      {
        env: {
          DISCOVERY_CANARY_PREFLIGHT_ONLY: "false",
          OPENAI_API_KEY: undefined,
        },
      },
    ),
    /CANARY_PREFLIGHT_BLOCKED:openai_key_missing/,
  );
  assert.equal(providerCalls, 0);
});

test("knowledge preflight is sequential and covers synthesis plus all eight domains", async () => {
  const canonicalContext = "Canonical scientific mechanism with enough precise evidence for premium generation. ".repeat(6);
  const loaded: string[] = [];
  let concurrent = 0;
  let maxConcurrent = 0;
  let openAICalls = 0;
  const load = async (scope: string) => {
    concurrent += 1;
    maxConcurrent = Math.max(maxConcurrent, concurrent);
    await Promise.resolve();
    loaded.push(scope);
    concurrent -= 1;
    return canonicalContext;
  };

  const result = await analyzeDiscoveryScan(
    { prenom: "Canary", email: "canary@example.test", objectif: "performance" },
    {
      loadSynthesisKnowledge: async () => load("synthesis"),
      loadDomainKnowledge: async (domain) => load(domain),
      generateNarrative: async () => {
        openAICalls += 1;
        assert.deepEqual(loaded, ["synthesis", ...DISCOVERY_PREMIUM_DOMAINS]);
        return { synthesis: "Synthese premium valide", sections: {} };
      },
      retryDelay: async () => {},
    },
  );

  assert.equal(maxConcurrent, 1);
  assert.equal(openAICalls, 1);
  assert.deepEqual(Object.keys(result.knowledgePreflight.domains), [...DISCOVERY_PREMIUM_DOMAINS]);
});

test("an encyclopedic 13,910-char section is rejected as commercially overlong", () => {
  const paragraph = "Ton energie cellulaire depend de mecanismes mitochondriaux precis, relies a ton sommeil, ton stress et ta nutrition quotidienne. ".repeat(5);
  let clean = Array.from({ length: 24 }, () => paragraph).join("\n\n");
  clean = clean.padEnd(13_910, " physiologie adaptee");
  const validation = validateDiscoverySectionContent(clean);
  assert.ok(validation.charCount >= 13_910);
  assert.ok(validation.wordCount >= 2_115);
  assert.ok(validation.lineCount >= 24);
  assert.equal(validation.paragraphCount, 24);
  assert.ok(validation.reasons.some((reason) => reason.startsWith("chars_max:")));
  assert.ok(validation.reasons.some((reason) => reason.startsWith("words_max:")));
});

test("the same dense section remains fail-closed on forbidden qualitative content", () => {
  const paragraph = "Ton energie cellulaire depend de mecanismes mitochondriaux precis, relies a ton sommeil, ton stress et ta nutrition quotidienne. ".repeat(5);
  let forbidden = Array.from({ length: 24 }, () => paragraph).join("\n\n");
  forbidden = `${forbidden}\n\nNotre client doit suivre ce conseil selon Huberman.`.padEnd(13_910, " physiologie adaptee");
  const validation = validateDiscoverySectionContent(forbidden);
  assert.equal(validation.isValid, false);
  assert.ok(validation.reasons.includes("client_voice"));
  assert.ok(validation.reasons.includes("collective_voice"));
  assert.ok(validation.reasons.includes("source_name"));
});

test("sleep prose mentioning physiological resources is not a source-name false positive", () => {
  const paragraph = "Tes ressources physiologiques nocturnes dépendent de la pression homéostatique, de l'adénosine et du rythme circadien. Cette interaction conserve le mécanisme scientifique et personnalise l'analyse de ton sommeil. ".repeat(3);
  const sleep = Array.from({ length: 5 }, () => paragraph).join("\n\n").padEnd(1_600, " récupération nocturne");
  const validation = validateDiscoverySectionContent(sleep);

  assert.equal(validation.isValid, true);
  assert.doesNotMatch(validation.reasons.join(","), /source_name|explicit_sources/);
});

test("named source attribution is neutralized without deleting the scientific claim", () => {
  const raw = "Selon Matthew Walker, la pression homeostatique augmente avec l'adenosine et interagit avec le rythme circadien. Tes ressources physiologiques restent mobilisees pendant la recuperation.";
  const cleaned = neutralizeDiscoverySourceAttribution(raw);

  assert.doesNotMatch(cleaned, /Matthew Walker/i);
  assert.match(cleaned, /pression homeostatique augmente avec l'adenosine/i);
  assert.match(cleaned, /rythme circadien/i);
  assert.match(cleaned, /Tes ressources physiologiques/i);
  assert.equal(validateDiscoverySectionContent(cleaned).reasons.includes("source_name"), false);
});

test("explicit bibliography lines are removed while neighboring evidence remains", () => {
  const raw = "La melatonine avance ou retarde la phase circadienne selon l'heure d'exposition.\n\nSources: Huberman Lab, Matthew Walker.\n\nLa pression de sommeil continue d'augmenter avec l'adenosine.";
  const cleaned = neutralizeDiscoverySourceAttribution(raw);

  assert.doesNotMatch(cleaned, /Sources|Huberman|Matthew Walker/i);
  assert.match(cleaned, /melatonine avance ou retarde la phase circadienne/i);
  assert.match(cleaned, /pression de sommeil continue d'augmenter/i);
});

test("ordinary stress-source and reference-value wording is not treated as bibliography", () => {
  const paragraph = "Ta principale source de stress maintient une activation sympathique mesurable. Cette valeur de référence permet de relier ton cortisol, ta variabilité cardiaque et la qualité de ta récupération sans attribuer le mécanisme à un auteur. ".repeat(3);
  const stress = Array.from({ length: 5 }, () => paragraph).join("\n\n").padEnd(1_600, " régulation autonome");
  const validation = validateDiscoverySectionContent(stress);

  assert.equal(validation.isValid, true);
  assert.doesNotMatch(validation.reasons.join(","), /explicit_sources|source_name/);
});

test("a true bibliography label remains rejected when validation receives it", () => {
  const paragraph = "Ta regulation du stress depend du cortisol, de l'axe HPA et du tonus vagal. ".repeat(10);
  const withBibliography = `${Array.from({ length: 24 }, () => paragraph).join("\n\n")}\n\nSources: https://example.test, PMID 123456.`;
  const validation = validateDiscoverySectionContent(withBibliography);

  assert.equal(validation.isValid, false);
  assert.ok(validation.reasons.includes("explicit_sources"));
});

test("known malformed French fragments are repaired exactly while the final gate rejects residual corruption", () => {
  const paragraph = "Ta récupération dépend du sommeil, du stress et de la disponibilité énergétique. ".repeat(10);
  const dense = Array.from({ length: 24 }, () => paragraph).join("\n\n");

  assert.equal(
    repairDiscoveryKnownFrenchCorruptions("La progression avance de façje linéaire avec une autre leçj'utile."),
    "La progression avance de façon linéaire avec une autre leçon utile.",
  );
  assert.equal(
    repairDiscoveryKnownFrenchCorruptions("Un fragment çj-inconnu reste visible."),
    "Un fragment çj-inconnu reste visible.",
  );
  for (const corrupted of ["manger de façje qualitative", "une autre leçj'utile"]) {
    const validation = validateDiscoverySectionContent(`${dense}\n\n${corrupted}.`);
    assert.equal(validation.isValid, false);
    assert.ok(validation.reasons.includes("malformed_french_fragment"));
  }
  const residual = validateDiscoverySectionContent(`${dense}\n\nUn fragment çj-inconnu reste présent.`);
  assert.equal(residual.isValid, false);
  assert.ok(residual.reasons.includes("malformed_french_fragment"));
});

test("zero-blockage opening never claims invisible blockages or plateaus", () => {
  const source = readFileSync(new URL("./discovery-scan.ts", import.meta.url), "utf8");
  assert.match(source, /Aucun blocage critique n'est calculé/);
  assert.doesNotMatch(source, /\$\{result\.blocages\.length\} blocages structurants, souvent invisibles/);
});

test("synthesis and every domain receive all supplied questionnaire facts", () => {
  const facts = buildDiscoveryQuestionnaireFacts({
    prenom: "Thomas",
    email: "private@example.test",
    age: "27",
    poids: "79",
    taille: "184",
    "sport-frequence": "3-4",
    "type-sport": ["musculation"],
    profession: "bureau",
    "qualite-sommeil": "moyenne",
  });

  assert.match(facts, /- poids: 79 kg/);
  assert.match(facts, /- taille: 184 cm/);
  assert.match(facts, /- sport-frequence: 3 a 4 seances par semaine/);
  assert.match(facts, /- type-sport: musculation/);
  assert.match(facts, /- profession: bureau/);
  assert.match(facts, /- qualite-sommeil: moyenne/);
  assert.doesNotMatch(facts, /private@example\.test/);

  const source = readFileSync(new URL("./discovery-scan.ts", import.meta.url), "utf8");
  assert.ok((source.match(/buildDiscoveryQuestionnaireFacts\(responses\)/g) || []).length >= 1);
  assert.match(source, /MISSION UNIQUE: produire tout le Discovery Scan/);
});

test("provided weight, height and training frequency cannot be declared absent", () => {
  const responses = { poids: "79", taille: "184", "sport-frequence": "3-4" };
  const reasons = validateDiscoveryFactualConsistency(
    "Sans ton poids, ta taille ni ta frequence d'entrainement, l'analyse reste incomplete.",
    responses,
  );

  assert.ok(reasons.includes("factual_presence_contradiction:poids"));
  assert.ok(reasons.includes("factual_presence_contradiction:taille"));
  assert.ok(reasons.includes("factual_presence_contradiction:sport-frequence"));

  assert.deepEqual(
    validateDiscoveryFactualConsistency(
      "Ni ton poids ni ta taille ne constituent un blocage, et ta frequence d'entrainement est coherente.",
      responses,
    ),
    [],
  );
});

test("deterministic factual repair replaces only a missing supplied weight claim", () => {
  const responses = { poids: "84" };
  const repaired = repairDiscoveryProvidedFactAbsenceClaims(
    "Sans ton poids, l'analyse ne peut pas être précise. Le reste de cette lecture demeure prudent.",
    responses,
  );

  assert.equal(
    repaired,
    "Ton poids déclaré est de 84 kg. Le reste de cette lecture demeure prudent.",
  );
  assert.deepEqual(validateDiscoveryFactualConsistency(repaired, responses), []);
});

test("deterministic factual repair replaces a combined missing-facts clause with exact supplied values", () => {
  const responses = { poids: "79", taille: "184", "sport-frequence": "3-4" };
  const repaired = repairDiscoveryProvidedFactAbsenceClaims(
    "Sans ton poids, ta taille ni ta fréquence d'entraînement, l'analyse reste incomplète.",
    responses,
  );

  assert.equal(
    repaired,
    "Ton poids déclaré est de 79 kg. Ta taille déclarée est de 184 cm. Ta fréquence d’entraînement déclarée est de 3 à 4 séances par semaine.",
  );
  assert.deepEqual(validateDiscoveryFactualConsistency(repaired, responses), []);
});

test("deterministic factual repair leaves legitimate non-blocking weight and height prose unchanged", () => {
  const responses = { poids: "79", taille: "184", "sport-frequence": "3-4" };
  const legitimate = "Ni ton poids ni ta taille ne constituent un blocage, et ta fréquence d'entraînement est cohérente.";

  assert.equal(repairDiscoveryProvidedFactAbsenceClaims(legitimate, responses), legitimate);
  assert.deepEqual(validateDiscoveryFactualConsistency(legitimate, responses), []);
});

test("unified cleanup repairs supplied-fact absence claims in synthesis and sections before the final gate", () => {
  const responses = { prenom: "Alex", poids: "84", taille: "185", "sport-frequence": "3-4" };
  const policy = deriveDiscoverySafetyPolicy(responses);
  const paragraph = "Tu as décrit une routine structurée et des repères cohérents. Le mécanisme utile concerne la récupération et son interaction possible avec ton objectif, sans permettre de poser un diagnostic. Cette lecture distingue les faits déclarés des hypothèses prudentes qui restent à confirmer. ";
  const validBody = Array.from({ length: 4 }, () => paragraph.repeat(3)).join("\n\n");
  const raw = {
    synthesis: `${validBody}\n\nSans ton poids, l'analyse resterait incomplète.`,
    sections: DISCOVERY_PREMIUM_DOMAINS.map((domain) => ({
      domain,
      content: domain === "digestion"
        ? `${validBody}\n\nSans ta taille ni ta fréquence d'entraînement, l'analyse resterait incomplète.`
        : validBody,
    })),
  };

  const validated = validateDiscoveryGeneratedNarrative(raw, responses, policy);
  assert.match(validated.synthesis, /Ton poids déclaré est de 84 kg/);
  assert.match(validated.sections.digestion, /Ta taille déclarée est de 185 cm/);
  assert.match(validated.sections.digestion, /Ta fréquence d’entraînement déclarée est de 3 à 4 séances par semaine/);
  assert.deepEqual(validateDiscoveryFactualConsistency(validated.synthesis, responses), []);
  assert.deepEqual(validateDiscoveryFactualConsistency(validated.sections.digestion, responses), []);
});

test("a supplied 3-4 session frequency rejects a claim of two weekly sessions", () => {
  const reasons = validateDiscoveryFactualConsistency(
    "Tu t'entraines deux fois par semaine et tes deux seances hebdomadaires structurent ta progression.",
    { "sport-frequence": "3-4" },
  );

  assert.deepEqual(reasons, ["factual_value_contradiction:sport-frequence"]);
  assert.deepEqual(
    validateDiscoveryFactualConsistency(
      "Tu t'entraines trois fois par semaine, ce qui correspond a tes reponses.",
      { "sport-frequence": "3-4" },
    ),
    [],
  );
});

test("Discovery keeps the exact wake-fatigue fact without inventing a rested answer", () => {
  const fromFatigue = normalizeResponses({ "reveil-fatigue": "souvent" }, { mode: "discovery" });
  assert.equal(fromFatigue["reveil-fatigue"], "souvent");
  assert.equal(fromFatigue["reveil-repose"], undefined);

  const fromRested = normalizeResponses({ "reveil-repose": "toujours" }, { mode: "discovery" });
  assert.equal(fromRested["reveil-repose"], "toujours");
  assert.equal(fromRested["reveil-fatigue"], "jamais");

  const facts = buildDiscoveryQuestionnaireFacts({ "reveil-fatigue": "souvent" });
  assert.match(facts, /- reveil-fatigue: souvent/);
  assert.doesNotMatch(facts, /- reveil-repose:/);
});

test("factual gate rejects an invented often-rested claim without blocking a negated statement", () => {
  const responses = { "reveil-fatigue": "souvent" };
  assert.deepEqual(
    validateDiscoveryFactualConsistency(
      "Tu indiques aussi te réveiller souvent reposé.",
      responses,
    ),
    ["factual_value_contradiction:reveil-fatigue", "unsupported_restatement:reveil-repose"],
  );
  assert.deepEqual(
    validateDiscoveryFactualConsistency(
      "Tu ne te réveilles pas souvent reposé, ce qui correspond à la fatigue déclarée.",
      responses,
    ),
    ["unsupported_restatement:reveil-repose"],
  );
  assert.deepEqual(
    validateDiscoveryFactualConsistency(
      "Tu déclares être souvent fatigué au réveil.",
      responses,
    ),
    [],
  );
  assert.deepEqual(
    validateDiscoveryFactualConsistency(
      "Tu te réveilles rarement reposé.",
      responses,
    ),
    ["unsupported_restatement:reveil-repose"],
  );
});

test("visible French normalization repairs exact accentless tokens and the gate remains fail-closed", () => {
  assert.equal(
    normalizeDiscoveryFrenchSurface("Je n'ai pas les elements pour conclure."),
    "Je n'ai pas les éléments pour conclure.",
  );
  assert.deepEqual(
    validateDiscoveryLinguisticQuality("Je n'ai pas les elements pour conclure."),
    ["accentless_french:element"],
  );
  assert.deepEqual(validateDiscoveryLinguisticQuality("Les éléments sont connus."), []);
  assert.equal(
    normalizeDiscoveryFrenchSurface("Une frequence de une a trois reponses apres entrainement."),
    "Une frequence d’une a trois réponses après entraînement.",
  );
  assert.equal(
    normalizeDiscoveryFrenchSurface("Le mouvement possède une fonction différente."),
    "Le mouvement possède une fonction différente.",
  );
  assert.ok(validateDiscoveryLinguisticQuality("Une fréquence de une à trois fois.").includes("grammar:de_une"));
  assert.ok(validateDiscoveryLinguisticQuality("Le résultat possèd’une forte valeur.").includes("grammar:possede_elision"));
  assert.equal(
    repairDiscoveryKnownFrenchCorruptions("Le mouvement possèd’une fonction et le résultat possèd’un intérêt."),
    "Le mouvement possède une fonction et le résultat possède un intérêt.",
  );
  assert.equal(
    repairDiscoveryKnownFrenchCorruptions("Elle ne prouve aucun dérèglement hormonal ou métabolique, mais cela reste une hypothèse prudente et non diagnostique que le questionnaire ne permet pas de confirmer."),
    "Elle ne prouve aucun dérèglement hormonal ou métabolique, et le questionnaire ne permet pas de conclure à leur présence.",
  );
});

test("factual gate rejects invented protein meal regularity and unsupported duplicate counts", () => {
  assert.deepEqual(
    validateDiscoveryFactualConsistency(
      "Tes apports en protéines sont déclarés bons et leur présence dans les repas l’est également.",
      { "proteines-jour": "bon" },
    ),
    ["factual_value_contradiction:proteines-jour-frequency"],
  );
  assert.deepEqual(
    validateDiscoveryFactualConsistency(
      "Ton apport protéique est bon, y compris leur présence aux repas, alors conserve la présence régulière de protéines.",
      { "proteines-jour": "bonne" },
    ),
    ["factual_value_contradiction:proteines-jour-frequency"],
  );
  assert.deepEqual(
    validateDiscoveryFactualConsistency(
      "Tes apports protéiques sont déclarés bons et répartis correctement entre les repas.",
      { "proteines-jour": "bonne" },
    ),
    ["factual_value_contradiction:proteines-jour-frequency"],
  );
  assert.deepEqual(
    validateDiscoveryFactualConsistency(
      "Tu déclares une source protéinée à chaque repas.",
      { "proteines-jour": "Une source protéinée à chaque repas" },
    ),
    [],
  );
  assert.deepEqual(
    validateDiscoveryFactualConsistency(
      "Ton organisation est solide. Tu l'indiques deux fois dans tes réponses.",
      { organisation: "bonne" },
    ),
    ["unsupported_questionnaire_count"],
  );
  assert.deepEqual(
    validateDiscoveryFactualConsistency(
      "Tu l'as indiqué deux fois dans tes réponses.",
      { organisation: "bonne" },
    ),
    ["unsupported_questionnaire_count"],
  );
});

test("deterministic factual repair removes only invented protein meal distribution", () => {
  const generated = "Tes apports en protéines sont déclarés bons et leur présence dans les repas l’est également. La quantité totale reste à préciser.";
  const repaired = repairDiscoveryProvidedFactAbsenceClaims(
    generated,
    { "proteines-jour": "bon" },
  );

  assert.equal(
    repaired,
    "Tes apports en protéines sont déclarés bons. La quantité totale reste à préciser.",
  );
  assert.deepEqual(
    validateDiscoveryFactualConsistency(repaired, { "proteines-jour": "bon" }),
    [],
  );

  const explicit = "Tu déclares une source protéinée à chaque repas et leur présence dans les repas est régulière.";
  assert.equal(
    repairDiscoveryProvidedFactAbsenceClaims(
      explicit,
      { "proteines-jour": "Une source protéinée à chaque repas" },
    ),
    explicit,
  );
  assert.deepEqual(
    validateDiscoveryFactualConsistency(
      explicit,
      { "proteines-jour": "Une source protéinée à chaque repas" },
    ),
    [],
  );
});

test("occasional wake fatigue is not intensified into a difficult awakening", () => {
  const responses = { "reveil-fatigue": "parfois" };
  const variants = [
    "Tu dors cinq à six heures, avec un réveil matinal difficile.",
    "La qualité est moyenne et le réveil du matin reste difficile.",
    "Tu gardes une bonne énergie malgré des réveils parfois difficiles.",
    "Cela pourrait expliquer une partie de ton réveil difficile.",
  ];

  for (const generated of variants) {
    assert.deepEqual(
      validateDiscoveryFactualConsistency(generated, responses),
      ["factual_intensity_contradiction:reveil-fatigue"],
    );
    const repaired = repairDiscoveryProvidedFactAbsenceClaims(generated, responses);
    assert.match(repaired, /(?:une|la) fatigue parfois présente au réveil/);
    assert.doesNotMatch(repaired, /réveils?.{0,28}difficile/i);
    assert.doesNotMatch(repaired, /\bde une\b/i);
    assert.deepEqual(validateDiscoveryFactualConsistency(repaired, responses), []);
  }

  const exact = "Tu te réveilles parfois fatigué, conformément à ta réponse.";
  assert.equal(repairDiscoveryProvidedFactAbsenceClaims(exact, responses), exact);
  assert.deepEqual(validateDiscoveryFactualConsistency(exact, responses), []);
});

test("generated prose cleanup uses neutral mechanical and breakfast wording", () => {
  const repaired = repairDiscoveryProvidedFactAbsenceClaims(
    "Ta récupération paraît limitée par rapport à la violence mécanique de tes séances. Tu déjeunes toujours le matin.",
    { "petit-dejeuner": "toujours" },
  );

  assert.equal(
    repaired,
    "Ta récupération paraît limitée par rapport à l’exigence mécanique de tes séances. Tu prends toujours un petit-déjeuner.",
  );
});

test("CTA is neutral toward first-person objectives and sleep title stays non-medicalizing", async () => {
  const canonicalContext = "Canonical scientific mechanism with enough precise evidence for premium generation. ".repeat(6);
  const result = await analyzeDiscoveryScan(
    {
      prenom: "ApexTest",
      objectif: "perdre progressivement du gras tout en conservant mes performances",
      "heures-sommeil": "5-6",
      "qualite-sommeil": "mauvaise",
    },
    {
      loadSynthesisKnowledge: async () => canonicalContext,
      loadDomainKnowledge: async () => canonicalContext,
      generateNarrative: async () => ({ synthesis: "Synthèse validée", sections: {} }),
      retryDelay: async () => {},
    },
  );

  assert.match(result.ctaMessage, /objectif que tu as décrit/);
  assert.match(result.ctaMessage, /^1 blocage structurant ressort de tes réponses/);
  assert.doesNotMatch(result.ctaMessage, /sans blocage critique calculé/);
  assert.doesNotMatch(result.ctaMessage, /résultats sur perdre|mes performances/);
  assert.ok(result.blocages.some((blocage) => blocage.title === "Récupération nocturne limitée"));
  assert.ok(result.blocages.every((blocage) => blocage.title !== "Déficit de sommeil chronique"));
  assert.doesNotMatch(
    JSON.stringify(result.blocages),
    /dysfonctionnement mitochondrial|inflexibilité métabolique|dépendance au glucose|T3 libre|GH effondrée|résistance à l'insuline/i,
  );
  assert.deepEqual(validateDiscoveryNonRenderedMetadata({ blocages: result.blocages, ctaMessage: result.ctaMessage }), []);
});

test("unified narrative requires exactly eight unique, valid domains", () => {
  const responses = { prenom: "Thomas", objectif: "mieux recuperer" };
  const policy = deriveDiscoverySafetyPolicy(responses);
  const paragraph = "Tu as décrit une routine régulière qui donne une base concrète. Le mécanisme utile ici concerne la récupération et son interaction possible avec ton objectif, sans permettre de poser un diagnostic. Cette lecture distingue ce que tu as déclaré de ce qui reste seulement une hypothèse à approfondir. ";
  const section = Array.from({ length: 4 }, () => paragraph.repeat(3)).join("\n\n");
  const synthesis = Array.from({ length: 4 }, () => paragraph.repeat(3)).join("\n\n");
  const raw = {
    synthesis,
    sections: DISCOVERY_PREMIUM_DOMAINS.map((domain) => ({ domain, content: section })),
  };

  const validated = validateDiscoveryGeneratedNarrative(raw, responses, policy);
  assert.deepEqual(Object.keys(validated.sections), [...DISCOVERY_PREMIUM_DOMAINS]);
  assert.throws(
    () => validateDiscoveryGeneratedNarrative({ ...raw, sections: [...raw.sections.slice(0, 7), raw.sections[0]] }, responses, policy),
    /duplicate domain/,
  );
});

test("section length uses canonical visible characters at validation and assembly", () => {
  const compactParagraph = "Tu as décrit une structure alimentaire régulière et une hydratation cohérente avec tes réponses. Cette lecture reste prudente, utile et sans protocole chiffré. ".repeat(2);
  const visibleSection = Array.from({ length: 4 }, () => compactParagraph).join("\n\n");
  const whitespaceInflated = visibleSection.replace(/ /g, "     ");

  assert.ok(whitespaceInflated.length >= 1_400, "raw whitespace reproduces the former false pass");
  assert.ok(countDiscoveryVisibleChars(whitespaceInflated) < 1_400);

  const validation = validateDiscoverySectionContent(whitespaceInflated);
  assert.equal(validation.charCount, countDiscoveryVisibleChars(whitespaceInflated));
  assert.ok(validation.reasons.includes(`chars:${validation.charCount}/1400`));
  assert.equal(validation.isValid, false);
});

test("unified cleanup and report conversion preserve nutrition while normalizing the complete visible artifact", async () => {
  const responses = { prenom: "ApexTest", objectif: "perdre du gras tout en conservant mes performances" };
  const policy = deriveDiscoverySafetyPolicy(responses);
  const standardParagraph = "Tu as décrit une routine régulière qui donne une base concrète. Le mécanisme utile ici concerne la récupération et son interaction possible avec ton objectif, sans permettre de poser un diagnostic. Je n'ai pas les elements pour transformer cette hypothèse prudente en certitude. ";
  const standardSection = Array.from({ length: 4 }, () => standardParagraph.repeat(3)).join("\n\n");
  const nutritionParagraph = "Tu déclares une source protéinée à chaque repas, trois repas et une collation, avec une hydratation régulière. Cette structure donne un repère concret sans justifier un objectif calorique, des macros, un grammage ou un protocole complet. Je conserve donc cette information exactement comme tu l'as fournie et je distingue ce fait des mécanismes seulement plausibles. ";
  const nutritionSection = Array.from({ length: 4 }, () => nutritionParagraph.repeat(2)).join("\n\n");
  const raw = {
    synthesis: standardSection,
    sections: DISCOVERY_PREMIUM_DOMAINS.map((domain) => ({
      domain,
      content: domain === "nutrition" ? nutritionSection : standardSection,
    })),
  };

  assert.equal(validateDiscoverySectionContent(nutritionSection, policy).isValid, true);
  const validated = validateDiscoveryGeneratedNarrative(raw, responses, policy);
  const nutrition = validated.sections.nutrition;

  assert.match(nutrition, /source protéinée à chaque repas/i);
  assert.equal(countDiscoveryVisibleChars(nutrition), countDiscoveryVisibleChars(nutritionSection));
  assert.ok(countDiscoveryVisibleChars(nutrition) >= 1_400);

  const report = await convertToNarrativeReport({
    globalScore: 80,
    scoresByDomain: {
      sommeil: 80,
      stress: 80,
      energie: 80,
      digestion: 80,
      training: 80,
      nutrition: 80,
      lifestyle: 80,
      mindset: 80,
    },
    blocages: [],
    synthese: validated.synthesis,
    sectionContents: validated.sections,
    ctaMessage: "Pour progresser vers l'objectif que tu as décrit, approfondis les données avant toute stratégie détaillée.",
    knowledgePreflight: { synthesis: "", domains: {} },
    safetyPolicy: policy,
  }, responses);
  const reportNutrition = report.sections.find((section) => section.id === "nutrition");

  assert.ok(reportNutrition, "the converted report must contain nutrition");
  assert.match(reportNutrition.content, /source protéinée à chaque repas/i);
  assert.ok(countDiscoveryVisibleChars(reportNutrition.content) >= 1_400);
  assert.doesNotMatch(report.sections.map((section) => section.content).join("\n"), /\belements?\b/i);
  assert.match(report.sections.map((section) => section.content).join("\n"), /éléments/i);

  for (const domain of DISCOVERY_PREMIUM_DOMAINS) {
    const domainSection = report.sections.find((section) => section.id === domain);
    assert.ok(domainSection, `missing ${domain}`);
    assert.match(domainSection.content, /Apextest/i);
  }

  const assets = buildDiscoveryReportAssets(report);
  const completeArtifact = assets.html;
  assert.doesNotMatch(completeArtifact, /\b(?:reponse|mecanisme|energie|entrainement|duree|facade|realite|biomecanique|avancee|deduction|apres|supplementaire|deja|priorites?)\b/i);
  assert.doesNotMatch(completeArtifact, /\bde\s+une\b/i);
  assert.doesNotMatch(completeArtifact, /Déficit de sommeil chronique/i);
  assert.doesNotMatch(completeArtifact, /résultats sur perdre|mes performances/);

  assert.deepEqual(validateDiscoveryReportForDelivery(report, assets), { ok: true, errors: [] });
});

test("unified end-to-end factual gate preserves the exact fatigue wording from the canary", () => {
  const responses = {
    prenom: "ApexTest",
    objectif: "progresser durablement",
    "reveil-fatigue": "souvent",
  };
  const policy = deriveDiscoverySafetyPolicy(responses);
  const paragraph = "Tu déclares une fatigue fréquente au réveil et une routine qui reste structurée. Le mécanisme possible concerne la récupération, sans permettre de poser un diagnostic ni d'inventer une donnée absente. Cette lecture distingue strictement les faits déclarés des hypothèses prudentes. ";
  const section = Array.from({ length: 4 }, () => paragraph.repeat(3)).join("\n\n");
  const raw = {
    synthesis: section,
    sections: DISCOVERY_PREMIUM_DOMAINS.map((domain) => ({
      domain,
      content: domain === "sommeil"
        ? `${section}\n\nTu te réveilles rarement reposé.`
        : section,
    })),
  };

  assert.throws(
    () => validateDiscoveryGeneratedNarrative(raw, responses, policy),
    /Discovery unified section sommeil invalid: unsupported_restatement:reveil-repose/,
  );
});

test("unified end-to-end factual gate rejects invented protein distribution", () => {
  const responses = {
    prenom: "ApexTest",
    objectif: "progresser durablement",
    "proteines-jour": "bonne",
  };
  const policy = deriveDiscoverySafetyPolicy(responses);
  const paragraph = "Tu as décrit une routine structurée et des repères cohérents. Le mécanisme possible concerne l'organisation et son interaction avec ton objectif, sans permettre de poser un diagnostic ni d'inventer une donnée absente. Cette lecture distingue strictement les faits déclarés des hypothèses prudentes. ";
  const section = Array.from({ length: 4 }, () => paragraph.repeat(3)).join("\n\n");
  const raw = {
    synthesis: section,
    sections: DISCOVERY_PREMIUM_DOMAINS.map((domain) => ({
      domain,
      content: domain === "nutrition"
        ? `${section}\n\nTes apports protéiques sont déclarés bons et répartis correctement entre les repas.`
        : section,
    })),
  };

  assert.throws(
    () => validateDiscoveryGeneratedNarrative(raw, responses, policy),
    /Discovery unified section nutrition invalid: factual_value_contradiction:proteines-jour-frequency/,
  );
});

test("unified end-to-end cleanup qualifies a provider medical assertion before the strict final gate", () => {
  const responses = { prenom: "ApexTest", objectif: "progresser durablement" };
  const policy = deriveDiscoverySafetyPolicy(responses);
  const paragraph = "Tu as décrit une routine structurée et des repères cohérents. Le mécanisme utile concerne la récupération et son interaction possible avec ton objectif, sans permettre de poser un diagnostic. Cette lecture distingue les faits déclarés des hypothèses prudentes qui restent à confirmer. ";
  const section = Array.from({ length: 4 }, () => paragraph.repeat(3)).join("\n\n");
  const raw = {
    synthesis: section,
    sections: DISCOVERY_PREMIUM_DOMAINS.map((domain) => ({
      domain,
      content: domain === "sommeil"
        ? `${section}\n\nTon cortisol est élevé. Ta sensibilité à l'insuline est basse. Ta thyroïde est ralentie.`
        : section,
    })),
  };

  const validated = validateDiscoveryGeneratedNarrative(raw, responses, policy);
  const sleep = validated.sections.sommeil;
  assert.match(sleep, /Ton cortisol est élevé, mais cela reste une hypothèse prudente et non diagnostique/);
  assert.match(sleep, /Ta sensibilité à l'insuline est basse, mais cela reste une hypothèse prudente et non diagnostique/);
  assert.match(sleep, /Ta thyroïde est ralentie, mais cela reste une hypothèse prudente et non diagnostique/);
  assert.equal(validateDiscoverySectionContent(sleep, policy).isValid, true);
  assert.ok(validateDiscoverySectionContent("Ton cortisol est élevé.", policy).reasons.includes("medical_assertion"));
});

test("unified end-to-end cleanup repairs known French corruption in stress before strict validation", () => {
  const responses = { prenom: "ApexTest", objectif: "progresser durablement" };
  const policy = deriveDiscoverySafetyPolicy(responses);
  const paragraph = "Tu as décrit une routine structurée et des repères cohérents. Le mécanisme utile concerne la récupération et son interaction possible avec ton objectif, sans permettre de poser un diagnostic. Cette lecture distingue les faits déclarés des hypothèses prudentes qui restent à confirmer. ";
  const section = Array.from({ length: 4 }, () => paragraph.repeat(3)).join("\n\n");
  const raw = {
    synthesis: section,
    sections: DISCOVERY_PREMIUM_DOMAINS.map((domain) => ({
      domain,
      content: domain === "stress"
        ? `${section}\n\nLa progression ne sera pas de façje linéaire. Une autre leçj'utile consiste à observer les tendances.`
        : section,
    })),
  };

  const validated = validateDiscoveryGeneratedNarrative(raw, responses, policy);
  const stress = validated.sections.stress;
  assert.match(stress, /de façon linéaire/);
  assert.match(stress, /une autre leçon utile/i);
  assert.doesNotMatch(stress, /çj/);
  assert.equal(validateDiscoverySectionContent(stress, policy).isValid, true);
  assert.ok(validateDiscoverySectionContent("Une corruption çj-inconnue.", policy).reasons.includes("malformed_french_fragment"));
});

test("unified end-to-end cleanup remains idempotent when voice normalization creates its fallback", () => {
  const responses = { prenom: "ApexTest", objectif: "progresser durablement" };
  const policy = deriveDiscoverySafetyPolicy(responses);
  const paragraph = "Tu as décrit une routine structurée et des repères cohérents. Je ne peux pas confirmer une cause individuelle à partir de ce questionnaire. Cette lecture distingue les faits déclarés des hypothèses prudentes qui restent à confirmer sans poser de diagnostic. ";
  const section = Array.from({ length: 4 }, () => paragraph.repeat(3)).join("\n\n");
  const raw = {
    synthesis: section,
    sections: DISCOVERY_PREMIUM_DOMAINS.map((domain) => ({ domain, content: section })),
  };

  const validated = validateDiscoveryGeneratedNarrative(raw, responses, policy);
  assert.match(validated.sections.energie, /je n'ai pas les éléments pour confirmer/i);
  assert.doesNotMatch(validated.sections.energie, /\belements?\b/i);
  assert.deepEqual(validateDiscoveryLinguisticQuality(validated.sections.energie), []);
  assert.equal(validateDiscoverySectionContent(validated.sections.energie, policy).isValid, true);
});

test("every post-surface text transformer avoids forbidden accentless literals", () => {
  const textNormalization = readFileSync(new URL("./textNormalization.ts", import.meta.url), "utf8");
  const safetyPolicy = readFileSync(new URL("./discoverySafetyPolicy.ts", import.meta.url), "utf8");
  const forbidden = /["'`](?:[^"'`\n]*\b(?:elements?|reponses?|mecanismes?|energie|entrainements?|durees?|facade|realite|details?|detaille(?:e|es|s)?|biomecanique|avancee|deduction|apres|deduit(?:e)?|supplementaires?|deja|priorites?)\b[^"'`\n]*)["'`]/gi;

  assert.deepEqual(textNormalization.match(forbidden) || [], []);
  assert.deepEqual(safetyPolicy.match(forbidden) || [], []);
  const discoverySource = readFileSync(new URL("./discovery-scan.ts", import.meta.url), "utf8");
  const tail = discoverySource.slice(discoverySource.indexOf("function cleanDiscoveryNarrativeProse"));
  assert.match(tail, /return normalizeDiscoveryFrenchSurface\(repairDiscoveryKnownFrenchCorruptions\(cleaned\)\)/);
});

test("unified prompt gives every domain enough visible-length margin", () => {
  const source = readFileSync(new URL("./discovery-scan.ts", import.meta.url), "utf8");

  assert.match(source, /280 a 500 mots, 4 a 6 paragraphes substantiels/);
  assert.match(source, /280 a 500 mots, avec au moins 1 400 caracteres visibles hors balises et espaces multiples/);
  assert.match(source, /visibleChars: countDiscoveryVisibleChars\(content\)/);
  assert.match(source, /\$\{domain\}:\$\{visibleChars\}\/\$\{MIN_DISCOVERY_SECTION_CHARS\} visible chars/);
  assert.doesNotMatch(source, /\^\.\*\\b\(Sources\?\|References\?\|Références\?\)\\b\.\*\$/);
});

test("Discovery generation uses one bounded structured call and still rejects incomplete responses", () => {
  const source = readFileSync(new URL("./discovery-scan.ts", import.meta.url), "utf8");
  const runner = readFileSync(new URL("./openaiResponses.ts", import.meta.url), "utf8");
  const canaryRunner = readFileSync(new URL("../scripts/discovery-unified-isolated-canary.ts", import.meta.url), "utf8");

  assert.match(source, /schemaName:\s*"discovery_unified_report_v1"[\s\S]{0,260}maxOutputTokens:\s*DISCOVERY_UNIFIED_MAX_OUTPUT_TOKENS[\s\S]{0,120}retries:\s*1[\s\S]{0,120}label:\s*"discovery-unified-report"/);
  assert.match(source, /One structured provider call owns the synthesis and all eight domains/);
  assert.equal(DISCOVERY_UNIFIED_MAX_INPUT_CHARS, 60_000);
  assert.equal(DISCOVERY_UNIFIED_MAX_OUTPUT_TOKENS, 14_000);
  assert.equal(DISCOVERY_UNIFIED_MAX_ESTIMATED_COST_USD, 0.75);
  assert.match(runner, /discovery:\s*{[\s\S]{0,260}effort:\s*"medium"[\s\S]{0,260}maxOutputTokens:\s*7_000[\s\S]{0,260}verbosity:\s*"medium"/);
  assert.match(runner, /response\?\.status\s*!==\s*"completed"/);
  assert.match(runner, /OpenAI response incomplete:/);
  assert.match(canaryRunner, /EXPECTED_DISCOVERY_SAFETY_SHA256/);
  assert.match(canaryRunner, /server\/discoverySafetyPolicy\.ts/);
  assert.match(canaryRunner, /discovery_safety_hash_mismatch/);
  assert.match(canaryRunner, /EXPECTED_TEXT_NORMALIZATION_SHA256/);
  assert.match(canaryRunner, /server\/textNormalization\.ts/);
  assert.match(canaryRunner, /text_normalization_hash_mismatch/);
});

test("new Discovery persistence stores the same canonical score shown in the report", () => {
  const routes = readFileSync(new URL("./routes.ts", import.meta.url), "utf8");
  const service = readFileSync(new URL("./discoveryGenerationService.ts", import.meta.url), "utf8");

  assert.match(routes, /canonicalScores\.global\s*=\s*Math\.round\(Number\(narrativeReport\.globalScore\)\s*\*\s*10\)/);
  assert.match(routes, /narrativeReport:\s*gatedNarrative,\s*scores:\s*canonicalScores/);
  assert.match(service, /scores:\s*{\s*\.\.\.result\.scoresByDomain,\s*global:\s*result\.globalScore/);
});
