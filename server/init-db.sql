-- NEUROCORE 360 - Script d'initialisation de la base de données PostgreSQL

-- Table: users (déjà dans drizzle-schema, mais créée ici pour être sûr)
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255),
  credits INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Table: audits (déjà dans drizzle-schema, mais créée ici pour être sûr)
CREATE TABLE IF NOT EXISTS audits (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(36) NOT NULL REFERENCES users(id),
  email VARCHAR(255) NOT NULL,
  type VARCHAR(20) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'COMPLETED',
  responses JSONB NOT NULL DEFAULT '{}',
  scores JSONB NOT NULL DEFAULT '{}',
  narrative_report JSONB,
  report_delivery_status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  report_scheduled_for TIMESTAMP,
  report_sent_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  completed_at TIMESTAMP
);

-- Table: questionnaire_progress
CREATE TABLE IF NOT EXISTS questionnaire_progress (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  current_section TEXT NOT NULL DEFAULT '0',
  total_sections TEXT NOT NULL DEFAULT '14',
  percent_complete TEXT NOT NULL DEFAULT '0',
  responses JSONB NOT NULL DEFAULT '{}',
  status VARCHAR(20) NOT NULL DEFAULT 'STARTED',
  started_at TIMESTAMP DEFAULT NOW() NOT NULL,
  last_activity_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Table: blood_tests (dashboard client)
CREATE TABLE IF NOT EXISTS blood_tests (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(36) NOT NULL REFERENCES users(id),
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'processing',
  error TEXT,
  markers JSONB DEFAULT '[]'::jsonb,
  analysis JSONB DEFAULT '{}'::jsonb,
  patient_profile JSONB DEFAULT '{}'::jsonb,
  global_score INTEGER,
  global_level TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  completed_at TIMESTAMP
);

-- Table: peptides_progress
CREATE TABLE IF NOT EXISTS peptides_progress (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  current_section TEXT NOT NULL DEFAULT '0',
  total_sections TEXT NOT NULL DEFAULT '6',
  percent_complete TEXT NOT NULL DEFAULT '0',
  responses JSONB NOT NULL DEFAULT '{}',
  status VARCHAR(20) NOT NULL DEFAULT 'STARTED',
  started_at TIMESTAMP DEFAULT NOW() NOT NULL,
  last_activity_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Table: peptides_reports
CREATE TABLE IF NOT EXISTS peptides_reports (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL,
  responses JSONB NOT NULL DEFAULT '{}',
  report JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Table: magic_tokens
CREATE TABLE IF NOT EXISTS magic_tokens (
  token VARCHAR(255) PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP NOT NULL
);

-- Table: report_jobs
CREATE TABLE IF NOT EXISTS report_jobs (
  audit_id VARCHAR(36) PRIMARY KEY,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  progress INTEGER NOT NULL DEFAULT 0,
  current_section TEXT NOT NULL DEFAULT '',
  error TEXT,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
  last_progress_at TIMESTAMP DEFAULT NOW() NOT NULL,
  completed_at TIMESTAMP
);

-- Table: reviews (with promo code workflow)
CREATE TABLE IF NOT EXISTS reviews (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36),
  email VARCHAR(255) NOT NULL,
  audit_type VARCHAR(50) NOT NULL, -- DISCOVERY, ANABOLIC_BIOSCAN, ULTIMATE_SCAN, BLOOD_ANALYSIS, PEPTIDES
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, approved, rejected
  promo_code VARCHAR(50), -- code sent to user
  promo_code_sent_at TIMESTAMP,
  admin_notes TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  reviewed_at TIMESTAMP,
  reviewed_by VARCHAR(255)
);

-- Table: cta_history
CREATE TABLE IF NOT EXISTS cta_history (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id VARCHAR(36) NOT NULL,
  cta_type VARCHAR(20) NOT NULL,
  scheduled_at TIMESTAMP NOT NULL,
  sent_at TIMESTAMP,
  status VARCHAR(20) NOT NULL DEFAULT 'scheduled',
  email_subject TEXT,
  email_message TEXT,
  error TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Table: promo_codes
CREATE TABLE IF NOT EXISTS promo_codes (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) NOT NULL UNIQUE,
  discount_percent INTEGER NOT NULL CHECK (discount_percent >= 1 AND discount_percent <= 100),
  description TEXT,
  valid_for VARCHAR(20) NOT NULL DEFAULT 'ALL', -- ALL, PREMIUM, ELITE
  max_uses INTEGER DEFAULT NULL, -- NULL = unlimited
  current_uses INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMP DEFAULT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Table: email_tracking (pour suivre les ouvertures)
CREATE TABLE IF NOT EXISTS email_tracking (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id VARCHAR(36) NOT NULL,
  email_type VARCHAR(50) NOT NULL, -- 'GRATUIT_UPSELL', 'PREMIUM_J7', 'PREMIUM_J14'
  sent_at TIMESTAMP DEFAULT NOW() NOT NULL,
  opened_at TIMESTAMP DEFAULT NULL,
  clicked_at TIMESTAMP DEFAULT NULL
);

-- Insert default promo codes
INSERT INTO promo_codes (code, discount_percent, description, valid_for)
VALUES ('ANALYSE20', 20, 'Code promo 20% sur Anabolic Bioscan', 'PREMIUM')
ON CONFLICT (code) DO NOTHING;

INSERT INTO promo_codes (code, discount_percent, description, valid_for)
VALUES ('NEUROCORE20', 20, 'Code promo 20% coaching Achzod', 'ALL')
ON CONFLICT (code) DO NOTHING;

-- Promo codes for review rewards (audit type specific)
INSERT INTO promo_codes (code, discount_percent, description, valid_for)
VALUES ('DISCOVERY20', 20, 'Code Discovery Scan - 20% coaching Achzod', 'ALL')
ON CONFLICT (code) DO NOTHING;

INSERT INTO promo_codes (code, discount_percent, description, valid_for)
VALUES ('ANABOLICBIOSCAN', 0, 'Code Anabolic Bioscan - 59€ déduits du coaching', 'ALL')
ON CONFLICT (code) DO NOTHING;

INSERT INTO promo_codes (code, discount_percent, description, valid_for)
VALUES ('ULTIMATESCAN', 0, 'Code Ultimate Scan - 79€ déduits du coaching', 'ALL')
ON CONFLICT (code) DO NOTHING;

INSERT INTO promo_codes (code, discount_percent, description, valid_for)
VALUES ('BLOOD', 0, 'Code Blood Analysis - 99€ déduits du coaching', 'ALL')
ON CONFLICT (code) DO NOTHING;

INSERT INTO promo_codes (code, discount_percent, description, valid_for)
VALUES ('PEPTIDES', 0, 'Code Peptides Engine - 99€ déduits du coaching', 'ALL')
ON CONFLICT (code) DO NOTHING;

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_audits_email ON audits(email);
CREATE INDEX IF NOT EXISTS idx_audits_user_id ON audits(user_id);
CREATE INDEX IF NOT EXISTS idx_promo_codes_code ON promo_codes(code);
CREATE INDEX IF NOT EXISTS idx_email_tracking_audit_id ON email_tracking(audit_id);
CREATE INDEX IF NOT EXISTS idx_reviews_audit_id ON reviews(audit_id);
CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews(status);
CREATE INDEX IF NOT EXISTS idx_cta_history_audit_id ON cta_history(audit_id);
CREATE INDEX IF NOT EXISTS idx_report_jobs_status ON report_jobs(status);
CREATE INDEX IF NOT EXISTS idx_peptides_progress_email ON peptides_progress(email);
CREATE INDEX IF NOT EXISTS idx_peptides_reports_email ON peptides_reports(email);
CREATE INDEX IF NOT EXISTS idx_peptides_reports_created_at ON peptides_reports(created_at);

-- Note: Si certaines tables existent déjà, certaines erreurs peuvent apparaître.
-- C'est normal, le script utilise CREATE TABLE IF NOT EXISTS pour éviter les doublons.
