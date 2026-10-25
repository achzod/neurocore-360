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
  peptides: [{
    name: "BPC-157",
    activationStatus: "active",
    route: "Sous-cutanee",
    dosage: "Dose documentee",
    timing: "Calendrier documente",
    purpose: "Axe documente",
    purchaseUrl: "https://www.peptaura.com/catalog/BPC-157",
    reconstitution: "Vial documente avec instructions completes.",
    vialsNeeded: "2 vials documentes.",
    priceEstimate: "2 vials, estimation documentee.",
    cycleDuration: "8 semaines",
    whyThisPeptide: "Rationale documentee",
  }],
  sections: Array.from({ length: 12 }, (_, index) => ({
    id: `section-${index + 1}`,
    content: "x".repeat(1_000),
  })),
  weeklySchedule: "LUNDI AM: protocole structure. ".repeat(4),
  shoppingList: "BPC-157 — source directe https://www.peptaura.com/catalog/BPC-157 — 2 vials documentes. ".repeat(2),
};
const expertReviewWithSource = {
  qualityVersion: "expert-review-v2",
  peptides: [{
    name: "Retatrutide",
    activationStatus: "conditional-inactive",
    purchaseUrl: "https://www.peptaura.com/product/retatrutide-10mg",
    reconstitution: "",
    vialsNeeded: "",
    priceEstimate: "",
  }],
  sections: [
    ...Array.from({ length: 16 }, (_, index) => ({
      id: `section-${index + 1}`,
      content: "analyse personnalisee ".repeat(40),
    })),
    {
      id: "source-access",
      content: "Acces source Peptaura inclus. Le lien fournisseur est affiche sur la fiche Retatrutide sans activer de protocole personnel.",
    },
  ],
  weeklySchedule: "LUNDI AM: baseline. MARDI PM: faim. MERCREDI PM: entrainement. JEUDI PM: nutrition. VENDREDI PM: recuperation.",
  shoppingList: "",
  _customerRemediation: {
    version: "dalil-full-report-v7",
    scientificSources: true,
    operationalProtocol: false,
    purchaseLinks: true,
    questionnaireAnswersUsed: 26,
    sameReportIdRequired: true,
  },
  _sourceAccess: {
    provider: "peptaura",
    verifiedAt: "2026-10-01T19:55:00.000Z",
    country: "FR",
    shippingUrl: "https://www.peptaura.com/shipping?country=FR",
    productLinks: [{
      peptide: "Retatrutide",
      url: "https://www.peptaura.com/product/retatrutide-10mg",
    }],
  },
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

test("keeps an incomplete manual report linked but raises an action-required incident", () => {
  const incident = evaluatePeptidesFulfillmentInvariant({
    paidAt: "2026-10-01T18:00:00.000Z",
    reportId: "manual-report-1",
    report: { qualityVersion: "medical-review-v1", peptides: [{ name: "A" }] },
    deliveryAccepted: false,
    deliveryHeld: true,
    manualFulfillment: true,
    recipientUnsubscribed: false,
    scheduledAt: "2026-10-01T19:00:00.000Z",
    now,
  });
  assert.equal(incident?.code, "MANUAL_INCOMPLETE_REPORT");
  assert.equal(incident?.blocksDelivery, true);
});

test("keeps a source-complete expert review linked but never treats it as paid fulfillment", () => {
  const incident = evaluatePeptidesFulfillmentInvariant({
    paidAt: "2026-10-01T18:00:00.000Z",
    reportId: "dalil-report",
    report: expertReviewWithSource,
    deliveryAccepted: false,
    deliveryHeld: true,
    manualFulfillment: true,
    recipientUnsubscribed: false,
    scheduledAt: "2026-10-01T19:00:00.000Z",
    now,
  });
  assert.equal(incident?.code, "MANUAL_INCOMPLETE_REPORT");
  assert.equal(incident?.blocksDelivery, true);
});

test("self-declared remediation never makes an expert review complete paid fulfillment", () => {
  for (const report of [
    expertReviewWithSource,
    {
      ...expertReviewWithSource,
      peptides: expertReviewWithSource.peptides.map((peptide) => ({ ...peptide, purchaseUrl: "" })),
    },
    {
      ...expertReviewWithSource,
      _customerRemediation: { ...expertReviewWithSource._customerRemediation, purchaseLinks: false },
    },
    {
      ...expertReviewWithSource,
      _sourceAccess: { ...expertReviewWithSource._sourceAccess, productLinks: [] },
    },
  ]) {
    const incident = evaluatePeptidesFulfillmentInvariant({
      paidAt: "2026-10-01T18:00:00.000Z",
      reportId: "dalil-report",
      report,
      deliveryAccepted: false,
      deliveryHeld: true,
      manualFulfillment: true,
      recipientUnsubscribed: false,
      scheduledAt: "2026-10-01T19:00:00.000Z",
      now,
    });
    assert.equal(incident?.code, "MANUAL_INCOMPLETE_REPORT");
    assert.equal(incident?.blocksDelivery, true);
  }
});

test("accepts a complete active single-axis report without forcing a filler molecule", () => {
  assert.equal(evaluatePeptidesFulfillmentInvariant({
    paidAt: "2026-10-01T18:00:00.000Z",
    reportId: "single-axis-report",
    report: validReport,
    deliveryAccepted: false,
    deliveryHeld: true,
    manualFulfillment: false,
    recipientUnsubscribed: false,
    scheduledAt: "2026-10-01T19:00:00.000Z",
    now,
  }), null);
});

test("blocks an active report when its source, operational fields or shopping list are incomplete", () => {
  const missingOperationalFields = [
    "route",
    "dosage",
    "timing",
    "purpose",
    "reconstitution",
    "vialsNeeded",
    "priceEstimate",
    "cycleDuration",
    "whyThisPeptide",
  ] as const;
  for (const report of [
    {
      ...validReport,
      peptides: validReport.peptides.map((peptide) => ({ ...peptide, purchaseUrl: "" })),
    },
    { ...validReport, shoppingList: "" },
    {
      ...validReport,
      peptides: validReport.peptides.map((peptide) => ({
        ...peptide,
        purchaseUrl: "https://unapproved.example/product/bpc-157",
      })),
    },
    ...missingOperationalFields.map((field) => ({
      ...validReport,
      peptides: validReport.peptides.map((peptide) => ({ ...peptide, [field]: "" })),
    })),
  ]) {
    const incident = evaluatePeptidesFulfillmentInvariant({
      paidAt: "2026-10-01T18:00:00.000Z",
      reportId: "single-axis-report",
      report,
      deliveryAccepted: false,
      deliveryHeld: true,
      manualFulfillment: true,
      recipientUnsubscribed: false,
      scheduledAt: "2026-10-01T19:00:00.000Z",
      now,
    });
    assert.equal(incident?.code, "MANUAL_INCOMPLETE_REPORT");
    assert.equal(incident?.blocksDelivery, true);
  }
});

test("accepts a complete active axis alongside empty conditional axes", () => {
  const report = {
    ...validReport,
    peptides: [
      ...validReport.peptides,
      {
        name: "Retatrutide",
        activationStatus: "conditional-inactive",
        purchaseUrl: "https://www.peptaura.com/catalog/Retatrutide",
        reconstitution: "",
        vialsNeeded: "",
        priceEstimate: "",
      },
    ],
  };
  assert.equal(evaluatePeptidesFulfillmentInvariant({
    paidAt: "2026-10-01T18:00:00.000Z",
    reportId: "mixed-report",
    report,
    deliveryAccepted: false,
    deliveryHeld: true,
    recipientUnsubscribed: false,
    scheduledAt: "2026-10-01T19:00:00.000Z",
    now,
  }), null);
});

test("never resolves a report whose every axis is conditional-inactive", () => {
  const report = {
    ...validReport,
    peptides: validReport.peptides.map((peptide) => ({
      ...peptide,
      activationStatus: "conditional-inactive",
      reconstitution: "",
      vialsNeeded: "",
      priceEstimate: "",
    })),
  };
  const incident = evaluatePeptidesFulfillmentInvariant({
    paidAt: "2026-10-01T18:00:00.000Z",
    reportId: "all-conditional-report",
    report,
    deliveryAccepted: false,
    deliveryHeld: true,
    manualFulfillment: true,
    recipientUnsubscribed: false,
    scheduledAt: "2026-10-01T19:00:00.000Z",
    now,
  });
  assert.equal(incident?.code, "MANUAL_INCOMPLETE_REPORT");
  assert.equal(incident?.blocksDelivery, true);
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

test("stale workers cannot detach a newly linked Peptides report", () => {
  const routes = readFileSync(new URL("./routes.ts", import.meta.url), "utf8");
  const storage = readFileSync(new URL("./storage.ts", import.meta.url), "utf8");
  assert.match(routes, /setOrderMetadataIfPeptidesReportMatches\([\s\S]*peptidesPreviousInvalidReportId:[\s\S]*peptidesReportId: ""/);
  assert.doesNotMatch(routes, /setOrderMetadataKey\(order\.id, "peptidesReportId", ""\)/);
  assert.match(storage, /COALESCE\(metadata->>'peptidesReportId', ''\) = \$3/);
});

test("every automatic report delivery uses a single-writer database claim", () => {
  const routes = readFileSync(new URL("./routes.ts", import.meta.url), "utf8");
  const autoGenStart = routes.indexOf("// Auto-recovery: generate missing peptides reports every 5 minutes");
  const autoSendStart = routes.indexOf("// Auto-send READY/SCHEDULED reports", autoGenStart);
  const autoGen = routes.slice(autoGenStart, autoSendStart);
  assert.match(autoGen, /claimPeptidesDelivery\(order\.id, recoveryReportId, recoveryClaimId\)/);
  assert.match(autoGen, /claimPeptidesDelivery\(order\.id, saved\.id, deliveryClaimId\)/);
  assert.match(autoGen, /finalizePeptidesDeliveryClaim\([\s\S]*"UNKNOWN"/);
});

test("orphan Peptides reports are neither retained nor accessible", () => {
  const routes = readFileSync(new URL("./routes.ts", import.meta.url), "utf8");
  assert.match(routes, /deleteBurnoutReport\(saved\.id\)/);
  assert.match(routes, /if \(activeReportIds\.size === 0\) return \[\]/);
  assert.match(routes, /A paid Peptides order proves entitlement[\s\S]*return false/);
});

test("cycle-2 reorder requires the linked unheld order and an accepted initial delivery", () => {
  const routes = readFileSync(new URL("./routes.ts", import.meta.url), "utf8");
  const start = routes.indexOf("// Peptides Engine , cycle 2 re-order email at J+60.");
  const end = routes.indexOf("// WhatsApp lead follow-up automation", start);
  const cron = routes.slice(start, end);
  assert.match(cron, /peptidesReportId \|\| ""\) === String\(report\.id\)/);
  assert.match(cron, /if \(linkedHeld \|\| linkedManual\) continue/);
  assert.match(cron, /hasAcceptedPeptidesDeliveryForReport\(linkedOrder, String\(report\.id\)\)/);
  assert.match(cron, /claimPeptidesAutomation\([\s\S]*peptidesCycle2ReorderClaimId/);
});

test("admin report relinking is compare-and-swap protected", () => {
  const routes = readFileSync(new URL("./routes.ts", import.meta.url), "utf8");
  const start = routes.indexOf('app.post("/api/admin/peptides-link-order-to-report"');
  const end = routes.indexOf("// Admin: correct a Peptides Engine typo email", start);
  const route = routes.slice(start, end);
  assert.match(route, /expectedCurrentReportId/);
  assert.match(route, /claimPeptidesReportSlotForManualReview/);
  assert.match(route, /replacePeptidesReportSlotIfMatches/);
  assert.match(route, /deliveryHold:\s*true/);
  assert.match(route, /manualFulfillment:\s*true/);
  assert.doesNotMatch(route, /updateOrder\(orderId/);
});
