import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  buildGuidePeptidesLineItem,
  GUIDE_PEPTIDES_AMOUNT_CENTS,
  GUIDE_PEPTIDES_BONUS_CODE,
  GUIDE_PEPTIDES_PLAN_TYPE,
  guidePeptidesOrderNumber,
  guidePeptidesPdfCandidates,
} from "./guidePeptides/config";
import { buildGuideAdminSaleEmail, buildGuideDeliveryEmail } from "./guidePeptides/emails";
import { peptidesFlatPromoAmountOffCents, resolvePromoDiscountCents } from "./peptidesFlatPromos";
import { isCriticalTransactionalEmail } from "./emailDeliveryPolicy";
import { canonicalUrlFor, isNoindexPath } from "../shared/indexingRules";

const ROOT = path.resolve(import.meta.dirname ?? __dirname, "..");

test("ligne Stripe : 99,00 EUR en price_data, ou le prix configuré s'il est valide", () => {
  const inline = buildGuidePeptidesLineItem({} as NodeJS.ProcessEnv);
  assert.equal(inline.quantity, 1);
  assert.equal(inline.price_data?.currency, "eur");
  assert.equal(inline.price_data?.unit_amount, 9900);
  assert.equal(inline.price_data?.product_data?.name, "Guide Peptides AchZod");
  assert.equal(GUIDE_PEPTIDES_AMOUNT_CENTS, 9900);
  assert.deepEqual(buildGuidePeptidesLineItem({ STRIPE_PRICE_GUIDE_PEPTIDES: "price_ABC123" } as any), { quantity: 1, price: "price_ABC123" });
  // Valeur invalide : on retombe sur le prix en ligne.
  assert.equal(buildGuidePeptidesLineItem({ STRIPE_PRICE_GUIDE_PEPTIDES: "99" } as any).price_data?.unit_amount, 9900);
  assert.equal(GUIDE_PEPTIDES_PLAN_TYPE, "GUIDE_PEPTIDES");
});

test("numéro de commande stable et lisible", () => {
  assert.equal(guidePeptidesOrderNumber("cs_live_a1B2c3D4e5F6g7H8"), "GP-E5F6G7H8");
  assert.equal(guidePeptidesOrderNumber("cs_live_a1B2c3D4e5F6g7H8"), guidePeptidesOrderNumber("cs_live_a1B2c3D4e5F6g7H8"));
  assert.match(guidePeptidesOrderNumber(""), /^GP-/);
});

test("le PDF est stocké hors des fichiers publics et se retrouve depuis la racine", () => {
  const candidates = guidePeptidesPdfCandidates({} as NodeJS.ProcessEnv, ROOT);
  const found = candidates.find((p) => existsSync(p));
  assert.ok(found, `PDF introuvable dans ${candidates.join(", ")}`);
  assert.ok(!found!.includes(`${path.sep}public${path.sep}`), "le PDF ne doit pas être servi en statique");
  assert.equal(readFileSync(found!).subarray(0, 4).toString(), "%PDF");
  assert.equal(guidePeptidesPdfCandidates({ GUIDE_PEPTIDES_PDF_PATH: "/data/x.pdf" } as any, ROOT)[0], "/data/x.pdf");
  assert.ok(!existsSync(path.join(ROOT, "client", "public", "Guide-Peptides-AchZod.pdf")));
});

test("BOOKPEPTIDES99 : 99 € fixes sur Peptides Engine, quel que soit le tier, jamais ailleurs", () => {
  assert.equal(peptidesFlatPromoAmountOffCents("BOOKPEPTIDES99", "PEPTIDES_ENGINE"), 9900);
  assert.equal(peptidesFlatPromoAmountOffCents(" bookpeptides99 ", "PEPTIDES_ENGINE"), 9900);
  assert.equal(peptidesFlatPromoAmountOffCents("BOOKPEPTIDES99", "ELITE"), null);
  assert.equal(peptidesFlatPromoAmountOffCents("BOOKPEPTIDES99", "PREMIUM"), null);
  for (const [base, final] of [[19900, 10000], [29900, 20000], [39900, 30000]]) {
    const discount = resolvePromoDiscountCents({ code: "BOOKPEPTIDES99", planType: "PEPTIDES_ENGINE", baseCents: base, discountPercent: 33 });
    assert.equal(base - discount, final);
  }
  // Sur un autre produit, le pourcentage stocké s'applique (comportement inchangé).
  assert.equal(resolvePromoDiscountCents({ code: "BOOKPEPTIDES99", planType: "ELITE", baseCents: 7900, discountPercent: 33 }), 2607);
});

test("PEPTIDES100 garde son comportement (100 € fixes, Peptides Engine seulement)", () => {
  assert.equal(peptidesFlatPromoAmountOffCents("PEPTIDES100", "PEPTIDES_ENGINE"), 10000);
  assert.equal(peptidesFlatPromoAmountOffCents("PEPTIDES100", "ELITE"), null);
  assert.equal(resolvePromoDiscountCents({ code: "PEPTIDES100", planType: "PEPTIDES_ENGINE", baseCents: 19900, discountPercent: 50 }), 10000);
  assert.equal(resolvePromoDiscountCents({ code: "ANALYSE20", planType: "PREMIUM", baseCents: 5900, discountPercent: 20 }), 1180);
});

test("routes.ts applique le montant fixe au coupon Stripe ET à la commande locale (parité Stripe)", () => {
  const src = readFileSync(path.join(ROOT, "server", "routes.ts"), "utf8");
  assert.ok(src.includes("amount_off: flatPeptidesAmountOff"));
  assert.ok((src.match(/resolvePromoDiscountCents\(/g) || []).length >= 2);
  assert.ok(!src.includes("? 10000\n"), "plus de 10000 codé en dur");
  assert.ok(src.includes("isGuidePeptidesCheckoutSession(session)"));
  assert.ok(src.includes("registerGuidePeptidesRoutes(app)"));
});

test("email de livraison : lien, numéro de commande, code, sources, sans tiret long ni emoji", () => {
  const mail = buildGuideDeliveryEmail({
    downloadUrl: "https://apexlabs.achzodcoaching.com/api/guide-peptides/download?token=abc",
    orderNumber: "GP-12345678",
    ttlDays: 30,
    baseUrl: "https://apexlabs.achzodcoaching.com",
  });
  for (const body of [mail.html, mail.text]) {
    assert.ok(body.includes("/api/guide-peptides/download?token=abc"));
    assert.ok(body.includes("GP-12345678"));
    assert.ok(body.includes(GUIDE_PEPTIDES_BONUS_CODE));
    assert.ok(body.includes("achzodyt@gmail.com"));
    assert.ok(body.includes("30 jours"));
  }
  assert.ok(mail.html.includes("/images/formcheck/achzod-logo-email.png"));
  const resend = buildGuideDeliveryEmail({ downloadUrl: "https://x.test/d", orderNumber: "GP-1", ttlDays: 30, baseUrl: "https://x.test" }, { resend: true });
  assert.match(resend.subject, /nouveau lien/);
  const admin = buildGuideAdminSaleEmail({ email: "a@b.co", orderNumber: "GP-1", amountCents: 9900, currency: "eur", stripeSessionId: "cs_test_1", deliveryEmailSent: false });
  assert.ok(admin.text.includes("99,00 EUR"));
  assert.ok(admin.text.includes("NON envoyé"));
  assertCopyRules("email", `${mail.subject}\n${mail.html}\n${mail.text}\n${resend.subject}\n${resend.text}`);
});

test("les emails du guide passent malgré un désabonnement marketing", () => {
  assert.equal(isCriticalTransactionalEmail("sendGuidePeptidesDeliveryEmail", "Ton guide Peptides est prêt à télécharger"), true);
  assert.equal(isCriticalTransactionalEmail("sendGuidePeptidesAdminSaleEmail", "x"), true);
});

test("la page de merci reste noindex avec le canonical de l'offre", () => {
  assert.equal(isNoindexPath("/guide-peptides/merci"), true);
  assert.equal(canonicalUrlFor("/guide-peptides/merci"), "https://apexlabs.achzodcoaching.com/offers/guide-peptides");
  assert.equal(isNoindexPath("/offers/guide-peptides"), false);
});

test("textes client : règles de rédaction (pas de tiret long, pas d'emoji, mots interdits, pas de dosage)", () => {
  for (const file of ["client/src/pages/offers/GuidePeptides.tsx", "client/src/pages/GuidePeptidesMerci.tsx", "server/guidePeptides/emails.ts"]) {
    assertCopyRules(file, readFileSync(path.join(ROOT, file), "utf8"));
  }
  const page = readFileSync(path.join(ROOT, "client/src/pages/offers/GuidePeptides.tsx"), "utf8");
  assert.ok(page.includes("Je veux le guide"));
  assert.ok(page.includes("12 certifications internationales"));
  assert.ok(!/\bnous\b/i.test(page.replace(/\/\*[\s\S]*?\*\//g, "")), "première personne du singulier uniquement");
  assert.ok(!/\b(bg-black|bg-\[#0)/.test(page), "aucun fond noir de page");
  const staticSrc = readFileSync(path.join(ROOT, "server/static.ts"), "utf8");
  assert.ok(staticSrc.includes('"guide-peptides": {'), "la route /offers/guide-peptides doit être connue du serveur (sinon 404)");
});

function assertCopyRules(label: string, raw: string) {
  // Les commentaires de code ne sont pas du texte client.
  const text = raw.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  const dashEntities = new RegExp(`&(?:${"m"}dash|${"n"}dash);`, "i");
  assert.ok(!/[\u2013\u2014]/.test(text) && !dashEntities.test(text), `${label} : tiret long interdit`);
  assert.ok(!/\p{Extended_Pictographic}/u.test(text), `${label} : emoji interdit`);
  for (const word of [/\bIA\b/, /g[ée]n[ée]r[ée]/i, /automatique/i, /\bmoteur\b/i, /personnalis/i, /fois moins cher/i]) {
    assert.ok(!word.test(text), `${label} : mot interdit ${word}`);
  }
  assert.ok(!/\b\d+(?:[.,]\d+)?\s?(?:mg|mcg|µg|ui|iu|ml)\b/i.test(text), `${label} : aucun dosage`);
}

test("jeton de téléchargement : aller-retour, audience dédiée, durée 30 jours", async () => {
  const auth = await import("./auth");
  const token = auth.signGuidePeptidesDownloadToken(" Client@Exemple.com ", "cs_test_abc");
  assert.deepEqual(auth.verifyGuidePeptidesDownloadToken(token), { email: "client@exemple.com", sessionId: "cs_test_abc" });
  assert.equal(auth.verifyGuidePeptidesDownloadToken(`${token}x`), null);
  // Un jeton FormCheck ne donne pas accès au PDF, et inversement.
  assert.equal(auth.verifyGuidePeptidesDownloadToken(auth.signFormcheckAccessToken("client@exemple.com")), null);
  assert.equal(auth.verifyFormcheckAccessToken(token), null);
  const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString());
  assert.equal(payload.exp - payload.iat, 30 * 24 * 3600);
  assert.equal(auth.GUIDE_PEPTIDES_DOWNLOAD_TTL_DAYS, 30);
});
