/**
 * Désinscriptions, plaintes spam et hard bounces signalés par SendPulse
 * (webhook /api/webhooks/sendpulse) → notre liste de suppression
 * (table email_unsubscribes, la même que /api/email/unsubscribe).
 *
 * Pourquoi : depuis le relais SMTP (EMAIL_MARKETING_VIA_SMTP_RELAY=1),
 * SendPulse ajoute son propre List-Unsubscribe à côté du nôtre. Si Gmail
 * choisit le sien, la personne est désinscrite chez SendPulse seulement.
 * Le webhook doit donc la désinscrire chez nous aussi.
 *
 * Règles :
 * - désinscription et plainte spam : toujours ajoutées (droit du
 *   destinataire, indépendant de EMAIL_SUPPRESSION_ENABLED) ;
 * - hard bounce : ajouté seulement si EMAIL_SUPPRESSION_ENABLED !== "0",
 *   comme le reste de la liste de suppression ;
 * - soft bounce et « bounce » sans code SMTP : jamais ajoutés ici
 *   (la règle des 2 échecs consécutifs de emailSuppression.ts s'en charge) ;
 * - idempotent : une adresse déjà présente n'est ni dupliquée ni modifiée
 *   (raison et date d'origine conservées), un événement rejoué ne change rien.
 *
 * Formats SendPulse gérés : un événement seul, un tableau, ou l'enveloppe
 * { "0": {...}, data: { action, data: [...] } } (voir sendpulseWebhookEvents.ts).
 * Noms d'événements vus selon les versions : unsubscribe / unsubscribed,
 * spam / spam_by_user / spamComplaint, hard_bounce / hard_bounces /
 * hard_bounced / hardBounce, soft_bounce(s), undelivered (avec code SMTP).
 */
import { extractSendPulseEvents } from "./sendpulseWebhookEvents";

type AnyRecord = Record<string, any>;

export type SendPulseEventKind =
  | "open"
  | "click"
  | "unsubscribe"
  | "resubscribe"
  | "spam"
  | "hard_bounce"
  | "soft_bounce"
  | "bounce"
  | "undelivered"
  | "delivered"
  | "other";

export type SendPulseSuppressionReason =
  | "sendpulse_unsubscribe"
  | "sendpulse_spam_complaint"
  | "sendpulse_hard_bounce";

/** Normalise le nom d'événement SendPulse (snake_case, camelCase, pluriels). */
export function normalizeSendPulseEventKind(rawEvent: unknown): SendPulseEventKind {
  const e = String(rawEvent || "")
    .replace(/([a-z])([A-Z])/g, "$1_$2")
    .toLowerCase()
    .replace(/[\s-]+/g, "_")
    .trim();
  if (!e) return "other";
  if (e.includes("resub")) return "resubscribe";
  if (e.includes("unsub")) return "unsubscribe";
  if (e.includes("spam") || e.includes("complain")) return "spam";
  if (e.includes("bounce")) {
    if (e.includes("hard")) return "hard_bounce";
    if (e.includes("soft")) return "soft_bounce";
    return "bounce";
  }
  // « undelivered » / « not_delivered » avant « delivered » : sinon un échec
  // de livraison serait compté comme livré.
  if (e.includes("undeliver") || e.includes("not_deliver") || e.includes("non_deliver")) return "undelivered";
  if (e.includes("deliver")) return "delivered";
  if (e.includes("open")) return "open";
  if (e.includes("click") || e.includes("redirect") || e === "link") return "click";
  return "other";
}

/** Code SMTP de la réponse du serveur destinataire, s'il est présent. */
export function smtpCodeOfSendPulseEvent(event: AnyRecord): number | null {
  const candidates = [
    event.smtp_answer_code,
    event.smtpAnswerCode,
    event.response_code,
    event.responseCode,
    event.smtp_code,
  ];
  for (const raw of candidates) {
    const n = Number(raw);
    if (raw !== undefined && raw !== null && raw !== "" && Number.isInteger(n) && n >= 200 && n < 600) return n;
  }
  const text = String(event.smtp_answer_data || event.smtp_server_response || event.response || "");
  const match = text.match(/\b([245]\d\d)\b/);
  return match ? Number(match[1]) : null;
}

/** Adresse du destinataire (email pour le service email, recipient pour SMTP). */
export function recipientOfSendPulseEvent(event: AnyRecord): string {
  const raw = event.email ?? event.recipient ?? event.to ?? event.Email ?? event.Recipient ?? "";
  return String(raw || "").trim().toLowerCase();
}

const looksLikeEmail = (email: string): boolean => /^[^\s@<>,;]+@[^\s@<>,;]+\.[^\s@<>,;]+$/.test(email);

/**
 * Raison de suppression d'un événement, ou null s'il ne doit pas toucher la liste.
 * 555 = « destinataire désinscrit » chez SendPulse, traité comme une désinscription.
 */
export function suppressionReasonForSendPulseEvent(event: AnyRecord): SendPulseSuppressionReason | null {
  const kind = normalizeSendPulseEventKind(event.event);
  if (kind === "unsubscribe") return "sendpulse_unsubscribe";
  if (kind === "spam") return "sendpulse_spam_complaint";
  const code = smtpCodeOfSendPulseEvent(event);
  if (code === 555 && (kind === "hard_bounce" || kind === "bounce" || kind === "undelivered")) {
    return "sendpulse_unsubscribe";
  }
  if (kind === "hard_bounce") return code !== null && code < 500 ? null : "sendpulse_hard_bounce";
  if ((kind === "bounce" || kind === "undelivered") && code !== null && code >= 500) {
    return "sendpulse_hard_bounce";
  }
  return null;
}

export interface SendPulseSuppressionCandidate {
  email: string;
  reason: SendPulseSuppressionReason;
}

/**
 * Liste dédoublonnée (une ligne par adresse) des adresses à ajouter.
 * Priorité si une adresse a plusieurs événements : désinscription,
 * puis plainte, puis hard bounce. Les hard bounces sont ignorés si
 * suppressionEnabled vaut false.
 */
export function collectSendPulseSuppressions(
  body: unknown,
  options: { suppressionEnabled: boolean },
): SendPulseSuppressionCandidate[] {
  const priority: Record<SendPulseSuppressionReason, number> = {
    sendpulse_unsubscribe: 0,
    sendpulse_spam_complaint: 1,
    sendpulse_hard_bounce: 2,
  };
  const byEmail = new Map<string, SendPulseSuppressionReason>();
  for (const event of extractSendPulseEvents(body)) {
    const reason = suppressionReasonForSendPulseEvent(event);
    if (!reason) continue;
    if (reason === "sendpulse_hard_bounce" && !options.suppressionEnabled) continue;
    const email = recipientOfSendPulseEvent(event);
    if (!email || !looksLikeEmail(email)) continue;
    const current = byEmail.get(email);
    if (!current || priority[reason] < priority[current]) byEmail.set(email, reason);
  }
  return Array.from(byEmail, ([email, reason]) => ({ email, reason }));
}

export const isEmailSuppressionEnabled = (env: Record<string, string | undefined> = process.env): boolean =>
  env.EMAIL_SUPPRESSION_ENABLED !== "0";

export interface SendPulseSuppressionDeps {
  /** Ajoute l'adresse si absente. Renvoie true si une ligne a été créée. */
  addToSuppressionList: (email: string, reason: SendPulseSuppressionReason) => Promise<boolean>;
  suppressionEnabled?: boolean;
  log?: (message: string) => void;
}

export async function applySendPulseSuppressions(
  body: unknown,
  deps: SendPulseSuppressionDeps,
): Promise<{ added: number; alreadyPresent: number; failed: number }> {
  const candidates = collectSendPulseSuppressions(body, {
    suppressionEnabled: deps.suppressionEnabled ?? isEmailSuppressionEnabled(),
  });
  let added = 0;
  let alreadyPresent = 0;
  let failed = 0;
  for (const { email, reason } of candidates) {
    try {
      if (await deps.addToSuppressionList(email, reason)) added++;
      else alreadyPresent++;
    } catch (error) {
      failed++;
      deps.log?.(`[SendPulseSuppression] échec pour ${email}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  if (candidates.length > 0) {
    deps.log?.(`[SendPulseSuppression] ${added} ajoutée(s), ${alreadyPresent} déjà présente(s), ${failed} échec(s)`);
  }
  return { added, alreadyPresent, failed };
}
