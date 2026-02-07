import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useBloodTheme } from "../BloodThemeContext";
import { BiomarkerCardPremium } from "@/components/BiomarkerCardPremium";
import { Filter } from "lucide-react";
import type { BloodMarker, PanelKey } from "@/types/blood";

interface BiomarkersTabProps {
  markers: BloodMarker[];
}

type StatusFilter = "all" | "optimal" | "normal" | "suboptimal" | "critical";
type PanelFilter = "all" | PanelKey;

export function BiomarkersTab({ markers }: BiomarkersTabProps) {
  const { theme } = useBloodTheme();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [panelFilter, setPanelFilter] = useState<PanelFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const panelLabels: Record<PanelKey, string> = {
    hormonal: "Hormonal",
    metabolic: "Métabolique",
    thyroid: "Thyroïde",
    inflammation: "Inflammatoire",
    vitamins: "Vitamines",
    liver_kidney: "Foie & Reins",
  };

  const statusLabels: Record<StatusFilter, string> = {
    all: "Tous",
    optimal: "Optimal",
    normal: "Normal",
    suboptimal: "Sous-optimal",
    critical: "Critique",
  };

  const filteredMarkers = markers.filter((marker) => {
    const statusMatch = statusFilter === "all" || marker.status === statusFilter;
    const panelMatch = panelFilter === "all" || marker.panel === panelFilter;
    const searchMatch =
      !searchQuery ||
      marker.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      marker.code.toLowerCase().includes(searchQuery.toLowerCase());
    return statusMatch && panelMatch && searchMatch;
  });

  const statusCounts = {
    all: markers.length,
    optimal: markers.filter((m) => m.status === "optimal").length,
    normal: markers.filter((m) => m.status === "normal").length,
    suboptimal: markers.filter((m) => m.status === "suboptimal").length,
    critical: markers.filter((m) => m.status === "critical").length,
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="space-y-6 pb-10"
    >
      {/* Filters */}
      <div
        className="sticky top-[129px] z-20 rounded-xl border p-4 backdrop-blur"
        style={{
          backgroundColor: theme.surface,
          opacity: 0.97,
          borderColor: theme.borderDefault,
        }}
      >
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-4 w-4" style={{ color: theme.textSecondary }} />
          <h3 className="text-sm font-semibold" style={{ color: theme.textPrimary }}>
            Filtres
          </h3>
        </div>

        {/* Search */}
        <input
          type="text"
          placeholder="Rechercher un marqueur..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-lg border px-4 py-2 text-sm outline-none transition-colors"
          style={{
            backgroundColor: theme.background,
            borderColor: theme.borderSubtle,
            color: theme.textPrimary,
          }}
        />

        {/* Status Filter */}
        <div className="mt-3 flex flex-wrap gap-2">
          {(Object.keys(statusLabels) as StatusFilter[]).map((status) => {
            const isActive = statusFilter === status;
            const count = statusCounts[status];

            return (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className="rounded-full px-3 py-1.5 text-xs font-medium transition-colors"
                style={{
                  backgroundColor: isActive ? theme.primaryBlue : theme.surfaceMuted,
                  color: isActive ? "white" : theme.textSecondary,
                  border: `1px solid ${isActive ? theme.primaryBlue : theme.borderSubtle}`,
                }}
              >
                {statusLabels[status]} ({count})
              </button>
            );
          })}
        </div>

        {/* Panel Filter */}
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            onClick={() => setPanelFilter("all")}
            className="rounded-full px-3 py-1.5 text-xs font-medium transition-colors"
            style={{
              backgroundColor: panelFilter === "all" ? theme.primaryBlue : theme.surfaceMuted,
              color: panelFilter === "all" ? "white" : theme.textSecondary,
              border: `1px solid ${panelFilter === "all" ? theme.primaryBlue : theme.borderSubtle}`,
            }}
          >
            Tous les systèmes
          </button>
          {(Object.keys(panelLabels) as PanelKey[]).map((panel) => {
            const isActive = panelFilter === panel;
            const count = markers.filter((m) => m.panel === panel).length;
            if (count === 0) return null;

            return (
              <button
                key={panel}
                onClick={() => setPanelFilter(panel)}
                className="rounded-full px-3 py-1.5 text-xs font-medium transition-colors"
                style={{
                  backgroundColor: isActive ? theme.primaryBlue : theme.surfaceMuted,
                  color: isActive ? "white" : theme.textSecondary,
                  border: `1px solid ${isActive ? theme.primaryBlue : theme.borderSubtle}`,
                }}
              >
                {panelLabels[panel]} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Results Count */}
      <div className="text-sm" style={{ color: theme.textSecondary }}>
        {filteredMarkers.length} marqueur{filteredMarkers.length !== 1 ? "s" : ""} trouvé{filteredMarkers.length !== 1 ? "s" : ""}
      </div>

      {/* Biomarkers Grid */}
      <AnimatePresence mode="popLayout">
        {filteredMarkers.length > 0 ? (
          <motion.div
            key="grid"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid gap-4 md:grid-cols-2"
          >
            {filteredMarkers.map((marker, index) => (
              <motion.div
                key={marker.code}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <BiomarkerCardPremium
                  marker={{
                    name: marker.name,
                    value: marker.value,
                    unit: marker.unit,
                    status: marker.status,
                    normalMin: marker.normalMin,
                    normalMax: marker.normalMax,
                  }}
                />
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="rounded-xl border p-8 text-center"
            style={{
              borderColor: theme.borderDefault,
              backgroundColor: theme.surface,
            }}
          >
            <p className="text-sm" style={{ color: theme.textSecondary }}>
              Aucun marqueur ne correspond à vos critères de recherche.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
