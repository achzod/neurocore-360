/**
 * Google Sheets Service - Direct API Integration
 *
 * Écrit automatiquement dans Google Sheets sans Apps Script
 * Push automatique à chaque email envoyé
 *
 * ZERO configuration côté user (sauf 1 seule fois: Service Account)
 */

/**
 * Configuration
 */
const SPREADSHEET_ID = "1DihvbVfke7wFtmHN7N2Q9gEicIN9bnzGTZEqhXXwQRQ";
const EMAILS_SHEET_NAME = "Emails";

/**
 * Interface pour les credentials Google Service Account
 */
interface GoogleServiceAccountCredentials {
  client_email: string;
  private_key: string;
}

/**
 * Obtenir les credentials depuis les variables d'environnement
 */
function getCredentials(): GoogleServiceAccountCredentials | null {
  const clientEmail = process.env.GOOGLE_SHEETS_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_SHEETS_PRIVATE_KEY;

  if (!clientEmail || !privateKey) {
    console.log('[GoogleSheetsService] Credentials not configured (optional)');
    return null;
  }

  return {
    client_email: clientEmail,
    private_key: privateKey.replace(/\\n/g, '\n'), // Fix escaped newlines
  };
}

/**
 * Générer un JWT token pour authentifier avec Google API
 */
async function getAccessToken(credentials: GoogleServiceAccountCredentials): Promise<string> {
  const now = Math.floor(Date.now() / 1000);

  // JWT header
  const header = {
    alg: 'RS256',
    typ: 'JWT',
  };

  // JWT claim set
  const claimSet = {
    iss: credentials.client_email,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };

  // Encode header and claim set
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedClaimSet = base64UrlEncode(JSON.stringify(claimSet));

  const signatureInput = `${encodedHeader}.${encodedClaimSet}`;

  // Sign with private key (using Node.js crypto)
  const crypto = await import('crypto');
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(signatureInput);
  const signature = sign.sign(credentials.private_key, 'base64');
  const encodedSignature = base64UrlEncode(Buffer.from(signature, 'base64').toString('base64'));

  const jwt = `${signatureInput}.${encodedSignature}`;

  // Exchange JWT for access token
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to get access token: ${response.status}`);
  }

  const data = await response.json();
  return data.access_token;
}

/**
 * Helper: Base64 URL encode
 */
function base64UrlEncode(str: string): string {
  return Buffer.from(str)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Push email data to Google Sheets
 * Appelé automatiquement après chaque email envoyé
 */
export async function pushEmailToSheets(emailData: {
  id: string;
  emailType: string;
  recipientEmail: string;
  recipientName?: string | null;
  auditId?: string | null;
  auditType?: string | null;
  subject: string;
  sendpulseStatus: string;
  sentAt: Date;
}): Promise<boolean> {
  try {
    const credentials = getCredentials();

    if (!credentials) {
      // Pas configuré, skip silencieusement
      return false;
    }

    const accessToken = await getAccessToken(credentials);

    // Formater les données pour Google Sheets
    const row = [
      emailData.id.substring(0, 8),
      emailData.emailType,
      emailData.recipientEmail,
      emailData.recipientName || '',
      emailData.auditId ? emailData.auditId.substring(0, 8) : '',
      emailData.auditType || '',
      emailData.subject,
      emailData.sendpulseStatus,
      formatDate(emailData.sentAt),
      '', // Ouvert le
      '', // Cliqué le
      '', // Converti le
      '', // Type conversion
    ];

    // Ajouter la ligne au sheet via Google Sheets API
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${EMAILS_SHEET_NAME}:append?valueInputOption=USER_ENTERED`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          values: [row],
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('[GoogleSheetsService] ❌ Error appending row:', error);
      return false;
    }

    console.log(`[GoogleSheetsService] ✅ Pushed email ${emailData.id.substring(0, 8)} to Sheets`);
    return true;

  } catch (error) {
    console.error('[GoogleSheetsService] ❌ Error:', error);
    return false;
  }
}

/**
 * Initialiser le sheet (headers)
 * À appeler une seule fois manuellement via endpoint admin
 */
export async function initializeEmailsSheet(): Promise<boolean> {
  try {
    const credentials = getCredentials();

    if (!credentials) {
      throw new Error('Google Sheets credentials not configured');
    }

    const accessToken = await getAccessToken(credentials);

    // Headers
    const headers = [
      'ID', 'Type Email', 'Destinataire', 'Nom', 'Audit ID', 'Type Audit',
      'Sujet', 'Status', 'Envoyé le', 'Ouvert le', 'Cliqué le',
      'Converti le', 'Type Conversion'
    ];

    // Clear existing data
    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${EMAILS_SHEET_NAME}:clear`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    // Write headers
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${EMAILS_SHEET_NAME}!A1:M1?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          values: [headers],
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to write headers: ${response.status}`);
    }

    // Format headers (bold, yellow background)
    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}:batchUpdate`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [
            {
              repeatCell: {
                range: {
                  sheetId: 0, // Emails sheet (à ajuster si nécessaire)
                  startRowIndex: 0,
                  endRowIndex: 1,
                },
                cell: {
                  userEnteredFormat: {
                    backgroundColor: { red: 0.99, green: 0.87, blue: 0 }, // #FCDD00
                    textFormat: {
                      bold: true,
                    },
                  },
                },
                fields: 'userEnteredFormat(backgroundColor,textFormat)',
              },
            },
          ],
        }),
      }
    );

    console.log('[GoogleSheetsService] ✅ Emails sheet initialized');
    return true;

  } catch (error) {
    console.error('[GoogleSheetsService] ❌ Error initializing sheet:', error);
    return false;
  }
}

/**
 * Sync all emails from database to Sheets
 * Utile pour migration initiale ou resync complet
 */
export async function syncAllEmailsToSheets(): Promise<boolean> {
  try {
    const credentials = getCredentials();

    if (!credentials) {
      throw new Error('Google Sheets credentials not configured');
    }

    // Get all emails from database
    const { db } = await import('./db');
    const { emailTracking } = await import('../shared/drizzle-schema');
    const { desc } = await import('drizzle-orm');

    const emails = await db.select().from(emailTracking).orderBy(desc(emailTracking.sentAt));

    console.log(`[GoogleSheetsService] Syncing ${emails.length} emails to Sheets...`);

    // Initialize sheet (clear + headers)
    await initializeEmailsSheet();

    // Push all emails
    const accessToken = await getAccessToken(credentials);

    const rows = emails.map(email => [
      email.id.substring(0, 8),
      email.emailType,
      email.recipientEmail,
      email.recipientName || '',
      email.auditId ? email.auditId.substring(0, 8) : '',
      email.auditType || '',
      email.subject || '',
      email.sendpulseStatus || 'pending',
      formatDate(email.sentAt),
      formatDate(email.opened),
      formatDate(email.clicked),
      formatDate(email.converted),
      email.conversionType || '',
    ]);

    // Append all rows at once
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${EMAILS_SHEET_NAME}:append?valueInputOption=USER_ENTERED`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          values: rows,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to append rows: ${response.status}`);
    }

    console.log(`[GoogleSheetsService] ✅ Synced ${emails.length} emails to Sheets`);
    return true;

  } catch (error) {
    console.error('[GoogleSheetsService] ❌ Error syncing emails:', error);
    return false;
  }
}

/**
 * Helper: Format date pour Google Sheets
 */
function formatDate(date: Date | null): string {
  if (!date) return '';
  return new Date(date).toLocaleString('fr-FR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}
