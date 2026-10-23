import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  evaluatePeptidesFulfillmentInvariant,
  shouldAlertPeptidesFulfillmentIncident,
} from "./peptidesFulfillmentInvariant";

const now = new Date("2026-10-01T20:00:00.000Z");
const validReport = {
  qualityVersion: "expert-standard-v1",
  peptides: [{ name: "A" }, { name: "B" }],
};

test("flags a paid order that stays without a report", () => {
  assert.equal(evaluatePeptidesFulfillmentInvariant({
    paidAt: "2026-10-01T19:00:00.000Z",
    deliveryAccepted: false,
    recipientUnsubscribed: false,
    now,
  })?.code, "MISSING_REPORT");
});

test("blocks any legacy medical-review or empty paid report", () => {
  for (const report of [
    { qualityVersion: "medical-review-v1", peptides: [] },
    { qualityVersion: "expert-standard-v1", peptides: [] },
  ]) {
    const incident = evaluatePeptidesFulfillmentInvariant({
      paidAt: "2026-10-01T18:00:00.000Z",
      reportId: "report-1",
      report,
      deliveryAccepted: false,
      recipientUnsubscribed: false,
      now,
    });
    assert.equal(incident?.code, "INVALID_EMPTY_OR_MEDICAL_REVIEW_REPORT");
    assert.equal(incident?.blocksDelivery, true);
  }
});

test("turns an unsubscribe into a durable action-required incident", () => {
  const incident = evaluatePeptidesFulfillmentInvariant({
    paidAt: "2026-10-01T18:00:00.000Z",
    reportId: "report-1",
    report: validReport,
    deliveryAccepted: false,
    recipientUnsubscribed: true,
    scheduledAt: "2026-10-01T19:00:00.000Z",
    now,
  });
  assert.equal(incident?.code, "RECIPIENT_UNSUBSCRIBED");
  assert.equal(incident?.blocksDelivery, true);
});

test("flags overdue valid delivery but leaves recovery enabled", () => {
  const incident = evaluatePeptidesFulfillmentInvariant({
    paidAt: "2026-10-01T18:00:00.000Z",
    reportId: "report-1",
    report: validReport,
    deliveryAccepted: false,
    recipientUnsubscribed: false,
    scheduledAt: "2026-10-01T19:00:00.000Z",
    now,
  });
  assert.equal(incident?.code, "DELIVERY_OVERDUE");
  assert.equal(incident?.blocksDelivery, false);
});

test("does not flag an intentionally held delivery as overdue", () => {
  assert.equal(evaluatePeptidesFulfillmentInvariant({
    paidAt: "2026-10-01T18:00:00.000Z",
    reportId: "report-1",
    report: validReport,
    deliveryAccepted: false,
    deliveryHeld: true,
    recipientUnsubscribed: false,
    scheduledAt: "2026-10-01T19:00:00.000Z",
    now,
  }), null);
});

test("preserves an explicitly manual report under delivery hold", () => {
  assert.equal(evaluatePeptidesFulfillmentInvariant({
    paidAt: "2026-10-01T18:00:00.000Z",
    reportId: "manual-report-1",
    report: { qualityVersion: "medical-review-v1", peptides: [{ name: "A" }] },
    deliveryAccepted: false,
    deliveryHeld: true,
    manualFulfillment: true,
    recipientUnsubscribed: false,
    scheduledAt: "2026-10-01T19:00:00.000Z",
    now,
  }), null);
});

test("does not let a manual flag hide a missing report", () => {
  assert.equal(evaluatePeptidesFulfillmentInvariant({
    paidAt: "2026-10-01T18:00:00.000Z",
    deliveryAccepted: false,
    deliveryHeld: true,
    manualFulfillment: true,
    recipientUnsubscribed: false,
    now,
  })?.code, "MISSING_REPORT");
});

test("passes a valid accepted delivery", () => {
  assert.equal(evaluatePeptidesFulfillmentInvariant({
    paidAt: "2026-10-01T18:00:00.000Z",
    reportId: "report-1",
    report: validReport,
    deliveryAccepted: true,
    recipientUnsubscribed: false,
    scheduledAt: "2026-10-01T19:00:00.000Z",
    now,
  }), null);
});

test("alerts once while the same fulfillment incident remains unresolved", () => {
  assert.equal(shouldAlertPeptidesFulfillmentIncident({}, "RECIPIENT_UNSUBSCRIBED"), true);
  assert.equal(shouldAlertPeptidesFulfillmentIncident({
    peptidesFulfillmentState: "ACTION_REQUIRED",
    peptidesFulfillmentIncidentCode: "RECIPIENT_UNSUBSCRIBED",
    peptidesFulfillmentIncidentAlertedAt: "2026-10-04T15:37:00.674Z",
  }, "RECIPIENT_UNSUBSCRIBED"), false);
});

test("alerts again only after resolution or when the incident code changes", () => {
  const prior = {
    peptidesFulfillmentState: "RESOLVED",
    peptidesFulfillmentIncidentCode: "RECIPIENT_UNSUBSCRIBED",
    peptidesFulfillmentIncidentAlertedAt: "2026-10-04T15:37:00.674Z",
  };
  assert.equal(shouldAlertPeptidesFulfillmentIncident(prior, "RECIPIENT_UNSUBSCRIBED"), true);
  assert.equal(shouldAlertPeptidesFulfillmentIncident({
    ...prior,
    peptidesFulfillmentState: "ACTION_REQUIRED",
  }, "DELIVERY_OVERDUE"), true);
});

test("the worker refreshes each paid order before evaluating fulfillment", () => {
  const routes = readFileSync(new URL("./routes.ts", import.meta.url), "utf8");
  const loopStart = routes.indexOf("for (const snapshotOrder of peptidesOrders)");
  const invariantStart = routes.indexOf("evaluatePeptidesFulfillmentInvariant({", loopStart);
  assert.ok(loopStart >= 0 && invariantStart > loopStart, "AutoGen paid-order loop must exist");
  const preInvariant = routes.slice(loopStart, invariantStart);
  assert.match(preInvariant, /storage\.getOrder\(snapshotOrder\.id\)/);
  assert.match(preInvariant, /if \(!order \|\| order\.productType !== "PEPTIDES_ENGINE" \|\| order\.status !== "paid" \|\| !order\.paidAt\) continue/);

  const invariantCall = routes.slice(invariantStart, routes.indexOf("});", invariantStart) + 3);
  assert.match(invariantCall, /manualFulfillment:\s*meta\?\.peptidesManualFulfillment/);
  assert.match(invariantCall, /deliveryHeld:\s*meta\?\.peptidesEmailHold/);
});

test("automatic Peptides delivery remains signed-link-only", () => {
  const routes = readFileSync(new URL("./routes.ts", import.meta.url), "utf8");
  const autoGenStart = routes.indexOf("// Auto-recovery: generate missing peptides reports every 5 minutes");
  const autoSendStart = routes.indexOf("// Auto-send READY/SCHEDULED reports", autoGenStart);
  assert.ok(autoGenStart >= 0 && autoSendStart > autoGenStart, "AutoGen delivery block must exist");
  const autoGen = routes.slice(autoGenStart, autoSendStart);
  assert.match(autoGen, /buildReportAccessUrl\(baseUrl, `\/peptides\/\$\{/);
  assert.doesNotMatch(autoGen, /generateExportPDF|attachments?_binary|Content-Disposition|\.pdf\b/i);
});
