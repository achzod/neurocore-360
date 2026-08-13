export const PeptidesGenerationState = {
  PENDING: "PENDING",
  GENERATING: "GENERATING",
  NEEDS_REVIEW: "NEEDS_REVIEW",
  SUCCEEDED: "SUCCEEDED",
} as const;

export type PeptidesGenerationStateValue =
  (typeof PeptidesGenerationState)[keyof typeof PeptidesGenerationState];

export interface PeptidesGenerationCircuitConfig {
  maxAttempts: number;
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
  reportId: string | null;
}

export type PeptidesGenerationEligibilityReason =
  | "ELIGIBLE"
  | "REPORT_EXISTS"
  | "NEEDS_REVIEW"
  | "IN_FLIGHT"
  | "ATTEMPT_CAP"
  | "COST_CAP";

export interface PeptidesGenerationEligibility {
  eligible: boolean;
  reason: PeptidesGenerationEligibilityReason;
  snapshot: PeptidesGenerationCircuitSnapshot;
}

export interface PeptidesGenerationAttemptClaim {
  attemptCount: number;
  reservedCostMicroUsd: number;
  leaseUntil: string;
}

export function isPeptidesAutogenEnabled(
  env: Record<string, string | undefined> = process.env,
): boolean {
  // Fail closed. Production must opt in explicitly after the queue has been
  // audited; legacy paid/missing orders cannot silently spend on restart.
  return String(env.PEPTIDES_AUTOGEN_ENABLED || "").trim().toLowerCase() === "true";
}

const DEFAULT_ATTEMPT_BUDGET_MICRO_USD = 1_000_000;
const DEFAULT_HOURLY_BUDGET_MICRO_USD = 5_000_000;
const DEFAULT_DAILY_BUDGET_MICRO_USD = 15_000_000;
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
  // One paid provider request is the safe default. Any second generation must
  // be an explicit, human-reviewed action rather than a five-minute cron retry.
  const maxAttempts = boundedInteger(
    env.PEPTIDES_AUTOGEN_MAX_ATTEMPTS,
    1,
    1,
    3,
  );
  const attemptBudgetMicroUsd = boundedInteger(
    env.PEPTIDES_AUTOGEN_ATTEMPT_BUDGET_MICRO_USD,
    DEFAULT_ATTEMPT_BUDGET_MICRO_USD,
    1,
    20_000_000,
  );
  const requestedMaxBudget = boundedInteger(
    env.PEPTIDES_AUTOGEN_MAX_BUDGET_MICRO_USD,
    DEFAULT_ATTEMPT_BUDGET_MICRO_USD,
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

  return {
    maxAttempts,
    attemptBudgetMicroUsd,
    // Never let an invalid configuration reserve more than the order cap.
    maxBudgetMicroUsd: Math.max(attemptBudgetMicroUsd, requestedMaxBudget),
    // Window caps are reservations, not estimates made after the provider has
    // already spent. This makes the guard useful even if telemetry is delayed.
    maxHourlyBudgetMicroUsd: Math.max(attemptBudgetMicroUsd, requestedHourlyBudget),
    maxDailyBudgetMicroUsd: Math.max(
      attemptBudgetMicroUsd,
      requestedHourlyBudget,
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

  return {
    state: parseState(candidate.peptidesGenerationState),
    attempts: nonNegativeInteger(candidate.peptidesGenerationAttempts),
    reservedCostMicroUsd: nonNegativeInteger(
      candidate.peptidesGenerationReservedCostMicroUsd,
    ),
    leaseUntil,
    reportId,
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
  if (snapshot.state === PeptidesGenerationState.NEEDS_REVIEW) {
    return { eligible: false, reason: "NEEDS_REVIEW", snapshot };
  }
  if (
    snapshot.state === PeptidesGenerationState.GENERATING
    && snapshot.leaseUntil
    && new Date(snapshot.leaseUntil).getTime() > nowMs
  ) {
    return { eligible: false, reason: "IN_FLIGHT", snapshot };
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

export function sanitizePeptidesGenerationError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error || "unknown error");
  return raw
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, 800);
}
