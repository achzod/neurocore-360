import { motion } from "framer-motion";
import { getBiomarkerStatusColor, getBiomarkerStatusLabel, normalizeBiomarkerStatus } from "@/lib/biomarker-colors";
import { useBloodTheme } from "@/components/blood/BloodThemeContext";

interface BiomarkerRangeIndicatorProps {
  value: number;
  unit?: string;
  status?: string;
  normalMin?: number;
  normalMax?: number;
  optimalMin?: number;
  optimalMax?: number;
  normalLabel?: string;
  optimalLabel?: string;
  className?: string;
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export function BiomarkerRangeIndicator({
  value,
  unit,
  status,
  normalMin,
  normalMax,
  optimalMin,
  optimalMax,
  normalLabel,
  optimalLabel,
  className = "",
}: BiomarkerRangeIndicatorProps) {
  const { theme } = useBloodTheme();
  const normalized = normalizeBiomarkerStatus(status);
  const colors = getBiomarkerStatusColor(normalized);

  const hasRange = typeof normalMin === "number" && typeof normalMax === "number" && normalMax > normalMin;
  const safeMin = hasRange ? normalMin! : value - 1;
  const safeMax = hasRange ? normalMax! : value + 1;
  const span = safeMax - safeMin || 1;
  const valuePct = clamp(((value - safeMin) / span) * 100, 0, 100);

  const normalStart = hasRange ? clamp(((normalMin! - safeMin) / span) * 100, 0, 100) : 0;
  const normalWidth = hasRange ? clamp(((normalMax! - normalMin!) / span) * 100, 0, 100) : 100;
  const normalEnd = clamp(100 - normalStart - normalWidth, 0, 100);

  const optimalStart = hasRange && typeof optimalMin === "number" ? ((optimalMin - safeMin) / span) * 100 : null;
  const optimalWidth =
    hasRange && typeof optimalMin === "number" && typeof optimalMax === "number"
      ? ((optimalMax - optimalMin) / span) * 100
      : null;

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between text-[11px]" style={{ color: theme.textTertiary }}>
        <span>
          {normalLabel || (hasRange ? `Normal: ${normalMin}-${normalMax}` : "Normal: N/A")}
        </span>
        <span>{optimalLabel || (optimalMin !== undefined && optimalMax !== undefined ? `Optimal: ${optimalMin}-${optimalMax}` : "Optimal: N/A")}</span>
      </div>
      <div className="relative h-3 overflow-hidden rounded-full" style={{ backgroundColor: theme.borderSubtle }}>
        <div className="absolute inset-0 flex">
          <div style={{ width: `${normalStart}%`, backgroundColor: "rgba(239,68,68,0.25)" }} />
          <div style={{ width: `${normalWidth}%`, backgroundColor: "rgba(245,158,11,0.25)" }} />
          <div style={{ width: `${normalEnd}%`, backgroundColor: "rgba(239,68,68,0.25)" }} />
        </div>
        {optimalStart !== null && optimalWidth !== null && (
          <motion.div
            className="absolute top-0 h-full rounded-full"
            style={{
              left: `${clamp(optimalStart, 0, 100)}%`,
              width: `${clamp(optimalWidth, 0, 100)}%`,
              backgroundColor: "rgba(16, 185, 129, 0.45)",
            }}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        )}
        <motion.div
          className="absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full border-2 bg-black"
          style={{
            left: `calc(${valuePct}% - 6px)`,
            borderColor: colors.primary,
            boxShadow: `0 0 12px ${colors.primary}`,
          }}
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold" style={{ color: colors.primary }}>
          {value} {unit}
        </span>
        <span className="text-[11px]" style={{ color: theme.textTertiary }}>
          {getBiomarkerStatusLabel(normalized)}
        </span>
      </div>
    </div>
  );
}
