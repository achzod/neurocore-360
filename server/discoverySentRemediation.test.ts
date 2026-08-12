import assert from "node:assert/strict";
import test from "node:test";

import {
  discoveryArtifactHash,
  isRegeneratedNotificationEnabled,
  isSentDiscoveryRemediationEnabled,
  validateRegeneratedNotificationCandidate,
  validateSentFallbackCandidate,
} from "./discoverySentRemediation";

test("artifact hash is deterministic and separates TXT from HTML", () => {
  assert.equal(discoveryArtifactHash("abc", "def"), discoveryArtifactHash("abc", "def"));
  assert.notEqual(discoveryArtifactHash("ab", "cdef"), discoveryArtifactHash("abc", "def"));
  assert.match(discoveryArtifactHash("abc", "def"), /^[0-9a-f]{64}$/);
});

test("both SENT remediation switches default off", () => {
  assert.equal(isSentDiscoveryRemediationEnabled({}), false);
  assert.equal(isRegeneratedNotificationEnabled({}), false);
  assert.equal(isSentDiscoveryRemediationEnabled({ DISCOVERY_SENT_REMEDIATION_ENABLED: "true" }), true);
  assert.equal(isRegeneratedNotificationEnabled({ DISCOVERY_REGENERATED_NOTIFICATION_ENABLED: "true" }), true);
});

test("replacement requires exact delivered fallback hash and rejects premium", () => {
  const hash = "a".repeat(64);
  assert.deepEqual(validateSentFallbackCandidate({
    type: "GRATUIT", status: "SENT", reportSentAt: new Date(), currentHash: hash,
    expectedPreviousFallbackHash: hash, currentPremium: false,
  }), []);
  assert.deepEqual(validateSentFallbackCandidate({
    type: "GRATUIT", status: "SENT", reportSentAt: new Date(), currentHash: hash,
    expectedPreviousFallbackHash: "b".repeat(64), currentPremium: true,
  }), ["fallback_hash_mismatch", "already_premium"]);
  assert.deepEqual(validateSentFallbackCandidate({
    type: "GRATUIT", status: "SENT", reportSentAt: new Date(), currentHash: hash,
    expectedPreviousFallbackHash: hash, currentPremium: false, supersededTerminal: true,
  }), ["superseded_terminal"]);
});

test("notification requires premium provenance and becomes one-shot after claim", () => {
  const oldHash = "a".repeat(64);
  const premiumHash = "b".repeat(64);
  const base = {
    status: "SENT", reportSentAt: new Date(), expectedPreviousFallbackHash: oldHash,
    provenancePreviousFallbackHash: oldHash, currentPremium: true,
    currentPremiumHash: premiumHash, provenancePremiumHash: premiumHash,
  };
  assert.deepEqual(validateRegeneratedNotificationCandidate({ ...base, alreadyClaimed: false }), []);
  assert.deepEqual(validateRegeneratedNotificationCandidate({ ...base, alreadyClaimed: true }), ["already_claimed"]);
  assert.ok(validateRegeneratedNotificationCandidate({
    ...base, provenancePremiumHash: "c".repeat(64), alreadyClaimed: false,
  }).includes("premium_hash_mismatch"));
  assert.deepEqual(validateRegeneratedNotificationCandidate({
    ...base, alreadyClaimed: false, supersededTerminal: true,
  }), ["superseded_terminal"]);
});
