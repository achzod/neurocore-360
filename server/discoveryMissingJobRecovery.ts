import { isDiscoverySupersededTerminal } from "./discoverySupersededPolicy";
import { isDiscoveryTransactionalAutomationEligible } from "./discoveryAutomationPolicy";

export const DISCOVERY_RECOVERY_VERSION = 1;
export const RECENT_DISCOVERY_HOLD_DAYS = 14;

export type DiscoveryRecoveryDecision =
  | { action: "enqueue"; reason: "missing_job_and_artifacts" }
  | {
      action: "supersede";
      reason: "newer_duplicate" | "recent_discovery_already_active_or_delivered";
      replacementAuditId: string;
    }
  | {
      action: "skip";
      reason:
        | "not_discovery_needs_review"
        | "outside_transactional_automation_window"
        | "superseded_terminal"
        | "already_sent"
        | "artifacts_present"
        | "job_present";
    };

export interface DiscoveryRecoveryAudit {
  id: string;
  email: string;
  type: string;
  reportDeliveryStatus: string;
  reportSentAt?: string | Date | null;
  createdAt: string | Date;
  narrativeReport?: unknown;
  reportTxt?: string;
  reportHtml?: string;
}

function normalizedEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function hasDiscoveryArtifacts(audit: DiscoveryRecoveryAudit): boolean {
  if (String(audit.reportTxt || "").trim() || String(audit.reportHtml || "").trim()) {
    return true;
  }
  const narrative = audit.narrativeReport;
  if (!narrative || typeof narrative !== "object") return false;
  const record = narrative as Record<string, unknown>;
  return (
    Array.isArray(record.sections) ||
    String(record.txt || "").trim().length > 0 ||
    String(record.html || "").trim().length > 0
  );
}

function isActiveOrDelivered(audit: DiscoveryRecoveryAudit): boolean {
  if (audit.reportSentAt) return true;
  if (hasDiscoveryArtifacts(audit)) return true;
  return ["GENERATING", "READY", "SCHEDULED", "SENDING", "SENT"].includes(
    String(audit.reportDeliveryStatus),
  );
}

export function decideMissingDiscoveryRecovery(input: {
  audit: DiscoveryRecoveryAudit;
  sameEmailAudits: DiscoveryRecoveryAudit[];
  hasJob: boolean;
  hasArtifactRow?: boolean;
  now?: Date;
  recentHoldDays?: number;
}): DiscoveryRecoveryDecision {
  const { audit } = input;
  if (isDiscoverySupersededTerminal(audit)) {
    return { action: "skip", reason: "superseded_terminal" };
  }
  if (audit.type !== "GRATUIT" || audit.reportDeliveryStatus !== "NEEDS_REVIEW") {
    return { action: "skip", reason: "not_discovery_needs_review" };
  }
  if (!isDiscoveryTransactionalAutomationEligible(audit)) {
    return { action: "skip", reason: "outside_transactional_automation_window" };
  }
  if (audit.reportSentAt) return { action: "skip", reason: "already_sent" };
  if (hasDiscoveryArtifacts(audit) || input.hasArtifactRow) {
    return { action: "skip", reason: "artifacts_present" };
  }
  if (input.hasJob) return { action: "skip", reason: "job_present" };

  const createdAt = new Date(audit.createdAt).getTime();
  const sameEmail = input.sameEmailAudits
    .filter((candidate) =>
      candidate.id !== audit.id &&
      candidate.type === "GRATUIT" &&
      normalizedEmail(candidate.email) === normalizedEmail(audit.email)
    )
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const newer = sameEmail.find((candidate) => new Date(candidate.createdAt).getTime() > createdAt);
  if (newer) {
    return {
      action: "supersede",
      reason: "newer_duplicate",
      replacementAuditId: newer.id,
    };
  }

  const holdDays = input.recentHoldDays ?? RECENT_DISCOVERY_HOLD_DAYS;
  const cutoff = createdAt - holdDays * 24 * 60 * 60 * 1000;
  const recentPrior = sameEmail.find((candidate) => {
    const candidateTime = new Date(candidate.createdAt).getTime();
    return candidateTime <= createdAt && candidateTime >= cutoff && isActiveOrDelivered(candidate);
  });
  if (recentPrior) {
    return {
      action: "supersede",
      reason: "recent_discovery_already_active_or_delivered",
      replacementAuditId: recentPrior.id,
    };
  }

  return { action: "enqueue", reason: "missing_job_and_artifacts" };
}

export interface MissingDiscoveryRecoveryDependencies {
  listNeedsReviewAudits(): Promise<DiscoveryRecoveryAudit[]>;
  listAuditSummaries(): Promise<DiscoveryRecoveryAudit[]>;
  hasReportJob(auditId: string): Promise<boolean>;
  hasReportArtifact(auditId: string): Promise<boolean>;
  enqueueMissingReportJob(auditId: string, reason: string): Promise<boolean>;
  markSuperseded(
    auditId: string,
    replacementAuditId: string,
    reason: "newer_duplicate" | "recent_discovery_already_active_or_delivered",
  ): Promise<boolean>;
  startEnqueuedJob(auditId: string): Promise<void>;
  log?(auditId: string, action: string, metadata: Record<string, unknown>): Promise<void>;
}

export interface MissingDiscoveryRecoveryStats {
  enqueued: number;
  superseded: number;
  skipped: number;
  errors: Array<{ auditId: string; error: string }>;
}

export async function recoverMissingDiscoveryJobs(
  deps: MissingDiscoveryRecoveryDependencies,
): Promise<MissingDiscoveryRecoveryStats> {
  const stats: MissingDiscoveryRecoveryStats = {
    enqueued: 0,
    superseded: 0,
    skipped: 0,
    errors: [],
  };
  const [candidates, summaries] = await Promise.all([
    deps.listNeedsReviewAudits(),
    deps.listAuditSummaries(),
  ]);

  const ordered = [...candidates].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  for (const audit of ordered) {
    try {
      const [hasJob, hasArtifactRow] = await Promise.all([
        deps.hasReportJob(audit.id),
        deps.hasReportArtifact(audit.id),
      ]);
      const decision = decideMissingDiscoveryRecovery({
        audit,
        sameEmailAudits: summaries,
        hasJob,
        hasArtifactRow,
      });

      if (decision.action === "skip") {
        stats.skipped++;
        continue;
      }
      if (decision.action === "supersede") {
        const changed = await deps.markSuperseded(
          audit.id,
          decision.replacementAuditId,
          decision.reason,
        );
        if (changed) {
          stats.superseded++;
          await deps.log?.(audit.id, "DISCOVERY_RECOVERY_SUPERSEDED", {
            version: DISCOVERY_RECOVERY_VERSION,
            reason: decision.reason,
            replacementAuditId: decision.replacementAuditId,
          });
        } else {
          stats.skipped++;
        }
        continue;
      }

      const enqueued = await deps.enqueueMissingReportJob(audit.id, decision.reason);
      if (!enqueued) {
        stats.skipped++;
        continue;
      }
      stats.enqueued++;
      await deps.log?.(audit.id, "DISCOVERY_RECOVERY_JOB_ENQUEUED", {
        version: DISCOVERY_RECOVERY_VERSION,
        reason: decision.reason,
      });
      // Generation only. Delivery remains owned by the READY AutoSend worker,
      // whose atomic SENDING claim and email tracking gate prevent concurrent sends.
      await deps.startEnqueuedJob(audit.id);
    } catch (error) {
      stats.errors.push({
        auditId: audit.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
  return stats;
}
