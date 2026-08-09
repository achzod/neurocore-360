import { randomUUID } from "crypto";
import type { Pool } from "pg";

export const RECOVERY_CTA_CLICK_CLAIM_TTL_MINUTES = 30;
export const RECOVERY_CTA_CLICK_RETRY_COOLDOWN_MINUTES = 15;
export const RECOVERY_CTA_CAMPAIGN = "recovery_cta_2026_06";
export const RECOVERY_CTA_CLICK_COHORT = "clicked_help";
export const RECOVERY_CTA_RECONCILIATION_STATES = ["provider_post_started", "reconcile_required"] as const;

const SUCCESS_STATUSES = new Set(["success", "sent", "delivered"]);
const BLOCKED_STATUSES = new Set(["unsubscribed", "auth_failed"]);
const FAILED_STATUSES = new Set(["failed"]);

export type RecoveryCtaClickClaimRow = {
  id: string;
  sentAt: Date | string;
  sendpulseStatus?: string | null;
  sendpulseTaskId?: string | null;
  metadata?: Record<string, unknown> | null;
};

export type RecoveryCtaClickClaimDecision =
  | { action: "claim"; attempt: number; retry: boolean }
  | { action: "skip"; reason: "already_sent" | "in_progress" | "retry_cooldown" | "blocked" | "reconcile_required" };

export type RecoveryCtaClickClaimResult = RecoveryCtaClickClaimDecision & {
  trackingId?: string;
  idempotencyKey: string;
};

type ClaimInput = {
  sourceTrackingId: string;
  recipientEmail: string;
  auditId?: string | null;
  auditType?: string | null;
};

export function buildRecoveryCtaClickIdempotencyKey(
  recipientEmail: string,
  campaign = RECOVERY_CTA_CAMPAIGN,
  cohort = RECOVERY_CTA_CLICK_COHORT,
): string {
  const normalizedEmail = String(recipientEmail || "").trim().toLowerCase();
  if (!normalizedEmail) throw new Error("recipientEmail is required for recovery CTA click follow-up");
  return `recovery_cta_recipient:${campaign}:${cohort}:${normalizedEmail}`;
}

export function isAmbiguousSendPulsePostError(error: unknown, providerPostStarted: boolean): boolean {
  if (!providerPostStarted || !(error instanceof Error)) return false;
  const code = String((error as Error & { code?: unknown }).code || "").toUpperCase();
  return error.name === "AbortError"
    || error instanceof TypeError
    || ["ECONNRESET", "ECONNABORTED", "ETIMEDOUT", "EPIPE", "UND_ERR_SOCKET", "UND_ERR_CONNECT_TIMEOUT"].includes(code)
    || /\b(abort(?:ed|error)?|fetch failed|socket|connection reset|timed?\s*out|network error)\b/i.test(error.message);
}

export function classifySendPulsePostFailure(error: unknown, providerPostStarted: boolean): {
  sendpulseStatus: "pending" | "failed";
  reconcileRequired: boolean;
  metadata: Record<string, unknown>;
} {
  const reconcileRequired = isAmbiguousSendPulsePostError(error, providerPostStarted);
  return {
    sendpulseStatus: reconcileRequired ? "pending" : "failed",
    reconcileRequired,
    metadata: reconcileRequired
      ? {
          deliveryState: "reconcile_required",
          providerOutcomeUnknown: true,
          retryable: false,
        }
      : {},
  };
}

export function summarizeRecoveryCtaClickCronResult(result: unknown): {
  sent: number;
  failed: number;
  shouldContinueClickLoop: boolean;
} {
  const value = result && typeof result === "object" ? result as Record<string, unknown> : {};
  const sent = Math.max(0, Number(value.sent) || 0);
  const failed = Math.max(0, Number(value.failed) || 0);
  return { sent, failed, shouldContinueClickLoop: sent > 0 };
}

export type RecoveryCtaProviderOutcome =
  | { outcome: "success"; providerTaskId: string; providerStatus?: string | null }
  | { outcome: "confirmed_not_sent"; providerStatus: string; proof: string }
  | { outcome: "unknown"; reason: string };

export function classifyRecoveryCtaProviderRecord(record: Record<string, unknown> | null): RecoveryCtaProviderOutcome {
  if (!record) return { outcome: "unknown", reason: "no_exact_provider_record" };
  const providerTaskId = String(record.id ?? record.email_id ?? record.message_id ?? record.task_id ?? "").trim();
  const providerStatus = String(record.status ?? "").trim().toLowerCase();
  if (["not_sent", "rejected", "cancelled", "canceled"].includes(providerStatus)) {
    return {
      outcome: "confirmed_not_sent",
      providerStatus,
      proof: `sendpulse_status:${providerStatus}`,
    };
  }
  if (!providerTaskId) return { outcome: "unknown", reason: "provider_record_without_id" };
  return { outcome: "success", providerTaskId, providerStatus: providerStatus || null };
}

export async function markRecoveryCtaProviderPostStarted(
  pool: Pool,
  input: {
    trackingId: string;
    idempotencyKey: string;
    recipientEmail: string;
    subject: string;
    startedAt?: Date;
  },
): Promise<void> {
  const startedAt = input.startedAt || new Date();
  const result = await pool.query(
    `UPDATE email_tracking
        SET recipient_email = $3,
            subject = $4,
            sendpulse_status = 'pending',
            metadata = COALESCE(metadata, '{}'::jsonb) || $5::jsonb,
            updated_at = NOW()
      WHERE id = $1
        AND email_type = 'sendRecoveryCtaEmail'
        AND metadata->>'recoveryClickFollowupKey' = $2
        AND COALESCE(metadata->>'deliveryState', '') NOT IN ('provider_post_started', 'reconcile_required')`,
    [
      input.trackingId,
      input.idempotencyKey,
      input.recipientEmail,
      input.subject,
      JSON.stringify({
        deliveryState: "provider_post_started",
        providerPostStartedAt: startedAt.toISOString(),
        providerOutcomeUnknown: true,
        retryable: false,
      }),
    ],
  );
  if (result.rowCount !== 1) {
    throw new Error(`Recovery CTA provider POST claim transition rejected for ${input.trackingId}`);
  }
}

export async function applyRecoveryCtaReconciliation(
  pool: Pool,
  input: {
    trackingId: string;
    idempotencyKey: string;
    outcome: RecoveryCtaProviderOutcome;
    reconciledAt?: Date;
  },
): Promise<"updated" | "stale"> {
  const reconciledAt = input.reconciledAt || new Date();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [input.idempotencyKey]);
    const current = await client.query(
      `SELECT id
         FROM email_tracking
        WHERE id = $1
          AND metadata->>'recoveryClickFollowupKey' = $2
          AND metadata->>'deliveryState' IN ('provider_post_started', 'reconcile_required')
        FOR UPDATE`,
      [input.trackingId, input.idempotencyKey],
    );
    if (current.rowCount !== 1) {
      await client.query("COMMIT");
      return "stale";
    }

    if (input.outcome.outcome === "success") {
      await client.query(
        `UPDATE email_tracking
            SET sendpulse_task_id = $2,
                sendpulse_status = 'success',
                sendpulse_error = NULL,
                metadata = (COALESCE(metadata, '{}'::jsonb)
                  - 'deliveryState' - 'providerOutcomeUnknown' - 'retryable')
                  || $3::jsonb,
                updated_at = NOW()
          WHERE id = $1`,
        [input.trackingId, input.outcome.providerTaskId, JSON.stringify({
          reconciledAt: reconciledAt.toISOString(),
          reconciliationOutcome: "success",
          providerStatus: input.outcome.providerStatus || null,
        })],
      );
    } else if (input.outcome.outcome === "confirmed_not_sent") {
      await client.query(
        `UPDATE email_tracking
            SET sendpulse_task_id = NULL,
                sendpulse_status = 'failed',
                sendpulse_error = $2,
                metadata = (COALESCE(metadata, '{}'::jsonb)
                  - 'deliveryState' - 'providerOutcomeUnknown')
                  || $3::jsonb,
                updated_at = NOW()
          WHERE id = $1`,
        [input.trackingId, input.outcome.proof, JSON.stringify({
          reconciledAt: reconciledAt.toISOString(),
          reconciliationOutcome: "confirmed_not_sent",
          providerStatus: input.outcome.providerStatus,
          retryable: true,
        })],
      );
    } else {
      await client.query(
        `UPDATE email_tracking
            SET sendpulse_status = 'pending',
                metadata = COALESCE(metadata, '{}'::jsonb) || $2::jsonb,
                updated_at = NOW()
          WHERE id = $1`,
        [input.trackingId, JSON.stringify({
          deliveryState: "reconcile_required",
          providerOutcomeUnknown: true,
          retryable: false,
          lastReconciliationAt: reconciledAt.toISOString(),
          lastReconciliationReason: input.outcome.reason,
        })],
      );
    }
    await client.query("COMMIT");
    return "updated";
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

const normalizedStatus = (row: RecoveryCtaClickClaimRow): string =>
  String(row.sendpulseStatus || "").trim().toLowerCase();

const metadataAttempt = (row: RecoveryCtaClickClaimRow): number => {
  const parsed = Number(row.metadata?.claimAttempt);
  return Number.isFinite(parsed) && parsed >= 1 ? Math.floor(parsed) : 1;
};

export function decideRecoveryCtaClickClaim(
  existing: RecoveryCtaClickClaimRow | null,
  now = new Date(),
): RecoveryCtaClickClaimDecision {
  if (!existing) return { action: "claim", attempt: 1, retry: false };

  const status = normalizedStatus(existing);
  if (existing.sendpulseTaskId || SUCCESS_STATUSES.has(status)) {
    return { action: "skip", reason: "already_sent" };
  }
  if (BLOCKED_STATUSES.has(status)) {
    return { action: "skip", reason: "blocked" };
  }
  if ((RECOVERY_CTA_RECONCILIATION_STATES as readonly string[]).includes(String(existing.metadata?.deliveryState || ""))) {
    return { action: "skip", reason: "reconcile_required" };
  }

  const sentAtMs = new Date(existing.sentAt).getTime();
  const ageMs = Number.isFinite(sentAtMs) ? Math.max(0, now.getTime() - sentAtMs) : Number.POSITIVE_INFINITY;
  if ((status === "pending" || status === "")
    && ageMs < RECOVERY_CTA_CLICK_CLAIM_TTL_MINUTES * 60_000) {
    return { action: "skip", reason: "in_progress" };
  }
  if (FAILED_STATUSES.has(status)
    && ageMs < RECOVERY_CTA_CLICK_RETRY_COOLDOWN_MINUTES * 60_000) {
    return { action: "skip", reason: "retry_cooldown" };
  }

  return { action: "claim", attempt: metadataAttempt(existing) + 1, retry: true };
}

/**
 * Atomically reserves one click follow-up before any provider call.
 *
 * The transaction-scoped advisory lock serializes claims across Render instances.
 * The persisted pending row continues protecting the recipient after the request
 * that started the send has timed out or the process has moved to another tick.
 */
export async function claimRecoveryCtaClickFollowup(
  pool: Pool,
  input: ClaimInput,
  now = new Date(),
): Promise<RecoveryCtaClickClaimResult> {
  const idempotencyKey = buildRecoveryCtaClickIdempotencyKey(input.recipientEmail);
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [idempotencyKey]);

    const existingResult = await client.query(
      `SELECT id,
              sent_at AS "sentAt",
              sendpulse_status AS "sendpulseStatus",
              sendpulse_task_id AS "sendpulseTaskId",
              metadata
         FROM email_tracking
        WHERE email_type = 'sendRecoveryCtaEmail'
          AND metadata->>'recoveryClickFollowupKey' = $1
        ORDER BY sent_at DESC
        LIMIT 1
        FOR UPDATE`,
      [idempotencyKey],
    );
    const existing = (existingResult.rows[0] as RecoveryCtaClickClaimRow | undefined) || null;
    const decision = decideRecoveryCtaClickClaim(existing, now);

    if (decision.action === "skip") {
      await client.query("COMMIT");
      return { ...decision, trackingId: existing?.id, idempotencyKey };
    }

    const trackingId = existing?.id || randomUUID();
    const metadata = {
      trackingId,
      cohort: RECOVERY_CTA_CLICK_COHORT,
      campaign: RECOVERY_CTA_CAMPAIGN,
      recoveryClickFollowupKey: idempotencyKey,
      sourceTrackingId: input.sourceTrackingId,
      claimAttempt: decision.attempt,
      claimedAt: now.toISOString(),
    };

    if (existing) {
      await client.query(
        `UPDATE email_tracking
            SET audit_id = $2,
                audit_type = $3,
                recipient_email = $4,
                sendpulse_task_id = NULL,
                sendpulse_status = 'pending',
                sendpulse_error = NULL,
                metadata = $5::jsonb,
                sent_at = $6,
                updated_at = NOW()
          WHERE id = $1`,
        [trackingId, input.auditId || randomUUID(), input.auditType || null, input.recipientEmail, JSON.stringify(metadata), now],
      );
    } else {
      await client.query(
        `INSERT INTO email_tracking
          (id, audit_id, audit_type, email_type, recipient_email, sendpulse_status, metadata, sent_at, created_at, updated_at)
         VALUES ($1, $2, $3, 'sendRecoveryCtaEmail', $4, 'pending', $5::jsonb, $6, NOW(), NOW())`,
        [trackingId, input.auditId || randomUUID(), input.auditType || null, input.recipientEmail, JSON.stringify(metadata), now],
      );
    }

    await client.query("COMMIT");
    return { ...decision, trackingId, idempotencyKey };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}
