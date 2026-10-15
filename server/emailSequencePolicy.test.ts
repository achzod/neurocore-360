import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { isEmailSequenceAttempted } from "./emailSequencePolicy";

test("J30 Discovery nurture is one-shot even when provider status is failed", () => {
  assert.equal(isEmailSequenceAttempted({
    emailType: "sendDiscoveryJ30NurtureEmail",
    sendpulseStatus: "failed",
    sendpulseError: '{"eventType":"soft_fail"}',
  }), true);
});

test("SMTP hard failures and unsubscribes are terminal for every sequence", () => {
  assert.equal(isEmailSequenceAttempted({
    emailType: "sendGratuitJ7Email",
    sendpulseStatus: "failed",
    sendpulseError: '{"eventType":"hard_fail","smtpAnswerCode":555,"smtpAnswerData":"Unsubscribed"}',
  }), true);
  assert.equal(isEmailSequenceAttempted({
    emailType: "sendGratuitJ7Email",
    sendpulseStatus: "unsubscribed",
  }), true);
});

test("other sequences may still retry a genuinely transient provider failure", () => {
  assert.equal(isEmailSequenceAttempted({
    emailType: "sendGratuitJ7Email",
    sendpulseStatus: "failed",
    sendpulseError: '{"eventType":"soft_fail"}',
  }), false);
});

test("Postgres tracking rows expose the provider error used by the policy", () => {
  const storageSource = readFileSync(fileURLToPath(new URL("./storage.ts", import.meta.url)), "utf8");
  assert.match(storageSource, /sendpulseError:\s*row\.sendpulse_error\s*\?\?\s*null/);
});
