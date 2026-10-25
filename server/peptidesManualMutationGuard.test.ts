import assert from "node:assert/strict";
import test from "node:test";
import {
  buildPeptidesManualOrderTargetFingerprint,
  buildPeptidesManualTargetFingerprint,
  hashPeptidesManualMutationPayload,
  hashPeptidesManualSourceState,
  validatePeptidesManualOrderTargetLock,
  validatePeptidesManualTargetLock,
  type PeptidesManualTargetLock,
} from "./peptidesManualMutationGuard";
import { hashPeptidesReport } from "./peptidesReleaseHashGate";

const report = {
  clientName: "Viktor",
  qualityVersion: "expert-standard-v1",
  peptides: [{ name: "MOTS-c", dosage: "5 mg" }],
};
const order = {
  id: "b0103e09-dd7e-4905-86b1-60a17f5759cf",
  email: "niangaviktor@gmail.com",
  productType: "PEPTIDES_ENGINE",
  status: "paid",
  metadata: {
    peptidesReportId: "428ef5e8-eb09-4cee-a6b9-58bc33b8c21f",
    peptidesResponses: {
      pep_email: "niangaviktor@gmail.com",
      pep_name: "Viktor",
    },
  },
};
const reportRecord = {
  id: "428ef5e8-eb09-4cee-a6b9-58bc33b8c21f",
  email: "peptides::niangaviktor@gmail.com",
  responses: {
    pep_email: "niangaviktor@gmail.com",
    pep_name: "Viktor",
  },
  report,
};
const basePayload = { apply: true };
const baseTarget = {
  mutation: "repair-live",
  orderId: order.id,
  reportId: reportRecord.id,
  email: order.email,
  expectedClientName: "Viktor",
  expectedCurrentReportSha256: hashPeptidesReport(report),
  expectedSourceSha256: hashPeptidesManualSourceState(order.metadata.peptidesResponses, reportRecord.responses),
  expectedPayloadSha256: hashPeptidesManualMutationPayload(basePayload),
};
const confirmation = `CONFIRM_PEPTIDES_TARGET:${buildPeptidesManualTargetFingerprint(baseTarget)}`;
const targetLock: PeptidesManualTargetLock = { ...baseTarget, confirmation };

function validate(overrides: Partial<PeptidesManualTargetLock> = {}, options: { allowUnlinkedReport?: boolean; requireConfirmation?: boolean } = {}) {
  return validatePeptidesManualTargetLock({
    expectedMutation: "repair-live",
    targetLock: { ...targetLock, ...overrides },
    order,
    reportRecord,
    mutationPayload: basePayload,
    ...options,
  });
}

test("accepts an exact paid-order/report/client/hash lock", () => {
  const result = validate();
  assert.equal(result.ok, true);
  assert.deepEqual(result.errors, []);
});

test("blocks every wrong-client dimension independently", () => {
  const cases: Array<[Partial<PeptidesManualTargetLock>, string]> = [
    [{ mutation: "edit-sections" }, "TARGET_LOCK_MUTATION_MISMATCH"],
    [{ orderId: "0ab0e9c6-6e3e-410c-b357-96427d075a56" }, "TARGET_LOCK_ORDER_ID_MISMATCH"],
    [{ reportId: "7b4f2263-ec63-434f-ab65-dda3f74208f6" }, "TARGET_LOCK_REPORT_ID_MISMATCH"],
    [{ email: "amari.dalil@gmail.com" }, "TARGET_LOCK_ORDER_EMAIL_MISMATCH"],
    [{ expectedClientName: "Youssef" }, "TARGET_LOCK_CLIENT_NAME_MISMATCH"],
    [{ expectedCurrentReportSha256: "0".repeat(64) }, "TARGET_LOCK_REPORT_HASH_MISMATCH"],
    [{ expectedSourceSha256: "0".repeat(64) }, "TARGET_LOCK_SOURCE_HASH_MISMATCH"],
    [{ expectedPayloadSha256: "0".repeat(64) }, "TARGET_LOCK_PAYLOAD_HASH_MISMATCH"],
    [{ confirmation: "CONFIRM_PEPTIDES_TARGET:wrong" }, "TARGET_LOCK_CONFIRMATION_MISMATCH"],
  ];
  for (const [overrides, expectedError] of cases) {
    const result = validate(overrides);
    assert.equal(result.ok, false, JSON.stringify(overrides));
    assert.ok(result.errors.includes(expectedError), `${expectedError}: ${result.errors.join(",")}`);
  }
});

test("blocks a report not linked to the exact order unless relink mode is explicit", () => {
  const unlinkedOrder = { ...order, metadata: { ...order.metadata, peptidesReportId: "other-report" } };
  const strict = validatePeptidesManualTargetLock({
    expectedMutation: "repair-live",
    targetLock,
    order: unlinkedOrder,
    reportRecord,
    mutationPayload: basePayload,
  });
  assert.ok(strict.errors.includes("TARGET_LOCK_LINKED_REPORT_MISMATCH"));

  const relink = validatePeptidesManualTargetLock({
    expectedMutation: "repair-live",
    targetLock,
    order: unlinkedOrder,
    reportRecord,
    mutationPayload: basePayload,
    allowUnlinkedReport: true,
  });
  assert.equal(relink.ok, true);
});

test("blocks source email and source-name cross-contamination", () => {
  const wrongSourceEmail = validatePeptidesManualTargetLock({
    expectedMutation: "repair-live",
    targetLock,
    order,
    reportRecord: { ...reportRecord, responses: { ...reportRecord.responses, pep_email: "other@example.com" } },
    mutationPayload: basePayload,
  });
  assert.ok(wrongSourceEmail.errors.includes("TARGET_LOCK_RESPONSE_EMAIL_MISMATCH"));

  const wrongSourceName = validatePeptidesManualTargetLock({
    expectedMutation: "repair-live",
    targetLock,
    order,
    reportRecord: { ...reportRecord, responses: { ...reportRecord.responses, pep_name: "Youssef Badri" } },
    mutationPayload: basePayload,
  });
  assert.ok(wrongSourceName.errors.includes("TARGET_LOCK_RESPONSE_NAME_MISMATCH"));

  const missingSourceName = validatePeptidesManualTargetLock({
    expectedMutation: "repair-live",
    targetLock,
    order: { ...order, metadata: { ...order.metadata, peptidesResponses: { pep_email: order.email } } },
    reportRecord: { ...reportRecord, responses: { pep_email: order.email } },
    mutationPayload: basePayload,
  });
  assert.ok(missingSourceName.errors.includes("TARGET_LOCK_RESPONSE_NAME_MISSING"));
});

test("rejects ambiguous substring identities instead of guessing a canonical first name", () => {
  const ambiguous = validatePeptidesManualTargetLock({
    expectedMutation: "repair-live",
    targetLock,
    order: {
      ...order,
      metadata: {
        ...order.metadata,
        peptidesResponses: { ...order.metadata.peptidesResponses, pep_name: "Remy Viktor" },
      },
    },
    reportRecord: {
      ...reportRecord,
      responses: { ...reportRecord.responses, pep_name: "Remy Viktor" },
    },
    mutationPayload: basePayload,
  });
  assert.equal(ambiguous.ok, false);
  assert.ok(ambiguous.errors.includes("TARGET_LOCK_RESPONSE_NAME_MISMATCH"));
});

test("binds the complete source state and rejects health-answer drift", () => {
  const changedSource = validatePeptidesManualTargetLock({
    expectedMutation: "repair-live",
    targetLock,
    order,
    reportRecord: {
      ...reportRecord,
      responses: { ...reportRecord.responses, pep_weight: "120 kg" },
    },
    mutationPayload: basePayload,
  });
  assert.equal(changedSource.ok, false);
  assert.ok(changedSource.errors.includes("TARGET_LOCK_SOURCE_HASH_MISMATCH"));
});

test("binds the exact mutation payload and rejects preview/apply drift", () => {
  const changedPayload = validatePeptidesManualTargetLock({
    expectedMutation: "repair-live",
    targetLock,
    order,
    reportRecord,
    mutationPayload: { apply: false },
  });
  assert.equal(changedPayload.ok, false);
  assert.ok(changedPayload.errors.includes("TARGET_LOCK_PAYLOAD_HASH_MISMATCH"));

  assert.equal(
    hashPeptidesManualMutationPayload({ b: 2, nested: { y: 2, x: 1 }, a: 1 }),
    hashPeptidesManualMutationPayload({ a: 1, nested: { x: 1, y: 2 }, b: 2 }),
  );
});

test("preview mode validates identity and returns a confirmation without accepting an apply", () => {
  const preview = validate({ confirmation: undefined }, { requireConfirmation: false });
  assert.equal(preview.ok, true);
  assert.match(preview.requiredConfirmation, /^CONFIRM_PEPTIDES_TARGET:[a-f0-9]{64}$/);

  const apply = validate({ confirmation: undefined });
  assert.equal(apply.ok, false);
  assert.ok(apply.errors.includes("TARGET_LOCK_CONFIRMATION_MISMATCH"));
});

test("order-only mutations require the exact paid order, recipient, source name and confirmation", () => {
  const orderPayload = { skipEmail: true, replaceReportId: null };
  const orderTarget = {
    mutation: "generate-report",
    orderId: order.id,
    email: order.email,
    expectedClientName: "Viktor",
    expectedSourceSha256: hashPeptidesManualSourceState(order.metadata.peptidesResponses, reportRecord.responses),
    expectedPayloadSha256: hashPeptidesManualMutationPayload(orderPayload),
  };
  const orderConfirmation = `CONFIRM_PEPTIDES_ORDER_TARGET:${buildPeptidesManualOrderTargetFingerprint(orderTarget)}`;
  const valid = validatePeptidesManualOrderTargetLock({
    expectedMutation: "generate-report",
    targetLock: { ...orderTarget, confirmation: orderConfirmation },
    order,
    responses: reportRecord.responses,
    mutationPayload: orderPayload,
  });
  assert.equal(valid.ok, true);

  const wrongClient = validatePeptidesManualOrderTargetLock({
    expectedMutation: "generate-report",
    targetLock: { ...orderTarget, expectedClientName: "Youssef", confirmation: orderConfirmation },
    order,
    responses: reportRecord.responses,
    mutationPayload: orderPayload,
  });
  assert.equal(wrongClient.ok, false);
  assert.ok(wrongClient.errors.includes("ORDER_TARGET_LOCK_RESPONSE_NAME_MISMATCH"));
  assert.ok(wrongClient.errors.includes("ORDER_TARGET_LOCK_CONFIRMATION_MISMATCH"));

  const wrongRecipient = validatePeptidesManualOrderTargetLock({
    expectedMutation: "generate-report",
    targetLock: { ...orderTarget, email: "amari.dalil@gmail.com", confirmation: orderConfirmation },
    order,
    responses: reportRecord.responses,
    mutationPayload: orderPayload,
  });
  assert.ok(wrongRecipient.errors.includes("ORDER_TARGET_LOCK_EMAIL_MISMATCH"));
  assert.ok(wrongRecipient.errors.includes("ORDER_TARGET_LOCK_RESPONSE_EMAIL_MISMATCH"));

  const changedPayload = validatePeptidesManualOrderTargetLock({
    expectedMutation: "generate-report",
    targetLock: { ...orderTarget, confirmation: orderConfirmation },
    order,
    responses: reportRecord.responses,
    mutationPayload: { skipEmail: false, replaceReportId: null },
  });
  assert.ok(changedPayload.errors.includes("ORDER_TARGET_LOCK_PAYLOAD_HASH_MISMATCH"));
});
