import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import {
  analyzeDiscoveryScan,
  buildDiscoveryReportAssets,
  convertToNarrativeReport,
  validateDiscoveryReportForDelivery,
  type DiscoveryKnowledgePreflight,
  type DiscoveryResponses,
} from "../server/discovery-scan";
import { evaluateDiscoveryDeliveryGate } from "../server/discoveryDeliveryGate";

/**
 * Disposable Discovery canary.
 *
 * This script deliberately has no audit id and imports no storage, route,
 * email, or report-job module. It reads the scientific knowledge base through
 * analyzeDiscoveryScan, makes one unified provider call, and emits the result
 * to stdout only. Nothing is persisted to a customer table.
 */

const EXPECTED_MODEL = "gpt-5.6-sol";
const MAX_OUTPUT_TOKENS = 14_000;
const MAX_COST_USD = 0.75;
// Cache writes are the most expensive possible input class for this model.
// Budget every input token at that rate, even though most will be cheaper.
const INPUT_USD_PER_TOKEN = 6.25 / 1_000_000;
const OUTPUT_USD_PER_TOKEN = 30 / 1_000_000;
const MAX_INPUT_TOKEN_UPPER_BOUND = Math.floor(
  (MAX_COST_USD - MAX_OUTPUT_TOKENS * OUTPUT_USD_PER_TOKEN) / INPUT_USD_PER_TOKEN,
);
const FIXED_PROMPT_SCHEMA_OVERHEAD_BYTES = 40_000;
const KNOWLEDGE_CHARS_PER_SCOPE = 480;
const DRY_RUN_SENTINEL = "DISCOVERY_CANARY_DRY_PREFLIGHT_COMPLETE";
const EXPECTED_DISCOVERY_SOURCE_SHA256 = "2d7b0bff4b0637306e6e42da96a467aed05c14a6d2635a260a84b3a93d039f04";
const EXPECTED_OPENAI_RUNNER_SHA256 = "cef5511112e9a1a985163400aad5cbe2284f047b78063c2bb1ab8df820bdd1d0";
const ARTIFACT_CHUNK_BYTES = 12_000;

function invariant(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`CANARY_PREFLIGHT_BLOCKED:${message}`);
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

const profile: DiscoveryResponses = {
  prenom: "ApexTest",
  email: "discovery-canary-20260812@invalid.example",
  sexe: "homme",
  age: "34",
  taille: "181",
  poids: "86",
  objectif: "perdre progressivement du gras tout en conservant mes performances",
  "diagnostic-medical": ["Aucun diagnostic declare"],
  "traitement-medical": "Aucun traitement declare",
  "bilan-sanguin-recent": "Non",
  "plateau-metabolique": "Progression ralentie depuis six semaines",
  "tca-historique": "Non",
  "experience-sportive": "Intermediaire, quatre annees de musculation reguliere",
  "heures-sommeil": "6 a 7 heures",
  "qualite-sommeil": "Moyenne",
  "endormissement": "20 a 30 minutes",
  "reveils-nocturnes": "Un reveil certaines nuits",
  "reveil-fatigue": "Souvent",
  "heure-coucher": "23 h 45",
  "niveau-stress": "Eleve en semaine",
  anxiete: "Occasionnelle lors des periodes de travail chargees",
  concentration: "Bonne le matin, plus faible apres 16 h",
  irritabilite: "Occasionnelle en fin de journee",
  "humeur-fluctuation": "Legere",
  "gestion-stress": ["Marche", "Respiration"],
  "energie-matin": "Correcte apres le petit dejeuner",
  "energie-aprem": "Baisse vers 16 h",
  "coup-fatigue": "Oui, surtout les jours de travail longs",
  "envies-sucre": "Deux a trois fois par semaine en fin de journee",
  motivation: "Elevee",
  thermogenese: "Mains parfois froides en soiree",
  "digestion-qualite": "Globalement bonne",
  ballonnements: "Legers apres certains repas tres volumineux",
  transit: "Une fois par jour",
  reflux: "Rare",
  intolerance: ["Aucune intolerance connue"],
  "energie-post-repas": "Stable sauf apres les dejeuners tres copieux",
  "sport-frequence": "3-4",
  "type-sport": ["Musculation", "Marche rapide"],
  intensite: "Moderee a elevee",
  recuperation: "Moyenne",
  courbatures: "24 a 48 heures",
  "performance-evolution": "Stable depuis un mois",
  "nb-repas": "3 repas et une collation",
  "petit-dejeuner": "Oui, oeufs, fruits et yaourt",
  "proteines-jour": "Une source proteinee a chaque repas",
  "eau-jour": "2 a 2,5 litres",
  "regime-alimentaire": "Omnivore",
  "aliments-transformes": "Une a deux fois par semaine",
  "sucres-ajoutes": "Occasionnels",
  alcool: "Un a deux verres par mois",
  "cafe-jour": "Deux cafes, aucun apres 14 h",
  tabac: "Non",
  "temps-ecran": "Environ neuf heures avec le travail",
  "exposition-soleil": "15 a 20 minutes le matin",
  profession: "Travail de bureau",
  "heures-assis": "7 a 8 heures",
  "frustration-passee": "Plans trop rigides difficiles a tenir avec le travail",
  "si-rien-change": "Je crains de continuer a stagner et de perdre ma motivation",
  "ideal-6mois": "Plus sec, plus energique et plus regulier dans mes performances",
  "plus-grosse-peur": "Reprendre le poids perdu avec une methode trop restrictive",
  "engagement-niveau": "9 sur 10",
  "motivation-principale": "Retrouver une progression durable",
  "consignes-strictes": "Je prefere des priorites simples et mesurables",
  "temps-training-semaine": "Quatre heures",
};

async function main(): Promise<void> {
  invariant(process.env.DISCOVERY_UNIFIED_GENERATION_ENABLED === "true", "generation_flag_not_true");
  invariant(process.env.DISCOVERY_REPORT_DELIVERY_ENABLED === "false", "delivery_flag_not_false");
  invariant(process.env.AI_USAGE_PERSISTENCE_DISABLED === "true", "usage_persistence_not_disabled");
  const model = process.env.OPENAI_REPORT_MODEL || EXPECTED_MODEL;
  invariant(model === EXPECTED_MODEL, `unexpected_model:${model}`);
  invariant(Boolean(process.env.OPENAI_API_KEY), "openai_key_missing");
  invariant(Boolean(process.env.DATABASE_URL), "database_url_missing_for_readonly_knowledge");
  invariant(
    sha256(readFileSync("server/discovery-scan.ts", "utf8")) === EXPECTED_DISCOVERY_SOURCE_SHA256,
    "discovery_source_hash_mismatch",
  );
  invariant(
    sha256(readFileSync("server/openaiResponses.ts", "utf8")) === EXPECTED_OPENAI_RUNNER_SHA256,
    "openai_runner_hash_mismatch",
  );

  let capturedKnowledge: DiscoveryKnowledgePreflight | null = null;
  try {
    await analyzeDiscoveryScan(profile, {
      generateNarrative: async (_responses, _scores, _blocages, knowledge) => {
        capturedKnowledge = knowledge;
        throw new Error(DRY_RUN_SENTINEL);
      },
    });
    throw new Error("CANARY_PREFLIGHT_BLOCKED:dry_preflight_did_not_stop");
  } catch (error) {
    invariant(error instanceof Error && error.message.includes(DRY_RUN_SENTINEL), "knowledge_preflight_failed");
  }
  invariant(capturedKnowledge, "knowledge_not_captured");

  const cachedKnowledge: DiscoveryKnowledgePreflight = {
    synthesis: capturedKnowledge.synthesis.slice(0, KNOWLEDGE_CHARS_PER_SCOPE),
    domains: Object.fromEntries(
      Object.entries(capturedKnowledge.domains).map(([domain, context]) => [
        domain,
        context.slice(0, KNOWLEDGE_CHARS_PER_SCOPE),
      ]),
    ),
  };
  invariant(Object.keys(cachedKnowledge.domains).length === 8, "knowledge_domains_not_8");
  invariant(cachedKnowledge.synthesis.length >= 200, "knowledge_synthesis_too_short");
  invariant(Object.values(cachedKnowledge.domains).every((value) => value.length >= 200), "knowledge_domain_too_short");

  // UTF-8 byte count is a conservative token upper bound. The multiplier on
  // the small synthetic profile plus the fixed 40 kB allowance dominates all
  // labels, duplicated formatting, system instructions, and JSON schema text.
  const profileBytes = Buffer.byteLength(JSON.stringify(profile), "utf8");
  const knowledgeBytes = Buffer.byteLength(JSON.stringify(cachedKnowledge), "utf8");
  const inputTokenUpperBound = profileBytes * 3 + knowledgeBytes + FIXED_PROMPT_SCHEMA_OVERHEAD_BYTES;
  const worstCaseCostUsd =
    inputTokenUpperBound * INPUT_USD_PER_TOKEN + MAX_OUTPUT_TOKENS * OUTPUT_USD_PER_TOKEN;
  invariant(inputTokenUpperBound <= MAX_INPUT_TOKEN_UPPER_BOUND, `input_budget:${inputTokenUpperBound}/${MAX_INPUT_TOKEN_UPPER_BOUND}`);
  invariant(worstCaseCostUsd <= MAX_COST_USD, `cost_budget:${worstCaseCostUsd.toFixed(6)}`);

  const startedAt = new Date().toISOString();
  const result = await analyzeDiscoveryScan(profile, {
    loadSynthesisKnowledge: async () => cachedKnowledge.synthesis,
    loadDomainKnowledge: async (domain) => cachedKnowledge.domains[domain] || "",
    retryDelay: async () => {
      throw new Error("CANARY_PREFLIGHT_BLOCKED:unexpected_knowledge_retry");
    },
  });
  const report = await convertToNarrativeReport(result, profile);
  const assets = buildDiscoveryReportAssets(report);
  const validation = validateDiscoveryReportForDelivery(report, assets);
  const gate = evaluateDiscoveryDeliveryGate(report, assets);
  const finishedAt = new Date().toISOString();

  const artifact = {
    schemaVersion: 1,
    isolation: {
      profileKind: "synthetic_non_client",
      auditId: null,
      storageCalls: 0,
      deliveryEnabled: false,
      expectedProviderCalls: 1,
      expectedTotalAttempts: 1,
    },
    budget: {
      model,
      maxInputTokenUpperBound: inputTokenUpperBound,
      maxOutputTokens: MAX_OUTPUT_TOKENS,
      worstCaseCostUsd: Number(worstCaseCostUsd.toFixed(6)),
      hardLimitUsd: MAX_COST_USD,
    },
    profile,
    startedAt,
    finishedAt,
    result,
    report,
    assets,
    validation,
    gate,
    hashes: {
      profileSha256: sha256(JSON.stringify(profile)),
      txtSha256: sha256(assets.txt),
      htmlSha256: sha256(assets.html),
    },
  };
  const artifactJson = JSON.stringify(artifact);
  const artifactSha256 = sha256(artifactJson);
  const encoded = Buffer.from(artifactJson, "utf8").toString("base64");
  console.log(`DISCOVERY_ISOLATED_CANARY_SUMMARY:${JSON.stringify({
    startedAt,
    finishedAt,
    validation,
    gate,
    budget: artifact.budget,
    hashes: artifact.hashes,
    txtChars: assets.txt.length,
    htmlChars: assets.html.length,
  })}`);
  const chunks = Array.from(
    { length: Math.ceil(encoded.length / ARTIFACT_CHUNK_BYTES) },
    (_, index) => encoded.slice(index * ARTIFACT_CHUNK_BYTES, (index + 1) * ARTIFACT_CHUNK_BYTES),
  );
  console.log(`DISCOVERY_ISOLATED_CANARY_ARTIFACT_META:${JSON.stringify({
    encoding: "base64",
    chunks: chunks.length,
    artifactSha256,
    jsonBytes: Buffer.byteLength(artifactJson, "utf8"),
  })}`);
  chunks.forEach((chunk, index) => {
    console.log(`DISCOVERY_ISOLATED_CANARY_ARTIFACT_CHUNK:${index + 1}/${chunks.length}:${artifactSha256}:${chunk}`);
  });
}

main().catch((error) => {
  console.error(`DISCOVERY_ISOLATED_CANARY_FAILED:${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
