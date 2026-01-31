import { motion } from "framer-motion";
import { memo } from "react";

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

const STATUS_STYLES = {
  optimal: {
    bg: "bg-cyan-50",
    border: "border-cyan-200",
    glow: "shadow-[0_12px_30px_rgba(6,182,212,0.15)]",
    text: "text-cyan-700",
    icon: "▲",
  },
  normal: {
    bg: "bg-blue-50",
    border: "border-blue-200",
    glow: "shadow-[0_10px_24px_rgba(59,130,246,0.14)]",
    text: "text-blue-700",
    icon: "●",
  },
  suboptimal: {
    bg: "bg-amber-50",
    border: "border-amber-200",
    glow: "shadow-[0_12px_30px_rgba(245,158,11,0.18)]",
    text: "text-amber-700",
    icon: "▼",
  },
  critical: {
    bg: "bg-rose-50",
    border: "border-rose-200",
    glow: "shadow-[0_14px_34px_rgba(244,63,94,0.2)]",
    text: "text-rose-700",
    icon: "⚠",
  },
} as const;

export const BiomarkerCardPremium = memo(function BiomarkerCardPremium({ marker }: BiomarkerCardProps) {
  const styles = STATUS_STYLES[marker.status];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
      className={`BiomarkerCardPremium relative overflow-hidden rounded-xl border p-6 ${styles.bg} ${styles.border} ${styles.glow} transition-all duration-300 grain-texture`}
    >
      <div className="relative z-10">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-sm font-bold uppercase tracking-wide text-slate-900">
            {marker.name}
          </h3>
          <span className={`text-2xl ${styles.text}`} aria-hidden="true">
            {styles.icon}
          </span>
        </div>

        <div className="mt-4 flex items-baseline gap-2">
          <span className={`font-data text-4xl font-bold ${styles.text}`}>
            {marker.value}
          </span>
          <span className="font-data text-lg text-slate-600">{marker.unit}</span>
        </div>

        {marker.normalMin !== null && marker.normalMax !== null && (
          <div className="mt-3 font-body text-xs text-slate-600">
            Normal: {marker.normalMin} - {marker.normalMax} {marker.unit}
          </div>
        )}

        <motion.div
          className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent"
          initial={{ x: "-100%" }}
          whileHover={{ x: "100%", transition: { duration: 1, repeat: Infinity } }}
        />
      </div>
    </motion.div>
  );
});

BiomarkerCardPremium.displayName = "BiomarkerCardPremium";
