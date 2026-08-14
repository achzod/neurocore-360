-- Append-only report artifact versioning.
--
-- Existing audits may already own several historical artifacts.  The backfill
-- keeps exactly one ACTIVE row per audit, preferring the row that is byte-for-
-- byte equal to the audit's currently exposed TXT/HTML, then the newest row.
-- Every other row remains durable and becomes SUPERSEDED.

ALTER TABLE report_artifacts
  ADD COLUMN IF NOT EXISTS artifact_state TEXT,
  ADD COLUMN IF NOT EXISTS superseded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS supersedes_artifact_id VARCHAR(36);

WITH ranked AS (
  SELECT artifact.id,
         ROW_NUMBER() OVER (
           PARTITION BY artifact.audit_id
           ORDER BY
             CASE
               WHEN audit.id IS NOT NULL
                AND artifact.txt IS NOT DISTINCT FROM audit.report_txt
                AND artifact.html IS NOT DISTINCT FROM audit.report_html
               THEN 0 ELSE 1
             END,
             artifact.created_at DESC,
             artifact.id DESC
         ) AS version_rank
    FROM report_artifacts artifact
    LEFT JOIN audits audit ON audit.id = artifact.audit_id
)
UPDATE report_artifacts artifact
   SET artifact_state = CASE WHEN ranked.version_rank = 1 THEN 'ACTIVE' ELSE 'SUPERSEDED' END,
       superseded_at = CASE WHEN ranked.version_rank = 1 THEN NULL ELSE COALESCE(artifact.superseded_at, NOW()) END
  FROM ranked
 WHERE ranked.id = artifact.id
   AND artifact.artifact_state IS NULL;

ALTER TABLE report_artifacts
  ALTER COLUMN artifact_state SET DEFAULT 'ACTIVE',
  ALTER COLUMN artifact_state SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'report_artifacts_state_check'
       AND conrelid = 'report_artifacts'::regclass
  ) THEN
    ALTER TABLE report_artifacts
      ADD CONSTRAINT report_artifacts_state_check
      CHECK (artifact_state IN ('ACTIVE', 'SUPERSEDED'));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'report_artifacts_superseded_at_check'
       AND conrelid = 'report_artifacts'::regclass
  ) THEN
    ALTER TABLE report_artifacts
      ADD CONSTRAINT report_artifacts_superseded_at_check
      CHECK (
        (artifact_state = 'ACTIVE' AND superseded_at IS NULL)
        OR (artifact_state = 'SUPERSEDED' AND superseded_at IS NOT NULL)
      );
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'report_artifacts_supersedes_fkey'
       AND conrelid = 'report_artifacts'::regclass
  ) THEN
    ALTER TABLE report_artifacts
      ADD CONSTRAINT report_artifacts_supersedes_fkey
      FOREIGN KEY (supersedes_artifact_id)
      REFERENCES report_artifacts(id)
      ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'report_artifacts_not_self_superseding_check'
       AND conrelid = 'report_artifacts'::regclass
  ) THEN
    ALTER TABLE report_artifacts
      ADD CONSTRAINT report_artifacts_not_self_superseding_check
      CHECK (supersedes_artifact_id IS NULL OR supersedes_artifact_id <> id);
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS report_artifacts_one_active_per_audit_uq
  ON report_artifacts(audit_id)
  WHERE artifact_state = 'ACTIVE';

CREATE INDEX IF NOT EXISTS report_artifacts_audit_history_idx
  ON report_artifacts(audit_id, created_at DESC, id DESC);

-- Historical artifacts are forensic evidence.  Once inserted, their payload
-- and provenance can never be rewritten or removed.  The sole permitted
-- mutation is the one-way lifecycle transition performed immediately before
-- inserting its replacement: ACTIVE/NULL -> SUPERSEDED/non-NULL.  Comparing
-- the complete row as jsonb (minus those two lifecycle fields) also protects
-- columns added by later migrations without weakening this trigger.
CREATE OR REPLACE FUNCTION enforce_report_artifacts_append_only()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
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
END;
$$;

DROP TRIGGER IF EXISTS report_artifacts_append_only ON report_artifacts;
CREATE TRIGGER report_artifacts_append_only
BEFORE UPDATE OR DELETE ON report_artifacts
FOR EACH ROW
EXECUTE FUNCTION enforce_report_artifacts_append_only();
