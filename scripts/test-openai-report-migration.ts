import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { estimateAIUsageCosts } from "../server/openaiResponses";
import { repairReportTextForDelivery } from "../server/reportTextRepair";
import { auditClientFacingText, sanitizeClientFacingText } from "../server/clientFacingQuality";

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
assert.match(shared, /peptides:[\s\S]*effort:\s*"xhigh"[\s\S]*mode:\s*"pro"/);
assert.match(shared, /client\.responses\.create/);
assert.doesNotMatch(shared, /chat\.completions/);
assert.match(shared, /peptides:[\s\S]*maxOutputTokens:\s*32_000/);
assert.match(shared, /peptides:[\s\S]*timeoutMs:\s*30 \* 60 \* 1000/);
assert.match(shared, /ai_usage_events/);
assert.match(shared, /ai_usage_cost_alerts/);
assert.match(shared, /DAILY_COST_ALERT_LEVELS_USD = \[5, 10, 25, 50, 100, 250, 500, 1_000\]/);
assert.match(shared, /AI_COST_ALERT_EMAIL \|\| "achkou@gmail\.com"/);
assert.match(shared, /\[AICost\]/);
assert.match(shared, /Cancel did not complete within 10s/);
assert.match(shared, /maxRetries:\s*0/);
assert.match(shared, /const deadline = Date\.now\(\) \+ profile\.timeoutMs;[\s\S]{0,120}client\.responses\.create/);
assert.match(shared, /export function isOpenAICreditError/);
assert.match(shared, /if \(isOpenAICreditError\(error\)\) return false/);

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
assert.match(routes, /\/api\/admin\/ai-usage-costs\/check-alert/);
assert.match(routes, /\/api\/admin\/recover-report-failures/);
assert.match(routes, /deterministic_client_facing_repair/);
assert.match(routes, /automaticReportRecoveryRunning/);
assert.match(routes, /requireAdminAuth/);
assert.match(routes, /Never launch the Discovery-specific generator/);
assert.match(routes, /activeReportJob\?\.status === "generating"/);
assert.match(routes, /skipped: "scheduled_for_future"/);
assert.match(routes, /A public GET is read-only/);
assert.doesNotMatch(routes, /\[Discovery Fetch\] Report regenerated/);
assert.match(routes, /Atomic claim first so two concurrent regenerate clicks cannot both/);
assert.match(routes, /Repair legacy\/racing writes that replaced SENT with READY/);
assert.match(routes, /failedAudit\?\.reportDeliveryStatus !== "NEEDS_REVIEW"/);
assert.match(routes, /const maxWait = 95 \* 60 \* 1000/);
assert.match(routes, /process\.env\.PUBLIC_BASE_URL \|\|[\s\S]{0,120}process\.env\.RENDER_EXTERNAL_URL/);
assert.match(routes, /persistent job manager owns Discovery generation too/);
assert.doesNotMatch(routes, /DISCOVERY_GENERATION_TIMEOUT = 5 \* 60 \* 1000/);
assert.match(routes, /discoveryNarrativeLength < 10_000/);

const emailService = read("server/emailService.ts");
assert.match(emailService, /const shouldBccAdmin = !emailPayload\.to\.some/);
assert.match(emailService, /none, already direct recipient/);

assert.equal(auditClientFacingText("Ton rendez-vous est confirme.").vouvoiement.length, 0);
assert.deepEqual(auditClientFacingText("Vous devez verifier votre plan.").vouvoiement, [
  "vous",
  "votre",
]);
const repairedClientText = repairReportTextForDelivery(
  "Vous devez verifier votre plan. Ton rendez-vous reste demain. Proteines: 90 g par jour.",
  { poids: 80 },
);
assert.equal(auditClientFacingText(repairedClientText).vouvoiement.length, 0);
assert.match(repairedClientText, /rendez-vous/);
assert.match(repairedClientText, /1,6 a 2,2 g\/kg\/jour/);
assert.match(repairedClientText, /128 a 176 g par jour/);
const sanitizedDashText = sanitizeClientFacingText("Phase 8\u201312 semaines \u2014 puis controle.");
assert.equal(sanitizedDashText, "Phase 8-12 semaines, puis controle.");
assert.equal(auditClientFacingText(sanitizedDashText).forbiddenDashes, 0);

const packageManifest = read("package.json");
assert.doesNotMatch(packageManifest, /@anthropic-ai\/sdk/);

const discovery = read("server/discovery-scan.ts");
assert.match(discovery, /profile:\s*"discovery"/);

const premium = read("server/reportJobManager.ts");
assert.match(premium, /generateAndConvertAuditWithOpenAI/);
assert.doesNotMatch(premium, /import\s*\{\s*generateAndConvertAudit,/);
assert.match(premium, /engine:\s*"openai"/);
assert.match(premium, /STUCK_JOB_THRESHOLD_MS = 90 \* 60 \* 1000/);
assert.match(premium, /AI_CALL_TIMEOUT_MS = 90 \* 60 \* 1000/);
assert.match(premium, /postGenerationDeliveryStatus/);
assert.match(premium, /scheduledFor\.getTime\(\) > Date\.now\(\)/);
assert.match(premium, /automatic retry retained/);
assert.match(premium, /Pending job \$\{auditId\} claimed from queue/);
assert.match(premium, /auditType === "GRATUIT"/);
assert.match(premium, /analyzeDiscoveryScan\(normalizedResponses/);
assert.match(premium, /convertToNarrativeReport\(discoveryResult/);
assert.match(premium, /Discovery COMPLETED/);

const vision = read("server/photoAnalysisAI.ts");
assert.match(vision, /profile:\s*"vision"/);
assert.match(vision, /schemaName:\s*"ultimate_photo_analysis"/);

const blood = read("server/blood-analysis/index.ts");
assert.match(blood, /profile:\s*"blood"/);
assert.match(blood, /schemaName:\s*"blood_marker_extraction"/);
assert.match(blood, /const clientSafeOutput = sanitizeClientFacingText\(trimmedOutput\)/);
assert.match(blood, /const clientFacingAudit = auditClientFacingText\(clientSafeOutput\)/);
assert.match(blood, /AI_REPORT_CLIENT_STYLE_GATE_FAILED/);
assert.match(blood, /return clientSafeOutput/);
assert.match(
  blood,
  /required marker-by-marker narrative[\s\S]{0,160}maxTokens:\s*28_000/,
);

const bloodTestRoutes = read("server/blood-tests/routes.ts");
assert.match(bloodTestRoutes, /\/api\/admin\/blood-tests\/:id\/sanitize-report/);
assert.match(bloodTestRoutes, /afterAudit = auditClientFacingText\(sanitizedReport\)/);
assert.match(bloodTestRoutes, /aiSanitizationAudit/);

const bloodRoutes = read("server/blood-analysis/routes.ts");
assert.match(bloodRoutes, /Use \/api\/blood-tests\/upload for the tracked GPT report/);
assert.doesNotMatch(bloodRoutes, /blood-analysis\/analyze sync report/);
assert.doesNotMatch(bloodRoutes, /withAIGenerationTimeout/);
assert.match(bloodRoutes, /Retrying the whole eleven-section pipeline can overlap expensive reports/);

const bloodTests = read("server/blood-tests/routes.ts");
assert.doesNotMatch(bloodTests, /runAIGenerationWithRetry/);
assert.match(bloodTests, /const sixtyMinAgo = new Date\(Date\.now\(\) - 60 \* 60 \* 1000\)/);
assert.doesNotMatch(bloodTests, /const tenMinAgo/);
assert.match(bloodTests, /isInternalQaEmail/);
assert.match(bloodTests, /return !isInternalQaEmail\(profile\.email\)/);
assert.match(bloodTests, /async_generation_failed_pending_retry/);
assert.doesNotMatch(bloodTests, /async_generation_failed_fallback/);

const monitoring = read("server/monitoring.ts");
assert.match(monitoring, /providerCreditFailure/);
assert.match(monitoring, /retry counter will be reset/);

const peptides = read("server/peptidesEngine.ts");
assert.match(peptides, /profile:\s*"peptides"/);
assert.match(peptides, /schemaName:\s*"peptides_engine_report"/);
assert.match(peptides, /strict full regeneration/);

console.log("OpenAI report migration guardrails: OK");
