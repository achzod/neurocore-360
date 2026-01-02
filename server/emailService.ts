const SENDPULSE_USER_ID = process.env.SENDPULSE_USER_ID;
const SENDPULSE_SECRET = process.env.SENDPULSE_SECRET;
const SENDER_EMAIL = "coaching@achzodcoaching.com";
const SENDER_NAME = "NEUROCORE 360°";

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

export async function sendReportReadyEmail(
  email: string,
  auditId: string,
  auditType: string,
  baseUrl: string
): Promise<boolean> {
  try {
    const token = await getAccessToken();
    const dashboardLink = `${baseUrl}/dashboard/${auditId}`;
    const planLabel = auditType === "GRATUIT" ? "Gratuit" : auditType === "PREMIUM" ? "Premium" : "Elite";
    const planBadgeColor = auditType === "ELITE" ? "#8b5cf6" : auditType === "PREMIUM" ? "#10b981" : "#6b7280";

    const achzodLogoSvg = `<svg viewBox="0 0 38.047 30.012" width="32" height="25" style="vertical-align: middle;"><g fill="#ffffff"><path d="M128.282,57.01v6.646H108.06V59.6l4.9-19.315H119.9l-4.243,16.72Z" transform="translate(-90.235 -33.644)" /><path d="M19.506,0V4.048L14.6,23.366H7.667L11.91,6.646H0V0Z" /></g></svg>`;

    const emailContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Inter, 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0a0a0a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0a0a0a; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #171717; border-radius: 16px; overflow: hidden; border: 1px solid #262626;">
          <tr>
            <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 32px 30px; text-align: center;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center">
                    <div style="display: inline-block; background-color: rgba(0,0,0,0.2); padding: 8px 16px; border-radius: 8px; margin-bottom: 16px;">
                      ${achzodLogoSvg}
                      <span style="color: #ffffff; font-size: 16px; font-weight: 700; margin-left: 8px; vertical-align: middle;">ACHZOD</span>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">NEUROCORE 360°</h1>
                    <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0; font-size: 14px;">Audit 360 Complet</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px;">
              <div style="text-align: center; margin-bottom: 24px;">
                <span style="display: inline-block; background-color: ${planBadgeColor}; color: #ffffff; padding: 6px 16px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                  Rapport ${planLabel}
                </span>
              </div>
              <h2 style="color: #fafafa; margin: 0 0 16px; font-size: 24px; text-align: center;">Ton rapport est pret !</h2>
              <p style="color: #a3a3a3; font-size: 16px; line-height: 1.7; margin: 0 0 16px; text-align: center;">
                J'ai termine l'analyse complete de ton profil metabolique a travers les 15 domaines de sante.
              </p>
              <p style="color: #a3a3a3; font-size: 16px; line-height: 1.7; margin: 0 0 32px; text-align: center;">
                Decouvre tes scores, recommandations personnalisees et protocoles de supplements.
              </p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center">
                    <a href="${dashboardLink}" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; text-decoration: none; padding: 16px 48px; border-radius: 10px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.4);">
                      Consulter mon rapport
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Review CTA Section -->
              <div style="margin-top: 32px; padding: 24px; background: linear-gradient(135deg, rgba(251, 191, 36, 0.15) 0%, rgba(245, 158, 11, 0.08) 100%); border-radius: 12px; border: 1px solid rgba(251, 191, 36, 0.3);">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td align="center">
                      <div style="font-size: 28px; margin-bottom: 12px;">⭐⭐⭐⭐⭐</div>
                      <h3 style="color: #fbbf24; font-size: 18px; font-weight: 700; margin: 0 0 8px;">Ton avis compte !</h3>
                      <p style="color: #a3a3a3; font-size: 14px; margin: 0 0 16px; line-height: 1.5;">
                        Apres avoir consulte ton rapport, prends 30 secondes pour noter ton experience.<br>
                        Ton retour aide d'autres personnes a decouvrir NEUROCORE 360.
                      </p>
                      <a href="${dashboardLink}#review" style="display: inline-block; background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%); color: #0a0a0a; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-size: 14px; font-weight: 700;">
                        Laisser mon avis
                      </a>
                    </td>
                  </tr>
                </table>
              </div>
              <div style="margin-top: 32px; padding: 20px; background-color: #262626; border-radius: 10px;">
                <p style="color: #a3a3a3; font-size: 13px; margin: 0 0 8px; text-align: center;">
                  Si le bouton ne fonctionne pas, copie ce lien :
                </p>
                <p style="margin: 0; text-align: center;">
                  <a href="${dashboardLink}" style="color: #10b981; font-size: 12px; word-break: break-all;">${dashboardLink}</a>
                </p>
              </div>
            </td>
          </tr>
          <tr>
            <td style="background-color: #0a0a0a; padding: 24px 30px; text-align: center; border-top: 1px solid #262626;">
              <p style="color: #525252; font-size: 12px; margin: 0 0 8px;">
                ${achzodLogoSvg.replace('#ffffff', '#525252')}
                <span style="vertical-align: middle; margin-left: 6px;">ACHZOD</span>
              </p>
              <p style="color: #404040; font-size: 11px; margin: 0;">
                Optimise ta sante avec la science
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
          html: encodeBase64(emailContent),
          text: `Ton audit NEUROCORE 360 est pret ! Consulte ton rapport ici : ${dashboardLink}`,
          subject: `Ton Audit 360 ${planLabel} est Pret - NEUROCORE 360`,
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

    const achzodLogoSvg = `<svg viewBox="0 0 38.047 30.012" width="32" height="25" style="vertical-align: middle;"><g fill="#ffffff"><path d="M128.282,57.01v6.646H108.06V59.6l4.9-19.315H119.9l-4.243,16.72Z" transform="translate(-90.235 -33.644)" /><path d="M19.506,0V4.048L14.6,23.366H7.667L11.91,6.646H0V0Z" /></g></svg>`;

    const emailContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Inter, 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0a0a0a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0a0a0a; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #171717; border-radius: 16px; overflow: hidden; border: 1px solid #262626;">
          <tr>
            <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 32px 30px; text-align: center;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center">
                    <div style="display: inline-block; background-color: rgba(0,0,0,0.2); padding: 8px 16px; border-radius: 8px; margin-bottom: 16px;">
                      ${achzodLogoSvg}
                      <span style="color: #ffffff; font-size: 16px; font-weight: 700; margin-left: 8px; vertical-align: middle;">ACHZOD</span>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">NEUROCORE 360°</h1>
                    <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0; font-size: 14px;">Audit 360 Complet</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="color: #fafafa; margin: 0 0 16px; font-size: 24px; text-align: center;">Connexion a ton espace</h2>
              <p style="color: #a3a3a3; font-size: 16px; line-height: 1.7; margin: 0 0 32px; text-align: center;">
                Clique sur le bouton ci-dessous pour acceder a ton dashboard et consulter tes audits NEUROCORE 360.
              </p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center">
                    <a href="${magicLink}" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; text-decoration: none; padding: 16px 48px; border-radius: 10px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.4);">
                      Acceder a mon dashboard
                    </a>
                  </td>
                </tr>
              </table>
              <p style="color: #737373; font-size: 14px; line-height: 1.6; margin: 24px 0 0; text-align: center;">
                Ce lien expire dans 1 heure. Si tu n'as pas demande cette connexion, ignore cet email.
              </p>
              <div style="margin-top: 32px; padding: 20px; background-color: #262626; border-radius: 10px;">
                <p style="color: #a3a3a3; font-size: 13px; margin: 0 0 8px; text-align: center;">
                  Si le bouton ne fonctionne pas, copie ce lien :
                </p>
                <p style="margin: 0; text-align: center;">
                  <a href="${magicLink}" style="color: #10b981; font-size: 12px; word-break: break-all;">${magicLink}</a>
                </p>
              </div>
            </td>
          </tr>
          <tr>
            <td style="background-color: #0a0a0a; padding: 24px 30px; text-align: center; border-top: 1px solid #262626;">
              <p style="color: #525252; font-size: 12px; margin: 0 0 8px;">
                ${achzodLogoSvg.replace('#ffffff', '#525252')}
                <span style="vertical-align: middle; margin-left: 6px;">ACHZOD</span>
              </p>
              <p style="color: #404040; font-size: 11px; margin: 0;">
                Optimise ta sante avec la science
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

    const emailContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Inter, 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0a0a0a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0a0a0a; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #171717; border-radius: 16px; overflow: hidden; border: 1px solid #262626;">
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="color: #fafafa; margin: 0 0 16px; font-size: 24px;">Nouvelle analyse générée</h2>
              <p style="color: #a3a3a3; font-size: 16px; line-height: 1.7; margin: 0 0 8px;">
                <strong style="color: #fafafa;">Client:</strong> ${clientName} (${clientEmail})
              </p>
              <p style="color: #a3a3a3; font-size: 16px; line-height: 1.7; margin: 0 0 8px;">
                <strong style="color: #fafafa;">Type:</strong> ${planLabel}
              </p>
              <p style="color: #a3a3a3; font-size: 16px; line-height: 1.7; margin: 0 0 24px;">
                <strong style="color: #fafafa;">Audit ID:</strong> ${auditId}
              </p>
              <p style="color: #a3a3a3; font-size: 14px; line-height: 1.7; margin: 0;">
                L'analyse a été générée avec succès et l'email a été envoyé au client.
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
          html: encodeBase64(emailContent),
          text: `Nouvelle analyse ${planLabel} générée pour ${clientName} (${clientEmail}) - Audit ID: ${auditId}`,
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

    const achzodLogoSvg = `<svg viewBox="0 0 38.047 30.012" width="32" height="25" style="vertical-align: middle;"><g fill="#ffffff"><path d="M128.282,57.01v6.646H108.06V59.6l4.9-19.315H119.9l-4.243,16.72Z" transform="translate(-90.235 -33.644)" /><path d="M19.506,0V4.048L14.6,23.366H7.667L11.91,6.646H0V0Z" /></g></svg>`;

    const emailContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Inter, 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0a0a0a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0a0a0a; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #171717; border-radius: 16px; overflow: hidden; border: 1px solid #262626;">
          <tr>
            <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 32px 30px; text-align: center;">
              <div style="display: inline-block; background-color: rgba(0,0,0,0.2); padding: 8px 16px; border-radius: 8px; margin-bottom: 16px;">
                ${achzodLogoSvg}
                <span style="color: #ffffff; font-size: 16px; font-weight: 700; margin-left: 8px; vertical-align: middle;">ACHZOD</span>
              </div>
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">NEUROCORE 360°</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="color: #fafafa; margin: 0 0 16px; font-size: 24px; text-align: center;">Ton avis compte !</h2>
              <p style="color: #a3a3a3; font-size: 16px; line-height: 1.7; margin: 0 0 24px; text-align: center;">
                Merci d'avoir teste NEUROCORE 360 ! J'aimerais savoir ce que tu as pense de ton analyse gratuite.
              </p>

              <!-- Review CTA -->
              <div style="margin-bottom: 32px; padding: 24px; background: linear-gradient(135deg, rgba(251, 191, 36, 0.15) 0%, rgba(245, 158, 11, 0.08) 100%); border-radius: 12px; border: 1px solid rgba(251, 191, 36, 0.3); text-align: center;">
                <div style="font-size: 28px; margin-bottom: 12px;">⭐⭐⭐⭐⭐</div>
                <h3 style="color: #fbbf24; font-size: 18px; font-weight: 700; margin: 0 0 8px;">Laisse ton avis en 30 secondes</h3>
                <p style="color: #a3a3a3; font-size: 14px; margin: 0 0 16px;">Ton retour aide d'autres personnes a decouvrir NEUROCORE 360.</p>
                <a href="${dashboardLink}#review" style="display: inline-block; background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%); color: #0a0a0a; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-size: 14px; font-weight: 700;">
                  Donner mon avis
                </a>
              </div>

              <!-- Upsell Premium -->
              <div style="padding: 24px; background: linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(5, 150, 105, 0.08) 100%); border-radius: 12px; border: 1px solid rgba(16, 185, 129, 0.3);">
                <h3 style="color: #10b981; font-size: 20px; font-weight: 700; margin: 0 0 12px; text-align: center;">
                  Passe au niveau superieur
                </h3>
                <p style="color: #a3a3a3; font-size: 14px; line-height: 1.6; margin: 0 0 16px; text-align: center;">
                  Tu as eu un apercu de ton profil. Avec l'analyse <strong style="color: #fafafa;">Premium</strong>, decouvre :
                </p>
                <ul style="color: #a3a3a3; font-size: 14px; line-height: 1.8; margin: 0 0 16px; padding-left: 20px;">
                  <li>Analyse IA approfondie sur 15 domaines</li>
                  <li>Protocole de supplements personnalise</li>
                  <li>Analyse de tes photos corporelles</li>
                  <li>Recommandations alimentaires detaillees</li>
                </ul>
                <div style="text-align: center; margin-bottom: 16px;">
                  <span style="display: inline-block; background-color: #10b981; color: #ffffff; padding: 8px 16px; border-radius: 20px; font-size: 16px; font-weight: 700;">
                    -20% avec le code ANALYSE20
                  </span>
                </div>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td align="center">
                      <a href="${checkoutLink}" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 10px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.4);">
                        Passer au Premium (-20%)
                      </a>
                    </td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>
          <tr>
            <td style="background-color: #0a0a0a; padding: 24px 30px; text-align: center; border-top: 1px solid #262626;">
              <p style="color: #404040; font-size: 11px; margin: 0;">Optimise ta sante avec la science</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
  <img src="${trackingPixel}" width="1" height="1" style="display:none;" alt="" />
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
    const coachingLink = "https://achzodcoaching.com/formules";
    const trackingPixel = `${baseUrl}/api/track/email/${trackingId}/open.gif`;

    const achzodLogoSvg = `<svg viewBox="0 0 38.047 30.012" width="32" height="25" style="vertical-align: middle;"><g fill="#ffffff"><path d="M128.282,57.01v6.646H108.06V59.6l4.9-19.315H119.9l-4.243,16.72Z" transform="translate(-90.235 -33.644)" /><path d="M19.506,0V4.048L14.6,23.366H7.667L11.91,6.646H0V0Z" /></g></svg>`;

    // Section avis conditionnelle
    const reviewSection = !hasLeftReview ? `
      <div style="margin-bottom: 32px; padding: 24px; background: linear-gradient(135deg, rgba(251, 191, 36, 0.15) 0%, rgba(245, 158, 11, 0.08) 100%); border-radius: 12px; border: 1px solid rgba(251, 191, 36, 0.3); text-align: center;">
        <div style="font-size: 28px; margin-bottom: 12px;">⭐⭐⭐⭐⭐</div>
        <h3 style="color: #fbbf24; font-size: 18px; font-weight: 700; margin: 0 0 8px;">Ton avis compte enormement !</h3>
        <p style="color: #a3a3a3; font-size: 14px; margin: 0 0 16px;">Ca fait une semaine que tu as recu ton analyse. Qu'en penses-tu ?</p>
        <a href="${dashboardLink}#review" style="display: inline-block; background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%); color: #0a0a0a; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-size: 14px; font-weight: 700;">
          Laisser mon avis
        </a>
      </div>
    ` : '';

    const emailContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Inter, 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0a0a0a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0a0a0a; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #171717; border-radius: 16px; overflow: hidden; border: 1px solid #262626;">
          <tr>
            <td style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); padding: 32px 30px; text-align: center;">
              <div style="display: inline-block; background-color: rgba(0,0,0,0.2); padding: 8px 16px; border-radius: 8px; margin-bottom: 16px;">
                ${achzodLogoSvg}
                <span style="color: #ffffff; font-size: 16px; font-weight: 700; margin-left: 8px; vertical-align: middle;">ACHZOD</span>
              </div>
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">Pret a passer a l'action ?</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="color: #fafafa; margin: 0 0 16px; font-size: 22px; text-align: center;">
                Ca fait une semaine que tu as recu ton analyse Premium...
              </h2>
              <p style="color: #a3a3a3; font-size: 16px; line-height: 1.7; margin: 0 0 24px; text-align: center;">
                Tu as maintenant toutes les informations pour transformer ta sante. Mais l'information sans action ne sert a rien.
              </p>

              ${reviewSection}

              <!-- Coaching CTA -->
              <div style="padding: 24px; background: linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(124, 58, 237, 0.08) 100%); border-radius: 12px; border: 1px solid rgba(139, 92, 246, 0.3);">
                <h3 style="color: #8b5cf6; font-size: 20px; font-weight: 700; margin: 0 0 12px; text-align: center;">
                  Coaching personnalise avec Achzod
                </h3>
                <p style="color: #a3a3a3; font-size: 14px; line-height: 1.6; margin: 0 0 16px; text-align: center;">
                  Tu veux aller plus loin et etre accompagne personnellement ? Decouvre mes formules de coaching :
                </p>
                <ul style="color: #a3a3a3; font-size: 14px; line-height: 1.8; margin: 0 0 16px; padding-left: 20px;">
                  <li><strong style="color: #fafafa;">Suivi nutritionnel</strong> adapte a ton profil</li>
                  <li><strong style="color: #fafafa;">Programme d'entrainement</strong> sur mesure</li>
                  <li><strong style="color: #fafafa;">Coaching 1:1</strong> pour te guider chaque semaine</li>
                  <li><strong style="color: #fafafa;">Acces direct</strong> par WhatsApp/Telegram</li>
                </ul>
                <div style="text-align: center; margin-bottom: 16px;">
                  <span style="display: inline-block; background-color: #8b5cf6; color: #ffffff; padding: 8px 16px; border-radius: 20px; font-size: 16px; font-weight: 700;">
                    -20% avec le code NEUROCORE20
                  </span>
                </div>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td align="center">
                      <a href="${coachingLink}" style="display: inline-block; background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 10px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 14px rgba(139, 92, 246, 0.4);">
                        Decouvrir les formules (-20%)
                      </a>
                    </td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>
          <tr>
            <td style="background-color: #0a0a0a; padding: 24px 30px; text-align: center; border-top: 1px solid #262626;">
              <p style="color: #404040; font-size: 11px; margin: 0;">Optimise ta sante avec la science - ACHZOD</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
  <img src="${trackingPixel}" width="1" height="1" style="display:none;" alt="" />
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
    const coachingLink = "https://achzodcoaching.com/formules";
    const trackingPixel = `${baseUrl}/api/track/email/${trackingId}/open.gif`;

    const achzodLogoSvg = `<svg viewBox="0 0 38.047 30.012" width="32" height="25" style="vertical-align: middle;"><g fill="#ffffff"><path d="M128.282,57.01v6.646H108.06V59.6l4.9-19.315H119.9l-4.243,16.72Z" transform="translate(-90.235 -33.644)" /><path d="M19.506,0V4.048L14.6,23.366H7.667L11.91,6.646H0V0Z" /></g></svg>`;

    const emailContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Inter, 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0a0a0a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0a0a0a; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #171717; border-radius: 16px; overflow: hidden; border: 1px solid #262626;">
          <tr>
            <td style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 32px 30px; text-align: center;">
              <div style="display: inline-block; background-color: rgba(0,0,0,0.2); padding: 8px 16px; border-radius: 8px; margin-bottom: 16px;">
                ${achzodLogoSvg}
                <span style="color: #ffffff; font-size: 16px; font-weight: 700; margin-left: 8px; vertical-align: middle;">ACHZOD</span>
              </div>
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">Derniere chance !</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="color: #fafafa; margin: 0 0 16px; font-size: 22px; text-align: center;">
                J'ai remarque que tu n'as pas vu mon dernier message...
              </h2>
              <p style="color: #a3a3a3; font-size: 16px; line-height: 1.7; margin: 0 0 24px; text-align: center;">
                Peut-etre que tu attends le bon moment pour te lancer ? Je comprends. Mais le meilleur moment, c'est maintenant.
              </p>

              <div style="padding: 24px; background: linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(217, 119, 6, 0.08) 100%); border-radius: 12px; border: 1px solid rgba(245, 158, 11, 0.3);">
                <h3 style="color: #f59e0b; font-size: 20px; font-weight: 700; margin: 0 0 12px; text-align: center;">
                  Derniere opportunite : -20% sur le coaching
                </h3>
                <p style="color: #a3a3a3; font-size: 14px; line-height: 1.6; margin: 0 0 16px; text-align: center;">
                  Tu as fait ton analyse NEUROCORE 360. Tu as les informations. Il ne te manque plus que l'accompagnement pour passer a l'action.
                </p>
                <div style="text-align: center; margin-bottom: 16px;">
                  <span style="display: inline-block; background-color: #f59e0b; color: #0a0a0a; padding: 8px 16px; border-radius: 20px; font-size: 16px; font-weight: 700;">
                    Code NEUROCORE20 = -20%
                  </span>
                </div>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td align="center">
                      <a href="${coachingLink}" style="display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: #0a0a0a; text-decoration: none; padding: 14px 40px; border-radius: 10px; font-size: 16px; font-weight: 700; box-shadow: 0 4px 14px rgba(245, 158, 11, 0.4);">
                        Commencer maintenant
                      </a>
                    </td>
                  </tr>
                </table>
              </div>

              <p style="color: #737373; font-size: 13px; line-height: 1.6; margin: 24px 0 0; text-align: center;">
                Si tu ne souhaites plus recevoir ces emails, reponds simplement "STOP" et je te retirerai de la liste.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #0a0a0a; padding: 24px 30px; text-align: center; border-top: 1px solid #262626;">
              <p style="color: #404040; font-size: 11px; margin: 0;">Optimise ta sante avec la science - ACHZOD</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
  <img src="${trackingPixel}" width="1" height="1" style="display:none;" alt="" />
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
