import { createHash, randomUUID } from "node:crypto";
import { jsonrepair } from "jsonrepair";
import { pruneUnintegratedBonusPeptides } from "./peptidesReportRepair";
import { validatePeptidesReport, type PeptidesValidation } from "./peptidesReportValidator";
import type { PeptidesReport } from "./peptidesEngine";

export const STORED_PEPTIDES_RECOVERY_CONFIRMATION = "APPLY_STORED_PEPTIDES_RECOVERY";

export type StoredPeptidesRecoveryOrder = {
  id: string;
  email: string;
  productType: string;
  status: string;
  metadata: Record<string, unknown>;
};

export type StoredPeptidesRecoveryCandidate = {
  report: PeptidesReport;
  validation: PeptidesValidation;
  safetyErrors: string[];
  fingerprint: string;
  responseId: string;
  ready: boolean;
};

export interface RecoverySqlResult<Row = Record<string, unknown>> {
  rows: Row[];
  rowCount?: number | null;
}

export interface RecoverySqlClient {
  query<Row = Record<string, unknown>>(text: string, values?: unknown[]): Promise<RecoverySqlResult<Row>>;
}

type RecoveryOrderRow = {
  id: string;
  email: string;
  product_type: string;
  status: string;
  metadata: Record<string, unknown> | null;
};

function normalizeEmail(value: string): string {
  return String(value || "").trim().toLowerCase();
}

function boolish(value: unknown): boolean {
  return value === true || String(value || "").trim().toLowerCase() === "true";
}

function responseIdOrThrow(value: string): string {
  const responseId = String(value || "").trim();
  if (!/^resp_[A-Za-z0-9]+$/.test(responseId)) {
    throw new Error("RECOVERY_RESPONSE_ID_INVALID");
  }
  return responseId;
}

export function parseStoredPeptidesResponse(raw: string): PeptidesReport {
  let cleaned = String(raw || "").trim();
  const fence = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) cleaned = fence[1].trim();
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    cleaned = cleaned.slice(firstBrace, lastBrace + 1);
  }
  if (!cleaned) throw new Error("RECOVERY_RESPONSE_EMPTY");
  try {
    return JSON.parse(cleaned) as PeptidesReport;
  } catch {
    return JSON.parse(jsonrepair(cleaned)) as PeptidesReport;
  }
}

function reportText(report: PeptidesReport): string {
  return [
    report.clientName,
    report.weeklySchedule,
    report.shoppingList,
    ...(report.sections || []).map((section) => `${section.title || ""}\n${section.content || ""}`),
    ...(report.peptides || []).flatMap((peptide) => Object.values(peptide).map(String)),
  ].join("\n");
}

function ensureWeightFact(report: PeptidesReport, responses: Record<string, unknown>): void {
  const weightKg = Number(responses.pep_weight || 0);
  if (!Number.isFinite(weightKg) || weightKg <= 0) return;
  const synthesis = (report.sections || []).find((section) =>
    /profil-synthese|synthese de ton profil/i.test(`${section.id || ""} ${section.title || ""}`),
  );
  if (!synthesis) return;
  const escaped = String(weightKg).replace(".", "[.,]");
  if (new RegExp(`(?:^|[^0-9.,])${escaped}\\s*kg\\b`, "i").test(synthesis.content || "")) return;
  const weightDisplay = String(weightKg).replace(".", ",");
  const height = String(responses.pep_height || "").trim();
  synthesis.content = `${String(synthesis.content || "").trim()}\n\nTon point de depart mesurable est ${weightDisplay} kg${height ? ` pour ${height} cm` : ""}. Ce repere sert au suivi et aux calculs exprimes par kilo.`;
}

const OBSOLETE_MISSING_LIVE_FORMAT_SENTENCE =
  "Nombre de vials non calculable tant que le format live manque, aucune commande autorisée.";

const OBSOLETE_LIVE_AVAILABILITY_PARAGRAPHS = [
  /Le point qui bloque aujourd'hui est concret\.[\s\S]*?jusqu'à l'apparition d'offres compatibles et à la validation de ton bilan de départ\./gi,
  /Je ne fixe aucun fournisseur aujourd'hui\.[\s\S]*?La commande reste donc à zéro tant qu'une offre réelle n'apparaît pas\./gi,
];

function hasVerifiedOfficialPricing(report: PeptidesReport): boolean {
  return (report.peptides || []).length > 0 && (report.peptides || []).every((peptide) => {
    const price = String(peptide.priceEstimate || "");
    const url = String(peptide.purchaseUrl || "");
    return /\d/.test(price)
      && !/\b0(?:[.,]0+)?\s*(?:USD|\$|EUR|€)\b/i.test(price)
      && /^https:\/\/(?:www\.)?peptaura\.com\/(?:product|catalog)\//i.test(url);
  });
}

/**
 * Stored candidates can contain a fail-closed sentence emitted when the old
 * catalog pages were unavailable. Once the official feed has populated every
 * peptide with a positive price and canonical link, that sentence is stale and
 * contradictory. Remove only that exact sentence; never rewrite dosage or
 * safety content and never run without verified official pricing.
 */
export function removeObsoleteMissingLiveFormatSentence(report: PeptidesReport): PeptidesReport {
  if (!hasVerifiedOfficialPricing(report)) return report;
  const scrub = (value: unknown): unknown => {
    if (typeof value === "string") {
      let cleaned = value
        .split(OBSOLETE_MISSING_LIVE_FORMAT_SENTENCE)
        .join("");
      for (const pattern of OBSOLETE_LIVE_AVAILABILITY_PARAGRAPHS) {
        cleaned = cleaned.replace(pattern, "");
      }
      return cleaned
        .replace(/[ \t]+\n/g, "\n")
        .replace(/\n{3,}/g, "\n\n")
        .replace(/[ \t]{2,}/g, " ")
        .trim();
    }
    if (Array.isArray(value)) return value.map(scrub);
    if (value && typeof value === "object") {
      for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
        (value as Record<string, unknown>)[key] = scrub(nested);
      }
    }
    return value;
  };
  return scrub(report) as PeptidesReport;
}

export function auditStoredRecoverySafety(
  report: PeptidesReport,
  responses: Record<string, unknown>,
): string[] {
  const errors: string[] = [];
  const text = reportText(report);
  const freeText = [
    responses.pep_questions,
    responses.pep_conditions_other,
    responses.antecedentsMedicaux,
  ].map(String).join("\n");
  const surgeryDeclared = /op[ée]ration|chirurg|varices?/i.test(freeText);
  if (surgeryDeclared) {
    if (!/op[ée]ration|chirurg|varices?/i.test(text)) errors.push("RECOVERY_SURGERY_CONTEXT_MISSING");
    if (!/(?:chirurgien|m[ée]decin|[ée]quipe de chirurgie)[\s\S]{0,280}(?:accord|validation|avis|confirm|consigne|calendrier d'arr[êe]t)|(?:accord|validation|avis|confirm|consigne|calendrier d'arr[êe]t)[\s\S]{0,280}(?:chirurgien|m[ée]decin|[ée]quipe de chirurgie)/i.test(text)) {
      errors.push("RECOVERY_SURGICAL_CLEARANCE_MISSING");
    }
    if (!/(?:pause|arr[êe]t|suspend|ne commence pas|reprendre)[\s\S]{0,280}(?:op[ée]ration|chirurg|intervention)|(?:op[ée]ration|chirurg|intervention)[\s\S]{0,280}(?:pause|arr[êe]t|suspend|ne commence pas|reprendre)/i.test(text)) {
      errors.push("RECOVERY_PERIOPERATIVE_PAUSE_RULE_MISSING");
    }
  }
  if (!/exp[ée]rimental|non approuv[ée]|produit de recherche/i.test(text)) {
    errors.push("RECOVERY_EXPERIMENTAL_STATUS_MISSING");
  }
  const injectionAnxiety = /anx|appr[ée]hension|stress|peur/i.test(String(responses.pep_injection_comfort || ""));
  if (injectionAnxiety && (!/injection/i.test(text) || !/(?:anx|appr[ée]hension|progress|accompagn|professionnel)/i.test(text))) {
    errors.push("RECOVERY_INJECTION_ANXIETY_MISSING");
  }
  return errors;
}

export async function buildStoredPeptidesRecoveryCandidate(input: {
  raw: string;
  responseId: string;
  responses: Record<string, unknown>;
  tier: "solo" | "coached" | "tracked";
  refreshOfficialPricing: (
    report: PeptidesReport,
    responses: Record<string, unknown>,
    tier: string,
  ) => Promise<PeptidesReport>;
}): Promise<StoredPeptidesRecoveryCandidate> {
  const responseId = responseIdOrThrow(input.responseId);
  let report = pruneUnintegratedBonusPeptides(structuredClone(parseStoredPeptidesResponse(input.raw)));
  report.tier = input.tier;
  report.promoCodesGenerated = [];
  const firstName = String(input.responses.pep_name || report.clientName || "Profil").trim().split(/\s+/)[0];
  report.clientName = firstName || "Profil";
  ensureWeightFact(report, input.responses);
  report = await input.refreshOfficialPricing(report, input.responses, input.tier);
  report = removeObsoleteMissingLiveFormatSentence(report);
  report.tier = input.tier;
  report.promoCodesGenerated = [];
  report.clientName = firstName || report.clientName || "Profil";
  const safetyErrors = auditStoredRecoverySafety(report, input.responses);
  const validation = validatePeptidesReport(report);
  const fingerprint = createHash("sha256")
    .update(JSON.stringify({ responseId, report }))
    .digest("hex");
  (report as PeptidesReport & { _storedRecovery?: Record<string, unknown> })._storedRecovery = {
    responseId,
    fingerprint,
    recoveredAt: new Date().toISOString(),
    providerInferenceUsed: false,
    emailSent: false,
  };
  return {
    report,
    validation,
    safetyErrors,
    fingerprint,
    responseId,
    ready: validation.ok && safetyErrors.length === 0,
  };
}

export async function loadStoredPeptidesRecoveryOrder(
  client: RecoverySqlClient,
  orderId: string,
): Promise<StoredPeptidesRecoveryOrder> {
  const result = await client.query<RecoveryOrderRow>(
    `SELECT id, email, product_type, status, metadata
       FROM orders
      WHERE id = $1`,
    [orderId],
  );
  const row = result.rows[0];
  if (!row) throw new Error("RECOVERY_ORDER_NOT_FOUND");
  return {
    id: row.id,
    email: row.email,
    productType: row.product_type,
    status: row.status,
    metadata: row.metadata || {},
  };
}

function assertRecoveryOrder(
  order: StoredPeptidesRecoveryOrder,
  expected: { orderId: string; email: string },
): void {
  if (order.id !== expected.orderId) throw new Error("RECOVERY_ORDER_ID_MISMATCH");
  if (normalizeEmail(order.email) !== normalizeEmail(expected.email)) throw new Error("RECOVERY_EMAIL_MISMATCH");
  if (order.productType !== "PEPTIDES_ENGINE") throw new Error("RECOVERY_PRODUCT_MISMATCH");
  if (order.status !== "paid") throw new Error("RECOVERY_ORDER_NOT_PAID");
  if (!boolish(order.metadata.peptidesEmailHold)) throw new Error("RECOVERY_HOLD_REQUIRED");
  if (String(order.metadata.peptidesReportId || "").trim()) throw new Error("RECOVERY_REPORT_ALREADY_LINKED");
}

export async function persistStoredPeptidesRecoveryUnderHold(input: {
  client: RecoverySqlClient;
  orderId: string;
  email: string;
  responseId: string;
  confirmation: string;
  candidate: StoredPeptidesRecoveryCandidate;
  responses: Record<string, unknown>;
}): Promise<{ reportId: string; fingerprint: string }> {
  if (input.confirmation !== STORED_PEPTIDES_RECOVERY_CONFIRMATION) {
    throw new Error("RECOVERY_EXPLICIT_CONFIRMATION_REQUIRED");
  }
  const responseId = responseIdOrThrow(input.responseId);
  if (responseId !== input.candidate.responseId) throw new Error("RECOVERY_RESPONSE_ID_MISMATCH");
  if (!input.candidate.ready || !input.candidate.validation.ok || input.candidate.safetyErrors.length > 0) {
    throw new Error("RECOVERY_CANDIDATE_NOT_DELIVERABLE");
  }
  const reportId = randomUUID();
  await input.client.query("BEGIN");
  try {
    const locked = await input.client.query<RecoveryOrderRow>(
      `SELECT id, email, product_type, status, metadata
         FROM orders
        WHERE id = $1
        FOR UPDATE`,
      [input.orderId],
    );
    const row = locked.rows[0];
    if (!row) throw new Error("RECOVERY_ORDER_NOT_FOUND");
    const order: StoredPeptidesRecoveryOrder = {
      id: row.id,
      email: row.email,
      productType: row.product_type,
      status: row.status,
      metadata: row.metadata || {},
    };
    assertRecoveryOrder(order, { orderId: input.orderId, email: input.email });

    await input.client.query(
      `INSERT INTO burnout_reports (id, email, responses, report)
       VALUES ($1, $2, $3::jsonb, $4::jsonb)`,
      [
        reportId,
        `peptides::${normalizeEmail(input.email)}`,
        JSON.stringify(input.responses || {}),
        JSON.stringify(input.candidate.report),
      ],
    );
    const linked = await input.client.query(
      `UPDATE orders
          SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
                'peptidesReportId', $1::text,
                'peptidesGenerationState', 'SUCCEEDED',
                'peptidesGenerationLeaseUntil', '',
                'peptidesGenerationCompletedAt', NOW()::text,
                'peptidesRecoveredFromResponseId', $2::text,
                'peptidesRecoveryFingerprint', $3::text,
                'peptidesRecoveryAppliedAt', NOW()::text,
                'peptidesEmailHold', true
              ),
              updated_at = NOW()
        WHERE id = $4
          AND lower(email) = lower($5)
          AND product_type = 'PEPTIDES_ENGINE'
          AND status = 'paid'
          AND COALESCE(metadata->>'peptidesEmailHold', 'false') = 'true'
          AND COALESCE(metadata->>'peptidesReportId', '') = ''
        RETURNING id`,
      [reportId, responseId, input.candidate.fingerprint, input.orderId, normalizeEmail(input.email)],
    );
    if ((linked.rowCount ?? linked.rows.length) !== 1) throw new Error("RECOVERY_LINK_CAS_FAILED");
    await input.client.query("COMMIT");
    return { reportId, fingerprint: input.candidate.fingerprint };
  } catch (error) {
    await input.client.query("ROLLBACK").catch(() => undefined);
    throw error;
  }
}
