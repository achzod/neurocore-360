import assert from "node:assert/strict";
import {
  decideMissingDiscoveryRecovery,
  recoverMissingDiscoveryJobs,
  type DiscoveryRecoveryAudit,
} from "../server/discoveryMissingJobRecovery";

process.env.DISCOVERY_TRANSACTIONAL_AUTOMATION_ENABLED = "true";
process.env.DISCOVERY_AUTOMATION_START_AT = "2026-01-01T00:00:00.000Z";

const now = new Date("2026-08-08T12:00:00.000Z");
const day = 24 * 60 * 60 * 1000;

function audit(
  id: string,
  email: string,
  ageDays: number,
  status = "NEEDS_REVIEW",
): DiscoveryRecoveryAudit {
  return {
    id,
    email,
    type: "GRATUIT",
    reportDeliveryStatus: status as any,
    createdAt: new Date(now.getTime() - ageDays * day),
  };
}

const missing = audit("missing", "unique@example.com", 1);
assert.deepEqual(
  decideMissingDiscoveryRecovery({
    audit: missing,
    sameEmailAudits: [missing],
    hasJob: false,
    hasArtifactRow: false,
    now,
  }),
  { action: "enqueue", reason: "missing_job_and_artifacts" },
  "an artifact-less Discovery audit must be enqueued",
);

const corruptedSuperseded = {
  ...audit("corrupted-superseded", "duplicate@example.com", 1),
  narrativeReport: {
    recovery: {
      disposition: "superseded",
      replacementAuditId: "replacement",
    },
  },
};
assert.deepEqual(
  decideMissingDiscoveryRecovery({
    audit: corruptedSuperseded,
    sameEmailAudits: [corruptedSuperseded],
    hasJob: false,
    hasArtifactRow: false,
    now,
  }),
  { action: "skip", reason: "superseded_terminal" },
  "superseded recovery provenance must remain terminal after status corruption",
);

const haraldCurrent = audit("harald-current", "harald@example.com", 0);
const haraldSent = {
  ...audit("harald-sent", "HARALD@example.com", 1, "SENT"),
  reportSentAt: new Date(now.getTime() - day),
};
assert.deepEqual(
  decideMissingDiscoveryRecovery({
    audit: haraldCurrent,
    sameEmailAudits: [haraldCurrent, haraldSent],
    hasJob: false,
    now,
  }),
  {
    action: "supersede",
    reason: "recent_discovery_already_active_or_delivered",
    replacementAuditId: "harald-sent",
  },
  "a recent delivered scan must hold the duplicate",
);

const boulCurrent = audit("boul-current", "boul@example.com", 0);
const boulOld = {
  ...audit("boul-old", "boul@example.com", 26, "SENT"),
  reportSentAt: new Date(now.getTime() - 26 * day),
};
assert.equal(
  decideMissingDiscoveryRecovery({
    audit: boulCurrent,
    sameEmailAudits: [boulCurrent, boulOld],
    hasJob: false,
    now,
  }).action,
  "enqueue",
  "a 26-day re-scan must be allowed",
);

const olderDuplicate = audit("older", "dupe@example.com", 2);
const newerDuplicate = audit("newer", "dupe@example.com", 1);
assert.deepEqual(
  decideMissingDiscoveryRecovery({
    audit: olderDuplicate,
    sameEmailAudits: [olderDuplicate, newerDuplicate],
    hasJob: false,
    now,
  }),
  { action: "supersede", reason: "newer_duplicate", replacementAuditId: "newer" },
  "the older of two unresolved duplicates must be superseded",
);

const enqueued = new Set<string>();
let starts = 0;
const deps = {
  listNeedsReviewAudits: async () => [missing],
  listAuditSummaries: async () => [missing],
  hasReportJob: async (id: string) => enqueued.has(id),
  hasReportArtifact: async () => false,
  enqueueMissingReportJob: async (id: string) => {
    if (enqueued.has(id)) return false;
    enqueued.add(id);
    return true;
  },
  markSuperseded: async () => false,
  startEnqueuedJob: async () => { starts++; },
};
const first = await recoverMissingDiscoveryJobs(deps);
const second = await recoverMissingDiscoveryJobs(deps);
assert.equal(first.enqueued, 1);
assert.equal(second.enqueued, 0);
assert.equal(starts, 1, "two monitoring passes must start exactly one job");

console.log("Discovery missing-job recovery: 6/6 tests passed");
