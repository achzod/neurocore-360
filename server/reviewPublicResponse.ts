export interface PublicReviewCheckSource {
  status?: unknown;
  promoCode?: unknown;
}

export interface PublicReviewSource {
  rating?: unknown;
  comment?: unknown;
  auditType?: unknown;
  createdAt?: unknown;
}

export function toPublicReview(review: PublicReviewSource) {
  return {
    rating: typeof review.rating === "number" ? review.rating : 0,
    comment: typeof review.comment === "string" ? review.comment : "",
    auditType: typeof review.auditType === "string" ? review.auditType : "",
    createdAt: review.createdAt ?? null,
  };
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
