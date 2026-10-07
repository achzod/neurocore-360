import crypto from "crypto";

export type PeptidesReleaseHashGateReason =
  | "APPROVED_REPORT_HASH_MISSING"
  | "CURRENT_REPORT_HASH_MISMATCH"
  | "REFRESH_MUTATES_APPROVED_REPORT";

export interface PeptidesReleaseHashGateResult {
  ok: boolean;
  reason: PeptidesReleaseHashGateReason | null;
  approvedHash: string | null;
  currentHash: string;
  refreshedHash: string;
  currentContentHash: string;
  refreshedContentHash: string;
  persistRefreshed: boolean;
}

const VOLATILE_LIVE_SOURCE_KEYS = new Set([
  "catalogRefreshedAt",
  "fetchedAt",
  "sourceGeneratedAt",
  "syncedAt",
]);

function normalizeLiveTimestampProse(sectionId: unknown, content: unknown): unknown {
  if (typeof content !== "string" || !["guide-fournisseur", "shopping-list"].includes(String(sectionId))) {
    return content;
  }
  return content
    .replace(
      /(Le catalogue a ete recrawle le )[^.]+(\. Les pages produit et les prix selectionnes ont ete relus le )[^.]+(\.)/g,
      "$1<live-timestamp>$2<live-timestamp>$3",
    )
    .replace(
      /(Les offres ont ete relues le )[^.]+( et le crawl catalogue date du )[^.]+(\.)/g,
      "$1<live-timestamp>$2<live-timestamp>$3",
    );
}

function stableReportContent(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableReportContent);
  if (!value || typeof value !== "object") return value;
  const record = value as Record<string, unknown>;
  return Object.fromEntries(
    Object.entries(record)
      .filter(([key]) => !VOLATILE_LIVE_SOURCE_KEYS.has(key))
      .map(([key, nested]) => [
        key,
        stableReportContent(key === "content" ? normalizeLiveTimestampProse(record.id, nested) : nested),
      ]),
  );
}

export function hashPeptidesReport(report: unknown): string {
  return crypto.createHash("sha256").update(JSON.stringify(report)).digest("hex");
}

export function hashPeptidesReportContent(report: unknown): string {
  return hashPeptidesReport(stableReportContent(report));
}

export function isPeptidesApprovalExpected(input: {
  approvedAt?: unknown;
  approvedBy?: unknown;
  releaseAuthorizedAt?: unknown;
  hashGateApprovalRequired?: unknown;
  releaseVerdict?: unknown;
}): boolean {
  const releaseVerdict = String(input.releaseVerdict || "");
  return Boolean(
    input.approvedAt
    || input.approvedBy
    || input.releaseAuthorizedAt
    || input.hashGateApprovalRequired === true
    || String(input.hashGateApprovalRequired).toLowerCase() === "true"
    || /^(?:PASS\b|INVALIDATED_BY_LIVE_REFRESH$)/i.test(releaseVerdict)
  );
}

/**
 * An approved report is immutable. A live refresh may update source timestamps
 * in memory, but any substantive change blocks delivery and cannot overwrite
 * the approved artifact. Missing hash evidence also fails closed whenever
 * approval/release metadata says a hash should exist.
 */
export function evaluatePeptidesReleaseHashGate(input: {
  approvalExpected?: boolean;
  approvedHash?: string | null;
  currentReport: unknown;
  refreshedReport: unknown;
}): PeptidesReleaseHashGateResult {
  const approvedHash = String(input.approvedHash || "").trim().toLowerCase() || null;
  const currentHash = hashPeptidesReport(input.currentReport);
  const refreshedHash = hashPeptidesReport(input.refreshedReport);
  const currentContentHash = hashPeptidesReportContent(input.currentReport);
  const refreshedContentHash = hashPeptidesReportContent(input.refreshedReport);
  const base = {
    approvedHash,
    currentHash,
    refreshedHash,
    currentContentHash,
    refreshedContentHash,
  };

  if (!approvedHash && input.approvalExpected) {
    return {
      ...base,
      ok: false,
      reason: "APPROVED_REPORT_HASH_MISSING",
      persistRefreshed: false,
    };
  }
  if (!approvedHash) {
    return {
      ...base,
      ok: true,
      reason: null,
      persistRefreshed: refreshedHash !== currentHash,
    };
  }
  if (currentHash !== approvedHash) {
    return {
      ...base,
      ok: false,
      reason: "CURRENT_REPORT_HASH_MISMATCH",
      persistRefreshed: false,
    };
  }
  if (refreshedContentHash !== currentContentHash) {
    return {
      ...base,
      ok: false,
      reason: "REFRESH_MUTATES_APPROVED_REPORT",
      persistRefreshed: false,
    };
  }
  return {
    ...base,
    ok: true,
    reason: null,
    persistRefreshed: false,
  };
}
