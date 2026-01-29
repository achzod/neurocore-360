import { useMemo, useState } from "react";
import { BloodRadar } from "@/components/blood/BloodRadar";
import { PANEL_LABELS } from "@/components/blood/overview/utils";
import { useBloodTheme } from "@/components/blood/BloodThemeContext";
import type { BloodMarker, PanelKey } from "@/types/blood";

const PANEL_OPTIONS: PanelKey[] = [
  "hormonal",
  "thyroid",
  "metabolic",
  "inflammatory",
  "vitamins",
  "liver_kidney",
];

interface PanelRadarProps {
  markers: BloodMarker[];
}

export default function PanelRadar({ markers }: PanelRadarProps) {
  const [panel, setPanel] = useState<PanelKey>("hormonal");
  const { theme } = useBloodTheme();

  const data = useMemo(() => {
    return markers
      .filter((marker) => marker.panel === panel)
      .map((marker) => ({
        key: marker.code,
        label: marker.name,
        score: marker.score,
        status: marker.status,
      }));
  }, [markers, panel]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em]" style={{ color: theme.textTertiary }}>
        <span>Panel</span>
        <select
          className="rounded-md border px-2 py-1 text-xs"
          value={panel}
          onChange={(event) => setPanel(event.target.value as PanelKey)}
          style={{ backgroundColor: theme.surfaceMuted, borderColor: theme.borderDefault, color: theme.textPrimary }}
        >
          {PANEL_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {PANEL_LABELS[option]}
            </option>
          ))}
        </select>
      </div>
      {data.length ? (
        <BloodRadar data={data} height={320} />
      ) : (
        <div className="py-10 text-center text-xs" style={{ color: theme.textSecondary }}>
          Aucun marqueur disponible pour ce panel.
        </div>
      )}
    </div>
  );
}
