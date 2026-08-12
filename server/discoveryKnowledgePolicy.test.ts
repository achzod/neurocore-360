import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  assertDiscoveryPremiumKnowledgeContext,
  sanitizeDiscoveryKnowledgeContext,
} from "./discoveryKnowledgePolicy";
import {
  analyzeDiscoveryScan,
  buildDiscoveryQuestionnaireFacts,
  DISCOVERY_UNIFIED_MAX_ESTIMATED_COST_USD,
  DISCOVERY_UNIFIED_MAX_INPUT_CHARS,
  DISCOVERY_UNIFIED_MAX_OUTPUT_TOKENS,
  DISCOVERY_PREMIUM_DOMAINS,
  filterDiscoveryRelevantArticles,
  neutralizeDiscoverySourceAttribution,
  validateDiscoveryFactualConsistency,
  validateDiscoveryGeneratedNarrative,
  validateDiscoverySectionContent,
} from "./discovery-scan";
import { deriveDiscoverySafetyPolicy } from "./discoverySafetyPolicy";

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
  const paragraph = "Tes ressources physiologiques nocturnes dependent de la pression homeostatique, de l'adenosine et du rythme circadien. Cette interaction conserve le mecanisme scientifique et personnalise l'analyse de ton sommeil. ".repeat(3);
  const sleep = Array.from({ length: 5 }, () => paragraph).join("\n\n").padEnd(1_600, " recuperation nocturne");
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
  const paragraph = "Ta principale source de stress maintient une activation sympathique mesurable. Cette valeur de référence permet de relier ton cortisol, ta variabilite cardiaque et la qualite de ta recuperation sans attribuer le mecanisme a un auteur. ".repeat(3);
  const stress = Array.from({ length: 5 }, () => paragraph).join("\n\n").padEnd(1_600, " regulation autonome");
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

test("malformed French fragments are rejected even inside otherwise dense content", () => {
  const paragraph = "Ta récupération dépend du sommeil, du stress et de la disponibilité énergétique. ".repeat(10);
  const dense = Array.from({ length: 24 }, () => paragraph).join("\n\n");

  for (const corrupted of ["manger de façje qualitative", "une autre leçj'utile"]) {
    const validation = validateDiscoverySectionContent(`${dense}\n\n${corrupted}.`);
    assert.equal(validation.isValid, false);
    assert.ok(validation.reasons.includes("malformed_french_fragment"));
  }
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

test("Discovery generation uses one bounded structured call and still rejects incomplete responses", () => {
  const source = readFileSync(new URL("./discovery-scan.ts", import.meta.url), "utf8");
  const runner = readFileSync(new URL("./openaiResponses.ts", import.meta.url), "utf8");

  assert.match(source, /schemaName:\s*"discovery_unified_report_v1"[\s\S]{0,260}maxOutputTokens:\s*DISCOVERY_UNIFIED_MAX_OUTPUT_TOKENS[\s\S]{0,120}retries:\s*1[\s\S]{0,120}label:\s*"discovery-unified-report"/);
  assert.match(source, /One structured provider call owns the synthesis and all eight domains/);
  assert.equal(DISCOVERY_UNIFIED_MAX_INPUT_CHARS, 60_000);
  assert.equal(DISCOVERY_UNIFIED_MAX_OUTPUT_TOKENS, 14_000);
  assert.equal(DISCOVERY_UNIFIED_MAX_ESTIMATED_COST_USD, 0.75);
  assert.match(runner, /discovery:\s*{[\s\S]{0,260}effort:\s*"medium"[\s\S]{0,260}maxOutputTokens:\s*7_000[\s\S]{0,260}verbosity:\s*"medium"/);
  assert.match(runner, /response\?\.status\s*!==\s*"completed"/);
  assert.match(runner, /OpenAI response incomplete:/);
});

test("new Discovery persistence stores the same canonical score shown in the report", () => {
  const routes = readFileSync(new URL("./routes.ts", import.meta.url), "utf8");
  const service = readFileSync(new URL("./discoveryGenerationService.ts", import.meta.url), "utf8");

  assert.match(routes, /canonicalScores\.global\s*=\s*Math\.round\(Number\(narrativeReport\.globalScore\)\s*\*\s*10\)/);
  assert.match(routes, /narrativeReport:\s*gatedNarrative,\s*scores:\s*canonicalScores/);
  assert.match(service, /scores:\s*{\s*\.\.\.result\.scoresByDomain,\s*global:\s*result\.globalScore/);
});
