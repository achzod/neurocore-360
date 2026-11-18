import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { DISCOVERY_UPDATED_EMAIL_TYPE, prepareDiscoveryUpdatedEmail } from "./emailService";

const script = readFileSync(new URL("../scripts/send-discovery-updated.ts", import.meta.url), "utf8");
const input = {
  email: "client@example.org", firstName: "Lea", auditId: "11111111-1111-4111-8111-111111111111",
  baseUrl: "https://apexlabs.achzodcoaching.com", trackingId: "t-1", until: "2026-11-25",
};

test("updated email: first name, report link, coaching link bound to the same until date", () => {
  const built = prepareDiscoveryUpdatedEmail(input);
  assert.equal(built.subject, "Lea, ton rapport Discovery a été mis à jour");
  assert.match(built.html, /Salut Lea,/);
  assert.match(built.html, /25 novembre 2026/);
  assert.match(built.coachingUrl, /code=DISCOVERY20/);
  assert.match(built.coachingUrl, /until=2026-11-25/);
  assert.match(built.reportLink, /\/scan\/11111111-1111-4111-8111-111111111111/);
  assert.match(built.html, /\/api\/track\/email\/t-1\/click/);
  assert.equal(prepareDiscoveryUpdatedEmail({ ...input, firstName: "" }).subject, "Ton rapport Discovery a été mis à jour");
  assert.throws(() => prepareDiscoveryUpdatedEmail({ ...input, until: "bientot" }), /until/);
});

test("updated email carries no call, meeting, dosage or study", () => {
  const built = prepareDiscoveryUpdatedEmail(input);
  const plain = `${built.text} ${built.html.replace(/<[^>]*>/g, " ")}`;
  assert.doesNotMatch(plain, /\b(?:visio|appel|rendez-vous|rdv|créneau|zoom|call)\b/i);
  assert.doesNotMatch(plain, /\b\d+\s?(?:mg|mcg|ui)\b|posologie|étude|selon une/i);
  assert.equal(DISCOVERY_UPDATED_EMAIL_TYPE, "sendDiscoveryUpdatedEmail");
});

test("send script is dry-run by default, hash-bound, one mail per address", () => {
  assert.match(script, /if \(!SEND\) \{ console\.log\("DRY-RUN : aucun mail envoyé\."\); return; \}/);
  assert.match(script, /DISCOVERY_UPDATED_SEND_CONFIRM !== listHash/);
  assert.match(script, /uniq_email_tracking_discovery_updated/);
  assert.match(script, /doublon_adresse/);
  assert.match(script, /desinscrit/);
  assert.match(script, /hard_bounce_ou_refus_fournisseur/);
  assert.match(script, /ILIKE '%555%'/);
  // The mail never promises more than the regenerated report printed.
  assert.match(script, /extractReportOfferUntil/);
  assert.match(script, /offre_rapport_expiree/);
  assert.ok(script.indexOf("PREVIEW") < script.indexOf("if (!SEND)"));
});
