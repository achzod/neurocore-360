import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { storage, reviewStorage, PROMO_CODES_BY_AUDIT_TYPE } from "./storage";
import { autoSendAbandonmentReminders, sendDailyReport } from "./abandonmentReminders";
import { startMonitoring, generateMonitoringReport, checkNewConversions } from "./abandonmentMonitor";
import { pool } from "./db";
import { saveProgressSchema, insertAuditSchema, insertReviewSchema, ProductPriceCents, ProductDisplayNames, type ProductTypeEnum } from "@shared/schema";
import { z } from "zod";
import { getUncachableStripeClient, getStripePublishableKey } from "./stripeClient";
import { calculateScoresFromResponses, generateFullAnalysis } from "./analysisEngine";
import { startReportGeneration, getJobStatus, forceRegenerate } from "./reportJobManager";
import {
  sendMagicLinkEmail,
  sendReportReadyEmail,
  sendAdminEmailNewAudit,
  sendGratuitUpsellEmail,
  sendGratuitJ5Email,
  sendGratuitJ7Email,
  sendReviewRequestJ3Email,
  sendPremiumJ7Email,
  sendPremiumJ14Email,
  sendDiscoveryJ14CoachingEmail,
  sendPromoCodeEmail,
  sendAdminReviewNotification,
  sendCTAEmail,
  addSubscriberToList,
  sendApexLabsWelcomeEmail,
  sendPeptidesReviewEmail,
  sendPeptidesReviewS5Email,
  sendPeptidesReviewS12Email,
} from "./emailService";
import { generateExportHTML, generateExportPDF } from "./exportService";
import { generateAndConvertAuditWithClaude } from "./anthropicEngine";
import { formatTxtToDashboard, formatSectionToHTML, getSectionsByCategory } from "./formatDashboard";
import { ClientData, PhotoAnalysis } from "./types";
import { generateEnhancedSupplementsHTML, generateSupplementStack } from "./supplementEngine";
import { streamAuditZip } from "./exportZipService";
import { createPayPalOrder, capturePayPalOrder, isPayPalConfigured } from "./paypalClient";
import { isAnthropicAvailable } from "./anthropicEngine";
import { getAuthPayload, type AuthPayload } from "./auth";
import crypto from "crypto";
import { validateAnthropicConfig, ANTHROPIC_CONFIG } from "./anthropicConfig";

import { registerKnowledgeRoutes } from "./knowledge";
import { registerBloodAnalysisRoutes } from "./blood-analysis/routes";
import { registerBloodTestsRoutes } from "./blood-tests/routes";
import { signAuthToken } from "./auth";
import { analyzeDiscoveryScan, convertToNarrativeReport } from "./discovery-scan";
import { generatePeptidesProtocol, checkPeptidesSafetyGate } from "./peptidesEngine";
import { createRateLimiter } from "./middleware/rateLimit";
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

  // Ensure missing indexes on existing tables (non-blocking)
  storage.ensureExistingTableIndexes().catch((err: any) => {
    console.error("[Boot] Error ensuring indexes:", err);
  });

  // Redirect root to /apexlabs for prelaunch subdomain
  app.use((req, res, next) => {
    const host = req.get('host') || '';
    if (host.includes('apexlabsprelaunch') && req.path === '/') {
      return res.redirect(301, '/apexlabs');
    }
    next();
  });

  // Helper function to get base URL — prefer env vars over request headers
  function getBaseUrl(_req?: Request): string {
    if (process.env.PUBLIC_BASE_URL) {
      return process.env.PUBLIC_BASE_URL.replace(/\/+$/, "");
    }
    if (process.env.APP_URL) {
      return process.env.APP_URL.replace(/\/+$/, "");
    }
    if (process.env.RENDER_EXTERNAL_URL) {
      return process.env.RENDER_EXTERNAL_URL.replace(/\/+$/, "");
    }
    if (process.env.REPLIT_DOMAINS) {
      const replitDomain = process.env.REPLIT_DOMAINS.split(",")[0];
      return `https://${replitDomain}`;
    }
    return `http://localhost:${process.env.PORT || 5000}`;
  }

  const auditCreateLimiter = createRateLimiter({ windowMs: 60_000, max: 5 });
  const discoveryLimiter = createRateLimiter({ windowMs: 60_000, max: 5 });
  const checkoutLimiter = createRateLimiter({ windowMs: 60_000, max: 5 });
  const magicLinkLimiter = createRateLimiter({ windowMs: 15 * 60_000, max: 5 }); // 5 per 15min per IP
  const adminLimiter = createRateLimiter({ windowMs: 60_000, max: 20 }); // 20 per min per IP

  app.get("/api/health", async (_req, res) => {
    try {
      await pool.query("SELECT 1");
      res.json({ status: "ok", db: "connected", timestamp: new Date().toISOString() });
    } catch (err) {
      res.status(503).json({ status: "unhealthy", db: "disconnected", timestamp: new Date().toISOString() });
    }
  });

  app.get("/api/version", (_req, res) => {
    res.json({
      commit: process.env.RENDER_GIT_COMMIT || process.env.GIT_COMMIT || null,
      service: process.env.RENDER_SERVICE_NAME || null,
      deployedAt: new Date().toISOString(),
    });
  });

  // Pre-launch diagnostic — checks all critical services
  app.get("/api/admin/launch-check", async (req, res) => {
    if (!requireAdminAuth(req, res)) return;
    const checks: Record<string, { ok: boolean; detail?: string }> = {};

    // 1. Database
    try {
      const r = await pool.query("SELECT COUNT(*) FROM audits");
      checks.database = { ok: true, detail: `${r.rows[0].count} audits in DB` };
    } catch (e: any) {
      checks.database = { ok: false, detail: e.message };
    }

    // 2. Stripe
    checks.stripe = {
      ok: Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET),
      detail: !process.env.STRIPE_SECRET_KEY ? "STRIPE_SECRET_KEY missing" :
              !process.env.STRIPE_WEBHOOK_SECRET ? "STRIPE_WEBHOOK_SECRET missing" :
              process.env.STRIPE_SECRET_KEY.startsWith("sk_live_") ? "LIVE mode" : "TEST mode",
    };

    // 3. Email (SendPulse API)
    const spUser = process.env.SENDPULSE_USER_ID || process.env.SENDPULSE_API_USER_ID;
    const spSecret = process.env.SENDPULSE_SECRET || process.env.SENDPULSE_API_SECRET;
    checks.email = {
      ok: Boolean(spUser && spSecret),
      detail: !spUser ? "SENDPULSE_USER_ID missing" :
              !spSecret ? "SENDPULSE_SECRET missing" : "SendPulse configured",
    };

    // 4. AI (Anthropic Claude)
    checks.anthropic = {
      ok: Boolean(process.env.ANTHROPIC_API_KEY),
      detail: process.env.ANTHROPIC_API_KEY ? "configured" : "ANTHROPIC_API_KEY missing — reports won't generate",
    };

    // 5. Sentry
    checks.sentry = {
      ok: Boolean(process.env.SENTRY_DSN),
      detail: process.env.SENTRY_DSN ? "enabled" : "NOT configured — errors invisible",
    };

    // 6. Admin
    checks.admin = {
      ok: Boolean(process.env.ADMIN_SECRET),
      detail: process.env.ADMIN_SECRET ? "configured" : "ADMIN_SECRET missing",
    };

    // 7. APP_URL
    checks.appUrl = {
      ok: Boolean(process.env.APP_URL),
      detail: process.env.APP_URL || "NOT SET — emails will use fallback URL",
    };

    const allOk = Object.values(checks).every((c) => c.ok);
    res.json({ ready: allOk, checks });
  });

  // ==================== ADMIN RECONCILIATION STATS ====================
  app.get("/api/admin/reconciliation-stats", async (req, res) => {
    if (!requireAdminAuth(req, res)) return;

    try {
      // Count paid orders without audit_id (only real clients since launch)
      const missingResult = await pool.query(`
        SELECT COUNT(*) as missing_count
        FROM orders
        WHERE status = 'paid'
          AND audit_id IS NULL
          AND product_type IN ('GRATUIT', 'PREMIUM', 'ELITE')
          AND created_at >= '2026-03-17'
      `);

      // Count total paid orders (only real clients since launch)
      const totalPaidResult = await pool.query(`
        SELECT COUNT(*) as total_paid
        FROM orders
        WHERE status = 'paid'
          AND product_type IN ('GRATUIT', 'PREMIUM', 'ELITE')
          AND created_at >= '2026-03-17'
      `);

      // Count audits created (only real clients since launch)
      const auditsResult = await pool.query(`
        SELECT COUNT(*) as total_audits
        FROM audits
        WHERE created_at >= '2026-03-17'
      `);

      const missingCount = parseInt(missingResult.rows[0].missing_count);
      const totalPaid = parseInt(totalPaidResult.rows[0].total_paid);
      const totalAudits = parseInt(auditsResult.rows[0].total_audits);

      res.json({
        success: true,
        gap: missingCount,
        totalPaidOrders: totalPaid,
        totalAudits,
        ordersWithAudit: totalPaid - missingCount,
        needsReconciliation: missingCount > 0,
      });
    } catch (error) {
      console.error("[Reconciliation Stats] Error:", error);
      res.status(500).json({
        success: false,
        error: "Erreur récupération stats",
      });
    }
  });

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

  const PHOTO_FIELD_KEYS = PHOTO_FIELD_VARIANTS.flat();
  const isInlineImage = (value: unknown): value is string =>
    typeof value === "string" && value.startsWith("data:image");

  function sanitizeAuditPayload(audit: any): any {
    if (!audit) return audit;
    const sanitized = { ...audit };

    if (sanitized.responses && typeof sanitized.responses === "object") {
      const responses = { ...sanitized.responses };
      for (const key of PHOTO_FIELD_KEYS) {
        if (isInlineImage((responses as any)[key])) {
          delete (responses as any)[key];
        }
      }
      sanitized.responses = responses;
    }

    for (const key of PHOTO_FIELD_KEYS) {
      if (isInlineImage((sanitized as any)[key])) {
        delete (sanitized as any)[key];
      }
    }

    if (Array.isArray(sanitized.photos)) {
      delete sanitized.photos;
    }

    delete sanitized.narrativeReport;
    delete sanitized.reportTxt;
    delete sanitized.reportHtml;

    return sanitized;
  }

  const parseResponsesRecord = (value: unknown): Record<string, unknown> | null => {
    if (!value) return null;
    if (typeof value === "string") {
      try {
        const parsed = JSON.parse(value);
        return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
      } catch {
        return null;
      }
    }
    if (typeof value === "object" && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
    return null;
  };

  const mergeResponses = (
    primary: Record<string, unknown>,
    fallback: Record<string, unknown> | null
  ): Record<string, unknown> => {
    if (!fallback) return primary;
    return { ...fallback, ...primary };
  };

  const ensureAuditScores = (
    rawScores: unknown,
    rawResponses: unknown
  ): Record<string, number> => {
    const scores =
      rawScores && typeof rawScores === "object" && !Array.isArray(rawScores)
        ? (rawScores as Record<string, number>)
        : null;
    const hasGlobal = scores && Number.isFinite(scores.global);
    if (scores && hasGlobal && Object.keys(scores).length >= 3) {
      return scores;
    }
    const responses = parseResponsesRecord(rawResponses) || {};
    return calculateScoresFromResponses(responses);
  };

  // Rate limit all admin endpoints
  app.use("/api/admin", adminLimiter);

  // Admin auth helper - checks ADMIN_SECRET or ADMIN_KEY (header only)
  // SECURITY: Uses constant-time comparison to prevent timing attacks
  function requireAdminAuth(req: any, res: any, silent?: boolean): boolean {
    const adminKey = req.headers["x-admin-key"];
    const validKey = process.env.ADMIN_SECRET || process.env.ADMIN_KEY;

    if (!validKey || !adminKey) {
      if (!silent) res.status(401).json({ error: "Unauthorized - admin key required" });
      return false;
    }

    // Constant-time comparison to prevent timing attacks
    try {
      const valid = crypto.timingSafeEqual(
        Buffer.from(String(adminKey)),
        Buffer.from(validKey)
      );
      if (!valid && !silent) {
        res.status(401).json({ error: "Unauthorized - admin key required" });
      }
      return valid;
    } catch {
      if (!silent) res.status(401).json({ error: "Unauthorized - admin key required" });
      return false;
    }
  }

  // SECURITY: Check if user owns the audit (prevents IDOR vulnerability)
  async function checkAuditOwnership(req: any, res: any, auditId: string, silent?: boolean): Promise<boolean> {
    const audit = await storage.getAudit(auditId);
    if (!audit) {
      if (!silent) res.status(404).json({ error: "Audit non trouvé" });
      return false;
    }

    // Allow admin access
    const isAdmin = requireAdminAuth(req, res, true);
    if (isAdmin) return true;

    // Check user ownership via JWT
    const payload = getAuthPayload(req);
    if (!payload || payload.email.toLowerCase() !== audit.email.toLowerCase()) {
      if (!silent) res.status(403).json({ error: "Accès non autorisé à ce rapport" });
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

  app.post("/api/questionnaire/clear-progress", async (req, res) => {
    try {
      const schema = z.object({ email: z.string().email() });
      const { email } = schema.parse(req.body);
      await storage.deleteProgress(email);
      res.json({ success: true });
    } catch (error) {
      console.error("[Progress] Error clearing:", error);
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  app.get("/api/questionnaire/progress/:email", async (req, res) => {
    try {
      const email = req.params.email;
      const progress = await storage.getProgress(email);
      if (!progress) {
        res.status(404).json({ error: "Aucune progression trouvée" });
        return;
      }
      // Evite de recharger une progression plus ancienne qu'un audit deja termine.
      try {
        const audits = await storage.getAuditsByEmail(email);
        const latestAudit = audits[0];
        const progressTimestamp = progress.lastActivityAt ? new Date(progress.lastActivityAt).getTime() : 0;
        const latestAuditTimestamp = latestAudit?.createdAt
          ? new Date(latestAudit.createdAt).getTime()
          : latestAudit?.completedAt
          ? new Date(latestAudit.completedAt).getTime()
          : 0;
        if (latestAuditTimestamp && progressTimestamp && latestAuditTimestamp > progressTimestamp) {
          await storage.deleteProgress(email);
          res.status(404).json({ error: "Aucune progression trouvée" });
          return;
        }
      } catch (err) {
        console.warn("[Questionnaire] Unable to compare audit/progress freshness:", err);
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

  // Admin: Contacts - single source of truth
  app.post("/api/admin/contacts/sync", async (req, res) => {
    if (!requireAdminAuth(req, res)) return;
    try {
      const result = await storage.syncContacts();
      res.json({ success: true, ...result });
    } catch (error: any) {
      console.error("[Admin] Contacts sync error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/admin/contacts", async (req, res) => {
    if (!requireAdminAuth(req, res)) return;
    try {
      const contacts = await storage.getAllContacts();
      res.json({ success: true, total: contacts.length, contacts });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/admin/contacts/stats", async (req, res) => {
    if (!requireAdminAuth(req, res)) return;
    try {
      const stats = await storage.getContactStats();
      res.json({ success: true, stats });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Admin: Broadcast email to all Discovery Scan clients
  app.post("/api/admin/broadcast-discovery", async (req, res) => {
    if (!requireAdminAuth(req, res)) return;
    try {
      const { dryRun = false, maxToSend = 50, subject, message } = req.body;
      if (!subject || !message) {
        res.status(400).json({ error: "subject et message requis" });
        return;
      }

      const allAudits = await storage.getAllAudits();
      const discovery = allAudits.filter((a: any) => a.type === "GRATUIT" && a.email && !a.email.includes("test") && !a.email.includes("debug") && !a.email.includes("achzodcoaching") && !a.email.includes("achkou"));

      // Unique emails only, skip already sent (tracked via emailTracking)
      const { db } = await import("./db");
      const { emailTracking: emailTrackingTable } = await import("../shared/drizzle-schema");
      const allTracking = await db.select().from(emailTrackingTable);
      const alreadySent = new Set(allTracking.filter((t: any) => t.emailType === "broadcastDiscovery").map((t: any) => t.email?.toLowerCase()));

      const seen = new Set<string>();
      const unique: string[] = [];
      for (const a of discovery) {
        const email = a.email.toLowerCase();
        if (!seen.has(email) && !alreadySent.has(email)) {
          seen.add(email);
          unique.push(a.email);
        }
      }

      if (dryRun) {
        res.json({ success: true, dryRun: true, totalEmails: unique.length, alreadySent: alreadySent.size, preview: unique.slice(0, 10) });
        return;
      }

      const toSend = unique.slice(0, maxToSend);
      let sent = 0, errors = 0;
      for (const email of toSend) {
        try {
          const ok = await sendCTAEmail(email, subject, message);
          if (ok) {
            sent++;
            await db.insert(emailTrackingTable).values({ email: email.toLowerCase(), emailType: "broadcastDiscovery", sentAt: new Date() }).catch(() => {});
          }
          else errors++;
        } catch { errors++; }
      }

      res.json({ success: true, totalEligible: unique.length, sent, errors, maxToSend });
    } catch (error) {
      console.error("[Admin] Broadcast error:", error);
      res.status(500).json({ error: "Erreur broadcast" });
    }
  });

  // Admin: Auto-send abandonment reminders
  app.post("/api/admin/send-abandonment-reminders", async (req, res) => {
    if (!requireAdminAuth(req, res)) return;
    try {
      const { dryRun = false, maxToSend = 50 } = req.body;

      console.log(`[API] Lancement auto-send abandonment reminders (dryRun: ${dryRun}, max: ${maxToSend})`);

      const stats = await autoSendAbandonmentReminders(storage, {
        dryRun,
        maxToSend,
        notifyAdmin: true,
      });

      res.json({
        success: true,
        stats,
        message: dryRun
          ? `[DRY RUN] ${stats.sent} relances auraient été envoyées`
          : `${stats.sent} relances envoyées avec succès`
      });
    } catch (error: any) {
      console.error("[API] Error sending abandonment reminders:", error);
      res.status(500).json({ error: error.message || "Erreur serveur" });
    }
  });

  // Admin: Get abandonment stats
  app.get("/api/admin/abandonment-stats", async (req, res) => {
    if (!requireAdminAuth(req, res)) return;
    try {
      const days = parseInt(req.query.days as string) || 7;
      const stats = await storage.getAbandonmentStats(days);
      res.json({ success: true, stats });
    } catch (error: any) {
      console.error("[API] Error fetching abandonment stats:", error);
      res.status(500).json({ error: error.message || "Erreur serveur" });
    }
  });

  // Admin: Get conversion stats (Meta + Google Ads)
  app.get("/api/admin/conversion-stats", async (req, res) => {
    if (!requireAdminAuth(req, res)) return;
    try {
      const { getConversionStats } = await import('./conversionTracker');
      const period = (req.query.period as '24h' | '7d' | '30d') || '24h';
      const stats = await getConversionStats(period);
      res.json({ success: true, stats });
    } catch (error: any) {
      console.error("[API] Error fetching conversion stats:", error);
      res.status(500).json({ error: error.message || "Erreur serveur" });
    }
  });

  // Public: Get conversion stats with secret key (no login required)
  app.get("/api/conversions", async (req, res) => {
    const key = req.query.key;
    const adminSecret = process.env.ADMIN_SECRET || "your_admin_secret";

    if (key !== adminSecret) {
      return res.status(403).json({ error: "Invalid key" });
    }

    try {
      const { getConversionStats } = await import('./conversionTracker');
      const period = (req.query.period as '24h' | '7d' | '30d') || '24h';
      const stats = await getConversionStats(period);
      res.json({ success: true, stats });
    } catch (error: any) {
      console.error("[API] Error fetching conversion stats:", error);
      res.status(500).json({ error: error.message || "Erreur serveur" });
    }
  });

  // Admin: Send daily conversion report
  app.post("/api/admin/send-conversion-report", async (req, res) => {
    if (!requireAdminAuth(req, res)) return;
    try {
      const { sendDailyConversionReport } = await import('./conversionTracker');
      await sendDailyConversionReport();
      res.json({ success: true, message: "Rapport conversions envoyé" });
    } catch (error: any) {
      console.error("[API] Error sending conversion report:", error);
      res.status(500).json({ error: error.message || "Erreur serveur" });
    }
  });

  // Admin: Send daily report
  app.post("/api/admin/send-daily-report", async (req, res) => {
    if (!requireAdminAuth(req, res)) return;
    try {
      await sendDailyReport(storage);
      res.json({ success: true, message: "Rapport quotidien envoyé" });
    } catch (error: any) {
      console.error("[API] Error sending daily report:", error);
      res.status(500).json({ error: error.message || "Erreur serveur" });
    }
  });

  // Admin: Get monitoring report
  app.get("/api/admin/monitoring-report", async (req, res) => {
    if (!requireAdminAuth(req, res)) return;
    try {
      const report = await generateMonitoringReport(storage);
      res.json({ success: true, report });
    } catch (error: any) {
      console.error("[API] Error generating monitoring report:", error);
      res.status(500).json({ error: error.message || "Erreur serveur" });
    }
  });

  // Admin: Check new conversions
  app.get("/api/admin/check-conversions", async (req, res) => {
    if (!requireAdminAuth(req, res)) return;
    try {
      const result = await checkNewConversions(storage);
      res.json({ success: true, ...result });
    } catch (error: any) {
      console.error("[API] Error checking conversions:", error);
      res.status(500).json({ error: error.message || "Erreur serveur" });
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
    if (!requireAdminAuth(req, res)) return;
    try {
      const isConfigured = validateAnthropicConfig();
      const hasKey = !!ANTHROPIC_CONFIG.ANTHROPIC_API_KEY;

      if (!isConfigured) {
        res.status(500).json({
          status: "error",
          message: "ANTHROPIC_API_KEY not configured",
          config: { hasKey, model: ANTHROPIC_CONFIG.ANTHROPIC_MODEL }
        });
        return;
      }

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
        config: { model: ANTHROPIC_CONFIG.ANTHROPIC_MODEL }
      });
    } catch (error: any) {
      console.error("[Test Claude] Error:", error);
      res.status(500).json({
        status: "error",
        message: "Erreur test Claude",
      });
    }
  });

  app.post("/api/audit/create", auditCreateLimiter, async (req, res) => {
    try {
      const data = createAuditBodySchema.parse(req.body);
      if (data.type === "GRATUIT") {
        const progress = await storage.getProgress(data.email);
        const progressResponses = parseResponsesRecord(progress?.responses);
        const mergedResponses = mergeResponses(data.responses, progressResponses);
        const audit = await storage.createAudit({
          userId: "",
          type: data.type,
          email: data.email,
          responses: mergedResponses,
        });

        // Create zero-amount order for free audit
        try {
          const freeOrder = await storage.createOrder({
            email: data.email,
            productType: "GRATUIT",
            amountCents: 0,
            finalAmountCents: 0,
          });
          await storage.updateOrder(freeOrder.id, { status: "paid", paidAt: new Date(), auditId: audit.id });
        } catch (orderErr) {
          console.error("[Orders] Error creating free audit order:", orderErr);
        }

        // Nettoie la progression une fois l'audit crée pour éviter les pre-remplissages obsoletes.
        try {
          await storage.deleteProgress(data.email);
        } catch (err) {
          console.warn("[Questionnaire] Unable to clear progress after audit creation:", err);
        }

        // Envoyer notification admin pour GRATUIT
        const clientName = (mergedResponses as any)?.prenom || (mergedResponses as any)?.name || data.email.split('@')[0];
        console.log(`[Admin Email] 📧 Triggering admin notification for GRATUIT audit ${audit.id}...`);
        sendAdminEmailNewAudit(data.email, clientName, data.type, audit.id)
          .then((success) => {
            if (success) {
              console.log(`[Admin Email] ✅ Admin notification sent successfully for ${audit.id}`);
            } else {
              console.error(`[Admin Email] ❌ Admin notification failed for ${audit.id}`);
            }
          })
          .catch((err) => {
            console.error(`[Admin Email] ❌ Error in admin notification for ${audit.id}:`, err);
          });

        await storage.updateAudit(audit.id, { reportDeliveryStatus: "GENERATING" });
        res.json(audit);

        const DISCOVERY_GENERATION_TIMEOUT = 5 * 60 * 1000; // 5 minutes max
        (async () => {
          try {
            console.log(`[Discovery Scan] Starting report generation for audit ${audit.id}`);
            const generationPromise = (async () => {
              const result = await analyzeDiscoveryScan(mergedResponses as any);
              console.log(`[Discovery Scan] Analysis complete for ${audit.id}, generating narrative...`);
              const narrativeReport = await convertToNarrativeReport(result, mergedResponses as any);
              console.log(`[Discovery Scan] Narrative generated for ${audit.id} (${JSON.stringify(narrativeReport).length} chars)`);
              return narrativeReport;
            })();

            const timeoutPromise = new Promise<never>((_, reject) => {
              setTimeout(() => reject(new Error(`Discovery Scan generation timed out after ${DISCOVERY_GENERATION_TIMEOUT / 1000}s`)), DISCOVERY_GENERATION_TIMEOUT);
            });

            const narrativeReport = await Promise.race([generationPromise, timeoutPromise]);

            // Check if delivery should be delayed (scheduled)
            const scheduledFor = audit.reportScheduledFor ? new Date(audit.reportScheduledFor) : null;
            const shouldDelay = scheduledFor && scheduledFor > new Date();

            if (shouldDelay) {
              await storage.updateAudit(audit.id, {
                narrativeReport,
                reportDeliveryStatus: "SCHEDULED",
              });
              console.log(`[Discovery Scan] Report SCHEDULED for audit ${audit.id} — delivery at ${scheduledFor.toISOString()}`);
            } else {
              await storage.updateAudit(audit.id, {
                narrativeReport,
                reportDeliveryStatus: "READY",
              });
              console.log(`[Discovery Scan] Report READY for audit ${audit.id}`);

              const baseUrl = getBaseUrl();
              const emailSent = await sendReportReadyEmail(audit.email, audit.id, audit.type, baseUrl);
              if (emailSent) {
                await storage.updateAudit(audit.id, { reportDeliveryStatus: "SENT", reportSentAt: new Date() });
                const clientName = (mergedResponses as any)?.prenom || data.email.split("@")[0];
                await sendAdminEmailNewAudit(audit.email, clientName, audit.type, audit.id);
              }
            }
          } catch (error: any) {
            console.error(`[Discovery Scan] Generation FAILED for audit ${audit.id}:`, error?.message || error);
            try {
              await storage.updateAudit(audit.id, { reportDeliveryStatus: "NEEDS_REVIEW" });
            } catch (updateErr) {
              console.error(`[Discovery Scan] Failed to update status for ${audit.id}:`, updateErr);
            }
          }
        })().catch((unhandled) => {
          console.error(`[Discovery Scan] UNHANDLED error for audit ${audit.id}:`, unhandled);
        });

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

      // Nettoie la progression une fois l'audit crée pour éviter les pre-remplissages obsoletes.
      try {
        await storage.deleteProgress(data.email);
      } catch (err) {
        console.warn("[Questionnaire] Unable to clear progress after audit creation:", err);
      }

      // Envoyer notification admin pour PREMIUM/ELITE
      const clientName = (data.responses as any)?.prenom || (data.responses as any)?.name || data.email.split('@')[0];
      console.log(`[Admin Email] 📧 Triggering admin notification for ${data.type} audit ${audit.id}...`);
      sendAdminEmailNewAudit(data.email, clientName, data.type, audit.id)
        .then((success) => {
          if (success) {
            console.log(`[Admin Email] ✅ Admin notification sent successfully for ${audit.id}`);
          } else {
            console.error(`[Admin Email] ❌ Admin notification failed for ${audit.id}`);
          }
        })
        .catch((err) => {
          console.error(`[Admin Email] ❌ Error in admin notification for ${audit.id}:`, err);
        });

      await storage.updateAudit(audit.id, { reportDeliveryStatus: "GENERATING" });
      await startReportGeneration(audit.id, audit.responses, audit.scores || {}, audit.type);
      processReportAndSendEmail(audit.id, audit.email, audit.type).catch((err) => {
        console.error(`[processReportAndSendEmail] Unhandled error for audit ${audit.id}:`, err);
        storage.updateAudit(audit.id, { reportDeliveryStatus: "EMAIL_FAILED" }).catch(() => {});
      });

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
      console.log(`[Email] Processing report delivery for audit ${auditId}`);

      const completedAudit = await storage.getAudit(auditId);
      if (!completedAudit) {
        console.error(`[Email] Audit ${auditId} not found — skipping`);
        return;
      }

      const deliveryStatus = completedAudit.reportDeliveryStatus;

      // ============================================
      // GATE 1: Email already sent? STOP.
      // ============================================
      if (completedAudit.reportSentAt) {
        console.log(`[Email] ⏭️ Email already sent for ${auditId} at ${completedAudit.reportSentAt} — SKIPPING (no double email)`);
        return;
      }
      if (deliveryStatus === 'SENT') {
        console.log(`[Email] ⏭️ Status already SENT for ${auditId} — SKIPPING`);
        return;
      }

      // ============================================
      // GATE 2: Validation status
      // ============================================
      if (deliveryStatus === 'NEEDS_REVIEW') {
        console.error(`[Email] ❌ Report ${auditId} NEEDS_REVIEW — EMAIL BLOCKED`);
        return;
      }

      const validationResult = (completedAudit as any)?.narrativeReport?.validationResult;
      if (validationResult && validationResult.score < 60) {
        console.error(`[Email] ❌ Report ${auditId} score ${validationResult.score}/100 — EMAIL BLOCKED`);
        await storage.updateAudit(auditId, { reportDeliveryStatus: "NEEDS_REVIEW" });
        return;
      }

      // ============================================
      // GATE 3: Scheduled for later?
      // ============================================
      const scheduledFor = completedAudit?.reportScheduledFor;
      if (scheduledFor && new Date(scheduledFor) > new Date()) {
        await storage.updateAudit(auditId, { reportDeliveryStatus: "SCHEDULED" });
        console.log(`[Email] ⏭️ Report ${auditId} SCHEDULED for ${new Date(scheduledFor).toISOString()} — deferred`);
        return;
      }

      // ============================================
      // GATE 4: Report must have REAL content
      // ============================================
      const reportTxt = (completedAudit as any)?.reportTxt || (completedAudit as any)?.narrativeReport?.txt || '';
      const reportHtml = (completedAudit as any)?.reportHtml || (completedAudit as any)?.narrativeReport?.html || '';
      if (reportTxt.length < 500 && reportHtml.length < 500) {
        console.error(`[Email] ❌ HARD BLOCK: Report ${auditId} has no real content (TXT:${reportTxt.length} HTML:${reportHtml.length}) — EMAIL BLOCKED`);
        await storage.updateAudit(auditId, { reportDeliveryStatus: "NEEDS_REVIEW" });
        return;
      }
      console.log(`[Email] ✅ Content verified: TXT=${reportTxt.length} HTML=${reportHtml.length} chars`);

      // ============================================
      // GATE 5: ELITE must have valid photo analysis
      // ============================================
      if (auditType === "ELITE") {
        const photoAnalysis = (completedAudit as any)?.narrativeReport?.photoAnalysis;
        const summary = photoAnalysis?.summary || "";
        const posture = photoAnalysis?.posture || {};
        const allNonVisible = posture.headPosition === "non visible" && posture.spineAlignment === "non visible" && posture.shoulderAlignment === "non visible";
        const hasError = summary.includes("error") || summary.includes("400") || summary.includes("non disponible");

        if (!photoAnalysis || hasError || allNonVisible) {
          console.error(`[Email] ❌ ELITE report ${auditId} has FAILED photo analysis — EMAIL BLOCKED. Summary: ${summary.slice(0, 200)}`);
          await storage.updateAudit(auditId, { reportDeliveryStatus: "NEEDS_REVIEW" });
          return;
        }
        console.log(`[Email] ✅ ELITE photo analysis verified: posture score ${posture.overallScore || "?"}`);
      }

      // ============================================
      // GATE 6: Verify report link actually works
      // ============================================
      const reportPath = auditType === 'ELITE' ? 'ultimate' : auditType === 'PREMIUM' ? 'anabolic' : 'scan';
      const reportUrl = `${baseUrl}/${reportPath}/${auditId}`;
      console.log(`[Email] Report URL: ${reportUrl}`);

      // ============================================
      // ALL GATES PASSED — Send email
      // ============================================
      await storage.updateAudit(auditId, { reportDeliveryStatus: "READY" });
      console.log(`[Email] ✅ All gates passed — sending to ${email}`);

      const emailSent = await sendReportReadyEmail(email, auditId, auditType, baseUrl);
      if (emailSent) {
        await storage.updateAudit(auditId, { reportDeliveryStatus: "SENT", reportSentAt: new Date() });
        console.log(`[Email] ✅ Email SENT to ${email} for audit ${auditId}`);
      } else {
        console.error(`[Email] ❌ Email FAILED for audit ${auditId}`);
        await storage.updateAudit(auditId, { reportDeliveryStatus: "READY" });
      }
    } else {
      await storage.updateAudit(auditId, { reportDeliveryStatus: "PENDING" });
      console.error(`[Email] ❌ Report generation failed or timeout for audit ${auditId}`);
    }
    } catch (error) {
      console.error(`[Email] ❌ Error in processReportAndSendEmail for audit ${auditId}:`, error);
      // Don't overwrite SCHEDULED status on error — let cron handle delivery
      const currentAudit = await storage.getAudit(auditId).catch(() => null);
      if (currentAudit?.reportDeliveryStatus !== "SCHEDULED") {
        await storage.updateAudit(auditId, { reportDeliveryStatus: "READY" }).catch(() => {});
      }
    }
  }

  app.get("/api/audits", async (req, res) => {
    try {
      const email = req.query.email as string;
      if (!email) {
        res.status(400).json({ error: "Email requis" });
        return;
      }
      // Require auth: user can only query their own audits (or admin)
      const payload = getAuthPayload(req);
      const isAdmin = requireAdminAuth(req, res, true);
      if (!isAdmin) {
        if (!payload || payload.email.toLowerCase() !== email.trim().toLowerCase()) {
          res.status(401).json({ error: "Unauthorized" });
          return;
        }
      }
      const audits = await storage.getAuditsByEmail(email);
      const light = req.query.light === "1";
      res.json(light ? audits.map(sanitizeAuditPayload) : audits);
    } catch (error) {
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  app.get("/api/audits/:id", async (req, res) => {
    try {
      // UUID audit IDs are unguessable — allow direct access for report viewing
      const audit = await storage.getAudit(req.params.id);
      if (!audit) {
        res.status(404).json({ error: "Audit non trouvé" });
        return;
      }
      // Block report content if scheduled for future delivery
      if (audit.reportScheduledFor && new Date(audit.reportScheduledFor) > new Date()) {
        const sanitized = { ...audit, narrativeReport: null, reportTxt: undefined, reportHtml: undefined };
        const light = req.query.light === "1";
        res.json(light ? sanitizeAuditPayload(sanitized) : sanitized);
        return;
      }
      const light = req.query.light === "1";
      res.json(light ? sanitizeAuditPayload(audit) : audit);
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
      // UUID audit IDs are unguessable — allow direct access
      const job = await getJobStatus(req.params.id);
      const jobReferenceTime = job?.lastProgressAt
        ? new Date(job.lastProgressAt).getTime()
        : job?.startedAt
        ? new Date(job.startedAt).getTime()
        : 0;
      const isJobStale =
        job &&
        (job.status === "pending" || job.status === "generating") &&
        jobReferenceTime > 0 &&
        Date.now() - jobReferenceTime > 15 * 60 * 1000;

      if (isJobStale) {
        console.warn(`[Narrative] Job stale for audit ${req.params.id}, relance generation.`);
        const audit = await storage.getAudit(req.params.id);
        if (!audit) {
          res.status(404).json({ error: "Audit non trouvé" });
          return;
        }
        await forceRegenerate(req.params.id);
        await storage.updateAudit(req.params.id, { reportDeliveryStatus: "GENERATING" });
        await startReportGeneration(req.params.id, audit.responses, audit.scores || {}, audit.type);
        processReportAndSendEmail(req.params.id, audit.email, audit.type);
        res.status(202).json({ message: "Rapport relance", status: "generating", progress: 0 });
        return;
      }
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
      // SECURITY: Verify user owns this audit (IDOR protection)
      if (!(await checkAuditOwnership(req, res, req.params.id))) {
        return;
      }

      const audit = await storage.getAudit(req.params.id);
      if (!audit) {
        res.status(404).json({ error: "Audit non trouvé" });
        return;
      }

      // Block report content if scheduled for future delivery
      if (audit.reportScheduledFor && new Date(audit.reportScheduledFor) > new Date()) {
        res.status(202).json({
          status: "scheduled",
          scheduledFor: audit.reportScheduledFor,
          message: "Ton analyse approfondie est en cours de rédaction. Tu recevras ton rapport complet par email.",
        });
        return;
      }

      const narrativeReport = audit.narrativeReport as any;
      if (!narrativeReport) {
        res.status(400).json({ error: "Rapport non disponible" });
        return;
      }

      // Cache completed reports for 5 minutes (private — user-specific data)
      if (audit.reportDeliveryStatus === "READY" || audit.reportDeliveryStatus === "SENT") {
        res.setHeader("Cache-Control", "private, max-age=300");
      }

      // Discovery Scan (GRATUIT) returns { sections, metrics, globalScore, clientName }
      if (narrativeReport.sections && Array.isArray(narrativeReport.sections)) {
        const category = req.query.category as string;
        const sections = narrativeReport.sections.map((s: any, idx: number) => ({
          id: s.id || `section-${idx}`,
          title: s.title || "",
          score: 0,
          content: s.content || "",
          order: idx,
          category: s.id === "intro" || s.id === "global" ? "executive" : "analysis",
          subtitle: s.subtitle || "",
          chips: s.chips || [],
        }));

        const dashboard = {
          clientName: narrativeReport.clientName || "Profil",
          generatedAt: narrativeReport.generatedAt || "",
          global: narrativeReport.globalScore || 0,
          sections: category ? sections.filter((s: any) => s.category === category) : sections,
          metrics: narrativeReport.metrics || [],
          metadata: {
            totalSections: sections.length,
            totalCharacters: sections.reduce((sum: number, s: any) => sum + (s.content?.length || 0), 0),
          },
        };
        res.json(dashboard);
        return;
      }

      // Premium/Elite format with .txt
      if (!narrativeReport.txt) {
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
      // UUID audit IDs are unguessable — allow direct access for report viewing
      // This matches the Blood Analysis pattern where reports are accessed via unique links
      const audit = await storage.getAudit(req.params.id);
      if (!audit) {
        res.status(404).json({ error: "Audit non trouve" });
        return;
      }

      // Block report content if scheduled for future delivery
      if (audit.reportScheduledFor && new Date(audit.reportScheduledFor) > new Date()) {
        res.status(202).json({
          status: "scheduled",
          scheduledFor: audit.reportScheduledFor,
          message: "Ton analyse approfondie est en cours de rédaction. Tu recevras ton rapport complet par email.",
        });
        return;
      }

      // Cache completed reports for 5 minutes
      if (audit.reportDeliveryStatus === "READY" || audit.reportDeliveryStatus === "SENT") {
        res.setHeader("Cache-Control", "private, max-age=300");
      }

      const generationStart = audit.reportScheduledFor
        ? new Date(audit.reportScheduledFor).getTime()
        : audit.createdAt
          ? new Date(audit.createdAt).getTime()
          : 0;
      const generationAgeMs = generationStart ? Date.now() - generationStart : 0;
      const isGenerating = audit.reportDeliveryStatus === "GENERATING";
      const isStaleGeneration = isGenerating && generationAgeMs > 12 * 60 * 1000;

      if (audit.narrativeReport) {
        const report = audit.narrativeReport as any;
        console.log(`[Narrative-v2] audit=${req.params.id} hasTxt=${!!report.txt} txtLen=${report.txt?.length || 0} hasSections=${!!report.sections} sectionsLen=${report.sections?.length || 0}`);
        // Si c'est le nouveau format TXT (V4 Pro), on le convertit au format dashboard
        // pour que le frontend puisse l'afficher sans tout casser
        // Prefer reportTxt (dedicated TEXT column) over narrativeReport.txt (JSONB — may be truncated)
        if ((audit as any).reportTxt && (audit as any).reportTxt.length > 100) {
          report.txt = (audit as any).reportTxt;
        }
        if ((audit as any).reportHtml && (audit as any).reportHtml.length > 100) {
          report.html = (audit as any).reportHtml;
        }
        if (report.txt) {
          let dashboard: any;
          let filledCount = 0;
          try {
            dashboard = formatTxtToDashboard(report.txt);
            filledCount = dashboard.sections.filter((s: any) => s.content && s.content.length > 50).length;
            console.log(`[Narrative] formatTxtToDashboard: ${dashboard.sections.length} sections, ${filledCount} filled (TXT: ${report.txt.length} chars)`);
          } catch (parseErr: any) {
            console.error(`[Narrative] ❌ formatTxtToDashboard CRASHED: ${parseErr.message}`);
            dashboard = { sections: [], clientName: '', generatedAt: '', global: 0 };
            filledCount = 0;
          }

          // FALLBACK: If TXT parsing produced empty sections, parse from HTML instead
          if (filledCount === 0 && report.html && report.html.length > 2000) {
            console.warn(`[Narrative] ⚠️ TXT parser returned empty sections. Falling back to HTML parser.`);
            const htmlSections: any[] = [];
            // Split HTML by <h2> tags to extract sections
            const h2Regex = /<h2[^>]*>(.*?)<\/h2>/gs;
            const htmlParts = report.html.split(h2Regex);
            // htmlParts: [before_first_h2, title1, content1, title2, content2, ...]
            for (let p = 1; p < htmlParts.length; p += 2) {
              const rawTitle = htmlParts[p].replace(/<[^>]+>/g, '').trim();
              const rawHtmlContent = htmlParts[p + 1] || '';
              // Strip HTML tags to get plain text content
              const plainContent = rawHtmlContent
                .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
                .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
                .replace(/<br\s*\/?>/gi, '\n')
                .replace(/<\/p>/gi, '\n\n')
                .replace(/<\/li>/gi, '\n')
                .replace(/<li[^>]*>/gi, '• ')
                .replace(/<\/h[1-6]>/gi, '\n')
                .replace(/<[^>]+>/g, '')
                .replace(/&nbsp;/g, ' ')
                .replace(/&amp;/g, '&')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&#39;/g, "'")
                .replace(/&quot;/g, '"')
                .replace(/\n{3,}/g, '\n\n')
                .trim();
              if (rawTitle && plainContent.length > 20) {
                const sectionId = rawTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
                htmlSections.push({
                  id: sectionId,
                  title: rawTitle,
                  score: 0,
                  content: plainContent,
                  order: htmlSections.length,
                  category: rawTitle.includes('PROTOCOLE') || rawTitle.includes('PLAN') ? 'action' : 'analysis',
                });
              }
            }
            const htmlFilled = htmlSections.filter((s: any) => s.content.length > 50).length;
            console.log(`[Narrative] HTML fallback: ${htmlSections.length} sections, ${htmlFilled} filled`);
            if (htmlFilled > filledCount) {
              dashboard = { ...dashboard, sections: htmlSections };
              console.log(`[Narrative] ✅ HTML fallback parser used successfully (${htmlFilled} sections)`);
            }
          }
          const auditScores = ensureAuditScores(audit.scores, audit.responses);
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
          const supplementsHtml = await generateEnhancedSupplementsHTML({
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

      if (isStaleGeneration && !audit.narrativeReport) {
        console.warn(`[Narrative] Stale generation detected for ${req.params.id}, restarting...`);
        await storage.updateAudit(req.params.id, { reportDeliveryStatus: "GENERATING" });
        await startReportGeneration(req.params.id, audit.responses, audit.scores || {}, audit.type);
        processReportAndSendEmail(req.params.id, audit.email, audit.type);
        res.status(202).json({ message: "Rapport en cours de regeneration", status: "regenerating", progress: 0 });
        return;
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

  app.post("/api/auth/magic-link", magicLinkLimiter, async (req, res) => {
    try {
      const { email } = req.body;
      const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
      if (!normalizedEmail || !normalizedEmail.includes("@")) {
        res.status(400).json({ error: "Email invalide" });
        return;
      }

      let user = await storage.getUserByEmail(normalizedEmail);
      if (!user) {
        user = await storage.createUser({ email: normalizedEmail });
      }

      const token = await storage.createMagicToken(normalizedEmail);

      const baseUrl = getBaseUrl(req);
      let emailSent = false;
      try {
        emailSent = await sendMagicLinkEmail(normalizedEmail, token, baseUrl);
      } catch (err) {
        console.error("[Auth] Magic link email error:", err);
      }

      if (!emailSent) {
        console.log(
          `[Auth] Magic link for ${normalizedEmail}: ${baseUrl}/auth/verify?token=${token}&email=${encodeURIComponent(normalizedEmail)}`
        );
      }
      res.json({ success: true, message: "Lien magique envoyé" });
    } catch (error) {
      console.error("[Auth] Magic link error:", error);
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

      const normalizedEmail = String(email).trim().toLowerCase();
      const verifiedEmail = await storage.verifyMagicToken(token as string);
      if (!verifiedEmail || verifiedEmail.trim().toLowerCase() !== normalizedEmail) {
        res.status(401).json({ error: "Lien invalide ou expiré" });
        return;
      }

      res.json({ success: true, email: normalizedEmail });
    } catch (error) {
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  app.post("/api/auth/verify-magic-link", async (req, res) => {
    try {
      const { token, email } = req.body as { token?: string; email?: string };
      const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
      if (!token || !normalizedEmail) {
        res.status(400).json({ error: "Token ou email manquant" });
        return;
      }

      const verifiedEmail = await storage.verifyMagicToken(token);
      if (!verifiedEmail || verifiedEmail.trim().toLowerCase() !== normalizedEmail) {
        res.status(401).json({ error: "Lien invalide ou expire" });
        return;
      }

      let user = await storage.getUserByEmail(normalizedEmail);
      if (!user) {
        const defaultCredits = Number(process.env.DEFAULT_BLOOD_CREDITS ?? "0");
        user = await storage.createUser({ email: normalizedEmail, credits: defaultCredits });
      }

      const jwtToken = signAuthToken({ userId: user.id, email: user.email });
      res.json({
        success: true,
        token: jwtToken,
        me: {
          email: user.email,
          credits: user.credits ?? 0,
          isAdmin: false,
        },
      });
    } catch (error) {
      console.error("[Auth] Verify magic link error:", error);
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  app.post("/api/auth/check-email", async (req, res) => {
    try {
      const { email } = req.body;
      const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
      const user = normalizedEmail ? await storage.getUserByEmail(normalizedEmail) : undefined;
      res.json({ exists: !!user });
    } catch (error) {
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  app.get("/api/me", async (req, res) => {
    try {
      const payload = getAuthPayload(req);
      if (!payload) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const user = await storage.getUser(payload.userId);
      if (!user) {
        res.status(404).json({ error: "Utilisateur introuvable" });
        return;
      }

      const adminEmails = (process.env.ADMIN_EMAILS || "")
        .split(",")
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean);
      const isAdmin = adminEmails.includes(user.email.toLowerCase());

      res.json({
        user: {
          id: user.id,
          email: user.email,
          credits: user.credits ?? 0,
          isAdmin,
        },
      });
    } catch (error) {
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  // ==================== USER ORDER HISTORY ====================

  app.get("/api/user/orders", async (req, res) => {
    try {
      const payload = getAuthPayload(req);
      if (!payload) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      const orders = await storage.getOrdersByEmail(payload.email);
      // Strip sensitive fields
      const safeOrders = orders.map(o => ({
        id: o.id,
        productType: o.productType,
        productName: o.productName,
        finalAmountCents: o.finalAmountCents,
        discountCents: o.discountCents,
        currency: o.currency,
        status: o.status,
        refundAmountCents: o.refundAmountCents,
        auditId: o.auditId,
        bloodReportId: o.bloodReportId,
        createdAt: o.createdAt,
        paidAt: o.paidAt,
      }));
      res.json({ success: true, orders: safeOrders });
    } catch (error) {
      console.error("[User Orders] Error:", error);
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  // ==================== USER RECEIPT ====================

  app.get("/api/user/receipts/:orderId", async (req, res) => {
    try {
      const payload = getAuthPayload(req);
      if (!payload) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      const order = await storage.getOrder(req.params.orderId);
      if (!order) {
        res.status(404).json({ error: "Commande non trouvée" });
        return;
      }
      // Ownership check
      if (order.email.toLowerCase() !== payload.email.toLowerCase()) {
        res.status(403).json({ error: "Accès interdit" });
        return;
      }
      const { generateReceiptHTML } = await import("./receiptGenerator");
      const html = generateReceiptHTML(order);
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader("Content-Disposition", `inline; filename="recu-${order.id.slice(0, 8)}.html"`);
      res.send(html);
    } catch (error) {
      console.error("[User Receipt] Error:", error);
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  app.get("/api/config/delivery-mode", async (req, res) => {
    const mode = process.env.DELIVERY_MODE || "scheduled";
    res.json({
      mode,
      delays: {
        GRATUIT: 24,
        PREMIUM: 24,
        ELITE: 48,
        BURNOUT: 24,
        BLOOD_ANALYSIS: 24,
      }
    });
  });

  app.post("/api/admin/process-pending-reports", async (req, res) => {
    if (!requireAdminAuth(req, res)) return;

    try {
      const pendingAudits = await storage.getPendingAudits();
      const queued: string[] = [];

      for (const audit of pendingAudits) {
        await storage.updateAudit(audit.id, { reportDeliveryStatus: "GENERATING" });
        
        await startReportGeneration(audit.id, audit.responses, audit.scores, audit.type);
        queued.push(audit.id);

        processReportAsync(audit.id, audit.email, audit.type).catch((err) => {
          console.error(`[processReportAsync] Unhandled error for audit ${audit.id}:`, err);
          storage.updateAudit(audit.id, { reportDeliveryStatus: "EMAIL_FAILED" }).catch(() => {});
        });
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

  // Get monitoring history for an audit
  app.get("/api/admin/audits/:id/monitoring-history", async (req, res) => {
    if (!requireAdminAuth(req, res)) return;
    try {
      const { getMonitoringHistory } = await import("./monitoring.js");
      const history = await getMonitoringHistory(req.params.id);

      res.json({
        success: true,
        history,
      });
    } catch (error) {
      console.error("[Admin] Error getting monitoring history:", error);
      res.status(500).json({ success: false, error: "Erreur serveur" });
    }
  });

  // Trigger manual monitoring run (doesn't wait for cron)
  app.post("/api/admin/run-monitoring-now", async (req, res) => {
    if (!requireAdminAuth(req, res)) return;
    try {
      const { runAutomaticMonitoring } = await import("./monitoring.js");

      // Run async, don't wait
      runAutomaticMonitoring()
        .then((stats) => {
          console.log("[Admin] Manual monitoring completed:", stats);
        })
        .catch((err) => {
          console.error("[Admin] Error in manual monitoring:", err);
        });

      res.json({
        success: true,
        message: "Monitoring démarré en arrière-plan",
      });
    } catch (error) {
      console.error("[Admin] Error starting monitoring:", error);
      res.status(500).json({ success: false, error: "Erreur serveur" });
    }
  });

  // Trigger manual 6h report (for testing)
  app.post("/api/admin/send-report-now", async (req, res) => {
    if (!requireAdminAuth(req, res)) return;
    try {
      const { sendManualReport } = await import("./automaticReports.js");

      // Run async, don't wait
      sendManualReport()
        .then((result) => {
          console.log("[Admin] Manual report result:", result);
        })
        .catch((err) => {
          console.error("[Admin] Error in manual report:", err);
        });

      res.json({
        success: true,
        message: "Rapport en cours d'envoi par email...",
      });
    } catch (error) {
      console.error("[Admin] Error starting report:", error);
      res.status(500).json({ success: false, error: "Erreur serveur" });
    }
  });

  // Export tracking data for Google Sheets (CSV format)
  app.get("/api/admin/export/tracking-csv", async (req, res) => {
    if (!requireAdminAuth(req, res)) return;
    try {
      const { generateCSV } = await import("./googleSheetsTracking.js");
      const csv = await generateCSV();

      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="apexlabs-tracking-${new Date().toISOString().split("T")[0]}.csv"`
      );
      res.send("\uFEFF" + csv); // BOM for Excel UTF-8 compatibility
    } catch (error) {
      console.error("[Admin] Error generating CSV:", error);
      res.status(500).json({ success: false, error: "Erreur serveur" });
    }
  });

  // Get tracking stats (for Google Sheets dashboard)
  app.get("/api/admin/export/tracking-stats", async (req, res) => {
    if (!requireAdminAuth(req, res)) return;
    try {
      const { generateStats } = await import("./googleSheetsTracking.js");
      const stats = await generateStats();

      res.json({
        success: true,
        stats,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error("[Admin] Error generating stats:", error);
      res.status(500).json({ success: false, error: "Erreur serveur" });
    }
  });

  // Get tracking data as JSON (for Google Sheets Apps Script import)
  app.get("/api/admin/export/tracking-json", async (req, res) => {
    if (!requireAdminAuth(req, res)) return;
    try {
      const { generateTrackingData } = await import("./googleSheetsTracking.js");
      const data = await generateTrackingData();

      res.json({
        success: true,
        data,
        total: data.length,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error("[Admin] Error generating JSON:", error);
      res.status(500).json({ success: false, error: "Erreur serveur" });
    }
  });

  // Get detailed validation info for NEEDS_REVIEW audits
  app.get("/api/admin/audits/:id/validation-details", async (req, res) => {
    if (!requireAdminAuth(req, res)) return;
    try {
      const audit = await storage.getAudit(req.params.id);
      if (!audit) {
        res.status(404).json({ success: false, error: "Audit non trouvé" });
        return;
      }

      const narrativeReport = (audit as any)?.narrativeReport;
      const validationResult = narrativeReport?.validationResult;
      const reportJob = await storage.getReportJob(audit.id);

      res.json({
        success: true,
        audit: {
          id: audit.id,
          email: audit.email,
          type: audit.type,
          status: audit.reportDeliveryStatus,
          createdAt: audit.createdAt,
        },
        validation: validationResult || null,
        job: reportJob ? {
          status: reportJob.status,
          attemptCount: reportJob.attemptCount,
          error: reportJob.error,
          lastProgressAt: reportJob.lastProgressAt,
        } : null,
        reportGenerated: !!narrativeReport,
        reportLength: narrativeReport?.txt?.length || 0,
      });
    } catch (error) {
      console.error("[Admin] Error getting validation details:", error);
      res.status(500).json({ success: false, error: "Erreur serveur" });
    }
  });

  // Force regenerate NEEDS_REVIEW audits with enhanced validation bypass
  app.post("/api/admin/force-regenerate-failed", async (req, res) => {
    if (!requireAdminAuth(req, res)) return;

    try {
      const { auditIds } = req.body;

      if (!auditIds || !Array.isArray(auditIds)) {
        res.status(400).json({ success: false, error: "auditIds array requis" });
        return;
      }

      const regenerated: string[] = [];
      const errors: { auditId: string; error: string }[] = [];

      for (const auditId of auditIds) {
        try {
          const audit = await storage.getAudit(auditId);
          if (!audit) {
            errors.push({ auditId, error: "Audit non trouvé" });
            continue;
          }

          console.log(`[Admin] Force-regenerating NEEDS_REVIEW audit ${auditId}`);

          // Reset EVERYTHING and restart generation
          await storage.updateAudit(auditId, {
            reportDeliveryStatus: "GENERATING",
            narrativeReport: null, // Clear old failed report
            reportScheduledFor: null, // Clear scheduled delivery — deliver immediately
          });

          // Delete old failed job
          await storage.deleteReportJob(auditId).catch(() => {});

          // Start fresh generation
          await startReportGeneration(auditId, audit.responses, audit.scores || {}, audit.type);

          processReportAndSendEmail(auditId, audit.email, audit.type).catch((err) => {
            console.error(`[processReportAndSendEmail] Unhandled error for audit ${auditId}:`, err);
            storage.updateAudit(auditId, { reportDeliveryStatus: "EMAIL_FAILED" }).catch(() => {});
          });

          regenerated.push(auditId);
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : "Unknown error";
          errors.push({ auditId, error: errorMsg });
        }
      }

      res.json({
        success: true,
        message: `${regenerated.length} rapport(s) en cours de régénération`,
        regenerated,
        errors: errors.length > 0 ? errors : undefined,
      });
    } catch (error) {
      console.error("[Admin] Error regenerating failed reports:", error);
      res.status(500).json({ success: false, error: "Erreur serveur" });
    }
  });

  // Admin: reset scheduledFor on an audit (force immediate delivery)
  app.post("/api/admin/reset-scheduled", async (req, res) => {
    if (!requireAdminAuth(req, res)) return;
    try {
      const { auditId } = req.body;
      if (!auditId) { res.status(400).json({ error: "auditId requis" }); return; }
      const { pool } = await import("./db");
      await pool.query("UPDATE audits SET report_scheduled_for = NULL, report_delivery_status = 'READY' WHERE id = $1", [auditId]);
      res.json({ success: true, message: `scheduledFor reset + status READY for ${auditId}` });
    } catch (error) {
      console.error("[Admin] reset-scheduled error:", error);
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  // Admin: adjust blood credits for a user
  app.post("/api/admin/adjust-credits", async (req, res) => {
    if (!requireAdminAuth(req, res)) return;
    try {
      const { email, credits } = req.body;
      if (!email || credits === undefined) { res.status(400).json({ error: "email et credits requis" }); return; }
      const { pool } = await import("./db");
      let user = await storage.getUserByEmail(email);
      if (!user) {
        user = await storage.createUser({ email, credits: Math.max(0, credits) });
      } else {
        await pool.query("UPDATE users SET credits = credits + $1 WHERE email = $2", [credits, email]);
      }
      const updated = await storage.getUserByEmail(email);
      res.json({ success: true, email, newCredits: (updated as any)?.credits ?? 0 });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Admin: update audit responses (e.g. inject new photos)
  app.post("/api/admin/update-audit-responses", async (req, res) => {
    if (!requireAdminAuth(req, res)) return;
    try {
      const { auditId, responses } = req.body;
      if (!auditId || !responses) { res.status(400).json({ error: "auditId et responses requis" }); return; }
      const { pool } = await import("./db");
      await pool.query("UPDATE audits SET responses = $1 WHERE id = $2", [JSON.stringify(responses), auditId]);
      res.json({ success: true, fieldCount: Object.keys(responses).length });
    } catch (error: any) {
      console.error("[Admin] Update audit responses error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Admin: set scheduledFor on an audit (delay delivery)
  app.post("/api/admin/set-scheduled", async (req, res) => {
    if (!requireAdminAuth(req, res)) return;
    try {
      const { auditId, delayHours } = req.body;
      if (!auditId) { res.status(400).json({ error: "auditId requis" }); return; }
      const hours = delayHours || 24;
      const scheduledFor = new Date(Date.now() + hours * 60 * 60 * 1000);
      const { pool } = await import("./db");
      await pool.query("UPDATE audits SET report_scheduled_for = $1, report_delivery_status = 'SCHEDULED' WHERE id = $2", [scheduledFor, auditId]);
      res.json({ success: true, scheduledFor: scheduledFor.toISOString() });
    } catch (error) {
      console.error("[Admin] set-scheduled error:", error);
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  // Force restart stuck GENERATING jobs
  app.post("/api/admin/force-restart-stuck-jobs", async (req, res) => {
    if (!requireAdminAuth(req, res)) return;

    try {
      // Find audits stuck in GENERATING for more than 2 hours
      const { db } = await import("./db.js");
      const { audits } = await import("../shared/drizzle-schema.js");
      const { eq, and, lt } = await import("drizzle-orm");

      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

      const stuckAudits = await db
        .select()
        .from(audits)
        .where(
          and(
            eq(audits.reportDeliveryStatus, "GENERATING"),
            lt(audits.createdAt, twoHoursAgo)
          )
        );

      const restarted: string[] = [];

      for (const audit of stuckAudits) {
        console.log(`[Admin] Force-restarting stuck audit ${audit.id} (created ${audit.createdAt})`);

        // Reset to PENDING so it can be picked up by process-pending-reports
        await storage.updateAudit(audit.id, { reportDeliveryStatus: "PENDING" });

        // Immediately restart generation
        await storage.updateAudit(audit.id, { reportDeliveryStatus: "GENERATING" });
        await startReportGeneration(audit.id, audit.responses, audit.scores || {}, audit.type);

        processReportAndSendEmail(audit.id, audit.email, audit.type).catch((err) => {
          console.error(`[processReportAndSendEmail] Unhandled error for audit ${audit.id}:`, err);
          storage.updateAudit(audit.id, { reportDeliveryStatus: "EMAIL_FAILED" }).catch(() => {});
        });

        restarted.push(audit.id);
      }

      res.json({
        success: true,
        message: `${restarted.length} rapport(s) bloqué(s) relancé(s)`,
        restarted
      });
    } catch (error) {
      console.error("[Admin] Error restarting stuck jobs:", error);
      res.status(500).json({ success: false, error: "Erreur serveur" });
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
   * - category?: string (optionnel, ex: "sommeil", "sarms")
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
        error: "Erreur serveur",
      });
    }
  });

  app.post("/api/audit/:id/regenerate", async (req, res) => {
    if (!requireAdminAuth(req, res)) return;
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
    if (!requireAdminAuth(req, res)) return;
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
      // SECURITY: Verify user owns this audit (IDOR protection)
      if (!(await checkAuditOwnership(req, res, req.params.id))) {
        return;
      }

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
      // SECURITY: Verify user owns this audit (IDOR protection)
      if (!(await checkAuditOwnership(req, res, req.params.id))) {
        return;
      }

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
        if (!narrativeReport) {
          res.status(400).json({ error: "Rapport non disponible (génération en cours ou échouée)" });
          return;
        }

        // Discovery Scan format: { sections[], metrics[], globalScore, clientName }
        if (narrativeReport.sections && Array.isArray(narrativeReport.sections)) {
          const clientName = narrativeReport.clientName || "Profil";
          const globalScore = narrativeReport.globalScore || 0;
          const metrics = narrativeReport.metrics || [];
          const generatedAt = narrativeReport.generatedAt || new Date().toISOString();
          const sectionsHtml = narrativeReport.sections.map((s: any) => `
            <div class="section" style="margin-bottom: 2rem; padding: 1.5rem; border-radius: 12px; background: #111; border: 1px solid #222;">
              <h2 style="font-size: 1.3rem; font-weight: 700; color: #E8C547; margin-bottom: 0.25rem;">${s.title || ''}</h2>
              ${s.subtitle ? `<p style="font-size: 0.85rem; color: #888; margin-bottom: 1rem;">${s.subtitle}</p>` : ''}
              ${s.chips?.length ? `<div style="display: flex; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 1rem;">${s.chips.map((c: string) => `<span style="padding: 0.25rem 0.75rem; border-radius: 99px; background: rgba(232,197,71,0.15); color: #E8C547; font-size: 0.75rem; font-weight: 500;">${c}</span>`).join('')}</div>` : ''}
              <div style="color: #ccc; line-height: 1.7; font-size: 0.95rem;">${s.content || ''}</div>
            </div>
          `).join('\n');

          const metricsHtml = metrics.map((m: any) => `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.5rem 0; border-bottom: 1px solid #1a1a1a;">
              <span style="color: #aaa; font-size: 0.85rem;">${m.label}</span>
              <span style="color: #E8C547; font-weight: 700;">${m.value}/${m.max}</span>
            </div>
          `).join('\n');

          html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Discovery Scan - ${clientName} | APEXLABS</title>
  <style>
    :root { --color-primary: #E8C547; --color-bg: #0a0a0a; --color-surface: #111; --color-border: #222; --color-text: #ccc; --color-text-muted: #888; --color-on-primary: #000; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', -apple-system, system-ui, sans-serif; background: var(--color-bg); color: var(--color-text); line-height: 1.6; }
    .container { max-width: 800px; margin: 0 auto; padding: 2rem 1.5rem; }
    h1, h2, h3 { color: #fff; }
    strong { color: #fff; }
    p { margin-bottom: 0.75rem; }
    a { color: var(--color-primary); }
  </style>
</head>
<body>
  <div class="container">
    <header style="text-align: center; padding: 2rem 0; margin-bottom: 2rem; border-bottom: 1px solid #222;">
      <div style="font-size: 0.75rem; letter-spacing: 0.2em; color: #E8C547; text-transform: uppercase; margin-bottom: 0.5rem;">APEXLABS</div>
      <h1 style="font-size: 2rem; font-weight: 900; color: #fff; margin-bottom: 0.5rem;">Discovery Scan</h1>
      <p style="color: #888;">${clientName} &mdash; ${new Date(generatedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
      <div style="margin-top: 1.5rem; font-size: 3rem; font-weight: 900; color: #E8C547;">${globalScore}<span style="font-size: 1.5rem; color: #888;">/10</span></div>
      <p style="font-size: 0.85rem; color: #888; margin-top: 0.25rem;">Score Global</p>
    </header>

    ${metricsHtml ? `<div style="margin-bottom: 2rem; padding: 1.5rem; border-radius: 12px; background: #111; border: 1px solid #222;">${metricsHtml}</div>` : ''}

    ${sectionsHtml}

    <footer style="text-align: center; padding: 2rem 0; margin-top: 2rem; border-top: 1px solid #222; color: #555; font-size: 0.8rem;">
      <p>APEXLABS by Achzod &mdash; apexlabs.achzodcoaching.com</p>
    </footer>
  </div>
</body>
</html>`;
        } else {
          // Premium/Elite format with .txt
          const photos = extractPhotosFromAudit(audit);
          html = await generateExportHTML(narrativeReport, auditId, photos);
        }
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
      // SECURITY: Verify user owns this audit (IDOR protection)
      if (!(await checkAuditOwnership(req, res, req.params.id))) {
        return;
      }

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

  app.post("/api/stripe/create-checkout-session", checkoutLimiter, async (req, res) => {
    try {
      const { priceId: clientPriceId, email, planType, responses, promoCode, referrer } = req.body;

      // Already paid check for ALL product types (prevents double charge)
      if (email && planType && planType !== "GRATUIT") {
        const existingOrders = await storage.getOrdersByEmail(email);
        const alreadyPaid = existingOrders.find((o: any) => o.productType === planType && o.status === "paid");
        if (alreadyPaid && planType !== "PEPTIDES_ENGINE" && planType !== "BLOOD_ANALYSIS") {
          console.log(`[Checkout] ${planType} already paid for ${email} — blocking re-payment`);
          // Create audit if missing
          if (!alreadyPaid.auditId && ["PREMIUM", "ELITE"].includes(planType)) {
            try {
              const normalizedPlan = planType as "PREMIUM" | "ELITE";
              const result = await createAuditFromPaidOrder(email, normalizedPlan, alreadyPaid);
              if (result.success) {
                res.json({ ...result, alreadyPaid: true });
                return;
              }
            } catch {}
          }
          res.json({ success: true, alreadyPaid: true, url: null, redirect: "/dashboard?success=true" });
          return;
        }
      }

      // PEPTIDES_ENGINE: if already paid, skip checkout and trigger generation in background
      if (planType === "PEPTIDES_ENGINE" && email) {
        const existingOrders = await storage.getOrdersByEmail(email);
        const paidPeptides = existingOrders.find((o: any) => o.productType === "PEPTIDES_ENGINE" && o.status === "paid");
        if (paidPeptides) {
          console.log(`[Checkout] Peptides Engine already paid for ${email} — saving responses and generating in background`);
          // Save responses to server
          if (responses && Object.keys(responses).length >= 3) {
            try {
              await storage.saveBurnoutProgress({
                email: `peptides::${email}`,
                currentSection: 6,
                totalSections: 6,
                responses,
              });
            } catch { /* best effort */ }
            // DO NOT generate in background — Render kills process after HTTP response.
            // Auto-recovery cron will detect and generate.
            console.log(`[Checkout] Peptides already paid for ${email}, cron will generate`);
          }
          // Respond IMMEDIATELY — don't wait for generation
          res.json({ success: true, alreadyPaid: true, url: null, redirect: "/dashboard?success=true&generating=peptides" });
          return;
        }
      }

      // Server-side price ID lookup as fallback when frontend doesn't send priceId
      const PRICE_ID_MAP: Record<string, string | undefined> = {
        PREMIUM: process.env.VITE_STRIPE_PRICE_ANABOLIC,
        ELITE: process.env.VITE_STRIPE_PRICE_ULTIMATE,
        BURNOUT: process.env.STRIPE_BURNOUT_PRICE_ID,
        BLOOD_ANALYSIS: process.env.BLOOD_ANALYSIS_PRICE_ID || process.env.VITE_STRIPE_PRICE_BLOOD_ANALYSIS,
        PEPTIDES_ENGINE: process.env.STRIPE_PEPTIDES_ENGINE_PRICE_ID || "price_1TFzR9BTm0rdlVFq7HZDJQHs",
      };
      const priceId = clientPriceId || PRICE_ID_MAP[planType];
      if (!priceId) {
        res.status(400).json({ error: "INVALID_PLAN", message: `No Stripe price configured for plan: ${planType}` });
        return;
      }

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

      // 100% discount: skip Stripe entirely, create audit directly (same as PayPal path)
      if (validatedPromoCode) {
        const promoObjCheck = await storage.getPromoCode(validatedPromoCode);
        if (promoObjCheck && promoObjCheck.discountPercent >= 100) {
          const pType = (planType as ProductTypeEnum) || "PREMIUM";
          const baseCents = ProductPriceCents[pType] ?? 0;
          const discountCents = baseCents;
          const order = await storage.createOrder({
            email,
            productType: pType,
            amountCents: baseCents,
            discountCents,
            promoCode: validatedPromoCode,
            promoCodeId: promoObjCheck.id || null,
            finalAmountCents: 0,
            ipAddress: (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.ip || null,
            userAgent: req.headers["user-agent"] || null,
            metadata: { planType, paymentMethod: "promo_100", freeViaPromo: true },
          });
          await storage.updateOrder(order.id, { status: "paid", paidAt: new Date() });
          await storage.incrementPromoCodeUse(validatedPromoCode);
          await storage.createPromoCodeUsage({
            promoCodeId: promoObjCheck.id,
            promoCode: validatedPromoCode,
            userId: null,
            email,
            orderId: order.id,
            discountPercent: promoObjCheck.discountPercent,
            discountAmountCents: discountCents,
          });
          if (planType === "BLOOD_ANALYSIS") {
            // Add +1 blood credit (promo 100% = free, but still needs credit to upload)
            try {
              const { pool } = await import("./db");
              let user = await storage.getUserByEmail(email);
              if (!user) {
                user = await storage.createUser({ email, credits: 1 });
                console.log(`[Checkout] Created user ${email} with 1 blood credit (promo 100%)`);
              } else {
                await pool.query("UPDATE users SET credits = credits + 1 WHERE email = $1", [email]);
                console.log(`[Checkout] +1 blood credit for ${email} (promo 100%)`);
              }
            } catch (creditErr) {
              console.error(`[Checkout] Blood credit error for ${email}:`, creditErr);
            }
            res.json({ success: true, free: true, auditId: "", auditType: "BLOOD_ANALYSIS", email });
            return;
          }
          const normalizedPlanType = planType as "GRATUIT" | "PREMIUM" | "ELITE";
          const result = await createAuditFromPaidOrder(email, normalizedPlanType, order);
          if (!result.success) {
            res.status(400).json(result);
            return;
          }
          res.json({ ...result, free: true });
          return;
        }
      }

      const isBloodAnalysis = planType === "BLOOD_ANALYSIS";
      const isPeptides = planType === "PEPTIDES_ENGINE";
      const successUrl = isBloodAnalysis
        ? `${baseUrl}/blood-analysis?session_id={CHECKOUT_SESSION_ID}`
        : isPeptides
        ? `${baseUrl}/dashboard?success=true&session_id={CHECKOUT_SESSION_ID}&product=peptides`
        : `${baseUrl}/dashboard?success=true&session_id={CHECKOUT_SESSION_ID}`;
      const cancelUrl = isBloodAnalysis
        ? `${baseUrl}/offers/blood-analysis?cancelled=true`
        : isPeptides
        ? `${baseUrl}/offers/peptides-engine?cancelled=true`
        : `${baseUrl}/audit-complet/checkout?cancelled=true`;

      // CRITICAL: Save responses to DB BEFORE creating Stripe session
      // This ensures the webhook can find them even if the frontend save-progress fails
      if (planType === "PEPTIDES_ENGINE" && responses && Object.keys(responses).length >= 3) {
        try {
          await storage.saveBurnoutProgress({
            email: `peptides::${email}`,
            currentSection: 6,
            totalSections: 6,
            responses,
          });
          console.log(`[Checkout] ✅ Peptides responses saved server-side for ${email} (${Object.keys(responses).length} fields)`);
        } catch (saveErr) {
          console.error(`[Checkout] ⚠️ Failed to save peptides responses for ${email}:`, saveErr);
          // Don't block checkout — continue anyway
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
        success_url: successUrl,
        cancel_url: cancelUrl,
        customer_email: email,
        metadata: {
          email,
          planType,
          responses: responses ? JSON.stringify(responses).substring(0, 500) : '',
          promoCode: validatedPromoCode || '',
          referrer: referrer || '',
        },
      };

      // Apply discounts if any
      if (discounts.length > 0) {
        sessionParams.discounts = discounts;
      }

      const session = await stripe.checkout.sessions.create(sessionParams);

      // Create pending order
      try {
        const pType = (planType as ProductTypeEnum) || "PREMIUM";
        const baseCents = ProductPriceCents[pType] ?? 0;
        const promoObj = validatedPromoCode ? await storage.getPromoCode(validatedPromoCode) : null;
        const discountCents = promoObj ? Math.round(baseCents * promoObj.discountPercent / 100) : 0;

        const order = await storage.createOrder({
          email,
          productType: pType,
          amountCents: baseCents,
          discountCents,
          promoCode: validatedPromoCode,
          promoCodeId: promoObj?.id || null,
          finalAmountCents: Math.max(0, baseCents - discountCents),
          stripeCheckoutSessionId: session.id,
          ipAddress: (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.ip || null,
          userAgent: req.headers["user-agent"] || null,
          metadata: { planType, peptidesResponses: planType === "PEPTIDES_ENGINE" ? responses : undefined },
        });

        // Track promo code usage on the order
        if (validatedPromoCode && promoObj) {
          await storage.incrementPromoCodeUse(validatedPromoCode);
          await storage.createPromoCodeUsage({
            promoCodeId: promoObj.id,
            promoCode: validatedPromoCode,
            userId: null,
            email,
            orderId: order.id,
            discountPercent: promoObj.discountPercent,
            discountAmountCents: discountCents,
          });
        }
      } catch (orderErr) {
        console.error("[Orders] Error creating pending order:", orderErr);
        // Non-blocking: checkout still works even if order tracking fails
      }

      res.json({ sessionId: session.id, url: session.url });
    } catch (error: any) {
      console.error("Stripe checkout error:", error);
      res.status(500).json({ error: "Erreur création session" });
    }
  });

  // ==================== SHARED AUDIT CREATION HELPER ====================
  // Used by both Stripe confirm-session and PayPal capture-order
  async function createAuditFromPaidOrder(
    email: string,
    planType: "GRATUIT" | "PREMIUM" | "ELITE",
    order?: { id: string; auditId: string | null } | null
  ): Promise<{ success: true; auditId: string; auditType: string; existing?: boolean } | { success: false; error: string; message?: string }> {
    // Check if an audit is already linked to this order
    if (order?.auditId) {
      return { success: true, auditId: order.auditId, auditType: planType, existing: true };
    }

    const progress = await storage.getProgress(email);
    let responses = progress?.responses as Record<string, unknown> | string | undefined;
    if (typeof responses === "string") {
      try { responses = JSON.parse(responses); } catch { responses = undefined; }
    }

    if (!responses || Object.keys(responses).length === 0) {
      return { success: false, error: "QUESTIONNAIRE_MISSING" };
    }

    if (planType === "ELITE" && !hasThreePhotos(responses as Record<string, unknown>)) {
      // Don't block if already paid — create audit anyway and warn
      if (order && (order as any).status === "paid") {
        console.warn(`[Audit] ⚠️ ELITE audit created for ${email} WITHOUT all 3 photos (already paid)`);
      } else {
        return { success: false, error: "NEED_PHOTOS", message: "3 photos obligatoires pour Ultimate Scan (face, profil, dos)" };
      }
    }

    // Schedule delivery 24h later for paid products (gives Achzod time to review)
    const scheduledFor = ["PREMIUM", "ELITE"].includes(planType)
      ? new Date(Date.now() + 24 * 60 * 60 * 1000)
      : undefined;

    const audit = await storage.createAudit({
      userId: "",
      type: planType,
      email,
      responses: responses as Record<string, unknown>,
      ...(scheduledFor ? { reportScheduledFor: scheduledFor } : {}),
    });

    if (scheduledFor) {
      console.log(`[Audit] Report scheduled for ${email} at ${scheduledFor.toISOString()} (+24h)`);
      try {
        const { pool: dbPool } = await import("./db");
        await dbPool.query("UPDATE audits SET report_scheduled_for = $1, report_delivery_status = 'SCHEDULED' WHERE id = $2", [scheduledFor, audit.id]);
      } catch {}
    }

    // Atomically link order to audit (prevents race on double-click)
    if (order) {
      const claimed = await storage.claimOrderForAudit(order.id, audit.id);
      if (!claimed) {
        const refreshed = await storage.getOrder(order.id);
        if (refreshed?.auditId) {
          return { success: true, auditId: refreshed.auditId, auditType: planType, existing: true };
        }
      }
    }

    // Clean up questionnaire progress now that audit is created
    await storage.deleteProgress(email).catch(() => {});

    // Envoyer notification admin immédiatement à la création (pas à la livraison)
    const clientName = (responses as any)?.prenom || (responses as any)?.name || email.split('@')[0];
    console.log(`[Admin Email] 📧 Triggering admin notification for audit ${audit.id}...`);
    sendAdminEmailNewAudit(email, clientName, planType, audit.id)
      .then((success) => {
        if (success) {
          console.log(`[Admin Email] ✅ Admin notification sent successfully for ${audit.id}`);
        } else {
          console.error(`[Admin Email] ❌ Admin notification failed for ${audit.id}`);
        }
      })
      .catch((err) => {
        console.error(`[Admin Email] ❌ Error in admin notification for ${audit.id}:`, err);
      });

    // Send order confirmation email to client (don't leave them in the dark)
    const promoByType: Record<string, { code: string; label: string }> = {
      ELITE: { code: "ULTIMATE79", label: "79€ deduits de ton coaching Elite/Private Lab 8 ou 12 semaines" },
      PREMIUM: { code: "ANABOLIC59", label: "59€ deduits de ton coaching Elite/Private Lab 8 ou 12 semaines" },
    };
    const promo = promoByType[planType];
    const productLabel = planType === "ELITE" ? "Ultimate Scan" : planType === "PREMIUM" ? "Anabolic Bioscan" : "Analyse";
    const confirmMsg = `Salut ${clientName},\n\nMerci pour ta commande ${productLabel}. Ton paiement est bien recu et toutes tes reponses sont enregistrees.\n\nTon rapport est en cours de generation. Tu le recevras par email d'ici 24h.\n\n${promo ? `En attendant, voici ton code promo : ${promo.code}\n${promo.label}\nUtilise-le sur achzodcoaching.com/formules-coaching\n\n` : ""}Si tu as des questions, reponds directement a cet email.\n\nAchzod`;
    sendCTAEmail(email, `${productLabel} : commande recue, rapport sous 24h`, confirmMsg).catch(() => {});

    // Mettre à jour Google Sheet automatiquement via webhook
    const { notifyGoogleSheetUpdate } = await import("./googleSheetsTracking.js");
    notifyGoogleSheetUpdate().catch((err) => {
      console.error(`[GoogleSheets] Failed to update sheet for ${audit.id}:`, err);
    });

    await storage.updateAudit(audit.id, { reportDeliveryStatus: "GENERATING" });
    await startReportGeneration(audit.id, audit.responses, audit.scores || {}, planType);
    processReportAndSendEmail(audit.id, audit.email, planType).catch((err) => {
      console.error(`[processReportAndSendEmail] Unhandled error for audit ${audit.id}:`, err);
      storage.updateAudit(audit.id, { reportDeliveryStatus: "EMAIL_FAILED" }).catch(() => {});
    });

    return { success: true, auditId: audit.id, auditType: audit.type };
  }

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

      if (planType !== "GRATUIT" && planType !== "PREMIUM" && planType !== "ELITE" && planType !== "BLOOD_ANALYSIS") {
        res.status(400).json({ error: "PLAN_INVALID" });
        return;
      }

      // Update order to paid if exists
      const existingOrder = await storage.getOrderByStripeSession(sessionId);
      if (existingOrder && existingOrder.status === "paid" && existingOrder.auditId) {
        res.json({ success: true, auditId: existingOrder.auditId, auditType: planType, existing: true });
        return;
      }
      if (existingOrder && existingOrder.status !== "paid") {
        await storage.updateOrder(existingOrder.id, {
          status: "paid",
          paidAt: new Date(),
          stripePaymentIntentId: (session as any).payment_intent || null,
          stripeCustomerId: (session as any).customer || null,
        });
      }

      if (planType === "BLOOD_ANALYSIS") {
        if (existingOrder) {
          await storage.updateOrder(existingOrder.id, { status: "paid", paidAt: new Date() });
        }
        res.json({ success: true, auditId: "", auditType: "BLOOD_ANALYSIS", email });
        return;
      }

      const normalizedPlanType = planType as "GRATUIT" | "PREMIUM" | "ELITE";

      const result = await createAuditFromPaidOrder(email, normalizedPlanType, existingOrder || null);
      if (!result.success) {
        res.status(400).json(result);
        return;
      }
      res.json(result);
    } catch (error: any) {
      console.error("Stripe confirmation error:", error);
      res.status(500).json({ error: "Erreur confirmation paiement" });
    }
  });

  // ==================== PAYPAL ENDPOINTS ====================

  app.post("/api/paypal/create-order", checkoutLimiter, async (req, res) => {
    try {
      if (!isPayPalConfigured()) {
        res.status(503).json({ error: "PayPal non configuré" });
        return;
      }

      const { email, planType, responses, promoCode } = req.body;
      if (!email || !planType) {
        res.status(400).json({ error: "email et planType requis" });
        return;
      }

      // Already paid check for ALL product types (prevents double charge via PayPal)
      if (email && planType && planType !== "GRATUIT") {
        const existingOrders = await storage.getOrdersByEmail(email);
        const alreadyPaid = existingOrders.find((o: any) => o.productType === planType && o.status === "paid");
        if (alreadyPaid && planType !== "PEPTIDES_ENGINE" && ["PREMIUM", "ELITE", "BLOOD_ANALYSIS"].includes(planType)) {
          console.log(`[PayPal] ${planType} already paid for ${email} — blocking re-payment`);
          if (!alreadyPaid.auditId && ["PREMIUM", "ELITE"].includes(planType)) {
            try {
              const normalizedPlan = planType as "PREMIUM" | "ELITE";
              await createAuditFromPaidOrder(email, normalizedPlan, alreadyPaid);
            } catch {}
          }
          res.json({ success: true, alreadyPaid: true, redirect: "/dashboard?success=true" });
          return;
        }
      }

      // PEPTIDES_ENGINE: if already paid, DO NOT create another PayPal order
      if (planType === "PEPTIDES_ENGINE" && email) {
        const existingOrders = await storage.getOrdersByEmail(email);
        const paidPeptides = existingOrders.find((o: any) => o.productType === "PEPTIDES_ENGINE" && o.status === "paid");
        if (paidPeptides) {
          console.log(`[PayPal] Peptides Engine already paid for ${email} — blocking re-payment`);
          if (responses && Object.keys(responses).length >= 3) {
            try {
              await storage.saveBurnoutProgress({ email: `peptides::${email}`, currentSection: 6, totalSections: 6, responses });
            } catch { /* best effort */ }
            // Cron auto-recovery will handle generation
            console.log(`[PayPal] Peptides already paid for ${email}, cron will generate`);
          }
          res.json({ success: true, alreadyPaid: true, redirect: "/dashboard?success=true&generating=peptides" });
          return;
        }
      }

      const pType = planType as ProductTypeEnum;
      const baseCents = ProductPriceCents[pType] ?? 0;
      if (baseCents === 0) {
        res.status(400).json({ error: "INVALID_PLAN", message: `Plan invalide: ${planType}` });
        return;
      }

      // Validate and apply promo code
      let validatedPromoCode: string | null = null;
      let promoObj: any = null;
      let discountCents = 0;

      if (promoCode) {
        const validation = await storage.validatePromoCode(promoCode, planType);
        if (validation.valid) {
          validatedPromoCode = promoCode;
          promoObj = await storage.getPromoCode(promoCode);
          discountCents = promoObj ? Math.round(baseCents * promoObj.discountPercent / 100) : 0;
        }
      }

      const finalCents = Math.max(0, baseCents - discountCents);

      // 100% discount: skip PayPal entirely, create audit directly
      if (finalCents === 0) {
        const order = await storage.createOrder({
          email,
          productType: pType,
          amountCents: baseCents,
          discountCents,
          promoCode: validatedPromoCode,
          promoCodeId: promoObj?.id || null,
          finalAmountCents: 0,
          ipAddress: (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.ip || null,
          userAgent: req.headers["user-agent"] || null,
          metadata: { planType, paymentMethod: "promo_100", freeViaPromo: true },
        });
        await storage.updateOrder(order.id, { status: "paid", paidAt: new Date() });
        if (validatedPromoCode && promoObj) {
          await storage.incrementPromoCodeUse(validatedPromoCode);
          await storage.createPromoCodeUsage({
            promoCodeId: promoObj.id,
            promoCode: validatedPromoCode,
            userId: null,
            email,
            orderId: order.id,
            discountPercent: promoObj.discountPercent,
            discountAmountCents: discountCents,
          });
        }
        if (planType === "BLOOD_ANALYSIS") {
          // Add +1 blood credit (PayPal promo 100%)
          try {
            const { pool } = await import("./db");
            let user = await storage.getUserByEmail(email);
            if (!user) {
              user = await storage.createUser({ email, credits: 1 });
            } else {
              await pool.query("UPDATE users SET credits = credits + 1 WHERE email = $1", [email]);
            }
            console.log(`[PayPal] +1 blood credit for ${email} (promo 100%)`);
          } catch (creditErr) {
            console.error(`[PayPal] Blood credit error:`, creditErr);
          }
          res.json({ success: true, free: true, auditId: "", auditType: "BLOOD_ANALYSIS", email });
          return;
        }
        const normalizedPlanType = planType as "GRATUIT" | "PREMIUM" | "ELITE";
        const result = await createAuditFromPaidOrder(email, normalizedPlanType, order);
        if (!result.success) {
          res.status(400).json(result);
          return;
        }
        res.json({ ...result, free: true });
        return;
      }

      // Save peptides responses server-side before PayPal
      if (planType === "PEPTIDES_ENGINE" && responses && Object.keys(responses).length >= 3) {
        try {
          await storage.saveBurnoutProgress({ email: `peptides::${email}`, currentSection: 6, totalSections: 6, responses });
          console.log(`[PayPal] ✅ Peptides responses saved for ${email}`);
        } catch { /* best effort */ }
      }

      const amountEur = (finalCents / 100).toFixed(2);

      const baseUrl = getBaseUrl();
      const isBloodAnalysis = planType === "BLOOD_ANALYSIS";
      const returnUrl = isBloodAnalysis
        ? `${baseUrl}/blood-analysis?paypal=true`
        : `${baseUrl}/dashboard?success=true&paypal=true`;
      const cancelUrl = isBloodAnalysis
        ? `${baseUrl}/offers/blood-analysis?cancelled=true`
        : `${baseUrl}/audit-complet/checkout?cancelled=true`;

      const productName = ProductDisplayNames[pType] || planType;

      const { paypalOrderId, approvalUrl } = await createPayPalOrder({
        amountEur,
        description: `${productName} - APEXLABS`,
        returnUrl,
        cancelUrl,
      });

      // Create pending order in DB
      try {
        const order = await storage.createOrder({
          email,
          productType: pType,
          amountCents: baseCents,
          discountCents,
          promoCode: validatedPromoCode,
          promoCodeId: promoObj?.id || null,
          finalAmountCents: finalCents,
          paypalOrderId,
          ipAddress: (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.ip || null,
          userAgent: req.headers["user-agent"] || null,
          metadata: { planType, paymentMethod: "paypal", peptidesResponses: planType === "PEPTIDES_ENGINE" ? responses : undefined },
        });

        if (validatedPromoCode && promoObj) {
          await storage.incrementPromoCodeUse(validatedPromoCode);
          await storage.createPromoCodeUsage({
            promoCodeId: promoObj.id,
            promoCode: validatedPromoCode,
            userId: null,
            email,
            orderId: order.id,
            discountPercent: promoObj.discountPercent,
            discountAmountCents: discountCents,
          });
        }
      } catch (orderErr) {
        console.error("[PayPal Orders] Error creating pending order:", orderErr);
      }

      res.json({ paypalOrderId, approvalUrl });
    } catch (error: any) {
      console.error("PayPal create order error:", error);
      res.status(500).json({ error: "Erreur création commande PayPal" });
    }
  });

  app.post("/api/paypal/capture-order", checkoutLimiter, async (req, res) => {
    try {
      const { paypalOrderId } = req.body;
      if (!paypalOrderId || typeof paypalOrderId !== "string" || !/^[A-Z0-9]+$/.test(paypalOrderId)) {
        res.status(400).json({ error: "paypalOrderId invalide" });
        return;
      }

      // Look up our order
      const existingOrder = await storage.getOrderByPaypalOrderId(paypalOrderId);

      // Require a matching DB order (prevents rogue capture calls)
      if (!existingOrder) {
        res.status(404).json({ error: "ORDER_NOT_FOUND", message: "Commande introuvable" });
        return;
      }

      // Idempotency: already processed (works for ALL product types including BLOOD_ANALYSIS)
      if (existingOrder.status === "paid") {
        if (existingOrder.auditId) {
          res.json({ success: true, auditId: existingOrder.auditId, auditType: existingOrder.productType, existing: true });
        } else {
          // BLOOD_ANALYSIS or other product without auditId
          res.json({ success: true, auditId: "", auditType: existingOrder.productType, email: existingOrder.email, existing: true });
        }
        return;
      }

      // Capture payment on PayPal
      const capture = await capturePayPalOrder(paypalOrderId);
      if (capture.status !== "COMPLETED") {
        res.status(402).json({ error: "PAYMENT_NOT_COMPLETED", status: capture.status });
        return;
      }

      // Validate captured amount matches expected
      const expectedEur = (existingOrder.finalAmountCents / 100).toFixed(2);
      if (capture.amountValue !== expectedEur) {
        console.error(`[PayPal] Amount mismatch: captured ${capture.amountValue} ${capture.amountCurrency}, expected ${expectedEur} EUR for order ${existingOrder.id}. Payment was captured — needs manual refund.`);
        // Still mark as paid to track the charge, but flag for review
        await storage.updateOrder(existingOrder.id, {
          status: "paid",
          paidAt: new Date(),
          metadata: {
            ...(existingOrder.metadata as Record<string, unknown> || {}),
            paypalCaptureId: capture.captureId,
            payerEmail: capture.payerEmail,
            amountMismatch: true,
            capturedAmount: capture.amountValue,
            expectedAmount: expectedEur,
          },
        });
        res.status(400).json({ error: "AMOUNT_MISMATCH", message: "Le montant capturé ne correspond pas. Contacte le support." });
        return;
      }

      // Mark order as paid
      await storage.updateOrder(existingOrder.id, {
        status: "paid",
        paidAt: new Date(),
        metadata: {
          ...(existingOrder.metadata as Record<string, unknown> || {}),
          paypalCaptureId: capture.captureId,
          payerEmail: capture.payerEmail,
        },
      });

      const email = existingOrder.email;
      const planType = existingOrder.productType;

      // Admin notification for ALL PayPal payments
      try {
        const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || "coaching@achzodcoaching.com";
        const amount = (existingOrder.finalAmountCents / 100).toFixed(2);
        const productLabel = existingOrder.productName || planType;
        await sendCTAEmail(adminEmail, `PAIEMENT ${amount}EUR — ${productLabel} (PayPal) — ${email}`,
          `PAIEMENT RECU (PayPal)!\n\nProduit: ${productLabel}\nEmail: ${email}\nMontant: ${amount}EUR\nPromo: ${existingOrder.promoCode || "aucun"}\n\nOrder ID: ${existingOrder.id}`
        );
        console.log(`[PayPal] Admin payment notification sent for order ${existingOrder.id}`);
      } catch (notifErr) {
        console.error(`[PayPal] Admin notification failed:`, notifErr);
      }

      // BLOOD_ANALYSIS: just mark paid, no audit to create
      if (planType === "BLOOD_ANALYSIS") {
        // Send confirmation email
        sendCTAEmail(email, "Blood Analysis : paiement recu",
          `Salut,\n\nMerci pour ta commande Blood Analysis. Ton paiement est bien recu.\n\nVoici la liste exacte des marqueurs a demander a ton medecin ou directement au laboratoire. Tu peux te presenter dans n'importe quel labo d'analyses (Cerba, Biogroup, ou ton labo habituel) avec cette liste. La plupart des labos acceptent sans ordonnance (tu paies de ta poche). Sinon, un passage chez ton generaliste pour l'ordonnance et c'est rembourse.\n\nPANEL 1 : HORMONES ANABOLIQUES\nTestosterone totale, Testosterone libre, SHBG, Cortisol (matin a jeun), DHEA-S, IGF-1, LH, FSH, Estradiol\n\nPANEL 2 : THYROIDE\nTSH, T3 libre, T4 libre, Anti-TPO\n\nPANEL 3 : METABOLISME ET LIPIDES\nGlycemie a jeun, HbA1c, Insuline a jeun, Cholesterol total, HDL, LDL, Triglycerides, ApoB, Lp(a)\n\nPANEL 4 : INFLAMMATION ET FER\nCRP ultra-sensible, Ferritine, Homocysteine, Vitesse de sedimentation\n\nPANEL 5 : VITAMINES ET MINERAUX\nVitamine D (25-OH), Vitamine B12, Magnesium, Zinc, Folates\n\nPANEL 6 : HEPATIQUE ET RENAL\nALAT, ASAT, Gamma-GT, Creatinine, DFG (eGFR), Acide urique\n\nNFS (Numeration Formule Sanguine) complete\n\nUne fois ta prise de sang faite, uploade ton PDF de resultats sur ton dashboard APEXLABS :\nhttps://apexlabs.achzodcoaching.com/blood-analysis\n\nTu recevras ton analyse complete sous 24h.\n\nTon code promo : BLOOD99\n99€ deduits de ton coaching Elite/Private Lab 8 ou 12 semaines\nachzodcoaching.com/formules-coaching\n\nSi tu as des questions, reponds directement a cet email.\n\nAchzod`
        ).catch(() => {});
        res.json({ success: true, auditId: "", auditType: "BLOOD_ANALYSIS", email });
        return;
      }

      // PEPTIDES_ENGINE: trigger background generation from saved responses
      if (planType === "PEPTIDES_ENGINE") {
        console.log(`[PayPal] Peptides Engine paid for ${email} — triggering generation`);
        // Add +2 blood credits
        try {
          const { pool: dbPool } = await import("./db");
          let user = await storage.getUserByEmail(email);
          if (!user) {
            user = await storage.createUser({ email, credits: 2 });
          } else {
            await dbPool.query("UPDATE users SET credits = credits + 2 WHERE email = $1", [email]);
          }
          console.log(`[PayPal] +2 blood credits for ${email} (Peptides Engine)`);
        } catch (creditErr) {
          console.error(`[PayPal] Blood credit error:`, creditErr);
        }

        // DO NOT generate in background here — Render kills the process after HTTP response.
        // The auto-recovery cron will detect this order (paid, no reportId) and generate.
        // Respond immediately so the client gets redirected.
        console.log(`[PayPal] Peptides Engine: order marked paid, cron will generate report for ${email}`);

        res.json({ success: true, auditId: "", auditType: "PEPTIDES_ENGINE", email, generating: true });
        return;
      }

      if (planType !== "PREMIUM" && planType !== "ELITE" && planType !== "GRATUIT") {
        res.status(400).json({ error: "PLAN_INVALID" });
        return;
      }

      const normalizedPlanType = planType as "GRATUIT" | "PREMIUM" | "ELITE";
      const result = await createAuditFromPaidOrder(email, normalizedPlanType, existingOrder);
      if (!result.success) {
        res.status(400).json(result);
        return;
      }
      res.json(result);
    } catch (error: any) {
      console.error("PayPal capture error:", error);
      res.status(500).json({ error: "Erreur capture paiement PayPal" });
    }
  });

  // ==================== ADMIN ENDPOINTS ====================

  // Admin: force generate peptides report for a paid client
  app.post("/api/admin/peptides-generate", async (req, res) => {
    if (!requireAdminAuth(req, res)) return;
    try {
      const { email } = req.body;
      if (!email) { res.status(400).json({ error: "email requis" }); return; }

      // Get saved responses
      const progress = await storage.getBurnoutProgress(`peptides::${email}`);
      const responses = progress?.responses;
      if (!responses || Object.keys(responses).length < 3) {
        res.status(404).json({ error: "Aucune reponse sauvegardee pour cet email", keys: Object.keys(responses || {}).length });
        return;
      }

      console.log(`[Admin] Force generating peptides for ${email} (${Object.keys(responses).length} responses)`);

      // Generate synchronously (admin endpoint = manual trigger, can wait)
      const { generatePeptidesProtocol } = await import("./peptidesEngine");
      const report = await generatePeptidesProtocol(responses, email);
      const saved = await storage.createBurnoutReport({ email: `peptides::${email}`, responses: responses || {}, report });
      console.log(`[Admin] Peptides protocol generated for ${email}: ${saved.id}`);

      // Link to order
      const orders = await storage.getOrdersByEmail(email);
      const pepOrder = orders.find((o: any) => o.productType === "PEPTIDES_ENGINE" && o.status === "paid");
      if (pepOrder) {
        await storage.updateOrder(pepOrder.id, {
          metadata: { ...(pepOrder.metadata as object ?? {}), peptidesReportId: saved.id },
        }).catch(() => {});
      }

      // Send emails directly (no dedup, no tracking — admin is manual override)
      const baseUrl = getBaseUrl();
      const peptidesNames = report.peptides?.map((p: any) => p.name).join(", ") ?? "voir rapport";
      const promoBlock = report.promoCodesGenerated?.length > 0
        ? `\n\nTes 2 codes Blood Analysis offerts:\n${report.promoCodesGenerated.join("\n")}` : "";
      await sendCTAEmail(email, "Ton protocole peptides personnalisé est prêt",
        `Ton protocole peptides est prêt.\n\nPeptides recommandés : ${peptidesNames}\n\nAccède à ton rapport complet ici :\n${baseUrl}/peptides/${saved.id}${promoBlock}\n\nConserve ce lien — il est personnel et unique.`
      ).catch(() => {});
      const adminNotifEmail = process.env.ADMIN_NOTIFICATION_EMAIL || "coaching@achzodcoaching.com";
      await sendCTAEmail(adminNotifEmail, `PEPTIDES GENERE — ${email}`, `Rapport genere pour ${email}\nReport ID: ${saved.id}\nPeptides: ${peptidesNames}\nLien: ${baseUrl}/peptides/${saved.id}`).catch(() => {});

      res.json({ success: true, reportId: saved.id, peptideCount: report.peptides?.length ?? 0, link: `${baseUrl}/peptides/${saved.id}` });
    } catch (error: any) {
      console.error("[Admin] Peptides generate error:", error);
      res.status(500).json({ error: error.message || "Erreur generation" });
    }
  });

  // Admin: inject responses manually for a paid peptides client (last resort recovery)
  app.post("/api/admin/peptides-inject-responses", async (req, res) => {
    if (!requireAdminAuth(req, res)) return;
    try {
      const { email, responses } = req.body;
      if (!email || !responses || Object.keys(responses).length < 3) {
        res.status(400).json({ error: "email et responses (min 3 champs) requis" });
        return;
      }

      await storage.saveBurnoutProgress({
        email: `peptides::${email}`,
        currentSection: 6,
        totalSections: 6,
        responses,
      });

      // Also save to order metadata as backup
      const orders = await storage.getOrdersByEmail(email);
      const pepOrder = orders.find((o: any) => o.productType === "PEPTIDES_ENGINE" && o.status === "paid");
      if (pepOrder) {
        await storage.updateOrder(pepOrder.id, {
          metadata: { ...(pepOrder.metadata as object ?? {}), peptidesResponses: responses, injectedByAdmin: true },
        }).catch(() => {});
      }

      res.json({ success: true, responseCount: Object.keys(responses).length });
    } catch (error: any) {
      console.error("[Admin] Inject responses error:", error);
      res.status(500).json({ error: error.message || "Erreur" });
    }
  });

  app.get("/api/admin/audits", async (req, res) => {
    if (!requireAdminAuth(req, res)) return;
    try {
      const allAudits = await storage.getAllAudits();
      const bloodReports = await storage.getAllBloodReports();

      const mappedBlood = bloodReports.map((report) => ({
        id: report.id,
        email: report.email,
        type: "BLOOD_ANALYSIS",
        status: "COMPLETED",
        reportDeliveryStatus: "SENT",
        reportSentAt: report.createdAt,
        createdAt: report.createdAt,
        completedAt: report.createdAt,
      }));

      const audits = [...mappedBlood, ...allAudits].sort((a: any, b: any) => {
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

      console.log(`[Admin CTA] Envoi CTA à ${audit.email} pour audit ${auditId}`);
      console.log(`Sujet: ${subject}`);
      console.log(`Message: ${message}`);
      const sent = await sendCTAEmail(audit.email, subject, message);
      if (!sent) {
        res.status(500).json({ success: false, error: "Echec envoi CTA" });
        return;
      }

      res.json({ success: true, message: "CTA envoyé avec succès" });
    } catch (error) {
      console.error("[Admin Send CTA] Error:", error);
      res.status(500).json({ success: false, error: "Erreur serveur" });
    }
  });

  // Admin: Send review request J+3 to all eligible audits
  app.post("/api/admin/send-review-requests", async (req, res) => {
    if (!requireAdminAuth(req, res)) return;
    try {
      const dryRun = req.body.dryRun === true;
      const maxToSend = req.body.maxToSend || 50;
      const baseUrl = process.env.PUBLIC_BASE_URL || process.env.RENDER_EXTERNAL_URL || `${req.protocol}://${req.get("host")}`;

      // Get all completed audits with reports sent
      const allAudits = await storage.getAllAudits();
      const now = new Date();
      const threeDaysMs = 3 * 24 * 60 * 60 * 1000;

      // Filter: report sent 3+ days ago, no review left yet
      const eligible: typeof allAudits = [];
      for (const audit of allAudits) {
        if (!audit.email) continue;
        if (audit.createdAt && new Date(audit.createdAt) < new Date('2026-03-17')) continue; // Only post-launch

        // Check if report was sent (has reportSentAt or status SENT)
        const sentAt = (audit as any).reportSentAt || audit.createdAt;
        if (!sentAt) continue;
        const daysSinceSent = (now.getTime() - new Date(sentAt).getTime()) / (24 * 60 * 60 * 1000);
        const maxDays = req.body.catchUp ? 90 : 14; // catchUp=true → rattrapage tous les anciens clients
        if (daysSinceSent < 3 || daysSinceSent > maxDays) continue;

        // Check if already left a review
        const existingReview = await storage.getReviewByAuditId?.(audit.id);
        if (existingReview) continue;

        // Check if review request already sent
        const emailHistory = await storage.getEmailTrackingForAudit(audit.id);
        const alreadySent = emailHistory?.some((e: any) => e.emailType === 'sendReviewRequestJ3Email');
        if (alreadySent) continue;

        eligible.push(audit);
        if (eligible.length >= maxToSend) break;
      }

      if (dryRun) {
        res.json({ success: true, dryRun: true, eligible: eligible.length, emails: eligible.map(a => a.email) });
        return;
      }

      let sent = 0;
      let errors = 0;
      const errorDetails: string[] = [];
      for (const audit of eligible) {
        try {
          const trackingRecord = await storage.createEmailTracking(audit.id, "sendReviewRequestJ3Email", audit.email);
          const result = await sendReviewRequestJ3Email(
            audit.email,
            audit.id,
            audit.auditType || "GRATUIT",
            baseUrl,
            trackingRecord.id
          );
          if (result) {
            sent++;
            console.log(`[ReviewRequest] Sent to ${audit.email}`);
          } else {
            errors++;
            errorDetails.push(`${audit.email}: sendReviewRequestJ3Email returned false`);
          }
        } catch (e: any) {
          errors++;
          errorDetails.push(`${audit.email}: ${e.message || String(e)}`);
        }
      }

      res.json({ success: true, eligible: eligible.length, sent, errors, errorDetails: errorDetails.slice(0, 10) });
    } catch (error) {
      console.error("[Admin] Error sending review requests:", error);
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

      // Peptides Engine: auditId is the report ID (burnout_reports), not an audit
      if (parsed.auditType === "PEPTIDES_ENGINE") {
        const report = await storage.getBurnoutReport(parsed.auditId);
        if (!report) {
          res.status(404).json({ success: false, error: "Rapport introuvable" });
          return;
        }
      } else {
        const audit = await storage.getAudit(parsed.auditId);
        if (!audit) {
          res.status(404).json({ success: false, error: "Audit non trouvé" });
          return;
        }
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
        console.error("[Review] DB Error:", (error as any)?.code, (error as any)?.detail);
        res.status(500).json({
          success: false,
          error: "Erreur serveur",
        });
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
        // Get client name from audit (or email for peptides which have no audit)
        let clientName = review.email.split('@')[0];
        if (review.auditType !== "PEPTIDES_ENGINE") {
          const audit = await storage.getAudit(review.auditId);
          clientName = (audit?.responses as any)?.prenom || clientName;
        }
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
      console.error("[Claude Opus 4.6] Erreur generation audit:", error);
      res.status(500).json({
        success: false,
        error: "Erreur serveur interne"
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
          id VARCHAR(36) PRIMARY KEY,
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
         VALUES ('ANALYSE20', 20, 'Code promo 20% sur toutes les analyses APEXLABS', 'ALL')
         ON CONFLICT (code) DO NOTHING`,
        `INSERT INTO promo_codes (code, discount_percent, description, valid_for)
         VALUES ('RETOUR30', 30, 'Code promo 30% abandons - Anabolic/Ultimate/Blood uniquement', 'PREMIUM')
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
        `CREATE INDEX IF NOT EXISTS idx_email_tracking_audit_id ON email_tracking(audit_id)`
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
      res.status(500).json({ error: "Erreur initialisation base de données" });
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
  // Reset promo code usage by code name
  app.post("/api/admin/promo-codes/reset-usage", async (req, res) => {
    if (!requireAdminAuth(req, res)) return;
    try {
      const { code } = req.body;
      if (!code) { res.status(400).json({ error: "code requis" }); return; }
      const { pool } = await import("./db");
      await pool.query("UPDATE promo_codes SET current_uses = 0 WHERE UPPER(code) = $1", [code.toUpperCase()]);
      res.json({ success: true, message: `Usage reset for ${code}` });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

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

  // ==================== ADMIN ORDER MANAGEMENT ====================

  app.get("/api/admin/orders", async (req, res) => {
    if (!requireAdminAuth(req, res)) return;
    try {
      const limit = Math.min(Number(req.query.limit) || 50, 1000);
      const offset = Number(req.query.offset) || 0;
      const status = (req.query.status as string) || undefined;
      const productType = (req.query.productType as string) || undefined;
      const email = (req.query.email as string) || undefined;
      const result = await storage.getAllOrders({ limit, offset, status: status as any, productType: productType as any, email });
      res.json({ success: true, ...result });
    } catch (error) {
      console.error("[Admin Orders] Error listing:", error);
      res.status(500).json({ success: false, error: "Erreur serveur" });
    }
  });

  app.get("/api/admin/orders/stats", async (req, res) => {
    if (!requireAdminAuth(req, res)) return;
    try {
      const { orders: allOrders } = await storage.getAllOrders({ limit: 10000 });
      const now = Date.now();
      const d7 = now - 7 * 86400000;
      const d30 = now - 30 * 86400000;

      const paid = allOrders.filter(o => o.status === "paid" || o.status === "refunded" || o.status === "partial_refund");
      const totalRevenueCents = paid.reduce((s, o) => s + o.finalAmountCents, 0);
      const totalRefundedCents = allOrders.reduce((s, o) => s + o.refundAmountCents, 0);

      const byProduct: Record<string, { count: number; revenueCents: number }> = {};
      for (const o of paid) {
        if (!byProduct[o.productType]) byProduct[o.productType] = { count: 0, revenueCents: 0 };
        byProduct[o.productType].count++;
        byProduct[o.productType].revenueCents += o.finalAmountCents;
      }

      const byStatus: Record<string, number> = {};
      for (const o of allOrders) {
        byStatus[o.status] = (byStatus[o.status] || 0) + 1;
      }

      const last7d = paid.filter(o => new Date(o.createdAt).getTime() >= d7);
      const last30d = paid.filter(o => new Date(o.createdAt).getTime() >= d30);

      res.json({
        success: true,
        stats: {
          totalOrders: allOrders.length,
          totalRevenueCents,
          totalRefundedCents,
          netRevenueCents: totalRevenueCents - totalRefundedCents,
          byProduct,
          byStatus,
          last7d: { count: last7d.length, revenueCents: last7d.reduce((s, o) => s + o.finalAmountCents, 0) },
          last30d: { count: last30d.length, revenueCents: last30d.reduce((s, o) => s + o.finalAmountCents, 0) },
        },
      });
    } catch (error) {
      console.error("[Admin Orders] Error getting stats:", error);
      res.status(500).json({ success: false, error: "Erreur serveur" });
    }
  });

  app.get("/api/admin/orders/:id", async (req, res) => {
    if (!requireAdminAuth(req, res)) return;
    try {
      const order = await storage.getOrder(req.params.id);
      if (!order) {
        res.status(404).json({ success: false, error: "Commande non trouvée" });
        return;
      }
      res.json({ success: true, order });
    } catch (error) {
      console.error("[Admin Orders] Error getting order:", error);
      res.status(500).json({ success: false, error: "Erreur serveur" });
    }
  });

  app.post("/api/admin/orders/:id/refund", async (req, res) => {
    if (!requireAdminAuth(req, res)) return;
    try {
      const order = await storage.getOrder(req.params.id);
      if (!order) {
        res.status(404).json({ success: false, error: "Commande non trouvée" });
        return;
      }
      if (order.finalAmountCents === 0) {
        res.status(400).json({ success: false, error: "Impossible de rembourser une commande gratuite" });
        return;
      }
      if (order.status === "refunded") {
        res.status(400).json({ success: false, error: "Commande déjà remboursée" });
        return;
      }
      if (order.status !== "paid" && order.status !== "partial_refund") {
        res.status(400).json({ success: false, error: `Impossible de rembourser une commande au statut ${order.status}` });
        return;
      }

      const { reason, amountCents } = req.body as { reason?: string; amountCents?: number };
      const maxRefundable = order.finalAmountCents - order.refundAmountCents;
      const refundAmount = amountCents ? Math.min(amountCents, maxRefundable) : maxRefundable;

      if (refundAmount <= 0) {
        res.status(400).json({ success: false, error: "Montant de remboursement invalide ou déjà intégralement remboursé" });
        return;
      }

      // Process Stripe refund
      let stripeRefundId: string | null = null;
      if (order.stripePaymentIntentId) {
        try {
          const stripe = await getUncachableStripeClient();
          const refund = await stripe.refunds.create({
            payment_intent: order.stripePaymentIntentId,
            amount: refundAmount,
            reason: "requested_by_customer" as const,
          });
          stripeRefundId = refund.id;
        } catch (stripeErr: any) {
          console.error("[Admin Orders] Stripe refund error:", stripeErr);
          res.status(500).json({ success: false, error: "Erreur Stripe lors du remboursement" });
          return;
        }
      }

      const totalRefunded = order.refundAmountCents + refundAmount;
      const isFullRefund = totalRefunded >= order.finalAmountCents;

      await storage.updateOrder(order.id, {
        status: isFullRefund ? "refunded" : "partial_refund",
        refundAmountCents: totalRefunded,
        refundReason: reason || null,
        refundStripeId: stripeRefundId,
        refundedAt: new Date(),
        refundedBy: "admin",
      });

      const updated = await storage.getOrder(order.id);
      res.json({ success: true, order: updated, stripeRefundId });
    } catch (error) {
      console.error("[Admin Orders] Error processing refund:", error);
      res.status(500).json({ success: false, error: "Erreur serveur" });
    }
  });

  app.get("/api/admin/clients/:email", async (req, res) => {
    if (!requireAdminAuth(req, res)) return;
    try {
      const email = decodeURIComponent(req.params.email).trim().toLowerCase();
      const user = await storage.getUserByEmail(email);
      const orders = await storage.getOrdersByEmail(email);
      const audits = await storage.getAuditsByEmail(email);
      const bloodReports = await storage.getAllBloodReports();
      const clientBloodReports = bloodReports.filter(r => r.email.trim().toLowerCase() === email);

      // Gather email tracking for all audits
      const emailTrackings: any[] = [];
      for (const audit of audits) {
        const trackings = await storage.getEmailTrackingForAudit(audit.id);
        emailTrackings.push(...trackings.map(t => ({ ...t, auditId: audit.id })));
      }

      const paidOrders = orders.filter(o => o.status === "paid" || o.status === "refunded" || o.status === "partial_refund");
      const totalSpentCents = paidOrders.reduce((s, o) => s + o.finalAmountCents, 0);
      const totalRefundedCents = orders.reduce((s, o) => s + o.refundAmountCents, 0);

      res.json({
        success: true,
        client: {
          user: user || null,
          email,
          orders,
          audits: audits.map(a => ({
            id: a.id,
            type: a.type,
            status: a.status,
            reportDeliveryStatus: a.reportDeliveryStatus,
            createdAt: a.createdAt,
            completedAt: a.completedAt,
            reportSentAt: a.reportSentAt,
          })),
          bloodReports: clientBloodReports.map(r => ({
            id: r.id,
            createdAt: r.createdAt,
            markerCount: Array.isArray(r.markers) ? r.markers.length : 0,
          })),
          emailTrackings,
          totalSpentCents,
          totalRefundedCents,
          netSpentCents: totalSpentCents - totalRefundedCents,
        },
      });
    } catch (error) {
      console.error("[Admin Clients] Error:", error);
      res.status(500).json({ success: false, error: "Erreur serveur" });
    }
  });

  app.get("/api/admin/audits/:id/report-artifacts", async (req, res) => {
    if (!requireAdminAuth(req, res)) return;
    try {
      const auditId = req.params.id;
      const audit = await storage.getAudit(auditId);
      if (!audit) {
        res.status(404).json({ success: false, error: "Audit non trouvé" });
        return;
      }
      // Fetch from report_artifacts table
      const result = await pool.query(
        "SELECT id, audit_id, tier, engine, model, created_at FROM report_artifacts WHERE audit_id = $1 ORDER BY created_at DESC",
        [auditId]
      );
      res.json({
        success: true,
        artifacts: result.rows.map((r: any) => ({
          id: r.id,
          auditId: r.audit_id,
          tier: r.tier,
          engine: r.engine,
          model: r.model,
          createdAt: r.created_at,
        })),
      });
    } catch (error) {
      console.error("[Admin Artifacts] Error:", error);
      res.status(500).json({ success: false, error: "Erreur serveur" });
    }
  });

  app.get("/api/admin/promo-codes/:id/usages", async (req, res) => {
    if (!requireAdminAuth(req, res)) return;
    try {
      // Get the promo code first to find the code string
      const allPromos = await storage.getAllPromoCodes();
      const promo = allPromos.find(p => p.id === req.params.id);
      if (!promo) {
        res.status(404).json({ success: false, error: "Code promo non trouvé" });
        return;
      }
      const usages = await storage.getPromoCodeUsagesByCode(promo.code);
      res.json({ success: true, usages, promo: { id: promo.id, code: promo.code, currentUses: promo.currentUses } });
    } catch (error) {
      console.error("[Admin Promo Usages] Error:", error);
      res.status(500).json({ success: false, error: "Erreur serveur" });
    }
  });

  // Admin email trackings list - NEW SYSTEM with full tracking
  app.get("/api/admin/email-trackings", async (req, res) => {
    if (!requireAdminAuth(req, res)) return;
    try {
      const limit = Math.min(Number(req.query.limit) || 50, 200);
      const { getRecentEmails } = await import("./emailTracking");
      const emails = await getRecentEmails(limit);

      res.json({
        success: true,
        trackings: emails,
        total: emails.length,
      });
    } catch (error) {
      console.error("[Admin Email Trackings] Error:", error);
      res.status(500).json({ success: false, error: "Erreur serveur" });
    }
  });

  // Admin email tracking stats
  app.get("/api/admin/email-trackings/stats", async (req, res) => {
    if (!requireAdminAuth(req, res)) return;
    try {
      const { getEmailTrackingStats } = await import("./emailTracking");
      const stats = await getEmailTrackingStats();

      res.json({
        success: true,
        stats,
      });
    } catch (error) {
      console.error("[Admin Email Tracking Stats] Error:", error);
      res.status(500).json({ success: false, error: "Erreur serveur" });
    }
  });

  // Admin email tracking CSV export
  app.get("/api/admin/email-trackings/export/csv", async (req, res) => {
    if (!requireAdminAuth(req, res)) return;
    try {
      const { exportEmailTrackingCSV } = await import("./emailTracking");
      const csv = await exportEmailTrackingCSV();

      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", "attachment; filename=email-trackings.csv");
      res.send(csv);
    } catch (error) {
      console.error("[Admin Email Tracking CSV] Error:", error);
      res.status(500).json({ success: false, error: "Erreur serveur" });
    }
  });

  // Admin email tracking export for Google Sheets (JSON format)
  app.get("/api/admin/email-trackings/export/sheets", async (req, res) => {
    if (!requireAdminAuth(req, res)) return;
    try {
      const { getRecentEmails, getEmailTrackingStats } = await import("./emailTracking");

      // Get all emails (no limit for Google Sheets)
      const emails = await getRecentEmails(1000);
      const stats = await getEmailTrackingStats();

      res.json({
        success: true,
        emails: emails.map(email => ({
          id: email.id,
          emailType: email.emailType,
          recipientEmail: email.recipientEmail,
          recipientName: email.recipientName,
          auditId: email.auditId,
          auditType: email.auditType,
          subject: email.subject,
          sendpulseStatus: email.sendpulseStatus,
          sentAt: email.sentAt,
          opened: email.opened,
          clicked: email.clicked,
          converted: email.converted,
          conversionType: email.conversionType,
        })),
        stats: {
          totalSent: stats.totalSent,
          successRate: Math.round(stats.successRate * 10) / 10,
          openRate: Math.round(stats.openRate * 10) / 10,
          clickRate: Math.round(stats.clickRate * 10) / 10,
          conversionRate: Math.round(stats.conversionRate * 10) / 10,
          byType: stats.byType,
        },
        exportedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error("[Admin Email Tracking Sheets] Error:", error);
      res.status(500).json({ success: false, error: "Erreur serveur" });
    }
  });

  // ==================== EMAIL UNSUBSCRIBE ====================

  // GET /api/unsubscribe — Public page: shows confirmation + auto-processes unsubscribe
  app.get("/api/unsubscribe", async (req, res) => {
    try {
      const emailB64 = req.query.email as string;
      if (!emailB64) {
        return res.status(400).send("Missing email parameter");
      }
      const email = Buffer.from(emailB64, "base64").toString("utf-8");
      if (!email || !email.includes("@")) {
        return res.status(400).send("Invalid email");
      }

      // Auto-unsubscribe on page load
      await storage.unsubscribeEmail(email);

      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.send(`<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Desabonnement - APEXLABS</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background-color: #0a0b0d;
      color: #ffffff;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .card {
      max-width: 480px;
      width: 100%;
      background: #111113;
      border: 1px solid rgba(252, 221, 0, 0.15);
      border-radius: 16px;
      padding: 48px 32px;
      text-align: center;
    }
    .brand {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 32px;
    }
    .brand-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background-color: #FCDD00;
    }
    .brand-text {
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 2px;
      text-transform: uppercase;
      color: #FCDD00;
    }
    .icon {
      font-size: 48px;
      margin-bottom: 24px;
    }
    h1 {
      font-size: 24px;
      font-weight: 700;
      margin-bottom: 16px;
      letter-spacing: -0.5px;
    }
    .message {
      color: #a1a1aa;
      font-size: 15px;
      line-height: 1.7;
      margin-bottom: 32px;
    }
    .contact {
      color: #525252;
      font-size: 13px;
      line-height: 1.6;
    }
    .contact a {
      color: #FCDD00;
      text-decoration: none;
    }
    .contact a:hover {
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="brand">
      <div class="brand-dot"></div>
      <span class="brand-text">APEXLABS BY ACHZOD</span>
    </div>
    <div class="icon">&#9993;</div>
    <h1>Desabonnement confirme</h1>
    <p class="message">
      Tu as ete desabonne des emails APEXLABS.<br>
      Tu ne recevras plus d'emails de notre part.
    </p>
    <p class="contact">
      Si c'est une erreur, contacte<br>
      <a href="mailto:coaching@achzodcoaching.com">coaching@achzodcoaching.com</a>
    </p>
  </div>
</body>
</html>`);
    } catch (error) {
      console.error("[Unsubscribe] Error:", error);
      res.status(500).send("Erreur serveur");
    }
  });

  // POST /api/unsubscribe — Process unsubscribe (API)
  app.post("/api/unsubscribe", async (req, res) => {
    try {
      const { email, reason } = req.body || {};
      if (!email || !email.includes("@")) {
        return res.status(400).json({ success: false, error: "Email invalide" });
      }
      await storage.unsubscribeEmail(email, reason);
      res.json({ success: true });
    } catch (error) {
      console.error("[Unsubscribe] POST Error:", error);
      res.status(500).json({ success: false, error: "Erreur serveur" });
    }
  });

  // GET /api/admin/unsubscribes — Admin: list all unsubscribed emails
  app.get("/api/admin/unsubscribes", async (req, res) => {
    if (!requireAdminAuth(req, res)) return;
    try {
      const unsubscribes = await storage.getAllUnsubscribes();
      res.json({ success: true, unsubscribes, total: unsubscribes.length });
    } catch (error) {
      console.error("[Admin Unsubscribes] Error:", error);
      res.status(500).json({ success: false, error: "Erreur serveur" });
    }
  });

  // POST /api/admin/resubscribe — Admin: re-subscribe an email
  app.post("/api/admin/resubscribe", async (req, res) => {
    if (!requireAdminAuth(req, res)) return;
    try {
      const { email } = req.body || {};
      if (!email || !email.includes("@")) {
        return res.status(400).json({ success: false, error: "Email invalide" });
      }
      await storage.resubscribeEmail(email);
      res.json({ success: true });
    } catch (error) {
      console.error("[Admin Resubscribe] Error:", error);
      res.status(500).json({ success: false, error: "Erreur serveur" });
    }
  });

  // PUBLIC endpoint for Google Sheets (read-only, avec token fixe)
  // Ce endpoint permet au Apps Script de récupérer les emails automatiquement
  app.get("/api/export/emails-for-sheets", async (req, res) => {
    try {
      // Token fixe pour Google Sheets (read-only access)
      const SHEETS_READ_TOKEN = process.env.GOOGLE_SHEETS_READ_TOKEN || "apexlabs_sheets_readonly_2026";
      const providedToken = req.query.token || req.headers['x-sheets-token'];

      if (providedToken !== SHEETS_READ_TOKEN) {
        return res.status(401).json({ success: false, error: "Invalid token" });
      }

      const { getRecentEmails, getEmailTrackingStats } = await import("./emailTracking");

      // Get all emails (no limit)
      const emails = await getRecentEmails(1000);
      const stats = await getEmailTrackingStats();

      res.json({
        success: true,
        emails: emails.map(email => ({
          id: email.id,
          emailType: email.emailType,
          recipientEmail: email.recipientEmail,
          recipientName: email.recipientName,
          auditId: email.auditId,
          auditType: email.auditType,
          subject: email.subject,
          sendpulseStatus: email.sendpulseStatus,
          sentAt: email.sentAt,
          opened: email.opened,
          clicked: email.clicked,
          converted: email.converted,
          conversionType: email.conversionType,
        })),
        stats: {
          totalSent: stats.totalSent,
          successRate: Math.round(stats.successRate * 10) / 10,
          openRate: Math.round(stats.openRate * 10) / 10,
          clickRate: Math.round(stats.clickRate * 10) / 10,
          conversionRate: Math.round(stats.conversionRate * 10) / 10,
          byType: stats.byType,
        },
        exportedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error("[Sheets Export] Error:", error);
      res.status(500).json({ success: false, error: "Erreur serveur" });
    }
  });

  // Admin combined tracking (audits + emails)
  app.get("/api/admin/tracking/combined-stats", async (req, res) => {
    if (!requireAdminAuth(req, res)) return;
    try {
      const { getCombinedStats } = await import("./googleSheetsTracking");
      const stats = await getCombinedStats();

      res.json({
        success: true,
        stats,
      });
    } catch (error) {
      console.error("[Admin Combined Stats] Error:", error);
      res.status(500).json({ success: false, error: "Erreur serveur" });
    }
  });

  // Admin - Analyse Discovery scans pour conversion
  app.get("/api/admin/discovery/analyze-conversions", async (req, res) => {
    if (!requireAdminAuth(req, res)) return;
    try {
      console.log("[Admin] Analyzing Discovery scans for conversions...");

      // Récupérer tous les audits GRATUIT depuis le 17 mars
      const startDate = new Date("2026-03-17");
      const { db } = await import("./db");
      const { audits: auditsTable } = await import("../shared/drizzle-schema");
      const { eq, gte, and } = await import("drizzle-orm");

      const discoveryAudits = await db
        .select()
        .from(auditsTable)
        .where(
          and(
            eq(auditsTable.type, "GRATUIT"),
            gte(auditsTable.createdAt, startDate)
          )
        );

      console.log(`[Admin] Found ${discoveryAudits.length} Discovery scans since 17/03`);

      const stats = {
        total: discoveryAudits.length,
        sent: 0,
        scheduled: 0,
        failed: 0,
        needsJ2Relance: [] as any[],
        needsJ7Relance: [] as any[],
      };

      const now = new Date();

      for (const audit of discoveryAudits) {
        // Status du rapport
        if (audit.reportDeliveryStatus === "SENT") stats.sent++;
        else if (audit.reportDeliveryStatus === "SCHEDULED") stats.scheduled++;
        else if (audit.reportDeliveryStatus === "FAILED") stats.failed++;

        // Vérifier emails de relance déjà envoyés (nouveau système)
        const { emailTracking: emailTrackingTable } = await import("../shared/drizzle-schema");
        const emailTracking = await db
          .select()
          .from(emailTrackingTable)
          .where(eq(emailTrackingTable.auditId, audit.id));

        const hasJ2Email = emailTracking.some(t => t.emailType === "sendGratuitUpsellEmail");
        const hasJ7Email = emailTracking.some(t => t.emailType === "sendPremiumJ7Email");

        const reportSentAt = (audit as any).reportSentAt;
        if (reportSentAt) {
          const sentDate = new Date(reportSentAt);
          const daysSinceSent = Math.floor((now.getTime() - sentDate.getTime()) / (1000 * 60 * 60 * 24));

          // J+2: Upsell Discovery → Ultimate/Anabolic
          if (daysSinceSent >= 2 && daysSinceSent < 30 && !hasJ2Email) {
            stats.needsJ2Relance.push({
              id: audit.id,
              email: audit.email,
              daysSinceSent,
              createdAt: audit.createdAt,
              reportSentAt,
            });
          }

          // J+7: Dernière chance (normalement pour Premium/Elite, mais on peut l'utiliser pour Discovery aussi)
          if (daysSinceSent >= 7 && daysSinceSent < 30 && !hasJ7Email && !hasJ2Email) {
            stats.needsJ7Relance.push({
              id: audit.id,
              email: audit.email,
              daysSinceSent,
              createdAt: audit.createdAt,
              reportSentAt,
            });
          }
        }
      }

      const totalOpportunities = stats.needsJ2Relance.length + stats.needsJ7Relance.length;
      const estimatedConversionRate = 0.05; // 5% conservateur
      const avgOrderValue = 69; // Moyenne Anabolic/Ultimate
      const estimatedRevenue = totalOpportunities * estimatedConversionRate * avgOrderValue;

      res.json({
        success: true,
        stats: {
          total: stats.total,
          sent: stats.sent,
          scheduled: stats.scheduled,
          failed: stats.failed,
          needsJ2Relance: stats.needsJ2Relance.length,
          needsJ7Relance: stats.needsJ7Relance.length,
          totalOpportunities,
          estimatedConversionRate: (estimatedConversionRate * 100).toFixed(1) + "%",
          avgOrderValue: avgOrderValue + "€",
          estimatedRevenue: Math.round(estimatedRevenue) + "€",
        },
        relanceLists: {
          j2: stats.needsJ2Relance,
          j7: stats.needsJ7Relance,
        },
      });
    } catch (error) {
      console.error("[Admin Discovery Analysis] Error:", error);
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
    if (!requireAdminAuth(req, res)) return;
    try {
      const baseUrl = getBaseUrl();
      const now = new Date();
      const results = { gratuitUpsell: 0, gratuitJ5: 0, gratuitJ7: 0, premiumJ7: 0, premiumJ14: 0, errors: 0 };

      // Get all SENT audits
      const allAudits = await storage.getAllAudits();
      const sentAudits = allAudits.filter(a => a.reportDeliveryStatus === "SENT" && a.reportSentAt);

      for (const audit of sentAudits) {
        try {
          const sentAt = new Date(audit.reportSentAt!);
          const daysSinceSent = Math.floor((now.getTime() - sentAt.getTime()) / (1000 * 60 * 60 * 24));

          // Get existing email tracking for this audit (NEW SYSTEM)
          const { db } = await import("./db");
          const { emailTracking: emailTrackingTable } = await import("../shared/drizzle-schema");
          const { eq } = await import("drizzle-orm");

          const emailTracking = await db.select().from(emailTrackingTable).where(eq(emailTrackingTable.auditId, audit.id));
          const trackingTypes = emailTracking.map(t => t.emailType);

          // GRATUIT audits: Send upsell email after 2 days
          if (audit.type === "GRATUIT" && daysSinceSent >= 2 && daysSinceSent < 30) {
            if (!trackingTypes.includes("sendGratuitUpsellEmail")) {
              // sendGratuitUpsellEmail uses sendEmailWithTracking which logs automatically
              const sent = await sendGratuitUpsellEmail(audit.email, audit.id, baseUrl, "auto-sequence");
              if (sent) results.gratuitUpsell++;
              else results.errors++;
            }
          }

          // GRATUIT audits: J+5 email "Ce que ton Discovery ne peut pas te donner"
          if (audit.type === "GRATUIT" && daysSinceSent >= 5 && daysSinceSent < 30) {
            if (!trackingTypes.includes("sendGratuitJ5Email")) {
              const hasConverted = await storage.hasUserPurchased(audit.email);
              if (!hasConverted) {
                const sent = await sendGratuitJ5Email(audit.email, audit.id, baseUrl, "auto-sequence");
                if (sent) results.gratuitJ5++;
                else results.errors++;
              }
            }
          }

          // GRATUIT audits: J+7 email "Offre limitee -40% cette semaine"
          if (audit.type === "GRATUIT" && daysSinceSent >= 7 && daysSinceSent < 30) {
            if (!trackingTypes.includes("sendGratuitJ7Email")) {
              const hasConverted = await storage.hasUserPurchased(audit.email);
              if (!hasConverted) {
                const sent = await sendGratuitJ7Email(audit.email, audit.id, baseUrl, "auto-sequence");
                if (sent) results.gratuitJ7++;
                else results.errors++;
              }
            }
          }

          // GRATUIT audits: J+14 Coaching email (if no conversion)
          if (audit.type === "GRATUIT" && daysSinceSent >= 14 && daysSinceSent < 30) {
            if (!trackingTypes.includes("sendDiscoveryJ14CoachingEmail")) {
              // Check if they've converted (purchased Ultimate/Anabolic)
              const hasConverted = await storage.hasUserPurchased(audit.email);

              if (!hasConverted) {
                const sent = await sendDiscoveryJ14CoachingEmail(audit.email, audit.id, baseUrl, "auto-sequence");
                if (sent) {
                  results.gratuitJ14 = (results.gratuitJ14 || 0) + 1;
                } else {
                  results.errors++;
                }
              }
            }
          }

          // PREMIUM/ELITE audits: J+7 and J+14 sequences
          if (audit.type === "PREMIUM" || audit.type === "ELITE") {
            // J+7: Send if 7+ days and no J+7 email sent yet
            if (daysSinceSent >= 7 && daysSinceSent < 14) {
              if (!trackingTypes.includes("sendPremiumJ7Email")) {
                const hasReview = await storage.hasUserLeftReview(audit.id);
                // sendPremiumJ7Email uses sendEmailWithTracking which logs automatically
                const sent = await sendPremiumJ7Email(audit.email, audit.id, audit.type, baseUrl, "auto-sequence", hasReview);
                if (sent) results.premiumJ7++;
                else results.errors++;
              }
            }

            // J+14: Send ONLY if J+7 email was NOT opened
            if (daysSinceSent >= 14 && daysSinceSent < 30) {
              const j7Email = emailTracking.find(t => t.emailType === "sendPremiumJ7Email");
              const j14Sent = trackingTypes.includes("sendPremiumJ14Email");

              // Only send J+14 if J+7 was sent but NOT opened
              if (j7Email && !j7Email.opened && !j14Sent) {
                // sendPremiumJ14Email uses sendEmailWithTracking which logs automatically
                const sent = await sendPremiumJ14Email(audit.email, audit.id, audit.type, baseUrl, "auto-sequence");
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

      // ════════════════════════════════════════════════════════════════
      // PEPTIDES ENGINE SEQUENCES (S4, S8, S12, S16)
      // Based on paid orders, not audits
      // ════════════════════════════════════════════════════════════════
      let peptidesReviewJ3 = 0, peptidesReviewS5 = 0, peptidesReviewS12 = 0, peptidesS4 = 0, peptidesS8 = 0, peptidesS12 = 0, peptidesS16 = 0;
      let peptidesAutoGenerated = 0;

      try {
        const allOrders = await storage.getAllOrders?.() || [];
        const peptidesOrders = allOrders.filter((o: any) => o.productType === "PEPTIDES_ENGINE" && o.status === "paid" && o.paidAt);

        // Peptides auto-recovery REMOVED from cron — handled exclusively by setInterval (5min)
        // This prevents double generation and double email sends

        for (const order of peptidesOrders) {
          try {
            const paidAt = new Date(order.paidAt);
            const daysSincePaid = Math.floor((now.getTime() - paidAt.getTime()) / (1000 * 60 * 60 * 24));
            const email = order.email;
            if (!email || email.includes("test") || email.includes("debug") || email.includes("audit.final")) continue;

            // Get tracking for this order
            const { db } = await import("./db");
            const { emailTracking: emailTrackingTable } = await import("../shared/drizzle-schema");
            const { eq, and } = await import("drizzle-orm");
            const tracking = await db.select().from(emailTrackingTable).where(eq(emailTrackingTable.email, email));
            const types = tracking.map((t: any) => t.emailType);

            // Review J+3 — Demande d'avis 3 jours apres paiement
            if (daysSincePaid >= 3 && daysSincePaid < 14 && !types.includes("peptidesReviewJ3")) {
              // Find the report ID from order metadata
              const reportId = (order.metadata as any)?.peptidesReportId;
              if (reportId) {
                const trackingRecord = await storage.createEmailTracking(order.id, "peptidesReviewJ3", email);
                const sent = await sendPeptidesReviewEmail(
                  email,
                  reportId,
                  baseUrl,
                  trackingRecord.id
                );
                if (sent) {
                  peptidesReviewJ3++;
                  await db.insert(emailTrackingTable).values({ email, emailType: "peptidesReviewJ3", auditId: order.id, sentAt: new Date() }).catch(() => {});
                }
              }
            }

            // Review S5 (35 jours / 5 semaines) — 2eme demande d'avis mi-cycle (design email)
            if (daysSincePaid >= 35 && daysSincePaid < 49 && !types.includes("peptidesReviewS5")) {
              const reportId = (order.metadata as any)?.peptidesReportId;
              if (reportId) {
                const trackingRecord = await storage.createEmailTracking(order.id, "peptidesReviewS5", email);
                const sent = await sendPeptidesReviewS5Email(email, reportId, baseUrl, trackingRecord.id);
                if (sent) {
                  peptidesReviewS5++;
                  await db.insert(emailTrackingTable).values({ email, emailType: "peptidesReviewS5", auditId: order.id, sentAt: new Date() }).catch(() => {});
                }
              }
            }

            // Review S12 (84 jours / 12 semaines) — 3eme demande d'avis fin de cycle (design email)
            if (daysSincePaid >= 84 && daysSincePaid < 98 && !types.includes("peptidesReviewS12")) {
              const reportId = (order.metadata as any)?.peptidesReportId;
              if (reportId) {
                const trackingRecord = await storage.createEmailTracking(order.id, "peptidesReviewS12", email);
                const sent = await sendPeptidesReviewS12Email(email, reportId, baseUrl, trackingRecord.id);
                if (sent) {
                  peptidesReviewS12++;
                  await db.insert(emailTrackingTable).values({ email, emailType: "peptidesReviewS12", auditId: order.id, sentAt: new Date() }).catch(() => {});
                }
              }
            }

            // S4 (28 jours) — Check-in: comment se passe le cycle?
            if (daysSincePaid >= 28 && daysSincePaid < 42 && !types.includes("peptidesS4")) {
              const sent = await sendCTAEmail(
                email,
                "Comment se passe ton cycle peptides?",
                `Salut,\n\nCa fait maintenant 4 semaines que tu as recu ton protocole Peptides Engine. Je voulais prendre de tes nouvelles.\n\nComment se passent les injections? As-tu rencontre des difficultes? Est-ce que tu sens deja des effets?\n\nN'oublie pas de faire ton bilan sanguin mi-cycle avec ton code Blood Analysis inclus dans ton rapport. C'est le moment ideal pour comparer avec ta baseline.\n\nSi tu as la moindre question sur ton protocole, reponds directement a cet email.\n\nAchzod`
              );
              if (sent) {
                peptidesS4++;
                await db.insert(emailTrackingTable).values({ email, emailType: "peptidesS4", auditId: order.id, sentAt: new Date() }).catch(() => {});
              }
            }

            // S8 (56 jours) — Fin de cycle + demande avis + incentive Blood Analysis
            if (daysSincePaid >= 56 && daysSincePaid < 70 && !types.includes("peptidesS8")) {
              const sent = await sendCTAEmail(
                email,
                "Fin de ton cycle - J'ai besoin de ton retour",
                `Salut,\n\nTon cycle de 8 semaines touche a sa fin. C'est le moment de faire le point.\n\nJ'ai 2 choses a te demander :\n\n1. TON BILAN SANGUIN\nAs-tu fait ton bilan mi-cycle avec ton code Blood Analysis? Si non, fais-le maintenant — c'est le seul moyen de mesurer l'impact reel de ton protocole sur tes marqueurs.\nAccede a Blood Analysis : https://apexlabs.achzodcoaching.com/offers/blood-analysis\n\n2. TON AVIS (30 secondes)\nTon retour m'aide enormement a ameliorer le service. En echange de ton avis, je t'offre 1 Blood Analysis supplementaire gratuite.\nLaisse ton avis ici : https://apexlabs.achzodcoaching.com/peptides/${order.id}#review\n\nSi tu veux un deuxieme cycle adapte a tes resultats, reponds directement a cet email.\n\n3. PARRAINAGE\nTu connais quelqu'un qui pourrait beneficier d'un protocole peptides? Envoie-lui ce lien et s'il achete, tu recois 1 Blood Analysis gratuite :\nhttps://apexlabs.achzodcoaching.com/offers/peptides-engine?ref=${encodeURIComponent(email)}\n\nAchzod`
              );
              if (sent) {
                peptidesS8++;
                await db.insert(emailTrackingTable).values({ email, emailType: "peptidesS8", auditId: order.id, sentAt: new Date() }).catch(() => {});
              }
            }

            // S12 (84 jours) — Coaching upsell ciblé + nouveau protocole
            if (daysSincePaid >= 84 && daysSincePaid < 100 && !types.includes("peptidesS12")) {
              const sent = await sendCTAEmail(
                email,
                "Tes resultats meritent un suivi",
                `Salut,\n\nCa fait 3 mois depuis ton protocole Peptides Engine. A ce stade, tu as probablement vu des resultats concrets — et c'est exactement la ou la plupart des gens stagnent.\n\nPourquoi? Parce qu'un protocole peptides sans suivi, c'est comme un plan d'entrainement sans coach. Ca marche au debut, puis tu plafonnes.\n\nC'est pour ca que je te propose 2 options pour continuer a progresser :\n\nOPTION 1 : COACHING ACHZOD\nUn suivi personnalise ou j'ajuste ton protocole en temps reel selon tes bilans sanguins, ta progression et tes objectifs. On travaille ensemble sur la nutrition, l'entrainement et la supplementation.\nFormule Essential (4 sem) : 249EUR\nFormule Elite (4 sem) : 399EUR\nDecouvrir : https://www.achzodcoaching.com/formules-coaching\n\nOPTION 2 : NOUVEAU PROTOCOLE\nSi tu veux juste un nouveau cycle avec de nouvelles molecules (objectif different, ajustements post-bilan), un nouveau Peptides Engine a 299EUR.\nCommander : https://apexlabs.achzodcoaching.com/offers/peptides-engine\n\nN'oublie pas : tu as encore tes codes Blood Analysis pour verifier tes marqueurs avant de demarrer un nouveau cycle.\n\nAchzod`
              );
              if (sent) {
                peptidesS12++;
                await db.insert(emailTrackingTable).values({ email, emailType: "peptidesS12", auditId: order.id, sentAt: new Date() }).catch(() => {});
              }
            }

            // S16 (112 jours) — Dernier rappel: Blood Analysis + coaching CTA
            if (daysSincePaid >= 112 && daysSincePaid < 130 && !types.includes("peptidesS16")) {
              const sent = await sendCTAEmail(
                email,
                "Tes 2 Blood Analyses t'attendent",
                `Salut,\n\nJe vois que tu n'as peut-etre pas encore utilise tes 2 codes Blood Analysis inclus dans ton protocole Peptides Engine.\n\nCes bilans sanguins sont essentiels pour mesurer l'impact de ton cycle sur tes marqueurs (IGF-1, glycemie, hormones, inflammation). Sans bilan, impossible de savoir si ton protocole a fonctionne.\n\nAccede a Blood Analysis : https://apexlabs.achzodcoaching.com/offers/blood-analysis\n\nEt si tu veux passer au niveau superieur avec un accompagnement coaching personnalise :\nhttps://www.achzodcoaching.com/formules-coaching\n\nJe suis dispo si tu as des questions.\n\nAchzod`
              );
              if (sent) {
                peptidesS16++;
                await db.insert(emailTrackingTable).values({ email, emailType: "peptidesS16", auditId: order.id, sentAt: new Date() }).catch(() => {});
              }
            }
          } catch (orderErr) {
            console.error(`[Cron] Peptides sequence error for order ${order.id}:`, orderErr);
          }
        }
      } catch (pepErr) {
        console.error("[Cron] Peptides sequences error:", pepErr);
      }

      // PEPTIDES ABANDON REMINDERS (J+1, J+3)
      let peptidesAbandonJ1 = 0, peptidesAbandonJ3 = 0;
      try {
        const pendingPeptides = allOrders.filter((o: any) => o.productType === "PEPTIDES_ENGINE" && o.status === "pending");
        for (const order of pendingPeptides) {
          const email = order.email;
          if (!email || email.includes("test") || email.includes("debug") || email.includes("achzodcoaching")) continue;

          // Skip if this email already has a paid peptides order
          const hasPaid = peptidesOrders.some((p: any) => p.email === email);
          if (hasPaid) continue;

          const createdAt = new Date(order.createdAt);
          const hoursSince = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
          if (hoursSince < 12 || hoursSince > 168) continue; // 12h-7 days window

          const { db } = await import("./db");
          const { emailTracking: emailTrackingTable } = await import("../shared/drizzle-schema");
          const { eq } = await import("drizzle-orm");
          const tracking = await db.select().from(emailTrackingTable).where(eq(emailTrackingTable.email, email));
          const types = tracking.map((t: any) => t.emailType);

          // J+1 (12-48h)
          if (hoursSince >= 12 && hoursSince < 48 && !types.includes("peptidesAbandonJ1")) {
            const sent = await sendCTAEmail(
              email,
              "Ton protocole peptides t'attend",
              `Salut,\n\nJ'ai vu que tu as commence le questionnaire Peptides Engine mais que tu n'as pas finalise.\n\nSi tu as eu un souci au paiement ou si tu as des questions, reponds directement a cet email.\n\nTon questionnaire est sauvegarde, tu peux reprendre ou tu en etais :\nhttps://apexlabs.achzodcoaching.com/offers/peptides-engine\n\nAchzod`
            );
            if (sent) {
              peptidesAbandonJ1++;
              await db.insert(emailTrackingTable).values({ email, emailType: "peptidesAbandonJ1", auditId: order.id, sentAt: new Date() }).catch(() => {});
            }
          }

          // J+3 (72-120h)
          if (hoursSince >= 72 && hoursSince < 120 && !types.includes("peptidesAbandonJ3")) {
            const sent = await sendCTAEmail(
              email,
              "Derniere chance : ton protocole peptides personnalise",
              `Salut,\n\nC'est Achzod. Tu as commence ton questionnaire Peptides Engine il y a quelques jours.\n\nJe sais que 299EUR c'est un investissement. Mais calcule : un seul vial de BPC-157 te coute 80EUR chez un revendeur. Avec ma source, c'est 9 dollars. En une seule commande tu economises plus que le prix du protocole.\n\nTon protocole inclut :\n- Dosages exacts ajustes a ton poids\n- Acces direct a ma source (60-90% moins cher)\n- Guide de reconstitution + injection complet\n- 2 bilans sanguins gratuits (198EUR de valeur)\n\nReprends ici : https://apexlabs.achzodcoaching.com/offers/peptides-engine\n\nSi tu as des questions, reponds a cet email.\n\nAchzod`
            );
            if (sent) {
              peptidesAbandonJ3++;
              await db.insert(emailTrackingTable).values({ email, emailType: "peptidesAbandonJ3", auditId: order.id, sentAt: new Date() }).catch(() => {});
            }
          }
        }
      } catch (abandonErr) {
        console.error("[Cron] Peptides abandon reminders error:", abandonErr);
      }

      (results as any).peptidesAbandonJ1 = peptidesAbandonJ1;
      (results as any).peptidesAbandonJ3 = peptidesAbandonJ3;
      (results as any).peptidesAutoGenerated = peptidesAutoGenerated;
      (results as any).peptidesReviewJ3 = peptidesReviewJ3;
      (results as any).peptidesReviewS5 = peptidesReviewS5;
      (results as any).peptidesReviewS12 = peptidesReviewS12;
      (results as any).peptidesS4 = peptidesS4;
      (results as any).peptidesS8 = peptidesS8;
      (results as any).peptidesS12 = peptidesS12;
      (results as any).peptidesS16 = peptidesS16;

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
      res.status(500).json({ success: false, error: "Erreur création données test" });
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
      const tracking = await storage.createEmailTracking(audit.id, emailType, audit.email);
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
        case "DISCOVERY_J14_COACHING":
          sent = await sendDiscoveryJ14CoachingEmail(audit.email, audit.id, baseUrl, tracking.id);
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
  app.post("/api/discovery-scan/analyze", discoveryLimiter, async (req, res) => {
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
        error: "Erreur analyse Discovery Scan"
      });
    }
  });

  // Create Discovery Scan audit and generate report
  app.post("/api/discovery-scan/create", discoveryLimiter, async (req, res) => {
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
        error: "Erreur création Discovery Scan"
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

      const generationStart = audit.createdAt ? new Date(audit.createdAt).getTime() : 0;
      const generationAgeMs = generationStart ? Date.now() - generationStart : 0;
      const isGenerating = audit.reportDeliveryStatus === "GENERATING";
      const isStaleGeneration = isGenerating && generationAgeMs > 12 * 60 * 1000;

      // If a regeneration is in progress, avoid serving stale reports (unless stale).
      if (isGenerating && !isStaleGeneration) {
        res.status(202).json({
          success: true,
          status: "generating",
          message: "Rapport en cours de generation",
        });
        return;
      }

      const existingReport = audit.narrativeReport as any;
      const hasInvalidScore =
        existingReport &&
        (typeof existingReport.globalScore !== "number" || existingReport.globalScore <= 2);
      const metricsEmpty =
        existingReport &&
        Array.isArray(existingReport.metrics) &&
        existingReport.metrics.length > 0 &&
        existingReport.metrics.every((metric: any) => !metric?.value || metric.value <= 0);
      const invalidReport = Boolean(hasInvalidScore || metricsEmpty);

      // If report already exists and is valid, return it immediately
      if (existingReport && !invalidReport) {
        res.json(existingReport);
        return;
      }

      // No report stored -> trigger a fresh generation in background
      // to avoid users getting stuck on "Analyse en cours".
      const shouldRegenerate = !isGenerating || isStaleGeneration;
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
        error: "Erreur récupération Discovery Scan"
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
      console.error("[Waitlist] Error:", error);
      res.status(500).json({ error: "Erreur serveur" });
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
      console.error("[SendPulse Admin] Error:", error);
      res.json({ success: false, error: "Erreur SendPulse" });
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
      console.error("[SendPulse Subscribers] Error:", error);
      res.json({ success: false, error: "Erreur SendPulse" });
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
      console.error("[DB Check] Error:", error);
      res.json({ success: false, error: "Erreur vérification base de données", hasDbUrl: true });
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
        // Migrate waitlist_subscribers
        await pool.query(`
          CREATE TABLE IF NOT EXISTS waitlist_subscribers (
            id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
            email VARCHAR(255) NOT NULL UNIQUE,
            source VARCHAR(50) NOT NULL DEFAULT 'apexlabs',
            sendpulse_synced TIMESTAMP,
            created_at TIMESTAMP DEFAULT NOW() NOT NULL
          );
        `);

        // Migrate email_tracking (DROP old schema first)
        await pool.query(`DROP TABLE IF EXISTS email_tracking CASCADE;`);

        await pool.query(`
          CREATE TABLE email_tracking (
            id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
            email_type VARCHAR(50) NOT NULL,
            recipient_email VARCHAR(255) NOT NULL,
            recipient_name VARCHAR(255),
            audit_id VARCHAR(36),
            audit_type VARCHAR(50),
            subject TEXT,
            preview_text TEXT,
            sendpulse_task_id VARCHAR(255),
            sendpulse_status VARCHAR(50),
            sendpulse_error TEXT,
            opened TIMESTAMP,
            clicked TIMESTAMP,
            converted TIMESTAMP,
            conversion_type VARCHAR(50),
            metadata JSONB,
            sent_at TIMESTAMP NOT NULL,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
          );
        `);

        // Create indexes
        await pool.query(`
          CREATE INDEX IF NOT EXISTS idx_email_tracking_recipient ON email_tracking(recipient_email);
          CREATE INDEX IF NOT EXISTS idx_email_tracking_audit ON email_tracking(audit_id);
          CREATE INDEX IF NOT EXISTS idx_email_tracking_sent_at ON email_tracking(sent_at);
          CREATE INDEX IF NOT EXISTS idx_email_tracking_status ON email_tracking(sendpulse_status);
        `);

        // Migrate cta_tracking
        await pool.query(`
          CREATE TABLE IF NOT EXISTS cta_tracking (
            id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
            email_tracking_id VARCHAR(36),
            event_type VARCHAR(50) NOT NULL,
            url TEXT,
            user_agent TEXT,
            ip_address VARCHAR(50),
            metadata JSONB,
            created_at TIMESTAMP DEFAULT NOW()
          );
        `);

        await pool.query(`
          CREATE INDEX IF NOT EXISTS idx_cta_tracking_email ON cta_tracking(email_tracking_id);
          CREATE INDEX IF NOT EXISTS idx_cta_tracking_event ON cta_tracking(event_type);
          CREATE INDEX IF NOT EXISTS idx_cta_tracking_created ON cta_tracking(created_at);
        `);

        res.json({ success: true, message: "Tables created/verified: waitlist_subscribers, email_tracking, cta_tracking" });
      } finally {
        await pool.end();
      }
    } catch (error: any) {
      console.error("[DB Migrate] Error:", error);
      res.json({ success: false, error: "Erreur migration base de données" });
    }
  });

  // ==================== KNOWLEDGE BASE ROUTES ====================
  registerKnowledgeRoutes(app);

  // ==================== BLOOD ANALYSIS ROUTES ====================
  registerBloodAnalysisRoutes(app);

  // ==================== BLOOD TESTS DASHBOARD ROUTES ====================
  registerBloodTestsRoutes(app);

  // ==================== STRIPE WEBHOOK ====================
  // Idempotency guard: track recently processed Stripe event IDs (TTL 1h)
  const processedWebhookEvents = new Map<string, number>();
  setInterval(() => {
    const cutoff = Date.now() - 60 * 60 * 1000;
    for (const [id, ts] of processedWebhookEvents) {
      if (ts < cutoff) processedWebhookEvents.delete(id);
    }
  }, 10 * 60 * 1000).unref();

  app.post("/api/stripe/webhook", async (req, res) => {
    const sig = req.headers["stripe-signature"];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret || !sig) {
      res.status(400).json({ error: "Missing webhook configuration" });
      return;
    }

    let event: any;
    try {
      const stripe = await getUncachableStripeClient();
      event = stripe.webhooks.constructEvent(req.rawBody as string | Buffer, sig as string, webhookSecret);
    } catch (err: any) {
      console.error("[Webhook] Signature verification failed:", err.message);
      res.status(400).json({ error: "Invalid signature" });
      return;
    }

    // Idempotency: skip already-processed events
    if (processedWebhookEvents.has(event.id)) {
      console.log(`[Webhook] Skipping duplicate event ${event.id}`);
      res.json({ received: true });
      return;
    }

    try {
      switch (event.type) {
        case "checkout.session.completed": {
          const session = event.data.object;
          const order = await storage.getOrderByStripeSession(session.id);
          if (order && order.status === "pending") {
            await storage.updateOrder(order.id, {
              status: "paid",
              paidAt: new Date(),
              stripePaymentIntentId: session.payment_intent || null,
              stripeCustomerId: session.customer || null,
            });
            console.log(`[Webhook] Order ${order.id} marked as paid via webhook`);

            // Admin notification for PAID orders
            try {
              const clientEmail = session.customer_details?.email || session.customer_email || order.email;
              const clientName = session.customer_details?.name || clientEmail?.split("@")[0] || "Client";
              const planLabel = order.productType === "PREMIUM" ? "Anabolic Bioscan (59EUR)" :
                               order.productType === "ELITE" ? "Ultimate Scan (79EUR)" :
                               order.productType === "BLOOD_ANALYSIS" ? "Blood Analysis (99EUR)" : order.productName;
              const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || "coaching@achzodcoaching.com";
              const amount = (order.finalAmountCents / 100).toFixed(2);

              await sendCTAEmail(
                adminEmail,
                `PAIEMENT ${amount}EUR — ${planLabel} — ${clientName}`,
                `PAIEMENT RECU!\n\nProduit: ${planLabel}\nClient: ${clientName}\nEmail: ${clientEmail}\nMontant: ${amount}EUR\nPromo: ${order.promoCode || "aucun"}\n\nOrder ID: ${order.id}`
              );
              console.log(`[Webhook] Admin payment notification sent for order ${order.id}`);
            } catch (notifErr) {
              console.error(`[Webhook] Admin payment notification failed:`, notifErr);
            }

            // Send confirmation email to client (Stripe webhook = payment confirmed)
            try {
              const clientEmail2 = session.customer_details?.email || session.customer_email || order.email;
              const clientName2 = session.customer_details?.name || clientEmail2?.split("@")[0] || "Client";
              const promoByType2: Record<string, { code: string; label: string }> = {
                ELITE: { code: "ULTIMATE79", label: "79€ deduits de ton coaching Elite/Private Lab 8 ou 12 semaines" },
                PREMIUM: { code: "ANABOLIC59", label: "59€ deduits de ton coaching Elite/Private Lab 8 ou 12 semaines" },
                BLOOD_ANALYSIS: { code: "BLOOD99", label: "99€ deduits de ton coaching Elite/Private Lab 8 ou 12 semaines" },
                PEPTIDES_ENGINE: { code: "PEPTIDES150", label: "150€ deduits de ton coaching Elite/Private Lab 8 ou 12 semaines" },
              };
              const promo2 = promoByType2[order.productType];
              const prodLabel2 = order.productType === "ELITE" ? "Ultimate Scan" : order.productType === "PREMIUM" ? "Anabolic Bioscan" : order.productType === "BLOOD_ANALYSIS" ? "Blood Analysis" : order.productType === "PEPTIDES_ENGINE" ? "Peptides Engine" : order.productName;
              if (["ELITE", "PREMIUM", "BLOOD_ANALYSIS", "PEPTIDES_ENGINE"].includes(order.productType)) {
                const isPeptides = order.productType === "PEPTIDES_ENGINE";
                const isBlood = order.productType === "BLOOD_ANALYSIS";
                let msg: string;
                if (isBlood) {
                  msg = `Salut ${clientName2},\n\nMerci pour ta commande Blood Analysis. Ton paiement est bien recu.\n\nVoici la liste des marqueurs a demander a ton medecin ou directement au laboratoire :\n\nPANEL 1 : HORMONES\nTestosterone totale, Testosterone libre, SHBG, Cortisol, DHEA-S, IGF-1, LH, FSH, Estradiol\n\nPANEL 2 : THYROIDE\nTSH, T3 libre, T4 libre, Anti-TPO\n\nPANEL 3 : METABOLISME\nGlycemie a jeun, HbA1c, Insuline a jeun, Cholesterol total, HDL, LDL, Triglycerides, ApoB\n\nPANEL 4 : INFLAMMATION\nCRP ultra-sensible, Ferritine, Homocysteine\n\nPANEL 5 : VITAMINES\nVitamine D, Vitamine B12, Magnesium, Zinc\n\nPANEL 6 : FOIE ET REINS\nALAT, ASAT, Gamma-GT, Creatinine, DFG\n\n+ NFS complete\n\nPresente-toi dans n'importe quel labo avec cette liste. La plupart acceptent sans ordonnance. Sinon, ton generaliste te fait l'ordonnance.\n\nUne fois ta prise de sang faite, uploade ton PDF sur : https://apexlabs.achzodcoaching.com/blood-analysis\n\n${promo2 ? `Ton code promo : ${promo2.code}\n${promo2.label}\nachzodcoaching.com/formules-coaching\n\n` : ""}Achzod`;
                } else {
                  const deliveryMsg = isPeptides
                    ? "Ton protocole est en cours de generation. Tu le recevras par email dans les prochaines minutes."
                    : "Ton rapport est en cours de generation. Tu le recevras par email d'ici 24h.";
                  msg = `Salut ${clientName2},\n\nMerci pour ta commande ${prodLabel2}. Ton paiement est bien recu.\n\n${deliveryMsg}\n\n${promo2 ? `Ton code promo : ${promo2.code}\n${promo2.label}\nachzodcoaching.com/formules-coaching\n\n` : ""}Si tu as des questions, reponds directement a cet email.\n\nAchzod`;
                }
                sendCTAEmail(clientEmail2!, `${prodLabel2} : commande recue`, msg).catch(() => {});
              }
            } catch {}

            // ✅ FIX: Create audit automatically in webhook (prevents missing audits)
            const email = session.customer_details?.email || session.customer_email || session.metadata?.email || order.email;
            const planType = order.productType;

            // REFERRAL: if this order has a referrer, reward them with 1 Blood Analysis credit
            const referrerEmail = session.metadata?.referrer;
            if (referrerEmail && referrerEmail.includes("@") && planType === "PEPTIDES_ENGINE") {
              try {
                let referrerUser = await storage.getUserByEmail(referrerEmail);
                if (!referrerUser) {
                  referrerUser = await storage.createUser({ email: referrerEmail, credits: 1 });
                } else {
                  await pool.query("UPDATE users SET credits = credits + 1 WHERE email = $1", [referrerEmail]);
                }
                console.log(`[Webhook] ✅ Referral reward: +1 Blood credit for ${referrerEmail} (referred by ${email})`);
                // Notify the referrer
                await sendCTAEmail(
                  referrerEmail,
                  "Tu as gagne 1 Blood Analysis gratuite !",
                  `Bonne nouvelle !\n\nQuelqu'un a achete Peptides Engine grace a ton lien de parrainage. Tu recois 1 Blood Analysis gratuite en recompense.\n\nAccede a Blood Analysis : https://apexlabs.achzodcoaching.com/offers/blood-analysis\n\nMerci pour ta confiance.\n\nAchzod`
                ).catch(() => {});
              } catch (refErr) {
                console.error(`[Webhook] Referral error:`, refErr);
              }
            }

            // Peptides Engine: add 2 blood credits directly on payment
            if (email && planType === "PEPTIDES_ENGINE") {
              try {
                let user = await storage.getUserByEmail(email);
                if (!user) {
                  user = await storage.createUser({ email, credits: 2 });
                  console.log(`[Webhook] ✅ Created user ${email} with 2 blood credits (Peptides Engine)`);
                } else {
                  await pool.query("UPDATE users SET credits = credits + 2 WHERE email = $1", [email]);
                  console.log(`[Webhook] ✅ +2 blood credits for ${email} (Peptides Engine)`);
                }
              } catch (creditErr) {
                console.error(`[Webhook] Peptides blood credit error:`, creditErr);
              }
            }

            // Blood Analysis: add +1 credit on payment
            if (email && planType === "BLOOD_ANALYSIS") {
              try {
                let user = await storage.getUserByEmail(email);
                if (!user) {
                  user = await storage.createUser({ email, credits: 1 });
                  console.log(`[Webhook] ✅ Created user ${email} with 1 blood credit`);
                } else {
                  await pool.query("UPDATE users SET credits = credits + 1 WHERE email = $1", [email]);
                  console.log(`[Webhook] ✅ +1 blood credit for ${email}`);
                }
              } catch (creditErr) {
                console.error(`[Webhook] Blood credit update failed:`, creditErr);
              }
            }

            // Peptides Engine: DO NOT generate here — setInterval handles it
            // Generating in webhook causes double reports (webhook + setInterval race condition)
            if (email && planType === "PEPTIDES_ENGINE") {
              console.log(`[Webhook] Peptides Engine paid for ${email} — setInterval will generate`);
            }

            if (email && planType && !order.auditId && ["GRATUIT", "PREMIUM", "ELITE"].includes(planType)) {
              console.log(`[Webhook] Creating audit automatically for order ${order.id} (${email}, ${planType})`);

              try {
                const progress = await storage.getProgress(email);
                let responses = progress?.responses as Record<string, unknown> | string | undefined;

                if (typeof responses === "string") {
                  try { responses = JSON.parse(responses); } catch { responses = undefined; }
                }

                if (responses && Object.keys(responses).length > 0) {
                  // Check for 3 photos if ELITE
                  if (planType === "ELITE" && !hasThreePhotos(responses as Record<string, unknown>)) {
                    console.warn(`[Webhook] ⚠️  3 photos obligatoires pour Ultimate Scan: ${email}`);
                  } else {
                    // Create audit
                    const audit = await storage.createAudit({
                      userId: "",
                      type: planType as any,
                      email,
                      responses: responses as Record<string, unknown>,
                    });

                    // Link order to audit
                    await storage.claimOrderForAudit(order.id, audit.id);

                    // Clean up questionnaire progress
                    await storage.deleteProgress(email).catch(() => {});

                    console.log(`[Webhook] ✅ Audit ${audit.id} created automatically for order ${order.id}`);
                  }
                } else {
                  console.warn(`[Webhook] ⚠️  No questionnaire data found for ${email}, audit not created`);
                }
              } catch (auditError) {
                console.error(`[Webhook] ❌ Failed to create audit for order ${order.id}:`, auditError);
                // Don't fail the webhook, just log the error
              }
            }
          }
          break;
        }
        case "charge.refunded": {
          const charge = event.data.object;
          const paymentIntentId = charge.payment_intent;
          if (paymentIntentId) {
            const order = await storage.getOrderByPaymentIntent(paymentIntentId);
            if (order && order.status !== "refunded") {
              const refundedAmount = charge.amount_refunded || 0;
              const isFullRefund = refundedAmount >= order.finalAmountCents;
              await storage.updateOrder(order.id, {
                status: isFullRefund ? "refunded" : "partial_refund",
                refundAmountCents: refundedAmount,
                refundedAt: new Date(),
              });
              console.log(`[Webhook] Order ${order.id} refund processed via webhook`);
            }
          }
          break;
        }
        case "checkout.session.expired": {
          const session = event.data.object;
          const order = await storage.getOrderByStripeSession(session.id);
          if (order && order.status === "pending") {
            await storage.updateOrder(order.id, { status: "cancelled" });
            console.log(`[Webhook] Order ${order.id} cancelled (session expired)`);
          }
          break;
        }
      }
      // Mark as processed AFTER successful handling (allows retry on failure)
      processedWebhookEvents.set(event.id, Date.now());
      res.json({ received: true });
    } catch (error) {
      console.error("[Webhook] Processing error:", error);
      res.status(500).json({ error: "Webhook processing failed" });
    }
  });

  // ==================== ADMIN CSV EXPORT ====================
  app.get("/api/admin/orders/export/csv", async (req, res) => {
    if (!requireAdminAuth(req, res)) return;
    try {
      const { orders } = await storage.getAllOrders({ limit: 50000 });
      const header = "id,email,product_type,product_name,amount_cents,discount_cents,final_amount_cents,promo_code,status,refund_amount_cents,refund_reason,audit_id,created_at,paid_at\n";
      const rows = orders.map(o => {
        const escape = (v: string | null | undefined) => {
          if (v == null) return "";
          return `"${String(v).replace(/"/g, '""')}"`;
        };
        return [
          o.id, escape(o.email), o.productType, escape(o.productName),
          o.amountCents, o.discountCents, o.finalAmountCents,
          escape(o.promoCode), o.status, o.refundAmountCents,
          escape(o.refundReason), o.auditId || "",
          o.createdAt ? new Date(o.createdAt).toISOString() : "",
          o.paidAt ? new Date(o.paidAt).toISOString() : "",
        ].join(",");
      }).join("\n");

      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="neurocore-orders-${new Date().toISOString().split("T")[0]}.csv"`);
      res.send(header + rows);
    } catch (error) {
      console.error("[Admin CSV] Error:", error);
      res.status(500).json({ error: "Erreur export CSV" });
    }
  });

  // ==================== ADMIN CLEANUP EXPIRED ORDERS ====================
  app.post("/api/admin/orders/cleanup-expired", async (req, res) => {
    if (!requireAdminAuth(req, res)) return;
    try {
      const { orders } = await storage.getAllOrders({ limit: 10000, status: "pending" as any });
      const cutoff = Date.now() - 24 * 60 * 60 * 1000;
      let cancelled = 0;
      for (const order of orders) {
        if (new Date(order.createdAt).getTime() < cutoff) {
          await storage.updateOrder(order.id, { status: "cancelled" });
          cancelled++;
        }
      }
      res.json({ success: true, cancelled, checked: orders.length });
    } catch (error) {
      console.error("[Admin Cleanup] Error:", error);
      res.status(500).json({ error: "Erreur nettoyage" });
    }
  });

  // ==================== ADMIN RECONCILE MISSING AUDITS ====================
  app.post("/api/admin/reconcile-missing-audits", async (req, res) => {
    if (!requireAdminAuth(req, res)) return;

    try {
      console.log("[Reconcile] 🔍 Recherche commandes payées sans audit...");

      const result = await pool.query(`
        SELECT o.id, o.email, o.product_type, o.created_at
        FROM orders o
        WHERE o.status = 'paid'
          AND o.audit_id IS NULL
          AND o.product_type IN ('GRATUIT', 'PREMIUM', 'ELITE')
          AND o.created_at >= '2026-03-17'
        ORDER BY o.created_at ASC
      `);

      const ordersToReconcile = result.rows;
      console.log(`[Reconcile] 📊 Trouvé ${ordersToReconcile.length} commandes sans audit`);

      let created = 0;
      let failed = 0;
      let noData = 0;
      let needPhotos = 0;
      const errors: Array<{ orderId: string; email: string; error: string }> = [];

      for (const row of ordersToReconcile) {
        const progress = await storage.getProgress(row.email);

        let responses = progress?.responses as Record<string, unknown> | string | undefined;
        if (typeof responses === "string") {
          try { responses = JSON.parse(responses); } catch { responses = undefined; }
        }

        if (!responses || Object.keys(responses).length === 0) {
          console.warn(`[Reconcile] ⚠️  Pas de données questionnaire pour ${row.email}`);
          noData++;
          errors.push({ orderId: row.id, email: row.email, error: "QUESTIONNAIRE_MISSING" });
          continue;
        }

        // Check for 3 photos if ELITE
        if (row.product_type === "ELITE" && !hasThreePhotos(responses as Record<string, unknown>)) {
          console.warn(`[Reconcile] ⚠️  3 photos obligatoires pour Ultimate Scan: ${row.email}`);
          needPhotos++;
          errors.push({ orderId: row.id, email: row.email, error: "NEED_PHOTOS" });
          continue;
        }

        try {
          // Create audit
          const audit = await storage.createAudit({
            userId: "",
            type: row.product_type,
            email: row.email,
            responses: responses as Record<string, unknown>,
          });

          // Link order to audit
          await storage.claimOrderForAudit(row.id, audit.id);

          // Clean up questionnaire progress
          await storage.deleteProgress(row.email).catch(() => {});

          console.log(`[Reconcile] ✅ Audit ${audit.id} créé pour commande ${row.id} (${row.email})`);
          created++;

        } catch (err) {
          console.error(`[Reconcile] ❌ Erreur pour commande ${row.id}:`, err);
          failed++;
          errors.push({
            orderId: row.id,
            email: row.email,
            error: err instanceof Error ? err.message : String(err)
          });
        }
      }

      const summary = {
        success: true,
        totalFound: ordersToReconcile.length,
        created,
        failed,
        noData,
        needPhotos,
        errors: errors.slice(0, 50), // Limit to first 50 errors
      };

      console.log(`[Reconcile] 📈 RÉSUMÉ:`, summary);
      res.json(summary);

    } catch (error) {
      console.error("[Reconcile] Erreur fatale:", error);
      res.status(500).json({
        success: false,
        error: "Erreur reconciliation",
        message: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // ==================== RECOVER LOST AUDITS ====================
  app.post("/api/admin/recover-lost-audits", async (req, res) => {
    if (!requireAdminAuth(req, res)) return;

    try {
      console.log("[Recover] 🔍 Recherche audits perdus...");

      // Find orders with audit_id but no corresponding audit in audits table
      const result = await pool.query(`
        SELECT
          o.id as order_id,
          o.email,
          o.product_type,
          o.audit_id,
          o.created_at
        FROM orders o
        LEFT JOIN audits a ON o.audit_id = a.id
        WHERE o.status = 'paid'
          AND o.audit_id IS NOT NULL
          AND a.id IS NULL
          AND o.product_type IN ('GRATUIT', 'PREMIUM', 'ELITE')
          AND o.created_at >= '2026-03-17'
        ORDER BY o.created_at ASC
      `);

      const missingOrders = result.rows;
      console.log(`[Recover] 📊 Trouvé ${missingOrders.length} audits perdus`);

      let recovered = 0;
      let noData = 0;
      let needPhotos = 0;
      let alreadyExists = 0;
      const errors: Array<{ email: string; orderId: string; reason: string }> = [];

      for (const order of missingOrders) {
        const progress = await storage.getProgress(order.email);
        let responses = progress?.responses as Record<string, unknown> | string | undefined;

        if (typeof responses === "string") {
          try { responses = JSON.parse(responses); } catch { responses = undefined; }
        }

        if (!responses || Object.keys(responses).length === 0) {
          console.warn(`[Recover] ⚠️  ${order.email} - Pas de données questionnaire`);
          noData++;
          errors.push({ email: order.email, orderId: order.order_id, reason: "NO_QUESTIONNAIRE_DATA" });
          continue;
        }

        // Check for 3 photos if ELITE
        if (order.product_type === "ELITE" && !hasThreePhotos(responses as Record<string, unknown>)) {
          console.warn(`[Recover] 📸 ${order.email} - Photos manquantes`);
          needPhotos++;
          errors.push({ email: order.email, orderId: order.order_id, reason: "NEED_3_PHOTOS" });
          continue;
        }

        try {
          // Recreate audit with ORIGINAL audit_id from order!
          const insertResult = await pool.query(`
            INSERT INTO audits (id, user_id, type, email, responses, created_at, updated_at, report_delivery_status)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            ON CONFLICT (id) DO NOTHING
            RETURNING id
          `, [
            order.audit_id,
            "",
            order.product_type,
            order.email,
            JSON.stringify(responses),
            order.created_at,
            new Date(),
            "PENDING"
          ]);

          if (insertResult.rows.length > 0) {
            console.log(`[Recover] ✅ ${order.email} - Audit ${order.audit_id} récupéré !`);
            recovered++;

            // Clean up questionnaire progress
            await storage.deleteProgress(order.email).catch(() => {});
          } else {
            console.log(`[Recover] ⚠️  ${order.email} - Audit ${order.audit_id} déjà existant`);
            alreadyExists++;
          }

        } catch (err) {
          console.error(`[Recover] ❌ ${order.email} - Erreur:`, err);
          errors.push({
            email: order.email,
            orderId: order.order_id,
            reason: err instanceof Error ? err.message : String(err)
          });
        }
      }

      const summary = {
        success: true,
        totalFound: missingOrders.length,
        recovered,
        noData,
        needPhotos,
        alreadyExists,
        errors: errors.slice(0, 50),
      };

      console.log(`[Recover] 📈 RÉSUMÉ:`, summary);
      res.json(summary);

    } catch (error) {
      console.error("[Recover] Erreur fatale:", error);
      res.status(500).json({
        success: false,
        error: "Erreur récupération audits",
        message: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // ==================== DEBUG MISSING AUDITS ====================
  app.get("/api/admin/debug-missing-audits", async (req, res) => {
    if (!requireAdminAuth(req, res)) return;

    try {
      // Sample 10 orders with audit_id
      const orders = await pool.query(`
        SELECT id, email, audit_id, product_type, created_at
        FROM orders
        WHERE status = 'paid'
          AND audit_id IS NOT NULL
          AND created_at >= '2026-03-17'
        ORDER BY created_at ASC
        LIMIT 10
      `);

      const debug = [];
      for (const order of orders.rows) {
        // Check if audit exists
        const auditCheck = await pool.query(`
          SELECT id, report_delivery_status
          FROM audits
          WHERE id = $1
        `, [order.audit_id]);

        debug.push({
          order_id: order.id,
          email: order.email,
          audit_id: order.audit_id,
          audit_exists: auditCheck.rows.length > 0,
          audit_status: auditCheck.rows[0]?.report_delivery_status || null,
          created_at: order.created_at
        });
      }

      // Also run the LEFT JOIN query
      const leftJoinResult = await pool.query(`
        SELECT COUNT(*) as count
        FROM orders o
        LEFT JOIN audits a ON o.audit_id = a.id
        WHERE o.status = 'paid'
          AND o.audit_id IS NOT NULL
          AND a.id IS NULL
          AND o.product_type IN ('GRATUIT', 'PREMIUM', 'ELITE')
          AND o.created_at >= '2026-03-17'
      `);

      res.json({
        success: true,
        sample_orders: debug,
        left_join_count: parseInt(leftJoinResult.rows[0].count),
        total_orders_checked: orders.rows.length
      });
    } catch (error) {
      console.error("[Debug] Error:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // ==================== GDPR DATA DELETION ====================
  app.post("/api/admin/gdpr/delete-user-data", async (req, res) => {
    if (!requireAdminAuth(req, res)) return;
    try {
      const { email } = req.body;
      if (!email || typeof email !== "string") {
        res.status(400).json({ error: "Email requis" });
        return;
      }
      const normalizedEmail = email.trim().toLowerCase();
      const deleted: Record<string, number> = {};

      // Delete across all tables with email column
      const tables = [
        "audits", "orders", "blood_reports", "blood_tests",
        "reviews", "email_tracking", "questionnaire_progress",
        "burnout_progress", "burnout_reports",
        "magic_tokens", "promo_code_usages",
      ];
      for (const table of tables) {
        try {
          const result = await pool.query(
            `DELETE FROM ${table} WHERE LOWER(email) = $1`,
            [normalizedEmail]
          );
          deleted[table] = result.rowCount ?? 0;
        } catch {
          // Table may not exist — skip
        }
      }

      // Delete user record
      try {
        const result = await pool.query(
          `DELETE FROM users WHERE LOWER(email) = $1`,
          [normalizedEmail]
        );
        deleted.users = result.rowCount ?? 0;
      } catch {
        // users table may not exist
      }

      console.log(`[GDPR] Deleted data for ${normalizedEmail}:`, deleted);
      res.json({ success: true, email: normalizedEmail, deleted });
    } catch (error) {
      console.error("[GDPR] Deletion error:", error);
      res.status(500).json({ error: "Erreur suppression GDPR" });
    }
  });

  // ==================== EMAIL STATS DEBUG: unique recipients ====================
  app.get("/api/admin/email-stats/debug", async (req, res) => {
    if (!requireAdminAuth(req, res)) return;
    try {
      const { Pool } = await import("pg");
      const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
      if (!databaseUrl) { res.json({ error: "no db" }); return; }
      const pool = new Pool({
        connectionString: databaseUrl,
        ssl: databaseUrl.includes("render.com") ? { rejectUnauthorized: false } : false,
      });
      try {
        // Total rows
        const total = await pool.query("SELECT COUNT(*) as c FROM email_tracking");
        // Reports only (subject contains 'est pret')
        const reports = await pool.query("SELECT COUNT(*) as c FROM email_tracking WHERE LOWER(subject) LIKE '%est pret%'");
        // UNIQUE recipients with reports
        const uniqueReports = await pool.query("SELECT COUNT(DISTINCT recipient_email) as c FROM email_tracking WHERE LOWER(subject) LIKE '%est pret%'");
        // All email types breakdown
        const byType = await pool.query("SELECT email_type, COUNT(*) as c FROM email_tracking GROUP BY email_type ORDER BY c DESC");
        // Top duplicated recipients (reports only)
        const dupes = await pool.query(`
          SELECT recipient_email, COUNT(*) as c
          FROM email_tracking
          WHERE LOWER(subject) LIKE '%est pret%'
          GROUP BY recipient_email
          HAVING COUNT(*) > 1
          ORDER BY c DESC
          LIMIT 10
        `);
        // Unique recipients per audit_type
        const uniqueByAuditType = await pool.query(`
          SELECT audit_type, COUNT(DISTINCT recipient_email) as c
          FROM email_tracking
          WHERE LOWER(subject) LIKE '%est pret%'
          GROUP BY audit_type
        `);

        res.json({
          totalRows: parseInt(total.rows[0].c),
          totalReportEmails: parseInt(reports.rows[0].c),
          uniqueRecipientsWithReports: parseInt(uniqueReports.rows[0].c),
          emailTypeBreakdown: byType.rows.map((r: any) => ({ type: r.email_type, count: parseInt(r.c) })),
          duplicatedRecipients: dupes.rows.map((r: any) => ({ email: r.recipient_email, count: parseInt(r.c) })),
          uniqueByAuditType: uniqueByAuditType.rows.map((r: any) => ({ type: r.audit_type, count: parseInt(r.c) })),
        });
      } finally { await pool.end(); }
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  // ==================== EMAIL STATS (from DB email_tracking) ====================
  app.get("/api/admin/email-stats", async (req, res) => {
    if (!requireAdminAuth(req, res)) return;

    try {
      const { getEmailTrackingStats } = await import("./emailTracking.js");

      // Get stats from our own DB (fast, reliable)
      const stats = await getEmailTrackingStats();

      // Get pending/ready from audits
      const allAudits = await storage.getAllAudits();
      const pending = allAudits.filter(a => a.reportDeliveryStatus === 'SCHEDULED').length;
      const ready = allAudits.filter(a => a.reportDeliveryStatus === 'READY').length;

      // Count reports specifically (emailType = sendReportReadyEmail)
      const { db } = await import("./db.js");
      const { emailTracking: emailTrackingTable } = await import("../shared/drizzle-schema.js");
      const allEmails = await db.select().from(emailTrackingTable);

      const reportEmails = allEmails.filter(e =>
        e.emailType === "sendReportReadyEmail" ||
        (e.subject || "").toLowerCase().includes("est pret") ||
        (e.subject || "").toLowerCase().includes("est prêt")
      );

      // Deduplicate: count unique recipients only
      const uniqueRecipients = new Map<string, typeof reportEmails[0]>();
      reportEmails.forEach(e => {
        const email = (e.recipientEmail || "").toLowerCase().trim();
        if (!uniqueRecipients.has(email)) {
          uniqueRecipients.set(email, e);
        }
      });

      const byType: Record<string, number> = {
        GRATUIT: 0,
        PREMIUM: 0,
        ELITE: 0,
        BLOOD_ANALYSIS: 0,
      };

      uniqueRecipients.forEach(e => {
        const type = e.auditType || "GRATUIT";
        byType[type] = (byType[type] || 0) + 1;
      });

      const now = Date.now();
      const last24h = now - 24 * 60 * 60 * 1000;
      const last7d = now - 7 * 24 * 60 * 60 * 1000;

      const uniqueArr = Array.from(uniqueRecipients.values());
      const totalUnique = uniqueArr.length;

      const last24hCount = uniqueArr.filter(e =>
        e.sentAt && new Date(e.sentAt).getTime() >= last24h
      ).length;

      const last7dCount = uniqueArr.filter(e =>
        e.sentAt && new Date(e.sentAt).getTime() >= last7d
      ).length;

      const delivered = uniqueArr.filter(e => e.sendpulseStatus === 'success').length;
      const failed = uniqueArr.filter(e => e.sendpulseStatus === 'failed').length;

      res.json({
        success: true,
        source: "Database",
        stats: {
          totalSent: totalUnique,
          delivered,
          failed,
          pending,
          ready,
          sent: totalUnique,
          byType,
          last24h: last24hCount,
          last7d: last7dCount,
          deliveryRate: totalUnique > 0
            ? ((delivered / totalUnique) * 100).toFixed(1)
            : '0.0',
          totalTracked: allEmails.length,
          openRate: stats.openRate.toFixed(1),
          clickRate: stats.clickRate.toFixed(1),
        }
      });

    } catch (error) {
      console.error("[EmailStats] Error:", error);
      res.status(500).json({
        success: false,
        error: "Erreur stats emails",
        message: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // ==================== BACKFILL: Sync SendPulse → email_tracking ====================
  app.post("/api/admin/backfill-email-tracking", async (req, res) => {
    if (!requireAdminAuth(req, res)) return;

    try {
      const SENDPULSE_USER_ID = process.env.SENDPULSE_USER_ID;
      const SENDPULSE_SECRET = process.env.SENDPULSE_SECRET;

      if (!SENDPULSE_USER_ID || !SENDPULSE_SECRET) {
        res.json({ success: false, error: "SendPulse credentials not configured" });
        return;
      }

      // 1. Get token
      const tokenRes = await fetch("https://api.sendpulse.com/oauth/access_token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grant_type: "client_credentials",
          client_id: SENDPULSE_USER_ID,
          client_secret: SENDPULSE_SECRET,
        }),
      });

      if (!tokenRes.ok) throw new Error("SendPulse auth failed");
      const { access_token: accessToken } = await tokenRes.json();

      // 2. Fetch ALL emails from SendPulse with pagination
      const since = "2026-03-17T00:00:00Z";
      let allEmails: any[] = [];
      let offset = 0;

      while (true) {
        const r = await fetch(
          `https://api.sendpulse.com/smtp/emails?limit=100&offset=${offset}&from_date=${since}`,
          { headers: { "Authorization": `Bearer ${accessToken}` } }
        );
        if (!r.ok) break;
        const data = await r.json();
        const batch = Array.isArray(data) ? data : (data.data || []);
        if (batch.length === 0) break;
        allEmails = allEmails.concat(batch);
        offset += 100;
      }

      console.log(`[Backfill] Fetched ${allEmails.length} emails from SendPulse`);

      // 3. Filter ONLY ApexLabs emails (by subject keywords)
      const apexEmails = allEmails.filter((e: any) => {
        const subject = (e.subject || "").toLowerCase();
        return (
          subject.includes("est pret") || subject.includes("est prêt") ||  // reports
          subject.includes("discovery scan") || subject.includes("anabolic") ||
          subject.includes("ultimate scan") || subject.includes("blood analysis") ||
          subject.includes("questionnaire") || subject.includes("apex") ||
          subject.includes("relance") || subject.includes("rapport")
        );
      });

      console.log(`[Backfill] Filtered to ${apexEmails.length} ApexLabs emails`);

      // 4. Clear old imported data and insert fresh
      const { Pool } = await import("pg");
      const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
      if (!databaseUrl) throw new Error("DATABASE_URL not configured");

      const pool = new Pool({
        connectionString: databaseUrl,
        ssl: databaseUrl.includes("render.com") || databaseUrl.includes("neon.tech")
          ? { rejectUnauthorized: false } : false,
      });

      try {
        // Clear old data
        await pool.query("DELETE FROM email_tracking");
        console.log("[Backfill] Cleared old email_tracking data");

        // Determine emailType from subject
        function getEmailType(subject: string): string {
          const s = subject.toLowerCase();
          if (s.includes("est pret") || s.includes("est prêt")) return "sendReportReadyEmail";
          if (s.includes("questionnaire") || s.includes("terminé") || s.includes("relance")) return "sendAbandonmentReminder";
          if (s.includes("upgrade") || s.includes("découv") || s.includes("offre")) return "sendCTAEmail";
          return "other";
        }

        // Determine auditType from subject
        function getAuditType(subject: string): string | null {
          const s = subject.toLowerCase();
          if (s.includes("blood")) return "BLOOD_ANALYSIS";
          if (s.includes("ultimate")) return "ELITE";
          if (s.includes("anabolic")) return "PREMIUM";
          if (s.includes("discovery")) return "GRATUIT";
          return null;
        }

        let inserted = 0;
        let skipped = 0;

        for (const email of apexEmails) {
          const recipient = (email.recipient || "").toLowerCase().trim();
          if (!recipient || recipient.includes("achkou@") || recipient.includes("test@") || recipient.includes("achzod")) {
            skipped++;
            continue;
          }

          // Skip emails before launch date (17 mars 2026)
          const sentDate = email.send_date ? new Date(email.send_date) : null;
          if (!sentDate || sentDate < new Date("2026-03-17T00:00:00Z")) {
            skipped++;
            continue;
          }

          const subject = email.subject || "";
          const emailType = getEmailType(subject);
          const auditType = getAuditType(subject);
          const sentAt = email.send_date ? new Date(email.send_date) : new Date();
          const code = parseInt(String(email.smtp_answer_code || 0));
          const status = (code >= 200 && code < 300) ? "success" : "failed";

          try {
            await pool.query(
              `INSERT INTO email_tracking (id, email_type, recipient_email, subject, audit_type, sendpulse_status, sent_at, created_at)
               VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, NOW())`,
              [emailType, recipient, subject, auditType, status, sentAt]
            );
            inserted++;
          } catch (err) {
            skipped++;
          }
        }

        console.log(`[Backfill] Done: ${inserted} inserted, ${skipped} skipped`);

        res.json({
          success: true,
          totalFetched: allEmails.length,
          apexLabsEmails: apexEmails.length,
          inserted,
          skipped,
        });
      } finally {
        await pool.end();
      }

    } catch (error) {
      console.error("[Backfill] Error:", error);
      res.status(500).json({
        success: false,
        error: "Erreur backfill",
        message: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // ==================== EXPORT CSV COMPLET (pour Google Sheets) ====================
  app.get("/api/admin/export-csv", async (req, res) => {
    if (!requireAdminAuth(req, res)) return;

    try {
      const { Pool } = await import("pg");
      const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;

      if (!databaseUrl) {
        res.status(500).json({ error: 'DATABASE_URL not configured' });
        return;
      }

      const pool = new Pool({
        connectionString: databaseUrl,
        ssl: databaseUrl.includes("render.com") || databaseUrl.includes("neon.tech")
          ? { rejectUnauthorized: false }
          : false,
      });

      try {
        // Get all data
        const emailsResult = await pool.query(`
          SELECT
            recipient_email,
            email_type,
            audit_type,
            sendpulse_status,
            opened,
            clicked,
            sent_at,
            created_at
          FROM email_tracking
          ORDER BY sent_at DESC
        `);

        const ctaResult = await pool.query(`
          SELECT
            ct.event_type,
            ct.url,
            ct.created_at,
            et.recipient_email
          FROM cta_tracking ct
          LEFT JOIN email_tracking et ON ct.email_tracking_id = et.id
          ORDER BY ct.created_at DESC
        `);

        // Generate CSV for emails
        const emailsCSV = [
          'Email,Type,Audit Type,Status,Opened,Clicked,Sent At',
          ...emailsResult.rows.map(row =>
            `"${row.recipient_email}","${row.email_type}","${row.audit_type || ''}","${row.sendpulse_status}","${row.opened ? 'Yes' : 'No'}","${row.clicked ? 'Yes' : 'No'}","${row.sent_at}"`
          )
        ].join('\n');

        // Generate CSV for CTA events
        const ctaCSV = [
          'Email,Event Type,URL,Date',
          ...ctaResult.rows.map(row =>
            `"${row.recipient_email || 'N/A'}","${row.event_type}","${row.url || ''}","${row.created_at}"`
          )
        ].join('\n');

        res.json({
          success: true,
          data: {
            emailsCSV,
            ctaCSV,
            stats: {
              totalEmails: emailsResult.rows.length,
              totalCTAEvents: ctaResult.rows.length
            }
          }
        });

      } finally {
        await pool.end();
      }

    } catch (error) {
      console.error("[ExportCSV] Error:", error);
      res.status(500).json({
        success: false,
        error: "Erreur export CSV",
        message: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // ==================== SENDPULSE LIVE STATS (from API) ====================
  app.get("/api/admin/sendpulse-live-stats", async (req, res) => {
    if (!requireAdminAuth(req, res)) return;

    try {
      const SENDPULSE_USER_ID = process.env.SENDPULSE_USER_ID;
      const SENDPULSE_SECRET = process.env.SENDPULSE_SECRET;

      if (!SENDPULSE_USER_ID || !SENDPULSE_SECRET) {
        res.json({ success: false, error: "SendPulse credentials not configured" });
        return;
      }

      // 1. Get SendPulse OAuth token
      const tokenRes = await fetch("https://api.sendpulse.com/oauth/access_token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grant_type: "client_credentials",
          client_id: SENDPULSE_USER_ID,
          client_secret: SENDPULSE_SECRET,
        }),
      });

      if (!tokenRes.ok) {
        const errorText = await tokenRes.text();
        console.error("[SendPulseLiveStats] Auth failed:", errorText);
        res.json({ success: false, error: "SendPulse authentication failed" });
        return;
      }

      const tokenData = await tokenRes.json();
      const accessToken = tokenData.access_token;

      if (!accessToken) {
        res.json({ success: false, error: "No access token received from SendPulse" });
        return;
      }

      // 2. Get ALL emails from SendPulse with pagination (depuis le 17 mars 2026)
      const since17mars = "2026-03-17T00:00:00Z";
      const limit = 100; // SendPulse max per request
      let allEmails: any[] = [];
      let offset = 0;
      let hasMore = true;

      console.log("[SendPulseLiveStats] Starting pagination...");

      while (hasMore) { // No limit - fetch ALL emails
        const emailsRes = await fetch(
          `https://api.sendpulse.com/smtp/emails?limit=${limit}&offset=${offset}&from_date=${since17mars}`,
          {
            headers: {
              "Authorization": `Bearer ${accessToken}`,
              "Content-Type": "application/json"
            }
          }
        );

        if (!emailsRes.ok) {
          const errorText = await emailsRes.text();
          console.error(`[SendPulseLiveStats] Failed at offset ${offset}:`, errorText);
          break;
        }

        const emailsData = await emailsRes.json();
        const emails = Array.isArray(emailsData) ? emailsData : (emailsData.data || []);

        console.log(`[SendPulseLiveStats] Fetched ${emails.length} emails at offset ${offset}`);

        if (emails.length === 0) {
          hasMore = false;
        } else {
          allEmails = allEmails.concat(emails);
          offset += limit;
        }
      }

      console.log(`[SendPulseLiveStats] Total emails fetched: ${allEmails.length}`);

      // Parse SendPulse response
      const emails = allEmails;

      // Calculate stats
      const totalSent = emails.length;
      const delivered = emails.filter((e: any) => e.smtp_answer_code === 250 || e.status === "sent").length;
      const failed = emails.filter((e: any) => e.status === "failed" || e.status === "error").length;
      const opened = emails.filter((e: any) => e.opens > 0).length;
      const clicked = emails.filter((e: any) => e.clicks > 0).length;

      // By type (parse from subject)
      const byType: Record<string, number> = {
        GRATUIT: 0,
        PREMIUM: 0,
        ELITE: 0,
        BLOOD_ANALYSIS: 0,
        OTHER: 0,
      };

      emails.forEach((email: any) => {
        const subject = (email.subject || "").toLowerCase();
        const text = (email.text || "").toLowerCase();
        const combined = subject + " " + text;

        if (combined.includes("blood analysis") || subject.includes("blood")) {
          byType.BLOOD_ANALYSIS++;
        } else if (combined.includes("ultimate scan") || combined.includes("ultimate")) {
          byType.ELITE++;
        } else if (combined.includes("anabolic bioscan") || combined.includes("anabolic")) {
          byType.PREMIUM++;
        } else if (combined.includes("discovery scan") || combined.includes("discovery")) {
          byType.GRATUIT++;
        } else {
          byType.OTHER++;
        }
      });

      // Last 24h and 7d
      const now = Date.now();
      const last24h = now - 24 * 60 * 60 * 1000;
      const last7d = now - 7 * 24 * 60 * 60 * 1000;

      const last24hCount = emails.filter((e: any) => {
        const sentTime = e.send_date ? new Date(e.send_date).getTime() : 0;
        return sentTime >= last24h;
      }).length;

      const last7dCount = emails.filter((e: any) => {
        const sentTime = e.send_date ? new Date(e.send_date).getTime() : 0;
        return sentTime >= last7d;
      }).length;

      res.json({
        success: true,
        source: "SendPulse API Live",
        stats: {
          totalSent,
          delivered,
          failed,
          opened,
          clicked,
          pending: 0, // SendPulse API ne donne que les envoyés
          ready: 0,
          byType,
          last24h: last24hCount,
          last7d: last7dCount,
          deliveryRate: totalSent > 0 ? ((delivered / totalSent) * 100).toFixed(1) + '%' : '0.0%',
          openRate: totalSent > 0 ? ((opened / totalSent) * 100).toFixed(1) + '%' : '0.0%',
          clickRate: totalSent > 0 ? ((clicked / totalSent) * 100).toFixed(1) + '%' : '0.0%'
        },
        raw: {
          totalEmails: emails.length,
          sampleEmail: emails[0] || null
        }
      });

    } catch (error) {
      console.error("[SendPulseLiveStats] Error:", error);
      res.status(500).json({
        success: false,
        error: "Erreur SendPulse Live Stats",
        message: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // ==================== CTA STATS ====================
  app.get("/api/admin/cta-stats", async (req, res) => {
    if (!requireAdminAuth(req, res)) return;

    try {
      const SENDPULSE_USER_ID = process.env.SENDPULSE_USER_ID;
      const SENDPULSE_SECRET = process.env.SENDPULSE_SECRET;

      if (!SENDPULSE_USER_ID || !SENDPULSE_SECRET) {
        res.json({ success: false, error: "SendPulse credentials not configured" });
        return;
      }

      // 1. Get SendPulse OAuth token
      const tokenRes = await fetch("https://api.sendpulse.com/oauth/access_token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grant_type: "client_credentials",
          client_id: SENDPULSE_USER_ID,
          client_secret: SENDPULSE_SECRET,
        }),
      });

      if (!tokenRes.ok) {
        throw new Error(`SendPulse auth failed: ${tokenRes.statusText}`);
      }

      const tokenData = await tokenRes.json();
      const accessToken = tokenData.access_token;

      // 2. Get ALL emails from SendPulse with pagination
      const since17mars = "2026-03-17T00:00:00Z";
      const limit = 100;
      let allEmails: any[] = [];
      let offset = 0;
      let hasMore = true;

      console.log("[CTAStats] Fetching emails from SendPulse...");

      while (hasMore) {
        const emailsRes = await fetch(
          `https://api.sendpulse.com/smtp/emails?limit=${limit}&offset=${offset}&from_date=${since17mars}`,
          {
            headers: {
              "Authorization": `Bearer ${accessToken}`,
              "Content-Type": "application/json"
            }
          }
        );

        if (!emailsRes.ok) {
          console.error(`[CTAStats] Failed at offset ${offset}`);
          break;
        }

        const emailsData = await emailsRes.json();
        const emails = Array.isArray(emailsData) ? emailsData : (emailsData.data || []);

        if (emails.length === 0) {
          hasMore = false;
        } else {
          allEmails = allEmails.concat(emails);
          offset += limit;
        }
      }

      console.log(`[CTAStats] Total emails fetched: ${allEmails.length}`);

      const totalSent = allEmails.length;
      const opened = allEmails.filter((e: any) => e.opens && e.opens > 0).length;
      const clicked = allEmails.filter((e: any) => e.clicks && e.clicks > 0).length;

      res.json({
        success: true,
        stats: {
          totalSent,
          opened,
          clicked,
          openRate: totalSent > 0 ? ((opened / totalSent) * 100).toFixed(1) + '%' : '0.0%',
          clickRate: totalSent > 0 ? ((clicked / totalSent) * 100).toFixed(1) + '%' : '0.0%',
          clickToOpenRate: opened > 0 ? ((clicked / opened) * 100).toFixed(1) + '%' : '0.0%',
          byEventType: {},
          byUrl: {},
          recentEvents: []
        }
      });

    } catch (error) {
      console.error("[CTAStats] Error:", error);
      res.status(500).json({
        success: false,
        error: "Erreur stats CTA",
        message: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // ==================== AUDITS PENDING ====================
  app.get("/api/admin/audits-pending", async (req, res) => {
    if (!requireAdminAuth(req, res)) return;

    try {
      const allAudits = await storage.getAllAudits();

      const scheduled = allAudits.filter(a => a.reportDeliveryStatus === 'SCHEDULED');
      const ready = allAudits.filter(a => a.reportDeliveryStatus === 'READY');

      // Find stuck (SCHEDULED > 48h)
      const now = new Date();
      const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

      const stuck = scheduled.filter(a => {
        const createdAt = new Date(a.createdAt);
        return createdAt < fortyEightHoursAgo;
      });

      res.json({
        success: true,
        scheduled: scheduled.map(a => ({
          id: a.id,
          email: a.email,
          type: a.type,
          status: a.reportDeliveryStatus,
          createdAt: a.createdAt,
          hoursSinceCreation: Math.floor((now.getTime() - new Date(a.createdAt).getTime()) / (1000 * 60 * 60))
        })),
        ready: ready.map(a => ({
          id: a.id,
          email: a.email,
          type: a.type,
          status: a.reportDeliveryStatus,
          createdAt: a.createdAt
        })),
        stuck: stuck.map(a => ({
          id: a.id,
          email: a.email,
          type: a.type,
          status: a.reportDeliveryStatus,
          createdAt: a.createdAt,
          hoursSinceCreation: Math.floor((now.getTime() - new Date(a.createdAt).getTime()) / (1000 * 60 * 60))
        })),
        counts: {
          scheduled: scheduled.length,
          ready: ready.length,
          stuck: stuck.length
        }
      });

    } catch (error) {
      console.error("[AuditsPending] Error:", error);
      res.status(500).json({
        success: false,
        error: "Erreur audits pending",
        message: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // ==================== FORCE SEND EMAIL ====================
  app.post("/api/admin/force-send-email", async (req, res) => {
    if (!requireAdminAuth(req, res)) return;

    try {
      const { email, auditId } = req.body;

      if (!email && !auditId) {
        res.status(400).json({ error: "Email ou auditId requis" });
        return;
      }

      console.log(`[ForceSend] 🚀 Forcing email send for ${email || auditId}`);

      // Find audit
      let audit;
      if (auditId) {
        audit = await storage.getAuditById(auditId);
      } else if (email) {
        const normalizedEmail = email.trim().toLowerCase();
        const allAudits = await storage.getAllAudits();
        audit = allAudits.find(a => a.email.toLowerCase() === normalizedEmail &&
          (a.reportDeliveryStatus === "SCHEDULED" || a.reportDeliveryStatus === "READY"));
      }

      if (!audit) {
        res.status(404).json({ error: "Audit non trouvé ou déjà envoyé" });
        return;
      }

      // Check status
      if (audit.reportDeliveryStatus === "SENT") {
        res.json({
          success: true,
          alreadySent: true,
          message: "Email déjà envoyé",
          sentAt: audit.reportSentAt
        });
        return;
      }

      if (audit.reportDeliveryStatus !== "SCHEDULED" && audit.reportDeliveryStatus !== "READY") {
        res.status(400).json({
          error: `Cannot force send: status is ${audit.reportDeliveryStatus}`,
          status: audit.reportDeliveryStatus
        });
        return;
      }

      // Force send
      const { sendReportReadyEmail } = await import("./emailService.js");
      const baseUrl = getBaseUrl();

      console.log(`[ForceSend] Sending to ${audit.email} (audit: ${audit.id}, type: ${audit.type})`);

      const sent = await sendReportReadyEmail(audit.email, audit.id, audit.type, baseUrl);

      if (sent) {
        await storage.updateAudit(audit.id, {
          reportDeliveryStatus: "SENT",
          reportSentAt: new Date()
        });

        console.log(`[ForceSend] ✅ Email sent successfully to ${audit.email}`);

        res.json({
          success: true,
          sent: true,
          email: audit.email,
          auditId: audit.id,
          auditType: audit.type,
          sentAt: new Date()
        });
      } else {
        console.error(`[ForceSend] ❌ Failed to send email to ${audit.email}`);
        res.json({
          success: false,
          sent: false,
          error: "SendPulse API returned false",
          email: audit.email,
          auditId: audit.id
        });
      }

    } catch (error) {
      console.error("[ForceSend] Error:", error);
      res.status(500).json({
        success: false,
        error: "Erreur envoi forcé",
        message: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // ==================== IMPORT SENDPULSE HISTORY ====================
  app.post("/api/admin/import-sendpulse-history", async (req, res) => {
    if (!requireAdminAuth(req, res)) return;

    try {
      const { csvData } = req.body;

      if (!csvData || typeof csvData !== "string") {
        res.status(400).json({ error: "csvData requis (CSV format SendPulse)" });
        return;
      }

      console.log("[ImportSP] 📥 Starting SendPulse history import...");

      const { Pool } = await import("pg");
      const { db } = await import("./db.js");
      const { emailTracking: emailTrackingTable } = await import("../shared/drizzle-schema.js");

      // Create pool connection for querying orders
      const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
      if (!databaseUrl) {
        res.status(500).json({ error: 'DATABASE_URL not configured' });
        return;
      }

      const pool = new Pool({
        connectionString: databaseUrl,
        ssl: databaseUrl.includes("render.com") || databaseUrl.includes("neon.tech")
          ? { rejectUnauthorized: false }
          : false,
      });

      // Parse CSV (separator is ;)
      const lines = csvData.split('\n').filter(l => l.trim());

      if (lines.length < 2) {
        res.status(400).json({ error: "CSV vide ou invalide" });
        return;
      }

      let imported = 0;
      let skipped = 0;
      let errors = 0;
      const errorDetails: Array<{ line: number; email: string; error: string }> = [];

      // Skip header (line 0)
      for (let i = 1; i < lines.length; i++) {
        let cols: string[] = [];
        try {
          cols = lines[i].split(';');

          if (cols.length < 7) {
            skipped++;
            continue;
          }

          const recipientEmail = cols[3]?.toLowerCase().trim();
          const subject = cols[4] || '';
          const status = cols[6] || '';
          const dateStr = cols[1] || '';

          // Skip admin/test emails
          if (!recipientEmail ||
              recipientEmail.includes('achzodcoaching.com') ||
              recipientEmail.includes('@test.com') ||
              recipientEmail === 'achzodyt@gmail.com' ||
              recipientEmail === 'achkou@gmail.com') {
            skipped++;
            continue;
          }

          // Only import audit report emails
          const isAuditReport = subject.includes('Discovery Scan') ||
                                subject.includes('Scan Anabolique') ||
                                subject.includes('Ultimate Scan');

          if (!isAuditReport) {
            skipped++;
            continue;
          }

          // Determine audit type from subject
          let auditType = 'GRATUIT';
          if (subject.includes('Scan Anabolique')) {
            auditType = 'PREMIUM';
          } else if (subject.includes('Ultimate Scan')) {
            auditType = 'ELITE';
          }

          // Find corresponding order/audit
          const orders = await pool.query(
            `SELECT id, audit_id FROM orders WHERE LOWER(email) = $1 AND product_type = $2 LIMIT 1`,
            [recipientEmail, auditType]
          );

          const auditId = orders.rows[0]?.audit_id || null;

          // Parse date (format: 2026-03-17 10:30:21)
          const sentAt = new Date(dateStr);

          // Insert into email_tracking
          const sendpulseStatus = status.toLowerCase().includes('delivered') ? 'success' : 'failed';

          await db.insert(emailTrackingTable).values({
            emailType: 'sendReportReadyEmail',
            recipientEmail,
            recipientName: null,
            auditId,
            auditType,
            subject,
            previewText: null,
            sendpulseTaskId: null,
            sendpulseStatus,
            sendpulseError: sendpulseStatus === 'failed' ? status : null,
            metadata: { importedFromSendPulse: true, originalDate: dateStr },
            sentAt,
            createdAt: new Date(),
          }).onConflictDoNothing();

          imported++;

          if (imported % 50 === 0) {
            console.log(`[ImportSP] Progress: ${imported} imported, ${skipped} skipped`);
          }

        } catch (err) {
          errors++;
          errorDetails.push({
            line: i + 1,
            email: cols[3] || 'unknown',
            error: err instanceof Error ? err.message : String(err)
          });

          if (errors <= 10) {
            console.error(`[ImportSP] Error at line ${i + 1}:`, err);
          }
        }
      }

      const summary = {
        success: true,
        imported,
        skipped,
        errors,
        totalLines: lines.length - 1,
        errorDetails: errorDetails.slice(0, 20)
      };

      console.log("[ImportSP] ✅ Import complete:", summary);
      res.json(summary);

      await pool.end();

    } catch (error) {
      console.error("[ImportSP] Fatal error:", error);
      res.status(500).json({
        success: false,
        error: "Erreur import SendPulse",
        message: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // ==================== FIX: Recreate email_tracking table ====================
  app.post("/api/admin/fix-email-tracking-table", async (req, res) => {
    if (!requireAdminAuth(req, res)) return;

    try {
      const { Pool } = await import("pg");
      const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;

      if (!databaseUrl) {
        res.status(500).json({ error: 'DATABASE_URL not configured' });
        return;
      }

      const pool = new Pool({
        connectionString: databaseUrl,
        ssl: databaseUrl.includes("render.com") || databaseUrl.includes("neon.tech")
          ? { rejectUnauthorized: false }
          : false,
      });

      const steps: string[] = [];

      try {
        // Step 1: Drop old table
        console.log("[FixTable] Step 1: Dropping old email_tracking table...");
        await pool.query(`DROP TABLE IF EXISTS email_tracking CASCADE;`);
        steps.push("✅ Dropped old email_tracking table");

        // Step 2: Create new table with correct schema
        console.log("[FixTable] Step 2: Creating new email_tracking table...");
        await pool.query(`
          CREATE TABLE email_tracking (
            id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
            email_type VARCHAR(50) NOT NULL,
            recipient_email VARCHAR(255) NOT NULL,
            recipient_name VARCHAR(255),
            audit_id VARCHAR(36),
            audit_type VARCHAR(50),
            subject TEXT,
            preview_text TEXT,
            sendpulse_task_id VARCHAR(255),
            sendpulse_status VARCHAR(50),
            sendpulse_error TEXT,
            opened TIMESTAMP,
            clicked TIMESTAMP,
            converted TIMESTAMP,
            conversion_type VARCHAR(50),
            metadata JSONB,
            sent_at TIMESTAMP NOT NULL,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
          );
        `);
        steps.push("✅ Created new email_tracking table with correct schema");

        // Step 3: Create indexes
        console.log("[FixTable] Step 3: Creating indexes...");
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_email_tracking_recipient ON email_tracking(recipient_email);`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_email_tracking_audit ON email_tracking(audit_id);`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_email_tracking_sent_at ON email_tracking(sent_at);`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_email_tracking_status ON email_tracking(sendpulse_status);`);
        steps.push("✅ Created indexes");

        // Step 4: Verify
        console.log("[FixTable] Step 4: Verifying table structure...");
        const verify = await pool.query(`
          SELECT column_name
          FROM information_schema.columns
          WHERE table_name = 'email_tracking'
          ORDER BY ordinal_position;
        `);
        steps.push(`✅ Verified ${verify.rows.length} columns exist`);

        res.json({
          success: true,
          steps,
          columns: verify.rows.map(r => r.column_name)
        });

      } finally {
        await pool.end();
      }

    } catch (error) {
      console.error("[FixTable] Error:", error);
      res.status(500).json({
        success: false,
        error: "Erreur fix table",
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
    }
  });

  // ==================== SENDPULSE WEBHOOK - Track CTA clicks ====================
  app.post("/api/webhooks/sendpulse", async (req, res) => {
    try {
      console.log("[SendPulseWebhook] Received webhook:", JSON.stringify(req.body, null, 2));

      // SendPulse sends array of events
      const events = Array.isArray(req.body) ? req.body : [req.body];

      if (events.length === 0) {
        console.log("[SendPulseWebhook] ❌ Empty events array");
        res.status(400).json({ error: "Empty events array" });
        return;
      }

      const { Pool } = await import("pg");
      const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;

      if (!databaseUrl) {
        res.status(500).json({ error: 'DATABASE_URL not configured' });
        return;
      }

      const pool = new Pool({
        connectionString: databaseUrl,
        ssl: databaseUrl.includes("render.com") || databaseUrl.includes("neon.tech")
          ? { rejectUnauthorized: false }
          : false,
      });

      let processed = 0;
      let errors = 0;

      try {
        for (const eventData of events) {
          try {
            const { event, email, task_id, link_url, timestamp } = eventData;

            if (!event || !email) {
              console.log("[SendPulseWebhook] ⚠️  Skipping event, missing required fields");
              errors++;
              continue;
            }

            const normalizedEmail = email.toLowerCase().trim();

            // Find email_tracking record
            const emailResult = await pool.query(
              `SELECT id FROM email_tracking WHERE LOWER(recipient_email) = $1 ORDER BY sent_at DESC LIMIT 1`,
              [normalizedEmail]
            );

            if (emailResult.rows.length === 0) {
              console.log(`[SendPulseWebhook] ⚠️  Email tracking not found for: ${normalizedEmail}`);
              // Still record the event with null email_tracking_id
            }

            const emailTrackingId = emailResult.rows[0]?.id || null;

            // Determine event type (SendPulse format)
            let eventType = event.toLowerCase().replace(/\s+/g, '_');

            // Normalize event names
            if (eventType.includes('open')) eventType = 'open';
            else if (eventType.includes('click')) eventType = 'click';
            else if (eventType.includes('unsub')) eventType = 'unsubscribe';
            else if (eventType.includes('bounce')) eventType = 'bounce';
            else if (eventType.includes('deliver')) eventType = 'delivered';
            else if (eventType.includes('spam')) eventType = 'spam';

            // Insert into cta_tracking
            await pool.query(
              `INSERT INTO cta_tracking (email_tracking_id, event_type, url, metadata, created_at)
               VALUES ($1, $2, $3, $4, NOW())`,
              [
                emailTrackingId,
                eventType,
                link_url || null,
                JSON.stringify(eventData)
              ]
            );

            // Update email_tracking table
            if (emailTrackingId) {
              if (eventType === 'open') {
                await pool.query(
                  `UPDATE email_tracking SET opened = NOW() WHERE id = $1 AND opened IS NULL`,
                  [emailTrackingId]
                );
              } else if (eventType === 'click') {
                await pool.query(
                  `UPDATE email_tracking SET clicked = NOW() WHERE id = $1 AND clicked IS NULL`,
                  [emailTrackingId]
                );
              }
            }

            console.log(`[SendPulseWebhook] ✅ Tracked ${eventType} for ${normalizedEmail}`);
            processed++;

          } catch (err) {
            console.error("[SendPulseWebhook] Error processing event:", err);
            errors++;
          }
        }

        res.json({
          success: true,
          message: "Events processed",
          processed,
          errors,
          total: events.length
        });

      } finally {
        await pool.end();
      }

    } catch (error) {
      console.error("[SendPulseWebhook] Error:", error);
      res.status(500).json({
        success: false,
        error: "Erreur webhook",
        message: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // ==================== DEBUG: Check email_tracking table structure ====================
  app.get("/api/admin/check-email-tracking-table", async (req, res) => {
    if (!requireAdminAuth(req, res)) return;

    try {
      const { Pool } = await import("pg");
      const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;

      if (!databaseUrl) {
        res.status(500).json({ error: 'DATABASE_URL not configured' });
        return;
      }

      const pool = new Pool({
        connectionString: databaseUrl,
        ssl: databaseUrl.includes("render.com") || databaseUrl.includes("neon.tech")
          ? { rejectUnauthorized: false }
          : false,
      });

      try {
        // Check if table exists and get columns
        const result = await pool.query(`
          SELECT column_name, data_type, character_maximum_length, is_nullable
          FROM information_schema.columns
          WHERE table_name = 'email_tracking'
          ORDER BY ordinal_position;
        `);

        // Also try to count rows
        let count = 0;
        try {
          const countResult = await pool.query(`SELECT COUNT(*) FROM email_tracking`);
          count = parseInt(countResult.rows[0].count);
        } catch (e) {
          // Ignore count errors
        }

        res.json({
          success: true,
          tableExists: result.rows.length > 0,
          columns: result.rows,
          rowCount: count
        });
      } finally {
        await pool.end();
      }

    } catch (error) {
      console.error("[CheckTable] Error:", error);
      res.status(500).json({
        success: false,
        error: "Erreur vérification table",
        message: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // ==================== PEPTIDES ENGINE ROUTES ====================

  const peptidesLimiter = createRateLimiter({ windowMs: 60_000, max: 10 });

  // 1. Save questionnaire progress
  app.post("/api/peptides-engine/save-progress", peptidesLimiter, async (req, res) => {
    try {
      const schema = z.object({
        email: z.string().email(),
        currentSection: z.number().min(0).max(50),
        totalSections: z.number().min(1).max(50).optional(),
        responses: z.record(z.unknown()),
      });
      const data = schema.parse(req.body);

      const progress = await storage.saveBurnoutProgress({
        email: `peptides::${data.email}`,
        currentSection: data.currentSection,
        totalSections: data.totalSections,
        responses: data.responses,
      });

      res.json({ success: true, progress });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Données invalides", details: error.errors });
        return;
      }
      console.error("[PeptidesEngine] save-progress error:", error);
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  // Verify responses exist server-side before allowing checkout
  app.get("/api/peptides-engine/verify-responses", async (req, res) => {
    try {
      const email = req.query.email as string;
      if (!email) { res.json({ verified: false, responseCount: 0 }); return; }

      const progress = await storage.getBurnoutProgress(`peptides::${email}`);
      if (!progress || !progress.responses || Object.keys(progress.responses).length < 3) {
        res.json({ verified: false, responseCount: Object.keys(progress?.responses || {}).length });
        return;
      }

      res.json({ verified: true, responseCount: Object.keys(progress.responses).length });
    } catch (error) {
      console.error("[PeptidesEngine] verify-responses error:", error);
      res.json({ verified: false, responseCount: 0 });
    }
  });

  // 2. Create order and trigger protocol generation
  app.post("/api/peptides-engine/create", peptidesLimiter, async (req, res) => {
    try {
      const schema = z.object({
        email: z.string().email(),
        responses: z.record(z.unknown()),
        stripeSessionId: z.string().optional(),
        skipPaymentCheck: z.boolean().optional(),
      });
      const { email, responses, stripeSessionId, skipPaymentCheck } = schema.parse(req.body);

      if (!responses || Object.keys(responses).length < 3) {
        res.status(400).json({ error: "Réponses insuffisantes pour générer un protocole" });
        return;
      }

      // Safety gate: hard block on cancer history
      const safetyCheck = checkPeptidesSafetyGate(responses);
      if (!safetyCheck.safe) {
        console.warn(`[PeptidesEngine] Safety gate triggered for ${email}: ${safetyCheck.reason}`);
        res.status(422).json({
          error: "safety_gate",
          message: safetyCheck.reason,
        });
        return;
      }

      // Create order record
      let order;
      try {
        order = await storage.createOrder({
          email,
          productType: "PEPTIDES_ENGINE",
          productName: "Peptides Engine",
          amountCents: 29900,
          currency: "eur",
          stripeCheckoutSessionId: stripeSessionId ?? null,
          ipAddress: (req as any).ip ?? null,
          userAgent: req.headers["user-agent"] ?? null,
          metadata: { responsesCount: Object.keys(responses).length },
        });
        console.log(`[PeptidesEngine] Order created: ${order.id} for ${email}`);
      } catch (orderErr) {
        console.error("[PeptidesEngine] Order creation failed:", orderErr);
        // Continue — don't block generation if order recording fails
      }

      // Check payment confirmation (Stripe session or explicit override)
      let paymentConfirmed = Boolean(skipPaymentCheck);
      if (!paymentConfirmed && stripeSessionId) {
        try {
          const existingOrder = await storage.getOrderByStripeSession(stripeSessionId);
          paymentConfirmed = existingOrder?.status === "paid";
        } catch {
          // Non-blocking
        }
      }

      if (!paymentConfirmed) {
        res.status(202).json({
          success: true,
          status: "pending_payment",
          message: "Paiement en attente — le protocole sera généré après confirmation.",
          orderId: order?.id ?? null,
        });
        return;
      }

      // Generate protocol (fire-and-forget for long operations, but we await here
      // since we need the report ID for the response)
      let reportId: string | null = null;
      try {
        const report = await generatePeptidesProtocol(responses, email);

        // Store report using burnout_reports table as generic JSON store
        const record = await storage.createBurnoutReport({
          email: `peptides::${email}`,
          responses,
          report,
        });
        reportId = record.id;

        // Link order to report if order was created
        if (order) {
          await storage.updateOrder(order.id, {
            status: "paid",
            metadata: {
              ...(order.metadata as object ?? {}),
              peptidesReportId: reportId,
            },
          }).catch(() => {});
        }

        // Deliver via email
        const promoCodesBlock =
          report.promoCodesGenerated?.length > 0
            ? `\n\nTes 2 codes Blood Analysis offerts (100% de réduction, usage unique):\n${report.promoCodesGenerated.join("\n")}`
            : "";

        const peptidesNames = report.peptides?.map((p) => p.name).join(", ") ?? "voir rapport";
        const deliveryMessage =
          `Ton protocole peptides est prêt.\n\n` +
          `Peptides recommandés : ${peptidesNames}\n\n` +
          `Accède à ton rapport complet ici :\n${getBaseUrl(req)}/peptides/${reportId}` +
          promoCodesBlock +
          `\n\nConserve ce lien — il est personnel et unique.`;

        await sendCTAEmail(
          email,
          "Ton protocole peptides personnalisé est prêt",
          deliveryMessage
        ).catch((err) => console.error("[PeptidesEngine] Delivery email failed:", err));

        // Clean up progress
        await storage.saveBurnoutProgress({
          email: `peptides::${email}`,
          currentSection: 99,
          totalSections: 38,
          responses: {},
        }).catch(() => {});

        res.json({
          success: true,
          status: "generated",
          reportId,
          peptideCount: report.peptides?.length ?? 0,
        });
      } catch (genErr: any) {
        console.error("[PeptidesEngine] Generation error:", genErr);
        res.status(500).json({
          error: "Erreur lors de la génération du protocole. Réessaie dans quelques minutes.",
          orderId: order?.id ?? null,
        });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Données invalides", details: error.errors });
        return;
      }
      console.error("[PeptidesEngine] create error:", error);
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  // 3. Get generated report by ID
  app.get("/api/peptides-engine/report/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const record = await storage.getBurnoutReport(id);

      if (!record) {
        res.status(404).json({ error: "Rapport introuvable" });
        return;
      }

      // Ensure it's a peptides report (email prefixed with peptides::)
      if (!String(record.email ?? "").startsWith("peptides::")) {
        res.status(404).json({ error: "Rapport introuvable" });
        return;
      }

      res.json({
        success: true,
        id: record.id,
        createdAt: record.createdAt,
        report: record.report,
      });
    } catch (error) {
      console.error("[PeptidesEngine] report fetch error:", error);
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  // Démarrer la surveillance automatique des relances d'abandons
  // Check toutes les 30 minutes pour détecter ouvertures, conversions, etc.
  // ─── Auto review requests: every 6 hours, send J+3 review request emails ───
  let reviewCronRunning = false;
  setInterval(async () => {
    if (reviewCronRunning) return;
    reviewCronRunning = true;
    try {
      const baseUrl = process.env.APP_URL || process.env.RENDER_EXTERNAL_URL || "https://apexlabs.achzodcoaching.com";
      const allAudits = await storage.getAllAudits();
      const now = new Date();
      let sent = 0;
      for (const audit of allAudits) {
        if (!audit.email || sent >= 20) break;
        if (audit.createdAt && new Date(audit.createdAt) < new Date('2026-03-17')) continue;
        const sentAt = (audit as any).reportSentAt || audit.createdAt;
        if (!sentAt) continue;
        const daysSinceSent = (now.getTime() - new Date(sentAt).getTime()) / (24 * 60 * 60 * 1000);
        if (daysSinceSent < 3 || daysSinceSent > 14) continue;
        const existingReview = await storage.getReviewByAuditId?.(audit.id);
        if (existingReview) continue;
        const emailHistory = await storage.getEmailTrackingForAudit(audit.id);
        const alreadySent = emailHistory?.some((e: any) => e.emailType === 'sendReviewRequestJ3Email');
        if (alreadySent) continue;
        try {
          const trackingRecord = await storage.createEmailTracking(audit.id, "sendReviewRequestJ3Email", audit.email);
          await sendReviewRequestJ3Email(audit.email, audit.id, audit.auditType || "GRATUIT", baseUrl, trackingRecord.id);
          sent++;
          console.log(`[ReviewCron] Sent review request to ${audit.email} (audit ${audit.id})`);
        } catch (e) {
          console.error(`[ReviewCron] Failed for ${audit.email}:`, e);
        }
      }
      if (sent > 0) console.log(`[ReviewCron] Sent ${sent} review request emails`);
    } catch (e) {
      console.error("[ReviewCron] Error:", e);
    } finally {
      reviewCronRunning = false;
    }
  }, 6 * 60 * 60 * 1000); // Every 6 hours
  console.log("[ReviewCron] ✅ setInterval registered (6h cycle)");

  // Auto-recovery: generate missing peptides reports every 5 minutes
  let autoGenRunning = false;
  let autoGenCycleCount = 0;
  let autoGenLastRun = "never";
  let autoGenLastResult = "none";
  let autoGenStartedAt = 0;

  // Diagnostic endpoint
  app.get("/api/admin/autogen-status", (req, res) => {
    if (!requireAdminAuth(req, res)) return;
    res.json({ cycles: autoGenCycleCount, lastRun: autoGenLastRun, lastResult: autoGenLastResult, running: autoGenRunning });
  });

  console.log("[AutoGen] ✅ setInterval registered (5min cycle)");
  setInterval(async () => {
    // Safety timeout: if running for more than 5 minutes, force reset
    if (autoGenRunning && autoGenStartedAt > 0 && (Date.now() - autoGenStartedAt) > 5 * 60 * 1000) {
      console.warn("[AutoGen] ⚠️ Force-resetting stuck autoGenRunning flag (>5 min)");
      autoGenRunning = false;
    }
    if (autoGenRunning) {
      console.log("[AutoGen] ⏭️ Skipped — already running");
      return;
    }
    autoGenRunning = true;
    autoGenStartedAt = Date.now();
    try {
      const allOrdersResult = await storage.getAllOrders({ limit: 500 });
      const orders = allOrdersResult.orders || [];
      const peptidesOrders = orders.filter((o: any) => o.productType === "PEPTIDES_ENGINE" && o.status === "paid" && o.paidAt);
      const missing = peptidesOrders.filter((o: any) => !(o.metadata as any)?.peptidesReportId && !o.email?.includes("test") && !o.email?.includes("debug"));
      autoGenCycleCount++;
      autoGenLastRun = new Date().toISOString();
      console.log(`[AutoGen] Cycle #${autoGenCycleCount}: ${orders.length} total orders, ${peptidesOrders.length} peptides paid, ${missing.length} missing reports`);
      const now = new Date();

      for (const order of peptidesOrders) {
        const meta = order.metadata as any;
        const email = order.email;
        if (!email || email.includes("test") || email.includes("debug")) continue;
        if (meta?.peptidesReportId) continue;

        const hoursSincePaid = (now.getTime() - new Date(order.paidAt).getTime()) / (1000 * 60 * 60);
        // Wait at least 10 min before autogen kicks in — gives the inline generation pipeline
        // time to finish first. Prevents double report generation (race condition).
        if (hoursSincePaid < 0.17 || hoursSincePaid > 168) continue;

        console.log(`[AutoGen] Generating peptides report for ${email} (paid ${Math.round(hoursSincePaid * 60)}min ago)`);

        let responses: Record<string, unknown> | undefined;
        const progress = await storage.getBurnoutProgress(`peptides::${email}`);
        if (progress?.responses && Object.keys(progress.responses).length >= 3) {
          responses = progress.responses as Record<string, unknown>;
        } else if (meta?.peptidesResponses && Object.keys(meta.peptidesResponses).length >= 3) {
          responses = meta.peptidesResponses;
        }

        if (!responses) {
          console.error(`[AutoGen] No responses for ${email}`);
          break;
        }

        // Double-check: re-read order to confirm reportId still missing (prevent race condition)
        const freshOrder = await storage.getOrder(order.id);
        const freshMeta = freshOrder?.metadata as any;
        if (freshMeta?.peptidesReportId) {
          console.log(`[AutoGen] Report already exists for ${email} (race condition avoided)`);
          break;
        }

        const { generatePeptidesProtocol } = await import("./peptidesEngine");
        const report = await generatePeptidesProtocol(responses, email);
        const saved = await storage.createBurnoutReport({ email: `peptides::${email}`, responses, report });
        await storage.updateOrder(order.id, { metadata: { ...(freshMeta ?? meta ?? {}), peptidesReportId: saved.id } }).catch(() => {});

        // Send delivery email + admin notification (NO dedup — just send it)
        const baseUrl = getBaseUrl();
        const peptidesNames = report.peptides?.map((p: any) => p.name).join(", ") ?? "voir rapport";
        const promoBlock = report.promoCodesGenerated?.length > 0
          ? `\n\nTes 2 codes Blood Analysis offerts:\n${report.promoCodesGenerated.join("\n")}` : "";

        // Send to client
        try {
          await sendCTAEmail(email, "Ton protocole peptides personnalisé est prêt",
            `Ton protocole peptides est prêt.\n\nPeptides recommandés : ${peptidesNames}\n\nAccède à ton rapport complet ici :\n${baseUrl}/peptides/${saved.id}${promoBlock}\n\nConserve ce lien — il est personnel et unique.`
          );
          console.log(`[AutoGen] ✅ Delivery email sent to ${email}`);
        } catch (emailErr) {
          console.error(`[AutoGen] ⚠️ Delivery email FAILED for ${email}:`, emailErr);
        }

        // Send admin notification
        try {
          const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || "coaching@achzodcoaching.com";
          await sendCTAEmail(adminEmail, `RAPPORT GENERE — Peptides Engine — ${email}`,
            `Rapport Peptides Engine genere et livre.\n\nClient: ${email}\nPeptides: ${peptidesNames}\nSections: ${report.sections?.length ?? 0}\nLien: ${baseUrl}/peptides/${saved.id}`
          );
          console.log(`[AutoGen] ✅ Admin notification sent`);
        } catch (adminErr) {
          console.error(`[AutoGen] ⚠️ Admin notification FAILED:`, adminErr);
        }

        autoGenLastResult = `OK: ${email} → ${saved.id}`;
        console.log(`[AutoGen] ✅ Report ${saved.id} generated and delivered to ${email}`);
        break; // 1 per cycle
      }
    } catch (err) {
      console.error("[AutoGen] Error:", err);
    } finally {
      autoGenRunning = false;
    }
  }, 5 * 60 * 1000).unref(); // Every 5 minutes

  // Auto-send READY/SCHEDULED reports (Discovery, Anabolic, Ultimate)
  setInterval(async () => {
    try {
      const allAudits = await storage.getAllAudits();
      const now = new Date();
      let sent = 0;

      for (const audit of allAudits) {
        if (!audit.email || audit.email.includes("test") || audit.email.includes("debug") || audit.email.includes("achzodcoaching")) continue;
        if (audit.reportSentAt) continue; // Already sent

        const status = audit.reportDeliveryStatus;

        // READY: send immediately
        if (status === "READY") {
          try {
            const baseUrl = getBaseUrl();
            const emailSent = await sendReportReadyEmail(audit.email, audit.id, audit.type, baseUrl);
            if (emailSent) {
              await storage.updateAudit(audit.id, { reportDeliveryStatus: "SENT", reportSentAt: new Date() });
              console.log(`[AutoSend] ✅ Report ${audit.id} sent to ${audit.email} (${audit.type})`);
              sent++;
            }
          } catch (err) {
            console.error(`[AutoSend] Error sending ${audit.id}:`, err);
          }
          if (sent >= 3) break; // Max 3 per cycle to avoid timeout
        }

        // SCHEDULED: check if scheduledFor has passed
        if (status === "SCHEDULED" && audit.reportScheduledFor) {
          const scheduledFor = new Date(audit.reportScheduledFor);
          if (scheduledFor <= now) {
            await storage.updateAudit(audit.id, { reportDeliveryStatus: "READY" });
            console.log(`[AutoSend] Report ${audit.id} scheduled time passed, set to READY`);
          }
        }
      }

      if (sent > 0) console.log(`[AutoSend] Sent ${sent} reports this cycle`);
    } catch (err) {
      console.error("[AutoSend] Error:", err);
    }
  }, 3 * 60 * 1000).unref(); // Every 3 minutes

  // Auto-process email sequences every 30 minutes
  setInterval(async () => {
    try {
      const baseUrl = getBaseUrl();
      const allAudits = await storage.getAllAudits();
      const now = new Date();
      let sent = 0;

      for (const audit of allAudits) {
        if (!audit.email || audit.email.includes("test") || audit.email.includes("debug") || audit.email.includes("achzodcoaching") || audit.email.includes("achkou")) continue;
        if (!audit.reportSentAt) continue;

        const sentAt = new Date(audit.reportSentAt);
        const daysSinceSent = (now.getTime() - sentAt.getTime()) / (24 * 60 * 60 * 1000);

        const trackingHistory = await storage.getEmailTrackingForAudit(audit.id) || [];
        const trackingTypes = trackingHistory.map((t: any) => t.emailType);

        // GRATUIT sequences
        if (audit.type === "GRATUIT") {
          if (daysSinceSent >= 3 && daysSinceSent < 7 && !trackingTypes.includes("sendGratuitUpsellEmail")) {
            const emailSent = await sendGratuitUpsellEmail(audit.email, audit.id, baseUrl, "auto-sequence");
            if (emailSent) { sent++; if (sent >= 5) break; }
          }
          if (daysSinceSent >= 5 && daysSinceSent < 10 && !trackingTypes.includes("sendGratuitJ5Email")) {
            const hasConverted = await storage.hasUserPurchased?.(audit.email);
            if (!hasConverted) {
              const emailSent = await sendGratuitJ5Email(audit.email, audit.id, baseUrl, "auto-sequence");
              if (emailSent) { sent++; if (sent >= 5) break; }
            }
          }
          if (daysSinceSent >= 7 && daysSinceSent < 14 && !trackingTypes.includes("sendGratuitJ7Email")) {
            const hasConverted = await storage.hasUserPurchased?.(audit.email);
            if (!hasConverted) {
              const emailSent = await sendGratuitJ7Email(audit.email, audit.id, baseUrl, "auto-sequence");
              if (emailSent) { sent++; if (sent >= 5) break; }
            }
          }
          if (daysSinceSent >= 14 && daysSinceSent < 30 && !trackingTypes.includes("sendDiscoveryJ14CoachingEmail")) {
            const hasConverted = await storage.hasUserPurchased?.(audit.email);
            if (!hasConverted) {
              const emailSent = await sendDiscoveryJ14CoachingEmail(audit.email, audit.id, baseUrl, "auto-sequence");
              if (emailSent) { sent++; if (sent >= 5) break; }
            }
          }
        }
      }
      if (sent > 0) console.log(`[AutoSequence] Sent ${sent} sequence emails this cycle`);
    } catch (err) {
      console.error("[AutoSequence] Error:", err);
    }
  }, 30 * 60 * 1000).unref(); // Every 30 minutes

  // startMonitoring DISABLED — daily reports and abandonment alerts turned off
  // startMonitoring(storage, 30).catch(err => {
  //   console.error('[Monitor] Erreur démarrage surveillance:', err);
  // });
  console.log('[Monitor] Surveillance automatique DESACTIVEE');

  return httpServer;
}
