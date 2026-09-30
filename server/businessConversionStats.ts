export type BusinessOrder = {
  email: string;
  productType: string;
  status: string;
  finalAmountCents: number;
  refundAmountCents: number;
  metadata: Record<string, unknown> | null;
};

export type BusinessConversionStats = {
  paidOrders: number;
  refundedOrders: number;
  cancelledCheckouts: number;
  checkoutContacts: number;
  grossRevenueCents: number;
  refundedCents: number;
  netRevenueCents: number;
  qaOrdersExcluded: number;
};

const isQaOrder = (order: BusinessOrder): boolean =>
  order.metadata?.qaSmoke === true ||
  order.metadata?.qaSmokeCleanup === true ||
  order.metadata?.qaExpiredSession === true ||
  typeof order.metadata?.qaCleanup === "string";

// First-party sales only. Never infer an ad platform or a list price from orders.
export function summarizeBusinessOrders(orders: BusinessOrder[]): BusinessConversionStats {
  const stats: BusinessConversionStats = {
    paidOrders: 0,
    refundedOrders: 0,
    cancelledCheckouts: 0,
    checkoutContacts: 0,
    grossRevenueCents: 0,
    refundedCents: 0,
    netRevenueCents: 0,
    qaOrdersExcluded: 0,
  };
  const contacts = new Set<string>();

  for (const order of orders) {
    if (isQaOrder(order)) {
      stats.qaOrdersExcluded++;
      continue;
    }
    if (order.productType === "GRATUIT") continue;
    const email = order.email.trim().toLowerCase();
    if (email) contacts.add(email);

    if (["paid", "refunded", "partial_refund"].includes(order.status)) {
      stats.paidOrders++;
      if (order.status === "refunded" || order.status === "partial_refund") stats.refundedOrders++;
      stats.grossRevenueCents += order.finalAmountCents;
      stats.refundedCents += order.refundAmountCents;
    } else if (order.status === "cancelled") {
      stats.cancelledCheckouts++;
    }
  }

  stats.checkoutContacts = contacts.size;
  stats.netRevenueCents = stats.grossRevenueCents - stats.refundedCents;
  return stats;
}
