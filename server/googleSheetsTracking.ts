/**
 * Google Sheets tracking - Export des données APEXLABS
 *
 * Génère un export CSV pour suivi dans Google Sheets:
 * https://docs.google.com/spreadsheets/d/1DihvbVfke7wFtmHN7N2Q9gEicIN9bnzGTZEqhXXwQRQ/edit
 */

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
  const { pool } = await import("./db.js");
  const result = await pool.query(`
    SELECT
      a.id,
      a.email,
      a.type,
      COALESCE(a.report_delivery_status, 'UNKNOWN') AS status,
      a.created_at,
      NULL::timestamp AS generated_at,
      a.report_scheduled_for,
      a.report_sent_at,
      COALESCE(a.narrative_report->'validationResult'->>'score', '') AS validation_score,
      COALESCE(rj.attempt_count::text, '') AS attempt_count,
      COALESCE(LEFT(rj.error, 100), '') AS error_message
    FROM audits a
    LEFT JOIN report_jobs rj ON rj.audit_id = a.id
    ORDER BY a.created_at DESC
  `);

  return result.rows.map((row) => ({
    id: row.id,
    email: row.email,
    type: row.type,
    status: row.status,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : "",
    generatedAt: row.generated_at ? new Date(row.generated_at).toISOString() : "",
    scheduledFor: row.report_scheduled_for ? new Date(row.report_scheduled_for).toISOString() : "",
    sentAt: row.report_sent_at ? new Date(row.report_sent_at).toISOString() : "",
    validationScore: row.validation_score || "",
    attemptCount: row.attempt_count || "",
    errorMessage: row.error_message || "",
  }));
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
 * Génère un CSV combiné avec audits + emails pour Google Sheets
 */
export async function generateCombinedCSV(): Promise<{
  auditsCSV: string;
  emailsCSV: string;
}> {
  const auditsCSV = await generateCSV();

  // Import email tracking data
  const { exportEmailTrackingCSV } = await import("./emailTracking");
  const emailsCSV = await exportEmailTrackingCSV();

  return {
    auditsCSV,
    emailsCSV,
  };
}

/**
 * Génère des stats combinées (audits + emails) pour le dashboard
 */
export async function getCombinedStats(): Promise<{
  audits: {
    totalAudits: number;
    byStatus: Record<string, number>;
    byType: Record<string, number>;
    generated: number;
    sent: number;
    averageValidationScore: number;
    failureRate: number;
  };
  emails: {
    totalSent: number;
    byType: Record<string, number>;
    successRate: number;
    openRate: number;
    clickRate: number;
    conversionRate: number;
    last24h: number;
    last7d: number;
  };
}> {
  const auditStats = await generateStats();

  // Import email tracking stats
  const { getEmailTrackingStats } = await import("./emailTracking");
  const emailStats = await getEmailTrackingStats();

  return {
    audits: auditStats,
    emails: emailStats,
  };
}

/**
 * Webhook Google Sheets - Appelle le Apps Script web app pour mettre à jour le sheet
 *
 * Setup:
 * 1. Déployer le Apps Script (voir GOOGLE_SHEETS_WEBHOOK.md)
 * 2. Ajouter l'URL webhook dans .env: GOOGLE_SHEETS_WEBHOOK_URL=https://script.google.com/macros/s/.../exec
 */

const GOOGLE_SHEETS_NOTIFY_MIN_INTERVAL_MS = Number(process.env.GOOGLE_SHEETS_NOTIFY_MIN_INTERVAL_MS || 5 * 60 * 1000);
const GOOGLE_SHEETS_NOTIFY_TIMEOUT_MS = Number(process.env.GOOGLE_SHEETS_NOTIFY_TIMEOUT_MS || 8000);
let lastGoogleSheetNotifyAt = 0;
let googleSheetNotifyInFlight = false;
let googleSheetNotifySkipped = 0;

export async function notifyGoogleSheetUpdate(): Promise<boolean> {
  const webhookUrl = process.env.GOOGLE_SHEETS_WEBHOOK_URL;

  if (!webhookUrl) {
    console.log('[GoogleSheets] Webhook URL not configured, skipping update');
    return false;
  }

  const now = Date.now();
  if (googleSheetNotifyInFlight || now - lastGoogleSheetNotifyAt < GOOGLE_SHEETS_NOTIFY_MIN_INTERVAL_MS) {
    googleSheetNotifySkipped += 1;
    return false;
  }

  googleSheetNotifyInFlight = true;
  lastGoogleSheetNotifyAt = now;

  try {
    const skipped = googleSheetNotifySkipped;
    googleSheetNotifySkipped = 0;
    console.log(`[GoogleSheets] Calling webhook to update sheet${skipped ? ` (throttled ${skipped} intermediate updates)` : ""}...`);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), GOOGLE_SHEETS_NOTIFY_TIMEOUT_MS);
    timeout.unref?.();

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ timestamp: new Date().toISOString() }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`Webhook returned ${response.status}`);
    }

    console.log('[GoogleSheets] ✅ Sheet updated successfully via webhook');
    return true;
  } catch (error) {
    console.error('[GoogleSheets] ❌ Error calling webhook:', error);
    return false;
  } finally {
    googleSheetNotifyInFlight = false;
  }
}
