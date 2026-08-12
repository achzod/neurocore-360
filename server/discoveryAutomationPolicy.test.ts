import assert from "node:assert/strict";
import test from "node:test";

import {
  isAuditEligibleForPostDeliveryAutomation,
  isDiscoveryReportDeliveryEnabled,
} from "./discoveryAutomationPolicy";
import {
  attachDiscoveryDeliveryGateResult,
  createDiscoveryDeliveryGateResult,
} from "./discoveryDeliveryGate";

test("Discovery delivery kill switch defaults off and requires explicit true", () => {
  assert.equal(isDiscoveryReportDeliveryEnabled({}), false);
  assert.equal(isDiscoveryReportDeliveryEnabled({ DISCOVERY_REPORT_DELIVERY_ENABLED: "false" }), false);
  assert.equal(isDiscoveryReportDeliveryEnabled({ DISCOVERY_REPORT_DELIVERY_ENABLED: "true" }), true);
  assert.equal(isDiscoveryReportDeliveryEnabled({ DISCOVERY_REPORT_DELIVERY_ENABLED: "TRUE" }), true);
});

test("post-delivery automation rejects undelivered and superseded reports", () => {
  assert.equal(isAuditEligibleForPostDeliveryAutomation({
    type: "PREMIUM",
    reportDeliveryStatus: "READY",
    reportSentAt: null,
  }), false);
  assert.equal(isAuditEligibleForPostDeliveryAutomation({
    type: "GRATUIT",
    reportDeliveryStatus: "SUPERSEDED",
    reportSentAt: new Date(),
  }), false);
});

test("Discovery post-delivery automation requires the persisted premium gate", () => {
  const passingNarrative = attachDiscoveryDeliveryGateResult(
    {},
    createDiscoveryDeliveryGateResult({ ok: true, errors: [] }),
  );
  assert.equal(isAuditEligibleForPostDeliveryAutomation({
    type: "GRATUIT",
    reportDeliveryStatus: "SENT",
    reportSentAt: new Date(),
    narrativeReport: {},
  }), false);
  assert.equal(isAuditEligibleForPostDeliveryAutomation({
    type: "GRATUIT",
    reportDeliveryStatus: "SENT",
    reportSentAt: new Date(),
    narrativeReport: passingNarrative,
  }), true);
  assert.equal(isAuditEligibleForPostDeliveryAutomation({
    type: "GRATUIT",
    reportDeliveryStatus: "SENT",
    reportSentAt: new Date(),
    narrativeReport: {
      ...passingNarrative,
      recovery: { disposition: "superseded", replacementAuditId: "replacement" },
    },
  }), false);
});

test("paid reports still require SENT plus reportSentAt", () => {
  assert.equal(isAuditEligibleForPostDeliveryAutomation({
    type: "PREMIUM",
    reportDeliveryStatus: "SENT",
    reportSentAt: new Date(),
  }), true);
});
