import { randomUUID } from "node:crypto";
import { isDiscoveryTransactionalAutomationEligible } from "./discoveryAutomationPolicy";
import { DISCOVERY_TRANSACTION_FENCE_KEY } from "./discoveryTransactionalPersistence";

export interface AICostBudgetLimits {
  perOrderUsd: number;
  perHourUsd: number;
  perDayUsd: number;
  reservationTtlMinutes: number;
}

export interface AICostBudgetContext {
  product: string;
  orderId: string;
  profile: string;
  label?: string;
  estimatedCostUsd?: number;
  discoveryGenerationToken?: string;
  discoveryFenceToken?: string | null;
  discoveryBatchId?: string;
  discoveryBatchLockToken?: string;
}

export interface AICostBudgetSpendSnapshot {
  orderUsd: number;
  hourUsd: number;
  dayUsd: number;
}

export type AICostBudgetDimension = "order" | "hour" | "day";

export interface AICostBudgetDecision {
  allowed: boolean;
  blockedBy: AICostBudgetDimension | null;
  projected: AICostBudgetSpendSnapshot;
  limits: AICostBudgetLimits;
}

export interface AICostBudgetReservation {
  id: string;
  context: AICostBudgetContext;
  reservedUsd: number;
  createdAt: string;
}

const DEFAULT_PEPTIDES_LIMITS: AICostBudgetLimits = {
  perOrderUsd: 1,
  perHourUsd: 5,
  perDayUsd: 15,
  reservationTtlMinutes: 45,
};

const DEFAULT_DISCOVERY_LIMITS: AICostBudgetLimits = {
  perOrderUsd: 0.75,
  perHourUsd: 1.5,
  perDayUsd: 5,
  reservationTtlMinutes: 45,
};

function boundedNumber(
  raw: unknown,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(maximum, Math.max(minimum, parsed));
}

function normalizeProduct(value: unknown): string {
  return String(value || "unknown").trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "-").slice(0, 80);
}

function normalizeOrderId(value: unknown): string {
  return String(value || "").trim().slice(0, 160);
}

export function isAICostBudgetControllerEnabled(
  env: Record<string, string | undefined> = process.env,
): boolean {
  // Production Peptides cost protection cannot be disabled by a stray env
  // edit. Stop generation with PEPTIDES_AUTOGEN_ENABLED instead; never remove
  // the last pre-provider budget gate.
  if (String(env.NODE_ENV || "").trim().toLowerCase() === "production") return true;
  return String(env.AI_COST_BUDGET_CONTROLLER_ENABLED || "true").trim().toLowerCase() !== "false";
}

export function getAICostBudgetLimits(
  product: string,
  env: Record<string, string | undefined> = process.env,
): AICostBudgetLimits {
  const normalizedProduct = normalizeProduct(product);
  if (normalizedProduct !== "peptides" && normalizedProduct !== "discovery") {
    // No implicit budget for other products yet. They must opt in with
    // product-specific limits before this controller is applied to them.
    return {
      perOrderUsd: Number.POSITIVE_INFINITY,
      perHourUsd: Number.POSITIVE_INFINITY,
      perDayUsd: Number.POSITIVE_INFINITY,
      reservationTtlMinutes: 45,
    };
  }

  if (normalizedProduct === "discovery") {
    return {
      perOrderUsd: boundedNumber(
        env.AI_COST_DISCOVERY_PER_AUDIT_USD,
        DEFAULT_DISCOVERY_LIMITS.perOrderUsd,
        0.01,
        DEFAULT_DISCOVERY_LIMITS.perOrderUsd,
      ),
      perHourUsd: boundedNumber(
        env.AI_COST_DISCOVERY_PER_HOUR_USD,
        DEFAULT_DISCOVERY_LIMITS.perHourUsd,
        0.01,
        1_000,
      ),
      perDayUsd: boundedNumber(
        env.AI_COST_DISCOVERY_PER_DAY_USD,
        DEFAULT_DISCOVERY_LIMITS.perDayUsd,
        0.01,
        10_000,
      ),
      reservationTtlMinutes: boundedNumber(
        env.AI_COST_BUDGET_RESERVATION_TTL_MINUTES,
        DEFAULT_DISCOVERY_LIMITS.reservationTtlMinutes,
        5,
        180,
      ),
    };
  }

  return {
    perOrderUsd: boundedNumber(
      env.AI_COST_PEPTIDES_PER_ORDER_USD,
      DEFAULT_PEPTIDES_LIMITS.perOrderUsd,
      0.01,
      100,
    ),
    perHourUsd: boundedNumber(
      env.AI_COST_PEPTIDES_PER_HOUR_USD,
      DEFAULT_PEPTIDES_LIMITS.perHourUsd,
      0.01,
      1_000,
    ),
    perDayUsd: boundedNumber(
      env.AI_COST_PEPTIDES_PER_DAY_USD,
      DEFAULT_PEPTIDES_LIMITS.perDayUsd,
      0.01,
      10_000,
    ),
    reservationTtlMinutes: boundedNumber(
      env.AI_COST_BUDGET_RESERVATION_TTL_MINUTES,
      DEFAULT_PEPTIDES_LIMITS.reservationTtlMinutes,
      5,
      180,
    ),
  };
}

export function evaluateAICostBudget(
  spend: AICostBudgetSpendSnapshot,
  estimatedCostUsd: number,
  limits: AICostBudgetLimits,
): AICostBudgetDecision {
  const estimate = Math.max(0, Number(estimatedCostUsd) || 0);
  const projected = {
    orderUsd: Math.max(0, Number(spend.orderUsd) || 0) + estimate,
    hourUsd: Math.max(0, Number(spend.hourUsd) || 0) + estimate,
    dayUsd: Math.max(0, Number(spend.dayUsd) || 0) + estimate,
  };
  const epsilon = 1e-9;
  const blockedBy = projected.orderUsd > limits.perOrderUsd + epsilon
    ? "order"
    : projected.hourUsd > limits.perHourUsd + epsilon
      ? "hour"
      : projected.dayUsd > limits.perDayUsd + epsilon
        ? "day"
        : null;
  return { allowed: blockedBy === null, blockedBy, projected, limits };
}

export class AICostBudgetBlockedError extends Error {
  readonly code = "AI_COST_BUDGET_BLOCKED";

  constructor(
    readonly context: AICostBudgetContext,
    readonly decision: AICostBudgetDecision,
  ) {
    super(
      `AI cost budget blocked for ${context.product}/${context.orderId}: ${decision.blockedBy}`,
    );
    this.name = "AICostBudgetBlockedError";
  }
}

let budgetTablesPromise: Promise<void> | null = null;

async function ensureBudgetTables(): Promise<void> {
  if (!budgetTablesPromise) {
    budgetTablesPromise = (async () => {
      const { pool } = await import("./db");
      await pool.query(`
        CREATE TABLE IF NOT EXISTS ai_cost_budget_reservations (
          id UUID PRIMARY KEY,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          product TEXT NOT NULL,
          order_id TEXT NOT NULL,
          profile TEXT NOT NULL,
          label TEXT,
          status TEXT NOT NULL,
          reserved_cost_usd DOUBLE PRECISION NOT NULL,
          actual_cost_usd DOUBLE PRECISION,
          response_id TEXT,
          detail TEXT
        )
      `);
      await pool.query(`
        CREATE INDEX IF NOT EXISTS ai_cost_budget_reservations_scope_idx
        ON ai_cost_budget_reservations (product, order_id, created_at DESC)
      `);
      await pool.query(`
        CREATE INDEX IF NOT EXISTS ai_cost_budget_reservations_status_idx
        ON ai_cost_budget_reservations (status, created_at DESC)
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS ai_cost_budget_alerts (
          id BIGSERIAL PRIMARY KEY,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          product TEXT NOT NULL,
          order_id TEXT NOT NULL,
          profile TEXT NOT NULL,
          label TEXT,
          blocked_dimension TEXT NOT NULL,
          projected_order_usd DOUBLE PRECISION NOT NULL,
          projected_hour_usd DOUBLE PRECISION NOT NULL,
          projected_day_usd DOUBLE PRECISION NOT NULL,
          limit_usd DOUBLE PRECISION NOT NULL,
          acknowledged_at TIMESTAMPTZ
        )
      `);
    })().catch((error) => {
      budgetTablesPromise = null;
      throw error;
    });
  }
  await budgetTablesPromise;
}

function effectiveCostSql(alias: string): string {
  // Completed calls use measured telemetry. An uncertain provider result
  // deliberately keeps the full reservation so a timeout cannot silently
  // create another paid retry.
  return `CASE
    WHEN ${alias}.status = 'RESERVED' THEN ${alias}.reserved_cost_usd
    WHEN ${alias}.status = 'COMPLETED' THEN COALESCE(${alias}.actual_cost_usd, ${alias}.reserved_cost_usd)
    WHEN ${alias}.status = 'UNCERTAIN'
      THEN GREATEST(COALESCE(${alias}.actual_cost_usd, 0), ${alias}.reserved_cost_usd)
    ELSE 0
  END`;
}

async function readSpendSnapshot(
  client: any,
  context: AICostBudgetContext,
): Promise<AICostBudgetSpendSnapshot> {
  const effective = effectiveCostSql("r");
  const result = await client.query(
    `SELECT
       COALESCE(SUM(${effective}) FILTER (WHERE r.order_id = $2), 0) AS order_usd,
       COALESCE(SUM(${effective}) FILTER (WHERE r.created_at >= NOW() - INTERVAL '1 hour'), 0) AS reservation_hour_usd,
       COALESCE(SUM(${effective}) FILTER (
         WHERE (r.created_at AT TIME ZONE 'Asia/Dubai')::date =
               (NOW() AT TIME ZONE 'Asia/Dubai')::date
       ), 0) AS reservation_day_usd
     FROM ai_cost_budget_reservations r
     WHERE r.product = $1`,
    [context.product, context.orderId],
  );
  const row = result.rows[0] || {};

  // ai_usage_events is the authoritative historical collector. Only count
  // events that predate this controller or are not linked to a reservation,
  // otherwise completed calls would be counted twice.
  const usage = await client.query(
    `SELECT
       COALESCE(SUM(estimated_openai_cost_usd) FILTER (
         WHERE created_at >= NOW() - INTERVAL '1 hour'
       ), 0) AS hour_usd,
       COALESCE(SUM(estimated_openai_cost_usd) FILTER (
         WHERE (created_at AT TIME ZONE 'Asia/Dubai')::date =
               (NOW() AT TIME ZONE 'Asia/Dubai')::date
       ), 0) AS day_usd
     FROM ai_usage_events e
     WHERE e.profile = $1
       AND NOT EXISTS (
         SELECT 1 FROM ai_cost_budget_reservations r
         WHERE r.response_id = e.response_id
       )`,
    [context.profile],
  );
  const usageRow = usage.rows[0] || {};
  const asNumber = (value: unknown) => {
    const parsed = Number(value || 0);
    return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
  };
  return {
    orderUsd: asNumber(row.order_usd),
    hourUsd: asNumber(row.reservation_hour_usd) + asNumber(usageRow.hour_usd),
    dayUsd: asNumber(row.reservation_day_usd) + asNumber(usageRow.day_usd),
  };
}

export async function reserveAICostBudget(
  rawContext: AICostBudgetContext,
  env: Record<string, string | undefined> = process.env,
): Promise<AICostBudgetReservation | null> {
  const requestedProduct = normalizeProduct(rawContext.product);
  if (requestedProduct !== "discovery" && !isAICostBudgetControllerEnabled(env)) return null;

  const context: AICostBudgetContext = {
    ...rawContext,
    product: requestedProduct,
    orderId: normalizeOrderId(rawContext.orderId),
    profile: String(rawContext.profile || "unknown").trim().slice(0, 80),
    label: rawContext.label ? String(rawContext.label).trim().slice(0, 160) : undefined,
    discoveryGenerationToken: rawContext.discoveryGenerationToken,
    discoveryFenceToken: rawContext.discoveryFenceToken ?? null,
    discoveryBatchId: rawContext.discoveryBatchId,
    discoveryBatchLockToken: rawContext.discoveryBatchLockToken,
  };
  if (!context.orderId) {
    throw new Error("AI cost budget requires an orderId");
  }
  let limits = getAICostBudgetLimits(context.product, env);
  if (!Number.isFinite(limits.perOrderUsd)) return null;
  const reservedUsd = context.product === "discovery"
    ? DEFAULT_DISCOVERY_LIMITS.perOrderUsd
    : boundedNumber(context.estimatedCostUsd, 1, 0.01, limits.perOrderUsd);

  await ensureBudgetTables();
  const { pool } = await import("./db");
  const client = await pool.connect();
  const id = randomUUID();
  let decision: AICostBudgetDecision | null = null;
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
      context.product === "discovery"
        ? DISCOVERY_TRANSACTION_FENCE_KEY
        : `ai-cost-budget:${context.product}`,
    ]);
    if (context.product === "discovery") {
      const hasGenericOwnership = Boolean(context.discoveryGenerationToken);
      const hasBatchOwnership = Boolean(
        context.discoveryBatchId && context.discoveryBatchLockToken,
      );
      if (hasGenericOwnership === hasBatchOwnership) {
        throw new Error("DISCOVERY_PROVIDER_OWNERSHIP_REQUIRED");
      }
      if (hasBatchOwnership) {
        const batchOwnership = await client.query(
          `SELECT b.stage,i.retry_of_candidate_id
             FROM discovery_batch_items i
             JOIN discovery_batch_runs b ON b.id = i.batch_id
             JOIN discovery_operation_lock l
               ON l.lock_key = 'discovery-global' AND l.token = b.lock_token
            WHERE i.batch_id = $1 AND i.audit_id = $2
              AND b.lock_token = $3 AND l.expires_at > NOW()
              AND b.approval_expires_at > NOW()
              AND i.state = 'PROVIDER_STARTED' AND i.provider_calls = 1
            FOR UPDATE OF i, b`,
          [context.discoveryBatchId, context.orderId, context.discoveryBatchLockToken],
        );
        if ((batchOwnership.rowCount ?? 0) !== 1) {
          throw new Error("DISCOVERY_BATCH_PROVIDER_OWNERSHIP_LOST");
        }
        const batchStage = String(batchOwnership.rows[0].stage || "");
        if (batchStage === "REGENERATION") {
          if (!batchOwnership.rows[0].retry_of_candidate_id) {
            throw new Error("DISCOVERY_REGENERATION_PROVIDER_OWNERSHIP_LOST");
          }
          limits = { ...limits, perOrderUsd: 1.50 };
        } else if (batchStage !== "GENERATION") {
          throw new Error("DISCOVERY_PROVIDER_BATCH_STAGE_BLOCKED");
        }
      } else {
        const genericOwnership = await client.query(
          `SELECT id, type, created_at, report_delivery_status, report_sent_at,
                  narrative_report
             FROM audits WHERE id = $1 FOR UPDATE`,
          [context.orderId],
        );
        const audit = genericOwnership.rows[0];
        if (!audit || !isDiscoveryTransactionalAutomationEligible({
          type: audit.type,
          createdAt: audit.created_at,
          reportDeliveryStatus: audit.report_delivery_status,
          reportSentAt: audit.report_sent_at,
          narrativeReport: audit.narrative_report,
        }) || audit.report_delivery_status !== "GENERATING" || audit.report_sent_at
          || String(audit.narrative_report?.generationClaim?.token || "") !== context.discoveryGenerationToken) {
          throw new Error("DISCOVERY_GENERATION_PROVIDER_OWNERSHIP_LOST");
        }
        const fence = await client.query(
          `SELECT token::text AS token, (expires_at > NOW()) AS active
             FROM discovery_operation_lock WHERE lock_key = 'discovery-global'`,
        );
        const currentFenceToken = fence.rows[0]?.token ? String(fence.rows[0].token) : null;
        if (fence.rows[0]?.active || currentFenceToken !== context.discoveryFenceToken) {
          throw new Error("DISCOVERY_GENERATION_PROVIDER_FENCE_STALE");
        }
      }
      const previousDiscoveryAttempt = await client.query(
        `SELECT COUNT(*)::int AS count,
                COUNT(*) FILTER (WHERE status <> 'COMPLETED')::int AS unsettled
           FROM ai_cost_budget_reservations
          WHERE product = 'discovery' AND order_id = $1`,
        [context.orderId],
      );
      const previousCount = Number(previousDiscoveryAttempt.rows[0]?.count || 0);
      const unsettled = Number(previousDiscoveryAttempt.rows[0]?.unsettled || 0);
      const regenerationAuthorized = hasBatchOwnership
        && String((await client.query(
          `SELECT b.stage FROM discovery_batch_runs b WHERE b.id=$1 AND b.lock_token=$2 FOR UPDATE`,
          [context.discoveryBatchId, context.discoveryBatchLockToken],
        )).rows[0]?.stage || "") === "REGENERATION";
      if ((!regenerationAuthorized && previousCount !== 0)
        || (regenerationAuthorized && (previousCount !== 1 || unsettled !== 0))) {
        throw new Error("DISCOVERY_MONO_CALL_ALREADY_RESERVED");
      }
    }
    await client.query(
      `UPDATE ai_cost_budget_reservations
       SET status = 'EXPIRED', updated_at = NOW(), detail = 'reservation_ttl_expired'
       WHERE status = 'RESERVED'
         AND product <> 'discovery'
         AND created_at < NOW() - ($1::double precision * INTERVAL '1 minute')`,
      [limits.reservationTtlMinutes],
    );
    const spend = await readSpendSnapshot(client, context);
    decision = evaluateAICostBudget(spend, reservedUsd, limits);
    if (!decision.allowed) {
      const limitUsd = decision.blockedBy === "order"
        ? limits.perOrderUsd
        : decision.blockedBy === "hour"
          ? limits.perHourUsd
          : limits.perDayUsd;
      await client.query(
        `INSERT INTO ai_cost_budget_alerts (
           product, order_id, profile, label, blocked_dimension,
           projected_order_usd, projected_hour_usd, projected_day_usd, limit_usd
         )
         SELECT $1,$2,$3,$4,$5,$6,$7,$8,$9
         WHERE NOT EXISTS (
           SELECT 1 FROM ai_cost_budget_alerts
           WHERE product = $1 AND order_id = $2 AND blocked_dimension = $5
             AND created_at >= NOW() - INTERVAL '10 minutes'
         )`,
        [
          context.product,
          context.orderId,
          context.profile,
          context.label || null,
          decision.blockedBy,
          decision.projected.orderUsd,
          decision.projected.hourUsd,
          decision.projected.dayUsd,
          limitUsd,
        ],
      );
      await client.query("COMMIT");
      console.error(
        `[AICostBudget] BLOCKED product=${context.product} order=${context.orderId} dimension=${decision.blockedBy} projected_order=${decision.projected.orderUsd.toFixed(6)} projected_hour=${decision.projected.hourUsd.toFixed(6)} projected_day=${decision.projected.dayUsd.toFixed(6)}`,
      );
      throw new AICostBudgetBlockedError(context, decision);
    }
    await client.query(
      `INSERT INTO ai_cost_budget_reservations (
         id, product, order_id, profile, label, status, reserved_cost_usd
       ) VALUES ($1,$2,$3,$4,$5,'RESERVED',$6)`,
      [id, context.product, context.orderId, context.profile, context.label || null, reservedUsd],
    );
    await client.query("COMMIT");
    return { id, context, reservedUsd, createdAt: new Date().toISOString() };
  } catch (error) {
    if (!(error instanceof AICostBudgetBlockedError)) {
      await client.query("ROLLBACK").catch(() => {});
    }
    throw error;
  } finally {
    client.release();
  }
}

export async function completeAICostBudgetReservation(
  reservation: AICostBudgetReservation | null,
  actualCostUsd: number | null | undefined,
  responseId?: string,
): Promise<void> {
  if (!reservation) return;
  await ensureBudgetTables();
  const { pool } = await import("./db");
  // Fail closed when provider usage telemetry is absent or malformed. Keeping
  // the pre-call reservation prevents a completed response without usage from
  // reopening the same order budget for another paid request.
  const actual = resolveAICostBudgetActualUsd(reservation, actualCostUsd);
  await pool.query(
    `UPDATE ai_cost_budget_reservations
     SET status = 'COMPLETED', actual_cost_usd = $2, response_id = $3,
         updated_at = NOW(), detail = NULL
     WHERE id = $1 AND status = 'RESERVED'`,
    [reservation.id, actual, responseId || null],
  );
}

/** Pure helper kept exported so the fail-closed telemetry fallback is covered
 * without requiring a database in unit tests. */
export function resolveAICostBudgetActualUsd(
  reservation: Pick<AICostBudgetReservation, "reservedUsd">,
  actualCostUsd: number | null | undefined,
): number {
  const parsedActual = Number(actualCostUsd);
  return actualCostUsd == null || !Number.isFinite(parsedActual)
    ? reservation.reservedUsd
    : Math.max(0, parsedActual);
}

export async function markAICostBudgetReservationUncertain(
  reservation: AICostBudgetReservation | null,
  detail: unknown,
): Promise<void> {
  if (!reservation) return;
  await ensureBudgetTables();
  const { pool } = await import("./db");
  await pool.query(
    `UPDATE ai_cost_budget_reservations
     SET status = 'UNCERTAIN', actual_cost_usd = reserved_cost_usd,
         updated_at = NOW(), detail = $2
     WHERE id = $1 AND status = 'RESERVED'`,
    [reservation.id, String(detail || "provider_result_unknown").replace(/[\r\n\t]+/g, " ").slice(0, 400)],
  );
}

export async function resetAICostBudgetReservations(
  rawContext: Pick<AICostBudgetContext, "product" | "orderId" | "profile">,
  detail = "manual_admin_reset",
): Promise<number> {
  await ensureBudgetTables();
  const { pool } = await import("./db");
  const result = await pool.query(
    `UPDATE ai_cost_budget_reservations
        SET status = 'EXPIRED',
            updated_at = NOW(),
            detail = $4
      WHERE product = $1
        AND order_id = $2
        AND profile = $3
        AND status IN ('RESERVED', 'UNCERTAIN', 'COMPLETED')`,
    [
      normalizeProduct(rawContext.product),
      normalizeOrderId(rawContext.orderId),
      String(rawContext.profile || "unknown").trim().slice(0, 80),
      String(detail || "manual_admin_reset").replace(/[\r\n\t]+/g, " ").slice(0, 400),
    ],
  );
  return result.rowCount ?? 0;
}

export async function getAICostBudgetSnapshot(
  rawContext: Pick<AICostBudgetContext, "product" | "orderId" | "profile">,
): Promise<AICostBudgetSpendSnapshot> {
  await ensureBudgetTables();
  const { pool } = await import("./db");
  return readSpendSnapshot(pool, {
    ...rawContext,
    product: normalizeProduct(rawContext.product),
    orderId: normalizeOrderId(rawContext.orderId),
  });
}

export async function getAICostBudgetSummary(product = "peptides"): Promise<Record<string, unknown>> {
  await ensureBudgetTables();
  const normalizedProduct = normalizeProduct(product);
  const { pool } = await import("./db");
  const effective = effectiveCostSql("r");
  const [orders, hours, days, alerts] = await Promise.all([
    pool.query(
      `SELECT order_id, COUNT(*) AS calls, COALESCE(SUM(${effective}), 0) AS usd,
              MAX(created_at) AS last_call_at
       FROM ai_cost_budget_reservations r
       WHERE product = $1 AND status IN ('RESERVED','COMPLETED','UNCERTAIN')
       GROUP BY order_id ORDER BY usd DESC LIMIT 100`,
      [normalizedProduct],
    ),
    pool.query(
      `WITH costs AS (
         SELECT r.created_at, ${effective} AS usd
         FROM ai_cost_budget_reservations r
         WHERE r.product = $1 AND r.status IN ('RESERVED','COMPLETED','UNCERTAIN')
         UNION ALL
         SELECT e.created_at, e.estimated_openai_cost_usd AS usd
         FROM ai_usage_events e
         WHERE e.profile = $1
           AND NOT EXISTS (
             SELECT 1 FROM ai_cost_budget_reservations r WHERE r.response_id = e.response_id
           )
       )
       SELECT TO_CHAR(DATE_TRUNC('hour', created_at AT TIME ZONE 'Asia/Dubai'), 'YYYY-MM-DD HH24:00') AS hour,
              COUNT(*) AS calls, COALESCE(SUM(usd), 0) AS usd
       FROM costs GROUP BY hour ORDER BY hour DESC LIMIT 48`,
      [normalizedProduct],
    ),
    pool.query(
      `WITH costs AS (
         SELECT r.created_at, ${effective} AS usd
         FROM ai_cost_budget_reservations r
         WHERE r.product = $1 AND r.status IN ('RESERVED','COMPLETED','UNCERTAIN')
         UNION ALL
         SELECT e.created_at, e.estimated_openai_cost_usd AS usd
         FROM ai_usage_events e
         WHERE e.profile = $1
           AND NOT EXISTS (
             SELECT 1 FROM ai_cost_budget_reservations r WHERE r.response_id = e.response_id
           )
       )
       SELECT TO_CHAR(created_at AT TIME ZONE 'Asia/Dubai', 'YYYY-MM-DD') AS day,
              COUNT(*) AS calls, COALESCE(SUM(usd), 0) AS usd
       FROM costs GROUP BY day ORDER BY day DESC LIMIT 31`,
      [normalizedProduct],
    ),
    pool.query(
      `SELECT id, created_at, order_id, profile, label, blocked_dimension,
              projected_order_usd, projected_hour_usd, projected_day_usd, limit_usd
       FROM ai_cost_budget_alerts
       WHERE product = $1 AND acknowledged_at IS NULL
       ORDER BY created_at DESC LIMIT 100`,
      [normalizedProduct],
    ),
  ]);
  const number = (value: unknown) => Number.isFinite(Number(value)) ? Number(value) : 0;
  return {
    product: normalizedProduct,
    currency: "USD",
    limits: getAICostBudgetLimits(normalizedProduct),
    byOrder: orders.rows.map((row: any) => ({
      orderId: row.order_id,
      calls: number(row.calls),
      usd: number(row.usd),
      lastCallAt: row.last_call_at,
    })),
    byHourDubai: hours.rows.map((row: any) => ({
      hour: row.hour,
      calls: number(row.calls),
      usd: number(row.usd),
    })),
    byDayDubai: days.rows.map((row: any) => ({
      day: row.day,
      calls: number(row.calls),
      usd: number(row.usd),
    })),
    unacknowledgedAlerts: alerts.rows.map((row: any) => ({
      id: row.id,
      createdAt: row.created_at,
      orderId: row.order_id,
      profile: row.profile,
      label: row.label,
      blockedDimension: row.blocked_dimension,
      projectedOrderUsd: number(row.projected_order_usd),
      projectedHourUsd: number(row.projected_hour_usd),
      projectedDayUsd: number(row.projected_day_usd),
      limitUsd: number(row.limit_usd),
    })),
  };
}
