import { BloodRadar } from "@/components/blood/BloodRadar";
import { useBloodTheme } from "@/components/blood/BloodThemeContext";
import { scoreToStatus } from "@/components/blood/overview/utils";
import type { BloodMarker } from "@/types/blood";

interface PercentileRadarProps {
  markers: BloodMarker[];
}

export default function PercentileRadar({ markers }: PercentileRadarProps) {
  const { theme } = useBloodTheme();
  const percentileMarkers = markers
    .filter((marker) => typeof marker.percentile === "number")
    .sort((a, b) => (a.percentile ?? 0) - (b.percentile ?? 0))
    .slice(0, 6);

  const data = percentileMarkers.map((marker) => ({
    key: marker.code,
    label: marker.name,
    score: marker.percentile ?? 0,
    status: scoreToStatus(marker.percentile ?? 0),
  }));

  if (!data.length) {
    return (
      <div className="py-10 text-center text-xs" style={{ color: theme.textSecondary }}>
        Percentiles indisponibles.
      </div>
    );
  }

  return <BloodRadar data={data} height={320} />;
}
