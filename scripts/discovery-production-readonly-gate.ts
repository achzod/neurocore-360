import assert from "node:assert/strict";
import { Client } from "pg";

import { DISCOVERY_REASONING_EFFORT } from "../server/openaiResponses";
import { getDiscoveryAutomationStartAt } from "../server/discoveryAutomationPolicy";

const TARGET_AUDIT_IDS = [
  "dd5fe306-d9d4-4370-98cc-9c4e74f9c729", // Bilal
  "0874317e-3b18-4e00-b597-063e73d7680e", // Sekou Konate
] as const;

function enabled(name: string): boolean {
  return String(process.env[name] || "").trim().toLowerCase() === "true";
}

async function main(): Promise<void> {
  const databaseUrl = String(process.env.DATABASE_URL || "").trim();
  assert.ok(databaseUrl, "DATABASE_URL_REQUIRED");
  assert.equal(process.env.OPENAI_REPORT_MODEL || "gpt-5.6-sol", "gpt-5.6-sol");
  assert.equal(DISCOVERY_REASONING_EFFORT, "high");

  const expectedAutomation = String(process.env.DISCOVERY_GATE_EXPECT_AUTOMATION || "off")
    .trim()
    .toLowerCase();
  assert.ok(expectedAutomation === "off" || expectedAutomation === "on", "INVALID_AUTOMATION_EXPECTATION");

  const flags = {
    unifiedGeneration: enabled("DISCOVERY_UNIFIED_GENERATION_ENABLED"),
    transactionalAutomation: enabled("DISCOVERY_TRANSACTIONAL_AUTOMATION_ENABLED"),
    reportDelivery: enabled("DISCOVERY_REPORT_DELIVERY_ENABLED"),
    batchDeliveryWorker: enabled("DISCOVERY_BATCH_DELIVERY_WORKER_ENABLED"),
    sentRemediation: enabled("DISCOVERY_SENT_REMEDIATION_ENABLED"),
    regeneratedNotification: enabled("DISCOVERY_REGENERATED_NOTIFICATION_ENABLED"),
  };
  if (expectedAutomation === "off") {
    assert.equal(flags.unifiedGeneration, false, "UNIFIED_GENERATION_MUST_STAY_OFF_DURING_PREFLIGHT");
    assert.equal(flags.transactionalAutomation, false, "TRANSACTIONAL_AUTOMATION_MUST_STAY_OFF_DURING_PREFLIGHT");
    assert.equal(flags.reportDelivery, false, "REPORT_DELIVERY_MUST_STAY_OFF_DURING_PREFLIGHT");
  } else {
    assert.equal(flags.unifiedGeneration, true, "UNIFIED_GENERATION_NOT_ENABLED");
    assert.equal(flags.transactionalAutomation, true, "TRANSACTIONAL_AUTOMATION_NOT_ENABLED");
    assert.equal(flags.reportDelivery, true, "REPORT_DELIVERY_NOT_ENABLED");
    assert.ok(getDiscoveryAutomationStartAt(), "DISCOVERY_AUTOMATION_START_AT_INVALID");
  }
  assert.equal(flags.batchDeliveryWorker, false, "BATCH_DELIVERY_WORKER_MUST_STAY_OFF");
  assert.equal(flags.sentRemediation, false, "SENT_REMEDIATION_MUST_STAY_OFF");
  assert.equal(flags.regeneratedNotification, false, "REGENERATED_NOTIFICATION_MUST_STAY_OFF");

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    await client.query("BEGIN READ ONLY");
    await client.query("SET LOCAL statement_timeout = '20s'");

    const schema = await client.query<{ table_name: string }>(
      `SELECT table_name
         FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = ANY($1::text[])
        ORDER BY table_name`,
      [[
        "audits",
        "report_artifacts",
        "report_jobs",
        "discovery_operation_lock",
        "discovery_batch_runs",
        "discovery_batch_items",
        "discovery_email_delivery_claims",
        "discovery_rejected_candidates",
        "discovery_offline_replay_proofs",
        "email_tracking",
      ]],
    );
    assert.equal(schema.rowCount, 10, "DISCOVERY_SCHEMA_INCOMPLETE");

    const targets = await client.query<{
      id: string;
      created_at: Date;
      report_delivery_status: string;
      report_sent_at: Date | null;
      active_artifacts: string;
      active_jobs: string;
      delivery_claims: string;
      tracking_rows: string;
    }>(
      `SELECT a.id, a.created_at, a.report_delivery_status, a.report_sent_at,
              (SELECT COUNT(*) FROM report_artifacts ra
                WHERE ra.audit_id = a.id AND ra.artifact_state = 'ACTIVE')::text AS active_artifacts,
              (SELECT COUNT(*) FROM report_jobs rj
                WHERE rj.audit_id = a.id AND rj.status IN ('pending','generating'))::text AS active_jobs,
              (SELECT COUNT(*) FROM discovery_email_delivery_claims dc
                WHERE dc.audit_id = a.id)::text AS delivery_claims,
              (SELECT COUNT(*) FROM email_tracking et
                WHERE et.audit_id = a.id)::text AS tracking_rows
         FROM audits a
        WHERE a.id = ANY($1::text[])
        ORDER BY a.created_at`,
      [TARGET_AUDIT_IDS],
    );
    assert.equal(targets.rowCount, TARGET_AUDIT_IDS.length, "TARGET_AUDIT_MISSING");
    for (const row of targets.rows) {
      assert.equal(row.report_delivery_status, "BATCH_READY", `${row.id}:NOT_BATCH_READY`);
      assert.equal(row.report_sent_at, null, `${row.id}:ALREADY_SENT`);
      assert.equal(Number(row.active_artifacts), 1, `${row.id}:ACTIVE_ARTIFACT_COUNT`);
      assert.equal(Number(row.active_jobs), 0, `${row.id}:ACTIVE_JOB_PRESENT`);
      assert.equal(Number(row.delivery_claims), 0, `${row.id}:DELIVERY_CLAIM_PRESENT`);
      assert.equal(Number(row.tracking_rows), 0, `${row.id}:TRACKING_ROW_PRESENT`);
    }

    const state = await client.query<{
      max_created_at: Date | null;
      batch_ready_count: string;
      active_discovery_jobs: string;
      active_global_locks: string;
    }>(
      `SELECT
         (SELECT MAX(created_at) FROM audits WHERE type = 'GRATUIT') AS max_created_at,
         (SELECT COUNT(*) FROM audits
           WHERE type = 'GRATUIT' AND report_delivery_status = 'BATCH_READY'
             AND report_sent_at IS NULL)::text AS batch_ready_count,
         (SELECT COUNT(*) FROM report_jobs rj JOIN audits a ON a.id = rj.audit_id
           WHERE a.type = 'GRATUIT' AND rj.status IN ('pending','generating'))::text AS active_discovery_jobs,
         (SELECT COUNT(*) FROM discovery_operation_lock
           WHERE expires_at > NOW())::text AS active_global_locks`,
    );
    assert.equal(Number(state.rows[0].active_discovery_jobs), 0, "ACTIVE_DISCOVERY_JOB_PRESENT");
    assert.equal(Number(state.rows[0].active_global_locks), 0, "ACTIVE_DISCOVERY_GLOBAL_LOCK_PRESENT");

    const cutoff = getDiscoveryAutomationStartAt();
    if (expectedAutomation === "on") {
      assert.ok(cutoff, "DISCOVERY_CUTOFF_REQUIRED");
      assert.ok(
        targets.rows.every((row) => row.created_at.getTime() < cutoff.getTime()),
        "TARGET_AUDIT_NOT_BEFORE_CUTOFF",
      );
    }

    await client.query("ROLLBACK");
    console.log(`DISCOVERY_PRODUCTION_READONLY_GATE_PASS ${JSON.stringify({
      database: "connected",
      reasoningEffort: DISCOVERY_REASONING_EFFORT,
      flags,
      cutoff: cutoff?.toISOString() || null,
      maxDiscoveryCreatedAt: state.rows[0].max_created_at?.toISOString() || null,
      batchReadyCount: Number(state.rows[0].batch_ready_count),
      targets: targets.rows.map((row) => ({
        id: row.id,
        createdAt: row.created_at.toISOString(),
        status: row.report_delivery_status,
        activeArtifacts: Number(row.active_artifacts),
      })),
    })}`);
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error("DISCOVERY_PRODUCTION_READONLY_GATE_FAIL", error instanceof Error ? error.message : String(error));
  process.exit(1);
});
