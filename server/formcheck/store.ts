/**
 * FormCheck V2 : persistance (crédits, file d'analyses, frames).
 *
 * Machine d'état du crédit d'une analyse :
 *   upload accepté      -> credit_state = reserved (credits_reserved + 1)
 *   rapport livré       -> consumed  (reserved - 1, used + 1)
 *   vidéo rejetée/échec -> released  (reserved - 1)
 * Chaque transition est conditionnée par l'état courant : elle est idempotente.
 */
import { randomUUID } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import { FORMCHECK_MAX_ATTEMPTS } from "./config";

async function getPool(): Promise<Pool> {
  const { pool } = await import("../db");
  return pool;
}

export const normalizeEmail = (email: string) => String(email || "").trim().toLowerCase();

let tablesReady: Promise<void> | null = null;

export const FORMCHECK_DDL = `
CREATE TABLE IF NOT EXISTS formcheck_purchases (
  id varchar(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_session_id varchar(255) NOT NULL UNIQUE,
  stripe_payment_intent_id varchar(255),
  email varchar(255) NOT NULL,
  pack_id varchar(8) NOT NULL,
  credits integer NOT NULL,
  amount_cents integer NOT NULL,
  currency varchar(8) NOT NULL DEFAULT 'eur',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS formcheck_accounts (
  email varchar(255) PRIMARY KEY,
  credits_total integer NOT NULL DEFAULT 0,
  credits_used integer NOT NULL DEFAULT 0,
  credits_reserved integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS formcheck_analyses (
  id varchar(36) PRIMARY KEY,
  email varchar(255) NOT NULL,
  exercise_key varchar(64) NOT NULL,
  exercise_label varchar(120) NOT NULL,
  status varchar(20) NOT NULL DEFAULT 'queued',
  credit_state varchar(20) NOT NULL DEFAULT 'reserved',
  attempts integer NOT NULL DEFAULT 0,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  locked_at timestamptz,
  duration_s real,
  video_meta jsonb,
  result jsonb,
  score integer,
  decision_reason text,
  last_error text,
  model varchar(80),
  response_id varchar(120),
  cost_usd real,
  pdf bytea,
  admin_alerted_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS formcheck_analyses_queue_idx ON formcheck_analyses (status, next_attempt_at);
CREATE INDEX IF NOT EXISTS formcheck_analyses_email_idx ON formcheck_analyses (email, created_at DESC);
CREATE TABLE IF NOT EXISTS formcheck_frames (
  analysis_id varchar(36) NOT NULL REFERENCES formcheck_analyses(id) ON DELETE CASCADE,
  frame_index integer NOT NULL,
  timestamp_s real NOT NULL,
  jpeg bytea NOT NULL,
  annotated bytea,
  PRIMARY KEY (analysis_id, frame_index)
);
`;

export function ensureFormcheckTables(): Promise<void> {
  if (!tablesReady) {
    tablesReady = (async () => {
      const pool = await getPool();
      await pool.query(FORMCHECK_DDL);
    })().catch((error) => {
      tablesReady = null;
      throw error;
    });
  }
  return tablesReady;
}

async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  await ensureFormcheckTables();
  const pool = await getPool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

// ---------------------------------------------------------------------------
// Achats et crédits
// ---------------------------------------------------------------------------

export interface GrantInput {
  stripeSessionId: string;
  paymentIntentId: string | null;
  email: string;
  packId: string;
  credits: number;
  amountCents: number;
  currency: string;
}

/** Attribue les crédits une seule fois par session Stripe (webhook et page de retour peuvent se croiser). */
export async function grantFormcheckCredits(input: GrantInput): Promise<{ granted: boolean }> {
  const email = normalizeEmail(input.email);
  if (!email || !input.stripeSessionId || input.credits <= 0) throw new Error("FORMCHECK_GRANT_INVALID");
  return withTransaction(async (client) => {
    const inserted = await client.query(
      `INSERT INTO formcheck_purchases (stripe_session_id, stripe_payment_intent_id, email, pack_id, credits, amount_cents, currency)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (stripe_session_id) DO NOTHING
       RETURNING id`,
      [input.stripeSessionId, input.paymentIntentId, email, input.packId, input.credits, input.amountCents, input.currency || "eur"],
    );
    if (!inserted.rowCount) return { granted: false };
    await client.query(
      `INSERT INTO formcheck_accounts (email, credits_total) VALUES ($1, $2)
       ON CONFLICT (email) DO UPDATE SET credits_total = formcheck_accounts.credits_total + EXCLUDED.credits_total, updated_at = now()`,
      [email, input.credits],
    );
    return { granted: true };
  });
}

export interface FormcheckBalance { total: number; used: number; reserved: number; available: number }

export async function getFormcheckBalance(emailRaw: string): Promise<FormcheckBalance> {
  await ensureFormcheckTables();
  const pool = await getPool();
  const row = (await pool.query(
    `SELECT credits_total, credits_used, credits_reserved FROM formcheck_accounts WHERE email = $1`,
    [normalizeEmail(emailRaw)],
  )).rows[0];
  const total = Number(row?.credits_total || 0);
  const used = Number(row?.credits_used || 0);
  const reserved = Number(row?.credits_reserved || 0);
  return { total, used, reserved, available: Math.max(0, total - used - reserved) };
}

export async function hasFormcheckPurchase(emailRaw: string): Promise<boolean> {
  await ensureFormcheckTables();
  const pool = await getPool();
  const r = await pool.query(`SELECT 1 FROM formcheck_purchases WHERE email = $1 LIMIT 1`, [normalizeEmail(emailRaw)]);
  return Boolean(r.rowCount);
}

// ---------------------------------------------------------------------------
// Analyses
// ---------------------------------------------------------------------------

export interface NewAnalysisInput {
  email: string;
  exerciseKey: string;
  exerciseLabel: string;
  durationS: number;
  videoMeta: Record<string, unknown>;
  frames: Array<{ index: number; timestampS: number; jpeg: Buffer }>;
}

/** Réserve un crédit et met l'analyse en file. Retourne null si aucun crédit disponible. */
export async function reserveCreditAndEnqueue(input: NewAnalysisInput): Promise<string | null> {
  const email = normalizeEmail(input.email);
  return withTransaction(async (client) => {
    const account = (await client.query(
      `SELECT credits_total, credits_used, credits_reserved FROM formcheck_accounts WHERE email = $1 FOR UPDATE`,
      [email],
    )).rows[0];
    const available = account
      ? Number(account.credits_total) - Number(account.credits_used) - Number(account.credits_reserved)
      : 0;
    if (available < 1) return null;
    const id = randomUUID();
    await client.query(
      `UPDATE formcheck_accounts SET credits_reserved = credits_reserved + 1, updated_at = now() WHERE email = $1`,
      [email],
    );
    await client.query(
      `INSERT INTO formcheck_analyses (id, email, exercise_key, exercise_label, duration_s, video_meta)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, email, input.exerciseKey, input.exerciseLabel, input.durationS, JSON.stringify(input.videoMeta)],
    );
    for (const frame of input.frames) {
      await client.query(
        `INSERT INTO formcheck_frames (analysis_id, frame_index, timestamp_s, jpeg) VALUES ($1, $2, $3, $4)`,
        [id, frame.index, frame.timestampS, frame.jpeg],
      );
    }
    return id;
  });
}

async function settleCredit(analysisId: string, target: "consumed" | "released", status: string, fields: Record<string, unknown>): Promise<boolean> {
  const keys = Object.keys(fields);
  const extraSets = (offset: number) => keys.map((key, i) => `, ${key} = $${i + offset}`).join("");
  return withTransaction(async (client) => {
    const updated = await client.query(
      `UPDATE formcheck_analyses
          SET credit_state = $2, status = $3, locked_at = NULL, updated_at = now()${extraSets(4)}
        WHERE id = $1 AND credit_state = 'reserved'
        RETURNING email`,
      [analysisId, target, status, ...Object.values(fields)],
    );
    if (!updated.rowCount) {
      // Crédit déjà réglé (double passage) : on ne touche pas au solde.
      await client.query(
        `UPDATE formcheck_analyses SET status = $2, locked_at = NULL, updated_at = now()${extraSets(3)} WHERE id = $1 AND status <> 'delivered'`,
        [analysisId, status, ...Object.values(fields)],
      );
      return false;
    }
    const email = updated.rows[0].email;
    await client.query(
      target === "consumed"
        ? `UPDATE formcheck_accounts SET credits_reserved = GREATEST(0, credits_reserved - 1), credits_used = credits_used + 1, updated_at = now() WHERE email = $1`
        : `UPDATE formcheck_accounts SET credits_reserved = GREATEST(0, credits_reserved - 1), updated_at = now() WHERE email = $1`,
      [email],
    );
    return true;
  });
}

export const markDeliveredAndConsume = (analysisId: string) =>
  settleCredit(analysisId, "consumed", "delivered", { delivered_at: new Date() });

export const markRejectedAndRelease = (analysisId: string, reason: string) =>
  settleCredit(analysisId, "released", "rejected", { decision_reason: reason });

export const markNeedsReviewAndRelease = (analysisId: string, reason: string) =>
  settleCredit(analysisId, "released", "needs_review", { decision_reason: reason, admin_alerted_at: new Date() });

export interface ClaimedAnalysis {
  id: string;
  email: string;
  exercise_key: string;
  exercise_label: string;
  attempts: number;
  duration_s: number;
  result: any;
  model: string | null;
  response_id: string | null;
  cost_usd: number | null;
  pdf: Buffer | null;
}

/** Prend la prochaine analyse due (ou une analyse bloquée en processing depuis 20 min). */
export async function claimNextAnalysis(): Promise<ClaimedAnalysis | null> {
  return withTransaction(async (client) => {
    const row = (await client.query(
      `UPDATE formcheck_analyses
          SET status = 'processing', locked_at = now(), attempts = attempts + 1, updated_at = now()
        WHERE id = (
          SELECT id FROM formcheck_analyses
           WHERE credit_state = 'reserved'
             AND attempts < $1
             AND ((status IN ('queued', 'retry') AND next_attempt_at <= now())
               OR (status = 'processing' AND locked_at < now() - interval '20 minutes'))
           ORDER BY next_attempt_at ASC
           FOR UPDATE SKIP LOCKED
           LIMIT 1)
        RETURNING id, email, exercise_key, exercise_label, attempts, duration_s, result, model, response_id, cost_usd, pdf`,
      [FORMCHECK_MAX_ATTEMPTS],
    )).rows[0];
    return row ? { ...row, duration_s: Number(row.duration_s) } : null;
  });
}

/** Analyses bloquées : toutes les tentatives consommées sans issue (crash pendant la dernière). */
export async function listExhaustedAnalyses(): Promise<Array<{ id: string; email: string; exercise_label: string; last_error: string | null }>> {
  await ensureFormcheckTables();
  const pool = await getPool();
  return (await pool.query(
    `SELECT id, email, exercise_label, last_error FROM formcheck_analyses
      WHERE credit_state = 'reserved' AND attempts >= $1
        AND (status IN ('queued', 'retry') OR (status = 'processing' AND locked_at < now() - interval '20 minutes'))
      LIMIT 20`,
    [FORMCHECK_MAX_ATTEMPTS],
  )).rows;
}

export async function scheduleRetry(analysisId: string, delayMs: number, error: string): Promise<void> {
  const pool = await getPool();
  await pool.query(
    `UPDATE formcheck_analyses
        SET status = 'retry', locked_at = NULL, last_error = $2,
            next_attempt_at = now() + ($3::text || ' milliseconds')::interval, updated_at = now()
      WHERE id = $1`,
    [analysisId, error.slice(0, 2000), String(Math.round(delayMs))],
  );
}

export async function saveAnalysisResult(analysisId: string, data: {
  result: unknown; score: number; model: string; responseId: string; costUsd: number | null;
}): Promise<void> {
  const pool = await getPool();
  await pool.query(
    `UPDATE formcheck_analyses SET result = $2, score = $3, model = $4, response_id = $5, cost_usd = $6, updated_at = now() WHERE id = $1`,
    [analysisId, JSON.stringify(data.result), data.score, data.model, data.responseId, data.costUsd],
  );
}

export async function savePdf(analysisId: string, pdf: Buffer): Promise<void> {
  const pool = await getPool();
  await pool.query(`UPDATE formcheck_analyses SET pdf = $2, updated_at = now() WHERE id = $1`, [analysisId, pdf]);
}

export async function loadFrames(analysisId: string): Promise<Array<{ index: number; timestampS: number; jpeg: Buffer; annotated: Buffer | null }>> {
  const pool = await getPool();
  const rows = (await pool.query(
    `SELECT frame_index, timestamp_s, jpeg, annotated FROM formcheck_frames WHERE analysis_id = $1 ORDER BY frame_index`,
    [analysisId],
  )).rows;
  return rows.map((r: any) => ({ index: Number(r.frame_index), timestampS: Number(r.timestamp_s), jpeg: r.jpeg, annotated: r.annotated }));
}

export async function saveAnnotatedFrame(analysisId: string, index: number, annotated: Buffer): Promise<void> {
  const pool = await getPool();
  await pool.query(
    `UPDATE formcheck_frames SET annotated = $3 WHERE analysis_id = $1 AND frame_index = $2`,
    [analysisId, index, annotated],
  );
}

export async function listAnalysesForEmail(emailRaw: string) {
  await ensureFormcheckTables();
  const pool = await getPool();
  return (await pool.query(
    `SELECT id, exercise_label, status, score, decision_reason, created_at, delivered_at
       FROM formcheck_analyses WHERE email = $1 ORDER BY created_at DESC LIMIT 30`,
    [normalizeEmail(emailRaw)],
  )).rows;
}

export async function getAnalysisForEmail(id: string, emailRaw: string) {
  await ensureFormcheckTables();
  const pool = await getPool();
  return (await pool.query(
    `SELECT id, email, exercise_label, status, score, decision_reason, created_at, delivered_at, pdf
       FROM formcheck_analyses WHERE id = $1 AND email = $2`,
    [id, normalizeEmail(emailRaw)],
  )).rows[0] || null;
}

export async function getFormcheckOpsStats(sinceHours = 6) {
  await ensureFormcheckTables();
  const pool = await getPool();
  const row = (await pool.query(
    `SELECT
       count(*) FILTER (WHERE created_at > now() - ($1::text || ' hours')::interval) AS uploaded,
       count(*) FILTER (WHERE status = 'delivered' AND delivered_at > now() - ($1::text || ' hours')::interval) AS delivered,
       count(*) FILTER (WHERE status = 'rejected' AND updated_at > now() - ($1::text || ' hours')::interval) AS rejected,
       count(*) FILTER (WHERE status = 'needs_review') AS needs_review,
       count(*) FILTER (WHERE status IN ('queued', 'retry', 'processing')) AS pending,
       (SELECT count(*) FROM formcheck_purchases WHERE created_at > now() - ($1::text || ' hours')::interval) AS purchases,
       (SELECT COALESCE(sum(amount_cents), 0) FROM formcheck_purchases WHERE created_at > now() - ($1::text || ' hours')::interval) AS revenue_cents
     FROM formcheck_analyses`,
    [String(sinceHours)],
  )).rows[0];
  return Object.fromEntries(Object.entries(row || {}).map(([k, v]) => [k, Number(v || 0)])) as Record<string, number>;
}
