import { createHash, randomUUID } from "node:crypto";

import { pool } from "./db";
import {
  analyzeDiscoveryScan,
  buildDiscoveryReportAssets,
  convertToNarrativeReport,
  validateDiscoveryReportForDelivery,
} from "./discovery-scan";
import {
  attachDiscoveryDeliveryGateResult,
  evaluateCanonicalDiscoveryArtifacts,
  evaluateDiscoveryDeliveryGate,
  resolveCanonicalDiscoveryArtifacts,
} from "./discoveryDeliveryGate";

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
}): string[] {
  const errors: string[] = [];
  if (input.type !== "GRATUIT") errors.push("not_discovery");
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
}): string[] {
  const errors: string[] = [];
  if (input.status !== "SENT" || !input.reportSentAt) errors.push("not_delivered_sent");
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

/** Generate a premium replacement and atomically swap only the report fields.
 * SENT, report_sent_at and email_tracking are never modified. */
export async function regenerateSentDiscoveryInPlace(input: {
  auditId: string;
  expectedPreviousFallbackHash: string;
}): Promise<SentDiscoveryRemediationResult> {
  if (!isSentDiscoveryRemediationEnabled()) {
    throw new Error("DISCOVERY_SENT_REMEDIATION_ENABLED is not true");
  }
  assertSha256(input.expectedPreviousFallbackHash, "expectedPreviousFallbackHash");
  const initial = await pool.query(
    `SELECT id, type, responses, report_delivery_status, report_sent_at,
            narrative_report, report_txt, report_html
       FROM audits WHERE id = $1`,
    [input.auditId],
  );
  const row = initial.rows[0];
  if (!row) throw new Error("Expected Discovery audit not found");
  const initialHash = discoveryArtifactHash(row.report_txt, row.report_html);
  const initialCanonical = resolveCanonicalDiscoveryArtifacts({
    narrativeReport: row.narrative_report,
    reportTxt: row.report_txt,
    reportHtml: row.report_html,
  });
  const candidateErrors = validateSentFallbackCandidate({
    type: row.type,
    status: row.report_delivery_status,
    reportSentAt: row.report_sent_at,
    currentHash: initialHash,
    expectedPreviousFallbackHash: input.expectedPreviousFallbackHash,
    currentPremium: evaluateCanonicalDiscoveryArtifacts(initialCanonical).ok,
  });
  if (candidateErrors.length) throw new Error(`Sent fallback candidate rejected: ${candidateErrors.join(",")}`);

  // Expensive generation runs without holding a DB lock. The exact old
  // artifacts are checked again under FOR UPDATE immediately before swap.
  const result = await analyzeDiscoveryScan(row.responses || {});
  const premiumReport = await convertToNarrativeReport(result, row.responses || {});
  const assets = buildDiscoveryReportAssets(premiumReport);
  const validation = validateDiscoveryReportForDelivery(premiumReport, assets);
  if (!validation.ok) throw new Error(`Premium replacement gate failed: ${validation.errors.join(", ")}`);
  const gate = evaluateDiscoveryDeliveryGate(premiumReport, assets);
  if (!gate.ok) throw new Error(`Premium replacement delivery gate failed: ${gate.errors.join(", ")}`);
  const premiumHash = discoveryArtifactHash(assets.txt, assets.html);
  const replacedAt = new Date();
  const narrativeReport = attachDiscoveryDeliveryGateResult({
    ...premiumReport,
    remediation: {
      version: 1,
      mode: "sent_fallback_replaced_in_place",
      previousFallbackHash: initialHash,
      premiumHash,
      replacedAt: replacedAt.toISOString(),
    },
  }, gate);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const locked = await client.query(
      `SELECT report_delivery_status, report_sent_at, report_txt, report_html,
              (SELECT COUNT(*)::int FROM email_tracking e WHERE e.audit_id = a.id) AS tracking_count
         FROM audits a WHERE id = $1 FOR UPDATE`,
      [input.auditId],
    );
    const current = locked.rows[0];
    if (!current || current.report_delivery_status !== "SENT" || !current.report_sent_at) {
      throw new Error("SENT ownership changed during generation");
    }
    const lockedHash = discoveryArtifactHash(current.report_txt, current.report_html);
    if (lockedHash !== initialHash) throw new Error(`Concurrent report mutation detected: current=${lockedHash}`);
    const sentAtMs = new Date(current.report_sent_at).getTime();
    const trackingCount = Number(current.tracking_count || 0);

    await client.query(
      `UPDATE audits
          SET narrative_report = $2::jsonb,
              report_txt = $3,
              report_html = $4,
              report_generated_at = $5
        WHERE id = $1
          AND type = 'GRATUIT'
          AND report_delivery_status = 'SENT'
          AND report_sent_at IS NOT NULL`,
      [input.auditId, JSON.stringify(narrativeReport), assets.txt, assets.html, replacedAt],
    );
    await client.query(
      `INSERT INTO report_artifacts (id, audit_id, tier, engine, model, txt, html, created_at)
       VALUES ($1,$2,'GRATUIT','discovery-remediation',$3,$4,$5,$6)`,
      [randomUUID(), input.auditId, process.env.OPENAI_DISCOVERY_MODEL || process.env.OPENAI_REPORT_MODEL || "discovery", assets.txt, assets.html, replacedAt],
    );
    const invariant = await client.query(
      `SELECT report_delivery_status, report_sent_at,
              (SELECT COUNT(*)::int FROM email_tracking e WHERE e.audit_id = a.id) AS tracking_count
         FROM audits a WHERE id = $1`,
      [input.auditId],
    );
    const verified = invariant.rows[0];
    if (
      verified?.report_delivery_status !== "SENT" ||
      new Date(verified.report_sent_at).getTime() !== sentAtMs ||
      Number(verified.tracking_count || 0) !== trackingCount
    ) {
      throw new Error("SENT/reportSentAt/tracking invariant changed during replacement");
    }
    await client.query("COMMIT");
    return {
      auditId: input.auditId,
      previousFallbackHash: initialHash,
      premiumHash,
      reportDeliveryStatus: "SENT",
      reportSentAt: new Date(current.report_sent_at),
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
  assertSha256(input.expectedPreviousFallbackHash, "expectedPreviousFallbackHash");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
      `${REPORT_REGENERATED_EMAIL_TYPE}:${input.auditId}`,
    ]);
    const result = await client.query(
      `SELECT id, email, type, report_delivery_status, report_sent_at,
              narrative_report, report_txt, report_html
         FROM audits WHERE id = $1 FOR UPDATE`,
      [input.auditId],
    );
    const audit = result.rows[0];
    if (!audit || audit.type !== "GRATUIT") {
      throw new Error("Expected delivered Discovery audit not found");
    }
    const remediation = audit.narrative_report?.remediation || {};
    const canonical = resolveCanonicalDiscoveryArtifacts({
      narrativeReport: audit.narrative_report,
      reportTxt: audit.report_txt,
      reportHtml: audit.report_html,
    });
    const gate = evaluateCanonicalDiscoveryArtifacts(canonical);
    const premiumHash = discoveryArtifactHash(audit.report_txt, audit.report_html);

    const existing = await client.query(
      `SELECT id FROM email_tracking
        WHERE audit_id = $1 AND email_type = $2 LIMIT 1`,
      [input.auditId, REPORT_REGENERATED_EMAIL_TYPE],
    );
    const notificationErrors = validateRegeneratedNotificationCandidate({
      status: audit.report_delivery_status,
      reportSentAt: audit.report_sent_at,
      expectedPreviousFallbackHash: input.expectedPreviousFallbackHash,
      provenancePreviousFallbackHash: remediation.previousFallbackHash,
      currentPremium: gate.ok,
      currentPremiumHash: premiumHash,
      provenancePremiumHash: remediation.premiumHash,
      alreadyClaimed: (existing.rowCount || 0) > 0,
    });
    if (notificationErrors.length === 1 && notificationErrors[0] === "already_claimed") {
      await client.query("COMMIT");
      return { claimed: false, skipped: "already_claimed" };
    }
    if (notificationErrors.length) throw new Error(`Notification candidate rejected: ${notificationErrors.join(",")}`);
    const trackingId = randomUUID();
    await client.query(
      `INSERT INTO email_tracking
        (id, audit_id, audit_type, email_type, recipient_email, sendpulse_status, metadata, sent_at, created_at, updated_at)
       VALUES ($1,$2,'GRATUIT',$3,$4,'pending',$5::jsonb,NOW(),NOW(),NOW())`,
      [trackingId, input.auditId, REPORT_REGENERATED_EMAIL_TYPE, audit.email, JSON.stringify({
        trackingId,
        previousFallbackHash: input.expectedPreviousFallbackHash.toLowerCase(),
        premiumHash,
        claimState: "claimed_before_provider_post",
      })],
    );
    await client.query("COMMIT");
    return { claimed: true, trackingId, email: audit.email, premiumHash };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}
