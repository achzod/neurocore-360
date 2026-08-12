-- DRY-RUN ONLY BY DEFAULT.
-- Exact repair for Harald's duplicate Discovery audit after the public GET
-- regression changed SUPERSEDED back to NEEDS_REVIEW. Review the returned row,
-- then replace the final ROLLBACK with COMMIT in an explicitly authorised run.
BEGIN;

CREATE TEMP TABLE harald_superseded_repair_result (
  id text PRIMARY KEY,
  email text NOT NULL,
  report_delivery_status text NOT NULL,
  replacement_audit_id text NOT NULL
) ON COMMIT DROP;

WITH repaired AS (
  UPDATE audits AS duplicate
     SET report_delivery_status = 'SUPERSEDED'
   WHERE duplicate.id = '4a373bb2-7044-48f5-b8ab-a64658963d90'
     AND duplicate.type = 'GRATUIT'
     AND LOWER(duplicate.email) = LOWER('dubus-harald@outlook.fr')
     AND duplicate.report_delivery_status = 'NEEDS_REVIEW'
     AND duplicate.report_sent_at IS NULL
     AND COALESCE(NULLIF(duplicate.report_txt, ''), NULLIF(duplicate.report_html, '')) IS NULL
     AND LOWER(COALESCE(duplicate.narrative_report->'recovery'->>'disposition', '')) = 'superseded'
     AND duplicate.narrative_report->'recovery'->>'replacementAuditId' = 'be004582-3920-476f-8985-e8d9faf16916'
     AND NOT EXISTS (
       SELECT 1 FROM report_artifacts artifact WHERE artifact.audit_id = duplicate.id
     )
     AND NOT EXISTS (
       SELECT 1
         FROM email_tracking tracking
        WHERE tracking.audit_id = duplicate.id
          AND tracking.email_type IN ('sendReportReadyEmail', 'sendReportRegeneratedEmail')
          AND COALESCE(tracking.sendpulse_status, '') NOT IN ('failed', 'auth_failed', 'unsubscribed')
     )
     AND EXISTS (
       SELECT 1
         FROM audits replacement
        WHERE replacement.id = 'be004582-3920-476f-8985-e8d9faf16916'
          AND replacement.type = 'GRATUIT'
          AND LOWER(replacement.email) = LOWER(duplicate.email)
          AND replacement.report_delivery_status = 'SENT'
          AND replacement.report_sent_at IS NOT NULL
     )
  RETURNING id, email, report_delivery_status,
            narrative_report->'recovery'->>'replacementAuditId' AS replacement_audit_id
)
INSERT INTO harald_superseded_repair_result
SELECT * FROM repaired;

DO $$
DECLARE
  repaired_count integer;
  repaired_status text;
BEGIN
  SELECT COUNT(*) INTO repaired_count FROM harald_superseded_repair_result;
  IF repaired_count <> 1 THEN
    RAISE EXCEPTION 'Harald repair predicate mismatch; expected 1 row, changed %', repaired_count;
  END IF;
  SELECT report_delivery_status
    INTO repaired_status
    FROM audits
   WHERE id = '4a373bb2-7044-48f5-b8ab-a64658963d90';
  IF repaired_status IS DISTINCT FROM 'SUPERSEDED' THEN
    RAISE EXCEPTION 'Harald repair predicate mismatch; transaction aborted (status=%)', repaired_status;
  END IF;
END $$;

SELECT * FROM harald_superseded_repair_result;

ROLLBACK;
