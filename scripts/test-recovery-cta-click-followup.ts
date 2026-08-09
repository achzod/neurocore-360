import assert from "node:assert/strict";
import type { Pool } from "pg";
import {
  applyRecoveryCtaReconciliation,
  buildRecoveryCtaClickIdempotencyKey,
  claimRecoveryCtaClickFollowup,
  classifyRecoveryCtaProviderRecord,
  classifySendPulsePostFailure,
  decideRecoveryCtaClickClaim,
  isAmbiguousSendPulsePostError,
  markRecoveryCtaProviderPostStarted,
  RECOVERY_CTA_RECONCILIATION_STATES,
  summarizeRecoveryCtaClickCronResult,
} from "../server/recoveryCtaClickFollowup";

const NOW = new Date("2026-08-09T06:00:00.000Z");
const minutesAgo = (minutes: number) => new Date(NOW.getTime() - minutes * 60_000);

assert.equal(
  buildRecoveryCtaClickIdempotencyKey("  Sofiane@Example.NET  "),
  "recovery_cta_recipient:recovery_cta_2026_06:clicked_help:sofiane@example.net",
);
assert.throws(() => buildRecoveryCtaClickIdempotencyKey(""), /recipientEmail is required/);
assert.deepEqual([...RECOVERY_CTA_RECONCILIATION_STATES], [
  "provider_post_started",
  "reconcile_required",
]);

const abortError = new Error("The operation was aborted");
abortError.name = "AbortError";
assert.equal(isAmbiguousSendPulsePostError(abortError, true), true);
assert.equal(isAmbiguousSendPulsePostError(abortError, false), false);
assert.equal(isAmbiguousSendPulsePostError(new Error("HTTP 422"), true), false);
assert.equal(isAmbiguousSendPulsePostError(new TypeError("fetch failed"), true), true);
const connectionReset = Object.assign(new Error("socket closed"), { code: "ECONNRESET" });
assert.equal(isAmbiguousSendPulsePostError(connectionReset, true), true);
assert.deepEqual(classifySendPulsePostFailure(abortError, true), {
  sendpulseStatus: "pending",
  reconcileRequired: true,
  metadata: {
    deliveryState: "reconcile_required",
    providerOutcomeUnknown: true,
    retryable: false,
  },
});
assert.deepEqual(classifySendPulsePostFailure(new Error("HTTP 422"), true), {
  sendpulseStatus: "failed",
  reconcileRequired: false,
  metadata: {},
});
assert.deepEqual(classifySendPulsePostFailure(connectionReset, true), {
  sendpulseStatus: "pending",
  reconcileRequired: true,
  metadata: {
    deliveryState: "reconcile_required",
    providerOutcomeUnknown: true,
    retryable: false,
  },
});

assert.deepEqual(classifyRecoveryCtaProviderRecord(null), {
  outcome: "unknown",
  reason: "no_exact_provider_record",
});
assert.deepEqual(classifyRecoveryCtaProviderRecord({ id: "sp-accepted", status: "queued" }), {
  outcome: "success",
  providerTaskId: "sp-accepted",
  providerStatus: "queued",
});
assert.deepEqual(classifyRecoveryCtaProviderRecord({ id: "sp-rejected", status: "rejected" }), {
  outcome: "confirmed_not_sent",
  providerStatus: "rejected",
  proof: "sendpulse_status:rejected",
});

assert.deepEqual(summarizeRecoveryCtaClickCronResult({ sent: 0, failed: 1 }), {
  sent: 0,
  failed: 1,
  shouldContinueClickLoop: false,
});
assert.deepEqual(summarizeRecoveryCtaClickCronResult({ sent: 0, failed: 0, skipped: 1 }), {
  sent: 0,
  failed: 0,
  shouldContinueClickLoop: false,
});
assert.deepEqual(summarizeRecoveryCtaClickCronResult({ sent: 1, failed: 0 }), {
  sent: 1,
  failed: 0,
  shouldContinueClickLoop: true,
});

assert.deepEqual(decideRecoveryCtaClickClaim(null, NOW), {
  action: "claim",
  attempt: 1,
  retry: false,
});
assert.deepEqual(decideRecoveryCtaClickClaim({
  id: "sent",
  sentAt: minutesAgo(500),
  sendpulseStatus: "success",
}, NOW), { action: "skip", reason: "already_sent" });
assert.deepEqual(decideRecoveryCtaClickClaim({
  id: "provider-task",
  sentAt: minutesAgo(500),
  sendpulseStatus: "pending",
  sendpulseTaskId: "sendpulse-42",
}, NOW), { action: "skip", reason: "already_sent" });
assert.deepEqual(decideRecoveryCtaClickClaim({
  id: "pending",
  sentAt: minutesAgo(29),
  sendpulseStatus: "pending",
}, NOW), { action: "skip", reason: "in_progress" });
assert.deepEqual(decideRecoveryCtaClickClaim({
  id: "stale-pending",
  sentAt: minutesAgo(30),
  sendpulseStatus: "pending",
  metadata: { claimAttempt: 2 },
}, NOW), { action: "claim", attempt: 3, retry: true });
assert.deepEqual(decideRecoveryCtaClickClaim({
  id: "failed-cooldown",
  sentAt: minutesAgo(14),
  sendpulseStatus: "failed",
}, NOW), { action: "skip", reason: "retry_cooldown" });
assert.deepEqual(decideRecoveryCtaClickClaim({
  id: "failed-retry",
  sentAt: minutesAgo(15),
  sendpulseStatus: "failed",
  metadata: { claimAttempt: 1 },
}, NOW), { action: "claim", attempt: 2, retry: true });
assert.deepEqual(decideRecoveryCtaClickClaim({
  id: "unsubscribed",
  sentAt: minutesAgo(500),
  sendpulseStatus: "unsubscribed",
}, NOW), { action: "skip", reason: "blocked" });
assert.deepEqual(decideRecoveryCtaClickClaim({
  id: "ambiguous-provider-post",
  sentAt: minutesAgo(500),
  sendpulseStatus: "pending",
  metadata: { deliveryState: "reconcile_required", retryable: false },
}, NOW), { action: "skip", reason: "reconcile_required" });

type StoredClaim = {
  id: string;
  sentAt: Date;
  sendpulseStatus: string;
  sendpulseTaskId: string | null;
  metadata: Record<string, unknown>;
};

class FakeClaimPool {
  row: StoredClaim | null = null;
  private lockTail: Promise<void> = Promise.resolve();

  async acquireLock(): Promise<() => void> {
    let release!: () => void;
    const held = new Promise<void>((resolve) => { release = resolve; });
    const previous = this.lockTail;
    this.lockTail = previous.then(() => held);
    await previous;
    return release;
  }

  async connect() {
    let releaseLock: (() => void) | null = null;
    return {
      query: async (sql: string, params: unknown[] = []) => {
        if (sql.includes("pg_advisory_xact_lock")) {
          releaseLock = await this.acquireLock();
          return { rows: [], rowCount: 1 };
        }
        if (sql.includes("SELECT id,") && sql.includes("recoveryClickFollowupKey")) {
          return { rows: this.row ? [this.row] : [], rowCount: this.row ? 1 : 0 };
        }
        if (sql.includes("SELECT id") && sql.includes("deliveryState")) {
          const state = String(this.row?.metadata.deliveryState || "");
          const eligible = state === "provider_post_started" || state === "reconcile_required";
          return { rows: eligible && this.row ? [{ id: this.row.id }] : [], rowCount: eligible ? 1 : 0 };
        }
        if (sql.includes("INSERT INTO email_tracking")) {
          this.row = {
            id: String(params[0]),
            sentAt: params[5] as Date,
            sendpulseStatus: "pending",
            sendpulseTaskId: null,
            metadata: JSON.parse(String(params[4])),
          };
          return { rows: [], rowCount: 1 };
        }
        if (sql.includes("UPDATE email_tracking")) {
          if (!this.row) return { rows: [], rowCount: 0 };
          if (sql.includes("sendpulse_status = 'success'")) {
            const metadata = JSON.parse(String(params[2]));
            this.row.sendpulseStatus = "success";
            this.row.sendpulseTaskId = String(params[1]);
            delete this.row.metadata.deliveryState;
            delete this.row.metadata.providerOutcomeUnknown;
            delete this.row.metadata.retryable;
            Object.assign(this.row.metadata, metadata);
            return { rows: [], rowCount: 1 };
          }
          if (sql.includes("sendpulse_status = 'failed'")) {
            const metadata = JSON.parse(String(params[2]));
            this.row.sendpulseStatus = "failed";
            this.row.sendpulseTaskId = null;
            delete this.row.metadata.deliveryState;
            delete this.row.metadata.providerOutcomeUnknown;
            Object.assign(this.row.metadata, metadata);
            return { rows: [], rowCount: 1 };
          }
          if (sql.includes("sendpulse_status = 'pending'")) {
            this.row.sendpulseStatus = "pending";
            Object.assign(this.row.metadata, JSON.parse(String(params[1])));
            return { rows: [], rowCount: 1 };
          }
          this.row = {
            id: String(params[0]),
            sentAt: params[5] as Date,
            sendpulseStatus: "pending",
            sendpulseTaskId: null,
            metadata: JSON.parse(String(params[4])),
          };
          return { rows: [], rowCount: 1 };
        }
        if (sql === "COMMIT" || sql === "ROLLBACK") {
          releaseLock?.();
          releaseLock = null;
        }
        return { rows: [], rowCount: 0 };
      },
      release: () => undefined,
    };
  }

  async query(sql: string, params: unknown[] = []) {
    if (sql.includes("provider_post_started") && sql.includes("UPDATE email_tracking")) {
      if (!this.row) return { rows: [], rowCount: 0 };
      Object.assign(this.row.metadata, JSON.parse(String(params[4])));
      return { rows: [], rowCount: 1 };
    }
    return { rows: [], rowCount: 0 };
  }
}

const fakePool = new FakeClaimPool();
const concurrentClaims = await Promise.all([
  claimRecoveryCtaClickFollowup(fakePool as unknown as Pool, {
    sourceTrackingId: "source-sofiane-a",
    recipientEmail: "sofiane@example.net",
  }, NOW),
  claimRecoveryCtaClickFollowup(fakePool as unknown as Pool, {
    sourceTrackingId: "source-sofiane-b",
    recipientEmail: "SOFIANE@example.net",
  }, NOW),
]);

assert.equal(concurrentClaims.filter((claim) => claim.action === "claim").length, 1);
assert.equal(concurrentClaims.filter(
  (claim) => claim.action === "skip" && claim.reason === "in_progress",
).length, 1);
assert.equal(new Set(concurrentClaims.map((claim) => claim.trackingId)).size, 1);
assert.equal(new Set(concurrentClaims.map((claim) => claim.idempotencyKey)).size, 1);

const claimed = concurrentClaims.find((claim) => claim.action === "claim")!;
await markRecoveryCtaProviderPostStarted(fakePool as unknown as Pool, {
  trackingId: claimed.trackingId!,
  idempotencyKey: claimed.idempotencyKey,
  recipientEmail: "sofiane@example.net",
  subject: "Tu hesites sur la formule ?",
  startedAt: NOW,
});
assert.equal(fakePool.row?.metadata.deliveryState, "provider_post_started");
assert.equal(fakePool.row?.metadata.retryable, false);
assert.deepEqual(decideRecoveryCtaClickClaim({
  ...fakePool.row!,
  sentAt: minutesAgo(500),
}, NOW), { action: "skip", reason: "reconcile_required" });

await applyRecoveryCtaReconciliation(fakePool as unknown as Pool, {
  trackingId: claimed.trackingId!,
  idempotencyKey: claimed.idempotencyKey,
  outcome: { outcome: "unknown", reason: "no_exact_provider_record" },
  reconciledAt: NOW,
});
assert.equal(fakePool.row?.metadata.deliveryState, "reconcile_required");
assert.equal(fakePool.row?.metadata.retryable, false);

await applyRecoveryCtaReconciliation(fakePool as unknown as Pool, {
  trackingId: claimed.trackingId!,
  idempotencyKey: claimed.idempotencyKey,
  outcome: { outcome: "success", providerTaskId: "sp-proof", providerStatus: "queued" },
  reconciledAt: NOW,
});
assert.equal(fakePool.row?.sendpulseStatus, "success");
assert.equal(fakePool.row?.sendpulseTaskId, "sp-proof");
assert.equal(fakePool.row?.metadata.deliveryState, undefined);

const notSentPool = new FakeClaimPool();
const notSentClaim = await claimRecoveryCtaClickFollowup(notSentPool as unknown as Pool, {
  sourceTrackingId: "source-not-sent",
  recipientEmail: "retry@example.net",
}, minutesAgo(20));
await markRecoveryCtaProviderPostStarted(notSentPool as unknown as Pool, {
  trackingId: notSentClaim.trackingId!,
  idempotencyKey: notSentClaim.idempotencyKey,
  recipientEmail: "retry@example.net",
  subject: "Tu hesites sur la formule ?",
  startedAt: minutesAgo(20),
});
await applyRecoveryCtaReconciliation(notSentPool as unknown as Pool, {
  trackingId: notSentClaim.trackingId!,
  idempotencyKey: notSentClaim.idempotencyKey,
  outcome: {
    outcome: "confirmed_not_sent",
    providerStatus: "rejected",
    proof: "sendpulse_status:rejected",
  },
  reconciledAt: NOW,
});
assert.equal(notSentPool.row?.sendpulseStatus, "failed");
assert.equal(notSentPool.row?.metadata.retryable, true);
assert.equal(notSentPool.row?.metadata.deliveryState, undefined);
assert.deepEqual(decideRecoveryCtaClickClaim(notSentPool.row, NOW), {
  action: "claim",
  attempt: 2,
  retry: true,
});

console.log("Recovery CTA click-followup idempotency tests passed");
