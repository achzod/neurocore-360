import { useMemo } from "react";
import { useBloodTheme } from "@/components/blood/BloodThemeContext";
import AnalysisSubTabs from "@/components/blood/analysis/AnalysisSubTabs";
import { parseAIAnalysis } from "@/lib/bloodAnalysisParser";
import type { BloodReportData } from "@/types/blood";

interface AnalysisTabProps {
  reportData: BloodReportData;
}

export default function AnalysisTab({ reportData }: AnalysisTabProps) {
  const { theme } = useBloodTheme();
  const parsed = useMemo(() => parseAIAnalysis(reportData.aiAnalysis), [reportData.aiAnalysis]);

  return (
    <div className="space-y-6 px-2 py-8 md:px-6">
      <div>
        <h2 className="text-lg font-semibold" style={{ color: theme.textPrimary }}>
          Analyse detaillee
        </h2>
        <p className="text-sm" style={{ color: theme.textSecondary }}>
          Lecture structuree des systemes, patterns et correlations.
        </p>
      </div>

      <AnalysisSubTabs
        systems={parsed.systems}
        patterns={parsed.patterns}
        correlations={reportData.correlations}
      />
    </div>
  );
}
