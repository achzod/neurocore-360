import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import {
  estimateNeedMg,
  validateU100Reconstitution,
} from "./peptidesReportValidator";

const routes = readFileSync(new URL("./routes.ts", import.meta.url), "utf8");
const engine = readFileSync(new URL("./peptidesEngine.ts", import.meta.url), "utf8");
const storage = readFileSync(new URL("./storage.ts", import.meta.url), "utf8");
const emailService = readFileSync(new URL("./emailService.ts", import.meta.url), "utf8");

function slice(startMarker: string, endMarker: string): string {
  const start = routes.indexOf(startMarker);
  const end = routes.indexOf(endMarker, start + startMarker.length);
  assert.ok(start >= 0 && end > start, `${startMarker}..${endMarker}`);
  return routes.slice(start, end);
}

test("the strict generation schema supports one active axis and explicit conditional cards", () => {
  const schema = engine.slice(
    engine.indexOf("const PEPTIDES_REPORT_JSON_SCHEMA"),
    engine.indexOf("async function callOpenAIForPeptides"),
  );
  assert.match(schema, /peptides:\s*\{[\s\S]*minItems:\s*1/);
  for (const field of ["activationStatus", "activationRequirements", "evidenceSummary"]) {
    assert.match(schema, new RegExp(field));
  }
  assert.match(schema, /conditional-inactive/);
});

test("U-100 arithmetic rejects a polished but false syringe conversion", () => {
  const valid = "Vial 5mg + 2ml BAC water = 2.5 mg/ml. Pour 1mg = 40 unités U-100 (soit 0.40 ml).";
  const invalid = "Vial 5mg + 2ml BAC water = 2.5 mg/ml. Pour 1mg = 90 unités U-100 (soit 0.90 ml).";
  assert.deepEqual(validateU100Reconstitution(valid), []);
  const issues = validateU100Reconstitution(invalid);
  assert.ok(issues.some((issue) => issue.includes("conversion U-100 incoherente")));
  assert.ok(issues.some((issue) => issue.includes("volume injecte incoherent")));
});

test("natural French titration points forward-fill until the next plateau", () => {
  const need = estimateNeedMg({
    name: "Retatrutide",
    dosage: "0,25 mg semaine 1, 0,5 mg semaine 5, 1 mg semaine 9, une injection par semaine",
    cycleDuration: "12 semaines",
  });
  assert.equal(need, 7);
});

test("paid generation uses only the questionnaire sealed into the exact order", () => {
  const autogen = slice(
    "// Auto-recovery: generate missing peptides reports every 5 minutes",
    "// Auto-send READY/SCHEDULED reports",
  );
  assert.match(autogen, /validateTrustedPeptidesOrderSource\(freshOrder\)/);
  assert.doesNotMatch(autogen, /getBurnoutProgress\(`peptides::\$\{email\}`\)/);
  assert.match(autogen, /expectedGenerationClaimId:\s*generationClaim\.claimId/);
  assert.match(autogen, /createAndClaimPeptidesReport/);
});

test("AutoGen kill switch is wired to the actual worker", () => {
  const autogen = slice(
    "// Auto-recovery: generate missing peptides reports every 5 minutes",
    "// Auto-send READY/SCHEDULED reports",
  );
  assert.match(autogen, /isPeptidesAutogenEnabled\(\)/);
  assert.match(autogen, /if \(!peptidesAutogenEnabled\) return/);
  assert.doesNotMatch(autogen, /Force-resetting stuck autoGenRunning flag/);
});

test("the report generator has no account-credit persistence side effect", () => {
  assert.doesNotMatch(engine, /storage\.(?:getUserByEmail|createUser)/);
  assert.doesNotMatch(engine, /UPDATE users SET credits/);
  assert.match(engine, /bloodAnalysisCreditLabels/);
});

test("report insert and order link share one database transaction and email lock", () => {
  const start = storage.indexOf("async createAndClaimPeptidesReport", storage.indexOf("export class PgStorage"));
  const end = storage.indexOf("async getBurnoutReport", start);
  const body = storage.slice(start, end);
  assert.match(body, /BEGIN/);
  assert.match(body, /pg_advisory_xact_lock/);
  assert.match(body, /INSERT INTO burnout_reports/);
  assert.match(body, /UPDATE orders/);
  assert.match(body, /COMMIT/);
  assert.match(body, /peptidesGenerationClaimId/);
});

test("unsafe compatibility and force-paid Peptides entrypoints fail closed", () => {
  const compatibility = slice(
    'app.post("/api/peptides-engine/create"',
    "// 3. Get generated report by ID",
  );
  assert.match(compatibility, /status\(410\)/);
  assert.match(compatibility, /PEPTIDES_CREATE_COMPATIBILITY_ENDPOINT_RETIRED/);

  const forcePaid = slice(
    'app.post("/api/admin/orders/:id/force-paid"',
    'app.post("/api/admin/orders/:id/cancel"',
  );
  assert.match(forcePaid, /PEPTIDES_FORCE_PAID_DISABLED/);
  assert.doesNotMatch(forcePaid, /generatePeptidesProtocol/);
});

test("delivery is terminal only after SMTP evidence and ambiguous claims are reconciled", () => {
  assert.match(emailService, /requiresSmtpDeliveryProof/);
  assert.match(emailService, /hasPositiveSmtpDelivery/);
  assert.match(emailService, /reconcileSendPulseDeliveryEvidence/);
  assert.match(routes, /Peptides Delivery Reconcile/);
  assert.match(routes, /finalizePeptidesDeliveryClaim\(row\.id, reportId, claimId, "ACCEPTED"\)/);
  assert.match(routes, /finalizePeptidesDeliveryClaim\(row\.id, reportId, claimId, "FAILED"\)/);
  assert.match(storage, /DELIVERY_PROVIDER_RESULT_UNCERTAIN/);
  assert.match(storage, /DELIVERY_PROVIDER_CONFIRMED_FAILED/);
});
