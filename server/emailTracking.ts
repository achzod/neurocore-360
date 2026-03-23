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

import { db } from "./db";
import { emailTracking } from "../shared/drizzle-schema";
import { notifyGoogleSheetUpdate } from "./googleSheetsTracking";

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
  sendpulseStatus?: "success" | "failed" | "pending";
  sendpulseError?: string;
  metadata?: Record<string, any>;
}

/**
 * Log an email to the tracking system
 * Called after every email send attempt
 */
export async function logEmail(data: EmailTrackingData): Promise<string> {
  try {
    console.log(`[EmailTracking] Logging email: ${data.emailType} → ${data.recipientEmail}`);

    const result = await db.insert(emailTracking).values({
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
      createdAt: new Date(),
    }).returning({ id: emailTracking.id });

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
    const allEmails = await db.select().from(emailTracking);

    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const byType: Record<string, number> = {};
    let successCount = 0;
    let openCount = 0;
    let clickCount = 0;
    let conversionCount = 0;
    let count24h = 0;
    let count7d = 0;

    for (const email of allEmails) {
      byType[email.emailType] = (byType[email.emailType] || 0) + 1;

      if (email.sendpulseStatus === "success") successCount++;
      if (email.opened) openCount++;
      if (email.clicked) clickCount++;
      if (email.converted) conversionCount++;

      if (email.sentAt && email.sentAt >= last24h) count24h++;
      if (email.sentAt && email.sentAt >= last7d) count7d++;
    }

    const total = allEmails.length;

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
