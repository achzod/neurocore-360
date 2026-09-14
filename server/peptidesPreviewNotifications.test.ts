import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";

const routesSource = fs.readFileSync(new URL("./routes.ts", import.meta.url), "utf8");
const emailSource = fs.readFileSync(new URL("./emailService.ts", import.meta.url), "utf8");
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
  assert.equal((emailSource.match(/html: encodeBase64\(html\)/g) || []).length >= 2, true);
  assert.match(emailSource, /Email résultat client/);
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

test("client and admin emails use full protocol quantities and totals", () => {
  assert.match(emailSource, /estimatedProtocolCostUsd/);
  assert.match(emailSource, /vialsRequired/);
  assert.match(emailSource, /packageCount/);
  assert.match(emailSource, /estimatedTotalPriceUsd/);
  assert.match(emailSource, /COÛT TOTAL MOLÉCULES/);
  assert.doesNotMatch(emailSource, /BUDGET INITIAL ESTIMÉ/);
  assert.match(previewRoute, /estimatedProtocolCostUsd/);
});
