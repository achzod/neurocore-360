import { createHash, randomUUID } from "node:crypto";
import type { Pool, PoolClient } from "pg";

import { assertDiscoveryBatchSchemaV009 } from "./discoveryBatchSchema";

import {
  attachDiscoveryDeliveryGateResult,
  evaluateCanonicalDiscoveryArtifacts,
  evaluateDiscoveryDeliveryGate,
  hasDiscoveryCatalogLedgerBinding,
  hasPassingPersistedDiscoveryDeliveryGate,
  normalizeDiscoveryCatalogProvenanceForLedger,
  resolveCanonicalDiscoveryArtifacts,
} from "./discoveryDeliveryGate";
import {
  reconstructDiscoveryCatalogReport,
  validateDiscoveryCatalogReportProvenance,
  validateDiscoveryPersistenceContract,
  validateDiscoveryReportAgainstResponses,
} from "./discovery-scan";

const LOCK_KEY = "discovery-global";
const OPERATION = "ALEXANDRE_ATTEMPT2_CANONICAL_REPLAY" as const;

export const DISCOVERY_ALEXANDRE_OFFLINE_REPLAY_TARGET = Object.freeze({
  auditId: "e860b380-3a6e-4c64-b823-3422476b7cd2",
  emailSha256: "0ae1447d6dd547ce59b3d116435794a73f7b36965b5fe03f5c3698127411ecce",
  sourceStatus: "BATCH_REVIEW" as const,
  attemptCount: 2,
  completedLedgerCount: 2,
  replayAttemptNo: 2,
  replaySourceKind: "ASSEMBLED_REJECTED" as const,
  replayCandidateState: "TERMINAL_REJECTED" as const,
});

type Queryable = Pick<Pool | PoolClient, "query">;
type PoolLike = Pick<Pool, "connect" | "query">;

function stableJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "undefined";
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) => (
    `${JSON.stringify(key)}:${stableJson(record[key])}`
  )).join(",")}}`;
}

export function discoveryAlexandreReplaySha256(value: unknown): string {
  return createHash("sha256")
    .update(typeof value === "string" ? value : stableJson(value), "utf8")
    .digest("hex");
}

function artifactContentSha256(txt: string, html: string): string {
  return discoveryAlexandreReplaySha256(`txt\0${txt}\0html\0${html}`);
}

export interface AlexandreOfflineReplayManifest {
  schemaVersion: 2;
  operation: typeof OPERATION;
  target: typeof DISCOVERY_ALEXANDRE_OFFLINE_REPLAY_TARGET;
  audit: {
    responsesSha256: string;
    scoresSha256: string;
    narrativeSha256: string;
    txtSha256: string;
    htmlSha256: string;
    reportGeneratedAtDbText: string | null;
  };
  activeArtifact: {
    id: string;
    tier: string;
    engine: string;
    model: string;
    batchId: string | null;
    txtSha256: string;
    htmlSha256: string;
    contentSha256: string;
  };
  replayCandidate: {
    id: string;
    batchId: string | null;
    providerResponseId: string;
    model: string;
    providerRawSha256: string;
    assembledSha256: string;
    reportTxtSha256: string;
    reportHtmlSha256: string;
    artifactContentSha256: string;
    reservationId: string;
    usageEventId: number;
    responsesSha256: string;
    actualCostUsd: number;
  };
  allAttempts: Array<{
    id: string;
    attemptNo: number;
    sourceKind: string;
    state: string;
    providerResponseId: string;
    reservationId: string;
    usageEventId: number;
  }>;
  completedLedgers: Array<{
    reservationId: string;
    usageEventId: number;
    providerResponseId: string;
    model: string;
    actualCostUsd: number;
  }>;
  sideEffects: { deliveryTracking: 0; deliveryClaims: 0; activeGenerationClaims: 0 };
  priorReplayProofs: 0;
}

interface LoadedReplayState {
  manifest: AlexandreOfflineReplayManifest;
  audit: any;
  activeArtifact: any;
  replayCandidate: any;
}

async function loadReplayState(db: Queryable, lockRows: boolean): Promise<LoadedReplayState> {
  const suffix = lockRows ? " FOR UPDATE" : "";
  const auditResult = await db.query(
    `SELECT id,email,responses,scores,narrative_report,report_txt,report_html,
            report_generated_at::text AS report_generated_at_db_text,
            report_delivery_status,report_sent_at
       FROM audits WHERE id=$1 AND type='GRATUIT'${suffix}`,
    [DISCOVERY_ALEXANDRE_OFFLINE_REPLAY_TARGET.auditId],
  );
  if ((auditResult.rowCount ?? 0) !== 1) throw new Error("ALEXANDRE_REPLAY_AUDIT_NOT_FOUND");
  const audit = auditResult.rows[0];
  const emailHash = discoveryAlexandreReplaySha256(String(audit.email || "").trim().toLowerCase());
  if (emailHash !== DISCOVERY_ALEXANDRE_OFFLINE_REPLAY_TARGET.emailSha256
    || audit.report_delivery_status !== DISCOVERY_ALEXANDRE_OFFLINE_REPLAY_TARGET.sourceStatus
    || audit.report_sent_at != null) {
    throw new Error("ALEXANDRE_REPLAY_EXACT_AUDIT_IDENTITY_MISMATCH");
  }

  const artifactResult = await db.query(
    `SELECT id,tier,engine,model,batch_id,txt,html,content_sha256
       FROM report_artifacts
      WHERE audit_id=$1 AND artifact_state='ACTIVE'${suffix}`,
    [DISCOVERY_ALEXANDRE_OFFLINE_REPLAY_TARGET.auditId],
  );
  if ((artifactResult.rowCount ?? 0) !== 1) throw new Error("ALEXANDRE_REPLAY_ACTIVE_ARTIFACT_COUNT_MISMATCH");
  const activeArtifact = artifactResult.rows[0];
  const currentTxt = String(audit.report_txt || "");
  const currentHtml = String(audit.report_html || "");
  if (!currentTxt || !currentHtml
    || String(activeArtifact.txt || "") !== currentTxt
    || String(activeArtifact.html || "") !== currentHtml
    || String(activeArtifact.content_sha256 || "") !== artifactContentSha256(currentTxt, currentHtml)) {
    throw new Error("ALEXANDRE_REPLAY_ACTIVE_ARTIFACT_AUDIT_MISMATCH");
  }

  const candidatesResult = await db.query(
    `SELECT id,batch_id,attempt_no,model,source_kind,state,provider_response_id,
            provider_raw,provider_raw_text,provider_raw_sha256,assembled_candidate,
            assembled_sha256,report_txt_sha256,report_html_sha256,
            artifact_content_sha256,reservation_id,usage_event_id,responses_sha256,
            actual_cost_usd
       FROM discovery_rejected_candidates
      WHERE audit_id=$1 ORDER BY attempt_no${suffix}`,
    [DISCOVERY_ALEXANDRE_OFFLINE_REPLAY_TARGET.auditId],
  );
  if ((candidatesResult.rowCount ?? 0) !== DISCOVERY_ALEXANDRE_OFFLINE_REPLAY_TARGET.attemptCount
    || candidatesResult.rows.map((row: any) => Number(row.attempt_no)).join(",") !== "1,2") {
    throw new Error("ALEXANDRE_REPLAY_CANDIDATE_CARDINALITY_MISMATCH");
  }
  const replayCandidate = candidatesResult.rows[1];
  if (Number(replayCandidate.attempt_no) !== DISCOVERY_ALEXANDRE_OFFLINE_REPLAY_TARGET.replayAttemptNo
    || replayCandidate.source_kind !== DISCOVERY_ALEXANDRE_OFFLINE_REPLAY_TARGET.replaySourceKind
    || replayCandidate.state !== DISCOVERY_ALEXANDRE_OFFLINE_REPLAY_TARGET.replayCandidateState
    || replayCandidate.assembled_candidate == null
    || replayCandidate.provider_raw_sha256 == null
    || replayCandidate.reservation_id == null
    || replayCandidate.usage_event_id == null
    || discoveryAlexandreReplaySha256(replayCandidate.assembled_candidate)
      !== String(replayCandidate.assembled_sha256 || "")
    || discoveryAlexandreReplaySha256(audit.responses || {})
      !== String(replayCandidate.responses_sha256 || "")) {
    throw new Error("ALEXANDRE_REPLAY_ATTEMPT2_PROOF_MISMATCH");
  }
  const providerRaw = replayCandidate.provider_raw ?? replayCandidate.provider_raw_text;
  if (providerRaw == null
    || discoveryAlexandreReplaySha256(providerRaw) !== String(replayCandidate.provider_raw_sha256)) {
    throw new Error("ALEXANDRE_REPLAY_PROVIDER_RAW_HASH_MISMATCH");
  }

  const ledgerResult = await db.query(
    `SELECT c.id AS candidate_id,r.id::text AS reservation_id,e.id::bigint AS usage_event_id,
            r.response_id AS provider_response_id,e.model,r.actual_cost_usd,
            e.estimated_openai_cost_usd,e.input_tokens,e.output_tokens,e.total_tokens
       FROM discovery_rejected_candidates c
       JOIN ai_cost_budget_reservations r
         ON r.id=c.reservation_id AND r.order_id=c.audit_id
        AND r.product='discovery' AND r.profile='discovery'
        AND r.status='COMPLETED' AND r.response_id=c.provider_response_id
       JOIN ai_usage_events e
         ON e.id=c.usage_event_id AND e.response_id=c.provider_response_id
        AND e.profile='discovery' AND e.status='completed'
      WHERE c.audit_id=$1 ORDER BY c.attempt_no${lockRows ? " FOR UPDATE OF r,e" : ""}`,
    [DISCOVERY_ALEXANDRE_OFFLINE_REPLAY_TARGET.auditId],
  );
  if ((ledgerResult.rowCount ?? 0) !== DISCOVERY_ALEXANDRE_OFFLINE_REPLAY_TARGET.completedLedgerCount) {
    throw new Error("ALEXANDRE_REPLAY_COMPLETED_LEDGER_COUNT_MISMATCH");
  }
  for (const row of ledgerResult.rows) {
    if (Number(row.total_tokens) !== Number(row.input_tokens) + Number(row.output_tokens)
      || Math.abs(Number(row.actual_cost_usd) - Number(row.estimated_openai_cost_usd)) > 0.000001) {
      throw new Error("ALEXANDRE_REPLAY_COMPLETED_LEDGER_VALUE_MISMATCH");
    }
  }

  const sideEffects = await db.query(
    `SELECT
       (SELECT COUNT(*)::int FROM email_tracking
         WHERE audit_id=$1 AND email_type IN ('sendReportReadyEmail','sendReportRegeneratedEmail')) AS delivery_tracking,
       (SELECT COUNT(*)::int FROM discovery_email_delivery_claims WHERE audit_id=$1) AS delivery_claims,
       (SELECT COUNT(*)::int FROM discovery_batch_items
         WHERE audit_id=$1 AND state IN ('CLAIMED','PROVIDER_STARTED','GENERATED','VALIDATED'))
         AS active_generation_claims,
       (SELECT COUNT(*)::int FROM ai_cost_budget_reservations
         WHERE order_id=$1 AND product='discovery' AND profile='discovery'
           AND status='COMPLETED') AS completed_reservations,
       (SELECT COUNT(*)::int FROM ai_usage_events e
         WHERE e.profile='discovery' AND e.status='completed'
           AND EXISTS (SELECT 1 FROM ai_cost_budget_reservations r
             WHERE r.order_id=$1 AND r.product='discovery' AND r.profile='discovery'
               AND r.status='COMPLETED' AND r.response_id=e.response_id)) AS completed_usage_events,
       (SELECT COUNT(*)::int FROM discovery_offline_replay_proofs WHERE audit_id=$1) AS prior_replay_proofs`,
    [DISCOVERY_ALEXANDRE_OFFLINE_REPLAY_TARGET.auditId],
  );
  const sideEffect = sideEffects.rows[0] || {};
  if (Number(sideEffect.delivery_tracking) !== 0 || Number(sideEffect.delivery_claims) !== 0
    || Number(sideEffect.active_generation_claims) !== 0 || Number(sideEffect.prior_replay_proofs) !== 0) {
    throw new Error("ALEXANDRE_REPLAY_SIDE_EFFECT_OR_PRIOR_PROOF_PRESENT");
  }
  if (Number(sideEffect.completed_reservations)
      !== DISCOVERY_ALEXANDRE_OFFLINE_REPLAY_TARGET.completedLedgerCount
    || Number(sideEffect.completed_usage_events)
      !== DISCOVERY_ALEXANDRE_OFFLINE_REPLAY_TARGET.completedLedgerCount) {
    throw new Error("ALEXANDRE_REPLAY_GLOBAL_LEDGER_CARDINALITY_MISMATCH");
  }

  const manifest: AlexandreOfflineReplayManifest = {
    schemaVersion: 2,
    operation: OPERATION,
    target: DISCOVERY_ALEXANDRE_OFFLINE_REPLAY_TARGET,
    audit: {
      responsesSha256: discoveryAlexandreReplaySha256(audit.responses || {}),
      scoresSha256: discoveryAlexandreReplaySha256(audit.scores || {}),
      narrativeSha256: discoveryAlexandreReplaySha256(audit.narrative_report),
      txtSha256: discoveryAlexandreReplaySha256(currentTxt),
      htmlSha256: discoveryAlexandreReplaySha256(currentHtml),
      reportGeneratedAtDbText: audit.report_generated_at_db_text == null
        ? null : String(audit.report_generated_at_db_text),
    },
    activeArtifact: {
      id: String(activeArtifact.id), tier: String(activeArtifact.tier),
      engine: String(activeArtifact.engine), model: String(activeArtifact.model),
      batchId: activeArtifact.batch_id == null ? null : String(activeArtifact.batch_id),
      txtSha256: discoveryAlexandreReplaySha256(String(activeArtifact.txt)),
      htmlSha256: discoveryAlexandreReplaySha256(String(activeArtifact.html)),
      contentSha256: String(activeArtifact.content_sha256),
    },
    replayCandidate: {
      id: String(replayCandidate.id),
      batchId: replayCandidate.batch_id == null ? null : String(replayCandidate.batch_id),
      providerResponseId: String(replayCandidate.provider_response_id),
      model: String(replayCandidate.model),
      providerRawSha256: String(replayCandidate.provider_raw_sha256),
      assembledSha256: String(replayCandidate.assembled_sha256),
      reportTxtSha256: String(replayCandidate.report_txt_sha256),
      reportHtmlSha256: String(replayCandidate.report_html_sha256),
      artifactContentSha256: String(replayCandidate.artifact_content_sha256),
      reservationId: String(replayCandidate.reservation_id),
      usageEventId: Number(replayCandidate.usage_event_id),
      responsesSha256: String(replayCandidate.responses_sha256),
      actualCostUsd: Number(replayCandidate.actual_cost_usd),
    },
    allAttempts: candidatesResult.rows.map((row: any) => ({
      id: String(row.id), attemptNo: Number(row.attempt_no), sourceKind: String(row.source_kind),
      state: String(row.state), providerResponseId: String(row.provider_response_id),
      reservationId: String(row.reservation_id), usageEventId: Number(row.usage_event_id),
    })),
    completedLedgers: ledgerResult.rows.map((row: any) => ({
      reservationId: String(row.reservation_id), usageEventId: Number(row.usage_event_id),
      providerResponseId: String(row.provider_response_id), model: String(row.model),
      actualCostUsd: Number(row.actual_cost_usd),
    })),
    sideEffects: { deliveryTracking: 0, deliveryClaims: 0, activeGenerationClaims: 0 },
    priorReplayProofs: 0,
  };
  return { manifest, audit, activeArtifact, replayCandidate };
}

export async function assertDiscoveryOfflineReplaySchemaV010(db: Queryable): Promise<void> {
  await assertDiscoveryBatchSchemaV009(db);
  const errors: string[] = [];
  const columns = await db.query(
    `SELECT column_name,is_nullable,data_type,udt_name,character_maximum_length,column_default
       FROM information_schema.columns
      WHERE table_schema=current_schema() AND table_name='discovery_offline_replay_proofs'`,
  );
  const columnMap = new Map(columns.rows.map((row: any) => [
    String(row.column_name),
    [String(row.data_type), String(row.udt_name), String(row.is_nullable),
      row.character_maximum_length == null ? "" : String(row.character_maximum_length),
      String(row.column_default || "").replace(/\s+/g, " ").trim()].join(":"),
  ]));
  const expectedColumns = new Map<string, string>([
    ["id", "uuid:uuid:NO::gen_random_uuid()"],
    ["operation", "text:text:NO::"],
    ["audit_id", "character varying:varchar:NO:36:"],
    ["candidate_id", "uuid:uuid:NO::"],
    ["source_artifact_id", "character varying:varchar:NO:36:"],
    ["replacement_artifact_id", "character varying:varchar:NO:36:"],
    ["reservation_id", "uuid:uuid:NO::"],
    ["usage_event_id", "bigint:int8:NO::"],
    ["provider_response_id", "text:text:NO::"],
    ["responses_sha256", "character:bpchar:NO:64:"],
    ["assembled_candidate_sha256", "character:bpchar:NO:64:"],
    ["report_txt_sha256", "character:bpchar:NO:64:"],
    ["report_html_sha256", "character:bpchar:NO:64:"],
    ["artifact_content_sha256", "character:bpchar:NO:64:"],
    ["catalog_provenance", "jsonb:jsonb:NO::"],
    ["catalog_provenance_sha256", "character:bpchar:NO:64:"],
    ["created_at", "timestamp with time zone:timestamptz:NO::now()"],
  ]);
  if (columnMap.size !== expectedColumns.size) errors.push("column_cardinality");
  for (const [name, expected] of expectedColumns) {
    if (columnMap.get(name) !== expected) errors.push(`column:${name}`);
  }
  const constraints = await db.query(
    `SELECT con.conname,con.contype,pg_get_constraintdef(con.oid,true) AS definition
       FROM pg_constraint con
       JOIN pg_class rel ON rel.oid=con.conrelid
       JOIN pg_namespace nsp ON nsp.oid=rel.relnamespace
      WHERE nsp.nspname=current_schema()
        AND rel.relname='discovery_offline_replay_proofs'
        AND con.contype IN ('p','u','c','f')`,
  );
  const constraintMap = new Map(constraints.rows.map((row: any) => [
    String(row.conname),
    `${String(row.contype)}:${String(row.definition || "").replace(/\s+/g, " ").trim()}`,
  ]));
  const expectedConstraints = new Map<string, string>([
    ["discovery_offline_replay_proofs_pkey", "p:PRIMARY KEY (id)"],
    ["discovery_offline_replay_proofs_candidate_id_key", "u:UNIQUE (candidate_id)"],
    ["discovery_offline_replay_proofs_replacement_artifact_id_key", "u:UNIQUE (replacement_artifact_id)"],
    ["discovery_offline_replay_operation_check", "c:CHECK (operation = 'ALEXANDRE_ATTEMPT2_CANONICAL_REPLAY'::text)"],
    ["discovery_offline_replay_artifact_distinct_check", "c:CHECK (source_artifact_id::text <> replacement_artifact_id::text)"],
    ["discovery_offline_replay_hashes_check", "c:CHECK (responses_sha256 ~ '^[a-f0-9]{64}$'::text AND assembled_candidate_sha256 ~ '^[a-f0-9]{64}$'::text AND report_txt_sha256 ~ '^[a-f0-9]{64}$'::text AND report_html_sha256 ~ '^[a-f0-9]{64}$'::text AND artifact_content_sha256 ~ '^[a-f0-9]{64}$'::text AND catalog_provenance_sha256 ~ '^[a-f0-9]{64}$'::text)"],
    ["discovery_offline_replay_provenance_check", "c:CHECK (jsonb_typeof(catalog_provenance) = 'object'::text AND catalog_provenance_sha256::text = encode(digest(convert_to(catalog_provenance::text, 'UTF8'::name), 'sha256'::text), 'hex'::text))"],
    ["discovery_offline_replay_proofs_audit_id_fkey", "f:FOREIGN KEY (audit_id) REFERENCES audits(id) ON DELETE RESTRICT"],
    ["discovery_offline_replay_proofs_candidate_id_fkey", "f:FOREIGN KEY (candidate_id) REFERENCES discovery_rejected_candidates(id) ON DELETE RESTRICT"],
    ["discovery_offline_replay_proofs_source_artifact_id_fkey", "f:FOREIGN KEY (source_artifact_id) REFERENCES report_artifacts(id) ON DELETE RESTRICT"],
    ["discovery_offline_replay_proofs_replacement_artifact_id_fkey", "f:FOREIGN KEY (replacement_artifact_id) REFERENCES report_artifacts(id) ON DELETE RESTRICT"],
    ["discovery_offline_replay_proofs_reservation_id_fkey", "f:FOREIGN KEY (reservation_id) REFERENCES ai_cost_budget_reservations(id) ON DELETE RESTRICT"],
    ["discovery_offline_replay_proofs_usage_event_id_fkey", "f:FOREIGN KEY (usage_event_id) REFERENCES ai_usage_events(id) ON DELETE RESTRICT"],
  ]);
  if (constraintMap.size !== expectedConstraints.size) errors.push("constraint_cardinality");
  for (const [name, expected] of expectedConstraints) {
    if (constraintMap.get(name) !== expected) errors.push(`constraint:${name}`);
  }
  const physical = await db.query(
    `SELECT t.tgenabled,pg_get_triggerdef(t.oid,true) AS trigger_definition,
            p.prosrc,p.prosecdef,p.provolatile,l.lanname,p.prorettype::regtype::text AS return_type,
            current_schema() AS schema_name,
            (SELECT indexdef FROM pg_indexes
              WHERE schemaname=current_schema()
                AND indexname='discovery_offline_replay_audit_operation_uq') AS indexdef
       FROM pg_trigger t
       JOIN pg_class c ON c.oid=t.tgrelid
       JOIN pg_proc p ON p.oid=t.tgfoid
       JOIN pg_language l ON l.oid=p.prolang
      WHERE c.relnamespace=current_schema()::regnamespace
        AND c.relname='discovery_offline_replay_proofs'
        AND t.tgname='discovery_offline_replay_append_only' AND NOT t.tgisinternal`,
  );
  const row = physical.rows[0] || {};
  const triggerDefinition = String(row.trigger_definition || "").replace(/\s+/g, " ").trim();
  const functionBody = String(row.prosrc || "").replace(/\s+/g, " ").trim();
  const expectedTriggerDefinition = "CREATE TRIGGER discovery_offline_replay_append_only BEFORE DELETE OR UPDATE ON discovery_offline_replay_proofs FOR EACH ROW EXECUTE FUNCTION enforce_discovery_offline_replay_append_only()";
  const expectedFunctionBody = `BEGIN
    RAISE EXCEPTION 'DISCOVERY_OFFLINE_REPLAY_PROOF_APPEND_ONLY'
      USING ERRCODE = '55000';
  END;`.replace(/\s+/g, " ").trim();
  const expectedIndexDefinition = `CREATE UNIQUE INDEX discovery_offline_replay_audit_operation_uq ON ${String(row.schema_name || "")}.discovery_offline_replay_proofs USING btree (audit_id, operation)`;
  if ((physical.rowCount ?? 0) !== 1 || row.tgenabled !== "O"
    || triggerDefinition !== expectedTriggerDefinition
    || functionBody !== expectedFunctionBody
    || row.prosecdef !== false || row.provolatile !== "v" || row.lanname !== "plpgsql"
    || row.return_type !== "trigger"
    || String(row.indexdef || "").replace(/\s+/g, " ").trim() !== expectedIndexDefinition) {
    errors.push("append_only_physical_gate");
  }
  if (errors.length > 0) {
    throw new Error(`DISCOVERY_OFFLINE_REPLAY_SCHEMA_V010_REQUIRED:${errors.join("|")}`);
  }
}

export async function inspectExactAlexandreOfflineReplay(
  db: Queryable,
): Promise<{ manifest: AlexandreOfflineReplayManifest; manifestSha256: string }> {
  await assertDiscoveryOfflineReplaySchemaV010(db);
  const { manifest } = await loadReplayState(db, false);
  return { manifest, manifestSha256: discoveryAlexandreReplaySha256(manifest) };
}

export async function acquireAlexandreOfflineReplayLock(
  pool: PoolLike,
): Promise<{ token: string; expiresAt: Date }> {
  const client = await pool.connect();
  const token = randomUUID();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", ["discovery-automation-fence-v1"]);
    const inFlight = await client.query(
      `SELECT
         EXISTS (SELECT 1 FROM ai_cost_budget_reservations
           WHERE product='discovery' AND status IN ('RESERVED','UNCERTAIN')) AS provider_in_flight,
         EXISTS (SELECT 1 FROM discovery_email_delivery_claims
           WHERE state IN ('CLAIMED','PROVIDER_POST_STARTED','AMBIGUOUS')) AS delivery_in_flight,
         EXISTS (SELECT 1 FROM discovery_batch_items i
           JOIN discovery_batch_runs b ON b.id=i.batch_id
          WHERE b.stage IN ('GENERATION','REGENERATION') AND i.provider_calls=1
            AND i.state IN ('PROVIDER_STARTED','GENERATED','VALIDATED')) AS provider_result_unsettled`,
    );
    if (inFlight.rows[0]?.provider_in_flight || inFlight.rows[0]?.delivery_in_flight
      || inFlight.rows[0]?.provider_result_unsettled) {
      throw new Error("ALEXANDRE_REPLAY_IN_FLIGHT_OPERATION");
    }
    const acquired = await client.query(
      `INSERT INTO discovery_operation_lock
         (lock_key,owner,token,purpose,acquired_at,refreshed_at,expires_at)
       VALUES ($1,$2,$3,$4,NOW(),NOW(),NOW()+INTERVAL '20 minutes')
       ON CONFLICT (lock_key) DO UPDATE SET owner=EXCLUDED.owner,token=EXCLUDED.token,
         purpose=EXCLUDED.purpose,acquired_at=NOW(),refreshed_at=NOW(),expires_at=EXCLUDED.expires_at
       WHERE discovery_operation_lock.expires_at<=NOW()
       RETURNING token,expires_at`,
      [LOCK_KEY, `alexandre-offline-replay:${process.pid}`, token,
        "one-shot:alexandre-attempt2-canonical-offline-replay"],
    );
    if ((acquired.rowCount ?? 0) !== 1) throw new Error("ALEXANDRE_REPLAY_GLOBAL_LOCK_BUSY");
    await client.query("COMMIT");
    return { token: String(acquired.rows[0].token), expiresAt: new Date(acquired.rows[0].expires_at) };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

export async function releaseAlexandreOfflineReplayLock(
  pool: PoolLike,
  token: string,
): Promise<boolean> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", ["discovery-automation-fence-v1"]);
    const released = await client.query(
      `UPDATE discovery_operation_lock
          SET refreshed_at=NOW(),expires_at=GREATEST(NOW(),acquired_at+INTERVAL '1 microsecond')
        WHERE lock_key=$1 AND token=$2 RETURNING token`,
      [LOCK_KEY, token],
    );
    await client.query("COMMIT");
    return (released.rowCount ?? 0) === 1;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

export async function replayExactAlexandreDiscoveryOffline(input: {
  lockToken: string;
  expectedManifestSha256: string;
}, pool: PoolLike): Promise<{
  auditId: string;
  artifactId: string;
  supersedesArtifactId: string;
  manifestSha256: string;
  status: "BATCH_READY";
  providerCalls: 0;
  emailsSent: 0;
}> {
  if (!/^[a-f0-9]{64}$/.test(input.expectedManifestSha256)) {
    throw new Error("ALEXANDRE_REPLAY_EXPECTED_MANIFEST_SHA256_REQUIRED");
  }
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", ["discovery-automation-fence-v1"]);
    await assertDiscoveryOfflineReplaySchemaV010(client);
    const lock = await client.query(
      `SELECT 1 FROM discovery_operation_lock
        WHERE lock_key=$1 AND token=$2 AND expires_at>NOW() FOR UPDATE`,
      [LOCK_KEY, input.lockToken],
    );
    if ((lock.rowCount ?? 0) !== 1) throw new Error("ALEXANDRE_REPLAY_GLOBAL_LOCK_NOT_OWNED");

    const loaded = await loadReplayState(client, true);
    const manifestSha256 = discoveryAlexandreReplaySha256(loaded.manifest);
    if (manifestSha256 !== input.expectedManifestSha256) {
      throw new Error("ALEXANDRE_REPLAY_MANIFEST_CAS_MISMATCH");
    }
    const candidateReport = loaded.replayCandidate.assembled_candidate as Record<string, any>;
    const catalogProvenance = candidateReport?.analysisMetadata?.catalogProvenance;
    const generatedAt = String(candidateReport?.generatedAt || "");
    const rebuilt = reconstructDiscoveryCatalogReport({
      responses: loaded.audit.responses || {},
      catalogProvenance,
      expectedProviderResponseId: loaded.manifest.replayCandidate.providerResponseId,
      generatedAt,
    });
    const gate = evaluateDiscoveryDeliveryGate(
      rebuilt.narrativeReport,
      { txt: rebuilt.txt, html: rebuilt.html },
      new Date(),
      rebuilt.narrativeReport.analysisMetadata,
    );
    if (!gate.ok || gate.errors.length > 0) {
      throw new Error(`ALEXANDRE_REPLAY_DELIVERY_GATE_FAILED:${gate.errors.join("|")}`);
    }
    const finalNarrative = attachDiscoveryDeliveryGateResult(rebuilt.narrativeReport as any, gate);
    const persistence = validateDiscoveryPersistenceContract({
      narrativeReport: finalNarrative, scores: rebuilt.scores,
      txt: rebuilt.txt, html: rebuilt.html, responses: loaded.audit.responses || {},
    });
    const factual = validateDiscoveryReportAgainstResponses(
      finalNarrative, loaded.audit.responses || {}, rebuilt.narrativeReport.analysisMetadata,
    );
    const provenanceErrors = validateDiscoveryCatalogReportProvenance(
      finalNarrative as any,
      loaded.manifest.replayCandidate.providerResponseId,
    );
    if (!persistence.ok || !factual.ok || provenanceErrors.length > 0
      || !hasPassingPersistedDiscoveryDeliveryGate(finalNarrative)) {
      throw new Error(`ALEXANDRE_REPLAY_FULL_GATE_FAILED:${[
        ...persistence.errors, ...factual.errors, ...provenanceErrors,
      ].join("|")}`);
    }

    const nextTxtSha256 = discoveryAlexandreReplaySha256(rebuilt.txt);
    const nextHtmlSha256 = discoveryAlexandreReplaySha256(rebuilt.html);
    const nextContentSha256 = artifactContentSha256(rebuilt.txt, rebuilt.html);
    const source = loaded.manifest.activeArtifact;
    const superseded = await client.query(
      `UPDATE report_artifacts
          SET artifact_state='SUPERSEDED',superseded_at=NOW()
        WHERE id=$1 AND audit_id=$2 AND artifact_state='ACTIVE'
          AND txt IS NOT DISTINCT FROM $3 AND html IS NOT DISTINCT FROM $4
          AND content_sha256=$5
          AND EXISTS (SELECT 1 FROM discovery_operation_lock
            WHERE lock_key=$6 AND token=$7 AND expires_at>NOW())
        RETURNING id`,
      [source.id, DISCOVERY_ALEXANDRE_OFFLINE_REPLAY_TARGET.auditId,
        loaded.activeArtifact.txt, loaded.activeArtifact.html, source.contentSha256,
        LOCK_KEY, input.lockToken],
    );
    if ((superseded.rowCount ?? 0) !== 1) throw new Error("ALEXANDRE_REPLAY_ARTIFACT_SUPERSEDE_CAS_FAILED");

    const artifactId = randomUUID();
    const insertedArtifact = await client.query(
      `INSERT INTO report_artifacts
         (id,audit_id,tier,engine,model,txt,html,content_sha256,batch_id,
          artifact_state,supersedes_artifact_id,created_at)
       SELECT $1::varchar(36),$2::varchar(36),$3,$4,$5,$6,$7,$8,NULL,'ACTIVE',
              $9::varchar(36),NOW()
        WHERE EXISTS (SELECT 1 FROM report_artifacts
          WHERE id=$9::varchar(36) AND audit_id=$2::varchar(36)
            AND artifact_state='SUPERSEDED'
            AND txt IS NOT DISTINCT FROM $10 AND html IS NOT DISTINCT FROM $11
            AND content_sha256=$12)
          AND EXISTS (SELECT 1 FROM discovery_operation_lock
            WHERE lock_key=$13 AND token=$14 AND expires_at>NOW())
       RETURNING id`,
      [artifactId, DISCOVERY_ALEXANDRE_OFFLINE_REPLAY_TARGET.auditId,
        source.tier, source.engine, loaded.manifest.replayCandidate.model,
        rebuilt.txt, rebuilt.html, nextContentSha256, source.id,
        loaded.activeArtifact.txt, loaded.activeArtifact.html, source.contentSha256,
        LOCK_KEY, input.lockToken],
    );
    if ((insertedArtifact.rowCount ?? 0) !== 1) throw new Error("ALEXANDRE_REPLAY_ARTIFACT_INSERT_CAS_FAILED");

    const updatedAudit = await client.query(
      `UPDATE audits
          SET narrative_report=$2::jsonb,scores=$3::jsonb,report_txt=$4,report_html=$5,
              report_generated_at=$6::timestamptz,report_delivery_status='BATCH_READY'
        WHERE id=$1 AND type='GRATUIT' AND report_sent_at IS NULL
          AND report_delivery_status='BATCH_REVIEW'
          AND responses IS NOT DISTINCT FROM $7::jsonb
          AND scores IS NOT DISTINCT FROM $8::jsonb
          AND narrative_report IS NOT DISTINCT FROM $9::jsonb
          AND report_txt IS NOT DISTINCT FROM $10
          AND report_html IS NOT DISTINCT FROM $11
          AND report_generated_at::text IS NOT DISTINCT FROM $12::text
          AND EXISTS (SELECT 1 FROM discovery_operation_lock
            WHERE lock_key=$13 AND token=$14 AND expires_at>NOW())
        RETURNING id`,
      [DISCOVERY_ALEXANDRE_OFFLINE_REPLAY_TARGET.auditId, JSON.stringify(finalNarrative),
        JSON.stringify(rebuilt.scores), rebuilt.txt, rebuilt.html, generatedAt,
        JSON.stringify(loaded.audit.responses),
        loaded.audit.scores == null ? null : JSON.stringify(loaded.audit.scores),
        loaded.audit.narrative_report == null ? null : JSON.stringify(loaded.audit.narrative_report),
        loaded.audit.report_txt,
        loaded.audit.report_html, loaded.audit.report_generated_at_db_text, LOCK_KEY, input.lockToken],
    );
    if ((updatedAudit.rowCount ?? 0) !== 1) throw new Error("ALEXANDRE_REPLAY_AUDIT_CAS_FAILED");

    const provenance = normalizeDiscoveryCatalogProvenanceForLedger(catalogProvenance);
    if (!provenance) throw new Error("ALEXANDRE_REPLAY_LEDGER_PROVENANCE_INVALID");
    const proof = await client.query(
      `INSERT INTO discovery_offline_replay_proofs
         (id,operation,audit_id,candidate_id,source_artifact_id,replacement_artifact_id,
          reservation_id,usage_event_id,provider_response_id,responses_sha256,
          assembled_candidate_sha256,report_txt_sha256,report_html_sha256,
          artifact_content_sha256,catalog_provenance,catalog_provenance_sha256)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15::jsonb,
         encode(digest(convert_to(($15::jsonb)::text,'UTF8'),'sha256'),'hex'))
       RETURNING id`,
      [randomUUID(), OPERATION, DISCOVERY_ALEXANDRE_OFFLINE_REPLAY_TARGET.auditId,
        loaded.manifest.replayCandidate.id, source.id, artifactId,
        loaded.manifest.replayCandidate.reservationId,
        loaded.manifest.replayCandidate.usageEventId,
        loaded.manifest.replayCandidate.providerResponseId,
        loaded.manifest.audit.responsesSha256,
        loaded.manifest.replayCandidate.assembledSha256,
        nextTxtSha256, nextHtmlSha256, nextContentSha256, JSON.stringify(provenance)],
    );
    if ((proof.rowCount ?? 0) !== 1) throw new Error("ALEXANDRE_REPLAY_PROOF_INSERT_FAILED");

    const canonical = resolveCanonicalDiscoveryArtifacts({
      narrativeReport: finalNarrative, reportTxt: rebuilt.txt, reportHtml: rebuilt.html,
      reportArtifacts: [{ txt: rebuilt.txt, html: rebuilt.html, contentSha256: nextContentSha256 }],
    });
    const canonicalGate = evaluateCanonicalDiscoveryArtifacts(canonical);
    const ledgerBound = await hasDiscoveryCatalogLedgerBinding(client,
      DISCOVERY_ALEXANDRE_OFFLINE_REPLAY_TARGET.auditId,
      { id: artifactId, batchId: null, model: loaded.manifest.replayCandidate.model,
        txt: rebuilt.txt, html: rebuilt.html, contentSha256: nextContentSha256 },
      catalogProvenance);
    if (!canonicalGate.ok || !ledgerBound) throw new Error("ALEXANDRE_REPLAY_POSTFLIGHT_GATE_FAILED");

    await client.query("COMMIT");
    return {
      auditId: DISCOVERY_ALEXANDRE_OFFLINE_REPLAY_TARGET.auditId,
      artifactId,
      supersedesArtifactId: source.id,
      manifestSha256,
      status: "BATCH_READY",
      providerCalls: 0,
      emailsSent: 0,
    };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}
