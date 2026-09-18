import { pool } from "../server/db";

const statements = [
  `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_email_tracking_recipient_lower_type_sent
     ON email_tracking (LOWER(recipient_email), email_type, sent_at DESC)`,
  `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_email_lower_product_status_created
     ON orders (LOWER(email), product_type, status, created_at DESC)`,
  `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_email_unsubscribes_email_lower
     ON email_unsubscribes (LOWER(email))`,
  `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cta_tracking_email_event
     ON cta_tracking (email_tracking_id, event_type)`,
];

async function main(): Promise<void> {
  for (const statement of statements) {
    const name = statement.match(/EXISTS\s+([a-z0-9_]+)/i)?.[1] || "unknown_index";
    const startedAt = Date.now();
    await pool.query(statement);
    console.log(`[PrePeptidesFollowupIndexes] ${name} ready in ${Date.now() - startedAt}ms`);
  }
}

main()
  .then(() => pool.end())
  .catch(async (error) => {
    console.error("[PrePeptidesFollowupIndexes] failed", error instanceof Error ? error.message : error);
    await pool.end().catch(() => undefined);
    process.exit(1);
  });
