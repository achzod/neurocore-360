import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  DISCOVERY_SUPERSEDED_TERMINAL_SQL,
  isDiscoverySupersededTerminal,
} from "./discoverySupersededPolicy";

test("SUPERSEDED status is terminal for Discovery", () => {
  assert.equal(isDiscoverySupersededTerminal({
    type: "GRATUIT",
    reportDeliveryStatus: "SUPERSEDED",
  }), true);
});

test("durable recovery provenance remains terminal after status corruption", () => {
  assert.equal(isDiscoverySupersededTerminal({
    type: "GRATUIT",
    reportDeliveryStatus: "NEEDS_REVIEW",
    narrativeReport: { recovery: { disposition: "superseded" } },
  }), true);
  assert.equal(isDiscoverySupersededTerminal({
    type: "GRATUIT",
    reportDeliveryStatus: "READY",
    narrativeReport: { recovery: { replacementAuditId: "replacement-id" } },
  }), true);
});

test("paid reports and ordinary Discovery states are not misclassified", () => {
  assert.equal(isDiscoverySupersededTerminal({
    type: "PREMIUM",
    reportDeliveryStatus: "SUPERSEDED",
  }), false);
  assert.equal(isDiscoverySupersededTerminal({
    type: "GRATUIT",
    reportDeliveryStatus: "NEEDS_REVIEW",
    narrativeReport: { recovery: { disposition: "missing_artifacts" } },
  }), false);
});

test("atomic SQL guard covers status, disposition and replacement provenance", () => {
  assert.match(DISCOVERY_SUPERSEDED_TERMINAL_SQL, /report_delivery_status = 'SUPERSEDED'/);
  assert.match(DISCOVERY_SUPERSEDED_TERMINAL_SQL, /disposition/);
  assert.match(DISCOVERY_SUPERSEDED_TERMINAL_SQL, /replacementAuditId/);
});

test("public Discovery GET contains no mutation, generation or queue side effect", () => {
  const routes = readFileSync(new URL("./routes.ts", import.meta.url), "utf8");
  const start = routes.indexOf('app.get("/api/discovery-scan/:auditId"');
  const end = routes.indexOf('app.post("/api/discovery-scan/:auditId/regenerate"', start);
  assert.ok(start >= 0 && end > start, "Discovery GET route must be present");
  const getRoute = routes.slice(start, end);
  assert.doesNotMatch(getRoute, /storage\.updateAudit|claimAuditForGeneration|createOrUpdateReportJob/);
  assert.doesNotMatch(getRoute, /analyzeDiscoveryScan|convertToNarrativeReport|startReportGeneration/);
  assert.match(getRoute, /isDiscoverySupersededTerminal/);
  assert.match(getRoute, /status\(410\)/);
});
