import { deleteCache as deleteGeminiCache, getSectionsForTier } from "./geminiPremiumEngine";
import { generateAndConvertAuditWithOpenAI, deleteOpenAICache } from "./openaiPremiumEngine";
import { generatePremiumHTMLFromTxt } from "./exportServicePremium";
import { storage } from "./storage";
import type { ClientData, AuditTier } from "./types";
import {
  isOpenAICreditError,
  openAIModelForProfile,
  OPENAI_REPORT_MODEL,
} from "./openaiResponses";
import { validateReport, logValidation, quickValidate } from "./reportValidator";
import { normalizeResponses } from "./responseNormalizer";
import { repairReportTextForDelivery } from "./reportTextRepair";
import { analyzeDiscoveryScan, convertToNarrativeReport } from "./discovery-scan";

export type ProgressCallback = (progress: number, section: string) => Promise<void>;
import type { ReportJob, ReportJobStatusEnum } from "@shared/schema";

// Progress monitoring interval (2 minutes)
const PROGRESS_CHECK_INTERVAL_MS = 2 * 60 * 1000;

// Minimum validation score to accept report
const MIN_VALIDATION_SCORE = 75;

/**
 * Report Job Manager - Handles async AI report generation with persistence
 *
 * Features:
 * - DB persistence for job state across server restarts
 * - In-memory Set prevents duplicate concurrent executions (same process)
 * - Automatic boot recovery via resumePendingJobs()
 * - AI call timeout protection sized for full xhigh multi-section reports
 * - Stuck job detection aligned with the full report window
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
const STUCK_JOB_THRESHOLD_MS = 90 * 60 * 1000;
const AI_CALL_TIMEOUT_MS = 90 * 60 * 1000;
const MAX_RETRY_ATTEMPTS = 3;

const activeGenerations = new Set<string>();
const MAX_CONCURRENT_GENERATIONS = 1; // 1 rapport à la fois ,  stabilité > vitesse
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
  deleteGeminiCache(auditId);
  deleteOpenAICache(auditId);
  activeGenerations.delete(auditId);
  await storage.deleteReportJob(auditId);
  // Reset everything so the job starts completely fresh
  await storage.updateAudit(auditId, {
    narrativeReport: null as any,
    reportDeliveryStatus: "GENERATING",
    reportScheduledFor: null as any,
  });
  console.log(`[ReportJobManager] Force deleted job + reset narrative for audit ${auditId}`);
}

export async function startReportGeneration(
  auditId: string,
  responses: Record<string, unknown>,
  scores: Record<string, number>,
  auditType: string
): Promise<ReportJob> {
  console.log(`[ReportJobManager] startReportGeneration called for audit ${auditId}`);
  installShutdownHooksOnce();

  // ============================================
  // CONCURRENCY LIMIT: 1 rapport à la fois
  // ============================================
  if (activeGenerations.size >= MAX_CONCURRENT_GENERATIONS && !activeGenerations.has(auditId)) {
    console.log(`[ReportJobManager] ⏳ Queue full (${activeGenerations.size}/${MAX_CONCURRENT_GENERATIONS} active). Scheduling ${auditId} for later.`);
    const queuedJob = await storage.createOrUpdateReportJob({
      auditId,
      status: "pending" as ReportJobStatusEnum,
      progress: 0,
      currentSection: "En attente ,  un autre rapport est en cours de generation...",
      error: null,
      attemptCount: 0,
    });
    return queuedJob;
  }

  if (activeGenerations.has(auditId)) {
    console.log(`[ReportJobManager] Job ${auditId} already running in-memory, returning existing`);
    const existingJob = await storage.getReportJob(auditId);
    if (existingJob) return existingJob;
  }

  const existingJob = await storage.getReportJob(auditId);

  if (existingJob) {
    if (existingJob.status === "pending") {
      // A pending row is a queue reservation, not an active worker. Once a
      // concurrency slot is free, this call must actually start it. Returning
      // the existing row here previously left queued reports pending forever.
      console.log(`[ReportJobManager] Pending job ${auditId} claimed from queue`);
    } else if (existingJob.status === "generating") {
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
  const normalizeMode = auditType === "GRATUIT" ? "discovery" : "analysis";
  const normalizedResponses = normalizeResponses(responses, { mode: normalizeMode });
  let qualityReviewPersisted = false;

  try {
    await storage.createOrUpdateReportJob({
      auditId,
      status: "generating" as ReportJobStatusEnum,
      currentSection: "Analyse de ton profil...",
      progress: 5,
    });

    // ⚠️ FIX: Récupérer les photos depuis audit.photos (tableau) ou responses
    const audit = await storage.getAudit(auditId);
    if (!audit) {
      throw new Error(`Audit ${auditId} not found ,  cannot generate report`);
    }
    const auditResponses = (audit as any)?.responses || {};

    // Discovery Scan has its own 12-section engine and validator. It must never
    // fall through to the premium 4-section generator during a retry, boot
    // recovery, admin regeneration, or queue handoff.
    if (auditType === "GRATUIT") {
      const discoveryModel = openAIModelForProfile("discovery");
      await storage.updateReportJobProgress(
        auditId,
        10,
        "Generation du Discovery Scan personnalise...",
      );

      const discoveryResult = await withTimeout(
        analyzeDiscoveryScan(normalizedResponses as any),
        AI_CALL_TIMEOUT_MS,
        `${discoveryModel} Discovery analysis for ${auditId}`,
      );
      await storage.updateReportJobProgress(
        auditId,
        55,
        "Redaction des 12 sections du Discovery Scan...",
      );
      const narrativeReport = await withTimeout(
        convertToNarrativeReport(discoveryResult, normalizedResponses as any),
        AI_CALL_TIMEOUT_MS,
        `${discoveryModel} Discovery narrative for ${auditId}`,
      );

      const serializedLength = JSON.stringify(narrativeReport).length;
      if (!Array.isArray((narrativeReport as any)?.sections) || (narrativeReport as any).sections.length < 10) {
        throw new Error("Discovery validation failed after generation: sections missing");
      }
      if (serializedLength < 10_000) {
        throw new Error(`Discovery validation failed after generation: ${serializedLength} chars`);
      }

      const deliveryAudit = await storage.getAudit(auditId);
      const scheduledFor = deliveryAudit?.reportScheduledFor
        ? new Date(deliveryAudit.reportScheduledFor)
        : null;
      const postGenerationDeliveryStatus = deliveryAudit?.reportSentAt
        ? "SENT"
        : scheduledFor &&
          Number.isFinite(scheduledFor.getTime()) &&
          scheduledFor.getTime() > Date.now()
        ? "SCHEDULED"
        : "READY";

      await storage.updateAudit(auditId, {
        narrativeReport,
        reportGeneratedAt: new Date(),
        reportDeliveryStatus: postGenerationDeliveryStatus,
      });
      await storage.completeReportJob(auditId);

      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(
        `[ReportJobManager] Discovery COMPLETED for ${auditId} in ${duration}s (${serializedLength} chars)`,
      );
      return;
    }

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
    const photosForReport = requiresPhotos ? photos : [];
    const needsPhotos = requiresPhotos && photosForReport.length < 3;

    if (needsPhotos) {
      console.error(`[ReportJobManager] Photos insuffisantes pour ${auditId} (${photos.length}/3, type=${auditType}). Rapport non généré.`);
      await storage.failReportJob(auditId, "NEED_PHOTOS");
      await storage.updateAudit(auditId, { reportDeliveryStatus: "NEED_PHOTOS" as any });
      activeGenerations.delete(auditId);
      return;
    } else if (requiresPhotos) {
      console.log(`[ReportJobManager] Photos OK pour ${auditId} (count=${photosForReport.length})`);
    } else {
      if (photos.length > 0) {
        console.log(`[ReportJobManager] ${auditId} (${auditType}) - photos ignorees (non requises)`);
      } else {
        console.log(`[ReportJobManager] ${auditId} (${auditType}) - photos non requises`);
      }
    }

    let photoAnalysis = null;
    if (requiresPhotos && photosForReport.length > 0) {
      console.log(`[ReportJobManager] ${photosForReport.length} photos detectees, lancement analyse vision...`);

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
          front: photosForReport[0],
          side: photosForReport[1],
          back: photosForReport[2],
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

    console.log(`[ReportJobManager] Calling ${OPENAI_REPORT_MODEL} engine for ${auditId}`);

    const generationPromise = withTimeout(
      generateAndConvertAuditWithOpenAI(normalizedResponses as ClientData, photoAnalysis, auditType as any, auditId),
      AI_CALL_TIMEOUT_MS,
      `${OPENAI_REPORT_MODEL} report generation for ${auditId}`
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
      throw new Error(result.error || `${OPENAI_REPORT_MODEL} generation failed`);
    }

    const repairedReportTxt = repairReportTextForDelivery(
      result.txt || "",
      normalizedResponses as Record<string, unknown>,
    );
    if (repairedReportTxt !== (result.txt || "")) {
      console.log(
        `[ReportJobManager] Deterministic client-facing repair applied for ${auditId}`,
      );
    }

    // ⚠️ IMPORTANT: Ne PAS marquer comme COMPLETED avant d'avoir généré le HTML
    // et sauvegardé dans la DB. Sinon le client voit "COMPLETED" mais pas de rapport.

    // Convert TXT to HTML with Premium Design (Ultrahuman-style)
    console.log(`[ReportJobManager] Converting TXT to Premium HTML for ${auditId}...`);
    const reportHtml = generatePremiumHTMLFromTxt(
      repairedReportTxt,
      auditId,
      photosForReport,
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
    const validation = validateReport(repairedReportTxt, reportHtml, tier);
    logValidation(auditId, validation);

    // Check if report meets quality standards
    if (!validation.isValid || validation.score < MIN_VALIDATION_SCORE) {
      console.error(`[ReportJobManager] ❌ VALIDATION FAILED for ${auditId}`);
      console.error(`[ReportJobManager] Score: ${validation.score}/100 (minimum: ${MIN_VALIDATION_SCORE})`);
      console.error(`[ReportJobManager] Errors: ${validation.errors.join(', ')}`);

      // Save the report anyway but mark as NEEDS_REVIEW
      await storage.updateAudit(auditId, {
        narrativeReport: {
          txt: repairedReportTxt,
          html: reportHtml,
          clientName: result.clientName,
          metadata: result.metadata,
          validationResult: validation,
          photoAnalysis: photoAnalysis, // Include photo analysis for frontend display
        },
        reportTxt: repairedReportTxt,
        reportHtml: reportHtml,
        reportGeneratedAt: new Date(),
        reportDeliveryStatus: "NEEDS_REVIEW",
      });
      qualityReviewPersisted = true;

      // Fail the job so email is NOT sent
      throw new Error(`Validation échouée (score: ${validation.score}/100). Rapport nécessite révision manuelle. Erreurs: ${validation.errors.slice(0, 3).join('; ')}`);
    }

    console.log(`[ReportJobManager] ✅ VALIDATION PASSED for ${auditId} (score: ${validation.score}/100)`);

    // ============================================
    // HARD CHECK: TXT content must exist and be substantial
    // ============================================
    const txtContent = repairedReportTxt;
    if (txtContent.length < 500) {
      throw new Error(`HARD BLOCK: TXT content too short (${txtContent.length} chars). Generation likely failed silently.`);
    }
    if (reportHtml.length < 2000) {
      throw new Error(`HARD BLOCK: HTML content too short (${reportHtml.length} chars). HTML conversion likely failed.`);
    }
    console.log(`[ReportJobManager] ✅ Content check passed: TXT=${txtContent.length} chars, HTML=${reportHtml.length} chars`);

    // CRITICAL: Do NOT store txt/html in narrativeReport JSONB
    // They go in dedicated TEXT columns (report_txt, report_html)
    // The JSONB field only stores metadata (small)
    const report = {
      clientName: result.clientName,
      metadata: result.metadata,
      validationResult: validation,
      photoAnalysis: photoAnalysis,
    };

    const deliveryAudit = await storage.getAudit(auditId);
    const scheduledFor = deliveryAudit?.reportScheduledFor
      ? new Date(deliveryAudit.reportScheduledFor)
      : null;
    const postGenerationDeliveryStatus = deliveryAudit?.reportSentAt
      ? "SENT"
      : scheduledFor &&
        Number.isFinite(scheduledFor.getTime()) &&
        scheduledFor.getTime() > Date.now()
      ? "SCHEDULED"
      : "READY";

    // Sauvegarder le rapport dans l'audit AVANT de marquer comme COMPLETED
    console.log(`[ReportJobManager] Saving report to DB: TXT=${repairedReportTxt.length} HTML=${reportHtml.length} chars`);
    try {
      await storage.updateAudit(auditId, {
        narrativeReport: report,
        reportTxt: repairedReportTxt,
        reportHtml: reportHtml,
        reportGeneratedAt: new Date(),
        reportDeliveryStatus: postGenerationDeliveryStatus,
      });
    } catch (saveErr: any) {
      console.error(`[ReportJobManager] ❌ DB SAVE FAILED for ${auditId}: ${saveErr.message}`);
      // Try saving without the large HTML in narrativeReport (keep reportTxt/reportHtml separate)
      console.log(`[ReportJobManager] Retrying with minimal narrativeReport...`);
      await storage.updateAudit(auditId, {
        narrativeReport: { clientName: result.clientName, metadata: result.metadata, validationResult: validation, photoAnalysis: photoAnalysis },
        reportTxt: repairedReportTxt,
        reportHtml: reportHtml,
        reportGeneratedAt: new Date(),
        reportDeliveryStatus: postGenerationDeliveryStatus,
      });
    }

    // Verify the save worked
    const verifyAudit = await storage.getAudit(auditId);
    const savedTxt = (verifyAudit as any)?.reportTxt || (verifyAudit as any)?.narrativeReport?.txt || '';
    if (typeof savedTxt === 'string' && savedTxt.length < 100) {
      console.error(`[ReportJobManager] ❌ SAVE VERIFICATION FAILED: reportTxt is ${savedTxt.length} chars after save!`);
      throw new Error(`DB save verification failed ,  content not persisted (${savedTxt.length} chars)`);
    }
    console.log(`[ReportJobManager] ✅ Report saved and verified: ${savedTxt.length} chars in DB`);

    // Traçabilité: conserver CHAQUE version générée (TXT + HTML) dans une table dédiée
    await storage.createReportArtifact({
      auditId,
      tier: String(auditType || "PREMIUM"),
      engine: "openai",
      model: OPENAI_REPORT_MODEL,
      txt: repairedReportTxt,
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
    if (isOpenAICreditError(error)) {
      // Provider billing outages are operational, not report-quality failures.
      // Keep the client in the automatic review queue. Monitoring deliberately
      // resets the attempt counter for this exact condition until credit returns.
      await storage.updateAudit(auditId, {
        reportDeliveryStatus: "NEEDS_REVIEW",
      });
      console.warn(`[ReportJobManager] OpenAI credit unavailable for ${auditId} , automatic retry retained`);
    } else if (qualityReviewPersisted) {
      console.log(`[ReportJobManager] Preserving NEEDS_REVIEW status for ${auditId} after quality validation failure`);
    } else {
      await storage.updateAudit(auditId, {
        reportDeliveryStatus: "FAILED",
      });
    }
  } finally {
    activeGenerations.delete(auditId);

    // ============================================
    // QUEUE PROCESSING: Pick up next pending job
    // ============================================
    try {
      const pendingJobs = await storage.getActiveReportJobs();
      const nextPending = pendingJobs.find(j => j.status === "pending" && !activeGenerations.has(j.auditId));
      if (nextPending && activeGenerations.size < MAX_CONCURRENT_GENERATIONS) {
        console.log(`[ReportJobManager] 🔄 Processing next queued job: ${nextPending.auditId}`);
        const audit = await storage.getAudit(nextPending.auditId);
        if (audit) {
          const responses = (audit as any)?.responses || {};
          const scores = (audit as any)?.scores || {};
          startReportGeneration(nextPending.auditId, responses, scores, audit.type);
        }
      }
    } catch (queueErr) {
      console.error(`[ReportJobManager] Queue processing error:`, queueErr);
    }
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
