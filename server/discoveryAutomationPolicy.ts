import { hasPassingPersistedDiscoveryDeliveryGate } from "./discoveryDeliveryGate";

export interface AuditAutomationCandidate {
  type?: string | null;
  auditType?: string | null;
  reportDeliveryStatus?: string | null;
  reportSentAt?: string | Date | null;
  narrativeReport?: unknown;
}

/**
 * Emergency delivery switch. It deliberately defaults to OFF: a deployment
 * without the explicit production opt-in can generate and queue reports, but
 * cannot contact SendPulse.
 */
export function isDiscoveryReportDeliveryEnabled(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return String(env.DISCOVERY_REPORT_DELIVERY_ENABLED || "").trim().toLowerCase() === "true";
}

/** Review/nurture automation may only follow a confirmed delivery. Discovery
 * additionally needs the persisted premium-AI gate from the exact report that
 * was delivered. SUPERSEDED and every non-terminal state fail closed. */
export function isAuditEligibleForPostDeliveryAutomation(
  audit: AuditAutomationCandidate,
): boolean {
  if (audit.reportDeliveryStatus !== "SENT" || !audit.reportSentAt) return false;
  const type = audit.type || audit.auditType;
  if (type !== "GRATUIT") return true;
  const narrative = audit.narrativeReport && typeof audit.narrativeReport === "object"
    ? audit.narrativeReport as Record<string, unknown>
    : null;
  return hasPassingPersistedDiscoveryDeliveryGate(narrative);
}
