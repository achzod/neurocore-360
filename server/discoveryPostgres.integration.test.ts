import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import test, { after, before, beforeEach } from "node:test";
import { fileURLToPath } from "node:url";

import { Pool } from "pg";
import {
  DISCOVERY_APPROVED_NEUTRAL_PROMO_HTML,
  DISCOVERY_MECHANISM_CATALOG_SHA256,
  DISCOVERY_MECHANISM_CATALOG_VERSION,
  DISCOVERY_MECHANISM_EDITORIAL_SOURCE_SHA256,
  DISCOVERY_PREMIUM_DOMAINS,
  buildDiscoveryDeterministicCta,
  buildDiscoveryDefaultMechanismSelection,
  buildDiscoveryReportAssets,
  calculateDiscoveryDeterministicProfile,
  convertToNarrativeReport,
  discoveryCatalogSelectionSha256,
  validateDiscoveryReportAgainstResponses,
  validateDiscoveryGeneratedNarrative,
  renderDiscoveryCoachingOffersTable,
  type ReportData,
} from "./discovery-scan";
import {
  attachDiscoveryDeliveryGateResult,
  canExposeDiscoveryReport,
  evaluateCanonicalDiscoveryArtifacts,
  hasDiscoveryCatalogLedgerBinding,
  hasPassingPersistedDiscoveryDeliveryGate,
  resolveCanonicalDiscoveryArtifacts,
} from "./discoveryDeliveryGate";
import { DISCOVERY_OTHER_AUDIT_ACTIVE_SQL } from "./discoverySupersededPolicy";

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
  CREATE TABLE audits (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(36),
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
    label TEXT,
    model TEXT,
    response_id TEXT,
    status TEXT NOT NULL DEFAULT 'completed',
    input_tokens INTEGER NOT NULL DEFAULT 0,
    output_tokens INTEGER NOT NULL DEFAULT 0,
    total_tokens INTEGER NOT NULL DEFAULT 0,
    estimated_openai_cost_usd DOUBLE PRECISION NOT NULL DEFAULT 0
  );
`;

let batch: typeof import("./discoveryBatchControl");
let transactional: typeof import("./discoveryTransactionalPersistence");
let budget: typeof import("./aiCostBudgetController");
let schema: typeof import("./discoveryBatchSchema");
let offlineReplay: typeof import("./discoveryAlexandreOfflineReplay");
let migration007BackfillEvidence: Array<{
  id: string;
  artifact_state: string;
  superseded_at: Date | null;
}> = [];

function migration(name: string): string {
  return readFileSync(new URL(`../migrations/${name}`, import.meta.url), "utf8");
}

async function insertAudit(status = "PENDING", responses?: Record<string, unknown>): Promise<string> {
  const id = randomUUID();
  await pool.query(
    `INSERT INTO audits (id, email, type, responses, scores, report_delivery_status, created_at)
     VALUES ($1,$2,'GRATUIT',$3::jsonb,'{}'::jsonb,$4,'2026-08-14T01:00:00.000Z')`,
    [id, `${id}@example.test`, JSON.stringify(responses || { goal: "test", auditId: id }), status],
  );
  return id;
}

async function regenerationSourceBinding(auditId: string) {
  const audit = (await pool.query(
    `SELECT responses,report_delivery_status,narrative_report,report_txt,report_html
       FROM audits WHERE id=$1`,
    [auditId],
  )).rows[0];
  return {
    expectedResponsesSha256: batch.discoverySha256(audit.responses || {}),
    expectedSourceStatus: audit.report_delivery_status ?? null,
    expectedNarrativeSha256: audit.narrative_report == null
      ? null : batch.discoverySha256(audit.narrative_report),
    expectedTxtSha256: audit.report_txt == null ? null : batch.discoverySha256(String(audit.report_txt)),
    expectedHtmlSha256: audit.report_html == null ? null : batch.discoverySha256(String(audit.report_html)),
  };
}

async function createRegenerationBatchForPreparedCandidate(input: {
  auditId: string;
  candidateId: string;
  lockToken: string;
  binding: Awaited<ReturnType<typeof regenerationSourceBinding>>;
  label: string;
}) {
  const batchId = await batch.createDiscoveryBatchRun({
    manifestSha256: batch.discoverySha256(`${input.label}:${input.auditId}`),
    commitSha: "8".repeat(40),
    approvalReference: input.label,
    approvalExpiresAt: new Date(Date.now() + 60_000).toISOString(),
    stage: "REGENERATION",
    tier: "ONE",
    softPerScanUsd: 0.25,
    hardPerScanUsd: 0.75,
    globalBudgetUsd: 0.75,
    lockToken: input.lockToken,
    items: [{
      auditId: input.auditId,
      sequenceNo: 1,
      cohort: "ambiguous",
      expectedResponsesSha256: input.binding.expectedResponsesSha256,
      expectedSourceStatus: "BATCH_REVIEW",
      expectedTxtSha256: input.binding.expectedTxtSha256,
      expectedHtmlSha256: input.binding.expectedHtmlSha256,
      retryOfCandidateId: input.candidateId,
    }],
  }, pool);
  await batch.markDiscoveryBatchItemPreflightOk({
    batchId, auditId: input.auditId, lockToken: input.lockToken,
  }, pool);
  return batchId;
}

async function setupPersistedInvalidRegeneration(label: string) {
  const responses = completeV2Responses();
  const auditId = await insertAudit("BATCH_READY", responses);
  const oldNarrative = { legacyInvalid: label, sections: [] };
  const oldTxt = `invalid-txt:${label}`;
  const oldHtml = `<p>invalid-html:${label}</p>`;
  await pool.query(
    `UPDATE audits SET narrative_report=$2::jsonb,report_txt=$3,report_html=$4 WHERE id=$1`,
    [auditId, JSON.stringify(oldNarrative), oldTxt, oldHtml],
  );
  const oldArtifactId = randomUUID();
  await pool.query(
    `INSERT INTO report_artifacts
      (id,audit_id,tier,engine,model,txt,html,content_sha256,artifact_state)
     VALUES ($1,$2,'GRATUIT','legacy','legacy',$3,$4,$5,'ACTIVE')`,
    [oldArtifactId, auditId, oldTxt, oldHtml, batch.discoveryArtifactContentHash(oldTxt, oldHtml)],
  );
  await insertDiscoveryProviderProof(auditId, `resp_${randomUUID()}`, 0.12);
  const binding = await regenerationSourceBinding(auditId);
  const lock = await batch.acquireDiscoveryGlobalLock({
    owner: "postgres-integration", purpose: label,
  }, pool);
  const prepared = await batch.prepareDiscoveryAuditForRegeneration({
    auditId, lockToken: lock.token, ...binding,
  }, pool);
  assert.equal(prepared.sourceKind, "PERSISTED_INVALID_REPORT");
  const batchId = await createRegenerationBatchForPreparedCandidate({
    auditId, candidateId: prepared.candidateId, lockToken: lock.token, binding, label,
  });
  await batch.claimDiscoveryProviderAttempt({ batchId, auditId, lockToken: lock.token }, pool);
  const responseId = `resp_${randomUUID()}`;
  await insertDiscoveryProviderProof(auditId, responseId, 0.14);
  await batch.recordDiscoveryProviderUsage({
    batchId, auditId, lockToken: lock.token, responseId,
    inputTokens: 100, outputTokens: 50, totalTokens: 150, actualCostUsd: 0.14,
  }, pool);
  const fixture = await buildValidPersistenceFixture(responses, responseId);
  return {
    auditId, oldArtifactId, oldNarrative, oldTxt, oldHtml, binding,
    lock, prepared, batchId, responseId, fixture,
  };
}

function completeV2Responses(): Record<string, unknown> {
  return {
    _discoveryQuestionnaireVersion: 2,
    sexe: "homme", prenom: "Canary", age: "30", taille: "180", poids: "80", objectif: "performance",
    "traitement-medical": "non", "diagnostic-medical": ["aucun"], "tca-historique": "jamais",
    "heures-sommeil": "7-8", "qualite-sommeil": "bonne", endormissement: "jamais",
    "reveil-fatigue": "jamais", "reveils-nocturnes": "jamais", "heure-coucher": "22h-23h",
    "niveau-stress": "modere", anxiete: "jamais", concentration: "bonne", "humeur-fluctuation": "stable",
    "energie-matin": "bonne", "energie-aprem": "stable", "coup-fatigue": "jamais",
    "envies-sucre": "rarement", motivation: "eleve", thermogenese: "non",
    "digestion-qualite": "bonne", ballonnements: "jamais", transit: "regulier", reflux: "jamais",
    intolerance: ["aucune"], "sport-frequence": "3-4", intensite: "intense", recuperation: "bonne",
    courbatures: "parfois", "performance-evolution": "progression", "nb-repas": "3",
    "proteines-jour": "bonne", "eau-jour": "2-3L", "aliments-transformes": "rarement",
    "sucres-ajoutes": "faible", alcool: "0", "cafe-jour": "1-2", tabac: "non",
    "temps-ecran": "2-4h", "exposition-soleil": "regulier", "heures-assis": "4-6h",
    "engagement-niveau": "8-9", "motivation-principale": "performance",
    "consignes-strictes": "oui", "temps-training-semaine": "4-6h",
  };
}

async function buildValidPersistenceFixture(responses: Record<string, unknown>, providerResponseId?: string) {
  const deterministic = calculateDiscoveryDeterministicProfile(responses);
  const generated = validateDiscoveryGeneratedNarrative(
    buildDiscoveryDefaultMechanismSelection(),
    responses,
    deterministic.safetyPolicy,
  );
  if (generated.catalogProvenance) generated.catalogProvenance.providerResponseId = providerResponseId;
  const result = {
    globalScore: deterministic.globalScore,
    scoresByDomain: deterministic.scoresByDomain,
    blocages: deterministic.blocages,
    synthese: generated.synthesis,
    sectionContents: generated.sections,
    ctaMessage: buildDiscoveryDeterministicCta(deterministic.blocages, deterministic.safetyPolicy),
    knowledgePreflight: { synthesis: "", domains: {} },
    safetyPolicy: deterministic.safetyPolicy,
    questionnaireCoverage: deterministic.questionnaireCoverage,
    catalogProvenance: generated.catalogProvenance,
  };
  const report = await convertToNarrativeReport(result, responses);
  const assets = buildDiscoveryReportAssets(report);
  const gate = {
    name: "discovery_delivery" as const,
    version: 4,
    ok: true,
    errors: [],
    checkedAt: "2026-08-14T01:00:00.000Z",
    retryable: false as const,
  };
  return {
    narrativeReport: attachDiscoveryDeliveryGateResult(report, gate),
    scores: { ...deterministic.scoresByDomain, global: deterministic.globalScore },
    assets,
  };
}

async function insertGenerationVersioningFixture(label: string) {
  const responses = { ...completeV2Responses(), prenom: `Generation-${label}` };
  const auditId = await insertAudit("PENDING", responses);
  const sourceTxt = `invalid-source-txt:${label}`;
  const sourceHtml = `<p>invalid-source-html:${label}</p>`;
  await pool.query(
    `UPDATE audits
        SET narrative_report=$2::jsonb,report_txt=$3,report_html=$4
      WHERE id=$1`,
    [auditId, JSON.stringify({ legacyInvalid: label }), sourceTxt, sourceHtml],
  );
  const artifactIds = [randomUUID(), randomUUID(), randomUUID(), randomUUID()];
  for (let index = 0; index < artifactIds.length; index += 1) {
    const active = index === artifactIds.length - 1;
    const txt = active ? sourceTxt : `historical-txt:${label}:${index}`;
    const html = active ? sourceHtml : `<p>historical-html:${label}:${index}</p>`;
    await pool.query(
      `INSERT INTO report_artifacts
        (id,audit_id,tier,engine,model,txt,html,content_sha256,
         artifact_state,superseded_at,created_at)
       VALUES ($1,$2,'GRATUIT','legacy','legacy',$3,$4,$5,$6,$7,$8::timestamptz)`,
      [artifactIds[index], auditId, txt, html, batch.discoveryArtifactContentHash(txt, html),
        active ? "ACTIVE" : "SUPERSEDED", active ? null : "2026-08-14T02:00:00.000Z",
        `2026-08-14T0${index + 1}:00:00.000Z`],
    );
  }
  const before = (await pool.query(
    `SELECT id,tier,engine,model,txt,html,content_sha256,batch_id,
            artifact_state,superseded_at,supersedes_artifact_id,created_at
       FROM report_artifacts WHERE audit_id=$1 ORDER BY created_at,id`,
    [auditId],
  )).rows;
  return {
    auditId,
    responses,
    sourceTxt,
    sourceHtml,
    activeArtifactId: artifactIds[3],
    before,
  };
}

async function insertExactDuplicateResolutionFixture() {
  const supersededId = randomUUID();
  const canonicalId = randomUUID();
  const email = `${randomUUID()}@example.test`;
  const userId = randomUUID();
  const supersededResponses = { prenom: "Suzie", age: 61, objectif: "perte-graisse" };
  const canonicalResponses = { prenom: "Suzie ", age: 61, objectif: "sante", "tca-historique": "passe" };
  // Production stores PostgreSQL microseconds while the JavaScript Date
  // decoder truncates to milliseconds. Keep the exact live-like precision so
  // the one-shot CAS proves it binds the locked database value losslessly.
  const supersededCreatedAt = "2026-08-13T14:45:03.692385Z";
  const canonicalCreatedAt = "2026-08-14T09:17:12.089686Z";
  for (const row of [
    { id: supersededId, responses: supersededResponses, createdAt: supersededCreatedAt, attempts: 0 },
    { id: canonicalId, responses: canonicalResponses, createdAt: canonicalCreatedAt, attempts: 1 },
  ]) {
    await pool.query(
      `INSERT INTO audits
        (id,user_id,email,type,status,responses,scores,narrative_report,
         report_txt,report_html,report_generated_at,report_delivery_status,report_sent_at,created_at)
       VALUES ($1,$2,$3,'GRATUIT','COMPLETED',$4::jsonb,'{}'::jsonb,$5::jsonb,
               NULL,NULL,NULL,'NEEDS_REVIEW',NULL,$6::timestamptz)`,
      [row.id, userId, email, JSON.stringify(row.responses),
        JSON.stringify({ recovery: { reason: "missing_artifacts" }, auditId: row.id }), row.createdAt],
    );
    await pool.query(
      `INSERT INTO report_jobs
        (audit_id,status,progress,current_section,error,attempt_count,started_at,updated_at,last_progress_at)
       VALUES ($1,'failed',10,'Génération Discovery premium OpenAI...',
               'DISCOVERY_UNIFIED_GENERATION_ENABLED is not true',$2,NOW(),NOW(),NOW())`,
      [row.id, row.attempts],
    );
    await pool.query(
      `INSERT INTO email_tracking
        (id,email_type,recipient_email,audit_id,audit_type,sendpulse_status,sent_at)
       VALUES ($1,'sendAdminEmailNewAudit',$2,$3,'GRATUIT','success',NOW())`,
      [randomUUID(), email, row.id],
    );
  }
  return {
    supersededId,
    canonicalId,
    email,
    userId,
    supersededResponses,
    canonicalResponses,
    target: {
      emailSha256: batch.discoverySha256(email),
      userIdSha256: batch.discoverySha256(userId),
      superseded: {
        id: supersededId,
        createdAt: supersededCreatedAt,
        responsesSha256: batch.discoverySha256(supersededResponses),
        responseKeyCount: Object.keys(supersededResponses).length,
        expectedJobAttemptCount: 0,
      },
      canonical: {
        id: canonicalId,
        createdAt: canonicalCreatedAt,
        responsesSha256: batch.discoverySha256(canonicalResponses),
        responseKeyCount: Object.keys(canonicalResponses).length,
        expectedJobAttemptCount: 1,
      },
    },
  };
}

const LENNY_OLD_TEXT = "La seule nuance se trouve au matin. une fatigue parfois présente au réveil, ton énergie matinale est moyenne et tu te réveilles parfois fatigué.";
const LENNY_NEW_TEXT = "La seule nuance se trouve au réveil : une fatigue parfois présente et une énergie matinale moyenne.";
const LENNY_UNSAFE_TEXT = "La seule nuance se trouve au réveil : une fatigue parfois présente, une énergie matinale moyenne et un réveil parfois difficile.";
const LENNY_NUTRITION_OLD_TEXT = "la régularité et la qualité de l’apport protéique deviennent plus importantes. je n'ai pas les éléments pour juger les quantités, la répartition ni l’apport énergétique total avec les réponses disponibles.";
const LENNY_NUTRITION_NEW_TEXT = "la régularité et la qualité de l’apport protéique deviennent plus importantes. Je n'ai pas les éléments pour juger les quantités, la répartition ni l’apport énergétique total avec les réponses disponibles.";
const LENNY_WAKE_SUMMARY_OLD_TEXT = "ton énergie matinale est moyenne, le lever est difficile et tu te réveilles parfois fatigué";
const LENNY_WAKE_SUMMARY_NEW_TEXT = "ton énergie matinale est moyenne et tu te réveilles parfois fatigué";
const ALEXANDRE_CRITICAL_OLD_TEXT = "2 blocages structurants ressortent de tes réponses, sans atteindre le niveau critique calculé.";
const ALEXANDRE_CRITICAL_NEW_TEXT = "2 blocages structurants ressortent de tes réponses.";
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

function exactRepairReport(
  duplicatePhrase = false,
  nutritionMode: "valid" | "duplicate" | "wrong-path" = "valid",
): ReportData {
  const clientName = "Lenny";
  const sections = [
    "intro", "global", "digestion", "stress", "energie", "sommeil",
    "training", "nutrition", "lifestyle", "mindset", "scans", "coaching",
  ].map((id, index) => ({
    id,
    title: id === "sommeil" ? "Sommeil" : `Section ${index}`,
    content: `<p>${["sommeil", "stress", "energie", "digestion", "training", "nutrition", "lifestyle", "mindset"].includes(id) || index === 0 ? `${clientName} ` : ""}${"Contenu physiologique précis et personnalisé. ".repeat(72)}</p>`,
  }));
  sections[1].content += `<p>Dans ce contexte, ${LENNY_NUTRITION_OLD_TEXT}${nutritionMode === "duplicate" ? ` ${LENNY_NUTRITION_OLD_TEXT}` : ""}</p>`;
  if (nutritionMode === "wrong-path") sections[1].id = "global-other";
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

async function insertExactRepairFixture(
  duplicatePhrase = false,
  nutritionMode: "valid" | "duplicate" | "wrong-path" = "valid",
) {
  const id = randomUUID();
  const email = `${id}@example.test`;
  const report = exactRepairReport(duplicatePhrase, nutritionMode);
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
      nutritionSectionIndex: 1,
      nutritionSectionId: "global",
      nutritionOldText: LENNY_NUTRITION_OLD_TEXT,
      nutritionNewText: LENNY_NUTRITION_NEW_TEXT,
      expectedNutritionOccurrencesPerArtifact: 1 as const,
      promoSectionIndex: 11,
      promoSectionId: "coaching" as const,
      expectedPromoCodeOccurrencesPerArtifact: 1 as const,
      legacyPromoHtml: LEGACY_DISCOVERY_PROMO_HTML,
      approvedNeutralPromoHtml: DISCOVERY_APPROVED_NEUTRAL_PROMO_HTML,
    },
  };
}

async function insertExactWakeSummaryRepairFixture(
  mode: "valid" | "duplicate" | "wrong-path" | "artifact-hash-divergent" = "valid",
) {
  const id = randomUUID();
  const email = `${id}@example.test`;
  const report = exactRepairReport();
  report.sections[5].content = report.sections[5].content.replace(LENNY_OLD_TEXT, LENNY_NEW_TEXT);
  report.sections[1].content = report.sections[1].content.replace(
    LENNY_NUTRITION_OLD_TEXT,
    LENNY_NUTRITION_NEW_TEXT,
  );
  report.sections[1].content += `<p>La petite zone à observer se situe au réveil: ${LENNY_WAKE_SUMMARY_OLD_TEXT}. Ce n’est pas un signal alarmant.</p>`;
  if (mode === "duplicate") {
    report.sections[1].content += `<p>${LENNY_WAKE_SUMMARY_OLD_TEXT}.</p>`;
  }
  if (mode === "wrong-path") report.sections[1].id = "global-other";
  report.sections[11].content = report.sections[11].content.replace(
    LEGACY_DISCOVERY_PROMO_HTML,
    DISCOVERY_APPROVED_NEUTRAL_PROMO_HTML,
  );
  assert.equal(
    report.sections[11].content.includes(DISCOVERY_APPROVED_NEUTRAL_PROMO_HTML),
    true,
    "wake-summary fixture must reproduce the exact post-first-repair promo state",
  );
  const assets = buildDiscoveryReportAssets(report);
  const narrative = attachDiscoveryDeliveryGateResult(report, {
    name: "discovery_delivery",
    version: 4,
    ok: true,
    errors: [],
    checkedAt: "2026-08-14T01:00:00.000Z",
    retryable: false,
  });
  const artifactId = randomUUID();
  const contentSha256 = batch.discoveryArtifactContentHash(assets.txt, assets.html);
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
    [artifactId, id, assets.txt, assets.html,
      mode === "artifact-hash-divergent" ? "0".repeat(64) : contentSha256],
  );
  const persisted = (await pool.query(
    `SELECT responses, narrative_report FROM audits WHERE id = $1`,
    [id],
  )).rows[0];
  return {
    id,
    email,
    artifactId,
    assets,
    target: {
      id,
      emailSha256: batch.discoverySha256(email),
      expectedCurrentStatus: "BATCH_READY" as const,
      expectedResponsesJsonSha256: batch.discoverySha256(JSON.stringify(persisted.responses)),
      expectedNarrativeJsonSha256: batch.discoverySha256(JSON.stringify(persisted.narrative_report)),
      expectedTxtSha256: batch.discoverySha256(assets.txt),
      expectedHtmlSha256: batch.discoverySha256(assets.html),
      expectedArtifactId: artifactId,
      expectedArtifactContentSha256: contentSha256,
      expectedArtifactCount: 1 as const,
      expectedNarrativeTopLevelKeys: [
        "analysisMetadata", "auditType", "clientName", "generatedAt", "generationQuality",
        "globalScore", "metrics", "sections", "validationResult",
      ],
      sectionIndex: 1,
      sectionId: "global",
      oldText: LENNY_WAKE_SUMMARY_OLD_TEXT,
      newText: LENNY_WAKE_SUMMARY_NEW_TEXT,
      expectedOccurrencesPerRepresentation: 1 as const,
      alreadyFixedSleepText: LENNY_NEW_TEXT,
      alreadyFixedNutritionText: LENNY_NUTRITION_NEW_TEXT,
      promoSectionIndex: 11,
      promoSectionId: "coaching" as const,
      approvedNeutralPromoHtml: DISCOVERY_APPROVED_NEUTRAL_PROMO_HTML,
    },
  };
}

async function insertExactAlexandreCriticalCopyFixture(
  mode: "valid" | "duplicate-visible" | "wrong-metadata-path" | "duplicate-preexisting-new" = "valid",
) {
  const id = randomUUID();
  const email = `${id}@example.test`;
  const report = exactRepairReport();
  report.clientName = "Alexandre";
  for (const section of report.sections) {
    section.content = section.content.replaceAll("Lenny", "Alexandre");
  }
  report.sections[5].content = report.sections[5].content.replace(LENNY_OLD_TEXT, LENNY_NEW_TEXT);
  report.sections[1].content = report.sections[1].content.replace(
    LENNY_NUTRITION_OLD_TEXT,
    LENNY_NUTRITION_NEW_TEXT,
  );
  report.sections[11].content = report.sections[11].content.replace(
    LEGACY_DISCOVERY_PROMO_HTML,
    DISCOVERY_APPROVED_NEUTRAL_PROMO_HTML,
  );
  report.sections[5].title = "Sommeil 25/100 [BLOCAGE CRITIQUE]";
  report.sections[9].content += `<p>${ALEXANDRE_CRITICAL_NEW_TEXT}</p>`;
  if (mode === "duplicate-preexisting-new") {
    report.sections[9].content += `<p>${ALEXANDRE_CRITICAL_NEW_TEXT}</p>`;
  }
  report.sections[10].content += `<p>${ALEXANDRE_CRITICAL_OLD_TEXT}</p>`;
  if (mode === "duplicate-visible") {
    report.sections[10].content += `<p>${ALEXANDRE_CRITICAL_OLD_TEXT}</p>`;
  }
  report.analysisMetadata = mode === "wrong-metadata-path"
    ? { summary: ALEXANDRE_CRITICAL_OLD_TEXT }
    : { ctaMessage: ALEXANDRE_CRITICAL_OLD_TEXT };
  const assets = buildDiscoveryReportAssets(report);
  const narrative = attachDiscoveryDeliveryGateResult(report, {
    name: "discovery_delivery",
    version: 4,
    ok: true,
    errors: [],
    checkedAt: "2026-08-14T01:00:00.000Z",
    retryable: false,
  });
  const artifactId = randomUUID();
  const responses = { source: "integration-test" };
  const contentSha256 = batch.discoveryArtifactContentHash(assets.txt, assets.html);
  await pool.query(
    `INSERT INTO audits
      (id,email,type,responses,scores,report_delivery_status,report_sent_at,
       narrative_report,report_txt,report_html,created_at)
     VALUES ($1,$2,'GRATUIT',$3::jsonb,'{}'::jsonb,'BATCH_READY',NULL,$4::jsonb,$5,$6,'2026-08-14T01:00:00.000Z')`,
    [id, email, JSON.stringify(responses), JSON.stringify(narrative), assets.txt, assets.html],
  );
  await pool.query(
    `INSERT INTO report_artifacts
      (id,audit_id,tier,engine,model,txt,html,content_sha256,created_at)
     VALUES ($1,$2,'GRATUIT','discovery','integration-test',$3,$4,$5,NOW())`,
    [artifactId, id, assets.txt, assets.html, contentSha256],
  );
  const persisted = (await pool.query(
    `SELECT responses, narrative_report FROM audits WHERE id = $1`,
    [id],
  )).rows[0];
  return {
    id,
    email,
    artifactId,
    assets,
    target: {
      id,
      emailSha256: batch.discoverySha256(email),
      expectedCurrentStatus: "BATCH_READY" as const,
      expectedResponsesJsonSha256: batch.discoverySha256(JSON.stringify(persisted.responses)),
      expectedNarrativeJsonSha256: batch.discoverySha256(JSON.stringify(persisted.narrative_report)),
      expectedTxtSha256: batch.discoverySha256(assets.txt),
      expectedHtmlSha256: batch.discoverySha256(assets.html),
      expectedArtifactId: artifactId,
      expectedArtifactContentSha256: contentSha256,
      expectedArtifactCount: 1 as const,
      expectedNarrativeTopLevelKeys: [
        "analysisMetadata", "auditType", "clientName", "generatedAt", "generationQuality",
        "globalScore", "metrics", "sections", "validationResult",
      ],
      sectionIndex: 10,
      sectionId: "scans" as const,
      metadataKey: "ctaMessage" as const,
      oldText: ALEXANDRE_CRITICAL_OLD_TEXT,
      newText: ALEXANDRE_CRITICAL_NEW_TEXT,
      expectedNarrativeOccurrences: 2 as const,
      expectedRenderedOccurrences: 1 as const,
      expectedPreexistingNewNarrativeOccurrences: 1,
      expectedPreexistingNewRenderedOccurrences: 1,
    },
  };
}

before(async () => {
  const identity = await pool.query("SELECT current_database() AS name, inet_server_addr()::text AS host");
  assert.equal(identity.rows[0]?.name, "apex_discovery_test");
  assert.match(String(identity.rows[0]?.host), /^(127\.0\.0\.1|::1)(?:\/\d+)?$/);
  await pool.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public");
  await pool.query("DROP EXTENSION IF EXISTS pgcrypto CASCADE");
  await pool.query(baselineSql);
  for (const name of [
    "001_create_email_tracking.sql",
    "002_create_email_tracking.sql",
    "003_discovery_batch_safety.sql",
    "004_discovery_delivery_claims_global.sql",
    "005_discovery_batch_source_cas.sql",
    "006_discovery_rejected_candidate_retry.sql",
  ]) {
    await pool.query(migration(name));
  }
  const migrationAuditId = randomUUID();
  const matchingArtifactId = randomUUID();
  const newerDivergentArtifactId = randomUUID();
  await pool.query(
    `INSERT INTO audits
       (id,email,type,responses,scores,report_txt,report_html,report_delivery_status,created_at)
     VALUES ($1,$2,'GRATUIT','{}'::jsonb,'{}'::jsonb,'canonical-txt','canonical-html',
             'BATCH_REVIEW','2026-08-14T01:00:00.000Z')`,
    [migrationAuditId, `${migrationAuditId}@example.test`],
  );
  await pool.query(
    `INSERT INTO report_artifacts
       (id,audit_id,tier,engine,model,txt,html,created_at)
     VALUES
       ($1,$3,'GRATUIT','legacy','legacy','canonical-txt','canonical-html','2026-08-14T01:00:00.000Z'),
       ($2,$3,'GRATUIT','legacy','legacy','divergent-txt','divergent-html','2026-08-14T02:00:00.000Z')`,
    [matchingArtifactId, newerDivergentArtifactId, migrationAuditId],
  );
  await pool.query(migration("007_report_artifact_versioning.sql"));
  migration007BackfillEvidence = (await pool.query(
    `SELECT id,artifact_state,superseded_at
       FROM report_artifacts
      WHERE audit_id=$1
      ORDER BY id`,
    [migrationAuditId],
  )).rows;
  assert.equal(
    Number((await pool.query(
      "SELECT COUNT(*)::int AS count FROM pg_extension WHERE extname='pgcrypto'",
    )).rows[0]?.count),
    0,
  );
  await pool.query(migration("008_discovery_legacy_narrative_provenance.sql"));
  await pool.query(migration("009_discovery_generation_active_artifact_binding.sql"));
  await pool.query(migration("010_discovery_offline_replay_proof.sql"));
  schema = await import("./discoveryBatchSchema");
  batch = await import("./discoveryBatchControl");
  transactional = await import("./discoveryTransactionalPersistence");
  budget = await import("./aiCostBudgetController");
  offlineReplay = await import("./discoveryAlexandreOfflineReplay");
});

beforeEach(async () => {
  await pool.query(`TRUNCATE TABLE
    discovery_rejected_candidates,
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
        AND (table_name,column_name) IN (
          ('discovery_batch_items','expected_source_status'),
          ('discovery_email_delivery_claims','fence_token')
        )
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

test("migration 006 enforces exact rejected-candidate origins and one attempt row per audit", async () => {
  await schema.assertDiscoveryBatchSchemaV006(pool);
  const definitions = await pool.query(
    `SELECT conname,pg_get_constraintdef(oid,true) AS definition
       FROM pg_constraint
      WHERE conname IN ('discovery_rejected_candidates_origin_check',
        'discovery_rejected_candidates_audit_attempt_key',
        'discovery_rejected_candidates_state_check')
      ORDER BY conname`,
  );
  assert.equal(definitions.rowCount, 3);
  assert.match(definitions.rows.find((row) => row.conname.endsWith("state_check")).definition, /RETRY_AMBIGUOUS/);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("DROP INDEX discovery_batch_items_retry_candidate_uq");
    await assert.rejects(
      schema.assertDiscoveryBatchSchemaV006(client),
      /DISCOVERY_BATCH_SCHEMA_V006_REQUIRED:.*invalid_index:discovery_batch_items_retry_candidate_uq/,
    );
    await client.query("ROLLBACK");
  } finally {
    client.release();
  }
  await schema.assertDiscoveryBatchSchemaV006(pool);
});

test("migration 007 preserves history and selects one canonical ACTIVE artifact", async () => {
  await schema.assertDiscoveryBatchSchemaV007(pool);
  assert.equal(migration007BackfillEvidence.length, 2);
  const active = migration007BackfillEvidence.filter((row) => row.artifact_state === "ACTIVE");
  const superseded = migration007BackfillEvidence.filter((row) => row.artifact_state === "SUPERSEDED");
  assert.equal(active.length, 1);
  assert.equal(superseded.length, 1);
  assert.equal(superseded[0].superseded_at instanceof Date, true);

  const auditId = await insertAudit();
  await pool.query(
    `INSERT INTO report_artifacts
       (id,audit_id,tier,engine,model,txt,html,artifact_state)
     VALUES ($1,$2,'GRATUIT','test','test','txt-a','html-a','ACTIVE')`,
    [randomUUID(), auditId],
  );
  await assert.rejects(
    pool.query(
      `INSERT INTO report_artifacts
         (id,audit_id,tier,engine,model,txt,html,artifact_state)
       VALUES ($1,$2,'GRATUIT','test','test','txt-b','html-b','ACTIVE')`,
      [randomUUID(), auditId],
    ),
    /report_artifacts_one_active_per_audit_uq/,
  );

  const protectedArtifact = (await pool.query(
    `SELECT id,txt,html,content_sha256,batch_id,created_at
       FROM report_artifacts
      WHERE audit_id=$1 AND artifact_state='ACTIVE'`,
    [auditId],
  )).rows[0];
  for (const mutation of [
    "txt='mutated'",
    "html='mutated'",
    "content_sha256=repeat('0',64)",
    "engine='mutated'",
    "model='mutated'",
    "audit_id='00000000-0000-0000-0000-000000000000'",
    "supersedes_artifact_id=id",
    "created_at=created_at + interval '1 second'",
  ]) {
    await assert.rejects(
      pool.query(`UPDATE report_artifacts SET ${mutation} WHERE id=$1`, [protectedArtifact.id]),
      /REPORT_ARTIFACT_APPEND_ONLY_UPDATE_BLOCKED/,
      mutation,
    );
  }
  await assert.rejects(
    pool.query("DELETE FROM report_artifacts WHERE id=$1", [protectedArtifact.id]),
    /REPORT_ARTIFACT_APPEND_ONLY_DELETE_BLOCKED/,
  );
  await assert.rejects(
    pool.query(
      `UPDATE report_artifacts SET artifact_state='SUPERSEDED' WHERE id=$1`,
      [protectedArtifact.id],
    ),
    /REPORT_ARTIFACT_APPEND_ONLY_UPDATE_BLOCKED/,
  );
  const supersededAt = new Date();
  assert.equal((await pool.query(
    `UPDATE report_artifacts
        SET artifact_state='SUPERSEDED',superseded_at=$2
      WHERE id=$1 AND artifact_state='ACTIVE'`,
    [protectedArtifact.id, supersededAt],
  )).rowCount, 1);
  await assert.rejects(
    pool.query(
      `UPDATE report_artifacts
          SET artifact_state='ACTIVE',superseded_at=NULL
        WHERE id=$1`,
      [protectedArtifact.id],
    ),
    /REPORT_ARTIFACT_APPEND_ONLY_UPDATE_BLOCKED/,
  );
  await assert.rejects(
    pool.query(
      `UPDATE report_artifacts SET superseded_at=superseded_at + interval '1 second' WHERE id=$1`,
      [protectedArtifact.id],
    ),
    /REPORT_ARTIFACT_APPEND_ONLY_UPDATE_BLOCKED/,
  );
  const replacementId = randomUUID();
  await pool.query(
    `INSERT INTO report_artifacts
       (id,audit_id,tier,engine,model,txt,html,artifact_state,supersedes_artifact_id)
     VALUES ($1,$2,'GRATUIT','test','test','replacement-txt','replacement-html','ACTIVE',$3)`,
    [replacementId, auditId, protectedArtifact.id],
  );
  const history = (await pool.query(
    `SELECT id,artifact_state,superseded_at,supersedes_artifact_id,txt,html,
            content_sha256,batch_id,created_at
       FROM report_artifacts WHERE audit_id=$1 ORDER BY created_at,id`,
    [auditId],
  )).rows;
  const historical = history.find((row) => row.id === protectedArtifact.id);
  const replacement = history.find((row) => row.id === replacementId);
  assert.equal(historical.artifact_state, "SUPERSEDED");
  assert.equal(new Date(historical.superseded_at).toISOString(), supersededAt.toISOString());
  assert.equal(historical.txt, protectedArtifact.txt);
  assert.equal(historical.html, protectedArtifact.html);
  assert.equal(historical.content_sha256, protectedArtifact.content_sha256);
  assert.equal(historical.batch_id, protectedArtifact.batch_id);
  assert.equal(new Date(historical.created_at).toISOString(), new Date(protectedArtifact.created_at).toISOString());
  assert.equal(replacement.artifact_state, "ACTIVE");
  assert.equal(replacement.supersedes_artifact_id, protectedArtifact.id);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("DROP INDEX report_artifacts_one_active_per_audit_uq");
    await assert.rejects(
      schema.assertDiscoveryBatchSchemaV007(client),
      /DISCOVERY_BATCH_SCHEMA_V007_REQUIRED:.*invalid_index:report_artifacts_one_active_per_audit_uq/,
    );
    await client.query("ROLLBACK");
  } finally {
    client.release();
  }
  const triggerClient = await pool.connect();
  try {
    await triggerClient.query("BEGIN");
    await triggerClient.query("DROP TRIGGER report_artifacts_append_only ON report_artifacts");
    await assert.rejects(
      schema.assertDiscoveryBatchSchemaV007(triggerClient),
      /DISCOVERY_BATCH_SCHEMA_V007_REQUIRED:.*missing_trigger:report_artifacts_append_only/,
    );
    await triggerClient.query("ROLLBACK");
  } finally {
    triggerClient.release();
  }
  const functionClient = await pool.connect();
  try {
    await functionClient.query("BEGIN");
    await functionClient.query(
      `CREATE OR REPLACE FUNCTION enforce_report_artifacts_append_only()
       RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN RETURN NEW; END; $$`,
    );
    await assert.rejects(
      schema.assertDiscoveryBatchSchemaV007(functionClient),
      /DISCOVERY_BATCH_SCHEMA_V007_REQUIRED:.*invalid_function:enforce_report_artifacts_append_only/,
    );
    await functionClient.query("ROLLBACK");
  } finally {
    functionClient.release();
  }
  await schema.assertDiscoveryBatchSchemaV007(pool);
});

test("migration 008 enforces exact immutable legacy narrative provenance", async () => {
  await schema.assertDiscoveryBatchSchemaV008(pool);
  await pool.query(migration("008_discovery_legacy_narrative_provenance.sql"));
  await schema.assertDiscoveryBatchSchemaV008(pool);
  assert.equal(
    Number((await pool.query(
      "SELECT COUNT(*)::int AS count FROM pg_extension WHERE extname='pgcrypto'",
    )).rows[0]?.count),
    1,
  );
  assert.equal(
    (await pool.query(
      `SELECT encode(digest(convert_to('discovery-pgcrypto-gate','UTF8'),'sha256'),'hex') AS sha256`,
    )).rows[0]?.sha256,
    "4b3ea3e75d374edcde010d4dc06734450d7acd4c29dea2ed802de31fa791fc3c",
  );
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `DROP TRIGGER discovery_legacy_narrative_provenance_append_only
         ON discovery_rejected_candidates`,
    );
    await assert.rejects(
      schema.assertDiscoveryBatchSchemaV008(client),
      /DISCOVERY_BATCH_SCHEMA_V008_REQUIRED:.*invalid_trigger:discovery_legacy_narrative_provenance_append_only/,
    );
    await client.query("ROLLBACK");
  } finally {
    client.release();
  }
  await schema.assertDiscoveryBatchSchemaV008(pool);

  const missingExtensionClient = await pool.connect();
  try {
    await missingExtensionClient.query("BEGIN");
    await missingExtensionClient.query("DROP EXTENSION pgcrypto CASCADE");
    await assert.rejects(
      schema.assertDiscoveryBatchSchemaV008(missingExtensionClient),
      /DISCOVERY_BATCH_SCHEMA_V008_REQUIRED:.*missing_extension:pgcrypto/,
    );
    await missingExtensionClient.query("ROLLBACK");
  } finally {
    missingExtensionClient.release();
  }
  await schema.assertDiscoveryBatchSchemaV008(pool);
});

test("migration 009 seals complete optional ACTIVE artifact bindings", async () => {
  await schema.assertDiscoveryBatchSchemaV009(pool);
  await pool.query(migration("009_discovery_generation_active_artifact_binding.sql"));
  await schema.assertDiscoveryBatchSchemaV009(pool);
  const columns = await pool.query(
    `SELECT column_name,data_type,is_nullable,character_maximum_length
       FROM information_schema.columns
      WHERE table_schema=current_schema()
        AND table_name='discovery_batch_items'
        AND column_name LIKE 'expected_active_artifact_%'
      ORDER BY column_name`,
  );
  assert.deepEqual(columns.rows, [
    { column_name: "expected_active_artifact_content_sha256", data_type: "character", is_nullable: "YES", character_maximum_length: 64 },
    { column_name: "expected_active_artifact_html_sha256", data_type: "character", is_nullable: "YES", character_maximum_length: 64 },
    { column_name: "expected_active_artifact_id", data_type: "character varying", is_nullable: "YES", character_maximum_length: 36 },
    { column_name: "expected_active_artifact_txt_sha256", data_type: "character", is_nullable: "YES", character_maximum_length: 64 },
  ]);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      "ALTER TABLE discovery_batch_items DROP CONSTRAINT discovery_batch_items_active_artifact_binding_check",
    );
    await assert.rejects(
      schema.assertDiscoveryBatchSchemaV009(client),
      /DISCOVERY_BATCH_SCHEMA_V009_REQUIRED:.*missing_constraint:discovery_batch_items_active_artifact_binding_check/,
    );
    await client.query("ROLLBACK");
  } finally {
    client.release();
  }
  await schema.assertDiscoveryBatchSchemaV009(pool);

  const permissiveClient = await pool.connect();
  try {
    await permissiveClient.query("BEGIN");
    await permissiveClient.query(
      `ALTER TABLE discovery_batch_items
         DROP CONSTRAINT discovery_batch_items_active_artifact_binding_check,
         ADD CONSTRAINT discovery_batch_items_active_artifact_binding_check CHECK (
           (expected_active_artifact_id IS NULL
             AND expected_active_artifact_txt_sha256 IS NULL
             AND expected_active_artifact_html_sha256 IS NULL
             AND expected_active_artifact_content_sha256 IS NULL)
           OR (expected_active_artifact_id IS NOT NULL
             AND expected_active_artifact_txt_sha256 IS NOT NULL
             AND expected_active_artifact_html_sha256 IS NOT NULL
             AND expected_active_artifact_content_sha256 IS NOT NULL)
           OR TRUE
         )`,
    );
    await assert.rejects(
      schema.assertDiscoveryBatchSchemaV009(permissiveClient),
      /DISCOVERY_BATCH_SCHEMA_V009_REQUIRED:.*invalid_constraint:discovery_batch_items_active_artifact_binding_check/,
    );
    await permissiveClient.query("ROLLBACK");
  } finally {
    permissiveClient.release();
  }
  await schema.assertDiscoveryBatchSchemaV009(pool);
});

test("migration 010 exact gate rejects permissive checks, altered FKs, function and trigger", async () => {
  await offlineReplay.assertDiscoveryOfflineReplaySchemaV010(pool);
  await pool.query(migration("010_discovery_offline_replay_proof.sql"));
  await offlineReplay.assertDiscoveryOfflineReplaySchemaV010(pool);

  const sabotageCases: Array<{
    sql: string;
    expected: RegExp;
  }> = [
    {
      sql: `ALTER TABLE discovery_offline_replay_proofs
              DROP CONSTRAINT discovery_offline_replay_operation_check,
              ADD CONSTRAINT discovery_offline_replay_operation_check
                CHECK (operation = 'ALEXANDRE_ATTEMPT2_CANONICAL_REPLAY' OR TRUE)`,
      expected: /DISCOVERY_OFFLINE_REPLAY_SCHEMA_V010_REQUIRED:.*constraint:discovery_offline_replay_operation_check/,
    },
    {
      sql: `ALTER TABLE discovery_offline_replay_proofs
              DROP CONSTRAINT discovery_offline_replay_hashes_check,
              ADD CONSTRAINT discovery_offline_replay_hashes_check CHECK (TRUE)`,
      expected: /DISCOVERY_OFFLINE_REPLAY_SCHEMA_V010_REQUIRED:.*constraint:discovery_offline_replay_hashes_check/,
    },
    {
      sql: `ALTER TABLE discovery_offline_replay_proofs
              DROP CONSTRAINT discovery_offline_replay_proofs_audit_id_fkey,
              ADD CONSTRAINT discovery_offline_replay_proofs_audit_id_fkey
                FOREIGN KEY (audit_id) REFERENCES audits(id) ON DELETE CASCADE`,
      expected: /DISCOVERY_OFFLINE_REPLAY_SCHEMA_V010_REQUIRED:.*constraint:discovery_offline_replay_proofs_audit_id_fkey/,
    },
    {
      sql: `ALTER TABLE discovery_offline_replay_proofs
              ALTER COLUMN created_at DROP DEFAULT`,
      expected: /DISCOVERY_OFFLINE_REPLAY_SCHEMA_V010_REQUIRED:.*column:created_at/,
    },
    {
      sql: `ALTER TABLE discovery_offline_replay_proofs
              ADD CONSTRAINT discovery_offline_replay_extra_check CHECK (TRUE)`,
      expected: /DISCOVERY_OFFLINE_REPLAY_SCHEMA_V010_REQUIRED:.*constraint_cardinality/,
    },
    {
      sql: `DROP INDEX discovery_offline_replay_audit_operation_uq;
            CREATE INDEX discovery_offline_replay_audit_operation_uq
              ON discovery_offline_replay_proofs(audit_id, operation)`,
      expected: /DISCOVERY_OFFLINE_REPLAY_SCHEMA_V010_REQUIRED:.*append_only_physical_gate/,
    },
    {
      sql: `CREATE OR REPLACE FUNCTION enforce_discovery_offline_replay_append_only()
              RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RETURN NEW; END; $$`,
      expected: /DISCOVERY_OFFLINE_REPLAY_SCHEMA_V010_REQUIRED:.*append_only_physical_gate/,
    },
    {
      sql: `DROP TRIGGER discovery_offline_replay_append_only ON discovery_offline_replay_proofs;
            CREATE TRIGGER discovery_offline_replay_append_only
              BEFORE UPDATE ON discovery_offline_replay_proofs
              FOR EACH ROW EXECUTE FUNCTION enforce_discovery_offline_replay_append_only()`,
      expected: /DISCOVERY_OFFLINE_REPLAY_SCHEMA_V010_REQUIRED:.*append_only_physical_gate/,
    },
  ];
  for (const sabotage of sabotageCases) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(sabotage.sql);
      await assert.rejects(
        offlineReplay.assertDiscoveryOfflineReplaySchemaV010(client),
        sabotage.expected,
      );
      await client.query("ROLLBACK");
    } finally {
      client.release();
    }
    await offlineReplay.assertDiscoveryOfflineReplaySchemaV010(pool);
  }
});

test("Alexandre offline replay versions the ACTIVE artifact, binds ledger provenance and remains append-only", async () => {
  const fixture = await insertAlexandreOfflineReplayFixture("success");
  const candidatesBefore = (await pool.query(
    `SELECT id,batch_id,generation_claim_token,audit_id,provider_response_id,attempt_no,model,
            source_kind,provider_raw,provider_raw_text,assembled_candidate,provider_raw_sha256,
            assembled_sha256,report_txt_sha256,report_html_sha256,artifact_content_sha256,
            artifact_id,reservation_id,usage_event_id,responses_sha256,validation_errors,
            actual_cost_usd,state,retried_by_batch_id,created_at,updated_at
       FROM discovery_rejected_candidates WHERE audit_id=$1 ORDER BY attempt_no`,
    [fixture.target.auditId],
  )).rows;
  const ledgersBefore = (await pool.query(
    `SELECT r.id::text AS reservation_id,r.status,r.actual_cost_usd,r.response_id,
            e.id::bigint AS usage_event_id,e.model,e.status AS usage_status,
            e.input_tokens,e.output_tokens,e.total_tokens,e.estimated_openai_cost_usd
       FROM ai_cost_budget_reservations r
       JOIN ai_usage_events e ON e.response_id=r.response_id
      WHERE r.order_id=$1 ORDER BY r.response_id`,
    [fixture.target.auditId],
  )).rows;
  const inspected = await offlineReplay.inspectExactAlexandreOfflineReplay(pool);
  assert.equal(inspected.manifest.schemaVersion, 2);
  assert.equal(inspected.manifest.audit.reportGeneratedAtDbText, fixture.reportGeneratedAtDbText);
  assert.equal(
    inspected.manifestSha256,
    offlineReplay.discoveryAlexandreReplaySha256(inspected.manifest),
  );
  const legacyTruncatedManifest = structuredClone(inspected.manifest);
  legacyTruncatedManifest.audit.reportGeneratedAtDbText = "2026-08-14 01:00:00.992";
  assert.notEqual(
    offlineReplay.discoveryAlexandreReplaySha256(legacyTruncatedManifest),
    inspected.manifestSha256,
  );
  const timestampPrecision = (await pool.query(
    `SELECT report_generated_at IS NOT DISTINCT FROM $2::timestamp AS legacy_js_date_matches,
            report_generated_at::text IS NOT DISTINCT FROM $3::text AS exact_db_text_matches
       FROM audits WHERE id=$1`,
    [fixture.target.auditId, new Date("2026-08-14T01:00:00.992486Z"),
      fixture.reportGeneratedAtDbText],
  )).rows[0];
  assert.equal(timestampPrecision.legacy_js_date_matches, false);
  assert.equal(timestampPrecision.exact_db_text_matches, true);
  const lock = await offlineReplay.acquireAlexandreOfflineReplayLock(pool);
  let result: Awaited<ReturnType<typeof offlineReplay.replayExactAlexandreDiscoveryOffline>>;
  try {
    result = await offlineReplay.replayExactAlexandreDiscoveryOffline({
      lockToken: lock.token,
      expectedManifestSha256: inspected.manifestSha256,
    }, pool);
  } finally {
    await offlineReplay.releaseAlexandreOfflineReplayLock(pool, lock.token);
  }
  assert.equal(result.auditId, fixture.target.auditId);
  assert.equal(result.supersedesArtifactId, fixture.sourceArtifactId);
  assert.equal(result.manifestSha256, inspected.manifestSha256);
  assert.equal(result.status, "BATCH_READY");
  assert.equal(result.providerCalls, 0);
  assert.equal(result.emailsSent, 0);

  const artifacts = (await pool.query(
    `SELECT id,audit_id,tier,engine,model,txt,html,content_sha256,batch_id,
            artifact_state,superseded_at,supersedes_artifact_id,created_at
       FROM report_artifacts WHERE audit_id=$1 ORDER BY created_at,id`,
    [fixture.target.auditId],
  )).rows;
  assert.equal(artifacts.length, 2);
  const sourceArtifact = artifacts.find((row) => row.id === fixture.sourceArtifactId);
  const replacementArtifact = artifacts.find((row) => row.id === result.artifactId);
  assert.ok(sourceArtifact);
  assert.ok(replacementArtifact);
  assert.equal(sourceArtifact.artifact_state, "SUPERSEDED");
  assert.ok(sourceArtifact.superseded_at instanceof Date);
  assert.equal(sourceArtifact.txt, fixture.oldTxt);
  assert.equal(sourceArtifact.html, fixture.oldHtml);
  assert.equal(sourceArtifact.content_sha256, batch.discoveryArtifactContentHash(fixture.oldTxt, fixture.oldHtml));
  assert.equal(sourceArtifact.tier, "GRATUIT");
  assert.equal(sourceArtifact.engine, "legacy");
  assert.equal(sourceArtifact.model, "legacy");
  assert.equal(sourceArtifact.supersedes_artifact_id, null);
  assert.equal(replacementArtifact.artifact_state, "ACTIVE");
  assert.equal(replacementArtifact.superseded_at, null);
  assert.equal(replacementArtifact.supersedes_artifact_id, fixture.sourceArtifactId);
  assert.equal(replacementArtifact.batch_id, null);
  assert.equal(replacementArtifact.model, "gpt-test");
  assert.equal(
    replacementArtifact.content_sha256,
    batch.discoveryArtifactContentHash(replacementArtifact.txt, replacementArtifact.html),
  );
  assert.equal(artifacts.filter((row) => row.artifact_state === "ACTIVE").length, 1);

  const audit = (await pool.query(
    `SELECT responses,scores,narrative_report,report_txt,report_html,report_generated_at,
            report_delivery_status,report_sent_at
       FROM audits WHERE id=$1`,
    [fixture.target.auditId],
  )).rows[0];
  assert.deepEqual(audit.responses, fixture.responses);
  assert.equal(audit.report_delivery_status, "BATCH_READY");
  assert.equal(audit.report_sent_at, null);
  assert.equal(audit.report_txt, replacementArtifact.txt);
  assert.equal(audit.report_html, replacementArtifact.html);
  assert.ok(audit.narrative_report?.analysisMetadata?.catalogProvenance);

  const proof = (await pool.query(
    `SELECT operation,audit_id,candidate_id,source_artifact_id,replacement_artifact_id,
            reservation_id,usage_event_id,provider_response_id,responses_sha256,
            assembled_candidate_sha256,report_txt_sha256,report_html_sha256,
            artifact_content_sha256,catalog_provenance,catalog_provenance_sha256,
            encode(digest(convert_to(catalog_provenance::text,'UTF8'),'sha256'),'hex')
              AS recomputed_catalog_provenance_sha256
       FROM discovery_offline_replay_proofs WHERE audit_id=$1`,
    [fixture.target.auditId],
  )).rows[0];
  assert.ok(proof);
  assert.equal(proof.operation, "ALEXANDRE_ATTEMPT2_CANONICAL_REPLAY");
  assert.equal(proof.candidate_id, fixture.secondCandidateId);
  assert.equal(proof.source_artifact_id, fixture.sourceArtifactId);
  assert.equal(proof.replacement_artifact_id, result.artifactId);
  assert.equal(proof.reservation_id, fixture.secondLedger.reservationId);
  assert.equal(Number(proof.usage_event_id), fixture.secondLedger.usageEventId);
  assert.equal(proof.provider_response_id, fixture.secondResponseId);
  assert.equal(proof.report_txt_sha256, offlineReplay.discoveryAlexandreReplaySha256(replacementArtifact.txt));
  assert.equal(proof.report_html_sha256, offlineReplay.discoveryAlexandreReplaySha256(replacementArtifact.html));
  assert.equal(proof.artifact_content_sha256, replacementArtifact.content_sha256);
  assert.equal(
    proof.catalog_provenance_sha256,
    proof.recomputed_catalog_provenance_sha256,
  );
  assert.equal(await hasDiscoveryCatalogLedgerBinding(
    pool,
    fixture.target.auditId,
    {
      id: replacementArtifact.id,
      batchId: replacementArtifact.batch_id,
      model: replacementArtifact.model,
      txt: replacementArtifact.txt,
      html: replacementArtifact.html,
      contentSha256: replacementArtifact.content_sha256,
    },
    audit.narrative_report.analysisMetadata.catalogProvenance,
  ), true);

  assert.deepEqual((await pool.query(
    `SELECT id,batch_id,generation_claim_token,audit_id,provider_response_id,attempt_no,model,
            source_kind,provider_raw,provider_raw_text,assembled_candidate,provider_raw_sha256,
            assembled_sha256,report_txt_sha256,report_html_sha256,artifact_content_sha256,
            artifact_id,reservation_id,usage_event_id,responses_sha256,validation_errors,
            actual_cost_usd,state,retried_by_batch_id,created_at,updated_at
       FROM discovery_rejected_candidates WHERE audit_id=$1 ORDER BY attempt_no`,
    [fixture.target.auditId],
  )).rows, candidatesBefore);
  assert.deepEqual((await pool.query(
    `SELECT r.id::text AS reservation_id,r.status,r.actual_cost_usd,r.response_id,
            e.id::bigint AS usage_event_id,e.model,e.status AS usage_status,
            e.input_tokens,e.output_tokens,e.total_tokens,e.estimated_openai_cost_usd
       FROM ai_cost_budget_reservations r
       JOIN ai_usage_events e ON e.response_id=r.response_id
      WHERE r.order_id=$1 ORDER BY r.response_id`,
    [fixture.target.auditId],
  )).rows, ledgersBefore);
  const sideEffects = (await pool.query(
    `SELECT
       (SELECT COUNT(*)::int FROM email_tracking WHERE audit_id=$1) AS emails,
       (SELECT COUNT(*)::int FROM discovery_email_delivery_claims WHERE audit_id=$1) AS claims,
       (SELECT COUNT(*)::int FROM discovery_batch_items WHERE audit_id=$1) AS batch_items`,
    [fixture.target.auditId],
  )).rows[0];
  assert.deepEqual(sideEffects, { emails: 0, claims: 0, batch_items: 0 });

  await assert.rejects(
    pool.query(
      `UPDATE discovery_offline_replay_proofs
          SET provider_response_id=provider_response_id WHERE audit_id=$1`,
      [fixture.target.auditId],
    ),
    /DISCOVERY_OFFLINE_REPLAY_PROOF_APPEND_ONLY/,
  );
  await assert.rejects(
    pool.query("DELETE FROM discovery_offline_replay_proofs WHERE audit_id=$1", [fixture.target.auditId]),
    /DISCOVERY_OFFLINE_REPLAY_PROOF_APPEND_ONLY/,
  );
});

test("Alexandre offline replay rolls back artifact versioning and audit persistence on a late failure", async () => {
  const fixture = await insertAlexandreOfflineReplayFixture("rollback");
  const artifactsBefore = (await pool.query(
    `SELECT id,audit_id,tier,engine,model,txt,html,content_sha256,batch_id,
            artifact_state,superseded_at,supersedes_artifact_id,created_at
       FROM report_artifacts WHERE audit_id=$1 ORDER BY created_at,id`,
    [fixture.target.auditId],
  )).rows;
  const auditBefore = (await pool.query(
    `SELECT responses,scores,narrative_report,report_txt,report_html,report_generated_at,
            report_delivery_status,report_sent_at
       FROM audits WHERE id=$1`,
    [fixture.target.auditId],
  )).rows[0];
  const candidatesBefore = (await pool.query(
    `SELECT id,state,updated_at FROM discovery_rejected_candidates
      WHERE audit_id=$1 ORDER BY attempt_no`,
    [fixture.target.auditId],
  )).rows;
  const ledgersBefore = (await pool.query(
    `SELECT r.id::text AS reservation_id,r.status,r.actual_cost_usd,r.response_id,
            e.id::bigint AS usage_event_id,e.status AS usage_status,e.estimated_openai_cost_usd
       FROM ai_cost_budget_reservations r
       JOIN ai_usage_events e ON e.response_id=r.response_id
      WHERE r.order_id=$1 ORDER BY r.response_id`,
    [fixture.target.auditId],
  )).rows;
  const inspected = await offlineReplay.inspectExactAlexandreOfflineReplay(pool);
  await pool.query(
    `CREATE OR REPLACE FUNCTION force_alexandre_replay_audit_failure()
       RETURNS trigger LANGUAGE plpgsql AS $$
       BEGIN
         IF NEW.id='e860b380-3a6e-4c64-b823-3422476b7cd2' THEN
           RAISE EXCEPTION 'forced_alexandre_audit_failure';
         END IF;
         RETURN NEW;
       END $$;
     CREATE TRIGGER force_alexandre_replay_audit_failure
       BEFORE UPDATE ON audits FOR EACH ROW EXECUTE FUNCTION force_alexandre_replay_audit_failure()`,
  );
  const lock = await offlineReplay.acquireAlexandreOfflineReplayLock(pool);
  try {
    await assert.rejects(
      offlineReplay.replayExactAlexandreDiscoveryOffline({
        lockToken: lock.token,
        expectedManifestSha256: inspected.manifestSha256,
      }, pool),
      /forced_alexandre_audit_failure/,
    );
  } finally {
    await pool.query("DROP TRIGGER force_alexandre_replay_audit_failure ON audits");
    await pool.query("DROP FUNCTION force_alexandre_replay_audit_failure() ");
    await offlineReplay.releaseAlexandreOfflineReplayLock(pool, lock.token);
  }
  assert.deepEqual((await pool.query(
    `SELECT id,audit_id,tier,engine,model,txt,html,content_sha256,batch_id,
            artifact_state,superseded_at,supersedes_artifact_id,created_at
       FROM report_artifacts WHERE audit_id=$1 ORDER BY created_at,id`,
    [fixture.target.auditId],
  )).rows, artifactsBefore);
  assert.deepEqual((await pool.query(
    `SELECT responses,scores,narrative_report,report_txt,report_html,report_generated_at,
            report_delivery_status,report_sent_at
       FROM audits WHERE id=$1`,
    [fixture.target.auditId],
  )).rows[0], auditBefore);
  assert.deepEqual((await pool.query(
    `SELECT id,state,updated_at FROM discovery_rejected_candidates
      WHERE audit_id=$1 ORDER BY attempt_no`,
    [fixture.target.auditId],
  )).rows, candidatesBefore);
  assert.deepEqual((await pool.query(
    `SELECT r.id::text AS reservation_id,r.status,r.actual_cost_usd,r.response_id,
            e.id::bigint AS usage_event_id,e.status AS usage_status,e.estimated_openai_cost_usd
       FROM ai_cost_budget_reservations r
       JOIN ai_usage_events e ON e.response_id=r.response_id
      WHERE r.order_id=$1 ORDER BY r.response_id`,
    [fixture.target.auditId],
  )).rows, ledgersBefore);
  assert.equal(Number((await pool.query(
    "SELECT COUNT(*)::int AS count FROM discovery_offline_replay_proofs WHERE audit_id=$1",
    [fixture.target.auditId],
  )).rows[0].count), 0);
});

test("Alexandre offline replay detects one-microsecond timestamp drift and rolls back every write", async () => {
  const fixture = await insertAlexandreOfflineReplayFixture("timestamp-drift");
  const inspected = await offlineReplay.inspectExactAlexandreOfflineReplay(pool);
  const artifactsBefore = (await pool.query(
    `SELECT id,artifact_state,superseded_at,supersedes_artifact_id,txt,html,content_sha256
       FROM report_artifacts WHERE audit_id=$1 ORDER BY created_at,id`,
    [fixture.target.auditId],
  )).rows;
  const auditBefore = (await pool.query(
    `SELECT report_generated_at::text AS report_generated_at_db_text,
            report_delivery_status,narrative_report,scores,report_txt,report_html
       FROM audits WHERE id=$1`,
    [fixture.target.auditId],
  )).rows[0];
  await pool.query(
    `CREATE OR REPLACE FUNCTION force_alexandre_timestamp_microsecond_drift()
       RETURNS trigger LANGUAGE plpgsql AS $$
       BEGIN
         IF OLD.audit_id='e860b380-3a6e-4c64-b823-3422476b7cd2'
            AND OLD.artifact_state='ACTIVE' AND NEW.artifact_state='SUPERSEDED' THEN
           UPDATE audits
              SET report_generated_at=report_generated_at+INTERVAL '1 microsecond'
            WHERE id=OLD.audit_id;
         END IF;
         RETURN NEW;
       END $$;
     CREATE TRIGGER force_alexandre_timestamp_microsecond_drift
       BEFORE UPDATE ON report_artifacts
       FOR EACH ROW EXECUTE FUNCTION force_alexandre_timestamp_microsecond_drift()`,
  );
  const lock = await offlineReplay.acquireAlexandreOfflineReplayLock(pool);
  try {
    await assert.rejects(
      offlineReplay.replayExactAlexandreDiscoveryOffline({
        lockToken: lock.token,
        expectedManifestSha256: inspected.manifestSha256,
      }, pool),
      /ALEXANDRE_REPLAY_AUDIT_CAS_FAILED/,
    );
  } finally {
    await pool.query("DROP TRIGGER force_alexandre_timestamp_microsecond_drift ON report_artifacts");
    await pool.query("DROP FUNCTION force_alexandre_timestamp_microsecond_drift() ");
    await offlineReplay.releaseAlexandreOfflineReplayLock(pool, lock.token);
  }
  assert.deepEqual((await pool.query(
    `SELECT id,artifact_state,superseded_at,supersedes_artifact_id,txt,html,content_sha256
       FROM report_artifacts WHERE audit_id=$1 ORDER BY created_at,id`,
    [fixture.target.auditId],
  )).rows, artifactsBefore);
  assert.deepEqual((await pool.query(
    `SELECT report_generated_at::text AS report_generated_at_db_text,
            report_delivery_status,narrative_report,scores,report_txt,report_html
       FROM audits WHERE id=$1`,
    [fixture.target.auditId],
  )).rows[0], auditBefore);
  assert.equal(Number((await pool.query(
    "SELECT COUNT(*)::int AS count FROM discovery_offline_replay_proofs WHERE audit_id=$1",
    [fixture.target.auditId],
  )).rows[0].count), 0);
});

test("Discovery reconciler CLI compiles and executes summary-only against the real schema", () => {
  const cliPath = fileURLToPath(new URL("../scripts/discovery-safe-reconciler.ts", import.meta.url));
  const child = spawnSync(
    process.execPath,
    ["--import", "tsx", cliPath, "--summary-only"],
    {
      cwd: fileURLToPath(new URL("..", import.meta.url)),
      encoding: "utf8",
      env: {
        ...process.env,
        DATABASE_URL: databaseUrl,
        RENDER_GIT_COMMIT: "c".repeat(40),
      },
      timeout: 30_000,
    },
  );
  assert.equal(child.error, undefined, child.error?.message);
  assert.equal(child.signal, null, child.stderr);
  assert.equal(child.status, 0, child.stderr);
  const prefix = "DISCOVERY_BATCH_MANIFEST_SUMMARY:";
  const summaryLine = child.stdout.split(/\r?\n/).find((line) => line.startsWith(prefix));
  assert.ok(summaryLine, child.stdout);
  const summary = JSON.parse(summaryLine.slice(prefix.length));
  assert.equal(summary.schemaVersion, 1);
  assert.equal(summary.source, "database_read_only");
  assert.equal(summary.commitSha, "c".repeat(40));
  assert.equal(summary.counts.total, 0);
});

async function insertDiscoveryProviderProof(auditId: string, responseId: string, cost = 0.15) {
  const reservationId = randomUUID();
  const usage = await pool.query(
    `INSERT INTO ai_usage_events
      (created_at,profile,label,model,response_id,status,input_tokens,output_tokens,total_tokens,
       estimated_openai_cost_usd)
     VALUES (NOW(),'discovery','discovery-unified-report','gpt-test',$1,'completed',100,50,150,$2)
     RETURNING id`,
    [responseId, cost],
  );
  await pool.query(
    `INSERT INTO ai_cost_budget_reservations
      (id,product,order_id,profile,label,status,reserved_cost_usd,actual_cost_usd,response_id)
     VALUES ($1,'discovery',$2,'discovery','discovery-unified-report','COMPLETED',0.75,$3,$4)`,
    [reservationId, auditId, cost, responseId],
  );
  return { reservationId, usageEventId: Number(usage.rows[0].id) };
}

async function insertAlexandreOfflineReplayFixture(label: string) {
  const target = offlineReplay.DISCOVERY_ALEXANDRE_OFFLINE_REPLAY_TARGET;
  const responses = { ...completeV2Responses(), prenom: "Alexandre" };
  const oldScores = { legacy: 1 };
  const oldNarrative = { invalidLegacyReport: label, sections: [] };
  const oldTxt = `alexandre-invalid-txt:${label}`;
  const oldHtml = `<p>alexandre-invalid-html:${label}</p>`;
  const reportGeneratedAtDbText = "2026-08-14 01:00:00.992486";
  await pool.query(
    `INSERT INTO audits
       (id,email,type,status,responses,scores,narrative_report,report_txt,report_html,
        report_generated_at,report_delivery_status,report_sent_at,created_at)
     VALUES ($1,'alexrey47@gmail.com','GRATUIT','COMPLETED',$2::jsonb,$3::jsonb,$4::jsonb,
             $5,$6,$7::timestamp,'BATCH_REVIEW',NULL,'2026-08-14T00:00:00.000Z')`,
    [target.auditId, JSON.stringify(responses), JSON.stringify(oldScores),
      JSON.stringify(oldNarrative), oldTxt, oldHtml, reportGeneratedAtDbText],
  );
  const sourceArtifactId = randomUUID();
  await pool.query(
    `INSERT INTO report_artifacts
       (id,audit_id,tier,engine,model,txt,html,content_sha256,artifact_state,created_at)
     VALUES ($1,$2,'GRATUIT','legacy','legacy',$3,$4,$5,'ACTIVE','2026-08-14T01:00:00.000Z')`,
    [sourceArtifactId, target.auditId, oldTxt, oldHtml,
      batch.discoveryArtifactContentHash(oldTxt, oldHtml)],
  );

  const firstResponseId = `resp_alexandre_first_${label}`;
  const secondResponseId = `resp_alexandre_second_${label}`;
  const firstLedger = await insertDiscoveryProviderProof(target.auditId, firstResponseId, 0.12);
  const secondLedger = await insertDiscoveryProviderProof(target.auditId, secondResponseId, 0.14);
  const firstProviderRaw = { rejected: true, reason: label };
  const secondProviderRaw = buildDiscoveryDefaultMechanismSelection();
  const replayFixture = await buildValidPersistenceFixture(responses, secondResponseId);
  const responsesSha256 = offlineReplay.discoveryAlexandreReplaySha256(responses);
  const firstCandidateId = randomUUID();
  const secondCandidateId = randomUUID();
  await pool.query(
    `INSERT INTO discovery_rejected_candidates
       (id,generation_claim_token,audit_id,provider_response_id,attempt_no,model,source_kind,
        provider_raw,provider_raw_sha256,reservation_id,usage_event_id,responses_sha256,
        validation_errors,actual_cost_usd,state)
     VALUES ($1,$2,$3,$4,1,'gpt-test','PROVIDER_REJECTED',$5::jsonb,$6,$7,$8,$9,
             '["synthetic_attempt_1_rejected"]'::jsonb,0.12,'SUPERSEDED')`,
    [firstCandidateId, randomUUID(), target.auditId, firstResponseId,
      JSON.stringify(firstProviderRaw), offlineReplay.discoveryAlexandreReplaySha256(firstProviderRaw),
      firstLedger.reservationId, firstLedger.usageEventId, responsesSha256],
  );
  await pool.query(
    `INSERT INTO discovery_rejected_candidates
       (id,generation_claim_token,audit_id,provider_response_id,attempt_no,model,source_kind,
        provider_raw,provider_raw_sha256,assembled_candidate,assembled_sha256,
        report_txt_sha256,report_html_sha256,artifact_content_sha256,
        reservation_id,usage_event_id,responses_sha256,validation_errors,actual_cost_usd,state)
     VALUES ($1,$2,$3,$4,2,'gpt-test','ASSEMBLED_REJECTED',$5::jsonb,$6,$7::jsonb,$8,
             $9,$10,$11,$12,$13,$14,'["synthetic_attempt_2_rejected"]'::jsonb,
             0.14,'TERMINAL_REJECTED')`,
    [secondCandidateId, randomUUID(), target.auditId, secondResponseId,
      JSON.stringify(secondProviderRaw), offlineReplay.discoveryAlexandreReplaySha256(secondProviderRaw),
      JSON.stringify(replayFixture.narrativeReport),
      offlineReplay.discoveryAlexandreReplaySha256(replayFixture.narrativeReport),
      offlineReplay.discoveryAlexandreReplaySha256(replayFixture.assets.txt),
      offlineReplay.discoveryAlexandreReplaySha256(replayFixture.assets.html),
      batch.discoveryArtifactContentHash(replayFixture.assets.txt, replayFixture.assets.html),
      secondLedger.reservationId, secondLedger.usageEventId, responsesSha256],
  );
  return {
    target,
    responses,
    oldScores,
    oldNarrative,
    oldTxt,
    oldHtml,
    reportGeneratedAtDbText,
    sourceArtifactId,
    firstCandidateId,
    secondCandidateId,
    firstLedger,
    secondLedger,
    secondResponseId,
    replayFixture,
  };
}

function buildDiscoveryProviderEvidence(responseId: string, cost = 0.15) {
  const selection = buildDiscoveryDefaultMechanismSelection();
  return {
    responseId,
    model: "gpt-test",
    rawCandidate: selection,
    inputTokens: 100,
    outputTokens: 50,
    totalTokens: 150,
    actualCostUsd: cost,
    catalogVersion: DISCOVERY_MECHANISM_CATALOG_VERSION,
    catalogSha256: DISCOVERY_MECHANISM_CATALOG_SHA256,
    selectionSha256: discoveryCatalogSelectionSha256(selection),
  };
}

async function createSyntheticGenerationBatch(
  lockToken: string,
  auditIds: string[],
  label: string,
): Promise<string> {
  const rows = await pool.query(
    `SELECT a.id,a.responses,a.report_delivery_status,a.report_txt,a.report_html,
            r.id AS active_artifact_id,r.txt AS active_artifact_txt,
            r.html AS active_artifact_html,r.content_sha256 AS active_artifact_content_sha256
       FROM audits a
       LEFT JOIN report_artifacts r ON r.audit_id=a.id AND r.artifact_state='ACTIVE'
      WHERE a.id=ANY($1::varchar[])
      ORDER BY a.id`,
    [auditIds],
  );
  const byId = new Map(rows.rows.map((row) => [String(row.id), row]));
  return batch.createDiscoveryBatchRun({
    manifestSha256: batch.discoverySha256(`${label}:${randomUUID()}`),
    commitSha: "c".repeat(40),
    approvalReference: label,
    approvalExpiresAt: new Date(Date.now() + 60_000).toISOString(),
    stage: "GENERATION",
    tier: "REST",
    softPerScanUsd: 0.25,
    hardPerScanUsd: 0.75,
    globalBudgetUsd: Math.max(0.75, auditIds.length * 0.75),
    lockToken,
    items: auditIds.map((auditId, index) => {
      const audit = byId.get(auditId);
      assert.ok(audit, auditId);
      return {
        auditId,
        sequenceNo: index + 1,
        cohort: "invalid" as const,
        expectedResponsesSha256: batch.discoverySha256(audit.responses),
        expectedSourceStatus: String(audit.report_delivery_status),
        expectedTxtSha256: audit.report_txt ? batch.discoverySha256(String(audit.report_txt)) : null,
        expectedHtmlSha256: audit.report_html ? batch.discoverySha256(String(audit.report_html)) : null,
        expectedActiveArtifactId: audit.active_artifact_id || null,
        expectedActiveArtifactTxtSha256: audit.active_artifact_id
          ? batch.discoverySha256(String(audit.active_artifact_txt)) : null,
        expectedActiveArtifactHtmlSha256: audit.active_artifact_id
          ? batch.discoverySha256(String(audit.active_artifact_html)) : null,
        expectedActiveArtifactContentSha256: audit.active_artifact_content_sha256 || null,
      };
    }),
  }, pool);
}

async function startSyntheticGenerationAttempt(auditId: string, label: string) {
  const lock = await batch.acquireDiscoveryGlobalLock({
    owner: "postgres-integration",
    purpose: label,
  }, pool);
  const batchId = await createSyntheticGenerationBatch(lock.token, [auditId], label);
  await batch.markDiscoveryBatchItemPreflightOk({
    batchId, auditId, lockToken: lock.token,
  }, pool);
  await batch.claimDiscoveryProviderAttempt({
    batchId, auditId, lockToken: lock.token,
  }, pool);
  const responseId = `resp_${randomUUID()}`;
  await insertDiscoveryProviderProof(auditId, responseId, 0.15);
  await batch.recordDiscoveryProviderUsage({
    batchId,
    auditId,
    lockToken: lock.token,
    responseId,
    inputTokens: 100,
    outputTokens: 50,
    totalTokens: 150,
    actualCostUsd: 0.15,
  }, pool);
  return { lock, batchId, responseId };
}

async function runSyntheticRejectedBatchAttempt(input: {
  auditId: string;
  stage: "GENERATION" | "REGENERATION";
  retryOfCandidateId?: string;
  actualCostUsd: number;
}) {
  const lock = await batch.acquireDiscoveryGlobalLock({
    owner: "postgres-integration",
    purpose: `synthetic-${input.stage.toLowerCase()}-rejection`,
  }, pool);
  const audit = (await pool.query(
    `SELECT responses,report_delivery_status,report_txt,report_html FROM audits WHERE id=$1`,
    [input.auditId],
  )).rows[0];
  const batchId = await batch.createDiscoveryBatchRun({
    manifestSha256: batch.discoverySha256(`${input.stage}:${randomUUID()}`),
    commitSha: "c".repeat(40),
    approvalReference: "synthetic-provider-rejection",
    approvalExpiresAt: new Date(Date.now() + 60_000).toISOString(),
    stage: input.stage,
    tier: "ONE",
    softPerScanUsd: 0.25,
    hardPerScanUsd: 0.75,
    globalBudgetUsd: 0.75,
    lockToken: lock.token,
    items: [{
      auditId: input.auditId,
      sequenceNo: 1,
      cohort: "invalid",
      expectedResponsesSha256: batch.discoverySha256(audit.responses),
      expectedSourceStatus: String(audit.report_delivery_status),
      expectedTxtSha256: audit.report_txt ? batch.discoverySha256(String(audit.report_txt)) : null,
      expectedHtmlSha256: audit.report_html ? batch.discoverySha256(String(audit.report_html)) : null,
      retryOfCandidateId: input.retryOfCandidateId,
    }],
  }, pool);
  await batch.markDiscoveryBatchItemPreflightOk({
    batchId, auditId: input.auditId, lockToken: lock.token,
  }, pool);
  await batch.claimDiscoveryProviderAttempt({
    batchId, auditId: input.auditId, lockToken: lock.token,
  }, pool);
  const responseId = `resp_${randomUUID()}`;
  const proof = await insertDiscoveryProviderProof(input.auditId, responseId, input.actualCostUsd);
  await batch.recordDiscoveryProviderUsage({
    batchId,
    auditId: input.auditId,
    lockToken: lock.token,
    responseId,
    inputTokens: 100,
    outputTokens: 50,
    totalTokens: 150,
    actualCostUsd: input.actualCostUsd,
  }, pool);
  await batch.failDiscoveryBatchItem({
    batchId,
    auditId: input.auditId,
    lockToken: lock.token,
    errorCode: "DISCOVERY_MECHANISM_POLICY_REJECTED",
    errorDetail: "synthetic generic mechanism wording rejected",
    rejectedCandidate: {
      providerRaw: {
        synthesis: "La régulation coordonne les deux dimensions du signal.",
        sections: [{
          domain: "stress",
          content: "Une contrainte élevée peut mobiliser les réserves adaptatives.",
        }],
      },
      assembledCandidate: null,
      responseId,
      model: "gpt-test",
      validationErrors: ["provider:provider_number_word", "provider:provider_state_assertion"],
      usage: {
        inputTokens: 100,
        outputTokens: 50,
        totalTokens: 150,
        actualCostUsd: input.actualCostUsd,
      },
    },
  }, pool);
  const complete = await batch.completeDiscoveryBatchRun({ batchId, lockToken: lock.token }, pool);
  const state = await pool.query(
    `SELECT b.status,b.processed_count,b.target_count,b.reserved_cost_usd,b.actual_cost_usd,
            b.completed_at,i.state AS item_state,c.id AS candidate_id,c.state AS candidate_state,
            c.attempt_no,c.reservation_id,c.usage_event_id
       FROM discovery_batch_runs b
       JOIN discovery_batch_items i ON i.batch_id=b.id AND i.audit_id=$2
       JOIN discovery_rejected_candidates c ON c.batch_id=b.id AND c.audit_id=$2
      WHERE b.id=$1`,
    [batchId, input.auditId],
  );
  await batch.releaseDiscoveryGlobalLock(lock.token, pool);
  return {
    batchId,
    complete,
    responseId,
    proof,
    state: state.rows[0],
  };
}

test("generic rejected output is quarantined atomically with its exact ledger proof", async () => {
  const auditId = await insertAudit();
  const claim = await transactional.claimDiscoveryGeneration(auditId, pool);
  assert.ok(claim);
  const responseId = `resp_${randomUUID()}`;
  await insertDiscoveryProviderProof(auditId, responseId, 0.15);
  const changed = await transactional.failClaimedDiscoveryGeneration(
    claim!,
    "postgres-test",
    new Error("factual rejection"),
    {
      providerRaw: { synthesis: "rejected", sections: [] },
      responseId,
      model: "gpt-test",
      validationErrors: ["factual:test"],
      usage: { inputTokens: 100, outputTokens: 50, totalTokens: 150, actualCostUsd: 0.15 },
    },
    pool,
  );
  assert.equal(changed, true);
  const state = await pool.query(
    `SELECT a.report_delivery_status,c.state,c.source_kind,c.generation_claim_token::text,
            c.provider_response_id,c.actual_cost_usd
       FROM audits a JOIN discovery_rejected_candidates c ON c.audit_id=a.id
      WHERE a.id=$1`,
    [auditId],
  );
  assert.deepEqual({
    status: state.rows[0].report_delivery_status,
    candidate: state.rows[0].state,
    kind: state.rows[0].source_kind,
    token: state.rows[0].generation_claim_token,
    response: state.rows[0].provider_response_id,
    cost: Number(state.rows[0].actual_cost_usd),
  }, {
    status: "BATCH_REVIEW", candidate: "QUARANTINED", kind: "PROVIDER_REJECTED",
    token: claim!.token, response: responseId, cost: 0.15,
  });
});

test("a rejected canary terminalizes durably and one sealed retry respects the two-call hard cap", async () => {
  const auditId = await insertAudit("PENDING", completeV2Responses());
  const first = await runSyntheticRejectedBatchAttempt({
    auditId,
    stage: "GENERATION",
    actualCostUsd: 0.75,
  });
  assert.equal(first.complete, true);
  assert.deepEqual({
    batch: first.state.status,
    processed: Number(first.state.processed_count),
    target: Number(first.state.target_count),
    reserved: Number(first.state.reserved_cost_usd),
    cost: Number(first.state.actual_cost_usd),
    completed: first.state.completed_at != null,
    item: first.state.item_state,
    candidate: first.state.candidate_state,
    attempt: Number(first.state.attempt_no),
    reservation: first.state.reservation_id,
    usage: Number(first.state.usage_event_id),
  }, {
    batch: "FAILED", processed: 1, target: 1, reserved: 0, cost: 0.75,
    completed: true, item: "FAILED", candidate: "QUARANTINED", attempt: 1,
    reservation: first.proof.reservationId, usage: first.proof.usageEventId,
  });

  const second = await runSyntheticRejectedBatchAttempt({
    auditId,
    stage: "REGENERATION",
    retryOfCandidateId: String(first.state.candidate_id),
    actualCostUsd: 0.75,
  });
  assert.equal(second.complete, true);
  assert.equal(second.state.status, "FAILED");
  assert.equal(second.state.item_state, "FAILED");
  assert.equal(second.state.candidate_state, "TERMINAL_REJECTED");
  assert.equal(Number(second.state.attempt_no), 2);
  const candidates = await pool.query(
    `SELECT id,state,attempt_no,retried_by_batch_id FROM discovery_rejected_candidates
      WHERE audit_id=$1 ORDER BY attempt_no`,
    [auditId],
  );
  assert.deepEqual(candidates.rows.map((row) => ({
    id: row.id,
    state: row.state,
    attempt: Number(row.attempt_no),
    retriedBy: row.retried_by_batch_id,
  })), [
    { id: first.state.candidate_id, state: "SUPERSEDED", attempt: 1, retriedBy: second.batchId },
    { id: second.state.candidate_id, state: "TERMINAL_REJECTED", attempt: 2, retriedBy: null },
  ]);
  const ledger = await pool.query(
    `SELECT COUNT(*)::int AS calls,COALESCE(SUM(actual_cost_usd),0)::numeric AS cost
       FROM ai_cost_budget_reservations
      WHERE product='discovery' AND order_id=$1 AND status='COMPLETED'`,
    [auditId],
  );
  assert.deepEqual({
    calls: Number(ledger.rows[0].calls),
    cost: Number(ledger.rows[0].cost),
  }, { calls: 2, cost: 1.5 });

  const thirdLock = await batch.acquireDiscoveryGlobalLock({
    owner: "postgres-integration", purpose: "synthetic-third-attempt-block",
  }, pool);
  const audit = (await pool.query(
    `SELECT responses,report_delivery_status FROM audits WHERE id=$1`, [auditId],
  )).rows[0];
  const thirdBatchId = await batch.createDiscoveryBatchRun({
    manifestSha256: batch.discoverySha256(`third:${randomUUID()}`),
    commitSha: "d".repeat(40),
    approvalReference: "synthetic-third-attempt-block",
    approvalExpiresAt: new Date(Date.now() + 60_000).toISOString(),
    stage: "REGENERATION",
    tier: "ONE",
    softPerScanUsd: 0.25,
    hardPerScanUsd: 0.75,
    globalBudgetUsd: 0.75,
    lockToken: thirdLock.token,
    items: [{
      auditId,
      sequenceNo: 1,
      cohort: "invalid",
      expectedResponsesSha256: batch.discoverySha256(audit.responses),
      expectedSourceStatus: String(audit.report_delivery_status),
      expectedTxtSha256: null,
      expectedHtmlSha256: null,
      retryOfCandidateId: String(second.state.candidate_id),
    }],
  }, pool);
  await batch.markDiscoveryBatchItemPreflightOk({
    batchId: thirdBatchId, auditId, lockToken: thirdLock.token,
  }, pool);
  await assert.rejects(
    batch.claimDiscoveryProviderAttempt({
      batchId: thirdBatchId, auditId, lockToken: thirdLock.token,
    }, pool),
    /DISCOVERY_REGENERATION_BUDGET_OR_ATTEMPT_BLOCKED/,
  );
  assert.equal(Number((await pool.query(
    `SELECT COUNT(*) FROM ai_cost_budget_reservations
      WHERE product='discovery' AND order_id=$1`, [auditId],
  )).rows[0].count), 2);
  await batch.releaseDiscoveryGlobalLock(thirdLock.token, pool);
});

test("two concurrent items in one batch yield one provider claim and terminalize the remainder", async () => {
  const auditIds = [await insertAudit(), await insertAudit()];
  const lock = await batch.acquireDiscoveryGlobalLock({
    owner: "postgres-integration", purpose: "same-batch-single-active-provider",
  }, pool);
  const batchId = await createSyntheticGenerationBatch(lock.token, auditIds, "same-batch-race");
  for (const auditId of auditIds) {
    await batch.markDiscoveryBatchItemPreflightOk({ batchId, auditId, lockToken: lock.token }, pool);
  }
  const results = await Promise.allSettled(auditIds.map((auditId) => (
    batch.claimDiscoveryProviderAttempt({ batchId, auditId, lockToken: lock.token }, pool)
  )));
  assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
  assert.equal(results.filter((result) => result.status === "rejected"
    && /DISCOVERY_BATCH_ANOTHER_PROVIDER_ATTEMPT_ACTIVE/.test(String(result.reason))).length, 1);
  const itemStates = await pool.query(
    `SELECT audit_id,state,reserved_cost_usd FROM discovery_batch_items
      WHERE batch_id=$1 ORDER BY sequence_no`,
    [batchId],
  );
  const active = itemStates.rows.find((row) => row.state === "PROVIDER_STARTED");
  const waiting = itemStates.rows.find((row) => row.state === "PREFLIGHT_OK");
  assert.ok(active);
  assert.ok(waiting);
  assert.equal(Number(active.reserved_cost_usd), 0.75);
  assert.equal(Number(waiting.reserved_cost_usd), 0);
  assert.equal(Number((await pool.query(
    `SELECT COUNT(*) FROM ai_cost_budget_reservations
      WHERE product='discovery' AND order_id=ANY($1::text[])`,
    [auditIds],
  )).rows[0].count), 0);

  await batch.failDiscoveryBatchItem({
    batchId,
    auditId: String(active.audit_id),
    lockToken: lock.token,
    errorCode: "DISCOVERY_PROVIDER_PRE_ACCEPT_FAILURE",
    errorDetail: "provider not accepted; terminalize batch",
  }, pool);
  const terminal = await pool.query(
    `SELECT b.status,b.reserved_cost_usd,b.completed_at,
            array_agg(i.state ORDER BY i.sequence_no) AS item_states
       FROM discovery_batch_runs b JOIN discovery_batch_items i ON i.batch_id=b.id
      WHERE b.id=$1 GROUP BY b.id`,
    [batchId],
  );
  assert.equal(terminal.rows[0].status, "FAILED");
  assert.equal(Number(terminal.rows[0].reserved_cost_usd), 0);
  assert.ok(terminal.rows[0].completed_at);
  assert.deepEqual([...terminal.rows[0].item_states].sort(), ["FAILED", "SKIPPED"]);
  await assert.rejects(
    batch.claimDiscoveryProviderAttempt({
      batchId, auditId: String(waiting.audit_id), lockToken: lock.token,
    }, pool),
    /DISCOVERY_BATCH_NOT_RUNNABLE/,
  );
  await batch.releaseDiscoveryGlobalLock(lock.token, pool);
});

test("one epoch serializes provider claims across batches and releases after terminalization", async () => {
  const auditIds = [await insertAudit(), await insertAudit()];
  const lock = await batch.acquireDiscoveryGlobalLock({
    owner: "postgres-integration", purpose: "cross-batch-single-active-provider",
  }, pool);
  const firstBatchId = await createSyntheticGenerationBatch(lock.token, [auditIds[0]], "cross-batch-a");
  const secondBatchId = await createSyntheticGenerationBatch(lock.token, [auditIds[1]], "cross-batch-b");
  await batch.markDiscoveryBatchItemPreflightOk({
    batchId: firstBatchId, auditId: auditIds[0], lockToken: lock.token,
  }, pool);
  await batch.markDiscoveryBatchItemPreflightOk({
    batchId: secondBatchId, auditId: auditIds[1], lockToken: lock.token,
  }, pool);
  const claims = await Promise.allSettled([
    batch.claimDiscoveryProviderAttempt({
      batchId: firstBatchId, auditId: auditIds[0], lockToken: lock.token,
    }, pool),
    batch.claimDiscoveryProviderAttempt({
      batchId: secondBatchId, auditId: auditIds[1], lockToken: lock.token,
    }, pool),
  ]);
  assert.equal(claims.filter((result) => result.status === "fulfilled").length, 1);
  assert.equal(claims.filter((result) => result.status === "rejected"
    && /DISCOVERY_BATCH_ANOTHER_PROVIDER_ATTEMPT_ACTIVE/.test(String(result.reason))).length, 1);
  const states = await pool.query(
    `SELECT batch_id,audit_id,state,reserved_cost_usd FROM discovery_batch_items
      WHERE batch_id=ANY($1::uuid[])`,
    [[firstBatchId, secondBatchId]],
  );
  const active = states.rows.find((row) => row.state === "PROVIDER_STARTED");
  const waiting = states.rows.find((row) => row.state === "PREFLIGHT_OK");
  assert.ok(active);
  assert.ok(waiting);
  assert.equal(Number(waiting.reserved_cost_usd), 0);

  await batch.failDiscoveryBatchItem({
    batchId: String(active.batch_id),
    auditId: String(active.audit_id),
    lockToken: lock.token,
    errorCode: "DISCOVERY_PROVIDER_PRE_ACCEPT_FAILURE",
    errorDetail: "provider not accepted; release epoch slot",
  }, pool);
  await batch.claimDiscoveryProviderAttempt({
    batchId: String(waiting.batch_id),
    auditId: String(waiting.audit_id),
    lockToken: lock.token,
  }, pool);
  const postTerminal = await pool.query(
    `SELECT batch_id,state,reserved_cost_usd FROM discovery_batch_items
      WHERE batch_id=ANY($1::uuid[]) ORDER BY batch_id`,
    [[firstBatchId, secondBatchId]],
  );
  assert.equal(postTerminal.rows.filter((row) => row.state === "PROVIDER_STARTED").length, 1);
  assert.equal(postTerminal.rows.filter((row) => row.state === "FAILED").length, 1);
  await batch.failDiscoveryBatchItem({
    batchId: String(waiting.batch_id),
    auditId: String(waiting.audit_id),
    lockToken: lock.token,
    errorCode: "DISCOVERY_PROVIDER_PRE_ACCEPT_FAILURE",
    errorDetail: "provider not accepted; cleanup",
  }, pool);
  await batch.releaseDiscoveryGlobalLock(lock.token, pool);
});

test("a successful soft-cost stop atomically stores one item, skips the remainder, and permits a new epoch", async () => {
  const responses = completeV2Responses();
  const auditIds = [
    await insertAudit("PENDING", responses),
    await insertAudit("PENDING", { ...responses, prenom: "SyntheticB" }),
  ];
  const lock = await batch.acquireDiscoveryGlobalLock({
    owner: "postgres-integration", purpose: "soft-cost-terminalization",
  }, pool);
  const batchId = await createSyntheticGenerationBatch(lock.token, auditIds, "soft-cost-stop");
  for (const auditId of auditIds) {
    await batch.markDiscoveryBatchItemPreflightOk({ batchId, auditId, lockToken: lock.token }, pool);
  }
  await batch.claimDiscoveryProviderAttempt({
    batchId, auditId: auditIds[0], lockToken: lock.token,
  }, pool);
  const responseId = `resp_${randomUUID()}`;
  await insertDiscoveryProviderProof(auditIds[0], responseId, 0.30);
  const usageDecision = await batch.recordDiscoveryProviderUsage({
    batchId,
    auditId: auditIds[0],
    lockToken: lock.token,
    responseId,
    inputTokens: 100,
    outputTokens: 50,
    totalTokens: 150,
    actualCostUsd: 0.30,
  }, pool);
  assert.equal(usageDecision.stop, true);
  assert.match(String(usageDecision.stopReason), /^soft_cost_limit_exceeded:/);
  const fixture = await buildValidPersistenceFixture(responses, responseId);
  await batch.persistValidatedDiscoveryBatchItem({
    batchId,
    auditId: auditIds[0],
    lockToken: lock.token,
    expectedResponsesSha256: batch.discoverySha256(responses),
    expectedSourceStatus: "PENDING",
    expectedTxtSha256: null,
    expectedHtmlSha256: null,
    narrativeReport: fixture.narrativeReport,
    scores: fixture.scores,
    txt: fixture.assets.txt,
    html: fixture.assets.html,
    model: "gpt-test",
  }, pool);
  assert.equal(await batch.completeDiscoveryBatchRun({ batchId, lockToken: lock.token }, pool), true);
  const terminal = await pool.query(
    `SELECT b.status,b.processed_count,b.target_count,b.reserved_cost_usd,b.actual_cost_usd,
            b.stop_reason,b.completed_at,
            array_agg(i.state ORDER BY i.sequence_no) AS item_states,
            array_agg(i.error_code ORDER BY i.sequence_no) AS error_codes,
            array_agg(i.error_detail ORDER BY i.sequence_no) AS error_details
       FROM discovery_batch_runs b JOIN discovery_batch_items i ON i.batch_id=b.id
      WHERE b.id=$1 GROUP BY b.id`,
    [batchId],
  );
  assert.equal(terminal.rows[0].status, "COMPLETED");
  assert.equal(Number(terminal.rows[0].processed_count), 2);
  assert.equal(Number(terminal.rows[0].target_count), 2);
  assert.equal(Number(terminal.rows[0].reserved_cost_usd), 0);
  assert.equal(Number(terminal.rows[0].actual_cost_usd), 0.30);
  assert.match(String(terminal.rows[0].stop_reason), /^soft_cost_limit_exceeded:/);
  assert.ok(terminal.rows[0].completed_at);
  assert.deepEqual(terminal.rows[0].item_states, ["STORED", "SKIPPED"]);
  assert.deepEqual(terminal.rows[0].error_codes, ["DISCOVERY_CATALOG_PROVENANCE", "DISCOVERY_BATCH_SOFT_COST_STOP"]);
  const storedProvenance = JSON.parse(String(terminal.rows[0].error_details[0]));
  assert.equal(storedProvenance.editorialSourceSha256, DISCOVERY_MECHANISM_EDITORIAL_SOURCE_SHA256);
  assert.equal(storedProvenance.catalogVersion, DISCOVERY_MECHANISM_CATALOG_VERSION);
  assert.equal(storedProvenance.catalogSha256, DISCOVERY_MECHANISM_CATALOG_SHA256);
  assert.equal(storedProvenance.providerResponseId, responseId);
  await assert.rejects(
    batch.claimDiscoveryProviderAttempt({
      batchId, auditId: auditIds[1], lockToken: lock.token,
    }, pool),
    /DISCOVERY_BATCH_NOT_RUNNABLE/,
  );
  assert.equal(await batch.releaseDiscoveryGlobalLock(lock.token, pool), true);

  const nextAuditId = await insertAudit("PENDING", { ...responses, prenom: "SyntheticC" });
  const nextLock = await batch.acquireDiscoveryGlobalLock({
    owner: "postgres-integration", purpose: "post-soft-cost-new-epoch",
  }, pool);
  assert.notEqual(nextLock.token, lock.token);
  const nextBatchId = await createSyntheticGenerationBatch(nextLock.token, [nextAuditId], "post-soft-cost");
  await batch.markDiscoveryBatchItemPreflightOk({
    batchId: nextBatchId, auditId: nextAuditId, lockToken: nextLock.token,
  }, pool);
  await batch.claimDiscoveryProviderAttempt({
    batchId: nextBatchId, auditId: nextAuditId, lockToken: nextLock.token,
  }, pool);
  await batch.failDiscoveryBatchItem({
    batchId: nextBatchId,
    auditId: nextAuditId,
    lockToken: nextLock.token,
    errorCode: "DISCOVERY_PROVIDER_PRE_ACCEPT_FAILURE",
    errorDetail: "synthetic cleanup after proving epoch rotation",
  }, pool);
  await batch.releaseDiscoveryGlobalLock(nextLock.token, pool);
});

test("GENERATION versions an exact bound ACTIVE artifact among four historical versions", async () => {
  const source = await insertGenerationVersioningFixture("four-versions");
  const attempt = await startSyntheticGenerationAttempt(source.auditId, "generation-active-versioning");
  const itemBinding = (await pool.query(
    `SELECT expected_active_artifact_id,expected_active_artifact_txt_sha256,
            expected_active_artifact_html_sha256,expected_active_artifact_content_sha256
       FROM discovery_batch_items WHERE batch_id=$1 AND audit_id=$2`,
    [attempt.batchId, source.auditId],
  )).rows[0];
  assert.deepEqual(itemBinding, {
    expected_active_artifact_id: source.activeArtifactId,
    expected_active_artifact_txt_sha256: batch.discoverySha256(source.sourceTxt),
    expected_active_artifact_html_sha256: batch.discoverySha256(source.sourceHtml),
    expected_active_artifact_content_sha256:
      batch.discoveryArtifactContentHash(source.sourceTxt, source.sourceHtml),
  });
  const generated = await buildValidPersistenceFixture(source.responses, attempt.responseId);
  const persisted = await batch.persistValidatedDiscoveryBatchItem({
    batchId: attempt.batchId,
    auditId: source.auditId,
    lockToken: attempt.lock.token,
    expectedResponsesSha256: batch.discoverySha256(source.responses),
    expectedSourceStatus: "PENDING",
    expectedTxtSha256: batch.discoverySha256(source.sourceTxt),
    expectedHtmlSha256: batch.discoverySha256(source.sourceHtml),
    narrativeReport: generated.narrativeReport,
    scores: generated.scores,
    txt: generated.assets.txt,
    html: generated.assets.html,
    model: "gpt-test",
  }, pool);
  const after = (await pool.query(
    `SELECT id,tier,engine,model,txt,html,content_sha256,batch_id,
            artifact_state,superseded_at,supersedes_artifact_id,created_at
       FROM report_artifacts WHERE audit_id=$1 ORDER BY created_at,id`,
    [source.auditId],
  )).rows;
  assert.equal(after.length, 5);
  const active = after.filter((row) => row.artifact_state === "ACTIVE");
  assert.equal(active.length, 1);
  assert.equal(active[0].id, persisted.artifactId);
  assert.equal(active[0].supersedes_artifact_id, source.activeArtifactId);
  assert.equal(active[0].batch_id, attempt.batchId);
  assert.equal(active[0].txt, generated.assets.txt);
  assert.equal(active[0].html, generated.assets.html);
  assert.equal(
    active[0].content_sha256,
    batch.discoveryArtifactContentHash(generated.assets.txt, generated.assets.html),
  );
  for (const historical of source.before) {
    const preserved = after.find((row) => row.id === historical.id);
    assert.ok(preserved, historical.id);
    for (const field of ["id", "tier", "engine", "model", "txt", "html", "content_sha256", "batch_id", "supersedes_artifact_id"] as const) {
      assert.equal(preserved[field], historical[field], `${historical.id}:${field}`);
    }
    assert.equal(new Date(preserved.created_at).toISOString(), new Date(historical.created_at).toISOString());
  }
  const priorActive = after.find((row) => row.id === source.activeArtifactId);
  assert.equal(priorActive.artifact_state, "SUPERSEDED");
  assert.ok(priorActive.superseded_at);
  const audit = (await pool.query(
    `SELECT report_delivery_status,report_sent_at,narrative_report,report_txt,report_html
       FROM audits WHERE id=$1`,
    [source.auditId],
  )).rows[0];
  assert.equal(audit.report_delivery_status, "BATCH_READY");
  assert.equal(audit.report_sent_at, null);
  assert.equal(audit.report_txt, generated.assets.txt);
  assert.equal(audit.report_html, generated.assets.html);
  assert.deepEqual(audit.narrative_report, generated.narrativeReport);
  const providerState = (await pool.query(
    `SELECT i.provider_calls,
            (SELECT COUNT(*)::int FROM ai_cost_budget_reservations r
              WHERE r.product='discovery' AND r.order_id=i.audit_id) AS reservation_count
       FROM discovery_batch_items i WHERE i.batch_id=$1 AND i.audit_id=$2`,
    [attempt.batchId, source.auditId],
  )).rows[0];
  assert.deepEqual({
    providerCalls: Number(providerState.provider_calls),
    reservationCount: Number(providerState.reservation_count),
  }, { providerCalls: 1, reservationCount: 1 });
  await batch.releaseDiscoveryGlobalLock(attempt.lock.token, pool);
});

test("GENERATION fails closed on ACTIVE drift without a second simulated provider attempt", async () => {
  const source = await insertGenerationVersioningFixture("late-active-drift");
  const attempt = await startSyntheticGenerationAttempt(source.auditId, "generation-active-drift");
  const driftedArtifactId = randomUUID();
  const driftedTxt = "drifted-active-txt";
  const driftedHtml = "<p>drifted-active-html</p>";
  await pool.query("BEGIN");
  try {
    await pool.query(
      `UPDATE report_artifacts
          SET artifact_state='SUPERSEDED',superseded_at=NOW()
        WHERE id=$1 AND artifact_state='ACTIVE'`,
      [source.activeArtifactId],
    );
    await pool.query(
      `INSERT INTO report_artifacts
        (id,audit_id,tier,engine,model,txt,html,content_sha256,
         artifact_state,supersedes_artifact_id)
       VALUES ($1,$2,'GRATUIT','external','external',$3,$4,$5,'ACTIVE',$6)`,
      [driftedArtifactId, source.auditId, driftedTxt, driftedHtml,
        batch.discoveryArtifactContentHash(driftedTxt, driftedHtml), source.activeArtifactId],
    );
    await pool.query("COMMIT");
  } catch (error) {
    await pool.query("ROLLBACK");
    throw error;
  }
  const generated = await buildValidPersistenceFixture(source.responses, attempt.responseId);
  await assert.rejects(
    batch.persistValidatedDiscoveryBatchItem({
      batchId: attempt.batchId,
      auditId: source.auditId,
      lockToken: attempt.lock.token,
      expectedResponsesSha256: batch.discoverySha256(source.responses),
      expectedSourceStatus: "PENDING",
      expectedTxtSha256: batch.discoverySha256(source.sourceTxt),
      expectedHtmlSha256: batch.discoverySha256(source.sourceHtml),
      narrativeReport: generated.narrativeReport,
      scores: generated.scores,
      txt: generated.assets.txt,
      html: generated.assets.html,
      model: "gpt-test",
    }, pool),
    /DISCOVERY_GENERATION_ACTIVE_ARTIFACT_CAS_FAILED/,
  );
  const state = (await pool.query(
    `SELECT i.state,i.provider_calls,
            (SELECT COUNT(*)::int FROM ai_cost_budget_reservations r
              WHERE r.product='discovery' AND r.order_id=i.audit_id) AS reservation_count,
            (SELECT COUNT(*)::int FROM report_artifacts a
              WHERE a.audit_id=i.audit_id AND a.batch_id=i.batch_id) AS generated_artifact_count,
            (SELECT COUNT(*)::int FROM report_artifacts a
              WHERE a.audit_id=i.audit_id AND a.artifact_state='ACTIVE') AS active_count
       FROM discovery_batch_items i WHERE i.batch_id=$1 AND i.audit_id=$2`,
    [attempt.batchId, source.auditId],
  )).rows[0];
  assert.deepEqual({
    state: state.state,
    providerCalls: Number(state.provider_calls),
    reservationCount: Number(state.reservation_count),
    generatedArtifactCount: Number(state.generated_artifact_count),
    activeCount: Number(state.active_count),
  }, {
    state: "GENERATED",
    providerCalls: 1,
    reservationCount: 1,
    generatedArtifactCount: 0,
    activeCount: 1,
  });
  assert.equal(
    (await pool.query(
      `SELECT id FROM report_artifacts WHERE audit_id=$1 AND artifact_state='ACTIVE'`,
      [source.auditId],
    )).rows[0].id,
    driftedArtifactId,
  );
  await batch.releaseDiscoveryGlobalLock(attempt.lock.token, pool);
});

test("GENERATION rolls back supersede and insert when the final audit write fails", async () => {
  const source = await insertGenerationVersioningFixture("audit-write-rollback");
  const attempt = await startSyntheticGenerationAttempt(source.auditId, "generation-audit-write-rollback");
  const generated = await buildValidPersistenceFixture(source.responses, attempt.responseId);
  await pool.query(
    `CREATE OR REPLACE FUNCTION fail_generation_audit_update()
     RETURNS TRIGGER LANGUAGE plpgsql AS $$
     BEGIN
       IF OLD.id = '${source.auditId}' THEN
         RAISE EXCEPTION 'forced_generation_audit_cas_failure';
       END IF;
       RETURN NEW;
     END;
     $$`,
  );
  await pool.query(
    `CREATE TRIGGER fail_generation_audit_update_trigger
       BEFORE UPDATE ON audits FOR EACH ROW EXECUTE FUNCTION fail_generation_audit_update()`,
  );
  try {
    await assert.rejects(
      batch.persistValidatedDiscoveryBatchItem({
        batchId: attempt.batchId,
        auditId: source.auditId,
        lockToken: attempt.lock.token,
        expectedResponsesSha256: batch.discoverySha256(source.responses),
        expectedSourceStatus: "PENDING",
        expectedTxtSha256: batch.discoverySha256(source.sourceTxt),
        expectedHtmlSha256: batch.discoverySha256(source.sourceHtml),
        narrativeReport: generated.narrativeReport,
        scores: generated.scores,
        txt: generated.assets.txt,
        html: generated.assets.html,
        model: "gpt-test",
      }, pool),
      /forced_generation_audit_cas_failure/,
    );
  } finally {
    await pool.query("DROP TRIGGER fail_generation_audit_update_trigger ON audits");
    await pool.query("DROP FUNCTION fail_generation_audit_update()");
  }
  const after = (await pool.query(
    `SELECT id,tier,engine,model,txt,html,content_sha256,batch_id,
            artifact_state,superseded_at,supersedes_artifact_id,created_at
       FROM report_artifacts WHERE audit_id=$1 ORDER BY created_at,id`,
    [source.auditId],
  )).rows;
  assert.deepEqual(after, source.before);
  const audit = (await pool.query(
    `SELECT report_delivery_status,narrative_report,report_txt,report_html
       FROM audits WHERE id=$1`,
    [source.auditId],
  )).rows[0];
  assert.deepEqual(audit, {
    report_delivery_status: "PENDING",
    narrative_report: { legacyInvalid: "audit-write-rollback" },
    report_txt: source.sourceTxt,
    report_html: source.sourceHtml,
  });
  const item = (await pool.query(
    `SELECT state,provider_calls,artifact_id FROM discovery_batch_items
      WHERE batch_id=$1 AND audit_id=$2`,
    [attempt.batchId, source.auditId],
  )).rows[0];
  assert.deepEqual({
    state: item.state,
    providerCalls: Number(item.provider_calls),
    artifactId: item.artifact_id,
  }, { state: "GENERATED", providerCalls: 1, artifactId: null });
  await batch.releaseDiscoveryGlobalLock(attempt.lock.token, pool);
});

test("legacy lost output becomes a retryable tombstone without inventing provider bytes", async () => {
  const auditId = await insertAudit();
  await pool.query(
    `UPDATE audits SET report_delivery_status='BATCH_REVIEW',narrative_report=NULL,
       report_txt=NULL,report_html=NULL WHERE id=$1`,
    [auditId],
  );
  const responseId = `resp_${randomUUID()}`;
  await insertDiscoveryProviderProof(auditId, responseId, 0.157);
  const lock = await batch.acquireDiscoveryGlobalLock({ owner: "postgres-integration", purpose: "legacy-prepare" }, pool);
  const prepared = await batch.prepareDiscoveryAuditForRegeneration({
    auditId, lockToken: lock.token, ...await regenerationSourceBinding(auditId),
  }, pool);
  assert.equal(prepared.sourceKind, "LEGACY_LOST_CANDIDATE");
  const candidate = await pool.query(
    `SELECT source_kind,provider_raw,provider_raw_text,assembled_candidate,state,attempt_no
       FROM discovery_rejected_candidates WHERE id=$1`,
    [prepared.candidateId],
  );
  assert.deepEqual(candidate.rows[0], {
    source_kind: "LEGACY_LOST_CANDIDATE", provider_raw: null, provider_raw_text: null,
    assembled_candidate: null, state: "QUARANTINED", attempt_no: 1,
  });
  await batch.releaseDiscoveryGlobalLock(lock.token, pool);
});

test("legacy preparation rejects one completed proof plus any extra reservation", async () => {
  const auditId = await insertAudit();
  const originalNarrative = { legacy: "must-not-be-cleaned" };
  await pool.query(
    `UPDATE audits SET report_delivery_status='BATCH_REVIEW',narrative_report=$2::jsonb,
       report_txt=NULL,report_html=NULL WHERE id=$1`,
    [auditId, JSON.stringify(originalNarrative)],
  );
  await insertDiscoveryProviderProof(auditId, `resp_${randomUUID()}`, 0.157);
  await pool.query(
    `INSERT INTO ai_cost_budget_reservations
      (id,product,order_id,profile,label,status,reserved_cost_usd,response_id)
     VALUES ($1,'discovery',$2,'discovery','unexpected-extra','FAILED',0,NULL)`,
    [randomUUID(), auditId],
  );
  const lock = await batch.acquireDiscoveryGlobalLock({
    owner: "postgres-integration", purpose: "legacy-ledger-cardinality",
  }, pool);
  await assert.rejects(batch.prepareDiscoveryAuditForRegeneration({
    auditId, lockToken: lock.token, ...await regenerationSourceBinding(auditId),
  }, pool), /DISCOVERY_REGENERATION_LEDGER_NOT_EXACT/);
  const state = (await pool.query(
    `SELECT narrative_report,(SELECT COUNT(*)::int FROM discovery_rejected_candidates c
       WHERE c.audit_id=audits.id) AS candidate_count FROM audits WHERE id=$1`,
    [auditId],
  )).rows[0];
  assert.deepEqual(state.narrative_report, originalNarrative);
  assert.equal(state.candidate_count, 0);
  await batch.releaseDiscoveryGlobalLock(lock.token, pool);
});

test("narrative-only legacy output is tombstoned and cleaned atomically under manifest CAS", async () => {
  const auditId = await insertAudit();
  const legacyNarrative = { legacy: true, sections: [{ id: "sleep", content: "partial" }] };
  await pool.query(
    `UPDATE audits SET report_delivery_status='BATCH_REVIEW',narrative_report=$2::jsonb,
       report_txt=NULL,report_html=NULL WHERE id=$1`,
    [auditId, JSON.stringify(legacyNarrative)],
  );
  await insertDiscoveryProviderProof(auditId, `resp_${randomUUID()}`, 0.157);
  const legacyNarrativeBytes = String((await pool.query(
    `SELECT narrative_report::text AS bytes FROM audits WHERE id=$1`,
    [auditId],
  )).rows[0].bytes);
  const binding = await regenerationSourceBinding(auditId);
  const lock = await batch.acquireDiscoveryGlobalLock({
    owner: "postgres-integration", purpose: "legacy-narrative-prepare",
  }, pool);
  const prepared = await batch.prepareDiscoveryAuditForRegeneration({
    auditId, lockToken: lock.token, ...binding,
  }, pool);
  assert.equal(prepared.sourceKind, "LEGACY_NARRATIVE_ONLY");
  const state = (await pool.query(
    `SELECT a.narrative_report,a.report_txt,a.report_html,c.source_kind,c.assembled_candidate,
            c.validation_errors,c.state,c.legacy_narrative_present,c.legacy_narrative_json,
            c.legacy_narrative_sha256
       FROM audits a JOIN discovery_rejected_candidates c ON c.audit_id=a.id
      WHERE a.id=$1`,
    [auditId],
  )).rows[0];
  assert.equal(state.narrative_report, null);
  assert.equal(state.report_txt, null);
  assert.equal(state.report_html, null);
  assert.equal(state.source_kind, "LEGACY_NARRATIVE_ONLY");
  assert.equal(state.assembled_candidate, null);
  assert.equal(state.legacy_narrative_present, true);
  assert.equal(state.legacy_narrative_json, legacyNarrativeBytes);
  assert.equal(state.legacy_narrative_sha256, batch.discoverySha256(legacyNarrativeBytes));
  assert.deepEqual(state.validation_errors, [
    `legacy_narrative_only_preserved:${batch.discoverySha256(legacyNarrativeBytes)}`,
  ]);
  assert.equal(state.state, "QUARANTINED");
  await assert.rejects(
    pool.query(
      `UPDATE discovery_rejected_candidates SET legacy_narrative_json='{}' WHERE id=$1`,
      [prepared.candidateId],
    ),
    /DISCOVERY_LEGACY_NARRATIVE_PROVENANCE_APPEND_ONLY/,
  );
  await assert.rejects(
    pool.query(`DELETE FROM discovery_rejected_candidates WHERE id=$1`, [prepared.candidateId]),
    /DISCOVERY_LEGACY_NARRATIVE_PROVENANCE_APPEND_ONLY/,
  );
  await batch.releaseDiscoveryGlobalLock(lock.token, pool);
});

test("narrative-only preparation rejects stale manifest hashes before tombstone or cleanup", async () => {
  const auditId = await insertAudit();
  const legacyNarrative = { legacy: "original" };
  await pool.query(
    `UPDATE audits SET report_delivery_status='BATCH_REVIEW',narrative_report=$2::jsonb,
       report_txt=NULL,report_html=NULL WHERE id=$1`,
    [auditId, JSON.stringify(legacyNarrative)],
  );
  await insertDiscoveryProviderProof(auditId, `resp_${randomUUID()}`, 0.157);
  const binding = await regenerationSourceBinding(auditId);
  await pool.query(`UPDATE audits SET narrative_report='{"legacy":"changed"}'::jsonb WHERE id=$1`, [auditId]);
  const lock = await batch.acquireDiscoveryGlobalLock({
    owner: "postgres-integration", purpose: "legacy-narrative-stale-manifest",
  }, pool);
  await assert.rejects(batch.prepareDiscoveryAuditForRegeneration({
    auditId, lockToken: lock.token, ...binding,
  }, pool), /DISCOVERY_REGENERATION_MANIFEST_SOURCE_CAS_FAILED/);
  const state = (await pool.query(
    `SELECT narrative_report,(SELECT COUNT(*)::int FROM discovery_rejected_candidates c
       WHERE c.audit_id=audits.id) AS candidate_count FROM audits WHERE id=$1`,
    [auditId],
  )).rows[0];
  assert.deepEqual(state.narrative_report, { legacy: "changed" });
  assert.equal(state.candidate_count, 0);
  await batch.releaseDiscoveryGlobalLock(lock.token, pool);
});

test("failed narrative-only cleanup rolls back its tombstone in the same transaction", async () => {
  const auditId = await insertAudit();
  const legacyNarrative = { legacy: "must-survive-rollback" };
  await pool.query(
    `UPDATE audits SET report_delivery_status='BATCH_REVIEW',narrative_report=$2::jsonb,
       report_txt=NULL,report_html=NULL WHERE id=$1`,
    [auditId, JSON.stringify(legacyNarrative)],
  );
  await insertDiscoveryProviderProof(auditId, `resp_${randomUUID()}`, 0.157);
  const binding = await regenerationSourceBinding(auditId);
  await pool.query(`
    CREATE FUNCTION block_legacy_cleanup() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN
      IF OLD.narrative_report IS NOT NULL AND NEW.narrative_report IS NULL THEN
        RETURN NULL;
      END IF;
      RETURN NEW;
    END $$;
    CREATE TRIGGER block_legacy_cleanup BEFORE UPDATE ON audits
      FOR EACH ROW EXECUTE FUNCTION block_legacy_cleanup();
  `);
  const lock = await batch.acquireDiscoveryGlobalLock({
    owner: "postgres-integration", purpose: "legacy-narrative-atomicity",
  }, pool);
  await assert.rejects(batch.prepareDiscoveryAuditForRegeneration({
    auditId, lockToken: lock.token, ...binding,
  }, pool), /DISCOVERY_REGENERATION_LEGACY_CLEANUP_CAS_FAILED/);
  await pool.query(`DROP TRIGGER block_legacy_cleanup ON audits; DROP FUNCTION block_legacy_cleanup()`);
  const state = (await pool.query(
    `SELECT narrative_report,(SELECT COUNT(*)::int FROM discovery_rejected_candidates c
       WHERE c.audit_id=audits.id) AS candidate_count FROM audits WHERE id=$1`,
    [auditId],
  )).rows[0];
  assert.deepEqual(state.narrative_report, legacyNarrative);
  assert.equal(state.candidate_count, 0);
  await batch.releaseDiscoveryGlobalLock(lock.token, pool);
});

test("narrative-only preparation requires zero artifacts, claims, tracking and prior candidates", async () => {
  const makeNarrativeOnly = async (label: string) => {
    const auditId = await insertAudit();
    await pool.query(
      `UPDATE audits SET report_delivery_status='BATCH_REVIEW',narrative_report=$2::jsonb,
         report_txt=NULL,report_html=NULL WHERE id=$1`,
      [auditId, JSON.stringify({ legacy: label })],
    );
    await insertDiscoveryProviderProof(auditId, `resp_${randomUUID()}`, 0.157);
    return auditId;
  };

  const artifactAuditId = await makeNarrativeOnly("artifact");
  await pool.query(
    `INSERT INTO report_artifacts (audit_id,tier,engine,model,txt,html,content_sha256)
     VALUES ($1,'ONE','legacy','legacy','txt','html',$2)`,
    [artifactAuditId, batch.discoveryArtifactContentHash("txt", "html")],
  );
  const artifactLock = await batch.acquireDiscoveryGlobalLock({
    owner: "postgres-integration", purpose: "legacy-narrative-artifact-block",
  }, pool);
  await assert.rejects(batch.prepareDiscoveryAuditForRegeneration({
    auditId: artifactAuditId, lockToken: artifactLock.token,
    ...await regenerationSourceBinding(artifactAuditId),
  }, pool), /DISCOVERY_REGENERATION_LEGACY_ARTIFACT_EXISTS/);
  await batch.releaseDiscoveryGlobalLock(artifactLock.token, pool);

  const trackingAuditId = await makeNarrativeOnly("tracking");
  await pool.query(
    `INSERT INTO email_tracking (email_type,recipient_email,audit_id,sendpulse_status)
     VALUES ('sendReportReadyEmail','blocked@example.test',$1,'pending')`,
    [trackingAuditId],
  );
  const trackingLock = await batch.acquireDiscoveryGlobalLock({
    owner: "postgres-integration", purpose: "legacy-narrative-tracking-block",
  }, pool);
  await assert.rejects(batch.prepareDiscoveryAuditForRegeneration({
    auditId: trackingAuditId, lockToken: trackingLock.token,
    ...await regenerationSourceBinding(trackingAuditId),
  }, pool), /DISCOVERY_REGENERATION_EXTERNAL_STATE_BLOCKED/);
  await batch.releaseDiscoveryGlobalLock(trackingLock.token, pool);

  const claimAuditId = await makeNarrativeOnly("claim");
  const claimLock = await batch.acquireDiscoveryGlobalLock({
    owner: "postgres-integration", purpose: "legacy-narrative-claim-block",
  }, pool);
  const claimBinding = await regenerationSourceBinding(claimAuditId);
  const claimBatchId = await batch.createDiscoveryBatchRun({
    manifestSha256: batch.discoverySha256(randomUUID()), commitSha: "a".repeat(40),
    approvalReference: "legacy-claim-block", approvalExpiresAt: new Date(Date.now() + 60_000).toISOString(),
    stage: "GENERATION", tier: "ONE", globalBudgetUsd: 0.75,
    softPerScanUsd: 0.25, hardPerScanUsd: 0.75, lockToken: claimLock.token,
    items: [{ auditId: claimAuditId, sequenceNo: 1, cohort: "ambiguous",
      expectedResponsesSha256: claimBinding.expectedResponsesSha256,
      expectedSourceStatus: "BATCH_REVIEW", expectedTxtSha256: null, expectedHtmlSha256: null }],
  }, pool);
  await pool.query(
    `INSERT INTO discovery_email_delivery_claims
      (batch_id,audit_id,email_type,recipient_email,report_txt_sha256,report_html_sha256,subject_sha256)
     VALUES ($1,$2,'sendReportReadyEmail','blocked@example.test',$3,$3,$3)`,
    [claimBatchId, claimAuditId, "b".repeat(64)],
  );
  await assert.rejects(batch.prepareDiscoveryAuditForRegeneration({
    auditId: claimAuditId, lockToken: claimLock.token, ...claimBinding,
  }, pool), /DISCOVERY_REGENERATION_EXTERNAL_STATE_BLOCKED/);
  await pool.query(
    `UPDATE discovery_email_delivery_claims SET state='FAILED_FINAL',error_detail='test cleanup'
      WHERE batch_id=$1`,
    [claimBatchId],
  );
  await pool.query(`UPDATE discovery_batch_items SET state='SKIPPED' WHERE batch_id=$1`, [claimBatchId]);
  await pool.query(
    `UPDATE discovery_batch_runs SET status='FAILED',completed_at=NOW(),stop_reason='test cleanup'
      WHERE id=$1`,
    [claimBatchId],
  );
  await batch.releaseDiscoveryGlobalLock(claimLock.token, pool);

  const candidateAuditId = await makeNarrativeOnly("candidate");
  const candidateLock = await batch.acquireDiscoveryGlobalLock({
    owner: "postgres-integration", purpose: "legacy-narrative-candidate-block",
  }, pool);
  await batch.prepareDiscoveryAuditForRegeneration({
    auditId: candidateAuditId, lockToken: candidateLock.token,
    ...await regenerationSourceBinding(candidateAuditId),
  }, pool);
  await pool.query(`UPDATE audits SET narrative_report='{"legacy":"reappeared"}'::jsonb WHERE id=$1`, [candidateAuditId]);
  await assert.rejects(batch.prepareDiscoveryAuditForRegeneration({
    auditId: candidateAuditId, lockToken: candidateLock.token,
    ...await regenerationSourceBinding(candidateAuditId),
  }, pool), /DISCOVERY_REGENERATION_EXTERNAL_STATE_BLOCKED/);
  await batch.releaseDiscoveryGlobalLock(candidateLock.token, pool);
});

test("a legacy narrative that reappears after prepare is rejected before provider claim", async () => {
  const auditId = await insertAudit("BATCH_REVIEW", completeV2Responses());
  await pool.query(
    `UPDATE audits SET narrative_report='{"legacy":"sealed-before-claim"}'::jsonb,
       report_txt=NULL,report_html=NULL WHERE id=$1`,
    [auditId],
  );
  await insertDiscoveryProviderProof(auditId, `resp_${randomUUID()}`, 0.12);
  const binding = await regenerationSourceBinding(auditId);
  const lock = await batch.acquireDiscoveryGlobalLock({
    owner: "postgres-integration", purpose: "legacy-race-before-claim",
  }, pool);
  const prepared = await batch.prepareDiscoveryAuditForRegeneration({
    auditId, lockToken: lock.token, ...binding,
  }, pool);
  const batchId = await createRegenerationBatchForPreparedCandidate({
    auditId, candidateId: prepared.candidateId, lockToken: lock.token,
    binding: { ...binding, expectedTxtSha256: null, expectedHtmlSha256: null },
    label: "legacy-race-before-claim",
  });
  await pool.query(
    `UPDATE audits SET narrative_report='{"legacy":"interleaving-mutation"}'::jsonb WHERE id=$1`,
    [auditId],
  );
  await assert.rejects(batch.claimDiscoveryProviderAttempt({
    batchId, auditId, lockToken: lock.token,
  }, pool), /DISCOVERY_REGENERATION_SOURCE_NOT_ELIGIBLE/);
  const evidence = (await pool.query(
    `SELECT c.state,c.legacy_narrative_json,c.legacy_narrative_sha256,i.state AS item_state
       FROM discovery_rejected_candidates c
       JOIN discovery_batch_items i ON i.retry_of_candidate_id=c.id
      WHERE c.id=$1`,
    [prepared.candidateId],
  )).rows[0];
  assert.equal(evidence.state, "QUARANTINED");
  assert.equal(evidence.item_state, "PREFLIGHT_OK");
  assert.equal(batch.discoverySha256(evidence.legacy_narrative_json), evidence.legacy_narrative_sha256);
  await batch.releaseDiscoveryGlobalLock(lock.token, pool);
});

test("a legacy narrative that reappears after claim rolls back persistence fail-closed", async () => {
  const responses = completeV2Responses();
  const auditId = await insertAudit("BATCH_REVIEW", responses);
  await pool.query(
    `UPDATE audits SET narrative_report='{"legacy":"sealed-before-persist"}'::jsonb,
       report_txt=NULL,report_html=NULL WHERE id=$1`,
    [auditId],
  );
  await insertDiscoveryProviderProof(auditId, `resp_${randomUUID()}`, 0.12);
  const binding = await regenerationSourceBinding(auditId);
  const lock = await batch.acquireDiscoveryGlobalLock({
    owner: "postgres-integration", purpose: "legacy-race-before-persist",
  }, pool);
  const prepared = await batch.prepareDiscoveryAuditForRegeneration({
    auditId, lockToken: lock.token, ...binding,
  }, pool);
  const batchId = await createRegenerationBatchForPreparedCandidate({
    auditId, candidateId: prepared.candidateId, lockToken: lock.token,
    binding: { ...binding, expectedTxtSha256: null, expectedHtmlSha256: null },
    label: "legacy-race-before-persist",
  });
  await batch.claimDiscoveryProviderAttempt({ batchId, auditId, lockToken: lock.token }, pool);
  const responseId = `resp_${randomUUID()}`;
  await insertDiscoveryProviderProof(auditId, responseId, 0.14);
  await batch.recordDiscoveryProviderUsage({
    batchId, auditId, lockToken: lock.token, responseId,
    inputTokens: 100, outputTokens: 50, totalTokens: 150, actualCostUsd: 0.14,
  }, pool);
  const fixture = await buildValidPersistenceFixture(responses, responseId);
  await pool.query(
    `UPDATE audits SET narrative_report='{"legacy":"interleaving-after-claim"}'::jsonb WHERE id=$1`,
    [auditId],
  );
  await assert.rejects(batch.persistValidatedDiscoveryBatchItem({
    batchId, auditId, lockToken: lock.token,
    expectedResponsesSha256: binding.expectedResponsesSha256,
    expectedSourceStatus: "BATCH_REVIEW", expectedTxtSha256: null, expectedHtmlSha256: null,
    narrativeReport: fixture.narrativeReport, scores: fixture.scores,
    txt: fixture.assets.txt, html: fixture.assets.html, model: "gpt-test",
  }, pool), /DISCOVERY_REGENERATION_LEGACY_SOURCE_CHANGED/);
  const state = (await pool.query(
    `SELECT a.narrative_report,c.state,i.state AS item_state,
            (SELECT COUNT(*)::int FROM report_artifacts r WHERE r.audit_id=a.id) AS artifact_count
       FROM audits a
       JOIN discovery_rejected_candidates c ON c.audit_id=a.id
       JOIN discovery_batch_items i ON i.retry_of_candidate_id=c.id
      WHERE a.id=$1`,
    [auditId],
  )).rows[0];
  assert.deepEqual(state.narrative_report, { legacy: "interleaving-after-claim" });
  assert.equal(state.state, "RETRY_CLAIMED");
  assert.equal(state.item_state, "GENERATED");
  assert.equal(state.artifact_count, 0);
  await batch.releaseDiscoveryGlobalLock(lock.token, pool);
});

test("persisted invalid replay supersedes exactly one ACTIVE artifact and links the new version", async () => {
  const setup = await setupPersistedInvalidRegeneration("versioned-invalid-replay");
  const persisted = await batch.persistValidatedDiscoveryBatchItem({
    batchId: setup.batchId, auditId: setup.auditId, lockToken: setup.lock.token,
    expectedResponsesSha256: setup.binding.expectedResponsesSha256,
    expectedSourceStatus: "BATCH_REVIEW",
    expectedTxtSha256: setup.binding.expectedTxtSha256,
    expectedHtmlSha256: setup.binding.expectedHtmlSha256,
    narrativeReport: setup.fixture.narrativeReport, scores: setup.fixture.scores,
    txt: setup.fixture.assets.txt, html: setup.fixture.assets.html, model: "gpt-test",
  }, pool);
  const versions = (await pool.query(
    `SELECT id,artifact_state,superseded_at,supersedes_artifact_id
       FROM report_artifacts WHERE audit_id=$1 ORDER BY created_at,id`,
    [setup.auditId],
  )).rows;
  assert.equal(versions.length, 2);
  const oldVersion = versions.find((row) => row.id === setup.oldArtifactId);
  const newVersion = versions.find((row) => row.id === persisted.artifactId);
  assert.equal(oldVersion.artifact_state, "SUPERSEDED");
  assert.ok(oldVersion.superseded_at);
  assert.equal(newVersion.artifact_state, "ACTIVE");
  assert.equal(newVersion.supersedes_artifact_id, setup.oldArtifactId);
  assert.equal(versions.filter((row) => row.artifact_state === "ACTIVE").length, 1);
  await batch.releaseDiscoveryGlobalLock(setup.lock.token, pool);
});

test("a late item CAS failure rolls back artifact supersede, insertion and audit replacement", async () => {
  const setup = await setupPersistedInvalidRegeneration("versioned-invalid-rollback");
  await pool.query(`
    CREATE FUNCTION block_discovery_item_store() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN
      IF OLD.state='GENERATED' AND NEW.state='STORED' THEN RETURN NULL; END IF;
      RETURN NEW;
    END $$;
    CREATE TRIGGER block_discovery_item_store BEFORE UPDATE ON discovery_batch_items
      FOR EACH ROW EXECUTE FUNCTION block_discovery_item_store();
  `);
  await assert.rejects(batch.persistValidatedDiscoveryBatchItem({
    batchId: setup.batchId, auditId: setup.auditId, lockToken: setup.lock.token,
    expectedResponsesSha256: setup.binding.expectedResponsesSha256,
    expectedSourceStatus: "BATCH_REVIEW",
    expectedTxtSha256: setup.binding.expectedTxtSha256,
    expectedHtmlSha256: setup.binding.expectedHtmlSha256,
    narrativeReport: setup.fixture.narrativeReport, scores: setup.fixture.scores,
    txt: setup.fixture.assets.txt, html: setup.fixture.assets.html, model: "gpt-test",
  }, pool), /DISCOVERY_BATCH_ITEM_PERSISTENCE_CAS_FAILED/);
  await pool.query(
    `DROP TRIGGER block_discovery_item_store ON discovery_batch_items;
     DROP FUNCTION block_discovery_item_store()`,
  );
  const state = (await pool.query(
    `SELECT a.narrative_report,a.report_txt,a.report_html,i.state AS item_state,
            jsonb_agg(jsonb_build_object(
              'id',r.id,'state',r.artifact_state,'supersededAt',r.superseded_at
            ) ORDER BY r.created_at,r.id) AS artifacts
       FROM audits a
       JOIN discovery_batch_items i ON i.audit_id=a.id AND i.batch_id=$2
       JOIN report_artifacts r ON r.audit_id=a.id
      WHERE a.id=$1 GROUP BY a.id,i.state`,
    [setup.auditId, setup.batchId],
  )).rows[0];
  assert.deepEqual(state.narrative_report, setup.oldNarrative);
  assert.equal(state.report_txt, setup.oldTxt);
  assert.equal(state.report_html, setup.oldHtml);
  assert.equal(state.item_state, "GENERATED");
  assert.deepEqual(state.artifacts, [{
    id: setup.oldArtifactId, state: "ACTIVE", supersededAt: null,
  }]);
  await batch.releaseDiscoveryGlobalLock(setup.lock.token, pool);
});

test("a regeneration failure becomes terminally ambiguous and cannot consume a third call", async () => {
  const auditId = await insertAudit();
  await pool.query(
    `UPDATE audits SET report_delivery_status='BATCH_REVIEW',narrative_report=NULL,
       report_txt=NULL,report_html=NULL WHERE id=$1`,
    [auditId],
  );
  await insertDiscoveryProviderProof(auditId, `resp_${randomUUID()}`, 0.12);
  const lock = await batch.acquireDiscoveryGlobalLock({ owner: "postgres-integration", purpose: "retry-lifecycle" }, pool);
  const prepared = await batch.prepareDiscoveryAuditForRegeneration({
    auditId, lockToken: lock.token, ...await regenerationSourceBinding(auditId),
  }, pool);
  const audit = (await pool.query(`SELECT responses FROM audits WHERE id=$1`, [auditId])).rows[0];
  const batchId = await batch.createDiscoveryBatchRun({
    manifestSha256: "a".repeat(64), commitSha: "b".repeat(40), approvalReference: "postgres-test",
    approvalExpiresAt: new Date(Date.now() + 60_000).toISOString(),
    stage: "REGENERATION", tier: "ONE", softPerScanUsd: 0.25, hardPerScanUsd: 0.75,
    globalBudgetUsd: 0.75, lockToken: lock.token,
    items: [{ auditId, sequenceNo: 1, cohort: "ambiguous",
      expectedResponsesSha256: batch.discoverySha256(audit.responses),
      expectedSourceStatus: "BATCH_REVIEW", expectedTxtSha256: null, expectedHtmlSha256: null,
      retryOfCandidateId: prepared.candidateId }],
  }, pool);
  await batch.markDiscoveryBatchItemPreflightOk({ batchId, auditId, lockToken: lock.token }, pool);
  await batch.claimDiscoveryProviderAttempt({ batchId, auditId, lockToken: lock.token }, pool);
  await batch.failDiscoveryBatchItem({
    batchId, auditId, lockToken: lock.token, errorCode: "PRE_PROVIDER_CERTAIN",
    errorDetail: "provider POST never started", ambiguous: false,
  }, pool);
  const candidate = await pool.query(
    `SELECT state,retried_by_batch_id FROM discovery_rejected_candidates WHERE id=$1`,
    [prepared.candidateId],
  );
  assert.deepEqual(candidate.rows[0], { state: "RETRY_AMBIGUOUS", retried_by_batch_id: batchId });
  await batch.releaseDiscoveryGlobalLock(lock.token, pool);
});

test("a completed provider result fences epoch rotation until crash recovery quarantines it", async () => {
  const auditId = await insertAudit();
  const lock = await batch.acquireDiscoveryGlobalLock({
    owner: "postgres-integration", purpose: "orphan-result", ttlMinutes: 5,
  }, pool);
  const audit = (await pool.query(`SELECT responses FROM audits WHERE id=$1`, [auditId])).rows[0];
  const batchId = await batch.createDiscoveryBatchRun({
    manifestSha256: "c".repeat(64), commitSha: "d".repeat(40), approvalReference: "orphan-test",
    approvalExpiresAt: new Date(Date.now() + 60_000).toISOString(),
    stage: "GENERATION", tier: "ONE", softPerScanUsd: 0.25, hardPerScanUsd: 0.75,
    globalBudgetUsd: 0.75, lockToken: lock.token,
    items: [{ auditId, sequenceNo: 1, cohort: "invalid",
      expectedResponsesSha256: batch.discoverySha256(audit.responses),
      expectedSourceStatus: "PENDING", expectedTxtSha256: null, expectedHtmlSha256: null }],
  }, pool);
  await batch.markDiscoveryBatchItemPreflightOk({ batchId, auditId, lockToken: lock.token }, pool);
  await batch.claimDiscoveryProviderAttempt({ batchId, auditId, lockToken: lock.token }, pool);
  const responseId = `resp_${randomUUID()}`;
  const proof = await insertDiscoveryProviderProof(auditId, responseId, 0.16);
  await batch.recordDiscoveryProviderUsage({
    batchId, auditId, lockToken: lock.token, responseId,
    inputTokens: 100, outputTokens: 50, totalTokens: 150, actualCostUsd: 0.16,
  }, pool);
  // A process can crash after marking its run failed but before quarantining
  // the already completed provider result.  FAILED is not settled while the
  // item itself is still GENERATED/VALIDATED.
  await pool.query(
    `UPDATE discovery_batch_runs SET status='FAILED',completed_at=NOW(),stop_reason='synthetic crash'
      WHERE id=$1`,
    [batchId],
  );
  await pool.query(
    `UPDATE discovery_operation_lock
        SET acquired_at=NOW()-INTERVAL '2 minutes',expires_at=NOW()-INTERVAL '1 microsecond'
      WHERE lock_key='discovery-global' AND token=$1`,
    [lock.token],
  );

  await assert.rejects(
    batch.acquireDiscoveryGlobalLock({ owner: "must-block", purpose: "epoch-rotation" }, pool),
    /DISCOVERY_BATCH_IN_FLIGHT_OPERATION/,
  );
  const recovered = await batch.recoverOrphanedDiscoveryProviderResult({ batchId, auditId }, pool);
  assert.equal(recovered.responseId, responseId);
  assert.equal(recovered.state, "TERMINAL_REJECTED");
  const state = await pool.query(
    `SELECT a.report_delivery_status,i.state AS item_state,b.status AS batch_status,
            c.source_kind,c.state AS candidate_state,c.reservation_id,c.usage_event_id
       FROM audits a
       JOIN discovery_batch_items i ON i.audit_id=a.id
       JOIN discovery_batch_runs b ON b.id=i.batch_id
       JOIN discovery_rejected_candidates c ON c.batch_id=b.id AND c.audit_id=a.id
      WHERE a.id=$1`,
    [auditId],
  );
  assert.deepEqual({
    audit: state.rows[0].report_delivery_status,
    item: state.rows[0].item_state,
    batch: state.rows[0].batch_status,
    source: state.rows[0].source_kind,
    candidate: state.rows[0].candidate_state,
    reservation: state.rows[0].reservation_id,
    usage: Number(state.rows[0].usage_event_id),
  }, {
    audit: "BATCH_REVIEW", item: "FAILED", batch: "FAILED",
    source: "PROVIDER_RESULT_LOST", candidate: "TERMINAL_REJECTED",
    reservation: proof.reservationId, usage: proof.usageEventId,
  });
  const nextLock = await batch.acquireDiscoveryGlobalLock({
    owner: "postgres-integration", purpose: "post-orphan-recovery",
  }, pool);
  assert.notEqual(nextLock.token, lock.token);
  await batch.releaseDiscoveryGlobalLock(nextLock.token, pool);
});

test("regeneration binds a distinct second reservation and usage row and rejects ledger reuse", async () => {
  const auditId = await insertAudit();
  await pool.query(
    `UPDATE audits SET report_delivery_status='BATCH_REVIEW',narrative_report=NULL,
       report_txt=NULL,report_html=NULL WHERE id=$1`,
    [auditId],
  );
  const firstResponseId = `resp_${randomUUID()}`;
  const firstProof = await insertDiscoveryProviderProof(auditId, firstResponseId, 0.12);
  const lock = await batch.acquireDiscoveryGlobalLock({
    owner: "postgres-integration", purpose: "ledger-reuse",
  }, pool);
  const prepared = await batch.prepareDiscoveryAuditForRegeneration({
    auditId, lockToken: lock.token, ...await regenerationSourceBinding(auditId),
  }, pool);
  const audit = (await pool.query(`SELECT responses FROM audits WHERE id=$1`, [auditId])).rows[0];
  const batchId = await batch.createDiscoveryBatchRun({
    manifestSha256: "e".repeat(64), commitSha: "f".repeat(40), approvalReference: "ledger-test",
    approvalExpiresAt: new Date(Date.now() + 60_000).toISOString(),
    stage: "REGENERATION", tier: "ONE", softPerScanUsd: 0.25, hardPerScanUsd: 0.75,
    globalBudgetUsd: 0.75, lockToken: lock.token,
    items: [{ auditId, sequenceNo: 1, cohort: "invalid",
      expectedResponsesSha256: batch.discoverySha256(audit.responses),
      expectedSourceStatus: "BATCH_REVIEW", expectedTxtSha256: null, expectedHtmlSha256: null,
      retryOfCandidateId: prepared.candidateId }],
  }, pool);
  await batch.markDiscoveryBatchItemPreflightOk({ batchId, auditId, lockToken: lock.token }, pool);
  await batch.claimDiscoveryProviderAttempt({ batchId, auditId, lockToken: lock.token }, pool);
  await assert.rejects(
    batch.recordDiscoveryProviderUsage({
      batchId, auditId, lockToken: lock.token, responseId: firstResponseId,
      inputTokens: 100, outputTokens: 50, totalTokens: 150, actualCostUsd: 0.12,
    }, pool),
    /DISCOVERY_BATCH_PROVIDER_LEDGER_MISMATCH/,
  );
  const secondResponseId = `resp_${randomUUID()}`;
  const secondProof = await insertDiscoveryProviderProof(auditId, secondResponseId, 0.14);
  await batch.recordDiscoveryProviderUsage({
    batchId, auditId, lockToken: lock.token, responseId: secondResponseId,
    inputTokens: 100, outputTokens: 50, totalTokens: 150, actualCostUsd: 0.14,
  }, pool);
  const item = (await pool.query(
    `SELECT provider_response_id,provider_reservation_id,provider_usage_event_id
       FROM discovery_batch_items WHERE batch_id=$1 AND audit_id=$2`,
    [batchId, auditId],
  )).rows[0];
  assert.deepEqual({
    response: item.provider_response_id,
    reservation: item.provider_reservation_id,
    usage: Number(item.provider_usage_event_id),
  }, {
    response: secondResponseId,
    reservation: secondProof.reservationId,
    usage: secondProof.usageEventId,
  });

  await pool.query(
    `UPDATE discovery_batch_items
        SET provider_response_id=$3,provider_reservation_id=$4,provider_usage_event_id=$5
      WHERE batch_id=$1 AND audit_id=$2`,
    [batchId, auditId, firstResponseId, firstProof.reservationId, firstProof.usageEventId],
  );
  await assert.rejects(
    batch.persistValidatedDiscoveryBatchItem({
      batchId, auditId, lockToken: lock.token,
      expectedResponsesSha256: batch.discoverySha256(audit.responses),
      expectedSourceStatus: "BATCH_REVIEW", expectedTxtSha256: null, expectedHtmlSha256: null,
      narrativeReport: {}, scores: {}, txt: "bad", html: "<p>bad</p>", model: "gpt-test",
    }, pool),
    /DISCOVERY_BATCH_PROVIDER_PROVENANCE_MISMATCH/,
  );
  assert.equal(Number((await pool.query(
    `SELECT COUNT(*) FROM report_artifacts WHERE audit_id=$1`, [auditId],
  )).rows[0].count), 0);
  await batch.releaseDiscoveryGlobalLock(lock.token, pool);
});

test("failed fail-closed transitions create one idempotent durable incident", async () => {
  const auditId = await insertAudit();
  const payload = {
    operation: "FAIL_CLAIMED_GENERATION" as const,
    auditId,
    errorCode: "DISCOVERY_FAILURE_CAS_FAILED",
    errorDetail: "source CAS changed before quarantine",
  };
  const first = await batch.recordDiscoveryBatchIncident(payload, pool);
  const second = await batch.recordDiscoveryBatchIncident(payload, pool);
  assert.deepEqual(second, first);
  const incidents = await pool.query(
    `SELECT incident_key,operation,error_code,error_detail,state
       FROM discovery_batch_incidents WHERE audit_id=$1`,
    [auditId],
  );
  assert.equal(incidents.rowCount, 1);
  assert.deepEqual(incidents.rows[0], {
    incident_key: first.incidentKey,
    operation: "FAIL_CLAIMED_GENERATION",
    error_code: "DISCOVERY_FAILURE_CAS_FAILED",
    error_detail: "source CAS changed before quarantine",
    state: "OPEN",
  });
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

test("generic catalogue persistence binds the exact provider ledger and public artifact fail-closed", async () => {
  const responses = completeV2Responses();
  const auditId = await insertAudit("PENDING", responses);
  const claim = await transactional.claimDiscoveryGeneration(auditId, pool);
  assert.ok(claim);
  const responseId = `resp_${randomUUID()}`;
  await insertDiscoveryProviderProof(auditId, responseId, 0.15);
  const fixture = await buildValidPersistenceFixture(responses, responseId);
  const { txt, html } = fixture.assets;

  const persisted = await transactional.persistClaimedDiscoveryGeneration({
    claim,
    narrativeReport: fixture.narrativeReport,
    scores: fixture.scores,
    txt,
    html,
    expectedTxtSha256: transactional.discoveryTransactionalSha256(txt),
    expectedHtmlSha256: transactional.discoveryTransactionalSha256(html),
    model: "gpt-test",
    providerEvidence: buildDiscoveryProviderEvidence(responseId, 0.15),
  }, pool);
  const audit = (await pool.query(
    `SELECT responses,narrative_report,report_txt,report_html,report_delivery_status
       FROM audits WHERE id=$1`,
    [auditId],
  )).rows[0];
  const artifact = (await pool.query(
    `SELECT id,batch_id AS "batchId",model,txt,html,content_sha256 AS "contentSha256"
       FROM report_artifacts WHERE id=$1 AND audit_id=$2`,
    [persisted.artifactId, auditId],
  )).rows[0];
  const provenance = audit.narrative_report.analysisMetadata.catalogProvenance;

  assert.equal(await hasDiscoveryCatalogLedgerBinding(pool, auditId, artifact, provenance), true);
  const exposureSource = {
    type: "GRATUIT",
    reportDeliveryStatus: audit.report_delivery_status,
    narrativeReport: audit.narrative_report,
    reportTxt: audit.report_txt,
    reportHtml: audit.report_html,
    responses: audit.responses,
    reportArtifacts: [artifact],
    catalogLedgerBound: true,
  };
  const canonical = resolveCanonicalDiscoveryArtifacts(exposureSource);
  const diagnostics = {
    exactness: canonical.exactnessErrors,
    gate: evaluateCanonicalDiscoveryArtifacts(canonical).errors,
    persistedGate: hasPassingPersistedDiscoveryDeliveryGate(audit.narrative_report),
    responseBinding: validateDiscoveryReportAgainstResponses(
      canonical.report,
      audit.responses,
      canonical.report?.analysisMetadata,
    ).errors,
  };
  assert.equal(canExposeDiscoveryReport(exposureSource), true, JSON.stringify(diagnostics));

  const mutatedArtifact = { ...artifact, txt: `${artifact.txt}\nmutation` };
  assert.equal(await hasDiscoveryCatalogLedgerBinding(pool, auditId, mutatedArtifact, provenance), false);
  const mutatedProvenance = { ...provenance, selectionSha256: "0".repeat(64) };
  assert.equal(await hasDiscoveryCatalogLedgerBinding(pool, auditId, artifact, mutatedProvenance), false);
  assert.equal(canExposeDiscoveryReport({
    type: "GRATUIT",
    reportDeliveryStatus: audit.report_delivery_status,
    narrativeReport: audit.narrative_report,
    reportTxt: audit.report_txt,
    reportHtml: audit.report_html,
    responses: audit.responses,
    reportArtifacts: [artifact],
    catalogLedgerBound: false,
  }), false);
  await pool.query(
    `UPDATE report_artifacts
        SET artifact_state='SUPERSEDED',superseded_at=NOW()
      WHERE id=$1 AND audit_id=$2 AND artifact_state='ACTIVE'`,
    [persisted.artifactId, auditId],
  );
  assert.equal(
    await hasDiscoveryCatalogLedgerBinding(pool, auditId, artifact, provenance),
    false,
    "a superseded artifact must never satisfy the public ledger gate",
  );
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
      providerEvidence: buildDiscoveryProviderEvidence("unreachable-stale-fence"),
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
  const responses = completeV2Responses();
  const auditId = await insertAudit("PENDING", responses);
  const claim = await transactional.claimDiscoveryGeneration(auditId, pool);
  assert.ok(claim);
  const responseId = `resp_${randomUUID()}`;
  await insertDiscoveryProviderProof(auditId, responseId, 0.15);
  const fixture = await buildValidPersistenceFixture(responses, responseId);
  await pool.query("UPDATE report_jobs SET status = 'failed' WHERE audit_id = $1", [auditId]);
  const { txt, html } = fixture.assets;
  await assert.rejects(
    transactional.persistClaimedDiscoveryGeneration({
      claim,
      narrativeReport: fixture.narrativeReport,
      scores: fixture.scores,
      txt,
      html,
      expectedTxtSha256: transactional.discoveryTransactionalSha256(txt),
      expectedHtmlSha256: transactional.discoveryTransactionalSha256(html),
      model: "gpt-test",
      providerEvidence: buildDiscoveryProviderEvidence(responseId, 0.15),
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

test("exact duplicate resolution supersedes only the old audit and unlocks the canonical resubmission", async () => {
  const fixture = await insertExactDuplicateResolutionFixture();
  const storedPrecision = (await pool.query(
    `SELECT created_at,
            to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS created_at_utc_exact
       FROM audits WHERE id = $1`,
    [fixture.supersededId],
  )).rows[0];
  assert.equal(new Date(storedPrecision.created_at).toISOString(), "2026-08-13T14:45:03.692Z");
  assert.equal(storedPrecision.created_at_utc_exact, "2026-08-13T14:45:03.692385Z");
  const beforeCanonical = (await pool.query(
    `SELECT responses, narrative_report FROM audits WHERE id = $1`, [fixture.canonicalId],
  )).rows[0];
  const duplicateBefore = await pool.query(
    `SELECT EXISTS (
       SELECT 1 FROM audits other
        WHERE other.type = 'GRATUIT' AND other.id <> $1
          AND LOWER(other.email) = LOWER($2)
          AND ABS(EXTRACT(EPOCH FROM (other.created_at - $3::timestamptz))) <= 14 * 86400
          AND ${DISCOVERY_OTHER_AUDIT_ACTIVE_SQL}
     ) AS duplicate_candidate`,
    [fixture.canonicalId, fixture.email, fixture.target.canonical.createdAt],
  );
  assert.equal(duplicateBefore.rows[0].duplicate_candidate, true);
  const lock = await batch.acquireDiscoveryGlobalLock({
    owner: "postgres-integration",
    purpose: "exact-duplicate-resolution",
    ttlMinutes: 5,
  }, pool);
  const result = await batch.resolveExactDiscoveryDuplicateUnderLock({
    lockToken: lock.token,
    target: fixture.target,
  }, pool);
  assert.equal(await batch.releaseDiscoveryGlobalLock(lock.token, pool), true);
  assert.deepEqual(result, {
    supersededAuditId: fixture.supersededId,
    canonicalAuditId: fixture.canonicalId,
    status: "SUPERSEDED",
    emailsSent: 0,
  });

  const audits = await pool.query(
    `SELECT id, report_delivery_status, report_sent_at, responses, narrative_report
       FROM audits WHERE id = ANY($1::text[]) ORDER BY id`,
    [[fixture.supersededId, fixture.canonicalId]],
  );
  const byId = new Map(audits.rows.map((row) => [row.id, row]));
  const oldAudit = byId.get(fixture.supersededId);
  const canonicalAudit = byId.get(fixture.canonicalId);
  assert.equal(oldAudit.report_delivery_status, "SUPERSEDED");
  assert.equal(oldAudit.report_sent_at, null);
  assert.equal(oldAudit.narrative_report.recovery.disposition, "superseded");
  assert.equal(oldAudit.narrative_report.recovery.replacementAuditId, fixture.canonicalId);
  assert.equal(canonicalAudit.report_delivery_status, "NEEDS_REVIEW");
  assert.equal(canonicalAudit.report_sent_at, null);
  assert.deepEqual(canonicalAudit.responses, beforeCanonical.responses);
  assert.deepEqual(canonicalAudit.narrative_report, beforeCanonical.narrative_report);

  const duplicate = await pool.query(
    `SELECT EXISTS (
       SELECT 1 FROM audits other
        WHERE other.type = 'GRATUIT' AND other.id <> $1
          AND LOWER(other.email) = LOWER($2)
          AND ABS(EXTRACT(EPOCH FROM (other.created_at - $3::timestamptz))) <= 14 * 86400
          AND ${DISCOVERY_OTHER_AUDIT_ACTIVE_SQL}
     ) AS duplicate_candidate`,
    [fixture.canonicalId, fixture.email, fixture.target.canonical.createdAt],
  );
  assert.equal(duplicate.rows[0].duplicate_candidate, false);
  assert.deepEqual(batch.classifyDiscoveryManifestCandidate({
    id: fixture.canonicalId,
    email: fixture.email,
    type: "GRATUIT",
    reportDeliveryStatus: "NEEDS_REVIEW",
    reportSentAt: null,
    superseded: false,
    duplicateCandidate: duplicate.rows[0].duplicate_candidate,
    unsubscribed: false,
    deliveryGateOk: false,
    deliveryGateErrors: ["missing_artifact"],
    tracking: { total: 0, accepted: 0, failed: 0, pending: 0, hardFailed: 0 },
    deliveryClaimState: null,
    providerAttemptCount: 0,
  }), {
    cohort: "invalid",
    reasons: ["delivery_gate:missing_artifact"],
  });

  // Durable provenance remains terminal even if a later direct SQL mistake
  // corrupts the presentation status. Generic workers cannot perform this
  // update, but the duplicate classifier must still fail closed.
  await pool.query(
    `UPDATE audits SET report_delivery_status = 'NEEDS_REVIEW' WHERE id = $1`,
    [fixture.supersededId],
  );
  const duplicateWithCorruptedStatus = await pool.query(
    `SELECT EXISTS (
       SELECT 1 FROM audits other
        WHERE other.type = 'GRATUIT' AND other.id <> $1
          AND LOWER(other.email) = LOWER($2)
          AND ABS(EXTRACT(EPOCH FROM (other.created_at - $3::timestamptz))) <= 14 * 86400
          AND ${DISCOVERY_OTHER_AUDIT_ACTIVE_SQL}
     ) AS duplicate_candidate`,
    [fixture.canonicalId, fixture.email, fixture.target.canonical.createdAt],
  );
  assert.equal(duplicateWithCorruptedStatus.rows[0].duplicate_candidate, false);
  assert.equal(Number((await pool.query(
    `SELECT COUNT(*) FROM report_artifacts WHERE audit_id = ANY($1::text[])`,
    [[fixture.supersededId, fixture.canonicalId]],
  )).rows[0].count), 0);
  assert.equal(Number((await pool.query(
    `SELECT COUNT(*) FROM discovery_batch_items WHERE audit_id = ANY($1::text[])`,
    [[fixture.supersededId, fixture.canonicalId]],
  )).rows[0].count), 0);
  assert.equal(Number((await pool.query(
    `SELECT COUNT(*) FROM discovery_email_delivery_claims WHERE audit_id = ANY($1::text[])`,
    [[fixture.supersededId, fixture.canonicalId]],
  )).rows[0].count), 0);
  assert.deepEqual((await pool.query(
    `SELECT audit_id, email_type FROM email_tracking
      WHERE audit_id = ANY($1::text[]) ORDER BY audit_id`,
    [[fixture.supersededId, fixture.canonicalId]],
  )).rows.map((row) => row.email_type), ["sendAdminEmailNewAudit", "sendAdminEmailNewAudit"]);
});

test("exact duplicate resolution rolls back both audits on any bound response divergence", async () => {
  const fixture = await insertExactDuplicateResolutionFixture();
  const before = await pool.query(
    `SELECT id, report_delivery_status, narrative_report, responses
       FROM audits WHERE id = ANY($1::text[]) ORDER BY id`,
    [[fixture.supersededId, fixture.canonicalId]],
  );
  await pool.query(
    `UPDATE audits SET responses = responses || '{"late_change":true}'::jsonb WHERE id = $1`,
    [fixture.canonicalId],
  );
  const diverged = await pool.query(
    `SELECT id, report_delivery_status, narrative_report, responses
       FROM audits WHERE id = ANY($1::text[]) ORDER BY id`,
    [[fixture.supersededId, fixture.canonicalId]],
  );
  const lock = await batch.acquireDiscoveryGlobalLock({
    owner: "postgres-integration",
    purpose: "exact-duplicate-resolution-rollback",
    ttlMinutes: 5,
  }, pool);
  await assert.rejects(
    batch.resolveExactDiscoveryDuplicateUnderLock({ lockToken: lock.token, target: fixture.target }, pool),
    /DISCOVERY_DUPLICATE_RESOLUTION_TARGET_PRECONDITION_FAILED/,
  );
  assert.equal(await batch.releaseDiscoveryGlobalLock(lock.token, pool), true);
  const after = await pool.query(
    `SELECT id, report_delivery_status, narrative_report, responses
       FROM audits WHERE id = ANY($1::text[]) ORDER BY id`,
    [[fixture.supersededId, fixture.canonicalId]],
  );
  assert.notDeepEqual(diverged.rows, before.rows);
  assert.deepEqual(after.rows, diverged.rows);
  assert.equal(after.rows.every((row) => row.report_delivery_status === "NEEDS_REVIEW"), true);
});

test("exact duplicate resolution rejects a one-microsecond created_at divergence atomically", async () => {
  const fixture = await insertExactDuplicateResolutionFixture();
  const before = await pool.query(
    `SELECT id, report_delivery_status, narrative_report, responses,
            to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS created_at_utc_exact
       FROM audits WHERE id = ANY($1::text[]) ORDER BY id`,
    [[fixture.supersededId, fixture.canonicalId]],
  );
  const lock = await batch.acquireDiscoveryGlobalLock({
    owner: "postgres-integration",
    purpose: "exact-duplicate-created-at-rollback",
    ttlMinutes: 5,
  }, pool);
  await assert.rejects(
    batch.resolveExactDiscoveryDuplicateUnderLock({
      lockToken: lock.token,
      target: {
        ...fixture.target,
        superseded: {
          ...fixture.target.superseded,
          createdAt: "2026-08-13T14:45:03.692386Z",
        },
      },
    }, pool),
    /DISCOVERY_DUPLICATE_RESOLUTION_TARGET_PRECONDITION_FAILED/,
  );
  assert.equal(await batch.releaseDiscoveryGlobalLock(lock.token, pool), true);
  const after = await pool.query(
    `SELECT id, report_delivery_status, narrative_report, responses,
            to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS created_at_utc_exact
       FROM audits WHERE id = ANY($1::text[]) ORDER BY id`,
    [[fixture.supersededId, fixture.canonicalId]],
  );
  assert.deepEqual(after.rows, before.rows);
  assert.equal(after.rows.every((row) => row.report_delivery_status === "NEEDS_REVIEW"), true);
});

test("exact duplicate resolution rejects a one-microsecond canonical created_at divergence atomically", async () => {
  const fixture = await insertExactDuplicateResolutionFixture();
  const before = await pool.query(
    `SELECT id, report_delivery_status, narrative_report, responses,
            to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS created_at_utc_exact
       FROM audits WHERE id = ANY($1::text[]) ORDER BY id`,
    [[fixture.supersededId, fixture.canonicalId]],
  );
  const lock = await batch.acquireDiscoveryGlobalLock({
    owner: "postgres-integration",
    purpose: "exact-duplicate-canonical-created-at-rollback",
    ttlMinutes: 5,
  }, pool);
  await assert.rejects(
    batch.resolveExactDiscoveryDuplicateUnderLock({
      lockToken: lock.token,
      target: {
        ...fixture.target,
        canonical: {
          ...fixture.target.canonical,
          createdAt: "2026-08-14T09:17:12.089687Z",
        },
      },
    }, pool),
    /DISCOVERY_DUPLICATE_RESOLUTION_TARGET_PRECONDITION_FAILED/,
  );
  assert.equal(await batch.releaseDiscoveryGlobalLock(lock.token, pool), true);
  const after = await pool.query(
    `SELECT id, report_delivery_status, narrative_report, responses,
            to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS created_at_utc_exact
       FROM audits WHERE id = ANY($1::text[]) ORDER BY id`,
    [[fixture.supersededId, fixture.canonicalId]],
  );
  assert.deepEqual(after.rows, before.rows);
  assert.equal(after.rows.every((row) => row.report_delivery_status === "NEEDS_REVIEW"), true);
});

test("exact Discovery text repair atomically replaces JSON, TXT, HTML, artifact and gate", async () => {
  const fixture = await insertExactRepairFixture();
  const sourceArtifact = (await pool.query(
    `SELECT id, txt, html, content_sha256 FROM report_artifacts
      WHERE audit_id = $1 AND artifact_state = 'ACTIVE'`,
    [fixture.id],
  )).rows[0];
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
  assert.equal(JSON.stringify(audit.narrative_report).includes(LENNY_NUTRITION_OLD_TEXT), false);
  assert.equal(
    JSON.stringify(audit.narrative_report).split(LENNY_NUTRITION_NEW_TEXT).length - 1,
    1,
  );
  assert.equal(audit.report_txt.includes(LENNY_NUTRITION_OLD_TEXT), false);
  assert.equal(audit.report_txt.split(LENNY_NUTRITION_NEW_TEXT).length - 1, 1);
  assert.equal(audit.report_html.includes(LENNY_NUTRITION_OLD_TEXT), false);
  assert.equal(audit.report_html.split(LENNY_NUTRITION_NEW_TEXT).length - 1, 1);
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
    `SELECT id, txt, html, content_sha256, artifact_state, superseded_at,
            supersedes_artifact_id
       FROM report_artifacts WHERE audit_id = $1 ORDER BY created_at, id`,
    [fixture.id],
  );
  assert.equal(artifacts.rowCount, 2);
  const activeArtifact = artifacts.rows.find((row) => row.artifact_state === "ACTIVE");
  const supersededArtifact = artifacts.rows.find((row) => row.artifact_state === "SUPERSEDED");
  assert.equal(result.artifactId, activeArtifact.id);
  assert.notEqual(result.artifactId, sourceArtifact.id);
  assert.equal(activeArtifact.supersedes_artifact_id, sourceArtifact.id);
  assert.equal(supersededArtifact.id, sourceArtifact.id);
  assert.ok(supersededArtifact.superseded_at);
  assert.equal(supersededArtifact.txt, sourceArtifact.txt);
  assert.equal(supersededArtifact.html, sourceArtifact.html);
  assert.equal(supersededArtifact.content_sha256, sourceArtifact.content_sha256);
  assert.equal(activeArtifact.txt, audit.report_txt);
  assert.equal(activeArtifact.html, audit.report_html);
  assert.equal(activeArtifact.txt.includes("DISCOVERY20"), false);
  assert.equal(activeArtifact.html.includes("DISCOVERY20"), false);
  assert.equal(activeArtifact.txt.includes(LENNY_NUTRITION_OLD_TEXT), false);
  assert.equal(activeArtifact.txt.split(LENNY_NUTRITION_NEW_TEXT).length - 1, 1);
  assert.equal(activeArtifact.html.includes(LENNY_NUTRITION_OLD_TEXT), false);
  assert.equal(activeArtifact.html.split(LENNY_NUTRITION_NEW_TEXT).length - 1, 1);
  assert.equal(
    activeArtifact.content_sha256,
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

test("exact Lenny wake-summary repair atomically updates JSON, TXT, HTML and artifact", async () => {
  const fixture = await insertExactWakeSummaryRepairFixture();
  await pool.query(
    `INSERT INTO email_tracking
      (id, email_type, recipient_email, audit_id, audit_type, sendpulse_status, sent_at)
     VALUES ($1, 'sendAdminEmailNewAudit', $2, $3, 'GRATUIT', 'success', NOW())`,
    [randomUUID(), fixture.email, fixture.id],
  );
  const lock = await batch.acquireDiscoveryGlobalLock({
    owner: "postgres-integration",
    purpose: "exact-lenny-wake-summary-repair",
    ttlMinutes: 5,
  }, pool);
  const result = await batch.repairExactDiscoveryWakeSummaryUnderLock({
    lockToken: lock.token,
    target: fixture.target,
  }, pool);
  assert.equal(await batch.releaseDiscoveryGlobalLock(lock.token, pool), true);
  assert.equal(result.status, "BATCH_READY");
  assert.notEqual(result.artifactId, fixture.artifactId);
  assert.equal(result.emailsSent, 0);

  const audit = (await pool.query(
    `SELECT responses, report_delivery_status, report_sent_at,
            narrative_report, report_txt, report_html
       FROM audits WHERE id = $1`,
    [fixture.id],
  )).rows[0];
  assert.equal(audit.report_delivery_status, "BATCH_READY");
  assert.equal(audit.report_sent_at, null);
  assert.equal(audit.responses["reveil-fatigue"], "parfois");
  assert.equal(audit.responses["energie-matin"], "moyenne");
  assert.equal(audit.narrative_report.sections[1].id, "global");
  const artifactVersions = (await pool.query(
    `SELECT id, txt, html, content_sha256, artifact_state, superseded_at,
            supersedes_artifact_id
       FROM report_artifacts WHERE audit_id = $1 ORDER BY created_at, id`,
    [fixture.id],
  )).rows;
  assert.equal(artifactVersions.length, 2);
  const artifact = artifactVersions.find((row) => row.artifact_state === "ACTIVE");
  const previousArtifact = artifactVersions.find((row) => row.artifact_state === "SUPERSEDED");
  const representations = [
    JSON.stringify(audit.narrative_report),
    audit.report_txt,
    audit.report_html,
    artifact.txt,
    artifact.html,
  ];
  for (const value of representations) {
    assert.equal(value.split(LENNY_WAKE_SUMMARY_OLD_TEXT).length - 1, 0);
    assert.equal(value.split(LENNY_WAKE_SUMMARY_NEW_TEXT).length - 1, 1);
    assert.equal(value.split(LENNY_NEW_TEXT).length - 1, 1);
    assert.equal(value.split(LENNY_NUTRITION_NEW_TEXT).length - 1, 1);
    assert.equal(value.includes("DISCOVERY20"), false);
  }
  assert.equal(artifact.id, result.artifactId);
  assert.equal(artifact.supersedes_artifact_id, fixture.artifactId);
  assert.equal(previousArtifact.id, fixture.artifactId);
  assert.ok(previousArtifact.superseded_at);
  assert.equal(previousArtifact.txt, fixture.assets.txt);
  assert.equal(previousArtifact.html, fixture.assets.html);
  assert.equal(artifact.txt, audit.report_txt);
  assert.equal(artifact.html, audit.report_html);
  assert.equal(
    artifact.content_sha256,
    batch.discoveryArtifactContentHash(audit.report_txt, audit.report_html),
  );
  assert.equal(audit.narrative_report.validationResult.deliveryGate.ok, true);
  assert.deepEqual(audit.narrative_report.validationResult.deliveryGate.errors, []);
  assert.deepEqual(
    (await pool.query(
      `SELECT email_type FROM email_tracking WHERE audit_id = $1 ORDER BY email_type`,
      [fixture.id],
    )).rows,
    [{ email_type: "sendAdminEmailNewAudit" }],
  );
});

test("exact Lenny wake-summary repair rolls back on JSON path or occurrence divergence", async () => {
  for (const mode of ["wrong-path", "duplicate"] as const) {
    const fixture = await insertExactWakeSummaryRepairFixture(mode);
    const before = (await pool.query(
      `SELECT narrative_report, report_txt, report_html FROM audits WHERE id = $1`,
      [fixture.id],
    )).rows[0];
    const lock = await batch.acquireDiscoveryGlobalLock({
      owner: "postgres-integration",
      purpose: `exact-lenny-wake-summary-${mode}`,
      ttlMinutes: 5,
    }, pool);
    await assert.rejects(
      batch.repairExactDiscoveryWakeSummaryUnderLock({
        lockToken: lock.token,
        target: fixture.target,
      }, pool),
      /DISCOVERY_WAKE_SUMMARY_REPAIR_EXACT_PATH_OR_OCCURRENCE_MISMATCH/,
    );
    assert.equal(await batch.releaseDiscoveryGlobalLock(lock.token, pool), true);
    const after = (await pool.query(
      `SELECT narrative_report, report_txt, report_html FROM audits WHERE id = $1`,
      [fixture.id],
    )).rows[0];
    assert.deepEqual(after, before);
    const artifact = (await pool.query(
      `SELECT txt, html FROM report_artifacts WHERE audit_id = $1`,
      [fixture.id],
    )).rows[0];
    assert.equal(artifact.txt, before.report_txt);
    assert.equal(artifact.html, before.report_html);
  }
});

test("exact Lenny wake-summary repair rolls back on artifact or response hash divergence", async () => {
  for (const divergence of ["artifact", "responses"] as const) {
    const fixture = await insertExactWakeSummaryRepairFixture(
      divergence === "artifact" ? "artifact-hash-divergent" : "valid",
    );
    if (divergence === "responses") {
      await pool.query(
        `UPDATE audits SET responses = jsonb_set(responses, '{reveil-fatigue}', '"souvent"'::jsonb)
          WHERE id = $1`,
        [fixture.id],
      );
    }
    const before = (await pool.query(
      `SELECT narrative_report, report_txt, report_html FROM audits WHERE id = $1`,
      [fixture.id],
    )).rows[0];
    const lock = await batch.acquireDiscoveryGlobalLock({
      owner: "postgres-integration",
      purpose: `exact-lenny-wake-summary-${divergence}`,
      ttlMinutes: 5,
    }, pool);
    await assert.rejects(
      batch.repairExactDiscoveryWakeSummaryUnderLock({
        lockToken: lock.token,
        target: fixture.target,
      }, pool),
      divergence === "artifact"
        ? /DISCOVERY_WAKE_SUMMARY_REPAIR_ARTIFACT_HASH_MISMATCH/
        : /DISCOVERY_WAKE_SUMMARY_REPAIR_AUDIT_HASH_MISMATCH/,
    );
    assert.equal(await batch.releaseDiscoveryGlobalLock(lock.token, pool), true);
    const after = (await pool.query(
      `SELECT narrative_report, report_txt, report_html FROM audits WHERE id = $1`,
      [fixture.id],
    )).rows[0];
    assert.deepEqual(after, before);
  }
});

test("exact Lenny wake-summary repair rolls back on client delivery evidence", async () => {
  const fixture = await insertExactWakeSummaryRepairFixture();
  await pool.query(
    `INSERT INTO email_tracking
      (id,email_type,recipient_email,audit_id,audit_type,sendpulse_status,sent_at)
     VALUES ($1,'sendReportReadyEmail',$2,$3,'GRATUIT','success',NOW())`,
    [randomUUID(), fixture.email, fixture.id],
  );
  const lock = await batch.acquireDiscoveryGlobalLock({
    owner: "postgres-integration",
    purpose: "exact-lenny-wake-summary-delivery-evidence",
    ttlMinutes: 5,
  }, pool);
  await assert.rejects(
    batch.repairExactDiscoveryWakeSummaryUnderLock({
      lockToken: lock.token,
      target: fixture.target,
    }, pool),
    /DISCOVERY_TEXT_REPAIR_PRIOR_DELIVERY_TRACKING_OR_CLAIM/,
  );
  assert.equal(await batch.releaseDiscoveryGlobalLock(lock.token, pool), true);
  const audit = (await pool.query(
    `SELECT report_txt, report_html FROM audits WHERE id = $1`,
    [fixture.id],
  )).rows[0];
  assert.equal(audit.report_txt, fixture.assets.txt);
  assert.equal(audit.report_html, fixture.assets.html);
});

test("exact Alexandre critical-copy repair atomically updates both JSON paths and every artifact", async () => {
  const fixture = await insertExactAlexandreCriticalCopyFixture();
  const lock = await batch.acquireDiscoveryGlobalLock({
    owner: "postgres-integration",
    purpose: "exact-alexandre-critical-copy-repair",
    ttlMinutes: 5,
  }, pool);
  const result = await batch.repairExactDiscoveryWakeSummaryUnderLock({
    lockToken: lock.token,
    target: fixture.target,
  }, pool);
  assert.equal(await batch.releaseDiscoveryGlobalLock(lock.token, pool), true);
  assert.equal(result.status, "BATCH_READY");
  assert.notEqual(result.artifactId, fixture.artifactId);
  assert.equal(result.emailsSent, 0);

  const audit = (await pool.query(
    `SELECT report_delivery_status, report_sent_at, narrative_report, report_txt, report_html
       FROM audits WHERE id = $1`,
    [fixture.id],
  )).rows[0];
  const artifactVersions = (await pool.query(
    `SELECT id, txt, html, content_sha256, artifact_state, superseded_at,
            supersedes_artifact_id
       FROM report_artifacts WHERE audit_id = $1 ORDER BY created_at, id`,
    [fixture.id],
  )).rows;
  assert.equal(artifactVersions.length, 2);
  const artifact = artifactVersions.find((row) => row.artifact_state === "ACTIVE");
  const previousArtifact = artifactVersions.find((row) => row.artifact_state === "SUPERSEDED");
  const narrative = JSON.stringify(audit.narrative_report);
  assert.equal(audit.report_delivery_status, "BATCH_READY");
  assert.equal(audit.report_sent_at, null);
  assert.equal(narrative.split(ALEXANDRE_CRITICAL_OLD_TEXT).length - 1, 0);
  assert.equal(narrative.split(ALEXANDRE_CRITICAL_NEW_TEXT).length - 1, 3);
  assert.equal(
    audit.narrative_report.sections[10].content.split(ALEXANDRE_CRITICAL_NEW_TEXT).length - 1,
    1,
  );
  assert.equal(
    audit.narrative_report.analysisMetadata.ctaMessage,
    ALEXANDRE_CRITICAL_NEW_TEXT,
  );
  for (const value of [audit.report_txt, audit.report_html, artifact.txt, artifact.html]) {
    assert.equal(value.split(ALEXANDRE_CRITICAL_OLD_TEXT).length - 1, 0);
    assert.equal(value.split(ALEXANDRE_CRITICAL_NEW_TEXT).length - 1, 2);
  }
  assert.equal(artifact.id, result.artifactId);
  assert.equal(artifact.supersedes_artifact_id, fixture.artifactId);
  assert.equal(previousArtifact.id, fixture.artifactId);
  assert.ok(previousArtifact.superseded_at);
  assert.equal(previousArtifact.txt, fixture.assets.txt);
  assert.equal(previousArtifact.html, fixture.assets.html);
  assert.equal(artifact.txt, audit.report_txt);
  assert.equal(artifact.html, audit.report_html);
  assert.equal(
    artifact.content_sha256,
    batch.discoveryArtifactContentHash(audit.report_txt, audit.report_html),
  );
  assert.equal(audit.narrative_report.validationResult.deliveryGate.ok, true);
  assert.deepEqual(audit.narrative_report.validationResult.deliveryGate.errors, []);
  assert.equal(Number((await pool.query(
    `SELECT COUNT(*) FROM email_tracking WHERE audit_id = $1`, [fixture.id],
  )).rows[0].count), 0);
  assert.equal(Number((await pool.query(
    `SELECT COUNT(*) FROM discovery_email_delivery_claims WHERE audit_id = $1`, [fixture.id],
  )).rows[0].count), 0);
});

test("exact Alexandre critical-copy repair rolls back on either bound path divergence", async () => {
  for (const mode of [
    "duplicate-visible",
    "wrong-metadata-path",
    "duplicate-preexisting-new",
  ] as const) {
    const fixture = await insertExactAlexandreCriticalCopyFixture(mode);
    const beforeAudit = (await pool.query(
      `SELECT narrative_report, report_txt, report_html FROM audits WHERE id = $1`,
      [fixture.id],
    )).rows[0];
    const beforeArtifact = (await pool.query(
      `SELECT txt, html, content_sha256 FROM report_artifacts WHERE audit_id = $1`,
      [fixture.id],
    )).rows[0];
    const lock = await batch.acquireDiscoveryGlobalLock({
      owner: "postgres-integration",
      purpose: `exact-alexandre-critical-copy-${mode}`,
      ttlMinutes: 5,
    }, pool);
    await assert.rejects(
      batch.repairExactDiscoveryWakeSummaryUnderLock({
        lockToken: lock.token,
        target: fixture.target,
      }, pool),
      /DISCOVERY_WAKE_SUMMARY_REPAIR_EXACT_PATH_OR_OCCURRENCE_MISMATCH/,
    );
    assert.equal(await batch.releaseDiscoveryGlobalLock(lock.token, pool), true);
    const afterAudit = (await pool.query(
      `SELECT narrative_report, report_txt, report_html FROM audits WHERE id = $1`,
      [fixture.id],
    )).rows[0];
    const afterArtifact = (await pool.query(
      `SELECT txt, html, content_sha256 FROM report_artifacts WHERE audit_id = $1`,
      [fixture.id],
    )).rows[0];
    assert.deepEqual(afterAudit, beforeAudit);
    assert.deepEqual(afterArtifact, beforeArtifact);
  }
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

test("exact Discovery text repair rolls back on legacy nutrition path or occurrence divergence", async () => {
  for (const mode of ["wrong-path", "duplicate"] as const) {
    const fixture = await insertExactRepairFixture(false, mode);
    const before = (await pool.query(
      `SELECT narrative_report, report_txt, report_html FROM audits WHERE id = $1`,
      [fixture.id],
    )).rows[0];
    const lock = await batch.acquireDiscoveryGlobalLock({
      owner: "postgres-integration",
      purpose: `exact-nutrition-${mode}-divergence`,
      ttlMinutes: 5,
    }, pool);
    await assert.rejects(
      batch.repairExactDiscoveryTextUnderLock({ lockToken: lock.token, target: fixture.target }, pool),
      /DISCOVERY_TEXT_REPAIR_LEGACY_NUTRITION_DIVERGENCE/,
    );
    assert.equal(await batch.releaseDiscoveryGlobalLock(lock.token, pool), true);
    const audit = (await pool.query(
      `SELECT narrative_report, report_txt, report_html FROM audits WHERE id = $1`,
      [fixture.id],
    )).rows[0];
    assert.deepEqual(audit.narrative_report, before.narrative_report);
    assert.equal(audit.report_txt, before.report_txt);
    assert.equal(audit.report_html, before.report_html);
    const artifact = (await pool.query(
      `SELECT txt, html FROM report_artifacts WHERE audit_id = $1`,
      [fixture.id],
    )).rows[0];
    assert.equal(artifact.txt, before.report_txt);
    assert.equal(artifact.html, before.report_html);
  }
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
