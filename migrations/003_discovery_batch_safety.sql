-- Discovery batch safety control plane.
-- This migration is intentionally additive. It does not mutate existing audits,
-- tracking rows or artifacts.

CREATE TABLE IF NOT EXISTS discovery_operation_lock (
  lock_key TEXT PRIMARY KEY,
  owner TEXT NOT NULL,
  token UUID NOT NULL UNIQUE,
  purpose TEXT NOT NULL,
  acquired_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  refreshed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  CHECK (lock_key = 'discovery-global'),
  CHECK (expires_at > acquired_at)
);

CREATE TABLE IF NOT EXISTS discovery_batch_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manifest_sha256 CHAR(64) NOT NULL,
  commit_sha TEXT NOT NULL,
  approval_reference TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PREPARED',
  stage TEXT NOT NULL DEFAULT 'GENERATION',
  tier TEXT NOT NULL DEFAULT 'ONE',
  soft_per_scan_usd NUMERIC(12,6) NOT NULL DEFAULT 0.250000,
  hard_per_scan_usd NUMERIC(12,6) NOT NULL DEFAULT 0.750000,
  global_budget_usd NUMERIC(12,6) NOT NULL,
  reserved_cost_usd NUMERIC(12,6) NOT NULL DEFAULT 0,
  actual_cost_usd NUMERIC(12,6) NOT NULL DEFAULT 0,
  target_count INTEGER NOT NULL,
  processed_count INTEGER NOT NULL DEFAULT 0,
  lock_token UUID NOT NULL,
  stop_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  CHECK (status IN ('PREPARED','RUNNING','PAUSED','FAILED','COMPLETED')),
  CHECK (stage IN ('GENERATION','DELIVERY')),
  CHECK (tier IN ('ONE','THREE','FIVE','REST')),
  CHECK (soft_per_scan_usd > 0),
  CHECK (hard_per_scan_usd >= soft_per_scan_usd),
  CHECK (global_budget_usd >= 0),
  CHECK (reserved_cost_usd >= 0),
  CHECK (actual_cost_usd >= 0),
  CHECK (target_count >= 0),
  CHECK (processed_count >= 0 AND processed_count <= target_count),
  UNIQUE (manifest_sha256, stage, tier)
);

CREATE TABLE IF NOT EXISTS discovery_batch_items (
  batch_id UUID NOT NULL REFERENCES discovery_batch_runs(id) ON DELETE RESTRICT,
  audit_id VARCHAR(36) NOT NULL,
  sequence_no INTEGER NOT NULL,
  cohort TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'QUEUED',
  expected_responses_sha256 CHAR(64) NOT NULL,
  expected_txt_sha256 CHAR(64),
  expected_html_sha256 CHAR(64),
  provider_calls INTEGER NOT NULL DEFAULT 0,
  provider_started_at TIMESTAMPTZ,
  provider_response_id TEXT UNIQUE,
  input_tokens BIGINT,
  output_tokens BIGINT,
  total_tokens BIGINT,
  reserved_cost_usd NUMERIC(12,6) NOT NULL DEFAULT 0,
  actual_cost_usd NUMERIC(12,6) NOT NULL DEFAULT 0,
  generated_txt_sha256 CHAR(64),
  generated_html_sha256 CHAR(64),
  artifact_id VARCHAR(36),
  error_code TEXT,
  error_detail TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (batch_id, audit_id),
  UNIQUE (batch_id, sequence_no),
  CHECK (cohort IN ('already_accepted','valid_never_sent','ambiguous','invalid')),
  CHECK (state IN (
    'QUEUED','PREFLIGHT_OK','PROVIDER_STARTED','GENERATED','VALIDATED',
    'STORED','DELIVERY_CLAIMED','DELIVERED','AMBIGUOUS','FAILED','SKIPPED'
  )),
  CHECK (provider_calls >= 0 AND provider_calls <= 1),
  CHECK (reserved_cost_usd >= 0),
  CHECK (actual_cost_usd >= 0)
);

CREATE INDEX IF NOT EXISTS discovery_batch_items_state_idx
  ON discovery_batch_items(batch_id, state, sequence_no);

CREATE TABLE IF NOT EXISTS discovery_email_delivery_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES discovery_batch_runs(id) ON DELETE RESTRICT,
  audit_id VARCHAR(36) NOT NULL,
  email_type TEXT NOT NULL DEFAULT 'sendReportReadyEmail',
  recipient_email TEXT NOT NULL,
  report_txt_sha256 CHAR(64) NOT NULL,
  report_html_sha256 CHAR(64) NOT NULL,
  subject_sha256 CHAR(64) NOT NULL,
  state TEXT NOT NULL DEFAULT 'CLAIMED',
  provider_task_id TEXT UNIQUE,
  provider_post_started_at TIMESTAMPTZ,
  provider_accepted_at TIMESTAMPTZ,
  smtp_confirmed_at TIMESTAMPTZ,
  error_detail TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (audit_id, email_type),
  CHECK (state IN ('CLAIMED','PROVIDER_POST_STARTED','PROVIDER_ACCEPTED','SMTP_CONFIRMED','AMBIGUOUS','FAILED_FINAL'))
);

CREATE INDEX IF NOT EXISTS discovery_email_delivery_claims_batch_idx
  ON discovery_email_delivery_claims(batch_id, state, created_at);

CREATE TABLE IF NOT EXISTS report_artifacts (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id VARCHAR(36) NOT NULL,
  tier VARCHAR(20) NOT NULL,
  engine VARCHAR(30) NOT NULL,
  model VARCHAR(80) NOT NULL,
  txt TEXT NOT NULL,
  html TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

ALTER TABLE report_artifacts
  ADD COLUMN IF NOT EXISTS content_sha256 CHAR(64),
  ADD COLUMN IF NOT EXISTS batch_id UUID REFERENCES discovery_batch_runs(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS report_artifacts_audit_content_uq
  ON report_artifacts(audit_id, content_sha256)
  WHERE content_sha256 IS NOT NULL;
