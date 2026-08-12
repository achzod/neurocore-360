/**
 * Discovery safe reconciler.
 *
 * Default: read-only manifest of every GRATUIT audit, regardless of status.
 * Generation: explicit approval (file or fixed-name base64 environment value),
 * durable global lock, one provider call
 * maximum per audit, hard budget reservation, real usage ledger, strict gate,
 * transactional storage, and stop on the first anomaly.
 *
 * Generation never sends an email. Stored reports use BATCH_READY, a status
 * ignored by AutoSend. The distinct delivery stage is off by default and can
 * call the canonical provider only after a durable, unique, fail-closed claim.
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

import {
  analyzeDiscoveryScan,
  buildDiscoveryReportAssets,
  convertToNarrativeReport,
  DISCOVERY_PREMIUM_DOMAINS,
  validateDiscoveryReportForDelivery,
  type DiscoveryKnowledgePreflight,
  type DiscoveryResponses,
} from "../server/discovery-scan";
import {
  attachDiscoveryDeliveryGateResult,
  evaluateCanonicalDiscoveryArtifacts,
  evaluateDiscoveryDeliveryGate,
  resolveCanonicalDiscoveryArtifacts,
} from "../server/discoveryDeliveryGate";
import {
  acquireDiscoveryGlobalLock,
  classifyDiscoveryManifestCandidate,
  completeDiscoveryBatchRun,
  createDiscoveryBatchRun,
  decodeDiscoveryApprovalBase64,
  discoverySha256,
  failDiscoveryBatchItem,
  markDiscoveryBatchItemPreflightOk,
  persistValidatedDiscoveryBatchItem,
  claimDiscoveryProviderAttempt,
  claimDiscoveryBatchEmailDelivery,
  finalizeDiscoveryDeliveryClaim,
  markDiscoveryDeliveryProviderPostStarted,
  recordDiscoveryProviderUsage,
  refreshDiscoveryGlobalLock,
  releaseDiscoveryGlobalLock,
  resolveExactDiscoveryTargets,
  isBlockedDiscoveryTestEmail,
  isValidDiscoveryRecipientEmail,
  stableJson,
  validateDiscoveryApproval,
  type DiscoveryApproval,
  type DiscoveryBatchTier,
  type DiscoveryManifestCohort,
} from "../server/discoveryBatchControl";
import { getReportReadyEmailSubject, sendReportReadyEmail } from "../server/emailService";
import { isDiscoverySupersededTerminal } from "../server/discoverySupersededPolicy";
import { pool } from "../server/db";

const argv = process.argv.slice(2);
const args = new Set(argv);
const valueAfter = (flag: string): string | undefined => {
  const index = argv.indexOf(flag);
  return index >= 0 ? argv[index + 1] : undefined;
};

const FIXED_PROMPT_SCHEMA_OVERHEAD_BYTES = 40_000;
const MAX_OUTPUT_TOKENS = 14_000;
const INPUT_USD_PER_TOKEN = 6.25 / 1_000_000;
const OUTPUT_USD_PER_TOKEN = 30 / 1_000_000;
const HARD_COST_USD = 0.75;
const KNOWLEDGE_CHARS_PER_SCOPE = 400;
const PREFLIGHT_SENTINEL = "DISCOVERY_BATCH_READ_ONLY_PREFLIGHT_COMPLETE";

interface ManifestRow {
  id: string;
  email: string;
  type: string;
  createdAt: string;
  reportDeliveryStatus: string | null;
  reportSentAt: string | null;
  responses: DiscoveryResponses;
  responsesSha256: string;
  txtSha256: string | null;
  htmlSha256: string | null;
  deliveryGateOk: boolean;
  deliveryGateErrors: string[];
  tracking: { total: number; accepted: number; failed: number; pending: number; hardFailed: number };
  deliveryClaimState: string | null;
  duplicateCandidate: boolean;
  superseded: boolean;
  unsubscribed: boolean;
  validEmail: boolean;
  testEmailBlocked: boolean;
  smtpHardFailProven: boolean;
  cohort: DiscoveryManifestCohort;
  reasons: string[];
}

interface DiscoveryManifest {
  schemaVersion: 1;
  generatedAt: string;
  source: "database_read_only";
  commitSha: string;
  counts: Record<DiscoveryManifestCohort | "total", number>;
  items: ManifestRow[];
  manifestSha256: string;
}

function currentCommitSha(): string {
  return String(process.env.RENDER_GIT_COMMIT || process.env.GIT_COMMIT || "").trim()
    || execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
}

function assertGenerationEnvironment(): void {
  const required: Array<[string, string]> = [
    ["DISCOVERY_UNIFIED_GENERATION_ENABLED", "true"],
    ["DISCOVERY_REPORT_DELIVERY_ENABLED", "false"],
    ["REMEDIATION_SIDE_EFFECTS_DISABLED", "true"],
    ["AI_COST_ALERTS_ENABLED", "false"],
  ];
  for (const [key, value] of required) {
    if (String(process.env[key] || "").toLowerCase() !== value) {
      throw new Error(`DISCOVERY_BATCH_ENV_BLOCKED:${key}=${value} is mandatory`);
    }
  }
  if (String(process.env.AI_USAGE_PERSISTENCE_DISABLED || "").toLowerCase() === "true") {
    throw new Error("DISCOVERY_BATCH_ENV_BLOCKED:AI_USAGE_PERSISTENCE_DISABLED must not be true");
  }
  if (!process.env.OPENAI_API_KEY) throw new Error("DISCOVERY_BATCH_ENV_BLOCKED:OPENAI_API_KEY missing");
}

function assertDeliveryEnvironment(): void {
  const required: Array<[string, string]> = [
    ["DISCOVERY_BATCH_DELIVERY_WORKER_ENABLED", "true"],
    ["DISCOVERY_REPORT_DELIVERY_ENABLED", "false"],
    ["REMEDIATION_SIDE_EFFECTS_DISABLED", "true"],
  ];
  for (const [key, value] of required) {
    if (String(process.env[key] || "").toLowerCase() !== value) {
      throw new Error(`DISCOVERY_BATCH_ENV_BLOCKED:${key}=${value} is mandatory`);
    }
  }
  const baseUrl = String(process.env.APP_URL || process.env.RENDER_EXTERNAL_URL || "").replace(/\/$/, "");
  if (!baseUrl.startsWith("https://")) throw new Error("DISCOVERY_BATCH_ENV_BLOCKED:https base URL required");
}

async function hasBatchControlTables(): Promise<boolean> {
  const result = await pool.query(
    `SELECT to_regclass('public.discovery_batch_runs') IS NOT NULL
         AND to_regclass('public.discovery_batch_items') IS NOT NULL
         AND to_regclass('public.discovery_operation_lock') IS NOT NULL AS ready`,
  );
  return Boolean(result.rows[0]?.ready);
}

async function buildManifest(): Promise<DiscoveryManifest> {
  const hasClaims = Boolean((await pool.query(
    `SELECT to_regclass('public.discovery_email_delivery_claims') IS NOT NULL AS ready`,
  )).rows[0]?.ready);
  const claimSelect = hasClaims
    ? `(SELECT c.state FROM discovery_email_delivery_claims c
          WHERE c.audit_id = a.id AND c.email_type = 'sendReportReadyEmail'
          ORDER BY c.created_at DESC LIMIT 1) AS delivery_claim_state`
    : `NULL::text AS delivery_claim_state`;
  const hasUnsubscribes = Boolean((await pool.query(
    `SELECT to_regclass('public.email_unsubscribes') IS NOT NULL AS ready`,
  )).rows[0]?.ready);
  if (!hasUnsubscribes) {
    throw new Error("DISCOVERY_BATCH_UNSUBSCRIBE_TABLE_MISSING");
  }
  const unsubscribeSelect =
    `EXISTS (SELECT 1 FROM email_unsubscribes u WHERE LOWER(u.email) = LOWER(a.email)) AS unsubscribed`;
  const result = await pool.query(
    `SELECT a.id, a.email, a.type, a.created_at, a.report_delivery_status,
            a.report_sent_at, a.responses, a.narrative_report, a.report_txt, a.report_html,
            ${claimSelect},
            ${unsubscribeSelect},
            EXISTS (
              SELECT 1 FROM audits other
               WHERE other.type = 'GRATUIT' AND other.id <> a.id
                 AND LOWER(other.email) = LOWER(a.email)
                 AND ABS(EXTRACT(EPOCH FROM (other.created_at - a.created_at))) <= 14 * 86400
            ) AS duplicate_candidate,
            COUNT(t.id)::int AS tracking_total,
            COUNT(t.id) FILTER (WHERE LOWER(COALESCE(t.sendpulse_status,''))
              IN ('success','accepted','sent','delivered','smtp_confirmed'))::int AS tracking_accepted,
            COUNT(t.id) FILTER (WHERE LOWER(COALESCE(t.sendpulse_status,''))
              IN ('failed','auth_failed','unsubscribed','bounced','error'))::int AS tracking_failed,
            COUNT(t.id) FILTER (WHERE t.sendpulse_status IS NULL OR LOWER(t.sendpulse_status)
              IN ('pending','queued','sending'))::int AS tracking_pending,
            COUNT(t.id) FILTER (WHERE
              LOWER(COALESCE(t.sendpulse_status,'')) = 'bounced'
              OR (
                LOWER(COALESCE(t.sendpulse_status,'')) = 'failed'
                AND (
                  COALESCE(t.sendpulse_error,'') ~* '"eventType"[[:space:]]*:[[:space:]]*"(hard_fail|bounce)"'
                  OR (
                    t.sendpulse_task_id IS NOT NULL
                    AND COALESCE(t.metadata->>'sendpulseSmtpAnswerCode','') ~ '^5[0-9]{2}$'
                  )
                )
              )
            )::int AS tracking_hard_failed
       FROM audits a
       LEFT JOIN email_tracking t
         ON t.audit_id = a.id AND t.email_type = 'sendReportReadyEmail'
      WHERE a.type = 'GRATUIT'
      GROUP BY a.id
      ORDER BY a.created_at ASC, a.id ASC`,
  );

  const items: ManifestRow[] = result.rows.map((row: any) => {
    const canonical = resolveCanonicalDiscoveryArtifacts({
      narrativeReport: row.narrative_report,
      reportTxt: row.report_txt,
      reportHtml: row.report_html,
    });
    const gate = evaluateCanonicalDiscoveryArtifacts(canonical);
    const superseded = isDiscoverySupersededTerminal({
      type: row.type,
      reportDeliveryStatus: row.report_delivery_status,
      narrativeReport: row.narrative_report,
    });
    const tracking = {
      total: Number(row.tracking_total || 0),
      accepted: Number(row.tracking_accepted || 0),
      failed: Number(row.tracking_failed || 0),
      pending: Number(row.tracking_pending || 0),
      hardFailed: Number(row.tracking_hard_failed || 0),
    };
    const classification = classifyDiscoveryManifestCandidate({
      id: row.id,
      email: row.email,
      type: row.type,
      reportDeliveryStatus: row.report_delivery_status,
      reportSentAt: row.report_sent_at,
      superseded,
      duplicateCandidate: Boolean(row.duplicate_candidate),
      unsubscribed: Boolean(row.unsubscribed),
      deliveryGateOk: gate.ok,
      deliveryGateErrors: gate.errors,
      tracking,
      deliveryClaimState: row.delivery_claim_state,
    });
    return {
      id: row.id,
      email: row.email,
      type: row.type,
      createdAt: new Date(row.created_at).toISOString(),
      reportDeliveryStatus: row.report_delivery_status,
      reportSentAt: row.report_sent_at ? new Date(row.report_sent_at).toISOString() : null,
      responses: row.responses || {},
      responsesSha256: discoverySha256(row.responses || {}),
      txtSha256: row.report_txt ? discoverySha256(String(row.report_txt)) : null,
      htmlSha256: row.report_html ? discoverySha256(String(row.report_html)) : null,
      deliveryGateOk: gate.ok,
      deliveryGateErrors: gate.errors,
      tracking,
      deliveryClaimState: row.delivery_claim_state || null,
      duplicateCandidate: Boolean(row.duplicate_candidate),
      superseded,
      unsubscribed: Boolean(row.unsubscribed),
      validEmail: isValidDiscoveryRecipientEmail(row.email),
      testEmailBlocked: isBlockedDiscoveryTestEmail(row.email),
      smtpHardFailProven: tracking.hardFailed > 0,
      cohort: classification.cohort,
      reasons: classification.reasons,
    };
  });
  const commitSha = currentCommitSha();
  const hashPayload = items.map(({ responses, ...item }) => item);
  const manifestSha256 = discoverySha256({ schemaVersion: 1, commitSha, items: hashPayload });
  const count = (cohort: DiscoveryManifestCohort) => items.filter((item) => item.cohort === cohort).length;
  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    source: "database_read_only",
    commitSha,
    counts: {
      total: items.length,
      already_accepted: count("already_accepted"),
      valid_never_sent: count("valid_never_sent"),
      ambiguous: count("ambiguous"),
      invalid: count("invalid"),
    },
    items,
    manifestSha256,
  };
}

function compactKnowledge(knowledge: DiscoveryKnowledgePreflight): DiscoveryKnowledgePreflight {
  return {
    synthesis: knowledge.synthesis.slice(0, KNOWLEDGE_CHARS_PER_SCOPE),
    domains: Object.fromEntries(
      DISCOVERY_PREMIUM_DOMAINS.map((domain) => [
        domain,
        String(knowledge.domains[domain] || "").slice(0, KNOWLEDGE_CHARS_PER_SCOPE),
      ]),
    ),
  };
}

function assertRealProfileBudget(
  responses: DiscoveryResponses,
  knowledge: DiscoveryKnowledgePreflight,
): { inputTokenUpperBound: number; worstCaseCostUsd: number } {
  const profileBytes = Buffer.byteLength(stableJson(responses), "utf8");
  const knowledgeBytes = Buffer.byteLength(stableJson(knowledge), "utf8");
  const inputTokenUpperBound = profileBytes * 3 + knowledgeBytes + FIXED_PROMPT_SCHEMA_OVERHEAD_BYTES;
  const worstCaseCostUsd = inputTokenUpperBound * INPUT_USD_PER_TOKEN
    + MAX_OUTPUT_TOKENS * OUTPUT_USD_PER_TOKEN;
  if (worstCaseCostUsd > HARD_COST_USD) {
    throw new Error(`DISCOVERY_BATCH_PREFLIGHT_COST:${worstCaseCostUsd.toFixed(6)}/${HARD_COST_USD.toFixed(6)}`);
  }
  return { inputTokenUpperBound, worstCaseCostUsd };
}

async function captureKnowledge(responses: DiscoveryResponses): Promise<DiscoveryKnowledgePreflight> {
  let captured: DiscoveryKnowledgePreflight | null = null;
  try {
    await analyzeDiscoveryScan(responses, {
      generateNarrative: async (_responses, _scores, _blocages, knowledge) => {
        captured = knowledge;
        throw new Error(PREFLIGHT_SENTINEL);
      },
    });
  } catch (error) {
    if (!(error instanceof Error && error.message.includes(PREFLIGHT_SENTINEL))) throw error;
  }
  if (!captured) throw new Error("DISCOVERY_BATCH_KNOWLEDGE_NOT_CAPTURED");
  const compacted = compactKnowledge(captured);
  if (compacted.synthesis.length < 200
    || DISCOVERY_PREMIUM_DOMAINS.some((domain) => compacted.domains[domain].length < 200)) {
    throw new Error("DISCOVERY_BATCH_KNOWLEDGE_SCOPE_TOO_SHORT");
  }
  return compacted;
}

async function usageEventsSince(startedAt: Date): Promise<any[]> {
  const result = await pool.query(
    `SELECT response_id, input_tokens, output_tokens, total_tokens, estimated_openai_cost_usd
       FROM ai_usage_events
      WHERE created_at >= $1::timestamptz
        AND profile = 'discovery' AND label = 'discovery-unified-report'
      ORDER BY created_at ASC`,
    [startedAt.toISOString()],
  );
  return result.rows;
}

function assertExactTargetsEligible(
  selected: ManifestRow[],
  stage: "GENERATION" | "DELIVERY",
): void {
  for (const item of selected) {
    const reasons: string[] = [];
    if (!item.validEmail) reasons.push("invalid_email");
    if (item.testEmailBlocked) reasons.push("test_email_blocked");
    if (item.unsubscribed) reasons.push("recipient_unsubscribed");
    if (item.superseded) reasons.push("superseded_terminal");
    if (item.duplicateCandidate) reasons.push("duplicate_candidate");
    if (item.smtpHardFailProven) reasons.push("smtp_hard_fail_proven_terminal");
    if (stage === "GENERATION") {
      if (item.cohort !== "invalid") reasons.push(`cohort_${item.cohort}`);
    } else {
      if (item.cohort !== "valid_never_sent") reasons.push(`cohort_${item.cohort}`);
      if (!item.deliveryGateOk) reasons.push("delivery_gate_failed");
      if (item.tracking.total !== 0) reasons.push("prior_tracking_exists");
      if (item.deliveryClaimState) reasons.push("prior_delivery_claim_exists");
      if (!item.txtSha256 || !item.htmlSha256) reasons.push("artifact_hash_missing");
    }
    if (reasons.length > 0) {
      throw new Error(`DISCOVERY_BATCH_TARGET_INELIGIBLE:${item.id}:${[...new Set(reasons)].join("|")}`);
    }
  }
}

async function runGeneration(
  manifest: DiscoveryManifest,
  approval: DiscoveryApproval,
  approvalSource: string,
): Promise<Record<string, unknown>> {
  assertGenerationEnvironment();
  if (!await hasBatchControlTables()) throw new Error("DISCOVERY_BATCH_MIGRATION_NOT_APPLIED");
  if (approval.stage !== "GENERATION") throw new Error("DISCOVERY_BATCH_APPROVAL_NOT_GENERATION");
  const tier = approval.tier as DiscoveryBatchTier;
  const selected = resolveExactDiscoveryTargets(manifest.items, approval.targetAuditIds);
  assertExactTargetsEligible(selected, "GENERATION");
  const approvalErrors = validateDiscoveryApproval(approval, {
    manifestSha256: manifest.manifestSha256,
    commitSha: manifest.commitSha,
    stage: "GENERATION",
    tier,
    targetAuditIds: selected.map((item) => item.id),
    itemCount: selected.length,
  });
  if (approvalErrors.length > 0) throw new Error(`DISCOVERY_BATCH_APPROVAL_INVALID:${approvalErrors.join(",")}`);

  const lock = await acquireDiscoveryGlobalLock({
    owner: `discovery-safe-reconciler:${process.pid}`,
    purpose: `generation:${manifest.manifestSha256}:${tier}`,
    ttlMinutes: 60,
  });
  let batchId: string | null = null;
  const processed: Array<Record<string, unknown>> = [];
  try {
    batchId = await createDiscoveryBatchRun({
      manifestSha256: manifest.manifestSha256,
      commitSha: manifest.commitSha,
      approvalReference: `${approval.approvalReference}|${approvalSource}|binding:${approval.approvalBindingSha256}`,
      stage: "GENERATION",
      tier,
      globalBudgetUsd: approval.globalBudgetUsd,
      softPerScanUsd: approval.softPerScanUsd,
      hardPerScanUsd: approval.hardPerScanUsd,
      lockToken: lock.token,
      items: selected.map((item, index) => ({
        auditId: item.id,
        sequenceNo: index + 1,
        cohort: item.cohort,
        expectedResponsesSha256: item.responsesSha256,
        expectedTxtSha256: item.txtSha256,
        expectedHtmlSha256: item.htmlSha256,
      })),
    });

    for (const item of selected) {
      if (!await refreshDiscoveryGlobalLock(lock.token, 60)) {
        throw new Error("DISCOVERY_BATCH_LOCK_REFRESH_FAILED");
      }
      let providerStartedAt: Date | null = null;
      let usageRecorded = false;
      try {
        const knowledge = await captureKnowledge(item.responses);
        const budget = assertRealProfileBudget(item.responses, knowledge);
        const preflightMarked = await markDiscoveryBatchItemPreflightOk({
          batchId,
          auditId: item.id,
          lockToken: lock.token,
        });
        if (!preflightMarked) throw new Error("DISCOVERY_BATCH_PREFLIGHT_CAS_FAILED");
        const providerClaim = await claimDiscoveryProviderAttempt({
          batchId,
          auditId: item.id,
          lockToken: lock.token,
        });
        providerStartedAt = providerClaim.startedAt;

        const result = await analyzeDiscoveryScan(item.responses, {
          loadSynthesisKnowledge: async () => knowledge.synthesis,
          loadDomainKnowledge: async (domain) => knowledge.domains[domain] || "",
          retryDelay: async () => { throw new Error("DISCOVERY_BATCH_UNEXPECTED_KNOWLEDGE_RETRY"); },
        });
        const usageRows = await usageEventsSince(providerStartedAt);
        if (usageRows.length !== 1) {
          throw new Error(`DISCOVERY_BATCH_USAGE_AMBIGUOUS:${usageRows.length}`);
        }
        const usage = usageRows[0];
        const usageDecision = await recordDiscoveryProviderUsage({
          batchId,
          auditId: item.id,
          lockToken: lock.token,
          responseId: usage.response_id,
          inputTokens: Number(usage.input_tokens),
          outputTokens: Number(usage.output_tokens),
          totalTokens: Number(usage.total_tokens),
          actualCostUsd: Number(usage.estimated_openai_cost_usd),
        });
        usageRecorded = true;
        if (Number(usage.estimated_openai_cost_usd) > approval.hardPerScanUsd) {
          throw new Error(`DISCOVERY_BATCH_HARD_COST_BREACH:${usage.estimated_openai_cost_usd}`);
        }

        const report = await convertToNarrativeReport(result, item.responses);
        const assets = buildDiscoveryReportAssets(report);
        const nonRenderedMetadata = { blocages: result.blocages, ctaMessage: result.ctaMessage };
        const validation = validateDiscoveryReportForDelivery(report, assets, nonRenderedMetadata);
        const gate = evaluateDiscoveryDeliveryGate(report, assets, undefined, nonRenderedMetadata);
        if (!validation.ok || !gate.ok) {
          throw new Error(`DISCOVERY_BATCH_QUALITY_GATE:${[...validation.errors, ...gate.errors].join("|")}`);
        }
        const narrativeReport = attachDiscoveryDeliveryGateResult(report as any, gate);
        const persisted = await persistValidatedDiscoveryBatchItem({
          batchId,
          auditId: item.id,
          lockToken: lock.token,
          expectedResponsesSha256: item.responsesSha256,
          narrativeReport,
          scores: { ...result.scoresByDomain, global: result.globalScore },
          txt: assets.txt,
          html: assets.html,
          model: process.env.OPENAI_DISCOVERY_MODEL || process.env.OPENAI_REPORT_MODEL || "discovery",
        });
        processed.push({
          auditId: item.id,
          status: "STORED",
          actualCostUsd: Number(usage.estimated_openai_cost_usd),
          worstCaseCostUsd: Number(budget.worstCaseCostUsd.toFixed(6)),
          providerCalls: 1,
          ...persisted,
        });
        if (usageDecision.stop) break;
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        if (providerStartedAt && !usageRecorded) {
          const usageRows = await usageEventsSince(providerStartedAt).catch(() => []);
          if (usageRows.length === 1) {
            const usage = usageRows[0];
            await recordDiscoveryProviderUsage({
              batchId,
              auditId: item.id,
              lockToken: lock.token,
              responseId: usage.response_id,
              inputTokens: Number(usage.input_tokens),
              outputTokens: Number(usage.output_tokens),
              totalTokens: Number(usage.total_tokens),
              actualCostUsd: Number(usage.estimated_openai_cost_usd),
            }).catch(() => {});
            usageRecorded = true;
          }
        }
        await failDiscoveryBatchItem({
          batchId,
          auditId: item.id,
          lockToken: lock.token,
          errorCode: detail.split(":")[0].slice(0, 120),
          errorDetail: detail,
          ambiguous: Boolean(providerStartedAt && !usageRecorded),
        }).catch(() => {});
        processed.push({ auditId: item.id, status: "STOPPED", error: detail });
        break;
      }
    }
    const complete = await completeDiscoveryBatchRun({ batchId, lockToken: lock.token }).catch(() => false);
    return { batchId, tier, selected: selected.length, processed, complete };
  } finally {
    await releaseDiscoveryGlobalLock(lock.token).catch(() => false);
  }
}

async function runDelivery(
  manifest: DiscoveryManifest,
  approval: DiscoveryApproval,
  approvalSource: string,
): Promise<Record<string, unknown>> {
  assertDeliveryEnvironment();
  if (!await hasBatchControlTables()) throw new Error("DISCOVERY_BATCH_MIGRATION_NOT_APPLIED");
  if (approval.stage !== "DELIVERY") throw new Error("DISCOVERY_BATCH_APPROVAL_NOT_DELIVERY");
  const tier = approval.tier as DiscoveryBatchTier;
  const selected = resolveExactDiscoveryTargets(manifest.items, approval.targetAuditIds);
  assertExactTargetsEligible(selected, "DELIVERY");
  const approvalErrors = validateDiscoveryApproval(approval, {
    manifestSha256: manifest.manifestSha256,
    commitSha: manifest.commitSha,
    stage: "DELIVERY",
    tier,
    targetAuditIds: selected.map((item) => item.id),
    itemCount: selected.length,
  });
  if (approvalErrors.length > 0) throw new Error(`DISCOVERY_BATCH_APPROVAL_INVALID:${approvalErrors.join(",")}`);

  const lock = await acquireDiscoveryGlobalLock({
    owner: `discovery-safe-delivery:${process.pid}`,
    purpose: `delivery:${manifest.manifestSha256}:${tier}`,
    ttlMinutes: 60,
  });
  let batchId: string | null = null;
  const processed: Array<Record<string, unknown>> = [];
  try {
    batchId = await createDiscoveryBatchRun({
      manifestSha256: manifest.manifestSha256,
      commitSha: manifest.commitSha,
      approvalReference: `${approval.approvalReference}|${approvalSource}|binding:${approval.approvalBindingSha256}`,
      stage: "DELIVERY",
      tier,
      globalBudgetUsd: 0,
      softPerScanUsd: approval.softPerScanUsd,
      hardPerScanUsd: approval.hardPerScanUsd,
      lockToken: lock.token,
      items: selected.map((item, index) => ({
        auditId: item.id,
        sequenceNo: index + 1,
        cohort: item.cohort,
        expectedResponsesSha256: item.responsesSha256,
        expectedTxtSha256: item.txtSha256,
        expectedHtmlSha256: item.htmlSha256,
        initialState: "STORED",
      })),
    });
    const baseUrl = String(process.env.APP_URL || process.env.RENDER_EXTERNAL_URL).replace(/\/$/, "");
    const subject = getReportReadyEmailSubject("GRATUIT", "Discovery Scan");

    for (const item of selected) {
      if (!await refreshDiscoveryGlobalLock(lock.token, 60)) {
        throw new Error("DISCOVERY_BATCH_LOCK_REFRESH_FAILED");
      }
      let claimId: string | null = null;
      try {
        const current = await pool.query(
          `SELECT email, report_sent_at, report_delivery_status,
                  narrative_report, report_txt, report_html
             FROM audits WHERE id = $1 AND type = 'GRATUIT'`,
          [item.id],
        );
        if ((current.rowCount ?? 0) !== 1) throw new Error("DISCOVERY_DELIVERY_AUDIT_MISSING");
        const row = current.rows[0];
        if (row.report_sent_at) throw new Error("DISCOVERY_DELIVERY_ALREADY_SENT");
        if (discoverySha256(String(row.report_txt || "")) !== item.txtSha256
          || discoverySha256(String(row.report_html || "")) !== item.htmlSha256) {
          throw new Error("DISCOVERY_DELIVERY_MANIFEST_HASH_CHANGED");
        }
        const canonical = resolveCanonicalDiscoveryArtifacts({
          narrativeReport: row.narrative_report,
          reportTxt: row.report_txt,
          reportHtml: row.report_html,
        });
        const gate = evaluateCanonicalDiscoveryArtifacts(canonical);
        if (!gate.ok) throw new Error(`DISCOVERY_DELIVERY_GATE_CHANGED:${gate.errors.join("|")}`);

        // Existing valid reports are promoted to BATCH_READY only after every
        // manifest/hash/gate check passes under the durable lock.
        const promoted = await pool.query(
          `UPDATE audits SET report_delivery_status = 'BATCH_READY'
            WHERE id = $1 AND report_sent_at IS NULL
              AND report_delivery_status = $2 RETURNING id`,
          [item.id, row.report_delivery_status],
        );
        if ((promoted.rowCount ?? 0) !== 1) throw new Error("DISCOVERY_DELIVERY_PROMOTION_CAS_FAILED");

        const claim = await claimDiscoveryBatchEmailDelivery({
          batchId,
          auditId: item.id,
          lockToken: lock.token,
          recipientEmail: item.email,
          subject,
        });
        claimId = claim.claimId;
        if (!await markDiscoveryDeliveryProviderPostStarted(claimId)) {
          throw new Error("DISCOVERY_DELIVERY_PROVIDER_START_CAS_FAILED");
        }
        const accepted = await sendReportReadyEmail(item.email, item.id, "GRATUIT", baseUrl);
        if (!accepted) {
          await finalizeDiscoveryDeliveryClaim({
            claimId,
            outcome: "AMBIGUOUS",
            errorDetail: "provider result not durably confirmed",
          });
          processed.push({ auditId: item.id, status: "AMBIGUOUS" });
          break;
        }
        const finalized = await finalizeDiscoveryDeliveryClaim({
          claimId,
          outcome: "PROVIDER_ACCEPTED",
        });
        if (!finalized) throw new Error("DISCOVERY_DELIVERY_FINALIZE_CAS_FAILED");
        processed.push({ auditId: item.id, status: "PROVIDER_ACCEPTED" });
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        if (claimId) {
          await finalizeDiscoveryDeliveryClaim({
            claimId,
            outcome: "AMBIGUOUS",
            errorDetail: detail,
          }).catch(() => {});
        } else {
          await failDiscoveryBatchItem({
            batchId,
            auditId: item.id,
            lockToken: lock.token,
            errorCode: detail.split(":")[0].slice(0, 120),
            errorDetail: detail,
            ambiguous: true,
          }).catch(() => {});
        }
        processed.push({ auditId: item.id, status: "STOPPED", error: detail });
        break;
      }
    }
    const complete = await completeDiscoveryBatchRun({ batchId, lockToken: lock.token }).catch(() => false);
    return { batchId, tier, selected: selected.length, processed, complete };
  } finally {
    await releaseDiscoveryGlobalLock(lock.token).catch(() => false);
  }
}

async function main(): Promise<void> {
  const manifest = await buildManifest();
  const outputPath = valueAfter("--out");
  if (outputPath) writeFileSync(outputPath, `${JSON.stringify(manifest, null, 2)}\n`, { flag: "wx" });

  if (!args.has("--run-generation") && !args.has("--run-delivery")) {
    if (args.has("--summary-only")) {
      const compactCandidate = (item: ManifestRow) => ({
        id: item.id,
        emailSha256: discoverySha256(String(item.email || "").trim().toLowerCase()),
        createdAt: item.createdAt,
        reportDeliveryStatus: item.reportDeliveryStatus,
        reportSentAt: item.reportSentAt,
        responsesSha256: item.responsesSha256,
        txtSha256: item.txtSha256,
        htmlSha256: item.htmlSha256,
        deliveryGateOk: item.deliveryGateOk,
        deliveryGateErrors: item.deliveryGateErrors,
        tracking: item.tracking,
        deliveryClaimState: item.deliveryClaimState,
        duplicateCandidate: item.duplicateCandidate,
        superseded: item.superseded,
        unsubscribed: item.unsubscribed,
        validEmail: item.validEmail,
        testEmailBlocked: item.testEmailBlocked,
        smtpHardFailProven: item.smtpHardFailProven,
        cohort: item.cohort,
        reasons: item.reasons,
      });
      const generationCandidates = manifest.items
        .filter((item) => item.cohort === "invalid")
        .map(compactCandidate);
      const deliveryCandidates = manifest.items
        .filter((item) => item.cohort === "valid_never_sent")
        .map(compactCandidate);
      const ambiguousReasonCounts = manifest.items
        .filter((item) => item.cohort === "ambiguous")
        .flatMap((item) => item.reasons)
        .reduce<Record<string, number>>((counts, reason) => {
          counts[reason] = (counts[reason] || 0) + 1;
          return counts;
        }, {});
      const recentAmbiguous = manifest.items
        .filter((item) => item.cohort === "ambiguous"
          && Date.parse(item.createdAt) >= Date.now() - 14 * 86_400_000)
        .map((item) => ({
          id: item.id,
          emailSha256: discoverySha256(String(item.email || "").trim().toLowerCase()),
          createdAt: item.createdAt,
          reportDeliveryStatus: item.reportDeliveryStatus,
          reportSentAt: item.reportSentAt,
          tracking: item.tracking,
          deliveryClaimState: item.deliveryClaimState,
          duplicateCandidate: item.duplicateCandidate,
          superseded: item.superseded,
          unsubscribed: item.unsubscribed,
          validEmail: item.validEmail,
          testEmailBlocked: item.testEmailBlocked,
          smtpHardFailProven: item.smtpHardFailProven,
          cohort: item.cohort,
          reasons: item.reasons,
        }));
      console.log(`DISCOVERY_BATCH_MANIFEST_SUMMARY:${JSON.stringify({
        schemaVersion: manifest.schemaVersion,
        generatedAt: manifest.generatedAt,
        source: manifest.source,
        commitSha: manifest.commitSha,
        counts: manifest.counts,
        manifestSha256: manifest.manifestSha256,
        generationCandidates,
        deliveryCandidates,
        ambiguousReasonCounts,
        recentAmbiguous,
      })}`);
    } else {
      console.log(JSON.stringify(manifest, null, 2));
    }
    return;
  }
  const approvalFile = valueAfter("--approval");
  const approvalFromBase64 = args.has("--approval-base64");
  if (approvalFile && approvalFromBase64) throw new Error("DISCOVERY_BATCH_APPROVAL_SOURCE_CONFLICT");
  if (!approvalFile && !approvalFromBase64) throw new Error("DISCOVERY_BATCH_APPROVAL_REQUIRED");
  let approval: DiscoveryApproval;
  let approvalSource: string;
  if (approvalFromBase64) {
    // Fixed env name only: the base64 payload never appears in argv, a temp
    // file, a log line or the persisted approval reference.
    approval = decodeDiscoveryApprovalBase64(process.env.DISCOVERY_BATCH_APPROVAL_B64);
    approvalSource = "env:DISCOVERY_BATCH_APPROVAL_B64";
  } else {
    try {
      approval = JSON.parse(readFileSync(approvalFile!, "utf8")) as DiscoveryApproval;
    } catch {
      throw new Error("DISCOVERY_BATCH_APPROVAL_FILE_INVALID");
    }
    approvalSource = "file";
  }
  if (args.has("--run-generation") && args.has("--run-delivery")) {
    throw new Error("DISCOVERY_BATCH_ONE_STAGE_ONLY");
  }
  const result = args.has("--run-generation")
    ? await runGeneration(manifest, approval, approvalSource)
    : await runDelivery(manifest, approval, approvalSource);
  console.log(`DISCOVERY_BATCH_RESULT:${JSON.stringify(result)}`);
}

main()
  .catch((error) => {
    console.error(`DISCOVERY_BATCH_FAILED:${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end().catch(() => {});
  });
