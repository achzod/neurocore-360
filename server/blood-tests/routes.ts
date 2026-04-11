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
} from "../blood-analysis";
import {
  withAIGenerationTimeout,
  isAIGenerationTimeoutError,
  runAIGenerationWithRetry,
} from "../blood-analysis/ai-timeout";
import { generateComprehensiveBloodReport } from "../blood-analysis/recommendations-engine";
import { generateComprehensiveRiskProfile } from "../blood-analysis/risk-scores";
import { storage } from "../storage";
import { getAuthPayload } from "../auth";

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

const SCORE_BY_STATUS: Record<MarkerStatus, number> = {
  optimal: 100,
  normal: 80,
  suboptimal: 55,
  critical: 30,
};

const getGlobalLevel = (score: number | null | undefined): string | null => {
  if (score === null || score === undefined) return null;
  if (score >= 80) return "excellent";
  if (score >= 65) return "bon";
  if (score >= 50) return "moyen";
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

const computeGlobalScore = (scoresMap: Record<string, number>) => {
  const scores = Object.values(scoresMap);
  if (scores.length === 0) return 0;
  return Math.round(scores.reduce((sum, value) => sum + value, 0) / scores.length);
};

const getAgeFromDob = (dob?: string): string | undefined => {
  if (!dob) return undefined;
  const parsed = new Date(dob);
  if (Number.isNaN(parsed.getTime())) return undefined;
  const age = Math.floor((Date.now() - parsed.getTime()) / 31557600000);
  return Number.isFinite(age) ? String(age) : undefined;
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

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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
    aiModel: process.env.BLOOD_ANALYSIS_MODEL || "claude-opus-4-6",
    aiGeneratedAt: generatedAt,
    aiFallbackAt: null,
    aiFallbackReason: null,
  };
};

const deriveAiProcessingMeta = (reason?: string) => ({
  aiStatus: "processing" as const,
  aiModel: process.env.BLOOD_ANALYSIS_MODEL || "claude-opus-4-6",
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
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const report = await runAIGenerationWithRetry(
        () => generateAIBloodAnalysis(analysisResult, profile, knowledgeContext),
        `blood-tests/async-ai-attempt-${attempt}`,
        { attempts: 1 }
      );
      if (report && !isFallbackAnalysisText(report)) {
        return report;
      }
      console.warn(`[BloodTests] Async AI attempt ${attempt} returned fallback-shaped report.`);
    } catch (error) {
      console.error(`[BloodTests] Async AI attempt ${attempt} failed:`, error);
    }
    if (attempt < 3) {
      await sleep(6000);
    }
  }
  return "";
};

const isAdminRequest = (req: Request): boolean => {
  const adminKey = req.headers["x-admin-key"] || req.query.key;
  const validKey = process.env.ADMIN_SECRET || process.env.ADMIN_KEY;
  return Boolean(validKey && adminKey === validKey);
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
  app.post("/api/admin/blood-tests/upload-for-user", requireAdmin, upload.single("file"), async (req, res) => {
    try {
      const { email } = req.body;
      if (!email || !req.file) { res.status(400).json({ error: "email and file required" }); return; }

      let user = await storage.getUserByEmail(email);
      if (!user) { res.status(404).json({ error: "User not found" }); return; }

      const parsed = await pdf(req.file.buffer);
      const pdfText = parsed.text || "";
      if (!pdfText.trim()) { res.status(400).json({ error: "PDF vide" }); return; }

      // Create record immediately, process in background
      const baseRecord = await storage.createBloodTest({
        userId: user.id,
        fileName: req.file.originalname,
        fileType: req.file.mimetype,
        fileSize: req.file.size,
        status: "processing",
        error: null,
        markers: [],
        analysis: {},
        patientProfile: { email, prenom: req.body.prenom || email.split("@")[0] },
        globalScore: null,
        globalLevel: null,
        createdAt: new Date(),
      });

      // Respond immediately
      res.json({ success: true, bloodTestId: baseRecord.id, status: "processing" });

      // Process in background (extraction + AI analysis)
      const pdfBuffer = req.file.buffer;
      const fileName = req.file.originalname;
      setTimeout(async () => {
        try {
          const extractedMarkers = await extractMarkersFromPdfText(pdfText, fileName);
          if (!extractedMarkers.length) {
            await storage.updateBloodTest(baseRecord.id, { status: "error", error: "Aucun marqueur detecte" });
            return;
          }
          await storage.updateBloodTest(baseRecord.id, { markers: extractedMarkers as any });
          console.log(`[Admin] ${extractedMarkers.length} markers extracted for ${email}`);

          const aiResult = await generateAIBloodAnalysis(extractedMarkers as any, { email }, baseRecord.id);
          await storage.updateBloodTest(baseRecord.id, {
            analysis: aiResult as any,
            status: "completed",
            globalScore: (aiResult as any)?.globalScore ?? null,
            globalLevel: (aiResult as any)?.globalLevel ?? null,
          });
          console.log(`[Admin] Blood test ${baseRecord.id} completed for ${email}`);
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
  app.post("/api/admin/blood-tests/:id/reprocess", async (req, res) => {
    if (!requireAdmin(req, res)) return;
    try {
      const { id } = req.params;
      const { db: reDb } = await import("../db.js");
      const { bloodTests: btTable } = await import("../../shared/drizzle-schema.js");
      const { eq: btEq } = await import("drizzle-orm");

      const results = await reDb.select().from(btTable).where(btEq(btTable.id, id));
      if (!results.length) { res.status(404).json({ error: "Blood test not found" }); return; }

      const bt = results[0];
      // Get the PDF file from the stored data or re-read from the original upload
      // The markers need to be re-extracted — we can trigger the AI analysis again
      const markers = Array.isArray(bt.markers) ? bt.markers : [];

      // Re-run AI analysis on existing markers
      const { generateAIBloodAnalysis } = await import("../blood-analysis/index.js");
      const profile = bt.patientProfile && typeof bt.patientProfile === "object" ? bt.patientProfile as any : {};

      const aiResult = await generateAIBloodAnalysis(markers as any, profile, id);

      await reDb.update(btTable).set({
        analysis: aiResult as any,
        status: "completed",
        completedAt: new Date(),
      }).where(btEq(btTable.id, id));

      res.json({ success: true, message: "Blood test reprocessed", markers: markers.length });
    } catch (error: any) {
      console.error("[Admin] Blood test reprocess error:", error);
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
          const asyncAI = body.asyncAI === true;
          const hasAnthropicKey = Boolean(process.env.ANTHROPIC_API_KEY);
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
          if (includeAI && !asyncAI && hasAnthropicKey) {
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
            if (!includeAI || !hasAnthropicKey) {
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
                aiFallbackReason = includeAI ? "anthropic_key_missing" : "ai_disabled";
              }
            } else {
              syncAiNeedsBackgroundRetry = true;
              aiFallbackReason = aiFallbackReason || "sync_empty_response_or_error";
            }
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
          const globalScore = computeGlobalScore(scoreSource);
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

          if (includeAI && hasAnthropicKey && (asyncAI || syncAiNeedsBackgroundRetry || !aiAnalysis)) {
            setImmediate(async () => {
              try {
                const enriched = await generateAIBloodAnalysisWithFallbackRetry(
                  analysisResult,
                  aiProfile,
                  knowledgeContext
                );
                if (!enriched) {
                  const fallbackAnalysis = buildFallbackAnalysis(analysisResult, {
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
                  const fallbackPayload = {
                    ...analysisPayload,
                    aiAnalysis: fallbackAnalysis,
                    ...deriveAiMeta(fallbackAnalysis, "async_generation_failed_fallback"),
                  };
                  await storage.updateBloodTest(createdRecord.id, {
                    analysis: fallbackPayload,
                    status: "completed",
                    completedAt: new Date(),
                  });
                  return;
                }
                const updatedAnalysis = {
                  ...analysisPayload,
                  aiAnalysis: enriched,
                  ...deriveAiMeta(
                    enriched,
                    isFallbackAnalysisText(enriched) ? "async_generation_returned_fallback" : undefined
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

      // PDF is valid and markers found — NOW debit credit
      const updatedUser = await storage.adjustUserCredits(user.id, -1);
      if (!updatedUser) {
        res.status(500).json({ error: "Impossible de debiter les credits" });
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
        res.status(400).json({
          error: `Infos patient manquantes: ${missingProfile.join(", ")}.`,
          bloodTest: updated || baseRecord,
          remainingCredits: updatedUser.credits ?? 0,
        });
        return;
      }

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
      const hasAnthropicKey = Boolean(process.env.ANTHROPIC_API_KEY);
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
      if (hasAnthropicKey) {
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
        if (!hasAnthropicKey) {
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
          aiFallbackReason = aiFallbackReason || "anthropic_key_missing";
        } else {
          syncAiNeedsBackgroundRetry = true;
          aiFallbackReason = aiFallbackReason || "sync_empty_response_or_error";
        }
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
      const globalScore = computeGlobalScore(scoreSource);
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

      if (hasAnthropicKey && (syncAiNeedsBackgroundRetry || !aiAnalysis)) {
        setImmediate(async () => {
          try {
            const enriched = await generateAIBloodAnalysisWithFallbackRetry(
              analysisResult,
              aiProfile,
              knowledgeContext
            );
            if (!enriched) {
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
              const fallbackPayload = {
                ...analysisPayload,
                aiAnalysis: fallbackAnalysis,
                ...deriveAiMeta(fallbackAnalysis, "async_generation_failed_fallback"),
              };
              await storage.updateBloodTest(baseRecord.id, {
                analysis: fallbackPayload,
                status: "completed",
                completedAt: new Date(),
              });
              return;
            }
            const refreshedAnalysis = {
              ...analysisPayload,
              aiAnalysis: enriched,
              ...deriveAiMeta(
                enriched,
                isFallbackAnalysisText(enriched) ? "async_generation_returned_fallback" : undefined
              ),
            };
            await storage.updateBloodTest(baseRecord.id, {
              analysis: refreshedAnalysis,
              status: "completed",
              completedAt: new Date(),
            });
          } catch (err) {
            console.error("[BloodTests] Upload async AI retry failed:", err);
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
        const tests = await storage.getBloodTestsByUserId(user.id);
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
      const tests = await storage.getBloodTestsByUserId(auth.userId);
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
      const recomputedGlobalScore = computeGlobalScore(scoreSource);
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
          ...(test.analysis || {}),
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
}
