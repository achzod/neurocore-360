export type PeptidesFulfillmentIncidentCode =
  | "MISSING_REPORT"
  | "INVALID_EMPTY_OR_MEDICAL_REVIEW_REPORT"
  | "MANUAL_INCOMPLETE_REPORT"
  | "RECIPIENT_UNSUBSCRIBED"
  | "DELIVERY_OVERDUE";

export interface PeptidesFulfillmentInvariantInput {
  paidAt: Date | string | null | undefined;
  reportId?: string | null;
  report?: {
    qualityVersion?: string | null;
    peptides?: Array<{
      activationStatus?: string | null;
      purchaseUrl?: string | null;
      reconstitution?: string | null;
      vialsNeeded?: string | null;
      priceEstimate?: string | null;
      [key: string]: unknown;
    }> | null;
    sections?: Array<{ id?: string | null; content?: string | null }> | null;
    weeklySchedule?: string | null;
    shoppingList?: string | null;
    _customerRemediation?: {
      version?: string | null;
      scientificSources?: boolean | null;
      operationalProtocol?: boolean | null;
      purchaseLinks?: boolean | null;
      questionnaireAnswersUsed?: number | null;
      sameReportIdRequired?: boolean | null;
    } | null;
  } | null;
  deliveryAccepted: boolean;
  deliveryHeld?: boolean;
  manualFulfillment?: boolean;
  recipientUnsubscribed: boolean;
  scheduledAt?: Date | string | null;
  now?: Date;
}

export interface PeptidesFulfillmentIncident {
  code: PeptidesFulfillmentIncidentCode;
  blocksDelivery: boolean;
  detail: string;
}

export function shouldAlertPeptidesFulfillmentIncident(
  metadata: Record<string, unknown>,
  incidentCode: string,
): boolean {
  return metadata.peptidesFulfillmentState !== "ACTION_REQUIRED"
    || metadata.peptidesFulfillmentIncidentCode !== incidentCode
    || !metadata.peptidesFulfillmentIncidentAlertedAt;
}

function dateMs(value: Date | string | null | undefined): number | null {
  if (!value) return null;
  const timestamp = value instanceof Date ? value.getTime() : new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
}

function isCompletePaidReport(
  report: PeptidesFulfillmentInvariantInput["report"],
): boolean {
  if (!report) return false;
  const qualityVersion = String(report.qualityVersion || "").toLowerCase();
  const peptides = Array.isArray(report.peptides) ? report.peptides : [];
  const sections = Array.isArray(report.sections) ? report.sections : [];
  const sectionChars = sections.reduce(
    (total, section) => total + String(section?.content || "").trim().length,
    0,
  );
  const uniqueSectionIds = new Set(
    sections.map((section) => String(section?.id || "").trim()).filter(Boolean),
  );
  const sharedStructureComplete = peptides.length >= 1
    && sections.length >= 12
    && uniqueSectionIds.size === sections.length
    && sectionChars >= 12_000
    && String(report.weeklySchedule || "").trim().length >= 100;

  if (!sharedStructureComplete) return false;

  if (qualityVersion === "expert-standard-v1") {
    return String(report.shoppingList || "").trim().length >= 100;
  }

  if (qualityVersion === "expert-review-v2") {
    const remediation = report._customerRemediation;
    const reviewPeptidesAreNonOperational = peptides.every((peptide) =>
      String(peptide?.activationStatus || "") === "conditional-inactive"
      && String(peptide?.purchaseUrl || "").trim() === ""
      && String(peptide?.reconstitution || "").trim() === ""
      && String(peptide?.vialsNeeded || "").trim() === ""
      && String(peptide?.priceEstimate || "").trim() === ""
    );
    return String(remediation?.version || "").trim().length >= 3
      && remediation?.scientificSources === true
      && remediation?.operationalProtocol === false
      && remediation?.purchaseLinks === false
      && Number(remediation?.questionnaireAnswersUsed || 0) >= 1
      && remediation?.sameReportIdRequired === true
      && reviewPeptidesAreNonOperational
      && String(report.shoppingList || "").trim() === "";
  }

  return false;
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
  if (!isCompletePaidReport(input.report)) {
    // A manual link under hold is allowed to preserve an incident artifact,
    // but it is never equivalent to a complete paid deliverable. Keep it
    // linked, block every automatic delivery, and surface an action-required
    // incident instead of silently treating the order as fulfilled.
    if (input.report && input.manualFulfillment && input.deliveryHeld) {
      return {
        code: "MANUAL_INCOMPLETE_REPORT",
        blocksDelivery: true,
        detail: `Le rapport manuel reste incomplet: qualityVersion=${qualityVersion || "missing"}, peptideCount=${peptideCount}.`,
      };
    }
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
    && !input.deliveryHeld
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
