import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import {
  analyzeDiscoveryScan,
  buildDiscoveryReportAssets,
  convertToNarrativeReport,
  DISCOVERY_PREMIUM_DOMAINS,
  validateDiscoveryReportForDelivery,
  type DiscoveryKnowledgePreflight,
  type DiscoveryResponses,
} from "../server/discovery-scan";
import { evaluateDiscoveryDeliveryGate } from "../server/discoveryDeliveryGate";
import { getDiscoveryKnowledgePreflightDiagnostic } from "../server/discoveryKnowledgePolicy";

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
export const DISCOVERY_CANARY_KNOWLEDGE_CHARS_PER_SCOPE = 400;
const DRY_RUN_SENTINEL = "DISCOVERY_CANARY_DRY_PREFLIGHT_COMPLETE";
const PREFLIGHT_ONLY_SENTINEL = "DISCOVERY_CANARY_PREFLIGHT_ONLY_COMPLETE";
const EXPECTED_DISCOVERY_SOURCE_SHA256 = "fd9aacdbcea2b7c2c49fce63a1334da2cc155dd8042a1f12cc69f6dd4147447c";
const EXPECTED_OPENAI_RUNNER_SHA256 = "cef5511112e9a1a985163400aad5cbe2284f047b78063c2bb1ab8df820bdd1d0";
const ARTIFACT_CHUNK_BYTES = 12_000;

export async function runDiscoveryCanaryProviderStage<T>(
  knowledge: DiscoveryKnowledgePreflight,
  provider: () => Promise<T>,
  options: {
    env?: Record<string, string | undefined>;
    emit?: (line: string) => void;
    validateBudget?: () => void;
  } = {},
): Promise<T | null> {
  const env = options.env || process.env;
  if (env.DISCOVERY_CANARY_PREFLIGHT_ONLY === "true") {
    const emit = options.emit || console.log;
    emit(`${PREFLIGHT_ONLY_SENTINEL}:${JSON.stringify({
      stage: "knowledge_preflight",
      status: "complete",
      scopes: [
        { scope: "synthesis", actualChars: knowledge.synthesis.length },
        ...DISCOVERY_PREMIUM_DOMAINS.map((domain) => ({
          scope: `section ${domain}`,
          actualChars: knowledge.domains[domain]?.length ?? 0,
        })),
      ],
      providerCalls: 0,
    })}`);
    return null;
  }

  options.validateBudget?.();
  invariant(Boolean(env.OPENAI_API_KEY), "openai_key_missing");
  return provider();
}

export function assertDiscoveryCanaryBudget(inputTokenUpperBound: number): number {
  const worstCaseCostUsd =
    inputTokenUpperBound * INPUT_USD_PER_TOKEN + MAX_OUTPUT_TOKENS * OUTPUT_USD_PER_TOKEN;
  invariant(inputTokenUpperBound <= MAX_INPUT_TOKEN_UPPER_BOUND, `input_budget:${inputTokenUpperBound}/${MAX_INPUT_TOKEN_UPPER_BOUND}`);
  invariant(worstCaseCostUsd <= MAX_COST_USD, `cost_budget:${worstCaseCostUsd.toFixed(6)}`);
  return worstCaseCostUsd;
}

export function compactDiscoveryCanaryKnowledge(
  knowledge: DiscoveryKnowledgePreflight,
): DiscoveryKnowledgePreflight {
  return {
    synthesis: knowledge.synthesis.slice(0, DISCOVERY_CANARY_KNOWLEDGE_CHARS_PER_SCOPE),
    domains: Object.fromEntries(
      Object.entries(knowledge.domains).map(([domain, context]) => [
        domain,
        context.slice(0, DISCOVERY_CANARY_KNOWLEDGE_CHARS_PER_SCOPE),
      ]),
    ),
  };
}

export function estimateDiscoveryCanaryBudget(
  knowledge: DiscoveryKnowledgePreflight,
): { inputTokenUpperBound: number; worstCaseCostUsd: number } {
  const profileBytes = Buffer.byteLength(JSON.stringify(DISCOVERY_CANARY_PROFILE), "utf8");
  const knowledgeBytes = Buffer.byteLength(JSON.stringify(knowledge), "utf8");
  const inputTokenUpperBound = profileBytes * 3 + knowledgeBytes + FIXED_PROMPT_SCHEMA_OVERHEAD_BYTES;
  return {
    inputTokenUpperBound,
    worstCaseCostUsd: assertDiscoveryCanaryBudget(inputTokenUpperBound),
  };
}

function invariant(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`CANARY_PREFLIGHT_BLOCKED:${message}`);
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export const DISCOVERY_CANARY_PROFILE: DiscoveryResponses = {
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
    await analyzeDiscoveryScan(DISCOVERY_CANARY_PROFILE, {
      generateNarrative: async (_responses, _scores, _blocages, knowledge) => {
        capturedKnowledge = knowledge;
        throw new Error(DRY_RUN_SENTINEL);
      },
    });
    throw new Error("CANARY_PREFLIGHT_BLOCKED:dry_preflight_did_not_stop");
  } catch (error) {
    if (!(error instanceof Error && error.message.includes(DRY_RUN_SENTINEL))) {
      console.error(`DISCOVERY_CANARY_KB_PREFLIGHT_DIAGNOSTIC:${JSON.stringify(
        getDiscoveryKnowledgePreflightDiagnostic(error),
      )}`);
    }
    invariant(error instanceof Error && error.message.includes(DRY_RUN_SENTINEL), "knowledge_preflight_failed");
  }
  invariant(capturedKnowledge, "knowledge_not_captured");

  const cachedKnowledge = compactDiscoveryCanaryKnowledge(capturedKnowledge);
  invariant(Object.keys(cachedKnowledge.domains).length === 8, "knowledge_domains_not_8");
  invariant(cachedKnowledge.synthesis.length >= 200, "knowledge_synthesis_too_short");
  invariant(Object.values(cachedKnowledge.domains).every((value) => value.length >= 200), "knowledge_domain_too_short");

  const startedAt = new Date().toISOString();
  let inputTokenUpperBound: number | null = null;
  let worstCaseCostUsd: number | null = null;
  const result = await runDiscoveryCanaryProviderStage(
    cachedKnowledge,
    () => analyzeDiscoveryScan(DISCOVERY_CANARY_PROFILE, {
      loadSynthesisKnowledge: async () => cachedKnowledge.synthesis,
      loadDomainKnowledge: async (domain) => cachedKnowledge.domains[domain] || "",
      retryDelay: async () => {
        throw new Error("CANARY_PREFLIGHT_BLOCKED:unexpected_knowledge_retry");
      },
    }),
    {
      validateBudget: () => {
        // UTF-8 byte count is a conservative token upper bound. The multiplier
        // on the synthetic profile plus the fixed 40 kB allowance dominates
        // labels, duplicated formatting, system instructions and schema text.
        const budget = estimateDiscoveryCanaryBudget(cachedKnowledge);
        inputTokenUpperBound = budget.inputTokenUpperBound;
        worstCaseCostUsd = budget.worstCaseCostUsd;
      },
    },
  );
  if (!result) return;
  invariant(inputTokenUpperBound !== null && worstCaseCostUsd !== null, "budget_not_validated");
  const report = await convertToNarrativeReport(result, DISCOVERY_CANARY_PROFILE);
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
    profile: DISCOVERY_CANARY_PROFILE,
    startedAt,
    finishedAt,
    result,
    report,
    assets,
    validation,
    gate,
    hashes: {
      profileSha256: sha256(JSON.stringify(DISCOVERY_CANARY_PROFILE)),
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

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(`DISCOVERY_ISOLATED_CANARY_FAILED:${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  });
}
