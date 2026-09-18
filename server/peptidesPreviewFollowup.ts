import type { PoolClient } from "pg";
import { randomUUID } from "node:crypto";
import { pool } from "./db";
import { sendPeptidesPreviewFollowupEmail } from "./emailService";
import {
  PEPTIDES_PREVIEW_FOLLOWUP_START_AT,
  classifyPeptidesPreviewProviderOutcome,
  choosePeptidesPreviewFollowupStage,
  isEligiblePreviewFollowupEmail,
  normalizePreviewFollowupEmail,
  type PeptidesPreviewFollowupStage,
  type PeptidesPreviewFollowupTracking,
} from "./peptidesPreviewFollowupRules";

const WORKER_INTERVAL_MS = 15 * 60_000;
const ADVISORY_LOCK_PREFIX = "peptides_preview_followup";
const FEATURE_FLAG_KEY = "peptides_preview_followup";

let workerStarted = false;
let workerRunning = false;
let featureFlagTableReady = false;

async function ensureFeatureFlagTable(): Promise<void> {
  if (featureFlagTableReady) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS automation_feature_flags (
      key TEXT PRIMARY KEY,
      enabled BOOLEAN NOT NULL DEFAULT FALSE,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(
    `INSERT INTO automation_feature_flags (key, enabled, metadata)
     VALUES ($1, FALSE, $2::jsonb)
     ON CONFLICT (key) DO NOTHING`,
    [FEATURE_FLAG_KEY, JSON.stringify({ owner: "peptidesPreviewFollowupWorker" })],
  );
  featureFlagTableReady = true;
}

export async function isPeptidesPreviewFollowupEnabled(): Promise<boolean> {
  if (process.env.PEPTIDES_PREVIEW_FOLLOWUP_ENABLED === "0") return false;
  if (process.env.PEPTIDES_PREVIEW_FOLLOWUP_ENABLED === "1") return true;
  await ensureFeatureFlagTable();
  const result = await pool.query<{ enabled: boolean }>(
    `SELECT enabled FROM automation_feature_flags WHERE key = $1`,
    [FEATURE_FLAG_KEY],
  );
  return result.rows[0]?.enabled === true;
}

export async function setPeptidesPreviewFollowupEnabled(enabled: boolean, source = "admin"): Promise<boolean> {
  await ensureFeatureFlagTable();
  await pool.query(
    `INSERT INTO automation_feature_flags (key, enabled, metadata, updated_at)
     VALUES ($1, $2, $3::jsonb, NOW())
     ON CONFLICT (key) DO UPDATE
       SET enabled = EXCLUDED.enabled,
           metadata = COALESCE(automation_feature_flags.metadata, '{}'::jsonb) || EXCLUDED.metadata,
           updated_at = NOW()`,
    [FEATURE_FLAG_KEY, enabled, JSON.stringify({ source, changedAt: new Date().toISOString() })],
  );
  return isPeptidesPreviewFollowupEnabled();
}

export type PeptidesPreviewFollowupCandidate = {
  leadId: string;
  email: string;
  firstName: string;
  capturedAt: string;
  stage: PeptidesPreviewFollowupStage;
  result: Record<string, any>;
  attribution: Record<string, unknown>;
};

type PreviewLeadRow = {
  id: string;
  email: string;
  captured_at: Date | string;
  responses: Record<string, any>;
  tracking: PeptidesPreviewFollowupTracking[] | null;
};

export type PeptidesPreviewFollowupRun = {
  success: boolean;
  dryRun: boolean;
  enabled: boolean;
  eligible: number;
  selected: number;
  sent: number;
  failed: number;
  skipped: number;
  reconcileRequired: number;
  byStage: Record<PeptidesPreviewFollowupStage, number>;
  candidates: Array<Pick<PeptidesPreviewFollowupCandidate, "leadId" | "email" | "stage" | "capturedAt">>;
};

function isWithinParisWindow(now = new Date()): boolean {
  const hour = Number(new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Paris",
    hour: "2-digit",
    hourCycle: "h23",
  }).format(now));
  return hour >= 8 && hour < 21;
}

function mapCandidate(row: PreviewLeadRow, now: Date): PeptidesPreviewFollowupCandidate | null {
  const responses = row.responses || {};
  const input = responses.previewInput || responses;
  const result = responses.previewResult;
  const capturedAt = new Date(row.captured_at);
  const tracking = Array.isArray(row.tracking) ? row.tracking : [];
  const stage = choosePeptidesPreviewFollowupStage(capturedAt, tracking, now);
  const email = normalizePreviewFollowupEmail(input?.email || row.email.replace(/^peptides-preview::/i, ""));
  if (!stage || !isEligiblePreviewFollowupEmail(email) || !result || input?.consent !== true) return null;
  if (responses.previewNotifications?.clientEmailSent !== true) return null;
  return {
    leadId: row.id,
    email,
    firstName: String(input.firstName || "").trim() || "Salut",
    capturedAt: capturedAt.toISOString(),
    stage,
    result,
    attribution: input.attribution && typeof input.attribution === "object" ? input.attribution : {},
  };
}

async function loadCandidates(now: Date): Promise<PeptidesPreviewFollowupCandidate[]> {
  const rows = await pool.query<PreviewLeadRow>(
    `SELECT bp.id,
            bp.email,
            COALESCE(NULLIF(bp.responses->>'capturedAt', '')::timestamptz, bp.last_activity_at) AS captured_at,
            bp.responses,
            COALESCE((
              SELECT jsonb_agg(jsonb_build_object(
                'emailType', et.email_type,
                'sentAt', et.sent_at,
                'sendpulseStatus', et.sendpulse_status,
                'sendpulseTaskId', et.sendpulse_task_id
              ) ORDER BY et.sent_at DESC)
                FROM email_tracking et
               WHERE LOWER(et.recipient_email) = LOWER(REPLACE(bp.email, 'peptides-preview::', ''))
                 AND et.email_type LIKE 'peptidesPreviewFollowup%'
            ), '[]'::jsonb) AS tracking
       FROM burnout_progress bp
      WHERE bp.email LIKE 'peptides-preview::%'
        AND bp.responses->>'previewStatus' = 'completed'
        AND bp.responses->'previewNotifications'->>'clientEmailSent' = 'true'
        AND COALESCE(NULLIF(bp.responses->>'capturedAt', '')::timestamptz, bp.last_activity_at) >= $1::timestamptz
        AND COALESCE(NULLIF(bp.responses->>'capturedAt', '')::timestamptz, bp.last_activity_at) <= $2::timestamptz - INTERVAL '24 hours'
        AND NOT EXISTS (
          SELECT 1 FROM email_unsubscribes eu
           WHERE LOWER(eu.email) = LOWER(REPLACE(bp.email, 'peptides-preview::', ''))
        )
        AND NOT EXISTS (
          SELECT 1 FROM orders o
           WHERE LOWER(o.email) = LOWER(REPLACE(bp.email, 'peptides-preview::', ''))
             AND o.product_type = 'PEPTIDES_ENGINE'
             AND (
               LOWER(o.status) IN ('paid', 'partial_refund')
               OR (
                 LOWER(o.status) = 'pending'
                 AND o.created_at >= COALESCE(NULLIF(bp.responses->>'capturedAt', '')::timestamptz, bp.last_activity_at)
               )
             )
        )
        AND NOT EXISTS (
          SELECT 1 FROM email_tracking blocked
           WHERE LOWER(blocked.recipient_email) = LOWER(REPLACE(bp.email, 'peptides-preview::', ''))
             AND (
               LOWER(COALESCE(blocked.sendpulse_status, '')) IN ('unsubscribed', 'auth_failed')
               OR LOWER(COALESCE(blocked.sendpulse_error, '')) LIKE ANY(ARRAY['%unsubscribe%', '%spam%', '%bounce%'])
             )
        )
        AND NOT EXISTS (
          SELECT 1 FROM email_tracking tracked
           WHERE LOWER(tracked.recipient_email) = LOWER(REPLACE(bp.email, 'peptides-preview::', ''))
             AND EXISTS (
               SELECT 1 FROM cta_tracking ct
                WHERE ct.email_tracking_id = tracked.id
                  AND ct.event_type IN ('unsubscribe', 'spam', 'bounce')
             )
        )
        AND NOT EXISTS (
          SELECT 1 FROM email_tracking completed
           WHERE LOWER(completed.recipient_email) = LOWER(REPLACE(bp.email, 'peptides-preview::', ''))
             AND completed.email_type = 'peptidesPreviewFollowupJ7'
             AND (
               completed.sendpulse_task_id IS NOT NULL
               OR LOWER(COALESCE(completed.sendpulse_status, '')) IN ('success', 'sent', 'delivered')
             )
        )
        AND NOT EXISTS (
          SELECT 1 FROM email_tracking unresolved
           WHERE LOWER(unresolved.recipient_email) = LOWER(REPLACE(bp.email, 'peptides-preview::', ''))
             AND unresolved.email_type LIKE 'peptidesPreviewFollowup%'
             AND LOWER(COALESCE(unresolved.sendpulse_status, '')) = 'pending'
        )
      ORDER BY captured_at ASC
      LIMIT 500`,
    [PEPTIDES_PREVIEW_FOLLOWUP_START_AT, now.toISOString()],
  );
  return rows.rows.map((row) => mapCandidate(row, now)).filter((row): row is PeptidesPreviewFollowupCandidate => Boolean(row));
}

async function candidateStillEligible(candidate: PeptidesPreviewFollowupCandidate, client: PoolClient): Promise<boolean> {
  const result = await client.query<{ eligible: boolean }>(
    `SELECT NOT EXISTS (
        SELECT 1 FROM orders o
         WHERE LOWER(o.email) = LOWER($1)
           AND o.product_type = 'PEPTIDES_ENGINE'
           AND (
             LOWER(o.status) IN ('paid', 'partial_refund')
             OR (LOWER(o.status) = 'pending' AND o.created_at >= $3::timestamptz)
           )
      )
      AND NOT EXISTS (
        SELECT 1 FROM email_unsubscribes eu WHERE LOWER(eu.email) = LOWER($1)
      )
      AND NOT EXISTS (
        SELECT 1 FROM email_tracking et
         WHERE LOWER(et.recipient_email) = LOWER($1)
           AND et.email_type = $2
           AND (
             et.sendpulse_task_id IS NOT NULL
             OR LOWER(COALESCE(et.sendpulse_status, '')) IN ('success', 'sent', 'delivered', 'pending')
             OR (
               LOWER(COALESCE(et.sendpulse_status, '')) = 'failed'
               AND et.sent_at >= NOW() - INTERVAL '2 hours'
             )
           )
      )
      AND NOT EXISTS (
        SELECT 1 FROM email_tracking blocked
         WHERE LOWER(blocked.recipient_email) = LOWER($1)
           AND (
             LOWER(COALESCE(blocked.sendpulse_status, '')) IN ('unsubscribed', 'auth_failed')
             OR LOWER(COALESCE(blocked.sendpulse_error, '')) LIKE ANY(ARRAY['%unsubscribe%', '%spam%', '%bounce%'])
           )
      )
      AND NOT EXISTS (
        SELECT 1 FROM email_tracking tracked
         WHERE LOWER(tracked.recipient_email) = LOWER($1)
           AND EXISTS (
             SELECT 1 FROM cta_tracking ct
              WHERE ct.email_tracking_id = tracked.id
                AND ct.event_type IN ('unsubscribe', 'spam', 'bounce')
           )
      ) AS eligible`,
    [candidate.email, `peptidesPreviewFollowup${candidate.stage}`, candidate.capturedAt],
  );
  return result.rows[0]?.eligible === true;
}

async function sendCandidate(candidate: PeptidesPreviewFollowupCandidate): Promise<"sent" | "failed" | "skipped" | "reconcileRequired"> {
  const key = `${ADVISORY_LOCK_PREFIX}:${candidate.email}:${candidate.stage}`;
  const client = await pool.connect();
  let locked = false;
  try {
    const lock = await client.query<{ locked: boolean }>("SELECT pg_try_advisory_lock(hashtextextended($1, 0)) AS locked", [key]);
    locked = lock.rows[0]?.locked === true;
    if (!locked || !(await candidateStillEligible(candidate, client))) return "skipped";

    const emailType = `peptidesPreviewFollowup${candidate.stage}`;
    const claimId = randomUUID();
    await client.query(
      `INSERT INTO email_tracking
        (id, audit_id, audit_type, email_type, recipient_email, recipient_name, sendpulse_status, metadata, sent_at, created_at)
       VALUES ($1, $2, 'PEPTIDES_PREVIEW', $3, $4, $5, 'pending', $6::jsonb, NOW(), NOW())`,
      [claimId, candidate.leadId, emailType, candidate.email, candidate.firstName, JSON.stringify({
        previewFollowupClaim: true,
        stage: candidate.stage,
        capturedAt: candidate.capturedAt,
        deliveryState: "provider_outcome_unknown",
      })],
    );

    let sent = false;
    try {
      const delivery = await sendPeptidesPreviewFollowupEmail({
        stage: candidate.stage,
        leadId: candidate.leadId,
        email: candidate.email,
        firstName: candidate.firstName,
        result: candidate.result,
        attribution: candidate.attribution,
      });
      const providerOutcome = classifyPeptidesPreviewProviderOutcome(delivery);
      sent = providerOutcome === "success";
      const reconcileRequired = providerOutcome === "reconcile_required";
      await client.query(
        `UPDATE email_tracking
            SET sendpulse_status = $2,
                sendpulse_error = $3,
                metadata = COALESCE(metadata, '{}'::jsonb) || $4::jsonb
          WHERE id = $1`,
        [claimId, sent ? "success" : reconcileRequired ? "pending" : "failed", sent ? null : reconcileRequired ? "provider_outcome_unknown" : "provider_send_failed", JSON.stringify({
          deliveryState: sent ? "accepted" : reconcileRequired ? "reconcile_required" : "confirmed_failed",
          providerHttpStatus: delivery.httpStatus ?? null,
          providerError: delivery.error == null ? null : String(delivery.error),
          completedAt: new Date().toISOString(),
        })],
      );
      if (reconcileRequired) return "reconcileRequired";
    } catch (error) {
      await client.query(
        `UPDATE email_tracking
            SET sendpulse_status = 'pending',
                sendpulse_error = $2,
                metadata = COALESCE(metadata, '{}'::jsonb) || $3::jsonb
          WHERE id = $1`,
        [claimId, error instanceof Error ? error.message : String(error), JSON.stringify({
          deliveryState: "reconcile_required",
          providerOutcomeUnknown: true,
          completedAt: new Date().toISOString(),
        })],
      ).catch(() => undefined);
      return "reconcileRequired";
    }
    if (!sent) return "failed";

    const sentAt = new Date().toISOString();
    await client.query(
      `UPDATE burnout_progress
          SET responses = jsonb_set(
            responses,
            '{previewFollowups}',
            COALESCE(responses->'previewFollowups', '{}'::jsonb) || $2::jsonb,
            true
          ),
              last_activity_at = NOW()
        WHERE id = $1`,
      [candidate.leadId, JSON.stringify({
        [candidate.stage]: { sentAt, emailType },
      })],
    );
    return "sent";
  } finally {
    if (locked) await client.query("SELECT pg_advisory_unlock(hashtextextended($1, 0))", [key]).catch(() => undefined);
    client.release();
  }
}

export async function processPeptidesPreviewFollowups(options: {
  dryRun?: boolean;
  maxToSend?: number;
  now?: Date;
  knownEnabled?: boolean;
} = {}): Promise<PeptidesPreviewFollowupRun> {
  const now = options.now || new Date();
  const dryRun = options.dryRun !== false;
  const enabled = options.knownEnabled ?? await isPeptidesPreviewFollowupEnabled();
  const maxToSend = Math.min(Math.max(Number(options.maxToSend) || 3, 1), 25);
  const candidates = await loadCandidates(now);
  const selected = candidates.slice(0, maxToSend);
  const byStage = { J1: 0, J3: 0, J7: 0 };
  candidates.forEach((candidate) => { byStage[candidate.stage] += 1; });
  const summary: PeptidesPreviewFollowupRun = {
    success: true,
    dryRun,
    enabled,
    eligible: candidates.length,
    selected: selected.length,
    sent: 0,
    failed: 0,
    skipped: 0,
    reconcileRequired: 0,
    byStage,
    candidates: selected.map(({ leadId, email, stage, capturedAt }) => ({ leadId, email, stage, capturedAt })),
  };
  if (dryRun) return summary;
  if (!enabled) throw new Error("PEPTIDES_PREVIEW_FOLLOWUP_DISABLED");
  if (!isWithinParisWindow(now)) throw new Error("PEPTIDES_PREVIEW_FOLLOWUP_OUTSIDE_PARIS_WINDOW");

  for (const candidate of selected) {
    const outcome = await sendCandidate(candidate).catch((error) => {
      console.error("[PeptidesPreviewFollowup] send failed", candidate.leadId, candidate.stage, error instanceof Error ? error.message : error);
      return "failed" as const;
    });
    summary[outcome] += 1;
    if (outcome === "sent") await new Promise((resolve) => setTimeout(resolve, 750));
  }
  return summary;
}

export function startPeptidesPreviewFollowupWorker(): void {
  if (workerStarted) return;
  workerStarted = true;
  const run = async () => {
    if (workerRunning || !isWithinParisWindow()) return;
    if (!(await isPeptidesPreviewFollowupEnabled())) return;
    workerRunning = true;
    try {
      const maxToSend = Number(process.env.PEPTIDES_PREVIEW_FOLLOWUP_MAX_PER_TICK || 3);
      const result = await processPeptidesPreviewFollowups({ dryRun: false, maxToSend, knownEnabled: true });
      if (result.sent || result.failed || result.reconcileRequired) console.log("[PeptidesPreviewFollowup]", result);
    } catch (error) {
      console.error("[PeptidesPreviewFollowup] worker failed", error instanceof Error ? error.message : error);
    } finally {
      workerRunning = false;
    }
  };
  const timer = setInterval(() => void run(), WORKER_INTERVAL_MS);
  timer.unref();
  void isPeptidesPreviewFollowupEnabled()
    .then((enabled) => console.log(`[PeptidesPreviewFollowup] worker registered every ${WORKER_INTERVAL_MS / 60_000}min, enabled=${enabled}`))
    .catch((error) => console.error("[PeptidesPreviewFollowup] feature flag check failed", error instanceof Error ? error.message : error));
}
