/**
 * Transactional Discovery artifact backfill.
 *
 * This operation never generates reports and never sends email.  Dry-run is
 * the default; --apply requires explicit audit ids and only inserts the
 * missing ACTIVE report_artifacts rows for already-generated Discovery
 * BATCH_READY audits.
 */
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { Pool, type PoolClient } from "pg";

const EXPECTED_BASE_COMMIT = "805892bc907a68bad21128b08a09551b784eb41b";
const ALLOWED_RUNTIME_COMMITS = new Set([
  EXPECTED_BASE_COMMIT,
  "324d3861c034599090635e0a49d5694dd969e50e",
]);
const DISCOVERY_GLOBAL_LOCK_KEY = "discovery-global";
const DISCOVERY_TRANSACTION_FENCE_KEY = "discovery-automation-fence-v1";
const DISCOVERY_OTHER_AUDIT_ACTIVE_SQL = `NOT (
  other.report_delivery_status = 'SUPERSEDED'
  OR LOWER(COALESCE(other.narrative_report->'recovery'->>'disposition', '')) = 'superseded'
  OR NULLIF(BTRIM(COALESCE(other.narrative_report->'recovery'->>'replacementAuditId', '')), '') IS NOT NULL
)`;

interface DiscoveryDeps {
  acquireDiscoveryGlobalLock: typeof import("../server/discoveryBatchControl").acquireDiscoveryGlobalLock;
  assertDiscoveryBatchSchemaV009: typeof import("../server/discoveryBatchSchema").assertDiscoveryBatchSchemaV009;
  discoveryArtifactContentHash: typeof import("../server/discoveryBatchControl").discoveryArtifactContentHash;
  discoverySha256: typeof import("../server/discoveryBatchControl").discoverySha256;
  evaluateCanonicalDiscoveryArtifacts: typeof import("../server/discoveryDeliveryGate").evaluateCanonicalDiscoveryArtifacts;
  hasDiscoveryCatalogLedgerBinding: typeof import("../server/discoveryDeliveryGate").hasDiscoveryCatalogLedgerBinding;
  hasPassingPersistedDiscoveryDeliveryGate: typeof import("../server/discoveryDeliveryGate").hasPassingPersistedDiscoveryDeliveryGate;
  isBlockedDiscoveryTestEmail: typeof import("../server/discoveryBatchControl").isBlockedDiscoveryTestEmail;
  isDiscoverySupersededTerminal: typeof import("../server/discoverySupersededPolicy").isDiscoverySupersededTerminal;
  isValidDiscoveryRecipientEmail: typeof import("../server/discoveryBatchControl").isValidDiscoveryRecipientEmail;
  releaseDiscoveryGlobalLock: typeof import("../server/discoveryBatchControl").releaseDiscoveryGlobalLock;
  resolveCanonicalDiscoveryArtifacts: typeof import("../server/discoveryDeliveryGate").resolveCanonicalDiscoveryArtifacts;
  validateDiscoveryPersistenceContract: typeof import("../server/discovery-scan").validateDiscoveryPersistenceContract;
}

let depsPromise: Promise<DiscoveryDeps> | null = null;

function loadDeps(): Promise<DiscoveryDeps> {
  depsPromise ??= (async () => {
    const batch = await import("../server/discoveryBatchControl");
    const schema = await import("../server/discoveryBatchSchema");
    const gate = await import("../server/discoveryDeliveryGate");
    const scan = await import("../server/discovery-scan");
    const superseded = await import("../server/discoverySupersededPolicy");
    return {
      acquireDiscoveryGlobalLock: batch.acquireDiscoveryGlobalLock,
      assertDiscoveryBatchSchemaV009: schema.assertDiscoveryBatchSchemaV009,
      discoveryArtifactContentHash: batch.discoveryArtifactContentHash,
      discoverySha256: batch.discoverySha256,
      evaluateCanonicalDiscoveryArtifacts: gate.evaluateCanonicalDiscoveryArtifacts,
      hasDiscoveryCatalogLedgerBinding: gate.hasDiscoveryCatalogLedgerBinding,
      hasPassingPersistedDiscoveryDeliveryGate: gate.hasPassingPersistedDiscoveryDeliveryGate,
      isBlockedDiscoveryTestEmail: batch.isBlockedDiscoveryTestEmail,
      isDiscoverySupersededTerminal: superseded.isDiscoverySupersededTerminal,
      isValidDiscoveryRecipientEmail: batch.isValidDiscoveryRecipientEmail,
      releaseDiscoveryGlobalLock: batch.releaseDiscoveryGlobalLock,
      resolveCanonicalDiscoveryArtifacts: gate.resolveCanonicalDiscoveryArtifacts,
      validateDiscoveryPersistenceContract: scan.validateDiscoveryPersistenceContract,
    };
  })();
  return depsPromise;
}

type Mode = "dry-run" | "apply";

interface Args {
  mode: Mode;
  auditIds: string[];
  json: boolean;
  help: boolean;
}

interface AuditRow {
  id: string;
  email: string;
  type: string;
  created_at: Date;
  report_delivery_status: string | null;
  report_sent_at: Date | null;
  responses: Record<string, unknown>;
  narrative_report: Record<string, unknown> | null;
  scores: Record<string, unknown> | null;
  report_txt: string | null;
  report_html: string | null;
  tracking_total: number;
  claim_total: number;
  unsubscribed: boolean;
  duplicate_candidate: boolean;
  active_artifact_count: number;
  total_artifact_count: number;
}

interface BatchProof {
  batchId: string;
  batchStage: string;
  batchStatus: string;
  itemState: string;
  artifactId: string | null;
  model: string;
  providerResponseId: string;
  generatedTxtSha256: string;
  generatedHtmlSha256: string;
}

interface Inspection {
  auditId: string;
  email?: string;
  ok: boolean;
  reasons: string[];
  reportTxtSha256?: string;
  reportHtmlSha256?: string;
  contentSha256?: string;
  batchId?: string;
  model?: string;
  artifactId?: string;
  deliveryGateAfterBackfillOk?: boolean;
  catalogLedgerBindingOk?: boolean;
}

function parseArgs(argv: string[]): Args {
  const auditIds: string[] = [];
  let mode: Mode = "dry-run";
  let json = false;
  let help = false;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") {
      help = true;
    } else if (arg === "--dry-run") {
      mode = "dry-run";
    } else if (arg === "--apply") {
      mode = "apply";
    } else if (arg === "--json") {
      json = true;
    } else if (arg === "--run-delivery") {
      throw new Error("DISCOVERY_BACKFILL_DELIVERY_FORBIDDEN");
    } else if (arg === "--target-audit-id") {
      const value = argv[index + 1];
      if (!value) throw new Error("DISCOVERY_BACKFILL_TARGET_VALUE_MISSING");
      auditIds.push(value);
      index += 1;
    } else if (arg === "--target-audit-ids") {
      const value = argv[index + 1];
      if (!value) throw new Error("DISCOVERY_BACKFILL_TARGET_VALUE_MISSING");
      auditIds.push(...value.split(","));
      index += 1;
    } else {
      throw new Error(`DISCOVERY_BACKFILL_UNKNOWN_ARG:${arg}`);
    }
  }

  const normalizedIds = auditIds.map((id) => id.trim().toLowerCase()).filter(Boolean);
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
  if (normalizedIds.some((id) => !uuid.test(id))) {
    throw new Error("DISCOVERY_BACKFILL_TARGET_ID_INVALID");
  }
  if (new Set(normalizedIds).size !== normalizedIds.length) {
    throw new Error("DISCOVERY_BACKFILL_TARGET_ID_DUPLICATE");
  }
  if (mode === "apply" && normalizedIds.length === 0) {
    throw new Error("DISCOVERY_BACKFILL_APPLY_REQUIRES_EXACT_TARGET_IDS");
  }

  return { mode, auditIds: normalizedIds, json, help };
}

function usage(): string {
  return [
    "Usage:",
    "  tsx scripts/backfill-discovery-missing-artifacts.ts --dry-run [--target-audit-id <uuid> ...] [--json]",
    "  tsx scripts/backfill-discovery-missing-artifacts.ts --apply --target-audit-id <uuid> [--target-audit-id <uuid> ...]",
    "",
    "Safety:",
    "  Dry-run is default. --apply never sends email and refuses to run without exact target audit ids.",
  ].join("\n");
}

function assertOfflineEnvironment(mode: Mode): void {
  if (String(process.env.DISCOVERY_REPORT_DELIVERY_ENABLED || "").toLowerCase() === "true") {
    throw new Error("DISCOVERY_BACKFILL_DELIVERY_ENV_ENABLED");
  }
  if (mode === "apply") {
    const required: Array<[string, string]> = [
      ["REMEDIATION_SIDE_EFFECTS_DISABLED", "true"],
      ["DISCOVERY_REPORT_DELIVERY_ENABLED", "false"],
      ["DISCOVERY_UNIFIED_GENERATION_ENABLED", "false"],
    ];
    for (const [key, expected] of required) {
      if (String(process.env[key] || "").toLowerCase() !== expected) {
        throw new Error(`DISCOVERY_BACKFILL_ENV_REQUIRED:${key}=${expected}`);
      }
    }
  }
}

function assertExpectedBaseCommit(): void {
  const current = String(process.env.RENDER_GIT_COMMIT || process.env.GIT_COMMIT || "").trim()
    || execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  const explicitRuntimeCommit = String(process.env.DISCOVERY_BACKFILL_ALLOWED_RUNTIME_COMMIT || "").trim();
  if (/^[a-f0-9]{40}$/.test(explicitRuntimeCommit) && current === explicitRuntimeCommit) return;
  if (ALLOWED_RUNTIME_COMMITS.has(current)) return;
  try {
    execFileSync("git", ["merge-base", "--is-ancestor", EXPECTED_BASE_COMMIT, current], {
      stdio: "ignore",
    });
  } catch {
    throw new Error(`DISCOVERY_BACKFILL_WRONG_BASE_COMMIT:${current}`);
  }
}

function createPool(): Pool {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
  const dbUrl = process.env.DATABASE_URL;
  return new Pool({
    connectionString: dbUrl,
    ssl: (dbUrl.includes("render.com") || dbUrl.includes("neon.tech"))
      ? { rejectUnauthorized: false }
      : false,
    max: Number(process.env.DB_POOL_MAX || "3"),
    connectionTimeoutMillis: Number(process.env.DB_CONNECTION_TIMEOUT_MS || "15000"),
    idleTimeoutMillis: Number(process.env.DB_IDLE_TIMEOUT_MS || "30000"),
  });
}

function getCatalogProvenance(narrative: unknown): unknown {
  if (!narrative || typeof narrative !== "object") return null;
  const metadata = (narrative as Record<string, any>).analysisMetadata;
  return metadata && typeof metadata === "object" ? metadata.catalogProvenance : null;
}

function getGenerationQualityVersion(narrative: unknown): number {
  if (!narrative || typeof narrative !== "object") return 0;
  return Number((narrative as Record<string, any>).generationQuality?.version || 0);
}

async function loadAudits(db: Pool | PoolClient, auditIds: string[], forUpdate: boolean): Promise<AuditRow[]> {
  const targetFilter = auditIds.length > 0 ? "AND a.id = ANY($1::text[])" : "";
  const lock = forUpdate ? "FOR UPDATE OF a" : "";
  const result = await db.query(
    `SELECT a.id, a.email, a.type, a.created_at, a.report_delivery_status,
            a.report_sent_at, a.responses, a.narrative_report, a.scores,
            a.report_txt, a.report_html,
            (SELECT COUNT(*)::int FROM email_tracking t
              WHERE t.audit_id = a.id AND t.email_type = 'sendReportReadyEmail') AS tracking_total,
            (SELECT COUNT(*)::int FROM discovery_email_delivery_claims c
              WHERE c.audit_id = a.id AND c.email_type = 'sendReportReadyEmail') AS claim_total,
            EXISTS (
              SELECT 1 FROM email_unsubscribes u
               WHERE LOWER(u.email) = LOWER(a.email)
            ) AS unsubscribed,
            EXISTS (
              SELECT 1 FROM audits other
               WHERE other.type = 'GRATUIT' AND other.id <> a.id
                 AND LOWER(other.email) = LOWER(a.email)
                 AND ABS(EXTRACT(EPOCH FROM (other.created_at - a.created_at))) <= 14 * 86400
                 AND ${DISCOVERY_OTHER_AUDIT_ACTIVE_SQL}
            ) AS duplicate_candidate,
            (SELECT COUNT(*)::int FROM report_artifacts ra
              WHERE ra.audit_id = a.id AND ra.artifact_state = 'ACTIVE') AS active_artifact_count,
            (SELECT COUNT(*)::int FROM report_artifacts ra
              WHERE ra.audit_id = a.id) AS total_artifact_count
       FROM audits a
      WHERE a.type = 'GRATUIT'
        AND a.report_delivery_status = 'BATCH_READY'
        AND a.report_sent_at IS NULL
        ${targetFilter}
      ORDER BY a.created_at ASC, a.id ASC
      ${lock}`,
    auditIds.length > 0 ? [auditIds] : [],
  );
  return result.rows as AuditRow[];
}

async function loadBatchProof(
  db: Pool | PoolClient,
  auditId: string,
  txtSha256: string,
  htmlSha256: string,
  forUpdate: boolean,
): Promise<{ proof: BatchProof | null; count: number }> {
  const lock = forUpdate ? "FOR UPDATE OF i" : "";
  const result = await db.query(
    `SELECT i.batch_id::text AS "batchId",
            b.stage AS "batchStage",
            b.status AS "batchStatus",
            i.state AS "itemState",
            i.artifact_id AS "artifactId",
            COALESCE(e.model, '') AS model,
            i.provider_response_id AS "providerResponseId",
            i.generated_txt_sha256 AS "generatedTxtSha256",
            i.generated_html_sha256 AS "generatedHtmlSha256"
       FROM discovery_batch_items i
       JOIN discovery_batch_runs b ON b.id = i.batch_id
       JOIN ai_cost_budget_reservations r
         ON r.id = i.provider_reservation_id
        AND r.order_id = i.audit_id
        AND r.product = 'discovery'
        AND r.profile = 'discovery'
        AND r.status = 'COMPLETED'
        AND r.response_id = i.provider_response_id
       JOIN ai_usage_events e
         ON e.id = i.provider_usage_event_id
        AND e.response_id = i.provider_response_id
        AND e.profile = 'discovery'
        AND e.status = 'completed'
      WHERE i.audit_id = $1
        AND i.state = 'STORED'
        AND i.provider_calls = 1
        AND i.generated_txt_sha256 = $2
        AND i.generated_html_sha256 = $3
        AND b.stage IN ('GENERATION','REGENERATION')
        AND b.status = 'COMPLETED'
        AND e.model <> ''
      ORDER BY i.updated_at DESC, i.batch_id DESC
      ${lock}`,
    [auditId, txtSha256, htmlSha256],
  );
  return {
    proof: result.rowCount === 1 ? result.rows[0] as BatchProof : null,
    count: result.rowCount ?? 0,
  };
}

async function inspectAudit(
  db: Pool | PoolClient,
  row: AuditRow,
  deps: DiscoveryDeps,
  options: { forUpdate: boolean },
): Promise<Inspection & { proof?: BatchProof; txt?: string; html?: string; narrative?: Record<string, unknown> }> {
  const reasons: string[] = [];
  if (row.type !== "GRATUIT") reasons.push("not_gratuit");
  if (row.report_delivery_status !== "BATCH_READY") reasons.push("not_batch_ready");
  if (row.report_sent_at) reasons.push("already_sent");
  if (!deps.isValidDiscoveryRecipientEmail(row.email)) reasons.push("invalid_email");
  if (deps.isBlockedDiscoveryTestEmail(row.email)) reasons.push("test_email_blocked");
  if (row.tracking_total !== 0) reasons.push(`prior_tracking_sendReportReadyEmail:${row.tracking_total}`);
  if (row.claim_total !== 0) reasons.push(`prior_delivery_claim:${row.claim_total}`);
  if (row.unsubscribed) reasons.push("recipient_unsubscribed");
  if (row.duplicate_candidate) reasons.push("duplicate_candidate");
  if (deps.isDiscoverySupersededTerminal({
    type: row.type,
    reportDeliveryStatus: row.report_delivery_status,
    narrativeReport: row.narrative_report,
  })) {
    reasons.push("superseded_terminal");
  }
  if (row.active_artifact_count !== 0) {
    reasons.push(`active_artifact_count:${row.active_artifact_count}/0`);
  }

  const canonical = deps.resolveCanonicalDiscoveryArtifacts({
    narrativeReport: row.narrative_report,
    reportTxt: row.report_txt,
    reportHtml: row.report_html,
    reportArtifacts: [],
  });
  if (!canonical.report) reasons.push("canonical_report_missing");
  const exactnessWithoutMissingArtifact = canonical.exactnessErrors
    .filter((error) => error !== "report_artifact_count:0/1");
  if (exactnessWithoutMissingArtifact.length > 0) {
    reasons.push(...exactnessWithoutMissingArtifact.map((error) => `canonical:${error}`));
  }
  if (!String(row.report_txt || "")) reasons.push("report_txt_missing");
  if (!String(row.report_html || "")) reasons.push("report_html_missing");
  if (canonical.txt !== String(row.report_txt || "")) reasons.push("report_txt_not_byte_exact");
  if (canonical.html !== String(row.report_html || "")) reasons.push("report_html_not_byte_exact");

  const persistence = deps.validateDiscoveryPersistenceContract({
    narrativeReport: canonical.narrativeReport,
    scores: row.scores || {},
    txt: canonical.txt,
    html: canonical.html,
    responses: row.responses || {},
  });
  if (!persistence.ok) {
    reasons.push(...persistence.errors.map((error) => `persistence:${error}`));
  }
  if (!deps.hasPassingPersistedDiscoveryDeliveryGate(row.narrative_report)) {
    reasons.push("persisted_delivery_gate_missing_or_failed");
  }

  const txtSha256 = deps.discoverySha256(canonical.txt);
  const htmlSha256 = deps.discoverySha256(canonical.html);
  const contentSha256 = deps.discoveryArtifactContentHash(canonical.txt, canonical.html);
  const proofResult = await loadBatchProof(
    db,
    row.id,
    txtSha256,
    htmlSha256,
    options.forUpdate,
  );
  if (proofResult.count !== 1 || !proofResult.proof) {
    reasons.push(`batch_provider_proof_count:${proofResult.count}/1`);
  }

  const proof = proofResult.proof || undefined;
  if (proof) {
    if (!["GENERATION", "REGENERATION"].includes(proof.batchStage)) {
      reasons.push(`batch_stage:${proof.batchStage}`);
    }
    if (proof.batchStatus !== "COMPLETED") reasons.push(`batch_status:${proof.batchStatus}`);
    if (proof.itemState !== "STORED") reasons.push(`batch_item_state:${proof.itemState}`);
    if (proof.generatedTxtSha256 !== txtSha256) reasons.push("batch_txt_sha_mismatch");
    if (proof.generatedHtmlSha256 !== htmlSha256) reasons.push("batch_html_sha_mismatch");
  }

  return {
    auditId: row.id,
    email: row.email,
    ok: reasons.length === 0,
    reasons: [...new Set(reasons)],
    reportTxtSha256: txtSha256,
    reportHtmlSha256: htmlSha256,
    contentSha256,
    batchId: proof?.batchId,
    model: proof?.model,
    artifactId: proof?.artifactId || undefined,
    proof,
    txt: canonical.txt,
    html: canonical.html,
    narrative: row.narrative_report || {},
  };
}

async function applyBackfill(pool: Pool, auditIds: string[], deps: DiscoveryDeps): Promise<Inspection[]> {
  const lock = await deps.acquireDiscoveryGlobalLock({
    owner: `discovery-artifact-backfill:${process.pid}`,
    purpose: `missing-artifact-backfill:${auditIds.join(",")}`,
    ttlMinutes: 20,
  }, pool);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [DISCOVERY_TRANSACTION_FENCE_KEY]);
    const activeLock = await client.query(
      `SELECT 1 FROM discovery_operation_lock
        WHERE lock_key = $1 AND token = $2 AND expires_at > NOW()
        FOR UPDATE`,
      [DISCOVERY_GLOBAL_LOCK_KEY, lock.token],
    );
    if ((activeLock.rowCount ?? 0) !== 1) throw new Error("DISCOVERY_BACKFILL_LOCK_LOST");

    const rows = await loadAudits(client, auditIds, true);
    if (rows.length !== auditIds.length) {
      const found = new Set(rows.map((row) => row.id));
      const missing = auditIds.filter((id) => !found.has(id));
      throw new Error(`DISCOVERY_BACKFILL_TARGET_NOT_ELIGIBLE_OR_MISSING:${missing.join(",")}`);
    }

    const applied: Inspection[] = [];
    for (const row of rows) {
      const inspection = await inspectAudit(client, row, deps, { forUpdate: true });
      if (!inspection.ok || !inspection.proof || !inspection.txt || !inspection.html) {
        throw new Error(`DISCOVERY_BACKFILL_GUARD_FAILED:${row.id}:${inspection.reasons.join("|")}`);
      }

      const artifactId = inspection.proof.artifactId || randomUUID();
      const inserted = await client.query(
        `INSERT INTO report_artifacts
           (id,audit_id,tier,engine,model,txt,html,content_sha256,batch_id,
            artifact_state,supersedes_artifact_id,created_at)
         VALUES ($1,$2,'GRATUIT','discovery',$3,$4,$5,$6,$7::uuid,'ACTIVE',NULL,NOW())
         ON CONFLICT (audit_id, content_sha256) WHERE content_sha256 IS NOT NULL
         DO NOTHING
         RETURNING id`,
        [artifactId, row.id, inspection.proof.model, inspection.txt, inspection.html,
          inspection.contentSha256, inspection.proof.batchId],
      );
      if ((inserted.rowCount ?? 0) !== 1) {
        throw new Error(`DISCOVERY_BACKFILL_ARTIFACT_INSERT_CONFLICT:${row.id}`);
      }

      if (!inspection.proof.artifactId) {
        const itemUpdated = await client.query(
          `UPDATE discovery_batch_items
              SET artifact_id = $3, updated_at = NOW()
            WHERE audit_id = $1
              AND batch_id = $2::uuid
              AND state = 'STORED'
              AND provider_calls = 1
              AND artifact_id IS NULL
              AND generated_txt_sha256 = $4
              AND generated_html_sha256 = $5
              AND EXISTS (
                SELECT 1 FROM discovery_batch_runs b
                 WHERE b.id = discovery_batch_items.batch_id
                   AND b.status = 'COMPLETED'
                   AND b.stage IN ('GENERATION','REGENERATION')
              )
            RETURNING audit_id`,
          [row.id, inspection.proof.batchId, artifactId,
            inspection.reportTxtSha256, inspection.reportHtmlSha256],
        );
        if ((itemUpdated.rowCount ?? 0) !== 1) {
          throw new Error(`DISCOVERY_BACKFILL_BATCH_ITEM_BIND_FAILED:${row.id}`);
        }
      }

      const verifyArtifacts = await client.query(
        `SELECT id,batch_id::text AS batch_id,model,txt,html,content_sha256
           FROM report_artifacts
          WHERE audit_id = $1 AND artifact_state = 'ACTIVE'
          ORDER BY created_at DESC, id DESC
          FOR UPDATE`,
        [row.id],
      );
      const canonicalAfter = deps.resolveCanonicalDiscoveryArtifacts({
        narrativeReport: row.narrative_report,
        reportTxt: row.report_txt,
        reportHtml: row.report_html,
        reportArtifacts: verifyArtifacts.rows.map((artifact) => ({
          txt: artifact.txt,
          html: artifact.html,
          contentSha256: artifact.content_sha256,
        })),
      });
      const gateAfter = deps.evaluateCanonicalDiscoveryArtifacts(canonicalAfter);
      if (!gateAfter.ok) {
        throw new Error(`DISCOVERY_BACKFILL_DELIVERY_GATE_FAILED:${row.id}:${gateAfter.errors.join("|")}`);
      }

      const persisted = verifyArtifacts.rows[0];
      const ledgerBindingOk = getGenerationQualityVersion(row.narrative_report) === 2
        ? await deps.hasDiscoveryCatalogLedgerBinding(client, row.id, {
            id: persisted.id,
            batchId: persisted.batch_id,
            model: persisted.model,
            txt: persisted.txt,
            html: persisted.html,
            contentSha256: persisted.content_sha256,
          }, getCatalogProvenance(row.narrative_report))
        : true;
      if (!ledgerBindingOk) {
        throw new Error(`DISCOVERY_BACKFILL_CATALOG_LEDGER_BINDING_FAILED:${row.id}`);
      }

      const noSendSideEffects = await client.query(
        `SELECT
           (SELECT COUNT(*)::int FROM email_tracking
             WHERE audit_id = $1 AND email_type = 'sendReportReadyEmail') AS tracking_total,
           (SELECT COUNT(*)::int FROM discovery_email_delivery_claims
             WHERE audit_id = $1 AND email_type = 'sendReportReadyEmail') AS claim_total,
           (SELECT report_sent_at FROM audits WHERE id = $1) AS report_sent_at`,
        [row.id],
      );
      if (Number(noSendSideEffects.rows[0]?.tracking_total || 0) !== 0
        || Number(noSendSideEffects.rows[0]?.claim_total || 0) !== 0
        || noSendSideEffects.rows[0]?.report_sent_at) {
        throw new Error(`DISCOVERY_BACKFILL_SIDE_EFFECT_GUARD_FAILED:${row.id}`);
      }

      applied.push({
        ...inspection,
        artifactId,
        deliveryGateAfterBackfillOk: gateAfter.ok,
        catalogLedgerBindingOk: ledgerBindingOk,
        ok: true,
        reasons: [],
      });
    }

    await client.query("COMMIT");
    return applied;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
    const released = await deps.releaseDiscoveryGlobalLock(lock.token, pool);
    if (!released) throw new Error("DISCOVERY_BACKFILL_LOCK_RELEASE_FAILED");
  }
}

async function dryRun(pool: Pool, auditIds: string[], deps: DiscoveryDeps): Promise<Inspection[]> {
  const lockState = await pool.query(
    `SELECT owner,purpose,expires_at FROM discovery_operation_lock
      WHERE lock_key = $1 AND expires_at > NOW()
      LIMIT 1`,
    [DISCOVERY_GLOBAL_LOCK_KEY],
  );
  if ((lockState.rowCount ?? 0) > 0) {
    throw new Error("DISCOVERY_BACKFILL_GLOBAL_LOCK_ACTIVE");
  }
  const rows = await loadAudits(pool, auditIds, false);
  if (auditIds.length > 0 && rows.length !== auditIds.length) {
    const found = new Set(rows.map((row) => row.id));
    const missing = auditIds.filter((id) => !found.has(id));
    throw new Error(`DISCOVERY_BACKFILL_TARGET_NOT_ELIGIBLE_OR_MISSING:${missing.join(",")}`);
  }
  const inspections: Inspection[] = [];
  for (const row of rows) {
    inspections.push(await inspectAudit(pool, row, deps, { forUpdate: false }));
  }
  return inspections;
}

function printResult(mode: Mode, inspections: Inspection[], json: boolean): void {
  const payload = {
    operation: "discovery_missing_artifact_backfill",
    mode,
    generatedAt: new Date().toISOString(),
    counts: {
      total: inspections.length,
      eligible: inspections.filter((item) => item.ok).length,
      blocked: inspections.filter((item) => !item.ok).length,
    },
    items: inspections.map(({ ok, reasons, ...item }) => ({ ...item, ok, reasons })),
  };
  if (json) {
    console.log(JSON.stringify(payload, null, 2));
    return;
  }
  console.log(`DISCOVERY_BACKFILL_${mode === "apply" ? "APPLY" : "DRY_RUN"}:${JSON.stringify(payload)}`);
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(usage());
    return;
  }
  assertExpectedBaseCommit();
  assertOfflineEnvironment(args.mode);
  const deps = await loadDeps();
  const pool = createPool();
  try {
    await deps.assertDiscoveryBatchSchemaV009(pool);
    const inspections = args.mode === "apply"
      ? await applyBackfill(pool, args.auditIds, deps)
      : await dryRun(pool, args.auditIds, deps);
    printResult(args.mode, inspections, args.json);
  } finally {
    await pool.end().catch(() => {});
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
