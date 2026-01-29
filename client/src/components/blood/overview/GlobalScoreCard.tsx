import { AnimatedNumber } from "@/components/blood/AnimatedNumber";
import { StatusBadge } from "@/components/blood/StatusBadge";
import { useBloodTheme } from "@/components/blood/BloodThemeContext";
import type { DerivedMetrics } from "@/types/blood";
import { scoreToStatus } from "@/components/blood/overview/utils";

interface GlobalScoreCardProps {
  score: number;
  derivedMetrics: DerivedMetrics;
}

export default function GlobalScoreCard({ score, derivedMetrics }: GlobalScoreCardProps) {
  const { theme } = useBloodTheme();
  const anabolicStatus = typeof derivedMetrics.anabolicIndex === "number" ? scoreToStatus(derivedMetrics.anabolicIndex) : "normal";
  const recompStatus =
    typeof derivedMetrics.recompReadiness === "number" ? scoreToStatus(derivedMetrics.recompReadiness) : "normal";
  const diabetesStatus =
    typeof derivedMetrics.diabetesRisk?.score === "number"
      ? scoreToStatus(100 - derivedMetrics.diabetesRisk.score)
      : "normal";

  return (
    <div
      className="rounded-2xl border p-6"
      style={{ backgroundColor: theme.surface, borderColor: theme.borderDefault }}
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.2em]" style={{ color: theme.textTertiary }}>
            Score global
          </div>
          <div className="mt-2 text-4xl font-semibold" style={{ color: theme.textPrimary }}>
            <AnimatedNumber value={score} decimals={0} />
          </div>
        </div>
        <StatusBadge status={scoreToStatus(score)} />
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border px-4 py-3" style={{ borderColor: theme.borderSubtle }}>
          <div className="text-xs uppercase tracking-[0.2em]" style={{ color: theme.textTertiary }}>
            Index anabolique
          </div>
          <div className="mt-2 flex items-center justify-between">
            <div className="text-lg font-semibold" style={{ color: theme.textPrimary }}>
              {typeof derivedMetrics.anabolicIndex === "number" ? (
                <AnimatedNumber value={derivedMetrics.anabolicIndex} decimals={0} />
              ) : (
                "N/A"
              )}
            </div>
            <StatusBadge status={anabolicStatus} />
          </div>
        </div>
        <div className="rounded-xl border px-4 py-3" style={{ borderColor: theme.borderSubtle }}>
          <div className="text-xs uppercase tracking-[0.2em]" style={{ color: theme.textTertiary }}>
            Recomp readiness
          </div>
          <div className="mt-2 flex items-center justify-between">
            <div className="text-lg font-semibold" style={{ color: theme.textPrimary }}>
              {typeof derivedMetrics.recompReadiness === "number" ? (
                <AnimatedNumber value={derivedMetrics.recompReadiness} decimals={0} />
              ) : (
                "N/A"
              )}
            </div>
            <StatusBadge status={recompStatus} />
          </div>
        </div>
        <div className="rounded-xl border px-4 py-3" style={{ borderColor: theme.borderSubtle }}>
          <div className="text-xs uppercase tracking-[0.2em]" style={{ color: theme.textTertiary }}>
            Diabetes risk
          </div>
          <div className="mt-2 flex items-center justify-between">
            <div className="text-lg font-semibold" style={{ color: theme.textPrimary }}>
              {typeof derivedMetrics.diabetesRisk?.score === "number" ? (
                <>
                  <AnimatedNumber value={derivedMetrics.diabetesRisk.score} decimals={0} />/100
                </>
              ) : (
                "N/A"
              )}
            </div>
            <StatusBadge status={diabetesStatus} />
          </div>
        </div>
      </div>
    </div>
  );
}
