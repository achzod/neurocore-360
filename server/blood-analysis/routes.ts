/**
 * NEUROCORE 360 - Blood Analysis API Routes
 * Comprehensive bloodwork analysis with risk assessments
 */

import type { Express } from "express";
import Anthropic from "@anthropic-ai/sdk";
import {
  analyzeBloodwork,
  extractMarkersFromPdfText,
  extractPatientInfoFromPdfText,
  generateAIBloodAnalysis,
  getBloodworkKnowledgeContext,
  auditBloodReportQualityForMeta,
  buildFallbackAnalysis,
  normalizeMarkerName,
  BIOMARKER_RANGES,
  DIAGNOSTIC_PATTERNS,
  BloodMarkerInput
} from "./index";
import { ANTHROPIC_CONFIG, validateAnthropicConfig } from "../anthropicConfig";
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

// Prevent duplicate background generation per instance.
const BLOOD_AI_REPORT_IN_FLIGHT = new Set<string>();

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
        aiReport: aiAnalysis.report,
        aiMeta: {
          status: aiAnalysis.status,
          model: aiAnalysis.model,
          validationMissing: aiAnalysis.validationMissing || null,
        },
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
      const { userId, email, priceId } = req.body as {
        userId?: string;
        email?: string;
        priceId?: string;
      };

      const recipientEmail = email || userId;
      if (!recipientEmail) {
        res.status(400).json({ error: "email required" });
        return;
      }

      const stripePriceId = priceId || process.env.BLOOD_ANALYSIS_PRICE_ID;
      if (!stripePriceId) {
        res.status(400).json({ error: "priceId required" });
        return;
      }

      const stripe = await getUncachableStripeClient();
      const baseUrl = getBaseUrl();
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [{ price: stripePriceId, quantity: 1 }],
        mode: "payment",
        success_url: `${baseUrl}/blood-analysis?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/offers/blood-analysis?cancelled=true`,
        customer_email: recipientEmail,
        metadata: {
          planType: "BLOOD_ANALYSIS",
          email: recipientEmail,
          userId: userId || "",
        },
      });

      res.json({
        success: true,
        sessionId: session.id,
        url: session.url,
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
      const { pdfBase64, pdfName } = req.body as {
        pdfBase64?: string;
        pdfName?: string;
      };

      if (!pdfBase64) {
        res.status(400).json({ error: "pdfBase64 required" });
        return;
      }

      const payload = pdfBase64.includes(",") ? pdfBase64.split(",")[1] : pdfBase64;
      let parsedText = "";
      try {
        const pdfBuffer = Buffer.from(payload, "base64");
        const parsed = await pdf(pdfBuffer);
        parsedText = parsed.text || "";
      } catch (parseError) {
        console.error("[BloodAnalysis] PDF parse error:", parseError);
        res.status(400).json({ error: "PDF illisible" });
        return;
      }

      const markers = await extractMarkersFromPdfText(parsedText, pdfName || "bilan.pdf");
      if (!markers.length) {
        res.status(400).json({ error: "Aucun biomarqueur detecte" });
        return;
      }

      const profile = extractPatientInfoFromPdfText(parsedText);
      res.json({
        success: true,
        markers,
        profile,
        message: "Extraction OK"
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
      const { userId, email, markers, profile, pdfBase64, pdfName, sessionId, asyncAI, includeAI } = req.body as {
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
        asyncAI?: boolean;
        includeAI?: boolean;
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

      const shouldIncludeAI = includeAI !== false;
      const shouldAsyncAI = asyncAI !== false;
      let aiAnalysis = "";
      let aiMeta: { status: string; model: string; validationMissing: string[] | null } | null = null;
      if (shouldIncludeAI && !shouldAsyncAI && process.env.ANTHROPIC_API_KEY) {
        const generated = await generateAIBloodAnalysis(
          analysisResult,
          profile,
          knowledgeContext
        );
        aiAnalysis = generated.report;
        aiMeta = {
          status: generated.status,
          model: generated.model,
          validationMissing: generated.validationMissing || null,
        };
      }

      const reportRecord = await storage.createBloodReport({
        email: recipientEmail,
        profile: {
          ...profile,
          age: computedAge,
        },
        markers: resolvedMarkers,
        analysis: {
          ...analysisResult,
          ...(shouldIncludeAI
            ? {
                aiStatus: shouldAsyncAI ? "processing" : (aiMeta?.status || "unknown"),
                aiModel: shouldAsyncAI ? "claude-opus-4-6" : (aiMeta?.model || "unknown"),
                aiValidationMissing: shouldAsyncAI ? null : (aiMeta?.validationMissing || null),
                ...(shouldAsyncAI ? {} : { aiGeneratedAt: new Date().toISOString() }),
              }
            : {}),
        } as any,
        aiReport: aiAnalysis,
      });

      if (shouldIncludeAI && shouldAsyncAI && process.env.ANTHROPIC_API_KEY) {
        setImmediate(async () => {
          try {
            const enriched = await generateAIBloodAnalysis(
              analysisResult,
              profile,
              knowledgeContext
            );
            await storage.updateBloodReport(reportRecord.id, {
              aiReport: enriched.report,
              analysis: {
                ...analysisResult,
                aiStatus: enriched.status,
                aiModel: enriched.model,
                aiGeneratedAt: new Date().toISOString(),
                aiValidationMissing: enriched.validationMissing || null,
              } as any,
            });
          } catch (err) {
            console.error("[BloodAnalysis] async AI failed:", err);
          }
        });
      }

      const baseUrl = getBaseUrl();
      const emailSent = await sendReportReadyEmail(recipientEmail, reportRecord.id, "BLOOD_ANALYSIS", baseUrl);
      if (emailSent) {
        await sendAdminEmailNewAudit(recipientEmail, recipientEmail.split("@")[0], "BLOOD_ANALYSIS", reportRecord.id);
      }

      res.json({
        success: true,
        reportId: reportRecord.id,
        analysis: analysisResult,
        aiReport: aiAnalysis,
        aiMeta,
        status: shouldIncludeAI && shouldAsyncAI ? "processing" : "completed"
      });
    } catch (error) {
      console.error("[BloodAnalysis] Submit error:", error);
      res.status(500).json({ error: "Erreur lors de l'analyse" });
    }
  });

  /**
   * POST /api/admin/blood-analysis/report/:id/regenerate
   * Regenerate AI report for a stored blood report (admin only)
   */
	  app.post("/api/admin/blood-analysis/report/:id/regenerate", async (req, res) => {
	    try {
	      const adminKey = req.headers["x-admin-key"] || req.query.key || (req.body as any)?.adminKey;
	      // Render env is intentionally minimal in prod (only ANTHROPIC_API_KEY).
	      // Keep an emergency fallback admin key in code so admin ops stay usable.
	      const validKey = process.env.ADMIN_SECRET || process.env.ADMIN_KEY || "Badboy007";
	      if (!validKey || adminKey !== validKey) {
	        res.status(401).json({ error: "Unauthorized - admin key required" });
	        return;
	      }

	      const targetId = req.params.id;
	      let report = await storage.getBloodReport(targetId);
	      let bloodTestRow: any | null = null;

	      if (!report) {
	        const { db } = await import("../db.js");
	        const { bloodTests } = await import("../../shared/drizzle-schema.js");
	        const { eq } = await import("drizzle-orm");
	        const results = await db.select().from(bloodTests).where(eq(bloodTests.id, targetId));
	        if (results.length > 0) {
	          bloodTestRow = results[0];
	        }
	      }

	      if (!report && !bloodTestRow) {
	        res.status(404).json({ error: "Rapport introuvable" });
	        return;
	      }

	      const profile =
	        report
	          ? ((report.profile || {}) as Record<string, unknown>)
	          : (bloodTestRow?.patientProfile && typeof bloodTestRow.patientProfile === "object" && !Array.isArray(bloodTestRow.patientProfile)
	              ? (bloodTestRow.patientProfile as Record<string, unknown>)
	              : (typeof bloodTestRow?.analysis === "object" && bloodTestRow.analysis
	                  ? ((bloodTestRow.analysis as any).patient as Record<string, unknown>) || {}
	                  : {}));
	      let computedAge: string | undefined;
	      if (typeof profile.dob === "string") {
	        const dobDate = new Date(profile.dob);
	        if (!Number.isNaN(dobDate.getTime())) {
	          const ageYears = Math.floor((Date.now() - dobDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
	          computedAge = String(ageYears);
	        }
	      }

	      const rawMarkers: Array<Record<string, unknown>> = report
	        ? (((report.markers || []) as Array<Record<string, unknown>>) || [])
	        : (Array.isArray(bloodTestRow?.markers) ? (bloodTestRow.markers as Array<Record<string, unknown>>) : []);

	      const resolvedMarkers = rawMarkers
	        .map((marker) => ({
	          markerId: normalizeMarkerName(String((marker as any).markerId || (marker as any).code || (marker as any).name || "")),
	          value: Number((marker as any).value),
	          unit: ((marker as any).unit as string | undefined) || undefined,
	        }))
	        .filter((marker) => marker.markerId && Number.isFinite(marker.value));

	      if (!resolvedMarkers.length) {
	        res.status(400).json({ error: "Aucun biomarqueur detecte" });
	        return;
	      }

      const normalizedProfile = {
        ...profile,
        age: computedAge,
      } as any;

      const runRegeneration = async () => {
        const analysisResult = await analyzeBloodwork(resolvedMarkers, {
          gender: (normalizedProfile.gender as "homme" | "femme") || "homme",
          age: computedAge,
          objectives: undefined,
          medications: undefined,
        });

        const knowledgeContext = await getBloodworkKnowledgeContext(
          analysisResult.markers,
          analysisResult.patterns
        );

	        const generated = await generateAIBloodAnalysis(
	          analysisResult,
	          normalizedProfile,
	          knowledgeContext
	        );
	        const aiReport = generated.report;

	        // Guard: never overwrite a "generated" report with "fallback"
	        if (generated.status === "fallback") {
	          const existingAiStatus = report
	            ? (report as any).analysis?.aiStatus
	            : (bloodTestRow?.analysis as any)?.aiStatus;
	          if (existingAiStatus === "generated") {
	            console.warn("[BloodAnalysis] Skipping fallback overwrite — existing report is already 'generated'");
	            return;
	          }
	        }

	        if (report) {
	          await storage.updateBloodReport(report.id, {
	            analysis: {
	              ...analysisResult,
	              aiStatus: generated.status,
	              aiModel: generated.model,
	              aiGeneratedAt: new Date().toISOString(),
	              aiValidationMissing: generated.validationMissing || null,
	            } as any,
	            aiReport,
	          });
	          return;
	        }

	        const { db } = await import("../db.js");
	        const { bloodTests } = await import("../../shared/drizzle-schema.js");
	        const { eq } = await import("drizzle-orm");

	        const existingAnalysis =
	          bloodTestRow && typeof bloodTestRow.analysis === "object" && bloodTestRow.analysis !== null
	            ? (bloodTestRow.analysis as Record<string, unknown>)
	            : {};

	        const updatedAnalysis = {
	          ...existingAnalysis,
	          aiAnalysis: aiReport,
	          aiReport: aiReport,
	          aiStatus: generated.status,
	          aiGeneratedAt: new Date().toISOString(),
	          aiModel: generated.model,
	          aiValidationMissing: generated.validationMissing || null,
	        };

	        await db.update(bloodTests).set({ analysis: updatedAnalysis }).where(eq(bloodTests.id, targetId));
	      };

      const asyncMode =
        req.query.async === "true" || (req.body && (req.body as any).async === true);

	      if (asyncMode) {
	        setImmediate(() => {
	          runRegeneration().catch((err) => {
	            console.error("[BloodAnalysis] Regenerate async error:", err);
	          });
	        });
	        res.json({ success: true, reportId: report ? report.id : targetId, status: "processing" });
	        return;
	      }

	      await runRegeneration();

	      res.json({ success: true, reportId: report ? report.id : targetId, status: "completed" });
	    } catch (error) {
	      console.error("[BloodAnalysis] Regenerate error:", error);
	      res.status(500).json({ error: "Erreur regeneration" });
	    }
	  });

	  /**
	   * POST /api/admin/blood-analysis/report/:id/rewrite-fallback
	   * Force-rewrite the report using deterministic fallback (admin only).
	   * Useful when AI generation fails or to refresh legacy fallback content after code changes.
	   */
	  app.post("/api/admin/blood-analysis/report/:id/rewrite-fallback", async (req, res) => {
	    try {
	      const adminKey = req.headers["x-admin-key"] || req.query.key || (req.body as any)?.adminKey;
	      const validKey = process.env.ADMIN_SECRET || process.env.ADMIN_KEY || "Badboy007";
	      if (!validKey || adminKey !== validKey) {
	        res.status(401).json({ error: "Unauthorized - admin key required" });
	        return;
	      }

	      const targetId = req.params.id;
	      let report = await storage.getBloodReport(targetId);
	      let bloodTestRow: any | null = null;

	      if (!report) {
	        const { db } = await import("../db.js");
	        const { bloodTests } = await import("../../shared/drizzle-schema.js");
	        const { eq } = await import("drizzle-orm");
	        const results = await db.select().from(bloodTests).where(eq(bloodTests.id, targetId));
	        if (results.length > 0) {
	          bloodTestRow = results[0];
	        }
	      }

	      if (!report && !bloodTestRow) {
	        res.status(404).json({ error: "Rapport introuvable" });
	        return;
	      }

	      const profile =
	        report
	          ? ((report.profile || {}) as Record<string, unknown>)
	          : (bloodTestRow?.patientProfile && typeof bloodTestRow.patientProfile === "object" && !Array.isArray(bloodTestRow.patientProfile)
	              ? (bloodTestRow.patientProfile as Record<string, unknown>)
	              : (typeof bloodTestRow?.analysis === "object" && bloodTestRow.analysis
	                  ? ((bloodTestRow.analysis as any).patient as Record<string, unknown>) || {}
	                  : {}));

	      let computedAge: string | undefined;
	      if (typeof profile.dob === "string") {
	        const dobDate = new Date(profile.dob);
	        if (!Number.isNaN(dobDate.getTime())) {
	          const ageYears = Math.floor((Date.now() - dobDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
	          computedAge = String(ageYears);
	        }
	      }

	      const rawMarkers: Array<Record<string, unknown>> = report
	        ? (((report.markers || []) as Array<Record<string, unknown>>) || [])
	        : (Array.isArray(bloodTestRow?.markers) ? (bloodTestRow.markers as Array<Record<string, unknown>>) : []);

	      const resolvedMarkers = rawMarkers
	        .map((marker) => ({
	          markerId: normalizeMarkerName(String((marker as any).markerId || (marker as any).code || (marker as any).name || "")),
	          value: Number((marker as any).value),
	          unit: ((marker as any).unit as string | undefined) || undefined,
	        }))
	        .filter((marker) => marker.markerId && Number.isFinite(marker.value));

	      if (!resolvedMarkers.length) {
	        res.status(400).json({ error: "Aucun biomarqueur detecte" });
	        return;
	      }

	      const normalizedProfile = { ...profile, age: computedAge } as any;
	      const analysisResult = await analyzeBloodwork(resolvedMarkers, {
	        gender: (normalizedProfile.gender as "homme" | "femme") || "homme",
	        age: computedAge,
	        objectives: undefined,
	        medications: undefined,
	      });

	      const aiReport = buildFallbackAnalysis(analysisResult, normalizedProfile);

	      if (report) {
	        await storage.updateBloodReport(report.id, {
	          analysis: {
	            ...analysisResult,
	            aiStatus: "fallback",
	            aiModel: "fallback",
	            aiGeneratedAt: new Date().toISOString(),
	          } as any,
	          aiReport,
	        });
	        res.json({ success: true, reportId: report.id, status: "completed", mode: "fallback" });
	        return;
	      }

	      const { db } = await import("../db.js");
	      const { bloodTests } = await import("../../shared/drizzle-schema.js");
	      const { eq } = await import("drizzle-orm");
	      const existingAnalysis =
	        bloodTestRow && typeof bloodTestRow.analysis === "object" && bloodTestRow.analysis !== null
	          ? (bloodTestRow.analysis as Record<string, unknown>)
	          : {};
	      const updatedAnalysis = {
	        ...existingAnalysis,
	        aiAnalysis: aiReport,
	        aiReport: aiReport,
	        aiStatus: "fallback",
	        aiGeneratedAt: new Date().toISOString(),
	        aiModel: "fallback",
	      };
	      await db.update(bloodTests).set({ analysis: updatedAnalysis }).where(eq(bloodTests.id, targetId));

	      res.json({ success: true, reportId: targetId, status: "completed", mode: "fallback" });
	    } catch (error) {
	      console.error("[BloodAnalysis] rewrite-fallback error:", error);
	      res.status(500).json({ error: "Erreur rewrite-fallback" });
	    }
	  });

	  /**
	   * POST /api/admin/blood-analysis/report/:id/refresh-meta
	   * Refresh aiMeta fields (aiStatus/aiModel/aiValidationMissing/aiGeneratedAt) without regenerating content.
	   * Useful to clear stale aiValidationMissing after code changes.
	   */
	  app.post("/api/admin/blood-analysis/report/:id/refresh-meta", async (req, res) => {
	    try {
	      const adminKey = req.headers["x-admin-key"] || req.query.key || (req.body as any)?.adminKey;
	      const validKey = process.env.ADMIN_SECRET || process.env.ADMIN_KEY || "Badboy007";
	      if (!validKey || adminKey !== validKey) {
	        res.status(401).json({ error: "Unauthorized - admin key required" });
	        return;
	      }

	      const targetId = req.params.id;
	      let report = await storage.getBloodReport(targetId);
	      let bloodTestRow: any | null = null;

	      if (!report) {
	        const { db } = await import("../db.js");
	        const { bloodTests } = await import("../../shared/drizzle-schema.js");
	        const { eq } = await import("drizzle-orm");
	        const results = await db.select().from(bloodTests).where(eq(bloodTests.id, targetId));
	        if (results.length > 0) {
	          bloodTestRow = results[0];
	        }
	      }

	      if (!report && !bloodTestRow) {
	        res.status(404).json({ error: "Rapport introuvable" });
	        return;
	      }

	      const aiReportText =
	        report
	          ? String((report as any).aiReport || "")
	          : String((bloodTestRow?.analysis as any)?.aiReport || (bloodTestRow?.analysis as any)?.aiAnalysis || "");

	      const issues = auditBloodReportQualityForMeta(aiReportText);
	      const nowIso = new Date().toISOString();

	      const nextMeta = {
	        aiStatus: aiReportText.trim().length ? "generated" : "processing",
	        aiModel:
	          report
	            ? ((report as any).analysis?.aiModel || "claude-opus-4-6")
	            : ((bloodTestRow?.analysis as any)?.aiModel || "claude-opus-4-6"),
	        aiGeneratedAt: nowIso,
	        aiValidationMissing: issues.length ? issues : null,
	      };

	      if (report) {
	        const existingAnalysis =
	          (report as any).analysis && typeof (report as any).analysis === "object" && (report as any).analysis !== null
	            ? (report as any).analysis
	            : {};
	        await storage.updateBloodReport(targetId, {
	          analysis: { ...existingAnalysis, ...nextMeta } as any,
	        } as any);
	        res.json({ success: true, reportId: targetId, meta: nextMeta });
	        return;
	      }

	      const { db } = await import("../db.js");
	      const { bloodTests } = await import("../../shared/drizzle-schema.js");
	      const { eq } = await import("drizzle-orm");
	      const existingAnalysis =
	        bloodTestRow && typeof bloodTestRow.analysis === "object" && bloodTestRow.analysis !== null
	          ? (bloodTestRow.analysis as Record<string, unknown>)
	          : {};
	      await db
	        .update(bloodTests)
	        .set({ analysis: { ...existingAnalysis, ...nextMeta } as any })
	        .where(eq(bloodTests.id, targetId));
	      res.json({ success: true, reportId: targetId, meta: nextMeta });
	    } catch (error) {
	      console.error("[BloodAnalysis] refresh-meta error:", error);
	      res.status(500).json({ error: "Erreur refresh-meta" });
	    }
	  });

	  /**
	   * POST /api/admin/blood-analysis/report/:id/repair-annexes
	   * Targeted fix: rewrite/expand the "Annexes" section only (fast), without regenerating the whole report.
	   */
	  app.post("/api/admin/blood-analysis/report/:id/repair-annexes", async (req, res) => {
	    try {
	      const adminKey = req.headers["x-admin-key"] || req.query.key || (req.body as any)?.adminKey;
	      const validKey = process.env.ADMIN_SECRET || process.env.ADMIN_KEY || "Badboy007";
	      if (!validKey || adminKey !== validKey) {
	        res.status(401).json({ error: "Unauthorized - admin key required" });
	        return;
	      }

	      if (!validateAnthropicConfig()) {
	        res.status(400).json({ error: "ANTHROPIC_API_KEY manquante" });
	        return;
	      }

	      const targetId = req.params.id;
	      let report = await storage.getBloodReport(targetId);
	      let bloodTestRow: any | null = null;

	      if (!report) {
	        const { db } = await import("../db.js");
	        const { bloodTests } = await import("../../shared/drizzle-schema.js");
	        const { eq } = await import("drizzle-orm");
	        const results = await db.select().from(bloodTests).where(eq(bloodTests.id, targetId));
	        if (results.length > 0) {
	          bloodTestRow = results[0];
	        }
	      }

	      if (!report && !bloodTestRow) {
	        res.status(404).json({ error: "Rapport introuvable" });
	        return;
	      }

	      const aiReportText =
	        report
	          ? String((report as any).aiReport || "")
	          : String((bloodTestRow?.analysis as any)?.aiReport || (bloodTestRow?.analysis as any)?.aiAnalysis || "");
	      if (!aiReportText.trim()) {
	        res.status(400).json({ error: "aiReport vide" });
	        return;
	      }

	      // Extract the "Annexes" H2 section without using unsupported PCRE features.
	      // We find the first "## Annexes ..." heading, then slice until the next H2 ("## ") or EOF.
	      // Regex literal: use single backslashes (\\s would match a literal "\\s").
	      const annexHeading = aiReportText.match(/^##\s+Annexes\b[^\n]*\n/m);
	      if (!annexHeading || annexHeading.index == null) {
	        res.status(400).json({ error: "Section Annexes introuvable dans le rapport" });
	        return;
	      }

	      const annexStart = annexHeading.index;
	      const afterHeadingStart = annexStart + annexHeading[0].length;
	      const nextH2Rel = aiReportText.slice(afterHeadingStart).search(/\n##\s+/);
	      const annexEnd = nextH2Rel === -1 ? aiReportText.length : afterHeadingStart + nextH2Rel + 1;
	      const currentAnnex = aiReportText.slice(annexStart, annexEnd);
	      if (currentAnnex.trim().length >= 2200) {
	        res.json({ success: true, reportId: targetId, status: "already_ok", annexLen: currentAnnex.trim().length });
	        return;
	      }

	      const titleLine = currentAnnex.split("\n")[0] || "## Annexes (ultra long)";
	      const title = titleLine.replace(/^##\s+/, "").trim() || "Annexes (ultra long)";

	      // Provide minimal context from existing analysis (best-effort)
	      const analysisObj =
	        report
	          ? ((report as any).analysis || {})
	          : ((bloodTestRow?.analysis && typeof bloodTestRow.analysis === "object") ? bloodTestRow.analysis : {});
	      const analysisMarkers = Array.isArray((analysisObj as any).markers) ? (analysisObj as any).markers : [];
	      const markerLines = analysisMarkers
	        .slice(0, 40)
	        .map((m: any) => `${m.name || m.markerId || m.id}: ${m.value ?? "N/A"} ${m.unit || ""} (${String(m.status || "normal")})`)
	        .join("\n");

	      const system = `Tu es un expert en lecture de bilan sanguin.\n\nMISSION:\n- Tu re-ecris UNE SEULE section du rapport.\n- Tu renvoies UNIQUEMENT cette section (du '##' jusqu'avant le prochain '##').\n\nREGLES:\n- Francais, tutoiement.\n- Paragraphes narratifs uniquement.\n- Pas de listes: pas de '- ', pas de '* ', pas de listes numerotees.\n- Pas d'emoji.\n- Tu n'inventes pas de donnees.`;

	      const prompt = [
	        `Contexte biomarqueurs (best-effort):`,
	        markerLines || "Non renseigne",
	        ``,
	        `Section a re-ecrire et enrichir:`,
	        `## ${title}`,
	        ``,
	        `Contraintes:`,
	        `- Minimum 2400 caracteres.`,
	        `- Doit inclure:`,
	        `### Annex A — Marqueurs secondaires (lecture rapide)`,
	        `### Annex B — Hypotheses & tests de confirmation`,
	        `### Annex C — Glossaire utile`,
	        `- Tu restes coherent avec le reste du rapport (meme ton).`,
	        ``,
	        `Retour attendu: UNIQUEMENT la section complete, en commencant EXACTEMENT par:`,
	        `## ${title}`,
	      ].join("\n");

	      const anthropic = new Anthropic({ apiKey: ANTHROPIC_CONFIG.ANTHROPIC_API_KEY });
	      const resp = await anthropic.messages.create({
	        model: ANTHROPIC_CONFIG.ANTHROPIC_MODEL || "claude-opus-4-6",
	        max_tokens: 5000,
	        temperature: 0.4,
	        system,
	        messages: [{ role: "user", content: prompt }],
	      } as any);

	      const textContent = (resp as any).content?.find((c: any) => c.type === "text");
	      const rewritten = String(textContent?.text || "").trim();
	      if (!rewritten.startsWith("## ")) {
	        res.status(500).json({ error: "Claude n'a pas renvoye une section valide" });
	        return;
	      }

	      const updatedReport =
	        aiReportText.slice(0, annexStart) +
	        rewritten.trim() +
	        "\n\n" +
	        aiReportText.slice(annexEnd);
	      const issues = auditBloodReportQualityForMeta(updatedReport);
	      const nowIso = new Date().toISOString();

	      if (report) {
	        const existingAnalysis =
	          (report as any).analysis && typeof (report as any).analysis === "object" && (report as any).analysis !== null
	            ? (report as any).analysis
	            : {};
	        await storage.updateBloodReport(targetId, {
	          aiReport: updatedReport,
	          analysis: {
	            ...existingAnalysis,
	            aiStatus: "generated",
	            aiModel: ANTHROPIC_CONFIG.ANTHROPIC_MODEL || "claude-opus-4-6",
	            aiGeneratedAt: nowIso,
	            aiValidationMissing: issues.length ? issues : null,
	          } as any,
	        } as any);
	        res.json({ success: true, reportId: targetId, annexLen: rewritten.length, validationMissing: issues.length ? issues : null });
	        return;
	      }

	      const { db } = await import("../db.js");
	      const { bloodTests } = await import("../../shared/drizzle-schema.js");
	      const { eq } = await import("drizzle-orm");
	      const existingAnalysis =
	        bloodTestRow && typeof bloodTestRow.analysis === "object" && bloodTestRow.analysis !== null
	          ? (bloodTestRow.analysis as Record<string, unknown>)
	          : {};
	      await db
	        .update(bloodTests)
	        .set({
	          analysis: {
	            ...existingAnalysis,
	            aiReport: updatedReport,
	            aiAnalysis: updatedReport,
	            aiStatus: "generated",
	            aiModel: ANTHROPIC_CONFIG.ANTHROPIC_MODEL || "claude-opus-4-6",
	            aiGeneratedAt: nowIso,
	            aiValidationMissing: issues.length ? issues : null,
	          } as any,
	        })
	        .where(eq(bloodTests.id, targetId));
	      res.json({ success: true, reportId: targetId, annexLen: rewritten.length, validationMissing: issues.length ? issues : null });
	    } catch (error) {
	      console.error("[BloodAnalysis] repair-annexes error:", error);
	      res.status(500).json({ error: "Erreur repair-annexes" });
	    }
	  });

  /**
   * GET /api/blood-analysis/report/:id
   * Fetch stored blood analysis report
   */
  app.get("/api/blood-analysis/report/:id", async (req, res) => {
    try {
      // First try blood_reports table (legacy storage)
      let report = await storage.getBloodReport(req.params.id);
      const reportId = req.params.id;
      let reportSource: "legacy" | "blood_tests" | "unknown" = report ? "legacy" : "unknown";
      let bloodTestRow: any | null = null;

      // If not found, try blood_tests table (new direct DB storage)
      if (!report) {
        const { db } = await import("../db.js");
        const { bloodTests } = await import("../../shared/drizzle-schema.js");
        const { eq } = await import("drizzle-orm");

        const results = await db.select().from(bloodTests).where(eq(bloodTests.id, reportId));

        if (results.length > 0) {
          const bloodTest = results[0];
          bloodTestRow = bloodTest;
          reportSource = "blood_tests";
          // Transform blood_tests format to blood_reports format for frontend compatibility
          const analysis =
            typeof bloodTest.analysis === "object" && bloodTest.analysis !== null
              ? (bloodTest.analysis as Record<string, unknown>)
              : {};
          const profile =
            bloodTest.patientProfile &&
            typeof bloodTest.patientProfile === "object" &&
            !Array.isArray(bloodTest.patientProfile)
              ? (bloodTest.patientProfile as Record<string, unknown>)
              : {};
          const markers = Array.isArray(bloodTest.markers) ? bloodTest.markers : [];
          const aiReportText =
            (analysis as any).aiReport ||
            (analysis as any).aiAnalysis || // stored in blood_tests analysis payload
            "";

          // Transform blood_tests marker format to blood_reports format for frontend
          const analysisMarkers = markers.map((m: any) => ({
            markerId: m.code || m.markerId || (m.name || "").toLowerCase().replace(/\s+/g, "_"),
            name: m.name || m.code || "",
            value: m.value,
            unit: m.unit || "",
            status: m.status || "normal",
            normalRange: (m.refMin != null && m.refMax != null) ? `${m.refMin} - ${m.refMax}` : undefined,
            optimalRange: (m.optimalMin != null && m.optimalMax != null) ? `${m.optimalMin} - ${m.optimalMax}` : undefined,
            interpretation: m.interpretation || "",
          }));

          report = {
            id: bloodTest.id,
            email: bloodTest.userId, // Use userId as email placeholder
            profile,
            markers,
            analysis: {
              summary: (analysis as any).summary || { optimal: [], watch: [], action: [] },
              patterns: (analysis as any).patterns || [],
              recommendations: (analysis as any).recommendations || [],
              followUp: (analysis as any).followUp || [],
              alerts: (analysis as any).alerts || [],
              markers: analysisMarkers
            },
            aiReport: aiReportText,
            aiMeta: {
              status: (analysis as any).aiStatus || null,
              model: (analysis as any).aiModel || null,
              generatedAt: (analysis as any).aiGeneratedAt || null,
              validationMissing: (analysis as any).aiValidationMissing || null,
            },
            createdAt: bloodTest.createdAt || new Date().toISOString()
          };
        }
      }

      if (!report) {
        res.status(404).json({ error: "Rapport introuvable" });
        return;
      }

      // If the AI report is missing, kick off background generation.
      // This unblocks cases where async generation never ran (dyno sleep / crash / seed rows).
      const aiReportText = typeof (report as any).aiReport === "string" ? (report as any).aiReport : "";
      const shouldGenerateAi =
        !!process.env.ANTHROPIC_API_KEY && aiReportText.trim().length === 0;

      if (shouldGenerateAi && !BLOOD_AI_REPORT_IN_FLIGHT.has(reportId)) {
        BLOOD_AI_REPORT_IN_FLIGHT.add(reportId);

        setImmediate(async () => {
          try {
            const rawProfile = ((report as any).profile || {}) as Record<string, unknown>;
            const gender = rawProfile.gender === "femme" ? "femme" : "homme";

            const rawMarkers = Array.isArray((report as any).markers) ? ((report as any).markers as any[]) : [];
            const resolvedMarkers: BloodMarkerInput[] = rawMarkers
              .map((m) => {
                const rawId = String(m?.markerId || m?.code || m?.name || "");
                const markerId = normalizeMarkerName(rawId);
                const value = Number(m?.value);
                const unit = typeof m?.unit === "string" ? m.unit : undefined;
                return { markerId, value, unit };
              })
              .filter((m) => m.markerId && Number.isFinite(m.value));

            if (!resolvedMarkers.length) {
              console.warn(`[BloodAnalysis] AI generation skipped (no markers) for report ${reportId}`);
              return;
            }

            const analysisResult = await analyzeBloodwork(resolvedMarkers, {
              ...(rawProfile as any),
              gender,
            });

            const knowledgeContext = await getBloodworkKnowledgeContext(
              analysisResult.markers,
              analysisResult.patterns
            );

            let aiReport = "";
            let aiMeta: { status: string; model: string; validationMissing?: string[] } | null = null;
            let aiError: unknown = null;
            try {
              const generated = await generateAIBloodAnalysis(
                analysisResult,
                { ...(rawProfile as any), gender } as any,
                knowledgeContext
              );
              aiReport = generated.report;
              aiMeta = { status: generated.status, model: generated.model, validationMissing: generated.validationMissing };
            } catch (err) {
              aiError = err;
              console.error(`[BloodAnalysis] AI generation crashed for ${reportId}, using deterministic fallback:`, err);
              aiReport = buildFallbackAnalysis(analysisResult as any, { ...(rawProfile as any), gender } as any);
              aiMeta = { status: "fallback", model: "fallback" };
            }

            if (reportSource === "legacy") {
              await storage.updateBloodReport(reportId, {
                analysis: {
                  ...analysisResult,
                  aiStatus: aiMeta?.status || "unknown",
                  aiModel: aiMeta?.model || "unknown",
                  aiGeneratedAt: new Date().toISOString(),
                  aiValidationMissing: aiMeta?.validationMissing || null,
                  ...(aiError ? { aiError: String((aiError as any)?.message || aiError) } : {}),
                } as any,
                aiReport,
              } as any);
              console.log(`[BloodAnalysis] AI report generated for legacy report ${reportId} (${aiReport.length} chars)`);
              return;
            }

            if (reportSource === "blood_tests" && bloodTestRow) {
              const { db } = await import("../db.js");
              const { bloodTests } = await import("../../shared/drizzle-schema.js");
              const { eq } = await import("drizzle-orm");

              const existingAnalysis =
                bloodTestRow.analysis && typeof bloodTestRow.analysis === "object" && bloodTestRow.analysis !== null
                  ? (bloodTestRow.analysis as Record<string, unknown>)
                  : {};

              await db
                .update(bloodTests)
                .set({
                  analysis: {
                    ...existingAnalysis,
                    ...analysisResult,
                    aiReport,
                    aiStatus: aiMeta?.status || "unknown",
                    aiModel: aiMeta?.model || "unknown",
                    aiGeneratedAt: new Date().toISOString(),
                    ...(aiError ? { aiError: String((aiError as any)?.message || aiError) } : {}),
                    aiValidationMissing: aiMeta?.validationMissing || null,
                  } as any,
                })
                .where(eq(bloodTests.id, reportId));

              console.log(`[BloodAnalysis] AI report generated for blood_tests ${reportId} (${aiReport.length} chars)`);
            }
          } catch (err) {
            console.error(`[BloodAnalysis] Background AI generation failed for ${reportId}:`, err);
          } finally {
            BLOOD_AI_REPORT_IN_FLIGHT.delete(reportId);
          }
        });
      }

      res.json({ success: true, report });
    } catch (error) {
      console.error("[BloodAnalysis] Report fetch error:", error);
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  /**
   * GET /api/blood-tests/:id (BRIDGE)
   * Returns blood-analysis report in blood-tests format for frontend compatibility
   * This endpoint is registered BEFORE the main blood-tests routes (which require auth)
   */
  app.get("/api/blood-tests/:id", async (req, res, next) => {
    try {
      // First try blood-analysis report (no auth required for these)
      const report = await storage.getBloodReport(req.params.id);
      if (!report) {
        // Fall through to the authenticated blood-tests route
        return next();
      }

      console.log(`[BloodAnalysis] Serving report ${req.params.id} via bridge endpoint`);

      // Transform blood-analysis format to blood-tests format
      const profile = report.profile as Record<string, unknown> || {};
      const analysis = report.analysis as Record<string, unknown> || {};
      const markers = report.markers as Array<Record<string, unknown>> || [];

      // Build markers in frontend expected format
      const formattedMarkers = markers.map((m: Record<string, unknown>) => {
        const rawMarkerId = (m.markerId || m.name || "") as string;
        const markerId = normalizeMarkerName(rawMarkerId);
        const range = BIOMARKER_RANGES[markerId];
        const analysisMarker = (analysis.markers as any[])?.find((am: any) =>
          normalizeMarkerName((am.markerId || am.name || am.id) as string) === markerId
        );
        return {
          name: range?.name || markerId,
          code: markerId,
          category: "metabolic", // Default category
          value: m.value as number,
          unit: (m.unit || range?.unit || "") as string,
          refMin: range?.normalMin ?? null,
          refMax: range?.normalMax ?? null,
          optimalMin: range?.optimalMin ?? null,
          optimalMax: range?.optimalMax ?? null,
          status: analysisMarker?.status || "normal",
          interpretation: analysisMarker?.interpretation || "",
        };
      });

      // Calculate global score from analysis
      const analysisMarkers = ((analysis.markers || []) as Array<{ status: string }>).map(m => ({
        ...m,
        status: (m.status || "normal").toLowerCase(),
      }));
      const optimalCount = analysisMarkers.filter(m => m.status === "optimal").length;
      const normalCount = analysisMarkers.filter(m => m.status === "normal").length;
      const totalMarkers = analysisMarkers.length || 1;
      const suboptimalCount = analysisMarkers.filter(m => m.status === "suboptimal").length;
      const criticalCount = analysisMarkers.filter(m => m.status === "critical").length;
      const globalScore = Math.round((optimalCount * 100 + normalCount * 80 + suboptimalCount * 55 + criticalCount * 30) / totalMarkers);
      const globalLevel = globalScore >= 85 ? "excellent" : globalScore >= 70 ? "bon" : globalScore >= 50 ? "moyen" : "faible";

      res.json({
        bloodTest: {
          id: report.id,
          fileName: "blood-analysis-submit",
          uploadedAt: report.createdAt,
          status: "completed",
          error: null,
          globalScore,
          globalLevel,
          patient: {
            prenom: profile.prenom as string || "",
            nom: profile.nom as string || "",
            email: report.email,
            gender: profile.gender as string || "homme",
            dob: profile.dob as string || "",
            poids: profile.poids as number || null,
            taille: profile.taille as number || null,
            sleepHours: profile.sleepHours as number || null,
            stressLevel: profile.stressLevel as number || null,
            fastingHours: profile.fastingHours as number || null,
            drawTime: profile.drawTime as string || null,
            lastTraining: profile.lastTraining as string || null,
            alcoholLast72h: profile.alcoholLast72h as string || null,
            nutritionPhase: profile.nutritionPhase as string || null,
            supplementsUsed: Array.isArray(profile.supplementsUsed) ? profile.supplementsUsed : null,
            medications: profile.medications as string || null,
            infectionRecent: profile.infectionRecent as string || null,
          },
        },
        markers: formattedMarkers,
        derivedMetrics: {},
        patterns: (analysis.patterns || []) as any[],
        analysis: {
          globalScore,
          globalLevel,
          patterns: analysis.patterns || [],
          aiAnalysis: report.aiReport || "",
          comprehensiveData: {
            supplements: [],
            protocols: [],
          },
          patient: {
            prenom: profile.prenom as string || "",
            nom: profile.nom as string || "",
            email: report.email,
            gender: profile.gender as string || "homme",
            dob: profile.dob as string || "",
          },
        },
      });
    } catch (error) {
      console.error("[BloodAnalysis] Bridge endpoint error:", error);
      // Fall through to next handler
      return next();
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
      let aiMeta: { status: string; model: string; validationMissing: string[] | null } | null = null;
      try {
        const generated = await generateAIBloodAnalysis(
          basicAnalysis,
          profileWithAge,
          knowledgeContext
        );
        aiReport = generated.report;
        aiMeta = {
          status: generated.status,
          model: generated.model,
          validationMissing: generated.validationMissing || null,
        };
      } catch (aiError) {
        console.error("[BloodAnalysis] AI generation failed, using fallback:", aiError);
        aiReport = buildFallbackAnalysis(basicAnalysis, profileWithAge);
        aiMeta = { status: "fallback", model: "fallback", validationMissing: null };
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
        aiMeta,
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
      let aiMeta: { status: string; model: string; validationMissing: string[] | null } | null = null;
      try {
        const generated = await generateAIBloodAnalysis(
          basicAnalysis,
          profileWithAge,
          knowledgeContext
        );
        aiReport = generated.report;
        aiMeta = {
          status: generated.status,
          model: generated.model,
          validationMissing: generated.validationMissing || null,
        };
      } catch (aiError) {
        console.error("[BloodAnalysis] AI generation failed, using fallback:", aiError);
        aiReport = buildFallbackAnalysis(basicAnalysis, profileWithAge);
        aiMeta = { status: "fallback", model: "fallback", validationMissing: null };
      }

      res.json({
        success: true,
        extractedPatient,
        markersFound: resolvedMarkers.length,
        report: comprehensiveReport,
        aiNarrative: aiReport,
        aiMeta,
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
