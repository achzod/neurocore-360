import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";

const routesSource = fs.readFileSync(new URL("./routes.ts", import.meta.url), "utf8");
const emailSource = fs.readFileSync(new URL("./emailService.ts", import.meta.url), "utf8");
const previewSource = fs.readFileSync(new URL("./peptidesPreview.ts", import.meta.url), "utf8");

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
  assert.match(previewRoute, /notificationFingerprint/);
});

test("every completed preview attempts the client result and admin notification", () => {
  assert.match(previewRoute, /sendPeptidesPreviewResultEmail\(input, result, checkoutUrl, progress\.id\)/);
  assert.match(previewRoute, /sendPeptidesPreviewAdminNotification\(input, result, progress\.id, clientEmailSent\)/);
  assert.match(emailSource, /export async function sendPeptidesPreviewResultEmail/);
  assert.match(emailSource, /export async function sendPeptidesPreviewAdminNotification/);
  assert.match(emailSource, /Email résultat client/);
});

test("rapid duplicate submissions do not resend successful messages", () => {
  assert.match(previewRoute, /15 \* 60_000/);
  assert.match(previewRoute, /isRecentDuplicate && previousNotifications\?\.clientEmailSent === true/);
  assert.match(previewRoute, /isRecentDuplicate && previousNotifications\?\.adminEmailSent === true/);
});

test("the free preview has no paid AI model call", () => {
  assert.doesNotMatch(previewSource, /OpenAI|Anthropic|Gemini|generateContent|chat\.completions/i);
  assert.match(previewSource, /www\.peptaura\.com/);
});
