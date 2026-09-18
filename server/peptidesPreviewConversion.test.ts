import assert from "node:assert/strict";
import test from "node:test";

process.env.SESSION_SECRET = "x".repeat(32);

const {
  createPeptidesPreviewCheckoutToken,
  verifyPeptidesPreviewCheckoutToken,
} = await import("./peptidesPreviewConversion");

test("signed preview attribution tokens are scoped, tamper-evident and expire", () => {
  const now = Date.parse("2026-09-18T12:00:00.000Z");
  const leadId = "193ca94c-f293-4513-aba3-ee1edb431a77";
  const token = createPeptidesPreviewCheckoutToken(leadId, now);

  assert.deepEqual(verifyPeptidesPreviewCheckoutToken(token, now + 1_000), {
    v: 1,
    leadId,
    exp: now + 14 * 24 * 60 * 60 * 1_000,
  });
  assert.throws(
    () => verifyPeptidesPreviewCheckoutToken(`${token.slice(0, -1)}x`, now + 1_000),
    /PEPTIDES_PREVIEW_INVALID_TOKEN/,
  );
  assert.throws(
    () => verifyPeptidesPreviewCheckoutToken(token, now + 15 * 24 * 60 * 60 * 1_000),
    /PEPTIDES_PREVIEW_TOKEN_EXPIRED/,
  );
});

test("token creation rejects non UUID lead identifiers", () => {
  assert.throws(
    () => createPeptidesPreviewCheckoutToken("not-a-lead"),
    /PEPTIDES_PREVIEW_INVALID_LEAD_ID/,
  );
});
