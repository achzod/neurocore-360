/**
 * Email Tracking Service - APEXLABS
 *
 * Logs all automated emails sent by the system:
 * - Stores in database (email_tracking table)
 * - Exports to Google Sheets for monitoring
 * - Provides analytics for admin dashboard
 *
 * Admin email CC: achkou@gmail.com receives copy of all emails
 */

import { db, pool } from "./db";
import { emailTracking } from "../shared/drizzle-schema";
import { notifyGoogleSheetUpdate } from "./googleSheetsTracking";
import { eq } from "drizzle-orm";

export const ADMIN_EMAIL_CC = "achkou@gmail.com";

export interface EmailTrackingData {
  emailType: string;
  recipientEmail: string;
  recipientName?: string;
  auditId?: string;
  auditType?: string;
  subject: string;
  previewText?: string;
  sendpulseTaskId?: string;
  sendpulseStatus?: "success" | "failed" | "pending" | "unsubscribed" | "auth_failed";
  sendpulseError?: string;
  metadata?: Record<string, any>;
}

const isUuid = (value: unknown): value is string =>
  typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

/**
 * Log an email to the tracking system
 * Called after every email send attempt
 */
export async function logEmail(data: EmailTrackingData): Promise<string> {
  try {
    console.log(`[EmailTracking] Logging email: ${data.emailType} → ${data.recipientEmail}`);

    const values = {
      emailType: data.emailType,
      recipientEmail: data.recipientEmail,
      recipientName: data.recipientName || null,
      auditId: data.auditId || null,
      auditType: data.auditType || null,
      subject: data.subject,
      previewText: data.previewText || null,
      sendpulseTaskId: data.sendpulseTaskId || null,
      sendpulseStatus: data.sendpulseStatus || "pending",
      sendpulseError: data.sendpulseError || null,
      metadata: data.metadata || null,
      sentAt: new Date(),
    };

    const precreatedTrackingId = isUuid(data.metadata?.trackingId)
      ? data.metadata.trackingId
      : null;

    let result: Array<{ id: string }> = [];
    if (precreatedTrackingId) {
      result = await db
        .update(emailTracking)
        .set(values)
        .where(eq(emailTracking.id, precreatedTrackingId))
        .returning({ id: emailTracking.id });
    }

    if (result.length === 0) {
      result = await db.insert(emailTracking).values({
        ...(precreatedTrackingId ? { id: precreatedTrackingId } : {}),
        ...values,
        createdAt: new Date(),
      }).onConflictDoUpdate({
        target: emailTracking.id,
        set: values,
      }).returning({ id: emailTracking.id });
    }

    const trackingId = result[0]?.id || "unknown";

    console.log(`[EmailTracking] ✅ Logged with ID: ${trackingId}`);

    // Notify Google Sheets to update (async, non-blocking)
    notifyGoogleSheetUpdate().catch((err) => {
      console.error("[EmailTracking] Warning: Google Sheets update failed:", err);
    });

    return trackingId;
  } catch (error) {
    console.error("[EmailTracking] ❌ Error logging email:", error);
    // Non-blocking: Don't throw, just log error
    return "error";
  }
}

/**
 * Update email engagement (opened, clicked, converted)
 * Called from webhooks or tracking endpoints
 */
export async function updateEmailEngagement(
  trackingId: string,
  engagement: {
    opened?: boolean;
    clicked?: boolean;
    converted?: boolean;
    conversionType?: string;
  }
): Promise<void> {
  try {
    const updates: any = {};

    if (engagement.opened) {
      updates.opened = new Date();
    }
    if (engagement.clicked) {
      updates.clicked = new Date();
    }
    if (engagement.converted) {
      updates.converted = new Date();
      updates.conversionType = engagement.conversionType || null;
    }

    if (Object.keys(updates).length > 0) {
      await db.update(emailTracking).set(updates).where(eq(emailTracking.id, trackingId));
      console.log(`[EmailTracking] ✅ Updated engagement for ${trackingId}`);
    }
  } catch (error) {
    console.error("[EmailTracking] ❌ Error updating engagement:", error);
  }
}

/**
 * Get email tracking stats for admin dashboard
 */
export async function getEmailTrackingStats(): Promise<{
  totalSent: number;
  byType: Record<string, number>;
  successRate: number;
  openRate: number;
  clickRate: number;
  conversionRate: number;
  last24h: number;
  last7d: number;
}> {
  try {
    // Aggregated in SQL: never load the whole email_tracking table in memory.
    const aggRes = await pool.query(`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE sendpulse_status = 'success')::int AS success_count,
        COUNT(*) FILTER (WHERE opened IS NOT NULL)::int AS open_count,
        COUNT(*) FILTER (WHERE clicked IS NOT NULL)::int AS click_count,
        COUNT(*) FILTER (WHERE converted IS NOT NULL)::int AS conversion_count,
        COUNT(*) FILTER (WHERE sent_at >= NOW() - INTERVAL '24 hours')::int AS count24h,
        COUNT(*) FILTER (WHERE sent_at >= NOW() - INTERVAL '7 days')::int AS count7d
        FROM email_tracking
    `);
    const byTypeRes = await pool.query(
      "SELECT email_type, COUNT(*)::int AS c FROM email_tracking GROUP BY email_type"
    );
    const row = aggRes.rows[0] || {};
    const byType: Record<string, number> = {};
    for (const r of byTypeRes.rows) byType[r.email_type] = Number(r.c);
    const total = Number(row.total || 0);
    const successCount = Number(row.success_count || 0);
    const openCount = Number(row.open_count || 0);
    const clickCount = Number(row.click_count || 0);
    const conversionCount = Number(row.conversion_count || 0);
    const count24h = Number(row.count24h || 0);
    const count7d = Number(row.count7d || 0);

    return {
      totalSent: total,
      byType,
      successRate: total > 0 ? (successCount / total) * 100 : 0,
      openRate: total > 0 ? (openCount / total) * 100 : 0,
      clickRate: total > 0 ? (clickCount / total) * 100 : 0,
      conversionRate: total > 0 ? (conversionCount / total) * 100 : 0,
      last24h: count24h,
      last7d: count7d,
    };
  } catch (error) {
    console.error("[EmailTracking] ❌ Error getting stats:", error);
    return {
      totalSent: 0,
      byType: {},
      successRate: 0,
      openRate: 0,
      clickRate: 0,
      conversionRate: 0,
      last24h: 0,
      last7d: 0,
    };
  }
}

/**
 * Get recent emails for admin dashboard
 */
export async function getRecentEmails(limit: number = 50): Promise<any[]> {
  try {
    const emails = await db
      .select()
      .from(emailTracking)
      .orderBy(desc(emailTracking.sentAt))
      .limit(limit);

    return emails;
  } catch (error) {
    console.error("[EmailTracking] ❌ Error getting recent emails:", error);
    return [];
  }
}

/**
 * Export email tracking data to CSV for Google Sheets
 * Extends existing googleSheetsTracking with email data
 */
export async function exportEmailTrackingCSV(): Promise<string> {
  try {
    const emails = await db.select().from(emailTracking).orderBy(desc(emailTracking.sentAt));

    const headers = [
      "ID",
      "Type",
      "Email",
      "Nom",
      "Audit ID",
      "Audit Type",
      "Subject",
      "Status",
      "Envoyé le",
      "Ouvert le",
      "Cliqué le",
      "Converti le",
    ];

    const csvRows = [headers.join(",")];

    for (const email of emails) {
      const row = [
        email.id.substring(0, 8),
        email.emailType,
        escapeCSV(email.recipientEmail),
        escapeCSV(email.recipientName || ""),
        (email.auditId || "").substring(0, 8),
        email.auditType || "",
        escapeCSV(email.subject || ""),
        email.sendpulseStatus || "pending",
        formatDate(email.sentAt),
        formatDate(email.opened),
        formatDate(email.clicked),
        formatDate(email.converted),
      ];
      csvRows.push(row.join(","));
    }

    return csvRows.join("\n");
  } catch (error) {
    console.error("[EmailTracking] ❌ Error exporting CSV:", error);
    return "";
  }
}

// Helper: Escape CSV field
function escapeCSV(field: string): string {
  if (!field) return "";
  if (field.includes(",") || field.includes('"') || field.includes("\n")) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}

// Helper: Format date
function formatDate(date: Date | null): string {
  if (!date) return "";
  return new Date(date).toLocaleString("fr-FR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Import missing functions
import { desc, eq } from "drizzle-orm";
