import { motion } from "framer-motion";
import { useBloodTheme } from "@/components/blood/BloodThemeContext";

export type BiomarkerModalTab = "definition" | "impact" | "protocol";

interface BiomarkerTabsProps {
  activeTab: BiomarkerModalTab;
  onTabChange: (tab: BiomarkerModalTab) => void;
}

const TABS: Array<{ key: BiomarkerModalTab; label: string }> = [
  { key: "definition", label: "Definition" },
  { key: "impact", label: "Impact" },
  { key: "protocol", label: "Protocole" },
];

export default function BiomarkerTabs({ activeTab, onTabChange }: BiomarkerTabsProps) {
  const { theme } = useBloodTheme();

  return (
    <div className="flex gap-4 border-b px-6" style={{ borderColor: theme.borderDefault }}>
      {TABS.map((tab) => {
        const isActive = tab.key === activeTab;
        return (
          <button
            key={tab.key}
            onClick={() => onTabChange(tab.key)}
            className="relative py-3 text-sm font-medium"
            style={{ color: isActive ? theme.primaryBlue : theme.textSecondary }}
          >
            {tab.label}
            {isActive && (
              <motion.div
                layoutId="modalTab"
                className="absolute bottom-0 left-0 right-0 h-0.5"
                style={{ backgroundColor: theme.primaryBlue }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
