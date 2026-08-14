import type { ReviewModerationStatus } from "../components/coachingPromoPolicy";

export interface DiscoveryReviewModerationState {
  auditId: string | null;
  requestId: number;
  status: ReviewModerationStatus;
  promoCode: string | null;
}

export function createDiscoveryReviewModerationState(
  auditId?: string,
): DiscoveryReviewModerationState {
  return {
    auditId: auditId ?? null,
    requestId: 0,
    status: "unknown",
    promoCode: null,
  };
}

export function beginDiscoveryReviewModerationRequest(
  auditId: string,
  requestId: number,
): DiscoveryReviewModerationState {
  return { auditId, requestId, status: "unknown", promoCode: null };
}

export function settleDiscoveryReviewModerationRequest(
  current: DiscoveryReviewModerationState,
  auditId: string,
  requestId: number,
  status: ReviewModerationStatus,
  promoCode?: string | null,
): DiscoveryReviewModerationState {
  if (current.auditId !== auditId || current.requestId !== requestId) {
    return current;
  }
  const approvedPromoCode = status === "approved" && promoCode?.trim()
    ? promoCode.trim()
    : null;
  return { ...current, status, promoCode: approvedPromoCode };
}

export function visibleDiscoveryPromoCode(
  current: DiscoveryReviewModerationState,
  auditId?: string,
): string | null {
  return auditId
    && current.auditId === auditId
    && current.status === "approved"
    ? current.promoCode
    : null;
}

export function visibleDiscoveryReviewStatus(
  current: DiscoveryReviewModerationState,
  auditId?: string,
): ReviewModerationStatus {
  return auditId && current.auditId === auditId ? current.status : "unknown";
}
