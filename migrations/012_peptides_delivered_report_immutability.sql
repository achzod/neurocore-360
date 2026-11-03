-- Durable, report-hash-bound evidence for reports delivered or demonstrably used.
-- Population is a separate owner-reviewed migration generated from the read-only
-- 133-order classifier. Never insert recipient-only or sibling-email evidence.
CREATE TABLE IF NOT EXISTS peptides_delivered_report_evidence (
  order_id TEXT NOT NULL,
  report_id TEXT NOT NULL,
  report_sha256 TEXT NOT NULL CHECK (report_sha256 ~ '^[0-9a-f]{64}$'),
  evidence_type TEXT NOT NULL CHECK (evidence_type IN (
    'delivery_metadata',
    'delivery_tracking',
    'review_or_reorder',
    'gmail_owner_evidence'
  )),
  evidence_id TEXT NOT NULL,
  observed_at TIMESTAMPTZ,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (order_id, report_id, report_sha256, evidence_type, evidence_id)
);

CREATE INDEX IF NOT EXISTS idx_peptides_delivered_report_evidence_report
  ON peptides_delivered_report_evidence (report_id, report_sha256);
