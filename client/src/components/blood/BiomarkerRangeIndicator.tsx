import { getBiomarkerStatusColor, getBiomarkerStatusLabel, normalizeBiomarkerStatus } from "@/lib/biomarker-colors";

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
  const normalized = normalizeBiomarkerStatus(status);
  const colors = getBiomarkerStatusColor(normalized);

  const hasRange = typeof normalMin === "number" && typeof normalMax === "number" && normalMax > normalMin;
  const safeMin = hasRange ? normalMin! : value - 1;
  const safeMax = hasRange ? normalMax! : value + 1;
  const span = safeMax - safeMin || 1;
  const valuePct = clamp(((value - safeMin) / span) * 100, 0, 100);

  const optimalStart = hasRange && typeof optimalMin === "number" ? ((optimalMin - safeMin) / span) * 100 : null;
  const optimalWidth =
    hasRange && typeof optimalMin === "number" && typeof optimalMax === "number"
      ? ((optimalMax - optimalMin) / span) * 100
      : null;

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between text-[11px] text-white/50">
        <span>
          {normalLabel || (hasRange ? `Normal: ${normalMin}-${normalMax}` : "Normal: N/A")}
        </span>
        <span>{optimalLabel || (optimalMin !== undefined && optimalMax !== undefined ? `Optimal: ${optimalMin}-${optimalMax}` : "Optimal: N/A")}</span>
      </div>
      <div className="relative h-2 rounded-full overflow-hidden bg-white/10">
        {optimalStart !== null && optimalWidth !== null && (
          <div
            className="absolute top-0 h-full rounded-full"
            style={{
              left: `${clamp(optimalStart, 0, 100)}%`,
              width: `${clamp(optimalWidth, 0, 100)}%`,
              backgroundColor: "rgba(16, 185, 129, 0.45)",
            }}
          />
        )}
        <div
          className="absolute top-0 h-full w-0.5"
          style={{
            left: `${valuePct}%`,
            backgroundColor: colors.primary,
          }}
        />
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold" style={{ color: colors.primary }}>
          {value} {unit}
        </span>
        <span className="text-[11px] text-white/50">
          {getBiomarkerStatusLabel(normalized)}
        </span>
      </div>
    </div>
  );
}
