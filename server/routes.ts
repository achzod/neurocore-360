import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage, reviewStorage } from "./storage";
import { saveProgressSchema, insertAuditSchema, insertReviewSchema } from "@shared/schema";
import { z } from "zod";
import { getUncachableStripeClient, getStripePublishableKey } from "./stripeClient";
import { generateFullAnalysis } from "./analysisEngine";
import { startReportGeneration, getJobStatus, forceRegenerate } from "./reportJobManager";
import { sendMagicLinkEmail, sendReportReadyEmail } from "./emailService";
import { generateExportHTML, generateExportPDF, generateExportHTMLFromTxt } from "./exportService";
import { generateAndConvertAudit } from "./geminiPremiumEngine";
import { formatTxtToDashboard, getSectionsByCategory } from "./formatDashboard";
import { convertTxtToHtml } from "./txtToHtmlConverter";
import { ClientData, PhotoAnalysis } from "./types";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
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
    
    if (success) {
      const replitDomain = process.env.REPLIT_DOMAINS?.split(',')[0];
      const baseUrl = replitDomain 
        ? `https://${replitDomain}` 
        : `http://localhost:${process.env.PORT || 5000}`;

      await storage.updateAudit(auditId, { reportDeliveryStatus: "READY" });
      
      const emailSent = await sendReportReadyEmail(email, auditId, auditType, baseUrl);
      if (emailSent) {
        await storage.updateAudit(auditId, { reportDeliveryStatus: "SENT", reportSentAt: new Date() });
        console.log(`[Auto] Report ready and email sent for audit ${auditId}`);
      } else {
        console.error(`[Auto] Report ready but email FAILED for audit ${auditId} - check SendPulse config`);
        await storage.updateAudit(auditId, { reportDeliveryStatus: "READY" });
      }
    } else {
      await storage.updateAudit(auditId, { reportDeliveryStatus: "PENDING" });
      console.error(`[Auto] Report generation failed for audit ${auditId}`);
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

  app.delete("/api/audits/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteAudit(req.params.id);
      if (!deleted) {
        res.status(404).json({ error: "Audit non trouvé" });
        return;
      }
      res.json({ success: true, message: "Audit supprimé" });
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
      
      const replitDomain = process.env.REPLIT_DOMAINS?.split(',')[0];
      const baseUrl = replitDomain 
        ? `https://${replitDomain}` 
        : `http://localhost:${process.env.PORT || 5000}`;

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

      const replitDomain = process.env.REPLIT_DOMAINS?.split(',')[0];
      const baseUrl = replitDomain 
        ? `https://${replitDomain}` 
        : `http://localhost:${process.env.PORT || 5000}`;

      console.log(`[Resend] Sending email to ${audit.email} for audit ${auditId}`);
      
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
      const replitDomain = process.env.REPLIT_DOMAINS?.split(',')[0];
      const baseUrl = replitDomain 
        ? `https://${replitDomain}` 
        : `http://localhost:${process.env.PORT || 5000}`;

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

      const pdf = await generateExportPDF(narrativeReport, auditId);
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
      
      // Priority 1: Use cached HTML if available
      const reportHtml = (audit as any).reportHtml as string | undefined;
      if (reportHtml) {
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename=neurocore-360-${auditId.slice(0, 8)}.html`);
        res.send(reportHtml);
        return;
      }
      
      // Priority 2: Convert TXT to HTML (V4 format) with photos
      const reportTxt = (audit as any).reportTxt as string | undefined;
      if (reportTxt) {
        const photos = (audit as any).photos || [];
        const photoUrls = Array.isArray(photos) ? photos.filter((p: string) => p && p.startsWith('data:')) : [];
        const html = generateExportHTMLFromTxt(reportTxt, auditId, photoUrls);
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename=neurocore-360-${auditId.slice(0, 8)}.html`);
        res.send(html);
        return;
      }
      
      // Priority 3: Legacy fallback to narrativeReport
      const narrativeReport = audit.narrativeReport as any;
      if (!narrativeReport) {
        res.status(400).json({ error: "Rapport non disponible" });
        return;
      }

      const photos = (audit as any).photos || [];
      const photoUrls = Array.isArray(photos) ? photos.filter((p: string) => p && p.startsWith('data:')) : [];
      const html = generateExportHTML(narrativeReport, auditId, photoUrls);
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename=neurocore-360-${auditId.slice(0, 8)}.html`);
      res.send(html);
    } catch (error) {
      console.error("[Export HTML] Error:", error);
      res.status(500).json({ error: "Erreur generation HTML" });
    }
  });

  app.get("/api/audits/:id/view-html", async (req, res) => {
    try {
      const auditId = req.params.id;
      const audit = await storage.getAudit(auditId);
      if (!audit) {
        res.status(404).json({ error: "Audit non trouve" });
        return;
      }
      
      // Priority 1: Use cached HTML if available
      const reportHtml = (audit as any).reportHtml as string | undefined;
      if (reportHtml) {
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.send(reportHtml);
        return;
      }
      
      // Priority 2: Convert TXT to HTML on-the-fly with photos
      const reportTxt = (audit as any).reportTxt as string | undefined;
      if (reportTxt) {
        const photos = (audit as any).photos || [];
        const photoUrls = Array.isArray(photos) ? photos.filter((p: string) => p && p.startsWith('data:')) : [];
        const html = generateExportHTMLFromTxt(reportTxt, auditId, photoUrls);
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.send(html);
        return;
      }
      
      // Priority 3: Legacy fallback to narrativeReport
      const narrativeReport = audit.narrativeReport as any;
      if (!narrativeReport) {
        res.status(400).json({ error: "Rapport non disponible" });
        return;
      }

      const photos = (audit as any).photos || [];
      const photoUrls = Array.isArray(photos) ? photos.filter((p: string) => p && p.startsWith('data:')) : [];
      const html = generateExportHTML(narrativeReport, auditId, photoUrls);
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.send(html);
    } catch (error) {
      console.error("[View HTML] Error:", error);
      res.status(500).json({ error: "Erreur affichage HTML" });
    }
  });

  app.get("/api/preview-txt-html", async (req, res) => {
    try {
      const fs = await import('fs');
      const path = await import('path');
      
      const txtFiles = fs.readdirSync('.').filter((f: string) => f.startsWith('audit_premium_') && f.endsWith('.txt'));
      if (txtFiles.length === 0) {
        res.status(404).json({ error: "Aucun fichier TXT trouve" });
        return;
      }
      
      const latestFile = txtFiles.sort().pop();
      const txtContent = fs.readFileSync(latestFile!, 'utf-8');
      
      const html = convertTxtToHtml(txtContent);
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.send(html);
    } catch (error) {
      console.error("[Preview TXT HTML] Error:", error);
      res.status(500).json({ error: "Erreur preview" });
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
      
      const replitDomain = process.env.REPLIT_DOMAINS?.split(',')[0];
      const baseUrl = replitDomain 
        ? `https://${replitDomain}` 
        : `http://localhost:${process.env.PORT || 5000}`;
      
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

  // ==================== REVIEW ENDPOINTS ====================

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

  // Helper function to validate admin key from headers or body
  const validateAdminKey = (req: any): boolean => {
    const validKey = process.env.ADMIN_KEY || "neurocore-admin-2025";
    const keyFromHeader = req.headers["x-admin-key"];
    const keyFromBody = req.body?.adminKey;
    return keyFromHeader === validKey || keyFromBody === validKey;
  };

  app.get("/api/admin/reviews/pending", async (req, res) => {
    if (!validateAdminKey(req)) {
      res.status(401).json({ error: "Non autorisé" });
      return;
    }
    try {
      const reviews = await reviewStorage.getPendingReviews();
      res.json(reviews);
    } catch (error) {
      console.error("[Admin Reviews] Error:", error);
      res.status(500).json({ success: false, error: "Erreur serveur" });
    }
  });

  app.post("/api/admin/reviews/:reviewId/approve", async (req, res) => {
    if (!validateAdminKey(req)) {
      res.status(401).json({ error: "Non autorisé" });
      return;
    }
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
    if (!validateAdminKey(req)) {
      res.status(401).json({ error: "Non autorisé" });
      return;
    }
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
      const { clientData, photos, photoAnalysis, resumeAuditId } = req.body as {
        clientData: ClientData;
        photos?: string[];
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

      // Si des photos brutes sont fournies, on déclenche l'analyse vision
      let finalPhotoAnalysis: PhotoAnalysis | null | undefined = photoAnalysis;
      if (photos && Array.isArray(photos) && photos.length > 0) {
        try {
          const { analyzeBodyPhotosWithAI } = await import("./photoAnalysisAI");
          const visionResult = await analyzeBodyPhotosWithAI(
            { front: photos[0], back: photos[1], side: photos[2] },
            { sexe: (clientData as any)?.sexe, age: (clientData as any)?.age, objectif: (clientData as any)?.objectif }
          );
          finalPhotoAnalysis = visionResult;
        } catch (visionErr) {
          console.error("[GeminiPremiumEngine] Erreur analyse vision inline:", visionErr);
          // on continue sans bloquer
        }
      }

      const result = await generateAndConvertAudit(clientData, finalPhotoAnalysis, 'PREMIUM', resumeAuditId);

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

  app.post("/api/test/full-premium-workflow", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        res.status(400).json({ error: "Email requis" });
        return;
      }

      const { TEST_CLIENT_DATA } = await import("./generatePremiumReport");
      const { analyzeBodyPhotosWithAI } = await import("./photoAnalysisAI");
      const fs = await import("fs");

      console.log(`\n[TEST WORKFLOW] Demarrage pour ${email}`);

      let photoAnalysisData: any = null;
      const photoFacePath = "server/test-data/photos/front.jpeg";
      const photoDosPath = "server/test-data/photos/back.jpeg";
      const photoProfilPath = "server/test-data/photos/side.jpeg";

      if (fs.existsSync(photoFacePath) || fs.existsSync(photoDosPath)) {
        console.log("[TEST WORKFLOW] Analyse des photos (3 vues: face, dos, profil)...");
        const photoFace = fs.existsSync(photoFacePath) ? fs.readFileSync(photoFacePath).toString('base64') : undefined;
        const photoDos = fs.existsSync(photoDosPath) ? fs.readFileSync(photoDosPath).toString('base64') : undefined;
        const photoProfil = fs.existsSync(photoProfilPath) ? fs.readFileSync(photoProfilPath).toString('base64') : undefined;

        const analysisResult = await analyzeBodyPhotosWithAI(
          { front: photoFace, back: photoDos, side: photoProfil },
          { sexe: "homme", age: "26-35", objectif: "recomposition" }
        );

        photoAnalysisData = {
          fatDistribution: {
            pattern: analysisResult.fatDistribution.zones.includes('ventre') ? 'androide' : 'mixte',
            zones: analysisResult.fatDistribution.zones,
            severity: 'moderee'
          },
          muscleBalance: {
            hautCorps: 5,
            basCorps: 5,
            symmetrie: 7,
            groupesAvance: analysisResult.muscularBalance.strongAreas,
            groupesRetard: analysisResult.muscularBalance.weakAreas
          },
          postureIssues: {
            epaules: analysisResult.posture.shoulderAlignment,
            bassin: analysisResult.posture.pelvicTilt,
            colonne: analysisResult.posture.spineAlignment,
            asymetries: analysisResult.posture.issues
          },
          structureOsseuse: {
            largeurEpaules: 'moyenne',
            cageThoracique: 'normale',
            ratioEpaulesTaille: 'equilibre'
          }
        };
        console.log("[TEST WORKFLOW] Photos analysees");
      }

      const testData = { ...TEST_CLIENT_DATA, email };

      console.log("[TEST WORKFLOW] Creation audit...");
      const audit = await storage.createAudit({
        userId: "",
        type: "PREMIUM",
        email: email,
        responses: testData as Record<string, unknown>,
      });

      console.log(`[TEST WORKFLOW] Audit cree: ${audit.id}`);

      await storage.updateAudit(audit.id, { reportDeliveryStatus: "GENERATING" });
      await startReportGeneration(audit.id, testData as Record<string, unknown>, audit.scores || {}, "PREMIUM");

      processReportAndSendEmail(audit.id, email, "PREMIUM");

      res.json({
        success: true,
        auditId: audit.id,
        message: "Workflow demarre - rapport en cours de generation, email sera envoye automatiquement",
        dashboardUrl: `/dashboard/${audit.id}`
      });

    } catch (error: any) {
      console.error("[TEST WORKFLOW] Erreur:", error);
      res.status(500).json({ error: error.message || "Erreur serveur" });
    }
  });

  // ==================== ADMIN DASHBOARD ENDPOINTS ====================

  app.post("/api/admin/verify", async (req, res) => {
    const { adminKey } = req.body;
    const validKey = process.env.ADMIN_KEY || "neurocore-admin-2025";
    if (adminKey === validKey) {
      res.json({ success: true });
    } else {
      res.status(401).json({ success: false, error: "Clé invalide" });
    }
  });

  app.get("/api/admin/stats", async (req, res) => {
    if (!validateAdminKey(req)) {
      res.status(401).json({ error: "Non autorisé" });
      return;
    }
    try {
      const audits = await storage.getAllAudits();
      const pendingReviews = await reviewStorage.getPendingReviews();
      
      const stats = {
        totalAudits: audits.length,
        pendingReports: audits.filter(a => a.reportDeliveryStatus === "PENDING" || a.reportDeliveryStatus === "GENERATING").length,
        sentReports: audits.filter(a => a.reportDeliveryStatus === "SENT").length,
        failedReports: audits.filter(a => a.reportDeliveryStatus === "FAILED").length,
        totalReviews: pendingReviews.length,
        pendingReviews: pendingReviews.length,
      };
      
      res.json(stats);
    } catch (error) {
      console.error("[Admin Stats] Error:", error);
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  app.get("/api/admin/audits", async (req, res) => {
    if (!validateAdminKey(req)) {
      res.status(401).json({ error: "Non autorisé" });
      return;
    }
    try {
      const audits = await storage.getAllAudits();
      const sortedAudits = audits.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      res.json(sortedAudits);
    } catch (error) {
      console.error("[Admin Audits] Error:", error);
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  app.post("/api/admin/audits/:auditId/regenerate", async (req, res) => {
    try {
      const { auditId } = req.params;
      const { adminKey } = req.body;
      
      const validKey = process.env.ADMIN_KEY || "neurocore-admin-2025";
      if (adminKey !== validKey) {
        res.status(401).json({ error: "Non autorisé" });
        return;
      }

      const audit = await storage.getAudit(auditId);
      if (!audit) {
        res.status(404).json({ error: "Audit non trouvé" });
        return;
      }

      await storage.updateAudit(auditId, { reportDeliveryStatus: "GENERATING" });
      await startReportGeneration(auditId, audit.responses, audit.scores || {}, audit.type);
      processReportAndSendEmail(auditId, audit.email, audit.type);

      res.json({ success: true, message: "Regénération lancée" });
    } catch (error) {
      console.error("[Admin Regenerate] Error:", error);
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  app.post("/api/admin/audits/:auditId/resend-email", async (req, res) => {
    try {
      const { auditId } = req.params;
      const { adminKey } = req.body;
      
      const validKey = process.env.ADMIN_KEY || "neurocore-admin-2025";
      if (adminKey !== validKey) {
        res.status(401).json({ error: "Non autorisé" });
        return;
      }

      const audit = await storage.getAudit(auditId);
      if (!audit) {
        res.status(404).json({ error: "Audit non trouvé" });
        return;
      }

      if (!audit.reportTxt) {
        res.status(400).json({ error: "Rapport non généré" });
        return;
      }

      const dashboardUrl = `https://neurocore360.replit.app/dashboard/${auditId}`;
      await sendReportReadyEmail(audit.email, audit.type, dashboardUrl, audit.id);
      
      await storage.updateAudit(auditId, { 
        reportDeliveryStatus: "SENT",
        reportSentAt: new Date().toISOString()
      });

      res.json({ success: true, message: "Email renvoyé" });
    } catch (error) {
      console.error("[Admin Resend] Error:", error);
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  app.post("/api/admin/cta/send", async (req, res) => {
    try {
      const { adminKey, subject, message, targetType } = req.body;
      
      const validKey = process.env.ADMIN_KEY || "neurocore-admin-2025";
      if (adminKey !== validKey) {
        res.status(401).json({ error: "Non autorisé" });
        return;
      }

      if (!subject || !message) {
        res.status(400).json({ error: "Sujet et message requis" });
        return;
      }

      const audits = await storage.getAllAudits();
      let targetEmails: string[] = [];

      switch (targetType) {
        case "all":
          targetEmails = Array.from(new Set(audits.map(a => a.email)));
          break;
        case "premium":
          targetEmails = Array.from(new Set(audits.filter(a => a.type === "PREMIUM" || a.type === "ELITE").map(a => a.email)));
          break;
        case "gratuit":
          targetEmails = Array.from(new Set(audits.filter(a => a.type === "GRATUIT").map(a => a.email)));
          break;
        case "abandoned":
          const progresses = await storage.getAllProgress();
          targetEmails = progresses.filter(p => p.status !== "COMPLETED").map(p => p.email);
          break;
        default:
          targetEmails = Array.from(new Set(audits.map(a => a.email)));
      }

      console.log(`[Admin CTA] Envoi à ${targetEmails.length} destinataires (type: ${targetType})`);

      let sentCount = 0;
      const { sendCtaEmail } = await import("./emailService");
      for (const email of targetEmails) {
        try {
          await sendCtaEmail(email, subject, message);
          sentCount++;
        } catch (err) {
          console.error(`[Admin CTA] Erreur envoi à ${email}:`, err);
        }
      }

      res.json({ success: true, sentCount, totalTargets: targetEmails.length });
    } catch (error) {
      console.error("[Admin CTA] Error:", error);
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  return httpServer;
}
