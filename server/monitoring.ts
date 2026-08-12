/**
 * Monitoring automatique des jobs de génération de rapports
 *
 * Ce module détecte et relance automatiquement:
 * - Les jobs GENERATING bloqués depuis > 2h
 * - Les jobs NEEDS_REVIEW qui peuvent être régénérés
 * - Les jobs FAILED avec tentatives restantes
 *
 * Tout est tracé en DB pour audit complet.
 */

import { storage } from "./storage";
import { startReportGeneration } from "./reportJobManager";
import { isOpenAICreditError } from "./openaiResponses";
import { log } from "./index";
import { shouldAutoRegenerateNeedsReviewAudit } from "./discoveryDeliveryGate";
import { recoverMissingDiscoveryJobs } from "./discoveryMissingJobRecovery";
import { generateAndPersistPremiumDiscoveryReport } from "./discoveryGenerationService";
import { isDiscoverySupersededTerminal } from "./discoverySupersededPolicy";
import { isDiscoveryGlobalLockActive } from "./discoveryBatchControl";

interface MonitoringStats {
  generatingStuck: number;
  needsReviewFixed: number;
  failedRetried: number;
  errors: Array<{ auditId: string; error: string }>;
}

const STUCK_THRESHOLD_MS = 2 * 60 * 60 * 1000; // 2 heures
const MAX_RETRY_ATTEMPTS = 3;
let monitoringRunning = false;

/**
 * Détecte et relance automatiquement les jobs problématiques
 * Appelé par le cron toutes les 10 minutes
 */
export async function runAutomaticMonitoring(): Promise<MonitoringStats> {
  if (monitoringRunning) {
    log("Monitoring: previous run still in progress, skipping", "monitoring");
    return { generatingStuck: 0, needsReviewFixed: 0, failedRetried: 0, errors: [] };
  }

  monitoringRunning = true;
  const stats: MonitoringStats = {
    generatingStuck: 0,
    needsReviewFixed: 0,
    failedRetried: 0,
    errors: [],
  };

  // A remediation batch owns every Discovery mutation while its durable lock
  // is alive. Paid-report monitoring remains available. The lock check fails
  // closed, so a DB error cannot accidentally trigger an unbudgeted Discovery
  // recovery call.
  const discoveryBatchLocked = await isDiscoveryGlobalLockActive();

  try {
    log("Monitoring: Starting automatic job recovery", "monitoring");

    // 1. Relancer les jobs GENERATING bloqués
    await fixStuckGeneratingJobs(stats);

    // 2. Régénérer les NEEDS_REVIEW avec retry intelligent
    await fixNeedsReviewJobs(stats, discoveryBatchLocked);

    // 2b. Discovery failures from the legacy inline generator had no durable
    // report_jobs row. Recover only artifact-less audits, once, after applying
    // the recent duplicate policy.
    if (!discoveryBatchLocked) await recoverMissingDiscoveryJobs({
      listNeedsReviewAudits: async () => {
        const summaries = await storage.getAllAuditsLight();
        const ids = summaries
          .filter((audit) =>
            audit.type === "GRATUIT" &&
            audit.reportDeliveryStatus === "NEEDS_REVIEW" &&
            !isDiscoverySupersededTerminal(audit)
          )
          .map((audit) => audit.id);
        const audits = await Promise.all(ids.map((id) => storage.getAudit(id)));
        return audits.filter((audit): audit is NonNullable<typeof audit> => Boolean(audit));
      },
      listAuditSummaries: () => storage.getAllAuditsLight(),
      hasReportJob: async (auditId) => Boolean(await storage.getReportJob(auditId)),
      hasReportArtifact: (auditId) => storage.hasReportArtifact(auditId),
      enqueueMissingReportJob: (auditId, reason) =>
        storage.enqueueMissingDiscoveryReportJob(auditId, reason),
      markSuperseded: (auditId, replacementAuditId, reason) =>
        storage.markDiscoveryAuditSuperseded(auditId, replacementAuditId, reason),
      startEnqueuedJob: async (auditId) => {
        await generateAndPersistPremiumDiscoveryReport(auditId);
      },
      log: logMonitoringAction,
    });

    // 3. Retry les FAILED avec tentatives restantes
    await retryFailedJobs(stats);

    log(
      `Monitoring: Done - ${stats.generatingStuck} stuck fixed, ${stats.needsReviewFixed} needs_review fixed, ${stats.failedRetried} failed retried`,
      "monitoring"
    );
  } catch (error) {
    console.error("[Monitoring] Error in automatic monitoring:", error);
  } finally {
    monitoringRunning = false;
  }

  return stats;
}

/**
 * Relance les audits bloqués en GENERATING depuis > 2h
 */
async function fixStuckGeneratingJobs(stats: MonitoringStats): Promise<void> {
  try {
    const { db } = await import("./db.js");
    const { audits } = await import("../shared/drizzle-schema.js");
    const { eq, and, lt } = await import("drizzle-orm");

    const twoHoursAgo = new Date(Date.now() - STUCK_THRESHOLD_MS);

    const stuckAudits = await db
      .select()
      .from(audits)
      .where(
        and(
          eq(audits.reportDeliveryStatus, "GENERATING"),
          lt(audits.createdAt, twoHoursAgo)
        )
      );

    for (const audit of stuckAudits) {
      try {
        if (audit.type === "GRATUIT") {
          continue;
        }
        log(`Monitoring: Restarting stuck audit ${audit.id}`, "monitoring");

        // Check retry count
        const reportJob = await storage.getReportJob(audit.id);
        const attemptCount = reportJob?.attemptCount || 0;

        if (attemptCount >= MAX_RETRY_ATTEMPTS) {
          log(
            `Monitoring: Audit ${audit.id} already at max retries (${MAX_RETRY_ATTEMPTS}), marking as FAILED`,
            "monitoring"
          );
          await storage.updateAudit(audit.id, { reportDeliveryStatus: "FAILED" });
          await storage.failReportJob(audit.id, "Max retries exceeded after auto-monitoring");
          continue;
        }

        // Reset and restart
        await storage.updateAudit(audit.id, { reportDeliveryStatus: "GENERATING" });
        await startReportGeneration(audit.id, audit.responses, audit.scores || {}, audit.type);

        // processReportAndSendEmail will be called by reportJobManager
        const { default: routes } = await import("./routes.js");
        // Note: processReportAndSendEmail is internal to routes, called automatically

        stats.generatingStuck++;

        // Log to DB for audit trail
        await logMonitoringAction(audit.id, "RESTART_STUCK_GENERATING", {
          attemptCount,
          reason: `Stuck in GENERATING for > 2h`,
        });
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Unknown error";
        stats.errors.push({ auditId: audit.id, error: errorMsg });
        console.error(`[Monitoring] Error restarting audit ${audit.id}:`, error);
      }
    }
  } catch (error) {
    console.error("[Monitoring] Error in fixStuckGeneratingJobs:", error);
  }
}

/**
 * Régénère les audits NEEDS_REVIEW avec retry intelligent
 */
async function fixNeedsReviewJobs(
  stats: MonitoringStats,
  discoveryBatchLocked: boolean,
): Promise<void> {
  try {
    const { db } = await import("./db.js");
    const { audits } = await import("../shared/drizzle-schema.js");
    const { eq } = await import("drizzle-orm");

    const needsReviewAudits = await db
      .select()
      .from(audits)
      .where(eq(audits.reportDeliveryStatus, "NEEDS_REVIEW"));

    for (const audit of needsReviewAudits) {
      try {
        if (isDiscoverySupersededTerminal(audit)) continue;
        if (audit.type === "GRATUIT" && discoveryBatchLocked) continue;
        const reportJob = await storage.getReportJob(audit.id);
        const attemptCount = reportJob?.attemptCount || 0;
        const providerCreditFailure = isOpenAICreditError(
          new Error(String((reportJob as any)?.error || "")),
        );
        if (!shouldAutoRegenerateNeedsReviewAudit(audit, {
          operationalFailure: providerCreditFailure,
        })) {
          continue;
        }

        if (audit.type === "GRATUIT") {
          if (!providerCreditFailure) continue;
          await storage.deleteReportJob(audit.id).catch(() => {});
          const claimed = await storage.claimAuditForGeneration(audit.id).catch(() => false);
          if (!claimed) continue;
          await generateAndPersistPremiumDiscoveryReport(audit.id);
          stats.needsReviewFixed++;
          await logMonitoringAction(audit.id, "REGENERATE_DISCOVERY_PROVIDER_RECOVERY", {
            reason: "OpenAI credit recovered; generation only, delivery remains gated",
          });
          continue;
        }

        if (attemptCount >= MAX_RETRY_ATTEMPTS && !providerCreditFailure) {
          log(
            `Monitoring: Audit ${audit.id} NEEDS_REVIEW already at max retries (${MAX_RETRY_ATTEMPTS}), skipping`,
            "monitoring"
          );
          continue;
        }

        if (providerCreditFailure) {
          console.warn(
            `Monitoring: Audit ${audit.id} has a previous OpenAI credit interruption , retry counter will be reset`,
          );
        }

        log(`Monitoring: Regenerating NEEDS_REVIEW audit ${audit.id} (attempt ${attemptCount + 1})`, "monitoring");

        // Clear old failed report and restart
        await storage.updateAudit(audit.id, {
          reportDeliveryStatus: "GENERATING",
          narrativeReport: null,
        });

        await storage.deleteReportJob(audit.id).catch(() => {});
        await startReportGeneration(audit.id, audit.responses, audit.scores || {}, audit.type);

        stats.needsReviewFixed++;

        // Log to DB for audit trail
        await logMonitoringAction(audit.id, "REGENERATE_NEEDS_REVIEW", {
          attemptCount: attemptCount + 1,
          reason: providerCreditFailure
            ? "Auto-regeneration after provider credit recovery"
            : "Auto-regeneration after validation failure",
        });
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Unknown error";
        stats.errors.push({ auditId: audit.id, error: errorMsg });
        console.error(`[Monitoring] Error regenerating NEEDS_REVIEW audit ${audit.id}:`, error);
      }
    }
  } catch (error) {
    console.error("[Monitoring] Error in fixNeedsReviewJobs:", error);
  }
}

/**
 * Retry les audits FAILED avec tentatives restantes
 */
async function retryFailedJobs(stats: MonitoringStats): Promise<void> {
  try {
    const { db } = await import("./db.js");
    const { audits } = await import("../shared/drizzle-schema.js");
    const { eq } = await import("drizzle-orm");

    const failedAudits = await db
      .select()
      .from(audits)
      .where(eq(audits.reportDeliveryStatus, "FAILED"));

    for (const audit of failedAudits) {
      try {
        if (audit.type === "GRATUIT") {
          continue;
        }
        const reportJob = await storage.getReportJob(audit.id);
        const attemptCount = reportJob?.attemptCount || 0;

        if (attemptCount >= MAX_RETRY_ATTEMPTS) {
          // Max retries reached, skip
          continue;
        }

        log(`Monitoring: Retrying FAILED audit ${audit.id} (attempt ${attemptCount + 1})`, "monitoring");

        await storage.updateAudit(audit.id, { reportDeliveryStatus: "GENERATING" });
        await startReportGeneration(audit.id, audit.responses, audit.scores || {}, audit.type);

        stats.failedRetried++;

        await logMonitoringAction(audit.id, "RETRY_FAILED", {
          attemptCount: attemptCount + 1,
          reason: "Auto-retry after failure",
        });
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Unknown error";
        stats.errors.push({ auditId: audit.id, error: errorMsg });
        console.error(`[Monitoring] Error retrying FAILED audit ${audit.id}:`, error);
      }
    }
  } catch (error) {
    console.error("[Monitoring] Error in retryFailedJobs:", error);
  }
}

/**
 * Log une action de monitoring en DB pour traçabilité complète
 */
async function logMonitoringAction(
  auditId: string,
  action: string,
  metadata: Record<string, any>
): Promise<void> {
  try {
    const { pool } = await import("./db.js");

    await pool.query(
      `INSERT INTO monitoring_logs (audit_id, action, metadata, created_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT DO NOTHING`,
      [auditId, action, JSON.stringify(metadata)]
    );
  } catch (error) {
    // Non-blocking - if table doesn't exist yet, that's ok
    // Will be created by migration
    console.error(`[Monitoring] Warning: Could not log action to DB:`, error);
  }
}

/**
 * Récupère l'historique de monitoring pour un audit
 */
export async function getMonitoringHistory(auditId: string): Promise<any[]> {
  try {
    const { pool } = await import("./db.js");

    const result = await pool.query(
      `SELECT * FROM monitoring_logs
       WHERE audit_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [auditId]
    );

    return result.rows;
  } catch (error) {
    console.error(`[Monitoring] Error getting history for ${auditId}:`, error);
    return [];
  }
}

/**
 * Crée la table monitoring_logs si elle n'existe pas
 */
export async function ensureMonitoringTable(): Promise<void> {
  try {
    const { pool } = await import("./db.js");

    await pool.query(`
      CREATE TABLE IF NOT EXISTS monitoring_logs (
        id SERIAL PRIMARY KEY,
        audit_id TEXT NOT NULL,
        action TEXT NOT NULL,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_monitoring_logs_audit_id ON monitoring_logs(audit_id);
      CREATE INDEX IF NOT EXISTS idx_monitoring_logs_created_at ON monitoring_logs(created_at);
    `);

    log("Monitoring: Table monitoring_logs ready", "monitoring");
  } catch (error) {
    console.error("[Monitoring] Error creating monitoring_logs table:", error);
  }
}
