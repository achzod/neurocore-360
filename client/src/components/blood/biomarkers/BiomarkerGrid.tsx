import BiomarkerCardCompact from "@/components/blood/biomarkers/BiomarkerCardCompact";
import { useBloodTheme } from "@/components/blood/BloodThemeContext";
import type { BloodMarker } from "@/types/blood";

interface BiomarkerGridProps {
  markers: BloodMarker[];
  onSelect: (marker: BloodMarker) => void;
}

export default function BiomarkerGrid({ markers, onSelect }: BiomarkerGridProps) {
  const { theme } = useBloodTheme();

  if (!markers.length) {
    return (
      <div className="text-sm" style={{ color: theme.textSecondary }}>
        Aucun biomarqueur ne correspond.
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {markers.map((marker) => (
        <BiomarkerCardCompact key={marker.code} marker={marker} onClick={() => onSelect(marker)} />
      ))}
    </div>
  );
}
