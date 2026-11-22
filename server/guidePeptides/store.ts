/**
 * Guide Peptides : persistance des achats (une ligne par session Stripe).
 *
 * La ligne est insérée une seule fois (ON CONFLICT DO NOTHING) : le webhook et
 * la page de retour peuvent se croiser, un seul des deux envoie l'email.
 */
import type { Pool } from "pg";
import { GUIDE_PEPTIDES_BONUS_CODE } from "./config";

async function getPool(): Promise<Pool> {
  const { pool } = await import("../db");
  return pool;
}

export const normalizeEmail = (email: string) => String(email || "").trim().toLowerCase();

export const GUIDE_PEPTIDES_DDL = `
CREATE TABLE IF NOT EXISTS guide_peptides_purchases (
  id varchar(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_session_id varchar(255) NOT NULL UNIQUE,
  stripe_payment_intent_id varchar(255),
  order_number varchar(32) NOT NULL,
  email varchar(255) NOT NULL,
  amount_cents integer NOT NULL,
  currency varchar(8) NOT NULL DEFAULT 'eur',
  delivery_email_sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS guide_peptides_purchases_email_idx ON guide_peptides_purchases (email, created_at DESC);
`;

/**
 * Code acheteur BOOKPEPTIDES99, limité à Peptides Engine. La réduction réelle
 * (99 € fixes) est appliquée par le code (server/peptidesFlatPromos.ts) ; le
 * pourcentage stocké ne sert qu'à l'affichage admin et doit rester sous 100.
 * Insertion idempotente : un code désactivé ou modifié depuis l'admin n'est jamais écrasé.
 */
export const GUIDE_PEPTIDES_PROMO_SEED_SQL = `
INSERT INTO promo_codes (code, discount_percent, description, valid_for)
VALUES ('${GUIDE_PEPTIDES_BONUS_CODE}', 33, '99 EUR fixes sur Peptides Engine, offert aux acheteurs du Guide Peptides', 'PEPTIDES_ENGINE')
ON CONFLICT (code) DO NOTHING
`;

let tablesReady: Promise<void> | null = null;

export function ensureGuidePeptidesTables(): Promise<void> {
  if (!tablesReady) {
    tablesReady = (async () => {
      const pool = await getPool();
      await pool.query(GUIDE_PEPTIDES_DDL);
    })().catch((error) => {
      tablesReady = null;
      throw error;
    });
  }
  return tablesReady;
}

/** Crée le code BOOKPEPTIDES99 s'il n'existe pas encore (table promo_codes existante uniquement). */
export async function ensureGuidePeptidesPromoCode(): Promise<boolean> {
  const pool = await getPool();
  const exists = await pool.query(`SELECT to_regclass('public.promo_codes') AS t`);
  if (!exists.rows[0]?.t) return false;
  await pool.query(GUIDE_PEPTIDES_PROMO_SEED_SQL);
  return true;
}

export interface GuidePurchaseInput {
  stripeSessionId: string;
  paymentIntentId: string | null;
  orderNumber: string;
  email: string;
  amountCents: number;
  currency: string;
}

export async function recordGuidePurchase(input: GuidePurchaseInput): Promise<{ created: boolean }> {
  const email = normalizeEmail(input.email);
  if (!email || !input.stripeSessionId) throw new Error("GUIDE_PEPTIDES_PURCHASE_INVALID");
  await ensureGuidePeptidesTables();
  const pool = await getPool();
  const inserted = await pool.query(
    `INSERT INTO guide_peptides_purchases (stripe_session_id, stripe_payment_intent_id, order_number, email, amount_cents, currency)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (stripe_session_id) DO NOTHING
     RETURNING id`,
    [input.stripeSessionId, input.paymentIntentId, input.orderNumber, email, input.amountCents, input.currency || "eur"],
  );
  return { created: (inserted.rowCount ?? 0) === 1 };
}

export async function markGuideDeliveryEmailSent(stripeSessionId: string): Promise<void> {
  await ensureGuidePeptidesTables();
  const pool = await getPool();
  await pool.query(`UPDATE guide_peptides_purchases SET delivery_email_sent_at = now() WHERE stripe_session_id = $1`, [stripeSessionId]);
}

export interface GuidePurchaseRow {
  stripeSessionId: string;
  orderNumber: string;
  email: string;
}

export async function getGuidePurchase(stripeSessionId: string, email: string): Promise<GuidePurchaseRow | null> {
  await ensureGuidePeptidesTables();
  const pool = await getPool();
  const row = (await pool.query(
    `SELECT stripe_session_id, order_number, email FROM guide_peptides_purchases WHERE stripe_session_id = $1 AND email = $2`,
    [stripeSessionId, normalizeEmail(email)],
  )).rows[0];
  return row ? { stripeSessionId: row.stripe_session_id, orderNumber: row.order_number, email: row.email } : null;
}

export async function getLatestGuidePurchaseForEmail(email: string): Promise<GuidePurchaseRow | null> {
  await ensureGuidePeptidesTables();
  const pool = await getPool();
  const row = (await pool.query(
    `SELECT stripe_session_id, order_number, email FROM guide_peptides_purchases WHERE email = $1 ORDER BY created_at DESC LIMIT 1`,
    [normalizeEmail(email)],
  )).rows[0];
  return row ? { stripeSessionId: row.stripe_session_id, orderNumber: row.order_number, email: row.email } : null;
}
