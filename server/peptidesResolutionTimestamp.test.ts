import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import * as invariant from "./peptidesFulfillmentInvariant";

const state = "RESOLVED_DUPLICATE_ORDER";
const code = "DUPLICATE_ORDER_REPORT_EXISTS";
const first = "2026-11-12T08:00:00.000Z";
const later = "2026-11-12T09:00:00.000Z";
const metadata = {
  peptidesFulfillmentState: state,
  peptidesFulfillmentIncidentCode: code,
  peptidesFulfillmentResolvedAt: first,
  peptidesEmailHold: true,
  peptidesManualFulfillment: true,
};
const resolve = (invariant as unknown as {
  peptidesFulfillmentResolutionTimestamp: (
    metadata: Record<string, unknown>, state: string, code: string, nowIso: string,
  ) => string;
}).peptidesFulfillmentResolutionTimestamp;

test("duplicate terminal branches do not create a fresh resolution timestamp on each worker cycle", () => {
  const routes = readFileSync(new URL("./routes.ts", import.meta.url), "utf8");
  const start = routes.indexOf("// An operator-reviewed historical duplicate is terminal");
  const end = routes.indexOf("// Evaluate paid fulfillment", start);
  assert.ok(start >= 0 && end > start);
  const body = routes.slice(start, end);
  assert.doesNotMatch(body, /peptidesFulfillmentResolvedAt:\s*new Date\(\)\.toISOString\(\)/);
  assert.equal((body.match(/peptidesFulfillmentResolutionTimestamp\(/g) || []).length, 2);
  assert.match(body, /peptidesEmailHold:\s*true/);
  assert.match(body, /peptidesManualFulfillment:\s*true/);
  assert.doesNotMatch(body, /generatePeptidesProtocol\(|sendEmail\(/);
});

test("same resolved incident preserves its exact timestamp across repeated cycles", () => {
  assert.equal(resolve(metadata, state, code, later), first);
  assert.equal(resolve(metadata, state, code, "2026-11-13T09:00:00.000Z"), first);
});

test("a resolution patch remains a metadata no-op and preserves manual holds", () => {
  const original = JSON.stringify(metadata);
  const patch = {
    peptidesFulfillmentState: state,
    peptidesFulfillmentIncidentCode: code,
    peptidesFulfillmentResolvedAt: resolve(metadata, state, code, later),
  };
  assert.deepEqual({ ...metadata, ...patch }, metadata);
  assert.equal(JSON.stringify(metadata), original);
});

for (const previous of [
  {},
  { ...metadata, peptidesFulfillmentState: "ACTION_REQUIRED" },
  { ...metadata, peptidesFulfillmentIncidentCode: "DIFFERENT_SYNTHETIC_INCIDENT" },
  { ...metadata, peptidesFulfillmentResolvedAt: "" },
  { ...metadata, peptidesFulfillmentResolvedAt: "not-a-date" },
]) {
  test(`a new, changed or invalid resolution is stamped once: ${JSON.stringify(previous)}`, () => {
    assert.equal(resolve(previous, state, code, later), later);
  });
}
