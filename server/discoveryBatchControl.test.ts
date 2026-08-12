import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  DISCOVERY_BATCH_HARD_COST_USD,
  DISCOVERY_BATCH_SOFT_COST_USD,
  classifyDiscoveryManifestCandidate,
  decodeDiscoveryApprovalBase64,
  discoveryApprovalBindingHash,
  discoveryArtifactContentHash,
  discoverySha256,
  evaluateDiscoveryBudgetReservation,
  isBlockedDiscoveryTestEmail,
  isValidDiscoveryRecipientEmail,
  isDiscoveryGlobalLockActive,
  resolveExactDiscoveryTargets,
  selectDiscoveryTier,
  stableJson,
  validateDiscoveryApproval,
  type DiscoveryApproval,
} from "./discoveryBatchControl";

const emptyTracking = { total: 0, accepted: 0, failed: 0, pending: 0 };

test("stable JSON and manifest hashes do not depend on object key order", () => {
  assert.equal(stableJson({ b: 2, a: { d: 4, c: 3 } }), stableJson({ a: { c: 3, d: 4 }, b: 2 }));
  assert.equal(discoverySha256({ b: 2, a: 1 }), discoverySha256({ a: 1, b: 2 }));
  assert.match(discoveryArtifactContentHash("txt", "html"), /^[a-f0-9]{64}$/);
  assert.notEqual(discoveryArtifactContentHash("tx", "thtml"), discoveryArtifactContentHash("txt", "html"));
});

test("accepted provider tracking is terminal even if the stored report is invalid", () => {
  const result = classifyDiscoveryManifestCandidate({
    id: "a", email: "client@real-domain.fr", type: "GRATUIT",
    deliveryGateOk: false, tracking: { total: 1, accepted: 1, failed: 0, pending: 0 },
  });
  assert.equal(result.cohort, "already_accepted");
});

test("a valid report with no attempt is classified valid-never-sent", () => {
  const result = classifyDiscoveryManifestCandidate({
    id: "a", email: "client@real-domain.fr", type: "GRATUIT",
    deliveryGateOk: true, tracking: emptyTracking,
  });
  assert.deepEqual(result, {
    cohort: "valid_never_sent",
    reasons: ["delivery_gate_pass", "no_delivery_attempt"],
  });
});

test("sent marker without provider acceptance is ambiguous, never resendable", () => {
  const result = classifyDiscoveryManifestCandidate({
    id: "a", email: "client@real-domain.fr", type: "GRATUIT",
    reportSentAt: new Date(), deliveryGateOk: true, tracking: emptyTracking,
  });
  assert.equal(result.cohort, "ambiguous");
  assert.ok(result.reasons.includes("sent_marker_without_acceptance_proof"));
});

test("failed or pending delivery attempts are ambiguous", () => {
  for (const tracking of [
    { total: 1, accepted: 0, failed: 1, pending: 0 },
    { total: 1, accepted: 0, failed: 0, pending: 1 },
  ]) {
    assert.equal(classifyDiscoveryManifestCandidate({
      id: "a", email: "client@real-domain.fr", type: "GRATUIT",
      deliveryGateOk: true, tracking,
    }).cohort, "ambiguous");
  }
});

test("superseded and duplicate candidates are ambiguous and excluded from automation", () => {
  for (const extra of [{ superseded: true }, { duplicateCandidate: true }]) {
    assert.equal(classifyDiscoveryManifestCandidate({
      id: "a", email: "client@real-domain.fr", type: "GRATUIT",
      deliveryGateOk: false, tracking: emptyTracking, ...extra,
    }).cohort, "ambiguous");
  }
});

test("test, malformed and unsubscribed recipients are blocked before any accepted classification", () => {
  const blocked = [
    { email: "test+canary@example.com" },
    { email: "not-an-email" },
    { email: "client@example.com", unsubscribed: true },
  ];
  for (const candidate of blocked) {
    const result = classifyDiscoveryManifestCandidate({
      id: "a", type: "GRATUIT", deliveryGateOk: false,
      tracking: { total: 1, accepted: 1, failed: 0, pending: 0 },
      ...candidate,
    });
    assert.equal(result.cohort, "ambiguous");
  }
  assert.equal(isBlockedDiscoveryTestEmail("test+canary@real.tld"), true);
  assert.equal(isBlockedDiscoveryTestEmail("final-test-discovery@real.tld"), true);
  assert.equal(isBlockedDiscoveryTestEmail("client@example.com"), true);
  assert.equal(isValidDiscoveryRecipientEmail("client@domain.com"), true);
  assert.equal(isValidDiscoveryRecipientEmail("client@localhost"), false);
});

test("proven SMTP hard-fail remains explicitly addressable but terminal for automation", () => {
  const id = "11111111-1111-4111-8111-111111111111";
  const candidate = {
    id, email: "client@real-domain.fr", type: "GRATUIT",
    deliveryGateOk: true,
    tracking: { total: 1, accepted: 1, failed: 1, pending: 0, hardFailed: 1 },
  };
  const classification = classifyDiscoveryManifestCandidate(candidate);
  assert.equal(classification.cohort, "ambiguous");
  assert.ok(classification.reasons.includes("smtp_hard_fail_proven_terminal"));
  assert.deepEqual(resolveExactDiscoveryTargets([candidate], [id]), [candidate]);
});

test("invalid untouched report is the only automatic generation cohort", () => {
  const result = classifyDiscoveryManifestCandidate({
    id: "a", email: "client@real-domain.fr", type: "GRATUIT",
    deliveryGateOk: false, deliveryGateErrors: ["missing_sections"], tracking: emptyTracking,
  });
  assert.equal(result.cohort, "invalid");
  assert.deepEqual(result.reasons, ["delivery_gate:missing_sections"]);
});

test("tiers are deterministic 1, 3, 5, then rest", () => {
  const values = [1, 2, 3, 4, 5, 6, 7];
  assert.deepEqual(selectDiscoveryTier(values, "ONE"), [1]);
  assert.deepEqual(selectDiscoveryTier(values, "THREE"), [1, 2, 3]);
  assert.deepEqual(selectDiscoveryTier(values, "FIVE"), [1, 2, 3, 4, 5]);
  assert.deepEqual(selectDiscoveryTier(values, "REST"), values);
});

test("budget reservation includes the full hard limit before every call", () => {
  const allowed = evaluateDiscoveryBudgetReservation({
    globalBudgetUsd: 2,
    actualCostUsd: 0.2,
    reservedCostUsd: 0.3,
  });
  assert.equal(allowed.ok, true);
  assert.equal(allowed.hardReservationUsd, DISCOVERY_BATCH_HARD_COST_USD);
  assert.equal(allowed.remainingAfterUsd, 0.75);

  const blocked = evaluateDiscoveryBudgetReservation({
    globalBudgetUsd: 1,
    actualCostUsd: 0.2,
    reservedCostUsd: 0.1,
  });
  assert.equal(blocked.ok, false);
  assert.equal(blocked.reason, "global_budget_exhausted");
});

test("policy refuses a per-scan hard limit above 0.75 USD", () => {
  const decision = evaluateDiscoveryBudgetReservation({
    globalBudgetUsd: 10,
    actualCostUsd: 0,
    reservedCostUsd: 0,
    softPerScanUsd: 0.25,
    hardPerScanUsd: 0.750001,
  });
  assert.equal(decision.ok, false);
  assert.equal(decision.reason, "hard_limit_above_policy");
});

test("approval is bound to manifest, commit, tier, item count and exact cost policy", () => {
  const manifestSha256 = "a".repeat(64);
  const targetAuditIds = [
    "11111111-1111-4111-8111-111111111111",
    "22222222-2222-4222-8222-222222222222",
    "33333333-3333-4333-8333-333333333333",
  ];
  const approvalWithoutBinding: Omit<DiscoveryApproval, "approvalBindingSha256"> = {
    schemaVersion: 1,
    manifestSha256,
    commitSha: "commit",
    approvalReference: "telegram:24478",
    expiresAt: "2030-01-01T00:00:00.000Z",
    stage: "GENERATION",
    tier: "THREE",
    targetAuditIds,
    maxItems: 3,
    globalBudgetUsd: 2.25,
    softPerScanUsd: DISCOVERY_BATCH_SOFT_COST_USD,
    hardPerScanUsd: DISCOVERY_BATCH_HARD_COST_USD,
  };
  const approval: DiscoveryApproval = {
    ...approvalWithoutBinding,
    approvalBindingSha256: discoveryApprovalBindingHash(approvalWithoutBinding),
  };
  assert.deepEqual(validateDiscoveryApproval(approval, {
    manifestSha256,
    commitSha: "commit",
    stage: "GENERATION",
    tier: "THREE",
    targetAuditIds,
    itemCount: 3,
    now: new Date("2029-01-01T00:00:00Z"),
  }), []);
  assert.ok(validateDiscoveryApproval({ ...approval, manifestSha256: "b".repeat(64) }, {
    manifestSha256,
    commitSha: "commit",
    stage: "GENERATION",
    tier: "THREE",
    targetAuditIds,
    itemCount: 3,
    now: new Date("2029-01-01T00:00:00Z"),
  }).includes("approval_manifest_hash_mismatch"));
});

test("approval binding changes with the exact target audit list and rejects retargeting", () => {
  const targetA = "11111111-1111-4111-8111-111111111111";
  const targetB = "22222222-2222-4222-8222-222222222222";
  const base: Omit<DiscoveryApproval, "approvalBindingSha256"> = {
    schemaVersion: 1,
    manifestSha256: "a".repeat(64),
    commitSha: "commit",
    approvalReference: "telegram:24478",
    expiresAt: "2030-01-01T00:00:00.000Z",
    stage: "GENERATION",
    tier: "ONE",
    targetAuditIds: [targetA],
    maxItems: 1,
    globalBudgetUsd: 0.75,
    softPerScanUsd: DISCOVERY_BATCH_SOFT_COST_USD,
    hardPerScanUsd: DISCOVERY_BATCH_HARD_COST_USD,
  };
  const approval: DiscoveryApproval = { ...base, approvalBindingSha256: discoveryApprovalBindingHash(base) };
  assert.notEqual(
    approval.approvalBindingSha256,
    discoveryApprovalBindingHash({ ...base, targetAuditIds: [targetB] }),
  );
  const retargeted = { ...approval, targetAuditIds: [targetB] };
  const errors = validateDiscoveryApproval(retargeted, {
    manifestSha256: base.manifestSha256,
    commitSha: base.commitSha,
    stage: "GENERATION",
    tier: "ONE",
    targetAuditIds: [targetB],
    itemCount: 1,
    now: new Date("2029-01-01T00:00:00Z"),
  });
  assert.ok(errors.includes("approval_binding_hash_mismatch"));
});

test("base64 approval transport is canonical, bounded and never reflects its payload", () => {
  const approval = {
    schemaVersion: 1,
    manifestSha256: "a".repeat(64),
    commitSha: "commit",
    approvalReference: "telegram:24478",
    expiresAt: "2030-01-01T00:00:00.000Z",
    stage: "GENERATION",
    tier: "ONE",
    targetAuditIds: ["11111111-1111-4111-8111-111111111111"],
    approvalBindingSha256: "b".repeat(64),
    maxItems: 1,
    globalBudgetUsd: 0.75,
    softPerScanUsd: 0.25,
    hardPerScanUsd: 0.75,
  } as const;
  const encoded = Buffer.from(JSON.stringify(approval), "utf8").toString("base64");
  assert.deepEqual(decodeDiscoveryApprovalBase64(encoded), approval);
  assert.throws(
    () => decodeDiscoveryApprovalBase64("not-base64:client@private.example"),
    (error: unknown) => error instanceof Error
      && error.message === "DISCOVERY_BATCH_APPROVAL_B64_INVALID"
      && !error.message.includes("client@private.example"),
  );
  assert.throws(
    () => decodeDiscoveryApprovalBase64(Buffer.from("client@private.example", "utf8").toString("base64")),
    (error: unknown) => error instanceof Error
      && error.message === "DISCOVERY_BATCH_APPROVAL_JSON_INVALID"
      && !error.message.includes("client@private.example"),
  );
  assert.throws(() => decodeDiscoveryApprovalBase64("A".repeat(24_000)), /APPROVAL_B64_TOO_LARGE/);
});

test("target resolution is exact, ordered and fail-closed", () => {
  const idA = "11111111-1111-4111-8111-111111111111";
  const idB = "22222222-2222-4222-8222-222222222222";
  const items = [{ id: idA, label: "Sophie" }, { id: idB, label: "Other" }];
  assert.deepEqual(resolveExactDiscoveryTargets(items, [idA]), [items[0]]);
  assert.deepEqual(resolveExactDiscoveryTargets(items, [idB, idA]), [items[1], items[0]]);
  assert.throws(() => resolveExactDiscoveryTargets(items, []), /TARGETS_REQUIRED/);
  assert.throws(() => resolveExactDiscoveryTargets(items, [idA, idA]), /TARGET_DUPLICATE/);
  assert.throws(() => resolveExactDiscoveryTargets(items, ["33333333-3333-4333-8333-333333333333"]), /TARGET_NOT_IN_MANIFEST/);
  assert.throws(() => resolveExactDiscoveryTargets(items, ["not-an-id"]), /TARGET_ID_INVALID/);
});

test("lock check fails closed when DB lookup fails", async () => {
  const active = await isDiscoveryGlobalLockActive({
    query: async () => { throw new Error("db unavailable"); },
  } as any);
  assert.equal(active, true);
});

test("migration enforces mono-call, unique delivery claim and unique artifact content", () => {
  const sql = readFileSync(new URL("../migrations/003_discovery_batch_safety.sql", import.meta.url), "utf8");
  assert.match(sql, /CHECK \(provider_calls >= 0 AND provider_calls <= 1\)/);
  assert.match(sql, /UNIQUE \(audit_id, email_type\)/);
  assert.match(sql, /report_artifacts_audit_content_uq/);
  assert.match(sql, /UNIQUE \(manifest_sha256, stage, tier\)/);
});

test("generation and persistence are transactionally claimed and use BATCH_READY", () => {
  const source = readFileSync(new URL("./discoveryBatchControl.ts", import.meta.url), "utf8");
  assert.match(source, /provider_calls = 1/);
  assert.match(source, /provider_calls = 0/);
  assert.match(source, /await client\.query\("BEGIN"\)/);
  assert.match(source, /report_delivery_status = 'BATCH_READY'/);
  assert.match(source, /ON CONFLICT \(audit_id, content_sha256\)/);
});

test("generic monitoring, generation and AutoSend all honor the durable lock", () => {
  const monitoring = readFileSync(new URL("./monitoring.ts", import.meta.url), "utf8");
  const generation = readFileSync(new URL("./discoveryGenerationService.ts", import.meta.url), "utf8");
  const routes = readFileSync(new URL("./routes.ts", import.meta.url), "utf8");
  const storage = readFileSync(new URL("./storage.ts", import.meta.url), "utf8");
  const sentRemediation = readFileSync(new URL("./discoverySentRemediation.ts", import.meta.url), "utf8");
  assert.match(monitoring, /await isDiscoveryGlobalLockActive\(\)/);
  assert.match(generation, /await isDiscoveryGlobalLockActive\(\)/);
  assert.match(routes, /discovery_batch_lock_active/);
  assert.match(routes, /audit\.type === "GRATUIT" && discoveryBatchLocked/);
  assert.match(routes, /Discovery Scan temporairement en maintenance/);
  assert.match(storage, /SELECT 1 FROM discovery_operation_lock l/);
  assert.match(sentRemediation, /Discovery batch lock active; sent remediation is blocked/);
});

test("reconciler is read-only by default and delivery claims before provider", () => {
  const source = readFileSync(new URL("../scripts/discovery-safe-reconciler.ts", import.meta.url), "utf8");
  assert.match(source, /if \(!args\.has\("--run-generation"\) && !args\.has\("--run-delivery"\)\)/);
  assert.match(source, /Default: read-only manifest/);
  assert.ok(source.indexOf("claimDiscoveryBatchEmailDelivery({") < source.indexOf("sendReportReadyEmail(item.email"));
  assert.ok(source.indexOf("markDiscoveryDeliveryProviderPostStarted(claimId)") < source.indexOf("sendReportReadyEmail(item.email"));
  assert.match(source, /AI_COST_ALERTS_ENABLED/);
  assert.match(source, /DISCOVERY_REPORT_DELIVERY_ENABLED/);
  assert.match(source, /resolveExactDiscoveryTargets\(manifest\.items, approval\.targetAuditIds\)/);
  assert.doesNotMatch(source, /selectDiscoveryTier\(eligible, tier\)/);
  assert.match(source, /recipient_unsubscribed/);
  assert.match(source, /test_email_blocked/);
  assert.match(source, /DISCOVERY_BATCH_TARGET_INELIGIBLE/);
  assert.match(source, /DISCOVERY_BATCH_UNSUBSCRIBE_TABLE_MISSING/);
  assert.doesNotMatch(source, /FALSE AS unsubscribed/);
  assert.match(source, /process\.env\.DISCOVERY_BATCH_APPROVAL_B64/);
  assert.match(source, /approvalSource = "env:DISCOVERY_BATCH_APPROVAL_B64"/);
  assert.doesNotMatch(source, /valueAfter\("--approval-base64"\)/);
  assert.match(source, /smtp_hard_fail_proven_terminal/);
  assert.match(source, /tracking\.total !== 0/);
  assert.match(source, /t\.sendpulse_task_id IS NOT NULL/);
  assert.match(source, /sendpulseSmtpAnswerCode',''\) ~ '\^5\[0-9\]\{2\}\$'/);
  assert.match(source, /args\.has\("--summary-only"\)/);
  assert.match(source, /DISCOVERY_BATCH_MANIFEST_SUMMARY/);
  assert.match(source, /emailSha256: discoverySha256/);
});
