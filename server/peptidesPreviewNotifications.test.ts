import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";

const routesSource = fs.readFileSync(new URL("./routes.ts", import.meta.url), "utf8");
const emailSource = fs.readFileSync(new URL("./emailService.ts", import.meta.url), "utf8");
const emailContentSource = fs.readFileSync(new URL("./peptidesPreviewEmailContent.ts", import.meta.url), "utf8");
const allEmailSource = `${emailSource}\n${emailContentSource}`;
const previewSource = fs.readFileSync(new URL("./peptidesPreview.ts", import.meta.url), "utf8");
const queueSource = fs.readFileSync(new URL("./peptidesPreviewDeliveryQueue.ts", import.meta.url), "utf8");

const routeStart = routesSource.indexOf('app.post("/api/peptides-preview/analyze"');
const routeEnd = routesSource.indexOf('app.post("/api/peptides-engine/save-progress"', routeStart);
const previewRoute = routesSource.slice(routeStart, routeEnd);

test("completed previews persist inputs, result, attribution and delivery state", () => {
  assert.ok(routeStart >= 0 && routeEnd > routeStart);
  assert.match(previewRoute, /saveBurnoutProgress/);
  assert.match(previewRoute, /previewResult:\s*result/);
  assert.match(previewRoute, /previewNotifications/);
  assert.match(previewRoute, /clientEmailSent/);
  assert.match(previewRoute, /adminEmailSent/);
  assert.match(previewRoute, /backgroundAttempts/);
  assert.match(previewRoute, /notificationFingerprint/);
  assert.match(previewRoute, /previewHistory/);
  assert.match(previewRoute, /submissionId/);
});

test("every completed preview queues the client result and admin notification", () => {
  assert.match(previewRoute, /kickPeptidesPreviewDeliveryQueue\(\)/);
  assert.match(previewRoute, /resultEmailQueued/);
  assert.match(queueSource, /sendPeptidesPreviewResultEmail/);
  assert.match(queueSource, /sendPeptidesPreviewAdminNotification/);
  assert.match(emailSource, /export async function sendPeptidesPreviewResultEmail/);
  assert.match(emailSource, /export async function sendPeptidesPreviewAdminNotification/);
  assert.match(allEmailSource, /buildPeptidesPreviewResultEmailContent/);
  assert.match(emailSource, /html: encodeBase64\(content\.html\)/);
  assert.match(emailContentSource, /Email automatique client/);
  assert.match(emailContentSource, /MAIL PRÊT À COPIER COLLER/);
  assert.match(emailContentSource, /buildPeptidesPreviewCopyReadyReply/);
});

test("rapid duplicate submissions do not resend successful messages", () => {
  assert.match(previewRoute, /15 \* 60_000/);
  assert.match(previewRoute, /isRecentDuplicate \? previousNotifications/);
  assert.match(queueSource, /if \(!clientEmailSent\)/);
  assert.match(queueSource, /if \(!adminEmailSent\)/);
});

test("delivery uses a persistent bounded retry queue", () => {
  assert.match(queueSource, /MAX_ATTEMPTS = 3/);
  assert.match(queueSource, /retry_scheduled/);
  assert.match(queueSource, /pg_try_advisory_lock/);
  assert.match(queueSource, /UPDATE burnout_progress/);
  assert.match(queueSource, /setInterval/);
});

test("the free preview has no paid AI model call", () => {
  assert.doesNotMatch(previewSource, /OpenAI|Anthropic|Gemini|generateContent|chat\.completions/i);
  assert.match(previewSource, /www\.peptaura\.com/);
});

test("client and admin emails expose arithmetic, landed quote and conversion copy", () => {
  assert.match(emailContentSource, /estimatedProtocolCostUsd/);
  assert.match(emailContentSource, /estimatedShippingCostUsd/);
  assert.match(emailContentSource, /estimatedGrandTotalUsd/);
  assert.match(emailContentSource, /monthlyEquivalentUsd/);
  assert.match(emailContentSource, /mathematicalVials/);
  assert.match(emailContentSource, /operationalVials/);
  assert.match(emailContentSource, /packageCount/);
  assert.match(emailContentSource, /estimatedTotalPriceUsd/);
  assert.match(emailContentSource, /DEVIS COMPLET ESTIMÉ/);
  assert.match(emailContentSource, /MAIL PRÊT À COPIER COLLER/);
  assert.match(emailContentSource, /Tu peux débloquer ton analyse complète ici/);
  assert.match(emailContentSource, /DÉCISION DU PRÉ-CALCUL/);
  assert.match(emailContentSource, /Aucune molécule, aucun dosage et aucun prix/);
  assert.doesNotMatch(emailContentSource, /BUDGET INITIAL ESTIMÉ/);
  assert.match(previewRoute, /estimatedShippingCostUsd/);
  assert.match(previewRoute, /estimatedGrandTotalUsd/);
  assert.match(previewRoute, /adminNotificationSent/);
  assert.match(previewRoute, /notificationDeliveryState/);
  assert.match(previewRoute, /publicResult/);
  assert.match(previewRoute, /supplier: _supplier/);
  assert.match(previewRoute, /productUrl: _productUrl/);
  assert.doesNotMatch(allEmailSource, /\$\{molecule\.supplier\}/);
});
