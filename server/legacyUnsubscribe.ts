/**
 * Ancienne route de désinscription /api/unsubscribe?email=<base64>.
 *
 * Le lien ne contient que l'adresse encodée en base64 (aucune signature) : il
 * reste dans des mails déjà envoyés, donc on le garde, mais :
 * - GET ne désinscrit plus personne : il affiche une page de confirmation
 *   (les scanners de liens des messageries ouvrent les GET) ;
 * - la désinscription se fait en POST, depuis le bouton de cette page ;
 * - les POST sont limités par IP et au total (protection contre les abus).
 *
 * La route signée (/api/email/unsubscribe, voir listUnsubscribe.ts) ne change pas.
 */
import type { Request, Response } from "express";
import {
  CONTACT_LINE,
  maskEmail,
  normalizeUnsubscribeEmail,
  renderPage,
  renderUnsubscribeDonePage,
  renderUnsubscribeErrorPage,
  renderUnsubscribeInvalidPage,
} from "./listUnsubscribe";

export const LEGACY_UNSUBSCRIBE_PATH = "/api/unsubscribe";

const looksLikeEmail = (email: string): boolean => /^[^\s@<>,;]+@[^\s@<>,;]+\.[^\s@<>,;]+$/.test(email);

const escapeHtml = (value: string): string =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

/** Décode le paramètre `email` des anciens liens (base64 classique ou base64url). */
export function decodeLegacyUnsubscribeToken(token: unknown): string | null {
  if (typeof token !== "string") return null;
  const trimmed = token.trim();
  if (!trimmed || trimmed.length > 400 || !/^[A-Za-z0-9+/_=-]+$/.test(trimmed)) return null;
  const normalized = trimmed.replace(/-/g, "+").replace(/_/g, "/").replace(/=+$/, "");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  let email: string;
  try {
    email = normalizeUnsubscribeEmail(Buffer.from(padded, "base64").toString("utf8"));
  } catch {
    return null;
  }
  return looksLikeEmail(email) ? email : null;
}

export function renderLegacyUnsubscribeConfirmPage(email: string, token: string): string {
  // Même page que la route signée, formulaire POST vers l'ancienne route.
  return renderPage(
    "Se désinscrire",
    `<h1>Se désinscrire des emails ApexLabs</h1>
<p>Adresse concernée : <strong>${escapeHtml(maskEmail(email))}</strong></p>
<p>Tu ne recevras plus les conseils, offres et relances. Les emails liés à une commande (reçu, rapport commandé, lien de connexion) restent envoyés.</p>
<form method="post" action="${LEGACY_UNSUBSCRIBE_PATH}?email=${encodeURIComponent(token)}">
<button type="submit">Confirmer la désinscription</button>
</form>
${CONTACT_LINE}`,
  );
}

export function renderLegacyUnsubscribeRateLimitedPage(): string {
  return renderPage(
    "Trop de demandes",
    `<h1>Trop de demandes</h1>
<p>Trop de désinscriptions depuis cette connexion. Réessaie plus tard, ou écris-nous et nous te retirons de la liste.</p>
${CONTACT_LINE}`,
  );
}

/** Limiteur en mémoire à fenêtre fixe : par clé et au total. */
export function createFixedWindowLimiter(options: {
  windowMs: number;
  maxPerKey: number;
  maxTotal: number;
  now?: () => number;
}) {
  const now = options.now || Date.now;
  const hits = new Map<string, { count: number; resetAt: number }>();
  let total = { count: 0, resetAt: 0 };

  return function allow(key: string): boolean {
    const t = now();
    if (t >= total.resetAt) total = { count: 0, resetAt: t + options.windowMs };
    if (hits.size > 5000) {
      for (const [k, v] of hits) if (t >= v.resetAt) hits.delete(k);
    }
    let entry = hits.get(key);
    if (!entry || t >= entry.resetAt) {
      entry = { count: 0, resetAt: t + options.windowMs };
      hits.set(key, entry);
    }
    if (entry.count >= options.maxPerKey || total.count >= options.maxTotal) return false;
    entry.count += 1;
    total.count += 1;
    return true;
  };
}

function clientKey(req: Request): string {
  const forwarded = req.headers?.["x-forwarded-for"];
  const first = (Array.isArray(forwarded) ? forwarded[0] : forwarded || "").split(",")[0].trim();
  return first || req.ip || req.socket?.remoteAddress || "unknown";
}

const setPageHeaders = (res: Response) => {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Robots-Tag", "noindex, nofollow");
  res.setHeader("Referrer-Policy", "no-referrer");
};

const readToken = (req: Request): unknown => {
  const fromQuery = req.query?.email;
  if (typeof fromQuery === "string" && fromQuery) return fromQuery;
  const body = req.body && typeof req.body === "object" ? (req.body as Record<string, unknown>) : {};
  return typeof body.email === "string" ? body.email : undefined;
};

export function createLegacyUnsubscribeHandlers(deps: {
  unsubscribe: (email: string, reason: string) => Promise<void>;
  /** 5 désinscriptions par IP et 200 au total par heure par défaut. */
  limiter?: (key: string) => boolean;
  log?: (message: string) => void;
}) {
  const limiter = deps.limiter || createFixedWindowLimiter({ windowMs: 60 * 60 * 1000, maxPerKey: 5, maxTotal: 200 });
  const log = deps.log || ((message: string) => console.log(message));

  // GET : page de confirmation seulement, aucune écriture.
  const get = async (req: Request, res: Response) => {
    setPageHeaders(res);
    const token = readToken(req);
    const email = decodeLegacyUnsubscribeToken(token);
    if (!email || typeof token !== "string") {
      res.status(400).send(renderUnsubscribeInvalidPage());
      return;
    }
    res.status(200).send(renderLegacyUnsubscribeConfirmPage(email, token.trim()));
  };

  // POST : désinscrit, depuis le bouton de la page (ou un client qui poste le lien).
  const post = async (req: Request, res: Response) => {
    setPageHeaders(res);
    const email = decodeLegacyUnsubscribeToken(readToken(req));
    if (!email) {
      res.status(400).send(renderUnsubscribeInvalidPage());
      return;
    }
    if (!limiter(clientKey(req))) {
      res.setHeader("Retry-After", "3600");
      res.status(429).send(renderLegacyUnsubscribeRateLimitedPage());
      return;
    }
    try {
      await deps.unsubscribe(email, "legacy_unsubscribe_page");
      log(`[Unsubscribe] legacy_unsubscribe_page ${maskEmail(email)}`);
      res.status(200).send(renderUnsubscribeDonePage(email));
    } catch (error) {
      console.error("[Unsubscribe] store failed:", error);
      res.status(500).send(renderUnsubscribeErrorPage());
    }
  };

  return { get, post };
}
