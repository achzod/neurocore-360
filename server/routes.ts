import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage, reviewStorage, PROMO_CODES_BY_AUDIT_TYPE } from "./storage";
import { saveProgressSchema, insertAuditSchema, insertReviewSchema } from "@shared/schema";
import { z } from "zod";
import { getUncachableStripeClient, getStripePublishableKey } from "./stripeClient";
import { generateFullAnalysis } from "./analysisEngine";
import { startReportGeneration, getJobStatus, forceRegenerate } from "./reportJobManager";
import {
  sendMagicLinkEmail,
  sendReportReadyEmail,
  sendAdminEmailNewAudit,
  sendGratuitUpsellEmail,
  sendPremiumJ7Email,
  sendPremiumJ14Email,
  sendPromoCodeEmail,
  sendAdminReviewNotification,
  addSubscriberToList,
  sendApexLabsWelcomeEmail,
} from "./emailService";
import { generateExportHTML, generateExportPDF } from "./exportService";
import { generateAndConvertAuditWithClaude } from "./anthropicEngine";
import { formatTxtToDashboard, formatSectionToHTML, getSectionsByCategory } from "./formatDashboard";
import { ClientData, PhotoAnalysis } from "./types";
import { generateEnhancedSupplementsHTML, generateSupplementStack } from "./supplementEngine";
import { streamAuditZip } from "./exportZipService";
import { isAnthropicAvailable } from "./anthropicEngine";
import { validateAnthropicConfig, ANTHROPIC_CONFIG } from "./anthropicConfig";
import {
  generateTerraWidget,
  getTerraUserData,
  mapTerraDataToAnswers,
  handleTerraWebhook,
  isTerraConfigured,
  getSupportedProviders,
  TERRA_PROVIDERS,
} from "./terraService";
import { registerKnowledgeRoutes } from "./knowledge";
import { registerBloodAnalysisRoutes } from "./blood-analysis/routes";
import { registerBurnoutRoutes } from "./burnout-detection";
import { analyzeDiscoveryScan, convertToNarrativeReport } from "./discovery-scan";
import {
  scrapeArticleFromUrl,
  translateArticleToFrench,
  estimateReadTimeFromWords,
  buildExcerpt,
  slugify,
} from "./blogImport";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // Redirect root to /apexlabs for prelaunch subdomain
  app.use((req, res, next) => {
    const host = req.get('host') || '';
    if (host.includes('apexlabsprelaunch') && req.path === '/') {
      return res.redirect(301, '/apexlabs');
    }
    next();
  });

  // Helper function to get base URL
  function getBaseUrl(): string {
    if (process.env.RENDER_EXTERNAL_URL) {
      return process.env.RENDER_EXTERNAL_URL;
    } else if (process.env.REPLIT_DOMAINS) {
      const replitDomain = process.env.REPLIT_DOMAINS.split(',')[0];
      return `https://${replitDomain}`;
    } else {
      return `http://localhost:${process.env.PORT || 5000}`;
    }
  }

  const PHOTO_FIELD_VARIANTS: string[][] = [
    ["photoFront", "photo-front"],
    ["photoSide", "photo-side"],
    ["photoBack", "photo-back"],
  ];

  function extractPhotoValue(source: Record<string, unknown> | null | undefined, keys: string[]): string | null {
    if (!source) return null;
    for (const key of keys) {
      const value = (source as any)?.[key];
      if (typeof value === "string" && value.trim().length > 0) {
        return value;
      }
    }
    return null;
  }

  function extractPhotosFromAudit(audit: any): string[] {
    const out: string[] = [];
    // 1) audit.photos (si jamais on a un tableau)
    if (audit?.photos && Array.isArray(audit.photos)) {
      out.push(...audit.photos.filter((p: any) => typeof p === "string" && p.trim().length > 0));
    }
    // 2) audit.responses (flux principal)
    const r = audit?.responses || {};
    const responsePhotos = PHOTO_FIELD_VARIANTS
      .map((keys) => extractPhotoValue(r, keys))
      .filter((p): p is string => typeof p === "string" && p.trim().length > 0);
    out.push(...responsePhotos);
    // 3) legacy champs directs
    const legacy = PHOTO_FIELD_VARIANTS
      .map((keys) => extractPhotoValue(audit, keys))
      .filter((p): p is string => typeof p === "string" && p.trim().length > 0);
    out.push(...legacy);

    // Nettoyage: éviter les doublons
    const uniq = Array.from(new Set(out));
    return uniq;
  }

  function sanitizeUserText(input: unknown, maxLen: number): string {
    const s = typeof input === "string" ? input : String(input ?? "");
    return s
      .replace(/\u0000/g, "")
      .replace(/</g, "")
      .replace(/>/g, "")
      .trim()
      .slice(0, maxLen);
  }

  // Admin auth helper - checks ADMIN_SECRET or ADMIN_KEY
  function requireAdminAuth(req: any, res: any): boolean {
    const adminKey = req.headers["x-admin-key"] || req.query.key || req.body?.adminKey;
    const validKey = process.env.ADMIN_SECRET || process.env.ADMIN_KEY;
    if (!validKey || adminKey !== validKey) {
      res.status(401).json({ error: "Unauthorized - admin key required" });
      return false;
    }
    return true;
  }

  app.post("/api/questionnaire/save-progress", async (req, res) => {
    try {
      const data = saveProgressSchema.parse(req.body);
      const progress = await storage.saveProgress(data);
      res.json(progress);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Données invalides", details: error.errors });
      } else {
        res.status(500).json({ error: "Erreur serveur" });
      }
    }
  });

  app.get("/api/questionnaire/progress/:email", async (req, res) => {
    try {
      const progress = await storage.getProgress(req.params.email);
      if (!progress) {
        res.status(404).json({ error: "Aucune progression trouvée" });
        return;
      }
      res.json(progress);
    } catch (error) {
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  // Admin: Get all incomplete questionnaires
  app.get("/api/admin/incomplete-questionnaires", async (req, res) => {
    if (!requireAdminAuth(req, res)) return;
    try {
      const incomplete = await storage.getAllIncompleteProgress();
      res.json({ success: true, questionnaires: incomplete });
    } catch (error) {
      console.error("Error fetching incomplete questionnaires:", error);
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  const createAuditBodySchema = z.object({
    email: z.string().email(),
    type: z.enum(["GRATUIT", "PREMIUM", "ELITE"]),
    responses: z.record(z.unknown()),
  });

  const hasThreePhotos = (responses: Record<string, unknown>): boolean => {
    const pics = PHOTO_FIELD_VARIANTS
      .map((keys) => extractPhotoValue(responses, keys))
      .filter((p): p is string => typeof p === "string" && p.trim().length > 100);
    return pics.length === 3;
  };

  // Test endpoint for Claude API
  app.get("/api/test-claude", async (req, res) => {
    try {
      const isConfigured = validateAnthropicConfig();
      const hasKey = !!ANTHROPIC_CONFIG.ANTHROPIC_API_KEY;
      const keyPreview = hasKey
        ? `${ANTHROPIC_CONFIG.ANTHROPIC_API_KEY.substring(0, 8)}...${ANTHROPIC_CONFIG.ANTHROPIC_API_KEY.substring(ANTHROPIC_CONFIG.ANTHROPIC_API_KEY.length - 4)}`
        : "NOT SET";

      if (!isConfigured) {
        res.status(500).json({
          status: "error",
          message: "ANTHROPIC_API_KEY not configured",
          config: {
            hasKey,
            keyPreview,
            model: ANTHROPIC_CONFIG.ANTHROPIC_MODEL,
          }
        });
        return;
      }

      // Try a simple API call
      const Anthropic = require('@anthropic-ai/sdk').default;
      const client = new Anthropic({ apiKey: ANTHROPIC_CONFIG.ANTHROPIC_API_KEY });

      const response = await client.messages.create({
        model: ANTHROPIC_CONFIG.ANTHROPIC_MODEL,
        max_tokens: 100,
        messages: [{ role: "user", content: "Réponds simplement: OK" }],
      });

      const textContent = response.content.find((c: any) => c.type === 'text');
      const text = textContent?.text || "";

      res.json({
        status: "success",
        message: "Claude API is working",
        response: text,
        config: {
          model: ANTHROPIC_CONFIG.ANTHROPIC_MODEL,
          keyPreview,
        }
      });
    } catch (error: any) {
      console.error("[Test Claude] Error:", error);
      res.status(500).json({
        status: "error",
        message: error?.message || "Unknown error",
        details: {
          status: error?.status,
          type: error?.type,
        }
      });
    }
  });

  app.post("/api/audit/create", async (req, res) => {
    try {
      const data = createAuditBodySchema.parse(req.body);
      if (data.type === "GRATUIT") {
        const audit = await storage.createAudit({
          userId: "",
          type: data.type,
          email: data.email,
          responses: data.responses,
        });

        await storage.updateAudit(audit.id, { reportDeliveryStatus: "GENERATING" });
        res.json(audit);

        (async () => {
          try {
            const result = await analyzeDiscoveryScan(data.responses as any);
            const narrativeReport = await convertToNarrativeReport(result, data.responses as any);

            await storage.updateAudit(audit.id, {
              narrativeReport,
              reportDeliveryStatus: "READY",
            });

            const baseUrl = getBaseUrl();
            const emailSent = await sendReportReadyEmail(audit.email, audit.id, audit.type, baseUrl);
            if (emailSent) {
              await storage.updateAudit(audit.id, { reportDeliveryStatus: "SENT", reportSentAt: new Date() });
              const clientName = (data.responses as any)?.prenom || data.email.split("@")[0];
              await sendAdminEmailNewAudit(audit.email, clientName, audit.type, audit.id);
            }
          } catch (error) {
            console.error("[Discovery Scan] Generation error:", error);
            await storage.updateAudit(audit.id, { reportDeliveryStatus: "NEEDS_REVIEW" });
          }
        })();

        return;
      }
      // Photos obligatoires UNIQUEMENT pour Ultimate Scan (ELITE)
      if (data.type === "ELITE" && !hasThreePhotos(data.responses)) {
        res.status(400).json({ error: "NEED_PHOTOS", message: "3 photos obligatoires pour Ultimate Scan (face, profil, dos)" });
        return;
      }
      const audit = await storage.createAudit({
        userId: "",
        type: data.type,
        email: data.email,
        responses: data.responses,
      });

      await storage.updateAudit(audit.id, { reportDeliveryStatus: "GENERATING" });
      await startReportGeneration(audit.id, audit.responses, audit.scores || {}, audit.type);
      processReportAndSendEmail(audit.id, audit.email, audit.type);

      res.json(audit);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Données invalides", details: error.errors });
      } else {
        console.error("[Audit Create] Error:", error);
        res.status(500).json({ error: "Erreur serveur" });
      }
    }
  });

  async function processReportAndSendEmail(auditId: string, email: string, auditType: string) {
    // La génération peut être longue (throttling 429 + génération multi-sections)
    const maxWait = 45 * 60 * 1000;
    const startTime = Date.now();
    
    const waitForCompletion = async (): Promise<boolean> => {
      while (Date.now() - startTime < maxWait) {
        const status = await getJobStatus(auditId);
        if (status?.status === "completed") {
          return true;
        } else if (status?.status === "failed") {
          return false;
        }
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
      return false;
    };

    const success = await waitForCompletion();

    try {
    if (success) {
      const baseUrl = getBaseUrl();
      console.log(`[Email] Using baseUrl: ${baseUrl} for audit ${auditId}`);

      // Récupérer l'audit pour vérifier la validation
      const completedAudit = await storage.getAudit(auditId);
      const clientName = (completedAudit as any)?.narrativeReport?.clientName || email.split('@')[0];
      const validationResult = (completedAudit as any)?.narrativeReport?.validationResult;
      const deliveryStatus = (completedAudit as any)?.reportDeliveryStatus;

      // ============================================
      // CHECK: Ne pas envoyer si validation échouée
      // ============================================
      if (deliveryStatus === 'NEEDS_REVIEW') {
        console.error(`[Email] ❌ Report ${auditId} nécessite révision manuelle - EMAIL NON ENVOYÉ`);
        console.error(`[Email] Validation score: ${validationResult?.score || 'N/A'}`);
        console.error(`[Email] Erreurs: ${validationResult?.errors?.join(', ') || 'N/A'}`);
        return;
      }

      // Double-check validation score
      if (validationResult && validationResult.score < 60) {
        console.error(`[Email] ❌ Report ${auditId} score trop bas (${validationResult.score}/100) - EMAIL NON ENVOYÉ`);
        await storage.updateAudit(auditId, { reportDeliveryStatus: "NEEDS_REVIEW" });
        return;
      }

      await storage.updateAudit(auditId, { reportDeliveryStatus: "READY" });

      console.log(`[Email] ✅ Validation OK (score: ${validationResult?.score || 'N/A'}/100) - Sending email to ${email}`);
      const emailSent = await sendReportReadyEmail(email, auditId, auditType, baseUrl);
      if (emailSent) {
        await storage.updateAudit(auditId, { reportDeliveryStatus: "SENT", reportSentAt: new Date() });
        console.log(`[Email] ✅ Report ready email sent successfully to ${email} for audit ${auditId}`);
        
        // Envoyer email admin en copie
        console.log(`[Email] Sending admin notification email for audit ${auditId}`);
        const adminEmailSent = await sendAdminEmailNewAudit(email, clientName, auditType, auditId);
        if (adminEmailSent) {
          console.log(`[Email] ✅ Admin notification email sent successfully for audit ${auditId}`);
        } else {
          console.error(`[Email] ❌ Admin notification email FAILED for audit ${auditId}`);
        }
      } else {
        console.error(`[Email] ❌ Report ready email FAILED for audit ${auditId} - check SendPulse config`);
        await storage.updateAudit(auditId, { reportDeliveryStatus: "READY" });
      }
    } else {
      await storage.updateAudit(auditId, { reportDeliveryStatus: "PENDING" });
      console.error(`[Email] ❌ Report generation failed or timeout for audit ${auditId}`);
    }
    } catch (error) {
      console.error(`[Email] ❌ Error in processReportAndSendEmail for audit ${auditId}:`, error);
      await storage.updateAudit(auditId, { reportDeliveryStatus: "READY" });
    }
  }

  app.get("/api/audits", async (req, res) => {
    try {
      const email = req.query.email as string;
      if (!email) {
        res.status(400).json({ error: "Email requis" });
        return;
      }
      const audits = await storage.getAuditsByEmail(email);
      res.json(audits);
    } catch (error) {
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  app.get("/api/audits/:id", async (req, res) => {
    try {
      const audit = await storage.getAudit(req.params.id);
      if (!audit) {
        res.status(404).json({ error: "Audit non trouvé" });
        return;
      }
      res.json(audit);
    } catch (error) {
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  app.get("/api/audits/:id/analysis", async (req, res) => {
    try {
      const audit = await storage.getAudit(req.params.id);
      if (!audit) {
        res.status(404).json({ error: "Audit non trouvé" });
        return;
      }
      const analysis = generateFullAnalysis(audit.responses);
      res.json(analysis);
    } catch (error) {
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  app.post("/api/audits/:id/generate-narrative", async (req, res) => {
    try {
      const audit = await storage.getAudit(req.params.id);
      if (!audit) {
        res.status(404).json({ error: "Audit non trouvé" });
        return;
      }
      const job = await startReportGeneration(
        audit.id,
        audit.responses,
        audit.scores || {},
        audit.type
      );
      res.json({ 
        status: job.status, 
        progress: job.progress, 
        currentSection: job.currentSection 
      });
    } catch (error) {
      console.error("[Narrative] Start error:", error);
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  app.get("/api/audits/:id/narrative-status", async (req, res) => {
    try {
      const job = await getJobStatus(req.params.id);
      if (!job) {
        res.json({ status: "not_started", progress: 0, currentSection: "" });
        return;
      }
      res.json({
        status: job.status,
        progress: job.progress,
        currentSection: job.currentSection,
        error: job.error
      });
    } catch (error) {
      console.error("[Narrative] Status error:", error);
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  app.get("/api/audits/:id/dashboard", async (req, res) => {
    try {
      const audit = await storage.getAudit(req.params.id);
      if (!audit) {
        res.status(404).json({ error: "Audit non trouvé" });
        return;
      }
      
      const narrativeReport = audit.narrativeReport as any;
      if (!narrativeReport?.txt) {
        res.status(400).json({ error: "Rapport non disponible" });
        return;
      }
      
      const dashboard = formatTxtToDashboard(narrativeReport.txt);
      
      const category = req.query.category as string;
      if (category) {
        const filteredSections = getSectionsByCategory(dashboard, category as any);
        res.json({ ...dashboard, sections: filteredSections });
        return;
      }
      
      res.json(dashboard);
    } catch (error) {
      console.error("[Dashboard] Error:", error);
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  // Helper: Parse supplements from TXT content
  function parseSupplementsFromTxt(txt: string): { name: string; dosage: string; timing: string; reason: string; duration: string; evidence: string }[] {
    const supplements: { name: string; dosage: string; timing: string; reason: string; duration: string; evidence: string }[] = [];

    // Find STACK section
    const stackMatch = txt.match(/STACK CIBLEE.*?(?=\n\n[A-Z]{3,}|\n={3,}|$)/s);
    if (!stackMatch) return supplements;

    const stackContent = stackMatch[0];

    // Parse each numbered supplement
    const suppRegex = /(\d+)\.\s+([^\n]+)\n(?:.*?Dosage\s*:\s*([^\n]+))?(?:.*?Timing\s*:\s*([^\n]+))?(?:.*?Duree\s*\/\s*cycle\s*:\s*([^\n]+))?(?:.*?Pourquoi\s*:\s*([^\n]+))?(?:.*?Evidence\s*:\s*([^\n]+))?/gs;

    let match;
    while ((match = suppRegex.exec(stackContent)) !== null) {
      const [, , name, dosage, timing, duration, reason, evidence] = match;
      if (name) {
        supplements.push({
          name: name.replace(/\([^)]+\)/g, '').trim(),
          dosage: dosage?.trim() || '',
          timing: timing?.trim() || '',
          reason: reason?.trim() || '',
          duration: duration?.trim() || '',
          evidence: evidence?.trim() || ''
        });
      }
    }

    // Fallback: simple line parsing if regex fails
    if (supplements.length === 0) {
      const lines = stackContent.split('\n');
      let currentSupp: any = null;

      for (const line of lines) {
        const numbered = line.match(/^(\d+)\.\s+(.+)/);
        if (numbered) {
          if (currentSupp) supplements.push(currentSupp);
          currentSupp = { name: numbered[2].split('(')[0].trim(), dosage: '', timing: '', reason: '', duration: '', evidence: '' };
        } else if (currentSupp) {
          if (line.includes('Dosage')) currentSupp.dosage = line.split(':')[1]?.trim() || '';
          if (line.includes('Timing')) currentSupp.timing = line.split(':')[1]?.trim() || '';
          if (line.includes('Pourquoi')) currentSupp.reason = line.split(':')[1]?.trim() || '';
          if (line.includes('Duree')) currentSupp.duration = line.split(':')[1]?.trim() || '';
          if (line.includes('Evidence')) currentSupp.evidence = line.split(':')[1]?.trim() || '';
        }
      }
      if (currentSupp) supplements.push(currentSupp);
    }

    return supplements;
  }

  app.get("/api/audits/:id/narrative", async (req, res) => {
    try {
      const audit = await storage.getAudit(req.params.id);
      if (!audit) {
        res.status(404).json({ error: "Audit non trouve" });
        return;
      }

      if (audit.narrativeReport) {
        const report = audit.narrativeReport as any;
        // Si c'est le nouveau format TXT (V4 Pro), on le convertit au format dashboard
        // pour que le frontend puisse l'afficher sans tout casser
        if (report.txt) {
          const dashboard = formatTxtToDashboard(report.txt);
          const auditScores = audit.scores || {};
          const globalScore =
            typeof auditScores.global === "number"
              ? auditScores.global
              : (dashboard.global ?? 76);
          const firstName =
            (audit.responses as any)?.prenom ||
            (audit.email ? audit.email.split("@")[0] : "Profil");
          const supplementStack = generateSupplementStack({
            responses: (audit.responses as any) || {},
            globalScore,
          });
          const supplementsHtml = generateEnhancedSupplementsHTML({
            responses: (audit.responses as any) || {},
            globalScore,
            firstName,
          });
          // Helper pour calculer le level
          const getLevel = (score: number): "excellent" | "bon" | "moyen" | "faible" => {
            if (score >= 80) return "excellent";
            if (score >= 65) return "bon";
            if (score >= 50) return "moyen";
            return "faible";
          };

          const normalizeTitle = (value: string) =>
            value
              .toLowerCase()
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
              .replace(/[^a-z0-9]+/g, ' ')
              .trim();

          const averageScores = (values: Array<number | undefined>): number | null => {
            const usable = values.filter((v): v is number => typeof v === "number" && !Number.isNaN(v));
            if (usable.length === 0) return null;
            const sum = usable.reduce((acc, val) => acc + val, 0);
            return Math.round(sum / usable.length);
          };

          const resolveScoreFromTitle = (title: string): number | null => {
            const t = normalizeTitle(title);

            if (t.includes("metabolisme") && t.includes("nutrition")) {
              return averageScores([auditScores.metabolismeenergie, auditScores.nutritiontracking]);
            }
            if (t.includes("nutrition")) return auditScores.nutritiontracking ?? null;
            if (t.includes("metabolisme") || t.includes("energie")) return auditScores.metabolismeenergie ?? null;
            if (t.includes("sommeil") || t.includes("recuperation")) return auditScores.sommeilrecuperation ?? null;
            if (t.includes("digestion") || t.includes("microbiote")) return auditScores.digestionmicrobiome ?? null;
            if (t.includes("cardio") || t.includes("hrv") || t.includes("cardiovasculaire")) return auditScores.hrvcardiaque ?? null;
            if (t.includes("entrainement") || t.includes("performance") || t.includes("activite")) return auditScores.activiteperformance ?? null;
            if (t.includes("hormon")) return auditScores.hormonesstress ?? null;
            if (t.includes("biomarque")) return auditScores.analysesbiomarqueurs ?? null;
            if (t.includes("lifestyle") || t.includes("substances") || t.includes("mode de vie")) return auditScores.lifestylesubstances ?? null;
            if (t.includes("biomecanique") || t.includes("mobilite") || t.includes("postur")) return auditScores.biomecaniquemobilite ?? null;
            if (t.includes("composition")) return auditScores.compositioncorporelle ?? null;
            if (t.includes("profil")) return auditScores.profilbase ?? null;
            if (t.includes("neurotransmetteurs")) return auditScores.neurotransmetteurs ?? null;
            return null;
          };

          const resolveScoreFromSection = (section: { id: string; title: string }): number | null => {
            const combined = `${section.title} ${section.id}`;
            return resolveScoreFromTitle(combined);
          };

          const scoreCardio = averageScores([auditScores.hrvcardiaque, auditScores.cardioendurance]);
          const scoreMetabo = averageScores([auditScores.metabolismeenergie, auditScores.nutritiontracking]);
          const isElite = audit.type === "ELITE";
          const analysisScoreFallbackOrder: Array<number | null> = isElite
            ? [
                auditScores.biomecaniquemobilite ?? null,
                auditScores.biomecaniquemobilite ?? null,
                auditScores.activiteperformance ?? null,
                scoreCardio,
                scoreMetabo,
                auditScores.sommeilrecuperation ?? null,
                auditScores.digestionmicrobiome ?? null,
                auditScores.hormonesstress ?? null,
              ]
            : [
                auditScores.activiteperformance ?? null,
                scoreCardio,
                scoreMetabo,
                auditScores.sommeilrecuperation ?? null,
                auditScores.digestionmicrobiome ?? null,
                auditScores.hormonesstress ?? null,
              ];
          let analysisIndex = 0;

          // On mappe le format dashboard vers le format attendu par AuditDetail.tsx
          const mappedSections = dashboard.sections
            .filter(s => s.category !== 'executive' && s.category !== 'supplements')
            .map(s => {
              const scoreFromAudit = resolveScoreFromSection(s);
              const fallbackScore =
                s.category === "analysis" ? analysisScoreFallbackOrder[analysisIndex] ?? null : null;
              if (s.category === "analysis") analysisIndex += 1;
              const sectionScore =
                scoreFromAudit ??
                fallbackScore ??
                (s.score > 0 && s.score <= 100 ? s.score : globalScore);
              const sectionHtml = formatSectionToHTML(s);
              return {
                id: s.id,
                title: s.title,
                score: sectionScore,
                level: getLevel(sectionScore),
                isPremium: true,
                introduction: sectionHtml,
                whatIsWrong: "",
                personalizedAnalysis: "",
                recommendations: "",
                supplements: [],
                actionPlan: "",
                scienceDeepDive: ""
              };
            });

          const analysisSectionIds = new Set(
            dashboard.sections.filter(s => s.category === "analysis").map(s => s.id)
          );
          const analysisSections = mappedSections.filter(s => analysisSectionIds.has(s.id));
          const radarFallbackSections = analysisSections.length > 0 ? analysisSections : mappedSections;

          const RADAR_LABELS: Record<string, string> = {
            'analyse-entrainement-et-periodisation': 'Entrainement',
            'analyse-systeme-cardiovasculaire': 'Cardio',
            'analyse-metabolisme-et-nutrition': 'Metabolisme',
            'analyse-sommeil-et-recuperation': 'Sommeil',
            'analyse-digestion-et-microbiote': 'Digestion',
            'analyse-axes-hormonaux': 'Hormones',
            'analyse-visuelle-et-posturale-complete': 'Posture',
            'analyse-biomecanique-et-sangle-profonde': 'Biomeca',
            'analyse-energie-et-recuperation': 'Energie',
          };

          const resolveRadarLabel = (section: { id: string; title: string }) => {
            const byId = RADAR_LABELS[section.id];
            if (byId) return byId;
            const title = normalizeTitle(`${section.title} ${section.id}`);
            if (title.includes("entrainement")) return "Entrainement";
            if (title.includes("cardio") || title.includes("cardiovasculaire") || title.includes("hrv")) return "Cardio";
            if (title.includes("metabolisme") || title.includes("nutrition")) return "Metabolisme";
            if (title.includes("sommeil")) return "Sommeil";
            if (title.includes("digestion")) return "Digestion";
            if (title.includes("hormon")) return "Hormones";
            if (title.includes("postur") || title.includes("biomecanique")) return "Posture";
            if (title.includes("energie")) return "Energie";
            const words = section.title.trim().split(/\s+/);
            return words.length > 1 ? words.slice(0, 2).join(" ") : section.title;
          };

          const toRadarValue = (score: number | null | undefined) => {
            if (typeof score !== "number" || Number.isNaN(score)) return null;
            return Math.round((score / 10) * 10) / 10;
          };

          const radarFromScores = [
            { label: "Entrainement", score: auditScores.activiteperformance },
            { label: "Cardio", score: scoreCardio },
            { label: "Metabolisme", score: scoreMetabo },
            { label: "Sommeil", score: auditScores.sommeilrecuperation },
            { label: "Digestion", score: auditScores.digestionmicrobiome },
            { label: "Hormones", score: auditScores.hormonesstress },
            { label: "Posture", score: auditScores.biomecaniquemobilite },
            { label: "Mental", score: auditScores.psychologiemental }
          ]
            .map(item => ({
              label: item.label,
              score: typeof item.score === "number" ? item.score : null
            }))
            .filter(item => typeof item.score === "number");

          const radarMetrics =
            radarFromScores.length >= 4
              ? radarFromScores.slice(0, 8).map(item => ({
                  label: item.label,
                  value: toRadarValue(item.score) || Math.round((globalScore / 10) * 10) / 10,
                  max: 10,
                  description: item.label,
                  key: item.label.toLowerCase().replace(/\s+/g, '-')
                }))
              : radarFallbackSections.slice(0, 8).map(section => ({
                  label: resolveRadarLabel(section),
                  value: toRadarValue(section.score) || Math.round((globalScore / 10) * 10) / 10,
                  max: 10,
                  description: section.title,
                  key: section.id
                }));

          const mappedReport = {
            global: globalScore,
            heroSummary: dashboard.resumeExecutif || "",
            executiveNarrative: dashboard.resumeExecutif || "",
            globalDiagnosis: "",
            auditType: audit.type,
            sections: mappedSections,
            prioritySections: [] as string[],
            strengthSections: [] as string[],
            radarMetrics,
            supplementStack: supplementStack,
            supplementsHtml,
            ctaDebut: dashboard.ctaDebut,
            ctaFin: dashboard.ctaFin,
            lifestyleProtocol: "",
            weeklyPlan: {
              week1: "Mise en place des fondations: posture, respiration, activation neuromusculaire",
              week2: "Consolidation des habitudes et ajustements selon ressentis",
              weeks3_4: "Intensification progressive et optimisation des protocoles",
              months2_3: "Maintenance et cycles de progression avancee"
            },
            conclusion: "Ce rapport constitue une feuille de route personnalisee basee sur ton profil unique. Applique ces recommandations de maniere progressive et constante pour des resultats durables.",
            auditType: audit.type,
            clientName: dashboard.clientName,
            generatedAt: dashboard.generatedAt,
            photoAnalysis: report.photoAnalysis || null
          };

          mappedReport.prioritySections = analysisSections
            .filter(s => s.score < 60)
            .slice(0, 3)
            .map(s => s.id);
          mappedReport.strengthSections = analysisSections
            .filter(s => s.score >= 70)
            .slice(0, 3)
            .map(s => s.id);

          res.json(mappedReport);
          return;
        }
        
        res.json({ ...(audit.narrativeReport as any), auditType: (audit as any).type });
        return;
      }
      
      const job = await getJobStatus(req.params.id);
      if (job && job.status === "completed") {
        const freshAudit = await storage.getAudit(req.params.id);
        if (freshAudit?.narrativeReport) {
          res.json(freshAudit.narrativeReport);
          return;
        }
      }
      
      if (job && (job.status === "pending" || job.status === "generating")) {
        res.status(202).json({ 
          message: "Rapport en cours de generation",
          status: job.status,
          progress: job.progress,
          currentSection: job.currentSection
        });
        return;
      }
      
      if ((audit.reportDeliveryStatus === "SENT" || audit.reportDeliveryStatus === "READY") && !audit.narrativeReport) {
        console.log(`[Narrative] Regenerating lost report for audit ${req.params.id}`);
        await storage.updateAudit(req.params.id, { reportDeliveryStatus: "GENERATING" });
        await startReportGeneration(req.params.id, audit.responses, audit.scores || {}, audit.type);
        processReportAndSendEmail(req.params.id, audit.email, audit.type);
        res.status(202).json({ message: "Rapport en cours de regeneration", status: "generating", progress: 0 });
        return;
      }
      
      res.status(404).json({ error: "Rapport non disponible" });
    } catch (error) {
      console.error("[Narrative] Fetch error:", error);
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  app.post("/api/auth/magic-link", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email || !email.includes("@")) {
        res.status(400).json({ error: "Email invalide" });
        return;
      }

      let user = await storage.getUserByEmail(email);
      if (!user) {
        user = await storage.createUser({ email });
      }

      const token = await storage.createMagicToken(email);
      
      const baseUrl = getBaseUrl();
      const emailSent = await sendMagicLinkEmail(email, token, baseUrl);
      
      if (emailSent) {
        res.json({ success: true, message: "Lien magique envoyé" });
      } else {
        console.log(`[Auth] Magic link for ${email}: ${baseUrl}/auth/verify?token=${token}&email=${encodeURIComponent(email)}`);
        res.json({ success: true, message: "Lien magique envoyé" });
      }
    } catch (error) {
      console.error("[Auth] Error:", error);
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  app.get("/api/auth/verify", async (req, res) => {
    try {
      const { token, email } = req.query;
      if (!token || !email) {
        res.status(400).json({ error: "Token ou email manquant" });
        return;
      }

      const verifiedEmail = await storage.verifyMagicToken(token as string);
      if (!verifiedEmail || verifiedEmail !== email) {
        res.status(401).json({ error: "Lien invalide ou expiré" });
        return;
      }

      res.json({ success: true, email: verifiedEmail });
    } catch (error) {
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  app.post("/api/auth/check-email", async (req, res) => {
    try {
      const { email } = req.body;
      const user = await storage.getUserByEmail(email);
      res.json({ exists: !!user });
    } catch (error) {
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  app.get("/api/config/delivery-mode", async (req, res) => {
    const mode = process.env.DELIVERY_MODE || "instant";
    res.json({ 
      mode,
      delays: {
        GRATUIT: 24,
        PREMIUM: 48,
        ELITE: 48
      }
    });
  });

  app.post("/api/admin/process-pending-reports", async (req, res) => {
    const { adminKey } = req.body;
    
    if (!process.env.ADMIN_KEY || adminKey !== process.env.ADMIN_KEY) {
      res.status(401).json({ error: "Non autorise" });
      return;
    }

    try {
      const pendingAudits = await storage.getPendingAudits();
      const queued: string[] = [];

      for (const audit of pendingAudits) {
        await storage.updateAudit(audit.id, { reportDeliveryStatus: "GENERATING" });
        
        await startReportGeneration(audit.id, audit.responses, audit.scores, audit.type);
        queued.push(audit.id);

        processReportAsync(audit.id, audit.email, audit.type);
      }

      res.json({ 
        message: `${queued.length} rapport(s) en cours de generation`, 
        queued 
      });
    } catch (error) {
      console.error("[Admin] Error processing pending reports:", error);
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  // ==================== BLOG IMPORT / TRANSLATION ====================

  /**
   * POST /api/admin/blog/translate-url
   * Admin-only: prend une URL d'article, le scrape, puis renvoie une version FR rebrandée ACHZOD.
   * Usage prévu : générer facilement un bloc `BlogArticle` à coller dans client/src/data/*.ts
   *
   * Body:
   * - url: string (obligatoire)
   * - cta?: string (optionnel, bloc markdown à injecter en bas)
   * - category?: string (optionnel, ex: "sommeil", "sarms", "peptides")
   * - slug?: string (optionnel, sinon auto-slug depuis le titre FR)
   * - image?: string (optionnel, URL d'image)
   * - featured?: boolean
   */
  app.post("/api/admin/blog/translate-url", async (req, res) => {
    if (!requireAdminAuth(req, res)) return;
    try {
      const { url, cta, category, slug, image, featured } = req.body || {};

      if (!url || typeof url !== "string") {
        res.status(400).json({ success: false, error: "Paramètre 'url' requis" });
        return;
      }

      const scraped = await scrapeArticleFromUrl(url);
      const translated = await translateArticleToFrench({
        scraped,
        cta: typeof cta === "string" && cta.trim().length > 0 ? cta : undefined,
      });

      const readTime = estimateReadTimeFromWords(scraped.wordCount);
      const excerpt = buildExcerpt(translated.contentFr);
      const finalSlug =
        typeof slug === "string" && slug.trim().length > 0
          ? slug
          : slugify(translated.titleFr || scraped.title);

      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10);

      // Shape prêt à être copié dans BlogArticle (client)
      const articleForTs = {
        id: "REPLACE_WITH_ID",
        slug: finalSlug,
        title: translated.titleFr,
        excerpt,
        category: typeof category === "string" && category.trim().length > 0 ? category : "musculation",
        author: "ACHZOD",
        date: dateStr,
        readTime,
        image:
          typeof image === "string" && image.trim().length > 0
            ? image
            : "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=1200",
        featured: Boolean(featured),
        content: translated.contentFr,
      };

      res.json({
        success: true,
        scraped: {
          url: scraped.url,
          domain: scraped.domain,
          title: scraped.title,
          wordCount: scraped.wordCount,
        },
        translated: {
          titleFr: translated.titleFr,
          wordCountFr: translated.contentFr.split(/\s+/).filter(Boolean).length,
        },
        articleForTs,
      });
    } catch (error: any) {
      console.error("[Admin Blog Translate] Error:", error);
      res.status(500).json({
        success: false,
        error: error?.message || "Erreur serveur",
      });
    }
  });

  // ============================================
  // TERRA API ROUTES - Wearables Integration
  // ============================================

  // Get supported wearable providers
  app.get("/api/terra/providers", async (req, res) => {
    try {
      const providers = getSupportedProviders();
      res.json({
        configured: isTerraConfigured(),
        providers,
      });
    } catch (error) {
      console.error("[Terra] Error getting providers:", error);
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  // Generate Terra widget session for user authentication
  app.post("/api/terra/connect", async (req, res) => {
    try {
      const { userId, providers, redirectUrl } = req.body;

      if (!userId) {
        res.status(400).json({ error: "userId requis" });
        return;
      }

      if (!isTerraConfigured()) {
        res.status(503).json({
          error: "Terra API non configurée",
          message: "La synchronisation des wearables sera disponible prochainement."
        });
        return;
      }

      // IMPORTANT: use_terra_avengers_app=true pour Apple Health via Terra Avengers app
      // L'utilisateur DOIT avoir l'app Terra Avengers installée sur iPhone
      // Le widget redirige vers l'app qui demande les permissions HealthKit
      const widget = await generateTerraWidget(
        userId,
        "neurocore",  // sitePrefix for multi-site dispatcher
        providers,    // optional provider filter
        redirectUrl,  // optional redirect URL
        true          // use_terra_avengers_app = true (OBLIGATOIRE pour Apple Health)
      );

      if (!widget) {
        res.status(500).json({ error: "Erreur génération widget Terra" });
        return;
      }

      res.json({
        success: true,
        widgetUrl: widget.url,
        sessionId: widget.sessionId,
        referenceId: widget.referenceId,
      });
    } catch (error) {
      console.error("[Terra] Error generating widget:", error);
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  // Get synced data for a user
  app.get("/api/terra/data/:terraUserId", async (req, res) => {
    try {
      const { terraUserId } = req.params;

      if (!isTerraConfigured()) {
        res.status(503).json({ error: "Terra API non configurée" });
        return;
      }

      const data = await getTerraUserData(terraUserId);

      if (!data) {
        res.status(404).json({ error: "Données non trouvées" });
        return;
      }

      // Map to questionnaire answers
      const mapped = mapTerraDataToAnswers(data);

      res.json({
        success: true,
        rawData: data,
        mappedAnswers: mapped.answers,
        skippedQuestions: mapped.skippedQuestionIds,
      });
    } catch (error) {
      console.error("[Terra] Error fetching data:", error);
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  // Terra webhook endpoint
  app.post("/api/terra/webhook", async (req, res) => {
    try {
      const signature = req.headers["terra-signature"] as string || "";
      const result = await handleTerraWebhook(req.body, signature);

      if (result.success) {
        res.json({ status: "ok", message: result.message });
      } else {
        res.status(400).json({ error: result.message });
      }
    } catch (error) {
      console.error("[Terra] Webhook error:", error);
      res.status(500).json({ error: "Erreur webhook" });
    }
  });

  // Get all Terra data stored in DB (admin endpoint)
  app.get("/api/terra/db/all", async (_req, res) => {
    try {
      const data = await storage.getAllTerraData(100);
      res.json({ success: true, count: data.length, data });
    } catch (error) {
      console.error("[Terra] Error fetching DB data:", error);
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  // Get Terra data by email
  app.get("/api/terra/db/email/:email", async (req, res) => {
    try {
      const data = await storage.getTerraDataByEmail(req.params.email);
      res.json({ success: true, count: data.length, data });
    } catch (error) {
      console.error("[Terra] Error fetching by email:", error);
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  // Get mapped Terra answers for questionnaire pre-fill
  app.get("/api/terra/answers/:email", async (req, res) => {
    try {
      const referenceId = typeof req.query.referenceId === "string" ? req.query.referenceId : "";
      const sinceMs = typeof req.query.since === "string" ? Number(req.query.since) : null;

      if (!referenceId) {
        res.json({ success: true, hasData: false, answers: {}, skippedQuestions: [], reason: "REFERENCE_REQUIRED" });
        return;
      }

      const records = await storage.getTerraDataByReference(referenceId);

      const filteredRecords = sinceMs
        ? records.filter((record) => {
            const createdAt = record.createdAt ? new Date(record.createdAt).getTime() : 0;
            return createdAt >= sinceMs;
          })
        : records;

      if (!filteredRecords || filteredRecords.length === 0) {
        res.json({ success: true, hasData: false, answers: {}, skippedQuestions: [] });
        return;
      }

      // Aggregate data from all records
      const aggregated: Record<string, unknown> = {
        hrv: {},
        sleep: {},
        heart_rate: {},
        activity: {},
        body: {},
        calories: {},
      };

      for (const record of filteredRecords) {
        const data = record.data?.data?.[0] || record.data?.data || {};

        // HRV
        if (data.heart_rate_data?.summary?.avg_hrv_sdnn) {
          (aggregated.hrv as Record<string, unknown>).avg_hrv_sdnn = data.heart_rate_data.summary.avg_hrv_sdnn;
        }
        if (data.heart_rate_data?.summary?.avg_hrv_rmssd) {
          (aggregated.hrv as Record<string, unknown>).avg_hrv_rmssd = data.heart_rate_data.summary.avg_hrv_rmssd;
        }

        // Heart rate
        if (data.heart_rate_data?.summary) {
          const hr = data.heart_rate_data.summary;
          if (hr.avg_hr_bpm) (aggregated.heart_rate as Record<string, unknown>).hr_avg = hr.avg_hr_bpm;
          if (hr.min_hr_bpm) (aggregated.heart_rate as Record<string, unknown>).hr_min = hr.min_hr_bpm;
          if (hr.max_hr_bpm) (aggregated.heart_rate as Record<string, unknown>).hr_max = hr.max_hr_bpm;
          if (hr.resting_hr_bpm) (aggregated.heart_rate as Record<string, unknown>).hr_resting = hr.resting_hr_bpm;
        }

        // Sleep
        if (data.sleep_durations_data) {
          const sleep = data.sleep_durations_data;
          if (sleep.asleep?.duration_asleep_state_seconds) {
            (aggregated.sleep as Record<string, unknown>).duration_in_bed_seconds = sleep.other?.duration_in_bed_seconds || sleep.asleep.duration_asleep_state_seconds;
            (aggregated.sleep as Record<string, unknown>).duration_deep_sleep_state_seconds = sleep.asleep.duration_deep_sleep_state_seconds;
            (aggregated.sleep as Record<string, unknown>).duration_light_sleep_state_seconds = sleep.asleep.duration_light_sleep_state_seconds;
            (aggregated.sleep as Record<string, unknown>).duration_rem_sleep_state_seconds = sleep.asleep.duration_REM_sleep_state_seconds;
          }
          if (sleep.awake?.num_wakeup_events) {
            (aggregated.sleep as Record<string, unknown>).num_awakenings = sleep.awake.num_wakeup_events;
          }
        }

        // Activity
        if (data.distance_data) {
          const act = data.distance_data;
          if (act.steps) (aggregated.activity as Record<string, unknown>).steps = act.steps;
          if (act.distance_meters) (aggregated.activity as Record<string, unknown>).distance_meters = act.distance_meters;
          if (act.floors_climbed) (aggregated.activity as Record<string, unknown>).floors_climbed = act.floors_climbed;
        }

        // Calories
        if (data.calories_data) {
          const cal = data.calories_data;
          if (cal.BMR_calories) (aggregated.calories as Record<string, unknown>).bmr = cal.BMR_calories;
          if (cal.net_activity_calories) (aggregated.calories as Record<string, unknown>).active = cal.net_activity_calories;
          if (cal.total_burned_calories) (aggregated.calories as Record<string, unknown>).total = cal.total_burned_calories;
        }
      }

      // Map to questionnaire answers
      const mapped = mapTerraDataToAnswers(aggregated as any);
      if (Object.keys(mapped.answers).length === 0) {
        res.json({ success: true, hasData: false, answers: {}, skippedQuestions: [] });
        return;
      }

      const providerKey = String(filteredRecords[0]?.provider || "").toLowerCase();
      const providerAnswers: Record<string, string> = {
        apple: "apple",
        garmin: "garmin",
        oura: "oura",
        whoop: "whoop",
      };
      const providerAnswer = providerKey ? (providerAnswers[providerKey] || "autre") : "";
      if (providerAnswer && Object.keys(mapped.answers).length > 0 && !mapped.answers["montre-connectee"]) {
        mapped.answers["montre-connectee"] = providerAnswer;
        mapped.skippedQuestionIds = Array.from(new Set([...mapped.skippedQuestionIds, "montre-connectee"]));
      }

      res.json({
        success: true,
        hasData: true,
        provider: filteredRecords[0]?.provider || "WEARABLE",
        answers: mapped.answers,
        skippedQuestions: mapped.skippedQuestionIds,
        summary: mapped.summary,
      });
    } catch (error) {
      console.error("[Terra] Error mapping answers:", error);
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  // Check Terra connection status for an audit
  app.get("/api/terra/status/:auditId", async (req, res) => {
    try {
      const audit = await storage.getAudit(req.params.auditId);

      if (!audit) {
        res.status(404).json({ error: "Audit non trouvé" });
        return;
      }

      const responses = audit.responses as Record<string, unknown>;
      const terraData = responses?.terraData as Record<string, unknown> | undefined;
      const terraUserId = responses?.terraUserId as string | undefined;

      res.json({
        connected: !!terraUserId,
        terraUserId: terraUserId || null,
        provider: responses?.terraProvider || null,
        syncedData: terraData ? Object.keys(terraData) : [],
        skippedQuestions: (responses?.terraSkippedQuestions as string[]) || [],
      });
    } catch (error) {
      console.error("[Terra] Status error:", error);
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  // ============================================
  // END TERRA API ROUTES
  // ============================================

  app.post("/api/audit/:id/regenerate", async (req, res) => {
    try {
      const auditId = req.params.id;
      const audit = await storage.getAudit(auditId);

      if (!audit) {
        res.status(404).json({ error: "Audit non trouve" });
        return;
      }

      // Handle Discovery Scan (GRATUIT) differently - sync generation
      if (audit.type === "GRATUIT") {
        console.log(`[Regenerate] Regenerating Discovery Scan for audit ${auditId}...`);

        await storage.updateAudit(auditId, { reportDeliveryStatus: "GENERATING" });

        try {
          // Generate new Discovery Scan report with AI content
          const result = await analyzeDiscoveryScan(audit.responses as any);
          const narrativeReport = await convertToNarrativeReport(result, audit.responses as any);

          await storage.updateAudit(auditId, {
            narrativeReport,
            reportDeliveryStatus: "READY"
          });

          console.log(`[Regenerate] Discovery Scan ${auditId} regenerated successfully`);

          res.json({
            success: true,
            message: "Discovery Scan regenere",
            auditId,
            narrativeReport
          });
        } catch (genError) {
          console.error("[Regenerate] Discovery Scan generation error:", genError);
          await storage.updateAudit(auditId, { reportDeliveryStatus: "NEEDS_REVIEW" });
          res.status(500).json({ error: "Rapport en révision. Réessaie plus tard." });
        }
        return;
      }

      // For PREMIUM/ELITE audits - async generation
      await forceRegenerate(auditId);

      await storage.updateAudit(auditId, { reportDeliveryStatus: "GENERATING", narrativeReport: null });
      await startReportGeneration(auditId, audit.responses, audit.scores || {}, audit.type);

      // Lancer le workflow complet (attente + email + admin notification)
      processReportAndSendEmail(auditId, audit.email, audit.type);

      console.log(`[Regenerate] Force regenerating report for audit ${auditId} (cache cleared)`);

      res.json({
        success: true,
        message: "Generation du rapport relancee (cache efface)",
        auditId
      });
    } catch (error) {
      console.error("[Regenerate] Error:", error);
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  app.post("/api/audit/:id/resend-email", async (req, res) => {
    try {
      const auditId = req.params.id;
      const audit = await storage.getAudit(auditId);
      
      if (!audit) {
        res.status(404).json({ error: "Audit non trouve" });
        return;
      }

      if (!audit.narrativeReport) {
        res.status(400).json({ error: "Rapport pas encore genere" });
        return;
      }

      const baseUrl = getBaseUrl();
      console.log(`[Resend] Sending email to ${audit.email} for audit ${auditId} (baseUrl: ${baseUrl})`);
      
      const emailSent = await sendReportReadyEmail(audit.email, auditId, audit.type, baseUrl);
      
      if (emailSent) {
        await storage.updateAudit(auditId, { 
          reportDeliveryStatus: "SENT", 
          reportSentAt: new Date() 
        });
        console.log(`[Resend] Email sent successfully to ${audit.email}`);

        // Copie admin (trace + monitoring)
        try {
          const clientName = (audit as any)?.narrativeReport?.clientName || audit.email.split("@")[0];
          await sendAdminEmailNewAudit(audit.email, clientName, audit.type, auditId);
        } catch (e) {
          console.error(`[Resend] Admin email failed (best-effort):`, e);
        }

        res.json({ 
          success: true, 
          message: `Email envoye a ${audit.email}`,
          email: audit.email
        });
      } else {
        console.error(`[Resend] Email FAILED for ${audit.email} - check SendPulse config`);
        res.status(500).json({ 
          error: "Echec envoi email - verifier configuration SendPulse" 
        });
      }
    } catch (error) {
      console.error("[Resend] Error:", error);
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  async function processReportAsync(auditId: string, email: string, auditType: string) {
    const maxWait = 10 * 60 * 1000;
    const startTime = Date.now();
    
    const checkComplete = async (): Promise<boolean> => {
      while (Date.now() - startTime < maxWait) {
        const status = await getJobStatus(auditId);
        if (status?.status === "completed") {
          return true;
        } else if (status?.status === "failed") {
          return false;
        }
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
      return false;
    };

    const success = await checkComplete();
    
    if (success) {
      const baseUrl = getBaseUrl();
      console.log(`[Admin] Sending email to ${email} for audit ${auditId} (baseUrl: ${baseUrl})`);
      const emailSent = await sendReportReadyEmail(email, auditId, auditType, baseUrl);
      if (emailSent) {
        await storage.updateAudit(auditId, {
          reportDeliveryStatus: "SENT",
          reportSentAt: new Date(),
        });
        console.log(`[Admin] Report sent for audit ${auditId} to ${email}`);
      } else {
        console.error(`[Admin] Report ready but email FAILED for audit ${auditId} - check SendPulse config`);
        await storage.updateAudit(auditId, { reportDeliveryStatus: "READY" });
      }
    } else {
      await storage.updateAudit(auditId, { reportDeliveryStatus: "PENDING" });
      console.error(`[Admin] Report generation failed for audit ${auditId}`);
    }
  }

  app.get("/api/audits/:id/export/pdf", async (req, res) => {
    try {
      const auditId = req.params.id;
      const audit = await storage.getAudit(auditId);
      if (!audit) {
        res.status(404).json({ error: "Audit non trouve" });
        return;
      }
      
      const narrativeReport = audit.narrativeReport as any;
      if (!narrativeReport) {
        res.status(400).json({ error: "Rapport non disponible" });
        return;
      }

      // Récupérer les photos depuis responses (flux principal)
      const photos = extractPhotosFromAudit(audit);

      const pdf = await generateExportPDF(narrativeReport, auditId, photos);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename=neurocore-360-${auditId.slice(0, 8)}.pdf`);
      res.send(pdf);
    } catch (error) {
      console.error("[Export PDF] Error:", error);
      res.status(500).json({ error: "Erreur generation PDF" });
    }
  });

  app.get("/api/audits/:id/export/html", async (req, res) => {
    try {
      const auditId = req.params.id;
      const audit = await storage.getAudit(auditId);
      if (!audit) {
        res.status(404).json({ error: "Audit non trouve" });
        return;
      }
      
      // Priorité: reportHtml direct > narrativeReport.html > génération à la volée
      const narrativeReport = audit.narrativeReport as any;
      let html = (audit as any).reportHtml || narrativeReport?.html;
      
      if (!html) {
        // Fallback: génération à la volée si pas de HTML stocké
        if (!narrativeReport) {
          res.status(400).json({ error: "Rapport non disponible (génération en cours ou échouée)" });
          return;
        }
        const photos = extractPhotosFromAudit(audit);
        html = generateExportHTML(narrativeReport, auditId, photos);
      }
      
      if (!html || html.length < 500) {
        res.status(400).json({ error: "Rapport HTML invalide ou trop court" });
        return;
      }

      console.log(`[Export HTML] Serving ${html.length} chars for audit ${auditId}`);
      res.setHeader("Content-Type", "text/html");
      res.setHeader("Content-Disposition", `attachment; filename=neurocore-360-${auditId.slice(0, 8)}.html`);
      res.send(html);
    } catch (error) {
      console.error("[Export HTML] Error:", error);
      res.status(500).json({ error: "Erreur generation HTML" });
    }
  });

  app.get("/api/audits/:id/export/zip", async (req, res) => {
    try {
      const auditId = req.params.id;
      const audit = await storage.getAudit(auditId);
      if (!audit) {
        res.status(404).json({ error: "Audit non trouve" });
        return;
      }

      const narrativeReport = audit.narrativeReport as any;
      if (!narrativeReport) {
        res.status(400).json({ error: "Rapport non disponible" });
        return;
      }

      const photos = extractPhotosFromAudit(audit);

      await streamAuditZip({
        res,
        auditId,
        narrativeReport,
        photos,
      });
    } catch (error) {
      console.error("[Export ZIP] Error:", error);
      // Si on a déjà commencé à streamer, éviter de renvoyer du JSON.
      if (!res.headersSent) {
        res.status(500).json({ error: "Erreur generation ZIP" });
      } else {
        res.end();
      }
    }
  });

  app.get("/api/stripe/publishable-key", async (req, res) => {
    try {
      const publishableKey = await getStripePublishableKey();
      res.json({ publishableKey });
    } catch (error) {
      res.status(500).json({ error: "Erreur Stripe" });
    }
  });

  app.post("/api/stripe/create-checkout-session", async (req, res) => {
    try {
      const { priceId, email, planType, responses, promoCode } = req.body;

      const stripe = await getUncachableStripeClient();

      const baseUrl = getBaseUrl();

      // Validate and apply promo code if provided
      let discounts: any[] = [];
      let validatedPromoCode: string | null = null;

      if (promoCode) {
        const validation = await storage.validatePromoCode(promoCode, planType);
        if (validation.valid) {
          validatedPromoCode = promoCode;

          // Create a Stripe coupon dynamically
          try {
            const couponId = `NEUROCORE_${promoCode.toUpperCase()}_${Date.now()}`;
            const coupon = await stripe.coupons.create({
              id: couponId,
              percent_off: validation.discount,
              duration: 'once',
              max_redemptions: 1,
            });
            discounts = [{ coupon: coupon.id }];
          } catch (couponError: any) {
            console.error("Stripe coupon error:", couponError);
            // Continue without discount if coupon creation fails
          }
        }
      }

      const sessionParams: any = {
        payment_method_types: ['card'],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${baseUrl}/dashboard?success=true&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/audit-complet/checkout?cancelled=true`,
        customer_email: email,
        metadata: {
          email,
          planType,
          responses: JSON.stringify(responses).substring(0, 500),
          promoCode: validatedPromoCode || '',
        },
      };

      // Apply discounts if any
      if (discounts.length > 0) {
        sessionParams.discounts = discounts;
      }

      const session = await stripe.checkout.sessions.create(sessionParams);

      // Increment promo code usage if checkout session created successfully
      if (validatedPromoCode) {
        await storage.incrementPromoCodeUse(validatedPromoCode);
      }

      res.json({ sessionId: session.id, url: session.url });
    } catch (error: any) {
      console.error("Stripe checkout error:", error);
      res.status(500).json({ error: error.message || "Erreur création session" });
    }
  });

  app.post("/api/stripe/confirm-session", async (req, res) => {
    try {
      const sessionId = req.body?.sessionId || req.query?.session_id;
      if (!sessionId || typeof sessionId !== "string") {
        res.status(400).json({ error: "sessionId requis" });
        return;
      }

      const stripe = await getUncachableStripeClient();
      const session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ["customer"],
      });

      const isPaid = session.payment_status === "paid" || session.status === "complete";
      if (!isPaid) {
        res.status(202).json({ success: false, status: session.payment_status || session.status });
        return;
      }

      const email =
        session.customer_details?.email ||
        session.customer_email ||
        session.metadata?.email ||
        "";
      const planType = session.metadata?.planType;

      if (!email || !planType) {
        res.status(400).json({ error: "Metadata Stripe manquante" });
        return;
      }

      if (planType !== "GRATUIT" && planType !== "PREMIUM" && planType !== "ELITE") {
        res.status(400).json({ error: "PLAN_INVALID" });
        return;
      }

      const normalizedPlanType = planType as "GRATUIT" | "PREMIUM" | "ELITE";

      const existingAudits = await storage.getAuditsByEmail(email);
      const sessionCreatedAt = session.created ? session.created * 1000 : Date.now();
      const recentAudit = existingAudits.find((audit) => {
        if (audit.type !== normalizedPlanType) return false;
        const createdAt = audit.createdAt ? new Date(audit.createdAt).getTime() : 0;
        return createdAt >= sessionCreatedAt - 6 * 60 * 60 * 1000;
      });

      if (recentAudit) {
        res.json({ success: true, auditId: recentAudit.id, auditType: recentAudit.type, existing: true });
        return;
      }

      const progress = await storage.getProgress(email);
      let responses = progress?.responses as Record<string, unknown> | string | undefined;
      if (typeof responses === "string") {
        try {
          responses = JSON.parse(responses);
        } catch {
          responses = undefined;
        }
      }

      if (!responses || Object.keys(responses).length === 0) {
        res.status(400).json({ error: "QUESTIONNAIRE_MISSING" });
        return;
      }

      if (normalizedPlanType === "ELITE" && !hasThreePhotos(responses as Record<string, unknown>)) {
        res.status(400).json({ error: "NEED_PHOTOS", message: "3 photos obligatoires pour Ultimate Scan (face, profil, dos)" });
        return;
      }

      const audit = await storage.createAudit({
        userId: "",
        type: normalizedPlanType,
        email,
        responses: responses as Record<string, unknown>,
      });

      await storage.updateAudit(audit.id, { reportDeliveryStatus: "GENERATING" });
      await startReportGeneration(audit.id, audit.responses, audit.scores || {}, normalizedPlanType);
      processReportAndSendEmail(audit.id, audit.email, normalizedPlanType);

      res.json({ success: true, auditId: audit.id, auditType: audit.type });
    } catch (error: any) {
      console.error("Stripe confirmation error:", error);
      res.status(500).json({ error: error.message || "Erreur confirmation paiement" });
    }
  });

  // ==================== ADMIN ENDPOINTS ====================

  app.get("/api/admin/audits", async (req, res) => {
    if (!requireAdminAuth(req, res)) return;
    try {
      const allAudits = await storage.getAllAudits();
      const burnoutReports = await storage.getAllBurnoutReports();
      const mappedBurnout = burnoutReports.map((report) => ({
        id: report.id,
        email: report.email,
        type: "BURNOUT",
        status: "COMPLETED",
        reportDeliveryStatus: "SENT",
        reportSentAt: report.createdAt,
        createdAt: report.createdAt,
        completedAt: report.createdAt,
      }));

      const audits = [...mappedBurnout, ...allAudits].sort((a: any, b: any) => {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return dateB - dateA;
      });

      res.json({ success: true, audits });
    } catch (error) {
      console.error("[Admin Audits] Error:", error);
      res.status(500).json({ success: false, error: "Erreur serveur" });
    }
  });

  // Admin: Update audit status
  app.patch("/api/admin/audit/:auditId/status", async (req, res) => {
    if (!requireAdminAuth(req, res)) return;
    try {
      const { auditId } = req.params;
      const { status } = req.body;

      if (!status || !["PENDING", "READY", "SENT", "FAILED"].includes(status)) {
        res.status(400).json({ success: false, error: "Status invalide" });
        return;
      }

      const audit = await storage.getAudit(auditId);
      if (!audit) {
        res.status(404).json({ success: false, error: "Audit non trouvé" });
        return;
      }

      await storage.updateAudit(auditId, { reportDeliveryStatus: status });
      console.log(`[Admin] Audit ${auditId} status changed to ${status}`);

      res.json({ success: true, auditId, newStatus: status });
    } catch (error) {
      console.error("[Admin Update Status] Error:", error);
      res.status(500).json({ success: false, error: "Erreur serveur" });
    }
  });

  app.post("/api/admin/send-cta", async (req, res) => {
    if (!requireAdminAuth(req, res)) return;
    try {
      const { auditId, subject, message } = req.body;
      
      if (!auditId || !subject || !message) {
        res.status(400).json({ success: false, error: "Paramètres manquants" });
        return;
      }

      const audit = await storage.getAudit(auditId);
      if (!audit) {
        res.status(404).json({ success: false, error: "Audit non trouvé" });
        return;
      }

      // TODO: Implémenter l'envoi d'email avec le CTA
      // Pour l'instant, on log juste
      console.log(`[Admin CTA] Envoi CTA à ${audit.email} pour audit ${auditId}`);
      console.log(`Sujet: ${subject}`);
      console.log(`Message: ${message}`);

      // TODO: Utiliser emailService pour envoyer l'email
      // await sendCTAEmail(audit.email, subject, message);

      res.json({ success: true, message: "CTA envoyé avec succès" });
    } catch (error) {
      console.error("[Admin Send CTA] Error:", error);
      res.status(500).json({ success: false, error: "Erreur serveur" });
    }
  });

  // ==================== REVIEW ENDPOINTS ====================

  app.post("/api/review", async (req, res) => {
    try {
      const parsed = insertReviewSchema.parse(req.body);
      const audit = await storage.getAudit(parsed.auditId);
      if (!audit) {
        res.status(404).json({ success: false, error: "Audit non trouvé" });
        return;
      }
      const data = {
        ...parsed,
        comment: sanitizeUserText(parsed.comment, 1000),
        email: parsed.email ? sanitizeUserText(parsed.email, 255) : undefined,
      };
      const review = await reviewStorage.createReview(data as any);
      res.json({ success: true, review });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ success: false, error: "Données invalides", details: error.errors });
      } else {
        console.error("[Review] Error:", error);
        res.status(500).json({ success: false, error: "Erreur serveur" });
      }
    }
  });

  app.post("/api/submit-review", async (req, res) => {
    try {
      const parsed = insertReviewSchema.parse(req.body);
      const audit = await storage.getAudit(parsed.auditId);
      if (!audit) {
        res.status(404).json({ success: false, error: "Audit non trouvé" });
        return;
      }
      const data = {
        ...parsed,
        comment: sanitizeUserText(parsed.comment, 1000),
        email: parsed.email ? sanitizeUserText(parsed.email, 255) : undefined,
      };
      const review = await reviewStorage.createReview(data as any);

      // Notify admin of new review to validate
      const auditType = parsed.auditType || "DISCOVERY";
      sendAdminReviewNotification(
        data.email,
        auditType,
        parsed.auditId,
        parsed.rating,
        data.comment
      ).catch(err => console.error("[Review] Admin notification failed:", err));

      console.log(`[Review] New review submitted for audit ${parsed.auditId} - Admin notified`);
      res.json({ success: true, review });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ success: false, error: "Données invalides", details: error.errors });
      } else {
        console.error("[Review] Error:", error);
        res.status(500).json({ success: false, error: "Erreur serveur" });
      }
    }
  });

  app.get("/api/reviews", async (req, res) => {
    try {
      const reviews = await reviewStorage.getApprovedReviews();
      res.json({ success: true, reviews });
    } catch (error) {
      console.error("[Reviews] Error:", error);
      res.status(500).json({ success: false, error: "Erreur serveur" });
    }
  });

  app.get("/api/admin/reviews/pending", async (req, res) => {
    if (!requireAdminAuth(req, res)) return;
    try {
      const reviews = await reviewStorage.getPendingReviews();
      res.json({ success: true, reviews });
    } catch (error) {
      console.error("[Admin Reviews] Error:", error);
      res.status(500).json({ success: false, error: "Erreur serveur" });
    }
  });

  app.post("/api/admin/reviews/:reviewId/approve", async (req, res) => {
    if (!requireAdminAuth(req, res)) return;
    try {
      const { reviewId } = req.params;
      const { reviewedBy, adminNotes } = req.body;
      const review = await reviewStorage.approveReview(reviewId, reviewedBy, adminNotes);
      if (!review) {
        res.status(404).json({ success: false, error: "Avis non trouvé" });
        return;
      }

      // Get promo code based on audit type
      const promoConfig = PROMO_CODES_BY_AUDIT_TYPE[review.auditType as keyof typeof PROMO_CODES_BY_AUDIT_TYPE];

      if (promoConfig && review.email) {
        // Get client name from audit
        const audit = await storage.getAudit(review.auditId);
        const clientName = (audit?.responses as any)?.prenom || review.email.split('@')[0];
        const promoCode = promoConfig.code;

        console.log(`[Review] Sending promo code ${promoCode} to ${review.email} (${review.auditType})`);
        const emailSent = await sendPromoCodeEmail(
          review.email,
          clientName,
          review.auditType,
          promoCode
        );

        if (emailSent) {
          await reviewStorage.markPromoCodeSent(reviewId, promoCode);
          console.log(`[Review] ✅ Promo code email sent successfully to ${review.email}`);
        } else {
          console.error(`[Review] ❌ Failed to send promo code email to ${review.email}`);
        }
      }

      res.json({ success: true, review });
    } catch (error) {
      console.error("[Admin Approve] Error:", error);
      res.status(500).json({ success: false, error: "Erreur serveur" });
    }
  });

  app.post("/api/admin/reviews/:reviewId/reject", async (req, res) => {
    if (!requireAdminAuth(req, res)) return;
    try {
      const { reviewId } = req.params;
      const { reviewedBy, adminNotes } = req.body;
      const review = await reviewStorage.rejectReview(reviewId, reviewedBy, adminNotes);
      if (!review) {
        res.status(404).json({ success: false, error: "Avis non trouvé" });
        return;
      }
      res.json({ success: true, review });
    } catch (error) {
      console.error("[Admin Reject] Error:", error);
      res.status(500).json({ success: false, error: "Erreur serveur" });
    }
  });

  // Get all reviews for admin dashboard
  app.get("/api/admin/reviews", async (req, res) => {
    if (!requireAdminAuth(req, res)) return;
    try {
      const { status } = req.query;
      let reviews;

      if (status === "pending") {
        reviews = await reviewStorage.getPendingReviews();
      } else if (status === "approved") {
        reviews = await reviewStorage.getApprovedReviews();
      } else {
        // Get all reviews
        reviews = await reviewStorage.getAllReviews();
      }

      res.json({ success: true, reviews });
    } catch (error) {
      console.error("[Admin Reviews] Error:", error);
      res.status(500).json({ success: false, error: "Erreur serveur" });
    }
  });

  // Check if user already left a review for an audit
  app.get("/api/review/check/:auditId", async (req, res) => {
    try {
      const { auditId } = req.params;
      const review = await reviewStorage.getReviewByAuditId(auditId);
      res.json({
        success: true,
        hasReview: !!review,
        review: review || null
      });
    } catch (error) {
      console.error("[Review Check] Error:", error);
      res.status(500).json({ success: false, error: "Erreur serveur" });
    }
  });

  app.post("/api/generate-premium-audit", async (req, res) => {
    try {
      const { clientData, photoAnalysis, resumeAuditId } = req.body as {
        clientData: ClientData;
        photoAnalysis?: PhotoAnalysis | null;
        resumeAuditId?: string;
      };

      if (!clientData) {
        res.status(400).json({
          success: false,
          error: "clientData manquant dans le body"
        });
        return;
      }

      const result = await generateAndConvertAuditWithClaude(clientData, photoAnalysis, 'PREMIUM', resumeAuditId);

      if (!result.success) {
        res.status(500).json(result);
        return;
      }

      res.json(result);
    } catch (error: any) {
      console.error("[Claude Opus 4.5] Erreur generation audit:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Erreur serveur interne"
      });
    }
  });

  // Endpoint admin pour initialiser la base de données
  app.post("/api/admin/init-db", async (req, res) => {
    if (!requireAdminAuth(req, res)) return;
    try {
      const { Pool } = await import('pg');
      
      // Requêtes SQL exécutées une par une pour éviter les problèmes de parsing
      const statements = [
        // Ajouter colonnes manquantes à audits si la table existe
        `DO $$ BEGIN
          IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'audits') THEN
            ALTER TABLE audits ADD COLUMN IF NOT EXISTS user_id VARCHAR(36);
            ALTER TABLE audits ADD COLUMN IF NOT EXISTS email VARCHAR(255);
            ALTER TABLE audits ADD COLUMN IF NOT EXISTS type VARCHAR(20);
            ALTER TABLE audits ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'COMPLETED';
            ALTER TABLE audits ADD COLUMN IF NOT EXISTS responses JSONB DEFAULT '{}';
            ALTER TABLE audits ADD COLUMN IF NOT EXISTS scores JSONB DEFAULT '{}';
            ALTER TABLE audits ADD COLUMN IF NOT EXISTS narrative_report JSONB;
            ALTER TABLE audits ADD COLUMN IF NOT EXISTS report_txt TEXT;
            ALTER TABLE audits ADD COLUMN IF NOT EXISTS report_html TEXT;
            ALTER TABLE audits ADD COLUMN IF NOT EXISTS report_generated_at TIMESTAMP;
            ALTER TABLE audits ADD COLUMN IF NOT EXISTS report_delivery_status VARCHAR(20) DEFAULT 'PENDING';
            ALTER TABLE audits ADD COLUMN IF NOT EXISTS report_scheduled_for TIMESTAMP;
            ALTER TABLE audits ADD COLUMN IF NOT EXISTS report_sent_at TIMESTAMP;
            ALTER TABLE audits ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();
            ALTER TABLE audits ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP;
          END IF;
        END $$`,
        
        // D'abord supprimer audits pour le recréer avec le bon schéma (si toujours pas bon)
        // `DROP TABLE IF EXISTS audits CASCADE`,
        
        // Créer users
        `CREATE TABLE IF NOT EXISTS users (
          id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
          email VARCHAR(255) NOT NULL UNIQUE,
          name VARCHAR(255),
          created_at TIMESTAMP DEFAULT NOW() NOT NULL
        )`,
        
        // Créer audits avec le bon schéma
        `CREATE TABLE IF NOT EXISTS audits (
          id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id VARCHAR(36) REFERENCES users(id),
          email VARCHAR(255) NOT NULL,
          type VARCHAR(20) NOT NULL,
          status VARCHAR(20) NOT NULL DEFAULT 'COMPLETED',
          responses JSONB NOT NULL DEFAULT '{}',
          scores JSONB NOT NULL DEFAULT '{}',
          narrative_report JSONB,
          report_txt TEXT,
          report_html TEXT,
          report_generated_at TIMESTAMP,
          report_delivery_status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
          report_scheduled_for TIMESTAMP,
          report_sent_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT NOW() NOT NULL,
          completed_at TIMESTAMP
        )`,

        // Historique: une ligne par génération (TXT+HTML)
        `CREATE TABLE IF NOT EXISTS report_artifacts (
          id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
          audit_id VARCHAR(36) NOT NULL,
          tier VARCHAR(20) NOT NULL,
          engine VARCHAR(30) NOT NULL,
          model VARCHAR(80) NOT NULL,
          txt TEXT NOT NULL,
          html TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT NOW() NOT NULL
        )`,
        
        // Autres tables
        `CREATE TABLE IF NOT EXISTS questionnaire_progress (
          id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
          email VARCHAR(255) NOT NULL UNIQUE,
          current_section TEXT NOT NULL DEFAULT '0',
          total_sections TEXT NOT NULL DEFAULT '14',
          percent_complete TEXT NOT NULL DEFAULT '0',
          responses JSONB NOT NULL DEFAULT '{}',
          status VARCHAR(20) NOT NULL DEFAULT 'STARTED',
          started_at TIMESTAMP DEFAULT NOW() NOT NULL,
          last_activity_at TIMESTAMP DEFAULT NOW() NOT NULL
        )`,

        `CREATE TABLE IF NOT EXISTS burnout_progress (
          id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
          email VARCHAR(255) NOT NULL UNIQUE,
          current_section TEXT NOT NULL DEFAULT '0',
          total_sections TEXT NOT NULL DEFAULT '6',
          percent_complete TEXT NOT NULL DEFAULT '0',
          responses JSONB NOT NULL DEFAULT '{}',
          status VARCHAR(20) NOT NULL DEFAULT 'STARTED',
          started_at TIMESTAMP DEFAULT NOW() NOT NULL,
          last_activity_at TIMESTAMP DEFAULT NOW() NOT NULL
        )`,

        `CREATE TABLE IF NOT EXISTS burnout_reports (
          id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
          email VARCHAR(255) NOT NULL,
          responses JSONB NOT NULL DEFAULT '{}',
          report JSONB NOT NULL,
          created_at TIMESTAMP DEFAULT NOW() NOT NULL
        )`,
        
        `CREATE TABLE IF NOT EXISTS magic_tokens (
          token VARCHAR(255) PRIMARY KEY,
          email VARCHAR(255) NOT NULL,
          expires_at TIMESTAMP NOT NULL
        )`,
        
        `CREATE TABLE IF NOT EXISTS report_jobs (
          audit_id VARCHAR(36) PRIMARY KEY,
          status VARCHAR(20) NOT NULL DEFAULT 'pending',
          progress INTEGER NOT NULL DEFAULT 0,
          current_section TEXT NOT NULL DEFAULT '',
          error TEXT,
          attempt_count INTEGER NOT NULL DEFAULT 0,
          started_at TIMESTAMP DEFAULT NOW() NOT NULL,
          updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
          last_progress_at TIMESTAMP DEFAULT NOW() NOT NULL,
          completed_at TIMESTAMP
        )`,
        
        `CREATE TABLE IF NOT EXISTS reviews (
          id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
          audit_id VARCHAR(36) NOT NULL,
          user_id VARCHAR(36),
          email VARCHAR(255) NOT NULL,
          audit_type VARCHAR(50) NOT NULL,
          rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
          comment TEXT NOT NULL,
          status VARCHAR(20) NOT NULL DEFAULT 'pending',
          promo_code VARCHAR(50),
          promo_code_sent_at TIMESTAMP,
          admin_notes TEXT,
          created_at TIMESTAMP DEFAULT NOW() NOT NULL,
          reviewed_at TIMESTAMP,
          reviewed_by VARCHAR(255)
        )`,
        
        `CREATE TABLE IF NOT EXISTS cta_history (
          id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
          audit_id VARCHAR(36) NOT NULL,
          cta_type VARCHAR(20) NOT NULL,
          scheduled_at TIMESTAMP NOT NULL,
          sent_at TIMESTAMP,
          status VARCHAR(20) NOT NULL DEFAULT 'scheduled',
          email_subject TEXT,
          email_message TEXT,
          error TEXT,
          created_at TIMESTAMP DEFAULT NOW() NOT NULL
        )`,
        
        // Promo codes
        `CREATE TABLE IF NOT EXISTS promo_codes (
          id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
          code VARCHAR(50) NOT NULL UNIQUE,
          discount_percent INTEGER NOT NULL CHECK (discount_percent >= 1 AND discount_percent <= 100),
          description TEXT,
          valid_for VARCHAR(20) NOT NULL DEFAULT 'ALL',
          max_uses INTEGER DEFAULT NULL,
          current_uses INTEGER NOT NULL DEFAULT 0,
          is_active BOOLEAN NOT NULL DEFAULT true,
          expires_at TIMESTAMP DEFAULT NULL,
          created_at TIMESTAMP DEFAULT NOW() NOT NULL
        )`,

        // Email tracking
        `CREATE TABLE IF NOT EXISTS email_tracking (
          id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
          audit_id VARCHAR(36) NOT NULL,
          email_type VARCHAR(50) NOT NULL,
          sent_at TIMESTAMP DEFAULT NOW() NOT NULL,
          opened_at TIMESTAMP DEFAULT NULL,
          clicked_at TIMESTAMP DEFAULT NULL
        )`,

        // Default promo codes
        `INSERT INTO promo_codes (code, discount_percent, description, valid_for)
         VALUES ('ANALYSE20', 20, 'Code promo 20% sur Anabolic Bioscan', 'PREMIUM')
         ON CONFLICT (code) DO NOTHING`,
        `INSERT INTO promo_codes (code, discount_percent, description, valid_for)
         VALUES ('NEUROCORE20', 20, 'Code promo 20% coaching Achzod', 'ALL')
         ON CONFLICT (code) DO NOTHING`,

        // Index
        `CREATE INDEX IF NOT EXISTS idx_audits_email ON audits(email)`,
        `CREATE INDEX IF NOT EXISTS idx_audits_user_id ON audits(user_id)`,
        `CREATE INDEX IF NOT EXISTS idx_report_artifacts_audit_id ON report_artifacts(audit_id)`,
        `CREATE INDEX IF NOT EXISTS idx_report_artifacts_created_at ON report_artifacts(created_at)`,
        `CREATE INDEX IF NOT EXISTS idx_reviews_audit_id ON reviews(audit_id)`,
        `CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews(status)`,
        `CREATE INDEX IF NOT EXISTS idx_cta_history_audit_id ON cta_history(audit_id)`,
        `CREATE INDEX IF NOT EXISTS idx_report_jobs_status ON report_jobs(status)`,
        `CREATE INDEX IF NOT EXISTS idx_promo_codes_code ON promo_codes(code)`,
        `CREATE INDEX IF NOT EXISTS idx_email_tracking_audit_id ON email_tracking(audit_id)`,
        `CREATE INDEX IF NOT EXISTS idx_burnout_progress_email ON burnout_progress(email)`,
        `CREATE INDEX IF NOT EXISTS idx_burnout_reports_email ON burnout_reports(email)`,
        `CREATE INDEX IF NOT EXISTS idx_burnout_reports_created_at ON burnout_reports(created_at)`
      ];
      
      const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.POSTGRES_CONNECTION_STRING;
      if (!databaseUrl) {
        return res.status(500).json({ error: 'DATABASE_URL not configured' });
      }
      
      const pool = new Pool({
        connectionString: databaseUrl,
        ssl: databaseUrl.includes('render.com') ? { rejectUnauthorized: false } : false,
      });
      
      const client = await pool.connect();
      
      try {
        let executed = 0;
        let skipped = 0;
        for (const statement of statements) {
          try {
            await client.query(statement + ';');
            executed++;
          } catch (error: any) {
            // Ignorer les erreurs si la table/index existe déjà, ou si colonne n'existe pas (pour les index)
            if (error.code === '42P07' || error.code === '42710' || error.code === '42703' || 
                error.message.includes('already exists') || error.message.includes('does not exist')) {
              skipped++;
            } else {
              console.error('[Init DB] Error:', error.message);
              throw error;
            }
          }
        }
        res.json({ success: true, message: `Database initialized (${executed} executed, ${skipped} skipped)` });
      } finally {
        client.release();
        await pool.end();
      }
    } catch (error: any) {
      console.error('[Init DB] Error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // ==================== PROMO CODES API ====================

  // Get all promo codes (Admin)
  app.get("/api/admin/promo-codes", async (req, res) => {
    if (!requireAdminAuth(req, res)) return;
    try {
      const codes = await storage.getAllPromoCodes();
      res.json({ success: true, codes });
    } catch (error) {
      console.error("[Promo Codes] Error fetching:", error);
      res.status(500).json({ success: false, error: "Erreur serveur" });
    }
  });

  // Create promo code (Admin)
  app.post("/api/admin/promo-codes", async (req, res) => {
    if (!requireAdminAuth(req, res)) return;
    try {
      const { code, discountPercent, description, validFor, maxUses, isActive, expiresAt } = req.body;

      if (!code || !discountPercent) {
        res.status(400).json({ success: false, error: "Code et réduction requis" });
        return;
      }

      const promo = await storage.createPromoCode({
        code,
        discountPercent: Number(discountPercent),
        description: description || null,
        validFor: validFor || "ALL",
        maxUses: maxUses ? Number(maxUses) : null,
        isActive: isActive !== false,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      });

      res.json({ success: true, promo });
    } catch (error: any) {
      console.error("[Promo Codes] Error creating:", error);
      if (error?.code === "23505") {
        res.status(400).json({ success: false, error: "Ce code existe déjà" });
      } else {
        res.status(500).json({ success: false, error: "Erreur serveur" });
      }
    }
  });

  // Update promo code (Admin)
  app.put("/api/admin/promo-codes/:id", async (req, res) => {
    if (!requireAdminAuth(req, res)) return;
    try {
      const { id } = req.params;
      const data = req.body;

      const promo = await storage.updatePromoCode(id, {
        ...data,
        discountPercent: data.discountPercent ? Number(data.discountPercent) : undefined,
        maxUses: data.maxUses !== undefined ? (data.maxUses ? Number(data.maxUses) : null) : undefined,
        expiresAt: data.expiresAt !== undefined ? (data.expiresAt ? new Date(data.expiresAt) : null) : undefined,
      });

      if (!promo) {
        res.status(404).json({ success: false, error: "Code promo non trouvé" });
        return;
      }

      res.json({ success: true, promo });
    } catch (error) {
      console.error("[Promo Codes] Error updating:", error);
      res.status(500).json({ success: false, error: "Erreur serveur" });
    }
  });

  // Validate promo code (Public - for checkout)
  app.post("/api/promo-codes/validate", async (req, res) => {
    try {
      const { code, auditType } = req.body;

      if (!code) {
        res.status(400).json({ valid: false, discount: 0, error: "Code requis" });
        return;
      }

      const result = await storage.validatePromoCode(code, auditType || "ALL");
      res.json(result);
    } catch (error) {
      console.error("[Promo Codes] Error validating:", error);
      res.status(500).json({ valid: false, discount: 0, error: "Erreur serveur" });
    }
  });

  // Track email open (pixel tracking)
  app.get("/api/track/email/:trackingId/open.gif", async (req, res) => {
    try {
      const { trackingId } = req.params;
      await storage.markEmailOpened(trackingId);
    } catch (error) {
      console.error("[Email Tracking] Error:", error);
    }
    // Return 1x1 transparent GIF
    const gif = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");
    res.setHeader("Content-Type", "image/gif");
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.send(gif);
  });

  // ==================== EMAIL SEQUENCES CRON ====================

  // Cron endpoint to process scheduled email sequences
  // Call this endpoint every hour via external cron service (e.g., cron-job.org)
  app.post("/api/cron/process-email-sequences", async (req, res) => {
    try {
      const baseUrl = getBaseUrl();
      const now = new Date();
      const results = { gratuitUpsell: 0, premiumJ7: 0, premiumJ14: 0, errors: 0 };

      // Get all SENT audits
      const allAudits = await storage.getAllAudits();
      const sentAudits = allAudits.filter(a => a.reportDeliveryStatus === "SENT" && a.reportSentAt);

      for (const audit of sentAudits) {
        try {
          const sentAt = new Date(audit.reportSentAt!);
          const daysSinceSent = Math.floor((now.getTime() - sentAt.getTime()) / (1000 * 60 * 60 * 24));

          // Get existing email tracking for this audit
          const emailTracking = await storage.getEmailTrackingForAudit(audit.id);
          const trackingTypes = emailTracking.map(t => t.emailType);

          // GRATUIT audits: Send upsell email after 2 days
          if (audit.type === "GRATUIT" && daysSinceSent >= 2 && daysSinceSent < 30) {
            if (!trackingTypes.includes("GRATUIT_UPSELL")) {
              const tracking = await storage.createEmailTracking(audit.id, "GRATUIT_UPSELL");
              const sent = await sendGratuitUpsellEmail(audit.email, audit.id, baseUrl, tracking.id);
              if (sent) results.gratuitUpsell++;
              else results.errors++;
            }
          }

          // PREMIUM/ELITE audits: J+7 and J+14 sequences
          if (audit.type === "PREMIUM" || audit.type === "ELITE") {
            // J+7: Send if 7+ days and no J+7 email sent yet
            if (daysSinceSent >= 7 && daysSinceSent < 14) {
              if (!trackingTypes.includes("PREMIUM_J7")) {
                const hasReview = await storage.hasUserLeftReview(audit.id);
                const tracking = await storage.createEmailTracking(audit.id, "PREMIUM_J7");
                const sent = await sendPremiumJ7Email(audit.email, audit.id, audit.type, baseUrl, tracking.id, hasReview);
                if (sent) results.premiumJ7++;
                else results.errors++;
              }
            }

            // J+14: Send ONLY if J+7 email was NOT opened
            if (daysSinceSent >= 14 && daysSinceSent < 30) {
              const j7Email = emailTracking.find(t => t.emailType === "PREMIUM_J7");
              const j14Sent = trackingTypes.includes("PREMIUM_J14");

              // Only send J+14 if J+7 was sent but NOT opened
              if (j7Email && !j7Email.openedAt && !j14Sent) {
                const tracking = await storage.createEmailTracking(audit.id, "PREMIUM_J14");
                const sent = await sendPremiumJ14Email(audit.email, audit.id, audit.type, baseUrl, tracking.id);
                if (sent) results.premiumJ14++;
                else results.errors++;
              }
            }
          }
        } catch (auditError) {
          console.error(`[Cron] Error processing audit ${audit.id}:`, auditError);
          results.errors++;
        }
      }

      console.log(`[Cron] Email sequences processed:`, results);
      res.json({ success: true, ...results, processedAt: new Date().toISOString() });
    } catch (error) {
      console.error("[Cron] Error processing email sequences:", error);
      res.status(500).json({ success: false, error: "Erreur traitement sequences" });
    }
  });

  // Create test data for relances (TEMPORARY - DELETE AFTER TESTING)
  app.post("/api/admin/create-test-relances", async (req, res) => {
    if (!requireAdminAuth(req, res)) return;
    try {
      const results: string[] = [];

      // Get existing audits to find a valid userId
      const existingAudits = await storage.getAllAudits();
      const userId = existingAudits[0]?.userId || "test-user";

      // Create 2 GRATUIT audits (sent 3-5 days ago)
      const gratuit1 = await storage.createAudit({
        email: "achkou+gratuit1@gmail.com",
        type: "GRATUIT",
        responses: { test: true },
        userId,
      });
      await storage.updateAudit(gratuit1.id, {
        status: "COMPLETED",
        reportDeliveryStatus: "SENT",
        reportSentAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
      });

      const gratuit2 = await storage.createAudit({
        email: "achkou+gratuit2@gmail.com",
        type: "GRATUIT",
        responses: { test: true },
        userId,
      });
      await storage.updateAudit(gratuit2.id, {
        status: "COMPLETED",
        reportDeliveryStatus: "SENT",
        reportSentAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
      });
      results.push("2 GRATUIT audits créés");

      // Create 2 PREMIUM J+7 audits (sent 8-10 days ago)
      const premium7a = await storage.createAudit({
        email: "achkou+premium7a@gmail.com",
        type: "PREMIUM",
        responses: { test: true },
        userId,
      });
      await storage.updateAudit(premium7a.id, {
        status: "COMPLETED",
        reportDeliveryStatus: "SENT",
        reportSentAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000)
      });

      const premium7b = await storage.createAudit({
        email: "achkou+premium7b@gmail.com",
        type: "PREMIUM",
        responses: { test: true },
        userId,
      });
      await storage.updateAudit(premium7b.id, {
        status: "COMPLETED",
        reportDeliveryStatus: "SENT",
        reportSentAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)
      });
      results.push("2 PREMIUM J+7 audits créés");

      // Create 2 PREMIUM J+14 audits (sent 15-20 days ago)
      const premium14a = await storage.createAudit({
        email: "achkou+premium14a@gmail.com",
        type: "PREMIUM",
        responses: { test: true },
        userId,
      });
      await storage.updateAudit(premium14a.id, {
        status: "COMPLETED",
        reportDeliveryStatus: "SENT",
        reportSentAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000)
      });

      const premium14b = await storage.createAudit({
        email: "achkou+premium14b@gmail.com",
        type: "ELITE",
        responses: { test: true },
        userId,
      });
      await storage.updateAudit(premium14b.id, {
        status: "COMPLETED",
        reportDeliveryStatus: "SENT",
        reportSentAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000)
      });
      results.push("2 PREMIUM J+14 audits créés");

      res.json({ success: true, results });
    } catch (error: any) {
      console.error("[Test Data] Error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Manual trigger for testing specific email sequence
  app.post("/api/admin/send-sequence-email", async (req, res) => {
    if (!requireAdminAuth(req, res)) return;
    try {
      const { auditId, emailType } = req.body;

      if (!auditId || !emailType) {
        res.status(400).json({ success: false, error: "auditId et emailType requis" });
        return;
      }

      const audit = await storage.getAudit(auditId);
      if (!audit) {
        res.status(404).json({ success: false, error: "Audit non trouvé" });
        return;
      }

      const baseUrl = getBaseUrl();
      const tracking = await storage.createEmailTracking(audit.id, emailType);
      let sent = false;

      switch (emailType) {
        case "GRATUIT_UPSELL":
          sent = await sendGratuitUpsellEmail(audit.email, audit.id, baseUrl, tracking.id);
          break;
        case "PREMIUM_J7":
          const hasReview = await storage.hasUserLeftReview(audit.id);
          sent = await sendPremiumJ7Email(audit.email, audit.id, audit.type, baseUrl, tracking.id, hasReview);
          break;
        case "PREMIUM_J14":
          sent = await sendPremiumJ14Email(audit.email, audit.id, audit.type, baseUrl, tracking.id);
          break;
        default:
          res.status(400).json({ success: false, error: "Type d'email invalide" });
          return;
      }

      if (sent) {
        res.json({ success: true, message: `Email ${emailType} envoyé à ${audit.email}` });
      } else {
        res.status(500).json({ success: false, error: "Erreur envoi email" });
      }
    } catch (error) {
      console.error("[Admin] Error sending sequence email:", error);
      res.status(500).json({ success: false, error: "Erreur serveur" });
    }
  });

  // ==================== DISCOVERY SCAN ROUTES ====================

  // Analyze Discovery Scan (free tier) - returns NarrativeReport format for dashboard
  app.post("/api/discovery-scan/analyze", async (req, res) => {
    try {
      const { responses } = req.body;

      if (!responses) {
        res.status(400).json({ success: false, error: "Responses manquantes" });
        return;
      }

      console.log(`[Discovery Scan] Starting analysis for ${responses.prenom || 'Client'}...`);

      // Analyze and convert to dashboard format with AI content
      const result = await analyzeDiscoveryScan(responses);
      const narrativeReport = await convertToNarrativeReport(result, responses);

      res.json({
        success: true,
        narrativeReport
      });
    } catch (error: any) {
      console.error("[Discovery Scan] Error:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Erreur analyse Discovery Scan"
      });
    }
  });

  // Create Discovery Scan audit and generate report
  app.post("/api/discovery-scan/create", async (req, res) => {
    try {
      const { email, responses } = req.body;

      if (!email || !responses) {
        res.status(400).json({ success: false, error: "Email et responses requis" });
        return;
      }

      // Create audit record
      const audit = await storage.createAudit({
        userId: "",
        type: "GRATUIT",
        email,
        responses,
      });

      try {
        // Generate analysis and convert to NarrativeReport format with AI content
        const result = await analyzeDiscoveryScan(responses);
        const narrativeReport = await convertToNarrativeReport(result, responses);

        // Update audit with report (same format as PREMIUM/ELITE)
        await storage.updateAudit(audit.id, {
          narrativeReport,
          reportDeliveryStatus: "READY"
        });

        console.log(`[Discovery Scan] Audit ${audit.id} created for ${email}`);

        const baseUrl = getBaseUrl();
        const emailSent = await sendReportReadyEmail(email, audit.id, audit.type, baseUrl);
        if (emailSent) {
          await storage.updateAudit(audit.id, { reportDeliveryStatus: "SENT", reportSentAt: new Date() });
          const clientName = (responses as any)?.prenom || email.split("@")[0];
          await sendAdminEmailNewAudit(email, clientName, audit.type, audit.id);
        }

        res.json({
          success: true,
          auditId: audit.id,
          narrativeReport
        });
      } catch (error) {
        console.error("[Discovery Scan] Create error (generation):", error);
        await storage.updateAudit(audit.id, { reportDeliveryStatus: "NEEDS_REVIEW" });
        res.status(500).json({ success: false, error: "Rapport en révision. Réessaie plus tard." });
      }
    } catch (error: any) {
      console.error("[Discovery Scan] Create error:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Erreur création Discovery Scan"
      });
    }
  });

  // Get Discovery Scan report by audit ID (returns same format as /api/audits/:id/narrative)
  app.get("/api/discovery-scan/:auditId", async (req, res) => {
    try {
      const { auditId } = req.params;
      const audit = await storage.getAudit(auditId);

      if (!audit) {
        res.status(404).json({ success: false, error: "Audit non trouvé" });
        return;
      }

      if (audit.type !== "GRATUIT") {
        res.status(400).json({ success: false, error: "Ce n'est pas un Discovery Scan" });
        return;
      }

      // If a regeneration is in progress, avoid serving stale reports
      if (audit.reportDeliveryStatus === "GENERATING") {
        res.status(202).json({
          success: true,
          status: "generating",
          message: "Rapport en cours de generation",
        });
        return;
      }

      // If report already exists, return it immediately
      if (audit.narrativeReport) {
        res.json(audit.narrativeReport);
        return;
      }

      // No report stored -> trigger a fresh generation in background
      // to avoid users getting stuck on "Analyse en cours".
      const shouldRegenerate = audit.reportDeliveryStatus !== "GENERATING";
      if (shouldRegenerate) {
        await storage.updateAudit(audit.id, { reportDeliveryStatus: "GENERATING" });
      }

      res.status(202).json({
        success: true,
        status: shouldRegenerate ? "regenerating" : "generating",
        message: shouldRegenerate ? "Recalcul du rapport lance" : "Generation en cours",
      });

      if (!shouldRegenerate) {
        return;
      }

      (async () => {
        try {
          const result = await analyzeDiscoveryScan(audit.responses as any);
          const narrativeReport = await convertToNarrativeReport(result, audit.responses as any);
          await storage.updateAudit(audit.id, {
            narrativeReport,
            reportDeliveryStatus: "READY",
          });
          console.log(`[Discovery Fetch] Report regenerated for ${audit.id}`);
        } catch (err) {
          console.error("[Discovery Fetch] Regeneration error:", err);
          await storage.updateAudit(audit.id, { reportDeliveryStatus: "NEEDS_REVIEW" });
        }
      })();
    } catch (error: any) {
      console.error("[Discovery Scan] Fetch error:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Erreur récupération Discovery Scan"
      });
    }
  });

  // Force regenerate a Discovery Scan if stuck
  app.post("/api/discovery-scan/:auditId/regenerate", async (req, res) => {
    try {
      const { auditId } = req.params;
      const audit = await storage.getAudit(auditId);

      if (!audit) {
        res.status(404).json({ success: false, error: "Audit non trouvé" });
        return;
      }

      if (audit.type !== "GRATUIT") {
        res.status(400).json({ success: false, error: "Ce n'est pas un Discovery Scan" });
        return;
      }

      // Mark as generating and clear cached report to avoid stale content
      await storage.updateAudit(audit.id, {
        reportDeliveryStatus: "GENERATING",
        narrativeReport: null,
        reportGeneratedAt: null,
      });

      // Fire-and-forget regeneration to avoid blocking the UI
      res.json({ success: true, auditId: audit.id, started: true });

      (async () => {
        try {
          const result = await analyzeDiscoveryScan(audit.responses as any);
          const narrativeReport = await convertToNarrativeReport(result, audit.responses as any);
          await storage.updateAudit(audit.id, {
            narrativeReport,
            reportDeliveryStatus: "READY",
          });
          console.log(`[Discovery Regenerate] Success for ${audit.id}`);
        } catch (err) {
          console.error("[Discovery Regenerate] Error:", err);
          await storage.updateAudit(audit.id, { reportDeliveryStatus: "NEEDS_REVIEW" });
        }
      })();
    } catch (error) {
      console.error("[Discovery Scan] Regeneration error:", error);
      res.status(500).json({ success: false, error: "Erreur regénération" });
    }
  });

  // ==================== WAITLIST/SUBSCRIBE ROUTES ====================

  // Helper: Get database pool with proper config
  const getWaitlistPool = async () => {
    const { Pool } = await import("pg");
    const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    if (!databaseUrl) throw new Error("DATABASE_URL not configured");

    return new Pool({
      connectionString: databaseUrl,
      ssl: databaseUrl.includes("render.com") || databaseUrl.includes("neon.tech")
        ? { rejectUnauthorized: false }
        : false,
    });
  };

  // Helper: Ensure waitlist table exists with all columns
  const ensureWaitlistTable = async (pool: any) => {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS waitlist_subscribers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email TEXT UNIQUE NOT NULL,
        name TEXT,
        objective TEXT,
        source TEXT DEFAULT 'apexlabs',
        sendpulse_synced BOOLEAN DEFAULT FALSE,
        email_sent BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    // Add columns if they don't exist (for existing tables)
    await pool.query(`ALTER TABLE waitlist_subscribers ADD COLUMN IF NOT EXISTS name TEXT`);
    await pool.query(`ALTER TABLE waitlist_subscribers ADD COLUMN IF NOT EXISTS objective TEXT`);
    await pool.query(`ALTER TABLE waitlist_subscribers ADD COLUMN IF NOT EXISTS sendpulse_synced BOOLEAN DEFAULT FALSE`);
    await pool.query(`ALTER TABLE waitlist_subscribers ADD COLUMN IF NOT EXISTS email_sent BOOLEAN DEFAULT FALSE`);
  };

  // Helper: Sanitize input (prevent XSS)
  const sanitize = (str: string): string => {
    return str.replace(/[<>'"&]/g, '').slice(0, 500);
  };

  // Subscribe to waitlist (ApexLabs pre-launch)
  app.post("/api/waitlist/subscribe", async (req, res) => {
    const { email, source = "apexlabs", name = "", objective = "" } = req.body;

    // Validation
    if (!email || typeof email !== 'string') {
      res.status(400).json({ success: false, error: "Email requis" });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({ success: false, error: "Format email invalide" });
      return;
    }

    const cleanEmail = email.toLowerCase().trim().slice(0, 254);
    const cleanName = sanitize((name || "").trim());
    const cleanObjective = sanitize((objective || "").trim());
    const cleanSource = sanitize((source || "apexlabs").trim());

    let dbSaved = false;
    let sendpulseSynced = false;
    let emailSent = false;
    let pool: any = null;

    // 1. Save to database FIRST (source of truth)
    let isReturningUser = false;
    try {
      pool = await getWaitlistPool();
      await ensureWaitlistTable(pool);

      // Check if already registered
      const existing = await pool.query(`SELECT email FROM waitlist_subscribers WHERE email = $1`, [cleanEmail]);
      if (existing.rows.length > 0) {
        isReturningUser = true;
        console.log(`[Waitlist] 👋 Returning user: ${cleanEmail}`);
        await pool.end();
        res.json({ success: true, message: "Tu es déjà inscrit ! On te contactera bientôt.", returning: true });
        return;
      }

      await pool.query(
        `INSERT INTO waitlist_subscribers (email, name, objective, source, created_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [cleanEmail, cleanName, cleanObjective, cleanSource]
      );
      dbSaved = true;
      console.log(`[Waitlist] ✅ DB: ${cleanEmail}`);
    } catch (dbError: any) {
      console.error("[Waitlist] ❌ DB Error:", dbError.message);
    }

    // 2. SendPulse sync (async, don't block)
    try {
      const result = await addSubscriberToList(cleanEmail, cleanSource);
      sendpulseSynced = result.success;
      if (sendpulseSynced && pool) {
        await pool.query(`UPDATE waitlist_subscribers SET sendpulse_synced = TRUE WHERE email = $1`, [cleanEmail]);
      }
      console.log(`[Waitlist] ${sendpulseSynced ? '✅' : '❌'} SendPulse: ${cleanEmail}`);
    } catch (spError: any) {
      console.error("[Waitlist] ❌ SendPulse:", spError.message);
    }

    // 3. Welcome email
    if (cleanSource.startsWith("apexlabs")) {
      try {
        emailSent = await sendApexLabsWelcomeEmail(cleanEmail);
        if (emailSent && pool) {
          await pool.query(`UPDATE waitlist_subscribers SET email_sent = TRUE WHERE email = $1`, [cleanEmail]);
        }
        console.log(`[Waitlist] ${emailSent ? '✅' : '❌'} Email: ${cleanEmail}`);
      } catch (emailError: any) {
        console.error("[Waitlist] ❌ Email:", emailError.message);
      }
    }

    // Cleanup
    if (pool) await pool.end();

    // Log summary
    console.log(`[Waitlist] 📊 ${cleanEmail}: db=${dbSaved} sp=${sendpulseSynced} mail=${emailSent}`);

    // Success if DB saved (source of truth)
    if (dbSaved) {
      res.json({ success: true, message: "Inscription réussie" });
    } else {
      res.status(500).json({ success: false, error: "Erreur serveur, réessaie" });
    }
  });

  // ADMIN: View all waitlist subscribers (protected)
  app.get("/api/admin/waitlist", async (req, res) => {
    const adminKey = req.headers["x-admin-key"] || req.query.key;
    const validKey = process.env.ADMIN_SECRET || process.env.ADMIN_KEY;
    if (!validKey || adminKey !== validKey) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    try {
      const pool = await getWaitlistPool();
      await ensureWaitlistTable(pool);

      const result = await pool.query(`
        SELECT email, name, objective, source, sendpulse_synced, email_sent, created_at
        FROM waitlist_subscribers
        ORDER BY created_at DESC
      `);
      await pool.end();

      res.json({
        success: true,
        count: result.rows.length,
        subscribers: result.rows
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get waitlist spots remaining (public endpoint)
  app.get("/api/waitlist/spots", async (_req, res) => {
    const TOTAL_SPOTS = 199;
    try {
      const { Pool } = await import("pg");
      const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;

      if (!databaseUrl) {
        res.json({ success: true, spotsLeft: TOTAL_SPOTS, total: TOTAL_SPOTS });
        return;
      }

      const pool = new Pool({
        connectionString: databaseUrl,
        ssl: databaseUrl.includes("render.com") || databaseUrl.includes("neon.tech")
          ? { rejectUnauthorized: false }
          : false,
      });

      try {
        const result = await pool.query("SELECT COUNT(*) FROM waitlist_subscribers");
        const subscriberCount = parseInt(result.rows[0].count, 10);
        const spotsLeft = Math.max(0, TOTAL_SPOTS - subscriberCount);
        res.json({ success: true, spotsLeft, total: TOTAL_SPOTS, subscribers: subscriberCount });
      } catch (dbError) {
        res.json({ success: true, spotsLeft: TOTAL_SPOTS, total: TOTAL_SPOTS });
      } finally {
        await pool.end();
      }
    } catch (error) {
      res.json({ success: true, spotsLeft: TOTAL_SPOTS, total: TOTAL_SPOTS });
    }
  });


  // Get SendPulse address books and subscribers count (admin diagnostic)
  app.get("/api/admin/sendpulse/books", async (req, res) => {
    if (!requireAdminAuth(req, res)) return;
    try {
      const SENDPULSE_USER_ID = process.env.SENDPULSE_USER_ID;
      const SENDPULSE_SECRET = process.env.SENDPULSE_SECRET;

      if (!SENDPULSE_USER_ID || !SENDPULSE_SECRET) {
        res.json({ success: false, error: "SendPulse credentials not configured" });
        return;
      }

      // Get access token
      const authResponse = await fetch("https://api.sendpulse.com/oauth/access_token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grant_type: "client_credentials",
          client_id: SENDPULSE_USER_ID,
          client_secret: SENDPULSE_SECRET,
        }),
      });

      if (!authResponse.ok) {
        res.json({ success: false, error: "SendPulse auth failed" });
        return;
      }

      const authData = await authResponse.json() as { access_token: string };

      // Get all address books
      const booksResponse = await fetch("https://api.sendpulse.com/addressbooks", {
        headers: { Authorization: `Bearer ${authData.access_token}` },
      });

      const books = await booksResponse.json() as Array<{ id: number; name: string; all_email_qty: number }>;

      // Filter ApexLabs books
      const apexBooks = books.filter((b) => b.name.includes("APEXLABS"));

      res.json({
        success: true,
        books: apexBooks.map((b) => ({
          id: b.id,
          name: b.name,
          subscriberCount: b.all_email_qty,
        })),
        totalBooks: books.length,
      });
    } catch (error: any) {
      console.error("[SendPulse Admin] Error:", error.message);
      res.json({ success: false, error: error.message || "Erreur SendPulse" });
    }
  });

  // Get subscribers from a specific SendPulse address book
  app.get("/api/admin/sendpulse/subscribers/:bookId", async (req, res) => {
    if (!requireAdminAuth(req, res)) return;
    try {
      const { bookId } = req.params;
      const SENDPULSE_USER_ID = process.env.SENDPULSE_USER_ID;
      const SENDPULSE_SECRET = process.env.SENDPULSE_SECRET;

      if (!SENDPULSE_USER_ID || !SENDPULSE_SECRET) {
        res.json({ success: false, error: "SendPulse credentials not configured" });
        return;
      }

      // Get access token
      const authResponse = await fetch("https://api.sendpulse.com/oauth/access_token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grant_type: "client_credentials",
          client_id: SENDPULSE_USER_ID,
          client_secret: SENDPULSE_SECRET,
        }),
      });

      const authData = await authResponse.json() as { access_token: string };

      // Get subscribers from book
      const subsResponse = await fetch(`https://api.sendpulse.com/addressbooks/${bookId}/emails`, {
        headers: { Authorization: `Bearer ${authData.access_token}` },
      });

      const subscribers = await subsResponse.json() as Array<{ email: string; variables: any }>;

      res.json({
        success: true,
        bookId,
        subscribers: subscribers.slice(0, 50), // Limit to 50
        count: subscribers.length,
      });
    } catch (error: any) {
      console.error("[SendPulse Subscribers] Error:", error.message);
      res.json({ success: false, error: error.message || "Erreur SendPulse" });
    }
  });

  // Database diagnostic endpoint
  app.get("/api/admin/db-check", async (req, res) => {
    if (!requireAdminAuth(req, res)) return;
    try {
      const { Pool } = await import("pg");
      const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;

      if (!databaseUrl) {
        res.json({ success: false, error: "DATABASE_URL not configured", hasDbUrl: false });
        return;
      }

      const pool = new Pool({
        connectionString: databaseUrl,
        ssl: databaseUrl.includes("render.com") || databaseUrl.includes("neon.tech")
          ? { rejectUnauthorized: false }
          : false,
      });

      try {
        // Check if waitlist_subscribers table exists
        const tableCheck = await pool.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables
            WHERE table_name = 'waitlist_subscribers'
          );
        `);

        const tableExists = tableCheck.rows[0].exists;

        // If table exists, count rows
        let rowCount = 0;
        if (tableExists) {
          const countResult = await pool.query("SELECT COUNT(*) FROM waitlist_subscribers");
          rowCount = parseInt(countResult.rows[0].count, 10);
        }

        res.json({
          success: true,
          hasDbUrl: true,
          tableExists,
          rowCount,
          dbProvider: databaseUrl.includes("neon.tech") ? "neon" : databaseUrl.includes("render.com") ? "render" : "other"
        });
      } finally {
        await pool.end();
      }
    } catch (error: any) {
      res.json({ success: false, error: error.message, hasDbUrl: true });
    }
  });

  // Create waitlist table if it doesn't exist (one-time migration)
  app.post("/api/admin/db-migrate", async (req, res) => {
    if (!requireAdminAuth(req, res)) return;
    try {
      const { Pool } = await import("pg");
      const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;

      if (!databaseUrl) {
        res.json({ success: false, error: "DATABASE_URL not configured" });
        return;
      }

      const pool = new Pool({
        connectionString: databaseUrl,
        ssl: databaseUrl.includes("render.com") || databaseUrl.includes("neon.tech")
          ? { rejectUnauthorized: false }
          : false,
      });

      try {
        await pool.query(`
          CREATE TABLE IF NOT EXISTS waitlist_subscribers (
            id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
            email VARCHAR(255) NOT NULL UNIQUE,
            source VARCHAR(50) NOT NULL DEFAULT 'apexlabs',
            sendpulse_synced TIMESTAMP,
            created_at TIMESTAMP DEFAULT NOW() NOT NULL
          );
        `);
        res.json({ success: true, message: "Table waitlist_subscribers created/verified" });
      } finally {
        await pool.end();
      }
    } catch (error: any) {
      res.json({ success: false, error: error.message });
    }
  });

  // ==================== KNOWLEDGE BASE ROUTES ====================
  registerKnowledgeRoutes(app);

  // ==================== BLOOD ANALYSIS ROUTES ====================
  registerBloodAnalysisRoutes(app);

  // ==================== BURNOUT DETECTION ROUTES ====================
  registerBurnoutRoutes(app);

  return httpServer;
}
