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

test("une étape de séquence ratée 2 fois est close (fin de la boucle toutes les 30 min)", async () => {
  const { collectAttemptedSequenceTypes } = await import("./emailSequencePolicy");
  const quota = { emailType: "sendGratuitJ7Email", sendpulseStatus: "failed", sendpulseError: '{"message":"quota"}' };
  assert.equal(collectAttemptedSequenceTypes([quota]).has("sendGratuitJ7Email"), false, "1 échec : un nouvel essai reste permis");
  assert.equal(collectAttemptedSequenceTypes([quota, quota]).has("sendGratuitJ7Email"), true, "2 échecs : étape close");
  assert.equal(
    collectAttemptedSequenceTypes([{ emailType: "sendGratuitJ5Email", sendpulseStatus: "suppressed" }]).has("sendGratuitJ5Email"),
    true,
    "un blocage par la liste de suppression clôt l'étape",
  );
  assert.equal(
    collectAttemptedSequenceTypes([{ emailType: "sendGratuitJ5Email", sendpulseStatus: "success" }]).has("sendGratuitJ5Email"),
    true,
  );
});
