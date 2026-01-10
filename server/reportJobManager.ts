import { generateAndConvertAudit } from "./geminiPremiumEngine";
import { generateAndConvertAuditWithClaude } from "./anthropicEngine";
import { generatePremiumHTMLFromTxt } from "./exportServicePremium";
import { storage } from "./storage";
import type { ClientData, AuditTier } from "./types";
import { ANTHROPIC_CONFIG } from "./anthropicConfig";
import { validateReport, logValidation, quickValidate } from "./reportValidator";
import { getSectionsForTier } from "./geminiPremiumEngine";
import { normalizeResponses } from "./responseNormalizer";

export type ProgressCallback = (progress: number, section: string) => Promise<void>;
import type { ReportJob, ReportJobStatusEnum } from "@shared/schema";

// Progress monitoring interval (2 minutes)
const PROGRESS_CHECK_INTERVAL_MS = 2 * 60 * 1000;

// Minimum validation score to accept report
const MIN_VALIDATION_SCORE = 60;

/**
 * Report Job Manager - Handles async AI report generation with persistence
 * 
 * Features:
 * - DB persistence for job state across server restarts
 * - In-memory Set prevents duplicate concurrent executions (same process)
 * - Automatic boot recovery via resumePendingJobs()
 * - AI call timeout protection (8 min)
 * - Stuck job detection (10 min threshold)
 * - Retry logic with max attempts (restarts don't consume retries)
 * - ⚠️ FIX: Photo analysis integration
 * 
 * Limitations (mono-instance design):
 * - No worker heartbeat system for multi-instance deployments
 * - No DB-level locking for concurrent worker coordination
 * - For HA/multi-instance, would need distributed job queue (Redis, SQS, etc.)
 */

// La génération OpenAI (multi-sections) peut être longue (429 + retries + cache).
// On doit donc éviter de considérer le job comme "stuck" tant que la génération est en cours.
const STUCK_JOB_THRESHOLD_MS = 45 * 60 * 1000;
const AI_CALL_TIMEOUT_MS = 45 * 60 * 1000;
const MAX_RETRY_ATTEMPTS = 3;

const activeGenerations = new Set<string>();
let shutdownHooksInstalled = false;

function installShutdownHooksOnce() {
  if (shutdownHooksInstalled) return;
  shutdownHooksInstalled = true;

  const handleShutdown = async (signal: string) => {
    try {
      const ids = Array.from(activeGenerations);
      if (ids.length === 0) {
        process.exit(0);
        return;
      }

      console.log(`[ReportJobManager] ${signal} reçu: requeue best-effort de ${ids.length} job(s) actifs...`);
      await Promise.race([
        (async () => {
          for (const auditId of ids) {
            try {
              // Marquer "pending" pour reprise au prochain boot (resumePendingJobs)
              await storage.createOrUpdateReportJob({
                auditId,
                status: "pending" as ReportJobStatusEnum,
                currentSection: "Interruption (redeploy). Reprise automatique en cours...",
              });
              await storage.updateAudit(auditId, { reportDeliveryStatus: "PENDING" as any });
            } catch {
              // best-effort
            }
          }
        })(),
        new Promise((resolve) => setTimeout(resolve, 4000)),
      ]);
    } finally {
      process.exit(0);
    }
  };

  process.on("SIGTERM", () => void handleShutdown("SIGTERM"));
  process.on("SIGINT", () => void handleShutdown("SIGINT"));
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, operation: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`[Timeout] ${operation} exceeded ${timeoutMs / 1000}s limit`));
    }, timeoutMs);

    promise
      .then((result) => {
        clearTimeout(timeoutId);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        reject(error);
      });
  });
}

export async function getJobStatus(auditId: string): Promise<ReportJob | null> {
  const job = await storage.getReportJob(auditId);
  return job || null;
}

export async function forceRegenerate(auditId: string): Promise<void> {
  await storage.deleteReportJob(auditId);
  console.log(`[ReportJobManager] Force deleted job for audit ${auditId}`);
}

export async function startReportGeneration(
  auditId: string,
  responses: Record<string, unknown>,
  scores: Record<string, number>,
  auditType: string
): Promise<ReportJob> {
  console.log(`[ReportJobManager] startReportGeneration called for audit ${auditId}`);
  installShutdownHooksOnce();
  
  if (activeGenerations.has(auditId)) {
    console.log(`[ReportJobManager] Job ${auditId} already running in-memory, returning existing`);
    const existingJob = await storage.getReportJob(auditId);
    if (existingJob) return existingJob;
  }
  
  const existingJob = await storage.getReportJob(auditId);
  
  if (existingJob) {
    if (existingJob.status === "pending" || existingJob.status === "generating") {
      const lastProgressTime = existingJob.lastProgressAt ? new Date(existingJob.lastProgressAt).getTime() : 0;
      const startedTime = existingJob.startedAt ? new Date(existingJob.startedAt).getTime() : Date.now();
      const referenceTime = lastProgressTime || startedTime;
      const isStuck = Date.now() - referenceTime > STUCK_JOB_THRESHOLD_MS;
      
      if (isStuck) {
        console.log(`[ReportJobManager] Job ${auditId} is stuck (no progress for ${STUCK_JOB_THRESHOLD_MS/1000}s), restarting...`);
        await storage.failReportJob(auditId, "Job stuck - no progress detected");
      } else {
        console.log(`[ReportJobManager] Job ${auditId} already running in DB, returning existing`);
        return existingJob;
      }
    } else if (existingJob.status === "completed") {
      console.log(`[ReportJobManager] Job ${auditId} already completed`);
      return existingJob;
    } else if (existingJob.status === "failed") {
      if ((existingJob.attemptCount || 0) >= MAX_RETRY_ATTEMPTS) {
        console.log(`[ReportJobManager] Job ${auditId} failed ${existingJob.attemptCount} times, not retrying`);
        return existingJob;
      }
      console.log(`[ReportJobManager] Job ${auditId} previously failed (attempt ${existingJob.attemptCount}), retrying...`);
    }
  }

  const attemptCount = existingJob?.attemptCount || 0;
  const job = await storage.createOrUpdateReportJob({
    auditId,
    status: "pending" as ReportJobStatusEnum,
    progress: 0,
    currentSection: "Initialisation...",
    error: null,
    attemptCount: attemptCount + 1,
  });

  console.log(`[ReportJobManager] Created/updated job for ${auditId}, attempt #${job.attemptCount}`);

  activeGenerations.add(auditId);
  generateReportAsync(auditId, responses, scores, auditType);

  return job;
}

async function generateReportAsync(
  auditId: string,
  responses: Record<string, unknown>,
  scores: Record<string, number>,
  auditType: string
): Promise<void> {
  const startTime = Date.now();
  console.log(`[ReportJobManager] Starting async generation for ${auditId}`);
  const normalizedResponses = normalizeResponses(responses);

  try {
    await storage.createOrUpdateReportJob({
      auditId,
      status: "generating" as ReportJobStatusEnum,
      currentSection: "Analyse de ton profil...",
      progress: 5,
    });

    // ⚠️ FIX: Récupérer les photos depuis audit.photos (tableau) ou responses
    const audit = await storage.getAudit(auditId);
    const auditResponses = (audit as any)?.responses || {};

    const pickPhoto = (source: any, keys: string[]): string | null => {
      if (!source) return null;
      for (const key of keys) {
        const value = source?.[key];
        if (typeof value === "string" && value.trim().length > 100) {
          return value;
        }
      }
      return null;
    };
    
    // Les photos peuvent être stockées de plusieurs façons selon le flux
    let photos: string[] = [];
    
    // Option 1: audit.photos (tableau direct - flux principal)
    if ((audit as any)?.photos && Array.isArray((audit as any).photos)) {
      photos = (audit as any).photos.filter((p: string) => p && (p.startsWith('data:') || p.length > 100));
    }
    // Option 2: Dans responses (flux alternatif)
    else if (
      auditResponses.photoFront ||
      auditResponses.photoSide ||
      auditResponses.photoBack ||
      auditResponses["photo-front"] ||
      auditResponses["photo-side"] ||
      auditResponses["photo-back"]
    ) {
      photos = [
        pickPhoto(auditResponses, ["photoFront", "photo-front"]),
        pickPhoto(auditResponses, ["photoSide", "photo-side"]),
        pickPhoto(auditResponses, ["photoBack", "photo-back"]),
      ].filter(Boolean) as string[];
    }
    // Option 3: Direct sur audit (legacy)
    else if (
      (audit as any)?.photoFront ||
      (audit as any)?.photoSide ||
      (audit as any)?.photoBack ||
      (audit as any)?.["photo-front"] ||
      (audit as any)?.["photo-side"] ||
      (audit as any)?.["photo-back"]
    ) {
      photos = [
        pickPhoto(audit as any, ["photoFront", "photo-front"]),
        pickPhoto(audit as any, ["photoSide", "photo-side"]),
        pickPhoto(audit as any, ["photoBack", "photo-back"]),
      ].filter(Boolean) as string[];
    }
    
    // P0 fail-fast : seul ELITE (Ultimate Scan) nécessite 3 photos pour l'analyse visuelle/posturale
    // GRATUIT et PREMIUM n'ont pas besoin de photos
    const requiresPhotos = auditType === "ELITE";
    const needsPhotos = requiresPhotos && photos.length < 3;

    if (needsPhotos) {
      console.error(`[ReportJobManager] Photos insuffisantes pour ${auditId} (${photos.length}/3, type=${auditType}). Rapport non généré.`);
      await storage.failReportJob(auditId, "NEED_PHOTOS");
      await storage.updateAudit(auditId, { reportDeliveryStatus: "NEED_PHOTOS" as any });
      activeGenerations.delete(auditId);
      return;
    } else if (requiresPhotos) {
      console.log(`[ReportJobManager] Photos OK pour ${auditId} (count=${photos.length})`);
    } else {
      console.log(`[ReportJobManager] ${auditId} est GRATUIT - photos non requises`);
    }

    let photoAnalysis = null;
    if (photos.length > 0) {
      console.log(`[ReportJobManager] ${photos.length} photos detectees, lancement analyse vision...`);
      
      await storage.createOrUpdateReportJob({
        auditId,
        status: "generating" as ReportJobStatusEnum,
        currentSection: "Analyse de tes photos corporelles...",
        progress: 10,
      });
      
      try {
        const { analyzeBodyPhotosWithAI } = await import("./photoAnalysisAI");
        // API attendue: { front, side, back }
        photoAnalysis = await analyzeBodyPhotosWithAI({
          front: photos[0],
          side: photos[1],
          back: photos[2],
        } as any);
        console.log(`[ReportJobManager] Analyse vision terminee - confiance: ${photoAnalysis.confidenceLevel}%`);
      } catch (visionError) {
        console.error(`[ReportJobManager] Erreur analyse vision:`, visionError);
        // Continue sans analyse photo - pas bloquant
      }
    } else {
      console.log(`[ReportJobManager] Aucune photo fournie pour ${auditId}`);
    }

    await storage.createOrUpdateReportJob({
      auditId,
      status: "generating" as ReportJobStatusEnum,
      currentSection: "Génération du rapport expert...",
      progress: 20,
    });

    console.log(`[ReportJobManager] Calling Claude Opus 4.5 engine for ${auditId}`);

    // Utiliser Claude Opus 4.5 pour la génération
    const generationPromise = withTimeout(
      generateAndConvertAuditWithClaude(normalizedResponses as ClientData, photoAnalysis, auditType as any, auditId),
      AI_CALL_TIMEOUT_MS,
      `Claude Opus 4.5 report generation for ${auditId}`
    );

    // ============================================
    // MONITORING PROGRESSION (toutes les 15s heartbeat + 2min check)
    // ============================================
    const heartbeatIntervalMs = 15 * 1000; // toutes les 15 secondes
    let lastHeartbeatPct = 20;
    let lastProgressCheckTime = Date.now();
    let lastProgressCheckPct = 0;
    let stuckCheckCount = 0;
    const expectedSections = getSectionsForTier((auditType as AuditTier) || 'PREMIUM').length;

    const heartbeat = setInterval(async () => {
      const elapsed = Date.now() - startTime;

      // Progression "douce" de 20 -> 90 sur toute la fenêtre de timeout
      const pct = Math.min(90, 20 + Math.floor((elapsed / AI_CALL_TIMEOUT_MS) * 70));
      if (pct <= lastHeartbeatPct) return;
      lastHeartbeatPct = pct;

      await storage
        .updateReportJobProgress(
          auditId,
          pct,
          `Génération du rapport expert... (${pct}%)`
        )
        .catch(() => {
          // best-effort
        });

      // ============================================
      // CHECK PROGRESSION TOUTES LES 2 MINUTES
      // ============================================
      const timeSinceLastCheck = Date.now() - lastProgressCheckTime;
      if (timeSinceLastCheck >= PROGRESS_CHECK_INTERVAL_MS) {
        lastProgressCheckTime = Date.now();

        // Check if progress has actually been made
        if (pct <= lastProgressCheckPct + 2) {
          stuckCheckCount++;
          console.warn(`[ReportJobManager] ⚠️ Progression stagnante pour ${auditId} - check #${stuckCheckCount} (${pct}%)`);

          // After 3 stuck checks (6 minutes of no progress), log warning
          if (stuckCheckCount >= 3) {
            console.error(`[ReportJobManager] 🚨 ALERTE: Audit ${auditId} potentiellement bloqué depuis ${stuckCheckCount * 2} minutes!`);
          }
        } else {
          // Progress is being made, reset counter
          if (stuckCheckCount > 0) {
            console.log(`[ReportJobManager] ✅ Progression reprise pour ${auditId} après ${stuckCheckCount} checks stagnants`);
          }
          stuckCheckCount = 0;
        }

        lastProgressCheckPct = pct;
        console.log(`[ReportJobManager] [2min check] Audit ${auditId}: ${pct}% - Elapsed: ${Math.round(elapsed / 1000)}s`);
      }
    }, heartbeatIntervalMs);

    const result = await generationPromise.finally(() => clearInterval(heartbeat));

    if (!result.success) {
      throw new Error(result.error || "Claude Opus 4.5 generation failed");
    }

    // ⚠️ IMPORTANT: Ne PAS marquer comme COMPLETED avant d'avoir généré le HTML
    // et sauvegardé dans la DB. Sinon le client voit "COMPLETED" mais pas de rapport.
    
    // Convert TXT to HTML with Premium Design (Ultrahuman-style)
    console.log(`[ReportJobManager] Converting TXT to Premium HTML for ${auditId}...`);
    const reportHtml = generatePremiumHTMLFromTxt(
      result.txt || '',
      auditId,
      photos,
      normalizedResponses as Record<string, unknown>
    );
    
    if (!reportHtml || reportHtml.length < 1000) {
      throw new Error(`HTML generation failed or too short (${reportHtml?.length || 0} chars)`);
    }

    console.log(`[ReportJobManager] HTML generated: ${reportHtml.length} chars for ${auditId}`);

    // ============================================
    // VALIDATION OBLIGATOIRE AVANT ENVOI
    // ============================================
    const tier = (auditType as AuditTier) || 'PREMIUM';
    const validation = validateReport(result.txt || '', reportHtml, tier);
    logValidation(auditId, validation);

    // Check if report meets quality standards
    if (!validation.isValid || validation.score < MIN_VALIDATION_SCORE) {
      console.error(`[ReportJobManager] ❌ VALIDATION FAILED for ${auditId}`);
      console.error(`[ReportJobManager] Score: ${validation.score}/100 (minimum: ${MIN_VALIDATION_SCORE})`);
      console.error(`[ReportJobManager] Errors: ${validation.errors.join(', ')}`);

      // Save the report anyway but mark as NEEDS_REVIEW
      await storage.updateAudit(auditId, {
        narrativeReport: {
          txt: result.txt,
          html: reportHtml,
          clientName: result.clientName,
          metadata: result.metadata,
          validationResult: validation,
          photoAnalysis: photoAnalysis, // Include photo analysis for frontend display
        },
        reportTxt: result.txt || '',
        reportHtml: reportHtml,
        reportGeneratedAt: new Date(),
        reportDeliveryStatus: "NEEDS_REVIEW",
      });

      // Fail the job so email is NOT sent
      throw new Error(`Validation échouée (score: ${validation.score}/100). Rapport nécessite révision manuelle. Erreurs: ${validation.errors.slice(0, 3).join('; ')}`);
    }

    console.log(`[ReportJobManager] ✅ VALIDATION PASSED for ${auditId} (score: ${validation.score}/100)`);

    const report = {
      txt: result.txt,
      html: reportHtml,
      clientName: result.clientName,
      metadata: result.metadata,
      validationResult: validation,
      photoAnalysis: photoAnalysis, // Include photo analysis for frontend display
    };

    // Sauvegarder le rapport dans l'audit AVANT de marquer comme COMPLETED
    await storage.updateAudit(auditId, {
      narrativeReport: report,
      reportTxt: result.txt || '',
      reportHtml: reportHtml,
      reportGeneratedAt: new Date(),
      reportDeliveryStatus: "READY",
    });

    console.log(`[ReportJobManager] Report saved to audit ${auditId}`);

    // Traçabilité: conserver CHAQUE version générée (TXT + HTML) dans une table dédiée
    await storage.createReportArtifact({
      auditId,
      tier: String(auditType || "PREMIUM"),
      engine: "anthropic",
      model: ANTHROPIC_CONFIG.ANTHROPIC_MODEL,
      txt: String(result.txt || ""),
      html: String(reportHtml || ""),
    });

    // ✅ MAINTENANT on peut marquer comme COMPLETED (après que tout soit sauvegardé)
    await storage.completeReportJob(auditId);

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[ReportJobManager] Generation COMPLETED for ${auditId} in ${duration}s (HTML: ${reportHtml.length} chars)`);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error(`[ReportJobManager] Generation FAILED for ${auditId}:`, errorMessage);
    
    await storage.failReportJob(auditId, errorMessage);
    
    await storage.updateAudit(auditId, {
      reportDeliveryStatus: "FAILED",
    });
  } finally {
    activeGenerations.delete(auditId);
  }
}

export async function resumePendingJobs(): Promise<number> {
  console.log(`[ReportJobManager] Checking for pending jobs to resume after restart...`);
  
  const activeJobs = await storage.getActiveReportJobs();
  let resumedCount = 0;

  for (const job of activeJobs) {
    const currentAttempts = job.attemptCount || 0;
    console.log(`[ReportJobManager] Found interrupted job ${job.auditId} (status: ${job.status}, attempts: ${currentAttempts})`);
    
    if (currentAttempts >= MAX_RETRY_ATTEMPTS) {
      console.log(`[ReportJobManager] Job ${job.auditId} already at max retries (${MAX_RETRY_ATTEMPTS}), marking as FAILED`);
      await storage.failReportJob(job.auditId, "Max retries exceeded");
      await storage.updateAudit(job.auditId, { reportDeliveryStatus: "FAILED" });
      continue;
    }
    
    const audit = await storage.getAudit(job.auditId);
    if (!audit) {
      console.log(`[ReportJobManager] Could not find audit ${job.auditId}, cleaning up orphan job`);
      await storage.deleteReportJob(job.auditId);
      continue;
    }
    
    console.log(`[ReportJobManager] Resuming job ${job.auditId} (attempt ${currentAttempts}, not incrementing for restart)`);
    
    await storage.createOrUpdateReportJob({
      auditId: job.auditId,
      status: "pending" as ReportJobStatusEnum,
      progress: 0,
      currentSection: "Reprise après interruption...",
      error: null,
      attemptCount: currentAttempts,
    });
    
    activeGenerations.add(job.auditId);
    generateReportAsync(job.auditId, audit.responses, audit.scores, audit.type);
    resumedCount++;
  }

  console.log(`[ReportJobManager] Resume check complete. Resumed ${resumedCount} jobs out of ${activeJobs.length} active.`);
  return resumedCount;
}

export async function getStuckJobs(): Promise<ReportJob[]> {
  const activeJobs = await storage.getActiveReportJobs();
  const stuckJobs: ReportJob[] = [];

  for (const job of activeJobs) {
    const lastProgressTime = job.lastProgressAt ? new Date(job.lastProgressAt).getTime() : 0;
    const startedTime = job.startedAt ? new Date(job.startedAt).getTime() : Date.now();
    const referenceTime = lastProgressTime || startedTime;
    if (Date.now() - referenceTime > STUCK_JOB_THRESHOLD_MS) {
      stuckJobs.push(job);
    }
  }

  return stuckJobs;
}

export async function clearJob(auditId: string): Promise<void> {
  await storage.deleteReportJob(auditId);
  console.log(`[ReportJobManager] Cleared job for ${auditId}`);
}
