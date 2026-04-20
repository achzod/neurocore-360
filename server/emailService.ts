import type { ComprehensiveRiskProfile, RiskScore } from "./blood-analysis/risk-scores";
import { logBloodEmailDelivery } from "./blood-analysis/delivery-log";
import { logEmail, ADMIN_EMAIL_CC, type EmailTrackingData } from "./emailTracking";

const SENDPULSE_USER_ID =
  process.env.SENDPULSE_USER_ID || process.env.SENDPULSE_API_USER_ID || "";
const SENDPULSE_SECRET =
  process.env.SENDPULSE_SECRET || process.env.SENDPULSE_API_SECRET || "";
export const SENDER_EMAIL = process.env.SENDER_EMAIL || "coaching@achzodcoaching.com";
export const SENDER_NAME = process.env.SENDER_NAME || "ApexLabs by Achzod";

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
  }
): Promise<{ result: boolean; error?: any; message?: any }> {
  try {
    // Check unsubscribe before sending
    const { storage } = await import("./storage");
    if (await storage.isEmailUnsubscribed(trackingData.recipientEmail)) {
      console.log(`[SendPulse] BLOCKED — ${trackingData.recipientEmail} is unsubscribed`);
      return { result: false, error: "unsubscribed" };
    }

    // Replace unsubscribe placeholder with the actual link.
    //
    // IMPORTANT: callers encode the HTML with encodeBase64() BEFORE handing it
    // to us (SendPulse accepts a base64-encoded html field). That means when
    // we arrive here, the `{{UNSUB_LINK}}` literal is no longer visible in
    // emailPayload.html — it's been shuffled away in the base64. A plain
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

    if (looksLikeBase64(emailPayload.html)) {
      try {
        const decoded = Buffer.from(emailPayload.html, "base64").toString("utf8");
        const replaced = decoded.replace(/\{\{UNSUB_LINK\}\}/g, unsubLink);
        emailPayload.html = Buffer.from(replaced).toString("base64");
      } catch {
        // Fall through — at worst the link stays broken, but we don't crash the send.
      }
    } else {
      emailPayload.html = emailPayload.html.replace(/\{\{UNSUB_LINK\}\}/g, unsubLink);
    }
    emailPayload.text = emailPayload.text.replace(/\{\{UNSUB_LINK\}\}/g, unsubLink);

    const token = await getAccessToken();

    // Add BCC to admin email for all outgoing emails
    const payloadWithBcc = {
      ...emailPayload,
      bcc: [{ email: ADMIN_EMAIL_CC, name: "Admin APEXLABS" }],
    };

    console.log(`[SendPulse] Sending ${trackingData.emailType} to ${trackingData.recipientEmail} (BCC: ${ADMIN_EMAIL_CC})`);

    const response = await fetch("https://api.sendpulse.com/smtp/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ email: payloadWithBcc, track_opens: 1, track_clicks: 1 }),
    });

    const result = (await response.json()) as { result: boolean; error?: any; message?: any };

    // Log to tracking system
    await logEmail({
      emailType: trackingData.emailType,
      recipientEmail: trackingData.recipientEmail,
      recipientName: trackingData.recipientName,
      auditId: trackingData.auditId,
      auditType: trackingData.auditType,
      subject: emailPayload.subject,
      previewText: emailPayload.text.substring(0, 100),
      sendpulseStatus: result.result ? "success" : "failed",
      sendpulseError: result.error ? JSON.stringify(result.error) : undefined,
      metadata: trackingData.metadata,
    });

    console.log(`[SendPulse] Email ${result.result ? "✅ sent" : "❌ failed"}:`, result);
    return result;
  } catch (error) {
    console.error(`[SendPulse] Error sending ${trackingData.emailType}:`, error);

    // Log failed attempt
    await logEmail({
      emailType: trackingData.emailType,
      recipientEmail: trackingData.recipientEmail,
      recipientName: trackingData.recipientName,
      auditId: trackingData.auditId,
      auditType: trackingData.auditType,
      subject: emailPayload.subject,
      previewText: emailPayload.text.substring(0, 100),
      sendpulseStatus: "failed",
      sendpulseError: String(error),
      metadata: trackingData.metadata,
    });

    return { result: false, error: String(error) };
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
    ? `Deduction appliquee : -${deductionPercent}% (sauf Starter)`
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
  //   - All `@import` and external fonts removed — Gmail blocks them,
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

// Primary CTA Button — Gmail + Outlook bulletproof (VML fallback for Outlook 07+).
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

  // GRATUIT / DISCOVERY uses DISCOVERY20 (-20% percent on all formules except Starter)
  const isDiscovery = auditType === "GRATUIT" || auditType === "DISCOVERY";
  const discoveryPromo = isDiscovery
    ? { code: "DISCOVERY20", percent: 20 }
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
        <p style="color: ${COLORS.text}; font-size: 13px; margin: 8px 0 0;">-${discoveryPromo.percent}% sur toutes les formules (sauf Starter)</p>
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
        ? "Ton rapport est la — on regarde ce qui bloque ?"
        : auditType === "BLOOD_ANALYSIS"
        ? "Tes marqueurs sanguins sont analyses — resultats dedans"
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
    .replace(/[—–]/g, "-")
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

const CLAUDE_THEME = {
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
    /(-?\d+(?:[.,]\d+)?)\s*(?:-|–|—|to|a|à)\s*(-?\d+(?:[.,]\d+)?)/i,
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
        <h3>Score global NEUROCORE 360</h3>
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
    return `<p style="margin:0;color:${CLAUDE_THEME.muted};font-size:15px;line-height:1.8;">Le radar des scores n'a pas pu être construit automatiquement sur cette version du rapport. Je te recommande de relancer la génération pour obtenir la cartographie complète de chaque biomarqueur.</p>`;
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

const renderClaudeTabbedReportHtml = (
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
      const bodyHtml = renderSectionLinesToHtml(section.lines, CLAUDE_THEME.ink, CLAUDE_THEME.muted);
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
  <title>NEUROCORE 360 | ACHZOD | ${escapeHtml(clientName)} | Bilan sanguin complet</title>
  <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='14' fill='%232f2822'/%3E%3Cpath d='M32 11l17 42h-8.3l-3.2-8.7H26.4L23.2 53H15L32 11zm2.8 25.8L32 28.7l-2.8 8.1h5.6z' fill='%23f8dcc0'/%3E%3C/svg%3E">
  <style>
    :root {
      --paper: ${CLAUDE_THEME.paper};
      --paper-soft: ${CLAUDE_THEME.paperSoft};
      --card: ${CLAUDE_THEME.card};
      --card-strong: ${CLAUDE_THEME.cardStrong};
      --ink: ${CLAUDE_THEME.ink};
      --muted: ${CLAUDE_THEME.muted};
      --border: ${CLAUDE_THEME.border};
      --accent: ${CLAUDE_THEME.accent};
      --accent-soft: ${CLAUDE_THEME.accentSoft};
      --shadow: ${CLAUDE_THEME.shadow};
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
        <div class="badge"><span class="badge-dot"></span>NEUROCORE 360</div>
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
    <p class="footer-note">Rapport ID: ${escapeHtml(reportId)} · Généré pour envoi client · <strong>NEUROCORE 360 by ACHZOD</strong></p>
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

const getClaudeLightEmailWrapper = (
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
<body style="margin:0;padding:0;background:${CLAUDE_THEME.paper};font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:${CLAUDE_THEME.ink};">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:30px 14px;background:${CLAUDE_THEME.paper};">
    <tr>
      <td align="center">
        <table role="presentation" width="700" cellspacing="0" cellpadding="0" style="max-width:700px;background:${CLAUDE_THEME.card};border-radius:16px;border:1px solid ${CLAUDE_THEME.border};overflow:hidden;">
          <tr>
            <td style="padding:26px 26px 20px;background:linear-gradient(140deg,${CLAUDE_THEME.cardStrong} 0%,${CLAUDE_THEME.paperSoft} 100%);border-bottom:1px solid ${CLAUDE_THEME.border};">
              <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.1em;color:${CLAUDE_THEME.accent};font-weight:700;margin-bottom:10px;">Theme Claude · ApexLabs</div>
              <h1 style="margin:0;color:${CLAUDE_THEME.ink};font-size:30px;line-height:1.2;letter-spacing:-0.02em;">${escapeHtml(
                headerTitle
              )}</h1>
              <p style="margin:10px 0 0;color:${CLAUDE_THEME.muted};font-size:14px;line-height:1.55;">${escapeHtml(
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

const FORBIDDEN_DASH_REGEX = /[—–]/;
const FORBIDDEN_EMOJI_REGEX = /[\u{1F1E6}-\u{1F1FF}\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;

const normalizeQualityText = (value: string): string =>
  String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[—–-]+/g, " ")
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

const extractSendPulseDeliveryId = (payload: unknown): string | undefined => {
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
};

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
    // and BEFORE the quality gate checks — otherwise the gate blocks on raw AI em-dashes.
    reportMarkdown = stripBloodForbiddenFormatting(reportMarkdown);
    const fallbackNameFromEmail = String(email || "")
      .split("@")[0]
      .replace(/[._-]+/g, " ")
      .trim()
      .replace(/\b\w/g, (char) => char.toUpperCase());
    const standaloneReportHtml = renderClaudeTabbedReportHtml(reportId, reportMarkdown, markerSnapshots, {
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
        <span style="display:inline-block;background:${CLAUDE_THEME.accentSoft};color:${CLAUDE_THEME.accent};padding:8px 16px;border-radius:999px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;border:1px solid ${CLAUDE_THEME.border};">
          Rapport client en piece jointe
        </span>
      </div>

      <h2 style="color:${CLAUDE_THEME.ink};margin:0 0 10px;font-size:30px;text-align:center;font-weight:700;letter-spacing:-0.02em;">
        Ton rapport Blood Analysis est pret
      </h2>
      <p style="color:${CLAUDE_THEME.muted};font-size:15px;line-height:1.75;margin:0 0 12px;">
        ${escapeHtml(clientName)}, j'ai finalise ton analyse sanguine complete. Le rapport est livre uniquement en fichier HTML joint pour que tu puisses l'ouvrir localement avec tous les onglets interactifs.
      </p>
      <p style="color:${CLAUDE_THEME.muted};font-size:15px;line-height:1.75;margin:0 0 12px;">
        Ce livrable contient les scores composites, le radar dynamique, l'onglet de chaque marqueur extrait avec definition et impacts, puis toutes les sections d'analyse et de plan d'action.
      </p>
      <div style="margin:12px 0 0;padding:14px;border:1px solid ${CLAUDE_THEME.border};border-radius:12px;background:${CLAUDE_THEME.paperSoft};">
        <p style="margin:0 0 8px;color:${CLAUDE_THEME.ink};font-size:14px;font-weight:700;">Rappel dossier</p>
        <p style="margin:0 0 4px;color:${CLAUDE_THEME.muted};font-size:14px;line-height:1.65;">Nombre de marqueurs analyses: ${markerCount}</p>
        <p style="margin:0;color:${CLAUDE_THEME.muted};font-size:14px;line-height:1.65;">Priorites visibles sur cette extraction: ${escapeHtml(topPriorityText)}.</p>
      </div>

      <div style="margin:20px 0;padding:20px;border:2px dashed ${CLAUDE_THEME.accent};border-radius:12px;text-align:center;background:${CLAUDE_THEME.accentSoft};">
        <p style="color:${CLAUDE_THEME.muted};font-size:11px;text-transform:uppercase;letter-spacing:2px;margin:0 0 6px;">Ton code promo</p>
        <p style="color:${CLAUDE_THEME.accent};font-size:28px;font-weight:700;letter-spacing:3px;margin:0;">BLOOD99</p>
        <p style="color:${CLAUDE_THEME.ink};font-size:13px;margin:8px 0 0;">-99EUR deduits sur ton coaching Achzod</p>
      </div>
      <p style="color:${CLAUDE_THEME.muted};font-size:13px;line-height:1.65;margin:0 0 8px;text-align:center;">
        Le montant de ta Blood Analysis (99 EUR) est deduit a 100% si tu passes au coaching.<br/>
        Utilise ce code sur <a href="https://www.achzodcoaching.com/formules-coaching" style="color:${CLAUDE_THEME.accent};text-decoration:underline;">achzodcoaching.com</a> pour deduire 99EUR de ta formule coaching.
      </p>

      <div style="margin-top:14px;padding-top:14px;border-top:1px solid ${CLAUDE_THEME.border};text-align:center;">
        <p style="margin:0;color:${CLAUDE_THEME.muted};font-size:12px;">Pièce jointe: <strong style="color:${CLAUDE_THEME.ink};">Blood_Analysis_${escapeHtml(
          reportId
        )}.html</strong></p>
      </div>
    `;

    const emailContent = stripBloodForbiddenFormatting(getClaudeLightEmailWrapper(
      content,
      "Blood Analysis",
      "Rapport HTML a onglets (theme Claude)",
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
        L'email a ete envoye au contact.
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
  message: string
): Promise<boolean> {
  try {
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

    const emailContent = getEmailWrapper(
      content,
      `linear-gradient(135deg, ${COLORS.primary} 0%, #0b0b0f 100%)`,
      "ApexLabs",
      "Message personnalisé"
    );

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

// Email Discovery J+3: pivot vers le coaching directement (plus d'upsell audit intermédiaire).
// Push Essential (entry tier) avec DISCOVERY20. L'objectif est d'établir le coaching
// comme la "vraie solution" dès J+3 plutôt que de vendre un 2e audit à 59€.
export async function sendGratuitUpsellEmail(
  email: string,
  auditId: string,
  baseUrl: string,
  trackingId: string
): Promise<boolean> {
  try {
    const reportLink = `${baseUrl}/analysis/${auditId}`;
    const coachingLink = `https://www.achzodcoaching.com/coaching-essential?utm_source=apexlabs&utm_medium=email&utm_campaign=discovery_j3_coaching`;
    const allFormulesLink = `https://www.achzodcoaching.com/formules-coaching?utm_source=apexlabs&utm_medium=email&utm_campaign=discovery_j3_coaching`;
    const trackingPixel = `${baseUrl}/api/track/email/${trackingId}/open.gif`;

    const content = `
      <h2 style="color: ${COLORS.text}; margin: 0 0 16px; font-size: 28px; text-align: center; font-weight: 700; letter-spacing: -1px;">
        Ton Discovery t'a dit <span style="color:${COLORS.primary};">QUOI</span>.<br/>Le coaching te dit <span style="color:${COLORS.primary};">COMMENT</span>.
      </h2>

      <p style="color: ${COLORS.textMuted}; font-size: 16px; line-height: 1.7; margin: 0 0 28px; text-align: center;">
        Tu as tes scores, tes blocages, la carte de ton profil.<br/>
        <strong style="color: ${COLORS.text};">Mais aucun score ne s'améliore en le regardant.</strong>
      </p>

      <!-- Pain point framing -->
      <div style="padding: 24px; background: ${COLORS.surface}; border-radius: 12px; border-left: 4px solid ${COLORS.warning}; margin-bottom: 28px;">
        <p style="color: ${COLORS.text}; font-size: 15px; font-weight: 600; margin: 0 0 10px;">
          Trois trucs qui se passent à 99% quand on essaie seul :
        </p>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
          <tr><td style="padding: 6px 0; color: ${COLORS.textMuted}; font-size: 14px;">→ Tu sais par où commencer pendant 1 semaine, puis tu dévies</td></tr>
          <tr><td style="padding: 6px 0; color: ${COLORS.textMuted}; font-size: 14px;">→ Tu vois aucun résultat mesurable à J+30, tu doutes, tu abandonnes</td></tr>
          <tr><td style="padding: 6px 0; color: ${COLORS.textMuted}; font-size: 14px;">→ Tu restes bloqué sur les mêmes axes pendant 6 mois sans le savoir</td></tr>
        </table>
      </div>

      <!-- Coaching Essential CTA -->
      <div style="padding: 28px; background: linear-gradient(135deg, ${COLORS.primary}20 0%, ${COLORS.primary}05 100%); border-radius: 12px; border: 2px solid ${COLORS.primary}; margin-bottom: 24px; text-align: center;">
        <p style="color: ${COLORS.textMuted}; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 6px; font-weight: 700;">
          Le pas logique après ton Discovery
        </p>
        <h3 style="color: ${COLORS.primary}; font-size: 26px; font-weight: 700; margin: 0 0 10px; letter-spacing: -0.5px;">
          Coaching Essential — à partir de 249€
        </h3>
        <p style="color: ${COLORS.text}; font-size: 14px; line-height: 1.7; margin: 0 0 16px;">
          Je construis ton plan <strong>d'après ton Discovery</strong> — pas un questionnaire à refaire.<br/>
          Plan + nutrition précision + bilans hebdos. Tu m'écris tes retours, j'ajuste chaque semaine.
        </p>
        <div style="background: ${COLORS.background}; border-radius: 8px; padding: 14px 18px; display: inline-block; margin-bottom: 16px; border: 1px dashed ${COLORS.primary};">
          <p style="color: ${COLORS.textMuted}; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; margin: 0 0 4px; font-weight: 600;">
            Code clients Discovery
          </p>
          <p style="color: ${COLORS.primary}; font-size: 22px; font-weight: 700; letter-spacing: 3px; margin: 0;">
            DISCOVERY20
          </p>
          <p style="color: ${COLORS.text}; font-size: 12px; margin: 4px 0 0;">-20% sur toutes les formules (sauf Starter)</p>
        </div>
        <br/>
        ${getPrimaryButton('Voir Coaching Essential →', coachingLink)}
      </div>

      <!-- Secondary: all formules -->
      <div style="padding: 14px 18px; background: ${COLORS.surface}; border-radius: 8px; border: 1px solid ${COLORS.border}; text-align: center; margin-bottom: 16px;">
        <a href="${allFormulesLink}" style="color: ${COLORS.textMuted}; font-size: 13px; text-decoration: underline;">
          Comparer les 3 formules (Essential / Elite / Private Lab) →
        </a>
      </div>

      <!-- Relire le rapport -->
      <div style="padding: 14px 18px; background: ${COLORS.surface}; border-radius: 8px; border: 1px solid ${COLORS.border}; text-align: center; margin-bottom: 16px;">
        <a href="${reportLink}" style="color: ${COLORS.textMuted}; font-size: 13px; text-decoration: underline;">
          Relire mon Discovery Scan
        </a>
      </div>

      <p style="color: ${COLORS.textMuted}; font-size: 12px; line-height: 1.6; margin: 0 0 8px; text-align: center;">
        Pas intéressé ? Ignore simplement cet email.<br/>
        <a href="{{UNSUB_LINK}}" style="color: #525252; text-decoration: underline;">Se désabonner</a>
      </p>

      <img src="${trackingPixel}" width="1" height="1" style="display:none;" alt="" />
    `;

    const emailContent = getEmailWrapper(content);

    const result = await sendEmailWithTracking(
      {
        html: encodeBase64(emailContent),
        text: `Ton Discovery t'a dit QUOI. Le coaching te dit COMMENT.\n\nEssential (à partir de 249€, 4/8/12 sem) construit ton plan d'après ton Discovery.\n\nCode DISCOVERY20 = -20% sur toutes les formules sauf Starter.\n\nVoir Essential : ${coachingLink}\nComparer toutes les formules : ${allFormulesLink}\n\nAchzod`,
        subject: "Ton Discovery te dit QUOI. Le coaching te dit COMMENT.",
        from: { name: "Achzod Coaching", email: SENDER_EMAIL },
        to: [{ email }],
      },
      {
        emailType: "sendGratuitUpsellEmail",
        recipientEmail: email,
        auditId,
        auditType: "GRATUIT",
        metadata: { promoCode: "DISCOVERY20", reportLink, coachingLink, trackingId },
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

// Email Discovery J+14: coaching personnalisé avec code DISCOVERY20.
// Accepts an optional `recommendation` produced by recommendCoachingTier() —
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
    const defaultHref = `https://www.achzodcoaching.com/formules-coaching?utm_source=apexlabs&utm_medium=email&utm_campaign=discovery_j14`;
    const coachingLink = recommendation
      ? `${recommendation.href}?utm_source=apexlabs&utm_medium=email&utm_campaign=discovery_j14&tier=${recommendation.tier.toLowerCase()}`
      : defaultHref;
    const tierLabel = recommendation
      ? recommendation.tier === "PRIVATELAB" ? "Private Lab" : recommendation.tier === "ELITE" ? "Elite" : "Essential"
      : null;

    const content = `
      <h2 style="color: ${COLORS.text}; margin: 0 0 16px; font-size: 28px; text-align: center; font-weight: 700; letter-spacing: -1px;">
        ${tierLabel ? `Je te recommande <span style="color:${COLORS.primary};">${tierLabel}</span>` : "L'analyse seule ne suffit pas"}
      </h2>

      <p style="color: ${COLORS.textMuted}; font-size: 16px; line-height: 1.7; margin: 0 0 28px; text-align: center;">
        Tu as ton Discovery Scan. Tu connais maintenant tes points faibles.<br/>
        <strong style="color: ${COLORS.text};">Mais comment transformer ces infos en résultats concrets ?</strong>
      </p>

      ${recommendation ? `
      <!-- Personalized recommendation based on Discovery profile -->
      <div style="padding: 20px; background: ${COLORS.primary}15; border-radius: 12px; border: 1px solid ${COLORS.primary}40; margin-bottom: 28px;">
        <p style="color: ${COLORS.primary}; font-size: 11px; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 8px; font-weight: 700;">
          Recommandation d'après ton profil
        </p>
        <p style="color: ${COLORS.text}; font-size: 15px; line-height: 1.7; margin: 0;">
          ${recommendation.reason}
        </p>
      </div>
      ` : ""}

      <!-- Problème -->
      <div style="padding: 24px; background: ${COLORS.surface}; border-radius: 12px; border-left: 4px solid ${COLORS.warning}; margin-bottom: 28px;">
        <p style="color: ${COLORS.text}; font-size: 16px; font-weight: 600; margin: 0 0 12px;">
          Le problème de l'auto-application :
        </p>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
          <tr><td style="padding: 6px 0; color: ${COLORS.textMuted}; font-size: 14px;">❌ Tu ne sais pas par où commencer</td></tr>
          <tr><td style="padding: 6px 0; color: ${COLORS.textMuted}; font-size: 14px;">❌ Tu procrastines la mise en action</td></tr>
          <tr><td style="padding: 6px 0; color: ${COLORS.textMuted}; font-size: 14px;">❌ Tu perds du temps avec des essais-erreurs</td></tr>
          <tr><td style="padding: 6px 0; color: ${COLORS.textMuted}; font-size: 14px;">❌ Tu abandonnes après 2-3 semaines</td></tr>
        </table>
      </div>

      <!-- Solution Coaching -->
      <div style="padding: 32px; background: linear-gradient(135deg, ${COLORS.primary}20 0%, ${COLORS.primary}05 100%); border-radius: 12px; border: 2px solid ${COLORS.primary}; margin-bottom: 28px;">
        <h3 style="color: ${COLORS.primary}; font-size: 24px; font-weight: 700; margin: 0 0 16px; text-align: center; letter-spacing: -0.5px;">
          Le Coaching Achzod, c'est l'application pratique
        </h3>

        <p style="color: ${COLORS.textMuted}; font-size: 15px; line-height: 1.7; margin: 0 0 24px; text-align: center;">
          <strong style="color: ${COLORS.text};">Suivi personnalisé</strong> basé sur TON profil Discovery<br/>
          + <strong style="color: ${COLORS.text};">Plan d'action concret</strong> + <strong style="color: ${COLORS.text};">Accountability</strong> pour tenir sur la durée
        </p>

        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
          <tr><td style="padding: 8px 0; color: ${COLORS.text}; font-size: 15px; font-weight: 500;">✓ Protocole nutrition personnalisé</td></tr>
          <tr><td style="padding: 8px 0; color: ${COLORS.text}; font-size: 15px; font-weight: 500;">✓ Programme d'entraînement adapté</td></tr>
          <tr><td style="padding: 8px 0; color: ${COLORS.text}; font-size: 15px; font-weight: 500;">✓ Suppléments optimisés pour TON cas</td></tr>
          <tr><td style="padding: 8px 0; color: ${COLORS.text}; font-size: 15px; font-weight: 500;">✓ Suivi hebdo/mensuel pour ajuster</td></tr>
          <tr><td style="padding: 8px 0; color: ${COLORS.text}; font-size: 15px; font-weight: 500;">✓ Accès direct à Achzod (WhatsApp/Telegram)</td></tr>
        </table>

        <!-- Code Promo -->
        <div style="background: ${COLORS.background}; border-radius: 10px; padding: 24px; text-align: center; margin-bottom: 24px; border: 2px dashed ${COLORS.primary};">
          <p style="color: ${COLORS.textMuted}; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 8px; font-weight: 600;">
            Code promo exclusif
          </p>
          <p style="color: ${COLORS.primary}; font-size: 40px; font-weight: 700; letter-spacing: 4px; margin: 0 0 8px;">
            DISCOVERY20
          </p>
          <p style="color: ${COLORS.text}; font-size: 15px; margin: 0; font-weight: 600;">
            -20% sur toutes les formules coaching<br/><span style="font-size: 13px; color: ${COLORS.textMuted};">(sauf formule Starter)</span>
          </p>
        </div>

        ${getPrimaryButton(tierLabel ? `Voir ${tierLabel} →` : 'Voir les formules coaching →', coachingLink)}
      </div>

      <!-- Social Proof -->
      <div style="padding: 20px; background: ${COLORS.surface}; border-radius: 8px; margin-bottom: 24px; border-left: 3px solid ${COLORS.primary};">
        <p style="color: ${COLORS.textMuted}; font-size: 13px; line-height: 1.7; margin: 0; font-style: italic;">
          <strong style="color: ${COLORS.text};">"J'ai fait le Discovery, vu mes points faibles, mais c'est le coaching qui a tout changé. En 8 semaines, j'ai perdu 6kg, gagné en muscle et ma libido est revenue. L'analyse c'est le diagnostic, le coaching c'est le traitement."</strong><br/>
          <span style="font-size: 12px; color: ${COLORS.textMuted};">— Magroud W., suivi 3 mois</span>
        </p>
      </div>

      <p style="color: ${COLORS.textMuted}; font-size: 14px; line-height: 1.7; margin: 0 0 8px; text-align: center;">
        Tu as les données. Maintenant passe à l'action.
      </p>

      <p style="color: ${COLORS.textMuted}; font-size: 12px; text-align: center; margin: 24px 0 0;">
        Code valable jusqu'au <strong style="color: ${COLORS.text};">${new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('fr-FR')}</strong>
      </p>

      <img src="${trackingPixel}" width="1" height="1" style="display:none;" alt="" />
    `;

    const emailContent = getEmailWrapper(
      content,
      `linear-gradient(135deg, ${COLORS.primary} 0%, #059669 100%)`,
      "Coaching Achzod",
      "Transforme ton analyse en résultats"
    );

    const result = await sendEmailWithTracking(
      {
        html: encodeBase64(emailContent),
        text: tierLabel
          ? `Je te recommande ${tierLabel} d'après ton Discovery. ${recommendation!.reason} Code DISCOVERY20 (-20% sauf Starter). Voir ${tierLabel}: ${coachingLink}`
          : `L'analyse seule ne suffit pas. Coaching personnalisé basé sur ton Discovery Scan avec code DISCOVERY20 (-20% sur toutes les formules sauf Starter). Voir les formules: ${coachingLink}`,
        subject: tierLabel
          ? `${tierLabel} — la formule qui match ton Discovery (-20%)`
          : "Tu as les donnees. Maintenant passe a l'action",
        from: { name: "Achzod Coaching", email: SENDER_EMAIL },
        to: [{ email }],
      },
      {
        emailType: "sendDiscoveryJ14CoachingEmail",
        recipientEmail: email,
        auditId,
        auditType: "GRATUIT",
        metadata: { promoCode: "DISCOVERY20", coachingLink, trackingId, recommendedTier: recommendation?.tier },
      }
    );

    console.log(`[SendPulse] Discovery J+14 coaching email sent to ${email}:`, result);
    return result.result === true;
  } catch (error) {
    console.error("[SendPulse] Error sending Discovery J+14 coaching email:", error);
    return false;
  }
}

// Email Discovery J+5: "Pourquoi ton Discovery seul ne va rien changer" — angle
// storytelling brutal, pousse coaching Essential directement plutôt que des audits.
export async function sendGratuitJ5Email(
  email: string,
  auditId: string,
  baseUrl: string,
  trackingId: string
): Promise<boolean> {
  try {
    const trackingPixel = `${baseUrl}/api/track/email/${trackingId}/open.gif`;
    const primaryCtaLink = `https://www.achzodcoaching.com/coaching-essential?utm_source=apexlabs&utm_medium=email&utm_campaign=discovery_j5`;
    const secondaryCtaLink = `https://www.achzodcoaching.com/formules-coaching?utm_source=apexlabs&utm_medium=email&utm_campaign=discovery_j5`;
    const reportLink = `${baseUrl}/analysis/${auditId}`;

    const content = `
      <h2 style="color: ${COLORS.text}; margin: 0 0 16px; font-size: 28px; text-align: center; font-weight: 700; letter-spacing: -1px;">
        Pourquoi ton Discovery<br/>seul <span style="color:${COLORS.warning};">ne va rien changer</span>
      </h2>

      <p style="color: ${COLORS.textMuted}; font-size: 16px; line-height: 1.7; margin: 0 0 28px; text-align: center;">
        5 jours depuis ton rapport. Statistiquement, tu n'as probablement rien appliqué.<br/>
        <strong style="color: ${COLORS.text};">C'est pas de ta faute. C'est le mode "auto-application" qui est cassé.</strong>
      </p>

      <!-- Les 3 raisons (storytelling) -->
      <div style="padding: 28px; background: ${COLORS.surface}; border-radius: 12px; border: 1px solid ${COLORS.border}; margin-bottom: 28px;">
        <p style="color: ${COLORS.textMuted}; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 20px; font-weight: 600; text-align: center;">
          3 raisons pour lesquelles on n'y arrive pas seul
        </p>

        <div style="padding: 16px; background: ${COLORS.background}; border-radius: 8px; border-left: 3px solid ${COLORS.warning}; margin-bottom: 12px;">
          <div>
            <p style="color: ${COLORS.text}; font-size: 15px; font-weight: 600; margin: 0 0 4px;">
              1. Le plan manque — tu sais où tu bloques mais pas quoi faire lundi matin
            </p>
            <p style="color: ${COLORS.textMuted}; font-size: 13px; margin: 0; line-height: 1.6;">
              Un rapport te donne les scores. Pas une routine jour-par-jour, pas des repas calibrés, pas des charges d'entraînement adaptées à TA fatigue cette semaine.
            </p>
          </div>
        </div>

        <div style="padding: 16px; background: ${COLORS.background}; border-radius: 8px; border-left: 3px solid ${COLORS.warning}; margin-bottom: 12px;">
          <div>
            <p style="color: ${COLORS.text}; font-size: 15px; font-weight: 600; margin: 0 0 4px;">
              2. Aucun ajustement — tu pars droit dans le mur sans feedback
            </p>
            <p style="color: ${COLORS.textMuted}; font-size: 13px; margin: 0; line-height: 1.6;">
              Après 1 semaine, ton corps réagit différemment de la théorie. Sans quelqu'un qui lit tes bilans hebdos et recalibre, tu restes sur un plan générique pendant 2 mois.
            </p>
          </div>
        </div>

        <div style="padding: 16px; background: ${COLORS.background}; border-radius: 8px; border-left: 3px solid ${COLORS.warning};">
          <div>
            <p style="color: ${COLORS.text}; font-size: 15px; font-weight: 600; margin: 0 0 4px;">
              3. L'accountability manque — personne ne te réveille quand tu dévies
            </p>
            <p style="color: ${COLORS.textMuted}; font-size: 13px; margin: 0; line-height: 1.6;">
              Sans contrat moral, tu arrêtes après 10 jours. C'est pas de la faiblesse — c'est de la physiologie. 98% des gens font pareil.
            </p>
          </div>
        </div>
      </div>

      <!-- CTA Principal : Coaching Essential -->
      <div style="padding: 28px; background: linear-gradient(135deg, ${COLORS.primary}20 0%, ${COLORS.primary}05 100%); border-radius: 12px; border: 2px solid ${COLORS.primary}; margin-bottom: 20px; text-align: center;">
        <p style="color: ${COLORS.textMuted}; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 8px; font-weight: 700;">
          La solution qui résout les 3
        </p>
        <h3 style="color: ${COLORS.primary}; font-size: 22px; font-weight: 700; margin: 0 0 10px; letter-spacing: -0.5px;">
          Coaching Essential — à partir de 249€
        </h3>
        <p style="color: ${COLORS.text}; font-size: 14px; margin: 0 0 16px; line-height: 1.6;">
          Plan sur-mesure basé sur ton Discovery · Nutrition précision · Bilans hebdos · Ajustements en continu · Contrat moral avec moi.
        </p>
        <div style="background: ${COLORS.background}; border-radius: 8px; padding: 12px 16px; display: inline-block; margin-bottom: 14px; border: 1px dashed ${COLORS.primary};">
          <p style="color: ${COLORS.primary}; font-size: 18px; font-weight: 700; letter-spacing: 3px; margin: 0;">
            DISCOVERY20
          </p>
          <p style="color: ${COLORS.textMuted}; font-size: 11px; margin: 4px 0 0;">-20% sauf Starter</p>
        </div>
        <br/>
        ${getPrimaryButton('Voir Coaching Essential →', primaryCtaLink)}
      </div>

      <!-- CTA Secondaire -->
      <div style="text-align: center; margin-bottom: 24px;">
        <a href="${secondaryCtaLink}" style="color: ${COLORS.textMuted}; font-size: 14px; text-decoration: underline;">
          Comparer les 3 formules (Essential / Elite / Private Lab) →
        </a>
      </div>

      <div style="padding: 14px 18px; background: ${COLORS.surface}; border-radius: 8px; border: 1px solid ${COLORS.border}; text-align: center;">
        <a href="${reportLink}" style="color: ${COLORS.textMuted}; font-size: 13px; text-decoration: underline;">
          Relire mon Discovery Scan
        </a>
      </div>

      <img src="${trackingPixel}" width="1" height="1" style="display:none;" alt="" />
    `;

    const emailContent = getEmailWrapper(
      content,
      `linear-gradient(135deg, ${COLORS.primary} 0%, #059669 100%)`,
      "Coaching Achzod",
      "Pourquoi seul ne marche pas"
    );

    const result = await sendEmailWithTracking(
      {
        html: encodeBase64(emailContent),
        text: `Pourquoi ton Discovery seul ne va rien changer.\n\n3 raisons : pas de plan concret, pas d'ajustement hebdo, pas d'accountability.\n\nCoaching Essential (249€+, 4/8/12 sem) résout les 3. Code DISCOVERY20 (-20% sauf Starter).\n\nEssential: ${primaryCtaLink}\nToutes les formules: ${secondaryCtaLink}\n\nAchzod`,
        subject: "Pourquoi ton Discovery seul ne va rien changer",
        from: { name: "Achzod Coaching", email: SENDER_EMAIL },
        to: [{ email }],
      },
      {
        emailType: "sendGratuitJ5Email",
        recipientEmail: email,
        auditId,
        auditType: "GRATUIT",
        metadata: { promoCode: "DISCOVERY20", primaryCtaLink, secondaryCtaLink, trackingId },
      }
    );

    console.log(`[SendPulse] Discovery J+5 email sent to ${email}:`, result);
    return result.result === true;
  } catch (error) {
    console.error("[SendPulse] Error sending Discovery J+5 email:", error);
    return false;
  }
}

// Email Discovery J+7: "Offre limitée -20% cette semaine"
export async function sendGratuitJ7Email(
  email: string,
  auditId: string,
  baseUrl: string,
  trackingId: string
): Promise<boolean> {
  try {
    const trackingPixel = `${baseUrl}/api/track/email/${trackingId}/open.gif`;
    const essentialLink = `https://www.achzodcoaching.com/coaching-essential?utm_source=apexlabs&utm_medium=email&utm_campaign=discovery_j7_lastcall`;
    const eliteLink = `https://www.achzodcoaching.com/coaching-elite?utm_source=apexlabs&utm_medium=email&utm_campaign=discovery_j7_lastcall`;
    const privateLabLink = `https://www.achzodcoaching.com/coaching-achzod-private-lab?utm_source=apexlabs&utm_medium=email&utm_campaign=discovery_j7_lastcall`;
    const allFormulesLink = `https://www.achzodcoaching.com/formules-coaching?utm_source=apexlabs&utm_medium=email&utm_campaign=discovery_j7_lastcall`;

    const content = `
      <h2 style="color: ${COLORS.text}; margin: 0 0 16px; font-size: 28px; text-align: center; font-weight: 700; letter-spacing: -1px;">
        Dernière relance<br/><span style="color:${COLORS.warning};">DISCOVERY20 expire dans 48h</span>
      </h2>

      <p style="color: ${COLORS.textMuted}; font-size: 16px; line-height: 1.7; margin: 0 0 28px; text-align: center;">
        7 jours depuis ton Discovery. Si t'attendais un déclic, c'est maintenant.<br/>
        <strong style="color: ${COLORS.text};">Le code -20% coaching se désactive dans 48h.</strong>
      </p>

      <!-- Urgency box -->
      <div style="background: ${COLORS.background}; border-radius: 10px; padding: 22px; border: 2px dashed ${COLORS.warning}; margin-bottom: 28px; text-align: center;">
        <p style="color: ${COLORS.warning}; font-size: 11px; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 8px; font-weight: 700;">
          Code à utiliser au checkout
        </p>
        <p style="color: ${COLORS.warning}; font-size: 36px; font-weight: 700; letter-spacing: 4px; margin: 0 0 8px;">
          DISCOVERY20
        </p>
        <p style="color: ${COLORS.text}; font-size: 14px; margin: 0; font-weight: 600;">
          -20% sur toutes les formules coaching (sauf Starter)
        </p>
        <p style="color: ${COLORS.textMuted}; font-size: 12px; margin: 8px 0 0;">
          Expire <strong style="color:${COLORS.warning};">dans 48h</strong> — après, plus de discount client Discovery.
        </p>
      </div>

      <!-- 3 formules side by side -->
      <p style="color: ${COLORS.textMuted}; font-size: 13px; text-align: center; margin: 0 0 16px; text-transform: uppercase; letter-spacing: 2px; font-weight: 600;">
        Les 3 formules avec -20%
      </p>

      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 28px;">
        <tr>
          <td style="padding: 14px 16px; border: 1px solid ${COLORS.border}; border-radius: 8px; background: ${COLORS.surface};">
            <p style="color: ${COLORS.text}; font-size: 15px; font-weight: 700; margin: 0 0 4px;">Essential</p>
            <p style="color: ${COLORS.textMuted}; font-size: 12px; margin: 0 0 4px; line-height: 1.5;">Mail 7j/7 • Plan sur-mesure • Bilans hebdos</p>
            <p style="color: ${COLORS.text}; font-size: 13px; margin: 0 0 8px;">
              <span style="text-decoration: line-through; color: ${COLORS.textMuted};">249€</span>
              <span style="color: ${COLORS.primary}; font-weight: 700; margin-left: 6px;">199€</span> (4 sem)
            </p>
            <a href="${essentialLink}" style="color: ${COLORS.primary}; font-size: 13px; text-decoration: underline; font-weight: 600;">Voir Essential →</a>
          </td>
        </tr>
        <tr><td style="height: 8px;"></td></tr>
        <tr>
          <td style="padding: 14px 16px; border: 1px solid ${COLORS.border}; border-radius: 8px; background: ${COLORS.surface};">
            <p style="color: ${COLORS.text}; font-size: 15px; font-weight: 700; margin: 0 0 4px;">Elite ★</p>
            <p style="color: ${COLORS.textMuted}; font-size: 12px; margin: 0 0 4px; line-height: 1.5;">WhatsApp direct • Visio hebdo 30min • Gestion blessures</p>
            <p style="color: ${COLORS.text}; font-size: 13px; margin: 0 0 8px;">
              <span style="text-decoration: line-through; color: ${COLORS.textMuted};">399€</span>
              <span style="color: ${COLORS.primary}; font-weight: 700; margin-left: 6px;">319€</span> (4 sem)
            </p>
            <a href="${eliteLink}" style="color: ${COLORS.primary}; font-size: 13px; text-decoration: underline; font-weight: 600;">Voir Elite →</a>
          </td>
        </tr>
        <tr><td style="height: 8px;"></td></tr>
        <tr>
          <td style="padding: 14px 16px; border: 1px solid ${COLORS.border}; border-radius: 8px; background: ${COLORS.surface};">
            <p style="color: ${COLORS.text}; font-size: 15px; font-weight: 700; margin: 0 0 4px;">Private Lab</p>
            <p style="color: ${COLORS.textMuted}; font-size: 12px; margin: 0 0 4px; line-height: 1.5;">WhatsApp 7j/7 6h-minuit • Reconstruction hebdo pluridisciplinaire</p>
            <p style="color: ${COLORS.text}; font-size: 13px; margin: 0 0 8px;">
              <span style="text-decoration: line-through; color: ${COLORS.textMuted};">499€</span>
              <span style="color: ${COLORS.primary}; font-weight: 700; margin-left: 6px;">399€</span> (4 sem)
            </p>
            <a href="${privateLabLink}" style="color: ${COLORS.primary}; font-size: 13px; text-decoration: underline; font-weight: 600;">Voir Private Lab →</a>
          </td>
        </tr>
      </table>

      ${getPrimaryButton('Comparer les 3 formules →', allFormulesLink)}

      <p style="color: ${COLORS.textMuted}; font-size: 13px; margin: 24px 0 0; text-align: center;">
        Après J+9, le code DISCOVERY20 est désactivé pour les clients Discovery.<br/>
        Pas de prolongation, pas de rattrapage.
      </p>

      <p style="color: ${COLORS.textMuted}; font-size: 12px; line-height: 1.6; margin: 16px 0 0; text-align: center;">
        <a href="{{UNSUB_LINK}}" style="color: #525252; text-decoration: underline;">Se desabonner</a>
      </p>

      <img src="${trackingPixel}" width="1" height="1" style="display:none;" alt="" />
    `;

    const emailContent = getEmailWrapper(
      content,
      `linear-gradient(135deg, ${COLORS.warning} 0%, #d97706 100%)`,
      "48h restantes",
      "DISCOVERY20 expire bientôt"
    );

    const result = await sendEmailWithTracking(
      {
        html: encodeBase64(emailContent),
        text: `Dernière relance — DISCOVERY20 expire dans 48h.\n\n-20% sur toutes les formules coaching (sauf Starter) :\n\nEssential 4 sem : 199€ (au lieu de 249€) — ${essentialLink}\nElite 4 sem : 319€ (au lieu de 399€) — ${eliteLink}\nPrivate Lab 4 sem : 399€ (au lieu de 499€) — ${privateLabLink}\n\nAprès J+9, code désactivé. Pas de rattrapage.\n\nAchzod`,
        subject: "Dernière relance — DISCOVERY20 expire dans 48h",
        from: { name: "Achzod Coaching", email: SENDER_EMAIL },
        to: [{ email }],
      },
      {
        emailType: "sendGratuitJ7Email",
        recipientEmail: email,
        auditId,
        auditType: "GRATUIT",
        metadata: { promoCode: "DISCOVERY20", essentialLink, eliteLink, privateLabLink, trackingId },
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
    title: "Ton code promo -20%",
    subtitle: "Merci pour ton avis sur le Discovery Scan",
    description: "Utilise ce code pour bénéficier de 20% de réduction sur toutes les formules de coaching Achzod.",
    discount: "-20% sur le coaching",
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
                Tu fais maintenant partie des premiers à avoir accès à <strong style="color: ${APEX_COLORS.text};">ApexLabs</strong> — la nouvelle génération d'optimisation humaine.
              </p>

              <!-- What's coming -->
              <div style="background: rgba(252,221,0,0.05); border: 1px solid rgba(252,221,0,0.2); border-radius: 12px; padding: 30px; margin: 30px 0;">
                <h3 style="color: ${APEX_COLORS.primary}; font-size: 14px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; margin: 0 0 20px;">
                  CE QUI T'ATTEND
                </h3>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  <tr><td style="padding: 10px 0; color: ${APEX_COLORS.textMuted}; font-size: 15px; border-bottom: 1px solid rgba(255,255,255,0.05);">
                    <span style="color: ${APEX_COLORS.primary}; margin-right: 12px;">→</span> Discovery Scan — Diagnostic gratuit 5 piliers
                  </td></tr>
                  <tr><td style="padding: 10px 0; color: ${APEX_COLORS.textMuted}; font-size: 15px; border-bottom: 1px solid rgba(255,255,255,0.05);">
                    <span style="color: ${APEX_COLORS.primary}; margin-right: 12px;">→</span> Anabolic Bioscan — Audit métabolique complet
                  </td></tr>
                  <tr><td style="padding: 10px 0; color: ${APEX_COLORS.textMuted}; font-size: 15px; border-bottom: 1px solid rgba(255,255,255,0.05);">
                    <span style="color: ${APEX_COLORS.primary}; margin-right: 12px;">→</span> Ultimate Scan — L'analyse ultime + photos
                  </td></tr>
                  <tr><td style="padding: 10px 0; color: ${APEX_COLORS.textMuted}; font-size: 15px; border-bottom: 1px solid rgba(255,255,255,0.05);">
                    <span style="color: ${APEX_COLORS.primary}; margin-right: 12px;">→</span> Blood Analysis — 50+ biomarqueurs
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

// Discovery J+30 — long-tail nurture for Discovery Scan recipients who haven't
// upgraded. Pushes COACHING directly (not more audits) since coaching is the
// real revenue. Uses DISCOVERY20 code (20% off all formules except Starter).
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
    const defaultCoachingLink = `https://www.achzodcoaching.com/formules-coaching?utm_source=apexlabs&utm_medium=email&utm_campaign=discovery_j30_nurture`;
    const coachingLink = recommendation
      ? `${recommendation.href}?utm_source=apexlabs&utm_medium=email&utm_campaign=discovery_j30_nurture&tier=${recommendation.tier.toLowerCase()}`
      : defaultCoachingLink;
    const essentialLink = `https://www.achzodcoaching.com/coaching-essential?utm_source=apexlabs&utm_medium=email&utm_campaign=discovery_j30_nurture`;
    const tierLabel = recommendation
      ? recommendation.tier === "PRIVATELAB" ? "Private Lab" : recommendation.tier === "ELITE" ? "Elite" : "Essential"
      : null;
    const trackingPixel = `${baseUrl}/api/track/email/${trackingId}/open.gif`;

    const content = `
      <h2 style="color: ${COLORS.text}; margin: 0 0 16px; font-size: 26px; text-align: center; font-weight: 700; letter-spacing: -0.5px;">
        ${tierLabel ? `Je te recommande <span style="color:${COLORS.primary};">${tierLabel}</span>` : "Un mois depuis ton Discovery"}
      </h2>

      <p style="color: ${COLORS.textMuted}; font-size: 15px; line-height: 1.7; margin: 0 0 24px; text-align: center;">
        Tu as reçu tes scores et tes blocages.<br/>
        <strong style="color: ${COLORS.text};">Maintenant la vraie question : qu'est-ce que tu en fais ?</strong>
      </p>

      ${recommendation ? `
      <div style="padding: 20px; background: ${COLORS.primary}15; border-radius: 12px; border: 1px solid ${COLORS.primary}40; margin-bottom: 24px;">
        <p style="color: ${COLORS.primary}; font-size: 11px; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 8px; font-weight: 700;">
          Recommandation d'après ton profil
        </p>
        <p style="color: ${COLORS.text}; font-size: 14px; line-height: 1.7; margin: 0;">
          ${recommendation.reason}
        </p>
      </div>
      ` : `
      <div style="padding: 24px; background: ${COLORS.surface}; border-radius: 12px; border-left: 4px solid ${COLORS.warning}; margin-bottom: 24px;">
        <p style="color: ${COLORS.text}; font-size: 15px; font-weight: 600; margin: 0 0 10px;">
          Un audit ne transforme pas. Le suivi, oui.
        </p>
        <p style="color: ${COLORS.textMuted}; font-size: 14px; line-height: 1.7; margin: 0;">
          Le Discovery te dit où tu bloques. Mais pour corriger durablement sommeil / stress / nutrition / énergie, il faut un protocole ajusté semaine après semaine selon tes retours. C'est ce que fait le coaching — je te construis un plan, tu m'envoies tes bilans hebdos, j'ajuste.
        </p>
      </div>
      `}

      <div style="padding: 28px; background: linear-gradient(135deg, ${COLORS.primary}20 0%, ${COLORS.primary}05 100%); border-radius: 12px; border: 2px solid ${COLORS.primary}; margin-bottom: 24px; text-align: center;">
        <p style="color: ${COLORS.textMuted}; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 10px; font-weight: 600;">
          Offre clients Discovery
        </p>
        <p style="color: ${COLORS.text}; font-size: 16px; font-weight: 600; margin: 0 0 16px;">
          -20% sur toutes les formules coaching<br/><span style="font-size: 13px; color: ${COLORS.textMuted};">(sauf Starter)</span>
        </p>
        <div style="background: ${COLORS.background}; border-radius: 8px; padding: 14px 18px; display: inline-block; margin-bottom: 16px; border: 1px dashed ${COLORS.primary};">
          <p style="color: ${COLORS.textMuted}; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; margin: 0 0 4px; font-weight: 600;">
            Ton code
          </p>
          <p style="color: ${COLORS.primary}; font-size: 22px; font-weight: 700; letter-spacing: 3px; margin: 0;">
            DISCOVERY20
          </p>
        </div>
        <p style="color: ${COLORS.textMuted}; font-size: 13px; line-height: 1.6; margin: 0 0 18px;">
          Je construis ton plan à partir des données de ton Discovery — pas de questionnaire à refaire.
        </p>
        ${getPrimaryButton(tierLabel ? `Voir ${tierLabel} →` : 'Voir les formules coaching →', coachingLink)}
      </div>

      ${!tierLabel || tierLabel !== "Essential" ? `
      <div style="padding: 14px 18px; background: ${COLORS.surface}; border-radius: 8px; border: 1px solid ${COLORS.border}; text-align: center; margin-bottom: 8px;">
        <p style="color: ${COLORS.textMuted}; font-size: 13px; margin: 0 0 6px;">
          ${tierLabel ? "Budget plus serré ?" : "Pas sûr du niveau de coaching adapté ?"}
        </p>
        <a href="${essentialLink}" style="color: ${COLORS.primary}; font-size: 13px; text-decoration: underline; font-weight: 600;">
          Commence par Essential (4/8/12 sem, à partir de 249€) →
        </a>
      </div>
      ` : ""}

      <div style="padding: 14px 18px; background: ${COLORS.surface}; border-radius: 8px; border: 1px solid ${COLORS.border}; text-align: center; margin-bottom: 20px;">
        <a href="${reportLink}" style="color: ${COLORS.textMuted}; font-size: 13px; text-decoration: underline;">
          Relire mon Discovery Scan
        </a>
      </div>

      <p style="color: ${COLORS.textMuted}; font-size: 12px; line-height: 1.6; margin: 0; text-align: center;">
        Pas intéressé ? Pas de problème.<br/>
        <a href="{{UNSUB_LINK}}" style="color: #525252; text-decoration: underline;">Se désabonner</a>
      </p>

      <img src="${trackingPixel}" width="1" height="1" style="display:none;" alt="" />
    `;

    const emailContent = getEmailWrapper(
      content,
      `linear-gradient(135deg, ${COLORS.primary} 0%, #0b0b0f 100%)`,
      "Coaching Achzod",
      "Un mois après ton Discovery"
    );

    const result = await sendEmailWithTracking(
      {
        html: encodeBase64(emailContent),
        text: tierLabel
          ? `Je te recommande ${tierLabel} d'après ton Discovery.\n\n${recommendation!.reason}\n\nCode DISCOVERY20 (-20% sauf Starter).\n\nVoir ${tierLabel} : ${coachingLink}\nRelire ton Discovery : ${reportLink}\n\nAchzod`
          : `Un mois depuis ton Discovery. Un audit ne transforme pas — le suivi, oui.\n\nOffre clients Discovery : -20% sur toutes les formules coaching (sauf Starter), code DISCOVERY20.\n\nVoir les formules : ${coachingLink}\nCoaching Essential (à partir de 249€, 4-8-12 sem) : ${essentialLink}\nRelire le Discovery : ${reportLink}\n\nAchzod`,
        subject: tierLabel
          ? `${tierLabel} — la formule calibrée pour ton profil (-20%)`
          : "Un mois depuis ton Discovery — -20% sur ton coaching",
        from: { name: "Achzod Coaching", email: SENDER_EMAIL },
        to: [{ email }],
      },
      {
        emailType: "sendDiscoveryJ30NurtureEmail",
        recipientEmail: email,
        auditId,
        metadata: { promoCode: "DISCOVERY20", coachingLink, trackingId, recommendedTier: recommendation?.tier },
      }
    );

    return result.result === true;
  } catch (error) {
    console.error("[SendPulse] Error sending discovery J30 nurture email:", error);
    return false;
  }
}

// Peptides Engine — Cycle 2 re-order email (J+60 post-delivery).
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
          Ton corps s'est adapté aux peptides du cycle 1. Les résultats sont là mais les gains marginaux ralentissent — c'est biologiquement normal. Un cycle 2 recalibré sur tes nouveaux objectifs (consolidation, progression, switch de stack) permet de repartir sur du neuf sans perdre l'acquis.
        </p>
        <p style="color: ${COLORS.textMuted}; font-size: 14px; line-height: 1.7; margin: 0;">
          Si tu as fait un Blood Analysis mi-cycle (tes 2 crédits offerts) — c'est exactement les marqueurs à regarder pour guider le cycle 2.
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
        Pas envie de relancer ? Pas de souci — je ne renverrai plus cet email.<br/>
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
        subject: "Ton cycle 1 touche à sa fin — prêt pour le cycle 2 ? (-100€ clients existants)",
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
