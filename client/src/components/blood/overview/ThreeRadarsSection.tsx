import GlobalRadar from "@/components/blood/overview/GlobalRadar";
import PanelRadar from "@/components/blood/overview/PanelRadar";
import PercentileRadar from "@/components/blood/overview/PercentileRadar";
import { useBloodTheme } from "@/components/blood/BloodThemeContext";
import type { BloodMarker, PanelScore } from "@/types/blood";

interface ThreeRadarsSectionProps {
  panelScores: PanelScore[];
  markers: BloodMarker[];
}

export default function ThreeRadarsSection({ panelScores, markers }: ThreeRadarsSectionProps) {
  const { theme } = useBloodTheme();

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="rounded-2xl border p-4" style={{ borderColor: theme.borderDefault, backgroundColor: theme.surface }}>
        <div className="text-xs uppercase tracking-[0.2em]" style={{ color: theme.textTertiary }}>
          Global radar
        </div>
        <GlobalRadar panelScores={panelScores} />
      </div>
      <div className="rounded-2xl border p-4" style={{ borderColor: theme.borderDefault, backgroundColor: theme.surface }}>
        <div className="text-xs uppercase tracking-[0.2em]" style={{ color: theme.textTertiary }}>
          Panel radar
        </div>
        <PanelRadar markers={markers} />
      </div>
      <div className="rounded-2xl border p-4" style={{ borderColor: theme.borderDefault, backgroundColor: theme.surface }}>
        <div className="text-xs uppercase tracking-[0.2em]" style={{ color: theme.textTertiary }}>
          Percentiles
        </div>
        <PercentileRadar markers={markers} />
      </div>
    </div>
  );
}
