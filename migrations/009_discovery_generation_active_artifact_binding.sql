-- Seal an optional pre-existing ACTIVE report artifact into the generation
-- manifest item.  All four values are present together or absent together;
-- NULL therefore means the approved source had no ACTIVE artifact.

ALTER TABLE discovery_batch_items
  ADD COLUMN IF NOT EXISTS expected_active_artifact_id VARCHAR(36),
  ADD COLUMN IF NOT EXISTS expected_active_artifact_txt_sha256 CHAR(64),
  ADD COLUMN IF NOT EXISTS expected_active_artifact_html_sha256 CHAR(64),
  ADD COLUMN IF NOT EXISTS expected_active_artifact_content_sha256 CHAR(64);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'discovery_batch_items_active_artifact_binding_check'
       AND conrelid = 'discovery_batch_items'::regclass
  ) THEN
    ALTER TABLE discovery_batch_items
      ADD CONSTRAINT discovery_batch_items_active_artifact_binding_check
      CHECK (
        (
          expected_active_artifact_id IS NULL
          AND expected_active_artifact_txt_sha256 IS NULL
          AND expected_active_artifact_html_sha256 IS NULL
          AND expected_active_artifact_content_sha256 IS NULL
        )
        OR
        (
          expected_active_artifact_id IS NOT NULL
          AND expected_active_artifact_txt_sha256 IS NOT NULL
          AND expected_active_artifact_html_sha256 IS NOT NULL
          AND expected_active_artifact_content_sha256 IS NOT NULL
        )
      );
  END IF;
END $$;
