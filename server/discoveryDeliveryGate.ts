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
  source: "narrative_sections" | "report_txt" | "narrative_txt" | "missing";
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
  if (Array.isArray(previousNarrative.sections)) {
    report = previousNarrative as Parameters<typeof validateDiscoveryReportForDelivery>[0];
    source = "narrative_sections";
  } else if (sourceTxt) {
    report = parseStoredDiscoveryTxt(sourceTxt);
    source = report ? (columnTxt ? "report_txt" : "narrative_txt") : "missing";
  }

  if (!report) {
    return {
      report: null,
      narrativeReport: previousNarrative,
      txt: sourceTxt,
      html: columnHtml || narrativeHtml,
      source,
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
  };
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
}): boolean {
  if (audit.type === "GRATUIT") return false;

  const gate = getPersistedDiscoveryDeliveryGate(
    audit.narrativeReport && typeof audit.narrativeReport === "object"
      ? audit.narrativeReport as Record<string, unknown>
      : null,
  );
  return gate?.retryable !== false;
}
