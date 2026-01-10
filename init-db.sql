-- NEUROCORE 360 - Script d'initialisation de la base de données PostgreSQL

-- Table: users (déjà dans drizzle-schema, mais créée ici pour être sûr)
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255),
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

-- Table: reviews
CREATE TABLE IF NOT EXISTS reviews (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36),
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
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

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_audits_email ON audits(email);
CREATE INDEX IF NOT EXISTS idx_audits_user_id ON audits(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_audit_id ON reviews(audit_id);
CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews(status);
CREATE INDEX IF NOT EXISTS idx_cta_history_audit_id ON cta_history(audit_id);
CREATE INDEX IF NOT EXISTS idx_report_jobs_status ON report_jobs(status);

-- Note: Si certaines tables existent déjà, certaines erreurs peuvent apparaître.
-- C'est normal, le script utilise CREATE TABLE IF NOT EXISTS pour éviter les doublons.