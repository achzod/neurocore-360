import type { ComprehensiveRiskProfile, RiskScore } from "./blood-analysis/risk-scores";

const SENDPULSE_USER_ID = process.env.SENDPULSE_USER_ID;
const SENDPULSE_SECRET = process.env.SENDPULSE_SECRET;
const SENDER_EMAIL = process.env.SENDER_EMAIL || "coaching@achzodcoaching.com";
const SENDER_NAME = process.env.SENDER_NAME || "ApexLabs by Achzod";

// SendPulse Address Book IDs - configure in env or hardcode after creating in SendPulse
const SENDPULSE_APEXLABS_BOOK_ID = process.env.SENDPULSE_APEXLABS_BOOK_ID || "";

// ApexLabs Design System (Ultrahuman style)
const COLORS = {
  primary: '#FCDD00',
  background: '#000000',
  surface: '#0a0a0a',
  border: 'rgba(252, 221, 0, 0.15)',
  text: '#FFFFFF',
  textMuted: '#a1a1aa',
  warning: '#f59e0b',
  purple: '#8b5cf6',
  blood: '#ef4444',
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
    label: "Starter",
    href: "https://www.achzodcoaching.com/coaching-starter",
    offers: [{ duration: "8 semaines", price: 199 }],
  },
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

async function getAccessToken(): Promise<string> {
  if (!SENDPULSE_USER_ID || !SENDPULSE_SECRET) {
    console.error("[SendPulse] MISSING CREDENTIALS - SENDPULSE_USER_ID or SENDPULSE_SECRET not configured");
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

function renderCoachingOffersTable(deductionAmount: number, accentColor: string): string {
  const hasDeduction = deductionAmount > 0;
  const headerNote = hasDeduction
    ? `Deduction appliquee : -${formatEuro(deductionAmount)}`
    : "Aucune deduction appliquee sur ce rapport";
  const rowBorder = `1px solid ${COLORS.border}`;
  const rows = COACHING_OFFER_TIERS.flatMap((tier) =>
    tier.offers.map((offer) => {
      const after = Math.max(0, offer.price - deductionAmount);
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
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
  </style>
</head>
<body style="margin: 0; padding: 0; font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: ${COLORS.background};">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: ${COLORS.background}; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: ${COLORS.surface}; border-radius: 16px; overflow: hidden; border: 1px solid ${COLORS.border};">
          <!-- Header -->
          <tr>
            <td style="background: ${headerGradient}; padding: 40px 30px; text-align: center;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center">
                    <div style="display: inline-flex; align-items: center; gap: 8px; margin-bottom: 16px;">
                      <div style="width: 8px; height: 8px; border-radius: 50%; background-color: ${COLORS.background};"></div>
                      <span style="color: ${COLORS.background}; font-size: 12px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase;">APEXLABS BY ACHZOD</span>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <h1 style="color: ${COLORS.background}; margin: 0; font-size: 32px; font-weight: 700; letter-spacing: -1px;">${headerTitle}</h1>
                    <p style="color: rgba(0,0,0,0.7); margin: 8px 0 0; font-size: 14px; font-weight: 500;">${headerSubtitle}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color: ${COLORS.background}; padding: 24px 30px; text-align: center; border-top: 1px solid ${COLORS.border};">
              <p style="color: ${COLORS.textMuted}; font-size: 11px; margin: 0 0 8px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase;">
                Achzod Coaching
              </p>
              <p style="color: #404040; font-size: 10px; margin: 0;">
                Excellence · Science · Transformation
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// Primary CTA Button
function getPrimaryButton(text: string, href: string, color: string = COLORS.primary): string {
  const textColor = color === COLORS.primary || color === COLORS.warning ? COLORS.background : '#ffffff';
  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
      <tr>
        <td align="center">
          <a href="${href}" style="display: inline-block; background: ${color}; color: ${textColor}; text-decoration: none; padding: 16px 48px; border-radius: 8px; font-size: 14px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase;">
            ${text}
          </a>
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

      ${renderCoachingOffersTable(deductionAmount, color)}

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
        ? COLORS.primary
        : COLORS.textMuted;

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

    const content = `
      <div style="text-align: center; margin-bottom: 28px;">
        <span style="display: inline-block; background: ${planColor}20; color: ${planColor}; padding: 8px 20px; border-radius: 20px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; border: 1px solid ${planColor}40;">
          ${planLabel}
        </span>
      </div>

      <h2 style="color: ${COLORS.text}; margin: 0 0 16px; font-size: 28px; text-align: center; font-weight: 700; letter-spacing: -1px;">
        Ton rapport est pret !
      </h2>

      <p style="color: ${COLORS.textMuted}; font-size: 16px; line-height: 1.7; margin: 0 0 12px; text-align: center;">
        J'ai termine l'analyse complete de ton profil a travers les <strong style="color: ${COLORS.text};">${domainsCount}</strong>.
      </p>
      <p style="color: ${COLORS.textMuted}; font-size: 16px; line-height: 1.7; margin: 0 0 32px; text-align: center;">
        Decouvre tes scores, recommandations personnalisees et protocoles.
      </p>

      ${getPrimaryButton('Consulter le rapport', reportLink)}

      ${getReviewSection(reviewLink)}

      <div style="margin-top: 24px; padding: 20px; background-color: ${COLORS.background}; border-radius: 8px; border: 1px solid ${COLORS.border};">
        <p style="color: ${COLORS.textMuted}; font-size: 12px; margin: 0 0 8px; text-align: center;">
          Si le bouton ne fonctionne pas, copie ce lien :
        </p>
        <p style="margin: 0; text-align: center;">
          <a href="${reportLink}" style="color: ${COLORS.primary}; font-size: 11px; word-break: break-all;">${reportLink}</a>
        </p>
      </div>
    `;

    const emailContent = getEmailWrapper(content, `linear-gradient(135deg, ${planColor} 0%, ${planColor}dd 100%)`, headerTitle, headerSubtitle);

    const response = await fetch("https://api.sendpulse.com/smtp/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        email: {
          html: encodeBase64(emailContent),
          text: `Ton ${planLabel} ApexLabs est pret. Consulte ton rapport ici : ${reportLink}`,
          subject: `Ton ${planLabel} est pret`,
          from: {
            name: "ApexLabs by Achzod",
            email: SENDER_EMAIL,
          },
          to: [{ email }],
        },
      }),
    });

    const result = await response.json() as { result: boolean; error?: any; message?: any };
    console.log(`[SendPulse] Report ready email sent to ${email}:`, result);
    if (result.result === true) return true;
    // Fallback log + tolerate non-true with warning
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
    const belowOptimal = value < optimal.min;
    const corridor = belowOptimal
      ? Math.max(1e-6, optimal.min - normal.min)
      : Math.max(1e-6, normal.max - optimal.max);
    const gap = belowOptimal ? optimal.min - value : value - optimal.max;
    const ratio = clampNumber(gap / corridor, 0, 1);
    score = Math.round(88 - ratio * 28);
  } else {
    const outsideGap = value < normal.min ? normal.min - value : value - normal.max;
    const ratio = outsideGap / normalSpan;
    score = Math.round(58 - clampNumber(ratio, 0, 1.5) * 35);
  }

  if (status === "critical") score = Math.min(score, 35);
  if (status === "suboptimal") score = Math.min(score, 69);
  if (status === "normal") score = Math.max(score, 62);
  if (status === "optimal") score = Math.max(score, 80);

  return clampNumber(score, 6, 100);
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
          ? `Zone optimale ${marker.optimalRange}${unit}`
          : marker.normalRange
          ? `Zone normale ${marker.normalRange}${unit}`
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
  definition: `${name} mesure un indicateur biologique de ton etat metabolique actuel.`,
  positiveImpact: `Quand ${name} reste dans sa cible, la stabilite physiologique et la progression sont plus previsibles.`,
  negativeImpact: `Quand ${name} sort de la cible, la fatigue, le risque et les blocages de progression augmentent.`,
});

const resolveMarkerInsight = (marker: BloodReportMarkerSnapshot): MarkerInsightTemplate => {
  const markerId = normalizeLoose(marker.markerId || "").replace(/\s+/g, "_");
  if (markerId && MARKER_INSIGHT_LIBRARY[markerId]) return MARKER_INSIGHT_LIBRARY[markerId];
  const nameKey = normalizeLoose(marker.name || "").replace(/\s+/g, "_");
  if (nameKey && MARKER_INSIGHT_LIBRARY[nameKey]) return MARKER_INSIGHT_LIBRARY[nameKey];
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
          ? `Zone optimale ${marker.optimalRange}${unit}`
          : marker.normalRange
          ? `Zone normale ${marker.normalRange}${unit}`
          : undefined,
        definition: insight.definition,
        positiveImpact: insight.positiveImpact,
        negativeImpact: insight.negativeImpact,
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
    return `<p class="score-intro">Aucun marqueur extrait n'est disponible dans cette version du rapport. Relance la generation avec le lot de biomarqueurs pour remplir cet onglet.</p>`;
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
        <p><strong>Definition:</strong> ${escapeHtml(row.definition)}</p>
        <p><strong>Quand c'est bien:</strong> ${escapeHtml(row.positiveImpact)}</p>
        <p><strong>Quand ce n'est pas bien:</strong> ${escapeHtml(row.negativeImpact)}</p>
      </article>`;
    })
    .join("\n");

  return `
    <p class="score-intro">Dans cet onglet, je detaille chaque marqueur extrait avec sa definition et ses consequences concretes quand il est stable ou degrade.</p>
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
  return `
    <article class="composite-card ${compact ? "is-compact" : ""}">
      <div class="composite-card-head">
        <h3>${escapeHtml(title)}</h3>
        <span class="score-chip ${tone.chipClass}">${score.score}/100</span>
      </div>
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

  const healthCards = [
    renderCompositeScoreCard("Cardiovasculaire", riskProfile.cardiovascular, "Risque cardio-métabolique global.", true),
    renderCompositeScoreCard("Foie", riskProfile.liverHealth, "Robustesse hépatique et charge métabolique.", true),
    renderCompositeScoreCard("Reins", riskProfile.kidneyFunction, "Capacité de filtration et équilibre hydrique.", true),
    renderCompositeScoreCard("Hormonal", riskProfile.hormonalHealth, "Stabilité endocrine et récupération.", true),
    renderCompositeScoreCard("Thyroïde", riskProfile.thyroidDysfunction, "Pilotage thyroïdien du métabolisme.", true),
    renderCompositeScoreCard("Inflammation", riskProfile.inflammation, "Charge inflammatoire systémique.", true),
    renderCompositeScoreCard("Syndrome Métabolique", riskProfile.metabolicSyndrome, "Agrégation des facteurs de dérive métabolique.", true),
  ].join("\n");

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

  const topRows = rows.slice(0, Math.min(10, rows.length));
  const size = 520;
  const center = size / 2;
  const radius = 180;
  const toAngle = (index: number) => (-Math.PI / 2) + (index * Math.PI * 2) / topRows.length;
  const polar = (angle: number, r: number) => ({
    x: center + Math.cos(angle) * r,
    y: center + Math.sin(angle) * r,
  });

  const gridRings = [0.25, 0.5, 0.75, 1].map((factor) => {
    const r = radius * factor;
    return `<circle cx="${center}" cy="${center}" r="${r.toFixed(2)}" fill="none" stroke="#d7c6af" stroke-width="1" />`;
  });

  const axisLines = topRows.map((row, index) => {
    const angle = toAngle(index);
    const outer = polar(angle, radius);
    const label = polar(angle, radius + 24);
    const shortName = row.name.length > 26 ? `${row.name.slice(0, 23)}...` : row.name;
    return `
      <line x1="${center}" y1="${center}" x2="${outer.x.toFixed(2)}" y2="${outer.y.toFixed(2)}" stroke="#d7c6af" stroke-width="1" />
      <text x="${label.x.toFixed(2)}" y="${label.y.toFixed(2)}" text-anchor="middle" dominant-baseline="middle" font-size="11" fill="#6f6254">${escapeHtml(shortName)}</text>
    `;
  });

  const polygonPoints = topRows
    .map((row, index) => {
      const angle = toAngle(index);
      const point = polar(angle, (radius * row.score) / 100);
      return `${point.x.toFixed(2)},${point.y.toFixed(2)}`;
    })
    .join(" ");

  const valueDots = topRows.map((row, index) => {
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
  const nav = sections
    .map((section, index) => {
      const tabId = slugifyTabId(section.title, index);
      const isActive = "false";
      const activeClass = "";
      return `<button class="tab-btn${activeClass}" type="button" data-tab-target="${tabId}" aria-selected="${isActive}">${escapeHtml(
        section.title
      )}</button>`;
    })
    .join("\n")
    .trim();

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

  const navWithExtraTabs = `
      <button class="tab-btn is-active" type="button" data-tab-target="${compositeTabId}" aria-selected="true">Scores Composites</button>
      <button class="tab-btn" type="button" data-tab-target="${radarTabId}" aria-selected="false">Radar des scores biomarqueurs</button>
      <button class="tab-btn" type="button" data-tab-target="${markersTabId}" aria-selected="false">Marqueurs extraits</button>
      ${nav}
  `.trim();
  const panelsWithExtraTabs = `${compositePanel}\n${radarPanel}\n${markersPanel}\n${panels}`.trim();

  return stripBloodForbiddenFormatting(`<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(clientName)} - Bilan sanguin complet</title>
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
    @media (max-width: 700px) {
      .wrap { padding: 18px 10px 26px; }
      .title { font-size: 28px; }
      .tab-panel h2 { font-size: 24px; }
      .tabs-content { padding: 16px; }
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
      <div class="badge"><span class="badge-dot"></span>NEUROCORE 360</div>
      <h1 class="title">${escapeHtml(clientName)} - Bilan sanguin complet</h1>
      <p class="subtitle">${escapeHtml(subtitle)}</p>
    </header>
    <main class="tabs-shell">
      <nav class="tabs-nav" aria-label="Sections du rapport">
        ${navWithExtraTabs}
      </nav>
      <div class="tabs-content">
        ${panelsWithExtraTabs}
      </div>
    </main>
    <p class="footer-note">Rapport ID: ${escapeHtml(reportId)} · Généré pour envoi client</p>
  </div>
  <script>
    (function () {
      var buttons = Array.prototype.slice.call(document.querySelectorAll('.tab-btn'));
      var panels = Array.prototype.slice.call(document.querySelectorAll('.tab-panel'));
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
      }
      buttons.forEach(function (btn) {
        btn.addEventListener('click', function () {
          activate(btn.getAttribute('data-tab-target') || '');
        });
      });
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
  },
): Promise<boolean> {
  try {
    const token = await getAccessToken();
    void baseUrl;
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

    const baseEmailPayload = {
      html: encodeBase64(emailContent),
      text: stripBloodForbiddenFormatting(`Ton rapport Blood Analysis est pret. Ouvre la piece jointe HTML: Blood_Analysis_${reportId}.html`),
      subject: stripBloodForbiddenFormatting("Ton rapport Blood Analysis est pret - piece jointe HTML"),
      from: {
        name: "ApexLabs by Achzod",
        email: SENDER_EMAIL,
      },
      to: [{ email }],
    };

    const postEmail = async (payload: Record<string, unknown>) => {
      const response = await fetch("https://api.sendpulse.com/smtp/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email: payload }),
      });
      return (await response.json()) as { result: boolean; error?: any; message?: any };
    };

    const attachmentPayload = {
      ...baseEmailPayload,
      attachments_binary: {
        [`Blood_Analysis_${reportId}.html`]: encodeBase64(standaloneReportHtml),
      },
    };
    let result = await postEmail(attachmentPayload);

    if (result.result !== true) {
      console.warn(
        `[SendPulse] Blood HTML attachment send failed for ${email}, retrying with attachment.`,
        result
      );
      result = await postEmail(attachmentPayload);
    }

    console.log(`[SendPulse] Blood HTML email sent to ${email}:`, result);
    return result.result === true;
  } catch (error) {
    console.error("[SendPulse] Error sending blood HTML email:", error);
    return false;
  }
}

export async function sendMagicLinkEmail(
  email: string,
  token: string,
  baseUrl: string
): Promise<boolean> {
  try {
    const token_ = await getAccessToken();
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

    const response = await fetch("https://api.sendpulse.com/smtp/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token_}`,
      },
      body: JSON.stringify({
        email: {
          subject: "Acces a ton espace ApexLabs",
          from: {
            name: SENDER_NAME,
            email: SENDER_EMAIL,
          },
          to: [{ email }],
          html: encodeBase64(emailContent),
          text: `Acces ApexLabs - Clique sur ce lien pour acceder a ton espace client : ${magicLink}`,
        },
      }),
    });

    const result = await response.json() as { result: boolean };
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
  try {
    const adminEmail = "achzodyt@gmail.com";
    const token = await getAccessToken();
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

    const response = await fetch("https://api.sendpulse.com/smtp/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        email: {
          html: encodeBase64(emailContent),
          text: `Nouvelle analyse ${planLabel} generee pour ${clientName} (${clientEmail}) - Audit ID: ${auditId}`,
          subject: `[ApexLabs] Nouvelle analyse ${planLabel} - ${clientName}`,
          from: {
            name: SENDER_NAME,
            email: SENDER_EMAIL,
          },
          to: [{ email: adminEmail }],
        },
      }),
    });

    const result = await response.json() as { result: boolean };
    console.log(`[SendPulse] Admin email sent to ${adminEmail}:`, result);
    return result.result === true;
  } catch (error) {
    console.error("[SendPulse] Error sending admin email:", error);
    return false;
  }
}

export async function sendCTAEmail(
  email: string,
  subject: string,
  message: string
): Promise<boolean> {
  try {
    const token = await getAccessToken();
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

    const response = await fetch("https://api.sendpulse.com/smtp/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        email: {
          subject,
          from: {
            name: SENDER_NAME,
            email: SENDER_EMAIL,
          },
          to: [{ email }],
          html: encodeBase64(emailContent),
          text: message,
        },
      }),
    });

    const result = (await response.json()) as { result: boolean };
    console.log(`[SendPulse] CTA email sent to ${email}:`, result);
    return result.result === true;
  } catch (error) {
    console.error("[SendPulse] Error sending CTA email:", error);
    return false;
  }
}

// Email GRATUIT: demande avis + upsell Anabolic Bioscan avec code ANALYSE20
export async function sendGratuitUpsellEmail(
  email: string,
  auditId: string,
  baseUrl: string,
  trackingId: string
): Promise<boolean> {
  try {
    const token = await getAccessToken();
    const dashboardLink = `${baseUrl}/dashboard/${auditId}`;
    const checkoutLink = `${baseUrl}/questionnaire?plan=anabolic&promo=ANALYSE20`;
    const trackingPixel = `${baseUrl}/api/track/email/${trackingId}/open.gif`;

    const content = `
      <h2 style="color: ${COLORS.text}; margin: 0 0 16px; font-size: 28px; text-align: center; font-weight: 700; letter-spacing: -1px;">
        Merci d'avoir teste ApexLabs !
      </h2>

      <p style="color: ${COLORS.textMuted}; font-size: 16px; line-height: 1.7; margin: 0 0 28px; text-align: center;">
        J'aimerais savoir ce que tu as pense de ton analyse gratuite.
      </p>

      ${getReviewSection(dashboardLink)}

      <!-- Upsell Anabolic Bioscan -->
      <div style="padding: 28px; background: linear-gradient(135deg, ${COLORS.primary}15 0%, ${COLORS.primary}05 100%); border-radius: 12px; border: 1px solid ${COLORS.primary}30;">
        <h3 style="color: ${COLORS.primary}; font-size: 22px; font-weight: 700; margin: 0 0 12px; text-align: center; letter-spacing: -0.5px;">
          Passe au niveau superieur
        </h3>
        <p style="color: ${COLORS.textMuted}; font-size: 14px; line-height: 1.7; margin: 0 0 20px; text-align: center;">
          Tu as eu un apercu de ton profil. Avec l'<strong style="color: ${COLORS.text};">Anabolic Bioscan</strong>, decouvre :
        </p>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 20px;">
          <tr><td style="padding: 8px 0; color: ${COLORS.textMuted}; font-size: 14px;">- Analyse approfondie sur 16 domaines</td></tr>
          <tr><td style="padding: 8px 0; color: ${COLORS.textMuted}; font-size: 14px;">- Protocole de supplements personnalise</td></tr>
          <tr><td style="padding: 8px 0; color: ${COLORS.textMuted}; font-size: 14px;">- Protocoles nutrition et entrainement</td></tr>
          <tr><td style="padding: 8px 0; color: ${COLORS.textMuted}; font-size: 14px;">- Plan d'action 30/60/90 jours</td></tr>
        </table>
        <div style="text-align: center; margin-bottom: 20px;">
          <span style="display: inline-block; background: ${COLORS.primary}; color: ${COLORS.background}; padding: 10px 20px; border-radius: 20px; font-size: 14px; font-weight: 700;">
            -20% avec le code ANALYSE20
          </span>
        </div>
        ${getPrimaryButton('Passer a l\'Anabolic Bioscan (-20%)', checkoutLink)}
      </div>

      <img src="${trackingPixel}" width="1" height="1" style="display:none;" alt="" />
    `;

    const emailContent = getEmailWrapper(content);

    const response = await fetch("https://api.sendpulse.com/smtp/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        email: {
          html: encodeBase64(emailContent),
          text: `Merci d'avoir teste ApexLabs ! Laisse ton avis et decouvre l'Anabolic Bioscan avec -20% : code ANALYSE20`,
          subject: "Ton avis compte + Offre speciale -20%",
          from: { name: SENDER_NAME, email: SENDER_EMAIL },
          to: [{ email }],
        },
      }),
    });

    const result = await response.json() as { result: boolean };
    console.log(`[SendPulse] Gratuit upsell email sent to ${email}:`, result);
    return result.result === true;
  } catch (error) {
    console.error("[SendPulse] Error sending gratuit upsell email:", error);
    return false;
  }
}

// Email PREMIUM J+7: demande avis + CTA coaching avec code NEUROCORE20
export async function sendPremiumJ7Email(
  email: string,
  auditId: string,
  auditType: string,
  baseUrl: string,
  trackingId: string,
  hasLeftReview: boolean
): Promise<boolean> {
  try {
    const token = await getAccessToken();
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

      <div style="text-align: center; margin-top: 24px;">
        <span style="display: inline-block; background: ${COLORS.purple}; color: #fff; padding: 10px 20px; border-radius: 20px; font-size: 14px; font-weight: 700;">
          -20% avec le code NEUROCORE20
        </span>
      </div>

      <img src="${trackingPixel}" width="1" height="1" style="display:none;" alt="" />
    `;

    const emailContent = getEmailWrapper(content, `linear-gradient(135deg, ${COLORS.purple} 0%, #7c3aed 100%)`);

    const response = await fetch("https://api.sendpulse.com/smtp/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        email: {
          html: encodeBase64(emailContent),
          text: `Ca fait une semaine ! Pret a passer a l'action ? Decouvre le coaching personnalise avec -20% : code NEUROCORE20`,
          subject: "Pret a transformer ta sante ? (-20% coaching)",
          from: { name: SENDER_NAME, email: SENDER_EMAIL },
          to: [{ email }],
        },
      }),
    });

    const result = await response.json() as { result: boolean };
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
    const token = await getAccessToken();
    const trackingPixel = `${baseUrl}/api/track/email/${trackingId}/open.gif`;

    const content = `
      <h2 style="color: ${COLORS.text}; margin: 0 0 16px; font-size: 26px; text-align: center; font-weight: 700; letter-spacing: -1px;">
        Coaching Achzod -20%
      </h2>

      <p style="color: ${COLORS.textMuted}; font-size: 16px; line-height: 1.7; margin: 0 0 28px; text-align: center;">
        Ton audit APEXLABS est livre. L'accompagnement Achzod prend le relais pour l'execution et les ajustements continus.
      </p>

      ${getCoachingSection(auditType, COLORS.warning)}

      <div style="text-align: center; margin-top: 24px;">
        <span style="display: inline-block; background: ${COLORS.warning}; color: #fff; padding: 10px 20px; border-radius: 20px; font-size: 14px; font-weight: 700;">
          -20% avec le code NEUROCORE20
        </span>
      </div>

      <p style="color: #525252; font-size: 12px; line-height: 1.6; margin: 28px 0 0; text-align: center;">
        Pour arreter ces emails, reponds simplement "STOP".
      </p>

      <img src="${trackingPixel}" width="1" height="1" style="display:none;" alt="" />
    `;

    const emailContent = getEmailWrapper(content, `linear-gradient(135deg, ${COLORS.warning} 0%, #d97706 100%)`);

    const response = await fetch("https://api.sendpulse.com/smtp/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        email: {
          html: encodeBase64(emailContent),
          text: "Coaching Achzod -20%. Code NEUROCORE20, reduction 20%, valable 30 jours.",
          subject: "Coaching Achzod -20% (code NEUROCORE20)",
          from: { name: SENDER_NAME, email: SENDER_EMAIL },
          to: [{ email }],
        },
      }),
    });

    const result = await response.json() as { result: boolean };
    console.log(`[SendPulse] Audit J+14 email sent to ${email}:`, result);
    return result.result === true;
  } catch (error) {
    console.error("[SendPulse] Error sending audit J+14 email:", error);
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
    const token = await getAccessToken();
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

    const response = await fetch("https://api.sendpulse.com/smtp/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: {
          html: encodeBase64(htmlContent),
          text: `${prenom}, voici ton code promo : ${promoCode}. ${config.discount}. Utilise-le sur achzodcoaching.com/formules-coaching`,
          subject: `${config.title} - ${promoCode}`,
          from: { name: "Achzod Coaching", email: SENDER_EMAIL },
          to: [{ email }],
        },
      }),
    });

    const result = await response.json() as { result: boolean };
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
    const adminEmail = "achzodyt@gmail.com";
    const token = await getAccessToken();
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

    const response = await fetch("https://api.sendpulse.com/smtp/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        email: {
          html: encodeBase64(emailContent),
          text: `Nouvel avis ${rating}/5 pour ${auditType}: "${comment.substring(0, 100)}..." - A valider dans le dashboard admin.`,
          subject: `[ApexLabs] Nouvel avis ${ratingLabel} a valider`,
          from: {
            name: SENDER_NAME,
            email: SENDER_EMAIL,
          },
          to: [{ email: adminEmail }],
        },
      }),
    });

    const result = await response.json() as { result: boolean };
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
    const token = await getAccessToken();

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

    const response = await fetch("https://api.sendpulse.com/smtp/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        email: {
          html: encodeBase64(htmlContent),
          text: "Bienvenue dans l'élite ApexLabs ! Tu fais partie des premiers à avoir accès à la nouvelle génération d'optimisation humaine. Je te contacterai dès que les portes s'ouvriront. - Achzod",
          subject: "Bienvenue dans l'élite ApexLabs",
          from: {
            name: "Achzod | ApexLabs",
            email: SENDER_EMAIL,
          },
          to: [{ email }],
        },
      }),
    });

    const result = await response.json() as { result: boolean };
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
