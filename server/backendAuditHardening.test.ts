import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";
import type { Request } from "express";
import {
  maskEmailForLog,
  redactEmailsInText,
  redactPathForLog,
  summarizeErrorBodyForLog,
} from "./logRedaction";
import { clientIpKey } from "./middleware/rateLimit";

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), "utf8");
const routes = read("server/routes.ts");
const bloodRoutes = read("server/blood-analysis/routes.ts");
const index = read("server/index.ts");

function routeHead(source: string, route: string, chars = 600): string {
  const start = source.indexOf(route);
  assert.notEqual(start, -1, `route missing: ${route}`);
  return source.slice(start, start + chars);
}

test("emails are masked in log text and paths", () => {
  assert.equal(maskEmailForLog("jean.dupont@gmail.com"), "je***@gmail.com");
  assert.equal(redactEmailsInText("sent to a@b.fr and zz@x.com"), "sent to a***@b.fr and zz***@x.com");
  assert.equal(redactPathForLog("/api/questionnaire/progress/jean%40mail.com"), "/api/questionnaire/progress/je***@mail.com");
  assert.equal(redactPathForLog("/api/audits/123"), "/api/audits/123");
});

test("only the error message of a response body reaches the logs", () => {
  assert.equal(summarizeErrorBodyForLog({ error: "Unauthorized", user: { email: "x@y.fr" } }), "error=Unauthorized");
  assert.equal(summarizeErrorBodyForLog({ success: true, orders: [] }), undefined);
  assert.equal(summarizeErrorBodyForLog("text"), undefined);
});

test("rate limiter keys on the real client ip behind the proxy", () => {
  const req = (headers: Record<string, string>, ip = "10.0.0.1") => ({ headers, ip }) as unknown as Request;
  assert.equal(clientIpKey(req({ "cf-connecting-ip": "1.2.3.4", "x-forwarded-for": "5.6.7.8" })), "1.2.3.4");
  assert.equal(clientIpKey(req({ "x-forwarded-for": "5.6.7.8, 10.0.0.2" })), "5.6.7.8");
  assert.equal(clientIpKey(req({})), "10.0.0.1");
});

test("request logger no longer serializes response bodies", () => {
  assert.doesNotMatch(index, /JSON\.stringify\(capturedJsonResponse\)/);
  assert.match(index, /redactPathForLog\(path\)/);
});

test("paid AI routes without a client caller require the admin key", () => {
  assert.match(routeHead(routes, 'app.post("/api/generate-premium-audit"'), /requireAdminAuth\(req, res\)/);
  assert.match(routeHead(bloodRoutes, 'app.post("/api/blood-analysis/full-analysis"'), /isAdminRequestAuthorized\(req\)/);
  assert.match(routeHead(bloodRoutes, 'app.post("/api/blood-analysis/comprehensive-report"'), /isAdminRequestAuthorized\(req\)/);
});

test("no hard-coded fallback secrets on public routes", () => {
  assert.doesNotMatch(routes, /apexlabs_sheets_readonly_2026/);
  assert.doesNotMatch(routes, /"your_admin_secret"/);
});

test("public write and lookup routes are rate limited", () => {
  for (const [route, limiter] of [
    ['app.post("/api/questionnaire/save-progress"', "progressWriteLimiter"],
    ['app.get("/api/questionnaire/progress/:email"', "progressReadLimiter"],
    ['app.post("/api/questionnaire/clear-progress"', "progressReadLimiter"],
    ['app.post("/api/auth/check-email"', "accountLookupLimiter"],
    ['app.post("/api/auth/verify-magic-link"', "magicLinkVerifyLimiter"],
    ['app.post("/api/submit-review"', "publicSubmitLimiter"],
    ['app.post("/api/waitlist/subscribe"', "publicSubmitLimiter"],
    ['app.post("/api/promo-codes/validate"', "promoValidateLimiter"],
  ] as const) {
    assert.match(routeHead(routes, route, 120), new RegExp(limiter), route);
  }
});

test("sendpulse webhook does not dump recipient emails", () => {
  const body = routeHead(routes, 'app.post("/api/webhooks/sendpulse"', 1500);
  assert.doesNotMatch(body, /JSON\.stringify\(req\.body/);
  assert.match(body, /SENDPULSE_WEBHOOK_TOKEN/);
});
