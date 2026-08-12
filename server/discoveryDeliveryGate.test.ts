import assert from "node:assert/strict";
import test from "node:test";

import { buildDiscoveryReportAssets, validateDiscoveryReportForDelivery } from "./discovery-scan";
import {
  attachDiscoveryDeliveryGateResult,
  evaluateCanonicalDiscoveryArtifacts,
  evaluateDiscoveryDeliveryGate,
  getPersistedDiscoveryDeliveryGate,
  hasPassingPersistedDiscoveryDeliveryGate,
  resolveCanonicalDiscoveryArtifacts,
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
    generationQuality: {
      mode: "premium_ai" as const,
      version: 1 as const,
      provider: "openai" as const,
      synthesis: "ai_validated" as const,
      validatedDomains: ["digestion", "energie", "lifestyle", "mindset", "nutrition", "sommeil", "stress", "training"],
      fallbackUsed: false as const,
      safety: {
        version: 1 as const,
        tcaMode: "none" as const,
        bodyCheckingSignal: false,
        strictEatingSafety: false,
        gatePassed: true as const,
      },
    },
    sections: ["intro", "global", "sommeil", "stress", "energie", "digestion", "training", "nutrition", "lifestyle", "mindset", "scans", "coaching"].map((id, index) => ({
      id,
      title: `Section ${index}`,
      content: `<p>${index === 0 ? `${clientName} ` : ""}${"contenu physiologique précis et personnalisé. ".repeat(72)}</p>`,
    })),
  };
}

const validAssets = {
  txt: "T".repeat(40_000),
  html: `<!doctype html><html><body>${"H".repeat(40_000)}</body></html>`,
};

test("Discovery delivery accepts a complete premium AI contract", () => {
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

test("Discovery delivery rejects templated reports without premium AI evidence", () => {
  const report = validDiscoveryReport();
  delete (report as any).generationQuality;
  const result = validateDiscoveryReportForDelivery(report, validAssets);
  assert.equal(result.ok, false);
  assert.ok(result.errors.includes("premium_ai_evidence_missing"));
});

test("Discovery delivery rejects a premium report without deterministic safety evidence", () => {
  const report = validDiscoveryReport();
  delete (report.generationQuality as any).safety;
  const result = validateDiscoveryReportForDelivery(report, validAssets);
  assert.equal(result.ok, false);
  assert.ok(result.errors.includes("safety_evidence_missing"));
});

test("Discovery delivery rejects forbidden TCA tracking anywhere in the report", () => {
  const report = validDiscoveryReport();
  report.generationQuality.safety = {
    version: 1,
    tcaMode: "history",
    bodyCheckingSignal: true,
    strictEatingSafety: true,
    gatePassed: true,
  };
  report.sections.find((section) => section.id === "nutrition")!.content += "<p>Vise 2 400 kcal puis prends des photos de progression.</p>";
  const result = validateDiscoveryReportForDelivery(report, validAssets);
  assert.equal(result.ok, false);
  assert.ok(result.errors.includes("safety:tca_calorie_target"));
  assert.ok(result.errors.includes("safety:tca_progress_photos"));
});

test("Discovery delivery rejects one short AI domain even when totals are large", () => {
  const report = validDiscoveryReport();
  const energy = report.sections.find((section) => section.id === "energie")!;
  energy.content = "<p>court</p>";
  const result = validateDiscoveryReportForDelivery(report, validAssets);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.startsWith("premium_section:energie:")));
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

test("operational provider recovery can regenerate a Discovery audit", () => {
  assert.equal(
    shouldAutoRegenerateNeedsReviewAudit(
      { type: "GRATUIT", narrativeReport: null },
      { operationalFailure: true },
    ),
    true,
  );
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

test("recovery preserves canonical premium artifacts for the three storage shapes", () => {
  const report = validDiscoveryReport();
  const assets = buildDiscoveryReportAssets(report as any);
  const fixtures = [
    {
      auditId: "409c90ce",
      input: {
        narrativeReport: { validationResult: { score: 100 } },
        reportTxt: assets.txt,
        reportHtml: assets.html,
      },
    },
    {
      auditId: "6d186e76",
      input: {
        narrativeReport: { txt: assets.txt, html: assets.html, validationResult: { score: 100 } },
      },
    },
    {
      auditId: "d4466162",
      input: {
        narrativeReport: { ...report, txt: assets.txt, html: assets.html, validationResult: { score: 100 } },
      },
    },
  ];

  for (const fixture of fixtures) {
    const canonical = resolveCanonicalDiscoveryArtifacts(fixture.input);
    assert.ok(canonical.report, `${fixture.auditId}: report must be recoverable`);
    assert.equal((canonical.report as any).sections.length, 12, `${fixture.auditId}: sections`);
    assert.equal(canonical.narrativeReport.txt, canonical.txt, `${fixture.auditId}: narrative txt`);
    assert.equal(canonical.narrativeReport.html, canonical.html, `${fixture.auditId}: narrative html`);
    assert.equal(
      evaluateDiscoveryDeliveryGate(canonical.report, { txt: canonical.txt, html: canonical.html }).ok,
      true,
      `${fixture.auditId}: exact gate`,
    );
  }
  assert.equal(resolveCanonicalDiscoveryArtifacts(fixtures[0].input).txt, assets.txt);
  assert.equal(resolveCanonicalDiscoveryArtifacts(fixtures[1].input).html, assets.html);
});

test("recovery cannot deliver when no valid artifact exists", () => {
  const canonical = resolveCanonicalDiscoveryArtifacts({
    narrativeReport: { validationResult: { score: 100 } },
  });
  const gate = evaluateCanonicalDiscoveryArtifacts(canonical);

  assert.equal(canonical.report, null);
  assert.equal(gate.ok, false);
  assert.deepEqual(gate.errors, ["report_missing"]);
});

test("historical structural artifacts remain readable but cannot be delivered as premium AI", () => {
  for (const auditId of ["409c90ce", "6d186e76", "d4466162"]) {
    const txt = [
      "INFOS IMPORTANTES",
      "Texte anonyme ".repeat(90),
      "EXECUTIVE SUMMARY",
      "Analyse anonyme ".repeat(90),
      "ANALYSE ENERGIE ET RECUPERATION",
      "Analyse anonyme ".repeat(90),
      "ANALYSE METABOLISME ET NUTRITION",
      "Analyse anonyme ".repeat(90),
      "SYNTHESE ET PROCHAINES ETAPES",
      "Conclusion anonyme ".repeat(90),
    ].join("\n");
    const html = `<!doctype html><html><body>${"contenu anonyme ".repeat(180)}</body></html>`;
    const validationResult = {
      score: 100,
      isValid: true,
      errors: [],
      warnings: [],
      details: {
        hasCTA: true,
        totalChars: txt.length,
        sectionsFound: 4,
        shortSections: [],
        missingSections: [],
        hasReviewSection: true,
        sectionsExpected: 4,
      },
    };
    const canonical = resolveCanonicalDiscoveryArtifacts({
      reportTxt: txt,
      reportHtml: html,
      narrativeReport: { validationResult },
    });
    assert.equal(canonical.source, "legacy_validated_txt", auditId);
    assert.equal(evaluateCanonicalDiscoveryArtifacts(canonical).ok, false, auditId);
    assert.deepEqual(evaluateCanonicalDiscoveryArtifacts(canonical).errors, ["premium_ai_evidence_missing"], auditId);
    assert.equal(canonical.narrativeReport.txt, txt.trim(), auditId);
    assert.equal(canonical.narrativeReport.html, html, auditId);
  }
});
