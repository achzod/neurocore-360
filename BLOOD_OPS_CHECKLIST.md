# Blood Analysis - Ops Checklist & Troubleshooting

**Purpose:** Guide opérationnel pour monitoring, debugging et maintenance du système Blood Analysis.

---

## Daily Health Checks

### 1. Cron Job Status
```bash
# Check server logs for cron activity
grep "\[Cron\].*Blood" logs/production.log | tail -20

# Expected outputs:
# ✅ "Cron: delivered X scheduled report(s)" (if any pending)
# ✅ No repeated "quality gate blocked" for same reportId
# ❌ "exceeded max retries" → requires investigation
```

### 2. Delivery Queue Status
```sql
-- Check pending/scheduled reports
SELECT
  delivery_status,
  COUNT(*)
FROM blood_reports
GROUP BY delivery_status;

-- Expected:
-- SENT: majority
-- SCHEDULED: some (within 24h window)
-- PENDING: few (AI generation in progress)
-- DELIVERY_BLOCKED: 0 (or alert admin)
```

### 3. Quality Gate Failures
```sql
-- Check recent delivery attempts
SELECT
  status,
  error_message,
  COUNT(*)
FROM blood_email_deliveries
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY status, error_message;

-- If status='blocked': investigate error_message
```

---

## Troubleshooting Scenarios

### Scenario 1: Report stuck in PENDING

**Symptoms:**
- Report created > 2h ago
- delivery_status = "PENDING"
- ai_report is empty

**Diagnosis:**
```bash
# Check if background generation is running
grep "blood-analysis/submit async report ${reportId}" logs/production.log

# Check for AI errors
grep "AI_CREDIT_BALANCE_LOW\|AI generation failed" logs/production.log
```

**Resolution:**
```bash
# Option A: Force regeneration (admin)
curl -X POST https://apexlabs.achzodcoaching.com/api/admin/blood-analysis/report/${reportId}/regenerate \
  -H "x-admin-key: $ADMIN_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"async": true}'

# Option B: Check Anthropic API credits
# → Add credits or investigate API issues
```

---

### Scenario 2: Report stuck in SCHEDULED

**Symptoms:**
- report_scheduled_for is in the past
- delivery_status = "SCHEDULED"
- No email sent

**Diagnosis:**
```bash
# Check cron logs for this reportId
grep "Blood ${reportId}" logs/production.log

# Look for quality gate failures
grep "quality gate blocked" logs/production.log | grep ${reportId}
```

**Resolution:**
```bash
# Step 1: Inspect quality gate reasons
curl https://apexlabs.achzodcoaching.com/api/admin/blood-analysis/deliveries?reportId=${reportId} \
  -H "x-admin-key: $ADMIN_SECRET"

# Step 2: If false positive, force send
curl -X POST https://apexlabs.achzodcoaching.com/api/admin/blood-analysis/report/${reportId}/force-send \
  -H "x-admin-key: $ADMIN_SECRET"

# Step 3: If legitimate quality issue, regenerate
curl -X POST https://apexlabs.achzodcoaching.com/api/admin/blood-analysis/report/${reportId}/regenerate \
  -H "x-admin-key: $ADMIN_SECRET"
```

---

### Scenario 3: Report DELIVERY_BLOCKED

**Symptoms:**
- delivery_status = "DELIVERY_BLOCKED"
- delivery_retries >= 5

**Diagnosis:**
```sql
-- Get full delivery history
SELECT * FROM blood_email_deliveries
WHERE report_id = '${reportId}'
ORDER BY created_at DESC;

-- Check quality_checks field for patterns
```

**Common Causes:**
1. Missing sections in AI report → regenerate
2. Em-dashes not stripped → should be fixed (commit d640ba08)
3. HTML rendering issue → check parallel-html-generator.ts

**Resolution:**
```bash
# 1. Fetch current report
curl https://apexlabs.achzodcoaching.com/api/blood-analysis/report/${reportId} \
  -H "Authorization: Bearer ${JWT}"

# 2. Verify AI report quality manually
# → Check for missing sections, placeholders, etc.

# 3. If report is valid, force send
curl -X POST https://apexlabs.achzodcoaching.com/api/admin/blood-analysis/report/${reportId}/force-send \
  -H "x-admin-key: $ADMIN_SECRET"

# 4. If report is invalid, regenerate
curl -X POST https://apexlabs.achzodcoaching.com/api/admin/blood-analysis/report/${reportId}/regenerate \
  -H "x-admin-key: $ADMIN_SECRET"
```

---

### Scenario 4: Client doesn't receive email

**Symptoms:**
- delivery_status = "SENT"
- email_sent_at is set
- Client reports no email

**Diagnosis:**
```sql
-- Verify SendPulse delivery
SELECT
  sendpulse_id,
  sent_at,
  recipient_email
FROM blood_email_deliveries
WHERE report_id = '${reportId}' AND status = 'sent';
```

**Resolution:**
```bash
# 1. Check SendPulse dashboard
# → Search by sendpulse_id or recipient_email
# → Verify delivery status, bounces, spam

# 2. Verify email is not in spam
# → Ask client to check spam folder
# → Check "coaching@achzodcoaching.com" not blacklisted

# 3. If needed, resend
# (Set delivery_status back to SCHEDULED manually)
UPDATE blood_reports
SET delivery_status = 'SCHEDULED',
    delivery_retries = 0,
    report_scheduled_for = NOW()
WHERE id = '${reportId}';
```

---

### Scenario 5: AI timeout on all reports

**Symptoms:**
- Multiple reports stuck in PENDING
- Logs show "timed out after 120000ms"

**Diagnosis:**
```bash
# Check Anthropic API status
curl https://status.anthropic.com/

# Check server resources
top
free -h
df -h
```

**Resolution:**
```bash
# Option A: Increase timeout (if legit slowness)
# Add to .env:
BLOOD_AI_SYNC_TIMEOUT_MS=180000
BLOOD_AI_ASYNC_TIMEOUT_MS=1200000

# Option B: Restart server (if resource exhaustion)
pm2 restart neurocore-360

# Option C: Scale server (Render dashboard)
# → Upgrade to higher tier if consistent slowness
```

---

## Monitoring Queries

### Active reports by status
```sql
SELECT
  delivery_status,
  COUNT(*) as count,
  MIN(created_at) as oldest,
  MAX(created_at) as newest
FROM blood_reports
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY delivery_status
ORDER BY count DESC;
```

### Delivery success rate (last 24h)
```sql
SELECT
  status,
  COUNT(*) as attempts,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2) as percentage
FROM blood_email_deliveries
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY status;

-- Target: sent >= 95%
```

### Quality gate failure breakdown
```sql
SELECT
  quality_checks->>'reasons' as failure_reasons,
  COUNT(*) as occurrences
FROM blood_email_deliveries
WHERE status = 'blocked'
  AND created_at >= NOW() - INTERVAL '7 days'
GROUP BY failure_reasons
ORDER BY occurrences DESC
LIMIT 10;
```

### Average AI generation time
```sql
-- Approximation via report creation to scheduled_for
SELECT
  AVG(EXTRACT(EPOCH FROM (report_scheduled_for - created_at))) as avg_gen_seconds,
  MIN(EXTRACT(EPOCH FROM (report_scheduled_for - created_at))) as min_seconds,
  MAX(EXTRACT(EPOCH FROM (report_scheduled_for - created_at))) as max_seconds
FROM blood_reports
WHERE report_scheduled_for IS NOT NULL
  AND created_at >= NOW() - INTERVAL '7 days';

-- Target: avg < 300s (5 min)
```

### Retry distribution
```sql
SELECT
  delivery_retries,
  COUNT(*) as report_count
FROM blood_reports
WHERE delivery_status IN ('SENT', 'DELIVERY_BLOCKED')
GROUP BY delivery_retries
ORDER BY delivery_retries;

-- Most should be 0-1 retries
```

---

## Maintenance Tasks

### Weekly: Clean old delivery logs
```sql
-- Archive or delete logs older than 90 days
DELETE FROM blood_email_deliveries
WHERE created_at < NOW() - INTERVAL '90 days';
```

### Monthly: Audit DELIVERY_BLOCKED reports
```sql
-- List all blocked reports for manual review
SELECT
  br.id,
  br.email,
  br.created_at,
  br.delivery_retries,
  bed.error_message
FROM blood_reports br
LEFT JOIN blood_email_deliveries bed ON bed.report_id = br.id
WHERE br.delivery_status = 'DELIVERY_BLOCKED'
ORDER BY br.created_at DESC;

-- Action: Investigate root cause, regenerate or force-send
```

### Quarterly: Performance review
```bash
# Review average generation times
# → Optimize prompts if consistently slow
# → Adjust timeouts if needed

# Review quality gate false positives
# → Adjust gate rules if too strict

# Review retry patterns
# → Identify systemic issues (API outages, etc.)
```

---

## Alerting Setup (Recommended)

### Critical Alerts (immediate action)

**Alert 1: Multiple DELIVERY_BLOCKED**
```sql
-- Trigger if > 3 reports blocked in last hour
SELECT COUNT(*) FROM blood_reports
WHERE delivery_status = 'DELIVERY_BLOCKED'
  AND created_at >= NOW() - INTERVAL '1 hour';
```

**Alert 2: Anthropic API down**
```bash
# Trigger if > 5 consecutive AI_CREDIT_BALANCE_LOW or timeout errors
grep "AI_CREDIT_BALANCE_LOW\|timed out after" logs/production.log | tail -10
```

**Alert 3: Cron not running**
```bash
# Trigger if no "[Cron]" log entry in last 10 minutes
# (cron runs every 5 min)
```

### Warning Alerts (review within 24h)

**Alert 4: Low delivery success rate**
```sql
-- Trigger if success rate < 90% in last 24h
SELECT
  100.0 * SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) / COUNT(*)
FROM blood_email_deliveries
WHERE created_at >= NOW() - INTERVAL '24 hours';
```

**Alert 5: Slow AI generation**
```sql
-- Trigger if avg generation time > 10 min in last hour
SELECT AVG(EXTRACT(EPOCH FROM (report_scheduled_for - created_at)))
FROM blood_reports
WHERE created_at >= NOW() - INTERVAL '1 hour';
```

---

## Emergency Procedures

### Emergency 1: Complete system outage

**Symptoms:** No reports being created/delivered

**Steps:**
1. Check server status (Render dashboard)
2. Check database connectivity
3. Check Anthropic API status
4. Check SendPulse API status
5. Review recent code deployments
6. Restart server if needed
7. Monitor recovery

### Emergency 2: Mass delivery failure

**Symptoms:** Multiple clients reporting no email

**Steps:**
1. Check SendPulse account status
2. Verify SENDER_EMAIL not blacklisted
3. Check email authentication (SPF, DKIM)
4. Review recent quality gate changes
5. Manually resend affected reports
6. Post-mortem analysis

### Emergency 3: Data corruption

**Symptoms:** Reports showing incorrect data

**Steps:**
1. Identify affected reports (date range)
2. Backup database immediately
3. Trace root cause (code bug vs data import)
4. Quarantine affected reports
5. Regenerate from PDF if available
6. Deploy fix
7. Validate fix with test report

---

## Quick Reference

### Admin Endpoints
```bash
# Regenerate report (async)
POST /api/admin/blood-analysis/report/:id/regenerate?async=true

# Force send email
POST /api/admin/blood-analysis/report/:id/force-send

# List deliveries
GET /api/admin/blood-analysis/deliveries?email=X&status=blocked

# All require: -H "x-admin-key: $ADMIN_SECRET"
```

### Key Logs to Monitor
```bash
# Cron activity
grep "\[Cron\]" logs/production.log

# AI generation
grep "\[BloodAnalysis\]" logs/production.log

# Quality gate
grep "quality gate" logs/production.log

# Email delivery
grep "\[SendPulse\]" logs/production.log
```

### Key Metrics
- Delivery success rate: Target >= 95%
- AI generation time: Target < 5 min
- Quality gate false positive: Target < 5%
- Retry rate: Target < 10% need >1 retry

---

## Support Contacts

| Issue | Contact | SLA |
|-------|---------|-----|
| Server down | Render support | 15 min |
| DB issues | Neon/Render support | 30 min |
| API issues | Check status pages | N/A |
| Code bugs | Dev team (this repo) | 2h |
| Client escalation | Admin dashboard | 1h |

---

**Last Updated:** 2026-03-21
**Maintained by:** Neurocore 360 Team
