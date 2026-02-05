import { useMemo } from 'react';
import { BLOOD_PANELS, getMarkerById } from '@/lib/blood-questionnaire';
import { normalizeBiomarkerStatus, BiomarkerStatus } from '@/lib/biomarker-colors';

type RawMarker = {
  markerId?: string;
  id?: string;
  name: string;
  value: number;
  unit: string;
  status: string;
  normalRange?: string;
  optimalRange?: string;
  interpretation?: string;
  history?: Array<{ date: string; value: number }>;
};

type BloodAnalysisReport = {
  id: string;
  email: string;
  profile?: Record<string, unknown>;
  markers?: unknown[];
  analysis?: {
    summary?: { optimal?: string[]; watch?: string[]; action?: string[] };
    markers?: RawMarker[];
    patterns?: Array<{ name: string; causes?: string[] }>;
  };
  aiReport?: string;
  createdAt?: string;
};

const STATUS_SCORE: Record<BiomarkerStatus, number> = {
  optimal: 100,
  normal: 80,
  suboptimal: 55,
  critical: 30,
};

const parseRange = (range?: string): { min?: number; max?: number } => {
  if (!range) return {};
  const numbers = range.match(/-?\d+(\.\d+)?/g);
  if (!numbers || numbers.length === 0) return {};
  if (numbers.length === 1) {
    const value = Number(numbers[0]);
    return { min: value, max: value };
  }
  return { min: Number(numbers[0]), max: Number(numbers[1]) };
};

const scoreToStatus = (score: number): BiomarkerStatus => {
  if (score >= 80) return "optimal";
  if (score >= 65) return "normal";
  if (score >= 45) return "suboptimal";
  return "critical";
};

export const useBloodCalculations = (report: BloodAnalysisReport | null) => {
  const normalizedMarkers = useMemo(() => {
    const raw = report?.analysis?.markers || [];
    return raw.map((marker) => {
      const markerId = marker.markerId || marker.id || marker.name.toLowerCase().replace(/\s+/g, "_");
      const meta = getMarkerById(markerId);
      const normal = parseRange(marker.normalRange);
      const optimal = parseRange(marker.optimalRange);
      return {
        id: markerId,
        name: marker.name,
        value: marker.value,
        unit: marker.unit,
        status: normalizeBiomarkerStatus(marker.status),
        normalMin: normal.min,
        normalMax: normal.max,
        optimalMin: optimal.min,
        optimalMax: optimal.max,
        interpretation: marker.interpretation,
        history: marker.history,
        panelId: meta?.panel,
        panelTitle: meta ? BLOOD_PANELS.find((p) => p.id === meta.panel)?.title : undefined,
      };
    });
  }, [report]);

  const panelGroups = useMemo(() => {
    return BLOOD_PANELS.map((panel) => {
      const markers = normalizedMarkers.filter((marker) => marker.panelId === panel.id);
      const averageScore = markers.length
        ? Math.round(
            markers.reduce((acc, marker) => acc + STATUS_SCORE[marker.status], 0) / markers.length
          )
        : 0;
      return {
        ...panel,
        markers,
        score: averageScore,
      };
    });
  }, [normalizedMarkers]);

  const globalScore = useMemo(() => {
    const scored = panelGroups.filter((panel) => panel.markers.length > 0);
    if (!scored.length) return 0;
    const total = scored.reduce((acc, panel) => acc + panel.score, 0);
    return Math.round(total / scored.length);
  }, [panelGroups]);

  const radarData = useMemo(() => {
    return panelGroups.map((panel) => ({
      key: panel.id,
      label: panel.title,
      score: panel.score,
      status: scoreToStatus(panel.score),
    }));
  }, [panelGroups]);

  return {
    normalizedMarkers,
    panelGroups,
    globalScore,
    radarData,
  };
};
