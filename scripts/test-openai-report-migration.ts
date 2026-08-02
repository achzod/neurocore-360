import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { estimateAIUsageCosts } from "../server/openaiResponses";

const read = (relativePath: string): string =>
  readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");

const coreFiles = [
  "server/openaiResponses.ts",
  "server/openaiPremiumEngine.ts",
  "server/reportJobManager.ts",
  "server/routes.ts",
  "server/discovery-scan.ts",
  "server/photoAnalysisAI.ts",
  "server/peptidesEngine.ts",
  "server/blood-analysis/index.ts",
  "server/blood-analysis/routes.ts",
  "server/blood-analysis/parallel-html-generator.ts",
  "server/blood-tests/routes.ts",
];

for (const file of coreFiles) {
  const source = read(file);
  assert.doesNotMatch(
    source,
    /@anthropic-ai\/sdk|ANTHROPIC_API_KEY|new\s+Anthropic|messages\.create\(|generateAndConvertAuditWithClaude|claude-(?:opus|sonnet)/i,
    `${file} contient encore un chemin Anthropic actif`,
  );
}

const shared = read("server/openaiResponses.ts");
assert.match(shared, /"gpt-5\.6-sol"/);
assert.match(shared, /premium:[\s\S]*effort:\s*"xhigh"[\s\S]*mode:\s*"pro"/);
assert.match(shared, /blood:[\s\S]*effort:\s*"max"[\s\S]*mode:\s*"pro"/);
assert.match(shared, /peptides:[\s\S]*effort:\s*"max"[\s\S]*mode:\s*"pro"/);
assert.match(shared, /client\.responses\.create/);
assert.doesNotMatch(shared, /chat\.completions/);
assert.match(shared, /maxOutputTokens:\s*32_000/);
assert.match(shared, /ai_usage_events/);
assert.match(shared, /\[AICost\]/);

const baselineCosts = estimateAIUsageCosts({
  inputTokens: 100_000,
  cachedInputTokens: 0,
  cacheWriteTokens: 0,
  outputTokens: 100_000,
  reasoningTokens: 20_000,
  totalTokens: 200_000,
});
assert.equal(baselineCosts.openaiGpt56SolUsd, 3.5);
assert.equal(baselineCosts.sonnet46EquivalentUsd, 1.8);
assert.equal(baselineCosts.openaiLongContextMultiplierApplied, false);

const cachedCosts = estimateAIUsageCosts({
  inputTokens: 100_000,
  cachedInputTokens: 20_000,
  cacheWriteTokens: 0,
  outputTokens: 10_000,
  reasoningTokens: 2_000,
  totalTokens: 110_000,
});
assert.equal(cachedCosts.openaiGpt56SolUsd, 0.71);
assert.equal(cachedCosts.sonnet46EquivalentUsd, 0.396);

const longContextCosts = estimateAIUsageCosts({
  inputTokens: 300_000,
  cachedInputTokens: 0,
  cacheWriteTokens: 0,
  outputTokens: 100_000,
  reasoningTokens: 20_000,
  totalTokens: 400_000,
});
assert.equal(longContextCosts.openaiGpt56SolUsd, 7.5);
assert.equal(longContextCosts.sonnet46EquivalentUsd, 2.4);
assert.equal(longContextCosts.openaiLongContextMultiplierApplied, true);

const routes = read("server/routes.ts");
assert.match(routes, /\/api\/admin\/ai-usage-costs/);
assert.match(routes, /requireAdminAuth/);

const packageManifest = read("package.json");
assert.doesNotMatch(packageManifest, /@anthropic-ai\/sdk/);

const discovery = read("server/discovery-scan.ts");
assert.match(discovery, /profile:\s*"discovery"/);

const premium = read("server/reportJobManager.ts");
assert.match(premium, /generateAndConvertAuditWithOpenAI/);
assert.match(premium, /engine:\s*"openai"/);

const vision = read("server/photoAnalysisAI.ts");
assert.match(vision, /profile:\s*"vision"/);
assert.match(vision, /schemaName:\s*"ultimate_photo_analysis"/);

const blood = read("server/blood-analysis/index.ts");
assert.match(blood, /profile:\s*"blood"/);
assert.match(blood, /schemaName:\s*"blood_marker_extraction"/);

const peptides = read("server/peptidesEngine.ts");
assert.match(peptides, /profile:\s*"peptides"/);
assert.match(peptides, /schemaName:\s*"peptides_engine_report"/);
assert.match(peptides, /strict full regeneration/);

console.log("OpenAI report migration guardrails: OK");
