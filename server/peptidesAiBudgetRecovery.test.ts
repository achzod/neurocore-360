import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const routes = readFileSync(new URL("./routes.ts", import.meta.url), "utf8");
const storage = readFileSync(new URL("./storage.ts", import.meta.url), "utf8");

test("legacy paid-order recovery scopes AI budget to the real order", () => {
  assert.match(
    routes,
    /generatePeptidesProtocol\(responses, email, autoGenTier, \{[\s\S]{0,260}orderId: order\.id/,
  );
});

test("held admin recovery can pass one bounded previous quality error without sending", () => {
  assert.match(routes, /recoveryPreviousError exige skipEmail=true, aucun rapport existant et un HOLD actif/);
  assert.match(routes, /normalizedRecoveryPreviousError\.length > 2200/);
  assert.match(routes, /initialPreviousError: normalizedRecoveryPreviousError \|\| undefined/);
});

test("claiming a Peptides report anchors delivery exactly 24 hours after generation", () => {
  assert.match(storage, /'peptidesGenerationCompletedAt', NOW\(\)::text/);
  assert.match(storage, /'peptidesEmailScheduledAt', \(NOW\(\) \+ INTERVAL '24 hours'\)::text/);
});
