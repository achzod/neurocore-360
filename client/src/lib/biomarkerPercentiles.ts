type PercentileTable = {
  [ageGroup: string]: { p10: number; p25: number; p50: number; p75: number; p90: number };
};

const percentiles: Record<string, { homme?: PercentileTable; femme?: PercentileTable }> = {
  testosterone_total: {
    homme: {
      "20-29": { p10: 400, p25: 500, p50: 650, p75: 800, p90: 950 },
      "30-39": { p10: 350, p25: 450, p50: 600, p75: 750, p90: 900 },
      "40-49": { p10: 300, p25: 400, p50: 550, p75: 700, p90: 850 },
    },
  },
  hdl: {
    homme: {
      "20-49": { p10: 35, p25: 42, p50: 50, p75: 58, p90: 65 },
    },
    femme: {
      "20-49": { p10: 40, p25: 48, p50: 56, p75: 64, p90: 72 },
    },
  },
  ldl: {
    homme: {
      "20-49": { p10: 70, p25: 90, p50: 110, p75: 130, p90: 160 },
    },
    femme: {
      "20-49": { p10: 70, p25: 90, p50: 105, p75: 125, p90: 150 },
    },
  },
  glycemie_jeun: {
    homme: {
      "20-49": { p10: 75, p25: 82, p50: 88, p75: 94, p90: 100 },
    },
    femme: {
      "20-49": { p10: 72, p25: 80, p50: 86, p75: 92, p90: 98 },
    },
  },
  hba1c: {
    homme: {
      "20-49": { p10: 4.7, p25: 4.9, p50: 5.2, p75: 5.5, p90: 5.8 },
    },
    femme: {
      "20-49": { p10: 4.6, p25: 4.8, p50: 5.1, p75: 5.4, p90: 5.7 },
    },
  },
};

const getAgeGroup = (age: number) => {
  if (age < 30) return "20-29";
  if (age < 40) return "30-39";
  if (age < 50) return "40-49";
  return "20-49";
};

export function getPercentileRank(
  markerCode: string,
  value: number,
  age: number,
  sexe: "homme" | "femme"
): number | null {
  const marker = percentiles[markerCode];
  if (!marker) return null;
  const ageGroup = getAgeGroup(age);
  const table = marker[sexe]?.[ageGroup] || marker[sexe]?.["20-49"];
  if (!table) return null;
  if (value <= table.p10) return 10;
  if (value <= table.p25) return 25;
  if (value <= table.p50) return 50;
  if (value <= table.p75) return 75;
  if (value <= table.p90) return 90;
  return 95;
}
