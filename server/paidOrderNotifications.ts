export type PaidOrderNotificationInput = {
  id: string;
  email: string;
  productType: string;
  finalAmountCents: number;
  promoCode?: string | null;
  metadata?: Record<string, unknown> | null;
};

export type PaidOrderNotificationPlan = {
  clientEmail: string;
  clientName: string;
  productLabel: string;
  adminSubject: string;
  adminMessage: string;
  customerSubject: string;
  customerMessage: string;
};

export function buildPaidOrderNotificationPlan(
  order: PaidOrderNotificationInput,
): PaidOrderNotificationPlan | null {
  if (!["PREMIUM", "ELITE"].includes(order.productType)) return null;
  const clientEmail = String(order.email || "").trim().toLowerCase();
  if (!clientEmail) return null;

  const metadata = order.metadata && typeof order.metadata === "object" ? order.metadata : {};
  const rawResponses = (metadata as Record<string, unknown>).questionnaireResponses;
  const responses = rawResponses && typeof rawResponses === "object"
    ? rawResponses as Record<string, unknown>
    : {};
  const clientName = String(responses.prenom || responses.name || clientEmail.split("@")[0] || "Client").trim();
  const productLabel = order.productType === "ELITE" ? "Ultimate Scan" : "Anabolic Bioscan";
  const productWithPrice = order.productType === "ELITE" ? "Ultimate Scan (79EUR)" : "Anabolic Bioscan (59EUR)";
  const promo = order.productType === "ELITE"
    ? { code: "ULTIMATE79", label: "79€ déduits de ta formule coaching (Essential/Elite/Private Lab)" }
    : { code: "BIOSCAN59", label: "59€ déduits de ta formule coaching (Essential/Elite/Private Lab)" };
  const amount = (order.finalAmountCents / 100).toFixed(2);

  return {
    clientEmail,
    clientName,
    productLabel,
    adminSubject: `PAIEMENT ${amount}EUR , ${productWithPrice} , ${clientName}`,
    adminMessage: `PAIEMENT RECU!\n\nProduit: ${productWithPrice}\nClient: ${clientName}\nEmail: ${clientEmail}\nMontant: ${amount}EUR\nPromo: ${order.promoCode || "aucun"}\n\nOrder ID: ${order.id}`,
    customerSubject: `${productLabel} : commande reçue`,
    customerMessage: `Salut ${clientName},\n\nMerci pour ta commande ${productLabel}. Ton paiement de ${amount}€ est bien reçu et toutes tes réponses sont enregistrées.\n\nTon rapport est en cours de génération. Tu le recevras par email après son contrôle qualité, au plus tard sous 24h.\n\nTon code promo : ${promo.code}\n${promo.label}\nUtilise-le sur achzodcoaching.com/formules-coaching\n\nSi tu as des questions, réponds directement à cet email.\n\nAchzod`,
  };
}
