/**
 * Backfill orders table from existing audits & blood reports.
 *
 * Usage: npx tsx scripts/backfill-orders.ts
 *
 * Safe to run multiple times (idempotent via audit_id check).
 */

import { Pool } from "pg";

const DATABASE_URL =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_CONNECTION_STRING;

if (!DATABASE_URL) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL });

const PRODUCT_PRICES: Record<string, number> = {
  GRATUIT: 0,
  PREMIUM: 5900,
  ELITE: 7900,
  BLOOD_ANALYSIS: 9900,
};

const PRODUCT_NAMES: Record<string, string> = {
  GRATUIT: "Discovery Scan",
  PREMIUM: "Anabolic Bioscan",
  ELITE: "Ultimate Scan",
  BLOOD_ANALYSIS: "Blood Analysis",
};

async function main() {
  // Ensure orders table exists
  await pool.query(`
    CREATE TABLE IF NOT EXISTS orders (
      id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id VARCHAR(36),
      email VARCHAR(255) NOT NULL,
      product_type VARCHAR(30) NOT NULL,
      product_name VARCHAR(100) NOT NULL,
      amount_cents INTEGER NOT NULL DEFAULT 0,
      currency VARCHAR(10) NOT NULL DEFAULT 'eur',
      discount_cents INTEGER NOT NULL DEFAULT 0,
      promo_code VARCHAR(50),
      promo_code_id VARCHAR(36),
      final_amount_cents INTEGER NOT NULL DEFAULT 0,
      stripe_checkout_session_id VARCHAR(255),
      stripe_payment_intent_id VARCHAR(255),
      stripe_customer_id VARCHAR(255),
      status VARCHAR(30) NOT NULL DEFAULT 'pending',
      refund_amount_cents INTEGER NOT NULL DEFAULT 0,
      refund_reason TEXT,
      refund_stripe_id VARCHAR(255),
      refunded_at TIMESTAMP,
      refunded_by VARCHAR(255),
      audit_id VARCHAR(36),
      blood_report_id VARCHAR(36),
      ip_address VARCHAR(50),
      user_agent TEXT,
      metadata JSONB,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL,
      paid_at TIMESTAMP,
      updated_at TIMESTAMP DEFAULT NOW() NOT NULL
    )
  `);

  // Backfill from audits
  const auditsResult = await pool.query(
    "SELECT id, user_id, email, type, created_at FROM audits ORDER BY created_at"
  );
  let createdFromAudits = 0;
  let skippedAudits = 0;

  for (const row of auditsResult.rows) {
    // Check if order already exists for this audit
    const existing = await pool.query(
      "SELECT id FROM orders WHERE audit_id = $1",
      [row.id]
    );
    if (existing.rows.length > 0) {
      skippedAudits++;
      continue;
    }

    const productType = row.type as string;
    const priceCents = PRODUCT_PRICES[productType] ?? 0;
    const productName = PRODUCT_NAMES[productType] ?? productType;

    await pool.query(
      `INSERT INTO orders (user_id, email, product_type, product_name, amount_cents, final_amount_cents, status, audit_id, created_at, paid_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'paid', $7, $8, $9, NOW())`,
      [
        row.user_id || null,
        row.email,
        productType,
        productName,
        priceCents,
        priceCents,
        row.id,
        row.created_at,
        row.created_at,
      ]
    );
    createdFromAudits++;
  }

  // Backfill from blood_reports
  let createdFromBlood = 0;
  let skippedBlood = 0;
  try {
    const bloodResult = await pool.query(
      "SELECT id, email, created_at FROM blood_reports ORDER BY created_at"
    );
    for (const row of bloodResult.rows) {
      const existing = await pool.query(
        "SELECT id FROM orders WHERE blood_report_id = $1",
        [row.id]
      );
      if (existing.rows.length > 0) {
        skippedBlood++;
        continue;
      }

      await pool.query(
        `INSERT INTO orders (email, product_type, product_name, amount_cents, final_amount_cents, status, blood_report_id, created_at, paid_at, updated_at)
         VALUES ($1, 'BLOOD_ANALYSIS', 'Blood Analysis', 9900, 9900, 'paid', $2, $3, $4, NOW())`,
        [row.email, row.id, row.created_at, row.created_at]
      );
      createdFromBlood++;
    }
  } catch {
    console.log("No blood_reports table found, skipping.");
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        audits: { created: createdFromAudits, skipped: skippedAudits },
        bloodReports: { created: createdFromBlood, skipped: skippedBlood },
      },
      null,
      2
    )
  );

  await pool.end();
}

main().catch((err) => {
  console.error("Backfill failed:", err);
  process.exit(1);
});
