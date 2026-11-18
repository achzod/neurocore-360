// Biological plausibility gate. A value many times outside its reference range
// is far more often an extraction or unit error (e.g. leukocyte differential
// in % read as G/L: neutrophils "39.2 G/L", Younes Youssfi 2026-11-18) than a
// real result. Such a report must never reach the client automatically.

type MarkerLike = {
  markerId?: string;
  code?: string;
  name?: string;
  value?: unknown;
  unit?: string;
  refMin?: unknown;
  refMax?: unknown;
  normalRange?: string;
};

const FACTOR = 4;

function bounds(marker: MarkerLike): { min: number | null; max: number | null } {
  const min = Number(marker.refMin);
  const max = Number(marker.refMax);
  if (Number.isFinite(min) || Number.isFinite(max)) {
    return { min: Number.isFinite(min) ? min : null, max: Number.isFinite(max) ? max : null };
  }
  const nums = String(marker.normalRange || "").match(/-?\d+(?:\.\d+)?/g) || [];
  if (nums.length >= 2) return { min: Number(nums[0]), max: Number(nums[1]) };
  return { min: null, max: null };
}

export function findImplausibleMarkers(markers: unknown): string[] {
  if (!Array.isArray(markers)) return [];
  const reasons: string[] = [];
  for (const raw of markers as MarkerLike[]) {
    const value = Number(raw?.value);
    if (!Number.isFinite(value)) continue;
    const { min, max } = bounds(raw);
    const label = `${raw?.name || raw?.markerId || raw?.code || "marqueur"} = ${value} ${raw?.unit || ""}`.trim();
    if (max != null && max > 0 && max < 999 && value > max * FACTOR) {
      reasons.push(`${label} (plus de ${FACTOR}x la borne haute ${max})`);
    } else if (min != null && min > 0 && value >= 0 && value < min / FACTOR) {
      reasons.push(`${label} (moins d'1/${FACTOR} de la borne basse ${min})`);
    }
  }
  return reasons;
}
