import { CheckCircle2, TrendingDown, TrendingUp } from "lucide-react";
import { useBloodTheme } from "@/components/blood/BloodThemeContext";
import { PANEL_LABELS } from "@/components/blood/overview/utils";
import { StatusBadge } from "@/components/blood/StatusBadge";
import { BiomarkerRangeIndicator } from "@/components/blood/BiomarkerRangeIndicator";
import type { BloodMarker } from "@/types/blood";

interface BiomarkerCardCompactProps {
  marker: BloodMarker;
  onClick: () => void;
}

const getDeltaLabel = (marker: BloodMarker) => {
  if (marker.optimalMin === null || marker.optimalMax === null) {
    return { label: "Range optimal non defini", icon: CheckCircle2 };
  }
  if (marker.value < marker.optimalMin) {
    const pct = Math.abs(((marker.value - marker.optimalMin) / marker.optimalMin) * 100);
    return { label: `${pct.toFixed(0)}% sous l optimal`, icon: TrendingDown };
  }
  if (marker.value > marker.optimalMax) {
    const pct = ((marker.value - marker.optimalMax) / marker.optimalMax) * 100;
    return { label: `${pct.toFixed(0)}% au dessus de l optimal`, icon: TrendingUp };
  }
  return { label: "Dans la zone optimale", icon: CheckCircle2 };
};

export default function BiomarkerCardCompact({ marker, onClick }: BiomarkerCardCompactProps) {
  const { theme } = useBloodTheme();
  const delta = getDeltaLabel(marker);
  const DeltaIcon = delta.icon;

  return (
    <button
      onClick={onClick}
      className="rounded-2xl border p-4 text-left transition hover:-translate-y-0.5"
      style={{ backgroundColor: theme.surface, borderColor: theme.borderDefault }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-[0.2em]" style={{ color: theme.textTertiary }}>
            {PANEL_LABELS[marker.panel]}
          </div>
          <div className="text-lg font-semibold" style={{ color: theme.textPrimary }}>
            {marker.name}
          </div>
          <div className="text-sm" style={{ color: theme.textSecondary }}>
            {marker.value} {marker.unit}
          </div>
        </div>
        <StatusBadge status={marker.status} />
      </div>

      <div className="mt-4">
        <BiomarkerRangeIndicator
          value={marker.value}
          unit={marker.unit}
          status={marker.status}
          normalMin={marker.normalMin ?? undefined}
          normalMax={marker.normalMax ?? undefined}
          optimalMin={marker.optimalMin ?? undefined}
          optimalMax={marker.optimalMax ?? undefined}
        />
      </div>

      <div className="mt-4 flex items-center gap-2 text-xs" style={{ color: theme.textSecondary }}>
        <DeltaIcon className="h-4 w-4" />
        <span>{delta.label}</span>
      </div>
    </button>
  );
}
