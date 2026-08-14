-- Central Discovery rejected-candidate quarantine and bounded regeneration.
-- Additive except for the stage check, which is replaced in one transaction.

CREATE TABLE IF NOT EXISTS discovery_rejected_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID,
  generation_claim_token UUID,
  audit_id VARCHAR(36) NOT NULL,
  provider_response_id TEXT NOT NULL UNIQUE,
  attempt_no INTEGER NOT NULL,
  model TEXT NOT NULL,
  source_kind TEXT NOT NULL,
  provider_raw JSONB,
  provider_raw_text TEXT,
  assembled_candidate JSONB,
  provider_raw_sha256 CHAR(64),
  assembled_sha256 CHAR(64),
  report_txt_sha256 CHAR(64),
  report_html_sha256 CHAR(64),
  artifact_content_sha256 CHAR(64),
  artifact_id VARCHAR(36),
  reservation_id UUID,
  usage_event_id BIGINT,
  responses_sha256 CHAR(64) NOT NULL,
  validation_errors JSONB NOT NULL,
  actual_cost_usd NUMERIC(14,8) NOT NULL,
  state TEXT NOT NULL DEFAULT 'QUARANTINED',
  retried_by_batch_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT discovery_rejected_candidates_origin_check
    CHECK (
      (source_kind IN ('PROVIDER_REJECTED','ASSEMBLED_UNRENDERED','ASSEMBLED_REJECTED','PROVIDER_RESULT_LOST')
        AND (batch_id IS NOT NULL)::int + (generation_claim_token IS NOT NULL)::int = 1)
      OR (source_kind IN ('LEGACY_LOST_CANDIDATE','PERSISTED_INVALID_REPORT')
        AND batch_id IS NULL AND generation_claim_token IS NULL)
    ),
  CONSTRAINT discovery_rejected_candidates_batch_item_fkey
    FOREIGN KEY (batch_id, audit_id)
    REFERENCES discovery_batch_items(batch_id, audit_id) ON DELETE RESTRICT,
  CONSTRAINT discovery_rejected_candidates_retry_batch_fkey
    FOREIGN KEY (retried_by_batch_id)
    REFERENCES discovery_batch_runs(id) ON DELETE RESTRICT,
  CONSTRAINT discovery_rejected_candidates_artifact_fkey
    FOREIGN KEY (artifact_id) REFERENCES report_artifacts(id) ON DELETE RESTRICT,
  CONSTRAINT discovery_rejected_candidates_reservation_fkey
    FOREIGN KEY (reservation_id) REFERENCES ai_cost_budget_reservations(id) ON DELETE RESTRICT,
  CONSTRAINT discovery_rejected_candidates_usage_fkey
    FOREIGN KEY (usage_event_id) REFERENCES ai_usage_events(id) ON DELETE RESTRICT,
  CONSTRAINT discovery_rejected_candidates_attempt_check
    CHECK (attempt_no >= 1 AND attempt_no <= 2),
  CONSTRAINT discovery_rejected_candidates_source_check
    CHECK (source_kind IN ('PROVIDER_REJECTED','ASSEMBLED_UNRENDERED','ASSEMBLED_REJECTED','PROVIDER_RESULT_LOST','LEGACY_LOST_CANDIDATE','PERSISTED_INVALID_REPORT')),
  CONSTRAINT discovery_rejected_candidates_state_check
    CHECK (state IN ('QUARANTINED','RETRY_CLAIMED','RETRY_AMBIGUOUS','TERMINAL_REJECTED','SUPERSEDED')),
  CONSTRAINT discovery_rejected_candidates_cost_check
    CHECK (actual_cost_usd >= 0 AND actual_cost_usd <= 0.75000000),
  CONSTRAINT discovery_rejected_candidates_errors_check
    CHECK (jsonb_typeof(validation_errors) = 'array' AND jsonb_array_length(validation_errors) > 0),
  CONSTRAINT discovery_rejected_candidates_payload_check
    CHECK (
      (source_kind='LEGACY_LOST_CANDIDATE'
        AND provider_raw IS NULL AND provider_raw_text IS NULL AND provider_raw_sha256 IS NULL
        AND assembled_candidate IS NULL AND assembled_sha256 IS NULL
        AND report_txt_sha256 IS NULL AND report_html_sha256 IS NULL
        AND artifact_content_sha256 IS NULL AND artifact_id IS NULL)
      OR (source_kind='PROVIDER_REJECTED'
        AND (provider_raw IS NOT NULL)::int + (provider_raw_text IS NOT NULL)::int = 1
        AND provider_raw_sha256 IS NOT NULL AND assembled_candidate IS NULL AND assembled_sha256 IS NULL
        AND report_txt_sha256 IS NULL AND report_html_sha256 IS NULL
        AND artifact_content_sha256 IS NULL AND artifact_id IS NULL)
      OR (source_kind='PROVIDER_RESULT_LOST'
        AND provider_raw IS NULL AND provider_raw_text IS NULL AND provider_raw_sha256 IS NULL
        AND assembled_candidate IS NULL AND assembled_sha256 IS NULL
        AND report_txt_sha256 IS NULL AND report_html_sha256 IS NULL
        AND artifact_content_sha256 IS NULL AND artifact_id IS NULL)
      OR (source_kind='ASSEMBLED_REJECTED'
        AND (provider_raw IS NOT NULL)::int + (provider_raw_text IS NOT NULL)::int = 1
        AND provider_raw_sha256 IS NOT NULL AND assembled_candidate IS NOT NULL AND assembled_sha256 IS NOT NULL
        AND report_txt_sha256 IS NOT NULL AND report_html_sha256 IS NOT NULL
        AND artifact_content_sha256 IS NOT NULL AND artifact_id IS NULL)
      OR (source_kind='ASSEMBLED_UNRENDERED'
        AND (provider_raw IS NOT NULL)::int + (provider_raw_text IS NOT NULL)::int = 1
        AND provider_raw_sha256 IS NOT NULL AND assembled_candidate IS NOT NULL AND assembled_sha256 IS NOT NULL
        AND report_txt_sha256 IS NULL AND report_html_sha256 IS NULL
        AND artifact_content_sha256 IS NULL AND artifact_id IS NULL)
      OR (source_kind='PERSISTED_INVALID_REPORT'
        AND provider_raw IS NULL AND provider_raw_text IS NULL AND provider_raw_sha256 IS NULL
        AND assembled_candidate IS NOT NULL AND assembled_sha256 IS NOT NULL
        AND report_txt_sha256 IS NOT NULL AND report_html_sha256 IS NOT NULL
        AND artifact_content_sha256 IS NOT NULL AND artifact_id IS NOT NULL)
    ),
  CONSTRAINT discovery_rejected_candidates_ledger_check
    CHECK (reservation_id IS NOT NULL AND usage_event_id IS NOT NULL),
  CONSTRAINT discovery_rejected_candidates_size_check
    CHECK (octet_length(COALESCE(provider_raw::text,provider_raw_text,''))
      + octet_length(COALESCE(assembled_candidate::text,'')) <= 3000000),
  CONSTRAINT discovery_rejected_candidates_batch_audit_key UNIQUE (batch_id, audit_id),
  CONSTRAINT discovery_rejected_candidates_claim_audit_key UNIQUE (generation_claim_token, audit_id),
  CONSTRAINT discovery_rejected_candidates_audit_attempt_key UNIQUE (audit_id, attempt_no)
);

CREATE INDEX IF NOT EXISTS discovery_rejected_candidates_audit_state_idx
  ON discovery_rejected_candidates(audit_id, state, attempt_no);

-- A failed fail-closed transition must itself leave durable evidence.  This
-- append-only ledger is intentionally separate from the batch transaction so
-- callers can record a CAS/quarantine failure after that transaction rolls
-- back, instead of swallowing it and reporting a misleading STOPPED state.
CREATE TABLE IF NOT EXISTS discovery_batch_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_key CHAR(64) NOT NULL UNIQUE,
  batch_id UUID REFERENCES discovery_batch_runs(id) ON DELETE RESTRICT,
  audit_id VARCHAR(36) NOT NULL,
  operation TEXT NOT NULL,
  fence_token UUID,
  reservation_id UUID REFERENCES ai_cost_budget_reservations(id) ON DELETE RESTRICT,
  usage_event_id BIGINT REFERENCES ai_usage_events(id) ON DELETE RESTRICT,
  error_code TEXT NOT NULL,
  error_detail TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'OPEN',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT discovery_batch_incidents_operation_check
    CHECK (operation IN ('FAIL_BATCH_ITEM','FAIL_CLAIMED_GENERATION','PERSIST_BATCH_ITEM','QUARANTINE_CANDIDATE','ORPHAN_RECOVERY')),
  CONSTRAINT discovery_batch_incidents_state_check
    CHECK (state IN ('OPEN','RESOLVED')),
  CONSTRAINT discovery_batch_incidents_error_check
    CHECK (length(error_code) BETWEEN 1 AND 120 AND length(error_detail) BETWEEN 1 AND 4000)
);

CREATE INDEX IF NOT EXISTS discovery_batch_incidents_audit_state_idx
  ON discovery_batch_incidents(audit_id, state, created_at);

ALTER TABLE discovery_batch_items
  ADD COLUMN IF NOT EXISTS retry_of_candidate_id UUID
    REFERENCES discovery_rejected_candidates(id) ON DELETE RESTRICT;

DROP INDEX IF EXISTS discovery_batch_items_retry_candidate_uq;

-- A rejected candidate is a single-use regeneration capability.  The
-- foreign key alone does not stop two different batches from claiming the
-- same candidate, so keep the ownership invariant in PostgreSQL as well as
-- in the application CAS.
CREATE UNIQUE INDEX discovery_batch_items_retry_candidate_uq
  ON discovery_batch_items(retry_of_candidate_id)
  WHERE retry_of_candidate_id IS NOT NULL;

ALTER TABLE discovery_batch_items
  ADD COLUMN IF NOT EXISTS provider_reservation_id UUID,
  ADD COLUMN IF NOT EXISTS provider_usage_event_id BIGINT;
ALTER TABLE discovery_batch_items
  DROP CONSTRAINT IF EXISTS discovery_batch_items_provider_reservation_fkey,
  ADD CONSTRAINT discovery_batch_items_provider_reservation_fkey
    FOREIGN KEY (provider_reservation_id) REFERENCES ai_cost_budget_reservations(id) ON DELETE RESTRICT,
  DROP CONSTRAINT IF EXISTS discovery_batch_items_provider_usage_event_fkey,
  ADD CONSTRAINT discovery_batch_items_provider_usage_event_fkey
    FOREIGN KEY (provider_usage_event_id) REFERENCES ai_usage_events(id) ON DELETE RESTRICT;

ALTER TABLE discovery_batch_runs
  DROP CONSTRAINT IF EXISTS discovery_batch_runs_stage_check;
ALTER TABLE discovery_batch_runs
  ADD CONSTRAINT discovery_batch_runs_stage_check
  CHECK (stage IN ('GENERATION','REGENERATION','DELIVERY'));

ALTER TABLE discovery_batch_runs ADD COLUMN IF NOT EXISTS approval_expires_at TIMESTAMPTZ;
UPDATE discovery_batch_runs
   SET approval_expires_at = created_at + INTERVAL '1 microsecond'
 WHERE approval_expires_at IS NULL;
ALTER TABLE discovery_batch_runs ALTER COLUMN approval_expires_at SET NOT NULL;
ALTER TABLE discovery_batch_runs DROP CONSTRAINT IF EXISTS discovery_batch_runs_approval_expiry_check;
ALTER TABLE discovery_batch_runs ADD CONSTRAINT discovery_batch_runs_approval_expiry_check
  CHECK (approval_expires_at > created_at AND approval_expires_at <= created_at + INTERVAL '20 minutes');
