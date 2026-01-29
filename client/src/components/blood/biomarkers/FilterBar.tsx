import { useBloodTheme } from "@/components/blood/BloodThemeContext";
import { PANEL_LABELS } from "@/components/blood/overview/utils";
import type { PanelKey } from "@/types/blood";

interface FilterBarProps {
  activePanel: PanelKey | "all";
  onPanelChange: (panel: PanelKey | "all") => void;
  searchValue: string;
  onSearchChange: (value: string) => void;
}

const PANELS: PanelKey[] = [
  "hormonal",
  "thyroid",
  "metabolic",
  "inflammatory",
  "vitamins",
  "liver_kidney",
];

export default function FilterBar({
  activePanel,
  onPanelChange,
  searchValue,
  onSearchChange,
}: FilterBarProps) {
  const { theme } = useBloodTheme();

  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div className="flex flex-wrap gap-2">
        <button
          className="rounded-full px-3 py-1 text-xs font-semibold"
          style={{
            backgroundColor: activePanel === "all" ? theme.primaryBlue : theme.surfaceMuted,
            color: activePanel === "all" ? "white" : theme.textSecondary,
          }}
          onClick={() => onPanelChange("all")}
        >
          Tous
        </button>
        {PANELS.map((panel) => (
          <button
            key={panel}
            className="rounded-full px-3 py-1 text-xs font-semibold"
            style={{
              backgroundColor: activePanel === panel ? theme.primaryBlue : theme.surfaceMuted,
              color: activePanel === panel ? "white" : theme.textSecondary,
            }}
            onClick={() => onPanelChange(panel)}
          >
            {PANEL_LABELS[panel]}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <input
          value={searchValue}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Rechercher un marqueur"
          className="w-full rounded-md border px-3 py-2 text-sm"
          style={{
            borderColor: theme.borderDefault,
            backgroundColor: theme.surfaceMuted,
            color: theme.textPrimary,
          }}
        />
      </div>
    </div>
  );
}
