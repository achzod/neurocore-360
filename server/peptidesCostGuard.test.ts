import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const engine = readFileSync(new URL("./peptidesEngine.ts", import.meta.url), "utf8");
const responses = readFileSync(new URL("./openaiResponses.ts", import.meta.url), "utf8");
const routes = readFileSync(new URL("./routes.ts", import.meta.url), "utf8");

test("Peptides always stops after one provider response and one transport attempt", () => {
  assert.match(engine, /const providerRetries = 1;/);
  assert.match(engine, /const maxCandidates = 1;/);
  assert.match(responses, /request\.profile === "discovery" \|\| request\.profile === "peptides"[\s\S]*?\? 1/);
  assert.match(routes, /maxCandidates: 1,[\s\S]*providerRetries: 1/);
});

test("manual repair requires one-off authorization and an incident dedupe key", () => {
  assert.match(routes, /AUTHORIZE_ONE_PROVIDER_CALL/);
  assert.match(routes, /manualRepairAuthorizationId/);
  assert.match(routes, /canonicalManualIncidentKey/);
  assert.match(routes, /createHash\("sha256"\)[\s\S]*RENDER_GIT_COMMIT/);
  assert.match(routes, /costCategory: "manual_repair"/);
  assert.match(engine, /PEPTIDES_MANUAL_REPAIR_AUTHORIZATION_AND_INCIDENT_REQUIRED/);
  assert.match(engine, /PEPTIDES_RECOVERY_REQUIRES_MANUAL_REPAIR_CATEGORY/);
});

test("usage endpoint exposes category order response status and every token class", () => {
  assert.match(responses, /byCategory:/);
  assert.match(responses, /costCategory: row\.cost_category/);
  assert.match(responses, /orderId: row\.order_id/);
  assert.match(responses, /responseId: row\.response_id/);
  assert.match(responses, /reservationStatus: row\.reservation_status/);
  assert.match(responses, /cacheWriteTokens: numberFromDb\(row\.cache_write_tokens\)/);
  assert.match(responses, /daily:\$\{row\.dubai_day\}:\$\{category\}:\$\{crossedLevel\}/);
});
