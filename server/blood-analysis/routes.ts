/**
 * NEUROCORE 360 - Blood Analysis API Routes
 */

import type { Express } from "express";
import {
  analyzeBloodwork,
  generateAIBloodAnalysis,
  getBloodworkKnowledgeContext,
  BIOMARKER_RANGES,
  DIAGNOSTIC_PATTERNS,
  BloodMarkerInput
} from "./index";

export function registerBloodAnalysisRoutes(app: Express): void {
  /**
   * GET /api/blood-analysis/biomarkers
   * Get all available biomarkers with their ranges
   */
  app.get("/api/blood-analysis/biomarkers", async (req, res) => {
    try {
      res.json({
        success: true,
        biomarkers: BIOMARKER_RANGES,
        patterns: DIAGNOSTIC_PATTERNS.map(p => ({
          name: p.name,
          markers: Object.keys(p.markers),
          causes: p.causes
        }))
      });
    } catch (error) {
      console.error("[BloodAnalysis] Error fetching biomarkers:", error);
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  /**
   * POST /api/blood-analysis/analyze
   * Analyze blood markers and return results
   */
  app.post("/api/blood-analysis/analyze", async (req, res) => {
    try {
      const { markers, profile } = req.body as {
        markers: BloodMarkerInput[];
        profile: {
          gender: "homme" | "femme";
          age?: string;
          objectives?: string;
          medications?: string;
        };
      };

      if (!markers || !Array.isArray(markers) || markers.length === 0) {
        res.status(400).json({ error: "Aucun marqueur fourni" });
        return;
      }

      if (!profile || !profile.gender) {
        res.status(400).json({ error: "Profil invalide (gender requis)" });
        return;
      }

      console.log(`[BloodAnalysis] Analyzing ${markers.length} markers for ${profile.gender}`);

      // Run base analysis
      const analysisResult = await analyzeBloodwork(markers, profile);

      // Get knowledge context for detected patterns
      const knowledgeContext = await getBloodworkKnowledgeContext(
        analysisResult.markers,
        analysisResult.patterns
      );

      // Generate AI-powered analysis
      const aiAnalysis = await generateAIBloodAnalysis(
        analysisResult,
        profile,
        knowledgeContext
      );

      res.json({
        success: true,
        analysis: analysisResult,
        aiReport: aiAnalysis,
        sourcesUsed: knowledgeContext ? true : false
      });
    } catch (error) {
      console.error("[BloodAnalysis] Analysis error:", error);
      res.status(500).json({ error: "Erreur lors de l'analyse" });
    }
  });

  /**
   * POST /api/blood-analysis/quick-check
   * Quick check without AI - just marker analysis and pattern detection
   */
  app.post("/api/blood-analysis/quick-check", async (req, res) => {
    try {
      const { markers, profile } = req.body as {
        markers: BloodMarkerInput[];
        profile: {
          gender: "homme" | "femme";
        };
      };

      if (!markers || !Array.isArray(markers)) {
        res.status(400).json({ error: "Marqueurs invalides" });
        return;
      }

      const analysisResult = await analyzeBloodwork(markers, {
        gender: profile?.gender || "homme"
      });

      res.json({
        success: true,
        summary: analysisResult.summary,
        patterns: analysisResult.patterns.map(p => p.name),
        markerCount: analysisResult.markers.length,
        optimalCount: analysisResult.summary.optimal.length,
        actionRequired: analysisResult.summary.action.length
      });
    } catch (error) {
      console.error("[BloodAnalysis] Quick check error:", error);
      res.status(500).json({ error: "Erreur lors du check" });
    }
  });

  /**
   * GET /api/blood-analysis/optimal-ranges/:markerId
   * Get optimal range for a specific marker
   */
  app.get("/api/blood-analysis/optimal-ranges/:markerId", async (req, res) => {
    try {
      const { markerId } = req.params;
      const range = BIOMARKER_RANGES[markerId];

      if (!range) {
        res.status(404).json({ error: "Marqueur non trouvé" });
        return;
      }

      res.json({
        success: true,
        markerId,
        ...range,
        sources: ["Peter Attia", "Marek Health", "Examine.com"]
      });
    } catch (error) {
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  /**
   * GET /api/blood-analysis/patterns
   * Get all diagnostic patterns
   */
  app.get("/api/blood-analysis/patterns", async (req, res) => {
    try {
      res.json({
        success: true,
        patterns: DIAGNOSTIC_PATTERNS
      });
    } catch (error) {
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  /**
   * POST /api/blood-analysis/purchase
   * Create Stripe payment intent for Blood Analysis
   */
  app.post("/api/blood-analysis/purchase", async (req, res) => {
    try {
      const { userId } = req.body;

      if (!userId) {
        res.status(400).json({ error: "userId required" });
        return;
      }

      // TODO: Implement Stripe payment
      res.json({
        success: true,
        clientSecret: "pk_test_placeholder",
        message: "Stripe integration coming soon"
      });
    } catch (error) {
      console.error("[BloodAnalysis] Purchase error:", error);
      res.status(500).json({ error: "Erreur lors de l'achat" });
    }
  });

  /**
   * POST /api/blood-analysis/upload
   * Upload blood test results (manual input for MVP)
   */
  app.post("/api/blood-analysis/upload", async (req, res) => {
    try {
      const { userId, markers } = req.body as {
        userId: string;
        markers: BloodMarkerInput[];
      };

      if (!userId || !markers) {
        res.status(400).json({ error: "userId and markers required" });
        return;
      }

      // For MVP: Store markers directly (no OCR)
      // TODO: Implement file upload + OCR

      res.json({
        success: true,
        reportId: `temp-${Date.now()}`,
        message: "Markers saved - proceed to questionnaire"
      });
    } catch (error) {
      console.error("[BloodAnalysis] Upload error:", error);
      res.status(500).json({ error: "Erreur lors de l'upload" });
    }
  });

  /**
   * POST /api/blood-analysis/submit
   * Submit complete blood analysis (markers + questionnaire)
   */
  app.post("/api/blood-analysis/submit", async (req, res) => {
    try {
      const { userId, markers, profile } = req.body as {
        userId: string;
        markers: BloodMarkerInput[];
        profile: {
          gender: "homme" | "femme";
          age?: string;
          objectives?: string;
          medications?: string;
        };
      };

      if (!userId || !markers || !profile) {
        res.status(400).json({ error: "Missing required fields" });
        return;
      }

      console.log(`[BloodAnalysis] Processing submission for user ${userId}`);

      // Run analysis
      const analysisResult = await analyzeBloodwork(markers, profile);

      // Get knowledge context
      const knowledgeContext = await getBloodworkKnowledgeContext(
        analysisResult.markers,
        analysisResult.patterns
      );

      // Generate AI report
      const aiAnalysis = await generateAIBloodAnalysis(
        analysisResult,
        profile,
        knowledgeContext
      );

      // TODO: Save to database
      // TODO: Generate PDF
      // TODO: Send email

      res.json({
        success: true,
        reportId: `report-${Date.now()}`,
        analysis: analysisResult,
        aiReport: aiAnalysis
      });
    } catch (error) {
      console.error("[BloodAnalysis] Submit error:", error);
      res.status(500).json({ error: "Erreur lors de l'analyse" });
    }
  });

  console.log("[BloodAnalysis] Routes registered");
}
