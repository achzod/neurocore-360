import { hasPassingPersistedDiscoveryDeliveryGate } from "./discoveryDeliveryGate";
import { isDiscoverySupersededTerminal } from "./discoverySupersededPolicy";

export interface AuditAutomationCandidate {
  type?: string | null;
  auditType?: string | null;
  reportDeliveryStatus?: string | null;
  reportSentAt?: string | Date | null;
  narrativeReport?: unknown;
  createdAt?: string | Date | null;
}

/**
 * Transactional Discovery automation is intentionally stricter than the
 * generation and delivery feature flags. It is the durable cut-over boundary:
 * no audit created before the configured instant may be generated, recovered
 * or delivered by generic workers.
 */
export function isDiscoveryTransactionalAutomationEnabled(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return String(env.DISCOVERY_TRANSACTIONAL_AUTOMATION_ENABLED || "")
    .trim()
    .toLowerCase() === "true";
}

export function getDiscoveryAutomationStartAt(
  env: Record<string, string | undefined> = process.env,
): Date | null {
  const raw = String(env.DISCOVERY_AUTOMATION_START_AT || "").trim();
  if (!raw) return null;

  // The cut-over is a production safety boundary, not a user-facing date.
  // Accept only a complete UTC timestamp so a host timezone, a date-only
  // value or an explicit non-UTC offset can never move the boundary.
  const utcIsoPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;
  if (!utcIsoPattern.test(raw)) return null;
  const timestamp = Date.parse(raw);
  if (!Number.isFinite(timestamp)) return null;

  const parsed = new Date(timestamp);
  const canonicalInput = raw.includes(".") ? raw : raw.replace(/Z$/, ".000Z");
  return parsed.toISOString() === canonicalInput ? parsed : null;
}

export function isDiscoveryTransactionalAutomationEligible(
  audit: AuditAutomationCandidate,
  env: Record<string, string | undefined> = process.env,
): boolean {
  const type = audit.type || audit.auditType;
  if (type !== "GRATUIT" || !isDiscoveryTransactionalAutomationEnabled(env)) return false;
  const startAt = getDiscoveryAutomationStartAt(env);
  if (!startAt || !audit.createdAt) return false;
  const createdAt = new Date(audit.createdAt).getTime();
  return Number.isFinite(createdAt) && createdAt >= startAt.getTime();
}

export function assertDiscoveryTransactionalAutomationEligible(
  audit: AuditAutomationCandidate,
  env: Record<string, string | undefined> = process.env,
): void {
  if (!isDiscoveryTransactionalAutomationEligible(audit, env)) {
    throw new Error("DISCOVERY_TRANSACTIONAL_AUTOMATION_INELIGIBLE");
  }
}

/**
 * Generic admin/worker transitions are not the transactional batch path.
 * They must neither operate on legacy Discovery audits nor consume a report
 * that has been deliberately staged for the explicit batch delivery flow.
 */
export function getGenericDiscoveryMutationBlockReason(
  audit: AuditAutomationCandidate,
  env: Record<string, string | undefined> = process.env,
): string | null {
  const type = audit.type || audit.auditType;
  if (type !== "GRATUIT") return null;
  if (String(audit.reportDeliveryStatus || "") === "BATCH_READY") {
    return "DISCOVERY_BATCH_READY_REQUIRES_EXPLICIT_BATCH_FLOW";
  }
  if (!isDiscoveryTransactionalAutomationEligible(audit, env)) {
    return "DISCOVERY_TRANSACTIONAL_AUTOMATION_INELIGIBLE";
  }
  return "DISCOVERY_REQUIRES_TRANSACTIONAL_WORKFLOW";
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

/**
 * Unified Discovery generation is a separate, fail-closed switch. This lets us
 * deploy safety and persistence fixes while keeping every provider call off
 * until the new single-call engine has passed human validation.
 */
export function isDiscoveryUnifiedGenerationEnabled(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return String(env.DISCOVERY_UNIFIED_GENERATION_ENABLED || "").trim().toLowerCase() === "true";
}

export function assertDiscoveryUnifiedGenerationEnabled(
  env: Record<string, string | undefined> = process.env,
): void {
  if (!isDiscoveryUnifiedGenerationEnabled(env)) {
    throw new Error("DISCOVERY_UNIFIED_GENERATION_ENABLED is not true");
  }
}

/** Review/nurture automation may only follow a confirmed delivery. Discovery
 * additionally needs the persisted premium-AI gate from the exact report that
 * was delivered. SUPERSEDED and every non-terminal state fail closed. */
export function isAuditEligibleForPostDeliveryAutomation(
  audit: AuditAutomationCandidate,
): boolean {
  if (isDiscoverySupersededTerminal(audit)) return false;
  if (audit.reportDeliveryStatus !== "SENT" || !audit.reportSentAt) return false;
  const type = audit.type || audit.auditType;
  if (type !== "GRATUIT") return true;
  const narrative = audit.narrativeReport && typeof audit.narrativeReport === "object"
    ? audit.narrativeReport as Record<string, unknown>
    : null;
  return hasPassingPersistedDiscoveryDeliveryGate(narrative);
}
