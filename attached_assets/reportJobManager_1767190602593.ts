import { generateAndConvertAudit } from "./geminiPremiumEngine";
import { analyzeBodyPhotosWithAI } from "./photoAnalysisAI";
import { storage } from "./storage";
import type { ClientData } from "./types";
import type { PhotoAnalysis } from "./types";

export type ProgressCallback = (progress: number, section: string) => Promise<void>;
import type { ReportJob, ReportJobStatusEnum } from "@shared/schema";

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
 * 
 * Limitations (mono-instance design):
 * - No worker heartbeat system for multi-instance deployments
 * - No DB-level locking for concurrent worker coordination
 * - For HA/multi-instance, would need distributed job queue (Redis, SQS, etc.)
 */

const STUCK_JOB_THRESHOLD_MS = 10 * 60 * 1000;
const AI_CALL_TIMEOUT_MS = 8 * 60 * 1000;
const MAX_RETRY_ATTEMPTS = 3;

const activeGenerations = new Set<string>();

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

  try {
    await storage.createOrUpdateReportJob({
      auditId,
      status: "generating" as ReportJobStatusEnum,
      currentSection: "Analyse de ton profil...",
      progress: 5,
    });

    console.log(`[ReportJobManager] Calling Gemini engine for ${auditId}`);
    
    // Analyse des photos si c'est un audit Premium/Elite
    let photoAnalysis: PhotoAnalysis | null = null;
    if (auditType === "PREMIUM" || auditType === "ELITE") {
      const photos = {
        front: responses["photo-front"] as string,
        back: responses["photo-back"] as string,
        side: responses["photo-side"] as string
      };
      
      if (photos.front || photos.back || photos.side) {
        console.log(`[ReportJobManager] Photos detectees pour ${auditId}, lancement de l'analyse vision...`);
        try {
          photoAnalysis = await analyzeBodyPhotosWithAI(photos);
          console.log(`[ReportJobManager] Analyse vision terminee pour ${auditId}`);
        } catch (visionError) {
          console.error(`[ReportJobManager] Erreur lors de l'analyse vision:`, visionError);
          // On continue quand meme l'audit sans l'analyse photo
        }
      }
    }
    
    const result = await withTimeout(
      generateAndConvertAudit(responses as ClientData, photoAnalysis, auditType as any, auditId),
      AI_CALL_TIMEOUT_MS,
      `Gemini report generation for ${auditId}`
    );

    if (!result.success) {
      throw new Error(result.error || "Gemini generation failed");
    }

    const report = {
      txt: result.txt,
      clientName: result.clientName,
      metadata: result.metadata
    };

    await storage.completeReportJob(auditId);
    
    await storage.updateAudit(auditId, {
      narrativeReport: report,
      reportDeliveryStatus: "READY",
    });

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[ReportJobManager] Generation COMPLETED for ${auditId} in ${duration}s`);

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
