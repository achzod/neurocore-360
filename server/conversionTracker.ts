/**
 * APEXLABS - Conversion Tracker
 *
 * Tracks conversions from:
 * - Meta Ads (Pixel ID: 1120781400174189)
 * - Google Ads (Account ID: AW-706806863)
 *
 * For both sites:
 * - apexlabs.achzodcoaching.com
 * - achzodcoaching.com
 */

import { sendCTAEmail, SENDER_EMAIL } from './emailService';
import { summarizeBusinessOrders, type BusinessConversionStats } from './businessConversionStats';

// ============================================================================
// TYPES
// ============================================================================

export interface ConversionStats {
  timestamp: Date;
  period: '24h' | '7d' | '30d';
  business: BusinessConversionStats | null;
  sources: { metaAvailable: boolean; googleAdsAvailable: false };

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
  return (await fetchMetaConversionsWithStatus(days)).stats;
}

async function fetchMetaConversionsWithStatus(days: number): Promise<{
  stats: ConversionStats['meta']; available: boolean;
}> {
  const accessToken = process.env.META_ACCESS_TOKEN;

  if (!accessToken) {
    console.warn('[ConversionTracker] META_ACCESS_TOKEN non configuré - retour données vides');
    return { stats: getEmptyMetaStats(), available: false };
  }

  try {
    // Récupérer les stats de la campagne
    // https://graph.facebook.com/v18.0/act_{ad_account_id}/insights
    const adAccountId = process.env.META_AD_ACCOUNT_ID || '';

    if (!adAccountId) {
      console.warn('[ConversionTracker] META_AD_ACCOUNT_ID non configuré');
      return { stats: getEmptyMetaStats(), available: false };
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
      return { stats: getEmptyMetaStats(), available: false };
    }

    const data = await response.json();

    if (!data.data || data.data.length === 0) {
      return { stats: getEmptyMetaStats(), available: true };
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

    return { stats: {
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
    }, available: true };
  } catch (error: any) {
    console.error('[ConversionTracker] Erreur Meta API:', error.message);
    return { stats: getEmptyMetaStats(), available: false };
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
  // No Google Ads API connection here. Local audits are not ad-attributed
  // conversions, and old hard-coded prices were not actual paid order totals.
  void days;
  return getEmptyGoogleStats();
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

  const [metaResult, google, business] = await Promise.all([
    fetchMetaConversionsWithStatus(days),
    fetchGoogleAdsConversions(days),
    getBusinessConversionStats(days),
  ]);
  const meta = metaResult.stats;

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

  // No source URL-level attribution is available in this endpoint.
  const bySite = {
    apex: { leads: 0, purchases: 0, revenue: 0 },
    coaching: { leads: 0, purchases: 0, revenue: 0 },
  };

  return {
    timestamp: new Date(),
    period,
    business,
    sources: {
      metaAvailable: metaResult.available,
      googleAdsAvailable: false,
    },
    meta,
    google,
    total,
    bySite,
  };
}

async function getBusinessConversionStats(days: number): Promise<BusinessConversionStats | null> {
  try {
    const { pool } = await import('./db.js');
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const result = await pool.query(`
      SELECT email, product_type AS "productType", status,
             final_amount_cents AS "finalAmountCents",
             refund_amount_cents AS "refundAmountCents", metadata
        FROM orders WHERE created_at >= $1
    `, [since]);
    return summarizeBusinessOrders(result.rows);
  } catch (error: any) {
    console.error('[ConversionTracker] Real paid-order metrics unavailable:', error.message);
    return null;
  }
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

  const subject = `Rapport ventes APEX - ${new Date().toLocaleDateString('fr-FR')}`;
  const line = (label: string, value: number | null) =>
    `${label}: ${value === null ? 'indisponible' : value}`;
  const euro = (cents: number | null) =>
    cents === null ? 'indisponible' : `${(cents / 100).toFixed(2)} EUR`;
  const message = [
    `Ventes APEX du ${new Date().toLocaleDateString('fr-FR')}`,
    '',
    'Dernières 24 heures, commandes réelles hors QA :',
    line('Commandes payées', stats24h.business?.paidOrders ?? null),
    line('Checkouts annulés', stats24h.business?.cancelledCheckouts ?? null),
    line('Contacts checkout distincts', stats24h.business?.checkoutContacts ?? null),
    `Chiffre d'affaires net: ${euro(stats24h.business?.netRevenueCents ?? null)}`,
    '',
    'Derniers 7 jours, commandes réelles hors QA :',
    line('Commandes payées', stats7d.business?.paidOrders ?? null),
    line('Checkouts annulés', stats7d.business?.cancelledCheckouts ?? null),
    `Chiffre d'affaires net: ${euro(stats7d.business?.netRevenueCents ?? null)}`,
    '',
    stats24h.sources.metaAvailable
      ? `Meta Ads: ${stats24h.meta.spend.toFixed(2)} EUR dépenses, ${stats24h.meta.purchases} achats attribués (données du compte Meta).`
      : 'Meta Ads: données indisponibles dans ce tableau.',
    'Google Ads, GA4 et Search Console: données non connectées ici. Aucun ROAS ou profit ne peut être déduit de ces seules commandes.',
    '',
    'Tableau: https://apexlabs.achzodcoaching.com/admin/conversions-tracker',
  ].join('\n');

  try {
    await sendCTAEmail(SENDER_EMAIL, subject, message);
    console.log('[ConversionTracker] ✅ Rapport quotidien envoyé');
  } catch (error: any) {
    console.error('[ConversionTracker] ❌ Erreur envoi rapport:', error.message);
  }
}
