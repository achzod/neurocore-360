import { useBloodTheme } from "@/components/blood/BloodThemeContext";
import LifestyleChecklist from "@/components/blood/protocol/LifestyleChecklist";
import ProtocolTimeline from "@/components/blood/protocol/ProtocolTimeline";
import SupplementsTable from "@/components/blood/protocol/SupplementsTable";
import type { BloodReportData } from "@/types/blood";

interface ProtocolTabProps {
  reportData: BloodReportData;
}

export default function ProtocolTab({ reportData }: ProtocolTabProps) {
  const { theme } = useBloodTheme();

  return (
    <div className="space-y-8 px-2 py-8 md:px-6">
      <div>
        <h2 className="text-lg font-semibold" style={{ color: theme.textPrimary }}>
          Protocole
        </h2>
        <p className="text-sm" style={{ color: theme.textSecondary }}>
          Timeline 90 jours, supplements et priorites lifestyle.
        </p>
      </div>

      <ProtocolTimeline steps={reportData.protocolSteps} />

      <div className="space-y-4">
        <div className="text-sm font-semibold" style={{ color: theme.textPrimary }}>
          Supplements
        </div>
        <SupplementsTable supplements={reportData.supplements} />
      </div>

      <LifestyleChecklist />
    </div>
  );
}
