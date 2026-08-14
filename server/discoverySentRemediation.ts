import { createHash, randomUUID } from "node:crypto";

import { pool } from "./db";
import {
  buildDiscoveryReportAssets,
  repairDiscoveryProvidedFactAbsenceClaims,
  validateDiscoveryReportForDelivery,
} from "./discovery-scan";
import {
  attachDiscoveryDeliveryGateResult,
  evaluateCanonicalDiscoveryArtifacts,
  evaluateDiscoveryDeliveryGate,
  resolveCanonicalDiscoveryArtifacts,
} from "./discoveryDeliveryGate";
import { isDiscoveryGlobalLockActive } from "./discoveryBatchControl";
import { isDiscoverySupersededTerminal } from "./discoverySupersededPolicy";
import { DISCOVERY_TRANSACTION_FENCE_KEY } from "./discoveryTransactionalPersistence";

export const REPORT_REGENERATED_EMAIL_TYPE = "sendReportRegeneratedEmail";

export function isSentDiscoveryRemediationEnabled(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return String(env.DISCOVERY_SENT_REMEDIATION_ENABLED || "").toLowerCase() === "true";
}

export function isRegeneratedNotificationEnabled(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return String(env.DISCOVERY_REGENERATED_NOTIFICATION_ENABLED || "").toLowerCase() === "true";
}

export function discoveryArtifactHash(txt: unknown, html: unknown): string {
  return createHash("sha256")
    .update(String(txt || ""), "utf8")
    .update("\0", "utf8")
    .update(String(html || ""), "utf8")
    .digest("hex");
}

function assertSha256(value: string, label: string): void {
  if (!/^[0-9a-f]{64}$/i.test(value)) throw new Error(`${label} must be a SHA-256 hex digest`);
}

export function validateSentFallbackCandidate(input: {
  type: string;
  status: string;
  reportSentAt: unknown;
  currentHash: string;
  expectedPreviousFallbackHash: string;
  currentPremium: boolean;
  supersededTerminal?: boolean;
}): string[] {
  const errors: string[] = [];
  if (input.type !== "GRATUIT") errors.push("not_discovery");
  if (input.supersededTerminal) errors.push("superseded_terminal");
  if (input.status !== "SENT" || !input.reportSentAt) errors.push("not_delivered_sent");
  if (input.currentHash !== input.expectedPreviousFallbackHash.toLowerCase()) errors.push("fallback_hash_mismatch");
  if (input.currentPremium) errors.push("already_premium");
  return errors;
}

export function validateRegeneratedNotificationCandidate(input: {
  status: string;
  reportSentAt: unknown;
  expectedPreviousFallbackHash: string;
  provenancePreviousFallbackHash: unknown;
  currentPremium: boolean;
  currentPremiumHash: string;
  provenancePremiumHash: unknown;
  alreadyClaimed: boolean;
  supersededTerminal?: boolean;
}): string[] {
  const errors: string[] = [];
  if (input.status !== "SENT" || !input.reportSentAt) errors.push("not_delivered_sent");
  if (input.supersededTerminal) errors.push("superseded_terminal");
  if (input.provenancePreviousFallbackHash !== input.expectedPreviousFallbackHash.toLowerCase()) errors.push("fallback_provenance_mismatch");
  if (!input.currentPremium) errors.push("not_premium");
  if (input.provenancePremiumHash !== input.currentPremiumHash) errors.push("premium_hash_mismatch");
  if (input.alreadyClaimed) errors.push("already_claimed");
  return errors;
}

export interface SentDiscoveryRemediationResult {
  auditId: string;
  previousFallbackHash: string;
  premiumHash: string;
  reportDeliveryStatus: string;
  reportSentAt: Date;
}

function canonicalDiscoveryScores(report: any): Record<string, number> {
  const scores: Record<string, number> = Object.fromEntries(
    (Array.isArray(report?.metrics) ? report.metrics : [])
      .filter((metric: any) => metric?.key && Number.isFinite(metric?.value))
      .map((metric: any) => [String(metric.key), Math.round(Number(metric.value) * 10)]),
  );
  scores.global = Math.round(Number(report?.globalScore) * 10);
  if (Object.keys(scores).length !== 9 || !Object.values(scores).every(Number.isFinite)) {
    throw new Error("Canonical Discovery scores are incomplete");
  }
  return scores;
}

/** Generate a premium replacement and atomically swap only the report fields.
 * SENT, report_sent_at and email_tracking are never modified. */
export async function regenerateSentDiscoveryInPlace(input: {
  auditId: string;
  expectedPreviousFallbackHash: string;
}): Promise<SentDiscoveryRemediationResult> {
  void input;
  // Provider-based SENT replacement is intentionally closed until it can use
  // the same durable one-call ownership contract as normal generation. The
  // deterministic exact-hash repair below remains available and provider-free.
  throw new Error("DISCOVERY_SENT_REMEDIATION_PROVIDER_DISABLED");
}

/** Repairs only known questionnaire restatement defects in an already premium
 * SENT report. No provider or delivery function is reachable from this path. */
export async function repairSentDiscoveryFactsInPlace(input: {
  auditId: string;
  expectedCurrentHash: string;
}): Promise<SentDiscoveryRemediationResult & { replacements: number }> {
  if (await isDiscoveryGlobalLockActive()) throw new Error("Discovery batch lock active; factual repair is blocked");
  assertSha256(input.expectedCurrentHash, "expectedCurrentHash");
  if (String(process.env.REMEDIATION_SIDE_EFFECTS_DISABLED || "").toLowerCase() !== "true") {
    throw new Error("REMEDIATION_SIDE_EFFECTS_DISABLED=true is mandatory");
  }
  if (String(process.env.DISCOVERY_REPORT_DELIVERY_ENABLED || "").toLowerCase() === "true") {
    throw new Error("DISCOVERY_REPORT_DELIVERY_ENABLED must not be true");
  }

  const initial = await pool.query(
    `SELECT id, type, responses, scores, report_delivery_status, report_sent_at,
            narrative_report, report_txt, report_html
       FROM audits WHERE id = $1`,
    [input.auditId],
  );
  const row = initial.rows[0];
  if (!row || row.type !== "GRATUIT" || row.report_delivery_status !== "SENT" || !row.report_sent_at) {
    throw new Error("Expected delivered Discovery audit not found");
  }
  if (isDiscoverySupersededTerminal({
    type: row.type,
    reportDeliveryStatus: row.report_delivery_status,
    narrativeReport: row.narrative_report,
  })) throw new Error("Superseded Discovery is terminal");
  const initialHash = discoveryArtifactHash(row.report_txt, row.report_html);
  if (initialHash !== input.expectedCurrentHash.toLowerCase()) throw new Error("Current report hash mismatch");
  const currentGate = evaluateCanonicalDiscoveryArtifacts(resolveCanonicalDiscoveryArtifacts({
    narrativeReport: row.narrative_report,
    reportTxt: row.report_txt,
    reportHtml: row.report_html,
  }));
  if (!currentGate.ok) throw new Error(`Current report is not premium: ${currentGate.errors.join(",")}`);

  const report = structuredClone(row.narrative_report);
  let replacements = 0;
  for (const section of Array.isArray(report?.sections) ? report.sections : []) {
    if (typeof section?.content !== "string") continue;
    const repaired = repairDiscoveryProvidedFactAbsenceClaims(section.content, row.responses || {});
    if (repaired !== section.content) {
      section.content = repaired;
      replacements += 1;
    }
  }
  if (replacements === 0) throw new Error("No known factual defect found");

  const assets = buildDiscoveryReportAssets(report);
  const nonRenderedMetadata = {
    blocages: report?.analysisMetadata?.blocages || [],
    ctaMessage: report?.analysisMetadata?.ctaMessage || "",
  };
  const validation = validateDiscoveryReportForDelivery(report, assets, nonRenderedMetadata);
  const gate = evaluateDiscoveryDeliveryGate(report, assets, undefined, nonRenderedMetadata);
  if (!validation.ok || !gate.ok) {
    throw new Error(`Repaired Discovery gate failed: ${[...validation.errors, ...gate.errors].join(",")}`);
  }
  const repairedAt = new Date();
  const premiumHash = discoveryArtifactHash(assets.txt, assets.html);
  const contentSha256 = createHash("sha256")
    .update(`txt\0${assets.txt}\0html\0${assets.html}`)
    .digest("hex");
  if (premiumHash === initialHash) throw new Error("Factual repair did not change canonical artifacts");
  const narrativeReport = attachDiscoveryDeliveryGateResult({
    ...report,
    remediation: {
      ...(report.remediation || {}),
      factualRepairAt: repairedAt.toISOString(),
      preFactualRepairHash: initialHash,
      premiumHash,
    },
  }, gate);
  const canonicalScores = canonicalDiscoveryScores(report);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [DISCOVERY_TRANSACTION_FENCE_KEY]);
    const activeLock = await client.query(
      `SELECT 1 FROM discovery_operation_lock
        WHERE lock_key = 'discovery-global' AND expires_at > NOW()
        LIMIT 1`,
    );
    if ((activeLock.rowCount ?? 0) !== 0) throw new Error("Discovery batch lock active; factual repair is blocked");
    const locked = await client.query(
      `SELECT type, report_delivery_status, report_sent_at, narrative_report, report_txt, report_html,
              (SELECT COUNT(*)::int FROM email_tracking e WHERE e.audit_id = a.id) AS tracking_count
         FROM audits a WHERE id = $1 FOR UPDATE`,
      [input.auditId],
    );
    const current = locked.rows[0];
    if (!current || current.report_delivery_status !== "SENT" || !current.report_sent_at) {
      throw new Error("SENT ownership changed during factual repair");
    }
    if (discoveryArtifactHash(current.report_txt, current.report_html) !== initialHash) {
      throw new Error("Concurrent report mutation detected during factual repair");
    }
    const previousArtifact = await client.query(
      `SELECT id, txt, html
         FROM report_artifacts
        WHERE audit_id = $1 AND artifact_state = 'ACTIVE'
        FOR UPDATE`,
      [input.auditId],
    );
    if ((previousArtifact.rowCount ?? 0) !== 1
      || discoveryArtifactHash(previousArtifact.rows[0].txt, previousArtifact.rows[0].html) !== initialHash) {
      throw new Error("Active artifact ownership changed during factual repair");
    }
    const sentAtMs = new Date(current.report_sent_at).getTime();
    const trackingCount = Number(current.tracking_count || 0);
    const updated = await client.query(
      `UPDATE audits
          SET narrative_report = $2::jsonb, report_txt = $3, report_html = $4,
              report_generated_at = $5, scores = $6::jsonb
        WHERE id = $1 AND type = 'GRATUIT' AND report_delivery_status = 'SENT'
          AND report_sent_at IS NOT NULL AND report_txt = $7 AND report_html = $8
        RETURNING id`,
      [input.auditId, JSON.stringify(narrativeReport), assets.txt, assets.html, repairedAt,
        JSON.stringify(canonicalScores), current.report_txt, current.report_html],
    );
    if ((updated.rowCount || 0) !== 1) throw new Error("Factual repair persistence CAS failed");
    const superseded = await client.query(
      `UPDATE report_artifacts
          SET artifact_state = 'SUPERSEDED', superseded_at = $3
        WHERE id = $1 AND audit_id = $2 AND artifact_state = 'ACTIVE'
        RETURNING id`,
      [previousArtifact.rows[0].id, input.auditId, repairedAt],
    );
    if ((superseded.rowCount ?? 0) !== 1) {
      throw new Error("Active artifact supersede CAS failed during factual repair");
    }
    await client.query(
      `INSERT INTO report_artifacts
         (id, audit_id, tier, engine, model, txt, html, content_sha256,
          artifact_state, supersedes_artifact_id, created_at)
       VALUES ($1,$2,'GRATUIT','discovery-remediation','deterministic-factual-repair',
               $3,$4,$5,'ACTIVE',$6,$7)`,
      [randomUUID(), input.auditId, assets.txt, assets.html, contentSha256,
        previousArtifact.rows[0].id, repairedAt],
    );
    const invariant = await client.query(
      `SELECT report_delivery_status, report_sent_at,
              (SELECT COUNT(*)::int FROM email_tracking e WHERE e.audit_id = a.id) AS tracking_count
         FROM audits a WHERE id = $1`,
      [input.auditId],
    );
    const verified = invariant.rows[0];
    if (verified?.report_delivery_status !== "SENT"
      || new Date(verified.report_sent_at).getTime() !== sentAtMs
      || Number(verified.tracking_count || 0) !== trackingCount) {
      throw new Error("SENT/reportSentAt/tracking invariant changed during factual repair");
    }
    await client.query("COMMIT");
    return {
      auditId: input.auditId,
      previousFallbackHash: initialHash,
      premiumHash,
      reportDeliveryStatus: "SENT",
      reportSentAt: new Date(current.report_sent_at),
      replacements,
    };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

export interface RegeneratedNotificationClaim {
  claimed: boolean;
  trackingId?: string;
  email?: string;
  premiumHash?: string;
  skipped?: "already_claimed";
}

/** Atomic one-shot claim. The precreated row is updated by emailService.logEmail
 * through metadata.trackingId, so there is one canonical tracking row. */
export async function claimRegeneratedReportNotification(input: {
  auditId: string;
  expectedPreviousFallbackHash: string;
}): Promise<RegeneratedNotificationClaim> {
  void input;
  throw new Error("DISCOVERY_REGENERATED_NOTIFICATION_RETIRED");
}
