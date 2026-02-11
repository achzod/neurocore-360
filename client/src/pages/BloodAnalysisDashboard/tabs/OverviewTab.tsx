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

const scoreToStatus = (score: number): "optimal" | "normal" | "suboptimal" | "critical" => {
  if (score >= 80) return "optimal";
  if (score >= 65) return "normal";
  if (score >= 45) return "suboptimal";
  return "critical";
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
  return (
    <>
      {/* Storytelling Introduction */}
      <div
        className="rounded border p-4 sm:p-6 mb-6 sm:mb-8"
        style={{ backgroundColor: currentTheme.colors.surface, borderColor: currentTheme.colors.border }}
      >
        <div className="max-w-3xl">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight mb-3 sm:mb-4" style={{ color: currentTheme.colors.text }}>
            Bienvenue dans ton Blood Analysis
          </h2>
          <div className="space-y-3 sm:space-y-4 text-sm sm:text-base" style={{ color: currentTheme.colors.text, lineHeight: '1.7' }}>
            <p>
              Tes biomarqueurs racontent une histoire. Chaque valeur, chaque marqueur est une pièce du puzzle qui révèle
              comment ton corps fonctionne réellement, au dela des symptomes, au dela des sensations.
            </p>
            <p>
              Cette analyse premium va au dela des "ranges normaux" classiques. Nous utilisons des ranges optimaux,
              une lecture systémique et une approche de performance pour identifier non seulement ce qui ne va pas,
              mais surtout <strong>comment maximiser ton potentiel physiologique</strong>.
            </p>
            <p>
              Tu trouveras ici:
            </p>
            <ul className="list-disc list-outside space-y-2 pl-5 sm:pl-6 text-sm sm:text-base">
              <li>Une vue d'ensemble de ton profil métabolique complet</li>
              <li>Une analyse détaillée de chaque biomarqueur avec interprétation contextuelle</li>
              <li>Des axes d'optimisation prioritaires basés sur l'interconnexion de tes marqueurs</li>
              <li>Un plan d'action 90 jours concret et personnalisé</li>
              <li>Des protocoles de nutrition et supplémentation evidence based</li>
            </ul>
            <p className="pt-2">
              Prends le temps d'explorer chaque section. Chaque insight a été généré en analysant l'ensemble de tes données,
              pas juste marqueur par marqueur, mais dans leur contexte global.
            </p>
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
              <li key={item} className="text-muted-foreground break-words">
                {item}
              </li>
            ))}
            {(summary.optimal || []).length > 6 && (
              <li className="text-muted-foreground font-medium">
                +{(summary.optimal || []).length - 6} autres...
              </li>
            )}
            {(summary.optimal || []).length === 0 && (
              <li className="text-muted-foreground">Aucun marqueur optimal détecté.</li>
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
              <li key={item} className="text-muted-foreground break-words">
                {item}
              </li>
            ))}
            {(summary.watch || []).length > 6 && (
              <li className="text-muted-foreground font-medium">
                +{(summary.watch || []).length - 6} autres...
              </li>
            )}
            {(summary.watch || []).length === 0 && (
              <li className="text-muted-foreground">Aucun marqueur sous surveillance.</li>
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
              <li key={item} className="text-muted-foreground break-words">
                {item}
              </li>
            ))}
            {(summary.action || []).length > 6 && (
              <li className="text-muted-foreground font-medium">
                +{(summary.action || []).length - 6} autres...
              </li>
            )}
            {(summary.action || []).length === 0 && (
              <li className="text-muted-foreground">Aucune action critique détectée.</li>
            )}
          </ul>
        </div>
      </div>
    </>
  );
}
