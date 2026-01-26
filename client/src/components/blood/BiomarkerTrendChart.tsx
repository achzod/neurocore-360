import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, ReferenceArea } from "recharts";
import type { BiomarkerStatus } from "@/lib/biomarker-colors";
import { getBiomarkerStatusColor } from "@/lib/biomarker-colors";

export type TrendPoint = { date: string; value: number };

interface BiomarkerTrendChartProps {
  data?: TrendPoint[];
  unit?: string;
  normalMin?: number;
  normalMax?: number;
  optimalMin?: number;
  optimalMax?: number;
  status?: BiomarkerStatus;
}

const buildFallbackSeries = (value: number): TrendPoint[] => [
  { date: "J-2", value },
  { date: "J-1", value },
  { date: "J0", value },
];

export function BiomarkerTrendChart({
  data,
  unit,
  normalMin,
  normalMax,
  optimalMin,
  optimalMax,
  status = "normal",
}: BiomarkerTrendChartProps) {
  const hasSeries = (data || []).length > 1;
  const safeValue = data?.[data.length - 1]?.value ?? 0;
  const series = hasSeries ? (data as TrendPoint[]) : buildFallbackSeries(safeValue);
  const colors = getBiomarkerStatusColor(status);

  const bounds = series.reduce(
    (acc, point) => ({
      min: Math.min(acc.min, point.value),
      max: Math.max(acc.max, point.value),
    }),
    { min: series[0]?.value ?? 0, max: series[0]?.value ?? 0 }
  );

  const rangeMin = normalMin ?? optimalMin ?? bounds.min;
  const rangeMax = normalMax ?? optimalMax ?? bounds.max;
  const minValue = Math.min(bounds.min, rangeMin);
  const maxValue = Math.max(bounds.max, rangeMax);
  const padding = Math.max((maxValue - minValue) * 0.15, 0.5);

  return (
    <div className="h-40 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={series} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          {typeof normalMin === "number" && typeof normalMax === "number" && (
            <ReferenceArea y1={normalMin} y2={normalMax} fill="rgba(59,130,246,0.08)" />
          )}
          {typeof optimalMin === "number" && typeof optimalMax === "number" && (
            <ReferenceArea y1={optimalMin} y2={optimalMax} fill="rgba(16,185,129,0.12)" />
          )}
          <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
          <YAxis
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            width={32}
            domain={[minValue - padding, maxValue + padding]}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--popover))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "10px",
              color: "hsl(var(--popover-foreground))",
            }}
            formatter={(value: number) => [`${value}${unit ? ` ${unit}` : ""}`, "Valeur"]}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke={colors.primary}
            strokeWidth={2}
            dot={{ r: 3, stroke: colors.primary, fill: colors.primary }}
            activeDot={{ r: 4, stroke: colors.primary, fill: "#fff" }}
          />
        </LineChart>
      </ResponsiveContainer>
      {!hasSeries && (
        <p className="text-[11px] text-muted-foreground mt-1">Donnees ponctuelles, historique a venir.</p>
      )}
    </div>
  );
}
