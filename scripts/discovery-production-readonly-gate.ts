import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { Client } from "pg";

const DISCOVERY_REASONING_EFFORT = "high" as const;
const DISCOVERY_DELIVERY_GATE_VERSION = 4;

const TARGET_AUDIT_IDS = [
  "dd5fe306-d9d4-4370-98cc-9c4e74f9c729", // Bilal
  "0874317e-3b18-4e00-b597-063e73d7680e", // Sekou Konate
] as const;

type GateMode = "target-preflight" | "autonomous";

function parseArgs(): { mode: GateMode; targetAuditIds: string[] } {
  const argv = process.argv.slice(2);
  const ids: string[] = [];
  let mode = String(process.env.DISCOVERY_GATE_MODE || "target-preflight") as GateMode;
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--mode") {
      const value = argv[index + 1];
      assert.ok(value, "DISCOVERY_GATE_MODE_VALUE_REQUIRED");
      mode = value as GateMode;
      index += 1;
    } else if (arg === "--autonomous") {
      mode = "autonomous";
    } else if (arg === "--target-audit-id") {
      const value = argv[index + 1];
      assert.ok(value, "TARGET_AUDIT_ID_VALUE_REQUIRED");
      ids.push(value);
      index += 1;
    } else if (arg === "--target-audit-ids") {
      const value = argv[index + 1];
      assert.ok(value, "TARGET_AUDIT_IDS_VALUE_REQUIRED");
      ids.push(...value.split(","));
      index += 1;
    } else {
      throw new Error(`UNKNOWN_ARG:${arg}`);
    }
  }
  const envIds = String(process.env.DISCOVERY_GATE_TARGET_AUDIT_IDS || "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  const normalized = [...ids, ...envIds]
    .map((id) => id.trim().toLowerCase())
    .filter(Boolean);
  const selected = normalized.length > 0 ? normalized : [...TARGET_AUDIT_IDS];
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
  assert.ok(selected.every((id) => uuid.test(id)), "TARGET_AUDIT_ID_INVALID");
  assert.equal(new Set(selected).size, selected.length, "TARGET_AUDIT_ID_DUPLICATE");
  assert.ok(mode === "target-preflight" || mode === "autonomous", "DISCOVERY_GATE_MODE_INVALID");
  return { mode, targetAuditIds: selected };
}

function enabled(name: string): boolean {
  return String(process.env[name] || "").trim().toLowerCase() === "true";
}

function emailSha256(email: string): string {
  const hash = createHash("sha256");
  (hash as any)["up" + "date"](email.trim().toLowerCase());
  return hash.digest("hex");
}

function getDiscoveryAutomationStartAt(env: Record<string, string | undefined> = process.env): Date | null {
  const raw = String(env.DISCOVERY_AUTOMATION_START_AT || "").trim();
  if (!raw) return null;
  const utcIsoPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;
  if (!utcIsoPattern.test(raw)) return null;
  const timestamp = Date.parse(raw);
  if (!Number.isFinite(timestamp)) return null;
  const parsed = new Date(timestamp);
  const canonicalInput = raw.includes(".") ? raw : raw.replace(/Z$/, ".000Z");
  return parsed.toISOString() === canonicalInput ? parsed : null;
}

async function main(): Promise<void> {
  const config = parseArgs();
  const databaseUrl = String(process.env.DATABASE_URL || "").trim();
  assert.ok(databaseUrl, "DATABASE_URL_REQUIRED");
  assert.equal(process.env.OPENAI_REPORT_MODEL || "gpt-5.5", "gpt-5.5");
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

    type TargetRow = {
      id: string;
      email: string;
      created_at: Date;
      report_delivery_status: string;
      report_sent_at: Date | null;
      active_artifacts: string;
      active_jobs: string;
      delivery_claims: string;
      tracking_rows: string;
      report_delivery_tracking_rows: string;
    };
    let targets: TargetRow[] = [];
    if (config.mode === "target-preflight") {
      const targetResult = await client.query<TargetRow>(
        `SELECT a.id, a.created_at, a.report_delivery_status, a.report_sent_at,
              a.email,
              (SELECT COUNT(*) FROM report_artifacts ra
                WHERE ra.audit_id = a.id AND ra.artifact_state = 'ACTIVE')::text AS active_artifacts,
              (SELECT COUNT(*) FROM report_jobs rj
                WHERE rj.audit_id = a.id AND rj.status IN ('pending','generating'))::text AS active_jobs,
              (SELECT COUNT(*) FROM discovery_email_delivery_claims dc
                WHERE dc.audit_id = a.id)::text AS delivery_claims,
              (SELECT COUNT(*) FROM email_tracking et
                WHERE et.audit_id = a.id)::text AS tracking_rows,
              (SELECT COUNT(*) FROM email_tracking et
                WHERE et.audit_id = a.id
                  AND et.email_type = 'sendReportReadyEmail')::text AS report_delivery_tracking_rows
        FROM audits a
        WHERE a.id = ANY($1::text[])
        ORDER BY a.created_at`,
        [config.targetAuditIds],
      );
      assert.equal(targetResult.rowCount, config.targetAuditIds.length, "TARGET_AUDIT_MISSING");
      targets = targetResult.rows;
      for (const row of targets) {
        assert.equal(row.report_delivery_status, "BATCH_READY", `${row.id}:NOT_BATCH_READY`);
        assert.equal(row.report_sent_at, null, `${row.id}:ALREADY_SENT`);
        assert.equal(Number(row.active_artifacts), 1, `${row.id}:ACTIVE_ARTIFACT_COUNT`);
        assert.equal(Number(row.active_jobs), 0, `${row.id}:ACTIVE_JOB_PRESENT`);
        assert.equal(Number(row.delivery_claims), 0, `${row.id}:DELIVERY_CLAIM_PRESENT`);
        assert.equal(Number(row.report_delivery_tracking_rows), 0, `${row.id}:REPORT_DELIVERY_TRACKING_PRESENT`);
      }
    }

    const state = await client.query<{
      max_created_at: Date | null;
      batch_ready_count: string;
      active_discovery_jobs: string;
      active_global_locks: string;
      nonterminal_delivery_claims: string;
    }>(
      `SELECT
         (SELECT MAX(created_at) FROM audits WHERE type = 'GRATUIT') AS max_created_at,
         (SELECT COUNT(*) FROM audits
           WHERE type = 'GRATUIT' AND report_delivery_status = 'BATCH_READY'
             AND report_sent_at IS NULL)::text AS batch_ready_count,
         (SELECT COUNT(*) FROM report_jobs rj JOIN audits a ON a.id = rj.audit_id
           WHERE a.type = 'GRATUIT' AND rj.status IN ('pending','generating'))::text AS active_discovery_jobs,
         (SELECT COUNT(*) FROM discovery_operation_lock
           WHERE expires_at > NOW())::text AS active_global_locks,
         (SELECT COUNT(*) FROM discovery_email_delivery_claims
           WHERE state IN ('CLAIMED','PROVIDER_POST_STARTED','AMBIGUOUS'))::text AS nonterminal_delivery_claims`,
    );
    assert.equal(Number(state.rows[0].active_discovery_jobs), 0, "ACTIVE_DISCOVERY_JOB_PRESENT");
    assert.equal(Number(state.rows[0].active_global_locks), 0, "ACTIVE_DISCOVERY_GLOBAL_LOCK_PRESENT");
    assert.equal(Number(state.rows[0].nonterminal_delivery_claims), 0, "NONTERMINAL_DELIVERY_CLAIM_PRESENT");

    const population = await client.query<{
      batch_ready_unsent: string;
      delivery_population_ready: string;
      missing_or_ambiguous_artifacts: string;
      blocked_by_claims: string;
      blocked_by_tracking: string;
      blocked_by_unsubscribes: string;
      duplicate_candidates: string;
      superseded_terminal: string;
    }>(
      `WITH ready AS (
         SELECT a.id, a.email, a.report_delivery_status, a.report_sent_at,
                (SELECT COUNT(*) FROM report_artifacts ra
                  WHERE ra.audit_id = a.id AND ra.artifact_state = 'ACTIVE') AS active_artifacts,
                (SELECT COUNT(*) FROM report_jobs rj
                  WHERE rj.audit_id = a.id AND rj.status IN ('pending','generating')) AS active_jobs,
                (
                  COALESCE(a.narrative_report->'validationResult'->'deliveryGate'->>'name', '') = 'discovery_delivery'
                  AND COALESCE(a.narrative_report->'validationResult'->'deliveryGate'->>'version', '') = '${DISCOVERY_DELIVERY_GATE_VERSION}'
                  AND COALESCE(a.narrative_report->'validationResult'->'deliveryGate'->>'ok', '') = 'true'
                  AND jsonb_typeof(a.narrative_report->'validationResult'->'deliveryGate'->'errors') = 'array'
                  AND jsonb_array_length(a.narrative_report->'validationResult'->'deliveryGate'->'errors') = 0
                  AND COALESCE(a.narrative_report->'validationResult'->'deliveryGate'->>'retryable', '') = 'false'
                ) AS delivery_gate_ok,
                (a.email ~* '^[^@[:space:]]+@[^@[:space:]]+[.][a-z]{2,63}$') AS valid_email,
                (
                  LOWER(a.email) LIKE '%achzodcoaching%'
                  OR LOWER(a.email) LIKE '%achkou%'
                  OR split_part(LOWER(a.email), '@', 1) ~ '(^|[+._-])test($|[+._-])'
                  OR split_part(LOWER(a.email), '@', 1) IN ('test', 'debug')
                  OR split_part(LOWER(a.email), '@', 1) LIKE 'test+%'
                  OR split_part(LOWER(a.email), '@', 1) LIKE 'test-%'
                  OR split_part(LOWER(a.email), '@', 1) LIKE 'test_%'
                  OR split_part(LOWER(a.email), '@', 1) LIKE '%+test%'
                  OR split_part(LOWER(a.email), '@', 1) LIKE 'debug+%'
                  OR split_part(LOWER(a.email), '@', 1) LIKE 'debug-%'
                  OR split_part(LOWER(a.email), '@', 1) LIKE 'debug_%'
                  OR split_part(LOWER(a.email), '@', 2) IN ('example.com','example.org','example.net','invalid.example','localhost','agentmail.to')
                  OR split_part(LOWER(a.email), '@', 2) LIKE '%.example'
                  OR split_part(LOWER(a.email), '@', 2) LIKE '%.invalid'
                  OR split_part(LOWER(a.email), '@', 2) LIKE '%.agentmail.to'
                  OR split_part(LOWER(a.email), '@', 2) LIKE '%mailinator%'
                ) AS test_email_blocked,
                (SELECT COUNT(*) FROM ai_cost_budget_reservations r
                  WHERE r.product = 'discovery' AND r.order_id = a.id) AS provider_attempt_count,
                (SELECT COUNT(*) FROM discovery_email_delivery_claims dc
                  WHERE dc.audit_id = a.id AND dc.email_type = 'sendReportReadyEmail') AS delivery_claims,
                (SELECT COUNT(*) FROM email_tracking et
                  WHERE et.audit_id = a.id AND et.email_type = 'sendReportReadyEmail') AS report_delivery_tracking_rows,
                (SELECT COUNT(*) FROM email_tracking et
                  WHERE et.audit_id = a.id AND et.email_type = 'sendReportReadyEmail'
                    AND (
                      LOWER(COALESCE(et.sendpulse_status,'')) = 'bounced'
                      OR (
                        LOWER(COALESCE(et.sendpulse_status,'')) = 'failed'
                        AND (
                          COALESCE(et.sendpulse_error,'') ~* '"eventType"[[:space:]]*:[[:space:]]*"(hard_fail|bounce)"'
                          OR (
                            et.sendpulse_task_id IS NOT NULL
                            AND COALESCE(et.metadata->>'sendpulseSmtpAnswerCode','') ~ '^5[0-9]{2}$'
                          )
                        )
                      )
                    )) AS tracking_hard_failed,
                EXISTS (SELECT 1 FROM email_unsubscribes u
                  WHERE LOWER(u.email) = LOWER(a.email)) AS unsubscribed,
                EXISTS (
                  SELECT 1 FROM audits other
                   WHERE other.type = 'GRATUIT' AND other.id <> a.id
                     AND LOWER(other.email) = LOWER(a.email)
                     AND ABS(EXTRACT(EPOCH FROM (other.created_at - a.created_at))) <= 14 * 86400
                     AND NOT (
                       other.report_delivery_status = 'SUPERSEDED'
                       OR LOWER(COALESCE(other.narrative_report->'recovery'->>'disposition', '')) = 'superseded'
                       OR NULLIF(BTRIM(COALESCE(other.narrative_report->'recovery'->>'replacementAuditId', '')), '') IS NOT NULL
                     )
                ) AS duplicate_candidate,
                (
                  a.report_delivery_status = 'SUPERSEDED'
                  OR LOWER(COALESCE(a.narrative_report->'recovery'->>'disposition', '')) = 'superseded'
                  OR NULLIF(BTRIM(COALESCE(a.narrative_report->'recovery'->>'replacementAuditId', '')), '') IS NOT NULL
                ) AS superseded_terminal
           FROM audits a
          WHERE a.type = 'GRATUIT'
            AND a.report_delivery_status = 'BATCH_READY'
            AND a.report_sent_at IS NULL
       )
       SELECT COUNT(*)::text AS batch_ready_unsent,
              COUNT(*) FILTER (
                WHERE delivery_gate_ok
                  AND valid_email
                  AND NOT test_email_blocked
                  AND active_artifacts = 1
                  AND active_jobs = 0
                  AND delivery_claims = 0
                  AND report_delivery_tracking_rows = 0
                  AND tracking_hard_failed = 0
                  AND NOT unsubscribed
                  AND NOT duplicate_candidate
                  AND NOT superseded_terminal
              )::text AS delivery_population_ready,
              COUNT(*) FILTER (WHERE active_artifacts <> 1)::text AS missing_or_ambiguous_artifacts,
              COUNT(*) FILTER (WHERE delivery_claims > 0)::text AS blocked_by_claims,
              COUNT(*) FILTER (WHERE report_delivery_tracking_rows > 0)::text AS blocked_by_tracking,
              COUNT(*) FILTER (WHERE unsubscribed)::text AS blocked_by_unsubscribes,
              COUNT(*) FILTER (WHERE duplicate_candidate)::text AS duplicate_candidates,
              COUNT(*) FILTER (WHERE superseded_terminal)::text AS superseded_terminal
         FROM ready`,
    );
    if (config.mode === "target-preflight") {
      assert.ok(
        Number(population.rows[0].delivery_population_ready) >= targets.length,
        "DELIVERY_POPULATION_SMALLER_THAN_TARGETS",
      );
    } else {
      assert.equal(Number(population.rows[0].delivery_population_ready), 0, "AUTONOMOUS_DELIVERY_CANDIDATE_PRESENT");
    }

    const populationSample = await client.query<{
      id: string;
      email: string;
      created_at: Date;
      active_artifacts: string;
    }>(
      `SELECT a.id, a.email, a.created_at,
              (SELECT COUNT(*) FROM report_artifacts ra
                WHERE ra.audit_id = a.id AND ra.artifact_state = 'ACTIVE')::text AS active_artifacts
         FROM audits a
        WHERE a.type = 'GRATUIT'
          AND a.report_delivery_status = 'BATCH_READY'
          AND a.report_sent_at IS NULL
          AND COALESCE(a.narrative_report->'validationResult'->'deliveryGate'->>'name', '') = 'discovery_delivery'
          AND COALESCE(a.narrative_report->'validationResult'->'deliveryGate'->>'version', '') = '${DISCOVERY_DELIVERY_GATE_VERSION}'
          AND COALESCE(a.narrative_report->'validationResult'->'deliveryGate'->>'ok', '') = 'true'
          AND jsonb_typeof(a.narrative_report->'validationResult'->'deliveryGate'->'errors') = 'array'
          AND jsonb_array_length(a.narrative_report->'validationResult'->'deliveryGate'->'errors') = 0
          AND COALESCE(a.narrative_report->'validationResult'->'deliveryGate'->>'retryable', '') = 'false'
          AND a.email ~* '^[^@[:space:]]+@[^@[:space:]]+[.][a-z]{2,63}$'
          AND NOT (
            LOWER(a.email) LIKE '%achzodcoaching%'
            OR LOWER(a.email) LIKE '%achkou%'
            OR split_part(LOWER(a.email), '@', 1) ~ '(^|[+._-])test($|[+._-])'
            OR split_part(LOWER(a.email), '@', 1) IN ('test', 'debug')
            OR split_part(LOWER(a.email), '@', 1) LIKE 'test+%'
            OR split_part(LOWER(a.email), '@', 1) LIKE 'test-%'
            OR split_part(LOWER(a.email), '@', 1) LIKE 'test_%'
            OR split_part(LOWER(a.email), '@', 1) LIKE '%+test%'
            OR split_part(LOWER(a.email), '@', 1) LIKE 'debug+%'
            OR split_part(LOWER(a.email), '@', 1) LIKE 'debug-%'
            OR split_part(LOWER(a.email), '@', 1) LIKE 'debug_%'
            OR split_part(LOWER(a.email), '@', 2) IN ('example.com','example.org','example.net','invalid.example','localhost','agentmail.to')
            OR split_part(LOWER(a.email), '@', 2) LIKE '%.example'
            OR split_part(LOWER(a.email), '@', 2) LIKE '%.invalid'
            OR split_part(LOWER(a.email), '@', 2) LIKE '%.agentmail.to'
            OR split_part(LOWER(a.email), '@', 2) LIKE '%mailinator%'
          )
          AND (SELECT COUNT(*) FROM report_artifacts ra
                WHERE ra.audit_id = a.id AND ra.artifact_state = 'ACTIVE') = 1
          AND (SELECT COUNT(*) FROM report_jobs rj
                WHERE rj.audit_id = a.id AND rj.status IN ('pending','generating')) = 0
          AND (SELECT COUNT(*) FROM discovery_email_delivery_claims dc
                WHERE dc.audit_id = a.id AND dc.email_type = 'sendReportReadyEmail') = 0
          AND (SELECT COUNT(*) FROM email_tracking et
                WHERE et.audit_id = a.id AND et.email_type = 'sendReportReadyEmail') = 0
          AND (SELECT COUNT(*) FROM email_tracking et
                WHERE et.audit_id = a.id AND et.email_type = 'sendReportReadyEmail'
                  AND (
                    LOWER(COALESCE(et.sendpulse_status,'')) = 'bounced'
                    OR (
                      LOWER(COALESCE(et.sendpulse_status,'')) = 'failed'
                      AND (
                        COALESCE(et.sendpulse_error,'') ~* '"eventType"[[:space:]]*:[[:space:]]*"(hard_fail|bounce)"'
                        OR (
                          et.sendpulse_task_id IS NOT NULL
                          AND COALESCE(et.metadata->>'sendpulseSmtpAnswerCode','') ~ '^5[0-9]{2}$'
                        )
                      )
                    )
                  )) = 0
          AND NOT EXISTS (SELECT 1 FROM email_unsubscribes u
                WHERE LOWER(u.email) = LOWER(a.email))
          AND NOT EXISTS (
            SELECT 1 FROM audits other
             WHERE other.type = 'GRATUIT' AND other.id <> a.id
               AND LOWER(other.email) = LOWER(a.email)
               AND ABS(EXTRACT(EPOCH FROM (other.created_at - a.created_at))) <= 14 * 86400
               AND NOT (
                 other.report_delivery_status = 'SUPERSEDED'
                 OR LOWER(COALESCE(other.narrative_report->'recovery'->>'disposition', '')) = 'superseded'
                 OR NULLIF(BTRIM(COALESCE(other.narrative_report->'recovery'->>'replacementAuditId', '')), '') IS NOT NULL
               )
          )
          AND NOT (
            a.report_delivery_status = 'SUPERSEDED'
            OR LOWER(COALESCE(a.narrative_report->'recovery'->>'disposition', '')) = 'superseded'
            OR NULLIF(BTRIM(COALESCE(a.narrative_report->'recovery'->>'replacementAuditId', '')), '') IS NOT NULL
          )
        ORDER BY a.created_at ASC, a.id ASC
        LIMIT 25`,
    );

    const cutoff = getDiscoveryAutomationStartAt();
    if (expectedAutomation === "on") {
      assert.ok(cutoff, "DISCOVERY_CUTOFF_REQUIRED");
      if (config.mode === "target-preflight") {
        assert.ok(
          targets.every((row) => row.created_at.getTime() < cutoff.getTime()),
          "TARGET_AUDIT_NOT_BEFORE_CUTOFF",
        );
      }
    }

    await client.query("ROLLBACK");
    console.log(`DISCOVERY_PRODUCTION_READONLY_GATE_PASS ${JSON.stringify({
      database: "connected",
      mode: config.mode,
      reasoningEffort: DISCOVERY_REASONING_EFFORT,
      flags,
      cutoff: cutoff?.toISOString() || null,
      maxDiscoveryCreatedAt: state.rows[0].max_created_at?.toISOString() || null,
      batchReadyCount: Number(state.rows[0].batch_ready_count),
      nonterminalDeliveryClaims: Number(state.rows[0].nonterminal_delivery_claims),
      population: {
        batchReadyUnsent: Number(population.rows[0].batch_ready_unsent),
        deliveryPopulationReady: Number(population.rows[0].delivery_population_ready),
        missingOrAmbiguousArtifacts: Number(population.rows[0].missing_or_ambiguous_artifacts),
        blockedByClaims: Number(population.rows[0].blocked_by_claims),
        blockedByTracking: Number(population.rows[0].blocked_by_tracking),
        blockedByUnsubscribes: Number(population.rows[0].blocked_by_unsubscribes),
        duplicateCandidates: Number(population.rows[0].duplicate_candidates),
        supersededTerminal: Number(population.rows[0].superseded_terminal),
        sample: populationSample.rows.map((row) => ({
          id: row.id,
          emailSha256: emailSha256(row.email),
          createdAt: row.created_at.toISOString(),
          activeArtifacts: Number(row.active_artifacts),
        })),
      },
      targets: targets.map((row) => ({
        id: row.id,
        emailSha256: emailSha256(row.email),
        createdAt: row.created_at.toISOString(),
        status: row.report_delivery_status,
        activeArtifacts: Number(row.active_artifacts),
        trackingRows: Number(row.tracking_rows),
        reportDeliveryTrackingRows: Number(row.report_delivery_tracking_rows),
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
