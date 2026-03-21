/**
 * CONVERSIONS TRACKER - Version publique (sans login)
 * Accessible via /conversions?key=SECRET
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { RefreshCw, TrendingUp, TrendingDown, DollarSign, Target, Users, ShoppingCart, AlertCircle } from 'lucide-react';
import { useLocation } from 'wouter';

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

export default function ConversionsPublic() {
  const [stats, setStats] = useState<ConversionStats | null>(null);
  const [period, setPeriod] = useState<'24h' | '7d' | '30d'>('24h');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [, navigate] = useLocation();

  // Get secret key from URL
  const urlParams = new URLSearchParams(window.location.search);
  const key = urlParams.get('key');

  const fetchStats = async () => {
    if (!key) {
      setError('Clé manquante dans l\'URL');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/conversions?key=${key}&period=${period}`);
      const data = await response.json();

      if (response.status === 403) {
        setError('Clé invalide');
        setLoading(false);
        return;
      }

      if (data.success) {
        setStats(data.stats);
        setLastUpdate(new Date());
      } else {
        setError(data.error || 'Erreur de chargement');
      }
    } catch (err) {
      console.error('Error fetching conversion stats:', err);
      setError('Erreur de chargement des données');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [period, key]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('fr-FR').format(value);
  };

  const formatPercent = (value: number) => {
    return `${(value * 100).toFixed(2)}%`;
  };

  if (!key) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
        <Card className="bg-zinc-900 border-zinc-800 max-w-md">
          <CardHeader>
            <CardTitle className="text-red-500 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Accès refusé
            </CardTitle>
            <CardDescription className="text-zinc-400">
              Clé manquante dans l'URL. Contactez l'administrateur.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (error === 'Clé invalide') {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
        <Card className="bg-zinc-900 border-zinc-800 max-w-md">
          <CardHeader>
            <CardTitle className="text-red-500 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Clé invalide
            </CardTitle>
            <CardDescription className="text-zinc-400">
              La clé fournie n'est pas valide. Contactez l'administrateur.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (loading && !stats) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-cyan-500" />
          <p className="text-zinc-400">Chargement des données...</p>
        </div>
      </div>
    );
  }

  if (error && !stats) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
        <Card className="bg-zinc-900 border-zinc-800 max-w-md">
          <CardHeader>
            <CardTitle className="text-red-500 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Erreur
            </CardTitle>
            <CardDescription className="text-zinc-400">{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={fetchStats} className="w-full">
              Réessayer
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              Conversions Tracker
            </h1>
            <p className="text-zinc-400 text-sm mt-1">
              Meta Ads + Google Ads • APEX + Coaching
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={period === '24h' ? 'default' : 'outline'}
                onClick={() => setPeriod('24h')}
              >
                24h
              </Button>
              <Button
                size="sm"
                variant={period === '7d' ? 'default' : 'outline'}
                onClick={() => setPeriod('7d')}
              >
                7j
              </Button>
              <Button
                size="sm"
                variant={period === '30d' ? 'default' : 'outline'}
                onClick={() => setPeriod('30d')}
              >
                30j
              </Button>
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={fetchStats}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Last Update */}
        <p className="text-xs text-zinc-500">
          Dernière mise à jour: {lastUpdate.toLocaleString('fr-FR')}
        </p>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-zinc-400 flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Dépenses totales
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.total.spend)}</div>
              <p className="text-xs text-zinc-500 mt-1">
                Meta: {formatCurrency(stats.meta.spend)} • Google: {formatCurrency(stats.google.spend)}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-zinc-400 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Leads
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-cyan-400">{formatNumber(stats.total.leads)}</div>
              <p className="text-xs text-zinc-500 mt-1">
                APEX: {stats.bySite.apex.leads} • Coaching: {stats.bySite.coaching.leads}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-zinc-400 flex items-center gap-2">
                <ShoppingCart className="w-4 h-4" />
                Ventes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-400">{formatNumber(stats.total.purchases)}</div>
              <p className="text-xs text-zinc-500 mt-1">
                APEX: {stats.bySite.apex.purchases} • Coaching: {stats.bySite.coaching.purchases}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-zinc-400 flex items-center gap-2">
                <Target className="w-4 h-4" />
                ROAS
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${stats.total.roas >= 2 ? 'text-green-400' : stats.total.roas >= 1 ? 'text-yellow-400' : 'text-red-400'}`}>
                {stats.total.roas.toFixed(2)}x
              </div>
              <p className="text-xs text-zinc-500 mt-1">
                Revenus: {formatCurrency(stats.total.revenue)}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Platform Stats */}
        <Tabs defaultValue="meta" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="meta">Meta Ads</TabsTrigger>
            <TabsTrigger value="google">Google Ads</TabsTrigger>
          </TabsList>

          <TabsContent value="meta" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                  <CardTitle className="text-sm">Impressions</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xl font-bold">{formatNumber(stats.meta.impressions)}</p>
                  <p className="text-xs text-zinc-500">CTR: {formatPercent(stats.meta.ctr)}</p>
                </CardContent>
              </Card>

              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                  <CardTitle className="text-sm">Clics</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xl font-bold">{formatNumber(stats.meta.clicks)}</p>
                  <p className="text-xs text-zinc-500">CPC: {formatCurrency(stats.meta.cpc)}</p>
                </CardContent>
              </Card>

              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                  <CardTitle className="text-sm">Coût/Lead</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xl font-bold">{formatCurrency(stats.meta.costPerLead)}</p>
                  <p className="text-xs text-zinc-500">Leads: {stats.meta.leads}</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="google" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                  <CardTitle className="text-sm">Impressions</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xl font-bold">{formatNumber(stats.google.impressions)}</p>
                  <p className="text-xs text-zinc-500">CTR: {formatPercent(stats.google.ctr)}</p>
                </CardContent>
              </Card>

              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                  <CardTitle className="text-sm">Clics</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xl font-bold">{formatNumber(stats.google.clicks)}</p>
                  <p className="text-xs text-zinc-500">CPC: {formatCurrency(stats.google.cpc)}</p>
                </CardContent>
              </Card>

              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                  <CardTitle className="text-sm">Coût/Lead</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xl font-bold">{formatCurrency(stats.google.costPerLead)}</p>
                  <p className="text-xs text-zinc-500">Leads: {stats.google.leads}</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
