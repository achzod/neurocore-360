export interface PublicReviewCheckSource {
  status?: unknown;
  promoCode?: unknown;
}

export function buildPublicReviewCheckResponse(
  review: PublicReviewCheckSource | null | undefined,
  approvedPromoCode?: string | null,
) {
  if (!review) {
    return { success: true as const, hasReview: false, review: null };
  }

  const status = typeof review.status === "string" ? review.status : "unknown";
  const promoCode = status === "approved" && approvedPromoCode?.trim()
    ? approvedPromoCode.trim()
    : null;

  return {
    success: true as const,
    hasReview: true,
    review: {
      status,
      ...(promoCode ? { promoCode } : {}),
    },
  };
}
