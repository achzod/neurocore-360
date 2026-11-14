/**
 * FormCheck V2 : traitement en arrière-plan.
 *
 * File en base (formcheck_analyses), prise de job par FOR UPDATE SKIP LOCKED,
 * relance avec délai croissant, puis alerte admin. Le crédit n'est consommé
 * qu'après l'envoi effectif du rapport.
 */
import { decideFormcheckOutcome, detectedExerciseLabel, normalizeFormcheckAnalysis, runFormcheckVisionAnalysis, type FormcheckAnalysis, type VisionFrame, type VisionResult } from "./analysis";
import { annotateFrame } from "./annotate";
import { FORMCHECK_MAX_ATTEMPTS, retryDelayMs } from "./config";
import { buildAdminAlert, buildIssueEmail, buildReportEmail, buildReshootEmail } from "./emails";
import { buildFormcheckReportHtml, renderFormcheckPdf } from "./report";
import * as store from "./store";
import type { ClaimedAnalysis } from "./store";
import { formcheckLinks } from "./links";

export interface FormcheckWorkerDeps {
  loadFrames: (id: string) => Promise<Array<{ index: number; timestampS: number; jpeg: Buffer; annotated: Buffer | null }>>;
  vision: (input: { analysisId: string; email: string; durationS: number; frames: VisionFrame[] }) => Promise<VisionResult>;
  saveResult: typeof store.saveAnalysisResult;
  annotate: (jpeg: Buffer, annotations: FormcheckAnalysis["errors"][number]["annotations"], badge: number) => Promise<Buffer>;
  saveAnnotated: typeof store.saveAnnotatedFrame;
  renderPdf: (html: string) => Promise<Buffer>;
  savePdf: typeof store.savePdf;
  sendEmail: (input: { to: string; subject: string; html: string; text: string; emailType: string; metadata?: Record<string, any>; attachments?: Record<string, Buffer> }) => Promise<boolean>;
  consume: typeof store.markDeliveredAndConsume;
  reject: typeof store.markRejectedAndRelease;
  needsReview: typeof store.markNeedsReviewAndRelease;
  retry: typeof store.scheduleRetry;
  balance: (email: string) => Promise<{ available: number }>;
  links: (email: string, analysisId: string) => { uploadUrl: string; pdfUrl: string };
  now: () => Date;
}

export type JobOutcome = "delivered" | "rejected" | "retry" | "needs_review";

async function escalate(job: ClaimedAnalysis, deps: FormcheckWorkerDeps, reason: string): Promise<JobOutcome> {
  const settled = await deps.needsReview(job.id, reason);
  if (settled) {
    const links = deps.links(job.email, job.id);
    const admin = buildAdminAlert({ analysisId: job.id, email: job.email, exerciseLabel: job.exercise_label, attempts: job.attempts, reason });
    await deps.sendEmail({ to: admin.to, subject: admin.subject, html: admin.html, text: admin.text, emailType: "sendFormcheckIssueEmail", metadata: { analysisId: job.id, admin: true } });
    const issue = buildIssueEmail({ exerciseLabel: job.exercise_label, uploadUrl: links.uploadUrl });
    await deps.sendEmail({ to: job.email, ...issue, emailType: "sendFormcheckIssueEmail", metadata: { analysisId: job.id } });
  }
  return "needs_review";
}

async function retryOrEscalate(job: ClaimedAnalysis, deps: FormcheckWorkerDeps, reason: string): Promise<JobOutcome> {
  if (job.attempts >= FORMCHECK_MAX_ATTEMPTS) return escalate(job, deps, reason);
  await deps.retry(job.id, retryDelayMs(job.attempts), reason);
  return "retry";
}

/** Nom de fichier sûr à partir du nom français de l'exercice (« Soulevé de terre » -> « souleve_de_terre »). */
export function pdfSlug(label: string): string {
  return label.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 40) || "analyse";
}

export async function processFormcheckJob(job: ClaimedAnalysis, deps: FormcheckWorkerDeps): Promise<JobOutcome> {
  const links = deps.links(job.email, job.id);
  const frames = await deps.loadFrames(job.id);
  if (frames.length === 0) return escalate(job, deps, "NO_FRAMES");

  // 1. Analyse vision (sautée si un résultat validé existe déjà : relance d'envoi seulement).
  let analysis: FormcheckAnalysis | null = job.result ? normalizeFormcheckAnalysis(job.result, frames.length) : null;
  if (analysis && decideFormcheckOutcome(analysis).kind !== "deliver") analysis = null;
  if (!analysis) {
    let vision: VisionResult;
    try {
      vision = await deps.vision({
        analysisId: job.id,
        email: job.email,
        durationS: job.duration_s,
        frames: frames.map((f) => ({ index: f.index, timestampS: f.timestampS, jpeg: f.jpeg })),
      });
    } catch (error: any) {
      return retryOrEscalate(job, deps, `VISION_ERROR:${String(error?.message || error).slice(0, 300)}`);
    }
    const decision = decideFormcheckOutcome(vision.analysis);
    if (decision.kind === "reject") {
      await deps.saveResult(job.id, { result: vision.analysis, score: vision.analysis.score, model: vision.model, responseId: vision.responseId, costUsd: vision.costUsd });
      const released = await deps.reject(job.id, decision.reason);
      if (released) {
        const mail = buildReshootEmail({ exerciseLabel: vision.analysis.exercise_detected.name_fr || null, reason: decision.reason, uploadUrl: links.uploadUrl });
        await deps.sendEmail({ to: job.email, ...mail, emailType: "sendFormcheckReshootEmail", metadata: { analysisId: job.id } });
      }
      return "rejected";
    }
    if (decision.kind === "retry") return retryOrEscalate(job, deps, decision.reason);
    await deps.saveResult(job.id, { result: vision.analysis, score: vision.analysis.score, model: vision.model, responseId: vision.responseId, costUsd: vision.costUsd });
    analysis = vision.analysis;
  }

  // 2. Annotation des frames fautives, PDF, envoi. L'exercice affiché est celui détecté par le modèle.
  const exerciseLabel = detectedExerciseLabel(analysis);
  try {
    // Une image annotée par erreur (même si deux erreurs tombent sur la même frame),
    // avec uniquement les formes de cette erreur et son numéro.
    const annotatedByIndex = new Map<number, Buffer>();
    const errorImages: Array<Buffer | null> = [];
    for (let i = 0; i < analysis.errors.length; i++) {
      const error = analysis.errors[i];
      const frame = frames.find((f) => f.index === error.frame_index);
      if (!frame) { errorImages.push(null); continue; }
      if (error.annotations.length === 0) { errorImages.push(frame.jpeg); continue; }
      const annotated = await deps.annotate(frame.jpeg, error.annotations, i + 1);
      errorImages.push(annotated);
      if (!annotatedByIndex.has(frame.index)) {
        annotatedByIndex.set(frame.index, annotated);
        await deps.saveAnnotated(job.id, frame.index, annotated);
      }
    }
    const html = buildFormcheckReportHtml({
      analysisId: job.id,
      email: job.email,
      exerciseLabel,
      createdAt: deps.now(),
      analysis,
      frames: frames.map((f) => ({ ...f, annotated: annotatedByIndex.get(f.index) || f.annotated })),
      errorImages,
    });
    const pdf = job.pdf && job.pdf.length > 0 ? job.pdf : await deps.renderPdf(html);
    if (!job.pdf) await deps.savePdf(job.id, pdf);

    const balance = await deps.balance(job.email);
    // Le crédit en cours sera consommé juste après : on l'affiche déjà déduit.
    const mail = buildReportEmail({
      exerciseLabel,
      score: analysis.score,
      summary: analysis.summary,
      pdfUrl: links.pdfUrl,
      uploadUrl: links.uploadUrl,
      available: balance.available,
    });
    const sent = await deps.sendEmail({
      to: job.email,
      ...mail,
      emailType: "sendFormcheckReportEmail",
      metadata: { analysisId: job.id, score: analysis.score },
      attachments: { [`FormCheck_${pdfSlug(exerciseLabel)}_${job.id.slice(0, 8)}.pdf`]: pdf },
    });
    if (!sent) return retryOrEscalate(job, deps, "EMAIL_SEND_FAILED");
    await deps.consume(job.id);
    return "delivered";
  } catch (error: any) {
    return retryOrEscalate(job, deps, `RENDER_ERROR:${String(error?.message || error).slice(0, 300)}`);
  }
}

// ---------------------------------------------------------------------------
// Boucle de production
// ---------------------------------------------------------------------------

export function createProductionDeps(baseUrl: () => string): FormcheckWorkerDeps {
  return {
    loadFrames: store.loadFrames,
    vision: runFormcheckVisionAnalysis,
    saveResult: store.saveAnalysisResult,
    annotate: annotateFrame,
    saveAnnotated: store.saveAnnotatedFrame,
    renderPdf: renderFormcheckPdf,
    savePdf: store.savePdf,
    sendEmail: async (input) => {
      const { sendFormcheckTransactionalEmail } = await import("../emailService");
      return sendFormcheckTransactionalEmail(input);
    },
    consume: store.markDeliveredAndConsume,
    reject: store.markRejectedAndRelease,
    needsReview: store.markNeedsReviewAndRelease,
    retry: store.scheduleRetry,
    balance: store.getFormcheckBalance,
    links: (email, analysisId) => formcheckLinks(baseUrl(), email, analysisId),
    now: () => new Date(),
  };
}

let running = false;

/** Traite les jobs dus, un par un, jusqu'à vider la file ou atteindre maxJobs. */
export async function runFormcheckQueueOnce(deps: FormcheckWorkerDeps, maxJobs = 5): Promise<number> {
  if (running) return 0;
  running = true;
  let processed = 0;
  try {
    // Jobs ayant épuisé leurs tentatives (crash pendant la dernière) : alerte + crédit libéré.
    for (const stuck of await store.listExhaustedAnalyses()) {
      await escalate({ id: stuck.id, email: stuck.email, exercise_label: stuck.exercise_label, attempts: FORMCHECK_MAX_ATTEMPTS, duration_s: 0, result: null, model: null, response_id: null, cost_usd: null, pdf: null }, deps, stuck.last_error || "EXHAUSTED");
    }
    while (processed < maxJobs) {
      const job = await store.claimNextAnalysis();
      if (!job) break;
      processed++;
      const outcome = await processFormcheckJob(job, deps).catch(async (error: any) => {
        console.error(`[FormCheck] job ${job.id} crashed:`, error);
        await store.scheduleRetry(job.id, retryDelayMs(job.attempts), `CRASH:${String(error?.message || error).slice(0, 300)}`).catch(() => {});
        return "retry" as const;
      });
      console.log(`[FormCheck] job ${job.id} -> ${outcome} (tentative ${job.attempts})`);
    }
  } finally {
    running = false;
  }
  return processed;
}
