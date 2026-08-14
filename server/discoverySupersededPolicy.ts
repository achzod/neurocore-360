export interface DiscoverySupersededCandidate {
  type?: string | null;
  auditType?: string | null;
  reportDeliveryStatus?: string | null;
  narrativeReport?: unknown;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object"
    ? value as Record<string, unknown>
    : null;
}

/**
 * A duplicate Discovery audit is terminal once either the status or its
 * durable recovery provenance says that it was superseded. Checking the
 * provenance as well as the status makes this fail closed if an older worker
 * has already corrupted SUPERSEDED back to NEEDS_REVIEW/READY/etc.
 */
export function isDiscoverySupersededTerminal(
  audit: DiscoverySupersededCandidate | null | undefined,
): boolean {
  if (!audit) return false;
  const type = audit.type || audit.auditType;
  if (type !== "GRATUIT") return false;
  if (String(audit.reportDeliveryStatus || "").toUpperCase() === "SUPERSEDED") {
    return true;
  }

  const narrative = asRecord(audit.narrativeReport);
  const recovery = asRecord(narrative?.recovery);
  if (!recovery) return false;
  if (String(recovery.disposition || "").toLowerCase() === "superseded") {
    return true;
  }
  return String(recovery.replacementAuditId || "").trim().length > 0;
}

/** Atomic PostgreSQL predicate used by the generic audit writer. */
export const DISCOVERY_SUPERSEDED_TERMINAL_SQL = `NOT (
  type = 'GRATUIT'
  AND (
    report_delivery_status = 'SUPERSEDED'
    OR LOWER(COALESCE(narrative_report->'recovery'->>'disposition', '')) = 'superseded'
    OR NULLIF(BTRIM(COALESCE(narrative_report->'recovery'->>'replacementAuditId', '')), '') IS NOT NULL
  )
)`;

/**
 * Alias-qualified inverse used when looking for a competing Discovery audit.
 * A deliberately superseded row must not keep its replacement permanently
 * classified as a duplicate, while status or durable provenance alone is
 * enough to keep the old row terminal after any later status corruption.
 */
export const DISCOVERY_OTHER_AUDIT_ACTIVE_SQL = `NOT (
  other.report_delivery_status = 'SUPERSEDED'
  OR LOWER(COALESCE(other.narrative_report->'recovery'->>'disposition', '')) = 'superseded'
  OR NULLIF(BTRIM(COALESCE(other.narrative_report->'recovery'->>'replacementAuditId', '')), '') IS NOT NULL
)`;
