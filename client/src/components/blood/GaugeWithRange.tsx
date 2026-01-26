import type { BiomarkerStatus } from "@/lib/biomarker-colors";
import { getBiomarkerStatusColor } from "@/lib/biomarker-colors";

interface GaugeWithRangeProps {
  value: number;
  unit?: string;
  normalMin?: number;
  normalMax?: number;
  optimalMin?: number;
  optimalMax?: number;
  status?: BiomarkerStatus;
}

const polarToCartesian = (cx: number, cy: number, radius: number, angleInDegrees: number) => {
  const angleInRadians = (angleInDegrees * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(angleInRadians),
    y: cy + radius * Math.sin(angleInRadians),
  };
};

const describeArc = (cx: number, cy: number, radius: number, startAngle: number, endAngle: number) => {
  const start = polarToCartesian(cx, cy, radius, endAngle);
  const end = polarToCartesian(cx, cy, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
};

export function GaugeWithRange({
  value,
  unit,
  normalMin,
  normalMax,
  optimalMin,
  optimalMax,
  status = "normal",
}: GaugeWithRangeProps) {
  const colors = getBiomarkerStatusColor(status);
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
  const safeRangeMin = rangeMin === rangeMax ? rangeMin - 1 : rangeMin;
  const safeRangeMax = rangeMin === rangeMax ? rangeMax + 1 : rangeMax;

  const startAngle = 180;
  const endAngle = 0;
  const clamp = (val: number) => Math.min(Math.max(val, safeRangeMin), safeRangeMax);
  const scale = (val: number) =>
    startAngle - ((clamp(val) - safeRangeMin) / (safeRangeMax - safeRangeMin)) * (startAngle - endAngle);

  const normalStart = scale(normalMin ?? safeRangeMin);
  const normalEnd = scale(normalMax ?? safeRangeMax);
  const optimalStart = typeof optimalMin === "number" ? scale(optimalMin) : null;
  const optimalEnd = typeof optimalMax === "number" ? scale(optimalMax) : null;
  const valueAngle = scale(value);

  const cx = 100;
  const cy = 100;
  const radius = 78;

  const valuePoint = polarToCartesian(cx, cy, radius, valueAngle);

  return (
    <div className="w-full">
      <svg viewBox="0 0 200 120" className="w-full h-[120px]">
        <path
          d={describeArc(cx, cy, radius, startAngle, endAngle)}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={10}
          strokeLinecap="round"
        />
        <path
          d={describeArc(cx, cy, radius, normalStart, normalEnd)}
          fill="none"
          stroke="rgba(59,130,246,0.7)"
          strokeWidth={10}
          strokeLinecap="round"
        />
        {optimalStart !== null && optimalEnd !== null && (
          <path
            d={describeArc(cx, cy, radius, optimalStart, optimalEnd)}
            fill="none"
            stroke="rgba(16,185,129,0.9)"
            strokeWidth={10}
            strokeLinecap="round"
          />
        )}
        <circle cx={valuePoint.x} cy={valuePoint.y} r={6} fill={colors.primary} stroke="#0a0a0a" strokeWidth={2} />
      </svg>
      <div className="flex items-baseline justify-between mt-2">
        <div className="text-lg font-semibold">{value}</div>
        <div className="text-xs text-muted-foreground">{unit || ""}</div>
      </div>
    </div>
  );
}
