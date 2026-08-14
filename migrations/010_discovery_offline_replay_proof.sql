-- Immutable ownership proof for a deterministic, provider-free replay of a
-- previously paid Discovery catalogue selection.  The source candidate and
-- both provider ledgers remain untouched; this row binds the replacement
-- artifact to the exact attempt whose selection was replayed.

CREATE TABLE IF NOT EXISTS discovery_offline_replay_proofs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation TEXT NOT NULL,
  audit_id VARCHAR(36) NOT NULL REFERENCES audits(id) ON DELETE RESTRICT,
  candidate_id UUID NOT NULL UNIQUE
    REFERENCES discovery_rejected_candidates(id) ON DELETE RESTRICT,
  source_artifact_id VARCHAR(36) NOT NULL
    REFERENCES report_artifacts(id) ON DELETE RESTRICT,
  replacement_artifact_id VARCHAR(36) NOT NULL UNIQUE
    REFERENCES report_artifacts(id) ON DELETE RESTRICT,
  reservation_id UUID NOT NULL
    REFERENCES ai_cost_budget_reservations(id) ON DELETE RESTRICT,
  usage_event_id BIGINT NOT NULL
    REFERENCES ai_usage_events(id) ON DELETE RESTRICT,
  provider_response_id TEXT NOT NULL,
  responses_sha256 CHAR(64) NOT NULL,
  assembled_candidate_sha256 CHAR(64) NOT NULL,
  report_txt_sha256 CHAR(64) NOT NULL,
  report_html_sha256 CHAR(64) NOT NULL,
  artifact_content_sha256 CHAR(64) NOT NULL,
  catalog_provenance JSONB NOT NULL,
  catalog_provenance_sha256 CHAR(64) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT discovery_offline_replay_operation_check
    CHECK (operation = 'ALEXANDRE_ATTEMPT2_CANONICAL_REPLAY'),
  CONSTRAINT discovery_offline_replay_artifact_distinct_check
    CHECK (source_artifact_id <> replacement_artifact_id),
  CONSTRAINT discovery_offline_replay_hashes_check
    CHECK (
      responses_sha256 ~ '^[a-f0-9]{64}$'
      AND assembled_candidate_sha256 ~ '^[a-f0-9]{64}$'
      AND report_txt_sha256 ~ '^[a-f0-9]{64}$'
      AND report_html_sha256 ~ '^[a-f0-9]{64}$'
      AND artifact_content_sha256 ~ '^[a-f0-9]{64}$'
      AND catalog_provenance_sha256 ~ '^[a-f0-9]{64}$'
    ),
  CONSTRAINT discovery_offline_replay_provenance_check
    CHECK (
      jsonb_typeof(catalog_provenance) = 'object'
      AND catalog_provenance_sha256 = encode(
        digest(convert_to(catalog_provenance::text, 'UTF8'), 'sha256'), 'hex'
      )
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS discovery_offline_replay_audit_operation_uq
  ON discovery_offline_replay_proofs(audit_id, operation);

CREATE OR REPLACE FUNCTION enforce_discovery_offline_replay_append_only()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'DISCOVERY_OFFLINE_REPLAY_PROOF_APPEND_ONLY'
    USING ERRCODE = '55000';
END;
$$;

DROP TRIGGER IF EXISTS discovery_offline_replay_append_only
  ON discovery_offline_replay_proofs;
CREATE TRIGGER discovery_offline_replay_append_only
BEFORE UPDATE OR DELETE ON discovery_offline_replay_proofs
FOR EACH ROW
EXECUTE FUNCTION enforce_discovery_offline_replay_append_only();
