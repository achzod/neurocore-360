import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const routes = fs.readFileSync(new URL("./routes.ts", import.meta.url), "utf8");
const emailService = fs.readFileSync(new URL("./emailService.ts", import.meta.url), "utf8");
const enginePage = fs.readFileSync(new URL("../client/src/pages/PeptidesEnginePage.tsx", import.meta.url), "utf8");

test("signed Preview handoff is attribution-only and starts the dedicated Engine questionnaire", () => {
  assert.match(routes, /createPeptidesPreviewCheckoutToken\(progress\.id\)/);
  assert.match(routes, /\/api\/peptides-preview\/handoff-context/);
  assert.doesNotMatch(routes, /mapPreviewToPeptidesResponses|engine_prefilled|checkout-context/);
  assert.doesNotMatch(enginePage, /data\.responses/);
  assert.match(enginePage, /setResponses\(\{\}\);\s*setSectionIndex\(0\);\s*setShowCheckout\(false\)/);
  assert.match(enginePage, /previewToken: previewToken \|\| undefined/);
});

test("result and follow-up emails carry signed attribution without promising answer reuse", () => {
  assert.match(emailService, /createPeptidesPreviewCheckoutToken\(leadId\)/);
  assert.match(emailService, /createPeptidesPreviewCheckoutToken\(input\.leadId\)/);
  assert.match(emailService, /#preview_token=/);
  assert.doesNotMatch(emailService, /aucun second questionnaire|réponses reprises|réutilisées dans Peptides Engine/i);
});

test("Stripe and PayPal both reject an incomplete dedicated questionnaire", () => {
  assert.equal((routes.match(/validatePeptidesEngineResponses\(responses, email\)/g) || []).length, 2);
  assert.match(routes, /PEPTIDES_QUESTIONNAIRE_INCOMPLETE/);
  assert.match(routes, /PREVIEW_EMAIL_MISMATCH/);
});
