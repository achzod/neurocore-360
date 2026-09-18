import assert from "node:assert/strict";
import test from "node:test";
import {
  choosePeptidesPreviewFollowupStage,
  isEligiblePreviewFollowupEmail,
} from "./peptidesPreviewFollowupRules";

const now = new Date("2026-09-25T12:00:00.000Z");
const tracking = (stage: "J1" | "J3" | "J7", sentAt: string, status = "success") => ({
  emailType: `peptidesPreviewFollowup${stage}`,
  sentAt,
  sendpulseStatus: status,
  sendpulseTaskId: status === "success" ? `task-${stage}` : null,
});

test("J1 becomes due after 24 hours, never before", () => {
  assert.equal(choosePeptidesPreviewFollowupStage(new Date("2026-09-24T12:01:00Z"), [], now), null);
  assert.equal(choosePeptidesPreviewFollowupStage(new Date("2026-09-24T11:59:00Z"), [], now), "J1");
});

test("J3 requires a successful J1 and a 36-hour safety gap", () => {
  const capturedAt = new Date("2026-09-21T00:00:00Z");
  assert.equal(choosePeptidesPreviewFollowupStage(capturedAt, [tracking("J1", "2026-09-24T12:00:00Z")], now), null);
  assert.equal(choosePeptidesPreviewFollowupStage(capturedAt, [tracking("J1", "2026-09-23T00:00:00Z")], now), "J3");
});

test("J7 requires a successful J3 and a 72-hour safety gap", () => {
  const capturedAt = new Date("2026-09-17T12:00:00Z");
  const j1 = tracking("J1", "2026-09-18T12:00:00Z");
  assert.equal(choosePeptidesPreviewFollowupStage(capturedAt, [j1, tracking("J3", "2026-09-23T12:01:00Z")], now), null);
  assert.equal(choosePeptidesPreviewFollowupStage(capturedAt, [j1, tracking("J3", "2026-09-22T11:59:00Z")], now), "J7");
});

test("successful stage tracking is idempotent and stops the sequence", () => {
  const capturedAt = new Date("2026-09-17T12:00:00Z");
  const history = [
    tracking("J1", "2026-09-18T12:00:00Z"),
    tracking("J3", "2026-09-20T12:00:00Z"),
    tracking("J7", "2026-09-24T12:00:00Z"),
  ];
  assert.equal(choosePeptidesPreviewFollowupStage(capturedAt, history, now), null);
});

test("failed attempts do not count as a delivered stage", () => {
  const capturedAt = new Date("2026-09-21T00:00:00Z");
  assert.equal(choosePeptidesPreviewFollowupStage(capturedAt, [tracking("J1", "2026-09-24T00:00:00Z", "failed")], now), "J1");
});

test("stale leads and unsafe addresses are excluded", () => {
  assert.equal(choosePeptidesPreviewFollowupStage(new Date("2026-08-01T00:00:00Z"), [], now), null);
  assert.equal(isEligiblePreviewFollowupEmail("client@gmail.com"), true);
  assert.equal(isEligiblePreviewFollowupEmail("johndoe@yahoo.fr"), false);
  assert.equal(isEligiblePreviewFollowupEmail("qa@test.com"), false);
  assert.equal(isEligiblePreviewFollowupEmail("coaching@achzodcoaching.com"), false);
});
