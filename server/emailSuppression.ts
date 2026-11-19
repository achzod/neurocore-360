/**
 * Liste de suppression des envois marketing et des séquences.
 *
 * Règles (demandées par Achzod, 2026-11-19) :
 * - Les mails transactionnels (magic link, rapport prêt, confirmation de
 *   commande, livraisons payées, FormCheck) ne sont JAMAIS bloqués ici.
 * - Les alertes et notifications admin ne sont jamais bloquées.
 * - Tout autre mail (marketing, relance, séquence) est bloqué quand l'adresse a :
 *     1. un hard bounce (SMTP 5xx hors 555, ou évènement "bounce" du webhook),
 *     2. une plainte spam (évènement "spam" du webhook),
 *     3. une désinscription (table email_unsubscribes, évènement "unsubscribe",
 *        ou refus SMTP 555 / "unsubscribed" chez SendPulse),
 *     4. 2 échecs fournisseur consécutifs propres au destinataire
 *        (les pannes de compte comme quota, auth, réseau ne comptent pas :
 *        elles ne disent rien de l'adresse).
 * - Les séquences nurture (J14, J30, réactivation, upsell) sont en plus
 *   bloquées pour un contact qui reçoit des mails depuis au moins 90 jours
 *   sans aucune ouverture ni clic sur les 90 derniers jours.
 *
 * La logique de décision est pure (evaluateEmailSuppression) pour être testée
 * sans base. loadSuppressionContext lit l'historique en lecture seule.
 */
import { isCriticalTransactionalEmail } from "./emailDeliveryPolicy";
import { isTerminalUnsubscribeSignal } from "./emailDeliveryFailure";

export const COLD_CONTACT_WINDOW_DAYS = 90;
export const CONSECUTIVE_RECIPIENT_FAILURES_LIMIT = 2;

/** Séquences nurture soumises en plus à la règle « froid depuis 90 jours ». */
export const NURTURE_EMAIL_TYPES = new Set([
  "sendDiscoveryJ14CoachingEmail",
  "sendDiscoveryJ30NurtureEmail",
  "sendReactivationCampaignEmail",
  "sendGratuitUpsellEmail",
  "sendCrossSellUpgradeEmail",
  "sendPremiumJ14Email",
]);

/** Mails internes : jamais bloqués (le destinataire est Achzod lui-même). */
export const OPERATIONAL_EMAIL_TYPES = new Set([
  "sendAdminEmailNewAudit",
  "sendAdminReviewNotification",
  "sendAdminBloodQaHoldNotification",
  "sendOperationalAlertEmail",
  "sendWhatsAppLeadAdminAlert",
  "peptidesPreviewAdmin",
]);

export type EmailSuppressionClass = "transactional" | "operational" | "nurture" | "marketing";

export function classifyEmailForSuppression(input: {
  emailType: string;
  subject: string;
  recipientEmail: string;
  adminEmails?: string[];
}): EmailSuppressionClass {
  if (isCriticalTransactionalEmail(input.emailType, input.subject)) return "transactional";
  const recipient = String(input.recipientEmail || "").trim().toLowerCase();
  const admins = (input.adminEmails || []).map((e) => String(e || "").trim().toLowerCase()).filter(Boolean);
  if (OPERATIONAL_EMAIL_TYPES.has(input.emailType) || (recipient && admins.includes(recipient))) {
    return "operational";
  }
  if (NURTURE_EMAIL_TYPES.has(input.emailType)) return "nurture";
  return "marketing";
}

export interface SuppressionHistoryRow {
  emailType?: string | null;
  sendpulseStatus?: string | null;
  sendpulseError?: string | null;
  httpStatus?: number | null;
  sentAt?: Date | string | null;
  opened?: Date | string | null;
  clicked?: Date | string | null;
}

export interface SuppressionContext {
  unsubscribed: boolean;
  /** Tentatives réelles d'envoi au destinataire, la plus récente d'abord. */
  recentAttempts: SuppressionHistoryRow[];
  /** Première fois qu'un mail a été accepté pour ce destinataire. */
  firstAcceptedAt: Date | null;
  /** Dernière ouverture ou dernier clic connu, tous mails confondus. */
  lastEngagementAt: Date | null;
}

export type SuppressionReason =
  | "unsubscribed"
  | "complaint"
  | "hard_bounce"
  | "consecutive_provider_failures"
  | "cold_90_days";

export interface SuppressionDecision {
  suppressed: boolean;
  reason: SuppressionReason | null;
  emailClass: EmailSuppressionClass;
}

const parseJsonObject = (raw: unknown): Record<string, any> | null => {
  if (!raw) return null;
  if (typeof raw === "object") return raw as Record<string, any>;
  const text = String(raw);
  try {
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed === "object") return parsed;
    if (typeof parsed === "string") {
      try {
        const inner = JSON.parse(parsed);
        if (inner && typeof inner === "object") return inner;
      } catch {
        /* chaîne simple */
      }
    }
  } catch {
    /* pas du JSON */
  }
  return null;
};

const smtpCodeOf = (row: SuppressionHistoryRow): number | null => {
  const parsed = parseJsonObject(row.sendpulseError);
  const raw = parsed?.smtpAnswerCode ?? parsed?.smtp_answer_code;
  const fromJson = Number(raw);
  if (raw !== undefined && raw !== null && Number.isFinite(fromJson) && fromJson > 0) return fromJson;
  const match = String(row.sendpulseError || "").match(/"smtpAnswerCode"\s*:\s*(\d{3})/i);
  return match ? Number(match[1]) : null;
};

const eventTypeOf = (row: SuppressionHistoryRow): string => {
  const parsed = parseJsonObject(row.sendpulseError);
  const fromJson = String(parsed?.eventType || "").toLowerCase();
  if (fromJson) return fromJson;
  const match = String(row.sendpulseError || "").match(/"eventType"\s*:\s*"([a-z_]+)"/i);
  return match ? match[1].toLowerCase() : "";
};

export function isComplaintRow(row: SuppressionHistoryRow): boolean {
  return eventTypeOf(row) === "spam";
}

export function isUnsubscribeRow(row: SuppressionHistoryRow): boolean {
  if (eventTypeOf(row) === "unsubscribe") return true;
  return isTerminalUnsubscribeSignal({
    sendpulseStatus: row.sendpulseStatus,
    sendpulseError: row.sendpulseError,
  });
}

export function isHardBounceRow(row: SuppressionHistoryRow): boolean {
  if (isUnsubscribeRow(row)) return false;
  const eventType = eventTypeOf(row);
  const code = smtpCodeOf(row);
  if (eventType === "bounce") return code === null || code >= 500;
  if (code !== null && code >= 500) return true;
  return false;
}

/**
 * Pannes qui viennent du compte ou du réseau, pas de l'adresse : quota
 * SendPulse épuisé, identifiants, limite de débit, erreur serveur, timeout,
 * absence de preuve SMTP en lecture. Elles ne doivent jamais mettre une
 * adresse en liste de suppression.
 */
export function isAccountLevelFailure(row: SuppressionHistoryRow): boolean {
  const http = Number(row.httpStatus);
  if (Number.isFinite(http) && (http === 401 || http === 403 || http === 429 || http >= 500)) return true;
  const text = String(row.sendpulseError || "").toLowerCase();
  return /quota|limit|exceed|credential|auth failed|unauthori|not configured|fetch failed|timeout|timed out|abort|econn|enotfound|socket|no live smtp record|not yet proven|rate.?limit|too many requests/.test(text);
}

/** Échec propre au destinataire : preuve SMTP, rebond, ou refus d'adresse. */
export function isRecipientLevelFailure(row: SuppressionHistoryRow): boolean {
  const status = String(row.sendpulseStatus || "").toLowerCase();
  if (status !== "failed") return false;
  const eventType = eventTypeOf(row);
  if (["hard_fail", "soft_fail", "bounce", "spam", "unsubscribe"].includes(eventType)) return true;
  if (smtpCodeOf(row) !== null) return true;
  if (isAccountLevelFailure(row)) return false;
  const text = String(row.sendpulseError || "").toLowerCase();
  return /invalid|recipient|mailbox|address|email/.test(text);
}

const toDate = (value: Date | string | null | undefined): Date | null => {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

export function evaluateEmailSuppression(
  input: { emailType: string; subject: string; recipientEmail: string; adminEmails?: string[] },
  context: SuppressionContext,
  now: Date = new Date(),
): SuppressionDecision {
  const emailClass = classifyEmailForSuppression(input);
  const allow = (): SuppressionDecision => ({ suppressed: false, reason: null, emailClass });
  if (emailClass === "transactional" || emailClass === "operational") return allow();

  const block = (reason: SuppressionReason): SuppressionDecision => ({ suppressed: true, reason, emailClass });
  const attempts = context.recentAttempts || [];

  if (context.unsubscribed || attempts.some(isUnsubscribeRow)) return block("unsubscribed");
  if (attempts.some(isComplaintRow)) return block("complaint");
  if (attempts.some(isHardBounceRow)) return block("hard_bounce");

  // Seules les tentatives réellement envoyées comptent pour la règle des
  // échecs consécutifs : les blocages internes et les lignes en attente non.
  const realAttempts = attempts.filter((row) => {
    const status = String(row.sendpulseStatus || "").toLowerCase();
    return status === "success" || status === "failed";
  });
  const lastTwo = realAttempts.slice(0, CONSECUTIVE_RECIPIENT_FAILURES_LIMIT);
  if (
    lastTwo.length === CONSECUTIVE_RECIPIENT_FAILURES_LIMIT
    && lastTwo.every(isRecipientLevelFailure)
  ) {
    return block("consecutive_provider_failures");
  }

  if (emailClass === "nurture") {
    const windowMs = COLD_CONTACT_WINDOW_DAYS * 24 * 60 * 60 * 1000;
    const firstAccepted = toDate(context.firstAcceptedAt);
    const lastEngagement = toDate(context.lastEngagementAt);
    const knownLongEnough = firstAccepted !== null && now.getTime() - firstAccepted.getTime() >= windowMs;
    const engagedRecently = lastEngagement !== null && now.getTime() - lastEngagement.getTime() < windowMs;
    if (knownLongEnough && !engagedRecently) return block("cold_90_days");
  }

  return allow();
}

type QueryablePool = {
  query: (text: string, values?: unknown[]) => Promise<{ rows: any[] }>;
};

/**
 * Lecture seule de l'historique d'un destinataire. Utilise l'index
 * idx_email_tracking_recipient (égalité exacte sur l'adresse brute et en
 * minuscules) plutôt qu'un LOWER() qui forcerait un parcours complet.
 */
export async function loadSuppressionContext(
  pool: QueryablePool,
  recipientEmail: string,
  options: { unsubscribed: boolean; excludeTrackingId?: string | null },
): Promise<SuppressionContext> {
  const raw = String(recipientEmail || "").trim();
  const lower = raw.toLowerCase();
  const exclude = options.excludeTrackingId || null;
  const recent = await pool.query(
    `SELECT email_type, sendpulse_status, sendpulse_error,
            (metadata->>'sendpulseHttpStatus') AS http_status,
            sent_at, opened, clicked
       FROM email_tracking
      WHERE recipient_email IN ($1, $2)
        AND ($3::text IS NULL OR id <> $3::text)
        AND sendpulse_status IS NOT NULL
      ORDER BY sent_at DESC NULLS LAST
      LIMIT 20`,
    [raw, lower, exclude],
  );
  const aggregate = await pool.query(
    `SELECT MIN(sent_at) FILTER (WHERE sendpulse_status = 'success') AS first_accepted_at,
            GREATEST(MAX(opened), MAX(clicked)) AS last_engagement_at
       FROM email_tracking
      WHERE recipient_email IN ($1, $2)`,
    [raw, lower],
  );
  const agg = aggregate.rows[0] || {};
  return {
    unsubscribed: options.unsubscribed,
    recentAttempts: recent.rows.map((row: any) => ({
      emailType: row.email_type,
      sendpulseStatus: row.sendpulse_status,
      sendpulseError: row.sendpulse_error,
      httpStatus: row.http_status === null || row.http_status === undefined ? null : Number(row.http_status),
      sentAt: row.sent_at,
      opened: row.opened,
      clicked: row.clicked,
    })),
    firstAcceptedAt: toDate(agg.first_accepted_at),
    lastEngagementAt: toDate(agg.last_engagement_at),
  };
}
