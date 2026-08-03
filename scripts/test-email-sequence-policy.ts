import assert from "node:assert/strict";
import {
  getSuppressedSequenceEmailTypes,
  isPermanentEmailFailure,
} from "../server/emailSequencePolicy";

const now = new Date("2026-08-03T12:00:00.000Z");
const row = (overrides: Record<string, unknown> = {}) => ({
  emailType: "discoveryJ14Coaching",
  sendpulseStatus: "failed",
  sendpulseError: "Temporary provider timeout",
  sentAt: "2026-08-03T06:00:00.000Z",
  ...overrides,
});

assert.equal(isPermanentEmailFailure(row({ sendpulseError: "No MX for gmail.col" })), true);
assert.equal(isPermanentEmailFailure(row({ sendpulseError: "Unsubscribed by recipient" })), true);
assert.equal(isPermanentEmailFailure(row()), false);

for (const status of ["success", "sent", "delivered", "pending", "unsubscribed", "auth_failed"]) {
  assert.deepEqual(
    getSuppressedSequenceEmailTypes([row({ sendpulseStatus: status })], now),
    ["discoveryJ14Coaching"],
    `${status} must suppress another sequence attempt`,
  );
}

assert.deepEqual(
  getSuppressedSequenceEmailTypes([row({ sendpulseError: "Bad recipient" })], now),
  ["discoveryJ14Coaching"],
  "a permanent failure must never be retried",
);

assert.deepEqual(
  getSuppressedSequenceEmailTypes([row()], now),
  ["discoveryJ14Coaching"],
  "a transient failure must wait 12 hours",
);

assert.deepEqual(
  getSuppressedSequenceEmailTypes([row({ sentAt: "2026-08-02T20:00:00.000Z" })], now),
  [],
  "one transient failure can be retried after 12 hours",
);

assert.deepEqual(
  getSuppressedSequenceEmailTypes([
    row({ sentAt: "2026-08-02T18:00:00.000Z" }),
    row({ sentAt: "2026-08-02T20:00:00.000Z" }),
  ], now),
  ["discoveryJ14Coaching"],
  "two transient failures must stop the sequence",
);

console.log("Email sequence policy passed: permanent failures are suppressed and transient retries are capped");
