import express, { type Request, Response, NextFunction } from "express";
import * as Sentry from "@sentry/node";
import helmet from "helmet";
import compression from "compression";
import cors from "cors";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { resumePendingJobs } from "./reportJobManager";
import { storage } from "./storage";
import { sendReportReadyEmail, sendAdminEmailNewAudit } from "./emailService";
import { sendScheduledBloodEmail } from "./blood-analysis/routes";
import { startPeptauraCatalogCron } from "./peptidesEngine";

const app = express();
const httpServer = createServer(app);
const sentryDsn = process.env.SENTRY_DSN;
const sentryEnabled = Boolean(sentryDsn);

if (sentryEnabled) {
  Sentry.init({
    dsn: sentryDsn,
    tracesSampleRate: 0.1,
  });
}

// Global safety nets ,  prevent silent crashes in production
process.on("unhandledRejection", (reason) => {
  console.error("[FATAL] Unhandled Promise Rejection:", reason);
  if (sentryEnabled) Sentry.captureException(reason);
});
process.on("uncaughtException", (error) => {
  console.error("[FATAL] Uncaught Exception:", error);
  if (sentryEnabled) Sentry.captureException(error);
  process.exit(1);
});

// Security headers
app.use(helmet({
  contentSecurityPolicy: false, // Let Vite handle CSP in dev
  crossOriginEmbedderPolicy: false,
  // Allow newsletter / marketing assets (e.g. images embedded in emails) to be
  // fetched cross-origin from Gmail/SendPulse/etc.  Default "same-origin" was
  // breaking image rendering in email previews.
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));

// Gzip compression for all responses
app.use(compression());

// CORS
const allowedOrigins = [
  process.env.APP_URL,
  process.env.RENDER_EXTERNAL_URL,
  process.env.PUBLIC_BASE_URL,
  "https://apexlabs.achzodcoaching.com",
  "https://www.nopainnogain.fr",
  "http://localhost:5000",
  "http://localhost:3000",
].filter(Boolean) as string[];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (same-origin, mobile apps, Postman)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    callback(null, false);
  },
  credentials: true,
}));

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    limit: '5mb',
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false, limit: '5mb' }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;
  const maxJsonLogChars = Number(process.env.API_RESPONSE_LOG_MAX_CHARS || 2000);

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        const serialized = JSON.stringify(capturedJsonResponse);
        logLine += serialized.length > maxJsonLogChars
          ? ` :: ${serialized.slice(0, maxJsonLogChars)}... [truncated ${serialized.length} chars]`
          : ` :: ${serialized}`;
      }

      log(logLine);
    }
  });

  next();
});

// Startup env validation
if (process.env.NODE_ENV === "production") {
  const required = ["DATABASE_URL", "SESSION_SECRET"];
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    console.error(`[FATAL] Missing required env vars: ${missing.join(", ")}`);
    process.exit(1);
  }
  const recommended = ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "ADMIN_SECRET", "APP_URL", "OPENAI_API_KEY", "SENDPULSE_USER_ID"];
  const missingRec = recommended.filter((k) => !process.env[k]);
  if (missingRec.length > 0) {
    console.warn(`[WARN] Missing recommended env vars: ${missingRec.join(", ")}`);
  }
}

(async () => {
  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    if (sentryEnabled) {
      Sentry.captureException(err);
    }
    console.error("[Global Error Handler]", err);
    const status = err.status || err.statusCode || 500;
    res.status(status).json({ error: "Erreur serveur" });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    async () => {
      log(`serving on port ${port}`);
      startPeptauraCatalogCron();

      try {
        const resumedCount = await resumePendingJobs();
        if (resumedCount > 0) {
          log(`Resumed ${resumedCount} pending report jobs`);
        }
      } catch (error) {
        console.error("[Boot] Error resuming pending jobs:", error);
      }

      // Internal cron: deliver scheduled reports every 5 minutes
      const CRON_INTERVAL_MS = 5 * 60 * 1000;
      let cronRunning = false;

      function getBaseUrl(): string {
        if (process.env.APP_URL) return process.env.APP_URL.replace(/\/+$/, "");
        if (process.env.RENDER_EXTERNAL_URL) return process.env.RENDER_EXTERNAL_URL.replace(/\/+$/, "");
        if (process.env.REPLIT_DOMAINS) {
          const replitDomain = process.env.REPLIT_DOMAINS.split(",")[0];
          return `https://${replitDomain}`;
        }
        return `http://localhost:${port}`;
      }

      const runScheduledDelivery = async () => {
        if (cronRunning) {
          log("Cron: skipping ,  previous run still in progress");
          return;
        }
        cronRunning = true;
        try {
          const baseUrl = getBaseUrl();
          let delivered = 0;

          // Audits (Anabolic 24h, Ultimate 48h)
          const scheduledAudits = await storage.getScheduledAuditsForDelivery();
          for (const audit of scheduledAudits) {
            try {
              await storage.updateAudit(audit.id, { reportDeliveryStatus: "READY" });
              const sent = await sendReportReadyEmail(audit.email, audit.id, audit.type, baseUrl);
              if (sent) {
                await storage.updateAudit(audit.id, { reportDeliveryStatus: "SENT", reportSentAt: new Date() });
                // Note: Admin notification already sent at audit creation
                delivered++;
              } else {
                await storage.updateAudit(audit.id, { reportDeliveryStatus: "SCHEDULED" });
              }
            } catch (e) {
              await storage.updateAudit(audit.id, { reportDeliveryStatus: "SCHEDULED" }).catch(() => {});
              console.error(`[Cron] Audit ${audit.id} delivery error:`, e);
            }
          }

          // Blood reports (24h)
          const BLOOD_MAX_DELIVERY_RETRIES = 5;
          const scheduledBlood = await storage.getScheduledBloodReportsForDelivery();
          for (const report of scheduledBlood) {
            const retries = (report as any).deliveryRetries ?? 0;
            if (retries >= BLOOD_MAX_DELIVERY_RETRIES) {
              console.error(`[Cron] Blood ${report.id} exceeded max retries (${retries}), marking DELIVERY_BLOCKED`);
              await storage.updateBloodReport(report.id, { deliveryStatus: "DELIVERY_BLOCKED" }).catch(() => {});
              continue;
            }
            try {
              await storage.updateBloodReport(report.id, { deliveryStatus: "SENDING", deliveryRetries: retries + 1 });
              const sent = await sendScheduledBloodEmail(report, baseUrl);
              if (sent) {
                await storage.updateBloodReport(report.id, { deliveryStatus: "SENT", emailSentAt: new Date() });
                // Note: Admin notification already sent at blood report creation
                delivered++;
              } else {
                // Quality gate blocked ,  keep SCHEDULED but increment retries so we eventually give up
                await storage.updateBloodReport(report.id, { deliveryStatus: "SCHEDULED" });
                console.warn(`[Cron] Blood ${report.id} quality gate blocked (retry ${retries + 1}/${BLOOD_MAX_DELIVERY_RETRIES})`);
              }
            } catch (e) {
              await storage.updateBloodReport(report.id, { deliveryStatus: "SCHEDULED" }).catch(() => {});
              console.error(`[Cron] Blood ${report.id} delivery error (retry ${retries + 1}):`, e);
            }
          }

          // Recover orphaned reports stuck in READY or SENDING (crash recovery, bug #9)
          try {
            const { pool } = await import("./db.js");

            // Recovery for blood_reports
            await pool.query(
              `UPDATE blood_reports SET delivery_status = 'SCHEDULED'
               WHERE delivery_status IN ('READY', 'SENDING')
                 AND report_scheduled_for <= NOW() - INTERVAL '10 minutes'`
            );

            // SECURITY FIX: Recovery for audits (prevents orphaned reports)
            const auditRecoveryResult = await pool.query(
              `UPDATE audits SET report_delivery_status = 'SCHEDULED'
               WHERE report_delivery_status IN ('READY', 'SENDING')
                 AND report_scheduled_for <= NOW() - INTERVAL '10 minutes'
               RETURNING id`
            );

            if (auditRecoveryResult.rows.length > 0) {
              const recoveredIds = auditRecoveryResult.rows.map((r: any) => r.id).join(', ');
              log(`Recovered ${auditRecoveryResult.rows.length} orphaned audits: ${recoveredIds}`);
            }
          } catch (_recoveryErr) {
            // Non-critical ,  silently ignore if DB unavailable
          }

          if (delivered > 0) {
            log(`Cron: delivered ${delivered} scheduled report(s)`);
          }
        } catch (err) {
          console.error("[Cron] Scheduled delivery error:", err);
        } finally {
          cronRunning = false;
        }
      };

      setInterval(runScheduledDelivery, CRON_INTERVAL_MS);
      log("Scheduled delivery cron started (every 5 min)");

      // Automatic monitoring: detect and restart stuck/failed jobs (every 10 min)
      const { runAutomaticMonitoring, ensureMonitoringTable } = await import("./monitoring.js");
      await ensureMonitoringTable(); // Create monitoring_logs table if needed

      const MONITORING_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes
      let monitoringRunning = false;

      const runMonitoringWithGuard = async () => {
        if (monitoringRunning) return;
        monitoringRunning = true;
        try {
          const stats = await runAutomaticMonitoring();
          if (stats.generatingStuck > 0 || stats.needsReviewFixed > 0 || stats.failedRetried > 0) {
            log(
              `Monitoring: Fixed ${stats.generatingStuck} stuck, ${stats.needsReviewFixed} needs_review, ${stats.failedRetried} failed`,
              "monitoring"
            );
          }
          if (stats.errors.length > 0) {
            console.error(
              `[Monitoring] ${stats.errors.length} errors during auto-recovery:`,
              stats.errors.slice(0, 3)
            );
          }
        } catch (err) {
          console.error("[Monitoring] Unhandled error in automatic monitoring:", err);
        } finally {
          monitoringRunning = false;
        }
      };

      setInterval(runMonitoringWithGuard, MONITORING_INTERVAL_MS);
      log("Automatic job monitoring started (every 10 min)");

      // Automatic reports: send detailed email report every 6 hours
      const { sendAutomaticReport } = await import("./automaticReports.js");
      const REPORT_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours
      let reportRunning = false;

      const runReportWithGuard = async () => {
        if (reportRunning) return;
        reportRunning = true;
        try {
          const success = await sendAutomaticReport();
          if (success) {
            log("Automatic 6h report sent successfully", "reports");
          } else {
            console.error("[Reports] Failed to send automatic 6h report");
          }
        } catch (err) {
          console.error("[Reports] Unhandled error in automatic reports:", err);
        } finally {
          reportRunning = false;
        }
      };

      // Send first report immediately on startup (then every 6h)
      runReportWithGuard();
      setInterval(runReportWithGuard, REPORT_INTERVAL_MS);
      log("Automatic 6h reports started (sent to admin email)");

      // Conversion tracking: DISABLED ,  no ads running, sends empty reports wasting tokens
      // To re-enable: uncomment and import sendDailyConversionReport from conversionTracker
      log("Daily conversion report DISABLED (no ads running)");

      // Automatic abandonment recovery ,  sends reminder emails to users who started a
      // questionnaire but didn't finish. Was only available as an admin endpoint, never
      // ran on its own. Now scheduled every 6h so abandons actually get recovered.
      // Respects the built-in min-6h wait + per-email dedup via logAbandonmentReminder.
      const { autoSendAbandonmentReminders } = await import("./abandonmentReminders.js");
      const ABANDON_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours
      let abandonRunning = false;

      const runAbandonRecovery = async () => {
        if (abandonRunning) return;
        abandonRunning = true;
        try {
          const stats = await autoSendAbandonmentReminders(storage, {
            dryRun: false,
            maxToSend: 50,
            notifyAdmin: true,
          });
          if (stats.sent > 0) {
            log(`Abandon recovery: ${stats.sent} reminders sent (${stats.failed} failed)`, "abandon");
          }
        } catch (err) {
          console.error("[AbandonRecovery] Unhandled error:", err);
        } finally {
          abandonRunning = false;
        }
      };

      // Don't run on startup ,  wait one interval so the service is settled.
      setInterval(runAbandonRecovery, ABANDON_INTERVAL_MS);
      log("Abandonment recovery cron started (every 6h, max 50 reminders/cycle)");

      // Recovery CTA drip - keeps the coaching recovery campaign moving without
      // batching enough SendPulse calls into one request to trigger gateway
      // timeouts. Cold-base sends stay opt-in via RECOVERY_CTA_INCLUDE_COLD=1.
      const RECOVERY_CTA_INTERVAL_MS = Math.max(
        60_000,
        Number(process.env.RECOVERY_CTA_INTERVAL_MS || 10 * 60 * 1000)
      );
      const RECOVERY_CTA_PER_TICK = Math.min(
        Math.max(Number(process.env.RECOVERY_CTA_PER_TICK || 3), 1),
        10
      );
      const RECOVERY_CTA_ENABLED = process.env.RECOVERY_CTA_DRIP_ENABLED !== "0";
      const RECOVERY_CTA_PARIS_START_HOUR = Math.min(
        Math.max(Number(process.env.RECOVERY_CTA_PARIS_START_HOUR || 8), 0),
        23
      );
      const RECOVERY_CTA_PARIS_END_HOUR = Math.min(
        Math.max(Number(process.env.RECOVERY_CTA_PARIS_END_HOUR || 22), 1),
        24
      );
      const recoveryCtaDays = process.env.RECOVERY_CTA_INCLUDE_COLD === "1"
        ? [1, 2, 3, 4, 5, 6, 7]
        : [1, 2, 3, 4, 5];
      let recoveryCtaRunning = false;

      const isWithinRecoveryCtaWindow = () => {
        const hour = Number(
          new Intl.DateTimeFormat("en-GB", {
            timeZone: "Europe/Paris",
            hour: "2-digit",
            hourCycle: "h23",
          }).format(new Date())
        );
        if (RECOVERY_CTA_PARIS_START_HOUR === RECOVERY_CTA_PARIS_END_HOUR) return true;
        if (RECOVERY_CTA_PARIS_START_HOUR < RECOVERY_CTA_PARIS_END_HOUR) {
          return hour >= RECOVERY_CTA_PARIS_START_HOUR && hour < RECOVERY_CTA_PARIS_END_HOUR;
        }
        return hour >= RECOVERY_CTA_PARIS_START_HOUR || hour < RECOVERY_CTA_PARIS_END_HOUR;
      };

      const runRecoveryCtaDrip = async () => {
        if (!RECOVERY_CTA_ENABLED || recoveryCtaRunning) return;
        if (!isWithinRecoveryCtaWindow()) return;
        const adminKey = process.env.ADMIN_SECRET || process.env.ADMIN_KEY;
        if (!adminKey) {
          log("Recovery CTA drip skipped: ADMIN_SECRET/ADMIN_KEY missing", "recovery-cta");
          return;
        }

        recoveryCtaRunning = true;
        try {
          const baseUrl = getBaseUrl();
          let sent = 0;
          let failed = 0;
          for (let attempt = 0; attempt < RECOVERY_CTA_PER_TICK; attempt++) {
            let sentThisAttempt = false;

            {
              const controller = new AbortController();
              const timeout = setTimeout(() => controller.abort(), 55_000);
              try {
                const response = await fetch(`${baseUrl}/api/admin/recovery-cta-click-followup`, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    "x-admin-key": adminKey,
                  },
                  body: JSON.stringify({ dryRun: false, maxToSend: 25, lookbackDays: 14, minHoursSinceClick: 2 }),
                  signal: controller.signal,
                });
                const result: any = await response.json().catch(() => null);
                if (!response.ok || !result?.success) {
                  failed++;
                  console.error("[RecoveryCTA-Drip] click follow-up failed", {
                    status: response.status,
                    error: result?.error || result?.message || "non-json response",
                  });
                } else if (Number(result.sent || 0) > 0) {
                  sent += Number(result.sent);
                  sentThisAttempt = true;
                }
              } catch (err) {
                failed++;
                console.error("[RecoveryCTA-Drip] click follow-up error:", err);
              } finally {
                clearTimeout(timeout);
              }
            }

            if (sentThisAttempt) {
              await new Promise((resolve) => setTimeout(resolve, 5_000));
              continue;
            }

            for (const day of recoveryCtaDays) {
              const controller = new AbortController();
              const timeout = setTimeout(() => controller.abort(), 55_000);
              try {
                const response = await fetch(`${baseUrl}/api/admin/recovery-cta-campaign`, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    "x-admin-key": adminKey,
                  },
                  body: JSON.stringify({ dryRun: false, day, maxToSend: 25, lookbackDays: 120 }),
                  signal: controller.signal,
                });
                const result: any = await response.json().catch(() => null);
                if (!response.ok || !result?.success) {
                  failed++;
                  console.error("[RecoveryCTA-Drip] send failed", {
                    day,
                    status: response.status,
                    error: result?.error || result?.message || "non-json response",
                  });
                  continue;
                }
                if (Number(result.sent || 0) > 0) {
                  sent += Number(result.sent);
                  sentThisAttempt = true;
                  break;
                }
              } catch (err) {
                failed++;
                console.error("[RecoveryCTA-Drip] send error:", err);
              } finally {
                clearTimeout(timeout);
              }
            }

            if (!sentThisAttempt) break;
            await new Promise((resolve) => setTimeout(resolve, 5_000));
          }

          if (sent > 0 || failed > 0) {
            log(`Recovery CTA drip: sent=${sent}, failed=${failed}`, "recovery-cta");
          }
        } finally {
          recoveryCtaRunning = false;
        }
      };

      setInterval(runRecoveryCtaDrip, RECOVERY_CTA_INTERVAL_MS);
      log(
        `Recovery CTA drip started (every ${Math.round(RECOVERY_CTA_INTERVAL_MS / 60000)} min, max ${RECOVERY_CTA_PER_TICK}/tick, days ${recoveryCtaDays.join(",")}, Paris ${RECOVERY_CTA_PARIS_START_HOUR}-${RECOVERY_CTA_PARIS_END_HOUR})`,
        "recovery-cta"
      );

      // Self-ping to prevent Render cold starts (every 4 min)
      if (process.env.NODE_ENV === "production") {
        const selfPingUrl = `${getBaseUrl()}/api/health`;
        const pingInterval = setInterval(async () => {
          try {
            await fetch(selfPingUrl);
          } catch {}
        }, 4 * 60 * 1000);
        pingInterval.unref();
        log("Self-ping anti cold start enabled (every 4 min)");
      }

      // RSS watchdog ,  graceful restart before Render container OOM-kills us
      // with SIGABRT (exit 134). Render container is 512MB. max-old-space-size
      // limits the V8 JS heap only; RSS also counts native memory (pdf-parse,
      // puppeteer, sharp, node_modules buffers) which doesn't respect that
      // flag. If RSS climbs above 460MB we're minutes from a container-level
      // SIGABRT ,  better to exit cleanly ourselves, let Render auto-restart
      // with a warm pool, and emit a log we can grep on.
      //
      // Triggers 2026-04-19T22:58Z and 2026-04-20T13:34Z were both
      // container-OS SIGABRT, not V8 OOM. This prevents the 3rd one.
      if (process.env.NODE_ENV === "production") {
        let highRssStreak = 0;
        const watchdog = setInterval(() => {
          const rssMb = Math.round(process.memoryUsage().rss / 1024 / 1024);
          if (rssMb > 460) {
            highRssStreak += 1;
            console.warn(`[Watchdog] RSS=${rssMb}MB > 460MB (streak=${highRssStreak})`);
            // Three consecutive high readings = real pressure, not a spike.
            if (highRssStreak >= 3) {
              console.error(`[Watchdog] 🚨 RSS=${rssMb}MB sustained, triggering graceful restart to avoid container SIGABRT`);
              clearInterval(watchdog);
              void gracefulShutdown("WATCHDOG_RSS");
            }
          } else {
            if (highRssStreak > 0) {
              console.log(`[Watchdog] RSS=${rssMb}MB normal, resetting streak`);
            }
            highRssStreak = 0;
          }
        }, 30_000);
        watchdog.unref();
        log("RSS watchdog enabled (restart at sustained RSS > 460MB)");
      }
    },
  );

  // Graceful shutdown: close HTTP server and DB pool
  const gracefulShutdown = async (signal: string) => {
    console.log(`[Shutdown] ${signal} received, closing server...`);
    httpServer.close(async () => {
      try {
        const { pool } = await import("./db.js");
        await pool.end();
        console.log("[Shutdown] DB pool closed");
      } catch {}
      process.exit(0);
    });
    // Force exit after 10s if graceful shutdown hangs
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on("SIGTERM", () => void gracefulShutdown("SIGTERM"));
  process.on("SIGINT", () => void gracefulShutdown("SIGINT"));
})();
