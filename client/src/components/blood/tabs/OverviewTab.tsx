import GlobalScoreCard from "@/components/blood/overview/GlobalScoreCard";
import KeyAlertsSection from "@/components/blood/overview/KeyAlertsSection";
import QuickActionsSection from "@/components/blood/overview/QuickActionsSection";
import ThreeRadarsSection from "@/components/blood/overview/ThreeRadarsSection";
import { useBloodTheme } from "@/components/blood/BloodThemeContext";
import type { BloodReportData } from "@/types/blood";

interface OverviewTabProps {
  reportData: BloodReportData;
}

export default function OverviewTab({ reportData }: OverviewTabProps) {
  const { theme } = useBloodTheme();

  return (
    <div className="space-y-8 px-2 py-8 md:px-6">
      <div>
        <h2 className="text-lg font-semibold" style={{ color: theme.textPrimary }}>
          Vue d'ensemble
        </h2>
        <p className="text-sm" style={{ color: theme.textSecondary }}>
          Score global, radars et alertes critiques.
        </p>
      </div>

      <GlobalScoreCard score={reportData.globalScore} derivedMetrics={reportData.derivedMetrics} />

      <ThreeRadarsSection panelScores={reportData.panelScores} markers={reportData.markers} />

      <KeyAlertsSection markers={reportData.markers} />

      <QuickActionsSection />
    </div>
  );
}
