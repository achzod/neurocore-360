/**
 * Guide Peptides : email de livraison (acheteur) et notification admin.
 * Gabarit clair aux couleurs AchZod, même rail d'envoi que FormCheck.
 */
import {
  ACHZOD_COACHING_URL,
  GUIDE_PEPTIDES_BONUS_CODE,
  GUIDE_PEPTIDES_BRAND as C,
  GUIDE_PEPTIDES_OFFER_PATH,
  GUIDE_PEPTIDES_SOURCES_EMAIL,
  PEPTIDES_ENGINE_URL,
} from "./config";

const esc = (value: unknown) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] || c);

const LOGO_PATH = "/images/formcheck/achzod-logo-email.png";

function logoUrlFrom(anyLinkOnSite: string): string | null {
  try {
    return `${new URL(anyLinkOnSite).origin}${LOGO_PATH}`;
  } catch {
    return null;
  }
}

function wrapGuideEmail(title: string, bodyHtml: string, cta: { href: string; label: string } | null, logoUrl: string | null): string {
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><meta name="color-scheme" content="light only"/></head>
<body style="margin:0;padding:0;background:${C.soft};font-family:Helvetica,Arial,sans-serif;color:${C.ink};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.soft};padding:24px 12px;"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:${C.paper};border-radius:8px;overflow:hidden;border:1px solid ${C.line};">
<tr><td style="background:${C.yellow};padding:16px 24px;">${logoUrl
  ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="vertical-align:middle;"><img src="${esc(logoUrl)}" width="124" height="32" alt="ACHZOD" style="display:block;border:0;outline:none;height:32px;width:124px;"/></td><td align="right" style="vertical-align:middle;font-weight:900;letter-spacing:2px;color:${C.black};font-size:13px;">GUIDE PEPTIDES</td></tr></table>`
  : `<span style="font-weight:900;letter-spacing:2px;color:${C.black};font-size:14px;">ACHZOD · GUIDE PEPTIDES</span>`}</td></tr>
<tr><td style="padding:24px;">
<h1 style="margin:0 0 14px;font-size:21px;color:${C.black};">${esc(title)}</h1>
<div style="font-size:15px;line-height:1.6;color:${C.ink};">${bodyHtml}</div>
${cta ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:22px 0 6px;"><tr><td style="background:${C.black};border-radius:6px;"><a href="${esc(cta.href)}" style="display:inline-block;padding:14px 24px;color:${C.yellow};font-weight:800;text-decoration:none;font-size:15px;">${esc(cta.label)}</a></td></tr></table>` : ""}
</td></tr>
<tr><td style="padding:14px 24px;border-top:1px solid ${C.line};font-size:12px;line-height:1.5;color:${C.muted};">AchZod · ApexLabs. Contenu éducatif, réservé à la recherche. Ce guide ne constitue pas un avis médical.</td></tr>
</table></td></tr></table></body></html>`;
}

export interface GuideDeliveryEmailInput {
  downloadUrl: string;
  orderNumber: string;
  ttlDays: number;
  baseUrl: string;
}

/** Email envoyé après paiement (et au renvoi du lien). */
export function buildGuideDeliveryEmail(input: GuideDeliveryEmailInput, opts: { resend?: boolean } = {}) {
  const subject = opts.resend ? "Guide Peptides : ton nouveau lien de téléchargement" : "Ton guide Peptides est prêt à télécharger";
  const offerUrl = `${input.baseUrl.replace(/\/+$/, "")}${GUIDE_PEPTIDES_OFFER_PATH}`;
  const sourcesMailto = `mailto:${GUIDE_PEPTIDES_SOURCES_EMAIL}?subject=${encodeURIComponent(`Accès aux sources, commande ${input.orderNumber}`)}`;
  const html = wrapGuideEmail(
    opts.resend ? "Voici ton nouveau lien" : "Merci, ton guide est là",
    `<p>${opts.resend ? "Comme demandé, voici un nouveau lien pour télécharger" : "Merci pour ta confiance. Ton exemplaire de"} <strong>Peptides, le guide de référence</strong>${opts.resend ? "." : " t'attend : 194 pages, 83 molécules décryptées."}</p>
     <p style="margin:0 0 4px;">Ton numéro de commande : <strong>${esc(input.orderNumber)}</strong></p>
     <p style="color:${C.muted};font-size:13px;margin:0;">Garde-le, il te sert pour l'accès aux sources.</p>
     <!--cta-->
     <p style="font-size:14px;color:${C.muted};">Ce lien est privé et valable ${input.ttlDays} jours. Tu peux télécharger le guide autant de fois que tu veux pendant cette période. Enregistre aussi le PDF sur ton téléphone ou ton ordinateur. Lien expiré ? Redemande-le sur <a href="${esc(offerUrl)}" style="color:${C.black};font-weight:700;">la page du guide</a> avec ton email d'achat.</p>
     <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:18px 0 8px;background:${C.soft};border-left:4px solid ${C.yellow};border-radius:4px;"><tr><td style="padding:14px 16px;">
       <div style="font-weight:800;font-size:15px;margin-bottom:6px;">Bonus 1 : l'accès privé à mes sources</div>
       <div style="font-size:14px;line-height:1.55;">Écris-moi à <a href="${esc(sourcesMailto)}" style="color:${C.black};font-weight:700;">${esc(GUIDE_PEPTIDES_SOURCES_EMAIL)}</a> en indiquant ton numéro de commande <strong>${esc(input.orderNumber)}</strong>. Je te réponds avec l'accès.</div>
     </td></tr></table>
     <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 8px;background:${C.soft};border-left:4px solid ${C.yellow};border-radius:4px;"><tr><td style="padding:14px 16px;">
       <div style="font-weight:800;font-size:15px;margin-bottom:6px;">Bonus 2 : 99 € offerts pour la suite</div>
       <div style="font-size:14px;line-height:1.55;">Ton code <strong style="background:${C.yellow};padding:2px 6px;border-radius:3px;letter-spacing:1px;">${esc(GUIDE_PEPTIDES_BONUS_CODE)}</strong> te donne 99 € de réduction sur <a href="${esc(PEPTIDES_ENGINE_URL)}" style="color:${C.black};font-weight:700;">Peptides Engine</a> ou sur un <a href="${esc(ACHZOD_COACHING_URL)}" style="color:${C.black};font-weight:700;">coaching AchZod</a>. Autrement dit, le guide se paie tout seul.</div>
     </td></tr></table>
     <p style="font-size:14px;">Petit rappel : le guide ne contient volontairement aucun protocole. Un protocole se construit au cas par cas, selon ton profil, ton historique et tes objectifs. C'est exactement le rôle de Peptides Engine.</p>
     <p style="font-size:13px;color:${C.muted};">Licence personnelle : le fichier est réservé à ton usage, merci de ne pas le partager.</p>
     <p style="margin-top:18px;">Bonne lecture,<br/><strong>Ach</strong></p>`,
    null,
    logoUrlFrom(input.downloadUrl),
  ).replace(
    "<!--cta-->",
    `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:20px 0 10px;"><tr><td style="background:${C.black};border-radius:6px;"><a href="${esc(input.downloadUrl)}" style="display:inline-block;padding:14px 24px;color:${C.yellow};font-weight:800;text-decoration:none;font-size:15px;">Télécharger mon guide (PDF)</a></td></tr></table>`,
  );
  const text = [
    opts.resend ? "Voici ton nouveau lien pour télécharger Peptides, le guide de référence." : "Merci pour ta confiance. Ton exemplaire de Peptides, le guide de référence t'attend : 194 pages, 83 molécules décryptées.",
    `Numéro de commande : ${input.orderNumber}`,
    `Télécharger le guide (PDF) : ${input.downloadUrl}`,
    `Ce lien est privé et valable ${input.ttlDays} jours, téléchargeable autant de fois que tu veux. Lien expiré ? Redemande-le sur ${offerUrl} avec ton email d'achat.`,
    `Bonus 1, l'accès privé à mes sources : écris-moi à ${GUIDE_PEPTIDES_SOURCES_EMAIL} en indiquant ton numéro de commande ${input.orderNumber}.`,
    `Bonus 2, 99 € offerts : ton code ${GUIDE_PEPTIDES_BONUS_CODE} te donne 99 € de réduction sur Peptides Engine (${PEPTIDES_ENGINE_URL}) ou sur un coaching AchZod (${ACHZOD_COACHING_URL}).`,
    "Le guide ne contient volontairement aucun protocole : un protocole se construit au cas par cas, c'est le rôle de Peptides Engine.",
    "Contenu éducatif, réservé à la recherche. Ce guide ne constitue pas un avis médical. Licence personnelle, merci de ne pas partager le fichier.",
    "Bonne lecture,\nAch",
  ].join("\n\n");
  return { subject, html, text };
}

/** Notification au propriétaire à chaque vente. */
export function buildGuideAdminSaleEmail(input: {
  email: string;
  orderNumber: string;
  amountCents: number;
  currency: string;
  stripeSessionId: string;
  deliveryEmailSent: boolean;
}) {
  const amount = `${(input.amountCents / 100).toFixed(2).replace(".", ",")} ${input.currency.toUpperCase()}`;
  const subject = `[ApexLabs] Nouvel achat Guide Peptides : ${input.email}`;
  const rows: Array<[string, string]> = [
    ["Client", input.email],
    ["Commande", input.orderNumber],
    ["Montant", amount],
    ["Session Stripe", input.stripeSessionId],
    ["Email de livraison", input.deliveryEmailSent ? "envoyé" : "NON envoyé, à renvoyer"],
  ];
  const html = wrapGuideEmail(
    "Nouvel achat du Guide Peptides",
    `<table role="presentation" cellpadding="0" cellspacing="0" style="font-size:14px;">${rows
      .map(([k, v]) => `<tr><td style="padding:4px 14px 4px 0;color:${C.muted};">${esc(k)}</td><td style="padding:4px 0;font-weight:700;">${esc(v)}</td></tr>`)
      .join("")}</table>
     <p style="font-size:13px;color:${C.muted};margin-top:14px;">Pour l'accès aux sources, le client t'écrira à ${esc(GUIDE_PEPTIDES_SOURCES_EMAIL)} avec ce numéro de commande.</p>`,
    null,
    null,
  );
  const text = rows.map(([k, v]) => `${k} : ${v}`).join("\n");
  return { subject, html, text };
}
