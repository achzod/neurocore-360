/**
 * Désinscription en un clic (RFC 2369 + RFC 8058) pour les mails marketing
 * et les séquences (nurture, relances).
 *
 * - Chaque destinataire reçoit un jeton signé (HMAC-SHA256) qui contient son
 *   adresse. Personne ne peut désinscrire une autre adresse sans le jeton.
 * - Secret : LIST_UNSUBSCRIBE_SECRET si présent, sinon une clé dérivée de
 *   SESSION_SECRET (déjà obligatoire en production). Aucune variable nouvelle
 *   n'est donc requise pour que la fonction marche.
 * - Les transactionnels (reçu, rapport commandé, lien magique, FormCheck) et
 *   les mails internes ne reçoivent pas d'en-têtes List-Unsubscribe.
 * - Ce que chaque fournisseur permet :
 *     SendPulse API REST : pas de champ d'en-têtes personnalisés documenté
 *       (spec OpenAPI smtp.yaml). On n'ajoute rien au JSON pour ne pas risquer
 *       un refus ; le lien signé reste dans le pied de mail.
 *     SendPulse relais SMTP (nodemailer) : en-têtes ajoutés. Les mails
 *       marketing y passent seulement si EMAIL_MARKETING_VIA_SMTP_RELAY=1.
 *     Brevo API : champ `headers` documenté, en-têtes ajoutés.
 * - Route GET : page sobre avec un bouton de confirmation (les scanners de
 *   liens des messageries ouvrent les GET, ils ne doivent pas désinscrire).
 * - Route POST : désinscrit tout de suite (clic Gmail/Yahoo « Se désabonner »
 *   avec List-Unsubscribe=One-Click, ou bouton de la page).
 */
import crypto from "node:crypto";
import type { Request, Response } from "express";
import { classifyEmailForSuppression } from "./emailSuppression";

export const LIST_UNSUBSCRIBE_PATH = "/api/email/unsubscribe";
export const LIST_UNSUBSCRIBE_POST_VALUE = "List-Unsubscribe=One-Click";
const TOKEN_CONTEXT = "apexlabs-list-unsubscribe-v1";
const DEFAULT_BASE_URL = "https://apexlabs.achzodcoaching.com";
const DEFAULT_MAILTO = "coaching@achzodcoaching.com";

type Env = Record<string, string | undefined>;

const base64Url = (input: Buffer | string): string =>
  Buffer.from(input).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

const fromBase64Url = (input: string): string => {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  return Buffer.from(padded, "base64").toString("utf8");
};

export const normalizeUnsubscribeEmail = (email: string): string => String(email || "").trim().toLowerCase();

const looksLikeEmail = (email: string): boolean => /^[^\s@<>,;]+@[^\s@<>,;]+\.[^\s@<>,;]+$/.test(email);

/** Clé de signature, ou null si aucun secret n'est configuré. */
export function resolveListUnsubscribeSecret(env: Env = process.env): string | null {
  const dedicated = String(env.LIST_UNSUBSCRIBE_SECRET || "").trim();
  if (dedicated) return dedicated;
  const base = String(env.SESSION_SECRET || env.JWT_SECRET || "").trim();
  if (!base) return null;
  // Clé dérivée : un jeton de désinscription ne peut jamais servir ailleurs.
  return crypto.createHmac("sha256", base).update(TOKEN_CONTEXT).digest("hex");
}

const signature = (secret: string, email: string): string =>
  base64Url(crypto.createHmac("sha256", secret).update(`${TOKEN_CONTEXT}:${email}`).digest());

export function createListUnsubscribeToken(email: string, secret: string): string {
  const normalized = normalizeUnsubscribeEmail(email);
  return `${base64Url(normalized)}.${signature(secret, normalized)}`;
}

/** Renvoie l'adresse (en minuscules) si le jeton est valide, sinon null. */
export function verifyListUnsubscribeToken(token: unknown, secret: string | null): string | null {
  if (!secret || typeof token !== "string") return null;
  const trimmed = token.trim();
  if (trimmed.length > 600) return null;
  const dot = trimmed.lastIndexOf(".");
  if (dot <= 0 || dot === trimmed.length - 1) return null;
  const encodedEmail = trimmed.slice(0, dot);
  const providedSig = trimmed.slice(dot + 1);
  if (!/^[A-Za-z0-9_-]+$/.test(encodedEmail) || !/^[A-Za-z0-9_-]+$/.test(providedSig)) return null;
  let email: string;
  try {
    email = normalizeUnsubscribeEmail(fromBase64Url(encodedEmail));
  } catch {
    return null;
  }
  if (!looksLikeEmail(email)) return null;
  const expected = Buffer.from(signature(secret, email));
  const provided = Buffer.from(providedSig);
  if (expected.length !== provided.length) return null;
  return crypto.timingSafeEqual(expected, provided) ? email : null;
}

export function resolveListUnsubscribeBaseUrl(env: Env = process.env): string {
  const raw = env.LIST_UNSUBSCRIBE_BASE_URL || env.PUBLIC_BASE_URL || env.APP_URL || DEFAULT_BASE_URL;
  return String(raw).trim().replace(/\/+$/, "");
}

export function buildListUnsubscribeUrl(email: string, env: Env = process.env): string | null {
  const secret = resolveListUnsubscribeSecret(env);
  if (!secret) return null;
  const token = createListUnsubscribeToken(email, secret);
  return `${resolveListUnsubscribeBaseUrl(env)}${LIST_UNSUBSCRIBE_PATH}?t=${encodeURIComponent(token)}`;
}

export function buildListUnsubscribeMailto(env: Env = process.env): string {
  const address = String(env.LIST_UNSUBSCRIBE_MAILTO || DEFAULT_MAILTO).trim();
  return `mailto:${address}?subject=${encodeURIComponent("Desinscription")}`;
}

/** Seuls les mails marketing et les séquences portent les en-têtes. */
export function shouldAttachListUnsubscribe(input: {
  emailType: string;
  subject: string;
  recipientEmail: string;
  adminEmails?: string[];
}): boolean {
  const emailClass = classifyEmailForSuppression(input);
  return emailClass === "marketing" || emailClass === "nurture";
}

export type ListUnsubscribeHeaders = {
  "List-Unsubscribe": string;
  "List-Unsubscribe-Post": typeof LIST_UNSUBSCRIBE_POST_VALUE;
};

/**
 * En-têtes RFC 8058 pour un destinataire. null si aucun secret n'est
 * configuré ou si l'URL n'est pas en HTTPS (RFC 8058 l'exige).
 */
export function buildListUnsubscribeHeaders(email: string, env: Env = process.env): ListUnsubscribeHeaders | null {
  const url = buildListUnsubscribeUrl(email, env);
  if (!url || !url.startsWith("https://")) return null;
  return {
    "List-Unsubscribe": `<${buildListUnsubscribeMailto(env)}>, <${url}>`,
    "List-Unsubscribe-Post": LIST_UNSUBSCRIBE_POST_VALUE,
  };
}

/** SendPulse API REST : pas de champ d'en-têtes documenté, payload inchangé. */
export const SENDPULSE_REST_SUPPORTS_CUSTOM_HEADERS = false;

export function withSendPulseRestListUnsubscribe<T extends Record<string, any>>(
  payload: T,
  _headers: ListUnsubscribeHeaders | null,
): T {
  return payload;
}

/** Brevo API v3 /smtp/email : champ `headers`. */
export function withBrevoListUnsubscribe<T extends Record<string, any>>(
  payload: T,
  headers: ListUnsubscribeHeaders | null,
): T & { headers?: Record<string, string> } {
  if (!headers) return payload;
  return { ...payload, headers: { ...(payload.headers || {}), ...headers } };
}

/** nodemailer (relais SMTP SendPulse ou autre) : option `headers`. */
export function withSmtpListUnsubscribe<T extends Record<string, any>>(
  mail: T,
  headers: ListUnsubscribeHeaders | null,
): T & { headers?: Record<string, string> } {
  if (!headers) return mail;
  return { ...mail, headers: { ...(mail.headers || {}), ...headers } };
}

export function isMarketingSmtpRelayEnabled(env: Env = process.env): boolean {
  return env.EMAIL_MARKETING_VIA_SMTP_RELAY === "1" || env.EMAIL_MARKETING_VIA_SMTP_RELAY === "true";
}

// ---------------------------------------------------------------------------
// Pages et route
// ---------------------------------------------------------------------------

const escapeHtml = (value: string): string =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return email;
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}${"*".repeat(Math.max(1, local.length - visible.length))}@${domain}`;
}

function renderPage(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${escapeHtml(title)} | ApexLabs</title>
<style>
  body { margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; box-sizing: border-box; background: #0a0b0d; color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
  .card { max-width: 460px; width: 100%; background: #111113; border: 1px solid rgba(252, 221, 0, 0.15); border-radius: 14px; padding: 40px 28px; text-align: center; }
  .brand { font-size: 12px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: #FCDD00; margin-bottom: 28px; }
  h1 { font-size: 22px; margin: 0 0 14px; }
  p { color: #a1a1aa; font-size: 15px; line-height: 1.6; margin: 0 0 18px; }
  button { background: #FCDD00; color: #000000; border: 0; border-radius: 10px; padding: 13px 22px; font-size: 15px; font-weight: 600; cursor: pointer; }
  .small { color: #71717a; font-size: 13px; margin: 22px 0 0; }
  a { color: #FCDD00; }
</style>
</head>
<body>
<main class="card">
<div class="brand">ApexLabs by Achzod</div>
${body}
</main>
</body>
</html>`;
}

const CONTACT_LINE = `<p class="small">Une question : <a href="mailto:coaching@achzodcoaching.com">coaching@achzodcoaching.com</a></p>`;

export function renderUnsubscribeConfirmPage(email: string, token: string): string {
  return renderPage(
    "Se désinscrire",
    `<h1>Se désinscrire des emails ApexLabs</h1>
<p>Adresse concernée : <strong>${escapeHtml(maskEmail(email))}</strong></p>
<p>Tu ne recevras plus les conseils, offres et relances. Les emails liés à une commande (reçu, rapport commandé, lien de connexion) restent envoyés.</p>
<form method="post" action="${LIST_UNSUBSCRIBE_PATH}?t=${encodeURIComponent(token)}">
<button type="submit">Confirmer la désinscription</button>
</form>
${CONTACT_LINE}`,
  );
}

export function renderUnsubscribeDonePage(email: string): string {
  return renderPage(
    "Désinscription confirmée",
    `<h1>Désinscription confirmée</h1>
<p>L'adresse <strong>${escapeHtml(maskEmail(email))}</strong> ne recevra plus les conseils, offres et relances ApexLabs.</p>
<p>Les emails liés à une commande restent envoyés.</p>
${CONTACT_LINE}`,
  );
}

export function renderUnsubscribeInvalidPage(): string {
  return renderPage(
    "Lien non valide",
    `<h1>Ce lien n'est pas valide</h1>
<p>Il est incomplet ou a été modifié. Utilise le lien présent en bas de l'email reçu, ou écris-nous pour être retiré de la liste.</p>
${CONTACT_LINE}`,
  );
}

export function renderUnsubscribeErrorPage(): string {
  return renderPage(
    "Erreur",
    `<h1>La désinscription n'a pas pu être enregistrée</h1>
<p>Réessaie dans quelques minutes, ou écris-nous et nous te retirons de la liste.</p>
${CONTACT_LINE}`,
  );
}

export type UnsubscribeStore = (email: string, reason: string) => Promise<void>;

const readToken = (req: Request): unknown => {
  const fromQuery = req.query?.t;
  if (typeof fromQuery === "string" && fromQuery) return fromQuery;
  const body = req.body && typeof req.body === "object" ? (req.body as Record<string, unknown>) : {};
  return typeof body.t === "string" ? body.t : undefined;
};

const setPageHeaders = (res: Response) => {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Robots-Tag", "noindex, nofollow");
  res.setHeader("Referrer-Policy", "no-referrer");
};

export function createListUnsubscribeHandlers(deps: {
  unsubscribe: UnsubscribeStore;
  getSecret?: () => string | null;
  log?: (message: string) => void;
}) {
  const getSecret = deps.getSecret || (() => resolveListUnsubscribeSecret());
  const log = deps.log || ((message: string) => console.log(message));

  const get = async (req: Request, res: Response) => {
    setPageHeaders(res);
    const token = readToken(req);
    const email = verifyListUnsubscribeToken(token, getSecret());
    if (!email || typeof token !== "string") {
      res.status(400).send(renderUnsubscribeInvalidPage());
      return;
    }
    res.status(200).send(renderUnsubscribeConfirmPage(email, token.trim()));
  };

  const post = async (req: Request, res: Response) => {
    setPageHeaders(res);
    const email = verifyListUnsubscribeToken(readToken(req), getSecret());
    if (!email) {
      res.status(400).send(renderUnsubscribeInvalidPage());
      return;
    }
    const body = req.body && typeof req.body === "object" ? (req.body as Record<string, unknown>) : {};
    const oneClick = String(body["List-Unsubscribe"] || "") === "One-Click";
    const reason = oneClick ? "list_unsubscribe_one_click" : "list_unsubscribe_page";
    try {
      await deps.unsubscribe(email, reason);
      log(`[ListUnsubscribe] ${reason} ${maskEmail(email)}`);
      res.status(200).send(renderUnsubscribeDonePage(email));
    } catch (error) {
      console.error("[ListUnsubscribe] store failed:", error);
      res.status(500).send(renderUnsubscribeErrorPage());
    }
  };

  return { get, post };
}
