import { useMemo } from 'react';
import { BLOOD_PANELS, getMarkerById } from '@/lib/blood-questionnaire';
import { normalizeBiomarkerStatus, BiomarkerStatus } from '@/lib/biomarker-colors';

type RawMarker = {
  markerId?: string;
  id?: string;
  name: string;
  value: number | string;
  unit?: string;
  status?: string;
  normalRange?: string;
  optimalRange?: string;
  interpretation?: string;
  category?: string;
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

const CATEGORY_TO_PANEL: Record<string, string> = {
  hormonal: "hormonal",
  thyroid: "thyroid",
  metabolique: "metabolic",
  metabolic: "metabolic",
  inflammation: "inflammation",
  inflammatory: "inflammation",
  vitamines: "vitamins",
  vitamins: "vitamins",
  liver_kidney: "liver_kidney",
  renal: "liver_kidney",
  renal_hepatique: "liver_kidney",
};

const parseRange = (range?: string): { min?: number; max?: number } => {
  if (!range) return {};
  const normalizedRange = String(range)
    .replace(/,/g, '.')
    .replace(/[\u2212\u2013\u2014]/g, '-')
    // Prevent "10-40" from being parsed as [10, -40].
    .replace(/(\d)\s*-\s*(?=\d)/g, '$1 to ');
  const numbers = normalizedRange.match(/[+-]?\d+(?:\.\d+)?/g);
  if (!numbers || numbers.length === 0) return {};
  if (numbers.length === 1) {
    const value = Number(numbers[0]);
    return { min: value, max: value };
  }
  const min = Number(numbers[0]);
  const max = Number(numbers[1]);
  return {
    min: Math.min(min, max),
    max: Math.max(min, max),
  };
};

const scoreToStatus = (score: number): BiomarkerStatus => {
  if (score >= 80) return "optimal";
  if (score >= 65) return "normal";
  if (score >= 45) return "suboptimal";
  return "critical";
};

export const useBloodCalculations = (report: BloodAnalysisReport | null) => {
  const normalizedMarkers = useMemo(() => {
    const raw = (report?.analysis?.markers || []) as RawMarker[];
    const fallbackRaw = (Array.isArray(report?.markers) ? (report?.markers as RawMarker[]) : []);
    const source = raw.length ? raw : fallbackRaw;
    return source.map((marker) => {
      const markerName = String(marker.name || marker.markerId || marker.id || "Marqueur");
      const markerId = marker.markerId || marker.id || markerName.toLowerCase().replace(/\s+/g, "_");
      const meta = getMarkerById(markerId);
      const rawCategory = String(marker.category || "").trim().toLowerCase();
      const parsedValue = Number(marker.value);
      const normal = parseRange(marker.normalRange);
      const optimal = parseRange(marker.optimalRange);
      return {
        id: markerId,
        name: markerName,
        value: Number.isFinite(parsedValue) ? parsedValue : 0,
        unit: marker.unit || "",
        status: normalizeBiomarkerStatus(marker.status),
        normalMin: normal.min,
        normalMax: normal.max,
        optimalMin: optimal.min,
        optimalMax: optimal.max,
        interpretation: marker.interpretation,
        history: marker.history,
        panelId: meta?.panel || CATEGORY_TO_PANEL[rawCategory],
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
