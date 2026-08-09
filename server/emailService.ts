import type { ComprehensiveRiskProfile, RiskScore } from "./blood-analysis/risk-scores";
import { logBloodEmailDelivery } from "./blood-analysis/delivery-log";
import { logEmail, ADMIN_EMAIL_CC, type EmailTrackingData } from "./emailTracking";
import {
  classifyRecoveryCtaProviderRecord,
  classifySendPulsePostFailure,
  type RecoveryCtaProviderOutcome,
} from "./recoveryCtaClickFollowup";
import nodemailer from "nodemailer";

const SENDPULSE_USER_ID =
  process.env.SENDPULSE_USER_ID || process.env.SENDPULSE_API_USER_ID || "";
const SENDPULSE_SECRET =
  process.env.SENDPULSE_SECRET || process.env.SENDPULSE_API_SECRET || "";
const BREVO_API_KEY = process.env.BREVO_API_KEY || "";
const SMTP_HOST = process.env.SMTP_HOST || "";
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_USER = process.env.SMTP_USER || "";
const SMTP_PASS = process.env.SMTP_PASS || "";
export const SENDER_EMAIL = process.env.SENDER_EMAIL || "coaching@achzodcoaching.com";
export const SENDER_NAME = process.env.SENDER_NAME || "ApexLabs by Achzod";

let smtpFallbackTransport: ReturnType<typeof nodemailer.createTransport> | null = null;

function getSmtpFallbackTransport() {
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null;
  if (!smtpFallbackTransport) {
    smtpFallbackTransport = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
    });
  }
  return smtpFallbackTransport;
}

// SendPulse Address Book IDs - configure in env or hardcode after creating in SendPulse
const SENDPULSE_APEXLABS_BOOK_ID = process.env.SENDPULSE_APEXLABS_BOOK_ID || "";

// ApexLabs Design System (Ultrahuman style)
export const COLORS = {
  primary: '#FCDD00',       // APEXLABS yellow (brand)
  background: '#000000',
  surface: '#0a0a0a',
  border: 'rgba(252, 221, 0, 0.15)',
  text: '#FFFFFF',
  textMuted: '#a1a1aa',
  warning: '#f59e0b',
  purple: '#8b5cf6',        // ELITE / Ultimate
  blood: '#ef4444',         // BLOOD_ANALYSIS
  discovery: '#22d3ee',     // Cyan for GRATUIT Discovery (NOT gray anymore)
  anabolic: '#22c55e',      // Green for PREMIUM Anabolic
};

type CoachingOfferTier = {
  label: string;
  href: string;
  offers: Array<{
    duration: string;
    price: number;
  }>;
};

const COACHING_OFFER_TIERS: CoachingOfferTier[] = [
  {
    label: "Essential",
    href: "https://www.achzodcoaching.com/coaching-essential",
    offers: [
      { duration: "4 semaines", price: 249 },
      { duration: "8 semaines", price: 399 },
      { duration: "12 semaines", price: 549 },
    ],
  },
  {
    label: "Elite",
    href: "https://www.achzodcoaching.com/coaching-elite",
    offers: [
      { duration: "4 semaines", price: 399 },
      { duration: "8 semaines", price: 649 },
      { duration: "12 semaines", price: 899 },
    ],
  },
  {
    label: "Private Lab",
    href: "https://www.achzodcoaching.com/coaching-achzod-private-lab",
    offers: [
      { duration: "4 semaines", price: 499 },
      { duration: "8 semaines", price: 799 },
      { duration: "12 semaines", price: 1199 },
    ],
  },
];

const DEDUCTION_BY_AUDIT_TYPE: Record<string, number> = {
  GRATUIT: 0,
  DISCOVERY: 0,
  PREMIUM: 59,
  ANABOLIC_BIOSCAN: 59,
  ELITE: 79,
  ULTIMATE_SCAN: 79,
  BLOOD_ANALYSIS: 99,
  PEPTIDES_ENGINE: 150,
};

const PROMO_CODE_BY_AUDIT_TYPE: Record<string, { code: string; amount: number }> = {
  PREMIUM: { code: "BIOSCAN59", amount: 59 },
  ANABOLIC_BIOSCAN: { code: "BIOSCAN59", amount: 59 },
  ELITE: { code: "ULTIMATE79", amount: 79 },
  ULTIMATE_SCAN: { code: "ULTIMATE79", amount: 79 },
  BLOOD_ANALYSIS: { code: "BLOOD99", amount: 99 },
  PEPTIDES_ENGINE: { code: "PEPTIDES150", amount: 150 },
};

const getPromoCodeForAuditType = (auditType: string): { code: string; amount: number } | null => {
  return PROMO_CODE_BY_AUDIT_TYPE[auditType] || null;
};

const formatEuro = (value: number): string => {
  const formatted = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(value);
  return `${formatted}€`;
};

const getDeductionAmount = (auditType?: string): number => {
  if (!auditType) return 0;
  return DEDUCTION_BY_AUDIT_TYPE[auditType] ?? 0;
};

let accessToken: string | null = null;
let tokenExpiry: number = 0;

export async function getAccessToken(): Promise<string> {
  if (!SENDPULSE_USER_ID || !SENDPULSE_SECRET) {
    console.error(
      "[SendPulse] MISSING CREDENTIALS - configure SENDPULSE_USER_ID/SENDPULSE_SECRET or SENDPULSE_API_USER_ID/SENDPULSE_API_SECRET",
    );
    throw new Error("SendPulse credentials not configured");
  }

  if (accessToken && Date.now() < tokenExpiry) {
    return accessToken;
  }

  console.log("[SendPulse] Requesting new access token...");
  const response = await fetch("https://api.sendpulse.com/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "client_credentials",
      client_id: SENDPULSE_USER_ID,
      client_secret: SENDPULSE_SECRET,
    }),
  });

  if (!response.ok) {
    console.error("[SendPulse] Auth failed:", response.status, await response.text());
    throw new Error("SendPulse auth failed");
  }

  const data = await response.json() as { access_token: string; expires_in: number };
  accessToken = data.access_token;
  tokenExpiry = Date.now() + (data.expires_in - 60) * 1000;
  console.log("[SendPulse] Access token obtained successfully");
  return accessToken;
}

function encodeBase64(str: string): string {
  return Buffer.from(str).toString("base64");
}

/**
 * Send email via SendPulse with automatic tracking and CC to admin
 *
 * @param emailPayload - SendPulse email payload
 * @param trackingData - Tracking metadata
 * @returns SendPulse response
 */
type SendPulseSendResult = {
  result: boolean;
  id?: string;
  error?: any;
  message?: any;
  httpStatus?: number;
  reconcileRequired?: boolean;
};

type SendPulseLiveRecord = Record<string, any>;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const normalizeSendPulseText = (value: unknown): string =>
  String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();

const sendPulseRecordId = (record: SendPulseLiveRecord): string | undefined => {
  const raw = record.id ?? record.email_id ?? record.message_id ?? record.task_id;
  return raw ? String(raw).trim() : undefined;
};

const sendPulseRecordRecipient = (record: SendPulseLiveRecord): string =>
  String(record.recipient || record.to || record.email || "").trim().toLowerCase();

const sendPulseRecordSubject = (record: SendPulseLiveRecord): string =>
  String(record.subject || "").trim();

const sendPulseRecordDateMs = (record: SendPulseLiveRecord): number => {
  const raw = String(record.send_date || record.date || record.created_at || "").trim();
  if (!raw) return 0;
  const isoUtc = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(raw)
    ? raw.replace(" ", "T") + "Z"
    : raw;
  const parsed = Date.parse(isoUtc);
  return Number.isFinite(parsed) ? parsed : 0;
};

const chooseRecentSendPulseRecord = (
  records: SendPulseLiveRecord[],
  recipientEmail: string,
  subject: string,
  sentStartedAt: Date,
): SendPulseLiveRecord | null => {
  const normalizedRecipient = recipientEmail.trim().toLowerCase();
  const normalizedSubject = normalizeSendPulseText(subject);
  const matches = records
    .filter((record) => sendPulseRecordRecipient(record) === normalizedRecipient)
    .filter((record) => normalizeSendPulseText(sendPulseRecordSubject(record)) === normalizedSubject)
    .map((record) => ({
      record,
      delta: Math.abs(sendPulseRecordDateMs(record) - sentStartedAt.getTime()),
    }))
    .filter(({ delta }) => delta <= 15 * 60 * 1000)
    .sort((a, b) => a.delta - b.delta);

  return matches[0]?.record || null;
};

const sendPulseLiveRecordMatches = (
  record: SendPulseLiveRecord,
  recipientEmail: string,
  subject: string,
): boolean => {
  const normalizedRecipient = recipientEmail.trim().toLowerCase();
  const normalizedSubject = normalizeSendPulseText(subject);
  return sendPulseRecordRecipient(record) === normalizedRecipient
    && normalizeSendPulseText(sendPulseRecordSubject(record)) === normalizedSubject;
};

const sendPulseLiveSmtpCode = (record: SendPulseLiveRecord): number | null => {
  const raw = record.smtp_answer_code ?? record.smtpAnswerCode ?? record.smtp_code;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
};

const sendPulseLiveDeliveryFailure = (record: SendPulseLiveRecord): Record<string, unknown> | null => {
  const smtpAnswerCode = sendPulseLiveSmtpCode(record);
  const status = String(record.status || "").toLowerCase();
  const smtpAnswerData = String(record.smtp_answer_data || record.smtpAnswerData || "");
  const hardFailed = (smtpAnswerCode !== null && smtpAnswerCode >= 500)
    || status === "failed"
    || status === "error"
    || status === "bounced"
    || /unsubscribed/i.test(smtpAnswerData);
  const softFailed = smtpAnswerCode !== null && smtpAnswerCode >= 400 && smtpAnswerCode < 500;
  if (!hardFailed && !softFailed) return null;
  return {
    eventType: hardFailed ? "hard_fail" : "soft_fail",
    providerTaskId: sendPulseRecordId(record) || null,
    smtpAnswerCode,
    smtpAnswerData,
    status: record.status || null,
  };
};

async function fetchSendPulseLiveRecordDetails(
  token: string,
  records: SendPulseLiveRecord[],
): Promise<SendPulseLiveRecord[]> {
  const ids = Array.from(new Set(records.map(sendPulseRecordId).filter(Boolean)));
  if (ids.length === 0) return records;

  const response = await fetch("https://api.sendpulse.com/smtp/emails/info", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ emails: ids.slice(0, 100) }),
  });
  if (!response.ok) return records;

  const data = await response.json();
  const details: SendPulseLiveRecord[] = Array.isArray(data) ? data : (data.data || data.emails || []);
  const byId = new Map<string, SendPulseLiveRecord>();
  for (const detail of details) {
    const id = sendPulseRecordId(detail);
    if (id) byId.set(id, detail);
  }

  return records.map((record) => {
    const id = sendPulseRecordId(record);
    const detail = id ? byId.get(id) : undefined;
    return detail ? { ...record, ...detail } : record;
  });
}

const isCriticalSendPulseEmail = (emailType: string, subject: string): boolean => {
  const normalized = normalizeSendPulseText(subject);
  return emailType === "sendReportReadyEmail"
    || emailType === "sendBloodAnalysisHtmlEmail"
    || emailType === "sendPeptidesOrderConfirmation"
    || (emailType === "sendCTAEmail" && (
      normalized.includes("protocole peptides")
      || normalized.includes("commande recue")
      || normalized.includes("paiement recu")
      || normalized.includes("rapport")
    ));
};

async function findRecentSendPulseLiveRecord(
  token: string,
  recipientEmail: string,
  subject: string,
  sentStartedAt: Date,
): Promise<SendPulseLiveRecord | null> {
  const normalizedRecipient = recipientEmail.trim().toLowerCase();
  const normalizedSubject = normalizeSendPulseText(subject);
  if (!normalizedRecipient || !normalizedSubject) return null;

  const fromDate = new Date(sentStartedAt.getTime() - 10 * 60 * 1000).toISOString();
  const attemptDelays = [800, 1800, 3200];

  for (let attempt = 0; attempt < attemptDelays.length; attempt++) {
    await sleep(attemptDelays[attempt]);
    const response = await fetch(
      `https://api.sendpulse.com/smtp/emails?limit=100&offset=0&from_date=${encodeURIComponent(fromDate)}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      },
    );
    if (!response.ok) continue;

    const data = await response.json();
    const records: SendPulseLiveRecord[] = Array.isArray(data) ? data : (data.data || []);
    const listMatch = chooseRecentSendPulseRecord(records, normalizedRecipient, normalizedSubject, sentStartedAt);
    if (listMatch) return listMatch;

    const detailedRecords = await fetchSendPulseLiveRecordDetails(token, records).catch(() => records);
    const detailMatch = chooseRecentSendPulseRecord(detailedRecords, normalizedRecipient, normalizedSubject, sentStartedAt);
    if (detailMatch) return detailMatch;
  }

  return null;
}

export async function reconcileRecoveryCtaSendPulseOutcome(input: {
  recipientEmail: string;
  subject: string;
  providerPostStartedAt: Date;
}): Promise<RecoveryCtaProviderOutcome> {
  if (!input.recipientEmail || !input.subject || !Number.isFinite(input.providerPostStartedAt.getTime())) {
    return { outcome: "unknown", reason: "missing_reconciliation_identity" };
  }
  try {
    const token = await getAccessToken();
    const record = await findRecentSendPulseLiveRecord(
      token,
      input.recipientEmail,
      input.subject,
      input.providerPostStartedAt,
    );
    return classifyRecoveryCtaProviderRecord(record);
  } catch (error) {
    return {
      outcome: "unknown",
      reason: error instanceof Error ? `provider_lookup_error:${error.message}` : "provider_lookup_error",
    };
  }
}

async function sendEmailWithTracking(
  emailPayload: {
    html: string;
    text: string;
    subject: string;
    from: { name: string; email: string };
    to: Array<{ email: string; name?: string }>;
    attachments_binary?: Record<string, string>;
  },
  trackingData: {
    emailType: string;
    recipientEmail: string;
    recipientName?: string;
    auditId?: string;
    auditType?: string;
    metadata?: Record<string, any>;
    beforeProviderPost?: (context: {
      recipientEmail: string;
      subject: string;
      startedAt: Date;
    }) => Promise<void>;
  }
): Promise<SendPulseSendResult> {
  let providerPostStarted = false;
  try {
    // Check unsubscribe before sending
    const { storage } = await import("./storage");
    if (await storage.isEmailUnsubscribed(trackingData.recipientEmail)) {
      console.log(`[SendPulse] BLOCKED , ${trackingData.recipientEmail} is unsubscribed`);
      await logEmail({
        emailType: trackingData.emailType,
        recipientEmail: trackingData.recipientEmail,
        recipientName: trackingData.recipientName,
        auditId: trackingData.auditId,
        auditType: trackingData.auditType,
        subject: emailPayload.subject,
        previewText: emailPayload.text.substring(0, 100),
        sendpulseStatus: "unsubscribed",
        sendpulseError: "recipient unsubscribed",
        metadata: {
          ...(trackingData.metadata || {}),
          sendpulseAccepted: false,
          sendpulseVerified: false,
          blockedReason: "unsubscribed",
        },
      });
      return { result: false, error: "unsubscribed" };
    }

    // Replace unsubscribe placeholder with the actual link.
    //
    // IMPORTANT: callers encode the HTML with encodeBase64() BEFORE handing it
    // to us (SendPulse accepts a base64-encoded html field). That means when
    // we arrive here, the `{{UNSUB_LINK}}` literal is no longer visible in
    // emailPayload.html , it's been shuffled away in the base64. A plain
    // string .replace() ran against base64 text can't match it, and the
    // "Se désabonner" link reaches the user as literal {{UNSUB_LINK}} text
    // (reported 2026-04-20 by Achzod). Fix: decode, replace, re-encode.
    //
    // Use base64url for the email token so Gmail's auto-linker doesn't trip
    // on the trailing `==` padding chars.
    const recipientB64Url = Buffer.from(trackingData.recipientEmail)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
    const unsubLink = `https://apexlabs.achzodcoaching.com/api/unsubscribe?email=${recipientB64Url}`;

    const looksLikeBase64 = (s: string): boolean =>
      typeof s === "string" && s.length > 40 && /^[A-Za-z0-9+/=\r\n]+$/.test(s.trim());

    // Em-dash sanitizer: replace every ,  and - with a comma. AI-generated and
    // hand-written templates both sneak them in, and Achzod's policy is zero
    // em-dashes anywhere in client-facing output (they're the #1 AI tell).
    // Applied after base64 decode so it covers the actual rendered HTML.
    const stripDashes = (s: string) => s.replace(/[\u2013\u2014]/g, ",");

    if (looksLikeBase64(emailPayload.html)) {
      try {
        const decoded = Buffer.from(emailPayload.html, "base64").toString("utf8");
        const replaced = stripDashes(decoded).replace(/\{\{UNSUB_LINK\}\}/g, unsubLink);
        emailPayload.html = Buffer.from(replaced).toString("base64");
      } catch {
        // Fall through , at worst the link stays broken, but we don't crash the send.
      }
    } else {
      emailPayload.html = stripDashes(emailPayload.html).replace(/\{\{UNSUB_LINK\}\}/g, unsubLink);
    }
    emailPayload.text = stripDashes(emailPayload.text).replace(/\{\{UNSUB_LINK\}\}/g, unsubLink);
    emailPayload.subject = stripDashes(emailPayload.subject);

    const token = await getAccessToken();

    // Add BCC to admin email unless the admin is already a direct recipient.
    // Duplicating the same Gmail address in To + BCC makes some SendPulse
    // payloads fail RFC 5322 validation and would hide critical cost alerts.
    const shouldBccAdmin = !emailPayload.to.some(
      (recipient) => recipient.email.trim().toLowerCase() === ADMIN_EMAIL_CC.toLowerCase(),
    );
    const payloadWithBcc = {
      ...emailPayload,
      ...(shouldBccAdmin
        ? { bcc: [{ email: ADMIN_EMAIL_CC, name: "Admin APEXLABS" }] }
        : {}),
    };

    console.log(
      `[SendPulse] Sending ${trackingData.emailType} to ${trackingData.recipientEmail} (BCC: ${shouldBccAdmin ? ADMIN_EMAIL_CC : "none, already direct recipient"})`,
    );

    const sentStartedAt = new Date();
    await trackingData.beforeProviderPost?.({
      recipientEmail: trackingData.recipientEmail,
      subject: emailPayload.subject,
      startedAt: sentStartedAt,
    });
    providerPostStarted = Boolean(trackingData.beforeProviderPost);
    const response = await fetch("https://api.sendpulse.com/smtp/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ email: payloadWithBcc, track_opens: 1, track_clicks: 1 }),
    });

    const responseText = await response.text();
    let parsed: any = null;
    try {
      parsed = responseText ? JSON.parse(responseText) : {};
    } catch {
      parsed = { result: false, error: responseText || `HTTP ${response.status}` };
    }

    const result: SendPulseSendResult = {
      ...(parsed && typeof parsed === "object" ? parsed : { error: parsed }),
      result: response.ok && parsed?.result === true,
      httpStatus: response.status,
    };
    providerPostStarted = false;
    let sendpulseTaskId = extractSendPulseDeliveryId(result);
    if (sendpulseTaskId) result.id = sendpulseTaskId;
    const liveLookupMetadata: Record<string, any> = {};
    const criticalEmail = isCriticalSendPulseEmail(trackingData.emailType, emailPayload.subject);
    const allowAcceptedWithoutLiveVerification = trackingData.emailType === "sendReportReadyEmail";
    let liveDeliveryFailure: Record<string, unknown> | null = null;

    if (result.result && sendpulseTaskId) {
      const providerRecord = await fetchSendPulseLiveRecordDetails(token, [{ id: sendpulseTaskId }]).catch((error) => {
        liveLookupMetadata.sendpulseProviderIdVerifyError = error instanceof Error ? error.message : String(error);
        return [];
      });
      const providerMatch = providerRecord.find((record) => sendPulseRecordId(record) === sendpulseTaskId);

      if (providerMatch && sendPulseLiveRecordMatches(providerMatch, trackingData.recipientEmail, emailPayload.subject)) {
        liveLookupMetadata.sendpulseLiveLookup = "provider_id_verified";
        liveLookupMetadata.sendpulseSendDate = providerMatch.send_date || providerMatch.date || providerMatch.created_at || null;
        liveLookupMetadata.sendpulseSmtpAnswerCode = providerMatch.smtp_answer_code ?? null;
        liveLookupMetadata.sendpulseSmtpAnswerData = providerMatch.smtp_answer_data || null;
        liveDeliveryFailure = sendPulseLiveDeliveryFailure(providerMatch);
      } else if (providerMatch) {
        liveLookupMetadata.sendpulseLiveLookup = "provider_id_recipient_mismatch";
        liveLookupMetadata.sendpulseProviderId = sendpulseTaskId;
        liveLookupMetadata.sendpulseProviderRecipient = sendPulseRecordRecipient(providerMatch) || null;
        liveLookupMetadata.sendpulseProviderSubject = sendPulseRecordSubject(providerMatch) || null;
        liveLookupMetadata.sendpulseProviderSmtpAnswerCode = providerMatch.smtp_answer_code ?? null;
        liveLookupMetadata.sendpulseProviderSmtpAnswerData = providerMatch.smtp_answer_data || null;
        sendpulseTaskId = undefined;
        delete result.id;
      } else {
        liveLookupMetadata.sendpulseLiveLookup = "provider_id_unverified";
        if (criticalEmail) {
          liveLookupMetadata.sendpulseProviderId = sendpulseTaskId;
          sendpulseTaskId = undefined;
          delete result.id;
        }
      }
    }

    if (result.result && !sendpulseTaskId) {
      const liveRecord = await findRecentSendPulseLiveRecord(
        token,
        trackingData.recipientEmail,
        emailPayload.subject,
        sentStartedAt,
      ).catch((error) => {
        liveLookupMetadata.sendpulseLiveLookupError = error instanceof Error ? error.message : String(error);
        return null;
      });

      if (liveRecord) {
        sendpulseTaskId = sendPulseRecordId(liveRecord) || extractSendPulseDeliveryId(liveRecord);
        if (sendpulseTaskId) result.id = sendpulseTaskId;
        liveLookupMetadata.sendpulseLiveLookup = "matched";
        liveLookupMetadata.sendpulseSendDate = liveRecord.send_date || liveRecord.date || liveRecord.created_at || null;
        liveLookupMetadata.sendpulseSmtpAnswerCode = liveRecord.smtp_answer_code ?? null;
        liveLookupMetadata.sendpulseSmtpAnswerData = liveRecord.smtp_answer_data || null;
        liveDeliveryFailure = sendPulseLiveDeliveryFailure(liveRecord);
      } else {
        liveLookupMetadata.sendpulseLiveLookup = "not_found";
        liveLookupMetadata.sendpulseLiveLookupFromDate = new Date(sentStartedAt.getTime() - 10 * 60 * 1000).toISOString();
        if (criticalEmail && !allowAcceptedWithoutLiveVerification) {
          result.result = false;
          result.error = "SendPulse accepted API request but no live SMTP record was found";
        } else if (criticalEmail) {
          liveLookupMetadata.sendpulseLiveLookupWarning =
            "accepted_by_api_but_live_record_not_found_yet";
        }
      }
    }

    if (result.result && liveDeliveryFailure) {
      result.result = false;
      result.error = liveDeliveryFailure;
      liveLookupMetadata.sendpulseLiveDeliveryFailure = liveDeliveryFailure;
    }

    // Transactional safety net. SendPulse can reject every request when its
    // monthly quota/bandwidth is exhausted (HTTP 422). Orders, payment
    // notifications and paid report deliveries must not disappear with the
    // marketing provider, so critical messages fail over to Brevo.
    if (!result.result && criticalEmail && BREVO_API_KEY) {
      try {
        const htmlContent = looksLikeBase64(emailPayload.html)
          ? Buffer.from(emailPayload.html, "base64").toString("utf8")
          : emailPayload.html;
        const brevoResponse = await fetch("https://api.brevo.com/v3/smtp/email", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "api-key": BREVO_API_KEY,
          },
          body: JSON.stringify({
            sender: emailPayload.from,
            to: emailPayload.to,
            ...(shouldBccAdmin
              ? { bcc: [{ email: ADMIN_EMAIL_CC, name: "Admin APEXLABS" }] }
              : {}),
            subject: emailPayload.subject,
            htmlContent,
            textContent: emailPayload.text,
          }),
        });
        const brevoText = await brevoResponse.text();
        let brevoData: Record<string, any> = {};
        try {
          brevoData = brevoText ? JSON.parse(brevoText) : {};
        } catch {
          brevoData = { raw: brevoText };
        }
        if (brevoResponse.ok) {
          result.result = true;
          result.id = String(brevoData.messageId || `brevo-${Date.now()}`);
          delete result.error;
          liveLookupMetadata.fallbackProvider = "brevo";
          liveLookupMetadata.brevoMessageId = brevoData.messageId || null;
          liveLookupMetadata.sendpulseFallbackReason =
            parsed?.message || parsed?.error || `HTTP ${response.status}`;
          console.log(
            `[EmailFallback] ✅ Brevo accepted ${trackingData.emailType} for ${trackingData.recipientEmail}`,
          );
        } else {
          liveLookupMetadata.fallbackProvider = "brevo";
          liveLookupMetadata.brevoHttpStatus = brevoResponse.status;
          liveLookupMetadata.brevoError = brevoData;
          console.error(
            `[EmailFallback] ❌ Brevo failed ${trackingData.emailType} for ${trackingData.recipientEmail}:`,
            brevoData,
          );
        }
      } catch (brevoError) {
        liveLookupMetadata.fallbackProvider = "brevo";
        liveLookupMetadata.brevoError =
          brevoError instanceof Error ? brevoError.message : String(brevoError);
        console.error("[EmailFallback] Brevo request threw:", brevoError);
      }
    }

    if (!result.result && criticalEmail) {
      const smtpTransport = getSmtpFallbackTransport();
      if (smtpTransport) {
        try {
          const htmlContent = looksLikeBase64(emailPayload.html)
            ? Buffer.from(emailPayload.html, "base64").toString("utf8")
            : emailPayload.html;
          const smtpInfo = await smtpTransport.sendMail({
            from: { name: emailPayload.from.name, address: SMTP_USER },
            replyTo: emailPayload.from.email,
            to: emailPayload.to.map((recipient) => ({
              name: recipient.name || "",
              address: recipient.email,
            })),
            ...(shouldBccAdmin ? { bcc: ADMIN_EMAIL_CC } : {}),
            subject: emailPayload.subject,
            html: htmlContent,
            text: emailPayload.text,
          });
          result.result = true;
          result.id = smtpInfo.messageId;
          delete result.error;
          liveLookupMetadata.fallbackProvider = "smtp";
          liveLookupMetadata.smtpFallbackMessageId = smtpInfo.messageId;
          liveLookupMetadata.smtpFallbackAccepted = smtpInfo.accepted;
          liveLookupMetadata.sendpulseFallbackReason =
            parsed?.message || parsed?.error || `HTTP ${response.status}`;
          console.log(
            `[EmailFallback] ✅ SMTP accepted ${trackingData.emailType} for ${trackingData.recipientEmail}`,
          );
        } catch (smtpError) {
          liveLookupMetadata.fallbackProvider = "smtp";
          liveLookupMetadata.smtpFallbackError =
            smtpError instanceof Error ? smtpError.message : String(smtpError);
          console.error("[EmailFallback] SMTP request threw:", smtpError);
        }
      }
    }

    const sendpulseError = result.result
      ? undefined
      : JSON.stringify(result.error || result.message || responseText || `HTTP ${response.status}`);
    const trackingMetadata = {
      ...(trackingData.metadata || {}),
      sendpulseHttpStatus: response.status,
      sendpulseAccepted: response.ok && parsed?.result === true,
      sendpulseVerified: result.result,
      ...liveLookupMetadata,
      ...(sendpulseTaskId ? { sendpulseTaskId } : {}),
      ...(result.message !== undefined ? { sendpulseMessage: result.message } : {}),
    };

    // Log provider acceptance. Real mailbox delivery is checked later through SendPulse SMTP status.
    await logEmail({
      emailType: trackingData.emailType,
      recipientEmail: trackingData.recipientEmail,
      recipientName: trackingData.recipientName,
      auditId: trackingData.auditId,
      auditType: trackingData.auditType,
      subject: emailPayload.subject,
      previewText: emailPayload.text.substring(0, 100),
      sendpulseTaskId,
      sendpulseStatus: result.result ? "success" : "failed",
      sendpulseError,
      metadata: trackingMetadata,
    });

    console.log(`[SendPulse] Email ${result.result ? "✅ accepted" : "❌ failed"}:`, result);
    return result;
  } catch (error) {
    console.error(`[SendPulse] Error sending ${trackingData.emailType}:`, error);
    const failure = classifySendPulsePostFailure(error, providerPostStarted);

    // An aborted provider POST has an unknown outcome: SendPulse may have accepted
    // the message before the connection disappeared. Never mark it retryable.
    await logEmail({
      emailType: trackingData.emailType,
      recipientEmail: trackingData.recipientEmail,
      recipientName: trackingData.recipientName,
      auditId: trackingData.auditId,
      auditType: trackingData.auditType,
      subject: emailPayload.subject,
      previewText: emailPayload.text.substring(0, 100),
      sendpulseStatus: failure.sendpulseStatus,
      sendpulseError: String(error),
      metadata: {
        ...(trackingData.metadata || {}),
        ...failure.metadata,
      },
    });

    return {
      result: false,
      error: String(error),
      ...(failure.reconcileRequired ? { reconcileRequired: true } : {}),
    };
  }
}

function renderCoachingOffersTable(
  deduction: { amount?: number; percent?: number },
  accentColor: string
): string {
  const deductionAmount = deduction.amount ?? 0;
  const deductionPercent = deduction.percent ?? 0;
  const hasDeduction = deductionAmount > 0 || deductionPercent > 0;
  const headerNote = deductionPercent > 0
    ? `Deduction appliquee : -${deductionPercent}% (formules 8 et 12 sem uniquement)`
    : deductionAmount > 0
    ? `Deduction appliquee : -${formatEuro(deductionAmount)}`
    : "Aucune deduction appliquee sur ce rapport";
  const rowBorder = `1px solid ${COLORS.border}`;
  const rows = COACHING_OFFER_TIERS.flatMap((tier) =>
    tier.offers.map((offer) => {
      const after = deductionPercent > 0
        ? Math.max(0, Math.round(offer.price * (1 - deductionPercent / 100)))
        : Math.max(0, offer.price - deductionAmount);
      return `
        <tr>
          <td style="padding: 10px 12px; border-top: ${rowBorder}; font-weight: 600;">
            <a href="${tier.href}" style="color: ${COLORS.text}; text-decoration: none;">${tier.label}</a>
          </td>
          <td style="padding: 10px 12px; border-top: ${rowBorder}; color: ${COLORS.textMuted};">
            ${offer.duration}
          </td>
          <td style="padding: 10px 12px; border-top: ${rowBorder}; text-align: right; color: ${COLORS.textMuted};">
            <span${hasDeduction ? ' style="text-decoration: line-through;"' : ""}>${formatEuro(offer.price)}</span>
          </td>
          <td style="padding: 10px 12px; border-top: ${rowBorder}; text-align: right; color: ${accentColor}; font-weight: 700;">
            ${formatEuro(after)}
          </td>
        </tr>
      `;
    })
  ).join("");

  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border: ${rowBorder}; border-radius: 12px; overflow: hidden; margin-top: 20px;">
      <tr>
        <td style="padding: 12px 16px; background: ${accentColor}15; border-bottom: ${rowBorder};">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr>
              <td style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: ${accentColor};">
                Formules coaching
              </td>
              <td style="font-size: 11px; text-align: right; color: ${COLORS.textMuted};">
                ${headerNote}
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding: 0;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr>
              <th style="padding: 10px 12px; text-align: left; font-size: 11px; color: ${COLORS.textMuted};">Offre</th>
              <th style="padding: 10px 12px; text-align: left; font-size: 11px; color: ${COLORS.textMuted};">Duree</th>
              <th style="padding: 10px 12px; text-align: right; font-size: 11px; color: ${COLORS.textMuted};">Prix standard</th>
              <th style="padding: 10px 12px; text-align: right; font-size: 11px; color: ${COLORS.textMuted};">Prix apres deduction</th>
            </tr>
            ${rows}
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding: 12px 16px; font-size: 11px; color: ${COLORS.textMuted}; background: ${COLORS.surface}; border-top: ${rowBorder};">
          La deduction du scan s'applique sur chaque formule.
        </td>
      </tr>
    </table>
  `;
}

// Reusable email wrapper with ApexLabs design
function getEmailWrapper(
  content: string,
  headerGradient: string = `linear-gradient(135deg, ${COLORS.primary} 0%, #059669 100%)`,
  headerTitle: string = "Audit Métabolique",
  headerSubtitle: string = "Analyse Personnalisée"
): string {
  // Gmail-safe template. Changes vs the previous version:
  //   - Replaced `display: inline-flex` (Gmail strips it and renders a "..."
  //     placeholder where the badge should be) with a plain inline table.
  //   - Header uses mso + Outlook-safe HTML table layout instead of div/flex.
  //   - All `@import` and external fonts removed , Gmail blocks them,
  //     which was also contributing to the layout shift.
  //   - Removed the decorative circle div that gmail was rendering as bullet.
  //   - Added wider Outlook fallback so padding/gradients degrade gracefully.
  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="only" />
  <meta name="supported-color-schemes" content="only" />
  <title>APEXLABS</title>
</head>
<body style="margin:0;padding:0;background-color:${COLORS.background};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${COLORS.text};">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:${COLORS.background};">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;width:100%;background-color:${COLORS.surface};border-radius:16px;overflow:hidden;border:1px solid ${COLORS.border};">
          <!-- Header (background gradient, text in black for contrast on bright gradients) -->
          <tr>
            <td align="center" style="background:${headerGradient};padding:44px 24px 40px 24px;text-align:center;">
              <p style="margin:0 0 14px 0;color:#000000;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">APEXLABS BY ACHZOD</p>
              <h1 style="margin:0;color:#000000;font-size:32px;line-height:1.15;font-weight:800;letter-spacing:-0.5px;">${headerTitle}</h1>
              <p style="margin:10px 0 0 0;color:rgba(0,0,0,0.72);font-size:14px;font-weight:500;">${headerSubtitle}</p>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding:40px 28px;color:${COLORS.text};">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td align="center" style="background-color:${COLORS.background};padding:26px 24px;border-top:1px solid ${COLORS.border};text-align:center;">
              <p style="margin:0 0 8px 0;color:${COLORS.textMuted};font-size:11px;font-weight:600;letter-spacing:1px;text-transform:uppercase;">Achzod Coaching</p>
              <p style="margin:0 0 10px 0;color:#505050;font-size:10px;">Excellence &middot; Science &middot; Transformation</p>
              <p style="margin:0;"><a href="{{UNSUB_LINK}}" style="color:#606060;font-size:10px;text-decoration:underline;">Se desabonner</a></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// =================================================================================
// COACHING APPLE-CLEAN THEME (Discovery → coaching emails)
// Memory rule feedback_email_apple_style.md : client emails = white + Apple blue.
// Dark APEXLABS theme is reserved for audit deliverables. Coaching = conversion =
// trust = Apple-clean refined design.
// =================================================================================

const APPLE_COLORS = {
  bg: '#f5f5f7',          // light grey page background
  card: '#ffffff',
  ink: '#1d1d1f',
  inkSoft: '#515154',
  muted: '#86868b',
  rule: '#d2d2d7',
  accent: '#0071E3',      // Apple blue
  accentDark: '#0058B0',
  highlight: '#fff3b8',
  success: '#34C759',
  warn: '#FF9500',
};

function getCoachingAppleWrapper(
  content: string,
  headerTitle: string = "Coaching Achzod",
  headerSubtitle: string = "",
): string {
  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="only" />
  <meta name="supported-color-schemes" content="only" />
  <title>Achzod Coaching</title>
</head>
<body style="margin:0;padding:0;background-color:${APPLE_COLORS.bg};font-family:-apple-system,BlinkMacSystemFont,'SF Pro Display','Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${APPLE_COLORS.ink};">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:${APPLE_COLORS.bg};">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;width:100%;background-color:${APPLE_COLORS.card};border-radius:18px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.04);">
          <!-- Header (Apple clean : no gradient, white background, blue accent line) -->
          <tr>
            <td style="background-color:${APPLE_COLORS.card};padding:36px 40px 12px 40px;border-bottom:3px solid ${APPLE_COLORS.accent};">
              <p style="margin:0 0 8px 0;color:${APPLE_COLORS.muted};font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">Achzod Coaching</p>
              <h1 style="margin:0;color:${APPLE_COLORS.ink};font-size:28px;line-height:1.2;font-weight:800;letter-spacing:-0.6px;">${headerTitle}</h1>
              ${headerSubtitle ? `<p style="margin:8px 0 0 0;color:${APPLE_COLORS.inkSoft};font-size:15px;font-weight:500;line-height:1.5;">${headerSubtitle}</p>` : ''}
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding:36px 40px;color:${APPLE_COLORS.ink};">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td align="center" style="background-color:${APPLE_COLORS.bg};padding:24px 40px;border-top:1px solid ${APPLE_COLORS.rule};text-align:center;">
              <p style="margin:0 0 6px 0;color:${APPLE_COLORS.ink};font-size:13px;font-weight:600;">Achzod</p>
              <p style="margin:0 0 10px 0;color:${APPLE_COLORS.muted};font-size:11px;">coaching@achzodcoaching.com</p>
              <p style="margin:0;"><a href="{{UNSUB_LINK}}" style="color:${APPLE_COLORS.muted};font-size:10px;text-decoration:underline;">Se desabonner</a></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// Format a deadline date in French (e.g., "mardi 19 mai")
function formatDeadlineFR(daysFromNow: number): string {
  const date = new Date(Date.now() + daysFromNow * 24 * 60 * 60 * 1000);
  return date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
}

// Reusable Apple-clean DISCOVERY30 banner at the top of each coaching email.
// A deadline is shown only when the caller owns a real campaign deadline.
function getDiscoveryPromoBanner(daysLeft?: number): string {
  const deadline = typeof daysLeft === "number" ? formatDeadlineFR(daysLeft) : null;
  return `
    <div style="margin:0 0 28px;padding:18px 22px;background:${APPLE_COLORS.accent};border-radius:14px;text-align:center;">
      <p style="margin:0 0 4px;color:rgba(255,255,255,0.85);font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">Ton code clients Discovery</p>
      <p style="margin:0 0 6px;color:#ffffff;font-size:28px;font-weight:800;letter-spacing:3px;">DISCOVERY30</p>
      <p style="margin:0;color:rgba(255,255,255,0.95);font-size:14px;font-weight:500;line-height:1.5;">
        -30% sur formules coaching 8 et 12 sem<br/>
        <span style="font-size:12px;color:rgba(255,255,255,0.8);">A copier dans le champ <strong style="color:#ffffff;">Code promotionnel</strong> au checkout</span><br/>
        ${deadline
          ? `<span style="font-size:12px;color:rgba(255,255,255,0.8);">Valide jusqu'au <strong style="color:#ffffff;">${deadline}</strong></span>`
          : `<span style="font-size:12px;color:rgba(255,255,255,0.8);">Code actuellement actif</span>`}
      </p>
    </div>
  `;
}

function discoveryCoachingBridgeUrl(
  baseUrl: string,
  campaign: string,
  content: string,
  tier?: "ESSENTIAL" | "ELITE" | "PRIVATELAB"
): string {
  const url = new URL("/go/coaching", baseUrl);
  url.searchParams.set("code", "DISCOVERY30");
  url.searchParams.set("utm_source", "apexlabs");
  url.searchParams.set("utm_medium", "email");
  url.searchParams.set("utm_campaign", campaign);
  url.searchParams.set("utm_content", content);
  if (tier) url.searchParams.set("tier", tier);
  return url.toString();
}

function withEmailClickTracking(baseUrl: string, trackingId: string, url: string): string {
  return `${baseUrl}/api/track/email/${encodeURIComponent(trackingId)}/click?url=${encodeURIComponent(url)}`;
}

function getCoachingAppleButton(text: string, href: string, variant: 'primary' | 'secondary' = 'primary'): string {
  const bg = variant === 'primary' ? APPLE_COLORS.accent : APPLE_COLORS.card;
  const fg = variant === 'primary' ? '#ffffff' : APPLE_COLORS.accent;
  const border = variant === 'primary' ? APPLE_COLORS.accent : APPLE_COLORS.accent;
  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:20px 0;">
      <tr>
        <td align="center">
          <!--[if mso]>
          <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${href}" style="height:50px;v-text-anchor:middle;width:300px;" arcsize="20%" fillcolor="${bg}" strokecolor="${border}" strokeweight="1px">
            <w:anchorlock/>
            <center style="color:${fg};font-family:-apple-system,Arial,sans-serif;font-size:15px;font-weight:600;letter-spacing:0.3px;">${text}</center>
          </v:roundrect>
          <![endif]-->
          <!--[if !mso]><!-->
          <a href="${href}" target="_blank" style="background-color:${bg};border:1px solid ${border};border-radius:10px;color:${fg};display:inline-block;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:15px;font-weight:600;line-height:50px;min-width:240px;padding:0 32px;text-align:center;text-decoration:none;letter-spacing:0.3px;mso-hide:all;">${text}</a>
          <!--<![endif]-->
        </td>
      </tr>
    </table>
  `;
}

// Primary CTA Button , Gmail + Outlook bulletproof (VML fallback for Outlook 07+).
// Uses nested <table> + mso-padding-alt for Outlook, fallback inline-block for
// everything else. Never relies on CSS that Gmail strips (inline-flex, gap,
// display:flex). White text on dark colors, black text on bright brand colors.
function getPrimaryButton(text: string, href: string, color: string = COLORS.primary): string {
  const brightBackgrounds = [COLORS.primary, COLORS.warning, COLORS.discovery, COLORS.anabolic];
  const textColor = brightBackgrounds.includes(color) ? '#000000' : '#ffffff';
  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:24px 0;">
      <tr>
        <td align="center">
          <!--[if mso]>
          <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${href}" style="height:52px;v-text-anchor:middle;width:280px;" arcsize="15%" fillcolor="${color}" stroke="f">
            <w:anchorlock/>
            <center style="color:${textColor};font-family:Arial,sans-serif;font-size:14px;font-weight:bold;text-transform:uppercase;letter-spacing:0.5px;">${text}</center>
          </v:roundrect>
          <![endif]-->
          <!--[if !mso]><!-->
          <a href="${href}" target="_blank" style="background-color:${color};background:${color};border:0;border-radius:8px;color:${textColor};display:inline-block;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:14px;font-weight:700;line-height:52px;min-width:220px;padding:0 28px;text-align:center;text-decoration:none;text-transform:uppercase;letter-spacing:0.6px;mso-hide:all;">${text}</a>
          <!--<![endif]-->
        </td>
      </tr>
    </table>
  `;
}

// Review Stars Section
function getReviewSection(dashboardLink: string): string {
  return `
    <div style="margin: 32px 0; padding: 28px; background: linear-gradient(135deg, rgba(251, 191, 36, 0.1) 0%, rgba(245, 158, 11, 0.05) 100%); border-radius: 12px; border: 1px solid rgba(251, 191, 36, 0.2); text-align: center;">
      <div style="font-size: 11px; margin-bottom: 12px; letter-spacing: 1px; text-transform: uppercase; color: ${COLORS.textMuted};">Note sur 5</div>
      <h3 style="color: ${COLORS.warning}; font-size: 18px; font-weight: 700; margin: 0 0 8px; letter-spacing: -0.5px;">Ton avis compte !</h3>
      <p style="color: ${COLORS.textMuted}; font-size: 14px; margin: 0 0 20px; line-height: 1.6;">
        30 secondes pour noter ton experience.<br>Ton retour aide d'autres personnes a decouvrir APEXLABS.
      </p>
      ${getPrimaryButton('Laisser un avis', `${dashboardLink}#review`, COLORS.warning)}
    </div>
  `;
}

// Coaching CTA Section
function getCoachingSection(auditType: string, color: string = COLORS.purple): string {
  const coachingLink = "https://www.achzodcoaching.com/formules-coaching";
  const deductionAmount = getDeductionAmount(auditType);
  const promo = getPromoCodeForAuditType(auditType);

  // GRATUIT / DISCOVERY uses DISCOVERY30 (-30% on all coaching formulas)
  const isDiscovery = auditType === "GRATUIT" || auditType === "DISCOVERY";
  const discoveryPromo = isDiscovery
    ? { code: "DISCOVERY30", percent: 30 }
    : null;

  const promoSection = promo ? `
      <div style="margin: 20px 0; padding: 16px; border: 2px dashed ${color}; border-radius: 12px; text-align: center; background: ${color}10;">
        <p style="color: ${COLORS.textMuted}; font-size: 11px; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 6px;">Ton code promo</p>
        <p style="color: ${color}; font-size: 28px; font-weight: 700; letter-spacing: 3px; margin: 0;">${promo.code}</p>
        <p style="color: ${COLORS.text}; font-size: 13px; margin: 8px 0 0;">-${promo.amount}EUR deduits sur ton coaching</p>
      </div>
      <p style="color: ${COLORS.textMuted}; font-size: 12px; text-align: center; margin: 0 0 16px;">
        Colle ce code au checkout sur achzodcoaching.com pour deduire ${promo.amount}EUR de ta formule.
      </p>
  ` : discoveryPromo ? `
      <div style="margin: 20px 0; padding: 16px; border: 2px dashed ${color}; border-radius: 12px; text-align: center; background: ${color}10;">
        <p style="color: ${COLORS.textMuted}; font-size: 11px; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 6px;">Ton code Discovery</p>
        <p style="color: ${color}; font-size: 28px; font-weight: 700; letter-spacing: 3px; margin: 0;">${discoveryPromo.code}</p>
        <p style="color: ${COLORS.text}; font-size: 13px; margin: 8px 0 0;">-${discoveryPromo.percent}% sur toutes les formules (formules 8 et 12 sem uniquement)</p>
      </div>
      <p style="color: ${COLORS.textMuted}; font-size: 12px; text-align: center; margin: 0 0 16px;">
        Colle ce code au checkout sur achzodcoaching.com pour appliquer la reduction.
      </p>
  ` : "";

  const deductionArg = discoveryPromo
    ? { percent: discoveryPromo.percent }
    : { amount: deductionAmount };

  return `
    <div style="padding: 28px; background: linear-gradient(135deg, ${color}15 0%, ${color}08 100%); border-radius: 12px; border: 1px solid ${color}30;">
      <div style="text-align: center; margin-bottom: 20px;">
        <span style="display: inline-block; background: ${color}; color: #fff; padding: 6px 16px; border-radius: 20px; font-size: 11px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase;">
          Passe a l'action
        </span>
      </div>
      <h3 style="color: ${color}; font-size: 22px; font-weight: 700; margin: 0 0 12px; text-align: center; letter-spacing: -0.5px;">
        Execution structuree
      </h3>
      <p style="color: ${COLORS.textMuted}; font-size: 14px; line-height: 1.7; margin: 0 0 20px; text-align: center;">
        Ce rapport trace la trajectoire. L'accompagnement Achzod accelere l'execution et les ajustements.
      </p>

      ${promoSection}

      ${renderCoachingOffersTable(deductionArg, color)}

      ${getPrimaryButton('Decouvrir les formules', coachingLink, color)}
    </div>
  `;
}

export async function sendReportReadyEmail(
  email: string,
  auditId: string,
  auditType: string,
  baseUrl: string
): Promise<boolean> {
  try {
    const token = await getAccessToken();
    const reportPath =
      auditType === "GRATUIT"
        ? `/scan/${auditId}`
        : auditType === "PREMIUM"
        ? `/anabolic/${auditId}`
        : auditType === "ELITE"
        ? `/ultimate/${auditId}`
        : auditType === "BLOOD_ANALYSIS"
        ? `/analysis/${auditId}`
        : `/ultimate/${auditId}`;
    const reportLink = `${baseUrl}${reportPath}`;
    const reviewLink = `${reportLink}#review`;
    const planLabel =
      auditType === "GRATUIT"
        ? "Discovery Scan"
        : auditType === "PREMIUM"
        ? "Anabolic Bioscan"
        : auditType === "ELITE"
        ? "Ultimate Scan"
        : auditType === "BLOOD_ANALYSIS"
        ? "Blood Analysis"
        : "Ultimate Scan";
    const planColor =
      auditType === "BLOOD_ANALYSIS"
        ? COLORS.blood
        : auditType === "ELITE"
        ? COLORS.purple
        : auditType === "PREMIUM"
        ? COLORS.anabolic
        : auditType === "GRATUIT"
        ? COLORS.discovery
        : COLORS.primary;

    // Dynamic titles based on audit type
    const headerTitle = planLabel;
    const headerSubtitle =
      auditType === "GRATUIT"
        ? "5 Piliers Santé"
        : auditType === "PREMIUM"
        ? "16 Domaines d'Analyse"
        : auditType === "ELITE"
        ? "18 Domaines d'Analyse"
        : auditType === "BLOOD_ANALYSIS"
        ? "Lecture de biomarqueurs"
        : "18 Domaines d'Analyse";
    const domainsCount =
      auditType === "GRATUIT"
        ? "5 piliers de santé"
        : auditType === "PREMIUM"
        ? "16 domaines de santé"
        : auditType === "ELITE"
        ? "18 domaines de santé"
        : auditType === "BLOOD_ANALYSIS"
        ? "biomarqueurs clés"
        : "18 domaines de santé";

    // Generate a tracking ID for the open pixel
    const { randomUUID } = await import("crypto");
    const pixelTrackingId = randomUUID();
    const trackingPixel = `${baseUrl}/api/track/email/${pixelTrackingId}/open.gif`;

    const content = `
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 24px 0;">
        <tr>
          <td align="center">
            <span style="display:inline-block;background-color:${planColor};color:#000000;padding:7px 18px;border-radius:999px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;">${planLabel}</span>
          </td>
        </tr>
      </table>

      <h2 style="color:${COLORS.text};margin:0 0 18px 0;font-size:28px;line-height:1.2;text-align:center;font-weight:700;letter-spacing:-0.8px;">Ton rapport est prêt</h2>

      <p style="color:${COLORS.textMuted};font-size:16px;line-height:1.65;margin:0 0 10px 0;text-align:center;">J'ai terminé l'analyse complète de ton profil à travers les <strong style="color:${COLORS.text};">${domainsCount}</strong>.</p>
      <p style="color:${COLORS.textMuted};font-size:16px;line-height:1.65;margin:0 0 8px 0;text-align:center;">Tu vas y trouver tes scores par domaine, tes axes à corriger en priorité, et les recommandations que j'aurais faites en face à face.</p>

      ${getPrimaryButton('Consulter le rapport', reportLink, planColor)}

      ${getReviewSection(reviewLink)}

      ${getCoachingSection(auditType, planColor)}

      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top:28px;">
        <tr>
          <td style="padding:18px 20px;background-color:${COLORS.background};border-radius:8px;border:1px solid ${COLORS.border};text-align:center;">
            <p style="color:${COLORS.textMuted};font-size:12px;margin:0 0 6px 0;">Si le bouton ne fonctionne pas, copie ce lien :</p>
            <p style="margin:0;"><a href="${reportLink}" style="color:${planColor};font-size:11px;word-break:break-all;text-decoration:underline;">${reportLink}</a></p>
          </td>
        </tr>
      </table>
      <img src="${trackingPixel}" width="1" height="1" alt="" style="display:block;border:0;outline:none;" />
    `;

    const emailContent = getEmailWrapper(content, `linear-gradient(135deg, ${planColor} 0%, ${planColor}dd 100%)`, headerTitle, headerSubtitle);

    // Subject tuned for deliverability + open rate. Previous "Ton X est pret"
    // was generic, robotic, flagged by spam filters as templated. Now: concrete
    // preview hook + audit name late enough to avoid subject-line-cutoff on mobile.
    const subject =
      auditType === "GRATUIT"
        ? "Ton rapport est la, on regarde ce qui bloque ?"
        : auditType === "BLOOD_ANALYSIS"
        ? "Tes marqueurs sanguins sont analyses, resultats dedans"
        : auditType === "ELITE"
        ? "Rapport Ultimate Scan : tes 18 axes + protocole complet"
        : auditType === "PREMIUM"
        ? "Rapport Anabolic Bioscan : tes 16 axes + plan d'action"
        : `Ton ${planLabel} est pret`;

    const result = await sendEmailWithTracking(
      {
        html: encodeBase64(emailContent),
        text: `Ton ${planLabel} ApexLabs est pret. Consulte ton rapport ici : ${reportLink}`,
        subject,
        from: {
          name: "Achzod",
          email: SENDER_EMAIL,
        },
        to: [{ email }],
      },
      {
        emailType: "sendReportReadyEmail",
        recipientEmail: email,
        auditId,
        auditType,
        metadata: { reportLink, planLabel, trackingId: pixelTrackingId },
      }
    );

    if (result.result === true) return true;
    console.warn("[SendPulse] Report email not confirmed sent:", result);
    return false;
  } catch (error) {
    console.error("[SendPulse] Error sending report email:", error);
    return false;
  }
}

const stripBloodForbiddenFormatting = (value: string): string =>
  String(value || "")
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[\u{1F1E6}-\u{1F1FF}]/gu, "")
    .replace(/[\u{1F300}-\u{1FAFF}]/gu, "")
    .replace(/[\u{2600}-\u{27BF}]/gu, "")
    .replace(/[\uFE0E\uFE0F]/g, "");

const escapeHtml = (value: string): string =>
  stripBloodForbiddenFormatting(String(value || ""))
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

type MarkdownSection = {
  title: string;
  lines: string[];
};

const BLOOD_REPORT_THEME = {
  paper: "#f7efe2",
  paperSoft: "#fbf6ee",
  card: "#f4ebdc",
  cardStrong: "#efe3d1",
  ink: "#2e241c",
  muted: "#6f6254",
  border: "#dfd0bc",
  accent: "#c06f2e",
  accentSoft: "#f2e2cc",
  shadow: "rgba(69, 49, 30, 0.08)",
};

const slugifyTabId = (value: string, index: number): string => {
  const slug = String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug ? `tab-${slug}` : `tab-${index + 1}`;
};

const parseMarkdownSections = (markdown: string): MarkdownSection[] => {
  const lines = String(markdown || "").split(/\r?\n/);
  const sections: MarkdownSection[] = [];
  let current: MarkdownSection | null = null;

  for (const rawLine of lines) {
    const heading = rawLine.match(/^\s*##\s+(.+?)\s*$/);
    if (heading) {
      if (current) sections.push(current);
      current = { title: heading[1].trim(), lines: [] };
      continue;
    }
    if (current) current.lines.push(rawLine);
  }

  if (current) sections.push(current);

  if (!sections.length && String(markdown || "").trim()) {
    return [{ title: "Rapport complet", lines }];
  }

  return sections;
};

const renderSectionLinesToHtml = (lines: string[], textColor: string, mutedColor: string): string => {
  const renderInlineMarkdown = (value: string): string => {
    const escaped = escapeHtml(value);
    return escaped
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      .replace(/\[SRC:([^\]]+)\]/g, '<span style="font-weight:700;color:#7a4a21;">[SRC:$1]</span>');
  };

  const html: string[] = [];
  let paragraph: string[] = [];

  const flushParagraph = () => {
    if (!paragraph.length) return;
    const text = paragraph.join(" ").trim();
    if (!text) {
      paragraph = [];
      return;
    }
    html.push(
      `<p style="margin: 0 0 14px; color: ${mutedColor}; font-size: 15px; line-height: 1.82;">${renderInlineMarkdown(
        text
      )}</p>`
    );
    paragraph = [];
  };

  for (const rawLine of lines) {
    const line = String(rawLine || "").trim();
    if (!line) {
      flushParagraph();
      continue;
    }

    if (line.startsWith("### ")) {
      flushParagraph();
      html.push(
        `<h3 style="margin: 20px 0 10px; color: ${textColor}; font-size: 19px; line-height: 1.4; letter-spacing: -0.01em;">${renderInlineMarkdown(
          line.slice(4)
        )}</h3>`
      );
      continue;
    }

    paragraph.push(line);
  }

  flushParagraph();
  return html.join("\n");
};

export type BloodReportMarkerSnapshot = {
  markerId?: string;
  name: string;
  value: number;
  unit?: string;
  status?: string;
  normalRange?: string;
  optimalRange?: string;
};

type BiomarkerScoreRow = {
  name: string;
  score: number;
  statusLabel: string;
  bandClass: "is-critical" | "is-suboptimal" | "is-watch" | "is-solid";
  meaning: string;
  valueLabel?: string;
  rangeLabel?: string;
};

type MarkerReferenceRow = {
  name: string;
  markerId?: string;
  statusLabel: string;
  bandClass: "is-critical" | "is-suboptimal" | "is-watch" | "is-solid";
  valueLabel?: string;
  rangeLabel?: string;
  definition: string;
  positiveImpact: string;
  negativeImpact: string;
};

const clampNumber = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

const normalizeLoose = (value: string): string =>
  String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const summarizeBand = (
  score: number,
): Pick<BiomarkerScoreRow, "statusLabel" | "bandClass" | "meaning"> => {
  if (score <= 35) {
    return {
      statusLabel: "Critique",
      bandClass: "is-critical",
      meaning:
        "Ce score représente un écart majeur avec la zone optimale. Je traite ce marqueur en priorité absolue pour limiter le risque et relancer ta progression.",
    };
  }
  if (score <= 60) {
    return {
      statusLabel: "Suboptimal",
      bandClass: "is-suboptimal",
      meaning:
        "Ce score représente une dérive importante. Je cible ce marqueur dans les premières semaines pour corriger le frein biologique principal.",
    };
  }
  if (score <= 80) {
    return {
      statusLabel: "À surveiller",
      bandClass: "is-watch",
      meaning:
        "Ce score représente une zone intermédiaire. Le marqueur reste exploitable, mais je surveille son évolution pour éviter une rechute métabolique.",
    };
  }
  return {
    statusLabel: "Solide",
    bandClass: "is-solid",
    meaning:
      "Ce score représente un bon niveau de stabilité. Je conserve ce marqueur comme point d'appui pendant qu'on corrige les priorités plus dégradées.",
  };
};

const parseRange = (value?: string): { min: number; max: number } | null => {
  if (!value) return null;
  const text = String(value).replace(/\u2212/g, "-").trim();

  // Prefer explicit range parsing (avoids treating separator "-" as negative sign).
  const explicit = text.match(
    /(-?\d+(?:[.,]\d+)?)\s*(?:-|\u2013|,|to|a|à)\s*(-?\d+(?:[.,]\d+)?)/i,
  );
  let min: number;
  let max: number;
  if (explicit) {
    min = Number(String(explicit[1]).replace(",", "."));
    max = Number(String(explicit[2]).replace(",", "."));
  } else {
    const nums = text.match(/\d+(?:[.,]\d+)?/g);
    if (!nums || nums.length < 2) return null;
    min = Number(nums[0].replace(",", "."));
    max = Number(nums[1].replace(",", "."));
  }

  if (!Number.isFinite(min) || !Number.isFinite(max) || min === max) return null;
  return min < max ? { min, max } : { min: max, max: min };
};

const formatRangeNumber = (value: number): string => {
  if (!Number.isFinite(value)) return "";
  const rounded = Math.round(value * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : String(rounded).replace(/\.0+$/, "");
};

const formatRangeForDisplay = (value?: string): string | undefined => {
  if (!value) return undefined;
  const parsed = parseRange(value);
  if (!parsed) return String(value);
  if (parsed.max >= 900) {
    return `${formatRangeNumber(parsed.min)}+`;
  }
  return `${formatRangeNumber(parsed.min)} - ${formatRangeNumber(parsed.max)}`;
};

const scoreFromSnapshot = (marker: BloodReportMarkerSnapshot): number => {
  const value = Number(marker.value);
  if (!Number.isFinite(value)) {
    const fallbackByStatus = String(marker.status || "").toLowerCase();
    if (fallbackByStatus === "critical") return 22;
    if (fallbackByStatus === "suboptimal") return 52;
    if (fallbackByStatus === "normal") return 76;
    if (fallbackByStatus === "optimal") return 94;
    return 70;
  }

  const normal = parseRange(marker.normalRange);
  const optimal = parseRange(marker.optimalRange);
  const status = String(marker.status || "").toLowerCase();

  if (!normal || !optimal) {
    if (status === "critical") return 24;
    if (status === "suboptimal") return 54;
    if (status === "normal") return 78;
    if (status === "optimal") return 94;
    return 72;
  }

  const normalSpan = Math.max(1e-6, normal.max - normal.min);
  const optimalSpan = Math.max(1e-6, optimal.max - optimal.min);
  const optimalCenter = (optimal.min + optimal.max) / 2;
  let score = 70;

  if (value >= optimal.min && value <= optimal.max) {
    const half = Math.max(1e-6, optimalSpan / 2);
    const ratioFromCenter = Math.min(1, Math.abs(value - optimalCenter) / half);
    score = 100 - Math.round(ratioFromCenter * 10);
  } else if (value >= normal.min && value <= normal.max) {
    if (value < optimal.min) {
      // Penalty below optimal is proportional to deficit vs optimal low.
      // Example: 11 vs optimal low 15 => 26.7% deficit -> ~53/100.
      const deficitRatio = clampNumber((optimal.min - value) / Math.max(1e-6, Math.abs(optimal.min)), 0, 1.2);
      score = Math.round(90 - deficitRatio * 138);
    } else {
      // Above optimal: penalize proportionally vs optimal high.
      const excessRatio = clampNumber((value - optimal.max) / Math.max(1e-6, Math.abs(optimal.max)), 0, 1.2);
      score = Math.round(90 - excessRatio * 130);
    }
  } else {
    const outsideGap = value < normal.min ? normal.min - value : value - normal.max;
    const ratio = outsideGap / normalSpan;
    score = Math.round(58 - clampNumber(ratio, 0, 1.5) * 35);
  }

  if (status === "critical") {
    score = clampNumber(score, 6, 35);
  } else if (status === "suboptimal") {
    // Keep suboptimal markers visible without collapsing to near-zero scores.
    score = clampNumber(score, 25, 69);
  } else if (status === "normal") {
    score = clampNumber(score, 62, 89);
  } else if (status === "optimal") {
    score = clampNumber(score, 80, 100);
  }

  return clampNumber(score, 6, 100);
};

const FRENCH_ACCENT_FIXES: Array<[RegExp, string]> = [
  [/\bcapacite\b/gi, "capacité"],
  [/\bcapacites\b/gi, "capacités"],
  [/\bflexibilite\b/gi, "flexibilité"],
  [/\bmobilite\b/gi, "mobilité"],
  [/\bmetabolique\b/gi, "métabolique"],
  [/\bmetaboliques\b/gi, "métaboliques"],
  [/\bmetabolisme\b/gi, "métabolisme"],
  [/\brecuperation\b/gi, "récupération"],
  [/\brecuperer\b/gi, "récupérer"],
  [/\bdegradee\b/gi, "dégradée"],
  [/\bdegrades\b/gi, "dégradés"],
  [/\bdegradees\b/gi, "dégradées"],
  [/\bse degrade\b/gi, "se dégrade"],
  [/\bse degradent\b/gi, "se dégradent"],
  [/\benergetique\b/gi, "énergétique"],
  [/\benergetiques\b/gi, "énergétiques"],
  [/\benergie\b/gi, "énergie"],
  [/\bhepatique\b/gi, "hépatique"],
  [/\bhepatiques\b/gi, "hépatiques"],
  [/\boxydatif\b/gi, "oxydatif"],
  [/\bcholesterol\b/gi, "cholestérol"],
  [/\bthyroide\b/gi, "thyroïde"],
  [/\bdefinition\b/gi, "définition"],
  [/\bdechet\b/gi, "déchet"],
  [/\banabolisme\b/gi, "anabolisme"],
  [/\bsynthese\b/gi, "synthèse"],
  [/\bproteique\b/gi, "protéique"],
  [/\bsensibilite\b/gi, "sensibilité"],
  [/\btestosterone\b/gi, "testostérone"],
  [/\bandrogene\b/gi, "androgène"],
  [/\bimmunite\b/gi, "immunité"],
  [/\bcle\b/gi, "clé"],
  [/\brenal\b/gi, "rénal"],
  [/\brenale\b/gi, "rénale"],
  [/\brenales\b/gi, "rénales"],
  [/\breserves\b/gi, "réserves"],
  [/\bregulee\b/gi, "régulée"],
  [/\bregule\b/gi, "régule"],
  [/\bderive\b/gi, "dérive"],
  [/\bsante\b/gi, "santé"],
  [/\bpriorite\b/gi, "priorité"],
  [/\breduire\b/gi, "réduire"],
  [/\bverifier\b/gi, "vérifier"],
  [/\bdebit\b/gi, "débit"],
  [/\bregulation\b/gi, "régulation"],
  [/\btolerance\b/gi, "tolérance"],
  [/\bcalibree\b/gi, "calibrée"],
  [/\bfavorisees\b/gi, "favorisées"],
  [/\bpenalisees\b/gi, "pénalisées"],
  [/\bsystemic\b/gi, "systémique"],
  [/\betre\b/gi, "être"],
  [/\bpresente\b/gi, "présente"],
  [/\bcreatinine\b/gi, "créatinine"],
  [/\bdechets\b/gi, "déchets"],
  [/\ba court terme\b/gi, "à court terme"],
  [/\bsensible a\b/gi, "sensible à"],
  [/\bsensibilite a\b/gi, "sensibilité à"],
  [/\bdisponibles a\b/gi, "disponibles à"],
  [/\butile au suivi\b/gi, "utile au suivi"],
  [/\beleve\b/gi, "élevé"],
  [/\belevee\b/gi, "élevée"],
  [/\beleves\b/gi, "élevés"],
  [/\boxygenation\b/gi, "oxygénation"],
  [/\bmaitrisee\b/gi, "maîtrisée"],
  [/\bmaitrise\b/gi, "maîtrise"],
  [/\bsecuriser\b/gi, "sécuriser"],
  [/\bcontrolee\b/gi, "contrôlée"],
  [/\bcontrole\b/gi, "contrôle"],
  [/\bsecurite\b/gi, "sécurité"],
  [/\bentrainement\b/gi, "entraînement"],
  [/\bgeneration\b/gi, "génération"],
];

const applyFrenchAccentFixes = (value: string): string => {
  let next = String(value || "");
  for (const [pattern, replacement] of FRENCH_ACCENT_FIXES) {
    next = next.replace(pattern, replacement);
  }
  return next;
};

const inferScoreFromBlock = (body: string): number => {
  const text = String(body || "");
  const lower = text.toLowerCase();
  let score = 72;

  if (/\bcritique\b/.test(lower)) {
    score = 26;
  } else if (/\bsuboptimal\b|sous[- ]optimal|en retrait|depasse|d[eé]grad[eé]/.test(lower)) {
    score = 56;
  } else if (/\boptimal\b|zone optimale|stabilise/.test(lower)) {
    score = 90;
  } else if (/\bnormal\b|dans le range/.test(lower)) {
    score = 78;
  }

  const deviation = text.match(/(\d{1,3})\s*%/);
  if (deviation) {
    const pct = Number(deviation[1]);
    if (Number.isFinite(pct)) {
      score -= Math.min(35, Math.round(pct * 0.35));
    }
  }

  return clampNumber(Math.round(score), 8, 98);
};

const deriveBiomarkerScoresFromSnapshots = (
  snapshots: BloodReportMarkerSnapshot[],
): BiomarkerScoreRow[] => {
  const rows = snapshots
    .filter((marker) => marker && marker.name && Number.isFinite(Number(marker.value)))
    .map((marker) => {
      const score = scoreFromSnapshot(marker);
      const band = summarizeBand(score);
      const unit = marker.unit ? ` ${marker.unit}` : "";
      return {
        name: marker.name,
        score,
        statusLabel: band.statusLabel,
        bandClass: band.bandClass,
        meaning: band.meaning,
        valueLabel: `${Number(marker.value)}${unit}`,
        rangeLabel: marker.optimalRange
          ? `Zone optimale ${formatRangeForDisplay(marker.optimalRange)}${unit}`
          : marker.normalRange
          ? `Zone normale ${formatRangeForDisplay(marker.normalRange)}${unit}`
          : undefined,
      } as BiomarkerScoreRow;
    });

  const dedup = new Map<string, BiomarkerScoreRow>();
  for (const row of rows) {
    const key = normalizeLoose(row.name);
    if (!key) continue;
    const existing = dedup.get(key);
    if (!existing || row.score < existing.score) {
      dedup.set(key, row);
    }
  }
  return Array.from(dedup.values()).sort((a, b) => a.score - b.score);
};

const deriveBiomarkerScoresFromMarkdown = (reportMarkdown: string): BiomarkerScoreRow[] => {
  const sections = parseMarkdownSections(reportMarkdown);
  const deepDiveSection = sections.find((section) => /deep\s*dive/i.test(section.title));
  const sourceText = deepDiveSection ? deepDiveSection.lines.join("\n") : String(reportMarkdown || "");
  const regex = /(?:^|\n)###\s+([^\n]+)\n([\s\S]*?)(?=\n###\s+|\n##\s+|$)/g;

  const rows: BiomarkerScoreRow[] = [];
  const seen = new Set<string>();
  let match: RegExpExecArray | null;

  while ((match = regex.exec(sourceText)) !== null) {
    const name = String(match[1] || "").trim();
    const body = String(match[2] || "").trim();
    if (!name || !body) continue;

    const norm = normalizeLoose(name);
    if (!norm || norm.length < 2) continue;
    if (/^(jours?|phase|annexe|retest|sources?|vigilance)/.test(norm)) continue;
    if (seen.has(norm)) continue;
    seen.add(norm);

    const score = inferScoreFromBlock(body);
    const band = summarizeBand(score);
    rows.push({
      name,
      score,
      statusLabel: band.statusLabel,
      bandClass: band.bandClass,
      meaning: band.meaning,
    });
  }

  return rows.sort((a, b) => a.score - b.score).slice(0, 24);
};

const statusRank = (status?: string): number => {
  const normalized = normalizeLoose(status || "");
  if (normalized === "critical") return 0;
  if (normalized === "suboptimal") return 1;
  if (normalized === "normal") return 2;
  if (normalized === "optimal") return 3;
  return 4;
};

const statusTone = (
  status?: string,
): { statusLabel: string; bandClass: "is-critical" | "is-suboptimal" | "is-watch" | "is-solid" } => {
  const normalized = normalizeLoose(status || "");
  if (normalized === "critical") return { statusLabel: "Critique", bandClass: "is-critical" };
  if (normalized === "suboptimal") return { statusLabel: "Suboptimal", bandClass: "is-suboptimal" };
  if (normalized === "normal") return { statusLabel: "A surveiller", bandClass: "is-watch" };
  if (normalized === "optimal") return { statusLabel: "Solide", bandClass: "is-solid" };
  return { statusLabel: "A surveiller", bandClass: "is-watch" };
};

type MarkerInsightTemplate = {
  definition: string;
  positiveImpact: string;
  negativeImpact: string;
};

const MARKER_INSIGHT_LIBRARY: Record<string, MarkerInsightTemplate> = {
  hdl: {
    definition: "Le HDL mesure la capacite de transport inverse du cholesterol vers le foie.",
    positiveImpact: "Quand ton HDL reste solide, la protection cardiovasculaire et la recuperation metabolique sont meilleures.",
    negativeImpact: "Quand ton HDL chute, le risque cardio-metabolique monte et la flexibilite energetique diminue.",
  },
  ldl: {
    definition: "Le LDL mesure la charge de cholesterol transportee vers les tissus.",
    positiveImpact: "Quand le LDL est bien controle, la contrainte arterielle est reduite et le risque vasculaire baisse.",
    negativeImpact: "Quand le LDL est trop eleve, la pression atherogene augmente et la priorite cardiovasculaire devient immediate.",
  },
  triglycerides: {
    definition: "Les triglycerides mesurent les graisses circulantes disponibles a court terme.",
    positiveImpact: "Quand ils sont stables, la sensibilite a l'insuline et la mobilite metabolique sont meilleures.",
    negativeImpact: "Quand ils montent, le terrain insulinique se degrade et la perte de gras devient plus difficile.",
  },
  apob: {
    definition: "L'ApoB estime le nombre de particules lipidiques atherogenes.",
    positiveImpact: "Quand l'ApoB est bas, la charge particulaire vasculaire est mieux controlee.",
    negativeImpact: "Quand l'ApoB augmente, le risque cardiovasculaire structurel est plus eleve.",
  },
  apoa1: {
    definition: "L'Apo A1 mesure la principale protéine des particules HDL.",
    positiveImpact: "Quand l'Apo A1 est solide, la protection cardiovasculaire et l'évacuation des lipides sont meilleures.",
    negativeImpact: "Quand l'Apo A1 est basse, le transport inverse du cholestérol ralentit et le risque cardio-métabolique augmente.",
  },
  testosterone_libre: {
    definition: "La testosterone libre mesure la fraction androgene biologiquement active.",
    positiveImpact: "Quand elle est solide, la synthese proteique, la force et la recuperation sont favorisees.",
    negativeImpact: "Quand elle est basse, l'anabolisme ralentit, la fatigue augmente et la progression musculaire freine.",
  },
  testosterone_totale: {
    definition: "La testosterone totale mesure le stock androgenique circulant.",
    positiveImpact: "Quand elle est robuste, le potentiel de progression physique reste eleve.",
    negativeImpact: "Quand elle baisse, la marge anabolique et la tolerance d'entrainement diminuent.",
  },
  tsh: {
    definition: "La TSH mesure le signal hypophysaire qui pilote la thyroide.",
    positiveImpact: "Quand la TSH reste dans la cible, le pilotage metabolique est plus stable.",
    negativeImpact: "Quand elle derive, le debit energetique et la regulation du poids peuvent se degrader.",
  },
  t3_libre: {
    definition: "La T3 libre mesure l'hormone thyroidienne active.",
    positiveImpact: "Quand elle est solide, l'energie disponible, la thermogenese et la vitalite sont mieux soutenues.",
    negativeImpact: "Quand elle est basse, la depense energetique peut ralentir et la fatigue s'installer.",
  },
  t4_libre: {
    definition: "La T4 libre mesure la réserve hormonale thyroïdienne disponible pour conversion en T3.",
    positiveImpact: "Quand la T4 libre reste bien positionnée, le métabolisme énergétique garde une base stable.",
    negativeImpact: "Quand la T4 libre baisse, la conversion hormonale peut limiter énergie, récupération et perte de gras.",
  },
  insuline_jeun: {
    definition: "L'insuline a jeun mesure la pression insulinique de base.",
    positiveImpact: "Quand elle est bien regulee, la partition des nutriments et la perte de gras sont facilitees.",
    negativeImpact: "Quand elle monte, le stockage graisseux augmente et la flexibilite metabolique recule.",
  },
  homa_ir: {
    definition: "Le HOMA-IR estime la resistance a l'insuline.",
    positiveImpact: "Quand il est bas, le metabolisme glucidique est plus efficace.",
    negativeImpact: "Quand il monte, le risque metabolique et la difficulte de recomposition augmentent.",
  },
  glycemie_jeun: {
    definition: "La glycemie a jeun mesure le glucose circulant au repos.",
    positiveImpact: "Quand elle est stable, l'equilibre energetique et la clarte cognitive sont plus robustes.",
    negativeImpact: "Quand elle est elevee, la regulation insulinique est sous contrainte.",
  },
  crp_us: {
    definition: "La CRP-us mesure l'inflammation de bas grade.",
    positiveImpact: "Quand elle est basse, la recuperation tissulaire et la sante cardiovasculaire sont favorisees.",
    negativeImpact: "Quand elle monte, la recuperation se degrade et le risque systemic augmente.",
  },
  ferritine: {
    definition: "La ferritine mesure les reserves de fer.",
    positiveImpact: "Quand elle est bien calibree, l'oxygenation et la capacite de travail sont mieux soutenues.",
    negativeImpact: "Quand elle est trop basse ou trop haute, la performance et la recuperation peuvent etre penalisees.",
  },
  transferrine_saturation: {
    definition: "La saturation de la transferrine mesure le pourcentage de transport du fer disponible.",
    positiveImpact: "Quand elle est équilibrée, l'oxygénation et la performance aérobie sont mieux soutenues.",
    negativeImpact: "Quand elle dérive, le transport du fer peut limiter récupération et capacité d'effort.",
  },
  b12: {
    definition: "La vitamine B12 mesure un cofacteur clé pour le système nerveux, la méthylation et les globules rouges.",
    positiveImpact: "Quand la B12 est solide, l'énergie cellulaire, la concentration et l'oxygénation sont mieux soutenues.",
    negativeImpact: "Quand la B12 baisse, la fatigue, les troubles neurocognitifs et la baisse de performance peuvent augmenter.",
  },
  vitamine_d: {
    definition: "La vitamine D mesure une hormone cle pour l'immunite, les hormones et le muscle.",
    positiveImpact: "Quand elle est optimale, la fonction immunitaire et neuromusculaire est plus robuste.",
    negativeImpact: "Quand elle chute, le terrain inflammatoire et hormonal peut se fragiliser.",
  },
  alt: {
    definition: "L'ALT mesure une enzyme hepatique sensible a la charge cellulaire du foie.",
    positiveImpact: "Quand l'ALT est maitrisee, la tolerance hepatique aux protocoles est meilleure.",
    negativeImpact: "Quand l'ALT monte, la priorite est de reduire la charge hepatique et de securiser les actions.",
  },
  ast: {
    definition: "L'AST mesure une enzyme presente dans le foie et les muscles.",
    positiveImpact: "Quand elle est stable, la charge tissulaire reste compatible avec la progression.",
    negativeImpact: "Quand elle monte, il faut distinguer stress musculaire et contrainte hepatique.",
  },
  ggt: {
    definition: "La GGT mesure une enzyme hépato-biliaire sensible au stress oxydatif et à la charge hépatique.",
    positiveImpact: "Quand la GGT reste maîtrisée, la tolérance métabolique et hépatique est plus solide.",
    negativeImpact: "Quand la GGT monte, le stress hépatique augmente et peut freiner la progression.",
  },
  estradiol: {
    definition: "L'estradiol mesure un œstrogène clé de l'équilibre hormonal et vasculaire.",
    positiveImpact: "Quand il est bien calibré, récupération, santé osseuse et équilibre hormonal sont favorisés.",
    negativeImpact: "Quand il dérive, la qualité de récupération et l'équilibre endocrinien peuvent se dégrader.",
  },
  prolactine: {
    definition: "La prolactine mesure une hormone hypophysaire qui module l'axe gonadique.",
    positiveImpact: "Quand elle est stable, l'équilibre hormonal et la récupération nerveuse restent robustes.",
    negativeImpact: "Quand elle est élevée, libido, récupération et signal androgénique peuvent être freinés.",
  },
  creatinine: {
    definition: "La creatinine mesure un dechet metabolique utile au suivi renal.",
    positiveImpact: "Quand elle est stable, la fonction de filtration est globalement rassurante.",
    negativeImpact: "Quand elle derive, la priorite est de verifier hydratation, charge musculaire et fonction renale.",
  },
  egfr: {
    definition: "L'eGFR estime la capacite de filtration des reins.",
    positiveImpact: "Quand il est bon, la securite de filtration et la gestion des dechets metaboliques sont plus solides.",
    negativeImpact: "Quand il baisse, le suivi renal devient prioritaire.",
  },
};

const genericMarkerInsight = (name: string): MarkerInsightTemplate => ({
  definition: `${name} mesure un indicateur biologique de ton état métabolique actuel.`,
  positiveImpact: `Quand ${name} reste dans sa cible, la stabilité physiologique et la progression sont plus prévisibles.`,
  negativeImpact: `Quand ${name} sort de la cible, la fatigue, le risque et les blocages de progression augmentent.`,
});

const MARKER_INSIGHT_ALIASES: Record<string, string> = {
  apo_a1: "apoa1",
  apolipoproteines_a1: "apoa1",
  apolipoproteine_a1: "apoa1",
  transferrine_sat: "transferrine_saturation",
  transferrine_sat_: "transferrine_saturation",
  saturation_transferrine: "transferrine_saturation",
  t4l: "t4_libre",
  t4_libre: "t4_libre",
  estradiol_e2: "estradiol",
  e2: "estradiol",
  vitamine_b12: "b12",
};

const normalizeInsightKey = (value: string): string =>
  normalizeLoose(value || "")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");

const resolveMarkerInsight = (marker: BloodReportMarkerSnapshot): MarkerInsightTemplate => {
  const candidateKeys = [normalizeInsightKey(marker.markerId || ""), normalizeInsightKey(marker.name || "")].filter(Boolean);
  for (const key of candidateKeys) {
    if (MARKER_INSIGHT_LIBRARY[key]) return MARKER_INSIGHT_LIBRARY[key];
    const alias = MARKER_INSIGHT_ALIASES[key];
    if (alias && MARKER_INSIGHT_LIBRARY[alias]) return MARKER_INSIGHT_LIBRARY[alias];
    if (key.includes("apo") && key.includes("a1")) return MARKER_INSIGHT_LIBRARY.apoa1;
    if (key.includes("transferrine") && key.includes("sat")) return MARKER_INSIGHT_LIBRARY.transferrine_saturation;
    if (key.includes("t4") && key.includes("libre")) return MARKER_INSIGHT_LIBRARY.t4_libre;
  }
  return genericMarkerInsight(marker.name || "Ce marqueur");
};

const deriveMarkerReferenceRows = (snapshots?: BloodReportMarkerSnapshot[]): MarkerReferenceRow[] => {
  if (!Array.isArray(snapshots) || !snapshots.length) return [];
  const dedup = new Map<string, BloodReportMarkerSnapshot>();
  for (const marker of snapshots) {
    if (!marker?.name) continue;
    const idKey = normalizeLoose(marker.markerId || "");
    const nameKey = normalizeLoose(marker.name || "");
    const key = idKey || nameKey;
    if (!key) continue;
    const existing = dedup.get(key);
    if (!existing || statusRank(marker.status) < statusRank(existing.status)) dedup.set(key, marker);
  }

  return Array.from(dedup.values())
    .map((marker) => {
      const insight = resolveMarkerInsight(marker);
      const tone = statusTone(marker.status);
      const unit = marker.unit ? ` ${marker.unit}` : "";
      return {
        name: marker.name,
        markerId: marker.markerId,
        statusLabel: tone.statusLabel,
        bandClass: tone.bandClass,
        valueLabel: Number.isFinite(Number(marker.value)) ? `${Number(marker.value)}${unit}` : undefined,
        rangeLabel: marker.optimalRange
          ? `Zone optimale ${formatRangeForDisplay(marker.optimalRange)}${unit}`
          : marker.normalRange
          ? `Zone normale ${formatRangeForDisplay(marker.normalRange)}${unit}`
          : undefined,
        definition: applyFrenchAccentFixes(insight.definition),
        positiveImpact: applyFrenchAccentFixes(insight.positiveImpact),
        negativeImpact: applyFrenchAccentFixes(insight.negativeImpact),
      } satisfies MarkerReferenceRow;
    })
    .sort((a, b) => {
      const rankByBand: Record<MarkerReferenceRow["bandClass"], number> = {
        "is-critical": 0,
        "is-suboptimal": 1,
        "is-watch": 2,
        "is-solid": 3,
      };
      const rankDiff = rankByBand[a.bandClass] - rankByBand[b.bandClass];
      if (rankDiff !== 0) return rankDiff;
      return a.name.localeCompare(b.name, "fr");
    });
};

const renderExtractedMarkersPanel = (snapshots?: BloodReportMarkerSnapshot[]): string => {
  const rows = deriveMarkerReferenceRows(snapshots);
  if (!rows.length) {
    return `<p class="score-intro">Aucun marqueur extrait n'est disponible dans cette version du rapport. Relance la génération avec le lot de biomarqueurs pour remplir cet onglet.</p>`;
  }

  const cards = rows
    .map((row) => {
      const markerIdLabel = row.markerId ? `<p class="score-meta">Code: ${escapeHtml(row.markerId)}</p>` : "";
      const valueLabel = row.valueLabel ? `<p class="score-meta">Valeur: ${escapeHtml(row.valueLabel)}</p>` : "";
      const rangeLabel = row.rangeLabel ? `<p class="score-meta">${escapeHtml(row.rangeLabel)}</p>` : "";
      return `
      <article class="marker-card">
        <div class="score-card-head">
          <h3>${escapeHtml(row.name)}</h3>
          <span class="score-chip ${row.bandClass}">${escapeHtml(row.statusLabel)}</span>
        </div>
        ${markerIdLabel}
        ${valueLabel}
        ${rangeLabel}
        <p><strong>Définition:</strong> ${escapeHtml(row.definition)}</p>
        <p><strong>Quand c'est bien:</strong> ${escapeHtml(row.positiveImpact)}</p>
        <p><strong>Quand ce n'est pas bien:</strong> ${escapeHtml(row.negativeImpact)}</p>
      </article>`;
    })
    .join("\n");

  return `
    <p class="score-intro">Dans cet onglet, je détaille chaque marqueur extrait avec sa définition et ses conséquences concrètes quand il est stable ou dégradé.</p>
    <div class="marker-grid">
      ${cards}
    </div>
  `;
};

const compositeToneByScore = (
  score: number,
): { chipClass: "is-critical" | "is-suboptimal" | "is-watch" | "is-solid"; label: string } => {
  if (score <= 35) return { chipClass: "is-critical", label: "Critique" };
  if (score <= 60) return { chipClass: "is-suboptimal", label: "Suboptimal" };
  if (score <= 80) return { chipClass: "is-watch", label: "À surveiller" };
  return { chipClass: "is-solid", label: "Solide" };
};

const renderCompositeScoreCard = (
  title: string,
  score: RiskScore | undefined,
  subtitle: string,
  compact = false,
): string => {
  if (!score) {
    return `
      <article class="composite-card ${compact ? "is-compact" : ""}">
        <div class="composite-card-head">
          <h3>${escapeHtml(title)}</h3>
          <span class="score-chip is-watch">N/A</span>
        </div>
        <p class="composite-subtitle">${escapeHtml(subtitle)}</p>
        <p class="score-intro">Score non disponible pour ce dossier.</p>
      </article>
    `;
  }

  const tone = compositeToneByScore(score.score);
  const confidence = (() => {
    if (typeof score.confidence === "number" && Number.isFinite(score.confidence)) {
      return Math.max(0, Math.min(100, Math.round(score.confidence)));
    }
    if (score.confidence === "low") return 45;
    if (score.confidence === "medium") return 70;
    if (score.confidence === "high") return 90;
    return 100;
  })();
  const confidenceBadge =
    confidence < 60
      ? `<span class="confidence-badge is-low">Données limitées (${confidence}%)</span>`
      : confidence < 80
      ? `<span class="confidence-badge is-medium">Confiance ${confidence}%</span>`
      : "";
  return `
    <article class="composite-card ${compact ? "is-compact" : ""}">
      <div class="composite-card-head">
        <h3>${escapeHtml(title)}</h3>
        <span class="score-chip ${tone.chipClass}">${score.score}/100</span>
      </div>
      ${confidenceBadge}
      <p class="composite-subtitle">${escapeHtml(subtitle)}</p>
      <p class="score-meta">Niveau: ${escapeHtml(tone.label)}</p>
      <p>${escapeHtml(score.interpretation)}</p>
    </article>
  `;
};

const renderCompositeScoresPanel = (riskProfile?: ComprehensiveRiskProfile): string => {
  if (!riskProfile) {
    return `<p class="score-intro">Les scores composites ne sont pas disponibles sur cette version du rapport. Relance la génération avec le profil de risque complet.</p>`;
  }

  const overall = riskProfile.overallHealth;
  const overallTone = compositeToneByScore(overall.score);
  const performanceCards = [
    renderCompositeScoreCard(
      "Score Anabolique",
      riskProfile.anabolicCapacity,
      "Capacité à construire de la masse musculaire.",
    ),
    renderCompositeScoreCard(
      "Score Métabolique",
      riskProfile.metabolicEfficiency,
      "Capacité à mobiliser les graisses en recomposition.",
    ),
    renderCompositeScoreCard(
      "Résistance Insuline",
      riskProfile.insulinResistance,
      "Tolérance glucidique et sensibilité insulinique.",
    ),
  ].join("\n");

  const prediabetesHasCoreData = riskProfile.prediabetes.markers_used?.some(
    (m: string) => m === "hba1c" || m === "glycemie_jeun" || m === "insuline_jeun",
  );
  const healthCards = [
    prediabetesHasCoreData
      ? renderCompositeScoreCard("Pré-diabète", riskProfile.prediabetes, "Risque de dérive glycémique précoce.", true)
      : "",
    renderCompositeScoreCard("Cardiovasculaire", riskProfile.cardiovascular, "Risque cardio-métabolique global.", true),
    renderCompositeScoreCard("Foie", riskProfile.liverHealth, "Robustesse hépatique et charge métabolique.", true),
    renderCompositeScoreCard("Reins", riskProfile.kidneyFunction, "Capacité de filtration et équilibre hydrique.", true),
    renderCompositeScoreCard("Hormonal", riskProfile.hormonalHealth, "Stabilité endocrine et récupération.", true),
    renderCompositeScoreCard("Thyroïde", riskProfile.thyroidDysfunction, "Pilotage thyroïdien du métabolisme.", true),
    renderCompositeScoreCard("Inflammation", riskProfile.inflammation, "Charge inflammatoire systémique.", true),
    renderCompositeScoreCard("Anémie", riskProfile.anemia, "Risque de déficit d'oxygénation et de réserves en fer.", true),
    renderCompositeScoreCard("Syndrome Métabolique", riskProfile.metabolicSyndrome, "Agrégation des facteurs de dérive métabolique.", true),
  ].filter(Boolean).join("\n");

  return `
    <p class="score-intro">Je consolide ici les marqueurs en scores composites pour visualiser rapidement tes priorités performance et santé.</p>
    <div class="composite-overall-shell">
      <div class="composite-overall-score ${overallTone.chipClass}">
        <span class="composite-overall-value">${overall.score}</span>
        <span class="composite-overall-unit">/100</span>
      </div>
      <div class="composite-overall-copy">
        <h3>Score global APEXLABS</h3>
        <p>${escapeHtml(overall.interpretation)}</p>
      </div>
    </div>
    <h3 class="composite-group-title">Scores performance</h3>
    <div class="composite-grid performance-grid">
      ${performanceCards}
    </div>
    <h3 class="composite-group-title">Scores santé</h3>
    <div class="composite-grid health-grid">
      ${healthCards}
    </div>
  `;
};

const renderBiomarkerRadarPanel = (rows: BiomarkerScoreRow[]): string => {
  if (!rows.length) {
    return `<p style="margin:0;color:${BLOOD_REPORT_THEME.muted};font-size:15px;line-height:1.8;">Le radar des scores n'a pas pu être construit automatiquement sur cette version du rapport. Je te recommande de relancer la génération pour obtenir la cartographie complète de chaque biomarqueur.</p>`;
  }

  const radarRows = rows.slice(0, Math.min(24, rows.length));
  const axisCount = Math.max(1, radarRows.length);
  const size = 520;
  const center = size / 2;
  const radius = 180;
  const toAngle = (index: number) => (-Math.PI / 2) + (index * Math.PI * 2) / axisCount;
  const polar = (angle: number, r: number) => ({
    x: center + Math.cos(angle) * r,
    y: center + Math.sin(angle) * r,
  });
  const labelRadius = axisCount > 14 ? radius + 30 : radius + 24;
  const labelFontSize = axisCount > 18 ? 8 : axisCount > 14 ? 9 : 11;
  const maxLabelLength = axisCount > 18 ? 16 : axisCount > 14 ? 18 : 26;
  const shortenRadarLabel = (rawName: string): string => {
    const lower = normalizeLoose(rawName);
    if (lower.includes("apolipoproteines a1") || lower.includes("apolipoproteine a1") || lower.includes("apo a1")) {
      return "Apo A1";
    }
    if (lower.includes("apob") || lower.includes("apo b")) {
      return "ApoB";
    }
    return rawName;
  };

  const gridRings = [0.25, 0.5, 0.75, 1].map((factor) => {
    const r = radius * factor;
    return `<circle cx="${center}" cy="${center}" r="${r.toFixed(2)}" fill="none" stroke="#d7c6af" stroke-width="1" />`;
  });

  const axisLines = radarRows.map((row, index) => {
    const angle = toAngle(index);
    const outer = polar(angle, radius);
    const label = polar(angle, labelRadius);
    const radarLabel = shortenRadarLabel(row.name);
    const shortName = radarLabel.length > maxLabelLength ? `${radarLabel.slice(0, maxLabelLength - 3)}...` : radarLabel;
    return `
      <line x1="${center}" y1="${center}" x2="${outer.x.toFixed(2)}" y2="${outer.y.toFixed(2)}" stroke="#d7c6af" stroke-width="1" />
      <text x="${label.x.toFixed(2)}" y="${label.y.toFixed(2)}" text-anchor="middle" dominant-baseline="middle" font-size="${labelFontSize}" fill="#6f6254">${escapeHtml(shortName)}</text>
    `;
  });

  const polygonPoints = radarRows
    .map((row, index) => {
      const angle = toAngle(index);
      const point = polar(angle, (radius * row.score) / 100);
      return `${point.x.toFixed(2)},${point.y.toFixed(2)}`;
    })
    .join(" ");

  const valueDots = radarRows.map((row, index) => {
    const angle = toAngle(index);
    const point = polar(angle, (radius * row.score) / 100);
    return `<circle cx="${point.x.toFixed(2)}" cy="${point.y.toFixed(2)}" r="4.5" fill="#c06f2e" />`;
  });

  const cards = rows
    .map(
      (row) => `
      <article class="score-card">
        <div class="score-card-head">
          <h3>${escapeHtml(row.name)}</h3>
          <span class="score-chip ${row.bandClass}">${row.score}/100</span>
        </div>
        <p class="score-meta">Niveau: ${escapeHtml(row.statusLabel)}</p>
        ${row.valueLabel ? `<p class="score-meta">Valeur: ${escapeHtml(row.valueLabel)}</p>` : ""}
        ${row.rangeLabel ? `<p class="score-meta">${escapeHtml(row.rangeLabel)}</p>` : ""}
        <p>${escapeHtml(row.meaning)}</p>
      </article>`,
    )
    .join("\n");

  return `
    <p class="score-intro">Je calcule chaque note biomarqueur automatiquement à partir de ta valeur réelle, de la zone normale et de la zone optimale. Chaque score va de 0 à 100, et plus la note est basse, plus l'écart à l'optimal est important.</p>
    <p class="score-intro">Ce radar est dynamique: il se met à jour selon les valeurs de ton bilan et te montre visuellement où concentrer tes priorités biologiques.</p>
    <div class="score-radar-shell">
      <svg class="score-radar" viewBox="0 0 ${size} ${size}" role="img" aria-label="Radar des scores biomarqueurs">
        ${gridRings.join("\n")}
        ${axisLines.join("\n")}
        <polygon points="${polygonPoints}" fill="rgba(192,111,46,0.18)" stroke="#c06f2e" stroke-width="2" />
        ${valueDots.join("\n")}
      </svg>
    </div>
    <div class="score-legend">
      <span class="score-chip is-critical">0-35 Critique</span>
      <span class="score-chip is-suboptimal">36-60 Suboptimal</span>
      <span class="score-chip is-watch">61-80 À surveiller</span>
      <span class="score-chip is-solid">81-100 Solide</span>
    </div>
    <div class="score-grid">
      ${cards}
    </div>
  `;
};

const renderBloodTabbedReportHtml = (
  reportId: string,
  reportMarkdown: string,
  markerSnapshots?: BloodReportMarkerSnapshot[],
  meta?: {
    clientName?: string;
    reportDate?: string;
    markerCount?: number;
    riskProfile?: ComprehensiveRiskProfile;
  },
): string => {
  const sanitizedMarkdown = stripBloodForbiddenFormatting(reportMarkdown);
  const sections = parseMarkdownSections(sanitizedMarkdown);
  const biomarkerScoreRows =
    markerSnapshots && markerSnapshots.length
      ? deriveBiomarkerScoresFromSnapshots(markerSnapshots)
      : deriveBiomarkerScoresFromMarkdown(sanitizedMarkdown);
  const clientName = String(meta?.clientName || "Client").trim();
  const reportDate =
    String(meta?.reportDate || "").trim() ||
    new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
  const markerCount =
    typeof meta?.markerCount === "number" && Number.isFinite(meta.markerCount)
      ? Math.max(0, Math.round(meta.markerCount))
      : markerSnapshots?.length || 0;
  const subtitleParts = [`Bilan réalisé le ${reportDate}`];
  if (markerCount > 0) subtitleParts.push(`${markerCount} marqueurs analysés`);
  const subtitle = subtitleParts.join(" · ");
  const compositeTabId = "tab-scores-composites";
  const compositePanel = `
      <section id="${compositeTabId}" class="tab-panel is-active" aria-label="Scores composites">
        <h2>Scores Composites</h2>
        ${renderCompositeScoresPanel(meta?.riskProfile)}
      </section>`;
  const radarTabId = "tab-radar-scores-biomarqueurs";
  const radarPanel = `
      <section id="${radarTabId}" class="tab-panel" aria-label="Radar des scores biomarqueurs">
        <h2>Radar des scores biomarqueurs</h2>
        ${renderBiomarkerRadarPanel(biomarkerScoreRows)}
      </section>`;
  const markersTabId = "tab-marqueurs-extraits";
  const markersPanel = `
      <section id="${markersTabId}" class="tab-panel" aria-label="Marqueurs extraits">
        <h2>Marqueurs extraits et interprétation</h2>
        ${renderExtractedMarkersPanel(markerSnapshots)}
      </section>`;
  const generatedTabs = sections
    .map((section, index) => {
      const tabId = slugifyTabId(section.title, index);
      return { id: tabId, title: section.title };
    })
    .filter((tab) => tab.id && tab.title);

  const panels = sections
    .map((section, index) => {
      const tabId = slugifyTabId(section.title, index);
      const activeClass = "";
      const bodyHtml = renderSectionLinesToHtml(section.lines, BLOOD_REPORT_THEME.ink, BLOOD_REPORT_THEME.muted);
      return `
      <section id="${tabId}" class="tab-panel${activeClass}" aria-label="${escapeHtml(section.title)}">
        <h2>${escapeHtml(section.title)}</h2>
        ${bodyHtml}
      </section>`;
    })
    .join("\n")
    .trim();

  const tabDescriptors = [
    { id: compositeTabId, title: "Scores Composites", isActive: true },
    { id: radarTabId, title: "Radar des scores biomarqueurs", isActive: false },
    { id: markersTabId, title: "Marqueurs extraits", isActive: false },
    ...generatedTabs.map((tab) => ({ ...tab, isActive: false })),
  ];
  const navWithExtraTabs = tabDescriptors
    .map(
      (tab) =>
        `<button class="tab-btn${tab.isActive ? " is-active" : ""}" type="button" data-tab-target="${tab.id}" aria-selected="${
          tab.isActive ? "true" : "false"
        }">${escapeHtml(tab.title)}</button>`,
    )
    .join("\n")
    .trim();
  const mobileTabOptions = tabDescriptors
    .map(
      (tab) =>
        `<option value="${tab.id}"${tab.isActive ? " selected" : ""}>${escapeHtml(tab.title)}</option>`,
    )
    .join("\n")
    .trim();
  const panelsWithExtraTabs = `${compositePanel}\n${radarPanel}\n${markersPanel}\n${panels}`.trim();

  return stripBloodForbiddenFormatting(`<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>APEXLABS | ACHZOD | ${escapeHtml(clientName)} | Bilan sanguin complet</title>
  <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='14' fill='%232f2822'/%3E%3Cpath d='M32 11l17 42h-8.3l-3.2-8.7H26.4L23.2 53H15L32 11zm2.8 25.8L32 28.7l-2.8 8.1h5.6z' fill='%23f8dcc0'/%3E%3C/svg%3E">
  <style>
    :root {
      --paper: ${BLOOD_REPORT_THEME.paper};
      --paper-soft: ${BLOOD_REPORT_THEME.paperSoft};
      --card: ${BLOOD_REPORT_THEME.card};
      --card-strong: ${BLOOD_REPORT_THEME.cardStrong};
      --ink: ${BLOOD_REPORT_THEME.ink};
      --muted: ${BLOOD_REPORT_THEME.muted};
      --border: ${BLOOD_REPORT_THEME.border};
      --accent: ${BLOOD_REPORT_THEME.accent};
      --accent-soft: ${BLOOD_REPORT_THEME.accentSoft};
      --shadow: ${BLOOD_REPORT_THEME.shadow};
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 0;
      background: var(--paper);
      color: var(--ink);
      font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      line-height: 1.6;
    }
    .wrap {
      max-width: 1160px;
      margin: 0 auto;
      padding: 32px 18px 44px;
    }
    .header {
      background: linear-gradient(140deg, var(--card-strong) 0%, var(--paper-soft) 100%);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 22px 22px 16px;
      box-shadow: 0 10px 30px var(--shadow);
      margin-bottom: 14px;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.11em;
      color: var(--accent);
      font-weight: 700;
      margin-bottom: 10px;
    }
    .brand-line {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 10px;
      flex-wrap: wrap;
    }
    .achzod-mark {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      color: #594a3d;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      font-weight: 700;
    }
    .achzod-mark-icon {
      width: 20px;
      height: 20px;
      border-radius: 8px;
      background: #2f2822;
      color: #f8dcc0;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: 800;
      line-height: 1;
    }
    .badge-dot {
      width: 8px;
      height: 8px;
      border-radius: 999px;
      background: var(--accent);
    }
    .title {
      margin: 0;
      font-size: 34px;
      line-height: 1.15;
      letter-spacing: -0.02em;
      color: var(--ink);
    }
    .subtitle {
      margin: 10px 0 0;
      color: var(--muted);
      font-size: 14px;
      line-height: 1.55;
    }
    .tabs-shell {
      border: 1px solid var(--border);
      border-radius: 16px;
      background: var(--card);
      box-shadow: 0 8px 24px var(--shadow);
      overflow: hidden;
    }
    .tabs-select-wrap {
      display: none;
      border-bottom: 1px solid var(--border);
      background: var(--paper-soft);
      padding: 12px;
    }
    .tabs-select-label {
      margin: 0 0 6px;
      color: #7b6d5d;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      font-weight: 700;
    }
    .tabs-select {
      width: 100%;
      border: 1px solid var(--border);
      background: #fff7eb;
      color: var(--ink);
      border-radius: 10px;
      padding: 10px 12px;
      font-size: 14px;
      font-weight: 600;
    }
    .tabs-nav {
      display: flex;
      gap: 8px;
      padding: 12px;
      border-bottom: 1px solid var(--border);
      background: var(--paper-soft);
      overflow-x: auto;
      scrollbar-width: thin;
    }
    .tabs-nav::-webkit-scrollbar { height: 8px; }
    .tabs-nav::-webkit-scrollbar-thumb { background: #d9c8b0; border-radius: 999px; }
    .tab-btn {
      appearance: none;
      border: 1px solid transparent;
      background: transparent;
      color: var(--muted);
      font-size: 13px;
      font-weight: 600;
      padding: 9px 13px;
      border-radius: 10px;
      cursor: pointer;
      white-space: nowrap;
      transition: all .2s ease;
    }
    .tab-btn:hover {
      color: var(--ink);
      border-color: var(--border);
      background: #f5ebde;
    }
    .tab-btn.is-active {
      color: #ffffff;
      border-color: #2f2822;
      background: #2f2822;
    }
    .tabs-content {
      padding: 20px;
      background: var(--card);
    }
    .tab-panel { display: none; }
    .tab-panel.is-active { display: block; }
    .tab-panel h2 {
      margin: 0 0 16px;
      font-size: 30px;
      line-height: 1.2;
      letter-spacing: -0.02em;
      color: var(--ink);
    }
    .score-intro {
      margin: 0 0 12px;
      color: var(--muted);
      font-size: 15px;
      line-height: 1.78;
    }
    .score-radar-shell {
      margin-top: 14px;
      border: 1px solid var(--border);
      border-radius: 14px;
      background: var(--paper-soft);
      padding: 12px;
      display: flex;
      justify-content: center;
    }
    .score-radar {
      width: 100%;
      max-width: 520px;
      height: auto;
      display: block;
    }
    .score-legend {
      margin-top: 14px;
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .score-grid {
      margin-top: 16px;
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 12px;
    }
    .marker-grid {
      margin-top: 14px;
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 12px;
    }
    .marker-card {
      border: 1px solid var(--border);
      background: #f9f2e7;
      border-radius: 12px;
      padding: 12px;
    }
    .marker-card p {
      margin: 0 0 8px;
      color: var(--muted);
      font-size: 13px;
      line-height: 1.62;
    }
    .marker-card p:last-child { margin-bottom: 0; }
    .score-card {
      border: 1px solid var(--border);
      background: #f9f2e7;
      border-radius: 12px;
      padding: 12px;
    }
    .score-card-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      margin-bottom: 6px;
    }
    .score-card h3 {
      margin: 0;
      color: var(--ink);
      font-size: 16px;
      line-height: 1.35;
      letter-spacing: -0.01em;
    }
    .score-card p {
      margin: 0;
      color: var(--muted);
      font-size: 13px;
      line-height: 1.62;
    }
    .score-card .score-meta {
      margin-bottom: 6px;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #7b6d5d;
      font-weight: 600;
    }
    .composite-overall-shell {
      display: grid;
      grid-template-columns: minmax(220px, 280px) 1fr;
      gap: 18px;
      align-items: center;
      padding: 14px;
      border: 1px solid var(--border);
      border-radius: 14px;
      background: var(--paper-soft);
      margin-bottom: 16px;
    }
    .composite-overall-score {
      display: flex;
      align-items: flex-end;
      justify-content: center;
      gap: 6px;
      border-radius: 14px;
      border: 1px solid var(--border);
      padding: 18px 10px;
      background: #f9f2e7;
      min-height: 120px;
    }
    .composite-overall-score.is-critical { background: #fbe2dc; border-color: #efc2b7; color: #8e3423; }
    .composite-overall-score.is-suboptimal { background: #f8ead5; border-color: #eac598; color: #8f5a17; }
    .composite-overall-score.is-watch { background: #eaf0dc; border-color: #cddcb0; color: #4f6b21; }
    .composite-overall-score.is-solid { background: #ddeedf; border-color: #b8d8be; color: #1e6840; }
    .composite-overall-value {
      font-size: 64px;
      font-weight: 800;
      line-height: 1;
      letter-spacing: -0.04em;
    }
    .composite-overall-unit {
      font-size: 18px;
      font-weight: 700;
      opacity: 0.9;
      margin-bottom: 8px;
    }
    .composite-overall-copy h3 {
      margin: 0 0 6px;
      font-size: 24px;
      line-height: 1.2;
      letter-spacing: -0.02em;
      color: var(--ink);
    }
    .composite-overall-copy p {
      margin: 0;
      color: var(--muted);
      font-size: 14px;
      line-height: 1.7;
    }
    .composite-group-title {
      margin: 18px 0 10px;
      font-size: 18px;
      line-height: 1.3;
      letter-spacing: -0.01em;
      color: var(--ink);
    }
    .composite-grid {
      display: grid;
      gap: 12px;
    }
    .performance-grid {
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    }
    .health-grid {
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    }
    .composite-card {
      border: 1px solid var(--border);
      background: #f9f2e7;
      border-radius: 12px;
      padding: 12px;
    }
    .composite-card.is-compact {
      padding: 10px;
    }
    .confidence-badge {
      display: inline-block;
      font-size: 10px;
      font-weight: 600;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      padding: 2px 8px;
      border-radius: 999px;
      margin-bottom: 4px;
    }
    .confidence-badge.is-low {
      background: rgba(192,57,43,0.12);
      color: #c0392b;
    }
    .confidence-badge.is-medium {
      background: rgba(243,156,18,0.12);
      color: #e67e22;
    }
    .composite-card-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      margin-bottom: 6px;
    }
    .composite-card-head h3 {
      margin: 0;
      font-size: 15px;
      line-height: 1.35;
      letter-spacing: -0.01em;
      color: var(--ink);
    }
    .composite-subtitle {
      margin: 0 0 6px;
      color: #7b6d5d;
      font-size: 12px;
      line-height: 1.5;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      font-weight: 700;
    }
    .score-chip {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 94px;
      border-radius: 999px;
      padding: 5px 10px;
      border: 1px solid transparent;
      font-size: 12px;
      font-weight: 700;
      line-height: 1;
      white-space: nowrap;
    }
    .score-chip.is-critical {
      background: #fbe2dc;
      border-color: #efc2b7;
      color: #8e3423;
    }
    .score-chip.is-suboptimal {
      background: #f8ead5;
      border-color: #eac598;
      color: #8f5a17;
    }
    .score-chip.is-watch {
      background: #eaf0dc;
      border-color: #cddcb0;
      color: #4f6b21;
    }
    .score-chip.is-solid {
      background: #ddeedf;
      border-color: #b8d8be;
      color: #1e6840;
    }
    .footer-note {
      margin-top: 14px;
      color: var(--muted);
      font-size: 12px;
      text-align: center;
    }
    .footer-note strong {
      color: #5f4735;
    }
    @media (max-width: 700px) {
      .wrap { padding: 18px 10px 26px; }
      .title { font-size: 28px; }
      .tab-panel h2 { font-size: 24px; }
      .tabs-content { padding: 16px; }
      .tabs-nav { display: none; }
      .tabs-select-wrap { display: block; }
      .score-grid { grid-template-columns: 1fr; }
      .marker-grid { grid-template-columns: 1fr; }
      .composite-overall-shell { grid-template-columns: 1fr; }
      .composite-overall-value { font-size: 52px; }
      .performance-grid, .health-grid { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <div class="wrap">
    <header class="header">
      <div class="brand-line">
        <div class="badge"><span class="badge-dot"></span>APEXLABS</div>
        <div class="achzod-mark"><span class="achzod-mark-icon">A</span><span>ACHZOD</span></div>
      </div>
      <h1 class="title">${escapeHtml(clientName)} - Bilan sanguin complet</h1>
      <p class="subtitle">${escapeHtml(subtitle)}</p>
    </header>
    <main class="tabs-shell">
      <div class="tabs-select-wrap">
        <p class="tabs-select-label">Navigation rapport</p>
        <select id="tabs-select" class="tabs-select" aria-label="Choisir un onglet">
          ${mobileTabOptions}
        </select>
      </div>
      <nav class="tabs-nav" aria-label="Sections du rapport">
        ${navWithExtraTabs}
      </nav>
      <div class="tabs-content">
        ${panelsWithExtraTabs}
      </div>
    </main>
    <p class="footer-note">Rapport ID: ${escapeHtml(reportId)} · Généré pour envoi client · <strong>APEXLABS by ACHZOD</strong></p>
    <p class="footer-note">Copyright ${new Date().getFullYear()} ACHZOD. Tous droits réservés.</p>
  </div>
  <script>
    (function () {
      var buttons = Array.prototype.slice.call(document.querySelectorAll('.tab-btn'));
      var panels = Array.prototype.slice.call(document.querySelectorAll('.tab-panel'));
      var selectEl = document.getElementById('tabs-select');
      if (!buttons.length || !panels.length) return;
      function activate(id) {
        buttons.forEach(function (btn) {
          var active = btn.getAttribute('data-tab-target') === id;
          btn.classList.toggle('is-active', active);
          btn.setAttribute('aria-selected', active ? 'true' : 'false');
        });
        panels.forEach(function (panel) {
          panel.classList.toggle('is-active', panel.id === id);
        });
        if (selectEl && selectEl.value !== id) {
          selectEl.value = id;
        }
      }
      buttons.forEach(function (btn) {
        btn.addEventListener('click', function () {
          activate(btn.getAttribute('data-tab-target') || '');
        });
      });
      if (selectEl) {
        selectEl.addEventListener('change', function () {
          activate(selectEl.value || '');
        });
      }
      activate(buttons[0].getAttribute('data-tab-target') || '');
    })();
  </script>
</body>
</html>`);
};

const getBloodLightEmailWrapper = (
  content: string,
  headerTitle: string,
  headerSubtitle: string,
): string => {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
  </style>
</head>
<body style="margin:0;padding:0;background:${BLOOD_REPORT_THEME.paper};font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:${BLOOD_REPORT_THEME.ink};">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:30px 14px;background:${BLOOD_REPORT_THEME.paper};">
    <tr>
      <td align="center">
        <table role="presentation" width="700" cellspacing="0" cellpadding="0" style="max-width:700px;background:${BLOOD_REPORT_THEME.card};border-radius:16px;border:1px solid ${BLOOD_REPORT_THEME.border};overflow:hidden;">
          <tr>
            <td style="padding:26px 26px 20px;background:linear-gradient(140deg,${BLOOD_REPORT_THEME.cardStrong} 0%,${BLOOD_REPORT_THEME.paperSoft} 100%);border-bottom:1px solid ${BLOOD_REPORT_THEME.border};">
              <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.1em;color:${BLOOD_REPORT_THEME.accent};font-weight:700;margin-bottom:10px;">Blood Analysis · ApexLabs</div>
              <h1 style="margin:0;color:${BLOOD_REPORT_THEME.ink};font-size:30px;line-height:1.2;letter-spacing:-0.02em;">${escapeHtml(
                headerTitle
              )}</h1>
              <p style="margin:10px 0 0;color:${BLOOD_REPORT_THEME.muted};font-size:14px;line-height:1.55;">${escapeHtml(
                headerSubtitle
              )}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:26px;">
              ${content}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

type BloodDeliveryQualityGateResult = {
  pass: boolean;
  checks: Record<string, unknown>;
  reasons: string[];
};

const DELIVERY_REQUIRED_SECTION_TITLES = [
  "Synthèse exécutive",
  "Qualité des données & limites",
  "Tableau de bord (scores & priorités)",
  "Potentiel recomposition (perte de gras + gain de muscle)",
  "Lecture compartimentée par axes",
  "Interconnexions majeures (le pattern)",
  "Deep dive - marqueurs prioritaires",
  "Plan d'action 90 jours",
  "Nutrition & entraînement",
  "Suppléments & stack",
  "Annexes (références et vigilance)",
  "Sources (bibliothèque)",
];

const FORBIDDEN_DASH_REGEX = /[\u2013\u2014]/;
const FORBIDDEN_EMOJI_REGEX = /[\u{1F1E6}-\u{1F1FF}\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;

const normalizeQualityText = (value: string): string =>
  String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u2013\u2014-]+/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const evaluateBloodDeliveryQuality = (
  reportMarkdown: string,
  attachmentHtml: string,
  emailBodyHtml: string,
): BloodDeliveryQualityGateResult => {
  const reportText = String(reportMarkdown || "");
  const attachmentText = String(attachmentHtml || "");
  const bodyText = String(emailBodyHtml || "");

  const normalizedReport = normalizeQualityText(reportText);
  const normalizedAttachment = normalizeQualityText(attachmentText);

  const missingSectionsInMarkdown = DELIVERY_REQUIRED_SECTION_TITLES.filter(
    (title) => !normalizedReport.includes(normalizeQualityText(title)),
  );
  const missingSectionsInAttachment = DELIVERY_REQUIRED_SECTION_TITLES.filter(
    (title) => !normalizedAttachment.includes(normalizeQualityText(title)),
  );

  const hasCompositeTab = /Scores Composites/i.test(attachmentText);
  const hasRadarTab = /Radar des scores biomarqueurs/i.test(attachmentText);
  const hasMarkersTab = /Marqueurs extraits/i.test(attachmentText);
  const hasTabsScript = /data-tab-target/i.test(attachmentText) && /activate\(/i.test(attachmentText);
  const hasBodyInlineReportShell = /class=["'][^"']*tabs-shell[^"']*["']/i.test(bodyText);
  const hasPlaceholder =
    /section non disponible|veuillez reg(?:e|é)n(?:e|é)rer le rapport/i.test(reportText) ||
    /section non disponible|veuillez reg(?:e|é)n(?:e|é)rer le rapport/i.test(attachmentText);

  const hasForbiddenDash =
    FORBIDDEN_DASH_REGEX.test(reportText) ||
    FORBIDDEN_DASH_REGEX.test(attachmentText) ||
    FORBIDDEN_DASH_REGEX.test(bodyText);
  const hasForbiddenEmoji =
    FORBIDDEN_EMOJI_REGEX.test(reportText) ||
    FORBIDDEN_EMOJI_REGEX.test(attachmentText) ||
    FORBIDDEN_EMOJI_REGEX.test(bodyText);

  const checks: Record<string, unknown> = {
    reportLength: reportText.length,
    attachmentLength: attachmentText.length,
    bodyLength: bodyText.length,
    missingSectionsInMarkdown,
    missingSectionsInAttachment,
    hasCompositeTab,
    hasRadarTab,
    hasMarkersTab,
    hasTabsScript,
    hasBodyInlineReportShell,
    hasPlaceholder,
    hasForbiddenDash,
    hasForbiddenEmoji,
  };

  const reasons: string[] = [];
  if (missingSectionsInMarkdown.length) reasons.push(`missing_sections_markdown:${missingSectionsInMarkdown.join(",")}`);
  if (missingSectionsInAttachment.length) reasons.push(`missing_sections_attachment:${missingSectionsInAttachment.join(",")}`);
  if (!hasCompositeTab) reasons.push("missing_tab_scores_composites");
  if (!hasRadarTab) reasons.push("missing_tab_radar");
  if (!hasMarkersTab) reasons.push("missing_tab_marqueurs_extraits");
  if (!hasTabsScript) reasons.push("missing_tabs_script");
  if (hasBodyInlineReportShell) reasons.push("email_body_contains_full_report_shell");
  if (hasPlaceholder) reasons.push("placeholder_detected");
  if (hasForbiddenDash) reasons.push("forbidden_dash_detected");
  if (hasForbiddenEmoji) reasons.push("forbidden_emoji_detected");

  return {
    pass: reasons.length === 0,
    checks,
    reasons,
  };
};

function extractSendPulseDeliveryId(payload: unknown): string | undefined {
  if (!payload || typeof payload !== "object") return undefined;
  const candidate = (payload as any).id || (payload as any).message?.id || (payload as any).data?.id;
  if (candidate) return String(candidate);
  try {
    const raw = JSON.stringify(payload);
    const match = raw.match(/[a-z0-9]{6,}-[a-z0-9]{4,}-[a-z0-9]{2,}/i);
    return match ? match[0] : undefined;
  } catch {
    return undefined;
  }
}

export async function sendBloodAnalysisHtmlEmail(
  email: string,
  reportId: string,
  reportMarkdown: string,
  baseUrl: string,
  markerSnapshots?: BloodReportMarkerSnapshot[],
  meta?: {
    clientName?: string;
    reportDate?: string;
    markerCount?: number;
    riskProfile?: ComprehensiveRiskProfile;
    orderRef?: string;
  },
): Promise<boolean> {
  try {
    void baseUrl;
    // Strip forbidden dashes/emojis from the report markdown BEFORE rendering HTML
    // and BEFORE the quality gate checks , otherwise the gate blocks on raw AI em-dashes.
    reportMarkdown = stripBloodForbiddenFormatting(reportMarkdown);
    const fallbackNameFromEmail = String(email || "")
      .split("@")[0]
      .replace(/[._-]+/g, " ")
      .trim()
      .replace(/\b\w/g, (char) => char.toUpperCase());
    const standaloneReportHtml = renderBloodTabbedReportHtml(reportId, reportMarkdown, markerSnapshots, {
      clientName: meta?.clientName || fallbackNameFromEmail || "Client",
      reportDate: meta?.reportDate,
      markerCount:
        typeof meta?.markerCount === "number" && Number.isFinite(meta.markerCount)
          ? meta.markerCount
          : markerSnapshots?.length,
      riskProfile: meta?.riskProfile,
    });
    const clientName = meta?.clientName || fallbackNameFromEmail || "Client";
    const markerCount =
      typeof meta?.markerCount === "number" && Number.isFinite(meta.markerCount)
        ? Math.max(0, Math.round(meta.markerCount))
        : markerSnapshots?.length || 0;
    const topPriorityText = (() => {
      const rows = Array.isArray(markerSnapshots)
        ? markerSnapshots
            .filter((marker) => marker && marker.name)
            .sort((a, b) => statusRank(a.status) - statusRank(b.status))
            .slice(0, 3)
            .map((marker) => {
              const unit = marker.unit ? ` ${marker.unit}` : "";
              const value = Number.isFinite(Number(marker.value)) ? `${Number(marker.value)}${unit}` : "non renseignee";
              return `${marker.name} (${value})`;
            })
        : [];
      return rows.length ? rows.join(", ") : "je te detaille les priorites directement dans le fichier joint";
    })();

    const content = `
      <div style="text-align:center;margin-bottom:18px;">
        <span style="display:inline-block;background:${BLOOD_REPORT_THEME.accentSoft};color:${BLOOD_REPORT_THEME.accent};padding:8px 16px;border-radius:999px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;border:1px solid ${BLOOD_REPORT_THEME.border};">
          Rapport client en piece jointe
        </span>
      </div>

      <h2 style="color:${BLOOD_REPORT_THEME.ink};margin:0 0 10px;font-size:30px;text-align:center;font-weight:700;letter-spacing:-0.02em;">
        Ton rapport Blood Analysis est pret
      </h2>
      <p style="color:${BLOOD_REPORT_THEME.muted};font-size:15px;line-height:1.75;margin:0 0 12px;">
        ${escapeHtml(clientName)}, j'ai finalise ton analyse sanguine complete. Le rapport est livre en fichier HTML joint avec onglets interactifs (scores composites, radar dynamique, deep dive marqueur par marqueur, plan d'action).
      </p>
      <div style="margin:0 0 14px;padding:14px 16px;border:2px solid ${BLOOD_REPORT_THEME.accent};border-radius:12px;background:${BLOOD_REPORT_THEME.accentSoft};">
        <p style="margin:0;color:${BLOOD_REPORT_THEME.ink};font-size:14px;line-height:1.6;font-weight:700;">
          A LIRE SUR ORDINATEUR
        </p>
        <p style="margin:6px 0 0;color:${BLOOD_REPORT_THEME.ink};font-size:13px;line-height:1.65;">
          Ouvre le fichier HTML attache depuis ton ordinateur (PC ou Mac), pas depuis l'app mail iPhone, sinon les onglets risquent de ne pas s'afficher correctement. Si tu n'as pas d'ordinateur sous la main, ouvre le fichier dans Safari/Chrome de ton telephone (telecharge-le d'abord, puis ouvre-le depuis tes Fichiers).
        </p>
      </div>
      <div style="margin:12px 0 0;padding:14px;border:1px solid ${BLOOD_REPORT_THEME.border};border-radius:12px;background:${BLOOD_REPORT_THEME.paperSoft};">
        <p style="margin:0 0 8px;color:${BLOOD_REPORT_THEME.ink};font-size:14px;font-weight:700;">Rappel dossier</p>
        <p style="margin:0 0 4px;color:${BLOOD_REPORT_THEME.muted};font-size:14px;line-height:1.65;">Nombre de marqueurs analyses: ${markerCount}</p>
        <p style="margin:0;color:${BLOOD_REPORT_THEME.muted};font-size:14px;line-height:1.65;">Priorites visibles sur cette extraction: ${escapeHtml(topPriorityText)}.</p>
      </div>

      <div style="margin:20px 0;padding:20px;border:2px dashed ${BLOOD_REPORT_THEME.accent};border-radius:12px;text-align:center;background:${BLOOD_REPORT_THEME.accentSoft};">
        <p style="color:${BLOOD_REPORT_THEME.muted};font-size:11px;text-transform:uppercase;letter-spacing:2px;margin:0 0 6px;">Ton code promo</p>
        <p style="color:${BLOOD_REPORT_THEME.accent};font-size:28px;font-weight:700;letter-spacing:3px;margin:0;">BLOOD99</p>
        <p style="color:${BLOOD_REPORT_THEME.ink};font-size:13px;margin:8px 0 0;">-99EUR deduits sur ton coaching Achzod</p>
      </div>
      <p style="color:${BLOOD_REPORT_THEME.muted};font-size:13px;line-height:1.65;margin:0 0 8px;text-align:center;">
        Le montant de ta Blood Analysis (99 EUR) est deduit a 100% si tu passes au coaching.<br/>
        Utilise ce code sur <a href="https://www.achzodcoaching.com/formules-coaching" style="color:${BLOOD_REPORT_THEME.accent};text-decoration:underline;">achzodcoaching.com</a> pour deduire 99EUR de ta formule coaching.
      </p>

      <div style="margin-top:14px;padding-top:14px;border-top:1px solid ${BLOOD_REPORT_THEME.border};text-align:center;">
        <p style="margin:0;color:${BLOOD_REPORT_THEME.muted};font-size:12px;">Pièce jointe: <strong style="color:${BLOOD_REPORT_THEME.ink};">Blood_Analysis_${escapeHtml(
          reportId
        )}.html</strong></p>
      </div>
    `;

    const emailContent = stripBloodForbiddenFormatting(getBloodLightEmailWrapper(
      content,
      "Blood Analysis",
      "Ton rapport interactif personnalise",
    ));
    const attachmentName = `Blood_Analysis_${reportId}.html`;

    const qualityGate = evaluateBloodDeliveryQuality(reportMarkdown, standaloneReportHtml, emailContent);
    if (!qualityGate.pass) {
      console.error(`[SendPulse] BLOOD_DELIVERY_BLOCKED ${reportId}:`, qualityGate.reasons);
      await logBloodEmailDelivery({
        reportId,
        recipientEmail: email,
        clientName,
        orderRef: meta?.orderRef,
        status: "blocked",
        qualityPass: false,
        qualityChecks: qualityGate.checks,
        attachmentName,
        subject: "Ton rapport Blood Analysis est pret - piece jointe HTML",
        errorMessage: qualityGate.reasons.join(" | "),
      });
      return false;
    }

    const baseEmailPayload = {
      html: encodeBase64(emailContent),
      text: stripBloodForbiddenFormatting(`Ton rapport Blood Analysis est pret. Ouvre la piece jointe HTML: Blood_Analysis_${reportId}.html`),
      subject: stripBloodForbiddenFormatting("Ton rapport Blood Analysis est pret - piece jointe HTML"),
      from: {
        name: "ApexLabs by Achzod",
        email: SENDER_EMAIL,
      },
      to: [{ email }],
      attachments_binary: {
        [attachmentName]: encodeBase64(standaloneReportHtml),
      },
    };

    let result = await sendEmailWithTracking(
      baseEmailPayload,
      {
        emailType: "sendBloodAnalysisHtmlEmail",
        recipientEmail: email,
        recipientName: clientName,
        auditId: reportId,
        auditType: "BLOOD_ANALYSIS",
        metadata: {
          reportId,
          markerCount,
          orderRef: meta?.orderRef,
          attachmentName,
        },
      }
    );

    if (result.result !== true) {
      console.warn(
        `[SendPulse] Blood HTML attachment send failed for ${email}, retrying with attachment.`,
        result
      );
      result = await sendEmailWithTracking(
        baseEmailPayload,
        {
          emailType: "sendBloodAnalysisHtmlEmail",
          recipientEmail: email,
          recipientName: clientName,
          auditId: reportId,
          auditType: "BLOOD_ANALYSIS",
          metadata: {
            reportId,
            markerCount,
            orderRef: meta?.orderRef,
            attachmentName,
            retry: true,
          },
        }
      );
    }

    console.log(`[SendPulse] Blood HTML email sent to ${email}:`, result);
    const sent = result.result === true;
    await logBloodEmailDelivery({
      reportId,
      recipientEmail: email,
      clientName,
      orderRef: meta?.orderRef,
      status: sent ? "sent" : "failed",
      qualityPass: true,
      qualityChecks: {
        ...qualityGate.checks,
        qualityReasons: qualityGate.reasons,
      },
      sendpulseId: extractSendPulseDeliveryId(result),
      attachmentName,
      subject: String(baseEmailPayload.subject || ""),
      errorMessage: sent ? undefined : JSON.stringify(result),
      sentAt: sent ? new Date() : null,
    });
    return sent;
  } catch (error) {
    console.error("[SendPulse] Error sending blood HTML email:", error);
    try {
      await logBloodEmailDelivery({
        reportId,
        recipientEmail: email,
        clientName: meta?.clientName,
        orderRef: meta?.orderRef,
        status: "failed",
        qualityPass: false,
        qualityChecks: {},
        attachmentName: `Blood_Analysis_${reportId}.html`,
        subject: "Ton rapport Blood Analysis est pret - piece jointe HTML",
        errorMessage: error instanceof Error ? error.message : String(error),
      });
    } catch {
      // no-op
    }
    return false;
  }
}

export async function sendMagicLinkEmail(
  email: string,
  token: string,
  baseUrl: string
): Promise<boolean> {
  try {
    const magicLink = `${baseUrl}/auth/verify?token=${token}&email=${encodeURIComponent(email)}`;

    const content = `
      <h2 style="color: ${COLORS.text}; margin: 0 0 12px; font-size: 26px; text-align: center; font-weight: 700; letter-spacing: -0.5px;">
        Acces a ton espace ApexLabs
      </h2>

      <p style="color: ${COLORS.textMuted}; font-size: 16px; line-height: 1.7; margin: 0 0 24px; text-align: center;">
        Voici ton lien personnel pour acceder a tous tes dashboards (Discovery, Anabolic, Ultimate, Blood Analysis).
      </p>

      ${getPrimaryButton("Acceder a mon espace", magicLink)}

      <div style="margin: 24px 0 0; padding: 16px; background-color: ${COLORS.background}; border-radius: 10px; border: 1px solid ${COLORS.border};">
        <p style="color: ${COLORS.textMuted}; font-size: 13px; margin: 0 0 6px; text-align: center;">
          1. Clique sur le bouton
        </p>
        <p style="color: ${COLORS.textMuted}; font-size: 13px; margin: 0; text-align: center;">
          2. Tu arrives directement sur ton espace client
        </p>
      </div>

      <p style="color: ${COLORS.textMuted}; font-size: 13px; line-height: 1.6; margin: 20px 0 0; text-align: center;">
        Ce lien expire dans <strong style="color: ${COLORS.text};">60 minutes</strong>. Si tu n'as pas demande cet acces, ignore cet email.
      </p>

      <div style="margin-top: 18px; padding: 16px; background-color: ${COLORS.surface}; border-radius: 8px; border: 1px solid ${COLORS.border};">
        <p style="color: ${COLORS.textMuted}; font-size: 12px; margin: 0 0 8px; text-align: center;">
          Si le bouton ne fonctionne pas, copie ce lien :
        </p>
        <p style="margin: 0; text-align: center;">
          <a href="${magicLink}" style="color: ${COLORS.primary}; font-size: 11px; word-break: break-all;">${magicLink}</a>
        </p>
      </div>
    `;

    const emailContent = getEmailWrapper(
      content,
      `linear-gradient(135deg, ${COLORS.primary} 0%, #111827 100%)`,
      "Acces a ton espace",
      "Lien personnel"
    );

    const result = await sendEmailWithTracking(
      {
        subject: "Acces a ton espace ApexLabs",
        from: {
          name: SENDER_NAME,
          email: SENDER_EMAIL,
        },
        to: [{ email }],
        html: encodeBase64(emailContent),
        text: `Acces ApexLabs - Clique sur ce lien pour acceder a ton espace client : ${magicLink}`,
      },
      {
        emailType: "sendMagicLinkEmail",
        recipientEmail: email,
        metadata: { magicLinkToken: token, baseUrl },
      }
    );

    console.log(`[SendPulse] Email sent to ${email}:`, result);
    return result.result === true;
  } catch (error) {
    console.error("[SendPulse] Error sending email:", error);
    return false;
  }
}

export async function sendAdminEmailNewAudit(
  clientEmail: string,
  clientName: string,
  auditType: string,
  auditId: string
): Promise<boolean> {
  console.log(`[Admin Email] 🚀 Starting admin notification for audit ${auditId}`);
  try {
    const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || "coaching@achzodcoaching.com";
    console.log(`[Admin Email] Target admin email: ${adminEmail}`);
    console.log(`[Admin Email] Preparing email...`);
    const planLabel =
      auditType === "GRATUIT"
        ? "Discovery Scan"
        : auditType === "PREMIUM"
        ? "Anabolic Bioscan"
        : auditType === "ELITE"
        ? "Ultimate Scan"
        : auditType === "BLOOD_ANALYSIS"
        ? "Blood Analysis"
        : "Ultimate Scan";

    // Delivery window for each audit type (mirrors storage.ts DELIVERY_DELAYS_HOURS)
    // Discovery + Premium + Elite = 24h delay to batch-smooth inbox load + give
    // the cron pipeline a clean window. Blood + Burnout deliver immediately.
    const deliveryHours = (auditType === "GRATUIT" || auditType === "PREMIUM" || auditType === "ELITE") ? 24 : 0;
    const deliveryText = deliveryHours > 0
      ? `Email rapport programmé dans ${deliveryHours}h (livraison automatique).`
      : `Email rapport envoyé au client.`;

    const content = `
      <h2 style="color: ${COLORS.text}; margin: 0 0 24px; font-size: 24px; font-weight: 700;">
        Nouvelle analyse generee
      </h2>

      <div style="background: ${COLORS.background}; border-radius: 8px; padding: 20px; border: 1px solid ${COLORS.border};">
        <p style="color: ${COLORS.textMuted}; font-size: 14px; line-height: 1.8; margin: 0 0 8px;">
          <strong style="color: ${COLORS.text};">Profil:</strong> ${clientName}
        </p>
        <p style="color: ${COLORS.textMuted}; font-size: 14px; line-height: 1.8; margin: 0 0 8px;">
          <strong style="color: ${COLORS.text};">Email:</strong> ${clientEmail}
        </p>
        <p style="color: ${COLORS.textMuted}; font-size: 14px; line-height: 1.8; margin: 0 0 8px;">
          <strong style="color: ${COLORS.text};">Type:</strong> <span style="color: ${COLORS.primary}; font-weight: 600;">${planLabel}</span>
        </p>
        <p style="color: ${COLORS.textMuted}; font-size: 14px; line-height: 1.8; margin: 0;">
          <strong style="color: ${COLORS.text};">Audit ID:</strong> <code style="background: ${COLORS.border}; padding: 2px 6px; border-radius: 4px; font-size: 12px;">${auditId}</code>
        </p>
      </div>

      <p style="color: ${COLORS.primary}; font-size: 14px; line-height: 1.7; margin: 24px 0 0; text-align: center; font-weight: 500;">
        ${deliveryText}
      </p>
    `;

    const emailContent = getEmailWrapper(content);

    console.log(`[Admin Email] Calling SendPulse API for ${adminEmail}...`);
    const result = await sendEmailWithTracking(
      {
        html: encodeBase64(emailContent),
        text: `Nouvelle analyse ${planLabel} generee pour ${clientName} (${clientEmail}) - Audit ID: ${auditId}`,
        subject: `[ApexLabs] Nouvelle analyse ${planLabel} - ${clientName}`,
        from: {
          name: SENDER_NAME,
          email: SENDER_EMAIL,
        },
        to: [{ email: adminEmail }],
      },
      {
        emailType: "sendAdminEmailNewAudit",
        recipientEmail: adminEmail,
        auditId,
        auditType,
        metadata: { clientEmail, clientName, planLabel },
      }
    );

    console.log(`[SendPulse] Admin email sent to ${adminEmail}:`, result);
    return result.result === true;
  } catch (error) {
    console.error("[SendPulse] ❌ Error sending admin email:", error);
    return false;
  }
}

export async function sendCTAEmail(
  email: string,
  subject: string,
  message: string,
  customHtml?: string,
): Promise<boolean> {
  try {
    let emailContent: string;

    if (customHtml) {
      // Caller supplied a fully-formed HTML email (used by the abandonment
      // reminder, brand-aligned dark template). Skip the default CTA wrapper.
      emailContent = customHtml;
    } else {
      const content = `
        <h2 style="color: ${COLORS.text}; margin: 0 0 12px; font-size: 24px; text-align: center; font-weight: 700; letter-spacing: -0.5px;">
          Message important
        </h2>

        <p style="color: ${COLORS.textMuted}; font-size: 15px; line-height: 1.7; margin: 0 0 18px; text-align: center;">
          De la part d'Achzod
        </p>

        <div style="margin-top: 18px; padding: 18px; background-color: ${COLORS.surface}; border-radius: 10px; border: 1px solid ${COLORS.border};">
          ${message
            .split("\n")
            .map(
              (line) =>
                `<p style="color: ${COLORS.text}; font-size: 14px; line-height: 1.7; margin: 0 0 10px;">${line}</p>`
            )
            .join("")}
        </div>
      `;
      emailContent = getEmailWrapper(
        content,
        `linear-gradient(135deg, ${COLORS.primary} 0%, #0b0b0f 100%)`,
        "ApexLabs",
        "Message personnalisé"
      );
    }

    const result = await sendEmailWithTracking(
      {
        subject,
        from: {
          name: SENDER_NAME,
          email: SENDER_EMAIL,
        },
        to: [{ email }],
        html: encodeBase64(emailContent),
        text: message,
      },
      {
        emailType: "sendCTAEmail",
        recipientEmail: email,
        metadata: { customMessage: message.substring(0, 100) },
      }
    );

    return result.result === true;
  } catch (error) {
    console.error("[SendPulse] Error sending CTA email:", error);
    return false;
  }
}

export type RecoveryCtaCohort =
  | "clicked_no_conversion"
  | "clicked_help"
  | "abandon_high"
  | "abandon_medium"
  | "opened_no_click"
  | "apex_buyer"
  | "warm_report"
  | "abandon_last_chance"
  | "cold_base";

export type CoachingFormulaLeadInput = {
  tier?: string | null;
  profil?: string | null;
  objectif?: string | null;
  blessure_sante?: string | null;
  sommeil?: string | null;
  pourquoi_ce_choix?: string | null;
  date?: string | null;
};

const normalizeCoachingFormulaTier = (tier: unknown): {
  label: string;
  ctaLabel: string;
  urlTier?: "ESSENTIAL" | "ELITE" | "PRIVATELAB";
  content: string;
} => {
  const raw = String(tier || "").trim().toLowerCase();
  if (raw.includes("private")) {
    return {
      label: "Private Lab",
      ctaLabel: "Activer mon code sur Private Lab",
      urlTier: "PRIVATELAB",
      content: "private_lab",
    };
  }
  if (raw.includes("elite")) {
    return {
      label: "Elite",
      ctaLabel: "Activer mon code sur Elite",
      urlTier: "ELITE",
      content: "elite",
    };
  }
  if (raw.includes("essential")) {
    return {
      label: "Essential",
      ctaLabel: "Activer mon code sur Essential",
      urlTier: "ESSENTIAL",
      content: "essential",
    };
  }
  return {
    label: "formule adaptée",
    ctaLabel: "Comparer les formules",
    content: "compare",
  };
};

const compactEmailLine = (value: unknown, maxLength = 220): string => {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1).trim()}…`;
};

const escapeEmailHtml = (value: unknown): string =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

// Recovery CTA campaign after fixing the DISCOVERY30 checkout expectation.
// Every coaching link goes through the first-party click redirect so APEXLABS
// owns click attribution even if SendPulse click tracking is unavailable.
export async function sendRecoveryCtaEmail(
  email: string,
  opts: {
    cohort: RecoveryCtaCohort;
    baseUrl: string;
    trackingId: string;
    percentComplete?: number | null;
    resumeUrl?: string | null;
    expiresText?: string;
    recoveryClickFollowup?: {
      idempotencyKey: string;
      sourceTrackingId: string;
      claimAttempt: number;
    };
    beforeProviderPost?: (context: {
      recipientEmail: string;
      subject: string;
      startedAt: Date;
    }) => Promise<void>;
  }
): Promise<boolean> {
  try {
    const cohort = opts.cohort;
    const campaign = "recovery_cta_2026_06";
    // Recovery contacts get one concrete recommendation instead of a six-offer
    // decision wall. The bridge still exposes a comparison link if they need it.
    const coachingUrl = discoveryCoachingBridgeUrl(opts.baseUrl, campaign, cohort, "ESSENTIAL");
    const trackedCoachingUrl = withEmailClickTracking(opts.baseUrl, opts.trackingId, coachingUrl);
    const trackingPixel = `${opts.baseUrl}/api/track/email/${opts.trackingId}/open.gif`;
    const safePercent = typeof opts.percentComplete === "number" && Number.isFinite(opts.percentComplete)
      ? Math.max(0, Math.min(99, Math.round(opts.percentComplete)))
      : null;
    const resumeUrl = opts.resumeUrl || null;
    const trackedPrimaryUrl = cohort.startsWith("abandon_") && resumeUrl ? resumeUrl : trackedCoachingUrl;

    const subjectByCohort: Record<RecoveryCtaCohort, string> = {
      clicked_no_conversion: "DISCOVERY30 : le checkout est clair maintenant",
      clicked_help: "Tu hesites sur la formule ?",
      abandon_high: "Ton Discovery est presque fini",
      abandon_medium: "Reprends ton Discovery cette semaine",
      opened_no_click: "Je reprends ton dossier Discovery",
      apex_buyer: "Ton audit peut devenir ton plan coaching",
      warm_report: "Ton Discovery, la suite concrète",
      abandon_last_chance: "Ton scan est encore sauvegardé",
      cold_base: "Ton Discovery, et maintenant ?",
    };

    const introByCohort: Record<RecoveryCtaCohort, string> = {
      clicked_no_conversion:
        "Tu avais cliqué mais tu n'es pas allé au bout. Je remets le lien proprement : le code n'est pas automatique, il faut le coller dans le champ Code promotionnel au checkout.",
      clicked_help:
        "Tu as cliqué sur le coaching mais tu n'es pas allé au bout. Pour faire simple, Essential est le point de départ le plus logique : suivi hebdomadaire, plan d'entraînement et nutrition ajustés. Si tu veux un suivi plus rapproché, ou si le budget ou le code bloque, réponds à ce mail.",
      abandon_high:
        `Tu étais à ${safePercent ?? "plus de 75"}% du questionnaire. Ton scan est sauvegardé, reprends-le d'abord : derrière, je te garde DISCOVERY30 pour passer au coaching si tu veux appliquer le plan.`,
      abandon_medium:
        `Tu avais commencé ton Discovery${safePercent !== null ? ` et tu étais à ${safePercent}%` : ""}. Finis-le, récupère ton rapport, puis utilise DISCOVERY30 si tu veux que je transforme le diagnostic en plan concret.`,
      opened_no_click:
        "Tu as ouvert une relance mais tu n'as pas cliqué. Je te remets la suite simplement : si tu veux que le Discovery devienne un vrai plan semaine après semaine, c'est le coaching.",
      apex_buyer:
        "Tu as déjà fait un audit APEXLABS. Les données seules ne transforment pas un corps : le coaching sert à appliquer, ajuster et tenir le plan.",
      warm_report:
        "Tu as ton Discovery. Maintenant la vraie question, c'est l'application : nutrition, entraînement, suivi hebdo, ajustements quand ça bloque.",
      abandon_last_chance:
        "Ton questionnaire est encore sauvegardé. Si tu veux reprendre proprement, fais-le maintenant puis garde DISCOVERY30 pour le coaching.",
      cold_base:
        "Je reprends les dossiers Discovery cette semaine. Si tu veux passer du rapport à un plan suivi, je te remets l'accès coaching avec DISCOVERY30.",
    };

    const primaryLabel = cohort.startsWith("abandon_") && resumeUrl
      ? "Reprendre mon Discovery"
      : "Voir Essential avec -30%";

    const content = `
      ${getDiscoveryPromoBanner()}

      <p style="color:${APPLE_COLORS.inkSoft};font-size:16px;line-height:1.65;margin:0 0 20px;">
        ${escapeEmailHtml(introByCohort[cohort])}
      </p>

      <div style="padding:18px 20px;background:#f5f5f7;border-radius:12px;margin:0 0 22px;">
        <p style="color:${APPLE_COLORS.ink};font-size:15px;line-height:1.65;margin:0;">
          <strong>Important :</strong> au paiement sur AchzodCoaching, colle
          <strong>DISCOVERY30</strong> dans le champ <strong>Code promotionnel ?</strong>.
          Le code est actuellement actif sur les formules coaching 8 et 12 semaines.
        </p>
      </div>

      ${getCoachingAppleButton(primaryLabel, trackedPrimaryUrl)}

      ${cohort.startsWith("abandon_") && resumeUrl ? `
      <p style="color:${APPLE_COLORS.muted};font-size:13px;line-height:1.55;margin:12px 0 0;text-align:center;">
        Déjà prêt pour le coaching ? <a href="${trackedCoachingUrl}" style="color:${APPLE_COLORS.accent};text-decoration:none;font-weight:600;">Voir Essential avec -30%</a>
      </p>
      ` : ""}

      <p style="color:${APPLE_COLORS.inkSoft};font-size:14px;line-height:1.65;margin:26px 0 0;">
        Si tu bloques sur le choix de la formule, réponds simplement à ce mail avec ton objectif et je te dis quoi prendre.
      </p>

      <p style="color:${APPLE_COLORS.muted};font-size:12px;margin:24px 0 0;">
        Achzod
      </p>

      <img src="${trackingPixel}" width="1" height="1" style="display:none;" alt="" />
    `;

    const emailContent = getCoachingAppleWrapper(
      content,
      cohort.startsWith("abandon_") ? "Ton Discovery est sauvegardé" : "DISCOVERY30 est actif",
      "Code à coller au checkout"
    );

    const plainText = `${introByCohort[cohort]}

Code DISCOVERY30 : -30% sur formules coaching 8 et 12 semaines, actuellement actif.
Au paiement, copie DISCOVERY30 dans le champ "Code promotionnel ?".

${cohort.startsWith("abandon_") && resumeUrl ? `Reprendre mon Discovery : ${resumeUrl}\nVoir Essential avec -30% : ${trackedCoachingUrl}` : `Voir Essential avec -30% : ${trackedCoachingUrl}`}

Si tu bloques sur le choix de la formule, réponds simplement à ce mail avec ton objectif.

Achzod`;

    const result = await sendEmailWithTracking(
      {
        subject: subjectByCohort[cohort],
        from: { name: "Achzod Coaching", email: SENDER_EMAIL },
        to: [{ email }],
        html: encodeBase64(emailContent),
        text: plainText,
      },
      {
        emailType: "sendRecoveryCtaEmail",
        recipientEmail: email,
        metadata: {
          trackingId: opts.trackingId,
          cohort,
          promoCode: "DISCOVERY30",
          coachingUrl,
          trackedCoachingUrl,
          resumeUrl,
          campaign,
          ...(opts.recoveryClickFollowup
            ? {
                recoveryClickFollowupKey: opts.recoveryClickFollowup.idempotencyKey,
                sourceTrackingId: opts.recoveryClickFollowup.sourceTrackingId,
                claimAttempt: opts.recoveryClickFollowup.claimAttempt,
              }
            : {}),
        },
        beforeProviderPost: opts.beforeProviderPost,
      }
    );

    return result.result === true;
  } catch (error) {
    console.error("[SendPulse] Error sending recovery CTA email:", error);
    return false;
  }
}

export async function sendCoachingFormulaChoiceLeadEmail(
  email: string,
  lead: CoachingFormulaLeadInput,
  opts: {
    baseUrl: string;
    trackingId: string;
    expiresText?: string;
  }
): Promise<boolean> {
  try {
    const tier = normalizeCoachingFormulaTier(lead.tier);
    const campaign = "coaching_formula_choice_2026_07";
    const expiresText = opts.expiresText || "5 jours";
    const coachingUrl = discoveryCoachingBridgeUrl(opts.baseUrl, campaign, tier.content, tier.urlTier);
    const trackedCoachingUrl = withEmailClickTracking(opts.baseUrl, opts.trackingId, coachingUrl);
    const trackingPixel = `${opts.baseUrl}/api/track/email/${opts.trackingId}/open.gif`;
    const deadlineDate = formatDeadlineFR(5);

    const objective = compactEmailLine(lead.objectif, 260);
    const profile = compactEmailLine(lead.profil, 180);
    const sleep = compactEmailLine(lead.sommeil, 180);
    const reason = compactEmailLine(lead.pourquoi_ce_choix, 520);

    const contextRows = [
      objective ? `<p style="margin:0 0 8px;color:${APPLE_COLORS.inkSoft};font-size:14px;line-height:1.55;"><strong style="color:${APPLE_COLORS.ink};">Objectif :</strong> ${escapeEmailHtml(objective)}</p>` : "",
      profile ? `<p style="margin:0 0 8px;color:${APPLE_COLORS.inkSoft};font-size:14px;line-height:1.55;"><strong style="color:${APPLE_COLORS.ink};">Profil :</strong> ${escapeEmailHtml(profile)}</p>` : "",
      sleep ? `<p style="margin:0;color:${APPLE_COLORS.inkSoft};font-size:14px;line-height:1.55;"><strong style="color:${APPLE_COLORS.ink};">Sommeil/énergie :</strong> ${escapeEmailHtml(sleep)}</p>` : "",
    ].filter(Boolean).join("");

    const content = `
      ${getDiscoveryPromoBanner(5)}

      <p style="color:${APPLE_COLORS.inkSoft};font-size:16px;line-height:1.65;margin:0 0 18px;">
        Tu as rempli le questionnaire pour choisir ta formule de coaching. Je te relance parce que ton profil est déjà qualifié, il ne manque plus que la décision.
      </p>

      <div style="padding:20px 22px;background:#e8f4ff;border-radius:12px;border-left:3px solid ${APPLE_COLORS.accent};margin:0 0 24px;">
        <p style="color:${APPLE_COLORS.accent};font-size:11px;text-transform:uppercase;letter-spacing:1.5px;margin:0 0 6px;font-weight:700;">
          Formule recommandée
        </p>
        <p style="color:${APPLE_COLORS.ink};font-size:24px;font-weight:800;margin:0 0 10px;letter-spacing:-0.3px;">
          ${escapeEmailHtml(tier.label)}
        </p>
        ${reason ? `<p style="color:${APPLE_COLORS.inkSoft};font-size:14px;line-height:1.65;margin:0;">${escapeEmailHtml(reason)}</p>` : ""}
      </div>

      ${contextRows ? `
      <div style="padding:16px 18px;background:#f5f5f7;border-radius:12px;margin:0 0 24px;">
        ${contextRows}
      </div>
      ` : ""}

      <p style="color:${APPLE_COLORS.ink};font-size:16px;line-height:1.65;margin:0 0 10px;font-weight:600;">
        Si tu veux que je transforme ça en plan concret semaine après semaine, prends ta place maintenant.
      </p>
      <p style="color:${APPLE_COLORS.inkSoft};font-size:14px;line-height:1.65;margin:0 0 20px;">
        Le code <strong style="color:${APPLE_COLORS.ink};">DISCOVERY30</strong> retire 30% sur les formules coaching 8 et 12 semaines. Il reste ${escapeEmailHtml(expiresText)}.
      </p>

      ${getCoachingAppleButton(tier.ctaLabel, trackedCoachingUrl)}

      <p style="color:${APPLE_COLORS.muted};font-size:12px;line-height:1.55;margin:18px 0 0;text-align:center;">
        Code valable jusqu'au <strong style="color:${APPLE_COLORS.ink};">${deadlineDate}</strong>. Au checkout, copie <strong style="color:${APPLE_COLORS.ink};">DISCOVERY30</strong> dans le champ "Code promotionnel ?".
      </p>

      <div style="padding:14px 18px;background:#f5f5f7;border-radius:10px;text-align:center;margin:24px 0 14px;">
        <p style="color:${APPLE_COLORS.inkSoft};font-size:13px;margin:0;line-height:1.6;">
          Si tu hésites encore, réponds simplement à ce mail avec ton blocage : budget, timing, formule, blessure, ou autre. Je te réponds directement.
        </p>
      </div>

      <p style="color:${APPLE_COLORS.muted};font-size:12px;margin:24px 0 0;">
        Achzod
      </p>

      <img src="${trackingPixel}" width="1" height="1" style="display:none;" alt="" />
    `;

    const emailContent = getCoachingAppleWrapper(
      content,
      `${tier.label} avec DISCOVERY30`,
      `Tu as rempli le choix de formule, il reste ${expiresText}`
    );

    const plainParts = [
      `Tu as rempli le questionnaire pour choisir ta formule de coaching.`,
      `Formule recommandée : ${tier.label}.`,
      objective ? `Objectif : ${objective}` : "",
      reason ? `Pourquoi : ${reason}` : "",
      "",
      `Code DISCOVERY30 : -30% sur les formules coaching 8 et 12 semaines, valable ${expiresText}.`,
      `Choisir ma formule : ${trackedCoachingUrl}`,
      "",
      `Au checkout, copie DISCOVERY30 dans le champ "Code promotionnel ?".`,
      `Si tu hésites encore, réponds à ce mail avec ton blocage : budget, timing, formule, blessure, ou autre.`,
      "",
      "Achzod",
    ].filter((part) => part !== "");

    const result = await sendEmailWithTracking(
      {
        subject: `${tier.label} : ta formule coaching recommandée`,
        from: { name: "Achzod Coaching", email: SENDER_EMAIL },
        to: [{ email }],
        html: encodeBase64(emailContent),
        text: plainParts.join("\n"),
      },
      {
        emailType: "sendCoachingFormulaChoiceLeadEmail",
        recipientEmail: email,
        metadata: {
          trackingId: opts.trackingId,
          promoCode: "DISCOVERY30",
          campaign,
          recommendedTier: tier.label,
          rawTier: lead.tier || null,
          coachingUrl,
          trackedCoachingUrl,
          formulaLeadDate: lead.date || null,
        },
      }
    );

    return result.result === true;
  } catch (error) {
    console.error("[SendPulse] Error sending coaching formula choice lead email:", error);
    return false;
  }
}

// Reactivation campaign for warm-but-blocked Discovery leads.
// Opened their report, never bought, are still within reach.
// Sends: coaching ANALYSE20 + APEX30 all-site (focus Peptides with sourcing urgency).
export async function sendReactivationCampaignEmail(
  email: string,
  opts: { apexPromoCode?: string; coachingPromoCode?: string; expiresText?: string } = {}
): Promise<boolean> {
  try {
    const APEX_CODE = opts.apexPromoCode || "APEX30";
    const COACHING_CODE = opts.coachingPromoCode || "ANALYSE20";
    const EXPIRES = opts.expiresText || "7 jours";

    const peptidesHref = `https://apexlabs.achzodcoaching.com/peptides-engine?promo=${APEX_CODE}`;
    const ultimateHref = `https://apexlabs.achzodcoaching.com/audit-complet/checkout?plan=ultimate&promo=${APEX_CODE}`;
    const bloodHref = `https://apexlabs.achzodcoaching.com/blood-analysis?promo=${APEX_CODE}`;
    const anabolicHref = `https://apexlabs.achzodcoaching.com/audit-complet/checkout?plan=anabolic&promo=${APEX_CODE}`;
    const coachingHref = "https://www.achzodcoaching.com/";

    const miniProductRow = (label: string, subtitle: string, oldPrice: string, newPrice: string, href: string, accent: string) => `
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin: 0 0 12px 0; background: ${COLORS.surface}; border: 1px solid ${COLORS.border}; border-left: 3px solid ${accent}; border-radius: 10px;">
        <tr>
          <td style="padding: 16px 18px;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
              <tr>
                <td style="vertical-align: middle;">
                  <p style="margin: 0 0 4px 0; color: ${COLORS.text}; font-size: 15px; font-weight: 700; letter-spacing: -0.2px;">${label}</p>
                  <p style="margin: 0; color: ${COLORS.textMuted}; font-size: 12px; line-height: 1.5;">${subtitle}</p>
                </td>
                <td align="right" style="vertical-align: middle; white-space: nowrap; padding-left: 12px;">
                  <p style="margin: 0 0 2px 0; color: ${COLORS.textMuted}; font-size: 11px; text-decoration: line-through;">${oldPrice}</p>
                  <p style="margin: 0 0 6px 0; color: ${accent}; font-size: 18px; font-weight: 800;">${newPrice}</p>
                  <a href="${href}" style="display: inline-block; background: ${accent}; color: #000000; font-size: 11px; font-weight: 700; padding: 6px 14px; border-radius: 6px; text-decoration: none; text-transform: uppercase; letter-spacing: 0.4px;">Prendre</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>`;

    const content = `
      <!-- Opening hook -->
      <p style="color: ${COLORS.textMuted}; font-size: 13px; text-align: center; margin: 0 0 8px 0; letter-spacing: 0.5px; text-transform: uppercase; font-weight: 600;">Relance personnelle</p>
      <h2 style="color: ${COLORS.text}; margin: 0 0 20px 0; font-size: 26px; line-height: 1.25; text-align: center; font-weight: 800; letter-spacing: -0.6px;">
        Ca fait quelques semaines depuis ton Discovery.<br/>Et pas de suite.
      </h2>
      <p style="color: ${COLORS.textMuted}; font-size: 15px; line-height: 1.7; margin: 0 0 12px 0;">
        Sans juger, j'essaie juste de comprendre. Une seule question :
      </p>
      <p style="color: ${COLORS.text}; font-size: 17px; line-height: 1.5; margin: 0 0 12px 0; font-weight: 700;">
        Qu'est-ce qui t'a bloque ?
      </p>
      <p style="color: ${COLORS.textMuted}; font-size: 14px; line-height: 1.7; margin: 0 0 8px 0;">
        Reponds en 1 ligne. Prix ? Pas le bon moment ? Rapport pas convaincant ? Autre chose ? Ca m'aide enormement.
      </p>

      <!-- Divider -->
      <div style="height: 1px; background: ${COLORS.border}; margin: 32px 0;"></div>

      <p style="color: ${COLORS.textMuted}; font-size: 13px; text-align: center; margin: 0 0 20px 0; letter-spacing: 0.5px; text-transform: uppercase; font-weight: 600;">Si tu veux reprendre , ${EXPIRES}</p>

      <!-- BLOCK 1: Coaching -->
      <div style="margin: 0 0 28px 0; padding: 24px 22px; background: linear-gradient(135deg, rgba(139, 92, 246, 0.12) 0%, rgba(139, 92, 246, 0.03) 100%); border-radius: 14px; border: 1px solid rgba(139, 92, 246, 0.25);">
        <p style="margin: 0 0 4px 0; color: ${COLORS.purple}; font-size: 11px; letter-spacing: 1.5px; text-transform: uppercase; font-weight: 700;">Option 1</p>
        <h3 style="margin: 0 0 10px 0; color: ${COLORS.text}; font-size: 20px; font-weight: 800; letter-spacing: -0.3px;">Coaching Achzod , -20%</h3>
        <p style="margin: 0 0 16px 0; color: ${COLORS.textMuted}; font-size: 14px; line-height: 1.65;">
          Si ton objectif c'est de passer a l'action (pas juste lire des rapports), c'est la que ca se joue. Essential, Elite, Private Lab , tous les formats.
        </p>
        <div style="display: inline-block; padding: 8px 14px; background: rgba(139, 92, 246, 0.15); border: 1px dashed ${COLORS.purple}; border-radius: 8px; margin-bottom: 6px;">
          <span style="color: ${COLORS.textMuted}; font-size: 11px; letter-spacing: 1px; text-transform: uppercase;">Code : </span>
          <span style="color: ${COLORS.text}; font-size: 16px; font-weight: 800; letter-spacing: 1.5px;">${COACHING_CODE}</span>
        </div>
        ${getPrimaryButton('Voir les formules coaching', coachingHref, COLORS.purple)}
      </div>

      <!-- BLOCK 2: APEX30 site-wide -->
      <div style="margin: 0 0 20px 0; padding: 24px 22px; background: linear-gradient(135deg, rgba(252, 221, 0, 0.10) 0%, rgba(252, 221, 0, 0.02) 100%); border-radius: 14px; border: 1px solid ${COLORS.border};">
        <p style="margin: 0 0 4px 0; color: ${COLORS.primary}; font-size: 11px; letter-spacing: 1.5px; text-transform: uppercase; font-weight: 700;">Option 2</p>
        <h3 style="margin: 0 0 10px 0; color: ${COLORS.text}; font-size: 20px; font-weight: 800; letter-spacing: -0.3px;">Tout le site APEXLABS , -30%</h3>
        <div style="display: inline-block; padding: 8px 14px; background: rgba(252, 221, 0, 0.12); border: 1px dashed ${COLORS.primary}; border-radius: 8px; margin-bottom: 20px;">
          <span style="color: ${COLORS.textMuted}; font-size: 11px; letter-spacing: 1px; text-transform: uppercase;">Code : </span>
          <span style="color: ${COLORS.primary}; font-size: 16px; font-weight: 800; letter-spacing: 1.5px;">${APEX_CODE}</span>
        </div>

        <!-- Urgency Peptides -->
        <div style="margin: 0 0 20px 0; padding: 20px; background: linear-gradient(135deg, rgba(245, 158, 11, 0.14) 0%, rgba(239, 68, 68, 0.06) 100%); border-radius: 12px; border: 2px solid ${COLORS.warning};">
          <p style="margin: 0 0 4px 0; color: ${COLORS.warning}; font-size: 10px; letter-spacing: 1.8px; text-transform: uppercase; font-weight: 800;">&#9888; Source bientot coupee</p>
          <h4 style="margin: 0 0 8px 0; color: ${COLORS.text}; font-size: 19px; font-weight: 800; letter-spacing: -0.3px;">Peptides Engine</h4>
          <p style="margin: 0 0 12px 0; color: ${COLORS.textMuted}; font-size: 13.5px; line-height: 1.65;">
            Mon produit le plus puissant : protocole peptides base sur <strong style="color: ${COLORS.text};">mes sources direct fournisseur</strong> , les memes que j'utilise, testees, doses exactes. Mes contacts me disent qu'ils vont restreindre l'acces a un cercle ferme. Si t'attends 6 mois, je peux plus te garantir la meme orientation.
          </p>
          <p style="margin: 0 0 4px 0;">
            <span style="color: ${COLORS.textMuted}; font-size: 12px; text-decoration: line-through;">299EUR</span>
            <span style="color: ${COLORS.warning}; font-size: 22px; font-weight: 800; margin-left: 8px;">209EUR</span>
          </p>
          <p style="margin: 0 0 4px 0; color: ${COLORS.textMuted}; font-size: 12px; line-height: 1.6;">
            + <strong style="color: ${COLORS.text};">150EUR deduits</strong> si tu passes ensuite sur Elite ou Private Lab.
          </p>
          ${getPrimaryButton('Je prends Peptides Engine', peptidesHref, COLORS.warning)}
        </div>

        <p style="margin: 0 0 12px 0; color: ${COLORS.textMuted}; font-size: 12px; letter-spacing: 1px; text-transform: uppercase; font-weight: 600;">Ou les autres scans , tous -20%</p>

        ${miniProductRow('Ultimate Scan', '18 sections + posture + wearables + plan nutrition/training sur-mesure', '79EUR', '55EUR', ultimateHref, COLORS.purple)}
        ${miniProductRow('Blood Analysis', '39 biomarqueurs : hormones, thyroide, metabolisme, inflammation, vitamines', '99EUR', '69EUR', bloodHref, COLORS.blood)}
        ${miniProductRow('Anabolic Bioscan', 'Scan hormonal cible : testo, cortisol, thyroide, potentiel anabolique', '59EUR', '41EUR', anabolicHref, COLORS.anabolic)}
      </div>

      <!-- Deduction recap -->
      <div style="margin: 24px 0 0 0; padding: 18px; background: ${COLORS.surface}; border-radius: 10px; border: 1px solid ${COLORS.border};">
        <p style="margin: 0 0 10px 0; color: ${COLORS.text}; font-size: 13px; font-weight: 700;">Rappel deduction coaching</p>
        <p style="margin: 0 0 6px 0; color: ${COLORS.textMuted}; font-size: 12.5px; line-height: 1.8;">&bull; Peptides Engine : <strong style="color: ${COLORS.text};">-150EUR</strong> sur Elite / Private Lab</p>
        <p style="margin: 0 0 6px 0; color: ${COLORS.textMuted}; font-size: 12.5px; line-height: 1.8;">&bull; Ultimate Scan : <strong style="color: ${COLORS.text};">-79EUR</strong> sur tout coaching</p>
        <p style="margin: 0 0 6px 0; color: ${COLORS.textMuted}; font-size: 12.5px; line-height: 1.8;">&bull; Blood Analysis : <strong style="color: ${COLORS.text};">-99EUR</strong> sur tout coaching</p>
        <p style="margin: 0 0 10px 0; color: ${COLORS.textMuted}; font-size: 12.5px; line-height: 1.8;">&bull; Anabolic Bioscan : <strong style="color: ${COLORS.text};">-59EUR</strong> sur tout coaching</p>
        <p style="margin: 0; color: ${COLORS.textMuted}; font-size: 12px; font-style: italic;">C'est un acompte, pas un supplement.</p>
      </div>

      <p style="color: ${COLORS.textMuted}; font-size: 12px; text-align: center; margin: 24px 0 0 0;">
        Les codes expirent le 30/04. Apres c'est plein tarif.
      </p>
      <p style="color: ${COLORS.text}; font-size: 14px; margin: 20px 0 0 0; font-weight: 600;">Achzod</p>
    `;

    const emailContent = getEmailWrapper(
      content,
      `linear-gradient(135deg, ${COLORS.primary} 0%, #d4a017 100%)`,
      "Une derniere chance",
      `Code ${APEX_CODE} , -30% tout le site (${EXPIRES})`
    );

    const plainText = `Ca fait quelques semaines depuis ton Discovery APEXLABS et tu n'as pas pris la suite. Qu'est-ce qui t'a bloque ? Reponds en 1 ligne, ca m'aide enormement.

Si tu veux reprendre, 2 codes pendant ${EXPIRES} :
1. COACHING ACHZOD , -20% avec le code ${COACHING_CODE} : ${coachingHref}
2. TOUT LE SITE APEXLABS , -30% avec le code ${APEX_CODE}

Focus Peptides Engine (209EUR au lieu de 299EUR + -150EUR deduits du coaching Elite/Private Lab apres) : ${peptidesHref}
Ultimate Scan (55EUR au lieu de 79EUR) : ${ultimateHref}
Blood Analysis (69EUR au lieu de 99EUR) : ${bloodHref}
Anabolic Bioscan (41EUR au lieu de 59EUR) : ${anabolicHref}

Sources Peptides bientot coupees (mes contacts vont restreindre l'acces a un cercle ferme). Les codes expirent le 30/04.

Achzod`;

    const result = await sendEmailWithTracking(
      {
        subject: "Ton Discovery , et apres ?",
        from: { name: SENDER_NAME, email: SENDER_EMAIL },
        to: [{ email }],
        html: encodeBase64(emailContent),
        text: plainText,
      },
      {
        emailType: "sendReactivationCampaignEmail",
        recipientEmail: email,
        metadata: { apexCode: APEX_CODE, coachingCode: COACHING_CODE },
      }
    );

    return result.result === true;
  } catch (error) {
    console.error("[SendPulse] Error sending reactivation campaign email:", error);
    return false;
  }
}

// Abandoner campaign: people who started the Discovery questionnaire but never
// finished it. Primary CTA: resume the free scan (2 min to complete). Soft
// secondary mention of the APEX30 code if they'd rather skip ahead.
export async function sendFinishDiscoveryEmail(
  email: string,
  opts: { apexPromoCode?: string; expiresText?: string } = {}
): Promise<boolean> {
  try {
    const APEX_CODE = opts.apexPromoCode || "APEX30";
    const EXPIRES = opts.expiresText || "7 jours";
    const resumeHref = `https://apexlabs.achzodcoaching.com/audit-complet/questionnaire`;
    const peptidesHref = `https://apexlabs.achzodcoaching.com/peptides-engine?promo=${APEX_CODE}`;

    const content = `
      <p style="color: ${COLORS.textMuted}; font-size: 13px; text-align: center; margin: 0 0 8px 0; letter-spacing: 0.5px; text-transform: uppercase; font-weight: 600;">Rappel personnel</p>
      <h2 style="color: ${COLORS.text}; margin: 0 0 20px 0; font-size: 26px; line-height: 1.25; text-align: center; font-weight: 800; letter-spacing: -0.6px;">
        Il te reste 2 minutes pour finir ton scan gratuit.
      </h2>
      <p style="color: ${COLORS.textMuted}; font-size: 15px; line-height: 1.7; margin: 0 0 14px 0;">
        T'as commence ton Discovery APEXLABS il y a quelques jours mais tu n'es pas alle au bout. Zero pression , juste un rappel : ton rapport personnalise t'attend a la fin. Gratuit, 66 questions, 2 a 3 min.
      </p>
      <p style="color: ${COLORS.textMuted}; font-size: 14px; line-height: 1.7; margin: 0 0 22px 0;">
        Ton rapport te donne 10 domaines analyses (energie, sommeil, hormones, recup, stress, nutrition, etc.), une priorisation des points a travailler, et les scans payants qui te correspondent si tu veux aller plus profond.
      </p>

      <!-- Primary CTA: resume -->
      <div style="margin: 0 0 24px 0; padding: 22px; background: linear-gradient(135deg, rgba(34, 211, 238, 0.12) 0%, rgba(34, 211, 238, 0.03) 100%); border-radius: 14px; border: 1px solid rgba(34, 211, 238, 0.25); text-align: center;">
        <p style="margin: 0 0 6px 0; color: ${COLORS.discovery}; font-size: 11px; letter-spacing: 1.5px; text-transform: uppercase; font-weight: 700;">Gratuit , 2 min</p>
        <h3 style="margin: 0 0 8px 0; color: ${COLORS.text}; font-size: 20px; font-weight: 800; letter-spacing: -0.3px;">Reprends ou refais ton Discovery</h3>
        <p style="margin: 0 0 4px 0; color: ${COLORS.textMuted}; font-size: 13px; line-height: 1.6;">
          Tu reprends la ou tu t'etais arrete , ou tu repars de zero si tu veux.
        </p>
        ${getPrimaryButton('Finir mon scan gratuit', resumeHref, COLORS.discovery)}
      </div>

      <!-- Divider -->
      <div style="height: 1px; background: ${COLORS.border}; margin: 28px 0;"></div>

      <!-- Soft secondary -->
      <p style="color: ${COLORS.textMuted}; font-size: 12px; text-align: center; margin: 0 0 10px 0; letter-spacing: 0.5px; text-transform: uppercase; font-weight: 600;">Ou si tu veux skip l'etape du scan gratuit</p>
      <p style="color: ${COLORS.textMuted}; font-size: 14px; line-height: 1.7; margin: 0 0 14px 0;">
        J'ouvre le code <strong style="color: ${COLORS.primary};">${APEX_CODE}</strong> pendant ${EXPIRES} : -30% sur tout le site APEXLABS. Le plus puissant c'est le Peptides Engine (protocole base sur mes sources direct fournisseur) , 209EUR au lieu de 299EUR, et -150EUR deduits du coaching Elite/Private Lab apres.
      </p>
      ${getPrimaryButton('Voir Peptides Engine (-30%)', peptidesHref, COLORS.primary)}

      <p style="color: ${COLORS.textMuted}; font-size: 12px; text-align: center; margin: 24px 0 0 0;">
        Code valable jusqu'au 30/04.
      </p>
      <p style="color: ${COLORS.text}; font-size: 14px; margin: 20px 0 0 0; font-weight: 600;">Achzod</p>
    `;

    const emailContent = getEmailWrapper(
      content,
      `linear-gradient(135deg, ${COLORS.discovery} 0%, #0891b2 100%)`,
      "Ton scan t'attend",
      "66 questions , 2 minutes , gratuit"
    );

    const plainText = `Il te reste 2 minutes pour finir ton Discovery APEXLABS gratuit. Tu reprends la ou tu t'etais arrete. 66 questions, 10 domaines analyses, rapport personnalise immediat.

Finir mon scan : ${resumeHref}

Ou si tu veux skip et aller direct a l'action : code ${APEX_CODE} (-30% tout le site pendant ${EXPIRES}). Focus Peptides Engine 209EUR au lieu de 299EUR + -150EUR deduits du coaching Elite/Private Lab apres : ${peptidesHref}

Code valable jusqu'au 30/04.

Achzod`;

    const result = await sendEmailWithTracking(
      {
        subject: "Il te reste 2 min pour finir ton scan gratuit",
        from: { name: SENDER_NAME, email: SENDER_EMAIL },
        to: [{ email }],
        html: encodeBase64(emailContent),
        text: plainText,
      },
      {
        emailType: "sendFinishDiscoveryEmail",
        recipientEmail: email,
        metadata: { apexCode: APEX_CODE },
      }
    );
    return result.result === true;
  } catch (error) {
    console.error("[SendPulse] Error sending finish-discovery email:", error);
    return false;
  }
}

// Cross-sell campaign: clients who already paid for at least one APEX product.
// Warm buyers ,  primary CTA is coaching (where real transformation happens),
// secondary CTA is Peptides Engine for those who bought a scan only.
export async function sendCrossSellUpgradeEmail(
  email: string,
  opts: { apexPromoCode?: string; coachingPromoCode?: string; expiresText?: string } = {}
): Promise<boolean> {
  try {
    const APEX_CODE = opts.apexPromoCode || "APEX30";
    const COACHING_CODE = opts.coachingPromoCode || "ANALYSE20";
    const EXPIRES = opts.expiresText || "7 jours";
    const coachingHref = "https://www.achzodcoaching.com/";
    const peptidesHref = `https://apexlabs.achzodcoaching.com/peptides-engine?promo=${APEX_CODE}`;

    const content = `
      <p style="color: ${COLORS.textMuted}; font-size: 13px; text-align: center; margin: 0 0 8px 0; letter-spacing: 0.5px; text-transform: uppercase; font-weight: 600;">Entre nous , deja client</p>
      <h2 style="color: ${COLORS.text}; margin: 0 0 20px 0; font-size: 26px; line-height: 1.25; text-align: center; font-weight: 800; letter-spacing: -0.6px;">
        Tu as fait le scan.<br/>Voici l'etape d'apres.
      </h2>
      <p style="color: ${COLORS.textMuted}; font-size: 15px; line-height: 1.75; margin: 0 0 14px 0;">
        Tu as deja passe le cap de prendre un audit APEXLABS , merci pour ta confiance. Mais les datas seules ne transforment pas un corps. Ce qui transforme, c'est la mise en application, les bons protocoles, le suivi.
      </p>
      <p style="color: ${COLORS.textMuted}; font-size: 15px; line-height: 1.75; margin: 0 0 22px 0;">
        Deux chemins pour toi selon ou tu en es :
      </p>

      <!-- BLOCK 1: Coaching -->
      <div style="margin: 0 0 24px 0; padding: 24px 22px; background: linear-gradient(135deg, rgba(139, 92, 246, 0.14) 0%, rgba(139, 92, 246, 0.04) 100%); border-radius: 14px; border: 1px solid rgba(139, 92, 246, 0.28);">
        <p style="margin: 0 0 4px 0; color: ${COLORS.purple}; font-size: 11px; letter-spacing: 1.5px; text-transform: uppercase; font-weight: 700;">Chemin 1 , le plus direct</p>
        <h3 style="margin: 0 0 10px 0; color: ${COLORS.text}; font-size: 20px; font-weight: 800; letter-spacing: -0.3px;">Coaching Achzod , -20% avec ${COACHING_CODE}</h3>
        <p style="margin: 0 0 12px 0; color: ${COLORS.textMuted}; font-size: 14px; line-height: 1.65;">
          L'audit te dit quoi faire. Le coaching te tient la main pour le faire. Essential, Elite, Private Lab , tu choisis le format qui te colle.
        </p>
        <p style="margin: 0 0 14px 0; color: ${COLORS.text}; font-size: 13.5px; line-height: 1.7; font-weight: 600;">
          Rappel : le montant de ton audit est deduit du coaching. C'est un acompte.
        </p>
        <div style="display: inline-block; padding: 8px 14px; background: rgba(139, 92, 246, 0.15); border: 1px dashed ${COLORS.purple}; border-radius: 8px; margin-bottom: 6px;">
          <span style="color: ${COLORS.textMuted}; font-size: 11px; letter-spacing: 1px; text-transform: uppercase;">Code : </span>
          <span style="color: ${COLORS.text}; font-size: 16px; font-weight: 800; letter-spacing: 1.5px;">${COACHING_CODE}</span>
        </div>
        ${getPrimaryButton('Voir les formules coaching', coachingHref, COLORS.purple)}
      </div>

      <!-- BLOCK 2: Peptides (urgency) -->
      <div style="margin: 0 0 20px 0; padding: 24px 22px; background: linear-gradient(135deg, rgba(245, 158, 11, 0.12) 0%, rgba(239, 68, 68, 0.04) 100%); border-radius: 14px; border: 2px solid ${COLORS.warning};">
        <p style="margin: 0 0 4px 0; color: ${COLORS.warning}; font-size: 11px; letter-spacing: 1.5px; text-transform: uppercase; font-weight: 700;">Chemin 2 , sourcing bientot coupe</p>
        <h3 style="margin: 0 0 10px 0; color: ${COLORS.text}; font-size: 20px; font-weight: 800; letter-spacing: -0.3px;">Peptides Engine , -30% avec ${APEX_CODE}</h3>
        <p style="margin: 0 0 12px 0; color: ${COLORS.textMuted}; font-size: 14px; line-height: 1.65;">
          Mon produit le plus puissant. Protocole base sur <strong style="color: ${COLORS.text};">mes sources direct fournisseur</strong> , celles que j'utilise, doses exactes, testees. Mes contacts commencent a restreindre l'acces. Dans 6 mois c'est peut-etre ferme.
        </p>
        <p style="margin: 0 0 4px 0;">
          <span style="color: ${COLORS.textMuted}; font-size: 12px; text-decoration: line-through;">299EUR</span>
          <span style="color: ${COLORS.warning}; font-size: 22px; font-weight: 800; margin-left: 8px;">209EUR</span>
        </p>
        <p style="margin: 0 0 4px 0; color: ${COLORS.textMuted}; font-size: 12px; line-height: 1.6;">
          + <strong style="color: ${COLORS.text};">150EUR deduits</strong> si tu passes ensuite sur Elite ou Private Lab.
        </p>
        ${getPrimaryButton('Je prends Peptides Engine', peptidesHref, COLORS.warning)}
      </div>

      <p style="color: ${COLORS.textMuted}; font-size: 12px; text-align: center; margin: 24px 0 0 0;">
        Codes valables jusqu'au 30/04. Apres c'est plein tarif.
      </p>
      <p style="color: ${COLORS.text}; font-size: 14px; margin: 20px 0 0 0; font-weight: 600;">Achzod</p>
    `;

    const emailContent = getEmailWrapper(
      content,
      `linear-gradient(135deg, ${COLORS.primary} 0%, #d4a017 100%)`,
      "L'etape d'apres",
      `Codes ${COACHING_CODE} (coaching) + ${APEX_CODE} (APEX) , ${EXPIRES}`
    );

    const plainText = `Tu as deja pris un audit APEXLABS. Voici les 2 chemins pour passer a l'action.

1. COACHING ACHZOD -20% avec ${COACHING_CODE} : ${coachingHref}
Essential, Elite, Private Lab. Rappel : ton audit est deduit du coaching (acompte, pas supplement).

2. PEPTIDES ENGINE -30% avec ${APEX_CODE} : ${peptidesHref}
Protocole base sur mes sources direct fournisseur. 209EUR au lieu de 299EUR + -150EUR deduits du coaching Elite/Private Lab apres. Sources bientot coupees.

Codes valables jusqu'au 30/04.

Achzod`;

    const result = await sendEmailWithTracking(
      {
        subject: "Tu as fait le scan. L'etape d'apres.",
        from: { name: SENDER_NAME, email: SENDER_EMAIL },
        to: [{ email }],
        html: encodeBase64(emailContent),
        text: plainText,
      },
      {
        emailType: "sendCrossSellUpgradeEmail",
        recipientEmail: email,
        metadata: { apexCode: APEX_CODE, coachingCode: COACHING_CODE },
      }
    );
    return result.result === true;
  } catch (error) {
    console.error("[SendPulse] Error sending cross-sell upgrade email:", error);
    return false;
  }
}

// Email Discovery J+3: pivot vers le coaching directement (plus d'upsell audit intermédiaire).
// Push Essential (entry tier) avec DISCOVERY30. L'objectif est d'établir le coaching
// comme la "vraie solution" dès J+3 plutôt que de vendre un 2e audit à 59€.
export async function sendGratuitUpsellEmail(
  email: string,
  auditId: string,
  baseUrl: string,
  trackingId: string
): Promise<boolean> {
  try {
    const reportLink = `${baseUrl}/analysis/${auditId}`;
    const coachingLink = discoveryCoachingBridgeUrl(baseUrl, "discovery_j3_coaching", "essential", "ESSENTIAL");
    const allFormulesLink = discoveryCoachingBridgeUrl(baseUrl, "discovery_j3_coaching", "compare");
    const trackedCoachingLink = withEmailClickTracking(baseUrl, trackingId, coachingLink);
    const trackedAllFormulesLink = withEmailClickTracking(baseUrl, trackingId, allFormulesLink);
    const trackingPixel = `${baseUrl}/api/track/email/${trackingId}/open.gif`;
    const DAYS_LEFT = 7;
    const deadlineDate = formatDeadlineFR(DAYS_LEFT);

    const content = `
      ${getDiscoveryPromoBanner(DAYS_LEFT)}

      <p style="color:${APPLE_COLORS.inkSoft};font-size:16px;line-height:1.65;margin:0 0 20px;">
        Tu as tes scores Discovery, tes blocages, la carte de ton profil. La réalité froide : <strong style="color:${APPLE_COLORS.ink};">aucun score ne s'améliore en le regardant</strong>. Trois choses se passent à 99% quand on attaque seul après un audit.
      </p>

      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:24px;border-collapse:separate;border-spacing:0 8px;">
        <tr>
          <td style="padding:14px 18px;background:#f5f5f7;border-radius:10px;color:${APPLE_COLORS.ink};font-size:14px;line-height:1.55;font-weight:500;">
            Tu sais par où commencer pendant 1 semaine, puis tu dévies sans t'en rendre compte.
          </td>
        </tr>
        <tr>
          <td style="padding:14px 18px;background:#f5f5f7;border-radius:10px;color:${APPLE_COLORS.ink};font-size:14px;line-height:1.55;font-weight:500;">
            Tu vois aucun résultat mesurable à J+30, tu doutes, tu abandonnes.
          </td>
        </tr>
        <tr>
          <td style="padding:14px 18px;background:#f5f5f7;border-radius:10px;color:${APPLE_COLORS.ink};font-size:14px;line-height:1.55;font-weight:500;">
            Tu restes bloqué sur les mêmes axes pendant 6 mois sans le savoir.
          </td>
        </tr>
      </table>

      <h2 style="color:${APPLE_COLORS.ink};margin:0 0 14px;font-size:22px;font-weight:700;letter-spacing:-0.4px;">
        Le pas logique après ton Discovery
      </h2>

      <p style="color:${APPLE_COLORS.inkSoft};font-size:15px;line-height:1.65;margin:0 0 24px;">
        Je construis ton plan directement à partir des données de ton Discovery, pas de questionnaire à refaire. Plan personnalisé, nutrition précision, bilan écrit chaque semaine où tu m'envoies tes retours et j'ajuste avant que tu décroches.
      </p>

      ${getCoachingAppleButton('Activer mon code -30% maintenant', trackedCoachingLink)}

      <div style="text-align:center;margin:18px 0 14px;">
        <a href="${trackedAllFormulesLink}" style="color:${APPLE_COLORS.accent};font-size:14px;text-decoration:none;font-weight:500;">
          Comparer les 3 formules avec DISCOVERY30 →
        </a>
      </div>

      <p style="color:${APPLE_COLORS.muted};font-size:12px;line-height:1.55;margin:20px 0 0;text-align:center;">
        Code valable jusqu'au <strong style="color:${APPLE_COLORS.ink};">${deadlineDate}</strong>. Au paiement, copie <strong style="color:${APPLE_COLORS.ink};">DISCOVERY30</strong> dans le champ "Code promotionnel ?".
      </p>

      <div style="padding:14px 18px;background:#f5f5f7;border-radius:10px;text-align:center;margin-top:20px;">
        <a href="${reportLink}" style="color:${APPLE_COLORS.muted};font-size:13px;text-decoration:underline;">
          Relire mon Discovery Scan
        </a>
      </div>

      <p style="color:${APPLE_COLORS.muted};font-size:12px;margin:24px 0 0;">
        Achzod
      </p>

      <img src="${trackingPixel}" width="1" height="1" style="display:none;" alt="" />
    `;

    const emailContent = getCoachingAppleWrapper(
      content,
      `DISCOVERY30 actif , -30% sur ton coaching`,
      `Valable jusqu'au ${deadlineDate}`
    );

    const result = await sendEmailWithTracking(
      {
        html: encodeBase64(emailContent),
        text: `Ton code DISCOVERY30 est actif : -30% sur formules coaching 8 et 12 semaines, valable jusqu'au ${deadlineDate}.\n\nChoisir ma formule : ${trackedCoachingLink}\nComparer les 3 formules : ${trackedAllFormulesLink}\n\nAu paiement, copie DISCOVERY30 dans le champ "Code promotionnel ?".\n\nAchzod`,
        subject: `DISCOVERY30 actif , 7 jours pour activer ton coaching -30%`,
        from: { name: "Achzod Coaching", email: SENDER_EMAIL },
        to: [{ email }],
      },
      {
        emailType: "sendGratuitUpsellEmail",
        recipientEmail: email,
        auditId,
        auditType: "GRATUIT",
        metadata: { promoCode: "DISCOVERY30", reportLink, coachingLink, allFormulesLink, trackedCoachingLink, trackedAllFormulesLink, trackingId },
      }
    );

    return result.result === true;
  } catch (error) {
    console.error("[SendPulse] Error sending gratuit J+3 coaching email:", error);
    return false;
  }
}

// Email J+3: demande d'avis standalone (envoye 3 jours apres le rapport)
export async function sendReviewRequestJ3Email(
  email: string,
  auditId: string,
  auditType: string,
  baseUrl: string,
  trackingId: string
): Promise<boolean> {
  try {
    const dashboardLink = `${baseUrl}/dashboard/${auditId}`;
    const reviewLink = `${dashboardLink}#review`;
    const trackingPixel = `${baseUrl}/api/track/email/${trackingId}/open.gif`;

    const content = `
      <h2 style="color: ${COLORS.text}; margin: 0 0 16px; font-size: 24px; text-align: center; font-weight: 700; letter-spacing: -0.5px;">
        Ton retour nous aide a progresser
      </h2>

      <p style="color: ${COLORS.textMuted}; font-size: 15px; line-height: 1.7; margin: 0 0 28px; text-align: center;">
        Ca fait 3 jours que tu as recu ton rapport.<br/>
        <strong style="color: ${COLORS.text};">30 secondes pour laisser ton avis ?</strong>
      </p>

      <div style="padding: 32px; background: linear-gradient(135deg, rgba(251,191,36,0.12) 0%, rgba(245,158,11,0.05) 100%); border-radius: 16px; border: 2px solid rgba(251,191,36,0.25); margin-bottom: 28px; text-align: center;">
        <div style="font-size: 36px; margin-bottom: 12px;">&#9733; &#9733; &#9733; &#9733; &#9733;</div>
        <p style="color: ${COLORS.text}; font-size: 16px; font-weight: 600; margin: 0 0 8px;">Note ton experience sur 5</p>
        <p style="color: ${COLORS.textMuted}; font-size: 13px; margin: 0 0 20px; line-height: 1.6;">
          Ton avis aide des centaines de personnes a decouvrir APEXLABS.<br/>
          Chaque retour compte pour ameliorer nos analyses.
        </p>
        ${getPrimaryButton('Laisser mon avis', reviewLink, COLORS.warning)}
      </div>

      <div style="padding: 16px; background: ${COLORS.surface}; border-radius: 8px; border: 1px solid ${COLORS.border}; text-align: center; margin-bottom: 16px;">
        <p style="color: ${COLORS.textMuted}; font-size: 13px; margin: 0; line-height: 1.6;">
          <strong style="color: ${COLORS.text};">En remerciement</strong>, tu recevras un code promo exclusif pour ta prochaine analyse ou ton coaching.
        </p>
      </div>

      <p style="color: ${COLORS.textMuted}; font-size: 12px; line-height: 1.6; margin: 0; text-align: center;">
        <a href="{{UNSUB_LINK}}" style="color: #525252; text-decoration: underline;">Se desabonner</a>
      </p>

      <img src="${trackingPixel}" width="1" height="1" style="display:none;" alt="" />
    `;

    const emailContent = getEmailWrapper(
      content,
      `linear-gradient(135deg, ${COLORS.warning} 0%, #f59e0b 100%)`,
      "Ton avis compte",
      "30 secondes pour nous aider"
    );

    const result = await sendEmailWithTracking(
      {
        html: encodeBase64(emailContent),
        text: `Ca fait 3 jours que tu as recu ton rapport APEXLABS. Laisse ton avis en 30 secondes : ${reviewLink}. En remerciement, tu recevras un code promo exclusif.`,
        subject: "Ton avis sur APEXLABS ? (30 secondes)",
        from: { name: SENDER_NAME, email: SENDER_EMAIL },
        to: [{ email }],
      },
      {
        emailType: "sendReviewRequestJ3Email",
        recipientEmail: email,
        auditId,
        auditType,
        metadata: { reviewLink, trackingId },
      }
    );

    console.log(`[SendPulse] Review request J+3 email sent to ${email}:`, result);
    return result.result === true;
  } catch (error) {
    console.error("[SendPulse] Error sending review request J+3 email:", error);
    return false;
  }
}

// Email Peptides Engine J+3: demande avis apres livraison rapport
// ── Peptides Engine Review Email Builder ──────────────────────────────
function buildPeptidesReviewContent(opts: {
  title: string;
  bodyText: string;
  reviewLink: string;
  trackingPixel: string;
}): string {
  const { title, bodyText, reviewLink, trackingPixel } = opts;
  const amber = COLORS.warning; // #f59e0b

  return `
    <!-- Eyebrow -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
      <tr>
        <td align="center" style="padding-bottom: 8px;">
          <span style="display: inline-block; background: ${amber}18; color: ${amber}; padding: 6px 18px; border-radius: 20px; font-size: 11px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; border: 1px solid ${amber}30;">
            PEPTIDES ENGINE
          </span>
        </td>
      </tr>
    </table>

    <!-- Title -->
    <h2 style="color: ${COLORS.text}; margin: 16px 0 20px; font-size: 26px; text-align: center; font-weight: 700; letter-spacing: -0.5px; line-height: 1.3;">
      ${title}
    </h2>

    <!-- Star rating card -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 28px;">
      <tr>
        <td style="padding: 32px 24px; background: linear-gradient(135deg, rgba(245,158,11,0.12) 0%, rgba(245,158,11,0.04) 100%); border-radius: 16px; border: 1px solid rgba(245,158,11,0.2); text-align: center;">
          <!-- Stars -->
          <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 auto 16px auto;">
            <tr>
              <td style="font-size: 32px; color: ${amber}; letter-spacing: 6px; line-height: 1;">&#9733;&#9733;&#9733;&#9733;&#9733;</td>
            </tr>
          </table>
          <!-- Body text -->
          <p style="color: ${COLORS.textMuted}; font-size: 15px; line-height: 1.7; margin: 0 0 24px; max-width: 440px; display: inline-block;">
            ${bodyText}
          </p>
          <!-- CTA -->
          ${getPrimaryButton('Laisser mon avis', reviewLink, amber)}
        </td>
      </tr>
    </table>

    <!-- Secondary note -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 20px;">
      <tr>
        <td style="padding: 16px 20px; background: ${COLORS.surface}; border-radius: 10px; border: 1px solid ${COLORS.border}; text-align: center;">
          <p style="color: ${COLORS.textMuted}; font-size: 13px; margin: 0; line-height: 1.6;">
            Reponds directement a cet email si tu as une question sur ton protocole.
          </p>
        </td>
      </tr>
    </table>

    <!-- Unsubscribe footer -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
      <tr>
        <td align="center">
          <p style="color: #525252; font-size: 11px; margin: 0; line-height: 1.5;">
            <a href="{{UNSUB_LINK}}" style="color: #525252; text-decoration: underline;">Se desabonner</a>
          </p>
        </td>
      </tr>
    </table>

    <!-- Tracking pixel -->
    <img src="${trackingPixel}" width="1" height="1" style="display:none;" alt="" />
  `;
}

export async function sendPeptidesReviewEmail(
  email: string,
  reportId: string,
  baseUrl: string,
  trackingId: string
): Promise<boolean> {
  try {
    const reportLink = `${baseUrl}/peptides/${reportId}`;
    const reviewLink = `${reportLink}#review`;
    const trackingPixel = `${baseUrl}/api/track/email/${trackingId}/open.gif`;

    const content = buildPeptidesReviewContent({
      title: "Comment se passe ton protocole ?",
      bodyText: "Ca fait quelques jours que tu as recu ton protocole. Ton avis m'aide a ameliorer le service et aide d'autres personnes a faire le bon choix.",
      reviewLink,
      trackingPixel,
    });

    const emailContent = getEmailWrapper(
      content,
      `linear-gradient(135deg, ${COLORS.warning} 0%, #d97706 100%)`,
      "Peptides Engine",
      "Ton avis compte"
    );

    const result = await sendEmailWithTracking(
      {
        html: encodeBase64(emailContent),
        text: `Ca fait quelques jours que tu as recu ton protocole Peptides Engine. Laisse ton avis : ${reviewLink}. Reponds directement si tu as une question.`,
        subject: "Ton avis sur Peptides Engine ?",
        from: { name: SENDER_NAME, email: SENDER_EMAIL },
        to: [{ email }],
      },
      {
        emailType: "peptidesReviewJ3",
        recipientEmail: email,
        auditId: reportId,
        auditType: "PEPTIDES_ENGINE",
        metadata: { reviewLink, trackingId },
      }
    );

    console.log(`[SendPulse] Peptides review J+3 email sent to ${email}:`, result);
    return result.result === true;
  } catch (error) {
    console.error("[SendPulse] Error sending peptides review J+3 email:", error);
    return false;
  }
}

export async function sendPeptidesReviewS5Email(
  email: string,
  reportId: string,
  baseUrl: string,
  trackingId: string
): Promise<boolean> {
  try {
    const reportLink = `${baseUrl}/peptides/${reportId}`;
    const reviewLink = `${reportLink}#review`;
    const trackingPixel = `${baseUrl}/api/track/email/${trackingId}/open.gif`;

    const content = buildPeptidesReviewContent({
      title: "5 semaines de cycle, ton retour ?",
      bodyText: "Tu as maintenant assez de recul pour juger de l'efficacite de ton protocole. Ton avis compte enormement.",
      reviewLink,
      trackingPixel,
    });

    const emailContent = getEmailWrapper(
      content,
      `linear-gradient(135deg, ${COLORS.warning} 0%, #d97706 100%)`,
      "Peptides Engine",
      "Semaine 5 \u2014 Retour d'experience"
    );

    const result = await sendEmailWithTracking(
      {
        html: encodeBase64(emailContent),
        text: `5 semaines de cycle. Tu as assez de recul pour juger de l'efficacite de ton protocole. Laisse ton avis : ${reviewLink}`,
        subject: "5 semaines de cycle \u2014 ton retour ?",
        from: { name: SENDER_NAME, email: SENDER_EMAIL },
        to: [{ email }],
      },
      {
        emailType: "peptidesReviewS5",
        recipientEmail: email,
        auditId: reportId,
        auditType: "PEPTIDES_ENGINE",
        metadata: { reviewLink, trackingId },
      }
    );

    console.log(`[SendPulse] Peptides review S5 email sent to ${email}:`, result);
    return result.result === true;
  } catch (error) {
    console.error("[SendPulse] Error sending peptides review S5 email:", error);
    return false;
  }
}

export async function sendPeptidesReviewS12Email(
  email: string,
  reportId: string,
  baseUrl: string,
  trackingId: string
): Promise<boolean> {
  try {
    const reportLink = `${baseUrl}/peptides/${reportId}`;
    const reviewLink = `${reportLink}#review`;
    const trackingPixel = `${baseUrl}/api/track/email/${trackingId}/open.gif`;

    const content = buildPeptidesReviewContent({
      title: "Fin de cycle, bilan ?",
      bodyText: "Ton cycle touche a sa fin. C'est le moment ideal pour partager ton experience et aider d'autres athletes.",
      reviewLink,
      trackingPixel,
    });

    const emailContent = getEmailWrapper(
      content,
      `linear-gradient(135deg, ${COLORS.warning} 0%, #d97706 100%)`,
      "Peptides Engine",
      "Fin de cycle \u2014 Bilan"
    );

    const result = await sendEmailWithTracking(
      {
        html: encodeBase64(emailContent),
        text: `Ton cycle touche a sa fin. C'est le moment ideal pour partager ton experience. Laisse ton avis : ${reviewLink}`,
        subject: "Fin de cycle Peptides Engine \u2014 ton bilan ?",
        from: { name: SENDER_NAME, email: SENDER_EMAIL },
        to: [{ email }],
      },
      {
        emailType: "peptidesReviewS12",
        recipientEmail: email,
        auditId: reportId,
        auditType: "PEPTIDES_ENGINE",
        metadata: { reviewLink, trackingId },
      }
    );

    console.log(`[SendPulse] Peptides review S12 email sent to ${email}:`, result);
    return result.result === true;
  } catch (error) {
    console.error("[SendPulse] Error sending peptides review S12 email:", error);
    return false;
  }
}

// Email PREMIUM J+7: demande avis + CTA coaching avec code ANALYSE20
export async function sendPremiumJ7Email(
  email: string,
  auditId: string,
  auditType: string,
  baseUrl: string,
  trackingId: string,
  hasLeftReview: boolean
): Promise<boolean> {
  try {
    const dashboardLink = `${baseUrl}/dashboard/${auditId}`;
    const trackingPixel = `${baseUrl}/api/track/email/${trackingId}/open.gif`;

    const reviewSection = !hasLeftReview ? getReviewSection(dashboardLink) : '';

    const content = `
      <h2 style="color: ${COLORS.text}; margin: 0 0 16px; font-size: 26px; text-align: center; font-weight: 700; letter-spacing: -1px;">
        Ca fait une semaine...
      </h2>

      <p style="color: ${COLORS.textMuted}; font-size: 16px; line-height: 1.7; margin: 0 0 28px; text-align: center;">
        Tu as maintenant toutes les informations pour transformer ta sante. Mais <strong style="color: ${COLORS.text};">l'information sans action ne sert a rien</strong>.
      </p>

      ${reviewSection}

      ${getCoachingSection(auditType, COLORS.purple)}

      <img src="${trackingPixel}" width="1" height="1" style="display:none;" alt="" />
    `;

    const promoJ7 = getPromoCodeForAuditType(auditType);
    const promoJ7Label = promoJ7 ? `${promoJ7.code} (-${promoJ7.amount}EUR)` : "deduction coaching";
    const emailContent = getEmailWrapper(content, `linear-gradient(135deg, ${COLORS.purple} 0%, #7c3aed 100%)`);

    const result = await sendEmailWithTracking(
      {
        html: encodeBase64(emailContent),
        text: `Ca fait une semaine ! Pret a passer a l'action ? Ton code promo : ${promoJ7Label}. Decouvre le coaching personnalise.`,
        subject: `Pret a transformer ta sante ? (${promoJ7Label})`,
        from: { name: SENDER_NAME, email: SENDER_EMAIL },
        to: [{ email }],
      },
      {
        emailType: "sendPremiumJ7Email",
        recipientEmail: email,
        auditId,
        auditType,
        metadata: { trackingId, hasLeftReview, promoCode: promoJ7?.code, dashboardLink },
      }
    );

    console.log(`[SendPulse] Audit J+7 email sent to ${email}:`, result);
    return result.result === true;
  } catch (error) {
    console.error("[SendPulse] Error sending audit J+7 email:", error);
    return false;
  }
}

// Email PREMIUM J+14: relance uniquement si email J+7 non ouvert
export async function sendPremiumJ14Email(
  email: string,
  auditId: string,
  auditType: string,
  baseUrl: string,
  trackingId: string
): Promise<boolean> {
  try {
    const trackingPixel = `${baseUrl}/api/track/email/${trackingId}/open.gif`;

    const content = `
      <h2 style="color: ${COLORS.text}; margin: 0 0 16px; font-size: 26px; text-align: center; font-weight: 700; letter-spacing: -1px;">
        Coaching Achzod
      </h2>

      <p style="color: ${COLORS.textMuted}; font-size: 16px; line-height: 1.7; margin: 0 0 28px; text-align: center;">
        Ton audit APEXLABS est livre. L'accompagnement Achzod prend le relais pour l'execution et les ajustements continus.
      </p>

      ${getCoachingSection(auditType, COLORS.warning)}

      <p style="color: #525252; font-size: 12px; line-height: 1.6; margin: 28px 0 0; text-align: center;">
        <a href="{{UNSUB_LINK}}" style="color: #525252; text-decoration: underline;">Se desabonner</a>
      </p>

      <img src="${trackingPixel}" width="1" height="1" style="display:none;" alt="" />
    `;

    const promoJ14 = getPromoCodeForAuditType(auditType);
    const promoJ14Label = promoJ14 ? `${promoJ14.code} (-${promoJ14.amount}EUR)` : "deduction coaching";
    const emailContent = getEmailWrapper(content, `linear-gradient(135deg, ${COLORS.warning} 0%, #d97706 100%)`);

    const result = await sendEmailWithTracking(
      {
        html: encodeBase64(emailContent),
        text: `Coaching Achzod. Ton code promo : ${promoJ14Label}. Utilise-le sur achzodcoaching.com.`,
        subject: `Coaching Achzod - code ${promoJ14Label}`,
        from: { name: SENDER_NAME, email: SENDER_EMAIL },
        to: [{ email }],
      },
      {
        emailType: "sendPremiumJ14Email",
        recipientEmail: email,
        auditId,
        auditType,
        metadata: { trackingId, promoCode: promoJ14?.code },
      }
    );

    console.log(`[SendPulse] Audit J+14 email sent to ${email}:`, result);
    return result.result === true;
  } catch (error) {
    console.error("[SendPulse] Error sending audit J+14 email:", error);
    return false;
  }
}

// Email Discovery J+14: coaching personnalisé avec code DISCOVERY30.
// Accepts an optional `recommendation` produced by recommendCoachingTier() ,
// when provided, routes the CTA to the specific formule page (Essential/Elite/
// PrivateLab) and surfaces a one-sentence personalized rationale in the hero.
export async function sendDiscoveryJ14CoachingEmail(
  email: string,
  auditId: string,
  baseUrl: string,
  trackingId: string,
  recommendation?: { tier: "ESSENTIAL" | "ELITE" | "PRIVATELAB"; reason: string; href: string }
): Promise<boolean> {
  try {
    const trackingPixel = `${baseUrl}/api/track/email/${trackingId}/open.gif`;
    const coachingLink = discoveryCoachingBridgeUrl(
      baseUrl,
      "discovery_j14",
      recommendation ? recommendation.tier.toLowerCase() : "compare",
      recommendation?.tier
    );
    const trackedCoachingLink = withEmailClickTracking(baseUrl, trackingId, coachingLink);
    const tierLabel = recommendation
      ? recommendation.tier === "PRIVATELAB" ? "Private Lab" : recommendation.tier === "ELITE" ? "Elite" : "Essential"
      : null;
    const DAYS_LEFT = 7;
    const deadlineDate = formatDeadlineFR(DAYS_LEFT);

    const content = `
      ${getDiscoveryPromoBanner(DAYS_LEFT)}

      <p style="color:${APPLE_COLORS.inkSoft};font-size:16px;line-height:1.6;margin:0 0 20px;">
        Tu as ton Discovery Scan. Tu vois tes points faibles. La question maintenant : <strong style="color:${APPLE_COLORS.ink};">comment transformer ce diagnostic en résultats concrets sur 8 à 12 semaines ?</strong>
      </p>

      ${recommendation ? `
      <div style="padding:18px 22px;background:#e8f4ff;border-radius:12px;border-left:3px solid ${APPLE_COLORS.accent};margin-bottom:24px;">
        <p style="color:${APPLE_COLORS.accent};font-size:11px;text-transform:uppercase;letter-spacing:1.5px;margin:0 0 6px;font-weight:700;">
          Ma recommandation pour ton profil
        </p>
        <p style="color:${APPLE_COLORS.ink};font-size:15px;line-height:1.6;margin:0;font-weight:500;">
          ${recommendation.reason}
        </p>
      </div>
      ` : ""}

      <h2 style="color:${APPLE_COLORS.ink};margin:28px 0 14px;font-size:22px;font-weight:700;letter-spacing:-0.4px;">
        ${tierLabel ? `Pourquoi ${tierLabel} fait la différence` : "Pourquoi un coaching change la donne"}
      </h2>
      <p style="color:${APPLE_COLORS.inkSoft};font-size:15px;line-height:1.65;margin:0 0 24px;">
        Le Discovery te donne le diagnostic. Le coaching, c'est moi qui m'engage avec toi sur la durée pour calibrer ton plan, suivre tes progrès semaine après semaine, et ajuster avant que tu décroches. Tout passe par mail privé, je réponds personnellement à chaque message en moins de 24h.
      </p>

      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:24px;border-collapse:separate;border-spacing:0 6px;">
        <tr><td style="padding:10px 16px;background:#f5f5f7;border-radius:8px;color:${APPLE_COLORS.ink};font-size:14px;font-weight:500;line-height:1.55;">Protocole nutrition calibré sur ton bilan Discovery</td></tr>
        <tr><td style="padding:10px 16px;background:#f5f5f7;border-radius:8px;color:${APPLE_COLORS.ink};font-size:14px;font-weight:500;line-height:1.55;">Programme entraînement adapté à ton niveau et tes contraintes</td></tr>
        <tr><td style="padding:10px 16px;background:#f5f5f7;border-radius:8px;color:${APPLE_COLORS.ink};font-size:14px;font-weight:500;line-height:1.55;">Stack supplémentation choisi pour ton profil hormonal et métabolique</td></tr>
        <tr><td style="padding:10px 16px;background:#f5f5f7;border-radius:8px;color:${APPLE_COLORS.ink};font-size:14px;font-weight:500;line-height:1.55;">Bilan écrit chaque semaine pour ajuster avant les blocages</td></tr>
        <tr><td style="padding:10px 16px;background:#f5f5f7;border-radius:8px;color:${APPLE_COLORS.ink};font-size:14px;font-weight:500;line-height:1.55;">Accès mail prioritaire à moi, réponse personnelle en moins de 24h</td></tr>
      </table>

      ${getCoachingAppleButton(tierLabel ? `Activer mon code -30% sur ${tierLabel}` : 'Activer mon code -30% maintenant', trackedCoachingLink)}

      <p style="color:${APPLE_COLORS.muted};font-size:12px;line-height:1.55;margin:20px 0 0;text-align:center;">
        Code valable jusqu'au <strong style="color:${APPLE_COLORS.ink};">${deadlineDate}</strong>. Au checkout, copie <strong style="color:${APPLE_COLORS.ink};">DISCOVERY30</strong> dans le champ "Code promotionnel ?".
      </p>

      <!-- Social proof -->
      <div style="margin:32px 0 24px;padding:20px 22px;background:#f5f5f7;border-radius:12px;border-left:3px solid ${APPLE_COLORS.accent};">
        <p style="color:${APPLE_COLORS.ink};font-size:14px;line-height:1.7;margin:0 0 8px;font-weight:500;">
          "J'ai fait le Discovery, vu mes points faibles, mais c'est le coaching qui a tout changé. En 8 semaines, perdu 6 kg, gagné en muscle, ma libido est revenue. L'analyse c'est le diagnostic, le coaching c'est le traitement."
        </p>
        <p style="color:${APPLE_COLORS.muted};font-size:12px;margin:0;">, suivi 3 mois</p>
      </div>

      <p style="color:${APPLE_COLORS.muted};font-size:12px;margin:16px 0 0;">
        Achzod
      </p>

      <img src="${trackingPixel}" width="1" height="1" style="display:none;" alt="" />
    `;

    const emailContent = getCoachingAppleWrapper(
      content,
      tierLabel ? `${tierLabel} avec DISCOVERY30 (-30%)` : `7 jours pour activer DISCOVERY30`,
      `-30% sur ton coaching jusqu'au ${deadlineDate}`
    );

    const result = await sendEmailWithTracking(
      {
        html: encodeBase64(emailContent),
        text: tierLabel
          ? `Je te recommande ${tierLabel} d'après ton Discovery.\n${recommendation!.reason}\n\nCode DISCOVERY30 : -30% jusqu'au ${deadlineDate} (7 jours).\nChoisir ma formule : ${trackedCoachingLink}\n\nAu checkout, copie DISCOVERY30 dans le champ "Code promotionnel ?".\n\nAchzod`
          : `Tu as les données. Le coaching, c'est l'application pratique sur la durée.\n\nCode DISCOVERY30 : -30% sur formules 8 et 12 sem, jusqu'au ${deadlineDate} (7 jours).\nChoisir ma formule : ${trackedCoachingLink}\n\nAu checkout, copie DISCOVERY30 dans le champ "Code promotionnel ?".\n\nAchzod`,
        subject: tierLabel
          ? `${tierLabel} avec DISCOVERY30 , 7 jours pour activer`
          : `7 jours pour activer DISCOVERY30 , -30% coaching`,
        from: { name: "Achzod Coaching", email: SENDER_EMAIL },
        to: [{ email }],
      },
      {
        emailType: "sendDiscoveryJ14CoachingEmail",
        recipientEmail: email,
        auditId,
        auditType: "GRATUIT",
        metadata: { promoCode: "DISCOVERY30", coachingLink, trackedCoachingLink, trackingId, recommendedTier: recommendation?.tier },
      }
    );

    console.log(`[SendPulse] Discovery J+14 coaching email sent to ${email}:`, result);
    return result.result === true;
  } catch (error) {
    console.error("[SendPulse] Error sending Discovery J+14 coaching email:", error);
    return false;
  }
}

// Email Discovery J+5: "Pourquoi ton Discovery seul ne va rien changer" , angle
// storytelling brutal, pousse coaching Essential directement plutôt que des audits.
export async function sendGratuitJ5Email(
  email: string,
  auditId: string,
  baseUrl: string,
  trackingId: string
): Promise<boolean> {
  try {
    const trackingPixel = `${baseUrl}/api/track/email/${trackingId}/open.gif`;
    const primaryCtaLink = discoveryCoachingBridgeUrl(baseUrl, "discovery_j5", "essential", "ESSENTIAL");
    const secondaryCtaLink = discoveryCoachingBridgeUrl(baseUrl, "discovery_j5", "compare");
    const trackedPrimaryCtaLink = withEmailClickTracking(baseUrl, trackingId, primaryCtaLink);
    const trackedSecondaryCtaLink = withEmailClickTracking(baseUrl, trackingId, secondaryCtaLink);
    const reportLink = `${baseUrl}/analysis/${auditId}`;
    const DAYS_LEFT = 5;
    const deadlineDate = formatDeadlineFR(DAYS_LEFT);

    const content = `
      ${getDiscoveryPromoBanner(DAYS_LEFT)}

      <p style="color:${APPLE_COLORS.inkSoft};font-size:16px;line-height:1.65;margin:0 0 20px;">
        5 jours depuis ton rapport. La plupart des gens à ce stade n'ont rien appliqué. C'est pas un manque de volonté, c'est juste que <strong style="color:${APPLE_COLORS.ink};">un rapport, même précis, ne suffit pas à transformer un corps tout seul</strong>.
      </p>

      <h2 style="color:${APPLE_COLORS.ink};margin:0 0 14px;font-size:22px;font-weight:700;letter-spacing:-0.4px;">
        Pourquoi un Discovery sans suivi reste inactionnable
      </h2>

      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:28px;border-collapse:separate;border-spacing:0 10px;">
        <tr>
          <td style="padding:16px 18px;background:#f5f5f7;border-radius:10px;border-left:3px solid ${APPLE_COLORS.accent};">
            <p style="color:${APPLE_COLORS.ink};font-size:15px;font-weight:600;margin:0 0 4px;line-height:1.45;">1. Le plan concret manque</p>
            <p style="color:${APPLE_COLORS.inkSoft};font-size:13px;margin:0;line-height:1.55;">
              Le Discovery te donne le diagnostic. Il ne te dit pas quoi faire lundi matin précisément, ni quelle dose de protéines selon ta fatigue de la semaine, ni quels glucides ajuster si tu plateau.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 18px;background:#f5f5f7;border-radius:10px;border-left:3px solid ${APPLE_COLORS.accent};">
            <p style="color:${APPLE_COLORS.ink};font-size:15px;font-weight:600;margin:0 0 4px;line-height:1.45;">2. L'ajustement hebdo n'existe pas en autonomie</p>
            <p style="color:${APPLE_COLORS.inkSoft};font-size:13px;margin:0;line-height:1.55;">
              Après une semaine, ton corps réagit à ton plan d'une façon ou d'une autre. Sans quelqu'un qui lit tes données et recalibre, tu restes sur un plan figé pendant 2 mois et tu plafonne.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 18px;background:#f5f5f7;border-radius:10px;border-left:3px solid ${APPLE_COLORS.accent};">
            <p style="color:${APPLE_COLORS.ink};font-size:15px;font-weight:600;margin:0 0 4px;line-height:1.45;">3. Le contrat moral manque</p>
            <p style="color:${APPLE_COLORS.inkSoft};font-size:13px;margin:0;line-height:1.55;">
              Sans engagement écrit avec quelqu'un qui vérifie tes données hebdo, on lâche tous au bout de 10 jours. C'est documenté, c'est physiologique. C'est pour ça que le coaching existe.
            </p>
          </td>
        </tr>
      </table>

      <!-- Solution Coaching Essential -->
      <div style="padding:24px;background:#f5f5f7;border-radius:14px;margin-bottom:20px;">
        <p style="color:${APPLE_COLORS.muted};font-size:11px;text-transform:uppercase;letter-spacing:2px;margin:0 0 8px;font-weight:700;">
          La solution qui résout les 3
        </p>
        <h3 style="color:${APPLE_COLORS.ink};font-size:22px;font-weight:700;margin:0 0 10px;letter-spacing:-0.4px;">
          Coaching Essential
        </h3>
        <p style="color:${APPLE_COLORS.inkSoft};font-size:14px;margin:0 0 18px;line-height:1.6;">
          Plan sur-mesure calibré sur ton Discovery, nutrition précision, bilan écrit chaque semaine, ajustements en continu, contrat moral avec moi.
        </p>

        ${getCoachingAppleButton('Activer mon code -30% maintenant', trackedPrimaryCtaLink)}
      </div>

      <div style="text-align:center;margin-bottom:14px;">
        <a href="${trackedSecondaryCtaLink}" style="color:${APPLE_COLORS.accent};font-size:14px;text-decoration:none;font-weight:500;">
          Comparer les 3 formules avec DISCOVERY30 →
        </a>
      </div>

      <p style="color:${APPLE_COLORS.muted};font-size:12px;line-height:1.55;margin:18px 0 0;text-align:center;">
        Code valable jusqu'au <strong style="color:${APPLE_COLORS.ink};">${deadlineDate}</strong>. Au checkout, copie <strong style="color:${APPLE_COLORS.ink};">DISCOVERY30</strong> dans le champ "Code promotionnel ?".
      </p>

      <div style="padding:14px 18px;background:#f5f5f7;border-radius:10px;text-align:center;">
        <a href="${reportLink}" style="color:${APPLE_COLORS.muted};font-size:13px;text-decoration:underline;">
          Relire mon Discovery Scan
        </a>
      </div>

      <p style="color:${APPLE_COLORS.muted};font-size:12px;margin:24px 0 0;">
        Achzod
      </p>

      <img src="${trackingPixel}" width="1" height="1" style="display:none;" alt="" />
    `;

    const emailContent = getCoachingAppleWrapper(
      content,
      `5 jours pour activer DISCOVERY30`,
      `-30% sur ton coaching jusqu'au ${deadlineDate}`
    );

    const result = await sendEmailWithTracking(
      {
        html: encodeBase64(emailContent),
        text: `Ton code DISCOVERY30 est actif : -30% sur formules coaching 8 et 12 semaines, valable jusqu'au ${deadlineDate} (5 jours).\n\nLe Discovery te donne le diagnostic. Le coaching te donne le plan jour-par-jour, l'ajustement hebdo, et le contrat moral.\n\nChoisir ma formule : ${trackedPrimaryCtaLink}\nComparer les 3 formules : ${trackedSecondaryCtaLink}\nRelire le Discovery : ${reportLink}\n\nAu checkout, copie DISCOVERY30 dans le champ "Code promotionnel ?".\n\nAchzod`,
        subject: `5 jours pour activer DISCOVERY30 , -30% coaching`,
        from: { name: "Achzod Coaching", email: SENDER_EMAIL },
        to: [{ email }],
      },
      {
        emailType: "sendGratuitJ5Email",
        recipientEmail: email,
        auditId,
        auditType: "GRATUIT",
        metadata: { promoCode: "DISCOVERY30", primaryCtaLink, secondaryCtaLink, trackedPrimaryCtaLink, trackedSecondaryCtaLink, trackingId },
      }
    );

    console.log(`[SendPulse] Discovery J+5 email sent to ${email}:`, result);
    return result.result === true;
  } catch (error) {
    console.error("[SendPulse] Error sending Discovery J+5 email:", error);
    return false;
  }
}

// Email Discovery J+7: "Offre limitée -30% cette semaine"
export async function sendGratuitJ7Email(
  email: string,
  auditId: string,
  baseUrl: string,
  trackingId: string
): Promise<boolean> {
  try {
    const trackingPixel = `${baseUrl}/api/track/email/${trackingId}/open.gif`;
    const essentialLink = discoveryCoachingBridgeUrl(baseUrl, "discovery_j7_lastcall", "essential", "ESSENTIAL");
    const eliteLink = discoveryCoachingBridgeUrl(baseUrl, "discovery_j7_lastcall", "elite", "ELITE");
    const privateLabLink = discoveryCoachingBridgeUrl(baseUrl, "discovery_j7_lastcall", "privatelab", "PRIVATELAB");
    const allFormulesLink = discoveryCoachingBridgeUrl(baseUrl, "discovery_j7_lastcall", "compare");
    const trackedEssentialLink = withEmailClickTracking(baseUrl, trackingId, essentialLink);
    const trackedEliteLink = withEmailClickTracking(baseUrl, trackingId, eliteLink);
    const trackedPrivateLabLink = withEmailClickTracking(baseUrl, trackingId, privateLabLink);
    const trackedAllFormulesLink = withEmailClickTracking(baseUrl, trackingId, allFormulesLink);
    const DAYS_LEFT = 3;
    const deadlineDate = formatDeadlineFR(DAYS_LEFT);

    const content = `
      ${getDiscoveryPromoBanner(DAYS_LEFT)}

      <p style="color:${APPLE_COLORS.inkSoft};font-size:16px;line-height:1.65;margin:0 0 24px;">
        Plus que <strong style="color:${APPLE_COLORS.ink};">3 jours</strong> pour activer ton code DISCOVERY30. Voici une comparaison claire des 3 formules coaching avec le tarif après réduction.
      </p>

      <!-- Code box -->
      <div style="padding:22px 26px;background:${APPLE_COLORS.card};border:2px solid ${APPLE_COLORS.accent};border-radius:14px;margin-bottom:28px;text-align:center;">
        <p style="color:${APPLE_COLORS.muted};font-size:11px;text-transform:uppercase;letter-spacing:2px;margin:0 0 8px;font-weight:700;">
          Code à appliquer au checkout
        </p>
        <p style="color:${APPLE_COLORS.accent};font-size:30px;font-weight:800;letter-spacing:3px;margin:0 0 6px;">DISCOVERY30</p>
        <p style="color:${APPLE_COLORS.ink};font-size:14px;margin:0;font-weight:500;">
          -30% sur formules coaching <strong>8 et 12 semaines</strong>
        </p>
      </div>

      <h2 style="color:${APPLE_COLORS.ink};margin:0 0 14px;font-size:20px;font-weight:700;letter-spacing:-0.3px;">
        Les 3 formules après DISCOVERY30
      </h2>

      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:24px;border-collapse:separate;border-spacing:0 10px;">
        <tr>
          <td style="padding:18px 20px;background:#f5f5f7;border-radius:12px;">
            <p style="color:${APPLE_COLORS.ink};font-size:16px;font-weight:700;margin:0 0 4px;letter-spacing:-0.2px;">Essential</p>
            <p style="color:${APPLE_COLORS.inkSoft};font-size:13px;margin:0 0 8px;line-height:1.55;">Mail prioritaire 7j/7. Plan personnalisé sur ton Discovery. Bilan écrit hebdo.</p>
            <p style="color:${APPLE_COLORS.ink};font-size:14px;margin:0 0 10px;">
              <span style="text-decoration:line-through;color:${APPLE_COLORS.muted};">399€</span>
              <span style="color:${APPLE_COLORS.accent};font-weight:700;margin-left:8px;font-size:18px;">279€</span> 8 sem
            </p>
            <a href="${trackedEssentialLink}" style="color:${APPLE_COLORS.accent};font-size:14px;text-decoration:none;font-weight:600;">Voir Essential →</a>
          </td>
        </tr>
        <tr>
          <td style="padding:18px 20px;background:#f5f5f7;border-radius:12px;border-left:3px solid ${APPLE_COLORS.accent};">
            <p style="color:${APPLE_COLORS.ink};font-size:16px;font-weight:700;margin:0 0 4px;letter-spacing:-0.2px;">Elite (plus choisi)</p>
            <p style="color:${APPLE_COLORS.inkSoft};font-size:13px;margin:0 0 8px;line-height:1.55;">Tout Essential, plus gestion blessures et ajustements deux fois par semaine.</p>
            <p style="color:${APPLE_COLORS.ink};font-size:14px;margin:0 0 10px;">
              <span style="text-decoration:line-through;color:${APPLE_COLORS.muted};">649€</span>
              <span style="color:${APPLE_COLORS.accent};font-weight:700;margin-left:8px;font-size:18px;">454€</span> 8 sem
            </p>
            <a href="${trackedEliteLink}" style="color:${APPLE_COLORS.accent};font-size:14px;text-decoration:none;font-weight:600;">Voir Elite →</a>
          </td>
        </tr>
        <tr>
          <td style="padding:18px 20px;background:#f5f5f7;border-radius:12px;">
            <p style="color:${APPLE_COLORS.ink};font-size:16px;font-weight:700;margin:0 0 4px;letter-spacing:-0.2px;">Private Lab</p>
            <p style="color:${APPLE_COLORS.inkSoft};font-size:13px;margin:0 0 8px;line-height:1.55;">Tout Elite, plus reconstruction pluridisciplinaire et accès mail prioritaire 6h-minuit.</p>
            <p style="color:${APPLE_COLORS.ink};font-size:14px;margin:0 0 10px;">
              <span style="text-decoration:line-through;color:${APPLE_COLORS.muted};">799€</span>
              <span style="color:${APPLE_COLORS.accent};font-weight:700;margin-left:8px;font-size:18px;">559€</span> 8 sem
            </p>
            <a href="${trackedPrivateLabLink}" style="color:${APPLE_COLORS.accent};font-size:14px;text-decoration:none;font-weight:600;">Voir Private Lab →</a>
          </td>
        </tr>
      </table>

      ${getCoachingAppleButton('Comparer les 3 formules', trackedAllFormulesLink)}

      <p style="color:${APPLE_COLORS.muted};font-size:13px;margin:20px 0 0;text-align:center;line-height:1.55;">
        Les 4 semaines ne sont pas éligibles au code DISCOVERY30, seules les 8 et 12 sem le sont.
      </p>

      <p style="color:${APPLE_COLORS.muted};font-size:12px;margin:24px 0 0;">
        Achzod
      </p>

      <img src="${trackingPixel}" width="1" height="1" style="display:none;" alt="" />
    `;

    const emailContent = getCoachingAppleWrapper(
      content,
      `Plus que 3 jours pour DISCOVERY30`,
      `-30% sur ton coaching jusqu'au ${deadlineDate}`
    );

    const result = await sendEmailWithTracking(
      {
        html: encodeBase64(emailContent),
        text: `Plus que 3 jours pour activer DISCOVERY30 (jusqu'au ${deadlineDate}).\n\nComparaison des 3 formules coaching avec DISCOVERY30 :\n\nEssential 8 sem : 279€ (au lieu de 399€) , ${trackedEssentialLink}\nElite 8 sem : 454€ (au lieu de 649€) , ${trackedEliteLink}\nPrivate Lab 8 sem : 559€ (au lieu de 799€) , ${trackedPrivateLabLink}\n\nAu checkout, copie DISCOVERY30 dans le champ "Code promotionnel ?". Les 4 semaines ne sont pas éligibles au code, seules les 8 et 12 sem le sont.\n\nAchzod`,
        subject: `3 jours avant que DISCOVERY30 expire , -30% coaching`,
        from: { name: "Achzod Coaching", email: SENDER_EMAIL },
        to: [{ email }],
      },
      {
        emailType: "sendGratuitJ7Email",
        recipientEmail: email,
        auditId,
        auditType: "GRATUIT",
        metadata: { promoCode: "DISCOVERY30", essentialLink, eliteLink, privateLabLink, allFormulesLink, trackedEssentialLink, trackedEliteLink, trackedPrivateLabLink, trackedAllFormulesLink, trackingId },
      }
    );

    console.log(`[SendPulse] Discovery J+7 email sent to ${email}:`, result);
    return result.result === true;
  } catch (error) {
    console.error("[SendPulse] Error sending Discovery J+7 email:", error);
    return false;
  }
}

// Promo code email templates by audit type
const PROMO_EMAIL_CONFIG: Record<string, {
  title: string;
  subtitle: string;
  description: string;
  discount: string;
  gradient: string;
}> = {
  GRATUIT: {
    title: "Ton code promo -30%",
    subtitle: "Merci pour ton avis sur le Discovery Scan",
    description: "Utilise ce code pour bénéficier de 30% de réduction sur les formules coaching 8 et 12 semaines (Essential, Elite, Private Lab).",
    discount: "-30% sur formules coaching 8 et 12 sem",
    gradient: "linear-gradient(135deg, #FCDD00 0%, #d4af37 100%)",
  },
  PREMIUM: {
    title: "59€ déduits du coaching",
    subtitle: "Merci pour ton avis sur l'Anabolic Bioscan",
    description: "Le montant de ton Anabolic Bioscan (59€) est intégralement déduit si tu passes au coaching Achzod.",
    discount: "-59€ sur le coaching",
    gradient: "linear-gradient(135deg, #0efc6d 0%, #059669 100%)",
  },
  ELITE: {
    title: "79€ déduits du coaching",
    subtitle: "Merci pour ton avis sur l'Ultimate Scan",
    description: "Le montant de ton Ultimate Scan (79€) est intégralement déduit si tu passes au coaching Achzod.",
    discount: "-79€ sur le coaching",
    gradient: "linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)",
  },
  BLOOD_ANALYSIS: {
    title: "99€ déduits du coaching",
    subtitle: "Merci pour ton avis sur la Blood Analysis",
    description: "Le montant de ta Blood Analysis (99€) est intégralement déduit si tu passes au coaching Achzod.",
    discount: "-99€ sur le coaching",
    gradient: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
  },
};

export async function sendPromoCodeEmail(
  email: string,
  prenom: string,
  auditType: string,
  promoCode: string
): Promise<boolean> {
  try {
    const config = PROMO_EMAIL_CONFIG[auditType] || PROMO_EMAIL_CONFIG.GRATUIT;

    const content = `
      <p style="color: ${COLORS.text}; font-size: 18px; line-height: 1.6; margin: 0 0 24px;">
        ${prenom},
      </p>

      <p style="color: ${COLORS.textMuted}; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
        ${config.description}
      </p>

      <!-- Promo Code Box -->
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 32px 0;">
        <tr>
          <td align="center">
            <div style="background: linear-gradient(135deg, rgba(14, 252, 109, 0.1) 0%, rgba(5, 150, 105, 0.1) 100%); border: 2px dashed ${COLORS.primary}; border-radius: 12px; padding: 32px; text-align: center;">
              <p style="color: ${COLORS.textMuted}; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 8px;">Ton code promo</p>
              <p style="color: ${COLORS.primary}; font-size: 36px; font-weight: 700; letter-spacing: 4px; margin: 0;">${promoCode}</p>
              <p style="color: ${COLORS.text}; font-size: 14px; margin: 16px 0 0;">${config.discount}</p>
            </div>
          </td>
        </tr>
      </table>

      <p style="color: ${COLORS.textMuted}; font-size: 14px; line-height: 1.6; margin: 0 0 32px;">
        Copie ce code et utilise-le lors de ta commande sur achzodcoaching.com
      </p>

      <!-- CTA Button -->
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
        <tr>
          <td align="center">
            <a href="https://www.achzodcoaching.com/formules-coaching"
               style="display: inline-block; background: ${COLORS.primary}; color: ${COLORS.background}; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 600; font-size: 16px;">
              Voir les formules coaching
            </a>
          </td>
        </tr>
      </table>

      <p style="color: ${COLORS.textMuted}; font-size: 12px; text-align: center; margin: 32px 0 0;">
        Ce code est personnel et utilisable une seule fois.
      </p>
    `;

    const htmlContent = getEmailWrapper(content, config.gradient, config.title, config.subtitle);

    const result = await sendEmailWithTracking(
      {
        html: encodeBase64(htmlContent),
        text: `${prenom}, voici ton code promo : ${promoCode}. ${config.discount}. Utilise-le sur achzodcoaching.com/formules-coaching`,
        subject: `${config.title} - ${promoCode}`,
        from: { name: "Achzod Coaching", email: SENDER_EMAIL },
        to: [{ email }],
      },
      {
        emailType: "sendPromoCodeEmail",
        recipientEmail: email,
        recipientName: prenom,
        auditType,
        metadata: { promoCode, discount: config.discount },
      }
    );

    console.log(`[SendPulse] Promo code email sent to ${email} (${auditType}):`, result);
    return result.result === true;
  } catch (error) {
    console.error("[SendPulse] Error sending promo code email:", error);
    return false;
  }
}

// Admin notification when a new review is submitted
export async function sendAdminReviewNotification(
  reviewerEmail: string | undefined,
  auditType: string,
  auditId: string,
  rating: number,
  comment: string
): Promise<boolean> {
  try {
    const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || "coaching@achzodcoaching.com";
    const ratingLabel = `${rating}/5`;

    const content = `
      <h2 style="color: ${COLORS.text}; margin: 0 0 24px; font-size: 24px; font-weight: 700;">
        Nouvel avis a valider
      </h2>

      <div style="background: ${COLORS.background}; border-radius: 8px; padding: 20px; border: 1px solid ${COLORS.border};">
        <p style="color: ${COLORS.primary}; font-size: 18px; letter-spacing: 1px; margin: 0 0 16px; font-weight: 700;">
          Note: ${ratingLabel}
        </p>
        <p style="color: ${COLORS.textMuted}; font-size: 14px; line-height: 1.8; margin: 0 0 8px;">
          <strong style="color: ${COLORS.text};">Type d'audit:</strong> ${auditType}
        </p>
        <p style="color: ${COLORS.textMuted}; font-size: 14px; line-height: 1.8; margin: 0 0 8px;">
          <strong style="color: ${COLORS.text};">Email:</strong> ${reviewerEmail || "Non fourni"}
        </p>
        <p style="color: ${COLORS.textMuted}; font-size: 14px; line-height: 1.8; margin: 0 0 8px;">
          <strong style="color: ${COLORS.text};">Audit ID:</strong> <code style="background: ${COLORS.border}; padding: 2px 6px; border-radius: 4px; font-size: 12px;">${auditId}</code>
        </p>
        <div style="margin-top: 16px; padding: 16px; background: ${COLORS.surface}; border-radius: 8px; border-left: 3px solid ${COLORS.primary};">
          <p style="color: ${COLORS.text}; font-size: 14px; line-height: 1.7; margin: 0; font-style: italic;">
            "${comment.length > 300 ? comment.substring(0, 300) + "..." : comment}"
          </p>
        </div>
      </div>

      <p style="color: ${COLORS.primary}; font-size: 14px; line-height: 1.7; margin: 24px 0 0; text-align: center; font-weight: 500;">
        Connecte-toi au dashboard admin pour valider ou rejeter cet avis.
      </p>
    `;

    const emailContent = getEmailWrapper(content);

    const result = await sendEmailWithTracking(
      {
        html: encodeBase64(emailContent),
        text: `Nouvel avis ${rating}/5 pour ${auditType}: "${comment.substring(0, 100)}..." - A valider dans le dashboard admin.`,
        subject: `[ApexLabs] Nouvel avis ${ratingLabel} a valider`,
        from: {
          name: SENDER_NAME,
          email: SENDER_EMAIL,
        },
        to: [{ email: adminEmail }],
      },
      {
        emailType: "sendAdminReviewNotification",
        recipientEmail: adminEmail,
        auditId,
        auditType,
        metadata: { reviewerEmail, rating, commentPreview: comment.substring(0, 100) },
      }
    );

    console.log(`[SendPulse] Admin review notification sent:`, result);
    return result.result === true;
  } catch (error) {
    console.error("[SendPulse] Error sending admin review notification:", error);
    return false;
  }
}

// ApexLabs Welcome Email - sent when someone joins the waitlist
export async function sendApexLabsWelcomeEmail(email: string): Promise<boolean> {
  try {
    // ApexLabs Design System - Black/Yellow
    const APEX_COLORS = {
      primary: '#FCDD00', // Yellow
      background: '#000000',
      surface: '#0a0a0a',
      text: '#ffffff',
      textMuted: '#9ca3af',
    };

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: ${APEX_COLORS.background};">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: ${APEX_COLORS.background}; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: ${APEX_COLORS.surface}; border-radius: 16px; overflow: hidden; border: 1px solid rgba(255,255,255,0.1);">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, ${APEX_COLORS.primary} 0%, #d4b800 100%); padding: 50px 30px; text-align: center;">
              <h1 style="color: ${APEX_COLORS.background}; margin: 0; font-size: 42px; font-weight: 900; letter-spacing: -2px;">
                APEX<span style="font-weight: 400;">LABS</span>
              </h1>
              <p style="color: rgba(0,0,0,0.7); margin: 8px 0 0; font-size: 12px; font-weight: 600; letter-spacing: 3px; text-transform: uppercase;">
                by Achzod
              </p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 50px 40px;">
              <h2 style="color: ${APEX_COLORS.text}; margin: 0 0 20px; font-size: 28px; font-weight: 700; text-align: center;">
                Bienvenue dans l'élite.
              </h2>

              <p style="color: ${APEX_COLORS.textMuted}; font-size: 16px; line-height: 1.8; margin: 0 0 30px; text-align: center;">
                Tu fais maintenant partie des premiers à avoir accès à <strong style="color: ${APEX_COLORS.text};">ApexLabs</strong> , la nouvelle génération d'optimisation humaine.
              </p>

              <!-- What's coming -->
              <div style="background: rgba(252,221,0,0.05); border: 1px solid rgba(252,221,0,0.2); border-radius: 12px; padding: 30px; margin: 30px 0;">
                <h3 style="color: ${APEX_COLORS.primary}; font-size: 14px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; margin: 0 0 20px;">
                  CE QUI T'ATTEND
                </h3>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  <tr><td style="padding: 10px 0; color: ${APEX_COLORS.textMuted}; font-size: 15px; border-bottom: 1px solid rgba(255,255,255,0.05);">
                    <span style="color: ${APEX_COLORS.primary}; margin-right: 12px;">→</span> Discovery Scan , Diagnostic gratuit 5 piliers
                  </td></tr>
                  <tr><td style="padding: 10px 0; color: ${APEX_COLORS.textMuted}; font-size: 15px; border-bottom: 1px solid rgba(255,255,255,0.05);">
                    <span style="color: ${APEX_COLORS.primary}; margin-right: 12px;">→</span> Anabolic Bioscan , Audit métabolique complet
                  </td></tr>
                  <tr><td style="padding: 10px 0; color: ${APEX_COLORS.textMuted}; font-size: 15px; border-bottom: 1px solid rgba(255,255,255,0.05);">
                    <span style="color: ${APEX_COLORS.primary}; margin-right: 12px;">→</span> Ultimate Scan , L'analyse ultime + photos
                  </td></tr>
                  <tr><td style="padding: 10px 0; color: ${APEX_COLORS.textMuted}; font-size: 15px; border-bottom: 1px solid rgba(255,255,255,0.05);">
                    <span style="color: ${APEX_COLORS.primary}; margin-right: 12px;">→</span> Blood Analysis , 50+ biomarqueurs
                  </td></tr>
                  <tr><td style="padding: 10px 0; color: ${APEX_COLORS.textMuted}; font-size: 15px;">
                  </td></tr>
                </table>
              </div>

              <p style="color: ${APEX_COLORS.textMuted}; font-size: 15px; line-height: 1.7; margin: 30px 0; text-align: center;">
                Je te contacterai personnellement dès que les portes s'ouvriront.
              </p>

              <p style="color: ${APEX_COLORS.text}; font-size: 16px; margin: 40px 0 0; text-align: center; font-weight: 500;">
                Stay sharp,<br>
                <span style="color: ${APEX_COLORS.primary}; font-weight: 700;">Achzod</span>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: ${APEX_COLORS.background}; padding: 30px; text-align: center; border-top: 1px solid rgba(255,255,255,0.05);">
              <p style="color: #525252; font-size: 11px; margin: 0; letter-spacing: 1px; text-transform: uppercase;">
                ApexLabs by Achzod • Optimisation Humaine
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    const result = await sendEmailWithTracking(
      {
        html: encodeBase64(htmlContent),
        text: "Bienvenue dans l'élite ApexLabs ! Tu fais partie des premiers à avoir accès à la nouvelle génération d'optimisation humaine. Je te contacterai dès que les portes s'ouvriront. - Achzod",
        subject: "Bienvenue dans l'élite ApexLabs",
        from: {
          name: "Achzod | ApexLabs",
          email: SENDER_EMAIL,
        },
        to: [{ email }],
      },
      {
        emailType: "sendApexLabsWelcomeEmail",
        recipientEmail: email,
        metadata: { source: "waitlist" },
      }
    );

    console.log(`[SendPulse] ✅ ApexLabs welcome email sent to ${email}:`, result);
    return result.result === true;
  } catch (error) {
    console.error("[SendPulse] Error sending ApexLabs welcome email:", error);
    return false;
  }
}

// Add subscriber to SendPulse mailing list (address book)
export async function addSubscriberToList(
  email: string,
  listName: string = "apexlabs"
): Promise<{ success: boolean; bookId?: string; error?: string }> {
  try {
    console.log(`[SendPulse] 📤 Adding ${email} to list: ${listName}`);
    const token = await getAccessToken();

    // Get or create address book
    let bookId = SENDPULSE_APEXLABS_BOOK_ID;
    console.log(`[SendPulse] ENV bookId: ${bookId || "(not set)"}`);

    if (!bookId) {
      // Try to find existing book or create new one
      console.log("[SendPulse] Fetching address books...");
      const booksResponse = await fetch("https://api.sendpulse.com/addressbooks", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!booksResponse.ok) {
        console.error(`[SendPulse] ❌ Failed to fetch address books: ${booksResponse.status}`);
        return { success: false, error: `API error: ${booksResponse.status}` };
      }

      const books = await booksResponse.json() as Array<{ id: number; name: string }>;
      console.log(`[SendPulse] Found ${books.length} address books:`, books.map(b => b.name));

      const targetBookName = `APEXLABS_WAITLIST`;
      const existingBook = books.find((b: any) => b.name === targetBookName);

      if (existingBook) {
        bookId = String(existingBook.id);
        console.log(`[SendPulse] Using existing book: ${targetBookName} (ID: ${bookId})`);
      } else {
        // Create new address book
        console.log(`[SendPulse] Creating new address book: ${targetBookName}`);
        const createResponse = await fetch("https://api.sendpulse.com/addressbooks", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ bookName: targetBookName }),
        });

        if (!createResponse.ok) {
          const errorText = await createResponse.text();
          console.error(`[SendPulse] ❌ Failed to create book: ${createResponse.status} - ${errorText}`);
          return { success: false, error: `Failed to create book: ${createResponse.status}` };
        }

        const created = await createResponse.json() as { id: number };
        bookId = String(created.id);
        console.log(`[SendPulse] ✅ Created new address book: ${targetBookName} (ID: ${bookId})`);
      }
    }

    // Add email to address book - simplified format
    console.log(`[SendPulse] Adding email to book ${bookId}...`);
    const emailPayload = { emails: [{ email }] };
    console.log(`[SendPulse] Payload:`, JSON.stringify(emailPayload));

    const addResponse = await fetch(`https://api.sendpulse.com/addressbooks/${bookId}/emails`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(emailPayload),
    });

    const responseText = await addResponse.text();
    console.log(`[SendPulse] Add email response (status ${addResponse.status}):`, responseText);

    // Check HTTP status first
    if (!addResponse.ok) {
      console.error(`[SendPulse] ❌ HTTP error ${addResponse.status}: ${responseText}`);
      return { success: false, error: `HTTP ${addResponse.status}: ${responseText}` };
    }

    let result: { result?: boolean };
    try {
      result = JSON.parse(responseText);
    } catch {
      console.error(`[SendPulse] ❌ Invalid JSON response: ${responseText}`);
      return { success: false, error: "Invalid API response" };
    }

    if (result.result === true) {
      console.log(`[SendPulse] ✅ Successfully added ${email} to address book ${bookId}`);
      return { success: true, bookId };
    } else {
      console.error(`[SendPulse] ❌ API returned false for ${email}: ${responseText}`);
      return { success: false, error: responseText };
    }
  } catch (error: any) {
    console.error("[SendPulse] ❌ Error adding subscriber:", error);
    return { success: false, error: error.message || "Unknown error" };
  }
}

// Discovery J+30 , long-tail nurture for Discovery Scan recipients who haven't
// upgraded. Pushes COACHING directly (not more audits) since coaching is the
// real revenue. Uses DISCOVERY30 code (30% off eligible coaching formulas).
// When a `recommendation` is passed, the CTA points to the matched formule
// page (Essential/Elite/PrivateLab) and the intro surfaces the rationale.
// One-shot per client, dedup via email_tracking.
export async function sendDiscoveryJ30NurtureEmail(
  email: string,
  auditId: string,
  baseUrl: string,
  trackingId: string,
  recommendation?: { tier: "ESSENTIAL" | "ELITE" | "PRIVATELAB"; reason: string; href: string }
): Promise<boolean> {
  try {
    const reportLink = `${baseUrl}/analysis/${auditId}`;
    const coachingLink = discoveryCoachingBridgeUrl(
      baseUrl,
      "discovery_j30_nurture",
      recommendation ? recommendation.tier.toLowerCase() : "compare",
      recommendation?.tier
    );
    const essentialLink = discoveryCoachingBridgeUrl(baseUrl, "discovery_j30_nurture", "essential", "ESSENTIAL");
    const trackedCoachingLink = withEmailClickTracking(baseUrl, trackingId, coachingLink);
    const trackedEssentialLink = withEmailClickTracking(baseUrl, trackingId, essentialLink);
    const tierLabel = recommendation
      ? recommendation.tier === "PRIVATELAB" ? "Private Lab" : recommendation.tier === "ELITE" ? "Elite" : "Essential"
      : null;
    const trackingPixel = `${baseUrl}/api/track/email/${trackingId}/open.gif`;
    const DAYS_LEFT = 5;
    const deadlineDate = formatDeadlineFR(DAYS_LEFT);

    const content = `
      ${getDiscoveryPromoBanner(DAYS_LEFT)}

      <p style="color:${APPLE_COLORS.inkSoft};font-size:16px;line-height:1.65;margin:0 0 20px;">
        Un mois depuis ton Discovery. Tu as les données, tu as vu où tu bloques. La question maintenant : <strong style="color:${APPLE_COLORS.ink};">est-ce que tu veux qu'on attaque vraiment, ensemble ?</strong>
      </p>

      ${recommendation ? `
      <div style="padding:18px 22px;background:#e8f4ff;border-radius:12px;border-left:3px solid ${APPLE_COLORS.accent};margin-bottom:24px;">
        <p style="color:${APPLE_COLORS.accent};font-size:11px;text-transform:uppercase;letter-spacing:1.5px;margin:0 0 6px;font-weight:700;">
          Ma recommandation pour ton profil
        </p>
        <p style="color:${APPLE_COLORS.ink};font-size:15px;line-height:1.6;margin:0;font-weight:500;">
          ${recommendation.reason}
        </p>
      </div>
      ` : `
      <div style="padding:20px 22px;background:#f5f5f7;border-radius:12px;border-left:3px solid ${APPLE_COLORS.accent};margin-bottom:24px;">
        <p style="color:${APPLE_COLORS.ink};font-size:15px;font-weight:600;margin:0 0 8px;">
          Un audit ne transforme pas. Le suivi, oui.
        </p>
        <p style="color:${APPLE_COLORS.inkSoft};font-size:14px;line-height:1.6;margin:0;">
          Le Discovery te dit où tu bloques. Pour corriger durablement sommeil, stress, nutrition et énergie, il faut un protocole ajusté semaine après semaine selon ce que tu m'envoies. C'est exactement ce que je fais en coaching.
        </p>
      </div>
      `}

      ${getCoachingAppleButton(tierLabel ? `Activer mon code -30% sur ${tierLabel}` : 'Activer mon code -30% maintenant', trackedCoachingLink)}

      <p style="color:${APPLE_COLORS.muted};font-size:12px;line-height:1.55;margin:18px 0 0;text-align:center;">
        Code valable jusqu'au <strong style="color:${APPLE_COLORS.ink};">${deadlineDate}</strong>. Au checkout, copie <strong style="color:${APPLE_COLORS.ink};">DISCOVERY30</strong> dans le champ "Code promotionnel ?".
      </p>

      ${!tierLabel || tierLabel !== "Essential" ? `
      <div style="padding:14px 18px;background:#f5f5f7;border-radius:10px;text-align:center;margin:24px 0 14px;">
        <p style="color:${APPLE_COLORS.inkSoft};font-size:13px;margin:0 0 6px;">
          ${tierLabel ? "Budget plus serré ?" : "Pas sûr du niveau adapté ?"}
        </p>
        <a href="${trackedEssentialLink}" style="color:${APPLE_COLORS.accent};font-size:13px;text-decoration:none;font-weight:600;">
          Commencer par Essential (à partir de 249€) →
        </a>
      </div>
      ` : ""}

      <div style="padding:14px 18px;background:#f5f5f7;border-radius:10px;text-align:center;margin-top:14px;">
        <a href="${reportLink}" style="color:${APPLE_COLORS.muted};font-size:13px;text-decoration:underline;">
          Relire mon Discovery Scan
        </a>
      </div>

      <p style="color:${APPLE_COLORS.muted};font-size:12px;margin:24px 0 0;">
        Achzod
      </p>

      <img src="${trackingPixel}" width="1" height="1" style="display:none;" alt="" />
    `;

    const emailContent = getCoachingAppleWrapper(
      content,
      tierLabel ? `${tierLabel} avec DISCOVERY30 (-30%)` : `5 jours pour activer DISCOVERY30`,
      `-30% sur ton coaching jusqu'au ${deadlineDate}`
    );

    const result = await sendEmailWithTracking(
      {
        html: encodeBase64(emailContent),
        text: tierLabel
          ? `Je te recommande ${tierLabel} d'après ton Discovery.\n${recommendation!.reason}\n\nCode DISCOVERY30 : -30% jusqu'au ${deadlineDate} (5 jours).\nChoisir ma formule : ${trackedCoachingLink}\n\nAu checkout, copie DISCOVERY30 dans le champ "Code promotionnel ?".\n\nAchzod`
          : `Un mois depuis ton Discovery. Pour corriger durablement, faut un protocole ajusté chaque semaine. C'est exactement ce que je fais en coaching.\n\nCode DISCOVERY30 : -30% sur formules 8 et 12 sem, jusqu'au ${deadlineDate} (5 jours).\nChoisir ma formule : ${trackedCoachingLink}\nCommencer par Essential : ${trackedEssentialLink}\n\nAu checkout, copie DISCOVERY30 dans le champ "Code promotionnel ?".\n\nAchzod`,
        subject: tierLabel
          ? `${tierLabel} avec DISCOVERY30 , 5 jours pour activer`
          : `5 jours pour activer DISCOVERY30 , -30% coaching`,
        from: { name: "Achzod Coaching", email: SENDER_EMAIL },
        to: [{ email }],
      },
      {
        emailType: "sendDiscoveryJ30NurtureEmail",
        recipientEmail: email,
        auditId,
        metadata: { promoCode: "DISCOVERY30", coachingLink, essentialLink, trackedCoachingLink, trackedEssentialLink, trackingId, recommendedTier: recommendation?.tier },
      }
    );

    return result.result === true;
  } catch (error) {
    console.error("[SendPulse] Error sending discovery J30 nurture email:", error);
    return false;
  }
}

// Peptides Engine , Cycle 2 re-order email (J+60 post-delivery).
// Sent once to clients whose first Peptides protocol was delivered ~60 days ago,
// roughly the end of a typical 8-12 week cycle. Offers a loyalty discount for
// re-ordering. Revenue retention play on existing client base.
export async function sendPeptidesCycle2ReorderEmail(
  email: string,
  reportId: string,
  baseUrl: string,
  trackingId: string
): Promise<boolean> {
  try {
    const reportLink = `${baseUrl}/peptides/${reportId}`;
    const orderLink = `${baseUrl}/offers/peptides-engine?code=CYCLE2&utm_source=apexlabs&utm_medium=email&utm_campaign=peptides_j60_reorder`;
    const trackingPixel = `${baseUrl}/api/track/email/${trackingId}/open.gif`;

    const content = `
      <h2 style="color: ${COLORS.text}; margin: 0 0 16px; font-size: 26px; text-align: center; font-weight: 700; letter-spacing: -0.5px;">
        Ton cycle 1 touche à sa fin
      </h2>

      <p style="color: ${COLORS.textMuted}; font-size: 15px; line-height: 1.7; margin: 0 0 24px; text-align: center;">
        Ça fait environ 2 mois que tu as reçu ton premier protocole peptides.<br/>
        <strong style="color: ${COLORS.text};">C'est le bon moment pour parler de la suite.</strong>
      </p>

      <div style="padding: 24px; background: ${COLORS.surface}; border-radius: 12px; border-left: 4px solid ${COLORS.primary}; margin-bottom: 24px;">
        <p style="color: ${COLORS.text}; font-size: 15px; font-weight: 600; margin: 0 0 10px;">
          Pourquoi un cycle 2 ?
        </p>
        <p style="color: ${COLORS.textMuted}; font-size: 14px; line-height: 1.7; margin: 0 0 10px;">
          Ton corps s'est adapté aux peptides du cycle 1. Les résultats sont là mais les gains marginaux ralentissent , c'est biologiquement normal. Un cycle 2 recalibré sur tes nouveaux objectifs (consolidation, progression, switch de stack) permet de repartir sur du neuf sans perdre l'acquis.
        </p>
        <p style="color: ${COLORS.textMuted}; font-size: 14px; line-height: 1.7; margin: 0;">
          Si tu as fait un Blood Analysis mi-cycle (tes 2 crédits offerts) , c'est exactement les marqueurs à regarder pour guider le cycle 2.
        </p>
      </div>

      <div style="padding: 28px; background: linear-gradient(135deg, rgba(251,191,36,0.12) 0%, rgba(245,158,11,0.05) 100%); border-radius: 12px; border: 2px solid ${COLORS.warning}; margin-bottom: 24px; text-align: center;">
        <p style="color: ${COLORS.textMuted}; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 6px; font-weight: 600;">
          Tarif clients existants
        </p>
        <p style="color: ${COLORS.warning}; font-size: 36px; font-weight: 700; letter-spacing: -1px; margin: 0 0 4px;">
          199€
        </p>
        <p style="color: ${COLORS.textMuted}; font-size: 13px; text-decoration: line-through; margin: 0 0 12px;">
          au lieu de 299€
        </p>
        <div style="background: ${COLORS.background}; border-radius: 8px; padding: 14px 18px; display: inline-block; margin-bottom: 16px; border: 1px dashed ${COLORS.warning};">
          <p style="color: ${COLORS.textMuted}; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; margin: 0 0 4px; font-weight: 600;">
            Code exclusif
          </p>
          <p style="color: ${COLORS.warning}; font-size: 22px; font-weight: 700; letter-spacing: 3px; margin: 0;">
            CYCLE2
          </p>
        </div>
        <p style="color: ${COLORS.textMuted}; font-size: 13px; line-height: 1.6; margin: 0 0 18px;">
          Bonus : 2 crédits Blood Analysis à nouveau offerts<br/>pour piloter ton cycle 2 avec des données réelles.
        </p>
        ${getPrimaryButton('Relancer mon protocole', orderLink, COLORS.warning)}
      </div>

      <div style="padding: 18px; background: ${COLORS.surface}; border-radius: 8px; border: 1px solid ${COLORS.border}; text-align: center; margin-bottom: 20px;">
        <p style="color: ${COLORS.textMuted}; font-size: 13px; line-height: 1.6; margin: 0 0 10px;">
          Besoin de relire ton protocole cycle 1 avant de choisir ?
        </p>
        <a href="${reportLink}" style="color: ${COLORS.primary}; font-size: 13px; text-decoration: underline; font-weight: 600;">
          Revoir mon rapport peptides →
        </a>
      </div>

      <p style="color: ${COLORS.textMuted}; font-size: 12px; line-height: 1.6; margin: 0; text-align: center;">
        Pas envie de relancer ? Pas de souci , je ne renverrai plus cet email.<br/>
        <a href="{{UNSUB_LINK}}" style="color: #525252; text-decoration: underline;">Se désabonner</a>
      </p>

      <img src="${trackingPixel}" width="1" height="1" style="display:none;" alt="" />
    `;

    const emailContent = getEmailWrapper(
      content,
      `linear-gradient(135deg, ${COLORS.warning} 0%, #f59e0b 100%)`,
      "Cycle 2",
      "Prêt pour la suite ?"
    );

    const result = await sendEmailWithTracking(
      {
        html: encodeBase64(emailContent),
        text: `Ton cycle 1 Peptides Engine touche a sa fin. Pret pour le cycle 2 ?\n\nTarif clients existants : 199€ (au lieu de 299€). Code CYCLE2.\n2 credits Blood Analysis offerts a nouveau.\n\nCommander : ${orderLink}\nRevoir le rapport cycle 1 : ${reportLink}\n\nAchzod`,
        subject: "Ton cycle 1 touche à sa fin , prêt pour le cycle 2 ? (-100€ clients existants)",
        from: { name: SENDER_NAME, email: SENDER_EMAIL },
        to: [{ email }],
      },
      {
        emailType: "sendPeptidesCycle2ReorderEmail",
        recipientEmail: email,
        auditId: reportId,
        metadata: { trackingId },
      }
    );

    return result.result === true;
  } catch (error) {
    console.error("[SendPulse] Error sending peptides cycle2 reorder email:", error);
    return false;
  }
}

// Peptides Engine order confirmation (immediate post-payment).
// Fires right after PayPal/Stripe payment is captured, before the deferred
// report delivery (4-8h anti-automation delay). Without this, clients pay
// 199-299 EUR and receive zero feedback for hours, thinking the payment
// failed. Apple-clean theme per Achzod brand policy (white + Apple blue).
export async function sendPeptidesOrderConfirmationEmail(
  email: string,
  opts: {
    firstName?: string;
    amountEur: number;
    promoCode?: string | null;
    peptidesNames?: string;
    scheduledDeliveryAt: Date;
    bloodCreditsCount?: number;
    orderId: string;
  }
): Promise<boolean> {
  try {
    const firstName = (opts.firstName || email.split("@")[0]).trim();
    const deliveryParis = opts.scheduledDeliveryAt.toLocaleString("fr-FR", {
      timeZone: "Europe/Paris",
      day: "2-digit",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
    });
    const promoLine = opts.promoCode
      ? `<tr><td style="padding:4px 0;color:#86868b;font-size:13px;">Code promo</td><td style="padding:4px 0;color:#1d1d1f;font-size:14px;text-align:right;font-weight:600;">${opts.promoCode}</td></tr>`
      : "";
    const peptidesLine = opts.peptidesNames
      ? `<tr><td style="padding:8px 0;color:#86868b;font-size:13px;vertical-align:top;">Peptides identifiés</td><td style="padding:8px 0;color:#1d1d1f;font-size:14px;text-align:right;line-height:1.5;">${opts.peptidesNames}</td></tr>`
      : "";
    const creditsBlock = (opts.bloodCreditsCount || 0) > 0
      ? `
      <div style="margin:24px 0 0;padding:18px 20px;background:#f5f5f7;border-radius:12px;border-left:3px solid #0071E3;">
        <p style="margin:0;color:#1d1d1f;font-size:14px;font-weight:600;">Bonus inclus : ${opts.bloodCreditsCount} Blood Analysis offertes</p>
        <p style="margin:6px 0 0;color:#515154;font-size:13px;line-height:1.5;">Tes codes promo Blood Analysis seront livrés en bas de ton rapport peptides (utilisables sur achzodcoaching.com).</p>
      </div>`
      : "";

    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Commande confirmée , Peptides Engine</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1d1d1f;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f5f5f7;padding:48px 16px;">
<tr><td align="center">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.04);">
<tr><td style="padding:32px 40px 0;">
  <p style="margin:0;color:#86868b;font-size:12px;letter-spacing:1px;text-transform:uppercase;font-weight:600;">ApexLabs , Peptides Engine</p>
</td></tr>
<tr><td style="padding:8px 40px 0;">
  <h1 style="margin:0;color:#1d1d1f;font-size:28px;font-weight:700;letter-spacing:-0.5px;line-height:1.25;">Commande confirmée</h1>
  <p style="margin:8px 0 0;color:#515154;font-size:15px;line-height:1.5;">Salut ${firstName}, ton paiement est bien reçu. Je m'occupe de finaliser ton protocole personnalisé.</p>
</td></tr>
<tr><td style="padding:24px 40px 0;">
  <div style="padding:20px 22px;border:1px solid #d2d2d7;border-radius:12px;background:#ffffff;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
      <tr><td style="padding:4px 0;color:#86868b;font-size:13px;">Produit</td><td style="padding:4px 0;color:#1d1d1f;font-size:14px;text-align:right;font-weight:600;">Peptides Engine</td></tr>
      <tr><td style="padding:4px 0;color:#86868b;font-size:13px;">Montant</td><td style="padding:4px 0;color:#1d1d1f;font-size:14px;text-align:right;font-weight:600;">${opts.amountEur.toFixed(2)} EUR</td></tr>
      ${promoLine}
      ${peptidesLine}
    </table>
  </div>
  ${creditsBlock}
</td></tr>
<tr><td style="padding:32px 40px 0;">
  <h2 style="margin:0;color:#1d1d1f;font-size:18px;font-weight:600;letter-spacing:-0.2px;">Et maintenant ?</h2>
  <p style="margin:10px 0 0;color:#515154;font-size:15px;line-height:1.6;">
    Je relis personnellement ton dossier (réponses au questionnaire, marqueurs déclarés, objectifs) pour calibrer le protocole. Pas un template, pas une recommandation générique. Je te livre ton rapport complet directement par email.
  </p>
  <div style="margin:18px 0 0;padding:14px 18px;background:#f5f5f7;border-radius:10px;">
    <p style="margin:0;color:#1d1d1f;font-size:14px;font-weight:600;">Livraison estimée : ${deliveryParis} (heure de Paris)</p>
    <p style="margin:6px 0 0;color:#86868b;font-size:13px;line-height:1.5;">Garde un oeil sur ta boîte mail. Si tu ne vois rien à cette heure, regarde tes spams avant de t'inquiéter.</p>
  </div>
</td></tr>
<tr><td style="padding:32px 40px 0;">
  <h2 style="margin:0;color:#1d1d1f;font-size:18px;font-weight:600;letter-spacing:-0.2px;">Ce que ton rapport contiendra</h2>
  <ul style="margin:12px 0 0;padding:0 0 0 18px;color:#515154;font-size:14px;line-height:1.7;">
    <li>Ta sélection de peptides personnalisée avec dosages exacts et fréquences d'injection</li>
    <li>Calendrier complet du cycle (durée, pauses, paliers)</li>
    <li>Liste des fournisseurs vérifiés (sourcing pharmaceutique propre)</li>
    <li>Protocole de reconstitution étape par étape</li>
    <li>Marqueurs sanguins à monitorer avant, mi-cycle et post-cycle</li>
    <li>Stack de supplements complémentaires</li>
    <li>Plan de récupération post-cycle (PCT et bilan métabolique)</li>
  </ul>
</td></tr>
<tr><td style="padding:32px 40px 0;">
  <div style="padding:18px 20px;background:#f5f5f7;border-radius:12px;border-left:3px solid #0071E3;">
    <p style="margin:0;color:#1d1d1f;font-size:14px;font-weight:600;">Une question urgente ?</p>
    <p style="margin:6px 0 0;color:#515154;font-size:13px;line-height:1.5;">Réponds directement à ce mail, je lis et je te réponds personnellement (en général sous 24h).</p>
  </div>
</td></tr>
<tr><td style="padding:32px 40px 40px;">
  <p style="margin:0;color:#1d1d1f;font-size:15px;line-height:1.6;">À très vite,<br><strong>Achzod</strong></p>
  <p style="margin:24px 0 0;color:#86868b;font-size:11px;line-height:1.5;border-top:1px solid #d2d2d7;padding-top:20px;">
    ApexLabs by Achzod , coaching@achzodcoaching.com<br>
    Référence commande : ${opts.orderId.slice(0,8)}<br>
    Tu reçois cet email parce que tu as commandé un protocole Peptides Engine.
  </p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

    const text = `Commande confirmée

Salut ${firstName},

Ton paiement de ${opts.amountEur.toFixed(2)} EUR pour Peptides Engine est bien reçu.

Je m'occupe de finaliser ton protocole personnalisé en relisant ton dossier.

Livraison estimée : ${deliveryParis} (heure de Paris).

Ton rapport contiendra :
- Sélection de peptides personnalisée + dosages + fréquences
- Calendrier complet du cycle
- Fournisseurs vérifiés
- Protocole de reconstitution
- Marqueurs sanguins à monitorer
- Stack de supplements
- Plan de récupération post-cycle

${opts.bloodCreditsCount && opts.bloodCreditsCount > 0 ? `Bonus inclus : ${opts.bloodCreditsCount} Blood Analysis offertes (codes dans ton rapport).\n\n` : ""}Une question urgente ? Réponds directement à ce mail.

À très vite,
Achzod
ApexLabs , coaching@achzodcoaching.com
Réf. commande : ${opts.orderId.slice(0,8)}`;

    const result = await sendEmailWithTracking(
      {
        subject: `Commande Peptides Engine confirmée , ton protocole arrive bientôt`,
        from: { name: SENDER_NAME, email: SENDER_EMAIL },
        to: [{ email }],
        html: encodeBase64(html),
        text,
      },
      {
        emailType: "sendPeptidesOrderConfirmation",
        recipientEmail: email,
        metadata: {
          orderId: opts.orderId,
          amountEur: opts.amountEur,
          promoCode: opts.promoCode || null,
          scheduledAt: opts.scheduledDeliveryAt.toISOString(),
        },
      }
    );
    return result.result === true;
  } catch (error) {
    console.error("[SendPulse] Error sending peptides order confirmation:", error);
    return false;
  }
}
