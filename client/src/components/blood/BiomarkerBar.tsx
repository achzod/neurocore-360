import type { BiomarkerStatus } from "@/lib/biomarker-colors";
import { getBiomarkerStatusColor } from "@/lib/biomarker-colors";
import { useBloodTheme } from "./BloodThemeContext";

interface BiomarkerBarProps {
  value: number;
  unit?: string;
  normalMin?: number;
  normalMax?: number;
  optimalMin?: number;
  optimalMax?: number;
  status?: BiomarkerStatus;
}

export function BiomarkerBar({
  value,
  unit,
  normalMin,
  normalMax,
  optimalMin,
  optimalMax,
  status = "normal",
}: BiomarkerBarProps) {
  const { theme } = useBloodTheme();
  const colors = getBiomarkerStatusColor(status);

  // Calculate range bounds
  const rangeMin =
    typeof normalMin === "number"
      ? normalMin
      : typeof optimalMin === "number"
      ? optimalMin
      : value - 1;
  const rangeMax =
    typeof normalMax === "number"
      ? normalMax
      : typeof optimalMax === "number"
      ? optimalMax
      : value + 1;

  // Extend range to show context beyond normal
  const displayMin = Math.min(rangeMin * 0.5, value * 0.5);
  const displayMax = Math.max(rangeMax * 1.5, value * 1.5);
  const totalRange = displayMax - displayMin;

  // Calculate positions as percentages
  const valuePos = ((value - displayMin) / totalRange) * 100;
  const normalMinPos = normalMin ? ((normalMin - displayMin) / totalRange) * 100 : 0;
  const normalMaxPos = normalMax ? ((normalMax - displayMin) / totalRange) * 100 : 100;
  const optimalMinPos = optimalMin ? ((optimalMin - displayMin) / totalRange) * 100 : normalMinPos;
  const optimalMaxPos = optimalMax ? ((optimalMax - displayMin) / totalRange) * 100 : normalMaxPos;

  return (
    <div className="w-full space-y-2">
      {/* Value display */}
      <div className="flex items-baseline justify-between">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold font-mono tabular-nums" style={{ color: colors.primary }}>
            {value}
          </span>
          {unit && <span className="text-sm opacity-60">{unit}</span>}
        </div>
        <div className="text-xs px-2 py-0.5 rounded-full" style={{
          backgroundColor: `${colors.primary}20`,
          color: colors.primary
        }}>
          {status}
        </div>
      </div>

      {/* Bar visualization */}
      <div className="relative h-12">
        {/* Background track */}
        <div
          className="absolute inset-0 rounded-lg"
          style={{ backgroundColor: theme.surfaceMuted }}
        />

        {/* Normal range */}
        <div
          className="absolute top-0 bottom-0 rounded-lg"
          style={{
            left: `${normalMinPos}%`,
            width: `${normalMaxPos - normalMinPos}%`,
            backgroundColor: `${theme.status.normal}30`,
            border: `1px solid ${theme.status.normal}60`,
          }}
        />

        {/* Optimal range */}
        {optimalMin !== undefined && optimalMax !== undefined && (
          <div
            className="absolute top-0 bottom-0 rounded-lg"
            style={{
              left: `${optimalMinPos}%`,
              width: `${optimalMaxPos - optimalMinPos}%`,
              backgroundColor: `${theme.status.optimal}30`,
              border: `1px solid ${theme.status.optimal}80`,
            }}
          />
        )}

        {/* Value marker */}
        <div
          className="absolute top-0 bottom-0 w-1 rounded-full transition-all duration-300"
          style={{
            left: `${valuePos}%`,
            backgroundColor: colors.primary,
            boxShadow: `0 0 12px ${colors.primary}`,
          }}
        >
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full"
            style={{
              backgroundColor: colors.primary,
              border: `2px solid ${theme.surface}`,
            }}
          />
        </div>

        {/* Range labels */}
        <div className="absolute -bottom-5 left-0 right-0 flex justify-between text-xs opacity-40">
          <span>{displayMin.toFixed(0)}</span>
          <span>{displayMax.toFixed(0)}</span>
        </div>
      </div>

      {/* Range info */}
      <div className="flex gap-4 text-xs opacity-60 mt-6">
        {normalMin !== undefined && normalMax !== undefined && (
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: `${theme.status.normal}60` }} />
            <span>Normal: {normalMin}-{normalMax}</span>
          </div>
        )}
        {optimalMin !== undefined && optimalMax !== undefined && (
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: `${theme.status.optimal}80` }} />
            <span>Optimal: {optimalMin}-{optimalMax}</span>
          </div>
        )}
      </div>
    </div>
  );
}
