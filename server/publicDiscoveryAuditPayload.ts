export const PUBLIC_DISCOVERY_AUDIT_KEYS = [
  "id",
  "type",
  "status",
  "reportDeliveryStatus",
  "reportScheduledFor",
  "reportGeneratedAt",
  "reportSentAt",
  "createdAt",
  "completedAt",
] as const;

export type PublicDiscoveryAuditPayload = Partial<
  Record<(typeof PUBLIC_DISCOVERY_AUDIT_KEYS)[number], unknown>
>;

/**
 * Public Discovery links are bearer links, not authenticated audit access.
 * Keep this serializer allowlist-based so newly-added audit columns remain
 * private unless they are deliberately reviewed and added here.
 */
export function sanitizePublicDiscoveryAuditPayload(
  audit: Record<string, unknown>,
): PublicDiscoveryAuditPayload | Record<string, unknown> {
  if (audit.type !== "GRATUIT") return audit;

  const payload: PublicDiscoveryAuditPayload = {};

  for (const key of PUBLIC_DISCOVERY_AUDIT_KEYS) {
    if (Object.prototype.hasOwnProperty.call(audit, key)) {
      payload[key] = audit[key];
    }
  }

  return payload;
}
