-- Migration: Create email_tracking table
-- Created: 2026-03-23
-- Purpose: Track all automated emails sent by APEXLABS for monitoring and analytics

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
  sendpulse_status VARCHAR(50),
  sendpulse_error TEXT,

  -- Engagement tracking
  opened TIMESTAMP,
  clicked TIMESTAMP,
  converted TIMESTAMP,
  conversion_type VARCHAR(50),

  -- Metadata
  metadata JSONB,

  -- Timestamps
  sent_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_email_tracking_recipient ON email_tracking(recipient_email);
CREATE INDEX IF NOT EXISTS idx_email_tracking_audit ON email_tracking(audit_id);
CREATE INDEX IF NOT EXISTS idx_email_tracking_type ON email_tracking(email_type);
CREATE INDEX IF NOT EXISTS idx_email_tracking_sent_at ON email_tracking(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_tracking_status ON email_tracking(sendpulse_status);

-- Comment
COMMENT ON TABLE email_tracking IS 'Tracks all automated emails sent by APEXLABS system for monitoring, analytics, and Google Sheets export';
