import assert from "node:assert/strict";
import test from "node:test";
import type { Request } from "express";
import jwt from "jsonwebtoken";
import {
  getAuthPayload,
  getReportAccessDecision,
  signAuthToken,
  signReportAccessToken,
  verifyReportAccessToken,
} from "./auth";
import { toPublicReview } from "./reviewPublicResponse";

process.env.SESSION_SECRET = "report-access-test-secret-at-least-32-bytes";

const request = (headers: Record<string, string> = {}, query: Record<string, string> = {}) => ({
  headers,
  query,
}) as unknown as Request;

test("report reads return 401 without owner session or signed access", () => {
  assert.equal(getReportAccessDecision(request(), "audit", "audit-1", "owner@example.com"), 401);
});

test("report reads return 403 for an authenticated non-owner", () => {
  const bearer = signAuthToken({ userId: "other", email: "other@example.com" });
  assert.equal(
    getReportAccessDecision(request({ authorization: `Bearer ${bearer}` }), "audit", "audit-1", "owner@example.com"),
    403,
  );
});

test("session tokens are domain-separated while legacy owner sessions remain valid", () => {
  const current = signAuthToken({ userId: "owner", email: "owner@example.com" });
  const currentDecoded = jwt.decode(current) as Record<string, any>;
  assert.equal(currentDecoded.tokenType, "session");
  assert.equal(currentDecoded.iss, "apexlabs");
  assert.equal(currentDecoded.aud, "session");
  assert.deepEqual(getAuthPayload(request({ authorization: "Bearer " + current })), {
    userId: "owner",
    email: "owner@example.com",
  });

  const legacy = jwt.sign({ userId: "legacy", email: "legacy@example.com" }, process.env.SESSION_SECRET!, { expiresIn: "1h" });
  assert.deepEqual(getAuthPayload(request({ authorization: "Bearer " + legacy })), {
    userId: "legacy",
    email: "legacy@example.com",
  });
});

test("signed report access is permanent, resource-bound and accepted only for its target", () => {
  const token = signReportAccessToken("audit", "audit-1", "owner@example.com");
  const decoded = jwt.decode(token) as Record<string, any>;
  assert.equal(decoded.exp, undefined);
  assert.equal(getReportAccessDecision(request({ "x-report-access": token }), "audit", "audit-1", "owner@example.com"), 200);
  assert.equal(getReportAccessDecision(request({ "x-report-access": token }), "audit", "audit-1", "other@example.com"), 401);
  assert.equal(verifyReportAccessToken(token, "audit", "audit-2"), null);
  assert.equal(verifyReportAccessToken(token, "peptides", "audit-1"), null);
  assert.equal(getAuthPayload(request({ authorization: `Bearer ***}` })), null, "a report token must never become an owner session");
});

test("legacy signed report links remain valid after their former expiry", () => {
  const token = jwt.sign({
    tokenType: "report_access",
    resource: "peptides",
    resourceId: "report-legacy",
    email: "owner@example.com",
  }, process.env.SESSION_SECRET!, {
    expiresIn: -1,
    issuer: "apexlabs",
    audience: "report-access",
  });
  assert.equal(
    getReportAccessDecision(request({ "x-report-access": token }), "peptides", "report-legacy", "owner@example.com"),
    200,
  );
});

test("an expired or invalid direct link never revokes lifetime owner access", () => {
  const bearer = signAuthToken({ userId: "owner", email: "owner@example.com" });
  assert.equal(getReportAccessDecision(request({
    authorization: "Bearer " + bearer,
    "x-report-access": "expired-direct-link",
  }), "peptides", "report-1", "owner@example.com"), 200);
});

test("public reviews expose only testimonial fields", () => {
  const publicReview = toPublicReview({
    rating: 5,
    comment: "Excellent",
    auditType: "DISCOVERY",
    createdAt: "2026-10-09T00:00:00Z",
    email: "client@example.com",
    auditId: "sensitive-audit-id",
    promoCode: "SECRET20",
    reviewedBy: "admin@example.com",
    status: "approved",
  } as any);
  assert.deepEqual(Object.keys(publicReview).sort(), ["auditType", "comment", "createdAt", "rating"]);
  assert.equal(JSON.stringify(publicReview).includes("client@example.com"), false);
  assert.equal(JSON.stringify(publicReview).includes("sensitive-audit-id"), false);
  assert.equal(JSON.stringify(publicReview).includes("SECRET20"), false);
});
