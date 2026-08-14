import type { Pool, PoolClient } from "pg";

type Queryable = Pick<Pool | PoolClient, "query">;

export const DISCOVERY_BATCH_SCHEMA_VERSION = 5;

const REQUIRED_COLUMNS = Object.freeze([
  ["discovery_batch_items", "expected_source_status", "text", "YES"],
  ["discovery_email_delivery_claims", "fence_token", "uuid", "YES"],
] as const);

const REQUIRED_INDEXES = Object.freeze([
  "discovery_batch_runs_pkey",
  "discovery_batch_runs_manifest_sha256_stage_tier_key",
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
  ["discovery_batch_runs_manifest_sha256_stage_tier_key", "u"],
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
