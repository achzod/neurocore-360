import { useState } from "react";
import { motion } from "framer-motion";
import { useBloodTheme } from "@/components/blood/BloodThemeContext";
import CorrelationCard from "@/components/blood/analysis/CorrelationCard";
import StructuredContent, { StructuredSection } from "@/components/blood/analysis/StructuredContent";
import type { CorrelationInsight } from "@/types/blood";

type SubTabKey = "systems" | "patterns" | "correlations";

interface AnalysisSubTabsProps {
  systems: StructuredSection[];
  patterns: StructuredSection[];
  correlations: CorrelationInsight[];
}

const SUB_TABS: Array<{ key: SubTabKey; label: string }> = [
  { key: "systems", label: "Systems" },
  { key: "patterns", label: "Patterns" },
  { key: "correlations", label: "Correlations" },
];

export default function AnalysisSubTabs({ systems, patterns, correlations }: AnalysisSubTabsProps) {
  const { theme } = useBloodTheme();
  const [activeTab, setActiveTab] = useState<SubTabKey>("systems");

  return (
    <div className="space-y-6">
      <div className="flex gap-2 border-b" style={{ borderColor: theme.borderDefault }}>
        {SUB_TABS.map((tab) => {
          const isActive = tab.key === activeTab;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="relative px-4 py-3 text-sm font-medium"
              style={{ color: isActive ? theme.primaryBlue : theme.textSecondary }}
            >
              {tab.label}
              {isActive && (
                <motion.div
                  layoutId="analysisSubTab"
                  className="absolute bottom-0 left-0 right-0 h-0.5"
                  style={{ backgroundColor: theme.primaryBlue }}
                />
              )}
            </button>
          );
        })}
      </div>

      {activeTab === "systems" && <StructuredContent sections={systems} />}
      {activeTab === "patterns" && <StructuredContent sections={patterns} />}
      {activeTab === "correlations" && (
        <div className="grid gap-4 md:grid-cols-2">
          {correlations.length ? (
            correlations.map((item, idx) => <CorrelationCard key={`${item.markerCode}-${idx}`} insight={item} />)
          ) : (
            <div className="text-sm" style={{ color: theme.textSecondary }}>
              Aucune correlation disponible.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
