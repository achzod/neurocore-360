import type { Pool, PoolClient } from "pg";

type Queryable = Pick<Pool | PoolClient, "query">;

export const DISCOVERY_BATCH_SCHEMA_VERSION = 11;

const REQUIRED_COLUMNS = Object.freeze([
  ["discovery_batch_items", "expected_source_status", "text", "YES"],
  ["discovery_email_delivery_claims", "fence_token", "uuid", "YES"],
] as const);

const REQUIRED_INDEXES = Object.freeze([
  "discovery_batch_runs_pkey",
  "discovery_batch_items_pkey",
  "discovery_batch_items_batch_id_sequence_no_key",
  "discovery_batch_items_provider_response_id_key",
  "discovery_batch_items_state_idx",
  "discovery_email_delivery_claims_pkey",
  "discovery_email_delivery_claims_audit_id_email_type_key",
  "discovery_email_delivery_claims_provider_task_id_key",
  "discovery_email_delivery_claims_batch_idx",
  "discovery_email_delivery_claims_state_idx",
  "discovery_operation_lock_pkey",
  "discovery_operation_lock_token_key",
  "report_artifacts_pkey",
  "report_artifacts_audit_content_uq",
] as const);

const REQUIRED_CONSTRAINTS = Object.freeze([
  ["discovery_operation_lock_pkey", "p"],
  ["discovery_operation_lock_token_key", "u"],
  ["discovery_operation_lock_lock_key_check", "c"],
  ["discovery_operation_lock_check", "c"],
  ["discovery_batch_runs_pkey", "p"],
  ["discovery_batch_runs_status_check", "c"],
  ["discovery_batch_runs_stage_check", "c"],
  ["discovery_batch_runs_tier_check", "c"],
  ["discovery_batch_runs_soft_per_scan_usd_check", "c"],
  ["discovery_batch_runs_check", "c"],
  ["discovery_batch_runs_global_budget_usd_check", "c"],
  ["discovery_batch_runs_reserved_cost_usd_check", "c"],
  ["discovery_batch_runs_actual_cost_usd_check", "c"],
  ["discovery_batch_runs_target_count_check", "c"],
  ["discovery_batch_runs_check1", "c"],
  ["discovery_batch_items_pkey", "p"],
  ["discovery_batch_items_batch_id_sequence_no_key", "u"],
  ["discovery_batch_items_provider_response_id_key", "u"],
  ["discovery_batch_items_batch_id_fkey", "f"],
  ["discovery_batch_items_cohort_check", "c"],
  ["discovery_batch_items_state_check", "c"],
  ["discovery_batch_items_provider_calls_check", "c"],
  ["discovery_batch_items_reserved_cost_usd_check", "c"],
  ["discovery_batch_items_actual_cost_usd_check", "c"],
  ["discovery_email_delivery_claims_pkey", "p"],
  ["discovery_email_delivery_claims_audit_id_email_type_key", "u"],
  ["discovery_email_delivery_claims_provider_task_id_key", "u"],
  ["discovery_email_delivery_claims_batch_id_fkey", "f"],
  ["discovery_email_delivery_claims_state_check", "c"],
  ["report_artifacts_pkey", "p"],
  ["report_artifacts_batch_id_fkey", "f"],
] as const);

const REQUIRED_FOREIGN_KEYS = Object.freeze([
  ["discovery_batch_items", "discovery_batch_items_batch_id_fkey", "discovery_batch_runs"],
  ["discovery_email_delivery_claims", "discovery_email_delivery_claims_batch_id_fkey", "discovery_batch_runs"],
  ["report_artifacts", "report_artifacts_batch_id_fkey", "discovery_batch_runs"],
] as const);

/**
 * Fail-closed physical schema gate for every Discovery batch CLI.  This checks
 * PostgreSQL's catalog instead of trusting a migration filename or a deploy
 * marker, so a partial/rolled-back migration cannot reach a side-effecting
 * operation.
 */
export async function assertDiscoveryBatchSchemaV005(db: Queryable): Promise<void> {
  const columns = await db.query(
    `SELECT table_name, column_name, data_type, is_nullable
       FROM information_schema.columns
      WHERE table_schema = current_schema()
        AND (table_name, column_name) IN (
          ('discovery_batch_items', 'expected_source_status'),
          ('discovery_email_delivery_claims', 'fence_token')
        )`,
  );
  const columnMap = new Map(
    columns.rows.map((row: any) => [`${row.table_name}.${row.column_name}`, row]),
  );
  const errors: string[] = [];
  for (const [table, column, type, nullable] of REQUIRED_COLUMNS) {
    const row = columnMap.get(`${table}.${column}`);
    if (!row) errors.push(`missing_column:${table}.${column}`);
    else if (row.data_type !== type || row.is_nullable !== nullable) {
      errors.push(`invalid_column:${table}.${column}:${row.data_type}:${row.is_nullable}`);
    }
  }

  const indexes = await db.query(
    `SELECT indexname, indexdef
       FROM pg_indexes
      WHERE schemaname = current_schema()
        AND indexname = ANY($1::text[])`,
    [[...REQUIRED_INDEXES]],
  );
  const indexMap = new Map(indexes.rows.map((row: any) => [String(row.indexname), String(row.indexdef)]));
  for (const index of REQUIRED_INDEXES) {
    if (!indexMap.has(index)) errors.push(`missing_index:${index}`);
  }
  const artifactIndex = indexMap.get("report_artifacts_audit_content_uq") || "";
  if (artifactIndex && (!/UNIQUE INDEX/.test(artifactIndex)
    || !/WHERE \(content_sha256 IS NOT NULL\)/.test(artifactIndex))) {
    errors.push("invalid_index:report_artifacts_audit_content_uq");
  }
  const runUniqueness = await db.query(
    `SELECT
       EXISTS (
         SELECT 1 FROM pg_constraint con
         JOIN pg_class rel ON rel.oid=con.conrelid
         JOIN pg_namespace nsp ON nsp.oid=rel.relnamespace
         WHERE nsp.nspname=current_schema()
           AND rel.relname='discovery_batch_runs'
           AND con.conname='discovery_batch_runs_manifest_sha256_stage_tier_key'
           AND con.contype='u'
       ) AS legacy_unique,
       EXISTS (
         SELECT 1 FROM pg_indexes
         WHERE schemaname=current_schema()
           AND tablename='discovery_batch_runs'
           AND indexname='discovery_batch_runs_manifest_stage_tier_idx'
       ) AS resumable_index`,
  );
  if (!runUniqueness.rows[0]?.legacy_unique && !runUniqueness.rows[0]?.resumable_index) {
    errors.push("missing_index:discovery_batch_runs_manifest_stage_tier_idx");
  }

  const foreignKeys = await db.query(
    `SELECT source.relname AS table_name, con.conname,
            target.relname AS referenced_table
       FROM pg_constraint con
       JOIN pg_class source ON source.oid = con.conrelid
       JOIN pg_namespace nsp ON nsp.oid = source.relnamespace
       JOIN pg_class target ON target.oid = con.confrelid
      WHERE nsp.nspname = current_schema()
        AND con.contype = 'f'
        AND con.conname = ANY($1::text[])`,
    [REQUIRED_FOREIGN_KEYS.map(([, constraint]) => constraint)],
  );
  const foreignKeyMap = new Map(
    foreignKeys.rows.map((row: any) => [`${row.table_name}.${row.conname}`, row.referenced_table]),
  );
  for (const [table, constraint, target] of REQUIRED_FOREIGN_KEYS) {
    if (foreignKeyMap.get(`${table}.${constraint}`) !== target) {
      errors.push(`missing_foreign_key:${table}.${constraint}->${target}`);
    }
  }

  const constraints = await db.query(
    `SELECT con.conname, con.contype
       FROM pg_constraint con
       JOIN pg_class source ON source.oid = con.conrelid
       JOIN pg_namespace nsp ON nsp.oid = source.relnamespace
      WHERE nsp.nspname = current_schema()
        AND con.conname = ANY($1::text[])`,
    [REQUIRED_CONSTRAINTS.map(([constraint]) => constraint)],
  );
  const constraintMap = new Map(
    constraints.rows.map((row: any) => [String(row.conname), String(row.contype)]),
  );
  for (const [constraint, type] of REQUIRED_CONSTRAINTS) {
    if (constraintMap.get(constraint) !== type) {
      errors.push(`missing_constraint:${constraint}:${type}`);
    }
  }

  if (errors.length > 0) {
    throw new Error(`DISCOVERY_BATCH_SCHEMA_V005_REQUIRED:${errors.join("|")}`);
  }
}

/** Physical gate for the rejected-candidate quarantine and bounded retry. */
export async function assertDiscoveryBatchSchemaV006(db: Queryable): Promise<void> {
  await assertDiscoveryBatchSchemaV005(db);
  const columns = await db.query(
    `SELECT table_name,column_name,data_type,is_nullable,character_maximum_length,column_default
       FROM information_schema.columns
      WHERE table_schema=current_schema()
        AND (table_name IN ('discovery_rejected_candidates','discovery_batch_incidents')
          OR (table_name='discovery_batch_items' AND column_name IN
            ('retry_of_candidate_id','provider_reservation_id','provider_usage_event_id'))
          OR (table_name='discovery_batch_runs' AND column_name='approval_expires_at'))`,
  );
  const expected = new Map<string, string>([
    ["discovery_batch_runs.approval_expires_at", "timestamp with time zone:NO::"],
    ["discovery_batch_items.retry_of_candidate_id", "uuid:YES::"],
    ["discovery_batch_items.provider_reservation_id", "uuid:YES::"],
    ["discovery_batch_items.provider_usage_event_id", "bigint:YES::"],
    ["discovery_rejected_candidates.id", "uuid:NO::gen_random_uuid()"],
    ["discovery_rejected_candidates.batch_id", "uuid:YES::"],
    ["discovery_rejected_candidates.generation_claim_token", "uuid:YES::"],
    ["discovery_rejected_candidates.audit_id", "character varying:NO:36:"],
    ["discovery_rejected_candidates.provider_response_id", "text:NO::"],
    ["discovery_rejected_candidates.attempt_no", "integer:NO::"],
    ["discovery_rejected_candidates.model", "text:NO::"],
    ["discovery_rejected_candidates.source_kind", "text:NO::"],
    ["discovery_rejected_candidates.provider_raw", "jsonb:YES::"],
    ["discovery_rejected_candidates.provider_raw_text", "text:YES::"],
    ["discovery_rejected_candidates.assembled_candidate", "jsonb:YES::"],
    ["discovery_rejected_candidates.provider_raw_sha256", "character:YES:64:"],
    ["discovery_rejected_candidates.assembled_sha256", "character:YES:64:"],
    ["discovery_rejected_candidates.report_txt_sha256", "character:YES:64:"],
    ["discovery_rejected_candidates.report_html_sha256", "character:YES:64:"],
    ["discovery_rejected_candidates.artifact_content_sha256", "character:YES:64:"],
    ["discovery_rejected_candidates.artifact_id", "character varying:YES:36:"],
    ["discovery_rejected_candidates.reservation_id", "uuid:YES::"],
    ["discovery_rejected_candidates.usage_event_id", "bigint:YES::"],
    ["discovery_rejected_candidates.responses_sha256", "character:NO:64:"],
    ["discovery_rejected_candidates.validation_errors", "jsonb:NO::"],
    ["discovery_rejected_candidates.actual_cost_usd", "numeric:NO::"],
    ["discovery_rejected_candidates.state", "text:NO::'QUARANTINED'::text"],
    ["discovery_rejected_candidates.retried_by_batch_id", "uuid:YES::"],
    ["discovery_rejected_candidates.created_at", "timestamp with time zone:NO::now()"],
    ["discovery_rejected_candidates.updated_at", "timestamp with time zone:NO::now()"],
    ["discovery_batch_incidents.id", "uuid:NO::gen_random_uuid()"],
    ["discovery_batch_incidents.incident_key", "character:NO:64:"],
    ["discovery_batch_incidents.batch_id", "uuid:YES::"],
    ["discovery_batch_incidents.audit_id", "character varying:NO:36:"],
    ["discovery_batch_incidents.operation", "text:NO::"],
    ["discovery_batch_incidents.fence_token", "uuid:YES::"],
    ["discovery_batch_incidents.reservation_id", "uuid:YES::"],
    ["discovery_batch_incidents.usage_event_id", "bigint:YES::"],
    ["discovery_batch_incidents.error_code", "text:NO::"],
    ["discovery_batch_incidents.error_detail", "text:NO::"],
    ["discovery_batch_incidents.state", "text:NO::'OPEN'::text"],
    ["discovery_batch_incidents.created_at", "timestamp with time zone:NO::now()"],
    ["discovery_batch_incidents.updated_at", "timestamp with time zone:NO::now()"],
  ]);
  const errors: string[] = [];
  for (const row of columns.rows as any[]) {
    const key = `${row.table_name}.${row.column_name}`;
    const actual = `${row.data_type}:${row.is_nullable}:${row.character_maximum_length ?? ""}:${row.column_default ?? ""}`;
    const expectedActual = expected.get(key);
    if (expectedActual == null) continue;
    if (expectedActual !== actual) errors.push(`invalid_column:${key}:${actual}`);
    expected.delete(key);
  }
  for (const key of expected.keys()) errors.push(`missing_column:${key}`);

  const catalog = await db.query(
    `SELECT con.conname,con.contype,pg_get_constraintdef(con.oid,true) AS definition
       FROM pg_constraint con
       JOIN pg_class rel ON rel.oid=con.conrelid
       JOIN pg_namespace nsp ON nsp.oid=rel.relnamespace
      WHERE nsp.nspname=current_schema()
        AND con.conname = ANY($1::text[])`,
    [[
      "discovery_rejected_candidates_pkey",
      "discovery_rejected_candidates_provider_response_id_key",
      "discovery_rejected_candidates_batch_item_fkey",
      "discovery_rejected_candidates_origin_check",
      "discovery_rejected_candidates_retry_batch_fkey",
      "discovery_rejected_candidates_artifact_fkey",
      "discovery_rejected_candidates_reservation_fkey",
      "discovery_rejected_candidates_usage_fkey",
      "discovery_rejected_candidates_attempt_check",
      "discovery_rejected_candidates_cost_check",
      "discovery_rejected_candidates_source_check",
      "discovery_rejected_candidates_audit_attempt_key",
      "discovery_rejected_candidates_batch_audit_key",
      "discovery_rejected_candidates_claim_audit_key",
      "discovery_rejected_candidates_state_check",
      "discovery_rejected_candidates_errors_check",
      "discovery_rejected_candidates_payload_check",
      "discovery_rejected_candidates_ledger_check",
      "discovery_rejected_candidates_size_check",
      "discovery_batch_runs_stage_check",
      "discovery_batch_runs_approval_expiry_check",
      "discovery_batch_items_retry_of_candidate_id_fkey",
      "discovery_batch_items_provider_reservation_fkey",
      "discovery_batch_items_provider_usage_event_fkey",
      "discovery_batch_incidents_pkey",
      "discovery_batch_incidents_incident_key_key",
      "discovery_batch_incidents_batch_id_fkey",
      "discovery_batch_incidents_reservation_id_fkey",
      "discovery_batch_incidents_usage_event_id_fkey",
      "discovery_batch_incidents_operation_check",
      "discovery_batch_incidents_state_check",
      "discovery_batch_incidents_error_check",
    ]],
  );
  const normalize = (value: unknown) => String(value || "").replace(/\s+/g, " ").trim();
  const definitions = new Map(catalog.rows.map((row: any) => [
    String(row.conname), `${String(row.contype)}:${normalize(row.definition)}`,
  ]));
  const exact = new Map<string, string>([
    ["discovery_rejected_candidates_pkey", "p:PRIMARY KEY (id)"],
    ["discovery_rejected_candidates_provider_response_id_key", "u:UNIQUE (provider_response_id)"],
    ["discovery_rejected_candidates_batch_item_fkey", "f:FOREIGN KEY (batch_id, audit_id) REFERENCES discovery_batch_items(batch_id, audit_id) ON DELETE RESTRICT"],
    ["discovery_rejected_candidates_retry_batch_fkey", "f:FOREIGN KEY (retried_by_batch_id) REFERENCES discovery_batch_runs(id) ON DELETE RESTRICT"],
    ["discovery_rejected_candidates_artifact_fkey", "f:FOREIGN KEY (artifact_id) REFERENCES report_artifacts(id) ON DELETE RESTRICT"],
    ["discovery_rejected_candidates_reservation_fkey", "f:FOREIGN KEY (reservation_id) REFERENCES ai_cost_budget_reservations(id) ON DELETE RESTRICT"],
    ["discovery_rejected_candidates_usage_fkey", "f:FOREIGN KEY (usage_event_id) REFERENCES ai_usage_events(id) ON DELETE RESTRICT"],
    ["discovery_rejected_candidates_attempt_check", "c:CHECK (attempt_no >= 1 AND attempt_no <= 2)"],
    ["discovery_rejected_candidates_state_check", "c:CHECK (state = ANY (ARRAY['QUARANTINED'::text, 'RETRY_CLAIMED'::text, 'RETRY_AMBIGUOUS'::text, 'TERMINAL_REJECTED'::text, 'SUPERSEDED'::text]))"],
    ["discovery_rejected_candidates_errors_check", "c:CHECK (jsonb_typeof(validation_errors) = 'array'::text AND jsonb_array_length(validation_errors) > 0)"],
    ["discovery_rejected_candidates_cost_check", "c:CHECK (actual_cost_usd >= 0::numeric AND actual_cost_usd <= 0.75000000)"],
    ["discovery_rejected_candidates_source_check", "c:CHECK (source_kind = ANY (ARRAY['PROVIDER_REJECTED'::text, 'ASSEMBLED_UNRENDERED'::text, 'ASSEMBLED_REJECTED'::text, 'PROVIDER_RESULT_LOST'::text, 'LEGACY_LOST_CANDIDATE'::text, 'PERSISTED_INVALID_REPORT'::text]))"],
    ["discovery_rejected_candidates_origin_check", "c:CHECK ((source_kind = ANY (ARRAY['PROVIDER_REJECTED'::text, 'ASSEMBLED_UNRENDERED'::text, 'ASSEMBLED_REJECTED'::text, 'PROVIDER_RESULT_LOST'::text])) AND ((batch_id IS NOT NULL)::integer + (generation_claim_token IS NOT NULL)::integer) = 1 OR (source_kind = ANY (ARRAY['LEGACY_LOST_CANDIDATE'::text, 'PERSISTED_INVALID_REPORT'::text])) AND batch_id IS NULL AND generation_claim_token IS NULL)"],
    ["discovery_rejected_candidates_payload_check", "c:CHECK (source_kind = 'LEGACY_LOST_CANDIDATE'::text AND provider_raw IS NULL AND provider_raw_text IS NULL AND provider_raw_sha256 IS NULL AND assembled_candidate IS NULL AND assembled_sha256 IS NULL AND report_txt_sha256 IS NULL AND report_html_sha256 IS NULL AND artifact_content_sha256 IS NULL AND artifact_id IS NULL OR source_kind = 'PROVIDER_REJECTED'::text AND ((provider_raw IS NOT NULL)::integer + (provider_raw_text IS NOT NULL)::integer) = 1 AND provider_raw_sha256 IS NOT NULL AND assembled_candidate IS NULL AND assembled_sha256 IS NULL AND report_txt_sha256 IS NULL AND report_html_sha256 IS NULL AND artifact_content_sha256 IS NULL AND artifact_id IS NULL OR source_kind = 'PROVIDER_RESULT_LOST'::text AND provider_raw IS NULL AND provider_raw_text IS NULL AND provider_raw_sha256 IS NULL AND assembled_candidate IS NULL AND assembled_sha256 IS NULL AND report_txt_sha256 IS NULL AND report_html_sha256 IS NULL AND artifact_content_sha256 IS NULL AND artifact_id IS NULL OR source_kind = 'ASSEMBLED_REJECTED'::text AND ((provider_raw IS NOT NULL)::integer + (provider_raw_text IS NOT NULL)::integer) = 1 AND provider_raw_sha256 IS NOT NULL AND assembled_candidate IS NOT NULL AND assembled_sha256 IS NOT NULL AND report_txt_sha256 IS NOT NULL AND report_html_sha256 IS NOT NULL AND artifact_content_sha256 IS NOT NULL AND artifact_id IS NULL OR source_kind = 'ASSEMBLED_UNRENDERED'::text AND ((provider_raw IS NOT NULL)::integer + (provider_raw_text IS NOT NULL)::integer) = 1 AND provider_raw_sha256 IS NOT NULL AND assembled_candidate IS NOT NULL AND assembled_sha256 IS NOT NULL AND report_txt_sha256 IS NULL AND report_html_sha256 IS NULL AND artifact_content_sha256 IS NULL AND artifact_id IS NULL OR source_kind = 'PERSISTED_INVALID_REPORT'::text AND provider_raw IS NULL AND provider_raw_text IS NULL AND provider_raw_sha256 IS NULL AND assembled_candidate IS NOT NULL AND assembled_sha256 IS NOT NULL AND report_txt_sha256 IS NOT NULL AND report_html_sha256 IS NOT NULL AND artifact_content_sha256 IS NOT NULL AND artifact_id IS NOT NULL)"],
    ["discovery_rejected_candidates_ledger_check", "c:CHECK (reservation_id IS NOT NULL AND usage_event_id IS NOT NULL)"],
    ["discovery_rejected_candidates_size_check", "c:CHECK ((octet_length(COALESCE(provider_raw::text, provider_raw_text, ''::text)) + octet_length(COALESCE(assembled_candidate::text, ''::text))) <= 3000000)"],
    ["discovery_rejected_candidates_audit_attempt_key", "u:UNIQUE (audit_id, attempt_no)"],
    ["discovery_rejected_candidates_batch_audit_key", "u:UNIQUE (batch_id, audit_id)"],
    ["discovery_rejected_candidates_claim_audit_key", "u:UNIQUE (generation_claim_token, audit_id)"],
    ["discovery_batch_runs_stage_check", "c:CHECK (stage = ANY (ARRAY['GENERATION'::text, 'REGENERATION'::text, 'DELIVERY'::text]))"],
    ["discovery_batch_runs_approval_expiry_check", "c:CHECK (approval_expires_at > created_at AND approval_expires_at <= (created_at + '00:20:00'::interval))"],
    ["discovery_batch_items_retry_of_candidate_id_fkey", "f:FOREIGN KEY (retry_of_candidate_id) REFERENCES discovery_rejected_candidates(id) ON DELETE RESTRICT"],
    ["discovery_batch_items_provider_reservation_fkey", "f:FOREIGN KEY (provider_reservation_id) REFERENCES ai_cost_budget_reservations(id) ON DELETE RESTRICT"],
    ["discovery_batch_items_provider_usage_event_fkey", "f:FOREIGN KEY (provider_usage_event_id) REFERENCES ai_usage_events(id) ON DELETE RESTRICT"],
    ["discovery_batch_incidents_pkey", "p:PRIMARY KEY (id)"],
    ["discovery_batch_incidents_incident_key_key", "u:UNIQUE (incident_key)"],
    ["discovery_batch_incidents_batch_id_fkey", "f:FOREIGN KEY (batch_id) REFERENCES discovery_batch_runs(id) ON DELETE RESTRICT"],
    ["discovery_batch_incidents_reservation_id_fkey", "f:FOREIGN KEY (reservation_id) REFERENCES ai_cost_budget_reservations(id) ON DELETE RESTRICT"],
    ["discovery_batch_incidents_usage_event_id_fkey", "f:FOREIGN KEY (usage_event_id) REFERENCES ai_usage_events(id) ON DELETE RESTRICT"],
    ["discovery_batch_incidents_operation_check", "c:CHECK (operation = ANY (ARRAY['FAIL_BATCH_ITEM'::text, 'FAIL_CLAIMED_GENERATION'::text, 'PERSIST_BATCH_ITEM'::text, 'QUARANTINE_CANDIDATE'::text, 'ORPHAN_RECOVERY'::text]))"],
    ["discovery_batch_incidents_state_check", "c:CHECK (state = ANY (ARRAY['OPEN'::text, 'RESOLVED'::text]))"],
    ["discovery_batch_incidents_error_check", "c:CHECK (length(error_code) >= 1 AND length(error_code) <= 120 AND length(error_detail) >= 1 AND length(error_detail) <= 4000)"],
  ]);
  for (const [name, expectedDefinition] of exact) {
    const actualDefinition = definitions.get(name);
    const forwardCompatibleV008 = [
      "discovery_rejected_candidates_source_check",
      "discovery_rejected_candidates_origin_check",
      "discovery_rejected_candidates_payload_check",
    ].includes(name) && String(actualDefinition || "").includes("LEGACY_NARRATIVE_ONLY");
    const forwardCompatibleSizeV008 = name === "discovery_rejected_candidates_size_check"
      && String(actualDefinition || "").includes("legacy_narrative_json");
    if (actualDefinition !== expectedDefinition && !forwardCompatibleV008 && !forwardCompatibleSizeV008) {
      errors.push(`invalid_constraint:${name}`);
    }
  }
  const indexes = await db.query(
    `SELECT indexname,indexdef FROM pg_indexes
      WHERE schemaname=current_schema()
        AND indexname=ANY($1::text[])`,
    [["discovery_rejected_candidates_audit_state_idx", "discovery_batch_items_retry_candidate_uq",
      "discovery_batch_incidents_audit_state_idx"]],
  );
  const indexMap = new Map(indexes.rows.map((row: any) => [String(row.indexname), String(row.indexdef)]));
  const auditStateIndex = indexMap.get("discovery_rejected_candidates_audit_state_idx") || "";
  if (!/\(audit_id, state, attempt_no\)$/.test(auditStateIndex)) {
    errors.push("invalid_index:discovery_rejected_candidates_audit_state_idx");
  }
  const retryIndex = indexMap.get("discovery_batch_items_retry_candidate_uq") || "";
  if (!/UNIQUE INDEX/.test(retryIndex)
    || !/\(retry_of_candidate_id\)/.test(retryIndex)
    || !/WHERE \(retry_of_candidate_id IS NOT NULL\)/.test(retryIndex)) {
    errors.push("invalid_index:discovery_batch_items_retry_candidate_uq");
  }
  const incidentIndex = indexMap.get("discovery_batch_incidents_audit_state_idx") || "";
  if (!/\(audit_id, state, created_at\)$/.test(incidentIndex)) {
    errors.push("invalid_index:discovery_batch_incidents_audit_state_idx");
  }
  if (errors.length > 0) throw new Error(`DISCOVERY_BATCH_SCHEMA_V006_REQUIRED:${errors.join("|")}`);
}

/** Physical gate for append-only artifact version selection. */
export async function assertDiscoveryBatchSchemaV007(db: Queryable): Promise<void> {
  await assertDiscoveryBatchSchemaV006(db);
  const errors: string[] = [];
  const columns = await db.query(
    `SELECT column_name,data_type,is_nullable,character_maximum_length,column_default
       FROM information_schema.columns
      WHERE table_schema=current_schema()
        AND table_name='report_artifacts'
        AND column_name=ANY($1::text[])`,
    [["artifact_state", "superseded_at", "supersedes_artifact_id"]],
  );
  const actualColumns = new Map(columns.rows.map((row: any) => [
    String(row.column_name),
    `${row.data_type}:${row.is_nullable}:${row.character_maximum_length ?? ""}:${row.column_default ?? ""}`,
  ]));
  const expectedColumns = new Map<string, string>([
    ["artifact_state", "text:NO::'ACTIVE'::text"],
    ["superseded_at", "timestamp with time zone:YES::"],
    ["supersedes_artifact_id", "character varying:YES:36:"],
  ]);
  for (const [name, expected] of expectedColumns) {
    const actual = actualColumns.get(name);
    if (!actual) errors.push(`missing_column:report_artifacts.${name}`);
    else if (actual !== expected) errors.push(`invalid_column:report_artifacts.${name}:${actual}`);
  }

  const constraints = await db.query(
    `SELECT con.conname,con.contype,pg_get_constraintdef(con.oid,true) AS definition
       FROM pg_constraint con
       JOIN pg_class rel ON rel.oid=con.conrelid
       JOIN pg_namespace nsp ON nsp.oid=rel.relnamespace
      WHERE nsp.nspname=current_schema()
        AND rel.relname='report_artifacts'
        AND con.conname=ANY($1::text[])`,
    [[
      "report_artifacts_state_check",
      "report_artifacts_superseded_at_check",
      "report_artifacts_supersedes_fkey",
      "report_artifacts_not_self_superseding_check",
    ]],
  );
  const definitions = new Map(constraints.rows.map((row: any) => [
    String(row.conname),
    `${String(row.contype)}:${String(row.definition || "").replace(/\s+/g, " ").trim()}`,
  ]));
  const expectedConstraints = new Map<string, string>([
    ["report_artifacts_state_check", "c:CHECK (artifact_state = ANY (ARRAY['ACTIVE'::text, 'SUPERSEDED'::text]))"],
    ["report_artifacts_superseded_at_check", "c:CHECK (artifact_state = 'ACTIVE'::text AND superseded_at IS NULL OR artifact_state = 'SUPERSEDED'::text AND superseded_at IS NOT NULL)"],
    ["report_artifacts_supersedes_fkey", "f:FOREIGN KEY (supersedes_artifact_id) REFERENCES report_artifacts(id) ON DELETE RESTRICT"],
    ["report_artifacts_not_self_superseding_check", "c:CHECK (supersedes_artifact_id IS NULL OR supersedes_artifact_id::text <> id::text)"],
  ]);
  for (const [name, expected] of expectedConstraints) {
    if (definitions.get(name) !== expected) errors.push(`invalid_constraint:${name}`);
  }

  const indexes = await db.query(
    `SELECT indexname,indexdef
       FROM pg_indexes
      WHERE schemaname=current_schema()
        AND indexname=ANY($1::text[])`,
    [["report_artifacts_one_active_per_audit_uq", "report_artifacts_audit_history_idx"]],
  );
  const indexMap = new Map(indexes.rows.map((row: any) => [String(row.indexname), String(row.indexdef)]));
  const activeIndex = indexMap.get("report_artifacts_one_active_per_audit_uq") || "";
  if (!/UNIQUE INDEX/.test(activeIndex)
    || !/\(audit_id\)/.test(activeIndex)
    || !/WHERE \(artifact_state = 'ACTIVE'::text\)/.test(activeIndex)) {
    errors.push("invalid_index:report_artifacts_one_active_per_audit_uq");
  }
  const historyIndex = indexMap.get("report_artifacts_audit_history_idx") || "";
  if (!/\(audit_id, created_at DESC, id DESC\)$/.test(historyIndex)) {
    errors.push("invalid_index:report_artifacts_audit_history_idx");
  }

  const appendOnlyTrigger = await db.query(
    `SELECT trigger.tgenabled,
            pg_get_triggerdef(trigger.oid, true) AS trigger_definition,
            proc.prosrc AS function_body,
            proc.prosecdef,
            proc.provolatile,
            lang.lanname,
            proc.prorettype::regtype::text AS return_type
       FROM pg_trigger trigger
       JOIN pg_class rel ON rel.oid=trigger.tgrelid
       JOIN pg_namespace nsp ON nsp.oid=rel.relnamespace
       JOIN pg_proc proc ON proc.oid=trigger.tgfoid
       JOIN pg_language lang ON lang.oid=proc.prolang
      WHERE nsp.nspname=current_schema()
        AND rel.relname='report_artifacts'
        AND trigger.tgname='report_artifacts_append_only'
        AND NOT trigger.tgisinternal`,
  );
  if ((appendOnlyTrigger.rowCount ?? 0) !== 1) {
    errors.push("missing_trigger:report_artifacts_append_only");
  } else {
    const row = appendOnlyTrigger.rows[0] as any;
    const triggerDefinition = String(row.trigger_definition || "").replace(/\s+/g, " ").trim();
    const functionBody = String(row.function_body || "").replace(/\s+/g, " ").trim();
    const expectedFunctionBody = `BEGIN
      IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'REPORT_ARTIFACT_APPEND_ONLY_DELETE_BLOCKED'
          USING ERRCODE = '55000';
      END IF;
      IF OLD.artifact_state = 'ACTIVE'
         AND OLD.superseded_at IS NULL
         AND NEW.artifact_state = 'SUPERSEDED'
         AND NEW.superseded_at IS NOT NULL
         AND (to_jsonb(NEW) - 'artifact_state' - 'superseded_at')
             IS NOT DISTINCT FROM
             (to_jsonb(OLD) - 'artifact_state' - 'superseded_at') THEN
        RETURN NEW;
      END IF;
      RAISE EXCEPTION 'REPORT_ARTIFACT_APPEND_ONLY_UPDATE_BLOCKED'
        USING ERRCODE = '55000';
      END;`.replace(/\s+/g, " ").trim();
    if (String(row.tgenabled) !== "O"
      || triggerDefinition !== "CREATE TRIGGER report_artifacts_append_only BEFORE DELETE OR UPDATE ON report_artifacts FOR EACH ROW EXECUTE FUNCTION enforce_report_artifacts_append_only()") {
      errors.push("invalid_trigger:report_artifacts_append_only");
    }
    if (functionBody !== expectedFunctionBody
      || row.prosecdef !== false
      || String(row.provolatile) !== "v"
      || String(row.lanname) !== "plpgsql"
      || String(row.return_type) !== "trigger") {
      errors.push("invalid_function:enforce_report_artifacts_append_only");
    }
  }
  if (errors.length > 0) throw new Error(`DISCOVERY_BATCH_SCHEMA_V007_REQUIRED:${errors.join("|")}`);
}

/** Physical gate for exact, immutable legacy narrative replay provenance. */
export async function assertDiscoveryBatchSchemaV008(db: Queryable): Promise<void> {
  await assertDiscoveryBatchSchemaV007(db);
  const errors: string[] = [];
  const pgcrypto = await db.query(
    `SELECT EXISTS(
       SELECT 1 FROM pg_extension ext WHERE ext.extname='pgcrypto'
     ) AS extension_present,
     to_regprocedure('digest(bytea,text)')::text AS digest_signature`,
  );
  if (pgcrypto.rows[0]?.extension_present !== true) {
    errors.push("missing_extension:pgcrypto");
  } else if (String(pgcrypto.rows[0]?.digest_signature || "") !== "digest(bytea,text)") {
    errors.push("unavailable_function:pgcrypto.digest");
  } else {
    const digestGate = await db.query(
      `SELECT encode(
         digest(convert_to('discovery-pgcrypto-gate', 'UTF8'), 'sha256'),
         'hex'
       ) AS sha256`,
    );
    if (String(digestGate.rows[0]?.sha256 || "")
      !== "4b3ea3e75d374edcde010d4dc06734450d7acd4c29dea2ed802de31fa791fc3c") {
      errors.push("invalid_digest:pgcrypto.sha256");
    }
  }
  const columns = await db.query(
    `SELECT column_name,data_type,is_nullable,character_maximum_length,column_default
       FROM information_schema.columns
      WHERE table_schema=current_schema()
        AND table_name='discovery_rejected_candidates'
        AND column_name=ANY($1::text[])`,
    [["legacy_narrative_present", "legacy_narrative_json", "legacy_narrative_sha256"]],
  );
  const columnMap = new Map(columns.rows.map((row: any) => [
    String(row.column_name),
    `${row.data_type}:${row.is_nullable}:${row.character_maximum_length ?? ""}:${row.column_default ?? ""}`,
  ]));
  const expectedColumns = new Map<string, string>([
    ["legacy_narrative_present", "boolean:NO::false"],
    ["legacy_narrative_json", "text:YES::"],
    ["legacy_narrative_sha256", "character:YES:64:"],
  ]);
  for (const [name, expected] of expectedColumns) {
    const actual = columnMap.get(name);
    if (!actual) errors.push(`missing_column:discovery_rejected_candidates.${name}`);
    else if (actual !== expected) errors.push(`invalid_column:discovery_rejected_candidates.${name}:${actual}`);
  }

  const constraints = await db.query(
    `SELECT con.conname,pg_get_constraintdef(con.oid,true) AS definition
       FROM pg_constraint con
       JOIN pg_class rel ON rel.oid=con.conrelid
       JOIN pg_namespace nsp ON nsp.oid=rel.relnamespace
      WHERE nsp.nspname=current_schema()
        AND rel.relname='discovery_rejected_candidates'
        AND con.conname=ANY($1::text[])`,
    [[
      "discovery_rejected_candidates_origin_check",
      "discovery_rejected_candidates_source_check",
      "discovery_rejected_candidates_payload_check",
      "discovery_rejected_candidates_legacy_narrative_check",
      "discovery_rejected_candidates_size_check",
    ]],
  );
  const constraintMap = new Map(constraints.rows.map((row: any) => [
    String(row.conname),
    String(row.definition || "").replace(/\s+/g, " ").trim(),
  ]));
  for (const name of [
    "discovery_rejected_candidates_origin_check",
    "discovery_rejected_candidates_source_check",
    "discovery_rejected_candidates_payload_check",
  ]) {
    if (!constraintMap.get(name)?.includes("LEGACY_NARRATIVE_ONLY")) {
      errors.push(`invalid_constraint:${name}`);
    }
  }
  const narrativeCheck = constraintMap.get("discovery_rejected_candidates_legacy_narrative_check") || "";
  if (!narrativeCheck.includes("legacy_narrative_present = false")
    || !narrativeCheck.includes("digest(convert_to(legacy_narrative_json, 'UTF8'::name), 'sha256'::text)")) {
    errors.push("invalid_constraint:discovery_rejected_candidates_legacy_narrative_check");
  }
  const sizeCheck = constraintMap.get("discovery_rejected_candidates_size_check") || "";
  if (!sizeCheck.includes("octet_length(COALESCE(legacy_narrative_json")) {
    errors.push("invalid_constraint:discovery_rejected_candidates_size_check");
  }

  const trigger = await db.query(
    `SELECT pg_get_triggerdef(t.oid,true) AS definition
       FROM pg_trigger t
       JOIN pg_class rel ON rel.oid=t.tgrelid
       JOIN pg_namespace nsp ON nsp.oid=rel.relnamespace
      WHERE nsp.nspname=current_schema()
        AND rel.relname='discovery_rejected_candidates'
        AND t.tgname='discovery_legacy_narrative_provenance_append_only'
        AND NOT t.tgisinternal`,
  );
  const triggerDefinition = String(trigger.rows[0]?.definition || "");
  if ((trigger.rowCount ?? 0) !== 1
    || !/BEFORE DELETE OR UPDATE/.test(triggerDefinition)
    || !/prevent_discovery_legacy_narrative_provenance_mutation/.test(triggerDefinition)) {
    errors.push("invalid_trigger:discovery_legacy_narrative_provenance_append_only");
  }
  if (errors.length > 0) throw new Error(`DISCOVERY_BATCH_SCHEMA_V008_REQUIRED:${errors.join("|")}`);
}

/** Physical gate for exact optional ACTIVE artifact binding during GENERATION. */
export async function assertDiscoveryBatchSchemaV009(db: Queryable): Promise<void> {
  await assertDiscoveryBatchSchemaV008(db);
  const errors: string[] = [];
  const columns = await db.query(
    `SELECT column_name,data_type,is_nullable,character_maximum_length,column_default
       FROM information_schema.columns
      WHERE table_schema=current_schema()
        AND table_name='discovery_batch_items'
        AND column_name=ANY($1::text[])`,
    [[
      "expected_active_artifact_id",
      "expected_active_artifact_txt_sha256",
      "expected_active_artifact_html_sha256",
      "expected_active_artifact_content_sha256",
    ]],
  );
  const actualColumns = new Map(columns.rows.map((row: any) => [
    String(row.column_name),
    `${row.data_type}:${row.is_nullable}:${row.character_maximum_length ?? ""}:${row.column_default ?? ""}`,
  ]));
  const expectedColumns = new Map<string, string>([
    ["expected_active_artifact_id", "character varying:YES:36:"],
    ["expected_active_artifact_txt_sha256", "character:YES:64:"],
    ["expected_active_artifact_html_sha256", "character:YES:64:"],
    ["expected_active_artifact_content_sha256", "character:YES:64:"],
  ]);
  for (const [name, expected] of expectedColumns) {
    const actual = actualColumns.get(name);
    if (!actual) errors.push(`missing_column:discovery_batch_items.${name}`);
    else if (actual !== expected) errors.push(`invalid_column:discovery_batch_items.${name}:${actual}`);
  }
  const constraint = await db.query(
    `SELECT pg_get_constraintdef(con.oid,true) AS definition
       FROM pg_constraint con
       JOIN pg_class rel ON rel.oid=con.conrelid
       JOIN pg_namespace nsp ON nsp.oid=rel.relnamespace
      WHERE nsp.nspname=current_schema()
        AND rel.relname='discovery_batch_items'
        AND con.conname='discovery_batch_items_active_artifact_binding_check'`,
  );
  const definition = String(constraint.rows[0]?.definition || "").replace(/\s+/g, " ").trim();
  const expectedDefinition = `CHECK (expected_active_artifact_id IS NULL
    AND expected_active_artifact_txt_sha256 IS NULL
    AND expected_active_artifact_html_sha256 IS NULL
    AND expected_active_artifact_content_sha256 IS NULL
    OR expected_active_artifact_id IS NOT NULL
    AND expected_active_artifact_txt_sha256 IS NOT NULL
    AND expected_active_artifact_html_sha256 IS NOT NULL
    AND expected_active_artifact_content_sha256 IS NOT NULL)`.replace(/\s+/g, " ").trim();
  if ((constraint.rowCount ?? 0) !== 1) {
    errors.push("missing_constraint:discovery_batch_items_active_artifact_binding_check");
  } else if (definition !== expectedDefinition) {
    errors.push("invalid_constraint:discovery_batch_items_active_artifact_binding_check");
  }
  if (errors.length > 0) throw new Error(`DISCOVERY_BATCH_SCHEMA_V009_REQUIRED:${errors.join("|")}`);
}

/** Physical gate for resumable approved delivery batches on the same manifest. */
export async function assertDiscoveryBatchSchemaV011(db: Queryable): Promise<void> {
  await assertDiscoveryBatchSchemaV009(db);
  const errors: string[] = [];
  const catalog = await db.query(
    `SELECT
       EXISTS (
         SELECT 1 FROM pg_constraint con
         JOIN pg_class rel ON rel.oid=con.conrelid
         JOIN pg_namespace nsp ON nsp.oid=rel.relnamespace
         WHERE nsp.nspname=current_schema()
           AND rel.relname='discovery_batch_runs'
           AND con.conname='discovery_batch_runs_manifest_sha256_stage_tier_key'
       ) AS legacy_unique_exists,
       COALESCE((
         SELECT indexdef FROM pg_indexes
         WHERE schemaname=current_schema()
           AND tablename='discovery_batch_runs'
           AND indexname='discovery_batch_runs_manifest_stage_tier_idx'
       ), '') AS resumable_indexdef`,
  );
  const row = catalog.rows[0] || {};
  const indexDef = String(row.resumable_indexdef || "");
  if (row.legacy_unique_exists) {
    errors.push("legacy_unique_constraint_present:discovery_batch_runs_manifest_sha256_stage_tier_key");
  }
  if (!/CREATE INDEX discovery_batch_runs_manifest_stage_tier_idx/.test(indexDef)
    || !/\(manifest_sha256, stage, tier, created_at DESC\)/.test(indexDef)) {
    errors.push("invalid_index:discovery_batch_runs_manifest_stage_tier_idx");
  }
  if (errors.length > 0) throw new Error(`DISCOVERY_BATCH_SCHEMA_V011_REQUIRED:${errors.join("|")}`);
}
