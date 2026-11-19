import assert from "node:assert/strict";
import test from "node:test";
import {
  LIST_UNSUBSCRIBE_PATH,
  buildListUnsubscribeHeaders,
  buildListUnsubscribeUrl,
  createListUnsubscribeHandlers,
  createListUnsubscribeToken,
  isMarketingSmtpRelayEnabled,
  maskEmail,
  renderUnsubscribeConfirmPage,
  renderUnsubscribeDonePage,
  renderUnsubscribeErrorPage,
  renderUnsubscribeInvalidPage,
  resolveListUnsubscribeSecret,
  shouldAttachListUnsubscribe,
  verifyListUnsubscribeToken,
  withBrevoListUnsubscribe,
  withSendPulseRestListUnsubscribe,
  withSmtpListUnsubscribe,
} from "./listUnsubscribe";

const SECRET = "test-secret-for-list-unsubscribe";
const ENV = { SESSION_SECRET: "session-secret-xyz", PUBLIC_BASE_URL: "https://apexlabs.achzodcoaching.com/" };

test("jeton : aller-retour, adresse normalisée en minuscules", () => {
  const token = createListUnsubscribeToken("  Client.Test@Example.FR ", SECRET);
  assert.equal(verifyListUnsubscribeToken(token, SECRET), "client.test@example.fr");
  assert.match(token, /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
});

test("jeton : refusé si modifié, mauvais secret, secret absent ou forme invalide", () => {
  const token = createListUnsubscribeToken("client@example.fr", SECRET);
  const [emailPart, sig] = token.split(".");
  const otherEmail = Buffer.from("autre@example.fr").toString("base64url");
  assert.equal(verifyListUnsubscribeToken(`${otherEmail}.${sig}`, SECRET), null);
  assert.equal(verifyListUnsubscribeToken(`${emailPart}.${sig.slice(0, -1)}A`, SECRET), null);
  assert.equal(verifyListUnsubscribeToken(token, "autre-secret"), null);
  assert.equal(verifyListUnsubscribeToken(token, null), null);
  assert.equal(verifyListUnsubscribeToken(undefined, SECRET), null);
  assert.equal(verifyListUnsubscribeToken("", SECRET), null);
  assert.equal(verifyListUnsubscribeToken("pasdepoint", SECRET), null);
  assert.equal(verifyListUnsubscribeToken(`${emailPart}.`, SECRET), null);
  assert.equal(verifyListUnsubscribeToken(`a$b.${sig}`, SECRET), null);
  const notAnEmail = Buffer.from("pas-une-adresse").toString("base64url");
  assert.equal(verifyListUnsubscribeToken(`${notAnEmail}.${sig}`, SECRET), null);
});

test("secret : variable dédiée prioritaire, sinon clé dérivée de SESSION_SECRET, sinon rien", () => {
  assert.equal(resolveListUnsubscribeSecret({ LIST_UNSUBSCRIBE_SECRET: " dedie ", SESSION_SECRET: "s" }), "dedie");
  const derived = resolveListUnsubscribeSecret({ SESSION_SECRET: "s" });
  assert.ok(derived && derived.length === 64);
  assert.notEqual(derived, "s");
  assert.equal(resolveListUnsubscribeSecret({ JWT_SECRET: "s" }), derived);
  assert.equal(resolveListUnsubscribeSecret({}), null);
});

test("URL et en-têtes RFC 8058", () => {
  const url = buildListUnsubscribeUrl("Client@Example.fr", ENV);
  assert.ok(url);
  assert.ok(url!.startsWith(`https://apexlabs.achzodcoaching.com${LIST_UNSUBSCRIBE_PATH}?t=`));
  const token = decodeURIComponent(new URL(url!).searchParams.get("t") || "");
  assert.equal(verifyListUnsubscribeToken(token, resolveListUnsubscribeSecret(ENV)), "client@example.fr");

  const headers = buildListUnsubscribeHeaders("client@example.fr", ENV);
  assert.ok(headers);
  assert.equal(headers!["List-Unsubscribe-Post"], "List-Unsubscribe=One-Click");
  assert.match(
    headers!["List-Unsubscribe"],
    /^<mailto:coaching@achzodcoaching\.com\?subject=Desinscription>, <https:\/\/apexlabs\.achzodcoaching\.com\/api\/email\/unsubscribe\?t=[^>]+>$/,
  );

  const custom = buildListUnsubscribeHeaders("client@example.fr", { ...ENV, LIST_UNSUBSCRIBE_MAILTO: "desinscription@achzodcoaching.com" });
  assert.match(custom!["List-Unsubscribe"], /^<mailto:desinscription@achzodcoaching\.com\?/);

  assert.equal(buildListUnsubscribeHeaders("client@example.fr", {}), null, "pas de secret, pas d'en-tête");
  assert.equal(
    buildListUnsubscribeHeaders("client@example.fr", { SESSION_SECRET: "s", PUBLIC_BASE_URL: "http://localhost:5000" }),
    null,
    "RFC 8058 exige HTTPS",
  );
});

test("seuls les mails marketing et les séquences portent les en-têtes", () => {
  const recipient = "client@example.fr";
  const yes = [
    { emailType: "sendCheckoutRecoveryEmail", subject: "Ta commande n'est pas allée au bout" },
    { emailType: "sendDiscoveryJ30NurtureEmail", subject: "La suite de ton Discovery" },
    { emailType: "sendDiscoveryJ14CoachingEmail", subject: "Et maintenant" },
    { emailType: "sendReactivationCampaignEmail", subject: "Des nouvelles" },
  ];
  for (const mail of yes) {
    assert.equal(shouldAttachListUnsubscribe({ ...mail, recipientEmail: recipient }), true, mail.emailType);
  }
  const no = [
    { emailType: "sendMagicLinkEmail", subject: "Ton lien de connexion" },
    { emailType: "sendReportReadyEmail", subject: "Ton rapport est prêt" },
    { emailType: "sendPeptidesOrderConfirmation", subject: "Commande reçue" },
    { emailType: "sendFormcheckAccessEmail", subject: "FormCheck : ton lien d'accès" },
    { emailType: "sendFormcheckReportEmail", subject: "Ton analyse FormCheck" },
    { emailType: "sendCTAEmail", subject: "Paiement reçu" },
    { emailType: "sendOperationalAlertEmail", subject: "Alerte" },
  ];
  for (const mail of no) {
    assert.equal(shouldAttachListUnsubscribe({ ...mail, recipientEmail: recipient }), false, mail.emailType);
  }
  assert.equal(
    shouldAttachListUnsubscribe({
      emailType: "sendCheckoutRecoveryEmail",
      subject: "x",
      recipientEmail: "coaching@achzodcoaching.com",
      adminEmails: ["coaching@achzodcoaching.com"],
    }),
    false,
    "mail adressé à l'admin",
  );
});

test("fournisseurs : Brevo et SMTP reçoivent les en-têtes, SendPulse REST reste inchangé", () => {
  const headers = buildListUnsubscribeHeaders("client@example.fr", ENV)!;
  const brevo = withBrevoListUnsubscribe({ subject: "s", headers: { "X-Existant": "1" } }, headers);
  assert.equal(brevo.headers?.["List-Unsubscribe"], headers["List-Unsubscribe"]);
  assert.equal(brevo.headers?.["List-Unsubscribe-Post"], "List-Unsubscribe=One-Click");
  assert.equal(brevo.headers?.["X-Existant"], "1");

  const smtp = withSmtpListUnsubscribe({ subject: "s" }, headers);
  assert.equal(smtp.headers?.["List-Unsubscribe-Post"], "List-Unsubscribe=One-Click");

  const sendpulse = { subject: "s", html: "aGVsbG8=", text: "t" };
  assert.deepEqual(withSendPulseRestListUnsubscribe(sendpulse, headers), sendpulse);

  const untouched = { subject: "s" };
  assert.deepEqual(withBrevoListUnsubscribe(untouched, null), untouched);
  assert.deepEqual(withSmtpListUnsubscribe(untouched, null), untouched);
});

test("SMTP : le message MIME produit contient bien les deux en-têtes", async (t) => {
  const nodemailer = await import("nodemailer").then((m: any) => m.default || m).catch(() => null);
  if (!nodemailer) {
    t.skip("nodemailer non installé dans cet environnement");
    return;
  }
  const headers = buildListUnsubscribeHeaders("client@example.fr", ENV)!;
  const transport = nodemailer.createTransport({ streamTransport: true, buffer: true, newline: "unix" });
  const info = await transport.sendMail(withSmtpListUnsubscribe({
    from: { name: "ApexLabs", address: "coaching@achzodcoaching.com" },
    to: "client@example.fr",
    subject: "Test",
    text: "Bonjour",
  }, headers));
  const raw = (info.message as Buffer).toString("utf8").replace(/\n[ \t]+/g, " ");
  assert.match(raw, /^List-Unsubscribe-Post: List-Unsubscribe=One-Click$/m);
  const line = raw.split("\n").find((l) => l.startsWith("List-Unsubscribe: "));
  assert.ok(line, "en-tête List-Unsubscribe présent");
  assert.ok(line!.includes("<mailto:coaching@achzodcoaching.com?subject=Desinscription>"));
  assert.ok(line!.replace(/\s+/g, "").includes(headers["List-Unsubscribe"].replace(/\s+/g, "").split(",")[1]));
});

test("relais SMTP marketing : désactivé par défaut", () => {
  assert.equal(isMarketingSmtpRelayEnabled({}), false);
  assert.equal(isMarketingSmtpRelayEnabled({ EMAIL_MARKETING_VIA_SMTP_RELAY: "1" }), true);
  assert.equal(isMarketingSmtpRelayEnabled({ EMAIL_MARKETING_VIA_SMTP_RELAY: "0" }), false);
});

// ---------------------------------------------------------------------------
// Route
// ---------------------------------------------------------------------------

type FakeRes = {
  statusCode: number;
  body: string;
  headers: Record<string, string>;
  status: (code: number) => FakeRes;
  send: (body: string) => FakeRes;
  setHeader: (name: string, value: string) => void;
};

const fakeRes = (): FakeRes => {
  const res: FakeRes = {
    statusCode: 200,
    body: "",
    headers: {},
    status(code) {
      res.statusCode = code;
      return res;
    },
    send(body) {
      res.body = body;
      return res;
    },
    setHeader(name, value) {
      res.headers[name.toLowerCase()] = value;
    },
  };
  return res;
};

const makeHandlers = (impl?: (email: string, reason: string) => Promise<void>) => {
  const calls: Array<{ email: string; reason: string }> = [];
  const handlers = createListUnsubscribeHandlers({
    getSecret: () => SECRET,
    log: () => {},
    unsubscribe: async (email, reason) => {
      calls.push({ email, reason });
      if (impl) await impl(email, reason);
    },
  });
  return { handlers, calls };
};

test("GET : page de confirmation avec bouton, aucune désinscription", async () => {
  const { handlers, calls } = makeHandlers();
  const token = createListUnsubscribeToken("client@example.fr", SECRET);
  const res = fakeRes();
  await handlers.get({ query: { t: token }, body: {} } as any, res as any);
  assert.equal(res.statusCode, 200);
  assert.equal(calls.length, 0, "un GET ne désinscrit jamais (scanners de liens)");
  assert.match(res.body, /<form method="post" action="\/api\/email\/unsubscribe\?t=/);
  assert.match(res.body, /Confirmer la désinscription/);
  assert.match(res.body, /cl\*+@example\.fr/);
  assert.equal(res.headers["cache-control"], "no-store");
  assert.equal(res.headers["x-robots-tag"], "noindex, nofollow");
});

test("GET : jeton invalide, page d'erreur 400", async () => {
  const { handlers, calls } = makeHandlers();
  const res = fakeRes();
  await handlers.get({ query: { t: "abc.def" }, body: {} } as any, res as any);
  assert.equal(res.statusCode, 400);
  assert.equal(calls.length, 0);
  assert.match(res.body, /Ce lien n'est pas valide/);
});

test("POST en un clic (Gmail, Yahoo) : adresse ajoutée à la liste de suppression", async () => {
  const { handlers, calls } = makeHandlers();
  const token = createListUnsubscribeToken("Client@Example.fr", SECRET);
  const res = fakeRes();
  await handlers.post({ query: { t: token }, body: { "List-Unsubscribe": "One-Click" } } as any, res as any);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(calls, [{ email: "client@example.fr", reason: "list_unsubscribe_one_click" }]);
  assert.match(res.body, /Désinscription confirmée/);
});

test("POST depuis la page (jeton dans le corps ou l'URL)", async () => {
  const { handlers, calls } = makeHandlers();
  const token = createListUnsubscribeToken("client@example.fr", SECRET);
  const res = fakeRes();
  await handlers.post({ query: {}, body: { t: token } } as any, res as any);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(calls, [{ email: "client@example.fr", reason: "list_unsubscribe_page" }]);
});

test("POST : jeton invalide refusé, rien n'est écrit", async () => {
  const { handlers, calls } = makeHandlers();
  const forged = `${Buffer.from("victime@example.fr").toString("base64url")}.${"A".repeat(43)}`;
  const res = fakeRes();
  await handlers.post({ query: { t: forged }, body: { "List-Unsubscribe": "One-Click" } } as any, res as any);
  assert.equal(res.statusCode, 400);
  assert.equal(calls.length, 0);
});

test("POST : erreur d'écriture, page 500 sobre", async () => {
  const { handlers } = makeHandlers(async () => {
    throw new Error("db down");
  });
  const token = createListUnsubscribeToken("client@example.fr", SECRET);
  const res = fakeRes();
  const originalError = console.error;
  console.error = () => {};
  try {
    await handlers.post({ query: { t: token }, body: {} } as any, res as any);
  } finally {
    console.error = originalError;
  }
  assert.equal(res.statusCode, 500);
  assert.match(res.body, /n'a pas pu être enregistrée/);
});

test("textes visibles : pas de tiret long, pas d'emoji, pas de mots interdits", () => {
  const pages = [
    renderUnsubscribeConfirmPage("client@example.fr", "tok.en"),
    renderUnsubscribeDonePage("client@example.fr"),
    renderUnsubscribeInvalidPage(),
    renderUnsubscribeErrorPage(),
  ];
  for (const page of pages) {
    assert.doesNotMatch(page, /[\u2013\u2014]/);
    assert.doesNotMatch(page, /\p{Extended_Pictographic}/u);
    assert.doesNotMatch(page, /\bIA\b|moteur|automatique/i);
    assert.match(page, /<html lang="fr">/);
  }
});

test("masquage de l'adresse affichée", () => {
  assert.equal(maskEmail("client@example.fr"), "cl****@example.fr");
  assert.equal(maskEmail("a@example.fr"), "a*@example.fr");
});

test("échappement : une adresse piégée ne casse pas la page", () => {
  const token = createListUnsubscribeToken("x\"><script>@example.fr", SECRET);
  // L'adresse ne passe pas la validation, donc pas de page de confirmation.
  assert.equal(verifyListUnsubscribeToken(token, SECRET), null);
  const page = renderUnsubscribeDonePage("a<b@example.fr");
  assert.doesNotMatch(page, /a<b/);
});

test("câblage dans sendEmailWithTracking : lien signé, en-têtes sur les trois voies, jamais sur les transactionnels", async () => {
  const fs = await import("node:fs");
  const path = await import("node:path");
  const source = fs.readFileSync(path.join(process.cwd(), "server", "emailService.ts"), "utf8");
  const start = source.indexOf("async function sendEmailWithTracking(");
  const end = source.indexOf("function renderCoachingOffersTable(");
  assert.ok(start > 0 && end > start);
  const body = source.slice(start, end);
  assert.match(body, /const unsubLink = buildListUnsubscribeUrl\(trackingData\.recipientEmail\)/);
  assert.match(body, /const listUnsubscribeHeaders = !criticalEmail && shouldAttachListUnsubscribe\(/);
  assert.match(body, /withSendPulseRestListUnsubscribe\(payloadWithBcc, listUnsubscribeHeaders\)/);
  assert.match(body, /JSON\.stringify\(withBrevoListUnsubscribe\(\{/);
  assert.equal((body.match(/withSmtpListUnsubscribe\(\{/g) || []).length, 2, "relais marketing + secours SMTP");
  assert.match(body, /if \(listUnsubscribeHeaders && isMarketingSmtpRelayEnabled\(\)\)/);
  // Les en-têtes sont calculés après le contrôle de la liste de suppression.
  assert.ok(body.indexOf("evaluateEmailSuppression(") < body.indexOf("const listUnsubscribeHeaders"));
});
