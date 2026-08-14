import { createHash, randomUUID } from "node:crypto";
import type { Pool, PoolClient } from "pg";

import {
  getDiscoveryAutomationStartAt,
  isDiscoveryTransactionalAutomationEligible,
} from "./discoveryAutomationPolicy";
import { DISCOVERY_SUPERSEDED_TERMINAL_SQL } from "./discoverySupersededPolicy";

export const DISCOVERY_TRANSACTION_FENCE_KEY = "discovery-automation-fence-v1";

export interface DiscoveryGenerationClaim {
  auditId: string;
  token: string;
  fenceToken: string | null;
  expectedResponsesSha256: string;
}

export interface DiscoveryAtomicPersistenceInput {
  claim: DiscoveryGenerationClaim;
  narrativeReport: unknown;
  scores: unknown;
  txt: string;
  html: string;
  expectedTxtSha256: string;
  expectedHtmlSha256: string;
  model: string;
}

type PoolLike = Pick<Pool, "connect">;

function stableJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`).join(",")}}`;
}

export function discoveryTransactionalSha256(value: unknown): string {
  const source = typeof value === "string" ? value : stableJson(value);
  return createHash("sha256").update(source, "utf8").digest("hex");
}

async function resolvePool(poolOverride?: PoolLike): Promise<PoolLike> {
  if (poolOverride) return poolOverride;
  return (await import("./db")).pool;
}

async function beginFencedTransaction(client: PoolClient): Promise<void> {
  await client.query("BEGIN");
  await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [DISCOVERY_TRANSACTION_FENCE_KEY]);
}

async function readInactiveGlobalFence(client: PoolClient): Promise<string | null> {
  const lock = await client.query(
    `SELECT token::text AS token, (expires_at > NOW()) AS active
       FROM discovery_operation_lock
      WHERE lock_key = 'discovery-global'
      LIMIT 1`,
  );
  if (lock.rows[0]?.active) throw new Error("DISCOVERY_GLOBAL_LOCK_ACTIVE");
  return lock.rows[0]?.token ? String(lock.rows[0].token) : null;
}

export async function claimDiscoveryGeneration(
  auditId: string,
  poolOverride?: PoolLike,
): Promise<DiscoveryGenerationClaim | null> {
  const startAt = getDiscoveryAutomationStartAt();
  if (!startAt) return null;
  const pool = await resolvePool(poolOverride);
  const client = await pool.connect();
  const token = randomUUID();
  try {
    await beginFencedTransaction(client as PoolClient);
    const fenceToken = await readInactiveGlobalFence(client as PoolClient);
    const selected = await client.query(
      `SELECT id, type, created_at, responses, report_delivery_status,
              report_sent_at, narrative_report
         FROM audits WHERE id = $1 FOR UPDATE`,
      [auditId],
    );
    const audit = selected.rows[0];
    if (!audit || !isDiscoveryTransactionalAutomationEligible({
      type: audit.type,
      createdAt: audit.created_at,
      reportDeliveryStatus: audit.report_delivery_status,
      reportSentAt: audit.report_sent_at,
      narrativeReport: audit.narrative_report,
    })) {
      await client.query("ROLLBACK");
      return null;
    }
    if (audit.report_sent_at || !["PENDING", "NEEDS_REVIEW", "EMAIL_FAILED", "FAILED", null]
      .includes(audit.report_delivery_status ?? null)) {
      await client.query("ROLLBACK");
      return null;
    }
    const expectedResponsesSha256 = discoveryTransactionalSha256(audit.responses);
    const claimMetadata = JSON.stringify({
      token,
      fenceToken,
      responsesSha256: expectedResponsesSha256,
      claimedAt: new Date().toISOString(),
    });
    const updated = await client.query(
      `UPDATE audits
          SET report_delivery_status = 'GENERATING',
              narrative_report = jsonb_set(
                COALESCE(narrative_report, '{}'::jsonb),
                '{generationClaim}', $2::jsonb, true
              )
        WHERE id = $1
          AND type = 'GRATUIT'
          AND created_at >= $3
          AND report_sent_at IS NULL
          AND (report_delivery_status IS NULL OR report_delivery_status IN ('PENDING','NEEDS_REVIEW','EMAIL_FAILED','FAILED'))
          AND NOT EXISTS (
            SELECT 1 FROM discovery_operation_lock
             WHERE lock_key = 'discovery-global' AND expires_at > NOW()
          )
          AND ${DISCOVERY_SUPERSEDED_TERMINAL_SQL}
        RETURNING id`,
      [auditId, claimMetadata, startAt],
    );
    if ((updated.rowCount ?? 0) !== 1) {
      await client.query("ROLLBACK");
      return null;
    }
    const job = await client.query(
      `INSERT INTO report_jobs AS existing
         (audit_id, status, progress, current_section, error, attempt_count,
          started_at, updated_at, last_progress_at, completed_at)
       VALUES ($1, 'generating', 10, 'Génération Discovery premium OpenAI...', NULL, 1,
               NOW(), NOW(), NOW(), NULL)
       ON CONFLICT (audit_id) DO UPDATE SET
         status = 'generating', progress = 10,
         current_section = 'Génération Discovery premium OpenAI...',
         error = NULL, attempt_count = existing.attempt_count + 1,
         started_at = NOW(), updated_at = NOW(), last_progress_at = NOW(), completed_at = NULL
       WHERE existing.status IN ('pending','failed','completed')
       RETURNING audit_id`,
      [auditId],
    );
    if ((job.rowCount ?? 0) !== 1) {
      await client.query("ROLLBACK");
      return null;
    }
    await client.query("COMMIT");
    return { auditId, token, fenceToken, expectedResponsesSha256 };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

export async function persistClaimedDiscoveryGeneration(
  input: DiscoveryAtomicPersistenceInput,
  poolOverride?: PoolLike,
): Promise<{ artifactId: string; txtSha256: string; htmlSha256: string }> {
  const txtSha256 = discoveryTransactionalSha256(input.txt);
  const htmlSha256 = discoveryTransactionalSha256(input.html);
  if (txtSha256 !== input.expectedTxtSha256 || htmlSha256 !== input.expectedHtmlSha256) {
    throw new Error("DISCOVERY_GENERATED_ARTIFACT_HASH_MISMATCH");
  }
  const startAt = getDiscoveryAutomationStartAt();
  if (!startAt) throw new Error("DISCOVERY_TRANSACTIONAL_AUTOMATION_INELIGIBLE");
  const pool = await resolvePool(poolOverride);
  const client = await pool.connect();
  const artifactId = randomUUID();
  const contentSha256 = discoveryTransactionalSha256(`txt\0${input.txt}\0html\0${input.html}`);
  try {
    await beginFencedTransaction(client as PoolClient);
    const fenceToken = await readInactiveGlobalFence(client as PoolClient);
    if (fenceToken !== input.claim.fenceToken) {
      throw new Error("DISCOVERY_GENERATION_FENCE_STALE");
    }
    const selected = await client.query(
      `SELECT id, type, created_at, responses, report_delivery_status,
              report_sent_at, narrative_report
         FROM audits WHERE id = $1 FOR UPDATE`,
      [input.claim.auditId],
    );
    const audit = selected.rows[0];
    if (!audit || !isDiscoveryTransactionalAutomationEligible({
      type: audit.type,
      createdAt: audit.created_at,
      reportDeliveryStatus: audit.report_delivery_status,
      reportSentAt: audit.report_sent_at,
      narrativeReport: audit.narrative_report,
    })) throw new Error("DISCOVERY_TRANSACTIONAL_AUTOMATION_INELIGIBLE");
    if (audit.report_delivery_status !== "GENERATING" || audit.report_sent_at) {
      throw new Error("DISCOVERY_GENERATION_OWNERSHIP_LOST");
    }
    if (String(audit.narrative_report?.generationClaim?.token || "") !== input.claim.token) {
      throw new Error("DISCOVERY_GENERATION_TOKEN_MISMATCH");
    }
    if (discoveryTransactionalSha256(audit.responses) !== input.claim.expectedResponsesSha256) {
      throw new Error("DISCOVERY_GENERATION_RESPONSES_CHANGED");
    }
    const artifact = await client.query(
      `INSERT INTO report_artifacts
         (id, audit_id, tier, engine, model, txt, html, content_sha256, created_at)
       VALUES ($1,$2,'GRATUIT','discovery',$3,$4,$5,$6,NOW())
       ON CONFLICT (audit_id, content_sha256) WHERE content_sha256 IS NOT NULL DO NOTHING
       RETURNING id`,
      [artifactId, input.claim.auditId, input.model, input.txt, input.html, contentSha256],
    );
    if ((artifact.rowCount ?? 0) !== 1) throw new Error("DISCOVERY_ARTIFACT_OWNERSHIP_CONFLICT");
    const updated = await client.query(
      `UPDATE audits
          SET narrative_report = $3::jsonb, scores = $4::jsonb,
              report_txt = $5, report_html = $6, report_generated_at = NOW(),
              report_delivery_status = 'READY'
        WHERE id = $1
          AND type = 'GRATUIT'
          AND created_at >= $7
          AND report_delivery_status = 'GENERATING'
          AND report_sent_at IS NULL
          AND narrative_report->'generationClaim'->>'token' = $2
          AND NOT EXISTS (
            SELECT 1 FROM discovery_operation_lock
             WHERE lock_key = 'discovery-global' AND expires_at > NOW()
          )
          AND COALESCE((
            SELECT token::text FROM discovery_operation_lock
             WHERE lock_key = 'discovery-global'
          ), '') = COALESCE($8::text, '')
          AND ${DISCOVERY_SUPERSEDED_TERMINAL_SQL}
        RETURNING id`,
      [input.claim.auditId, input.claim.token, JSON.stringify(input.narrativeReport),
        JSON.stringify(input.scores), input.txt, input.html, startAt, input.claim.fenceToken],
    );
    if ((updated.rowCount ?? 0) !== 1) throw new Error("DISCOVERY_AUDIT_PERSISTENCE_CAS_FAILED");
    const jobCompleted = await client.query(
      `UPDATE report_jobs
          SET status = 'completed', progress = 100,
              current_section = 'Rapport termine !', completed_at = NOW(),
              updated_at = NOW(), last_progress_at = NOW()
        WHERE audit_id = $1 AND status = 'generating'`,
      [input.claim.auditId],
    );
    if ((jobCompleted.rowCount ?? 0) !== 1) {
      throw new Error("DISCOVERY_REPORT_JOB_COMPLETION_CAS_FAILED");
    }
    await client.query("COMMIT");
    return { artifactId, txtSha256, htmlSha256 };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

export async function failClaimedDiscoveryGeneration(
  claim: DiscoveryGenerationClaim,
  source: string,
  error: unknown,
  poolOverride?: PoolLike,
): Promise<boolean> {
  const startAt = getDiscoveryAutomationStartAt();
  if (!startAt) return false;
  const pool = await resolvePool(poolOverride);
  const client = await pool.connect();
  const failure = JSON.stringify({
    version: 1,
    disposition: "missing_artifacts",
    reason: "generation_failed",
    source: source.slice(0, 120),
    error: (error instanceof Error ? error.message : String(error)).slice(0, 1000),
    failedAt: new Date().toISOString(),
  });
  try {
    await beginFencedTransaction(client as PoolClient);
    const fenceToken = await readInactiveGlobalFence(client as PoolClient);
    if (fenceToken !== claim.fenceToken) {
      await client.query("ROLLBACK");
      return false;
    }
    const updated = await client.query(
      `UPDATE audits
          SET report_delivery_status = 'NEEDS_REVIEW',
              narrative_report = jsonb_set(
                COALESCE(narrative_report, '{}'::jsonb), '{recovery}', $3::jsonb, true
              )
        WHERE id = $1
          AND type = 'GRATUIT'
          AND created_at >= $4
          AND report_delivery_status = 'GENERATING'
          AND report_sent_at IS NULL
          AND narrative_report->'generationClaim'->>'token' = $2
          AND NOT EXISTS (
            SELECT 1 FROM discovery_operation_lock
             WHERE lock_key = 'discovery-global' AND expires_at > NOW()
          )
          AND COALESCE((
            SELECT token::text FROM discovery_operation_lock
             WHERE lock_key = 'discovery-global'
          ), '') = COALESCE($5::text, '')
          AND ${DISCOVERY_SUPERSEDED_TERMINAL_SQL}
        RETURNING id`,
      [claim.auditId, claim.token, failure, startAt, claim.fenceToken],
    );
    if ((updated.rowCount ?? 0) === 1) {
      const jobFailed = await client.query(
        `UPDATE report_jobs
            SET status = 'failed', error = $2, updated_at = NOW(), last_progress_at = NOW()
          WHERE audit_id = $1 AND status = 'generating'`,
        [claim.auditId, (error instanceof Error ? error.message : String(error)).slice(0, 1000)],
      );
      if ((jobFailed.rowCount ?? 0) !== 1) {
        throw new Error("DISCOVERY_REPORT_JOB_FAILURE_CAS_FAILED");
      }
    }
    await client.query("COMMIT");
    return (updated.rowCount ?? 0) === 1;
  } catch (caught) {
    await client.query("ROLLBACK").catch(() => {});
    throw caught;
  } finally {
    client.release();
  }
}
