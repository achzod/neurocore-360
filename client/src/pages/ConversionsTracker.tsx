/**
 * CONVERSIONS TRACKER - Dashboard temps réel
 * Suivi des conversions Meta Ads + Google Ads
 * APEX + Achzod Coaching
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { RefreshCw, TrendingUp, TrendingDown, DollarSign, Target, Users, ShoppingCart } from 'lucide-react';

interface ConversionStats {
  timestamp: string;
  period: '24h' | '7d' | '30d';
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
              Meta Ads + Google Ads • APEX + Coaching
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
                Dépenses
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">
                {formatCurrency(stats.total.spend)}
              </div>
              <div className="text-sm text-gray-400 mt-1">
                Meta: {formatCurrency(stats.meta.spend)} • Google: {formatCurrency(stats.google.spend)}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-500" />
                Leads
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">
                {formatNumber(stats.total.leads)}
              </div>
              <div className="text-sm text-gray-400 mt-1">
                Meta: {stats.meta.leads} • Google: {stats.google.leads}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-green-500" />
                Achats
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">
                {formatNumber(stats.total.purchases)}
              </div>
              <div className="text-sm text-gray-400 mt-1">
                Meta: {stats.meta.purchases} • Google: {stats.google.purchases}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Target className="w-5 h-5 text-[#FCDD00]" />
                ROAS
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold ${getROASColor(stats.total.roas)}`}>
                {stats.total.roas.toFixed(2)}x
              </div>
              <div className="text-sm text-gray-400 mt-1">
                Meta: {stats.meta.roas.toFixed(2)}x • Google: {stats.google.roas.toFixed(2)}x
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Revenue & Profit */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Revenue Total</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-green-500">
                {formatCurrency(stats.total.revenue)}
              </div>
              <div className="mt-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-400">Meta</span>
                  <span className="text-white font-semibold">{formatCurrency(stats.meta.revenue)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Google</span>
                  <span className="text-white font-semibold">{formatCurrency(stats.google.revenue)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Profit Net</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-4xl font-bold ${stats.total.profit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {formatCurrency(stats.total.profit)}
              </div>
              <div className="mt-4">
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  {stats.total.profit >= 0 ? (
                    <TrendingUp className="w-4 h-4 text-green-500" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-red-500" />
                  )}
                  <span>Revenue - Dépenses</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* By Site */}
        <Card className="bg-gray-800 border-gray-700 mb-8">
          <CardHeader>
            <CardTitle className="text-white">Performance par Site</CardTitle>
            <CardDescription className="text-gray-400">
              Répartition estimée des conversions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-xl font-semibold text-[#FCDD00] mb-4">🔬 APEXLABS</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Leads</span>
                    <span className="text-white font-semibold">{stats.bySite.apex.leads}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Achats</span>
                    <span className="text-white font-semibold">{stats.bySite.apex.purchases}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Revenue</span>
                    <span className="text-white font-semibold">{formatCurrency(stats.bySite.apex.revenue)}</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-[#FCDD00] mb-4">💪 ACHZOD COACHING</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Leads</span>
                    <span className="text-white font-semibold">{stats.bySite.coaching.leads}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Achats</span>
                    <span className="text-white font-semibold">{stats.bySite.coaching.purchases}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Revenue</span>
                    <span className="text-white font-semibold">{formatCurrency(stats.bySite.coaching.revenue)}</span>
                  </div>
                </div>
              </div>
            </div>
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
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
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
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="google">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Détails Google Ads</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div>
                    <p className="text-gray-400 text-sm">Impressions</p>
                    <p className="text-2xl font-bold text-white">{formatNumber(stats.google.impressions)}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Clics</p>
                    <p className="text-2xl font-bold text-white">{formatNumber(stats.google.clicks)}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">CTR</p>
                    <p className="text-2xl font-bold text-white">{stats.google.ctr.toFixed(2)}%</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">CPC</p>
                    <p className="text-2xl font-bold text-white">{formatCurrency(stats.google.cpc)}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Coût/Lead</p>
                    <p className="text-2xl font-bold text-white">{formatCurrency(stats.google.costPerLead)}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Coût/Achat</p>
                    <p className="text-2xl font-bold text-white">{formatCurrency(stats.google.costPerPurchase)}</p>
                  </div>
                </div>
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
            <p>Pour activer le tracking temps réel, configure les variables d'environnement:</p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li><code>META_ACCESS_TOKEN</code> - Token d'accès Meta Marketing API</li>
              <li><code>META_AD_ACCOUNT_ID</code> - ID du compte pub Meta (sans "act_")</li>
              <li><code>GOOGLE_ADS_CLIENT_ID</code> - OAuth2 Client ID Google</li>
              <li><code>GOOGLE_ADS_CLIENT_SECRET</code> - OAuth2 Client Secret</li>
              <li><code>GOOGLE_ADS_REFRESH_TOKEN</code> - Refresh Token</li>
              <li><code>GOOGLE_ADS_CUSTOMER_ID</code> - Customer ID Google Ads</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
