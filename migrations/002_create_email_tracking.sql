-- Migration 002: Create email_tracking table
-- Date: 2026-03-24
-- Purpose: Track all emails sent via SendPulse for dashboard analytics

CREATE TABLE IF NOT EXISTS email_tracking (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Email details
  email_type VARCHAR(50) NOT NULL,
  recipient_email VARCHAR(255) NOT NULL,
  recipient_name VARCHAR(255),

  -- Associated audit/report
  audit_id VARCHAR(36),
  audit_type VARCHAR(50),

  -- Email content metadata
  subject TEXT,
  preview_text TEXT,

  -- SendPulse tracking
  sendpulse_task_id VARCHAR(255),
  sendpulse_status VARCHAR(50), -- success | failed | pending
  sendpulse_error TEXT,

  -- Engagement tracking
  opened TIMESTAMP,
  clicked TIMESTAMP,
  converted TIMESTAMP,
  conversion_type VARCHAR(50),

  -- Metadata
  metadata JSONB,
  sent_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_email_tracking_recipient ON email_tracking(recipient_email);
CREATE INDEX IF NOT EXISTS idx_email_tracking_audit ON email_tracking(audit_id);
CREATE INDEX IF NOT EXISTS idx_email_tracking_sent_at ON email_tracking(sent_at);
CREATE INDEX IF NOT EXISTS idx_email_tracking_status ON email_tracking(sendpulse_status);

-- Comments
COMMENT ON TABLE email_tracking IS 'Tracks all emails sent via SendPulse for analytics';
COMMENT ON COLUMN email_tracking.email_type IS 'Type of email: sendReportReadyEmail, sendCTAEmail, etc.';
COMMENT ON COLUMN email_tracking.sendpulse_status IS 'SendPulse delivery status: success, failed, pending';
COMMENT ON COLUMN email_tracking.metadata IS 'Additional tracking data (JSON)';
