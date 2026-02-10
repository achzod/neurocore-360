import type { BloodMarker, PanelKey } from "@/types/blood";

export const STATUS_SCORES: Record<BloodMarker["status"], number> = {
  optimal: 100,
  normal: 80,
  suboptimal: 55,
  critical: 30,
};

export function calculateMarkerScore(marker: Pick<BloodMarker, "status">): number {
  return STATUS_SCORES[marker.status];
}

export function calculatePanelScore(markers: BloodMarker[], panel: PanelKey): number {
  const panelMarkers = markers.filter((m) => m.panel === panel);
  if (!panelMarkers.length) return 0;
  const totalScore = panelMarkers.reduce((sum, marker) => sum + calculateMarkerScore(marker), 0);
  return Math.round(totalScore / panelMarkers.length);
}

export function calculateGlobalScore(markers: BloodMarker[]): number {
  const panelWeights: Record<PanelKey, number> = {
    hormonal: 0.25,
    metabolic: 0.2,
    thyroid: 0.15,
    inflammation: 0.15,
    vitamins: 0.15,
    liver_kidney: 0.1,
  };

  let weightedSum = 0;
  let totalWeight = 0;

  (Object.keys(panelWeights) as PanelKey[]).forEach((panel) => {
    const panelScore = calculatePanelScore(markers, panel);
    if (panelScore > 0) {
      weightedSum += panelScore * panelWeights[panel];
      totalWeight += panelWeights[panel];
    }
  });

  return totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
}

const findMarker = (markers: BloodMarker[], codes: string[]) =>
  markers.find((marker) => codes.includes(marker.code));

export function calculateAnabolicIndex(markers: BloodMarker[]): number | null {
  const testosterone = findMarker(markers, ["testosterone_total"]);
  const igf1 = findMarker(markers, ["igf1"]);
  const cortisol = findMarker(markers, ["cortisol"]);
  const shbg = findMarker(markers, ["shbg"]);

  if (!testosterone || !igf1 || !cortisol) return null;

  const tScore = calculateMarkerScore(testosterone) * 0.4;
  const igf1Score = calculateMarkerScore(igf1) * 0.3;
  const cortisolScore = calculateMarkerScore(cortisol) * 0.2;
  const shbgScore = shbg ? calculateMarkerScore(shbg) * 0.1 : 0;

  return Math.round(tScore + igf1Score + cortisolScore + shbgScore);
}

export function calculateRecompReadiness(markers: BloodMarker[]): number | null {
  const glycemia = findMarker(markers, ["glycemia_fasting", "glycemie_jeun"]);
  const homa = findMarker(markers, ["homa_ir"]);
  const testosterone = findMarker(markers, ["testosterone_total"]);
  const tsh = findMarker(markers, ["tsh"]);

  if (!glycemia || !testosterone) return null;

  const glycemiaScore = calculateMarkerScore(glycemia) * 0.3;
  const homaScore = homa ? calculateMarkerScore(homa) * 0.25 : 0;
  const tScore = calculateMarkerScore(testosterone) * 0.25;
  const tshScore = tsh ? calculateMarkerScore(tsh) * 0.2 : 0;

  return Math.round(glycemiaScore + homaScore + tScore + tshScore);
}

export function calculateDiabetesRisk(markers: BloodMarker[]): {
  score: number;
  level: "low" | "moderate" | "high" | "very_high";
} | null {
  const glycemia = findMarker(markers, ["glycemia_fasting", "glycemie_jeun"]);
  const hba1c = findMarker(markers, ["hba1c"]);
  const homa = findMarker(markers, ["homa_ir"]);
  const triglycerides = findMarker(markers, ["triglycerides"]);
  const hdl = findMarker(markers, ["hdl"]);

  if (!glycemia && !hba1c && !homa) return null;

  let riskPoints = 0;

  if (glycemia) {
    const invScore = 100 - calculateMarkerScore(glycemia);
    riskPoints += invScore * 0.3;
  }

  if (hba1c) {
    const invScore = 100 - calculateMarkerScore(hba1c);
    riskPoints += invScore * 0.25;
  }

  if (homa) {
    const invScore = 100 - calculateMarkerScore(homa);
    riskPoints += invScore * 0.25;
  }

  if (triglycerides && hdl) {
    const ratio = triglycerides.value / hdl.value;
    let ratioScore = 0;
    if (ratio < 1.0) ratioScore = 0;
    else if (ratio < 2.0) ratioScore = 20;
    else if (ratio < 3.0) ratioScore = 50;
    else ratioScore = 100;
    riskPoints += ratioScore * 0.2;
  }

  const finalScore = Math.round(riskPoints);

  let level: "low" | "moderate" | "high" | "very_high";
  if (finalScore < 25) level = "low";
  else if (finalScore < 50) level = "moderate";
  else if (finalScore < 75) level = "high";
  else level = "very_high";

  return { score: finalScore, level };
}

export function calculateInflammationScore(_markers: BloodMarker[]): number | null {
  const markers = _markers.filter((marker) =>
    ["crp_us", "homocysteine", "ferritine"].includes(marker.code)
  );
  if (!markers.length) return null;
  const total = markers.reduce((sum, marker) => sum + calculateMarkerScore(marker), 0);
  return Math.round(total / markers.length);
}
