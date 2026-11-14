const normalizeEmailPolicyText = (value: unknown): string =>
  String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();

/** FormCheck : accès payé, rapport payé, demande de refilmer, incident. Jamais bloqués par un désabonnement marketing. */
export const FORMCHECK_TRANSACTIONAL_EMAIL_TYPES = new Set([
  "sendFormcheckAccessEmail",
  "sendFormcheckReportEmail",
  "sendFormcheckReshootEmail",
  "sendFormcheckIssueEmail",
]);

export const isCriticalTransactionalEmail = (emailType: string, subject: string): boolean => {
  const normalized = normalizeEmailPolicyText(subject);
  return emailType === "sendMagicLinkEmail"
    || emailType === "sendReportReadyEmail"
    || emailType === "sendBloodAnalysisHtmlEmail"
    || emailType === "sendPeptidesOrderConfirmation"
    || FORMCHECK_TRANSACTIONAL_EMAIL_TYPES.has(emailType)
    || (emailType === "sendCTAEmail" && (
      normalized.includes("protocole peptides")
      || normalized.includes("commande recue")
      || normalized.includes("paiement recu")
      || normalized.includes("rapport")
    ));
};

export const shouldBlockForMarketingUnsubscribe = (
  unsubscribed: boolean,
  emailType: string,
  subject: string,
): boolean => unsubscribed && !isCriticalTransactionalEmail(emailType, subject);
