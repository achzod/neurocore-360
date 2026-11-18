/**
 * Provider-backed in-place regeneration of an existing Discovery report with
 * the v3 coach engine.
 *
 * Contract (fail-closed):
 * - report_delivery_status and report_sent_at are NEVER written. The audit
 *   never passes through GENERATING/READY/PENDING/SCHEDULED, so neither
 *   AutoSend nor any sequence can pick it up.
 * - No email function is imported or reachable from this module, and the
 *   email_tracking / discovery_email_delivery_claims counts of the audit are
 *   asserted unchanged inside the swap transaction.
 * - The previous narrative_report / report_txt / report_html / scores are
 *   copied to discovery_report_backups before any provider call.
 * - Every provider call is reserved by the durable cost controller under the
 *   run + item ownership (0.25 USD reservation per call, two calls max per
 *   item, run ceiling <= 15 USD, lifetime per-audit ceiling unchanged).
 * - The swap is a compare-and-swap on the exact previous artifacts, status
 *   and report_sent_at: if anything changed meanwhile nothing is written.
 * - The v3 candidate must pass the full v3 validation (single corrective
 *   retry inside the engine) plus every delivery/persistence gate. On any
 *   failure the previous report stays in place untouched.
 */
import { createHash, randomUUID } from "node:crypto";
import type { PoolClient } from "pg";

import { pool } from "./db";
import {
  analyzeDiscoveryScan,
  buildDiscoveryReportAssets,
  convertToNarrativeReport,
  generateDiscoveryCoachNarrative,
  validateDiscoveryCoachReportProvenance,
  validateDiscoveryPersistenceContract,
  validateDiscoveryReportAgainstResponses,
  validateDiscoveryReportForDelivery,
  type DiscoveryCoachProvider,
} from "./discovery-scan";
import {
  attachDiscoveryDeliveryGateResult,
  evaluateDiscoveryDeliveryGate,
  hasPassingPersistedDiscoveryDeliveryGate,
} from "./discoveryDeliveryGate";
import {
  DISCOVERY_COACH_FIRST_NAME_TOKEN,
  DISCOVERY_COACH_MAX_COST_PER_CALL_USD,
  DISCOVERY_COACH_MAX_WORDS,
  DISCOVERY_COACH_MIN_WORDS,
  DISCOVERY_COACH_SECTION_IDS,
  DISCOVERY_COACH_VERSION,
  discoveryCoachNarrativeSha256,
  discoveryCoachWordCount,
  normalizeDiscoveryCoachProvenanceForLedger,
} from "./discoveryCoachNarrative";
import {
  DISCOVERY_SUPERSEDED_TERMINAL_SQL,
  isDiscoverySupersededTerminal,
} from "./discoverySupersededPolicy";
import { DISCOVERY_TRANSACTION_FENCE_KEY } from "./discoveryTransactionalPersistence";
import {
  DISCOVERY_INPLACE_MAX_RUN_USD,
  discoveryInPlaceIncidentKey,
  ensureDiscoveryInPlaceRegenerationTables,
} from "./discoveryInPlaceRegenerationSchema";
import { runOpenAIText } from "./openaiResponses";

export const DISCOVERY_INPLACE_ALLOWED_STATUSES = [
  "SENT", "NEEDS_REVIEW", "DELIVERY_BLOCKED", "BATCH_READY",
] as const;

export const DISCOVERY_INPLACE_MAX_CONCURRENCY = 3;

export function discoveryInPlaceArtifactHash(txt: unknown, html: unknown): string {
  return createHash("sha256")
    .update(String(txt || ""), "utf8")
    .update("\0", "utf8")
    .update(String(html || ""), "utf8")
    .digest("hex");
}

function stableJson(value: unknown): string {
  if (value === null || value === undefined || typeof value !== "object") return JSON.stringify(value ?? null);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`).join(",")}}`;
}

export function discoveryInPlaceSha256(value: unknown): string {
  return createHash("sha256").update(typeof value === "string" ? value : stableJson(value), "utf8").digest("hex");
}

export function isDiscoveryTestAudit(input: { email?: unknown; firstName?: unknown }): boolean {
  const email = String(input.email || "").trim().toLowerCase();
  const firstName = String(input.firstName || "").trim().toLowerCase();
  return /@example\.(?:com|org|net)$/.test(email)
    || /^test-audit/.test(email)
    || firstName === "test-audit";
}

/** Pure eligibility check. Returns the skip reasons (empty = eligible). */
export function classifyDiscoveryInPlaceCandidate(input: {
  type: unknown;
  status: unknown;
  reportSentAt: unknown;
  reportVersion: unknown;
  email?: unknown;
  firstName?: unknown;
  supersededTerminal?: boolean;
}): string[] {
  const reasons: string[] = [];
  const status = String(input.status || "");
  if (input.type !== "GRATUIT") reasons.push("not_discovery");
  if (input.supersededTerminal) reasons.push("superseded_terminal");
  if (!(DISCOVERY_INPLACE_ALLOWED_STATUSES as readonly string[]).includes(status)) reasons.push(`status_not_allowed:${status || "null"}`);
  if (status === "SENT" && !input.reportSentAt) reasons.push("sent_without_report_sent_at");
  if (status !== "SENT" && input.reportSentAt) reasons.push("report_sent_at_without_sent_status");
  if (Number(input.reportVersion) === 3) reasons.push("already_v3");
  if (isDiscoveryTestAudit({ email: input.email, firstName: input.firstName })) reasons.push("test_audit");
  return reasons;
}

function plainText(html: string): string {
  return String(html || "").replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
}

/** Final structural check of the assembled v3 report, on top of the engine
 * validation and the delivery gates. */
export function validateInPlaceV3Report(report: any, assets: { txt: string; html: string }, narrative: any): string[] {
  const errors: string[] = [];
  if (report?.generationQuality?.version !== 3) errors.push("v3:version");
  const ids = Array.isArray(report?.sections) ? report.sections.map((section: any) => String(section?.id || "")) : [];
  if (ids.join(",") !== [...DISCOVERY_COACH_SECTION_IDS].join(",")) errors.push(`v3:sections:${ids.join("|")}`);
  const all = `${assets.txt}\n${assets.html}\n${JSON.stringify(report?.sections || [])}`;
  if (all.includes(DISCOVERY_COACH_FIRST_NAME_TOKEN) || /\[PRENOM\]/i.test(all)) errors.push("v3:first_name_token_left");
  const firstName = String(report?.clientName || "").trim();
  const intro = Array.isArray(report?.sections) ? report.sections.find((section: any) => section?.id === "intro") : null;
  if (firstName && firstName.toLowerCase() !== "profil" && !plainText(String(intro?.content || "")).includes(firstName)) {
    errors.push("v3:first_name_missing_in_intro");
  }
  const words = narrative ? discoveryCoachWordCount(narrative) : 0;
  if (words < DISCOVERY_COACH_MIN_WORDS || words > DISCOVERY_COACH_MAX_WORDS + 50) errors.push(`v3:words:${words}`);
  // report_txt legitimately carries QUALITY_* metadata lines; only the
  // rendered sections are checked for internal notes.
  const sectionsPlain = (Array.isArray(report?.sections) ? report.sections : [])
    .map((section: any) => plainText(String(section?.content || ""))).join("\n");
  if (/QUALITY_[A-Z_]+|consigne interne|note interne/i.test(sectionsPlain)) errors.push("v3:internal_note");
  return errors;
}

async function beginFenced(client: PoolClient): Promise<string | null> {
  await client.query("BEGIN");
  await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [DISCOVERY_TRANSACTION_FENCE_KEY]);
  const lock = await client.query(
    `SELECT token::text AS token, (expires_at > NOW()) AS active
       FROM discovery_operation_lock WHERE lock_key = 'discovery-global' LIMIT 1`,
  );
  if (lock.rows[0]?.active) throw new Error("DISCOVERY_GLOBAL_LOCK_ACTIVE");
  return lock.rows[0]?.token ? String(lock.rows[0].token) : null;
}

export function assertInPlaceSideEffectsDisabled(env: Record<string, string | undefined> = process.env): void {
  if (String(env.REMEDIATION_SIDE_EFFECTS_DISABLED || "").toLowerCase() !== "true") {
    throw new Error("REMEDIATION_SIDE_EFFECTS_DISABLED=true is mandatory");
  }
  if (String(env.AI_COST_ALERTS_ENABLED || "").toLowerCase() !== "false") {
    throw new Error("AI_COST_ALERTS_ENABLED=false is mandatory");
  }
  if (String(env.DISCOVERY_REPORT_DELIVERY_ENABLED || "").toLowerCase() === "true") {
    throw new Error("DISCOVERY_REPORT_DELIVERY_ENABLED must not be true");
  }
  if (String(env.DISCOVERY_REGENERATED_NOTIFICATION_ENABLED || "").toLowerCase() === "true") {
    throw new Error("DISCOVERY_REGENERATED_NOTIFICATION_ENABLED must not be true");
  }
}

export async function createDiscoveryInPlaceRun(maxTotalUsd: number, note: string): Promise<string> {
  if (!(maxTotalUsd > 0) || maxTotalUsd > DISCOVERY_INPLACE_MAX_RUN_USD) {
    throw new Error(`max total USD must be in (0, ${DISCOVERY_INPLACE_MAX_RUN_USD}]`);
  }
  await ensureDiscoveryInPlaceRegenerationTables(pool);
  const id = randomUUID();
  await pool.query(
    `INSERT INTO discovery_inplace_regen_runs (id, max_total_usd, note) VALUES ($1,$2,$3)`,
    [id, maxTotalUsd, note.slice(0, 500)],
  );
  return id;
}

export async function readDiscoveryInPlaceRunSpend(runId: string): Promise<{ maxTotalUsd: number; spentUsd: number; calls: number }> {
  await ensureDiscoveryInPlaceRegenerationTables(pool);
  const run = await pool.query(`SELECT max_total_usd FROM discovery_inplace_regen_runs WHERE id = $1::uuid`, [runId]);
  if (run.rowCount !== 1) throw new Error("DISCOVERY_INPLACE_RUN_NOT_FOUND");
  const spend = await pool.query(
    `SELECT COUNT(*)::int AS calls,
            COALESCE(SUM(CASE WHEN status = 'COMPLETED' THEN COALESCE(actual_cost_usd, 0)
                              ELSE GREATEST(COALESCE(actual_cost_usd, 0), reserved_cost_usd) END), 0) AS spent
       FROM ai_cost_budget_reservations
      WHERE product = 'discovery' AND authorization_id = $1 AND incident_key LIKE 'discovery-inplace:%'`,
    [runId],
  );
  return {
    maxTotalUsd: Number(run.rows[0].max_total_usd),
    spentUsd: Number(spend.rows[0]?.spent || 0),
    calls: Number(spend.rows[0]?.calls || 0),
  };
}

interface InPlaceClaim {
  itemId: string;
  token: string;
  fenceToken: string | null;
  claimedAt: string;
  preservedStatus: string;
  preservedSentAt: string | null;
  expectedArtifactHash: string;
  previous: {
    narrativeReport: unknown;
    reportTxt: string | null;
    reportHtml: string | null;
    scores: unknown;
  };
  responses: Record<string, unknown>;
  backupId: string;
}

async function claimInPlaceItem(runId: string, auditId: string): Promise<InPlaceClaim> {
  const client = await pool.connect();
  const token = randomUUID();
  const itemId = randomUUID();
  const backupId = randomUUID();
  try {
    const fenceToken = await beginFenced(client);
    const run = await client.query(
      `SELECT status FROM discovery_inplace_regen_runs WHERE id = $1::uuid FOR UPDATE`, [runId],
    );
    if (run.rows[0]?.status !== "OPEN") throw new Error("DISCOVERY_INPLACE_RUN_NOT_OPEN");
    const selected = await client.query(
      `SELECT a.id, a.type, a.email, a.responses, a.report_delivery_status, a.report_sent_at,
              a.narrative_report, a.report_txt, a.report_html, a.scores,
              (SELECT COUNT(*)::int FROM email_tracking e WHERE e.audit_id = a.id) AS tracking_count,
              (SELECT COUNT(*)::int FROM discovery_email_delivery_claims c WHERE c.audit_id = a.id) AS claim_count
         FROM audits a WHERE a.id = $1 FOR UPDATE OF a`,
      [auditId],
    );
    const audit = selected.rows[0];
    if (!audit) throw new Error("DISCOVERY_INPLACE_AUDIT_NOT_FOUND");
    const reasons = classifyDiscoveryInPlaceCandidate({
      type: audit.type,
      status: audit.report_delivery_status,
      reportSentAt: audit.report_sent_at,
      reportVersion: audit.narrative_report?.generationQuality?.version,
      email: audit.email,
      firstName: audit.responses?.prenom,
      supersededTerminal: isDiscoverySupersededTerminal({
        type: audit.type,
        reportDeliveryStatus: audit.report_delivery_status,
        narrativeReport: audit.narrative_report,
      }),
    });
    if (reasons.length > 0) throw new Error(`DISCOVERY_INPLACE_INELIGIBLE:${reasons.join("|")}`);
    const expectedArtifactHash = discoveryInPlaceArtifactHash(audit.report_txt, audit.report_html);
    const claimedAt = new Date().toISOString();
    await client.query(
      `INSERT INTO discovery_inplace_regen_items
         (id, run_id, audit_id, token, state, fence_token, preserved_status, preserved_sent_at,
          expected_artifact_hash, expected_narrative_sha256, expected_responses_sha256,
          tracking_count, delivery_claim_count, claimed_at)
       VALUES ($1,$2::uuid,$3,$4::uuid,'GENERATING',$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
      [itemId, runId, auditId, token, fenceToken, audit.report_delivery_status, audit.report_sent_at,
        expectedArtifactHash, discoveryInPlaceSha256(audit.narrative_report),
        discoveryInPlaceSha256(audit.responses), Number(audit.tracking_count || 0),
        Number(audit.claim_count || 0), claimedAt],
    );
    await client.query(
      `INSERT INTO discovery_report_backups
         (id, run_id, item_id, audit_id, report_delivery_status, report_sent_at,
          narrative_report, report_txt, report_html, scores, artifact_hash)
       VALUES ($1,$2::uuid,$3::uuid,$4,$5,$6,$7::jsonb,$8,$9,$10::jsonb,$11)`,
      [backupId, runId, itemId, auditId, audit.report_delivery_status, audit.report_sent_at,
        audit.narrative_report == null ? null : JSON.stringify(audit.narrative_report),
        audit.report_txt, audit.report_html,
        audit.scores == null ? null : JSON.stringify(audit.scores), expectedArtifactHash],
    );
    await client.query("COMMIT");
    return {
      itemId,
      token,
      fenceToken,
      claimedAt,
      preservedStatus: audit.report_delivery_status,
      preservedSentAt: audit.report_sent_at ? new Date(audit.report_sent_at).toISOString() : null,
      expectedArtifactHash,
      previous: {
        narrativeReport: audit.narrative_report,
        reportTxt: audit.report_txt,
        reportHtml: audit.report_html,
        scores: audit.scores,
      },
      responses: audit.responses || {},
      backupId,
    };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

async function failInPlaceItem(claim: InPlaceClaim, message: string): Promise<void> {
  await pool.query(
    `UPDATE discovery_inplace_regen_items
        SET state = 'FAILED', error = $3, updated_at = NOW()
      WHERE id = $1::uuid AND token = $2::uuid AND state = 'GENERATING'`,
    [claim.itemId, claim.token, message.slice(0, 4000)],
  );
}

export interface DiscoveryInPlaceResult {
  auditId: string;
  ok: boolean;
  status: string;
  reportSentAt: string | null;
  previousArtifactHash: string;
  newArtifactHash?: string;
  backupId?: string;
  itemId?: string;
  attempts?: number;
  costUsd?: number;
  words?: number;
  error?: string;
  backup?: InPlaceClaim["previous"];
}

/**
 * Regenerates one existing Discovery report in place under a durable run.
 * Never changes status/report_sent_at, never sends anything.
 */
export async function regenerateDiscoveryReportInPlace(input: {
  runId: string;
  auditId: string;
  env?: Record<string, string | undefined>;
}): Promise<DiscoveryInPlaceResult> {
  assertInPlaceSideEffectsDisabled(input.env || process.env);
  await ensureDiscoveryInPlaceRegenerationTables(pool);
  const claim = await claimInPlaceItem(input.runId, input.auditId);
  const base = {
    auditId: input.auditId,
    status: claim.preservedStatus,
    reportSentAt: claim.preservedSentAt,
    previousArtifactHash: claim.expectedArtifactHash,
    backupId: claim.backupId,
    itemId: claim.itemId,
    backup: claim.previous,
  };
  const attemptCosts: number[] = [];
  try {
    const provider: DiscoveryCoachProvider = async (request) => {
      const response = await runOpenAIText({
        profile: "discovery",
        instructions: request.instructions,
        input: request.input,
        safetyId: `discovery:${input.auditId}`,
        schema: request.schema,
        schemaName: request.schemaName,
        maxOutputTokens: request.maxOutputTokens,
        retries: 1,
        label: request.attempt > 1 ? "discovery-inplace-regen-retry" : "discovery-inplace-regen",
        costBudget: {
          product: "discovery",
          orderId: input.auditId,
          estimatedCostUsd: DISCOVERY_COACH_MAX_COST_PER_CALL_USD,
          discoveryInPlaceRunId: input.runId,
          discoveryInPlaceItemToken: claim.token,
          discoveryValidationRetry: request.attempt > 1,
        },
      });
      const actualCostUsd = Number(response.usage?.costs.openaiGpt56SolUsd || 0);
      attemptCosts.push(actualCostUsd);
      return {
        text: response.text,
        responseId: response.responseId,
        model: response.model,
        inputTokens: Number(response.usage?.tokens.inputTokens || 0),
        outputTokens: Number(response.usage?.tokens.outputTokens || 0),
        totalTokens: Number(response.usage?.tokens.totalTokens || 0),
        actualCostUsd,
      };
    };
    const result = await analyzeDiscoveryScan(claim.responses as any, {
      generateNarrative: async (normalized) => generateDiscoveryCoachNarrative(normalized, provider),
    });
    const evidence = result.providerEvidence;
    const coachProvenance = result.coachProvenance;
    if (!evidence?.responseId || !coachProvenance || !result.coachNarrative
      || coachProvenance.version !== DISCOVERY_COACH_VERSION
      || coachProvenance.providerResponseId !== evidence.responseId
      || coachProvenance.narrativeSha256 !== discoveryCoachNarrativeSha256(result.coachNarrative)
      || evidence.narrativeSha256 !== coachProvenance.narrativeSha256) {
      throw new Error("DISCOVERY_INPLACE_COACH_PROVIDER_EVIDENCE_MISMATCH");
    }
    const nonRenderedMetadata = {
      blocages: result.blocages,
      ctaMessage: result.ctaMessage,
      questionnaireCoverage: result.questionnaireCoverage,
      coachNarrative: result.coachNarrative,
      coachProvenance,
    };
    const assembled: any = await convertToNarrativeReport(result, claim.responses as any);
    // No extra key is added to the report: the v3 gate rebuilds it
    // deterministically and compares it byte for byte. Provenance of this
    // regeneration lives in discovery_inplace_regen_items / discovery_report_backups.
    const assets = buildDiscoveryReportAssets(assembled);
    const validation = validateDiscoveryReportForDelivery(assembled, assets, nonRenderedMetadata);
    const factual = validateDiscoveryReportAgainstResponses(assembled, claim.responses as any, nonRenderedMetadata);
    const gate = evaluateDiscoveryDeliveryGate(assembled, assets, undefined, nonRenderedMetadata);
    const provenanceErrors = validateDiscoveryCoachReportProvenance(assembled, evidence.responseId);
    const v3Errors = validateInPlaceV3Report(assembled, assets, result.coachNarrative);
    const blocking = [...validation.errors, ...factual.errors, ...gate.errors, ...provenanceErrors, ...v3Errors];
    if (!validation.ok || !factual.ok || !gate.ok || blocking.length > 0) {
      throw new Error(`DISCOVERY_INPLACE_V3_GATE_FAILED:${[...new Set(blocking)].join("|")}`);
    }
    const narrativeReport = attachDiscoveryDeliveryGateResult(assembled, gate);
    const scores = { ...result.scoresByDomain, global: result.globalScore };
    const persistence = validateDiscoveryPersistenceContract({
      narrativeReport, scores, txt: assets.txt, html: assets.html, responses: claim.responses as any,
    });
    if (!persistence.ok || !hasPassingPersistedDiscoveryDeliveryGate(narrativeReport as any)) {
      throw new Error(`DISCOVERY_INPLACE_PERSISTENCE_GATE_FAILED:${persistence.errors.join("|")}`);
    }
    const newArtifactHash = await swapInPlace(claim, input, {
      narrativeReport, scores, txt: assets.txt, html: assets.html, evidence,
      costUsd: Number((evidence as any).attemptsActualCostUsd ?? evidence.actualCostUsd),
    });
    return {
      ...base,
      ok: true,
      newArtifactHash,
      attempts: Number((evidence as any).attempts || 1),
      costUsd: attemptCosts.reduce((sum, value) => sum + value, 0),
      words: discoveryCoachWordCount(result.coachNarrative),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const payloadErrors = (error as any)?.payload?.validationErrors;
    const detail = Array.isArray(payloadErrors) && payloadErrors.length
      ? `${message}:${payloadErrors.slice(0, 20).join("|")}` : message;
    await failInPlaceItem(claim, detail).catch(() => {});
    return {
      ...base,
      ok: false,
      error: detail.slice(0, 2000),
      costUsd: attemptCosts.reduce((sum, value) => sum + value, 0),
    };
  }
}

async function swapInPlace(
  claim: InPlaceClaim,
  input: { runId: string; auditId: string },
  next: {
    narrativeReport: unknown;
    scores: unknown;
    txt: string;
    html: string;
    evidence: NonNullable<Awaited<ReturnType<typeof analyzeDiscoveryScan>>["providerEvidence"]>;
    costUsd: number;
  },
): Promise<string> {
  const client = await pool.connect();
  try {
    const fenceToken = await beginFenced(client);
    if (fenceToken !== claim.fenceToken) throw new Error("DISCOVERY_INPLACE_FENCE_STALE");
    const item = await client.query(
      `SELECT * FROM discovery_inplace_regen_items
        WHERE id = $1::uuid AND token = $2::uuid AND run_id = $3::uuid AND audit_id = $4
        FOR UPDATE`,
      [claim.itemId, claim.token, input.runId, input.auditId],
    );
    const owned = item.rows[0];
    if (!owned || owned.state !== "GENERATING") throw new Error("DISCOVERY_INPLACE_ITEM_OWNERSHIP_LOST");
    const selected = await client.query(
      `SELECT a.type, a.responses, a.report_delivery_status, a.report_sent_at,
              a.narrative_report, a.report_txt, a.report_html,
              (SELECT COUNT(*)::int FROM email_tracking e WHERE e.audit_id = a.id) AS tracking_count,
              (SELECT COUNT(*)::int FROM discovery_email_delivery_claims c WHERE c.audit_id = a.id) AS claim_count
         FROM audits a WHERE a.id = $1 FOR UPDATE OF a`,
      [input.auditId],
    );
    const audit = selected.rows[0];
    const sentMs = (value: unknown) => (value ? new Date(value as string).getTime() : null);
    if (!audit || audit.type !== "GRATUIT"
      || audit.report_delivery_status !== claim.preservedStatus
      || sentMs(audit.report_sent_at) !== sentMs(claim.preservedSentAt)) {
      throw new Error("DISCOVERY_INPLACE_STATUS_CHANGED");
    }
    if (discoveryInPlaceArtifactHash(audit.report_txt, audit.report_html) !== claim.expectedArtifactHash
      || discoveryInPlaceSha256(audit.narrative_report) !== owned.expected_narrative_sha256) {
      throw new Error("DISCOVERY_INPLACE_REPORT_CHANGED_MEANWHILE");
    }
    if (discoveryInPlaceSha256(audit.responses) !== owned.expected_responses_sha256) {
      throw new Error("DISCOVERY_INPLACE_RESPONSES_CHANGED");
    }
    if (Number(audit.tracking_count) !== Number(owned.tracking_count)
      || Number(audit.claim_count) !== Number(owned.delivery_claim_count)) {
      throw new Error("DISCOVERY_INPLACE_DELIVERY_SIDE_EFFECT_DETECTED");
    }
    const evidence = next.evidence;
    const ledger = await client.query(
      `SELECT r.id AS reservation_id, r.actual_cost_usd, e.input_tokens, e.output_tokens,
              e.total_tokens, e.estimated_openai_cost_usd, e.model
         FROM ai_cost_budget_reservations r
         JOIN ai_usage_events e ON e.response_id = r.response_id
        WHERE r.product = 'discovery' AND r.order_id = $1 AND r.response_id = $2
          AND r.status = 'COMPLETED' AND r.authorization_id = $3 AND r.incident_key = $4
          AND r.created_at >= $5::timestamptz AND e.created_at >= $5::timestamptz
          AND e.profile = 'discovery' AND e.status = 'completed'
        FOR UPDATE OF r, e`,
      [input.auditId, evidence.responseId, input.runId, discoveryInPlaceIncidentKey(claim.token), claim.claimedAt],
    );
    const proof = ledger.rows[0];
    if ((ledger.rowCount ?? 0) !== 1
      || Number(proof.input_tokens) !== Number(evidence.inputTokens)
      || Number(proof.output_tokens) !== Number(evidence.outputTokens)
      || Number(proof.total_tokens) !== Number(evidence.totalTokens)
      || String(proof.model || "") !== String(evidence.model || "")
      || Math.abs(Number(proof.actual_cost_usd) - Number(evidence.actualCostUsd)) > 0.000001) {
      throw new Error("DISCOVERY_INPLACE_PROVIDER_LEDGER_MISMATCH");
    }
    const provenance = normalizeDiscoveryCoachProvenanceForLedger(
      (next.narrativeReport as any)?.analysisMetadata?.coachProvenance,
    );
    if (!provenance) throw new Error("DISCOVERY_INPLACE_PROVENANCE_NOT_CANONICAL");
    const bound = await client.query(
      `UPDATE ai_cost_budget_reservations SET detail = $2, updated_at = NOW()
        WHERE id = $1 AND status = 'COMPLETED' AND response_id = $3 RETURNING id`,
      [proof.reservation_id, JSON.stringify(provenance), evidence.responseId],
    );
    if ((bound.rowCount ?? 0) !== 1) throw new Error("DISCOVERY_INPLACE_LEDGER_BINDING_FAILED");

    const contentSha256 = createHash("sha256").update(`txt\0${next.txt}\0html\0${next.html}`).digest("hex");
    const active = await client.query(
      `SELECT id, txt, html, content_sha256 FROM report_artifacts
        WHERE audit_id = $1 AND artifact_state = 'ACTIVE' FOR UPDATE`,
      [input.auditId],
    );
    if ((active.rowCount ?? 0) > 1) throw new Error("DISCOVERY_INPLACE_MULTIPLE_ACTIVE_ARTIFACTS");
    let supersedesId: string | null = null;
    if ((active.rowCount ?? 0) === 1) {
      const previous = active.rows[0];
      if (discoveryInPlaceArtifactHash(previous.txt, previous.html) !== claim.expectedArtifactHash) {
        throw new Error("DISCOVERY_INPLACE_ACTIVE_ARTIFACT_MISMATCH");
      }
      const superseded = await client.query(
        `UPDATE report_artifacts SET artifact_state = 'SUPERSEDED', superseded_at = NOW()
          WHERE id = $1 AND audit_id = $2 AND artifact_state = 'ACTIVE' RETURNING id`,
        [previous.id, input.auditId],
      );
      if ((superseded.rowCount ?? 0) !== 1) throw new Error("DISCOVERY_INPLACE_ARTIFACT_SUPERSEDE_CAS_FAILED");
      supersedesId = String(previous.id);
    } else if (claim.previous.reportTxt || claim.previous.reportHtml) {
      // A delivered/previewable report without its ACTIVE artifact is not a
      // state this path is allowed to guess about.
      if (claim.preservedStatus === "SENT" || claim.preservedStatus === "BATCH_READY") {
        throw new Error("DISCOVERY_INPLACE_ACTIVE_ARTIFACT_MISSING");
      }
    }
    const artifactId = randomUUID();
    const inserted = await client.query(
      `INSERT INTO report_artifacts
         (id, audit_id, tier, engine, model, txt, html, content_sha256,
          artifact_state, supersedes_artifact_id, created_at)
       VALUES ($1,$2,'GRATUIT','discovery-inplace-regen',$3,$4,$5,$6,'ACTIVE',$7,NOW())
       RETURNING id`,
      [artifactId, input.auditId, evidence.model, next.txt, next.html, contentSha256, supersedesId],
    );
    if ((inserted.rowCount ?? 0) !== 1) throw new Error("DISCOVERY_INPLACE_ARTIFACT_INSERT_FAILED");

    // Status, report_sent_at and report_generated_at are deliberately absent
    // from the SET list: delivery state is never touched by this path.
    const updated = await client.query(
      `UPDATE audits
          SET narrative_report = $2::jsonb, scores = $3::jsonb, report_txt = $4, report_html = $5
        WHERE id = $1 AND type = 'GRATUIT'
          AND report_delivery_status = $6
          AND report_sent_at IS NOT DISTINCT FROM $7::timestamptz
          AND report_txt IS NOT DISTINCT FROM $8
          AND report_html IS NOT DISTINCT FROM $9
          AND NOT EXISTS (
            SELECT 1 FROM discovery_operation_lock
             WHERE lock_key = 'discovery-global' AND expires_at > NOW()
          )
          AND ${DISCOVERY_SUPERSEDED_TERMINAL_SQL}
        RETURNING id`,
      [input.auditId, JSON.stringify(next.narrativeReport), JSON.stringify(next.scores), next.txt, next.html,
        claim.preservedStatus, claim.preservedSentAt, audit.report_txt, audit.report_html],
    );
    if ((updated.rowCount ?? 0) !== 1) throw new Error("DISCOVERY_INPLACE_AUDIT_CAS_FAILED");
    const invariant = await client.query(
      `SELECT a.report_delivery_status, a.report_sent_at,
              (SELECT COUNT(*)::int FROM email_tracking e WHERE e.audit_id = a.id) AS tracking_count,
              (SELECT COUNT(*)::int FROM discovery_email_delivery_claims c WHERE c.audit_id = a.id) AS claim_count
         FROM audits a WHERE a.id = $1`,
      [input.auditId],
    );
    const verified = invariant.rows[0];
    if (verified?.report_delivery_status !== claim.preservedStatus
      || sentMs(verified.report_sent_at) !== sentMs(claim.preservedSentAt)
      || Number(verified.tracking_count) !== Number(owned.tracking_count)
      || Number(verified.claim_count) !== Number(owned.delivery_claim_count)) {
      throw new Error("DISCOVERY_INPLACE_INVARIANT_CHANGED");
    }
    const newArtifactHash = discoveryInPlaceArtifactHash(next.txt, next.html);
    const done = await client.query(
      `UPDATE discovery_inplace_regen_items
          SET state = 'PERSISTED', new_artifact_hash = $3, provider_response_id = $4,
              cost_usd = $5, updated_at = NOW()
        WHERE id = $1::uuid AND token = $2::uuid AND state = 'GENERATING' RETURNING id`,
      [claim.itemId, claim.token, newArtifactHash, evidence.responseId, next.costUsd],
    );
    if ((done.rowCount ?? 0) !== 1) throw new Error("DISCOVERY_INPLACE_ITEM_COMPLETION_FAILED");
    await client.query("COMMIT");
    return newArtifactHash;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Manual rollback: puts the backed-up report back, only if the current report
 * is still exactly the one this run persisted and the status is unchanged.
 */
export async function restoreDiscoveryReportFromBackup(input: { runId: string; auditId: string }): Promise<{ restored: true; auditId: string }> {
  await ensureDiscoveryInPlaceRegenerationTables(pool);
  const client = await pool.connect();
  try {
    await beginFenced(client);
    const row = await client.query(
      `SELECT i.id AS item_id, i.new_artifact_hash, i.preserved_status, i.preserved_sent_at,
              b.narrative_report, b.report_txt, b.report_html, b.scores, b.artifact_hash
         FROM discovery_inplace_regen_items i
         JOIN discovery_report_backups b ON b.item_id = i.id
        WHERE i.run_id = $1::uuid AND i.audit_id = $2 AND i.state = 'PERSISTED'
        FOR UPDATE OF i`,
      [input.runId, input.auditId],
    );
    const backup = row.rows[0];
    if (!backup) throw new Error("DISCOVERY_INPLACE_BACKUP_NOT_FOUND");
    const audit = await client.query(
      `SELECT report_txt, report_html FROM audits WHERE id = $1 FOR UPDATE`, [input.auditId],
    );
    const current = audit.rows[0];
    if (!current || discoveryInPlaceArtifactHash(current.report_txt, current.report_html) !== backup.new_artifact_hash) {
      throw new Error("DISCOVERY_INPLACE_RESTORE_REPORT_CHANGED");
    }
    const updated = await client.query(
      `UPDATE audits SET narrative_report = $2::jsonb, report_txt = $3, report_html = $4, scores = $5::jsonb
        WHERE id = $1 AND report_delivery_status = $6
          AND report_sent_at IS NOT DISTINCT FROM $7::timestamptz
          AND report_txt IS NOT DISTINCT FROM $8 AND report_html IS NOT DISTINCT FROM $9
        RETURNING id`,
      [input.auditId, backup.narrative_report == null ? null : JSON.stringify(backup.narrative_report),
        backup.report_txt, backup.report_html, backup.scores == null ? null : JSON.stringify(backup.scores),
        backup.preserved_status, backup.preserved_sent_at, current.report_txt, current.report_html],
    );
    if ((updated.rowCount ?? 0) !== 1) throw new Error("DISCOVERY_INPLACE_RESTORE_CAS_FAILED");
    const active = await client.query(
      `UPDATE report_artifacts SET artifact_state = 'SUPERSEDED', superseded_at = NOW()
        WHERE audit_id = $1 AND artifact_state = 'ACTIVE' AND engine = 'discovery-inplace-regen'
        RETURNING supersedes_artifact_id`,
      [input.auditId],
    );
    if ((active.rowCount ?? 0) !== 1) throw new Error("DISCOVERY_INPLACE_RESTORE_ARTIFACT_CAS_FAILED");
    const previousId = active.rows[0].supersedes_artifact_id;
    if (previousId) {
      await client.query(
        `UPDATE report_artifacts SET artifact_state = 'ACTIVE', superseded_at = NULL
          WHERE id = $1 AND audit_id = $2 AND artifact_state = 'SUPERSEDED'`,
        [previousId, input.auditId],
      );
    }
    await client.query(
      `UPDATE discovery_inplace_regen_items SET state = 'RESTORED', updated_at = NOW() WHERE id = $1::uuid`,
      [backup.item_id],
    );
    await client.query("COMMIT");
    return { restored: true, auditId: input.auditId };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}
