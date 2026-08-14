import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import test, { after, before, beforeEach } from "node:test";

import { Pool } from "pg";
import {
  DISCOVERY_APPROVED_NEUTRAL_PROMO_HTML,
  buildDiscoveryReportAssets,
  renderDiscoveryCoachingOffersTable,
  type ReportData,
} from "./discovery-scan";
import { attachDiscoveryDeliveryGateResult } from "./discoveryDeliveryGate";

const databaseUrl = String(process.env.DATABASE_URL || "").trim();
const parsedDatabaseUrl = databaseUrl ? new URL(databaseUrl) : null;
const localHost = parsedDatabaseUrl
  && ["localhost", "127.0.0.1", "[::1]"].includes(parsedDatabaseUrl.hostname);
const disposableDatabase = parsedDatabaseUrl?.pathname.replace(/^\//, "") === "apex_discovery_test";
if (!parsedDatabaseUrl || !localHost || !disposableDatabase) {
  throw new Error("DISCOVERY_POSTGRES_TEST_REQUIRES_EPHEMERAL_LOCAL_DATABASE_URL");
}

process.env.DISCOVERY_TRANSACTIONAL_AUTOMATION_ENABLED = "true";
process.env.DISCOVERY_AUTOMATION_START_AT = "2026-08-14T00:00:00.000Z";
process.env.DISCOVERY_REPORT_DELIVERY_ENABLED = "false";

const pool = new Pool({ connectionString: databaseUrl, max: 12 });

const baselineSql = `
  CREATE EXTENSION IF NOT EXISTS pgcrypto;

  CREATE TABLE audits (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL,
    type VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'COMPLETED',
    responses JSONB NOT NULL DEFAULT '{}'::jsonb,
    scores JSONB NOT NULL DEFAULT '{}'::jsonb,
    narrative_report JSONB,
    report_txt TEXT,
    report_html TEXT,
    report_delivery_status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    report_scheduled_for TIMESTAMP,
    report_sent_at TIMESTAMP,
    report_generated_at TIMESTAMP,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    completed_at TIMESTAMP
  );

  CREATE TABLE report_jobs (
    audit_id VARCHAR(36) PRIMARY KEY,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    progress INTEGER NOT NULL DEFAULT 0,
    current_section TEXT NOT NULL DEFAULT '',
    error TEXT,
    attempt_count INTEGER NOT NULL DEFAULT 0,
    started_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    last_progress_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    completed_at TIMESTAMPTZ
  );

  CREATE TABLE email_unsubscribes (
    email VARCHAR(255) PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE ai_cost_budget_reservations (
    id UUID PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    product TEXT NOT NULL,
    order_id TEXT NOT NULL,
    profile TEXT NOT NULL,
    label TEXT,
    status TEXT NOT NULL,
    reserved_cost_usd DOUBLE PRECISION NOT NULL,
    actual_cost_usd DOUBLE PRECISION,
    response_id TEXT,
    detail TEXT
  );
  CREATE INDEX ai_cost_budget_reservations_scope_idx
    ON ai_cost_budget_reservations(product, order_id, created_at DESC);
  CREATE INDEX ai_cost_budget_reservations_status_idx
    ON ai_cost_budget_reservations(status, created_at DESC);

  CREATE TABLE ai_cost_budget_alerts (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    product TEXT NOT NULL,
    order_id TEXT NOT NULL,
    profile TEXT NOT NULL,
    label TEXT,
    blocked_dimension TEXT NOT NULL,
    projected_order_usd DOUBLE PRECISION NOT NULL,
    projected_hour_usd DOUBLE PRECISION NOT NULL,
    projected_day_usd DOUBLE PRECISION NOT NULL,
    limit_usd DOUBLE PRECISION NOT NULL,
    acknowledged_at TIMESTAMPTZ
  );

  CREATE TABLE ai_usage_events (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    profile TEXT NOT NULL,
    response_id TEXT,
    estimated_openai_cost_usd DOUBLE PRECISION NOT NULL DEFAULT 0
  );
`;

let batch: typeof import("./discoveryBatchControl");
let transactional: typeof import("./discoveryTransactionalPersistence");
let budget: typeof import("./aiCostBudgetController");
let schema: typeof import("./discoveryBatchSchema");

function migration(name: string): string {
  return readFileSync(new URL(`../migrations/${name}`, import.meta.url), "utf8");
}

async function insertAudit(status = "PENDING"): Promise<string> {
  const id = randomUUID();
  await pool.query(
    `INSERT INTO audits (id, email, type, responses, scores, report_delivery_status, created_at)
     VALUES ($1,$2,'GRATUIT',$3::jsonb,'{}'::jsonb,$4,'2026-08-14T01:00:00.000Z')`,
    [id, `${id}@example.test`, JSON.stringify({ goal: "test", auditId: id }), status],
  );
  return id;
}

const LENNY_OLD_TEXT = "La seule nuance se trouve au matin. une fatigue parfois présente au réveil, ton énergie matinale est moyenne et tu te réveilles parfois fatigué.";
const LENNY_NEW_TEXT = "La seule nuance se trouve au réveil : une fatigue parfois présente et une énergie matinale moyenne.";
const LENNY_UNSAFE_TEXT = "La seule nuance se trouve au réveil : une fatigue parfois présente, une énergie matinale moyenne et un réveil parfois difficile.";
const LENNY_RESPONSES = {
  "reveil-fatigue": "parfois",
  "energie-matin": "moyenne",
};
const LEGACY_DISCOVERY_PROMO_HTML = `<p class="text-xs mt-1" style="color: var(--color-text-muted);">Laisse un avis sur ton Discovery Scan ci-dessous. Après validation, tu recevras ton code promo <code class="px-1 py-0.5 rounded" style="background: var(--color-border); color: var(--color-primary);">DISCOVERY20</code> par email.</p>`;
// Exact dee8 coaching-section shape: the report stored the discount table and
// embedded the legacy code in this review paragraph before approval.
function dee8LegacyCoachingSection(): string {
  return `<p>Tu n'as pas envie ou besoin de faire un autre scan ? Je te propose une alternative directe.</p>

<p>Avec ton Discovery Scan tu as déjà une vue d'ensemble de tes priorités. Si tu veux passer à l'action maintenant, je t'offre <strong style="color: var(--color-primary);">-20% sur le coaching Achzod</strong> avec le code que tu recevras après avoir laissé ton avis.</p>

<div class="mt-8 p-6 rounded-xl" style="background: var(--color-surface); border: 1px solid var(--color-border);">
  <h4 class="text-lg font-bold mb-4" style="color: var(--color-text);">Coaching Achzod - Formules</h4>

  ${renderDiscoveryCoachingOffersTable(20)}

  <div class="mt-6 p-4 rounded-lg" style="background: color-mix(in srgb, var(--color-primary) 12%, transparent); border: 1px solid color-mix(in srgb, var(--color-primary) 35%, transparent);">
    <p class="text-sm" style="color: var(--color-text);"><strong style="color: var(--color-primary);">Comment obtenir le code -20% ?</strong></p>
    ${LEGACY_DISCOVERY_PROMO_HTML}
  </div>
  <a href="https://www.achzodcoaching.com/formules-coaching" target="_blank" class="mt-4 block w-full py-3 rounded-lg text-center font-bold transition-all hover:opacity-90" style="background: var(--color-primary); color: var(--color-on-primary);"><span style="color: var(--color-on-primary);">Voir toutes les formules</span></a>
</div>`;
}

function exactRepairReport(duplicatePhrase = false): ReportData {
  const clientName = "Lenny";
  const sections = [
    "intro", "global", "digestion", "stress", "energie", "sommeil",
    "training", "nutrition", "lifestyle", "mindset", "scans", "coaching",
  ].map((id, index) => ({
    id,
    title: id === "sommeil" ? "Sommeil" : `Section ${index}`,
    content: `<p>${["sommeil", "stress", "energie", "digestion", "training", "nutrition", "lifestyle", "mindset"].includes(id) || index === 0 ? `${clientName} ` : ""}${"Contenu physiologique précis et personnalisé. ".repeat(72)}</p>`,
  }));
  sections[5].content += `<p>${LENNY_OLD_TEXT}${duplicatePhrase ? ` ${LENNY_OLD_TEXT}` : ""}</p>`;
  sections[11].content = dee8LegacyCoachingSection();
  return {
    clientName,
    generatedAt: "2026-08-14T01:00:00.000Z",
    globalScore: 7.2,
    auditType: "GRATUIT",
    metrics: Array.from({ length: 8 }, (_, index) => ({
      key: `domain_${index}`,
      label: `Domaine ${index}`,
      value: 6,
      max: 10,
    })),
    sections,
    analysisMetadata: {},
    generationQuality: {
      mode: "premium_ai",
      version: 1,
      provider: "openai",
      synthesis: "ai_validated",
      validatedDomains: ["digestion", "energie", "lifestyle", "mindset", "nutrition", "sommeil", "stress", "training"],
      fallbackUsed: false,
      safety: {
        version: 1,
        tcaMode: "none",
        bodyCheckingSignal: false,
        strictEatingSafety: false,
        gatePassed: true,
      },
    },
  };
}

async function insertExactRepairFixture(duplicatePhrase = false) {
  const id = randomUUID();
  const email = `${id}@example.test`;
  const report = exactRepairReport(duplicatePhrase);
  const assets = buildDiscoveryReportAssets(report);
  const narrative = attachDiscoveryDeliveryGateResult(report, {
    name: "discovery_delivery",
    version: 4,
    ok: true,
    errors: [],
    checkedAt: "2026-08-14T01:00:00.000Z",
    retryable: false,
  });
  await pool.query(
    `INSERT INTO audits
      (id,email,type,responses,scores,report_delivery_status,report_sent_at,
       narrative_report,report_txt,report_html,created_at)
     VALUES ($1,$2,'GRATUIT',$3::jsonb,'{}'::jsonb,'BATCH_READY',NULL,$4::jsonb,$5,$6,'2026-08-14T01:00:00.000Z')`,
    [id, email, JSON.stringify(LENNY_RESPONSES), JSON.stringify(narrative), assets.txt, assets.html],
  );
  await pool.query(
    `INSERT INTO report_artifacts
      (id,audit_id,tier,engine,model,txt,html,content_sha256,created_at)
     VALUES ($1,$2,'GRATUIT','discovery','integration-test',$3,$4,$5,NOW())`,
    [randomUUID(), id, assets.txt, assets.html,
      batch.discoveryArtifactContentHash(assets.txt, assets.html)],
  );
  return {
    id,
    email,
    assets,
    target: {
      id,
      emailSha256: batch.discoverySha256(email),
      expectedCurrentStatus: "BATCH_READY" as const,
      expectedTxtSha256: batch.discoverySha256(assets.txt),
      expectedHtmlSha256: batch.discoverySha256(assets.html),
      expectedArtifactCount: 1 as const,
      expectedNarrativeTopLevelKeys: [
        "analysisMetadata", "auditType", "clientName", "generatedAt", "generationQuality",
        "globalScore", "metrics", "sections", "validationResult",
      ],
      sectionIndex: 5,
      sectionId: "sommeil",
      oldText: LENNY_OLD_TEXT,
      newText: LENNY_NEW_TEXT,
      promoSectionIndex: 11,
      promoSectionId: "coaching" as const,
      expectedPromoCodeOccurrencesPerArtifact: 1 as const,
      legacyPromoHtml: LEGACY_DISCOVERY_PROMO_HTML,
      approvedNeutralPromoHtml: DISCOVERY_APPROVED_NEUTRAL_PROMO_HTML,
    },
  };
}

before(async () => {
  const identity = await pool.query("SELECT current_database() AS name, inet_server_addr()::text AS host");
  assert.equal(identity.rows[0]?.name, "apex_discovery_test");
  assert.match(String(identity.rows[0]?.host), /^(127\.0\.0\.1|::1)(?:\/\d+)?$/);
  await pool.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public");
  await pool.query(baselineSql);
  for (const name of [
    "001_create_email_tracking.sql",
    "002_create_email_tracking.sql",
    "003_discovery_batch_safety.sql",
    "004_discovery_delivery_claims_global.sql",
    "005_discovery_batch_source_cas.sql",
  ]) {
    await pool.query(migration(name));
  }
  schema = await import("./discoveryBatchSchema");
  batch = await import("./discoveryBatchControl");
  transactional = await import("./discoveryTransactionalPersistence");
  budget = await import("./aiCostBudgetController");
});

beforeEach(async () => {
  await pool.query(`TRUNCATE TABLE
    discovery_email_delivery_claims,
    discovery_batch_items,
    discovery_batch_runs,
    discovery_operation_lock,
    report_artifacts,
    report_jobs,
    email_tracking,
    email_unsubscribes,
    ai_cost_budget_reservations,
    ai_cost_budget_alerts,
    ai_usage_events,
    audits
    RESTART IDENTITY CASCADE`);
});

after(async () => {
  await pool.end();
  const runtimeDb = await import("./db");
  await runtimeDb.pool.end();
});

test("migration 005 is physically present with the complete batch catalog contract", async () => {
  await schema.assertDiscoveryBatchSchemaV005(pool);
  const columns = await pool.query(
    `SELECT table_name, column_name, udt_name, is_nullable
       FROM information_schema.columns
      WHERE table_schema = 'public'
        AND column_name IN ('expected_source_status','fence_token')
      ORDER BY table_name, column_name`,
  );
  assert.deepEqual(columns.rows, [
    {
      table_name: "discovery_batch_items",
      column_name: "expected_source_status",
      udt_name: "text",
      is_nullable: "YES",
    },
    {
      table_name: "discovery_email_delivery_claims",
      column_name: "fence_token",
      udt_name: "uuid",
      is_nullable: "YES",
    },
  ]);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("ALTER TABLE discovery_batch_items DROP COLUMN expected_source_status");
    await assert.rejects(
      schema.assertDiscoveryBatchSchemaV005(client),
      /DISCOVERY_BATCH_SCHEMA_V005_REQUIRED:missing_column:discovery_batch_items\.expected_source_status/,
    );
    await client.query("ROLLBACK");
  } finally {
    client.release();
  }
  await schema.assertDiscoveryBatchSchemaV005(pool);
});

test("two concurrent generation claims have exactly one winner", async () => {
  const auditId = await insertAudit();
  const [first, second] = await Promise.all([
    transactional.claimDiscoveryGeneration(auditId, pool),
    transactional.claimDiscoveryGeneration(auditId, pool),
  ]);
  const winners = [first, second].filter(Boolean);
  assert.equal(winners.length, 1);
  const state = await pool.query(
    `SELECT a.report_delivery_status, j.status, j.attempt_count
       FROM audits a JOIN report_jobs j ON j.audit_id = a.id WHERE a.id = $1`,
    [auditId],
  );
  assert.deepEqual(state.rows[0], {
    report_delivery_status: "GENERATING",
    status: "generating",
    attempt_count: 1,
  });
});

test("a rotated durable batch epoch rejects stale generation persistence", async () => {
  const auditId = await insertAudit();
  const claim = await transactional.claimDiscoveryGeneration(auditId, pool);
  assert.ok(claim);
  const lock = await batch.acquireDiscoveryGlobalLock({
    owner: "postgres-integration",
    purpose: "rotate-epoch",
    ttlMinutes: 5,
  }, pool);
  assert.equal(await batch.releaseDiscoveryGlobalLock(lock.token, pool), true);

  const txt = "stale txt";
  const html = "<html>stale</html>";
  await assert.rejects(
    transactional.persistClaimedDiscoveryGeneration({
      claim,
      narrativeReport: { version: 4 },
      scores: {},
      txt,
      html,
      expectedTxtSha256: transactional.discoveryTransactionalSha256(txt),
      expectedHtmlSha256: transactional.discoveryTransactionalSha256(html),
      model: "integration-test",
    }, pool),
    /DISCOVERY_GENERATION_FENCE_STALE/,
  );
  assert.equal(Number((await pool.query(
    "SELECT COUNT(*) FROM report_artifacts WHERE audit_id = $1", [auditId],
  )).rows[0].count), 0);
  assert.equal((await pool.query(
    "SELECT report_delivery_status FROM audits WHERE id = $1", [auditId],
  )).rows[0].report_delivery_status, "GENERATING");
});

test("artifact, audit and job persistence rolls back atomically when the final job CAS is lost", async () => {
  const auditId = await insertAudit();
  const claim = await transactional.claimDiscoveryGeneration(auditId, pool);
  assert.ok(claim);
  await pool.query("UPDATE report_jobs SET status = 'failed' WHERE audit_id = $1", [auditId]);
  const txt = "atomic txt";
  const html = "<html>atomic</html>";
  await assert.rejects(
    transactional.persistClaimedDiscoveryGeneration({
      claim,
      narrativeReport: { version: 4 },
      scores: { global: 90 },
      txt,
      html,
      expectedTxtSha256: transactional.discoveryTransactionalSha256(txt),
      expectedHtmlSha256: transactional.discoveryTransactionalSha256(html),
      model: "integration-test",
    }, pool),
    /DISCOVERY_REPORT_JOB_COMPLETION_CAS_FAILED/,
  );
  const audit = (await pool.query(
    `SELECT report_delivery_status, report_txt, report_html, scores
       FROM audits WHERE id = $1`, [auditId],
  )).rows[0];
  assert.equal(audit.report_delivery_status, "GENERATING");
  assert.equal(audit.report_txt, null);
  assert.equal(audit.report_html, null);
  assert.deepEqual(audit.scores, {});
  assert.equal(Number((await pool.query(
    "SELECT COUNT(*) FROM report_artifacts WHERE audit_id = $1", [auditId],
  )).rows[0].count), 0);
  assert.equal((await pool.query(
    "SELECT status FROM report_jobs WHERE audit_id = $1", [auditId],
  )).rows[0].status, "failed");
});

test("an active email claim blocks a batch and a rotated epoch blocks provider start/finalize", async () => {
  const auditId = await insertAudit("READY");
  const txt = "delivery txt";
  const html = "<html>delivery</html>";
  const persistedGate = {
    validationResult: {
      deliveryGate: {
        name: "discovery_delivery",
        version: 4,
        ok: true,
        errors: [],
        checkedAt: "2026-08-14T01:00:00.000Z",
        retryable: false,
      },
    },
  };
  await pool.query(
    `UPDATE audits SET report_txt = $2, report_html = $3, narrative_report = $4::jsonb
      WHERE id = $1`,
    [auditId, txt, html, JSON.stringify(persistedGate)],
  );
  const claim = await batch.claimDiscoveryEmailDelivery({
    auditId,
    recipientEmail: `${auditId}@example.test`,
    subject: "Rapport",
    expectedTxtSha256: batch.discoverySha256(txt),
    expectedHtmlSha256: batch.discoverySha256(html),
  }, pool);

  await assert.rejects(
    batch.acquireDiscoveryGlobalLock({ owner: "blocked", purpose: "blocked", ttlMinutes: 5 }, pool),
    /DISCOVERY_BATCH_IN_FLIGHT_OPERATION/,
  );

  await pool.query(
    `UPDATE discovery_email_delivery_claims SET state = 'FAILED_FINAL' WHERE id = $1`,
    [claim.claimId],
  );
  await pool.query(
    `UPDATE audits SET report_delivery_status = 'DELIVERY_BLOCKED' WHERE id = $1`,
    [auditId],
  );
  const lock = await batch.acquireDiscoveryGlobalLock({ owner: "rotate", purpose: "rotate", ttlMinutes: 5 }, pool);
  assert.equal(await batch.releaseDiscoveryGlobalLock(lock.token, pool), true);

  await pool.query(
    `UPDATE discovery_email_delivery_claims SET state = 'CLAIMED' WHERE id = $1`,
    [claim.claimId],
  );
  await assert.rejects(
    batch.markDiscoveryDeliveryProviderPostStarted(claim.claimId, pool),
    /DISCOVERY_DELIVERY_FENCE_STALE/,
  );
  await pool.query(
    `UPDATE discovery_email_delivery_claims SET state = 'PROVIDER_POST_STARTED' WHERE id = $1`,
    [claim.claimId],
  );
  await assert.rejects(
    batch.finalizeDiscoveryDeliveryClaim({
      claimId: claim.claimId,
      outcome: "PROVIDER_ACCEPTED",
      providerTaskId: "must-not-finalize",
    }, pool),
    /DISCOVERY_DELIVERY_FENCE_STALE/,
  );
  assert.equal((await pool.query(
    "SELECT report_sent_at FROM audits WHERE id = $1", [auditId],
  )).rows[0].report_sent_at, null);
});

test("Discovery reserves exactly 0.75 USD once and permanently rejects a second reservation", async () => {
  const auditId = await insertAudit();
  const claim = await transactional.claimDiscoveryGeneration(auditId, pool);
  assert.ok(claim);
  const context = {
    product: "discovery",
    orderId: auditId,
    profile: "discovery-integration",
    estimatedCostUsd: 0.01,
    discoveryGenerationToken: claim.token,
    discoveryFenceToken: claim.fenceToken,
  };
  const first = await budget.reserveAICostBudget(context, {
    ...process.env,
    AI_COST_DISCOVERY_PER_AUDIT_USD: "100",
  });
  assert.ok(first);
  assert.equal(first.reservedUsd, 0.75);
  await assert.rejects(
    budget.reserveAICostBudget(context, {
      ...process.env,
      AI_COST_DISCOVERY_PER_AUDIT_USD: "100",
    }),
    /DISCOVERY_MONO_CALL_ALREADY_RESERVED/,
  );
  const reservations = await pool.query(
    `SELECT COUNT(*)::int AS count, SUM(reserved_cost_usd)::float8 AS total
       FROM ai_cost_budget_reservations
      WHERE product = 'discovery' AND order_id = $1`,
    [auditId],
  );
  assert.deepEqual(reservations.rows[0], { count: 1, total: 0.75 });
});

test("exact Discovery text repair atomically replaces JSON, TXT, HTML, artifact and gate", async () => {
  const fixture = await insertExactRepairFixture();
  await pool.query(
    `INSERT INTO email_tracking
      (id, email_type, recipient_email, audit_id, audit_type, sendpulse_status, sent_at)
     VALUES ($1, 'sendAdminEmailNewAudit', $2, $3, 'GRATUIT', 'success', NOW())`,
    [randomUUID(), fixture.email, fixture.id],
  );
  const lock = await batch.acquireDiscoveryGlobalLock({
    owner: "postgres-integration",
    purpose: "exact-text-repair",
    ttlMinutes: 5,
  }, pool);
  const result = await batch.repairExactDiscoveryTextUnderLock({
    lockToken: lock.token,
    target: fixture.target,
  }, pool);
  assert.equal(await batch.releaseDiscoveryGlobalLock(lock.token, pool), true);
  assert.equal(result.status, "BATCH_READY");
  assert.equal(result.emailsSent, 0);
  assert.notEqual(result.txtSha256, fixture.target.expectedTxtSha256);
  assert.notEqual(result.htmlSha256, fixture.target.expectedHtmlSha256);

  const audit = (await pool.query(
    `SELECT report_delivery_status, report_sent_at, narrative_report, report_txt, report_html
       FROM audits WHERE id = $1`, [fixture.id],
  )).rows[0];
  assert.equal(audit.report_delivery_status, "BATCH_READY");
  assert.equal(audit.report_sent_at, null);
  assert.equal(JSON.stringify(audit.narrative_report).includes(LENNY_OLD_TEXT), false);
  assert.equal(JSON.stringify(audit.narrative_report).split(LENNY_NEW_TEXT).length - 1, 1);
  assert.equal(audit.report_txt.includes(LENNY_OLD_TEXT), false);
  assert.equal(audit.report_html.includes(LENNY_OLD_TEXT), false);
  assert.equal(JSON.stringify(audit.narrative_report).includes("DISCOVERY20"), false);
  assert.equal(audit.report_txt.includes("DISCOVERY20"), false);
  assert.equal(audit.report_html.includes("DISCOVERY20"), false);
  assert.equal(
    audit.narrative_report.sections[11].content.includes(DISCOVERY_APPROVED_NEUTRAL_PROMO_HTML),
    true,
  );
  assert.equal(audit.narrative_report.validationResult.deliveryGate.ok, true);
  assert.deepEqual(audit.narrative_report.validationResult.deliveryGate.errors, []);

  const artifacts = await pool.query(
    `SELECT txt, html, content_sha256 FROM report_artifacts WHERE audit_id = $1`, [fixture.id],
  );
  assert.equal(artifacts.rowCount, 1);
  assert.equal(artifacts.rows[0].txt, audit.report_txt);
  assert.equal(artifacts.rows[0].html, audit.report_html);
  assert.equal(artifacts.rows[0].txt.includes("DISCOVERY20"), false);
  assert.equal(artifacts.rows[0].html.includes("DISCOVERY20"), false);
  assert.equal(
    artifacts.rows[0].content_sha256,
    batch.discoveryArtifactContentHash(audit.report_txt, audit.report_html),
  );
  const tracking = await pool.query(
    `SELECT email_type FROM email_tracking WHERE audit_id = $1 ORDER BY email_type`,
    [fixture.id],
  );
  assert.deepEqual(tracking.rows, [{ email_type: "sendAdminEmailNewAudit" }]);
  assert.equal(Number((await pool.query(
    `SELECT COUNT(*) FROM discovery_email_delivery_claims WHERE audit_id = $1`, [fixture.id],
  )).rows[0].count), 0);
});

test("exact Discovery text repair rolls back on client report delivery tracking", async () => {
  for (const emailType of ["sendReportReadyEmail", "sendReportRegeneratedEmail"]) {
    const fixture = await insertExactRepairFixture();
    await pool.query(
      `INSERT INTO email_tracking
        (id, email_type, recipient_email, audit_id, audit_type, sendpulse_status, sent_at)
       VALUES ($1, $2, $3, $4, 'GRATUIT', 'success', NOW())`,
      [randomUUID(), emailType, fixture.email, fixture.id],
    );
    const lock = await batch.acquireDiscoveryGlobalLock({
      owner: "postgres-integration",
      purpose: `exact-text-repair-delivery-tracking-${emailType}`,
      ttlMinutes: 5,
    }, pool);
    await assert.rejects(
      batch.repairExactDiscoveryTextUnderLock({ lockToken: lock.token, target: fixture.target }, pool),
      /DISCOVERY_TEXT_REPAIR_PRIOR_DELIVERY_TRACKING_OR_CLAIM/,
    );
    assert.equal(await batch.releaseDiscoveryGlobalLock(lock.token, pool), true);

    const audit = (await pool.query(
      `SELECT narrative_report, report_txt, report_html FROM audits WHERE id = $1`,
      [fixture.id],
    )).rows[0];
    assert.equal(audit.report_txt, fixture.assets.txt);
    assert.equal(audit.report_html, fixture.assets.html);
    assert.equal(JSON.stringify(audit.narrative_report).includes(LENNY_OLD_TEXT), true);
    const artifact = (await pool.query(
      `SELECT txt, html FROM report_artifacts WHERE audit_id = $1`,
      [fixture.id],
    )).rows[0];
    assert.equal(artifact.txt, fixture.assets.txt);
    assert.equal(artifact.html, fixture.assets.html);
  }
});

test("exact Discovery text repair rolls back on phrase divergence", async () => {
  const fixture = await insertExactRepairFixture(true);
  const lock = await batch.acquireDiscoveryGlobalLock({
    owner: "postgres-integration",
    purpose: "exact-text-repair-divergence",
    ttlMinutes: 5,
  }, pool);
  await assert.rejects(
    batch.repairExactDiscoveryTextUnderLock({ lockToken: lock.token, target: fixture.target }, pool),
    /DISCOVERY_TEXT_REPAIR_EXACT_PHRASE_MISMATCH/,
  );
  assert.equal(await batch.releaseDiscoveryGlobalLock(lock.token, pool), true);
  const audit = (await pool.query(
    `SELECT report_delivery_status, report_txt, report_html FROM audits WHERE id = $1`, [fixture.id],
  )).rows[0];
  assert.equal(audit.report_delivery_status, "BATCH_READY");
  assert.equal(audit.report_txt, fixture.assets.txt);
  assert.equal(audit.report_html, fixture.assets.html);
  const artifact = (await pool.query(
    `SELECT txt, html FROM report_artifacts WHERE audit_id = $1`, [fixture.id],
  )).rows[0];
  assert.equal(artifact.txt, fixture.assets.txt);
  assert.equal(artifact.html, fixture.assets.html);
});

test("exact Discovery repair rolls back on legacy promo path or occurrence divergence", async () => {
  const fixture = await insertExactRepairFixture();
  const before = await pool.query(
    `SELECT narrative_report, report_txt, report_html FROM audits WHERE id = $1`,
    [fixture.id],
  );
  await pool.query(
    `UPDATE audits
        SET narrative_report = jsonb_set(narrative_report, '{sections,11,id}', '"promo-other"'::jsonb)
      WHERE id = $1`,
    [fixture.id],
  );
  const diverged = (await pool.query(
    `SELECT narrative_report FROM audits WHERE id = $1`, [fixture.id],
  )).rows[0].narrative_report;
  const lock = await batch.acquireDiscoveryGlobalLock({
    owner: "postgres-integration",
    purpose: "exact-promo-divergence",
    ttlMinutes: 5,
  }, pool);
  await assert.rejects(
    batch.repairExactDiscoveryTextUnderLock({ lockToken: lock.token, target: fixture.target }, pool),
    /DISCOVERY_TEXT_REPAIR_LEGACY_PROMO_DIVERGENCE/,
  );
  assert.equal(await batch.releaseDiscoveryGlobalLock(lock.token, pool), true);
  const audit = (await pool.query(
    `SELECT narrative_report, report_txt, report_html FROM audits WHERE id = $1`, [fixture.id],
  )).rows[0];
  assert.deepEqual(audit.narrative_report, diverged);
  assert.equal(audit.report_txt, before.rows[0].report_txt);
  assert.equal(audit.report_html, before.rows[0].report_html);
  const artifact = (await pool.query(
    `SELECT txt, html FROM report_artifacts WHERE audit_id = $1`, [fixture.id],
  )).rows[0];
  assert.equal(artifact.txt, before.rows[0].report_txt);
  assert.equal(artifact.html, before.rows[0].report_html);
});

test("exact Discovery repair rolls back when the legacy promo occurrence count diverges", async () => {
  const fixture = await insertExactRepairFixture();
  const before = (await pool.query(
    `SELECT narrative_report, report_txt, report_html FROM audits WHERE id = $1`,
    [fixture.id],
  )).rows[0];
  const divergedNarrative = structuredClone(before.narrative_report);
  divergedNarrative.sections[11].content += LEGACY_DISCOVERY_PROMO_HTML;
  await pool.query(
    `UPDATE audits SET narrative_report = $2::jsonb WHERE id = $1`,
    [fixture.id, JSON.stringify(divergedNarrative)],
  );
  const lock = await batch.acquireDiscoveryGlobalLock({
    owner: "postgres-integration",
    purpose: "exact-promo-occurrence-divergence",
    ttlMinutes: 5,
  }, pool);
  await assert.rejects(
    batch.repairExactDiscoveryTextUnderLock({ lockToken: lock.token, target: fixture.target }, pool),
    /DISCOVERY_TEXT_REPAIR_LEGACY_PROMO_DIVERGENCE/,
  );
  assert.equal(await batch.releaseDiscoveryGlobalLock(lock.token, pool), true);
  const audit = (await pool.query(
    `SELECT narrative_report, report_txt, report_html FROM audits WHERE id = $1`, [fixture.id],
  )).rows[0];
  assert.deepEqual(audit.narrative_report, divergedNarrative);
  assert.equal(audit.report_txt, before.report_txt);
  assert.equal(audit.report_html, before.report_html);
  const artifact = (await pool.query(
    `SELECT txt, html FROM report_artifacts WHERE audit_id = $1`, [fixture.id],
  )).rows[0];
  assert.equal(artifact.txt, before.report_txt);
  assert.equal(artifact.html, before.report_html);
});

test("exact Discovery text repair rejects a factual intensification against live responses", async () => {
  const fixture = await insertExactRepairFixture();
  const lock = await batch.acquireDiscoveryGlobalLock({
    owner: "postgres-integration",
    purpose: "exact-text-repair-factual-rejection",
    ttlMinutes: 5,
  }, pool);
  await assert.rejects(
    batch.repairExactDiscoveryTextUnderLock({
      lockToken: lock.token,
      target: { ...fixture.target, newText: LENNY_UNSAFE_TEXT },
    }, pool),
    /DISCOVERY_TEXT_REPAIR_FACTUAL_CONSISTENCY_FAILED:factual_intensity_contradiction:reveil-fatigue/,
  );
  assert.equal(await batch.releaseDiscoveryGlobalLock(lock.token, pool), true);
  const audit = (await pool.query(
    `SELECT report_delivery_status, report_txt, report_html FROM audits WHERE id = $1`, [fixture.id],
  )).rows[0];
  assert.equal(audit.report_delivery_status, "BATCH_READY");
  assert.equal(audit.report_txt, fixture.assets.txt);
  assert.equal(audit.report_html, fixture.assets.html);
  const artifact = (await pool.query(
    `SELECT txt, html FROM report_artifacts WHERE audit_id = $1`, [fixture.id],
  )).rows[0];
  assert.equal(artifact.txt, fixture.assets.txt);
  assert.equal(artifact.html, fixture.assets.html);
});
