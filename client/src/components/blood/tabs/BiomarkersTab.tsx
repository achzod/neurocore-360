import { useMemo, useState } from "react";
import BiomarkerDetailModal from "@/components/blood/biomarkers/BiomarkerDetailModal";
import BiomarkerGrid from "@/components/blood/biomarkers/BiomarkerGrid";
import FilterBar from "@/components/blood/biomarkers/FilterBar";
import { useBloodTheme } from "@/components/blood/BloodThemeContext";
import type { BloodMarker, BloodReportData, PanelKey } from "@/types/blood";

interface BiomarkersTabProps {
  reportData: BloodReportData;
}

export default function BiomarkersTab({ reportData }: BiomarkersTabProps) {
  const { theme } = useBloodTheme();
  const [activePanel, setActivePanel] = useState<PanelKey | "all">("all");
  const [searchValue, setSearchValue] = useState("");
  const [selectedMarker, setSelectedMarker] = useState<BloodMarker | null>(null);

  const filteredMarkers = useMemo(() => {
    const normalizedSearch = searchValue.trim().toLowerCase();
    const filtered = reportData.markers.filter((marker) => {
      const panelMatch = activePanel === "all" || marker.panel === activePanel;
      const searchMatch = normalizedSearch
        ? marker.name.toLowerCase().includes(normalizedSearch) || marker.code.toLowerCase().includes(normalizedSearch)
        : true;
      return panelMatch && searchMatch;
    });

    const statusRank: Record<BloodMarker["status"], number> = {
      critical: 0,
      suboptimal: 1,
      normal: 2,
      optimal: 3,
    };

    return filtered.sort((a, b) => {
      if (statusRank[a.status] !== statusRank[b.status]) {
        return statusRank[a.status] - statusRank[b.status];
      }
      return a.name.localeCompare(b.name);
    });
  }, [activePanel, reportData.markers, searchValue]);

  return (
    <div className="space-y-6 px-2 py-8 md:px-6">
      <div>
        <h2 className="text-lg font-semibold" style={{ color: theme.textPrimary }}>
          Biomarqueurs
        </h2>
        <p className="text-sm" style={{ color: theme.textSecondary }}>
          Filtre tes marqueurs et ouvre les fiches detaillees.
        </p>
      </div>

      <FilterBar
        activePanel={activePanel}
        onPanelChange={setActivePanel}
        searchValue={searchValue}
        onSearchChange={setSearchValue}
      />

      <BiomarkerGrid markers={filteredMarkers} onSelect={setSelectedMarker} />

      <BiomarkerDetailModal
        marker={selectedMarker}
        isOpen={Boolean(selectedMarker)}
        onClose={() => setSelectedMarker(null)}
      />
    </div>
  );
}
