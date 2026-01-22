import { CheckCircle2, Info, AlertTriangle, XCircle } from "lucide-react";
import { getBiomarkerStatusColor, getBiomarkerStatusLabel, normalizeBiomarkerStatus } from "@/lib/biomarker-colors";

interface StatusBadgeProps {
  status?: string;
  label?: string;
  className?: string;
}

const STATUS_ICONS = {
  optimal: CheckCircle2,
  normal: Info,
  suboptimal: AlertTriangle,
  critical: XCircle,
};

export function StatusBadge({ status, label, className = "" }: StatusBadgeProps) {
  const normalized = normalizeBiomarkerStatus(status);
  const colors = getBiomarkerStatusColor(normalized);
  const Icon = STATUS_ICONS[normalized];

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${className}`}
      style={{
        color: colors.primary,
        background: colors.bg,
        borderColor: colors.border,
      }}
    >
      <Icon className="h-3.5 w-3.5" />
      {label || getBiomarkerStatusLabel(normalized)}
    </span>
  );
}
