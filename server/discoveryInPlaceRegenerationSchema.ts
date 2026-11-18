/**
 * Durable tables for the provider-backed in-place regeneration of Discovery
 * reports that already exist (SENT, NEEDS_REVIEW, DELIVERY_BLOCKED,
 * BATCH_READY). Kept in a dependency-free module so the cost controller can
 * read them without importing the generation code.
 */

/** Hard ceiling for one in-place regeneration run, all audits included. */
export const DISCOVERY_INPLACE_MAX_RUN_USD = 15;
/** Provider calls one in-place item may reserve: initial + one corrective retry. */
export const DISCOVERY_INPLACE_MAX_CALLS_PER_ITEM = 2;

export const DISCOVERY_INPLACE_INCIDENT_PREFIX = "discovery-inplace:";

export function discoveryInPlaceIncidentKey(itemToken: string): string {
  return `${DISCOVERY_INPLACE_INCIDENT_PREFIX}${String(itemToken).trim().toLowerCase()}`;
}

type Queryable = { query: (sql: string, params?: unknown[]) => Promise<unknown> };

let ensured: Promise<void> | null = null;

export function ensureDiscoveryInPlaceRegenerationTables(db: Queryable): Promise<void> {
  if (!ensured) {
    ensured = (async () => {
      await db.query(`
        CREATE TABLE IF NOT EXISTS discovery_inplace_regen_runs (
          id UUID PRIMARY KEY,
          max_total_usd DOUBLE PRECISION NOT NULL
            CHECK (max_total_usd > 0 AND max_total_usd <= ${DISCOVERY_INPLACE_MAX_RUN_USD}),
          status TEXT NOT NULL DEFAULT 'OPEN',
          note TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )`);
      await db.query(`
        CREATE TABLE IF NOT EXISTS discovery_inplace_regen_items (
          id UUID PRIMARY KEY,
          run_id UUID NOT NULL REFERENCES discovery_inplace_regen_runs(id),
          audit_id TEXT NOT NULL,
          token UUID NOT NULL UNIQUE,
          state TEXT NOT NULL,
          fence_token TEXT,
          preserved_status TEXT NOT NULL,
          preserved_sent_at TIMESTAMPTZ,
          expected_artifact_hash TEXT NOT NULL,
          expected_narrative_sha256 TEXT NOT NULL,
          expected_responses_sha256 TEXT NOT NULL,
          tracking_count INTEGER NOT NULL,
          delivery_claim_count INTEGER NOT NULL,
          new_artifact_hash TEXT,
          provider_response_id TEXT,
          cost_usd DOUBLE PRECISION,
          error TEXT,
          claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )`);
      await db.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS discovery_inplace_regen_items_live_once_idx
          ON discovery_inplace_regen_items (run_id, audit_id)
          WHERE state IN ('GENERATING','PERSISTED')`);
      await db.query(`
        CREATE TABLE IF NOT EXISTS discovery_report_backups (
          id UUID PRIMARY KEY,
          run_id UUID NOT NULL,
          item_id UUID NOT NULL UNIQUE,
          audit_id TEXT NOT NULL,
          report_delivery_status TEXT,
          report_sent_at TIMESTAMPTZ,
          narrative_report JSONB,
          report_txt TEXT,
          report_html TEXT,
          scores JSONB,
          artifact_hash TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )`);
      await db.query(`
        CREATE INDEX IF NOT EXISTS discovery_report_backups_audit_idx
          ON discovery_report_backups (audit_id, created_at DESC)`);
    })().catch((error) => {
      ensured = null;
      throw error;
    });
  }
  return ensured;
}
