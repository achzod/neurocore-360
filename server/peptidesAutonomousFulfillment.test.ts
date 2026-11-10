import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  buildPeptidesFulfillmentIncidentPatch,
  shouldAlertPeptidesFulfillmentIncident,
} from "./peptidesFulfillmentInvariant";

const routes = readFileSync(new URL("./routes.ts", import.meta.url), "utf8");
const backup = readFileSync(new URL("../scripts/backup-db-local.sh", import.meta.url), "utf8");

test("an admin incident is not marked alerted before provider acceptance", () => {
  const patch = buildPeptidesFulfillmentIncidentPatch({}, {
    code: "MISSING_REPORT",
    blocksDelivery: false,
    detail: "missing",
  }, {}, "2026-11-10T10:00:00.000Z");
  assert.equal(patch.peptidesFulfillmentIncidentAlertedAt, undefined);
  assert.equal(shouldAlertPeptidesFulfillmentIncident(patch, "MISSING_REPORT"), true);
  assert.match(routes, /if \(alerted\) \{[\s\S]{0,500}peptidesFulfillmentIncidentAlertedAt/);
  assert.match(routes, /peptidesFulfillmentIncidentAlertState: "PROVIDER_ACCEPTED"/);
});

test("expired source context queues a source-only refresh instead of terminal review", () => {
  const expiryBranch = routes.slice(
    routes.indexOf('if (sourceGuardError === "source_context_expired")'),
    routes.indexOf("if (sourceGuardError)", routes.indexOf('if (sourceGuardError === "source_context_expired")') + 1),
  );
  assert.match(expiryBranch, /resetExpiredPeptidesSourceContext/);
  assert.match(expiryBranch, /no provider call/);
  assert.doesNotMatch(expiryBranch, /markPeptidesSourceNeedsReview/);
});

test("confirmation notifications reconcile SMTP and retry only confirmed failures", () => {
  assert.match(routes, /peptidesConfirmationReconcileRunning/);
  assert.match(routes, /email_type = 'sendPeptidesOrderConfirmation'/);
  assert.match(routes, /peptidesOrderConfirmationState: "SMTP_DELIVERED"/);
  assert.match(routes, /peptidesOrderConfirmationState: "SMTP_FAILED_RETRYABLE"/);
  assert.match(routes, /metadata->>'peptidesOrderConfirmationClaimId' = \$3/);
  assert.match(routes, /PROVIDER_RESULT_UNKNOWN/);
});

test("backup script requires injected credentials and contains no PostgreSQL URL", () => {
  assert.match(backup, /DB_URL="\$\{DATABASE_URL:-\}"/);
  assert.doesNotMatch(backup, /postgresql:\/\//);
});
