/**
 * APEXLABS - Blood Analysis System
 * Analyse de bilans sanguins avec ranges OPTIMAUX vs normaux
 * Sources: Examine, Peter Attia, Marek Health, Chris Masterjohn, RP, MPMD
 */

import Anthropic from "@anthropic-ai/sdk";
import pLimit from "p-limit";
import { searchArticles, searchFullText } from "../knowledge/storage";
import type { ScrapedArticle } from "../knowledge/storage";

// ============================================
// BIOMARKERS - OPTIMAL RANGES
// ============================================

export interface BiomarkerRange {
  name: string;
  unit: string;
  normalMin: number;
  normalMax: number;
  optimalMin: number;
  optimalMax: number;
  context?: string;
  genderSpecific?: "homme" | "femme";
}

export const BIOMARKER_RANGES: Record<string, BiomarkerRange> = {
  // Panel Hormonal
  testosterone_total: {
    name: "Testostérone totale",
    unit: "ng/dL",
    normalMin: 300, normalMax: 1000,
    optimalMin: 600, optimalMax: 900,
    context: "<500 = suboptimal pour muscu",
    genderSpecific: "homme"
  },
  testosterone_total_femme: {
    name: "Testostérone totale",
    unit: "ng/dL",
    normalMin: 15, normalMax: 70,
    optimalMin: 20, optimalMax: 50,
    context: "Équilibre hormonal féminin",
    genderSpecific: "femme"
  },
  testosterone_libre: {
    name: "Testostérone libre",
    unit: "pg/mL",
    normalMin: 5, normalMax: 25,
    optimalMin: 15, optimalMax: 25,
    context: "Forme active",
    genderSpecific: "homme"
  },
  shbg: {
    name: "SHBG",
    unit: "nmol/L",
    normalMin: 10, normalMax: 80,
    optimalMin: 20, optimalMax: 40,
    context: "Trop haut = moins de testo libre"
  },
  estradiol: {
    name: "Estradiol (E2)",
    unit: "pg/mL",
    normalMin: 10, normalMax: 40,
    optimalMin: 20, optimalMax: 35,
    context: "Équilibre testo/E2 crucial"
  },
  lh: {
    name: "LH",
    unit: "mIU/mL",
    normalMin: 1.5, normalMax: 9.3,
    optimalMin: 4, optimalMax: 7,
    context: "Signal hypophysaire"
  },
  fsh: {
    name: "FSH",
    unit: "mIU/mL",
    normalMin: 1.5, normalMax: 12.4,
    optimalMin: 3, optimalMax: 8,
    context: "Spermatogenèse"
  },
  prolactine: {
    name: "Prolactine",
    unit: "ng/mL",
    normalMin: 2, normalMax: 18,
    optimalMin: 5, optimalMax: 12,
    context: "Élevée = libido ↓"
  },
  dhea_s: {
    name: "DHEA-S",
    unit: "µg/dL",
    normalMin: 100, normalMax: 500,
    optimalMin: 300, optimalMax: 450,
    context: "Précurseur anabolique"
  },
  cortisol: {
    name: "Cortisol matin",
    unit: "µg/dL",
    normalMin: 5, normalMax: 25,
    optimalMin: 12, optimalMax: 18,
    context: "Trop haut ou bas = problème"
  },
  igf1: {
    name: "IGF-1",
    unit: "ng/mL",
    normalMin: 100, normalMax: 300,
    optimalMin: 200, optimalMax: 280,
    context: "Anabolisme, récupération"
  },

  // Panel Thyroïdien
  tsh: {
    name: "TSH",
    unit: "mIU/L",
    normalMin: 0.4, normalMax: 4.5,
    optimalMin: 0.5, optimalMax: 2.0,
    context: ">2.5 = thyroïde paresseuse"
  },
  t4_libre: {
    name: "T4 libre",
    unit: "ng/dL",
    normalMin: 0.8, normalMax: 1.8,
    optimalMin: 1.2, optimalMax: 1.6,
    context: "Hormone stockage"
  },
  t3_libre: {
    name: "T3 libre",
    unit: "pg/mL",
    normalMin: 2.3, normalMax: 4.2,
    optimalMin: 3.0, optimalMax: 4.0,
    context: "Métabolisme actif"
  },
  t3_reverse: {
    name: "T3 reverse",
    unit: "ng/dL",
    normalMin: 9, normalMax: 27,
    optimalMin: 0, optimalMax: 15,
    context: "Élevé = conversion bloquée"
  },
  anti_tpo: {
    name: "Anti-TPO",
    unit: "IU/mL",
    normalMin: 0, normalMax: 35,
    optimalMin: 0, optimalMax: 20,
    context: "Auto-immunité"
  },

  // Panel Métabolique
  glycemie_jeun: {
    name: "Glycémie à jeun",
    unit: "mg/dL",
    normalMin: 70, normalMax: 100,
    optimalMin: 75, optimalMax: 90,
    context: ">95 = résistance insuline"
  },
  hba1c: {
    name: "HbA1c",
    unit: "%",
    normalMin: 0, normalMax: 5.7,
    optimalMin: 0, optimalMax: 5.3,
    context: "Moyenne 3 mois"
  },
  insuline_jeun: {
    name: "Insuline à jeun",
    unit: "µIU/mL",
    normalMin: 2, normalMax: 25,
    optimalMin: 3, optimalMax: 8,
    context: "Sensibilité insuline"
  },
  homa_ir: {
    name: "HOMA-IR",
    unit: "",
    normalMin: 0, normalMax: 2.5,
    optimalMin: 0, optimalMax: 1.5,
    context: "Résistance insuline"
  },
  fructosamine: {
    name: "Fructosamine",
    unit: "µmol/L",
    normalMin: 205, normalMax: 285,
    optimalMin: 205, optimalMax: 228,
    context: "Contrôle glycémique 2-3 semaines"
  },
  triglycerides: {
    name: "Triglycérides",
    unit: "mg/dL",
    normalMin: 0, normalMax: 150,
    optimalMin: 0, optimalMax: 80,
    context: "Énergie"
  },
  hdl: {
    name: "HDL",
    unit: "mg/dL",
    normalMin: 40, normalMax: 999,
    optimalMin: 55, optimalMax: 999,
    context: "Protection cardio"
  },
  ldl: {
    name: "LDL",
    unit: "mg/dL",
    normalMin: 0, normalMax: 100,
    optimalMin: 70, optimalMax: 100,
    context: "Contexte dépendant"
  },
  apob: {
    name: "ApoB",
    unit: "mg/dL",
    normalMin: 0, normalMax: 100,
    optimalMin: 0, optimalMax: 80,
    context: "Meilleur que LDL"
  },
  lpa: {
    name: "Lp(a)",
    unit: "mg/dL",
    normalMin: 0, normalMax: 30,
    optimalMin: 0, optimalMax: 14,
    context: "Génétique, risque CV"
  },
  cholesterol_total: {
    name: "Cholestérol total",
    unit: "mg/dL",
    normalMin: 0, normalMax: 190,
    optimalMin: 150, optimalMax: 200,
    context: "Total cholesterol"
  },
  apo_a1: {
    name: "Apolipoprotéines A1",
    unit: "mg/dL",
    normalMin: 125, normalMax: 999,
    optimalMin: 140, optimalMax: 180,
    context: "HDL particles"
  },

  // Panel Inflammatoire
  crp_us: {
    name: "CRP-us",
    unit: "mg/L",
    normalMin: 0, normalMax: 3.0,
    optimalMin: 0, optimalMax: 0.5,
    context: "Inflammation systémique"
  },
  homocysteine: {
    name: "Homocystéine",
    unit: "µmol/L",
    normalMin: 5, normalMax: 15,
    optimalMin: 6, optimalMax: 9,
    context: "Méthylation, cardio"
  },
  ferritine: {
    name: "Ferritine",
    unit: "ng/mL",
    normalMin: 20, normalMax: 300,
    optimalMin: 80, optimalMax: 150,
    context: "Fer stocké (H: 80-150, F: 50-100)"
  },
  fer_serique: {
    name: "Fer sérique",
    unit: "µg/dL",
    normalMin: 60, normalMax: 170,
    optimalMin: 100, optimalMax: 140,
    context: "Transport O2"
  },
  transferrine_sat: {
    name: "Transferrine sat.",
    unit: "%",
    normalMin: 20, normalMax: 50,
    optimalMin: 30, optimalMax: 45,
    context: "Utilisation fer"
  },

  // Panel Vitamines/Minéraux
  vitamine_d: {
    name: "Vitamine D",
    unit: "ng/mL",
    normalMin: 30, normalMax: 100,
    optimalMin: 50, optimalMax: 80,
    context: "Hormones, immunité"
  },
  b12: {
    name: "B12",
    unit: "pg/mL",
    normalMin: 200, normalMax: 900,
    optimalMin: 500, optimalMax: 800,
    context: "Énergie, neuro"
  },
  folate: {
    name: "Folate",
    unit: "ng/mL",
    normalMin: 3, normalMax: 999,
    optimalMin: 10, optimalMax: 20,
    context: "Méthylation"
  },
  magnesium_rbc: {
    name: "Magnésium RBC",
    unit: "mg/dL",
    normalMin: 4.2, normalMax: 6.8,
    optimalMin: 5.5, optimalMax: 6.5,
    context: "Récup musculaire"
  },
  magnesium_serum: {
    name: "Magnésium sérique",
    unit: "mg/dL",
    normalMin: 1.7, normalMax: 2.5,
    optimalMin: 2.0, optimalMax: 2.3,
    context: "Fonction neuromusculaire"
  },
  zinc: {
    name: "Zinc",
    unit: "µg/dL",
    normalMin: 60, normalMax: 120,
    optimalMin: 90, optimalMax: 110,
    context: "Testostérone, immunité"
  },

  // Panel Hépatique/Rénal
  alt: {
    name: "ALT",
    unit: "U/L",
    normalMin: 7, normalMax: 56,
    optimalMin: 0, optimalMax: 30,
    context: "Foie"
  },
  ast: {
    name: "AST",
    unit: "U/L",
    normalMin: 10, normalMax: 40,
    optimalMin: 0, optimalMax: 30,
    context: "Foie + muscle"
  },
  ggt: {
    name: "GGT",
    unit: "U/L",
    normalMin: 9, normalMax: 48,
    optimalMin: 0, optimalMax: 25,
    context: "Stress oxydatif"
  },
  creatinine: {
    name: "Créatinine",
    unit: "mg/dL",
    normalMin: 0.7, normalMax: 1.3,
    optimalMin: 0.9, optimalMax: 1.1,
    context: "Fonction rénale"
  },
  egfr: {
    name: "eGFR",
    unit: "mL/min",
    normalMin: 90, normalMax: 999,
    optimalMin: 100, optimalMax: 999,
    context: "Filtration rénale"
  }
};

// ============================================
// MARKER NAME ALIASES (for normalization)
// ============================================
// Maps common English/French names to BIOMARKER_RANGES keys
const MARKER_ALIASES: Record<string, string> = {
  // Hormonal - Testosterone
  "testosterone": "testosterone_total",
  "total testosterone": "testosterone_total",
  "testosterone totale": "testosterone_total",
  "free testosterone": "testosterone_libre",
  "testosterone libre": "testosterone_libre",
  "freetestosterone": "testosterone_libre",

  // Hormonal - Others
  "estradiol": "estradiol",
  "e2": "estradiol",
  "prolactin": "prolactine",
  "prolactine": "prolactine",
  "dhea-s": "dhea_s",
  "dheas": "dhea_s",
  "dhea sulfate": "dhea_s",
  "cortisol": "cortisol",
  "morning cortisol": "cortisol",
  "igf-1": "igf1",
  "igf1": "igf1",
  "lh": "lh",
  "fsh": "fsh",
  "shbg": "shbg",

  // Thyroid
  "tsh": "tsh",
  "free t4": "t4_libre",
  "t4 libre": "t4_libre",
  "t4": "t4_libre",
  "free t3": "t3_libre",
  "t3 libre": "t3_libre",
  "t3": "t3_libre",
  "reverse t3": "t3_reverse",
  "t3 reverse": "t3_reverse",
  "anti-tpo": "anti_tpo",
  "tpo antibodies": "anti_tpo",

  // Metabolic - Glucose
  "fasting glucose": "glycemie_jeun",
  "glucose": "glycemie_jeun",
  "glycémie": "glycemie_jeun",
  "glycemie": "glycemie_jeun",
  "blood sugar": "glycemie_jeun",
  "hba1c": "hba1c",
  "a1c": "hba1c",
  "hemoglobin a1c": "hba1c",
  "fasting insulin": "insuline_jeun",
  "insulin": "insuline_jeun",
  "insuline": "insuline_jeun",
  "homa-ir": "homa_ir",
  "homa ir": "homa_ir",

  // Lipids
  "triglycerides": "triglycerides",
  "triglycérides": "triglycerides",
  "hdl": "hdl",
  "hdl cholesterol": "hdl",
  "hdl-c": "hdl",
  "ldl": "ldl",
  "ldl cholesterol": "ldl",
  "ldl-c": "ldl",
  "apob": "apob",
  "apo b": "apob",
  "apolipoprotein b": "apob",
  "lp(a)": "lpa",
  "lpa": "lpa",
  "lipoprotein(a)": "lpa",

  // Inflammatory
  "crp": "crp_us",
  "hs-crp": "crp_us",
  "crp-us": "crp_us",
  "c-reactive protein": "crp_us",
  "homocysteine": "homocysteine",
  "homocystéine": "homocysteine",
  "ferritin": "ferritine",
  "ferritine": "ferritine",
  "iron": "fer_serique",
  "serum iron": "fer_serique",
  "fer": "fer_serique",
  "transferrin saturation": "transferrine_sat",
  "transferrin sat": "transferrine_sat",
  "tsat": "transferrine_sat",

  // Vitamins/Minerals
  "vitamin d": "vitamine_d",
  "vitamine d": "vitamine_d",
  "25-oh vitamin d": "vitamine_d",
  "vit d": "vitamine_d",
  "b12": "b12",
  "vitamin b12": "b12",
  "vitamine b12": "b12",
  "cobalamin": "b12",
  "folate": "folate",
  "folic acid": "folate",
  "magnesium": "magnesium_rbc",
  "magnesium rbc": "magnesium_rbc",
  "magnésium": "magnesium_rbc",
  "zinc": "zinc",

  // Liver/Kidney
  "alt": "alt",
  "alanine aminotransferase": "alt",
  "sgpt": "alt",
  "ast": "ast",
  "aspartate aminotransferase": "ast",
  "sgot": "ast",
  "ggt": "ggt",
  "gamma-gt": "ggt",
  "creatinine": "creatinine",
  "créatinine": "creatinine",
  "egfr": "egfr",
  "gfr": "egfr"
};

/**
 * Normalizes a marker name to its BIOMARKER_RANGES key.
 * Handles case-insensitivity and common aliases.
 */
export function normalizeMarkerName(name: string): string {
  if (!name) return "";

  // First, try direct lookup in BIOMARKER_RANGES (case-sensitive)
  if (BIOMARKER_RANGES[name]) {
    return name;
  }

  // Normalize: lowercase, trim whitespace
  const normalized = name.toLowerCase().trim();

  // Try direct key match in BIOMARKER_RANGES (lowercase)
  if (BIOMARKER_RANGES[normalized]) {
    return normalized;
  }

  // Try alias lookup
  if (MARKER_ALIASES[normalized]) {
    return MARKER_ALIASES[normalized];
  }

  // Try without special characters (spaces, dashes, underscores)
  const simplified = normalized.replace(/[\s\-_]/g, "");
  for (const [alias, key] of Object.entries(MARKER_ALIASES)) {
    if (alias.replace(/[\s\-_]/g, "") === simplified) {
      return key;
    }
  }

  // Last resort: check if any BIOMARKER_RANGES key matches when simplified
  for (const key of Object.keys(BIOMARKER_RANGES)) {
    if (key.replace(/_/g, "") === simplified) {
      return key;
    }
  }

  // Return original if no match found
  return name;
}

// ============================================
// DIAGNOSTIC PATTERNS
// ============================================

export interface DiagnosticPattern {
  name: string;
  markers: Record<string, "low" | "high" | "normal">;
  causes: string[];
  protocol: string[];
}

export const DIAGNOSTIC_PATTERNS: DiagnosticPattern[] = [
  {
    name: "Low T Syndrome",
    markers: {
      testosterone_total: "low",
      shbg: "high",
      estradiol: "low",
      cortisol: "high"
    },
    causes: ["Stress chronique", "Déficit calorique", "Surentraînement"],
    protocol: [
      "Stopper déficit calorique",
      "Réduire volume entraînement",
      "Sommeil 8h+",
      "Ashwagandha 600mg, Zinc 30mg, Magnésium 400mg"
    ]
  },
  {
    name: "Thyroid Slowdown",
    markers: {
      tsh: "high",
      t3_libre: "low",
      t3_reverse: "high"
    },
    causes: ["Déficit calorique prolongé", "Stress", "Inflammation"],
    protocol: [
      "Refeeds glucides 2x/semaine",
      "Sélénium 200mcg",
      "Iode si carence confirmée",
      "Check anti-TPO"
    ]
  },
  {
    name: "Insulin Resistance",
    markers: {
      insuline_jeun: "high",
      homa_ir: "high",
      triglycerides: "high",
      hba1c: "high"
    },
    causes: ["Excès glucides raffinés", "Sédentarité", "Graisse viscérale"],
    protocol: [
      "Réduire glucides raffinés",
      "Marche post-prandiale 15min",
      "Musculation 3x/semaine",
      "Berbérine 500mg x2 ou Metformine (médecin)"
    ]
  },
  {
    name: "Chronic Inflammation",
    markers: {
      crp_us: "high",
      ferritine: "high",
      homocysteine: "high"
    },
    causes: ["Alimentation pro-inflammatoire", "Stress oxydatif", "Infections chroniques"],
    protocol: [
      "Oméga-3 3-4g/jour (EPA dominant)",
      "Curcumine 500mg + pipérine",
      "Réduire oméga-6, sucres",
      "Check infections chroniques"
    ]
  },
  {
    name: "Anemia/Low Iron",
    markers: {
      ferritine: "low",
      fer_serique: "low",
      transferrine_sat: "low"
    },
    causes: ["Déficit alimentaire", "Malabsorption", "Sport endurance"],
    protocol: [
      "Fer bisglycinate 25mg + vitamine C",
      "Éviter café/thé aux repas",
      "Check B12 et folate"
    ]
  },
  {
    name: "HPA Dysfunction",
    markers: {
      cortisol: "high",
      dhea_s: "low"
    },
    causes: ["Stress chronique", "Surentraînement", "Manque sommeil"],
    protocol: [
      "Ashwagandha KSM-66 600mg",
      "Phosphatidylsérine 300mg soir",
      "Magnésium glycinate 400mg",
      "NSDR/méditation 20min/jour"
    ]
  }
];

// ============================================
// BLOOD ANALYSIS FUNCTIONS
// ============================================

export interface BloodMarkerInput {
  markerId?: string;
  name?: string;  // Alternative to markerId
  value: number;
  unit?: string;  // Optional unit from input
}

export interface PatientInfo {
  prenom?: string;
  nom?: string;
  email?: string;
  gender?: "homme" | "femme";
  dob?: string;
}

export interface MarkerAnalysis {
  markerId: string;
  name: string;
  value: number;
  unit: string;
  normalRange: string;
  optimalRange: string;
  category?: string;
  status: "optimal" | "normal" | "suboptimal" | "critical";
  interpretation: string;
}

type MarkerStatus = MarkerAnalysis["status"];

export interface BloodAnalysisResult {
  summary: {
    optimal: string[];
    watch: string[];
    action: string[];
  };
  markers: MarkerAnalysis[];
  patterns: DiagnosticPattern[];
  recommendations: {
    priority1: { action: string; dosage?: string; timing?: string; why: string }[];
    priority2: { action: string; dosage?: string; timing?: string; why: string }[];
  };
  followUp: { test: string; delay: string; objective: string }[];
  alerts: string[];
}

export interface LifestyleCorrelation {
  factor: string;
  current: string;
  impact: string;
  recommendation: string;
  status: MarkerAnalysis["status"];
  evidence?: string;
}

const extractJsonArray = (raw: string): unknown[] => {
  const trimmed = raw.trim();
  if (!trimmed) return [];
  const start = trimmed.indexOf("[");
  const end = trimmed.lastIndexOf("]");
  if (start === -1 || end === -1 || end <= start) return [];
  try {
    return JSON.parse(trimmed.slice(start, end + 1));
  } catch {
    return [];
  }
};

const normalizeUnit = (unit?: string): string | undefined => {
  if (!unit) return undefined;
  const cleaned = unit
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/μ/g, "u")
    .replace(/µ/g, "u");
  const map: Record<string, string> = {
    "mmol/l": "mmol/L",
    "nmol/l": "nmol/L",
    "umol/l": "µmol/L",
    "pmol/l": "pmol/L",
    "mg/dl": "mg/dL",
    "mg/l": "mg/L",
    "g/l": "g/L",
    "ng/ml": "ng/mL",
    "ng/l": "ng/L",
    "pg/ml": "pg/mL",
    "ng/dl": "ng/dL",
    "ug/dl": "µg/dL",
    "mui/l": "mIU/L",
    "ui/l": "IU/L",
    "u/l": "U/L",
    "ml/min": "mL/min",
    "%": "%",
  };
  return map[cleaned] || unit;
};

const roundValue = (value: number, decimals = 2): number => {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
};

export const normalizeMarkerValue = (markerId: string, value: number, unit?: string): number => {
  if (!Number.isFinite(value)) return value;

  const sourceUnit = normalizeUnit(unit);

  if (markerId === "glycemie_jeun") {
    if (sourceUnit === "mmol/L") return Math.round(value * 18);
    if (sourceUnit === "g/L") return Math.round(value * 100);
    if (sourceUnit === "mg/L") return Math.round(value / 10);
    if (value < 20) return Math.round(value * 18);
  }

  if (markerId === "vitamine_d") {
    if (sourceUnit === "nmol/L") return roundValue(value / 2.5, 1);
    if (value > 100) return roundValue(value / 2.5, 1);
  }

  if (markerId === "creatinine") {
    if (sourceUnit === "µmol/L") return roundValue(value / 88.4, 2);
    if (sourceUnit === "mg/L") return roundValue(value / 10, 2);
    if (value > 20) return roundValue(value / 88.4, 2);
  }

  if (markerId === "testosterone_total") {
    if (sourceUnit === "nmol/L") return roundValue(value * 28.84, 1);
    if (sourceUnit === "ng/mL") return roundValue(value * 100, 1); // ng/mL -> ng/dL
    // Heuristic: if value < 40, likely nmol/L (French labs)
    if (!sourceUnit && value > 0 && value < 40) return roundValue(value * 28.84, 1);
  }
  if (markerId === "testosterone_libre") {
    if (sourceUnit === "pmol/L") return roundValue(value / 3.47, 2);
    // If pg/mL or already target unit , no conversion needed
    if (sourceUnit === "pg/mL") return roundValue(value, 1);
    // Heuristic when source unit was not parsed from PDF.
    // Reference physiological ranges:
    //   pg/mL : homme 5-25, femme 0,5-3 (target unit, no conversion)
    //   pmol/L : homme 30-180, femme 1-10 (needs / 3.47 conversion)
    // Previous heuristic (>15 = pmol/L) was too aggressive : a real pg/mL
    // value of 15.7 (homme top of range) was misread as pmol/L and divided
    // to 4.52, breaking Vincent's report. Now require value >= 30 before
    // assuming pmol/L. Values 5-29 stay as pg/mL by default. Values
    // 25-29 are still ambiguous : we log a warning so PDF extraction can
    // be improved upstream, but we keep the safer pg/mL interpretation.
    if (!sourceUnit && value >= 30) return roundValue(value / 3.47, 2);
    if (!sourceUnit && value >= 25 && value < 30) {
      console.warn(
        `[BloodAnalysis] Ambiguous testosterone_libre value=${value} without unit. ` +
        `Range 25-30 could be pg/mL high or pmol/L low. Keeping pg/mL (no conversion). ` +
        `Improve PDF extraction to capture explicit unit.`
      );
    }
  }
  if (markerId === "estradiol") {
    if (sourceUnit === "pmol/L") return roundValue(value / 3.67, 1);
    if (sourceUnit === "nmol/L") return roundValue(value * 272.4, 1);
  }
  if (markerId === "t4_libre" && sourceUnit === "pmol/L") {
    return roundValue(value / 12.87, 2);
  }
  if (markerId === "t3_libre" && sourceUnit === "pmol/L") {
    return roundValue(value / 1.536, 2);
  }
  if (markerId === "cortisol" && sourceUnit === "nmol/L") {
    return roundValue(value / 27.59, 2);
  }
  // Prolactine: French labs report mIU/L (mUI/L), target is ng/mL. 1 ng/mL ≈ 21.2 mIU/L
  if (markerId === "prolactine" && (sourceUnit === "mIU/L" || sourceUnit === "IU/L")) {
    return roundValue(value / 21.2, 1);
  }
  if (markerId === "igf1" && sourceUnit === "nmol/L") {
    return roundValue(value * 7.65, 1);
  }
  if (markerId === "dhea_s" && sourceUnit === "µmol/L") {
    return roundValue(value * 36.85, 1);
  }
  if (markerId === "fer_serique" && sourceUnit === "µmol/L") {
    return roundValue(value * 5.585, 1);
  }
  if (markerId === "b12" && sourceUnit === "pmol/L") {
    return roundValue(value / 0.738, 0);
  }
  if (markerId === "folate" && sourceUnit === "nmol/L") {
    return roundValue(value / 2.266, 1);
  }
  if (markerId === "zinc" && sourceUnit === "µmol/L") {
    return roundValue(value * 6.538, 1);
  }

  // Magnesium (RBC or serum): target is mg/dL
  if (markerId === "magnesium_rbc" || markerId === "magnesium" || markerId === "magnesium_serum") {
    if (sourceUnit === "mmol/L") return roundValue(value * 2.43, 1); // 1 mmol/L = 2.43 mg/dL
    if (sourceUnit === "mg/L") return roundValue(value / 10, 1); // mg/L -> mg/dL
    // Heuristic: French labs often report in mg/L (18-25 range) vs mg/dL (1.8-2.5)
    if (!sourceUnit && value > 10 && value < 30) return roundValue(value / 10, 1);
    // Heuristic: value < 1.5 with no unit is likely mmol/L (French labs: 0.66-1.07 mmol/L)
    if (!sourceUnit && value < 1.5 && value > 0.5) return roundValue(value * 2.43, 1);
  }

  const lipidMmolToMg = 38.67;
  const trigMmolToMg = 88.57;

  if (["ldl", "hdl", "apob", "lpa", "cholesterol", "cholesterol_total", "apo_a1"].includes(markerId)) {
    if (sourceUnit === "mmol/L") return Math.round(value * lipidMmolToMg);
    if (sourceUnit === "g/L") return Math.round(value * 100);
    if (sourceUnit === "mg/L") return Math.round(value / 10);
    // Heuristic only when NO unit provided: value <=1.9 → likely g/L, <10 → likely mmol/L
    // Only apply if no sourceUnit, to avoid misinterpreting actual low mg/dL values
    if (!sourceUnit && value <= 1.9) return Math.round(value * 100);
    if (!sourceUnit && value < 10) return Math.round(value * lipidMmolToMg);
  }

  if (markerId === "triglycerides") {
    if (sourceUnit === "mmol/L") return Math.round(value * trigMmolToMg);
    if (sourceUnit === "g/L") return Math.round(value * 100);
    if (sourceUnit === "mg/L") return Math.round(value / 10);
    if (!sourceUnit && value <= 1.9) return Math.round(value * 100);
    if (!sourceUnit && value < 10) return Math.round(value * trigMmolToMg);
  }

  return value;
};

const MARKER_SYNONYMS: Record<string, RegExp[]> = {
  testosterone_total: [/(?:^|[^\w])testost[ée]rone\s*$/i, /testost[ée]rone\s*tot/i, /testost[ée]rone\s*totale/i, /testost[ée]rone\s*\(\d\)/i, /testost[ée]rone\s*\(eclia\)/i, /✔\s*testost[ée]rone\s*$/i, /(?:^|\s)testost[ée]rone(?:\s*$)/i],
  testosterone_libre: [/testost[ée]rone\s*libre/i, /testost[ée]rone\s*libre\s*\(r\.?i\.?a/i, /free\s*testosterone/i],
  shbg: [/shbg/i, /globuline[^\\n]{0,60}sex/i, /tebg/i, /\bsbp\b[^\\n]{0,40}testost/i, /prot[ée]ine\s*liant\s*la\s*testost/i],
  estradiol: [/estradiol\s*(?:\(|homme|femme|r\.?i\.?a|eclia)/i, /estradiol/i, /\be2\b/i],
  lh: [/\blh\b/i, /luteinis/i],
  fsh: [/\bfsh\b/i, /folliculo/i],
  prolactine: [/prolactine/i],
  dhea_s: [/dhea[-\s]?s(?!t)/i, /\bs\.?\s*d\.?\s*h\.?\s*e?\.?\s*a\.?\s*[\s(]/i, /sulfate\s*de\s*d[ée]hydro[ée]?piandrost[ée]rone/i],
  cortisol: [/cortisol/i],
  igf1: [/igf[-\s]?1/i, /somat[oó]m[ée]dine\s*c/i],
  tsh: [/t\.?\s*s\.?\s*h\.?/i, /thyr[eé]o?stim/i],
  t4_libre: [/t4\s*libre/i, /ft4/i, /thyroxine\s*libre/i],
  t3_libre: [/t3\s*libre/i, /ft3/i, /triiodothyronine\s*libre/i],
  t3_reverse: [/t3\s*reverse/i, /\brt3\b/i],
  anti_tpo: [/anti[-\s]?tpo/i, /anti[-\s]?thyro/i],
  glycemie_jeun: [/glyc[ée]mie[^\\n]{0,30}je[uû]n/i, /glucose[^\\n]{0,30}je[uû]n/i, /glyc[ée]mie\s*à\s*jeun/i],
  hba1c: [/hba1c/i, /hba\s*1c/i, /h[ée]moglobine\s*gly/i, /h[ée]moglobine\s*a1c/i],
  insuline_jeun: [/insuline[^\\n]{0,30}je[uû]n/i],
  homa_ir: [/homa[-\s]?ir/i, /indice\s*de\s*homa/i],
  fructosamine: [/fructosamine/i],
  triglycerides: [/triglyc[ée]rides/i],
  hdl: [/cholest[ée]rol\s*h\.?d\.?l/i, /\bh\.?d\.?l\b/i, /\bhdl[-\s]?c\b/i],
  ldl: [/cholest[ée]rol\s*l\.?d\.?l[^\\n]{0,30}mesur[eé]/i, /cholest[ée]rol\s*l\.?d\.?l/i, /\bl\.?d\.?l\s+mesur[eé]/i, /\bl\.?d\.?l[-\s]?c?\b/i],
  apob: [/apolipoprot[ée]ine[^\\n]{0,30}b/i, /apo\s*b/i],
  lpa: [/lp\s*\(?a\)?/i, /lipoprot[ée]ine\s*\(a\)/i],
  cholesterol_total: [/cholest[ée]rol\s*total/i],
  apo_a1: [/apolipoprot[ée]ine[^\\n]{0,30}a1/i, /apo\s*a1/i],
  crp_us: [/crp[^\\n]{0,30}(us|ultra)/i, /crp\s*hs/i, /c[-\s]?r[ée]active/i],
  homocysteine: [/homocyst[ée]ine/i],
  ferritine: [/ferritine/i],
  fer_serique: [/fer\s*s[ée]rique/i, /sid[ée]r[ée]mie/i, /^fer$/i],
  transferrine_sat: [/coefficient\s*de\s*saturation(?!\s*en\s*fer)\s*\(cs/i, /coefficient\s*de\s*saturation(?!\s*en\s*fer)/i, /saturation(?!\s*en\s*fer)[^\\n]{0,40}transferrine/i, /coef[^\\n]{0,30}saturation(?!\s*en\s*fer)/i],
  vitamine_d: [/vitamine\s*d\s*25\s*oh/i, /25[-\s]?oh\s*vit/i, /vitamine\s*d/i],
  b12: [/vitamine\s*b12/i, /cobalamine/i],
  folate: [/folate/i, /vitamine\s*b9/i],
  magnesium_rbc: [/magn[eé]sium[^\\n]{0,30}rbc/i, /magn[eé]sium[^\\n]{0,30}intra/i],
  zinc: [/\bzinc\b/i],
  alt: [/\balt\b/i, /\balat\b/i, /\bsgpt\b/i],
  ast: [/\bast\b/i, /\basat\b/i, /\bsgot\b/i],
  ggt: [/\bggt\b/i, /gamma[-\s]*gt/i],
  creatinine: [/cr[ée]atinine/i],
  egfr: [/\begfr\b/i, /d[ée]bit[^\\n]{0,40}filtration/i, /dfg\s*calcul[ée]/i, /d\.?\s*f\.?\s*g\.?\s*calcul/i, /ckd[-\s]?epi/i],
};

const extractFirstNumber = (line: string): number | null => {
  return extractNumberFromSnippet(line);
};

const extractValueAfterLabel = (line: string, match: RegExpMatchArray): number | null => {
  const index = match.index ?? line.toLowerCase().indexOf(match[0].toLowerCase());
  if (index < 0) return null;
  const after = line.slice(index + match[0].length);
  return extractFirstNumber(after);
};

const UNIT_REGEX =
  /(mmol\/l|nmol\/l|mg\/dl|mg\/l|g\/l|ng\/ml|ng\/l|pg\/ml|ng\/dl|pmol\/l|umol\/l|µmol\/l|mui\/l|ui\/l|u\/l|ml\/min|%)/i;

const SKIP_LINE_REGEX =
  /(objectif|recommand|valeur|référence|reference|score|esc|risque|guide|interpret|evaluation|page|\bhas\b|consid[ée]r[ée]|est\s+normal|en\s*faveur|17\s*alpha|hydroxy[-\s]?prog[ée]st[ée]rone|transmis\s+au|envoy[ée]s?\s+au|examen[s]?\s+transmis|pr[ée]l[èe]vement\s*:|valid[ée]\s*(le|par)|seuil\s*de\s*d[ée]tection)/i;

const DATE_LINE_REGEX = /^\d{2}[\/-]\d{2}[\/-]\d{2,4}$/;
const RANGE_LINE_REGEX = /\d+(?:[.,]\d+)?\s*(?:à|a|–|-)\s*\d+(?:[.,]\d+)?/i;

const findUnit = (line?: string): string | undefined => {
  if (!line) return undefined;
  const match = line.match(UNIT_REGEX);
  if (!match) return undefined;
  return normalizeUnit(match[0]);
};

const extractMarkersFromLines = (pdfText: string): BloodMarkerInput[] => {
  const lines = pdfText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const results = new Map<string, { value: number; unit?: string }>();
  const markerEntries = Object.entries(MARKER_SYNONYMS);

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line || SKIP_LINE_REGEX.test(line) || DATE_LINE_REGEX.test(line)) continue;

    for (const [markerId, patterns] of markerEntries) {
      if (results.has(markerId)) continue;
      let match: RegExpMatchArray | null = null;
      for (const pattern of patterns) {
        match = line.match(pattern);
        if (match) break;
      }
      if (!match) continue;

      const valueFromLabel = extractValueAfterLabel(line, match);
      let unit = findUnit(line);
      let value = valueFromLabel;

      if (value === null) {
        for (let offset = 1; offset <= 4; offset += 1) {
          const nextLine = lines[i + offset];
          if (!nextLine || DATE_LINE_REGEX.test(nextLine) || SKIP_LINE_REGEX.test(nextLine)) continue;
          // Handle combined lines like "6,7 pg/mlN: 8,7 à 25,0pg/ml" where value + range are on same line
          if (RANGE_LINE_REGEX.test(nextLine)) {
            const beforeN = nextLine.split(/\bN\s*:/)[0];
            if (beforeN && beforeN !== nextLine) {
              const combinedValue = extractFirstNumber(beforeN);
              if (combinedValue !== null) {
                value = combinedValue;
                unit = unit || findUnit(beforeN);
                break;
              }
            }
            continue;
          }
          const nextValue = extractFirstNumber(nextLine);
          if (nextValue === null) continue;
          value = nextValue;
          unit = unit || findUnit(nextLine) || findUnit(lines[i + offset + 1]) || findUnit(lines[i + offset + 2]);
          break;
        }
      } else {
        unit = unit || findUnit(lines[i + 1]) || findUnit(lines[i + 2]);
      }

      if (value === null || Number.isNaN(value)) continue;
      const normalized = normalizeMarkerValue(markerId, value, unit);
      if (!isPlausibleMarkerValue(markerId, normalized)) continue;
      results.set(markerId, { value: normalized, unit });
    }
  }

  return Array.from(results.entries()).map(([markerId, data]) => ({
    markerId,
    value: data.value,
  }));
};

const isYearLike = (value: number, raw: string) => {
  const digits = raw.replace(/\D/g, "");
  if (digits.length !== 4) return false;
  return Number.isInteger(value) && value >= 1900 && value <= 2100;
};

const isHugeNumber = (raw: string, value: number) => {
  const digits = raw.replace(/\D/g, "");
  return digits.length >= 8 || value >= 100000;
};

const extractNumberFromSnippet = (snippet: string): number | null => {
  const dateMatches = Array.from(
    snippet.matchAll(/\d{2}[\/.\-−]\d{2}[\/.\-−]\d{2,4}/g)
  ).map((match) => ({
    start: match.index ?? 0,
    end: (match.index ?? 0) + match[0].length,
  }));

  // Also filter time patterns like "08H52", "08h 52", "à 08H52"
  const timeMatches = Array.from(
    snippet.matchAll(/\d{1,2}\s*[hH]\s*\d{2}/g)
  ).map((match) => ({
    start: match.index ?? 0,
    end: (match.index ?? 0) + match[0].length,
  }));

  const matches = snippet.matchAll(/[<>]?\s*\d+(?:[.,]\d+)?/g);
  for (const match of matches) {
    const raw = match[0].replace(/[<>]/g, "").replace(",", ".").trim();
    const value = Number(raw);
    if (Number.isNaN(value) || !Number.isFinite(value)) continue;
    const start = match.index ?? 0;
    const end = start + match[0].length;
    const beforeChar = snippet[start - 1] || "";
    const afterChar = snippet[end] || "";
    const afterSegment = snippet.slice(end, end + 14).replace(/^[\s:]+/, "");
    const beforeSegment = snippet.slice(Math.max(0, start - 14), start).replace(/[\s:]+$/, "");
    const hasAttachedUnit = Boolean(findUnit(afterSegment) || findUnit(beforeSegment));

    // CRITICAL FIX: Skip numbers in parentheses like (1), (2) - lab references
    if (beforeChar === "(" || afterChar === ")") continue;

    if ((/[A-Za-zÀ-ÿ]/.test(beforeChar) || /[A-Za-zÀ-ÿ]/.test(afterChar)) && !hasAttachedUnit) continue;
    // Use digit start position (not match start which may include leading whitespace)
    const digitStart = start + (match[0].length - match[0].replace(/^[<>]?\s*/, "").length);
    if (dateMatches.some((range) => digitStart >= range.start && end <= range.end)) continue;
    if (timeMatches.some((range) => digitStart >= range.start && end <= range.end)) continue;
    if (isYearLike(value, raw) || isHugeNumber(raw, value)) continue;
    const before = snippet.slice(Math.max(0, start - 3), start);
    const after = snippet.slice(end, end + 3);
    if (before.includes("-") || after.includes("-") || before.includes("–") || after.includes("–")) {
      continue;
    }
    // Skip numbers that are part of compound marker names like "17 ALPHA HYDROXY"
    const afterWord = snippet.slice(end, end + 20).replace(/^\s+/, "");
    if (/^alpha/i.test(afterWord) || /^hydroxy/i.test(afterWord)) continue;
    return value;
  }
  return null;
};

const PLAUSIBLE_BOUNDS: Record<string, { min?: number; max?: number }> = {
  egfr: { min: 30, max: 200 },
  crp_us: { min: 0, max: 50 },
  homocysteine: { min: 2, max: 60 },
  apob: { min: 30, max: 300 },
  lpa: { min: 0, max: 300 },
  triglycerides: { min: 5, max: 1000 },
  hdl: { min: 10, max: 150 },
  ldl: { min: 20, max: 400 },
  glycemie_jeun: { min: 40, max: 300 },
  insuline_jeun: { min: 0.2, max: 200 },
  testosterone_total: { min: 100, max: 2000 },
  testosterone_libre: { min: 1, max: 60 },
  cortisol: { min: 1, max: 600 },
  vitamine_d: { min: 5, max: 200 },
  b12: { min: 100, max: 3000 },
  fructosamine: { min: 150, max: 400 },
  cholesterol_total: { min: 50, max: 400 },
  apo_a1: { min: 50, max: 250 },
};

const MARKER_VALIDATION_RANGES: Record<string, { min: number; max: number }> = {
  testosterone_libre: { min: 2.5, max: 35 },
  testosterone_total: { min: 150, max: 1500 },
  estradiol: { min: 5, max: 80 },
  lh: { min: 0.5, max: 12 },
  fsh: { min: 0.5, max: 15 },
  prolactine: { min: 2, max: 30 },
  shbg: { min: 8, max: 120 },
  dhea_s: { min: 40, max: 700 },
  cortisol: { min: 1, max: 50 },
  igf1: { min: 60, max: 450 },
  tsh: { min: 0.2, max: 6 },
  t4_libre: { min: 0.5, max: 2.5 },
  t3_libre: { min: 2, max: 6 },
  t3_reverse: { min: 0, max: 50 },
  glycemie_jeun: { min: 50, max: 200 },
  hba1c: { min: 3.5, max: 10 },
  insuline_jeun: { min: 1, max: 50 },
  homa_ir: { min: 0.1, max: 10 },
  triglycerides: { min: 20, max: 1000 },
  hdl: { min: 10, max: 150 },
  ldl: { min: 30, max: 250 },
  apob: { min: 40, max: 200 },
  lpa: { min: 0, max: 300 },
  crp_us: { min: 0, max: 30 },
  homocysteine: { min: 3, max: 40 },
  ferritine: { min: 5, max: 500 },
  fer_serique: { min: 20, max: 250 },
  transferrine_sat: { min: 5, max: 80 },
  vitamine_d: { min: 5, max: 150 },
  b12: { min: 150, max: 2000 },
  folate: { min: 2, max: 30 },
  magnesium_rbc: { min: 3, max: 8 },
  zinc: { min: 40, max: 200 },
  alt: { min: 5, max: 200 },
  ast: { min: 5, max: 200 },
  ggt: { min: 5, max: 300 },
  creatinine: { min: 0.3, max: 3 },
  egfr: { min: 15, max: 200 },
};

const isPlausibleMarkerValue = (markerId: string, value: number): boolean => {
  if (!Number.isFinite(value)) return false;
  const range = BIOMARKER_RANGES[markerId];
  if (!range) return true;
  const minRange = Math.min(range.normalMin, range.optimalMin);
  const maxRange = Math.max(range.normalMax, range.optimalMax);
  const baseMin = Math.max(0, minRange * 0.2);
  const baseMax = Math.max(maxRange * 6, maxRange + 50);
  const override = PLAUSIBLE_BOUNDS[markerId];
  const min = override?.min ?? baseMin;
  const max = override?.max ?? baseMax;
  if (value < min || value > max) return false;
  const validation = MARKER_VALIDATION_RANGES[markerId];
  if (validation && (value < validation.min || value > validation.max)) return false;
  if (value > 1000 && maxRange < 200) return false;
  return true;
};

const extractMarkersFromText = (pdfText: string): BloodMarkerInput[] => {
  const cleaned = pdfText.replace(/\s+/g, " ").trim();
  if (!cleaned) return [];

  const results = new Map<string, { value: number; unit?: string }>();
  const entries = Object.entries(MARKER_SYNONYMS);

  // Skip matches inside "examens transmis" listing sections (no actual values)
  const TRANSMIS_CONTEXT_REGEX = /examen[s]?\s+transmis|ci[-\s]?dessous\s+ont\s+[ée]t[ée]\s+transmis/i;
  // Skip page headers that mention marker names without actual results
  const HEADER_CONTEXT_REGEX = /page\s+\d+\s+sur\s+\d+|biologiste|cerballiance|lbm\s/i;

  for (const [markerId, patterns] of entries) {
    for (const pattern of patterns) {
      const regex = new RegExp(pattern.source, "gi");
      let match: RegExpExecArray | null;
      while ((match = regex.exec(cleaned)) !== null) {
        const start = match.index;
        const end = start + match[0].length;
        // Skip matches inside transmitted exams sections (listing without values)
        const widerBefore = cleaned.slice(Math.max(0, start - 200), start);
        if (TRANSMIS_CONTEXT_REGEX.test(widerBefore)) continue;
        const after = cleaned.slice(end, end + 80);
        // Skip page header matches (marker name in header, no actual results)
        if (HEADER_CONTEXT_REGEX.test(after)) continue;
        const before = cleaned.slice(Math.max(0, start - 55), start);
        const value = extractNumberFromSnippet(after) ?? extractNumberFromSnippet(before);
        if (value === null) continue;
        const unit = findUnit(after) || findUnit(before);
        // Require a unit in the after text for the value to be valid (lab results always have units)
        if (!unit && !findUnit(cleaned.slice(end, end + 120))) continue;
        const normalized = normalizeMarkerValue(markerId, value, unit);
        if (!isPlausibleMarkerValue(markerId, normalized)) continue;
        results.set(markerId, { value: normalized, unit });
        break;
      }
      if (results.has(markerId)) break;
    }
  }

  return Array.from(results.entries()).map(([markerId, data]) => ({
    markerId,
    value: data.value,
  }));
};

export const extractPatientInfoFromPdfText = (pdfText: string): PatientInfo => {
  const cleaned = pdfText.replace(/\s+/g, " ").trim();
  if (!cleaned) return {};

  const lines = pdfText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const findLine = (regex: RegExp) => lines.find((line) => regex.test(line));
  const extractAfter = (line: string) => line.split(":").slice(1).join(":").trim();
  const cleanName = (value?: string) =>
    value
      ? value
          .replace(/\b(date|sexe|lieu|matricule|ins|adresse|t[ée]l|mail)\b.*$/i, "")
          .replace(/\s{2,}/g, " ")
          .trim()
      : undefined;

  let prenom: string | undefined;
  let nom: string | undefined;
  let gender: PatientInfo["gender"];
  let dob: string | undefined;
  let email: string | undefined;

  const usedLine = findLine(/nom et pr[ée]nom utilis[ée]s?/i);
  if (usedLine) {
    const raw = cleanName(extractAfter(usedLine));
    if (raw) {
      const spaced = raw.replace(/([A-ZÀ-Ÿ]{2,})([A-Z][a-zà-ÿ])/g, "$1 $2");
      const parts = spaced.split(/\s+/);
      if (parts.length >= 2) {
        nom = parts[0];
        prenom = parts.slice(1).join(" ");
      }
    }
  }

  const nomLine = findLine(/(?<!pr[ée])nom\s*de\s*naissance/i) || findLine(/\bn[ée]e?\s*\(?e?\)?\s*:\s*[A-ZÀ-Ÿ]/i) || findLine(/\bnom\s*[:]/i);
  if (!nom && nomLine) {
    nom = cleanName(extractAfter(nomLine));
  }

  const prenomLine =
    findLine(/pr[ée]nom\(s\)?\s*de\s*naissance/i) || findLine(/pr[ée]nom\s*[:]/i);
  if (!prenom && prenomLine) {
    prenom = cleanName(extractAfter(prenomLine));
  }

  const dobLine =
    findLine(/date\s*de\s*naissance/i) || findLine(/\bn[ée]e?\s*le\b/i);
  if (dobLine) {
    const match = dobLine.match(/(\d{2}[\/.\-−]\d{2}[\/.\-−]\d{2,4})/);
    dob = match?.[1]?.replace(/−/g, "-");
  }

  const genderLine = findLine(/\b(sexe|genre)\b/i);
  if (genderLine) {
    const match = genderLine.match(
      /\b(sexe|genre)\s*[:\-]?\s*(homme|femme|masculin|f[ée]minin|h|f|m)\b/i
    );
    const value = match?.[2]?.toLowerCase();
    if (value) gender = value.startsWith("f") ? "femme" : "homme";
  }

  const emailRegex = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
  const blockedEmail = /(labo|biogroup|laboratoire|rgpd|eurofins|biomnis|contact|cerba|cerballiance|rpd\.|src@|cofrac|accredit)/i;
  const preferredEmailLine = lines.find(
    (line) =>
      emailRegex.test(line) &&
      /(messagerie|patient|courriel|email|mail)/i.test(line) &&
      !blockedEmail.test(line)
  );
  const fallbackEmailLine = lines.find((line) => emailRegex.test(line) && !blockedEmail.test(line));
  const emailLine = preferredEmailLine || fallbackEmailLine;
  if (emailLine) {
    const match = emailLine.match(emailRegex);
    email = match?.[0];
  }

  const pick = (regex: RegExp): string | undefined => {
    const match = cleaned.match(regex);
    return match?.[1]?.trim();
  };

  const fallbackPrenom =
    pick(
      /pr[ée]nom\(s\)?\s*de\s*naissance\s*[:\-]?\s*([A-Za-zÀ-ÿ' -]{2,}?)(?=\s*(date|sexe|lieu|n°|adresse|$))/i
    ) ||
    pick(
      /pr[ée]nom\s*[:\-]?\s*([A-Za-zÀ-ÿ' -]{2,}?)(?=\s*(date|sexe|lieu|n°|adresse|$))/i
    );
  const fallbackNom =
    pick(
      /nom\s*de\s*naissance\s*[:\-]?\s*([A-Za-zÀ-ÿ' -]{2,}?)(?=\s*(pr[ée]nom|date|sexe|lieu|n°|adresse|$))/i
    ) ||
    pick(
      /\bnom\s*[:\-]?\s*([A-Za-zÀ-ÿ' -]{2,}?)(?=\s*(pr[ée]nom|date|sexe|lieu|n°|adresse|$))/i
    );
  const dobMatch = cleaned.match(
    /(date de naissance|n[ée]e?\s*le)\s*[:\-]?\s*([0-9]{2}[\/.\-−][0-9]{2}[\/.\-−][0-9]{2,4})/i
  );
  const fallbackDob = dobMatch?.[2]?.replace(/−/g, "-");
  const genderMatch = cleaned.match(/\b(sexe|genre)\s*[:\-]?\s*(homme|femme|h|f)\b/i);
  const genderRaw = genderMatch?.[2];
  const fallbackEmail = pick(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);

  if (!gender && genderRaw) {
    const normalized = genderRaw.toLowerCase();
    gender = normalized.startsWith("f") ? "femme" : "homme";
  }

  return {
    prenom: prenom || fallbackPrenom,
    nom: nom || fallbackNom,
    email: email || fallbackEmail,
    gender,
    dob: dob || fallbackDob,
  };
};

const hasMarkerValueInText = (text: string, markerId: string): boolean => {
  const synonyms = MARKER_SYNONYMS[markerId];
  if (!synonyms || synonyms.length === 0) return false;
  const cleaned = text.replace(/\s+/g, " ");
  const number = "[<>]?\\s*\\d+(?:[.,]\\d+)?";
  for (const synonym of synonyms) {
    const patternA = new RegExp(`${synonym.source}[^0-9]{0,35}(${number})`, "i");
    const patternB = new RegExp(`(${number})[^A-Za-z0-9]{0,35}${synonym.source}`, "i");
    if (patternA.test(cleaned) || patternB.test(cleaned)) {
      return true;
    }
  }
  return false;
};

const NON_LAB_CONTENT_PATTERNS: RegExp[] = [
  /product requirements document/i,
  /table des matieres/i,
  /\bpartie\s+\d+\s*:/i,
  /user flow/i,
  /onboarding/i,
  /\bdashboard\b/i,
  /\bfeatures?\b/i,
  /\bstack\b/i,
  /vision\s*:/i,
  /confidentiel/i,
];

const LAB_REPORT_HINT_PATTERNS: RegExp[] = [
  /laboratoire/i,
  /biologie/i,
  /compte[-\s]?rendu/i,
  /resultats?\s+analyses?/i,
  /valeurs?\s+de\s+r[ée]f[ée]rence/i,
  /pr[ée]l[èe]vement/i,
  /patient/i,
  /date de naissance/i,
];

const countRegexHits = (text: string, regex: RegExp): number => {
  const flags = regex.flags.includes("g") ? regex.flags : `${regex.flags}g`;
  const matcher = new RegExp(regex.source, flags);
  let count = 0;
  let match: RegExpExecArray | null;
  while ((match = matcher.exec(text)) !== null) {
    count += 1;
    if (match.index === matcher.lastIndex) matcher.lastIndex += 1;
  }
  return count;
};

const isLikelyBloodLabDocument = (
  pdfText: string,
  fileName: string
): { ok: boolean; reason?: string } => {
  const text = pdfText.replace(/\s+/g, " ").trim();
  if (!text) return { ok: false, reason: "empty_pdf_text" };

  const nonLabHits = NON_LAB_CONTENT_PATTERNS.filter((pattern) => pattern.test(text)).length;
  const labHits = LAB_REPORT_HINT_PATTERNS.filter((pattern) => pattern.test(text)).length;
  const quantifiedLabValueHits = countRegexHits(
    text,
    /\b\d+(?:[.,]\d+)?\s*(?:mg\/dL|mg\/L|g\/L|ng\/mL|pg\/mL|ng\/dL|pmol\/L|mmol\/L|µmol\/L|umol\/L|mIU\/L|IU\/L|UI\/L|U\/L|mL\/min|%)\b/gi
  );
  const fileNameLooksNonLab = /(prd|requirements?|spec(?:s|ification)?|roadmap|product|manual)/i.test(
    fileName
  );

  if (fileNameLooksNonLab && nonLabHits >= 1) {
    return { ok: false, reason: "non_lab_filename_pattern" };
  }
  if (nonLabHits >= 5 && labHits <= 2) {
    return { ok: false, reason: "non_lab_content_signature" };
  }
  if (quantifiedLabValueHits < 4 && nonLabHits >= 3) {
    return { ok: false, reason: "insufficient_lab_numeric_density" };
  }

  return { ok: true };
};

const addComputedMarkers = (markers: BloodMarkerInput[]): BloodMarkerInput[] => {
  const map = new Map(markers.map((marker) => [marker.markerId, marker]));
  if (!map.has("homa_ir")) {
    const gly = map.get("glycemie_jeun");
    const insulin = map.get("insuline_jeun");
    if (gly && insulin) {
      const homa = roundValue((gly.value * insulin.value) / 405, 2);
      map.set("homa_ir", { markerId: "homa_ir", value: homa });
    }
  }
  return Array.from(map.values());
};

export async function extractMarkersFromPdfText(
  pdfText: string,
  fileName: string
): Promise<BloodMarkerInput[]> {
  const cleaned = pdfText.replace(/\s+/g, " ").trim();
  if (!cleaned) return [];
  const docCheck = isLikelyBloodLabDocument(cleaned, fileName);
  if (!docCheck.ok) {
    console.warn(
      `[BloodAnalysis] Ignoring non-lab PDF "${fileName}" (${docCheck.reason || "unknown_reason"})`
    );
    return [];
  }

  const lineExtracted = extractMarkersFromLines(pdfText);
  const textExtracted = extractMarkersFromText(cleaned);
  const unique = new Map<string, BloodMarkerInput>();
  for (const item of lineExtracted) {
    if (!item.markerId) continue;
    if (!isPlausibleMarkerValue(item.markerId, item.value)) continue;
    unique.set(item.markerId, item);
  }
  for (const item of textExtracted) {
    if (!item.markerId) continue;
    if (unique.has(item.markerId)) continue;
    if (!isPlausibleMarkerValue(item.markerId, item.value)) continue;
    unique.set(item.markerId, item);
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return addComputedMarkers(Array.from(unique.values()));
  }

  const anthropic = new Anthropic();
  const markerList = Object.entries(BIOMARKER_RANGES)
    .map(([id, range]) => `${id} (${range.name}, ${range.unit})`)
    .join(", ");

  const userPrompt = `Tu recois le texte extrait d'un bilan sanguin PDF de laboratoire francais (${fileName}).
Ta mission: extraire UNIQUEMENT les RESULTATS DU PATIENT (pas les valeurs de reference, pas les anteriorites, pas les seuils).

REGLES CRITIQUES:
- Chaque marqueur a UNE SEULE valeur : celle du prelevement le plus recent
- IGNORE les colonnes "Anteriorites" ou les resultats dates d'un prelevement precedent
- IGNORE les "Valeurs de reference", "N:", "Valeurs normales", seuils ESC, les chiffres apres "N:" ou "N :"
- NE FAIS AUCUNE CONVERSION D'UNITE. Retourne la valeur BRUTE exactement comme elle apparait dans le PDF.
- Pour la testosterone LIBRE (pg/ml) et la testosterone TOTALE (ng/ml ou ng/dL) : ce sont DEUX marqueurs DIFFERENTS
  * TESTOSTERONE (ECLIA) = testosterone_total
  * TESTOSTERONE LIBRE (R.I.A.) = testosterone_libre → prends la valeur en pg/ml (PAS pmol/l)
- Si un marqueur apparait en DEUX unites (ex: nmol/l ET pg/ml), prends l'unite listee ci-dessous comme unite attendue
- Pour les valeurs avec virgule francaise (ex: 6,7) interprete comme 6.7 (point decimal)
- ATTENTION aux en-tetes de page (ex: "TESTOSTERONE LIBRE" suivi de "TESTOSTERONE HOMME") : ce ne sont PAS des resultats, ignore-les

Liste autorisee (markerId, nom, unite attendue):
${markerList}

IMPORTANT: NE CONVERTIS PAS les valeurs. Retourne la valeur BRUTE du PDF dans l'unite qui correspond a l'unite attendue ci-dessus.
Si le PDF donne la valeur dans une autre unite que l'unite attendue, retourne quand meme la valeur BRUTE avec son unite source , la conversion sera faite automatiquement.

Retourne UNIQUEMENT un JSON array (sans markdown, sans texte):
[{"markerId": "...", "value": number_brut, "unit_source": "unite exacte du PDF"}]

TEXTE PDF:
${cleaned.slice(0, 20000)}`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4000,
      system: "Tu es un extracteur strict de biomarqueurs sanguins. Tu ne renvoies que du JSON valide. ZERO erreur toleree. Chaque valeur doit correspondre EXACTEMENT au resultat du patient dans le PDF, pas aux valeurs de reference ni aux anteriorites.",
      messages: [{ role: "user", content: userPrompt }],
    });

    const textContent = response.content.find((c) => c.type === "text");
    const rawItems = extractJsonArray(textContent?.text || "");
    console.log(`[BloodAnalysis] Claude raw extraction: ${JSON.stringify(rawItems.filter((i: any) => /testost/i.test(i.markerId)).slice(0, 5))}`);
    const extracted = rawItems
      .map((item) => {
        const markerId = String((item as any).markerId || "").trim();
        const unitSource = String((item as any).unit_source || (item as any).unit || "").trim();
        return {
          markerId,
          value: normalizeMarkerValue(markerId, Number((item as any).value), unitSource || undefined),
        };
      })
      .filter((item) => item.markerId && !Number.isNaN(item.value))
      .filter((item) => Boolean(BIOMARKER_RANGES[item.markerId]))
      .filter((item) => isPlausibleMarkerValue(item.markerId, item.value));

    // Claude extraction OVERRIDES regex extraction (more accurate for French lab formats)
    for (const item of extracted) {
      unique.set(item.markerId, item); // Override regex values with Claude values
    }
    console.log(`[BloodAnalysis] Claude extracted ${extracted.length} markers (overriding regex)`);

  } catch (error) {
    if (isAnthropicLowCreditError(error)) {
      console.warn(
        `[BloodAnalysis] Anthropic extraction skipped for "${fileName}" (AI_CREDIT_BALANCE_LOW). Falling back to deterministic extraction.`
      );
    } else {
      console.warn(
        `[BloodAnalysis] Anthropic extraction failed for "${fileName}" (${getErrorMessage(
          error
        )}). Falling back to deterministic extraction.`
      );
    }
  }

  return addComputedMarkers(Array.from(unique.values()));
}

function getMarkerStatus(value: number, range: BiomarkerRange): "optimal" | "normal" | "suboptimal" | "critical" {
  if (value >= range.optimalMin && value <= range.optimalMax) {
    return "optimal";
  }

  if (value >= range.normalMin && value <= range.normalMax) {
    // Premium bloodwork logic: values far from optimal are suboptimal even if still "normal labo".
    const optimalSpread = Math.max(1e-6, Math.abs(range.optimalMax - range.optimalMin));
    const distanceToOptimal =
      value < range.optimalMin
        ? (range.optimalMin - value) / optimalSpread
        : value > range.optimalMax
        ? (value - range.optimalMax) / optimalSpread
        : 0;

    return distanceToOptimal >= 0.15 ? "suboptimal" : "normal";
  }

  const normalSpread = Math.max(1e-6, Math.abs(range.normalMax - range.normalMin));
  const lowerCriticalThreshold = Math.max(
    range.normalMin - normalSpread * 0.2,
    range.normalMin > 0 ? range.normalMin * 0.8 : Number.NEGATIVE_INFINITY,
  );
  const upperCriticalThreshold = Math.min(
    range.normalMax + normalSpread * 0.2,
    range.normalMax > 0 ? range.normalMax * 1.2 : Number.POSITIVE_INFINITY,
  );
  if (value < lowerCriticalThreshold || value > upperCriticalThreshold) {
    return "critical";
  }

  return "suboptimal";
}

const matchesPatternDirection = (
  value: number,
  range: BiomarkerRange,
  expected: "low" | "high" | "normal",
): boolean => {
  if (expected === "low") return value < range.normalMin;
  if (expected === "high") return value > range.normalMax;
  return value >= range.normalMin && value <= range.normalMax;
};

function detectPatterns(markers: MarkerAnalysis[]): DiagnosticPattern[] {
  const detectedPatterns: DiagnosticPattern[] = [];
  const markerMap = new Map(markers.map(m => [m.markerId, m]));

  for (const pattern of DIAGNOSTIC_PATTERNS) {
    let isFullMatch = true;
    for (const [markerId, expectedDirection] of Object.entries(pattern.markers)) {
      const marker = markerMap.get(markerId);
      if (!marker) {
        isFullMatch = false;
        break;
      }

      const range = BIOMARKER_RANGES[markerId];
      if (!range || !matchesPatternDirection(marker.value, range, expectedDirection)) {
        isFullMatch = false;
        break;
      }
    }

    if (isFullMatch) {
      detectedPatterns.push(pattern);
    }
  }

  return detectedPatterns;
}

const SOURCE_LABELS: Record<string, string> = {
  huberman: "Huberman Lab",
  applied_metabolics: "Applied Metabolics",
  newsletter: "APEXLABS Newsletter",
  peter_attia: "Dr. Peter Attia",
  mpmd: "Derek de MPMD",
  chris_masterjohn: "Dr. Chris Masterjohn",
  examine: "Examine.com",
  marek_health: "Marek Health",
  sbs: "Stronger by Science",
  renaissance_periodization: "Renaissance Periodization",
  pubmed: "PubMed",
  achzod: "Achzod",
  manual: "Manual",
};

const EXPERT_NAME_REGEX = /(Derek(?: de MPMD)?|MPMD|Huberman|Attia|Masterjohn|Examine(?:\.com)?|Applied Metabolics)/gi;
const GENERIC_PHRASES = [
  "renseigne sur ta sante",
  "renseigne sur votre sante",
  "aspect precis",
  "indique un aspect",
  "marqueur de ta sante",
  "marqueur de votre sante",
];

const formatPercentDelta = (value: number, min: number, max: number) => {
  if (!Number.isFinite(value) || !Number.isFinite(min) || !Number.isFinite(max)) return "N/A";
  if (value < min) {
    const pct = min !== 0 ? Math.round(((min - value) / min) * 100) : 0;
    return `-${pct}% (sous la limite)`;
  }
  if (value > max) {
    const pct = max !== 0 ? Math.round(((value - max) / max) * 100) : 0;
    return `+${pct}% (au-dessus de la limite)`;
  }
  return "0% (dans la plage)";
};

const selectDeepDiveMarkers = (markers: MarkerAnalysis[]) => {
  const weight: Record<string, number> = { critical: 0, suboptimal: 1, normal: 2, optimal: 3 };
  return [...markers]
    .filter((marker) => marker.status !== "optimal")
    .map((marker) => {
      const range = BIOMARKER_RANGES[marker.markerId];
      const diff =
        range && marker.value !== undefined
          ? Math.max(
              marker.value < range.optimalMin
                ? (range.optimalMin - marker.value) / range.optimalMin
                : 0,
              marker.value > range.optimalMax
                ? (marker.value - range.optimalMax) / range.optimalMax
                : 0
            )
          : 0;
      return { marker, diff };
    })
    .sort((a, b) => {
      const statusA = weight[a.marker.status] ?? 4;
      const statusB = weight[b.marker.status] ?? 4;
      if (statusA !== statusB) return statusA - statusB;
      return b.diff - a.diff;
    })
    .map((entry) => entry.marker)
    .slice(0, 6);
};

const slugifySourceRef = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

const getSourceRefId = (article: ScrapedArticle) => {
  if (article.id && article.id.trim()) return article.id.trim();
  const source = slugifySourceRef(article.source || "source");
  const title = slugifySourceRef(article.title || "untitled");
  return `${source}-${title}`.slice(0, 72);
};

const buildSourceExcerpt = (article: ScrapedArticle) => {
  const label = SOURCE_LABELS[article.source] || article.source;
  const sourceId = getSourceRefId(article);
  const excerpt = article.content.replace(/\s+/g, " ").trim().slice(0, 360);
  const title = article.title?.trim() || "Source";
  const sourceLine = `- [SRC:${sourceId}] ${label} , ${title}`;
  const urlLine = article.url ? `  URL: ${article.url}` : "";
  const excerptLine = `  Extrait: ${excerpt}${excerpt.length >= 360 ? "..." : ""}`;
  return [sourceLine, urlLine, excerptLine].filter(Boolean).join("\n");
};

const normalizePlain = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

async function getBiomarkerDeepDiveContext(
  markers: MarkerAnalysis[],
  userProfile: { prenom?: string; nom?: string; age?: string }
): Promise<{ context: string; markerNames: string[] }> {
  const deepDiveMarkers = selectDeepDiveMarkers(markers);
  if (!deepDiveMarkers.length) return { context: "", markerNames: [] };

  const patientName = [userProfile.prenom, userProfile.nom].filter(Boolean).join(" ").trim() || "le client";

  const sections: string[] = [];
  for (const marker of deepDiveMarkers) {
    const range = BIOMARKER_RANGES[marker.markerId];
    const normalMin = range?.normalMin ?? null;
    const normalMax = range?.normalMax ?? null;
    const optimalMin = range?.optimalMin ?? null;
    const optimalMax = range?.optimalMax ?? null;

    const keywords = [marker.name.toLowerCase(), marker.markerId];
    let sourceLines: string[] = [];
    try {
      const articles = await searchArticles(keywords, 4, [
        "huberman",
        "applied_metabolics",
        "peter_attia",
        "mpmd",
        "chris_masterjohn",
        "examine",
        "marek_health",
        "sbs",
        "newsletter",
      ]);
      sourceLines = articles.slice(0, 3).map(buildSourceExcerpt);
    } catch (error) {
      console.warn(
        `[BloodAnalysis] Deep dive source lookup failed for ${marker.markerId}:`,
        (error as any)?.message || error
      );
      sourceLines = [];
    }

    sections.push(
      [
        `### ${marker.name}`,
        `Patient: ${patientName}, ${userProfile.age || "N/A"} ans`,
        `Valeur mesuree: ${marker.value} ${marker.unit}`,
        `Range labo normal: ${normalMin ?? "N/A"} - ${normalMax ?? "N/A"} ${marker.unit || ""}`,
        `Range optimal performance: ${optimalMin ?? "N/A"} - ${optimalMax ?? "N/A"} ${marker.unit || ""}`,
        `Ecart vs normal: ${normalMin !== null && normalMax !== null ? formatPercentDelta(marker.value, normalMin, normalMax) : "N/A"}`,
        `Ecart vs optimal: ${
          optimalMin !== null && optimalMax !== null ? formatPercentDelta(marker.value, optimalMin, optimalMax) : "N/A"
        }`,
        `Statut: ${marker.status}`,
        "SOURCES DISPONIBLES (tu DOIS citer au moins 2 experts):",
        sourceLines.length ? sourceLines.join("\n") : "- Aucune source fournie pour ce marqueur.",
      ].join("\n")
    );
  }

  return {
    context: sections.join("\n\n"),
    markerNames: deepDiveMarkers.map((marker) => marker.name),
  };
}

const extractSection = (text: string, title: string): string => {
  const startIdx = text.indexOf(title);
  if (startIdx === -1) return "";
  const nextIdx = text.indexOf("\n## ", startIdx + title.length);
  return text.slice(startIdx, nextIdx === -1 ? undefined : nextIdx);
};

const countMatches = (text: string, regex: RegExp) => {
  if (!text) return 0;
  return (text.match(regex) || []).length;
};

const hasGenericPhrases = (text: string) => {
  const normalized = normalizePlain(text);
  return GENERIC_PHRASES.some((phrase) => normalized.includes(phrase));
};

const normalizeSectionHeading = (value: string) =>
  normalizePlain(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

type ParsedH2Section = {
  title: string;
  normalizedTitle: string;
  content: string;
  startLine: number;
  endLine: number;
};

const sectionMatchesAlias = (normalizedTitle: string, alias: string): boolean => {
  const normalizedAlias = normalizeSectionHeading(alias);
  return (
    normalizedTitle === normalizedAlias ||
    normalizedTitle.includes(normalizedAlias) ||
    normalizedAlias.includes(normalizedTitle)
  );
};

const parseH2Sections = (markdown: string): ParsedH2Section[] => {
  if (!markdown) return [];
  const lines = markdown.split("\n");
  const sections: ParsedH2Section[] = [];
  let current: Omit<ParsedH2Section, "endLine"> | null = null;

  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx];
    const headingMatch = line.match(/^\s*(?:\*\*)?##\s+(.+?)\s*(?:\*\*)?\s*$/);
    if (headingMatch) {
      if (current) {
        sections.push({
          ...current,
          endLine: idx - 1,
        });
      }
      const title = headingMatch[1].trim();
      current = {
        title,
        normalizedTitle: normalizeSectionHeading(title),
        content: `${line}\n`,
        startLine: idx,
      };
      continue;
    }
    if (current) current.content += `${line}\n`;
  }

  if (current) {
    sections.push({
      ...current,
      endLine: lines.length - 1,
    });
  }
  return sections;
};

type RequiredReportSection = {
  key: string;
  title: string;
  aliases: string[];
  minChars: number;
};

const REQUIRED_REPORT_SECTIONS: RequiredReportSection[] = [
  { key: "synthese", title: "Synthèse exécutive", aliases: ["synthese-executive"], minChars: 1200 },
  { key: "qualite", title: "Qualité des données & limites", aliases: ["qualite-des-donnees-limites"], minChars: 850 },
  {
    key: "tableau",
    title: "Tableau de bord (scores & priorités)",
    aliases: ["tableau-de-bord-scores-priorites"],
    minChars: 900,
  },
  {
    key: "recomposition",
    title: "Potentiel recomposition (perte de gras + gain de muscle)",
    aliases: ["potentiel-recomposition-perte-de-gras-gain-de-muscle", "potentiel-recomposition"],
    minChars: 1200,
  },
  {
    key: "axes",
    title: "Lecture compartimentée par axes",
    aliases: ["lecture-compartimentee-par-axes", "analyse-par-axe"],
    minChars: 6000,
  },
  {
    key: "interconnexions",
    title: "Interconnexions majeures (le pattern)",
    aliases: ["interconnexions-majeures-le-pattern", "interconnexions-majeures"],
    minChars: 1500,
  },
  {
    key: "deep_dive",
    title: "Deep dive , marqueurs prioritaires",
    aliases: ["deep-dive-marqueurs-prioritaires", "deep-dive"],
    minChars: 4600,
  },
  {
    key: "plan",
    title: "Plan d'action 90 jours",
    aliases: ["plan-d-action-90-jours", "plan-90-jours"],
    minChars: 3400,
  },
  {
    key: "nutrition",
    title: "Nutrition & entraînement",
    aliases: ["nutrition-entrainement", "nutrition-entrainement-traduction-pratique", "protocole-nutrition"],
    minChars: 2600,
  },
  {
    key: "supplements",
    title: "Suppléments & stack",
    aliases: ["supplements-stack", "supplements-stack-minimaliste-mais-impact", "protocole-supplements"],
    minChars: 3000,
  },
  {
    key: "annexes",
    title: "Annexes (références et vigilance)",
    aliases: ["annexes-references-et-vigilance", "annexes-ultra-long", "annexes"],
    minChars: 900,
  },
  { key: "sources", title: "Sources (bibliothèque)", aliases: ["sources-bibliotheque", "sources-scientifiques"], minChars: 120 },
];

const DEPTH_CRITICAL_SECTION_KEYS = new Set(["axes", "interconnexions", "deep_dive", "plan", "nutrition", "supplements"]);

const getSectionLengthMultiplier = (markerCount: number): number => {
  if (markerCount >= 22) return 1.2;
  if (markerCount >= 16) return 1.08;
  if (markerCount >= 12) return 1.0;
  if (markerCount >= 8) return 0.85;
  return 0.72;
};

const findSectionByAliases = (
  sections: ParsedH2Section[],
  aliases: string[],
): ParsedH2Section | undefined => {
  return sections.find((section) => aliases.some((alias) => sectionMatchesAlias(section.normalizedTitle, alias)));
};

const getSectionSpecByHeading = (section: ParsedH2Section): RequiredReportSection | undefined => {
  return REQUIRED_REPORT_SECTIONS.find((spec) => spec.aliases.some((alias) => sectionMatchesAlias(section.normalizedTitle, alias)));
};

const reorderReportSections = (report: string): string => {
  const parsed = parseH2Sections(report);
  if (!parsed.length) return report.trim();
  const ordered = REQUIRED_REPORT_SECTIONS
    .map((spec) => findSectionByAliases(parsed, spec.aliases))
    .filter((section): section is ParsedH2Section => Boolean(section))
    .map((section) => section.content.trim());
  return ordered.length ? ordered.join("\n\n").trim() : report.trim();
};

const FRENCH_HEADING_REPLACEMENTS: Array<{ pattern: RegExp; replacement: string }> = [
  { pattern: /^\s*##\s+Synthese executive\s*$/gim, replacement: "## Synthèse exécutive" },
  { pattern: /^\s*##\s+Qualite des donnees & limites\s*$/gim, replacement: "## Qualité des données & limites" },
  { pattern: /^\s*##\s+Tableau de bord \(scores & priorites\)\s*$/gim, replacement: "## Tableau de bord (scores & priorités)" },
  {
    pattern: /^\s*##\s+Lecture compartimentee par axes\s*$/gim,
    replacement: "## Lecture compartimentée par axes",
  },
  { pattern: /^\s*##\s+Nutrition & entrainement\s*$/gim, replacement: "## Nutrition & entraînement" },
  { pattern: /^\s*##\s+Supplements & stack\s*$/gim, replacement: "## Suppléments & stack" },
  { pattern: /^\s*##\s+Annexes \(references et vigilance\)\s*$/gim, replacement: "## Annexes (références et vigilance)" },
  { pattern: /^\s*##\s+Sources \(bibliotheque\)\s*$/gim, replacement: "## Sources (bibliothèque)" },
];

const FRENCH_TEXT_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\bsante\b/gi, "santé"],
  [/\bentrainement\b/gi, "entraînement"],
  [/\bentrainements\b/gi, "entraînements"],
  [/\brecuperation\b/gi, "récupération"],
  [/\brecuperations\b/gi, "récupérations"],
  [/\bsupplements\b/gi, "suppléments"],
  [/\bbibliotheque\b/gi, "bibliothèque"],
  [/\breferences\b/gi, "références"],
  [/\bqualite\b/gi, "qualité"],
  [/\bdonnees\b/gi, "données"],
  [/\bmetabolique\b/gi, "métabolique"],
  [/\bmetaboliques\b/gi, "métaboliques"],
  [/\bhepatique\b/gi, "hépatique"],
  [/\bhepatiques\b/gi, "hépatiques"],
  [/\bpremiere\b/gi, "première"],
  [/\bpremieres\b/gi, "premières"],
  [/\bprecisement\b/gi, "précisément"],
  [/\bprelevement\b/gi, "prélèvement"],
  [/\bdetaillee\b/gi, "détaillée"],
  [/\bdetaille\b/gi, "détaillé"],
  [/\bmecanistique\b/gi, "mécanistique"],
  [/\bmecanismes\b/gi, "mécanismes"],
  [/\bmecanisme\b/gi, "mécanisme"],
  [/\bhypotheses\b/gi, "hypothèses"],
  [/\bhypothese\b/gi, "hypothèse"],
  [/\bcoherent\b/gi, "cohérent"],
  [/\bcoherente\b/gi, "cohérente"],
  [/\ba jeun\b/gi, "à jeun"],
  [/\ba eviter\b/gi, "à éviter"],
  [/\ba surveiller\b/gi, "à surveiller"],
];

const UNACCENTED_CRITICAL_TERMS_REGEX =
  /\b(?:synthese|qualite|donnees|entrainement|supplements|bibliotheque|references|prelevement|detaille|detaillee|mecanisme|hypothese)\b/gi;
const ACCENTED_CHAR_REGEX = /[àâäéèêëîïôöùûüçœæÀÂÄÉÈÊËÎÏÔÖÙÛÜÇŒÆ]/g;

const normalizeFrenchTypography = (text: string): string => {
  if (!text) return "";
  let next = text;
  for (const { pattern, replacement } of FRENCH_HEADING_REPLACEMENTS) {
    next = next.replace(pattern, replacement);
  }
  for (const [pattern, replacement] of FRENCH_TEXT_REPLACEMENTS) {
    next = next.replace(pattern, replacement);
  }
  return next;
};

const validateFrenchOrthography = (output: string, markerCount: number): string[] => {
  const reasons: string[] = [];
  if (!output.trim()) return reasons;

  const accentCount = countMatches(output, ACCENTED_CHAR_REGEX);
  const minAccents = Math.max(35, Math.min(260, Math.round(output.length / 320)));
  if (accentCount < minAccents) {
    reasons.push(`insufficient_french_accents:${accentCount}/${minAccents}`);
  }

  const unaccentedHits = countMatches(output, UNACCENTED_CRITICAL_TERMS_REGEX);
  const maxUnaccented = Math.max(8, Math.round(markerCount * 1.4));
  if (unaccentedHits > maxUnaccented) {
    reasons.push(`too_many_unaccented_terms:${unaccentedHits}/${maxUnaccented}`);
  }

  return reasons;
};

const getErrorMessage = (error: unknown): string => {
  if (!error) return "";
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message || "";
  return String(error);
};

const isAnthropicLowCreditError = (error: unknown): boolean => {
  const message = getErrorMessage(error).toLowerCase();
  return (
    message.includes("credit balance is too low") ||
    message.includes("insufficient credits") ||
    message.includes("billing")
  );
};

const BULLET_LINE_REGEX = /^\s*(?:[-*+]|(?:\d+[\.\)]))\s+/;
const MARKDOWN_TABLE_LINE_REGEX = /^\s*\|(?:[^|\n]+\|)+\s*$/;
const PLACEHOLDER_AXIS_HEADING_REGEX = /^\s*###\s*Axe\s+\d+\s+[,-]\s*Non renseigne\b/im;
const NON_RENSEIGNE_DOSSIER_REGEX = /non renseigne pour ce dossier/i;
const ACHZOD_FIRST_PERSON_REGEX = /\b(?:je|j['’]ai|j['’]analyse|j['’]observe|j['’]identifie|je te|je t['’]|je vais)\b/gi;
const ACHZOD_TUTEOIEMENT_REGEX = /\b(?:tu|ton|ta|tes|toi|t['’]es|t['’]as|t['’]a)\b/gi;
const FORBIDDEN_THIRD_PERSON_PATIENT_REGEX =
  /\b(?:le patient|ce patient|il presente|il est recommande|ce dossier concerne|on recommande)\b/gi;
const FORBIDDEN_UNGROUNDED_DOPING_REGEX =
  /\b(?:tu\s+(?:prends|utilises|consommes)|prise|usage|consommation|suspicion|abus)\s+(?:de\s+)?(?:st[ée]ro[iï]des?|anabolisants?|dopage)\b/gi;

const validateNarrativeStyle = (output: string, markerCount: number): string[] => {
  const reasons: string[] = [];
  const lines = output.split(/\r?\n/);
  const bulletLines = lines.filter((line) => BULLET_LINE_REGEX.test(line)).length;
  const tableLines = lines.filter((line) => MARKDOWN_TABLE_LINE_REGEX.test(line)).length;

  if (bulletLines > 0) {
    reasons.push(`bullet_points_detected:${bulletLines}`);
  }
  if (tableLines > 0) {
    reasons.push(`markdown_tables_detected:${tableLines}`);
  }

  const sentenceCount = (output.match(/[.!?](?:\s|$)/g) || []).length;
  const minSentences = Math.max(35, markerCount * 4);
  if (sentenceCount < minSentences) {
    reasons.push(`insufficient_sentence_density:${sentenceCount}/${minSentences}`);
  }

  return reasons;
};

const validateCoachVoice = (output: string, markerCount: number): string[] => {
  const reasons: string[] = [];
  const firstPersonCount = countMatches(output, ACHZOD_FIRST_PERSON_REGEX);
  const tutoiementCount = countMatches(output, ACHZOD_TUTEOIEMENT_REGEX);
  const thirdPersonPatientCount = countMatches(output, FORBIDDEN_THIRD_PERSON_PATIENT_REGEX);

  const minFirstPerson = Math.max(4, Math.min(20, Math.ceil(markerCount / 2)));
  const minTutoiement = Math.max(14, Math.min(65, markerCount * 3));

  if (firstPersonCount < minFirstPerson) {
    reasons.push(`insufficient_first_person_coach_voice:${firstPersonCount}/${minFirstPerson}`);
  }
  if (tutoiementCount < minTutoiement) {
    reasons.push(`insufficient_tutoiement_density:${tutoiementCount}/${minTutoiement}`);
  }
  if (thirdPersonPatientCount > 0) {
    reasons.push(`forbidden_third_person_patient_voice:${thirdPersonPatientCount}`);
  }
  const ungroundedDopingMentions = countMatches(output, FORBIDDEN_UNGROUNDED_DOPING_REGEX);
  if (ungroundedDopingMentions > 0) {
    reasons.push(`forbidden_ungrounded_doping_mentions:${ungroundedDopingMentions}`);
  }

  return reasons;
};

const upsertSectionByAliases = (report: string, aliases: string[], newSectionContent: string): string => {
  const nextSection = normalizeFrenchTypography(stripEmojis(newSectionContent || "").trim());
  if (!nextSection) return report.trim();

  const lines = report.split("\n");
  const sections = parseH2Sections(report);
  const match = findSectionByAliases(sections, aliases);

  if (!match) {
    const sourcesIdx = findSourcesHeadingIndex(report);
    if (sourcesIdx !== -1) {
      const before = report.slice(0, sourcesIdx).trimEnd();
      const after = report.slice(sourcesIdx).trimStart();
      return [before, nextSection, after].filter(Boolean).join("\n\n").trim();
    }
    return [report.trim(), nextSection].filter(Boolean).join("\n\n").trim();
  }

  const before = lines.slice(0, match.startLine).join("\n").trimEnd();
  const after = lines.slice(match.endLine + 1).join("\n").trimStart();
  return [before, nextSection, after].filter(Boolean).join("\n\n").trim();
};

const validateReportStructure = (
  output: string,
  markers: MarkerAnalysis[],
  availableSourceIds?: Set<string>,
): {
  ok: boolean;
  reasons: string[];
  missing: string[];
  thin: string[];
  matchedSections: number;
} => {
  const reasons: string[] = [];
  const missing: string[] = [];
  const thin: string[] = [];
  const sections = parseH2Sections(output);

  if (sections.length !== REQUIRED_REPORT_SECTIONS.length) {
    reasons.push(`invalid_h2_count:${sections.length}/${REQUIRED_REPORT_SECTIONS.length}`);
  }

  const unknownSections = sections.filter((section) => !getSectionSpecByHeading(section));
  if (unknownSections.length) {
    reasons.push(`unexpected_sections:${unknownSections.map((section) => section.normalizedTitle).join(",")}`);
  }

  for (const spec of REQUIRED_REPORT_SECTIONS) {
    const duplicateCount = sections.filter((section) =>
      spec.aliases.some((alias) => sectionMatchesAlias(section.normalizedTitle, alias))
    ).length;
    if (duplicateCount > 1) {
      reasons.push(`duplicate_section:${spec.key}`);
    }
  }

  for (let idx = 0; idx < REQUIRED_REPORT_SECTIONS.length; idx += 1) {
    const spec = REQUIRED_REPORT_SECTIONS[idx];
    const sectionAtIndex = sections[idx];
    if (!sectionAtIndex) continue;
    const matchesExpected = spec.aliases.some((alias) => sectionMatchesAlias(sectionAtIndex.normalizedTitle, alias));
    if (!matchesExpected) {
      const foundIndex = sections.findIndex((section) =>
        spec.aliases.some((alias) => sectionMatchesAlias(section.normalizedTitle, alias))
      );
      if (foundIndex !== -1) {
        reasons.push(`section_order_mismatch:${spec.key}:${foundIndex}->${idx}`);
      }
    }
  }

  const markerCount = markers.length;
  const sectionLengthMultiplier = getSectionLengthMultiplier(markerCount);
  let matchedSections = 0;

  for (const spec of REQUIRED_REPORT_SECTIONS) {
    const found = findSectionByAliases(sections, spec.aliases);

    if (!found) {
      missing.push(spec.key);
      continue;
    }
    matchedSections += 1;

    const minChars = Math.round(spec.minChars * sectionLengthMultiplier);
    if (found.content.trim().length < minChars) {
      thin.push(spec.key);
    }
  }

  if (missing.length) reasons.push(`missing_sections:${missing.join(",")}`);
  const thinCritical = thin.filter((key) => DEPTH_CRITICAL_SECTION_KEYS.has(key));
  if (thinCritical.length) reasons.push(`thin_priority_sections:${thinCritical.join(",")}`);
  if (!thinCritical.length && thin.length) reasons.push(`thin_sections:${thin.join(",")}`);

  const focusMarkers = markers
    .filter((marker) => marker.status === "critical" || marker.status === "suboptimal")
    .map((marker) => normalizePlain(marker.name));
  if (focusMarkers.length) {
    const normalizedOutput = normalizePlain(output);
    const coverage = focusMarkers.filter((name) => normalizedOutput.includes(name)).length;
    const minCoverage = Math.min(6, Math.max(2, Math.ceil(focusMarkers.length * 0.5)));
    if (coverage < minCoverage) {
      reasons.push(`insufficient_marker_mentions:${coverage}/${minCoverage}`);
    }
  }

  const bodyWithoutSources = removeSourcesSection(output);
  const citedSourceIds = extractSourceIds(bodyWithoutSources);
  const baseMinSourceCitations = Math.max(2, Math.min(8, Math.ceil(markerCount / 4)));
  const minSourceCitations =
    availableSourceIds && availableSourceIds.size > 0
      ? Math.max(1, Math.min(baseMinSourceCitations, availableSourceIds.size))
      : 0;
  if (minSourceCitations > 0 && citedSourceIds.length < minSourceCitations) {
    reasons.push(`insufficient_source_citations:${citedSourceIds.length}/${minSourceCitations}`);
  }

  if (availableSourceIds && availableSourceIds.size > 0) {
    const unknownSourceIds = citedSourceIds.filter((id) => !availableSourceIds.has(id));
    if (unknownSourceIds.length) {
      reasons.push(`unknown_source_ids:${unknownSourceIds.join(",")}`);
    }
  }

  const sourcesSection = findSectionByAliases(sections, ["sources-bibliotheque", "sources-scientifiques"]);
  if (sourcesSection) {
    const sourceIdsInSection = extractSourceIds(sourcesSection.content);
    const missingInSection = citedSourceIds.filter((id) => !sourceIdsInSection.includes(id));
    const extraInSection = sourceIdsInSection.filter((id) => !citedSourceIds.includes(id));
    if (missingInSection.length || extraInSection.length) {
      reasons.push(
        `sources_section_mismatch:missing=${missingInSection.join(",") || "none"};extra=${extraInSection.join(",") || "none"}`
      );
    }
  }

  const outputLength = output.trim().length;
  if (markerCount >= 18 && outputLength < 20000) {
    reasons.push("report_too_short_for_marker_volume");
  } else if (markerCount >= 12 && outputLength < 15000) {
    reasons.push("report_too_short");
  } else if (markerCount >= 8 && outputLength < 10500) {
    reasons.push("report_too_short_low_data");
  }

  reasons.push(...validateNarrativeStyle(output, markerCount));
  reasons.push(...validateCoachVoice(output, markerCount));
  reasons.push(...validateFrenchOrthography(output, markerCount));

  const placeholderAxisHeadings = countMatches(output, PLACEHOLDER_AXIS_HEADING_REGEX);
  if (placeholderAxisHeadings > 0) {
    reasons.push(`placeholder_axis_headings:${placeholderAxisHeadings}`);
  }
  const nonRenseigneDossierCount = countMatches(output, NON_RENSEIGNE_DOSSIER_REGEX);
  if (nonRenseigneDossierCount > 1) {
    reasons.push(`non_renseigne_placeholder_overuse:${nonRenseigneDossierCount}`);
  }

  return {
    ok: reasons.length === 0,
    reasons,
    missing,
    thin,
    matchedSections,
  };
};

const validateDeepDive = (
  output: string,
  markerNames: string[],
  availableSourceIds?: Set<string>,
) => {
  const deepDive = extractSection(output, "## Deep dive");
  if (!deepDive) return { ok: false, reason: "missing_deep_dive" };

  if (!markerNames.length) return { ok: true, reason: "" };

  const normalizedDeepDive = normalizePlain(deepDive);
  const coveredMarkers = markerNames.filter((name) =>
    normalizedDeepDive.includes(normalizePlain(name))
  ).length;
  const minCoverage = Math.min(markerNames.length, Math.max(2, Math.ceil(markerNames.length * 0.55)));
  if (coveredMarkers < minCoverage) {
    return { ok: false, reason: "insufficient_marker_coverage" };
  }

  const deepDiveMarkerHeadings = countMatches(deepDive, /^\s*###\s+/gm);
  const minMarkerHeadings = Math.min(markerNames.length, Math.max(2, Math.ceil(markerNames.length * 0.45)));
  if (deepDiveMarkerHeadings < minMarkerHeadings) {
    return { ok: false, reason: "insufficient_deep_dive_marker_blocks" };
  }

  const citedSourceIds = extractSourceIds(deepDive);
  const minDeepDiveSources =
    availableSourceIds && availableSourceIds.size > 0 ? Math.max(1, Math.min(2, availableSourceIds.size)) : 0;
  if (minDeepDiveSources > 0 && citedSourceIds.length < minDeepDiveSources) {
    return { ok: false, reason: "insufficient_source_mentions_in_deep_dive" };
  }
  if (availableSourceIds && availableSourceIds.size > 0) {
    const unknownSourceIds = citedSourceIds.filter((id) => !availableSourceIds.has(id));
    if (unknownSourceIds.length) {
      return { ok: false, reason: `unknown_source_ids_in_deep_dive:${unknownSourceIds.join(",")}` };
    }
  }
  const expertMentions = countMatches(deepDive, EXPERT_NAME_REGEX);
  if (expertMentions < 1) {
    return { ok: false, reason: "missing_expert_mentions_in_deep_dive" };
  }
  if (/[\p{Extended_Pictographic}\uFE0F]/gu.test(deepDive)) {
    return { ok: false, reason: "emoji_present" };
  }
  if (hasGenericPhrases(deepDive)) {
    return { ok: false, reason: "generic_phrases" };
  }
  return { ok: true, reason: "" };
};

export async function analyzeBloodwork(
  markers: BloodMarkerInput[],
  userProfile: {
    gender: "homme" | "femme";
    age?: string;
    objectives?: string;
    medications?: string;
  }
): Promise<BloodAnalysisResult> {
  // Analyze each marker
  const analyzedMarkers: MarkerAnalysis[] = [];
  const optimal: string[] = [];
  const watch: string[] = [];
  const action: string[] = [];

  for (const input of markers) {
    // Support both markerId and name as lookup key, with normalization
    const rawMarkerId = input.markerId || input.name;
    if (!rawMarkerId) continue;

    // Normalize the marker name to match BIOMARKER_RANGES keys
    let markerId = normalizeMarkerName(rawMarkerId);

    // Normalize marker value to the expected unit FIRST (handles ng/mL→ng/dL, mmol/L→mg/dL, etc.)
    const normalizedValue = normalizeMarkerValue(markerId, input.value, input.unit);

    // Route testosterone to gender-specific range for women
    if (markerId === "testosterone_total" && userProfile.gender === "femme") {
      markerId = "testosterone_total_femme";
    }

    // Route magnesium: if normalized value looks like serum (< 4 mg/dL), use serum ranges
    if ((markerId === "magnesium_rbc" || markerId === "magnesium") && normalizedValue < 4) {
      markerId = "magnesium_serum";
    }

    const range = BIOMARKER_RANGES[markerId];
    if (!range) {
      console.log(`[analyzeBloodwork] Unknown marker: "${rawMarkerId}" (normalized: "${markerId}")`);
      continue;
    }

    // Skip gender-specific markers for wrong gender
    if (range.genderSpecific && range.genderSpecific !== userProfile.gender) continue;

    const status = getMarkerStatus(normalizedValue, range);
    const analysis: MarkerAnalysis = {
      markerId: markerId === "testosterone_total_femme" ? "testosterone_total" : markerId === "magnesium_serum" ? "magnesium" : markerId,
      name: range.name,
      value: normalizedValue,
      unit: range.unit,
      normalRange: `${range.normalMin}-${range.normalMax}`,
      optimalRange: `${range.optimalMin}-${range.optimalMax}`,
      status,
      interpretation: range.context || ""
    };

    analyzedMarkers.push(analysis);

    // Categorize
    if (status === "optimal") {
      optimal.push(range.name);
    } else if (status === "critical") {
      action.push(range.name);
    } else {
      watch.push(range.name);
    }
  }

  // Detect patterns
  const patterns = detectPatterns(analyzedMarkers);

  // Build recommendations from patterns
  const priority1: BloodAnalysisResult["recommendations"]["priority1"] = [];
  const priority2: BloodAnalysisResult["recommendations"]["priority2"] = [];

  for (const pattern of patterns) {
    for (let i = 0; i < pattern.protocol.length; i++) {
      const rec = {
        action: pattern.protocol[i],
        why: `Pattern: ${pattern.name}`
      };

      if (i < 2) {
        priority1.push(rec);
      } else {
        priority2.push(rec);
      }
    }
  }

  // Add follow-up tests
  const followUp: BloodAnalysisResult["followUp"] = [];
  for (const marker of analyzedMarkers) {
    if (marker.status === "critical" || marker.status === "suboptimal") {
      followUp.push({
        test: marker.name,
        delay: "6-8 semaines",
        objective: `Vérifier évolution vers range optimal (${marker.unit})`
      });
    }
  }

  // Generate alerts
  const alerts: string[] = [];
  if (action.length > 0) {
    alerts.push("Consultez un médecin pour les marqueurs critiques");
  }
  if (patterns.some(p => p.name === "Insulin Resistance")) {
    alerts.push("Risque métabolique détecté - consultation recommandée");
  }

  return {
    summary: { optimal, watch, action },
    markers: analyzedMarkers,
    patterns,
    recommendations: { priority1, priority2 },
    followUp,
    alerts
  };
}

// ============================================
// AI-POWERED ANALYSIS
// ============================================

const BLOOD_ANALYSIS_SYSTEM_PROMPT = `Tu es Achzod. Tu es le coach qui a analysé le bilan sanguin du client et tu rédiges un rapport premium en français.

Identité et voix obligatoires:
- Tu parles à la première personne: "j'analyse", "je vois", "je te recommande", "je priorise".
- Tu t'adresses directement au client en tutoiement: "tu", "ton", "tes".
- Interdit: style impersonnel ou clinique à la troisième personne ("le patient", "ce patient", "il présente", "on recommande").
- Interdit: mention d'IA, d'automatisation, de modèle, de prompt ou de génération.

Objectif:
- Donner une lecture exploitable, personnalisée et priorisée du bilan sanguin.
- Relier chaque décision à la performance, la recomposition corporelle, la récupération et le risque cardio-métabolique.
- Orientation du rapport: optimisation performance + recomposition corporelle (anabolisme, lipolyse, maintien masse maigre).
- Utilise le vocabulaire terrain: synthèse protéique, volume tolérable, charge interne, récupération, adhérence.
- Appuie les décisions sur la bibliothèque de connaissances APEXLABS et les sources [SRC:ID] disponibles.

Règles critiques:
- N'invente jamais une valeur, un marqueur, un symptôme, une habitude ou une source.
- Si une donnée manque: écris "Non renseigne", explique l'impact concret et propose le test utile.
- Distingue clairement "normal labo" vs "optimal performance".
- Pas de diagnostic définitif: hypothèses + degré de confiance + tests de confirmation.
- Ne donne pas d'instruction médicamenteuse; renvoie vers avis médical quand nécessaire.
- Quand tu cites un biomarqueur pour la première fois, explique en une phrase ce qu'il mesure et pourquoi il compte.
- Interdiction absolue d'insinuer un usage de stéroïdes, dopage ou substances non renseignées.
- Si une recommandation de niacine est évoquée avec ALT > 40 U/L ou foie en souffrance, impose une progression prudente et une surveillance stricte des transaminases.
- Emoji interdits.

Style de rendu:
- Narratif dense, en phrases complètes et paragraphes consistants.
- Interdiction totale des listes à puces, listes numérotées, checklists et tableaux markdown.
- Chaque recommandation doit être reliée explicitement aux biomarqueurs du client.
- Français irréprochable: accents, cédilles, orthographe et syntaxe soignés.
- IMPORTANT: tu écris en français avec TOUS les accents (é, è, ê, à, ù, ç, ô, î, û), sans exception.
- Exemples obligatoires: métabolique, hépatique, première, détaillé, précisément, récupération, entraînement.
- Evite la répétition: chaque section doit apporter des informations nouvelles et spécifiques.

Sources:
- Tu peux citer des sources uniquement via [SRC:ID] quand l'ID existe dans le contexte fourni.
- Pas d'invention de DOI, épisode, titre ou lien.
- La section "Sources (bibliothèque)" doit lister seulement ce qui est réellement cité.
- Citer le maximum de sources pertinentes disponibles dans le contexte, sans citation artificielle.

Format obligatoire (titres H2 exacts, dans cet ordre):
## Synthèse exécutive
## Qualité des données & limites
## Tableau de bord (scores & priorités)
## Potentiel recomposition (perte de gras + gain de muscle)
## Lecture compartimentée par axes
## Interconnexions majeures (le pattern)
## Deep dive , marqueurs prioritaires
## Plan d'action 90 jours
## Nutrition & entraînement
## Suppléments & stack
## Annexes (références et vigilance)
## Sources (bibliothèque)

Contraintes de qualité:
- Rapport complet et cohérent (en général 16 000 à 35 000 caracteres selon le volume de marqueurs).
- Les 12 sections H2 sont obligatoires, dans l'ordre exact, sans section additionnelle.
- Sections obligatoirement denses:
  - "Lecture compartimentée par axes": longue et détaillée.
  - "Deep dive , marqueurs prioritaires": marqueur par marqueur, concret.
  - "Plan d'action 90 jours": phase par phase avec KPI et conditions de progression.
  - "Nutrition & entraînement" et "Suppléments & stack": protocoles complets reliés aux biomarqueurs.
- Priorise la précision, la clarté et l'actionnabilité.

Réponds uniquement avec le rapport final markdown.`;

type KnowledgeSourceEntry = {
  id: string;
  label: string;
  title: string;
  url?: string;
  category?: string;
};

const SOURCE_ID_REGEX = /\[SRC:([^\]]+)\]/gi;

const extractSourceIds = (text: string): string[] => {
  const ids: string[] = [];
  if (!text) return ids;
  let match: RegExpExecArray | null;
  const regex = new RegExp(SOURCE_ID_REGEX.source, "gi");
  while ((match = regex.exec(text)) !== null) {
    const id = String(match[1] || "").trim();
    if (!id || /^id$/i.test(id)) continue;
    if (!ids.includes(id)) ids.push(id);
  }
  return ids;
};

const sanitizeSourceCitations = (text: string, allowedSourceIds: string[]): string => {
  const allowed = allowedSourceIds.filter((id) => id && !/^id$/i.test(id));
  if (!text) return "";
  if (!allowed.length) {
    return text.replace(SOURCE_ID_REGEX, "").replace(/[ \t]{2,}/g, " ");
  }

  const allowedSet = new Set(allowed);
  const remap = new Map<string, string>();
  let rotate = 0;

  return text.replace(SOURCE_ID_REGEX, (_full, rawId) => {
    const id = String(rawId || "").trim();
    if (!id || /^id$/i.test(id)) return "";
    if (allowedSet.has(id)) return `[SRC:${id}]`;
    if (!remap.has(id)) {
      remap.set(id, allowed[rotate % allowed.length]);
      rotate += 1;
    }
    return `[SRC:${remap.get(id)}]`;
  });
};

const parseKnowledgeSourceCatalog = (knowledgeContext: string): Map<string, KnowledgeSourceEntry> => {
  const catalog = new Map<string, KnowledgeSourceEntry>();
  const lines = String(knowledgeContext || "").split(/\r?\n/);
  let currentId: string | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const srcMatch = line.match(/^\[SRC:([^\]]+)\]\s*(.+?)\s*[,-]\s*(.+)$/i);
    if (srcMatch) {
      const id = srcMatch[1].trim();
      const label = srcMatch[2].trim();
      const title = srcMatch[3].trim();
      if (id) {
        catalog.set(id, { id, label, title });
        currentId = id;
      }
      continue;
    }

    if (!currentId) continue;
    const entry = catalog.get(currentId);
    if (!entry) continue;

    const urlMatch = line.match(/^URL:\s*(.+)$/i);
    if (urlMatch && !entry.url) {
      entry.url = urlMatch[1].trim();
      continue;
    }

    const categoryMatch = line.match(/^Categorie:\s*(.+)$/i);
    if (categoryMatch && !entry.category) {
      entry.category = categoryMatch[1].trim();
    }
  }

  return catalog;
};

const removeSourcesSection = (text: string): string => {
  const start = findSourcesHeadingIndex(text);
  if (start === -1) return text.trim();
  return text.slice(0, start).trim();
};

const buildSourcesSection = (
  usedSourceIds: string[],
  sourceCatalog: Map<string, KnowledgeSourceEntry>,
): string => {
  const lines: string[] = [
    "## Sources (bibliothèque)",
    "Les références ci-dessous correspondent strictement aux citations [SRC:ID] utilisées dans ce rapport.",
  ];

  if (!usedSourceIds.length) {
    lines.push(
      "Aucune citation [SRC:ID] n'a été retenue dans cette version. Une régénération est requise pour produire une traçabilité bibliographique conforme."
    );
    return lines.join("\n");
  }

  for (const id of usedSourceIds) {
    const source = sourceCatalog.get(id);
    if (!source) {
      lines.push(`[SRC:${id}] Source citée dans le rapport mais absente du contexte bibliographique transmis.`);
      continue;
    }
    const mainLine = `[SRC:${id}] ${source.label} , ${source.title}`;
    const extraBits = [source.url ? `URL: ${source.url}` : "", source.category ? `Catégorie: ${source.category}` : ""]
      .filter(Boolean)
      .join(" | ");
    lines.push(extraBits ? `${mainLine}. ${extraBits}.` : `${mainLine}.`);
  }

  return lines.join("\n");
};

const findSourcesHeadingIndex = (text: string): number => {
  const match = /(^|\n)##\s+sources[^\n]*/i.exec(text);
  if (!match) return -1;
  return match.index + (match[1] ? match[1].length : 0);
};

const ensureSourcesSection = (text: string, knowledgeContext?: string): string => {
  if (!text) return "";
  const bodyWithoutSources = removeSourcesSection(text);
  const usedSourceIds = extractSourceIds(bodyWithoutSources);
  const sourceCatalog = parseKnowledgeSourceCatalog(knowledgeContext || "");
  const sourcesSection = buildSourcesSection(usedSourceIds, sourceCatalog);
  return `${bodyWithoutSources}\n\n${sourcesSection}`.trim();
};

const stripEmojis = (text: string): string => {
  if (!text) return "";
  return text.replace(/[\p{Extended_Pictographic}\uFE0F]/gu, "");
};

const extractPlan90Section = (text: string): string => {
  if (!text) return "";
  const match = /(^|\n)##\s+Plan(?: d'action)? 90 jours[^\n]*/i.exec(text);
  if (!match) return "";
  const start = match.index + (match[1] ? match[1].length : 0);
  const rest = text.slice(start);
  const nextHeadingIndex = rest.slice(1).search(/\n##\s+/);
  if (nextHeadingIndex !== -1) {
    return rest.slice(0, nextHeadingIndex + 1).trim();
  }
  return rest.trim();
};

const insertPlan90Section = (text: string, planSection: string): string => {
  if (!text) return planSection.trim();
  if (!planSection) return text.trim();
  if (/(^|\n)##\s+Plan(?: d'action)? 90 jours/i.test(text)) return text.trim();

  const anchors = [
    "## Nutrition & entrainement",
    "## Nutrition & entraînement",
    "## Supplements & stack",
    "## Suppléments & stack",
    "## Sources scientifiques",
    "## Sources (bibliotheque)",
    "## Sources (bibliothèque)",
  ];
  for (const anchor of anchors) {
    const idx = text.indexOf(anchor);
    if (idx !== -1) {
      const head = text.slice(0, idx).trim();
      const tail = text.slice(idx).trim();
      return `${head}\n\n${planSection.trim()}\n\n${tail}`.trim();
    }
  }
  return `${text.trim()}\n\n${planSection.trim()}`.trim();
};

const trimAiAnalysis = (text: string, maxChars = 180000): string => {
  if (!text) return "";
  const cleaned = normalizeFrenchTypography(stripEmojis(text).trim());
  if (cleaned.length <= maxChars) return cleaned;
  const sourcesIndex = findSourcesHeadingIndex(cleaned);
  const planMatchIndex = /(^|\n)##\s+Plan(?: d'action)? 90 jours/i.exec(cleaned);
  const planIndex = planMatchIndex ? planMatchIndex.index + (planMatchIndex[1] ? planMatchIndex[1].length : 0) : -1;
  const sources = sourcesIndex !== -1 ? cleaned.slice(sourcesIndex).trim() : "";
  const plan = planIndex !== -1 ? extractPlan90Section(cleaned) : "";

  if (sources || plan) {
    const reserveSections = [plan, sources].filter(Boolean);
    const reserveLen =
      reserveSections.reduce((sum, section) => sum + section.length, 0) +
      (reserveSections.length > 0 ? (reserveSections.length - 1) * 2 : 0);
    const keepBudget = maxChars - reserveLen - 2;

    if (keepBudget > 1000) {
      let headEnd = keepBudget;
      const cutPoints = [planIndex, sourcesIndex].filter((idx) => idx !== -1);
      if (cutPoints.length > 0) {
        headEnd = Math.min(headEnd, ...cutPoints);
      }
      const head = cleaned.slice(0, headEnd);
      const lastBreak = head.lastIndexOf("\n\n");
      const safeHead = lastBreak > 1000 ? head.slice(0, lastBreak).trim() : head.trim();
      return stripEmojis([safeHead, plan, sources].filter(Boolean).join("\n\n")).trim();
    }
  }
  const sliced = cleaned.slice(0, maxChars);
  const lastBreak = sliced.lastIndexOf("\n\n");
  if (lastBreak > 1000) {
    return stripEmojis(sliced.slice(0, lastBreak)).trim();
  }
  return stripEmojis(sliced).trim();
};

export function buildFallbackAnalysis(
  analysisResult: BloodAnalysisResult,
  userProfile: {
    gender: "homme" | "femme";
    age?: string;
    objectives?: string;
    medications?: string;
    sleepHours?: number;
    trainingHours?: number;
    calorieDeficit?: number;
    alcoholWeekly?: number;
    stressLevel?: number;
    poids?: number;
    taille?: number;
    fastingHours?: number;
    drawTime?: string;
    lastTraining?: string;
    alcoholLast72h?: string;
    nutritionPhase?: string;
    supplementsUsed?: string[];
    infectionRecent?: string;
  },
  knowledgeContext?: string
): string {
  const formatList = (items: string[], emptyLabel: string) =>
    items.length ? items.map((item) => `- ${item}`).join("\n") : `- ${emptyLabel}`;

  const formatMarkerTable = (markers: MarkerAnalysis[]): string => {
    if (!markers.length) return "Aucun marqueur disponible pour cet axe.";
    return markers
      .map((m) => {
        const statusLabel = m.status === "critical" ? "CRITIQUE" : m.status === "suboptimal" ? "IMPORTANT" : m.status === "optimal" ? "OPTIMAL" : "NORMAL";
        return `| ${m.name} | ${m.value} ${m.unit || ""} | ${m.normalRange || "-"} | ${m.optimalRange || "-"} | ${statusLabel} |`;
      })
      .join("\n");
  };

  const summary = analysisResult.summary;
  const critical = analysisResult.markers.filter((m) => m.status === "critical");
  const suboptimal = analysisResult.markers.filter((m) => m.status === "suboptimal");
  const optimal = analysisResult.markers.filter((m) => m.status === "optimal");
  const priority1 = analysisResult.recommendations.priority1.map((rec) => rec.action);
  const priority2 = analysisResult.recommendations.priority2.map((rec) => rec.action);
  const followUp = analysisResult.followUp.map(
    (item) => `- ${item.test}: ${item.delay} - ${item.objective}`
  );
  const alerts = analysisResult.alerts.map((alert) => `- ${alert}`);
  const correlations = buildLifestyleCorrelations(analysisResult.markers, userProfile);
  const correlationLines = correlations.length
    ? correlations.map(
        (item) => `- **${item.factor}** (${item.current}): ${item.impact}\n  → Action: ${item.recommendation}`
      )
    : ["- Donnees lifestyle insuffisantes pour calculer des correlations."];

  // Group markers by axis
  const axisMarkers = {
    hormonal: analysisResult.markers.filter((m) =>
      ["testosterone_total", "testosterone_libre", "shbg", "estradiol", "lh", "fsh", "prolactine", "dhea_s", "igf1"].includes(m.markerId)
    ),
    metabolique: analysisResult.markers.filter((m) =>
      ["glycemie_jeun", "hba1c", "insuline_jeun", "homa_ir", "triglycerides", "acide_urique"].includes(m.markerId)
    ),
    lipidique: analysisResult.markers.filter((m) =>
      ["cholesterol_total", "hdl", "ldl", "triglycerides", "apob", "lpa"].includes(m.markerId)
    ),
    thyroide: analysisResult.markers.filter((m) =>
      ["tsh", "t4_libre", "t3_libre", "t3_reverse", "anti_tpo"].includes(m.markerId)
    ),
    hepatique: analysisResult.markers.filter((m) =>
      ["alt", "ast", "ggt", "bilirubine", "albumine", "phosphatases_alcalines"].includes(m.markerId)
    ),
    renal: analysisResult.markers.filter((m) =>
      ["creatinine", "uree", "egfr", "acide_urique", "cystatine_c"].includes(m.markerId)
    ),
    inflammation: analysisResult.markers.filter((m) =>
      ["crp_us", "homocysteine", "fibrinogene", "ferritine", "vs"].includes(m.markerId)
    ),
    hematologie: analysisResult.markers.filter((m) =>
      ["hemoglobine", "hematocrite", "vgm", "tcmh", "plaquettes", "globules_blancs"].includes(m.markerId)
    ),
    micronutriments: analysisResult.markers.filter((m) =>
      ["vitamine_d", "b12", "folate", "fer_serique", "ferritine", "transferrine_sat", "zinc", "magnesium_rbc", "selenium"].includes(m.markerId)
    ),
    electrolytes: analysisResult.markers.filter((m) =>
      ["sodium", "potassium", "chlore", "calcium", "phosphore", "magnesium"].includes(m.markerId)
    ),
    stress: analysisResult.markers.filter((m) =>
      ["cortisol", "dhea_s"].includes(m.markerId)
    ),
  };

  const sections: string[] = [];
  const profileLabel = `${userProfile.gender}${userProfile.age ? ` (${userProfile.age} ans)` : ""}`;
  const statusPoints: Record<MarkerAnalysis["status"], number> = {
    optimal: 100,
    normal: 80,
    suboptimal: 45,
    critical: 20,
  };
  const scoreFromMarkers = (markers: MarkerAnalysis[]) =>
    markers.length
      ? Math.round(
          markers.reduce((sum, marker) => sum + statusPoints[marker.status], 0) /
            markers.length /
            10
        )
      : null;
  const statusToPriority = (status: MarkerAnalysis["status"]) =>
    status === "critical" ? "CRITIQUE" : status === "suboptimal" ? "IMPORTANT" : status === "normal" ? "SURVEILLANCE" : "OPTIMISATION";

  const testedIds = new Set(analysisResult.markers.map((m) => m.markerId));
  const criticalMissing = [
    "apob",
    "insuline_jeun",
    "homa_ir",
    "hba1c",
    "testosterone_total",
    "cortisol",
    "tsh",
    "t3_libre",
    "vitamine_d",
  ].filter(
    (id) => !testedIds.has(id)
  );
  const criticalMissingLabels = criticalMissing.map((id) => id.replace(/_/g, " ").toUpperCase());
  const dashboardAxes: Array<{ label: string; markers: MarkerAnalysis[] }> = [
    { label: "Hormonal", markers: axisMarkers.hormonal },
    { label: "Metabolique", markers: axisMarkers.metabolique },
    { label: "Lipidique", markers: axisMarkers.lipidique },
    { label: "Thyroidien", markers: axisMarkers.thyroide },
    { label: "Inflammation", markers: axisMarkers.inflammation },
    { label: "Micronutriments", markers: axisMarkers.micronutriments },
    { label: "Foie/Rein", markers: [...axisMarkers.hepatique, ...axisMarkers.renal] },
    { label: "Stress/Recuperation", markers: axisMarkers.stress },
  ];
  const topPriorityMarkers = [...critical, ...suboptimal].slice(0, 12);
  const parseRangeBounds = (rangeText?: string): { min: number | null; max: number | null } => {
    if (!rangeText) return { min: null, max: null };
    const nums = String(rangeText).match(/-?\d+(?:\.\d+)?/g) || [];
    if (!nums.length) return { min: null, max: null };
    if (nums.length === 1) {
      const value = Number(nums[0]);
      return Number.isFinite(value) ? { min: value, max: value } : { min: null, max: null };
    }
    const min = Number(nums[0]);
    const max = Number(nums[1]);
    return Number.isFinite(min) && Number.isFinite(max) ? { min, max } : { min: null, max: null };
  };
  const getMarkerDirection = (marker: MarkerAnalysis): "high" | "low" | "in-range" => {
    const bounds = parseRangeBounds(marker.normalRange);
    if (bounds.min == null || bounds.max == null) return "in-range";
    if (marker.value < bounds.min) return "low";
    if (marker.value > bounds.max) return "high";
    return "in-range";
  };
  const buildDeepDiveNarrative = (marker: MarkerAnalysis) => {
    const direction = getMarkerDirection(marker);
    const panel = getMarkerPanelName(marker.markerId, marker.category).toLowerCase();
    const lipidMissing = ["apob", "hba1c", "insuline_jeun", "homa_ir"].filter((id) => !testedIds.has(id));
    const generic = {
      clinical: `Le signal ${statusToPriority(marker.status).toLowerCase()} sur ${marker.name} indique un axe ${panel} insuffisamment stabilise.`,
      performance:
        "Ce profil peut freiner la recuperation, limiter la progression en recomposition et augmenter le cout physiologique de chaque cycle d'entrainement.",
      causes:
        "charge d'entrainement mal periodisee, sommeil/stress insuffisamment controles, strategie nutritionnelle non alignee sur les biomarqueurs, facteurs individuels ou contextuels de prelevement.",
      confounders:
        "heure de prelevement, entrainement intense dans les 48h, alcool recent, etat infectieux ou inflammatoire transitoire, informations lifestyle incomplètes.",
      actions:
        "prioriser d'abord les fondamentaux (sommeil, regularite alimentaire, charge d'entrainement soutenable), puis introduire des corrections ciblees avant retest standardise.",
      tests:
        "retest du marqueur a J+60/J+90 dans les memes conditions, et panel complementaire de l'axe pour confirmer le mecanisme dominant.",
    };

    if (marker.markerId === "hdl" && direction === "low") {
      return {
        clinical:
          "HDL tres bas: le transport reverse du cholesterol est probablement insuffisant, ce qui renforce le profil atherogene dans ce contexte.",
        performance:
          "Un HDL aussi bas est frequemment associe a une flexibilite metabolique reduite et a une recuperation cardio-metabolique moins efficace.",
        causes:
          "resistance a l'insuline sous-jacente, volume cardio zone 2 insuffisant, apport trop faible en graisses mono/polyinsaturees, genetique lipidique défavorable.",
        confounders:
          "alcool recemment augmente, variation du poids recente, phase de seche agressive, manque d'information precise sur nutrition et activite aerobie.",
        actions:
          "placer le cardio zone 2 comme priorite (150-210 min/semaine), augmenter EPA/DHA, renforcer fibres solubles et qualite lipidique alimentaire, supprimer les pics glycemiques repetes.",
        tests:
          `ajouter ApoB, non-HDL, insuline a jeun, HOMA-IR et HbA1c pour confirmer le pattern metabolique${lipidMissing.length ? ` (manquants: ${lipidMissing.join(", ")})` : ""}.`,
      };
    }

    if (marker.markerId === "ldl" && direction === "high") {
      return {
        clinical:
          "LDL eleve: charge particulaire probablement excessive, a interpreter en priorite avec ApoB pour estimer le risque atherogene reel.",
        performance:
          "Ce profil est compatible avec une contrainte cardio-metabolique qui peut limiter la capacite a soutenir des blocs de progression longs.",
        causes:
          "combinaison possible de genetique lipidique, insulinorésistance, apport en graisses saturees non periodise, et faible apport en fibres visqueuses.",
        confounders:
          "phase calorique recente, perte de poids rapide, variabilite du jeûne, absence d'ApoB pour quantifier la densite particulaire.",
        actions:
          "prioriser la baisse d'ApoB via nutrition ciblee (fibres solubles, qualite lipidique), gestion glycemique et augmentation progressive du volume aerobie.",
        tests:
          `ajouter ApoB en priorite absolue, non-HDL, Lp(a) si absent et bilan glycémique complet${lipidMissing.length ? ` (manquants: ${lipidMissing.join(", ")})` : ""}.`,
      };
    }

    if (marker.markerId === "triglycerides" && direction === "high") {
      return {
        clinical:
          "Triglycerides eleves: signature frequente d'un exces de flux glucido-hepatique et d'une sensibilite a l'insuline insuffisante.",
        performance:
          "Ce pattern penalise la flexibilite energetique, augmente la fatigue post-prandiale et rend la recomposition moins efficiente.",
        causes:
          "charge glucidique mal synchronisee, alcool, faible depense aerobie, sommeil court/stress chronique, resistance a l'insuline non objectivée.",
        confounders:
          "repas riche en glucides/alcool avant la prise de sang, jeûne incomplet, entrainement tardif la veille.",
        actions:
          "cibler d'abord la baisse des TG: suppression alcool, reduction sucres rapides hors peri-training, EPA haute dose et marche post-prandiale systématique.",
        tests:
          `objectiver le mecanisme avec insuline a jeun, HOMA-IR, HbA1c et ApoB${lipidMissing.length ? ` (manquants: ${lipidMissing.join(", ")})` : ""}.`,
      };
    }

    if ((marker.markerId === "apoa1" || marker.markerId === "apo_a1") && direction === "low") {
      return {
        clinical:
          "ApoA1 bas: capacite de transport anti-atherogene reduite, coherent avec un terrain lipidique a renforcer.",
        performance:
          "La dynamique lipidique devient moins favorable a une progression durable lorsque ApoA1 reste bas en contexte de HDL bas.",
        causes:
          "profil insulinorésistant, faible activite aerobie reguliere, qualite lipidique alimentaire insuffisante, variabilite genetique.",
        confounders:
          "contexte nutritionnel recent et absence de mesures complementaires (ApoB, non-HDL).",
        actions:
          "reconstruire la base metabolique: zone 2, qualite des lipides, fibres, perte de gras visceral progressive si necessaire.",
        tests: "associer ApoA1 au suivi ApoB/non-HDL pour piloter le risque residuel de facon exploitable.",
      };
    }

    if (marker.markerId === "alt" && direction === "high") {
      return {
        clinical:
          "ALT elevee: signal hepatique compatible avec surcharge metabolique, stress hepatocellulaire ou recuperation insuffisante.",
        performance:
          "Un foie sous contrainte reduit la tolerance a la charge d'entrainement et la capacite a periodiser nutrition/supplementation proprement.",
        causes:
          "exces energetique chronique, alcool, surcharge training, medicaments/supplements hepatotoxiques, stéatose debutante.",
        confounders: "entrainement lourd dans les 24-48h, alcool recent, medicaments ponctuels, infection virale recente.",
        actions:
          "reduire les stresseurs hepatiques, periodiser la charge, renforcer hygiene metabolique et verifier la tendance AST/GGT au retest.",
        tests: "completer avec AST, GGT, bilan hepatique complet et imagerie si persistance au-dessus de l'optimal.",
      };
    }

    if (marker.markerId === "ferritine" && direction === "high") {
      return {
        clinical:
          "Ferritine haute hors cible optimale: peut refleter surcharge en fer, inflammation de bas grade ou simple reponse de phase aiguë.",
        performance:
          "Ce terrain peut coexister avec fatigue, recuperation fluctuante et contraintes oxydatives qui freinent la progression.",
        causes:
          "reserve en fer elevee, inflammation silencieuse, syndrome metabolique debutant, contexte infectieux ou inflammatoire recent.",
        confounders:
          "etat infectieux recent, exercice intense prelevement, absence de CRP/homocysteine/transferrine pour trancher le mecanisme.",
        actions:
          "interpreter ferritine avec le reste du panel inflammatoire/metabolique, corriger le contexte avant toute decision agressive.",
        tests: "ajouter transferrine, saturation transferrine, CRP-us/homocysteine et retest hors contexte inflammatoire aigu.",
      };
    }

    return generic;
  };

  sections.push("## Synthese executive\n");
  sections.push(`Profil ${profileLabel} avec ${analysisResult.markers.length} biomarqueur(s) interprete(s).`);
  sections.push(
    `Triage actuel: ${critical.length} critique(s), ${suboptimal.length} important(s), ${analysisResult.markers.filter((m) => m.status === "normal").length} en surveillance, ${optimal.length} optimal(aux).`
  );
  sections.push(
    `${critical.length ? `Goulot principal: ${critical[0].name}.` : "Pas de signal d'urgence immediate."} ${
      suboptimal.length ? `Levier secondaire: ${suboptimal[0].name}.` : "Objectif principal: consolider les acquis actuels."
    }`
  );
  sections.push("### Priorites immediates");
  sections.push(
    formatList(
      [...critical, ...suboptimal].slice(0, 6).map(
        (marker) =>
          `[${statusToPriority(marker.status)}] ${marker.name} (${marker.value} ${marker.unit || ""}) -> cible ${marker.optimalRange || "zone optimale"}`
      ),
      "Aucune alerte majeure."
    )
  );
  sections.push("### Opportunites performance");
  sections.push(
    formatList(
      [
        "Stabiliser le sommeil et l'heure de coucher pour consolider l'axe hormonal/metabolique.",
        "Structurer l'alimentation autour des repas d'entrainement pour lisser glycemie et recuperation.",
        "Programmer un retest propre pour objectiver la progression dans 8-12 semaines.",
      ],
      "Maintenir les routines actuelles."
    )
  );
  sections.push("### Lecture systemique (leviers 80/20)");
  sections.push(
    formatList(
      topPriorityMarkers.slice(0, 8).map(
        (marker) =>
          `${marker.name}: signal ${statusToPriority(marker.status)} (${marker.value} ${marker.unit || ""}) avec impact direct probable sur ${getMarkerPanelName(
            marker.markerId,
            marker.category
          ).toLowerCase()}, recuperation et progression training.`
      ),
      "Panel globalement stable, strategie = consolidation des habitudes."
    )
  );
  sections.push("### Sequencement recommande (90 jours)");
  sections.push("- Etape 1: stabiliser le contexte (sommeil, horaires repas, hydratation, charge de training).");
  sections.push("- Etape 2: corriger les marqueurs critiques puis les marqueurs suboptimaux les plus impactants.");
  sections.push("- Etape 3: monter la charge de progression uniquement quand les signaux biologiques se normalisent.");
  sections.push("- Etape 4: valider objectivement par retest standardise et ajuster sans improvisation.");

  sections.push("\n## Qualite des donnees & limites\n");
  sections.push(`- Marqueurs interpretes: ${analysisResult.markers.length}`);
  sections.push(`- Patterns detectes: ${analysisResult.patterns.length}`);
  sections.push(
    `- Niveau de confiance: ${
      analysisResult.markers.length >= 15 ? "eleve" : analysisResult.markers.length >= 9 ? "moyen" : "modere (panel incomplet)"
    }`
  );
  sections.push("- Conditions de prelevement recommandees: matin, a jeun 10-12h, sans sport intense 24-48h avant, alcool evite 72h, hydratation stable.");
  sections.push(
    criticalMissingLabels.length
      ? `- Limite principale: ${criticalMissingLabels.length} marqueur(s) cle(s) manquant(s): ${criticalMissingLabels.join(", ")}.`
      : "- Limite principale: manque d'informations lifestyle pour expliquer certains patterns (sommeil, stress, charge d'entrainement)."
  );
  sections.push("### Couverture par axe");
  dashboardAxes.forEach((axis) => {
    const axisScore = scoreFromMarkers(axis.markers);
    if (!axis.markers.length) {
      sections.push(`- ${axis.label}: Non renseigne (score indisponible).`);
      return;
    }
    const axisCritical = axis.markers.filter((marker) => marker.status === "critical").length;
    const axisSuboptimal = axis.markers.filter((marker) => marker.status === "suboptimal").length;
    sections.push(
      `- ${axis.label}: ${axis.markers.length} marqueur(s), score estime ${axisScore ?? "N/A"}/10, ${axisCritical} critique(s), ${axisSuboptimal} important(s).`
    );
  });
  sections.push("### Facteurs confondants a controler");
  sections.push(`- Heure de prelevement: ${userProfile.drawTime || "Non renseigne"} | Jeune: ${userProfile.fastingHours ?? "Non renseigne"} h.`);
  sections.push(`- Dernier entrainement: ${userProfile.lastTraining || "Non renseigne"} | Alcool 72h: ${userProfile.alcoholLast72h || "Non renseigne"}.`);
  sections.push(`- Sommeil moyen: ${userProfile.sleepHours ?? "Non renseigne"} h | Stress: ${userProfile.stressLevel ?? "Non renseigne"}/10.`);
  sections.push(
    "- Si ces conditions ne sont pas stables, la comparaison inter-bilans peut etre biaisee (faux positifs/faux negatifs sur inflammation, glycemie, enzymes, cortisol)."
  );
  sections.push("### Impact decisionnel des limites");
  sections.push(
    "- Sans couverture complete, on pilote en mode prudent: prioriser les actions peu risquées et fort ROI, puis confirmer par tests cibles avant d'intensifier."
  );
  sections.push(
    "- Les hypotheses mecanistiques doivent rester hypotheses tant qu'elles ne sont pas validees par retest + contexte lifestyle propre."
  );

  sections.push("\n## Donnees & tests complementaires\n");
  sections.push("### Tests prioritaires a ajouter");
  sections.push(criticalMissingLabels.length ? criticalMissingLabels.map((label) => `- ${label}`).join("\n") : "- Panel deja complet sur les marqueurs critiques.");
  sections.push("### Retest & conditions de prelevement");
  sections.push(followUp.length ? followUp.join("\n") : "- Aucun retest supplementaire requis pour l'instant.");

  sections.push("\n## Tableau de bord (scores & priorites)\n");
  sections.push(`- Priorites critiques: ${critical.length}`);
  sections.push(`- Priorites importantes: ${suboptimal.length}`);
  sections.push(`- Quick wins exploitables: ${Math.max(1, Math.min(6, analysisResult.markers.length - critical.length))}`);
  sections.push("### Scoreboard systemique");
  sections.push("| Axe | Couverture | Score estime | Signal dominant |");
  sections.push("|---|---:|---:|---|");
  dashboardAxes.forEach((axis) => {
    const axisScore = scoreFromMarkers(axis.markers);
    const axisCritical = axis.markers.filter((marker) => marker.status === "critical").length;
    const axisSuboptimal = axis.markers.filter((marker) => marker.status === "suboptimal").length;
    const dominantSignal = axisCritical
      ? `${axisCritical} critique(s)`
      : axisSuboptimal
      ? `${axisSuboptimal} important(s)`
      : axis.markers.length
      ? "stabilite relative"
      : "donnees manquantes";
    sections.push(`| ${axis.label} | ${axis.markers.length} | ${axisScore ?? "N/A"} | ${dominantSignal} |`);
  });
  sections.push("### TOP priorites");
  sections.push(
    formatList(
      [...critical, ...suboptimal].slice(0, 6).map((marker) => `${marker.name}: corriger vers ${marker.optimalRange}`),
      "Aucune alerte majeure, focus consolidation."
    )
  );
  sections.push("### TOP quick wins");
  sections.push(
    formatList(
      [
        "Marches post-prandiales 10-15 min apres les repas principaux.",
        "Timing glucidique centre autour des seances les plus intenses.",
        "Rituel sommeil fixe (heure de coucher/reveil stables 7j/7).",
        "Hydratation/electrolytes ajustes selon charge d'entrainement.",
      ],
      "Maintenir le cap."
    )
  );
  sections.push("### KPI de pilotage");
  sections.push("- Hebdo: adherence sommeil/nutrition/training, energie, digestion, qualite de recuperation.");
  sections.push("- Mensuel: tendance poids/tour de taille, progression charge utile, tolerance volume.");
  sections.push("- Biologique: retest J+60/J+90 des marqueurs prioritaires avec meme protocole de prelevement.");
  sections.push("- Criteres d'escalade medicale: persistance de signaux critiques malgre adherence solide.");

  sections.push("\n## Potentiel recomposition (perte de gras + gain de muscle)\n");
  sections.push(
    `Ton potentiel de recomposition depend surtout de ${summary.action[0] || "la qualite metabolique globale"}. Avec ${critical.length} signal(s) critique(s) et ${suboptimal.length} point(s) important(s), l'ordre logique est de corriger d'abord les freins biologiques, puis d'augmenter progressivement la charge de training.`
  );
  sections.push(
    `Concretement, si tu deplaces ${[...critical, ...suboptimal].slice(0, 2).map((m) => m.name).join(" + ") || "les marqueurs dominants"} vers leur zone optimale, tu facilites la perte de gras, la recuperation et la progression en force/hypertrophie.`
  );
  sections.push("Les 3 leviers qui debloquent le plus vite: sommeil regularise, nutrition periodisee, retest objectif sur les biomarqueurs prioritaires.");
  sections.push("### Freins biologiques dominants");
  sections.push(
    formatList(
      topPriorityMarkers.slice(0, 6).map(
        (marker) =>
          `${marker.name}: frein ${statusToPriority(marker.status)} sur la capacite a tenir volume d'entrainement, recuperer proprement et maintenir un deficit soutenable.`
      ),
      "Aucun frein majeur identifie."
    )
  );
  sections.push("### Conditions de progression");
  sections.push("- Tu augmentes volume/intensite uniquement si sommeil + energie + recuperation restent stables sur 2-3 semaines.");
  sections.push("- Tu ajustes les calories par petits pas (pas de cuts agressifs) pour proteger thyroide, hormones et adherence.");
  sections.push("- Tu valides les gains de strategie sur marqueurs + performance, jamais sur le ressenti seul.");

  sections.push("\n## Lecture compartimentee par axes\n");
  const axisConfig: Array<{
    key: string;
    title: string;
    markers: MarkerAnalysis[];
    actions: string[];
    missingTests: string[];
  }> = [
    {
      key: "hormonal",
      title: "Axe 1 , Potentiel musculaire & androgenes",
      markers: axisMarkers.hormonal,
      actions: [
        "Stabiliser sommeil, lipides alimentaires essentiels et surcharge mentale.",
        "Eviter les deficits caloriques trop agressifs sur plusieurs semaines.",
      ],
      missingTests: ["Testosterone totale", "SHBG", "LH", "FSH"],
    },
    {
      key: "metabolique",
      title: "Axe 2 , Metabolisme & gestion du risque diabete",
      markers: axisMarkers.metabolique,
      actions: [
        "Prioriser fibres + proteines avant glucides rapides.",
        "Ajouter NEAT quotidien et zone 2 pour améliorer la flexibilite metabolique.",
      ],
      missingTests: ["HbA1c", "Insuline a jeun", "HOMA-IR"],
    },
    {
      key: "lipidique",
      title: "Axe 3 , Lipides & risque cardio-metabolique",
      markers: axisMarkers.lipidique,
      actions: [
        "Qualite lipidique alimentaire + baisse sucres/alcool si necessaire.",
        "Suivi cardio-preventif si marqueurs atherogenes eleves.",
      ],
      missingTests: ["ApoB", "Non-HDL", "Imagerie vasculaire si contexte a risque"],
    },
    {
      key: "thyroide",
      title: "Axe 4 , Thyroide & depense energetique",
      markers: axisMarkers.thyroide,
      actions: [
        "Eviter les seches prolongées trop basses en glucides/calories.",
        "Retester avec FT3/FT4 complets en cas de plateau metabolique.",
      ],
      missingTests: ["FT3", "rT3", "Anti-TPO"],
    },
    {
      key: "hepatique",
      title: "Axe 5 , Foie, bile & detox metabolique",
      markers: axisMarkers.hepatique,
      actions: [
        "Reduire l'alcool et la charge inflammatoire alimentaire.",
        "Ajuster volume d'entrainement si enzymes hepatiques sensibles.",
      ],
      missingTests: ["Bilirubine", "ALP", "ApoB"],
    },
    {
      key: "renal",
      title: "Axe 6 , Rein, hydratation & performance",
      markers: axisMarkers.renal,
      actions: [
        "Hydratation structuree + sodium/potassium adaptes a la transpiration.",
        "Retest avec conditions stables si creatinine/eGFR discutables.",
      ],
      missingTests: ["Uree/BUN", "Cystatine C"],
    },
    {
      key: "inflammation",
      title: "Axe 7 , Inflammation, immunite & terrain",
      markers: axisMarkers.inflammation,
      actions: [
        "Regulariser recuperation, sommeil et charge d'entrainement.",
        "Approche anti-inflammatoire nutritionnelle progressive.",
      ],
      missingTests: ["NFS complete", "CRP-us de controle"],
    },
    {
      key: "hematologie",
      title: "Axe 8 , Hematologie, oxygenation & endurance",
      markers: axisMarkers.hematologie,
      actions: ["Verifier statut fer/B12/folates si fatigue/performance en baisse."],
      missingTests: ["Hemoglobine", "Hematocrite", "VGM", "RDW"],
    },
    {
      key: "micronutriments",
      title: "Axe 9 , Micronutriments (vitamines & mineraux)",
      markers: axisMarkers.micronutriments,
      actions: [
        "Corriger d'abord vitamine D, B12, magnesium/zinc selon panel disponible.",
        "Prioriser alimentation dense + supplementation ciblee.",
      ],
      missingTests: ["Magnesium RBC", "Zinc", "Folate"],
    },
    {
      key: "electrolytes",
      title: "Axe 10 , Electrolytes, crampes, pression & performance",
      markers: axisMarkers.electrolytes,
      actions: ["Calibrer sodium/potassium selon transpiration et volume de training."],
      missingTests: ["Sodium", "Potassium", "Calcium", "Chlore"],
    },
    {
      key: "stress",
      title: "Axe 11 , Stress, sommeil, recuperation",
      markers: axisMarkers.stress,
      actions: [
        "Routines anti-stress (respiration, NSDR, marche basse intensite).",
        "Deload strategique si fatigue persistante.",
      ],
      missingTests: ["Cortisol matinal", "DHEA-S"],
    },
  ];

  for (const axis of axisConfig) {
    sections.push(`### ${axis.title}`);
    if (!axis.markers.length) {
      sections.push("Verdict: Non renseigne sur cet axe avec les donnees actuelles.");
      sections.push("Lecture impact:");
      sections.push(
        "- Sans ce bloc de donnees, impossible de quantifier proprement la part de cet axe dans la fatigue, la recomposition ou la recuperation."
      );
      sections.push("Tests/data a ajouter:");
      sections.push(formatList(axis.missingTests, "Aucun test complementaire specifique."));
      sections.push("");
      continue;
    }

    const axisCritical = axis.markers.filter((m) => m.status === "critical").length;
    const axisSuboptimal = axis.markers.filter((m) => m.status === "suboptimal").length;
    const axisNormal = axis.markers.filter((m) => m.status === "normal").length;
    const axisScore = scoreFromMarkers(axis.markers);
    sections.push(`Score axe: ${axisScore ?? "N/A"}/10`);
    sections.push("Marqueurs disponibles:");
    sections.push("| Marqueur | Valeur | Range labo | Range optimal | Statut |");
    sections.push("|---|---|---|---|---|");
    sections.push(formatMarkerTable(axis.markers));
    sections.push("");
    const flaggedMarkers = axis.markers.filter((marker) => marker.status === "critical" || marker.status === "suboptimal");
    sections.push("Lecture clinique:");
    sections.push(
      axisCritical > 0
        ? `- ${axisCritical} marqueur(s) critique(s) exigent une action prioritaire sur cet axe.`
        : axisSuboptimal > 0
        ? `- ${axisSuboptimal} marqueur(s) important(s) montrent un axe perfectible mais recuperable.`
        : axisNormal > 0
        ? "- Axe globalement stable, mais encore perfectible pour la performance."
        : "- Axe solide et proche de l'optimal."
    );
    sections.push(
      `- Marqueurs dominants: ${
        flaggedMarkers.length
          ? flaggedMarkers
              .slice(0, 3)
              .map((marker) => `${marker.name} (${marker.value} ${marker.unit || ""}, ${statusToPriority(marker.status)})`)
              .join(" | ")
          : "Aucun signal hors cible significatif sur cet axe"
      }.`
    );
    sections.push("Lecture performance/bodybuilding:");
    sections.push(
      "- Tant que les marqueurs de cet axe restent hors cible, progression en force, composition corporelle et recuperation restent sous-optimales."
    );
    sections.push(
      "- Objectif de cycle: deplacer d'abord les marqueurs critiques vers la zone normale, puis vers la zone optimale sur 60-90 jours."
    );
    sections.push("Actions prioritaires (ordre d'execution):");
    sections.push(
      formatList(
        [
          ...axis.actions,
          "Standardiser le contexte de prelevement (matin, a jeun, repos) pour comparer des valeurs propres.",
          "Mettre en place un suivi hebdo simple: sommeil, energie, perf training, adherence nutrition.",
        ],
        "Maintien du protocole actuel."
      )
    );
    sections.push("KPI de suivi sur 90 jours:");
    sections.push(
      formatList(
        [
          "KPI biologique: progression des marqueurs de cet axe vers la zone optimale.",
          "KPI performance: charge utile, volume tolerable, qualite de recuperation.",
          "KPI adherence: execution nutrition/sommeil/entrainement >= 80% sur 4 semaines glissantes.",
        ],
        "Aucun KPI specifique."
      )
    );
    sections.push("Tests/data a ajouter:");
    sections.push(formatList(axis.missingTests.filter((test) => !testedIds.has(normalizeMarkerName(test))), "Panel deja couvrant pour cet axe."));
    sections.push("");
  }

  const priorityMarkers = topPriorityMarkers;
  sections.push("## Deep dive , marqueurs prioritaires\n");
  if (!priorityMarkers.length) {
    sections.push("Aucun marqueur hors zone optimale majeure sur ce bilan.");
  } else {
    for (const marker of priorityMarkers) {
      const narrative = buildDeepDiveNarrative(marker);
      sections.push(`### ${marker.name}`);
      sections.push(`- Priorite: ${statusToPriority(marker.status)}`);
      sections.push(`- Valeur: ${marker.value} ${marker.unit || ""} | Range labo: ${marker.normalRange || "N/A"} | Range optimal: ${marker.optimalRange || "N/A"}`);
      sections.push(`- Lecture clinique: ${narrative.clinical}`);
      sections.push(`- Lecture performance/bodybuilding: ${narrative.performance}`);
      sections.push(`- Causes plausibles (ordre de probabilite): ${narrative.causes}`);
      sections.push(`- Facteurs confondants: ${narrative.confounders}`);
      sections.push(`- Plan d'action cible: ${narrative.actions}`);
      sections.push("- Execution pratique hebdo: suivi ecrit sommeil/hydratation/nutrition/charge pour relier chaque ajustement a un signal mesurable.");
      sections.push("- Cible a 90 jours: sortir de la zone critique/suboptimale et stabiliser au minimum dans la zone normale.");
      sections.push("- Jalons intermediaires: J+14 adherence, J+30 tendance clinique/performance, J+60 pre-retest.");
      sections.push("- Signal d'alerte: absence de progression + fatigue accrue + baisse performance = reevaluer charge et contexte.");
      sections.push("- Strategie d'ajustement: modifier une variable a la fois (nutrition, training, recuperation) pour garder un signal interpretable.");
      sections.push("- Checklist actionnable: 1 variable prioritaire/semaine, suivi ecrit, revue hebdo objective, decision basee sur tendance et non sur un seul jour.");
      sections.push(`- Tests/data a ajouter: ${narrative.tests}`);
      sections.push(`- Confiance: ${marker.status === "critical" ? "moyenne a elevee" : "moyenne"}`);
      sections.push("");
    }
  }

  sections.push("## Interconnexions majeures (le pattern)\n");
  if (correlations.length) {
    correlations.forEach((item, idx) => {
      sections.push(`### Pattern ${idx + 1} , ${item.factor}`);
      sections.push(`1) Pattern observe: ${item.current}.`);
      sections.push(`2) Hypothese la plus probable: ${item.impact}`);
      sections.push("3) Ce qui confirmerait: retest cible + suivi longitudinal des marqueurs relies + suivi hebdomadaire du lifestyle.");
      sections.push(`4) Action concrete: ${item.recommendation}`);
      if (item.evidence) sections.push(`Preuve orientative: ${item.evidence}`);
      sections.push("5) KPI de validation: amelioration du symptome/performance + mouvement des marqueurs cibles au retest J+60/J+90.");
      sections.push("");
    });
  } else {
    sections.push("Aucune interconnexion robuste n'a pu etre etablie faute de donnees contextuelles suffisantes.");
  }
  sections.push("### Interconnexions biomarqueurs (mecanismes probables)");
  const hdlMarker = analysisResult.markers.find((marker) => marker.markerId === "hdl");
  const ldlMarker = analysisResult.markers.find((marker) => marker.markerId === "ldl");
  const tgMarker = analysisResult.markers.find((marker) => marker.markerId === "triglycerides");
  const hdlDirection = hdlMarker ? getMarkerDirection(hdlMarker) : "in-range";
  const ldlDirection = ldlMarker ? getMarkerDirection(ldlMarker) : "in-range";
  const tgDirection = tgMarker ? getMarkerDirection(tgMarker) : "in-range";
  const hasLipidTriad =
    hdlDirection === "low" && ldlDirection === "high" && tgDirection === "high";

  if (hasLipidTriad && hdlMarker && ldlMarker && tgMarker) {
    const missingForTriad = ["apob", "hba1c", "insuline_jeun", "homa_ir"].filter((id) => !testedIds.has(id));
    sections.push(
      `Pattern lipidique dominant: HDL bas (${hdlMarker.value} ${hdlMarker.unit}), LDL haut (${ldlMarker.value} ${ldlMarker.unit}) et triglycerides hauts (${tgMarker.value} ${tgMarker.unit}). Cette triade est compatible avec un profil dyslipidemique atherogene, souvent relie a une insulinorésistance ou a une faible flexibilite metabolique.`
    );
    sections.push(
      `Validation prioritaire: objectiver la charge particulaire et le terrain glycemique avec ApoB, HbA1c, insuline a jeun et HOMA-IR${missingForTriad.length ? ` (manquants actuellement: ${missingForTriad.join(", ")})` : ""}.`
    );
    sections.push(
      "Action immediate: corriger le noyau metabolique (qualite lipidique + fibres + reduction sucres rapides hors peri-training + cardio zone 2), puis retester dans des conditions strictement standardisees."
    );
  }

  if (priorityMarkers.length >= 2) {
    const connectionDrivers = priorityMarkers.slice(0, 6);
    connectionDrivers.forEach((marker, index) => {
      const linked = connectionDrivers
        .filter((candidate) => candidate.markerId !== marker.markerId)
        .slice(0, 2)
        .map((candidate) => `${candidate.name} (${candidate.value} ${candidate.unit || ""})`)
        .join(" + ");
      const panel = getMarkerPanelName(marker.markerId, marker.category).toLowerCase();
      const direction = getMarkerDirection(marker);
      sections.push(
        `${index + 1}. ${marker.name} (${marker.value} ${marker.unit || ""}) en signal ${direction === "in-range" ? "hors-optimal modere" : direction === "high" ? "haut" : "bas"} est relie a ${linked || "d'autres signaux du panel"} via l'axe ${panel}.`
      );
      sections.push(
        "   - Validation attendue: amelioration simultanee des marqueurs relies apres correction ciblee de la charge metabolique et de la recuperation."
      );
      sections.push(
        "   - Action pratique: relier chaque decision nutrition/training a ce marqueur prioritaire puis confirmer par retest, au lieu d'ajouter un protocole generique."
      );
    });
  } else {
    sections.push("- Interconnexions biomarqueurs limitees: panel trop favorable ou trop incomplet pour une lecture mecanistique dense.");
  }
  if (analysisResult.patterns.length) {
    sections.push("### Interconnexions issues des patterns detectes");
    analysisResult.patterns.slice(0, 6).forEach((pattern, idx) => {
      sections.push(`- Pattern ${idx + 1} (${pattern.name}): causes probables = ${pattern.causes.join(", ") || "Non renseigne"}.`);
      sections.push("- Hypothese mecanistique: accumulation de freins multi-axes qui se renforcent mutuellement si le contexte lifestyle reste instable.");
      sections.push("- Test de confirmation: retest standardise + suivi hebdo adherence/performance pour verifier la coherence du pattern.");
    });
  }
  sections.push("### Correlations lifestyle");
  sections.push(...correlationLines);

  sections.push("\n## Plan d'action 90 jours\n");
  sections.push("### Jours 1-14 (Stabilisation)");
  sections.push("- Objectifs: normaliser sommeil, rythme des repas, adherence, variabilite du stress.");
  sections.push("- Actions:");
  sections.push("- 1) Horaire de sommeil fixe 7j/7 + exposition lumiere matinale.");
  sections.push("- 2) 2-3 repas structures avec proteines/fibres a chaque repas.");
  sections.push("- 3) 10-15 min de marche post-prandiale apres 2 repas principaux.");
  sections.push("- 4) Hydratation/electrolytes calibres selon transpiration.");
  sections.push("- Indicateurs: energie matinale, latence d'endormissement, adherence >80%, variabilite faim/cravings.");
  sections.push("- Erreurs a eviter: deficit agressif, multiplication des supplements, surcharge training immediate.");
  sections.push(
    `- Marqueurs cibles phase 1: ${
      priorityMarkers.slice(0, 4).map((marker) => marker.name).join(", ") || "stabilisation globale"
    }.`
  );
  sections.push("- Validation fin phase: routines executees de facon stable pendant 10-14 jours.");
  sections.push("");
  sections.push("### Jours 15-30 (Phase d'Attaque)");
  sections.push("- Objectifs: attaquer les biomarqueurs prioritaires sans casser la recuperation.");
  sections.push("- Actions prioritaires:");
  sections.push(formatList(priority1.slice(0, 8), "Ajuster nutrition et charge d'entrainement selon feedback."));
  sections.push("- Indicateurs: tendance poids/tour de taille, performance sur lifts de base, fatigue percue, digestion.");
  sections.push("- Erreurs a eviter: changer 10 variables en meme temps, ignorer les signes de surmenage.");
  sections.push("- Marqueurs cibles phase 2: baisse des signaux critiques et stabilisation des signaux suboptimaux.");
  sections.push("- Criteres de progression: sommeil stable + energie acceptable + adherence >80% sur 2 semaines.");
  sections.push("");
  sections.push("### Jours 31-60 (Consolidation)");
  sections.push("- Objectifs: consolider les habitudes a fort ROI et lisser les fluctuations.");
  sections.push("- Actions de consolidation:");
  sections.push(formatList(priority2.slice(0, 8), "Consolider les habitudes qui impactent vraiment les marqueurs prioritaires."));
  sections.push("- Indicateurs: adherence durable, qualite du sommeil, performance stable, baisse des marqueurs hors cible.");
  sections.push("- Erreurs a eviter: retomber dans une strategie extreme ou trop restrictive.");
  sections.push("- Marqueurs cibles phase 3: passage progressif vers zone normale sur les marqueurs encore hors cible.");
  sections.push("- Point de controle: reevaluer charge d'entrainement si la recuperation ne suit pas.");
  sections.push("");
  sections.push("### Jours 61-90 (Optimisation)");
  sections.push("- Objectifs: optimiser recomposition et performance en gardant la biologie sous controle.");
  sections.push("- Monter progressivement l'intensite seulement si les signaux biologiques se normalisent.");
  sections.push("- Affiner nutrition/training selon tendance des marqueurs prioritaires.");
  sections.push("- Tester une progression planifiee: bloc intensification ou bloc volume selon recuperation.");
  sections.push("- Indicateurs: progression charge utile, repartition masse grasse/maigre, stabilité energetique.");
  sections.push("- Erreurs a eviter: surestimer la recuperation, supprimer trop vite les fondamentaux.");
  sections.push("- Marqueurs cibles phase 4: consolidations des gains biologiques et prevention de rechute.");
  sections.push("- Decision finale: maintenir, intensifier ou corriger selon retest et signaux de terrain.");
  sections.push("");
  sections.push("### Retest & conditions de prelevement");
  if (critical.length || suboptimal.length) {
    [...critical, ...suboptimal].slice(0, 8).forEach((marker) => {
      sections.push(`- ${marker.name}: actuel ${marker.value} ${marker.unit || ""} -> cible ${marker.optimalRange || "zone optimale"} -> retest a J+60/J+90`);
    });
  } else {
    sections.push("- Retest de consolidation a 12 semaines.");
  }
  sections.push("- Conditions strictes: matin, a jeun 10-12h, sans sport intense 24-48h, sans alcool 72h, hydratation stable.");
  sections.push(followUp.length ? followUp.join("\n") : "- Aucun controle supplementaire impose.");
  sections.push("- Journal de pilotage recommande: adherence quotidienne, energie, sommeil, performance, signaux digestifs.");
  sections.push("- Regle d'ajustement: si 2 semaines sans amelioration nette, revenir au dernier protocole stable puis ajuster par palier.");
  sections.push("- Replanification: si aggravation clinique/performance, reduire complexite du plan et revenir aux fondamentaux sur 7-10 jours.");
  sections.push("- Critere de succes fin cycle: tendance favorable sur marqueurs prioritaires + progression mesurable sans surcharge physiologique.");
  sections.push("- Critere d'echec: adherence correcte mais stagnation biologique durable -> tests complementaires et avis medical.");

  sections.push("\n## Nutrition & entrainement\n");
  sections.push("### Nutrition");
  sections.push("- Structure hebdo: 80-90% de repas simples repetables, 10-20% de flexibilite controlee.");
  sections.push("- Prioriser proteines/fibres et densite micronutritionnelle sur chaque repas.");
  sections.push("- Timing glucidique autour des trainings pour performance sans degrader glycemie.");
  sections.push("- Deficit calorique progressif, jamais agressif sur plusieurs semaines.");
  sections.push("- Rotation alimentaire anti-fatigue: memes bases + variation des sources micronutritionnelles.");
  sections.push("- Si biomarqueurs glycemiques alteres: sequence repas (fibres/proteines puis glucides) + marche post-repas.");
  sections.push("- Si profil inflammatoire eleve: reduction progressive alcool/ultra-transformes + focus omega-3.");
  sections.push("- Si axe hormonal fragile: eviter seche agressive et maintenir apports lipidiques de qualite.");
  sections.push("- Si donnees manquantes: conserver une approche conservative et orientee adherence.");
  sections.push("### Entrainement");
  sections.push("- 3-5 seances qualitatives/semaine avec deload planifie.");
  sections.push("- Cardio zone 2 (120-180 min/semaine) si axe metabolique/lipidique altere.");
  sections.push("- NEAT quotidien eleve pour soutenir la recomposition sans sur-fatigue.");
  sections.push("- Deload immediat si cumul: sommeil degrade + baisse perf + biomarkers inflammatoires defavorables.");
  sections.push("- Garder 1-2 reps en reserve sur la majorite des series en phase de correction biologique.");
  sections.push("- Prioriser progression de la qualite d'execution avant volume maximal.");
  sections.push("### Execution & suivi");
  sections.push("- Dashboard hebdo: sommeil moyen, steps, charge interne, adherence nutrition, ressenti recuperation.");
  sections.push("- Rule of thumb: n'ajuster qu'1-2 variables par semaine pour garder un signal lisible.");
  sections.push("- Validation: la strategie est correcte si performance et biomarqueurs progressent ensemble.");
  sections.push("### Ajustements conditionnels");
  sections.push("- Si fatigue persistante + biomarkers inflammatoires eleves: reduire volume 7-10 jours et maintenir intensite technique.");
  sections.push("- Si stagnation perte de gras >14 jours: augmenter NEAT avant de baisser davantage les calories.");
  sections.push("- Si faim/cravings explosent: remonter legerement glucides peri-training plutot que forcer la restriction.");
  sections.push("- Si performance chute sur 2 semaines: deload court + sommeil prioritaire + verification adherence hydratation.");
  sections.push("### Checklist operationnelle");
  sections.push("- Quotidien: heure de coucher/reveil, 2-3 repas structures, hydratation, steps, training note.");
  sections.push("- Hebdo: revue des tendances et ajustement minimal.");
  sections.push("- Mensuel: valider que les marqueurs prioritaires bougent dans la bonne direction.");
  sections.push("### Traduction par marqueur prioritaire");
  sections.push(
    formatList(
      priorityMarkers.slice(0, 8).map(
        (marker) =>
          `${marker.name}: nutrition plus stable + training mieux periodise pour reduire le signal ${statusToPriority(marker.status).toLowerCase()}.`
      ),
      "Aucun marqueur prioritaire a traduire en protocole specifique."
    )
  );
  sections.push("### Periodisation pratique");
  sections.push("- Jours d'entrainement: glucides majoritairement peri-training, proteines reparties sur 3-4 prises.");
  sections.push("- Jours de repos: maintenir proteines/fibres, ajuster glucides sans couper brutalement.");
  sections.push("- Deload: conserver qualite nutritionnelle, reduire volume training, proteger le sommeil.");

  sections.push("\n## Supplements & stack\n");
  sections.push("### Niveau 1 , Fondamentaux (impact large)");
  sections.push("- Vitamine D3: 2000-5000 UI/j avec repas gras (selon statut initial). Pourquoi: immunite, performance, axe hormonal.");
  sections.push("- Magnesium glycinate: 300-400 mg le soir. Pourquoi: sommeil, gestion stress, recuperation nerveuse.");
  sections.push("- Omega-3 EPA+DHA: 2-3 g/j. Pourquoi: terrain inflammatoire/lipidique.");
  sections.push("- Creatine monohydrate: 3-5 g/j. Pourquoi: force, masse maigre, capacite de travail.");
  sections.push("### Niveau 2 , Cibles metaboliques/inflammatoires");
  sections.push("- Berberine (si glycemie/HOMA alteres): dose fractionnee, monitoring digestif. Precaution: interactions hypoglycemiantes.");
  sections.push("- Psyllium/fibres solubles: pre-repas riches en glucides pour lisser la reponse glycemique.");
  sections.push("- Curcuminoides standardises (si inflammation): avec repas, verifier tolerance digestive.");
  sections.push("- Glycine le soir: support sommeil/recuperation chez profils stresses.");
  sections.push("### Niveau 3 , Ajustements selon panel");
  sections.push("- Zinc (si statut bas): courte phase puis reevaluation au retest.");
  sections.push("- B12/Folate (si statut bas): corriger d'abord deficit confirme, puis maintenance.");
  sections.push("- Electrolytes (sodium/potassium): calibrer selon transpiration/cardio/volume training.");
  sections.push("- NAC (si enzymes hepatiques sensibles): usage transitoire, verifier tolerance et retest.");
  sections.push("- CoQ10 (si fatigue + charge training elevee): support mitochondrial potentiel.");
  const hdlForSupps = analysisResult.markers.find((m) => m.markerId === "hdl");
  const tgForSupps = analysisResult.markers.find((m) => m.markerId === "triglycerides");
  const ldlForSupps = analysisResult.markers.find((m) => m.markerId === "ldl");
  const altForSupps = analysisResult.markers.find((m) => m.markerId === "alt");
  const altHighContraNiacine = Boolean(altForSupps && Number.isFinite(altForSupps.value) && altForSupps.value > 40);
  const hasLowHDL = hdlForSupps && getMarkerDirection(hdlForSupps) === "low";
  const hasHighTG = tgForSupps && getMarkerDirection(tgForSupps) === "high";
  const hasHighLDL = ldlForSupps && getMarkerDirection(ldlForSupps) === "high";
  if (hasLowHDL || hasHighTG || hasHighLDL) {
    sections.push("### Stack lipidique cible (selon tes marqueurs reels)");
    if (hasLowHDL && hdlForSupps) {
      if (altHighContraNiacine) {
        sections.push(
          `- HDL bas (${hdlForSupps.value} ${hdlForSupps.unit}): niacine contre-indiquee actuellement car ALT elevee (${altForSupps?.value} ${altForSupps?.unit || "U/L"}). Priorite absolue au cardio zone 2, aux omega-3 et a la correction metabolique avant toute discussion medicale specifique.`
        );
      } else {
        sections.push(
          `- HDL bas (${hdlForSupps.value} ${hdlForSupps.unit}): niacine (vitamine B3) peut etre discutee uniquement en approche medicalement supervisée; priorite absolue au cardio zone 2 et a la correction du terrain glycémique.`
        );
      }
    }
    if (hasHighTG && tgForSupps) {
      sections.push(
        `- Triglycerides eleves (${tgForSupps.value} ${tgForSupps.unit}): EPA+DHA 3-4 g/j (EPA dominant), baisse stricte alcool/sucres rapides hors peri-training, verification du retest a J+60/J+90.`
      );
    }
    if (hasHighLDL && ldlForSupps) {
      sections.push(
        `- LDL eleve (${ldlForSupps.value} ${ldlForSupps.unit}): fibres solubles (psyllium) 10-15 g/j + strategie alimentaire anti-ApoB, avec suivi ApoB/non-HDL en priorite.`
      );
    }
    sections.push("- Important: valider la strategie lipidique avec ApoB, car LDL seul ne suffit pas a quantifier le risque residuel.");
  }
  sections.push("### Regles de securite");
  sections.push("- Introduire 1 supplement majeur a la fois pendant 5-7 jours pour isoler l'effet.");
  sections.push("- Reevaluer toutes les 4 semaines: efficacite percue, tolerance, adherence, cout.");
  sections.push("- Stopper/reduire si effet secondaire persistant et demander avis medical si necessaire.");
  sections.push("- Ajuster le stack selon retest biologique J+60/J+90, pas uniquement au ressenti.");
  sections.push("### Matrice decisionnelle");
  sections.push("- Priorite haute: biomarqueurs critiques + forte probabilite de benefice + risque faible.");
  sections.push("- Priorite moyenne: biomarqueurs suboptimaux + objectif performance specifique.");
  sections.push("- Priorite basse: optimisation fine sans signal biologique fort.");
  sections.push("### Stack personnalise par marqueur");
  sections.push(
    formatList(
      priorityMarkers.slice(0, 10).map((marker) => {
        const panel = getMarkerPanelName(marker.markerId, marker.category);
        return `${marker.name} (${panel}): prioriser fondamentaux + option(s) ciblee(s), puis confirmer l'efficacite au retest J+60/J+90.`;
      }),
      "Pas de stack cible requis au-dela des fondamentaux."
    )
  );
  sections.push("### Pilotage cout/benefice");
  sections.push("- Garder un stack court au debut (fort ROI, adherence, tolerance).");
  sections.push("- N'ajouter une brique que si un marqueur/pattern justifie clairement l'investissement.");
  sections.push("- Couper ce qui n'apporte pas de signal mesurable sur 4-8 semaines.");
  sections.push("### Calendrier d'introduction (ordre pratique)");
  sections.push("- Semaine 1: fondamentaux sommeil/recuperation + 1-2 supplements de base.");
  sections.push("- Semaine 2-3: ajouter une brique ciblee si les signaux prioritaires restent eleves.");
  sections.push("- Semaine 4-6: evaluer tolerance/efficacite avant toute escalation.");
  sections.push("- Semaine 7-12: simplifier le stack autour des options qui montrent un effet concret.");
  sections.push("### Suivi de tolerance et efficacite");
  sections.push("- Tolérance: sommeil, digestion, energie, frequence cardiaque au repos, ressenti d'entrainement.");
  sections.push("- Efficacite: mouvement des marqueurs cibles, baisse des signaux critiques, progression de performance sans fatigue excessive.");
  sections.push("- Decision: maintenir si signal positif net, ajuster si signal mixte, stopper si signal negatif persistant.");
  sections.push("### Ce qu'on evite volontairement");
  sections.push("- Stack trop large des le debut (bruit + cout + adherence faible).");
  sections.push("- Promesses de resultats sans retest.");
  sections.push("- Ajustements doses agressifs sans donnees de tolerance.");

  sections.push("\n## Annexes (references et vigilance)\n");
  sections.push("### Annexe A , Marqueurs secondaires (lecture rapide)");
  sections.push(
    formatList(
      analysisResult.markers.slice(0, 24).map((marker) => `${marker.name}: ${marker.status} | ${marker.value} ${marker.unit}`),
      "Aucun marqueur secondaire disponible."
    )
  );
  sections.push("### Annexe B , Hypotheses & tests de confirmation");
  sections.push(
    formatList(
      criticalMissing.map((id) => `Hypothese a confirmer via ${id.replace(/_/g, " ").toUpperCase()}`),
      "Aucune hypothese critique supplementaire."
    )
  );
  sections.push("### Annexe C , Glossaire utile");
  sections.push("- HOMA-IR: indice de resistance a l'insuline.");
  sections.push("- ApoB: charge de particules atherogenes.");
  sections.push("- hs-CRP: marqueur d'inflammation systemique basse intensite.");
  sections.push("- SHBG: proteine qui module la fraction libre des hormones sexuelles.");
  sections.push("### Vigilance");
  sections.push(alerts.length ? alerts.join("\n") : "- Aucun signal critique majeur necessitant une consultation medicale immediate.");

  sections.push("\n## Sources (bibliotheque)\n");

  const sourceCatalog = parseKnowledgeSourceCatalog(knowledgeContext || "");
  if (sourceCatalog.size) {
    sections.push("Sources détectées dans la base documentaire transmise:");
    for (const source of Array.from(sourceCatalog.values()).slice(0, 12)) {
      const details = [source.url ? `URL: ${source.url}` : "", source.category ? `Catégorie: ${source.category}` : ""]
        .filter(Boolean)
        .join(" | ");
      sections.push(details ? `[SRC:${source.id}] ${source.label} , ${source.title}. ${details}.` : `[SRC:${source.id}] ${source.label} , ${source.title}.`);
    }
  } else {
    sections.push("Aucune source bibliographique contextualisée n'a été transmise pour cette génération fallback.");
  }

  sections.push("");
  sections.push("*Rapport fallback deterministic: personnalise sur les marqueurs reels, avec plan d'action concret et retest structure.*");

  return normalizeFrenchTypography(reorderReportSections(sections.join("\n")));
}

const isFlaggedStatus = (status?: MarkerStatus): boolean => status === "suboptimal" || status === "critical";

const formatNumber = (value?: number, suffix = ""): string => {
  if (typeof value !== "number" || Number.isNaN(value)) return "N/A";
  return `${value}${suffix}`;
};

export const buildLifestyleCorrelations = (
  markers: MarkerAnalysis[],
  profile: {
    sleepHours?: number;
    trainingHours?: number;
    calorieDeficit?: number;
    alcoholWeekly?: number;
    stressLevel?: number;
    poids?: number;
    taille?: number;
  }
): LifestyleCorrelation[] => {
  const correlations: Array<LifestyleCorrelation & { rank: number }> = [];
  const rankMap: Record<MarkerAnalysis["status"], number> = {
    critical: 3,
    suboptimal: 2,
    normal: 1,
    optimal: 0,
  };
  const pushCorrelation = (payload: LifestyleCorrelation) => {
    correlations.push({ ...payload, rank: rankMap[payload.status] });
  };
  const getMarker = (id: string) => markers.find((marker) => marker.markerId === id);
  const sleepHours = profile.sleepHours;
  const trainingHours = profile.trainingHours;
  const calorieDeficit = profile.calorieDeficit;
  const alcoholWeekly = profile.alcoholWeekly;
  const stressLevel = profile.stressLevel;
  const bmi =
    typeof profile.poids === "number" && typeof profile.taille === "number" && profile.taille > 0
      ? Math.round((profile.poids / Math.pow(profile.taille / 100, 2)) * 10) / 10
      : undefined;

  if (typeof sleepHours === "number" && sleepHours < 7) {
    const testosterone = getMarker("testosterone_total");
    const cortisol = getMarker("cortisol");
    const impactBits = [];
    if (isFlaggedStatus(testosterone?.status)) impactBits.push("testosterone suboptimale");
    if (isFlaggedStatus(cortisol?.status)) impactBits.push("cortisol desequilibre");
    pushCorrelation({
      factor: "Sommeil",
      current: `${sleepHours} h/nuit`,
      impact: impactBits.length
        ? `Sommeil court associe a ${impactBits.join(" et ")}.`
        : "Sommeil court fragilise l axe hormonal et la recuperation.",
      recommendation: "Vise 7h30-8h30 et des horaires stables sur 14 jours.",
      status: sleepHours < 6.5 ? "critical" : "suboptimal",
      evidence: "Sommeil <7h baisse la testosterone et augmente le stress physiologique.",
    });
  } else if (typeof sleepHours === "number") {
    pushCorrelation({
      factor: "Sommeil",
      current: `${sleepHours} h/nuit`,
      impact: sleepHours >= 7.5 ? "Sommeil aligne avec une recuperation optimale." : "Sommeil correct mais perfectible pour la performance.",
      recommendation: sleepHours >= 7.5 ? "Garde cette regularite sur 3-4 semaines." : "Vise +30 min et couche-toi plus regulierement.",
      status: sleepHours >= 7.5 ? "optimal" : "normal",
      evidence: "Sommeil stable = meilleure regulation hormonale et inflammatoire.",
    });
  }

  if (typeof trainingHours === "number" && trainingHours >= 10) {
    const crp = getMarker("crp_us");
    const cortisol = getMarker("cortisol");
    const impactBits = [];
    if (isFlaggedStatus(crp?.status)) impactBits.push("inflammation elevee");
    if (isFlaggedStatus(cortisol?.status)) impactBits.push("cortisol eleve");
    pushCorrelation({
      factor: "Training",
      current: `${trainingHours} h/sem`,
      impact: impactBits.length
        ? `Volume eleve associe a ${impactBits.join(" et ")}.`
        : "Volume eleve peut limiter la recuperation et l anabolisme.",
      recommendation: "Reduis a 6-8 h/sem et planifie un deload toutes les 4-6 semaines.",
      status: "suboptimal",
      evidence: "Surentrainement chronique augmente inflammation et catabolisme.",
    });
  } else if (typeof trainingHours === "number") {
    pushCorrelation({
      factor: "Training",
      current: `${trainingHours} h/sem`,
      impact: trainingHours >= 4 ? "Volume coherent avec performance et recuperation." : "Volume faible peut ralentir les adaptations.",
      recommendation: trainingHours >= 4 ? "Maintiens 3-5 seances bien reparties." : "Passe progressivement a 3 seances/sem.",
      status: trainingHours >= 4 ? "optimal" : "normal",
      evidence: "Frequence reguliere = meilleure sensibilite a l insuline et composition corporelle.",
    });
  }

  if (typeof calorieDeficit === "number" && calorieDeficit >= 25) {
    const t3 = getMarker("t3_libre");
    const igf1 = getMarker("igf1");
    const impactBits = [];
    if (isFlaggedStatus(t3?.status)) impactBits.push("thyroide ralentit");
    if (isFlaggedStatus(igf1?.status)) impactBits.push("anabolisme faible");
    pushCorrelation({
      factor: "Deficit calorique",
      current: `${calorieDeficit}%`,
      impact: impactBits.length
        ? `Deficit eleve associe a ${impactBits.join(" et ")}.`
        : "Deficit eleve peut ralentir le metabolisme et la recuperation.",
      recommendation: "Reste sous 15-20% de deficit et integre 1 refeed hebdo.",
      status: "suboptimal",
      evidence: "Deficits agressifs baissent T3 et IGF-1 chez les sportifs.",
    });
  } else if (typeof calorieDeficit === "number") {
    pushCorrelation({
      factor: "Deficit calorique",
      current: `${calorieDeficit}%`,
      impact: calorieDeficit <= 20 ? "Deficit modere, soutenable pour la performance." : "Deficit eleve a surveiller.",
      recommendation: calorieDeficit <= 20 ? "Continue avec un deficit stable." : "Reviens sous 20% pour preserver la thyroide.",
      status: calorieDeficit <= 20 ? "optimal" : "normal",
      evidence: "Deficit modere = meilleure adherence et maintien hormonal.",
    });
  }

  if (typeof stressLevel === "number" && stressLevel >= 7) {
    const cortisol = getMarker("cortisol");
    const crp = getMarker("crp_us");
    const impactBits = [];
    if (isFlaggedStatus(cortisol?.status)) impactBits.push("cortisol desequilibre");
    if (isFlaggedStatus(crp?.status)) impactBits.push("inflammation elevee");
    pushCorrelation({
      factor: "Stress",
      current: `${stressLevel}/10`,
      impact: impactBits.length
        ? `Stress eleve associe a ${impactBits.join(" et ")}.`
        : "Stress eleve perturbe sommeil, glycemie et recuperation.",
      recommendation: "Integre 10-15 min/jour de respiration, marche lente ou NSDR.",
      status: stressLevel >= 8 ? "critical" : "suboptimal",
      evidence: "Stress chronique eleve cortisol et degrade la sensibilite a l insuline.",
    });
  } else if (typeof stressLevel === "number") {
    pushCorrelation({
      factor: "Stress",
      current: `${stressLevel}/10`,
      impact: stressLevel <= 4 ? "Stress bien gere, bon signal pour la recuperation." : "Stress modere, garde un rituel quotidien.",
      recommendation: stressLevel <= 4 ? "Continue routines de decharge." : "Ajoute 5-10 min de respiration le soir.",
      status: stressLevel <= 4 ? "optimal" : "normal",
      evidence: "Stress bas = meilleur sommeil et variabilite cardiaque.",
    });
  }

  if (typeof alcoholWeekly === "number" && alcoholWeekly >= 6) {
    const ggt = getMarker("ggt");
    const triglycerides = getMarker("triglycerides");
    const impactBits = [];
    if (isFlaggedStatus(ggt?.status)) impactBits.push("stress hepatique");
    if (isFlaggedStatus(triglycerides?.status)) impactBits.push("triglycerides hauts");
    pushCorrelation({
      factor: "Alcool",
      current: `${alcoholWeekly} verres/sem`,
      impact: impactBits.length
        ? `Alcool associe a ${impactBits.join(" et ")}.`
        : "Alcool freine la lipolyse et surcharge le foie.",
      recommendation: "Passe sous 2-3 verres/sem pendant 4 semaines.",
      status: "suboptimal",
      evidence: "L alcool eleve GGT et triglycerides chez les profils a risque.",
    });
  } else if (typeof alcoholWeekly === "number") {
    pushCorrelation({
      factor: "Alcool",
      current: `${alcoholWeekly} verres/sem`,
      impact: alcoholWeekly <= 3 ? "Charge alcool faible, effet metabolique limite." : "Charge alcool moderee, a surveiller.",
      recommendation: alcoholWeekly <= 3 ? "Garde cette limite." : "Vise 2-3 verres/sem.",
      status: alcoholWeekly <= 3 ? "optimal" : "normal",
      evidence: "Moins d alcool = meilleure sensibilite a l insuline et GGT stable.",
    });
  }

  if (typeof bmi === "number" && bmi >= 27) {
    const homa = getMarker("homa_ir");
    const triglycerides = getMarker("triglycerides");
    const impactBits = [];
    if (isFlaggedStatus(homa?.status)) impactBits.push("insulino resistance");
    if (isFlaggedStatus(triglycerides?.status)) impactBits.push("profil lipidique degrade");
    pushCorrelation({
      factor: "IMC",
      current: formatNumber(bmi),
      impact: impactBits.length
        ? `IMC eleve associe a ${impactBits.join(" et ")}.`
        : "IMC eleve augmente la charge metabolique globale.",
      recommendation: "Objectif: -5 a -10% de poids sur 8-12 semaines.",
      status: bmi >= 30 ? "critical" : "suboptimal",
      evidence: "Perte de gras visceral ameliore glycemie, lipides et inflammation.",
    });
  } else if (typeof bmi === "number") {
    pushCorrelation({
      factor: "IMC",
      current: formatNumber(bmi),
      impact: bmi >= 20 && bmi <= 25 ? "IMC dans une zone stable pour la sante metabolique." : "IMC a surveiller selon le contexte.",
      recommendation: bmi >= 20 && bmi <= 25 ? "Maintiens cette zone via nutrition stable." : "Affiner selon composition corporelle.",
      status: bmi >= 20 && bmi <= 25 ? "optimal" : "normal",
      evidence: "IMC stable + composition corporelle ok = meilleur profil cardio-metabolique.",
    });
  }

  return correlations
    .sort((a, b) => b.rank - a.rank)
    .slice(0, 4)
    .map(({ rank, ...item }) => item);
};

const PANEL_KEYWORDS: Array<{ panel: string; markerIds: string[] }> = [
  {
    panel: "Axe hormonal",
    markerIds: ["testosterone_total", "testosterone_libre", "shbg", "estradiol", "lh", "fsh", "prolactine", "dhea_s", "igf1", "cortisol"],
  },
  {
    panel: "Axe metabolique",
    markerIds: ["glycemie_jeun", "hba1c", "insuline_jeun", "homa_ir", "fructosamine", "triglycerides", "hdl", "ldl", "apob", "lpa", "cholesterol_total", "apo_a1"],
  },
  {
    panel: "Axe thyroidien",
    markerIds: ["tsh", "t4_libre", "t3_libre", "t3_reverse", "anti_tpo"],
  },
  {
    panel: "Axe inflammation/immunite",
    markerIds: ["crp_us", "homocysteine", "ferritine", "fer_serique", "transferrine_sat"],
  },
  {
    panel: "Axe micronutriments",
    markerIds: ["vitamine_d", "b12", "folate", "magnesium_rbc", "zinc"],
  },
  {
    panel: "Axe foie/rein",
    markerIds: ["alt", "ast", "ggt", "creatinine", "egfr"],
  },
];

const getMarkerPanelName = (markerId: string, fallback?: string) => {
  if (fallback && fallback.trim()) return fallback.trim();
  for (const group of PANEL_KEYWORDS) {
    if (group.markerIds.includes(markerId)) return group.panel;
  }
  return "Axe general";
};

const buildAxisPromptContext = (markers: MarkerAnalysis[]): string => {
  if (!markers.length) return "- Aucun axe exploitable (aucun biomarqueur interprete).";

  const grouped = new Map<string, MarkerAnalysis[]>();
  for (const marker of markers) {
    const panel = getMarkerPanelName(marker.markerId, marker.category);
    const existing = grouped.get(panel) || [];
    existing.push(marker);
    grouped.set(panel, existing);
  }

  const preferredOrder = PANEL_KEYWORDS.map((group) => group.panel);
  const extraPanels = Array.from(grouped.keys()).filter((panel) => !preferredOrder.includes(panel));
  const orderedPanels = [...preferredOrder, ...extraPanels].filter((panel) => (grouped.get(panel)?.length || 0) > 0);
  if (!orderedPanels.length) return "- Aucun axe exploitable (aucun biomarqueur interprete).";

  return orderedPanels
    .map((panel, idx) => {
      const panelMarkers = grouped.get(panel) || [];
      const criticalCount = panelMarkers.filter((marker) => marker.status === "critical").length;
      const suboptimalCount = panelMarkers.filter((marker) => marker.status === "suboptimal").length;
      const markerPreview = panelMarkers
        .slice(0, 6)
        .map((marker) => `${marker.name}=${marker.value}${marker.unit ? ` ${marker.unit}` : ""} (${marker.status})`)
        .join(" | ");
      return `Axe ${idx + 1} , ${panel}: ${panelMarkers.length} marqueur(s), ${criticalCount} critique(s), ${suboptimalCount} important(s). Marqueurs disponibles: ${markerPreview}.`;
    })
    .join("\n");
};

export async function generateAIBloodAnalysis(
  analysisResult: BloodAnalysisResult,
  userProfile: {
    gender: "homme" | "femme";
    age?: string;
    objectives?: string;
    medications?: string;
    prenom?: string;
    nom?: string;
    poids?: number;
    taille?: number;
    sleepHours?: number;
    trainingHours?: number;
    calorieDeficit?: number;
    alcoholWeekly?: number;
    stressLevel?: number;
    fastingHours?: number;
    drawTime?: string;
    lastTraining?: string;
    alcoholLast72h?: string;
    nutritionPhase?: string;
    supplementsUsed?: string[];
    infectionRecent?: string;
  },
  knowledgeContext?: string
): Promise<string> {
  const anthropic = new Anthropic();
  const defaultModel = "claude-opus-4-6";
  const resolveModel = () => {
    const configured = String(process.env.BLOOD_ANALYSIS_MODEL || defaultModel).trim();
    const allowOverride = process.env.BLOOD_ANALYSIS_ALLOW_MODEL_OVERRIDE === "true";
    if (!configured) return defaultModel;
    if (!/^claude-/i.test(configured)) {
      console.warn(
        `[BloodAnalysis] Unsupported BLOOD_ANALYSIS_MODEL="${configured}" for Anthropic pipeline. Falling back to ${defaultModel}.`
      );
      return defaultModel;
    }
    if (!allowOverride && configured !== defaultModel) {
      console.warn(
        `[BloodAnalysis] BLOOD_ANALYSIS_MODEL="${configured}" ignored. Locked to ${defaultModel}. Set BLOOD_ANALYSIS_ALLOW_MODEL_OVERRIDE=true to bypass.`
      );
      return defaultModel;
    }
    return configured;
  };
  const modelName = resolveModel();

  // Build the prompt with analysis data
  const markersTable = analysisResult.markers
    .map((marker) => {
      const range = BIOMARKER_RANGES[marker.markerId];
      const panel = getMarkerPanelName(marker.markerId, marker.category);
      const deltaOptimal =
        range && Number.isFinite(range.optimalMin) && Number.isFinite(range.optimalMax)
          ? formatPercentDelta(marker.value, range.optimalMin, range.optimalMax)
          : "N/A";
      return `- ${marker.name} [${marker.markerId}] | Axe: ${panel} | Valeur: ${marker.value} ${marker.unit} | Normal: ${marker.normalRange} | Optimal: ${marker.optimalRange} | Ecart vs optimal: ${deltaOptimal} | Statut: ${marker.status.toUpperCase()}${marker.interpretation ? ` | Note: ${marker.interpretation}` : ""}`;
    })
    .join("\n");

  const patternsText = analysisResult.patterns.length
    ? analysisResult.patterns
        .map((pattern) => `Pattern detecte: ${pattern.name}\nCauses probables: ${pattern.causes.join(", ")}`)
        .join("\n\n")
    : "Aucun pattern robuste detecte avec les donnees disponibles.";
  const axisPromptContext = buildAxisPromptContext(analysisResult.markers);

  const bmi =
    typeof userProfile.poids === "number" && typeof userProfile.taille === "number" && userProfile.taille > 0
      ? (userProfile.poids / Math.pow(userProfile.taille / 100, 2)).toFixed(1)
      : "N/A";
  const lifestyleLine = `Sommeil: ${userProfile.sleepHours ?? "N/A"} h/nuit | Training: ${userProfile.trainingHours ?? "N/A"} h/sem | Deficit: ${userProfile.calorieDeficit ?? "N/A"}% | Alcool: ${userProfile.alcoholWeekly ?? "N/A"} verres/sem | Stress: ${userProfile.stressLevel ?? "N/A"}/10 | Poids: ${userProfile.poids ?? "N/A"} kg | Taille: ${userProfile.taille ?? "N/A"} cm | IMC: ${bmi}`;
  const deepDivePayload = await getBiomarkerDeepDiveContext(analysisResult.markers, {
    prenom: userProfile.prenom,
    nom: userProfile.nom,
    age: userProfile.age,
  });
  const markerCount = analysisResult.markers.length;
  const sourceCatalog = parseKnowledgeSourceCatalog(knowledgeContext || "");
  const availableSourceIds = new Set(Array.from(sourceCatalog.keys()));
  const availableSourceIdArray = Array.from(availableSourceIds);
  const baseMinSourceCitations = Math.max(2, Math.min(8, Math.ceil(markerCount / 4)));
  const minSourceCitations =
    availableSourceIds.size > 0 ? Math.max(1, Math.min(baseMinSourceCitations, availableSourceIds.size)) : 0;
  const deepDiveCitationTarget = availableSourceIds.size > 0 ? Math.max(1, Math.min(3, availableSourceIds.size)) : 0;
  const interconnexionsCitationTarget =
    availableSourceIds.size > 0 ? Math.max(1, Math.min(2, availableSourceIds.size)) : 0;
  const nutritionCitationTarget = availableSourceIds.size > 0 ? 1 : 0;
  const supplementsCitationTarget = availableSourceIds.size > 0 ? Math.max(1, Math.min(2, availableSourceIds.size)) : 0;
  const availableSourceIdList = Array.from(availableSourceIds).slice(0, 30).join(", ") || "Non renseigne";
  const lowDataMode = markerCount < 8;
  const targetChars = markerCount >= 22 ? 34000 : markerCount >= 16 ? 28000 : markerCount >= 12 ? 22000 : markerCount >= 8 ? 16000 : 11000;
  const minDeepDiveMarkers = Math.max(3, Math.min(10, Math.ceil(markerCount * 0.55)));
  const qualityThresholds = {
    synthese: markerCount >= 16 ? 1200 : 900,
    qualite: markerCount >= 16 ? 900 : 700,
    tableau: markerCount >= 16 ? 900 : 700,
    recomposition: markerCount >= 16 ? 1300 : 1000,
    axes: markerCount >= 16 ? 6200 : 4700,
    interconnexions: markerCount >= 16 ? 1600 : 1300,
    deepDive: markerCount >= 16 ? 5000 : 3800,
    plan: markerCount >= 16 ? 3500 : 2800,
    nutrition: markerCount >= 16 ? 2700 : 2200,
    supplements: markerCount >= 16 ? 3200 : 2500,
  };
  const focusMarkers = analysisResult.markers
    .filter((marker) => marker.status !== "optimal")
    .slice(0, 6)
    .map((marker) => `${marker.name} (${marker.value} ${marker.unit}, ${marker.status})`)
    .join(", ");
  const reportSeed = [
    userProfile.prenom || "profil",
    userProfile.gender,
    userProfile.age || "na",
    markerCount,
    analysisResult.summary.action.length,
    analysisResult.summary.watch.length,
  ].join("-");

  const userPrompt = `Analyse ce bilan sanguin pour ${userProfile.prenom ? userProfile.prenom : "le client"} (${userProfile.gender} ${userProfile.age || ""}).
Objectifs: ${userProfile.objectives || "Performance et santé"}
Médicaments: ${userProfile.medications || "Aucun"}
Lifestyle: ${lifestyleLine}
Seed de personnalisation: ${reportSeed}

MARQUEURS:
${markersTable}

PATTERNS DETECTES:
${patternsText}

RESUME:
- Optimal: ${analysisResult.summary.optimal.join(", ") || "Aucun"}
- A surveiller: ${analysisResult.summary.watch.join(", ") || "Aucun"}
- Action requise: ${analysisResult.summary.action.join(", ") || "Aucun"}
Top marqueurs focus: ${focusMarkers || "Aucun marqueur en alerte"}
Nombre de marqueurs interpretes: ${markerCount}

${deepDivePayload.context ? `\nDEEP DIVE - DONNEES & SOURCES PAR BIOMARQUEUR:\n${deepDivePayload.context}` : ""}
${knowledgeContext ? `\nCONTEXTE SCIENTIFIQUE GENERAL:\n${knowledgeContext}` : ""}

AXES DISPONIBLES (d'apres les marqueurs reels):
${axisPromptContext}

FORMAT OBLIGATOIRE (dans cet ordre exact):
1. ## Synthèse exécutive
2. ## Qualité des données & limites
3. ## Tableau de bord (scores & priorités)
4. ## Potentiel recomposition (perte de gras + gain de muscle)
5. ## Lecture compartimentée par axes
6. ## Interconnexions majeures (le pattern)
7. ## Deep dive , marqueurs prioritaires
8. ## Plan d'action 90 jours
9. ## Nutrition & entraînement
10. ## Suppléments & stack
11. ## Annexes (références et vigilance)
12. ## Sources (bibliothèque)

EXIGENCES DE QUALITE:
- Longueur cible: ${targetChars} caracteres minimum, sans remplissage artificiel.
- Traiter au moins ${minDeepDiveMarkers} marqueurs en deep dive (ou tous les non-optimaux s'il y en a moins).
- ${minSourceCitations > 0 ? `Inserer au moins ${minSourceCitations} citations [SRC:ID] dans les sections analytiques (hors section Sources).` : "Aucun ID [SRC] disponible dans le contexte: ne pas inventer de citation."}
- Pour chaque axe et chaque marqueur prioritaire: lecture clinique + lecture performance + actions concretes.
- Interdiction de creer des titres placeholders du type "Axe X , Non renseigne". Si un axe est incomplet, conserver son nom reel et indiquer "Non renseigne" uniquement dans le paragraphe.
- Rediger exclusivement en prose narrative: paragraphes complets et phrases detaillees.
- Interdiction absolue dans la sortie finale: listes a puces, listes numerotees, tableaux markdown.
- Orthographe premium obligatoire: accents, cédilles et français naturel irréprochable.
- Interdiction absolue d'insinuer dopage/steroides/anabolisants sans donnee explicite.
- A la premiere mention d'un biomarqueur, expliquer ce qu'il mesure et son impact pratique.
- Eviter toute repetition entre sections: chaque section doit apporter un angle nouveau.
- Tu DOIS respecter des seuils de profondeur:
  - "## Synthèse exécutive": au moins ${qualityThresholds.synthese} caracteres, avec priorites immediates + impact performance + sequence d'action.
  - "## Qualité des données & limites": au moins ${qualityThresholds.qualite} caracteres, avec limites explicites, confondants et tests de confirmation.
  - "## Tableau de bord (scores & priorités)": au moins ${qualityThresholds.tableau} caracteres, avec priorites, quick wins, KPI.
  - "## Potentiel recomposition (perte de gras + gain de muscle)": au moins ${qualityThresholds.recomposition} caracteres, avec leviers, freins, conditions de progression.
  - "## Lecture compartimentée par axes": au moins ${qualityThresholds.axes} caracteres, avec un bloc detaille par axe present.
  - "## Interconnexions majeures (le pattern)": au moins ${qualityThresholds.interconnexions} caracteres, avec patterns relies entre marqueurs.
  - "## Deep dive , marqueurs prioritaires": au moins ${qualityThresholds.deepDive} caracteres, marqueur par marqueur.
  - "## Plan d'action 90 jours": au moins ${qualityThresholds.plan} caracteres, avec objectifs + actions + indicateurs + erreurs a eviter par phase.
  - "## Nutrition & entraînement": au moins ${qualityThresholds.nutrition} caracteres, en liant chaque recommendation aux marqueurs.
  - "## Suppléments & stack": au moins ${qualityThresholds.supplements} caracteres, avec rationale, dose, timing, duree, precautions.
- Ne jamais inventer un marqueur, une valeur, un symptome, un contexte ou une source.
- Si une info est absente: ecrire "Non renseigne", expliquer la limite, proposer le test utile.
- Citer [SRC:ID] uniquement si l'ID existe dans le contexte fourni.
- IDs autorises pour les citations [SRC:ID]: ${availableSourceIdList}
- La section "Sources (bibliothèque)" doit reprendre exactement les IDs cites dans le rapport, sans en ajouter.
- Ton expert, humain, personnalise, orienté resultat, sans jargon inutile.
${lowDataMode ? "\nMODE DONNEES PARTIELLES: panel incomplet. Renforce la section limites, hypotheses et retest sans halluciner." : ""}`;

  let output = "";
  let bestCandidate = "";
  let bestScore = -1;
  let lowCreditErrorDetected = false;

  // Keep timeout conservative to avoid reports stuck in "processing".
  const API_TIMEOUT_MS = 120000;

  // Reduce retries to 1 for faster response, with timeout protection
  const maxAttempts = process.env.BLOOD_ANALYSIS_FAST_MODE === "true" ? 1 : 2;
  const parallelSectionsEnabled = process.env.BLOOD_ANALYSIS_PARALLEL_SECTIONS !== "false";
  const forceParallelSectionGeneration =
    process.env.BLOOD_ANALYSIS_FORCE_PARALLEL_SECTIONS !== "false";
  const parsedConcurrency = Number(process.env.BLOOD_ANALYSIS_SECTION_CONCURRENCY || "4");
  const sectionConcurrency = Number.isFinite(parsedConcurrency)
    ? Math.max(2, Math.min(6, Math.floor(parsedConcurrency)))
    : 4;
  const skipMonolithicGeneration =
    parallelSectionsEnabled &&
    forceParallelSectionGeneration &&
    process.env.BLOOD_ANALYSIS_SKIP_MONOLITHIC !== "false";

  if (!skipMonolithicGeneration) {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const retryNote =
        attempt === 1
          ? ""
          : `\nATTENTION: Ta reponse precedente etait trop generique ou non conforme. Corrige en utilisant STRICTEMENT les donnees patient et les sources fournies, avec les 12 sections H2 exactes dans l'ordre, et un style 100% narratif sans puces, sans numerotation, sans tableaux.\n`;
      const prompt = `${userPrompt}\n${retryNote}`;

      try {
        // Stream output to support long narratives while keeping memory bounded.
        const stream = await anthropic.messages.create({
          model: modelName,
          max_tokens: 22000,
          system: BLOOD_ANALYSIS_SYSTEM_PROMPT,
          messages: [{ role: "user", content: prompt }],
          stream: true,
        });

        let candidate = "";
        for await (const event of stream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            candidate += event.delta.text;
          }
        }
        const sanitizedCandidate = sanitizeSourceCitations(candidate, availableSourceIdArray);
        const normalizedCandidate = reorderReportSections(
          ensureSourcesSection(normalizeFrenchTypography(sanitizedCandidate), knowledgeContext)
        );
        const deepDiveCheck = validateDeepDive(
          normalizedCandidate,
          deepDivePayload.markerNames,
          availableSourceIds
        );
        const structureCheck = validateReportStructure(
          normalizedCandidate,
          analysisResult.markers,
          availableSourceIds
        );
        if (!deepDiveCheck.ok) {
          console.warn(`[BloodAnalysis] Candidate deep-dive rejection: ${deepDiveCheck.reason}`);
        }
        if (!structureCheck.ok) {
          console.warn(`[BloodAnalysis] Candidate structure rejection: ${structureCheck.reasons.join(" | ")}`);
        }

        const qualityOk = deepDiveCheck.ok && structureCheck.ok;
        const score =
          normalizedCandidate.length +
          (deepDiveCheck.ok ? 7000 : 0) +
          structureCheck.matchedSections * 1200 -
          structureCheck.missing.length * 1800 -
          structureCheck.thin.length * 1800;
        if (score > bestScore) {
          bestScore = score;
          bestCandidate = normalizedCandidate;
        }
        if (qualityOk) {
          output = normalizedCandidate;
          break;
        }
      } catch (err: any) {
        if (err.message === "API_TIMEOUT") {
          console.warn(`[BloodAnalysis] Attempt ${attempt} timed out after ${API_TIMEOUT_MS}ms`);
          if (attempt === maxAttempts) {
            throw new Error("AI_TIMEOUT_ALL_ATTEMPTS");
          }
        } else if (isAnthropicLowCreditError(err)) {
          throw new Error("AI_CREDIT_BALANCE_LOW");
        } else {
          throw err;
        }
      }
    }
  } else {
    console.log(
      `[BloodAnalysis] Skipping monolithic draft: parallel section generation is primary mode (concurrency=${sectionConcurrency}).`
    );
  }

  if (!output && !skipMonolithicGeneration) {
    output = bestCandidate;
  }

  if (!skipMonolithicGeneration && !/(^|\n)##\s+Plan(?: d'action)? 90 jours/i.test(output)) {
    const planPrompt = `Genere UNIQUEMENT la section "## Plan d'action 90 jours" pour ce bilan sanguin.

Contraintes:
- Titres exacts:
  ## Plan d'action 90 jours
  ### Jours 1-14 (Stabilisation)
  ### Jours 15-30 (Phase d'Attaque)
  ### Jours 31-60 (Consolidation)
  ### Jours 61-90 (Optimisation)
  ### Retest & conditions de prelevement
- Chaque phase contient objectifs, actions, indicateurs, erreurs a eviter.
- Rediger uniquement en paragraphes complets. Ne pas utiliser de puces, de numerotation ni de tableaux.
- Longueur minimale: ${qualityThresholds.plan} caracteres.
- Chaque phase doit relier les actions aux biomarqueurs concernes.
- Base strictement sur les marqueurs et le contexte fournis.
- Reste concret, mesurable, sans hallucination.

Contexte:
Client: ${userProfile.prenom ? userProfile.prenom : "le client"} (${userProfile.gender} ${userProfile.age || ""})
Lifestyle: ${lifestyleLine}

Marqueurs:
${markersTable}

Patterns:
${patternsText}

${knowledgeContext ? `Contexte scientifique:\n${knowledgeContext}\n` : ""}`;

    try {
      const planStream = await anthropic.messages.create({
        model: modelName,
        max_tokens: 9000,
        system:
          "Tu es un expert bloodwork performance. Genere uniquement la section demandee, en markdown propre, avec style narratif strict sans puces, sans numerotation, sans tableaux et avec orthographe francaise irreprochable (accents obligatoires).",
        messages: [{ role: "user", content: planPrompt }],
        stream: true,
      });

      let planContent = "";
      for await (const event of planStream) {
        if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
          planContent += event.delta.text;
        }
      }

      const planText = extractPlan90Section(normalizeFrenchTypography(planContent));
      if (planText) {
        output = insertPlan90Section(output, planText);
      }
    } catch (err: any) {
      if (err.message === "API_TIMEOUT") {
        console.warn("[BloodAnalysis] Plan 90 jours timed out, skipping");
      } else {
        console.error("[BloodAnalysis] Plan 90 jours fallback failed:", err);
      }
    }
  }

  // Multi-pass generation: repair missing/thin sections with hard depth targets.
  console.log(`[BloodAnalysis] Starting multi-pass check. Output length: ${output.length} chars`);
  const narrativeConstraint =
    "Ecrire en tant qu'Achzod, a la premiere personne et en tutoyant directement le client, uniquement en paragraphes complets, sans puces, sans numerotation, sans tableaux markdown, avec orthographe francaise irreprochable (accents obligatoires), sans insinuation de dopage/steroides non renseignes, et en definissant le biomarqueur lors de sa premiere mention.";

  const sectionRepairSpecs: Array<{
    title: string;
    aliases: string[];
    minChars: number;
    maxTokens: number;
    prompt: () => string;
  }> = [
    {
      title: "Synthèse exécutive",
      aliases: ["synthese-executive"],
      minChars: qualityThresholds.synthese,
      maxTokens: 5000,
      prompt: () => `Genere UNIQUEMENT la section "## Synthèse exécutive".

Contraintes:
- ${narrativeConstraint}
- Longueur minimale: ${qualityThresholds.synthese} caracteres.
- Inclure obligatoirement: triage des priorites, impact performance/recomposition, sequence logique des actions, risques a surveiller.
- S'appuyer strictement sur les marqueurs reels et leur statut.
- Aucun blabla generique.

Contexte:
Client: ${userProfile.prenom || "le client"} (${userProfile.gender} ${userProfile.age || ""})
Lifestyle: ${lifestyleLine}
Marqueurs: ${markersTable}
Patterns: ${patternsText}`,
    },
    {
      title: "Qualité des données & limites",
      aliases: ["qualite-des-donnees-limites"],
      minChars: qualityThresholds.qualite,
      maxTokens: 4200,
      prompt: () => `Genere UNIQUEMENT la section "## Qualité des données & limites".

Contraintes:
- ${narrativeConstraint}
- Longueur minimale: ${qualityThresholds.qualite} caracteres.
- Inclure: fiabilite du panel, limites de couverture, facteurs confondants, ce qui manque pour conclure, tests prioritaires a ajouter.
- Quand une info manque: "Non renseigne" + impact concret sur la decision.
- Rester factuel et actionnable.

Contexte:
Lifestyle: ${lifestyleLine}
Marqueurs: ${markersTable}
Patterns: ${patternsText}`,
    },
    {
      title: "Tableau de bord (scores & priorités)",
      aliases: ["tableau-de-bord-scores-priorites"],
      minChars: qualityThresholds.tableau,
      maxTokens: 4500,
      prompt: () => `Genere UNIQUEMENT la section "## Tableau de bord (scores & priorités)".

Contraintes:
- ${narrativeConstraint}
- Longueur minimale: ${qualityThresholds.tableau} caracteres.
- Inclure: priorites critiques/importantes, quick wins, KPI de suivi hebdo et mensuel, criteres d'escalade.
- Lier explicitement les priorites aux biomarqueurs.
- Style premium, concret, sans generalites.

Contexte:
Marqueurs: ${markersTable}
Patterns: ${patternsText}`,
    },
    {
      title: "Potentiel recomposition (perte de gras + gain de muscle)",
      aliases: ["potentiel-recomposition-perte-de-gras-gain-de-muscle", "potentiel-recomposition"],
      minChars: qualityThresholds.recomposition,
      maxTokens: 4500,
      prompt: () => `Genere UNIQUEMENT la section "## Potentiel recomposition (perte de gras + gain de muscle)".

Contraintes:
- ${narrativeConstraint}
- Longueur minimale: ${qualityThresholds.recomposition} caracteres.
- Inclure: freins biologiques dominants, opportunites court terme, conditions de progression training/nutrition, indicateurs de validation.
- Relier explicitement les conclusions aux marqueurs prioritaires.
- Rester concret et mesurable.

Contexte:
Client: ${userProfile.prenom || "le client"} (${userProfile.gender} ${userProfile.age || ""})
Lifestyle: ${lifestyleLine}
Marqueurs: ${markersTable}
Patterns: ${patternsText}`,
    },
    {
      title: "Lecture compartimentée par axes",
      aliases: ["lecture-compartimentee-par-axes", "analyse-par-axe"],
      minChars: qualityThresholds.axes,
      maxTokens: 9000,
      prompt: () => `Genere UNIQUEMENT la section "## Lecture compartimentée par axes".

Contraintes:
- ${narrativeConstraint}
- Longueur minimale: ${qualityThresholds.axes} caracteres.
- Couvre explicitement chaque axe disponible dans les marqueurs du bilan.
- Pour chaque axe: score, lecture clinique, lecture performance/bodybuilding, actions prioritaires, tests manquants.
- Avant de citer un marqueur comme "manquant", "a doser", "non renseigne" ou "tests recommandes", VERIFIE qu'il n'apparait PAS deja dans la section "Contexte marqueurs" ci-dessous. Si tu vois le marqueur dans cette liste avec une valeur numerique, il est PRESENT, ne le mentionne JAMAIS comme manquant. Cas reel a eviter (Alan Annequin 2026-05-09): testosterone totale et libre etaient dans le bilan, le modele les a re-listees comme "tests manquants essentiels" en bas de section, le client a signale l'erreur.
- Utilise les vrais marqueurs et leurs valeurs. Si un axe est incomplet, ecris "Non renseigne" dans le corps, jamais dans le titre d'axe.
- Interdiction de produire des titres du type "Axe X , Non renseigne": conserver le nom reel de l'axe.
- Pas d'invention, pas de generalites vides.

Contexte marqueurs:
${markersTable}

Axes disponibles:
${axisPromptContext}

Patterns:
${patternsText}`,
    },
    {
      title: "Interconnexions majeures (le pattern)",
      aliases: ["interconnexions-majeures-le-pattern", "interconnexions-majeures"],
      minChars: qualityThresholds.interconnexions,
      maxTokens: 6000,
      prompt: () => `Genere UNIQUEMENT la section "## Interconnexions majeures (le pattern)".

Contraintes:
- ${narrativeConstraint}
- Longueur minimale: ${qualityThresholds.interconnexions} caracteres.
- 5 a 12 interconnexions concretes maximum.
- Chaque interconnexion doit contenir: pattern observe, hypothese mecanistique, ce qui confirmerait, action concrete.
- Lier explicitement les marqueurs entre eux.
- ${interconnexionsCitationTarget > 0 ? `Inserer au moins ${interconnexionsCitationTarget} citations [SRC:ID] dans cette section.` : "Ne pas inventer de citation [SRC:ID] sans ID disponible."}
- Cite [SRC:ID] uniquement si l'ID existe dans le contexte.
- IDs autorises: ${availableSourceIdList}.

Contexte:
Marqueurs: ${markersTable}
Patterns: ${patternsText}
${knowledgeContext ? `\nSources disponibles:\n${knowledgeContext}` : ""}`,
    },
    {
      title: "Deep dive , marqueurs prioritaires",
      aliases: ["deep-dive-marqueurs-prioritaires", "deep-dive"],
      minChars: qualityThresholds.deepDive,
      maxTokens: 10000,
      prompt: () => `Genere UNIQUEMENT la section "## Deep dive , marqueurs prioritaires".

Contraintes:
- ${narrativeConstraint}
- Longueur minimale: ${qualityThresholds.deepDive} caracteres.
- Couvrir au moins ${minDeepDiveMarkers} marqueurs prioritaires, en priorisant critiques/suboptimaux.
- Pour chaque marqueur prioritaire, creer un sous-titre "### Nom du marqueur" puis des paragraphes dedies a la priorite, la valeur et les ranges, la lecture clinique, la lecture performance, les causes plausibles, les facteurs confondants, le plan d'action, les tests a ajouter et le niveau de confiance.
- A la premiere phrase de chaque marqueur, expliquer clairement ce que ce marqueur mesure dans l'organisme et pourquoi il est important ici.
- Interdiction absolue d'insinuer dopage/steroides/anabolisants sans preuve explicite dans les donnees.
- ${deepDiveCitationTarget > 0 ? `Inserer au moins ${deepDiveCitationTarget} citations [SRC:ID] dans cette section et associer les citations aux phrases analytiques.` : "Ne pas inventer de citation [SRC:ID] sans ID disponible."}
- IDs autorises: ${availableSourceIdList}.
- Ne jamais inventer une valeur.

Contexte:
${markersTable}

${deepDivePayload.context ? `Donnees detaillees:\n${deepDivePayload.context}` : ""}`,
    },
    {
      title: "Plan d'action 90 jours",
      aliases: ["plan-d-action-90-jours", "plan-90-jours"],
      minChars: qualityThresholds.plan,
      maxTokens: 9000,
      prompt: () => `Genere UNIQUEMENT la section "## Plan d'action 90 jours".

Contraintes:
- ${narrativeConstraint}
- Longueur minimale: ${qualityThresholds.plan} caracteres.
- Titres exacts obligatoires:
  ## Plan d'action 90 jours
  ### Jours 1-14 (Stabilisation)
  ### Jours 15-30 (Phase d'Attaque)
  ### Jours 31-60 (Consolidation)
  ### Jours 61-90 (Optimisation)
  ### Retest & conditions de prelevement
- Dans chaque phase: objectifs, actions, indicateurs, erreurs a eviter, criteres de progression.
- Lier chaque action aux marqueurs concerns.
- Pas de blabla generique.

Contexte:
Client: ${userProfile.prenom ? userProfile.prenom : "le client"} (${userProfile.gender} ${userProfile.age || ""})
Lifestyle: ${lifestyleLine}
Marqueurs: ${markersTable}
Patterns: ${patternsText}`,
    },
    {
      title: "Nutrition & entraînement",
      aliases: ["nutrition-entrainement", "nutrition-entrainement-traduction-pratique", "protocole-nutrition"],
      minChars: qualityThresholds.nutrition,
      maxTokens: 8000,
      prompt: () => `Genere UNIQUEMENT la section "## Nutrition & entraînement".

Contraintes:
- ${narrativeConstraint}
- Longueur minimale: ${qualityThresholds.nutrition} caracteres.
- Sous-sections obligatoires: Nutrition / Entrainement.
- Pour chaque recommandation: biomarqueur cible, rationale, implementation pratique.
- Inclure structure hebdo, timing glucides, proteines/fibres, micronutriments, volume/intensite, cardio, NEAT, recuperation.
- ${nutritionCitationTarget > 0 ? `Inserer au moins ${nutritionCitationTarget} citation [SRC:ID] reliee aux recommandations majeures.` : "Ne pas inventer de citation [SRC:ID] sans ID disponible."}
- IDs autorises: ${availableSourceIdList}.
- Aucun chiffre invente quand la donnee manque: signaler "Non renseigne".

Contexte:
Client: ${userProfile.prenom || "le client"} (${userProfile.gender} ${userProfile.age || ""})
Lifestyle: ${lifestyleLine}
Marqueurs: ${markersTable}`,
    },
    {
      title: "Suppléments & stack",
      aliases: ["supplements-stack", "supplements-stack-minimaliste-mais-impact", "protocole-supplements"],
      minChars: qualityThresholds.supplements,
      maxTokens: 9000,
      prompt: () => `Genere UNIQUEMENT la section "## Suppléments & stack".

Contraintes:
- ${narrativeConstraint}
- Longueur minimale: ${qualityThresholds.supplements} caracteres.
- 8 a 16 options max, classees par priorite (Niveau 1/2/3).
- Pour chaque supplement: pourquoi (marqueur/pattern vise), dose indicative, timing, duree, precautions/interactions, critere d'efficacite au retest.
- Integrer ce qui est deja utilise par le client si l'info est disponible.
- Si la niacine est proposee et que ALT > 40 U/L (ou foie en souffrance), imposer demarrage bas, progression graduelle et controle transaminases a mi-parcours.
- Interdiction absolue d'insinuer dopage/steroides/anabolisants sans preuve explicite dans les donnees.
- ${supplementsCitationTarget > 0 ? `Inserer au moins ${supplementsCitationTarget} citations [SRC:ID] sur les options prioritaires.` : "Ne pas inventer de citation [SRC:ID] sans ID disponible."}
- IDs autorises: ${availableSourceIdList}.
- Pas d'invention de marqueur.

Contexte:
Supplements deja utilises: ${userProfile.supplementsUsed?.join(", ") || "Non renseigne"}
Marqueurs action requise: ${analysisResult.summary.action.join(", ") || "Aucun"}
Marqueurs surveillance: ${analysisResult.summary.watch.join(", ") || "Aucun"}
${markersTable}`,
    },
    {
      title: "Annexes (références et vigilance)",
      aliases: ["annexes-references-et-vigilance", "annexes-ultra-long", "annexes"],
      minChars: 900,
      maxTokens: 5000,
      prompt: () => `Genere UNIQUEMENT la section "## Annexes (références et vigilance)".

Contraintes:
- ${narrativeConstraint}
- Longueur minimale: 900 caracteres.
- Inclure:
  - Annexe A: marqueurs secondaires (statut + interpretation + action rapide)
  - Annexe B: hypotheses ouvertes + tests de confirmation
  - Annexe C: glossaire utile
  - Vigilance
- Rester strictement aligne aux donnees.

Contexte:
${markersTable}`,
    },
  ];

  const generateSingleSection = async (
    spec: (typeof sectionRepairSpecs)[number]
  ): Promise<string> => {
    const isAxesSection = spec.aliases.some((alias) =>
      ["lecture-compartimentee-par-axes", "analyse-par-axe"].includes(alias)
    );
    const maxSectionAttempts = isAxesSection ? 2 : 1;

    for (let attempt = 1; attempt <= maxSectionAttempts; attempt += 1) {
      const sectionStream = await anthropic.messages.create({
        model: modelName,
        max_tokens: spec.maxTokens,
        system:
          "Tu es un expert bloodwork performance. Genere uniquement la section demandee en markdown, sans texte hors section, avec style narratif strict sans puces, sans numerotation, sans tableaux et avec orthographe francaise irreprochable (accents obligatoires).",
        messages: [{ role: "user", content: spec.prompt() }],
        stream: true,
      });

      let sectionContent = "";
      for await (const event of sectionStream) {
        if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
          sectionContent += event.delta.text;
        }
      }

      const generated = sectionContent.trim();
      if (!generated) continue;
      const normalizedGenerated = parseH2Sections(generated);
      let body = "";
      if (normalizedGenerated.length) {
        body = normalizedGenerated[0].content.replace(/^\s*(?:\*\*)?##\s+.+?(?:\*\*)?\s*$/m, "").trim();
      } else {
        body = generated;
      }
      const candidate = normalizeFrenchTypography(
        sanitizeSourceCitations(`## ${spec.title}\n\n${body}`, availableSourceIdArray)
      ).trim();

      if (isAxesSection && PLACEHOLDER_AXIS_HEADING_REGEX.test(candidate)) {
        console.warn(
          `[BloodAnalysis] Axes section attempt ${attempt} rejected: placeholder axis heading detected.`
        );
        continue;
      }

      return candidate;
    }
    return "";
  };

  const preflightCreditsCheck = async (): Promise<void> => {
    try {
      const response = await anthropic.messages.create({
        model: modelName,
        max_tokens: 8,
        system: "Reponds uniquement: OK",
        messages: [{ role: "user", content: "OK" }],
      });
      if (!response?.content?.length) {
        throw new Error("AI_PRECHECK_EMPTY_RESPONSE");
      }
    } catch (error) {
      if (isAnthropicLowCreditError(error)) {
        throw new Error("AI_CREDIT_BALANCE_LOW");
      }
      throw error;
    }
  };

  if (parallelSectionsEnabled) {
    console.log(
      `[BloodAnalysis] Parallel sections mode enabled (concurrency=${sectionConcurrency}, force=${forceParallelSectionGeneration})`
    );
    if (forceParallelSectionGeneration && output.trim().length === 0) {
      await preflightCreditsCheck();
    }
    const baselineSections = parseH2Sections(output);
    const limiter = pLimit(sectionConcurrency);
    const parallelResults = await Promise.all(
      sectionRepairSpecs.map((spec) =>
        limiter(async () => {
          const current = findSectionByAliases(baselineSections, spec.aliases);
          const currentLength = current?.content.trim().length || 0;
          const needsRepair = !current || currentLength < spec.minChars;
          console.log(
            `[BloodAnalysis] Section "${spec.title}": ${current ? `${currentLength} chars` : "missing"} (target >= ${spec.minChars})`
          );

          if (!forceParallelSectionGeneration && !needsRepair) {
            return { spec, sectionToInsert: "", currentLength, skipped: true };
          }

          try {
            const sectionToInsert = await generateSingleSection(spec);
            return { spec, sectionToInsert, currentLength, skipped: false };
          } catch (err: any) {
            console.error(
              `[BloodAnalysis] ❌ Failed to generate section "${spec.title}" in parallel mode:`,
              err.message
            );
            if (isAnthropicLowCreditError(err)) {
              lowCreditErrorDetected = true;
            }
            return { spec, sectionToInsert: "", currentLength, skipped: false };
          }
        })
      )
    );

    for (const result of parallelResults) {
      if (!result.sectionToInsert) continue;
      output = upsertSectionByAliases(output, result.spec.aliases, result.sectionToInsert);
      console.log(
        `[BloodAnalysis] ✅ Section "${result.spec.title}" upserted (${result.sectionToInsert.length} chars, previous ${result.currentLength})`
      );
    }
  } else {
    for (const spec of sectionRepairSpecs) {
      const parsed = parseH2Sections(output);
      const current = findSectionByAliases(parsed, spec.aliases);
      const currentLength = current?.content.trim().length || 0;
      const needsRepair = !current || currentLength < spec.minChars;

      console.log(
        `[BloodAnalysis] Section "${spec.title}": ${current ? `${currentLength} chars` : "missing"} (target >= ${spec.minChars})`
      );

      if (!needsRepair) continue;

      console.log(`[BloodAnalysis] ⚠️ Repairing section "${spec.title}"...`);
      try {
        const sectionToInsert = await generateSingleSection(spec);
        if (!sectionToInsert) continue;
        output = upsertSectionByAliases(output, spec.aliases, sectionToInsert);
        console.log(
          `[BloodAnalysis] ✅ Section "${spec.title}" repaired (${sectionToInsert.length} chars, previous ${currentLength})`
        );
      } catch (err: any) {
        console.error(`[BloodAnalysis] ❌ Failed to repair "${spec.title}":`, err.message);
        if (isAnthropicLowCreditError(err)) {
          lowCreditErrorDetected = true;
          break;
        }
      }
    }
  }

  console.log(`[BloodAnalysis] Multi-pass complete. Final output length: ${output.length} chars`);

  if (lowCreditErrorDetected && output.trim().length === 0) {
    throw new Error("AI_CREDIT_BALANCE_LOW");
  }

  const sourceSanitizedOutput = sanitizeSourceCitations(output, availableSourceIdArray);
  const orderedOutput = reorderReportSections(normalizeFrenchTypography(sourceSanitizedOutput));
  const withSources = ensureSourcesSection(orderedOutput, knowledgeContext);
  const normalizedOutput = reorderReportSections(normalizeFrenchTypography(withSources));
  const trimmedOutput = trimAiAnalysis(normalizedOutput);
  const finalStructureCheck = validateReportStructure(
    trimmedOutput,
    analysisResult.markers,
    availableSourceIds
  );
  if (!finalStructureCheck.ok) {
    const reasons = finalStructureCheck.reasons.join(" | ");
    throw new Error(`AI_REPORT_QUALITY_GATE_FAILED:${reasons}`);
  }
  return trimmedOutput;
}

// ============================================
// KNOWLEDGE BASE INTEGRATION
// ============================================

const KNOWLEDGE_KEYWORDS_BY_MARKER: Record<string, string[]> = {
  hdl: ["hdl", "reverse cholesterol transport", "aerobic training", "insulin resistance", "apoa1"],
  ldl: ["ldl", "apob", "atherogenic", "non-hdl", "particle number"],
  triglycerides: ["triglycerides", "insulin resistance", "hepatic lipogenesis", "carbohydrate overload", "epa dha"],
  apob: ["apob", "atherogenic particles", "cardiovascular risk", "non-hdl"],
  apoa1: ["apoa1", "hdl", "reverse cholesterol transport"],
  glycemie_jeun: ["fasting glucose", "glycemia", "insulin resistance", "hba1c"],
  hba1c: ["hba1c", "glycemic control", "insulin resistance"],
  insuline_jeun: ["fasting insulin", "insulin resistance", "homa-ir"],
  homa_ir: ["homa-ir", "insulin resistance", "metabolic syndrome"],
  crp_us: ["hs-crp", "low grade inflammation", "cardiometabolic inflammation"],
  ferritine: ["ferritin", "iron overload", "inflammation", "transferrin saturation"],
  alt: ["alt", "liver enzymes", "metabolic liver", "nafld"],
  ast: ["ast", "liver enzymes", "hepatic stress"],
  ggt: ["ggt", "hepatic stress", "oxidative stress", "metabolic syndrome"],
  cortisol: ["cortisol", "hpa axis", "stress recovery", "sleep restriction"],
  testosterone_total: ["testosterone", "androgen", "hormonal axis", "sleep testosterone"],
  tsh: ["tsh", "thyroid", "t3", "metabolic rate"],
  t3_libre: ["t3", "thyroid", "energy expenditure", "metabolic adaptation"],
};

const KNOWLEDGE_MARKER_ALIASES: Record<string, string[]> = {
  hdl: ["high density lipoprotein", "hdl cholesterol", "reverse cholesterol transport"],
  ldl: ["low density lipoprotein", "ldl cholesterol", "atherogenic lipoprotein"],
  triglycerides: ["triglyceride", "serum triglycerides", "tg hdl ratio"],
  apob: ["apolipoprotein b", "apo b", "particle number"],
  apoa1: ["apolipoprotein a1", "apo a1", "protective lipoprotein"],
  cholesterol_total: ["total cholesterol", "serum cholesterol"],
  glycemie_jeun: ["fasting glucose", "glucose a jeun", "serum glucose"],
  hba1c: ["hemoglobin a1c", "hémoglobine glyquée", "glycated hemoglobin"],
  insuline_jeun: ["fasting insulin", "insuline a jeun", "insulin resistance"],
  homa_ir: ["homa ir", "insulin resistance index"],
  crp_us: ["high sensitivity crp", "hs-crp", "c reactive protein"],
  ferritine: ["ferritin", "iron storage", "acute phase reactant"],
  transferrine_sat: ["transferrin saturation", "sat transferrine"],
  alt: ["alanine aminotransferase", "alt liver enzyme"],
  ast: ["aspartate aminotransferase", "ast liver enzyme"],
  ggt: ["gamma glutamyl transferase", "ggt liver marker"],
  creatinine: ["serum creatinine", "renal function"],
  egfr: ["estimated glomerular filtration rate", "egfr renal"],
  testosterone_total: ["total testosterone", "serum testosterone", "androgen status"],
  testosterone_libre: ["free testosterone", "bioavailable testosterone"],
  shbg: ["sex hormone binding globulin", "shbg"],
  estradiol: ["estradiol", "estrogen e2"],
  prolactine: ["prolactin"],
  cortisol: ["serum cortisol", "hpa axis cortisol"],
  tsh: ["thyroid stimulating hormone", "tsh thyroid"],
  t3_libre: ["free t3", "triiodothyronine"],
  t4_libre: ["free t4", "thyroxine"],
  t3_reverse: ["reverse t3", "rt3"],
  vitamine_d: ["25 hydroxy vitamin d", "vitamin d"],
  b12: ["vitamin b12", "cobalamin"],
  folate: ["folate", "vitamin b9"],
  magnesium_rbc: ["rbc magnesium", "magnesium erythrocyte"],
  zinc: ["serum zinc"],
};

export async function getBloodworkKnowledgeContext(
  markers: MarkerAnalysis[],
  patterns: DiagnosticPattern[]
): Promise<string> {
  const sourceFilter = [
    "huberman",
    "applied_metabolics",
    "peter_attia",
    "examine",
    "mpmd",
    "sbs",
    "marek_health",
    "chris_masterjohn",
    "renaissance_periodization",
    "pubmed",
    "newsletter",
    "achzod",
    "manual",
  ];

  const keywordSet = new Set<string>();
  const focusTokenSet = new Set<string>();
  const getMarkerNumericValue = (idCandidates: string[], nameHints: string[] = []): number | null => {
    const normalizedIdCandidates = idCandidates.map((value) => normalizePlain(value));
    const normalizedNameHints = nameHints.map((value) => normalizePlain(value));
    for (const marker of markers) {
      const rawValue = Number(marker?.value);
      if (!Number.isFinite(rawValue)) continue;
      const markerId = normalizePlain(String(marker?.markerId || ""));
      const markerName = normalizePlain(String(marker?.name || ""));
      if (
        normalizedIdCandidates.some((candidate) => candidate && (markerId === candidate || markerId.includes(candidate))) ||
        normalizedNameHints.some((hint) => hint && markerName.includes(hint))
      ) {
        return rawValue;
      }
    }
    return null;
  };

  for (const marker of markers) {
    if (!marker || marker.status === "optimal") continue;
    const markerName = typeof marker.name === "string" ? marker.name : "";
    const markerId = typeof marker.markerId === "string" ? marker.markerId : "";
    if (!markerName && !markerId) continue;
    if (markerName) keywordSet.add(markerName.toLowerCase());
    if (markerId) {
      keywordSet.add(markerId.toLowerCase().replace(/_/g, " "));
      const panelName = getMarkerPanelName(markerId).toLowerCase();
      keywordSet.add(panelName);
      focusTokenSet.add(normalizePlain(markerId).replace(/_/g, " "));
      focusTokenSet.add(normalizePlain(markerName));
      focusTokenSet.add(normalizePlain(panelName));
      const markerKeywords = KNOWLEDGE_KEYWORDS_BY_MARKER[markerId] || [];
      for (const token of markerKeywords) {
        keywordSet.add(token.toLowerCase());
        focusTokenSet.add(normalizePlain(token));
      }
      const markerAliases = KNOWLEDGE_MARKER_ALIASES[markerId] || [];
      for (const alias of markerAliases) {
        keywordSet.add(alias.toLowerCase());
        focusTokenSet.add(normalizePlain(alias));
      }
    }
  }

  for (const pattern of patterns) {
    if (pattern?.name) keywordSet.add(pattern.name.toLowerCase());
    if (pattern?.name) focusTokenSet.add(normalizePlain(pattern.name));
    const causes = Array.isArray(pattern?.causes) ? pattern.causes : [];
    for (const cause of causes) {
      keywordSet.add(cause.toLowerCase());
      focusTokenSet.add(normalizePlain(cause));
    }
  }

  keywordSet.add("bloodwork");
  keywordSet.add("biomarker");
  keywordSet.add("insulin resistance");
  keywordSet.add("hormones");
  keywordSet.add("apob");
  keywordSet.add("lipid profile");
  keywordSet.add("cardiometabolic risk");
  keywordSet.add("anabolism");
  keywordSet.add("hypertrophy");
  keywordSet.add("recomposition");
  keywordSet.add("testosterone optimization");
  keywordSet.add("metabolic rate");
  keywordSet.add("lipolysis");
  keywordSet.add("insulin sensitivity");
  keywordSet.add("muscle protein synthesis");
  keywordSet.add("recovery");

  const freeTestosterone = getMarkerNumericValue(
    ["testosterone_libre", "free_testosterone", "testosterone_free"],
    ["testosterone libre", "free testosterone"]
  );
  const hdl = getMarkerNumericValue(["hdl"], ["hdl"]);
  const triglycerides = getMarkerNumericValue(["triglycerides", "tg"], ["triglycerides", "triglycerides"]);
  const apoA1 = getMarkerNumericValue(["apo_a1", "apoa1"], ["apolipoproteines a1", "apoa1", "apo a1"]);
  const alt = getMarkerNumericValue(["alt"], ["alt", "alanine aminotransferase"]);
  const ggt = getMarkerNumericValue(["ggt"], ["ggt", "gamma glutamyl"]);

  const lowFreeTestosterone = freeTestosterone !== null && freeTestosterone < 15;
  const dyslipidemiaPattern =
    (hdl !== null && hdl < 40) ||
    (triglycerides !== null && triglycerides > 120) ||
    (apoA1 !== null && apoA1 < 125);
  const liverStressPattern = (alt !== null && alt > 40) || (ggt !== null && ggt > 25);

  if (lowFreeTestosterone) {
    const androgenKeywords = [
      "tongkat ali",
      "fadogia agrestis",
      "boron supplementation",
      "shbg reduction",
      "free testosterone optimization",
      "lh fsh axis",
      "huberman testosterone",
      "applied metabolics testosterone",
    ];
    for (const keyword of androgenKeywords) {
      keywordSet.add(keyword);
      focusTokenSet.add(normalizePlain(keyword));
    }
  }

  if (dyslipidemiaPattern) {
    const lipidKeywords = [
      "berberine triglycerides",
      "citrus bergamot lipid profile",
      "myo inositol insulin sensitivity",
      "epa dha triglycerides",
      "tg hdl ratio intervention",
      "applied metabolics lipids",
      "examine berberine",
    ];
    for (const keyword of lipidKeywords) {
      keywordSet.add(keyword);
      focusTokenSet.add(normalizePlain(keyword));
    }
  }

  if (liverStressPattern) {
    const liverKeywords = [
      "tudca liver enzymes",
      "nac glutathione liver",
      "taurine liver support",
      "silymarin alt reduction",
      "nafld supplement protocol",
      "applied metabolics liver",
      "huberman liver health",
    ];
    for (const keyword of liverKeywords) {
      keywordSet.add(keyword);
      focusTokenSet.add(normalizePlain(keyword));
    }
  }

  const keywords = Array.from(keywordSet).filter((keyword) => keyword.length >= 3).slice(0, 55);
  if (!keywords.length) return "";

  try {
    const primaryArticles = await searchArticles(keywords, 40, sourceFilter);
    let allArticles = [...primaryArticles];

    const expertQuerySeeds = [
      "free testosterone tongkat ali",
      "fadogia agrestis",
      "berberine triglycerides hdl",
      "citrus bergamot lipid profile",
      "tudca liver enzymes",
      "taurine liver metabolism",
      "myo inositol insulin sensitivity",
    ];
    const expertSources: Array<"huberman" | "applied_metabolics" | "examine"> = [
      "huberman",
      "applied_metabolics",
      "examine",
    ];
    for (const source of expertSources) {
      for (const seed of expertQuerySeeds) {
        try {
          const sourceHits = await searchArticles([seed], 2, [source] as any);
          allArticles.push(...sourceHits);
        } catch {
          // Ignore source-specific retrieval failures and continue with broader corpus.
        }
      }
    }

    if (allArticles.length < 12) {
      const markerQueries = markers
        .filter((marker) => marker.status !== "optimal")
        .slice(0, 6)
        .map((marker) => `${marker.name || ""} ${(marker.markerId || "").replace(/_/g, " ")}`.trim())
        .filter(Boolean);

      for (const query of markerQueries) {
        try {
          const extra = await searchFullText(query, 6);
          allArticles.push(...extra);
        } catch {
          // Ignore full-text errors and keep primary retrieval.
        }
      }
    }

    const deduped = new Map<string, ScrapedArticle>();
    for (const article of allArticles) {
      const key = article.id || `${article.source}:${normalizePlain(article.title)}`;
      if (!deduped.has(key)) deduped.set(key, article);
    }

    const tokenSet = new Set(
      keywords
        .flatMap((keyword) => normalizePlain(keyword).split(/\s+/))
        .filter((token) => token.length >= 3)
    );

    const scoreArticle = (article: ScrapedArticle) => {
      const title = normalizePlain(article.title || "");
      const category = normalizePlain(article.category || "");
      const haystack = normalizePlain(`${article.title} ${article.content.slice(0, 1200)} ${(article.keywords || []).join(" ")}`);
      let score = 0;
      for (const token of tokenSet) {
        if (haystack.includes(token)) score += 1;
      }
      if (article.source === "manual") {
        const manualCategory = normalizePlain(article.category || "");
        const manualKeywords = (article.keywords || []).map((token) => normalizePlain(token));
        if (
          manualCategory.includes("bloodwork") ||
          manualCategory.includes("hormones") ||
          manualCategory.includes("metabolisme") ||
          manualCategory.includes("lipides") ||
          manualKeywords.some((token) => token.includes("pubmed"))
        ) {
          score += 3;
        }
      }
      let focusHits = 0;
      for (const token of focusTokenSet) {
        if (!token || token.length < 3) continue;
        if (title.includes(token) || category.includes(token)) {
          score += 3;
          focusHits += 1;
          continue;
        }
        if (haystack.includes(token)) {
          score += 1;
          focusHits += 1;
        }
      }
      if (article.source === "huberman" || article.source === "applied_metabolics") score += 2;
      if (article.source === "peter_attia" || article.source === "examine") score += 1;
      if (focusTokenSet.size > 0 && focusHits === 0) score -= 5;
      if (focusTokenSet.size > 0 && focusHits >= 2) score += 2;
      return score;
    };

    const scored = Array.from(deduped.values())
      .map((article) => ({ article, score: scoreArticle(article) }))
      .sort((a, b) => b.score - a.score);

    const sorted = scored
      .filter((item) => item.score >= 3)
      .map((item) => item.article)
      .slice(0, 40);

    const selected: ScrapedArticle[] = [];
    const selectedKeys = new Set<string>();
    const rememberSelected = (article: ScrapedArticle) => {
      const key = article.id || `${article.source}:${normalizePlain(article.title || "")}`;
      if (selectedKeys.has(key)) return false;
      selectedKeys.add(key);
      selected.push(article);
      return true;
    };

    const prioritySources: Array<{ source: string; min: number }> = [
      { source: "huberman", min: 1 },
      { source: "applied_metabolics", min: 1 },
      { source: "examine", min: 1 },
      { source: "pubmed", min: 1 },
      { source: "peter_attia", min: 1 },
    ];
    const priorityPool = scored.map((item) => item.article);
    for (const { source, min } of prioritySources) {
      let taken = 0;
      for (const article of priorityPool) {
        if (taken >= min) break;
        if (article.source !== source) continue;
        if (rememberSelected(article)) taken += 1;
      }
    }

    const perSourceCount = new Map<string, number>();
    for (const article of selected) {
      perSourceCount.set(article.source, (perSourceCount.get(article.source) || 0) + 1);
    }
    for (const article of sorted) {
      if (selected.length >= 20) break;
      const key = article.id || `${article.source}:${normalizePlain(article.title || "")}`;
      if (selectedKeys.has(key)) continue;
      const count = perSourceCount.get(article.source) || 0;
      const perSourceLimit =
        article.source === "manual"
          ? 8
          : article.source === "huberman" || article.source === "applied_metabolics" || article.source === "examine"
            ? 5
            : 3;
      if (count >= perSourceLimit) continue;
      selected.push(article);
      selectedKeys.add(key);
      perSourceCount.set(article.source, count + 1);
      if (selected.length >= 20) break;
    }

    if (!selected.length) return "";

    const contextLines: string[] = [
      "SOURCES BIBLIOTHEQUE DISPONIBLES (UTILISE [SRC:ID] UNIQUEMENT AVEC CES IDS):",
    ];

    for (const article of selected) {
      const sourceId = getSourceRefId(article);
      const label = SOURCE_LABELS[article.source] || article.source;
      const excerpt = article.content.replace(/\s+/g, " ").trim().slice(0, 500);
      contextLines.push(`[SRC:${sourceId}] ${label} , ${article.title}`);
      if (article.url) contextLines.push(`URL: ${article.url}`);
      if (article.category) contextLines.push(`Categorie: ${article.category}`);
      if (article.keywords?.length) {
        const keywordsPreview = article.keywords.slice(0, 10).join(", ");
        contextLines.push(`Mots-cles: ${keywordsPreview}`);
      }
      contextLines.push(`Extrait: ${excerpt}${excerpt.length >= 500 ? "..." : ""}`);
      contextLines.push("");
    }

    return contextLines.join("\n").trim();
  } catch (error) {
    console.error("[BloodAnalysis] Knowledge context retrieval failed:", error);
    return "";
  }
}
