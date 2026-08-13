import { createHash, randomUUID } from "node:crypto";
import type { Pool, PoolClient } from "pg";

import { DISCOVERY_SUPERSEDED_TERMINAL_SQL } from "./discoverySupersededPolicy";

export const DISCOVERY_GLOBAL_LOCK_KEY = "discovery-global";
export const DISCOVERY_BATCH_SOFT_COST_USD = 0.25;
export const DISCOVERY_BATCH_HARD_COST_USD = 0.75;
export const DISCOVERY_BATCH_TIERS = ["ONE", "THREE", "FIVE", "REST"] as const;

export type DiscoveryBatchTier = typeof DISCOVERY_BATCH_TIERS[number];
export type DiscoveryManifestCohort =
  | "already_accepted"
  | "valid_never_sent"
  | "ambiguous"
  | "invalid";

export interface DiscoveryManifestTrackingSummary {
  total: number;
  accepted: number;
  failed: number;
  pending: number;
  hardFailed?: number;
}

export interface DiscoveryManifestCandidate {
  id: string;
  email: string;
  type: string;
  reportDeliveryStatus?: string | null;
  reportSentAt?: Date | string | null;
  superseded?: boolean;
  duplicateCandidate?: boolean;
  unsubscribed?: boolean;
  deliveryGateOk: boolean;
  deliveryGateErrors?: string[];
  tracking: DiscoveryManifestTrackingSummary;
  deliveryClaimState?: string | null;
}

export interface DiscoveryManifestClassification {
  cohort: DiscoveryManifestCohort;
  reasons: string[];
}

export interface DiscoveryBudgetState {
  globalBudgetUsd: number;
  actualCostUsd: number;
  reservedCostUsd: number;
  softPerScanUsd?: number;
  hardPerScanUsd?: number;
}

export interface DiscoveryBudgetDecision {
  ok: boolean;
  reason?: string;
  hardReservationUsd: number;
  remainingBeforeUsd: number;
  remainingAfterUsd: number;
}

export interface DiscoveryApproval {
  schemaVersion: 1;
  manifestSha256: string;
  commitSha: string;
  approvalReference: string;
  expiresAt: string;
  stage: "GENERATION" | "DELIVERY";
  tier: DiscoveryBatchTier;
  targetAuditIds: string[];
  approvalBindingSha256: string;
  maxItems: number;
  globalBudgetUsd: number;
  softPerScanUsd: number;
  hardPerScanUsd: number;
}

export interface DiscoveryGeneratedPersistenceInput {
  batchId: string;
  auditId: string;
  lockToken: string;
  expectedResponsesSha256: string;
  narrativeReport: unknown;
  scores: unknown;
  txt: string;
  html: string;
  model: string;
}

export interface DiscoveryBatchManifestItemInput {
  auditId: string;
  sequenceNo: number;
  cohort: DiscoveryManifestCohort;
  expectedResponsesSha256: string;
  expectedTxtSha256?: string | null;
  expectedHtmlSha256?: string | null;
  initialState?: "QUEUED" | "STORED";
}

function normalizeNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function roundUsd(value: number): number {
  return Math.round((value + Number.EPSILON) * 1_000_000) / 1_000_000;
}

export function stableJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`)
    .join(",")}}`;
}

export function discoverySha256(value: unknown): string {
  const input = typeof value === "string" ? value : stableJson(value);
  return createHash("sha256").update(input).digest("hex");
}

export function discoveryArtifactContentHash(txt: string, html: string): string {
  return discoverySha256(`txt\0${txt}\0html\0${html}`);
}

const DISCOVERY_APPROVAL_MAX_BYTES = 16 * 1024;

/** Decode an approval transported through the dedicated environment variable.
 * Errors are deliberately constant so neither the approval JSON nor PII can
 * be reflected into stdout/stderr. */
export function decodeDiscoveryApprovalBase64(encoded: unknown): DiscoveryApproval {
  const value = typeof encoded === "string" ? encoded.trim() : "";
  if (!value) throw new Error("DISCOVERY_BATCH_APPROVAL_B64_MISSING");
  if (value.length > Math.ceil(DISCOVERY_APPROVAL_MAX_BYTES / 3) * 4) {
    throw new Error("DISCOVERY_BATCH_APPROVAL_B64_TOO_LARGE");
  }
  if (value.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(value)) {
    throw new Error("DISCOVERY_BATCH_APPROVAL_B64_INVALID");
  }
  const decoded = Buffer.from(value, "base64");
  if (decoded.length === 0 || decoded.length > DISCOVERY_APPROVAL_MAX_BYTES
    || decoded.toString("base64") !== value
    || !Buffer.from(decoded.toString("utf8"), "utf8").equals(decoded)) {
    throw new Error("DISCOVERY_BATCH_APPROVAL_B64_INVALID");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(decoded.toString("utf8"));
  } catch {
    throw new Error("DISCOVERY_BATCH_APPROVAL_JSON_INVALID");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("DISCOVERY_BATCH_APPROVAL_JSON_INVALID");
  }
  return parsed as DiscoveryApproval;
}

export function isValidDiscoveryRecipientEmail(email: unknown): boolean {
  const normalized = String(email || "").trim().toLowerCase();
  if (!normalized || normalized.length > 254 || /\s/.test(normalized)) return false;
  if (!/^[^@]+@[^@]+\.[a-z]{2,63}$/.test(normalized)) return false;
  const [local, domain] = normalized.split("@");
  if (!local || local.length > 64 || local.startsWith(".") || local.endsWith(".") || local.includes("..")) return false;
  if (!domain || domain.startsWith(".") || domain.endsWith(".") || domain.includes("..")) return false;
  return true;
}

export function isBlockedDiscoveryTestEmail(email: unknown): boolean {
  const normalized = String(email || "").trim().toLowerCase();
  if (!normalized) return true;
  const [local = "", domain = ""] = normalized.split("@");
  return normalized.includes("achzodcoaching")
    || normalized.includes("achkou")
    || /(^|[+._-])test($|[+._-])/.test(local)
    || local === "test"
    || local.startsWith("test+")
    || local.startsWith("test-")
    || local.startsWith("test_")
    || local.includes("+test")
    || local === "debug"
    || local.startsWith("debug+")
    || local.startsWith("debug-")
    || local.startsWith("debug_")
    || domain === "example.com"
    || domain === "example.org"
    || domain === "example.net"
    || domain.endsWith(".example")
    || domain.endsWith(".invalid")
    || domain === "invalid.example"
    || domain === "localhost"
    || domain.includes("mailinator");
}

export function discoveryApprovalBindingHash(
  approval: Omit<DiscoveryApproval, "approvalBindingSha256"> | DiscoveryApproval,
): string {
  const { approvalBindingSha256: _ignored, ...payload } = approval as DiscoveryApproval;
  return discoverySha256(payload);
}

export function resolveExactDiscoveryTargets<T extends { id: string }>(
  manifestItems: readonly T[],
  targetAuditIds: readonly string[],
): T[] {
  if (!Array.isArray(targetAuditIds) || targetAuditIds.length === 0) {
    throw new Error("DISCOVERY_BATCH_TARGETS_REQUIRED");
  }
  const normalized = targetAuditIds.map((id) => String(id || "").trim().toLowerCase());
  if (normalized.some((id) => !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(id))) {
    throw new Error("DISCOVERY_BATCH_TARGET_ID_INVALID");
  }
  if (new Set(normalized).size !== normalized.length) {
    throw new Error("DISCOVERY_BATCH_TARGET_DUPLICATE");
  }
  const byId = new Map(manifestItems.map((item) => [String(item.id).toLowerCase(), item]));
  return normalized.map((id) => {
    const item = byId.get(id);
    if (!item) throw new Error(`DISCOVERY_BATCH_TARGET_NOT_IN_MANIFEST:${id}`);
    return item;
  });
}

export function classifyDiscoveryManifestCandidate(
  candidate: DiscoveryManifestCandidate,
): DiscoveryManifestClassification {
  const reasons: string[] = [];
  const status = String(candidate.reportDeliveryStatus || "").toUpperCase();
  const claimState = String(candidate.deliveryClaimState || "").toUpperCase();
  const claimAccepted = ["PROVIDER_ACCEPTED", "SMTP_CONFIRMED"].includes(claimState);

  if (candidate.type !== "GRATUIT") reasons.push("not_discovery");
  if (!isValidDiscoveryRecipientEmail(candidate.email)) reasons.push("invalid_email");
  if (isBlockedDiscoveryTestEmail(candidate.email)) reasons.push("test_email_blocked");
  if (candidate.unsubscribed) reasons.push("recipient_unsubscribed");
  if (candidate.superseded || status === "SUPERSEDED") reasons.push("superseded_terminal");
  if (candidate.duplicateCandidate) reasons.push("duplicate_candidate");
  if (Number(candidate.tracking.hardFailed || 0) > 0) reasons.push("smtp_hard_fail_proven_terminal");
  if (reasons.length > 0) return { cohort: "ambiguous", reasons };

  if (candidate.tracking.accepted > 0 || claimAccepted) {
    reasons.push(candidate.tracking.accepted > 0 ? "accepted_tracking_exists" : "accepted_delivery_claim_exists");
    return { cohort: "already_accepted", reasons };
  }

  if (candidate.reportSentAt) reasons.push("sent_marker_without_acceptance_proof");
  if (candidate.tracking.failed > 0) reasons.push("failed_delivery_attempt_exists");
  if (candidate.tracking.pending > 0) reasons.push("pending_delivery_attempt_exists");
  if (candidate.tracking.total > 0 && candidate.tracking.accepted === 0) {
    reasons.push("tracking_exists_without_acceptance");
  }
  if (["CLAIMED", "PROVIDER_POST_STARTED", "AMBIGUOUS"].includes(claimState)) {
    reasons.push(`delivery_claim_${claimState.toLowerCase()}`);
  }
  if (status === "SENDING") reasons.push("audit_sending_without_acceptance_proof");

  if (reasons.length > 0) return { cohort: "ambiguous", reasons };

  if (candidate.deliveryGateOk) {
    return { cohort: "valid_never_sent", reasons: ["delivery_gate_pass", "no_delivery_attempt"] };
  }

  return {
    cohort: "invalid",
    reasons: candidate.deliveryGateErrors?.length
      ? candidate.deliveryGateErrors.map((error) => `delivery_gate:${error}`)
      : ["delivery_gate_failed"],
  };
}

export function selectDiscoveryTier<T>(
  orderedItems: readonly T[],
  tier: DiscoveryBatchTier,
): T[] {
  const limits: Record<Exclude<DiscoveryBatchTier, "REST">, number> = {
    ONE: 1,
    THREE: 3,
    FIVE: 5,
  };
  return tier === "REST" ? [...orderedItems] : orderedItems.slice(0, limits[tier]);
}

export function evaluateDiscoveryBudgetReservation(
  state: DiscoveryBudgetState,
): DiscoveryBudgetDecision {
  const globalBudgetUsd = roundUsd(normalizeNumber(state.globalBudgetUsd));
  const actualCostUsd = roundUsd(normalizeNumber(state.actualCostUsd));
  const reservedCostUsd = roundUsd(normalizeNumber(state.reservedCostUsd));
  const softPerScanUsd = roundUsd(normalizeNumber(state.softPerScanUsd ?? DISCOVERY_BATCH_SOFT_COST_USD));
  const hardPerScanUsd = roundUsd(normalizeNumber(state.hardPerScanUsd ?? DISCOVERY_BATCH_HARD_COST_USD));
  const remainingBeforeUsd = roundUsd(globalBudgetUsd - actualCostUsd - reservedCostUsd);
  const remainingAfterUsd = roundUsd(remainingBeforeUsd - hardPerScanUsd);

  if (globalBudgetUsd <= 0) {
    return { ok: false, reason: "global_budget_not_positive", hardReservationUsd: hardPerScanUsd, remainingBeforeUsd, remainingAfterUsd };
  }
  if (softPerScanUsd <= 0 || hardPerScanUsd < softPerScanUsd) {
    return { ok: false, reason: "invalid_per_scan_limits", hardReservationUsd: hardPerScanUsd, remainingBeforeUsd, remainingAfterUsd };
  }
  if (hardPerScanUsd > DISCOVERY_BATCH_HARD_COST_USD) {
    return { ok: false, reason: "hard_limit_above_policy", hardReservationUsd: hardPerScanUsd, remainingBeforeUsd, remainingAfterUsd };
  }
  if (remainingAfterUsd < 0) {
    return { ok: false, reason: "global_budget_exhausted", hardReservationUsd: hardPerScanUsd, remainingBeforeUsd, remainingAfterUsd };
  }
  return { ok: true, hardReservationUsd: hardPerScanUsd, remainingBeforeUsd, remainingAfterUsd };
}

export function validateDiscoveryApproval(
  approval: DiscoveryApproval,
  expected: {
    manifestSha256: string;
    commitSha: string;
    stage: "GENERATION" | "DELIVERY";
    tier: DiscoveryBatchTier;
    targetAuditIds: string[];
    itemCount: number;
    now?: Date;
  },
): string[] {
  const errors: string[] = [];
  if (approval.schemaVersion !== 1) errors.push("approval_schema_version");
  if (!/^[a-f0-9]{64}$/.test(approval.manifestSha256)) errors.push("approval_manifest_hash_format");
  if (approval.manifestSha256 !== expected.manifestSha256) errors.push("approval_manifest_hash_mismatch");
  if (approval.commitSha !== expected.commitSha) errors.push("approval_commit_mismatch");
  if (approval.stage !== expected.stage) errors.push("approval_stage_mismatch");
  if (approval.tier !== expected.tier) errors.push("approval_tier_mismatch");
  if (!Array.isArray(approval.targetAuditIds) || approval.targetAuditIds.length === 0) {
    errors.push("approval_target_ids_missing");
  } else {
    const normalizedApprovalTargets = approval.targetAuditIds.map((id) => String(id || "").trim().toLowerCase());
    const normalizedExpectedTargets = expected.targetAuditIds.map((id) => String(id || "").trim().toLowerCase());
    if (new Set(normalizedApprovalTargets).size !== normalizedApprovalTargets.length) {
      errors.push("approval_target_ids_duplicate");
    }
    if (normalizedApprovalTargets.some((id) => !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(id))) {
      errors.push("approval_target_id_invalid");
    }
    if (JSON.stringify(normalizedApprovalTargets) !== JSON.stringify(normalizedExpectedTargets)) {
      errors.push("approval_target_ids_mismatch");
    }
  }
  if (!/^[a-f0-9]{64}$/.test(String(approval.approvalBindingSha256 || ""))) {
    errors.push("approval_binding_hash_format");
  } else if (approval.approvalBindingSha256 !== discoveryApprovalBindingHash(approval)) {
    errors.push("approval_binding_hash_mismatch");
  }
  if (!approval.approvalReference.trim()) errors.push("approval_reference_missing");
  const expiresAt = new Date(approval.expiresAt);
  if (!Number.isFinite(expiresAt.getTime()) || expiresAt <= (expected.now || new Date())) {
    errors.push("approval_expired");
  }
  if (!Number.isInteger(approval.maxItems) || approval.maxItems <= 0) errors.push("approval_max_items_invalid");
  if (approval.maxItems !== expected.itemCount || approval.targetAuditIds?.length !== expected.itemCount) {
    errors.push("approval_item_count_mismatch");
  }
  const tierExpectedCount = expected.tier === "ONE" ? 1 : expected.tier === "THREE" ? 3 : expected.tier === "FIVE" ? 5 : null;
  if (tierExpectedCount !== null && expected.itemCount !== tierExpectedCount) {
    errors.push("approval_tier_item_count_mismatch");
  }
  if (approval.softPerScanUsd !== DISCOVERY_BATCH_SOFT_COST_USD) errors.push("approval_soft_limit_mismatch");
  if (approval.hardPerScanUsd !== DISCOVERY_BATCH_HARD_COST_USD) errors.push("approval_hard_limit_mismatch");
  if (expected.stage === "GENERATION" && approval.globalBudgetUsd < expected.itemCount * approval.hardPerScanUsd) {
    errors.push("approval_global_budget_too_low");
  }
  if (expected.stage === "DELIVERY" && approval.globalBudgetUsd !== 0) {
    errors.push("approval_delivery_budget_must_be_zero");
  }
  return errors;
}

async function resolvePool(poolOverride?: Pool): Promise<Pool> {
  if (poolOverride) return poolOverride;
  return (await import("./db")).pool;
}

export async function isDiscoveryGlobalLockActive(poolOverride?: Pool): Promise<boolean> {
  try {
    const pool = await resolvePool(poolOverride);
    const result = await pool.query(
      `SELECT 1 FROM discovery_operation_lock
        WHERE lock_key = $1 AND expires_at > NOW()
        LIMIT 1`,
      [DISCOVERY_GLOBAL_LOCK_KEY],
    );
    return (result.rowCount ?? 0) > 0;
  } catch (error) {
    console.error("[DiscoveryBatch] Lock check failed; failing closed:", error);
    return true;
  }
}

export async function acquireDiscoveryGlobalLock(
  input: { owner: string; purpose: string; ttlMinutes?: number },
  poolOverride?: Pool,
): Promise<{ token: string; expiresAt: Date }> {
  const pool = await resolvePool(poolOverride);
  const token = randomUUID();
  const ttlMinutes = Math.max(5, Math.min(60, Math.floor(input.ttlMinutes ?? 20)));
  const result = await pool.query(
    `INSERT INTO discovery_operation_lock
       (lock_key, owner, token, purpose, acquired_at, refreshed_at, expires_at)
     VALUES ($1,$2,$3,$4,NOW(),NOW(),NOW() + ($5 || ' minutes')::interval)
     ON CONFLICT (lock_key) DO UPDATE SET
       owner = EXCLUDED.owner,
       token = EXCLUDED.token,
       purpose = EXCLUDED.purpose,
       acquired_at = NOW(),
       refreshed_at = NOW(),
       expires_at = EXCLUDED.expires_at
     WHERE discovery_operation_lock.expires_at <= NOW()
     RETURNING token, expires_at`,
    [DISCOVERY_GLOBAL_LOCK_KEY, input.owner, token, input.purpose, String(ttlMinutes)],
  );
  if ((result.rowCount ?? 0) !== 1) throw new Error("DISCOVERY_BATCH_LOCK_BUSY");
  return { token: result.rows[0].token, expiresAt: new Date(result.rows[0].expires_at) };
}

export async function refreshDiscoveryGlobalLock(
  token: string,
  ttlMinutes = 20,
  poolOverride?: Pool,
): Promise<boolean> {
  const pool = await resolvePool(poolOverride);
  const ttl = Math.max(5, Math.min(60, Math.floor(ttlMinutes)));
  const result = await pool.query(
    `UPDATE discovery_operation_lock
        SET refreshed_at = NOW(), expires_at = NOW() + ($3 || ' minutes')::interval
      WHERE lock_key = $1 AND token = $2 AND expires_at > NOW()
      RETURNING token`,
    [DISCOVERY_GLOBAL_LOCK_KEY, token, String(ttl)],
  );
  return (result.rowCount ?? 0) === 1;
}

export async function releaseDiscoveryGlobalLock(
  token: string,
  poolOverride?: Pool,
): Promise<boolean> {
  const pool = await resolvePool(poolOverride);
  const result = await pool.query(
    `DELETE FROM discovery_operation_lock WHERE lock_key = $1 AND token = $2`,
    [DISCOVERY_GLOBAL_LOCK_KEY, token],
  );
  return (result.rowCount ?? 0) === 1;
}

export async function createDiscoveryBatchRun(
  input: {
    manifestSha256: string;
    commitSha: string;
    approvalReference: string;
    stage: "GENERATION" | "DELIVERY";
    tier: DiscoveryBatchTier;
    globalBudgetUsd: number;
    softPerScanUsd: number;
    hardPerScanUsd: number;
    lockToken: string;
    items: DiscoveryBatchManifestItemInput[];
  },
  poolOverride?: Pool,
): Promise<string> {
  const pool = await resolvePool(poolOverride);
  const client = await pool.connect();
  const batchId = randomUUID();
  try {
    await client.query("BEGIN");
    const lock = await client.query(
      `SELECT 1 FROM discovery_operation_lock
        WHERE lock_key = $1 AND token = $2 AND expires_at > NOW()
        FOR UPDATE`,
      [DISCOVERY_GLOBAL_LOCK_KEY, input.lockToken],
    );
    if ((lock.rowCount ?? 0) !== 1) throw new Error("DISCOVERY_BATCH_LOCK_NOT_OWNED");
    await client.query(
      `INSERT INTO discovery_batch_runs
         (id, manifest_sha256, commit_sha, approval_reference, status, stage, tier,
          soft_per_scan_usd, hard_per_scan_usd, global_budget_usd, target_count, lock_token)
       VALUES ($1,$2,$3,$4,'PREPARED',$5,$6,$7,$8,$9,$10,$11)`,
      [batchId, input.manifestSha256, input.commitSha, input.approvalReference,
        input.stage, input.tier, input.softPerScanUsd, input.hardPerScanUsd,
        input.globalBudgetUsd, input.items.length, input.lockToken],
    );
    for (const item of input.items) {
      await client.query(
        `INSERT INTO discovery_batch_items
           (batch_id, audit_id, sequence_no, cohort, state,
            expected_responses_sha256, expected_txt_sha256, expected_html_sha256,
            generated_txt_sha256, generated_html_sha256)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [batchId, item.auditId, item.sequenceNo, item.cohort,
          item.initialState || "QUEUED", item.expectedResponsesSha256,
          item.expectedTxtSha256 || null, item.expectedHtmlSha256 || null,
          item.initialState === "STORED" ? item.expectedTxtSha256 || null : null,
          item.initialState === "STORED" ? item.expectedHtmlSha256 || null : null],
      );
    }
    await client.query("COMMIT");
    return batchId;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

export async function markDiscoveryBatchItemPreflightOk(
  input: { batchId: string; auditId: string; lockToken: string },
  poolOverride?: Pool,
): Promise<boolean> {
  const pool = await resolvePool(poolOverride);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const batch = await assertBatchOwnership(client, input.batchId, input.lockToken);
    const result = await client.query(
      `UPDATE discovery_batch_items SET state = 'PREFLIGHT_OK', updated_at = NOW()
        WHERE batch_id = $1 AND audit_id = $2 AND state = 'QUEUED' AND provider_calls = 0
        RETURNING audit_id`,
      [input.batchId, input.auditId],
    );
    await client.query("COMMIT");
    return (result.rowCount ?? 0) === 1;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

export async function failDiscoveryBatchItem(
  input: {
    batchId: string;
    auditId: string;
    lockToken: string;
    errorCode: string;
    errorDetail: string;
    ambiguous?: boolean;
  },
  poolOverride?: Pool,
): Promise<void> {
  const pool = await resolvePool(poolOverride);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await assertBatchOwnership(client, input.batchId, input.lockToken);
    const itemResult = await client.query(
      `SELECT reserved_cost_usd FROM discovery_batch_items
        WHERE batch_id = $1 AND audit_id = $2 FOR UPDATE`,
      [input.batchId, input.auditId],
    );
    if ((itemResult.rowCount ?? 0) !== 1) throw new Error("DISCOVERY_BATCH_ITEM_MISSING");
    const reserved = Number(itemResult.rows[0].reserved_cost_usd || 0);
    await client.query(
      `UPDATE discovery_batch_items
          SET state = $3, reserved_cost_usd = 0, error_code = $4,
              error_detail = $5, updated_at = NOW()
        WHERE batch_id = $1 AND audit_id = $2`,
      [input.batchId, input.auditId, input.ambiguous ? "AMBIGUOUS" : "FAILED",
        input.errorCode, input.errorDetail.slice(0, 4000)],
    );
    await client.query(
      `UPDATE discovery_batch_runs
          SET status = 'PAUSED', stop_reason = $2,
              reserved_cost_usd = GREATEST(0, reserved_cost_usd - $3), updated_at = NOW()
        WHERE id = $1`,
      [input.batchId, input.errorCode, reserved],
    );
    await client.query(
      `UPDATE audits SET report_delivery_status = 'BATCH_REVIEW'
        WHERE id = $1 AND type = 'GRATUIT' AND report_sent_at IS NULL
          AND ${DISCOVERY_SUPERSEDED_TERMINAL_SQL}`,
      [input.auditId],
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

export async function completeDiscoveryBatchRun(
  input: { batchId: string; lockToken: string },
  poolOverride?: Pool,
): Promise<boolean> {
  const pool = await resolvePool(poolOverride);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await assertBatchOwnership(client, input.batchId, input.lockToken);
    const unfinished = await client.query(
      `SELECT COUNT(*)::int AS count FROM discovery_batch_items
        WHERE batch_id = $1 AND state NOT IN ('STORED','DELIVERED','SKIPPED')`,
      [input.batchId],
    );
    if (Number(unfinished.rows[0].count) !== 0) {
      await client.query("ROLLBACK");
      return false;
    }
    const result = await client.query(
      `UPDATE discovery_batch_runs
          SET status = 'COMPLETED', processed_count = target_count,
              completed_at = NOW(), updated_at = NOW()
        WHERE id = $1 AND status IN ('PREPARED','RUNNING') RETURNING id`,
      [input.batchId],
    );
    await client.query("COMMIT");
    return (result.rowCount ?? 0) === 1;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

async function assertBatchOwnership(
  client: PoolClient,
  batchId: string,
  lockToken: string,
): Promise<any> {
  const result = await client.query(
    `SELECT b.*
       FROM discovery_batch_runs b
       JOIN discovery_operation_lock l
         ON l.lock_key = $2 AND l.token = b.lock_token
      WHERE b.id = $1 AND b.lock_token = $3 AND l.expires_at > NOW()
      FOR UPDATE OF b`,
    [batchId, DISCOVERY_GLOBAL_LOCK_KEY, lockToken],
  );
  if ((result.rowCount ?? 0) !== 1) throw new Error("DISCOVERY_BATCH_OWNERSHIP_LOST");
  return result.rows[0];
}

export async function claimDiscoveryProviderAttempt(
  input: { batchId: string; auditId: string; lockToken: string },
  poolOverride?: Pool,
): Promise<{ startedAt: Date; reservedCostUsd: number }> {
  const pool = await resolvePool(poolOverride);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const batch = await assertBatchOwnership(client, input.batchId, input.lockToken);
    if (!["PREPARED", "RUNNING"].includes(String(batch.status))) throw new Error("DISCOVERY_BATCH_NOT_RUNNABLE");
    const itemResult = await client.query(
      `SELECT * FROM discovery_batch_items
        WHERE batch_id = $1 AND audit_id = $2
        FOR UPDATE`,
      [input.batchId, input.auditId],
    );
    if ((itemResult.rowCount ?? 0) !== 1) throw new Error("DISCOVERY_BATCH_ITEM_MISSING");
    const item = itemResult.rows[0];
    if (!["QUEUED", "PREFLIGHT_OK"].includes(String(item.state))) throw new Error("DISCOVERY_BATCH_ITEM_NOT_QUEUED");
    if (Number(item.provider_calls) !== 0) throw new Error("DISCOVERY_BATCH_MONO_CALL_VIOLATION");

    const budget = evaluateDiscoveryBudgetReservation({
      globalBudgetUsd: batch.global_budget_usd,
      actualCostUsd: batch.actual_cost_usd,
      reservedCostUsd: batch.reserved_cost_usd,
      softPerScanUsd: batch.soft_per_scan_usd,
      hardPerScanUsd: batch.hard_per_scan_usd,
    });
    if (!budget.ok) throw new Error(`DISCOVERY_BATCH_BUDGET_BLOCKED:${budget.reason}`);

    const claimed = await client.query(
      `UPDATE discovery_batch_items
          SET state = 'PROVIDER_STARTED', provider_calls = 1,
              provider_started_at = NOW(), reserved_cost_usd = $3, updated_at = NOW()
        WHERE batch_id = $1 AND audit_id = $2 AND provider_calls = 0
          AND state IN ('QUEUED','PREFLIGHT_OK')
        RETURNING provider_started_at`,
      [input.batchId, input.auditId, budget.hardReservationUsd],
    );
    if ((claimed.rowCount ?? 0) !== 1) throw new Error("DISCOVERY_BATCH_PROVIDER_CLAIM_RACE");
    await client.query(
      `UPDATE discovery_batch_runs
          SET status = 'RUNNING', reserved_cost_usd = reserved_cost_usd + $2, updated_at = NOW()
        WHERE id = $1`,
      [input.batchId, budget.hardReservationUsd],
    );
    await client.query("COMMIT");
    return {
      startedAt: new Date(claimed.rows[0].provider_started_at),
      reservedCostUsd: budget.hardReservationUsd,
    };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

export async function recordDiscoveryProviderUsage(
  input: {
    batchId: string;
    auditId: string;
    lockToken: string;
    responseId: string;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    actualCostUsd: number;
  },
  poolOverride?: Pool,
): Promise<{ stop: boolean; stopReason?: string }> {
  const pool = await resolvePool(poolOverride);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const batch = await assertBatchOwnership(client, input.batchId, input.lockToken);
    const itemResult = await client.query(
      `SELECT * FROM discovery_batch_items WHERE batch_id = $1 AND audit_id = $2 FOR UPDATE`,
      [input.batchId, input.auditId],
    );
    if ((itemResult.rowCount ?? 0) !== 1) throw new Error("DISCOVERY_BATCH_ITEM_MISSING");
    const item = itemResult.rows[0];
    if (String(item.state) !== "PROVIDER_STARTED" || Number(item.provider_calls) !== 1) {
      throw new Error("DISCOVERY_BATCH_USAGE_WITHOUT_PROVIDER_CLAIM");
    }
    const actualCostUsd = roundUsd(input.actualCostUsd);
    const hard = roundUsd(Number(batch.hard_per_scan_usd));
    const soft = roundUsd(Number(batch.soft_per_scan_usd));
    const stopReason = actualCostUsd > hard
      ? `hard_cost_limit_exceeded:${actualCostUsd.toFixed(6)}/${hard.toFixed(6)}`
      : actualCostUsd > soft
        ? `soft_cost_limit_exceeded:${actualCostUsd.toFixed(6)}/${soft.toFixed(6)}`
        : undefined;
    await client.query(
      `UPDATE discovery_batch_items
          SET state = 'GENERATED', provider_response_id = $3,
              input_tokens = $4, output_tokens = $5, total_tokens = $6,
              actual_cost_usd = $7, reserved_cost_usd = 0, updated_at = NOW()
        WHERE batch_id = $1 AND audit_id = $2`,
      [input.batchId, input.auditId, input.responseId, input.inputTokens, input.outputTokens, input.totalTokens, actualCostUsd],
    );
    await client.query(
      `UPDATE discovery_batch_runs
          SET reserved_cost_usd = GREATEST(0, reserved_cost_usd - $2),
              actual_cost_usd = actual_cost_usd + $3,
              status = CASE WHEN $4::text IS NULL THEN status ELSE 'PAUSED' END,
              stop_reason = COALESCE($4, stop_reason), updated_at = NOW()
        WHERE id = $1`,
      [input.batchId, Number(item.reserved_cost_usd), actualCostUsd, stopReason || null],
    );
    await client.query("COMMIT");
    return stopReason ? { stop: true, stopReason } : { stop: false };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

export async function persistValidatedDiscoveryBatchItem(
  input: DiscoveryGeneratedPersistenceInput,
  poolOverride?: Pool,
): Promise<{ artifactId: string; txtSha256: string; htmlSha256: string }> {
  const pool = await resolvePool(poolOverride);
  const client = await pool.connect();
  const txtSha256 = discoverySha256(input.txt);
  const htmlSha256 = discoverySha256(input.html);
  const contentSha256 = discoveryArtifactContentHash(input.txt, input.html);
  try {
    await client.query("BEGIN");
    const batch = await assertBatchOwnership(client, input.batchId, input.lockToken);
    const itemResult = await client.query(
      `SELECT * FROM discovery_batch_items WHERE batch_id = $1 AND audit_id = $2 FOR UPDATE`,
      [input.batchId, input.auditId],
    );
    if ((itemResult.rowCount ?? 0) !== 1) throw new Error("DISCOVERY_BATCH_ITEM_MISSING");
    const item = itemResult.rows[0];
    if (!['GENERATED','VALIDATED'].includes(String(item.state)) || Number(item.provider_calls) !== 1) {
      throw new Error("DISCOVERY_BATCH_ITEM_NOT_VALIDATED");
    }
    if (Number(item.actual_cost_usd) > Number(batch.hard_per_scan_usd)) {
      throw new Error("DISCOVERY_BATCH_HARD_COST_BREACH");
    }
    const auditResult = await client.query(
      `SELECT id, responses, report_sent_at, report_delivery_status, narrative_report
         FROM audits WHERE id = $1 AND type = 'GRATUIT' FOR UPDATE`,
      [input.auditId],
    );
    if ((auditResult.rowCount ?? 0) !== 1) throw new Error("DISCOVERY_AUDIT_MISSING");
    const audit = auditResult.rows[0];
    if (audit.report_sent_at) throw new Error("DISCOVERY_AUDIT_ALREADY_SENT");
    if (discoverySha256(audit.responses) !== input.expectedResponsesSha256) {
      throw new Error("DISCOVERY_AUDIT_RESPONSES_CHANGED");
    }
    if (String(item.expected_responses_sha256) !== input.expectedResponsesSha256) {
      throw new Error("DISCOVERY_BATCH_MANIFEST_RESPONSES_MISMATCH");
    }

    const artifactId = randomUUID();
    const artifact = await client.query(
      `INSERT INTO report_artifacts
         (id, audit_id, tier, engine, model, txt, html, content_sha256, batch_id, created_at)
       VALUES ($1,$2,'GRATUIT','discovery',$3,$4,$5,$6,$7,NOW())
       ON CONFLICT (audit_id, content_sha256) WHERE content_sha256 IS NOT NULL
       DO UPDATE SET batch_id = EXCLUDED.batch_id
       RETURNING id`,
      [artifactId, input.auditId, input.model, input.txt, input.html, contentSha256, input.batchId],
    );
    const persistedArtifactId = String(artifact.rows[0].id);
    const updated = await client.query(
      `UPDATE audits
          SET narrative_report = $2::jsonb, scores = $3::jsonb,
              report_txt = $4, report_html = $5, report_generated_at = NOW(),
              report_delivery_status = 'BATCH_READY'
        WHERE id = $1 AND report_sent_at IS NULL AND ${DISCOVERY_SUPERSEDED_TERMINAL_SQL}
        RETURNING id`,
      [input.auditId, JSON.stringify(input.narrativeReport), JSON.stringify(input.scores), input.txt, input.html],
    );
    if ((updated.rowCount ?? 0) !== 1) throw new Error("DISCOVERY_AUDIT_PERSISTENCE_CAS_FAILED");
    await client.query(
      `UPDATE discovery_batch_items
          SET state = 'STORED', generated_txt_sha256 = $3,
              generated_html_sha256 = $4, artifact_id = $5, updated_at = NOW()
        WHERE batch_id = $1 AND audit_id = $2`,
      [input.batchId, input.auditId, txtSha256, htmlSha256, persistedArtifactId],
    );
    await client.query("COMMIT");
    return { artifactId: persistedArtifactId, txtSha256, htmlSha256 };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

export async function claimDiscoveryEmailDelivery(
  input: {
    batchId?: string;
    auditId: string;
    lockToken?: string;
    recipientEmail: string;
    subject: string;
    expectedTxtSha256: string;
    expectedHtmlSha256: string;
  },
  poolOverride?: Pool,
): Promise<{ claimId: string; claimedAt: Date }> {
  const pool = await resolvePool(poolOverride);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const isBatch = Boolean(input.batchId || input.lockToken);
    if (isBatch && (!input.batchId || !input.lockToken)) {
      throw new Error("DISCOVERY_DELIVERY_BATCH_OWNERSHIP_INCOMPLETE");
    }
    let item: any = null;
    if (isBatch) {
      await assertBatchOwnership(client, input.batchId!, input.lockToken!);
      const itemResult = await client.query(
        `SELECT * FROM discovery_batch_items WHERE batch_id = $1 AND audit_id = $2 FOR UPDATE`,
        [input.batchId, input.auditId],
      );
      if ((itemResult.rowCount ?? 0) !== 1 || String(itemResult.rows[0].state) !== "STORED") {
        throw new Error("DISCOVERY_BATCH_ITEM_NOT_STORED");
      }
      item = itemResult.rows[0];
    }
    const auditResult = await client.query(
      `SELECT id, email, report_sent_at, report_delivery_status, report_txt, report_html,
              narrative_report
         FROM audits WHERE id = $1 AND type = 'GRATUIT' FOR UPDATE`,
      [input.auditId],
    );
    if ((auditResult.rowCount ?? 0) !== 1) throw new Error("DISCOVERY_AUDIT_MISSING");
    const audit = auditResult.rows[0];
    if (audit.report_sent_at) throw new Error("DISCOVERY_AUDIT_ALREADY_SENT");
    const allowedStatuses = isBatch ? ["BATCH_READY"] : ["READY", "SCHEDULED"];
    if (!allowedStatuses.includes(String(audit.report_delivery_status))) {
      throw new Error("DISCOVERY_AUDIT_NOT_DELIVERABLE");
    }
    const recovery = audit.narrative_report?.recovery || {};
    if (String(audit.report_delivery_status) === "SUPERSEDED"
      || String(recovery.disposition || "").toLowerCase() === "superseded"
      || String(recovery.replacementAuditId || "").trim()) {
      throw new Error("DISCOVERY_AUDIT_SUPERSEDED");
    }
    if (String(audit.email).trim().toLowerCase() !== input.recipientEmail.trim().toLowerCase()) {
      throw new Error("DISCOVERY_DELIVERY_RECIPIENT_MISMATCH");
    }
    const txtSha256 = discoverySha256(String(audit.report_txt || ""));
    const htmlSha256 = discoverySha256(String(audit.report_html || ""));
    if (txtSha256 !== input.expectedTxtSha256 || htmlSha256 !== input.expectedHtmlSha256
      || (isBatch && (txtSha256 !== String(item.generated_txt_sha256)
        || htmlSha256 !== String(item.generated_html_sha256)))) {
      throw new Error("DISCOVERY_DELIVERY_ARTIFACT_HASH_MISMATCH");
    }

    const previousTracking = await client.query(
      `SELECT 1 FROM email_tracking
        WHERE audit_id = $1 AND email_type = 'sendReportReadyEmail'
        LIMIT 1`,
      [input.auditId],
    );
    if ((previousTracking.rowCount ?? 0) > 0) throw new Error("DISCOVERY_DELIVERY_PRIOR_TRACKING_EXISTS");

    const blockedRecipient = await client.query(
      `SELECT
         EXISTS (
           SELECT 1 FROM email_unsubscribes u
            WHERE LOWER(u.email) = LOWER($1)
         ) AS unsubscribed,
         EXISTS (
           SELECT 1 FROM email_tracking t
            WHERE LOWER(t.recipient_email) = LOWER($1)
              AND (
                LOWER(COALESCE(t.sendpulse_status,'')) = 'bounced'
                OR (
                  LOWER(COALESCE(t.sendpulse_status,'')) = 'failed'
                  AND (
                    COALESCE(t.sendpulse_error,'') ~* '"eventType"[[:space:]]*:[[:space:]]*"(hard_fail|bounce)"'
                    OR COALESCE(t.metadata->>'sendpulseSmtpAnswerCode','') ~ '^5[0-9]{2}$'
                  )
                )
              )
         ) AS hard_bounced`,
      [input.recipientEmail],
    );
    if (blockedRecipient.rows[0]?.unsubscribed) throw new Error("DISCOVERY_DELIVERY_RECIPIENT_UNSUBSCRIBED");
    if (blockedRecipient.rows[0]?.hard_bounced) throw new Error("DISCOVERY_DELIVERY_RECIPIENT_HARD_BOUNCED");

    const claimId = randomUUID();
    const claimed = await client.query(
      `INSERT INTO discovery_email_delivery_claims
         (id, batch_id, audit_id, email_type, recipient_email,
          report_txt_sha256, report_html_sha256, subject_sha256, state)
       VALUES ($1,$2,$3,'sendReportReadyEmail',$4,$5,$6,$7,'CLAIMED')
       ON CONFLICT (audit_id, email_type) DO NOTHING
       RETURNING id, created_at`,
      [claimId, input.batchId || null, input.auditId, input.recipientEmail.trim().toLowerCase(),
        txtSha256, htmlSha256, discoverySha256(input.subject)],
    );
    if ((claimed.rowCount ?? 0) !== 1) throw new Error("DISCOVERY_DELIVERY_CLAIM_EXISTS");
    const auditClaimed = await client.query(
      `UPDATE audits SET report_delivery_status = 'SENDING'
        WHERE id = $1 AND report_sent_at IS NULL
          AND report_delivery_status = ANY($2::text[])
          AND ${DISCOVERY_SUPERSEDED_TERMINAL_SQL}
        RETURNING id`,
      [input.auditId, allowedStatuses],
    );
    if ((auditClaimed.rowCount ?? 0) !== 1) throw new Error("DISCOVERY_DELIVERY_AUDIT_CLAIM_CAS_FAILED");
    if (isBatch) {
      await client.query(
        `UPDATE discovery_batch_items SET state = 'DELIVERY_CLAIMED', updated_at = NOW()
          WHERE batch_id = $1 AND audit_id = $2`,
        [input.batchId, input.auditId],
      );
    }
    await client.query("COMMIT");
    return { claimId, claimedAt: new Date(claimed.rows[0].created_at) };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

export async function claimDiscoveryBatchEmailDelivery(
  input: {
    batchId: string;
    auditId: string;
    lockToken: string;
    recipientEmail: string;
    subject: string;
    expectedTxtSha256?: string;
    expectedHtmlSha256?: string;
  },
  poolOverride?: Pool,
): Promise<{ claimId: string; claimedAt: Date }> {
  if (!input.expectedTxtSha256 || !input.expectedHtmlSha256) {
    const pool = await resolvePool(poolOverride);
    const item = await pool.query(
      `SELECT generated_txt_sha256, generated_html_sha256
         FROM discovery_batch_items WHERE batch_id = $1 AND audit_id = $2`,
      [input.batchId, input.auditId],
    );
    if ((item.rowCount ?? 0) !== 1) throw new Error("DISCOVERY_BATCH_ITEM_MISSING");
    input.expectedTxtSha256 = String(item.rows[0].generated_txt_sha256 || "");
    input.expectedHtmlSha256 = String(item.rows[0].generated_html_sha256 || "");
  }
  return claimDiscoveryEmailDelivery(input as Required<typeof input>, poolOverride);
}

export async function markDiscoveryDeliveryProviderPostStarted(
  claimId: string,
  poolOverride?: Pool,
): Promise<boolean> {
  const pool = await resolvePool(poolOverride);
  const result = await pool.query(
    `UPDATE discovery_email_delivery_claims
        SET state = 'PROVIDER_POST_STARTED', provider_post_started_at = NOW(), updated_at = NOW()
      WHERE id = $1 AND state = 'CLAIMED' RETURNING id`,
    [claimId],
  );
  return (result.rowCount ?? 0) === 1;
}

export async function finalizeDiscoveryDeliveryClaim(
  input: {
    claimId: string;
    outcome: "PROVIDER_ACCEPTED" | "SMTP_CONFIRMED" | "AMBIGUOUS" | "FAILED_FINAL";
    providerTaskId?: string;
    errorDetail?: string;
  },
  poolOverride?: Pool,
): Promise<boolean> {
  const pool = await resolvePool(poolOverride);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query(
      `UPDATE discovery_email_delivery_claims
          SET state = $2, provider_task_id = COALESCE($3, provider_task_id),
              provider_accepted_at = CASE WHEN $2 IN ('PROVIDER_ACCEPTED','SMTP_CONFIRMED') THEN NOW() ELSE provider_accepted_at END,
              smtp_confirmed_at = CASE WHEN $2 = 'SMTP_CONFIRMED' THEN NOW() ELSE smtp_confirmed_at END,
              error_detail = $4, updated_at = NOW()
        WHERE id = $1
          AND (
            ($2 IN ('PROVIDER_ACCEPTED','SMTP_CONFIRMED','AMBIGUOUS') AND state = 'PROVIDER_POST_STARTED')
            OR ($2 = 'FAILED_FINAL' AND state = 'CLAIMED')
          )
        RETURNING batch_id, audit_id`,
      [input.claimId, input.outcome, input.providerTaskId || null, input.errorDetail || null],
    );
    if ((result.rowCount ?? 0) !== 1) {
      await client.query("ROLLBACK");
      return false;
    }
    const row = result.rows[0];
    if (["PROVIDER_ACCEPTED", "SMTP_CONFIRMED"].includes(input.outcome)) {
      const auditFinalized = await client.query(
        `UPDATE audits SET report_delivery_status = 'SENT', report_sent_at = NOW()
          WHERE id = $1 AND report_sent_at IS NULL AND report_delivery_status = 'SENDING'
            AND ${DISCOVERY_SUPERSEDED_TERMINAL_SQL}
          RETURNING id`,
        [row.audit_id],
      );
      if ((auditFinalized.rowCount ?? 0) !== 1) {
        throw new Error("DISCOVERY_DELIVERY_AUDIT_FINALIZE_CAS_FAILED");
      }
      if (row.batch_id) {
        await client.query(
          `UPDATE discovery_batch_items SET state = 'DELIVERED', updated_at = NOW()
            WHERE batch_id = $1 AND audit_id = $2`,
          [row.batch_id, row.audit_id],
        );
      }
    } else {
      await client.query(
        `UPDATE audits SET report_delivery_status = $2
          WHERE id = $1 AND report_sent_at IS NULL AND report_delivery_status = 'SENDING'
            AND ${DISCOVERY_SUPERSEDED_TERMINAL_SQL}`,
        [row.audit_id, input.outcome === "AMBIGUOUS" ? "DELIVERY_AMBIGUOUS" : "DELIVERY_BLOCKED"],
      );
      if (row.batch_id) {
        await client.query(
          `UPDATE discovery_batch_items
              SET state = $3, error_code = $4, error_detail = $5, updated_at = NOW()
            WHERE batch_id = $1 AND audit_id = $2`,
          [row.batch_id, row.audit_id,
            input.outcome === "AMBIGUOUS" ? "AMBIGUOUS" : "FAILED",
            `delivery_${input.outcome.toLowerCase()}`, input.errorDetail || null],
        );
        await client.query(
          `UPDATE discovery_batch_runs SET status = 'PAUSED', stop_reason = $2, updated_at = NOW()
            WHERE id = $1`,
          [row.batch_id, `delivery_${input.outcome.toLowerCase()}`],
        );
      }
    }
    await client.query("COMMIT");
    return true;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}
