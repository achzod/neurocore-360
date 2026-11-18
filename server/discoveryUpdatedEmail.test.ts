import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  DISCOVERY_UPDATED_EMAIL_TYPE,
  DISCOVERY_UPDATED_FORBIDDEN_WORDS,
  discoveryUpdatedVisibleText,
  prepareDiscoveryUpdatedEmail,
} from "./emailService";

const script = readFileSync(new URL("../scripts/send-discovery-updated.ts", import.meta.url), "utf8");
const input = {
  email: "client@example.org", firstName: "Lea", auditId: "11111111-1111-4111-8111-111111111111",
  baseUrl: "https://apexlabs.achzodcoaching.com", trackingId: "t-1", until: "2026-11-25",
};

test("updated email: first name, report link, coaching link bound to the same until date", () => {
  const built = prepareDiscoveryUpdatedEmail(input);
  assert.equal(built.subject, "Lea, j'ai repris ton rapport Discovery");
  assert.match(built.html, /Salut Lea,/);
  assert.match(built.html, /25 novembre 2026/);
  assert.match(built.coachingUrl, /code=DISCOVERY20/);
  assert.match(built.coachingUrl, /until=2026-11-25/);
  assert.match(built.reportLink, /\/scan\/11111111-1111-4111-8111-111111111111/);
  assert.match(built.html, /\/api\/track\/email\/t-1\/click/);
  assert.equal(prepareDiscoveryUpdatedEmail({ ...input, firstName: "" }).subject, "J'ai repris ton rapport Discovery");
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

// Ach : « rien ne doit sonner IA ou genre moteur, c'est un rapport fait à la main ».
const FORBIDDEN = [
  "moteur", "régénéré", "regénéré", "regenere", "généré", "genere", "nouvelle version", "IA", "intelligence artificielle",
  "algorithme", "automatique", "automatisé", "personnalisé", "personnalisée", "mis à jour", "mise à jour", "mis a jour",
];

test("forbidden-word regex catches every banned word", () => {
  for (const word of FORBIDDEN) assert.match(`ton rapport ${word} ici`, DISCOVERY_UPDATED_FORBIDDEN_WORDS, word);
  assert.doesNotMatch("J'ai repris ton rapport Discovery, relu et réécrit à la main.", DISCOVERY_UPDATED_FORBIDDEN_WORDS);
});

test("updated email contains no machine-sounding word (subject, html, text, with and without first name)", () => {
  for (const firstName of ["Lea", ""]) {
    const built = prepareDiscoveryUpdatedEmail({ ...input, firstName });
    const visible = discoveryUpdatedVisibleText(built);
    const hit = visible.match(DISCOVERY_UPDATED_FORBIDDEN_WORDS);
    assert.equal(hit, null, `mot interdit trouvé : ${hit?.[0]}`);
    for (const word of FORBIDDEN) {
      assert.ok(!visible.toLowerCase().includes(word.toLowerCase()) || word === "IA" && !/\bIA\b/i.test(visible), word);
    }
  }
});

test("updated email carries Ach's exact text, tracking and unsubscribe", () => {
  const built = prepareDiscoveryUpdatedEmail(input);
  const intro = "J'ai repris ton rapport Discovery. Je l'ai relu et réécrit à partir de tes réponses et de ce que tu m'as écrit, pour aller droit à ce qui te freine vraiment.";
  const body = "Tu y trouves une lecture claire de ton profil, tes vrais freins, les actions à lancer en premier et ce que tu peux attendre si tu t'y tiens.";
  for (const t of [intro, body, "Si tu veux qu'on le fasse ensemble :", "-20 % sur les formules coaching 8 et 12 semaines, valable jusqu'au 25 novembre 2026.", "On avance,", "Ach", "Salut Lea,"]) {
    assert.ok(built.text.includes(t), t);
  }
  assert.ok(built.text.includes("Ton code DISCOVERY20 : -20 %"));
  const esc = (v: string) => v.replace(/'/g, "&#39;");
  assert.ok(built.html.includes(esc(intro)));
  assert.ok(built.html.includes(esc(body)));
  assert.match(built.html, />Voir mon rapport</);
  assert.match(built.html, />Voir les formules coaching</);
  assert.match(built.html, /\{\{UNSUB_LINK\}\}/);
  assert.match(built.text, /\{\{UNSUB_LINK\}\}/);
  assert.match(built.html, /\/api\/track\/email\/t-1\/open\.gif/);
  assert.match(built.text, /\/api\/track\/email\/t-1\/click/);
  assert.match(built.coachingUrl, /\/go\/coaching\?code=DISCOVERY20&until=2026-11-25/);
  assert.ok(built.html.includes(encodeURIComponent(built.coachingUrl)));
});

test("send script refuses to run when a mail contains a forbidden word", () => {
  assert.match(script, /DISCOVERY_UPDATED_FORBIDDEN_WORDS/);
  assert.match(script, /FORBIDDEN_WORDS_OK/);
});
