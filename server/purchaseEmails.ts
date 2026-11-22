/**
 * Emails d'achat (acheteur + notification au propriétaire) pour les commandes
 * de la table orders : Anabolic Bioscan, Ultimate Scan, Blood Analysis et
 * Peptides Engine. Même gabarit clair que le Guide Peptides et FormCheck
 * (jaune AchZod, logo, texte sobre), pour que chaque achat reçoive une
 * confirmation propre et cohérente.
 *
 * Fichier pur : aucun accès DB, réseau ou disque, testable avec node:test.
 */

export const PURCHASE_EMAIL_BRAND = {
  yellow: "#FCDD00",
  black: "#15130E",
  ink: "#15130E",
  muted: "#5F5A4E",
  paper: "#FFFDF7",
  soft: "#F7F4EC",
  line: "#E7E1D2",
} as const;

const C = PURCHASE_EMAIL_BRAND;

export const PURCHASE_SITE_URL = "https://apexlabs.achzodcoaching.com";
export const COACHING_FORMULAS_URL = "https://www.achzodcoaching.com/formules-coaching";
export const PURCHASE_REPLY_EMAIL = "coaching@achzodcoaching.com";
const LOGO_PATH = "/images/formcheck/achzod-logo-email.png";

export type PurchaseProductType = "PREMIUM" | "ELITE" | "BLOOD_ANALYSIS" | "PEPTIDES_ENGINE";

const esc = (value: unknown) =>
  String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] || c);

/** Montant en euros au format français : 59 €, 41,30 €. */
export function formatEuros(cents: number): string {
  const value = Math.max(0, Number(cents) || 0) / 100;
  const fixed = Number.isInteger(value) ? String(value) : value.toFixed(2).replace(".", ",");
  return `${fixed}\u00a0€`;
}

/** Numéro de commande lisible, identique dans l'email client et la notification admin. */
export function purchaseOrderNumber(orderId: string): string {
  return String(orderId || "").replace(/[^a-zA-Z0-9]/g, "").slice(0, 8).toUpperCase() || "N/A";
}

/** Une session Stripe de test (cs_test_...) n'est jamais une vraie vente. */
export function isTestStripeSession(sessionId: unknown): boolean {
  return String(sessionId || "").startsWith("cs_test_");
}

/** Prénom propre pour la salutation, ou chaîne vide (jamais un bout d'adresse email). */
export function greetingName(raw: unknown): string {
  const value = String(raw ?? "").trim().split(/\s+/)[0] || "";
  if (!value || value.length > 30 || !/^[A-Za-zÀ-ÖØ-öø-ÿ'-]+$/.test(value)) return "";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export const PURCHASE_PRODUCT_LABELS: Record<PurchaseProductType, string> = {
  PREMIUM: "Anabolic Bioscan",
  ELITE: "Ultimate Scan",
  BLOOD_ANALYSIS: "Blood Analysis",
  PEPTIDES_ENGINE: "Peptides Engine",
};

const SCAN_COACHING_CODES: Record<"PREMIUM" | "ELITE" | "BLOOD_ANALYSIS", { code: string; amount: string }> = {
  PREMIUM: { code: "BIOSCAN59", amount: "59\u00a0€" },
  ELITE: { code: "ULTIMATE79", amount: "79\u00a0€" },
  BLOOD_ANALYSIS: { code: "BLOOD99", amount: "99\u00a0€" },
};

export function wrapPurchaseEmail(input: {
  tag: string;
  title: string;
  bodyHtml: string;
  cta?: { href: string; label: string } | null;
  logoUrl?: string | null;
  footer?: string;
}): string {
  const logo = input.logoUrl === undefined ? `${PURCHASE_SITE_URL}${LOGO_PATH}` : input.logoUrl;
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><meta name="color-scheme" content="light only"/></head>
<body style="margin:0;padding:0;background:${C.soft};font-family:Helvetica,Arial,sans-serif;color:${C.ink};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.soft};padding:24px 12px;"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:${C.paper};border-radius:8px;overflow:hidden;border:1px solid ${C.line};">
<tr><td style="background:${C.yellow};padding:16px 24px;">${logo
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="vertical-align:middle;"><img src="${esc(logo)}" width="124" height="32" alt="ACHZOD" style="display:block;border:0;outline:none;height:32px;width:124px;"/></td><td align="right" style="vertical-align:middle;font-weight:900;letter-spacing:2px;color:${C.black};font-size:13px;">${esc(input.tag)}</td></tr></table>`
    : `<span style="font-weight:900;letter-spacing:2px;color:${C.black};font-size:14px;">ACHZOD · ${esc(input.tag)}</span>`}</td></tr>
<tr><td style="padding:24px;">
<h1 style="margin:0 0 14px;font-size:21px;color:${C.black};">${esc(input.title)}</h1>
<div style="font-size:15px;line-height:1.6;color:${C.ink};">${input.bodyHtml}</div>
${input.cta ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:22px 0 6px;"><tr><td style="background:${C.black};border-radius:6px;"><a href="${esc(input.cta.href)}" style="display:inline-block;padding:14px 24px;color:${C.yellow};font-weight:800;text-decoration:none;font-size:15px;">${esc(input.cta.label)}</a></td></tr></table>` : ""}
</td></tr>
<tr><td style="padding:14px 24px;border-top:1px solid ${C.line};font-size:12px;line-height:1.5;color:${C.muted};">${input.footer ?? `AchZod Coaching · ApexLabs · ${PURCHASE_REPLY_EMAIL}`}</td></tr>
</table></td></tr></table></body></html>`;
}

function recapTable(rows: Array<[string, string]>): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 18px;border:1px solid ${C.line};border-radius:6px;background:#FFFFFF;">${rows
    .map(([k, v], i) => `<tr><td style="padding:10px 14px;${i ? `border-top:1px solid ${C.line};` : ""}color:${C.muted};font-size:14px;">${esc(k)}</td><td align="right" style="padding:10px 14px;${i ? `border-top:1px solid ${C.line};` : ""}font-weight:700;font-size:14px;">${esc(v)}</td></tr>`)
    .join("")}</table>`;
}

function highlightBox(title: string, bodyHtml: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:18px 0 8px;background:${C.soft};border-left:4px solid ${C.yellow};border-radius:4px;"><tr><td style="padding:14px 16px;">
  <div style="font-weight:800;font-size:15px;margin-bottom:6px;">${esc(title)}</div>
  <div style="font-size:14px;line-height:1.55;">${bodyHtml}</div>
</td></tr></table>`;
}

const codeChip = (code: string) =>
  `<strong style="background:${C.yellow};padding:2px 6px;border-radius:3px;letter-spacing:1px;">${esc(code)}</strong>`;

export interface PurchaseRecapInput {
  orderId: string;
  email: string;
  firstName?: string | null;
  amountCents: number;
  promoCode?: string | null;
}

function recapRows(productLabel: string, input: PurchaseRecapInput): Array<[string, string]> {
  const rows: Array<[string, string]> = [
    ["Produit", productLabel],
    ["Montant payé", formatEuros(input.amountCents)],
  ];
  if (input.promoCode) rows.push(["Code utilisé", String(input.promoCode).toUpperCase()]);
  rows.push(["N° de commande", purchaseOrderNumber(input.orderId)]);
  return rows;
}

function recapText(productLabel: string, input: PurchaseRecapInput): string {
  return recapRows(productLabel, input).map(([k, v]) => `${k} : ${v}`).join("\n");
}

export const BLOOD_ANALYSIS_PANELS: Array<[string, string]> = [
  ["Hormones", "Testostérone totale, testostérone libre, SHBG, cortisol (le matin à jeun), DHEA-S, IGF-1, LH, FSH, estradiol"],
  ["Thyroïde", "TSH, T3 libre, T4 libre, anticorps anti-TPO"],
  ["Métabolisme et lipides", "Glycémie à jeun, HbA1c, insuline à jeun, cholestérol total, HDL, LDL, triglycérides, ApoB, Lp(a)"],
  ["Inflammation et fer", "CRP ultrasensible, ferritine, homocystéine, vitesse de sédimentation"],
  ["Vitamines et minéraux", "Vitamine D (25-OH), vitamine B12, magnésium, zinc, folates"],
  ["Foie et reins", "ALAT, ASAT, gamma-GT, créatinine, DFG, acide urique"],
  ["Hématologie", "NFS complète"],
];

/** Confirmation d'achat pour Anabolic Bioscan, Ultimate Scan et Blood Analysis. */
export function buildScanPurchaseConfirmationEmail(
  productType: "PREMIUM" | "ELITE" | "BLOOD_ANALYSIS",
  input: PurchaseRecapInput & { baseUrl?: string },
): { subject: string; html: string; text: string } {
  const productLabel = PURCHASE_PRODUCT_LABELS[productType];
  const base = String(input.baseUrl || PURCHASE_SITE_URL).replace(/\/+$/, "");
  const name = greetingName(input.firstName);
  const hello = name ? `Salut ${name},` : "Salut,";
  const coaching = SCAN_COACHING_CODES[productType];
  const subject = `${productLabel} : commande reçue, merci !`;
  const recap = recapRows(productLabel, input);

  const coachingBox = highlightBox(
    `Ton code coaching : ${coaching.amount} déduits`,
    `Avec le code ${codeChip(coaching.code)}, le prix de ton ${productLabel} (${coaching.amount}) est déduit de ta formule coaching. Les formules et leurs conditions sont sur <a href="${esc(COACHING_FORMULAS_URL)}" style="color:${C.black};font-weight:700;">achzodcoaching.com</a>.`,
  );

  let bodyHtml: string;
  let cta: { href: string; label: string };
  let textSteps: string;

  if (productType === "BLOOD_ANALYSIS") {
    const loginUrl = `${base}/auth/login?next=%2Fblood-dashboard&email=${encodeURIComponent(input.email)}`;
    cta = { href: loginUrl, label: "Accéder à mon espace Blood Analysis" };
    bodyHtml = `<p>${esc(hello)}</p>
<p>Merci pour ta commande. Ton paiement est bien reçu et tes <strong>2 analyses Blood Analysis</strong> sont disponibles sur ton compte, sans date d'expiration.</p>
${recapTable(recap)}
<p style="font-weight:800;margin:18px 0 6px;">Étape 1 : ta prise de sang</p>
<p style="margin:0 0 8px;">Voici les marqueurs à demander au laboratoire ou à ton médecin :</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;line-height:1.5;margin:0 0 10px;">${BLOOD_ANALYSIS_PANELS.map(([k, v]) => `<tr><td style="padding:6px 0;vertical-align:top;"><strong>${esc(k)}</strong><br/><span style="color:${C.muted};">${esc(v)}</span></td></tr>`).join("")}</table>
<p style="font-size:14px;">Beaucoup de laboratoires acceptent ces analyses sans ordonnance. Sinon, ton généraliste peut te la faire.</p>
<p style="font-weight:800;margin:18px 0 6px;">Étape 2 : envoie ton PDF</p>
<p style="margin:0 0 6px;">Une fois tes résultats reçus, clique sur le bouton ci-dessous. Tu reçois un lien de connexion par email (pense à vérifier tes spams), puis tu déposes ton PDF de laboratoire et tu lances ton analyse.</p>
<p style="font-size:14px;color:${C.muted};">Un seul PDF par envoi, 10 Mo maximum. Plusieurs fichiers ? Regroupe-les en un seul PDF (sur iPhone, depuis l'app Fichiers : sélectionne-les, puis « Créer un PDF »).</p>
<!--cta-->
${coachingBox}
<p>Une question ? Réponds simplement à cet email.</p>
<p style="margin-top:18px;">À très vite,<br/><strong>Ach</strong></p>`;
    textSteps = [
      `Tes 2 analyses Blood Analysis sont disponibles sur ton compte, sans date d'expiration.`,
      `Étape 1, ta prise de sang. Marqueurs à demander :\n${BLOOD_ANALYSIS_PANELS.map(([k, v]) => `- ${k} : ${v}`).join("\n")}`,
      `Beaucoup de laboratoires acceptent ces analyses sans ordonnance. Sinon, ton généraliste peut te la faire.`,
      `Étape 2, envoie ton PDF : ${loginUrl}\nTu reçois un lien de connexion par email (vérifie tes spams), puis tu déposes ton PDF et tu lances ton analyse. Un seul PDF par envoi, 10 Mo maximum.`,
    ].join("\n\n");
  } else {
    const loginUrl = `${base}/auth/login?next=%2Fdashboard&email=${encodeURIComponent(input.email)}`;
    cta = { href: loginUrl, label: "Accéder à mon espace" };
    const extra = productType === "ELITE"
      ? `<p style="font-size:14px;">Ton analyse photo fait partie du rapport : si tu n'as pas encore envoyé tes 3 photos, tu peux les ajouter depuis ton espace.</p>`
      : "";
    bodyHtml = `<p>${esc(hello)}</p>
<p>Merci pour ta commande. Ton paiement est bien reçu et toutes tes réponses au questionnaire sont enregistrées.</p>
${recapTable(recap)}
<p style="font-weight:800;margin:18px 0 6px;">La suite</p>
<p style="margin:0 0 8px;">Je prépare ton rapport ${esc(productLabel)}. Tu le reçois par email après son contrôle qualité, au plus tard sous 24 heures. Il sera aussi disponible dans ton espace.</p>
${extra}
<!--cta-->
${coachingBox}
<p>Une question ? Réponds simplement à cet email.</p>
<p style="margin-top:18px;">À très vite,<br/><strong>Ach</strong></p>`;
    textSteps = [
      `Toutes tes réponses au questionnaire sont enregistrées.`,
      `La suite : je prépare ton rapport ${productLabel}. Tu le reçois par email après son contrôle qualité, au plus tard sous 24 heures. Ton espace : ${loginUrl}`,
    ].join("\n\n");
  }

  const ctaHtml = `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:12px 0 10px;"><tr><td style="background:${C.black};border-radius:6px;"><a href="${esc(cta.href)}" style="display:inline-block;padding:14px 24px;color:${C.yellow};font-weight:800;text-decoration:none;font-size:15px;">${esc(cta.label)}</a></td></tr></table>`;
  const html = wrapPurchaseEmail({ tag: productLabel.toUpperCase(), title: "Merci, ta commande est confirmée", bodyHtml }).replace("<!--cta-->", ctaHtml);
  const text = [
    hello,
    `Merci pour ta commande ${productLabel}. Ton paiement est bien reçu.`,
    recapText(productLabel, input),
    textSteps,
    `Ton code coaching : ${coaching.code}. Le prix de ton ${productLabel} (${coaching.amount}) est déduit de ta formule coaching. Formules et conditions : ${COACHING_FORMULAS_URL}`,
    "Une question ? Réponds simplement à cet email.",
    "À très vite,\nAch\nAchZod Coaching · ApexLabs",
  ].join("\n\n");
  return { subject, html, text };
}

/** Confirmation d'achat Peptides Engine (le rapport arrive ensuite par email). */
export function buildPeptidesOrderConfirmationEmail(input: PurchaseRecapInput & {
  tierLabel?: string | null;
  deliveryLabel: string;
  bloodCreditsCount?: number;
  coachingCreditAmount?: string | null;
}): { subject: string; html: string; text: string } {
  const name = greetingName(input.firstName);
  const hello = name ? `Salut ${name},` : "Salut,";
  const productLabel = input.tierLabel ? `Peptides Engine ${input.tierLabel}` : "Peptides Engine";
  const subject = "Peptides Engine : commande reçue, ton protocole est en préparation";
  const recap = recapRows(productLabel, input);
  const credits = Math.max(0, Number(input.bloodCreditsCount || 0));
  const contents = [
    "la sélection de peptides adaptée à ton profil et à tes objectifs ;",
    "le calendrier complet du cycle, avec les phases et les pauses ;",
    "le guide de reconstitution étape par étape ;",
    "les sources vérifiées ;",
    "les marqueurs sanguins à suivre avant, pendant et après ;",
    "le plan de récupération après le cycle.",
  ];
  const creditsBox = credits > 0
    ? highlightBox(
      `Inclus : ${credits} Blood Analysis offerte${credits > 1 ? "s" : ""}`,
      credits > 1 ? "Tes codes Blood Analysis te sont livrés avec ton rapport." : "Ton code Blood Analysis t'est livré avec ton rapport.",
    )
    : "";
  const coachingBox = input.coachingCreditAmount
    ? highlightBox(
      `Ton crédit coaching : ${input.coachingCreditAmount}`,
      `Si tu passes au coaching dans les 8 semaines qui suivent la livraison de ton rapport, ${esc(input.coachingCreditAmount)} sont déduits de ton coaching Essential 12 semaines, Elite ou Private Lab (8 ou 12 semaines). Ton code t'arrive avec ton rapport. Les formules sont sur <a href="${esc(COACHING_FORMULAS_URL)}" style="color:${C.black};font-weight:700;">achzodcoaching.com</a>.`,
    )
    : "";
  const bodyHtml = `<p>${esc(hello)}</p>
<p>Merci pour ta confiance. Ton paiement est bien reçu et ton questionnaire est enregistré.</p>
${recapTable(recap)}
<p style="font-weight:800;margin:18px 0 6px;">La suite</p>
<p style="margin:0 0 8px;">Je prépare ton protocole à partir de tes réponses et je te l'envoie par email.</p>
${highlightBox(`Livraison prévue : ${input.deliveryLabel} (heure de Paris)`, "Rien reçu à cette heure-là ? Regarde dans tes spams, puis réponds à cet email.")}
<p style="font-weight:800;margin:18px 0 6px;">Ce que contient ton rapport</p>
<ul style="margin:0 0 8px;padding-left:18px;font-size:14px;line-height:1.7;">${contents.map((c) => `<li>${esc(c)}</li>`).join("")}</ul>
${creditsBox}
${coachingBox}
<p>Une question ? Réponds simplement à cet email, je te réponds en général sous 24 heures.</p>
<p style="margin-top:18px;">À très vite,<br/><strong>Ach</strong></p>`;
  const html = wrapPurchaseEmail({
    tag: "PEPTIDES ENGINE",
    title: "Merci, ta commande est confirmée",
    bodyHtml,
    footer: `AchZod Coaching · ApexLabs · ${PURCHASE_REPLY_EMAIL}<br/>Contenu éducatif, sans avis médical. Tu reçois cet email suite à ta commande Peptides Engine.`,
  });
  const text = [
    hello,
    "Merci pour ta confiance. Ton paiement est bien reçu et ton questionnaire est enregistré.",
    recapText(productLabel, input),
    `La suite : je prépare ton protocole à partir de tes réponses et je te l'envoie par email. Livraison prévue : ${input.deliveryLabel} (heure de Paris). Rien reçu à cette heure-là ? Regarde dans tes spams, puis réponds à cet email.`,
    `Ce que contient ton rapport :\n${contents.map((c) => `- ${c}`).join("\n")}`,
    credits > 0 ? `Inclus : ${credits} Blood Analysis offerte${credits > 1 ? "s" : ""}. ${credits > 1 ? "Tes codes te sont livrés" : "Ton code t'est livré"} avec ton rapport.` : "",
    input.coachingCreditAmount ? `Ton crédit coaching : ${input.coachingCreditAmount} déduits de ton coaching Essential 12 semaines, Elite ou Private Lab (8 ou 12 semaines) si tu passes au coaching dans les 8 semaines suivant la livraison de ton rapport. Ton code t'arrive avec ton rapport.` : "",
    "Une question ? Réponds simplement à cet email.",
    "À très vite,\nAch\nAchZod Coaching · ApexLabs",
  ].filter(Boolean).join("\n\n");
  return { subject, html, text };
}

/** Notification au propriétaire pour chaque paiement (marquée TEST pour une session cs_test_). */
export function buildPurchaseAdminNotificationEmail(input: {
  productLabel: string;
  email: string;
  clientName?: string | null;
  amountCents: number;
  promoCode?: string | null;
  orderId: string;
  orderNumber?: string | null;
  stripeSessionId?: string | null;
  channel?: string | null;
  isTest?: boolean;
}): { subject: string; html: string; text: string } {
  const isTest = input.isTest === true || isTestStripeSession(input.stripeSessionId);
  const amount = formatEuros(input.amountCents);
  const subject = `${isTest ? "[TEST, pas une vente] " : ""}Paiement reçu ${amount} : ${input.productLabel} (${input.email})`;
  const rows: Array<[string, string]> = [
    ["Produit", input.productLabel],
    ["Client", input.clientName ? `${input.clientName} (${input.email})` : input.email],
    ["Montant", amount],
    ["Code promo", input.promoCode ? String(input.promoCode).toUpperCase() : "aucun"],
    ["N° de commande", input.orderNumber || purchaseOrderNumber(input.orderId)],
  ];
  if (input.orderId && input.orderId !== input.orderNumber) rows.push(["Order ID", input.orderId]);
  if (input.stripeSessionId) rows.push(["Session Stripe", String(input.stripeSessionId)]);
  if (input.channel) rows.push(["Paiement", input.channel]);
  const html = wrapPurchaseEmail({
    tag: "VENTE",
    title: isTest ? `Achat de test : ${input.productLabel} (aucun paiement)` : `Nouvelle vente : ${input.productLabel}`,
    bodyHtml: `<table role="presentation" cellpadding="0" cellspacing="0" style="font-size:14px;">${rows
      .map(([k, v]) => `<tr><td style="padding:4px 14px 4px 0;color:${C.muted};">${esc(k)}</td><td style="padding:4px 0;font-weight:700;">${esc(v)}</td></tr>`)
      .join("")}</table>`,
    logoUrl: null,
  });
  const text = `${isTest ? "TEST : session Stripe de test, aucun paiement, ne compte pas comme une vente.\n\n" : ""}${rows.map(([k, v]) => `${k} : ${v}`).join("\n")}`;
  return { subject, html, text };
}
