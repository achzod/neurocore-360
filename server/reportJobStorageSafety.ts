import type { Pool, PoolClient } from "pg";

import {
  getDiscoveryAutomationStartAt,
  isDiscoveryTransactionalAutomationEligible,
} from "./discoveryAutomationPolicy";
import { DISCOVERY_TRANSACTION_FENCE_KEY } from "./discoveryTransactionalPersistence";
import { DISCOVERY_SUPERSEDED_TERMINAL_SQL } from "./discoverySupersededPolicy";
import { runGenericAuditMutation } from "./discoveryGenericMutationBarrier";

type PoolLike = Pick<Pool, "connect" | "query">;

export const DISCOVERY_REPORT_JOB_MUTATION_BLOCKED =
  "DISCOVERY_REPORT_JOB_REQUIRES_TRANSACTIONAL_WORKFLOW";

interface GenericReportJobInput {
  auditId: string;
  status?: string;
  progress?: number;
  currentSection?: string;
  error?: string | null;
  attemptCount?: number;
  completedAt?: string | Date | null;
}

interface DiscoveryRecoveryAuditRow {
  id: string;
  type: string;
  email: string;
  created_at: string | Date;
  responses: unknown;
  report_delivery_status: string | null;
  report_sent_at: string | Date | null;
  narrative_report: unknown;
  report_txt: string | null;
  report_html: string | null;
}

interface GenericReportArtifactInput {
  id: string;
  auditId: string;
  tier: string;
  engine: string;
  model: string;
  txt: string;
  html: string;
  createdAt: Date;
}

function jsonParameter(value: unknown): string | null {
  return value == null ? null : JSON.stringify(value);
}

export async function listActiveGenericReportJobRows(pool: PoolLike): Promise<any[]> {
  const result = await pool.query(
    `SELECT j.*
       FROM report_jobs j
       LEFT JOIN audits a ON a.id = j.audit_id
      WHERE j.status IN ('pending', 'generating')
        AND (a.id IS NULL OR a.type <> 'GRATUIT')`,
  );
  return result.rows;
}

export async function insertGenericReportArtifactFenced(
  pool: PoolLike,
  input: GenericReportArtifactInput,
): Promise<void> {
  if (input.tier === "GRATUIT") {
    throw new Error("DISCOVERY_ARTIFACT_REQUIRES_TRANSACTIONAL_PERSISTENCE");
  }
  await runGenericAuditMutation({
    auditId: input.auditId,
    operation: "storage.createReportArtifact",
    mutate: async (client) => {
      const inserted = await client.query(
        `INSERT INTO report_artifacts
           (id, audit_id, tier, engine, model, txt, html, created_at)
         SELECT $1, a.id, $3, $4, $5, $6, $7, $8
           FROM audits a
          WHERE a.id = $2
            AND a.type <> 'GRATUIT'
            AND $3 <> 'GRATUIT'
         RETURNING id`,
        [
          input.id,
          input.auditId,
          input.tier,
          input.engine,
          input.model,
          input.txt,
          input.html,
          input.createdAt,
        ],
      );
      if ((inserted.rowCount ?? 0) !== 1) {
        throw new Error("GENERIC_REPORT_ARTIFACT_INSERT_BLOCKED");
      }
    },
  }, pool);
}

export async function upsertGenericReportJobRow(
  pool: PoolLike,
  job: GenericReportJobInput,
): Promise<any> {
  const result = await pool.query(
    `INSERT INTO report_jobs AS existing
       (audit_id, status, progress, current_section, error, attempt_count, completed_at)
     SELECT a.id, $2, $3, $4, $5, $6, $7
       FROM audits a
      WHERE a.id = $1
        AND a.type <> 'GRATUIT'
     ON CONFLICT (audit_id) DO UPDATE SET
       status = CASE WHEN $8::boolean THEN EXCLUDED.status ELSE existing.status END,
       progress = CASE WHEN $9::boolean THEN EXCLUDED.progress ELSE existing.progress END,
       current_section = CASE WHEN $10::boolean THEN EXCLUDED.current_section ELSE existing.current_section END,
       error = CASE WHEN $11::boolean THEN EXCLUDED.error ELSE existing.error END,
       attempt_count = CASE WHEN $12::boolean THEN EXCLUDED.attempt_count ELSE existing.attempt_count END,
       completed_at = CASE WHEN $13::boolean THEN EXCLUDED.completed_at ELSE existing.completed_at END,
       updated_at = NOW(),
       last_progress_at = NOW()
     WHERE EXISTS (
       SELECT 1 FROM audits a
        WHERE a.id = existing.audit_id
          AND a.type <> 'GRATUIT'
     )
     RETURNING existing.*`,
    [
      job.auditId,
      job.status ?? "pending",
      job.progress ?? 0,
      job.currentSection ?? "Initialisation...",
      job.error ?? null,
      job.attemptCount ?? 0,
      job.completedAt ?? null,
      job.status !== undefined,
      job.progress !== undefined,
      job.currentSection !== undefined,
      job.error !== undefined,
      job.attemptCount !== undefined,
      job.completedAt !== undefined,
    ],
  );
  if ((result.rowCount ?? 0) !== 1) {
    throw new Error(DISCOVERY_REPORT_JOB_MUTATION_BLOCKED);
  }
  return result.rows[0];
}

export async function updateGenericReportJobProgress(
  pool: PoolLike,
  auditId: string,
  progress: number,
  currentSection: string,
): Promise<void> {
  await pool.query(
    `UPDATE report_jobs AS j
        SET progress = $1, current_section = $2,
            updated_at = NOW(), last_progress_at = NOW()
      WHERE j.audit_id = $3
        AND EXISTS (
          SELECT 1 FROM audits a
           WHERE a.id = j.audit_id AND a.type <> 'GRATUIT'
        )`,
    [progress, currentSection, auditId],
  );
}

export async function completeGenericReportJob(pool: PoolLike, auditId: string): Promise<void> {
  await pool.query(
    `UPDATE report_jobs AS j
        SET status = 'completed', progress = 100,
            current_section = 'Rapport termine !', completed_at = NOW(), updated_at = NOW()
      WHERE j.audit_id = $1
        AND EXISTS (
          SELECT 1 FROM audits a
           WHERE a.id = j.audit_id AND a.type <> 'GRATUIT'
        )`,
    [auditId],
  );
}

export async function failGenericReportJob(
  pool: PoolLike,
  auditId: string,
  error: string,
): Promise<void> {
  await pool.query(
    `UPDATE report_jobs AS j
        SET status = 'failed', error = $1, completed_at = NOW(), updated_at = NOW()
      WHERE j.audit_id = $2
        AND EXISTS (
          SELECT 1 FROM audits a
           WHERE a.id = j.audit_id AND a.type <> 'GRATUIT'
        )`,
    [error, auditId],
  );
}

export async function deleteGenericReportJob(pool: PoolLike, auditId: string): Promise<void> {
  await pool.query(
    `DELETE FROM report_jobs AS j
      WHERE j.audit_id = $1
        AND (
          NOT EXISTS (SELECT 1 FROM audits a WHERE a.id = j.audit_id)
          OR EXISTS (
            SELECT 1 FROM audits a
             WHERE a.id = j.audit_id AND a.type <> 'GRATUIT'
          )
        )`,
    [auditId],
  );
}

async function beginFencedRecovery(client: PoolClient): Promise<string | null> {
  await client.query("BEGIN");
  await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [DISCOVERY_TRANSACTION_FENCE_KEY]);
  const lock = await client.query(
    `SELECT token::text AS token, (expires_at > NOW()) AS active
       FROM discovery_operation_lock
      WHERE lock_key = 'discovery-global'
      LIMIT 1`,
  );
  if (lock.rows[0]?.active) throw new Error("DISCOVERY_GLOBAL_LOCK_ACTIVE");
  return lock.rows[0]?.token ? String(lock.rows[0].token) : null;
}

function isEligibleRecoveryRow(row: DiscoveryRecoveryAuditRow | undefined): row is DiscoveryRecoveryAuditRow {
  return Boolean(row && isDiscoveryTransactionalAutomationEligible({
    type: row.type,
    createdAt: row.created_at,
    reportDeliveryStatus: row.report_delivery_status,
    reportSentAt: row.report_sent_at,
    narrativeReport: row.narrative_report,
  }));
}

export async function enqueueMissingDiscoveryReportJobFenced(
  pool: Pick<Pool, "connect">,
  auditId: string,
  reason: string,
): Promise<boolean> {
  const startAt = getDiscoveryAutomationStartAt();
  if (!startAt) return false;
  const client = await pool.connect();
  try {
    const fenceToken = await beginFencedRecovery(client as PoolClient);
    const selected = await client.query(
      `SELECT id, type, email, created_at, responses, report_delivery_status,
              report_sent_at, narrative_report, report_txt, report_html
         FROM audits
        WHERE id = $1
        FOR UPDATE`,
      [auditId],
    );
    const audit = selected.rows[0] as DiscoveryRecoveryAuditRow | undefined;
    if (!isEligibleRecoveryRow(audit)) {
      await client.query("ROLLBACK");
      return false;
    }
    const metadata = JSON.stringify({
      recovery: {
        version: 1,
        disposition: "enqueued",
        reason,
        decidedAt: new Date().toISOString(),
      },
    });
    const updated = await client.query(
      `UPDATE audits AS a
          SET narrative_report = COALESCE(a.narrative_report, '{}'::jsonb) || $2::jsonb
        WHERE a.id = $1
          AND a.type = 'GRATUIT'
          AND a.created_at >= $3
          AND a.report_delivery_status = 'NEEDS_REVIEW'
          AND a.report_sent_at IS NULL
          AND a.responses IS NOT DISTINCT FROM $4::jsonb
          AND a.narrative_report IS NOT DISTINCT FROM $5::jsonb
          AND a.report_txt IS NOT DISTINCT FROM $6::text
          AND a.report_html IS NOT DISTINCT FROM $7::text
          AND NOT (
            LOWER(COALESCE(a.narrative_report->'recovery'->>'disposition', '')) = 'superseded'
            OR NULLIF(BTRIM(COALESCE(a.narrative_report->'recovery'->>'replacementAuditId', '')), '') IS NOT NULL
          )
          AND COALESCE(NULLIF(a.report_txt, ''), NULLIF(a.report_html, '')) IS NULL
          AND NOT (COALESCE(a.narrative_report, '{}'::jsonb) ?| ARRAY['sections','txt','html'])
          AND NOT EXISTS (SELECT 1 FROM report_jobs j WHERE j.audit_id = a.id)
          AND NOT EXISTS (SELECT 1 FROM report_artifacts r WHERE r.audit_id = a.id)
          AND NOT EXISTS (
            SELECT 1 FROM discovery_operation_lock l
             WHERE l.lock_key = 'discovery-global' AND l.expires_at > NOW()
          )
          AND COALESCE((
            SELECT l.token::text FROM discovery_operation_lock l
             WHERE l.lock_key = 'discovery-global'
          ), '') = COALESCE($8::text, '')
          AND ${DISCOVERY_SUPERSEDED_TERMINAL_SQL}
        RETURNING a.id`,
      [
        auditId,
        metadata,
        startAt,
        jsonParameter(audit.responses),
        jsonParameter(audit.narrative_report),
        audit.report_txt,
        audit.report_html,
        fenceToken,
      ],
    );
    if ((updated.rowCount ?? 0) !== 1) {
      await client.query("ROLLBACK");
      return false;
    }
    const inserted = await client.query(
      `INSERT INTO report_jobs
         (audit_id, status, progress, current_section, error, attempt_count)
       SELECT $1, 'pending', 0, 'Reprise Discovery en attente...', NULL, 0
        WHERE NOT EXISTS (SELECT 1 FROM report_jobs WHERE audit_id = $1)
       ON CONFLICT (audit_id) DO NOTHING
       RETURNING audit_id`,
      [auditId],
    );
    if ((inserted.rowCount ?? 0) !== 1) {
      await client.query("ROLLBACK");
      return false;
    }
    await client.query("COMMIT");
    return true;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    if (error instanceof Error && error.message === "DISCOVERY_GLOBAL_LOCK_ACTIVE") return false;
    throw error;
  } finally {
    client.release();
  }
}

export async function markDiscoveryAuditSupersededFenced(
  pool: Pick<Pool, "connect">,
  auditId: string,
  replacementAuditId: string,
  reason: string,
): Promise<boolean> {
  const startAt = getDiscoveryAutomationStartAt();
  if (!startAt || auditId === replacementAuditId) return false;
  const client = await pool.connect();
  try {
    const fenceToken = await beginFencedRecovery(client as PoolClient);
    const selected = await client.query(
      `SELECT id, type, email, created_at, responses, report_delivery_status,
              report_sent_at, narrative_report, report_txt, report_html
         FROM audits
        WHERE id = ANY($1::varchar[])
        ORDER BY id
        FOR UPDATE`,
      [[auditId, replacementAuditId]],
    );
    const rows = selected.rows as DiscoveryRecoveryAuditRow[];
    const audit = rows.find((row) => row.id === auditId);
    const replacement = rows.find((row) => row.id === replacementAuditId);
    if (
      !isEligibleRecoveryRow(audit)
      || !replacement
      || replacement.type !== "GRATUIT"
      || replacement.email.trim().toLowerCase() !== audit.email.trim().toLowerCase()
    ) {
      await client.query("ROLLBACK");
      return false;
    }
    const metadata = JSON.stringify({
      recovery: {
        version: 1,
        disposition: "superseded",
        reason,
        replacementAuditId,
        decidedAt: new Date().toISOString(),
      },
    });
    const updated = await client.query(
      `UPDATE audits AS a
          SET report_delivery_status = 'SUPERSEDED',
              narrative_report = COALESCE(a.narrative_report, '{}'::jsonb) || $3::jsonb
        WHERE a.id = $1
          AND a.type = 'GRATUIT'
          AND a.created_at >= $4
          AND a.report_delivery_status = 'NEEDS_REVIEW'
          AND a.report_sent_at IS NULL
          AND a.responses IS NOT DISTINCT FROM $5::jsonb
          AND a.narrative_report IS NOT DISTINCT FROM $6::jsonb
          AND a.report_txt IS NOT DISTINCT FROM $7::text
          AND a.report_html IS NOT DISTINCT FROM $8::text
          AND COALESCE(NULLIF(a.report_txt, ''), NULLIF(a.report_html, '')) IS NULL
          AND NOT (COALESCE(a.narrative_report, '{}'::jsonb) ?| ARRAY['sections','txt','html'])
          AND NOT EXISTS (SELECT 1 FROM report_jobs j WHERE j.audit_id = a.id)
          AND NOT EXISTS (SELECT 1 FROM report_artifacts r WHERE r.audit_id = a.id)
          AND NOT EXISTS (
            SELECT 1 FROM discovery_operation_lock l
             WHERE l.lock_key = 'discovery-global' AND l.expires_at > NOW()
          )
          AND COALESCE((
            SELECT l.token::text FROM discovery_operation_lock l
             WHERE l.lock_key = 'discovery-global'
          ), '') = COALESCE($9::text, '')
          AND EXISTS (
            SELECT 1 FROM audits replacement
             WHERE replacement.id = $2
               AND replacement.type = 'GRATUIT'
               AND LOWER(replacement.email) = LOWER(a.email)
          )
          AND ${DISCOVERY_SUPERSEDED_TERMINAL_SQL}
        RETURNING a.id`,
      [
        auditId,
        replacementAuditId,
        metadata,
        startAt,
        jsonParameter(audit.responses),
        jsonParameter(audit.narrative_report),
        audit.report_txt,
        audit.report_html,
        fenceToken,
      ],
    );
    if ((updated.rowCount ?? 0) !== 1) {
      await client.query("ROLLBACK");
      return false;
    }
    await client.query("COMMIT");
    return true;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    if (error instanceof Error && error.message === "DISCOVERY_GLOBAL_LOCK_ACTIVE") return false;
    throw error;
  } finally {
    client.release();
  }
}
