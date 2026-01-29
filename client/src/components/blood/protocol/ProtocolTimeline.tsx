import { useMemo } from "react";
import { useBloodTheme } from "@/components/blood/BloodThemeContext";
import PhaseCard from "@/components/blood/protocol/PhaseCard";
import type { ProtocolStep } from "@/types/blood";

interface ProtocolTimelineProps {
  steps: ProtocolStep[];
}

export default function ProtocolTimeline({ steps }: ProtocolTimelineProps) {
  const { theme } = useBloodTheme();

  const grouped = useMemo(() => {
    return {
      immediate: steps.filter((step) => step.phase === "immediate"),
      short_term: steps.filter((step) => step.phase === "short_term"),
      long_term: steps.filter((step) => step.phase === "long_term"),
    };
  }, [steps]);

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <PhaseCard
        title="0-30 jours"
        subtitle="Priorite immediate"
        items={grouped.immediate.map((step) => step.action)}
        accent={theme.primaryBlue}
      />
      <PhaseCard
        title="30-90 jours"
        subtitle="Optimisation"
        items={grouped.short_term.map((step) => step.action)}
        accent="#F59E0B"
      />
      <PhaseCard
        title="90 jours+"
        subtitle="Retest"
        items={grouped.long_term.map((step) => step.action)}
        accent="#10B981"
      />
    </div>
  );
}
