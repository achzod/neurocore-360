import { Heart, LucideIcon, Activity, TrendingUp, Flame, Shield, Beaker } from "lucide-react";
import { StatusBadge } from "@/components/blood/StatusBadge";
import { BiomarkerRangeIndicator } from "@/components/blood/BiomarkerRangeIndicator";
import { BiomarkerBar } from "@/components/blood/BiomarkerBar";
import { Theme } from "@/components/ultrahuman/types";

const PANEL_ICONS: Record<string, LucideIcon> = {
  hormonal: TrendingUp,
  thyroid: Activity,
  metabolic: Flame,
  inflammation: Shield,
  vitamins: Activity,
  liver_kidney: Beaker,
};

type NormalizedMarker = {
  id: string;
  name: string;
  value: number;
  unit: string;
  status: "optimal" | "normal" | "suboptimal" | "critical";
  normalMin?: number;
  normalMax?: number;
  optimalMin?: number;
  optimalMax?: number;
  interpretation?: string;
  panelId?: string;
  panelTitle?: string;
};

type PanelGroup = {
  id: string;
  title: string;
  subtitle?: string;
  markers: NormalizedMarker[];
  score: number;
};

interface BiomarkersTabProps {
  panelGroups: PanelGroup[];
  currentTheme: Theme;
}

export function BiomarkersTab({ panelGroups, currentTheme }: BiomarkersTabProps) {
  return (
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
                Aucun biomarqueur renseigné pour ce panel.
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
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold">{marker.name}</h3>
                        <p className="text-sm" style={{ color: currentTheme.colors.textMuted }}>
                          {marker.value} {marker.unit}
                        </p>
                      </div>
                      <StatusBadge status={marker.status} />
                    </div>

                    <BiomarkerBar
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
  );
}
