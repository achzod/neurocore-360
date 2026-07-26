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
  sendCTAEmail as sendBaseCTAEmail,
  addSubscriberToList,
  sendApexLabsWelcomeEmail,
  sendPeptidesReviewEmail,
  sendPeptidesReviewS5Email,
  sendPeptidesReviewS12Email,
  sendPeptidesCycle2ReorderEmail,
  sendPeptidesOrderConfirmationEmail,
  sendDiscoveryJ30NurtureEmail,
  sendReactivationCampaignEmail,
  sendFinishDiscoveryEmail,
  sendCrossSellUpgradeEmail,
  sendRecoveryCtaEmail,
  sendCoachingFormulaChoiceLeadEmail,
  type RecoveryCtaCohort,
  type CoachingFormulaLeadInput,
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
import { buildPeptidesCoachingDeductionBlock } from "./cta";
import { BLOOD_ANALYSIS_PURCHASE_CREDITS, clarifyBloodPurchaseEmail } from "./bloodOffer";

import { registerKnowledgeRoutes } from "./knowledge";
import { registerBloodAnalysisRoutes } from "./blood-analysis/routes";
import { registerBloodTestsRoutes } from "./blood-tests/routes";
import { signAuthToken } from "./auth";
import { analyzeDiscoveryScan, convertToNarrativeReport } from "./discovery-scan";
import {
  generatePeptidesProtocol,
  checkPeptidesSafetyGate,
  getPeptauraCatalogHealth,
  refreshPeptauraCatalog,
  refreshPeptauraPricingForDelivery,
} from "./peptidesEngine";
import { createRateLimiter } from "./middleware/rateLimit";
import {
  scrapeArticleFromUrl,
  translateArticleToFrench,
  estimateReadTimeFromWords,
  buildExcerpt,
  slugify,
} from "./blogImport";

function sendCTAEmail(
  email: string,
  subject: string,
  message: string,
  customHtml?: string,
): Promise<boolean> {
  return sendBaseCTAEmail(email, subject, clarifyBloodPurchaseEmail(subject, message), customHtml);
}

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

  // Helper function to get base URL , prefer env vars over request headers
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

  function getSendPulseCredentials(): { userId: string; secret: string; missing: string[] } {
    const userId = process.env.SENDPULSE_USER_ID || process.env.SENDPULSE_API_USER_ID || process.env.SENDPULSE_ID || "";
    const secret = process.env.SENDPULSE_SECRET || process.env.SENDPULSE_API_SECRET || "";
    const missing = [
      ...(!userId ? ["SENDPULSE_USER_ID or SENDPULSE_API_USER_ID"] : []),
      ...(!secret ? ["SENDPULSE_SECRET or SENDPULSE_API_SECRET"] : []),
    ];
    return { userId, secret, missing };
  }

  async function getSendPulseAdminToken(): Promise<string> {
    const { userId, secret, missing } = getSendPulseCredentials();
    if (missing.length) {
      throw new Error(`SendPulse credentials not configured: ${missing.join(", ")}`);
    }

    const tokenRes = await fetch("https://api.sendpulse.com/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "client_credentials",
        client_id: userId,
        client_secret: secret,
      }),
    });
    const tokenText = await tokenRes.text();
    if (!tokenRes.ok) {
      throw new Error(`SendPulse authentication failed (${tokenRes.status}): ${tokenText.slice(0, 300)}`);
    }

    const tokenData = JSON.parse(tokenText) as { access_token?: string };
    if (!tokenData.access_token) {
      throw new Error("No access token received from SendPulse");
    }
    return tokenData.access_token;
  }

  type SendPulseEmailRecord = Record<string, any>;

  const PROMO_EMAIL_TYPES = [
    "sendCTAEmail",
    "sendGratuitUpsellEmail",
    "sendGratuitJ5Email",
    "sendGratuitJ7Email",
    "sendDiscoveryJ14CoachingEmail",
    "sendDiscoveryJ30NurtureEmail",
    "sendPremiumJ7Email",
    "sendPremiumJ14Email",
    "sendFinishDiscoveryEmail",
    "sendCrossSellUpgradeEmail",
    "sendPeptidesCycle2ReorderEmail",
    "sendPromoCodeEmail",
    "sendReactivationCampaignEmail",
    "sendRecoveryCtaEmail",
  ];

  const REPORT_EMAIL_TYPES = [
    "sendReportReadyEmail",
    "sendPeptidesOrderConfirmation",
  ];

  const PROMO_SUBJECT_PATTERNS = [
    "%offre%",
    "%promo%",
    "%code promo%",
    "%coaching%",
    "%upgrade%",
    "%peptides%",
    "%reprends%",
    "%protocole%",
    "%cycle%",
    "%commande recue%",
    "%commande reçue%",
    "%paiement recu%",
    "%paiement reçu%",
  ];

  const REPORT_SUBJECT_PATTERNS = [
    "%rapport%",
    "%protocole peptides%",
    "%est pret%",
    "%est prêt%",
    "%ultimate scan%",
    "%anabolic bioscan%",
    "%discovery scan%",
    "%blood analysis%",
  ];

  const isEmailSequenceAttempted = (tracking: any): boolean => {
    const status = String(tracking?.sendpulseStatus || "").toLowerCase();
    return !["failed", "auth_failed", "unsubscribed"].includes(status);
  };

  const normalizeSearchText = (value: unknown): string =>
    String(value || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

  const chunkArray = <T,>(items: T[], size: number): T[][] => {
    const chunks: T[][] = [];
    for (let i = 0; i < items.length; i += size) {
      chunks.push(items.slice(i, i + size));
    }
    return chunks;
  };

  const sendPulseEmailId = (email: SendPulseEmailRecord): string => {
    const raw = email.id ?? email.email_id ?? email.message_id ?? email.task_id ?? "";
    return String(raw || "").trim();
  };

  const sendPulseRecipient = (email: SendPulseEmailRecord): string =>
    String(email.recipient || email.to || email.email || "").trim();

  const sendPulseSubject = (email: SendPulseEmailRecord): string =>
    String(email.subject || "").trim();

  const sendPulseSendDate = (email: SendPulseEmailRecord): string | null =>
    email.send_date || email.date || email.created_at || null;

  const sendPulseSendDateMs = (email: SendPulseEmailRecord): number => {
    const raw = String(sendPulseSendDate(email) || "").trim();
    if (!raw) return 0;
    const isoUtc = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(raw)
      ? raw.replace(" ", "T") + "Z"
      : raw;
    const parsed = Date.parse(isoUtc);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const sendPulseSmtpCode = (email: SendPulseEmailRecord): number | null => {
    const raw = email.smtp_answer_code ?? email.smtpAnswerCode ?? email.smtp_code;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const sendPulseIsDelivered = (email: SendPulseEmailRecord): boolean => {
    const code = sendPulseSmtpCode(email);
    const status = String(email.status || "").toLowerCase();
    return (code !== null && code >= 200 && code < 300) || status === "sent" || status === "delivered";
  };

  const sendPulseIsHardFailed = (email: SendPulseEmailRecord): boolean => {
    const code = sendPulseSmtpCode(email);
    const status = String(email.status || "").toLowerCase();
    return (code !== null && code >= 500) || status === "failed" || status === "error" || status === "bounced";
  };

  const sendPulseIsSoftFailed = (email: SendPulseEmailRecord): boolean => {
    const code = sendPulseSmtpCode(email);
    return code !== null && code >= 400 && code < 500;
  };

  const sendPulseEngagementCount = (email: SendPulseEmailRecord, key: "opens" | "clicks"): number => {
    const aliases = key === "opens" ? ["opens", "open"] : ["clicks", "click"];
    for (const alias of aliases) {
      const raw = email[alias] ?? email.tracking?.[alias] ?? email.statistics?.[alias];
      const parsed = Number(raw);
      if (Number.isFinite(parsed) && parsed > 0) return parsed;
    }
    return 0;
  };

  const isPromoSubject = (subject: unknown): boolean => {
    const normalized = normalizeSearchText(subject);
    return [
      "offre",
      "promo",
      "coaching",
      "upgrade",
      "peptides",
      "reprends",
      "protocole",
      "cycle",
      "commande recue",
      "paiement recu",
    ].some((needle) => normalized.includes(needle));
  };

  const isReportSubject = (subject: unknown): boolean => {
    const normalized = normalizeSearchText(subject);
    return [
      "rapport",
      "protocole peptides",
      "peptides personnalise",
      "est pret",
      "ultimate scan",
      "anabolic bioscan",
      "discovery scan",
      "blood analysis",
    ].some((needle) => normalized.includes(needle));
  };

  const normalizeSendPulseMatchText = (value: unknown): string =>
    normalizeSearchText(value).replace(/\s+/g, " ").trim();

  const sendPulseSubjectsMatch = (a: unknown, b: unknown): boolean => {
    const left = normalizeSendPulseMatchText(a);
    const right = normalizeSendPulseMatchText(b);
    if (!left || !right) return false;
    return left === right || left.includes(right) || right.includes(left);
  };

  const matchesEmailAuditScope = (emailType: unknown, subject: unknown, scope: string): boolean => {
    const type = String(emailType || "");
    const promo = PROMO_EMAIL_TYPES.includes(type) || isPromoSubject(subject);
    const report = REPORT_EMAIL_TYPES.includes(type) || isReportSubject(subject);
    if (scope === "promo") return promo;
    if (scope === "report") return report;
    return promo || report;
  };

  const simplifySendPulseEmail = (email: SendPulseEmailRecord) => ({
    id: sendPulseEmailId(email) || null,
    recipient: sendPulseRecipient(email) || null,
    subject: sendPulseSubject(email) || null,
    status: email.status || null,
    sendDate: sendPulseSendDate(email),
    smtpAnswerCode: email.smtp_answer_code ?? null,
    smtpAnswerSubcode: email.smtp_answer_subcode ?? null,
    smtpAnswerData: email.smtp_answer_data || null,
    opens: sendPulseEngagementCount(email, "opens"),
    clicks: sendPulseEngagementCount(email, "clicks"),
    tracking: email.tracking
      ? {
          open: Number(email.tracking.open || 0),
          click: Number(email.tracking.click || 0),
          linkCount: Array.isArray(email.tracking.link) ? email.tracking.link.length : 0,
          clientInfoCount: Array.isArray(email.tracking.client_info) ? email.tracking.client_info.length : 0,
        }
      : null,
  });

  const dedupeSendPulseEmails = (emails: SendPulseEmailRecord[]): SendPulseEmailRecord[] => {
    const seen = new Map<string, SendPulseEmailRecord>();
    for (const email of emails) {
      const fallbackKey = [
        sendPulseRecipient(email).toLowerCase(),
        sendPulseSubject(email).toLowerCase(),
        sendPulseSendDate(email) || "",
      ].join("|");
      const key = sendPulseEmailId(email) || fallbackKey;
      if (!seen.has(key)) {
        seen.set(key, email);
      }
    }
    return Array.from(seen.values());
  };

  async function fetchSendPulseEmails(
    accessToken: string,
    opts: { fromDate: string; pageLimit: number; maxPages: number; logPrefix: string }
  ): Promise<SendPulseEmailRecord[]> {
    const allEmails: SendPulseEmailRecord[] = [];
    let offset = 0;

    for (let page = 0; page < opts.maxPages; page++) {
      const emailsRes = await fetch(
        `https://api.sendpulse.com/smtp/emails?limit=${opts.pageLimit}&offset=${offset}&from_date=${encodeURIComponent(opts.fromDate)}`,
        {
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!emailsRes.ok) {
        const errorText = await emailsRes.text();
        console.error(`[${opts.logPrefix}] Failed at offset ${offset}:`, errorText);
        break;
      }

      const emailsData = await emailsRes.json();
      const emails = Array.isArray(emailsData) ? emailsData : (emailsData.data || []);
      console.log(`[${opts.logPrefix}] Fetched ${emails.length} emails at offset ${offset}`);

      if (emails.length === 0) break;
      allEmails.push(...emails);
      offset += opts.pageLimit;
    }

    const uniqueEmails = dedupeSendPulseEmails(allEmails);
    console.log(`[${opts.logPrefix}] Total emails fetched: ${allEmails.length}; unique: ${uniqueEmails.length}`);
    return uniqueEmails;
  }

  async function fetchSendPulseEmailDetails(
    accessToken: string,
    emails: SendPulseEmailRecord[],
    maxDetails: number,
    logPrefix = "SendPulseDetails"
  ): Promise<{ emails: SendPulseEmailRecord[]; attempted: number; fetched: number; errors: string[] }> {
    const ids = Array.from(new Set(emails.map(sendPulseEmailId).filter(Boolean))).slice(0, maxDetails);
    if (ids.length === 0) {
      return { emails, attempted: 0, fetched: 0, errors: [] };
    }

    const detailById = new Map<string, SendPulseEmailRecord>();
    const errors: string[] = [];

    for (const chunk of chunkArray(ids, 500)) {
      const detailsRes = await fetch("https://api.sendpulse.com/smtp/emails/info", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ emails: chunk }),
      });

      if (!detailsRes.ok) {
        const errorText = await detailsRes.text();
        const message = `${detailsRes.status}: ${errorText.slice(0, 300)}`;
        console.error(`[${logPrefix}] Detail batch failed:`, message);
        errors.push(message);
        continue;
      }

      const detailsData = await detailsRes.json();
      const details = Array.isArray(detailsData) ? detailsData : (detailsData.data || detailsData.emails || []);
      for (const detail of details) {
        const id = sendPulseEmailId(detail);
        if (id) detailById.set(id, detail);
      }
    }

    return {
      emails: emails.map((email) => {
        const id = sendPulseEmailId(email);
        const detail = id ? detailById.get(id) : undefined;
        return detail ? { ...email, ...detail } : email;
      }),
      attempted: ids.length,
      fetched: detailById.size,
      errors,
    };
  }

  // Centralized, race-safe wrapper around sendReportReadyEmail. Guarantees a
  // given audit can never receive two delivery emails , even if multiple paths
  // (inline create, Stripe webhook, admin resend, scheduled cron) try to send
  // concurrently.
  //
  // Safety layers (in order):
  //   1. claimAuditForSending , atomic SQL CAS on report_delivery_status
  //      (READY|SCHEDULED → SENDING). If the UPDATE hits 0 rows, another
  //      caller is already sending (or it was already sent).
  //   2. hasReportReadyEmailBeenSent , check email_tracking as a secondary
  //      guard in case the DB state got out of sync (manual edits, etc.).
  //   3. finalizeAuditSend , on SendPulse success, moves to SENT + stamps
  //      report_sent_at. This confirms provider acceptance, not inbox placement.
  //      On failure, reverts SENDING → READY so a retry path
  //      can pick it up.
  async function safeSendReportReadyEmail(
    auditId: string,
    email: string,
    auditType: string,
    baseUrl: string,
    opts?: { logPrefix?: string; bypassClaim?: boolean }
  ): Promise<{ sent: boolean; skipped?: string }> {
    const prefix = opts?.logPrefix || "[SafeSend]";

    if (!opts?.bypassClaim) {
      const alreadyTracked = await storage.hasReportReadyEmailBeenSent(auditId).catch(() => false);
      if (alreadyTracked) {
        console.log(`${prefix} ⏭️ Report email already in email_tracking for audit ${auditId} , SKIP (no double send)`);
        // Normalize audit state so UI shows SENT rather than stuck READY
        await storage.finalizeAuditSend(auditId, true).catch(() => {});
        return { sent: false, skipped: "already_in_tracking" };
      }

      // Completeness gate: block delivery if the report has truncation signatures.
      // Errors → flip audit to NEEDS_REVIEW and abort send (Achzod must inspect/fix first).
      if (auditType === "ELITE" || auditType === "PREMIUM") {
        try {
          const audit = await storage.getAudit(auditId);
          if (audit) {
            const { checkReportCompleteness } = await import("./reportCompleteness");
            const txt = (audit as any).reportTxt || (audit.narrativeReport as any)?.txt || "";
            const html = (audit as any).reportHtml || (audit.narrativeReport as any)?.html || "";
            const check = checkReportCompleteness(txt, html, auditType);
            if (!check.ok) {
              const summary = check.errors.map(e => `${e.code}${e.section ? `(${e.section})` : ""}`).join(", ");
              console.error(`${prefix} 🚫 COMPLETENESS GATE FAILED for audit ${auditId} type=${auditType} :: ${summary}`);
              await storage.updateAudit(auditId, { reportDeliveryStatus: "NEEDS_REVIEW" }).catch(() => {});
              return { sent: false, skipped: `completeness_failed:${summary}` };
            }
          }
        } catch (err) {
          console.error(`${prefix} ⚠️ completeness check threw, allowing send by default:`, err);
        }
      }

      const claimed = await storage.claimAuditForSending(auditId).catch(() => false);
      if (!claimed) {
        console.log(`${prefix} ⏭️ Could not claim audit ${auditId} for sending , another process owns it or already SENT`);
        return { sent: false, skipped: "claim_failed" };
      }
    }

    try {
      const ok = await sendReportReadyEmail(email, auditId, auditType, baseUrl);
      await storage.finalizeAuditSend(auditId, ok);
      if (ok) {
        console.log(`${prefix} ✅ Email accepted by SendPulse for audit ${auditId} to ${email}`);
      } else {
        console.error(`${prefix} ❌ sendReportReadyEmail returned false for audit ${auditId}`);
      }
      return { sent: ok };
    } catch (err) {
      console.error(`${prefix} ❌ sendReportReadyEmail THREW for audit ${auditId}:`, err);
      await storage.finalizeAuditSend(auditId, false).catch(() => {});
      return { sent: false, skipped: "threw" };
    }
  }

  const auditCreateLimiter = createRateLimiter({ windowMs: 60_000, max: 5 });
  const discoveryLimiter = createRateLimiter({ windowMs: 60_000, max: 5 });
  const checkoutLimiter = createRateLimiter({ windowMs: 60_000, max: 5 });
  const magicLinkLimiter = createRateLimiter({ windowMs: 15 * 60_000, max: 5 }); // 5 per 15min per IP
  const adminLimiter = createRateLimiter({ windowMs: 60_000, max: 20 }); // 20 per min per IP

  app.get("/api/health", async (_req, res) => {
    try {
      await pool.query("SELECT 1");
      const mem = process.memoryUsage();
      const rssMb = Math.round(mem.rss / 1024 / 1024);
      const heapUsedMb = Math.round(mem.heapUsed / 1024 / 1024);
      const heapTotalMb = Math.round(mem.heapTotal / 1024 / 1024);
      // Render starter tier has 512MB RAM. Flag if we're approaching the wall.
      const memStatus = rssMb > 440 ? "critical" : rssMb > 380 ? "warning" : "ok";
      res.json({
        status: "ok",
        db: "connected",
        memory: { rssMb, heapUsedMb, heapTotalMb, status: memStatus },
        uptimeSec: Math.round(process.uptime()),
        timestamp: new Date().toISOString(),
      });
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

  app.get("/go/coaching", (req, res) => {
    const escapeHtml = (value: unknown): string =>
      String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
    const cleanParam = (value: unknown, fallback: string): string => {
      const cleaned = String(value || fallback).replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64);
      return cleaned || fallback;
    };
    const code = cleanParam(req.query.code, "DISCOVERY30").toUpperCase();
    const campaign = cleanParam(req.query.utm_campaign, "discovery30");
    const content = cleanParam(req.query.utm_content, "coaching_bridge");
    const selectedTier = cleanParam(req.query.tier, "");
    const productUrl = (path: string, tier: string) => {
      const url = new URL(path, "https://www.achzodcoaching.com");
      url.searchParams.set("utm_source", "apexlabs");
      url.searchParams.set("utm_medium", "bridge");
      url.searchParams.set("utm_campaign", campaign);
      url.searchParams.set("utm_content", `${content}_${tier}`);
      url.searchParams.set("promo", code);
      return url.toString();
    };
    const formulasUrl = productUrl("/formules-coaching", "compare");
    const offers = [
      { tier: "ESSENTIAL", label: "Essential 8 semaines", before: "399 EUR", after: "279,30 EUR", href: productUrl("/product/coaching-essential-8", "essential8"), note: "Le meilleur point d'entree si tu veux un vrai suivi sans WhatsApp." },
      { tier: "ELITE", label: "Elite 8 semaines", before: "649 EUR", after: "454,30 EUR", href: productUrl("/product/coaching-elite-8", "elite8"), note: "Le meilleur choix si tu veux WhatsApp + ajustements plus proches." },
      { tier: "PRIVATELAB", label: "Private Lab 8 semaines", before: "799 EUR", after: "559,30 EUR", href: productUrl("/product/8-semaines-private-lab", "privatelab8"), note: "Le format le plus avance si tu veux un suivi tres serre." },
      { tier: "ESSENTIAL", label: "Essential 12 semaines", before: "549 EUR", after: "384,30 EUR", href: productUrl("/product/coaching-essential-12", "essential12"), note: "Plus rentable si tu veux une transformation plus stable." },
      { tier: "ELITE", label: "Elite 12 semaines", before: "899 EUR", after: "629,30 EUR", href: productUrl("/product/coaching-elite-12", "elite12"), note: "Le meilleur ratio suivi/resultat sur 12 semaines." },
      { tier: "PRIVATELAB", label: "Private Lab 12 semaines", before: "1199 EUR", after: "839,30 EUR", href: productUrl("/product/12-semaines-private-lab", "privatelab12"), note: "Accompagnement premium long pour gros objectif." },
    ];
    const sortedOffers = selectedTier
      ? [...offers].sort((a, b) => Number(b.tier === selectedTier) - Number(a.tier === selectedTier))
      : offers;
    const offerCards = sortedOffers.map((offer) => `
      <a class="offer${offer.tier === selectedTier ? " selected" : ""}" href="${escapeHtml(offer.href)}">
        <span class="offer-title">${escapeHtml(offer.label)}</span>
        <span class="prices"><span>${escapeHtml(offer.before)}</span><strong>${escapeHtml(offer.after)}</strong></span>
        <span class="note">${escapeHtml(offer.note)}</span>
      </a>
    `).join("");

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    res.send(`<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Activer ${escapeHtml(code)} - Achzod Coaching</title>
  <style>
    :root { color-scheme: light; --ink:#111827; --muted:#5f6673; --line:#d9dde5; --blue:#1166ff; --bg:#f7f8fb; --card:#ffffff; --green:#0f8a4b; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: var(--bg); color: var(--ink); }
    main { width: min(960px, calc(100% - 32px)); margin: 0 auto; padding: 28px 0 42px; }
    .top { display:flex; justify-content:space-between; align-items:center; gap:16px; margin-bottom:22px; font-size:13px; color:var(--muted); }
    .hero { background: var(--card); border: 1px solid var(--line); border-radius: 8px; padding: 28px; box-shadow: 0 10px 34px rgba(17,24,39,.06); }
    h1 { margin: 0 0 12px; font-size: clamp(30px, 5vw, 54px); line-height: 1.02; letter-spacing: 0; }
    .sub { margin: 0; color: var(--muted); font-size: 17px; line-height: 1.55; max-width: 760px; }
    .code-box { margin: 22px 0 0; display:grid; grid-template-columns: 1fr auto; gap: 12px; align-items:center; border: 1px solid #9bbcff; background:#eef4ff; padding: 14px; border-radius: 8px; }
    .code { font-size: clamp(28px, 6vw, 48px); line-height: 1; font-weight: 850; color: var(--blue); letter-spacing: 0; }
    button { border: 0; background: var(--blue); color:#fff; min-height: 46px; padding: 0 18px; border-radius: 8px; font-weight: 800; cursor: pointer; }
    .steps { display:grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin: 18px 0 0; }
    .step { border: 1px solid var(--line); background:#fff; border-radius: 8px; padding: 14px; min-height: 110px; }
    .step strong { display:block; margin-bottom: 6px; }
    .step span { color: var(--muted); font-size: 14px; line-height: 1.45; }
    .offers { display:grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin: 18px 0 0; }
    .offer { display:flex; min-height: 154px; flex-direction:column; justify-content:space-between; text-decoration:none; color:var(--ink); border:1px solid var(--line); background:#fff; border-radius:8px; padding:16px; transition: border-color .15s, transform .15s; }
    .offer:hover { border-color: var(--blue); transform: translateY(-1px); }
    .offer.selected { border:2px solid var(--blue); }
    .offer-title { font-weight: 850; font-size: 16px; }
    .prices { display:flex; flex-direction:column; gap:4px; }
    .prices span { color: var(--muted); text-decoration: line-through; font-size: 14px; }
    .prices strong { color: var(--green); font-size: 22px; }
    .note { color: var(--muted); font-size: 13px; line-height: 1.4; }
    .compare { display:block; text-align:center; margin-top:16px; color:var(--blue); font-weight:800; text-decoration:none; }
    .warn { margin-top:18px; color:#7c2d12; background:#fff7ed; border:1px solid #fed7aa; border-radius:8px; padding:14px; line-height:1.45; }
    @media (max-width: 760px) { main { width: min(100% - 22px, 960px); padding-top:18px; } .hero { padding: 20px; } .code-box, .steps, .offers { grid-template-columns:1fr; } .top { align-items:flex-start; flex-direction:column; } }
  </style>
</head>
<body>
  <main>
    <div class="top"><strong>APEXLABS -> ACHZOD COACHING</strong><span>Code reserve aux dossiers Discovery/ApexLabs</span></div>
    <section class="hero">
      <h1>Active ton -30% coaching</h1>
      <p class="sub">Webflow ne peut pas appliquer le code automatiquement depuis l'email. La procedure correcte est simple : copie le code, choisis une formule 8 ou 12 semaines, puis colle-le dans <strong>Code promotionnel ?</strong> au checkout.</p>
      <div class="code-box">
        <div class="code" id="code">${escapeHtml(code)}</div>
        <button type="button" id="copy">Copier le code</button>
      </div>
      <div class="steps">
        <div class="step"><strong>1. Copie ${escapeHtml(code)}</strong><span>Garde le code pret avant d'ouvrir le checkout.</span></div>
        <div class="step"><strong>2. Choisis 8 ou 12 semaines</strong><span>Le code ne s'applique pas aux formules 4 semaines.</span></div>
        <div class="step"><strong>3. Clique APPLIQUER</strong><span>Au checkout, colle le code dans <strong>Code promotionnel ?</strong>.</span></div>
      </div>
      <div class="offers">${offerCards}</div>
      <a class="compare" href="${escapeHtml(formulasUrl)}">Comparer toutes les formules</a>
      <div class="warn"><strong>Important :</strong> si le total ne baisse pas au checkout, le code n'a pas ete applique. Recolle <strong>${escapeHtml(code)}</strong> puis clique <strong>APPLIQUER</strong> avant de payer.</div>
    </section>
  </main>
  <script>
    const code = ${JSON.stringify(code)};
    document.getElementById("copy").addEventListener("click", async () => {
      try { await navigator.clipboard.writeText(code); document.getElementById("copy").textContent = "Code copie"; }
      catch { document.getElementById("copy").textContent = code; }
    });
  </script>
</body>
</html>`);
  });

  // Public stats endpoint , live factual numbers for social proof on landing/checkout pages.
  // Values are computed from the DB, not fabricated. Cached for 5 min to avoid hammering
  // the DB on every page view. Filters out test/debug emails. Only counts data from the
  // post-launch period (2026-03-17) to stay truthful.
  const STATS_CACHE_MS = 5 * 60 * 1000;
  const LAUNCH_DATE = new Date("2026-03-17T00:00:00Z");
  let statsCache: { data: Record<string, unknown>; computedAt: number } | null = null;

  app.get("/api/stats/live", async (_req, res) => {
    try {
      if (statsCache && Date.now() - statsCache.computedAt < STATS_CACHE_MS) {
        res.json(statsCache.data);
        return;
      }

      // Raw SQL COUNT queries , avoids loading full row payloads (narrativeReport,
      // report JSON, etc. , can be MBs per row). Filters test/debug emails and
      // pre-launch data directly in SQL. All queries run in parallel.
      const launchIso = LAUNCH_DATE.toISOString();
      const emailFilter = `
        AND email NOT ILIKE '%test%'
        AND email NOT ILIKE '%debug%'
        AND email NOT ILIKE '%achzodcoaching%'
        AND email NOT ILIKE '%achkou%'
      `;

      const [
        discoveryResult,
        premiumResult,
        eliteResult,
        peptidesResult,
        peptidesAvgResult,
        bloodResult,
        uniqueResult,
      ] = await Promise.all([
        pool.query(`SELECT COUNT(*)::int AS c FROM audits WHERE type = 'GRATUIT' AND report_delivery_status = 'SENT' AND created_at >= $1 ${emailFilter}`, [launchIso]),
        pool.query(`SELECT COUNT(*)::int AS c FROM audits WHERE type = 'PREMIUM' AND report_delivery_status = 'SENT' AND created_at >= $1 ${emailFilter}`, [launchIso]),
        pool.query(`SELECT COUNT(*)::int AS c FROM audits WHERE type = 'ELITE' AND report_delivery_status = 'SENT' AND created_at >= $1 ${emailFilter}`, [launchIso]),
        pool.query(`SELECT COUNT(*)::int AS c FROM burnout_reports WHERE created_at >= $1 AND email NOT ILIKE '%test%' AND email NOT ILIKE '%debug%' AND email NOT ILIKE '%achzodcoaching%' AND email NOT ILIKE '%achkou%'`, [launchIso]),
        // Average peptides per protocol , extract jsonb array length on the fly
        pool.query(`SELECT COALESCE(ROUND(AVG(jsonb_array_length(report->'peptides')) * 10) / 10, 0)::float AS avg FROM burnout_reports WHERE created_at >= $1 AND jsonb_typeof(report->'peptides') = 'array' AND email NOT ILIKE '%test%' AND email NOT ILIKE '%debug%' AND email NOT ILIKE '%achzodcoaching%' AND email NOT ILIKE '%achkou%'`, [launchIso]).catch(() => ({ rows: [{ avg: 0 }] } as any)),
        pool.query(`SELECT COUNT(*)::int AS c FROM blood_reports WHERE created_at >= $1 AND ai_report IS NOT NULL AND ai_report != '' ${emailFilter}`, [launchIso]).catch(() => ({ rows: [{ c: 0 }] } as any)),
        // Unique emails across all three tables
        pool.query(`
          SELECT COUNT(DISTINCT LOWER(email))::int AS c FROM (
            SELECT email FROM audits WHERE report_delivery_status = 'SENT' AND created_at >= $1
            UNION ALL
            SELECT REPLACE(email, 'peptides::', '') AS email FROM burnout_reports WHERE created_at >= $1
            UNION ALL
            SELECT email FROM blood_reports WHERE created_at >= $1 AND ai_report IS NOT NULL AND ai_report != ''
          ) u
          WHERE email IS NOT NULL
            AND email NOT ILIKE '%test%'
            AND email NOT ILIKE '%debug%'
            AND email NOT ILIKE '%achzodcoaching%'
            AND email NOT ILIKE '%achkou%'
        `, [launchIso]).catch(() => ({ rows: [{ c: 0 }] } as any)),
      ]);

      const discoveryDone = discoveryResult.rows[0]?.c ?? 0;
      const premiumDone = premiumResult.rows[0]?.c ?? 0;
      const eliteDone = eliteResult.rows[0]?.c ?? 0;
      const peptidesCount = peptidesResult.rows[0]?.c ?? 0;
      const peptidesPerProtocol = Number(peptidesAvgResult.rows[0]?.avg ?? 0);
      const bloodDone = bloodResult.rows[0]?.c ?? 0;
      const totalClients = uniqueResult.rows[0]?.c ?? 0;

      const data = {
        totalClients,
        discoveryScans: discoveryDone,
        anabolicBioscans: premiumDone,
        ultimateScans: eliteDone,
        peptidesProtocols: peptidesCount,
        peptidesAvgPerProtocol: Math.round(peptidesPerProtocol * 10) / 10,
        bloodAnalyses: bloodDone,
        totalReportsDelivered: discoveryDone + premiumDone + eliteDone + peptidesCount + bloodDone,
        since: LAUNCH_DATE.toISOString().slice(0, 10),
        computedAt: new Date().toISOString(),
      };

      statsCache = { data, computedAt: Date.now() };
      res.json(data);
    } catch (err: any) {
      console.error("[Stats] Error computing live stats:", err?.message || err);
      // Never fail the page load , return a safe minimal payload if the DB hiccups.
      res.json({
        totalClients: 0,
        totalReportsDelivered: 0,
        error: true,
      });
    }
  });

  // Pre-launch diagnostic , checks all critical services
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
    const { userId: spUser, secret: spSecret } = getSendPulseCredentials();
    checks.email = {
      ok: Boolean(spUser && spSecret),
      detail: !spUser ? "SENDPULSE_USER_ID missing" :
              !spSecret ? "SENDPULSE_SECRET missing" : "SendPulse configured",
    };

    // 4. AI (Anthropic Claude)
    checks.anthropic = {
      ok: Boolean(process.env.ANTHROPIC_API_KEY),
      detail: process.env.ANTHROPIC_API_KEY ? "configured" : "ANTHROPIC_API_KEY missing , reports won't generate",
    };

    // 5. OpenAI quality fallback for Peptides Engine
    checks.openai = {
      ok: Boolean(process.env.OPENAI_API_KEY),
      detail: process.env.OPENAI_API_KEY
        ? "configured , Peptides fallback gpt-5.6-sol ready"
        : "OPENAI_API_KEY missing , Peptides quality fallback unavailable",
    };

    // 6. Sentry
    checks.sentry = {
      ok: Boolean(process.env.SENTRY_DSN),
      detail: process.env.SENTRY_DSN ? "enabled" : "NOT configured , errors invisible",
    };

    // 7. Admin
    checks.admin = {
      ok: Boolean(process.env.ADMIN_SECRET),
      detail: process.env.ADMIN_SECRET ? "configured" : "ADMIN_SECRET missing",
    };

    // 8. APP_URL
    checks.appUrl = {
      ok: Boolean(process.env.APP_URL),
      detail: process.env.APP_URL || "NOT SET , emails will use fallback URL",
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

  const isActivePeptidesOrder = (order: any): boolean =>
    order?.productType === "PEPTIDES_ENGINE" &&
    (order?.status === "paid" || order?.status === "partial_refund");

  const getPeptidesReportIdsFromOrder = (order: any): string[] => {
    if (!order || order.productType !== "PEPTIDES_ENGINE") return [];
    const ids = new Set<string>();
    const metadata = order.metadata && typeof order.metadata === "object" ? order.metadata as Record<string, unknown> : {};
    const metadataReportId = metadata.peptidesReportId;
    if (typeof metadataReportId === "string" && metadataReportId.trim()) {
      ids.add(metadataReportId.trim());
    }
    if (typeof order.auditId === "string" && order.auditId.trim()) {
      ids.add(order.auditId.trim());
    }
    return Array.from(ids);
  };

  const filterVisiblePeptidesReportsForOrders = (reports: any[], orders: any[]): any[] => {
    const peptidesOrders = orders.filter((order) => order?.productType === "PEPTIDES_ENGINE");
    if (peptidesOrders.length === 0) return reports;

    const activeOrders = peptidesOrders.filter(isActivePeptidesOrder);
    if (activeOrders.length === 0) return [];

    const activeReportIds = new Set(activeOrders.flatMap(getPeptidesReportIdsFromOrder));
    if (activeReportIds.size === 0) return reports;

    return reports.filter((report) => activeReportIds.has(String(report?.id ?? "")));
  };

  const isPeptidesReportAccessibleForOrders = (reportId: string, orders: any[]): boolean => {
    const peptidesOrders = orders.filter((order) => order?.productType === "PEPTIDES_ENGINE");
    if (peptidesOrders.length === 0) return true;

    const matchingOrders = peptidesOrders.filter((order) =>
      getPeptidesReportIdsFromOrder(order).includes(reportId)
    );
    if (matchingOrders.length > 0) {
      return matchingOrders.some(isActivePeptidesOrder);
    }

    return peptidesOrders.some(isActivePeptidesOrder);
  };

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
      const schema = z.object({ email: z.string().trim().toLowerCase().email() });
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

  // First-party open-tracking pixel. The reminder HTML embeds
  // <img src="/api/track/email-open?t=TOKEN"> so when Gmail (or any client
  // that loads remote images) renders the message, opened_at is stamped.
  // Always returns a 1x1 transparent GIF, never errors, never blocks.
  app.get("/api/track/email-open", async (req, res) => {
    const token = String(req.query.t || "").trim();
    try {
      if (token && /^[a-f0-9]{64}$/.test(token)) {
        try { await (storage as any).markReminderOpened?.(token); } catch {}
      }
    } catch {}
    // 1x1 transparent GIF
    const gif = Buffer.from(
      "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
      "base64"
    );
    res.setHeader("Content-Type", "image/gif");
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.status(200).end(gif);
  });

  // Resume an abandoned questionnaire from a magic link in a relance email.
  // The token is generated in abandonmentReminders.ts when the mail is sent
  // and stored in the abandonment_reminders table. Looking it up here:
  //  1. resolves to the original email (no PII in the URL),
  //  2. marks the click on that reminder row,
  //  3. returns the saved progress so the client can hydrate state.
  app.get("/api/questionnaire/resume", async (req, res) => {
    try {
      const token = String(req.query.token || "").trim();
      if (!token || !/^[a-f0-9]{64}$/.test(token)) {
        res.status(400).json({ error: "Token invalide" });
        return;
      }
      const reminder = (storage as any).getAbandonmentReminderByToken
        ? await (storage as any).getAbandonmentReminderByToken(token)
        : null;
      if (!reminder) {
        res.status(404).json({ error: "Lien expiré ou introuvable" });
        return;
      }
      // Mark the click side-effect (best effort, never blocks the response).
      try { await (storage as any).markReminderClicked?.(token); } catch {}

      const progress = await storage.getProgress(reminder.email);
      if (!progress) {
        // No saved progress (already converted, deleted, etc.) ,  still return
        // the email so the client can pre-fill it and start fresh.
        res.json({ email: reminder.email, progress: null });
        return;
      }
      res.json({ email: reminder.email, progress });
    } catch (error) {
      console.error("[Questionnaire] Resume error:", error);
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

  app.get("/api/admin/stripe-account", async (req, res) => {
    if (!requireAdminAuth(req, res)) return;
    try {
      const stripe = await getUncachableStripeClient();
      const account = await stripe.accounts.retrieve();
      res.json({
        success: true,
        id: account.id,
        email: account.email,
        country: account.country,
        business_profile: account.business_profile,
        company: account.company,
        individual: (account as any).individual,
        settings: account.settings,
      });
    } catch (error: any) {
      console.error("[Admin] Stripe account error:", error);
      res.status(500).json({ error: error.message });
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
    email: z.string().trim().toLowerCase().email(),
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

        // IDEMPOTENCY: same email + same type within 10 min → return existing audit.
        // Protects against double-clicks, network retries, and the browser re-firing
        // the POST on connection reset. Without this, two audits get created and two
        // different reports are generated/sent.
        const existingRecent = await storage.findRecentAuditByEmailAndType(data.email, data.type, 10).catch(() => undefined);
        if (existingRecent) {
          console.warn(`[Audit Create] ⏭️ Idempotency hit , returning existing audit ${existingRecent.id} for ${data.email} (${data.type}) created ${existingRecent.createdAt}`);
          res.json(existingRecent);
          return;
        }

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

        // Meta CAPI , server-side Lead event for Discovery Scan (free top-of-funnel)
        // Recovers 30-50% of leads lost to Safari ITP / ad-blockers on the client Pixel.
        // event_id uses the audit id so a future client-side Pixel Lead can dedup.
        try {
          const { sendMetaLead } = await import("./metaCapi.js");
          const body = req.body ?? {};
          const clientNameForCapi = (mergedResponses as any)?.prenom || (mergedResponses as any)?.name || "";
          const [firstName, ...lastParts] = String(clientNameForCapi).trim().split(/\s+/);
          await sendMetaLead({
            eventId: `audit_${audit.id}`,
            eventSourceUrl: String(body.sourceUrl || body.referrer || `${getBaseUrl()}/`),
            valueEUR: 0,
            currency: "EUR",
            contentName: "Discovery Scan",
            category: "free_audit",
            userData: {
              email: data.email,
              firstName: firstName || undefined,
              lastName: lastParts.join(" ") || undefined,
              fbp: body.fbp,
              fbc: body.fbc,
              ip: req.ip,
              userAgent: body.userAgent || req.get("user-agent") || undefined,
              externalId: data.email,
            },
          });
        } catch (capiErr) {
          console.error(`[Discovery] Meta CAPI Lead failed (non-blocking):`, capiErr);
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

        // Atomic claim , if another process already claimed this audit (e.g. idempotency
        // window collided, or webhook raced), we skip generation to avoid duplicate work.
        const claimedForGen = await storage.claimAuditForGeneration(audit.id).catch(() => false);
        if (!claimedForGen) {
          console.warn(`[Discovery Scan] ⏭️ Could not claim audit ${audit.id} for generation , already in progress or done`);
          res.json(audit);
          return;
        }
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
              console.log(`[Discovery Scan] Report SCHEDULED for audit ${audit.id} , delivery at ${scheduledFor.toISOString()}`);
            } else {
              await storage.updateAudit(audit.id, {
                narrativeReport,
                reportDeliveryStatus: "READY",
              });
              console.log(`[Discovery Scan] Report READY for audit ${audit.id}`);

              const baseUrl = getBaseUrl();
              const { sent: emailSent } = await safeSendReportReadyEmail(audit.id, audit.email, audit.type, baseUrl, { logPrefix: "[Discovery Scan]" });
              if (emailSent) {
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

      // IDEMPOTENCY: same email + same type within 15 min → return existing audit.
      // For PREMIUM/ELITE the questionnaire is longer but the double-submit risk is
      // still real (page refresh after payment, network retry, etc.).
      const existingPaidRecent = await storage.findRecentAuditByEmailAndType(data.email, data.type, 15).catch(() => undefined);
      if (existingPaidRecent) {
        console.warn(`[Audit Create] ⏭️ Idempotency hit , returning existing audit ${existingPaidRecent.id} for ${data.email} (${data.type})`);
        res.json(existingPaidRecent);
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

      // Atomic generation claim , CAS transitions PENDING → GENERATING. If it fails,
      // another caller is already generating this audit (e.g. Stripe webhook beat us
      // to it). We skip kicking off a second generator to prevent two different
      // reports from being produced for the same client.
      const claimedForGenPaid = await storage.claimAuditForGeneration(audit.id).catch(() => false);
      if (!claimedForGenPaid) {
        console.warn(`[Audit Create] ⏭️ Could not claim audit ${audit.id} for generation , another process owns it`);
      } else {
        await startReportGeneration(audit.id, audit.responses, audit.scores || {}, audit.type);
        processReportAndSendEmail(audit.id, audit.email, audit.type).catch((err) => {
          console.error(`[processReportAndSendEmail] Unhandled error for audit ${audit.id}:`, err);
          storage.updateAudit(audit.id, { reportDeliveryStatus: "EMAIL_FAILED" }).catch(() => {});
        });
      }

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
        console.error(`[Email] Audit ${auditId} not found , skipping`);
        return;
      }

      const deliveryStatus = completedAudit.reportDeliveryStatus;

      // ============================================
      // GATE 1: Email already sent? STOP.
      // ============================================
      if (completedAudit.reportSentAt) {
        console.log(`[Email] ⏭️ Email already sent for ${auditId} at ${completedAudit.reportSentAt} , SKIPPING (no double email)`);
        return;
      }
      if (deliveryStatus === 'SENT') {
        console.log(`[Email] ⏭️ Status already SENT for ${auditId} , SKIPPING`);
        return;
      }

      // ============================================
      // GATE 2: Validation status
      // ============================================
      if (deliveryStatus === 'NEEDS_REVIEW') {
        console.error(`[Email] ❌ Report ${auditId} NEEDS_REVIEW , EMAIL BLOCKED`);
        return;
      }

      const validationResult = (completedAudit as any)?.narrativeReport?.validationResult;
      if (validationResult && validationResult.score < 60) {
        console.error(`[Email] ❌ Report ${auditId} score ${validationResult.score}/100 , EMAIL BLOCKED`);
        await storage.updateAudit(auditId, { reportDeliveryStatus: "NEEDS_REVIEW" });
        return;
      }

      // ============================================
      // GATE 3: Scheduled for later?
      // ============================================
      const scheduledFor = completedAudit?.reportScheduledFor;
      if (scheduledFor && new Date(scheduledFor) > new Date()) {
        await storage.updateAudit(auditId, { reportDeliveryStatus: "SCHEDULED" });
        console.log(`[Email] ⏭️ Report ${auditId} SCHEDULED for ${new Date(scheduledFor).toISOString()} , deferred`);
        return;
      }

      // ============================================
      // GATE 4: Report must have REAL content
      // ============================================
      const reportTxt = (completedAudit as any)?.reportTxt || (completedAudit as any)?.narrativeReport?.txt || '';
      const reportHtml = (completedAudit as any)?.reportHtml || (completedAudit as any)?.narrativeReport?.html || '';
      if (reportTxt.length < 500 && reportHtml.length < 500) {
        console.error(`[Email] ❌ HARD BLOCK: Report ${auditId} has no real content (TXT:${reportTxt.length} HTML:${reportHtml.length}) , EMAIL BLOCKED`);
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
          console.error(`[Email] ❌ ELITE report ${auditId} has FAILED photo analysis , EMAIL BLOCKED. Summary: ${summary.slice(0, 200)}`);
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
      // ALL GATES PASSED , Send email (race-safe)
      // ============================================
      await storage.updateAudit(auditId, { reportDeliveryStatus: "READY" });
      console.log(`[Email] ✅ All gates passed , sending to ${email}`);

      const { sent: emailSent, skipped } = await safeSendReportReadyEmail(auditId, email, auditType, baseUrl, { logPrefix: "[Email]" });
      if (!emailSent && !skipped) {
        console.error(`[Email] ❌ Email FAILED for audit ${auditId}`);
      }
    } else {
      await storage.updateAudit(auditId, { reportDeliveryStatus: "PENDING" });
      console.error(`[Email] ❌ Report generation failed or timeout for audit ${auditId}`);
    }
    } catch (error) {
      console.error(`[Email] ❌ Error in processReportAndSendEmail for audit ${auditId}:`, error);
      // Don't overwrite SCHEDULED status on error , let cron handle delivery
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

  // Peptides reports for the authenticated user ,  surface them in the dashboard
  // so users can find their protocol back even if they lose the email.
  app.get("/api/user/peptides-reports", async (req, res) => {
    try {
      const email = String(req.query.email || "").trim().toLowerCase();
      if (!email || !email.includes("@")) {
        res.status(400).json({ error: "Email requis" });
        return;
      }
      const payload = getAuthPayload(req);
      const isAdmin = requireAdminAuth(req, res, true);
      if (!isAdmin) {
        if (!payload || payload.email.toLowerCase() !== email) {
          res.status(401).json({ error: "Unauthorized" });
          return;
        }
      }
      const reports = await storage.getPeptidesReportsByEmail(email);
      const orders = await storage.getOrdersByEmail(email);
      const visibleReports = filterVisiblePeptidesReportsForOrders(reports, orders);
      const light = visibleReports.map(r => {
        const peptides = (r.report as any)?.peptides;
        const peptideNames = Array.isArray(peptides)
          ? peptides.map((p: any) => p?.name).filter(Boolean).slice(0, 6)
          : [];
        return {
          id: r.id,
          createdAt: r.createdAt,
          peptideCount: Array.isArray(peptides) ? peptides.length : 0,
          peptideNames,
        };
      });
      res.json({ success: true, reports: light });
    } catch (error) {
      console.error("[PeptidesEngine] list-by-email error:", error);
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  app.get("/api/audits/:id", async (req, res) => {
    try {
      // UUID audit IDs are unguessable , allow direct access for report viewing
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
      // UUID audit IDs are unguessable , allow direct access
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

      const audit = await storage.getAudit(req.params.id);
      const hasDeliveredReport =
        audit &&
        (audit.reportDeliveryStatus === "READY" || audit.reportDeliveryStatus === "SENT") &&
        (!!(audit as any).reportTxt || !!(audit as any).reportHtml || !!audit.narrativeReport);
      if (hasDeliveredReport) {
        res.json({
          status: "completed",
          progress: 100,
          currentSection: "Rapport termine !",
          error: null,
        });
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

      // Cache completed reports for 5 minutes (private , user-specific data)
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
      // UUID audit IDs are unguessable , allow direct access for report viewing
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
        // Prefer reportTxt (dedicated TEXT column) over narrativeReport.txt (JSONB , may be truncated)
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
        console.warn(`[Auth verify] fail token=${String(token).slice(0,8)}.. email=${normalizedEmail} found=${verifiedEmail}`);
        res.status(401).json({ error: "Lien invalide ou expiré" });
        return;
      }

      res.json({ success: true, email: normalizedEmail });
    } catch (error) {
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  // Admin diagnostic: introspect magic_tokens table health. Quick check to see
  // whether magic-link generation is actually persisting rows , a schema drift
  // (wrong column name, missing NOT NULL satisfied, etc.) would mean createMagicToken
  // inserts but the SELECT in verifyMagicToken never finds the row.
  app.get("/api/admin/debug-magic-tokens", async (req, res) => {
    if (!requireAdminAuth(req, res)) return;
    try {
      const cols = await pool.query(
        "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'magic_tokens' ORDER BY ordinal_position"
      );
      const count = await pool.query("SELECT COUNT(*)::int AS c FROM magic_tokens");
      const recent = await pool.query(
        "SELECT * FROM magic_tokens ORDER BY COALESCE(expires_at, NOW()) DESC LIMIT 5"
      ).catch(() => ({ rows: [] }));
      // Redact token values, just show prefix
      const redacted = recent.rows.map((r: any) => ({
        id: r.id,
        email: r.email,
        tokenPrefix: r.token ? String(r.token).slice(0, 8) : null,
        expires_at: r.expires_at,
      }));
      res.json({
        columns: cols.rows,
        rowCount: count.rows[0]?.c ?? 0,
        recent: redacted,
      });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
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
  // Purge orders that pollute the admin dashboard. Two categories:
  //   - cancelled: client abandoned the checkout, Stripe session expired.
  //   - before launch (2026-03-17): test orders from dev period.
  //
  // Keeps: paid (revenue), pending (in-progress checkout that could still
  // convert), refunded (accounting trail). Default mode is dry-run ,  pass
  // ?confirm=1 to actually delete.
  app.post("/api/admin/purge-noise-orders", async (req, res) => {
    if (!requireAdminAuth(req, res)) return;
    try {
      const confirm = req.query.confirm === "1" || (req.body as any)?.confirm === true;
      const launch = new Date("2026-03-17T00:00:00Z");

      // Count what would be deleted ,  NEVER touch paid/refunded, ever.
      const countPreLaunch = await pool.query(
        `SELECT COUNT(*)::int AS c, COALESCE(status,'?') AS status
           FROM orders
          WHERE created_at < $1 AND status NOT IN ('paid','refunded')
          GROUP BY status`,
        [launch]
      );
      const countCancelled = await pool.query(
        `SELECT COUNT(*)::int AS c
           FROM orders
          WHERE status = 'cancelled' AND created_at >= $1`,
        [launch]
      );

      const breakdown = {
        preLaunch: countPreLaunch.rows,
        cancelledSinceLaunch: Number(countCancelled.rows[0]?.c ?? 0),
      };

      if (!confirm) {
        res.json({
          mode: "dry-run",
          message: "Pass ?confirm=1 to execute deletion",
          wouldDelete: breakdown,
        });
        return;
      }

      // Execute the deletions. Paid + refunded are never touched.
      const delPre = await pool.query(
        `DELETE FROM orders WHERE created_at < $1 AND status NOT IN ('paid','refunded') RETURNING id`,
        [launch]
      );
      const delCanc = await pool.query(
        `DELETE FROM orders WHERE status = 'cancelled' AND created_at >= $1 RETURNING id`,
        [launch]
      );

      res.json({
        mode: "executed",
        deleted: {
          preLaunchNonPaid: delPre.rowCount ?? 0,
          cancelledSinceLaunch: delCanc.rowCount ?? 0,
          total: (delPre.rowCount ?? 0) + (delCanc.rowCount ?? 0),
        },
        wouldDeleteBreakdown: breakdown,
      });
    } catch (err) {
      console.error("[PurgeNoise] error:", err);
      res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
    }
  });

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
            reportScheduledFor: null, // Clear scheduled delivery , deliver immediately
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

        // Admin regenerate is an intentional action , reset delivery state so CAS
        // can claim fresh ownership. Without this reset, an audit already in
        // GENERATING from a prior crash would block admin retries forever.
        await storage.updateAudit(auditId, { reportDeliveryStatus: "PENDING" });
        const claimed = await storage.claimAuditForGeneration(auditId).catch(() => false);
        if (!claimed) {
          res.status(409).json({ error: "Regeneration déjà en cours" });
          return;
        }

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

      // Reset to PENDING so the CAS can claim; narrative wiped so stale content
      // never leaks into an email. Note: reportSentAt is preserved on purpose so
      // processReportAndSendEmail bails at Gate 1 (admin must use resend-email
      // with ?force=1 to email the fresh report).
      await storage.updateAudit(auditId, { reportDeliveryStatus: "PENDING", narrativeReport: null });
      const claimedPaid = await storage.claimAuditForGeneration(auditId).catch(() => false);
      if (!claimedPaid) {
        res.status(409).json({ error: "Regeneration déjà en cours" });
        return;
      }
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

      // Admin resend , block if already sent unless caller passes ?force=1
      const forceResend = req.query.force === "1" || (req.body as any)?.force === true;
      if (audit.reportSentAt && !forceResend) {
        res.status(409).json({
          error: "Report déjà envoyé , pass ?force=1 pour renvoyer volontairement",
          sentAt: audit.reportSentAt
        });
        return;
      }

      // Pré-flight: si email_tracking contient déjà un sendReportReadyEmail OK, abort
      const alreadyTracked = await storage.hasReportReadyEmailBeenSent(auditId).catch(() => false);
      if (alreadyTracked && !forceResend) {
        res.status(409).json({
          error: "Email déjà tracé comme envoyé , pass ?force=1 pour renvoyer volontairement"
        });
        return;
      }

      // Bypass atomic claim only for explicit force (admin already opted in)
      const { sent: emailSent } = await safeSendReportReadyEmail(auditId, audit.email, audit.type, baseUrl, {
        logPrefix: "[Resend]",
        bypassClaim: forceResend,
      });

      if (emailSent) {
        if (forceResend) {
          // bypassClaim path didn't finalize , ensure DB reflects reality
          await storage.updateAudit(auditId, { reportDeliveryStatus: "SENT", reportSentAt: new Date() }).catch(() => {});
        }
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
      await storage.updateAudit(auditId, { reportDeliveryStatus: "READY" }).catch(() => {});
      const { sent: emailSent } = await safeSendReportReadyEmail(auditId, email, auditType, baseUrl, { logPrefix: "[Admin]" });
      if (!emailSent) {
        console.error(`[Admin] Report ready but email FAILED for audit ${auditId} - check SendPulse config`);
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
      res.setHeader("Content-Disposition", `attachment; filename=apexlabs-${auditId.slice(0, 8)}.pdf`);
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
      <p style="color: #888;">${clientName} ,  ${new Date(generatedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
      <div style="margin-top: 1.5rem; font-size: 3rem; font-weight: 900; color: #E8C547;">${globalScore}<span style="font-size: 1.5rem; color: #888;">/10</span></div>
      <p style="font-size: 0.85rem; color: #888; margin-top: 0.25rem;">Score Global</p>
    </header>

    ${metricsHtml ? `<div style="margin-bottom: 2rem; padding: 1.5rem; border-radius: 12px; background: #111; border: 1px solid #222;">${metricsHtml}</div>` : ''}

    ${sectionsHtml}

    <footer style="text-align: center; padding: 2rem 0; margin-top: 2rem; border-top: 1px solid #222; color: #555; font-size: 0.8rem;">
      <p>APEXLABS by Achzod ,  apexlabs.achzodcoaching.com</p>
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
      res.setHeader("Content-Disposition", `attachment; filename=apexlabs-${auditId.slice(0, 8)}.html`);
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

  // Idempotent helper for one-shot order side-effects (CAPI, admin notif,
  // customer confirmation email). Both confirm-session and the Stripe
  // webhook can fire these in different orders depending on which wins the
  // post-payment race; the flag check keeps each effect to exactly once.
  const runOnceOnOrder = async (
    orderId: string,
    flagName: string,
    op: () => Promise<void>,
  ): Promise<void> => {
    try {
      const fresh = await storage.getOrder(orderId);
      const meta = (fresh?.metadata as Record<string, unknown> | null) ?? {};
      if (meta[flagName]) return;
      await op();
      await pool.query(
        `UPDATE orders SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object($1::text, true) WHERE id = $2`,
        [flagName, orderId],
      );
    } catch (err) {
      console.error(`[runOnceOnOrder] ${flagName} failed for ${orderId}:`, err);
    }
  };

  // Damien G. 2026-04-20 paid 59 EUR for Anabolic Bioscan with email
  // "damiengil09700@gmailcom" (missing dot before com). Our previous check
  // was email.includes("@") which passes a malformed address. We now require
  // domain to end with a dotted TLD so typos like @gmailcom or @gmial.com get
  // bounced at checkout instead of producing a paid orphan order with no way
  // to deliver the report.
  const isValidEmailFormat = (raw: unknown): boolean => {
    if (typeof raw !== "string") return false;
    const trimmed = raw.trim();
    if (trimmed.length < 6 || trimmed.length > 254) return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmed);
  };

  // Tier pricing for PEPTIDES_ENGINE (3 offres distinctes : Solo / Coached / Tracked).
  // Le rapport reste IDENTIQUE entre les tiers ; seul l'ecosysteme autour change.
  const PEPTIDES_TIER_PRICE_CENTS: Record<"solo" | "coached" | "tracked", number> = {
    solo: 19900,     // 199€ , protocole seul
    coached: 29900,  // 299€ , + 1 blood + 30j support (recommande)
    tracked: 39900,  // 399€ , + 2 blood + 90j support + 1 reecriture
  };

  function resolvePeptidesTier(raw: unknown): "solo" | "coached" | "tracked" {
    if (raw === "solo" || raw === "coached" || raw === "tracked") return raw;
    return "coached"; // default sweet spot if missing/invalid
  }

  app.post("/api/stripe/create-checkout-session", checkoutLimiter, async (req, res) => {
    try {
      const { priceId: clientPriceId, email, planType, responses, promoCode, referrer, fbp, fbc, userAgent, sourceUrl, peptidesEngineConsent, peptidesTier: rawTier } = req.body;
      if (!isValidEmailFormat(email)) {
        res.status(400).json({ error: "EMAIL_INVALID", message: "Adresse email invalide. Verifie qu'il y a bien un point dans le domaine (par exemple @gmail.com et non @gmailcom)." });
        return;
      }

      // Mandatory consent gate for PEPTIDES_ENGINE. Refus de checkout sans
      // acceptation explicite, horodatée et versionnée. Stocké dans
      // order.metadata pour preuve en cas de litige Stripe/PayPal.
      if (planType === "PEPTIDES_ENGINE") {
        if (!peptidesEngineConsent || peptidesEngineConsent.accepted !== true || typeof peptidesEngineConsent.version !== "string") {
          res.status(400).json({
            error: "CONSENT_REQUIRED",
            message: "Tu dois accepter les conditions de la commande Peptides Engine avant de payer.",
          });
          return;
        }
      }

      // Already paid check for ALL product types (prevents double charge)
      if (email && planType && planType !== "GRATUIT") {
        const existingOrders = await storage.getOrdersByEmail(email);
        const alreadyPaid = existingOrders.find((o: any) => o.productType === planType && o.status === "paid");
        if (alreadyPaid && planType !== "PEPTIDES_ENGINE" && planType !== "BLOOD_ANALYSIS") {
          console.log(`[Checkout] ${planType} already paid for ${email} , blocking re-payment`);
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
          console.log(`[Checkout] Peptides Engine already paid for ${email} , saving responses and generating in background`);
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
            // DO NOT generate in background , Render kills process after HTTP response.
            // Auto-recovery cron will detect and generate.
            console.log(`[Checkout] Peptides already paid for ${email}, cron will generate`);
          }
          // Respond IMMEDIATELY , don't wait for generation
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

      // Validate and apply promo code if provided.
      // Trim + uppercase so a pasted code with leading/trailing whitespace or
      // lowercase letters still validates (Achzod report 2026-05-10).
      let discounts: any[] = [];
      let validatedPromoCode: string | null = null;
      const promoCodeNormalized = typeof promoCode === "string" ? promoCode.trim().toUpperCase() : null;

      if (promoCodeNormalized) {
        const validation = await storage.validatePromoCode(promoCodeNormalized, planType);
        if (validation.valid) {
          validatedPromoCode = promoCodeNormalized;

          // Create a Stripe coupon dynamically
          try {
            const couponId = `NEUROCORE_${promoCodeNormalized}_${Date.now()}`;
            // Flash campaign: PEPTIDES100 = exact -100€ off (not %, regardless of DB %).
            // Marc M. 2026-05-11 22:02 incident: PEPTIDES100 applied to an ELITE (79€)
            // order produced -100€ → 0€ free product. We restricted the promo's
            // validFor to PEPTIDES_ENGINE in DB; we ALSO guard the code-level
            // special case here on planType, so even if a future promo with the
            // same code label exists on a different product, it never triggers
            // the flat -100€ branch.
            const isPeptides100OnPeptides =
              promoCodeNormalized === 'PEPTIDES100' && planType === 'PEPTIDES_ENGINE';
            const couponParams: any = isPeptides100OnPeptides
              ? { id: couponId, amount_off: 10000, currency: 'eur', duration: 'once', max_redemptions: 1 }
              : { id: couponId, percent_off: validation.discount, duration: 'once', max_redemptions: 1 };
            const coupon = await stripe.coupons.create(couponParams);
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
            await grantBloodCreditsForOrder(
              order.id,
              email,
              BLOOD_ANALYSIS_PURCHASE_CREDITS,
              "bloodCreditGranted",
            );
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
        ? `${baseUrl}/peptides-engine?cancelled=true`
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
          // Don't block checkout , continue anyway
        }
      }

      // For PEPTIDES_ENGINE we use inline price_data so we can set the amount
      // dynamically based on the selected tier (Solo 199 / Coached 299 /
      // Tracked 399). For other products we still use the configured priceId.
      const peptidesTier = planType === "PEPTIDES_ENGINE" ? resolvePeptidesTier(rawTier) : null;
      const peptidesTierCents = peptidesTier ? PEPTIDES_TIER_PRICE_CENTS[peptidesTier] : 0;

      const lineItems = peptidesTier
        ? [{
            quantity: 1,
            price_data: {
              currency: 'eur',
              unit_amount: peptidesTierCents,
              product_data: {
                name: `Peptides Engine ${peptidesTier.charAt(0).toUpperCase() + peptidesTier.slice(1)}`,
                description:
                  peptidesTier === "solo"
                    ? "Protocole peptides personnalise + acces source + credit deduction coaching 199 EUR."
                    : peptidesTier === "coached"
                    ? "Protocole peptides personnalise + 1 bilan sanguin + 30j support + credit deduction coaching 299 EUR."
                    : "Protocole peptides personnalise + 2 bilans sanguins + 90j support + 1 reecriture + credit deduction coaching 399 EUR.",
              },
            },
          }]
        : [{ price: priceId, quantity: 1 }];

      const sessionParams: any = {
        payment_method_types: ['card'],
        line_items: lineItems,
        mode: 'payment',
        success_url: successUrl,
        cancel_url: cancelUrl,
        customer_email: email,
        metadata: {
          email,
          planType,
          peptidesTier: peptidesTier || '',
          responses: responses ? JSON.stringify(responses).substring(0, 500) : '',
          promoCode: validatedPromoCode || '',
          referrer: referrer || '',
          // Meta CAPI attribution: forwarded from the browser so the webhook
          // handler can send these with the Purchase event for better match quality.
          // Stripe metadata values must be strings <= 500 chars.
          fbp: (fbp || '').toString().slice(0, 500),
          fbc: (fbc || '').toString().slice(0, 500),
          user_agent: (userAgent || req.get('user-agent') || '').toString().slice(0, 500),
          client_ip: (req.ip || '').toString().slice(0, 45),
          source_url: (sourceUrl || referrer || '').toString().slice(0, 500),
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
        // For PEPTIDES_ENGINE the amount depends on the selected tier (Solo
        // 199 / Coached 299 / Tracked 399). For other product types we still
        // use the static ProductPriceCents map.
        const baseCents = pType === "PEPTIDES_ENGINE" && peptidesTier
          ? PEPTIDES_TIER_PRICE_CENTS[peptidesTier]
          : (ProductPriceCents[pType] ?? 0);
        const promoObj = validatedPromoCode ? await storage.getPromoCode(validatedPromoCode) : null;
        // PEPTIDES100 uses amount_off=10000 cents at Stripe, regardless of stored %.
        // Guard on planType so the flat -100€ never applies to another product
        // (Marc M. 2026-05-11 ELITE 0€ incident).
        const discountCents = promoObj
          ? (validatedPromoCode?.toUpperCase() === 'PEPTIDES100' && pType === 'PEPTIDES_ENGINE'
              ? 10000
              : Math.round(baseCents * promoObj.discountPercent / 100))
          : 0;

        // Persist consent record with server-authoritative timestamp + IP + UA.
        // This is the legal evidence pack we hand to Stripe/PayPal in a dispute.
        const peptidesConsentRecord = (planType === "PEPTIDES_ENGINE" && peptidesEngineConsent)
          ? {
              accepted: true,
              version: String(peptidesEngineConsent.version),
              text: typeof peptidesEngineConsent.text === "string"
                ? String(peptidesEngineConsent.text).slice(0, 4000)
                : undefined,
              clientAcceptedAt: typeof peptidesEngineConsent.clientAcceptedAt === "string"
                ? peptidesEngineConsent.clientAcceptedAt
                : undefined,
              serverAcceptedAt: new Date().toISOString(),
              ipAddress: (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.ip || null,
              userAgent: req.headers["user-agent"] || null,
              paymentMethod: "stripe" as const,
            }
          : undefined;

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
          metadata: {
            planType,
            peptidesTier: peptidesTier || undefined,
            peptidesResponses: planType === "PEPTIDES_ENGINE" ? responses : undefined,
            peptidesEngineConsent: peptidesConsentRecord,
          },
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
  // Idempotent blood credit grant for paid orders. Both Stripe confirm-session
  // and the Stripe webhook can race; whichever wins marks the order as paid
  // and the loser's credit-grant block is skipped. We track grant status on the
  // order metadata so the second arrival is a no-op instead of skipping silently.
  async function grantBloodCreditsForOrder(
    orderId: string,
    email: string,
    creditCount: number,
    metadataFlag: "bloodCreditGranted" | "peptidesCreditsGranted",
  ): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const check = await client.query(
        `SELECT metadata FROM orders WHERE id = $1 FOR UPDATE`,
        [orderId],
      );
      if (!check.rows.length) {
        throw new Error(`Order ${orderId} not found while granting blood credits`);
      }
      const meta = (check.rows[0]?.metadata ?? {}) as Record<string, unknown>;
      if (meta[metadataFlag] === true) {
        await client.query("COMMIT");
        return;
      }

      const normalizedEmail = email.trim().toLowerCase();
      await client.query(
        `INSERT INTO users (id, email, credits, created_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (email)
         DO UPDATE SET credits = users.credits + EXCLUDED.credits`,
        [crypto.randomUUID(), normalizedEmail, creditCount],
      );
      await client.query(
        `UPDATE orders SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object($1::text, true) WHERE id = $2`,
        [metadataFlag, orderId],
      );
      await client.query("COMMIT");
      console.log(`[Credit] Granted +${creditCount} blood credit(s) to ${email} for order ${orderId} (${metadataFlag})`);
    } catch (err) {
      await client.query("ROLLBACK").catch(() => {});
      console.error(`[Credit] Failed to grant credits for order ${orderId}:`, err);
      throw err;
    } finally {
      client.release();
    }
  }

  // Reconcile a single PayPal order whose browser-initiated capture call
  // never reached us (Mounir Hadir, 2026-05-13: tab closed after PayPal
  // success, order stayed pending in DB while PayPal had it as COMPLETED).
  // Re-reads the order from PayPal, extracts the capture id + payer email
  // from the live order representation, marks the DB row paid, runs the
  // same downstream side effects (credits, admin notif). Returns a small
  // result object describing what happened. Idempotent.
  async function reconcilePaypalOrderById(orderId: string): Promise<{
    status: "already_paid" | "reconciled" | "not_completed" | "not_found" | "no_paypal_id" | "error";
    orderId: string;
    paypalOrderId?: string;
    paypalStatus?: string;
    captureId?: string;
    error?: string;
  }> {
    const order = await storage.getOrder(orderId).catch(() => null);
    if (!order) return { status: "not_found", orderId };
    if (order.status === "paid") return { status: "already_paid", orderId };
    const paypalOrderId = (order as any).paypalOrderId;
    if (!paypalOrderId) return { status: "no_paypal_id", orderId };

    try {
      const { getPayPalOrderDetails } = await import("./paypalClient");
      const details = await getPayPalOrderDetails(paypalOrderId);
      const ppStatus = details?.status as string | undefined;
      if (ppStatus !== "COMPLETED") {
        return { status: "not_completed", orderId, paypalOrderId, paypalStatus: ppStatus };
      }

      const capture = details?.purchase_units?.[0]?.payments?.captures?.[0];
      const captureId: string = capture?.id || "";
      const payerEmail: string =
        details?.payer?.email_address ||
        details?.payment_source?.paypal?.email_address ||
        "";
      const paidAtRaw: string =
        capture?.create_time || capture?.update_time || details?.update_time || new Date().toISOString();
      const paidAt = new Date(paidAtRaw);

      const newMeta = {
        ...((order.metadata as any) || {}),
        paypalCaptureId: captureId,
        payerEmail,
        reconciledByCron: new Date().toISOString(),
        reconciledReason: "browser-initiated capture missed, recovered via PayPal API poll",
      };
      await storage.updateOrder(order.id, { status: "paid", paidAt, metadata: newMeta });

      const email = order.email;
      const productType = order.productType;

      // Credits for products that grant them (matches the capture endpoint)
      if (productType === "BLOOD_ANALYSIS") {
        await grantBloodCreditsForOrder(
          order.id,
          email,
          BLOOD_ANALYSIS_PURCHASE_CREDITS,
          "bloodCreditGranted",
        ).catch(() => {});
      } else if (productType === "PEPTIDES_ENGINE") {
        await grantBloodCreditsForOrder(order.id, email, 2, "peptidesCreditsGranted").catch(() => {});
      }

      // Admin payment notification (mirrors capture endpoint)
      try {
        const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || "coaching@achzodcoaching.com";
        const amount = (order.finalAmountCents / 100).toFixed(2);
        const productLabel = (order as any).productName || productType;
        await sendCTAEmail(
          adminEmail,
          `PAIEMENT ${amount}EUR , ${productLabel} (PayPal RECONCILE) , ${email}`,
          `PAIEMENT RECONCILE depuis dashboard PayPal (le navigateur du client n'a pas relaye le capture).\n\nProduit: ${productLabel}\nEmail: ${email}\nMontant: ${amount}EUR\nPromo: ${(order as any).promoCode || "aucun"}\n\nOrder ID: ${order.id}\nPayPal Order ID: ${paypalOrderId}\nPayPal Capture ID: ${captureId}\nPaid at (PayPal): ${paidAtRaw}\n\nLe rapport peptides sera genere par le cron autogen sur le prochain tick. La livraison email sera envoyee a l'heure programmee (anti-automation).`
        );
      } catch (notifErr) {
        console.error("[PayPal Reconcile] Admin notif failed:", notifErr);
      }

      console.log(`[PayPal Reconcile] ✅ Order ${order.id} (${email}) marked paid from PayPal status COMPLETED`);
      return {
        status: "reconciled",
        orderId,
        paypalOrderId,
        paypalStatus: ppStatus,
        captureId,
      };
    } catch (err: any) {
      console.error(`[PayPal Reconcile] Failed for order ${orderId}:`, err?.message || err);
      return { status: "error", orderId, error: err?.message || String(err) };
    }
  }

  // Admin: reconcile ALL pending orders that have a paypalOrderId (one-shot).
  // Used after deploys + as the body of the periodic reconcile cron below.
  async function reconcileAllPendingPaypalOrders(maxAgeHours: number = 168): Promise<{
    scanned: number;
    reconciled: string[];
    stillPending: string[];
    errors: Array<{ orderId: string; error: string }>;
  }> {
    const { orders } = await storage.getAllOrders({ status: "pending", limit: 500 });
    const cutoff = Date.now() - maxAgeHours * 3600 * 1000;
    const candidates = orders.filter((o: any) =>
      o.paypalOrderId &&
      new Date(o.createdAt).getTime() >= cutoff &&
      !o.email?.includes("test") &&
      !o.email?.includes("debug")
    );
    const reconciled: string[] = [];
    const stillPending: string[] = [];
    const errors: Array<{ orderId: string; error: string }> = [];
    for (const o of candidates) {
      const result = await reconcilePaypalOrderById(o.id);
      if (result.status === "reconciled") reconciled.push(o.id);
      else if (result.status === "not_completed") stillPending.push(o.id);
      else if (result.status === "error") errors.push({ orderId: o.id, error: result.error || "unknown" });
    }
    console.log(
      `[PayPal Reconcile Cron] Scanned ${candidates.length} candidates: ${reconciled.length} reconciled, ${stillPending.length} still pending on PayPal, ${errors.length} errors`
    );
    return { scanned: candidates.length, reconciled, stillPending, errors };
  }

  app.post("/api/admin/paypal/reconcile-pending", async (req, res) => {
    if (!requireAdminAuth(req, res)) return;
    try {
      const maxAgeHours = Number((req.body as any)?.maxAgeHours ?? 168);
      const out = await reconcileAllPendingPaypalOrders(maxAgeHours);
      res.json({ success: true, ...out });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || "Erreur serveur" });
    }
  });

  app.post("/api/admin/paypal/reconcile/:orderId", async (req, res) => {
    if (!requireAdminAuth(req, res)) return;
    try {
      const out = await reconcilePaypalOrderById(req.params.orderId);
      res.json({ success: true, ...out });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || "Erreur serveur" });
    }
  });

  // Periodic reconciliation cron ,  every 10 min. Catches any PayPal capture
  // that the browser-initiated flow missed (closed tab, network hiccup, ad
  // blocker eating the XHR). Combined with the existing peptides autogen
  // cron, a missed capture now self-heals within ~15 min instead of staying
  // pending until a client emails Achzod days later.
  let paypalReconcileRunning = false;
  setInterval(async () => {
    if (paypalReconcileRunning) return;
    paypalReconcileRunning = true;
    try {
      const memRssMb = Math.round(process.memoryUsage().rss / 1024 / 1024);
      if (memRssMb > 440) {
        console.warn(`[PayPal Reconcile Cron] ⚠️ Skipping , RSS ${memRssMb}MB > 440MB`);
        return;
      }
      await reconcileAllPendingPaypalOrders(168);
    } catch (err) {
      console.error("[PayPal Reconcile Cron] Cycle error:", err);
    } finally {
      paypalReconcileRunning = false;
    }
  }, 10 * 60 * 1000);

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
      // Don't block if already paid , create audit anyway and warn
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
      ELITE: { code: "ULTIMATE79", label: "79€ déduits de ta formule coaching (Essential/Elite/Private Lab)" },
      PREMIUM: { code: "BIOSCAN59", label: "59€ déduits de ta formule coaching (Essential/Elite/Private Lab)" },
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
      // Reject un-interpolated templates like "$", "${CHECKOUT_SESSION_ID}", "{id}".
      // Without this, Stripe returns "No such checkout.session: $" which pollutes
      // logs and surfaces a confusing error to the client.
      if (
        sessionId.length < 10 ||
        sessionId === "$" ||
        sessionId.includes("{") ||
        sessionId.includes("}")
      ) {
        console.warn(`[confirm-session] Rejected malformed sessionId: "${sessionId}" , template not interpolated`);
        res.status(400).json({ error: "sessionId_malformed" });
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

      // PEPTIDES_ENGINE is a valid plan; the webhook + autogen handle its
      // generation separately from the audit pipeline. Confirm-session should
      // acknowledge the payment and redirect without trying to create an audit.
      if (planType === "PEPTIDES_ENGINE") {
        const existingOrder = await storage.getOrderByStripeSession(sessionId);
        if (existingOrder && existingOrder.status !== "paid") {
          await storage.updateOrder(existingOrder.id, {
            status: "paid",
            paidAt: new Date(),
            stripePaymentIntentId: (session as any).payment_intent || null,
            stripeCustomerId: (session as any).customer || null,
          });
        }
        if (existingOrder && email) {
          await grantBloodCreditsForOrder(existingOrder.id, email, 2, "peptidesCreditsGranted");
        }
        res.json({ success: true, auditId: "", auditType: "PEPTIDES_ENGINE", email, generating: true });
        return;
      }

      if (planType !== "GRATUIT" && planType !== "PREMIUM" && planType !== "ELITE" && planType !== "BLOOD_ANALYSIS") {
        console.warn(`[confirm-session] Unknown planType: "${planType}" for session ${sessionId} (email=${email})`);
        res.status(400).json({ error: "PLAN_INVALID", receivedPlanType: planType });
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
          await grantBloodCreditsForOrder(
            existingOrder.id,
            email,
            BLOOD_ANALYSIS_PURCHASE_CREDITS,
            "bloodCreditGranted",
          );

          // Customer confirmation email with PDF instructions + magic link
          // walkthrough. Without this, clients whose confirm-session beats
          // the Stripe webhook to "paid" status get no email and never know
          // how to upload their bloodwork PDF (the webhook block at line
          // 7228 is gated on order.status === "pending"). Idempotent via
          // metadata flag so the webhook firing later doesn't double-send.
          await runOnceOnOrder(existingOrder.id, "customerConfirmEmailSentAt", async () => {
            const clientName2 = email.split("@")[0];
            const msg = `Salut ${clientName2},\n\nMerci pour ta commande Blood Analysis. Ton paiement est bien recu.\n\nVoici la liste exacte des marqueurs a demander a ton medecin ou directement au laboratoire (panel complet APEXLABS , 39 biomarqueurs) :\n\nPANEL 1 : HORMONES ANABOLIQUES\nTestosterone totale, Testosterone libre, SHBG, Cortisol (matin a jeun), DHEA-S, IGF-1, LH, FSH, Estradiol\n\nPANEL 2 : THYROIDE\nTSH, T3 libre, T4 libre, Anti-TPO\n\nPANEL 3 : METABOLISME ET LIPIDES\nGlycemie a jeun, HbA1c, Insuline a jeun, Cholesterol total, HDL, LDL, Triglycerides, ApoB, Lp(a)\n\nPANEL 4 : INFLAMMATION ET FER\nCRP ultra-sensible, Ferritine, Homocysteine, Vitesse de sedimentation\n\nPANEL 5 : VITAMINES ET MINERAUX\nVitamine D (25-OH), Vitamine B12, Magnesium, Zinc, Folates\n\nPANEL 6 : HEPATIQUE ET RENAL\nALAT, ASAT, Gamma-GT, Creatinine, DFG (eGFR), Acide urique\n\nNFS (Numeration Formule Sanguine) complete\n\nPresente-toi dans n'importe quel labo avec cette liste. La plupart acceptent sans ordonnance. Sinon, ton generaliste te fait l'ordonnance.\n\nUne fois ta prise de sang faite, uploade ton PDF sur : https://apexlabs.achzodcoaching.com/auth/login?next=%2Fblood-dashboard&email=${encodeURIComponent(email)}\n\nTu cliques sur le lien, tu recois un email avec un lien d'acces unique (verifie aussi tes spams), tu cliques dessus, tu arrives sur ton dashboard. La tu remplis tes infos, tu glisses ton PDF dans la zone d'upload, et tu lances l'analyse.\n\nIMPORTANT : un seul PDF par upload (10 MB max). Si tu as plusieurs fichiers a fusionner :\n- Sur iPhone (Fichiers) : mets tes PDFs dans un dossier, "Selectionner", coche-les dans l'ordre, "..." en bas, "Creer un PDF".\n- Alternative : ilovepdf.com/fr/fusionner_pdf , glisse-depose tes fichiers, telecharge le PDF unique, uploade-le.\n\nTon code promo : BLOOD99\n99€ deduits de ton coaching Elite/Private Lab 8 ou 12 semaines\nachzodcoaching.com/formules-coaching\n\nSi tu as des questions, reponds directement a cet email.\n\nAchzod`;
            await sendCTAEmail(email, "Blood Analysis : commande recue", msg);
          });

          // Admin payment notification ,  same idempotency: ensures Achzod
          // sees every paid order even when confirm-session wins the race.
          await runOnceOnOrder(existingOrder.id, "adminPaymentNotifSentAt", async () => {
            const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || "coaching@achzodcoaching.com";
            const amount = (existingOrder.finalAmountCents / 100).toFixed(2);
            await sendCTAEmail(
              adminEmail,
              `PAIEMENT ${amount}EUR , Blood Analysis (99EUR) , ${email}`,
              `PAIEMENT RECU!\n\nProduit: Blood Analysis\nClient: ${email}\nMontant: ${amount}EUR\nPromo: ${existingOrder.promoCode || "aucun"}\n\nOrder ID: ${existingOrder.id}`,
            );
          });
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

      const { email, planType, responses, promoCode, fbp, fbc, userAgent, sourceUrl, peptidesEngineConsent, peptidesTier: rawTier } = req.body;
      if (!email || !planType) {
        res.status(400).json({ error: "email et planType requis" });
        return;
      }
      if (!isValidEmailFormat(email)) {
        res.status(400).json({ error: "EMAIL_INVALID", message: "Adresse email invalide. Verifie qu'il y a bien un point dans le domaine (par exemple @gmail.com et non @gmailcom)." });
        return;
      }

      // Mandatory consent gate for PEPTIDES_ENGINE (idem Stripe).
      if (planType === "PEPTIDES_ENGINE") {
        if (!peptidesEngineConsent || peptidesEngineConsent.accepted !== true || typeof peptidesEngineConsent.version !== "string") {
          res.status(400).json({
            error: "CONSENT_REQUIRED",
            message: "Tu dois accepter les conditions de la commande Peptides Engine avant de payer.",
          });
          return;
        }
      }

      // Already paid check for ALL product types (prevents double charge via PayPal)
      if (email && planType && planType !== "GRATUIT") {
        const existingOrders = await storage.getOrdersByEmail(email);
        const alreadyPaid = existingOrders.find((o: any) => o.productType === planType && o.status === "paid");
        if (alreadyPaid && planType !== "PEPTIDES_ENGINE" && ["PREMIUM", "ELITE", "BLOOD_ANALYSIS"].includes(planType)) {
          console.log(`[PayPal] ${planType} already paid for ${email} , blocking re-payment`);
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
          console.log(`[PayPal] Peptides Engine already paid for ${email} , blocking re-payment`);
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
      // For PEPTIDES_ENGINE use the tier-specific price (Solo/Coached/Tracked).
      const peptidesTier = pType === "PEPTIDES_ENGINE" ? resolvePeptidesTier(rawTier) : null;
      const baseCents = peptidesTier
        ? PEPTIDES_TIER_PRICE_CENTS[peptidesTier]
        : (ProductPriceCents[pType] ?? 0);
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
          // PEPTIDES100 = flat -100EUR but ONLY on PEPTIDES_ENGINE
          // (Marc M. 2026-05-11 ELITE 0€ incident ,  see Stripe branch).
          discountCents = promoObj
            ? (promoCode.toUpperCase() === 'PEPTIDES100' && planType === 'PEPTIDES_ENGINE'
                ? 10000
                : Math.round(baseCents * promoObj.discountPercent / 100))
            : 0;
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
          await grantBloodCreditsForOrder(
            order.id,
            email,
            BLOOD_ANALYSIS_PURCHASE_CREDITS,
            "bloodCreditGranted",
          );
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
      const isPeptidesEngine = planType === "PEPTIDES_ENGINE";
      const returnUrl = isBloodAnalysis
        ? `${baseUrl}/blood-analysis?paypal=true`
        : `${baseUrl}/dashboard?success=true&paypal=true`;
      const cancelUrl = isBloodAnalysis
        ? `${baseUrl}/offers/blood-analysis?cancelled=true`
        : isPeptidesEngine
          ? `${baseUrl}/peptides-engine?cancelled=true`
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
        // Persist consent record with server-authoritative timestamp + IP + UA.
        // This is the legal evidence pack we hand to PayPal in a dispute.
        const peptidesConsentRecord = (planType === "PEPTIDES_ENGINE" && peptidesEngineConsent)
          ? {
              accepted: true,
              version: String(peptidesEngineConsent.version),
              text: typeof peptidesEngineConsent.text === "string"
                ? String(peptidesEngineConsent.text).slice(0, 4000)
                : undefined,
              clientAcceptedAt: typeof peptidesEngineConsent.clientAcceptedAt === "string"
                ? peptidesEngineConsent.clientAcceptedAt
                : undefined,
              serverAcceptedAt: new Date().toISOString(),
              ipAddress: (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.ip || null,
              userAgent: req.headers["user-agent"] || null,
              paymentMethod: "paypal" as const,
            }
          : undefined;

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
          metadata: {
            planType,
            peptidesTier: peptidesTier || undefined,
            paymentMethod: "paypal",
            peptidesResponses: planType === "PEPTIDES_ENGINE" ? responses : undefined,
            peptidesEngineConsent: peptidesConsentRecord,
            // Meta CAPI attribution , read by the capture handler to send Purchase CAPI event
            fbp: fbp || undefined,
            fbc: fbc || undefined,
            user_agent: userAgent || req.get("user-agent") || undefined,
            client_ip: req.ip || undefined,
            source_url: sourceUrl || undefined,
          },
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
        console.error(`[PayPal] Amount mismatch: captured ${capture.amountValue} ${capture.amountCurrency}, expected ${expectedEur} EUR for order ${existingOrder.id}. Payment was captured , needs manual refund.`);
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

      // Meta CAPI , server-side Purchase event for PayPal flow
      // event_id uses the PayPal order id so the client-side Pixel can dedup with the same value.
      try {
        const { sendMetaPurchase } = await import("./metaCapi.js");
        const existingMeta = (existingOrder.metadata ?? {}) as Record<string, string | undefined>;
        const valueEUR = (existingOrder.finalAmountCents ?? 0) / 100;
        const eventSourceUrl = existingMeta.source_url || `${getBaseUrl()}/`;
        await sendMetaPurchase({
          eventId: `paypal_${paypalOrderId}`,
          eventSourceUrl,
          valueEUR,
          currency: "EUR",
          contentIds: [planType || "unknown"],
          contentName: existingOrder.productName || planType || undefined,
          orderId: existingOrder.id,
          userData: {
            email: email || capture.payerEmail || undefined,
            fbp: existingMeta.fbp,
            fbc: existingMeta.fbc,
            ip: existingMeta.client_ip || req.ip,
            userAgent: existingMeta.user_agent || req.get("user-agent") || undefined,
            externalId: email || undefined,
          },
        });
      } catch (capiErr) {
        console.error(`[PayPal] Meta CAPI Purchase failed (non-blocking):`, capiErr);
      }

      // Admin notification for ALL PayPal payments
      try {
        const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || "coaching@achzodcoaching.com";
        const amount = (existingOrder.finalAmountCents / 100).toFixed(2);
        const productLabel = existingOrder.productName || planType;
        await sendCTAEmail(adminEmail, `PAIEMENT ${amount}EUR , ${productLabel} (PayPal) , ${email}`,
          `PAIEMENT RECU (PayPal)!\n\nProduit: ${productLabel}\nEmail: ${email}\nMontant: ${amount}EUR\nPromo: ${existingOrder.promoCode || "aucun"}\n\nOrder ID: ${existingOrder.id}`
        );
        console.log(`[PayPal] Admin payment notification sent for order ${existingOrder.id}`);
      } catch (notifErr) {
        console.error(`[PayPal] Admin notification failed:`, notifErr);
      }

      // BLOOD_ANALYSIS: just mark paid, no audit to create
      if (planType === "BLOOD_ANALYSIS") {
        await grantBloodCreditsForOrder(
          existingOrder.id,
          email,
          BLOOD_ANALYSIS_PURCHASE_CREDITS,
          "bloodCreditGranted",
        );
        // Send confirmation email
        sendCTAEmail(email, "Blood Analysis : paiement recu",
          `Salut,\n\nMerci pour ta commande Blood Analysis. Ton paiement est bien recu.\n\nVoici la liste exacte des marqueurs a demander a ton medecin ou directement au laboratoire. Tu peux te presenter dans n'importe quel labo d'analyses (Cerba, Biogroup, ou ton labo habituel) avec cette liste. La plupart des labos acceptent sans ordonnance (tu paies de ta poche). Sinon, un passage chez ton generaliste pour l'ordonnance et c'est rembourse.\n\nPANEL 1 : HORMONES ANABOLIQUES\nTestosterone totale, Testosterone libre, SHBG, Cortisol (matin a jeun), DHEA-S, IGF-1, LH, FSH, Estradiol\n\nPANEL 2 : THYROIDE\nTSH, T3 libre, T4 libre, Anti-TPO\n\nPANEL 3 : METABOLISME ET LIPIDES\nGlycemie a jeun, HbA1c, Insuline a jeun, Cholesterol total, HDL, LDL, Triglycerides, ApoB, Lp(a)\n\nPANEL 4 : INFLAMMATION ET FER\nCRP ultra-sensible, Ferritine, Homocysteine, Vitesse de sedimentation\n\nPANEL 5 : VITAMINES ET MINERAUX\nVitamine D (25-OH), Vitamine B12, Magnesium, Zinc, Folates\n\nPANEL 6 : HEPATIQUE ET RENAL\nALAT, ASAT, Gamma-GT, Creatinine, DFG (eGFR), Acide urique\n\nNFS (Numeration Formule Sanguine) complete\n\nUne fois ta prise de sang faite, uploade ton PDF de resultats sur ton dashboard APEXLABS :\nhttps://apexlabs.achzodcoaching.com/auth/login?next=%2Fblood-dashboard&email=${encodeURIComponent(email)}\n\nTu cliques sur le lien, tu recois un email avec un lien d'acces unique (verifie aussi tes spams), tu cliques dessus, tu arrives sur ton dashboard. La tu remplis tes infos, tu glisses ton PDF dans la zone d'upload, et tu lances l'analyse.\n\nIMPORTANT : un seul PDF par upload (10 MB max). Si tu as plusieurs fichiers a fusionner :\n- Sur iPhone (Fichiers) : mets tes PDFs dans un dossier, "Selectionner", coche-les dans l'ordre, "..." en bas, "Creer un PDF".\n- Alternative : ilovepdf.com/fr/fusionner_pdf , glisse-depose tes fichiers, telecharge le PDF unique, uploade-le.\n\nTu recevras ton analyse complete sous 24h.\n\nTon code promo : BLOOD99\n99€ deduits de ton coaching Elite/Private Lab 8 ou 12 semaines\nachzodcoaching.com/formules-coaching\n\nSi tu as des questions, reponds directement a cet email.\n\nAchzod`
        ).catch(() => {});
        res.json({ success: true, auditId: "", auditType: "BLOOD_ANALYSIS", email });
        return;
      }

      // PEPTIDES_ENGINE: trigger background generation from saved responses
      if (planType === "PEPTIDES_ENGINE") {
        console.log(`[PayPal] Peptides Engine paid for ${email} , triggering generation`);
        // Add +2 blood credits via idempotent helper (was a raw UPDATE that
        // would double-grant on PayPal capture retry; the helper sets a
        // metadata flag and skips if already granted).
        await grantBloodCreditsForOrder(existingOrder.id, email, 2, "peptidesCreditsGranted");

        // DO NOT generate in background here , Render kills the process after HTTP response.
        // The auto-recovery cron will detect this order (paid, no reportId) and generate.
        // Respond immediately so the client gets redirected.
        console.log(`[PayPal] Peptides Engine: order marked paid, cron will generate report for ${email}`);

        res.json({ success: true, auditId: "", auditType: "PEPTIDES_ENGINE", email, generating: true });
        return;
      }

      if (planType !== "PREMIUM" && planType !== "ELITE" && planType !== "GRATUIT") {
        console.warn(`[PayPal capture] Unknown planType reached audit creation: "${planType}" (email=${email})`);
        res.status(400).json({ error: "PLAN_INVALID", receivedPlanType: planType });
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
  // Accepts optional skipEmail=true to generate without sending (for validation before delivery)
  // Accepts optional replaceReportId to update an existing report in-place (same URL)
  app.post("/api/admin/peptides-generate", async (req, res) => {
    if (!requireAdminAuth(req, res)) return;
    try {
      const { email, skipEmail, replaceReportId } = req.body;
      if (!email) { res.status(400).json({ error: "email requis" }); return; }

      // Get saved responses
      const progress = await storage.getBurnoutProgress(`peptides::${email}`);
      const responses = progress?.responses;
      if (!responses || Object.keys(responses).length < 3) {
        res.status(404).json({ error: "Aucune reponse sauvegardee pour cet email", keys: Object.keys(responses || {}).length });
        return;
      }

      console.log(`[Admin] Force generating peptides for ${email} (${Object.keys(responses).length} responses)`);

      // Find the paid order for this email up-front (needed for CAS)
      const orders = await storage.getOrdersByEmail(email);
      const pepOrder = orders.find((o: any) => o.productType === "PEPTIDES_ENGINE" && o.status === "paid");

      // CROSS-ORDER PROTECTION: if the client paid twice (2 distinct orders), scan
      // ALL paid orders of the same email , not just the first. Without this, the
      // CAS below runs against a DIFFERENT order.id and succeeds, even though
      // another order already has a generated report.
      if (!replaceReportId) {
        const cross = await storage.hasAnyPeptidesReportForEmail(email).catch(() => ({ exists: false } as any));
        if (cross.exists) {
          res.status(409).json({
            error: "Un rapport peptides existe déjà pour ce client (scan multi-orders)",
            existingOrderId: cross.existingOrderId,
            existingReportId: cross.existingReportId,
            hint: "Utilise replaceReportId pour regénérer, ou rembourse l'order en double",
          });
          return;
        }
      }

      // SAFETY: email dedup (if not explicit replace, block re-send to same client)
      if (!replaceReportId && !skipEmail) {
        const alreadyEmailed = await storage.hasPeptidesDeliveryEmailBeenSent(email).catch(() => false);
        if (alreadyEmailed) {
          res.status(409).json({
            error: "Un email de livraison peptides a déjà été envoyé à ce client",
            hint: "Utilise skipEmail: true pour regénérer silencieusement",
          });
          return;
        }
      }

      // Generate synchronously (admin endpoint = manual trigger, can wait)
      const { generatePeptidesProtocol } = await import("./peptidesEngine");
      const manualTier = ((pepOrder?.metadata as any)?.peptidesTier as "solo" | "coached" | "tracked" | undefined) ?? "coached";
      const report = await generatePeptidesProtocol(responses, email, manualTier);

      let saved;
      let claimed = true;
      if (replaceReportId) {
        // Update existing report in-place , keeps same URL
        const updated = await storage.updateBurnoutReport(replaceReportId, report);
        if (!updated) {
          res.status(404).json({ error: `Report ${replaceReportId} not found for in-place update` });
          return;
        }
        saved = updated;
        console.log(`[Admin] Peptides protocol UPDATED in-place for ${email}: ${saved.id}`);
      } else {
        saved = await storage.createBurnoutReport({ email: `peptides::${email}`, responses: responses || {}, report });
        console.log(`[Admin] Peptides protocol generated for ${email}: ${saved.id}`);

        // Atomic CAS , if another process (autogen) already claimed, we become orphan
        if (pepOrder) {
          claimed = await storage.claimPeptidesReportSlot(pepOrder.id, saved.id);
          if (!claimed) {
            console.warn(`[Admin] ⚠️ CAS lost , another process already delivered for ${email}. Report ${saved.id} is orphan, NO email sent.`);
            res.status(409).json({
              error: "Race condition: un autre processus a livré pendant la génération",
              orphanReportId: saved.id,
              hint: "Vérifie les orders , peptidesReportId est déjà set",
            });
            return;
          }
        }
      }

      const baseUrl = getBaseUrl();
      const peptidesNames = report.peptides?.map((p: any) => p.name).join(", ") ?? "voir rapport";

      // ANTI-AUTOMATION DELIVERY GATE
      // ─────────────────────────────
      // Even when an admin triggers generation manually (recovery / debug),
      // we DO NOT mail the client immediately at gen-time. Sending a 300-line
      // personalized report 30 min after a 399 EUR purchase screams "AI" and
      // breaks the "hand-written by Achzod" positioning the brand depends on.
      // Two paths from here:
      //   - Delivery already due (rare on manual trigger, common on backfills
      //     of paid orders older than scheduledAt): send the delivery email now.
      //   - Delivery NOT yet due: only send the order-confirmation email so
      //     the client gets a feedback signal that we got the payment. The
      //     autogen recovery cron will fire the real delivery email at the
      //     scheduled time.
      //
      // Caller can pass forceImmediate=true to skip the gate (use sparingly).
      const forceImmediate = !!(req.body as any)?.forceImmediate;
      const adminNotifEmail = process.env.ADMIN_NOTIFICATION_EMAIL || "coaching@achzodcoaching.com";

      let emailSent = false;
      let deliveryDeferred = false;
      let deliveryScheduledAtIso = "";

      if (!skipEmail) {
        const stillNotEmailed = !(await storage.hasPeptidesDeliveryEmailBeenSent(email).catch(() => false));
        if (!stillNotEmailed) {
          console.warn(`[Admin] Delivery email already sent for ${email} (last-moment dedup) , skipping`);
        } else {
          let deliveryDue = forceImmediate;
          let scheduledAt: Date | null = null;
          if (!forceImmediate && pepOrder) {
            try {
              const fresh = await storage.getOrder(pepOrder.id);
              if (fresh) {
                const due = await isPeptidesEmailDeliveryDue(fresh);
                deliveryDue = due.due;
                scheduledAt = due.scheduledAt;
              }
            } catch (gateErr) {
              console.error(`[Admin] Schedule gate read failed for ${email}:`, gateErr);
              deliveryDue = false; // safe default: defer
            }
          }

          if (deliveryDue) {
            const promoBlock = report.promoCodesGenerated?.length > 0
              ? `\n\nTes 2 Blood Analysis offertes (codes):\n${report.promoCodesGenerated.join("\n")}` : "";
            const coachingBlock = buildPeptidesCoachingDeductionBlock(
              (pepOrder?.metadata as any)?.peptidesTier ?? null
            );
            await sendCTAEmail(email, "Ton protocole peptides personnalisé est prêt",
              `Ton protocole peptides est prêt.\n\nPeptides recommandés : ${peptidesNames}\n\nAccède à ton rapport complet ici :\n${baseUrl}/peptides/${saved.id}${promoBlock}${coachingBlock}\n\nConserve ce lien , il est personnel et unique.\n\nAchzod`
            ).catch(() => {});
            emailSent = true;
            await sendCTAEmail(adminNotifEmail, `PEPTIDES GENERE , ${email}`, `Rapport genere et livre pour ${email}\nReport ID: ${saved.id}\nPeptides: ${peptidesNames}\nLien: ${baseUrl}/peptides/${saved.id}`).catch(() => {});
          } else if (scheduledAt) {
            deliveryDeferred = true;
            deliveryScheduledAtIso = scheduledAt.toISOString();
            // Send the order confirmation so the client knows the payment landed.
            const alreadyConfirmed = pepOrder ? await storage.hasPeptidesOrderConfirmationBeenSent(email).catch(() => false) : false;
            if (!alreadyConfirmed && pepOrder) {
              const firstName = (pepOrder.metadata as any)?.peptidesResponses?.prenom
                || (responses as any)?.pep_name
                || (email ? email.split("@")[0] : undefined);
              sendPeptidesOrderConfirmationEmail(email, {
                firstName,
                amountEur: ((pepOrder as any).finalAmountCents || 0) / 100,
                promoCode: (pepOrder as any).promoCode || null,
                peptidesNames,
                scheduledDeliveryAt: scheduledAt,
                bloodCreditsCount: Array.isArray(report.promoCodesGenerated) ? report.promoCodesGenerated.length : 0,
                orderId: pepOrder.id,
              }).catch((err) => console.error("[Admin Manual Gen] Confirmation email failed:", err));
            }
            const parisLocal = scheduledAt.toLocaleString("fr-FR", { timeZone: "Europe/Paris" });
            await sendCTAEmail(
              adminNotifEmail,
              `RAPPORT GENERE - LIVRAISON PROGRAMMEE , ${email}`,
              `Rapport Peptides Engine genere et stocke. Email de livraison client programme pour ${parisLocal} (Paris).\n\nGenere via /api/admin/peptides-generate (manuel). Aucune action requise: l'envoi automatique se fera a l'heure prevue par le cron de recovery.\n\nClient: ${email}\nPeptides: ${peptidesNames}\nReport ID: ${saved.id}\nLien: ${baseUrl}/peptides/${saved.id}`
            ).catch(() => {});
            console.log(`[Admin Manual Gen] Delivery DEFERRED for ${email} until ${deliveryScheduledAtIso} (anti-automation 4-8h gate)`);
          } else {
            console.warn(`[Admin Manual Gen] No schedule readable + forceImmediate=false for ${email} , delivery skipped this call`);
          }
        }
      } else {
        console.log(`[Admin] skipEmail=true , report generated but no email sent for ${email}`);
      }

      res.json({
        success: true,
        reportId: saved.id,
        peptideCount: report.peptides?.length ?? 0,
        sectionCount: report.sections?.length ?? 0,
        link: `${baseUrl}/peptides/${saved.id}`,
        emailSent,
        deliveryDeferred,
        scheduledDeliveryAt: deliveryScheduledAtIso || null,
        replaced: !!replaceReportId,
      });
    } catch (error: any) {
      console.error("[Admin] Peptides generate error:", error);
      res.status(500).json({ error: error.message || "Erreur generation" });
    }
  });

  // Admin: link an orphan paid Peptides Engine order to an existing report.
  // Aissa Moujtahid 2026-03-30: triple-paid 299 EUR (Stripe double-click race
  // before idempotency lock landed), generated only one report. The cross-
  // order dedup in the autogen cron correctly prevents 2 more reports from
  // being created, but it also leaves the duplicate orders permanently
  // stuck without metadata.peptidesReportId, which means our reorder emails,
  // analytics, and reconciliation tools all treat them as undelivered.
  // Use case: pass orderId + reportId after manually verifying ownership.
  app.post("/api/admin/peptides-link-order-to-report", async (req, res) => {
    if (!requireAdminAuth(req, res)) return;
    try {
      const { orderId, reportId } = req.body || {};
      if (!orderId || !reportId) {
        res.status(400).json({ error: "orderId et reportId requis" });
        return;
      }
      const order = await storage.getOrder(orderId);
      if (!order) { res.status(404).json({ error: "Order introuvable" }); return; }
      if (order.productType !== "PEPTIDES_ENGINE") {
        res.status(400).json({ error: `Order productType=${order.productType}, attendu PEPTIDES_ENGINE` });
        return;
      }
      const report = await storage.getBurnoutReport(reportId);
      if (!report) { res.status(404).json({ error: "Report introuvable" }); return; }
      // Sanity: report email matches order email (peptides::email convention)
      const reportEmail = String(report.email || "").replace(/^peptides::/i, "").toLowerCase();
      if (reportEmail !== String(order.email || "").toLowerCase()) {
        res.status(400).json({
          error: "Report email ne correspond pas a l'order email",
          orderEmail: order.email,
          reportEmail,
        });
        return;
      }
      const previous = (order.metadata as any)?.peptidesReportId;
      await storage.updateOrder(orderId, {
        metadata: { ...(order.metadata as object ?? {}), peptidesReportId: reportId },
      });
      res.json({ success: true, orderId, reportId, previous: previous ?? null });
    } catch (error: any) {
      console.error("[Admin] Link order to report error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Admin: correct a Peptides Engine typo email across order/report/progress.
  // Default is dry-run + delivery hold, so correcting the DB cannot silently
  // trigger the recovery cron before Achzod approves the exact client email.
  app.post("/api/admin/peptides-correct-email", async (req, res) => {
    if (!requireAdminAuth(req, res)) return;
    try {
      const {
        orderId,
        reportId,
        fromEmail,
        toEmail,
        apply = false,
        holdDelivery = true,
      } = req.body || {};
      const oldEmail = String(fromEmail || "").trim().toLowerCase();
      const newEmail = String(toEmail || "").trim().toLowerCase();
      if (!orderId || !reportId || !oldEmail || !newEmail || !newEmail.includes("@")) {
        res.status(400).json({ success: false, error: "orderId, reportId, fromEmail, toEmail requis" });
        return;
      }

      const order = await storage.getOrder(orderId);
      if (!order) { res.status(404).json({ success: false, error: "Order introuvable" }); return; }
      if (order.productType !== "PEPTIDES_ENGINE") {
        res.status(400).json({ success: false, error: `Order productType=${order.productType}, attendu PEPTIDES_ENGINE` });
        return;
      }
      if (String(order.email || "").toLowerCase() !== oldEmail) {
        res.status(400).json({ success: false, error: "fromEmail ne correspond pas a l'order", orderEmail: order.email });
        return;
      }
      const meta = (order.metadata as any) || {};
      if (meta?.peptidesReportId && meta.peptidesReportId !== reportId) {
        res.status(400).json({ success: false, error: "reportId ne correspond pas a metadata.peptidesReportId", metadataReportId: meta.peptidesReportId });
        return;
      }

      const report = await storage.getBurnoutReport(reportId);
      if (!report) { res.status(404).json({ success: false, error: "Report introuvable" }); return; }
      const reportEmail = String(report.email || "").replace(/^peptides::/i, "").toLowerCase();
      if (reportEmail !== oldEmail) {
        res.status(400).json({ success: false, error: "fromEmail ne correspond pas au report", reportEmail });
        return;
      }

      const progressOldKey = `peptides::${oldEmail}`;
      const progressNewKey = `peptides::${newEmail}`;
      const progressExists = await pool.query("SELECT id FROM burnout_progress WHERE email = $1", [progressOldKey]).catch(() => ({ rows: [] } as any));
      const progressTargetExists = await pool.query("SELECT id FROM burnout_progress WHERE email = $1", [progressNewKey]).catch(() => ({ rows: [] } as any));

      if (!apply) {
        res.json({
          success: true,
          dryRun: true,
          wouldUpdate: {
            orderId,
            reportId,
            orderEmail: { from: oldEmail, to: newEmail },
            reportEmail: { from: `peptides::${oldEmail}`, to: `peptides::${newEmail}` },
            progress: progressExists.rows.length > 0
              ? progressTargetExists.rows.length > 0 ? "target_exists_skip" : "move"
              : "not_found",
            holdDelivery: !!holdDelivery,
          },
        });
        return;
      }

      const nowIso = new Date().toISOString();
      const nextMeta = {
        ...meta,
        peptidesReportId: reportId,
        correctedEmailFrom: oldEmail,
        correctedEmailTo: newEmail,
        correctedEmailAt: nowIso,
        ...(holdDelivery ? { peptidesEmailHold: true, peptidesEmailHoldReason: "email_corrected_waiting_manual_resend" } : {}),
        peptidesResponses: {
          ...(meta.peptidesResponses || {}),
          pep_email: newEmail,
        },
      };
      await storage.updateOrder(orderId, { email: newEmail, metadata: nextMeta });

      await pool.query(
        `UPDATE burnout_reports
            SET email = $1,
                responses = CASE
                  WHEN jsonb_typeof(responses) = 'object'
                    THEN responses || jsonb_build_object('pep_email', $2::text)
                  ELSE responses
                END
          WHERE id = $3`,
        [progressNewKey, newEmail, reportId]
      );

      let progressAction = "not_found";
      if (progressExists.rows.length > 0) {
        if (progressTargetExists.rows.length > 0) {
          progressAction = "target_exists_skip";
        } else {
          await pool.query(
            `UPDATE burnout_progress
                SET email = $1,
                    responses = CASE
                      WHEN jsonb_typeof(responses) = 'object'
                        THEN responses || jsonb_build_object('pep_email', $2::text)
                      ELSE responses
                    END,
                    last_activity_at = NOW()
              WHERE email = $3`,
            [progressNewKey, newEmail, progressOldKey]
          );
          progressAction = "moved";
        }
      }

      res.json({
        success: true,
        dryRun: false,
        orderId,
        reportId,
        fromEmail: oldEmail,
        toEmail: newEmail,
        holdDelivery: !!holdDelivery,
        progressAction,
      });
    } catch (error: any) {
      console.error("[Admin Peptides Correct Email] Error:", error);
      res.status(500).json({ success: false, error: error?.message || "Erreur serveur" });
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

  app.post("/api/admin/blood-credits/add", async (req, res) => {
    if (!requireAdminAuth(req, res)) return;
    try {
      const { email, count, reason } = req.body as { email: string; count?: number; reason?: string };
      if (!email || typeof email !== "string") {
        res.status(400).json({ success: false, error: "email required" });
        return;
      }
      const n = typeof count === "number" && count > 0 ? Math.floor(count) : 1;
      const note = (reason || "manual admin grant").slice(0, 200);

      const { pool } = await import("./db");
      let user = await storage.getUserByEmail(email);
      let before = 0;
      let after = 0;
      if (!user) {
        const created = await storage.createUser({ email, credits: n });
        before = 0;
        after = (created as any)?.credits ?? n;
      } else {
        before = (user as any).credits ?? 0;
        const result = await pool.query(
          "UPDATE users SET credits = credits + $1 WHERE LOWER(email) = LOWER($2) RETURNING credits",
          [n, email]
        );
        after = result.rows[0]?.credits ?? (before + n);
      }
      console.log(`[Admin BloodCredit] +${n} credit(s) granted to ${email}: ${before} -> ${after} (reason: ${note})`);
      res.json({ success: true, email, added: n, creditsBefore: before, creditsAfter: after, reason: note });
    } catch (error: any) {
      console.error("[Admin BloodCredit Add] Error:", error);
      res.status(500).json({ success: false, error: error?.message || "Erreur serveur" });
    }
  });

  app.get("/api/admin/peptaura-catalog/status", (req, res) => {
    if (!requireAdminAuth(req, res)) return;
    res.json({ success: true, catalog: getPeptauraCatalogHealth() });
  });

  app.post("/api/admin/peptaura-catalog/refresh", async (req, res) => {
    if (!requireAdminAuth(req, res)) return;
    try {
      const result = await refreshPeptauraCatalog({ forceFresh: true });
      res.status(result.ok ? 200 : 503).json({
        success: result.ok,
        result,
        catalog: getPeptauraCatalogHealth(),
      });
    } catch (error: any) {
      console.error("[Admin Peptaura Refresh] Error:", error);
      res.status(500).json({ success: false, error: error?.message || "Erreur refresh Peptaura" });
    }
  });

  app.post("/api/admin/peptides/delivery-hold", async (req, res) => {
    if (!requireAdminAuth(req, res)) return;
    try {
      const { orderId, hold, reason } = req.body as {
        orderId?: string;
        hold?: boolean;
        reason?: string;
      };
      if (!orderId || typeof hold !== "boolean") {
        res.status(400).json({ success: false, error: "orderId et hold boolean requis" });
        return;
      }
      const order = await storage.getOrder(orderId);
      if (!order || order.productType !== "PEPTIDES_ENGINE") {
        res.status(404).json({ success: false, error: "Commande Peptides Engine introuvable" });
        return;
      }
      await storage.setOrderMetadataKey(orderId, "peptidesEmailHold", hold);
      await storage.setOrderMetadataKey(
        orderId,
        "peptidesEmailHoldReason",
        hold ? String(reason || "verification_manuelle").slice(0, 240) : ""
      );
      res.json({ success: true, orderId, hold, reason: hold ? reason || "verification_manuelle" : null });
    } catch (error: any) {
      console.error("[Admin Peptides Hold] Error:", error);
      res.status(500).json({ success: false, error: error?.message || "Erreur mise a jour hold" });
    }
  });

  app.post("/api/admin/peptides/test-generate", async (req, res) => {
    if (!requireAdminAuth(req, res)) return;
    try {
      const { responses, email } = req.body as { responses: Record<string, unknown>; email?: string };
      if (!responses || typeof responses !== "object") {
        res.status(400).json({ success: false, error: "responses object required" });
        return;
      }
      const testEmail = email || "test+iter@achzodcoaching.com";
      const jobTag = `peptides::test::${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const startedAt = Date.now();

      // Persist initial "running" state in burnout_reports so it survives Render restarts
      await storage.createBurnoutReport({
        email: jobTag,
        responses,
        report: { status: "running", startedAt, testEmail } as any,
      });

      // Fire-and-forget background generation that updates the DB row
      (async () => {
        try {
          const { generatePeptidesProtocol } = await import("./peptidesEngine");
          const report = await generatePeptidesProtocol(responses as any, testEmail);
          const rows = await storage.getAllBurnoutReports();
          const row = rows.find((r: any) => r.email === jobTag);
          if (row) {
            await storage.updateBurnoutReport(row.id, { status: "done", startedAt, finishedAt: Date.now(), testEmail, report });
          }
        } catch (err: any) {
          const rows = await storage.getAllBurnoutReports().catch(() => []);
          const row = rows.find((r: any) => r.email === jobTag);
          if (row) {
            await storage.updateBurnoutReport(row.id, { status: "error", startedAt, finishedAt: Date.now(), testEmail, error: err?.message || String(err) }).catch(() => {});
          }
        }
      })();

      res.json({ success: true, jobTag, status: "running" });
    } catch (error: any) {
      console.error("[Admin Test Generate] Error:", error);
      res.status(500).json({ success: false, error: error?.message || "Erreur serveur" });
    }
  });

  app.get("/api/admin/peptides/test-generate-status", async (req, res) => {
    if (!requireAdminAuth(req, res)) return;
    try {
      const jobTag = String(req.query.jobTag || "");
      if (!jobTag) {
        res.status(400).json({ success: false, error: "jobTag required" });
        return;
      }
      const rows = await storage.getAllBurnoutReports();
      const row = rows.find((r: any) => r.email === jobTag);
      if (!row) {
        res.status(404).json({ success: false, error: "Job not found" });
        return;
      }
      const rep = row.report as any;
      const elapsedSec = Math.round(((rep?.finishedAt || Date.now()) - (rep?.startedAt || Date.now())) / 1000);
      res.json({ success: true, jobTag, ...rep, elapsedSec });
    } catch (error: any) {
      console.error("[Admin Test Generate Status] Error:", error);
      res.status(500).json({ success: false, error: error?.message || "Erreur serveur" });
    }
  });

  app.post("/api/admin/peptides/send-order-confirmation", async (req, res) => {
    if (!requireAdminAuth(req, res)) return;
    try {
      const { orderId, force } = req.body as { orderId: string; force?: boolean };
      if (!orderId) {
        res.status(400).json({ success: false, error: "orderId required" });
        return;
      }
      const order = await storage.getOrder(orderId);
      if (!order) {
        res.status(404).json({ success: false, error: "Order not found" });
        return;
      }
      if (order.productType !== "PEPTIDES_ENGINE") {
        res.status(400).json({ success: false, error: `not a peptides order (type=${order.productType})` });
        return;
      }
      const email = order.email;
      if (!email) {
        res.status(400).json({ success: false, error: "order has no email" });
        return;
      }
      if (!force) {
        const alreadyConfirmed = await storage.hasPeptidesOrderConfirmationBeenSent(email).catch(() => false);
        if (alreadyConfirmed) {
          res.json({ success: false, skipped: "already_sent", email });
          return;
        }
      }

      const meta = (order.metadata as any) || {};
      const reportId = meta?.peptidesReportId;
      let peptidesNames = "voir rapport";
      let bloodCreditsCount = 0;
      if (reportId) {
        const existing = await storage.getBurnoutReport(reportId).catch(() => null);
        if (existing) {
          const r = existing.report as any;
          peptidesNames = r?.peptides?.map((p: any) => p.name).join(", ") || peptidesNames;
          bloodCreditsCount = Array.isArray(r?.promoCodesGenerated) ? r.promoCodesGenerated.length : 0;
        }
      }
      const scheduledAt = await resolvePeptidesEmailScheduledAt(order);
      const firstName = meta?.peptidesResponses?.prenom || email.split("@")[0];

      const sent = await sendPeptidesOrderConfirmationEmail(email, {
        firstName,
        amountEur: ((order as any).finalAmountCents || 0) / 100,
        promoCode: (order as any).promoCode || null,
        peptidesNames,
        scheduledDeliveryAt: scheduledAt,
        bloodCreditsCount,
        orderId: order.id,
      });

      res.json({ success: true, sent, email, scheduledAt: scheduledAt.toISOString(), peptidesNames, bloodCreditsCount });
    } catch (error: any) {
      console.error("[Admin Send Order Confirmation] Error:", error);
      res.status(500).json({ success: false, error: error?.message || "Erreur serveur" });
    }
  });

  // Admin: validate + recompute vials math for one peptides report.
  // GET (or POST without apply=true) returns a diff and the validator output.
  // POST { apply: true } persists the fixed report to DB. Used as a last-mile
  // pre-delivery gate for the 4 imminent scheduled orders + as a manual
  // recovery hook for any flagged report.
  app.post("/api/admin/peptides/recompute-vials/:reportId", async (req, res) => {
    if (!requireAdminAuth(req, res)) return;
    try {
      const { reportId } = req.params;
      const apply = !!(req.body as any)?.apply;
      const existing = await storage.getBurnoutReport(reportId);
      if (!existing || !String(existing.email ?? "").startsWith("peptides::")) {
        res.status(404).json({ success: false, error: "Peptides report not found" });
        return;
      }
      const { validateVialsMath } = await import("./peptidesEngine");
      const { validatePeptidesReport } = await import("./peptidesReportValidator");
      const before = JSON.parse(JSON.stringify(existing.report));
      const fixed = validateVialsMath(JSON.parse(JSON.stringify(before)));
      const validation = validatePeptidesReport(fixed);
      const diff: Array<{ name: string; vialsBefore: string; vialsAfter: string; priceBefore: string; priceAfter: string }> = [];
      const beforePeps = (before as any).peptides || [];
      const afterPeps = (fixed as any).peptides || [];
      for (let i = 0; i < beforePeps.length; i++) {
        const b = beforePeps[i];
        const a = afterPeps[i];
        if (b.vialsNeeded !== a.vialsNeeded || b.priceEstimate !== a.priceEstimate) {
          diff.push({
            name: a.name,
            vialsBefore: b.vialsNeeded,
            vialsAfter: a.vialsNeeded,
            priceBefore: b.priceEstimate,
            priceAfter: a.priceEstimate,
          });
        }
      }
      if (apply && diff.length > 0) {
        await storage.updateBurnoutReport(reportId, fixed);
        console.log(`[Admin Peptides Patch] Persisted recompute for ${reportId}, ${diff.length} peptides changed`);
      }
      res.json({
        success: true,
        reportId,
        applied: apply,
        changes: diff,
        validation,
      });
    } catch (error: any) {
      console.error("[Admin Peptides Recompute] Error:", error);
      res.status(500).json({ success: false, error: error?.message || "Erreur serveur" });
    }
  });

  // Admin: full deterministic repair before delivery.
  // Recomputes vial quantities, refreshes every selected Peptaura listing,
  // replaces unsafe legacy sections, applies the paid tier and persists only
  // when the strict validator returns ok=true.
  app.post("/api/admin/peptides/repair-live/:reportId", async (req, res) => {
    if (!requireAdminAuth(req, res)) return;
    try {
      const { reportId } = req.params;
      const apply = !!(req.body as any)?.apply;
      const existing = await storage.getBurnoutReport(reportId);
      if (!existing || !String(existing.email ?? "").startsWith("peptides::")) {
        res.status(404).json({ success: false, error: "Peptides report not found" });
        return;
      }

      const email = String(existing.email).slice("peptides::".length).toLowerCase();
      const orders = await storage.getOrdersByEmail(email);
      const order = orders.find((candidate: any) =>
        candidate.productType === "PEPTIDES_ENGINE"
        && candidate.status === "paid"
        && (
          String(candidate?.metadata?.peptidesReportId || "") === reportId
          || orders.filter((entry: any) => entry.productType === "PEPTIDES_ENGINE" && entry.status === "paid").length === 1
        )
      );
      if (!order) {
        res.status(404).json({ success: false, error: "Paid Peptides Engine order not found for report" });
        return;
      }

      const responses = (
        (existing as any).responses
        || (order.metadata as any)?.peptidesResponses
        || {}
      ) as Record<string, unknown>;
      if (Object.keys(responses).length < 3) {
        res.status(400).json({ success: false, error: "Client responses missing for live repair" });
        return;
      }

      const paidTier = String((order.metadata as any)?.peptidesTier || (existing.report as any)?.tier || "solo");
      const before = JSON.parse(JSON.stringify(existing.report));
      const repaired = await refreshPeptauraPricingForDelivery(before, responses, paidTier);
      const { validatePeptidesReport } = await import("./peptidesReportValidator");
      const validation = validatePeptidesReport(repaired);

      if (apply && !validation.ok) {
        res.status(422).json({
          success: false,
          reportId,
          applied: false,
          orderId: order.id,
          validation,
          error: "Strict validation failed, report not persisted",
        });
        return;
      }

      if (apply) {
        await storage.updateBurnoutReport(reportId, repaired);
        await storage.setOrderMetadataKey(order.id, "peptidesReportRepairedAt", new Date().toISOString());
        console.log(`[Admin Peptides Repair] Persisted validated live repair for ${reportId}`);
      }

      res.json({
        success: true,
        reportId,
        orderId: order.id,
        applied: apply,
        validation,
        tier: repaired.tier,
        peptides: repaired.peptides.map((peptide: any) => ({
          name: peptide.name,
          dosage: peptide.dosage,
          cycleDuration: peptide.cycleDuration,
          vialsNeeded: peptide.vialsNeeded,
          priceEstimate: peptide.priceEstimate,
          purchaseUrl: peptide.purchaseUrl,
        })),
        liveSync: (repaired as any)._peptauraLiveSync,
      });
    } catch (error: any) {
      console.error("[Admin Peptides Repair] Error:", error);
      res.status(500).json({ success: false, error: error?.message || "Erreur serveur" });
    }
  });

  // Admin: patch one or more section.content fields on a peptides report,
  // and optionally remove peptides from the report.peptides[] array.
  // Body: {
  //   patches?: [{ sectionId: string, content: string }],
  //   removePeptides?: string[]   // peptide.name values to remove
  // }
  // Used for surgical post-generation fixes on a delivered report without
  // regenerating the whole rationale (the URL stays the same, client sees
  // the corrected content on next page load).
  app.post("/api/admin/peptides/edit-sections/:reportId", async (req, res) => {
    if (!requireAdminAuth(req, res)) return;
    try {
      const { reportId } = req.params;
      const patches = (req.body as any)?.patches;
      const removePeptides = (req.body as any)?.removePeptides;
      if ((!Array.isArray(patches) || patches.length === 0) && (!Array.isArray(removePeptides) || removePeptides.length === 0)) {
        res.status(400).json({ success: false, error: "patches or removePeptides required" });
        return;
      }
      const existing = await storage.getBurnoutReport(reportId);
      if (!existing || !String(existing.email ?? "").startsWith("peptides::")) {
        res.status(404).json({ success: false, error: "Peptides report not found" });
        return;
      }
      const report = JSON.parse(JSON.stringify(existing.report)) as any;
      const sections = Array.isArray(report.sections) ? report.sections : [];
      const updated: string[] = [];
      const notFound: string[] = [];
      if (Array.isArray(patches)) {
        for (const p of patches) {
          const sid = String(p?.sectionId ?? "");
          const content = String(p?.content ?? "");
          if (!sid || !content) continue;
          const idx = sections.findIndex((s: any) => s?.id === sid);
          if (idx === -1) { notFound.push(sid); continue; }
          sections[idx].content = content;
          updated.push(sid);
        }
        report.sections = sections;
      }
      const peptidesRemoved: string[] = [];
      if (Array.isArray(removePeptides) && removePeptides.length > 0 && Array.isArray(report.peptides)) {
        const toRemove = new Set(removePeptides.map(String));
        const before = report.peptides.length;
        report.peptides = report.peptides.filter((p: any) => {
          if (p && toRemove.has(String(p.name))) {
            peptidesRemoved.push(String(p.name));
            return false;
          }
          return true;
        });
        console.log(`[Admin Peptides Edit] Removed ${before - report.peptides.length} peptides from ${reportId}: ${peptidesRemoved.join(", ")}`);
      }
      await storage.updateBurnoutReport(reportId, report);
      console.log(`[Admin Peptides Edit] Patched ${updated.length} sections on ${reportId}: ${updated.join(", ")}`);
      res.json({ success: true, reportId, updated, notFound, peptidesRemoved });
    } catch (error: any) {
      console.error("[Admin Peptides Edit] Error:", error);
      res.status(500).json({ success: false, error: error?.message || "Erreur serveur" });
    }
  });

  // Admin: validate a peptides report without modification. Returns
  // validator output for human review.
  app.get("/api/admin/peptides/validate/:reportId", async (req, res) => {
    if (!requireAdminAuth(req, res)) return;
    try {
      const { reportId } = req.params;
      const existing = await storage.getBurnoutReport(reportId);
      if (!existing || !String(existing.email ?? "").startsWith("peptides::")) {
        res.status(404).json({ success: false, error: "Peptides report not found" });
        return;
      }
      const { validatePeptidesReport } = await import("./peptidesReportValidator");
      const validation = validatePeptidesReport(existing.report as any);
      res.json({ success: true, reportId, validation });
    } catch (error: any) {
      console.error("[Admin Peptides Validate] Error:", error);
      res.status(500).json({ success: false, error: error?.message || "Erreur serveur" });
    }
  });

  app.post("/api/admin/audit/:auditId/check-completeness", async (req, res) => {
    if (!requireAdminAuth(req, res)) return;
    try {
      const { auditId } = req.params;
      const audit = await storage.getAudit(auditId);
      if (!audit) {
        res.status(404).json({ success: false, error: "Audit non trouvé" });
        return;
      }
      const { checkReportCompleteness } = await import("./reportCompleteness");
      const txt = (audit as any).reportTxt || (audit.narrativeReport as any)?.txt || "";
      const html = (audit as any).reportHtml || (audit.narrativeReport as any)?.html || "";
      const check = checkReportCompleteness(txt, html, audit.type as string);
      res.json({ success: true, auditId, type: audit.type, ...check });
    } catch (error: any) {
      console.error("[Admin Check Completeness] Error:", error);
      res.status(500).json({ success: false, error: error?.message || "Erreur serveur" });
    }
  });

  app.post("/api/admin/audits/check-all-completeness", async (req, res) => {
    if (!requireAdminAuth(req, res)) return;
    try {
      const types: string[] = Array.isArray(req.body?.types) && req.body.types.length
        ? req.body.types
        : ["ELITE", "PREMIUM"];
      const statuses: string[] = Array.isArray(req.body?.statuses) && req.body.statuses.length
        ? req.body.statuses
        : ["SENT", "READY", "NEEDS_REVIEW"];
      const flipToReview: boolean = req.body?.flipToReview === true;

      const { checkReportCompleteness } = await import("./reportCompleteness");
      const lightAudits = await storage.getAllAuditsLight();
      const candidates = lightAudits
        .filter(a => types.includes(a.type as string))
        .filter(a => statuses.includes(a.reportDeliveryStatus as string));

      const results: Array<any> = [];
      let okCount = 0;
      let failCount = 0;
      let flippedCount = 0;

      for (const lite of candidates) {
        try {
          const full = await storage.getAudit(lite.id);
          if (!full) continue;
          const txt = (full as any).reportTxt || (full.narrativeReport as any)?.txt || "";
          const html = (full as any).reportHtml || (full.narrativeReport as any)?.html || "";
          const check = checkReportCompleteness(txt, html, lite.type as string);
          if (check.ok) {
            okCount++;
            results.push({ id: lite.id, email: lite.email, type: lite.type, status: lite.reportDeliveryStatus, ok: true, sectionCount: check.sectionCount });
          } else {
            failCount++;
            if (flipToReview && lite.reportDeliveryStatus !== "NEEDS_REVIEW") {
              await storage.updateAudit(lite.id, { reportDeliveryStatus: "NEEDS_REVIEW" }).catch(() => {});
              flippedCount++;
            }
            results.push({
              id: lite.id,
              email: lite.email,
              type: lite.type,
              status: lite.reportDeliveryStatus,
              ok: false,
              sectionCount: check.sectionCount,
              errors: check.errors.map(e => `${e.code}${e.section ? `(${e.section})` : ""}`),
            });
          }
        } catch (e: any) {
          results.push({ id: lite.id, email: lite.email, error: e?.message });
        }
      }

      console.log(`[Admin Check All] ok=${okCount} fail=${failCount} flipped=${flippedCount} flipToReview=${flipToReview}`);
      res.json({
        success: true,
        flipToReview,
        total: candidates.length,
        ok: okCount,
        fail: failCount,
        flipped: flippedCount,
        results,
      });
    } catch (error: any) {
      console.error("[Admin Check All Completeness] Error:", error);
      res.status(500).json({ success: false, error: error?.message || "Erreur serveur" });
    }
  });

  app.post("/api/admin/backfill-rebuild-html", async (req, res) => {
    if (!requireAdminAuth(req, res)) return;
    try {
      const types: string[] = Array.isArray(req.body?.types) && req.body.types.length
        ? req.body.types
        : ["ELITE", "PREMIUM"];
      const statuses: string[] = Array.isArray(req.body?.statuses) && req.body.statuses.length
        ? req.body.statuses
        : ["SENT", "READY", "NEEDS_REVIEW"];
      const dryRun: boolean = req.body?.dryRun === true;
      const limit: number = typeof req.body?.limit === "number" && req.body.limit > 0
        ? Math.min(req.body.limit, 500)
        : 500;

      const { generatePremiumHTMLFromTxt } = await import("./exportServicePremium");

      const lightAudits = await storage.getAllAuditsLight();
      const candidates = lightAudits
        .filter(a => types.includes(a.type as string))
        .filter(a => statuses.includes(a.reportDeliveryStatus as string))
        .slice(0, limit);

      const results: Array<{
        id: string;
        email: string;
        type: string;
        status: string;
        txtLen: number;
        oldHtmlLen: number;
        newHtmlLen: number;
        delta: number;
        skipped?: string;
        error?: string;
      }> = [];

      let processed = 0;
      let rebuilt = 0;
      let totalDelta = 0;

      for (const lite of candidates) {
        processed++;
        try {
          const full = await storage.getAudit(lite.id);
          if (!full) {
            results.push({ id: lite.id, email: lite.email, type: lite.type as string, status: lite.reportDeliveryStatus as string, txtLen: 0, oldHtmlLen: 0, newHtmlLen: 0, delta: 0, skipped: "not_found" });
            continue;
          }
          const txt = (full as any).reportTxt || (full.narrativeReport as any)?.txt || "";
          const oldHtml = (full as any).reportHtml || "";
          if (!txt || txt.length < 1000) {
            results.push({ id: lite.id, email: lite.email, type: lite.type as string, status: lite.reportDeliveryStatus as string, txtLen: txt.length, oldHtmlLen: oldHtml.length, newHtmlLen: 0, delta: 0, skipped: "txt_too_short" });
            continue;
          }
          const photos = (full as any).photos || [];
          const responses = (full.responses as any) || {};
          const newHtml = generatePremiumHTMLFromTxt(txt, lite.id, photos, responses);
          const delta = newHtml.length - oldHtml.length;
          if (!dryRun) {
            await storage.updateAudit(lite.id, { reportHtml: newHtml } as any);
            rebuilt++;
          }
          totalDelta += delta;
          results.push({ id: lite.id, email: lite.email, type: lite.type as string, status: lite.reportDeliveryStatus as string, txtLen: txt.length, oldHtmlLen: oldHtml.length, newHtmlLen: newHtml.length, delta });
        } catch (e: any) {
          results.push({ id: lite.id, email: lite.email, type: lite.type as string, status: lite.reportDeliveryStatus as string, txtLen: 0, oldHtmlLen: 0, newHtmlLen: 0, delta: 0, error: e?.message || "unknown" });
        }
      }

      console.log(`[Admin Backfill] processed=${processed} rebuilt=${rebuilt} totalDelta=${totalDelta} dryRun=${dryRun}`);
      res.json({
        success: true,
        dryRun,
        processed,
        rebuilt,
        totalDelta,
        results,
      });
    } catch (error: any) {
      console.error("[Admin Backfill] Error:", error);
      res.status(500).json({ success: false, error: error?.message || "Erreur serveur" });
    }
  });

  app.post("/api/admin/audit/:auditId/restore-snapshot", async (req, res) => {
    if (!requireAdminAuth(req, res)) return;
    try {
      const { auditId } = req.params;
      const { narrativeReport, reportTxt, reportHtml, reportDeliveryStatus } = req.body as {
        narrativeReport?: any;
        reportTxt?: string;
        reportHtml?: string;
        reportDeliveryStatus?: string;
      };
      const audit = await storage.getAudit(auditId);
      if (!audit) {
        res.status(404).json({ success: false, error: "Audit non trouvé" });
        return;
      }
      const updates: any = {};
      if (narrativeReport !== undefined) updates.narrativeReport = narrativeReport;
      if (reportTxt !== undefined) updates.reportTxt = reportTxt;
      if (reportHtml !== undefined) updates.reportHtml = reportHtml;
      if (reportDeliveryStatus !== undefined) updates.reportDeliveryStatus = reportDeliveryStatus;
      if (Object.keys(updates).length === 0) {
        res.status(400).json({ success: false, error: "no fields to restore" });
        return;
      }
      await storage.updateAudit(auditId, updates);
      console.log(`[Admin Restore] audit=${auditId} restored: ${Object.keys(updates).join(", ")}`);
      res.json({
        success: true,
        auditId,
        restored: Object.keys(updates),
        narrativeReportSize: narrativeReport ? JSON.stringify(narrativeReport).length : 0,
        reportTxtSize: reportTxt?.length ?? 0,
        reportHtmlSize: reportHtml?.length ?? 0,
      });
    } catch (error: any) {
      console.error("[Admin Restore Snapshot] Error:", error);
      res.status(500).json({ success: false, error: error?.message || "Erreur serveur" });
    }
  });

  app.post("/api/admin/audit/:auditId/rebuild-html", async (req, res) => {
    if (!requireAdminAuth(req, res)) return;
    try {
      const { auditId } = req.params;
      const audit = await storage.getAudit(auditId);
      if (!audit) {
        res.status(404).json({ success: false, error: "Audit non trouvé" });
        return;
      }
      const txt = (audit as any).reportTxt || (audit.narrativeReport as any)?.txt || "";
      if (!txt || txt.length < 1000) {
        res.status(409).json({ success: false, error: `reportTxt insuffisant (${txt.length} chars)` });
        return;
      }
      const { generatePremiumHTMLFromTxt } = await import("./exportServicePremium");
      const photos = (audit as any).photos || [];
      const responses = (audit.responses as any) || {};
      const beforeLen = ((audit as any).reportHtml || "").length;
      const newHtml = generatePremiumHTMLFromTxt(txt, auditId, photos, responses);
      await storage.updateAudit(auditId, { reportHtml: newHtml } as any);
      console.log(`[Admin Rebuild HTML] audit=${auditId} txt=${txt.length}ch oldHtml=${beforeLen}ch newHtml=${newHtml.length}ch`);
      res.json({
        success: true,
        auditId,
        txtLength: txt.length,
        oldHtmlLength: beforeLen,
        newHtmlLength: newHtml.length,
        delta: newHtml.length - beforeLen,
      });
    } catch (error: any) {
      console.error("[Admin Rebuild HTML] Error:", error);
      res.status(500).json({ success: false, error: error.message || "Erreur serveur" });
    }
  });

  app.post("/api/admin/audit/:auditId/patch-section", async (req, res) => {
    if (!requireAdminAuth(req, res)) return;
    try {
      const { auditId } = req.params;
      const { sectionIndex, html, mode } = req.body as {
        sectionIndex: number;
        html: string;
        mode?: "append" | "prepend" | "replace";
      };

      if (typeof sectionIndex !== "number" || sectionIndex < 0) {
        res.status(400).json({ success: false, error: "sectionIndex (number >= 0) required" });
        return;
      }
      if (typeof html !== "string" || html.length === 0) {
        res.status(400).json({ success: false, error: "html (non-empty string) required" });
        return;
      }
      const op = mode === "prepend" || mode === "replace" ? mode : "append";

      const audit = await storage.getAudit(auditId);
      if (!audit) {
        res.status(404).json({ success: false, error: "Audit non trouvé" });
        return;
      }

      const narrative: any = (audit as any).narrativeReport;
      if (!narrative || !Array.isArray(narrative.sections)) {
        res.status(409).json({ success: false, error: "Audit n'a pas de narrativeReport.sections" });
        return;
      }
      if (sectionIndex >= narrative.sections.length) {
        res.status(400).json({ success: false, error: `sectionIndex out of range (max ${narrative.sections.length - 1})` });
        return;
      }

      const section = narrative.sections[sectionIndex];
      const currentIntro = typeof section.introduction === "string" ? section.introduction : "";
      let nextIntro: string;
      if (op === "append") nextIntro = currentIntro + html;
      else if (op === "prepend") nextIntro = html + currentIntro;
      else nextIntro = html;

      const patchedSections = narrative.sections.map((s: any, i: number) =>
        i === sectionIndex ? { ...s, introduction: nextIntro } : s
      );
      const patchedNarrative = { ...narrative, sections: patchedSections };

      await storage.updateAudit(auditId, { narrativeReport: patchedNarrative } as any);
      console.log(`[Admin Patch] audit=${auditId} section=${sectionIndex} mode=${op} added=${html.length}ch`);

      res.json({
        success: true,
        auditId,
        sectionIndex,
        sectionTitle: section.title || null,
        mode: op,
        previousLength: currentIntro.length,
        newLength: nextIntro.length,
      });
    } catch (error) {
      console.error("[Admin Patch Section] Error:", error);
      res.status(500).json({ success: false, error: "Erreur serveur" });
    }
  });

  app.post("/api/admin/send-cta", async (req, res) => {
    if (!requireAdminAuth(req, res)) return;
    try {
      const { auditId, subject, message, toEmail } = req.body;

      if (!subject || !message) {
        res.status(400).json({ success: false, error: "subject et message requis" });
        return;
      }

      // Two modes:
      //   - auditId: lookup audit → use audit.email (classic)
      //   - toEmail: direct send (for peptides clients who have no audit row)
      let targetEmail: string | null = null;
      if (auditId) {
        const audit = await storage.getAudit(auditId);
        if (!audit) {
          res.status(404).json({ success: false, error: "Audit non trouvé" });
          return;
        }
        targetEmail = audit.email;
      } else if (toEmail) {
        targetEmail = String(toEmail);
      } else {
        res.status(400).json({ success: false, error: "auditId ou toEmail requis" });
        return;
      }

      console.log(`[Admin CTA] Envoi CTA à ${targetEmail}${auditId ? ` pour audit ${auditId}` : " (direct)"}`);
      console.log(`Sujet: ${subject}`);
      console.log(`Message: ${message}`);
      const sent = await sendCTAEmail(targetEmail, subject, message);
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

  app.post("/api/admin/recovery-cta-campaign", async (req, res) => {
    if (!requireAdminAuth(req, res)) return;
    try {
      const dryRun = req.body.dryRun !== false;
      const day = Math.min(Math.max(Number(req.body.day) || 1, 1), 7);
      const requestedMaxToSend = Math.min(Math.max(Number(req.body.maxToSend) || (day === 1 ? 25 : 60), 1), 250);
      const maxBatchSize = dryRun ? 250 : 1;
      const maxToSend = Math.min(requestedMaxToSend, maxBatchSize);
      const lookbackDays = Math.min(Math.max(Number(req.body.lookbackDays) || 120, 7), 365);
      const cohortFilter = String(req.body.cohort || "auto").trim() as RecoveryCtaCohort | "auto";
      const baseUrl = getBaseUrl(req);
      const fromDate = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000).toISOString();

      type RecoveryCandidate = {
        email: string;
        cohort: RecoveryCtaCohort;
        priority: number;
        source: string;
        lastSignalAt: string | null;
        auditId?: string | null;
        auditType?: string | null;
        percentComplete?: number | null;
        hoursSinceStart?: number | null;
      };

      const invalidDomains = new Set([
        "yopmail.com",
        "test.com",
        "test.fr",
        "example.com",
        "gmai.com",
        "yahlo.com",
        "hormail.fr",
        "tahoo.fr",
      ]);
      const disallowedFragments = ["achkou", "achzodcoaching", "test", "debug", "noemail"];
      const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const cleanEmail = (email: unknown) => String(email || "").trim().toLowerCase();
      const emailDomain = (email: string) => email.includes("@") ? email.split("@").pop() || "" : "";
      const isExcludedEmail = (email: string) =>
        !validEmail.test(email)
        || invalidDomains.has(emailDomain(email))
        || disallowedFragments.some((fragment) => email.includes(fragment));

      const sentRecovery = new Set<string>();
      const sentRows = await pool.query(
        `SELECT LOWER(recipient_email) AS email
           FROM email_tracking
          WHERE email_type = 'sendRecoveryCtaEmail'
            AND sent_at >= NOW() - INTERVAL '21 days'
            AND (
              sendpulse_task_id IS NOT NULL
              OR LOWER(COALESCE(sendpulse_status, '')) IN ('success', 'sent', 'delivered')
            )`
      );
      sentRows.rows.forEach((row: any) => sentRecovery.add(cleanEmail(row.email)));

      const blockedRecipients = new Set<string>();
      const blockedRows = await pool.query(
        `SELECT DISTINCT LOWER(et.recipient_email) AS email
           FROM email_tracking et
           LEFT JOIN cta_tracking ct ON ct.email_tracking_id = et.id
          WHERE et.recipient_email IS NOT NULL
            AND (
              et.converted IS NOT NULL
              OR LOWER(COALESCE(et.sendpulse_status, '')) IN ('unsubscribed', 'auth_failed')
              OR LOWER(COALESCE(et.sendpulse_error, '')) LIKE '%unsubscribe%'
              OR LOWER(COALESCE(et.sendpulse_error, '')) LIKE '%spam%'
              OR LOWER(COALESCE(et.sendpulse_error, '')) LIKE '%bounce%'
              OR ct.event_type IN ('unsubscribe', 'spam', 'bounce')
              OR LOWER(et.recipient_email) IN (
                SELECT LOWER(recipient_email)
                  FROM email_tracking
                 WHERE email_type = 'sendRecoveryCtaEmail'
                   AND sent_at >= NOW() - INTERVAL '6 hours'
                   AND sendpulse_task_id IS NULL
                   AND LOWER(COALESCE(sendpulse_status, '')) NOT IN ('success', 'sent', 'delivered')
                 GROUP BY LOWER(recipient_email)
                HAVING COUNT(*) >= 3
              )
            )`
      );
      blockedRows.rows.forEach((row: any) => blockedRecipients.add(cleanEmail(row.email)));
      const unsubscribeRows = await pool.query(
        `SELECT LOWER(email) AS email FROM email_unsubscribes`
      ).catch(() => ({ rows: [] }));
      unsubscribeRows.rows.forEach((row: any) => blockedRecipients.add(cleanEmail(row.email)));

      const candidates = new Map<string, RecoveryCandidate>();
      const addCandidate = (candidate: RecoveryCandidate) => {
        const email = cleanEmail(candidate.email);
        if (!email || isExcludedEmail(email) || sentRecovery.has(email) || blockedRecipients.has(email)) return;
        const existing = candidates.get(email);
        if (!existing || candidate.priority > existing.priority) {
          candidates.set(email, { ...candidate, email });
        }
      };

      const clickedRows = await pool.query(
        `SELECT LOWER(recipient_email) AS email,
                MAX(clicked) AS last_signal_at,
                MAX(audit_id) AS audit_id,
                MAX(audit_type) AS audit_type
           FROM email_tracking
          WHERE sent_at >= $1
            AND clicked IS NOT NULL
            AND converted IS NULL
            AND (
              email_type = ANY($2::text[])
              OR LOWER(COALESCE(subject, '')) LIKE ANY($3::text[])
            )
          GROUP BY LOWER(recipient_email)`,
        [fromDate, PROMO_EMAIL_TYPES, PROMO_SUBJECT_PATTERNS]
      );
      clickedRows.rows.forEach((row: any) => addCandidate({
        email: row.email,
        cohort: "clicked_no_conversion",
        priority: 100,
        source: "email_tracking.clicked",
        lastSignalAt: row.last_signal_at,
        auditId: row.audit_id,
        auditType: row.audit_type,
      }));

      const progressRows = await pool.query(
        `SELECT LOWER(qp.email) AS email,
                qp.percent_complete::int AS percent_complete,
                EXTRACT(EPOCH FROM (NOW() - qp.started_at)) / 3600 AS hours_since_start,
                qp.last_activity_at AS last_signal_at
           FROM questionnaire_progress qp
          WHERE qp.status = 'IN_PROGRESS'
            AND qp.started_at <= NOW() - INTERVAL '6 hours'
            AND NOT EXISTS (
              SELECT 1 FROM audits a
               WHERE LOWER(a.email) = LOWER(qp.email)
                 AND a.created_at > qp.last_activity_at
            )`
      );
      progressRows.rows.forEach((row: any) => {
        const percentComplete = Number(row.percent_complete) || 0;
        const hoursSinceStart = Number(row.hours_since_start) || 0;
        const cohort: RecoveryCtaCohort = percentComplete >= 75
          ? "abandon_high"
          : percentComplete >= 25 && hoursSinceStart <= 48
          ? "abandon_medium"
          : "abandon_last_chance";
        const priority = cohort === "abandon_high" ? 90 : cohort === "abandon_medium" ? 80 : 40;
        addCandidate({
          email: row.email,
          cohort,
          priority,
          source: "questionnaire_progress",
          lastSignalAt: row.last_signal_at,
          percentComplete,
          hoursSinceStart: Math.round(hoursSinceStart),
        });
      });

      const openedRows = await pool.query(
        `SELECT LOWER(recipient_email) AS email,
                MAX(opened) AS last_signal_at,
                MAX(audit_id) AS audit_id,
                MAX(audit_type) AS audit_type
           FROM email_tracking
          WHERE sent_at >= $1
            AND opened IS NOT NULL
            AND clicked IS NULL
            AND converted IS NULL
            AND (
              email_type = ANY($2::text[])
              OR LOWER(COALESCE(subject, '')) LIKE ANY($3::text[])
            )
          GROUP BY LOWER(recipient_email)`,
        [fromDate, PROMO_EMAIL_TYPES, PROMO_SUBJECT_PATTERNS]
      );
      openedRows.rows.forEach((row: any) => addCandidate({
        email: row.email,
        cohort: "opened_no_click",
        priority: 70,
        source: "email_tracking.opened",
        lastSignalAt: row.last_signal_at,
        auditId: row.audit_id,
        auditType: row.audit_type,
      }));

      const buyerRows = await pool.query(
        `SELECT LOWER(email) AS email,
                MAX(paid_at) AS last_signal_at,
                MAX(product_type) AS product_type
           FROM orders
          WHERE paid_at >= $1
            AND status = 'paid'
            AND COALESCE(final_amount_cents, amount_cents, 0) > 0
          GROUP BY LOWER(email)`,
        [fromDate]
      );
      buyerRows.rows.forEach((row: any) => addCandidate({
        email: row.email,
        cohort: "apex_buyer",
        priority: 60,
        source: `orders.${row.product_type || "paid"}`,
        lastSignalAt: row.last_signal_at,
      }));

      const reportRows = await pool.query(
        `SELECT LOWER(email) AS email,
                MAX(report_sent_at) AS last_signal_at,
                MAX(id) AS audit_id,
                MAX(type) AS audit_type
           FROM audits
          WHERE created_at >= $1
            AND report_sent_at IS NOT NULL
          GROUP BY LOWER(email)`,
        [fromDate]
      );
      reportRows.rows.forEach((row: any) => addCandidate({
        email: row.email,
        cohort: "warm_report",
        priority: 50,
        source: "audits.report_sent",
        lastSignalAt: row.last_signal_at,
        auditId: row.audit_id,
        auditType: row.audit_type,
      }));

      const coldRows = await pool.query(
        `SELECT LOWER(email) AS email, MAX(last_signal_at) AS last_signal_at
           FROM (
             SELECT recipient_email AS email, sent_at AS last_signal_at
               FROM email_tracking
              WHERE sent_at >= $1
             UNION ALL
             SELECT email, created_at AS last_signal_at
               FROM audits
              WHERE created_at >= $1
             UNION ALL
             SELECT email, last_activity_at AS last_signal_at
               FROM questionnaire_progress
              WHERE last_activity_at >= $1
             UNION ALL
             SELECT email, COALESCE(paid_at, created_at) AS last_signal_at
               FROM orders
              WHERE created_at >= $1
           ) source
          WHERE email IS NOT NULL
          GROUP BY LOWER(email)`,
        [fromDate]
      );
      coldRows.rows.forEach((row: any) => addCandidate({
        email: row.email,
        cohort: "cold_base",
        priority: 10,
        source: "all_known_contacts",
        lastSignalAt: row.last_signal_at,
      }));

      const allowedByDay: Record<number, RecoveryCtaCohort[]> = {
        1: ["clicked_no_conversion", "abandon_high"],
        2: ["abandon_medium", "opened_no_click"],
        3: ["opened_no_click", "warm_report"],
        4: ["apex_buyer", "warm_report"],
        5: ["abandon_last_chance", "warm_report"],
        6: ["cold_base"],
        7: ["cold_base"],
      };
      const allowedCohorts = cohortFilter === "auto" ? allowedByDay[day] : [cohortFilter];
      const byCohort = Array.from(candidates.values()).reduce<Record<string, number>>((acc, candidate) => {
        acc[candidate.cohort] = (acc[candidate.cohort] || 0) + 1;
        return acc;
      }, {});
      const eligible = Array.from(candidates.values())
        .filter((candidate) => allowedCohorts.includes(candidate.cohort))
        .sort((a, b) => {
          if (b.priority !== a.priority) return b.priority - a.priority;
          return new Date(b.lastSignalAt || 0).getTime() - new Date(a.lastSignalAt || 0).getTime();
        });
      const selected = eligible.slice(0, maxToSend);

      if (dryRun) {
        res.json({
          success: true,
          dryRun: true,
          day,
          allowedCohorts,
          lookbackDays,
          totalKnownEligible: candidates.size,
          byCohort,
          eligibleForDay: eligible.length,
          selectedCount: selected.length,
          requestedMaxToSend,
          maxBatchSize,
          batchLimited: requestedMaxToSend > maxToSend,
          preview: selected.slice(0, 25),
          excluded: {
            alreadyRecoverySent21d: sentRecovery.size,
            blockedOrConverted: blockedRecipients.size,
          },
        });
        return;
      }

      const results: Array<any> = [];
      let sent = 0;
      let failed = 0;
      for (const candidate of selected) {
        try {
          const resumeToken = candidate.cohort.startsWith("abandon_")
            ? crypto.randomBytes(32).toString("hex")
            : null;
          const resumeUrl = resumeToken
            ? `${baseUrl}/audit-complet/questionnaire?resume=${resumeToken}`
            : null;
          const trackingRecord = await storage.createEmailTracking(
            candidate.auditId || crypto.randomUUID(),
            "sendRecoveryCtaEmail",
            candidate.email
          );
          const ok = await sendRecoveryCtaEmail(candidate.email, {
            cohort: candidate.cohort,
            baseUrl,
            trackingId: trackingRecord.id,
            percentComplete: candidate.percentComplete,
            resumeUrl,
            expiresText: "7 jours",
          });

          if (ok) {
            sent++;
            if (resumeToken && candidate.percentComplete != null && candidate.hoursSinceStart != null) {
              await storage.logAbandonmentReminder({
                email: candidate.email,
                percentComplete: candidate.percentComplete,
                hoursSinceStart: candidate.hoursSinceStart,
                priorityScore: candidate.priority,
                resumeToken,
              }).catch((err: any) => console.error("[RecoveryCTA] Unable to log abandonment reminder:", err));
            }
          } else {
            failed++;
          }

          results.push({ email: candidate.email, cohort: candidate.cohort, sent: ok, trackingId: trackingRecord.id });
          await new Promise((resolve) => setTimeout(resolve, 650));
        } catch (error) {
          failed++;
          results.push({
            email: candidate.email,
            cohort: candidate.cohort,
            sent: false,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      res.json({
        success: true,
        dryRun: false,
        day,
        allowedCohorts,
        lookbackDays,
        totalKnownEligible: candidates.size,
        byCohort,
        eligibleForDay: eligible.length,
        requestedMaxToSend,
        maxBatchSize,
        batchLimited: requestedMaxToSend > maxToSend,
        attempted: selected.length,
        sent,
        failed,
        results,
      });
    } catch (error) {
      console.error("[RecoveryCTA] Error:", error);
      res.status(500).json({
        success: false,
        error: "Erreur recovery CTA",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  });

  app.post("/api/admin/recovery-cta-click-followup", async (req, res) => {
    if (!requireAdminAuth(req, res)) return;
    try {
      const dryRun = req.body?.dryRun !== false;
      const requestedMaxToSend = Math.min(Math.max(Number(req.body?.maxToSend) || 25, 1), 250);
      const maxToSend = dryRun ? requestedMaxToSend : Math.min(requestedMaxToSend, 1);
      const lookbackDays = Math.min(Math.max(Number(req.body?.lookbackDays) || 14, 2), 120);
      const minHoursSinceClick = Math.min(Math.max(Number(req.body?.minHoursSinceClick) || 2, 0), 168);
      const baseUrl = getBaseUrl(req);
      const fromDate = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000).toISOString();

      const invalidDomains = new Set([
        "yopmail.com",
        "test.com",
        "test.fr",
        "example.com",
        "gmai.com",
        "yahlo.com",
        "hormail.fr",
        "tahoo.fr",
      ]);
      const disallowedFragments = ["achkou", "achzodcoaching", "test", "debug", "noemail"];
      const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const cleanEmail = (email: unknown) => String(email || "").trim().toLowerCase();
      const emailDomain = (email: string) => email.includes("@") ? email.split("@").pop() || "" : "";
      const isExcludedEmail = (email: string) =>
        !validEmail.test(email)
        || invalidDomains.has(emailDomain(email))
        || disallowedFragments.some((fragment) => email.includes(fragment));
      const unsubscribedRecipients = new Set<string>();
      const unsubscribeRows = await pool.query(
        `SELECT LOWER(email) AS email FROM email_unsubscribes`
      ).catch(() => ({ rows: [] }));
      unsubscribeRows.rows.forEach((row: any) => unsubscribedRecipients.add(cleanEmail(row.email)));

      const result = await pool.query(
        `WITH clicked AS (
           SELECT DISTINCT ON (LOWER(recipient_email))
                  LOWER(recipient_email) AS email,
                  id AS source_tracking_id,
                  audit_id,
                  audit_type,
                  subject,
                  clicked AS last_signal_at
             FROM email_tracking
            WHERE sent_at >= $1
              AND recipient_email IS NOT NULL
              AND clicked IS NOT NULL
              AND converted IS NULL
              AND clicked <= NOW() - ($2 || ' hours')::interval
              AND (
                email_type = 'sendRecoveryCtaEmail'
                OR email_type = ANY($3::text[])
                OR LOWER(COALESCE(subject, '')) LIKE ANY($4::text[])
              )
            ORDER BY LOWER(recipient_email), clicked DESC
         )
         SELECT c.*
           FROM clicked c
          WHERE NOT EXISTS (
            SELECT 1
              FROM email_tracking f
             WHERE LOWER(f.recipient_email) = c.email
               AND f.email_type = 'sendRecoveryCtaEmail'
               AND f.sent_at >= NOW() - INTERVAL '14 days'
               AND f.metadata->>'cohort' = 'clicked_help'
               AND (
                 f.sendpulse_task_id IS NOT NULL
                 OR LOWER(COALESCE(f.sendpulse_status, '')) IN ('success', 'sent', 'delivered')
               )
          )
            AND NOT EXISTS (
              SELECT 1
                FROM email_tracking b
                LEFT JOIN cta_tracking ct ON ct.email_tracking_id = b.id
               WHERE LOWER(b.recipient_email) = c.email
                 AND (
                   b.converted IS NOT NULL
                   OR LOWER(COALESCE(b.sendpulse_status, '')) IN ('unsubscribed', 'auth_failed')
                   OR LOWER(COALESCE(b.sendpulse_error, '')) LIKE '%unsubscribe%'
                   OR LOWER(COALESCE(b.sendpulse_error, '')) LIKE '%spam%'
                   OR LOWER(COALESCE(b.sendpulse_error, '')) LIKE '%bounce%'
                   OR ct.event_type IN ('unsubscribe', 'spam', 'bounce')
                   OR LOWER(b.recipient_email) IN (
                     SELECT LOWER(recipient_email)
                       FROM email_tracking
                      WHERE email_type = 'sendRecoveryCtaEmail'
                        AND sent_at >= NOW() - INTERVAL '6 hours'
                        AND sendpulse_task_id IS NULL
                        AND LOWER(COALESCE(sendpulse_status, '')) NOT IN ('success', 'sent', 'delivered')
                      GROUP BY LOWER(recipient_email)
                     HAVING COUNT(*) >= 3
                   )
                 )
            )
            AND NOT EXISTS (
              SELECT 1
                FROM orders o
               WHERE LOWER(o.email) = c.email
                 AND o.status = 'paid'
                 AND COALESCE(o.final_amount_cents, o.amount_cents, 0) > 0
                 AND COALESCE(o.paid_at, o.created_at) >= c.last_signal_at
            )
          ORDER BY c.last_signal_at DESC
          LIMIT $5`,
        [
          fromDate,
          String(minHoursSinceClick),
          PROMO_EMAIL_TYPES,
          PROMO_SUBJECT_PATTERNS,
          maxToSend,
        ]
      );

      const candidates = result.rows
        .map((row: any) => ({ ...row, email: cleanEmail(row.email) }))
        .filter((row: any) => row.email && !isExcludedEmail(row.email) && !unsubscribedRecipients.has(row.email));

      if (dryRun) {
        res.json({
          success: true,
          dryRun: true,
          lookbackDays,
          minHoursSinceClick,
          eligible: candidates.length,
          selectedCount: candidates.length,
          subject: "Tu hesites sur la formule ?",
          cohort: "clicked_help",
          preview: candidates.slice(0, 25),
        });
        return;
      }

      const results: Array<any> = [];
      let sent = 0;
      let failed = 0;
      for (const candidate of candidates) {
        try {
          const trackingRecord = await storage.createEmailTracking(
            candidate.audit_id || crypto.randomUUID(),
            "sendRecoveryCtaEmail",
            candidate.email
          );
          const ok = await sendRecoveryCtaEmail(candidate.email, {
            cohort: "clicked_help",
            baseUrl,
            trackingId: trackingRecord.id,
            expiresText: "72 heures",
          });
          if (ok) sent++;
          else failed++;
          results.push({
            email: candidate.email,
            sent: ok,
            trackingId: trackingRecord.id,
            sourceTrackingId: candidate.source_tracking_id,
            lastSignalAt: candidate.last_signal_at,
          });
          await new Promise((resolve) => setTimeout(resolve, 650));
        } catch (error) {
          failed++;
          results.push({
            email: candidate.email,
            sent: false,
            sourceTrackingId: candidate.source_tracking_id,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      res.json({
        success: true,
        dryRun: false,
        lookbackDays,
        minHoursSinceClick,
        attempted: candidates.length,
        sent,
        failed,
        results,
      });
    } catch (error) {
      console.error("[RecoveryCTA-ClickFollowup] Error:", error);
      res.status(500).json({
        success: false,
        error: "Erreur recovery CTA click follow-up",
        message: error instanceof Error ? error.message : String(error),
      });
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

  app.post("/api/admin/send-reactivation-campaign", async (req, res) => {
    if (!requireAdminAuth(req, res)) return;
    try {
      const { email, apexPromoCode, coachingPromoCode, expiresText } = req.body as {
        email?: string;
        apexPromoCode?: string;
        coachingPromoCode?: string;
        expiresText?: string;
      };
      if (!email || !email.includes("@")) {
        res.status(400).json({ success: false, error: "email requis" });
        return;
      }
      const sent = await sendReactivationCampaignEmail(email.trim().toLowerCase(), {
        apexPromoCode,
        coachingPromoCode,
        expiresText,
      });
      if (!sent) {
        res.status(500).json({ success: false, error: "Echec envoi" });
        return;
      }
      res.json({ success: true, email });
    } catch (error) {
      console.error("[Admin] send-reactivation-campaign error:", error);
      res.status(500).json({ success: false, error: "Erreur serveur" });
    }
  });

  app.post("/api/admin/send-coaching-formula-choice-lead", async (req, res) => {
    if (!requireAdminAuth(req, res)) return;
    try {
      const body = req.body || {};
      const lead = (body.lead || body) as CoachingFormulaLeadInput & { email?: string };
      const email = String(lead.email || "").trim().toLowerCase();
      const dryRun = body.dryRun === true;
      const expiresText = String(body.expiresText || "5 jours");

      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        res.status(400).json({ success: false, error: "email valide requis" });
        return;
      }

      const alreadySent = await pool.query(
        `SELECT id, sendpulse_status, sendpulse_task_id, sent_at
           FROM email_tracking
          WHERE LOWER(recipient_email) = $1
            AND email_type = 'sendCoachingFormulaChoiceLeadEmail'
            AND sent_at >= NOW() - INTERVAL '30 days'
            AND (
              sendpulse_task_id IS NOT NULL
              OR LOWER(COALESCE(sendpulse_status, '')) IN ('success', 'sent', 'delivered', 'unsubscribed')
            )
          ORDER BY sent_at DESC
          LIMIT 1`,
        [email]
      );

      if ((alreadySent.rowCount || 0) > 0) {
        res.json({
          success: true,
          skipped: true,
          reason: "already_sent_recently",
          email,
          previous: alreadySent.rows[0],
        });
        return;
      }

      const baseUrl = getBaseUrl(req);
      const trackingId = crypto.randomUUID();
      if (dryRun) {
        res.json({
          success: true,
          dryRun: true,
          email,
          trackingId,
          tier: lead.tier || null,
          baseUrl,
        });
        return;
      }

      const trackingRecord = await storage.createEmailTracking(
        crypto.randomUUID(),
        "sendCoachingFormulaChoiceLeadEmail",
        email
      );
      const sent = await sendCoachingFormulaChoiceLeadEmail(email, lead, {
        baseUrl,
        trackingId: trackingRecord.id,
        expiresText,
      });

      if (!sent) {
        res.status(500).json({ success: false, error: "Echec envoi", email, trackingId: trackingRecord.id });
        return;
      }

      res.json({ success: true, email, trackingId: trackingRecord.id });
    } catch (error) {
      console.error("[Admin] send-coaching-formula-choice-lead error:", error);
      res.status(500).json({ success: false, error: "Erreur serveur", message: error instanceof Error ? error.message : String(error) });
    }
  });

  app.post("/api/admin/send-finish-discovery", async (req, res) => {
    if (!requireAdminAuth(req, res)) return;
    try {
      const { email, apexPromoCode, expiresText } = req.body as {
        email?: string; apexPromoCode?: string; expiresText?: string;
      };
      if (!email || !email.includes("@")) {
        res.status(400).json({ success: false, error: "email requis" });
        return;
      }
      const sent = await sendFinishDiscoveryEmail(email.trim().toLowerCase(), {
        apexPromoCode,
        expiresText,
      });
      if (!sent) {
        res.status(500).json({ success: false, error: "Echec envoi" });
        return;
      }
      res.json({ success: true, email });
    } catch (error) {
      console.error("[Admin] send-finish-discovery error:", error);
      res.status(500).json({ success: false, error: "Erreur serveur" });
    }
  });

  app.post("/api/admin/send-cross-sell-upgrade", async (req, res) => {
    if (!requireAdminAuth(req, res)) return;
    try {
      const { email, apexPromoCode, coachingPromoCode, expiresText } = req.body as {
        email?: string; apexPromoCode?: string; coachingPromoCode?: string; expiresText?: string;
      };
      if (!email || !email.includes("@")) {
        res.status(400).json({ success: false, error: "email requis" });
        return;
      }
      const sent = await sendCrossSellUpgradeEmail(email.trim().toLowerCase(), {
        apexPromoCode,
        coachingPromoCode,
        expiresText,
      });
      if (!sent) {
        res.status(500).json({ success: false, error: "Echec envoi" });
        return;
      }
      res.json({ success: true, email });
    } catch (error) {
      console.error("[Admin] send-cross-sell-upgrade error:", error);
      res.status(500).json({ success: false, error: "Erreur serveur" });
    }
  });

  app.post("/api/admin/audits/:id/mark-handled", async (req, res) => {
    if (!requireAdminAuth(req, res)) return;
    try {
      const { pool } = await import("./db");
      const result = await pool.query(
        "UPDATE audits SET report_delivery_status = 'SENT', report_sent_at = NOW() WHERE id = $1 AND report_delivery_status IN ('SCHEDULED','READY') RETURNING id",
        [req.params.id]
      );
      if (result.rowCount === 0) {
        res.status(404).json({ success: false, error: "Audit introuvable ou déjà traité (pas SCHEDULED/READY)" });
        return;
      }
      res.json({ success: true, auditId: req.params.id });
    } catch (error) {
      console.error("[Admin] mark-handled error:", error);
      res.status(500).json({ success: false, error: "Erreur serveur" });
    }
  });

  // Manually reconcile a paid PayPal/Stripe transaction whose webhook never
  // fired (the order stays pending in DB even though the customer was charged).
  // Marks the order as paid at the supplied timestamp, optionally cancels
  // sibling pending orders for the same email+productType (to clean up the
  // 4 PENDING noise from retried checkouts), and for PEPTIDES_ENGINE kicks
  // off generation + delivery scheduling via the same path the webhook uses.
  app.post("/api/admin/orders/:id/force-paid", async (req, res) => {
    if (!requireAdminAuth(req, res)) return;
    try {
      const order = await storage.getOrder(req.params.id);
      if (!order) {
        res.status(404).json({ success: false, error: "Commande non trouvée" });
        return;
      }
      if (order.status === "paid") {
        res.status(400).json({ success: false, error: "Order is already paid" });
        return;
      }
      const body = (req.body || {}) as {
        paidAt?: string;
        paypalCaptureId?: string;
        cancelSiblings?: boolean;
        sendConfirmation?: boolean;
      };
      const paidAt = body.paidAt ? new Date(body.paidAt) : new Date();
      if (Number.isNaN(paidAt.getTime())) {
        res.status(400).json({ success: false, error: "paidAt must be a valid ISO date" });
        return;
      }

      const newMeta = { ...((order.metadata as any) || {}) };
      if (body.paypalCaptureId) newMeta.paypalCaptureId = body.paypalCaptureId;
      newMeta.forcePaidByAdmin = new Date().toISOString();
      newMeta.forcePaidReason = "webhook missed, reconciled manually from PayPal dashboard";

      await storage.updateOrder(order.id, { status: "paid", paidAt, metadata: newMeta });

      let cancelledSiblings: string[] = [];
      if (body.cancelSiblings !== false) {
        const { orders: allOrders } = await storage.getAllOrders({ email: order.email, limit: 50 });
        for (const o of allOrders) {
          if (
            o.id !== order.id &&
            o.productType === order.productType &&
            o.status === "pending"
          ) {
            await storage.updateOrder(o.id, { status: "cancelled" }).catch(() => {});
            cancelledSiblings.push(o.id);
          }
        }
      }

      const result: any = { success: true, orderId: order.id, cancelledSiblings };

      if (order.productType === "PEPTIDES_ENGINE") {
        const meta = newMeta as any;
        const responses = meta.peptidesResponses || {};
        if (!responses || Object.keys(responses).length < 3) {
          result.warning = "peptidesResponses empty or too short; generation skipped, run /api/admin/peptides-inject-responses + /api/admin/peptides-generate manually";
          res.json(result);
          return;
        }

        // Run generation SYNCHRONOUSLY (admin endpoint, no anonymous user
        // waiting). Mounir Hadir's case (2026-05-15) showed background IIFE
        // can die silently on Render Starter timeouts. Synchronous flow
        // returns the actual error to the caller for visibility, and goes
        // through the same CAS-protected linking path as /api/admin/peptides-generate.
        try {
          const { generatePeptidesProtocol } = await import("./peptidesEngine");
          const forcePaidTier = ((order.metadata as any)?.peptidesTier as "solo" | "coached" | "tracked" | undefined) ?? "coached";
          const report = await generatePeptidesProtocol(responses, order.email, forcePaidTier);
          const saved = await storage.createBurnoutReport({
            email: `peptides::${order.email}`,
            responses,
            report,
          });
          const claimed = await storage.claimPeptidesReportSlot(order.id, saved.id);
          if (!claimed) {
            result.warning = `Race condition: another process already linked a report to this order. Generated report ${saved.id} is orphan.`;
            result.orphanReportId = saved.id;
          } else {
            result.reportId = saved.id;
          }

          const peptidesNames = (report.peptides || []).map((p: any) => p.name).join(", ");
          const firstName = responses.pep_name || responses.prenom || (order.email.split("@")[0]);

          if (body.sendConfirmation !== false && claimed) {
            const scheduledAt = await (async () => {
              try {
                const fresh = await storage.getOrder(order.id);
                return fresh ? await resolvePeptidesEmailScheduledAt(fresh) : new Date();
              } catch { return new Date(); }
            })();
            await sendPeptidesOrderConfirmationEmail(order.email, {
              firstName,
              amountEur: (order.finalAmountCents || 0) / 100,
              promoCode: (order as any).promoCode || null,
              peptidesNames,
              scheduledDeliveryAt: scheduledAt,
              bloodCreditsCount: Array.isArray(report.promoCodesGenerated) ? report.promoCodesGenerated.length : 0,
              orderId: order.id,
            }).catch((err) => console.error("[Force-Paid] Confirmation email failed:", err));
            result.confirmationSent = true;
          }
          result.peptidesNames = peptidesNames;
          result.reportLink = `${getBaseUrl()}/peptides/${saved.id}`;
        } catch (genErr: any) {
          const errMsg = genErr?.message || String(genErr);
          console.error(`[Force-Paid] Generation FAILED for ${order.email}:`, errMsg);
          result.generationError = errMsg;
          const adminEmail = process.env.ADMIN_NOTIF_EMAIL || "coaching@achzodcoaching.com";
          await sendCTAEmail(
            adminEmail,
            `[FORCE-PAID ECHEC] Peptides ${order.email}`,
            `Le force-paid sur ${order.email} a bien marque l'order ${order.id} paid, mais la generation peptides a echoue.\n\nErreur: ${errMsg}\n\nReponses (${Object.keys(responses).length} keys): OK\n\nRelance manuellement: POST /api/admin/peptides-generate avec { "email": "${order.email}" }`
          ).catch(() => {});
        }
      }

      res.json(result);
    } catch (error: any) {
      console.error("[Admin Force-Paid] Error:", error);
      res.status(500).json({ success: false, error: error?.message || "Erreur serveur" });
    }
  });

  app.post("/api/admin/orders/:id/cancel", async (req, res) => {
    if (!requireAdminAuth(req, res)) return;
    try {
      const order = await storage.getOrder(req.params.id);
      if (!order) {
        res.status(404).json({ success: false, error: "Commande non trouvée" });
        return;
      }
      if (order.status !== "pending") {
        res.status(400).json({ success: false, error: `Cannot cancel order with status ${order.status}` });
        return;
      }
      await storage.updateOrder(order.id, { status: "cancelled" });
      const updated = await storage.getOrder(order.id);
      res.json({ success: true, order: updated });
    } catch (error) {
      console.error("[Admin Orders] Cancel error:", error);
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
      // Fetch from report_artifacts table. Pass ?content=1 to also return
      // txt + html ,  used by admin recovery flows when an artifact exists but
      // narrativeReport never hydrated (e.g. send marked SENT without delivery).
      const withContent = req.query.content === "1";
      const cols = withContent
        ? "id, audit_id, tier, engine, model, txt, html, created_at"
        : "id, audit_id, tier, engine, model, created_at";
      const result = await pool.query(
        `SELECT ${cols} FROM report_artifacts WHERE audit_id = $1 ORDER BY created_at DESC`,
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
          ...(withContent ? { txt: r.txt, html: r.html } : {}),
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

  // Admin: clean up failed-auth email_tracking rows so the automated crons
  // re-attempt the emails on the next cycle. Use after a credentials outage
  // like the 2026-04-19 SendPulse auth window: once the new creds work, run
  // POST /api/admin/email-trackings/purge-failed?since=<ISO> (defaults to
  // 48h ago) and the AutoSequence/Review/Abandon/Reorder crons will send
  // fresh emails the next time they tick.
  app.post("/api/admin/email-trackings/purge-failed", async (req, res) => {
    if (!requireAdminAuth(req, res)) return;
    try {
      const sinceParam = (req.query.since as string) || (req.body as any)?.since;
      const since = sinceParam ? new Date(sinceParam) : new Date(Date.now() - 48 * 60 * 60 * 1000);
      if (Number.isNaN(since.getTime())) {
        res.status(400).json({ error: "invalid `since` , must be ISO date" });
        return;
      }

      // Conservative filter: only rows flagged failed due to auth/credentials
      // errors during the window. Doesn't touch delivered-but-unopened rows.
      const resBefore = await pool.query(
        `SELECT email_type, COUNT(*)::int AS c
           FROM email_tracking
          WHERE sendpulse_status = 'failed'
            AND sent_at >= $1
            AND (sendpulse_error ILIKE '%auth%' OR sendpulse_error ILIKE '%credentials%' OR sendpulse_error ILIKE '%invalid_client%')
          GROUP BY email_type
          ORDER BY c DESC`,
        [since.toISOString()]
      );

      const toPurge = resBefore.rows;
      const totalToPurge = toPurge.reduce((sum: number, r: any) => sum + Number(r.c ?? 0), 0);

      if (totalToPurge === 0) {
        res.json({ success: true, purged: 0, message: "No failed-auth rows in window , nothing to do.", since: since.toISOString() });
        return;
      }

      const purgeRes = await pool.query(
        `DELETE FROM email_tracking
          WHERE sendpulse_status = 'failed'
            AND sent_at >= $1
            AND (sendpulse_error ILIKE '%auth%' OR sendpulse_error ILIKE '%credentials%' OR sendpulse_error ILIKE '%invalid_client%')
          RETURNING id`,
        [since.toISOString()]
      );

      res.json({
        success: true,
        since: since.toISOString(),
        purged: purgeRes.rowCount ?? 0,
        byType: toPurge,
        note: "Failed tracking rows deleted. Auto-sequence crons (30 min), review cron (6h), abandon cron (6h), peptides reorder cron (12h) will retry eligible recipients on their next tick. No user is double-emailed because crons re-evaluate windows + dedup.",
      });
    } catch (err: any) {
      console.error("[Admin] purge-failed email tracking error:", err);
      res.status(500).json({ error: err?.message || "Erreur serveur" });
    }
  });

  // Admin email tracking stats
  // Admin: inspect blood_reports + blood_tests for a specific email. Used to
  // diagnose "I just uploaded my blood test" tickets when the client's not in
  // the deliveries log yet. Returns both tables so we can see: was the upload
  // persisted? is the AI analysis pending/failed/done? is the delivery
  // scheduled?
  app.get("/api/admin/blood-lookup-by-email", async (req, res) => {
    if (!requireAdminAuth(req, res)) return;
    try {
      const email = String(req.query.email || "").trim().toLowerCase();
      if (!email || !email.includes("@")) {
        res.status(400).json({ error: "email query param required" });
        return;
      }
      const blood = await pool.query(
        `SELECT id, email, delivery_status, report_scheduled_for, email_sent_at,
                ai_report IS NOT NULL AND ai_report <> '' AS has_ai,
                created_at, delivery_retries
           FROM blood_reports
          WHERE LOWER(email) = $1
          ORDER BY created_at DESC
          LIMIT 20`,
        [email]
      ).catch(() => ({ rows: [] }));
      let tests: any = { rows: [] };
      try {
        tests = await pool.query(
          `SELECT bt.id, bt.status, bt.created_at, bt.completed_at,
                  bt.patient_profile->>'email' AS pp_email,
                  jsonb_array_length(COALESCE(bt.markers, '[]'::jsonb)) AS marker_count,
                  bt.analysis IS NOT NULL AS has_analysis
             FROM blood_tests bt
             LEFT JOIN users u ON u.id = bt.user_id
            WHERE LOWER(u.email) = $1
               OR LOWER(bt.patient_profile->>'email') = $1
            ORDER BY bt.created_at DESC
            LIMIT 20`,
          [email]
        );
      } catch {}
      res.json({
        email,
        bloodReports: blood.rows,
        bloodTests: tests.rows,
      });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
    }
  });

  // Focused per-recipient email tracking query ,  the /api/admin/email-trackings
  // endpoint returns at most 200 rows across the whole app, which only covers
  // ~24h of traffic. To confirm whether a specific client actually received
  // their delivery email (e.g. did the Peptides delivery reach them?), we need
  // a query that filters by recipient and returns the full per-email history.
  app.get("/api/admin/email-tracking-by-recipient", async (req, res) => {
    if (!requireAdminAuth(req, res)) return;
    try {
      const email = String(req.query.email || "").trim().toLowerCase();
      if (!email || !email.includes("@")) {
        res.status(400).json({ error: "email query param required" });
        return;
      }
      const result = await pool.query(
        `SELECT id, email_type, recipient_email, subject, audit_id, audit_type,
                sendpulse_task_id, sendpulse_status, sendpulse_error, sent_at, opened, clicked
           FROM email_tracking
          WHERE LOWER(recipient_email) = $1
          ORDER BY sent_at DESC
          LIMIT 200`,
        [email]
      );
      res.json({
        email,
        count: result.rowCount ?? 0,
        trackings: result.rows,
      });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
    }
  });

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

  // GET /api/unsubscribe , Public page: shows confirmation + auto-processes unsubscribe
  app.get("/api/unsubscribe", async (req, res) => {
    try {
      const emailToken = req.query.email as string;
      if (!emailToken) {
        return res.status(400).send("Missing email parameter");
      }
      // Accept both legacy base64 (with +/=) and new base64url (-_ no padding).
      // Gmail/iCloud sometimes swallow the trailing = padding, so base64url is
      // now the default , this branch keeps old links in circulation working.
      const normalized = emailToken.replace(/-/g, "+").replace(/_/g, "/");
      const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
      const email = Buffer.from(padded, "base64").toString("utf-8");
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

  // POST /api/unsubscribe , Process unsubscribe (API)
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

  // GET /api/admin/unsubscribes , Admin: list all unsubscribed emails
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

  // POST /api/admin/resubscribe , Admin: re-subscribe an email
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
      const rawCode = req.body?.code;
      const auditType = req.body?.auditType;

      if (!rawCode || typeof rawCode !== "string") {
        res.status(400).json({ valid: false, discount: 0, error: "Code requis" });
        return;
      }

      // Trim + uppercase so a code pasted from email with a stray leading/
      // trailing space or in lowercase doesn't fail validation (2026-05-10
      // Achzod reported clients complaining "PEPTIDES100 marche plus" ,  the
      // code was active and correct, they were pasting it with whitespace).
      const code = rawCode.trim().toUpperCase();
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

  app.get("/api/track/email/:trackingId/click", async (req, res) => {
    const { trackingId } = req.params;
    const rawUrl = String(req.query.url || "").trim();

    let redirectUrl: URL;
    try {
      redirectUrl = new URL(rawUrl);
      const allowedCoachingHosts = new Set(["achzodcoaching.com", "www.achzodcoaching.com"]);
      const allowedApexBridgeHosts = new Set([
        "apexlabs.achzodcoaching.com",
        "neurocore-360.onrender.com",
      ]);
      const isCoachingDestination = allowedCoachingHosts.has(redirectUrl.hostname);
      const isApexCoachingBridge =
        allowedApexBridgeHosts.has(redirectUrl.hostname) &&
        redirectUrl.pathname === "/go/coaching";

      if (redirectUrl.protocol !== "https:" || (!isCoachingDestination && !isApexCoachingBridge)) {
        res.status(400).send("Invalid redirect URL");
        return;
      }
    } catch {
      res.status(400).send("Invalid redirect URL");
      return;
    }

    try {
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trackingId)) {
        await pool.query(
          `UPDATE email_tracking SET clicked = NOW() WHERE id = $1 AND clicked IS NULL`,
          [trackingId]
        );
        await pool.query(
          `INSERT INTO cta_tracking (email_tracking_id, event_type, url, metadata, created_at)
           VALUES ($1, 'click', $2, $3, NOW())`,
          [
            trackingId,
            redirectUrl.toString(),
            JSON.stringify({ source: "first_party_redirect" }),
          ]
        );
      }
    } catch (error) {
      console.error("[Email Tracking] Click redirect tracking error:", error);
    }

    res.redirect(302, redirectUrl.toString());
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
          const trackingTypes = emailTracking
            .filter(isEmailSequenceAttempted)
            .map(t => t.emailType);

          // GRATUIT audits: Send upsell email after 2 days
          if (audit.type === "GRATUIT" && daysSinceSent >= 2 && daysSinceSent < 30) {
            if (!trackingTypes.includes("sendGratuitUpsellEmail")) {
              const trackingRecord = await storage.createEmailTracking(audit.id, "sendGratuitUpsellEmail", audit.email);
              const sent = await sendGratuitUpsellEmail(audit.email, audit.id, baseUrl, trackingRecord.id);
              if (sent) results.gratuitUpsell++;
              else results.errors++;
            }
          }

          // GRATUIT audits: J+5 email "Ce que ton Discovery ne peut pas te donner"
          if (audit.type === "GRATUIT" && daysSinceSent >= 5 && daysSinceSent < 30) {
            if (!trackingTypes.includes("sendGratuitJ5Email")) {
              const hasConverted = await storage.hasUserPurchased(audit.email);
              if (!hasConverted) {
                const trackingRecord = await storage.createEmailTracking(audit.id, "sendGratuitJ5Email", audit.email);
                const sent = await sendGratuitJ5Email(audit.email, audit.id, baseUrl, trackingRecord.id);
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
                const trackingRecord = await storage.createEmailTracking(audit.id, "sendGratuitJ7Email", audit.email);
                const sent = await sendGratuitJ7Email(audit.email, audit.id, baseUrl, trackingRecord.id);
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
                const trackingRecord = await storage.createEmailTracking(audit.id, "sendDiscoveryJ14CoachingEmail", audit.email);
                const sent = await sendDiscoveryJ14CoachingEmail(audit.email, audit.id, baseUrl, trackingRecord.id);
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
                const trackingRecord = await storage.createEmailTracking(audit.id, "sendPremiumJ7Email", audit.email);
                const sent = await sendPremiumJ7Email(audit.email, audit.id, audit.type, baseUrl, trackingRecord.id, hasReview);
                if (sent) results.premiumJ7++;
                else results.errors++;
              }
            }

            // J+14: Send ONLY if J+7 email was NOT opened
            if (daysSinceSent >= 14 && daysSinceSent < 30) {
              const j7Email = emailTracking.find((t: any) => t.emailType === "sendPremiumJ7Email" && t.sendpulseStatus === "success");
              const j14Sent = trackingTypes.includes("sendPremiumJ14Email");

              // Only send J+14 if J+7 was sent but NOT opened
              if (j7Email && !j7Email.opened && !j14Sent) {
                const trackingRecord = await storage.createEmailTracking(audit.id, "sendPremiumJ14Email", audit.email);
                const sent = await sendPremiumJ14Email(audit.email, audit.id, audit.type, baseUrl, trackingRecord.id);
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

        // Peptides auto-recovery REMOVED from cron , handled exclusively by setInterval (5min)
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

            // Review J+3 , Demande d'avis 3 jours apres paiement
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

            // Review S5 (35 jours / 5 semaines) , 2eme demande d'avis mi-cycle (design email)
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

            // Review S12 (84 jours / 12 semaines) , 3eme demande d'avis fin de cycle (design email)
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

            // S4 (28 jours) , Check-in: comment se passe le cycle?
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

            // S8 (56 jours) , Fin de cycle + demande avis + incentive Blood Analysis
            if (daysSincePaid >= 56 && daysSincePaid < 70 && !types.includes("peptidesS8")) {
              const sent = await sendCTAEmail(
                email,
                "Fin de ton cycle - J'ai besoin de ton retour",
                `Salut,\n\nTon cycle de 8 semaines touche a sa fin. C'est le moment de faire le point.\n\nJ'ai 2 choses a te demander :\n\n1. TON BILAN SANGUIN\nAs-tu fait ton bilan mi-cycle avec ton code Blood Analysis? Si non, fais-le maintenant , c'est le seul moyen de mesurer l'impact reel de ton protocole sur tes marqueurs.\nAccede a Blood Analysis : https://apexlabs.achzodcoaching.com/offers/blood-analysis\n\n2. TON AVIS (30 secondes)\nTon retour m'aide enormement a ameliorer le service. En echange de ton avis, je t'offre 1 Blood Analysis supplementaire gratuite.\nLaisse ton avis ici : https://apexlabs.achzodcoaching.com/peptides/${order.id}#review\n\nSi tu veux un deuxieme cycle adapte a tes resultats, reponds directement a cet email.\n\n3. PARRAINAGE\nTu connais quelqu'un qui pourrait beneficier d'un protocole peptides? Envoie-lui ce lien et s'il achete, tu recois 1 Blood Analysis gratuite :\nhttps://apexlabs.achzodcoaching.com/offers/peptides-engine?ref=${encodeURIComponent(email)}\n\nAchzod`
              );
              if (sent) {
                peptidesS8++;
                await db.insert(emailTrackingTable).values({ email, emailType: "peptidesS8", auditId: order.id, sentAt: new Date() }).catch(() => {});
              }
            }

            // S12 (84 jours) , Coaching upsell ciblé + nouveau protocole
            if (daysSincePaid >= 84 && daysSincePaid < 100 && !types.includes("peptidesS12")) {
              const sent = await sendCTAEmail(
                email,
                "Tes resultats meritent un suivi",
                `Salut,\n\nCa fait 3 mois depuis ton protocole Peptides Engine. A ce stade, tu as probablement vu des resultats concrets , et c'est exactement la ou la plupart des gens stagnent.\n\nPourquoi? Parce qu'un protocole peptides sans suivi, c'est comme un plan d'entrainement sans coach. Ca marche au debut, puis tu plafonnes.\n\nC'est pour ca que je te propose 2 options pour continuer a progresser :\n\nOPTION 1 : COACHING ACHZOD\nUn suivi personnalise ou j'ajuste ton protocole en temps reel selon tes bilans sanguins, ta progression et tes objectifs. On travaille ensemble sur la nutrition, l'entrainement et la supplementation.\nFormule Essential (4 sem) : 249EUR\nFormule Elite (4 sem) : 399EUR\nDecouvrir : https://www.achzodcoaching.com/formules-coaching\n\nOPTION 2 : NOUVEAU PROTOCOLE\nSi tu veux juste un nouveau cycle avec de nouvelles molecules (objectif different, ajustements post-bilan), un nouveau Peptides Engine a 399EUR.\nCommander : https://apexlabs.achzodcoaching.com/offers/peptides-engine\n\nN'oublie pas : tu as encore tes codes Blood Analysis pour verifier tes marqueurs avant de demarrer un nouveau cycle.\n\nAchzod`
              );
              if (sent) {
                peptidesS12++;
                await db.insert(emailTrackingTable).values({ email, emailType: "peptidesS12", auditId: order.id, sentAt: new Date() }).catch(() => {});
              }
            }

            // S16 (112 jours) , Dernier rappel: Blood Analysis + coaching CTA
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
              `Salut,\n\nC'est Achzod. Tu as commence ton questionnaire Peptides Engine il y a quelques jours.\n\nJe sais que 399EUR c'est un investissement. Mais calcule : un seul vial de BPC-157 te coute 80EUR chez un revendeur. Avec ma source, c'est 9 dollars. En une seule commande tu economises plus que le prix du protocole.\n\nTon protocole inclut :\n- Dosages exacts ajustes a ton poids\n- Acces direct a ma source (60-90% moins cher)\n- Guide de reconstitution + injection complet\n- 2 bilans sanguins gratuits (198EUR de valeur)\n\nReprends ici : https://apexlabs.achzodcoaching.com/offers/peptides-engine\n\nSi tu as des questions, reponds a cet email.\n\nAchzod`
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

      // IDEMPOTENCY: same email + GRATUIT within 10 min → return existing audit + narrative.
      // This endpoint is particularly exposed to double-submit because the landing funnel
      // re-submits on navigation back/forward and on network retries.
      const existingRecent = await storage.findRecentAuditByEmailAndType(email, "GRATUIT", 10).catch(() => undefined);
      if (existingRecent) {
        console.warn(`[Discovery Scan] ⏭️ Idempotency hit , returning existing audit ${existingRecent.id} for ${email}`);
        res.json({
          success: true,
          auditId: existingRecent.id,
          narrativeReport: (existingRecent as any).narrativeReport ?? null,
          idempotent: true,
        });
        return;
      }

      // Create audit record
      const audit = await storage.createAudit({
        userId: "",
        type: "GRATUIT",
        email,
        responses,
      });

      // Atomic generation claim , if we lose the CAS, another process is already
      // generating this audit's report. We serve the existing state instead of
      // kicking off a parallel generator.
      const claimedGen = await storage.claimAuditForGeneration(audit.id).catch(() => false);
      if (!claimedGen) {
        const fresh = await storage.getAudit(audit.id).catch(() => undefined);
        console.warn(`[Discovery Scan] ⏭️ Could not claim audit ${audit.id} for generation , returning current state`);
        res.json({
          success: true,
          auditId: audit.id,
          narrativeReport: (fresh as any)?.narrativeReport ?? null,
          idempotent: true,
        });
        return;
      }

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
        const { sent: emailSent } = await safeSendReportReadyEmail(audit.id, email, audit.type, baseUrl, { logPrefix: "[Discovery Scan create]" });
        if (emailSent) {
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

      // Reset state + atomic claim so two concurrent regenerate clicks can't
      // both kick off parallel generations (which would race to write to the
      // same audit record).
      await storage.updateAudit(audit.id, {
        reportDeliveryStatus: "PENDING",
        narrativeReport: null,
        reportGeneratedAt: null,
      });
      const claimedDisc = await storage.claimAuditForGeneration(audit.id).catch(() => false);
      if (!claimedDisc) {
        res.status(409).json({ success: false, error: "Regeneration déjà en cours" });
        return;
      }

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
      const { userId: SENDPULSE_USER_ID, secret: SENDPULSE_SECRET } = getSendPulseCredentials();

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

      // Optional filter: ?filter=APEXLABS keeps the old behavior; default returns all books
      const filter = String(req.query.filter || "");
      const filtered = filter ? books.filter((b) => b.name.toLowerCase().includes(filter.toLowerCase())) : books;

      res.json({
        success: true,
        books: filtered.map((b) => ({
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

  // List recent SendPulse campaigns (for finding/cleaning up drafts).
  // Query params: ?limit=20&offset=0
  app.get("/api/admin/sendpulse/campaigns", async (req, res) => {
    if (!requireAdminAuth(req, res)) return;
    try {
      const { userId: SENDPULSE_USER_ID, secret: SENDPULSE_SECRET } = getSendPulseCredentials();
      if (!SENDPULSE_USER_ID || !SENDPULSE_SECRET) {
        res.status(400).json({ success: false, error: "SendPulse credentials not configured" });
        return;
      }
      const limit = Math.min(Number(req.query.limit) || 50, 100);
      const offset = Number(req.query.offset) || 0;
      const authResp = await fetch("https://api.sendpulse.com/oauth/access_token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grant_type: "client_credentials", client_id: SENDPULSE_USER_ID, client_secret: SENDPULSE_SECRET }),
      });
      if (!authResp.ok) {
        res.status(500).json({ success: false, error: "SendPulse auth failed" });
        return;
      }
      const authData = await authResp.json() as { access_token: string };
      const campaignsResp = await fetch(`https://api.sendpulse.com/campaigns?limit=${limit}&offset=${offset}`, {
        headers: { Authorization: `Bearer ${authData.access_token}` },
      });
      const campaigns = await campaignsResp.json();
      res.json({ success: true, campaigns });
    } catch (error: any) {
      console.error("[SendPulse list-campaigns] Error:", error);
      res.status(500).json({ success: false, error: error?.message });
    }
  });

  // Cancel a SendPulse campaign by ID.
  app.post("/api/admin/sendpulse/campaigns/:id/cancel", async (req, res) => {
    if (!requireAdminAuth(req, res)) return;
    try {
      const { userId: SENDPULSE_USER_ID, secret: SENDPULSE_SECRET } = getSendPulseCredentials();
      if (!SENDPULSE_USER_ID || !SENDPULSE_SECRET) {
        res.status(400).json({ success: false, error: "SendPulse credentials not configured" });
        return;
      }
      const id = req.params.id;
      const authResp = await fetch("https://api.sendpulse.com/oauth/access_token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grant_type: "client_credentials", client_id: SENDPULSE_USER_ID, client_secret: SENDPULSE_SECRET }),
      });
      if (!authResp.ok) {
        res.status(500).json({ success: false, error: "SendPulse auth failed" });
        return;
      }
      const authData = await authResp.json() as { access_token: string };
      // SendPulse: DELETE /campaigns/:id cancels a scheduled campaign
      const cancelResp = await fetch(`https://api.sendpulse.com/campaigns/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${authData.access_token}` },
      });
      const text = await cancelResp.text();
      let data: any = null;
      try { data = JSON.parse(text); } catch { data = { raw: text }; }
      res.json({ success: cancelResp.ok, status: cancelResp.status, data });
    } catch (error: any) {
      console.error("[SendPulse cancel-campaign] Error:", error);
      res.status(500).json({ success: false, error: error?.message });
    }
  });

  // Create a SendPulse campaign as a scheduled draft (future send_date keeps it editable in UI).
  // Body: { subject, htmlBase64, bookId, name?, senderEmail?, senderName?, sendDate? }
  app.post("/api/admin/sendpulse/create-campaign-draft", async (req, res) => {
    if (!requireAdminAuth(req, res)) return;
    try {
      const { userId: SENDPULSE_USER_ID, secret: SENDPULSE_SECRET } = getSendPulseCredentials();
      if (!SENDPULSE_USER_ID || !SENDPULSE_SECRET) {
        res.status(400).json({ success: false, error: "SendPulse credentials not configured" });
        return;
      }
      const { subject, htmlBase64, bookId, name, senderEmail, senderName, sendDate } = req.body || {};
      if (!subject || !htmlBase64 || !bookId) {
        res.status(400).json({ success: false, error: "subject, htmlBase64, bookId required" });
        return;
      }

      // Get token
      const authResp = await fetch("https://api.sendpulse.com/oauth/access_token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grant_type: "client_credentials", client_id: SENDPULSE_USER_ID, client_secret: SENDPULSE_SECRET }),
      });
      if (!authResp.ok) {
        res.status(500).json({ success: false, error: "SendPulse auth failed" });
        return;
      }
      const authData = await authResp.json() as { access_token: string };

      // Schedule far enough in the future to act as a draft (1 year ahead by default).
      // Achzod can edit, reschedule earlier, or trigger send from SendPulse UI.
      const futureDate = sendDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().replace("T", " ").substring(0, 19);

      const payload = {
        sender_name: senderName || process.env.SENDPULSE_SENDER_NAME || "Achzod",
        sender_email: senderEmail || process.env.SENDPULSE_SENDER_EMAIL || "coaching@achzodcoaching.com",
        subject,
        body: htmlBase64,
        list_id: Number(bookId),
        name: name || subject,
        send_date: futureDate,
      };

      const campaignResp = await fetch("https://api.sendpulse.com/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${authData.access_token}` },
        body: JSON.stringify(payload),
      });
      const text = await campaignResp.text();
      let data: any = null;
      try { data = JSON.parse(text); } catch { data = { raw: text }; }
      if (!campaignResp.ok) {
        console.error("[SendPulse create-campaign] failed:", campaignResp.status, text);
        res.status(500).json({ success: false, status: campaignResp.status, error: data });
        return;
      }
      console.log("[SendPulse create-campaign] success:", data);
      res.json({ success: true, campaign: data, scheduledFor: futureDate });
    } catch (error: any) {
      console.error("[SendPulse create-campaign] Error:", error);
      res.status(500).json({ success: false, error: error?.message || "Erreur SendPulse" });
    }
  });

  // Get subscribers from a specific SendPulse address book
  app.get("/api/admin/sendpulse/subscribers/:bookId", async (req, res) => {
    if (!requireAdminAuth(req, res)) return;
    try {
      const { bookId } = req.params;
      const { userId: SENDPULSE_USER_ID, secret: SENDPULSE_SECRET } = getSendPulseCredentials();

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

            // Meta CAPI , server-side Purchase event (recovers 30-50% lost to ITP/adblockers)
            // event_id must match the client-side Pixel eventID for Meta to dedup correctly.
            // Any failure is swallowed , CAPI must never block the webhook response.
            try {
              const { sendMetaPurchase } = await import("./metaCapi.js");
              const stripeMeta = (session.metadata ?? {}) as Record<string, string | undefined>;
              const sessionEmail = session.customer_details?.email || session.customer_email || order.email || undefined;
              const sessionPhone = session.customer_details?.phone || undefined;
              const fullName = session.customer_details?.name || "";
              const [firstName, ...lastParts] = fullName.trim().split(/\s+/);
              const valueEUR = (order.finalAmountCents ?? 0) / 100;
              const eventSourceUrl = session.success_url || stripeMeta.source_url || `${getBaseUrl()}/`;
              await sendMetaPurchase({
                eventId: `stripe_${session.id}`,
                eventSourceUrl,
                valueEUR,
                currency: (session.currency || "eur").toUpperCase(),
                contentIds: [order.productType || "unknown"],
                contentName: order.productName || order.productType || undefined,
                orderId: order.id,
                userData: {
                  email: sessionEmail,
                  phone: sessionPhone,
                  firstName: firstName || undefined,
                  lastName: lastParts.join(" ") || undefined,
                  fbp: stripeMeta.fbp,
                  fbc: stripeMeta.fbc,
                  ip: stripeMeta.client_ip,
                  userAgent: stripeMeta.user_agent,
                  externalId: sessionEmail,
                },
              });
            } catch (capiErr) {
              console.error(`[Webhook] Meta CAPI Purchase (stripe) failed (non-blocking):`, capiErr);
            }

            // Admin notification for PAID orders (idempotent ,  confirm-session
            // may have already sent it for BLOOD_ANALYSIS)
            await runOnceOnOrder(order.id, "adminPaymentNotifSentAt", async () => {
              const clientEmail = session.customer_details?.email || session.customer_email || order.email;
              const clientName = session.customer_details?.name || clientEmail?.split("@")[0] || "Client";
              const planLabel = order.productType === "PREMIUM" ? "Anabolic Bioscan (59EUR)" :
                               order.productType === "ELITE" ? "Ultimate Scan (79EUR)" :
                               order.productType === "BLOOD_ANALYSIS" ? "Blood Analysis (99EUR)" : order.productName;
              const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || "coaching@achzodcoaching.com";
              const amount = (order.finalAmountCents / 100).toFixed(2);
              await sendCTAEmail(
                adminEmail,
                `PAIEMENT ${amount}EUR , ${planLabel} , ${clientName}`,
                `PAIEMENT RECU!\n\nProduit: ${planLabel}\nClient: ${clientName}\nEmail: ${clientEmail}\nMontant: ${amount}EUR\nPromo: ${order.promoCode || "aucun"}\n\nOrder ID: ${order.id}`,
              );
              console.log(`[Webhook] Admin payment notification sent for order ${order.id}`);
            });

            // Send confirmation email to client (Stripe webhook = payment confirmed)
            // Idempotent ,  confirm-session may have already sent it.
            await runOnceOnOrder(order.id, "customerConfirmEmailSentAt", async () => {
              const clientEmail2 = session.customer_details?.email || session.customer_email || order.email;
              const clientName2 = session.customer_details?.name || clientEmail2?.split("@")[0] || "Client";
              const promoByType2: Record<string, { code: string; label: string }> = {
                ELITE: { code: "ULTIMATE79", label: "79€ déduits de ta formule coaching (Essential/Elite/Private Lab)" },
                PREMIUM: { code: "BIOSCAN59", label: "59€ déduits de ta formule coaching (Essential/Elite/Private Lab)" },
                BLOOD_ANALYSIS: { code: "BLOOD99", label: "99€ déduits de ta formule coaching (Essential/Elite/Private Lab)" },
              };
              // PEPTIDES_ENGINE deduction is tier-aware (Solo/Coached/Tracked).
              const peptidesTierForPromo = (order.metadata as any)?.peptidesTier as "solo" | "coached" | "tracked" | undefined;
              if (peptidesTierForPromo === "solo") {
                promoByType2.PEPTIDES_ENGINE = { code: "PEPTIDES199", label: "199€ déduits sur Essential/Elite/Private Lab 8 ou 12 sem (valide 8 sem)" };
              } else if (peptidesTierForPromo === "tracked") {
                promoByType2.PEPTIDES_ENGINE = { code: "PEPTIDES399", label: "399€ déduits sur Essential/Elite/Private Lab 8 ou 12 sem (valide 8 sem)" };
              } else {
                // Default to Coached for missing tier (back-compat with old orders pre-tier).
                promoByType2.PEPTIDES_ENGINE = { code: "PEPTIDES299", label: "299€ déduits sur Essential/Elite/Private Lab 8 ou 12 sem (valide 8 sem)" };
              }
              const promo2 = promoByType2[order.productType];
              const prodLabel2 = order.productType === "ELITE" ? "Ultimate Scan" : order.productType === "PREMIUM" ? "Anabolic Bioscan" : order.productType === "BLOOD_ANALYSIS" ? "Blood Analysis" : order.productType === "PEPTIDES_ENGINE" ? "Peptides Engine" : order.productName;
              if (["ELITE", "PREMIUM", "BLOOD_ANALYSIS", "PEPTIDES_ENGINE"].includes(order.productType)) {
                const isPeptides = order.productType === "PEPTIDES_ENGINE";
                const isBlood = order.productType === "BLOOD_ANALYSIS";
                let msg: string;
                if (isBlood) {
                  msg = `Salut ${clientName2},\n\nMerci pour ta commande Blood Analysis. Ton paiement est bien recu.\n\nVoici la liste exacte des marqueurs a demander a ton medecin ou directement au laboratoire (panel complet APEXLABS , 39 biomarqueurs) :\n\nPANEL 1 : HORMONES ANABOLIQUES\nTestosterone totale, Testosterone libre, SHBG, Cortisol (matin a jeun), DHEA-S, IGF-1, LH, FSH, Estradiol\n\nPANEL 2 : THYROIDE\nTSH, T3 libre, T4 libre, Anti-TPO\n\nPANEL 3 : METABOLISME ET LIPIDES\nGlycemie a jeun, HbA1c, Insuline a jeun, Cholesterol total, HDL, LDL, Triglycerides, ApoB, Lp(a)\n\nPANEL 4 : INFLAMMATION ET FER\nCRP ultra-sensible, Ferritine, Homocysteine, Vitesse de sedimentation\n\nPANEL 5 : VITAMINES ET MINERAUX\nVitamine D (25-OH), Vitamine B12, Magnesium, Zinc, Folates\n\nPANEL 6 : HEPATIQUE ET RENAL\nALAT, ASAT, Gamma-GT, Creatinine, DFG (eGFR), Acide urique\n\nNFS (Numeration Formule Sanguine) complete\n\nPresente-toi dans n'importe quel labo avec cette liste. La plupart acceptent sans ordonnance. Sinon, ton generaliste te fait l'ordonnance.\n\nUne fois ta prise de sang faite, uploade ton PDF sur : https://apexlabs.achzodcoaching.com/auth/login?next=%2Fblood-dashboard&email=${encodeURIComponent(clientEmail2 ?? "")}\n\nTu cliques sur le lien, tu recois un email avec un lien d'acces unique (verifie aussi tes spams), tu cliques dessus, tu arrives sur ton dashboard. La tu remplis tes infos, tu glisses ton PDF dans la zone d'upload, et tu lances l'analyse.\n\nIMPORTANT : un seul PDF par upload (10 MB max). Si tu as plusieurs fichiers a fusionner :\n- Sur iPhone (Fichiers) : mets tes PDFs dans un dossier, "Selectionner", coche-les dans l'ordre, "..." en bas, "Creer un PDF".\n- Alternative : ilovepdf.com/fr/fusionner_pdf , glisse-depose tes fichiers, telecharge le PDF unique, uploade-le.\n\n${promo2 ? `Ton code promo : ${promo2.code}\n${promo2.label}\nachzodcoaching.com/formules-coaching\n\n` : ""}Achzod`;
                } else {
                  const deliveryMsg = isPeptides
                    ? "Ton protocole est en cours de generation. Tu le recevras par email dans les prochaines minutes."
                    : "Ton rapport est en cours de generation. Tu le recevras par email d'ici 24h.";
                  msg = `Salut ${clientName2},\n\nMerci pour ta commande ${prodLabel2}. Ton paiement est bien recu.\n\n${deliveryMsg}\n\n${promo2 ? `Ton code promo : ${promo2.code}\n${promo2.label}\nachzodcoaching.com/formules-coaching\n\n` : ""}Si tu as des questions, reponds directement a cet email.\n\nAchzod`;
                }
                await sendCTAEmail(clientEmail2!, `${prodLabel2} : commande recue`, msg);
              }
            });

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
              await grantBloodCreditsForOrder(order.id, email, 2, "peptidesCreditsGranted");
            }

            // Blood Analysis: add the two credits included in the offer.
            if (email && planType === "BLOOD_ANALYSIS") {
              await grantBloodCreditsForOrder(
                order.id,
                email,
                BLOOD_ANALYSIS_PURCHASE_CREDITS,
                "bloodCreditGranted",
              );
            }

            // Peptides Engine: DO NOT generate here , setInterval handles it
            // Generating in webhook causes double reports (webhook + setInterval race condition)
            if (email && planType === "PEPTIDES_ENGINE") {
              console.log(`[Webhook] Peptides Engine paid for ${email} , setInterval will generate`);
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
                    // IDEMPOTENCY: if /api/audit/create already ran, or the webhook fires
                    // twice (Stripe retries), we reuse the recent audit. Prevents two
                    // audits → two generations → two different reports landing in inbox.
                    const recent = await storage.findRecentAuditByEmailAndType(email, planType as any, 30).catch(() => undefined);
                    const audit = recent ?? await storage.createAudit({
                      userId: "",
                      type: planType as any,
                      email,
                      responses: responses as Record<string, unknown>,
                    });

                    if (recent) {
                      console.log(`[Webhook] ♻️  Reusing recent audit ${audit.id} for ${email} (${planType}) , no duplicate creation`);
                    } else {
                      console.log(`[Webhook] ✅ Audit ${audit.id} created automatically for order ${order.id}`);
                    }

                    // Link order to audit (CAS-style: sets audit_id only if currently NULL)
                    await storage.claimOrderForAudit(order.id, audit.id);

                    // Clean up questionnaire progress
                    await storage.deleteProgress(email).catch(() => {});

                    // Trigger report generation + email for PREMIUM/ELITE, but only if we
                    // win the atomic CAS on report_delivery_status. Losing the CAS means
                    // another caller (inline create, prior webhook fire) already has it.
                    if (planType === "PREMIUM" || planType === "ELITE") {
                      const claimed = await storage.claimAuditForGeneration(audit.id).catch(() => false);
                      if (!claimed) {
                        console.warn(`[Webhook] ⏭️ Could not claim audit ${audit.id} for generation , another process owns it, NOT triggering parallel gen`);
                      } else {
                        try {
                          await startReportGeneration(audit.id, responses as Record<string, unknown>, {}, planType);
                          processReportAndSendEmail(audit.id, email, planType).catch((err) => {
                            console.error(`[Webhook] processReportAndSendEmail failed for ${audit.id}:`, err);
                            storage.updateAudit(audit.id, { reportDeliveryStatus: "EMAIL_FAILED" }).catch(() => {});
                          });
                          console.log(`[Webhook] ✅ Report generation triggered for ${audit.id} (${planType})`);
                        } catch (genErr) {
                          console.error(`[Webhook] ❌ Failed to trigger generation for ${audit.id}:`, genErr);
                        }
                      }
                    }
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
      res.setHeader("Content-Disposition", `attachment; filename="apexlabs-orders-${new Date().toISOString().split("T")[0]}.csv"`);
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
          // Table may not exist , skip
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
      const pending = allAudits.filter(a => a.reportDeliveryStatus === 'SCHEDULED' && !a.reportSentAt).length;
      const ready = allAudits.filter(a => a.reportDeliveryStatus === 'READY' && !a.reportSentAt).length;

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
          acceptedByProvider: delivered,
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
          deliveryMetricNote: "delivered is legacy naming; it means SendPulse API accepted the message, not confirmed inbox placement",
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
      const { userId: SENDPULSE_USER_ID, secret: SENDPULSE_SECRET } = getSendPulseCredentials();

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
      const accessToken = await getSendPulseAdminToken();
      const days = Math.min(Math.max(Number(req.query.days) || 14, 1), 180);
      const fromDate = String(
        req.query.from_date || new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
      );
      const pageLimit = Math.min(Math.max(Number(req.query.pageLimit) || 100, 1), 100);
      const maxPages = Math.min(Math.max(Number(req.query.pages) || 5, 1), 50);
      const responseLimit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 500);
      const detailsEnabled = String(req.query.details ?? "1") !== "0";
      const detailLimit = Math.min(Math.max(Number(req.query.detailLimit) || pageLimit * maxPages, 1), 5000);
      const recipientFilter = String(req.query.recipient || req.query.email || "").trim().toLowerCase();
      const subjectFilter = String(req.query.subject || "").trim().toLowerCase();
      const recordFilter = String(req.query.recordFilter || req.query.only || "all").trim().toLowerCase();

      const allEmails = await fetchSendPulseEmails(accessToken, {
        fromDate,
        pageLimit,
        maxPages,
        logPrefix: "SendPulseLiveStats",
      });

      const filteredEmails = allEmails.filter((email: SendPulseEmailRecord) => {
        const recipient = sendPulseRecipient(email).toLowerCase();
        const subject = sendPulseSubject(email).toLowerCase();
        if (recipientFilter && !recipient.includes(recipientFilter)) return false;
        if (subjectFilter && !subject.includes(subjectFilter)) return false;
        return true;
      });

      const details = detailsEnabled
        ? await fetchSendPulseEmailDetails(accessToken, filteredEmails, detailLimit, "SendPulseLiveStatsDetails")
        : { emails: filteredEmails, attempted: 0, fetched: 0, errors: [] };
      const emails = details.emails;

      // Calculate stats
      const totalSent = emails.length;
      const delivered = emails.filter(sendPulseIsDelivered).length;
      const hardFailed = emails.filter(sendPulseIsHardFailed).length;
      const softFailed = emails.filter(sendPulseIsSoftFailed).length;
      const opened = emails.filter((e: SendPulseEmailRecord) => sendPulseEngagementCount(e, "opens") > 0).length;
      const clicked = emails.filter((e: SendPulseEmailRecord) => sendPulseEngagementCount(e, "clicks") > 0).length;

      // By type (parse from subject)
      const byType: Record<string, number> = {
        GRATUIT: 0,
        PREMIUM: 0,
        ELITE: 0,
        BLOOD_ANALYSIS: 0,
        OTHER: 0,
      };

      emails.forEach((email: SendPulseEmailRecord) => {
        const subject = sendPulseSubject(email).toLowerCase();
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

      const last24hCount = emails.filter((e: SendPulseEmailRecord) => {
        const sentTime = sendPulseSendDate(e) ? new Date(String(sendPulseSendDate(e))).getTime() : 0;
        return sentTime >= last24h;
      }).length;

      const last7dCount = emails.filter((e: SendPulseEmailRecord) => {
        const sentTime = sendPulseSendDate(e) ? new Date(String(sendPulseSendDate(e))).getTime() : 0;
        return sentTime >= last7d;
      }).length;
      const recordsForResponse = emails.filter((email: SendPulseEmailRecord) => {
        if (recordFilter === "all") return true;
        if (recordFilter === "failed") return sendPulseIsHardFailed(email) || sendPulseIsSoftFailed(email);
        if (recordFilter === "hardfailed") return sendPulseIsHardFailed(email);
        if (recordFilter === "softfailed") return sendPulseIsSoftFailed(email);
        if (recordFilter === "delivered") return sendPulseIsDelivered(email);
        if (recordFilter === "opened") return sendPulseEngagementCount(email, "opens") > 0;
        if (recordFilter === "clicked") return sendPulseEngagementCount(email, "clicks") > 0;
        if (recordFilter === "deliverednoopen") {
          return sendPulseIsDelivered(email) &&
            sendPulseEngagementCount(email, "opens") === 0 &&
            sendPulseEngagementCount(email, "clicks") === 0;
        }
        if (recordFilter === "promo") return matchesEmailAuditScope("", sendPulseSubject(email), "promo");
        if (recordFilter === "report") return matchesEmailAuditScope("", sendPulseSubject(email), "report");
        return true;
      });

      res.json({
        success: true,
        source: "SendPulse API Live",
        stats: {
          totalSent,
          delivered,
          failed: hardFailed + softFailed,
          hardFailed,
          softFailed,
          opened,
          clicked,
          byType,
          last24h: last24hCount,
          last7d: last7dCount,
          deliveryRate: totalSent > 0 ? ((delivered / totalSent) * 100).toFixed(1) + '%' : '0.0%',
          openRate: totalSent > 0 ? ((opened / totalSent) * 100).toFixed(1) + '%' : '0.0%',
          clickRate: totalSent > 0 ? ((clicked / totalSent) * 100).toFixed(1) + '%' : '0.0%'
        },
        query: {
          days,
          fromDate,
          pageLimit,
          maxPages,
          fetched: allEmails.length,
          filtered: emails.length,
          detailsEnabled,
          detailsAttempted: details.attempted,
          detailsFetched: details.fetched,
          detailErrors: details.errors,
          recipient: recipientFilter || null,
          subject: subjectFilter || null,
          recordFilter,
          recordsForResponse: recordsForResponse.length,
        },
        records: recordsForResponse.slice(0, responseLimit).map(simplifySendPulseEmail),
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

  // Reconcile local email_tracking rows with SendPulse live SMTP records.
  // SendPulse's immediate /smtp/emails response often returns { result:true }
  // without an email id. This endpoint backfills sendpulse_task_id by matching
  // recipient + subject + send timestamp against /smtp/emails history.
  app.post("/api/admin/sendpulse/reconcile-tracking", async (req, res) => {
    if (!requireAdminAuth(req, res)) return;
    try {
      const body = req.body || {};
      const apply = body.apply === true || String(req.query.apply || "") === "1";
      const days = Math.min(Math.max(Number(body.days ?? req.query.days) || 30, 1), 365);
      const fromDate = String(
        body.fromDate || req.query.from_date || new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
      );
      const pageLimit = Math.min(Math.max(Number(body.pageLimit ?? req.query.pageLimit) || 100, 1), 100);
      const maxPages = Math.min(Math.max(Number(body.pages ?? req.query.pages) || 50, 1), 100);
      const dbLimit = Math.min(Math.max(Number(body.dbLimit ?? req.query.dbLimit) || 1000, 1), 10000);
      const detailsEnabled = String(body.details ?? req.query.details ?? "1") !== "0";
      const detailLimit = Math.min(Math.max(Number(body.detailLimit ?? req.query.detailLimit) || pageLimit * maxPages, 1), 10000);
      const recipientFilter = String(body.recipient || req.query.recipient || body.email || req.query.email || "").trim().toLowerCase();
      const subjectFilter = String(body.subject || req.query.subject || "").trim().toLowerCase();
      const maxDeltaMinutes = Math.min(Math.max(Number(body.maxDeltaMinutes ?? req.query.maxDeltaMinutes) || 20, 1), 180);

      const dbResult = await pool.query(
        `SELECT id, email_type, recipient_email, subject, audit_id, audit_type,
                sendpulse_task_id, sendpulse_status, sendpulse_error, sent_at, metadata
           FROM email_tracking
          WHERE sent_at >= $1
            AND sendpulse_status = 'success'
            AND (sendpulse_task_id IS NULL OR sendpulse_task_id = '')
            AND ($2 = '' OR LOWER(recipient_email) LIKE '%' || $2 || '%')
            AND ($3 = '' OR LOWER(COALESCE(subject, '')) LIKE '%' || $3 || '%')
          ORDER BY sent_at DESC
          LIMIT $4`,
        [fromDate, recipientFilter, subjectFilter, dbLimit]
      );

      const accessToken = await getSendPulseAdminToken();
      const liveEmails = await fetchSendPulseEmails(accessToken, {
        fromDate,
        pageLimit,
        maxPages,
        logPrefix: "SendPulseReconcile",
      });
      const detailResult = detailsEnabled
        ? await fetchSendPulseEmailDetails(accessToken, liveEmails, detailLimit, "SendPulseReconcileDetails")
        : { emails: liveEmails, attempted: 0, fetched: 0, errors: [] };
      const liveEmailsForMatch = detailResult.emails;

      const liveByRecipient = new Map<string, SendPulseEmailRecord[]>();
      for (const email of liveEmailsForMatch) {
        const recipient = sendPulseRecipient(email).toLowerCase();
        if (!recipient) continue;
        const list = liveByRecipient.get(recipient) || [];
        list.push(email);
        liveByRecipient.set(recipient, list);
      }

      const items: Array<any> = [];
      let matched = 0;
      let updated = 0;

      for (const row of dbResult.rows) {
        const recipient = String(row.recipient_email || "").toLowerCase();
        const sentMs = new Date(row.sent_at).getTime();
        const candidates = (liveByRecipient.get(recipient) || [])
          .filter((email) => sendPulseSubjectsMatch(sendPulseSubject(email), row.subject))
          .map((email) => ({
            email,
            deltaMs: Math.abs(sendPulseSendDateMs(email) - sentMs),
          }))
          .filter((candidate) => candidate.deltaMs <= maxDeltaMinutes * 60 * 1000)
          .sort((a, b) => a.deltaMs - b.deltaMs);

        const best = candidates[0]?.email;
        const sendpulseTaskId = best ? sendPulseEmailId(best) : "";
        const action = best && apply ? "updated" : best ? "matched" : "unmatched";

        if (best) {
          matched++;
          if (apply && sendpulseTaskId) {
            const update = await pool.query(
              `UPDATE email_tracking
                  SET sendpulse_task_id = $1,
                      metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
                        'sendpulseLiveLookup', 'matched',
                        'sendpulseReconciledAt', NOW(),
                        'sendpulseSendDate', $2::text,
                        'sendpulseSmtpAnswerCode', $3::text,
                        'sendpulseSmtpAnswerData', $4::text,
                        'sendpulseReconcileDeltaSeconds', $5::int
                      )
                WHERE id = $6`,
              [
                sendpulseTaskId,
                sendPulseSendDate(best),
                sendPulseSmtpCode(best),
                best.smtp_answer_data || "",
                Math.round((candidates[0]?.deltaMs || 0) / 1000),
                row.id,
              ]
            );
            updated += update.rowCount ?? 0;
          }
        }

        items.push({
          id: row.id,
          emailType: row.email_type,
          recipientEmail: row.recipient_email,
          subject: row.subject,
          sentAt: row.sent_at,
          auditId: row.audit_id,
          auditType: row.audit_type,
          action,
          matchedSendpulseTaskId: sendpulseTaskId || null,
          matchedSendDate: best ? sendPulseSendDate(best) : null,
          smtpAnswerCode: best ? sendPulseSmtpCode(best) : null,
          smtpAnswerData: best?.smtp_answer_data || null,
          deltaSeconds: best ? Math.round((candidates[0]?.deltaMs || 0) / 1000) : null,
        });
      }

      res.json({
        success: true,
        apply,
        query: {
          days,
          fromDate,
          pageLimit,
          maxPages,
          dbLimit,
          recipient: recipientFilter || null,
          subject: subjectFilter || null,
          maxDeltaMinutes,
          detailsEnabled,
          detailsAttempted: detailResult.attempted,
          detailsFetched: detailResult.fetched,
          detailErrors: detailResult.errors,
          localRows: dbResult.rowCount ?? dbResult.rows.length,
          liveFetched: liveEmails.length,
          liveForMatch: liveEmailsForMatch.length,
        },
        summary: {
          matched,
          unmatched: dbResult.rows.length - matched,
          updated,
        },
        items,
      });
    } catch (error) {
      console.error("[SendPulseReconcile] Error:", error);
      res.status(500).json({
        success: false,
        error: "Erreur reconciliation SendPulse",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  });

  // Sync local tracking rows with the final SMTP status exposed by SendPulse.
  // The immediate send response can be "accepted" while a later SMTP detail is
  // a hard fail (for example mailbox over quota). Webhooks do not always arrive,
  // so this endpoint is the recovery/audit backstop.
  app.post("/api/admin/sendpulse/sync-live-status", async (req, res) => {
    if (!requireAdminAuth(req, res)) return;
    try {
      const body = req.body || {};
      const apply = body.apply === true || String(req.query.apply || "") === "1";
      const days = Math.min(Math.max(Number(body.days ?? req.query.days) || 14, 1), 365);
      const fromDate = String(
        body.fromDate || req.query.from_date || new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
      );
      const pageLimit = Math.min(Math.max(Number(body.pageLimit ?? req.query.pageLimit) || 100, 1), 100);
      const maxPages = Math.min(Math.max(Number(body.pages ?? req.query.pages) || 50, 1), 100);
      const dbLimit = Math.min(Math.max(Number(body.dbLimit ?? req.query.dbLimit) || 5000, 1), 20000);
      const detailsEnabled = String(body.details ?? req.query.details ?? "1") !== "0";
      const detailLimit = Math.min(Math.max(Number(body.detailLimit ?? req.query.detailLimit) || pageLimit * maxPages, 1), 10000);
      const recipientFilter = String(body.recipient || req.query.recipient || body.email || req.query.email || "").trim().toLowerCase();
      const subjectFilter = String(body.subject || req.query.subject || "").trim().toLowerCase();
      const maxDeltaMinutes = Math.min(Math.max(Number(body.maxDeltaMinutes ?? req.query.maxDeltaMinutes) || 20, 1), 180);

      const dbResult = await pool.query(
        `SELECT id, email_type, recipient_email, subject, audit_id, audit_type,
                sendpulse_task_id, sendpulse_status, sendpulse_error, sent_at, metadata
           FROM email_tracking
          WHERE sent_at >= $1
            AND ($2 = '' OR LOWER(recipient_email) LIKE '%' || $2 || '%')
            AND ($3 = '' OR LOWER(COALESCE(subject, '')) LIKE '%' || $3 || '%')
          ORDER BY sent_at DESC
          LIMIT $4`,
        [fromDate, recipientFilter, subjectFilter, dbLimit]
      );

      const accessToken = await getSendPulseAdminToken();
      const liveEmails = await fetchSendPulseEmails(accessToken, {
        fromDate,
        pageLimit,
        maxPages,
        logPrefix: "SendPulseLiveStatusSync",
      });
      const detailResult = detailsEnabled
        ? await fetchSendPulseEmailDetails(accessToken, liveEmails, detailLimit, "SendPulseLiveStatusSyncDetails")
        : { emails: liveEmails, attempted: 0, fetched: 0, errors: [] };
      const liveEmailsForMatch = detailResult.emails;

      const liveById = new Map<string, SendPulseEmailRecord>();
      const liveByRecipient = new Map<string, SendPulseEmailRecord[]>();
      for (const email of liveEmailsForMatch) {
        const id = sendPulseEmailId(email);
        if (id) liveById.set(id, email);
        const recipient = sendPulseRecipient(email).toLowerCase();
        if (!recipient) continue;
        const list = liveByRecipient.get(recipient) || [];
        list.push(email);
        liveByRecipient.set(recipient, list);
      }

      const items: Array<any> = [];
      let matched = 0;
      let failedLive = 0;
      let deliveredLive = 0;
      let updated = 0;

      for (const row of dbResult.rows) {
        const recipient = String(row.recipient_email || "").toLowerCase();
        const sentMs = new Date(row.sent_at).getTime();
        const existingTaskId = String(row.sendpulse_task_id || "").trim();
        let providerIdMismatch: any = null;
        let best = existingTaskId ? liveById.get(existingTaskId) || null : null;

        if (best) {
          const liveRecipient = sendPulseRecipient(best).toLowerCase();
          const liveSubject = sendPulseSubject(best);
          const recipientMatches = liveRecipient === recipient;
          const subjectMatches = sendPulseSubjectsMatch(liveSubject, row.subject);
          if (!recipientMatches || !subjectMatches) {
            providerIdMismatch = {
              existingTaskId,
              liveRecipient,
              liveSubject,
              expectedRecipient: recipient,
              expectedSubject: row.subject,
            };
            best = null;
          }
        }

        if (!best) {
          const candidates = (liveByRecipient.get(recipient) || [])
            .filter((email) => sendPulseSubjectsMatch(sendPulseSubject(email), row.subject))
            .map((email) => ({
              email,
              deltaMs: Math.abs(sendPulseSendDateMs(email) - sentMs),
            }))
            .filter((candidate) => candidate.deltaMs <= maxDeltaMinutes * 60 * 1000)
            .sort((a, b) => a.deltaMs - b.deltaMs);
          best = candidates[0]?.email || null;
        }

        const sendpulseTaskId = best ? sendPulseEmailId(best) : "";
        const smtpCode = best ? sendPulseSmtpCode(best) : null;
        const hardFailed = best ? sendPulseIsHardFailed(best) : false;
        const softFailed = best ? sendPulseIsSoftFailed(best) : false;
        const delivered = best ? sendPulseIsDelivered(best) : false;
        const liveFailure = hardFailed || softFailed;
        const metadata = row.metadata && typeof row.metadata === "object" ? row.metadata : {};
        const metadataSmtpCode = Number((metadata as any).sendpulseSmtpAnswerCode);
        const metadataSmtpData = String((metadata as any).sendpulseSmtpAnswerData || "");
        const metadataLiveDelivered =
          (metadata as any).sendpulseVerified === true &&
          Number.isFinite(metadataSmtpCode) &&
          metadataSmtpCode >= 200 &&
          metadataSmtpCode < 300 &&
          metadataSmtpData.toLowerCase().includes(recipient);
        const criticalMismatch = !!providerIdMismatch && !best && !metadataLiveDelivered && matchesEmailAuditScope(row.email_type, row.subject, "report");
        const shouldBackfillId = !!best && !!sendpulseTaskId && !existingTaskId;
        const shouldMarkFailed = (liveFailure || criticalMismatch) && String(row.sendpulse_status || "").toLowerCase() !== "failed";
        const action = shouldMarkFailed
          ? apply ? "marked_failed" : "would_mark_failed"
          : shouldBackfillId
            ? apply ? "backfilled_id" : "would_backfill_id"
            : best || metadataLiveDelivered
              ? "matched_no_change"
              : "unmatched";

        if (best) matched++;
        if (liveFailure) failedLive++;
        if (delivered || metadataLiveDelivered) deliveredLive++;

        if (apply && (best || criticalMismatch) && (shouldMarkFailed || shouldBackfillId)) {
          const status = liveFailure || criticalMismatch ? "failed" : row.sendpulse_status;
          const error = liveFailure
            ? JSON.stringify({
                eventType: hardFailed ? "hard_fail" : "soft_fail",
                providerTaskId: sendpulseTaskId || null,
                smtpAnswerCode: smtpCode,
                smtpAnswerSubcode: best?.smtp_answer_subcode ?? null,
                smtpAnswerData: best?.smtp_answer_data || null,
              })
            : criticalMismatch
              ? JSON.stringify({
                  eventType: "provider_id_recipient_mismatch",
                  providerTaskId: existingTaskId || null,
                  ...providerIdMismatch,
                })
            : row.sendpulse_error;

          const update = await pool.query(
            `UPDATE email_tracking
                SET sendpulse_task_id = COALESCE(NULLIF($1, ''), sendpulse_task_id),
                    sendpulse_status = $2,
                    sendpulse_error = $3,
                    metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
                      'sendpulseLiveStatusSyncedAt', NOW(),
                      'sendpulseLiveStatusSync', $4::text,
                      'sendpulseSendDate', $5::text,
                      'sendpulseSmtpAnswerCode', $6::text,
                      'sendpulseSmtpAnswerData', $7::text,
                      'sendpulseProviderIdMismatch', $9::jsonb
                    )
              WHERE id = $8`,
            [
              sendpulseTaskId,
              status,
              error,
              action,
              best ? sendPulseSendDate(best) : null,
              smtpCode,
              best?.smtp_answer_data || "",
              row.id,
              JSON.stringify(providerIdMismatch || null),
            ]
          );
          updated += update.rowCount ?? 0;
        }

        items.push({
          id: row.id,
          emailType: row.email_type,
          recipientEmail: row.recipient_email,
          subject: row.subject,
          sentAt: row.sent_at,
          previousStatus: row.sendpulse_status,
          action,
          matchedSendpulseTaskId: sendpulseTaskId || null,
          matchedSendDate: best ? sendPulseSendDate(best) : null,
          smtpAnswerCode: smtpCode,
          smtpAnswerData: best?.smtp_answer_data || null,
          providerIdMismatch,
        });
      }

      res.json({
        success: true,
        apply,
        query: {
          days,
          fromDate,
          pageLimit,
          maxPages,
          dbLimit,
          recipient: recipientFilter || null,
          subject: subjectFilter || null,
          maxDeltaMinutes,
          detailsEnabled,
          detailsAttempted: detailResult.attempted,
          detailsFetched: detailResult.fetched,
          detailErrors: detailResult.errors,
          localRows: dbResult.rowCount ?? dbResult.rows.length,
          liveFetched: liveEmails.length,
          liveForMatch: liveEmailsForMatch.length,
        },
        summary: {
          matched,
          unmatched: dbResult.rows.length - matched,
          deliveredLive,
          failedLive,
          updated,
        },
        items,
      });
    } catch (error) {
      console.error("[SendPulseLiveStatusSync] Error:", error);
      res.status(500).json({
        success: false,
        error: "Erreur synchro live SendPulse",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  });

  // ==================== PROMO / CTA DELIVERABILITY AUDIT ====================
  app.get("/api/admin/promo-deliverability-audit", async (req, res) => {
    if (!requireAdminAuth(req, res)) return;

    try {
      const scopeInput = String(req.query.scope || "all").toLowerCase();
      const scope = ["promo", "report", "all"].includes(scopeInput) ? scopeInput : "all";
      const days = Math.min(Math.max(Number(req.query.days) || 180, 1), 365);
      const fromDate = String(
        req.query.from_date || new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
      );
      const pageLimit = Math.min(Math.max(Number(req.query.pageLimit) || 100, 1), 100);
      const maxPages = Math.min(Math.max(Number(req.query.pages) || 20, 1), 100);
      const responseLimit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 500);
      const dbLimit = Math.min(Math.max(Number(req.query.dbLimit) || 5000, 1), 20000);
      const detailsEnabled = String(req.query.details ?? "1") !== "0";
      const detailLimit = Math.min(Math.max(Number(req.query.detailLimit) || pageLimit * maxPages, 1), 10000);
      const recipientFilter = String(req.query.recipient || req.query.email || "").trim().toLowerCase();
      const subjectFilter = String(req.query.subject || "").trim().toLowerCase();

      let dbRows: any[] = [];
      let dbError: string | null = null;
      try {
        const dbResult = await pool.query(
          `SELECT id, email_type, recipient_email, subject, audit_id, audit_type,
                  sendpulse_task_id, sendpulse_status, sendpulse_error, sent_at,
                  opened, clicked, converted, conversion_type, metadata,
                  split_part(lower(recipient_email), '@', 2) AS domain
             FROM email_tracking
            WHERE sent_at >= $1
              AND (
                ($2 = 'promo' AND (email_type = ANY($3::text[]) OR lower(coalesce(subject, '')) LIKE ANY($5::text[])))
                OR ($2 = 'report' AND (email_type = ANY($4::text[]) OR lower(coalesce(subject, '')) LIKE ANY($6::text[])))
                OR ($2 = 'all' AND (
                  email_type = ANY($3::text[])
                  OR email_type = ANY($4::text[])
                  OR lower(coalesce(subject, '')) LIKE ANY($5::text[])
                  OR lower(coalesce(subject, '')) LIKE ANY($6::text[])
                ))
              )
              AND ($7 = '' OR lower(recipient_email) LIKE '%' || $7 || '%')
              AND ($8 = '' OR lower(coalesce(subject, '')) LIKE '%' || $8 || '%')
            ORDER BY sent_at DESC
            LIMIT $9`,
          [
            fromDate,
            scope,
            PROMO_EMAIL_TYPES,
            REPORT_EMAIL_TYPES,
            PROMO_SUBJECT_PATTERNS,
            REPORT_SUBJECT_PATTERNS,
            recipientFilter,
            subjectFilter,
            dbLimit,
          ]
        );
        dbRows = dbResult.rows;
      } catch (error) {
        dbError = error instanceof Error ? error.message : String(error);
        console.error("[PromoDeliverabilityAudit] DB unavailable, continuing with SendPulse live only:", dbError);
      }
      const byType: Record<string, number> = {};
      const byDomain: Record<string, number> = {};
      const inc = (target: Record<string, number>, key: string | null | undefined) => {
        const safeKey = key || "unknown";
        target[safeKey] = (target[safeKey] || 0) + 1;
      };
      dbRows.forEach((row: any) => {
        inc(byType, row.email_type);
        inc(byDomain, row.domain);
      });

      const dbAccepted = dbRows.filter((row: any) => row.sendpulse_status === "success").length;
      const dbFailed = dbRows.filter((row: any) => row.sendpulse_status === "failed").length;
      const dbOpened = dbRows.filter((row: any) => row.opened).length;
      const dbClicked = dbRows.filter((row: any) => row.clicked).length;
      const dbConverted = dbRows.filter((row: any) => row.converted).length;
      const dbMissingProviderId = dbRows.filter((row: any) => row.sendpulse_status === "success" && !row.sendpulse_task_id).length;

      const accessToken = await getSendPulseAdminToken();
      const allLiveEmails = await fetchSendPulseEmails(accessToken, {
        fromDate,
        pageLimit,
        maxPages,
        logPrefix: "PromoDeliverabilityAudit",
      });
      const scopedLiveEmails = allLiveEmails.filter((email: SendPulseEmailRecord) => {
        const recipient = sendPulseRecipient(email).toLowerCase();
        const subject = sendPulseSubject(email).toLowerCase();
        if (!matchesEmailAuditScope("", subject, scope)) return false;
        if (recipientFilter && !recipient.includes(recipientFilter)) return false;
        if (subjectFilter && !subject.includes(subjectFilter)) return false;
        return true;
      });
      const detailResult = detailsEnabled
        ? await fetchSendPulseEmailDetails(accessToken, scopedLiveEmails, detailLimit, "PromoDeliverabilityDetails")
        : { emails: scopedLiveEmails, attempted: 0, fetched: 0, errors: [] };
      const liveEmails = detailResult.emails;

      const liveByDomain: Record<string, number> = {};
      liveEmails.forEach((email: SendPulseEmailRecord) => {
        const recipient = sendPulseRecipient(email).toLowerCase();
        inc(liveByDomain, recipient.includes("@") ? recipient.split("@").pop() : "unknown");
      });

      const liveDelivered = liveEmails.filter(sendPulseIsDelivered).length;
      const liveHardFailed = liveEmails.filter(sendPulseIsHardFailed).length;
      const liveSoftFailed = liveEmails.filter(sendPulseIsSoftFailed).length;
      const liveOpened = liveEmails.filter((email: SendPulseEmailRecord) => sendPulseEngagementCount(email, "opens") > 0).length;
      const liveClicked = liveEmails.filter((email: SendPulseEmailRecord) => sendPulseEngagementCount(email, "clicks") > 0).length;
      const liveDeliveredUnopened = liveEmails.filter((email: SendPulseEmailRecord) =>
        sendPulseIsDelivered(email) &&
        sendPulseEngagementCount(email, "opens") === 0 &&
        sendPulseEngagementCount(email, "clicks") === 0
      );
      const liveOpenedNoClick = liveEmails.filter((email: SendPulseEmailRecord) =>
        sendPulseIsDelivered(email) &&
        sendPulseEngagementCount(email, "opens") > 0 &&
        sendPulseEngagementCount(email, "clicks") === 0
      );

      const rowAction = (row: any) => ({
        id: row.id,
        emailType: row.email_type,
        recipientEmail: row.recipient_email,
        subject: row.subject,
        auditId: row.audit_id,
        auditType: row.audit_type,
        sendpulseTaskId: row.sendpulse_task_id,
        sendpulseStatus: row.sendpulse_status,
        sendpulseError: row.sendpulse_error,
        sentAt: row.sent_at,
        opened: row.opened,
        clicked: row.clicked,
        converted: row.converted,
        conversionType: row.conversion_type,
      });

      res.json({
        success: true,
        source: "email_tracking DB + SendPulse SMTP live details",
        note: "SMTP 2xx proves the recipient server accepted the email. It does not prove inbox placement or human read; opens/clicks depend on tracking being loaded.",
        query: {
          scope,
          days,
          fromDate,
          pageLimit,
          maxPages,
          dbLimit,
          fetchedFromSendPulse: allLiveEmails.length,
          liveFiltered: liveEmails.length,
          detailsEnabled,
          detailsAttempted: detailResult.attempted,
          detailsFetched: detailResult.fetched,
          detailErrors: detailResult.errors,
          recipient: recipientFilter || null,
          subject: subjectFilter || null,
        },
        db: {
          available: !dbError,
          error: dbError,
          stats: {
            totalTracked: dbRows.length,
            acceptedByProvider: dbAccepted,
            failedAtProvider: dbFailed,
            opened: dbOpened,
            clicked: dbClicked,
            converted: dbConverted,
            missingProviderId: dbMissingProviderId,
            openRate: dbRows.length > 0 ? ((dbOpened / dbRows.length) * 100).toFixed(1) + "%" : "0.0%",
            clickRate: dbRows.length > 0 ? ((dbClicked / dbRows.length) * 100).toFixed(1) + "%" : "0.0%",
            conversionRate: dbRows.length > 0 ? ((dbConverted / dbRows.length) * 100).toFixed(1) + "%" : "0.0%",
          },
          byType,
          byDomain,
          recent: dbRows.slice(0, responseLimit).map(rowAction),
        },
        sendpulse: {
          stats: {
            totalScoped: liveEmails.length,
            smtpDelivered: liveDelivered,
            hardFailed: liveHardFailed,
            softFailed: liveSoftFailed,
            opened: liveOpened,
            clicked: liveClicked,
            deliveryRate: liveEmails.length > 0 ? ((liveDelivered / liveEmails.length) * 100).toFixed(1) + "%" : "0.0%",
            openRate: liveEmails.length > 0 ? ((liveOpened / liveEmails.length) * 100).toFixed(1) + "%" : "0.0%",
            clickRate: liveEmails.length > 0 ? ((liveClicked / liveEmails.length) * 100).toFixed(1) + "%" : "0.0%",
          },
          byDomain: liveByDomain,
        },
        actionBuckets: {
          hardOrInvalidRecipient: liveEmails.filter(sendPulseIsHardFailed).slice(0, responseLimit).map(simplifySendPulseEmail),
          softFailureRetry: liveEmails.filter(sendPulseIsSoftFailed).slice(0, responseLimit).map(simplifySendPulseEmail),
          smtpDeliveredNoOpenNoClick: liveDeliveredUnopened.slice(0, responseLimit).map(simplifySendPulseEmail),
          openedNoClick: liveOpenedNoClick.slice(0, responseLimit).map(simplifySendPulseEmail),
          clickedNoConversion: dbRows.filter((row: any) => row.clicked && !row.converted).slice(0, responseLimit).map(rowAction),
          dbProviderFailed: dbRows.filter((row: any) => row.sendpulse_status === "failed").slice(0, responseLimit).map(rowAction),
          legacyAcceptedMissingProviderId: dbRows
            .filter((row: any) => row.sendpulse_status === "success" && !row.sendpulse_task_id)
            .slice(0, responseLimit)
            .map(rowAction),
        },
      });
    } catch (error) {
      console.error("[PromoDeliverabilityAudit] Error:", error);
      res.status(500).json({
        success: false,
        error: "Erreur audit deliverability promo",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  });

  // ==================== CTA STATS ====================
  app.get("/api/admin/cta-stats", async (req, res) => {
    if (!requireAdminAuth(req, res)) return;

    try {
      const days = Math.min(Math.max(Number(req.query.days) || 180, 1), 365);
      const fromDate = String(
        req.query.from_date || new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
      );
      const eventLimit = Math.min(Math.max(Number(req.query.eventLimit) || 100, 1), 500);

      const emailsResult = await pool.query(
        `SELECT id, email_type, recipient_email, subject, audit_id, audit_type,
                sendpulse_status, sendpulse_error, sent_at, opened, clicked,
                converted, conversion_type
           FROM email_tracking
          WHERE sent_at >= $1
            AND (
              email_type = ANY($2::text[])
              OR lower(coalesce(subject, '')) LIKE ANY($3::text[])
            )
          ORDER BY sent_at DESC`,
        [fromDate, PROMO_EMAIL_TYPES, PROMO_SUBJECT_PATTERNS]
      );

      const eventsResult = await pool.query(
        `SELECT ct.event_type, ct.url, ct.created_at,
                et.id AS email_tracking_id,
                et.email_type,
                et.recipient_email,
                et.subject,
                et.audit_id,
                et.audit_type
           FROM cta_tracking ct
           LEFT JOIN email_tracking et ON et.id = ct.email_tracking_id
          WHERE ct.created_at >= $1
            AND (
              et.id IS NULL
              OR et.email_type = ANY($2::text[])
              OR lower(coalesce(et.subject, '')) LIKE ANY($3::text[])
            )
          ORDER BY ct.created_at DESC
          LIMIT $4`,
        [fromDate, PROMO_EMAIL_TYPES, PROMO_SUBJECT_PATTERNS, eventLimit]
      );

      const emails = emailsResult.rows;
      const totalSent = emails.length;
      const accepted = emails.filter((email: any) => email.sendpulse_status === "success").length;
      const failed = emails.filter((email: any) => email.sendpulse_status === "failed").length;
      const opened = emails.filter((email: any) => email.opened).length;
      const clicked = emails.filter((email: any) => email.clicked).length;
      const converted = emails.filter((email: any) => email.converted).length;

      const byEventType: Record<string, number> = {};
      const byUrl: Record<string, number> = {};
      for (const event of eventsResult.rows) {
        const eventType = event.event_type || "unknown";
        byEventType[eventType] = (byEventType[eventType] || 0) + 1;
        if (event.url) byUrl[event.url] = (byUrl[event.url] || 0) + 1;
      }

      res.json({
        success: true,
        source: "email_tracking + cta_tracking DB",
        note: "For real SMTP delivery status use /api/admin/promo-deliverability-audit or /api/admin/sendpulse-live-stats; SendPulse list rows do not include reliable opens/clicks.",
        query: {
          days,
          fromDate,
          eventLimit,
        },
        stats: {
          totalSent,
          acceptedByProvider: accepted,
          failedAtProvider: failed,
          opened,
          clicked,
          converted,
          openRate: totalSent > 0 ? ((opened / totalSent) * 100).toFixed(1) + '%' : '0.0%',
          clickRate: totalSent > 0 ? ((clicked / totalSent) * 100).toFixed(1) + '%' : '0.0%',
          clickToOpenRate: opened > 0 ? ((clicked / opened) * 100).toFixed(1) + '%' : '0.0%',
          conversionRate: totalSent > 0 ? ((converted / totalSent) * 100).toFixed(1) + '%' : '0.0%',
          byEventType,
          byUrl,
          recentEvents: eventsResult.rows
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

      const scheduled = allAudits.filter(a => a.reportDeliveryStatus === 'SCHEDULED' && !a.reportSentAt);
      const ready = allAudits.filter(a => a.reportDeliveryStatus === 'READY' && !a.reportSentAt);
      const inconsistentSentState = allAudits.filter(a =>
        !!a.reportSentAt && (a.reportDeliveryStatus === 'READY' || a.reportDeliveryStatus === 'SCHEDULED')
      );

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
          stuck: stuck.length,
          alreadySentButStatusOpen: inconsistentSentState.length
        },
        alreadySentButStatusOpen: inconsistentSentState.map(a => ({
          id: a.id,
          email: a.email,
          type: a.type,
          status: a.reportDeliveryStatus,
          reportSentAt: a.reportSentAt,
          createdAt: a.createdAt
        }))
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
  // Reconcile audits stuck in READY/SCHEDULED that have never been moved to SENT,
  // but may already have been emailed (crashed between SendPulse success and the
  // status UPDATE, or SendPulse auth outage that returned false-negative failures).
  //
  // For each stuck audit, classify by what email_tracking says:
  //   - "already_sent": at least one sendReportReadyEmail row with non-failed status
  //                     → client received. Just fix DB state to SENT (NO email).
  //   - "failed_only":  only failed rows. Client did NOT receive.
  //   - "never_tried":  no sendReportReadyEmail row at all. Client did NOT receive.
  //
  // Modes:
  //   ?mode=dry-run      → returns analysis only (DEFAULT, zero side effects)
  //   ?mode=fix-state    → updates already_sent to SENT. NO email sent. Safe.
  //   ?mode=send-missing → sends email for failed_only + never_tried. DANGEROUS,
  //                        explicitly opt-in. Uses safeSendReportReadyEmail so
  //                        the dedup CAS still guards against any race.
  app.get("/api/admin/reconcile-ready-audits", async (req, res) => {
    if (!requireAdminAuth(req, res)) return;
    try {
      const mode = (req.query.mode as string) || "dry-run";
      if (!["dry-run", "fix-state", "send-missing"].includes(mode)) {
        res.status(400).json({ error: "mode invalide", allowed: ["dry-run", "fix-state", "send-missing"] });
        return;
      }

      const allAudits = await storage.getAllAudits();
      const stuck = allAudits.filter(a =>
        (a.reportDeliveryStatus === "READY" || a.reportDeliveryStatus === "SCHEDULED") &&
        !a.reportSentAt &&
        !!(a as any).narrativeReport
      );

      const results: Array<{
        auditId: string; email: string; type: string; ageDays: number;
        classification: "already_sent" | "failed_only" | "never_tried";
        trackingRows: number;
        action: "none" | "fixed_state" | "email_sent" | "email_failed" | "skipped";
      }> = [];

      for (const a of stuck) {
        const rows = await pool.query(
          `SELECT sendpulse_status FROM email_tracking
            WHERE audit_id = $1 AND email_type = 'sendReportReadyEmail'`,
          [a.id]
        );
        const hasSuccess = rows.rows.some(r => {
          const s = String(r.sendpulse_status ?? "").toLowerCase();
          return s !== "failed" && s !== "auth_failed" && s !== "unsubscribed";
        });
        const hasAny = rows.rows.length > 0;
        const classification = hasSuccess ? "already_sent" : hasAny ? "failed_only" : "never_tried";

        let action: typeof results[number]["action"] = "none";
        const ageDays = Math.floor((Date.now() - new Date(a.createdAt).getTime()) / 86400000);

        if (mode === "fix-state" && classification === "already_sent") {
          await storage.finalizeAuditSend(a.id, true).catch(() => {});
          action = "fixed_state";
        } else if (mode === "send-missing" && classification !== "already_sent") {
          const baseUrl = getBaseUrl();
          const out = await safeSendReportReadyEmail(a.id, a.email, a.type, baseUrl, { logPrefix: "[Reconcile]" });
          action = out.sent ? "email_sent" : "email_failed";
        }

        results.push({
          auditId: a.id,
          email: a.email,
          type: a.type,
          ageDays,
          classification,
          trackingRows: rows.rows.length,
          action,
        });
      }

      const summary = results.reduce((acc: any, r) => {
        acc[r.classification] = (acc[r.classification] ?? 0) + 1;
        if (r.action !== "none") acc[`action_${r.action}`] = (acc[`action_${r.action}`] ?? 0) + 1;
        return acc;
      }, {});

      res.json({
        mode,
        total: stuck.length,
        summary,
        items: results.sort((a, b) => b.ageDays - a.ageDays),
      });
    } catch (error) {
      console.error("[Reconcile] error:", error);
      res.status(500).json({ error: "Erreur serveur", message: error instanceof Error ? error.message : String(error) });
    }
  });

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
        audit = await storage.getAudit(auditId);
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

      // Check status , block silently unless admin explicitly opts in with ?force=1.
      const forceRawSend = req.query.force === "1" || (req.body as any)?.force === true;
      if (audit.reportDeliveryStatus === "SENT" && !forceRawSend) {
        res.json({
          success: true,
          alreadySent: true,
          message: "Email déjà envoyé , pass ?force=1 pour renvoyer volontairement",
          sentAt: audit.reportSentAt
        });
        return;
      }

      // Bypass the SCHEDULED/READY gate when force=1 (admin explicitly re-sending
      // an audit in SENT or other terminal state).
      if (!forceRawSend && audit.reportDeliveryStatus !== "SCHEDULED" && audit.reportDeliveryStatus !== "READY") {
        res.status(400).json({
          error: `Cannot force send: status is ${audit.reportDeliveryStatus}`,
          status: audit.reportDeliveryStatus
        });
        return;
      }

      // Force send , admin-initiated. Still dedup via email_tracking unless caller opts out.
      const baseUrl = getBaseUrl();

      console.log(`[ForceSend] Sending to ${audit.email} (audit: ${audit.id}, type: ${audit.type}, force=${forceRawSend})`);

      if (!forceRawSend) {
        const alreadyTracked = await storage.hasReportReadyEmailBeenSent(audit.id).catch(() => false);
        if (alreadyTracked) {
          res.status(409).json({
            error: "Email déjà tracé comme envoyé , pass ?force=1 pour renvoyer volontairement",
            auditId: audit.id
          });
          return;
        }
      }

      const { sent } = await safeSendReportReadyEmail(audit.id, audit.email, audit.type, baseUrl, {
        logPrefix: "[ForceSend]",
        bypassClaim: forceRawSend,
      });

      if (sent) {
        if (forceRawSend) {
          await storage.updateAudit(audit.id, { reportDeliveryStatus: "SENT", reportSentAt: new Date() }).catch(() => {});
        }

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

  // Serialize SendPulse events so campaign bursts cannot exhaust the shared DB
  // pool. The provider is acknowledged immediately; processing continues here.
  let sendPulseWebhookQueue: Promise<void> = Promise.resolve();

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

      const queuedEvents = events.map((eventData) => ({ ...eventData }));

      sendPulseWebhookQueue = sendPulseWebhookQueue
        .catch((error) => {
          console.error("[SendPulseWebhook] Previous queue error:", error);
        })
        .then(async () => {
          let processed = 0;
          let errors = 0;

          for (const eventData of queuedEvents) {
            try {
              const { event, email, task_id, link_url, timestamp } = eventData;
              const providerTaskId = String(
                task_id || eventData.taskId || eventData.id || eventData.email_id || eventData.message_id || ""
              ).trim();
              const normalizedEmail = email ? String(email).toLowerCase().trim() : "";

              if (!event || (!normalizedEmail && !providerTaskId)) {
                console.log("[SendPulseWebhook] ⚠️  Skipping event, missing required fields");
                errors++;
                continue;
              }

              // Prefer exact provider ID matching. Falling back to latest recipient
              // only exists for old rows created before sendpulse_task_id storage.
              let emailResult = providerTaskId
                ? await pool.query(
                    `SELECT id
                       FROM email_tracking
                      WHERE sendpulse_task_id = $1
                         OR metadata->>'sendpulseTaskId' = $1
                         OR metadata->>'sendpulseId' = $1
                      ORDER BY sent_at DESC
                      LIMIT 1`,
                    [providerTaskId]
                  )
                : { rows: [] as any[] };

              if (emailResult.rows.length === 0 && normalizedEmail) {
                emailResult = await pool.query(
                  `SELECT id FROM email_tracking WHERE LOWER(recipient_email) = $1 ORDER BY sent_at DESC LIMIT 1`,
                  [normalizedEmail]
                );
              }

              if (emailResult.rows.length === 0) {
                console.log(`[SendPulseWebhook] ⚠️  Email tracking not found for: ${normalizedEmail || providerTaskId}`);
                // Still record the event with null email_tracking_id
              }

              const emailTrackingId = emailResult.rows[0]?.id || null;

              // Determine event type (SendPulse format)
              let eventType = event.toLowerCase().replace(/\s+/g, '_');

              // Normalize event names
              // SendPulse sends "redirect" for clicks (action name from webhook registration)
              if (eventType.includes('open')) eventType = 'open';
              else if (eventType.includes('click') || eventType.includes('redirect') || eventType === 'link') eventType = 'click';
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
                } else if (eventType === 'delivered') {
                  await pool.query(
                    `UPDATE email_tracking SET sendpulse_status = 'success' WHERE id = $1`,
                    [emailTrackingId]
                  );
                } else if (eventType === 'bounce' || eventType === 'spam' || eventType === 'unsubscribe') {
                  await pool.query(
                    `UPDATE email_tracking
                        SET sendpulse_status = 'failed',
                            sendpulse_error = $2
                      WHERE id = $1`,
                    [
                      emailTrackingId,
                      JSON.stringify({
                        eventType,
                        providerTaskId: providerTaskId || null,
                        timestamp: timestamp || null,
                        reason: eventData.reason || eventData.description || eventData.smtp_answer_data || null,
                      }),
                    ]
                  );
                }
              }

              console.log(`[SendPulseWebhook] ✅ Tracked ${eventType} for ${normalizedEmail || providerTaskId}`);
              processed++;
            } catch (err) {
              console.error("[SendPulseWebhook] Error processing event:", err);
              errors++;
            }
          }

          console.log(
            `[SendPulseWebhook] Queue batch complete: ${processed} processed, ${errors} errors, ${queuedEvents.length} total`
          );
        });

      res.status(200).json({
        success: true,
        message: "Events accepted",
        accepted: queuedEvents.length,
      });

    } catch (error) {
      console.error("[SendPulseWebhook] Error:", error);
      res.status(500).json({
        success: false,
        error: "Erreur webhook",
        message: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // ==================== BACKFILL: Map historical "redirect" events to clicked ====================
  // SendPulse uses "redirect" as click event name; before the webhook fix it was stored
  // as event_type='redirect' in cta_tracking but email_tracking.clicked stayed NULL.
  app.post("/api/admin/backfill-redirect-clicks", async (req, res) => {
    if (!requireAdminAuth(req, res)) return;

    try {
      const { Pool } = await import("pg");
      const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
      if (!databaseUrl) {
        res.status(500).json({ error: "DATABASE_URL not configured" });
        return;
      }

      const pool = new Pool({
        connectionString: databaseUrl,
        ssl: databaseUrl.includes("render.com") || databaseUrl.includes("neon.tech")
          ? { rejectUnauthorized: false }
          : false,
      });

      try {
        const before = await pool.query(
          `SELECT
             COUNT(*) FILTER (WHERE event_type = 'redirect') AS redirect_events,
             COUNT(*) FILTER (WHERE event_type = 'click') AS click_events
           FROM cta_tracking`
        );

        const trackingBefore = await pool.query(
          `SELECT COUNT(*) AS clicked_count FROM email_tracking WHERE clicked IS NOT NULL`
        );

        // Step 1: rewrite event_type 'redirect' -> 'click' in cta_tracking
        const rewriteResult = await pool.query(
          `UPDATE cta_tracking SET event_type = 'click' WHERE event_type = 'redirect'`
        );

        // Step 2: update email_tracking.clicked from earliest matching click event
        const updateResult = await pool.query(
          `UPDATE email_tracking et
           SET clicked = sub.first_click
           FROM (
             SELECT email_tracking_id, MIN(created_at) AS first_click
             FROM cta_tracking
             WHERE event_type = 'click' AND email_tracking_id IS NOT NULL
             GROUP BY email_tracking_id
           ) sub
           WHERE et.id = sub.email_tracking_id AND et.clicked IS NULL`
        );

        const trackingAfter = await pool.query(
          `SELECT COUNT(*) AS clicked_count FROM email_tracking WHERE clicked IS NOT NULL`
        );

        res.json({
          success: true,
          redirect_events_rewritten: rewriteResult.rowCount,
          email_tracking_updated: updateResult.rowCount,
          before: {
            redirect_events: Number(before.rows[0].redirect_events),
            click_events: Number(before.rows[0].click_events),
            email_tracking_clicked: Number(trackingBefore.rows[0].clicked_count),
          },
          after: {
            email_tracking_clicked: Number(trackingAfter.rows[0].clicked_count),
          },
        });
      } finally {
        await pool.end();
      }
    } catch (error) {
      console.error("[BackfillRedirectClicks] Error:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : String(error),
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
      // .trim() before .email() so a pasted email with leading/trailing
      // whitespace doesn't get rejected (Achzod report 2026-05-10: client
      // saw "Données invalides" with Zod email validation failing on a copy-
      // pasted address that had a stray space).
      const schema = z.object({
        email: z.string().trim().toLowerCase().email("Email invalide. Verifie qu'il contient bien un @ et un point dans le domaine (par exemple ton@gmail.com)."),
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
        const first = error.errors[0];
        const message = first?.message || "Données invalides";
        res.status(400).json({ error: message, field: first?.path?.[0], details: error.errors });
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
        email: z.string().trim().toLowerCase().email("Email invalide. Verifie qu'il contient bien un @ et un point dans le domaine (par exemple ton@gmail.com)."),
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
        // Continue , don't block generation if order recording fails
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
          message: "Paiement en attente , le protocole sera généré après confirmation.",
          orderId: order?.id ?? null,
        });
        return;
      }

      // CROSS-ORDER PROTECTION: before firing a 60s AI generation, check if ANY
      // other paid Peptides order for this email already has a reportId. If yes,
      // short-circuit with the existing report , prevents the inline path from
      // racing with the autogen cron or a prior confirm-session call.
      {
        const cross = await storage.hasAnyPeptidesReportForEmail(email).catch(() => ({ exists: false } as any));
        if (cross.exists) {
          console.warn(`[PeptidesEngine inline] ⏭️ Existing report for ${email} → reusing ${cross.existingReportId}, NOT regenerating`);
          res.json({
            success: true,
            reportId: cross.existingReportId,
            reused: true,
            existingOrderId: cross.existingOrderId,
          });
          return;
        }
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
            ? `\n\nTes 2 Blood Analyses offertes :\n2 credits Blood Analysis ont ete ajoutes a ton compte (un pre-cycle, un mi-cycle).\nPas de code a saisir : connecte-toi sur ${getBaseUrl(req)}/blood-dashboard avec ton email pour les utiliser.`
            : "";
        const coachingBlock = buildPeptidesCoachingDeductionBlock(
          (order?.metadata as any)?.peptidesTier ?? null
        );

        const peptidesNames = report.peptides?.map((p) => p.name).join(", ") ?? "voir rapport";
        const deliveryMessage =
          `Ton protocole peptides est prêt.\n\n` +
          `Peptides recommandés : ${peptidesNames}\n\n` +
          `Accède à ton rapport complet ici :\n${getBaseUrl(req)}/peptides/${reportId}` +
          promoCodesBlock +
          coachingBlock +
          `\n\nConserve ce lien , il est personnel et unique.\n\nAchzod`;

        // Delivery scheduling: avoid the "20 min after payment" automation
        // signal. Report is generated now, email goes out at scheduledAt
        // (paidAt + 4-8h, business hours). Autogen recovery loop polls
        // every 5 min and sends once due.
        const { due: deliveryDue, scheduledAt: deliveryScheduledAt } = order
          ? await isPeptidesEmailDeliveryDue(order)
          : { due: true, scheduledAt: new Date() };
        if (deliveryDue) {
          await sendCTAEmail(
            email,
            "Ton protocole peptides personnalisé est prêt",
            deliveryMessage
          ).catch((err) => console.error("[PeptidesEngine] Delivery email failed:", err));
        } else {
          console.log(
            `[PeptidesEngine] Delivery email DEFERRED for ${email} until ${deliveryScheduledAt.toISOString()} (anti-automation gate)`
          );
          // Immediate confirmation email so the client knows the payment landed.
          // Without this, they pay 199-299 EUR and see zero feedback for hours.
          if (order?.id) {
            const alreadyConfirmed = await storage.hasPeptidesOrderConfirmationBeenSent(email).catch(() => false);
            if (!alreadyConfirmed) {
              const firstName = (order.metadata as any)?.peptidesResponses?.prenom
                || (order.email ? order.email.split("@")[0] : undefined);
              sendPeptidesOrderConfirmationEmail(email, {
                firstName,
                amountEur: ((order as any).finalAmountCents || 0) / 100,
                promoCode: (order as any).promoCode || null,
                peptidesNames,
                scheduledDeliveryAt: deliveryScheduledAt,
                bloodCreditsCount: Array.isArray(report.promoCodesGenerated) ? report.promoCodesGenerated.length : 0,
                orderId: order.id,
              }).catch((err) => console.error("[PeptidesEngine] Confirmation email failed:", err));
            }
          }
        }

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

      const reportEmail = String(record.email ?? "").replace(/^peptides::/i, "").trim().toLowerCase();
      const orders = reportEmail.includes("@") ? await storage.getOrdersByEmail(reportEmail) : [];
      if (!isPeptidesReportAccessibleForOrders(id, orders)) {
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
      // Memory guard , skip cycle if heap pressure is critical (prevents the
      // 2026-04-19 SIGABRT crash). Render container is 512MB; 440MB RSS means
      // GC can't keep up.
      const memRssMb = Math.round(process.memoryUsage().rss / 1024 / 1024);
      if (memRssMb > 440) {
        console.warn(`[ReviewCron] ⚠️ Skipping cycle , RSS ${memRssMb}MB > 440MB threshold`);
        return;
      }

      const baseUrl = process.env.APP_URL || process.env.RENDER_EXTERNAL_URL || "https://apexlabs.achzodcoaching.com";
      // Use light variant , this cron only needs metadata (id, email, dates, status).
      // Full JSONB columns (narrative_report, responses, scores) would add ~90MB to heap.
      const allAudits = await storage.getAllAuditsLight();
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
      // Peptides Engine clients , burnout_reports table, not in allAudits
      try {
        const peptidesReports = await storage.getAllBurnoutReports();
        for (const report of peptidesReports || []) {
          if (!report || sent >= 30) break;
          const email = String((report as any).email || "").replace(/^peptides::/, "");
          if (!email || email.includes("test") || email.includes("debug") || email.includes("achzodcoaching") || email.includes("achkou")) continue;
          if (new Date(report.createdAt) < new Date('2026-03-17')) continue;
          const daysSinceSent = (now.getTime() - new Date(report.createdAt).getTime()) / (24 * 60 * 60 * 1000);
          if (daysSinceSent < 3 || daysSinceSent > 14) continue;
          // Check if a review for this peptides report already exists (auditId = report.id in our schema)
          const existingReview = await storage.getReviewByAuditId?.(report.id);
          if (existingReview) continue;
          const emailHistory = await storage.getEmailTrackingForAudit(report.id).catch(() => []);
          const alreadySent = emailHistory?.some((e: any) => e.emailType === 'sendReviewRequestJ3Email');
          if (alreadySent) continue;
          try {
            const trackingRecord = await storage.createEmailTracking(report.id, "sendReviewRequestJ3Email", email);
            await sendReviewRequestJ3Email(email, report.id, "PEPTIDES_ENGINE", baseUrl, trackingRecord.id);
            sent++;
            console.log(`[ReviewCron] Peptides review request to ${email} (report ${report.id})`);
          } catch (e) {
            console.error(`[ReviewCron] Peptides failed for ${email}:`, e);
          }
        }
      } catch (e) {
        console.error("[ReviewCron] Peptides iteration failed:", e);
      }

      // Blood Analysis clients , blood_reports table
      try {
        const bloodReports = await storage.getAllBloodReports();
        for (const report of bloodReports || []) {
          if (!report || sent >= 30) break;
          const email = String((report as any).email || "");
          if (!email || email.includes("test") || email.includes("debug") || email.includes("achzodcoaching") || email.includes("achkou")) continue;
          if (new Date((report as any).createdAt) < new Date('2026-03-17')) continue;
          const sentAt = (report as any).emailSentAt || (report as any).createdAt;
          if (!sentAt) continue;
          const daysSinceSent = (now.getTime() - new Date(sentAt).getTime()) / (24 * 60 * 60 * 1000);
          if (daysSinceSent < 3 || daysSinceSent > 14) continue;
          const existingReview = await storage.getReviewByAuditId?.(report.id);
          if (existingReview) continue;
          const emailHistory = await storage.getEmailTrackingForAudit(report.id).catch(() => []);
          const alreadySent = emailHistory?.some((e: any) => e.emailType === 'sendReviewRequestJ3Email');
          if (alreadySent) continue;
          try {
            const trackingRecord = await storage.createEmailTracking(report.id, "sendReviewRequestJ3Email", email);
            await sendReviewRequestJ3Email(email, report.id, "BLOOD_ANALYSIS", baseUrl, trackingRecord.id);
            sent++;
            console.log(`[ReviewCron] Blood review request to ${email} (report ${report.id})`);
          } catch (e) {
            console.error(`[ReviewCron] Blood failed for ${email}:`, e);
          }
        }
      } catch (e) {
        console.error("[ReviewCron] Blood iteration failed:", e);
      }

      if (sent > 0) console.log(`[ReviewCron] Sent ${sent} review request emails`);
    } catch (e) {
      console.error("[ReviewCron] Error:", e);
    } finally {
      reviewCronRunning = false;
    }
  }, 6 * 60 * 60 * 1000); // Every 6 hours
  console.log("[ReviewCron] ✅ setInterval registered (6h cycle)");

  // -----------------------------------------------------------------------
  // Peptides delivery scheduling
  // -----------------------------------------------------------------------
  // Generation is instant (the engine assembles the protocol in seconds), but
  // delivering the email 5-15 minutes after payment makes the protocol feel
  // mass-produced. Clients have complained that the speed reveals automation.
  //
  // Strategy: generate immediately (so the protocol is ready and no risk of
  // loss), but gate the email send to a randomised "scheduled delivery" time
  // = paidAt + random(4-8h), clamped to Paris business hours (09:00-22:00).
  // The autogen recovery loop will pick up scheduled-but-unsent orders.
  async function resolvePeptidesEmailScheduledAt(order: any): Promise<Date> {
    const meta = (order?.metadata as any) || {};
    const existing = meta.peptidesEmailScheduledAt;
    if (existing) {
      const parsed = new Date(existing);
      if (!Number.isNaN(parsed.getTime())) return parsed;
    }
    const paidAt = order?.paidAt ? new Date(order.paidAt) : new Date();
    if (Number.isNaN(paidAt.getTime())) return new Date();

    // Random delay 4-8h
    const delayMs = (4 + Math.random() * 4) * 3600 * 1000;
    let target = new Date(paidAt.getTime() + delayMs);

    // Clamp to Paris business hours 09:00-22:00
    const getParisHour = (d: Date) =>
      Number(d.toLocaleString("en-GB", { hour: "2-digit", hour12: false, timeZone: "Europe/Paris" }));
    const parisHour = getParisHour(target);
    if (parisHour < 9) {
      // Push forward to 09h + 0-2h Paris
      target = new Date(target.getTime() + (9 - parisHour) * 3600 * 1000 + Math.floor(Math.random() * 2 * 3600 * 1000));
    } else if (parisHour >= 22) {
      // Push to next day 09h + 0-3h Paris
      const hoursToNext9 = (24 - parisHour) + 9;
      target = new Date(target.getTime() + hoursToNext9 * 3600 * 1000 + Math.floor(Math.random() * 3 * 3600 * 1000));
    }

    // Persist on the order so the schedule is stable across cycles. Atomic
    // JSONB merge ,  does not stomp other metadata keys (e.g. peptidesReportId
    // set concurrently by the claim CAS). Earlier read-modify-write pattern
    // was wiping the reportId set by claimPeptidesReportSlot, causing endless
    // regeneration loops and false admin "ECHOUE" alerts (Julien Baldy +
    // parrinello cases 2026-05-11).
    if (order?.id) {
      await storage
        .setOrderMetadataKey(order.id, "peptidesEmailScheduledAt", target.toISOString())
        .catch((err: any) => console.warn("[Peptides Delivery] Failed to persist scheduledAt:", err));
    }
    return target;
  }

  async function isPeptidesEmailDeliveryDue(order: any): Promise<{ due: boolean; scheduledAt: Date }> {
    const scheduledAt = await resolvePeptidesEmailScheduledAt(order);
    return { due: Date.now() >= scheduledAt.getTime(), scheduledAt };
  }

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
      console.log("[AutoGen] ⏭️ Skipped , already running");
      return;
    }
    // Memory guard , Peptides generation loads a large Sonnet response (~300KB)
    // and writes it back to DB. Combined with other in-flight work it can push
    // past the 400MB heap limit. Skip the cycle if we're already near the wall.
    const memRssMb = Math.round(process.memoryUsage().rss / 1024 / 1024);
    if (memRssMb > 440) {
      console.warn(`[AutoGen] ⚠️ Skipping cycle , RSS ${memRssMb}MB > 440MB threshold`);
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
        if (meta?.peptidesEmailHold === true || meta?.peptidesEmailHold === "true") {
          console.log(`[AutoGen] Peptides delivery HOLD for ${email} (order ${order.id})`);
          continue;
        }

        // Recovery path: report exists but email never went out (e.g. SendPulse
        // returned false, network blip during initial autogen send). Without
        // this branch the cron skips forever because peptidesReportId is
        // populated, leaving the client with a paid 199 EUR product they can
        // never reach. Re-attempt delivery on every cycle until email_tracking
        // confirms a send.
        if (meta?.peptidesReportId) {
          const alreadyEmailed = await storage.hasPeptidesDeliveryEmailBeenSent(email).catch(() => false);
          if (alreadyEmailed) continue;
          const existing = await storage.getBurnoutReport(meta.peptidesReportId).catch(() => null);
          if (!existing) continue;
          const existingReport = existing.report as any;

          const baseUrl = getBaseUrl();
          const peptidesNames = existingReport?.peptides?.map((p: any) => p.name).join(", ") ?? "voir rapport";
          const promoBlock = Array.isArray(existingReport?.promoCodesGenerated) && existingReport.promoCodesGenerated.length > 0
            ? `\n\nTes 2 Blood Analysis offertes (codes, usage unique):\n${existingReport.promoCodesGenerated.join("\n")}`
            : "";
          const coachingBlock = buildPeptidesCoachingDeductionBlock(
            (order.metadata as any)?.peptidesTier ?? null
          );
          // Anti-automation delivery gate: only send if scheduled time has arrived
          const { due: recoveryDue, scheduledAt: recoveryScheduledAt } = await isPeptidesEmailDeliveryDue(order);
          if (!recoveryDue) {
            console.log(
              `[AutoGen] Recovery email DEFERRED for ${email} until ${recoveryScheduledAt.toISOString()}`
            );
            // Immediate confirmation email so client knows order is registered
            // (no zero-feedback window during the 4-8h anti-automation deferral).
            const alreadyConfirmed = await storage.hasPeptidesOrderConfirmationBeenSent(email).catch(() => false);
            if (!alreadyConfirmed) {
              const firstName = (order.metadata as any)?.peptidesResponses?.prenom
                || (order.email ? order.email.split("@")[0] : undefined);
              sendPeptidesOrderConfirmationEmail(email, {
                firstName,
                amountEur: ((order as any).finalAmountCents || 0) / 100,
                promoCode: (order as any).promoCode || null,
                peptidesNames,
                scheduledDeliveryAt: recoveryScheduledAt,
                bloodCreditsCount: Array.isArray(existingReport?.promoCodesGenerated) ? existingReport.promoCodesGenerated.length : 0,
                orderId: order.id,
              }).catch((err) => console.error("[AutoGen Recovery] Confirmation email failed:", err));
            }
            continue;
          }

          // STRICT GATE ,  runs only when delivery is actually due (now or past
          // scheduledAt). Auto-repair vials math first, then validate. If the
          // report still fails, email admin AT MOST ONCE per 6h per order and
          // skip the tick. Without the time-gate, the cron would re-fire the
          // BLOQUE email every ~6h before the scheduled time was even reached.
          try {
            const { validatePeptidesReport } = await import("./peptidesReportValidator");
            const pricingResponses = (
              (existing as any)?.responses
              || (order.metadata as any)?.peptidesResponses
              || {}
            ) as Record<string, unknown>;
            if (Object.keys(pricingResponses).length < 3) {
              throw new Error("Reponses client manquantes pour la verification Peptaura pre-livraison");
            }
            const repaired = await refreshPeptauraPricingForDelivery(
              JSON.parse(JSON.stringify(existingReport)),
              pricingResponses,
              String((order.metadata as any)?.peptidesTier || existingReport?.tier || "solo")
            );
            const repairedFingerprint = JSON.stringify(repaired);
            const originalFingerprint = JSON.stringify(existingReport);
            if (repairedFingerprint !== originalFingerprint) {
              await storage.updateBurnoutReport(meta.peptidesReportId, repaired).catch(() => {});
              Object.assign(existingReport, repaired);
            }
            const validation = validatePeptidesReport(repaired);
            if (!validation.ok) {
              const lastNotifIso = (order.metadata as any)?.peptidesBloqueNotifiedAt as string | undefined;
              const sinceLastSec = lastNotifIso
                ? (Date.now() - new Date(lastNotifIso).getTime()) / 1000
                : Number.POSITIVE_INFINITY;
              if (sinceLastSec > 6 * 3600) {
                const adminEmail = process.env.ADMIN_NOTIF_EMAIL || "coaching@achzodcoaching.com";
                console.error(
                  `[AutoGen] 🛑 DELIVERY BLOCKED for ${email} (report ${meta.peptidesReportId}): ${validation.errors.length} validation errors`
                );
                await sendCTAEmail(
                  adminEmail,
                  `[BLOQUE] Livraison peptides ${email}`,
                  `Le rapport peptides de ${email} a echoue la validation pre-livraison.\n\nReportId: ${meta.peptidesReportId}\nOrderId: ${order.id}\n\nErreurs (${validation.errors.length}):\n${validation.errors.slice(0, 10).map(e => " - " + e).join("\n")}\n\nVerifie manuellement puis utilise /api/admin/peptides/recompute-vials/${meta.peptidesReportId} pour patcher, ou regenere le rapport.\n\nLa livraison n'aura pas lieu tant que le rapport n'est pas valide.\n\n(Prochaine alerte au plus tot dans 6h.)`
                ).catch(() => {});
                await storage
                  .setOrderMetadataKey(order.id, "peptidesBloqueNotifiedAt", new Date().toISOString())
                  .catch(() => {});
              } else {
                console.warn(
                  `[AutoGen] Validation still failing for ${email} but BLOQUE already sent ${Math.round(sinceLastSec / 60)} min ago , skipping admin notif`
                );
              }
              continue;
            }
            if ((order.metadata as any)?.peptidesBloqueNotifiedAt) {
              await storage
                .setOrderMetadataKey(order.id, "peptidesBloqueNotifiedAt", "")
                .catch(() => {});
            }
          } catch (gateErr: any) {
            console.error(
              `[AutoGen] ⚠️ Validation gate threw for ${email}, blocking delivery:`,
              gateErr?.message || gateErr
            );
            continue;
          }

          try {
            const recovered = await sendCTAEmail(email, "Ton protocole peptides personnalisé est prêt",
              `Ton protocole peptides est prêt.\n\nPeptides recommandés : ${peptidesNames}\n\nAccède à ton rapport complet ici :\n${baseUrl}/peptides/${meta.peptidesReportId}${promoBlock}${coachingBlock}\n\nConserve ce lien , il est personnel et unique.\n\nAchzod`,
            );
            if (recovered) {
              console.log(`[AutoGen] ✅ Recovered delivery email for ${email} (report ${meta.peptidesReportId})`);
              autoGenLastResult = `RECOVERED_EMAIL: ${email}`;
            } else {
              console.warn(`[AutoGen] ⚠️ Recovery email send returned false for ${email}, will retry next cycle`);
            }
          } catch (recErr) {
            console.error(`[AutoGen] Recovery email send threw for ${email}:`, recErr);
          }
          continue;
        }

        const hoursSincePaid = (now.getTime() - new Date(order.paidAt!).getTime()) / (1000 * 60 * 60);
        // Wait at least 10 min before autogen kicks in , gives the inline generation pipeline
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
          console.error(`[AutoGen] No responses for ${email} , skipping, will retry next cycle`);
          continue;
        }

        // SAFETY #1: Re-read order immediately to confirm reportId still missing (guards against 60s-stale snapshot)
        const freshOrder = await storage.getOrder(order.id);
        const freshMeta = freshOrder?.metadata as any;
        if (freshMeta?.peptidesReportId) {
          console.log(`[AutoGen] Report already exists for ${email} (race avoided pre-gen)`);
          continue;
        }

        // SAFETY #1b (CROSS-ORDER): if the client has another paid Peptides order that
        // already has a reportId, skip this one entirely. Prevents duplicate generation
        // when Stripe creates two orders from a double-click (alexm2220 incident).
        const cross = await storage.hasAnyPeptidesReportForEmail(email).catch(() => ({ exists: false } as any));
        if (cross.exists) {
          console.warn(`[AutoGen] ⏭️ Cross-order duplicate detected for ${email}: existing report ${cross.existingReportId} on order ${cross.existingOrderId}. This order (${order.id}) skipped , consider refunding.`);
          continue;
        }

        // SAFETY #2: Email dedup , if a peptides delivery email was already sent to this recipient, skip entirely
        const alreadyEmailed = await storage.hasPeptidesDeliveryEmailBeenSent(email).catch(() => false);
        if (alreadyEmailed) {
          console.log(`[AutoGen] Peptides delivery email already sent to ${email} (dedup via email_tracking)`);
          continue;
        }

        const { generatePeptidesProtocol } = await import("./peptidesEngine");
        const autoGenTier = ((order.metadata as any)?.peptidesTier as "solo" | "coached" | "tracked" | undefined) ?? "coached";
        const report = await generatePeptidesProtocol(responses, email, autoGenTier);
        const saved = await storage.createBurnoutReport({ email: `peptides::${email}`, responses, report });

        // SAFETY #3: Atomic CAS , "first writer wins". If another process already set peptidesReportId
        // during our 60s+ generation, our report becomes orphan and we DO NOT send any email.
        const claimed = await storage.claimPeptidesReportSlot(order.id, saved.id);
        if (!claimed) {
          console.warn(`[AutoGen] ⚠️ Lost CAS race for ${email} , another process already claimed the slot. Report ${saved.id} is orphan, NO email sent.`);
          autoGenLastResult = `RACE_LOST: ${email} → orphan report ${saved.id}`;
          continue;
        }

        // SAFETY #4: Final email dedup check right before send (in case tracking was recorded after our earlier check)
        const stillNotEmailed = !(await storage.hasPeptidesDeliveryEmailBeenSent(email).catch(() => false));

        const baseUrl = getBaseUrl();
        const peptidesNames = report.peptides?.map((p: any) => p.name).join(", ") ?? "voir rapport";
        const promoBlock = report.promoCodesGenerated?.length > 0
          ? `\n\nTes 2 Blood Analysis offertes (codes, usage unique):\n${report.promoCodesGenerated.join("\n")}` : "";
        const coachingBlock = buildPeptidesCoachingDeductionBlock(
          (order.metadata as any)?.peptidesTier ?? null
        );

        let clientEmailSent = false;
        let deliveryDeferred = false;
        let deliveryScheduledAtIso = "";
        // Anti-automation delivery gate: gen now, deliver later
        const { due: newReportDue, scheduledAt: newReportScheduledAt } = await isPeptidesEmailDeliveryDue(order);
        if (stillNotEmailed && !newReportDue) {
          deliveryDeferred = true;
          deliveryScheduledAtIso = newReportScheduledAt.toISOString();
          console.log(
            `[AutoGen] New report email DEFERRED for ${email} until ${deliveryScheduledAtIso} (recovery loop will retry)`
          );
          // Immediate confirmation email so client knows order is registered
          // (no zero-feedback window during the 4-8h anti-automation deferral).
          const alreadyConfirmed = await storage.hasPeptidesOrderConfirmationBeenSent(email).catch(() => false);
          if (!alreadyConfirmed) {
            const firstName = (order.metadata as any)?.peptidesResponses?.prenom
              || (responses as any)?.prenom
              || (order.email ? order.email.split("@")[0] : undefined);
            sendPeptidesOrderConfirmationEmail(email, {
              firstName,
              amountEur: ((order as any).finalAmountCents || 0) / 100,
              promoCode: (order as any).promoCode || null,
              peptidesNames,
              scheduledDeliveryAt: newReportScheduledAt,
              bloodCreditsCount: Array.isArray(report.promoCodesGenerated) ? report.promoCodesGenerated.length : 0,
              orderId: order.id,
            }).catch((err) => console.error("[AutoGen NewReport] Confirmation email failed:", err));
          }
        } else if (stillNotEmailed) {
          try {
            clientEmailSent = await sendCTAEmail(email, "Ton protocole peptides personnalisé est prêt",
              `Ton protocole peptides est prêt.\n\nPeptides recommandés : ${peptidesNames}\n\nAccède à ton rapport complet ici :\n${baseUrl}/peptides/${saved.id}${promoBlock}${coachingBlock}\n\nConserve ce lien , il est personnel et unique.\n\nAchzod`
            );
            if (clientEmailSent) {
              console.log(`[AutoGen] ✅ Delivery email sent to ${email}`);
            } else {
              console.error(`[AutoGen] ⚠️ Delivery email returned false for ${email} , SendPulse probable issue`);
            }
          } catch (emailErr) {
            console.error(`[AutoGen] ⚠️ Delivery email THREW for ${email}:`, emailErr);
          }
        } else {
          console.warn(`[AutoGen] ⚠️ Delivery email already sent to ${email} (last-moment check) , skipping`);
        }

        try {
          const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || "coaching@achzodcoaching.com";
          let adminSubject: string;
          let adminBody: string;
          if (clientEmailSent) {
            adminSubject = `RAPPORT GENERE , Peptides Engine , ${email}`;
            adminBody = `Rapport Peptides Engine genere et livre.\n\nClient: ${email}\nPeptides: ${peptidesNames}\nSections: ${report.sections?.length ?? 0}\nLien: ${baseUrl}/peptides/${saved.id}`;
          } else if (deliveryDeferred) {
            const parisLocal = new Date(deliveryScheduledAtIso).toLocaleString("fr-FR", { timeZone: "Europe/Paris" });
            adminSubject = `RAPPORT GENERE - LIVRAISON PROGRAMMEE , ${email}`;
            adminBody = `Rapport Peptides Engine genere et stocke. Email de livraison client programme pour ${parisLocal} (Paris).\n\nAucune action requise: l'envoi automatique se fera a l'heure prevue par le cron de recovery.\n\nClient: ${email}\nPeptides: ${peptidesNames}\nSections: ${report.sections?.length ?? 0}\nLien: ${baseUrl}/peptides/${saved.id}`;
          } else {
            adminSubject = `⚠️ RAPPORT GENERE MAIS EMAIL CLIENT ECHOUE , ${email}`;
            adminBody = `Rapport Peptides Engine genere, MAIS l'email de livraison au client a echoue (SendPulse).\n\nAction requise: renvoyer manuellement via admin dashboard ou /api/admin/send-cta.\n\nClient: ${email}\nPeptides: ${peptidesNames}\nSections: ${report.sections?.length ?? 0}\nLien: ${baseUrl}/peptides/${saved.id}`;
          }
          await sendCTAEmail(adminEmail, adminSubject, adminBody);
          console.log(`[AutoGen] ✅ Admin notification sent`);
        } catch (adminErr) {
          console.error(`[AutoGen] ⚠️ Admin notification FAILED:`, adminErr);
        }

        autoGenLastResult = clientEmailSent
          ? `OK: ${email} → ${saved.id}`
          : deliveryDeferred
          ? `DEFERRED: ${email} → ${saved.id} (scheduled ${deliveryScheduledAtIso})`
          : `SAVED_BUT_EMAIL_FAILED: ${email} → ${saved.id}`;
        console.log(`[AutoGen] ${clientEmailSent ? "✅" : deliveryDeferred ? "⏳" : "⚠️"} Report ${saved.id} for ${email} , client email ${clientEmailSent ? "sent" : deliveryDeferred ? "deferred" : "FAILED"}`);
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
      const memRssMb = Math.round(process.memoryUsage().rss / 1024 / 1024);
      if (memRssMb > 440) {
        console.warn(`[AutoSend] ⚠️ Skipping cycle , RSS ${memRssMb}MB > 440MB threshold`);
        return;
      }

      // Light variant: we only need id/email/type/status/timestamps here.
      const allAudits = await storage.getAllAuditsLight();
      const now = new Date();
      let sent = 0;

      for (const audit of allAudits) {
        if (!audit.email || audit.email.includes("test") || audit.email.includes("debug") || audit.email.includes("achzodcoaching")) continue;
        if (audit.reportSentAt) continue; // Already sent

        const status = audit.reportDeliveryStatus;

        // READY: send immediately (race-safe , CAS + email_tracking dedup)
        if (status === "READY") {
          try {
            const baseUrl = getBaseUrl();
            const { sent: emailSent } = await safeSendReportReadyEmail(audit.id, audit.email, audit.type, baseUrl, { logPrefix: "[AutoSend]" });
            if (emailSent) {
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
      // Memory guard
      const memRssMb = Math.round(process.memoryUsage().rss / 1024 / 1024);
      if (memRssMb > 440) {
        console.warn(`[AutoSequence] ⚠️ Skipping cycle , RSS ${memRssMb}MB > 440MB threshold`);
        return;
      }

      const baseUrl = getBaseUrl();
      const allAudits = await storage.getAllAuditsLight();
      const now = new Date();
      let sent = 0;

      for (const audit of allAudits) {
        if (!audit.email || audit.email.includes("test") || audit.email.includes("debug") || audit.email.includes("achzodcoaching") || audit.email.includes("achkou")) continue;
        if (!audit.reportSentAt) continue;

        const sentAt = new Date(audit.reportSentAt);
        const daysSinceSent = (now.getTime() - sentAt.getTime()) / (24 * 60 * 60 * 1000);

        const trackingHistory = await storage.getEmailTrackingForAudit(audit.id) || [];
        const trackingTypes = trackingHistory
          .filter(isEmailSequenceAttempted)
          .map((t: any) => t.emailType);

        // GRATUIT sequences
        if (audit.type === "GRATUIT") {
          if (daysSinceSent >= 3 && daysSinceSent < 7 && !trackingTypes.includes("sendGratuitUpsellEmail")) {
            const trackingRecord = await storage.createEmailTracking(audit.id, "sendGratuitUpsellEmail", audit.email);
            const emailSent = await sendGratuitUpsellEmail(audit.email, audit.id, baseUrl, trackingRecord.id);
            if (emailSent) { sent++; if (sent >= 5) break; }
          }
          if (daysSinceSent >= 5 && daysSinceSent < 10 && !trackingTypes.includes("sendGratuitJ5Email")) {
            const hasConverted = await storage.hasUserPurchased?.(audit.email);
            if (!hasConverted) {
              const trackingRecord = await storage.createEmailTracking(audit.id, "sendGratuitJ5Email", audit.email);
              const emailSent = await sendGratuitJ5Email(audit.email, audit.id, baseUrl, trackingRecord.id);
              if (emailSent) { sent++; if (sent >= 5) break; }
            }
          }
          if (daysSinceSent >= 7 && daysSinceSent < 14 && !trackingTypes.includes("sendGratuitJ7Email")) {
            const hasConverted = await storage.hasUserPurchased?.(audit.email);
            if (!hasConverted) {
              const trackingRecord = await storage.createEmailTracking(audit.id, "sendGratuitJ7Email", audit.email);
              const emailSent = await sendGratuitJ7Email(audit.email, audit.id, baseUrl, trackingRecord.id);
              if (emailSent) { sent++; if (sent >= 5) break; }
            }
          }
          if (daysSinceSent >= 14 && daysSinceSent < 30 && !trackingTypes.includes("sendDiscoveryJ14CoachingEmail")) {
            const hasConverted = await storage.hasUserPurchased?.(audit.email);
            if (!hasConverted) {
              // Compute per-profile coaching tier recommendation from the audit's
              // scores + questionnaire responses so the email CTA points to the
              // right formule (Essential/Elite/PrivateLab) with a personalized reason.
              const { recommendCoachingTier } = await import("./coachingRecommendation.js");
              const recommendation = recommendCoachingTier({
                responses: (audit.responses as Record<string, unknown>) ?? null,
                scores: (audit.scores as any) ?? null,
              });
              const trackingRecord = await storage.createEmailTracking(audit.id, "sendDiscoveryJ14CoachingEmail", audit.email);
              const emailSent = await sendDiscoveryJ14CoachingEmail(audit.email, audit.id, baseUrl, trackingRecord.id, recommendation);
              if (emailSent) { sent++; if (sent >= 5) break; }
            }
          }
          // J+30 nurture , pushes the profile-matched coaching formule with DISCOVERY30
          if (daysSinceSent >= 30 && daysSinceSent < 60 && !trackingTypes.includes("sendDiscoveryJ30NurtureEmail")) {
            const hasConverted = await storage.hasUserPurchased?.(audit.email);
            if (!hasConverted) {
              try {
                const trackingRecord = await storage.createEmailTracking(audit.id, "sendDiscoveryJ30NurtureEmail", audit.email);
                const { recommendCoachingTier } = await import("./coachingRecommendation.js");
                const recommendation = recommendCoachingTier({
                  responses: (audit.responses as Record<string, unknown>) ?? null,
                  scores: (audit.scores as any) ?? null,
                });
                const emailSent = await sendDiscoveryJ30NurtureEmail(audit.email, audit.id, baseUrl, trackingRecord.id, recommendation);
                if (emailSent) { sent++; if (sent >= 5) break; }
              } catch (e) {
                console.error(`[AutoSequence] J30 nurture failed for ${audit.email}:`, e);
              }
            }
          }
        }
      }
      if (sent > 0) console.log(`[AutoSequence] Sent ${sent} sequence emails this cycle`);
    } catch (err) {
      console.error("[AutoSequence] Error:", err);
    }
  }, 30 * 60 * 1000).unref(); // Every 30 minutes

  // Peptides Engine , cycle 2 re-order email at J+60.
  // Runs every 12h, sends at most 20 emails per cycle. Per-email dedup via
  // email_tracking (emailType = sendPeptidesCycle2ReorderEmail) so a client
  // is only asked to re-order once. Applies only to reports >= 60 days old
  // and <= 120 days old (no point emailing year-old clients at full cadence).
  let peptidesReorderCronRunning = false;
  setInterval(async () => {
    if (peptidesReorderCronRunning) return;
    peptidesReorderCronRunning = true;
    try {
      const baseUrl = getBaseUrl();
      const peptidesReports = await storage.getAllBurnoutReports();
      const now = new Date();
      let sent = 0;

      for (const report of peptidesReports || []) {
        if (sent >= 20) break;
        if (!report) continue;
        const email = String((report as any).email || "").replace(/^peptides::/, "");
        if (!email) continue;
        if (email.includes("test") || email.includes("debug") || email.includes("achzodcoaching") || email.includes("achkou")) continue;
        const createdAt = new Date((report as any).createdAt);
        if (Number.isNaN(createdAt.getTime())) continue;
        if (createdAt < new Date("2026-03-17")) continue;
        const daysSince = (now.getTime() - createdAt.getTime()) / (24 * 60 * 60 * 1000);
        if (daysSince < 60 || daysSince > 120) continue;

        // Dedup , has this email already been sent?
        const history = await storage.getEmailTrackingForAudit(report.id).catch(() => []);
        const already = (history || []).some((t: any) => t.emailType === "sendPeptidesCycle2ReorderEmail");
        if (already) continue;

        try {
          const trackingRecord = await storage.createEmailTracking(
            report.id,
            "sendPeptidesCycle2ReorderEmail",
            email,
          );
          const ok = await sendPeptidesCycle2ReorderEmail(email, report.id, baseUrl, trackingRecord.id);
          if (ok) {
            sent++;
            console.log(`[PeptidesReorderCron] Sent cycle-2 reorder to ${email} (report ${report.id}, ${Math.round(daysSince)}d)`);
          } else {
            console.error(`[PeptidesReorderCron] sendPeptidesCycle2ReorderEmail returned false for ${email}`);
          }
        } catch (e) {
          console.error(`[PeptidesReorderCron] Failed for ${email}:`, e);
        }
      }
      if (sent > 0) console.log(`[PeptidesReorderCron] ✅ Sent ${sent} cycle-2 reorder emails`);
    } catch (err) {
      console.error("[PeptidesReorderCron] Error:", err);
    } finally {
      peptidesReorderCronRunning = false;
    }
  }, 12 * 60 * 60 * 1000).unref(); // Every 12 hours
  console.log("[PeptidesReorderCron] ✅ setInterval registered (12h cycle)");

  // startMonitoring DISABLED , daily reports and abandonment alerts turned off
  // startMonitoring(storage, 30).catch(err => {
  //   console.error('[Monitor] Erreur démarrage surveillance:', err);
  // });
  console.log('[Monitor] Surveillance automatique DESACTIVEE');

  return httpServer;
}
