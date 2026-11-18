import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  assertInPlaceSideEffectsDisabled,
  classifyDiscoveryInPlaceCandidate,
  discoveryInPlaceArtifactHash,
  discoveryInPlaceSha256,
  isDiscoveryTestAudit,
  validateInPlaceV3Report,
} from "./discoveryInPlaceRegeneration";
import { evaluateDiscoveryInPlaceReservation } from "./aiCostBudgetController";
import { discoveryArtifactHash } from "./discoverySentRemediation";
import {
  DISCOVERY_INPLACE_MAX_CALLS_PER_ITEM,
  DISCOVERY_INPLACE_MAX_RUN_USD,
  discoveryInPlaceIncidentKey,
} from "./discoveryInPlaceRegenerationSchema";

const source = readFileSync(new URL("./discoveryInPlaceRegeneration.ts", import.meta.url), "utf8");
const controller = readFileSync(new URL("./aiCostBudgetController.ts", import.meta.url), "utf8");
const script = readFileSync(new URL("../scripts/regenerate-discovery-in-place.ts", import.meta.url), "utf8");

const base = { type: "GRATUIT", reportSentAt: new Date(), reportVersion: 2, email: "client@gmail.com", firstName: "Lea" };

test("every existing delivery status is covered and kept as is", () => {
  assert.deepEqual(classifyDiscoveryInPlaceCandidate({ ...base, status: "SENT" }), []);
  for (const status of ["NEEDS_REVIEW", "DELIVERY_BLOCKED", "BATCH_READY"]) {
    assert.deepEqual(classifyDiscoveryInPlaceCandidate({ ...base, status, reportSentAt: null }), []);
  }
});

test("statuses that AutoSend or a live generation owns are refused", () => {
  for (const status of ["READY", "PENDING", "SCHEDULED", "GENERATING", "SUPERSEDED", "EMAIL_FAILED"]) {
    assert.ok(classifyDiscoveryInPlaceCandidate({ ...base, status, reportSentAt: null })
      .some((reason) => reason.startsWith("status_not_allowed")), status);
  }
  assert.ok(classifyDiscoveryInPlaceCandidate({ ...base, status: "SENT", reportSentAt: null })
    .includes("sent_without_report_sent_at"));
  assert.ok(classifyDiscoveryInPlaceCandidate({ ...base, status: "NEEDS_REVIEW" })
    .includes("report_sent_at_without_sent_status"));
});

test("already v3, superseded and test audits are skipped", () => {
  assert.ok(classifyDiscoveryInPlaceCandidate({ ...base, status: "SENT", reportVersion: 3 }).includes("already_v3"));
  assert.ok(classifyDiscoveryInPlaceCandidate({ ...base, status: "SENT", supersededTerminal: true }).includes("superseded_terminal"));
  assert.ok(classifyDiscoveryInPlaceCandidate({ ...base, status: "DELIVERY_BLOCKED", reportSentAt: null,
    email: "test-audit-qa@example.com", firstName: "TEST-AUDIT" }).includes("test_audit"));
  assert.equal(isDiscoveryTestAudit({ email: "x@example.com" }), true);
  assert.equal(isDiscoveryTestAudit({ email: "real@gmail.com", firstName: "Test-audit" }), true);
  assert.equal(isDiscoveryTestAudit({ email: "real@gmail.com", firstName: "Lea" }), false);
});

test("artifact hash matches the SENT remediation hash and stable sha ignores key order", () => {
  assert.equal(discoveryInPlaceArtifactHash("a", "b"), discoveryArtifactHash("a", "b"));
  assert.equal(discoveryInPlaceSha256({ a: 1, b: [1, { c: 2, d: 3 }] }), discoveryInPlaceSha256({ b: [1, { d: 3, c: 2 }], a: 1 }));
  assert.notEqual(discoveryInPlaceSha256({ a: 1 }), discoveryInPlaceSha256({ a: 2 }));
});

test("side-effect guards are mandatory before any provider call", () => {
  assert.throws(() => assertInPlaceSideEffectsDisabled({}), /REMEDIATION_SIDE_EFFECTS_DISABLED/);
  assert.throws(() => assertInPlaceSideEffectsDisabled({ REMEDIATION_SIDE_EFFECTS_DISABLED: "true" }), /AI_COST_ALERTS_ENABLED/);
  assert.throws(() => assertInPlaceSideEffectsDisabled({
    REMEDIATION_SIDE_EFFECTS_DISABLED: "true", AI_COST_ALERTS_ENABLED: "false", DISCOVERY_REPORT_DELIVERY_ENABLED: "true",
  }), /DISCOVERY_REPORT_DELIVERY_ENABLED/);
  assert.doesNotThrow(() => assertInPlaceSideEffectsDisabled({
    REMEDIATION_SIDE_EFFECTS_DISABLED: "true", AI_COST_ALERTS_ENABLED: "false",
  }));
  assert.ok(source.indexOf("assertInPlaceSideEffectsDisabled(input.env") < source.indexOf("claimInPlaceItem(input.runId"));
});

test("cost ledger: one call, one corrective retry, run ceiling enforced", () => {
  const ok = { itemCalls: 0, itemUnsettled: 0, validationRetry: false, runSpentUsd: 0, runMaxUsd: 15, perCallUsd: 0.25 };
  assert.equal(evaluateDiscoveryInPlaceReservation(ok), null);
  assert.equal(evaluateDiscoveryInPlaceReservation({ ...ok, itemCalls: 1, validationRetry: true }), null);
  assert.equal(evaluateDiscoveryInPlaceReservation({ ...ok, itemCalls: 1 }), "DISCOVERY_INPLACE_SECOND_CALL_MUST_BE_RETRY");
  assert.equal(evaluateDiscoveryInPlaceReservation({ ...ok, validationRetry: true }), "DISCOVERY_INPLACE_RETRY_WITHOUT_FIRST_CALL");
  assert.equal(evaluateDiscoveryInPlaceReservation({ ...ok, itemCalls: DISCOVERY_INPLACE_MAX_CALLS_PER_ITEM, validationRetry: true }),
    "DISCOVERY_INPLACE_CALL_LIMIT_REACHED");
  assert.equal(evaluateDiscoveryInPlaceReservation({ ...ok, itemCalls: 1, itemUnsettled: 1, validationRetry: true }),
    "DISCOVERY_INPLACE_UNSETTLED_CALL");
  assert.equal(evaluateDiscoveryInPlaceReservation({ ...ok, runSpentUsd: 14.8 }), "DISCOVERY_INPLACE_RUN_BUDGET_EXHAUSTED");
  assert.equal(evaluateDiscoveryInPlaceReservation({ ...ok, runMaxUsd: DISCOVERY_INPLACE_MAX_RUN_USD + 1 }), "DISCOVERY_INPLACE_RUN_CAP_INVALID");
  assert.equal(DISCOVERY_INPLACE_MAX_RUN_USD, 15);
  assert.equal(discoveryInPlaceIncidentKey("ABC"), "discovery-inplace:abc");
});

test("controller keeps the per-call reservation, the fence and the lifetime per-audit ceiling", () => {
  assert.match(controller, /DISCOVERY_PER_CALL_RESERVATION_USD = 0\.25/);
  assert.match(controller, /filter\(Boolean\)\.length !== 1[\s\S]*DISCOVERY_PROVIDER_OWNERSHIP_REQUIRED/);
  assert.match(controller, /DISCOVERY_INPLACE_PROVIDER_OWNERSHIP_LOST/);
  assert.match(controller, /DISCOVERY_INPLACE_PROVIDER_FENCE_STALE/);
  assert.match(controller, /perOrderUsd: 0\.75/);
  // The per-order USD check (evaluateAICostBudget) still runs for in-place calls.
  const discoveryBlock = controller.slice(controller.indexOf("if (hasInPlaceOwnership) {"));
  assert.ok(discoveryBlock.indexOf("evaluateAICostBudget(spend, reservedUsd, limits)") > 0);
});

test("the swap never writes delivery state and is a CAS on the exact previous report", () => {
  const swap = source.slice(source.indexOf("async function swapInPlace"), source.indexOf("export async function restoreDiscoveryReportFromBackup"));
  const update = swap.slice(swap.indexOf("`UPDATE audits"), swap.indexOf("RETURNING id`", swap.indexOf("`UPDATE audits")));
  assert.doesNotMatch(update.split("WHERE")[0], /report_delivery_status|report_sent_at|report_generated_at/);
  assert.match(update, /report_delivery_status = \$6/);
  assert.match(update, /report_sent_at IS NOT DISTINCT FROM \$7::timestamptz/);
  assert.match(update, /report_txt IS NOT DISTINCT FROM \$8/);
  assert.match(update, /report_html IS NOT DISTINCT FROM \$9/);
  assert.match(swap, /DISCOVERY_INPLACE_REPORT_CHANGED_MEANWHILE/);
  assert.match(swap, /DISCOVERY_INPLACE_DELIVERY_SIDE_EFFECT_DETECTED/);
  assert.match(swap, /DISCOVERY_INPLACE_INVARIANT_CHANGED/);
  assert.match(swap, /DISCOVERY_INPLACE_PROVIDER_LEDGER_MISMATCH/);
  assert.doesNotMatch(source, /'READY'|'PENDING'|'SCHEDULED'|'GENERATING',?\s*report_delivery_status|SET report_delivery_status/);
});

test("no email, sequence or AutoSend code is reachable from the in-place path", () => {
  for (const text of [source, script]) {
    assert.doesNotMatch(text, /emailService|sendReport|sendDiscovery|sendpulse|scheduleSequence|INSERT INTO email_tracking/i);
  }
});

test("backup is written before any provider call and failure keeps the previous report", () => {
  assert.match(source, /INSERT INTO discovery_report_backups/);
  const claim = source.indexOf("INSERT INTO discovery_report_backups");
  const provider = source.indexOf("runOpenAIText({", claim);
  assert.ok(claim > 0 && provider > claim);
  assert.match(source, /SET state = 'FAILED'/);
  assert.match(source, /DISCOVERY_INPLACE_V3_GATE_FAILED/);
  assert.match(source, /validateDiscoveryReportForDelivery/);
  assert.match(source, /validateDiscoveryReportAgainstResponses/);
  assert.match(source, /evaluateDiscoveryDeliveryGate/);
  assert.match(source, /validateDiscoveryPersistenceContract/);
});

test("v3 structural gate: 7 sections, no placeholder, first name in intro", () => {
  const narrative = { intro: "", lecture: "", freins: [], actions: [], si_rien_ne_change: "", dans_6_mois: "", domaines: {}, offre: "" };
  const errors = validateInPlaceV3Report({
    generationQuality: { version: 2 }, clientName: "Lea",
    sections: [{ id: "intro", content: "<p>Salut [PRENOM]</p>" }],
  }, { txt: "[PRENOM]", html: "" }, narrative);
  assert.ok(errors.includes("v3:version"));
  assert.ok(errors.some((error) => error.startsWith("v3:sections")));
  assert.ok(errors.includes("v3:first_name_token_left"));
  assert.ok(errors.includes("v3:first_name_missing_in_intro"));
  assert.ok(errors.some((error) => error.startsWith("v3:words")));
});

test("script is read-only by default and bounded", () => {
  assert.match(script, /if \(!has\("--execute"\)\) return;/);
  assert.match(script, /MAX_ITEMS_PER_INVOCATION = 25/);
  assert.match(script, /DISCOVERY_INPLACE_MAX_CONCURRENCY/);
  assert.match(script, /assertInPlaceSideEffectsDisabled\(\)/);
});
