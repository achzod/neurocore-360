import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(name: string): string {
  return readFileSync(new URL(name, import.meta.url), "utf8");
}

test("every Discovery call uses the central gpt-5.5 high profile", () => {
  const runner = source("./openaiResponses.ts");
  const scan = source("./discovery-scan.ts");
  const reconciler = source("../scripts/discovery-safe-reconciler.ts");
  const generation = source("./discoveryGenerationService.ts");

  assert.match(runner, /OPENAI_REPORT_MODEL\s*=\s*\n\s*process\.env\.OPENAI_REPORT_MODEL\s*\|\|\s*"gpt-5\.5"/);
  assert.match(runner, /DISCOVERY_REASONING_EFFORT\s*=\s*"high"/);
  assert.doesNotMatch(runner, /discovery:\s*{[\s\S]{0,300}effort:\s*["']medium["']/);
  assert.doesNotMatch(runner, /OPENAI_REPORT_MODEL\s*\|\|\s*["'](?!gpt-5\.5)[^"']+/);
  assert.match(scan, /profile:\s*"discovery"/);
  assert.doesNotMatch(scan, /profile:\s*["'](?:premium|extraction|vision)["'][\s\S]{0,160}discovery/i);
  assert.match(generation, /analyzeDiscoveryScan\(audit\.responses/);
  assert.doesNotMatch(generation, /runOpenAIText|responses\.create|chat\.completions/);
  assert.doesNotMatch(reconciler, /responses\.create|chat\.completions/);
});

test("admin audit collections are bounded and large bodies are not re-serialized for logs", () => {
  const routes = source("./routes.ts");
  const storage = source("./storage.ts");
  const index = source("./index.ts");
  const listStart = routes.indexOf('app.get("/api/admin/audits"');
  const listEnd = routes.indexOf('app.get("/api/admin/audits/:id"', listStart);
  const listRoute = routes.slice(listStart, listEnd);

  assert.match(listRoute, /Math\.min\(100/);
  assert.match(listRoute, /getAdminAuditSummariesPage\(limit, offset\)/);
  assert.doesNotMatch(listRoute, /getAllAuditSummaries|getAllAudits\(/);
  assert.match(storage, /COUNT\(\*\) OVER\(\)::int AS total_count[\s\S]*LIMIT \$1 OFFSET \$2/);
  assert.match(routes, /report-artifacts[\s\S]{0,1800}Math\.min\(10[\s\S]{0,1800}LIMIT \$2/);
  assert.match(index, /omitResponseBodyFromLogs[\s\S]*\/api\/admin\/audits/);
  assert.match(index, /if \(!omitResponseBodyFromLogs\) capturedJsonResponse = bodyJson/);
});

test("production verification is a dedicated read-only PostgreSQL gate", () => {
  const gate = source("../scripts/discovery-production-readonly-gate.ts");

  assert.match(gate, /BEGIN READ ONLY/);
  assert.match(gate, /SET LOCAL statement_timeout/);
  assert.match(gate, /DISCOVERY_PRODUCTION_READONLY_GATE_PASS/);
  assert.match(gate, /DISCOVERY_REASONING_EFFORT/);
  assert.match(gate, /DISCOVERY_AUTOMATION_START_AT_INVALID/);
  assert.match(gate, /BATCH_DELIVERY_WORKER_MUST_STAY_OFF/);
  assert.match(gate, /dd5fe306-d9d4-4370-98cc-9c4e74f9c729/);
  assert.match(gate, /0874317e-3b18-4e00-b597-063e73d7680e/);
  assert.doesNotMatch(gate, /\b(?:INSERT|UPDATE|DELETE|TRUNCATE|ALTER|DROP|CREATE)\b/i);
});
