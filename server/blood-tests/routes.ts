import type { Express, Request, Response, NextFunction } from "express";
import fs from "fs";
import path from "path";
import multer from "multer";
import pdf from "pdf-parse/lib/pdf-parse.js";
import puppeteer from "puppeteer";
import {
  analyzeBloodwork,
  extractPatientInfoFromPdfText,
  extractMarkersFromPdfText,
  generateAIBloodAnalysis,
  getBloodworkKnowledgeContext,
  BIOMARKER_RANGES,
  buildFallbackAnalysis,
  buildLifestyleCorrelations,
  finalizeGeneratedBloodReport,
} from "../blood-analysis";
import {
  withAIGenerationTimeout,
  isAIGenerationTimeoutError,
} from "../blood-analysis/ai-timeout";
import { generateComprehensiveBloodReport } from "../blood-analysis/recommendations-engine";
import { generateComprehensiveRiskProfile } from "../blood-analysis/risk-scores";
import { sendBloodClientDeliveryEmail } from "../blood-analysis/routes";
import { storage } from "../storage";
import { getAuthPayload } from "../auth";
import { OPENAI_REPORT_MODEL } from "../openaiResponses";
import { auditClientFacingText } from "../clientFacingQuality";
import { extractKnownAgeYears, repairReportTextForDelivery } from "../reportTextRepair";

type MarkerStatus = "optimal" | "normal" | "suboptimal" | "critical";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

const CATEGORY_BY_MARKER: Record<string, string> = {
  // Hormonal
  testosterone_total: "hormonal",
  testosterone_libre: "hormonal",
  shbg: "hormonal",
  estradiol: "hormonal",
  lh: "hormonal",
  fsh: "hormonal",
  prolactine: "hormonal",
  dhea_s: "hormonal",
  cortisol: "hormonal",
  igf1: "hormonal",

  // Thyroid
  tsh: "thyroid",
  t4_libre: "thyroid",
  t3_libre: "thyroid",
  t3_reverse: "thyroid",
  anti_tpo: "thyroid",

  // Metabolic
  glycemie_jeun: "metabolic",
  hba1c: "metabolic",
  insuline_jeun: "metabolic",
  homa_ir: "metabolic",
  triglycerides: "metabolic",
  hdl: "metabolic",
  ldl: "metabolic",
  apob: "metabolic",
  lpa: "metabolic",

  // Inflammation
  crp_us: "inflammatory",
  homocysteine: "inflammatory",
  ferritine: "inflammatory",
  fer_serique: "inflammatory",
  transferrine_sat: "inflammatory",

  // Vitamins
  vitamine_d: "vitamins",
  b12: "vitamins",
  folate: "vitamins",
  magnesium_rbc: "vitamins",
  zinc: "vitamins",

  // Liver/Kidney
  alt: "liver_kidney",
  ast: "liver_kidney",
  ggt: "liver_kidney",
  creatinine: "liver_kidney",
  egfr: "liver_kidney",
};

const SYSTEM_BY_MARKER: Record<string, string> = {
  hdl: "cardio",
  ldl: "cardio",
  triglycerides: "cardio",
  apob: "cardio",
  lpa: "cardio",
  homocysteine: "cardio",
  testosterone_total: "hormonal",
  testosterone_libre: "hormonal",
  shbg: "hormonal",
  estradiol: "hormonal",
  lh: "hormonal",
  fsh: "hormonal",
  prolactine: "hormonal",
  dhea_s: "hormonal",
  cortisol: "hormonal",
  igf1: "hormonal",
  glycemie_jeun: "metabolic",
  hba1c: "metabolic",
  insuline_jeun: "metabolic",
  homa_ir: "metabolic",
  crp_us: "inflammatory",
  ferritine: "inflammatory",
  fer_serique: "inflammatory",
  transferrine_sat: "inflammatory",
  alt: "hepatic",
  ast: "hepatic",
  ggt: "hepatic",
  creatinine: "renal",
  egfr: "renal",
  vitamine_d: "hemato",
  b12: "hemato",
  folate: "hemato",
  magnesium_rbc: "hemato",
  zinc: "hemato",
  tsh: "thyroid",
  t4_libre: "thyroid",
  t3_libre: "thyroid",
  t3_reverse: "thyroid",
  anti_tpo: "thyroid",
};

// Recalibrated 2026-05-07 (Younes Y. case): flat-average gave a "bon"
// to a patient with collapsed HPT axis. New system penalises critical
// markers harder and weights categories by health-impact priority.
const SCORE_BY_STATUS: Record<MarkerStatus, number> = {
  optimal: 100,
  normal: 75,
  suboptimal: 40,
  critical: 0,
};

const CATEGORY_WEIGHTS: Record<string, number> = {
  hormonal: 25,
  metabolic: 20,
  thyroid: 15,
  inflammation: 15,
  liver_kidney: 15,
  vitamins: 10,
  hemato: 10,
};
const DEFAULT_CATEGORY_WEIGHT = 8;

const getGlobalLevel = (score: number | null | undefined): string | null => {
  if (score === null || score === undefined) return null;
  if (score >= 85) return "excellent";
  if (score >= 70) return "bon";
  if (score >= 50) return "moyen";
  if (score >= 30) return "faible";
  return "critique";
};

const computeCategoryScores = (markers: Array<{ category?: string; status?: MarkerStatus }>) => {
  const buckets: Record<string, number[]> = {};
  for (const marker of markers) {
    const category = marker.category || "general";
    const status = marker.status || "normal";
    if (!buckets[category]) buckets[category] = [];
    buckets[category].push(SCORE_BY_STATUS[status]);
  }
  return Object.fromEntries(
    Object.entries(buckets).map(([category, scores]) => {
      const avg = scores.reduce((sum, value) => sum + value, 0) / scores.length;
      return [category, Math.round(avg)];
    })
  );
};

const computeGlobalScore = (
  scoresMap: Record<string, number>,
  markers?: Array<{ status?: MarkerStatus }>
) => {
  const entries = Object.entries(scoresMap);
  if (entries.length === 0) return 0;

  // Weighted average across categories : hormonal counts more than vitamins.
  let weightedSum = 0;
  let totalWeight = 0;
  for (const [cat, score] of entries) {
    const weight = CATEGORY_WEIGHTS[cat] ?? DEFAULT_CATEGORY_WEIGHT;
    weightedSum += score * weight;
    totalWeight += weight;
  }
  let baseScore = totalWeight > 0 ? weightedSum / totalWeight : 0;

  // Critical-marker penalty (caller passes raw markers when available).
  if (markers && markers.length > 0) {
    const criticalCount = markers.filter((m) => m.status === "critical").length;
    const criticalPenalty = Math.min(40, criticalCount * 8);
    baseScore = Math.max(0, baseScore - criticalPenalty);
  }

  return Math.round(baseScore);
};

const getAgeFromDob = (dob?: string): string | undefined => {
  const age = extractKnownAgeYears({ dob });
  return age === null ? undefined : String(age);
};

const computeSystemScores = (markers: Array<{ code?: string; status?: MarkerStatus }>) => {
  const buckets: Record<string, number[]> = {};
  for (const marker of markers) {
    const system = SYSTEM_BY_MARKER[marker.code || ""] || "metabolic";
    const status = marker.status || "normal";
    if (!buckets[system]) buckets[system] = [];
    buckets[system].push(SCORE_BY_STATUS[status]);
  }
  return Object.fromEntries(
    Object.entries(buckets).map(([system, scores]) => {
      const avg = scores.reduce((sum, value) => sum + value, 0) / scores.length;
      return [system, Math.round(avg)];
    })
  );
};

type AnalysisMarker = {
  markerId: string;
  name: string;
  value: number;
  unit: string;
  status: MarkerStatus;
  interpretation?: string;
};

type ResponseMarker = {
  name: string;
  code: string;
  category: string;
  value: number;
  unit: string;
  refMin: number | null;
  refMax: number | null;
  optimalMin: number | null;
  optimalMax: number | null;
  status: MarkerStatus;
  interpretation?: string;
};

const toFiniteNumberOrNull = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const toNullableNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") return null;
  return toFiniteNumberOrNull(value);
};

const normalizeStoredStatus = (status: unknown): MarkerStatus => {
  const lower = String(status || "").toLowerCase();
  if (lower === "optimal") return "optimal";
  if (lower === "normal") return "normal";
  if (lower === "suboptimal" || lower.includes("sous")) return "suboptimal";
  if (lower === "critical" || lower.includes("crit")) return "critical";
  return "normal";
};

const normalizeCategoryId = (category: unknown, markerCode: string): string => {
  const raw = String(category || "").trim().toLowerCase();
  if (raw === "inflammatory") return "inflammation";
  if (raw) return raw;
  const mapped = CATEGORY_BY_MARKER[markerCode] || "general";
  return mapped === "inflammatory" ? "inflammation" : mapped;
};

const normalizeMarkersForResponse = (
  rawMarkers: unknown[],
  analysisMarkers: AnalysisMarker[]
): ResponseMarker[] => {
  const analysisByCode = new Map(analysisMarkers.map((marker) => [marker.markerId, marker]));
  const normalizedByCode = new Map<string, ResponseMarker>();

  for (const raw of rawMarkers) {
    if (!raw || typeof raw !== "object") continue;
    const marker = raw as Record<string, unknown>;
    const code = String(marker.code || marker.markerId || "").trim();
    if (!code) continue;

    const range = BIOMARKER_RANGES[code];
    const analysisMarker = analysisByCode.get(code);
    const value =
      toFiniteNumberOrNull(marker.value) ??
      (analysisMarker && Number.isFinite(analysisMarker.value) ? analysisMarker.value : null);
    if (value === null) continue;

    const normalized: ResponseMarker = {
      name:
        String(marker.name || "").trim() ||
        analysisMarker?.name ||
        range?.name ||
        code,
      code,
      category: normalizeCategoryId(marker.category, code),
      value,
      unit:
        String(marker.unit || "").trim() ||
        analysisMarker?.unit ||
        range?.unit ||
        "",
      refMin: toNullableNumber(marker.refMin) ?? range?.normalMin ?? null,
      refMax: toNullableNumber(marker.refMax) ?? range?.normalMax ?? null,
      optimalMin: toNullableNumber(marker.optimalMin) ?? range?.optimalMin ?? null,
      optimalMax: toNullableNumber(marker.optimalMax) ?? range?.optimalMax ?? null,
      status: analysisMarker?.status || normalizeStoredStatus(marker.status),
      interpretation:
        String(marker.interpretation || "").trim() ||
        analysisMarker?.interpretation ||
        "",
    };

    normalizedByCode.set(code, normalized);
  }

  if (!normalizedByCode.size && analysisMarkers.length) {
    for (const marker of analysisMarkers) {
      const range = BIOMARKER_RANGES[marker.markerId];
      normalizedByCode.set(marker.markerId, {
        name: marker.name || range?.name || marker.markerId,
        code: marker.markerId,
        category: normalizeCategoryId(undefined, marker.markerId),
        value: marker.value,
        unit: marker.unit || range?.unit || "",
        refMin: range?.normalMin ?? null,
        refMax: range?.normalMax ?? null,
        optimalMin: range?.optimalMin ?? null,
        optimalMax: range?.optimalMax ?? null,
        status: marker.status,
        interpretation: marker.interpretation || "",
      });
    }
  }

  return Array.from(normalizedByCode.values());
};

const computeTemporalRisk = (markers: Array<{ status?: MarkerStatus }>) => {
  const critical = markers.filter((m) => m.status === "critical").length;
  const warning = markers.filter((m) => m.status === "suboptimal").length;
  const score = Math.min(100, critical * 20 + warning * 10);
  const level = score >= 70 ? "eleve" : score >= 40 ? "modere" : "faible";
  return { score, level, critical, warning };
};

const buildProtocolPhases = (markers: Array<{ name: string; status?: MarkerStatus }>) => {
  const phase1 = markers
    .filter((m) => m.status === "critical")
    .map((m) => `Priorite immediate: corriger ${m.name}.`);
  const phase2 = markers
    .filter((m) => m.status === "suboptimal")
    .map((m) => `Optimiser ${m.name} avec ajustements nutritionnels + lifestyle.`);
  const phase3 = [
    "Stabiliser les routines sommeil et entrainement.",
    "Planifier un controle sanguin a 90 jours.",
    "Consolider l'hygiene metabolique globale.",
  ];

  return [
    { id: "phase-1", title: "Jours 1-30", items: phase1.length ? phase1 : ["Aucune alerte critique detectee."] },
    { id: "phase-2", title: "Jours 31-90", items: phase2.length ? phase2 : ["Conserver les marqueurs dans le range optimal."] },
    { id: "phase-3", title: "Jours 91-180", items: phase3 },
  ];
};

const FALLBACK_REPORT_FOOTER_PATTERN = /\*Rapport fallback deterministic/i;

const isFallbackAnalysisText = (analysis: string): boolean => {
  const normalized = String(analysis || "").trim();
  if (!normalized) return true;
  return FALLBACK_REPORT_FOOTER_PATTERN.test(normalized);
};

const deriveAiMeta = (analysis: string, fallbackReason?: string) => {
  const isFallback = isFallbackAnalysisText(analysis);
  const generatedAt = new Date().toISOString();
  if (isFallback) {
    return {
      aiStatus: "fallback" as const,
      aiModel: "fallback",
      aiGeneratedAt: generatedAt,
      aiFallbackAt: generatedAt,
      aiFallbackReason: fallbackReason || "fallback_generated",
    };
  }
  return {
    aiStatus: "generated" as const,
    aiModel: OPENAI_REPORT_MODEL,
    aiGeneratedAt: generatedAt,
    aiFallbackAt: null,
    aiFallbackReason: null,
  };
};

const deriveAiProcessingMeta = (reason?: string) => ({
  aiStatus: "processing" as const,
  aiModel: OPENAI_REPORT_MODEL,
  aiGeneratedAt: null,
  aiFallbackAt: null,
  aiFallbackReason: reason || "generation_pending",
});

const generateAIBloodAnalysisWithFallbackRetry = async (
  analysisResult: Awaited<ReturnType<typeof analyzeBloodwork>>,
  profile: {
    gender: "homme" | "femme";
    age?: string;
    objectives?: string;
    medications?: string;
    prenom?: string;
    nom?: string;
    poids?: number;
    taille?: number;
    sleepHours?: number;
    trainingHours?: number;
    calorieDeficit?: number;
    alcoholWeekly?: number;
    stressLevel?: number;
    fastingHours?: number;
    drawTime?: string;
    lastTraining?: string;
    alcoholLast72h?: string;
    nutritionPhase?: string;
    supplementsUsed?: string[];
    infectionRecent?: string;
  },
  knowledgeContext?: string,
): Promise<string> => {
  try {
    // generateAIBloodAnalysis already retries and cancels each OpenAI section call.
    // Wrapping the entire multi-section pipeline in another timeout/retry layer can
    // orphan the first run and start a second full report while it is still billing.
    const report = await generateAIBloodAnalysis(analysisResult, profile, knowledgeContext);
    if (report && !isFallbackAnalysisText(report)) {
      return report;
    }
    console.warn("[BloodTests] Async AI returned a fallback-shaped report.");
  } catch (error) {
    console.error("[BloodTests] Async AI failed:", error);
  }
  return "";
};

// A report may be picked up by the five-minute recovery cron while an admin
// regeneration is still waiting on GPT. Keep one generation per report in the
// active instance so the same client cannot be billed twice for concurrent work.
const activeBloodReportGenerationIds = new Set<string>();
const activeBloodReportGenerationKeys = new Set<string>();

type BloodTestOperationalRecord = {
  id: string;
  userId: string;
  status?: string | null;
  createdAt: Date | string;
  completedAt?: Date | string | null;
  markers?: unknown;
  analysis?: unknown;
  patientProfile?: unknown;
};

const getStoredBloodNarrative = (analysisValue: unknown): string => {
  if (!analysisValue || typeof analysisValue !== "object" || Array.isArray(analysisValue)) return "";
  const analysis = analysisValue as Record<string, unknown>;
  const candidates = [analysis.aiAnalysis, analysis.aiReport]
    .filter((value): value is string => typeof value === "string" && Boolean(value.trim()));
  return candidates.sort((a, b) => {
    const aRank = isFallbackAnalysisText(a) ? 0 : 1;
    const bRank = isFallbackAnalysisText(b) ? 0 : 1;
    return bRank - aRank || b.length - a.length;
  })[0] || "";
};

const getBloodMarkerFingerprint = (markersValue: unknown): string => {
  if (!Array.isArray(markersValue) || markersValue.length === 0) return "";
  return markersValue
    .map((entry) => {
      const marker = entry && typeof entry === "object" ? entry as Record<string, unknown> : {};
      const id = String(marker.markerId || marker.code || marker.name || "").trim().toLowerCase();
      const value = Number(marker.value);
      const unit = String(marker.unit || "").trim().toLowerCase();
      return id && Number.isFinite(value) ? `${id}:${value}:${unit}` : "";
    })
    .filter(Boolean)
    .sort()
    .join("|");
};

const getBloodMarkerCodeSignature = (markersValue: unknown): string => {
  if (!Array.isArray(markersValue) || markersValue.length === 0) return "";
  return markersValue
    .map((entry) => {
      const marker = entry && typeof entry === "object" ? entry as Record<string, unknown> : {};
      return String(marker.markerId || marker.code || marker.name || "").trim().toLowerCase();
    })
    .filter(Boolean)
    .sort()
    .join("|");
};

const haveEquivalentBloodMarkerPanels = (left: unknown, right: unknown): boolean => {
  const leftCodes = new Set(getBloodMarkerCodeSignature(left).split("|").filter(Boolean));
  const rightCodes = new Set(getBloodMarkerCodeSignature(right).split("|").filter(Boolean));
  if (leftCodes.size < 10 || rightCodes.size < 10) return false;
  const intersection = Array.from(leftCodes).filter((code) => rightCodes.has(code)).length;
  return intersection / Math.max(leftCodes.size, rightCodes.size) >= 0.9;
};

const getBloodReportGenerationKey = (record: BloodTestOperationalRecord): string => {
  const profile = record.patientProfile && typeof record.patientProfile === "object"
    ? record.patientProfile as Record<string, unknown>
    : {};
  const owner = String(profile.email || record.userId || "").trim().toLowerCase();
  const markerCodes = getBloodMarkerCodeSignature(record.markers);
  return owner && markerCodes ? `${owner}|${markerCodes}` : "";
};

const getBloodReportQualityRank = (record: BloodTestOperationalRecord): number => {
  const narrative = getStoredBloodNarrative(record.analysis);
  if (narrative && !isFallbackAnalysisText(narrative)) return 4;
  if (narrative) return 3;
  if (record.status === "processing") return 2;
  return 1;
};

const collapseRecentBloodDuplicates = <T extends BloodTestOperationalRecord>(records: T[]): T[] => {
  const dayMs = 24 * 60 * 60 * 1000;
  const ordered = [...records].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  const kept: T[] = [];
  for (const candidate of ordered) {
    const fingerprint = getBloodMarkerFingerprint(candidate.markers);
    if (!fingerprint) {
      kept.push(candidate);
      continue;
    }
    const duplicateIndex = kept.findIndex((existing) =>
      existing.userId === candidate.userId &&
      (
        getBloodMarkerFingerprint(existing.markers) === fingerprint ||
        haveEquivalentBloodMarkerPanels(existing.markers, candidate.markers)
      ) &&
      Math.abs(new Date(existing.createdAt).getTime() - new Date(candidate.createdAt).getTime()) <= dayMs
    );
    if (duplicateIndex === -1) {
      kept.push(candidate);
      continue;
    }
    const existing = kept[duplicateIndex];
    if (getBloodReportQualityRank(candidate) > getBloodReportQualityRank(existing)) {
      kept[duplicateIndex] = candidate;
    }
  }
  return kept.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};

const findRecentBloodDuplicate = <T extends BloodTestOperationalRecord>(
  records: T[],
  markers: unknown,
): T | undefined => {
  const fingerprint = getBloodMarkerFingerprint(markers);
  if (!fingerprint) return undefined;
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  return records
    .filter((record) =>
      new Date(record.createdAt).getTime() >= cutoff &&
      ["processing", "completed"].includes(String(record.status || "")) &&
      getBloodMarkerFingerprint(record.markers) === fingerprint
    )
    .sort((a, b) => getBloodReportQualityRank(b) - getBloodReportQualityRank(a))[0];
};

const isAdminRequest = (req: Request): boolean => {
  const adminKey = req.headers["x-admin-key"] || req.query.key;
  const validKey = process.env.ADMIN_SECRET || process.env.ADMIN_KEY;
  return Boolean(validKey && adminKey === validKey);
};

const isInternalQaEmail = (value: unknown): boolean => {
  const email = String(value || "").trim().toLowerCase();
  return (
    email.includes("test") ||
    email.includes("debug") ||
    email.startsWith("qa-") ||
    email.includes("@achzodcoaching.com") ||
    email === "achkou@gmail.com"
  );
};

const isInternalQaBloodRecord = (record: BloodTestOperationalRecord): boolean => {
  const profile = record.patientProfile && typeof record.patientProfile === "object"
    ? record.patientProfile as Record<string, unknown>
    : {};
  return isInternalQaEmail(profile.email);
};

const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  const payload = getAuthPayload(req);
  if (!payload) {
    if (isAdminRequest(req)) {
      (req as any).auth = { userId: "admin", email: "admin@local" };
      next();
      return;
    }
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  (req as any).auth = payload;
  next();
};

const requireAdmin = (req: Request, res: Response): boolean => {
  const adminKey = req.headers["x-admin-key"] || req.query.key || (req.body as any)?.adminKey;
  const validKey = process.env.ADMIN_SECRET || process.env.ADMIN_KEY;
  if (!validKey || adminKey !== validKey) {
    res.status(401).json({ error: "Unauthorized - admin key required" });
    return false;
  }
  return true;
};

const parseNumber = (value: unknown): number | undefined => {
  if (value === null || value === undefined || value === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const parseStringArray = (value: unknown): string[] | undefined => {
  if (value === null || value === undefined || value === "") return undefined;
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    if (trimmed.startsWith("[")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed.map((item) => String(item).trim()).filter(Boolean);
        }
      } catch {
        // fall through to CSV parsing
      }
    }
    return trimmed
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return undefined;
};

export function registerBloodTestsRoutes(app: Express): void {
  // Admin: upload and process a PDF for any user (re-extraction with new logic)
  app.post("/api/admin/blood-tests/upload-for-user", upload.single("file"), async (req, res) => {
    if (!requireAdmin(req, res)) return;
    try {
      const { email } = req.body;
      if (!email || !req.file) { res.status(400).json({ error: "email and file required" }); return; }

      let user = await storage.getUserByEmail(email);
      if (!user) { res.status(404).json({ error: "User not found" }); return; }

      const parsed = await pdf(req.file.buffer);
      const pdfText = parsed.text || "";
      if (!pdfText.trim()) { res.status(400).json({ error: "PDF vide" }); return; }

      const fileName = req.file.originalname;
      const pdfProfile = extractPatientInfoFromPdfText(pdfText);
      const extractedMarkers = await extractMarkersFromPdfText(pdfText, fileName);
      if (!extractedMarkers.length) {
        res.status(400).json({ error: "Aucun marqueur detecte" });
        return;
      }
      const existingTests = await storage.getBloodTestsByUserId(user.id);
      const duplicate = findRecentBloodDuplicate(existingTests, extractedMarkers);
      const forceUpload = req.body.force === true || String(req.body.force || "").toLowerCase() === "true";
      if (duplicate && !forceUpload) {
        res.status(409).json({
          error: "Ce bilan a deja ete importe dans les dernieres 24 heures.",
          bloodTestId: duplicate.id,
          status: duplicate.status,
        });
        return;
      }

      const storedProfile = {
        ...pdfProfile,
        email: String(email).trim().toLowerCase(),
        prenom: req.body.prenom || pdfProfile.prenom || String(email).split("@")[0],
        nom: req.body.nom || pdfProfile.nom,
        gender: pdfProfile.gender || req.body.gender || "homme",
      };

      // Create record immediately, process in background
      const baseRecord = await storage.createBloodTest({
        userId: user.id,
        fileName: req.file.originalname,
        fileType: req.file.mimetype,
        fileSize: req.file.size,
        status: "processing",
        error: null,
        markers: extractedMarkers as any,
        analysis: { ...deriveAiProcessingMeta("admin_upload_generation_pending") },
        patientProfile: storedProfile as any,
        globalScore: null,
        globalLevel: null,
        createdAt: new Date(),
      });

      // Respond immediately
      res.json({ success: true, bloodTestId: baseRecord.id, status: "processing" });

      // Process in background (extraction + full analysis pipeline)
      setTimeout(async () => {
        try {
          console.log(`[Admin] ${extractedMarkers.length} markers extracted for ${email}`);

          // Run full analysis pipeline (same as regular upload)
          const gender = (pdfProfile.gender || req.body.gender || "homme") as "homme" | "femme";
          const age = pdfProfile.dob ? getAgeFromDob(pdfProfile.dob) : req.body.age || undefined;
          const analysisResult = await analyzeBloodwork(extractedMarkers, { gender, age });

          const scoredMarkers = analysisResult.markers.map((marker) => {
            const range = BIOMARKER_RANGES[marker.markerId];
            return {
              name: marker.name,
              code: marker.markerId,
              category: CATEGORY_BY_MARKER[marker.markerId] || "general",
              value: marker.value,
              unit: marker.unit,
              refMin: range?.normalMin ?? null,
              refMax: range?.normalMax ?? null,
              optimalMin: range?.optimalMin ?? null,
              optimalMax: range?.optimalMax ?? null,
              status: marker.status,
              interpretation: marker.interpretation,
            };
          });
          const categoryScores = computeCategoryScores(scoredMarkers);
          const systemScores = computeSystemScores(scoredMarkers);
          const scoreSource = Object.keys(systemScores).length ? systemScores : categoryScores;
          const globalScore = computeGlobalScore(scoreSource, scoredMarkers);
          const globalLevel = getGlobalLevel(globalScore);

          const knowledgeContext = await getBloodworkKnowledgeContext(
            analysisResult.markers,
            analysisResult.patterns
          );

          const aiProfile = {
            gender,
            age,
            prenom: storedProfile.prenom,
            nom: storedProfile.nom,
          };

          // Store markers + analysis immediately
          await storage.updateBloodTest(baseRecord.id, {
            markers: extractedMarkers as any,
            analysis: analysisResult as any,
            patientProfile: storedProfile as any,
            globalScore,
            globalLevel,
          });

          // Generate AI report
          let aiReport = "";
          try {
            aiReport = await generateAIBloodAnalysis(analysisResult, aiProfile, knowledgeContext);
          } catch (aiErr) {
            console.warn(`[Admin] AI report generation failed, using fallback:`, aiErr);
            aiReport = buildFallbackAnalysis(analysisResult, { gender, age });
          }

          aiReport = repairReportTextForDelivery(aiReport, storedProfile as Record<string, unknown>);
          const completedAnalysis: Record<string, unknown> = {
            ...analysisResult,
            aiAnalysis: aiReport,
            aiReport,
            ...deriveAiMeta(
              aiReport,
              isFallbackAnalysisText(aiReport) ? "admin_upload_generation_fallback" : undefined
            ),
          };
          await storage.updateBloodTest(baseRecord.id, {
            analysis: completedAnalysis as any,
            status: "completed",
            completedAt: new Date(),
          });
          console.log(`[Admin] Blood test ${baseRecord.id} completed for ${email}`);

          if (!isFallbackAnalysisText(aiReport)) {
            try {
              const baseUrl = process.env.APP_URL || process.env.RENDER_EXTERNAL_URL || "https://apexlabs.achzodcoaching.com";
              const sent = await sendBloodClientDeliveryEmail(
                storedProfile.email,
                baseRecord.id,
                aiReport,
                baseUrl,
                extractedMarkers as any,
                storedProfile as Record<string, unknown>,
              );
              await storage.updateBloodTest(baseRecord.id, {
                analysis: {
                  ...completedAnalysis,
                  deliveryStatus: sent ? "SENT" : "RETRY_PENDING",
                  ...(sent
                    ? { emailSentAt: new Date().toISOString() }
                    : { deliveryNextRetryAt: new Date(Date.now() + 60 * 60 * 1000).toISOString() }),
                },
              });
            } catch (mailError) {
              console.error(`[Admin] Blood auto-delivery failed for ${baseRecord.id}:`, mailError);
              await storage.updateBloodTest(baseRecord.id, {
                analysis: {
                  ...completedAnalysis,
                  deliveryStatus: "RETRY_PENDING",
                  deliveryNextRetryAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
                },
              });
            }
          }
        } catch (e) {
          console.error(`[Admin] Blood processing failed:`, e);
          await storage.updateBloodTest(baseRecord.id, { status: "error", error: String(e) }).catch(() => {});
        }
      }, 100);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Admin: re-extract markers from an existing blood test's PDF
  app.get("/api/admin/blood-tests/:id/raw", async (req, res) => {
    if (!requireAdmin(req, res)) return;
    try {
      const { id } = req.params;
      const { db: dumpDb } = await import("../db.js");
      const { bloodTests: dumpBt } = await import("../../shared/drizzle-schema.js");
      const { eq: dumpEq } = await import("drizzle-orm");
      const results = await dumpDb.select().from(dumpBt).where(dumpEq(dumpBt.id, id));
      if (!results.length) { res.status(404).json({ error: "Blood test not found" }); return; }
      res.json({ success: true, bloodTest: results[0] });
    } catch (error: any) {
      console.error("[Admin] Blood test dump error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/admin/blood-tests/health", async (req, res) => {
    if (!requireAdmin(req, res)) return;
    try {
      const { db: healthDb } = await import("../db.js");
      const { bloodTests: healthTable } = await import("../../shared/drizzle-schema.js");
      const { desc: healthDesc } = await import("drizzle-orm");
      const records = await healthDb
        .select()
        .from(healthTable)
        .orderBy(healthDesc(healthTable.createdAt))
        .limit(2000) as BloodTestOperationalRecord[];
      const activeRecords = collapseRecentBloodDuplicates(records);
      const oldProcessingCutoff = Date.now() - 15 * 60 * 1000;
      const recentDeliveryCutoff = Math.max(
        Date.now() - 48 * 60 * 60 * 1000,
        new Date(process.env.BLOOD_DELIVERY_RETRY_SINCE || "2026-08-05T00:00:00.000Z").getTime(),
      );
      const recentErrorCutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;

      const issues = {
        oldProcessing: activeRecords.filter((record) =>
          !isInternalQaBloodRecord(record) &&
          record.status === "processing" && new Date(record.createdAt).getTime() < oldProcessingCutoff
        ).map((record) => record.id),
        recentErrors: activeRecords.filter((record) =>
          !isInternalQaBloodRecord(record) &&
          record.status === "error" && new Date(record.createdAt).getTime() >= recentErrorCutoff
        ).map((record) => record.id),
        completedWithoutNarrative: activeRecords.filter((record) =>
          !isInternalQaBloodRecord(record) &&
          record.status === "completed" && !getStoredBloodNarrative(record.analysis)
        ).map((record) => record.id),
        fallbackReports: activeRecords.filter((record) => {
          if (isInternalQaBloodRecord(record)) return false;
          const narrative = getStoredBloodNarrative(record.analysis);
          return Boolean(narrative) && isFallbackAnalysisText(narrative);
        }).map((record) => record.id),
        fieldMismatches: records.filter((record) => {
          const analysis = record.analysis && typeof record.analysis === "object"
            ? record.analysis as Record<string, unknown>
            : {};
          const aiAnalysis = typeof analysis.aiAnalysis === "string" ? analysis.aiAnalysis : "";
          const aiReport = typeof analysis.aiReport === "string" ? analysis.aiReport : "";
          return Boolean(aiAnalysis || aiReport) && aiAnalysis !== aiReport;
        }).map((record) => record.id),
        missingCompletedAt: records.filter((record) =>
          record.status === "completed" && !record.completedAt
        ).map((record) => record.id),
        qualityFailures: activeRecords.filter((record) => {
          if (isInternalQaBloodRecord(record)) return false;
          const narrative = getStoredBloodNarrative(record.analysis);
          return Boolean(narrative) && !isFallbackAnalysisText(narrative) && !auditClientFacingText(narrative).ok;
        }).map((record) => record.id),
        recentFullReportsNotDelivered: activeRecords.filter((record) => {
          const narrative = getStoredBloodNarrative(record.analysis);
          const analysis = record.analysis && typeof record.analysis === "object"
            ? record.analysis as Record<string, unknown>
            : {};
          const profile = (record as any).patientProfile && typeof (record as any).patientProfile === "object"
            ? (record as any).patientProfile as Record<string, unknown>
            : {};
          return new Date(record.createdAt).getTime() >= recentDeliveryCutoff &&
            Boolean(narrative) &&
            !isFallbackAnalysisText(narrative) &&
            analysis.deliveryStatus !== "SENT" &&
            !isInternalQaEmail(profile.email);
        }).map((record) => record.id),
      };
      const counts = Object.fromEntries(
        Object.entries(issues).map(([key, ids]) => [key, ids.length])
      ) as Record<string, number>;
      const redCount = Object.values(counts).reduce((sum, count) => sum + count, 0);
      res.json({
        success: true,
        green: redCount === 0,
        checked: records.length,
        activeAfterDuplicateCollapse: activeRecords.length,
        duplicateRowsHidden: records.length - activeRecords.length,
        counts,
        issues,
        checkedAt: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error("[Admin] Blood health audit error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/admin/blood-tests/reconcile", async (req, res) => {
    if (!requireAdmin(req, res)) return;
    try {
      const dryRun = req.body?.dryRun !== false;
      const { db: reconcileDb } = await import("../db.js");
      const { bloodTests: reconcileTable } = await import("../../shared/drizzle-schema.js");
      const { eq: reconcileEq, desc: reconcileDesc } = await import("drizzle-orm");
      const records = await reconcileDb
        .select()
        .from(reconcileTable)
        .orderBy(reconcileDesc(reconcileTable.createdAt))
        .limit(2000);
      const changed: string[] = [];
      const blocked: Array<{ id: string; audit: ReturnType<typeof auditClientFacingText> }> = [];

      for (const record of records) {
        const narrative = getStoredBloodNarrative(record.analysis);
        if (!narrative) continue;
        const profile = record.patientProfile && typeof record.patientProfile === "object"
          ? record.patientProfile as Record<string, unknown>
          : {};
        const repaired = repairReportTextForDelivery(narrative, profile);
        const audit = auditClientFacingText(repaired);
        if (!audit.ok) {
          blocked.push({ id: record.id, audit });
          continue;
        }
        const analysis = record.analysis && typeof record.analysis === "object"
          ? record.analysis as Record<string, unknown>
          : {};
        const needsUpdate = analysis.aiAnalysis !== repaired ||
          analysis.aiReport !== repaired ||
          record.status !== "completed" ||
          !record.completedAt;
        if (!needsUpdate) continue;
        changed.push(record.id);
        if (!dryRun) {
          await reconcileDb.update(reconcileTable).set({
            analysis: {
              ...analysis,
              aiAnalysis: repaired,
              aiReport: repaired,
              aiReconciledAt: new Date().toISOString(),
              aiReconciliationAudit: audit,
            } as any,
            status: "completed",
            completedAt: record.completedAt || new Date(),
          }).where(reconcileEq(reconcileTable.id, record.id));
        }
      }

      res.status(blocked.length ? 422 : 200).json({
        success: blocked.length === 0,
        dryRun,
        checked: records.length,
        changed: changed.length,
        changedIds: changed,
        blocked,
      });
    } catch (error: any) {
      console.error("[Admin] Blood reconciliation error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Admin: deterministic client-facing repair. This never calls GPT and never
  // changes delivery state. It normalizes legacy fields, tutoiement and style.
  app.post("/api/admin/blood-tests/:id/sanitize-report", async (req, res) => {
    if (!requireAdmin(req, res)) return;
    try {
      const { id } = req.params;
      const { db: sanitizeDb } = await import("../db.js");
      const { bloodTests: sanitizeTable } = await import("../../shared/drizzle-schema.js");
      const { eq: sanitizeEq } = await import("drizzle-orm");

      const results = await sanitizeDb
        .select()
        .from(sanitizeTable)
        .where(sanitizeEq(sanitizeTable.id, id));
      if (!results.length) {
        res.status(404).json({ error: "Blood test not found" });
        return;
      }

      const bloodTest = results[0];
      const analysis = bloodTest.analysis && typeof bloodTest.analysis === "object"
        ? (bloodTest.analysis as Record<string, unknown>)
        : {};
      const currentReport = typeof analysis.aiAnalysis === "string"
        ? analysis.aiAnalysis
        : typeof analysis.aiReport === "string"
          ? analysis.aiReport
          : "";
      if (!currentReport.trim()) {
        res.status(409).json({ error: "No generated Blood report to sanitize" });
        return;
      }

      const beforeAudit = auditClientFacingText(currentReport);
      const profile = bloodTest.patientProfile && typeof bloodTest.patientProfile === "object"
        ? bloodTest.patientProfile as Record<string, unknown>
        : {};
      const sanitizedReport = repairReportTextForDelivery(currentReport, profile);
      const afterAudit = auditClientFacingText(sanitizedReport);
      if (!afterAudit.ok) {
        res.status(422).json({
          error: "Client-facing quality gate still failing after deterministic sanitization",
          beforeAudit,
          afterAudit,
        });
        return;
      }

      const sanitizedAnalysis: Record<string, unknown> = {
        ...analysis,
        aiAnalysis: sanitizedReport,
        aiReport: sanitizedReport,
        aiSanitizedAt: new Date().toISOString(),
        aiSanitizationAudit: { before: beforeAudit, after: afterAudit },
      };
      await sanitizeDb
        .update(sanitizeTable)
        .set({
          analysis: sanitizedAnalysis as any,
          status: "completed",
          completedAt: bloodTest.completedAt || new Date(),
        })
        .where(sanitizeEq(sanitizeTable.id, id));

      res.json({
        success: true,
        changed: sanitizedReport !== currentReport,
        beforeLength: currentReport.length,
        afterLength: sanitizedReport.length,
        beforeAudit,
        afterAudit,
      });
    } catch (error: any) {
      console.error("[Admin] Blood report sanitization error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Admin: rebuild a failed batched report from already completed and stored
  // OpenAI response IDs. This path performs retrieval only, never generation,
  // and keeps delivery on QA hold until the report is explicitly force-sent.
  app.post("/api/admin/blood-tests/:id/recover-stored-openai", async (req, res) => {
    if (!requireAdmin(req, res)) return;
    const { id } = req.params;
    const responseIds = Array.isArray(req.body?.responseIds)
      ? req.body.responseIds.map((value: unknown) => String(value || "").trim())
      : [];
    if (responseIds.length !== 3 || responseIds.some((value: string) => !/^resp_[A-Za-z0-9]+$/.test(value))) {
      res.status(400).json({ error: "Exactly three valid stored OpenAI response IDs are required" });
      return;
    }
    if (new Set(responseIds).size !== responseIds.length) {
      res.status(400).json({ error: "Stored OpenAI response IDs must be unique" });
      return;
    }
    if (activeBloodReportGenerationIds.has(id)) {
      res.status(409).json({ error: "Blood report generation already in progress", reportId: id });
      return;
    }

    activeBloodReportGenerationIds.add(id);
    let generationKey = "";
    try {
      const { db: recoveryDb } = await import("../db.js");
      const { bloodTests: recoveryTable } = await import("../../shared/drizzle-schema.js");
      const { eq: recoveryEq } = await import("drizzle-orm");
      const rows = await recoveryDb
        .select()
        .from(recoveryTable)
        .where(recoveryEq(recoveryTable.id, id));
      if (!rows.length) {
        res.status(404).json({ error: "Blood test not found" });
        return;
      }

      const bloodTest = rows[0];
      generationKey = getBloodReportGenerationKey(bloodTest);
      if (generationKey && activeBloodReportGenerationKeys.has(generationKey)) {
        res.status(409).json({ error: "Equivalent Blood report generation already in progress", reportId: id });
        return;
      }
      if (generationKey) activeBloodReportGenerationKeys.add(generationKey);

      const markers = Array.isArray(bloodTest.markers) ? bloodTest.markers as any[] : [];
      if (!markers.length) {
        res.status(409).json({ error: "Blood test has no extracted markers" });
        return;
      }
      const profile = bloodTest.patientProfile && typeof bloodTest.patientProfile === "object"
        ? bloodTest.patientProfile as Record<string, any>
        : {};
      const gender = (profile.gender as "homme" | "femme") || "homme";
      const age = getAgeFromDob(profile.dob);
      const normalizedInput = markers.map((marker) => ({
        markerId: marker.code || marker.markerId,
        name: marker.name,
        value: marker.value,
        unit: marker.unit,
      }));
      const analysisResult = await analyzeBloodwork(normalizedInput as any, { gender, age });
      const knowledgeContext = await getBloodworkKnowledgeContext(
        analysisResult.markers,
        analysisResult.patterns,
      ).catch(() => undefined);
      const [{ retrieveStoredOpenAIResponseText }, { generateParallelHtmlReport }] = await Promise.all([
        import("../openaiResponses.js"),
        import("../blood-analysis/parallel-html-generator.js"),
      ]);
      const storedResponses = await Promise.all(
        responseIds.map((responseId: string) => retrieveStoredOpenAIResponseText(responseId)),
      );
      const rebuilt = await generateParallelHtmlReport(
        analysisResult,
        { ...profile, gender, age },
        knowledgeContext,
        {
          allowCanonicalRecovery: false,
          batchResponseTexts: storedResponses.map((response) => response.text),
        },
      );
      const finalized = finalizeGeneratedBloodReport(
        rebuilt.markdown,
        { ...profile, gender, age },
        analysisResult.markers,
        new Set(rebuilt.sourceIds),
      );
      const existingAnalysis = bloodTest.analysis && typeof bloodTest.analysis === "object"
        ? bloodTest.analysis as Record<string, unknown>
        : {};
      const recoveredAt = new Date().toISOString();
      const mergedAnalysis: Record<string, unknown> = {
        ...existingAnalysis,
        ...analysisResult,
        aiAnalysis: finalized.report,
        aiReport: finalized.report,
        ...deriveAiMeta(finalized.report),
        aiRetryCount: 0,
        aiNextRetryAt: null,
        aiRecoveredAt: recoveredAt,
        aiRecoveredFromResponseIds: responseIds,
        aiRecoveryMode: "stored_response_retrieval_no_generation",
        aiRecoveryAudit: {
          clientFacing: finalized.clientFacingAudit,
          structure: finalized.structureCheck,
          reportLength: finalized.report.length,
          sourceIds: rebuilt.sourceIds,
        },
        deliveryStatus: "QA_HOLD",
        deliveryHoldReason: "awaiting_manual_content_and_render_audit",
      };
      await recoveryDb.update(recoveryTable).set({
        analysis: mergedAnalysis as any,
        status: "completed",
        completedAt: new Date(),
      }).where(recoveryEq(recoveryTable.id, id));

      res.json({
        success: true,
        reportId: id,
        reportLength: finalized.report.length,
        sections: finalized.structureCheck.matchedSections,
        clientFacingAudit: finalized.clientFacingAudit,
        structureAudit: finalized.structureCheck,
        sourceIds: rebuilt.sourceIds,
        responseIds,
        deliveryStatus: "QA_HOLD",
        generatedNewOpenAIResponse: false,
      });
    } catch (error: any) {
      console.error("[Admin] Stored OpenAI blood recovery error:", error);
      res.status(422).json({ error: error?.message || String(error) });
    } finally {
      activeBloodReportGenerationIds.delete(id);
      if (generationKey) activeBloodReportGenerationKeys.delete(generationKey);
    }
  });

  app.post("/api/admin/blood-tests/:id/reprocess", async (req, res) => {
    if (!requireAdmin(req, res)) return;
    try {
      const { id } = req.params;
      if (activeBloodReportGenerationIds.has(id)) {
        res.status(409).json({ error: "Blood report generation already in progress", reportId: id });
        return;
      }
      activeBloodReportGenerationIds.add(id);
      let generationKey = "";
      try {
      const { db: reDb } = await import("../db.js");
      const { bloodTests: btTable } = await import("../../shared/drizzle-schema.js");
      const { eq: btEq } = await import("drizzle-orm");

      const results = await reDb.select().from(btTable).where(btEq(btTable.id, id));
      if (!results.length) { res.status(404).json({ error: "Blood test not found" }); return; }

      const bt = results[0];
      generationKey = getBloodReportGenerationKey(bt);
      if (generationKey && activeBloodReportGenerationKeys.has(generationKey)) {
        res.status(409).json({ error: "Equivalent Blood report generation already in progress", reportId: id });
        return;
      }
      if (generationKey) activeBloodReportGenerationKeys.add(generationKey);
      const markers = Array.isArray(bt.markers) ? bt.markers : [];

      // generateAIBloodAnalysis expects a full BloodAnalysisResult (object with
      // .markers, .patterns, .alerts, etc.), not a raw markers[] array. Passing
      // the array directly throws "Cannot read properties of undefined (reading
      // 'map')" when it tries to read .patterns / .markers off it (Alan
      // Annequin 2026-05-09 stuck in "processing" forever, reprocess endpoint
      // crashed). Always run analyzeBloodwork first so we have the right shape.
      const { analyzeBloodwork, getBloodworkKnowledgeContext } =
        await import("../blood-analysis/index.js");
      const profile = bt.patientProfile && typeof bt.patientProfile === "object" ? bt.patientProfile as any : {};
      const gender = (profile.gender as "homme" | "femme") || "homme";
      const age = getAgeFromDob(profile.dob);

      // Stored markers from blood_tests use a `code` field (e.g.
      // "testosterone_total") which is exactly what BIOMARKER_RANGES keys on,
      // but analyzeBloodwork takes BloodMarkerInput which only reads
      // .markerId || .name. With code unwired, it falls back to .name
      // ("Testostérone totale" with accent) and the alias table has
      // "testosterone totale" without accent ,  so testosterone got dropped
      // entirely from the analyzed marker list, and the model wrote "tests
      // manquants: testostérone totale et libre" because it literally
      // received zero testosterone data (Alan Annequin 2026-05-09). Map
      // code → markerId before calling analyzeBloodwork.
      const normalizedInput = (markers as any[]).map((m) => ({
        markerId: m.code || m.markerId,
        name: m.name,
        value: m.value,
        unit: m.unit,
      }));
      const analysisResult = await analyzeBloodwork(normalizedInput as any, { gender, age });
      const knowledgeContext = await getBloodworkKnowledgeContext(analysisResult.markers, analysisResult.patterns).catch(() => undefined);
      let aiText = await generateAIBloodAnalysisWithFallbackRetry(
        analysisResult,
        { ...profile, gender, age },
        knowledgeContext,
      );
      if (!aiText) {
        aiText = buildFallbackAnalysis(analysisResult, {
          gender,
          age,
          sleepHours: profile.sleepHours,
          stressLevel: profile.stressLevel,
          fastingHours: profile.fastingHours,
          drawTime: profile.drawTime,
          lastTraining: profile.lastTraining,
          alcoholLast72h: profile.alcoholLast72h,
          nutritionPhase: profile.nutritionPhase,
          supplementsUsed: profile.supplementsUsed,
          medications: profile.medications,
          infectionRecent: profile.infectionRecent,
          poids: profile.poids,
          taille: profile.taille,
        });
      }
      aiText = repairReportTextForDelivery(aiText, profile as Record<string, unknown>);

      const mergedAnalysis: Record<string, unknown> = {
        ...(typeof bt.analysis === "object" && bt.analysis ? (bt.analysis as Record<string, unknown>) : {}),
        ...analysisResult,
        aiAnalysis: aiText,
        aiReport: aiText,
        ...deriveAiMeta(
          aiText,
          isFallbackAnalysisText(aiText) ? "admin_reprocess_fallback" : undefined
        ),
      };

      await reDb.update(btTable).set({
        analysis: mergedAnalysis as any,
        status: "completed",
        completedAt: new Date(),
      }).where(btEq(btTable.id, id));

      res.json({ success: true, message: "Blood test reprocessed", markers: markers.length });
      } finally {
        activeBloodReportGenerationIds.delete(id);
        if (generationKey) activeBloodReportGenerationKeys.delete(generationKey);
      }
    } catch (error: any) {
      console.error("[Admin] Blood test reprocess error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Admin: patch a single marker value (e.g. fix wrong testostérone libre 4.52 → 15.7).
  // Body: { code: string, value: number, regenerate?: boolean }
  // If regenerate true (default), re-runs AI analysis with the corrected marker.
  app.post("/api/admin/blood-tests/:id/patch-marker", async (req, res) => {
    if (!requireAdmin(req, res)) return;
    try {
      const { id } = req.params;
      const { code, value, regenerate = true } = (req.body || {}) as {
        code?: string;
        value?: number;
        regenerate?: boolean;
      };
      if (!code || typeof code !== "string") {
        res.status(400).json({ error: "Missing 'code' (marker code)" });
        return;
      }
      if (typeof value !== "number" || !Number.isFinite(value)) {
        res.status(400).json({ error: "Missing or invalid 'value' (number)" });
        return;
      }

      const { db: reDb } = await import("../db.js");
      const { bloodTests: btTable } = await import("../../shared/drizzle-schema.js");
      const { eq: btEq } = await import("drizzle-orm");

      const results = await reDb.select().from(btTable).where(btEq(btTable.id, id));
      if (!results.length) { res.status(404).json({ error: "Blood test not found" }); return; }

      const bt = results[0];
      const markers = Array.isArray(bt.markers) ? [...(bt.markers as any[])] : [];
      const idx = markers.findIndex((m: any) => m && (m.code === code || m.markerId === code));
      if (idx === -1) {
        res.status(404).json({ error: `Marker not found: ${code}`, availableCodes: markers.map((m: any) => m.code || m.markerId).filter(Boolean) });
        return;
      }
      const previous = markers[idx]?.value;
      markers[idx] = { ...markers[idx], value };

      // Persist marker change first so reprocess sees the corrected value.
      await reDb.update(btTable).set({ markers: markers as any }).where(btEq(btTable.id, id));

      let aiRegenerated = false;
      if (regenerate) {
        const { analyzeBloodwork, generateAIBloodAnalysis } = await import("../blood-analysis/index.js");
        const profile = bt.patientProfile && typeof bt.patientProfile === "object" ? bt.patientProfile as any : {};
        const markerInputs = (markers as any[]).map((m) => ({
          markerId: m?.code || m?.markerId,
          name: m?.name,
          value: Number(m?.value),
          unit: m?.unit,
        })).filter((m) => (m.markerId || m.name) && Number.isFinite(m.value));
        const analysisResult = await analyzeBloodwork(markerInputs as any, profile);
        const aiResult = await generateAIBloodAnalysis(analysisResult, profile);

        // Recompute scoring with the current (May 2026) calibration so any
        // stale globalScore from a prior calibration gets overwritten. Without
        // this, ...existingAnalysis would preserve the old categoryScores and
        // globalScore (Younes Y. case 2026-05-07).
        const markersForScoring = (analysisResult.markers || []).map((m: any) => ({
          code: m.markerId,
          category: CATEGORY_BY_MARKER[m.markerId] || "general",
          status: m.status as MarkerStatus,
        }));
        const newCategoryScores = computeCategoryScores(markersForScoring);
        const newSystemScores = computeSystemScores(markersForScoring);
        const newScoreSource = Object.keys(newSystemScores).length ? newSystemScores : newCategoryScores;
        const newGlobalScore = computeGlobalScore(newScoreSource, markersForScoring);
        const newGlobalLevel = getGlobalLevel(newGlobalScore);

        // Preserve all existing analysis metadata fields (aiStatus, lifestyleCorrelations,
        // etc.) but overwrite scoring fields with freshly recomputed values.
        const existingAnalysis =
          bt.analysis && typeof bt.analysis === "object" && !Array.isArray(bt.analysis)
            ? (bt.analysis as Record<string, unknown>)
            : {};
        const refreshedAnalysis: Record<string, unknown> = {
          ...existingAnalysis,
          ...analysisResult,
          categoryScores: newCategoryScores,
          systemScores: newSystemScores,
          globalScore: newGlobalScore,
          globalLevel: newGlobalLevel,
          aiReport: aiResult,
          aiAnalysis: aiResult,
          aiModel: "gpt-5.6-sol",
          aiStatus: "generated",
          aiGeneratedAt: new Date().toISOString(),
          aiError: null,
          aiFallbackAt: null,
          aiFallbackReason: null,
        };

        await reDb.update(btTable).set({
          analysis: refreshedAnalysis as any,
          globalScore: newGlobalScore,
          globalLevel: newGlobalLevel,
          status: "completed",
          completedAt: new Date(),
        }).where(btEq(btTable.id, id));
        aiRegenerated = true;
      }

      res.json({
        success: true,
        message: "Marker patched",
        code,
        previous,
        value,
        regenerated: aiRegenerated,
      });
    } catch (error: any) {
      console.error("[Admin] Blood test patch-marker error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/admin/blood-tests/seed", async (req, res) => {
    if (!requireAdmin(req, res)) return;
    try {
      const body = (req.body || {}) as {
        email?: string;
        files?: string[];
        includeAI?: boolean;
        asyncAI?: boolean;
        prenom?: string;
        nom?: string;
        gender?: string;
        dob?: string;
        poids?: number;
        taille?: number;
        sleepHours?: number;
        stressLevel?: number;
        fastingHours?: number;
        drawTime?: string;
        lastTraining?: string;
        alcoholLast72h?: string;
        nutritionPhase?: string;
        supplementsUsed?: string[];
        medications?: string;
        infectionRecent?: string;
      };
      const seedEmail = (
        String(body.email || "").trim() ||
        (process.env.ADMIN_EMAILS || "").split(",")[0]?.trim() ||
        "achkou@gmail.com"
      ).toLowerCase();

      let user = await storage.getUserByEmail(seedEmail);
      if (!user) {
        const defaultCredits = Number(process.env.DEFAULT_BLOOD_CREDITS ?? "0");
        user = await storage.createUser({ email: seedEmail, credits: defaultCredits });
      }

      const dataDir = path.resolve(process.cwd(), "data");
      const available = fs
        .readdirSync(dataDir)
        .filter((file) => file.toLowerCase().endsWith(".pdf"));
      const wanted = Array.isArray(body.files) && body.files.length > 0 ? body.files : available;
      const targetFiles = available.filter((file) => wanted.includes(file));

      const created: Array<{ id: string; fileName: string; markers: number; globalScore: number }> = [];
      const skipped: Array<{ fileName: string; error: string }> = [];

      for (const file of targetFiles) {
        try {
          const likelyNonLabSeedFile = /(prd|requirements?|spec(?:s|ification)?|product|manual)/i.test(file);
          if (likelyNonLabSeedFile) {
            skipped.push({ fileName: file, error: "Document non medical ignore (seed)." });
            continue;
          }

          const buffer = fs.readFileSync(path.join(dataDir, file));
          const parsed = await pdf(buffer);
          const pdfText = parsed.text || "";
          const extractedMarkers = await extractMarkersFromPdfText(pdfText, file);
          if (!extractedMarkers.length) {
            skipped.push({ fileName: file, error: "Aucun biomarqueur detecte" });
            continue;
          }

          const pdfProfile = extractPatientInfoFromPdfText(pdfText);
          const bodyGender = String(body.gender || "").trim().toLowerCase();
          const normalizedGender =
            bodyGender.startsWith("f")
              ? "femme"
              : bodyGender.startsWith("h") || bodyGender.startsWith("m")
              ? "homme"
              : undefined;
          const patientProfile = {
            email: String(body.email || pdfProfile.email || seedEmail || "").trim() || undefined,
            prenom: String(body.prenom || pdfProfile.prenom || "").trim() || undefined,
            nom: String(body.nom || pdfProfile.nom || "").trim() || undefined,
            gender: normalizedGender || pdfProfile.gender || "homme",
            dob: String(body.dob || pdfProfile.dob || "").trim() || undefined,
            poids: parseNumber(body.poids),
            taille: parseNumber(body.taille),
            sleepHours: parseNumber(body.sleepHours),
            stressLevel: parseNumber(body.stressLevel),
            fastingHours: parseNumber(body.fastingHours),
            drawTime: String(body.drawTime || "").trim() || undefined,
            lastTraining: String(body.lastTraining || "").trim() || undefined,
            alcoholLast72h: String(body.alcoholLast72h || "").trim() || undefined,
            nutritionPhase: String(body.nutritionPhase || "").trim() || undefined,
            supplementsUsed: parseStringArray(body.supplementsUsed),
            medications: String(body.medications || "").trim() || undefined,
            infectionRecent: String(body.infectionRecent || "").trim() || undefined,
          };

          const age = getAgeFromDob(patientProfile.dob);
          const analysisResult = await analyzeBloodwork(extractedMarkers, {
            gender: patientProfile.gender as "homme" | "femme",
            age,
            objectives: undefined,
            medications: undefined,
          });

          const knowledgeContext = await getBloodworkKnowledgeContext(
            analysisResult.markers,
            analysisResult.patterns
          );

          let aiAnalysis = "";
          let aiFallbackReason: string | undefined;
          let syncAiNeedsBackgroundRetry = false;
          const includeAI = body.includeAI !== false;
          const asyncAI = body.asyncAI !== false;
          const hasOpenAIKey = Boolean(process.env.OPENAI_API_KEY);
          const aiProfile = {
            gender: patientProfile.gender as "homme" | "femme",
            age,
            prenom: patientProfile.prenom,
            nom: patientProfile.nom,
            poids: patientProfile.poids,
            taille: patientProfile.taille,
            sleepHours: patientProfile.sleepHours,
            stressLevel: patientProfile.stressLevel,
            fastingHours: patientProfile.fastingHours,
            drawTime: patientProfile.drawTime,
            lastTraining: patientProfile.lastTraining,
            alcoholLast72h: patientProfile.alcoholLast72h,
            nutritionPhase: patientProfile.nutritionPhase,
            supplementsUsed: patientProfile.supplementsUsed,
            medications: patientProfile.medications,
            infectionRecent: patientProfile.infectionRecent,
          };
          if (includeAI && !asyncAI && hasOpenAIKey) {
            try {
              aiAnalysis = await withAIGenerationTimeout(
                () =>
                  generateAIBloodAnalysis(
                    analysisResult,
                    aiProfile,
                    knowledgeContext
                  ),
                "blood-tests/seed sync report"
              );
            } catch (aiError) {
              syncAiNeedsBackgroundRetry = true;
              aiFallbackReason = "sync_timeout_or_error";
              if (isAIGenerationTimeoutError(aiError)) {
                console.warn("[BloodTests] Seed sync AI timed out, queuing async retry.");
              } else {
                console.error("[BloodTests] Seed sync AI failed, queuing async retry:", aiError);
              }
              aiAnalysis = "";
            }
          }
          if (!aiAnalysis) {
            if (!includeAI || !hasOpenAIKey) {
              aiAnalysis = buildFallbackAnalysis(analysisResult, {
                gender: patientProfile.gender as "homme" | "femme",
                age,
                sleepHours: patientProfile.sleepHours,
                stressLevel: patientProfile.stressLevel,
                fastingHours: patientProfile.fastingHours,
                drawTime: patientProfile.drawTime,
                lastTraining: patientProfile.lastTraining,
                alcoholLast72h: patientProfile.alcoholLast72h,
                nutritionPhase: patientProfile.nutritionPhase,
                supplementsUsed: patientProfile.supplementsUsed,
                medications: patientProfile.medications,
                infectionRecent: patientProfile.infectionRecent,
                poids: patientProfile.poids,
                taille: patientProfile.taille,
              });
              if (!aiFallbackReason) {
                aiFallbackReason = includeAI ? "openai_key_missing" : "ai_disabled";
              }
            } else {
              syncAiNeedsBackgroundRetry = true;
              aiFallbackReason = aiFallbackReason || "sync_empty_response_or_error";
            }
          }
          if (aiAnalysis) {
            aiAnalysis = repairReportTextForDelivery(
              aiAnalysis,
              patientProfile as Record<string, unknown>,
            );
          }
          const aiMeta = aiAnalysis
            ? deriveAiMeta(aiAnalysis, aiFallbackReason)
            : deriveAiProcessingMeta(aiFallbackReason);

          const markers = analysisResult.markers.map((marker) => {
            const range = BIOMARKER_RANGES[marker.markerId];
            return {
              name: marker.name,
              code: marker.markerId,
              category: CATEGORY_BY_MARKER[marker.markerId] || "general",
              value: marker.value,
              unit: marker.unit,
              refMin: range?.normalMin ?? null,
              refMax: range?.normalMax ?? null,
              optimalMin: range?.optimalMin ?? null,
              optimalMax: range?.optimalMax ?? null,
              status: marker.status,
              interpretation: marker.interpretation,
            };
          });

          const categoryScores = computeCategoryScores(markers);
          const systemScores = computeSystemScores(markers);
          const scoreSource = Object.keys(systemScores).length ? systemScores : categoryScores;
          const globalScore = computeGlobalScore(scoreSource, markers);
          const globalLevel = getGlobalLevel(globalScore);
          const temporalRisk = computeTemporalRisk(markers);
          const protocolPhases = buildProtocolPhases(markers);

          const analysisPayload = {
            globalScore,
            globalLevel,
            categoryScores,
            systemScores,
            temporalRisk,
            summary: analysisResult.summary,
            patterns: analysisResult.patterns,
            recommendations: analysisResult.recommendations,
            followUp: analysisResult.followUp,
            alerts: analysisResult.alerts,
            aiAnalysis,
            aiReport: aiAnalysis,
            ...aiMeta,
            protocolPhases,
            lifestyleCorrelations: buildLifestyleCorrelations(analysisResult.markers, patientProfile),
            patient: patientProfile,
          };
          const initialStatus = aiAnalysis ? "completed" : "processing";

          const createdRecord = await storage.createBloodTest({
            userId: user.id,
            fileName: file,
            fileType: "application/pdf",
            fileSize: buffer.length,
            status: initialStatus,
            error: null,
            markers,
            analysis: analysisPayload,
            patientProfile,
            globalScore,
            globalLevel,
            createdAt: new Date(),
            completedAt: initialStatus === "completed" ? new Date() : undefined,
          });

          if (includeAI && hasOpenAIKey && (asyncAI || syncAiNeedsBackgroundRetry || !aiAnalysis)) {
            setImmediate(async () => {
              try {
                const enriched = await generateAIBloodAnalysisWithFallbackRetry(
                  analysisResult,
                  aiProfile,
                  knowledgeContext
                );
                if (!enriched) {
                  const pendingPayload = {
                    ...analysisPayload,
                    aiAnalysis: "",
                    aiReport: "",
                    ...deriveAiProcessingMeta("async_generation_failed_pending_retry"),
                  };
                  await storage.updateBloodTest(createdRecord.id, {
                    analysis: pendingPayload,
                    status: "processing",
                  });
                  return;
                }
                const normalizedEnriched = repairReportTextForDelivery(
                  enriched,
                  patientProfile as Record<string, unknown>,
                );
                const updatedAnalysis = {
                  ...analysisPayload,
                  aiAnalysis: normalizedEnriched,
                  aiReport: normalizedEnriched,
                  ...deriveAiMeta(
                    normalizedEnriched,
                    isFallbackAnalysisText(normalizedEnriched) ? "async_generation_returned_fallback" : undefined
                  ),
                };
                await storage.updateBloodTest(createdRecord.id, {
                  analysis: updatedAnalysis,
                  status: "completed",
                  completedAt: new Date(),
                });
              } catch (err) {
                console.error("[BloodTests] async AI seed failed:", err);
              }
            });
          }

          created.push({
            id: createdRecord.id,
            fileName: createdRecord.fileName,
            markers: markers.length,
            globalScore,
          });
        } catch (err) {
          skipped.push({ fileName: file, error: err instanceof Error ? err.message : "Erreur inconnue" });
        }
      }

      res.json({ created, skipped });
    } catch (error) {
      console.error("[BloodTests] Seed error:", error);
      res.status(500).json({ error: "Seed error" });
    }
  });

  app.post("/api/blood-tests/upload", requireAuth, upload.single("file"), async (req, res) => {
    try {
      const auth = (req as any).auth as { userId: string; email: string };
      const user = await storage.getUser(auth.userId);
      if (!user) {
        res.status(404).json({ error: "Utilisateur introuvable" });
        return;
      }

      const credits = user.credits ?? 0;
      if (credits <= 0) {
        res.status(403).json({ error: "Credits insuffisants" });
        return;
      }

      if (!req.file) {
        res.status(400).json({ error: "Fichier manquant" });
        return;
      }

      const allowed = ["application/pdf"];
      if (!allowed.includes(req.file.mimetype)) {
        res.status(400).json({ error: "Format non supporte (PDF uniquement)." });
        return;
      }

      // Parse PDF BEFORE debiting credit (don't charge for unreadable PDFs)
      let pdfText = "";
      try {
        const parsed = await pdf(req.file.buffer);
        pdfText = parsed.text || "";
      } catch (pdfErr) {
        console.error(`[BloodTests] PDF parse failed for ${req.file.originalname}:`, pdfErr);
        res.status(400).json({
          error: "Impossible de lire le PDF. Il est probablement protege par un mot de passe. Deprotege-le avec un outil en ligne (smallpdf.com/unlock-pdf) puis re-uploade. Ton credit n'a pas ete debite.",
        });
        return;
      }

      if (!pdfText.trim() || pdfText.trim().length < 50) {
        res.status(400).json({
          error: "Le PDF semble vide ou scanne (image). Il faut un PDF avec du texte selectionnable. Si ton labo t'a fourni un scan, demande-leur la version numerique. Ton credit n'a pas ete debite.",
        });
        return;
      }

      const extractedMarkers = await extractMarkersFromPdfText(pdfText, req.file.originalname);
      if (!extractedMarkers.length) {
        const likelyNonLabUploadFile = /(prd|requirements?|spec(?:s|ification)?|product|manual)/i.test(
          req.file.originalname
        );
        res.status(400).json({
          error: likelyNonLabUploadFile
            ? "Ce document ne semble pas etre un bilan sanguin. Uploade ton PDF de resultats de laboratoire. Ton credit n'a pas ete debite."
            : "Aucun biomarqueur detecte dans le PDF. Verifie que c'est bien ton bilan sanguin de laboratoire (pas une ordonnance ou facture). Si le probleme persiste, envoie ton PDF a coaching@achzodcoaching.com. Ton credit n'a pas ete debite.",
        });
        return;
      }

      // Protect credits and the dashboard from accidental double submissions.
      // The same marker set within 24 hours resolves to the existing job.
      const existingTests = await storage.getBloodTestsByUserId(user.id);
      const duplicate = findRecentBloodDuplicate(existingTests, extractedMarkers);
      if (duplicate) {
        res.status(409).json({
          error: "Ce bilan a deja ete importe. Ton credit n'a pas ete debite.",
          bloodTestId: duplicate.id,
          status: duplicate.status,
          remainingCredits: credits,
        });
        return;
      }

      // PDF is valid and markers found , NOW debit credit
      const updatedUser = await storage.adjustUserCredits(user.id, -1);
      if (!updatedUser) {
        res.status(409).json({
          error: "Credit deja utilise ou solde insuffisant. Actualise ton dashboard avant de relancer une analyse.",
        });
        return;
      }

      const baseRecord = await storage.createBloodTest({
        userId: user.id,
        fileName: req.file.originalname,
        fileType: req.file.mimetype,
        fileSize: req.file.size,
        status: "processing",
        error: null,
        markers: [],
        analysis: {},
        patientProfile: {},
        globalScore: null,
        globalLevel: null,
        createdAt: new Date(),
      });

      const pdfProfile = extractPatientInfoFromPdfText(pdfText);
      const bodyGender = String(req.body.gender || "").trim().toLowerCase();
      const normalizedGender =
        bodyGender.startsWith("f")
          ? "femme"
          : bodyGender.startsWith("h") || bodyGender.startsWith("m")
          ? "homme"
          : undefined;
      const profile = {
        email: String(req.body.email || pdfProfile.email || user.email || "").trim() || undefined,
        prenom: String(req.body.prenom || pdfProfile.prenom || "").trim() || undefined,
        nom: String(req.body.nom || pdfProfile.nom || "").trim() || undefined,
        gender: normalizedGender || pdfProfile.gender || "homme",
        dob: String(req.body.dob || pdfProfile.dob || "").trim() || undefined,
        poids: parseNumber(req.body.poids),
        taille: parseNumber(req.body.taille),
        sleepHours: parseNumber(req.body.sleepHours),
        stressLevel: parseNumber(req.body.stressLevel),
        fastingHours: parseNumber(req.body.fastingHours),
        drawTime: String(req.body.drawTime || "").trim() || undefined,
        lastTraining: String(req.body.lastTraining || "").trim() || undefined,
        alcoholLast72h: String(req.body.alcoholLast72h || "").trim() || undefined,
        nutritionPhase: String(req.body.nutritionPhase || "").trim() || undefined,
        supplementsUsed: parseStringArray(req.body.supplementsUsed),
        medications: String(req.body.medications || "").trim() || undefined,
        infectionRecent: String(req.body.infectionRecent || "").trim() || undefined,
      };
      const missingProfile: string[] = [];
      if (!profile.prenom) missingProfile.push("prenom");
      if (!profile.nom) missingProfile.push("nom");
      if (!profile.email) missingProfile.push("email");
      if (!profile.dob) missingProfile.push("date de naissance");
      if (!profile.gender) missingProfile.push("sexe");
      if (!profile.poids) missingProfile.push("poids");
      if (!profile.taille) missingProfile.push("taille");
      if (missingProfile.length > 0) {
        const updated = await storage.updateBloodTest(baseRecord.id, {
          status: "error",
          error: `Infos patient manquantes: ${missingProfile.join(", ")}.`,
        });
        const refundedUser = await storage.adjustUserCredits(user.id, 1);
        res.status(400).json({
          error: `Infos patient manquantes: ${missingProfile.join(", ")}. Ton credit a ete rembourse.`,
          bloodTest: updated || baseRecord,
          remainingCredits: refundedUser?.credits ?? (updatedUser.credits ?? 0) + 1,
        });
        return;
      }

      await storage.updateBloodTest(baseRecord.id, {
        markers: extractedMarkers as any,
        patientProfile: profile,
        analysis: { ...deriveAiProcessingMeta("upload_generation_pending") },
      });

      const age = getAgeFromDob(profile.dob);
      const analysisResult = await analyzeBloodwork(extractedMarkers, {
        gender: profile.gender,
        age,
        objectives: undefined,
        medications: undefined,
      });

      const knowledgeContext = await getBloodworkKnowledgeContext(
        analysisResult.markers,
        analysisResult.patterns
      );

      let aiAnalysis = "";
      let aiFallbackReason: string | undefined;
      let syncAiNeedsBackgroundRetry = false;
      const hasOpenAIKey = Boolean(process.env.OPENAI_API_KEY);
      const asyncAI = req.body.asyncAI !== false;
      const aiProfile = {
        gender: profile.gender as "homme" | "femme",
        age,
        prenom: profile.prenom,
        nom: profile.nom,
        poids: profile.poids,
        taille: profile.taille,
        sleepHours: profile.sleepHours,
        stressLevel: profile.stressLevel,
        fastingHours: profile.fastingHours,
        drawTime: profile.drawTime,
        lastTraining: profile.lastTraining,
        alcoholLast72h: profile.alcoholLast72h,
        nutritionPhase: profile.nutritionPhase,
        supplementsUsed: profile.supplementsUsed,
        medications: profile.medications,
        infectionRecent: profile.infectionRecent,
      };
      if (hasOpenAIKey && !asyncAI) {
        try {
          aiAnalysis = await withAIGenerationTimeout(
            () =>
              generateAIBloodAnalysis(
                analysisResult,
                aiProfile,
                knowledgeContext
              ),
            "blood-tests/upload sync report"
          );
        } catch (aiError) {
          syncAiNeedsBackgroundRetry = true;
          aiFallbackReason = "sync_timeout_or_error";
          if (isAIGenerationTimeoutError(aiError)) {
            console.warn("[BloodTests] Upload sync AI timed out, queuing async retry.");
          } else {
            console.error("[BloodTests] Upload sync AI failed, queuing async retry:", aiError);
          }
          aiAnalysis = "";
        }
      }
      if (!aiAnalysis) {
        if (!hasOpenAIKey) {
          aiAnalysis = buildFallbackAnalysis(analysisResult, {
            gender: profile.gender as "homme" | "femme",
            age,
            sleepHours: profile.sleepHours,
            stressLevel: profile.stressLevel,
            fastingHours: profile.fastingHours,
            drawTime: profile.drawTime,
            lastTraining: profile.lastTraining,
            alcoholLast72h: profile.alcoholLast72h,
            nutritionPhase: profile.nutritionPhase,
            supplementsUsed: profile.supplementsUsed,
            medications: profile.medications,
            infectionRecent: profile.infectionRecent,
            poids: profile.poids,
            taille: profile.taille,
          });
          aiFallbackReason = aiFallbackReason || "openai_key_missing";
        } else {
          syncAiNeedsBackgroundRetry = true;
          aiFallbackReason = aiFallbackReason || "sync_empty_response_or_error";
        }
      }
      if (aiAnalysis) {
        aiAnalysis = repairReportTextForDelivery(
          aiAnalysis,
          profile as Record<string, unknown>,
        );
      }
      const aiMeta = aiAnalysis
        ? deriveAiMeta(aiAnalysis, aiFallbackReason)
        : deriveAiProcessingMeta(aiFallbackReason);

      const markers = analysisResult.markers.map((marker) => {
        const range = BIOMARKER_RANGES[marker.markerId];
        return {
          name: marker.name,
          code: marker.markerId,
          category: CATEGORY_BY_MARKER[marker.markerId] || "general",
          value: marker.value,
          unit: marker.unit,
          refMin: range?.normalMin ?? null,
          refMax: range?.normalMax ?? null,
          optimalMin: range?.optimalMin ?? null,
          optimalMax: range?.optimalMax ?? null,
          status: marker.status,
          interpretation: marker.interpretation,
        };
      });

      const categoryScores = computeCategoryScores(markers);
      const systemScores = computeSystemScores(markers);
      const scoreSource = Object.keys(systemScores).length ? systemScores : categoryScores;
      const globalScore = computeGlobalScore(scoreSource, markers);
      const globalLevel = getGlobalLevel(globalScore);
      const temporalRisk = computeTemporalRisk(markers);
      const protocolPhases = buildProtocolPhases(markers);

      const analysisPayload = {
        globalScore,
        globalLevel,
        categoryScores,
        systemScores,
        temporalRisk,
        summary: analysisResult.summary,
        patterns: analysisResult.patterns,
        recommendations: analysisResult.recommendations,
        followUp: analysisResult.followUp,
        alerts: analysisResult.alerts,
        aiAnalysis,
        aiReport: aiAnalysis,
        ...aiMeta,
        protocolPhases,
        lifestyleCorrelations: buildLifestyleCorrelations(analysisResult.markers, profile),
        patient: profile,
      };
      const initialStatus = aiAnalysis ? "completed" : "processing";

      const updatedRecord = await storage.updateBloodTest(baseRecord.id, {
        status: initialStatus,
        markers,
        analysis: analysisPayload,
        patientProfile: profile,
        globalScore,
        globalLevel,
        completedAt: initialStatus === "completed" ? new Date() : undefined,
      });

      if (hasOpenAIKey && (asyncAI || syncAiNeedsBackgroundRetry || !aiAnalysis)) {
        setImmediate(async () => {
          try {
            const enriched = await generateAIBloodAnalysisWithFallbackRetry(
              analysisResult,
              aiProfile,
              knowledgeContext
            );
            if (!enriched) {
              const pendingPayload = {
                ...analysisPayload,
                aiAnalysis: "",
                aiReport: "",
                ...deriveAiProcessingMeta("async_generation_failed_pending_retry"),
              };
              await storage.updateBloodTest(baseRecord.id, {
                analysis: pendingPayload,
                status: "processing",
              });
              return;
            }
            const normalizedEnriched = repairReportTextForDelivery(
              enriched,
              profile as Record<string, unknown>,
            );
            const refreshedAnalysis = {
              ...analysisPayload,
              aiAnalysis: normalizedEnriched,
              aiReport: normalizedEnriched,
              ...deriveAiMeta(
                normalizedEnriched,
                isFallbackAnalysisText(normalizedEnriched) ? "async_generation_returned_fallback" : undefined
              ),
            };
            await storage.updateBloodTest(baseRecord.id, {
              analysis: refreshedAnalysis,
              status: "completed",
              completedAt: new Date(),
            });

            // Auto-deliver email to client after AI completion (Younes Y. bug,
            // 2026-05-07: blood-tests-uploaded reports were marked completed
            // but no delivery email was ever sent ,  clients had no way to
            // discover their report was ready). On success we persist
            // deliveryStatus + emailSentAt into the analysis JSON so admin
            // force-send can dedup and not re-spam the client.
            if (!isFallbackAnalysisText(normalizedEnriched)) {
              try {
                const baseUrl = process.env.APP_URL || process.env.RENDER_EXTERNAL_URL || "https://apexlabs.achzodcoaching.com";
                const recipient = (profile.email as string) || user.email;
                if (recipient && normalizedEnriched) {
                  const sent = await sendBloodClientDeliveryEmail(
                    recipient,
                    baseRecord.id,
                    normalizedEnriched,
                    baseUrl,
                    markers as any,
                    profile as Record<string, unknown>,
                  );
                  console.log(`[BloodTests] Auto-delivery email for ${baseRecord.id} to ${recipient}: ${sent ? "sent" : "blocked-by-quality-gate"}`);
                  if (sent) {
                    await storage.updateBloodTest(baseRecord.id, {
                      analysis: {
                        ...refreshedAnalysis,
                        deliveryStatus: "SENT",
                        emailSentAt: new Date().toISOString(),
                      },
                    });
                  }
                }
              } catch (mailErr) {
                console.error(`[BloodTests] Auto-delivery failed for ${baseRecord.id}:`, mailErr);
              }
            }
          } catch (err) {
            console.error("[BloodTests] Upload async AI retry failed:", err);
            try {
              const fallbackAnalysis = buildFallbackAnalysis(analysisResult, {
                gender: profile.gender as "homme" | "femme",
                age,
                sleepHours: profile.sleepHours,
                stressLevel: profile.stressLevel,
                fastingHours: profile.fastingHours,
                drawTime: profile.drawTime,
                lastTraining: profile.lastTraining,
                alcoholLast72h: profile.alcoholLast72h,
                nutritionPhase: profile.nutritionPhase,
                supplementsUsed: profile.supplementsUsed,
                medications: profile.medications,
                infectionRecent: profile.infectionRecent,
                poids: profile.poids,
                taille: profile.taille,
              });
              const normalizedFallback = repairReportTextForDelivery(
                fallbackAnalysis,
                profile as Record<string, unknown>,
              );
              await storage.updateBloodTest(baseRecord.id, {
                analysis: {
                  ...analysisPayload,
                  aiAnalysis: normalizedFallback,
                  aiReport: normalizedFallback,
                  ...deriveAiMeta(normalizedFallback, "async_generation_failed_catch_fallback"),
                },
                status: "completed",
                completedAt: new Date(),
              });
            } catch (fallbackErr) {
              console.error("[BloodTests] Upload async fallback completion failed:", fallbackErr);
            }
          }
        });
      } else if (aiAnalysis && !syncAiNeedsBackgroundRetry) {
        // Sync path: AI was generated synchronously, deliver immediately.
        setImmediate(async () => {
          try {
            const baseUrl = process.env.APP_URL || process.env.RENDER_EXTERNAL_URL || "https://apexlabs.achzodcoaching.com";
            const recipient = (profile.email as string) || user.email;
            if (recipient && aiAnalysis) {
              const sent = await sendBloodClientDeliveryEmail(
                recipient,
                baseRecord.id,
                aiAnalysis,
                baseUrl,
                markers as any,
                profile as Record<string, unknown>,
              );
              console.log(`[BloodTests] Sync auto-delivery email for ${baseRecord.id} to ${recipient}: ${sent ? "sent" : "blocked-by-quality-gate"}`);
              if (sent) {
                const current = await storage.getBloodTest(baseRecord.id);
                const currentAnalysis = (current?.analysis as Record<string, unknown>) || {};
                await storage.updateBloodTest(baseRecord.id, {
                  analysis: {
                    ...currentAnalysis,
                    deliveryStatus: "SENT",
                    emailSentAt: new Date().toISOString(),
                  },
                });
              }
            }
          } catch (mailErr) {
            console.error(`[BloodTests] Sync auto-delivery failed for ${baseRecord.id}:`, mailErr);
          }
        });
      }

      res.json({
        bloodTest: updatedRecord || baseRecord,
        remainingCredits: updatedUser.credits ?? 0,
      });
    } catch (error) {
      console.error("[BloodTests] Upload error:", error);
      res.status(500).json({ error: "Erreur serveur lors de l'upload" });
    }
  });

  app.get("/api/blood-tests", requireAuth, async (req, res) => {
    try {
      if (isAdminRequest(req)) {
        const email = String(req.query.email || "").trim().toLowerCase();
        if (!email) {
          res.status(400).json({ error: "email query requis (mode admin)" });
          return;
        }
        const user = await storage.getUserByEmail(email);
        if (!user) {
          res.json({ bloodTests: [] });
          return;
        }
        const tests = collapseRecentBloodDuplicates(
          await storage.getBloodTestsByUserId(user.id)
        );
        const summaries = tests.map((test) => ({
          id: test.id,
          fileName: test.fileName,
          uploadedAt: test.createdAt,
          status: test.status,
          globalScore: test.globalScore ?? null,
          globalLevel: test.globalLevel ?? null,
          patient: test.patientProfile || (test.analysis as any)?.patient || null,
        }));
        res.json({ bloodTests: summaries });
        return;
      }

      const auth = (req as any).auth as { userId: string };
      const tests = collapseRecentBloodDuplicates(
        await storage.getBloodTestsByUserId(auth.userId)
      );
      const summaries = tests.map((test) => ({
        id: test.id,
        fileName: test.fileName,
        uploadedAt: test.createdAt,
        status: test.status,
        globalScore: test.globalScore ?? null,
        globalLevel: test.globalLevel ?? null,
        patient: test.patientProfile || (test.analysis as any)?.patient || null,
      }));
      res.json({ bloodTests: summaries });
    } catch (error) {
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  app.get("/api/blood-tests/:id", requireAuth, async (req, res) => {
    try {
      const auth = (req as any).auth as { userId: string };
      const test = await storage.getBloodTest(req.params.id);
      if (!test || (!isAdminRequest(req) && test.userId !== auth.userId)) {
        res.status(404).json({ error: "Rapport introuvable" });
        return;
      }

      const resolvedMarkers = Array.isArray(test.markers)
        ? (test.markers as Array<{ code?: string; markerId?: string; value?: number }>)
            .map((marker) => ({
              markerId: marker.code || marker.markerId,
              value: marker.value,
            }))
            .filter(
              (marker): marker is { markerId: string; value: number } =>
                typeof marker.markerId === "string" && typeof marker.value === "number"
            )
        : [];

      const baseProfile = (test.patientProfile || {}) as Record<string, unknown>;
      const normalizedGender = baseProfile.gender === "femme" ? "femme" : "homme";
      const ageFromDob = typeof baseProfile.dob === "string" ? getAgeFromDob(baseProfile.dob) : undefined;
      const profileWithAge: any = { ...baseProfile, gender: normalizedGender, age: ageFromDob };

      const analysis = await analyzeBloodwork(resolvedMarkers, {
        gender: normalizedGender,
        age: ageFromDob,
        objectives: undefined,
        medications: undefined,
      });

      const normalizedMarkers = normalizeMarkersForResponse(
        Array.isArray(test.markers) ? test.markers : [],
        analysis.markers.map((marker) => ({
          markerId: marker.markerId,
          name: marker.name,
          value: marker.value,
          unit: marker.unit,
          status: marker.status,
          interpretation: marker.interpretation,
        }))
      );

      const categoryScores = computeCategoryScores(
        normalizedMarkers.map((marker) => ({
          category: marker.category,
          status: marker.status,
        }))
      );
      const systemScores = computeSystemScores(
        normalizedMarkers.map((marker) => ({
          code: marker.code,
          status: marker.status,
        }))
      );
      const scoreSource = Object.keys(systemScores).length ? systemScores : categoryScores;
      const recomputedGlobalScore = computeGlobalScore(scoreSource, normalizedMarkers as any);
      const recomputedGlobalLevel = getGlobalLevel(recomputedGlobalScore);

      const riskProfile = resolvedMarkers.length
        ? generateComprehensiveRiskProfile(resolvedMarkers, profileWithAge)
        : null;

      // Fetch comprehensive report with citations
      let comprehensiveData = null;
      try {
        const comprehensiveReport = await generateComprehensiveBloodReport(
          resolvedMarkers,
          analysis,
          riskProfile || generateComprehensiveRiskProfile(resolvedMarkers, profileWithAge),
          profileWithAge
        );
        comprehensiveData = {
          supplements: comprehensiveReport.supplements,
          protocols: comprehensiveReport.protocols
        };
      } catch (err) {
        console.error("[BloodTest] Failed to generate comprehensive data:", err);
      }

      const storedAnalysis = test.analysis && typeof test.analysis === "object" && !Array.isArray(test.analysis)
        ? test.analysis as Record<string, unknown>
        : {};
      const storedNarrative = getStoredBloodNarrative(storedAnalysis);

      res.json({
        bloodTest: {
          id: test.id,
          fileName: test.fileName,
          uploadedAt: test.createdAt,
          status: test.status,
          error: test.error ?? null,
          globalScore:
            normalizedMarkers.length > 0
              ? recomputedGlobalScore
              : test.globalScore ?? null,
          globalLevel:
            normalizedMarkers.length > 0
              ? recomputedGlobalLevel
              : test.globalLevel ?? null,
          patient: test.patientProfile || (test.analysis as any)?.patient || null,
        },
        markers: normalizedMarkers,
        derivedMetrics: {},
        patterns: analysis.patterns || [],
        analysis: {
          ...storedAnalysis,
          aiAnalysis: storedNarrative,
          aiReport: storedNarrative,
          summary: analysis.summary,
          patterns: analysis.patterns,
          globalScore:
            normalizedMarkers.length > 0
              ? recomputedGlobalScore
              : test.globalScore ?? null,
          globalLevel:
            normalizedMarkers.length > 0
              ? recomputedGlobalLevel
              : test.globalLevel ?? null,
          categoryScores,
          systemScores,
          comprehensiveData
        },
      });
    } catch (error) {
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  app.get("/api/blood-tests/:id/export/pdf", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const auth = (req as any).auth as { userId: string };
      const test = await storage.getBloodTest(id);
      if (!test) {
        res.status(404).json({ error: "Rapport introuvable." });
        return;
      }
      if (auth.userId !== "admin" && test.userId !== auth.userId) {
        res.status(403).json({ error: "Acces interdit." });
        return;
      }

      const baseUrl =
        process.env.PUBLIC_BASE_URL ||
        process.env.RENDER_EXTERNAL_URL ||
        `${req.protocol}://${req.get("host")}`;
      const adminKey = process.env.ADMIN_SECRET || process.env.ADMIN_KEY;
      const url = `${baseUrl}/analysis/${id}${adminKey ? `?key=${adminKey}` : ""}`;

      const browser = await puppeteer.launch({
        args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
      });
      const page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 900, deviceScaleFactor: 1 });
      await page.emulateMediaType("screen");
      await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const pdfBuffer = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: { top: "16mm", right: "12mm", bottom: "16mm", left: "12mm" },
      });

      await browser.close();

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=Blood_Analysis_${id}.pdf`
      );
      res.send(pdfBuffer);
    } catch (error) {
      console.error("[Blood Export] PDF error:", error);
      res.status(500).json({ error: "Erreur generation PDF" });
    }
  });

  // Stuck-blood-test recovery cron. The upload pipeline marks a row as
  // "processing" when the inline AI generation times out, then schedules a
  // setImmediate retry. Both Younes Y. (2026-05-07) and Alan Annequin
  // (2026-05-09) sat in "processing" indefinitely because the setImmediate
  // either never fired or threw silently. This cron finds rows older than
  // 10 minutes still in "processing" and re-runs the analysis the same way
  // the admin reprocess endpoint does. After success it triggers
  // auto-delivery so the client gets their report. We no longer cap recovery
  // to the last 24h because genuinely stuck rows must still be rescued later
  // (Abdou Diallo 2026-08-05).
  let recoveryRunning = false;
  setInterval(async () => {
    if (recoveryRunning) return;
    recoveryRunning = true;
    try {
      const { db: rDb } = await import("../db.js");
      const { bloodTests: rBt } = await import("../../shared/drizzle-schema.js");
      const { eq: rEq, and: rAnd, lt: rLt, asc: rAsc, desc: rDesc } = await import("drizzle-orm");
      const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000);
      const stuckCandidates = await rDb.select().from(rBt).where(
        rAnd(
          rEq(rBt.status, "processing"),
          rLt(rBt.createdAt, tenMinAgo),
        ),
      ).orderBy(rAsc(rBt.createdAt)).limit(25);
      const stuck = stuckCandidates.filter((row) => {
        const profile = row.patientProfile && typeof row.patientProfile === "object"
          ? row.patientProfile as Record<string, unknown>
          : {};
        return !isInternalQaEmail(profile.email);
      });
      const completedCandidates = await rDb
        .select()
        .from(rBt)
        .where(rEq(rBt.status, "completed"))
        .orderBy(rDesc(rBt.createdAt))
        .limit(500);
      const dueFallbacks = collapseRecentBloodDuplicates(completedCandidates).filter((row) => {
        const profile = row.patientProfile && typeof row.patientProfile === "object"
          ? row.patientProfile as Record<string, unknown>
          : {};
        const analysis = row.analysis && typeof row.analysis === "object"
          ? row.analysis as Record<string, unknown>
          : {};
        const retryCount = Number(analysis.aiRetryCount || 0);
        const nextRetryAt = analysis.aiNextRetryAt ? new Date(String(analysis.aiNextRetryAt)).getTime() : 0;
        const narrative = getStoredBloodNarrative(analysis);
        return !isInternalQaEmail(profile.email) &&
          Boolean(narrative) &&
          isFallbackAnalysisText(narrative) &&
          retryCount < 3 &&
          (!nextRetryAt || nextRetryAt <= Date.now());
      });
      const recoveryQueue = [...stuck, ...dueFallbacks]
        .filter((row) => {
          const generationKey = getBloodReportGenerationKey(row);
          return !activeBloodReportGenerationIds.has(row.id) &&
            (!generationKey || !activeBloodReportGenerationKeys.has(generationKey));
        })
        .slice(0, 25);
      if (recoveryQueue.length) {
        console.log(`[BloodTests-Recovery] ${recoveryQueue.length} pending row(s), recovering...`);
      }
      const { analyzeBloodwork, getBloodworkKnowledgeContext } =
        await import("../blood-analysis/index.js");
      const { sendBloodClientDeliveryEmail } = await import("../blood-analysis/routes.js");
      for (const bt of recoveryQueue) {
        const generationKey = getBloodReportGenerationKey(bt);
        if (activeBloodReportGenerationIds.has(bt.id) ||
          (generationKey && activeBloodReportGenerationKeys.has(generationKey))) continue;
        activeBloodReportGenerationIds.add(bt.id);
        if (generationKey) activeBloodReportGenerationKeys.add(generationKey);
        try {
          const markers = Array.isArray(bt.markers) ? bt.markers : [];
          if (!markers.length) {
            // A row with no extracted markers cannot ever produce a report. Mark
            // the historical orphan as an error so it is not retried forever.
            console.warn(`[BloodTests-Recovery] ${bt.id} has zero markers, closing as unrecoverable`);
            await rDb.update(rBt).set({
              status: "error",
              error: "BLOOD_RECOVERY_NO_MARKERS",
            }).where(rEq(rBt.id, bt.id));
            continue;
          }
          const profile = bt.patientProfile && typeof bt.patientProfile === "object" ? bt.patientProfile as any : {};
          const gender = (profile.gender as "homme" | "femme") || "homme";
          const age = getAgeFromDob(profile.dob);
          // Map code -> markerId so analyzeBloodwork doesn't fall back to the
          // accented name and drop markers (see explanation in reprocess
          // endpoint above).
          const recoveryNormalizedInput = (markers as any[]).map((m) => ({
            markerId: m.code || m.markerId,
            name: m.name,
            value: m.value,
            unit: m.unit,
          }));
          const analysisResult = await analyzeBloodwork(recoveryNormalizedInput as any, { gender, age });
          const knowledgeContext = await getBloodworkKnowledgeContext(analysisResult.markers, analysisResult.patterns).catch(() => undefined);
          let aiText = await generateAIBloodAnalysisWithFallbackRetry(
            analysisResult,
            { ...profile, gender, age },
            knowledgeContext,
          );
          if (!aiText) {
            aiText = buildFallbackAnalysis(analysisResult, {
              gender,
              age,
              sleepHours: profile.sleepHours,
              stressLevel: profile.stressLevel,
              fastingHours: profile.fastingHours,
              drawTime: profile.drawTime,
              lastTraining: profile.lastTraining,
              alcoholLast72h: profile.alcoholLast72h,
              nutritionPhase: profile.nutritionPhase,
              supplementsUsed: profile.supplementsUsed,
              medications: profile.medications,
              infectionRecent: profile.infectionRecent,
              poids: profile.poids,
              taille: profile.taille,
            });
          }
          aiText = repairReportTextForDelivery(aiText, profile as Record<string, unknown>);
          const existingAnalysis = typeof bt.analysis === "object" && bt.analysis
            ? bt.analysis as Record<string, unknown>
            : {};
          const fallbackResult = isFallbackAnalysisText(aiText);
          const retryCount = fallbackResult ? Number(existingAnalysis.aiRetryCount || 0) + 1 : 0;
          const nextRetryDelayHours = Math.min(24, 6 * Math.max(1, retryCount));
          const mergedAnalysis: Record<string, unknown> = {
            ...existingAnalysis,
            ...analysisResult,
            aiAnalysis: aiText,
            aiReport: aiText,
            ...deriveAiMeta(
              aiText,
              fallbackResult ? "recovery_cron_fallback" : undefined
            ),
            aiRetryCount: retryCount,
            aiNextRetryAt: fallbackResult
              ? new Date(Date.now() + nextRetryDelayHours * 60 * 60 * 1000).toISOString()
              : null,
            recoveredByCronAt: new Date().toISOString(),
          };
          await rDb.update(rBt).set({
            analysis: mergedAnalysis as any,
            status: "completed",
            completedAt: new Date(),
          }).where(rEq(rBt.id, bt.id));
          console.log(`[BloodTests-Recovery] ${bt.id} recovered`);

          // Auto-deliver, with the same dedup-via-analysis-JSON pattern the
          // upload pipeline uses. We don't want this cron to also re-spam a
          // client whose report was somehow already delivered before being
          // marked "processing" again.
          if (!fallbackResult && mergedAnalysis.deliveryStatus !== "SENT" && aiText) {
            const { storage: rStorage } = await import("../storage.js");
            const userRow = await rStorage.getUser(bt.userId);
            const recipient = (profile.email as string) || userRow?.email;
            if (recipient) {
              const baseUrl = process.env.APP_URL || process.env.RENDER_EXTERNAL_URL || "https://apexlabs.achzodcoaching.com";
              const sent = await sendBloodClientDeliveryEmail(
                recipient,
                bt.id,
                aiText,
                baseUrl,
                markers as any,
                profile as Record<string, unknown>,
              );
              if (sent) {
                await rDb.update(rBt).set({
                  analysis: {
                    ...mergedAnalysis,
                    deliveryStatus: "SENT",
                    emailSentAt: new Date().toISOString(),
                  } as any,
                }).where(rEq(rBt.id, bt.id));
                console.log(`[BloodTests-Recovery] ${bt.id} delivered to ${recipient}`);
              }
            }
          }
        } catch (innerErr) {
          console.error(`[BloodTests-Recovery] ${bt.id} failed:`, innerErr);
        } finally {
          activeBloodReportGenerationIds.delete(bt.id);
          if (generationKey) activeBloodReportGenerationKeys.delete(generationKey);
        }
      }

      // Delivery recovery is separate from GPT recovery. A temporary mail
      // provider failure must never turn a valid report back into an error.
      const deliveryRetrySince = new Date(
        process.env.BLOOD_DELIVERY_RETRY_SINCE || "2026-08-05T00:00:00.000Z"
      ).getTime();
      const deliveryCandidates = collapseRecentBloodDuplicates(completedCandidates)
        .filter((bt) => {
          const profile = bt.patientProfile && typeof bt.patientProfile === "object"
            ? bt.patientProfile as Record<string, unknown>
            : {};
          const analysis = bt.analysis && typeof bt.analysis === "object"
            ? bt.analysis as Record<string, unknown>
            : {};
          const narrative = getStoredBloodNarrative(analysis);
          const retryCount = Number(analysis.deliveryRetryCount || 0);
          const nextRetryAt = analysis.deliveryNextRetryAt
            ? new Date(String(analysis.deliveryNextRetryAt)).getTime()
            : 0;
          return new Date(bt.createdAt).getTime() >= deliveryRetrySince &&
            !isInternalQaEmail(profile.email) &&
            Boolean(narrative) &&
            !isFallbackAnalysisText(narrative) &&
            analysis.deliveryStatus !== "SENT" &&
            analysis.deliveryStatus !== "QA_HOLD" &&
            retryCount < 5 &&
            (!nextRetryAt || nextRetryAt <= Date.now());
        })
        .slice(0, 10);

      for (const bt of deliveryCandidates) {
        const profile = bt.patientProfile && typeof bt.patientProfile === "object"
          ? bt.patientProfile as Record<string, unknown>
          : {};
        const analysis = bt.analysis && typeof bt.analysis === "object"
          ? bt.analysis as Record<string, unknown>
          : {};
        const narrative = getStoredBloodNarrative(analysis);
        const userRow = await storage.getUser(bt.userId);
        const recipient = String(profile.email || userRow?.email || "").trim();
        if (!recipient) continue;
        const retryCount = Number(analysis.deliveryRetryCount || 0) + 1;
        try {
          const baseUrl = process.env.APP_URL || process.env.RENDER_EXTERNAL_URL || "https://apexlabs.achzodcoaching.com";
          const sent = await sendBloodClientDeliveryEmail(
            recipient,
            bt.id,
            narrative,
            baseUrl,
            Array.isArray(bt.markers) ? bt.markers as any : [],
            profile,
          );
          await rDb.update(rBt).set({
            analysis: {
              ...analysis,
              deliveryStatus: sent ? "SENT" : "RETRY_PENDING",
              deliveryRetryCount: retryCount,
              deliveryLastAttemptAt: new Date().toISOString(),
              ...(sent
                ? { emailSentAt: new Date().toISOString(), deliveryNextRetryAt: null }
                : { deliveryNextRetryAt: new Date(Date.now() + retryCount * 60 * 60 * 1000).toISOString() }),
            } as any,
          }).where(rEq(rBt.id, bt.id));
        } catch (deliveryError) {
          console.error(`[BloodTests-Recovery] Delivery retry failed for ${bt.id}:`, deliveryError);
          await rDb.update(rBt).set({
            analysis: {
              ...analysis,
              deliveryStatus: "RETRY_PENDING",
              deliveryRetryCount: retryCount,
              deliveryLastAttemptAt: new Date().toISOString(),
              deliveryNextRetryAt: new Date(Date.now() + retryCount * 60 * 60 * 1000).toISOString(),
            } as any,
          }).where(rEq(rBt.id, bt.id));
        }
      }
    } catch (err) {
      console.error("[BloodTests-Recovery] Cron error:", err);
    } finally {
      recoveryRunning = false;
    }
  }, 5 * 60 * 1000).unref();
  console.log("[BloodTests-Recovery] ✅ setInterval registered (5min cycle)");
}
