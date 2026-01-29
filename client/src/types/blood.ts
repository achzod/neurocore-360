export type MarkerStatus = "optimal" | "normal" | "suboptimal" | "critical";

export interface BloodMarker {
  code: string;
  name: string;
  value: number;
  unit: string;
  status: MarkerStatus;
  score: number;
  optimalMin: number | null;
  optimalMax: number | null;
  normalMin: number | null;
  normalMax: number | null;
  panel: PanelKey;
  percentile?: number;
}

export type PanelKey =
  | "hormonal"
  | "thyroid"
  | "metabolic"
  | "inflammatory"
  | "vitamins"
  | "liver_kidney";

export interface PanelScore {
  panel: PanelKey;
  score: number;
  markersCount: number;
  criticalCount: number;
  suboptimalCount: number;
}

export interface DerivedMetrics {
  anabolicIndex: number | null;
  recompReadiness: number | null;
  diabetesRisk: {
    score: number;
    level: "low" | "moderate" | "high" | "very_high";
  } | null;
  inflammationScore: number | null;
}

export interface BloodReportData {
  reportId: string;
  patientName: string;
  patientAge: number | null;
  patientSex: "male" | "female" | "unknown";
  createdAt: string;
  globalScore: number;
  panelScores: PanelScore[];
  markers: BloodMarker[];
  derivedMetrics: DerivedMetrics;
  patientContext: {
    age: number | null;
    sex: "male" | "female" | "unknown";
    bmi: number | null;
    sleep: string | null;
    training: string | null;
    calories: string | null;
    alcohol: string | null;
    stress: string | null;
    supplements: string | null;
  };
  aiAnalysis: string;
  correlations: CorrelationInsight[];
  protocolSteps: ProtocolStep[];
  supplements: Supplement[];
  sources: Citation[];
}

export interface CorrelationInsight {
  markerCode: string;
  insight: string;
  recommendation: string | null;
  confidence: "low" | "medium" | "high";
}

export interface ProtocolStep {
  phase: "immediate" | "short_term" | "long_term";
  category: "lifestyle" | "supplement" | "retest";
  priority: "high" | "medium" | "low";
  action: string;
  duration: string;
  markers: string[];
}

export interface Supplement {
  name: string;
  dosage: string;
  timing: string;
  brand: string | null;
  markers: string[];
  studies: string[];
  citations?: string[];  // Expert citations (MPMD, Huberman, Attia)
  mechanism?: string;    // How it works
}

export interface Citation {
  panel: PanelKey;
  text: string;
  url: string | null;
}

export interface BiomarkerDetailExtended {
  definition: {
    intro: string;
    mechanism: string;
    clinical: string;
    ranges: {
      optimal: string;
      normal: string;
      suboptimal: string;
      critical: string;
      interpretation: string;
    };
    variations: string;
    studies: string[];
  };
  impact: {
    performance: {
      hypertrophy: string;
      strength: string;
      recovery: string;
      bodyComp: string;
    };
    health: {
      energy: string;
      mood: string;
      cognition: string;
      immunity: string;
    };
    longTerm: {
      cardiovascular: string;
      metabolic: string;
      lifespan: string;
    };
    studies: string[];
  };
  protocol: {
    phase1_lifestyle: {
      duration: string;
      sleep: string;
      nutrition: string;
      training: string;
      stress: string;
      alcohol: string;
      expected_impact: string;
    };
    phase2_supplements: {
      duration: string;
      supplements: Array<{
        name: string;
        dosage: string;
        timing: string;
        brand: string;
        mechanism: string;
        studies: string[];
      }>;
      budget: string;
      expected_impact: string;
    };
    phase3_retest: {
      duration: string;
      when: string;
      markers: string;
      success_criteria: string;
      next_steps: string;
    };
    special_cases: {
      non_responders: string;
      contraindications: string;
      red_flags: string;
    };
  };
}
