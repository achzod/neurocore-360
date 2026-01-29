import { useBloodTheme } from "@/components/blood/BloodThemeContext";
import type { CorrelationInsight } from "@/types/blood";

interface CorrelationCardProps {
  insight: CorrelationInsight;
}

const confidenceLabel = (value: CorrelationInsight["confidence"]) => {
  if (value === "high") return "Forte";
  if (value === "medium") return "Moyenne";
  return "Faible";
};

export default function CorrelationCard({ insight }: CorrelationCardProps) {
  const { theme } = useBloodTheme();

  return (
    <div className="rounded-2xl border p-5" style={{ borderColor: theme.borderDefault, backgroundColor: theme.surface }}>
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-[0.2em]" style={{ color: theme.textTertiary }}>
          {insight.markerCode}
        </div>
        <div className="text-xs" style={{ color: theme.textTertiary }}>
          Confiance {confidenceLabel(insight.confidence)}
        </div>
      </div>
      <div className="mt-3 text-sm" style={{ color: theme.textPrimary }}>
        {insight.insight}
      </div>
      {insight.recommendation && (
        <div className="mt-3 text-xs" style={{ color: theme.textSecondary }}>
          {insight.recommendation}
        </div>
      )}
    </div>
  );
}
