import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage, reviewStorage } from "./storage";
import { saveProgressSchema, insertAuditSchema, insertReviewSchema } from "@shared/schema";
import { z } from "zod";
import { getUncachableStripeClient, getStripePublishableKey } from "./stripeClient";
import { generateFullAnalysis } from "./analysisEngine";
import { startReportGeneration, getJobStatus, forceRegenerate } from "./reportJobManager";
import { sendMagicLinkEmail, sendReportReadyEmail, sendAdminEmailNewAudit } from "./emailService";
import { generateExportHTML, generateExportPDF } from "./exportService";
import { generateAndConvertAudit } from "./geminiPremiumEngine";
import { formatTxtToDashboard, getSectionsByCategory } from "./formatDashboard";
import { ClientData, PhotoAnalysis } from "./types";
import { streamAuditZip } from "./exportZipService";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
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

  const createAuditBodySchema = z.object({
    email: z.string().email(),
    type: z.enum(["GRATUIT", "PREMIUM", "ELITE"]),
    responses: z.record(z.unknown()),
  });

  app.post("/api/audit/create", async (req, res) => {
    try {
      const data = createAuditBodySchema.parse(req.body);
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
    const maxWait = 20 * 60 * 1000;
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

      await storage.updateAudit(auditId, { reportDeliveryStatus: "READY" });
      
      // Récupérer l'audit pour avoir le clientName
      const completedAudit = await storage.getAudit(auditId);
      const clientName = completedAudit?.narrativeReport?.clientName || email.split('@')[0];
      
      console.log(`[Email] Sending report ready email to ${email} for audit ${auditId}`);
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
          
          // On mappe le format dashboard vers le format attendu par AuditDetail.tsx
          const mappedReport = {
            global: audit.scores?.global || 0,
            heroSummary: dashboard.resumeExecutif || "",
            sections: dashboard.sections
              .filter(s => s.category !== 'executive') // On exclut le summary du loop principal
              .map(s => ({
                id: s.id,
                title: s.title,
                score: 0,
                introduction: s.content,
                isPremium: true
              })),
            auditType: audit.type,
            clientName: dashboard.clientName,
            generatedAt: dashboard.generatedAt
          };
          
          res.json(mappedReport);
          return;
        }
        
        res.json(audit.narrativeReport);
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

  app.post("/api/audit/:id/regenerate", async (req, res) => {
    try {
      const auditId = req.params.id;
      const audit = await storage.getAudit(auditId);
      
      if (!audit) {
        res.status(404).json({ error: "Audit non trouve" });
        return;
      }

      await forceRegenerate(auditId);
      
      await storage.updateAudit(auditId, { reportDeliveryStatus: "GENERATING", narrativeReport: null });
      await startReportGeneration(auditId, audit.responses, audit.scores || {}, audit.type);
      
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

      // Récupérer les photos de l'audit pour les passer à l'export
      const photos = [audit.photoFront, audit.photoSide, audit.photoBack].filter(Boolean) as string[];

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
      
      const narrativeReport = audit.narrativeReport as any;
      if (!narrativeReport) {
        res.status(400).json({ error: "Rapport non disponible" });
        return;
      }

      // Récupérer les photos de l'audit pour les passer à l'export
      const photos = [audit.photoFront, audit.photoSide, audit.photoBack].filter(Boolean) as string[];

      const html = generateExportHTML(narrativeReport, auditId, photos);
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

      const photos = [audit.photoFront, audit.photoSide, audit.photoBack].filter(Boolean) as string[];

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
      const { priceId, email, planType, responses } = req.body;
      
      const stripe = await getUncachableStripeClient();
      
      const baseUrl = getBaseUrl();
      
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        mode: planType === 'ELITE' ? 'subscription' : 'payment',
        success_url: `${baseUrl}/dashboard?email=${encodeURIComponent(email)}&success=true`,
        cancel_url: `${baseUrl}/audit-complet/checkout?cancelled=true`,
        customer_email: email,
        metadata: {
          email,
          planType,
          responses: JSON.stringify(responses).substring(0, 500),
        },
      });

      res.json({ sessionId: session.id, url: session.url });
    } catch (error: any) {
      console.error("Stripe checkout error:", error);
      res.status(500).json({ error: error.message || "Erreur création session" });
    }
  });

  // ==================== ADMIN ENDPOINTS ====================

  app.get("/api/admin/audits", async (req, res) => {
    try {
      // TODO: Ajouter authentification admin
      const allAudits = await storage.getAllAudits();
      res.json({ success: true, audits: allAudits });
    } catch (error) {
      console.error("[Admin Audits] Error:", error);
      res.status(500).json({ success: false, error: "Erreur serveur" });
    }
  });

  app.post("/api/admin/send-cta", async (req, res) => {
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
      const data = insertReviewSchema.parse(req.body);
      const review = await reviewStorage.createReview(data);
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
      const data = insertReviewSchema.parse(req.body);
      const review = await reviewStorage.createReview(data);
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
    try {
      const reviews = await reviewStorage.getPendingReviews();
      res.json({ success: true, reviews });
    } catch (error) {
      console.error("[Admin Reviews] Error:", error);
      res.status(500).json({ success: false, error: "Erreur serveur" });
    }
  });

  app.post("/api/admin/reviews/:reviewId/approve", async (req, res) => {
    try {
      const { reviewId } = req.params;
      const { reviewedBy } = req.body;
      const review = await reviewStorage.approveReview(reviewId, reviewedBy);
      if (!review) {
        res.status(404).json({ success: false, error: "Avis non trouvé" });
        return;
      }
      res.json({ success: true, review });
    } catch (error) {
      console.error("[Admin Approve] Error:", error);
      res.status(500).json({ success: false, error: "Erreur serveur" });
    }
  });

  app.post("/api/admin/reviews/:reviewId/reject", async (req, res) => {
    try {
      const { reviewId } = req.params;
      const { reviewedBy } = req.body;
      const review = await reviewStorage.rejectReview(reviewId, reviewedBy);
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

      const result = await generateAndConvertAudit(clientData, photoAnalysis, 'PREMIUM', resumeAuditId);

      if (!result.success) {
        res.status(500).json(result);
        return;
      }

      res.json(result);
    } catch (error: any) {
      console.error("[GeminiPremiumEngine] Erreur generation audit:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Erreur serveur interne"
      });
    }
  });

  // Endpoint admin pour initialiser la base de données
  app.post("/api/admin/init-db", async (req, res) => {
    try {
      const { Pool } = await import('pg');
      
      const sql = `
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS audits (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(36) NOT NULL REFERENCES users(id),
  email VARCHAR(255) NOT NULL,
  type VARCHAR(20) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'COMPLETED',
  responses JSONB NOT NULL DEFAULT '{}',
  scores JSONB NOT NULL DEFAULT '{}',
  narrative_report JSONB,
  report_delivery_status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  report_scheduled_for TIMESTAMP,
  report_sent_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  completed_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS questionnaire_progress (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  current_section TEXT NOT NULL DEFAULT '0',
  total_sections TEXT NOT NULL DEFAULT '14',
  percent_complete TEXT NOT NULL DEFAULT '0',
  responses JSONB NOT NULL DEFAULT '{}',
  status VARCHAR(20) NOT NULL DEFAULT 'STARTED',
  started_at TIMESTAMP DEFAULT NOW() NOT NULL,
  last_activity_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS magic_tokens (
  token VARCHAR(255) PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS report_jobs (
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
);

CREATE TABLE IF NOT EXISTS reviews (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36),
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  reviewed_at TIMESTAMP,
  reviewed_by VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS cta_history (
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
);

-- ALTER TABLE pour ajouter les colonnes manquantes si elles n'existent pas
ALTER TABLE audits ADD COLUMN IF NOT EXISTS user_id VARCHAR(36);
ALTER TABLE audits ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE audits ADD COLUMN IF NOT EXISTS type VARCHAR(20);
ALTER TABLE audits ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'COMPLETED';
ALTER TABLE audits ADD COLUMN IF NOT EXISTS responses JSONB DEFAULT '{}';
ALTER TABLE audits ADD COLUMN IF NOT EXISTS scores JSONB DEFAULT '{}';
ALTER TABLE audits ADD COLUMN IF NOT EXISTS narrative_report JSONB;
ALTER TABLE audits ADD COLUMN IF NOT EXISTS report_delivery_status VARCHAR(20) DEFAULT 'PENDING';
ALTER TABLE audits ADD COLUMN IF NOT EXISTS report_scheduled_for TIMESTAMP;
ALTER TABLE audits ADD COLUMN IF NOT EXISTS report_sent_at TIMESTAMP;
ALTER TABLE audits ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();
ALTER TABLE audits ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_audits_email ON audits(email);
CREATE INDEX IF NOT EXISTS idx_audits_user_id ON audits(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_audit_id ON reviews(audit_id);
CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews(status);
CREATE INDEX IF NOT EXISTS idx_cta_history_audit_id ON cta_history(audit_id);
CREATE INDEX IF NOT EXISTS idx_report_jobs_status ON report_jobs(status);
`;
      
      const statements = sql.split(';').map(s => s.trim()).filter(s => s.length > 0 && !s.startsWith('--'));
      
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

  return httpServer;
}
