import assert from "node:assert/strict";
import test from "node:test";

import {
  assertDiscoveryTransactionalAutomationEligible,
  getGenericDiscoveryMutationBlockReason,
  getDiscoveryAutomationStartAt,
  assertDiscoveryUnifiedGenerationEnabled,
  isAuditEligibleForPostDeliveryAutomation,
  isDiscoveryReportDeliveryEnabled,
  isDiscoveryUnifiedGenerationEnabled,
  isDiscoveryTransactionalAutomationEligible,
  isDiscoveryTransactionalAutomationEnabled,
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

test("Discovery unified generation defaults off and requires explicit true", () => {
  assert.equal(isDiscoveryUnifiedGenerationEnabled({}), false);
  assert.equal(isDiscoveryUnifiedGenerationEnabled({ DISCOVERY_UNIFIED_GENERATION_ENABLED: "false" }), false);
  assert.equal(isDiscoveryUnifiedGenerationEnabled({ DISCOVERY_UNIFIED_GENERATION_ENABLED: "true" }), true);
  assert.throws(() => assertDiscoveryUnifiedGenerationEnabled({}), /is not true/);
  assert.doesNotThrow(() => assertDiscoveryUnifiedGenerationEnabled({ DISCOVERY_UNIFIED_GENERATION_ENABLED: "TRUE" }));
});

test("transactional Discovery cut-over is fail-closed and inclusive", () => {
  const audit = { type: "GRATUIT", createdAt: "2026-08-13T15:00:00.000Z" };
  assert.equal(isDiscoveryTransactionalAutomationEnabled({}), false);
  assert.equal(getDiscoveryAutomationStartAt({}), null);
  assert.equal(getDiscoveryAutomationStartAt({ DISCOVERY_AUTOMATION_START_AT: "invalid" }), null);
  assert.equal(isDiscoveryTransactionalAutomationEligible(audit, {
    DISCOVERY_TRANSACTIONAL_AUTOMATION_ENABLED: "true",
  }), false);
  assert.equal(isDiscoveryTransactionalAutomationEligible(audit, {
    DISCOVERY_TRANSACTIONAL_AUTOMATION_ENABLED: "true",
    DISCOVERY_AUTOMATION_START_AT: "2026-08-13T15:00:00.000Z",
  }), true);
  assert.equal(isDiscoveryTransactionalAutomationEligible(audit, {
    DISCOVERY_TRANSACTIONAL_AUTOMATION_ENABLED: "true",
    DISCOVERY_AUTOMATION_START_AT: "2026-08-13T15:00:00.001Z",
  }), false);
  assert.equal(isDiscoveryTransactionalAutomationEligible({
    ...audit,
    type: "PREMIUM",
  }, {
    DISCOVERY_TRANSACTIONAL_AUTOMATION_ENABLED: "true",
    DISCOVERY_AUTOMATION_START_AT: "2026-08-13T15:00:00.000Z",
  }), false);
  assert.throws(() => assertDiscoveryTransactionalAutomationEligible(audit, {}),
    /DISCOVERY_TRANSACTIONAL_AUTOMATION_INELIGIBLE/);
});

test("Discovery cut-over accepts only a complete, real UTC ISO timestamp", () => {
  const validWithoutMillis = getDiscoveryAutomationStartAt({
    DISCOVERY_AUTOMATION_START_AT: "2026-08-13T15:00:00Z",
  });
  const validWithMillis = getDiscoveryAutomationStartAt({
    DISCOVERY_AUTOMATION_START_AT: "2026-08-13T15:00:00.123Z",
  });
  assert.equal(validWithoutMillis?.toISOString(), "2026-08-13T15:00:00.000Z");
  assert.equal(validWithMillis?.toISOString(), "2026-08-13T15:00:00.123Z");

  for (const invalid of [
    "2026-08-13",
    "2026-08-13T15:00Z",
    "2026-08-13T15:00:00",
    "2026-08-13T15:00:00+00:00",
    "2026-08-13T19:00:00+04:00",
    "2026-08-13T15:00:00.1Z",
    "2026-08-13T15:00:00.1234Z",
    "2026-02-30T15:00:00.000Z",
  ]) {
    assert.equal(getDiscoveryAutomationStartAt({ DISCOVERY_AUTOMATION_START_AT: invalid }), null, invalid);
  }
});

test("generic Discovery mutations reject legacy and BATCH_READY audits", () => {
  const env = {
    DISCOVERY_TRANSACTIONAL_AUTOMATION_ENABLED: "true",
    DISCOVERY_AUTOMATION_START_AT: "2026-08-13T15:00:00.000Z",
  };
  assert.equal(getGenericDiscoveryMutationBlockReason({
    type: "PREMIUM",
    createdAt: "2020-01-01T00:00:00.000Z",
    reportDeliveryStatus: "BATCH_READY",
  }, env), null);
  assert.equal(getGenericDiscoveryMutationBlockReason({
    type: "GRATUIT",
    createdAt: "2026-08-13T14:59:59.999Z",
    reportDeliveryStatus: "PENDING",
  }, env), "DISCOVERY_TRANSACTIONAL_AUTOMATION_INELIGIBLE");
  assert.equal(getGenericDiscoveryMutationBlockReason({
    type: "GRATUIT",
    createdAt: "2026-08-13T15:00:00.000Z",
    reportDeliveryStatus: "BATCH_READY",
  }, env), "DISCOVERY_BATCH_READY_REQUIRES_EXPLICIT_BATCH_FLOW");
  assert.equal(getGenericDiscoveryMutationBlockReason({
    type: "GRATUIT",
    createdAt: "2026-08-13T15:00:00.000Z",
    reportDeliveryStatus: "PENDING",
  }, env), "DISCOVERY_REQUIRES_TRANSACTIONAL_WORKFLOW");
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
