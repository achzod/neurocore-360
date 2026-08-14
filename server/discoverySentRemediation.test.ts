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

test("provider-based SENT remediation is fail-closed before any provider or transaction", () => {
  const source = readFileSync(new URL("./discoverySentRemediation.ts", import.meta.url), "utf8");
  const start = source.indexOf("export async function regenerateSentDiscoveryInPlace");
  const end = source.indexOf("export async function repairSentDiscoveryFactsInPlace", start);
  const providerRemediation = source.slice(start, end);
  assert.match(providerRemediation, /DISCOVERY_SENT_REMEDIATION_PROVIDER_DISABLED/);
  assert.doesNotMatch(providerRemediation, /analyzeDiscoveryScan|pool\.connect|BEGIN/);
});

test("sent remediation stores canonical Discovery scores with the replacement artifacts", () => {
  const source = readFileSync(new URL("./discoverySentRemediation.ts", import.meta.url), "utf8");
  assert.match(source, /function canonicalDiscoveryScores[\s\S]*report\?\.metrics[\s\S]*scores\.global/);
  assert.match(source, /const canonicalScores = canonicalDiscoveryScores\(report\)/);
  assert.match(source, /report_generated_at = \$5,[\s\S]*scores = \$6::jsonb/);
  assert.match(source, /JSON\.stringify\(canonicalScores\)/);
});

test("deterministic SENT factual repair is exact-hash bound and preserves delivery invariants", () => {
  const source = readFileSync(new URL("./discoverySentRemediation.ts", import.meta.url), "utf8");
  const tail = source.slice(source.indexOf("export async function repairSentDiscoveryFactsInPlace"));
  assert.match(tail, /expectedCurrentHash/);
  assert.match(tail, /repairDiscoveryProvidedFactAbsenceClaims/);
  assert.match(tail, /report_delivery_status = 'SENT'/);
  assert.match(tail, /report_sent_at IS NOT NULL/);
  assert.match(tail, /tracking invariant changed during factual repair/);
  assert.match(tail, /pg_advisory_xact_lock/);
  assert.match(tail, /discovery-global/);
  assert.doesNotMatch(tail, /analyzeDiscoveryScan\(|sendReportReadyEmail\(/);
});

test("regenerated notification path is retired until it owns a durable delivery claim", () => {
  const source = readFileSync(new URL("./discoverySentRemediation.ts", import.meta.url), "utf8");
  const start = source.indexOf("export async function claimRegeneratedReportNotification");
  const retired = source.slice(start);
  assert.match(retired, /DISCOVERY_REGENERATED_NOTIFICATION_RETIRED/);
  assert.doesNotMatch(retired, /INSERT INTO email_tracking/);
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
