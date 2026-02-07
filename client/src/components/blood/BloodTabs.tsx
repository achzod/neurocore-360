import { useBloodTheme } from "./BloodThemeContext";
import { motion } from "framer-motion";
import {
  Activity,
  BarChart3,
  Brain,
  Clipboard,
  TrendingUp,
  BookOpen,
} from "lucide-react";

export type BloodTabKey = "overview" | "biomarkers" | "analysis" | "protocols" | "trends" | "sources";

export interface BloodTab {
  key: BloodTabKey;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number;
}

interface BloodTabsProps {
  activeTab: BloodTabKey;
  onTabChange: (tab: BloodTabKey) => void;
  tabs?: BloodTab[];
}

const DEFAULT_TABS: BloodTab[] = [
  { key: "overview", label: "Vue d'ensemble", icon: Activity },
  { key: "biomarkers", label: "Biomarqueurs", icon: BarChart3 },
  { key: "analysis", label: "Analyse IA", icon: Brain },
  { key: "protocols", label: "Protocoles", icon: Clipboard },
  { key: "trends", label: "Tendances", icon: TrendingUp, badge: "Bientôt" },
  { key: "sources", label: "Sources", icon: BookOpen },
];

export function BloodTabs({ activeTab, onTabChange, tabs = DEFAULT_TABS }: BloodTabsProps) {
  const { theme } = useBloodTheme();

  return (
    <div
      className="sticky top-[73px] z-30 border-b backdrop-blur"
      style={{
        backgroundColor: `${theme.background}CC`,
        borderColor: theme.borderSubtle,
      }}
    >
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex gap-1 overflow-x-auto scrollbar-hide">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            const isDisabled = !!tab.badge;

            return (
              <button
                key={tab.key}
                onClick={() => !isDisabled && onTabChange(tab.key)}
                disabled={isDisabled}
                className="relative flex items-center gap-2 whitespace-nowrap px-4 py-4 text-sm font-medium transition-colors"
                style={{
                  color: isActive ? theme.primaryBlue : theme.textSecondary,
                  cursor: isDisabled ? "not-allowed" : "pointer",
                  opacity: isDisabled ? 0.5 : 1,
                }}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span
                    className="ml-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                    style={{
                      backgroundColor: theme.surfaceMuted,
                      color: theme.textTertiary,
                    }}
                  >
                    {tab.badge}
                  </span>
                )}
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
    </div>
  );
}
