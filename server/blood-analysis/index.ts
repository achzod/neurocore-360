/**
 * NEUROCORE 360 - Blood Analysis System
 * Analyse de bilans sanguins avec ranges OPTIMAUX vs normaux
 * Sources: Examine, Peter Attia, Marek Health, Chris Masterjohn, RP, MPMD
 */

import Anthropic from "@anthropic-ai/sdk";
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

const normalizeMarkerValue = (markerId: string, value: number, unit?: string): number => {
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

  if (markerId === "testosterone_total" && sourceUnit === "nmol/L") {
    return roundValue(value * 28.84, 1);
  }
  if (markerId === "testosterone_libre" && sourceUnit === "pmol/L") {
    return roundValue(value / 3.47, 2);
  }
  if (markerId === "estradiol" && sourceUnit === "pmol/L") {
    return roundValue(value / 3.67, 1);
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

  const lipidMmolToMg = 38.67;
  const trigMmolToMg = 88.57;

  if (["ldl", "hdl", "apob", "lpa", "cholesterol", "cholesterol_total", "apo_a1"].includes(markerId)) {
    if (sourceUnit === "mmol/L") return Math.round(value * lipidMmolToMg);
    if (sourceUnit === "g/L") return Math.round(value * 100);
    if (sourceUnit === "mg/L") return Math.round(value / 10);
    if (value <= 1.9) return Math.round(value * 100);
    if (value < 10) return Math.round(value * lipidMmolToMg);
  }

  if (markerId === "triglycerides") {
    if (sourceUnit === "mmol/L") return Math.round(value * trigMmolToMg);
    if (sourceUnit === "g/L") return Math.round(value * 100);
    if (sourceUnit === "mg/L") return Math.round(value / 10);
    if (value <= 1.9) return Math.round(value * 100);
    if (value < 10) return Math.round(value * trigMmolToMg);
  }

  return value;
};

const MARKER_SYNONYMS: Record<string, RegExp[]> = {
  testosterone_total: [/^testost[ée]rone\s*$/i, /testost[ée]rone\s*tot/i, /testost[ée]rone\s*totale/i, /testost[ée]rone\s*\(\d\)/i],
  testosterone_libre: [/testost[ée]rone\s*libre/i, /free\s*testosterone/i],
  shbg: [/shbg/i, /globuline.*sex/i],
  estradiol: [/estradiol/i, /\be2\b/i],
  lh: [/\blh\b/i, /luteinis/i],
  fsh: [/\bfsh\b/i, /folliculo/i],
  prolactine: [/prolactine/i],
  dhea_s: [/dhea[-\s]?s/i],
  cortisol: [/cortisol/i],
  igf1: [/igf[-\s]?1/i],
  tsh: [/t\.?\s*s\.?\s*h\.?/i, /thyr[eé]o?stim/i],
  t4_libre: [/t4\s*libre/i, /ft4/i, /thyroxine\s*libre/i],
  t3_libre: [/t3\s*libre/i, /ft3/i, /triiodothyronine\s*libre/i],
  t3_reverse: [/t3\s*reverse/i, /\brt3\b/i],
  anti_tpo: [/anti[-\s]?tpo/i, /anti[-\s]?thyro/i],
  glycemie_jeun: [/glyc[ée]mie.*je[uû]n/i, /glucose.*je[uû]n/i, /glyc[ée]mie\s*à\s*jeun/i],
  hba1c: [/hba1c/i, /hba\s*1c/i, /h[ée]moglobine\s*gly/i, /h[ée]moglobine\s*a1c/i],
  insuline_jeun: [/insuline.*je[uû]n/i],
  homa_ir: [/homa[-\s]?ir/i, /indice\s*de\s*homa/i],
  fructosamine: [/fructosamine/i],
  triglycerides: [/triglyc[ée]rides/i],
  hdl: [/cholest[ée]rol\s*h\.?d\.?l/i, /\bh\.?d\.?l\b/i, /\bhdl[-\s]?c\b/i],
  ldl: [/cholest[ée]rol\s*l\.?d\.?l.*mesur[eé]/i, /\bl\.?d\.?l\s+mesur[eé]/i],
  apob: [/apolipoprot[ée]ine.*b/i, /apo\s*b/i],
  lpa: [/lp\s*\(?a\)?/i, /lipoprot[ée]ine\s*\(a\)/i],
  cholesterol_total: [/cholest[ée]rol\s*total/i],
  apo_a1: [/apolipoprot[ée]ine.*a1/i, /apo\s*a1/i],
  crp_us: [/crp.*(us|ultra)/i, /crp\s*hs/i, /c[-\s]?r[ée]active/i],
  homocysteine: [/homocyst[ée]ine/i],
  ferritine: [/ferritine/i],
  fer_serique: [/fer\s*s[ée]rique/i, /sid[ée]r[ée]mie/i],
  transferrine_sat: [/saturation.*transferrine/i, /coef.*saturation/i],
  vitamine_d: [/vitamine\s*d\s*25\s*oh/i, /25[-\s]?oh\s*vit/i, /vitamine\s*d/i],
  b12: [/vitamine\s*b12/i, /cobalamine/i],
  folate: [/folate/i, /vitamine\s*b9/i],
  magnesium_rbc: [/magn[eé]sium.*rbc/i, /magn[eé]sium.*intra/i],
  zinc: [/\bzinc\b/i],
  alt: [/\balt\b/i, /\balat\b/i, /\bsgpt\b/i],
  ast: [/\bast\b/i, /\basat\b/i, /\bsgot\b/i],
  ggt: [/\bggt\b/i, /gamma[-\s]*gt/i],
  creatinine: [/cr[ée]atinine/i],
  egfr: [/\begfr\b/i, /d[ée]bit.*filtration/i, /d\.?\s*f\.?\s*g\.?/i],
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
  /(objectif|recommand|valeur|référence|reference|score|esc|risque|guide|interpret|evaluation|page|\bhas\b)/i;

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
          if (!nextLine || DATE_LINE_REGEX.test(nextLine) || SKIP_LINE_REGEX.test(nextLine) || RANGE_LINE_REGEX.test(nextLine)) {
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

  const matches = snippet.matchAll(/[<>]?\s*\d+(?:[.,]\d+)?/g);
  for (const match of matches) {
    const raw = match[0].replace(/[<>]/g, "").replace(",", ".").trim();
    const value = Number(raw);
    if (Number.isNaN(value)) continue;
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
    if (dateMatches.some((range) => start >= range.start && end <= range.end)) continue;
    if (isYearLike(value, raw) || isHugeNumber(raw, value)) continue;
    const before = snippet.slice(Math.max(0, start - 3), start);
    const after = snippet.slice(end, end + 3);
    if (before.includes("-") || after.includes("-") || before.includes("–") || after.includes("–")) {
      continue;
    }
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

  for (const [markerId, patterns] of entries) {
    for (const pattern of patterns) {
      const regex = new RegExp(pattern.source, "gi");
      let match: RegExpExecArray | null;
      while ((match = regex.exec(cleaned)) !== null) {
        const start = match.index;
        const end = start + match[0].length;
        const after = cleaned.slice(end, end + 55);
        const before = cleaned.slice(Math.max(0, start - 55), start);
        const value = extractNumberFromSnippet(after) ?? extractNumberFromSnippet(before);
        if (value === null) continue;
        const unit = findUnit(after) || findUnit(before);
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

  const nomLine = findLine(/nom\s*de\s*naissance/i) || findLine(/\bnom\s*[:]/i);
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
  const blockedEmail = /(labo|biogroup|laboratoire|rgpd|eurofins|biomnis|contact)/i;
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

  const userPrompt = `Tu recois le texte extrait d'un bilan sanguin PDF (${fileName}).
Ta mission: extraire les valeurs numeriques et les associer aux biomarqueurs autorises.

Liste autorisee: ${markerList}

Regles:
- Retourne UNIQUEMENT un JSON array (sans markdown).
- Chaque element: {"markerId": "...", "value": number}
- Utilise seulement les markerId de la liste autorisee.
- Convertis dans l'unite attendue (celle de la liste autorisee).

Conversions utiles:
- Cholesterol / HDL / LDL / ApoB / Lp(a): mmol/L -> mg/dL (x38.67), g/L -> mg/dL (x100)
- Triglycerides: mmol/L -> mg/dL (x88.57), g/L -> mg/dL (x100)
- Glycemie: mmol/L -> mg/dL (x18)
- Vitamine D: nmol/L -> ng/mL (÷2.5)
- Creatinine: µmol/L -> mg/dL (÷88.4)

TEXTE PDF:
${cleaned.slice(0, 12000)}`;

  const response = await anthropic.messages.create({
    model: "claude-opus-4-6",
    max_tokens: 1200,
    system: "Tu es un extracteur strict de biomarqueurs. Tu ne renvoies que du JSON valide.",
    messages: [{ role: "user", content: userPrompt }],
  });

  const textContent = response.content.find((c) => c.type === "text");
  const extracted = extractJsonArray(textContent?.text || "")
    .map((item) => ({
      markerId: String((item as any).markerId || "").trim(),
      value: normalizeMarkerValue(
        String((item as any).markerId || "").trim(),
        Number((item as any).value)
      ),
    }))
    .filter((item) => item.markerId && !Number.isNaN(item.value))
    .filter((item) => Boolean(BIOMARKER_RANGES[item.markerId]))
    .filter((item) => isPlausibleMarkerValue(item.markerId, item.value));

  for (const item of extracted) {
    if (!hasMarkerValueInText(cleaned, item.markerId)) continue;
    if (!unique.has(item.markerId)) {
      unique.set(item.markerId, item);
    }
  }

  return addComputedMarkers(Array.from(unique.values()));
}

function getMarkerStatus(value: number, range: BiomarkerRange): "optimal" | "normal" | "suboptimal" | "critical" {
  // Check if value is within optimal range
  if (value >= range.optimalMin && value <= range.optimalMax) {
    return "optimal";
  }

  // Check if value is within normal range
  if (value >= range.normalMin && value <= range.normalMax) {
    return "normal"; // In normal but not optimal
  }

  // Check if critically out of range (>20% outside normal)
  const normalSpread = range.normalMax - range.normalMin;
  if (value < range.normalMin - normalSpread * 0.2 || value > range.normalMax + normalSpread * 0.2) {
    return "critical";
  }

  return "suboptimal";
}

function detectPatterns(markers: MarkerAnalysis[]): DiagnosticPattern[] {
  const detectedPatterns: DiagnosticPattern[] = [];
  const markerMap = new Map(markers.map(m => [m.markerId, m]));

  for (const pattern of DIAGNOSTIC_PATTERNS) {
    let matchCount = 0;
    let totalMarkers = Object.keys(pattern.markers).length;

    for (const [markerId, expectedStatus] of Object.entries(pattern.markers)) {
      const marker = markerMap.get(markerId);
      if (!marker) continue;

      const range = BIOMARKER_RANGES[markerId];
      if (!range) continue;

      const isLow = marker.value < range.optimalMin;
      const isHigh = marker.value > range.optimalMax;

      if ((expectedStatus === "low" && isLow) ||
          (expectedStatus === "high" && isHigh) ||
          (expectedStatus === "normal" && marker.status === "optimal")) {
        matchCount++;
      }
    }

    // If at least 50% of markers match the pattern
    if (matchCount >= totalMarkers * 0.5) {
      detectedPatterns.push(pattern);
    }
  }

  return detectedPatterns;
}

const SOURCE_LABELS: Record<string, string> = {
  huberman: "Huberman Lab",
  applied_metabolics: "Applied Metabolics",
  newsletter: "NeuroCore Newsletter",
  peter_attia: "Dr. Peter Attia",
  mpmd: "Derek de MPMD",
  chris_masterjohn: "Dr. Chris Masterjohn",
  examine: "Examine.com",
  marek_health: "Marek Health",
  sbs: "Stronger by Science",
  renaissance_periodization: "Renaissance Periodization",
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
    const pct = Math.round(((min - value) / min) * 100);
    return `-${pct}% (sous la limite)`;
  }
  if (value > max) {
    const pct = Math.round(((value - max) / max) * 100);
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
  const sourceLine = `- [SRC:${sourceId}] ${label} — ${title}`;
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
    const sourceLines = articles.slice(0, 3).map(buildSourceExcerpt);

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

const REQUIRED_REPORT_SECTIONS: Array<{ key: string; aliases: string[]; minChars: number }> = [
  { key: "synthese", aliases: ["synthese-executive"], minChars: 1200 },
  { key: "qualite", aliases: ["qualite-des-donnees-limites"], minChars: 850 },
  { key: "tableau", aliases: ["tableau-de-bord-scores-priorites"], minChars: 900 },
  {
    key: "recomposition",
    aliases: ["potentiel-recomposition-perte-de-gras-gain-de-muscle", "potentiel-recomposition"],
    minChars: 1200,
  },
  {
    key: "axes",
    aliases: ["lecture-compartimentee-par-axes", "analyse-par-axe"],
    minChars: 6000,
  },
  {
    key: "interconnexions",
    aliases: ["interconnexions-majeures-le-pattern", "interconnexions-majeures"],
    minChars: 1500,
  },
  {
    key: "deep_dive",
    aliases: ["deep-dive-marqueurs-prioritaires", "deep-dive"],
    minChars: 4600,
  },
  {
    key: "plan",
    aliases: ["plan-d-action-90-jours", "plan-90-jours"],
    minChars: 3400,
  },
  {
    key: "nutrition",
    aliases: ["nutrition-entrainement", "nutrition-entrainement-traduction-pratique", "protocole-nutrition"],
    minChars: 2600,
  },
  {
    key: "supplements",
    aliases: ["supplements-stack", "supplements-stack-minimaliste-mais-impact", "protocole-supplements"],
    minChars: 3000,
  },
  { key: "annexes", aliases: ["annexes-references-et-vigilance", "annexes-ultra-long", "annexes"], minChars: 900 },
  { key: "sources", aliases: ["sources-bibliotheque", "sources-scientifiques"], minChars: 120 },
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

const upsertSectionByAliases = (report: string, aliases: string[], newSectionContent: string): string => {
  const nextSection = stripEmojis(newSectionContent || "").trim();
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

  if (sections.length < 12) {
    reasons.push("insufficient_h2_sections");
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

  const outputLength = output.trim().length;
  if (markerCount >= 18 && outputLength < 20000) {
    reasons.push("report_too_short_for_marker_volume");
  } else if (markerCount >= 12 && outputLength < 15000) {
    reasons.push("report_too_short");
  } else if (markerCount >= 8 && outputLength < 10500) {
    reasons.push("report_too_short_low_data");
  }

  return {
    ok: reasons.length === 0,
    reasons,
    missing,
    thin,
    matchedSections,
  };
};

const validateDeepDive = (output: string, markerNames: string[]) => {
  const deepDive = extractSection(output, "## Deep dive");
  if (!deepDive) return { ok: false, reason: "missing_deep_dive" };

  if (!markerNames.length) return { ok: true, reason: "" };

  const normalizedDeepDive = normalizePlain(deepDive);
  const coveredMarkers = markerNames.filter((name) =>
    normalizedDeepDive.includes(normalizePlain(name))
  ).length;
  const minCoverage = Math.min(2, markerNames.length);
  if (coveredMarkers < minCoverage) {
    return { ok: false, reason: "insufficient_marker_coverage" };
  }

  const expertMentions = countMatches(deepDive, EXPERT_NAME_REGEX);
  const sourceMentions = countMatches(deepDive, /\[SRC:[^\]]+\]/gi);
  if (expertMentions < 1 && sourceMentions < 1) {
    return { ok: false, reason: "missing_expert_or_source_mentions" };
  }
  if (/[\p{Extended_Pictographic}\uFE0F]/gu.test(deepDive)) {
    return { ok: false, reason: "emoji_present" };
  }
  if (hasGenericPhrases(deepDive)) {
    return { ok: false, reason: "generic_phrases" };
  }
  return { ok: true, reason: "" };
};

const AXES_SECTION_ALIASES = [
  "lecture-compartimentee-par-axes",
  "analyse-par-axe",
  "analyse-par-axes",
];

const normalizeReportWhitespace = (text: string): string =>
  text
    .replace(/[ \t]{2,}/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

export const sanitizeBloodReportRegister = (text: string): string => {
  if (!text) return "";
  let out = String(text);

  const replacements: Array<{ pattern: RegExp; value: string }> = [
    { pattern: /\bje vais etre direct avec toi\b/gi, value: "je vais etre clair avec toi" },
    { pattern: /\bje vais etre direct\b/gi, value: "je vais etre clair" },
    { pattern: /\bfranchement\b/gi, value: "honnêtement" },
    { pattern: /\becoute\b/gi, value: "regarde" },
    { pattern: /\bmec\b/gi, value: "tu" },
    { pattern: /\bon observe que\b/gi, value: "je vois que" },
    { pattern: /\bon observe\b/gi, value: "je vois" },
    { pattern: /\bil convient de\b/gi, value: "je te recommande de" },
    { pattern: /\bil est recommande de\b/gi, value: "je te recommande de" },
    { pattern: /\bil est recommande\b/gi, value: "je te recommande" },
    { pattern: /\bil est conseille de\b/gi, value: "je te recommande de" },
    { pattern: /\ble patient\b/gi, value: "tu" },
    { pattern: /\bla patiente\b/gi, value: "tu" },
    { pattern: /\bputain\b/gi, value: "" },
    { pattern: /\bbordel\b/gi, value: "" },
  ];

  for (const replacement of replacements) {
    out = out.replace(replacement.pattern, replacement.value);
  }

  out = stripEmojis(out);
  out = out.replace(/\s*\[SRC:[^\]]+\]\s*/g, " ");
  out = out.replace(/\n##\s+Sources[^\n]*[\s\S]*$/i, "");
  out = out.replace(/^##\s+(Axe\s+\d+\b[^\n]*)/gim, "### $1");

  return normalizeReportWhitespace(out);
};

export const ensureAxesSectionTemplate = (fullText: string): string => {
  if (!fullText) return fullText;
  const report = String(fullText);
  const sections = parseH2Sections(report);
  const axesSection = findSectionByAliases(sections, AXES_SECTION_ALIASES);
  if (!axesSection) return normalizeReportWhitespace(report);

  const lines = (axesSection.content || "").split("\n");
  const headingLine =
    lines.find((line) => /^\s*(?:\*\*)?##\s+/.test(line))?.trim() ||
    "## Lecture compartimentee par axes";

  let body = lines.join("\n");
  if (/^\s*(?:\*\*)?##\s+/.test(lines[0] || "")) {
    body = lines.slice(1).join("\n");
  }

  body = body.replace(/^##\s+(Axe\s+\d+\b[^\n]*)/gim, "### $1");

  for (let axis = 1; axis <= 11; axis += 1) {
    const axisRegex = new RegExp(`^###\\s+Axe\\s+${axis}\\b`, "mi");
    if (axisRegex.test(body)) continue;
    body = `${body.trim()}\n\n### Axe ${axis} — Non renseigne\n\nNon renseigne pour ce dossier a ce stade. Je garde cet axe visible pour conserver une lecture complete et je te recommande de le confirmer au prochain retest avec les marqueurs associes.`.trim();
  }

  const rebuiltSection = `${headingLine}\n\n${normalizeReportWhitespace(body)}`.trim();
  return normalizeReportWhitespace(upsertSectionByAliases(report, AXES_SECTION_ALIASES, rebuiltSection));
};

export const auditBloodReportQualityForMeta = (aiReport: string): string[] => {
  const report = ensureAxesSectionTemplate(sanitizeBloodReportRegister(aiReport || ""));
  if (!report) return ["empty_report"];

  const issues: string[] = [];
  const sections = parseH2Sections(report);

  if (sections.length < 10) {
    issues.push("insufficient_h2_sections");
  }

  for (const spec of REQUIRED_REPORT_SECTIONS) {
    if (spec.key === "sources") continue;
    const found = findSectionByAliases(sections, spec.aliases);
    if (!found) {
      issues.push(`missing_section:${spec.key}`);
      continue;
    }
    const minimum = Math.max(250, Math.round(spec.minChars * 0.28));
    if (found.content.trim().length < minimum) {
      issues.push(`short_section:${spec.key}`);
    }
  }

  const axesSection = findSectionByAliases(sections, AXES_SECTION_ALIASES);
  if (!axesSection) {
    issues.push("missing_section:axes");
  } else {
    for (let axis = 1; axis <= 11; axis += 1) {
      if (!new RegExp(`^###\\s+Axe\\s+${axis}\\b`, "mi").test(axesSection.content || "")) {
        issues.push(`missing_axis:${axis}`);
      }
    }
  }

  if (
    /(Cette section sera disponible une fois le rapport complet généré|Génération du rapport AI en cours|Le rapport complet sera disponible sous peu)/i.test(
      report
    )
  ) {
    issues.push("placeholder_text");
  }

  return Array.from(new Set(issues));
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
    const markerId = normalizeMarkerName(rawMarkerId);
    const range = BIOMARKER_RANGES[markerId];
    if (!range) {
      console.log(`[analyzeBloodwork] Unknown marker: "${rawMarkerId}" (normalized: "${markerId}")`);
      continue;
    }

    // Skip gender-specific markers for wrong gender
    if (range.genderSpecific && range.genderSpecific !== userProfile.gender) continue;

    const status = getMarkerStatus(input.value, range);
    const analysis: MarkerAnalysis = {
      markerId: markerId,
      name: range.name,
      value: input.value,
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

const BLOOD_ANALYSIS_SYSTEM_PROMPT = `Tu es un expert bloodwork performance (sante + recomposition + longévité) et tu écris un rapport premium en français.

Objectif:
- Donner une lecture exploitable et personnalisée du bilan sanguin.
- Prioriser les leviers qui changent réellement les résultats (énergie, composition corporelle, récupération, risque cardio-métabolique).

Règles critiques:
- N'invente jamais une valeur, un marqueur, un symptôme, une habitude ou une source.
- Si une donnée manque: écris "Non renseigne", explique l'impact, propose le test utile.
- Distingue clairement "normal labo" vs "optimal performance".
- Pas de diagnostic définitif: hypothèses + degré de confiance + tests de confirmation.
- Ne donne pas d'instruction médicamenteuse; renvoie vers avis médical quand nécessaire.
- Emoji interdits.

Style:
- Tutoiement naturel, ton expert, clair, concret, sans jargon inutile.
- Paragraphes explicatifs + listes actionnables (actions/tests/suppléments).
- Tableaux markdown autorisés uniquement si cela améliore la lisibilité.

Sources:
- Tu peux citer des sources uniquement via [SRC:ID] quand l'ID existe dans le contexte fourni.
- Pas d'invention de DOI/épisode/titre/lien.
- La section "Sources (bibliotheque)" doit lister seulement ce qui est réellement utilisé.

Format obligatoire (titres H2 exacts, dans cet ordre):
## Synthese executive
## Qualite des donnees & limites
## Tableau de bord (scores & priorites)
## Potentiel recomposition (perte de gras + gain de muscle)
## Lecture compartimentee par axes
## Interconnexions majeures (le pattern)
## Deep dive — marqueurs prioritaires
## Plan d'action 90 jours
## Nutrition & entrainement
## Supplements & stack
## Annexes (references et vigilance)
## Sources (bibliotheque)

Contraintes de qualité:
- Rapport complet et cohérent (en général 16 000 à 35 000 caracteres selon le volume de marqueurs).
- Chaque section doit contenir des informations utiles et spécifiques au patient.
- Sections obligatoirement denses:
  - "Lecture compartimentee par axes": longue et detaillee (pas une synthese courte).
  - "Deep dive — marqueurs prioritaires": marqueur par marqueur avec plan d'action concret.
  - "Plan d'action 90 jours": detail phase par phase avec KPI et erreurs a eviter.
  - "Nutrition & entrainement" et "Supplements & stack": protocoles complets et relies aux biomarqueurs.
- Priorise toujours la précision, la clarté et l'actionnabilité.

Réponds uniquement avec le rapport final markdown.`;

const PANEL_CITATIONS: Record<string, Array<{ title: string; url: string }>> = {
  Hormonal: [
    {
      title: "Sleep restriction reduces testosterone (JAMA, 2011)",
      url: "https://pubmed.ncbi.nlm.nih.gov/21632481/",
    },
    {
      title: "Dietary fat intake and testosterone (J Appl Physiol, 1997)",
      url: "https://pubmed.ncbi.nlm.nih.gov/9124069/",
    },
  ],
  Thyroide: [
    {
      title: "Thyroid function and metabolic rate (Endocr Rev, 2016)",
      url: "https://pubmed.ncbi.nlm.nih.gov/26836627/",
    },
    {
      title: "T3, T4 conversion and energy balance (Clin Endocrinol, 2012)",
      url: "https://pubmed.ncbi.nlm.nih.gov/22281546/",
    },
  ],
  Metabolique: [
    {
      title: "HbA1c and cardiometabolic risk (Diabetes Care, 2010)",
      url: "https://pubmed.ncbi.nlm.nih.gov/20067979/",
    },
    {
      title: "Triglycerides/HDL ratio and insulin resistance (Clin Chem, 2008)",
      url: "https://pubmed.ncbi.nlm.nih.gov/18633100/",
    },
  ],
  Inflammation: [
    {
      title: "hs-CRP as inflammatory predictor (Circulation, 2002)",
      url: "https://pubmed.ncbi.nlm.nih.gov/12187352/",
    },
    {
      title: "Homocysteine and vascular risk (NEJM, 2002)",
      url: "https://pubmed.ncbi.nlm.nih.gov/11794172/",
    },
  ],
  "Vitamines & mineraux": [
    {
      title: "Vitamin D status and muscle function (J Clin Endocrinol Metab, 2011)",
      url: "https://pubmed.ncbi.nlm.nih.gov/21307127/",
    },
    {
      title: "Magnesium status and performance (Nutrients, 2017)",
      url: "https://pubmed.ncbi.nlm.nih.gov/28353696/",
    },
  ],
  "Foie & rein": [
    {
      title: "ALT/AST and metabolic risk (Hepatology, 2011)",
      url: "https://pubmed.ncbi.nlm.nih.gov/21319192/",
    },
    {
      title: "eGFR and cardiovascular outcomes (JASN, 2010)",
      url: "https://pubmed.ncbi.nlm.nih.gov/20056756/",
    },
  ],
};

const buildSourcesSection = (): string => {
  const lines: string[] = [];
  for (const [panel, citations] of Object.entries(PANEL_CITATIONS)) {
    lines.push(`### ${panel}`);
    for (const item of citations) {
      lines.push(`- ${item.title} ${item.url}`);
    }
  }
  return lines.join("\n");
};

const findSourcesHeadingIndex = (text: string): number => {
  const match = /(^|\n)##\s+sources[^\n]*/i.exec(text);
  if (!match) return -1;
  return match.index + (match[1] ? match[1].length : 0);
};

const ensureSourcesSection = (text: string): string => {
  if (!text) return "";
  if (findSourcesHeadingIndex(text) !== -1) {
    return text.trim();
  }
  return `${text.trim()}\n\n## Sources (bibliotheque)\n${buildSourcesSection()}`.trim();
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
    "## Sources scientifiques",
    "## Sources (bibliotheque)",
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

const trimAiAnalysis = (text: string, maxChars = 100000): string => {
  if (!text) return "";
  const cleaned = stripEmojis(text).trim();
  if (cleaned.length <= maxChars) return cleaned;
  const sourcesIndex = findSourcesHeadingIndex(text);
  const planMatchIndex = /(^|\n)##\s+Plan(?: d'action)? 90 jours/i.exec(text);
  const planIndex = planMatchIndex ? planMatchIndex.index + (planMatchIndex[1] ? planMatchIndex[1].length : 0) : -1;
  const sources = sourcesIndex !== -1 ? text.slice(sourcesIndex).trim() : "";
  const plan = planIndex !== -1 ? extractPlan90Section(text) : "";

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
      const head = text.slice(0, headEnd);
      const lastBreak = head.lastIndexOf("\n\n");
      const safeHead = lastBreak > 1000 ? head.slice(0, lastBreak).trim() : head.trim();
      return stripEmojis([safeHead, plan, sources].filter(Boolean).join("\n\n")).trim();
    }
  }
  const sliced = text.slice(0, maxChars);
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
    suboptimal: 55,
    critical: 30,
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
  const criticalMissing = ["testosterone_total", "cortisol", "tsh", "t3_libre", "vitamine_d", "hba1c", "ferritine", "crp_us"].filter(
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
      title: "Axe 1 — Potentiel musculaire & androgenes",
      markers: axisMarkers.hormonal,
      actions: [
        "Stabiliser sommeil, lipides alimentaires essentiels et surcharge mentale.",
        "Eviter les deficits caloriques trop agressifs sur plusieurs semaines.",
      ],
      missingTests: ["Testosterone totale", "SHBG", "LH", "FSH"],
    },
    {
      key: "metabolique",
      title: "Axe 2 — Metabolisme & gestion du risque diabete",
      markers: axisMarkers.metabolique,
      actions: [
        "Prioriser fibres + proteines avant glucides rapides.",
        "Ajouter NEAT quotidien et zone 2 pour améliorer la flexibilite metabolique.",
      ],
      missingTests: ["HbA1c", "Insuline a jeun", "HOMA-IR"],
    },
    {
      key: "lipidique",
      title: "Axe 3 — Lipides & risque cardio-metabolique",
      markers: axisMarkers.lipidique,
      actions: [
        "Qualite lipidique alimentaire + baisse sucres/alcool si necessaire.",
        "Suivi cardio-preventif si marqueurs atherogenes eleves.",
      ],
      missingTests: ["ApoB", "Non-HDL", "Imagerie vasculaire si contexte a risque"],
    },
    {
      key: "thyroide",
      title: "Axe 4 — Thyroide & depense energetique",
      markers: axisMarkers.thyroide,
      actions: [
        "Eviter les seches prolongées trop basses en glucides/calories.",
        "Retester avec FT3/FT4 complets en cas de plateau metabolique.",
      ],
      missingTests: ["FT3", "rT3", "Anti-TPO"],
    },
    {
      key: "hepatique",
      title: "Axe 5 — Foie, bile & detox metabolique",
      markers: axisMarkers.hepatique,
      actions: [
        "Reduire l'alcool et la charge inflammatoire alimentaire.",
        "Ajuster volume d'entrainement si enzymes hepatiques sensibles.",
      ],
      missingTests: ["Bilirubine", "ALP", "ApoB"],
    },
    {
      key: "renal",
      title: "Axe 6 — Rein, hydratation & performance",
      markers: axisMarkers.renal,
      actions: [
        "Hydratation structuree + sodium/potassium adaptes a la transpiration.",
        "Retest avec conditions stables si creatinine/eGFR discutables.",
      ],
      missingTests: ["Uree/BUN", "Cystatine C"],
    },
    {
      key: "inflammation",
      title: "Axe 7 — Inflammation, immunite & terrain",
      markers: axisMarkers.inflammation,
      actions: [
        "Regulariser recuperation, sommeil et charge d'entrainement.",
        "Approche anti-inflammatoire nutritionnelle progressive.",
      ],
      missingTests: ["NFS complete", "CRP-us de controle"],
    },
    {
      key: "hematologie",
      title: "Axe 8 — Hematologie, oxygenation & endurance",
      markers: axisMarkers.hematologie,
      actions: ["Verifier statut fer/B12/folates si fatigue/performance en baisse."],
      missingTests: ["Hemoglobine", "Hematocrite", "VGM", "RDW"],
    },
    {
      key: "micronutriments",
      title: "Axe 9 — Micronutriments (vitamines & mineraux)",
      markers: axisMarkers.micronutriments,
      actions: [
        "Corriger d'abord vitamine D, B12, magnesium/zinc selon panel disponible.",
        "Prioriser alimentation dense + supplementation ciblee.",
      ],
      missingTests: ["Magnesium RBC", "Zinc", "Folate"],
    },
    {
      key: "electrolytes",
      title: "Axe 10 — Electrolytes, crampes, pression & performance",
      markers: axisMarkers.electrolytes,
      actions: ["Calibrer sodium/potassium selon transpiration et volume de training."],
      missingTests: ["Sodium", "Potassium", "Calcium", "Chlore"],
    },
    {
      key: "stress",
      title: "Axe 11 — Stress, sommeil, recuperation",
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
  sections.push("## Deep dive — marqueurs prioritaires\n");
  if (!priorityMarkers.length) {
    sections.push("Aucun marqueur hors zone optimale majeure sur ce bilan.");
  } else {
    for (const marker of priorityMarkers) {
      sections.push(`### ${marker.name}`);
      sections.push(`- Priorite: ${statusToPriority(marker.status)}`);
      sections.push(`- Valeur: ${marker.value} ${marker.unit || ""} | Range labo: ${marker.normalRange || "N/A"} | Range optimal: ${marker.optimalRange || "N/A"}`);
      sections.push(
        `- Lecture clinique: valeur ${marker.status === "critical" ? "fortement hors cible" : "hors cible performance"}, a remettre sous controle pour securiser l'axe ${getMarkerPanelName(
          marker.markerId,
          marker.category
        )}.`
      );
      sections.push(
        "- Lecture performance/bodybuilding: impact probable sur recuperation, energie, tolerance au volume d'entrainement et progression physique tant que la correction n'est pas engagee."
      );
      sections.push(
        "- Causes plausibles (ordre de probabilite): contexte nutrition/recuperation, charge d'entrainement, terrain inflammatoire/metabolique, facteurs individuels, contexte de prelevement."
      );
      sections.push("- Facteurs confondants: conditions de prelevement, etat infectieux, manque de donnees lifestyle.");
      sections.push(
        "- Plan d'action: 1) corriger hygiene de base sommeil/nutrition 2) ajuster training/recovery 3) prioriser l'axe dominant 4) retester en conditions standardisees."
      );
      sections.push("- Execution pratique hebdo: check-list quotidienne sommeil, hydratation, adherence nutrition, charge interne entrainement.");
      sections.push("- Cible a 90 jours: sortir de la zone critique/suboptimale et stabiliser au minimum dans la zone normale.");
      sections.push("- Jalons intermediaires: J+14 adherence, J+30 tendance clinique/performance, J+60 pre-retest.");
      sections.push("- Signal d'alerte: absence de progression + fatigue accrue + baisse performance = reevaluer charge et contexte.");
      sections.push("- Strategie d'ajustement: modifier une variable a la fois (nutrition, training, recuperation) pour garder un signal interpretable.");
      sections.push("- Checklist actionnable: 1 variable prioritaire/semaine, suivi ecrit, revue hebdo objective, decision basee sur tendance et non sur un seul jour.");
      sections.push("- Tests/data a ajouter: panel complementaire cible selon axe + contexte lifestyle detaille.");
      sections.push(`- Confiance: ${marker.status === "critical" ? "moyenne a elevee" : "moyenne"}`);
      sections.push("");
    }
  }

  sections.push("## Interconnexions majeures (le pattern)\n");
  if (correlations.length) {
    correlations.forEach((item, idx) => {
      sections.push(`### Pattern ${idx + 1} — ${item.factor}`);
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
  if (priorityMarkers.length >= 2) {
    const connectionDrivers = priorityMarkers.slice(0, 6);
    connectionDrivers.forEach((marker, index) => {
      const linked = connectionDrivers
        .filter((candidate) => candidate.markerId !== marker.markerId)
        .slice(0, 2)
        .map((candidate) => `${candidate.name} (${candidate.value} ${candidate.unit || ""})`)
        .join(" + ");
      sections.push(
        `${index + 1}. ${marker.name} (${marker.value} ${marker.unit || ""}) est probablement relie a ${linked || "d'autres signaux du panel"} via un mecanisme commun de recuperation/metabolisme/inflammation.`
      );
      sections.push(
        "   - Validation attendue: amelioration simultanee des marqueurs relies apres stabilisation sommeil/nutrition/charge d'entrainement."
      );
      sections.push(
        "   - Action pratique: prioriser les fondamentaux (sommeil, deficit modere, regularite des repas, volume training soutenable) avant d'ajouter de la complexite."
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
  sections.push("### Niveau 1 — Fondamentaux (impact large)");
  sections.push("- Vitamine D3: 2000-5000 UI/j avec repas gras (selon statut initial). Pourquoi: immunite, performance, axe hormonal.");
  sections.push("- Magnesium glycinate: 300-400 mg le soir. Pourquoi: sommeil, gestion stress, recuperation nerveuse.");
  sections.push("- Omega-3 EPA+DHA: 2-3 g/j. Pourquoi: terrain inflammatoire/lipidique.");
  sections.push("- Creatine monohydrate: 3-5 g/j. Pourquoi: force, masse maigre, capacite de travail.");
  sections.push("### Niveau 2 — Cibles metaboliques/inflammatoires");
  sections.push("- Berberine (si glycemie/HOMA alteres): dose fractionnee, monitoring digestif. Precaution: interactions hypoglycemiantes.");
  sections.push("- Psyllium/fibres solubles: pre-repas riches en glucides pour lisser la reponse glycemique.");
  sections.push("- Curcuminoides standardises (si inflammation): avec repas, verifier tolerance digestive.");
  sections.push("- Glycine le soir: support sommeil/recuperation chez profils stresses.");
  sections.push("### Niveau 3 — Ajustements selon panel");
  sections.push("- Zinc (si statut bas): courte phase puis reevaluation au retest.");
  sections.push("- B12/Folate (si statut bas): corriger d'abord deficit confirme, puis maintenance.");
  sections.push("- Electrolytes (sodium/potassium): calibrer selon transpiration/cardio/volume training.");
  sections.push("- NAC (si enzymes hepatiques sensibles): usage transitoire, verifier tolerance et retest.");
  sections.push("- CoQ10 (si fatigue + charge training elevee): support mitochondrial potentiel.");
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
  sections.push("### Annexe A — Marqueurs secondaires (lecture rapide)");
  sections.push(
    formatList(
      analysisResult.markers.slice(0, 24).map((marker) => `${marker.name}: ${marker.status} | ${marker.value} ${marker.unit}`),
      "Aucun marqueur secondaire disponible."
    )
  );
  sections.push("### Annexe B — Hypotheses & tests de confirmation");
  sections.push(
    formatList(
      criticalMissing.map((id) => `Hypothese a confirmer via ${id.replace(/_/g, " ").toUpperCase()}`),
      "Aucune hypothese critique supplementaire."
    )
  );
  sections.push("### Annexe C — Glossaire utile");
  sections.push("- HOMA-IR: indice de resistance a l'insuline.");
  sections.push("- ApoB: charge de particules atherogenes.");
  sections.push("- hs-CRP: marqueur d'inflammation systemique basse intensite.");
  sections.push("- SHBG: proteine qui module la fraction libre des hormones sexuelles.");
  sections.push("### Vigilance");
  sections.push(alerts.length ? alerts.join("\n") : "- Aucun signal critique majeur necessitant une consultation medicale immediate.");

  sections.push("\n## Sources (bibliotheque)\n");

  const knowledgeSourceLines = (knowledgeContext || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith("[SRC:"));

  if (knowledgeSourceLines.length) {
    sections.push("- Sources detectees dans la knowledge base:");
    for (const line of knowledgeSourceLines.slice(0, 12)) {
      sections.push(`- ${line}`);
    }
  } else {
    const fallbackSources = Object.values(PANEL_CITATIONS)
      .flat()
      .slice(0, 10)
      .map((citation) => `- ${citation.title} ${citation.url}`);
    sections.push(...fallbackSources);
  }

  sections.push("");
  sections.push("*Rapport fallback deterministic: personnalise sur les marqueurs reels, avec plan d'action concret et retest structure.*");

  return sections.join("\n");
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
  const buildFallbackReport = () =>
    trimAiAnalysis(ensureSourcesSection(buildFallbackAnalysis(analysisResult, userProfile, knowledgeContext)));

  const userPrompt = `Analyse ce bilan sanguin pour ${userProfile.prenom ? userProfile.prenom : "le client"} (${userProfile.gender} ${userProfile.age || ""}).
Objectifs: ${userProfile.objectives || "Performance et sante"}
Medicaments: ${userProfile.medications || "Aucun"}
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

FORMAT OBLIGATOIRE (dans cet ordre exact):
1. ## Synthese executive
2. ## Qualite des donnees & limites
3. ## Tableau de bord (scores & priorites)
4. ## Potentiel recomposition (perte de gras + gain de muscle)
5. ## Lecture compartimentee par axes
6. ## Interconnexions majeures (le pattern)
7. ## Deep dive — marqueurs prioritaires
8. ## Plan d'action 90 jours
9. ## Nutrition & entrainement
10. ## Supplements & stack
11. ## Annexes (references et vigilance)
12. ## Sources (bibliotheque)

EXIGENCES DE QUALITE:
- Longueur cible: ${targetChars} caracteres minimum, sans remplissage artificiel.
- Traiter au moins ${minDeepDiveMarkers} marqueurs en deep dive (ou tous les non-optimaux s'il y en a moins).
- Pour chaque axe et chaque marqueur prioritaire: lecture clinique + lecture performance + actions concretes.
- Tu DOIS respecter des seuils de profondeur:
  - "## Synthese executive": au moins ${qualityThresholds.synthese} caracteres, avec priorites immediates + impact performance + sequence d'action.
  - "## Qualite des donnees & limites": au moins ${qualityThresholds.qualite} caracteres, avec limites explicites, confondants et tests de confirmation.
  - "## Tableau de bord (scores & priorites)": au moins ${qualityThresholds.tableau} caracteres, avec priorites, quick wins, KPI.
  - "## Potentiel recomposition (perte de gras + gain de muscle)": au moins ${qualityThresholds.recomposition} caracteres, avec leviers, freins, conditions de progression.
  - "## Lecture compartimentee par axes": au moins ${qualityThresholds.axes} caracteres, avec un bloc detaille par axe present.
  - "## Interconnexions majeures (le pattern)": au moins ${qualityThresholds.interconnexions} caracteres, avec patterns relies entre marqueurs.
  - "## Deep dive — marqueurs prioritaires": au moins ${qualityThresholds.deepDive} caracteres, marqueur par marqueur.
  - "## Plan d'action 90 jours": au moins ${qualityThresholds.plan} caracteres, avec objectifs + actions + indicateurs + erreurs a eviter par phase.
  - "## Nutrition & entrainement": au moins ${qualityThresholds.nutrition} caracteres, en liant chaque recommendation aux marqueurs.
  - "## Supplements & stack": au moins ${qualityThresholds.supplements} caracteres, avec rationale, dose, timing, duree, precautions.
- Utiliser des listes et tableaux markdown quand cela clarifie la lecture.
- Ne jamais inventer un marqueur, une valeur, un symptome, un contexte ou une source.
- Si une info est absente: ecrire "Non renseigne", expliquer la limite, proposer le test utile.
- Citer [SRC:ID] uniquement si l'ID existe dans le contexte fourni.
- Ton expert, humain, personnalise, orienté resultat, sans jargon inutile.
${lowDataMode ? "\nMODE DONNEES PARTIELLES: panel incomplet. Renforce la section limites, hypotheses et retest sans halluciner." : ""}`;

  let output = "";
  let bestCandidate = "";
  let bestScore = -1;

  // Keep timeout conservative to avoid reports stuck in "processing".
  const API_TIMEOUT_MS = 120000;

  // Reduce retries to 1 for faster response, with timeout protection
  const maxAttempts = process.env.BLOOD_ANALYSIS_FAST_MODE === "true" ? 1 : 2;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const retryNote =
      attempt === 1
        ? ""
        : `\nATTENTION: Ta reponse precedente etait trop generique ou ne respectait pas les sections deep dive. Corrige en utilisant STRICTEMENT les donnees patient et les sources fournies. Chaque biomarqueur doit contenir les 4 sous-sections avec au moins 2 citations d'experts.\n`;
    const prompt = `${userPrompt}\n${retryNote}`;

    try {
      // Stream output to support long narratives while keeping memory bounded.
      const stream = await anthropic.messages.create({
        model: process.env.BLOOD_ANALYSIS_MODEL || "claude-opus-4-6",
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
      const deepDiveCheck = validateDeepDive(candidate, deepDivePayload.markerNames);
      const structureCheck = validateReportStructure(candidate, analysisResult.markers);
      if (!deepDiveCheck.ok) {
        console.warn(`[BloodAnalysis] Candidate deep-dive rejection: ${deepDiveCheck.reason}`);
      }
      if (!structureCheck.ok) {
        console.warn(`[BloodAnalysis] Candidate structure rejection: ${structureCheck.reasons.join(" | ")}`);
      }

      const qualityOk = deepDiveCheck.ok && structureCheck.ok;
      const score =
        candidate.length +
        (deepDiveCheck.ok ? 7000 : 0) +
        structureCheck.matchedSections * 1200 -
        structureCheck.missing.length * 1800 -
        structureCheck.thin.length * 1800;
      if (score > bestScore) {
        bestScore = score;
        bestCandidate = candidate;
      }
      if (qualityOk) {
        output = candidate;
        break;
      }
    } catch (err: any) {
      if (err.message === "API_TIMEOUT") {
        console.warn(`[BloodAnalysis] Attempt ${attempt} timed out after ${API_TIMEOUT_MS}ms`);
        if (attempt === maxAttempts) {
          console.log("[BloodAnalysis] All attempts timed out, using fallback");
          return buildFallbackReport();
        }
      } else {
        throw err;
      }
    }
  }

  if (!output) {
    output = bestCandidate;
  }

  if (!/(^|\n)##\s+Plan(?: d'action)? 90 jours/i.test(output)) {
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
        model: process.env.BLOOD_ANALYSIS_MODEL || "claude-opus-4-6",
        max_tokens: 9000,
        system: "Tu es un expert bloodwork performance. Genere uniquement la section demandee, en markdown propre.",
        messages: [{ role: "user", content: planPrompt }],
        stream: true,
      });

      let planContent = "";
      for await (const event of planStream) {
        if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
          planContent += event.delta.text;
        }
      }

      const planText = extractPlan90Section(planContent);
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

  const sectionRepairSpecs: Array<{
    title: string;
    aliases: string[];
    minChars: number;
    maxTokens: number;
    prompt: () => string;
  }> = [
    {
      title: "Synthese executive",
      aliases: ["synthese-executive"],
      minChars: qualityThresholds.synthese,
      maxTokens: 5000,
      prompt: () => `Genere UNIQUEMENT la section "## Synthese executive".

Contraintes:
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
      title: "Qualite des donnees & limites",
      aliases: ["qualite-des-donnees-limites"],
      minChars: qualityThresholds.qualite,
      maxTokens: 4200,
      prompt: () => `Genere UNIQUEMENT la section "## Qualite des donnees & limites".

Contraintes:
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
      title: "Tableau de bord (scores & priorites)",
      aliases: ["tableau-de-bord-scores-priorites"],
      minChars: qualityThresholds.tableau,
      maxTokens: 4500,
      prompt: () => `Genere UNIQUEMENT la section "## Tableau de bord (scores & priorites)".

Contraintes:
- Longueur minimale: ${qualityThresholds.tableau} caracteres.
- Inclure: priorites critiques/importantes, quick wins, KPI de suivi hebdo et mensuel, criteres d'escalade.
- Lier explicitement les priorites aux biomarqueurs.
- Style premium, concret, sans generalites.

Contexte:
Marqueurs: ${markersTable}
Patterns: ${patternsText}`,
    },
    {
      title: "Potentiel recomposition",
      aliases: ["potentiel-recomposition-perte-de-gras-gain-de-muscle", "potentiel-recomposition"],
      minChars: qualityThresholds.recomposition,
      maxTokens: 4500,
      prompt: () => `Genere UNIQUEMENT la section "## Potentiel recomposition (perte de gras + gain de muscle)".

Contraintes:
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
      title: "Lecture compartimentee par axes",
      aliases: ["lecture-compartimentee-par-axes", "analyse-par-axe"],
      minChars: qualityThresholds.axes,
      maxTokens: 9000,
      prompt: () => `Genere UNIQUEMENT la section "## Lecture compartimentee par axes".

Contraintes:
- Longueur minimale: ${qualityThresholds.axes} caracteres.
- Couvre explicitement chaque axe disponible dans les marqueurs du bilan.
- Pour chaque axe: score, lecture clinique, lecture performance/bodybuilding, actions prioritaires, tests manquants.
- Utilise les vrais marqueurs et leurs valeurs. Si un axe est incomplet, ecris "Non renseigne" et les tests requis.
- Pas d'invention, pas de generalites vides.

Contexte marqueurs:
${markersTable}

Patterns:
${patternsText}`,
    },
    {
      title: "Interconnexions majeures",
      aliases: ["interconnexions-majeures-le-pattern", "interconnexions-majeures"],
      minChars: qualityThresholds.interconnexions,
      maxTokens: 6000,
      prompt: () => `Genere UNIQUEMENT la section "## Interconnexions majeures (le pattern)".

Contraintes:
- Longueur minimale: ${qualityThresholds.interconnexions} caracteres.
- 5 a 12 interconnexions concretes maximum.
- Chaque interconnexion doit contenir: pattern observe, hypothese mecanistique, ce qui confirmerait, action concrete.
- Lier explicitement les marqueurs entre eux.
- Cite [SRC:ID] uniquement si l'ID existe dans le contexte.

Contexte:
Marqueurs: ${markersTable}
Patterns: ${patternsText}
${knowledgeContext ? `\nSources disponibles:\n${knowledgeContext}` : ""}`,
    },
    {
      title: "Deep dive",
      aliases: ["deep-dive-marqueurs-prioritaires", "deep-dive"],
      minChars: qualityThresholds.deepDive,
      maxTokens: 10000,
      prompt: () => `Genere UNIQUEMENT la section "## Deep dive — marqueurs prioritaires".

Contraintes:
- Longueur minimale: ${qualityThresholds.deepDive} caracteres.
- Couvrir au moins ${minDeepDiveMarkers} marqueurs prioritaires, en priorisant critiques/suboptimaux.
- Format par marqueur:
  ### Nom du marqueur
  - Priorite
  - Valeur + ranges
  - Lecture clinique
  - Lecture performance/bodybuilding
  - Causes plausibles (ordonnees)
  - Facteurs confondants
  - Plan d'action concret
  - Tests/data a ajouter
  - Confiance
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
      title: "Nutrition & entrainement",
      aliases: ["nutrition-entrainement", "nutrition-entrainement-traduction-pratique", "protocole-nutrition"],
      minChars: qualityThresholds.nutrition,
      maxTokens: 8000,
      prompt: () => `Genere UNIQUEMENT la section "## Nutrition & entrainement (traduction pratique)".

Contraintes:
- Longueur minimale: ${qualityThresholds.nutrition} caracteres.
- Sous-sections obligatoires: Nutrition / Entrainement.
- Pour chaque recommandation: biomarqueur cible, rationale, implementation pratique.
- Inclure structure hebdo, timing glucides, proteines/fibres, micronutriments, volume/intensite, cardio, NEAT, recuperation.
- Aucun chiffre invente quand la donnee manque: signaler "Non renseigne".

Contexte:
Client: ${userProfile.prenom || "le client"} (${userProfile.gender} ${userProfile.age || ""})
Lifestyle: ${lifestyleLine}
Marqueurs: ${markersTable}`,
    },
    {
      title: "Supplements & stack",
      aliases: ["supplements-stack", "supplements-stack-minimaliste-mais-impact", "protocole-supplements"],
      minChars: qualityThresholds.supplements,
      maxTokens: 9000,
      prompt: () => `Genere UNIQUEMENT la section "## Supplements & stack (minimaliste mais impact)".

Contraintes:
- Longueur minimale: ${qualityThresholds.supplements} caracteres.
- 8 a 16 options max, classees par priorite (Niveau 1/2/3).
- Pour chaque supplement: pourquoi (marqueur/pattern vise), dose indicative, timing, duree, precautions/interactions, critere d'efficacite au retest.
- Integrer ce qui est deja utilise par le client si l'info est disponible.
- Pas d'invention de marqueur.

Contexte:
Supplements deja utilises: ${userProfile.supplementsUsed?.join(", ") || "Non renseigne"}
Marqueurs action requise: ${analysisResult.summary.action.join(", ") || "Aucun"}
Marqueurs surveillance: ${analysisResult.summary.watch.join(", ") || "Aucun"}
${markersTable}`,
    },
    {
      title: "Annexes",
      aliases: ["annexes-references-et-vigilance", "annexes-ultra-long", "annexes"],
      minChars: 900,
      maxTokens: 5000,
      prompt: () => `Genere UNIQUEMENT la section "## Annexes (references et vigilance)".

Contraintes:
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
      const sectionStream = await anthropic.messages.create({
        model: process.env.BLOOD_ANALYSIS_MODEL || "claude-opus-4-6",
        max_tokens: spec.maxTokens,
        system:
          "Tu es un expert bloodwork performance. Genere uniquement la section demandee en markdown, sans texte hors section.",
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
      const sectionToInsert = normalizedGenerated.length ? generated : `## ${spec.title}\n\n${generated}`;
      output = upsertSectionByAliases(output, spec.aliases, sectionToInsert);
      console.log(
        `[BloodAnalysis] ✅ Section "${spec.title}" repaired (${sectionToInsert.length} chars, previous ${currentLength})`
      );
    } catch (err: any) {
      console.error(`[BloodAnalysis] ❌ Failed to repair "${spec.title}":`, err.message);
    }
  }

  console.log(`[BloodAnalysis] Multi-pass complete. Final output length: ${output.length} chars`);

  const withSources = ensureSourcesSection(output);
  const trimmedOutput = trimAiAnalysis(withSources);
  const finalStructureCheck = validateReportStructure(trimmedOutput, analysisResult.markers);
  if (!finalStructureCheck.ok) {
    console.warn(
      `[BloodAnalysis] Final report failed quality gate: ${finalStructureCheck.reasons.join(" | ")}. Using deterministic fallback.`
    );
    const fallbackReport = buildFallbackReport();
    const fallbackStructureCheck = validateReportStructure(fallbackReport, analysisResult.markers);
    if (!fallbackStructureCheck.ok) {
      console.warn(
        `[BloodAnalysis] Deterministic fallback still below target: ${fallbackStructureCheck.reasons.join(" | ")}`
      );
    }
    return fallbackReport;
  }
  return trimmedOutput;
}

// ============================================
// KNOWLEDGE BASE INTEGRATION
// ============================================

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
    "newsletter",
    "achzod",
    "manual",
  ];

  const keywordSet = new Set<string>();

  for (const marker of markers) {
    if (!marker || marker.status === "optimal") continue;
    const markerName = typeof marker.name === "string" ? marker.name : "";
    const markerId = typeof marker.markerId === "string" ? marker.markerId : "";
    if (!markerName && !markerId) continue;
    if (markerName) keywordSet.add(markerName.toLowerCase());
    if (markerId) {
      keywordSet.add(markerId.toLowerCase().replace(/_/g, " "));
      keywordSet.add(getMarkerPanelName(markerId).toLowerCase());
    }
  }

  for (const pattern of patterns) {
    if (pattern?.name) keywordSet.add(pattern.name.toLowerCase());
    const causes = Array.isArray(pattern?.causes) ? pattern.causes : [];
    for (const cause of causes) {
      keywordSet.add(cause.toLowerCase());
    }
  }

  keywordSet.add("bloodwork");
  keywordSet.add("biomarker");
  keywordSet.add("insulin resistance");
  keywordSet.add("hormones");
  keywordSet.add("body composition");
  keywordSet.add("muscle gain");
  keywordSet.add("fat loss");

  const keywords = Array.from(keywordSet).filter((keyword) => keyword.length >= 3).slice(0, 28);
  if (!keywords.length) return "";

  try {
    const primaryArticles = await searchArticles(keywords, 28, sourceFilter);
    let allArticles = [...primaryArticles];

    if (allArticles.length < 8) {
      const markerQueries = markers
        .filter((marker) => marker.status !== "optimal")
        .slice(0, 4)
        .map((marker) => `${marker.name || ""} ${(marker.markerId || "").replace(/_/g, " ")}`.trim())
        .filter(Boolean);

      for (const query of markerQueries) {
        try {
          const extra = await searchFullText(query, 4);
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
      const haystack = normalizePlain(`${article.title} ${article.content.slice(0, 1200)} ${(article.keywords || []).join(" ")}`);
      let score = 0;
      for (const token of tokenSet) {
        if (haystack.includes(token)) score += 1;
      }
      if (article.source === "huberman" || article.source === "applied_metabolics") score += 2;
      if (article.source === "peter_attia" || article.source === "examine") score += 1;
      return score;
    };

    const sorted = Array.from(deduped.values())
      .sort((a, b) => scoreArticle(b) - scoreArticle(a))
      .slice(0, 20);

    const selected: ScrapedArticle[] = [];
    const perSourceCount = new Map<string, number>();
    for (const article of sorted) {
      const count = perSourceCount.get(article.source) || 0;
      if (count >= 2) continue;
      selected.push(article);
      perSourceCount.set(article.source, count + 1);
      if (selected.length >= 10) break;
    }

    if (!selected.length) return "";

    const contextLines: string[] = [
      "SOURCES BIBLIOTHEQUE DISPONIBLES (UTILISE [SRC:ID] UNIQUEMENT AVEC CES IDS):",
    ];

    for (const article of selected) {
      const sourceId = getSourceRefId(article);
      const label = SOURCE_LABELS[article.source] || article.source;
      const excerpt = article.content.replace(/\s+/g, " ").trim().slice(0, 380);
      contextLines.push(`[SRC:${sourceId}] ${label} — ${article.title}`);
      if (article.url) contextLines.push(`URL: ${article.url}`);
      if (article.category) contextLines.push(`Categorie: ${article.category}`);
      contextLines.push(`Extrait: ${excerpt}${excerpt.length >= 380 ? "..." : ""}`);
      contextLines.push("");
    }

    return contextLines.join("\n").trim();
  } catch (error) {
    console.error("[BloodAnalysis] Knowledge context retrieval failed:", error);
    return "";
  }
}
