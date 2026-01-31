import { useEffect, useMemo, useState } from "react";
import { useParams } from "wouter";
import { Sidebar } from "@/components/ultrahuman/Sidebar";
import { RadialProgress } from "@/components/ultrahuman/RadialProgress";
import { ULTRAHUMAN_THEMES } from "@/components/ultrahuman/themes";
import { SectionContent, Theme } from "@/components/ultrahuman/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/blood/StatusBadge";
import { StatusIndicator } from "@/components/blood/StatusIndicator";
import { BiomarkerRangeIndicator } from "@/components/blood/BiomarkerRangeIndicator";
import { BiomarkerTrendChart } from "@/components/blood/BiomarkerTrendChart";
import { GaugeWithRange } from "@/components/blood/GaugeWithRange";
import { BloodRadar } from "@/components/blood/BloodRadar";
import ReactMarkdown from 'react-markdown';

// Premium components - direct imports (named exports, not default)
import { RadialScoreChart } from "@/components/blood/RadialScoreChart";
import { InteractiveHeatmap } from "@/components/blood/InteractiveHeatmap";
import { AnimatedStatCard } from "@/components/blood/AnimatedStatCard";
import { MetricCard3D } from "@/components/blood/MetricCard3D";
import { getBiomarkerStatusColor, normalizeBiomarkerStatus, BiomarkerStatus } from "@/lib/biomarker-colors";
import { BLOOD_PANELS, getMarkerById } from "@/lib/blood-questionnaire";
import {
  Activity,
  AlertTriangle,
  Beaker,
  Flame,
  Heart,
  Loader2,
  Menu,
  Shield,
  TrendingUp,
  LucideIcon,
} from "lucide-react";

const THEMES: Theme[] = ULTRAHUMAN_THEMES;

// Force light theme - find "Claude Creme" or "Titanium Light"
const DEFAULT_THEME = THEMES.find(t => t.id === "metabolic") || THEMES.find(t => t.type === "light") || THEMES[1];

const PANEL_ICONS: Record<string, LucideIcon> = {
  hormonal: TrendingUp,
  thyroid: Activity,
  metabolic: Flame,
  inflammation: Shield,
  vitamins: Activity,
  liver_kidney: Beaker,
};

const STATUS_SCORE: Record<BiomarkerStatus, number> = {
  optimal: 100,
  normal: 80,
  suboptimal: 55,
  critical: 30,
};

type RawMarker = {
  markerId?: string;
  id?: string;
  name: string;
  value: number;
  unit: string;
  status: string;
  normalRange?: string;
  optimalRange?: string;
  interpretation?: string;
  history?: Array<{ date: string; value: number }>;
};

type BloodAnalysisReport = {
  id: string;
  email: string;
  profile?: Record<string, unknown>;
  markers?: unknown[];
  analysis?: {
    summary?: { optimal?: string[]; watch?: string[]; action?: string[] };
    markers?: RawMarker[];
    patterns?: Array<{ name: string; causes?: string[] }>;
  };
  aiReport?: string;
  createdAt?: string;
};

const parseRange = (range?: string): { min?: number; max?: number } => {
  if (!range) return {};
  const numbers = range.match(/-?\d+(\.\d+)?/g);
  if (!numbers || numbers.length === 0) return {};
  if (numbers.length === 1) {
    const value = Number(numbers[0]);
    return { min: value, max: value };
  }
  return { min: Number(numbers[0]), max: Number(numbers[1]) };
};

const scoreToStatus = (score: number): BiomarkerStatus => {
  if (score >= 80) return "optimal";
  if (score >= 65) return "normal";
  if (score >= 45) return "suboptimal";
  return "critical";
};

export default function BloodAnalysisDashboard() {
  const { reportId } = useParams<{ reportId: string }>();
  const [report, setReport] = useState<BloodAnalysisReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTheme, setCurrentTheme] = useState<Theme>(DEFAULT_THEME);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--color-bg", currentTheme.colors.background);
    root.style.setProperty("--color-surface", currentTheme.colors.surface);
    root.style.setProperty("--color-border", currentTheme.colors.border);
    root.style.setProperty("--color-text", currentTheme.colors.text);
    root.style.setProperty("--color-text-muted", currentTheme.colors.textMuted);
    root.style.setProperty("--color-primary", currentTheme.colors.primary);
    root.style.setProperty("--color-grid", currentTheme.colors.grid);
    root.style.setProperty("--color-on-primary", currentTheme.type === "dark" ? "#000" : "#fff");
    root.style.setProperty("--primary", currentTheme.colors.primary);
    root.style.setProperty("--text", currentTheme.colors.text);
    root.style.setProperty("--text-secondary", currentTheme.colors.textMuted);
    root.style.setProperty("--text-muted", currentTheme.colors.textMuted);
    root.style.setProperty("--surface-1", currentTheme.colors.surface);
    root.style.setProperty("--surface-2", currentTheme.colors.background);
    root.style.setProperty("--border", currentTheme.colors.border);
    root.style.setProperty("--accent-ok", currentTheme.colors.primary);
    root.style.setProperty("--accent-warning", currentTheme.colors.primary);
  }, [currentTheme]);

  useEffect(() => {
    let isMounted = true;
    const loadReport = async () => {
      if (!reportId) {
        setError("Identifiant de rapport manquant.");
        setLoading(false);
        return;
      }
      try {
        const response = await fetch(`/api/blood-analysis/report/${reportId}`);
        const data = await response.json();
        if (!response.ok || !data?.success || !data?.report) {
          throw new Error(data?.error || "Impossible de charger le rapport");
        }
        if (isMounted) {
          setReport(data.report);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setReport(null);
          setError(err instanceof Error ? err.message : "Erreur de chargement");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    loadReport();
    return () => {
      isMounted = false;
    };
  }, [reportId]);

  const normalizedMarkers = useMemo(() => {
    const raw = report?.analysis?.markers || [];
    return raw.map((marker) => {
      const markerId = marker.markerId || marker.id || marker.name.toLowerCase().replace(/\s+/g, "_");
      const meta = getMarkerById(markerId);
      const normal = parseRange(marker.normalRange);
      const optimal = parseRange(marker.optimalRange);
      return {
        id: markerId,
        name: marker.name,
        value: marker.value,
        unit: marker.unit,
        status: normalizeBiomarkerStatus(marker.status),
        normalMin: normal.min,
        normalMax: normal.max,
        optimalMin: optimal.min,
        optimalMax: optimal.max,
        interpretation: marker.interpretation,
        history: marker.history,
        panelId: meta?.panel,
        panelTitle: meta ? BLOOD_PANELS.find((p) => p.id === meta.panel)?.title : undefined,
      };
    });
  }, [report]);

  const panelGroups = useMemo(() => {
    return BLOOD_PANELS.map((panel) => {
      const markers = normalizedMarkers.filter((marker) => marker.panelId === panel.id);
      const averageScore = markers.length
        ? Math.round(
            markers.reduce((acc, marker) => acc + STATUS_SCORE[marker.status], 0) / markers.length
          )
        : 0;
      return {
        ...panel,
        markers,
        score: averageScore,
      };
    });
  }, [normalizedMarkers]);

  const globalScore = useMemo(() => {
    const scored = panelGroups.filter((panel) => panel.markers.length > 0);
    if (!scored.length) return 0;
    const total = scored.reduce((acc, panel) => acc + panel.score, 0);
    return Math.round(total / scored.length);
  }, [panelGroups]);

  const radarData = useMemo(() => {
    return panelGroups.map((panel) => ({
      key: panel.id,
      label: panel.title,
      score: panel.score,
      status: scoreToStatus(panel.score),
    }));
  }, [panelGroups]);

  const summary = report?.analysis?.summary || { optimal: [], watch: [], action: [] };

  const sidebarSections: SectionContent[] = [
    { id: "overview", title: "Overview", subtitle: "Vue d'ensemble", content: "" },
    { id: "biomarkers", title: "Biomarqueurs", subtitle: "Lecture par marqueur", content: "" },
    { id: "insights", title: "Insights", subtitle: "Synthese", content: "" },
  ];

  const clientName = report?.profile?.prenom
    ? String(report?.profile?.prenom)
    : report?.email
    ? report.email.split("@")[0]
    : "Profil";

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: currentTheme.colors.background }}>
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin mx-auto mb-3" style={{ color: currentTheme.colors.primary }} />
          <p className="text-sm" style={{ color: currentTheme.colors.textMuted }}>Chargement du Blood Analysis...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: currentTheme.colors.background }}>
        <div className="max-w-md text-center space-y-3">
          <AlertTriangle className="w-10 h-10 mx-auto" style={{ color: currentTheme.colors.primary }} />
          <p className="text-lg font-semibold" style={{ color: currentTheme.colors.text }}>Impossible de charger le rapport</p>
          <p className="text-sm" style={{ color: currentTheme.colors.textMuted }}>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="ultrahuman-report min-h-screen flex"
      style={{ backgroundColor: currentTheme.colors.background, color: currentTheme.colors.text }}
    >
      <aside
        className={`fixed lg:sticky top-0 left-0 h-screen w-72 border-r z-40 transition-transform lg:translate-x-0 ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ backgroundColor: currentTheme.colors.background, borderColor: currentTheme.colors.border }}
      >
        <Sidebar
          sections={sidebarSections}
          activeSection={activeTab}
          onNavigate={setActiveTab}
          themes={THEMES}
          currentTheme={currentTheme}
          onThemeChange={setCurrentTheme}
          clientName={clientName}
          auditType="BLOOD_ANALYSIS"
        />
      </aside>

      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-30 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
          style={{
            backgroundColor: currentTheme.type === 'dark'
              ? 'rgba(0, 0, 0, 0.5)'
              : 'rgba(0, 0, 0, 0.2)'
          }}
        />
      )}

      <main className="flex-1 overflow-y-auto h-screen">
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg"
          style={{ backgroundColor: currentTheme.colors.surface }}
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="max-w-6xl mx-auto px-6 py-10">
          <div className="mb-6">
            <p className="text-xs uppercase tracking-[0.2em]" style={{ color: currentTheme.colors.textMuted }}>
              Blood Analysis
            </p>
            <h1 className="text-3xl font-bold mt-2">Tableau de bord biomarqueurs</h1>
            <p className="text-sm mt-2" style={{ color: currentTheme.colors.textMuted }}>
              Lecture premium de ton bilan sanguin, ranges optimaux et axes de correction.
            </p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-8 flex flex-wrap">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="biomarkers">Biomarqueurs</TabsTrigger>
              <TabsTrigger value="insights">Insights</TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <div className="grid lg:grid-cols-2 gap-8 mb-8">
                <div
                  className="flex flex-col items-center justify-center p-8 rounded-sm border blood-glass blood-grain"
                  style={{ backgroundColor: currentTheme.colors.surface, borderColor: currentTheme.colors.border }}
                >
                  <RadialScoreChart
                    score={globalScore}
                    size={220}
                    strokeWidth={8}
                    label="SCORE GLOBAL"
                    sublabel={`${normalizedMarkers.length} biomarqueurs`}
                  />
                  <p className="text-xs mt-4 text-caption" style={{ color: currentTheme.colors.textMuted }}>
                    Synthèse issue de {normalizedMarkers.length} biomarqueurs analysés
                  </p>
                </div>

                <div
                  className="p-6 rounded-sm border blood-glass blood-grain"
                  style={{ backgroundColor: currentTheme.colors.surface, borderColor: currentTheme.colors.border }}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <Beaker className="w-5 h-5" style={{ color: currentTheme.colors.primary }} />
                    <h2 className="text-heading-4">Heatmap systémique</h2>
                  </div>
                  <InteractiveHeatmap
                    categories={panelGroups.map((panel) => ({
                      key: panel.id,
                      label: panel.title,
                      score: panel.score,
                      markerCount: panel.markers.length,
                      criticalCount: panel.markers.filter(m => m.status === 'critical').length,
                    }))}
                    onCategoryClick={(categoryKey) => setActiveTab("biomarkers")}
                  />
                  <p className="text-caption mt-4" style={{ color: currentTheme.colors.textMuted }}>
                    Cliquez sur une catégorie pour explorer les biomarqueurs
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                {panelGroups.map((panel, index) => {
                  const status = scoreToStatus(panel.score);
                  const Icon = PANEL_ICONS[panel.id] || Heart;
                  return (
                    <AnimatedStatCard
                      key={panel.id}
                      label={panel.title}
                      value={panel.score}
                      unit="%"
                      icon={Icon}
                      trend={panel.score >= 70 ? { value: '+' + (panel.score - 70), direction: 'up' } : { value: '-' + (70 - panel.score), direction: 'down' }}
                    />
                  );
                })}
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div
                  className="rounded border p-4"
                  style={{ backgroundColor: currentTheme.colors.surface, borderColor: currentTheme.colors.border }}
                >
                  <StatusIndicator status="optimal" label="Optimal" />
                  <ul className="mt-3 space-y-2 text-sm">
                    {(summary.optimal || []).slice(0, 6).map((item) => (
                      <li key={item} className="text-muted-foreground">
                        {item}
                      </li>
                    ))}
                    {(summary.optimal || []).length === 0 && (
                      <li className="text-muted-foreground">Aucun marqueur optimal declare.</li>
                    )}
                  </ul>
                </div>
                <div
                  className="rounded border p-4"
                  style={{ backgroundColor: currentTheme.colors.surface, borderColor: currentTheme.colors.border }}
                >
                  <StatusIndicator status="suboptimal" label="A surveiller" />
                  <ul className="mt-3 space-y-2 text-sm">
                    {(summary.watch || []).slice(0, 6).map((item) => (
                      <li key={item} className="text-muted-foreground">
                        {item}
                      </li>
                    ))}
                    {(summary.watch || []).length === 0 && (
                      <li className="text-muted-foreground">Aucun point en surveillance.</li>
                    )}
                  </ul>
                </div>
                <div
                  className="rounded border p-4"
                  style={{ backgroundColor: currentTheme.colors.surface, borderColor: currentTheme.colors.border }}
                >
                  <StatusIndicator status="critical" label="Action requise" />
                  <ul className="mt-3 space-y-2 text-sm">
                    {(summary.action || []).slice(0, 6).map((item) => (
                      <li key={item} className="text-muted-foreground">
                        {item}
                      </li>
                    ))}
                    {(summary.action || []).length === 0 && (
                      <li className="text-muted-foreground">Aucune action critique detectee.</li>
                    )}
                  </ul>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="biomarkers">
              <div className="space-y-10">
                {panelGroups.map((panel) => {
                  const Icon = PANEL_ICONS[panel.id] || Heart;
                  return (
                    <section key={panel.id} className="space-y-4">
                      <div className="flex items-center gap-3">
                        <Icon className="w-5 h-5" style={{ color: currentTheme.colors.primary }} />
                        <div>
                          <h2 className="text-xl font-semibold">{panel.title}</h2>
                          <p className="text-sm" style={{ color: currentTheme.colors.textMuted }}>
                            {panel.subtitle}
                          </p>
                        </div>
                      </div>

                      {panel.markers.length === 0 ? (
                        <div
                          className="rounded border p-4 text-sm"
                          style={{ backgroundColor: currentTheme.colors.surface, borderColor: currentTheme.colors.border }}
                        >
                          Aucun biomarqueur renseigne pour ce panel.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {panel.markers.map((marker) => (
                            <div
                              key={marker.id}
                              className="rounded border p-4"
                              style={{ backgroundColor: currentTheme.colors.surface, borderColor: currentTheme.colors.border }}
                            >
                              <div className="flex items-start justify-between gap-3 mb-4">
                                <div>
                                  <p className="text-xs uppercase tracking-[0.15em]" style={{ color: currentTheme.colors.textMuted }}>
                                    {panel.title}
                                  </p>
                                  <h3 className="text-lg font-semibold">{marker.name}</h3>
                                  <p className="text-sm" style={{ color: currentTheme.colors.textMuted }}>
                                    {marker.value} {marker.unit}
                                  </p>
                                </div>
                                <StatusBadge status={marker.status} />
                              </div>

                              <GaugeWithRange
                                value={marker.value}
                                unit={marker.unit}
                                status={marker.status}
                                normalMin={marker.normalMin}
                                normalMax={marker.normalMax}
                                optimalMin={marker.optimalMin}
                                optimalMax={marker.optimalMax}
                              />

                              <BiomarkerRangeIndicator
                                value={marker.value}
                                unit={marker.unit}
                                status={marker.status}
                                normalMin={marker.normalMin}
                                normalMax={marker.normalMax}
                                optimalMin={marker.optimalMin}
                                optimalMax={marker.optimalMax}
                              />

                              <div className="mt-3">
                                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">Tendance</p>
                                <BiomarkerTrendChart
                                  data={marker.history}
                                  unit={marker.unit}
                                  status={marker.status}
                                  normalMin={marker.normalMin}
                                  normalMax={marker.normalMax}
                                  optimalMin={marker.optimalMin}
                                  optimalMax={marker.optimalMax}
                                />
                              </div>

                              {marker.interpretation && (
                                <p className="text-sm mt-3" style={{ color: currentTheme.colors.textMuted }}>
                                  {marker.interpretation}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </section>
                  );
                })}
              </div>
            </TabsContent>

            <TabsContent value="insights">
              {report?.aiReport ? (
                <div
                  className={`rounded border p-6 max-w-none ${
                    currentTheme.type === 'dark' ? 'prose prose-slate' : 'prose prose-amber'
                  }`}
                  style={{
                    backgroundColor: currentTheme.colors.surface,
                    borderColor: currentTheme.colors.border,
                    color: currentTheme.colors.text,
                    '--tw-prose-headings': currentTheme.colors.text,
                    '--tw-prose-body': currentTheme.colors.text,
                    '--tw-prose-bold': currentTheme.colors.text,
                    '--tw-prose-links': currentTheme.colors.primary,
                  } as React.CSSProperties}
                >
                  <ReactMarkdown>{report.aiReport}</ReactMarkdown>
                </div>
              ) : (
                <div
                  className="rounded border p-6"
                  style={{ backgroundColor: currentTheme.colors.surface, borderColor: currentTheme.colors.border }}
                >
                  <div className="flex flex-col items-center justify-center py-12">
                    <Loader2 className="w-10 h-10 animate-spin mb-4" style={{ color: currentTheme.colors.primary }} />
                    <h2 className="text-xl font-semibold mb-2">Génération du rapport AI en cours...</h2>
                    <p className="text-sm text-center max-w-md" style={{ color: currentTheme.colors.textMuted }}>
                      L'analyse approfondie de vos biomarqueurs est en cours de génération par notre IA médicale.
                      Rechargez la page dans quelques minutes.
                    </p>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
