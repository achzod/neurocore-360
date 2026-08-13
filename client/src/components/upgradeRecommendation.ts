import type { Metric } from './ultrahuman/types';

export type ScanRecommendation = 'ultimate' | 'default';

export interface RecommendationAnalysis {
  type: ScanRecommendation;
  hasMultipleWeakAreas: boolean;
  weakDomains: string[];
}

const WEAK_SCORE_THRESHOLD = 6;

export function analyzeDiscoveryRecommendation(
  metrics: Metric[],
  globalScore: number,
): RecommendationAnalysis {
  const weakDomains = metrics
    .filter((metric) => Number.isFinite(metric.value) && metric.value < WEAK_SCORE_THRESHOLD)
    .map((metric) => metric.key);
  const hasMultipleWeakAreas = weakDomains.length >= 3 || globalScore < 5;

  return {
    type: hasMultipleWeakAreas ? 'ultimate' : 'default',
    hasMultipleWeakAreas,
    weakDomains,
  };
}
