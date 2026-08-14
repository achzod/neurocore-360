import assert from "node:assert/strict";
import test from "node:test";

import { buildPublicReviewCheckResponse } from "./reviewPublicResponse";

test("public review check omits promo data before persisted approval", () => {
  for (const status of ["pending", "rejected", "unknown"]) {
    const result = buildPublicReviewCheckResponse(
      { status, promoCode: "SHOULD_NEVER_LEAK" },
      "SERVER_APPROVED_CODE",
    );
    assert.deepEqual(result, {
      success: true,
      hasReview: true,
      review: { status },
    });
    assert.equal("promoCode" in result.review!, false);
  }

  assert.deepEqual(buildPublicReviewCheckResponse(null, "SERVER_APPROVED_CODE"), {
    success: true,
    hasReview: false,
    review: null,
  });
});

test("public review check returns the server code only for persisted approved status", () => {
  assert.deepEqual(
    buildPublicReviewCheckResponse({ status: "approved" }, "SERVER_APPROVED_CODE"),
    {
      success: true,
      hasReview: true,
      review: { status: "approved", promoCode: "SERVER_APPROVED_CODE" },
    },
  );
  assert.deepEqual(
    buildPublicReviewCheckResponse({ status: "approved" }, null),
    { success: true, hasReview: true, review: { status: "approved" } },
  );
});
