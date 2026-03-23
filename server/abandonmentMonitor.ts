/**
 * NEUROCORE 360 - Système de surveillance des relances d'abandons
 *
 * Surveille en temps réel :
 * - Ouvertures des emails
 * - Clics sur les liens
 * - Conversions (questionnaires complétés)
 * - Nouveaux abandons éligibles
 *
 * Envoie des alertes admin quand :
 * - Première ouverture détectée
 * - Conversion réussie
 * - Nouveaux abandons haute priorité
 */

import type { IStorage } from './storage';
import { sendCTAEmail, SENDER_EMAIL } from './emailService';

interface MonitoringSnapshot {
  timestamp: Date;
  sent24h: number;
  openRate: number;
  clickRate: number;
  conversions: number;
  pendingHighPriority: number;
  pendingMedium: number;
  revenue: number;
}

let lastSnapshot: MonitoringSnapshot | null = null;

/**
 * Vérifie l'état et envoie des alertes si nécessaire
 */
export async function checkAndAlert(storage: IStorage): Promise<void> {
  try {
    const stats = await storage.getAbandonmentStats(7);

    const currentSnapshot: MonitoringSnapshot = {
      timestamp: new Date(),
      sent24h: stats.last24h.sent,
      openRate: stats.last24h.openRate,
      clickRate: stats.last24h.clickRate,
      conversions: stats.last24h.conversions,
      pendingHighPriority: stats.pending.highPriority,
      pendingMedium: stats.pending.mediumPriority,
      revenue: stats.last7days.revenue,
    };

    // Si c'est le premier check, pas d'alerte
    if (!lastSnapshot) {
      lastSnapshot = currentSnapshot;
      console.log('[Monitor] Initialisation du monitoring');
      return;
    }

    const alerts: string[] = [];

    // 🎉 CONVERSION DÉTECTÉE
    if (currentSnapshot.conversions > lastSnapshot.conversions) {
      const newConversions = currentSnapshot.conversions - lastSnapshot.conversions;
      alerts.push(`🎉 ${newConversions} NOUVELLE(S) CONVERSION(S) !`);
    }

    // 📧 PREMIÈRE OUVERTURE
    if (lastSnapshot.openRate === 0 && currentSnapshot.openRate > 0) {
      alerts.push(`📧 Première ouverture détectée ! Taux: ${currentSnapshot.openRate}%`);
    }

    // 📈 AMÉLIORATION DU TAUX D'OUVERTURE
    if (currentSnapshot.openRate > lastSnapshot.openRate + 10) {
      alerts.push(`📈 Taux d'ouverture en hausse: ${lastSnapshot.openRate}% → ${currentSnapshot.openRate}%`);
    }

    // 🔥 NOUVEAUX ABANDONS HAUTE PRIORITÉ
    if (currentSnapshot.pendingHighPriority > lastSnapshot.pendingHighPriority) {
      const newHP = currentSnapshot.pendingHighPriority - lastSnapshot.pendingHighPriority;
      alerts.push(`🔥 ${newHP} nouveau(x) abandon(s) haute priorité (>75%) détecté(s)`);
    }

    // 💰 REVENUE GÉNÉRÉ
    if (currentSnapshot.revenue > lastSnapshot.revenue) {
      const newRevenue = currentSnapshot.revenue - lastSnapshot.revenue;
      alerts.push(`💰 Revenue généré: +${newRevenue}€ (total: ${currentSnapshot.revenue}€)`);
    }

    // Envoyer les alertes si nécessaire
    if (alerts.length > 0) {
      await sendAlertEmail(alerts, stats);
    }

    // Mettre à jour le snapshot
    lastSnapshot = currentSnapshot;

  } catch (error: any) {
    console.error('[Monitor] Erreur surveillance:', error.message);
  }
}

/**
 * Envoie un email d'alerte à l'admin
 */
async function sendAlertEmail(alerts: string[], stats: any): Promise<void> {
  const subject = `🔔 APEXLABS - Alerte relances abandons`;

  const message = `ALERTES DÉTECTÉES:

${alerts.map(a => `  ${a}`).join('\n')}

📊 STATS ACTUELLES:
  Relances 24h: ${stats.last24h.sent}
  Taux ouverture: ${stats.last24h.openRate}%
  Taux clic: ${stats.last24h.clickRate}%
  Conversions: ${stats.last24h.conversions}

⏳ ABANDONS EN ATTENTE:
  🔥 Haute priorité: ${stats.pending.highPriority}
  ⚡ Moyenne priorité: ${stats.pending.mediumPriority}
  ❄️ Dernière chance: ${stats.pending.lastChance}

💰 Revenue 7j: ${stats.last7days.revenue}€

Dashboard: https://apexlabs.achzodcoaching.com/admin`;

  try {
    await sendCTAEmail(SENDER_EMAIL, subject, message);
    console.log('[Monitor] ✅ Alerte admin envoyée');
  } catch (error: any) {
    console.error('[Monitor] ❌ Erreur envoi alerte:', error.message);
  }
}

/**
 * Génère un rapport complet de surveillance
 */
export async function generateMonitoringReport(storage: IStorage): Promise<string> {
  const stats = await storage.getAbandonmentStats(7);
  const now = new Date().toISOString();

  return `
📊 RAPPORT DE SURVEILLANCE - ${now}
${'='.repeat(60)}

🚀 DERNIÈRES 24H:
  Relances envoyées: ${stats.last24h.sent}
  Taux d'ouverture: ${stats.last24h.openRate}%
  Taux de clic: ${stats.last24h.clickRate}%
  Conversions: ${stats.last24h.conversions}

📈 DERNIERS 7 JOURS:
  Total relances: ${stats.last7days.sent}
  Taux d'ouverture moyen: ${stats.last7days.openRate}%
  Conversions totales: ${stats.last7days.conversions}
  Revenue généré: ${stats.last7days.revenue}€

⏳ ABANDONS EN ATTENTE:
  Total: ${stats.pending.count}
  🔥 Haute priorité (>75%): ${stats.pending.highPriority}
  ⚡ Moyenne priorité (25-75%): ${stats.pending.mediumPriority}
  ❄️ Dernière chance (<25% ou >48h): ${stats.pending.lastChance}

💡 RECOMMANDATIONS:
${stats.recommendations.map((r: string) => `  • ${r}`).join('\n')}

🎯 PROCHAINES ACTIONS:
${stats.pending.highPriority > 0 ? `  → Relancer ${stats.pending.highPriority} abandon(s) haute priorité en urgence` : ''}
${stats.last24h.openRate === 0 && stats.last24h.sent > 10 ? '  → Tester un nouveau sujet d\'email' : ''}
${stats.last24h.openRate > 0 && stats.last24h.conversions === 0 ? '  → Optimiser le message/CTA' : ''}
${stats.pending.count === 0 ? '  ✅ Aucun abandon à traiter pour le moment' : ''}
`;
}

/**
 * Vérifie si des nouvelles conversions ont eu lieu
 */
export async function checkNewConversions(storage: IStorage): Promise<{
  hasNew: boolean;
  count: number;
  emails: string[];
}> {
  // Récupérer les audits complétés dans les dernières 24h
  const allAudits = await storage.getAllAudits();
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const recentCompletions = allAudits.filter(audit => {
    if (!audit.completedAt) return false;
    const completedDate = new Date(audit.completedAt);
    return completedDate >= yesterday;
  });

  return {
    hasNew: recentCompletions.length > 0,
    count: recentCompletions.length,
    emails: recentCompletions.map(a => a.email),
  };
}

/**
 * Démarre la surveillance automatique (à appeler périodiquement)
 */
export async function startMonitoring(storage: IStorage, intervalMinutes: number = 30): Promise<void> {
  console.log(`[Monitor] 🎯 Démarrage surveillance (check toutes les ${intervalMinutes}min)`);

  // Premier check immédiat
  await checkAndAlert(storage);

  // Checks périodiques
  setInterval(async () => {
    console.log('[Monitor] 🔍 Check périodique...');
    await checkAndAlert(storage);
  }, intervalMinutes * 60 * 1000);
}
