import { useMemo, useState } from "react";
import type { ComponentType } from "react";
import { motion } from "framer-motion";
import { useBloodTheme } from "@/components/blood/BloodThemeContext";
import OverviewTab from "@/components/blood/tabs/OverviewTab";
import BiomarkersTab from "@/components/blood/tabs/BiomarkersTab";
import AnalysisTab from "@/components/blood/tabs/AnalysisTab";
import ProtocolTab from "@/components/blood/tabs/ProtocolTab";
import TrendsTab from "@/components/blood/tabs/TrendsTab";
import SourcesTab from "@/components/blood/tabs/SourcesTab";
import type { BloodReportData } from "@/types/blood";

export type TabKey = "overview" | "biomarkers" | "analysis" | "protocol" | "trends" | "sources";

interface Tab {
  key: TabKey;
  label: string;
  component: ComponentType<{ reportData: BloodReportData }>;
}

export const TAB_ITEMS: Array<Pick<Tab, "key" | "label">> = [
  { key: "overview", label: "Overview" },
  { key: "biomarkers", label: "Biomarkers" },
  { key: "analysis", label: "Analysis" },
  { key: "protocol", label: "Protocol" },
  { key: "trends", label: "Trends" },
  { key: "sources", label: "Sources" },
];

const TABS: Tab[] = [
  { key: "overview", label: "Overview", component: OverviewTab },
  { key: "biomarkers", label: "Biomarkers", component: BiomarkersTab },
  { key: "analysis", label: "Analysis", component: AnalysisTab },
  { key: "protocol", label: "Protocol", component: ProtocolTab },
  { key: "trends", label: "Trends", component: TrendsTab },
  { key: "sources", label: "Sources", component: SourcesTab },
];

interface BloodTabsProps {
  reportData: BloodReportData;
  activeTab?: TabKey;
  onTabChange?: (tab: TabKey) => void;
}

export default function BloodTabs({ reportData, activeTab, onTabChange }: BloodTabsProps) {
  const [internalTab, setInternalTab] = useState<TabKey>("overview");
  const { theme } = useBloodTheme();

  const selectedTab = activeTab ?? internalTab;
  const setTab = onTabChange ?? setInternalTab;

  const ActiveComponent = useMemo(() => {
    return TABS.find((tab) => tab.key === selectedTab)?.component ?? OverviewTab;
  }, [selectedTab]);

  return (
    <div className="flex h-full flex-col">
      <div
        className="sticky top-0 z-10 border-b"
        style={{ backgroundColor: theme.background, borderColor: theme.borderDefault }}
      >
        <div className="flex gap-1 overflow-x-auto px-6">
          {TABS.map((tab) => {
            const isActive = tab.key === selectedTab;
            return (
              <button
                key={tab.key}
                onClick={() => setTab(tab.key)}
                className="relative whitespace-nowrap px-4 py-3 text-sm font-medium transition-colors"
                style={{ color: isActive ? theme.primaryBlue : theme.textSecondary }}
              >
                {tab.label}
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute bottom-0 left-0 right-0 h-0.5"
                    style={{ backgroundColor: theme.primaryBlue }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <motion.div
          key={selectedTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.2 }}
        >
          <ActiveComponent reportData={reportData} />
        </motion.div>
      </div>
    </div>
  );
}
