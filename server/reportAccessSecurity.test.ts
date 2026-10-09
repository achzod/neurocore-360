import assert from "node:assert/strict";
import test from "node:test";
import type { Request } from "express";
import {
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

test("signed report access is resource-bound and accepted only for its target", () => {
  const token = signReportAccessToken("audit", "audit-1", "owner@example.com");
  assert.equal(getReportAccessDecision(request({ "x-report-access": token }), "audit", "audit-1", "owner@example.com"), 200);
  assert.equal(verifyReportAccessToken(token, "audit", "audit-2"), null);
  assert.equal(verifyReportAccessToken(token, "peptides", "audit-1"), null);
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
