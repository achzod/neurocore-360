/**
 * NEUROCORE 360 - Système automatisé de relances d'abandons
 *
 * Fonctionnalités :
 * - Détection intelligente des abandons (timing + progression)
 * - Segmentation par priorité
 * - Envoi automatique avec code RETOUR30
 * - Tracking et analytics
 * - Notifications admin quotidiennes
 */

import type { IStorage } from './storage';
import { sendCTAEmail, SENDER_EMAIL } from './emailService';

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
  segment: string
): { subject: string; html: string; text: string } {

  const subject = "Ton audit APEXLABS t'attend + Offre exclusive -30% !";

  const text = `Salut !

J'ai vu que tu avais commencé ton questionnaire APEXLABS mais que tu ne l'as pas terminé.

Tu en étais à ${percentComplete}% - plus que quelques questions et tu auras accès à ton analyse personnalisée complète !

🎁 Offre exclusive pour toi : -30% avec le code RETOUR30 sur les analyses Anabolic Bioscan, Ultimate Scan et Blood Analysis.

Ces analyses sont beaucoup plus précises et complètes que le Discovery Scan gratuit - tu obtiendras des protocoles personnalisés détaillés.

💡 Bonus : Le montant de ton analyse est 100% déduit si tu prends un coaching avec moi (sauf formule Starter).

Clique ici pour reprendre où tu en étais : https://apexlabs.achzodcoaching.com/audit-complet/questionnaire

À très vite,
Achzod`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <p>Salut !</p>

      <p>J'ai vu que tu avais commencé ton questionnaire <strong>APEXLABS</strong> mais que tu ne l'as pas terminé.</p>

      <p>Tu en étais à <strong>${percentComplete}%</strong> - plus que quelques questions et tu auras accès à ton analyse personnalisée complète !</p>

      <div style="background: #f0f7ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0; font-size: 18px;">🎁 <strong>Offre exclusive pour toi</strong></p>
        <p style="margin: 10px 0 0 0;">-30% avec le code <strong style="color: #0066cc; font-size: 20px;">RETOUR30</strong></p>
        <p style="margin: 5px 0 0 0; font-size: 14px;">sur les analyses Anabolic Bioscan, Ultimate Scan et Blood Analysis</p>
      </div>

      <p>Ces analyses sont beaucoup plus <strong>précises et complètes</strong> que le Discovery Scan gratuit - tu obtiendras des protocoles personnalisés détaillés.</p>

      <p>💡 <strong>Bonus</strong> : Le montant de ton analyse est <strong>100% déduit</strong> si tu prends un coaching avec moi (sauf formule Starter).</p>

      <div style="text-align: center; margin: 30px 0;">
        <a href="https://apexlabs.achzodcoaching.com/audit-complet/questionnaire"
           style="background: #0066cc; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
          Reprendre mon questionnaire
        </a>
      </div>

      <p>À très vite,<br><strong>Achzod</strong></p>
    </div>
  `;

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

      // Préparer l'email
      const emailTemplate = getReminderEmailTemplate(
        abandon.email,
        abandon.percentComplete,
        segment.name
      );

      // Envoyer l'email
      await sendCTAEmail(
        abandon.email,
        emailTemplate.subject,
        emailTemplate.text
      );

      // Logger dans la DB
      const priorityScore =
        segment.name === 'HIGH_PRIORITY' ? 100 :
        segment.name === 'MEDIUM_PRIORITY' ? 50 : 25;

      await storage.logAbandonmentReminder({
        email: abandon.email,
        percentComplete: abandon.percentComplete,
        hoursSinceStart: Math.round(abandon.hoursSinceStart),
        priorityScore,
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
        percentComplete: parseInt(q.percentComplete || '0'),
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
