import assert from "node:assert/strict";
import test from "node:test";
import { extractSendPulseEvents } from "./sendpulseWebhookEvents";

// Payload réel (anonymisé) reçu en prod le 2026-11-19.
const envelope = {
  "0": {
    task_id: 3395442,
    open_device: "Apple Proxy",
    event: "open",
    browser_name: "Apple Mail Privacy Protection",
    email: "client@example.com",
    timestamp: "1795084533",
  },
  user_id: 7587831,
  scope: "email_service",
  event_type: "open",
  occurred_at: "2026-11-19T10:35:33Z",
  data: {
    action: "open",
    user_id: 7587831,
    data: [
      {
        task_id: 3395442,
        open_device: "Apple Proxy",
        event: "open",
        browser_name: "Apple Mail Privacy Protection",
        email: "client@example.com",
        timestamp: "1795084533",
      },
    ],
    service_id: 0,
    book_id: 0,
  },
};

test("nouvelle enveloppe SendPulse : un seul événement exploitable, sans doublon", () => {
  const events = extractSendPulseEvents(envelope);
  assert.equal(events.length, 1);
  assert.equal(events[0].event, "open");
  assert.equal(events[0].email, "client@example.com");
  assert.equal(events[0].task_id, 3395442);
});

test("enveloppe sans data.data : retombe sur les clés numériques", () => {
  const { data: _data, ...withoutData } = envelope;
  const events = extractSendPulseEvents(withoutData);
  assert.equal(events.length, 1);
  assert.equal(events[0].email, "client@example.com");
});

test("événement sans champ event : reprend l'action de l'enveloppe", () => {
  const events = extractSendPulseEvents({
    event_type: "redirect",
    data: { action: "redirect", data: [{ email: "a@example.com", task_id: 1, link_url: "https://x.y" }] },
  });
  assert.equal(events.length, 1);
  assert.equal(events[0].event, "redirect");
  assert.equal(events[0].link_url, "https://x.y");
});

test("ancien format tableau : inchangé", () => {
  const legacy = [
    { event: "open", email: "a@example.com", task_id: 1 },
    { event: "redirect", email: "b@example.com", task_id: 2, link_url: "https://x.y" },
  ];
  assert.deepEqual(extractSendPulseEvents(legacy), legacy);
});

test("ancien format objet plat : un événement", () => {
  const events = extractSendPulseEvents({ event: "unsubscribe", email: "a@example.com" });
  assert.deepEqual(events, [{ event: "unsubscribe", email: "a@example.com" }]);
});

test("tableau d'enveloppes : chaque enveloppe est dépliée", () => {
  const events = extractSendPulseEvents([envelope, envelope]);
  assert.equal(events.length, 2);
  assert.ok(events.every((e) => e.event === "open" && e.email === "client@example.com"));
});

test("corps vide ou invalide : aucun événement", () => {
  assert.deepEqual(extractSendPulseEvents(null), []);
  assert.deepEqual(extractSendPulseEvents("x"), []);
  assert.deepEqual(extractSendPulseEvents([]), []);
});
