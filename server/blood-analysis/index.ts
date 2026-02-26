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

type RequiredReportSection = {
  key: string;
  title: string;
  aliases: string[];
  minChars: number;
};

const REQUIRED_REPORT_SECTIONS: RequiredReportSection[] = [
  { key: "synthese", title: "Synthese executive", aliases: ["synthese-executive"], minChars: 1200 },
  { key: "qualite", title: "Qualite des donnees & limites", aliases: ["qualite-des-donnees-limites"], minChars: 850 },
  {
    key: "tableau",
    title: "Tableau de bord (scores & priorites)",
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
    title: "Lecture compartimentee par axes",
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
    title: "Deep dive — marqueurs prioritaires",
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
    title: "Nutrition & entrainement",
    aliases: ["nutrition-entrainement", "nutrition-entrainement-traduction-pratique", "protocole-nutrition"],
    minChars: 2600,
  },
  {
    key: "supplements",
    title: "Supplements & stack",
    aliases: ["supplements-stack", "supplements-stack-minimaliste-mais-impact", "protocole-supplements"],
    minChars: 3000,
  },
  {
    key: "annexes",
    title: "Annexes (references et vigilance)",
    aliases: ["annexes-references-et-vigilance", "annexes-ultra-long", "annexes"],
    minChars: 900,
  },
  { key: "sources", title: "Sources (bibliotheque)", aliases: ["sources-bibliotheque", "sources-scientifiques"], minChars: 120 },
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

  // Log unknown sections that will be dropped
  const unknownSections = parsed.filter((section) => !getSectionSpecByHeading(section));
  if (unknownSections.length > 0) {
    console.warn(
      `[BloodAnalysis] Dropping ${unknownSections.length} unknown section(s): ${unknownSections.map((s) => s.title).join(", ")}`
    );
  }

  // Keep only required sections in the correct order
  const ordered = REQUIRED_REPORT_SECTIONS
    .map((spec) => findSectionByAliases(parsed, spec.aliases))
    .filter((section): section is ParsedH2Section => Boolean(section))
    .map((section) => section.content.trim());

  if (ordered.length === 0) {
    console.warn("[BloodAnalysis] No required sections found, returning original report");
    return report.trim();
  }

  console.log(`[BloodAnalysis] Reordered report: ${ordered.length}/${REQUIRED_REPORT_SECTIONS.length} sections matched`);
  return ordered.join("\n\n").trim();
};

const BULLET_LINE_REGEX = /^\s*(?:[-*+]|(?:\d+[\.\)]))\s+/;
const MARKDOWN_TABLE_LINE_REGEX = /^\s*\|(?:[^|\n]+\|)+\s*$/;

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

  const outputLength = output.trim().length;
  if (markerCount >= 18 && outputLength < 20000) {
    reasons.push("report_too_short_for_marker_volume");
  } else if (markerCount >= 12 && outputLength < 15000) {
    reasons.push("report_too_short");
  } else if (markerCount >= 8 && outputLength < 10500) {
    reasons.push("report_too_short_low_data");
  }

  reasons.push(...validateNarrativeStyle(output, markerCount));

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
  const minCoverage = Math.min(markerNames.length, Math.max(2, Math.ceil(markerNames.length * 0.55)));
  if (coveredMarkers < minCoverage) {
    return { ok: false, reason: "insufficient_marker_coverage" };
  }

  const deepDiveMarkerHeadings = countMatches(deepDive, /^\s*###\s+/gm);
  const minMarkerHeadings = Math.min(markerNames.length, Math.max(2, Math.ceil(markerNames.length * 0.45)));
  if (deepDiveMarkerHeadings < minMarkerHeadings) {
    return { ok: false, reason: "insufficient_deep_dive_marker_blocks" };
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
- Style narratif dense, avec phrases completes et paragraphes consistants.
- Interdiction de sortie en liste a puces, liste numerotee, checklist ou tableau markdown.
- Chaque recommandation doit etre integree dans une phrase explicite reliee aux biomarqueurs du patient.

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
- Les 12 sections H2 sont obligatoires, dans l'ordre exact, sans section additionnelle.
- Sections obligatoirement denses:
  - "Lecture compartimentee par axes": longue et detaillee (pas une synthese courte).
  - "Deep dive — marqueurs prioritaires": marqueur par marqueur avec plan d'action concret.
  - "Plan d'action 90 jours": detail phase par phase avec KPI et erreurs a eviter.
  - "Nutrition & entrainement" et "Supplements & stack": protocoles complets et relies aux biomarqueurs.
- Priorise toujours la précision, la clarté et l'actionnabilité.

RAPPELS CRITIQUES - A VERIFIER OBLIGATOIREMENT AVANT SOUMISSION

=== REGLE 1: STRUCTURE STRICTE ===
- PAS DE TITRE GLOBAL en debut de rapport
- Tu commences DIRECTEMENT par "## Synthese executive"
- Les 11 Axes dans "Lecture compartimentee par axes" sont des ### (PAS des ##)
- Exemple: "### Axe 1 — Potentiel musculaire" (PAS "## Axe 1")

=== REGLE 2: CITATIONS [SRC:ID] OBLIGATOIRES ===
Tu DOIS inclure au minimum 8 citations [SRC:ID] dans le rapport:
- Format: texte affirmation [SRC:identifiant-source]
- Exemples:
  * "Une insuline elevee bloque la lipolyse hepatique [SRC:huberman-insulin-sensitivity]"
  * "La vitamine D < 30 ng/mL impacte la synthese proteique [SRC:examine-vitamin-d]"
  * "Le sommeil < 7h reduit la testosterone de 10-15% [SRC:huberman-sleep-testosterone]"
- Place les citations dans: Synthese executive, Deep dive, Plan d'action, Nutrition
- Les IDs disponibles sont dans CONTEXTE SCIENTIFIQUE GENERAL ci-dessus
- Si pas de source pertinente: formule sans attribution mais ASSURE au moins 8 citations au total

=== REGLE 3: EXACTEMENT 12 SECTIONS H2 ===
Tu DOIS generer EXACTEMENT ces 12 sections dans cet ordre (NI PLUS NI MOINS):
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

ATTENTION: NE PAS ajouter d'autres sections comme "## Donnees & tests complementaires"!
La section "## Sources (bibliotheque)" est OBLIGATOIRE a la fin et liste les [SRC:ID] utilises.

=== REGLE 4: RETEST ===
La sous-section "### Retest & conditions de prelevement" est OBLIGATOIRE dans "## Plan d'action 90 jours"

=== VERIFICATION FINALE ===
Avant de soumettre, verifie:
[ ] Pas de titre global au debut
[ ] 12 sections H2 exactement
[ ] Au moins 8 citations [SRC:ID]
[ ] Derniere section = "## Sources (bibliotheque)"
[ ] "### Retest" present dans Plan 90 jours

Reponds UNIQUEMENT avec le rapport final markdown.`;

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
      lines.push(`${item.title}. Lien: ${item.url}.`);
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

  // Check if Sources section already exists using multiple patterns
  const sourcesPatterns = [
    /##\s+Sources\s*\(bibliotheque\)/i,
    /##\s+Sources\s*scientifiques/i,
    /##\s+Sources\s*$/im,
  ];

  const hasSourcesSection = sourcesPatterns.some((pattern) => pattern.test(text));

  if (hasSourcesSection) {
    console.log("[BloodAnalysis] Sources section already exists, keeping original");
    return text.trim();
  }

  // Force add Sources section at the end
  console.log("[BloodAnalysis] Adding missing Sources (bibliotheque) section");
  const sourcesContent = buildSourcesSection();
  return `${text.trim()}\n\n## Sources (bibliotheque)\n\nCette section regroupe les references scientifiques utilisees dans ce rapport.\n\n${sourcesContent}`.trim();
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

/**
 * Sanitize blood report text - remove artifacts and normalize formatting
 */
export const sanitizeBloodReportRegister = (text: string): string => {
  if (!text) return "";
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    .trim();
};

/**
 * Ensure the Axes section follows the correct template structure
 */
export const ensureAxesSectionTemplate = (text: string): string => {
  if (!text) return "";
  // Simply return the text - the reorderReportSections function handles structure
  return text.trim();
};

/**
 * Audit blood report quality and return list of issues
 */
export const auditBloodReportQualityForMeta = (text: string): string[] => {
  const issues: string[] = [];
  if (!text) {
    issues.push("empty_report");
    return issues;
  }

  // Check for required sections
  const requiredSections = [
    "Synthese executive",
    "Qualite des donnees",
    "Tableau de bord",
    "Potentiel recomposition",
    "Lecture compartimentee par axes",
    "Interconnexions majeures",
    "Deep dive",
    "Plan d'action 90 jours",
    "Nutrition",
    "Supplements",
    "Annexes",
    "Sources",
  ];

  const normalizedText = text.toLowerCase();
  for (const section of requiredSections) {
    if (!normalizedText.includes(section.toLowerCase())) {
      issues.push(`missing_section:${section.replace(/\s+/g, "_").toLowerCase()}`);
    }
  }

  // Check minimum length
  if (text.length < 10000) {
    issues.push("report_too_short");
  }

  return issues;
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
  // PROSE NARRATIVE HELPER - converts items to flowing sentences
  const toProse = (items: string[], connector = ", ", finalConnector = " et "): string => {
    if (!items.length) return "";
    if (items.length === 1) return items[0];
    const allButLast = items.slice(0, -1).join(connector);
    return `${allButLast}${finalConnector}${items[items.length - 1]}`;
  };

  const toSentence = (items: string[], emptyText: string): string => {
    if (!items.length) return emptyText;
    return toProse(items) + ".";
  };

  const summary = analysisResult.summary;
  const critical = analysisResult.markers.filter((m) => m.status === "critical");
  const suboptimal = analysisResult.markers.filter((m) => m.status === "suboptimal");
  const optimal = analysisResult.markers.filter((m) => m.status === "optimal");
  const priority1 = analysisResult.recommendations.priority1.map((rec) => rec.action);
  const priority2 = analysisResult.recommendations.priority2.map((rec) => rec.action);
  const followUp = analysisResult.followUp.map(
    (item) => `${item.test} dans un delai de ${item.delay} avec pour objectif ${item.objective}`
  );
  const alerts = analysisResult.alerts;
  const correlations = buildLifestyleCorrelations(analysisResult.markers, userProfile);

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
  const normalCount = analysisResult.markers.filter((m) => m.status === "normal").length;
  sections.push(
    `J'ai analyse ton bilan complet. On a ${analysisResult.markers.length} biomarqueurs a interpreter. ` +
    `Ce que je vois: ${critical.length} point${critical.length > 1 ? "s" : ""} critique${critical.length > 1 ? "s" : ""}, ` +
    `${suboptimal.length} point${suboptimal.length > 1 ? "s" : ""} a corriger en priorite, ` +
    `${normalCount} a surveiller et ${optimal.length} deja dans le vert.`
  );
  sections.push("");
  sections.push(
    critical.length
      ? `Ton goulot d'etranglement numero un, c'est ${critical[0].name}. C'est la qu'on va concentrer nos efforts en premier. `
      : "Bonne nouvelle: pas de signal d'urgence sur ton panel. "
  );
  sections.push(
    suboptimal.length
      ? `Ensuite, on va bosser sur ${suboptimal[0].name} pour debloquer ta progression.`
      : "L'objectif maintenant, c'est de consolider tes acquis et continuer sur cette lancee."
  );
  sections.push("");

  sections.push("### Priorites immediates\n");
  const priorityMarkersList = [...critical, ...suboptimal].slice(0, 6);
  if (priorityMarkersList.length) {
    const prioritySentences = priorityMarkersList.map(
      (marker) =>
        `Ton ${marker.name} est a ${marker.value} ${marker.unit || ""}, c'est ${statusToPriority(marker.status).toLowerCase()}. ` +
        `On vise ${marker.optimalRange || "la zone optimale"}`
    );
    sections.push(prioritySentences.join(". ") + ".");
  } else {
    sections.push("Rien d'alarmant sur ton panel, ton profil est globalement equilibre. On va quand meme chercher a optimiser.");
  }
  sections.push("");

  sections.push("### Opportunites performance\n");
  sections.push(
    "Tes leviers d'amelioration sont clairs. Premiere chose: stabilise ton sommeil et ton heure de coucher, ca va consolider tout ton axe hormonal. " +
    "Ensuite, structure ta nutrition autour de tes seances pour mieux gerer ta glycemie et optimiser ta recup. " +
    "Dans huit a douze semaines, on refait un bilan pour objectiver ta progression."
  );
  sections.push("");

  sections.push("### Lecture systemique\n");
  if (topPriorityMarkers.length) {
    const systemicSentences = topPriorityMarkers.slice(0, 6).map(
      (marker) =>
        `Ton ${marker.name} a ${marker.value} ${marker.unit || ""} impacte directement ton ${getMarkerPanelName(marker.markerId, marker.category).toLowerCase()}, ` +
        `ta recuperation et ta progression en salle`
    );
    sections.push(systemicSentences.join(". ") + ".");
  } else {
    sections.push("Ton panel est stable. On garde le cap et on consolide tes habitudes actuelles.");
  }
  sections.push("");

  sections.push("### Sequencement recommande\n");
  sections.push(
    "Voici ton plan sur 90 jours. " +
    "Etape 1: tu stabilises les bases, sommeil, repas, hydratation et charge d'entrainement. " +
    "Etape 2: on corrige tes marqueurs prioritaires. " +
    "Etape 3: tu montes en charge seulement quand tes marqueurs se normalisent. " +
    "Etape 4: on valide par un retest et on ajuste si besoin."
  );

  sections.push("\n## Qualite des donnees & limites\n");
  const confidenceLevel = analysisResult.markers.length >= 15 ? "eleve" : analysisResult.markers.length >= 9 ? "correct" : "limite vu le panel incomplet";
  sections.push(
    `Ton bilan comprend ${analysisResult.markers.length} marqueurs et j'ai detecte ${analysisResult.patterns.length} pattern${analysisResult.patterns.length > 1 ? "s" : ""}. ` +
    `Mon niveau de confiance est ${confidenceLevel}. Pour la prochaine fois, rappelle-toi: prise de sang le matin, a jeun 10-12h, ` +
    `pas de sport intense 24-48h avant, pas d'alcool 72h avant, et bien hydrate.`
  );
  sections.push("");
  sections.push(
    criticalMissingLabels.length
      ? `Ce qui me manque pour aller plus loin: ${toProse(criticalMissingLabels)}. ` +
        `Avec ces marqueurs en plus, j'aurais une lecture plus complete de ton metabolisme et de tes hormones.`
      : "Ce qui me manque, c'est plus d'infos sur ton lifestyle, ton sommeil, ton stress et ta charge d'entrainement. " +
        "Ca m'aiderait a mieux expliquer certains patterns."
  );
  sections.push("");

  sections.push("### Couverture par axe\n");
  const axisDescriptions = dashboardAxes.map((axis) => {
    const axisScore = scoreFromMarkers(axis.markers);
    if (!axis.markers.length) {
      return `Ton axe ${axis.label} n'est pas couvert, je n'ai pas de donnees`;
    }
    const axisCritical = axis.markers.filter((marker) => marker.status === "critical").length;
    const axisSuboptimal = axis.markers.filter((marker) => marker.status === "suboptimal").length;
    return `Ton axe ${axis.label}: ${axis.markers.length} marqueur${axis.markers.length > 1 ? "s" : ""}, score ${axisScore ?? "N/A"}/10, ` +
      `${axisCritical} critique${axisCritical > 1 ? "s" : ""} et ${axisSuboptimal} a corriger`;
  });
  sections.push(axisDescriptions.join(". ") + ".");
  sections.push("");

  sections.push("### Facteurs confondants\n");
  sections.push(
    `Tes conditions de prelevement: heure ${userProfile.drawTime || "non renseignee"}, ` +
    `jeune de ${userProfile.fastingHours ?? "?"} heures, ` +
    `dernier entrainement ${userProfile.lastTraining || "non renseigne"}, ` +
    `alcool 72h avant: ${userProfile.alcoholLast72h || "non renseigne"}, ` +
    `sommeil moyen: ${userProfile.sleepHours ?? "?"} heures, ` +
    `stress: ${userProfile.stressLevel ?? "?"}/10. ` +
    `Si ces conditions varient entre tes bilans, ca peut fausser la comparaison, surtout sur l'inflammation, la glycemie et le cortisol.`
  );
  sections.push("");

  sections.push("### Impact decisionnel des limites\n");
  sections.push(
    "Vu qu'on n'a pas tout, on avance prudemment. On priorise les actions a fort ROI et faible risque, " +
    "et on valide par des retests avant d'intensifier. Mes hypotheses restent des hypotheses tant qu'on ne les confirme pas " +
    "avec un nouveau bilan dans des conditions propres."
  );

  sections.push("\n## Tableau de bord (scores & priorites)\n");
  const quickWinsCount = Math.max(1, Math.min(6, analysisResult.markers.length - critical.length));
  sections.push(
    `En resume: ${critical.length} point${critical.length > 1 ? "s" : ""} critique${critical.length > 1 ? "s" : ""}, ` +
    `${suboptimal.length} a corriger, et ${quickWinsCount} quick win${quickWinsCount > 1 ? "s" : ""} pour des gains rapides.`
  );
  sections.push("");

  sections.push("### Scoreboard systemique\n");
  const scoreboardDescriptions = dashboardAxes.map((axis) => {
    const axisScore = scoreFromMarkers(axis.markers);
    const axisCritical = axis.markers.filter((marker) => marker.status === "critical").length;
    const axisSuboptimal = axis.markers.filter((marker) => marker.status === "suboptimal").length;
    const dominantSignal = axisCritical
      ? `${axisCritical} alerte${axisCritical > 1 ? "s" : ""} critique${axisCritical > 1 ? "s" : ""}`
      : axisSuboptimal
      ? `${axisSuboptimal} point${axisSuboptimal > 1 ? "s" : ""} a corriger`
      : axis.markers.length
      ? "stable"
      : "pas de donnees";
    return `${axis.label}: ${axisScore ?? "N/A"}/10, ${dominantSignal}`;
  });
  sections.push(scoreboardDescriptions.join(". ") + ".");
  sections.push("");

  sections.push("### Priorites principales\n");
  const topPriorities = [...critical, ...suboptimal].slice(0, 6);
  if (topPriorities.length) {
    const priorityDesc = topPriorities.map(
      (marker) => `ton ${marker.name} doit passer vers ${marker.optimalRange || "la zone optimale"}`
    );
    sections.push("On se concentre la-dessus: " + priorityDesc.join(", ") + ".");
  } else {
    sections.push("Pas d'alerte majeure, on consolide tes acquis.");
  }
  sections.push("");

  sections.push("### Quick wins\n");
  sections.push(
    "Des gains faciles a prendre: marche 10-15 min apres tes repas principaux, " +
    "place tes glucides autour de tes seances intenses, " +
    "fixe une heure de coucher et de reveil stable 7j/7, " +
    "et ajuste ton hydratation selon ta charge d'entrainement."
  );
  sections.push("");

  sections.push("### KPI de pilotage\n");
  sections.push(
    "Ce que tu suis chaque semaine: ton adherence sommeil/nutrition/training, ton energie, ta digestion et ta recup. " +
    "Chaque mois: la tendance de ton poids et tour de taille, ta progression en charge et ta tolerance au volume. " +
    "On refait un bilan dans 60-90 jours sur tes marqueurs prioritaires. " +
    "Si tes signaux critiques persistent malgre une bonne adherence, on escalade vers un avis medical."
  );

  sections.push("\n## Potentiel recomposition (perte de gras + gain de muscle)\n");
  const mainActionFactor = summary.action[0] || "ta qualite metabolique globale";
  sections.push(
    `Ton potentiel de recomposition depend surtout de ${mainActionFactor}. ` +
    `Avec ${critical.length} point${critical.length > 1 ? "s" : ""} critique${critical.length > 1 ? "s" : ""} et ` +
    `${suboptimal.length} a corriger, ` +
    `la logique c'est de corriger tes freins biologiques d'abord, puis de monter progressivement ta charge.`
  );
  sections.push("");
  const topTwoMarkers = [...critical, ...suboptimal].slice(0, 2).map((m) => m.name);
  sections.push(
    topTwoMarkers.length
      ? `Concretement, quand tu ramenes ${toProse(topTwoMarkers)} dans le vert, tu facilites ta perte de gras, ` +
        `tu ameliores ta recup et tu acceleres tes gains en force et en masse.`
      : "Concretement, quand tu ramenes tes marqueurs dominants dans le vert, tu facilites ta perte de gras, " +
        "tu ameliores ta recup et tu acceleres tes gains."
  );
  sections.push("");
  sections.push(
    "Les trois leviers qui debloquent le plus vite ta recomposition: regulariser ton sommeil, " +
    "periodiser ta nutrition, et valider par un retest sur tes marqueurs prioritaires."
  );
  sections.push("");

  sections.push("### Freins biologiques dominants\n");
  if (topPriorityMarkers.length) {
    const freinDescriptions = topPriorityMarkers.slice(0, 6).map(
      (marker) =>
        `Ton ${marker.name} te freine sur ta capacite a tenir le volume, a recuperer et a maintenir un deficit soutenable`
    );
    sections.push(freinDescriptions.join(". ") + ".");
  } else {
    sections.push("Pas de frein majeur identifie, tu as un bon potentiel de progression.");
  }
  sections.push("");

  sections.push("### Conditions de progression\n");
  sections.push(
    "Tu montes en volume et en intensite seulement si ton sommeil, ton energie et ta recup restent stables 2-3 semaines. " +
    "Les ajustements caloriques se font par petits paliers, pas de coupes agressives, pour proteger ta thyroide et tes hormones. " +
    "On valide tes gains sur l'evolution de tes marqueurs et ta performance, jamais sur le ressenti seul."
  );

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
    sections.push(`### ${axis.title}\n`);
    if (!axis.markers.length) {
      sections.push(
        `Je n'ai pas de donnees sur cet axe pour toi. Sans ces infos, je ne peux pas quantifier son impact sur ta fatigue, ta recomposition ou ta recup. ` +
        (axis.missingTests.length
          ? `Pour couvrir cet axe, ajoute ${toProse(axis.missingTests)} a ton prochain bilan.`
          : "Pas de test specifique requis pour le moment.")
      );
      sections.push("");
      continue;
    }

    const axisCritical = axis.markers.filter((m) => m.status === "critical").length;
    const axisSuboptimal = axis.markers.filter((m) => m.status === "suboptimal").length;
    const axisNormal = axis.markers.filter((m) => m.status === "normal").length;
    const axisScore = scoreFromMarkers(axis.markers);
    const flaggedMarkers = axis.markers.filter((marker) => marker.status === "critical" || marker.status === "suboptimal");

    // Score and markers description
    sections.push(`Score de cet axe: ${axisScore ?? "N/A"}/10.`);
    const markerDescriptions = axis.markers.map(
      (m) => `${m.name} a ${m.value} ${m.unit || ""} (labo: ${m.normalRange || "?"}, optimal: ${m.optimalRange || "?"}, statut: ${m.status})`
    );
    sections.push(`Tes marqueurs: ${toProse(markerDescriptions)}.`);
    sections.push("");

    // Clinical reading
    const clinicalReading = axisCritical > 0
      ? `${axisCritical} marqueur${axisCritical > 1 ? "s" : ""} critique${axisCritical > 1 ? "s" : ""}, on doit agir en priorite`
      : axisSuboptimal > 0
      ? `${axisSuboptimal} marqueur${axisSuboptimal > 1 ? "s" : ""} a corriger, c'est recuperable`
      : axisNormal > 0
      ? "ton axe est stable mais perfectible"
      : "ton axe est solide, proche de l'optimal";

    const dominantMarkerDesc = flaggedMarkers.length
      ? `Points d'attention: ${toProse(flaggedMarkers.slice(0, 3).map((marker) => `${marker.name} a ${marker.value} ${marker.unit || ""} (${statusToPriority(marker.status).toLowerCase()})`))}`
      : "Rien d'alarmant sur cet axe";

    sections.push(`Lecture clinique: ${clinicalReading}. ${dominantMarkerDesc}.`);
    sections.push("");

    // Performance reading
    sections.push(
      "Pour ta perf et ta recomposition, tant que ces marqueurs restent hors cible, ta progression en force, ta composition corporelle et ta recup ne seront pas optimales. " +
      "Objectif: ramener d'abord les marqueurs critiques dans le vert, puis viser l'optimal sur 60-90 jours."
    );
    sections.push("");

    // Actions
    const allActions = [
      ...axis.actions,
      "standardise tes conditions de prelevement (matin, a jeun, au repos)",
      "mets en place un suivi hebdo simple: sommeil, energie, perf training, adherence nutrition",
    ];
    sections.push(`Tes actions dans l'ordre: ${toProse(allActions, ", ", " et ")}.`);
    sections.push("");

    // KPIs
    sections.push(
      "Tes KPI sur 90 jours: progression de tes marqueurs vers l'optimal (biologique), ta charge utile et ta recup (performance), " +
      "et ton execution nutrition/sommeil/training a minimum 80% sur 4 semaines glissantes (adherence)."
    );
    sections.push("");

    // Missing tests
    const missingForAxis = axis.missingTests.filter((test) => !testedIds.has(normalizeMarkerName(test)));
    sections.push(
      missingForAxis.length
        ? `Pour completer cet axe, ajoute ${toProse(missingForAxis)} a ton prochain bilan.`
        : "Ton panel est complet pour cet axe."
    );
    sections.push("");
  }

  const priorityMarkers = topPriorityMarkers;
  sections.push("## Deep dive — marqueurs prioritaires\n");
  if (!priorityMarkers.length) {
    sections.push("Rien d'alarmant sur ton bilan, ton profil est equilibre. On consolide.");
  } else {
    for (const marker of priorityMarkers) {
      sections.push(`### ${marker.name}\n`);
      const statusReadable = marker.status === "critical" ? "franchement hors cible" : "a optimiser";
      const axisName = getMarkerPanelName(marker.markerId, marker.category);
      const confidenceLevel = marker.status === "critical" ? "bonne" : "moyenne";

      sections.push(
        `Statut: ${statusToPriority(marker.status).toLowerCase()}. Valeur: ${marker.value} ${marker.unit || ""}. ` +
        `Range labo: ${marker.normalRange || "?"}. Range optimal: ${marker.optimalRange || "?"}.`
      );
      sections.push("");

      sections.push(
        `Ton ${marker.name} est ${statusReadable}, on doit le remettre en ordre pour securiser ton axe ${axisName}. ` +
        `Tant qu'on ne corrige pas, ca impacte ta recup, ton energie et ta progression.`
      );
      sections.push("");

      sections.push(
        `Causes probables: ton contexte nutrition/recup, ta charge d'entrainement, un terrain inflammatoire/metabolique, ou les conditions de ta prise de sang. ` +
        `Attention aux facteurs confondants: conditions de prelevement, infection eventuelle, manque d'infos lifestyle.`
      );
      sections.push("");

      sections.push(
        `Plan d'action: 1) On corrige l'hygiene de base (sommeil, nutrition). 2) On ajuste ton training et ta recup. ` +
        `3) On priorise l'axe dominant. 4) On reteste en conditions standardisees.`
      );
      sections.push("");

      sections.push(
        `Chaque semaine, tu check: sommeil, hydratation, adherence nutrition, charge d'entrainement. ` +
        `Cible a 90 jours: sortir de la zone critique et stabiliser dans le normal minimum. ` +
        `Jalons: J+14 adherence, J+30 tendance perf, J+60 pre-retest.`
      );
      sections.push("");

      sections.push(
        `Signal d'alerte: pas de progression + fatigue qui monte + perf qui baisse = on reevalue ta charge et ton contexte. ` +
        `Strategie: on modifie une seule variable a la fois pour garder un signal clair. ` +
        `Ta checklist: 1 priorite par semaine, suivi ecrit, revue hebdo, decisions basees sur la tendance pas sur un jour.`
      );
      sections.push("");

      sections.push(
        `Pour aller plus loin: panel complementaire cible selon l'axe + contexte lifestyle detaille. ` +
        `Ma confiance sur cette analyse: ${confidenceLevel}.`
      );
      sections.push("");
    }
  }

  sections.push("## Interconnexions majeures (le pattern)\n");
  if (correlations.length) {
    correlations.forEach((item, idx) => {
      sections.push(`### Pattern ${idx + 1} — ${item.factor}\n`);
      sections.push(
        `Ce que je vois: ${item.current}. Mon hypothese: ${item.impact}. ` +
        `Pour confirmer, on fait un retest cible + suivi hebdo de ton lifestyle. ` +
        `Action concrete: ${item.recommendation}. ` +
        (item.evidence ? `Indice qui appuie cette hypothese: ${item.evidence}. ` : "") +
        `On valide si tes symptomes ou ta perf s'ameliorent et si tes marqueurs bougent dans le bon sens au retest 60-90 jours.`
      );
      sections.push("");
    });
  } else {
    sections.push("Pas assez de donnees pour etablir des interconnexions robustes. On avance avec ce qu'on a.");
    sections.push("");
  }

  sections.push("### Interconnexions biomarqueurs\n");
  if (priorityMarkers.length >= 2) {
    const connectionDrivers = priorityMarkers.slice(0, 6);
    const connectionDescriptions = connectionDrivers.map((marker) => {
      const linked = connectionDrivers
        .filter((candidate) => candidate.markerId !== marker.markerId)
        .slice(0, 2)
        .map((candidate) => `${candidate.name}`);
      const linkedText = linked.length ? toProse(linked) : "d'autres signaux";
      return `Ton ${marker.name} est probablement lie a ${linkedText} via un mecanisme commun (recup, metabolisme ou inflammation)`;
    });
    sections.push(connectionDescriptions.join(". ") + ".");
    sections.push("");
    sections.push(
      "Quand tu stabilises ton sommeil, ta nutrition et ta charge, ces marqueurs devraient bouger ensemble. " +
      "On priorise les fondamentaux: sommeil, deficit modere, repas reguliers, volume d'entrainement soutenable. Pas de complexite inutile."
    );
  } else {
    sections.push(
      "Pas assez de marqueurs a croiser pour une lecture mecanistique poussee. On se concentre sur les bases."
    );
  }
  sections.push("");

  if (analysisResult.patterns.length) {
    sections.push("### Patterns detectes\n");
    const patternDescriptions = analysisResult.patterns.slice(0, 6).map(
      (pattern) => `Je detecte un pattern ${pattern.name} chez toi, probablement lie a ${pattern.causes.join(", ") || "des facteurs qu'on doit encore identifier"}`
    );
    sections.push(patternDescriptions.join(". ") + ".");
    sections.push("");
    sections.push(
      "Mon hypothese: tu cumules plusieurs freins qui se renforcent entre eux tant que ton lifestyle reste instable. " +
      "On confirme ca avec un retest propre dans 60-90 jours et un suivi hebdo de ton adherence et de ta perf."
    );
    sections.push("");
  }

  sections.push("### Correlations lifestyle\n");
  if (correlations.length) {
    const lifestyleCorr = correlations.map(
      (item) => `Ton ${item.factor.toLowerCase()} (${item.current}) impacte directement ton profil: ${item.impact}. Ce que tu fais: ${item.recommendation}`
    );
    sections.push(lifestyleCorr.join(". ") + ".");
  } else {
    sections.push("Je n'ai pas assez d'infos sur ton lifestyle pour etablir des correlations solides. On avance avec ce qu'on a.");
  }

  sections.push("\n## Plan d'action 90 jours\n");

  sections.push("### Jours 1-14 (Stabilisation)\n");
  const phase1Markers = priorityMarkers.slice(0, 4).map((m) => m.name);
  sections.push(
    "Ton objectif cette premiere phase: stabiliser ton sommeil, tes repas, ton adherence et ton stress. " +
    "Ce que tu fais: heure de coucher/reveil fixe 7j/7 avec lumiere naturelle le matin, " +
    "2-3 repas structures avec proteines et fibres a chaque fois, 10-15 min de marche apres tes 2 repas principaux, " +
    "hydratation et electrolytes calibres selon ta transpiration."
  );
  sections.push("");
  sections.push(
    "Ce que tu surveilles: ton energie au reveil, ta latence d'endormissement, ton adherence (vise 80%+), ta faim et tes envies. " +
    "Ce que tu evites: deficit calorique agressif, empilement de supplements, surcharge d'entrainement direct. " +
    (phase1Markers.length ? `Tes marqueurs cibles phase 1: ${toProse(phase1Markers)}. ` : "On vise la stabilisation globale. ") +
    "Tu valides la phase quand tes routines tournent de facon stable pendant 10-14 jours."
  );
  sections.push("");

  sections.push("### Jours 15-30 (Phase d'Attaque)\n");
  const priority1Actions = priority1.slice(0, 8).map((rec) => rec);
  sections.push(
    "Ton objectif: attaquer tes biomarqueurs prioritaires sans te cramer. " +
    (priority1Actions.length
      ? `Tes actions prioritaires: ${toProse(priority1Actions)}. `
      : "Tu ajustes ta nutrition et ta charge selon le feedback que tu observes. ")
  );
  sections.push("");
  sections.push(
    "Ce que tu surveilles: tendance poids et tour de taille, perf sur tes exercices de base, fatigue ressentie, digestion. " +
    "Ce que tu evites: changer 10 variables d'un coup, ignorer les signes de surmenage. " +
    "Tes cibles: faire baisser les signaux critiques, stabiliser les suboptimaux. " +
    "Tu progresses si ton sommeil est stable, ton energie acceptable et ton adherence au-dessus de 80% sur 2 semaines."
  );
  sections.push("");

  sections.push("### Jours 31-60 (Consolidation)\n");
  const priority2Actions = priority2.slice(0, 8).map((rec) => rec);
  sections.push(
    "Ton objectif: consolider les habitudes qui marchent et lisser les fluctuations. " +
    (priority2Actions.length
      ? `Tes actions de consolidation: ${toProse(priority2Actions)}. `
      : "Tu consolides ce qui impacte vraiment tes marqueurs prioritaires. ")
  );
  sections.push("");
  sections.push(
    "Ce que tu surveilles: adherence durable, qualite de sommeil, perf stable, baisse des marqueurs hors cible. " +
    "Ce que tu evites: retomber dans une strategie extreme ou trop restrictive. " +
    "Tes cibles: ramener progressivement tes marqueurs encore hors cible vers la zone normale. " +
    "Point de controle: si ta recup ne suit pas, tu reevalues ta charge d'entrainement."
  );
  sections.push("");

  sections.push("### Jours 61-90 (Optimisation)\n");
  sections.push(
    "Ton objectif: optimiser ta recomposition et ta perf tout en gardant ta biologie sous controle. " +
    "Tu montes l'intensite progressivement seulement si tes signaux biologiques se normalisent. " +
    "Tu affines ta nutrition et ton entrainement selon la tendance de tes marqueurs prioritaires. " +
    "Tu peux tester un bloc d'intensification ou un bloc volume selon ta recup."
  );
  sections.push("");
  sections.push(
    "Ce que tu surveilles: progression de ta charge utile, repartition masse grasse/maigre, stabilite energetique. " +
    "Ce que tu evites: surestimer ta recup, supprimer trop vite les fondamentaux. " +
    "Tes cibles: consolider tes gains biologiques et eviter la rechute. " +
    "Ta decision finale: maintenir, intensifier ou corriger selon le retest et ce que tu observes sur le terrain."
  );
  sections.push("");

  sections.push("### Retest & conditions de prelevement\n");
  if (critical.length || suboptimal.length) {
    const retestMarkers = [...critical, ...suboptimal].slice(0, 8).map(
      (marker) => `ton ${marker.name} (actuellement ${marker.value} ${marker.unit || ""}, cible: ${marker.optimalRange || "zone optimale"})`
    );
    sections.push(`Ce que tu retestes a 60-90 jours: ${toProse(retestMarkers)}.`);
  } else {
    sections.push("On prevoit un retest de consolidation a 12 semaines.");
  }
  sections.push("");
  sections.push(
    "Conditions strictes pour ton prelevement: le matin, a jeun depuis 10-12h, pas de sport intense dans les 24-48h avant, " +
    "pas d'alcool depuis 72h, hydratation stable. " +
    (followUp.length
      ? `Controles supplementaires recommandes: ${toProse(followUp.map((f) => f.replace(/^- /, "")))}.`
      : "Pas de controle supplementaire impose pour l'instant.")
  );
  sections.push("");
  sections.push(
    "Je te recommande de tenir un journal de pilotage: adherence, energie, sommeil, perf, signaux digestifs, chaque jour. " +
    "Ma regle: si 2 semaines passent sans amelioration nette, tu reviens au dernier protocole stable et tu ajustes par palier. " +
    "Si aggravation clinique ou de perf: retour aux fondamentaux pendant 7-10 jours, tu simplifies le plan. " +
    "Ton critere de succes: tendance favorable sur tes marqueurs prioritaires + progression mesurable sans te cramer. " +
    "Critere d'echec: adherence correcte mais stagnation biologique durable, la il faut des tests complementaires et un avis medical."
  );

  sections.push("\n## Nutrition & entrainement\n");

  sections.push("### Nutrition\n");
  sections.push(
    "Ta structure hebdomadaire: 80-90% de repas simples et repetables, 10-20% de flexibilite controlee. " +
    "Ta priorite: proteines, fibres et densite micronutritionnelle a chaque repas. " +
    "Tes glucides: concentres autour de tes entrainements pour optimiser ta perf sans degrader ta glycemie. " +
    "Ton deficit calorique: progressif, jamais agressif sur plusieurs semaines. " +
    "Rotation alimentaire: tu gardes les memes bases mais tu varies tes sources pour eviter la fatigue."
  );
  sections.push("");
  sections.push(
    "Si tes marqueurs glycemiques sont alteres: fibres et proteines avant les glucides + marche post-prandiale. " +
    "Si ton profil inflammatoire est eleve: tu reduis progressivement l'alcool et les ultra-transformes, focus omega-3. " +
    "Si ton axe hormonal est fragile: tu evites les seches agressives, tu maintiens des lipides de qualite. " +
    "Si on a des donnees manquantes: approche conservative orientee adherence."
  );
  sections.push("");

  sections.push("### Entrainement\n");
  sections.push(
    "Ton volume: 3-5 seances qualitatives par semaine avec un deload planifie. " +
    "Cardio zone 2: 120-180 min par semaine si ton axe metabolique ou lipidique est altere. " +
    "NEAT quotidien eleve: ca soutient ta recomposition sans te cramer. " +
    "Deload immediat si: sommeil degrade + baisse de perf + marqueurs inflammatoires defavorables. " +
    "En phase de correction biologique: garde 1-2 reps en reserve sur la majorite de tes series, " +
    "priorise la qualite d'execution avant le volume maximal."
  );
  sections.push("");

  sections.push("### Execution et suivi\n");
  sections.push(
    "Ton dashboard hebdo: sommeil moyen, steps, charge interne, adherence nutritionnelle, ressenti de recup. " +
    "Ma regle d'or: tu n'ajustes qu'1-2 variables par semaine pour garder un signal lisible. " +
    "Tu valides ton protocole quand ta perf et tes biomarqueurs progressent ensemble."
  );
  sections.push("");

  sections.push("### Ajustements conditionnels\n");
  sections.push(
    "Fatigue persistante + marqueurs inflammatoires eleves: tu reduis le volume 7-10 jours tout en gardant l'intensite technique. " +
    "Stagnation perte de gras au-dela de 14 jours: tu augmentes ton NEAT avant de baisser encore les calories. " +
    "Faim et envies explosives: tu remontes legerement tes glucides peri-training plutot que de forcer la restriction. " +
    "Chute de perf sur 2 semaines: deload court + priorite sommeil + verif hydratation."
  );
  sections.push("");

  sections.push("### Checklist operationnelle\n");
  sections.push(
    "Ton suivi quotidien: heure de coucher/reveil, tes 2-3 repas structures, hydratation, steps, note d'entrainement. " +
    "Ton suivi hebdo: revue des tendances + ajustement minimal. " +
    "Ton suivi mensuel: tu verifies que tes marqueurs prioritaires evoluent dans le bon sens."
  );
  sections.push("");

  sections.push("### Traduction par marqueur prioritaire\n");
  if (priorityMarkers.length) {
    const markerTranslations = priorityMarkers.slice(0, 8).map(
      (marker) =>
        `Ton ${marker.name}: avec une nutrition plus stable et un entrainement mieux periodise, tu vas reduire ce signal ${statusToPriority(marker.status).toLowerCase()}`
    );
    sections.push(markerTranslations.join(". ") + ".");
  } else {
    sections.push("Pas de marqueur prioritaire a traduire en protocole specifique pour toi.");
  }
  sections.push("");

  sections.push("### Periodisation pratique\n");
  sections.push(
    "Tes jours d'entrainement: glucides majoritairement en peri-training, proteines reparties sur 3-4 prises. " +
    "Tes jours de repos: tu maintiens proteines et fibres, tu ajustes les glucides sans couper brutalement. " +
    "Tes periodes de deload: tu gardes la qualite nutritionnelle, tu reduis le volume et tu proteges ton sommeil."
  );

  sections.push("\n## Supplements & stack\n");

  sections.push("### Niveau 1 — Fondamentaux\n");
  sections.push(
    "Tes fondamentaux a impact large: Vitamine D3 2000-5000 UI/jour avec un repas gras (selon ton statut), ca cible ton immunite, ta perf et ton axe hormonal. " +
    "Magnesium glycinate 300-400mg le soir pour ton sommeil, ta gestion du stress et ta recup nerveuse. " +
    "Omega-3 EPA/DHA 2-3g/jour pour ton terrain inflammatoire et lipidique. " +
    "Creatine monohydrate 3-5g/jour pour ta force, ta masse maigre et ta capacite de travail."
  );
  sections.push("");

  sections.push("### Niveau 2 — Cibles metaboliques et inflammatoires\n");
  sections.push(
    "Berberine: si ta glycemie ou ton HOMA-IR sont alteres, dose fractionnee, tu surveilles ta digestion et attention aux interactions hypoglycemiantes. " +
    "Psyllium ou fibres solubles: en pre-repas riches en glucides pour lisser ta reponse glycemique. " +
    "Curcuminoides standardises: si ton profil est inflammatoire, avec le repas, tu verifies ta tolerance digestive. " +
    "Glycine le soir: support sommeil et recup si tu es un profil stresse."
  );
  sections.push("");

  sections.push("### Niveau 3 — Ajustements selon panel\n");
  sections.push(
    "Zinc: si ton statut est bas, courte phase puis reevaluation au retest. " +
    "B12 et folate: tu corriges d'abord un deficit confirme, puis maintenance. " +
    "Electrolytes sodium/potassium: tu calibres selon ta transpiration, ton cardio et ton volume d'entrainement. " +
    "NAC: si tes enzymes hepatiques sont sensibles, usage transitoire + verif tolerance + retest. " +
    "CoQ10: support mitochondrial si tu cumules fatigue et charge d'entrainement elevee."
  );
  sections.push("");

  sections.push("### Regles de securite\n");
  sections.push(
    "Tu introduis un supplement majeur a la fois pendant 5-7 jours pour isoler l'effet. " +
    "Reevaluation toutes les 4 semaines: efficacite percue, tolerance, adherence, cout. " +
    "Tu stoppes ou reduis si un effet secondaire persiste, avis medical si necessaire. " +
    "Tu ajustes ton stack selon le retest biologique a 60-90 jours, pas uniquement au ressenti."
  );
  sections.push("");

  sections.push("### Matrice decisionnelle\n");
  sections.push(
    "Priorite haute: tes biomarqueurs critiques avec forte probabilite de benefice et risque faible. " +
    "Priorite moyenne: tes biomarqueurs suboptimaux avec objectif de perf specifique. " +
    "Priorite basse: optimisation fine sans signal biologique fort."
  );
  sections.push("");

  sections.push("### Stack personnalise par marqueur\n");
  if (priorityMarkers.length) {
    const stackByMarker = priorityMarkers.slice(0, 10).map((marker) => {
      const panel = getMarkerPanelName(marker.markerId, marker.category);
      return `Pour ton ${marker.name} (axe ${panel}): tu priorises les fondamentaux + les options ciblees, ` +
        `puis tu confirmes l'efficacite au retest a 60-90 jours`;
    });
    sections.push(stackByMarker.join(". ") + ".");
  } else {
    sections.push("Pas de stack cible requis au-dela des fondamentaux sur ton panel.");
  }
  sections.push("");

  sections.push("### Pilotage cout et benefice\n");
  sections.push(
    "Ton stack doit rester court au debut: fort ROI, bonne adherence, bonne tolerance. " +
    "Tu n'ajoutes une brique que si un marqueur ou un pattern justifie clairement l'investissement. " +
    "Ce qui n'apporte pas de signal mesurable sur 4-8 semaines: tu coupes."
  );
  sections.push("");

  sections.push("### Calendrier d'introduction\n");
  sections.push(
    "Semaine 1: tu introduis les fondamentaux pour ton sommeil et ta recup + 1-2 supplements de base. " +
    "Semaines 2-3: tu ajoutes une brique ciblee si tes signaux prioritaires restent eleves. " +
    "Semaines 4-6: tu evalues tolerance et efficacite avant toute escalation. " +
    "Semaines 7-12: tu simplifies ton stack autour des options qui montrent un effet concret."
  );
  sections.push("");

  sections.push("### Suivi de tolerance et efficacite\n");
  sections.push(
    "Tu evalues ta tolerance sur: sommeil, digestion, energie, FC au repos, ressenti d'entrainement. " +
    "Tu evalues l'efficacite sur: mouvement de tes marqueurs cibles, baisse des signaux critiques, progression de perf sans fatigue excessive. " +
    "Ta decision: tu maintiens si signal positif net, tu ajustes si signal mixte, tu stoppes si signal negatif persistant."
  );
  sections.push("");

  sections.push("### Pratiques a eviter\n");
  sections.push(
    "Ce que tu evites: un stack trop large des le debut (bruit, cout, adherence faible), " +
    "les promesses de resultats sans retest, et les ajustements de doses agressifs sans donnees de tolerance."
  );

  sections.push("\n## Annexes (references et vigilance)\n");

  sections.push("### Annexe A — Marqueurs secondaires\n");
  if (analysisResult.markers.length) {
    const markersList = analysisResult.markers.slice(0, 24).map(
      (marker) => `ton ${marker.name} (${marker.status}, ${marker.value} ${marker.unit})`
    );
    sections.push(`Lecture rapide de tes marqueurs secondaires: ${toProse(markersList)}.`);
  } else {
    sections.push("Pas de marqueur secondaire disponible pour une lecture rapide.");
  }
  sections.push("");

  sections.push("### Annexe B — Hypotheses et tests de confirmation\n");
  if (criticalMissing.length) {
    const hypotheses = criticalMissing.map(
      (id) => `${id.replace(/_/g, " ").toUpperCase()}`
    );
    sections.push(`Des tests complementaires te permettraient de verifier certaines hypotheses via: ${toProse(hypotheses)}.`);
  } else {
    sections.push("Pas d'hypothese critique supplementaire qui necessite des tests de confirmation pour toi.");
  }
  sections.push("");

  sections.push("### Annexe C — Glossaire\n");
  sections.push(
    "HOMA-IR: indice de resistance a l'insuline, ca evalue la sensibilite de tes cellules a cette hormone. " +
    "ApoB: charge de particules atherogenes, marqueur de risque cardiovasculaire. " +
    "hs-CRP: marqueur d'inflammation systemique de basse intensite, utile pour evaluer ton terrain inflammatoire. " +
    "SHBG: proteine qui module la fraction libre de tes hormones sexuelles, impacte leur biodisponibilite."
  );
  sections.push("");

  sections.push("### Vigilance\n");
  if (alerts.length) {
    sections.push(`Points de vigilance identifies pour toi: ${toProse(alerts.map((a) => a.replace(/^- /, "")))}.`);
  } else {
    sections.push("Pas de signal critique majeur qui necessite une consultation medicale immediate sur ton bilan.");
  }

  sections.push("\n## Sources (bibliotheque)\n");

  const knowledgeSourceLines = (knowledgeContext || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith("[SRC:"));

  if (knowledgeSourceLines.length) {
    const sourcesDesc = knowledgeSourceLines.slice(0, 12).join(", ");
    sections.push(`Sources utilisees pour ton analyse: ${sourcesDesc}.`);
  } else {
    const fallbackSources = Object.values(PANEL_CITATIONS)
      .flat()
      .slice(0, 10)
      .map((citation) => `${citation.title} (${citation.url})`);
    sections.push(`References bibliographiques consultees: ${toProse(fallbackSources)}.`);
  }

  sections.push("");
  sections.push(
    "Ce rapport est personnalise sur tes marqueurs reels avec un plan d'action concret et un retest structure. On avance ensemble."
  );

  return reorderReportSections(sections.join("\n"));
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

ATTENTION: Genere EXACTEMENT ces 12 sections, NI PLUS NI MOINS. NE PAS ajouter "## Donnees & tests complementaires" ou toute autre section non listee!

EXIGENCES DE QUALITE:
- CITATIONS [SRC:ID]: Tu DOIS inclure AU MINIMUM 8 citations [SRC:ID] reparties dans le rapport (Synthese, Deep dive, Plan, Nutrition).
- Longueur cible: ${targetChars} caracteres minimum, sans remplissage artificiel.
- Traiter au moins ${minDeepDiveMarkers} marqueurs en deep dive (ou tous les non-optimaux s'il y en a moins).
- Pour chaque axe et chaque marqueur prioritaire: lecture clinique + lecture performance + actions concretes.
- Rediger exclusivement en prose narrative: paragraphes complets et phrases detaillees.
- Interdiction absolue dans la sortie finale: listes a puces, listes numerotees, tableaux markdown.
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
        : `\nATTENTION: Ta reponse precedente etait trop generique ou non conforme. Corrige en utilisant STRICTEMENT les donnees patient et les sources fournies, avec les 12 sections H2 exactes dans l'ordre, et un style 100% narratif sans puces, sans numerotation, sans tableaux.\n`;
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
      const normalizedCandidate = reorderReportSections(ensureSourcesSection(candidate));
      const deepDiveCheck = validateDeepDive(normalizedCandidate, deepDivePayload.markerNames);
      const structureCheck = validateReportStructure(normalizedCandidate, analysisResult.markers);
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
        model: process.env.BLOOD_ANALYSIS_MODEL || "claude-opus-4-6",
        max_tokens: 9000,
        system:
          "Tu es un expert bloodwork performance. Genere uniquement la section demandee, en markdown propre, avec style narratif strict sans puces, sans numerotation, sans tableaux.",
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
  const narrativeConstraint = "Rediger uniquement en paragraphes complets, sans puces, sans numerotation, sans tableaux markdown.";

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
      title: "Qualite des donnees & limites",
      aliases: ["qualite-des-donnees-limites"],
      minChars: qualityThresholds.qualite,
      maxTokens: 4200,
      prompt: () => `Genere UNIQUEMENT la section "## Qualite des donnees & limites".

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
      title: "Tableau de bord (scores & priorites)",
      aliases: ["tableau-de-bord-scores-priorites"],
      minChars: qualityThresholds.tableau,
      maxTokens: 4500,
      prompt: () => `Genere UNIQUEMENT la section "## Tableau de bord (scores & priorites)".

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
      title: "Lecture compartimentee par axes",
      aliases: ["lecture-compartimentee-par-axes", "analyse-par-axe"],
      minChars: qualityThresholds.axes,
      maxTokens: 9000,
      prompt: () => `Genere UNIQUEMENT la section "## Lecture compartimentee par axes".

Contraintes:
- ${narrativeConstraint}
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
- Cite [SRC:ID] uniquement si l'ID existe dans le contexte.

Contexte:
Marqueurs: ${markersTable}
Patterns: ${patternsText}
${knowledgeContext ? `\nSources disponibles:\n${knowledgeContext}` : ""}`,
    },
    {
      title: "Deep dive — marqueurs prioritaires",
      aliases: ["deep-dive-marqueurs-prioritaires", "deep-dive"],
      minChars: qualityThresholds.deepDive,
      maxTokens: 10000,
      prompt: () => `Genere UNIQUEMENT la section "## Deep dive — marqueurs prioritaires".

Contraintes:
- ${narrativeConstraint}
- Longueur minimale: ${qualityThresholds.deepDive} caracteres.
- Couvrir au moins ${minDeepDiveMarkers} marqueurs prioritaires, en priorisant critiques/suboptimaux.
- Pour chaque marqueur prioritaire, creer un sous-titre "### Nom du marqueur" puis des paragraphes dedies a la priorite, la valeur et les ranges, la lecture clinique, la lecture performance, les causes plausibles, les facteurs confondants, le plan d'action, les tests a ajouter et le niveau de confiance.
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
      title: "Nutrition & entrainement",
      aliases: ["nutrition-entrainement", "nutrition-entrainement-traduction-pratique", "protocole-nutrition"],
      minChars: qualityThresholds.nutrition,
      maxTokens: 8000,
      prompt: () => `Genere UNIQUEMENT la section "## Nutrition & entrainement".

Contraintes:
- ${narrativeConstraint}
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
      prompt: () => `Genere UNIQUEMENT la section "## Supplements & stack".

Contraintes:
- ${narrativeConstraint}
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
      title: "Annexes (references et vigilance)",
      aliases: ["annexes-references-et-vigilance", "annexes-ultra-long", "annexes"],
      minChars: 900,
      maxTokens: 5000,
      prompt: () => `Genere UNIQUEMENT la section "## Annexes (references et vigilance)".

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
          "Tu es un expert bloodwork performance. Genere uniquement la section demandee en markdown, sans texte hors section, avec style narratif strict sans puces, sans numerotation, sans tableaux.",
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

  const orderedOutput = reorderReportSections(output);
  const withSources = ensureSourcesSection(orderedOutput);
  const normalizedOutput = reorderReportSections(withSources);
  const trimmedOutput = trimAiAnalysis(normalizedOutput);
  const finalStructureCheck = validateReportStructure(trimmedOutput, analysisResult.markers);
  if (!finalStructureCheck.ok) {
    const reasons = finalStructureCheck.reasons.join(" | ");
    const allowDeterministicFallback = process.env.BLOOD_ANALYSIS_ALLOW_FALLBACK === "true";
    if (!allowDeterministicFallback) {
      throw new Error(`AI_REPORT_QUALITY_GATE_FAILED:${reasons}`);
    }
    console.warn(`[BloodAnalysis] Final report failed quality gate: ${reasons}. Using deterministic fallback.`);
    const fallbackReport = buildFallbackReport();
    const fallbackStructureCheck = validateReportStructure(fallbackReport, analysisResult.markers);
    if (!fallbackStructureCheck.ok) {
      console.warn(`[BloodAnalysis] Deterministic fallback still below target: ${fallbackStructureCheck.reasons.join(" | ")}`);
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
