/**
 * Intégration Postgres : livraison différée FormCheck et reprise après redémarrage.
 * Ignoré sans base de test :
 *   FORMCHECK_TEST_DATABASE_URL=postgres://... npx tsx --test server/formcheckDelayedDelivery.integration.test.ts
 * Ne jamais pointer vers la base de production : le test écrit des lignes fictives.
 *
 * Le « redémarrage » est un vrai nouveau processus Node (aucun état en mémoire) qui
 * relance la boucle du worker sur la même base.
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const url = process.env.FORMCHECK_TEST_DATABASE_URL;
const CHILD = process.env.FORMCHECK_DELIVERY_CHILD;
const skip = CHILD ? "processus enfant" : !url ? "FORMCHECK_TEST_DATABASE_URL absent" : false;
const thisFile = fileURLToPath(import.meta.url);

const validResult = {
  exploitable: true,
  exercise_detected: { name_fr: "Squat barre haute", is_strength_exercise: true },
  camera_view: "profil",
  confidence: 0.8,
  reps_count: 5,
  errors: [{ title: "Genoux", description: "d", severity: "majeure", frame_index: 2, annotations: [{ type: "circle", points: [{ x: 0.5, y: 0.5 }], radius: 0.05, label: "Genou" }] }],
  strengths: ["Gainage"],
  priority_corrections: [{ title: "a", cue: "a", why: "a" }, { title: "b", cue: "b", why: "b" }, { title: "c", cue: "c", why: "c" }],
  next_session_cues: ["x"],
  score: 72,
  summary: "Bonne base.",
};

/** Dépendances réelles côté base, fausses côté OpenAI / Chrome / email. */
async function workerDeps(options: { forbidAnalysis: boolean; sent: any[] }) {
  const store = await import("./formcheck/store");
  const { normalizeFormcheckAnalysis } = await import("./formcheck/analysis");
  const { createProductionDeps } = await import("./formcheck/worker");
  const deps = createProductionDeps(() => "https://apexlabs.test");
  return {
    ...deps,
    vision: async () => {
      if (options.forbidAnalysis) throw new Error("ANALYSIS_SHOULD_NOT_RERUN");
      return { analysis: normalizeFormcheckAnalysis(validResult, 8), model: "test-model", responseId: "resp_test", costUsd: 0.1 };
    },
    annotate: async (jpeg: Buffer) => Buffer.concat([jpeg, Buffer.from("A")]),
    renderPdf: async () => {
      if (options.forbidAnalysis) throw new Error("PDF_SHOULD_NOT_RERENDER");
      return Buffer.from("%PDF-delayed");
    },
    sendEmail: async (input: any) => {
      options.sent.push({ to: input.to, emailType: input.emailType, attachment: input.attachments ? Object.values(input.attachments)[0]?.toString() : null });
      return true;
    },
    balance: store.getFormcheckBalance,
  };
}

// Processus enfant : une boucle de worker « fraîchement démarrée ».
if (CHILD) {
  (async () => {
    process.env.DATABASE_URL = url;
    process.env.DB_POOL_MAX = "1";
    const sent: any[] = [];
    const { runFormcheckQueueOnce } = await import("./formcheck/worker");
    const { pool } = await import("./db");
    await runFormcheckQueueOnce(await workerDeps({ forbidAnalysis: true, sent }) as any);
    await pool.end();
    process.stdout.write(`\nRESULT${JSON.stringify(sent)}\n`);
    process.exit(0);
  })().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

/** Libère les connexions du processus de test (certaines bases de test n'en acceptent qu'une). */
async function releaseConnections() {
  const { pool } = await import("./db");
  for (let i = 0; i < 100 && pool.totalCount > 0; i++) await new Promise((r) => setTimeout(r, 20));
}

async function runFreshWorkerProcess(): Promise<any[]> {
  await releaseConnections();
  const run = spawnSync(process.execPath, ["--import", "tsx", thisFile], {
    env: { ...process.env, FORMCHECK_DELIVERY_CHILD: "1", FORMCHECK_TEST_DATABASE_URL: url },
    cwd: path.dirname(path.dirname(thisFile)),
    encoding: "utf8",
    timeout: 60_000,
  });
  assert.equal(run.status, 0, run.stderr || run.stdout);
  const line = run.stdout.split("\n").find((l) => l.startsWith("RESULT"));
  assert.ok(line, run.stdout);
  return JSON.parse(line!.slice("RESULT".length));
}

test("delayed delivery survives a restart: report built now, nothing sent early, sent once due by a fresh process", { skip }, async () => {
  process.env.DATABASE_URL = url;
  process.env.DB_POOL_MAX = process.env.DB_POOL_MAX || "1";
  process.env.DB_IDLE_TIMEOUT_MS = process.env.DB_IDLE_TIMEOUT_MS || "10";
  const store = await import("./formcheck/store");
  const { runFormcheckQueueOnce } = await import("./formcheck/worker");
  const { pool } = await import("./db");
  const email = `formcheck-delay-${randomUUID()}@example.com`;
  const frames = Array.from({ length: 8 }, (_, index) => ({ index, timestampS: index + 0.5, jpeg: Buffer.from([0xff, 0xd8, index]) }));

  try {
    await store.ensureFormcheckTables();
    await store.grantFormcheckCredits({ stripeSessionId: `cs_test_${randomUUID().replace(/-/g, "")}`, paymentIntentId: null, email, packId: "3", credits: 3, amountCents: 2490, currency: "eur" });

    // Upload : livraison programmée 150 min plus tard.
    const deliverAfter = new Date(Date.now() + 150 * 60_000);
    const id = await store.reserveCreditAndEnqueue({ email, durationS: 9, videoMeta: { test: true }, frames, deliverAfter });
    assert.ok(id);

    // 1. Le worker analyse et produit le PDF tout de suite, sans rien envoyer.
    const sent: any[] = [];
    await runFormcheckQueueOnce(await workerDeps({ forbidAnalysis: false, sent }) as any);
    assert.deepEqual(sent, [], "aucun email avant l'heure");
    let row = (await pool.query(`SELECT status, attempts, credit_state, deliver_after, next_attempt_at, octet_length(pdf) AS pdf_len, score FROM formcheck_analyses WHERE id = $1`, [id])).rows[0];
    assert.equal(row.status, "scheduled");
    assert.equal(row.credit_state, "reserved", "crédit pas encore débité");
    assert.equal(row.attempts, 0, "l'attente ne consomme pas de tentative");
    assert.ok(row.pdf_len > 0, "PDF déjà produit");
    assert.equal(row.score, 72);
    assert.equal(new Date(row.next_attempt_at).getTime(), deliverAfter.getTime());
    assert.deepEqual(await store.getFormcheckBalance(email), { total: 3, used: 0, reserved: 1, available: 2 });

    // Vue client : « en cours », sans score, sans exercice, sans PDF.
    const [view] = await store.listAnalysesForEmail(email);
    assert.equal(view.status, "processing");
    assert.equal(view.score, null);
    assert.equal(view.exercise_label, null);
    assert.equal(view.delivered_at, null);

    // 2. Redémarrage avant l'heure : un nouveau processus ne livre rien.
    assert.deepEqual(await runFreshWorkerProcess(), [], "rien de livré avant l'heure, même après redémarrage");
    row = (await pool.query(`SELECT status FROM formcheck_analyses WHERE id = $1`, [id])).rows[0];
    assert.equal(row.status, "scheduled");

    // 3. L'heure est passée (on recule les dates de 3 h) : un processus neuf livre une seule fois.
    await pool.query(`UPDATE formcheck_analyses SET deliver_after = deliver_after - interval '3 hours', next_attempt_at = next_attempt_at - interval '3 hours' WHERE id = $1`, [id]);
    const delivered = await runFreshWorkerProcess();
    assert.equal(delivered.length, 1);
    assert.equal(delivered[0].to, email);
    assert.equal(delivered[0].emailType, "sendFormcheckReportEmail");
    assert.equal(delivered[0].attachment, "%PDF-delayed", "le PDF stocké est envoyé, sans nouvelle analyse");
    row = (await pool.query(`SELECT status, credit_state, delivered_at FROM formcheck_analyses WHERE id = $1`, [id])).rows[0];
    assert.equal(row.status, "delivered");
    assert.equal(row.credit_state, "consumed");
    assert.ok(row.delivered_at);
    assert.deepEqual(await store.getFormcheckBalance(email), { total: 3, used: 1, reserved: 0, available: 2 });

    // 4. Un nouveau passage ne renvoie rien.
    assert.deepEqual(await runFreshWorkerProcess(), []);

    // 5. Analyse antérieure au déploiement (deliver_after NULL) : livrée dès qu'elle est prête.
    const legacy = await store.reserveCreditAndEnqueue({ email, durationS: 9, videoMeta: { test: true }, frames });
    const legacySent: any[] = [];
    await runFormcheckQueueOnce(await workerDeps({ forbidAnalysis: false, sent: legacySent }) as any);
    assert.equal(legacySent.length, 1);
    assert.equal((await pool.query(`SELECT status FROM formcheck_analyses WHERE id = $1`, [legacy])).rows[0].status, "delivered");
  } finally {
    await pool.query(`DELETE FROM formcheck_analyses WHERE email = $1`, [email]).catch(() => {});
    await pool.query(`DELETE FROM formcheck_purchases WHERE email = $1`, [email]).catch(() => {});
    await pool.query(`DELETE FROM formcheck_accounts WHERE email = $1`, [email]).catch(() => {});
    await pool.end();
  }
});
