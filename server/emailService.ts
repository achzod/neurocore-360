const SENDPULSE_USER_ID = process.env.SENDPULSE_USER_ID;
const SENDPULSE_SECRET = process.env.SENDPULSE_SECRET;
const SENDER_EMAIL = "coaching@achzodcoaching.com";
const SENDER_NAME = "NEUROCORE 360";

// NEUROCORE 360 Design System
const COLORS = {
  primary: '#0efc6d',
  background: '#000000',
  surface: '#09090B',
  border: 'rgba(255, 255, 255, 0.08)',
  text: '#EDEDED',
  textMuted: '#71717A',
  warning: '#f59e0b',
  purple: '#8b5cf6',
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

// Reusable email wrapper with NEUROCORE 360 design
function getEmailWrapper(content: string, headerGradient: string = `linear-gradient(135deg, ${COLORS.primary} 0%, #059669 100%)`): string {
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
                      <span style="color: ${COLORS.background}; font-size: 12px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase;">NEUROCORE 360</span>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <h1 style="color: ${COLORS.background}; margin: 0; font-size: 32px; font-weight: 700; letter-spacing: -1px;">Audit Metabolique</h1>
                    <p style="color: rgba(0,0,0,0.7); margin: 8px 0 0; font-size: 14px; font-weight: 500;">15 Domaines d'Analyse</p>
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
      <div style="font-size: 32px; margin-bottom: 16px; letter-spacing: 4px;">★★★★★</div>
      <h3 style="color: ${COLORS.warning}; font-size: 18px; font-weight: 700; margin: 0 0 8px; letter-spacing: -0.5px;">Ton avis compte !</h3>
      <p style="color: ${COLORS.textMuted}; font-size: 14px; margin: 0 0 20px; line-height: 1.6;">
        30 secondes pour noter ton experience.<br>Ton retour aide d'autres personnes a decouvrir NEUROCORE 360.
      </p>
      ${getPrimaryButton('Laisser mon avis', `${dashboardLink}#review`, COLORS.warning)}
    </div>
  `;
}

// Coaching CTA Section
function getCoachingSection(color: string = COLORS.purple): string {
  const coachingLink = "https://achzodcoaching.com";
  return `
    <div style="padding: 28px; background: linear-gradient(135deg, ${color}15 0%, ${color}08 100%); border-radius: 12px; border: 1px solid ${color}30;">
      <div style="text-align: center; margin-bottom: 20px;">
        <span style="display: inline-block; background: ${color}; color: #fff; padding: 6px 16px; border-radius: 20px; font-size: 11px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase;">
          Passe a l'action
        </span>
      </div>
      <h3 style="color: ${color}; font-size: 22px; font-weight: 700; margin: 0 0 12px; text-align: center; letter-spacing: -0.5px;">
        Pret a transformer ton corps ?
      </h3>
      <p style="color: ${COLORS.textMuted}; font-size: 14px; line-height: 1.7; margin: 0 0 20px; text-align: center;">
        Ce rapport t'a montre le chemin. Laisse-moi t'accompagner pour atteindre tes objectifs.
      </p>

      <!-- Plans -->
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 20px;">
        <tr>
          <td style="padding: 12px; background: ${COLORS.background}; border-radius: 8px; text-align: center; width: 33%;">
            <p style="color: ${COLORS.textMuted}; font-size: 10px; margin: 0 0 4px; font-weight: 600; letter-spacing: 1px;">STARTER</p>
            <p style="color: ${COLORS.text}; font-size: 20px; margin: 0; font-weight: 700;">97€</p>
            <p style="color: ${COLORS.textMuted}; font-size: 10px; margin: 4px 0 0;">/1 mois</p>
          </td>
          <td style="width: 8px;"></td>
          <td style="padding: 12px; background: ${color}; border-radius: 8px; text-align: center; width: 33%;">
            <p style="color: rgba(255,255,255,0.8); font-size: 10px; margin: 0 0 4px; font-weight: 600; letter-spacing: 1px;">TRANSFORM</p>
            <p style="color: #fff; font-size: 20px; margin: 0; font-weight: 700;">247€</p>
            <p style="color: rgba(255,255,255,0.7); font-size: 10px; margin: 4px 0 0;">/3 mois</p>
          </td>
          <td style="width: 8px;"></td>
          <td style="padding: 12px; background: ${COLORS.background}; border-radius: 8px; text-align: center; width: 33%;">
            <p style="color: ${COLORS.textMuted}; font-size: 10px; margin: 0 0 4px; font-weight: 600; letter-spacing: 1px;">ELITE</p>
            <p style="color: ${COLORS.text}; font-size: 20px; margin: 0; font-weight: 700;">497€</p>
            <p style="color: ${COLORS.textMuted}; font-size: 10px; margin: 4px 0 0;">/6 mois</p>
          </td>
        </tr>
      </table>

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
    const dashboardLink = `${baseUrl}/dashboard/${auditId}`;
    const reportLink = `${baseUrl}/report/${auditId}`;
    const planLabel = auditType === "GRATUIT" ? "Gratuit" : auditType === "PREMIUM" ? "Premium" : "Elite";
    const planColor = auditType === "ELITE" ? COLORS.purple : auditType === "PREMIUM" ? COLORS.primary : COLORS.textMuted;

    const content = `
      <div style="text-align: center; margin-bottom: 28px;">
        <span style="display: inline-block; background: ${planColor}20; color: ${planColor}; padding: 8px 20px; border-radius: 20px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; border: 1px solid ${planColor}40;">
          Rapport ${planLabel}
        </span>
      </div>

      <h2 style="color: ${COLORS.text}; margin: 0 0 16px; font-size: 28px; text-align: center; font-weight: 700; letter-spacing: -1px;">
        Ton rapport est pret !
      </h2>

      <p style="color: ${COLORS.textMuted}; font-size: 16px; line-height: 1.7; margin: 0 0 12px; text-align: center;">
        J'ai termine l'analyse complete de ton profil metabolique a travers les <strong style="color: ${COLORS.text};">15 domaines de sante</strong>.
      </p>
      <p style="color: ${COLORS.textMuted}; font-size: 16px; line-height: 1.7; margin: 0 0 32px; text-align: center;">
        Decouvre tes scores, recommandations personnalisees et protocoles.
      </p>

      ${getPrimaryButton('Consulter mon rapport', reportLink)}

      ${getReviewSection(dashboardLink)}

      <div style="margin-top: 24px; padding: 20px; background-color: ${COLORS.background}; border-radius: 8px; border: 1px solid ${COLORS.border};">
        <p style="color: ${COLORS.textMuted}; font-size: 12px; margin: 0 0 8px; text-align: center;">
          Si le bouton ne fonctionne pas, copie ce lien :
        </p>
        <p style="margin: 0; text-align: center;">
          <a href="${reportLink}" style="color: ${COLORS.primary}; font-size: 11px; word-break: break-all;">${reportLink}</a>
        </p>
      </div>
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
          text: `Ton audit NEUROCORE 360 est pret ! Consulte ton rapport ici : ${reportLink}`,
          subject: `Ton Audit 360 ${planLabel} est Pret`,
          from: {
            name: SENDER_NAME,
            email: SENDER_EMAIL,
          },
          to: [{ email }],
        },
      }),
    });

    const result = await response.json() as { result: boolean };
    console.log(`[SendPulse] Report ready email sent to ${email}:`, result);
    return result.result === true;
  } catch (error) {
    console.error("[SendPulse] Error sending report email:", error);
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
      <h2 style="color: ${COLORS.text}; margin: 0 0 16px; font-size: 28px; text-align: center; font-weight: 700; letter-spacing: -1px;">
        Connexion a ton espace
      </h2>

      <p style="color: ${COLORS.textMuted}; font-size: 16px; line-height: 1.7; margin: 0 0 32px; text-align: center;">
        Clique sur le bouton ci-dessous pour acceder a ton dashboard et consulter tes audits NEUROCORE 360.
      </p>

      ${getPrimaryButton('Acceder a mon dashboard', magicLink)}

      <p style="color: ${COLORS.textMuted}; font-size: 14px; line-height: 1.6; margin: 28px 0 0; text-align: center;">
        Ce lien expire dans <strong style="color: ${COLORS.text};">1 heure</strong>. Si tu n'as pas demande cette connexion, ignore cet email.
      </p>

      <div style="margin-top: 24px; padding: 20px; background-color: ${COLORS.background}; border-radius: 8px; border: 1px solid ${COLORS.border};">
        <p style="color: ${COLORS.textMuted}; font-size: 12px; margin: 0 0 8px; text-align: center;">
          Si le bouton ne fonctionne pas, copie ce lien :
        </p>
        <p style="margin: 0; text-align: center;">
          <a href="${magicLink}" style="color: ${COLORS.primary}; font-size: 11px; word-break: break-all;">${magicLink}</a>
        </p>
      </div>
    `;

    const emailContent = getEmailWrapper(content);

    const response = await fetch("https://api.sendpulse.com/smtp/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token_}`,
      },
      body: JSON.stringify({
        email: {
          subject: "Ton lien de connexion NEUROCORE 360",
          from: {
            name: SENDER_NAME,
            email: SENDER_EMAIL,
          },
          to: [{ email }],
          html: encodeBase64(emailContent),
          text: `Connexion NEUROCORE 360 - Clique sur ce lien pour acceder a ton dashboard : ${magicLink}`,
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
    const planLabel = auditType === "GRATUIT" ? "Gratuit" : auditType === "PREMIUM" ? "Premium" : "Elite";

    const content = `
      <h2 style="color: ${COLORS.text}; margin: 0 0 24px; font-size: 24px; font-weight: 700;">
        Nouvelle analyse generee
      </h2>

      <div style="background: ${COLORS.background}; border-radius: 8px; padding: 20px; border: 1px solid ${COLORS.border};">
        <p style="color: ${COLORS.textMuted}; font-size: 14px; line-height: 1.8; margin: 0 0 8px;">
          <strong style="color: ${COLORS.text};">Client:</strong> ${clientName}
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
        L'email a ete envoye au client.
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
          subject: `[NEUROCORE 360] Nouvelle analyse ${planLabel} - ${clientName}`,
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

// Email GRATUIT: demande avis + upsell Premium avec code ANALYSE20
export async function sendGratuitUpsellEmail(
  email: string,
  auditId: string,
  baseUrl: string,
  trackingId: string
): Promise<boolean> {
  try {
    const token = await getAccessToken();
    const dashboardLink = `${baseUrl}/dashboard/${auditId}`;
    const checkoutLink = `${baseUrl}/audit-complet/questionnaire?promo=ANALYSE20`;
    const trackingPixel = `${baseUrl}/api/track/email/${trackingId}/open.gif`;

    const content = `
      <h2 style="color: ${COLORS.text}; margin: 0 0 16px; font-size: 28px; text-align: center; font-weight: 700; letter-spacing: -1px;">
        Merci d'avoir teste NEUROCORE 360 !
      </h2>

      <p style="color: ${COLORS.textMuted}; font-size: 16px; line-height: 1.7; margin: 0 0 28px; text-align: center;">
        J'aimerais savoir ce que tu as pense de ton analyse gratuite.
      </p>

      ${getReviewSection(dashboardLink)}

      <!-- Upsell Premium -->
      <div style="padding: 28px; background: linear-gradient(135deg, ${COLORS.primary}15 0%, ${COLORS.primary}05 100%); border-radius: 12px; border: 1px solid ${COLORS.primary}30;">
        <h3 style="color: ${COLORS.primary}; font-size: 22px; font-weight: 700; margin: 0 0 12px; text-align: center; letter-spacing: -0.5px;">
          Passe au niveau superieur
        </h3>
        <p style="color: ${COLORS.textMuted}; font-size: 14px; line-height: 1.7; margin: 0 0 20px; text-align: center;">
          Tu as eu un apercu de ton profil. Avec l'analyse <strong style="color: ${COLORS.text};">Premium</strong>, decouvre :
        </p>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 20px;">
          <tr><td style="padding: 8px 0; color: ${COLORS.textMuted}; font-size: 14px;">✓ Analyse approfondie sur 15 domaines</td></tr>
          <tr><td style="padding: 8px 0; color: ${COLORS.textMuted}; font-size: 14px;">✓ Protocole de supplements personnalise</td></tr>
          <tr><td style="padding: 8px 0; color: ${COLORS.textMuted}; font-size: 14px;">✓ Analyse de tes photos corporelles</td></tr>
          <tr><td style="padding: 8px 0; color: ${COLORS.textMuted}; font-size: 14px;">✓ Recommandations alimentaires detaillees</td></tr>
        </table>
        <div style="text-align: center; margin-bottom: 20px;">
          <span style="display: inline-block; background: ${COLORS.primary}; color: ${COLORS.background}; padding: 10px 20px; border-radius: 20px; font-size: 14px; font-weight: 700;">
            -20% avec le code ANALYSE20
          </span>
        </div>
        ${getPrimaryButton('Passer au Premium (-20%)', checkoutLink)}
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
          text: `Merci d'avoir teste NEUROCORE 360 ! Laisse ton avis et decouvre l'analyse Premium avec -20% : code ANALYSE20`,
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

      ${getCoachingSection(COLORS.purple)}

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
    console.log(`[SendPulse] Premium J+7 email sent to ${email}:`, result);
    return result.result === true;
  } catch (error) {
    console.error("[SendPulse] Error sending premium J+7 email:", error);
    return false;
  }
}

// Email PREMIUM J+14: relance uniquement si email J+7 non ouvert
export async function sendPremiumJ14Email(
  email: string,
  auditId: string,
  baseUrl: string,
  trackingId: string
): Promise<boolean> {
  try {
    const token = await getAccessToken();
    const coachingLink = "https://achzodcoaching.com";
    const trackingPixel = `${baseUrl}/api/track/email/${trackingId}/open.gif`;

    const content = `
      <h2 style="color: ${COLORS.text}; margin: 0 0 16px; font-size: 26px; text-align: center; font-weight: 700; letter-spacing: -1px;">
        J'ai remarque que tu n'as pas vu mon dernier message...
      </h2>

      <p style="color: ${COLORS.textMuted}; font-size: 16px; line-height: 1.7; margin: 0 0 28px; text-align: center;">
        Peut-etre que tu attends le bon moment pour te lancer ? Je comprends. Mais <strong style="color: ${COLORS.text};">le meilleur moment, c'est maintenant</strong>.
      </p>

      <div style="padding: 28px; background: linear-gradient(135deg, ${COLORS.warning}15 0%, ${COLORS.warning}05 100%); border-radius: 12px; border: 1px solid ${COLORS.warning}30;">
        <h3 style="color: ${COLORS.warning}; font-size: 22px; font-weight: 700; margin: 0 0 12px; text-align: center; letter-spacing: -0.5px;">
          Derniere opportunite : -20%
        </h3>
        <p style="color: ${COLORS.textMuted}; font-size: 14px; line-height: 1.7; margin: 0 0 20px; text-align: center;">
          Tu as fait ton analyse NEUROCORE 360. Tu as les informations. Il ne te manque plus que <strong style="color: ${COLORS.text};">l'accompagnement</strong> pour passer a l'action.
        </p>
        <div style="text-align: center; margin-bottom: 20px;">
          <span style="display: inline-block; background: ${COLORS.warning}; color: ${COLORS.background}; padding: 10px 20px; border-radius: 20px; font-size: 14px; font-weight: 700;">
            Code NEUROCORE20 = -20%
          </span>
        </div>
        ${getPrimaryButton('Commencer maintenant', coachingLink, COLORS.warning)}
      </div>

      <p style="color: #525252; font-size: 12px; line-height: 1.6; margin: 28px 0 0; text-align: center;">
        Si tu ne souhaites plus recevoir ces emails, reponds simplement "STOP".
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
          text: `Derniere chance ! Tu n'as pas vu mon dernier message. -20% sur le coaching avec le code NEUROCORE20.`,
          subject: "Derniere chance : -20% coaching (expire bientot)",
          from: { name: SENDER_NAME, email: SENDER_EMAIL },
          to: [{ email }],
        },
      }),
    });

    const result = await response.json() as { result: boolean };
    console.log(`[SendPulse] Premium J+14 email sent to ${email}:`, result);
    return result.result === true;
  } catch (error) {
    console.error("[SendPulse] Error sending premium J+14 email:", error);
    return false;
  }
}
