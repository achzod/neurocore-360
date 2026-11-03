import { pool } from "./db";
import { hashPeptidesReport } from "./peptidesReleaseHashGate";

export const DELIVERED_REPORT_IMMUTABILITY_ERROR = "DELIVERED_REPORT_IMMUTABILITY_GATE";
export const DELIVERED_REPAIR_CONFIRMATION = "OWNER_AUTHORIZE_DETERMINISTIC_SAME_REPORT_REPAIR";

export type DeliveredEvidenceKind =
  | "delivery_metadata"
  | "delivery_tracking"
  | "review_or_reorder"
  | "gmail_owner_evidence";

export interface DeliveredEvidence {
  kind: DeliveredEvidenceKind;
  id: string;
  at?: string | null;
}

export interface DeliveredReportImmutabilitySnapshot {
  immutable: boolean;
  orderId: string;
  reportId: string | null;
  reportSha256: string | null;
  evidence: DeliveredEvidence[];
}

export interface DeliveredReportRepairOverride {
  owner?: unknown;
  confirmation?: unknown;
  orderId?: unknown;
  reportId?: unknown;
  reportSha256?: unknown;
  reason?: unknown;
}

const DELIVERY_TIMESTAMP_KEYS = [
  "peptidesEmailSentAt",
  "peptidesDeliverySentAt",
  "peptidesReportSentAt",
  "peptidesDeliveredAt",
  "peptidesFulfilledAt",
] as const;

const DETERMINISTIC_REPAIR_MUTATIONS = new Set([
  "recompute-vials",
  "repair-live",
  "edit-sections",
]);

function text(value: unknown): string {
  return String(value || "").trim();
}

export function deliveredUsageTrackingKind(row: Record<string, any>): DeliveredEvidenceKind | null {
  const searchable = `${row.email_type || ""} ${row.subject || ""}`.toLowerCase();
  const success = Boolean(row.at || row.sent_at || row.created_at)
    || ["success", "sent", "delivered", "accepted"].includes(text(row.sendpulse_status).toLowerCase())
    || Number(row.metadata?.sendpulseSmtpAnswerCode) === 250;
  const confirmationOnly = /(orderconfirmation|commande.*confirm|arrive bient[oô]t)/i.test(searchable);
  if (!success || confirmationOnly) return null;
  if (/(review|reorder|follow.?up)/i.test(searchable)) return "review_or_reorder";
  if (/(protocole.*pr[eê]t|report.*ready|report.*deliver|peptides.*delivery)/i.test(searchable)) {
    return "delivery_tracking";
  }
  return null;
}

export function metadataDeliveredEvidence(
  orderId: string,
  reportId: string,
  reportSha256: string,
  metadata: Record<string, unknown>,
): DeliveredEvidence[] {
  const evidence: DeliveredEvidence[] = [];
  for (const key of DELIVERY_TIMESTAMP_KEYS) {
    const at = text(metadata[key]);
    if (at) evidence.push({ kind: "delivery_metadata", id: key, at });
  }
  const acceptedReportId = text(metadata.peptidesDeliveryAcceptedReportId);
  const deliveryState = text(metadata.peptidesDeliveryState).toUpperCase();
  if (acceptedReportId === reportId && deliveryState === "ACCEPTED") {
    evidence.push({ kind: "delivery_metadata", id: "report_scoped_accepted" });
  }
  const gmail = metadata.peptidesGmailDeliveryEvidence;
  if (gmail && typeof gmail === "object") {
    const candidate = gmail as Record<string, unknown>;
    if (
      text(candidate.orderId) === orderId
      && text(candidate.reportId) === reportId
      && text(candidate.reportSha256) === reportSha256
      && text(candidate.messageId)
    ) {
      evidence.push({
        kind: "gmail_owner_evidence",
        id: text(candidate.messageId),
        at: text(candidate.sentAt) || null,
      });
    }
  }
  return evidence;
}

export function classifyDeliveredReportImmutability(input: {
  orderId: string;
  reportId?: string | null;
  reportSha256?: string | null;
  metadata?: Record<string, unknown> | null;
  externalEvidence?: DeliveredEvidence[];
}): DeliveredReportImmutabilitySnapshot {
  const reportId = text(input.reportId) || null;
  const reportSha256 = text(input.reportSha256) || null;
  const externalEvidence = input.externalEvidence || [];
  const metadataEvidence = reportId && reportSha256
    ? metadataDeliveredEvidence(
        input.orderId,
        reportId,
        reportSha256,
        input.metadata || {},
      )
    : [];
  const evidence = [...metadataEvidence, ...externalEvidence];
  return {
    immutable: Boolean(reportId && reportSha256 && evidence.length > 0),
    orderId: input.orderId,
    reportId,
    reportSha256,
    evidence,
  };
}

export function validateDeliveredReportRepairOverride(input: {
  snapshot: DeliveredReportImmutabilitySnapshot;
  mutation: string;
  override?: DeliveredReportRepairOverride | null;
}): { ok: boolean; error?: string } {
  if (!input.snapshot.immutable) return { ok: true };
  if (!DETERMINISTIC_REPAIR_MUTATIONS.has(input.mutation)) {
    return { ok: false, error: `${DELIVERED_REPORT_IMMUTABILITY_ERROR}:provider_or_identity_mutation_forbidden` };
  }
  const candidate = input.override || {};
  const reason = text(candidate.reason);
  const exact = text(candidate.owner).toLowerCase() === "achzod"
    && text(candidate.confirmation) === DELIVERED_REPAIR_CONFIRMATION
    && text(candidate.orderId) === input.snapshot.orderId
    && text(candidate.reportId) === input.snapshot.reportId
    && text(candidate.reportSha256) === input.snapshot.reportSha256
    && reason.length >= 12;
  return exact
    ? { ok: true }
    : { ok: false, error: `${DELIVERED_REPORT_IMMUTABILITY_ERROR}:owner_override_mismatch` };
}

export async function readDeliveredReportImmutability(
  order: any,
  reportRecord?: any | null,
): Promise<DeliveredReportImmutabilitySnapshot> {
  const metadata = (order?.metadata || {}) as Record<string, unknown>;
  const reportId = text(metadata.peptidesReportId) || null;
  if (!reportId) {
    return classifyDeliveredReportImmutability({ orderId: text(order?.id), metadata });
  }
  const report = reportRecord || (await pool.query(
    "SELECT id,email,report FROM burnout_reports WHERE id=$1 LIMIT 1",
    [reportId],
  )).rows[0];
  if (!report || text(report.id) !== reportId) {
    return classifyDeliveredReportImmutability({ orderId: text(order?.id), reportId, metadata });
  }
  const reportSha256 = hashPeptidesReport(report.report || {});
  const scopedTracking = await pool.query(
    `SELECT id, COALESCE(sent_at,created_at)::text AS at,
            email_type, subject, sendpulse_status, sendpulse_error, metadata
       FROM email_tracking
      WHERE lower(recipient_email)=lower($1)
        AND (
          audit_id=$2 OR audit_id=$3
          OR metadata->>'orderId'=$2 OR metadata->>'reportId'=$3
        )
        AND sendpulse_error IS NULL`,
    [order.email, order.id, reportId],
  ).catch(() => ({ rows: [] as any[] }));
  const trackingEvidence: DeliveredEvidence[] = scopedTracking.rows.flatMap((row: any) => {
    const kind = deliveredUsageTrackingKind(row);
    return kind ? [{ kind, id: text(row.id), at: text(row.at) || null }] : [];
  });
  const [reviewEvidence, migratedEvidence] = await Promise.all([
    pool.query(
      `SELECT id, created_at::text AS at FROM reviews
        WHERE (audit_id=$1 OR audit_id=$2)
          AND lower(email)=lower($3)
          AND upper(COALESCE(audit_type,''))='PEPTIDES_ENGINE'`,
      [order.id, reportId, order.email],
    ).catch(() => ({ rows: [] as any[] })),
    pool.query(
      `SELECT evidence_type, evidence_id, observed_at::text AS at
         FROM peptides_delivered_report_evidence
        WHERE order_id=$1 AND report_id=$2 AND report_sha256=$3`,
      [order.id, reportId, reportSha256],
    ).catch(() => ({ rows: [] as any[] })),
  ]);
  const externalEvidence: DeliveredEvidence[] = [
    ...trackingEvidence,
    ...reviewEvidence.rows.map((row: any) => ({
      kind: "review_or_reorder" as const,
      id: text(row.id),
      at: text(row.at) || null,
    })),
    ...migratedEvidence.rows.flatMap((row: any) => {
      const kind = text(row.evidence_type) as DeliveredEvidenceKind;
      return ["delivery_metadata", "delivery_tracking", "review_or_reorder", "gmail_owner_evidence"].includes(kind)
        ? [{ kind, id: text(row.evidence_id), at: text(row.at) || null }]
        : [];
    }),
  ];
  return classifyDeliveredReportImmutability({
    orderId: text(order.id),
    reportId,
    reportSha256,
    metadata,
    externalEvidence,
  });
}
