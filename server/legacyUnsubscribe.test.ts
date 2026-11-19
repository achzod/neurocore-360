import assert from "node:assert/strict";
import test from "node:test";
import {
  LEGACY_UNSUBSCRIBE_PATH,
  createFixedWindowLimiter,
  createLegacyUnsubscribeHandlers,
  decodeLegacyUnsubscribeToken,
} from "./legacyUnsubscribe";

function fakeRes() {
  const res: any = { statusCode: 200, headers: {} as Record<string, string>, body: "" };
  res.setHeader = (k: string, v: string) => { res.headers[k.toLowerCase()] = v; };
  res.status = (code: number) => { res.statusCode = code; return res; };
  res.send = (body: string) => { res.body = body; return res; };
  return res;
}

const b64url = (s: string) => Buffer.from(s).toString("base64url");
const b64 = (s: string) => Buffer.from(s).toString("base64");

test("décodage : base64url et base64 classique (anciens liens), refus des formes invalides", () => {
  assert.equal(decodeLegacyUnsubscribeToken(b64url("Client@Example.fr")), "client@example.fr");
  assert.equal(decodeLegacyUnsubscribeToken(b64("client+tag@example.fr")), "client+tag@example.fr");
  assert.equal(decodeLegacyUnsubscribeToken(b64("client@example.fr").replace(/=+$/, "")), "client@example.fr");
  assert.equal(decodeLegacyUnsubscribeToken(b64url("pas-une-adresse")), null);
  assert.equal(decodeLegacyUnsubscribeToken("<script>"), null);
  assert.equal(decodeLegacyUnsubscribeToken(undefined), null);
  assert.equal(decodeLegacyUnsubscribeToken("a".repeat(500)), null);
});

test("GET ne désinscrit personne : page de confirmation avec un formulaire POST", async () => {
  const calls: string[] = [];
  const h = createLegacyUnsubscribeHandlers({ unsubscribe: async (e) => { calls.push(e); }, log: () => {} });
  const token = b64url("client@example.fr");
  const res = fakeRes();
  await h.get({ query: { email: token }, headers: {} } as any, res);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(calls, []);
  assert.ok(res.body.includes('method="post"'));
  assert.ok(res.body.includes(`${LEGACY_UNSUBSCRIBE_PATH}?email=${encodeURIComponent(token)}`));
  assert.ok(res.body.includes("cl****@example.fr"));
  assert.equal(res.body.includes("client@example.fr"), false);
  assert.equal(res.headers["cache-control"], "no-store");

  const bad = fakeRes();
  await h.get({ query: { email: "xx" }, headers: {} } as any, bad);
  assert.equal(bad.statusCode, 400);
  assert.deepEqual(calls, []);
});

test("POST désinscrit depuis la page (lien en query ou champ de formulaire)", async () => {
  const calls: Array<[string, string]> = [];
  const h = createLegacyUnsubscribeHandlers({ unsubscribe: async (e, r) => { calls.push([e, r]); }, log: () => {} });
  const res = fakeRes();
  await h.post({ query: { email: b64url("client@example.fr") }, body: {}, headers: {} } as any, res);
  assert.equal(res.statusCode, 200);
  const res2 = fakeRes();
  await h.post({ query: {}, body: { email: b64("autre@example.fr") }, headers: {} } as any, res2);
  assert.equal(res2.statusCode, 200);
  assert.deepEqual(calls, [
    ["client@example.fr", "legacy_unsubscribe_page"],
    ["autre@example.fr", "legacy_unsubscribe_page"],
  ]);

  const invalid = fakeRes();
  await h.post({ query: {}, body: { email: "client@example.fr" }, headers: {} } as any, invalid);
  assert.equal(invalid.statusCode, 400);
  assert.equal(calls.length, 2);
});

test("POST limité par IP (429) sans écriture au-delà de la limite", async () => {
  const calls: string[] = [];
  let t = 0;
  const limiter = createFixedWindowLimiter({ windowMs: 1000, maxPerKey: 2, maxTotal: 100, now: () => t });
  const h = createLegacyUnsubscribeHandlers({ unsubscribe: async (e) => { calls.push(e); }, limiter, log: () => {} });
  const req = (n: number, ip = "1.2.3.4") => ({
    query: { email: b64url(`c${n}@example.fr`) }, body: {}, headers: { "x-forwarded-for": `${ip}, 10.0.0.1` },
  }) as any;
  const codes: number[] = [];
  for (let i = 0; i < 4; i++) { const r = fakeRes(); await h.post(req(i), r); codes.push(r.statusCode); }
  assert.deepEqual(codes, [200, 200, 429, 429]);
  assert.equal(calls.length, 2);
  const other = fakeRes();
  await h.post(req(9, "5.6.7.8"), other);
  assert.equal(other.statusCode, 200);
  t = 1500;
  const later = fakeRes();
  await h.post(req(10), later);
  assert.equal(later.statusCode, 200);
});

test("limite totale : bloque même en changeant d'IP", () => {
  const allow = createFixedWindowLimiter({ windowMs: 1000, maxPerKey: 10, maxTotal: 3, now: () => 0 });
  assert.deepEqual(["a", "b", "c", "d"].map((ip) => allow(ip)), [true, true, true, false]);
});
