import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(name: string): string {
  return readFileSync(new URL(name, import.meta.url), "utf8");
}

test("transactional Discovery generation is cutoff-gated and budgeted by exact auditId", () => {
  const generation = source("./discoveryGenerationService.ts");
  const scan = source("./discovery-scan.ts");
  const persistence = source("./discoveryTransactionalPersistence.ts");
  const routes = source("./routes.ts");

  assert.ok(
    generation.indexOf("!isDiscoveryTransactionalAutomationEligible(audit)")
      < generation.indexOf("analyzeDiscoveryScan(audit.responses"),
  );
  assert.match(generation, /costBudgetAuditId: audit\.id/);
  assert.match(scan, /product: "discovery"[\s\S]*orderId: costBudgetAuditId[\s\S]*estimatedCostUsd: DISCOVERY_UNIFIED_MAX_ESTIMATED_COST_USD/);
  assert.match(generation, /costBudgetGenerationToken: claim\.token/);
  assert.match(persistence, /created_at >= \$3/);

  const createStart = routes.indexOf('app.post("/api/discovery-scan/create"');
  const createEnd = routes.indexOf('app.get("/api/discovery-scan/:auditId"', createStart);
  const create = routes.slice(createStart, createEnd);
  assert.ok(create.indexOf("isDiscoveryTransactionalAutomationEligible(audit)") < create.indexOf("generateAndPersistPremiumDiscoveryReport"));
  assert.ok(create.indexOf("generateAndPersistPremiumDiscoveryReport(audit.id)") < create.indexOf("safeSendReportReadyEmail"));
});

test("Discovery admin notifications are throttled before SendPulse", () => {
  const emailService = source("./emailService.ts");
  const adminStart = emailService.indexOf("export async function sendAdminEmailNewAudit(");
  const adminEnd = emailService.indexOf("export async function sendCTAEmail(", adminStart);
  const admin = emailService.slice(adminStart, adminEnd);

  assert.match(emailService, /ADMIN_DISCOVERY_EMAIL_COOLDOWN_MS = 60 \* 60 \* 1000/);
  assert.match(emailService, /ADMIN_DISCOVERY_NAME_WINDOW_MS = 15 \* 60 \* 1000/);
  assert.match(emailService, /ADMIN_DISCOVERY_NAME_MAX_PER_WINDOW = 3/);
  assert.ok(
    admin.indexOf("!shouldSendAdminDiscoveryNotification")
      < admin.indexOf("sendEmailWithTracking"),
  );
  assert.match(admin, /Skipping duplicate Discovery admin notification/);
});

test("public Discovery creation blocks test/disposable emails before DB insertion", () => {
  const routes = source("./routes.ts");
  const storage = source("./storage.ts");
  const createStart = routes.indexOf('app.post("/api/discovery-scan/create"');
  const createEnd = routes.indexOf('app.get("/api/discovery-scan/:auditId"', createStart);
  const create = routes.slice(createStart, createEnd);
  const storageStart = storage.indexOf("async createDiscoveryAudit(");
  const storageEnd = storage.indexOf("async updateAudit(", storageStart);
  const storageCreate = storage.slice(storageStart, storageEnd);

  assert.match(routes, /isBlockedDiscoveryTestEmail/);
  assert.ok(
    create.indexOf("isBlockedDiscoveryTestEmail(email)")
      < create.indexOf("storage.createDiscoveryAudit"),
  );
  assert.match(create, /Email invalide/);
  assert.match(storageCreate, /isBlockedDiscoveryTestEmail\(normalizedEmail\)/);
  assert.match(storageCreate, /DISCOVERY_TEST_EMAIL_BLOCKED/);
});

test("every automatic Discovery delivery path enforces the same cutoff", () => {
  const routes = source("./routes.ts");
  const index = source("./index.ts");

  const safeSendStart = routes.indexOf("async function safeSendReportReadyEmail(");
  const safeSendEnd = routes.indexOf("const auditCreateLimiter", safeSendStart);
  const safeSend = routes.slice(safeSendStart, safeSendEnd);
  assert.ok(
    safeSend.indexOf("isDiscoveryTransactionalAutomationEligible(transactionalDiscoveryAudit)")
      < safeSend.indexOf("claimDiscoveryEmailDelivery({"),
  );

  const autoSendStart = routes.indexOf("// Auto-send READY/SCHEDULED reports");
  const autoSendEnd = routes.indexOf("// Auto-process email sequences", autoSendStart);
  const autoSend = routes.slice(autoSendStart, autoSendEnd);
  assert.ok(
    autoSend.indexOf("!isDiscoveryTransactionalAutomationEligible(audit)")
      < autoSend.indexOf('if (status === "READY")'),
  );
  assert.ok(
    autoSend.indexOf("!isDiscoveryTransactionalAutomationEligible(audit)")
      < autoSend.indexOf('if (status === "SCHEDULED"'),
  );

  const scheduledStart = index.indexOf("const scheduledAudits");
  const scheduledEnd = index.indexOf("// Blood reports", scheduledStart);
  const scheduled = index.slice(scheduledStart, scheduledEnd);
  assert.ok(
    scheduled.indexOf("!isDiscoveryTransactionalAutomationEligible(audit)")
      < scheduled.indexOf('reportDeliveryStatus: "READY"'),
  );
  assert.match(index, /Discovery delivery claims are durable and deliberately never/);
  assert.doesNotMatch(index, /UPDATE audits SET report_delivery_status = 'READY'[\s\S]*type = 'GRATUIT'/);
});

test("monitoring, missing recovery, queue drain and boot resume fail closed", () => {
  const monitoring = source("./monitoring.ts");
  const missing = source("./discoveryMissingJobRecovery.ts");
  const manager = source("./reportJobManager.ts");
  const storage = source("./storage.ts");

  assert.match(monitoring, /reportDeliveryStatus === "NEEDS_REVIEW"[\s\S]*isDiscoveryTransactionalAutomationEligible\(audit\)/);
  assert.ok(
    monitoring.indexOf('audit.type === "GRATUIT" && !isDiscoveryTransactionalAutomationEligible(audit)')
      < monitoring.indexOf("storage.deleteReportJob(audit.id)"),
  );
  assert.match(missing, /outside_transactional_automation_window/);
  assert.match(storage, /enqueueMissingDiscoveryReportJob[\s\S]*isDiscoveryTransactionalAutomationEligible\(audit\)/);

  const start = manager.slice(
    manager.indexOf("export async function startReportGeneration"),
    manager.indexOf("async function generateReportAsync"),
  );
  assert.ok(
    start.indexOf("isDiscoveryTransactionalAutomationEligible(storedAudit)")
      < start.indexOf("activeGenerations.size"),
  );
  assert.match(start, /import\("\.\/discoveryGenerationService"\)/);
  assert.match(start, /startPremiumDiscoveryReportGeneration/);
  assert.match(manager, /Generic resume ignores Discovery audit/);
  assert.match(storage, /getActiveReportJobs[\s\S]*audit\?\.type !== "GRATUIT"/);
  assert.match(manager, /startReportGeneration\(nextPending\.auditId/);
});

test("automaticReportRecovery rejects ineligible Discovery before mutation or delivery", () => {
  const routes = source("./routes.ts");
  const recoveryStart = routes.indexOf("async function recoverStoredAuditReport(");
  const recoveryEnd = routes.indexOf('app.post("/api/admin/recover-report-failures"', recoveryStart);
  const recovery = routes.slice(recoveryStart, recoveryEnd);
  assert.ok(
    recovery.indexOf("!isDiscoveryTransactionalAutomationEligible(audit)")
      < recovery.indexOf("resolveCanonicalDiscoveryArtifacts"),
  );
  assert.ok(
    recovery.indexOf("!isDiscoveryTransactionalAutomationEligible(audit)")
      < recovery.indexOf('reportDeliveryStatus: "READY"'),
  );

  const automaticStart = routes.indexOf("let automaticReportRecoveryRunning");
  const automaticEnd = routes.indexOf("// ==================== ADMIN RECONCILIATION STATS", automaticStart);
  const automatic = routes.slice(automaticStart, automaticEnd);
  assert.match(automatic, /SELECT id, type, created_at AS "createdAt"/);
  assert.ok(
    automatic.indexOf("!isDiscoveryTransactionalAutomationEligible(row)")
      < automatic.indexOf("recoverStoredAuditReport(String(row.id)"),
  );
  assert.doesNotMatch(automatic, /BATCH_READY/);
});

test("low-level READY and SENDING claims enforce cutoff and non-batch delivery fails closed", () => {
  const routes = source("./routes.ts");
  const storage = source("./storage.ts");
  const batch = source("./discoveryBatchControl.ts");
  const persistence = source("./discoveryTransactionalPersistence.ts");

  assert.match(persistence, /persistClaimedDiscoveryGeneration/);
  assert.match(persistence, /report_delivery_status = 'GENERATING'/);
  assert.match(persistence, /report_sent_at IS NULL/);
  assert.match(persistence, /DISCOVERY_GENERATION_TOKEN_MISMATCH/);

  const pgClaimsStart = storage.lastIndexOf("async claimAuditForGeneration(");
  const pgClaimsEnd = storage.indexOf("async hasReportReadyEmailBeenSent", pgClaimsStart);
  const pgClaims = storage.slice(pgClaimsStart, pgClaimsEnd);
  assert.match(pgClaims, /audit\.type === "GRATUIT"/);
  assert.match(pgClaims, /return false/);

  const claimStart = batch.indexOf("export async function claimDiscoveryEmailDelivery(");
  const claimEnd = batch.indexOf("export async function markDiscoveryDeliveryProviderPostStarted", claimStart);
  const claim = batch.slice(claimStart, claimEnd);
  assert.ok(
    claim.indexOf("!isBatch && !isDiscoveryTransactionalAutomationEligible")
      < claim.indexOf("report_delivery_status = 'SENDING'"),
  );
  assert.match(claim, /DISCOVERY_TRANSACTIONAL_AUTOMATION_INELIGIBLE/);
});

test("BATCH_READY is invisible to every generic delivery and resume worker", () => {
  const routes = source("./routes.ts");
  const manager = source("./reportJobManager.ts");

  const deliveryStart = routes.indexOf("async function processReportAndSendEmail(");
  const deliveryEnd = routes.indexOf('app.get("/api/audits"', deliveryStart);
  const delivery = routes.slice(deliveryStart, deliveryEnd);
  assert.ok(
    delivery.indexOf('deliveryStatus === "BATCH_READY"')
      < delivery.indexOf('reportDeliveryStatus: "READY"'),
  );
  assert.match(delivery, /currentAudit\.reportDeliveryStatus\) === "BATCH_READY"/);

  const adminStart = routes.indexOf("async function processReportAsync(");
  const adminEnd = routes.indexOf('app.get("/api/audits/:id/export/pdf"', adminStart);
  const admin = routes.slice(adminStart, adminEnd);
  assert.ok(
    admin.indexOf('completedAudit.reportDeliveryStatus) === "BATCH_READY"')
      < admin.indexOf('reportDeliveryStatus: "READY"'),
  );
  assert.match(manager, /Generic resume ignores Discovery audit/);
});

test("generic admin mutations are routed through the central Discovery barrier", () => {
  const routes = source("./routes.ts");
  const storage = source("./storage.ts");
  const barrier = source("./discoveryGenericMutationBarrier.ts");

  assert.match(storage, /async updateAudit[\s\S]*runGenericAuditMutation\(\{[\s\S]*operation: "storage\.updateAudit"/);
  assert.match(storage, /WHERE id = \$\$\{paramIndex\}[\s\S]*AND type <> 'GRATUIT'/);
  assert.match(barrier, /pg_advisory_xact_lock/);
  assert.match(barrier, /FROM audits WHERE id = \$1 FOR UPDATE/);
  assert.match(barrier, /DISCOVERY_GLOBAL_LOCK_ACTIVE/);
  assert.match(barrier, /DISCOVERY_GENERIC_MUTATION_BLOCKED/);

  for (const operation of [
    "admin.reset-scheduled",
    "admin.update-audit-responses",
    "admin.set-scheduled",
    "admin.mark-handled",
  ]) {
    assert.match(routes, new RegExp(`operation: "${operation.replace(/[.]/g, "\\.")}"`));
  }
  assert.match(routes, /admin\.mark-handled[\s\S]*type <> 'GRATUIT'/);
  assert.match(routes, /DISCOVERY_GENERIC_AUDIT_RECOVERY_BLOCKED/);

  for (const marker of [
    'app.post("/api/admin/backfill-rebuild-html"',
    'app.post("/api/admin/audit/:auditId/restore-snapshot"',
    'app.post("/api/admin/audit/:auditId/rebuild-html"',
    'app.post("/api/admin/audit/:auditId/patch-section"',
  ]) {
    const start = routes.indexOf(marker);
    const end = routes.indexOf("\n  app.", start + marker.length);
    const route = routes.slice(start, end > start ? end : undefined);
    assert.ok(start >= 0, marker);
    assert.match(route, /storage\.updateAudit/);
    assert.match(route, /if \(!updated\)/);
  }
});

test("Discovery jobs are owned by the transactional claim, never generic job storage", () => {
  const persistence = source("./discoveryTransactionalPersistence.ts");
  const generation = source("./discoveryGenerationService.ts");
  const manager = source("./reportJobManager.ts");

  const claimStart = persistence.indexOf("export async function claimDiscoveryGeneration");
  const persistStart = persistence.indexOf("export async function persistClaimedDiscoveryGeneration");
  const claim = persistence.slice(claimStart, persistStart);
  assert.match(persistence, /beginFencedTransaction[\s\S]*BEGIN[\s\S]*pg_advisory_xact_lock/);
  assert.match(claim, /beginFencedTransaction/);
  assert.match(claim, /SET report_delivery_status = 'GENERATING'/);
  assert.match(claim, /INSERT INTO report_jobs AS existing/);
  assert.match(claim, /WHERE existing\.status IN \('pending','failed','completed'\)/);
  assert.ok(
    claim.indexOf("SET report_delivery_status = 'GENERATING'")
      < claim.indexOf("INSERT INTO report_jobs AS existing"),
  );

  assert.doesNotMatch(generation, /createOrUpdateReportJob/);
  assert.match(generation, /startPremiumDiscoveryReportGeneration/);

  const genericStart = manager.slice(
    manager.indexOf("export async function startReportGeneration"),
    manager.indexOf("activeGenerations.size"),
  );
  assert.match(genericStart, /startPremiumDiscoveryReportGeneration/);
  assert.doesNotMatch(genericStart, /createOrUpdateReportJob/);
});
