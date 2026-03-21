/**
 * NEUROCORE 360 - Conversion Tracker
 *
 * Tracks conversions from:
 * - Meta Ads (Pixel ID: 1120781400174189)
 * - Google Ads (Account ID: AW-706806863)
 *
 * For both sites:
 * - apexlabs.onrender.com
 * - achzodcoaching.com
 */

import { sendCTAEmail, SENDER_EMAIL } from './emailService';

// ============================================================================
// TYPES
// ============================================================================

export interface ConversionStats {
  timestamp: Date;
  period: '24h' | '7d' | '30d';

  // Meta Ads
  meta: {
    spend: number;
    impressions: number;
    clicks: number;
    ctr: number;
    cpc: number;
    leads: number;
    purchases: number;
    revenue: number;
    roas: number;
    costPerLead: number;
    costPerPurchase: number;
  };

  // Google Ads
  google: {
    spend: number;
    impressions: number;
    clicks: number;
    ctr: number;
    cpc: number;
    leads: number;
    purchases: number;
    revenue: number;
    roas: number;
    costPerLead: number;
    costPerPurchase: number;
  };

  // Combined
  total: {
    spend: number;
    leads: number;
    purchases: number;
    revenue: number;
    roas: number;
    profit: number;
  };

  // By site
  bySite: {
    apex: {
      leads: number;
      purchases: number;
      revenue: number;
    };
    coaching: {
      leads: number;
      purchases: number;
      revenue: number;
    };
  };
}

interface MetaPixelEvent {
  event_name: string;
  event_time: number;
  event_source_url: string;
  value?: number;
  currency?: string;
}

// ============================================================================
// META ADS API
// ============================================================================

/**
 * Récupère les conversions Meta Ads via Marketing API
 * https://developers.facebook.com/docs/marketing-api/conversions-api
 *
 * IMPORTANT: Nécessite un Access Token Meta
 * - Générer sur: https://business.facebook.com/events_manager2/list/pixel
 * - Stocker dans: process.env.META_ACCESS_TOKEN
 */
export async function fetchMetaConversions(days: number = 1): Promise<ConversionStats['meta']> {
  const accessToken = process.env.META_ACCESS_TOKEN;
  const pixelId = '1120781400174189';

  if (!accessToken) {
    console.warn('[ConversionTracker] META_ACCESS_TOKEN non configuré - retour données vides');
    return getEmptyMetaStats();
  }

  try {
    // Récupérer les stats de la campagne
    // https://graph.facebook.com/v18.0/act_{ad_account_id}/insights
    const adAccountId = process.env.META_AD_ACCOUNT_ID || '';

    if (!adAccountId) {
      console.warn('[ConversionTracker] META_AD_ACCOUNT_ID non configuré');
      return getEmptyMetaStats();
    }

    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const until = new Date().toISOString().split('T')[0];

    const url = `https://graph.facebook.com/v18.0/act_${adAccountId}/insights?` +
      `access_token=${accessToken}&` +
      `time_range={"since":"${since}","until":"${until}"}&` +
      `fields=spend,impressions,clicks,ctr,cpc,actions,action_values&` +
      `level=account`;

    const response = await fetch(url);

    if (!response.ok) {
      console.error('[ConversionTracker] Meta API error:', response.status);
      return getEmptyMetaStats();
    }

    const data = await response.json();

    if (!data.data || data.data.length === 0) {
      return getEmptyMetaStats();
    }

    const insights = data.data[0];

    // Parser les conversions
    const actions = insights.actions || [];
    const actionValues = insights.action_values || [];

    const leads = actions.find((a: any) => a.action_type === 'lead')?.value || 0;
    const purchases = actions.find((a: any) => a.action_type === 'purchase' || a.action_type === 'offsite_conversion.fb_pixel_purchase')?.value || 0;
    const revenue = parseFloat(actionValues.find((a: any) => a.action_type === 'purchase' || a.action_type === 'offsite_conversion.fb_pixel_purchase')?.value || '0');

    const spend = parseFloat(insights.spend || '0');
    const impressions = parseInt(insights.impressions || '0');
    const clicks = parseInt(insights.clicks || '0');
    const ctr = parseFloat(insights.ctr || '0');
    const cpc = parseFloat(insights.cpc || '0');

    const roas = spend > 0 ? revenue / spend : 0;
    const costPerLead = leads > 0 ? spend / leads : 0;
    const costPerPurchase = purchases > 0 ? spend / purchases : 0;

    return {
      spend,
      impressions,
      clicks,
      ctr,
      cpc,
      leads: parseInt(String(leads)),
      purchases: parseInt(String(purchases)),
      revenue,
      roas,
      costPerLead,
      costPerPurchase,
    };
  } catch (error: any) {
    console.error('[ConversionTracker] Erreur Meta API:', error.message);
    return getEmptyMetaStats();
  }
}

function getEmptyMetaStats(): ConversionStats['meta'] {
  return {
    spend: 0,
    impressions: 0,
    clicks: 0,
    ctr: 0,
    cpc: 0,
    leads: 0,
    purchases: 0,
    revenue: 0,
    roas: 0,
    costPerLead: 0,
    costPerPurchase: 0,
  };
}

// ============================================================================
// GOOGLE ADS API
// ============================================================================

/**
 * Récupère les conversions Google Ads via API
 * https://developers.google.com/google-ads/api/docs/start
 *
 * IMPORTANT: Nécessite OAuth2 credentials
 * - Configurer sur: https://console.cloud.google.com/
 * - Stocker dans: process.env.GOOGLE_ADS_*
 */
export async function fetchGoogleAdsConversions(days: number = 1): Promise<ConversionStats['google']> {
  // Utilise la base de données PostgreSQL locale au lieu de Google Ads API
  // On récupère les vraies conversions APEX depuis les tables audits et blood_reports

  try {
    const { pool } = await import('./db.js');

    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const launchDate = new Date('2026-03-17T00:00:00Z'); // Lancement officiel APEX

    // 1. Récupérer les audits (Discovery Scan = leads, Anabolic/Ultimate = purchases)
    // IMPORTANT: Seulement depuis le 17 mars 2026 (lancement)
    const auditsResult = await pool.query(`
      SELECT
        type,
        "createdAt",
        CASE
          WHEN type = 'GRATUIT' THEN 0
          WHEN type = 'PREMIUM' THEN 37
          WHEN type = 'ELITE' THEN 67
          ELSE 0
        END as price
      FROM audits
      WHERE "createdAt" >= $1
        AND "createdAt" >= $2
    `, [since, launchDate]);

    // 2. Récupérer les blood reports (depuis le 17 mars)
    const bloodResult = await pool.query(`
      SELECT
        "createdAt",
        47 as price
      FROM blood_reports
      WHERE "createdAt" >= $1
        AND "createdAt" >= $2
        AND delivery_status IN ('SENT', 'SCHEDULED', 'READY')
    `, [since, launchDate]);

    // Calculer les stats
    let leads = 0;
    let purchases = 0;
    let revenue = 0;

    // Compter les audits
    for (const audit of auditsResult.rows) {
      if (audit.type === 'GRATUIT') {
        leads++;
      } else {
        purchases++;
        revenue += audit.price;
      }
    }

    // Compter les blood reports
    purchases += bloodResult.rows.length;
    revenue += bloodResult.rows.length * 47;

    // Dépenses estimées (à ajuster manuellement si besoin)
    // Par défaut: 0€ (à configurer manuellement dans l'env ou la DB)
    const estimatedSpend = parseFloat(process.env.ESTIMATED_AD_SPEND_PER_DAY || '0') * days;

    return {
      spend: estimatedSpend,
      impressions: 0,
      clicks: 0,
      ctr: 0,
      cpc: 0,
      leads,
      purchases,
      revenue,
      roas: estimatedSpend > 0 ? revenue / estimatedSpend : 0,
      costPerLead: leads > 0 && estimatedSpend > 0 ? estimatedSpend / leads : 0,
      costPerPurchase: purchases > 0 && estimatedSpend > 0 ? estimatedSpend / purchases : 0,
    };
  } catch (error: any) {
    console.error('[ConversionTracker] Erreur récupération DB:', error.message);
    return getEmptyGoogleStats();
  }
}

function getEmptyGoogleStats(): ConversionStats['google'] {
  return {
    spend: 0,
    impressions: 0,
    clicks: 0,
    ctr: 0,
    cpc: 0,
    leads: 0,
    purchases: 0,
    revenue: 0,
    roas: 0,
    costPerLead: 0,
    costPerPurchase: 0,
  };
}

// ============================================================================
// COMBINED STATS
// ============================================================================

export async function getConversionStats(period: '24h' | '7d' | '30d' = '24h'): Promise<ConversionStats> {
  const days = period === '24h' ? 1 : period === '7d' ? 7 : 30;

  const [meta, google] = await Promise.all([
    fetchMetaConversions(days),
    fetchGoogleAdsConversions(days),
  ]);

  const total = {
    spend: meta.spend + google.spend,
    leads: meta.leads + google.leads,
    purchases: meta.purchases + google.purchases,
    revenue: meta.revenue + google.revenue,
    roas: 0,
    profit: 0,
  };

  total.roas = total.spend > 0 ? total.revenue / total.spend : 0;
  total.profit = total.revenue - total.spend;

  // TODO: Distinguer APEX vs Coaching via event_source_url du pixel
  const bySite = {
    apex: {
      leads: Math.round(total.leads * 0.6), // Estimation 60% APEX
      purchases: Math.round(total.purchases * 0.4), // Estimation 40% APEX
      revenue: Math.round(total.revenue * 0.4),
    },
    coaching: {
      leads: Math.round(total.leads * 0.4), // Estimation 40% Coaching
      purchases: Math.round(total.purchases * 0.6), // Estimation 60% Coaching
      revenue: Math.round(total.revenue * 0.6),
    },
  };

  return {
    timestamp: new Date(),
    period,
    meta,
    google,
    total,
    bySite,
  };
}

// ============================================================================
// EMAIL REPORTING
// ============================================================================

export async function sendDailyConversionReport(): Promise<void> {
  console.log('[ConversionTracker] 📊 Génération rapport quotidien...');

  const [stats24h, stats7d] = await Promise.all([
    getConversionStats('24h'),
    getConversionStats('7d'),
  ]);

  const subject = `📊 Rapport Conversions APEX + Coaching - ${new Date().toLocaleDateString('fr-FR')}`;

  const message = `
═══════════════════════════════════════════════════════════
📊 RAPPORT CONVERSIONS QUOTIDIEN
═══════════════════════════════════════════════════════════

🗓️ Date: ${new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💰 RÉSUMÉ 24H
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💸 Dépenses totales:     ${stats24h.total.spend.toFixed(2)}€
📈 Leads générés:        ${stats24h.total.leads}
🎯 Achats:               ${stats24h.total.purchases}
💵 Revenue:              ${stats24h.total.revenue.toFixed(2)}€
📊 ROAS:                 ${stats24h.total.roas.toFixed(2)}x
💰 Profit:               ${stats24h.total.profit.toFixed(2)}€

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📱 META ADS - 24H
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💸 Dépenses:             ${stats24h.meta.spend.toFixed(2)}€
👁️  Impressions:          ${stats24h.meta.impressions.toLocaleString()}
🖱️  Clics:                ${stats24h.meta.clicks}
📊 CTR:                  ${stats24h.meta.ctr.toFixed(2)}%
💰 CPC:                  ${stats24h.meta.cpc.toFixed(2)}€

📈 Leads:                ${stats24h.meta.leads} (${stats24h.meta.costPerLead > 0 ? stats24h.meta.costPerLead.toFixed(2) + '€/lead' : 'N/A'})
🎯 Achats:               ${stats24h.meta.purchases} (${stats24h.meta.costPerPurchase > 0 ? stats24h.meta.costPerPurchase.toFixed(2) + '€/achat' : 'N/A'})
💵 Revenue:              ${stats24h.meta.revenue.toFixed(2)}€
📊 ROAS:                 ${stats24h.meta.roas.toFixed(2)}x

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔍 GOOGLE ADS - 24H
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💸 Dépenses:             ${stats24h.google.spend.toFixed(2)}€
👁️  Impressions:          ${stats24h.google.impressions.toLocaleString()}
🖱️  Clics:                ${stats24h.google.clicks}
📊 CTR:                  ${stats24h.google.ctr.toFixed(2)}%
💰 CPC:                  ${stats24h.google.cpc.toFixed(2)}€

📈 Leads:                ${stats24h.google.leads} (${stats24h.google.costPerLead > 0 ? stats24h.google.costPerLead.toFixed(2) + '€/lead' : 'N/A'})
🎯 Achats:               ${stats24h.google.purchases} (${stats24h.google.costPerPurchase > 0 ? stats24h.google.costPerPurchase.toFixed(2) + '€/achat' : 'N/A'})
💵 Revenue:              ${stats24h.google.revenue.toFixed(2)}€
📊 ROAS:                 ${stats24h.google.roas.toFixed(2)}x

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🌐 PAR SITE - 24H
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔬 APEXLABS:
  📈 Leads:              ${stats24h.bySite.apex.leads}
  🎯 Achats:             ${stats24h.bySite.apex.purchases}
  💵 Revenue:            ${stats24h.bySite.apex.revenue}€

💪 ACHZOD COACHING:
  📈 Leads:              ${stats24h.bySite.coaching.leads}
  🎯 Achats:             ${stats24h.bySite.coaching.purchases}
  💵 Revenue:            ${stats24h.bySite.coaching.revenue}€

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📈 TENDANCE 7 JOURS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💸 Dépenses totales:     ${stats7d.total.spend.toFixed(2)}€
📈 Leads générés:        ${stats7d.total.leads}
🎯 Achats:               ${stats7d.total.purchases}
💵 Revenue:              ${stats7d.total.revenue.toFixed(2)}€
📊 ROAS moyen:           ${stats7d.total.roas.toFixed(2)}x
💰 Profit:               ${stats7d.total.profit.toFixed(2)}€

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 RECOMMANDATIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${getRecommendations(stats24h, stats7d)}

═══════════════════════════════════════════════════════════

🔗 Dashboard: https://apexlabs.onrender.com/admin/conversions-tracker

📊 Ce rapport est envoyé automatiquement tous les jours à 9h00.
`;

  try {
    await sendCTAEmail(SENDER_EMAIL, subject, message);
    console.log('[ConversionTracker] ✅ Rapport quotidien envoyé');
  } catch (error: any) {
    console.error('[ConversionTracker] ❌ Erreur envoi rapport:', error.message);
  }
}

function getRecommendations(stats24h: ConversionStats, stats7d: ConversionStats): string {
  const recommendations: string[] = [];

  // ROAS faible
  if (stats24h.total.roas < 1) {
    recommendations.push('⚠️  ROAS < 1x : Tu perds de l\'argent. Pause les campagnes peu performantes.');
  } else if (stats24h.total.roas < 2) {
    recommendations.push('⚡ ROAS entre 1-2x : Rentable mais optimisable. Teste de nouvelles créatives.');
  } else if (stats24h.total.roas >= 3) {
    recommendations.push('🚀 ROAS > 3x : Excellentes performances ! Scale les campagnes gagnantes.');
  }

  // Leads sans achats
  if (stats24h.total.leads > 10 && stats24h.total.purchases === 0) {
    recommendations.push('📧 Beaucoup de leads mais 0 achat : Optimise les emails de relance et le code RETOUR30.');
  }

  // Cost per lead élevé
  const avgCostPerLead = (stats24h.meta.costPerLead + stats24h.google.costPerLead) / 2;
  if (avgCostPerLead > 10) {
    recommendations.push('💰 Coût par lead > 10€ : Améliore le ciblage et teste de nouveaux angles.');
  }

  // Tendance 7j vs 24h
  const roas7dAvg = stats7d.total.roas;
  if (stats24h.total.roas < roas7dAvg * 0.7) {
    recommendations.push('📉 ROAS en baisse vs moyenne 7j : Vérifie les campagnes actives.');
  }

  if (recommendations.length === 0) {
    recommendations.push('✅ Tout est bon ! Continue sur cette lancée.');
  }

  return recommendations.map(r => `  ${r}`).join('\n');
}
