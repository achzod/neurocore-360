const normalizeEmailPolicyText = (value: unknown): string =>
  String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();

export const isCriticalTransactionalEmail = (emailType: string, subject: string): boolean => {
  const normalized = normalizeEmailPolicyText(subject);
  return emailType === "sendMagicLinkEmail"
    || emailType === "sendReportReadyEmail"
    || emailType === "sendBloodAnalysisHtmlEmail"
    || emailType === "sendPeptidesOrderConfirmation"
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
