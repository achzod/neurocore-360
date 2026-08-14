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
  DISCOVERY_MECHANISM_CATALOG_SHA256,
  DISCOVERY_MECHANISM_CATALOG_VERSION,
  DiscoveryRejectedCandidateError,
  DISCOVERY_PREMIUM_DOMAINS,
  isDiscoveryRejectedCandidateError,
  validateDiscoveryReportAgainstResponses,
  validateDiscoveryReportForDelivery,
  validateDiscoveryQuestionnaireContract,
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
  discoveryArtifactContentHash,
  discoverySha256,
  failDiscoveryBatchItem,
  markDiscoveryBatchItemPreflightOk,
  prepareDiscoveryAuditForRegeneration,
  persistValidatedDiscoveryBatchItem,
  claimDiscoveryProviderAttempt,
  claimDiscoveryBatchEmailDelivery,
  finalizeDiscoveryDeliveryClaim,
  markDiscoveryDeliveryProviderPostStarted,
  promoteDiscoveryBatchItemForDelivery,
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
import {
  DISCOVERY_OTHER_AUDIT_ACTIVE_SQL,
  isDiscoverySupersededTerminal,
} from "../server/discoverySupersededPolicy";
import { assertDiscoveryBatchSchemaV009 } from "../server/discoveryBatchSchema";
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
  narrativeSha256: string | null;
  txtSha256: string | null;
  htmlSha256: string | null;
  activeArtifactId: string | null;
  activeArtifactTxtSha256: string | null;
  activeArtifactHtmlSha256: string | null;
  activeArtifactContentSha256: string | null;
  activeArtifactBindingOk: boolean;
  deliveryGateOk: boolean;
  deliveryGateErrors: string[];
  tracking: { total: number; accepted: number; failed: number; pending: number; hardFailed: number };
  deliveryClaimState: string | null;
  providerAttemptCount: number;
  retryCandidateId: string | null;
  retryCandidateState: string | null;
  retryCandidateAttemptNo: number | null;
  retryCandidateSourceKind: string | null;
  duplicateCandidate: boolean;
  superseded: boolean;
  unsubscribed: boolean;
  validEmail: boolean;
  testEmailBlocked: boolean;
  smtpHardFailProven: boolean;
  regenerationEligible: boolean;
  cohort: DiscoveryManifestCohort;
  reasons: string[];
}

interface DiscoveryManifest {
  schemaVersion: 1;
  catalogVersion: string;
  catalogSha256: string;
  generatedAt: string;
  source: "database_read_only";
  commitSha: string;
  counts: Record<DiscoveryManifestCohort | "total", number> & { regeneration: number };
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
  throw new Error("DISCOVERY_DELIVERY_HARD_DISABLED");
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
  const hasBudgetReservations = Boolean((await pool.query(
    `SELECT to_regclass('public.ai_cost_budget_reservations') IS NOT NULL AS ready`,
  )).rows[0]?.ready);
  if (!hasBudgetReservations) {
    throw new Error("DISCOVERY_BATCH_AI_COST_RESERVATION_TABLE_MISSING");
  }
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
            (SELECT COUNT(*)::int FROM ai_cost_budget_reservations r
              WHERE r.product = 'discovery' AND r.order_id = a.id) AS provider_attempt_count,
            (SELECT c.id FROM discovery_rejected_candidates c
              WHERE c.audit_id=a.id ORDER BY c.attempt_no DESC LIMIT 1) AS retry_candidate_id,
            (SELECT c.state FROM discovery_rejected_candidates c
              WHERE c.audit_id=a.id ORDER BY c.attempt_no DESC LIMIT 1) AS retry_candidate_state,
            (SELECT c.attempt_no FROM discovery_rejected_candidates c
              WHERE c.audit_id=a.id ORDER BY c.attempt_no DESC LIMIT 1) AS retry_candidate_attempt_no,
            (SELECT c.source_kind FROM discovery_rejected_candidates c
              WHERE c.audit_id=a.id ORDER BY c.attempt_no DESC LIMIT 1) AS retry_candidate_source_kind,
            (SELECT COALESCE(jsonb_agg(jsonb_build_object(
                'id', ra.id,
                'txt', ra.txt,
                'html', ra.html,
                'contentSha256', ra.content_sha256
              ) ORDER BY ra.created_at ASC, ra.id ASC), '[]'::jsonb)
               FROM report_artifacts ra
              WHERE ra.audit_id=a.id AND ra.artifact_state='ACTIVE') AS report_artifacts,
            EXISTS (
              SELECT 1 FROM audits other
               WHERE other.type = 'GRATUIT' AND other.id <> a.id
                 AND LOWER(other.email) = LOWER(a.email)
                 AND ABS(EXTRACT(EPOCH FROM (other.created_at - a.created_at))) <= 14 * 86400
                 AND ${DISCOVERY_OTHER_AUDIT_ACTIVE_SQL}
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
    const activeArtifacts = Array.isArray(row.report_artifacts) ? row.report_artifacts : [];
    const activeArtifact = activeArtifacts.length === 1 ? activeArtifacts[0] : null;
    const activeArtifactTxtSha256 = activeArtifact == null
      ? null : discoverySha256(String(activeArtifact.txt));
    const activeArtifactHtmlSha256 = activeArtifact == null
      ? null : discoverySha256(String(activeArtifact.html));
    const activeArtifactContentSha256 = activeArtifact?.contentSha256 == null
      ? null : String(activeArtifact.contentSha256);
    const activeArtifactBindingOk = activeArtifacts.length === 0
      || (activeArtifacts.length === 1
        && typeof activeArtifact.id === "string"
        && /^[a-f0-9-]{36}$/i.test(activeArtifact.id)
        && /^[a-f0-9]{64}$/.test(String(activeArtifactContentSha256 || ""))
        && discoveryArtifactContentHash(String(activeArtifact.txt), String(activeArtifact.html))
          === activeArtifactContentSha256);
    const canonical = resolveCanonicalDiscoveryArtifacts({
      narrativeReport: row.narrative_report,
      reportTxt: row.report_txt,
      reportHtml: row.report_html,
      reportArtifacts: activeArtifacts,
    });
    const structuralGate = evaluateCanonicalDiscoveryArtifacts(canonical);
    const questionnaireErrors = validateDiscoveryQuestionnaireContract(row.responses || {});
    const factual = canonical.report && questionnaireErrors.length === 0
      ? validateDiscoveryReportAgainstResponses(
        canonical.report,
        row.responses || {},
        canonical.report.analysisMetadata,
      )
      : { ok: false, errors: [
        ...(canonical.report ? [] : ["report_missing"]),
        ...questionnaireErrors,
      ] };
    const gate = {
      ok: structuralGate.ok && factual.ok,
      errors: [...new Set([
        ...structuralGate.errors,
        ...factual.errors.map((error) => `factual:${error}`),
      ])],
    };
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
      providerAttemptCount: Number(row.provider_attempt_count || 0),
      retryCandidateId: row.retry_candidate_id || null,
      retryCandidateState: row.retry_candidate_state || null,
      retryCandidateAttemptNo: row.retry_candidate_attempt_no == null
        ? null : Number(row.retry_candidate_attempt_no),
      retryCandidateSourceKind: row.retry_candidate_source_kind || null,
    });
    const regenerationEligible = Number(row.provider_attempt_count || 0) === 1
      && !row.report_sent_at
      && tracking.total === 0
      && !row.delivery_claim_state
      && !superseded
      && !Boolean(row.duplicate_candidate)
      && !Boolean(row.unsubscribed)
      && !gate.ok
      && ["BATCH_REVIEW", "BATCH_READY", "NEEDS_REVIEW", "READY"]
        .includes(String(row.report_delivery_status || ""));
    return {
      id: row.id,
      email: row.email,
      type: row.type,
      createdAt: new Date(row.created_at).toISOString(),
      reportDeliveryStatus: row.report_delivery_status,
      reportSentAt: row.report_sent_at ? new Date(row.report_sent_at).toISOString() : null,
      responses: row.responses || {},
      responsesSha256: discoverySha256(row.responses || {}),
      narrativeSha256: row.narrative_report == null
        ? null : discoverySha256(row.narrative_report),
      txtSha256: row.report_txt == null ? null : discoverySha256(String(row.report_txt)),
      htmlSha256: row.report_html == null ? null : discoverySha256(String(row.report_html)),
      activeArtifactId: activeArtifact?.id == null ? null : String(activeArtifact.id),
      activeArtifactTxtSha256,
      activeArtifactHtmlSha256,
      activeArtifactContentSha256,
      activeArtifactBindingOk,
      deliveryGateOk: gate.ok,
      deliveryGateErrors: gate.errors,
      tracking,
      deliveryClaimState: row.delivery_claim_state || null,
      providerAttemptCount: Number(row.provider_attempt_count || 0),
      retryCandidateId: row.retry_candidate_id || null,
      retryCandidateState: row.retry_candidate_state || null,
      retryCandidateAttemptNo: row.retry_candidate_attempt_no == null
        ? null : Number(row.retry_candidate_attempt_no),
      retryCandidateSourceKind: row.retry_candidate_source_kind || null,
      duplicateCandidate: Boolean(row.duplicate_candidate),
      superseded,
      unsubscribed: Boolean(row.unsubscribed),
      validEmail: isValidDiscoveryRecipientEmail(row.email),
      testEmailBlocked: isBlockedDiscoveryTestEmail(row.email),
      smtpHardFailProven: tracking.hardFailed > 0,
      regenerationEligible,
      cohort: classification.cohort,
      reasons: classification.reasons,
    };
  });
  const commitSha = currentCommitSha();
  const hashPayload = items.map(({ responses, ...item }) => item);
  const manifestSha256 = discoverySha256({
    schemaVersion: 1,
    catalogVersion: DISCOVERY_MECHANISM_CATALOG_VERSION,
    catalogSha256: DISCOVERY_MECHANISM_CATALOG_SHA256,
    commitSha,
    items: hashPayload,
  });
  const count = (cohort: DiscoveryManifestCohort) => items.filter((item) => item.cohort === cohort).length;
  return {
    schemaVersion: 1,
    catalogVersion: DISCOVERY_MECHANISM_CATALOG_VERSION,
    catalogSha256: DISCOVERY_MECHANISM_CATALOG_SHA256,
    generatedAt: new Date().toISOString(),
    source: "database_read_only",
    commitSha,
    counts: {
      total: items.length,
      already_accepted: count("already_accepted"),
      valid_never_sent: count("valid_never_sent"),
      ambiguous: count("ambiguous"),
      invalid: count("invalid"),
      regeneration: items.filter((item) => item.regenerationEligible).length,
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

function assertExactTargetsEligible(
  selected: ManifestRow[],
  stage: "GENERATION" | "REGENERATION" | "DELIVERY",
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
      if (item.providerAttemptCount !== 0) reasons.push("prior_provider_attempt_exists");
      if (!item.activeArtifactBindingOk) reasons.push("active_artifact_binding_incomplete");
    } else if (stage === "REGENERATION") {
      if (!item.regenerationEligible) reasons.push("regeneration_not_classified");
      if (item.reportDeliveryStatus !== "BATCH_REVIEW") reasons.push("not_batch_review");
      if (item.providerAttemptCount !== 1) reasons.push("provider_attempt_count_not_one");
      if (!item.retryCandidateId) reasons.push("retry_candidate_missing");
      if (item.retryCandidateState !== "QUARANTINED") reasons.push("retry_candidate_not_quarantined");
      if (item.retryCandidateAttemptNo !== 1) reasons.push("retry_candidate_attempt_not_one");
      if (item.tracking.total !== 0) reasons.push("prior_tracking_exists");
      if (item.deliveryClaimState) reasons.push("prior_delivery_claim_exists");
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
  stage: "GENERATION" | "REGENERATION" = "GENERATION",
): Promise<Record<string, unknown>> {
  assertGenerationEnvironment();
  if (!await hasBatchControlTables()) throw new Error("DISCOVERY_BATCH_MIGRATION_NOT_APPLIED");
  if (approval.stage !== stage) throw new Error(`DISCOVERY_BATCH_APPROVAL_NOT_${stage}`);
  const tier = approval.tier as DiscoveryBatchTier;
  const selected = resolveExactDiscoveryTargets(manifest.items, approval.targetAuditIds);
  assertExactTargetsEligible(selected, stage);
  const approvalErrors = validateDiscoveryApproval(approval, {
    manifestSha256: manifest.manifestSha256,
    commitSha: manifest.commitSha,
    stage,
    tier,
    targetAuditIds: selected.map((item) => item.id),
    itemCount: selected.length,
  });
  if (approvalErrors.length > 0) throw new Error(`DISCOVERY_BATCH_APPROVAL_INVALID:${approvalErrors.join(",")}`);

  const lock = await acquireDiscoveryGlobalLock({
    owner: `discovery-safe-reconciler:${process.pid}`,
    purpose: `${stage.toLowerCase()}:${manifest.manifestSha256}:${tier}`,
    ttlMinutes: 60,
  });
  let batchId: string | null = null;
  const processed: Array<Record<string, unknown>> = [];
  try {
    batchId = await createDiscoveryBatchRun({
      manifestSha256: manifest.manifestSha256,
      commitSha: manifest.commitSha,
      approvalReference: `${approval.approvalReference}|${approvalSource}|binding:${approval.approvalBindingSha256}`,
      approvalExpiresAt: approval.expiresAt,
      stage,
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
        expectedSourceStatus: item.reportDeliveryStatus,
        expectedTxtSha256: item.txtSha256,
        expectedHtmlSha256: item.htmlSha256,
        expectedActiveArtifactId: item.activeArtifactId,
        expectedActiveArtifactTxtSha256: item.activeArtifactTxtSha256,
        expectedActiveArtifactHtmlSha256: item.activeArtifactHtmlSha256,
        expectedActiveArtifactContentSha256: item.activeArtifactContentSha256,
        retryOfCandidateId: stage === "REGENERATION" ? item.retryCandidateId : null,
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
          costBudgetAuditId: item.id,
          costBudgetBatchId: batchId,
          costBudgetBatchLockToken: lock.token,
        });
        const usage = result.providerEvidence;
        if (!usage?.responseId || usage.totalTokens <= 0 || usage.actualCostUsd <= 0) {
          throw new Error("DISCOVERY_BATCH_USAGE_AMBIGUOUS:provider_evidence_missing");
        }
        if (usage.catalogVersion !== DISCOVERY_MECHANISM_CATALOG_VERSION
          || usage.catalogSha256 !== DISCOVERY_MECHANISM_CATALOG_SHA256
          || !usage.selectionSha256
          || result.catalogProvenance?.catalogVersion !== usage.catalogVersion
          || result.catalogProvenance?.catalogSha256 !== usage.catalogSha256
          || result.catalogProvenance?.selectionSha256 !== usage.selectionSha256
          || result.catalogProvenance?.providerResponseId !== usage.responseId) {
          throw new DiscoveryRejectedCandidateError({
            providerRaw: usage.rawCandidate,
            responseId: usage.responseId,
            model: usage.model,
            validationErrors: ["DISCOVERY_CATALOG_PROVIDER_PROVENANCE_MISMATCH"],
            usage: {
              inputTokens: usage.inputTokens,
              outputTokens: usage.outputTokens,
              totalTokens: usage.totalTokens,
              actualCostUsd: usage.actualCostUsd,
            },
          });
        }
        const usageDecision = await recordDiscoveryProviderUsage({
          batchId,
          auditId: item.id,
          lockToken: lock.token,
          responseId: usage.responseId,
          inputTokens: usage.inputTokens,
          outputTokens: usage.outputTokens,
          totalTokens: usage.totalTokens,
          actualCostUsd: usage.actualCostUsd,
        });
        usageRecorded = true;
        if (usage.actualCostUsd > approval.hardPerScanUsd) {
          throw new Error(`DISCOVERY_BATCH_HARD_COST_BREACH:${usage.actualCostUsd}`);
        }

        let report: Awaited<ReturnType<typeof convertToNarrativeReport>> | undefined;
        let assets: ReturnType<typeof buildDiscoveryReportAssets> | undefined;
        let gate: ReturnType<typeof evaluateDiscoveryDeliveryGate> | undefined;
        const nonRenderedMetadata = {
          blocages: result.blocages,
          ctaMessage: result.ctaMessage,
          questionnaireCoverage: result.questionnaireCoverage,
          catalogProvenance: result.catalogProvenance,
        };
        try {
          report = await convertToNarrativeReport(result, item.responses);
          assets = buildDiscoveryReportAssets(report);
          const validation = validateDiscoveryReportForDelivery(report, assets, nonRenderedMetadata);
          const factual = validateDiscoveryReportAgainstResponses(report, item.responses, nonRenderedMetadata);
          gate = evaluateDiscoveryDeliveryGate(report, assets, undefined, nonRenderedMetadata);
          if (!validation.ok || !factual.ok || !gate.ok) {
            throw new Error([...validation.errors, ...factual.errors, ...gate.errors].join("|"));
          }
        } catch (assemblyError) {
          throw new DiscoveryRejectedCandidateError({
            providerRaw: usage.rawCandidate,
            assembledCandidate: report,
            assembledAssets: assets,
            responseId: usage.responseId,
            model: usage.model,
            validationErrors: [`assembly_or_gate_failure:${assemblyError instanceof Error ? assemblyError.message : String(assemblyError)}`],
            usage: {
              inputTokens: usage.inputTokens,
              outputTokens: usage.outputTokens,
              totalTokens: usage.totalTokens,
              actualCostUsd: usage.actualCostUsd,
            },
          });
        }
        if (!report || !assets || !gate) throw new Error("DISCOVERY_BATCH_ASSEMBLY_EVIDENCE_MISSING");
        const narrativeReport = attachDiscoveryDeliveryGateResult(report as any, gate);
        const persisted = await persistValidatedDiscoveryBatchItem({
          batchId,
          auditId: item.id,
          lockToken: lock.token,
          expectedResponsesSha256: item.responsesSha256,
          expectedSourceStatus: item.reportDeliveryStatus,
          expectedTxtSha256: item.txtSha256,
          expectedHtmlSha256: item.htmlSha256,
          narrativeReport,
          scores: { ...result.scoresByDomain, global: result.globalScore },
          txt: assets.txt,
          html: assets.html,
          model: process.env.OPENAI_DISCOVERY_MODEL || process.env.OPENAI_REPORT_MODEL || "discovery",
        });
        processed.push({
          auditId: item.id,
          status: "STORED",
          actualCostUsd: usage.actualCostUsd,
          worstCaseCostUsd: Number(budget.worstCaseCostUsd.toFixed(6)),
          providerCalls: 1,
          ...persisted,
        });
        if (usageDecision.stop) break;
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        if (providerStartedAt && !usageRecorded && isDiscoveryRejectedCandidateError(error)) {
          const rejected = error.payload;
          await recordDiscoveryProviderUsage({
            batchId,
            auditId: item.id,
            lockToken: lock.token,
            responseId: rejected.responseId,
            inputTokens: rejected.usage.inputTokens,
            outputTokens: rejected.usage.outputTokens,
            totalTokens: rejected.usage.totalTokens,
            actualCostUsd: rejected.usage.actualCostUsd,
          });
          usageRecorded = true;
        }
        try {
          const failed = await failDiscoveryBatchItem({
            batchId,
            auditId: item.id,
            lockToken: lock.token,
            errorCode: detail.split(":")[0].slice(0, 120),
            errorDetail: detail,
            ambiguous: Boolean(providerStartedAt && !isDiscoveryRejectedCandidateError(error)),
            rejectedCandidate: isDiscoveryRejectedCandidateError(error)
              ? error.payload
              : undefined,
          });
          if (!failed) throw new Error("DISCOVERY_BATCH_FAILURE_NOT_DURABLY_RECORDED");
        } catch (failureError) {
          throw new AggregateError(
            [error, failureError],
            "DISCOVERY_BATCH_FAILURE_RECORDING_FAILED",
          );
        }
        processed.push({ auditId: item.id, status: "STOPPED", error: detail });
        break;
      }
    }
    const complete = await completeDiscoveryBatchRun({ batchId, lockToken: lock.token });
    if (!complete) throw new Error("DISCOVERY_BATCH_COMPLETION_NOT_DURABLE");
    return { batchId, stage, tier, selected: selected.length, processed, complete };
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
  const { getReportReadyEmailSubject, sendReportReadyEmail } = await import("../server/emailService");
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
      approvalExpiresAt: approval.expiresAt,
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
        expectedSourceStatus: item.reportDeliveryStatus,
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
      let providerPostStarted = false;
      try {
        await promoteDiscoveryBatchItemForDelivery({
          batchId,
          auditId: item.id,
          lockToken: lock.token,
        });

        const claim = await claimDiscoveryBatchEmailDelivery({
          batchId,
          auditId: item.id,
          lockToken: lock.token,
          recipientEmail: item.email,
          subject,
        });
        claimId = claim.claimId;
        const accepted = await sendReportReadyEmail(item.email, item.id, "GRATUIT", baseUrl, {
          allowProviderFallback: false,
          beforeProviderPost: async () => {
            if (!claimId || !await markDiscoveryDeliveryProviderPostStarted(claimId)) {
              throw new Error("DISCOVERY_DELIVERY_PROVIDER_START_CAS_FAILED");
            }
            providerPostStarted = true;
          },
        });
        if (!accepted) {
          await finalizeDiscoveryDeliveryClaim({
            claimId,
            outcome: providerPostStarted ? "AMBIGUOUS" : "FAILED_FINAL",
            errorDetail: "provider result not durably confirmed",
          });
          processed.push({
            auditId: item.id,
            status: providerPostStarted ? "AMBIGUOUS" : "FAILED_FINAL",
          });
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
          const finalized = await finalizeDiscoveryDeliveryClaim({
            claimId,
            outcome: providerPostStarted ? "AMBIGUOUS" : "FAILED_FINAL",
            errorDetail: detail,
          });
          if (!finalized) throw new Error("DISCOVERY_DELIVERY_FAILURE_NOT_DURABLE");
        } else {
          const failed = await failDiscoveryBatchItem({
            batchId,
            auditId: item.id,
            lockToken: lock.token,
            errorCode: detail.split(":")[0].slice(0, 120),
            errorDetail: detail,
            ambiguous: true,
          });
          if (!failed) throw new Error("DISCOVERY_BATCH_FAILURE_NOT_DURABLY_RECORDED");
        }
        processed.push({ auditId: item.id, status: "STOPPED", error: detail });
        break;
      }
    }
    const complete = await completeDiscoveryBatchRun({ batchId, lockToken: lock.token });
    if (!complete) throw new Error("DISCOVERY_BATCH_COMPLETION_NOT_DURABLE");
    return { batchId, tier, selected: selected.length, processed, complete };
  } finally {
    await releaseDiscoveryGlobalLock(lock.token).catch(() => false);
  }
}

async function main(): Promise<void> {
  await assertDiscoveryBatchSchemaV009(pool);
  const manifest = await buildManifest();
  const outputPath = valueAfter("--out");
  if (outputPath) writeFileSync(outputPath, `${JSON.stringify(manifest, null, 2)}\n`, { flag: "wx" });

  if (args.has("--preflight-generation") || args.has("--preflight-regeneration")) {
    if (args.has("--run-generation") || args.has("--run-regeneration")
      || args.has("--run-delivery") || args.has("--prepare-regeneration")) {
      throw new Error("DISCOVERY_BATCH_PREFLIGHT_ONE_STAGE_ONLY");
    }
    const targetAuditId = valueAfter("--target-audit-id");
    if (!targetAuditId) throw new Error("DISCOVERY_BATCH_PREFLIGHT_TARGET_REQUIRED");
    const selected = resolveExactDiscoveryTargets(manifest.items, [targetAuditId]);
    const preflightStage = args.has("--preflight-regeneration") ? "REGENERATION" : "GENERATION";
    assertExactTargetsEligible(selected, preflightStage);
    const item = selected[0];
    const knowledge = await captureKnowledge(item.responses);
    const budget = assertRealProfileBudget(item.responses, knowledge);
    console.log(`DISCOVERY_BATCH_${preflightStage}_PREFLIGHT_COMPLETE:${JSON.stringify({
      manifestSha256: manifest.manifestSha256,
      commitSha: manifest.commitSha,
      auditId: item.id,
      responsesSha256: item.responsesSha256,
      scopes: [
        { scope: "synthesis", actualChars: knowledge.synthesis.length },
        ...DISCOVERY_PREMIUM_DOMAINS.map((domain) => ({
          scope: `section ${domain}`,
          actualChars: String(knowledge.domains[domain] || "").length,
        })),
      ],
      inputTokenUpperBound: budget.inputTokenUpperBound,
      worstCaseCostUsd: Number(budget.worstCaseCostUsd.toFixed(6)),
      hardCostUsd: HARD_COST_USD,
      providerCalls: 0,
    })}`);
    return;
  }

  if (args.has("--repair-known-corruptions")) {
    throw new Error("DISCOVERY_BATCH_REPAIR_RETIRED_USE_SIGNED_TRANSACTIONAL_OPERATION");
  }

  if (!args.has("--run-generation") && !args.has("--run-regeneration")
    && !args.has("--run-delivery") && !args.has("--prepare-regeneration")) {
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
        providerAttemptCount: item.providerAttemptCount,
        retryCandidateId: item.retryCandidateId,
        retryCandidateState: item.retryCandidateState,
        retryCandidateAttemptNo: item.retryCandidateAttemptNo,
        retryCandidateSourceKind: item.retryCandidateSourceKind,
        duplicateCandidate: item.duplicateCandidate,
        superseded: item.superseded,
        unsubscribed: item.unsubscribed,
        validEmail: item.validEmail,
        testEmailBlocked: item.testEmailBlocked,
        smtpHardFailProven: item.smtpHardFailProven,
        regenerationEligible: item.regenerationEligible,
        cohort: item.cohort,
        reasons: item.reasons,
      });
      const generationCandidates = manifest.items
        .filter((item) => item.cohort === "invalid")
        .map(compactCandidate);
      const deliveryCandidates = manifest.items
        .filter((item) => item.cohort === "valid_never_sent")
        .map(compactCandidate);
      const regenerationCandidates = manifest.items
        .filter((item) => item.regenerationEligible)
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
        regenerationCandidates,
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
  const stageFlags = ["--run-generation", "--run-regeneration", "--run-delivery", "--prepare-regeneration"]
    .filter((flag) => args.has(flag));
  if (stageFlags.length !== 1) {
    throw new Error("DISCOVERY_BATCH_ONE_STAGE_ONLY");
  }
  if (args.has("--prepare-regeneration")) {
    const selected = resolveExactDiscoveryTargets(manifest.items, approval.targetAuditIds);
    if (selected.length !== 1) throw new Error("DISCOVERY_REGENERATION_PREPARE_ONE_TARGET_ONLY");
    const item = selected[0];
    if (!item.regenerationEligible || item.providerAttemptCount !== 1
      || item.reportSentAt || item.tracking.total !== 0
      || item.deliveryClaimState || !["BATCH_REVIEW", "BATCH_READY", "NEEDS_REVIEW", "READY"]
        .includes(String(item.reportDeliveryStatus || ""))) {
      throw new Error("DISCOVERY_REGENERATION_PREPARE_TARGET_INELIGIBLE");
    }
    const approvalErrors = validateDiscoveryApproval(approval, {
      manifestSha256: manifest.manifestSha256,
      commitSha: manifest.commitSha,
      stage: "REGENERATION",
      tier: approval.tier,
      targetAuditIds: [item.id],
      itemCount: 1,
    });
    if (approvalErrors.length > 0) {
      throw new Error(`DISCOVERY_BATCH_APPROVAL_INVALID:${approvalErrors.join(",")}`);
    }
    const lock = await acquireDiscoveryGlobalLock({
      owner: `discovery-regeneration-prepare:${process.pid}`,
      purpose: `regeneration-prepare:${manifest.manifestSha256}`,
      ttlMinutes: 20,
    });
    try {
      const prepared = await prepareDiscoveryAuditForRegeneration(
        {
          auditId: item.id,
          lockToken: lock.token,
          expectedResponsesSha256: item.responsesSha256,
          expectedSourceStatus: item.reportDeliveryStatus,
          expectedNarrativeSha256: item.narrativeSha256,
          expectedTxtSha256: item.txtSha256,
          expectedHtmlSha256: item.htmlSha256,
        },
        pool,
      );
      console.log(`DISCOVERY_REGENERATION_PREPARED:${JSON.stringify({ auditId: item.id, ...prepared })}`);
      return;
    } finally {
      await releaseDiscoveryGlobalLock(lock.token).catch(() => false);
    }
  }
  const result = args.has("--run-generation")
    ? await runGeneration(manifest, approval, approvalSource, "GENERATION")
    : args.has("--run-regeneration")
      ? await runGeneration(manifest, approval, approvalSource, "REGENERATION")
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
