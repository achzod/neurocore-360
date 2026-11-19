import assert from "node:assert/strict";
import test from "node:test";
import {
  FORBIDDEN_RECOVERY_WORDS,
  buildCheckoutRecoveryEmail,
  buildRecoveryCheckoutPlan,
  checkoutRecoveryCutoff,
  decideNextRecoveryStep,
  readCheckoutRecoveryConfig,
  runCheckoutRecoveryCycle,
  type CheckoutRecoveryConfig,
  type CheckoutRecoveryDeps,
  type RecoveryOrder,
  type RecoverySequence,
  type RecoveryStep,
} from "./checkoutRecovery";

const H = 60 * 60 * 1000;
const T0 = new Date("2026-12-01T10:00:00Z");
const at = (hours: number) => new Date(T0.getTime() + hours * H);

const enabledConfig = (overrides: Record<string, string> = {}): CheckoutRecoveryConfig =>
  readCheckoutRecoveryConfig(
    { CHECKOUT_RECOVERY_ENABLED: "1", CHECKOUT_RECOVERY_START_AT: "2026-11-30T00:00:00Z", ...overrides },
    new Date("2026-11-29T00:00:00Z"),
  );

function order(partial: Partial<RecoveryOrder> = {}): RecoveryOrder {
  return {
    id: partial.id || "order-1",
    email: "client@example.fr",
    productType: "ELITE",
    status: "pending",
    amountCents: 7900,
    discountCents: 0,
    finalAmountCents: 7900,
    promoCode: null,
    stripeCheckoutSessionId: "cs_test_1",
    createdAt: T0,
    metadata: { planType: "ELITE" },
    ...partial,
  };
}

function fakeDeps(initialOrders: RecoveryOrder[], opts: { unsubscribed?: string[]; sendOk?: boolean } = {}) {
  const orders = [...initialOrders];
  const sequences = new Map<string, RecoverySequence & { step1Ok?: boolean; step2Ok?: boolean }>();
  const sends: Array<{ email: string; step: RecoveryStep; orderId: string }> = [];
  let seq = 0;
  const deps: CheckoutRecoveryDeps = {
    async listCandidateOrders(cutoff) {
      return orders.filter((o) => new Date(o.createdAt).getTime() >= cutoff.getTime());
    },
    async listOrdersForEmail(email) {
      return orders.filter((o) => o.email.toLowerCase() === email.toLowerCase());
    },
    async getSequence(email, productType) {
      return sequences.get(`${email}|${productType}`) || null;
    },
    async createSequence(o, token) {
      const key = `${o.email.toLowerCase()}|${o.productType}`;
      if (sequences.has(key)) return null;
      const s: RecoverySequence = {
        id: `seq-${++seq}`,
        email: o.email.toLowerCase(),
        productType: o.productType,
        orderId: o.id,
        abandonedAt: new Date(o.createdAt),
        token,
        step1SentAt: null,
        step2SentAt: null,
        stoppedAt: null,
        stopReason: null,
      };
      sequences.set(key, s);
      return s;
    },
    async claimStep(id, step, when) {
      const s = Array.from(sequences.values()).find((x) => x.id === id)!;
      if (s.stoppedAt) return false;
      if (step === 1) {
        if (s.step1SentAt) return false;
        s.step1SentAt = when;
      } else {
        if (s.step2SentAt) return false;
        s.step2SentAt = when;
      }
      return true;
    },
    async recordStepResult(id, step, ok) {
      const s = Array.from(sequences.values()).find((x) => x.id === id)!;
      if (step === 1) s.step1Ok = ok;
      else {
        s.step2Ok = ok;
        s.stoppedAt = s.stoppedAt || new Date();
        s.stopReason = s.stopReason || (ok ? "completed" : "step2_failed");
      }
    },
    async stopSequence(id, reason, when) {
      const s = Array.from(sequences.values()).find((x) => x.id === id)!;
      s.stoppedAt = s.stoppedAt || when;
      s.stopReason = s.stopReason || reason;
    },
    async isUnsubscribed(email) {
      return (opts.unsubscribed || []).includes(email.toLowerCase());
    },
    async sendStep({ sequence, order: o, step }) {
      sends.push({ email: sequence.email, step, orderId: o.id });
      return { ok: opts.sendOk !== false, trackingId: `trk-${sends.length}` };
    },
  };
  return { deps, orders, sequences, sends };
}

test("flag coupé : aucune relance, aucune lecture", async () => {
  const { deps, sends } = fakeDeps([order()]);
  const config = readCheckoutRecoveryConfig({ CHECKOUT_RECOVERY_START_AT: "2026-11-30T00:00:00Z" }, T0);
  assert.equal(config.enabled, false);
  const result = await runCheckoutRecoveryCycle(deps, config, at(2));
  assert.equal(result.enabled, false);
  assert.equal(sends.length, 0);
});

test("timing : rien avant 1 h, étape 1 vers 1 h, étape 2 vers 24 h, puis plus rien", async () => {
  const { deps, sends, sequences } = fakeDeps([order()]);
  const config = enabledConfig();

  await runCheckoutRecoveryCycle(deps, config, at(0.5));
  assert.equal(sends.length, 0, "pas de mail à 30 min");

  await runCheckoutRecoveryCycle(deps, config, at(1.1));
  assert.deepEqual(sends.map((s) => s.step), [1]);

  await runCheckoutRecoveryCycle(deps, config, at(1.4));
  await runCheckoutRecoveryCycle(deps, config, at(12));
  assert.equal(sends.length, 1, "l'étape 1 ne part qu'une fois");

  await runCheckoutRecoveryCycle(deps, config, at(24.2));
  assert.deepEqual(sends.map((s) => s.step), [1, 2]);

  await runCheckoutRecoveryCycle(deps, config, at(30));
  await runCheckoutRecoveryCycle(deps, config, at(48));
  assert.equal(sends.length, 2, "jamais de 3e mail");
  assert.equal(sequences.size, 1);
});

test("decideNextRecoveryStep respecte les fenêtres 1 h / 24 h / 72 h", () => {
  const config = enabledConfig();
  const fresh = { abandonedAt: T0, step1SentAt: null, step2SentAt: null, stoppedAt: null };
  assert.equal(decideNextRecoveryStep(fresh, config, at(0.9)), null);
  assert.equal(decideNextRecoveryStep(fresh, config, at(1)), 1);
  assert.equal(decideNextRecoveryStep(fresh, config, at(23.5)), null);
  assert.equal(decideNextRecoveryStep(fresh, config, at(24)), 2, "étape 1 ratée (cron coupé) : on passe à l'étape 2");
  assert.equal(decideNextRecoveryStep(fresh, config, at(72)), null, "plus rien après 72 h");
  assert.equal(decideNextRecoveryStep({ ...fresh, stoppedAt: at(2) }, config, at(25)), null);
});

test("arrêt immédiat si la personne a payé entre l'étape 1 et l'étape 2", async () => {
  const { deps, sends, orders, sequences } = fakeDeps([order()]);
  const config = enabledConfig();
  await runCheckoutRecoveryCycle(deps, config, at(1.2));
  assert.equal(sends.length, 1);

  orders.push(order({ id: "order-2", status: "paid", createdAt: at(5), paidAt: at(5), stripeCheckoutSessionId: "cs_test_2" }));
  const result = await runCheckoutRecoveryCycle(deps, config, at(24.5));
  assert.equal(sends.length, 1, "pas d'étape 2 après paiement");
  assert.equal(result.stoppedPaid, 1);
  const s = Array.from(sequences.values())[0];
  assert.equal(s.stopReason, "paid");
  await runCheckoutRecoveryCycle(deps, config, at(30));
  assert.equal(sends.length, 1);
});

test("un produit déjà acheté (achat unique) n'est jamais relancé", async () => {
  const paidLongAgo = order({ id: "old-paid", status: "paid", createdAt: new Date("2026-06-01T10:00:00Z"), paidAt: new Date("2026-06-01T10:00:00Z") });
  const { deps, sends } = fakeDeps([order(), paidLongAgo]);
  await runCheckoutRecoveryCycle(deps, enabledConfig(), at(1.5));
  assert.equal(sends.length, 0);
});

test("stock historique : rien avant CHECKOUT_RECOVERY_START_AT, rien au-delà de 7 jours", async () => {
  const config = enabledConfig({ CHECKOUT_RECOVERY_START_AT: "2026-12-01T12:00:00Z" });
  // Abandon créé avant la mise en prod : jamais relancé, même aux bonnes heures.
  const { deps, sends } = fakeDeps([order()]);
  await runCheckoutRecoveryCycle(deps, config, at(1.5));
  await runCheckoutRecoveryCycle(deps, config, at(24.5));
  assert.equal(sends.length, 0);

  // START_AT très ancien : le plafond de 7 jours s'applique quand même.
  const oldStart = enabledConfig({ CHECKOUT_RECOVERY_START_AT: "2026-01-01T00:00:00Z" });
  const cutoff = checkoutRecoveryCutoff(oldStart, at(0));
  assert.equal(cutoff.getTime(), at(0).getTime() - 7 * 24 * H);
  const stale = fakeDeps([order({ createdAt: at(-8 * 24) })]);
  await runCheckoutRecoveryCycle(stale.deps, oldStart, at(0));
  assert.equal(stale.sends.length, 0);
  // Abandon de 4 jours après START_AT : hors fenêtre 72 h, aucune séquence créée.
  const fourDays = fakeDeps([order({ createdAt: at(-96) })]);
  await runCheckoutRecoveryCycle(fourDays.deps, oldStart, at(0));
  assert.equal(fourDays.sends.length, 0);
  assert.equal(fourDays.sequences.size, 0);
});

test("sans CHECKOUT_RECOVERY_START_AT, le seuil est le démarrage du process", async () => {
  const processStart = at(0.5);
  const config = readCheckoutRecoveryConfig({ CHECKOUT_RECOVERY_ENABLED: "1" }, processStart);
  assert.equal(config.startAtSource, "process_start");
  const { deps, sends } = fakeDeps([order({ createdAt: T0 })]);
  await runCheckoutRecoveryCycle(deps, config, at(1.5));
  assert.equal(sends.length, 0, "abandon antérieur au démarrage : ignoré");
});

test("une seule séquence par email et par produit", async () => {
  const { deps, sends, sequences } = fakeDeps([
    order({ id: "a", createdAt: T0 }),
    order({ id: "b", createdAt: at(0.2), email: "CLIENT@example.fr", stripeCheckoutSessionId: "cs_b" }),
  ]);
  await runCheckoutRecoveryCycle(deps, enabledConfig(), at(1.5));
  assert.equal(sends.length, 1);
  assert.equal(sequences.size, 1);
});

test("désinscrit : aucune relance", async () => {
  const { deps, sends } = fakeDeps([order()], { unsubscribed: ["client@example.fr"] });
  const result = await runCheckoutRecoveryCycle(deps, enabledConfig(), at(1.5));
  assert.equal(sends.length, 0);
  assert.equal(result.skippedUnsubscribed, 1);
});

test("une étape ratée n'est pas renvoyée en boucle", async () => {
  const { deps, sends } = fakeDeps([order()], { sendOk: false });
  const config = enabledConfig();
  await runCheckoutRecoveryCycle(deps, config, at(1.2));
  await runCheckoutRecoveryCycle(deps, config, at(1.5));
  await runCheckoutRecoveryCycle(deps, config, at(2));
  assert.equal(sends.filter((s) => s.step === 1).length, 1);
});

test("commandes gratuites, internes, PayPal ou déjà issues d'une relance : exclues", async () => {
  const { deps, sends } = fakeDeps([
    order({ id: "free", email: "a@example.fr", finalAmountCents: 0 }),
    order({ id: "internal", email: "coaching@achzodcoaching.com" }),
    order({ id: "paypal", email: "b@example.fr", stripeCheckoutSessionId: null }),
    order({ id: "rec", email: "c@example.fr", metadata: { checkoutRecovery: { fromOrderId: "x" } } }),
  ]);
  await runCheckoutRecoveryCycle(deps, enabledConfig(), at(1.5));
  assert.equal(sends.length, 0);
});

test("le nouveau checkout reprend le même produit au même prix, sans nouvelle remise", () => {
  const original = order({
    productType: "PEPTIDES_ENGINE",
    amountCents: 29900,
    discountCents: 2990,
    finalAmountCents: 26910,
    promoCode: "PEP10",
    metadata: { planType: "PEPTIDES_ENGINE", peptidesTier: "coached", paymentRail: "standard", peptidesResponses: { a: 1 } },
  });
  const plan = buildRecoveryCheckoutPlan(original, { id: "seq-9" }, at(2));
  assert.equal(plan.lineItem.price_data.unit_amount, 26910);
  assert.equal(plan.lineItem.price_data.currency, "eur");
  assert.equal(plan.orderInput.finalAmountCents, 26910);
  assert.equal(plan.orderInput.discountCents, 2990);
  assert.equal(plan.sessionMetadata.planType, "PEPTIDES_ENGINE");
  assert.equal(plan.sessionMetadata.email, "client@example.fr");
  assert.equal(plan.orderInput.metadata.peptidesResponses.a, 1);
  assert.equal(plan.orderInput.metadata.checkoutRecovery.fromOrderId, "order-1");
  assert.equal("discounts" in (plan as any), false);
});

test("contenu des mails : français, tutoiement, signé Achzod, sans mots ni tirets interdits", () => {
  for (const step of [1, 2] as const) {
    const mail = buildCheckoutRecoveryEmail({
      step,
      productLabel: "Ultimate Scan",
      priceCents: 7900,
      recoverUrl: "https://apexlabs.achzodcoaching.com/api/checkout/recover/abc",
    });
    const all = `${mail.subject}\n${mail.text}\n${mail.html}`;
    for (const word of FORBIDDEN_RECOVERY_WORDS) {
      assert.equal(word.test(all), false, `mot interdit ${word} à l'étape ${step}`);
    }
    assert.equal(/[\u2013\u2014]/.test(all), false, "pas de tiret long");
    assert.equal(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(all), false, "pas d'emoji");
    assert.match(mail.text, /Achzod/);
    assert.match(mail.text, /\bje\b|\bJe\b/);
    assert.match(mail.text, /\btu\b|\bTu\b|\bta\b|\bTa\b/);
    assert.match(mail.text, /79 €/);
    assert.match(mail.text, /api\/checkout\/recover\/abc/);
    assert.match(mail.html, /\{\{UNSUB_LINK\}\}/);
    assert.ok(mail.text.split(/\s+/).length < 140, "mail court");
  }
});
