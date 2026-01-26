import { getBiomarkerStatusColor, getBiomarkerStatusLabel, normalizeBiomarkerStatus } from "@/lib/biomarker-colors";

interface StatusIndicatorProps {
  status?: string;
  label?: string;
  className?: string;
}

export function StatusIndicator({ status, label, className = "" }: StatusIndicatorProps) {
  const normalized = normalizeBiomarkerStatus(status);
  const colors = getBiomarkerStatusColor(normalized);

  return (
    <div className={`inline-flex items-center gap-2 text-xs ${className}`}>
      <span
        className="h-2.5 w-2.5 rounded-full"
        style={{ backgroundColor: colors.primary }}
      />
      <span style={{ color: colors.primary }}>
        {label || getBiomarkerStatusLabel(normalized)}
      </span>
    </div>
  );
}
