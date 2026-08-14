import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { CoachingPromoBanner } from "./CoachingPromoBanner";
import { DISCOVERY_REVIEW_PROMO_MESSAGE } from "./coachingPromoPolicy";

test("Discovery banner renders only the review instruction before approval", () => {
  for (const reviewStatus of [undefined, "unknown", "none", "pending", "rejected"] as const) {
    const html = renderToStaticMarkup(
      <CoachingPromoBanner auditType="GRATUIT" reviewStatus={reviewStatus} dismissible={false} />,
    );
    assert.ok(html.includes(DISCOVERY_REVIEW_PROMO_MESSAGE), String(reviewStatus));
    assert.equal(html.includes("SERVER_DISCOVERY_CODE"), false, String(reviewStatus));
    assert.equal(html.includes("Cliquer pour copier"), false, String(reviewStatus));
    assert.equal(html.includes("coaching-essential"), false, String(reviewStatus));
  }
});

test("approved Discovery and paid reports retain their code behavior", () => {
  const approved = renderToStaticMarkup(
    <CoachingPromoBanner auditType="DISCOVERY" reviewStatus="approved" promoCode="SERVER_DISCOVERY_CODE" dismissible={false} />,
  );
  assert.ok(approved.includes("SERVER_DISCOVERY_CODE"));
  assert.ok(approved.includes("Cliquer pour copier"));

  const approvedWithoutServerCode = renderToStaticMarkup(
    <CoachingPromoBanner auditType="DISCOVERY" reviewStatus="approved" dismissible={false} />,
  );
  assert.equal(approvedWithoutServerCode.includes("Cliquer pour copier"), false);

  const paid = renderToStaticMarkup(
    <CoachingPromoBanner auditType="PREMIUM" dismissible={false} />,
  );
  assert.ok(paid.includes("BIOSCAN59"));
  assert.ok(paid.includes("Cliquer pour copier"));
});
