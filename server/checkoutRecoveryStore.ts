/**
 * Accès Postgres de la relance des paiements abandonnés.
 * La table est créée au premier passage du cron (CREATE TABLE IF NOT EXISTS),
 * uniquement quand CHECKOUT_RECOVERY_ENABLED=1.
 */
import type {
  CheckoutRecoveryDeps,
  RecoveryOrder,
  RecoverySequence,
  RecoveryStep,
} from "./checkoutRecovery";
import {
  CHECKOUT_RECOVERY_EMAIL_TYPE,
  buildCheckoutRecoveryEmail,
  normalizeRecoveryEmail,
  recoveryProductLabel,
} from "./checkoutRecovery";

type Queryable = {
  query: (text: string, values?: unknown[]) => Promise<{ rows: any[]; rowCount?: number | null }>;
};

let tableEnsured = false;

export async function ensureCheckoutRecoveryTable(pool: Queryable): Promise<void> {
  if (tableEnsured) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS checkout_recovery_sequences (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email VARCHAR(255) NOT NULL,
      product_type VARCHAR(30) NOT NULL,
      order_id VARCHAR(36) NOT NULL,
      abandoned_at TIMESTAMPTZ NOT NULL,
      token VARCHAR(64) NOT NULL UNIQUE,
      step1_sent_at TIMESTAMPTZ,
      step1_ok BOOLEAN,
      step1_tracking_id VARCHAR(36),
      step2_sent_at TIMESTAMPTZ,
      step2_ok BOOLEAN,
      step2_tracking_id VARCHAR(36),
      clicked_at TIMESTAMPTZ,
      recovered_order_id VARCHAR(36),
      stopped_at TIMESTAMPTZ,
      stop_reason VARCHAR(50),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT checkout_recovery_one_per_email_product UNIQUE (email, product_type)
    )
  `);
  tableEnsured = true;
}

export function rowToRecoverySequence(row: any): RecoverySequence {
  return {
    id: String(row.id),
    email: String(row.email),
    productType: String(row.product_type),
    orderId: String(row.order_id),
    abandonedAt: new Date(row.abandoned_at),
    token: String(row.token),
    step1SentAt: row.step1_sent_at ? new Date(row.step1_sent_at) : null,
    step2SentAt: row.step2_sent_at ? new Date(row.step2_sent_at) : null,
    stoppedAt: row.stopped_at ? new Date(row.stopped_at) : null,
    stopReason: row.stop_reason ?? null,
  };
}

export function rowToRecoveryOrder(row: any): RecoveryOrder {
  return {
    id: String(row.id),
    email: String(row.email || ""),
    productType: String(row.product_type || row.productType || ""),
    productName: row.product_name ?? row.productName ?? null,
    status: String(row.status || ""),
    amountCents: Number(row.amount_cents ?? row.amountCents ?? 0),
    discountCents: Number(row.discount_cents ?? row.discountCents ?? 0),
    finalAmountCents: Number(row.final_amount_cents ?? row.finalAmountCents ?? 0),
    promoCode: row.promo_code ?? row.promoCode ?? null,
    promoCodeId: row.promo_code_id ?? row.promoCodeId ?? null,
    stripeCheckoutSessionId: row.stripe_checkout_session_id ?? row.stripeCheckoutSessionId ?? null,
    createdAt: row.created_at ?? row.createdAt,
    paidAt: row.paid_at ?? row.paidAt ?? null,
    metadata: (row.metadata as Record<string, any>) ?? null,
  };
}

export async function getRecoverySequenceByToken(pool: Queryable, token: string): Promise<RecoverySequence | null> {
  if (!/^[0-9a-f]{32,64}$/i.test(token)) return null;
  await ensureCheckoutRecoveryTable(pool);
  const res = await pool.query(`SELECT * FROM checkout_recovery_sequences WHERE token = $1 LIMIT 1`, [token]);
  return res.rows[0] ? rowToRecoverySequence(res.rows[0]) : null;
}

export async function getRecoveryStepTrackingIds(pool: Queryable, sequenceId: string): Promise<string[]> {
  const res = await pool.query(
    `SELECT step1_tracking_id, step2_tracking_id FROM checkout_recovery_sequences WHERE id = $1`,
    [sequenceId],
  );
  const row = res.rows[0] || {};
  return [row.step2_tracking_id, row.step1_tracking_id].filter(Boolean).map(String);
}

export async function markRecoveryClicked(pool: Queryable, sequenceId: string): Promise<void> {
  await pool.query(
    `UPDATE checkout_recovery_sequences SET clicked_at = COALESCE(clicked_at, NOW()) WHERE id = $1`,
    [sequenceId],
  );
  const trackingIds = await getRecoveryStepTrackingIds(pool, sequenceId);
  if (trackingIds[0]) {
    await pool.query(`UPDATE email_tracking SET clicked = NOW() WHERE id = $1 AND clicked IS NULL`, [trackingIds[0]]);
  }
}

export async function markRecoveryCheckoutCreated(pool: Queryable, sequenceId: string, newOrderId: string): Promise<void> {
  await pool.query(
    `UPDATE checkout_recovery_sequences SET recovered_order_id = $2 WHERE id = $1`,
    [sequenceId, newOrderId],
  );
}

export function createPgCheckoutRecoveryDeps(options: {
  pool: Queryable;
  baseUrl: string;
  isUnsubscribed: (email: string) => Promise<boolean>;
  createEmailTracking: (auditId: string, emailType: string, email: string) => Promise<{ id: string }>;
  sendEmail: (input: {
    email: string;
    subject: string;
    text: string;
    html: string;
    trackingId: string;
    orderId: string;
    productType: string;
    step: RecoveryStep;
    sequenceId: string;
  }) => Promise<boolean>;
}): CheckoutRecoveryDeps {
  const { pool } = options;
  return {
    async listCandidateOrders(cutoff: Date) {
      await ensureCheckoutRecoveryTable(pool);
      const res = await pool.query(
        `SELECT id, email, product_type, product_name, status, amount_cents, discount_cents,
                final_amount_cents, promo_code, promo_code_id, stripe_checkout_session_id,
                created_at, paid_at, metadata
           FROM orders
          WHERE status IN ('pending', 'cancelled')
            AND stripe_checkout_session_id IS NOT NULL
            AND product_type <> 'GRATUIT'
            AND final_amount_cents > 0
            AND created_at >= $1
          ORDER BY created_at DESC
          LIMIT 500`,
        [cutoff],
      );
      return res.rows.map(rowToRecoveryOrder);
    },
    async listOrdersForEmail(email: string) {
      const res = await pool.query(
        `SELECT id, email, product_type, product_name, status, amount_cents, discount_cents,
                final_amount_cents, promo_code, promo_code_id, stripe_checkout_session_id,
                created_at, paid_at, metadata
           FROM orders
          WHERE LOWER(email) = $1
          ORDER BY created_at DESC
          LIMIT 100`,
        [normalizeRecoveryEmail(email)],
      );
      return res.rows.map(rowToRecoveryOrder);
    },
    async getSequence(email: string, productType: string) {
      const res = await pool.query(
        `SELECT * FROM checkout_recovery_sequences WHERE email = $1 AND product_type = $2 LIMIT 1`,
        [normalizeRecoveryEmail(email), productType],
      );
      return res.rows[0] ? rowToRecoverySequence(res.rows[0]) : null;
    },
    async createSequence(order: RecoveryOrder, token: string) {
      const res = await pool.query(
        `INSERT INTO checkout_recovery_sequences (email, product_type, order_id, abandoned_at, token)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (email, product_type) DO NOTHING
         RETURNING *`,
        [normalizeRecoveryEmail(order.email), order.productType, order.id, new Date(order.createdAt), token],
      );
      return res.rows[0] ? rowToRecoverySequence(res.rows[0]) : null;
    },
    async claimStep(sequenceId: string, step: RecoveryStep, at: Date) {
      const column = step === 1 ? "step1_sent_at" : "step2_sent_at";
      const res = await pool.query(
        `UPDATE checkout_recovery_sequences
            SET ${column} = $2
          WHERE id = $1 AND ${column} IS NULL AND stopped_at IS NULL
          RETURNING id`,
        [sequenceId, at],
      );
      return (res.rowCount ?? res.rows.length) > 0;
    },
    async recordStepResult(sequenceId: string, step: RecoveryStep, ok: boolean, trackingId: string | null) {
      const okColumn = step === 1 ? "step1_ok" : "step2_ok";
      const trackingColumn = step === 1 ? "step1_tracking_id" : "step2_tracking_id";
      await pool.query(
        `UPDATE checkout_recovery_sequences SET ${okColumn} = $2, ${trackingColumn} = $3 WHERE id = $1`,
        [sequenceId, ok, trackingId],
      );
      // Si l'étape 2 rate, la séquence est terminée de toute façon.
      if (step === 2) {
        await pool.query(
          `UPDATE checkout_recovery_sequences
              SET stopped_at = COALESCE(stopped_at, NOW()), stop_reason = COALESCE(stop_reason, $2)
            WHERE id = $1`,
          [sequenceId, ok ? "completed" : "step2_failed"],
        );
      }
    },
    async stopSequence(sequenceId: string, reason: string, at: Date) {
      await pool.query(
        `UPDATE checkout_recovery_sequences
            SET stopped_at = COALESCE(stopped_at, $3), stop_reason = COALESCE(stop_reason, $2)
          WHERE id = $1`,
        [sequenceId, reason, at],
      );
    },
    isUnsubscribed: options.isUnsubscribed,
    async sendStep({ sequence, order, step }) {
      const tracking = await options.createEmailTracking(order.id, CHECKOUT_RECOVERY_EMAIL_TYPE, sequence.email);
      const recoverUrl = `${options.baseUrl}/api/checkout/recover/${sequence.token}`;
      const content = buildCheckoutRecoveryEmail({
        step,
        productLabel: recoveryProductLabel(order),
        priceCents: order.finalAmountCents,
        recoverUrl,
        trackingPixelUrl: `${options.baseUrl}/api/track/email/${tracking.id}/open.gif`,
      });
      const ok = await options.sendEmail({
        email: sequence.email,
        subject: content.subject,
        text: content.text,
        html: content.html,
        trackingId: tracking.id,
        orderId: order.id,
        productType: order.productType,
        step,
        sequenceId: sequence.id,
      });
      return { ok, trackingId: tracking.id };
    },
  };
}
