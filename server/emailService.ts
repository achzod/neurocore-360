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

const escapeHtml = (value: string): string =>
  String(value || "")
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

const renderClaudeTabbedReportHtml = (reportId: string, reportMarkdown: string): string => {
  const sections = parseMarkdownSections(reportMarkdown);
  const nav = sections
    .map((section, index) => {
      const tabId = slugifyTabId(section.title, index);
      const isActive = index === 0 ? "true" : "false";
      const activeClass = index === 0 ? " is-active" : "";
      return `<button class="tab-btn${activeClass}" type="button" data-tab-target="${tabId}" aria-selected="${isActive}">${escapeHtml(
        section.title
      )}</button>`;
    })
    .join("\n");

  const panels = sections
    .map((section, index) => {
      const tabId = slugifyTabId(section.title, index);
      const activeClass = index === 0 ? " is-active" : "";
      const bodyHtml = renderSectionLinesToHtml(section.lines, CLAUDE_THEME.ink, CLAUDE_THEME.muted);
      return `
      <section id="${tabId}" class="tab-panel${activeClass}" aria-label="${escapeHtml(section.title)}">
        <h2>${escapeHtml(section.title)}</h2>
        ${bodyHtml}
      </section>`;
    })
    .join("\n");

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Blood Analysis - ${escapeHtml(reportId)}</title>
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
    }
  </style>
</head>
<body>
  <div class="wrap">
    <header class="header">
      <div class="badge"><span class="badge-dot"></span>Theme Claude · Blood Analysis</div>
      <h1 class="title">Rapport Biomarqueurs</h1>
      <p class="subtitle">Version HTML à onglets, structurée en 12 sections premium.</p>
    </header>
    <main class="tabs-shell">
      <nav class="tabs-nav" aria-label="Sections du rapport">
        ${nav}
      </nav>
      <div class="tabs-content">
        ${panels}
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
</html>`;
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
): Promise<boolean> {
  try {
    const token = await getAccessToken();
    void baseUrl;
    const standaloneReportHtml = renderClaudeTabbedReportHtml(reportId, reportMarkdown);
    const sections = parseMarkdownSections(reportMarkdown);
    const fullReportBodyHtml = sections.length
      ? sections
          .map((section) => {
            const sectionBody = renderSectionLinesToHtml(section.lines, CLAUDE_THEME.ink, CLAUDE_THEME.muted);
            return `<h3 style="margin:24px 0 10px;color:${CLAUDE_THEME.ink};font-size:22px;line-height:1.3;letter-spacing:-0.01em;">${escapeHtml(
              section.title
            )}</h3>${sectionBody}`;
          })
          .join("\n")
      : `<p style="margin:0;color:${CLAUDE_THEME.muted};font-size:15px;line-height:1.8;">Rapport prêt en pièce jointe HTML.</p>`;

    const content = `
      <div style="text-align:center;margin-bottom:18px;">
        <span style="display:inline-block;background:${CLAUDE_THEME.accentSoft};color:${CLAUDE_THEME.accent};padding:8px 16px;border-radius:999px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;border:1px solid ${CLAUDE_THEME.border};">
          HTML à onglets · Theme Claude
        </span>
      </div>

      <h2 style="color:${CLAUDE_THEME.ink};margin:0 0 10px;font-size:30px;text-align:center;font-weight:700;letter-spacing:-0.02em;">
        Ton rapport complet est prêt
      </h2>
      <p style="color:${CLAUDE_THEME.muted};font-size:15px;line-height:1.75;margin:0 0 18px;text-align:center;">
        Le fichier joint contient la version complète avec onglets section par section, en thème CLAUDE clair.
      </p>

      <div style="margin-top:20px;padding:18px;border:1px solid ${CLAUDE_THEME.border};border-radius:12px;background:${CLAUDE_THEME.paperSoft};">
        ${fullReportBodyHtml}
      </div>

      <div style="margin-top:14px;padding-top:14px;border-top:1px solid ${CLAUDE_THEME.border};text-align:center;">
        <p style="margin:0;color:${CLAUDE_THEME.muted};font-size:12px;">Pièce jointe: <strong style="color:${CLAUDE_THEME.ink};">Blood_Analysis_${escapeHtml(
          reportId
        )}.html</strong></p>
      </div>
    `;

    const emailContent = getClaudeLightEmailWrapper(
      content,
      "Blood Analysis",
      "Rapport HTML à onglets (thème Claude)",
    );

    const baseEmailPayload = {
      html: encodeBase64(emailContent),
      text: `Ton Blood Analysis complet est inclus dans cet email.`,
      subject: "Ton Blood Analysis complet (HTML) est prêt",
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

    let result = await postEmail({
      ...baseEmailPayload,
      attachments_binary: {
        [`Blood_Analysis_${reportId}.html`]: encodeBase64(standaloneReportHtml),
      },
    });

    if (result.result !== true) {
      console.warn(
        `[SendPulse] Blood HTML attachment send failed for ${email}, retrying inline-only email.`,
        result
      );
      result = await postEmail(baseEmailPayload);
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
