import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

process.env.DATABASE_URL ||= "postgresql://test:test@127.0.0.1:5432/test";
const { MemStorage } = await import("./storage");

const EMAIL = "client@example.com";

function track(storage: any, row: Record<string, unknown>) {
  const id = `t-${Math.random().toString(36).slice(2)}`;
  storage.emailTrackings.set(id, { id, auditId: "", recipientEmail: EMAIL, sentAt: new Date(), openedAt: null, clickedAt: null, ...row });
}

test("confirmation Peptides : dedup par commande, pas par adresse", async () => {
  const storage: any = new MemStorage();
  const firstCreated = new Date(Date.now() - 30 * 24 * 3600e3);
  track(storage, { emailType: "sendPeptidesOrderConfirmation", metadata: { orderId: "order-1" }, sentAt: new Date(firstCreated.getTime() + 60_000) });

  // Même commande (retry webhook, confirm-session, cron) : déjà envoyée.
  assert.equal(await storage.hasPeptidesOrderConfirmationBeenSent(EMAIL, "order-1", firstCreated), true);
  assert.equal(await storage.hasPeptidesOrderConfirmationBeenSent(EMAIL.toUpperCase(), "order-1", firstCreated), true);
  // Rachat, même adresse, autre commande : doit recevoir sa propre confirmation.
  assert.equal(await storage.hasPeptidesOrderConfirmationBeenSent(EMAIL, "order-2", new Date()), false);
});

test("ancienne ligne sans orderId : ne bloque jamais un rachat ultérieur", async () => {
  const storage: any = new MemStorage();
  const oldSend = new Date(Date.now() - 10 * 24 * 3600e3);
  track(storage, { emailType: "sendCTAEmail", subject: "Peptides Engine : commande reçue", metadata: null, sentAt: oldSend });
  // Commande créée avant cet envoi : la ligne historique la couvre.
  assert.equal(await storage.hasPeptidesOrderConfirmationBeenSent(EMAIL, "legacy-order", new Date(oldSend.getTime() - 60_000)), true);
  // Commande créée après : nouvelle confirmation.
  assert.equal(await storage.hasPeptidesOrderConfirmationBeenSent(EMAIL, "new-order", new Date()), false);
});

test("un envoi en échec ne compte pas comme une confirmation", async () => {
  const storage: any = new MemStorage();
  track(storage, { emailType: "sendPeptidesOrderConfirmation", metadata: { orderId: "order-1" }, sendpulseStatus: "failed" });
  assert.equal(await storage.hasPeptidesOrderConfirmationBeenSent(EMAIL, "order-1", new Date(Date.now() - 60_000)), false);
});

test("toutes les vérifications de confirmation Peptides passent l'id de commande", () => {
  const routes = readFileSync(new URL("./routes.ts", import.meta.url), "utf8");
  const calls = routes.match(/hasPeptidesOrderConfirmationBeenSent\(([^)]*)\)/g) || [];
  assert.ok(calls.length >= 3);
  for (const call of calls) assert.match(call, /,\s*(order|freshOrder)!?\.id,/, call);
  const storageSrc = readFileSync(new URL("./storage.ts", import.meta.url), "utf8");
  assert.match(storageSrc, /metadata->>'orderId' = \$2/);
  // Le claim par commande garde l'idempotence sur les retries.
  assert.match(routes, /"peptidesOrderConfirmationClaimId"/);
});
