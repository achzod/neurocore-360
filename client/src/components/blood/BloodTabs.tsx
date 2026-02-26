import { useBloodTheme } from "./BloodThemeContext";
import { motion } from "framer-motion";
import {
  Activity,
  BarChart3,
  Brain,
  Clipboard,
  TrendingUp,
  BookOpen,
  Sparkles,
} from "lucide-react";

export type BloodTabKey = "overview" | "biomarkers" | "analysis" | "protocols" | "trends" | "sources";

export interface BloodTab {
  key: BloodTabKey;
  label: string;
  shortLabel?: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number;
  premium?: boolean;
}

interface BloodTabsProps {
  activeTab: BloodTabKey;
  onTabChange: (tab: BloodTabKey) => void;
  tabs?: BloodTab[];
}

const DEFAULT_TABS: BloodTab[] = [
  { key: "overview", label: "Vue d'ensemble", shortLabel: "Aperçu", icon: Activity },
  { key: "biomarkers", label: "Biomarqueurs", shortLabel: "Bio", icon: BarChart3 },
  { key: "analysis", label: "Analyse IA", shortLabel: "IA", icon: Brain, premium: true },
  { key: "protocols", label: "Protocoles", shortLabel: "Proto", icon: Clipboard },
  { key: "trends", label: "Évolution", shortLabel: "Trends", icon: TrendingUp, badge: "Bientôt" },
  { key: "sources", label: "Sources", shortLabel: "Refs", icon: BookOpen },
];

export function BloodTabs({ activeTab, onTabChange, tabs = DEFAULT_TABS }: BloodTabsProps) {
  const { theme, mode } = useBloodTheme();

  return (
    <div
      className="sticky top-[73px] z-30"
      style={{
        background: mode === "dark"
          ? "linear-gradient(180deg, rgba(3, 7, 18, 0.95) 0%, rgba(3, 7, 18, 0.85) 100%)"
          : "linear-gradient(180deg, rgba(250, 250, 250, 0.95) 0%, rgba(250, 250, 250, 0.85) 100%)",
        backdropFilter: "blur(20px) saturate(180%)",
        WebkitBackdropFilter: "blur(20px) saturate(180%)",
        borderBottom: `1px solid ${theme.borderSubtle}`,
      }}
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {/* Desktop Tabs */}
        <nav className="hidden sm:flex items-center gap-1 py-2" role="tablist">
          {tabs.map((tab, index) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            const isDisabled = !!tab.badge;

            return (
              <motion.button
                key={tab.key}
                onClick={() => !isDisabled && onTabChange(tab.key)}
                disabled={isDisabled}
                role="tab"
                aria-selected={isActive}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05, duration: 0.3 }}
                className="relative flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300"
                style={{
                  color: isActive ? theme.primaryBlue : isDisabled ? theme.textTertiary : theme.textSecondary,
                  cursor: isDisabled ? "not-allowed" : "pointer",
                  background: isActive
                    ? theme.primaryGlow
                    : "transparent",
                }}
                whileHover={!isDisabled ? {
                  scale: 1.02,
                  background: isActive ? theme.primaryGlow : theme.surfaceMuted,
                } : undefined}
                whileTap={!isDisabled ? { scale: 0.98 } : undefined}
              >
                {/* Active indicator glow */}
                {isActive && (
                  <motion.div
                    layoutId="tabGlow"
                    className="absolute inset-0 rounded-xl"
                    style={{
                      background: `linear-gradient(135deg, ${theme.primaryGlow} 0%, transparent 100%)`,
                      border: `1px solid ${theme.borderGlow}`,
                    }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}

                <span className="relative z-10 flex items-center gap-2.5">
                  <span
                    className="transition-transform duration-300"
                    style={{
                      transform: isActive ? "scale(1.1)" : "scale(1)",
                      display: "flex",
                    }}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="tracking-wide">{tab.label}</span>

                  {tab.premium && isActive && (
                    <Sparkles
                      className="h-3 w-3 animate-pulse"
                      style={{ color: theme.accentGold }}
                    />
                  )}
                </span>

                {tab.badge && (
                  <span
                    className="relative z-10 ml-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
                    style={{
                      backgroundColor: theme.surfaceMuted,
                      color: theme.textTertiary,
                      border: `1px solid ${theme.borderSubtle}`,
                    }}
                  >
                    {tab.badge}
                  </span>
                )}
              </motion.button>
            );
          })}
        </nav>

        {/* Mobile Tabs - Scrollable with gradient fade */}
        <div className="sm:hidden relative">
          <div
            className="absolute left-0 top-0 bottom-0 w-8 z-10 pointer-events-none"
            style={{
              background: `linear-gradient(90deg, ${theme.background} 0%, transparent 100%)`,
            }}
          />
          <div
            className="absolute right-0 top-0 bottom-0 w-8 z-10 pointer-events-none"
            style={{
              background: `linear-gradient(270deg, ${theme.background} 0%, transparent 100%)`,
            }}
          />

          <nav
            className="flex items-center gap-1 py-2 overflow-x-auto scrollbar-hide px-2"
            role="tablist"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              const isDisabled = !!tab.badge;

              return (
                <button
                  key={tab.key}
                  onClick={() => !isDisabled && onTabChange(tab.key)}
                  disabled={isDisabled}
                  role="tab"
                  aria-selected={isActive}
                  className="relative flex-shrink-0 flex items-center gap-2 px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all duration-200"
                  style={{
                    color: isActive ? theme.primaryBlue : isDisabled ? theme.textTertiary : theme.textSecondary,
                    cursor: isDisabled ? "not-allowed" : "pointer",
                    background: isActive ? theme.primaryGlow : "transparent",
                    border: isActive ? `1px solid ${theme.borderGlow}` : "1px solid transparent",
                  }}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.shortLabel || tab.label}</span>
                  {tab.badge && (
                    <span
                      className="rounded-full px-1.5 py-0.5 text-[9px] font-semibold"
                      style={{
                        backgroundColor: theme.surfaceMuted,
                        color: theme.textTertiary,
                      }}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>
    </div>
  );
}
