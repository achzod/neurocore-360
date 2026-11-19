import assert from "node:assert/strict";
import test from "node:test";
import {
  applySendPulseSuppressions,
  collectSendPulseSuppressions,
  normalizeSendPulseEventKind,
  suppressionReasonForSendPulseEvent,
  type SendPulseSuppressionReason,
} from "./sendpulseSuppression";

/** Faux stockage : même sémantique que INSERT ... ON CONFLICT (email) DO NOTHING. */
function fakeSuppressionList() {
  const rows = new Map<string, SendPulseSuppressionReason>();
  const calls: string[] = [];
  return {
    rows,
    calls,
    addToSuppressionList: async (email: string, reason: SendPulseSuppressionReason) => {
      calls.push(email);
      if (rows.has(email)) return false;
      rows.set(email, reason);
      return true;
    },
  };
}

test("noms d'événements SendPulse normalisés (SMTP et service email)", () => {
  assert.equal(normalizeSendPulseEventKind("unsubscribe"), "unsubscribe");
  assert.equal(normalizeSendPulseEventKind("unsubscribed"), "unsubscribe");
  assert.equal(normalizeSendPulseEventKind("resubscribed"), "resubscribe");
  assert.equal(normalizeSendPulseEventKind("spam_by_user"), "spam");
  assert.equal(normalizeSendPulseEventKind("spamComplaint"), "spam");
  assert.equal(normalizeSendPulseEventKind("hard_bounces"), "hard_bounce");
  assert.equal(normalizeSendPulseEventKind("hard_bounced"), "hard_bounce");
  assert.equal(normalizeSendPulseEventKind("hardBounce"), "hard_bounce");
  assert.equal(normalizeSendPulseEventKind("soft_bounces"), "soft_bounce");
  assert.equal(normalizeSendPulseEventKind("undelivered"), "undelivered");
  assert.equal(normalizeSendPulseEventKind("delivered"), "delivered");
  assert.equal(normalizeSendPulseEventKind("redirect"), "click");
  assert.equal(normalizeSendPulseEventKind("open"), "open");
});

test("raison de suppression par événement", () => {
  assert.equal(suppressionReasonForSendPulseEvent({ event: "unsubscribe" }), "sendpulse_unsubscribe");
  assert.equal(suppressionReasonForSendPulseEvent({ event: "spam_by_user" }), "sendpulse_spam_complaint");
  assert.equal(suppressionReasonForSendPulseEvent({ event: "hard_bounces" }), "sendpulse_hard_bounce");
  assert.equal(
    suppressionReasonForSendPulseEvent({ event: "undelivered", smtp_answer_code: 550, smtp_answer_data: "5.1.1 user unknown" }),
    "sendpulse_hard_bounce",
  );
  assert.equal(suppressionReasonForSendPulseEvent({ event: "undelivered", response_code: "421" }), null);
  assert.equal(suppressionReasonForSendPulseEvent({ event: "undelivered" }), null);
  assert.equal(suppressionReasonForSendPulseEvent({ event: "soft_bounces", smtp_answer_code: 452 }), null);
  assert.equal(suppressionReasonForSendPulseEvent({ event: "bounce" }), null, "bounce sans code : ambigu, pas ajouté");
  assert.equal(suppressionReasonForSendPulseEvent({ event: "undelivered", smtp_answer_code: 555 }), "sendpulse_unsubscribe");
  assert.equal(suppressionReasonForSendPulseEvent({ event: "open" }), null);
  assert.equal(suppressionReasonForSendPulseEvent({ event: "redirect" }), null);
  assert.equal(suppressionReasonForSendPulseEvent({ event: "resubscribed" }), null);
});

test("un seul événement plat (ancien format SMTP)", async () => {
  const list = fakeSuppressionList();
  const res = await applySendPulseSuppressions(
    { event: "unsubscribe", email: "Client@Example.com ", task_id: 42, timestamp: "1795084533" },
    { addToSuppressionList: list.addToSuppressionList, suppressionEnabled: true },
  );
  assert.deepEqual(res, { added: 1, alreadyPresent: 0, failed: 0 });
  assert.equal(list.rows.get("client@example.com"), "sendpulse_unsubscribe");
});

test("tableau d'événements : désinscription, spam, hard bounce, ouverture ignorée", async () => {
  const list = fakeSuppressionList();
  const body = [
    { event: "unsubscribe", email: "a@example.com" },
    { event: "spam_by_user", recipient: "b@example.com", message_id: "m1" },
    { event: "hard_bounces", email: "c@example.com", task_id: 7, smtp_answer_code: 550 },
    { event: "open", email: "d@example.com" },
    { event: "soft_bounces", email: "e@example.com", smtp_answer_code: 452 },
  ];
  const res = await applySendPulseSuppressions(body, {
    addToSuppressionList: list.addToSuppressionList,
    suppressionEnabled: true,
  });
  assert.deepEqual(res, { added: 3, alreadyPresent: 0, failed: 0 });
  assert.deepEqual(Object.fromEntries(list.rows), {
    "a@example.com": "sendpulse_unsubscribe",
    "b@example.com": "sendpulse_spam_complaint",
    "c@example.com": "sendpulse_hard_bounce",
  });
});

test("nouvelle enveloppe SendPulse : l'événement n'est compté qu'une fois", async () => {
  const flat = { event: "unsubscribe", email: "env@example.com", task_id: 3395442 };
  const envelope = {
    "0": flat,
    event_type: "unsubscribe",
    data: { action: "unsubscribe", data: [flat] },
  };
  const list = fakeSuppressionList();
  const res = await applySendPulseSuppressions(envelope, {
    addToSuppressionList: list.addToSuppressionList,
    suppressionEnabled: true,
  });
  assert.deepEqual(res, { added: 1, alreadyPresent: 0, failed: 0 });
  assert.deepEqual(list.calls, ["env@example.com"]);
});

test("pas de doublon dans un lot, la désinscription l'emporte sur le hard bounce", () => {
  const candidates = collectSendPulseSuppressions(
    [
      { event: "hard_bounces", email: "x@example.com" },
      { event: "unsubscribe", email: "X@example.com" },
      { event: "unsubscribe", email: "x@example.com" },
    ],
    { suppressionEnabled: true },
  );
  assert.deepEqual(candidates, [{ email: "x@example.com", reason: "sendpulse_unsubscribe" }]);
});

test("rejouer le même webhook ne change rien", async () => {
  const list = fakeSuppressionList();
  const body = [
    { event: "unsubscribe", email: "a@example.com" },
    { event: "hard_bounces", email: "c@example.com" },
  ];
  const deps = { addToSuppressionList: list.addToSuppressionList, suppressionEnabled: true };
  const first = await applySendPulseSuppressions(body, deps);
  const snapshot = new Map(list.rows);
  const second = await applySendPulseSuppressions(body, deps);
  assert.deepEqual(first, { added: 2, alreadyPresent: 0, failed: 0 });
  assert.deepEqual(second, { added: 0, alreadyPresent: 2, failed: 0 });
  assert.deepEqual(list.rows, snapshot);
});

test("une adresse déjà désinscrite garde sa raison d'origine", async () => {
  const list = fakeSuppressionList();
  list.rows.set("a@example.com", "sendpulse_unsubscribe");
  await applySendPulseSuppressions([{ event: "hard_bounces", email: "a@example.com" }], {
    addToSuppressionList: list.addToSuppressionList,
    suppressionEnabled: true,
  });
  assert.equal(list.rows.get("a@example.com"), "sendpulse_unsubscribe");
});

test("EMAIL_SUPPRESSION_ENABLED=0 : hard bounces ignorés, désinscriptions et plaintes gardées", async () => {
  const list = fakeSuppressionList();
  await applySendPulseSuppressions(
    [
      { event: "hard_bounces", email: "c@example.com" },
      { event: "unsubscribe", email: "a@example.com" },
      { event: "spam_by_user", email: "b@example.com" },
    ],
    { addToSuppressionList: list.addToSuppressionList, suppressionEnabled: false },
  );
  assert.deepEqual([...list.rows.keys()].sort(), ["a@example.com", "b@example.com"]);
});

test("adresse absente ou invalide : ignorée, une erreur de stockage n'arrête pas le lot", async () => {
  const seen: string[] = [];
  const res = await applySendPulseSuppressions(
    [
      { event: "unsubscribe" },
      { event: "unsubscribe", email: "pas-une-adresse" },
      { event: "unsubscribe", email: "boom@example.com" },
      { event: "unsubscribe", email: "ok@example.com" },
    ],
    {
      suppressionEnabled: true,
      addToSuppressionList: async (email) => {
        seen.push(email);
        if (email === "boom@example.com") throw new Error("db down");
        return true;
      },
    },
  );
  assert.deepEqual(seen, ["boom@example.com", "ok@example.com"]);
  assert.deepEqual(res, { added: 1, alreadyPresent: 0, failed: 1 });
});
