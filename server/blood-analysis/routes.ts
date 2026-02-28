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
  normalizeMarkerName,
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
import {
  sendAdminEmailNewAudit,
  sendBloodAnalysisHtmlEmail,
} from "../emailService";
import { getUncachableStripeClient } from "../stripeClient";
import pdf from "pdf-parse";
import {
  withAIGenerationTimeout,
  isAIGenerationTimeoutError,
} from "./ai-timeout";

// Prevent duplicate background generation per instance.
const BLOOD_AI_REPORT_IN_FLIGHT = new Set<string>();
const ALLOW_DETERMINISTIC_FALLBACK = process.env.BLOOD_ANALYSIS_ALLOW_FALLBACK === "true";

const getBaseUrl = (): string => {
  return (
    process.env.APP_URL ||
    process.env.RENDER_EXTERNAL_URL ||
    "http://localhost:10000"
  );
};

const BLOOD_REQUIRED_SECTION_PATTERNS: RegExp[] = [
  /(^|\n)\s*##\s+synth[eè]se\s+ex[ée]cutive\b/i,
  /(^|\n)\s*##\s+qualit[ée]\s+des\s+donn[ée]es\s*&\s*limites\b/i,
  /(^|\n)\s*##\s+tableau\s+de\s+bord\s*\(scores?\s*&\s*priorit[ée]s?[^\)]*\)/i,
  /(^|\n)\s*##\s+potentiel\s+recomposition\b/i,
  /(^|\n)\s*##\s+lecture\s+compartiment[ée]e\s+par\s+axes\b/i,
  /(^|\n)\s*##\s+interconnexions\s+majeures\b/i,
  /(^|\n)\s*##\s+deep\s*dive\b/i,
  /(^|\n)\s*##\s+plan\s+d['’]action\s+90\s+jours\b/i,
  /(^|\n)\s*##\s+nutrition\s*&\s*entra[iî]nement\b/i,
  /(^|\n)\s*##\s+suppl[ée]ments?\s*&\s*stack\b/i,
  /(^|\n)\s*##\s+annexes\b/i,
  /(^|\n)\s*##\s+sources\b/i,
];

const BLOOD_HEADING_NORMALIZERS: Array<{ pattern: RegExp; replacement: string }> = [
  { pattern: /^\s*##\s+Synthese executive\s*$/gim, replacement: "## Synthèse exécutive" },
  { pattern: /^\s*##\s+Qualite des donnees & limites\s*$/gim, replacement: "## Qualité des données & limites" },
  { pattern: /^\s*##\s+Tableau de bord \(scores & priorites\)\s*$/gim, replacement: "## Tableau de bord (scores & priorités)" },
  { pattern: /^\s*##\s+Lecture compartimentee par axes\s*$/gim, replacement: "## Lecture compartimentée par axes" },
  { pattern: /^\s*##\s+Nutrition & entrainement\s*$/gim, replacement: "## Nutrition & entraînement" },
  { pattern: /^\s*##\s+Supplements & stack\s*$/gim, replacement: "## Suppléments & stack" },
  { pattern: /^\s*##\s+Annexes \(references et vigilance\)\s*$/gim, replacement: "## Annexes (références et vigilance)" },
  { pattern: /^\s*##\s+Sources \(bibliotheque\)\s*$/gim, replacement: "## Sources (bibliothèque)" },
];

const canonicalizeBloodReport = (input: string): string => {
  let text = String(input || "");
  for (const { pattern, replacement } of BLOOD_HEADING_NORMALIZERS) {
    text = text.replace(pattern, replacement);
  }
  return text;
};

const isDeliverableAiReport = (reportText: string): boolean => {
  const text = canonicalizeBloodReport(reportText).trim();
  if (!text) return false;
  if (text.length < 9000) return false;
  if (/\*Rapport fallback deterministic/i.test(text)) return false;
  if (/section non disponible|veuillez reg(?:e|é)n(?:e|é)rer le rapport/i.test(text)) return false;
  if (/^\s*###\s*Axe\s+\d+\s+[—-]\s*Non renseigne\b/gim.test(text)) return false;
  return BLOOD_REQUIRED_SECTION_PATTERNS.every((pattern) => pattern.test(text));
};

const sendBloodClientDeliveryEmail = async (
  recipientEmail: string,
  reportId: string,
  aiReport: string,
  baseUrl: string,
): Promise<boolean> => {
  void baseUrl;
  const reportText = canonicalizeBloodReport(aiReport).trim();
  if (!isDeliverableAiReport(reportText)) {
    console.warn(
      `[BloodAnalysis] Blocking email delivery for ${reportId}: report is empty/fallback/incomplete.`
    );
    return false;
  }

  // Strict mode: only full HTML delivery, no dashboard-link fallback.
  return sendBloodAnalysisHtmlEmail(recipientEmail, reportId, reportText, baseUrl);
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const AI_CREDIT_BALANCE_LOW_SENTINEL = "__AI_CREDIT_BALANCE_LOW__";

const getErrorMessage = (error: unknown): string => {
  if (!error) return "";
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message || "";
  return String(error);
};

const isAnthropicLowCreditError = (error: unknown): boolean => {
  const message = getErrorMessage(error).toLowerCase();
  return (
    message.includes("credit balance is too low") ||
    message.includes("insufficient credits") ||
    message.includes("billing")
  );
};

const generateAiReportWithAttempts = async (
  analysisResult: Awaited<ReturnType<typeof analyzeBloodwork>>,
  profile: Record<string, unknown>,
  knowledgeContext: string,
  contextLabel: string,
  maxAttempts = 3
): Promise<string> => {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const candidate = await withAIGenerationTimeout(
        () => generateAIBloodAnalysis(analysisResult, profile as any, knowledgeContext),
        `${contextLabel} attempt-${attempt}`
      );
      const normalizedCandidate = canonicalizeBloodReport(candidate);
      if (isDeliverableAiReport(normalizedCandidate)) {
        return normalizedCandidate;
      }
      console.warn(
        `[BloodAnalysis] ${contextLabel} attempt ${attempt} produced non-deliverable content (len=${normalizedCandidate.length}).`
      );
    } catch (error) {
      if (isAnthropicLowCreditError(error)) {
        console.error(`[BloodAnalysis] ${contextLabel} aborted: AI_CREDIT_BALANCE_LOW.`);
        return AI_CREDIT_BALANCE_LOW_SENTINEL;
      }
      if (isAIGenerationTimeoutError(error)) {
        console.warn(`[BloodAnalysis] ${contextLabel} attempt ${attempt} timed out.`);
      } else {
        console.error(`[BloodAnalysis] ${contextLabel} attempt ${attempt} failed:`, error);
      }
    }
    if (attempt < maxAttempts) await sleep(4000);
  }
  return "";
};

type MarkerStatus = "optimal" | "normal" | "suboptimal" | "critical";

const SCORE_BY_STATUS: Record<MarkerStatus, number> = {
  optimal: 100,
  normal: 80,
  suboptimal: 55,
  critical: 30,
};

const CATEGORY_BY_MARKER: Record<string, string> = {
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
  tsh: "thyroid",
  t4_libre: "thyroid",
  t3_libre: "thyroid",
  t3_reverse: "thyroid",
  anti_tpo: "thyroid",
  glycemie_jeun: "metabolic",
  hba1c: "metabolic",
  insuline_jeun: "metabolic",
  homa_ir: "metabolic",
  triglycerides: "metabolic",
  hdl: "metabolic",
  ldl: "metabolic",
  apob: "metabolic",
  lpa: "metabolic",
  crp_us: "inflammation",
  homocysteine: "inflammation",
  ferritine: "inflammation",
  fer_serique: "inflammation",
  transferrine_sat: "inflammation",
  vitamine_d: "vitamins",
  b12: "vitamins",
  folate: "vitamins",
  magnesium_rbc: "vitamins",
  zinc: "vitamins",
  alt: "liver_kidney",
  ast: "liver_kidney",
  ggt: "liver_kidney",
  creatinine: "liver_kidney",
  egfr: "liver_kidney",
};

const normalizeMarkerStatus = (status: unknown): MarkerStatus => {
  const lower = String(status || "").toLowerCase();
  if (lower === "optimal") return "optimal";
  if (lower === "normal") return "normal";
  if (lower === "suboptimal" || lower.includes("sous")) return "suboptimal";
  if (lower === "critical" || lower.includes("crit")) return "critical";
  return "normal";
};

const computeGlobalScoreFromStatuses = (statuses: MarkerStatus[]): number => {
  if (!statuses.length) return 0;
  const total = statuses.reduce((sum, status) => sum + SCORE_BY_STATUS[status], 0);
  return Math.round(total / statuses.length);
};

const getGlobalLevel = (score: number): "excellent" | "bon" | "moyen" | "faible" => {
  if (score >= 85) return "excellent";
  if (score >= 70) return "bon";
  if (score >= 50) return "moyen";
  return "faible";
};

const normalizeLegacyReportMarker = (
  marker: Record<string, unknown>,
  analysisByMarkerId: Map<string, { status: MarkerStatus; interpretation?: string; name?: string }>
) => {
  const markerId = normalizeMarkerName(String(marker.markerId || marker.code || marker.name || ""));
  if (!markerId) return null;
  const value = Number(marker.value);
  if (!Number.isFinite(value)) return null;
  const range = BIOMARKER_RANGES[markerId];
  const analysis = analysisByMarkerId.get(markerId);

  return {
    markerId,
    name: String(marker.name || analysis?.name || range?.name || markerId),
    value,
    unit: String(marker.unit || range?.unit || ""),
    status: analysis?.status || normalizeMarkerStatus(marker.status),
    normalRange:
      marker.refMin != null && marker.refMax != null
        ? `${marker.refMin} - ${marker.refMax}`
        : range
        ? `${range.normalMin} - ${range.normalMax}`
        : undefined,
    optimalRange:
      marker.optimalMin != null && marker.optimalMax != null
        ? `${marker.optimalMin} - ${marker.optimalMax}`
        : range
        ? `${range.optimalMin} - ${range.optimalMax}`
        : undefined,
    interpretation:
      String(marker.interpretation || analysis?.interpretation || "").trim(),
    category:
      String(marker.category || "").trim() ||
      CATEGORY_BY_MARKER[markerId] ||
      "general",
  };
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

      const hasAnthropicKey = Boolean(process.env.ANTHROPIC_API_KEY);
      let aiAnalysis = "";
      let aiCreditBalanceLow = false;
      if (hasAnthropicKey) {
        try {
          aiAnalysis = await withAIGenerationTimeout(
            () =>
              generateAIBloodAnalysis(
                analysisResult,
                profile,
                knowledgeContext
              ),
            "blood-analysis/analyze sync report"
          );
          if (aiAnalysis) {
            aiAnalysis = canonicalizeBloodReport(aiAnalysis);
          }
        } catch (aiError) {
          if (isAnthropicLowCreditError(aiError)) {
            aiCreditBalanceLow = true;
            console.error("[BloodAnalysis] Analyze AI failed: AI_CREDIT_BALANCE_LOW.");
          } else if (isAIGenerationTimeoutError(aiError)) {
            console.warn("[BloodAnalysis] Analyze AI timed out (no fallback delivery).");
          } else {
            console.error("[BloodAnalysis] Analyze AI failed (no fallback delivery):", aiError);
          }
        }
      }

      if (!aiAnalysis && !hasAnthropicKey) {
        if (ALLOW_DETERMINISTIC_FALLBACK) {
          console.warn(
            "[BloodAnalysis] Anthropic key missing; deterministic fallback is enabled by env but blocked from delivery."
          );
        } else {
          console.warn(
            "[BloodAnalysis] Anthropic key missing; deterministic fallback disabled."
          );
        }
      }

      const status =
        !aiAnalysis && (!hasAnthropicKey || aiCreditBalanceLow)
          ? "unavailable"
          : hasAnthropicKey && !aiAnalysis
          ? "processing"
          : "completed";

      res.json({
        success: true,
        analysis: analysisResult,
        aiReport: aiAnalysis,
        status,
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
      const hasAnthropicKey = Boolean(process.env.ANTHROPIC_API_KEY);
      const profileWithAge = {
        ...profile,
        age: computedAge,
      };
      let aiAnalysis = "";
      let syncAiNeedsBackgroundRetry = false;
      let aiCreditBalanceLow = false;
      if (shouldIncludeAI) {
        if (!shouldAsyncAI && hasAnthropicKey) {
          const syncCandidate = await generateAiReportWithAttempts(
            analysisResult,
            profileWithAge as any,
            knowledgeContext,
            "blood-analysis/submit sync report",
            2
          );
          if (syncCandidate === AI_CREDIT_BALANCE_LOW_SENTINEL) {
            aiCreditBalanceLow = true;
            aiAnalysis = "";
            syncAiNeedsBackgroundRetry = false;
            console.warn("[BloodAnalysis] Submit sync AI unavailable (AI_CREDIT_BALANCE_LOW).");
          } else {
            aiAnalysis = syncCandidate;
          }
          if (!aiAnalysis && !aiCreditBalanceLow) {
            syncAiNeedsBackgroundRetry = true;
            console.warn("[BloodAnalysis] Submit sync AI unavailable, queuing async retry (no fallback delivery).");
          }
        } else if (!hasAnthropicKey) {
          aiAnalysis = "";
          if (ALLOW_DETERMINISTIC_FALLBACK) {
            console.warn(
              "[BloodAnalysis] Submit: Anthropic key missing; fallback mode enabled by env but disabled for delivery."
            );
          } else {
            console.warn("[BloodAnalysis] Submit: Anthropic key missing; fallback disabled.");
          }
        }
      }

      const reportRecord = await storage.createBloodReport({
        email: recipientEmail,
        profile: profileWithAge,
        markers: resolvedMarkers,
        analysis: analysisResult,
        aiReport: aiAnalysis,
      });

      const shouldQueueBackgroundAI =
        shouldIncludeAI &&
        hasAnthropicKey &&
        !aiCreditBalanceLow &&
        (shouldAsyncAI || syncAiNeedsBackgroundRetry);

      const baseUrl = getBaseUrl();
      const shouldDeferEmailToBackground = shouldQueueBackgroundAI;
      if (aiAnalysis && !shouldDeferEmailToBackground) {
        const emailSent = await sendBloodClientDeliveryEmail(
          recipientEmail,
          reportRecord.id,
          aiAnalysis,
          baseUrl
        );
        if (emailSent) {
          await sendAdminEmailNewAudit(
            recipientEmail,
            recipientEmail.split("@")[0],
            "BLOOD_ANALYSIS",
            reportRecord.id
          );
        }
      }

      if (shouldQueueBackgroundAI) {
        setImmediate(async () => {
          try {
            const enrichedCandidate = await generateAiReportWithAttempts(
              analysisResult,
              profileWithAge as any,
              knowledgeContext,
              `blood-analysis/submit async report ${reportRecord.id}`,
              3
            );
            if (enrichedCandidate === AI_CREDIT_BALANCE_LOW_SENTINEL) {
              console.error(
                `[BloodAnalysis] Async submit generation blocked by AI_CREDIT_BALANCE_LOW for ${reportRecord.id}.`
              );
              await storage.updateBloodReport(reportRecord.id, {
                aiError: "AI_CREDIT_BALANCE_LOW",
              } as any);
              return;
            }
            const enriched = enrichedCandidate;
            if (!enriched) {
              console.warn(
                `[BloodAnalysis] Async submit generation exhausted retries for ${reportRecord.id}; keeping processing state.`
              );
              return;
            }
            await storage.updateBloodReport(reportRecord.id, { aiReport: enriched });
            const emailSent = await sendBloodClientDeliveryEmail(
              recipientEmail,
              reportRecord.id,
              enriched,
              baseUrl
            );
            if (emailSent) {
              await sendAdminEmailNewAudit(
                recipientEmail,
                recipientEmail.split("@")[0],
                "BLOOD_ANALYSIS",
                reportRecord.id
              );
            }
          } catch (err) {
            console.error("[BloodAnalysis] async AI failed:", err);
          }
        });
      }

      const status =
        shouldIncludeAI && !aiAnalysis && (!hasAnthropicKey || aiCreditBalanceLow)
          ? "unavailable"
          : shouldIncludeAI && hasAnthropicKey && !aiAnalysis
          ? "processing"
          : "completed";

      res.json({
        success: true,
        reportId: reportRecord.id,
        analysis: analysisResult,
        aiReport: aiAnalysis,
        status
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
      const validKey = process.env.ADMIN_SECRET || process.env.ADMIN_KEY;
      if (!validKey || adminKey !== validKey) {
        res.status(401).json({ error: "Unauthorized - admin key required" });
        return;
      }

      const report = await storage.getBloodReport(req.params.id);
      if (!report) {
        res.status(404).json({ error: "Rapport introuvable" });
        return;
      }

      const profile = (report.profile || {}) as Record<string, unknown>;
      let computedAge: string | undefined;
      if (typeof profile.dob === "string") {
        const dobDate = new Date(profile.dob);
        if (!Number.isNaN(dobDate.getTime())) {
          const ageYears = Math.floor((Date.now() - dobDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
          computedAge = String(ageYears);
        }
      }

      const resolvedMarkers = ((report.markers || []) as Array<Record<string, unknown>>)
        .map((marker) => ({
          markerId: normalizeMarkerName(String(marker.markerId || marker.name || "")),
          value: Number(marker.value),
          unit: marker.unit as string | undefined,
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

        const aiReportCandidate = await generateAiReportWithAttempts(
          analysisResult,
          normalizedProfile,
          knowledgeContext,
          "blood-analysis/admin-regenerate",
          3
        );
        if (aiReportCandidate === AI_CREDIT_BALANCE_LOW_SENTINEL) {
          throw new Error("AI_CREDIT_BALANCE_LOW");
        }
        const aiReport = aiReportCandidate;
        if (!aiReport) {
          throw new Error("ADMIN_REGENERATE_AI_UNAVAILABLE");
        }

        await storage.updateBloodReport(report.id, { analysis: analysisResult, aiReport });
      };

      const asyncMode =
        req.query.async === "true" || (req.body && (req.body as any).async === true);

      if (asyncMode) {
        setImmediate(() => {
          runRegeneration().catch((err) => {
            console.error("[BloodAnalysis] Regenerate async error:", err);
          });
        });
        res.json({ success: true, reportId: report.id, status: "processing" });
        return;
      }

      await runRegeneration();

      res.json({ success: true, reportId: report.id, status: "completed" });
    } catch (error) {
      console.error("[BloodAnalysis] Regenerate error:", error);
      res.status(500).json({ error: "Erreur regeneration" });
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
            category: CATEGORY_BY_MARKER[m.code || m.markerId || ""] || "general",
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
      const hasAnthropicKey = Boolean(process.env.ANTHROPIC_API_KEY);
      const aiReportText = typeof (report as any).aiReport === "string" ? (report as any).aiReport : "";
      let effectiveAiReport = canonicalizeBloodReport(aiReportText).trim();
      if (effectiveAiReport && effectiveAiReport !== aiReportText) {
        (report as any).aiReport = effectiveAiReport;
      }

      if (!effectiveAiReport && !hasAnthropicKey) {
        if (ALLOW_DETERMINISTIC_FALLBACK) {
          console.warn(
            `[BloodAnalysis] Anthropic key missing for ${reportId}; fallback mode enabled but disabled for delivery.`
          );
        } else {
          console.warn(
            `[BloodAnalysis] Anthropic key missing for ${reportId}; fallback disabled.`
          );
        }
      }

      const shouldGenerateAi = hasAnthropicKey && effectiveAiReport.length === 0;

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

            const aiReportCandidate = await generateAiReportWithAttempts(
              analysisResult,
              { ...(rawProfile as any), gender } as any,
              knowledgeContext,
              `blood-analysis/report background ${reportId}`,
              3
            );
            if (aiReportCandidate === AI_CREDIT_BALANCE_LOW_SENTINEL) {
              const aiError = "AI_CREDIT_BALANCE_LOW";
              console.error(
                `[BloodAnalysis] AI generation blocked by AI_CREDIT_BALANCE_LOW for ${reportId}.`
              );
              if (reportSource === "legacy") {
                await storage.updateBloodReport(reportId, {
                  analysis: analysisResult as any,
                  aiError,
                } as any);
              } else if (reportSource === "blood_tests" && bloodTestRow) {
                const { db } = await import("../db.js");
                const { bloodTests } = await import("../../shared/drizzle-schema.js");
                const { eq } = await import("drizzle-orm");
                const existingAnalysis =
                  bloodTestRow.analysis && typeof bloodTestRow.analysis === "object" && bloodTestRow.analysis !== null
                    ? (bloodTestRow.analysis as Record<string, unknown>)
                    : {};
                const refreshedAnalysis: Record<string, unknown> = {
                  ...existingAnalysis,
                  ...analysisResult,
                  aiModel: "claude-opus-4-6",
                  aiGeneratedAt: new Date().toISOString(),
                  aiError,
                };
                await db
                  .update(bloodTests)
                  .set({
                    analysis: refreshedAnalysis as any,
                  })
                  .where(eq(bloodTests.id, reportId));
              }
              return;
            }
            const aiReport = aiReportCandidate;
            const aiError =
              aiReport.length > 0
                ? null
                : "AI_UNAVAILABLE_AFTER_RETRIES";
            if (aiError) {
              console.error(
                `[BloodAnalysis] AI generation failed for ${reportId}, keeping report in processing state.`
              );
            }

            if (reportSource === "legacy") {
              const updatePayload: Record<string, unknown> = {
                analysis: analysisResult as any,
                ...(aiError ? { aiError } : {}),
              };
              if (aiReport) updatePayload.aiReport = aiReport;
              await storage.updateBloodReport(reportId, updatePayload as any);
              if (aiReport) {
                console.log(`[BloodAnalysis] AI report generated for legacy report ${reportId} (${aiReport.length} chars)`);
              } else {
                console.warn(`[BloodAnalysis] No AI report generated for legacy report ${reportId}; awaiting retry.`);
              }
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
              const refreshedAnalysis: Record<string, unknown> = {
                ...existingAnalysis,
                ...analysisResult,
                aiModel: "claude-opus-4-6",
                aiGeneratedAt: new Date().toISOString(),
                ...(aiError ? { aiError } : {}),
              };
              if (aiReport) {
                refreshedAnalysis.aiReport = aiReport;
              }

              await db
                .update(bloodTests)
                .set({
                  analysis: refreshedAnalysis as any,
                })
                .where(eq(bloodTests.id, reportId));

              if (aiReport) {
                console.log(`[BloodAnalysis] AI report generated for blood_tests ${reportId} (${aiReport.length} chars)`);
              } else {
                console.warn(`[BloodAnalysis] No AI report generated for blood_tests ${reportId}; awaiting retry.`);
              }
            }
          } catch (err) {
            console.error(`[BloodAnalysis] Background AI generation failed for ${reportId}:`, err);
          } finally {
            BLOOD_AI_REPORT_IN_FLIGHT.delete(reportId);
          }
        });
      }

      // Always recompute marker statuses/scores from raw values to avoid stale 100/100 legacy payloads.
      const reportProfile = (((report as any).profile || {}) as Record<string, unknown>);
      const reportGender = reportProfile.gender === "femme" ? "femme" : "homme";
      const reportMarkers = Array.isArray((report as any).markers) ? ((report as any).markers as Array<Record<string, unknown>>) : [];
      const recomputeInputs: BloodMarkerInput[] = reportMarkers
        .map((marker) => {
          const markerId = normalizeMarkerName(String(marker.markerId || marker.code || marker.name || ""));
          const value = Number(marker.value);
          const unit = typeof marker.unit === "string" ? marker.unit : undefined;
          return { markerId, value, unit };
        })
        .filter((marker) => marker.markerId && Number.isFinite(marker.value));

      if (recomputeInputs.length) {
        const recomputedAnalysis = await analyzeBloodwork(recomputeInputs, {
          gender: reportGender,
          age: typeof reportProfile.age === "string" ? reportProfile.age : undefined,
          objectives: undefined,
          medications: undefined,
        });
        const analysisByMarkerId = new Map(
          recomputedAnalysis.markers.map((marker) => [
            marker.markerId,
            {
              status: marker.status,
              interpretation: marker.interpretation,
              name: marker.name,
            },
          ])
        );

        const normalizedMarkers = reportMarkers
          .map((marker) => normalizeLegacyReportMarker(marker, analysisByMarkerId))
          .filter((marker): marker is NonNullable<ReturnType<typeof normalizeLegacyReportMarker>> => Boolean(marker));

        const fallbackMarkers = recomputedAnalysis.markers.map((marker) => {
          const range = BIOMARKER_RANGES[marker.markerId];
          return {
            markerId: marker.markerId,
            name: marker.name,
            value: marker.value,
            unit: marker.unit || range?.unit || "",
            status: marker.status,
            normalRange: range ? `${range.normalMin} - ${range.normalMax}` : undefined,
            optimalRange: range ? `${range.optimalMin} - ${range.optimalMax}` : undefined,
            interpretation: marker.interpretation || "",
            category: CATEGORY_BY_MARKER[marker.markerId] || "general",
          };
        });

        const effectiveMarkers = normalizedMarkers.length ? normalizedMarkers : fallbackMarkers;
        const globalScore = computeGlobalScoreFromStatuses(
          effectiveMarkers.map((marker) => marker.status)
        );
        const globalLevel = getGlobalLevel(globalScore);
        const existingAnalysis =
          (report as any).analysis && typeof (report as any).analysis === "object"
            ? ((report as any).analysis as Record<string, unknown>)
            : {};

        (report as any).markers = effectiveMarkers;
        (report as any).analysis = {
          ...existingAnalysis,
          summary: recomputedAnalysis.summary,
          patterns: recomputedAnalysis.patterns,
          recommendations: existingAnalysis.recommendations ?? recomputedAnalysis.recommendations,
          followUp: existingAnalysis.followUp ?? recomputedAnalysis.followUp,
          alerts: existingAnalysis.alerts ?? recomputedAnalysis.alerts,
          markers: effectiveMarkers,
          globalScore,
          globalLevel,
        };
      }

      if (!effectiveAiReport && !hasAnthropicKey) {
        if (ALLOW_DETERMINISTIC_FALLBACK) {
          console.warn(
            `[BloodAnalysis] Anthropic key missing for ${reportId}; fallback mode enabled but disabled for delivery.`
          );
        } else {
          console.warn(
            `[BloodAnalysis] Anthropic key missing for ${reportId}; fallback disabled.`
          );
        }
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
        const markerInputs: BloodMarkerInput[] = markers
          .map((marker) => {
            const markerId = normalizeMarkerName(String(marker.markerId || marker.code || marker.name || ""));
            const value = Number(marker.value);
            const unit = typeof marker.unit === "string" ? marker.unit : undefined;
            return { markerId, value, unit };
          })
          .filter((marker) => marker.markerId && Number.isFinite(marker.value));

        const profileGender = profile.gender === "femme" ? "femme" : "homme";
        const profileAge =
          typeof profile.age === "string"
            ? profile.age
            : typeof profile.dob === "string"
            ? (() => {
                const dob = new Date(profile.dob);
                if (Number.isNaN(dob.getTime())) return undefined;
                return String(Math.floor((Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000)));
              })()
            : undefined;

        const recomputedAnalysis =
          markerInputs.length > 0
            ? await analyzeBloodwork(markerInputs, {
                gender: profileGender,
                age: profileAge,
                objectives: undefined,
                medications: undefined,
              })
            : null;

        const recomputedByMarkerId = new Map(
          (recomputedAnalysis?.markers || []).map((marker) => [marker.markerId, marker])
        );

        let formattedMarkers = markers
          .map((marker) => {
            const markerId = normalizeMarkerName(String(marker.markerId || marker.code || marker.name || ""));
            if (!markerId) return null;
            const value = Number(marker.value);
            if (!Number.isFinite(value)) return null;
            const range = BIOMARKER_RANGES[markerId];
            const recomputed = recomputedByMarkerId.get(markerId);
            const status = recomputed?.status || normalizeMarkerStatus(marker.status);
            return {
              name:
                String(marker.name || "").trim() ||
                recomputed?.name ||
                range?.name ||
                markerId,
              code: markerId,
              category: CATEGORY_BY_MARKER[markerId] || "general",
              value,
              unit:
                String(marker.unit || "").trim() ||
                recomputed?.unit ||
                range?.unit ||
                "",
              refMin:
                marker.refMin != null
                  ? Number(marker.refMin)
                  : range?.normalMin ?? null,
              refMax:
                marker.refMax != null
                  ? Number(marker.refMax)
                  : range?.normalMax ?? null,
              optimalMin:
                marker.optimalMin != null
                  ? Number(marker.optimalMin)
                  : range?.optimalMin ?? null,
              optimalMax:
                marker.optimalMax != null
                  ? Number(marker.optimalMax)
                  : range?.optimalMax ?? null,
              status,
              interpretation:
                String(marker.interpretation || "").trim() ||
                recomputed?.interpretation ||
                "",
            };
          })
          .filter(Boolean) as Array<{
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
            interpretation: string;
          }>;

        if (!formattedMarkers.length && recomputedAnalysis) {
          formattedMarkers = recomputedAnalysis.markers.map((marker) => {
            const range = BIOMARKER_RANGES[marker.markerId];
            return {
              name: marker.name,
              code: marker.markerId,
              category: CATEGORY_BY_MARKER[marker.markerId] || "general",
              value: marker.value,
              unit: marker.unit || range?.unit || "",
              refMin: range?.normalMin ?? null,
              refMax: range?.normalMax ?? null,
              optimalMin: range?.optimalMin ?? null,
              optimalMax: range?.optimalMax ?? null,
              status: marker.status,
              interpretation: marker.interpretation || "",
            };
          });
        }

        const globalScore = computeGlobalScoreFromStatuses(
          formattedMarkers.map((marker) => marker.status)
        );
        const globalLevel = getGlobalLevel(globalScore);

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
          patterns: (recomputedAnalysis?.patterns || analysis.patterns || []) as any[],
          analysis: {
            globalScore,
            globalLevel,
            summary: recomputedAnalysis?.summary || analysis.summary || { optimal: [], watch: [], action: [] },
            patterns: recomputedAnalysis?.patterns || analysis.patterns || [],
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

      const hasAnthropicKey = Boolean(process.env.ANTHROPIC_API_KEY);
      let aiReport = "";
      let aiCreditBalanceLow = false;
      if (hasAnthropicKey) {
        const aiCandidate = await generateAiReportWithAttempts(
          basicAnalysis,
          profileWithAge,
          knowledgeContext,
          "blood-analysis/full-analysis",
          2
        );
        if (aiCandidate === AI_CREDIT_BALANCE_LOW_SENTINEL) {
          aiCreditBalanceLow = true;
          aiReport = "";
        } else {
          aiReport = aiCandidate;
        }
      } else {
        aiReport = "";
        if (ALLOW_DETERMINISTIC_FALLBACK) {
          console.warn(
            "[BloodAnalysis] Full analysis: Anthropic key missing; fallback mode enabled by env but disabled for delivery."
          );
        } else {
          console.warn("[BloodAnalysis] Full analysis: Anthropic key missing; fallback disabled.");
        }
      }

      const aiStatus =
        !aiReport && (!hasAnthropicKey || aiCreditBalanceLow)
          ? "unavailable"
          : hasAnthropicKey && !aiReport
          ? "processing"
          : "completed";

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
        aiStatus,
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

      const hasAnthropicKey = Boolean(process.env.ANTHROPIC_API_KEY);
      let aiReport = "";
      let aiCreditBalanceLow = false;
      if (hasAnthropicKey) {
        const aiCandidate = await generateAiReportWithAttempts(
          basicAnalysis,
          profileWithAge,
          knowledgeContext,
          "blood-analysis/comprehensive-report",
          2
        );
        if (aiCandidate === AI_CREDIT_BALANCE_LOW_SENTINEL) {
          aiCreditBalanceLow = true;
          aiReport = "";
        } else {
          aiReport = aiCandidate;
        }
      } else {
        aiReport = "";
        if (ALLOW_DETERMINISTIC_FALLBACK) {
          console.warn(
            "[BloodAnalysis] Comprehensive report: Anthropic key missing; fallback mode enabled by env but disabled for delivery."
          );
        } else {
          console.warn("[BloodAnalysis] Comprehensive report: Anthropic key missing; fallback disabled.");
        }
      }

      const aiStatus =
        !aiReport && (!hasAnthropicKey || aiCreditBalanceLow)
          ? "unavailable"
          : hasAnthropicKey && !aiReport
          ? "processing"
          : "completed";

      res.json({
        success: true,
        extractedPatient,
        markersFound: resolvedMarkers.length,
        report: comprehensiveReport,
        aiNarrative: aiReport,
        aiStatus,
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
