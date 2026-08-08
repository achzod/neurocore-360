import assert from "node:assert/strict";
import test from "node:test";

import { validateDiscoveryReportForDelivery } from "./discovery-scan";
import {
  attachDiscoveryDeliveryGateResult,
  evaluateDiscoveryDeliveryGate,
  getPersistedDiscoveryDeliveryGate,
  hasPassingPersistedDiscoveryDeliveryGate,
  shouldAutoRegenerateNeedsReviewAudit,
} from "./discoveryDeliveryGate";

function validDiscoveryReport() {
  const clientName = "Nassim";
  return {
    clientName,
    generatedAt: "2026-08-08T12:00:00.000Z",
    globalScore: 7.2,
    auditType: "GRATUIT",
    metrics: Array.from({ length: 8 }, (_, index) => ({
      key: `domain_${index}`,
      label: `Domaine ${index}`,
      value: 6,
      max: 10,
    })),
    sections: Array.from({ length: 4 }, (_, index) => ({
      id: `section_${index}`,
      title: `Section ${index}`,
      content: `<p>${index === 0 ? `${clientName} ` : ""}${"contenu physiologique précis ".repeat(35)}</p>`,
    })),
  };
}

const validAssets = {
  txt: "T".repeat(1200),
  html: `<!doctype html><html><body>${"H".repeat(2100)}</body></html>`,
};

test("Discovery delivery accepts the real four-section contract", () => {
  const result = validateDiscoveryReportForDelivery(validDiscoveryReport(), validAssets);
  assert.deepEqual(result, { ok: true, errors: [] });
});

test("Discovery delivery still fails a real content error", () => {
  const report = validDiscoveryReport();
  report.metrics[2].value = 12;
  const result = validateDiscoveryReportForDelivery(report, validAssets);
  assert.equal(result.ok, false);
  assert.ok(result.errors.includes("metric_value:domain_2"));
});

test("delivery gate persists exact errors without hiding the quality score", () => {
  const report = validDiscoveryReport();
  report.metrics = [];
  const gate = evaluateDiscoveryDeliveryGate(report, validAssets, new Date("2026-08-08T12:05:00.000Z"));
  const persisted = attachDiscoveryDeliveryGateResult(
    { ...report, validationResult: { score: 100, isValid: true, errors: [] } },
    gate,
  );

  assert.equal((persisted.validationResult as any).score, 100);
  assert.deepEqual(getPersistedDiscoveryDeliveryGate(persisted)?.errors, ["metrics:0/8"]);
  assert.equal(hasPassingPersistedDiscoveryDeliveryGate(persisted), false);
});

test("deterministic Discovery failures are never auto-regenerated", () => {
  const gate = evaluateDiscoveryDeliveryGate(null, undefined, new Date("2026-08-08T12:05:00.000Z"));
  const narrativeReport = attachDiscoveryDeliveryGateResult({}, gate);
  assert.equal(shouldAutoRegenerateNeedsReviewAudit({ type: "GRATUIT", narrativeReport }), false);
});

test("rechecking the gate replaces its trace instead of duplicating it", () => {
  const first = evaluateDiscoveryDeliveryGate(validDiscoveryReport(), validAssets, new Date("2026-08-08T12:05:00.000Z"));
  const second = evaluateDiscoveryDeliveryGate(validDiscoveryReport(), validAssets, new Date("2026-08-08T12:06:00.000Z"));
  const once = attachDiscoveryDeliveryGateResult(validDiscoveryReport(), first);
  const twice = attachDiscoveryDeliveryGateResult(once, second);
  const validation = twice.validationResult as Record<string, unknown>;

  assert.deepEqual(Object.keys(validation), ["deliveryGate"]);
  assert.equal(getPersistedDiscoveryDeliveryGate(twice)?.checkedAt, "2026-08-08T12:06:00.000Z");
});
