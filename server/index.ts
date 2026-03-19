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

// Global safety nets — prevent silent crashes in production
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
}));

// Gzip compression for all responses
app.use(compression());

// CORS
const allowedOrigins = [
  process.env.APP_URL,
  process.env.RENDER_EXTERNAL_URL,
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
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
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
  const recommended = ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "ADMIN_SECRET", "APP_URL", "ANTHROPIC_API_KEY", "SENDPULSE_USER_ID"];
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
          log("Cron: skipping — previous run still in progress");
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
                // Quality gate blocked — keep SCHEDULED but increment retries so we eventually give up
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
            // Non-critical — silently ignore if DB unavailable
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
