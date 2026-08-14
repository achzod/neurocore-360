import { createHash, randomUUID } from "node:crypto";
import type { Pool, PoolClient } from "pg";

import { isDiscoveryTransactionalAutomationEligible } from "./discoveryAutomationPolicy";
import {
  attachDiscoveryDeliveryGateResult,
  evaluateCanonicalDiscoveryArtifacts,
  evaluateDiscoveryDeliveryGate,
  hasPassingPersistedDiscoveryDeliveryGate,
  resolveCanonicalDiscoveryArtifacts,
} from "./discoveryDeliveryGate";
import {
  DISCOVERY_APPROVED_NEUTRAL_PROMO_HTML,
  buildDiscoveryReportAssets,
  validateDiscoveryFactualConsistency,
} from "./discovery-scan";
import {
  DISCOVERY_OTHER_AUDIT_ACTIVE_SQL,
  DISCOVERY_SUPERSEDED_TERMINAL_SQL,
} from "./discoverySupersededPolicy";
import { DISCOVERY_TRANSACTION_FENCE_KEY } from "./discoveryTransactionalPersistence";

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
  providerAttemptCount?: number;
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
  expectedSourceStatus: string | null;
  expectedTxtSha256: string | null;
  expectedHtmlSha256: string | null;
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
  expectedSourceStatus: string | null;
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
  if (Number(candidate.providerAttemptCount || 0) > 0) reasons.push("prior_provider_attempt_exists");
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
  const client = await pool.connect();
  const token = randomUUID();
  const ttlMinutes = Math.max(5, Math.min(60, Math.floor(input.ttlMinutes ?? 20)));
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [DISCOVERY_TRANSACTION_FENCE_KEY]);
    const inFlight = await client.query(
      `SELECT
         EXISTS (
           SELECT 1 FROM ai_cost_budget_reservations
            WHERE product = 'discovery' AND status IN ('RESERVED','UNCERTAIN')
         ) AS provider_in_flight,
         EXISTS (
           SELECT 1 FROM discovery_email_delivery_claims
            WHERE state IN ('CLAIMED','PROVIDER_POST_STARTED','AMBIGUOUS')
         ) AS delivery_in_flight`,
    );
    if (inFlight.rows[0]?.provider_in_flight || inFlight.rows[0]?.delivery_in_flight) {
      throw new Error("DISCOVERY_BATCH_IN_FLIGHT_OPERATION");
    }
    const result = await client.query(
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
    await client.query("COMMIT");
    return { token: result.rows[0].token, expiresAt: new Date(result.rows[0].expires_at) };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
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
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [DISCOVERY_TRANSACTION_FENCE_KEY]);
    const result = await client.query(
      `UPDATE discovery_operation_lock
          SET refreshed_at = NOW(),
              expires_at = GREATEST(NOW(), acquired_at + INTERVAL '1 microsecond')
        WHERE lock_key = $1 AND token = $2
        RETURNING token`,
      [DISCOVERY_GLOBAL_LOCK_KEY, token],
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

export const DISCOVERY_PRELAUNCH_TEST_TARGETS = Object.freeze([
  Object.freeze({
    id: "83720dda-b8fc-4892-ba9d-4a77e67aa46c",
    email: "test-discovery-v2@example.com",
  }),
  Object.freeze({
    id: "5d977279-8158-4857-8a1d-eae36c6a3c26",
    email: "test-workflow-disc@test.com",
  }),
  Object.freeze({
    id: "d8ff4fb6-961c-4b2f-8152-d181091e1ec5",
    email: "final-test-discovery@test.com",
  }),
]);

export const DISCOVERY_VALID_NO_DELIVERY_TARGET = Object.freeze({
  id: "451d4b41-3784-4ede-9b32-d83ce33e882d",
  email: "eiphos17@gmail.com",
  expectedArtifactCount: 4,
});

export const DISCOVERY_LENNY_QUALITY_FIX_TARGET = Object.freeze({
  id: "b9abc7a5-8767-49a0-9e6c-c90798cc67f5",
  emailSha256: "b012445572ab0daac016bba32823e79213345600658d35871f58b7b3655041d0",
  expectedCurrentStatus: "BATCH_READY" as const,
  expectedTxtSha256: "80d68e14a50c38559bbebfbc29899018773b0cbbeda12ec37803af3ccb6fcb8b",
  expectedHtmlSha256: "37d00ff2824bfc2471dffe532110162c1ec4a53a8be3754a88885c68061e9600",
  expectedArtifactCount: 1,
  expectedNarrativeTopLevelKeys: Object.freeze([
    "analysisMetadata", "auditType", "clientName", "generatedAt", "generationQuality",
    "globalScore", "metrics", "sections", "validationResult",
  ]),
  sectionIndex: 5,
  sectionId: "sommeil",
  oldText: "La seule nuance se trouve au matin. une fatigue parfois présente au réveil, ton énergie matinale est moyenne et tu te réveilles parfois fatigué.",
  newText: "La seule nuance se trouve au réveil : une fatigue parfois présente et une énergie matinale moyenne.",
  nutritionSectionIndex: 1,
  nutritionSectionId: "global",
  nutritionOldText: "la régularité et la qualité de l’apport protéique deviennent plus importantes. je n'ai pas les éléments pour juger les quantités, la répartition ni l’apport énergétique total avec les réponses disponibles.",
  nutritionNewText: "la régularité et la qualité de l’apport protéique deviennent plus importantes. Je n'ai pas les éléments pour juger les quantités, la répartition ni l’apport énergétique total avec les réponses disponibles.",
  expectedNutritionOccurrencesPerArtifact: 1,
  promoSectionIndex: 11,
  promoSectionId: "coaching",
  expectedPromoCodeOccurrencesPerArtifact: 1,
  legacyPromoHtml: `<p class="text-xs mt-1" style="color: var(--color-text-muted);">Laisse un avis sur ton Discovery Scan ci-dessous. Après validation, tu recevras ton code promo <code class="px-1 py-0.5 rounded" style="background: var(--color-border); color: var(--color-primary);">${["DISCOVERY", "20"].join("")}</code> par email.</p>`,
  approvedNeutralPromoHtml: DISCOVERY_APPROVED_NEUTRAL_PROMO_HTML,
});

/**
 * Exact live state after the first Lenny repair on a2958c26. A second,
 * independent generated sentence in the global summary still overstated the
 * questionnaire answer `reveil-fatigue=parfois`. This target is deliberately
 * bound to the post-repair hashes and artifact identity so it cannot be used
 * against another report revision.
 */
export const DISCOVERY_LENNY_WAKE_SUMMARY_FIX_TARGET = Object.freeze({
  id: "b9abc7a5-8767-49a0-9e6c-c90798cc67f5",
  emailSha256: "b012445572ab0daac016bba32823e79213345600658d35871f58b7b3655041d0",
  expectedCurrentStatus: "BATCH_READY" as const,
  expectedResponsesJsonSha256: "0c5a9a85e1229063ba0c804ed3a67bda829244a47cef8edbd75ad4a71a585baf",
  expectedNarrativeJsonSha256: "7b8832dd52f574e66faaa792e68a4e08e4527160d3730cdfcb35162c4829344e",
  expectedTxtSha256: "61013575279537114f4def26e22deabf62299bc25c66fb6feac0c7ad293719a4",
  expectedHtmlSha256: "fa0dffd8246e3d46e6824f0bf7da70e30027f26fa8d6fe47682d7b8efce3e20a",
  expectedArtifactId: "6488d309-2ad3-45b2-8488-5a659f6d4d1e",
  expectedArtifactContentSha256: "3cd304c3af49870341f64a1f11321046e9b40727379026fdc1f09c1ed7a2c1d0",
  expectedArtifactCount: 1,
  expectedNarrativeTopLevelKeys: Object.freeze([
    "analysisMetadata", "auditType", "clientName", "generatedAt", "generationQuality",
    "globalScore", "metrics", "sections", "validationResult",
  ]),
  sectionIndex: 1,
  sectionId: "global",
  oldText: "ton énergie matinale est moyenne, le lever est difficile et tu te réveilles parfois fatigué",
  newText: "ton énergie matinale est moyenne et tu te réveilles parfois fatigué",
  expectedOccurrencesPerRepresentation: 1,
  alreadyFixedSleepText: "La seule nuance se trouve au réveil : une fatigue parfois présente et une énergie matinale moyenne.",
  alreadyFixedNutritionText: "la régularité et la qualité de l’apport protéique deviennent plus importantes. Je n'ai pas les éléments pour juger les quantités, la répartition ni l’apport énergétique total avec les réponses disponibles.",
  promoSectionIndex: 11,
  promoSectionId: "coaching",
  approvedNeutralPromoHtml: DISCOVERY_APPROVED_NEUTRAL_PROMO_HTML,
});

export interface ExactDiscoveryWakeSummaryRepairTarget {
  id: string;
  emailSha256: string;
  expectedCurrentStatus: "BATCH_READY";
  expectedResponsesJsonSha256: string;
  expectedNarrativeJsonSha256: string;
  expectedTxtSha256: string;
  expectedHtmlSha256: string;
  expectedArtifactId: string;
  expectedArtifactContentSha256: string;
  expectedArtifactCount: 1;
  expectedNarrativeTopLevelKeys: readonly string[];
  sectionIndex: number;
  sectionId: string;
  oldText: string;
  newText: string;
  expectedOccurrencesPerRepresentation: 1;
  alreadyFixedSleepText: string;
  alreadyFixedNutritionText: string;
  promoSectionIndex: number;
  promoSectionId: "coaching";
  approvedNeutralPromoHtml: string;
}

/**
 * Exact live Alexandre revision generated on 0680bb9c. The same contradictory
 * sentence is stored once in the visible scans section and once in the hidden
 * CTA metadata, while each rendered representation contains it exactly once.
 */
export const DISCOVERY_ALEXANDRE_CRITICAL_COPY_FIX_TARGET = Object.freeze({
  id: "e860b380-3a6e-4c64-b823-3422476b7cd2",
  emailSha256: "0ae1447d6dd547ce59b3d116435794a73f7b36965b5fe03f5c3698127411ecce",
  expectedCurrentStatus: "BATCH_READY" as const,
  expectedResponsesJsonSha256: "b3dd042c5ba5b64989348646347cc9c21d474d85ce96b7617a2a849d91b40971",
  expectedNarrativeJsonSha256: "2147a235dd65955d4d8f9ebdf829ecc1b2d0b19ef7052776d7ac27c4548a206f",
  expectedTxtSha256: "ce268c2cf958cb7bd917e615402a12200095a4954ef1cc01d65094245c5627f3",
  expectedHtmlSha256: "d74285b0493264ccf97e35a2a4e97bce4c49b2689cc9213cfbd7f4a2dc982b34",
  expectedArtifactId: "f27134ab-123e-483f-b18d-a24993dc324a",
  expectedArtifactContentSha256: "3789fdeaa4d2f2b6278aa4a56da5ad3e0e7fc46f0b89a126f32c9461b57396eb",
  expectedArtifactCount: 1,
  expectedNarrativeTopLevelKeys: Object.freeze([
    "analysisMetadata", "auditType", "clientName", "generatedAt", "generationQuality",
    "globalScore", "metrics", "sections", "validationResult",
  ]),
  sectionIndex: 10,
  sectionId: "scans",
  metadataKey: "ctaMessage" as const,
  oldText: "2 blocages structurants ressortent de tes réponses, sans atteindre le niveau critique calculé.",
  newText: "2 blocages structurants ressortent de tes réponses.",
  expectedNarrativeOccurrences: 2,
  expectedRenderedOccurrences: 1,
} satisfies ExactDiscoveryCriticalCopyRepairTarget);

export interface ExactDiscoveryCriticalCopyRepairTarget {
  id: string;
  emailSha256: string;
  expectedCurrentStatus: "BATCH_READY";
  expectedResponsesJsonSha256: string;
  expectedNarrativeJsonSha256: string;
  expectedTxtSha256: string;
  expectedHtmlSha256: string;
  expectedArtifactId: string;
  expectedArtifactContentSha256: string;
  expectedArtifactCount: 1;
  expectedNarrativeTopLevelKeys: readonly string[];
  sectionIndex: number;
  sectionId: "scans";
  metadataKey: "ctaMessage";
  oldText: string;
  newText: string;
  expectedNarrativeOccurrences: 2;
  expectedRenderedOccurrences: 1;
}

export interface ExactDiscoveryDuplicateResolutionAudit {
  id: string;
  createdAt: string;
  responsesSha256: string;
  responseKeyCount: number;
  expectedJobAttemptCount: number;
}

export interface ExactDiscoveryDuplicateResolutionTarget {
  emailSha256: string;
  userIdSha256: string;
  superseded: ExactDiscoveryDuplicateResolutionAudit;
  canonical: ExactDiscoveryDuplicateResolutionAudit;
}

export const DISCOVERY_SUZIE_DUPLICATE_RESOLUTION_TARGET = Object.freeze({
  emailSha256: "ef7b4f356d8a3fe70f3ab85bc2306690b99cc73bc9003b7fc1b4f9fd4ec06b7c",
  userIdSha256: "1fa9d5c6a4cfb690db1740a98be4d4eb9988389956cf8ae175aa2ab19988846c",
  superseded: Object.freeze({
    id: "be690349-aaa7-4524-854c-ae38f5c05f6f",
    createdAt: "2026-08-13T14:45:03.692385Z",
    responsesSha256: "7b27c6698121fc07c553527054b84e39b38eab7fb6d07fa5015936be24043151",
    responseKeyCount: 65,
    expectedJobAttemptCount: 0,
  }),
  canonical: Object.freeze({
    id: "311cbe89-30a7-40ae-94ba-ad906bf711d8",
    createdAt: "2026-08-14T09:17:12.089686Z",
    responsesSha256: "a08310574a9c5cc4d2a4b4f6ea23334bd9c0e89590b8378f2ac850174df79786",
    responseKeyCount: 62,
    expectedJobAttemptCount: 1,
  }),
}) satisfies ExactDiscoveryDuplicateResolutionTarget;

export interface ExactDiscoveryTextRepairTarget {
  id: string;
  emailSha256: string;
  expectedCurrentStatus: "BATCH_READY";
  expectedTxtSha256: string;
  expectedHtmlSha256: string;
  expectedArtifactCount: 1;
  expectedNarrativeTopLevelKeys: readonly string[];
  sectionIndex: number;
  sectionId: string;
  oldText: string;
  newText: string;
  nutritionSectionIndex: number;
  nutritionSectionId: string;
  nutritionOldText: string;
  nutritionNewText: string;
  expectedNutritionOccurrencesPerArtifact: 1;
  promoSectionIndex: number;
  promoSectionId: "coaching";
  expectedPromoCodeOccurrencesPerArtifact: 1;
  legacyPromoHtml: string;
  approvedNeutralPromoHtml: string;
}

async function assertDiscoveryOneShotLock(
  client: PoolClient,
  lockToken: string,
): Promise<void> {
  const lock = await client.query(
    `SELECT 1 FROM discovery_operation_lock
      WHERE lock_key = $1 AND token = $2 AND expires_at > NOW()
      FOR UPDATE`,
    [DISCOVERY_GLOBAL_LOCK_KEY, lockToken],
  );
  if ((lock.rowCount ?? 0) !== 1) {
    throw new Error("DISCOVERY_ONE_SHOT_LOCK_NOT_OWNED");
  }
}

async function assertNoDiscoveryDeliveryAttempt(
  client: PoolClient,
  auditIds: readonly string[],
): Promise<void> {
  const priorDelivery = await client.query(
    `SELECT audit_id, 'tracking' AS source
       FROM email_tracking
      WHERE audit_id = ANY($1::text[]) AND email_type = 'sendReportReadyEmail'
     UNION ALL
     SELECT audit_id, 'claim' AS source
       FROM discovery_email_delivery_claims
      WHERE audit_id = ANY($1::text[]) AND email_type = 'sendReportReadyEmail'
     LIMIT 1`,
    [auditIds],
  );
  if ((priorDelivery.rowCount ?? 0) !== 0) {
    throw new Error("DISCOVERY_ONE_SHOT_PRIOR_DELIVERY_ATTEMPT");
  }
}

// Administrative audit notifications are not report delivery attempts. Only
// client-facing report delivery tracking blocks a deterministic repair; every
// delivery claim still blocks, regardless of its recorded email type.
async function assertNoDiscoveryDeliveryTrackingOrClaim(
  client: PoolClient,
  auditId: string,
): Promise<void> {
  const priorSideEffect = await client.query(
    `SELECT audit_id, 'tracking' AS source
       FROM email_tracking
      WHERE audit_id = $1
        AND email_type IN ('sendReportReadyEmail', 'sendReportRegeneratedEmail')
     UNION ALL
     SELECT audit_id, 'claim' AS source
       FROM discovery_email_delivery_claims
      WHERE audit_id = $1
     LIMIT 1`,
    [auditId],
  );
  if ((priorSideEffect.rowCount ?? 0) !== 0) {
    throw new Error("DISCOVERY_TEXT_REPAIR_PRIOR_DELIVERY_TRACKING_OR_CLAIM");
  }
}

/**
 * Quarantine the three known pre-launch test audits as one indivisible write.
 * The targets are intentionally compiled into the operation: it never scans
 * for test-looking addresses and it never sends or claims an email.
 */
export async function quarantineExactDiscoveryPrelaunchTests(
  input: { lockToken: string },
  poolOverride?: Pool,
): Promise<{ auditIds: string[]; status: "SUPERSEDED"; emailsSent: 0 }> {
  const pool = await resolvePool(poolOverride);
  const client = await pool.connect();
  const targetIds = DISCOVERY_PRELAUNCH_TEST_TARGETS.map((target) => target.id);
  try {
    await client.query("BEGIN");
    await assertDiscoveryOneShotLock(client, input.lockToken);
    const rows = await client.query(
      `SELECT id, email, type, report_delivery_status, report_sent_at
         FROM audits
        WHERE id = ANY($1::text[])
        FOR UPDATE`,
      [targetIds],
    );
    if ((rows.rowCount ?? 0) !== DISCOVERY_PRELAUNCH_TEST_TARGETS.length) {
      throw new Error("DISCOVERY_QUARANTINE_EXACT_TARGET_SET_MISMATCH");
    }
    const byId = new Map(rows.rows.map((row: any) => [String(row.id), row]));
    for (const target of DISCOVERY_PRELAUNCH_TEST_TARGETS) {
      const row = byId.get(target.id);
      if (!row
        || String(row.email).trim().toLowerCase() !== target.email
        || row.type !== "GRATUIT"
        || row.report_delivery_status !== "NEEDS_REVIEW"
        || row.report_sent_at) {
        throw new Error(`DISCOVERY_QUARANTINE_TARGET_PRECONDITION_FAILED:${target.id}`);
      }
    }
    await assertNoDiscoveryDeliveryAttempt(client, targetIds);
    const provenance = {
      version: 1,
      disposition: "superseded",
      reason: "prelaunch_test_quarantine",
      operation: "quarantine-test",
      exactTargetSetSha256: discoverySha256(targetIds),
      decidedAt: new Date().toISOString(),
    };
    const updated = await client.query(
      `WITH expected(id, email) AS (
         VALUES
           ($1::text, $2::text),
           ($3::text, $4::text),
           ($5::text, $6::text)
       )
       UPDATE audits AS audit
          SET report_delivery_status = 'SUPERSEDED',
              narrative_report = jsonb_set(
                COALESCE(audit.narrative_report, '{}'::jsonb),
                '{recovery}',
                COALESCE(audit.narrative_report->'recovery', '{}'::jsonb) || $7::jsonb,
                true
              )
         FROM expected
        WHERE audit.id = expected.id
          AND LOWER(audit.email) = expected.email
          AND audit.type = 'GRATUIT'
          AND audit.report_delivery_status = 'NEEDS_REVIEW'
          AND audit.report_sent_at IS NULL
        RETURNING audit.id`,
      [
        DISCOVERY_PRELAUNCH_TEST_TARGETS[0].id,
        DISCOVERY_PRELAUNCH_TEST_TARGETS[0].email,
        DISCOVERY_PRELAUNCH_TEST_TARGETS[1].id,
        DISCOVERY_PRELAUNCH_TEST_TARGETS[1].email,
        DISCOVERY_PRELAUNCH_TEST_TARGETS[2].id,
        DISCOVERY_PRELAUNCH_TEST_TARGETS[2].email,
        JSON.stringify(provenance),
      ],
    );
    if ((updated.rowCount ?? 0) !== DISCOVERY_PRELAUNCH_TEST_TARGETS.length) {
      throw new Error("DISCOVERY_QUARANTINE_ALL_OR_NOTHING_CAS_FAILED");
    }
    await client.query("COMMIT");
    return { auditIds: targetIds, status: "SUPERSEDED", emailsSent: 0 };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Resolve one exact, proven re-submission without generating or delivering a
 * report. The newer audit remains byte-for-byte untouched; only the older
 * audit receives a terminal SUPERSEDED disposition linked to its replacement.
 */
export async function resolveExactDiscoveryDuplicateUnderLock(
  input: { lockToken: string; target: ExactDiscoveryDuplicateResolutionTarget },
  poolOverride?: Pool,
): Promise<{ supersededAuditId: string; canonicalAuditId: string; status: "SUPERSEDED"; emailsSent: 0 }> {
  const { target } = input;
  const strictUtcTimestamp = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})\.(\d{6})Z$/;
  const normalizeUtcTimestamp = (value: string): string | null => {
    const match = strictUtcTimestamp.exec(value);
    if (!match) return null;
    const millisecondTimestamp = `${match[1]}.${match[2].slice(0, 3)}Z`;
    const parsed = Date.parse(millisecondTimestamp);
    if (!Number.isFinite(parsed) || new Date(parsed).toISOString() !== millisecondTimestamp) {
      return null;
    }
    return `${match[1]}.${match[2].padEnd(6, "0")}Z`;
  };
  const databaseTimestampMatchesTarget = (actualUtc: string, expectedUtc: string): boolean => {
    const normalizedExpected = normalizeUtcTimestamp(expectedUtc);
    return normalizedExpected !== null && actualUtc === normalizedExpected;
  };
  const supersededCreatedAtUtc = normalizeUtcTimestamp(target.superseded.createdAt);
  const canonicalCreatedAtUtc = normalizeUtcTimestamp(target.canonical.createdAt);
  const supersededCreatedAtMs = Date.parse(target.superseded.createdAt);
  const canonicalCreatedAtMs = Date.parse(target.canonical.createdAt);
  if (target.superseded.id === target.canonical.id
    || !/^[a-f0-9]{64}$/.test(target.emailSha256)
    || !/^[a-f0-9]{64}$/.test(target.userIdSha256)
    || !/^[a-f0-9]{64}$/.test(target.superseded.responsesSha256)
    || !/^[a-f0-9]{64}$/.test(target.canonical.responsesSha256)
    || !supersededCreatedAtUtc
    || !canonicalCreatedAtUtc
    || !Number.isFinite(supersededCreatedAtMs)
    || !Number.isFinite(canonicalCreatedAtMs)
    || supersededCreatedAtMs >= canonicalCreatedAtMs) {
    throw new Error("DISCOVERY_DUPLICATE_RESOLUTION_TARGET_INVALID");
  }

  const pool = await resolvePool(poolOverride);
  const client = await pool.connect();
  const targetIds = [target.superseded.id, target.canonical.id];
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [DISCOVERY_TRANSACTION_FENCE_KEY]);
    await assertDiscoveryOneShotLock(client, input.lockToken);

    const auditResult = await client.query(
      `SELECT id, email, user_id, type, status, responses, narrative_report,
              report_txt, report_html, report_generated_at,
              report_delivery_status, report_sent_at, created_at,
              to_char(
                created_at AT TIME ZONE 'UTC',
                'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'
              ) AS created_at_utc_exact
         FROM audits
        WHERE id = ANY($1::text[])
        ORDER BY id
        FOR UPDATE`,
      [targetIds],
    );
    if ((auditResult.rowCount ?? 0) !== 2) {
      throw new Error("DISCOVERY_DUPLICATE_RESOLUTION_EXACT_TARGET_SET_MISMATCH");
    }
    const byId = new Map(auditResult.rows.map((row: any) => [String(row.id), row]));
    for (const expected of [target.superseded, target.canonical]) {
      const audit = byId.get(expected.id);
      const expectedCreatedAtUtc = normalizeUtcTimestamp(expected.createdAt);
      if (!audit
        || audit.type !== "GRATUIT"
        || audit.status !== "COMPLETED"
        || audit.report_delivery_status !== "NEEDS_REVIEW"
        || audit.report_sent_at
        || audit.report_generated_at
        || audit.report_txt !== null
        || audit.report_html !== null
        || discoverySha256(String(audit.email || "").trim().toLowerCase()) !== target.emailSha256
        || discoverySha256(String(audit.user_id || "")) !== target.userIdSha256
        || !expectedCreatedAtUtc
        || !databaseTimestampMatchesTarget(audit.created_at_utc_exact, expected.createdAt)
        || discoverySha256(audit.responses || {}) !== expected.responsesSha256
        || Object.keys(audit.responses || {}).length !== expected.responseKeyCount) {
        throw new Error(`DISCOVERY_DUPLICATE_RESOLUTION_TARGET_PRECONDITION_FAILED:${expected.id}`);
      }
    }
    const supersededAudit = byId.get(target.superseded.id);
    const canonicalAudit = byId.get(target.canonical.id);
    if (String(supersededAudit.email).trim().toLowerCase()
        !== String(canonicalAudit.email).trim().toLowerCase()
      || String(supersededAudit.user_id || "") !== String(canonicalAudit.user_id || "")) {
      throw new Error("DISCOVERY_DUPLICATE_RESOLUTION_IDENTITY_MISMATCH");
    }

    await assertNoDiscoveryDeliveryTrackingOrClaim(client, target.superseded.id);
    await assertNoDiscoveryDeliveryTrackingOrClaim(client, target.canonical.id);
    const forbiddenState = await client.query(
      `SELECT audit_id, source FROM (
         SELECT audit_id, 'artifact'::text AS source
           FROM report_artifacts WHERE audit_id = ANY($1::text[])
         UNION ALL
         SELECT audit_id, 'batch_item'::text AS source
           FROM discovery_batch_items WHERE audit_id = ANY($1::text[])
         UNION ALL
         SELECT order_id AS audit_id, 'budget_reservation'::text AS source
           FROM ai_cost_budget_reservations
          WHERE product = 'discovery' AND order_id = ANY($1::text[])
       ) forbidden
       LIMIT 1`,
      [targetIds],
    );
    if ((forbiddenState.rowCount ?? 0) !== 0) {
      throw new Error("DISCOVERY_DUPLICATE_RESOLUTION_PRIOR_ARTIFACT_OR_PROVIDER_STATE");
    }
    const jobResult = await client.query(
      `SELECT audit_id, status, error, attempt_count
         FROM report_jobs WHERE audit_id = ANY($1::text[])
         ORDER BY audit_id
         FOR UPDATE`,
      [targetIds],
    );
    if ((jobResult.rowCount ?? 0) !== 2) {
      throw new Error("DISCOVERY_DUPLICATE_RESOLUTION_JOB_SET_MISMATCH");
    }
    const jobsById = new Map(jobResult.rows.map((row: any) => [String(row.audit_id), row]));
    for (const expected of [target.superseded, target.canonical]) {
      const job = jobsById.get(expected.id);
      if (!job
        || String(job.status).toLowerCase() !== "failed"
        || String(job.error || "") !== "DISCOVERY_UNIFIED_GENERATION_ENABLED is not true"
        || Number(job.attempt_count) !== expected.expectedJobAttemptCount) {
        throw new Error(`DISCOVERY_DUPLICATE_RESOLUTION_JOB_PRECONDITION_FAILED:${expected.id}`);
      }
    }

    const provenance = {
      version: 1,
      disposition: "superseded",
      reason: "newer_distinct_resubmission_canonicalized",
      operation: "resolve-suzie-duplicate",
      replacementAuditId: target.canonical.id,
      supersededResponsesSha256: target.superseded.responsesSha256,
      replacementResponsesSha256: target.canonical.responsesSha256,
      exactTargetSetSha256: discoverySha256(targetIds),
      decidedAt: new Date().toISOString(),
    };
    const updated = await client.query(
      `UPDATE audits
          SET report_delivery_status = 'SUPERSEDED',
              narrative_report = jsonb_set(
                COALESCE(narrative_report, '{}'::jsonb),
                '{recovery}',
                COALESCE(narrative_report->'recovery', '{}'::jsonb) || $2::jsonb,
                true
              )
        WHERE id = $1
          AND type = 'GRATUIT'
          AND status = 'COMPLETED'
          AND report_delivery_status = 'NEEDS_REVIEW'
          AND report_sent_at IS NULL
          AND report_generated_at IS NULL
          AND report_txt IS NULL
          AND report_html IS NULL
          AND email IS NOT DISTINCT FROM $3
          AND user_id IS NOT DISTINCT FROM $4
          AND to_char(
                created_at AT TIME ZONE 'UTC',
                'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'
              ) = $5
          AND responses IS NOT DISTINCT FROM $6::jsonb
          AND narrative_report IS NOT DISTINCT FROM $7::jsonb
          AND EXISTS (
            SELECT 1 FROM discovery_operation_lock lock
             WHERE lock.lock_key = $8 AND lock.token = $9 AND lock.expires_at > NOW()
          )
        RETURNING id`,
      [
        target.superseded.id,
        JSON.stringify(provenance),
        supersededAudit.email,
        supersededAudit.user_id,
        supersededCreatedAtUtc,
        JSON.stringify(supersededAudit.responses || {}),
        JSON.stringify(supersededAudit.narrative_report),
        DISCOVERY_GLOBAL_LOCK_KEY,
        input.lockToken,
      ],
    );
    if ((updated.rowCount ?? 0) !== 1) {
      throw new Error("DISCOVERY_DUPLICATE_RESOLUTION_CAS_FAILED");
    }

    const postflight = await client.query(
      `SELECT id, report_delivery_status, report_sent_at, narrative_report,
              responses, report_txt, report_html, report_generated_at
         FROM audits WHERE id = ANY($1::text[]) ORDER BY id`,
      [targetIds],
    );
    const postById = new Map(postflight.rows.map((row: any) => [String(row.id), row]));
    const oldPost = postById.get(target.superseded.id);
    const newPost = postById.get(target.canonical.id);
    const recovery = oldPost?.narrative_report?.recovery;
    if (!oldPost
      || oldPost.report_delivery_status !== "SUPERSEDED"
      || oldPost.report_sent_at
      || recovery?.disposition !== "superseded"
      || recovery?.replacementAuditId !== target.canonical.id
      || !newPost
      || newPost.report_delivery_status !== "NEEDS_REVIEW"
      || newPost.report_sent_at
      || newPost.report_generated_at
      || newPost.report_txt !== null
      || newPost.report_html !== null
      || discoverySha256(newPost.responses || {}) !== target.canonical.responsesSha256
      || JSON.stringify(newPost.narrative_report) !== JSON.stringify(canonicalAudit.narrative_report)) {
      throw new Error("DISCOVERY_DUPLICATE_RESOLUTION_POSTFLIGHT_FAILED");
    }
    const duplicateCandidate = await client.query(
      `SELECT EXISTS (
         SELECT 1 FROM audits other
          WHERE other.type = 'GRATUIT' AND other.id <> $1
            AND LOWER(other.email) = LOWER($2)
            AND ABS(EXTRACT(EPOCH FROM (other.created_at - $3::timestamptz))) <= 14 * 86400
            AND ${DISCOVERY_OTHER_AUDIT_ACTIVE_SQL}
       ) AS duplicate_candidate`,
      [target.canonical.id, canonicalAudit.email, target.canonical.createdAt],
    );
    if (duplicateCandidate.rows[0]?.duplicate_candidate !== false) {
      throw new Error("DISCOVERY_DUPLICATE_RESOLUTION_CANONICAL_STILL_DUPLICATE");
    }
    await assertNoDiscoveryDeliveryTrackingOrClaim(client, target.superseded.id);
    await assertNoDiscoveryDeliveryTrackingOrClaim(client, target.canonical.id);
    await client.query("COMMIT");
    return {
      supersededAuditId: target.superseded.id,
      canonicalAuditId: target.canonical.id,
      status: "SUPERSEDED",
      emailsSent: 0,
    };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

export async function resolveExactSuzieDiscoveryDuplicateWithoutDelivery(
  input: { lockToken: string },
  poolOverride?: Pool,
) {
  return resolveExactDiscoveryDuplicateUnderLock({
    lockToken: input.lockToken,
    target: DISCOVERY_SUZIE_DUPLICATE_RESOLUTION_TARGET,
  }, poolOverride);
}

/**
 * Validate the one known report and promote only its delivery status. This is
 * deliberately not a delivery operation: no email service or delivery claim
 * is reachable from this function.
 */
export async function promoteExactValidDiscoveryWithoutDelivery(
  input: {
    lockToken: string;
    expectedCurrentStatus: "NEEDS_REVIEW" | "BATCH_REVIEW" | "BATCH_READY";
    expectedTxtSha256: string;
    expectedHtmlSha256: string;
  },
  poolOverride?: Pool,
): Promise<{
  auditId: string;
  status: "BATCH_READY";
  txtSha256: string;
  htmlSha256: string;
  emailsSent: 0;
}> {
  if (!/^[a-f0-9]{64}$/.test(input.expectedTxtSha256)
    || !/^[a-f0-9]{64}$/.test(input.expectedHtmlSha256)) {
    throw new Error("DISCOVERY_PROMOTION_EXPECTED_HASH_INVALID");
  }
  const pool = await resolvePool(poolOverride);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await assertDiscoveryOneShotLock(client, input.lockToken);
    const result = await client.query(
      `SELECT id, email, type, report_delivery_status, report_sent_at,
              narrative_report, report_txt, report_html
         FROM audits
        WHERE id = $1
        FOR UPDATE`,
      [DISCOVERY_VALID_NO_DELIVERY_TARGET.id],
    );
    if ((result.rowCount ?? 0) !== 1) throw new Error("DISCOVERY_PROMOTION_TARGET_MISSING");
    const row = result.rows[0];
    if (String(row.email).trim().toLowerCase() !== DISCOVERY_VALID_NO_DELIVERY_TARGET.email
      || row.type !== "GRATUIT"
      || row.report_delivery_status !== input.expectedCurrentStatus
      || row.report_sent_at) {
      throw new Error("DISCOVERY_PROMOTION_TARGET_PRECONDITION_FAILED");
    }
    await assertNoDiscoveryDeliveryAttempt(client, [DISCOVERY_VALID_NO_DELIVERY_TARGET.id]);

    const txt = String(row.report_txt || "");
    const html = String(row.report_html || "");
    const txtSha256 = discoverySha256(txt);
    const htmlSha256 = discoverySha256(html);
    if (txtSha256 !== input.expectedTxtSha256 || htmlSha256 !== input.expectedHtmlSha256) {
      throw new Error("DISCOVERY_PROMOTION_AUDIT_HASH_MISMATCH");
    }

    const artifacts = await client.query(
      `SELECT txt, html FROM report_artifacts WHERE audit_id = $1 ORDER BY created_at ASC FOR UPDATE`,
      [DISCOVERY_VALID_NO_DELIVERY_TARGET.id],
    );
    if ((artifacts.rowCount ?? 0) !== DISCOVERY_VALID_NO_DELIVERY_TARGET.expectedArtifactCount) {
      throw new Error("DISCOVERY_PROMOTION_ARTIFACT_COUNT_MISMATCH");
    }
    const matchingArtifact = artifacts.rows.some((artifact: any) =>
      discoverySha256(String(artifact.txt || "")) === input.expectedTxtSha256
      && discoverySha256(String(artifact.html || "")) === input.expectedHtmlSha256);
    if (!matchingArtifact) throw new Error("DISCOVERY_PROMOTION_ARTIFACT_HASH_MISMATCH");

    const {
      evaluateCanonicalDiscoveryArtifacts,
      hasPassingPersistedDiscoveryDeliveryGate,
      resolveCanonicalDiscoveryArtifacts,
    } = await import("./discoveryDeliveryGate");
    const canonical = resolveCanonicalDiscoveryArtifacts({
      narrativeReport: row.narrative_report,
      reportTxt: txt,
      reportHtml: html,
    });
    const gate = evaluateCanonicalDiscoveryArtifacts(canonical);
    if (!gate.ok || !hasPassingPersistedDiscoveryDeliveryGate(row.narrative_report)) {
      throw new Error(`DISCOVERY_PROMOTION_GATE_FAILED:${gate.errors.join("|")}`);
    }

    const provenance = {
      version: 1,
      reason: "valid_report_promoted_without_delivery",
      operation: "promote-valid-no-delivery",
      txtSha256,
      htmlSha256,
      artifactCount: artifacts.rowCount,
      gateVersion: gate.version,
      promotedAt: new Date().toISOString(),
    };
    const updated = await client.query(
      `UPDATE audits
          SET report_delivery_status = 'BATCH_READY',
              narrative_report = COALESCE(narrative_report, '{}'::jsonb)
                || jsonb_build_object('oneShotOperation', $4::jsonb)
        WHERE id = $1
          AND type = 'GRATUIT'
          AND LOWER(email) = $2
          AND report_delivery_status = $3
          AND report_sent_at IS NULL
        RETURNING id`,
      [
        DISCOVERY_VALID_NO_DELIVERY_TARGET.id,
        DISCOVERY_VALID_NO_DELIVERY_TARGET.email,
        input.expectedCurrentStatus,
        JSON.stringify(provenance),
      ],
    );
    if ((updated.rowCount ?? 0) !== 1) {
      throw new Error("DISCOVERY_PROMOTION_CAS_FAILED");
    }
    await client.query("COMMIT");
    return {
      auditId: DISCOVERY_VALID_NO_DELIVERY_TARGET.id,
      status: "BATCH_READY",
      txtSha256,
      htmlSha256,
      emailsSent: 0,
    };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

function countExactOccurrences(value: string, needle: string): number {
  if (!needle) return 0;
  let count = 0;
  let cursor = 0;
  while ((cursor = value.indexOf(needle, cursor)) >= 0) {
    count += 1;
    cursor += needle.length;
  }
  return count;
}

/**
 * Safe primitive for a pre-authorized, exact deterministic text repair. It is
 * not exposed through HTTP and cannot generate or deliver anything. The
 * caller must own discovery-global; artifact + audit + gate are updated in one
 * transaction under the durable epoch and exact source CAS.
 */
export async function repairExactDiscoveryTextUnderLock(
  input: { lockToken: string; target: ExactDiscoveryTextRepairTarget },
  poolOverride?: Pool,
): Promise<{
  auditId: string;
  artifactId: string;
  status: "BATCH_READY";
  previousTxtSha256: string;
  previousHtmlSha256: string;
  txtSha256: string;
  htmlSha256: string;
  emailsSent: 0;
}> {
  const { target } = input;
  for (const hash of [target.emailSha256, target.expectedTxtSha256, target.expectedHtmlSha256]) {
    if (!/^[a-f0-9]{64}$/.test(hash)) throw new Error("DISCOVERY_TEXT_REPAIR_EXPECTED_HASH_INVALID");
  }
  if (!target.oldText || !target.newText || target.oldText === target.newText) {
    throw new Error("DISCOVERY_TEXT_REPAIR_REPLACEMENT_INVALID");
  }
  if (!Number.isInteger(target.sectionIndex) || target.sectionIndex < 0 || !target.sectionId) {
    throw new Error("DISCOVERY_TEXT_REPAIR_SECTION_INVALID");
  }
  if (!Number.isInteger(target.nutritionSectionIndex) || target.nutritionSectionIndex < 0
    || !target.nutritionSectionId
    || !target.nutritionOldText
    || !target.nutritionNewText
    || target.nutritionOldText === target.nutritionNewText
    || target.expectedNutritionOccurrencesPerArtifact !== 1) {
    throw new Error("DISCOVERY_TEXT_REPAIR_NUTRITION_TARGET_INVALID");
  }
  if (!Number.isInteger(target.promoSectionIndex) || target.promoSectionIndex < 0
    || target.promoSectionId !== "coaching"
    || target.expectedPromoCodeOccurrencesPerArtifact !== 1
    || !target.legacyPromoHtml
    || !target.approvedNeutralPromoHtml
    || target.legacyPromoHtml === target.approvedNeutralPromoHtml) {
    throw new Error("DISCOVERY_TEXT_REPAIR_PROMO_TARGET_INVALID");
  }

  const pool = await resolvePool(poolOverride);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [DISCOVERY_TRANSACTION_FENCE_KEY]);
    await assertDiscoveryOneShotLock(client, input.lockToken);

    const auditResult = await client.query(
      `SELECT id, email, type, responses, report_delivery_status, report_sent_at,
              narrative_report, report_txt, report_html
         FROM audits WHERE id = $1 FOR UPDATE`,
      [target.id],
    );
    if ((auditResult.rowCount ?? 0) !== 1) throw new Error("DISCOVERY_TEXT_REPAIR_TARGET_MISSING");
    const audit = auditResult.rows[0];
    if (audit.type !== "GRATUIT"
      || audit.report_delivery_status !== target.expectedCurrentStatus
      || audit.report_sent_at
      || discoverySha256(String(audit.email || "").trim().toLowerCase()) !== target.emailSha256) {
      throw new Error("DISCOVERY_TEXT_REPAIR_TARGET_PRECONDITION_FAILED");
    }
    await assertNoDiscoveryDeliveryTrackingOrClaim(client, target.id);

    const previousTxt = String(audit.report_txt || "");
    const previousHtml = String(audit.report_html || "");
    if (discoverySha256(previousTxt) !== target.expectedTxtSha256
      || discoverySha256(previousHtml) !== target.expectedHtmlSha256) {
      throw new Error("DISCOVERY_TEXT_REPAIR_AUDIT_HASH_MISMATCH");
    }

    const artifactResult = await client.query(
      `SELECT id, txt, html, content_sha256
         FROM report_artifacts WHERE audit_id = $1
         ORDER BY created_at ASC FOR UPDATE`,
      [target.id],
    );
    if ((artifactResult.rowCount ?? 0) !== target.expectedArtifactCount) {
      throw new Error("DISCOVERY_TEXT_REPAIR_ARTIFACT_COUNT_MISMATCH");
    }
    const artifact = artifactResult.rows[0];
    const previousContentSha256 = discoveryArtifactContentHash(previousTxt, previousHtml);
    if (discoverySha256(String(artifact.txt || "")) !== target.expectedTxtSha256
      || discoverySha256(String(artifact.html || "")) !== target.expectedHtmlSha256
      || String(artifact.content_sha256 || "") !== previousContentSha256) {
      throw new Error("DISCOVERY_TEXT_REPAIR_ARTIFACT_HASH_MISMATCH");
    }

    if (!audit.narrative_report || typeof audit.narrative_report !== "object"
      || !Array.isArray(audit.narrative_report.sections)) {
      throw new Error("DISCOVERY_TEXT_REPAIR_STRUCTURED_REPORT_MISSING");
    }
    if (JSON.stringify(Object.keys(audit.narrative_report).sort())
      !== JSON.stringify([...target.expectedNarrativeTopLevelKeys].sort())) {
      throw new Error("DISCOVERY_TEXT_REPAIR_STRUCTURED_REPORT_SHAPE_MISMATCH");
    }
    const repairedReport = structuredClone(audit.narrative_report) as Record<string, any>;
    const section = repairedReport.sections[target.sectionIndex];
    const nutritionSection = repairedReport.sections[target.nutritionSectionIndex];
    const promoSection = repairedReport.sections[target.promoSectionIndex];
    const serializedBefore = JSON.stringify(repairedReport);
    if (!section || String(section.id) !== target.sectionId || typeof section.content !== "string"
      || countExactOccurrences(serializedBefore, target.oldText) !== 1
      || countExactOccurrences(serializedBefore, target.newText) !== 0
      || countExactOccurrences(section.content, target.oldText) !== 1) {
      throw new Error("DISCOVERY_TEXT_REPAIR_EXACT_PHRASE_MISMATCH");
    }
    if (!nutritionSection
      || String(nutritionSection.id) !== target.nutritionSectionId
      || typeof nutritionSection.content !== "string"
      || countExactOccurrences(serializedBefore, target.nutritionOldText)
        !== target.expectedNutritionOccurrencesPerArtifact
      || countExactOccurrences(serializedBefore, target.nutritionNewText) !== 0
      || countExactOccurrences(nutritionSection.content, target.nutritionOldText)
        !== target.expectedNutritionOccurrencesPerArtifact
      || countExactOccurrences(previousTxt, target.nutritionOldText)
        !== target.expectedNutritionOccurrencesPerArtifact
      || countExactOccurrences(previousTxt, target.nutritionNewText) !== 0
      || countExactOccurrences(previousHtml, target.nutritionOldText)
        !== target.expectedNutritionOccurrencesPerArtifact
      || countExactOccurrences(previousHtml, target.nutritionNewText) !== 0
      || countExactOccurrences(String(artifact.txt || ""), target.nutritionOldText)
        !== target.expectedNutritionOccurrencesPerArtifact
      || countExactOccurrences(String(artifact.txt || ""), target.nutritionNewText) !== 0
      || countExactOccurrences(String(artifact.html || ""), target.nutritionOldText)
        !== target.expectedNutritionOccurrencesPerArtifact
      || countExactOccurrences(String(artifact.html || ""), target.nutritionNewText) !== 0) {
      throw new Error("DISCOVERY_TEXT_REPAIR_LEGACY_NUTRITION_DIVERGENCE");
    }
    const legacyPromoCode = ["DISCOVERY", "20"].join("");
    if (!promoSection
      || String(promoSection.id) !== target.promoSectionId
      || typeof promoSection.content !== "string"
      || countExactOccurrences(promoSection.content, target.legacyPromoHtml) !== 1
      || countExactOccurrences(promoSection.content, target.approvedNeutralPromoHtml) !== 0
      || countExactOccurrences(serializedBefore, legacyPromoCode)
        !== target.expectedPromoCodeOccurrencesPerArtifact
      || countExactOccurrences(previousTxt, legacyPromoCode)
        !== target.expectedPromoCodeOccurrencesPerArtifact
      || countExactOccurrences(previousHtml, legacyPromoCode)
        !== target.expectedPromoCodeOccurrencesPerArtifact
      || countExactOccurrences(String(artifact.txt || ""), legacyPromoCode)
        !== target.expectedPromoCodeOccurrencesPerArtifact
      || countExactOccurrences(String(artifact.html || ""), legacyPromoCode)
        !== target.expectedPromoCodeOccurrencesPerArtifact) {
      throw new Error("DISCOVERY_TEXT_REPAIR_LEGACY_PROMO_DIVERGENCE");
    }
    section.content = section.content.replace(target.oldText, target.newText);
    nutritionSection.content = nutritionSection.content.replace(
      target.nutritionOldText,
      target.nutritionNewText,
    );
    promoSection.content = promoSection.content.replace(
      target.legacyPromoHtml,
      target.approvedNeutralPromoHtml,
    );

    const assets = buildDiscoveryReportAssets(repairedReport as any);
    const factualErrors = validateDiscoveryFactualConsistency(
      [assets.txt, JSON.stringify(repairedReport.analysisMetadata ?? {})].join("\n"),
      (audit.responses && typeof audit.responses === "object") ? audit.responses : {},
    );
    if (factualErrors.length !== 0) {
      throw new Error(`DISCOVERY_TEXT_REPAIR_FACTUAL_CONSISTENCY_FAILED:${factualErrors.join("|")}`);
    }
    const gate = evaluateDiscoveryDeliveryGate(
      repairedReport as any,
      assets,
      new Date(),
      repairedReport.analysisMetadata,
    );
    if (!gate.ok || gate.errors.length !== 0) {
      throw new Error(`DISCOVERY_TEXT_REPAIR_GATE_FAILED:${gate.errors.join("|")}`);
    }
    const finalNarrative = attachDiscoveryDeliveryGateResult(repairedReport, gate);
    if (!hasPassingPersistedDiscoveryDeliveryGate(finalNarrative)) {
      throw new Error("DISCOVERY_TEXT_REPAIR_PERSISTED_GATE_FAILED");
    }
    const serializedAfter = JSON.stringify(finalNarrative);
    if (countExactOccurrences(serializedAfter, target.oldText) !== 0
      || countExactOccurrences(serializedAfter, target.newText) !== 1
      || countExactOccurrences(assets.txt, target.oldText) !== 0
      || countExactOccurrences(assets.html, target.oldText) !== 0
      || countExactOccurrences(serializedAfter, target.nutritionOldText) !== 0
      || countExactOccurrences(serializedAfter, target.nutritionNewText)
        !== target.expectedNutritionOccurrencesPerArtifact
      || countExactOccurrences(assets.txt, target.nutritionOldText) !== 0
      || countExactOccurrences(assets.txt, target.nutritionNewText)
        !== target.expectedNutritionOccurrencesPerArtifact
      || countExactOccurrences(assets.html, target.nutritionOldText) !== 0
      || countExactOccurrences(assets.html, target.nutritionNewText)
        !== target.expectedNutritionOccurrencesPerArtifact
      || countExactOccurrences(promoSection.content, target.legacyPromoHtml) !== 0
      || countExactOccurrences(promoSection.content, target.approvedNeutralPromoHtml) !== 1
      || countExactOccurrences(serializedAfter, legacyPromoCode) !== 0
      || countExactOccurrences(assets.txt, legacyPromoCode) !== 0
      || countExactOccurrences(assets.html, legacyPromoCode) !== 0) {
      throw new Error("DISCOVERY_TEXT_REPAIR_RENDER_MISMATCH");
    }

    const txtSha256 = discoverySha256(assets.txt);
    const htmlSha256 = discoverySha256(assets.html);
    const contentSha256 = discoveryArtifactContentHash(assets.txt, assets.html);
    if (txtSha256 === target.expectedTxtSha256 || htmlSha256 === target.expectedHtmlSha256) {
      throw new Error("DISCOVERY_TEXT_REPAIR_HASH_UNCHANGED");
    }

    const artifactUpdated = await client.query(
      `UPDATE report_artifacts
          SET txt = $3, html = $4, content_sha256 = $5
        WHERE id = $1 AND audit_id = $2
          AND txt IS NOT DISTINCT FROM $6
          AND html IS NOT DISTINCT FROM $7
          AND content_sha256 = $8
          AND EXISTS (
            SELECT 1 FROM discovery_operation_lock l
             WHERE l.lock_key = $9 AND l.token = $10 AND l.expires_at > NOW()
          )
        RETURNING id`,
      [artifact.id, target.id, assets.txt, assets.html, contentSha256,
        previousTxt, previousHtml, previousContentSha256,
        DISCOVERY_GLOBAL_LOCK_KEY, input.lockToken],
    );
    if ((artifactUpdated.rowCount ?? 0) !== 1) {
      throw new Error("DISCOVERY_TEXT_REPAIR_ARTIFACT_CAS_FAILED");
    }

    const auditUpdated = await client.query(
      `UPDATE audits
          SET narrative_report = $2::jsonb,
              report_txt = $3,
              report_html = $4,
              report_delivery_status = 'BATCH_READY'
        WHERE id = $1 AND type = 'GRATUIT'
          AND email IS NOT DISTINCT FROM $5
          AND report_delivery_status = 'BATCH_READY'
          AND report_sent_at IS NULL
          AND narrative_report IS NOT DISTINCT FROM $6::jsonb
          AND report_txt IS NOT DISTINCT FROM $7
          AND report_html IS NOT DISTINCT FROM $8
          AND EXISTS (
            SELECT 1 FROM discovery_operation_lock l
             WHERE l.lock_key = $9 AND l.token = $10 AND l.expires_at > NOW()
          )
        RETURNING id`,
      [target.id, JSON.stringify(finalNarrative), assets.txt, assets.html,
        audit.email, JSON.stringify(audit.narrative_report), previousTxt, previousHtml,
        DISCOVERY_GLOBAL_LOCK_KEY, input.lockToken],
    );
    if ((auditUpdated.rowCount ?? 0) !== 1) throw new Error("DISCOVERY_TEXT_REPAIR_AUDIT_CAS_FAILED");

    const persisted = await client.query(
      `SELECT a.narrative_report, a.report_txt, a.report_html,
              r.txt AS artifact_txt, r.html AS artifact_html
         FROM audits a
         JOIN report_artifacts r ON r.audit_id = a.id
        WHERE a.id = $1 AND r.id = $2`,
      [target.id, artifact.id],
    );
    const persistedRow = persisted.rows[0];
    const persistedRepresentations = [
      JSON.stringify(persistedRow?.narrative_report ?? null),
      String(persistedRow?.report_txt || ""),
      String(persistedRow?.report_html || ""),
      String(persistedRow?.artifact_txt || ""),
      String(persistedRow?.artifact_html || ""),
    ];
    if ((persisted.rowCount ?? 0) !== 1
      || persistedRepresentations.some((value) =>
        countExactOccurrences(value, target.nutritionOldText) !== 0
        || countExactOccurrences(value, target.nutritionNewText)
          !== target.expectedNutritionOccurrencesPerArtifact)) {
      throw new Error("DISCOVERY_TEXT_REPAIR_PERSISTED_NUTRITION_MISMATCH");
    }

    await assertNoDiscoveryDeliveryTrackingOrClaim(client, target.id);
    await client.query("COMMIT");
    return {
      auditId: target.id,
      artifactId: String(artifact.id),
      status: "BATCH_READY",
      previousTxtSha256: target.expectedTxtSha256,
      previousHtmlSha256: target.expectedHtmlSha256,
      txtSha256,
      htmlSha256,
      emailsSent: 0,
    };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Exact deterministic copy repair for a hash-bound post-generation artifact.
 * It supports a single visible section path and, when explicitly bound, the
 * matching hidden CTA metadata path. JSON/TXT/HTML/artifact are rebuilt and
 * persisted atomically; every identity, occurrence, lock and CAS fails closed.
 */
export async function repairExactDiscoveryWakeSummaryUnderLock(
  input: {
    lockToken: string;
    target: ExactDiscoveryWakeSummaryRepairTarget | ExactDiscoveryCriticalCopyRepairTarget;
  },
  poolOverride?: Pool,
): Promise<{
  auditId: string;
  artifactId: string;
  status: "BATCH_READY";
  previousTxtSha256: string;
  previousHtmlSha256: string;
  txtSha256: string;
  htmlSha256: string;
  emailsSent: 0;
}> {
  const { target } = input;
  const isCriticalCopyRepair = "metadataKey" in target;
  const metadataKey = isCriticalCopyRepair ? target.metadataKey : undefined;
  const expectedNarrativeOccurrences = isCriticalCopyRepair
    ? target.expectedNarrativeOccurrences
    : target.expectedOccurrencesPerRepresentation;
  const expectedRenderedOccurrences = isCriticalCopyRepair
    ? target.expectedRenderedOccurrences
    : target.expectedOccurrencesPerRepresentation;
  const hasPriorFixInvariants = !isCriticalCopyRepair;
  for (const hash of [
    target.emailSha256,
    target.expectedResponsesJsonSha256,
    target.expectedNarrativeJsonSha256,
    target.expectedTxtSha256,
    target.expectedHtmlSha256,
    target.expectedArtifactContentSha256,
  ]) {
    if (!/^[a-f0-9]{64}$/.test(hash)) {
      throw new Error("DISCOVERY_WAKE_SUMMARY_REPAIR_EXPECTED_HASH_INVALID");
    }
  }
  if (!target.expectedArtifactId
    || target.expectedArtifactCount !== 1
    || ![1, 2].includes(Number(expectedNarrativeOccurrences))
    || expectedRenderedOccurrences !== 1
    || !target.oldText
    || !target.newText
    || target.oldText === target.newText
    || !Number.isInteger(target.sectionIndex)
    || target.sectionIndex < 0
    || !target.sectionId
    || (metadataKey && expectedNarrativeOccurrences !== 2)
    || (hasPriorFixInvariants && (
      !("alreadyFixedSleepText" in target)
      || !target.alreadyFixedSleepText
      || !target.alreadyFixedNutritionText
      || !Number.isInteger(target.promoSectionIndex)
      || target.promoSectionIndex < 0
      || target.promoSectionId !== "coaching"
      || !target.approvedNeutralPromoHtml
    ))) {
    throw new Error("DISCOVERY_WAKE_SUMMARY_REPAIR_TARGET_INVALID");
  }

  const pool = await resolvePool(poolOverride);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [DISCOVERY_TRANSACTION_FENCE_KEY]);
    await assertDiscoveryOneShotLock(client, input.lockToken);

    const auditResult = await client.query(
      `SELECT id, email, type, responses, report_delivery_status, report_sent_at,
              narrative_report, report_txt, report_html
         FROM audits WHERE id = $1 FOR UPDATE`,
      [target.id],
    );
    if ((auditResult.rowCount ?? 0) !== 1) {
      throw new Error("DISCOVERY_WAKE_SUMMARY_REPAIR_TARGET_MISSING");
    }
    const audit = auditResult.rows[0];
    if (audit.type !== "GRATUIT"
      || audit.report_delivery_status !== target.expectedCurrentStatus
      || audit.report_sent_at
      || discoverySha256(String(audit.email || "").trim().toLowerCase()) !== target.emailSha256) {
      throw new Error("DISCOVERY_WAKE_SUMMARY_REPAIR_TARGET_PRECONDITION_FAILED");
    }
    await assertNoDiscoveryDeliveryTrackingOrClaim(client, target.id);

    const previousTxt = String(audit.report_txt || "");
    const previousHtml = String(audit.report_html || "");
    if (discoverySha256(JSON.stringify(audit.responses ?? null))
        !== target.expectedResponsesJsonSha256
      || discoverySha256(JSON.stringify(audit.narrative_report ?? null))
        !== target.expectedNarrativeJsonSha256
      || discoverySha256(previousTxt) !== target.expectedTxtSha256
      || discoverySha256(previousHtml) !== target.expectedHtmlSha256) {
      throw new Error("DISCOVERY_WAKE_SUMMARY_REPAIR_AUDIT_HASH_MISMATCH");
    }

    const artifactResult = await client.query(
      `SELECT id, txt, html, content_sha256
         FROM report_artifacts WHERE audit_id = $1
         ORDER BY created_at ASC FOR UPDATE`,
      [target.id],
    );
    if ((artifactResult.rowCount ?? 0) !== target.expectedArtifactCount) {
      throw new Error("DISCOVERY_WAKE_SUMMARY_REPAIR_ARTIFACT_COUNT_MISMATCH");
    }
    const artifact = artifactResult.rows[0];
    const previousContentSha256 = discoveryArtifactContentHash(previousTxt, previousHtml);
    if (String(artifact.id) !== target.expectedArtifactId
      || discoverySha256(String(artifact.txt || "")) !== target.expectedTxtSha256
      || discoverySha256(String(artifact.html || "")) !== target.expectedHtmlSha256
      || String(artifact.content_sha256 || "") !== target.expectedArtifactContentSha256
      || previousContentSha256 !== target.expectedArtifactContentSha256) {
      throw new Error("DISCOVERY_WAKE_SUMMARY_REPAIR_ARTIFACT_HASH_MISMATCH");
    }

    if (!audit.narrative_report || typeof audit.narrative_report !== "object"
      || !Array.isArray(audit.narrative_report.sections)
      || JSON.stringify(Object.keys(audit.narrative_report).sort())
        !== JSON.stringify([...target.expectedNarrativeTopLevelKeys].sort())) {
      throw new Error("DISCOVERY_WAKE_SUMMARY_REPAIR_STRUCTURED_REPORT_SHAPE_MISMATCH");
    }
    const repairedReport = structuredClone(audit.narrative_report) as Record<string, any>;
    const section = repairedReport.sections[target.sectionIndex];
    const promoSection = hasPriorFixInvariants && "promoSectionIndex" in target
      ? repairedReport.sections[target.promoSectionIndex]
      : undefined;
    const metadataValue = metadataKey
      ? repairedReport.analysisMetadata?.[metadataKey]
      : undefined;
    const serializedBefore = JSON.stringify(repairedReport);
    const artifactTxt = String(artifact.txt || "");
    const artifactHtml = String(artifact.html || "");
    const beforeRepresentations = [serializedBefore, previousTxt, previousHtml, artifactTxt, artifactHtml];
    if (!section
      || String(section.id) !== target.sectionId
      || typeof section.content !== "string"
      || countExactOccurrences(section.content, target.oldText) !== 1
      || countExactOccurrences(section.content, target.newText) !== 0
      || countExactOccurrences(serializedBefore, target.oldText) !== expectedNarrativeOccurrences
      || countExactOccurrences(serializedBefore, target.newText) !== 0
      || beforeRepresentations.slice(1).some((value) =>
        countExactOccurrences(value, target.oldText) !== expectedRenderedOccurrences
        || countExactOccurrences(value, target.newText) !== 0)
      || (metadataKey && (
        typeof metadataValue !== "string"
        || countExactOccurrences(metadataValue, target.oldText) !== 1
        || countExactOccurrences(metadataValue, target.newText) !== 0
      ))) {
      throw new Error("DISCOVERY_WAKE_SUMMARY_REPAIR_EXACT_PATH_OR_OCCURRENCE_MISMATCH");
    }

    const legacyPromoCode = ["DISCOVERY", "20"].join("");
    if (hasPriorFixInvariants && "alreadyFixedSleepText" in target) {
      for (const [representationIndex, value] of beforeRepresentations.entries()) {
        const sleepCount = countExactOccurrences(value, target.alreadyFixedSleepText);
        const nutritionCount = countExactOccurrences(value, target.alreadyFixedNutritionText);
        const promoCodeCount = countExactOccurrences(value, legacyPromoCode);
        if (sleepCount !== 1 || nutritionCount !== 1 || promoCodeCount !== 0) {
          throw new Error(
            `DISCOVERY_WAKE_SUMMARY_REPAIR_PRIOR_FIX_INVARIANT_MISMATCH:${representationIndex}:${sleepCount}:${nutritionCount}:${promoCodeCount}`,
          );
        }
      }
      if (!promoSection
        || String(promoSection.id) !== target.promoSectionId
        || typeof promoSection.content !== "string"
        || countExactOccurrences(promoSection.content, target.approvedNeutralPromoHtml) !== 1) {
        throw new Error("DISCOVERY_WAKE_SUMMARY_REPAIR_PRIOR_PROMO_INVARIANT_MISMATCH");
      }
    }

    section.content = section.content.replace(target.oldText, target.newText);
    if (metadataKey) {
      repairedReport.analysisMetadata[metadataKey] = metadataValue.replace(
        target.oldText,
        target.newText,
      );
    }
    const assets = buildDiscoveryReportAssets(repairedReport as any);
    const factualErrors = validateDiscoveryFactualConsistency(
      [assets.txt, JSON.stringify(repairedReport.analysisMetadata ?? {})].join("\n"),
      (audit.responses && typeof audit.responses === "object") ? audit.responses : {},
    );
    if (factualErrors.length !== 0) {
      throw new Error(`DISCOVERY_WAKE_SUMMARY_REPAIR_FACTUAL_CONSISTENCY_FAILED:${factualErrors.join("|")}`);
    }
    const gate = evaluateDiscoveryDeliveryGate(
      repairedReport as any,
      assets,
      new Date(),
      repairedReport.analysisMetadata,
    );
    if (!gate.ok || gate.errors.length !== 0) {
      throw new Error(`DISCOVERY_WAKE_SUMMARY_REPAIR_GATE_FAILED:${gate.errors.join("|")}`);
    }
    const finalNarrative = attachDiscoveryDeliveryGateResult(repairedReport, gate);
    if (!hasPassingPersistedDiscoveryDeliveryGate(finalNarrative)) {
      throw new Error("DISCOVERY_WAKE_SUMMARY_REPAIR_PERSISTED_GATE_FAILED");
    }

    const serializedAfter = JSON.stringify(finalNarrative);
    const afterRepresentations = [serializedAfter, assets.txt, assets.html];
    if (countExactOccurrences(serializedAfter, target.oldText) !== 0
      || countExactOccurrences(serializedAfter, target.newText) !== expectedNarrativeOccurrences
      || afterRepresentations.slice(1).some((value) =>
        countExactOccurrences(value, target.oldText) !== 0
        || countExactOccurrences(value, target.newText) !== expectedRenderedOccurrences)
      || (hasPriorFixInvariants && "alreadyFixedSleepText" in target
        && afterRepresentations.some((value) =>
        countExactOccurrences(value, target.alreadyFixedSleepText) !== 1
        || countExactOccurrences(value, target.alreadyFixedNutritionText) !== 1
        || countExactOccurrences(value, legacyPromoCode) !== 0))) {
      throw new Error("DISCOVERY_WAKE_SUMMARY_REPAIR_RENDER_MISMATCH");
    }

    const txtSha256 = discoverySha256(assets.txt);
    const htmlSha256 = discoverySha256(assets.html);
    const contentSha256 = discoveryArtifactContentHash(assets.txt, assets.html);
    if (txtSha256 === target.expectedTxtSha256 || htmlSha256 === target.expectedHtmlSha256) {
      throw new Error("DISCOVERY_WAKE_SUMMARY_REPAIR_HASH_UNCHANGED");
    }

    const artifactUpdated = await client.query(
      `UPDATE report_artifacts
          SET txt = $3, html = $4, content_sha256 = $5
        WHERE id = $1 AND audit_id = $2
          AND txt IS NOT DISTINCT FROM $6
          AND html IS NOT DISTINCT FROM $7
          AND content_sha256 = $8
          AND EXISTS (
            SELECT 1 FROM discovery_operation_lock l
             WHERE l.lock_key = $9 AND l.token = $10 AND l.expires_at > NOW()
          )
        RETURNING id`,
      [artifact.id, target.id, assets.txt, assets.html, contentSha256,
        previousTxt, previousHtml, previousContentSha256,
        DISCOVERY_GLOBAL_LOCK_KEY, input.lockToken],
    );
    if ((artifactUpdated.rowCount ?? 0) !== 1) {
      throw new Error("DISCOVERY_WAKE_SUMMARY_REPAIR_ARTIFACT_CAS_FAILED");
    }

    const auditUpdated = await client.query(
      `UPDATE audits
          SET narrative_report = $2::jsonb,
              report_txt = $3,
              report_html = $4,
              report_delivery_status = 'BATCH_READY'
        WHERE id = $1 AND type = 'GRATUIT'
          AND email IS NOT DISTINCT FROM $5
          AND report_delivery_status = 'BATCH_READY'
          AND report_sent_at IS NULL
          AND narrative_report IS NOT DISTINCT FROM $6::jsonb
          AND report_txt IS NOT DISTINCT FROM $7
          AND report_html IS NOT DISTINCT FROM $8
          AND EXISTS (
            SELECT 1 FROM discovery_operation_lock l
             WHERE l.lock_key = $9 AND l.token = $10 AND l.expires_at > NOW()
          )
        RETURNING id`,
      [target.id, JSON.stringify(finalNarrative), assets.txt, assets.html,
        audit.email, JSON.stringify(audit.narrative_report), previousTxt, previousHtml,
        DISCOVERY_GLOBAL_LOCK_KEY, input.lockToken],
    );
    if ((auditUpdated.rowCount ?? 0) !== 1) {
      throw new Error("DISCOVERY_WAKE_SUMMARY_REPAIR_AUDIT_CAS_FAILED");
    }

    const persisted = await client.query(
      `SELECT a.narrative_report, a.report_txt, a.report_html,
              r.txt AS artifact_txt, r.html AS artifact_html, r.content_sha256
         FROM audits a
         JOIN report_artifacts r ON r.audit_id = a.id
        WHERE a.id = $1 AND r.id = $2`,
      [target.id, artifact.id],
    );
    const persistedRow = persisted.rows[0];
    const persistedRepresentations = [
      JSON.stringify(persistedRow?.narrative_report ?? null),
      String(persistedRow?.report_txt || ""),
      String(persistedRow?.report_html || ""),
      String(persistedRow?.artifact_txt || ""),
      String(persistedRow?.artifact_html || ""),
    ];
    if ((persisted.rowCount ?? 0) !== 1
      || String(persistedRow?.content_sha256 || "") !== contentSha256
      || countExactOccurrences(persistedRepresentations[0], target.oldText) !== 0
      || countExactOccurrences(persistedRepresentations[0], target.newText)
        !== expectedNarrativeOccurrences
      || persistedRepresentations.slice(1).some((value) =>
        countExactOccurrences(value, target.oldText) !== 0
        || countExactOccurrences(value, target.newText) !== expectedRenderedOccurrences)
      || (hasPriorFixInvariants && "alreadyFixedSleepText" in target
        && persistedRepresentations.some((value) =>
        countExactOccurrences(value, target.alreadyFixedSleepText) !== 1
        || countExactOccurrences(value, target.alreadyFixedNutritionText) !== 1
        || countExactOccurrences(value, legacyPromoCode) !== 0))) {
      throw new Error("DISCOVERY_WAKE_SUMMARY_REPAIR_PERSISTED_REPRESENTATION_MISMATCH");
    }

    await assertNoDiscoveryDeliveryTrackingOrClaim(client, target.id);
    await client.query("COMMIT");
    return {
      auditId: target.id,
      artifactId: String(artifact.id),
      status: "BATCH_READY",
      previousTxtSha256: target.expectedTxtSha256,
      previousHtmlSha256: target.expectedHtmlSha256,
      txtSha256,
      htmlSha256,
      emailsSent: 0,
    };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

export async function repairExactLennyDiscoveryQualityWithoutDelivery(
  input: { lockToken: string },
  poolOverride?: Pool,
) {
  return repairExactDiscoveryWakeSummaryUnderLock({
    lockToken: input.lockToken,
    target: DISCOVERY_LENNY_WAKE_SUMMARY_FIX_TARGET,
  }, poolOverride);
}

export async function repairExactAlexandreDiscoveryCriticalCopyWithoutDelivery(
  input: { lockToken: string },
  poolOverride?: Pool,
) {
  return repairExactDiscoveryWakeSummaryUnderLock({
    lockToken: input.lockToken,
    target: DISCOVERY_ALEXANDRE_CRITICAL_COPY_FIX_TARGET,
  }, poolOverride);
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
            expected_responses_sha256, expected_source_status,
            expected_txt_sha256, expected_html_sha256,
            generated_txt_sha256, generated_html_sha256)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [batchId, item.auditId, item.sequenceNo, item.cohort,
          item.initialState || "QUEUED", item.expectedResponsesSha256,
          item.expectedSourceStatus, item.expectedTxtSha256 || null, item.expectedHtmlSha256 || null,
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
    const batch = await assertBatchOwnership(client, input.batchId, input.lockToken);
    if (String(batch.stage) !== "GENERATION"
      || !["PREPARED", "RUNNING", "PAUSED"].includes(String(batch.status))) {
      throw new Error("DISCOVERY_BATCH_NOT_FAILABLE");
    }
    const itemResult = await client.query(
      `SELECT * FROM discovery_batch_items
        WHERE batch_id = $1 AND audit_id = $2 FOR UPDATE`,
      [input.batchId, input.auditId],
    );
    if ((itemResult.rowCount ?? 0) !== 1) throw new Error("DISCOVERY_BATCH_ITEM_MISSING");
    const item = itemResult.rows[0];
    const sourceState = String(item.state);
    if (!["QUEUED", "PREFLIGHT_OK", "PROVIDER_STARTED", "GENERATED", "VALIDATED"].includes(sourceState)) {
      throw new Error("DISCOVERY_BATCH_ITEM_NOT_FAILABLE");
    }
    const reserved = Number(item.reserved_cost_usd || 0);
    const auditResult = await client.query(
      `SELECT id, responses, report_delivery_status, report_sent_at, report_txt, report_html
         FROM audits WHERE id = $1 AND type = 'GRATUIT' FOR UPDATE`,
      [input.auditId],
    );
    if ((auditResult.rowCount ?? 0) !== 1) throw new Error("DISCOVERY_AUDIT_MISSING");
    const audit = auditResult.rows[0];
    const currentTxt = String(audit.report_txt || "");
    const currentHtml = String(audit.report_html || "");
    const txtMatches = item.expected_txt_sha256 == null
      ? currentTxt.length === 0
      : discoverySha256(currentTxt) === String(item.expected_txt_sha256);
    const htmlMatches = item.expected_html_sha256 == null
      ? currentHtml.length === 0
      : discoverySha256(currentHtml) === String(item.expected_html_sha256);
    if (audit.report_sent_at
      || String(audit.report_delivery_status ?? "") !== String(item.expected_source_status ?? "")
      || discoverySha256(audit.responses) !== String(item.expected_responses_sha256)
      || !txtMatches || !htmlMatches) {
      throw new Error("DISCOVERY_BATCH_FAILURE_SOURCE_CAS_FAILED");
    }
    const itemFailed = await client.query(
      `UPDATE discovery_batch_items
          SET state = $3, reserved_cost_usd = 0, error_code = $4,
              error_detail = $5, updated_at = NOW()
        WHERE batch_id = $1 AND audit_id = $2
          AND state = $6 AND provider_calls = $7
          AND expected_responses_sha256 = $8
          AND expected_source_status IS NOT DISTINCT FROM $9
          AND expected_txt_sha256 IS NOT DISTINCT FROM $10
          AND expected_html_sha256 IS NOT DISTINCT FROM $11
          AND EXISTS (
            SELECT 1 FROM discovery_batch_runs b
            JOIN discovery_operation_lock l
              ON l.lock_key = $12 AND l.token = b.lock_token
            WHERE b.id = discovery_batch_items.batch_id
              AND b.lock_token = $13 AND b.stage = 'GENERATION'
              AND b.status = $14 AND l.expires_at > NOW()
          )
        RETURNING audit_id`,
      [input.batchId, input.auditId, input.ambiguous ? "AMBIGUOUS" : "FAILED",
        input.errorCode, input.errorDetail.slice(0, 4000), sourceState,
        Number(item.provider_calls), String(item.expected_responses_sha256),
        item.expected_source_status, item.expected_txt_sha256, item.expected_html_sha256,
        DISCOVERY_GLOBAL_LOCK_KEY, input.lockToken, String(batch.status)],
    );
    if ((itemFailed.rowCount ?? 0) !== 1) throw new Error("DISCOVERY_BATCH_ITEM_FAILURE_CAS_FAILED");
    const runPaused = await client.query(
      `UPDATE discovery_batch_runs
          SET status = 'PAUSED', stop_reason = $2,
              reserved_cost_usd = GREATEST(0, reserved_cost_usd - $3), updated_at = NOW()
        WHERE id = $1 AND lock_token = $4 AND status = $5
        RETURNING id`,
      [input.batchId, input.errorCode, reserved, input.lockToken, String(batch.status)],
    );
    if ((runPaused.rowCount ?? 0) !== 1) throw new Error("DISCOVERY_BATCH_RUN_FAILURE_CAS_FAILED");
    const auditFailed = await client.query(
      `UPDATE audits SET report_delivery_status = 'BATCH_REVIEW'
        WHERE id = $1 AND type = 'GRATUIT' AND report_sent_at IS NULL
          AND report_delivery_status IS NOT DISTINCT FROM $2
          AND responses IS NOT DISTINCT FROM $3::jsonb
          AND report_txt IS NOT DISTINCT FROM $4
          AND report_html IS NOT DISTINCT FROM $5
          AND ${DISCOVERY_SUPERSEDED_TERMINAL_SQL}`,
      [input.auditId, item.expected_source_status, JSON.stringify(audit.responses),
        audit.report_txt, audit.report_html],
    );
    if ((auditFailed.rowCount ?? 0) !== 1) throw new Error("DISCOVERY_BATCH_FAILURE_AUDIT_CAS_FAILED");
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
      FOR UPDATE OF b, l`,
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
    const priorGenericAttempt = await client.query(
      `SELECT 1 FROM ai_cost_budget_reservations
        WHERE product = 'discovery' AND order_id = $1
        LIMIT 1`,
      [input.auditId],
    );
    if ((priorGenericAttempt.rowCount ?? 0) !== 0) {
      throw new Error("DISCOVERY_BATCH_PRIOR_PROVIDER_ATTEMPT");
    }

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
    if (String(batch.stage) !== "GENERATION"
      || !["RUNNING", "PAUSED"].includes(String(batch.status))) {
      throw new Error("DISCOVERY_BATCH_NOT_PERSISTABLE");
    }
    const itemResult = await client.query(
      `SELECT * FROM discovery_batch_items WHERE batch_id = $1 AND audit_id = $2 FOR UPDATE`,
      [input.batchId, input.auditId],
    );
    if ((itemResult.rowCount ?? 0) !== 1) throw new Error("DISCOVERY_BATCH_ITEM_MISSING");
    const item = itemResult.rows[0];
    if (String(item.state) !== "GENERATED" || Number(item.provider_calls) !== 1) {
      throw new Error("DISCOVERY_BATCH_ITEM_NOT_VALIDATED");
    }
    if (Number(item.actual_cost_usd) > Number(batch.hard_per_scan_usd)) {
      throw new Error("DISCOVERY_BATCH_HARD_COST_BREACH");
    }
    const auditResult = await client.query(
      `SELECT id, responses, report_sent_at, report_delivery_status, narrative_report,
              report_txt, report_html
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
    if (String(item.expected_source_status ?? "") !== String(input.expectedSourceStatus ?? "")) {
      throw new Error("DISCOVERY_BATCH_MANIFEST_STATUS_MISMATCH");
    }
    if ((item.expected_txt_sha256 ?? null) !== input.expectedTxtSha256
      || (item.expected_html_sha256 ?? null) !== input.expectedHtmlSha256) {
      throw new Error("DISCOVERY_BATCH_MANIFEST_ARTIFACT_MISMATCH");
    }
    if (String(audit.report_delivery_status ?? "") !== String(input.expectedSourceStatus ?? "")) {
      throw new Error("DISCOVERY_AUDIT_SOURCE_STATUS_CHANGED");
    }
    const currentTxt = String(audit.report_txt || "");
    const currentHtml = String(audit.report_html || "");
    const sourceTxtMatches = input.expectedTxtSha256 == null
      ? currentTxt.length === 0
      : discoverySha256(currentTxt) === input.expectedTxtSha256;
    const sourceHtmlMatches = input.expectedHtmlSha256 == null
      ? currentHtml.length === 0
      : discoverySha256(currentHtml) === input.expectedHtmlSha256;
    if (!sourceTxtMatches || !sourceHtmlMatches) {
      throw new Error("DISCOVERY_AUDIT_SOURCE_ARTIFACT_CHANGED");
    }

    const artifactId = randomUUID();
    const artifact = await client.query(
      `INSERT INTO report_artifacts
         (id, audit_id, tier, engine, model, txt, html, content_sha256, batch_id, created_at)
       VALUES ($1,$2,'GRATUIT','discovery',$3,$4,$5,$6,$7,NOW())
       ON CONFLICT (audit_id, content_sha256) WHERE content_sha256 IS NOT NULL
       DO NOTHING
       RETURNING id`,
      [artifactId, input.auditId, input.model, input.txt, input.html, contentSha256, input.batchId],
    );
    if ((artifact.rowCount ?? 0) !== 1) throw new Error("DISCOVERY_BATCH_ARTIFACT_ALREADY_EXISTS");
    const persistedArtifactId = String(artifact.rows[0].id);
    const updated = await client.query(
      `UPDATE audits
          SET narrative_report = $2::jsonb, scores = $3::jsonb,
              report_txt = $4, report_html = $5, report_generated_at = NOW(),
              report_delivery_status = 'BATCH_READY'
        WHERE id = $1 AND type = 'GRATUIT'
          AND report_sent_at IS NULL
          AND report_delivery_status IS NOT DISTINCT FROM $6
          AND responses IS NOT DISTINCT FROM $7::jsonb
          AND report_txt IS NOT DISTINCT FROM $8
          AND report_html IS NOT DISTINCT FROM $9
          AND EXISTS (
            SELECT 1 FROM discovery_batch_items i
            JOIN discovery_batch_runs b ON b.id = i.batch_id
            JOIN discovery_operation_lock l
              ON l.lock_key = $10 AND l.token = b.lock_token
            WHERE i.batch_id = $11 AND i.audit_id = audits.id
              AND i.state = 'GENERATED' AND i.provider_calls = 1
              AND i.expected_responses_sha256 = $12
              AND i.expected_source_status IS NOT DISTINCT FROM $6
              AND i.expected_txt_sha256 IS NOT DISTINCT FROM $13
              AND i.expected_html_sha256 IS NOT DISTINCT FROM $14
              AND b.stage = 'GENERATION' AND b.status = $15
              AND b.lock_token = $16 AND l.expires_at > NOW()
          )
          AND ${DISCOVERY_SUPERSEDED_TERMINAL_SQL}
        RETURNING id`,
      [input.auditId, JSON.stringify(input.narrativeReport), JSON.stringify(input.scores), input.txt, input.html,
        input.expectedSourceStatus, JSON.stringify(audit.responses),
        audit.report_txt, audit.report_html, DISCOVERY_GLOBAL_LOCK_KEY, input.batchId,
        input.expectedResponsesSha256, input.expectedTxtSha256, input.expectedHtmlSha256,
        String(batch.status), input.lockToken],
    );
    if ((updated.rowCount ?? 0) !== 1) throw new Error("DISCOVERY_AUDIT_PERSISTENCE_CAS_FAILED");
    const itemStored = await client.query(
      `UPDATE discovery_batch_items
          SET state = 'STORED', generated_txt_sha256 = $3,
              generated_html_sha256 = $4, artifact_id = $5, updated_at = NOW()
        WHERE batch_id = $1 AND audit_id = $2
          AND state = 'GENERATED' AND provider_calls = 1
          AND expected_responses_sha256 = $6
          AND expected_source_status IS NOT DISTINCT FROM $7
          AND expected_txt_sha256 IS NOT DISTINCT FROM $8
          AND expected_html_sha256 IS NOT DISTINCT FROM $9
          AND EXISTS (
            SELECT 1 FROM discovery_batch_runs b
            JOIN discovery_operation_lock l
              ON l.lock_key = $10 AND l.token = b.lock_token
            WHERE b.id = discovery_batch_items.batch_id
              AND b.stage = 'GENERATION' AND b.status = $11
              AND b.lock_token = $12 AND l.expires_at > NOW()
          )
        RETURNING audit_id`,
      [input.batchId, input.auditId, txtSha256, htmlSha256, persistedArtifactId,
        input.expectedResponsesSha256, input.expectedSourceStatus,
        input.expectedTxtSha256, input.expectedHtmlSha256, DISCOVERY_GLOBAL_LOCK_KEY,
        String(batch.status), input.lockToken],
    );
    if ((itemStored.rowCount ?? 0) !== 1) throw new Error("DISCOVERY_BATCH_ITEM_PERSISTENCE_CAS_FAILED");
    await client.query("COMMIT");
    return { artifactId: persistedArtifactId, txtSha256, htmlSha256 };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

export async function promoteDiscoveryBatchItemForDelivery(
  input: { batchId: string; auditId: string; lockToken: string },
  poolOverride?: Pool,
): Promise<boolean> {
  const pool = await resolvePool(poolOverride);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [DISCOVERY_TRANSACTION_FENCE_KEY]);
    const batch = await assertBatchOwnership(client, input.batchId, input.lockToken);
    if (String(batch.stage) !== "DELIVERY"
      || !["PREPARED", "RUNNING"].includes(String(batch.status))) {
      throw new Error("DISCOVERY_DELIVERY_BATCH_NOT_RUNNABLE");
    }
    const itemResult = await client.query(
      `SELECT * FROM discovery_batch_items
        WHERE batch_id = $1 AND audit_id = $2 FOR UPDATE`,
      [input.batchId, input.auditId],
    );
    if ((itemResult.rowCount ?? 0) !== 1) throw new Error("DISCOVERY_BATCH_ITEM_MISSING");
    const item = itemResult.rows[0];
    if (String(item.state) !== "STORED" || Number(item.provider_calls) !== 0) {
      throw new Error("DISCOVERY_DELIVERY_BATCH_ITEM_NOT_STORED");
    }
    const auditResult = await client.query(
      `SELECT id, responses, report_sent_at, report_delivery_status,
              narrative_report, report_txt, report_html
         FROM audits WHERE id = $1 AND type = 'GRATUIT' FOR UPDATE`,
      [input.auditId],
    );
    if ((auditResult.rowCount ?? 0) !== 1) throw new Error("DISCOVERY_DELIVERY_AUDIT_MISSING");
    const audit = auditResult.rows[0];
    const txtSha256 = discoverySha256(String(audit.report_txt || ""));
    const htmlSha256 = discoverySha256(String(audit.report_html || ""));
    if (audit.report_sent_at
      || String(audit.report_delivery_status ?? "") !== String(item.expected_source_status ?? "")
      || discoverySha256(audit.responses) !== String(item.expected_responses_sha256)
      || txtSha256 !== String(item.expected_txt_sha256 || "")
      || htmlSha256 !== String(item.expected_html_sha256 || "")) {
      throw new Error("DISCOVERY_DELIVERY_MANIFEST_SOURCE_CHANGED");
    }
    const canonical = resolveCanonicalDiscoveryArtifacts({
      narrativeReport: audit.narrative_report,
      reportTxt: audit.report_txt,
      reportHtml: audit.report_html,
    });
    const gate = evaluateCanonicalDiscoveryArtifacts(canonical);
    if (!gate.ok || !hasPassingPersistedDiscoveryDeliveryGate(audit.narrative_report)) {
      throw new Error(`DISCOVERY_DELIVERY_GATE_CHANGED:${gate.errors.join("|")}`);
    }
    const promoted = await client.query(
      `UPDATE audits SET report_delivery_status = 'BATCH_READY'
        WHERE id = $1 AND type = 'GRATUIT' AND report_sent_at IS NULL
          AND report_delivery_status IS NOT DISTINCT FROM $2
          AND responses IS NOT DISTINCT FROM $3::jsonb
          AND report_txt IS NOT DISTINCT FROM $4
          AND report_html IS NOT DISTINCT FROM $5
          AND EXISTS (
            SELECT 1 FROM discovery_batch_items i
            JOIN discovery_batch_runs b ON b.id = i.batch_id
            JOIN discovery_operation_lock l
              ON l.lock_key = $6 AND l.token = b.lock_token
            WHERE i.batch_id = $7 AND i.audit_id = audits.id
              AND i.state = 'STORED' AND i.provider_calls = 0
              AND i.expected_source_status IS NOT DISTINCT FROM $2
              AND i.expected_responses_sha256 = $8
              AND i.expected_txt_sha256 = $9
              AND i.expected_html_sha256 = $10
              AND b.stage = 'DELIVERY' AND b.status = $11
              AND b.lock_token = $12 AND l.expires_at > NOW()
          )
          AND ${DISCOVERY_SUPERSEDED_TERMINAL_SQL}
        RETURNING id`,
      [input.auditId, item.expected_source_status, JSON.stringify(audit.responses),
        audit.report_txt, audit.report_html, DISCOVERY_GLOBAL_LOCK_KEY,
        input.batchId, item.expected_responses_sha256, item.expected_txt_sha256,
        item.expected_html_sha256, String(batch.status), input.lockToken],
    );
    if ((promoted.rowCount ?? 0) !== 1) throw new Error("DISCOVERY_DELIVERY_PROMOTION_CAS_FAILED");
    await client.query("COMMIT");
    return true;
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
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [DISCOVERY_TRANSACTION_FENCE_KEY]);
    const isBatch = Boolean(input.batchId || input.lockToken);
    if (isBatch && (!input.batchId || !input.lockToken)) {
      throw new Error("DISCOVERY_DELIVERY_BATCH_OWNERSHIP_INCOMPLETE");
    }
    let item: any = null;
    let deliveryFenceToken: string | null = null;
    if (isBatch) {
      await assertBatchOwnership(client, input.batchId!, input.lockToken!);
      deliveryFenceToken = input.lockToken!;
      const itemResult = await client.query(
        `SELECT * FROM discovery_batch_items WHERE batch_id = $1 AND audit_id = $2 FOR UPDATE`,
        [input.batchId, input.auditId],
      );
      if ((itemResult.rowCount ?? 0) !== 1 || String(itemResult.rows[0].state) !== "STORED") {
        throw new Error("DISCOVERY_BATCH_ITEM_NOT_STORED");
      }
      item = itemResult.rows[0];
    } else {
      const fence = await client.query(
        `SELECT token::text AS token, (expires_at > NOW()) AS active
           FROM discovery_operation_lock WHERE lock_key = $1
           FOR UPDATE`,
        [DISCOVERY_GLOBAL_LOCK_KEY],
      );
      if (fence.rows[0]?.active) throw new Error("DISCOVERY_GLOBAL_LOCK_ACTIVE");
      deliveryFenceToken = fence.rows[0]?.token ? String(fence.rows[0].token) : null;
    }
    const auditResult = await client.query(
      `SELECT id, email, report_sent_at, report_delivery_status, report_txt, report_html,
              narrative_report, created_at
         FROM audits WHERE id = $1 AND type = 'GRATUIT' FOR UPDATE`,
      [input.auditId],
    );
    if ((auditResult.rowCount ?? 0) !== 1) throw new Error("DISCOVERY_AUDIT_MISSING");
    const audit = auditResult.rows[0];
    if (audit.report_sent_at) throw new Error("DISCOVERY_AUDIT_ALREADY_SENT");
    if (!isBatch && !isDiscoveryTransactionalAutomationEligible({
      type: "GRATUIT",
      createdAt: audit.created_at,
    })) {
      throw new Error("DISCOVERY_TRANSACTIONAL_AUTOMATION_INELIGIBLE");
    }
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
    if (!hasPassingPersistedDiscoveryDeliveryGate(audit.narrative_report)) {
      throw new Error("DISCOVERY_DELIVERY_PERSISTED_GATE_MISSING");
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
          report_txt_sha256, report_html_sha256, subject_sha256, state, fence_token)
       VALUES ($1,$2,$3,'sendReportReadyEmail',$4,$5,$6,$7,'CLAIMED',$8)
       ON CONFLICT (audit_id, email_type) DO NOTHING
       RETURNING id, created_at`,
      [claimId, input.batchId || null, input.auditId, input.recipientEmail.trim().toLowerCase(),
        txtSha256, htmlSha256, discoverySha256(input.subject), deliveryFenceToken],
    );
    if ((claimed.rowCount ?? 0) !== 1) throw new Error("DISCOVERY_DELIVERY_CLAIM_EXISTS");
    const auditClaimed = await client.query(
      `UPDATE audits SET report_delivery_status = 'SENDING'
        WHERE id = $1 AND type = 'GRATUIT' AND report_sent_at IS NULL
          AND report_delivery_status = ANY($2::text[])
          AND ${DISCOVERY_SUPERSEDED_TERMINAL_SQL}
        RETURNING id`,
      [input.auditId, allowedStatuses],
    );
    if ((auditClaimed.rowCount ?? 0) !== 1) throw new Error("DISCOVERY_DELIVERY_AUDIT_CLAIM_CAS_FAILED");
    if (isBatch) {
      const itemClaimed = await client.query(
        `UPDATE discovery_batch_items SET state = 'DELIVERY_CLAIMED', updated_at = NOW()
          WHERE batch_id = $1 AND audit_id = $2 AND state = 'STORED'
          RETURNING audit_id`,
        [input.batchId, input.auditId],
      );
      if ((itemClaimed.rowCount ?? 0) !== 1) {
        throw new Error("DISCOVERY_DELIVERY_ITEM_CLAIM_CAS_FAILED");
      }
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

async function assertDiscoveryDeliveryFenceOwnership(
  client: PoolClient,
  claimId: string,
): Promise<any> {
  const claimResult = await client.query(
    `SELECT * FROM discovery_email_delivery_claims WHERE id = $1 FOR UPDATE`,
    [claimId],
  );
  if ((claimResult.rowCount ?? 0) !== 1) throw new Error("DISCOVERY_DELIVERY_CLAIM_MISSING");
  const claim = claimResult.rows[0];
  if (claim.batch_id) {
    const ownership = await client.query(
      `SELECT 1 FROM discovery_batch_runs b
        JOIN discovery_operation_lock l
          ON l.lock_key = $2 AND l.token = b.lock_token
        WHERE b.id = $1 AND b.lock_token = $3
          AND l.expires_at > NOW()
        FOR UPDATE OF b, l`,
      [claim.batch_id, DISCOVERY_GLOBAL_LOCK_KEY, claim.fence_token],
    );
    if ((ownership.rowCount ?? 0) !== 1) throw new Error("DISCOVERY_DELIVERY_BATCH_OWNERSHIP_LOST");
  } else {
    const fence = await client.query(
      `SELECT token::text AS token, (expires_at > NOW()) AS active
         FROM discovery_operation_lock WHERE lock_key = $1
         FOR UPDATE`,
      [DISCOVERY_GLOBAL_LOCK_KEY],
    );
    if (fence.rows[0]?.active) throw new Error("DISCOVERY_GLOBAL_LOCK_ACTIVE");
    const currentEpoch = fence.rows[0]?.token ? String(fence.rows[0].token) : null;
    const claimEpoch = claim.fence_token ? String(claim.fence_token) : null;
    if (currentEpoch !== claimEpoch) throw new Error("DISCOVERY_DELIVERY_FENCE_STALE");
  }
  return claim;
}

export async function markDiscoveryDeliveryProviderPostStarted(
  claimId: string,
  poolOverride?: Pool,
): Promise<boolean> {
  const pool = await resolvePool(poolOverride);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [DISCOVERY_TRANSACTION_FENCE_KEY]);
    const claim = await assertDiscoveryDeliveryFenceOwnership(client, claimId);
    if (String(claim.state) !== "CLAIMED") {
      await client.query("ROLLBACK");
      return false;
    }
    const result = await client.query(
      `UPDATE discovery_email_delivery_claims
          SET state = 'PROVIDER_POST_STARTED', provider_post_started_at = NOW(), updated_at = NOW()
        WHERE id = $1 AND state = 'CLAIMED'
          AND fence_token IS NOT DISTINCT FROM $2
        RETURNING id`,
      [claimId, claim.fence_token],
    );
    if ((result.rowCount ?? 0) !== 1) throw new Error("DISCOVERY_DELIVERY_PROVIDER_START_CAS_FAILED");
    await client.query("COMMIT");
    return true;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
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
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [DISCOVERY_TRANSACTION_FENCE_KEY]);
    const claim = await assertDiscoveryDeliveryFenceOwnership(client, input.claimId);
    const result = await client.query(
      `UPDATE discovery_email_delivery_claims
          SET state = $2, provider_task_id = COALESCE($3, provider_task_id),
              provider_accepted_at = CASE WHEN $2 IN ('PROVIDER_ACCEPTED','SMTP_CONFIRMED') THEN NOW() ELSE provider_accepted_at END,
              smtp_confirmed_at = CASE WHEN $2 = 'SMTP_CONFIRMED' THEN NOW() ELSE smtp_confirmed_at END,
              error_detail = $4, updated_at = NOW()
        WHERE id = $1 AND fence_token IS NOT DISTINCT FROM $5
          AND (
            ($2 IN ('PROVIDER_ACCEPTED','SMTP_CONFIRMED','AMBIGUOUS') AND state = 'PROVIDER_POST_STARTED')
            OR ($2 = 'FAILED_FINAL' AND state = 'CLAIMED')
          )
        RETURNING batch_id, audit_id`,
      [input.claimId, input.outcome, input.providerTaskId || null, input.errorDetail || null,
        claim.fence_token],
    );
    if ((result.rowCount ?? 0) !== 1) {
      await client.query("ROLLBACK");
      return false;
    }
    const row = result.rows[0];
    if (["PROVIDER_ACCEPTED", "SMTP_CONFIRMED"].includes(input.outcome)) {
      const auditFinalized = await client.query(
        `UPDATE audits SET report_delivery_status = 'SENT', report_sent_at = NOW()
          WHERE id = $1 AND type = 'GRATUIT'
            AND report_sent_at IS NULL AND report_delivery_status = 'SENDING'
            AND ${DISCOVERY_SUPERSEDED_TERMINAL_SQL}
          RETURNING id`,
        [row.audit_id],
      );
      if ((auditFinalized.rowCount ?? 0) !== 1) {
        throw new Error("DISCOVERY_DELIVERY_AUDIT_FINALIZE_CAS_FAILED");
      }
      if (row.batch_id) {
        const itemDelivered = await client.query(
          `UPDATE discovery_batch_items SET state = 'DELIVERED', updated_at = NOW()
            WHERE batch_id = $1 AND audit_id = $2 AND state = 'DELIVERY_CLAIMED'
            RETURNING audit_id`,
          [row.batch_id, row.audit_id],
        );
        if ((itemDelivered.rowCount ?? 0) !== 1) {
          throw new Error("DISCOVERY_DELIVERY_ITEM_FINALIZE_CAS_FAILED");
        }
      }
    } else {
      const auditBlocked = await client.query(
        `UPDATE audits SET report_delivery_status = $2
          WHERE id = $1 AND type = 'GRATUIT'
            AND report_sent_at IS NULL AND report_delivery_status = 'SENDING'
            AND ${DISCOVERY_SUPERSEDED_TERMINAL_SQL}
          RETURNING id`,
        [row.audit_id, input.outcome === "AMBIGUOUS" ? "DELIVERY_AMBIGUOUS" : "DELIVERY_BLOCKED"],
      );
      if ((auditBlocked.rowCount ?? 0) !== 1) {
        throw new Error("DISCOVERY_DELIVERY_AUDIT_FAILURE_CAS_FAILED");
      }
      if (row.batch_id) {
        const itemFailed = await client.query(
          `UPDATE discovery_batch_items
              SET state = $3, error_code = $4, error_detail = $5, updated_at = NOW()
            WHERE batch_id = $1 AND audit_id = $2 AND state = 'DELIVERY_CLAIMED'
            RETURNING audit_id`,
          [row.batch_id, row.audit_id,
            input.outcome === "AMBIGUOUS" ? "AMBIGUOUS" : "FAILED",
            `delivery_${input.outcome.toLowerCase()}`, input.errorDetail || null],
        );
        if ((itemFailed.rowCount ?? 0) !== 1) {
          throw new Error("DISCOVERY_DELIVERY_ITEM_FAILURE_CAS_FAILED");
        }
        const batchPaused = await client.query(
          `UPDATE discovery_batch_runs SET status = 'PAUSED', stop_reason = $2, updated_at = NOW()
            WHERE id = $1 AND status IN ('RUNNING','PAUSED')
            RETURNING id`,
          [row.batch_id, `delivery_${input.outcome.toLowerCase()}`],
        );
        if ((batchPaused.rowCount ?? 0) !== 1) {
          throw new Error("DISCOVERY_DELIVERY_BATCH_PAUSE_CAS_FAILED");
        }
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
