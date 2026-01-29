import { useBloodTheme } from "@/components/blood/BloodThemeContext";
import ComingSoonMessage from "@/components/blood/trends/ComingSoonMessage";
import type { BloodReportData } from "@/types/blood";

interface TrendsTabProps {
  reportData: BloodReportData;
}

export default function TrendsTab({ reportData }: TrendsTabProps) {
  const { theme } = useBloodTheme();

  return (
    <div className="space-y-6 px-2 py-8 md:px-6">
      <div>
        <h2 className="text-lg font-semibold" style={{ color: theme.textPrimary }}>
          Trends
        </h2>
        <p className="text-sm" style={{ color: theme.textSecondary }}>
          Suivi temporel des biomarqueurs (bientot).
        </p>
      </div>
      <ComingSoonMessage />
    </div>
  );
}
