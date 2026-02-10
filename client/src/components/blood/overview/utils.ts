import type { BiomarkerStatus } from "@/lib/biomarker-colors";
import type { PanelKey } from "@/types/blood";

export const PANEL_LABELS: Record<PanelKey, string> = {
  hormonal: "Hormones",
  thyroid: "Thyroide",
  metabolic: "Metabolisme",
  inflammation: "Inflammation",
  vitamins: "Vitamines",
  liver_kidney: "Foie/Rein",
};

export const scoreToStatus = (score: number): BiomarkerStatus => {
  if (score >= 80) return "optimal";
  if (score >= 65) return "normal";
  if (score >= 45) return "suboptimal";
  return "critical";
};
