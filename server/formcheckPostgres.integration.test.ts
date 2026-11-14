/**
 * Intégration Postgres FormCheck (crédits + file). Ignoré sans base de test :
 *   FORMCHECK_TEST_DATABASE_URL=postgres://... npx tsx --test server/formcheckPostgres.integration.test.ts
 * Ne jamais pointer vers la base de production : le test écrit des lignes fictives.
 */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

const url = process.env.FORMCHECK_TEST_DATABASE_URL;
const skip = !url ? "FORMCHECK_TEST_DATABASE_URL absent" : false;

test("FormCheck credits: idempotent grant, reserve, consume, release, queue claim", { skip }, async () => {
  process.env.DATABASE_URL = url;
  process.env.DB_POOL_MAX = process.env.DB_POOL_MAX || "1";
  const store = await import("./formcheck/store");
  const { pool } = await import("./db");
  const email = `formcheck-test-${randomUUID()}@example.com`;
  const frames = Array.from({ length: 8 }, (_, index) => ({ index, timestampS: index + 0.5, jpeg: Buffer.from([0xff, 0xd8, index]) }));
  const newAnalysis = () => store.reserveCreditAndEnqueue({ email, durationS: 9, videoMeta: { test: true }, frames });

  try {
    await store.ensureFormcheckTables();
    const sessionId = `cs_test_${randomUUID().replace(/-/g, "")}`;
    const grant = { stripeSessionId: sessionId, paymentIntentId: null, email: email.toUpperCase(), packId: "3", credits: 3, amountCents: 2490, currency: "eur" };
    assert.deepEqual(await store.grantFormcheckCredits(grant), { granted: true });
    assert.deepEqual(await store.grantFormcheckCredits(grant), { granted: false }, "webhook + page de retour : une seule attribution");
    assert.deepEqual(await store.getFormcheckBalance(email), { total: 3, used: 0, reserved: 0, available: 3 });

    const a1 = await newAnalysis();
    const a2 = await newAnalysis();
    const a3 = await newAnalysis();
    assert.ok(a1 && a2 && a3);
    assert.equal(await newAnalysis(), null, "plus de crédit disponible");
    assert.deepEqual(await store.getFormcheckBalance(email), { total: 3, used: 0, reserved: 3, available: 0 });
    assert.equal((await store.loadFrames(a1!)).length, 8);
    // Aucun exercice choisi à l'envoi : le libellé vient de l'exercice détecté par l'analyse.
    assert.equal((await store.getAnalysisForEmail(a1!, email)).exercise_label, null);
    await store.saveAnalysisResult(a1!, { result: { exercise_detected: { name_fr: "Soulevé de terre sur blocs", is_strength_exercise: true } }, score: 78, model: "gpt-6.1-sol", responseId: "resp_test", costUsd: 0.1 });
    assert.equal((await store.getAnalysisForEmail(a1!, email)).exercise_label, "Soulevé de terre sur blocs");

    // Livré : consommé une seule fois.
    assert.equal(await store.markDeliveredAndConsume(a1!), true);
    assert.equal(await store.markDeliveredAndConsume(a1!), false);
    // Rejeté : crédit rendu.
    assert.equal(await store.markRejectedAndRelease(a2!, "Pieds hors cadre"), true);
    assert.equal(await store.markRejectedAndRelease(a2!, "Pieds hors cadre"), false);
    // Un rejet tardif ne peut pas « dé-livrer » une analyse livrée.
    await store.markRejectedAndRelease(a1!, "trop tard");
    const delivered = await store.getAnalysisForEmail(a1!, email);
    assert.equal(delivered.status, "delivered");
    assert.deepEqual(await store.getFormcheckBalance(email), { total: 3, used: 1, reserved: 1, available: 1 });

    // File : a3 est pris, mis en retry, puis n'est plus dû avant son délai.
    await pool.query(`UPDATE formcheck_analyses SET next_attempt_at = now() - interval '1 second' WHERE id = $1`, [a3]);
    let claimed = await store.claimNextAnalysis();
    while (claimed && claimed.id !== a3) claimed = await store.claimNextAnalysis();
    assert.equal(claimed?.id, a3);
    assert.equal(claimed?.attempts, 1);
    await store.scheduleRetry(a3!, 60_000, "LOW_CONFIDENCE:0.30");
    const again = await store.claimNextAnalysis();
    assert.notEqual(again?.id, a3, "pas repris avant le délai de retry");

    assert.equal(await store.markNeedsReviewAndRelease(a3!, "LOW_CONFIDENCE"), true);
    assert.deepEqual(await store.getFormcheckBalance(email), { total: 3, used: 1, reserved: 0, available: 2 });
    assert.equal((await store.listAnalysesForEmail(email)).length, 3);
  } finally {
    await pool.query(`DELETE FROM formcheck_analyses WHERE email = $1`, [email]).catch(() => {});
    await pool.query(`DELETE FROM formcheck_purchases WHERE email = $1`, [email]).catch(() => {});
    await pool.query(`DELETE FROM formcheck_accounts WHERE email = $1`, [email]).catch(() => {});
    await pool.end();
  }
});
