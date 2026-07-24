/**
 * APEXLABS - Système automatisé de relances d'abandons
 *
 * Fonctionnalités :
 * - Détection intelligente des abandons (timing + progression)
 * - Segmentation par priorité
 * - Envoi automatique avec code RETOUR30
 * - Tracking et analytics
 * - Notifications admin quotidiennes
 */

import { randomBytes } from 'crypto';
import type { IStorage } from './storage';
import { sendCTAEmail, SENDER_EMAIL } from './emailService';

const APP_URL = process.env.APP_URL || process.env.RENDER_EXTERNAL_URL || 'https://apexlabs.achzodcoaching.com';

function genResumeToken(): string {
  // 32 bytes → 64 hex chars, fits the resume_token VARCHAR(64) column.
  return randomBytes(32).toString('hex');
}

export interface AbandonedQuestionnaire {
  email: string;
  percentComplete: number;
  hoursSinceStart: number;
  startedAt: Date;
  lastActivityAt: Date;
}

export interface ReminderSegment {
  name: string;
  priority: number;
  emails: AbandonedQuestionnaire[];
  description: string;
}

export interface ReminderStats {
  totalAbandoned: number;
  eligibleToSend: number;
  alreadyReminded: number;
  segmentedToSend: ReminderSegment[];
  sent: number;
  failed: number;
}

// SENDER_EMAIL imported from emailService is used as admin email
const MIN_HOURS_BEFORE_REMINDER = 6; // Ne pas relancer avant 6h
const MAX_HOURS_OPTIMAL = 48; // Fenêtre optimale jusqu'à 48h

/**
 * Segmente les abandons par priorité
 */
export function segmentAbandons(abandons: AbandonedQuestionnaire[]): ReminderSegment[] {
  // Filtrer : uniquement ceux qui sont éligibles (> 6h)
  const eligible = abandons.filter(a => a.hoursSinceStart >= MIN_HOURS_BEFORE_REMINDER);

  // Segment 1 : Haute priorité (>75% progression)
  const highPriority = eligible.filter(a => a.percentComplete >= 75);

  // Segment 2 : Priorité moyenne (25-75% progression, < 48h)
  const mediumPriority = eligible.filter(
    a => a.percentComplete >= 25 &&
         a.percentComplete < 75 &&
         a.hoursSinceStart <= MAX_HOURS_OPTIMAL
  );

  // Segment 3 : Dernière chance (>48h, ou faible progression mais dans fenêtre)
  const lastChance = eligible.filter(
    a => (a.hoursSinceStart > MAX_HOURS_OPTIMAL) ||
         (a.percentComplete < 25 && a.hoursSinceStart >= 24)
  );

  return [
    {
      name: 'HIGH_PRIORITY',
      priority: 1,
      emails: highPriority,
      description: 'Progression >75% - Très engagés, conversion probable'
    },
    {
      name: 'MEDIUM_PRIORITY',
      priority: 2,
      emails: mediumPriority,
      description: 'Progression 25-75% dans fenêtre optimale'
    },
    {
      name: 'LAST_CHANCE',
      priority: 3,
      emails: lastChance,
      description: 'Dernière chance (>48h ou faible engagement)'
    }
  ].filter(segment => segment.emails.length > 0);
}

/**
 * Template d'email de relance avec code RETOUR30
 */
function getReminderEmailTemplate(
  email: string,
  percentComplete: number,
  segment: string,
  resumeToken: string,
): { subject: string; html: string; text: string } {

  // P3 brand-aligned rewrite: no spammy promo in the subject, no off-brand
  // blue, focused single CTA on the resume link with the magic token. The
  // 30% discount block is removed ,  finishing the FREE audit is the carrot,
  // not a paid product upsell on a user who hasn't even validated interest
  // yet.
  const resumeUrl = `${APP_URL}/audit-complet/questionnaire?resume=${resumeToken}`;
  const remaining = Math.max(0, 100 - percentComplete);

  const subject = `Ton audit s'arrête à ${percentComplete}% ,  reprends en un clic`;

  const text = `Salut,

Tu as commencé ton audit APEXLABS hier ,  il te reste ${remaining}% à remplir.

Quand tu cliques sur le lien, tu reprends exactement où tu t'étais arrêté, peu importe l'appareil :

${resumeUrl}

Ce que tu débloques en finissant : un rapport personnalisé sur ton profil métabolique, hormonal et de récupération. Gratuit. Pas de carte bancaire.

Achzod`;

  const html = `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><title>Ton audit s'arrête à ${percentComplete}%</title></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;">
    <tr><td align="center" style="padding:40px 16px;">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#0f0f0f;border:1px solid rgba(252,221,0,0.18);border-radius:14px;overflow:hidden;">
        <tr><td style="padding:32px 36px 8px;">
          <div style="font-family:'JetBrains Mono',Menlo,monospace;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#FCDD00;font-weight:700;">APEXLABS · AUDIT INTERROMPU</div>
        </td></tr>
        <tr><td style="padding:18px 36px 8px;">
          <h1 style="margin:0;color:#fff;font-size:28px;line-height:1.18;letter-spacing:-0.022em;font-weight:700;">
            Tu t'es arrêté à <span style="color:#FCDD00;">${percentComplete}%</span>.
          </h1>
        </td></tr>
        <tr><td style="padding:14px 36px 0;">
          <p style="margin:0;color:rgba(255,255,255,0.78);font-size:16px;line-height:1.6;">
            Ton questionnaire est sauvegardé. Quand tu cliques ci-dessous, tu reprends exactement où tu en étais ,  peu importe l'appareil. Il te reste <strong style="color:#fff;">${remaining}%</strong> à remplir.
          </p>
        </td></tr>
        <tr><td align="center" style="padding:32px 36px 12px;">
          <a href="${resumeUrl}" style="display:inline-block;background:#FCDD00;color:#0a0a0a;padding:16px 32px;border-radius:999px;text-decoration:none;font-weight:700;font-size:14px;letter-spacing:0.06em;text-transform:uppercase;">
            Reprendre où je m'étais arrêté →
          </a>
        </td></tr>
        <tr><td style="padding:24px 36px 0;">
          <div style="border-top:1px solid rgba(255,255,255,0.10);padding-top:18px;">
            <p style="margin:0;color:rgba(255,255,255,0.55);font-size:13px;line-height:1.55;">
              <strong style="color:rgba(255,255,255,0.85);">Ce que tu débloques en finissant :</strong> ton rapport personnalisé sur ton profil métabolique, hormonal et de récupération. Gratuit. Pas de carte bancaire demandée.
            </p>
          </div>
        </td></tr>
        <tr><td style="padding:24px 36px 32px;">
          <p style="margin:0;color:rgba(255,255,255,0.42);font-size:11px;font-family:'JetBrains Mono',Menlo,monospace;letter-spacing:0.06em;">
            Achzod · APEXLABS
          </p>
        </td></tr>
      </table>
      <p style="margin:24px 0 0;color:rgba(255,255,255,0.30);font-size:11px;font-family:'JetBrains Mono',Menlo,monospace;letter-spacing:0.05em;">
        Si tu ne souhaites plus recevoir ces rappels, ignore ce mail.
      </p>
    </td></tr>
  </table>
  <!-- P4: first-party open-tracking pixel -->
  <img src="${APP_URL}/api/track/email-open?t=${resumeToken}" width="1" height="1" alt="" style="display:block;width:1px;height:1px;border:0;opacity:0;" />
</body>
</html>`;

  return { subject, html, text };
}

/**
 * Envoie les relances pour un segment donné
 */
export async function sendReminderSegment(
  segment: ReminderSegment,
  storage: IStorage,
  dryRun: boolean = false
): Promise<{ sent: number; failed: number; errors: string[] }> {

  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  console.log(`\n[AbandonmentReminder] Traitement segment ${segment.name} (${segment.emails.length} emails)`);

  for (const abandon of segment.emails) {
    try {
      // Vérifier si déjà relancé dans les dernières 24h
      const alreadyReminded = await storage.hasRecentReminder(abandon.email, 24);
      if (alreadyReminded) {
        console.log(`[AbandonmentReminder] ⏭️  ${abandon.email} - déjà relancé récemment`);
        continue;
      }

      if (dryRun) {
        console.log(`[AbandonmentReminder] [DRY RUN] Envoi à ${abandon.email} (${abandon.percentComplete}%)`);
        sent++;
        continue;
      }

      // Generate a unique resume token per send so each email link is
      // single-use-trackable (clicked_at = first click on this token).
      const resumeToken = genResumeToken();

      const emailTemplate = getReminderEmailTemplate(
        abandon.email,
        abandon.percentComplete,
        segment.name,
        resumeToken,
      );

      // Send the HTML email (sendCTAEmail signature: to, subject, body, html?)
      await sendCTAEmail(
        abandon.email,
        emailTemplate.subject,
        emailTemplate.text,
        emailTemplate.html,
      );

      const priorityScore =
        segment.name === 'HIGH_PRIORITY' ? 100 :
        segment.name === 'MEDIUM_PRIORITY' ? 50 : 25;

      await storage.logAbandonmentReminder({
        email: abandon.email,
        percentComplete: abandon.percentComplete,
        hoursSinceStart: Math.round(abandon.hoursSinceStart),
        priorityScore,
        resumeToken,
      });

      sent++;
      console.log(`[AbandonmentReminder] ✅ ${abandon.email} (${abandon.percentComplete}%) - envoyé`);

      // Petit délai pour éviter le spam
      await new Promise(resolve => setTimeout(resolve, 500));

    } catch (error: any) {
      failed++;
      const errorMsg = `${abandon.email}: ${error.message}`;
      errors.push(errorMsg);
      console.error(`[AbandonmentReminder] ❌ Erreur pour ${abandon.email}:`, error.message);
    }
  }

  return { sent, failed, errors };
}

/**
 * Fonction principale : envoie automatiquement les relances
 */
export async function autoSendAbandonmentReminders(
  storage: IStorage,
  options: {
    dryRun?: boolean;
    maxToSend?: number;
    notifyAdmin?: boolean;
  } = {}
): Promise<ReminderStats> {

  const { dryRun = false, maxToSend = 50, notifyAdmin = true } = options;

  console.log('\n=== DÉBUT AUTO-SEND ABANDONMENT REMINDERS ===');
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'PRODUCTION'}`);
  console.log(`Max à envoyer: ${maxToSend}`);

  // 1. Récupérer tous les questionnaires incomplets
  const incompleteQuestionnaires = await storage.getIncompleteQuestionnaires();
  console.log(`[AbandonmentReminder] ${incompleteQuestionnaires.length} questionnaires incomplets`);

  // 2. Filtrer : lancement >= 17 mars 2026
  const launchDate = new Date('2026-03-17T00:00:00Z');
  const realAbandons = incompleteQuestionnaires
    .filter(q => new Date(q.startedAt) >= launchDate)
    .map(q => {
      const now = new Date();
      const startedAt = new Date(q.startedAt);
      const hoursSinceStart = (now.getTime() - startedAt.getTime()) / (1000 * 60 * 60);

      return {
        email: q.email,
        percentComplete: parseInt(String(q.percentComplete ?? '0')),
        hoursSinceStart,
        startedAt,
        lastActivityAt: new Date(q.lastActivityAt || q.startedAt),
      };
    });

  console.log(`[AbandonmentReminder] ${realAbandons.length} abandons réels (post-lancement)`);

  // 3. Segmenter par priorité
  const segments = segmentAbandons(realAbandons);

  console.log('\n[AbandonmentReminder] Segmentation:');
  segments.forEach(seg => {
    console.log(`  ${seg.name}: ${seg.emails.length} (${seg.description})`);
  });

  const eligibleToSend = segments.reduce((sum, seg) => sum + seg.emails.length, 0);

  // 4. Envoyer par segment, dans l'ordre de priorité
  let totalSent = 0;
  let totalFailed = 0;
  const allErrors: string[] = [];

  for (const segment of segments) {
    if (totalSent >= maxToSend) {
      console.log(`[AbandonmentReminder] Limite atteinte (${maxToSend}), arrêt`);
      break;
    }

    const remainingQuota = maxToSend - totalSent;
    const toSend = segment.emails.slice(0, remainingQuota);

    const segmentToProcess: ReminderSegment = {
      ...segment,
      emails: toSend,
    };

    const result = await sendReminderSegment(segmentToProcess, storage, dryRun);

    totalSent += result.sent;
    totalFailed += result.failed;
    allErrors.push(...result.errors);
  }

  const stats: ReminderStats = {
    totalAbandoned: realAbandons.length,
    eligibleToSend,
    alreadyReminded: 0, // TODO: calculer
    segmentedToSend: segments,
    sent: totalSent,
    failed: totalFailed,
  };

  console.log('\n[AbandonmentReminder] RÉSUMÉ:');
  console.log(`  Total abandons: ${stats.totalAbandoned}`);
  console.log(`  Éligibles: ${stats.eligibleToSend}`);
  console.log(`  Envoyés: ${stats.sent}`);
  console.log(`  Échecs: ${stats.failed}`);

  // 5. Notifier l'admin
  if (notifyAdmin && !dryRun && totalSent > 0) {
    await sendAdminNotification(stats, allErrors);
  }

  console.log('=== FIN AUTO-SEND ABANDONMENT REMINDERS ===\n');

  return stats;
}

/**
 * Envoie une notification admin avec le résumé
 */
async function sendAdminNotification(stats: ReminderStats, errors: string[]): Promise<void> {
  try {
    const subject = `📊 Relances abandons APEXLABS - ${stats.sent} envoyés`;

    const segmentDetails = stats.segmentedToSend
      .map(seg => `  - ${seg.name}: ${seg.emails.length} emails (${seg.description})`)
      .join('\n');

    const errorDetails = errors.length > 0
      ? `\n⚠️ ERREURS (${errors.length}):\n${errors.slice(0, 5).map(e => `  - ${e}`).join('\n')}`
      : '';

    const text = `Rapport automatique d'envoi des relances d'abandons APEXLABS

📊 STATISTIQUES:
  Total abandons détectés: ${stats.totalAbandoned}
  Éligibles à relancer: ${stats.eligibleToSend}
  Envoyés: ${stats.sent}
  Échecs: ${stats.failed}

🎯 SEGMENTATION:
${segmentDetails}
${errorDetails}

Code promo utilisé: RETOUR30 (-30%)
Fenêtre de relance: 6-48h optimal

---
Envoyé automatiquement par le système de relances APEXLABS`;

    await sendCTAEmail(SENDER_EMAIL, subject, text);

    console.log('[AbandonmentReminder] ✅ Notification admin envoyée');
  } catch (error: any) {
    console.error('[AbandonmentReminder] ❌ Erreur notification admin:', error.message);
  }
}

/**
 * Génère un rapport quotidien des performances
 */
export async function sendDailyReport(storage: IStorage): Promise<void> {
  try {
    console.log('[AbandonmentReminder] Génération du rapport quotidien...');

    const stats = await storage.getAbandonmentStats(7); // 7 derniers jours

    const subject = `📈 Rapport quotidien APEXLABS - Relances & Conversions`;

    const text = `Rapport quotidien APEXLABS

📊 DERNIÈRES 24H:
  Relances envoyées: ${stats.last24h.sent}
  Taux d'ouverture: ${stats.last24h.openRate}%
  Taux de clic: ${stats.last24h.clickRate}%
  Conversions: ${stats.last24h.conversions}

📈 DERNIERS 7 JOURS:
  Total relances: ${stats.last7days.sent}
  Taux d'ouverture moyen: ${stats.last7days.openRate}%
  Conversions totales: ${stats.last7days.conversions}
  Revenue généré: ${stats.last7days.revenue}€

🎯 ABANDONS ACTUELS:
  En attente de relance: ${stats.pending.count}
  - Haute priorité (>75%): ${stats.pending.highPriority}
  - Moyenne priorité (25-75%): ${stats.pending.mediumPriority}
  - Dernière chance: ${stats.pending.lastChance}

💡 RECOMMANDATIONS:
${stats.recommendations.join('\n')}

---
Envoyé automatiquement chaque jour à 10h`;

    await sendCTAEmail(SENDER_EMAIL, subject, text);

    console.log('[AbandonmentReminder] ✅ Rapport quotidien envoyé');
  } catch (error: any) {
    console.error('[AbandonmentReminder] ❌ Erreur rapport quotidien:', error.message);
  }
}
