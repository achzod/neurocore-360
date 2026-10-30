import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const routes = readFileSync(new URL("./routes.ts", import.meta.url), "utf8");
const offer = readFileSync(new URL("../client/src/pages/offers/PeptidesEngineOffer.tsx", import.meta.url), "utf8");

test("Peptides Engine purchases are open while every payment rail keeps the emergency guard", () => {
  assert.match(routes, /const PEPTIDES_ENGINE_CHECKOUT_PAUSED = false/);
  const stripeStart = routes.indexOf('app.post("/api/stripe/create-checkout-session"');
  const paypalStart = routes.indexOf('app.post("/api/paypal/create-order"');
  const stripe = routes.slice(stripeStart, paypalStart);
  const paypal = routes.slice(paypalStart, routes.indexOf('app.post("/api/paypal/capture-order"', paypalStart));
  assert.match(stripe, /planType === "PEPTIDES_ENGINE" && PEPTIDES_ENGINE_CHECKOUT_PAUSED/);
  assert.match(paypal, /planType === "PEPTIDES_ENGINE" && PEPTIDES_ENGINE_CHECKOUT_PAUSED/);
  assert.match(routes, /error: "PEPTIDES_ENGINE_CHECKOUT_PAUSED"/);
});

test("preview acquisition and follow-ups are open while queued transactional delivery stays independent", () => {
  assert.match(routes, /startPeptidesPreviewDeliveryWorker\(\);\s*if \(!PEPTIDES_ENGINE_CHECKOUT_PAUSED\) \{\s*startPeptidesPreviewFollowupWorker\(\);/);
  assert.doesNotMatch(routes, /if \(!PEPTIDES_ENGINE_CHECKOUT_PAUSED\) \{\s*startPeptidesPreviewDeliveryWorker\(\)/);
  const previewStart = routes.indexOf('app.post("/api/peptides-preview/analyze"');
  const preview = routes.slice(previewStart, routes.indexOf('app.post("/api/peptides-preview/checkout-context"', previewStart));
  assert.match(preview, /if \(PEPTIDES_ENGINE_CHECKOUT_PAUSED\)/);
  assert.match(preview, /res\.status\(503\)/);
});

test("the public offer page keeps its emergency pause branch but exposes the purchase experience", () => {
  assert.match(offer, /const PEPTIDES_ENGINE_SALES_PAUSED = false/);
  assert.match(offer, /Les nouvelles commandes Peptides Engine sont temporairement suspendues/);
  assert.match(offer, /Aucun nouveau paiement n'est accepté pendant ce contrôle/);
});
