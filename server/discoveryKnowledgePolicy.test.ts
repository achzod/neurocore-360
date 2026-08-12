import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  assertDiscoveryPremiumKnowledgeContext,
  sanitizeDiscoveryKnowledgeContext,
} from "./discoveryKnowledgePolicy";
import {
  analyzeDiscoveryScan,
  DISCOVERY_PREMIUM_DOMAINS,
  neutralizeDiscoverySourceAttribution,
  validateDiscoverySectionContent,
} from "./discovery-scan";

test("canonical English scientific evidence is preserved while source attribution is removed", () => {
  const raw = `Huberman Lab\nThe circadian system coordinates sleep timing with cortisol and melatonin.\nThis evidence explains how light exposure changes the phase response curve and sleep pressure.\nThe mechanism is directly relevant to recovery, glucose regulation and endocrine health.`;
  const sanitized = sanitizeDiscoveryKnowledgeContext(raw);

  assert.match(sanitized, /The circadian system coordinates sleep timing/);
  assert.match(sanitized, /light exposure changes the phase response curve/);
  assert.doesNotMatch(sanitized, /Huberman/i);
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
  assert.match(source, /dependencies\.generateSynthesis \|\| generateAISynthesis/);
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
        generateSynthesis: async () => {
          openAICalls += 1;
          return "must not run";
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
      generateSynthesis: async () => {
        openAICalls += 1;
        assert.deepEqual(loaded, ["synthesis", ...DISCOVERY_PREMIUM_DOMAINS]);
        return "Synthese premium valide";
      },
      retryDelay: async () => {},
    },
  );

  assert.equal(maxConcurrent, 1);
  assert.equal(openAICalls, 1);
  assert.deepEqual(Object.keys(result.knowledgePreflight.domains), [...DISCOVERY_PREMIUM_DOMAINS]);
});

test("a dense 13,910-char section with 24 paragraphs is not rejected for structure", () => {
  const paragraph = "Ton energie cellulaire depend de mecanismes mitochondriaux precis, relies a ton sommeil, ton stress et ta nutrition quotidienne. ".repeat(5);
  let clean = Array.from({ length: 24 }, () => paragraph).join("\n\n");
  clean = clean.padEnd(13_910, " physiologie adaptee");
  const validation = validateDiscoverySectionContent(clean);
  assert.ok(validation.charCount >= 13_910);
  assert.ok(validation.wordCount >= 2_115);
  assert.ok(validation.lineCount >= 24);
  assert.equal(validation.paragraphCount, 24);
  assert.doesNotMatch(validation.reasons.join(","), /chars|density|paragraphs/);
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
  const paragraph = "Tes ressources physiologiques nocturnes dependent de la pression homeostatique, de l'adenosine et du rythme circadien. Cette interaction conserve le mecanisme scientifique et personnalise l'analyse de ton sommeil. ".repeat(5);
  const sleep = Array.from({ length: 24 }, () => paragraph).join("\n\n").padEnd(13_910, " recuperation nocturne");
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
  const paragraph = "Ta principale source de stress maintient une activation sympathique mesurable. Cette valeur de référence permet de relier ton cortisol, ta variabilite cardiaque et la qualite de ta recuperation sans attribuer le mecanisme a un auteur. ".repeat(5);
  const stress = Array.from({ length: 24 }, () => paragraph).join("\n\n").padEnd(13_910, " regulation autonome");
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

test("Discovery section generation reserves enough tokens and still rejects incomplete responses", () => {
  const source = readFileSync(new URL("./discovery-scan.ts", import.meta.url), "utf8");
  const runner = readFileSync(new URL("./openaiResponses.ts", import.meta.url), "utf8");

  assert.match(source, /maxOutputTokens:\s*14_000/);
  assert.match(runner, /response\?\.status\s*!==\s*"completed"/);
  assert.match(runner, /OpenAI response incomplete:/);
});
