export type ReviewModerationStatus = "none" | "pending" | "approved" | "rejected" | "unknown";

export type CoachingPromoAuditKind =
  | "GRATUIT"
  | "DISCOVERY"
  | "PREMIUM"
  | "ANABOLIC"
  | "ELITE"
  | "ULTIMATE"
  | "BLOOD_ANALYSIS"
  | "BLOOD"
  | "PEPTIDES_ENGINE"
  | "PEPTIDES";

export const DISCOVERY_REVIEW_PROMO_MESSAGE = "Laisse un avis validé pour recevoir -20 % par email.";

export function isDiscoveryPromoKind(kind: CoachingPromoAuditKind): boolean {
  return kind === "GRATUIT" || kind === "DISCOVERY";
}

/**
 * Discovery promo disclosure is fail-closed. Only the persisted moderation
 * status returned by the review API can unlock the code; a missing request,
 * an API error, an unknown value or a merely submitted review never can.
 */
export function canRevealCoachingPromoCode(
  kind: CoachingPromoAuditKind,
  reviewStatus: ReviewModerationStatus | null | undefined,
  serverPromoCode?: string | null,
): boolean {
  return !isDiscoveryPromoKind(kind)
    || (reviewStatus === "approved" && Boolean(serverPromoCode?.trim()));
}
