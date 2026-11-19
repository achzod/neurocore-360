import assert from "node:assert/strict";
import test from "node:test";

import { buildApexLabsWelcomeEmailContent } from "./emailService";
import { classifyEmailForSuppression } from "./emailSuppression";

const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;

const footerOf = (html: string): string => {
  const idx = html.indexOf("{{UNSUB_LINK}}");
  return idx < 0 ? "" : html.slice(Math.max(0, idx - 400), idx + 200);
};

test("mail de bienvenue ApexLabs : classé marketing, lien de désinscription visible", () => {
  assert.equal(
    classifyEmailForSuppression({
      emailType: "sendApexLabsWelcomeEmail",
      subject: "Bienvenue dans l'élite ApexLabs",
      recipientEmail: "client@example.com",
    }),
    "marketing",
  );
  const mail = buildApexLabsWelcomeEmailContent();
  assert.match(mail.html, /<a href="\{\{UNSUB_LINK\}\}"[^>]*>Se désabonner<\/a>/);
  assert.match(mail.text, /Se désabonner : \{\{UNSUB_LINK\}\}/);
  assert.match(footerOf(mail.html), /liste d'attente ApexLabs/);
  assert.doesNotMatch(footerOf(mail.html), EMOJI);
});
