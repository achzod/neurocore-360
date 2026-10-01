export type PeptidesFulfillmentIncidentCode =
  | "MISSING_REPORT"
  | "INVALID_EMPTY_OR_MEDICAL_REVIEW_REPORT"
  | "RECIPIENT_UNSUBSCRIBED"
  | "DELIVERY_OVERDUE";

export interface PeptidesFulfillmentInvariantInput {
  paidAt: Date | string | null | undefined;
  reportId?: string | null;
  report?: {
    qualityVersion?: string | null;
    peptides?: unknown[] | null;
  } | null;
  deliveryAccepted: boolean;
  recipientUnsubscribed: boolean;
  scheduledAt?: Date | string | null;
  now?: Date;
}

export interface PeptidesFulfillmentIncident {
  code: PeptidesFulfillmentIncidentCode;
  blocksDelivery: boolean;
  detail: string;
}

function dateMs(value: Date | string | null | undefined): number | null {
  if (!value) return null;
  const timestamp = value instanceof Date ? value.getTime() : new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
}

export function evaluatePeptidesFulfillmentInvariant(
  input: PeptidesFulfillmentInvariantInput,
): PeptidesFulfillmentIncident | null {
  const nowMs = (input.now || new Date()).getTime();
  const paidAtMs = dateMs(input.paidAt);
  const scheduledAtMs = dateMs(input.scheduledAt);
  const reportId = String(input.reportId || "").trim();

  if (!reportId) {
    if (paidAtMs !== null && nowMs - paidAtMs >= 30 * 60 * 1000) {
      return {
        code: "MISSING_REPORT",
        blocksDelivery: false,
        detail: "Commande Peptides payee depuis au moins 30 minutes sans reportId.",
      };
    }
    return null;
  }

  const qualityVersion = String(input.report?.qualityVersion || "").toLowerCase();
  const peptideCount = Array.isArray(input.report?.peptides) ? input.report!.peptides!.length : 0;
  if (!input.report || qualityVersion === "medical-review-v1" || peptideCount < 2) {
    return {
      code: "INVALID_EMPTY_OR_MEDICAL_REVIEW_REPORT",
      blocksDelivery: true,
      detail: `Le rapport paye est inutilisable: qualityVersion=${qualityVersion || "missing"}, peptideCount=${peptideCount}.`,
    };
  }

  if (!input.deliveryAccepted && input.recipientUnsubscribed) {
    return {
      code: "RECIPIENT_UNSUBSCRIBED",
      blocksDelivery: true,
      detail: "Le destinataire est desabonne: la livraison automatique ne peut pas aboutir.",
    };
  }

  if (
    !input.deliveryAccepted
    && scheduledAtMs !== null
    && nowMs - scheduledAtMs >= 30 * 60 * 1000
  ) {
    return {
      code: "DELIVERY_OVERDUE",
      blocksDelivery: false,
      detail: "Le rapport valide depasse son horaire de livraison de plus de 30 minutes sans acceptation fournisseur.",
    };
  }

  return null;
}
