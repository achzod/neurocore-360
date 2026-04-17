/**
 * Rapports automatiques par email toutes les 6h
 *
 * Envoie un rapport détaillé à coaching@achzodcoaching.com:
 * - Stats globales (audits, revenus, statuts)
 * - Nouveaux audits depuis dernier rapport
 * - Alertes (NEEDS_REVIEW, FAILED, stuck)
 * - Prochaines livraisons
 * - Santé du système
 */

import { storage } from "./storage";
import { getAccessToken, COLORS, SENDER_NAME, SENDER_EMAIL } from "./emailService";
import { log } from "./index";

interface ReportStats {
  totalAudits: number;
  newAuditsLast6h: number;
  byStatus: Record<string, number>;
  byType: Record<string, number>;
  alerts: {
    needsReview: number;
    failed: number;
    generatingStuck: number;
  };
  scheduledToday: number;
  scheduledTomorrow: number;
  sentLast6h: number;
  revenue: {
    totalCents: number;
    last24hCents: number;
  };
  healthStatus: "GOOD" | "WARNING" | "CRITICAL";
}

let lastReportTime: Date | null = null;

/**
 * Génère et envoie le rapport automatique
 */
export async function sendAutomaticReport(): Promise<boolean> {
  try {
    log("Generating automatic 6h report...", "reports");

    const stats = await gatherStats();
    const htmlContent = generateReportHTML(stats);
    const textContent = generateReportText(stats);

    const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || "coaching@achzodcoaching.com";
    const token = await getAccessToken();

    const subject = getSubjectLine(stats);

    const response = await fetch("https://api.sendpulse.com/smtp/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        email: {
          html: Buffer.from(htmlContent).toString("base64"),
          text: textContent,
          subject,
          from: {
            name: SENDER_NAME,
            email: SENDER_EMAIL,
          },
          to: [{ email: adminEmail }],
        },
      }),
    });

    const result = (await response.json()) as { result: boolean };

    if (result.result === true) {
      lastReportTime = new Date();
      log(`Automatic report sent successfully to ${adminEmail}`, "reports");
      return true;
    } else {
      console.error("[Reports] Failed to send automatic report:", result);
      return false;
    }
  } catch (error) {
    console.error("[Reports] Error sending automatic report:", error);
    return false;
  }
}

/**
 * Collecte toutes les stats nécessaires
 */
async function gatherStats(): Promise<ReportStats> {
  const { db, pool } = await import("./db.js");
  const schema = await import("../shared/drizzle-schema.js");
  // `orders` is not defined in drizzle-schema.ts — storage.ts manages the
  // orders table via raw SQL. Guard against the undefined import (used to
  // throw "Cannot read properties of undefined (reading 'Symbol(drizzle:Columns)')").
  const audits = (schema as any).audits;
  if (!audits) throw new Error("[Reports] drizzle schema missing: audits");

  const now = new Date();
  const sixHoursAgo = new Date(now.getTime() - 6 * 60 * 60 * 1000);
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const dayAfterTomorrow = new Date(now.getTime() + 48 * 60 * 60 * 1000);

  // Tous les audits
  const allAudits = await db.select().from(audits);

  // Nouveaux audits (6 dernières heures)
  const newAudits = allAudits.filter(
    (a) => new Date(a.createdAt) >= sixHoursAgo
  );

  // Par statut
  const byStatus: Record<string, number> = {};
  allAudits.forEach((a) => {
    const status = a.reportDeliveryStatus || "UNKNOWN";
    byStatus[status] = (byStatus[status] || 0) + 1;
  });

  // Par type
  const byType: Record<string, number> = {};
  allAudits.forEach((a) => {
    byType[a.type] = (byType[a.type] || 0) + 1;
  });

  // Alertes
  const needsReview = byStatus["NEEDS_REVIEW"] || 0;
  const failed = byStatus["FAILED"] || 0;
  const generatingStuck = allAudits.filter(
    (a) =>
      a.reportDeliveryStatus === "GENERATING" &&
      new Date(a.createdAt) < twoHoursAgo
  ).length;

  // Livraisons programmées
  const scheduledToday = allAudits.filter(
    (a) =>
      a.reportDeliveryStatus === "SCHEDULED" &&
      a.reportScheduledFor &&
      new Date(a.reportScheduledFor) >= now &&
      new Date(a.reportScheduledFor) < tomorrow
  ).length;

  const scheduledTomorrow = allAudits.filter(
    (a) =>
      a.reportDeliveryStatus === "SCHEDULED" &&
      a.reportScheduledFor &&
      new Date(a.reportScheduledFor) >= tomorrow &&
      new Date(a.reportScheduledFor) < dayAfterTomorrow
  ).length;

  // Envois récents (6h)
  const sentLast6h = allAudits.filter(
    (a) =>
      a.reportDeliveryStatus === "SENT" &&
      a.reportSentAt &&
      new Date(a.reportSentAt) >= sixHoursAgo
  ).length;

  // Revenus — orders table managed by raw SQL in storage.ts (no drizzle model),
  // so query directly via pg pool. Filter in SQL to avoid loading every row's
  // metadata blob into Node.
  let totalCents = 0;
  let last24hCents = 0;
  try {
    const totalRes = await pool.query(
      "SELECT COALESCE(SUM(final_amount_cents), 0)::bigint AS total FROM orders WHERE status = 'paid'"
    );
    totalCents = Number(totalRes.rows[0]?.total ?? 0);
    const last24Res = await pool.query(
      "SELECT COALESCE(SUM(final_amount_cents), 0)::bigint AS total FROM orders WHERE status = 'paid' AND created_at >= $1",
      [twentyFourHoursAgo]
    );
    last24hCents = Number(last24Res.rows[0]?.total ?? 0);
  } catch (err) {
    console.error("[Reports] Revenue query failed (non-fatal):", err);
  }

  // Santé du système
  let healthStatus: "GOOD" | "WARNING" | "CRITICAL" = "GOOD";
  if (failed > 0 || generatingStuck > 3) {
    healthStatus = "CRITICAL";
  } else if (needsReview > 0 || generatingStuck > 0) {
    healthStatus = "WARNING";
  }

  return {
    totalAudits: allAudits.length,
    newAuditsLast6h: newAudits.length,
    byStatus,
    byType,
    alerts: {
      needsReview,
      failed,
      generatingStuck,
    },
    scheduledToday,
    scheduledTomorrow,
    sentLast6h,
    revenue: {
      totalCents,
      last24hCents,
    },
    healthStatus,
  };
}

/**
 * Génère le sujet de l'email en fonction de la santé
 */
function getSubjectLine(stats: ReportStats): string {
  const emoji =
    stats.healthStatus === "CRITICAL"
      ? "🚨"
      : stats.healthStatus === "WARNING"
      ? "⚠️"
      : "✅";

  const time = new Date().toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  if (stats.healthStatus === "CRITICAL") {
    return `${emoji} [URGENT] Rapport APEXLABS ${time} - ${stats.alerts.failed} FAILED`;
  } else if (stats.healthStatus === "WARNING") {
    return `${emoji} Rapport APEXLABS ${time} - Action requise`;
  } else {
    return `${emoji} Rapport APEXLABS ${time} - Tout opérationnel`;
  }
}

/**
 * Génère le HTML du rapport
 */
function generateReportHTML(stats: ReportStats): string {
  const healthColor =
    stats.healthStatus === "CRITICAL"
      ? "#DC2626"
      : stats.healthStatus === "WARNING"
      ? "#F59E0B"
      : "#10B981";

  const healthLabel =
    stats.healthStatus === "CRITICAL"
      ? "CRITIQUE"
      : stats.healthStatus === "WARNING"
      ? "ATTENTION"
      : "OPÉRATIONNEL";

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Rapport APEXLABS</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0A0A0A; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">

    <!-- Header -->
    <div style="text-align: center; margin-bottom: 40px;">
      <h1 style="color: ${COLORS.primary}; margin: 0 0 8px; font-size: 28px; font-weight: 900; letter-spacing: -0.5px;">
        APEXLABS
      </h1>
      <p style="color: ${COLORS.textMuted}; margin: 0; font-size: 14px;">
        Rapport automatique - ${new Date().toLocaleString("fr-FR", {
          dateStyle: "full",
          timeStyle: "short",
        })}
      </p>
    </div>

    <!-- Status Badge -->
    <div style="background: ${healthColor}; color: white; padding: 16px; border-radius: 8px; text-align: center; margin-bottom: 32px;">
      <div style="font-size: 20px; font-weight: 700; margin-bottom: 4px;">
        ${healthLabel}
      </div>
      <div style="font-size: 14px; opacity: 0.9;">
        ${
          stats.healthStatus === "GOOD"
            ? "Système opérationnel"
            : stats.healthStatus === "WARNING"
            ? "Action recommandée"
            : "Intervention requise immédiatement"
        }
      </div>
    </div>

    ${generateAlertsHTML(stats)}
    ${generateStatsHTML(stats)}
    ${generateScheduleHTML(stats)}
    ${generateRevenueHTML(stats)}

    <!-- Footer -->
    <div style="margin-top: 40px; padding-top: 24px; border-top: 1px solid ${
      COLORS.border
    }; text-align: center;">
      <a href="https://apexlabs.achzodcoaching.com/admin" style="display: inline-block; background: ${
        COLORS.primary
      }; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 14px;">
        Accéder au Dashboard Admin
      </a>
      <p style="color: ${
        COLORS.textMuted
      }; font-size: 12px; margin: 16px 0 0;">
        Rapport automatique généré toutes les 6 heures
      </p>
    </div>
  </div>
</body>
</html>
`;
}

/**
 * Section Alertes
 */
function generateAlertsHTML(stats: ReportStats): string {
  const hasAlerts =
    stats.alerts.needsReview > 0 ||
    stats.alerts.failed > 0 ||
    stats.alerts.generatingStuck > 0;

  if (!hasAlerts) {
    return `
    <div style="background: #10B98120; border: 1px solid #10B981; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
      <div style="color: #10B981; font-weight: 600; margin-bottom: 4px;">✅ Aucune alerte</div>
      <div style="color: #6EE7B7; font-size: 14px;">Tous les rapports sont générés correctement</div>
    </div>
    `;
  }

  return `
    <div style="background: #DC262620; border: 1px solid #DC2626; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
      <div style="color: #DC2626; font-weight: 700; font-size: 16px; margin-bottom: 12px;">🚨 Alertes</div>
      ${
        stats.alerts.failed > 0
          ? `<div style="color: #FCA5A5; font-size: 14px; margin-bottom: 8px;">❌ ${stats.alerts.failed} rapport(s) FAILED (échec définitif)</div>`
          : ""
      }
      ${
        stats.alerts.needsReview > 0
          ? `<div style="color: #FBBF24; font-size: 14px; margin-bottom: 8px;">⚠️ ${stats.alerts.needsReview} rapport(s) en NEEDS_REVIEW (validation échouée)</div>`
          : ""
      }
      ${
        stats.alerts.generatingStuck > 0
          ? `<div style="color: #FBBF24; font-size: 14px;">⏳ ${stats.alerts.generatingStuck} rapport(s) en GENERATING depuis > 2h</div>`
          : ""
      }
    </div>
  `;
}

/**
 * Section Stats
 */
function generateStatsHTML(stats: ReportStats): string {
  return `
    <div style="background: ${COLORS.background}; border: 1px solid ${COLORS.border}; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
      <h2 style="color: ${COLORS.text}; margin: 0 0 16px; font-size: 18px; font-weight: 700;">📊 Statistiques</h2>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
        <div>
          <div style="color: ${COLORS.textMuted}; font-size: 12px; margin-bottom: 4px;">Total audits</div>
          <div style="color: ${COLORS.primary}; font-size: 24px; font-weight: 700;">${stats.totalAudits}</div>
        </div>
        <div>
          <div style="color: ${COLORS.textMuted}; font-size: 12px; margin-bottom: 4px;">Nouveaux (6h)</div>
          <div style="color: ${COLORS.primary}; font-size: 24px; font-weight: 700;">${stats.newAuditsLast6h}</div>
        </div>
      </div>

      <div style="border-top: 1px solid ${COLORS.border}; padding-top: 16px;">
        <div style="color: ${COLORS.textMuted}; font-size: 12px; margin-bottom: 8px;">Par statut:</div>
        ${Object.entries(stats.byStatus)
          .map(
            ([status, count]) => `
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span style="color: ${COLORS.text}; font-size: 14px;">${status}</span>
            <span style="color: ${COLORS.primary}; font-weight: 600; font-size: 14px;">${count}</span>
          </div>
        `
          )
          .join("")}
      </div>

      <div style="border-top: 1px solid ${COLORS.border}; padding-top: 16px; margin-top: 16px;">
        <div style="color: ${COLORS.textMuted}; font-size: 12px; margin-bottom: 8px;">Par type:</div>
        ${Object.entries(stats.byType)
          .map(
            ([type, count]) => `
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span style="color: ${COLORS.text}; font-size: 14px;">${type}</span>
            <span style="color: ${COLORS.primary}; font-weight: 600; font-size: 14px;">${count}</span>
          </div>
        `
          )
          .join("")}
      </div>
    </div>
  `;
}

/**
 * Section Livraisons programmées
 */
function generateScheduleHTML(stats: ReportStats): string {
  return `
    <div style="background: ${COLORS.background}; border: 1px solid ${COLORS.border}; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
      <h2 style="color: ${COLORS.text}; margin: 0 0 16px; font-size: 18px; font-weight: 700;">📅 Livraisons programmées</h2>

      <div style="margin-bottom: 12px;">
        <div style="color: ${COLORS.textMuted}; font-size: 12px; margin-bottom: 4px;">Aujourd'hui</div>
        <div style="color: ${COLORS.primary}; font-size: 20px; font-weight: 700;">${stats.scheduledToday} rapport(s)</div>
      </div>

      <div style="margin-bottom: 12px;">
        <div style="color: ${COLORS.textMuted}; font-size: 12px; margin-bottom: 4px;">Demain</div>
        <div style="color: ${COLORS.primary}; font-size: 20px; font-weight: 700;">${stats.scheduledTomorrow} rapport(s)</div>
      </div>

      <div style="border-top: 1px solid ${COLORS.border}; padding-top: 12px; margin-top: 12px;">
        <div style="color: ${COLORS.textMuted}; font-size: 12px; margin-bottom: 4px;">Envoyés (6 dernières heures)</div>
        <div style="color: #10B981; font-size: 20px; font-weight: 700;">${stats.sentLast6h} rapport(s)</div>
      </div>
    </div>
  `;
}

/**
 * Section Revenus
 */
function generateRevenueHTML(stats: ReportStats): string {
  const totalEuros = (stats.revenue.totalCents / 100).toFixed(2);
  const last24hEuros = (stats.revenue.last24hCents / 100).toFixed(2);

  return `
    <div style="background: ${COLORS.background}; border: 1px solid ${COLORS.border}; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
      <h2 style="color: ${COLORS.text}; margin: 0 0 16px; font-size: 18px; font-weight: 700;">💰 Revenus</h2>

      <div style="margin-bottom: 12px;">
        <div style="color: ${COLORS.textMuted}; font-size: 12px; margin-bottom: 4px;">Total</div>
        <div style="color: ${COLORS.primary}; font-size: 24px; font-weight: 700;">${totalEuros}€</div>
      </div>

      <div>
        <div style="color: ${COLORS.textMuted}; font-size: 12px; margin-bottom: 4px;">Dernières 24h</div>
        <div style="color: #10B981; font-size: 20px; font-weight: 700;">${last24hEuros}€</div>
      </div>
    </div>
  `;
}

/**
 * Version texte du rapport (pour clients email texte)
 */
function generateReportText(stats: ReportStats): string {
  return `
APEXLABS - Rapport automatique
${new Date().toLocaleString("fr-FR")}

SANTÉ DU SYSTÈME: ${
    stats.healthStatus === "GOOD"
      ? "OPÉRATIONNEL"
      : stats.healthStatus === "WARNING"
      ? "ATTENTION"
      : "CRITIQUE"
  }

${
  stats.alerts.failed > 0 ||
  stats.alerts.needsReview > 0 ||
  stats.alerts.generatingStuck > 0
    ? `
ALERTES:
${stats.alerts.failed > 0 ? `- ${stats.alerts.failed} rapport(s) FAILED\n` : ""}${
        stats.alerts.needsReview > 0
          ? `- ${stats.alerts.needsReview} rapport(s) NEEDS_REVIEW\n`
          : ""
      }${
        stats.alerts.generatingStuck > 0
          ? `- ${stats.alerts.generatingStuck} rapport(s) bloqués en GENERATING\n`
          : ""
      }
`
    : "Aucune alerte\n"
}

STATISTIQUES:
- Total audits: ${stats.totalAudits}
- Nouveaux (6h): ${stats.newAuditsLast6h}

Par statut:
${Object.entries(stats.byStatus)
  .map(([status, count]) => `- ${status}: ${count}`)
  .join("\n")}

LIVRAISONS:
- Aujourd'hui: ${stats.scheduledToday}
- Demain: ${stats.scheduledTomorrow}
- Envoyés (6h): ${stats.sentLast6h}

REVENUS:
- Total: ${(stats.revenue.totalCents / 100).toFixed(2)}€
- 24h: ${(stats.revenue.last24hCents / 100).toFixed(2)}€

---
Dashboard admin: https://apexlabs.achzodcoaching.com/admin
`;
}

/**
 * Endpoint manuel pour tester
 */
export async function sendManualReport(): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    const success = await sendAutomaticReport();
    return {
      success,
      message: success
        ? "Rapport envoyé avec succès"
        : "Échec de l'envoi du rapport",
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
