export type BiomarkerStatus = "optimal" | "normal" | "suboptimal" | "critical";

export const BIOMARKER_STATUS_COLORS: Record<
  BiomarkerStatus,
  { primary: string; bg: string; border: string }
> = {
  optimal: {
    primary: "#10B981",
    bg: "rgba(16, 185, 129, 0.12)",
    border: "rgba(16, 185, 129, 0.3)",
  },
  normal: {
    primary: "#3B82F6",
    bg: "rgba(59, 130, 246, 0.12)",
    border: "rgba(59, 130, 246, 0.3)",
  },
  suboptimal: {
    primary: "#F59E0B",
    bg: "rgba(245, 158, 11, 0.12)",
    border: "rgba(245, 158, 11, 0.3)",
  },
  critical: {
    primary: "#EF4444",
    bg: "rgba(239, 68, 68, 0.12)",
    border: "rgba(239, 68, 68, 0.3)",
  },
};

export const normalizeBiomarkerStatus = (status?: string): BiomarkerStatus => {
  const lower = (status || "").toLowerCase();
  if (lower === "optimal") return "optimal";
  if (lower === "normal") return "normal";
  if (lower === "suboptimal") return "suboptimal";
  if (lower === "critical") return "critical";
  return "normal";
};

export const getBiomarkerStatusLabel = (status?: string): string => {
  switch (normalizeBiomarkerStatus(status)) {
    case "optimal":
      return "Optimal";
    case "normal":
      return "Normal";
    case "suboptimal":
      return "Sous-optimal";
    case "critical":
      return "Critique";
    default:
      return "Normal";
  }
};

export const getBiomarkerStatusColor = (status?: string) => {
  return BIOMARKER_STATUS_COLORS[normalizeBiomarkerStatus(status)];
};

export const getBiomarkerStatusVars = (status?: string) => {
  const colors = getBiomarkerStatusColor(status);
  return {
    "--biomarker-primary": colors.primary,
    "--biomarker-bg": colors.bg,
    "--biomarker-border": colors.border,
  } as const;
};
