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
import { log } from "./index";

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

  try {
    log("Monitoring: Starting automatic job recovery", "monitoring");

    // 1. Relancer les jobs GENERATING bloqués
    await fixStuckGeneratingJobs(stats);

    // 2. Régénérer les NEEDS_REVIEW avec retry intelligent
    await fixNeedsReviewJobs(stats);

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
        const totalRegenAttempts = await getAuditRegenCount(audit);
        const currentMeta = ((audit as any).metadata as any) || {};

        if (totalRegenAttempts >= MAX_RETRY_ATTEMPTS) {
          log(
            `Monitoring: Audit ${audit.id} stuck at audit-level cap (${totalRegenAttempts}/${MAX_RETRY_ATTEMPTS}), marking BLOCKED`,
            "monitoring"
          );
          await markAuditBlockedAndAlert(audit, totalRegenAttempts, "Stuck in GENERATING after max regen");
          continue;
        }

        const nextAttempt = await bumpAuditRegenCount(audit.id, totalRegenAttempts, currentMeta);
        log(`Monitoring: Restarting stuck audit ${audit.id} (attempt ${nextAttempt}/${MAX_RETRY_ATTEMPTS})`, "monitoring");

        // Reset and restart
        await storage.updateAudit(audit.id, { reportDeliveryStatus: "GENERATING" });
        await startReportGeneration(audit.id, audit.responses, audit.scores || {}, audit.type);

        stats.generatingStuck++;

        // Log to DB for audit trail
        await logMonitoringAction(audit.id, "RESTART_STUCK_GENERATING", {
          attemptCount: nextAttempt,
          totalRegenAttempts: nextAttempt,
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
 * Reads the persistent audit-level regen counter that survives reportJob deletes.
 * If the counter is absent (legacy audits before this patch), seed it from the
 * monitoring_logs row count so this run sees an accurate history. Without this
 * seed, audits like paulmtya 2026-06-07 sat in an infinite NEEDS_REVIEW loop
 * because the reportJob.attemptCount got wiped on every regen.
 */
async function getAuditRegenCount(audit: any): Promise<number> {
  const meta = ((audit as any).metadata as any) || {};
  if (typeof meta.totalRegenAttempts === "number") return meta.totalRegenAttempts;
  try {
    const { pool } = await import("./db.js");
    const r = await pool.query(
      "SELECT COUNT(*) AS c FROM monitoring_logs WHERE audit_id = $1 AND action IN ('REGENERATE_NEEDS_REVIEW', 'RETRY_FAILED', 'RESTART_STUCK_GENERATING')",
      [audit.id]
    );
    return Number(r.rows[0]?.c || 0);
  } catch {
    return 0;
  }
}

async function bumpAuditRegenCount(auditId: string, current: number, currentMeta: any): Promise<number> {
  const next = current + 1;
  await storage.updateAudit(auditId, {
    metadata: { ...(currentMeta || {}), totalRegenAttempts: next },
  } as any);
  return next;
}

async function markAuditBlockedAndAlert(audit: any, totalRegenAttempts: number, lastReason: string): Promise<void> {
  await storage.updateAudit(audit.id, { reportDeliveryStatus: "BLOCKED" } as any);
  await logMonitoringAction(audit.id, "BLOCKED_MAX_REGEN", {
    totalRegenAttempts,
    lastReason,
  });
  try {
    const { sendCTAEmail } = await import("./emailService.js");
    const adminEmail = process.env.ADMIN_NOTIF_EMAIL || "coaching@achzodcoaching.com";
    await sendCTAEmail(
      adminEmail,
      `[BLOQUE] Audit ${audit.email} - validation a echoue ${totalRegenAttempts}x`,
      `L'audit ${audit.id} (${audit.email}, type=${audit.type}) a echoue la validation ${totalRegenAttempts} fois consecutives.\n\nIntervention manuelle requise. Le rapport NE sera PAS livre automatiquement tant que l'audit reste en status BLOCKED.\n\nDernier motif: ${lastReason}\n\nDebug: GET /api/admin/audits/${audit.id}/validation-details\nMonitoring: GET /api/admin/audits/${audit.id}/monitoring-history\n\nPour relancer (avec compteur reset): POST /api/admin/force-regenerate-failed { auditId: "${audit.id}" }`
    );
  } catch (err) {
    console.error(`[Monitoring] Failed to send BLOCKED alert for ${audit.id}:`, err);
  }
}

/**
 * Régénère les audits NEEDS_REVIEW avec retry intelligent
 */
async function fixNeedsReviewJobs(stats: MonitoringStats): Promise<void> {
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
        const totalRegenAttempts = await getAuditRegenCount(audit);
        const currentMeta = ((audit as any).metadata as any) || {};

        if (totalRegenAttempts >= MAX_RETRY_ATTEMPTS) {
          log(
            `Monitoring: Audit ${audit.id} NEEDS_REVIEW at audit-level cap (${totalRegenAttempts}/${MAX_RETRY_ATTEMPTS}), marking BLOCKED`,
            "monitoring"
          );
          await markAuditBlockedAndAlert(audit, totalRegenAttempts, "Validation still failing after max regen");
          continue;
        }

        const nextAttempt = await bumpAuditRegenCount(audit.id, totalRegenAttempts, currentMeta);
        log(`Monitoring: Regenerating NEEDS_REVIEW audit ${audit.id} (attempt ${nextAttempt}/${MAX_RETRY_ATTEMPTS})`, "monitoring");

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
          attemptCount: nextAttempt,
          totalRegenAttempts: nextAttempt,
          reason: "Auto-regeneration after validation failure",
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
        const totalRegenAttempts = await getAuditRegenCount(audit);
        const currentMeta = ((audit as any).metadata as any) || {};

        if (totalRegenAttempts >= MAX_RETRY_ATTEMPTS) {
          log(
            `Monitoring: Audit ${audit.id} FAILED at audit-level cap (${totalRegenAttempts}/${MAX_RETRY_ATTEMPTS}), marking BLOCKED`,
            "monitoring"
          );
          await markAuditBlockedAndAlert(audit, totalRegenAttempts, "Job FAILED after max regen");
          continue;
        }

        const nextAttempt = await bumpAuditRegenCount(audit.id, totalRegenAttempts, currentMeta);
        log(`Monitoring: Retrying FAILED audit ${audit.id} (attempt ${nextAttempt}/${MAX_RETRY_ATTEMPTS})`, "monitoring");

        await storage.updateAudit(audit.id, { reportDeliveryStatus: "GENERATING" });
        await startReportGeneration(audit.id, audit.responses, audit.scores || {}, audit.type);

        stats.failedRetried++;

        await logMonitoringAction(audit.id, "RETRY_FAILED", {
          attemptCount: nextAttempt,
          totalRegenAttempts: nextAttempt,
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
