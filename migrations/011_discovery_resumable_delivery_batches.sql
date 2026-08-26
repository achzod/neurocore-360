-- Allow approved Discovery delivery batches to be resumed on the same manifest.
-- Email deduplication remains enforced by discovery_email_delivery_claims(audit_id,email_type).

ALTER TABLE discovery_batch_runs
  DROP CONSTRAINT IF EXISTS discovery_batch_runs_manifest_sha256_stage_tier_key;

CREATE INDEX IF NOT EXISTS discovery_batch_runs_manifest_stage_tier_idx
  ON discovery_batch_runs (manifest_sha256, stage, tier, created_at DESC);
