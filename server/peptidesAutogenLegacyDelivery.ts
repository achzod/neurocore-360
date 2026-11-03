export type LegacyPeptidesDeliveryReconciliation = "ACCEPTED" | "AMBIGUOUS" | "NONE" | "NOT_APPLICABLE";

export interface LegacyPeptidesDeliveryStorage {
  backfillAcceptedPeptidesDeliveryFromTracking(
    orderId: string,
    reportId: string,
  ): Promise<"ACCEPTED" | "AMBIGUOUS" | "NONE">;
  getOrder(orderId: string): Promise<any | undefined>;
}

export function hasAcceptedPeptidesDeliveryForLinkedReport(order: any, reportId: string): boolean {
  const metadata = ((order?.metadata as any) || {}) as Record<string, any>;
  return order?.productType === "PEPTIDES_ENGINE"
    && ["paid", "partial_refund"].includes(String(order?.status))
    && String(metadata.peptidesReportId || "") === reportId
    && String(metadata.peptidesDeliveryReportId || "") === reportId
    && metadata.peptidesDeliveryState === "ACCEPTED";
}

export async function reconcilePeptidesAutogenLegacyDelivery(
  storage: LegacyPeptidesDeliveryStorage,
  order: any,
): Promise<{ status: LegacyPeptidesDeliveryReconciliation; order: any }> {
  const metadata = ((order?.metadata as any) || {}) as Record<string, any>;
  const reportId = String(metadata.peptidesReportId || "").trim();
  if (!reportId || hasAcceptedPeptidesDeliveryForLinkedReport(order, reportId)) {
    return { status: "NOT_APPLICABLE", order };
  }
  const status = await storage.backfillAcceptedPeptidesDeliveryFromTracking(order.id, reportId);
  if (status === "NONE") return { status, order };
  const refreshed = await storage.getOrder(order.id);
  return { status, order: refreshed || order };
}
