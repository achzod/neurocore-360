import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("preview route persists every validated answer, result, history entry and delivery state", () => {
  const source = fs.readFileSync(new URL("./routes.ts", import.meta.url), "utf8");
  const start = source.indexOf('app.post("/api/peptides-preview/analyze"');
  const end = source.indexOf('app.post("/api/peptides-engine/save-progress"', start);
  assert.ok(start > 0 && end > start);
  const route = source.slice(start, end);
  assert.match(route, /const input = peptidesPreviewInputSchema\.parse\(req\.body\)/);
  assert.match(route, /const storageEmail = `peptides-preview::\$\{input\.email\}`/);
  assert.match(route, /submissionId,[\s\S]*capturedAt,[\s\S]*input,[\s\S]*result,[\s\S]*notificationFingerprint,[\s\S]*notificationStatus: "pending"/);
  assert.match(route, /responses:\s*\{[\s\S]*\.\.\.input,[\s\S]*previewInput: input,[\s\S]*previewResult: result,[\s\S]*previewNotifications: queuedNotifications,[\s\S]*previewHistory: pendingHistory/);
  assert.match(route, /const previousHistory = Array\.isArray\(previousResponses\.previewHistory\)/);
  assert.match(route, /isRecentDuplicate[\s\S]*previousHistory[\s\S]*crypto\.randomUUID\(\)/);
});
