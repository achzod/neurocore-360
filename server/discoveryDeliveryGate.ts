import {
  buildDiscoveryReportAssets,
  parseStoredDiscoveryTxt,
  validateDiscoveryReportForDelivery,
} from "./discovery-scan";

export const DISCOVERY_DELIVERY_GATE_VERSION = 2;

export interface DiscoveryDeliveryGateResult {
  name: "discovery_delivery";
  version: number;
  ok: boolean;
  errors: string[];
  checkedAt: string;
  retryable: false;
}

type NarrativeReport = Record<string, unknown> | null | undefined;

export interface DiscoveryArtifactSource {
  narrativeReport?: unknown;
  reportTxt?: unknown;
  reportHtml?: unknown;
}

export interface CanonicalDiscoveryArtifacts {
  report: Parameters<typeof validateDiscoveryReportForDelivery>[0] | null;
  narrativeReport: Record<string, unknown>;
  txt: string;
  html: string;
  source: "narrative_sections" | "report_txt" | "narrative_txt" | "legacy_validated_txt" | "missing";
  legacyValidation: { ok: boolean; errors: string[] } | null;
}

export function validateHistoricalDiscoveryArtifacts(
  txt: string,
  html: string,
  validationResult: unknown,
): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  const validation = validationResult && typeof validationResult === "object"
    ? validationResult as Record<string, any>
    : {};
  const details = validation.details && typeof validation.details === "object"
    ? validation.details as Record<string, any>
    : {};
  if (txt.length < 5000) errors.push(`legacy_txt:${txt.length}/5000`);
  if (html.length < 2000 || !/(<!doctype html|<html[\s>])/i.test(html)) {
    errors.push(`legacy_html:${html.length}/2000`);
  }
  if (validation.isValid !== true || validation.score !== 100) errors.push("legacy_validation_not_100");
  if (!Array.isArray(validation.errors) || validation.errors.length !== 0) errors.push("legacy_validation_errors");
  if (details.sectionsFound !== 4 || details.sectionsExpected !== 4) errors.push("legacy_sections_not_4_4");
  if (!Array.isArray(details.missingSections) || details.missingSections.length !== 0) errors.push("legacy_missing_sections");
  if (!Array.isArray(details.shortSections) || details.shortSections.length !== 0) errors.push("legacy_short_sections");
  if (details.hasCTA !== true || details.hasReviewSection !== true) errors.push("legacy_cta_or_review_missing");
  if (typeof details.totalChars !== "number" || Math.abs(details.totalChars - txt.length) > 512) {
    errors.push("legacy_length_mismatch");
  }

  const normalized = txt.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
  const requiredHeadings = [
    "INFOS IMPORTANTES",
    "EXECUTIVE SUMMARY",
    "ANALYSE ENERGIE ET RECUPERATION",
    "ANALYSE METABOLISME ET NUTRITION",
    "SYNTHESE ET PROCHAINES ETAPES",
  ];
  let previousIndex = -1;
  for (const heading of requiredHeadings) {
    const index = normalized.indexOf(heading);
    if (index <= previousIndex) errors.push(`legacy_heading:${heading.toLowerCase().replace(/ /g, "_")}`);
    previousIndex = index;
  }
  return { ok: errors.length === 0, errors };
}

export function resolveCanonicalDiscoveryArtifacts(
  audit: DiscoveryArtifactSource,
): CanonicalDiscoveryArtifacts {
  const previousNarrative =
    audit.narrativeReport && typeof audit.narrativeReport === "object"
      ? { ...(audit.narrativeReport as Record<string, unknown>) }
      : {};
  const columnTxt = String(audit.reportTxt || "").trim();
  const narrativeTxt = String(previousNarrative.txt || "").trim();
  const sourceTxt = columnTxt || narrativeTxt;
  const columnHtml = String(audit.reportHtml || "").trim();
  const narrativeHtml = String(previousNarrative.html || "").trim();

  let report: Parameters<typeof validateDiscoveryReportForDelivery>[0] | null = null;
  let source: CanonicalDiscoveryArtifacts["source"] = "missing";
  let legacyValidation: { ok: boolean; errors: string[] } | null = null;
  if (Array.isArray(previousNarrative.sections)) {
    report = previousNarrative as Parameters<typeof validateDiscoveryReportForDelivery>[0];
    source = "narrative_sections";
  } else if (sourceTxt) {
    report = parseStoredDiscoveryTxt(sourceTxt);
    source = report ? (columnTxt ? "report_txt" : "narrative_txt") : "missing";
    if (!report) {
      legacyValidation = validateHistoricalDiscoveryArtifacts(
        sourceTxt,
        columnHtml || narrativeHtml,
        previousNarrative.validationResult,
      );
      if (legacyValidation.ok) source = "legacy_validated_txt";
    }
  }

  if (!report) {
    return {
      report: null,
      narrativeReport: legacyValidation?.ok
        ? { ...previousNarrative, txt: sourceTxt, html: columnHtml || narrativeHtml }
        : previousNarrative,
      txt: sourceTxt,
      html: columnHtml || narrativeHtml,
      source,
      legacyValidation,
    };
  }

  const generated = buildDiscoveryReportAssets(report as any);
  // Existing non-empty artifacts are canonical. Deterministic generation only
  // hydrates a missing sibling and never replaces the sole valid stored copy.
  const txt = sourceTxt || generated.txt;
  const html = columnHtml || narrativeHtml || generated.html;
  return {
    report,
    narrativeReport: {
      ...previousNarrative,
      ...report,
      txt,
      html,
    },
    txt,
    html,
    source,
    legacyValidation: null,
  };
}

export function evaluateCanonicalDiscoveryArtifacts(
  canonical: CanonicalDiscoveryArtifacts,
  checkedAt?: Date,
): DiscoveryDeliveryGateResult {
  if (canonical.report) {
    return evaluateDiscoveryDeliveryGate(
      canonical.report,
      { txt: canonical.txt, html: canonical.html },
      checkedAt,
    );
  }
  if (canonical.legacyValidation?.ok) {
    return createDiscoveryDeliveryGateResult(canonical.legacyValidation, checkedAt);
  }
  return createDiscoveryDeliveryGateResult(
    canonical.legacyValidation || { ok: false, errors: ["report_missing"] },
    checkedAt,
  );
}

export function createDiscoveryDeliveryGateResult(
  check: { ok: boolean; errors: string[] },
  checkedAt: Date = new Date(),
): DiscoveryDeliveryGateResult {
  return {
    name: "discovery_delivery",
    version: DISCOVERY_DELIVERY_GATE_VERSION,
    ok: check.ok,
    errors: [...check.errors],
    checkedAt: checkedAt.toISOString(),
    // All current Discovery delivery checks inspect persisted deterministic
    // content. Re-running the same generator without a code or input change
    // cannot repair a gate contradiction and must not loop automatically.
    retryable: false,
  };
}

export function evaluateDiscoveryDeliveryGate(
  report: Parameters<typeof validateDiscoveryReportForDelivery>[0],
  assets?: Parameters<typeof validateDiscoveryReportForDelivery>[1],
  checkedAt?: Date,
): DiscoveryDeliveryGateResult {
  if (!report) {
    return createDiscoveryDeliveryGateResult(
      { ok: false, errors: ["report_missing"] },
      checkedAt,
    );
  }

  return createDiscoveryDeliveryGateResult(
    validateDiscoveryReportForDelivery(report, assets),
    checkedAt,
  );
}

export function attachDiscoveryDeliveryGateResult(
  narrativeReport: NarrativeReport,
  gate: DiscoveryDeliveryGateResult,
): Record<string, unknown> {
  const report = narrativeReport && typeof narrativeReport === "object"
    ? { ...narrativeReport }
    : {};
  const currentValidation =
    report.validationResult && typeof report.validationResult === "object"
      ? { ...(report.validationResult as Record<string, unknown>) }
      : {};

  return {
    ...report,
    validationResult: {
      ...currentValidation,
      deliveryGate: gate,
    },
  };
}

export function getPersistedDiscoveryDeliveryGate(
  narrativeReport: NarrativeReport,
): DiscoveryDeliveryGateResult | null {
  const validationResult = narrativeReport?.validationResult;
  if (!validationResult || typeof validationResult !== "object") return null;
  const gate = (validationResult as Record<string, unknown>).deliveryGate;
  if (!gate || typeof gate !== "object") return null;

  const candidate = gate as Partial<DiscoveryDeliveryGateResult>;
  if (
    candidate.name !== "discovery_delivery" ||
    candidate.version !== DISCOVERY_DELIVERY_GATE_VERSION ||
    typeof candidate.ok !== "boolean" ||
    !Array.isArray(candidate.errors) ||
    typeof candidate.checkedAt !== "string" ||
    candidate.retryable !== false
  ) {
    return null;
  }
  return candidate as DiscoveryDeliveryGateResult;
}

export function hasPassingPersistedDiscoveryDeliveryGate(
  narrativeReport: NarrativeReport,
): boolean {
  const gate = getPersistedDiscoveryDeliveryGate(narrativeReport);
  return Boolean(gate?.ok && gate.errors.length === 0);
}

export function shouldAutoRegenerateNeedsReviewAudit(audit: {
  type?: string | null;
  narrativeReport?: unknown;
}, options?: {
  operationalFailure?: boolean;
}): boolean {
  // Operational failures happen before the deterministic delivery gate. They
  // remain retryable for every tier, including Discovery, once the provider is
  // healthy again. A persisted gate failure stays non-retryable below.
  if (options?.operationalFailure) return true;
  if (audit.type === "GRATUIT") return false;

  const gate = getPersistedDiscoveryDeliveryGate(
    audit.narrativeReport && typeof audit.narrativeReport === "object"
      ? audit.narrativeReport as Record<string, unknown>
      : null,
  );
  return gate?.retryable !== false;
}
