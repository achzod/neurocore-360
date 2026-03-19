/**
 * Google Sheets tracking - Export des données APEXLABS
 *
 * Génère un export CSV pour suivi dans Google Sheets:
 * https://docs.google.com/spreadsheets/d/1DihvbVfke7wFtmHN7N2Q9gEicIN9bnzGTZEqhXXwQRQ/edit
 */

import { storage } from "./storage";

export interface AuditTrackingRow {
  id: string;
  email: string;
  type: string;
  status: string;
  createdAt: string;
  generatedAt: string;
  scheduledFor: string;
  sentAt: string;
  validationScore: string;
  attemptCount: string;
  errorMessage: string;
}

/**
 * Génère les données de tracking pour tous les audits
 */
export async function generateTrackingData(): Promise<AuditTrackingRow[]> {
  const { db } = await import("./db.js");
  const { audits } = await import("../shared/drizzle-schema.js");

  const allAudits = await db.select().from(audits);
  const rows: AuditTrackingRow[] = [];

  for (const audit of allAudits) {
    // Récupérer le job pour attempt count
    let attemptCount = "";
    let errorMessage = "";
    try {
      const job = await storage.getReportJob(audit.id);
      if (job) {
        attemptCount = String(job.attemptCount || 0);
        errorMessage = job.error || "";
      }
    } catch {}

    // Score de validation
    let validationScore = "";
    const narrative = (audit as any)?.narrativeReport;
    if (narrative && typeof narrative === "object") {
      const validation = narrative.validationResult;
      if (validation && typeof validation === "object") {
        validationScore = String(validation.score || "");
      }
    }

    rows.push({
      id: audit.id,
      email: audit.email,
      type: audit.type,
      status: audit.reportDeliveryStatus || "UNKNOWN",
      createdAt: audit.createdAt ? new Date(audit.createdAt).toISOString() : "",
      generatedAt: (audit as any).reportGeneratedAt
        ? new Date((audit as any).reportGeneratedAt).toISOString()
        : "",
      scheduledFor: audit.reportScheduledFor
        ? new Date(audit.reportScheduledFor).toISOString()
        : "",
      sentAt: (audit as any).reportSentAt
        ? new Date((audit as any).reportSentAt).toISOString()
        : "",
      validationScore,
      attemptCount,
      errorMessage: errorMessage.substring(0, 100), // Limiter la taille
    });
  }

  // Trier par date de création (plus récent en premier)
  rows.sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return rows;
}

/**
 * Génère un CSV pour export Google Sheets
 */
export async function generateCSV(): Promise<string> {
  const rows = await generateTrackingData();

  const headers = [
    "ID",
    "Email",
    "Type",
    "Status",
    "Créé le",
    "Généré le",
    "Programmé pour",
    "Envoyé le",
    "Score validation",
    "Tentatives",
    "Erreur",
  ];

  const csvRows = [headers.join(",")];

  for (const row of rows) {
    const csvRow = [
      row.id.substring(0, 8), // ID court
      escapeCSV(row.email),
      row.type,
      row.status,
      formatDate(row.createdAt),
      formatDate(row.generatedAt),
      formatDate(row.scheduledFor),
      formatDate(row.sentAt),
      row.validationScore,
      row.attemptCount,
      escapeCSV(row.errorMessage),
    ];
    csvRows.push(csvRow.join(","));
  }

  return csvRows.join("\n");
}

/**
 * Génère des stats agrégées pour le dashboard Google Sheets
 */
export async function generateStats(): Promise<{
  totalAudits: number;
  byStatus: Record<string, number>;
  byType: Record<string, number>;
  generated: number;
  sent: number;
  averageValidationScore: number;
  failureRate: number;
}> {
  const rows = await generateTrackingData();

  const byStatus: Record<string, number> = {};
  const byType: Record<string, number> = {};
  let generated = 0;
  let sent = 0;
  let totalValidationScore = 0;
  let validationCount = 0;
  let failures = 0;

  for (const row of rows) {
    byStatus[row.status] = (byStatus[row.status] || 0) + 1;
    byType[row.type] = (byType[row.type] || 0) + 1;

    if (row.generatedAt) generated++;
    if (row.sentAt) sent++;

    if (row.validationScore) {
      totalValidationScore += Number(row.validationScore);
      validationCount++;
    }

    if (row.status === "FAILED" || row.status === "NEEDS_REVIEW") {
      failures++;
    }
  }

  return {
    totalAudits: rows.length,
    byStatus,
    byType,
    generated,
    sent,
    averageValidationScore:
      validationCount > 0 ? totalValidationScore / validationCount : 0,
    failureRate: rows.length > 0 ? (failures / rows.length) * 100 : 0,
  };
}

/**
 * Escape CSV field
 */
function escapeCSV(field: string): string {
  if (!field) return "";
  if (field.includes(",") || field.includes('"') || field.includes("\n")) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}

/**
 * Format date pour affichage
 */
function formatDate(isoDate: string): string {
  if (!isoDate) return "";
  const date = new Date(isoDate);
  return date.toLocaleString("fr-FR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * FUTURE: Intégration Google Sheets API directe
 *
 * Pour activer l'écriture automatique dans le sheet :
 * 1. Créer un service account Google Cloud
 * 2. Activer Google Sheets API
 * 3. Partager le sheet avec le service account email
 * 4. Ajouter les credentials dans .env:
 *    GOOGLE_SERVICE_ACCOUNT_EMAIL=xxx@xxx.iam.gserviceaccount.com
 *    GOOGLE_PRIVATE_KEY=xxx
 * 5. Uncomment le code ci-dessous
 */

/*
import { google } from 'googleapis';

export async function writeToGoogleSheet(spreadsheetId: string): Promise<boolean> {
  try {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const data = await generateTrackingData();

    // Clear existing data
    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: 'Feuille 1!A1:Z1000',
    });

    // Write headers and data
    const values = [
      ['ID', 'Email', 'Type', 'Status', 'Créé le', 'Généré le', 'Programmé pour', 'Envoyé le', 'Score', 'Tentatives', 'Erreur'],
      ...data.map(row => [
        row.id.substring(0, 8),
        row.email,
        row.type,
        row.status,
        formatDate(row.createdAt),
        formatDate(row.generatedAt),
        formatDate(row.scheduledFor),
        formatDate(row.sentAt),
        row.validationScore,
        row.attemptCount,
        row.errorMessage,
      ]),
    ];

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Feuille 1!A1',
      valueInputOption: 'RAW',
      requestBody: { values },
    });

    return true;
  } catch (error) {
    console.error('[GoogleSheets] Error writing to sheet:', error);
    return false;
  }
}
*/
