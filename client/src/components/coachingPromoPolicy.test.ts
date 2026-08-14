import assert from "node:assert/strict";
import test from "node:test";

import {
  canRevealCoachingPromoCode,
  DISCOVERY_REVIEW_PROMO_MESSAGE,
} from "./coachingPromoPolicy";

test("Discovery promo stays hidden until the persisted review is approved", () => {
  for (const kind of ["GRATUIT", "DISCOVERY"] as const) {
    for (const status of [undefined, null, "unknown", "none", "pending", "rejected"] as const) {
      assert.equal(canRevealCoachingPromoCode(kind, status, "SERVER_CODE"), false, `${kind}:${String(status)}`);
    }
    assert.equal(canRevealCoachingPromoCode(kind, "approved"), false, `${kind}:missing-code`);
    assert.equal(canRevealCoachingPromoCode(kind, "approved", "SERVER_CODE"), true, kind);
  }
  assert.equal(DISCOVERY_REVIEW_PROMO_MESSAGE, "Laisse un avis validé pour recevoir -20 % par email.");
  assert.equal(DISCOVERY_REVIEW_PROMO_MESSAGE.includes("DISCOVERY20"), false);
});

test("paid report promo behavior is unchanged when no review status exists", () => {
  for (const kind of ["PREMIUM", "ANABOLIC", "ELITE", "ULTIMATE", "BLOOD_ANALYSIS", "BLOOD", "PEPTIDES_ENGINE", "PEPTIDES"] as const) {
    assert.equal(canRevealCoachingPromoCode(kind, undefined), true, kind);
  }
});
