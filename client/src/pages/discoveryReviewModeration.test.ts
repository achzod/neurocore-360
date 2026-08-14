import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { CoachingPromoBanner } from "../components/CoachingPromoBanner";
import {
  beginDiscoveryReviewModerationRequest,
  createDiscoveryReviewModerationState,
  settleDiscoveryReviewModerationRequest,
  visibleDiscoveryPromoCode,
  visibleDiscoveryReviewStatus,
} from "./discoveryReviewModeration";

test("audit change hides an approved status synchronously before the next request settles", () => {
  const approvedA = {
    auditId: "audit-A",
    requestId: 1,
    status: "approved" as const,
    promoCode: "SERVER_CODE_A",
  };

  assert.equal(visibleDiscoveryReviewStatus(approvedA, "audit-A"), "approved");
  assert.equal(visibleDiscoveryReviewStatus(approvedA, "audit-B"), "unknown");
  assert.equal(visibleDiscoveryPromoCode(approvedA, "audit-B"), null);

  const loadingB = beginDiscoveryReviewModerationRequest("audit-B", 2);
  assert.equal(visibleDiscoveryReviewStatus(loadingB, "audit-B"), "unknown");
});

test("slow approved response for audit A cannot overwrite audit B or expose its promo CTA", async () => {
  let state = createDiscoveryReviewModerationState();
  state = beginDiscoveryReviewModerationRequest("audit-A", 1);

  let resolveSlowA!: () => void;
  const slowA = new Promise<void>((resolve) => { resolveSlowA = resolve; });
  const staleApprovedA = slowA.then(() => {
    state = settleDiscoveryReviewModerationRequest(state, "audit-A", 1, "approved", "SERVER_CODE_A");
  });

  state = beginDiscoveryReviewModerationRequest("audit-B", 2);
  state = settleDiscoveryReviewModerationRequest(state, "audit-B", 2, "none");
  assert.equal(visibleDiscoveryReviewStatus(state, "audit-B"), "none");

  resolveSlowA();
  await staleApprovedA;

  assert.deepEqual(state, { auditId: "audit-B", requestId: 2, status: "none", promoCode: null });
  const visibleStatus = visibleDiscoveryReviewStatus(state, "audit-B");
  const visiblePromoCode = visibleDiscoveryPromoCode(state, "audit-B");
  assert.notEqual(visibleStatus, "approved");
  assert.equal(visiblePromoCode, null);

  const html = renderToStaticMarkup(React.createElement(CoachingPromoBanner, {
    auditType: "GRATUIT",
    reviewStatus: visibleStatus,
    promoCode: visiblePromoCode,
    dismissible: false,
  }));
  assert.equal(html.includes("SERVER_CODE_A"), false);
  assert.equal(html.includes("Cliquer pour copier"), false);
  assert.equal(html.includes("coaching-essential"), false);
});
