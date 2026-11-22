import assert from "node:assert/strict";
import test from "node:test";
import {
  buildPeptidesOrderConfirmationEmail,
  buildPurchaseAdminNotificationEmail,
  buildScanPurchaseConfirmationEmail,
  formatEuros,
  greetingName,
  purchaseOrderNumber,
} from "./purchaseEmails";

const FORBIDDEN = /[—–]|\bIA\b|g[ée]n[ée]r[ée]|automatique|moteur|personnalis|\b\d+\s?(mg|mcg|µg|ui|iu)\b/i;
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;

const base = { orderId: "3f2a9c1b-1111-2222-3333-444455556666", email: "client@example.com", firstName: "Marc", amountCents: 5900, promoCode: null };

test("each scan confirmation is clean, names the product, price and order number", () => {
  for (const [type, label, cents, code] of [["PREMIUM", "Anabolic Bioscan", 5900, "BIOSCAN59"], ["ELITE", "Ultimate Scan", 7900, "ULTIMATE79"], ["BLOOD_ANALYSIS", "Blood Analysis", 9900, "BLOOD99"]] as const) {
    const mail = buildScanPurchaseConfirmationEmail(type, { ...base, amountCents: cents });
    assert.match(mail.subject, new RegExp(label));
    for (const part of [mail.subject, mail.text, mail.html]) {
      assert.doesNotMatch(part, FORBIDDEN, `${type}: ${part.match(FORBIDDEN)?.[0]}`);
      assert.doesNotMatch(part, EMOJI);
      assert.doesNotMatch(part, / , /);
    }
    assert.match(mail.text, new RegExp(formatEuros(cents)));
    assert.match(mail.text, /3F2A9C1B/);
    assert.match(mail.text, new RegExp(code));
    assert.match(mail.html, /Salut Marc,/);
  }
});

test("Peptides confirmation carries tier, price, credit and no dosage", () => {
  const mail = buildPeptidesOrderConfirmationEmail({ ...base, amountCents: 19900, tierLabel: "Solo", deliveryLabel: "23 novembre à 14 h", bloodCreditsCount: 0, coachingCreditAmount: "199 €" });
  for (const part of [mail.subject, mail.text, mail.html]) {
    assert.doesNotMatch(part, FORBIDDEN, part.match(FORBIDDEN)?.[0]);
    assert.doesNotMatch(part, /dosage/i);
  }
  assert.match(mail.text, /Peptides Engine Solo/);
  assert.match(mail.text, /199\s€/);
});

test("admin notification is tagged TEST for a cs_test_ session", () => {
  const test1 = buildPurchaseAdminNotificationEmail({ productLabel: "Ultimate Scan", email: "a@b.co", amountCents: 7900, orderId: "x", stripeSessionId: "cs_test_abc" });
  assert.match(test1.subject, /^\[TEST, pas une vente\]/);
  const live = buildPurchaseAdminNotificationEmail({ productLabel: "Ultimate Scan", email: "a@b.co", amountCents: 7900, orderId: "x", stripeSessionId: "cs_live_abc" });
  assert.doesNotMatch(live.subject, /TEST/);
});

test("helpers", () => {
  assert.equal(formatEuros(4130), "41,30\u00a0€");
  assert.equal(formatEuros(9900), "99\u00a0€");
  assert.equal(greetingName("achzodyt+apexaudit"), "");
  assert.equal(greetingName("jérôme Martin"), "Jérôme");
  assert.equal(greetingName("jean.dupont@gmail.com"), "");
  assert.equal(purchaseOrderNumber("ab12-cd34-ef56"), "AB12CD34");
});
