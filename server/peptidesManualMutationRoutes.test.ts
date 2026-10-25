import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const routes = readFileSync(new URL("./routes.ts", import.meta.url), "utf8");

function routeSlice(startMarker: string, endMarker: string): string {
  const start = routes.indexOf(startMarker);
  const end = routes.indexOf(endMarker, start + startMarker.length);
  assert.ok(start >= 0, `missing start ${startMarker}`);
  assert.ok(end > start, `missing end ${endMarker}`);
  return routes.slice(start, end);
}

test("manual target preview binds order, report, email, client name and current hash", () => {
  const route = routeSlice(
    'app.post("/api/admin/peptides/manual-target-preview"',
    'app.post("/api/admin/peptides/manual-order-target-preview"',
  );
  for (const field of ["orderId", "reportId", "email", "expectedClientName", "expectedCurrentReportSha256", "expectedSourceSha256", "expectedPayloadSha256"]) {
    assert.match(route, new RegExp(field));
  }
  assert.match(route, /requiredConfirmation/);
  assert.match(route, /getPeptidesManualMutationPayload/);
  assert.match(route, /currentSourceSha256/);
  assert.match(route, /currentPayloadSha256/);
  assert.match(route, /Cache-Control/);
  assert.match(route, /requireConfirmation:\s*false/);
});

test("order mutation preview binds the exact paid order, recipient and client name", () => {
  const route = routeSlice(
    'app.post("/api/admin/peptides/manual-order-target-preview"',
    "// Mint a fresh report-access URL",
  );
  for (const field of ["orderId", "email", "expectedClientName", "expectedSourceSha256", "expectedPayloadSha256", "requiredConfirmation"]) {
    assert.match(route, new RegExp(field));
  }
  assert.match(route, /getBurnoutProgress/);
  assert.match(route, /getPeptidesManualMutationPayload/);
  assert.match(route, /currentSourceSha256/);
  assert.match(route, /currentPayloadSha256/);
  assert.match(route, /requireConfirmation:\s*false/);
});

test("every sensitive option is included in the canonical mutation payload", () => {
  const helpers = routeSlice(
    "function getPeptidesManualMutationPayload",
    "function validateManualPeptidesOrderTargetOrRespond",
  );
  for (const field of [
    "skipEmail", "replaceReportId", "manualExpertDirective", "recoveryPreviousError", "forceImmediate",
    "expectedCurrentReportId", "fromEmail", "toEmail", "apply", "holdDelivery", "responses", "hold", "reason",
    "force", "patches", "removePeptides",
  ]) assert.match(helpers, new RegExp(field));
});

test("in-place generation requires silent mode and an exact target lock before persistence", () => {
  const route = routeSlice(
    'app.post("/api/admin/peptides-generate"',
    "// Admin: link an orphan paid Peptides Engine order",
  );
  assert.match(route, /replaceReportId[\s\S]*skipEmail/);
  assert.match(route, /expectedMutation:\s*"replace-report"/);
  assert.match(route, /currentReportId !== String\(replaceReportId\)/);
  assert.match(route, /confirmationOrder && !replaceReportId/);
  assert.match(route, /expectedMutation:\s*"generate-report"/);
  assert.match(route, /generatedValidation/);
  assert.match(route, /generatedCommercialIncident/);
  assert.ok(route.indexOf('expectedMutation: "generate-report"') < route.indexOf("generatePeptidesProtocol(responses"));
  assert.ok(route.indexOf('expectedMutation: "replace-report"') < route.indexOf("updateBurnoutReport(replaceReportId"));
});

test("manual relink and email correction require an exact target lock", () => {
  const relink = routeSlice(
    'app.post("/api/admin/peptides-link-order-to-report"',
    "// Admin: correct a Peptides Engine typo email",
  );
  assert.match(relink, /expectedMutation:\s*"link-order-to-report"/);
  assert.match(relink, /allowUnlinkedReport:\s*true/);
  assert.ok(relink.indexOf('expectedMutation: "link-order-to-report"') < relink.indexOf("claimPeptidesReportSlotForManualReview"));

  const email = routeSlice(
    'app.post("/api/admin/peptides-correct-email"',
    "// Admin: inject responses manually",
  );
  assert.match(email, /expectedMutation:\s*"correct-email"/);
  assert.ok(email.indexOf('expectedMutation: "correct-email"') < email.indexOf("updateOrder(orderId"));
});

test("order-level recovery, hold and confirmation endpoints are target-locked", () => {
  const reset = routeSlice(
    'app.post("/api/admin/orders/:id/peptides-reset-generation-lock"',
    "// Admin: force generate peptides report",
  );
  assert.match(reset, /expectedMutation:\s*"reset-generation-lock"/);
  assert.ok(reset.indexOf('expectedMutation: "reset-generation-lock"') < reset.indexOf("resetPeptidesGenerationCircuit"));

  const inject = routeSlice(
    'app.post("/api/admin/peptides-inject-responses"',
    'app.get("/api/admin/audits"',
  );
  assert.match(inject, /expectedMutation:\s*"inject-responses"/);
  assert.ok(inject.indexOf('expectedMutation: "inject-responses"') < inject.indexOf("saveBurnoutProgress"));

  const hold = routeSlice(
    'app.post("/api/admin/peptides/delivery-hold"',
    'app.post("/api/admin/peptides/test-generate"',
  );
  assert.match(hold, /expectedMutation:\s*"delivery-hold"/);
  assert.ok(hold.indexOf('expectedMutation: "delivery-hold"') < hold.indexOf("setOrderMetadataKey"));

  const confirmation = routeSlice(
    'app.post("/api/admin/peptides/send-order-confirmation"',
    "// Admin: validate + recompute vials math",
  );
  assert.match(confirmation, /expectedMutation:\s*"send-order-confirmation"/);
  assert.ok(confirmation.indexOf('expectedMutation: "send-order-confirmation"') < confirmation.indexOf("sendPeptidesOrderConfirmationOnce"));
});

test("vial recompute, live repair and section edits are target-locked and fail closed", () => {
  const recompute = routeSlice(
    'app.post("/api/admin/peptides/recompute-vials/:reportId"',
    "// Admin: full deterministic repair before delivery",
  );
  assert.match(recompute, /expectedMutation:\s*"recompute-vials"/);
  assert.match(recompute, /Strict validation failed, report not persisted/);
  assert.ok(recompute.indexOf('expectedMutation: "recompute-vials"') < recompute.indexOf("updateBurnoutReport(reportId, fixed"));

  const repair = routeSlice(
    'app.post("/api/admin/peptides/repair-live/:reportId"',
    "// Admin: patch one or more section.content fields",
  );
  assert.match(repair, /expectedMutation:\s*"repair-live"/);
  assert.match(repair, /metadata\?\.peptidesReportId/);
  assert.doesNotMatch(repair, /length === 1/);
  assert.match(repair, /commercialIncident/);
  assert.ok(repair.indexOf('expectedMutation: "repair-live"') < repair.indexOf("updateBurnoutReport(reportId, repaired"));

  const edit = routeSlice(
    'app.post("/api/admin/peptides/edit-sections/:reportId"',
    "// Admin: validate a peptides report without modification",
  );
  assert.match(edit, /expectedMutation:\s*"edit-sections"/);
  assert.match(edit, /validatePeptidesReport\(report\)/);
  assert.match(edit, /commercialIncident/);
  assert.ok(edit.indexOf('expectedMutation: "edit-sections"') < edit.indexOf("updateBurnoutReport(reportId, report"));
});
