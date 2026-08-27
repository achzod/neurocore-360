import assert from "node:assert/strict";
import { Pool } from "pg";

import {
  DISCOVERY_MECHANISM_CATALOG_SHA256,
  DISCOVERY_MECHANISM_CATALOG_VERSION,
  discoveryCatalogSelectionSha256,
  reconstructDiscoveryCatalogReport,
  validateDiscoveryGeneratedNarrative,
  validateDiscoveryReportAgainstResponses,
} from "../server/discovery-scan";
import {
  attachDiscoveryDeliveryGateResult,
  evaluateDiscoveryDeliveryGate,
} from "../server/discoveryDeliveryGate";
import { retrieveStoredOpenAIResponseText } from "../server/openaiResponses";
import {
  type DiscoveryGenerationClaim,
  discoveryTransactionalSha256,
  persistClaimedDiscoveryGeneration,
} from "../server/discoveryTransactionalPersistence";

const CONFIRM_TOKEN = "APEX_ALERT_20260827_NO_EMAIL";
const MARKER = "apex-critical-alert-20260827";

const NABIL_AUDIT_ID = "493b232d-6396-46e5-8067-3082c6544e17";
const NABIL_EMAIL = "nabil.mares@gmail.com";

const MAPASSA_AUDIT_ID = "5875c9e3-a1b6-4f3a-b823-5bbb68cea0a9";
const MAPASSA_EMAIL = "mapassa2@hotmail.com";

const AGENTMAIL_AUDIT_IDS = [
  "67dd6629-8249-4645-b882-8844d762a6c1",
  "629a77fe-8733-4f46-9b86-a70bfd05cffd",
];

function parseArgs(): { apply: boolean; confirm: string; terminalOnly: boolean } {
  const argv = process.argv.slice(2);
  const apply = argv.includes("--apply");
  const terminalOnly = argv.includes("--terminal-only");
  const confirmIndex = argv.indexOf("--confirm");
  const confirm = confirmIndex >= 0 ? String(argv[confirmIndex + 1] || "") : "";
  if (apply) assert.equal(confirm, CONFIRM_TOKEN, `--apply requires --confirm ${CONFIRM_TOKEN}`);
  return { apply, confirm, terminalOnly };
}

function databaseUrl(): string {
  const value = process.env.DATABASE_URL || process.env.POSTGRES_URL || "";
  assert.match(value, /^postgres(?:ql)?:\/\//, "DATABASE_URL_REQUIRED");
  return value;
}

function poolFor(url: string): Pool {
  return new Pool({
    connectionString: url,
    ssl: /render\.com|neon\.tech/.test(url) ? { rejectUnauthorized: false } : false,
    max: 1,
  });
}

function json(value: unknown): string {
  return JSON.stringify(value);
}

async function withTimeout<T>(promise: Promise<T>, milliseconds: number, label: string): Promise<T> {
  let timeout: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeout = setTimeout(() => reject(new Error(`${label}_TIMEOUT_${milliseconds}MS`)), milliseconds);
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

function getClaim(raw: any): DiscoveryGenerationClaim {
  const claim = raw?.generationClaim;
  assert.ok(claim && typeof claim === "object", "NABIL_GENERATION_CLAIM_MISSING");
  assert.ok(claim.token, "NABIL_GENERATION_CLAIM_TOKEN_MISSING");
  assert.ok(claim.responsesSha256, "NABIL_GENERATION_CLAIM_RESPONSES_SHA_MISSING");
  assert.ok(claim.claimedAt, "NABIL_GENERATION_CLAIM_CLAIMED_AT_MISSING");
  return {
    auditId: NABIL_AUDIT_ID,
    token: String(claim.token),
    fenceToken: claim.fenceToken == null ? null : String(claim.fenceToken),
    expectedResponsesSha256: String(claim.responsesSha256),
    claimedAt: String(claim.claimedAt),
  };
}

async function loadAlertRows(pool: Pool) {
  const rows = await pool.query(
    `SELECT a.id,a.email,a.type,a.created_at,a.report_delivery_status,
            a.report_generated_at,a.report_sent_at,
            LENGTH(COALESCE(a.report_txt,''))::int AS txt_len,
            LENGTH(COALESCE(a.report_html,''))::int AS html_len,
            j.status AS job_status,j.attempt_count,j.error AS job_error,
            (SELECT COUNT(*)::int FROM orders o WHERE o.audit_id=a.id) AS order_count
       FROM audits a
       LEFT JOIN report_jobs j ON j.audit_id=a.id
      WHERE a.id = ANY($1::text[])
      ORDER BY a.created_at DESC`,
    [[NABIL_AUDIT_ID, MAPASSA_AUDIT_ID, ...AGENTMAIL_AUDIT_IDS]],
  );
  return rows.rows;
}

async function buildNabilReplay(pool: Pool) {
  const audit = (await pool.query(
    `SELECT id,email,type,created_at,report_delivery_status,report_sent_at,
            narrative_report,responses,
            LENGTH(COALESCE(report_txt,''))::int AS txt_len,
            LENGTH(COALESCE(report_html,''))::int AS html_len
       FROM audits WHERE id=$1`,
    [NABIL_AUDIT_ID],
  )).rows[0];
  assert.ok(audit, "NABIL_AUDIT_NOT_FOUND");
  assert.equal(audit.email, NABIL_EMAIL, "NABIL_EMAIL_MISMATCH");
  assert.equal(audit.type, "GRATUIT", "NABIL_TYPE_MISMATCH");
  assert.equal(audit.report_sent_at, null, "NABIL_ALREADY_SENT");
  assert.equal(audit.report_delivery_status, "NEEDS_REVIEW", "NABIL_STATUS_NOT_NEEDS_REVIEW");
  assert.equal(Number(audit.txt_len), 0, "NABIL_TXT_ALREADY_PRESENT");
  assert.equal(Number(audit.html_len), 0, "NABIL_HTML_ALREADY_PRESENT");

  const claim = getClaim(audit.narrative_report);
  assert.equal(
    discoveryTransactionalSha256(audit.responses),
    claim.expectedResponsesSha256,
    "NABIL_RESPONSES_SHA_CHANGED",
  );

  const ledger = (await pool.query(
    `SELECT r.response_id,r.actual_cost_usd,
            e.model,e.input_tokens,e.output_tokens,e.total_tokens,e.estimated_openai_cost_usd,
            r.created_at AS reservation_created,e.created_at AS usage_created
       FROM ai_cost_budget_reservations r
       JOIN ai_usage_events e ON e.response_id=r.response_id
      WHERE r.product='discovery' AND r.profile='discovery'
        AND r.order_id=$1 AND r.status='COMPLETED'
        AND e.profile='discovery' AND e.status='completed'
      ORDER BY r.created_at DESC
      LIMIT 1`,
    [NABIL_AUDIT_ID],
  )).rows[0];
  assert.ok(ledger?.response_id, "NABIL_COMPLETED_LEDGER_NOT_FOUND");
  assert.ok(new Date(ledger.reservation_created).getTime() >= new Date(claim.claimedAt).getTime(),
    "NABIL_LEDGER_BEFORE_CLAIM");

  console.log(`APEX_CRITICAL_ALERT_RECONCILE_STEP retrieve_stored_response ${ledger.response_id}`);
  const stored = await withTimeout(
    retrieveStoredOpenAIResponseText(String(ledger.response_id)),
    45_000,
    "NABIL_STORED_RESPONSE_RETRIEVE",
  );
  console.log(`APEX_CRITICAL_ALERT_RECONCILE_STEP reconstruct_nabil ${ledger.response_id}`);
  const parsed = JSON.parse(stored.text);
  const generated = validateDiscoveryGeneratedNarrative(parsed, audit.responses, {} as any);
  assert.ok(generated.catalogProvenance, "NABIL_CATALOG_PROVENANCE_MISSING");
  generated.catalogProvenance.providerResponseId = String(ledger.response_id);

  assert.equal(generated.catalogProvenance.catalogVersion, DISCOVERY_MECHANISM_CATALOG_VERSION);
  assert.equal(generated.catalogProvenance.catalogSha256, DISCOVERY_MECHANISM_CATALOG_SHA256);
  assert.equal(generated.catalogProvenance.selectionSha256, discoveryCatalogSelectionSha256(parsed));

  const generatedAt = String(audit.narrative_report?.recovery?.failedAt || new Date().toISOString());
  const replay = reconstructDiscoveryCatalogReport({
    responses: audit.responses,
    catalogProvenance: generated.catalogProvenance,
    expectedProviderResponseId: String(ledger.response_id),
    generatedAt,
  });
  const gate = evaluateDiscoveryDeliveryGate(
    replay.narrativeReport,
    { txt: replay.txt, html: replay.html },
    new Date(),
  );
  const factual = validateDiscoveryReportAgainstResponses(replay.narrativeReport, audit.responses);
  assert.equal(gate.ok, true, `NABIL_GATE_BLOCKED:${gate.errors.join("|")}`);
  assert.equal(factual.ok, true, `NABIL_FACTUAL_BLOCKED:${factual.errors.join("|")}`);

  const narrativeReport = attachDiscoveryDeliveryGateResult(replay.narrativeReport, gate);
  const providerEvidence = {
    responseId: String(ledger.response_id),
    model: String(ledger.model),
    rawCandidate: parsed,
    inputTokens: Number(ledger.input_tokens),
    outputTokens: Number(ledger.output_tokens),
    totalTokens: Number(ledger.total_tokens),
    actualCostUsd: Number(ledger.actual_cost_usd),
    catalogVersion: DISCOVERY_MECHANISM_CATALOG_VERSION,
    catalogSha256: DISCOVERY_MECHANISM_CATALOG_SHA256,
    selectionSha256: generated.catalogProvenance.selectionSha256,
  };

  return {
    claim,
    narrativeReport,
    scores: replay.scores,
    txt: replay.txt,
    html: replay.html,
    providerEvidence,
    audit: {
      id: audit.id,
      email: audit.email,
      status: audit.report_delivery_status,
      responseId: providerEvidence.responseId,
      model: providerEvidence.model,
      txtLen: replay.txt.length,
      htmlLen: replay.html.length,
      txtSha256: discoveryTransactionalSha256(replay.txt),
      htmlSha256: discoveryTransactionalSha256(replay.html),
      gateOk: gate.ok,
      factualOk: factual.ok,
    },
  };
}

async function applyNabilReplay(pool: Pool, replay: Awaited<ReturnType<typeof buildNabilReplay>>) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SET LOCAL statement_timeout = '30s'");
    const recovery = {
      version: 1,
      disposition: "stored_response_replayed",
      reason: "provider_model_ledger_alias_mismatch_after_successful_openai_call",
      resolvedAt: new Date().toISOString(),
      resolvedBy: MARKER,
      responseId: replay.providerEvidence.responseId,
      emailSent: false,
    };
    const updated = await client.query(
      `UPDATE audits
          SET report_delivery_status='GENERATING',
              report_scheduled_for=NULL,
              narrative_report=jsonb_set(
                COALESCE(narrative_report,'{}'::jsonb),
                '{recovery}', $4::jsonb, true
              )
        WHERE id=$1 AND email=$2 AND type='GRATUIT'
          AND report_delivery_status='NEEDS_REVIEW'
          AND report_sent_at IS NULL
          AND LENGTH(COALESCE(report_txt,''))=0
          AND LENGTH(COALESCE(report_html,''))=0
          AND narrative_report->'generationClaim'->>'token'=$3
        RETURNING id`,
      [NABIL_AUDIT_ID, NABIL_EMAIL, replay.claim.token, json(recovery)],
    );
    assert.equal(updated.rowCount, 1, "NABIL_GENERATING_CAS_FAILED");
    await client.query(
      `UPDATE report_jobs
          SET status='generating',progress=90,
              current_section='Rejeu forensique de la reponse OpenAI stockee',
              error=NULL,updated_at=NOW(),last_progress_at=NOW(),completed_at=NULL
        WHERE audit_id=$1`,
      [NABIL_AUDIT_ID],
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }

  try {
    return await persistClaimedDiscoveryGeneration({
      claim: replay.claim,
      narrativeReport: replay.narrativeReport,
      scores: replay.scores,
      txt: replay.txt,
      html: replay.html,
      expectedTxtSha256: discoveryTransactionalSha256(replay.txt),
      expectedHtmlSha256: discoveryTransactionalSha256(replay.html),
      model: replay.providerEvidence.model,
      providerEvidence: replay.providerEvidence,
    }, pool);
  } catch (error) {
    const client = await pool.connect();
    try {
      await client.query(
        `UPDATE audits
            SET report_delivery_status='NEEDS_REVIEW',
                narrative_report=jsonb_set(
                  COALESCE(narrative_report,'{}'::jsonb),
                  '{recovery}', $3::jsonb, true
                )
          WHERE id=$1 AND report_delivery_status='GENERATING'
            AND narrative_report->'generationClaim'->>'token'=$2`,
        [NABIL_AUDIT_ID, replay.claim.token, json({
          version: 1,
          disposition: "stored_response_replay_failed",
          reason: error instanceof Error ? error.message : String(error),
          resolvedAt: new Date().toISOString(),
          resolvedBy: MARKER,
          emailSent: false,
        })],
      );
      await client.query(
        `UPDATE report_jobs SET status='failed',error=$2,updated_at=NOW(),last_progress_at=NOW()
          WHERE audit_id=$1`,
        [NABIL_AUDIT_ID, error instanceof Error ? error.message.slice(0, 1000) : String(error).slice(0, 1000)],
      );
    } finally {
      client.release();
    }
    throw error;
  }
}

async function applyTerminalStatuses(pool: Pool) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SET LOCAL statement_timeout = '30s'");

    const agentmailRecovery = {
      version: 1,
      disposition: "superseded",
      reason: "disposable_agentmail_test_submission_without_bound_order",
      resolvedAt: new Date().toISOString(),
      resolvedBy: MARKER,
      emailSent: false,
    };
    const agentmail = await client.query(
      `UPDATE audits a
          SET report_delivery_status='SUPERSEDED',
              report_scheduled_for=NULL,
              narrative_report=COALESCE(narrative_report,'{}'::jsonb)
                || jsonb_build_object('recovery',$2::jsonb)
        WHERE a.id=ANY($1::text[])
          AND a.type='ELITE'
          AND lower(split_part(a.email,'@',2))='agentmail.to'
          AND a.report_delivery_status='FAILED'
          AND a.report_sent_at IS NULL
          AND NOT EXISTS (SELECT 1 FROM orders o WHERE o.audit_id=a.id)
        RETURNING a.id,a.email,a.report_delivery_status`,
      [AGENTMAIL_AUDIT_IDS, json(agentmailRecovery)],
    );
    await client.query(
      `UPDATE report_jobs j
          SET status='failed',progress=100,
              current_section='Submission de test agentmail neutralisee',
              error='APEX_TEST_EMAIL_SUPERSEDED_NO_ORDER',
              completed_at=COALESCE(j.completed_at,NOW()),updated_at=NOW(),last_progress_at=NOW()
         FROM audits a
        WHERE a.id=j.audit_id AND a.id=ANY($1::text[])`,
      [AGENTMAIL_AUDIT_IDS],
    );
    for (const row of agentmail.rows) {
      await client.query(
        `INSERT INTO monitoring_logs (audit_id,action,metadata,created_at)
         VALUES ($1,'APEX_ALERT_AGENTMAIL_SUPERSEDED',$2::jsonb,NOW())`,
        [row.id, json({ marker: MARKER, email: row.email, emailSent: false })],
      );
    }

    const mapassaRecovery = {
      version: 1,
      disposition: "delivery_blocked",
      reason: "legacy_discovery_questionnaire_missing_required_sleep_energy_fields",
      missing: [
        "heures-sommeil",
        "qualite-sommeil",
        "endormissement",
        "energie-matin",
        "energie-aprem",
        "coup-fatigue",
      ],
      resolvedAt: new Date().toISOString(),
      resolvedBy: MARKER,
      emailSent: false,
    };
    const mapassa = await client.query(
      `UPDATE audits
          SET report_delivery_status='DELIVERY_BLOCKED',
              report_scheduled_for=NULL,
              narrative_report=COALESCE(narrative_report,'{}'::jsonb)
                || jsonb_build_object('recovery',$4::jsonb)
        WHERE id=$1 AND email=$2 AND type='GRATUIT'
          AND report_delivery_status='NEEDS_REVIEW'
          AND report_sent_at IS NULL
          AND LENGTH(COALESCE(report_txt,''))=0
          AND LENGTH(COALESCE(report_html,''))=0
          AND (
            responses->>'heures-sommeil' IS NULL
            OR responses->>'qualite-sommeil' IS NULL
            OR responses->>'endormissement' IS NULL
            OR responses->>'energie-matin' IS NULL
            OR responses->>'energie-aprem' IS NULL
            OR responses->>'coup-fatigue' IS NULL
          )
        RETURNING id,email,report_delivery_status`,
      [MAPASSA_AUDIT_ID, MAPASSA_EMAIL, json(mapassaRecovery)],
    );
    await client.query(
      `UPDATE report_jobs
          SET status='failed',progress=100,
              current_section='Questionnaire legacy incomplet - livraison bloquee',
              error='DISCOVERY_QUESTIONNAIRE_INVALID_LEGACY_MISSING_REQUIRED_FIELDS',
              completed_at=COALESCE(report_jobs.completed_at,NOW()),updated_at=NOW(),last_progress_at=NOW()
        WHERE audit_id=$1`,
      [MAPASSA_AUDIT_ID],
    );
    for (const row of mapassa.rows) {
      await client.query(
        `INSERT INTO monitoring_logs (audit_id,action,metadata,created_at)
         VALUES ($1,'APEX_ALERT_LEGACY_DISCOVERY_DELIVERY_BLOCKED',$2::jsonb,NOW())`,
        [row.id, json({ marker: MARKER, email: row.email, emailSent: false })],
      );
    }

    await client.query("COMMIT");
    return {
      agentmailUpdated: agentmail.rowCount ?? 0,
      agentmailRows: agentmail.rows,
      mapassaUpdated: mapassa.rowCount ?? 0,
      mapassaRows: mapassa.rows,
    };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

async function main(): Promise<void> {
  const { apply, terminalOnly } = parseArgs();
  const pool = poolFor(databaseUrl());
  try {
    const before = await loadAlertRows(pool);
    const nabilReplay = terminalOnly ? null : await buildNabilReplay(pool);
    const applied = apply
      ? terminalOnly
        ? {
          terminal: await applyTerminalStatuses(pool),
          nabil: null,
        }
        : {
          terminal: await applyTerminalStatuses(pool),
          nabil: await applyNabilReplay(pool, nabilReplay),
        }
      : null;
    const after = await loadAlertRows(pool);
    const statusCounts = (await pool.query(
      `SELECT COALESCE(report_delivery_status,'UNKNOWN') AS status, COUNT(*)::int AS count
         FROM audits GROUP BY 1 ORDER BY 1`,
    )).rows;
    console.log(`APEX_CRITICAL_ALERT_RECONCILE ${JSON.stringify({
      mode: apply ? "apply" : "dry-run",
      terminalOnly,
      marker: MARKER,
      emailSent: false,
      before,
      nabilReplay: nabilReplay?.audit ?? null,
      applied,
      after,
      statusCounts,
    })}`);
  } finally {
    await pool.end().catch(() => {});
  }
}

main().catch((error) => {
  console.error(`APEX_CRITICAL_ALERT_RECONCILE_FAIL ${error instanceof Error ? error.stack : String(error)}`);
  process.exitCode = 1;
});
