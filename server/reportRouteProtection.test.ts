import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";

const routes = fs.readFileSync(path.join(process.cwd(), "server/routes.ts"), "utf8");
const bloodRoutes = fs.readFileSync(path.join(process.cwd(), "server/blood-analysis/routes.ts"), "utf8");
const index = fs.readFileSync(path.join(process.cwd(), "server/index.ts"), "utf8");

function routeBody(source: string, route: string, nextRoute: string): string {
  const start = source.indexOf(route);
  const end = source.indexOf(nextRoute, start + route.length);
  assert.notEqual(start, -1, `route missing: ${route}`);
  assert.notEqual(end, -1, `next route missing: ${nextRoute}`);
  return source.slice(start, end);
}

test("identifier-based audit and review reads enforce report ownership", () => {
  const protectedRoutes: Array<[string, string]> = [
    ['app.get("/api/audits/:id"', 'app.get("/api/audits/:id/analysis"'],
    ['app.get("/api/audits/:id/analysis"', 'app.post("/api/audits/:id/generate-narrative"'],
    ['app.get("/api/audits/:id/narrative-status"', 'app.get("/api/audits/:id/dashboard"'],
    ['app.get("/api/audits/:id/narrative"', 'app.post("/api/auth/magic-link"'],
    ['app.get("/api/review/check/:auditId"', 'app.post("/api/generate-premium-audit"'],
    ['app.get("/api/discovery-scan/:auditId"', 'app.post("/api/discovery-scan/:auditId/regenerate"'],
  ];
  for (const [route, next] of protectedRoutes) {
    assert.match(routeBody(routes, route, next), /checkAuditOwnership\(/, route);
  }
});

test("blood public and peptides report reads require owner or signed access", () => {
  assert.match(
    routeBody(bloodRoutes, 'app.get("/api/blood-analysis/report/:id/public"', 'app.get("/api/blood-analysis/report/:id"'),
    /checkBloodReportOwnership\(/,
  );
  const peptides = routeBody(routes, 'app.get("/api/peptides-engine/report/:id"', '// Démarrer la surveillance');
  assert.match(peptides, /getReportAccessDecision\(req, "peptides", id, reportEmail\)/);
  assert.match(peptides, /status\(accessDecision\)/);
});

test("public review list is mapped through the strict public DTO", () => {
  const reviews = routeBody(routes, 'app.get("/api/reviews"', 'app.get("/api/admin/reviews/pending"');
  assert.match(reviews, /reviews\.map\(toPublicReview\)/);
  assert.doesNotMatch(reviews, /res\.json\(\{ success: true, reviews \}\)/);
});

test("CORS stays allowlisted and explicitly permits report authorization header", () => {
  assert.match(index, /allowedOrigins\.includes\(origin\)/);
  assert.doesNotMatch(index, /origin:\s*["']\*["']/);
  assert.match(index, /"X-Report-Access"/);
});
