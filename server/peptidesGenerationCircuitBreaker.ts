export const PeptidesGenerationState = {
  PENDING: "PENDING",
  GENERATING: "GENERATING",
  RETRY_SCHEDULED: "RETRY_SCHEDULED",
  NEEDS_REVIEW: "NEEDS_REVIEW",
  SUCCEEDED: "SUCCEEDED",
} as const;

export type PeptidesGenerationStateValue =
  (typeof PeptidesGenerationState)[keyof typeof PeptidesGenerationState];

export interface PeptidesGenerationCircuitConfig {
  maxAttempts: number;
  maxStoredResumeAttempts: number;
  attemptBudgetMicroUsd: number;
  maxBudgetMicroUsd: number;
  maxHourlyBudgetMicroUsd: number;
  maxDailyBudgetMicroUsd: number;
  leaseMs: number;
}

export interface PeptidesGenerationCircuitSnapshot {
  state: PeptidesGenerationStateValue;
  attempts: number;
  reservedCostMicroUsd: number;
  leaseUntil: string | null;
  nextRetryAt: string | null;
  reportId: string | null;
  responseId: string | null;
  storedResumeAttempts: number;
}

export type PeptidesGenerationEligibilityReason =
  | "ELIGIBLE"
  | "DURABLE_RESPONSE"
  | "REPORT_EXISTS"
  | "NEEDS_REVIEW"
  | "IN_FLIGHT"
  | "BACKOFF"
  | "ATTEMPT_CAP"
  | "COST_CAP";

export interface PeptidesGenerationEligibility {
  eligible: boolean;
  reason: PeptidesGenerationEligibilityReason;
  snapshot: PeptidesGenerationCircuitSnapshot;
}

export interface PeptidesGenerationAttemptClaim {
  claimId: string;
  attemptCount: number;
  reservedCostMicroUsd: number;
  leaseUntil: string;
  storedResumeAttemptCount?: number;
}

export interface PeptidesSourceCheckClaim {
  claimId: string;
  attemptCount: number;
  phaseStartedAt: string;
  leaseUntil: string;
}

export const PEPTIDES_SOURCE_MAX_ATTEMPTS = 3;
export const PEPTIDES_SOURCE_CONTEXT_TTL_MS = 15 * 60 * 1000;

export function isPeptidesAutogenEnabled(
  env: Record<string, string | undefined> = process.env,
): boolean {
  // Fail closed. Production must opt in explicitly after the queue has been
  // audited; legacy paid/missing orders cannot silently spend on restart.
  return String(env.PEPTIDES_AUTOGEN_ENABLED || "").trim().toLowerCase() === "true";
}

// Current expert-standard generations cost about $2.0-$2.56. Reserve $2.75
// for the only authorized response. Quality rejection is terminal; a manual
// repair needs a separate one-off incident authorization and budget category.
const DEFAULT_ATTEMPT_BUDGET_MICRO_USD = 2_750_000;
const DEFAULT_ORDER_BUDGET_MICRO_USD = 2_750_000;
const DEFAULT_HOURLY_BUDGET_MICRO_USD = 27_500_000;
const DEFAULT_DAILY_BUDGET_MICRO_USD = 82_500_000;
const DEFAULT_LEASE_MS = 40 * 60 * 1000;

function boundedInteger(
  raw: unknown,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(maximum, Math.max(minimum, Math.floor(parsed)));
}

export function getPeptidesGenerationCircuitConfig(
  env: Record<string, string | undefined> = process.env,
): PeptidesGenerationCircuitConfig {
  // Exactly one automatic paid response per order. A deterministic quality
  // failure never self-recovers through another provider call.
  const maxAttempts = boundedInteger(
    env.PEPTIDES_AUTOGEN_MAX_ATTEMPTS,
    1,
    1,
    1,
  );
  const maxStoredResumeAttempts = boundedInteger(
    env.PEPTIDES_AUTOGEN_MAX_STORED_RESUME_ATTEMPTS,
    3,
    1,
    6,
  );
  const attemptBudgetMicroUsd = boundedInteger(
    env.PEPTIDES_AUTOGEN_ATTEMPT_BUDGET_MICRO_USD,
    DEFAULT_ATTEMPT_BUDGET_MICRO_USD,
    DEFAULT_ATTEMPT_BUDGET_MICRO_USD,
    20_000_000,
  );
  const requestedMaxBudget = boundedInteger(
    env.PEPTIDES_AUTOGEN_MAX_BUDGET_MICRO_USD,
    DEFAULT_ORDER_BUDGET_MICRO_USD,
    1,
    60_000_000,
  );
  const requestedHourlyBudget = boundedInteger(
    env.PEPTIDES_AUTOGEN_HOURLY_BUDGET_MICRO_USD,
    DEFAULT_HOURLY_BUDGET_MICRO_USD,
    1,
    120_000_000,
  );
  const requestedDailyBudget = boundedInteger(
    env.PEPTIDES_AUTOGEN_DAILY_BUDGET_MICRO_USD,
    DEFAULT_DAILY_BUDGET_MICRO_USD,
    1,
    500_000_000,
  );
  const leaseMs = boundedInteger(
    env.PEPTIDES_AUTOGEN_LEASE_MS,
    DEFAULT_LEASE_MS,
    5 * 60 * 1000,
    90 * 60 * 1000,
  );

  const minimumOrderBudget = attemptBudgetMicroUsd * maxAttempts;
  const maxBudgetMicroUsd = Math.max(minimumOrderBudget, requestedMaxBudget);
  const maxHourlyBudgetMicroUsd = Math.max(maxBudgetMicroUsd, requestedHourlyBudget);
  return {
    maxAttempts,
    maxStoredResumeAttempts,
    attemptBudgetMicroUsd,
    // The order cap funds exactly one automatic paid response.
    maxBudgetMicroUsd,
    // Window caps are reservations, not estimates made after the provider has
    // already spent. Keep them at least as large as one complete order budget.
    maxHourlyBudgetMicroUsd,
    maxDailyBudgetMicroUsd: Math.max(
      maxHourlyBudgetMicroUsd,
      requestedDailyBudget,
    ),
    leaseMs,
  };
}

function nonNegativeInteger(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : 0;
}

function parseState(value: unknown): PeptidesGenerationStateValue {
  const normalized = String(value || "").trim().toUpperCase();
  if (normalized === PeptidesGenerationState.GENERATING) {
    return PeptidesGenerationState.GENERATING;
  }
  if (normalized === PeptidesGenerationState.RETRY_SCHEDULED) {
    return PeptidesGenerationState.RETRY_SCHEDULED;
  }
  if (normalized === PeptidesGenerationState.NEEDS_REVIEW) {
    return PeptidesGenerationState.NEEDS_REVIEW;
  }
  if (normalized === PeptidesGenerationState.SUCCEEDED) {
    return PeptidesGenerationState.SUCCEEDED;
  }
  return PeptidesGenerationState.PENDING;
}

export function readPeptidesGenerationCircuitSnapshot(
  metadata: unknown,
): PeptidesGenerationCircuitSnapshot {
  const candidate = metadata && typeof metadata === "object"
    ? metadata as Record<string, unknown>
    : {};
  const reportId = String(candidate.peptidesReportId || "").trim() || null;
  const leaseRaw = String(candidate.peptidesGenerationLeaseUntil || "").trim();
  const leaseUntil = leaseRaw && Number.isFinite(new Date(leaseRaw).getTime())
    ? leaseRaw
    : null;
  const nextRetryRaw = String(candidate.peptidesGenerationNextRetryAt || "").trim();
  const nextRetryAt = nextRetryRaw && Number.isFinite(new Date(nextRetryRaw).getTime())
    ? nextRetryRaw
    : null;
  const responseId = String(candidate.peptidesGenerationResponseId || "").trim() || null;

  return {
    state: parseState(candidate.peptidesGenerationState),
    attempts: nonNegativeInteger(candidate.peptidesGenerationAttempts),
    reservedCostMicroUsd: nonNegativeInteger(
      candidate.peptidesGenerationReservedCostMicroUsd,
    ),
    leaseUntil,
    nextRetryAt,
    reportId,
    responseId,
    storedResumeAttempts: nonNegativeInteger(candidate.peptidesGenerationStoredResumeAttempts),
  };
}

export function evaluatePeptidesGenerationEligibility(
  metadata: unknown,
  config: PeptidesGenerationCircuitConfig,
  nowMs = Date.now(),
): PeptidesGenerationEligibility {
  const snapshot = readPeptidesGenerationCircuitSnapshot(metadata);
  if (snapshot.reportId) {
    return { eligible: false, reason: "REPORT_EXISTS", snapshot };
  }
  if (
    snapshot.state === PeptidesGenerationState.GENERATING
    && snapshot.leaseUntil
    && new Date(snapshot.leaseUntil).getTime() > nowMs
  ) {
    return { eligible: false, reason: "IN_FLIGHT", snapshot };
  }
  if (snapshot.nextRetryAt && new Date(snapshot.nextRetryAt).getTime() > nowMs) {
    return { eligible: false, reason: "BACKOFF", snapshot };
  }
  // A durable provider response is already paid for. Resume its canonical
  // parsing and validation before applying provider-call attempt or cost caps.
  if (snapshot.responseId && snapshot.storedResumeAttempts < config.maxStoredResumeAttempts) {
    return { eligible: true, reason: "DURABLE_RESPONSE", snapshot };
  }
  if (snapshot.state === PeptidesGenerationState.NEEDS_REVIEW) {
    return { eligible: false, reason: "NEEDS_REVIEW", snapshot };
  }
  if (snapshot.attempts >= config.maxAttempts) {
    return { eligible: false, reason: "ATTEMPT_CAP", snapshot };
  }
  if (
    snapshot.reservedCostMicroUsd + config.attemptBudgetMicroUsd
    > config.maxBudgetMicroUsd
  ) {
    return { eligible: false, reason: "COST_CAP", snapshot };
  }
  return { eligible: true, reason: "ELIGIBLE", snapshot };
}

export function getPeptidesGenerationRetryAt(
  attemptCount: number,
  nowMs = Date.now(),
): string | null {
  const delaysMs = [5 * 60 * 1000];
  const delayMs = delaysMs[Math.max(0, Math.floor(attemptCount) - 1)];
  return delayMs ? new Date(nowMs + delayMs).toISOString() : null;
}

export function getPeptidesSourceRetryAt(
  attemptCount: number,
  phaseStartedAt: string,
): string | null {
  // T0 / T0+5 / T0+20, anchored to the first source-only claim.
  const offsetsMs = [5 * 60_000, 20 * 60_000];
  const offsetMs = offsetsMs[Math.max(0, Math.floor(attemptCount) - 1)];
  const startedAtMs = Date.parse(phaseStartedAt);
  return offsetMs !== undefined && Number.isFinite(startedAtMs)
    ? new Date(startedAtMs + offsetMs).toISOString()
    : null;
}

export function getPeptidesStoredResumeRetryAt(
  storedResumeAttemptCount: number,
  nowMs = Date.now(),
): string | null {
  const delaysMs = [5 * 60 * 1000, 15 * 60 * 1000];
  const delayMs = delaysMs[Math.max(0, Math.floor(storedResumeAttemptCount) - 1)];
  return delayMs ? new Date(nowMs + delayMs).toISOString() : null;
}

export function sanitizePeptidesGenerationError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error || "unknown error");
  return raw
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, 800);
}
