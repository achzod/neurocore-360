import { getPercentileRank } from "@/lib/biomarkerPercentiles";

type ReferenceData = {
  ageRanges: Array<{
    min: number;
    max: number;
    sex: "male" | "female";
    percentiles: {
      p10: number;
      p25: number;
      p50: number;
      p75: number;
      p90: number;
    };
  }>;
};

const REFERENCE_DATA: Record<string, ReferenceData> = {
  testosterone_total: {
    ageRanges: [
      { min: 20, max: 29, sex: "male", percentiles: { p10: 350, p25: 450, p50: 550, p75: 700, p90: 850 } },
      { min: 30, max: 39, sex: "male", percentiles: { p10: 320, p25: 420, p50: 520, p75: 650, p90: 800 } },
    ],
  },
};

const interpolate = (value: number, x1: number, x2: number, y1: number, y2: number): number => {
  return Math.round(y1 + ((value - x1) * (y2 - y1)) / (x2 - x1));
};

export function calculatePercentile(
  markerCode: string,
  value: number,
  age: number,
  sex: "male" | "female"
): number | null {
  const mappedSex = sex === "male" ? "homme" : "femme";
  const existingRank = getPercentileRank(markerCode, value, age, mappedSex);
  if (typeof existingRank === "number") return existingRank;

  const refData = REFERENCE_DATA[markerCode];
  if (!refData) return null;

  const ageRange = refData.ageRanges.find((range) => age >= range.min && age <= range.max && range.sex === sex);
  if (!ageRange) return null;

  const { percentiles } = ageRange;

  if (value <= percentiles.p10) return 10;
  if (value <= percentiles.p25) return interpolate(value, percentiles.p10, percentiles.p25, 10, 25);
  if (value <= percentiles.p50) return interpolate(value, percentiles.p25, percentiles.p50, 25, 50);
  if (value <= percentiles.p75) return interpolate(value, percentiles.p50, percentiles.p75, 50, 75);
  if (value <= percentiles.p90) return interpolate(value, percentiles.p75, percentiles.p90, 75, 90);
  return 90;
}
