/**
 * NEUROCORE 360 - Blood Analysis API Routes
 * Comprehensive bloodwork analysis with risk assessments
 */

import type { Express } from "express";
import {
  analyzeBloodwork,
  extractMarkersFromPdfText,
  extractPatientInfoFromPdfText,
  generateAIBloodAnalysis,
  getBloodworkKnowledgeContext,
  buildFallbackAnalysis,
  BIOMARKER_RANGES,
  DIAGNOSTIC_PATTERNS,
  BloodMarkerInput
} from "./index";
import {
  generateComprehensiveRiskProfile,
  calculatePrediabetesRisk,
  calculateInsulinResistanceIndex,
  calculateCardiovascularRisk,
  detectMetabolicSyndrome,
  calculateThyroidScore,
  calculateInflammationIndex,
  calculateAnemiaRiskScore,
  calculateLiverHealthScore,
  calculateKidneyFunctionScore,
  calculateHormonalHealthScore,
  EXTENDED_BIOMARKER_RANGES,
  ComprehensiveRiskProfile,
  RiskScore
} from "./risk-scores";
import {
  generateComprehensiveBloodReport,
  generateSupplementRecommendations,
  generateProtocolRecommendations,
  generateBloodRadarChart,
  generateActionPlan,
  searchKnowledgeForMarker,
  searchKnowledgeForRisk
} from "./recommendations-engine";
import { storage } from "../storage";
import { sendAdminEmailNewAudit, sendReportReadyEmail } from "../emailService";
import { getUncachableStripeClient } from "../stripeClient";
import pdf from "pdf-parse";

const getBaseUrl = (): string => {
  return (
    process.env.APP_URL ||
    process.env.RENDER_EXTERNAL_URL ||
    "http://localhost:10000"
  );
};

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
          prenom?: string;
          nom?: string;
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
      const { userId, email, markers, profile, pdfBase64, pdfName, sessionId } = req.body as {
        userId?: string;
        email?: string;
        markers: BloodMarkerInput[];
        profile: {
          prenom?: string;
          nom?: string;
          gender: "homme" | "femme";
          dob?: string;
        };
        pdfBase64?: string;
        pdfName?: string;
        sessionId?: string;
      };

      const recipientEmail = email || userId;

      if (!recipientEmail || !profile) {
        res.status(400).json({ error: "Missing required fields" });
        return;
      }

      const requirePayment = process.env.BLOOD_ANALYSIS_REQUIRE_PAYMENT === "true";
      if (requirePayment) {
        if (!sessionId) {
          res.status(400).json({ error: "Paiement requis" });
          return;
        }

        const stripe = await getUncachableStripeClient();
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        const paid = session.payment_status === "paid" || session.status === "complete";
        if (!paid || session.metadata?.planType !== "BLOOD_ANALYSIS") {
          res.status(403).json({ error: "Paiement invalide" });
          return;
        }
      }

      console.log(`[BloodAnalysis] Processing submission for ${recipientEmail}`);

      let resolvedMarkers = markers;
      if ((!resolvedMarkers || resolvedMarkers.length === 0) && pdfBase64) {
        try {
          const pdfBuffer = Buffer.from(pdfBase64, "base64");
          const parsed = await pdf(pdfBuffer);
          const extractedMarkers = await extractMarkersFromPdfText(parsed.text || "", pdfName || "bilan.pdf");
          resolvedMarkers = extractedMarkers;
        } catch (parseError) {
          console.error("[BloodAnalysis] PDF parse error:", parseError);
          res.status(400).json({ error: "PDF illisible. Reessaie avec un export labo standard." });
          return;
        }
      }

      if (!resolvedMarkers || resolvedMarkers.length === 0) {
        res.status(400).json({ error: "Aucun biomarqueur detecte" });
        return;
      }

      let computedAge: string | undefined;
      if (profile.dob) {
        const dobDate = new Date(profile.dob);
        if (!Number.isNaN(dobDate.getTime())) {
          const ageYears = Math.floor((Date.now() - dobDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
          computedAge = String(ageYears);
        }
      }

      // Run analysis
      const analysisResult = await analyzeBloodwork(resolvedMarkers, {
        gender: profile.gender,
        age: computedAge,
        objectives: undefined,
        medications: undefined,
      });

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

      const reportRecord = await storage.createBloodReport({
        email: recipientEmail,
        profile: {
          ...profile,
          age: computedAge,
        },
        markers: resolvedMarkers,
        analysis: analysisResult,
        aiReport: aiAnalysis,
      });

      const baseUrl = getBaseUrl();
      const emailSent = await sendReportReadyEmail(recipientEmail, reportRecord.id, "BLOOD_ANALYSIS", baseUrl);
      if (emailSent) {
        await sendAdminEmailNewAudit(recipientEmail, recipientEmail.split("@")[0], "BLOOD_ANALYSIS", reportRecord.id);
      }

      res.json({
        success: true,
        reportId: reportRecord.id,
        analysis: analysisResult,
        aiReport: aiAnalysis
      });
    } catch (error) {
      console.error("[BloodAnalysis] Submit error:", error);
      res.status(500).json({ error: "Erreur lors de l'analyse" });
    }
  });

  /**
   * GET /api/blood-analysis/report/:id
   * Fetch stored blood analysis report
   */
  app.get("/api/blood-analysis/report/:id", async (req, res) => {
    try {
      const report = await storage.getBloodReport(req.params.id);
      if (!report) {
        res.status(404).json({ error: "Rapport introuvable" });
        return;
      }
      res.json({ success: true, report });
    } catch (error) {
      console.error("[BloodAnalysis] Report fetch error:", error);
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  // ============================================
  // RISK ASSESSMENT ROUTES
  // ============================================

  /**
   * POST /api/blood-analysis/risk-profile
   * Generate comprehensive risk profile from blood markers
   */
  app.post("/api/blood-analysis/risk-profile", async (req, res) => {
    try {
      const { markers, profile } = req.body as {
        markers: BloodMarkerInput[];
        profile: {
          gender: "homme" | "femme";
          age?: string;
          bmi?: number;
          waistCircumference?: number;
          bloodPressure?: { systolic: number; diastolic: number };
          smoker?: boolean;
          hypertension?: boolean;
          familyHistory?: boolean;
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

      console.log(`[BloodAnalysis] Generating risk profile for ${profile.gender}, ${markers.length} markers`);

      const riskProfile = generateComprehensiveRiskProfile(markers, profile);

      res.json({
        success: true,
        riskProfile,
        summary: {
          overallScore: riskProfile.overallHealth.score,
          overallLevel: riskProfile.overallHealth.level,
          criticalAreas: Object.entries(riskProfile)
            .filter(([key, value]) => key !== 'timestamp' && (value as RiskScore).score < 50)
            .map(([key, value]) => ({ area: key, score: (value as RiskScore).score })),
          recommendations: riskProfile.overallHealth.recommendations
        }
      });
    } catch (error) {
      console.error("[BloodAnalysis] Risk profile error:", error);
      res.status(500).json({ error: "Erreur lors du calcul des risques" });
    }
  });

  /**
   * POST /api/blood-analysis/prediabetes-risk
   * Calculate pre-diabetes risk score only
   */
  app.post("/api/blood-analysis/prediabetes-risk", async (req, res) => {
    try {
      const { markers, profile } = req.body as {
        markers: BloodMarkerInput[];
        profile: {
          gender: "homme" | "femme";
          age?: string;
          bmi?: number;
        };
      };

      if (!markers || markers.length === 0) {
        res.status(400).json({ error: "Marqueurs requis" });
        return;
      }

      const riskScore = calculatePrediabetesRisk(markers, profile || { gender: "homme" });

      res.json({
        success: true,
        risk: riskScore,
        alert: riskScore.score < 50 ? "RISQUE PRÉ-DIABÈTE DÉTECTÉ" : null
      });
    } catch (error) {
      console.error("[BloodAnalysis] Prediabetes risk error:", error);
      res.status(500).json({ error: "Erreur" });
    }
  });

  /**
   * POST /api/blood-analysis/insulin-resistance
   * Calculate insulin resistance index
   */
  app.post("/api/blood-analysis/insulin-resistance", async (req, res) => {
    try {
      const { markers } = req.body as { markers: BloodMarkerInput[] };

      if (!markers || markers.length === 0) {
        res.status(400).json({ error: "Marqueurs requis" });
        return;
      }

      const riskScore = calculateInsulinResistanceIndex(markers);

      res.json({
        success: true,
        risk: riskScore
      });
    } catch (error) {
      console.error("[BloodAnalysis] Insulin resistance error:", error);
      res.status(500).json({ error: "Erreur" });
    }
  });

  /**
   * POST /api/blood-analysis/cardiovascular-risk
   * Calculate cardiovascular risk score
   */
  app.post("/api/blood-analysis/cardiovascular-risk", async (req, res) => {
    try {
      const { markers, profile } = req.body as {
        markers: BloodMarkerInput[];
        profile: {
          gender: "homme" | "femme";
          age?: string;
          smoker?: boolean;
          hypertension?: boolean;
          familyHistory?: boolean;
        };
      };

      if (!markers || markers.length === 0) {
        res.status(400).json({ error: "Marqueurs requis" });
        return;
      }

      const riskScore = calculateCardiovascularRisk(markers, profile || { gender: "homme" });

      res.json({
        success: true,
        risk: riskScore
      });
    } catch (error) {
      console.error("[BloodAnalysis] CV risk error:", error);
      res.status(500).json({ error: "Erreur" });
    }
  });

  /**
   * POST /api/blood-analysis/metabolic-syndrome
   * Detect metabolic syndrome (ATP III criteria)
   */
  app.post("/api/blood-analysis/metabolic-syndrome", async (req, res) => {
    try {
      const { markers, profile } = req.body as {
        markers: BloodMarkerInput[];
        profile: {
          gender: "homme" | "femme";
          waistCircumference?: number;
          bloodPressure?: { systolic: number; diastolic: number };
        };
      };

      if (!markers || markers.length === 0) {
        res.status(400).json({ error: "Marqueurs requis" });
        return;
      }

      const riskScore = detectMetabolicSyndrome(markers, profile || { gender: "homme" });

      res.json({
        success: true,
        risk: riskScore,
        hasMetabolicSyndrome: riskScore.score < 40
      });
    } catch (error) {
      console.error("[BloodAnalysis] Metabolic syndrome error:", error);
      res.status(500).json({ error: "Erreur" });
    }
  });

  /**
   * POST /api/blood-analysis/thyroid-health
   * Calculate thyroid function score
   */
  app.post("/api/blood-analysis/thyroid-health", async (req, res) => {
    try {
      const { markers } = req.body as { markers: BloodMarkerInput[] };

      if (!markers || markers.length === 0) {
        res.status(400).json({ error: "Marqueurs requis" });
        return;
      }

      const riskScore = calculateThyroidScore(markers);

      res.json({
        success: true,
        risk: riskScore
      });
    } catch (error) {
      console.error("[BloodAnalysis] Thyroid health error:", error);
      res.status(500).json({ error: "Erreur" });
    }
  });

  /**
   * POST /api/blood-analysis/inflammation-index
   * Calculate inflammation index
   */
  app.post("/api/blood-analysis/inflammation-index", async (req, res) => {
    try {
      const { markers } = req.body as { markers: BloodMarkerInput[] };

      if (!markers || markers.length === 0) {
        res.status(400).json({ error: "Marqueurs requis" });
        return;
      }

      const riskScore = calculateInflammationIndex(markers);

      res.json({
        success: true,
        risk: riskScore
      });
    } catch (error) {
      console.error("[BloodAnalysis] Inflammation error:", error);
      res.status(500).json({ error: "Erreur" });
    }
  });

  /**
   * POST /api/blood-analysis/hormonal-health
   * Calculate hormonal health score
   */
  app.post("/api/blood-analysis/hormonal-health", async (req, res) => {
    try {
      const { markers, profile } = req.body as {
        markers: BloodMarkerInput[];
        profile: {
          gender: "homme" | "femme";
          age?: string;
        };
      };

      if (!markers || markers.length === 0) {
        res.status(400).json({ error: "Marqueurs requis" });
        return;
      }

      const riskScore = calculateHormonalHealthScore(markers, profile || { gender: "homme" });

      res.json({
        success: true,
        risk: riskScore
      });
    } catch (error) {
      console.error("[BloodAnalysis] Hormonal health error:", error);
      res.status(500).json({ error: "Erreur" });
    }
  });

  /**
   * POST /api/blood-analysis/anemia-risk
   * Calculate anemia risk score
   */
  app.post("/api/blood-analysis/anemia-risk", async (req, res) => {
    try {
      const { markers, profile } = req.body as {
        markers: BloodMarkerInput[];
        profile: { gender: "homme" | "femme" };
      };

      if (!markers || markers.length === 0) {
        res.status(400).json({ error: "Marqueurs requis" });
        return;
      }

      const riskScore = calculateAnemiaRiskScore(markers, profile || { gender: "homme" });

      res.json({
        success: true,
        risk: riskScore
      });
    } catch (error) {
      console.error("[BloodAnalysis] Anemia risk error:", error);
      res.status(500).json({ error: "Erreur" });
    }
  });

  /**
   * POST /api/blood-analysis/liver-health
   * Calculate liver health score
   */
  app.post("/api/blood-analysis/liver-health", async (req, res) => {
    try {
      const { markers } = req.body as { markers: BloodMarkerInput[] };

      if (!markers || markers.length === 0) {
        res.status(400).json({ error: "Marqueurs requis" });
        return;
      }

      const riskScore = calculateLiverHealthScore(markers);

      res.json({
        success: true,
        risk: riskScore
      });
    } catch (error) {
      console.error("[BloodAnalysis] Liver health error:", error);
      res.status(500).json({ error: "Erreur" });
    }
  });

  /**
   * POST /api/blood-analysis/kidney-function
   * Calculate kidney function score
   */
  app.post("/api/blood-analysis/kidney-function", async (req, res) => {
    try {
      const { markers, profile } = req.body as {
        markers: BloodMarkerInput[];
        profile: { age?: string };
      };

      if (!markers || markers.length === 0) {
        res.status(400).json({ error: "Marqueurs requis" });
        return;
      }

      const riskScore = calculateKidneyFunctionScore(markers, profile || {});

      res.json({
        success: true,
        risk: riskScore
      });
    } catch (error) {
      console.error("[BloodAnalysis] Kidney function error:", error);
      res.status(500).json({ error: "Erreur" });
    }
  });

  /**
   * GET /api/blood-analysis/extended-biomarkers
   * Get all biomarker ranges including extended panel
   */
  app.get("/api/blood-analysis/extended-biomarkers", async (req, res) => {
    try {
      res.json({
        success: true,
        standardBiomarkers: BIOMARKER_RANGES,
        extendedBiomarkers: EXTENDED_BIOMARKER_RANGES,
        totalCount: Object.keys(BIOMARKER_RANGES).length + Object.keys(EXTENDED_BIOMARKER_RANGES).length
      });
    } catch (error) {
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  /**
   * POST /api/blood-analysis/full-analysis
   * Complete analysis with all risk scores + AI report
   */
  app.post("/api/blood-analysis/full-analysis", async (req, res) => {
    try {
      const { markers, profile, pdfBase64, pdfName } = req.body as {
        markers?: BloodMarkerInput[];
        profile: {
          prenom?: string;
          nom?: string;
          email?: string;
          gender: "homme" | "femme";
          age?: string;
          dob?: string;
          bmi?: number;
          waistCircumference?: number;
          bloodPressure?: { systolic: number; diastolic: number };
          smoker?: boolean;
          hypertension?: boolean;
          familyHistory?: boolean;
        };
        pdfBase64?: string;
        pdfName?: string;
      };

      if (!profile || !profile.gender) {
        res.status(400).json({ error: "Profil invalide" });
        return;
      }

      // Extract markers from PDF if provided
      let resolvedMarkers = markers || [];
      let extractedPatient = {};
      
      if ((!resolvedMarkers || resolvedMarkers.length === 0) && pdfBase64) {
        try {
          const pdfBuffer = Buffer.from(pdfBase64, "base64");
          const parsed = await pdf(pdfBuffer);
          resolvedMarkers = await extractMarkersFromPdfText(parsed.text || "", pdfName || "bilan.pdf");
          extractedPatient = extractPatientInfoFromPdfText(parsed.text || "");
        } catch (parseError) {
          console.error("[BloodAnalysis] PDF parse error:", parseError);
          res.status(400).json({ error: "PDF illisible" });
          return;
        }
      }

      if (!resolvedMarkers || resolvedMarkers.length === 0) {
        res.status(400).json({ error: "Aucun biomarqueur détecté" });
        return;
      }

      // Calculate age from DOB if provided
      let computedAge = profile.age;
      if (!computedAge && profile.dob) {
        const dobDate = new Date(profile.dob);
        if (!Number.isNaN(dobDate.getTime())) {
          computedAge = String(Math.floor((Date.now() - dobDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000)));
        }
      }

      const profileWithAge = { ...profile, age: computedAge };

      console.log(`[BloodAnalysis] Full analysis: ${resolvedMarkers.length} markers, ${profile.gender}, age ${computedAge || 'unknown'}`);

      // 1. Basic analysis
      const basicAnalysis = await analyzeBloodwork(resolvedMarkers, {
        gender: profile.gender,
        age: computedAge,
        objectives: undefined,
        medications: undefined
      });

      // 2. Comprehensive risk profile
      const riskProfile = generateComprehensiveRiskProfile(resolvedMarkers, profileWithAge);

      // 3. AI-powered narrative report
      const knowledgeContext = await getBloodworkKnowledgeContext(
        basicAnalysis.markers,
        basicAnalysis.patterns
      );

      let aiReport: string;
      try {
        aiReport = await generateAIBloodAnalysis(
          basicAnalysis,
          profileWithAge,
          knowledgeContext
        );
      } catch (aiError) {
        console.error("[BloodAnalysis] AI generation failed, using fallback:", aiError);
        aiReport = buildFallbackAnalysis(basicAnalysis, profileWithAge);
      }

      res.json({
        success: true,
        extractedPatient,
        markersFound: resolvedMarkers.length,
        markers: resolvedMarkers,
        basicAnalysis: {
          summary: basicAnalysis.summary,
          patterns: basicAnalysis.patterns,
          markerDetails: basicAnalysis.markers
        },
        riskProfile,
        aiReport,
        priorityActions: [
          ...riskProfile.overallHealth.recommendations,
          ...riskProfile.prediabetes.recommendations.slice(0, 2),
          ...riskProfile.cardiovascular.recommendations.slice(0, 2)
        ].slice(0, 8)
      });
    } catch (error) {
      console.error("[BloodAnalysis] Full analysis error:", error);
      res.status(500).json({ error: "Erreur lors de l'analyse complète" });
    }
  });

  // ============================================
  // COMPREHENSIVE REPORT ROUTES
  // ============================================

  /**
   * POST /api/blood-analysis/comprehensive-report
   * Generate the full comprehensive blood analysis report
   * Includes: radar chart, risk scores, supplements, protocols, action plan
   */
  app.post("/api/blood-analysis/comprehensive-report", async (req, res) => {
    try {
      const { markers, profile, pdfBase64, pdfName } = req.body as {
        markers?: BloodMarkerInput[];
        profile: {
          prenom?: string;
          nom?: string;
          email?: string;
          gender: "homme" | "femme";
          age?: string;
          dob?: string;
          bmi?: number;
          waistCircumference?: number;
          bloodPressure?: { systolic: number; diastolic: number };
          smoker?: boolean;
          hypertension?: boolean;
          familyHistory?: boolean;
        };
        pdfBase64?: string;
        pdfName?: string;
      };

      if (!profile || !profile.gender) {
        res.status(400).json({ error: "Profil invalide (gender requis)" });
        return;
      }

      // Extract markers from PDF if provided
      let resolvedMarkers = markers || [];
      let extractedPatient = {};

      if ((!resolvedMarkers || resolvedMarkers.length === 0) && pdfBase64) {
        try {
          const pdfBuffer = Buffer.from(pdfBase64, "base64");
          const parsed = await pdf(pdfBuffer);
          resolvedMarkers = await extractMarkersFromPdfText(parsed.text || "", pdfName || "bilan.pdf");
          extractedPatient = extractPatientInfoFromPdfText(parsed.text || "");
        } catch (parseError) {
          console.error("[BloodAnalysis] PDF parse error:", parseError);
          res.status(400).json({ error: "PDF illisible" });
          return;
        }
      }

      if (!resolvedMarkers || resolvedMarkers.length === 0) {
        res.status(400).json({ error: "Aucun biomarqueur détecté" });
        return;
      }

      // Calculate age from DOB if provided
      let computedAge = profile.age;
      if (!computedAge && profile.dob) {
        const dobDate = new Date(profile.dob);
        if (!Number.isNaN(dobDate.getTime())) {
          computedAge = String(Math.floor((Date.now() - dobDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000)));
        }
      }

      const profileWithAge = { ...profile, age: computedAge };
      const patientName = profile.prenom ? `${profile.prenom} ${profile.nom || ""}`.trim() : undefined;

      console.log(`[BloodAnalysis] Comprehensive report: ${resolvedMarkers.length} markers for ${patientName || 'anonymous'}`);

      // 1. Basic analysis
      const basicAnalysis = await analyzeBloodwork(resolvedMarkers, {
        gender: profile.gender,
        age: computedAge,
        objectives: undefined,
        medications: undefined
      });

      // 2. Risk profile
      const riskProfile = generateComprehensiveRiskProfile(resolvedMarkers, profileWithAge);

      // 3. Generate comprehensive report with recommendations
      const comprehensiveReport = await generateComprehensiveBloodReport(
        resolvedMarkers,
        basicAnalysis,
        riskProfile,
        patientName
      );

      // 4. AI narrative report
      const knowledgeContext = await getBloodworkKnowledgeContext(
        basicAnalysis.markers,
        basicAnalysis.patterns
      );

      let aiReport: string;
      try {
        aiReport = await generateAIBloodAnalysis(
          basicAnalysis,
          profileWithAge,
          knowledgeContext
        );
      } catch (aiError) {
        console.error("[BloodAnalysis] AI generation failed, using fallback:", aiError);
        aiReport = buildFallbackAnalysis(basicAnalysis, profileWithAge);
      }

      res.json({
        success: true,
        extractedPatient,
        markersFound: resolvedMarkers.length,
        report: comprehensiveReport,
        aiNarrative: aiReport,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error("[BloodAnalysis] Comprehensive report error:", error);
      res.status(500).json({ error: "Erreur lors de la génération du rapport" });
    }
  });

  /**
   * POST /api/blood-analysis/supplements
   * Get supplement recommendations only
   */
  app.post("/api/blood-analysis/supplements", async (req, res) => {
    try {
      const { markers, profile } = req.body as {
        markers: BloodMarkerInput[];
        profile: {
          gender: "homme" | "femme";
          age?: string;
        };
      };

      if (!markers || markers.length === 0) {
        res.status(400).json({ error: "Marqueurs requis" });
        return;
      }

      const basicAnalysis = await analyzeBloodwork(markers, {
        gender: profile?.gender || "homme",
        age: profile?.age
      });

      const riskProfile = generateComprehensiveRiskProfile(markers, profile || { gender: "homme" });
      const supplements = generateSupplementRecommendations(basicAnalysis.markers, riskProfile);

      res.json({
        success: true,
        supplements,
        priority1Count: supplements.filter(s => s.priority === 1).length,
        priority2Count: supplements.filter(s => s.priority === 2).length,
        priority3Count: supplements.filter(s => s.priority === 3).length
      });
    } catch (error) {
      console.error("[BloodAnalysis] Supplements error:", error);
      res.status(500).json({ error: "Erreur" });
    }
  });

  /**
   * POST /api/blood-analysis/protocols
   * Get protocol recommendations only
   */
  app.post("/api/blood-analysis/protocols", async (req, res) => {
    try {
      const { markers, profile } = req.body as {
        markers: BloodMarkerInput[];
        profile: {
          gender: "homme" | "femme";
          age?: string;
        };
      };

      if (!markers || markers.length === 0) {
        res.status(400).json({ error: "Marqueurs requis" });
        return;
      }

      const riskProfile = generateComprehensiveRiskProfile(markers, profile || { gender: "homme" });
      const protocols = generateProtocolRecommendations(riskProfile);

      res.json({
        success: true,
        protocols,
        categories: [...new Set(protocols.map(p => p.category))]
      });
    } catch (error) {
      console.error("[BloodAnalysis] Protocols error:", error);
      res.status(500).json({ error: "Erreur" });
    }
  });

  /**
   * POST /api/blood-analysis/radar-chart
   * Get radar chart data only
   */
  app.post("/api/blood-analysis/radar-chart", async (req, res) => {
    try {
      const { markers, profile } = req.body as {
        markers: BloodMarkerInput[];
        profile: {
          gender: "homme" | "femme";
          age?: string;
        };
      };

      if (!markers || markers.length === 0) {
        res.status(400).json({ error: "Marqueurs requis" });
        return;
      }

      const basicAnalysis = await analyzeBloodwork(markers, {
        gender: profile?.gender || "homme",
        age: profile?.age
      });

      const riskProfile = generateComprehensiveRiskProfile(markers, profile || { gender: "homme" });
      const radarChart = generateBloodRadarChart(basicAnalysis.markers, riskProfile);

      res.json({
        success: true,
        radarChart
      });
    } catch (error) {
      console.error("[BloodAnalysis] Radar chart error:", error);
      res.status(500).json({ error: "Erreur" });
    }
  });

  /**
   * POST /api/blood-analysis/action-plan
   * Get action plan only
   */
  app.post("/api/blood-analysis/action-plan", async (req, res) => {
    try {
      const { markers, profile } = req.body as {
        markers: BloodMarkerInput[];
        profile: {
          gender: "homme" | "femme";
          age?: string;
        };
      };

      if (!markers || markers.length === 0) {
        res.status(400).json({ error: "Marqueurs requis" });
        return;
      }

      const basicAnalysis = await analyzeBloodwork(markers, {
        gender: profile?.gender || "homme",
        age: profile?.age
      });

      const riskProfile = generateComprehensiveRiskProfile(markers, profile || { gender: "homme" });
      const supplements = generateSupplementRecommendations(basicAnalysis.markers, riskProfile);
      const protocols = generateProtocolRecommendations(riskProfile);
      const actionPlan = generateActionPlan(riskProfile, supplements, protocols);

      res.json({
        success: true,
        actionPlan
      });
    } catch (error) {
      console.error("[BloodAnalysis] Action plan error:", error);
      res.status(500).json({ error: "Erreur" });
    }
  });

  /**
   * GET /api/blood-analysis/knowledge/:markerId
   * Get knowledge base articles for a specific marker
   */
  app.get("/api/blood-analysis/knowledge/:markerId", async (req, res) => {
    try {
      const { markerId } = req.params;
      const articles = await searchKnowledgeForMarker(markerId, 5);

      res.json({
        success: true,
        markerId,
        articleCount: articles.length,
        articles: articles.map(a => ({
          title: a.title,
          source: a.source,
          category: a.category,
          excerpt: a.content.substring(0, 500) + "..."
        }))
      });
    } catch (error) {
      console.error("[BloodAnalysis] Knowledge search error:", error);
      res.status(500).json({ error: "Erreur" });
    }
  });

  /**
   * GET /api/blood-analysis/knowledge-risk/:riskType
   * Get knowledge base articles for a risk type
   */
  app.get("/api/blood-analysis/knowledge-risk/:riskType", async (req, res) => {
    try {
      const { riskType } = req.params;
      const articles = await searchKnowledgeForRisk(riskType, 5);

      res.json({
        success: true,
        riskType,
        articleCount: articles.length,
        articles: articles.map(a => ({
          title: a.title,
          source: a.source,
          category: a.category,
          excerpt: a.content.substring(0, 500) + "..."
        }))
      });
    } catch (error) {
      console.error("[BloodAnalysis] Knowledge risk search error:", error);
      res.status(500).json({ error: "Erreur" });
    }
  });

  console.log("[BloodAnalysis] Routes registered (comprehensive with recommendations engine)");
}
