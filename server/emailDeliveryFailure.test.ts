import assert from "node:assert/strict";
import test from "node:test";
import { isTerminalUnsubscribeSignal } from "./emailDeliveryFailure";

test("recognizes explicit provider unsubscribe status", () => {
  assert.equal(isTerminalUnsubscribeSignal({ sendpulseStatus: "unsubscribed" }), true);
});

test("recognizes SendPulse hard-fail payloads even when status is failed", () => {
  assert.equal(isTerminalUnsubscribeSignal({
    sendpulseStatus: "failed",
    sendpulseError: '{"eventType":"hard_fail","smtpAnswerCode":555,"smtpAnswerData":"Unsubscribed"}',
  }), true);
});

test("does not turn an unrelated provider failure into an unsubscribe", () => {
  assert.equal(isTerminalUnsubscribeSignal({
    sendpulseStatus: "failed",
    sendpulseError: '{"smtpAnswerCode":550,"smtpAnswerData":"Mailbox unavailable"}',
  }), false);
});

test("a later successful event clears the terminal latest-event signal", () => {
  assert.equal(isTerminalUnsubscribeSignal({ sendpulseStatus: "success", sendpulseError: null }), false);
});
