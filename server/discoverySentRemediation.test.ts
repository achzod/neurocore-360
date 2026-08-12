import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  discoveryArtifactHash,
  isRegeneratedNotificationEnabled,
  isSentDiscoveryRemediationEnabled,
  validateRegeneratedNotificationCandidate,
  validateSentFallbackCandidate,
} from "./discoverySentRemediation";
import {
  areAIUsageCostAlertsEnabled,
  areRemediationSideEffectsDisabled,
} from "./openaiResponses";

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

test("a knowledge or provider failure happens before remediation opens a mutation transaction", () => {
  const source = readFileSync(new URL("./discoverySentRemediation.ts", import.meta.url), "utf8");
  const analyzeIndex = source.indexOf("await analyzeDiscoveryScan");
  const connectIndex = source.indexOf("const client = await pool.connect()");
  const beginIndex = source.indexOf('await client.query("BEGIN")');

  assert.ok(analyzeIndex >= 0);
  assert.ok(connectIndex > analyzeIndex);
  assert.ok(beginIndex > connectIndex);
});

test("generation-only remediation hard-locks every delivery and alert side effect", () => {
  const source = readFileSync(new URL("../scripts/remediate-sent-discovery.ts", import.meta.url), "utf8");
  assert.match(source, /REMEDIATION_SIDE_EFFECTS_DISABLED=true is mandatory/);
  assert.match(source, /AI_COST_ALERTS_ENABLED=false is mandatory/);
  assert.match(source, /DISCOVERY_REPORT_DELIVERY_ENABLED must not be true/);
  assert.match(source, /DISCOVERY_REGENERATED_NOTIFICATION_ENABLED must not be true/);
});

test("remediation side-effect guard disables cost-alert emails while preserving normal defaults", () => {
  assert.equal(areAIUsageCostAlertsEnabled({}), true);
  assert.equal(areAIUsageCostAlertsEnabled({ AI_COST_ALERTS_ENABLED: "false" }), false);
  assert.equal(areRemediationSideEffectsDisabled({ REMEDIATION_SIDE_EFFECTS_DISABLED: "true" }), true);
  assert.equal(areAIUsageCostAlertsEnabled({
    AI_COST_ALERTS_ENABLED: "true",
    REMEDIATION_SIDE_EFFECTS_DISABLED: "true",
  }), false);
});
