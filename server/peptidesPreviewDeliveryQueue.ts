import { pool } from "./db";
import type { PoolClient } from "pg";
import {
  sendPeptidesPreviewAdminNotification,
  sendPeptidesPreviewResultEmail,
} from "./emailService";

const POLL_MS = 15_000;
const MAX_ATTEMPTS = 3;
const BATCH_SIZE = 3;
const ADVISORY_LOCK_KEY = 781_157_119;

let started = false;
let running = false;

function nextRetryAt(attempts: number): string {
  const delayMs = Math.min(15 * 60_000, 60_000 * 2 ** Math.max(0, attempts - 1));
  return new Date(Date.now() + delayMs).toISOString();
}

async function deliverOne(row: { id: string; responses: Record<string, any> }, client: PoolClient): Promise<void> {
  const responses = row.responses || {};
  const input = responses.previewInput || responses;
  const result = responses.previewResult;
  const notifications = responses.previewNotifications || {};
  const submissionId = String(notifications.submissionId || responses.previewHistory?.at(-1)?.submissionId || "");
  if (!input?.email || !input?.firstName || !result || !submissionId) return;

  let clientEmailSent = notifications.clientEmailSent === true;
  let adminEmailSent = notifications.adminEmailSent === true;
  const attempt = Number(notifications.backgroundAttempts || 0) + 1;

  if (!clientEmailSent) {
    clientEmailSent = await sendPeptidesPreviewResultEmail(
      input,
      result,
      row.id,
    ).catch((error) => {
      console.error("[PeptidesPreviewQueue] client delivery failed", error instanceof Error ? error.message : "unknown_error");
      return false;
    });
  }

  if (!adminEmailSent) {
    adminEmailSent = await sendPeptidesPreviewAdminNotification(input, result, row.id, clientEmailSent).catch((error) => {
      console.error("[PeptidesPreviewQueue] admin delivery failed", error instanceof Error ? error.message : "unknown_error");
      return false;
    });
  }

  const sent = clientEmailSent && adminEmailSent;
  const exhausted = !sent && attempt >= MAX_ATTEMPTS;
  const attemptedAt = new Date().toISOString();
  const updatedNotifications = {
    ...notifications,
    attemptedAt,
    clientEmailSent,
    adminEmailSent,
    backgroundAttempts: attempt,
    deliveryState: sent ? "sent" : exhausted ? "failed" : "retry_scheduled",
    nextRetryAt: sent || exhausted ? null : nextRetryAt(attempt),
  };
  const history = Array.isArray(responses.previewHistory) ? responses.previewHistory : [];
  const updatedHistory = history.map((entry: Record<string, any>) => entry.submissionId === submissionId ? {
    ...entry,
    notificationStatus: updatedNotifications.deliveryState,
    clientEmailSent,
    adminEmailSent,
    backgroundAttempts: attempt,
    attemptedAt,
  } : entry);

  await client.query(
    `UPDATE burnout_progress
       SET responses = $1
     WHERE id = $2`,
    [{ ...responses, previewNotifications: updatedNotifications, previewHistory: updatedHistory }, row.id],
  );
  console.log(`[PeptidesPreviewQueue] ${updatedNotifications.deliveryState} lead=${row.id} submission=${submissionId} attempts=${attempt}`);
}

export async function processPeptidesPreviewDeliveryQueue(): Promise<void> {
  if (running) return;
  running = true;
  let client: PoolClient | null = null;
  let lockAcquired = false;
  try {
    client = await pool.connect();
    const lock = await client.query<{ locked: boolean }>("SELECT pg_try_advisory_lock($1) AS locked", [ADVISORY_LOCK_KEY]);
    lockAcquired = lock.rows[0]?.locked === true;
    if (!lockAcquired) return;
    const pending = await client.query<{ id: string; responses: Record<string, any> }>(
      `SELECT id, responses
         FROM burnout_progress
        WHERE email LIKE 'peptides-preview::%'
          AND COALESCE(responses->'previewNotifications'->>'deliveryState', 'queued') IN ('queued', 'retry_scheduled')
          AND COALESCE((responses->'previewNotifications'->>'backgroundAttempts')::int, 0) < $1
          AND (
            responses->'previewNotifications'->>'nextRetryAt' IS NULL
            OR (responses->'previewNotifications'->>'nextRetryAt')::timestamptz <= NOW()
          )
        ORDER BY id
        LIMIT $2`,
      [MAX_ATTEMPTS, BATCH_SIZE],
    );
    for (const row of pending.rows) await deliverOne(row, client);
  } catch (error) {
    console.error("[PeptidesPreviewQueue] worker failed", error instanceof Error ? error.message : "unknown_error");
  } finally {
    if (lockAcquired && client) await client.query("SELECT pg_advisory_unlock($1)", [ADVISORY_LOCK_KEY]).catch(() => undefined);
    client?.release();
    running = false;
  }
}

export function kickPeptidesPreviewDeliveryQueue(): void {
  setImmediate(() => void processPeptidesPreviewDeliveryQueue());
}

export function startPeptidesPreviewDeliveryWorker(): void {
  if (started) return;
  started = true;
  const timer = setInterval(() => void processPeptidesPreviewDeliveryQueue(), POLL_MS);
  timer.unref();
  console.log(`[PeptidesPreviewQueue] worker started every ${POLL_MS / 1000}s, max attempts=${MAX_ATTEMPTS}`);
}
