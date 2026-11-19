import express, { type Express, type Request, type Response, type NextFunction } from "express";

/**
 * Extra security headers on top of helmet.
 *
 * The Content-Security-Policy ships in Report-Only mode first: the site loads
 * Google tag (GA4 + Ads), Microsoft Clarity, optional Meta pixel and Sentry, and
 * checkout redirects to Stripe. Report-Only lets us collect violations from real
 * traffic before enforcing anything, with zero risk of breaking checkout or
 * analytics. Switch to enforcement only once /api/csp-report stays quiet.
 */
export const CSP_REPORT_PATH = "/api/csp-report";

const CSP_DIRECTIVES: Record<string, string[]> = {
  "default-src": ["'self'"],
  "script-src": [
    "'self'",
    "'unsafe-inline'",
    "https://www.googletagmanager.com",
    "https://*.googletagmanager.com",
    "https://www.google-analytics.com",
    "https://*.google-analytics.com",
    "https://googleads.g.doubleclick.net",
    "https://www.googleadservices.com",
    "https://www.google.com",
    "https://connect.facebook.net",
    "https://www.clarity.ms",
    "https://*.clarity.ms",
    "https://browser.sentry-cdn.com",
  ],
  "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
  "font-src": ["'self'", "data:", "https://fonts.gstatic.com"],
  "img-src": ["'self'", "data:", "blob:", "https:"],
  "media-src": ["'self'", "blob:", "https://cdn.speedsize.com"],
  "connect-src": [
    "'self'",
    "https://*.google-analytics.com",
    "https://*.analytics.google.com",
    "https://*.googletagmanager.com",
    "https://*.g.doubleclick.net",
    "https://www.google.com",
    "https://www.googleadservices.com",
    "https://pagead2.googlesyndication.com",
    "https://*.clarity.ms",
    "https://www.facebook.com",
    "https://connect.facebook.net",
    "https://*.sentry.io",
  ],
  "frame-src": [
    "'self'",
    "https://www.googletagmanager.com",
    "https://td.doubleclick.net",
    "https://www.youtube.com",
    "https://www.youtube-nocookie.com",
    "https://www.facebook.com",
  ],
  "form-action": ["'self'", "https://checkout.stripe.com"],
  "frame-ancestors": ["'self'"],
  "base-uri": ["'self'"],
  "object-src": ["'none'"],
};

export function buildCspReportOnly(): string {
  const parts = Object.entries(CSP_DIRECTIVES).map(([name, values]) => `${name} ${values.join(" ")}`);
  parts.push(`report-uri ${CSP_REPORT_PATH}`);
  return parts.join("; ");
}

export const PERMISSIONS_POLICY = [
  "camera=()",
  "microphone=()",
  "geolocation=()",
  "payment=()",
  "usb=()",
  "magnetometer=()",
  "gyroscope=()",
  "accelerometer=()",
  "browsing-topics=()",
].join(", ");

const CSP_HEADER_VALUE = buildCspReportOnly();

export function applySecurityHeaders(app: Express): void {
  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader("Content-Security-Policy-Report-Only", CSP_HEADER_VALUE);
    res.setHeader("Permissions-Policy", PERMISSIONS_POLICY);
    next();
  });

  // Minimal, rate-limited sink for CSP violation reports (logs only, no storage).
  let windowStart = Date.now();
  let countInWindow = 0;
  app.post(
    CSP_REPORT_PATH,
    express.json({ type: ["application/csp-report", "application/reports+json", "application/json"], limit: "16kb" }),
    (req: Request, res: Response) => {
      const now = Date.now();
      if (now - windowStart > 60_000) {
        windowStart = now;
        countInWindow = 0;
      }
      countInWindow += 1;
      if (countInWindow <= 20) {
        const report = (req.body && (req.body["csp-report"] || req.body)) || {};
        const r = Array.isArray(report) ? report[0]?.body || {} : report;
        console.warn(
          "[CSP-REPORT]",
          JSON.stringify({
            directive: r["violated-directive"] || r.effectiveDirective || r["effective-directive"],
            blocked: r["blocked-uri"] || r.blockedURL,
            page: r["document-uri"] || r.documentURL,
          }).slice(0, 500),
        );
      }
      res.status(204).end();
    },
  );
}
