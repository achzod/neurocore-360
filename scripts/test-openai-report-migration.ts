import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

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
