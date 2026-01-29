import { StatusBadge } from "@/components/blood/StatusBadge";
import { useBloodTheme } from "@/components/blood/BloodThemeContext";
import type { BloodMarker } from "@/types/blood";

interface KeyAlertsSectionProps {
  markers: BloodMarker[];
}

export default function KeyAlertsSection({ markers }: KeyAlertsSectionProps) {
  const { theme } = useBloodTheme();
  const critical = markers.filter((marker) => marker.status === "critical");
  const suboptimal = markers.filter((marker) => marker.status === "suboptimal");
  const alerts = [...critical, ...suboptimal].slice(0, 5);

  return (
    <div className="rounded-2xl border p-6" style={{ backgroundColor: theme.surface, borderColor: theme.borderDefault }}>
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold" style={{ color: theme.textPrimary }}>
          Alertes prioritaires
        </div>
        <span className="text-xs" style={{ color: theme.textTertiary }}>
          {alerts.length} marqueurs
        </span>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {alerts.length === 0 && (
          <div className="text-sm" style={{ color: theme.textSecondary }}>
            Aucun marqueur critique detecte.
          </div>
        )}
        {alerts.map((marker) => (
          <div
            key={marker.code}
            className="flex items-center justify-between rounded-xl border px-4 py-3"
            style={{ borderColor: theme.borderSubtle, backgroundColor: theme.surfaceMuted }}
          >
            <div>
              <div className="text-sm font-semibold" style={{ color: theme.textPrimary }}>
                {marker.name}
              </div>
              <div className="text-xs" style={{ color: theme.textTertiary }}>
                {marker.value} {marker.unit}
              </div>
            </div>
            <StatusBadge status={marker.status} />
          </div>
        ))}
      </div>
    </div>
  );
}
