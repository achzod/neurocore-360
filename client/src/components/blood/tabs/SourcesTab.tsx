import { useBloodTheme } from "@/components/blood/BloodThemeContext";
import CitationsByPanel from "@/components/blood/sources/CitationsByPanel";
import type { BloodReportData } from "@/types/blood";

interface SourcesTabProps {
  reportData: BloodReportData;
}

export default function SourcesTab({ reportData }: SourcesTabProps) {
  const { theme } = useBloodTheme();

  return (
    <div className="space-y-6 px-2 py-8 md:px-6">
      <div>
        <h2 className="text-lg font-semibold" style={{ color: theme.textPrimary }}>
          Sources scientifiques
        </h2>
        <p className="text-sm" style={{ color: theme.textSecondary }}>
          Citations regroupees par panel.
        </p>
      </div>

      <CitationsByPanel sources={reportData.sources} />
    </div>
  );
}
