-- Preserve the exact UTF-8 bytes emitted by PostgreSQL for a legacy
-- narrative-only Discovery source before that source is cleared for replay.
-- The payload stays on the rejected-candidate provenance row, while the
-- candidate lifecycle state may continue to advance normally.

-- Required by the SHA-256 provenance constraint below.  This statement is
-- intentionally first and transactional: an unavailable extension or missing
-- CREATE EXTENSION privilege aborts V008 before any schema mutation.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE discovery_rejected_candidates
  ADD COLUMN IF NOT EXISTS legacy_narrative_present BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS legacy_narrative_json TEXT,
  ADD COLUMN IF NOT EXISTS legacy_narrative_sha256 CHAR(64);

ALTER TABLE discovery_rejected_candidates
  DROP CONSTRAINT IF EXISTS discovery_rejected_candidates_origin_check,
  DROP CONSTRAINT IF EXISTS discovery_rejected_candidates_source_check,
  DROP CONSTRAINT IF EXISTS discovery_rejected_candidates_payload_check,
  DROP CONSTRAINT IF EXISTS discovery_rejected_candidates_legacy_narrative_check,
  DROP CONSTRAINT IF EXISTS discovery_rejected_candidates_size_check;

ALTER TABLE discovery_rejected_candidates
  ADD CONSTRAINT discovery_rejected_candidates_origin_check
    CHECK (
      (source_kind IN ('PROVIDER_REJECTED','ASSEMBLED_UNRENDERED','ASSEMBLED_REJECTED','PROVIDER_RESULT_LOST')
        AND (batch_id IS NOT NULL)::int + (generation_claim_token IS NOT NULL)::int = 1)
      OR (source_kind IN ('LEGACY_LOST_CANDIDATE','LEGACY_NARRATIVE_ONLY','PERSISTED_INVALID_REPORT')
        AND batch_id IS NULL AND generation_claim_token IS NULL)
    ),
  ADD CONSTRAINT discovery_rejected_candidates_source_check
    CHECK (source_kind IN (
      'PROVIDER_REJECTED','ASSEMBLED_UNRENDERED','ASSEMBLED_REJECTED','PROVIDER_RESULT_LOST',
      'LEGACY_LOST_CANDIDATE','LEGACY_NARRATIVE_ONLY','PERSISTED_INVALID_REPORT'
    )),
  ADD CONSTRAINT discovery_rejected_candidates_legacy_narrative_check
    CHECK (
      (legacy_narrative_present = FALSE
        AND legacy_narrative_json IS NULL AND legacy_narrative_sha256 IS NULL)
      OR (legacy_narrative_present = TRUE
        AND source_kind = 'LEGACY_NARRATIVE_ONLY'
        AND legacy_narrative_json IS NOT NULL
        AND legacy_narrative_sha256 = encode(
          digest(convert_to(legacy_narrative_json, 'UTF8'), 'sha256'), 'hex'
        ))
    ),
  ADD CONSTRAINT discovery_rejected_candidates_payload_check
    CHECK (
      (source_kind='LEGACY_LOST_CANDIDATE'
        AND legacy_narrative_present=FALSE
        AND provider_raw IS NULL AND provider_raw_text IS NULL AND provider_raw_sha256 IS NULL
        AND assembled_candidate IS NULL AND assembled_sha256 IS NULL
        AND report_txt_sha256 IS NULL AND report_html_sha256 IS NULL
        AND artifact_content_sha256 IS NULL AND artifact_id IS NULL)
      OR (source_kind='LEGACY_NARRATIVE_ONLY'
        AND legacy_narrative_present=TRUE
        AND provider_raw IS NULL AND provider_raw_text IS NULL AND provider_raw_sha256 IS NULL
        AND assembled_candidate IS NULL AND assembled_sha256 IS NULL
        AND report_txt_sha256 IS NULL AND report_html_sha256 IS NULL
        AND artifact_content_sha256 IS NULL AND artifact_id IS NULL)
      OR (source_kind='PROVIDER_REJECTED'
        AND legacy_narrative_present=FALSE
        AND (provider_raw IS NOT NULL)::int + (provider_raw_text IS NOT NULL)::int = 1
        AND provider_raw_sha256 IS NOT NULL AND assembled_candidate IS NULL AND assembled_sha256 IS NULL
        AND report_txt_sha256 IS NULL AND report_html_sha256 IS NULL
        AND artifact_content_sha256 IS NULL AND artifact_id IS NULL)
      OR (source_kind='PROVIDER_RESULT_LOST'
        AND legacy_narrative_present=FALSE
        AND provider_raw IS NULL AND provider_raw_text IS NULL AND provider_raw_sha256 IS NULL
        AND assembled_candidate IS NULL AND assembled_sha256 IS NULL
        AND report_txt_sha256 IS NULL AND report_html_sha256 IS NULL
        AND artifact_content_sha256 IS NULL AND artifact_id IS NULL)
      OR (source_kind='ASSEMBLED_REJECTED'
        AND legacy_narrative_present=FALSE
        AND (provider_raw IS NOT NULL)::int + (provider_raw_text IS NOT NULL)::int = 1
        AND provider_raw_sha256 IS NOT NULL AND assembled_candidate IS NOT NULL AND assembled_sha256 IS NOT NULL
        AND report_txt_sha256 IS NOT NULL AND report_html_sha256 IS NOT NULL
        AND artifact_content_sha256 IS NOT NULL AND artifact_id IS NULL)
      OR (source_kind='ASSEMBLED_UNRENDERED'
        AND legacy_narrative_present=FALSE
        AND (provider_raw IS NOT NULL)::int + (provider_raw_text IS NOT NULL)::int = 1
        AND provider_raw_sha256 IS NOT NULL AND assembled_candidate IS NOT NULL AND assembled_sha256 IS NOT NULL
        AND report_txt_sha256 IS NULL AND report_html_sha256 IS NULL
        AND artifact_content_sha256 IS NULL AND artifact_id IS NULL)
      OR (source_kind='PERSISTED_INVALID_REPORT'
        AND legacy_narrative_present=FALSE
        AND provider_raw IS NULL AND provider_raw_text IS NULL AND provider_raw_sha256 IS NULL
        AND assembled_candidate IS NOT NULL AND assembled_sha256 IS NOT NULL
        AND report_txt_sha256 IS NOT NULL AND report_html_sha256 IS NOT NULL
        AND artifact_content_sha256 IS NOT NULL AND artifact_id IS NOT NULL)
    ),
  ADD CONSTRAINT discovery_rejected_candidates_size_check
    CHECK (
      octet_length(COALESCE(provider_raw::text,provider_raw_text,''))
      + octet_length(COALESCE(assembled_candidate::text,''))
      + octet_length(COALESCE(legacy_narrative_json,'')) <= 3000000
    );

CREATE OR REPLACE FUNCTION prevent_discovery_legacy_narrative_provenance_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' AND OLD.legacy_narrative_present THEN
    RAISE EXCEPTION 'DISCOVERY_LEGACY_NARRATIVE_PROVENANCE_APPEND_ONLY';
  END IF;
  IF TG_OP = 'UPDATE' AND (
    NEW.legacy_narrative_present IS DISTINCT FROM OLD.legacy_narrative_present
    OR NEW.legacy_narrative_json IS DISTINCT FROM OLD.legacy_narrative_json
    OR NEW.legacy_narrative_sha256 IS DISTINCT FROM OLD.legacy_narrative_sha256
  ) THEN
    RAISE EXCEPTION 'DISCOVERY_LEGACY_NARRATIVE_PROVENANCE_APPEND_ONLY';
  END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END $$;

DROP TRIGGER IF EXISTS discovery_legacy_narrative_provenance_append_only
  ON discovery_rejected_candidates;
CREATE TRIGGER discovery_legacy_narrative_provenance_append_only
  BEFORE UPDATE OR DELETE ON discovery_rejected_candidates
  FOR EACH ROW EXECUTE FUNCTION prevent_discovery_legacy_narrative_provenance_mutation();
