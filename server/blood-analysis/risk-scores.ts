/**
 * NEUROCORE 360 - Blood Analysis Risk Scores Engine
 * Comprehensive risk assessments based on bloodwork
 * 
 * Sources: ADA, AHA/ACC, ATP III, Peter Attia, Marek Health
 */

import { BloodMarkerInput, BIOMARKER_RANGES, MarkerAnalysis } from "./index";

// ============================================
// TYPES
// ============================================

export type RiskLevel = "minimal" | "low" | "moderate" | "elevated" | "high" | "critical";

export interface RiskScore {
  name: string;
  score: number; // 0-100
  level: RiskLevel;
  interpretation: string;
  factors: RiskFactor[];
  recommendations: string[];
  markers_used: string[];
  confidence: "high" | "medium" | "low"; // Based on how many markers available
}

export interface RiskFactor {
  marker: string;
  value: number;
  unit: string;
  contribution: "positive" | "negative" | "neutral";
  weight: number; // Impact on score
  explanation: string;
}

export interface ComprehensiveRiskProfile {
  prediabetes: RiskScore;
  insulinResistance: RiskScore;
  cardiovascular: RiskScore;
  metabolicSyndrome: RiskScore;
  thyroidDysfunction: RiskScore;
  inflammation: RiskScore;
  anemia: RiskScore;
  liverHealth: RiskScore;
  kidneyFunction: RiskScore;
  hormonalHealth: RiskScore;
  overallHealth: RiskScore;
  timestamp: string;
}

// ============================================
// ADDITIONAL BIOMARKERS (EXTENDED)
// ============================================

export const EXTENDED_BIOMARKER_RANGES: Record<string, {
  name: string;
  unit: string;
  normalMin: number;
  normalMax: number;
  optimalMin: number;
  optimalMax: number;
  context?: string;
  genderSpecific?: "homme" | "femme";
}> = {
  // Hematology Panel
  wbc: {
    name: "Globules blancs (WBC)",
    unit: "10³/µL",
    normalMin: 4.5, normalMax: 11.0,
    optimalMin: 5.0, optimalMax: 8.0,
    context: "Immunité, infection"
  },
  rbc: {
    name: "Globules rouges (RBC)",
    unit: "10⁶/µL",
    normalMin: 4.5, normalMax: 5.5,
    optimalMin: 4.7, optimalMax: 5.3,
    context: "Transport O2",
    genderSpecific: "homme"
  },
  rbc_femme: {
    name: "Globules rouges (RBC)",
    unit: "10⁶/µL",
    normalMin: 4.0, normalMax: 5.0,
    optimalMin: 4.2, optimalMax: 4.8,
    context: "Transport O2",
    genderSpecific: "femme"
  },
  hemoglobin: {
    name: "Hémoglobine",
    unit: "g/dL",
    normalMin: 13.5, normalMax: 17.5,
    optimalMin: 14.5, optimalMax: 16.5,
    context: "Capacité oxygène",
    genderSpecific: "homme"
  },
  hemoglobin_femme: {
    name: "Hémoglobine",
    unit: "g/dL",
    normalMin: 12.0, normalMax: 16.0,
    optimalMin: 13.0, optimalMax: 15.0,
    context: "Capacité oxygène",
    genderSpecific: "femme"
  },
  hematocrit: {
    name: "Hématocrite",
    unit: "%",
    normalMin: 38.8, normalMax: 50.0,
    optimalMin: 42, optimalMax: 48,
    context: "Volume globules",
    genderSpecific: "homme"
  },
  hematocrit_femme: {
    name: "Hématocrite",
    unit: "%",
    normalMin: 34.9, normalMax: 44.5,
    optimalMin: 37, optimalMax: 43,
    context: "Volume globules",
    genderSpecific: "femme"
  },
  mcv: {
    name: "VGM (MCV)",
    unit: "fL",
    normalMin: 80, normalMax: 100,
    optimalMin: 85, optimalMax: 95,
    context: "Taille GR - anémie"
  },
  mch: {
    name: "TCMH (MCH)",
    unit: "pg",
    normalMin: 27, normalMax: 33,
    optimalMin: 28, optimalMax: 32,
    context: "Hémoglobine/GR"
  },
  mchc: {
    name: "CCMH (MCHC)",
    unit: "g/dL",
    normalMin: 32, normalMax: 36,
    optimalMin: 33, optimalMax: 35,
    context: "Concentration Hb"
  },
  rdw: {
    name: "IDR (RDW)",
    unit: "%",
    normalMin: 11.5, normalMax: 14.5,
    optimalMin: 11.5, optimalMax: 13.0,
    context: "Homogénéité GR"
  },
  platelets: {
    name: "Plaquettes",
    unit: "10³/µL",
    normalMin: 150, normalMax: 400,
    optimalMin: 200, optimalMax: 350,
    context: "Coagulation"
  },
  mpv: {
    name: "VPM (MPV)",
    unit: "fL",
    normalMin: 7.5, normalMax: 12.0,
    optimalMin: 8.5, optimalMax: 11.0,
    context: "Taille plaquettes"
  },

  // Liver Extended
  alp: {
    name: "Phosphatase alcaline (ALP)",
    unit: "U/L",
    normalMin: 44, normalMax: 147,
    optimalMin: 50, optimalMax: 100,
    context: "Foie, os, bile"
  },
  albumin: {
    name: "Albumine",
    unit: "g/dL",
    normalMin: 3.5, normalMax: 5.0,
    optimalMin: 4.0, optimalMax: 4.8,
    context: "Synthèse hépatique"
  },
  total_protein: {
    name: "Protéines totales",
    unit: "g/dL",
    normalMin: 6.0, normalMax: 8.3,
    optimalMin: 6.5, optimalMax: 7.8,
    context: "État nutritionnel"
  },
  bilirubin_total: {
    name: "Bilirubine totale",
    unit: "mg/dL",
    normalMin: 0.1, normalMax: 1.2,
    optimalMin: 0.2, optimalMax: 0.8,
    context: "Fonction biliaire"
  },
  bilirubin_direct: {
    name: "Bilirubine directe",
    unit: "mg/dL",
    normalMin: 0.0, normalMax: 0.3,
    optimalMin: 0.0, optimalMax: 0.2,
    context: "Conjuguée"
  },

  // Kidney Extended
  urea: {
    name: "Urée",
    unit: "mg/dL",
    normalMin: 7, normalMax: 20,
    optimalMin: 10, optimalMax: 18,
    context: "Fonction rénale"
  },
  bun: {
    name: "BUN",
    unit: "mg/dL",
    normalMin: 6, normalMax: 20,
    optimalMin: 10, optimalMax: 16,
    context: "Azote uréique"
  },
  uric_acid: {
    name: "Acide urique",
    unit: "mg/dL",
    normalMin: 3.5, normalMax: 7.2,
    optimalMin: 4.0, optimalMax: 6.0,
    context: "Goutte, cardio",
    genderSpecific: "homme"
  },
  uric_acid_femme: {
    name: "Acide urique",
    unit: "mg/dL",
    normalMin: 2.5, normalMax: 6.2,
    optimalMin: 3.0, optimalMax: 5.5,
    context: "Goutte, cardio",
    genderSpecific: "femme"
  },
  cystatin_c: {
    name: "Cystatine C",
    unit: "mg/L",
    normalMin: 0.5, normalMax: 1.0,
    optimalMin: 0.6, optimalMax: 0.9,
    context: "Fonction rénale fine"
  },

  // Metabolic Extended
  fructosamine: {
    name: "Fructosamine",
    unit: "µmol/L",
    normalMin: 200, normalMax: 285,
    optimalMin: 200, optimalMax: 260,
    context: "Glycémie 2-3 semaines"
  },
  c_peptide: {
    name: "C-peptide",
    unit: "ng/mL",
    normalMin: 0.8, normalMax: 3.1,
    optimalMin: 1.0, optimalMax: 2.5,
    context: "Production insuline"
  },
  adiponectin: {
    name: "Adiponectine",
    unit: "µg/mL",
    normalMin: 4, normalMax: 30,
    optimalMin: 10, optimalMax: 25,
    context: "Sensibilité insuline"
  },
  leptin: {
    name: "Leptine",
    unit: "ng/mL",
    normalMin: 2, normalMax: 15,
    optimalMin: 3, optimalMax: 10,
    context: "Satiété, métabolisme"
  },

  // Cardiovascular Extended
  cholesterol_total: {
    name: "Cholestérol total",
    unit: "mg/dL",
    normalMin: 125, normalMax: 200,
    optimalMin: 150, optimalMax: 180,
    context: "Lipides totaux"
  },
  vldl: {
    name: "VLDL",
    unit: "mg/dL",
    normalMin: 5, normalMax: 40,
    optimalMin: 5, optimalMax: 25,
    context: "Transporteur TG"
  },
  non_hdl: {
    name: "Non-HDL",
    unit: "mg/dL",
    normalMin: 0, normalMax: 130,
    optimalMin: 0, optimalMax: 100,
    context: "Tout le mauvais"
  },
  tg_hdl_ratio: {
    name: "Ratio TG/HDL",
    unit: "",
    normalMin: 0, normalMax: 3.5,
    optimalMin: 0, optimalMax: 1.5,
    context: "Résistance insuline"
  },
  remnant_cholesterol: {
    name: "Remnant cholestérol",
    unit: "mg/dL",
    normalMin: 0, normalMax: 24,
    optimalMin: 0, optimalMax: 15,
    context: "Athérogène"
  },
  nt_probnp: {
    name: "NT-proBNP",
    unit: "pg/mL",
    normalMin: 0, normalMax: 125,
    optimalMin: 0, optimalMax: 75,
    context: "Insuffisance cardiaque"
  },
  fibrinogen: {
    name: "Fibrinogène",
    unit: "mg/dL",
    normalMin: 200, normalMax: 400,
    optimalMin: 200, optimalMax: 300,
    context: "Coagulation, inflammation"
  },

  // Inflammation Extended
  il6: {
    name: "IL-6",
    unit: "pg/mL",
    normalMin: 0, normalMax: 7.0,
    optimalMin: 0, optimalMax: 2.0,
    context: "Cytokine inflammatoire"
  },
  tnf_alpha: {
    name: "TNF-α",
    unit: "pg/mL",
    normalMin: 0, normalMax: 8.1,
    optimalMin: 0, optimalMax: 4.0,
    context: "Inflammation chronique"
  },
  esr: {
    name: "VS (ESR)",
    unit: "mm/h",
    normalMin: 0, normalMax: 20,
    optimalMin: 0, optimalMax: 10,
    context: "Inflammation générale"
  },

  // Minerals Extended
  calcium: {
    name: "Calcium total",
    unit: "mg/dL",
    normalMin: 8.6, normalMax: 10.3,
    optimalMin: 9.0, optimalMax: 10.0,
    context: "Os, nerfs, muscles"
  },
  calcium_ionized: {
    name: "Calcium ionisé",
    unit: "mmol/L",
    normalMin: 1.12, normalMax: 1.32,
    optimalMin: 1.18, optimalMax: 1.28,
    context: "Forme active"
  },
  phosphorus: {
    name: "Phosphore",
    unit: "mg/dL",
    normalMin: 2.5, normalMax: 4.5,
    optimalMin: 3.0, optimalMax: 4.0,
    context: "Os, énergie"
  },
  sodium: {
    name: "Sodium",
    unit: "mEq/L",
    normalMin: 136, normalMax: 145,
    optimalMin: 138, optimalMax: 143,
    context: "Équilibre hydrique"
  },
  potassium: {
    name: "Potassium",
    unit: "mEq/L",
    normalMin: 3.5, normalMax: 5.0,
    optimalMin: 4.0, optimalMax: 4.8,
    context: "Cœur, muscles"
  },
  chloride: {
    name: "Chlore",
    unit: "mEq/L",
    normalMin: 98, normalMax: 106,
    optimalMin: 100, optimalMax: 104,
    context: "Équilibre acide-base"
  },
  bicarbonate: {
    name: "Bicarbonate (CO2)",
    unit: "mEq/L",
    normalMin: 22, normalMax: 29,
    optimalMin: 24, optimalMax: 27,
    context: "Équilibre acide-base"
  },
  copper: {
    name: "Cuivre",
    unit: "µg/dL",
    normalMin: 70, normalMax: 140,
    optimalMin: 80, optimalMax: 120,
    context: "Antioxydant, fer"
  },
  selenium: {
    name: "Sélénium",
    unit: "µg/L",
    normalMin: 70, normalMax: 150,
    optimalMin: 100, optimalMax: 130,
    context: "Thyroïde, antioxydant"
  },
  iodine: {
    name: "Iode urinaire",
    unit: "µg/L",
    normalMin: 100, normalMax: 300,
    optimalMin: 150, optimalMax: 250,
    context: "Thyroïde"
  },

  // Vitamins Extended
  vitamin_a: {
    name: "Vitamine A (Rétinol)",
    unit: "µg/dL",
    normalMin: 30, normalMax: 65,
    optimalMin: 40, optimalMax: 60,
    context: "Vision, immunité"
  },
  vitamin_e: {
    name: "Vitamine E (α-tocophérol)",
    unit: "mg/L",
    normalMin: 5.5, normalMax: 17.0,
    optimalMin: 8.0, optimalMax: 14.0,
    context: "Antioxydant"
  },
  vitamin_b1: {
    name: "Vitamine B1 (Thiamine)",
    unit: "nmol/L",
    normalMin: 70, normalMax: 180,
    optimalMin: 100, optimalMax: 160,
    context: "Énergie, nerfs"
  },
  vitamin_b6: {
    name: "Vitamine B6 (PLP)",
    unit: "nmol/L",
    normalMin: 20, normalMax: 125,
    optimalMin: 40, optimalMax: 100,
    context: "Neurotransmetteurs"
  },
  vitamin_c: {
    name: "Vitamine C",
    unit: "mg/dL",
    normalMin: 0.4, normalMax: 2.0,
    optimalMin: 0.8, optimalMax: 1.5,
    context: "Antioxydant, collagène"
  },
  vitamin_k: {
    name: "Vitamine K",
    unit: "ng/mL",
    normalMin: 0.1, normalMax: 2.2,
    optimalMin: 0.5, optimalMax: 1.5,
    context: "Coagulation, os"
  },
  omega3_index: {
    name: "Omega-3 Index",
    unit: "%",
    normalMin: 4, normalMax: 999,
    optimalMin: 8, optimalMax: 12,
    context: "EPA+DHA dans GR"
  },

  // Hormones Extended (already have some, adding missing)
  progesterone: {
    name: "Progestérone",
    unit: "ng/mL",
    normalMin: 0.1, normalMax: 25,
    optimalMin: 5, optimalMax: 20,
    context: "Phase lutéale",
    genderSpecific: "femme"
  },
  testosterone_femme: {
    name: "Testostérone totale",
    unit: "ng/dL",
    normalMin: 15, normalMax: 70,
    optimalMin: 25, optimalMax: 50,
    context: "Libido, énergie",
    genderSpecific: "femme"
  },
  amh: {
    name: "AMH",
    unit: "ng/mL",
    normalMin: 1.0, normalMax: 10.0,
    optimalMin: 2.0, optimalMax: 6.0,
    context: "Réserve ovarienne",
    genderSpecific: "femme"
  },
  psa: {
    name: "PSA total",
    unit: "ng/mL",
    normalMin: 0, normalMax: 4.0,
    optimalMin: 0, optimalMax: 1.5,
    context: "Prostate",
    genderSpecific: "homme"
  },
  free_psa: {
    name: "PSA libre",
    unit: "%",
    normalMin: 15, normalMax: 100,
    optimalMin: 25, optimalMax: 100,
    context: "Ratio PSA",
    genderSpecific: "homme"
  },
  shbg_femme: {
    name: "SHBG",
    unit: "nmol/L",
    normalMin: 18, normalMax: 144,
    optimalMin: 40, optimalMax: 80,
    context: "Transport hormones",
    genderSpecific: "femme"
  }
};

// ============================================
// HELPER FUNCTIONS
// ============================================

function getRiskLevel(score: number): RiskLevel {
  if (score >= 90) return "minimal";
  if (score >= 75) return "low";
  if (score >= 60) return "moderate";
  if (score >= 40) return "elevated";
  if (score >= 20) return "high";
  return "critical";
}

function getMarkerValue(markers: BloodMarkerInput[], markerId: string): number | null {
  const marker = markers.find(m => m.markerId === markerId);
  return marker ? marker.value : null;
}

function calculateConfidence(availableMarkers: number, requiredMarkers: number): "high" | "medium" | "low" {
  const ratio = availableMarkers / requiredMarkers;
  if (ratio >= 0.8) return "high";
  if (ratio >= 0.5) return "medium";
  return "low";
}

// ============================================
// PRE-DIABETES RISK ASSESSMENT
// ============================================

export function calculatePrediabetesRisk(
  markers: BloodMarkerInput[],
  profile: { age?: string; gender: "homme" | "femme"; bmi?: number }
): RiskScore {
  const factors: RiskFactor[] = [];
  let riskPoints = 0;
  let maxPoints = 0;
  const markersUsed: string[] = [];

  // HbA1c - Major indicator (0-25 points)
  const hba1c = getMarkerValue(markers, "hba1c");
  if (hba1c !== null) {
    markersUsed.push("hba1c");
    maxPoints += 25;
    let points = 0;
    let contribution: "positive" | "negative" | "neutral" = "neutral";
    let explanation = "";

    if (hba1c < 5.0) {
      points = 0;
      contribution = "positive";
      explanation = "HbA1c excellente (<5.0%), régulation glycémique optimale";
    } else if (hba1c < 5.4) {
      points = 5;
      contribution = "positive";
      explanation = "HbA1c normale (5.0-5.3%), bon contrôle glycémique";
    } else if (hba1c < 5.7) {
      points = 10;
      contribution = "neutral";
      explanation = "HbA1c limite haute (5.4-5.6%), à surveiller";
    } else if (hba1c < 6.0) {
      points = 18;
      contribution = "negative";
      explanation = "PRÉ-DIABÈTE selon ADA (5.7-5.9%), intervention nécessaire";
    } else if (hba1c < 6.5) {
      points = 23;
      contribution = "negative";
      explanation = "PRÉ-DIABÈTE avancé (6.0-6.4%), risque élevé de diabète";
    } else {
      points = 25;
      contribution = "negative";
      explanation = "DIABÈTE (≥6.5%), consultation médicale urgente";
    }

    riskPoints += points;
    factors.push({
      marker: "HbA1c",
      value: hba1c,
      unit: "%",
      contribution,
      weight: points,
      explanation
    });
  }

  // Glycémie à jeun (0-25 points)
  const glucose = getMarkerValue(markers, "glycemie_jeun");
  if (glucose !== null) {
    markersUsed.push("glycemie_jeun");
    maxPoints += 25;
    let points = 0;
    let contribution: "positive" | "negative" | "neutral" = "neutral";
    let explanation = "";

    if (glucose < 70) {
      points = 8;
      contribution = "negative";
      explanation = "Hypoglycémie (<70 mg/dL), possible dysrégulation";
    } else if (glucose < 85) {
      points = 0;
      contribution = "positive";
      explanation = "Glycémie optimale (70-84 mg/dL)";
    } else if (glucose < 95) {
      points = 5;
      contribution = "positive";
      explanation = "Glycémie normale (85-94 mg/dL)";
    } else if (glucose < 100) {
      points = 12;
      contribution = "neutral";
      explanation = "Glycémie limite (95-99 mg/dL), résistance insuline possible";
    } else if (glucose < 110) {
      points = 18;
      contribution = "negative";
      explanation = "PRÉ-DIABÈTE léger (100-109 mg/dL) selon OMS";
    } else if (glucose < 126) {
      points = 23;
      contribution = "negative";
      explanation = "PRÉ-DIABÈTE (110-125 mg/dL), intervention urgente";
    } else {
      points = 25;
      contribution = "negative";
      explanation = "DIABÈTE (≥126 mg/dL), diagnostic médical requis";
    }

    riskPoints += points;
    factors.push({
      marker: "Glycémie à jeun",
      value: glucose,
      unit: "mg/dL",
      contribution,
      weight: points,
      explanation
    });
  }

  // Insuline à jeun (0-20 points)
  const insulin = getMarkerValue(markers, "insuline_jeun");
  if (insulin !== null) {
    markersUsed.push("insuline_jeun");
    maxPoints += 20;
    let points = 0;
    let contribution: "positive" | "negative" | "neutral" = "neutral";
    let explanation = "";

    if (insulin < 3) {
      points = 5;
      contribution = "neutral";
      explanation = "Insuline basse (<3 µIU/mL), vérifier fonction pancréatique";
    } else if (insulin < 6) {
      points = 0;
      contribution = "positive";
      explanation = "Insuline optimale (3-5 µIU/mL), excellente sensibilité";
    } else if (insulin < 10) {
      points = 5;
      contribution = "positive";
      explanation = "Insuline normale (6-9 µIU/mL)";
    } else if (insulin < 15) {
      points = 12;
      contribution = "negative";
      explanation = "Insuline élevée (10-14 µIU/mL), résistance débutante";
    } else if (insulin < 25) {
      points = 18;
      contribution = "negative";
      explanation = "Hyperinsulinémie (15-24 µIU/mL), résistance confirmée";
    } else {
      points = 20;
      contribution = "negative";
      explanation = "Hyperinsulinémie sévère (≥25 µIU/mL), intervention urgente";
    }

    riskPoints += points;
    factors.push({
      marker: "Insuline à jeun",
      value: insulin,
      unit: "µIU/mL",
      contribution,
      weight: points,
      explanation
    });
  }

  // HOMA-IR (0-20 points)
  const homaIr = getMarkerValue(markers, "homa_ir");
  if (homaIr !== null) {
    markersUsed.push("homa_ir");
    maxPoints += 20;
    let points = 0;
    let contribution: "positive" | "negative" | "neutral" = "neutral";
    let explanation = "";

    if (homaIr < 1.0) {
      points = 0;
      contribution = "positive";
      explanation = "HOMA-IR optimal (<1.0), excellente sensibilité insuline";
    } else if (homaIr < 1.5) {
      points = 3;
      contribution = "positive";
      explanation = "HOMA-IR bon (1.0-1.4)";
    } else if (homaIr < 2.0) {
      points = 8;
      contribution = "neutral";
      explanation = "HOMA-IR limite (1.5-1.9), surveillance recommandée";
    } else if (homaIr < 2.5) {
      points = 14;
      contribution = "negative";
      explanation = "Résistance insuline légère (2.0-2.4)";
    } else if (homaIr < 3.5) {
      points = 17;
      contribution = "negative";
      explanation = "Résistance insuline modérée (2.5-3.4)";
    } else {
      points = 20;
      contribution = "negative";
      explanation = "Résistance insuline sévère (≥3.5)";
    }

    riskPoints += points;
    factors.push({
      marker: "HOMA-IR",
      value: homaIr,
      unit: "",
      contribution,
      weight: points,
      explanation
    });
  }

  // Triglycérides (0-10 points) - marqueur métabolique
  const tg = getMarkerValue(markers, "triglycerides");
  if (tg !== null) {
    markersUsed.push("triglycerides");
    maxPoints += 10;
    let points = 0;
    let contribution: "positive" | "negative" | "neutral" = "neutral";
    let explanation = "";

    if (tg < 70) {
      points = 0;
      contribution = "positive";
      explanation = "Triglycérides optimaux (<70 mg/dL)";
    } else if (tg < 100) {
      points = 2;
      contribution = "positive";
      explanation = "Triglycérides bons (70-99 mg/dL)";
    } else if (tg < 150) {
      points = 5;
      contribution = "neutral";
      explanation = "Triglycérides normaux (100-149 mg/dL)";
    } else if (tg < 200) {
      points = 8;
      contribution = "negative";
      explanation = "Triglycérides élevés (150-199 mg/dL), lien avec résistance insuline";
    } else {
      points = 10;
      contribution = "negative";
      explanation = "Hypertriglycéridémie (≥200 mg/dL)";
    }

    riskPoints += points;
    factors.push({
      marker: "Triglycérides",
      value: tg,
      unit: "mg/dL",
      contribution,
      weight: points,
      explanation
    });
  }

  // Calculate final score (inverted - lower risk = higher score)
  const rawRisk = maxPoints > 0 ? (riskPoints / maxPoints) * 100 : 50;
  const score = Math.round(100 - rawRisk);
  const level = getRiskLevel(score);

  // Generate interpretation
  let interpretation = "";
  if (score >= 85) {
    interpretation = "Risque de pré-diabète MINIMAL. Ton métabolisme glucidique est excellent. Continue de maintenir ces habitudes.";
  } else if (score >= 70) {
    interpretation = "Risque de pré-diabète FAIBLE. Quelques marqueurs légèrement élevés mais rien d'alarmant. Prévention recommandée.";
  } else if (score >= 55) {
    interpretation = "Risque de pré-diabète MODÉRÉ. Certains indicateurs montrent une tendance vers la résistance à l'insuline. Action préventive nécessaire.";
  } else if (score >= 40) {
    interpretation = "Risque de pré-diabète ÉLEVÉ. Plusieurs marqueurs indiquent une dysrégulation glycémique. Intervention nutritionnelle et lifestyle urgente.";
  } else if (score >= 25) {
    interpretation = "PRÉ-DIABÈTE PROBABLE. Tes résultats correspondent aux critères diagnostiques. Consultation médicale recommandée.";
  } else {
    interpretation = "DIABÈTE PROBABLE ou PRÉ-DIABÈTE SÉVÈRE. Consultation médicale URGENTE nécessaire pour diagnostic et prise en charge.";
  }

  // Generate recommendations based on factors
  const recommendations: string[] = [];
  
  if (score < 85) {
    recommendations.push("Réduire les glucides raffinés et sucres ajoutés");
    recommendations.push("Marche 15min après chaque repas (réduit pic glycémique de 30-50%)");
  }
  
  if (score < 70) {
    recommendations.push("Musculation 3x/semaine minimum (améliore sensibilité insuline)");
    recommendations.push("Manger fibres et protéines AVANT les glucides");
    recommendations.push("Considérer berbérine 500mg 2x/jour avant repas glucidiques");
  }
  
  if (score < 55) {
    recommendations.push("Jeûne intermittent 16:8 pour améliorer sensibilité insuline");
    recommendations.push("Limiter glucides à <100g/jour temporairement");
    recommendations.push("Supplémenter magnésium glycinate 400mg/jour");
    recommendations.push("Chrome 200mcg/jour");
  }
  
  if (score < 40) {
    recommendations.push("CONSULTATION MÉDICALE RECOMMANDÉE");
    recommendations.push("Régime cétogène ou très low-carb (<50g/jour) à considérer");
    recommendations.push("ALA (acide alpha-lipoïque) 600mg/jour");
    recommendations.push("Contrôle glycémique régulier avec glucomètre");
  }

  return {
    name: "Risque Pré-Diabète",
    score,
    level,
    interpretation,
    factors,
    recommendations,
    markers_used: markersUsed,
    confidence: calculateConfidence(markersUsed.length, 5)
  };
}

// ============================================
// INSULIN RESISTANCE INDEX
// ============================================

export function calculateInsulinResistanceIndex(
  markers: BloodMarkerInput[]
): RiskScore {
  const factors: RiskFactor[] = [];
  let totalScore = 100;
  const markersUsed: string[] = [];

  // HOMA-IR (most important)
  const homaIr = getMarkerValue(markers, "homa_ir");
  if (homaIr !== null) {
    markersUsed.push("homa_ir");
    let deduction = 0;
    if (homaIr >= 3.5) deduction = 35;
    else if (homaIr >= 2.5) deduction = 25;
    else if (homaIr >= 2.0) deduction = 18;
    else if (homaIr >= 1.5) deduction = 10;
    else if (homaIr >= 1.0) deduction = 5;

    totalScore -= deduction;
    factors.push({
      marker: "HOMA-IR",
      value: homaIr,
      unit: "",
      contribution: deduction > 15 ? "negative" : deduction > 5 ? "neutral" : "positive",
      weight: deduction,
      explanation: homaIr < 1.5 ? "Sensibilité insuline excellente" : 
                   homaIr < 2.5 ? "Sensibilité insuline diminuée" : "Résistance insuline confirmée"
    });
  }

  // TG/HDL Ratio (proxy for insulin resistance)
  const tg = getMarkerValue(markers, "triglycerides");
  const hdl = getMarkerValue(markers, "hdl");
  if (tg !== null && hdl !== null && hdl > 0) {
    markersUsed.push("triglycerides", "hdl");
    const ratio = tg / hdl;
    let deduction = 0;
    
    if (ratio >= 4) deduction = 25;
    else if (ratio >= 3) deduction = 18;
    else if (ratio >= 2) deduction = 10;
    else if (ratio >= 1.5) deduction = 5;

    totalScore -= deduction;
    factors.push({
      marker: "Ratio TG/HDL",
      value: Math.round(ratio * 100) / 100,
      unit: "",
      contribution: deduction > 15 ? "negative" : deduction > 5 ? "neutral" : "positive",
      weight: deduction,
      explanation: ratio < 1.5 ? "Ratio optimal, bonne sensibilité insuline" :
                   ratio < 2.5 ? "Ratio élevé, sensibilité insuline diminuée" :
                   "Ratio très élevé, marqueur de résistance insuline"
    });
  }

  // Insuline à jeun
  const insulin = getMarkerValue(markers, "insuline_jeun");
  if (insulin !== null) {
    markersUsed.push("insuline_jeun");
    let deduction = 0;
    if (insulin >= 25) deduction = 20;
    else if (insulin >= 15) deduction = 15;
    else if (insulin >= 10) deduction = 10;
    else if (insulin >= 7) deduction = 5;

    totalScore -= deduction;
    factors.push({
      marker: "Insuline à jeun",
      value: insulin,
      unit: "µIU/mL",
      contribution: deduction > 10 ? "negative" : deduction > 5 ? "neutral" : "positive",
      weight: deduction,
      explanation: insulin < 7 ? "Production insuline optimale" :
                   insulin < 15 ? "Hyperinsulinémie compensatoire" :
                   "Hyperinsulinémie marquée"
    });
  }

  // Glycémie à jeun
  const glucose = getMarkerValue(markers, "glycemie_jeun");
  if (glucose !== null) {
    markersUsed.push("glycemie_jeun");
    let deduction = 0;
    if (glucose >= 126) deduction = 15;
    else if (glucose >= 110) deduction = 12;
    else if (glucose >= 100) deduction = 8;
    else if (glucose >= 95) deduction = 4;

    totalScore -= deduction;
    factors.push({
      marker: "Glycémie à jeun",
      value: glucose,
      unit: "mg/dL",
      contribution: deduction > 8 ? "negative" : deduction > 0 ? "neutral" : "positive",
      weight: deduction,
      explanation: glucose < 95 ? "Glycémie optimale" :
                   glucose < 110 ? "Glycémie limite haute" :
                   "Hyperglycémie"
    });
  }

  const score = Math.max(0, Math.min(100, totalScore));
  const level = getRiskLevel(score);

  let interpretation = "";
  if (score >= 85) {
    interpretation = "Sensibilité à l'insuline EXCELLENTE. Ton corps utilise efficacement l'insuline pour réguler la glycémie.";
  } else if (score >= 70) {
    interpretation = "Sensibilité à l'insuline BONNE. Quelques optimisations possibles mais pas de problème majeur.";
  } else if (score >= 55) {
    interpretation = "Sensibilité à l'insuline DIMINUÉE. Résistance insuline débutante détectée. Intervention préventive recommandée.";
  } else if (score >= 40) {
    interpretation = "RÉSISTANCE À L'INSULINE MODÉRÉE. Ton corps compense en produisant plus d'insuline. Action nécessaire.";
  } else {
    interpretation = "RÉSISTANCE À L'INSULINE SÉVÈRE. Risque élevé de progression vers le diabète type 2. Prise en charge médicale recommandée.";
  }

  const recommendations: string[] = [];
  if (score < 85) {
    recommendations.push("Priorité aux aliments à index glycémique bas");
  }
  if (score < 70) {
    recommendations.push("Réduire les glucides raffinés de 50%");
    recommendations.push("Ajouter musculation 3x/semaine");
  }
  if (score < 55) {
    recommendations.push("Berbérine 500mg 2-3x/jour avec repas");
    recommendations.push("Vinaigre de cidre 1 c.à.s. avant repas glucidiques");
    recommendations.push("Considérer jeûne intermittent");
  }
  if (score < 40) {
    recommendations.push("Consultation endocrinologue recommandée");
    recommendations.push("Metformine possiblement indiquée (voir médecin)");
  }

  return {
    name: "Indice de Résistance à l'Insuline",
    score,
    level,
    interpretation,
    factors,
    recommendations,
    markers_used: markersUsed,
    confidence: calculateConfidence(markersUsed.length, 4)
  };
}

// ============================================
// CARDIOVASCULAR RISK SCORE
// ============================================

export function calculateCardiovascularRisk(
  markers: BloodMarkerInput[],
  profile: { age?: string; gender: "homme" | "femme"; smoker?: boolean; hypertension?: boolean; familyHistory?: boolean }
): RiskScore {
  const factors: RiskFactor[] = [];
  let riskPoints = 0;
  const markersUsed: string[] = [];

  // Age factor
  const age = profile.age ? parseInt(profile.age) : 35;
  let agePoints = 0;
  if (age >= 65) agePoints = 15;
  else if (age >= 55) agePoints = 10;
  else if (age >= 45) agePoints = 5;
  else if (age >= 40) agePoints = 2;

  riskPoints += agePoints;
  factors.push({
    marker: "Âge",
    value: age,
    unit: "ans",
    contribution: agePoints > 5 ? "negative" : "neutral",
    weight: agePoints,
    explanation: age < 40 ? "Facteur âge favorable" : "Risque augmente avec l'âge"
  });

  // Gender (men have higher baseline risk)
  if (profile.gender === "homme") {
    riskPoints += 5;
    factors.push({
      marker: "Sexe",
      value: 1,
      unit: "",
      contribution: "negative",
      weight: 5,
      explanation: "Les hommes ont un risque CV baseline plus élevé"
    });
  }

  // LDL
  const ldl = getMarkerValue(markers, "ldl");
  if (ldl !== null) {
    markersUsed.push("ldl");
    let points = 0;
    if (ldl >= 190) points = 15;
    else if (ldl >= 160) points = 12;
    else if (ldl >= 130) points = 8;
    else if (ldl >= 100) points = 4;

    riskPoints += points;
    factors.push({
      marker: "LDL",
      value: ldl,
      unit: "mg/dL",
      contribution: points > 8 ? "negative" : points > 0 ? "neutral" : "positive",
      weight: points,
      explanation: ldl < 100 ? "LDL optimal" : ldl < 160 ? "LDL limite" : "LDL élevé"
    });
  }

  // ApoB (better predictor than LDL)
  const apob = getMarkerValue(markers, "apob");
  if (apob !== null) {
    markersUsed.push("apob");
    let points = 0;
    if (apob >= 130) points = 15;
    else if (apob >= 100) points = 10;
    else if (apob >= 80) points = 5;

    riskPoints += points;
    factors.push({
      marker: "ApoB",
      value: apob,
      unit: "mg/dL",
      contribution: points > 8 ? "negative" : points > 0 ? "neutral" : "positive",
      weight: points,
      explanation: apob < 80 ? "ApoB optimal (meilleur prédicteur que LDL)" : "ApoB élevé, nombre de particules athérogènes augmenté"
    });
  }

  // Lp(a) - genetic risk factor
  const lpa = getMarkerValue(markers, "lpa");
  if (lpa !== null) {
    markersUsed.push("lpa");
    let points = 0;
    if (lpa >= 50) points = 15;
    else if (lpa >= 30) points = 10;
    else if (lpa >= 14) points = 5;

    riskPoints += points;
    factors.push({
      marker: "Lp(a)",
      value: lpa,
      unit: "mg/dL",
      contribution: points > 8 ? "negative" : points > 0 ? "neutral" : "positive",
      weight: points,
      explanation: lpa < 14 ? "Lp(a) optimal" : "Lp(a) élevé - facteur génétique, considérer niacine/PCSK9i"
    });
  }

  // HDL (protective)
  const hdl = getMarkerValue(markers, "hdl");
  if (hdl !== null) {
    markersUsed.push("hdl");
    let points = 0;
    if (hdl < 40) points = 10;
    else if (hdl < 50) points = 5;
    else if (hdl >= 60) points = -5; // Protective

    riskPoints += points;
    factors.push({
      marker: "HDL",
      value: hdl,
      unit: "mg/dL",
      contribution: hdl >= 60 ? "positive" : hdl < 50 ? "negative" : "neutral",
      weight: Math.abs(points),
      explanation: hdl >= 60 ? "HDL élevé, effet cardioprotecteur" : hdl < 40 ? "HDL bas, facteur de risque" : "HDL acceptable"
    });
  }

  // Triglycérides
  const tg = getMarkerValue(markers, "triglycerides");
  if (tg !== null) {
    markersUsed.push("triglycerides");
    let points = 0;
    if (tg >= 500) points = 12;
    else if (tg >= 200) points = 8;
    else if (tg >= 150) points = 4;

    riskPoints += points;
    factors.push({
      marker: "Triglycérides",
      value: tg,
      unit: "mg/dL",
      contribution: points > 5 ? "negative" : points > 0 ? "neutral" : "positive",
      weight: points,
      explanation: tg < 150 ? "TG normaux" : tg < 200 ? "TG limite" : "Hypertriglycéridémie"
    });
  }

  // CRP-us (inflammation)
  const crp = getMarkerValue(markers, "crp_us");
  if (crp !== null) {
    markersUsed.push("crp_us");
    let points = 0;
    if (crp >= 3) points = 10;
    else if (crp >= 1) points = 5;
    else if (crp >= 0.5) points = 2;

    riskPoints += points;
    factors.push({
      marker: "CRP-us",
      value: crp,
      unit: "mg/L",
      contribution: points > 5 ? "negative" : points > 0 ? "neutral" : "positive",
      weight: points,
      explanation: crp < 0.5 ? "Inflammation minimale" : crp < 1 ? "Inflammation légère" : "Inflammation élevée, risque CV augmenté"
    });
  }

  // Homocystéine
  const hcy = getMarkerValue(markers, "homocysteine");
  if (hcy !== null) {
    markersUsed.push("homocysteine");
    let points = 0;
    if (hcy >= 15) points = 8;
    else if (hcy >= 12) points = 5;
    else if (hcy >= 10) points = 2;

    riskPoints += points;
    factors.push({
      marker: "Homocystéine",
      value: hcy,
      unit: "µmol/L",
      contribution: points > 5 ? "negative" : points > 0 ? "neutral" : "positive",
      weight: points,
      explanation: hcy < 9 ? "Homocystéine optimale" : "Hyperhomocystéinémie - supplémenter B9/B12/B6"
    });
  }

  // Lifestyle factors
  if (profile.smoker) {
    riskPoints += 15;
    factors.push({
      marker: "Tabac",
      value: 1,
      unit: "",
      contribution: "negative",
      weight: 15,
      explanation: "Tabagisme actif - facteur de risque majeur"
    });
  }

  if (profile.hypertension) {
    riskPoints += 10;
    factors.push({
      marker: "Hypertension",
      value: 1,
      unit: "",
      contribution: "negative",
      weight: 10,
      explanation: "Hypertension artérielle"
    });
  }

  if (profile.familyHistory) {
    riskPoints += 8;
    factors.push({
      marker: "Antécédents familiaux",
      value: 1,
      unit: "",
      contribution: "negative",
      weight: 8,
      explanation: "Antécédents familiaux de maladie CV précoce"
    });
  }

  // Calculate score (max ~100 points, inverted)
  const maxPoints = 100;
  const score = Math.max(0, Math.min(100, Math.round(100 - (riskPoints / maxPoints) * 100)));
  const level = getRiskLevel(score);

  let interpretation = "";
  if (score >= 85) {
    interpretation = "Risque cardiovasculaire MINIMAL. Ton profil lipidique et inflammatoire est excellent.";
  } else if (score >= 70) {
    interpretation = "Risque cardiovasculaire FAIBLE. Quelques optimisations possibles pour une protection maximale.";
  } else if (score >= 55) {
    interpretation = "Risque cardiovasculaire MODÉRÉ. Plusieurs facteurs de risque présents. Prévention primaire recommandée.";
  } else if (score >= 40) {
    interpretation = "Risque cardiovasculaire ÉLEVÉ. Intervention active nécessaire sur lipides et inflammation.";
  } else {
    interpretation = "Risque cardiovasculaire TRÈS ÉLEVÉ. Consultation cardiologique recommandée. Statines possiblement indiquées.";
  }

  const recommendations: string[] = [];
  if (score < 85) {
    recommendations.push("Oméga-3 (EPA/DHA) 2-4g/jour");
  }
  if (score < 70) {
    recommendations.push("Réduire glucides raffinés pour baisser TG");
    recommendations.push("Exercice aérobie 150min/semaine minimum");
  }
  if (score < 55) {
    recommendations.push("Considérer niacine 500mg-1g/jour si Lp(a) élevé");
    recommendations.push("Citrus bergamote 500mg 2x/jour (alternative naturelle statines)");
    recommendations.push("Ail vieilli (Kyolic) 1200mg/jour");
  }
  if (score < 40) {
    recommendations.push("Consultation cardiologique recommandée");
    recommendations.push("Discuter statines/PCSK9i avec médecin");
    recommendations.push("Scanner calcium coronaire à considérer");
  }

  return {
    name: "Risque Cardiovasculaire",
    score,
    level,
    interpretation,
    factors,
    recommendations,
    markers_used: markersUsed,
    confidence: calculateConfidence(markersUsed.length, 7)
  };
}

// ============================================
// METABOLIC SYNDROME DETECTION
// ============================================

export function detectMetabolicSyndrome(
  markers: BloodMarkerInput[],
  profile: { gender: "homme" | "femme"; waistCircumference?: number; bloodPressure?: { systolic: number; diastolic: number } }
): RiskScore {
  const factors: RiskFactor[] = [];
  let criteriaCount = 0;
  const markersUsed: string[] = [];

  // ATP III criteria for Metabolic Syndrome (need 3 of 5)

  // 1. Waist circumference
  if (profile.waistCircumference) {
    const threshold = profile.gender === "homme" ? 102 : 88;
    const met = profile.waistCircumference >= threshold;
    if (met) criteriaCount++;
    
    factors.push({
      marker: "Tour de taille",
      value: profile.waistCircumference,
      unit: "cm",
      contribution: met ? "negative" : "positive",
      weight: met ? 20 : 0,
      explanation: met ? 
        `Tour de taille ≥${threshold}cm - critère rempli` :
        `Tour de taille <${threshold}cm - critère non rempli`
    });
  }

  // 2. Triglycerides ≥150 mg/dL
  const tg = getMarkerValue(markers, "triglycerides");
  if (tg !== null) {
    markersUsed.push("triglycerides");
    const met = tg >= 150;
    if (met) criteriaCount++;
    
    factors.push({
      marker: "Triglycérides",
      value: tg,
      unit: "mg/dL",
      contribution: met ? "negative" : "positive",
      weight: met ? 20 : 0,
      explanation: met ?
        "TG ≥150 mg/dL - critère rempli" :
        "TG <150 mg/dL - critère non rempli"
    });
  }

  // 3. HDL <40 (homme) ou <50 (femme)
  const hdl = getMarkerValue(markers, "hdl");
  if (hdl !== null) {
    markersUsed.push("hdl");
    const threshold = profile.gender === "homme" ? 40 : 50;
    const met = hdl < threshold;
    if (met) criteriaCount++;
    
    factors.push({
      marker: "HDL",
      value: hdl,
      unit: "mg/dL",
      contribution: met ? "negative" : "positive",
      weight: met ? 20 : 0,
      explanation: met ?
        `HDL <${threshold} mg/dL - critère rempli` :
        `HDL ≥${threshold} mg/dL - critère non rempli`
    });
  }

  // 4. Blood pressure ≥130/85
  if (profile.bloodPressure) {
    const met = profile.bloodPressure.systolic >= 130 || profile.bloodPressure.diastolic >= 85;
    if (met) criteriaCount++;
    
    factors.push({
      marker: "Pression artérielle",
      value: profile.bloodPressure.systolic,
      unit: `/${profile.bloodPressure.diastolic} mmHg`,
      contribution: met ? "negative" : "positive",
      weight: met ? 20 : 0,
      explanation: met ?
        "PA ≥130/85 mmHg - critère rempli" :
        "PA <130/85 mmHg - critère non rempli"
    });
  }

  // 5. Glycémie à jeun ≥100 mg/dL
  const glucose = getMarkerValue(markers, "glycemie_jeun");
  if (glucose !== null) {
    markersUsed.push("glycemie_jeun");
    const met = glucose >= 100;
    if (met) criteriaCount++;
    
    factors.push({
      marker: "Glycémie à jeun",
      value: glucose,
      unit: "mg/dL",
      contribution: met ? "negative" : "positive",
      weight: met ? 20 : 0,
      explanation: met ?
        "Glycémie ≥100 mg/dL - critère rempli" :
        "Glycémie <100 mg/dL - critère non rempli"
    });
  }

  // Calculate score
  const totalCriteria = factors.length;
  const hasMetabolicSyndrome = criteriaCount >= 3;
  const score = Math.round(100 - (criteriaCount / Math.max(totalCriteria, 5)) * 100);
  const level = getRiskLevel(score);

  let interpretation = "";
  if (criteriaCount === 0) {
    interpretation = "AUCUN critère de syndrome métabolique. Profil métabolique excellent.";
  } else if (criteriaCount === 1) {
    interpretation = `1 critère rempli sur ${totalCriteria}. Pas de syndrome métabolique mais optimisation recommandée.`;
  } else if (criteriaCount === 2) {
    interpretation = `2 critères remplis sur ${totalCriteria}. PRÉ-SYNDROME MÉTABOLIQUE - intervention préventive fortement recommandée.`;
  } else {
    interpretation = `SYNDROME MÉTABOLIQUE CONFIRMÉ (${criteriaCount}/${totalCriteria} critères). Risque élevé de diabète type 2 et maladies cardiovasculaires.`;
  }

  const recommendations: string[] = [];
  if (criteriaCount >= 1) {
    recommendations.push("Activité physique 150-300min/semaine");
  }
  if (criteriaCount >= 2) {
    recommendations.push("Réduction glucides raffinés et sucres ajoutés");
    recommendations.push("Augmenter fibres à 30g+/jour");
    recommendations.push("Perdre 5-10% du poids corporel si surpoids");
  }
  if (criteriaCount >= 3) {
    recommendations.push("CONSULTATION MÉDICALE RECOMMANDÉE");
    recommendations.push("Considérer metformine (voir médecin)");
    recommendations.push("Régime méditerranéen ou low-carb");
    recommendations.push("Suivi régulier glycémie et lipides");
  }

  return {
    name: "Syndrome Métabolique",
    score,
    level,
    interpretation,
    factors,
    recommendations,
    markers_used: markersUsed,
    confidence: calculateConfidence(totalCriteria, 5)
  };
}

// ============================================
// THYROID DYSFUNCTION SCORE
// ============================================

export function calculateThyroidScore(
  markers: BloodMarkerInput[]
): RiskScore {
  const factors: RiskFactor[] = [];
  let totalScore = 100;
  const markersUsed: string[] = [];

  // TSH (most important screening)
  const tsh = getMarkerValue(markers, "tsh");
  if (tsh !== null) {
    markersUsed.push("tsh");
    let deduction = 0;
    let explanation = "";

    if (tsh < 0.4) {
      deduction = 25;
      explanation = "TSH basse (<0.4) - possible hyperthyroïdie";
    } else if (tsh < 0.5) {
      deduction = 10;
      explanation = "TSH limite basse - surveillance recommandée";
    } else if (tsh <= 2.0) {
      deduction = 0;
      explanation = "TSH optimale (0.5-2.0)";
    } else if (tsh <= 2.5) {
      deduction = 5;
      explanation = "TSH acceptable mais pas optimale";
    } else if (tsh <= 4.5) {
      deduction = 15;
      explanation = "TSH élevée (>2.5) - hypothyroïdie subclinique possible";
    } else {
      deduction = 30;
      explanation = "TSH très élevée (>4.5) - hypothyroïdie probable";
    }

    totalScore -= deduction;
    factors.push({
      marker: "TSH",
      value: tsh,
      unit: "mIU/L",
      contribution: deduction > 10 ? "negative" : deduction > 0 ? "neutral" : "positive",
      weight: deduction,
      explanation
    });
  }

  // T4 libre
  const t4 = getMarkerValue(markers, "t4_libre");
  if (t4 !== null) {
    markersUsed.push("t4_libre");
    let deduction = 0;
    let explanation = "";

    if (t4 < 0.8) {
      deduction = 20;
      explanation = "T4 libre basse - hypothyroïdie";
    } else if (t4 < 1.2) {
      deduction = 10;
      explanation = "T4 libre limite basse";
    } else if (t4 <= 1.6) {
      deduction = 0;
      explanation = "T4 libre optimale";
    } else if (t4 <= 1.8) {
      deduction = 5;
      explanation = "T4 libre haute normale";
    } else {
      deduction = 20;
      explanation = "T4 libre élevée - hyperthyroïdie possible";
    }

    totalScore -= deduction;
    factors.push({
      marker: "T4 libre",
      value: t4,
      unit: "ng/dL",
      contribution: deduction > 10 ? "negative" : deduction > 0 ? "neutral" : "positive",
      weight: deduction,
      explanation
    });
  }

  // T3 libre
  const t3 = getMarkerValue(markers, "t3_libre");
  if (t3 !== null) {
    markersUsed.push("t3_libre");
    let deduction = 0;
    let explanation = "";

    if (t3 < 2.3) {
      deduction = 15;
      explanation = "T3 libre basse - problème de conversion possible";
    } else if (t3 < 3.0) {
      deduction = 8;
      explanation = "T3 libre suboptimale";
    } else if (t3 <= 4.0) {
      deduction = 0;
      explanation = "T3 libre optimale (hormone active)";
    } else if (t3 <= 4.2) {
      deduction = 3;
      explanation = "T3 libre haute normale";
    } else {
      deduction = 15;
      explanation = "T3 libre élevée";
    }

    totalScore -= deduction;
    factors.push({
      marker: "T3 libre",
      value: t3,
      unit: "pg/mL",
      contribution: deduction > 10 ? "negative" : deduction > 0 ? "neutral" : "positive",
      weight: deduction,
      explanation
    });
  }

  // T3 reverse
  const rt3 = getMarkerValue(markers, "t3_reverse");
  if (rt3 !== null) {
    markersUsed.push("t3_reverse");
    let deduction = 0;
    let explanation = "";

    if (rt3 > 20) {
      deduction = 20;
      explanation = "T3 reverse élevée - conversion T4→T3 bloquée (stress, inflammation, déficit calorique)";
    } else if (rt3 > 15) {
      deduction = 10;
      explanation = "T3 reverse limite haute";
    } else {
      deduction = 0;
      explanation = "T3 reverse normale";
    }

    totalScore -= deduction;
    factors.push({
      marker: "T3 reverse",
      value: rt3,
      unit: "ng/dL",
      contribution: deduction > 10 ? "negative" : deduction > 0 ? "neutral" : "positive",
      weight: deduction,
      explanation
    });
  }

  // Anti-TPO
  const antiTpo = getMarkerValue(markers, "anti_tpo");
  if (antiTpo !== null) {
    markersUsed.push("anti_tpo");
    let deduction = 0;
    let explanation = "";

    if (antiTpo > 100) {
      deduction = 25;
      explanation = "Anti-TPO très élevés - thyroïdite auto-immune (Hashimoto probable)";
    } else if (antiTpo > 35) {
      deduction = 15;
      explanation = "Anti-TPO positifs - auto-immunité thyroïdienne";
    } else if (antiTpo > 20) {
      deduction = 5;
      explanation = "Anti-TPO limites";
    } else {
      deduction = 0;
      explanation = "Anti-TPO normaux - pas d'auto-immunité détectée";
    }

    totalScore -= deduction;
    factors.push({
      marker: "Anti-TPO",
      value: antiTpo,
      unit: "IU/mL",
      contribution: deduction > 10 ? "negative" : deduction > 0 ? "neutral" : "positive",
      weight: deduction,
      explanation
    });
  }

  const score = Math.max(0, Math.min(100, totalScore));
  const level = getRiskLevel(score);

  let interpretation = "";
  if (score >= 85) {
    interpretation = "Fonction thyroïdienne OPTIMALE. Métabolisme bien régulé.";
  } else if (score >= 70) {
    interpretation = "Fonction thyroïdienne ACCEPTABLE. Quelques optimisations possibles.";
  } else if (score >= 55) {
    interpretation = "Dysfonction thyroïdienne LÉGÈRE. Hypothyroïdie subclinique possible ou problème de conversion.";
  } else if (score >= 40) {
    interpretation = "Dysfonction thyroïdienne MODÉRÉE. Consultation endocrinologue recommandée.";
  } else {
    interpretation = "Dysfonction thyroïdienne SIGNIFICATIVE. Bilan thyroïdien complet et consultation médicale nécessaires.";
  }

  const recommendations: string[] = [];
  if (score < 85) {
    recommendations.push("Vérifier apport en iode et sélénium");
  }
  if (score < 70) {
    recommendations.push("Sélénium 200mcg/jour (aide conversion T4→T3)");
    recommendations.push("Réduire stress chronique (augmente rT3)");
    recommendations.push("Éviter déficit calorique prolongé");
  }
  if (score < 55) {
    recommendations.push("Zinc 30mg/jour");
    recommendations.push("Ashwagandha 600mg/jour (KSM-66)");
    recommendations.push("Consultation endocrinologue recommandée");
  }
  if (score < 40) {
    recommendations.push("CONSULTATION MÉDICALE NÉCESSAIRE");
    recommendations.push("Envisager traitement hormonal substitutif");
  }

  return {
    name: "Santé Thyroïdienne",
    score,
    level,
    interpretation,
    factors,
    recommendations,
    markers_used: markersUsed,
    confidence: calculateConfidence(markersUsed.length, 5)
  };
}

// ============================================
// INFLAMMATION INDEX
// ============================================

export function calculateInflammationIndex(
  markers: BloodMarkerInput[]
): RiskScore {
  const factors: RiskFactor[] = [];
  let totalScore = 100;
  const markersUsed: string[] = [];

  // CRP-us (most important)
  const crp = getMarkerValue(markers, "crp_us");
  if (crp !== null) {
    markersUsed.push("crp_us");
    let deduction = 0;
    let explanation = "";

    if (crp < 0.3) {
      deduction = 0;
      explanation = "CRP-us optimale (<0.3) - inflammation minimale";
    } else if (crp < 0.5) {
      deduction = 5;
      explanation = "CRP-us excellente";
    } else if (crp < 1.0) {
      deduction = 10;
      explanation = "CRP-us normale mais pas optimale";
    } else if (crp < 3.0) {
      deduction = 20;
      explanation = "CRP-us élevée - inflammation chronique légère";
    } else if (crp < 10) {
      deduction = 30;
      explanation = "CRP-us très élevée - inflammation significative";
    } else {
      deduction = 40;
      explanation = "CRP-us très haute (>10) - infection ou inflammation aiguë?";
    }

    totalScore -= deduction;
    factors.push({
      marker: "CRP-us",
      value: crp,
      unit: "mg/L",
      contribution: deduction > 15 ? "negative" : deduction > 5 ? "neutral" : "positive",
      weight: deduction,
      explanation
    });
  }

  // Homocystéine
  const hcy = getMarkerValue(markers, "homocysteine");
  if (hcy !== null) {
    markersUsed.push("homocysteine");
    let deduction = 0;
    let explanation = "";

    if (hcy < 7) {
      deduction = 0;
      explanation = "Homocystéine optimale";
    } else if (hcy < 9) {
      deduction = 5;
      explanation = "Homocystéine bonne";
    } else if (hcy < 12) {
      deduction = 15;
      explanation = "Homocystéine élevée - méthylation suboptimale";
    } else if (hcy < 15) {
      deduction = 20;
      explanation = "Hyperhomocystéinémie - risque CV et inflammatoire";
    } else {
      deduction = 25;
      explanation = "Hyperhomocystéinémie sévère";
    }

    totalScore -= deduction;
    factors.push({
      marker: "Homocystéine",
      value: hcy,
      unit: "µmol/L",
      contribution: deduction > 15 ? "negative" : deduction > 5 ? "neutral" : "positive",
      weight: deduction,
      explanation
    });
  }

  // Ferritine (can indicate inflammation when high)
  const ferritin = getMarkerValue(markers, "ferritine");
  if (ferritin !== null) {
    markersUsed.push("ferritine");
    let deduction = 0;
    let explanation = "";

    if (ferritin < 30) {
      deduction = 10;
      explanation = "Ferritine basse - carence en fer possible";
    } else if (ferritin < 80) {
      deduction = 5;
      explanation = "Ferritine suboptimale";
    } else if (ferritin <= 150) {
      deduction = 0;
      explanation = "Ferritine optimale";
    } else if (ferritin <= 300) {
      deduction = 10;
      explanation = "Ferritine élevée - peut indiquer inflammation";
    } else {
      deduction = 20;
      explanation = "Ferritine très élevée - inflammation ou surcharge en fer";
    }

    totalScore -= deduction;
    factors.push({
      marker: "Ferritine",
      value: ferritin,
      unit: "ng/mL",
      contribution: deduction > 10 ? "negative" : deduction > 0 ? "neutral" : "positive",
      weight: deduction,
      explanation
    });
  }

  // GGT (oxidative stress marker)
  const ggt = getMarkerValue(markers, "ggt");
  if (ggt !== null) {
    markersUsed.push("ggt");
    let deduction = 0;
    let explanation = "";

    if (ggt < 15) {
      deduction = 0;
      explanation = "GGT optimal - stress oxydatif bas";
    } else if (ggt < 25) {
      deduction = 5;
      explanation = "GGT bon";
    } else if (ggt < 40) {
      deduction = 10;
      explanation = "GGT élevé - stress oxydatif";
    } else {
      deduction = 20;
      explanation = "GGT très élevé - stress oxydatif ou hépatique";
    }

    totalScore -= deduction;
    factors.push({
      marker: "GGT",
      value: ggt,
      unit: "U/L",
      contribution: deduction > 10 ? "negative" : deduction > 0 ? "neutral" : "positive",
      weight: deduction,
      explanation
    });
  }

  const score = Math.max(0, Math.min(100, totalScore));
  const level = getRiskLevel(score);

  let interpretation = "";
  if (score >= 85) {
    interpretation = "Profil inflammatoire EXCELLENT. Inflammation systémique minimale.";
  } else if (score >= 70) {
    interpretation = "Profil inflammatoire BON. Légère marge d'amélioration.";
  } else if (score >= 55) {
    interpretation = "Inflammation LÉGÈRE détectée. Optimisation lifestyle recommandée.";
  } else if (score >= 40) {
    interpretation = "Inflammation MODÉRÉE. Plusieurs marqueurs élevés. Intervention anti-inflammatoire nécessaire.";
  } else {
    interpretation = "Inflammation CHRONIQUE SIGNIFICATIVE. Rechercher causes sous-jacentes. Bilan médical recommandé.";
  }

  const recommendations: string[] = [];
  if (score < 85) {
    recommendations.push("Oméga-3 (EPA/DHA) 2-3g/jour");
  }
  if (score < 70) {
    recommendations.push("Curcumine 500mg + pipérine 2x/jour");
    recommendations.push("Réduire oméga-6 (huiles végétales, aliments transformés)");
    recommendations.push("Augmenter légumes colorés et fruits rouges");
  }
  if (score < 55) {
    recommendations.push("Éliminer sucres ajoutés et glucides raffinés");
    recommendations.push("Vitamine B9 (méthylfolate) 400-800mcg si homocystéine élevée");
    recommendations.push("B12 (méthylcobalamine) 1000mcg si homocystéine élevée");
    recommendations.push("Optimiser sommeil (7-9h)");
  }
  if (score < 40) {
    recommendations.push("Bilan médical pour rechercher causes (infections, auto-immunité)");
    recommendations.push("Régime anti-inflammatoire strict (méditerranéen ou AIP)");
    recommendations.push("NAC 600mg 2x/jour (glutathion)");
  }

  return {
    name: "Indice Inflammatoire",
    score,
    level,
    interpretation,
    factors,
    recommendations,
    markers_used: markersUsed,
    confidence: calculateConfidence(markersUsed.length, 4)
  };
}

// ============================================
// LIVER HEALTH SCORE
// ============================================

export function calculateLiverHealthScore(
  markers: BloodMarkerInput[]
): RiskScore {
  const factors: RiskFactor[] = [];
  let totalScore = 100;
  const markersUsed: string[] = [];

  // ALT
  const alt = getMarkerValue(markers, "alt");
  if (alt !== null) {
    markersUsed.push("alt");
    let deduction = 0;
    if (alt < 20) deduction = 0;
    else if (alt < 30) deduction = 5;
    else if (alt < 45) deduction = 15;
    else if (alt < 60) deduction = 25;
    else deduction = 35;

    totalScore -= deduction;
    factors.push({
      marker: "ALT",
      value: alt,
      unit: "U/L",
      contribution: deduction > 15 ? "negative" : deduction > 5 ? "neutral" : "positive",
      weight: deduction,
      explanation: alt < 25 ? "ALT optimale" : alt < 45 ? "ALT légèrement élevée" : "ALT élevée - stress hépatique"
    });
  }

  // AST
  const ast = getMarkerValue(markers, "ast");
  if (ast !== null) {
    markersUsed.push("ast");
    let deduction = 0;
    if (ast < 20) deduction = 0;
    else if (ast < 30) deduction = 5;
    else if (ast < 40) deduction = 12;
    else if (ast < 50) deduction = 20;
    else deduction = 30;

    totalScore -= deduction;
    factors.push({
      marker: "AST",
      value: ast,
      unit: "U/L",
      contribution: deduction > 12 ? "negative" : deduction > 5 ? "neutral" : "positive",
      weight: deduction,
      explanation: ast < 25 ? "AST optimale" : ast < 40 ? "AST acceptable" : "AST élevée"
    });
  }

  // GGT
  const ggt = getMarkerValue(markers, "ggt");
  if (ggt !== null) {
    markersUsed.push("ggt");
    let deduction = 0;
    if (ggt < 20) deduction = 0;
    else if (ggt < 30) deduction = 5;
    else if (ggt < 50) deduction = 15;
    else deduction = 25;

    totalScore -= deduction;
    factors.push({
      marker: "GGT",
      value: ggt,
      unit: "U/L",
      contribution: deduction > 10 ? "negative" : deduction > 0 ? "neutral" : "positive",
      weight: deduction,
      explanation: ggt < 25 ? "GGT optimale" : "GGT élevée - alcool, médicaments ou stéatose"
    });
  }

  const score = Math.max(0, Math.min(100, totalScore));
  const level = getRiskLevel(score);

  let interpretation = "";
  if (score >= 85) {
    interpretation = "Santé hépatique EXCELLENTE. Enzymes hépatiques optimales.";
  } else if (score >= 70) {
    interpretation = "Santé hépatique BONNE. Légère élévation sans conséquence majeure.";
  } else if (score >= 55) {
    interpretation = "Stress hépatique LÉGER détecté. Optimiser alimentation et réduire alcool.";
  } else if (score >= 40) {
    interpretation = "Stress hépatique MODÉRÉ. Enzymes élevées - évaluation médicale recommandée.";
  } else {
    interpretation = "ATTEINTE HÉPATIQUE significative. Consultation médicale nécessaire.";
  }

  const recommendations: string[] = [];
  if (score < 85) {
    recommendations.push("Réduire ou éliminer l'alcool");
  }
  if (score < 70) {
    recommendations.push("Chardon-marie (silymarine) 300mg 2x/jour");
    recommendations.push("NAC 600mg 2x/jour (précurseur glutathion)");
  }
  if (score < 55) {
    recommendations.push("Éliminer alcool complètement pendant 30 jours");
    recommendations.push("Réduire fructose et glucides raffinés (stéatose)");
    recommendations.push("Échographie hépatique recommandée");
  }

  return {
    name: "Santé Hépatique",
    score,
    level,
    interpretation,
    factors,
    recommendations,
    markers_used: markersUsed,
    confidence: calculateConfidence(markersUsed.length, 3)
  };
}

// ============================================
// KIDNEY FUNCTION SCORE
// ============================================

export function calculateKidneyFunctionScore(
  markers: BloodMarkerInput[],
  profile: { age?: string }
): RiskScore {
  const factors: RiskFactor[] = [];
  let totalScore = 100;
  const markersUsed: string[] = [];

  // eGFR
  const egfr = getMarkerValue(markers, "egfr");
  if (egfr !== null) {
    markersUsed.push("egfr");
    let deduction = 0;
    if (egfr >= 90) deduction = 0;
    else if (egfr >= 60) deduction = 15;
    else if (egfr >= 45) deduction = 30;
    else if (egfr >= 30) deduction = 45;
    else deduction = 60;

    totalScore -= deduction;
    factors.push({
      marker: "eGFR",
      value: egfr,
      unit: "mL/min",
      contribution: deduction > 20 ? "negative" : deduction > 0 ? "neutral" : "positive",
      weight: deduction,
      explanation: egfr >= 90 ? "Filtration rénale normale" : egfr >= 60 ? "IRC stade 2" : "IRC stade 3+"
    });
  }

  // Créatinine
  const creat = getMarkerValue(markers, "creatinine");
  if (creat !== null) {
    markersUsed.push("creatinine");
    let deduction = 0;
    if (creat < 0.8) deduction = 5;
    else if (creat <= 1.1) deduction = 0;
    else if (creat <= 1.3) deduction = 10;
    else if (creat <= 1.5) deduction = 20;
    else deduction = 30;

    totalScore -= deduction;
    factors.push({
      marker: "Créatinine",
      value: creat,
      unit: "mg/dL",
      contribution: deduction > 10 ? "negative" : deduction > 0 ? "neutral" : "positive",
      weight: deduction,
      explanation: creat <= 1.1 ? "Créatinine normale" : "Créatinine élevée - vérifier fonction rénale"
    });
  }

  const score = Math.max(0, Math.min(100, totalScore));
  const level = getRiskLevel(score);

  let interpretation = "";
  if (score >= 85) {
    interpretation = "Fonction rénale EXCELLENTE. Filtration optimale.";
  } else if (score >= 70) {
    interpretation = "Fonction rénale BONNE. Légère diminution possible liée à l'âge.";
  } else if (score >= 55) {
    interpretation = "Fonction rénale DIMINUÉE (stade 2). Surveillance recommandée.";
  } else if (score >= 40) {
    interpretation = "Insuffisance rénale MODÉRÉE (stade 3). Suivi néphrologique nécessaire.";
  } else {
    interpretation = "Insuffisance rénale SIGNIFICATIVE. Consultation néphrologue urgente.";
  }

  const recommendations: string[] = [];
  if (score < 85) {
    recommendations.push("Hydratation suffisante (2-3L/jour)");
  }
  if (score < 70) {
    recommendations.push("Limiter protéines à 1.2-1.5g/kg si IRC confirmée");
    recommendations.push("Contrôler pression artérielle");
  }
  if (score < 55) {
    recommendations.push("Consultation néphrologie recommandée");
    recommendations.push("Éviter AINS (ibuprofène, etc.)");
  }

  return {
    name: "Fonction Rénale",
    score,
    level,
    interpretation,
    factors,
    recommendations,
    markers_used: markersUsed,
    confidence: calculateConfidence(markersUsed.length, 2)
  };
}

// ============================================
// HORMONAL HEALTH SCORE
// ============================================

export function calculateHormonalHealthScore(
  markers: BloodMarkerInput[],
  profile: { gender: "homme" | "femme"; age?: string }
): RiskScore {
  const factors: RiskFactor[] = [];
  let totalScore = 100;
  const markersUsed: string[] = [];

  if (profile.gender === "homme") {
    // Testosterone total
    const testo = getMarkerValue(markers, "testosterone_total");
    if (testo !== null) {
      markersUsed.push("testosterone_total");
      let deduction = 0;
      if (testo < 300) deduction = 35;
      else if (testo < 450) deduction = 25;
      else if (testo < 550) deduction = 15;
      else if (testo < 650) deduction = 5;
      else if (testo <= 900) deduction = 0;
      else deduction = 10; // Too high

      totalScore -= deduction;
      factors.push({
        marker: "Testostérone totale",
        value: testo,
        unit: "ng/dL",
        contribution: deduction > 15 ? "negative" : deduction > 5 ? "neutral" : "positive",
        weight: deduction,
        explanation: testo >= 600 ? "Testostérone optimale" : testo >= 450 ? "Testostérone acceptable" : "Testostérone basse"
      });
    }

    // SHBG
    const shbg = getMarkerValue(markers, "shbg");
    if (shbg !== null) {
      markersUsed.push("shbg");
      let deduction = 0;
      if (shbg < 15) deduction = 10;
      else if (shbg <= 35) deduction = 0;
      else if (shbg <= 50) deduction = 10;
      else deduction = 20;

      totalScore -= deduction;
      factors.push({
        marker: "SHBG",
        value: shbg,
        unit: "nmol/L",
        contribution: deduction > 10 ? "negative" : deduction > 0 ? "neutral" : "positive",
        weight: deduction,
        explanation: shbg <= 35 ? "SHBG optimal" : shbg > 50 ? "SHBG élevé - moins de testo libre" : "SHBG acceptable"
      });
    }

    // Estradiol
    const e2 = getMarkerValue(markers, "estradiol");
    if (e2 !== null) {
      markersUsed.push("estradiol");
      let deduction = 0;
      if (e2 < 15) deduction = 15;
      else if (e2 <= 30) deduction = 0;
      else if (e2 <= 40) deduction = 10;
      else deduction = 20;

      totalScore -= deduction;
      factors.push({
        marker: "Estradiol",
        value: e2,
        unit: "pg/mL",
        contribution: deduction > 10 ? "negative" : deduction > 0 ? "neutral" : "positive",
        weight: deduction,
        explanation: e2 >= 20 && e2 <= 30 ? "Estradiol optimal" : e2 > 35 ? "Estradiol élevé" : "Estradiol bas"
      });
    }
  } else {
    // Femme - à développer selon besoins
    // Estradiol, progestérone, FSH, LH, etc.
  }

  // Cortisol (both genders)
  const cortisol = getMarkerValue(markers, "cortisol");
  if (cortisol !== null) {
    markersUsed.push("cortisol");
    let deduction = 0;
    if (cortisol < 8) deduction = 15;
    else if (cortisol >= 12 && cortisol <= 18) deduction = 0;
    else if (cortisol <= 22) deduction = 10;
    else deduction = 20;

    totalScore -= deduction;
    factors.push({
      marker: "Cortisol matin",
      value: cortisol,
      unit: "µg/dL",
      contribution: deduction > 10 ? "negative" : deduction > 0 ? "neutral" : "positive",
      weight: deduction,
      explanation: cortisol >= 12 && cortisol <= 18 ? "Cortisol optimal" : cortisol > 20 ? "Cortisol élevé - stress chronique" : "Cortisol bas - fatigue surrénale"
    });
  }

  // DHEA-S
  const dheas = getMarkerValue(markers, "dhea_s");
  if (dheas !== null) {
    markersUsed.push("dhea_s");
    let deduction = 0;
    if (dheas < 200) deduction = 15;
    else if (dheas < 300) deduction = 8;
    else if (dheas <= 450) deduction = 0;
    else deduction = 5;

    totalScore -= deduction;
    factors.push({
      marker: "DHEA-S",
      value: dheas,
      unit: "µg/dL",
      contribution: deduction > 10 ? "negative" : deduction > 0 ? "neutral" : "positive",
      weight: deduction,
      explanation: dheas >= 300 ? "DHEA-S optimal (précurseur hormonal)" : "DHEA-S bas"
    });
  }

  const score = Math.max(0, Math.min(100, totalScore));
  const level = getRiskLevel(score);

  let interpretation = "";
  if (score >= 85) {
    interpretation = "Profil hormonal EXCELLENT. Axes hormonaux bien équilibrés.";
  } else if (score >= 70) {
    interpretation = "Profil hormonal BON. Quelques optimisations possibles.";
  } else if (score >= 55) {
    interpretation = "Déséquilibre hormonal LÉGER. Intervention lifestyle recommandée.";
  } else if (score >= 40) {
    interpretation = "Déséquilibre hormonal MODÉRÉ. Bilan endocrinien complet recommandé.";
  } else {
    interpretation = "Déséquilibre hormonal SIGNIFICATIF. Consultation endocrinologue nécessaire.";
  }

  const recommendations: string[] = [];
  if (score < 85) {
    recommendations.push("Sommeil 7-9h (crucial pour hormones)");
    recommendations.push("Musculation 3x/semaine (stimule testostérone/GH)");
  }
  if (score < 70) {
    recommendations.push("Ashwagandha KSM-66 600mg/jour");
    recommendations.push("Zinc 30mg + Magnésium 400mg le soir");
    recommendations.push("Vitamine D3 4000-5000 UI/jour si <50ng/mL");
  }
  if (score < 55) {
    recommendations.push("Tongkat Ali 400mg/jour");
    recommendations.push("Réduire alcool et stress chronique");
    recommendations.push("Bilan hormonal complet recommandé");
  }

  return {
    name: "Santé Hormonale",
    score,
    level,
    interpretation,
    factors,
    recommendations,
    markers_used: markersUsed,
    confidence: calculateConfidence(markersUsed.length, profile.gender === "homme" ? 5 : 3)
  };
}

// ============================================
// ANEMIA RISK SCORE
// ============================================

export function calculateAnemiaRiskScore(
  markers: BloodMarkerInput[],
  profile: { gender: "homme" | "femme" }
): RiskScore {
  const factors: RiskFactor[] = [];
  let totalScore = 100;
  const markersUsed: string[] = [];

  // Ferritine
  const ferritin = getMarkerValue(markers, "ferritine");
  if (ferritin !== null) {
    markersUsed.push("ferritine");
    let deduction = 0;
    const minOptimal = profile.gender === "homme" ? 80 : 50;
    
    if (ferritin < 20) deduction = 35;
    else if (ferritin < 50) deduction = 20;
    else if (ferritin < minOptimal) deduction = 10;
    else if (ferritin <= 150) deduction = 0;
    else if (ferritin <= 300) deduction = 5;
    else deduction = 15;

    totalScore -= deduction;
    factors.push({
      marker: "Ferritine",
      value: ferritin,
      unit: "ng/mL",
      contribution: deduction > 15 ? "negative" : deduction > 5 ? "neutral" : "positive",
      weight: deduction,
      explanation: ferritin < 30 ? "Ferritine très basse - carence en fer" : 
                   ferritin >= minOptimal && ferritin <= 150 ? "Ferritine optimale" : 
                   ferritin > 300 ? "Ferritine élevée" : "Ferritine suboptimale"
    });
  }

  // Fer sérique
  const fer = getMarkerValue(markers, "fer_serique");
  if (fer !== null) {
    markersUsed.push("fer_serique");
    let deduction = 0;
    if (fer < 60) deduction = 25;
    else if (fer < 100) deduction = 10;
    else if (fer <= 140) deduction = 0;
    else deduction = 10;

    totalScore -= deduction;
    factors.push({
      marker: "Fer sérique",
      value: fer,
      unit: "µg/dL",
      contribution: deduction > 15 ? "negative" : deduction > 0 ? "neutral" : "positive",
      weight: deduction,
      explanation: fer < 80 ? "Fer sérique bas" : fer <= 140 ? "Fer sérique optimal" : "Fer sérique élevé"
    });
  }

  // Transferrine saturation
  const sat = getMarkerValue(markers, "transferrine_sat");
  if (sat !== null) {
    markersUsed.push("transferrine_sat");
    let deduction = 0;
    if (sat < 20) deduction = 20;
    else if (sat < 30) deduction = 10;
    else if (sat <= 45) deduction = 0;
    else deduction = 15;

    totalScore -= deduction;
    factors.push({
      marker: "Saturation transferrine",
      value: sat,
      unit: "%",
      contribution: deduction > 10 ? "negative" : deduction > 0 ? "neutral" : "positive",
      weight: deduction,
      explanation: sat < 25 ? "Saturation basse - carence fer" : sat <= 45 ? "Saturation optimale" : "Saturation élevée"
    });
  }

  // B12
  const b12 = getMarkerValue(markers, "b12");
  if (b12 !== null) {
    markersUsed.push("b12");
    let deduction = 0;
    if (b12 < 300) deduction = 20;
    else if (b12 < 500) deduction = 10;
    else if (b12 <= 800) deduction = 0;
    else deduction = 5;

    totalScore -= deduction;
    factors.push({
      marker: "Vitamine B12",
      value: b12,
      unit: "pg/mL",
      contribution: deduction > 10 ? "negative" : deduction > 0 ? "neutral" : "positive",
      weight: deduction,
      explanation: b12 < 400 ? "B12 basse - risque anémie mégaloblastique" : b12 >= 500 ? "B12 optimale" : "B12 acceptable"
    });
  }

  // Folate
  const folate = getMarkerValue(markers, "folate");
  if (folate !== null) {
    markersUsed.push("folate");
    let deduction = 0;
    if (folate < 5) deduction = 20;
    else if (folate < 10) deduction = 10;
    else if (folate <= 20) deduction = 0;
    else deduction = 5;

    totalScore -= deduction;
    factors.push({
      marker: "Folate",
      value: folate,
      unit: "ng/mL",
      contribution: deduction > 10 ? "negative" : deduction > 0 ? "neutral" : "positive",
      weight: deduction,
      explanation: folate < 8 ? "Folate bas" : folate >= 10 ? "Folate optimal" : "Folate acceptable"
    });
  }

  const score = Math.max(0, Math.min(100, totalScore));
  const level = getRiskLevel(score);

  let interpretation = "";
  if (score >= 85) {
    interpretation = "Risque d'anémie MINIMAL. Réserves en fer et vitamines optimales.";
  } else if (score >= 70) {
    interpretation = "Risque d'anémie FAIBLE. Légère optimisation possible.";
  } else if (score >= 55) {
    interpretation = "Risque d'anémie MODÉRÉ. Carences subcliniques détectées.";
  } else if (score >= 40) {
    interpretation = "Risque d'anémie ÉLEVÉ. Supplémentation recommandée.";
  } else {
    interpretation = "ANÉMIE PROBABLE. Bilan complet et supplémentation nécessaires.";
  }

  const recommendations: string[] = [];
  if (score < 85) {
    recommendations.push("Consommer viande rouge 2-3x/semaine");
  }
  if (score < 70) {
    recommendations.push("Fer bisglycinate 25mg + Vitamine C 500mg (améliore absorption)");
    recommendations.push("Éviter café/thé 1h avant et après repas riches en fer");
  }
  if (score < 55) {
    recommendations.push("B12 méthylcobalamine 1000-2000mcg/jour si B12 basse");
    recommendations.push("Méthylfolate 400-800mcg/jour si folate bas");
    recommendations.push("NFS complète recommandée");
  }

  return {
    name: "Risque Anémie",
    score,
    level,
    interpretation,
    factors,
    recommendations,
    markers_used: markersUsed,
    confidence: calculateConfidence(markersUsed.length, 5)
  };
}

// ============================================
// OVERALL HEALTH SCORE
// ============================================

export function calculateOverallHealthScore(
  riskScores: Omit<ComprehensiveRiskProfile, 'overallHealth' | 'timestamp'>
): RiskScore {
  const scores = [
    { name: "Pré-diabète", score: riskScores.prediabetes.score, weight: 1.2 },
    { name: "Résistance insuline", score: riskScores.insulinResistance.score, weight: 1.1 },
    { name: "Cardiovasculaire", score: riskScores.cardiovascular.score, weight: 1.3 },
    { name: "Syndrome métabolique", score: riskScores.metabolicSyndrome.score, weight: 1.2 },
    { name: "Thyroïde", score: riskScores.thyroidDysfunction.score, weight: 1.0 },
    { name: "Inflammation", score: riskScores.inflammation.score, weight: 1.1 },
    { name: "Anémie", score: riskScores.anemia.score, weight: 0.9 },
    { name: "Foie", score: riskScores.liverHealth.score, weight: 0.9 },
    { name: "Reins", score: riskScores.kidneyFunction.score, weight: 1.0 },
    { name: "Hormonal", score: riskScores.hormonalHealth.score, weight: 1.0 }
  ];

  const totalWeight = scores.reduce((sum, s) => sum + s.weight, 0);
  const weightedSum = scores.reduce((sum, s) => sum + s.score * s.weight, 0);
  const overallScore = Math.round(weightedSum / totalWeight);

  const factors: RiskFactor[] = scores.map(s => ({
    marker: s.name,
    value: s.score,
    unit: "/100",
    contribution: s.score >= 70 ? "positive" : s.score >= 50 ? "neutral" : "negative",
    weight: s.weight,
    explanation: `Score ${s.name}: ${s.score}/100`
  }));

  const criticalAreas = scores.filter(s => s.score < 50).map(s => s.name);
  const attentionAreas = scores.filter(s => s.score >= 50 && s.score < 70).map(s => s.name);
  const strongAreas = scores.filter(s => s.score >= 80).map(s => s.name);

  const level = getRiskLevel(overallScore);

  let interpretation = `Score santé global: ${overallScore}/100. `;
  if (strongAreas.length > 0) {
    interpretation += `Points forts: ${strongAreas.join(", ")}. `;
  }
  if (attentionAreas.length > 0) {
    interpretation += `À optimiser: ${attentionAreas.join(", ")}. `;
  }
  if (criticalAreas.length > 0) {
    interpretation += `Priorités: ${criticalAreas.join(", ")}.`;
  }

  const recommendations: string[] = [];
  
  // Add priority recommendations based on lowest scores
  const sortedScores = [...scores].sort((a, b) => a.score - b.score);
  const lowestTwo = sortedScores.slice(0, 2);
  
  for (const area of lowestTwo) {
    if (area.score < 60) {
      recommendations.push(`PRIORITÉ: Améliorer ${area.name} (${area.score}/100)`);
    }
  }

  if (overallScore < 70) {
    recommendations.push("Bilan de santé complet recommandé");
  }
  if (overallScore < 50) {
    recommendations.push("Consultation médicale prioritaire");
  }

  return {
    name: "Score Santé Global",
    score: overallScore,
    level,
    interpretation,
    factors,
    recommendations,
    markers_used: ["composite"],
    confidence: "high"
  };
}

// ============================================
// MAIN FUNCTION - COMPREHENSIVE RISK PROFILE
// ============================================

export function generateComprehensiveRiskProfile(
  markers: BloodMarkerInput[],
  profile: {
    gender: "homme" | "femme";
    age?: string;
    bmi?: number;
    waistCircumference?: number;
    bloodPressure?: { systolic: number; diastolic: number };
    smoker?: boolean;
    hypertension?: boolean;
    familyHistory?: boolean;
  }
): ComprehensiveRiskProfile {
  const prediabetes = calculatePrediabetesRisk(markers, profile);
  const insulinResistance = calculateInsulinResistanceIndex(markers);
  const cardiovascular = calculateCardiovascularRisk(markers, profile);
  const metabolicSyndrome = detectMetabolicSyndrome(markers, profile);
  const thyroidDysfunction = calculateThyroidScore(markers);
  const inflammation = calculateInflammationIndex(markers);
  const anemia = calculateAnemiaRiskScore(markers, profile);
  const liverHealth = calculateLiverHealthScore(markers);
  const kidneyFunction = calculateKidneyFunctionScore(markers, profile);
  const hormonalHealth = calculateHormonalHealthScore(markers, profile);

  const partialProfile = {
    prediabetes,
    insulinResistance,
    cardiovascular,
    metabolicSyndrome,
    thyroidDysfunction,
    inflammation,
    anemia,
    liverHealth,
    kidneyFunction,
    hormonalHealth
  };

  const overallHealth = calculateOverallHealthScore(partialProfile);

  return {
    ...partialProfile,
    overallHealth,
    timestamp: new Date().toISOString()
  };
}
