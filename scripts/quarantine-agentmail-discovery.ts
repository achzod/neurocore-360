import assert from "node:assert/strict";
import { Client } from "pg";

function parseArgs(): { apply: boolean; since: string; marker: string } {
  const argv = process.argv.slice(2);
  let apply = false;
  let since = "2026-08-26T08:30:00Z";
  let marker = "apex-hotfix-agentmail-quarantine";

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--apply") {
      apply = true;
    } else if (arg === "--dry-run") {
      apply = false;
    } else if (arg === "--since") {
      const value = argv[index + 1];
      assert.ok(value, "SINCE_VALUE_REQUIRED");
      since = value;
      index += 1;
    } else if (arg === "--marker") {
      const value = argv[index + 1];
      assert.ok(value, "MARKER_VALUE_REQUIRED");
      marker = value;
      index += 1;
    } else {
      throw new Error(`UNKNOWN_ARG:${arg}`);
    }
  }

  assert.ok(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(since), "SINCE_MUST_BE_UTC_ISO");
  assert.ok(marker.length > 0 && marker.length <= 80, "MARKER_INVALID");
  return { apply, since, marker };
}

async function grouped(client: Client, since: string) {
  const audits = await client.query(
    `SELECT COALESCE(report_delivery_status,'NULL') AS status,
            COUNT(*)::int AS count,
            COUNT(*) FILTER (WHERE report_sent_at IS NOT NULL)::int AS sent
       FROM audits
      WHERE type='GRATUIT'
        AND created_at >= $1::timestamptz
        AND lower(split_part(email,'@',2))='agentmail.to'
      GROUP BY 1
      ORDER BY 1`,
    [since],
  );
  const jobs = await client.query(
    `SELECT COALESCE(j.status,'NULL') AS status, COUNT(*)::int AS count
       FROM report_jobs j
       JOIN audits a ON a.id=j.audit_id
      WHERE a.type='GRATUIT'
        AND a.created_at >= $1::timestamptz
        AND lower(split_part(a.email,'@',2))='agentmail.to'
      GROUP BY 1
      ORDER BY 1`,
    [since],
  );
  return { audits: audits.rows, jobs: jobs.rows };
}

async function main(): Promise<void> {
  const { apply, since, marker } = parseArgs();
  const databaseUrl = String(process.env.DATABASE_URL || "").trim();
  assert.ok(databaseUrl, "DATABASE_URL_REQUIRED");

  const client = new Client({
    connectionString: databaseUrl,
    ssl: databaseUrl.includes("render.com") || databaseUrl.includes("neon.tech")
      ? { rejectUnauthorized: false }
      : false,
  });
  await client.connect();

  try {
    await client.query("BEGIN");
    await client.query("SET LOCAL statement_timeout = '30s'");

    const before = await grouped(client, since);
    let closedJobs = { rowCount: 0 };
    let quarantinedAudits = { rowCount: 0 };

    if (apply) {
      closedJobs = await client.query(
        `UPDATE report_jobs AS j
            SET status='failed',
                progress=100,
                current_section='Blocked disposable Discovery submission',
                error='DISCOVERY_TEST_EMAIL_BLOCKED',
                updated_at=NOW(),
                last_progress_at=NOW(),
                completed_at=NOW()
           FROM audits AS a
          WHERE a.id=j.audit_id
            AND a.type='GRATUIT'
            AND a.created_at >= $1::timestamptz
            AND lower(split_part(a.email,'@',2))='agentmail.to'
            AND j.status IN ('pending','generating')`,
        [since],
      );

      quarantinedAudits = await client.query(
        `UPDATE audits
            SET report_delivery_status='SUPERSEDED',
                report_scheduled_for=NULL,
                narrative_report=COALESCE(narrative_report,'{}'::jsonb)
                  || jsonb_build_object('recovery', jsonb_build_object(
                    'disposition','superseded',
                    'reason','test_email_blocked_agentmail_flood',
                    'resolvedAt', to_char(NOW() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
                    'resolvedBy', $2
                  ))
          WHERE type='GRATUIT'
            AND created_at >= $1::timestamptz
            AND lower(split_part(email,'@',2))='agentmail.to'
            AND report_sent_at IS NULL
            AND COALESCE(report_delivery_status,'') <> 'SUPERSEDED'`,
        [since, marker],
      );
    }

    const after = await grouped(client, since);
    await client.query(apply ? "COMMIT" : "ROLLBACK");
    console.log(`APEX_DISCOVERY_AGENTMAIL_QUARANTINE ${JSON.stringify({
      apply,
      since,
      marker,
      updatedAudits: quarantinedAudits.rowCount ?? 0,
      closedJobs: closedJobs.rowCount ?? 0,
      before,
      after,
    })}`);
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    await client.end().catch(() => {});
  }
}

main().catch((error) => {
  console.error(`APEX_DISCOVERY_AGENTMAIL_QUARANTINE_FAIL ${error instanceof Error ? error.stack : String(error)}`);
  process.exitCode = 1;
});
