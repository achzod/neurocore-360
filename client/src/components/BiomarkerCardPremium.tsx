import { motion } from "framer-motion";
import { memo } from "react";
import { useBloodTheme } from "./blood/BloodThemeContext";

interface BiomarkerCardProps {
  marker: {
    name: string;
    value: number;
    unit: string;
    status: "optimal" | "normal" | "suboptimal" | "critical";
    normalMin: number | null;
    normalMax: number | null;
  };
}

const STATUS_ICONS: Record<string, string> = {
  optimal: "\u25B2",
  normal: "\u25CF",
  suboptimal: "\u25BC",
  critical: "\u26A0",
};

export const BiomarkerCardPremium = memo(function BiomarkerCardPremium({ marker }: BiomarkerCardProps) {
  const { theme } = useBloodTheme();
  const statusColor = theme.status[marker.status];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
      className="BiomarkerCardPremium relative overflow-hidden rounded-xl border p-6 transition-all duration-300"
      style={{
        backgroundColor: `${statusColor}0D`,
        borderColor: `${statusColor}33`,
        boxShadow: `0 12px 30px ${statusColor}1A`,
      }}
    >
      <div className="relative z-10">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-sm font-bold uppercase tracking-wide" style={{ color: theme.textPrimary }}>
            {marker.name}
          </h3>
          <span className="text-2xl" style={{ color: statusColor }} aria-hidden="true">
            {STATUS_ICONS[marker.status]}
          </span>
        </div>

        <div className="mt-4 flex items-baseline gap-2">
          <span className="font-data text-4xl font-bold" style={{ color: statusColor }}>
            {marker.value}
          </span>
          <span className="font-data text-lg" style={{ color: theme.textSecondary }}>{marker.unit}</span>
        </div>

        {marker.normalMin !== null && marker.normalMax !== null && (
          <div className="mt-3 font-body text-xs" style={{ color: theme.textSecondary }}>
            Normal: {marker.normalMin} - {marker.normalMax} {marker.unit}
          </div>
        )}

        <motion.div
          className="absolute inset-x-0 top-0 h-[2px]"
          style={{
            background: `linear-gradient(90deg, transparent, ${statusColor}, transparent)`,
          }}
          initial={{ x: "-100%" }}
          whileHover={{ x: "100%", transition: { duration: 1, repeat: Infinity } }}
        />
      </div>
    </motion.div>
  );
});

BiomarkerCardPremium.displayName = "BiomarkerCardPremium";
