import type { Express, Request, Response, NextFunction } from "express";
import fs from "fs";
import path from "path";
import multer from "multer";
import pdf from "pdf-parse";
import {
  analyzeBloodwork,
  extractPatientInfoFromPdfText,
  extractMarkersFromPdfText,
  generateAIBloodAnalysis,
  getBloodworkKnowledgeContext,
  BIOMARKER_RANGES,
} from "../blood-analysis";
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

const computeGlobalScore = (categoryScores: Record<string, number>) => {
  const scores = Object.values(categoryScores);
  if (scores.length === 0) return 0;
  return Math.round(scores.reduce((sum, value) => sum + value, 0) / scores.length);
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

const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  const payload = getAuthPayload(req);
  if (!payload) {
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

export function registerBloodTestsRoutes(app: Express): void {
  app.post("/api/admin/blood-tests/seed", async (req, res) => {
    if (!requireAdmin(req, res)) return;
    try {
      const body = (req.body || {}) as { email?: string; files?: string[]; includeAI?: boolean };
      const seedEmail =
        String(body.email || "").trim() ||
        (process.env.ADMIN_EMAILS || "").split(",")[0]?.trim() ||
        "achkou@gmail.com";

      let user = await storage.getUserByEmail(seedEmail);
      if (!user) {
        const defaultCredits = Number(process.env.DEFAULT_BLOOD_CREDITS ?? "5");
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
          const buffer = fs.readFileSync(path.join(dataDir, file));
          const parsed = await pdf(buffer);
          const pdfText = parsed.text || "";
          const extractedMarkers = await extractMarkersFromPdfText(pdfText, file);
          if (!extractedMarkers.length) {
            skipped.push({ fileName: file, error: "Aucun biomarqueur detecte" });
            continue;
          }

          const pdfProfile = extractPatientInfoFromPdfText(pdfText);
          const profile = {
            email: pdfProfile.email || seedEmail,
            prenom: pdfProfile.prenom || "Non fourni",
            nom: pdfProfile.nom || "Non fourni",
            gender: pdfProfile.gender || "homme",
            dob: pdfProfile.dob || "Non fourni",
          };

          const analysisResult = await analyzeBloodwork(extractedMarkers, {
            gender: profile.gender as "homme" | "femme",
            age: undefined,
            objectives: undefined,
            medications: undefined,
          });

          const knowledgeContext = await getBloodworkKnowledgeContext(
            analysisResult.markers,
            analysisResult.patterns
          );

          let aiAnalysis = "";
          const includeAI = body.includeAI !== false;
          if (includeAI && process.env.ANTHROPIC_API_KEY) {
            try {
              aiAnalysis = await generateAIBloodAnalysis(analysisResult, profile, knowledgeContext);
            } catch {
              aiAnalysis = "";
            }
          }

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
          const globalScore = computeGlobalScore(categoryScores);
          const globalLevel = getGlobalLevel(globalScore);
          const temporalRisk = computeTemporalRisk(markers);
          const protocolPhases = buildProtocolPhases(markers);

          const analysisPayload = {
            globalScore,
            globalLevel,
            categoryScores,
            temporalRisk,
            summary: analysisResult.summary,
            patterns: analysisResult.patterns,
            recommendations: analysisResult.recommendations,
            followUp: analysisResult.followUp,
            alerts: analysisResult.alerts,
            aiAnalysis,
            protocolPhases,
            patient: profile,
          };

          const createdRecord = await storage.createBloodTest({
            userId: user.id,
            fileName: file,
            fileType: "application/pdf",
            fileSize: buffer.length,
            status: "completed",
            error: null,
            markers,
            analysis: analysisPayload,
            globalScore,
            globalLevel,
            createdAt: new Date(),
            completedAt: new Date(),
          });

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
        globalScore: null,
        globalLevel: null,
        createdAt: new Date(),
      });

      const parsed = await pdf(req.file.buffer);
      const pdfText = parsed.text || "";
      const extractedMarkers = await extractMarkersFromPdfText(pdfText, req.file.originalname);
      if (!extractedMarkers.length) {
        const updated = await storage.updateBloodTest(baseRecord.id, {
          status: "error",
          error: "Aucun biomarqueur detecte dans le PDF.",
        });
        res.json({
          bloodTest: updated || baseRecord,
          remainingCredits: updatedUser.credits ?? 0,
        });
        return;
      }

      const pdfProfile = extractPatientInfoFromPdfText(pdfText);
      const bodyGender = String(req.body.gender || "").trim().toLowerCase();
      const profile = {
        email: String(req.body.email || pdfProfile.email || user.email || "").trim() || undefined,
        prenom: String(req.body.prenom || pdfProfile.prenom || "").trim() || undefined,
        nom: String(req.body.nom || pdfProfile.nom || "").trim() || undefined,
        gender: (bodyGender === "femme" || bodyGender === "homme"
          ? (bodyGender as "homme" | "femme")
          : pdfProfile.gender) || "homme",
        dob: String(req.body.dob || pdfProfile.dob || "").trim() || undefined,
      };
      const missingProfile: string[] = [];
      if (!profile.prenom) missingProfile.push("prenom");
      if (!profile.nom) missingProfile.push("nom");
      if (!profile.email) missingProfile.push("email");
      if (!profile.dob) missingProfile.push("date de naissance");
      if (!profile.gender) missingProfile.push("sexe");
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

      const analysisResult = await analyzeBloodwork(extractedMarkers, {
        gender: profile.gender,
        age: undefined,
        objectives: undefined,
        medications: undefined,
      });

      const knowledgeContext = await getBloodworkKnowledgeContext(
        analysisResult.markers,
        analysisResult.patterns
      );

      let aiAnalysis = "";
      if (process.env.ANTHROPIC_API_KEY) {
        try {
          aiAnalysis = await generateAIBloodAnalysis(analysisResult, profile, knowledgeContext);
        } catch {
          aiAnalysis = "";
        }
      }

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
      const globalScore = computeGlobalScore(categoryScores);
      const globalLevel = getGlobalLevel(globalScore);
      const temporalRisk = computeTemporalRisk(markers);
      const protocolPhases = buildProtocolPhases(markers);

      const analysisPayload = {
        globalScore,
        globalLevel,
        categoryScores,
        temporalRisk,
        summary: analysisResult.summary,
        patterns: analysisResult.patterns,
        recommendations: analysisResult.recommendations,
        followUp: analysisResult.followUp,
        alerts: analysisResult.alerts,
        aiAnalysis,
        protocolPhases,
        patient: profile,
      };

      const updatedRecord = await storage.updateBloodTest(baseRecord.id, {
        status: "completed",
        markers,
        analysis: analysisPayload,
        globalScore,
        globalLevel,
        completedAt: new Date(),
      });

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
      const auth = (req as any).auth as { userId: string };
      const tests = await storage.getBloodTestsByUserId(auth.userId);
      const summaries = tests.map((test) => ({
        id: test.id,
        fileName: test.fileName,
        uploadedAt: test.createdAt,
        status: test.status,
        globalScore: test.globalScore ?? null,
        globalLevel: test.globalLevel ?? null,
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
      if (!test || test.userId !== auth.userId) {
        res.status(404).json({ error: "Rapport introuvable" });
        return;
      }

      res.json({
        bloodTest: {
          id: test.id,
          fileName: test.fileName,
          uploadedAt: test.createdAt,
          status: test.status,
          globalScore: test.globalScore ?? null,
          globalLevel: test.globalLevel ?? null,
        },
        markers: test.markers,
        derivedMetrics: {},
        patterns: (test.analysis as any)?.patterns || [],
        analysis: test.analysis || {},
      });
    } catch (error) {
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  app.get("/api/blood-tests/:id/export/pdf", requireAuth, async (_req, res) => {
    res.status(501).json({ error: "Export PDF indisponible pour le moment." });
  });
}
