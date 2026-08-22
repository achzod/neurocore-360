export type PaidAuditRecoveryOrder = {
  id: string;
  status: string;
  productType: string;
  auditId: string | null;
};

export type PaidAuditRecoveryAudit = {
  id: string;
  type: string;
  reportDeliveryStatus: string | null;
  reportSentAt?: Date | string | null;
};

export type PaidAuditRecoveryJob = {
  status: string;
};

export function needsPaidAuditRecovery(order: PaidAuditRecoveryOrder): boolean {
  return order.status === "paid"
    && order.auditId === null
    && (order.productType === "PREMIUM" || order.productType === "ELITE");
}

/**
 * Detect the two durable crash windows after an audit has already been linked:
 * 1. the process died before the audit generation CAS / job insert;
 * 2. the process died after setting GENERATING or inserting a pending job, but
 *    before a worker actually started it.
 *
 * Active, completed and delivery-ready states are deliberately excluded. An
 * inconsistent state fails closed instead of spending for a second report.
 */
export function needsPaidAuditGenerationRecovery(
  order: PaidAuditRecoveryOrder,
  audit: PaidAuditRecoveryAudit | null | undefined,
  job: PaidAuditRecoveryJob | null | undefined,
): boolean {
  if (
    order.status !== "paid"
    || !order.auditId
    || (order.productType !== "PREMIUM" && order.productType !== "ELITE")
    || !audit
    || audit.id !== order.auditId
    || audit.type !== order.productType
    || audit.reportSentAt
  ) {
    return false;
  }

  if (audit.reportDeliveryStatus === "PENDING") {
    return !job || job.status === "pending";
  }
  if (audit.reportDeliveryStatus === "GENERATING") {
    return !job || job.status === "pending";
  }
  return false;
}

type OrderEffectPool = {
  query: (
    text: string,
    values?: unknown[],
  ) => Promise<{ rowCount?: number | null; rows?: unknown[] }>;
};

export type OrderEffectOutcome = {
  state: "SKIPPED" | "ACCEPTED" | "FAILED" | "UNKNOWN";
  error?: unknown;
};

async function finalizeOrderEffect(
  pool: OrderEffectPool,
  orderId: string,
  flagName: string,
  state: "ACCEPTED" | "FAILED" | "UNKNOWN",
): Promise<void> {
  const result = await pool.query(
    `UPDATE orders
        SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
              $1::text,
              CASE WHEN $3::text = 'ACCEPTED'
                   THEN 'true'::jsonb
                   ELSE to_jsonb($3::text)
              END
            ),
            updated_at = NOW()
      WHERE id = $2
        AND metadata->>$1::text = 'SENDING'
      RETURNING id`,
    [flagName, orderId, state],
  );
  if ((result.rowCount ?? 0) !== 1) {
    throw new Error(`ORDER_EFFECT_FINALIZE_CAS_FAILED:${flagName}`);
  }
}

/**
 * Fail-closed one-shot side effect. The SENDING claim is persisted before the
 * provider call, so concurrent browser/webhook paths cannot both send. A
 * thrown/ambiguous provider outcome becomes UNKNOWN and is never blindly
 * retried; an explicit false is FAILED and may be retried safely.
 */
export async function runOrderEffectOnce(
  pool: OrderEffectPool,
  orderId: string,
  flagName: string,
  op: () => Promise<void | boolean>,
): Promise<OrderEffectOutcome> {
  const claimed = await pool.query(
    `UPDATE orders
        SET metadata = COALESCE(metadata, '{}'::jsonb)
                       || jsonb_build_object($1::text, to_jsonb('SENDING'::text)),
            updated_at = NOW()
      WHERE id = $2
        AND COALESCE(metadata->>$1::text, '') IN ('', 'false', 'FAILED')
      RETURNING id`,
    [flagName, orderId],
  );
  if ((claimed.rowCount ?? 0) !== 1) return { state: "SKIPPED" };

  try {
    const completed = await op();
    const state = completed === false ? "FAILED" : "ACCEPTED";
    await finalizeOrderEffect(pool, orderId, flagName, state);
    return { state };
  } catch (error) {
    await finalizeOrderEffect(pool, orderId, flagName, "UNKNOWN");
    return { state: "UNKNOWN", error };
  }
}

type AdvisoryLockClient = {
  query: (text: string, values?: unknown[]) => Promise<unknown>;
  release: () => void;
};

type AdvisoryLockPool = {
  connect: () => Promise<AdvisoryLockClient>;
};

/**
 * Serialize paid-audit creation for one order across HTTP retries, webhook
 * redeliveries and multiple application instances. The lock is session-scoped,
 * so it also protects storage calls that use a different PostgreSQL pool.
 */
export async function withPaidAuditOrderLock<T>(
  pool: AdvisoryLockPool,
  orderId: string,
  work: () => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  const lockKey = `paid-audit:${orderId}`;
  let acquired = false;

  try {
    await client.query(
      "SELECT pg_advisory_lock(hashtextextended($1::text, 0))",
      [lockKey],
    );
    acquired = true;
    return await work();
  } finally {
    if (acquired) {
      await client.query(
        "SELECT pg_advisory_unlock(hashtextextended($1::text, 0))",
        [lockKey],
      ).catch(() => undefined);
    }
    client.release();
  }
}
