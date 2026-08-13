import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  PUBLIC_DISCOVERY_AUDIT_KEYS,
  sanitizePublicDiscoveryAuditPayload,
} from "./publicDiscoveryAuditPayload";

const sensitiveDiscoveryAudit = {
  id: "discovery-id",
  type: "GRATUIT",
  status: "COMPLETED",
  reportDeliveryStatus: "SENT",
  reportScheduledFor: null,
  reportGeneratedAt: "2026-08-13T01:00:00.000Z",
  reportSentAt: "2026-08-13T01:01:00.000Z",
  createdAt: "2026-08-13T00:00:00.000Z",
  completedAt: "2026-08-13T00:59:00.000Z",
  email: "private@example.test",
  userId: "private-user-id",
  responses: { prenom: "Private", medical: "private answer" },
  scores: { sommeil: 3 },
  narrativeReport: { private: true },
  reportTxt: "private txt",
  reportHtml: "<p>private html</p>",
  futureSensitiveColumn: "must remain private",
};

function assertStrictPublicDiscoveryPayload(payload: Record<string, unknown>) {
  assert.deepEqual(Object.keys(payload), [...PUBLIC_DISCOVERY_AUDIT_KEYS]);
  for (const forbiddenKey of [
    "email",
    "userId",
    "responses",
    "scores",
    "narrativeReport",
    "reportTxt",
    "reportHtml",
    "futureSensitiveColumn",
  ]) {
    assert.equal(Object.prototype.hasOwnProperty.call(payload, forbiddenKey), false);
  }
}

test("public Discovery full payload is restricted to the lifecycle allowlist", () => {
  const payload = sanitizePublicDiscoveryAuditPayload(sensitiveDiscoveryAudit);
  assertStrictPublicDiscoveryPayload(payload);
  assert.equal(payload.type, "GRATUIT");
  assert.equal(payload.reportDeliveryStatus, "SENT");
});

test("public Discovery light payload uses the same strict contract", () => {
  const payload = sanitizePublicDiscoveryAuditPayload(sensitiveDiscoveryAudit);
  assertStrictPublicDiscoveryPayload(payload);
});

test("scheduled Discovery payload cannot expose identity, questionnaire or report content", () => {
  const payload = sanitizePublicDiscoveryAuditPayload({
    ...sensitiveDiscoveryAudit,
    reportDeliveryStatus: "SCHEDULED",
    reportScheduledFor: "2099-01-01T00:00:00.000Z",
  });

  assertStrictPublicDiscoveryPayload(payload);
  assert.equal(payload.reportDeliveryStatus, "SCHEDULED");
  assert.equal(payload.reportScheduledFor, "2099-01-01T00:00:00.000Z");
});

test("the dedicated serializer leaves non-Discovery products unchanged", () => {
  const premiumAudit = {
    ...sensitiveDiscoveryAudit,
    type: "PREMIUM",
  };

  assert.strictEqual(sanitizePublicDiscoveryAuditPayload(premiumAudit), premiumAudit);
});

test("the public audit route sanitizes Discovery before light/full/scheduled branching", () => {
  const routes = readFileSync(new URL("./routes.ts", import.meta.url), "utf8");
  const start = routes.indexOf('app.get("/api/audits/:id"');
  const end = routes.indexOf('app.get("/api/audits/:id/analysis"', start);
  assert.ok(start >= 0 && end > start, "public audit route not found");
  const route = routes.slice(start, end);

  const discoveryGuard = route.indexOf('audit.type === "GRATUIT"');
  const strictSerializer = route.indexOf("sanitizePublicDiscoveryAuditPayload", discoveryGuard);
  const scheduledBranch = route.indexOf("audit.reportScheduledFor", discoveryGuard);
  const lightBranch = route.indexOf('req.query.light === "1"', discoveryGuard);

  assert.ok(discoveryGuard >= 0, "Discovery guard missing");
  assert.ok(strictSerializer > discoveryGuard, "strict Discovery serializer missing");
  assert.ok(scheduledBranch > strictSerializer, "scheduled branch must run after strict Discovery return");
  assert.ok(lightBranch > strictSerializer, "light/full branch must run after strict Discovery return");
  assert.match(route, /Cache-Control", "private, no-store"/);
});

test("non-Discovery public route behavior remains behind the existing light/full branches", () => {
  const routes = readFileSync(new URL("./routes.ts", import.meta.url), "utf8");
  const start = routes.indexOf('app.get("/api/audits/:id"');
  const end = routes.indexOf('app.get("/api/audits/:id/analysis"', start);
  const route = routes.slice(start, end);

  assert.match(route, /light \? sanitizeAuditPayload\(sanitized\) : sanitized/);
  assert.match(route, /light \? sanitizeAuditPayload\(audit\) : audit/);
});
