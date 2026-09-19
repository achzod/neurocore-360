import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const routes = fs.readFileSync(new URL("./routes.ts", import.meta.url), "utf8");
const emailService = fs.readFileSync(new URL("./emailService.ts", import.meta.url), "utf8");
const emailContent = fs.readFileSync(new URL("./peptidesPreviewEmailContent.ts", import.meta.url), "utf8");
const enginePage = fs.readFileSync(new URL("../client/src/pages/PeptidesEnginePage.tsx", import.meta.url), "utf8");

test("signed Preview handoff reuses exact answers and skips the full Engine questionnaire", () => {
  assert.match(routes, /createPeptidesPreviewCheckoutToken\(progress\.id\)/);
  assert.match(routes, /\/api\/peptides-preview\/checkout-context/);
  assert.match(routes, /mapPreviewToPeptidesResponses/);
  assert.match(routes, /previewCheckoutConfirmationFields/);
  assert.match(enginePage, /data\.responses/);
  assert.match(enginePage, /setSectionIndex\(PEPTIDES_SECTIONS\.length - 1\)/);
  assert.match(enginePage, /setShowCheckout\(stillMissing\.length === 0\)/);
  assert.match(enginePage, /previewToken: previewToken \|\| undefined/);
  assert.doesNotMatch(enginePage, /Le questionnaire Peptides Engine reste distinct/);
});

test("result and follow-up emails carry signed handoff and promise no questionnaire restart", () => {
  assert.match(emailService, /createPeptidesPreviewCheckoutToken\(leadId\)/);
  assert.match(emailService, /createPeptidesPreviewCheckoutToken\(input\.leadId\)/);
  assert.match(emailService, /#preview_token=/);
  assert.match(emailContent, /Tu ne recommences pas le questionnaire/);
  assert.match(emailContent, /Choisir mon offre Peptides Engine/);
});

test("Stripe and PayPal keep server-side questionnaire and email gates", () => {
  assert.equal((routes.match(/validatePeptidesEngineResponses\(responses, email\)/g) || []).length, 2);
  assert.match(routes, /PEPTIDES_QUESTIONNAIRE_INCOMPLETE/);
  assert.match(routes, /PREVIEW_EMAIL_MISMATCH/);
});
