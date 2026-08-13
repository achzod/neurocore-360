/** Strict read-only, PII-free Discovery remediation manifest for an exact UTC window. */
import { pool } from '../server/db';
import {
  assertSafeDiscoveryWindowItem,
  buildSafeDiscoveryWindowItem,
} from '../server/discoveryWindowManifest';

const argv = process.argv.slice(2);
const valueAfter = (flag: string): string | undefined => {
  const index = argv.indexOf(flag);
  return index >= 0 ? argv[index + 1] : undefined;
};

function exactInstant(flag: string): Date {
  const value = valueAfter(flag);
  if (!value || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value)) {
    throw new Error(`${flag} requires an exact UTC ISO instant`);
  }
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) throw new Error(`${flag} is invalid`);
  return parsed;
}

const since = exactInstant('--since');
const until = exactInstant('--until');
const durationMs = until.getTime() - since.getTime();
if (durationMs <= 0 || durationMs > 31 * 24 * 60 * 60 * 1000) {
  throw new Error('Discovery window must be positive and at most 31 days');
}

const client = await pool.connect();
try {
  await client.query('BEGIN TRANSACTION READ ONLY');
  const result = await client.query(
    `SELECT a.id, a.created_at, a.status, a.report_delivery_status,
            a.report_generated_at, a.report_sent_at, a.responses,
            a.narrative_report, a.report_txt, a.report_html,
            COUNT(t.id)::int AS tracking_total,
            COUNT(t.id) FILTER (WHERE LOWER(COALESCE(t.sendpulse_status, ''))
              IN ('success','accepted','sent','delivered','smtp_confirmed'))::int AS tracking_accepted
       FROM audits a
       LEFT JOIN email_tracking t
         ON t.audit_id = a.id AND t.email_type = 'sendReportReadyEmail'
      WHERE a.type = 'GRATUIT'
        AND a.created_at >= $1::timestamptz
        AND a.created_at < $2::timestamptz
      GROUP BY a.id
      ORDER BY a.created_at ASC, a.id ASC`,
    [since.toISOString(), until.toISOString()],
  );
  const items = result.rows.map(buildSafeDiscoveryWindowItem);
  items.forEach(assertSafeDiscoveryWindowItem);
  const counts = {
    total: items.length,
    premium: items.filter((item) => item.premium).length,
    invalid: items.filter((item) => !item.premium && !item.superseded).length,
    sent: items.filter((item) => item.reportDeliveryStatus === 'SENT').length,
    unsent: items.filter((item) => item.reportDeliveryStatus !== 'SENT' && !item.superseded).length,
    superseded: items.filter((item) => item.superseded).length,
    accepted: items.filter((item) => Number(item.trackingAccepted) > 0).length,
  };
  console.log(JSON.stringify({
    schemaVersion: 1,
    source: 'database_read_only',
    since: since.toISOString(),
    until: until.toISOString(),
    counts,
    items,
  }, null, 2));
  await client.query('ROLLBACK');
} catch (error) {
  await client.query('ROLLBACK').catch(() => {});
  throw error;
} finally {
  client.release();
  await pool.end();
}
