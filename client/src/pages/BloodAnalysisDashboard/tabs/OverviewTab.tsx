import { Beaker, Heart, LucideIcon } from "lucide-react";
import { RadialScoreChart } from "@/components/blood/RadialScoreChart";
import { InteractiveHeatmap } from "@/components/blood/InteractiveHeatmap";
import { AnimatedStatCard } from "@/components/blood/AnimatedStatCard";
import { StatusIndicator } from "@/components/blood/StatusIndicator";
import { Theme } from "@/components/ultrahuman/types";
import { Activity, TrendingUp, Flame, Shield, Beaker as BeakerIcon } from "lucide-react";

const PANEL_ICONS: Record<string, LucideIcon> = {
  hormonal: TrendingUp,
  thyroid: Activity,
  metabolic: Flame,
  inflammation: Shield,
  vitamins: Activity,
  liver_kidney: BeakerIcon,
};

type PanelGroup = {
  id: string;
  title: string;
  subtitle?: string;
  markers: Array<{
    id: string;
    name: string;
    value: number;
    unit: string;
    status: "optimal" | "normal" | "suboptimal" | "critical";
  }>;
  score: number;
};

type Summary = {
  optimal?: string[];
  watch?: string[];
  action?: string[];
};

interface OverviewTabProps {
  globalScore: number;
  normalizedMarkers: unknown[];
  panelGroups: PanelGroup[];
  summary: Summary;
  currentTheme: Theme;
  setActiveTab: (tab: string) => void;
}

export function OverviewTab({
  globalScore,
  normalizedMarkers,
  panelGroups,
  summary,
  currentTheme,
  setActiveTab,
}: OverviewTabProps) {
  const optimalCount = summary.optimal?.length || 0;
  const watchCount = summary.watch?.length || 0;
  const actionCount = summary.action?.length || 0;
  const bestPanel = [...panelGroups]
    .filter((panel) => panel.markers.length > 0)
    .sort((a, b) => b.score - a.score)[0];
  const weakestPanel = [...panelGroups]
    .filter((panel) => panel.markers.length > 0)
    .sort((a, b) => a.score - b.score)[0];
  const kpiCards = [
    { label: "Biomarqueurs analysés", value: String(normalizedMarkers.length) },
    { label: "Marqueurs optimaux", value: `${optimalCount}` },
    { label: "Sous surveillance", value: `${watchCount}` },
    { label: "Points en action", value: `${actionCount}` },
    { label: "Panels couverts", value: `${panelGroups.filter((p) => p.markers.length > 0).length}/6` },
  ];

  return (
    <>
      {/* Storytelling Introduction */}
      <div
        className="rounded border p-4 sm:p-6 mb-6 sm:mb-8"
        style={{ backgroundColor: currentTheme.colors.surface, borderColor: currentTheme.colors.border }}
      >
        <div className="max-w-5xl">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight mb-3 sm:mb-4" style={{ color: currentTheme.colors.text }}>
            Synthèse stratégique de ton Blood Analysis
          </h2>
          <div className="space-y-3 sm:space-y-4 text-sm sm:text-base" style={{ color: currentTheme.colors.text, lineHeight: "1.7" }}>
            <p>
              Cette vue d&apos;ensemble condense ton dossier en décisions prioritaires. Le but est de transformer des chiffres
              biologiques en plan d&apos;exécution concret: quoi corriger en premier, quoi stabiliser et quoi optimiser.
            </p>
            <p>
              On s&apos;appuie sur des ranges optimaux et une lecture systémique pour dépasser la logique &quot;normal/anormal&quot;.
              L&apos;objectif final reste la performance réelle: énergie, récupération, recomposition et progression durable.
            </p>
          </div>

          <div className="mt-5 sm:mt-6 grid grid-cols-2 lg:grid-cols-5 gap-3">
            {kpiCards.map((card) => (
              <div
                key={card.label}
                className="rounded border px-3 py-3 sm:px-4"
                style={{ backgroundColor: currentTheme.colors.background, borderColor: currentTheme.colors.border }}
              >
                <p className="text-xs uppercase tracking-[0.14em]" style={{ color: currentTheme.colors.textMuted }}>
                  {card.label}
                </p>
                <p className="text-xl sm:text-2xl font-bold mt-1" style={{ color: currentTheme.colors.text }}>
                  {card.value}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Score Global & Heatmap */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 mb-8">
        <div
          className="flex flex-col items-center justify-center p-4 sm:p-6 rounded-sm border blood-glass blood-grain"
          style={{ backgroundColor: currentTheme.colors.surface, borderColor: currentTheme.colors.border }}
        >
          <RadialScoreChart
            score={globalScore}
            size={220}
            strokeWidth={8}
            label="SCORE GLOBAL"
            sublabel={`${normalizedMarkers.length} biomarqueurs`}
          />
          <p className="text-xs mt-4 text-caption text-center" style={{ color: currentTheme.colors.textMuted }}>
            Synthèse issue de {normalizedMarkers.length} biomarqueurs analysés
          </p>
          <p className="text-xs text-center mt-2" style={{ color: currentTheme.colors.textMuted }}>
            {bestPanel ? `Point fort: ${bestPanel.title} (${bestPanel.score}%)` : "Point fort: non disponible"}
            {" · "}
            {weakestPanel ? `Priorité: ${weakestPanel.title} (${weakestPanel.score}%)` : "Priorité: non disponible"}
          </p>
        </div>

        <div
          className="p-4 sm:p-6 rounded-sm border blood-glass blood-grain"
          style={{ backgroundColor: currentTheme.colors.surface, borderColor: currentTheme.colors.border }}
        >
          <div className="flex items-center gap-3 mb-4">
            <Beaker className="w-5 h-5 flex-shrink-0" style={{ color: currentTheme.colors.primary }} />
            <h2 className="text-base sm:text-lg font-semibold">Heatmap systémique</h2>
          </div>
          <InteractiveHeatmap
            categories={panelGroups.map((panel) => ({
              key: panel.id,
              label: panel.title,
              score: panel.score,
              markerCount: panel.markers.length,
              criticalCount: panel.markers.filter(m => m.status === 'critical').length,
            }))}
            onCategoryClick={() => setActiveTab("biomarkers")}
          />
          <p className="text-xs sm:text-sm mt-4" style={{ color: currentTheme.colors.textMuted }}>
            Cliquez sur une catégorie pour explorer les biomarqueurs
          </p>
        </div>
      </div>

      {/* Panel Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {panelGroups.map((panel) => {
          const Icon = PANEL_ICONS[panel.id] || Heart;
          return (
            <AnimatedStatCard
              key={panel.id}
              label={panel.title}
              value={panel.score}
              unit="%"
              icon={Icon}
            />
          );
        })}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <div
          className="rounded border p-4"
          style={{ backgroundColor: currentTheme.colors.surface, borderColor: currentTheme.colors.border }}
        >
          <StatusIndicator status="optimal" label="Optimal" />
          <ul className="mt-3 space-y-2 text-xs sm:text-sm">
            {(summary.optimal || []).slice(0, 6).map((item) => (
              <li key={item} className="break-words" style={{ color: currentTheme.colors.text }}>
                {item}
              </li>
            ))}
            {(summary.optimal || []).length > 6 && (
              <li className="font-medium" style={{ color: currentTheme.colors.textMuted }}>
                +{(summary.optimal || []).length - 6} autres...
              </li>
            )}
            {(summary.optimal || []).length === 0 && (
              <li style={{ color: currentTheme.colors.textMuted }}>Aucun marqueur optimal détecté.</li>
            )}
          </ul>
        </div>
        <div
          className="rounded border p-4"
          style={{ backgroundColor: currentTheme.colors.surface, borderColor: currentTheme.colors.border }}
        >
          <StatusIndicator status="suboptimal" label="A surveiller" />
          <ul className="mt-3 space-y-2 text-xs sm:text-sm">
            {(summary.watch || []).slice(0, 6).map((item) => (
              <li key={item} className="break-words" style={{ color: currentTheme.colors.text }}>
                {item}
              </li>
            ))}
            {(summary.watch || []).length > 6 && (
              <li className="font-medium" style={{ color: currentTheme.colors.textMuted }}>
                +{(summary.watch || []).length - 6} autres...
              </li>
            )}
            {(summary.watch || []).length === 0 && (
              <li style={{ color: currentTheme.colors.textMuted }}>Aucun marqueur sous surveillance.</li>
            )}
          </ul>
        </div>
        <div
          className="rounded border p-4"
          style={{ backgroundColor: currentTheme.colors.surface, borderColor: currentTheme.colors.border }}
        >
          <StatusIndicator status="critical" label="Action requise" />
          <ul className="mt-3 space-y-2 text-xs sm:text-sm">
            {(summary.action || []).slice(0, 6).map((item) => (
              <li key={item} className="break-words" style={{ color: currentTheme.colors.text }}>
                {item}
              </li>
            ))}
            {(summary.action || []).length > 6 && (
              <li className="font-medium" style={{ color: currentTheme.colors.textMuted }}>
                +{(summary.action || []).length - 6} autres...
              </li>
            )}
            {(summary.action || []).length === 0 && (
              <li style={{ color: currentTheme.colors.textMuted }}>Aucune action critique détectée.</li>
            )}
          </ul>
        </div>
      </div>
    </>
  );
}
