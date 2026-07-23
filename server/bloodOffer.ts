export const BLOOD_ANALYSIS_PURCHASE_CREDITS = 2;

export function clarifyBloodPurchaseEmail(subject: string, message: string): string {
  const isBloodPurchaseConfirmation =
    /^Blood Analysis : (commande|paiement) recu(?:e)?$/i.test(subject.trim());
  if (!isBloodPurchaseConfirmation || message.includes("2 credits Blood Analysis")) {
    return message;
  }

  const confirmation = "Merci pour ta commande Blood Analysis. Ton paiement est bien recu.";
  const creditDetails =
    `Ton achat inclut ${BLOOD_ANALYSIS_PURCHASE_CREDITS} credits Blood Analysis, ajoutes a ton compte et utilisables quand tu veux, sans expiration. Chaque upload de bilan valide consomme 1 credit.\n\n` +
    "Parcours recommande : utilise le 1er credit pour ton bilan initial avant la mise en place des recommandations, puis le 2e credit pour un bilan de controle 2 a 3 mois apres leur mise en place. Tu peux toutefois utiliser tes 2 credits au moment qui te convient.";

  return message.includes(confirmation)
    ? message.replace(confirmation, `${confirmation}\n\n${creditDetails}`)
    : `${creditDetails}\n\n${message}`;
}
