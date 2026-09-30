/**
 * CONVERSIONS TRACKER - Dashboard temps réel
 * Suivi des conversions Meta Ads + Google Ads
 * APEX + Achzod Coaching
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { RefreshCw, DollarSign, Target, Users, ShoppingCart } from 'lucide-react';
import type { BusinessConversionStats } from '../../../server/businessConversionStats';

interface ConversionStats {
  timestamp: string;
  period: '24h' | '7d' | '30d';
  business: BusinessConversionStats | null;
  sources: { metaAvailable: boolean; googleAdsAvailable: false };
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
  total: {
    spend: number;
    leads: number;
    purchases: number;
    revenue: number;
    roas: number;
    profit: number;
  };
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

export default function ConversionsTracker() {
  const [stats, setStats] = useState<ConversionStats | null>(null);
  const [period, setPeriod] = useState<'24h' | '7d' | '30d'>('24h');
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const fetchStats = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/conversion-stats?period=${period}`, {
        credentials: 'include',
      });
      const data = await response.json();
      if (data.success) {
        setStats(data.stats);
        setLastUpdate(new Date());
      }
    } catch (error) {
      console.error('Error fetching conversion stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    // Auto-refresh toutes les heures
    const interval = setInterval(fetchStats, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [period]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('fr-FR').format(value);
  };

  const getROASColor = (roas: number) => {
    if (roas >= 3) return 'text-green-600';
    if (roas >= 2) return 'text-yellow-600';
    if (roas >= 1) return 'text-orange-600';
    return 'text-red-600';
  };

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-white">Chargement...</div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-white">Erreur de chargement des données</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">Conversions Tracker</h1>
            <p className="text-gray-400">
              Commandes confirmées APEX • attribution publicitaire séparée
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Dernière mise à jour: {lastUpdate.toLocaleTimeString('fr-FR')}
            </p>
          </div>
          <Button
            onClick={fetchStats}
            disabled={loading}
            className="bg-[#FCDD00] text-black hover:bg-[#e0c700]"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
        </div>

        {/* Period Selector */}
        <Tabs value={period} onValueChange={(v) => setPeriod(v as any)} className="mb-8">
          <TabsList className="bg-gray-800">
            <TabsTrigger value="24h">24 heures</TabsTrigger>
            <TabsTrigger value="7d">7 jours</TabsTrigger>
            <TabsTrigger value="30d">30 jours</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-red-500" />
                Dépenses Meta
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">
                {stats.sources.metaAvailable ? formatCurrency(stats.meta.spend) : 'N/D'}
              </div>
              <div className="text-sm text-gray-400 mt-1">
                {stats.sources.metaAvailable ? 'Dépenses du compte Meta' : 'Données Meta indisponibles'}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-500" />
                Contacts checkout
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">
                {stats.business ? formatNumber(stats.business.checkoutContacts) : 'N/D'}
              </div>
              <div className="text-sm text-gray-400 mt-1">
                Contacts distincts, hors commandes QA
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-green-500" />
                Commandes payées
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">
                {stats.business ? formatNumber(stats.business.paidOrders) : 'N/D'}
              </div>
              <div className="text-sm text-gray-400 mt-1">
                Annulations réelles: {stats.business?.cancelledCheckouts ?? 'N/D'}{stats.business?.refundedOrders ? ` • dont ${stats.business.refundedOrders} remboursée(s)` : ''}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Target className="w-5 h-5 text-[#FCDD00]" />
                ROAS Meta
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold ${stats.sources.metaAvailable && stats.meta.spend > 0 ? getROASColor(stats.meta.roas) : 'text-gray-400'}`}>
                {stats.sources.metaAvailable && stats.meta.spend > 0 ? `${stats.meta.roas.toFixed(2)}x` : 'N/D'}
              </div>
              <div className="text-sm text-gray-400 mt-1">
                Pas de ROAS fiable sans dépenses et attribution vérifiées
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Verified first-party revenue and QA exclusions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
            <CardTitle className="text-white">Chiffre d'affaires APEX net</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-green-500">
                {stats.business ? formatCurrency(stats.business.netRevenueCents / 100) : 'N/D'}
              </div>
              <div className="mt-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-400">Commandes payées</span>
                  <span className="text-white font-semibold">{stats.business ? formatCurrency(stats.business.grossRevenueCents / 100) : 'N/D'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Remboursements</span>
                  <span className="text-white font-semibold">{stats.business ? formatCurrency(stats.business.refundedCents / 100) : 'N/D'}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
            <CardTitle className="text-white">Qualité des données</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-white">
                {stats.business ? stats.business.qaOrdersExcluded : 'N/D'}
              </div>
              <div className="mt-4">
                <p className="text-sm text-gray-400">Commandes de test QA exclues du total</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* By Site */}
        <Card className="bg-gray-800 border-gray-700 mb-8">
          <CardHeader>
            <CardTitle className="text-white">Attribution par site indisponible</CardTitle>
            <CardDescription className="text-gray-400">
              Aucune répartition APEX/Coaching n'est inventée à partir des commandes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-gray-300">Relie GA4 et Search Console pour comparer SEO, campagnes et achats avec une source vérifiable.</p>
          </CardContent>
        </Card>

        {/* Detailed Stats */}
        <Tabs defaultValue="meta" className="mb-8">
          <TabsList className="bg-gray-800">
            <TabsTrigger value="meta">Meta Ads</TabsTrigger>
            <TabsTrigger value="google">Google Ads</TabsTrigger>
          </TabsList>

          <TabsContent value="meta">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Détails Meta Ads</CardTitle>
              </CardHeader>
              <CardContent>
                {!stats.sources.metaAvailable ? <p className="text-gray-400">Données Meta indisponibles : compte non connecté ou réponse API en échec.</p> : <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div>
                    <p className="text-gray-400 text-sm">Impressions</p>
                    <p className="text-2xl font-bold text-white">{formatNumber(stats.meta.impressions)}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Clics</p>
                    <p className="text-2xl font-bold text-white">{formatNumber(stats.meta.clicks)}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">CTR</p>
                    <p className="text-2xl font-bold text-white">{stats.meta.ctr.toFixed(2)}%</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">CPC</p>
                    <p className="text-2xl font-bold text-white">{formatCurrency(stats.meta.cpc)}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Coût/Lead</p>
                    <p className="text-2xl font-bold text-white">{formatCurrency(stats.meta.costPerLead)}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Coût/Achat</p>
                    <p className="text-2xl font-bold text-white">{formatCurrency(stats.meta.costPerPurchase)}</p>
                  </div>
                </div>}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="google">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Détails Google Ads</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-400">Google Ads n'est pas connecté à ce tableau. Les commandes APEX ci-dessus ne sont pas attribuées à Google Ads.</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Config Notice */}
        <Card className="bg-yellow-900/20 border-yellow-600/50">
          <CardHeader>
            <CardTitle className="text-yellow-500">⚙️ Configuration requise</CardTitle>
          </CardHeader>
          <CardContent className="text-gray-300 space-y-2">
            <p>Les commandes payées proviennent de la base APEX. Les chiffres Meta nécessitent l'accès au compte publicitaire ; Google Ads, GA4 et Search Console ne sont pas reliés ici.</p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li><code>META_ACCESS_TOKEN</code> - Token d'accès Meta Marketing API</li>
              <li><code>META_AD_ACCOUNT_ID</code> - ID du compte pub Meta (sans "act_")</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
