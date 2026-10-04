import assert from "node:assert/strict";
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
