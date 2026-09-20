import assert from "node:assert/strict";
import test from "node:test";
import {
  emailCorrectionMessage,
  isLikelyDeliverableEmail,
  suggestedEmailCorrection,
} from "./emailAddressPolicy";

test("accepts normal addresses and rejects known provider-domain typos", () => {
  assert.equal(isLikelyDeliverableEmail("client@gmail.com"), true);
  assert.equal(isLikelyDeliverableEmail("thomas.grzesiak58@glail.com"), false);
  assert.equal(suggestedEmailCorrection("thomas.grzesiak58@glail.com"), "thomas.grzesiak58@gmail.com");
  assert.match(emailCorrectionMessage("thomas.grzesiak58@glail.com") || "", /gmail\.com/);
});
