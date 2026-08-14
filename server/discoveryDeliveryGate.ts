import { createHash } from "node:crypto";
import type { Pool, PoolClient } from "pg";

import {
  buildDiscoveryReportAssets,
  parseStoredDiscoveryTxt,
  validateDiscoveryReportAgainstResponses,
  validateDiscoveryReportForDelivery,
} from "./discovery-scan";

export const DISCOVERY_DELIVERY_GATE_VERSION = 4;

export interface DiscoveryDeliveryGateResult {
  name: "discovery_delivery";
  version: number;
  ok: boolean;
  errors: string[];
  checkedAt: string;
  retryable: false;
}

type NarrativeReport = Record<string, unknown> | null | undefined;
type Queryable = Pick<Pool | PoolClient, "query">;

const CATALOG_PROVENANCE_KEYS = [
  "catalogSha256",
  "catalogVersion",
  "editorialSourceSha256",
  "providerResponseId",
  "selection",
  "selectionSha256",
] as const;

/** Canonical durable representation shared by persistence and public exposure. */
export function normalizeDiscoveryCatalogProvenanceForLedger(
  raw: unknown,
): Record<string, unknown> | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const candidate = raw as Record<string, unknown>;
  if (Object.keys(candidate).sort().join(",") !== [...CATALOG_PROVENANCE_KEYS].sort().join(",")) {
    return null;
  }
  for (const key of ["catalogSha256", "editorialSourceSha256", "selectionSha256"] as const) {
    if (!/^[a-f0-9]{64}$/.test(String(candidate[key] || ""))) return null;
  }
  if (!String(candidate.catalogVersion || "").trim()
    || !String(candidate.providerResponseId || "").trim()
    || !candidate.selection || typeof candidate.selection !== "object"
    || Array.isArray(candidate.selection)) return null;
  return Object.fromEntries(CATALOG_PROVENANCE_KEYS.map((key) => [key, candidate[key]]));
}

export interface DiscoveryCatalogExposureArtifact {
  id?: unknown;
  batchId?: unknown;
  model?: unknown;
  txt?: unknown;
  html?: unknown;
  contentSha256?: unknown;
}

/**
 * Proves that the exact public artifact is owned by exactly one completed
 * provider ledger. Batch artifacts additionally require their STORED item,
 * terminal batch and the complete catalogue provenance captured at storage.
 */
export async function hasDiscoveryCatalogLedgerBinding(
  db: Queryable,
  auditId: unknown,
  artifact: DiscoveryCatalogExposureArtifact,
  rawProvenance: unknown,
): Promise<boolean> {
  const provenance = normalizeDiscoveryCatalogProvenanceForLedger(rawProvenance);
  const id = String(artifact.id || "").trim();
  const model = String(artifact.model || "").trim();
  const txt = String(artifact.txt || "");
  const html = String(artifact.html || "");
  const contentSha256 = String(artifact.contentSha256 || "").trim();
  const expectedContentSha256 = createHash("sha256")
    .update(`txt\0${txt}\0html\0${html}`)
    .digest("hex");
  if (!provenance || !id || !String(auditId || "").trim() || !model
    || contentSha256 !== expectedContentSha256) return false;
  const responseId = String(provenance.providerResponseId);
  const provenanceJson = JSON.stringify(provenance);
  const result = await db.query(
    `SELECT COUNT(*)::int AS match_count
       FROM (
         SELECT a.id
           FROM report_artifacts a
           JOIN discovery_batch_runs b ON b.id=a.batch_id
           JOIN discovery_batch_items i
             ON i.artifact_id=a.id AND i.audit_id=a.audit_id AND i.batch_id=a.batch_id
           JOIN ai_cost_budget_reservations r
             ON r.id=i.provider_reservation_id AND r.order_id=i.audit_id
            AND r.product='discovery' AND r.profile='discovery'
            AND r.status='COMPLETED' AND r.response_id=i.provider_response_id
           JOIN ai_usage_events e
             ON e.id=i.provider_usage_event_id AND e.response_id=i.provider_response_id
            AND e.profile='discovery' AND e.status='completed'
          WHERE a.id=$2 AND a.audit_id=$1 AND a.batch_id=$3::uuid
            AND a.artifact_state='ACTIVE'
            AND a.content_sha256=$4 AND a.model=$5
            AND b.stage IN ('GENERATION','REGENERATION') AND b.status='COMPLETED'
            AND i.state='STORED' AND i.provider_calls=1
            AND i.provider_response_id=$6
            AND i.error_code='DISCOVERY_CATALOG_PROVENANCE'
            AND i.error_detail::jsonb=$7::jsonb
            AND i.generated_txt_sha256=encode(digest(a.txt,'sha256'),'hex')
            AND i.generated_html_sha256=encode(digest(a.html,'sha256'),'hex')
            AND r.created_at>=i.provider_started_at AND e.created_at>=i.provider_started_at
            AND e.input_tokens=i.input_tokens AND e.output_tokens=i.output_tokens
            AND e.total_tokens=i.total_tokens
            AND e.total_tokens=e.input_tokens+e.output_tokens
            AND ABS(r.actual_cost_usd-i.actual_cost_usd)<=0.000001
            AND ABS(e.estimated_openai_cost_usd-i.actual_cost_usd)<=0.000001
            AND e.model=a.model
         UNION ALL
         SELECT a.id
           FROM report_artifacts a
           JOIN ai_cost_budget_reservations r
             ON r.order_id=a.audit_id AND r.product='discovery' AND r.profile='discovery'
            AND r.status='COMPLETED' AND r.response_id=$6
           JOIN ai_usage_events e
             ON e.response_id=r.response_id AND e.profile='discovery' AND e.status='completed'
          WHERE a.id=$2 AND a.audit_id=$1 AND a.batch_id IS NULL
            AND a.artifact_state='ACTIVE'
            AND a.content_sha256=$4 AND a.model=$5
            AND r.detail::jsonb=$7::jsonb
            AND e.model=a.model
            AND e.total_tokens=e.input_tokens+e.output_tokens
            AND ABS(r.actual_cost_usd-e.estimated_openai_cost_usd)<=0.000001
       ) exact_binding`,
    [String(auditId), id, artifact.batchId || null, contentSha256, model, responseId, provenanceJson],
  );
  return Number(result.rows[0]?.match_count || 0) === 1;
}

export interface DiscoveryArtifactSource {
  narrativeReport?: unknown;
  reportTxt?: unknown;
  reportHtml?: unknown;
  /** Exact immutable artifact rows loaded from report_artifacts. Public
   * exposure requires one and only one row matching the deterministic assets. */
  reportArtifacts?: ReadonlyArray<{
    txt?: unknown;
    html?: unknown;
    contentSha256?: unknown;
  }>;
}

export interface DiscoveryPublicExposureSource extends DiscoveryArtifactSource {
  type?: unknown;
  reportDeliveryStatus?: unknown;
  responses?: unknown;
  /** Durable provider/ledger ownership proof loaded from PostgreSQL.  New
   * catalogue reports remain private unless their exact artifact and
   * response provenance are bound to one completed provider ledger row. */
  catalogLedgerBound?: boolean;
}

/** A QA hold (BATCH_READY/BATCH_REVIEW) is never a public report. */
export function canExposeDiscoveryReport(source: DiscoveryPublicExposureSource): boolean {
  if (String(source.type || "") !== "GRATUIT") return true;
  if (!["READY", "SENT"].includes(String(source.reportDeliveryStatus || "").toUpperCase())) return false;
  const canonical = resolveCanonicalDiscoveryArtifacts(source);
  if (!canonical.report || !source.responses || typeof source.responses !== "object") return false;
  if (canonical.report.generationQuality?.version === 2 && source.catalogLedgerBound !== true) return false;
  return evaluateCanonicalDiscoveryArtifacts(canonical).ok
    && hasPassingPersistedDiscoveryDeliveryGate(source.narrativeReport as NarrativeReport)
    && validateDiscoveryReportAgainstResponses(
      canonical.report,
      source.responses as Record<string, unknown>,
      canonical.report.analysisMetadata,
    ).ok;
}

export interface CanonicalDiscoveryArtifacts {
  report: Parameters<typeof validateDiscoveryReportForDelivery>[0] | null;
  narrativeReport: Record<string, unknown>;
  txt: string;
  html: string;
  source: "narrative_sections" | "report_txt" | "narrative_txt" | "legacy_validated_txt" | "missing";
  legacyValidation: { ok: boolean; errors: string[] } | null;
  exactnessErrors: string[];
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
      exactnessErrors: [],
    };
  }

  const generated = buildDiscoveryReportAssets(report as any);
  const exactnessErrors: string[] = [];
  if (!columnTxt) exactnessErrors.push("stored_report_txt_missing");
  else if (columnTxt !== generated.txt) exactnessErrors.push("stored_report_txt_mismatch");
  if (!columnHtml) exactnessErrors.push("stored_report_html_missing");
  else if (columnHtml !== generated.html) exactnessErrors.push("stored_report_html_mismatch");
  if (narrativeTxt && narrativeTxt !== generated.txt) exactnessErrors.push("narrative_report_txt_mismatch");
  if (narrativeHtml && narrativeHtml !== generated.html) exactnessErrors.push("narrative_report_html_mismatch");

  const artifacts = Array.isArray(audit.reportArtifacts) ? audit.reportArtifacts : [];
  if (artifacts.length !== 1) {
    exactnessErrors.push(`report_artifact_count:${artifacts.length}/1`);
  } else {
    const artifactTxt = String(artifacts[0]?.txt || "");
    const artifactHtml = String(artifacts[0]?.html || "");
    const artifactContentSha256 = String(artifacts[0]?.contentSha256 || "");
    const expectedContentSha256 = createHash("sha256")
      .update(`txt\0${generated.txt}\0html\0${generated.html}`)
      .digest("hex");
    if (artifactTxt !== generated.txt) exactnessErrors.push("report_artifact_txt_mismatch");
    if (artifactHtml !== generated.html) exactnessErrors.push("report_artifact_html_mismatch");
    if (artifactContentSha256 !== expectedContentSha256) {
      exactnessErrors.push("report_artifact_content_hash_mismatch");
    }
  }

  const txt = generated.txt;
  const html = generated.html;
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
    exactnessErrors: [...new Set(exactnessErrors)],
  };
}

export function evaluateCanonicalDiscoveryArtifacts(
  canonical: CanonicalDiscoveryArtifacts,
  checkedAt?: Date,
): DiscoveryDeliveryGateResult {
  if (canonical.exactnessErrors.length > 0) {
    return createDiscoveryDeliveryGateResult(
      { ok: false, errors: canonical.exactnessErrors },
      checkedAt,
    );
  }
  if (canonical.report) {
    return evaluateDiscoveryDeliveryGate(
      canonical.report,
      { txt: canonical.txt, html: canonical.html },
      checkedAt,
    );
  }
  if (canonical.legacyValidation?.ok) {
    // Historical structural validation cannot prove that OpenAI generated all
    // premium sections. It remains readable but is never deliverable as a new
    // premium Discovery report.
    return createDiscoveryDeliveryGateResult(
      { ok: false, errors: ["premium_ai_evidence_missing"] },
      checkedAt,
    );
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
  nonRenderedMetadata?: Parameters<typeof validateDiscoveryReportForDelivery>[2],
): DiscoveryDeliveryGateResult {
  if (!report) {
    return createDiscoveryDeliveryGateResult(
      { ok: false, errors: ["report_missing"] },
      checkedAt,
    );
  }

  return createDiscoveryDeliveryGateResult(
    validateDiscoveryReportForDelivery(report, assets, nonRenderedMetadata),
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
