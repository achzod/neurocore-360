/**
 * Envoi des emails d'achat pour les commandes de la table orders.
 * Appelé par le webhook Stripe, /api/stripe/confirm-session et la boucle de
 * rattrapage des notifications : un seul gabarit, un seul expéditeur.
 */
import {
  buildPurchaseAdminNotificationEmail,
  buildScanPurchaseConfirmationEmail,
  greetingName,
  PURCHASE_PRODUCT_LABELS,
  type PurchaseProductType,
} from "./purchaseEmails";

export interface PurchaseOrderLike {
  id: string;
  email: string;
  productType: string;
  productName?: string | null;
  finalAmountCents: number;
  promoCode?: string | null;
  stripeCheckoutSessionId?: string | null;
  metadata?: Record<string, unknown> | null;
}

const PEPTIDES_TIER_LABELS: Record<string, string> = { solo: "Solo", coached: "Coached", tracked: "Tracked" };

export function purchaseProductLabel(order: Pick<PurchaseOrderLike, "productType" | "productName" | "metadata">): string {
  const type = order.productType as PurchaseProductType;
  if (type === "PEPTIDES_ENGINE") {
    const tier = PEPTIDES_TIER_LABELS[String((order.metadata as any)?.peptidesTier || "").toLowerCase()];
    return tier ? `Peptides Engine ${tier}` : "Peptides Engine";
  }
  return PURCHASE_PRODUCT_LABELS[type] || order.productName || order.productType;
}

/** Prénom du questionnaire, puis nom Stripe ; jamais un bout d'adresse email. */
export function purchaseFirstName(order: Pick<PurchaseOrderLike, "metadata">, fallback?: string | null): string {
  const meta = (order.metadata && typeof order.metadata === "object" ? order.metadata : {}) as Record<string, any>;
  const responses = (meta.questionnaireResponses || meta.peptidesResponses || {}) as Record<string, unknown>;
  return greetingName(responses.prenom || responses.firstName || responses.pep_name || responses.name || fallback || "");
}

export function isScanPurchase(productType: string): productType is "PREMIUM" | "ELITE" | "BLOOD_ANALYSIS" {
  return productType === "PREMIUM" || productType === "ELITE" || productType === "BLOOD_ANALYSIS";
}

export async function sendScanPurchaseConfirmation(
  order: PurchaseOrderLike,
  opts: { firstName?: string | null; baseUrl?: string } = {},
): Promise<boolean> {
  if (!isScanPurchase(order.productType)) return false;
  const to = String(order.email || "").trim().toLowerCase();
  if (!to) return false;
  const mail = buildScanPurchaseConfirmationEmail(order.productType, {
    orderId: order.id,
    email: to,
    firstName: purchaseFirstName(order, opts.firstName),
    amountCents: order.finalAmountCents,
    promoCode: order.promoCode || null,
    baseUrl: opts.baseUrl,
  });
  const { sendPurchaseTransactionalEmail } = await import("./emailService");
  return sendPurchaseTransactionalEmail({
    to,
    ...mail,
    emailType: "sendPurchaseConfirmationEmail",
    metadata: { orderId: order.id, productType: order.productType, stripeSessionId: order.stripeCheckoutSessionId || null },
  });
}

export async function sendPurchaseAdminNotification(
  order: PurchaseOrderLike,
  opts: { clientName?: string | null; stripeSessionId?: string | null; channel?: string | null } = {},
): Promise<boolean> {
  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || "coaching@achzodcoaching.com";
  const sessionId = opts.stripeSessionId || order.stripeCheckoutSessionId || null;
  const mail = buildPurchaseAdminNotificationEmail({
    productLabel: purchaseProductLabel(order),
    email: order.email,
    clientName: purchaseFirstName(order, opts.clientName) || null,
    amountCents: order.finalAmountCents,
    promoCode: order.promoCode || null,
    orderId: order.id,
    stripeSessionId: sessionId,
    channel: opts.channel || "Stripe",
    isTest: (order.metadata as any)?.hark_audit_test === true,
  });
  const { sendPurchaseTransactionalEmail } = await import("./emailService");
  return sendPurchaseTransactionalEmail({
    to: adminEmail,
    ...mail,
    emailType: "sendPurchaseAdminNotification",
    metadata: { orderId: order.id, productType: order.productType, stripeSessionId: sessionId },
  });
}
