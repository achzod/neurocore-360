import { AnimatedNumber } from "@/components/blood/AnimatedNumber";
import { useBloodTheme } from "@/components/blood/BloodThemeContext";
import { ThemeToggle } from "@/components/blood/ThemeToggle";
import { TAB_ITEMS, TabKey } from "@/components/blood/BloodTabs";

interface BloodSidebarProps {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  score: number;
  progress: number;
  patientName: string;
}

export default function BloodSidebar({
  activeTab,
  onTabChange,
  score,
  progress,
  patientName,
}: BloodSidebarProps) {
  const { theme } = useBloodTheme();

  return (
    <div
      className="flex h-full w-60 flex-col border-r px-5 py-6"
      style={{ backgroundColor: theme.surface, borderColor: theme.borderDefault }}
    >
      <div className="space-y-4">
        <div className="text-xs uppercase tracking-[0.3em]" style={{ color: theme.textTertiary }}>
          Blood Analysis
        </div>
        <div className="text-lg font-semibold" style={{ color: theme.textPrimary }}>
          {patientName}
        </div>
        <div
          className="rounded-2xl border px-4 py-3"
          style={{ backgroundColor: theme.surfaceMuted, borderColor: theme.borderSubtle }}
        >
          <div className="text-[11px] uppercase tracking-[0.2em]" style={{ color: theme.textTertiary }}>
            Score global
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-semibold" style={{ color: theme.textPrimary }}>
              <AnimatedNumber value={score} decimals={0} />
            </span>
            <span className="text-xs" style={{ color: theme.textTertiary }}>
              / 100
            </span>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.2em]" style={{ color: theme.textTertiary }}>
            <span>Progress</span>
            <span>{progress}%</span>
          </div>
          <div className="h-1.5 w-full rounded-full" style={{ backgroundColor: theme.borderSubtle }}>
            <div
              className="h-full rounded-full"
              style={{ width: `${progress}%`, backgroundColor: theme.primaryBlue }}
            />
          </div>
        </div>
      </div>

      <nav className="mt-8 flex flex-1 flex-col gap-2">
        {TAB_ITEMS.map((tab) => {
          const isActive = tab.key === activeTab;
          return (
            <button
              key={tab.key}
              onClick={() => onTabChange(tab.key)}
              className="flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors"
              style={{
                color: isActive ? theme.primaryBlue : theme.textSecondary,
                backgroundColor: isActive ? `${theme.primaryBlue}1A` : "transparent",
              }}
            >
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="pt-6">
        <ThemeToggle />
      </div>
    </div>
  );
}
