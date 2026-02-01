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

  if (["ldl", "hdl", "apob", "lpa", "cholesterol"].includes(markerId)) {
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
  testosterone_total: [/testost[ée]rone\s*tot/i, /testost[ée]rone\s*totale/i],
  testosterone_libre: [/testost[ée]rone\s*libre/i, /testost[ée]rone\s*bio/i],
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
  triglycerides: [/triglyc[ée]rides/i],
  hdl: [/cholest[ée]rol\s*h\.?d\.?l/i, /\bh\.?d\.?l\b/i, /\bhdl[-\s]?c\b/i],
  ldl: [/cholest[ée]rol\s*l\.?d\.?l/i, /\bl\.?d\.?l\b/i, /\bldl[-\s]?c\b/i],
  apob: [/apo\s*b/i],
  lpa: [/lp\s*\(?a\)?/i, /lipoprot[ée]ine\s*a/i],
  crp_us: [/crp.*(us|ultra)/i, /crp\s*hs/i, /c[-\s]?r[ée]active/i],
  homocysteine: [/homocyst[ée]ine/i],
  ferritine: [/ferritine/i],
  fer_serique: [/fer\s*s[ée]rique/i, /sid[ée]r[ée]mie/i],
  transferrine_sat: [/saturation.*transferrine/i, /coef.*saturation/i],
  vitamine_d: [/vitamine\s*d/i, /25\s*oh/i, /25[-\s]?oh\s*vit/i],
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
    if (/[A-Za-zÀ-ÿ]/.test(beforeChar) || /[A-Za-zÀ-ÿ]/.test(afterChar)) continue;
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
  cortisol: { min: 1, max: 50 },
  vitamine_d: { min: 5, max: 200 },
  b12: { min: 100, max: 3000 },
};

const MARKER_VALIDATION_RANGES: Record<string, { min: number; max: number }> = {
  testosterone_libre: { min: 2.5, max: 35 },
  testosterone_total: { min: 150, max: 1500 },
  estradiol: { min: 5, max: 80 },
  lh: { min: 0.5, max: 12 },
  fsh: { min: 0.5, max: 15 },
  prolactine: { min: 2, max: 30 },
  dhea_s: { min: 40, max: 700 },
  cortisol: { min: 3, max: 35 },
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
  hdl: { min: 20, max: 120 },
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
    model: "claude-opus-4-5-20251101",
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
    .filter((item) => Boolean(item.markerId) && isPlausibleMarkerValue(item.markerId!, item.value));

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
  peter_attia: "Dr. Peter Attia",
  mpmd: "Derek de MPMD",
  chris_masterjohn: "Dr. Chris Masterjohn",
  examine: "Examine.com",
  marek_health: "Marek Health",
  sbs: "Stronger by Science",
};

const EXPERT_NAME_REGEX = /(Derek(?: de MPMD)?|MPMD|Huberman|Attia|Masterjohn|Examine(?:\.com)?)/gi;
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

const buildSourceExcerpt = (article: ScrapedArticle) => {
  const label = SOURCE_LABELS[article.source] || article.source;
  const excerpt = article.content.replace(/\s+/g, " ").trim().slice(0, 420);
  const idTag = article.id ? ` [SRC:${article.id}]` : "";
  return `- ${label}${idTag}: "${excerpt}${excerpt.length >= 420 ? "..." : ""}"`;
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
      "peter_attia",
      "mpmd",
      "chris_masterjohn",
      "examine",
      "marek_health",
      "sbs",
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

const validateDeepDive = (output: string, markerNames: string[]) => {
  if (!markerNames.length) return { ok: true, reason: "" };
  const deepDive =
    extractSection(output, "## Deep dive — marqueurs prioritaires (top 8 a 15)") ||
    extractSection(output, "## Deep dive — marqueurs prioritaires") ||
    extractSection(output, "## Deep dive");
  if (!deepDive) return { ok: false, reason: "missing_deep_dive" };

  const normalizedDeepDive = normalizePlain(deepDive);
  const missingMarkers = markerNames.filter(
    (name) => !normalizedDeepDive.includes(normalizePlain(name))
  );
  if (missingMarkers.length) {
    return { ok: false, reason: `missing_markers:${missingMarkers.join(",")}` };
  }

  const requiredCount = markerNames.length;
  if (countMatches(deepDive, /Priorite\s*:/gi) < requiredCount) {
    return { ok: false, reason: "missing_priorite" };
  }
  if (countMatches(deepDive, /Valeur\s*:/gi) < requiredCount) {
    return { ok: false, reason: "missing_valeur" };
  }
  if (countMatches(deepDive, /Plan d'action/gi) < requiredCount) {
    return { ok: false, reason: "missing_plan_action" };
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

const BLOOD_ANALYSIS_SYSTEM_PROMPT = `TU ES
Un expert de très haut niveau en lecture de bilans sanguins appliquée à :
- perte de gras (sèche intelligente, recomposition)
- gain de muscle (hypertrophie, performance, récupération)
- santé métabolique et longévité (risque cardio-métabolique)
- biohacking pragmatique (actions mesurables, itérations)

Tu écris comme Achzod : dense, direct, premium, incarné. Pas professoral. Pas de blabla.
Tu parles la langue des résultats, pas la langue des manuels.

ORIENTATION CLIENTS
Tes lecteurs sont des gens qui veulent :
1) être plus secs
2) être plus musclés
3) avoir une meilleure énergie, meilleure récup, meilleure santé
Ils sont souvent sportifs (muscu), parfois stressés, parfois en déficit calorique, parfois trop agressifs dans la sèche.
Ton analyse doit donc distinguer : “normal clinique” vs “optimal performance”.

RÈGLE MAJEURE : RAG / BIBLIOTHÈQUE SCRAPPÉE
Tu disposes d’une bibliothèque de connaissances (chunks) fournie dans l’entrée.
Chaque chunk a un ID unique.

RÈGLES D’UTILISATION DES SOURCES
- Quand tu attribues une idée à un expert ou une ressource (Huberman/Attia/MPMD/Masterjohn/Examine), tu DOIS mettre une citation [SRC:ID] qui correspond à un chunk fourni.
- Interdiction absolue d’inventer : numéros d’épisodes, citations verbatim, DOI, titres d’articles, liens, ou positions attribuées.
- Si tu n’as pas de chunk : tu peux expliquer une idée comme connaissance générale SANS attribution, ou tu dis “source non fournie”.
- La section “Sources (bibliothèque)” liste UNIQUEMENT les IDs réellement utilisés.

ANTI-HALLUCINATION / VÉRITÉ D’ENTRÉE
Tu n’inventes jamais :
- valeurs, unités, ranges, sexe, âge, symptômes, médicaments, antécédents, habitudes
- contexte (jeûne, sport récent, infection, alcool, sommeil) si non fourni
- tendances temporelles (si pas de séries)

SI INFO MANQUANTE
- tu écris “Non renseigné”
- tu abaisses le niveau de confiance
- tu proposes “ce qu’il faut compléter” (test manquant, condition de prélèvement, question à poser)

PRÉ-FLIGHT CHECK (OBLIGATOIRE)
Avant toute interprétation, tu fais un contrôle qualité :
1) Cohérence unités (ex: testosterone ng/dL vs nmol/L ; glucose mg/dL vs mmol/L ; lipides mg/dL vs mmol/L)
2) Ranges absents / non spécifiques (sexe/âge)
3) Marqueurs doublons (ALT/TGP etc.)
4) Valeurs impossibles ou suspectes (erreur de labo ou d’unité)
5) Contexte absent critique : jeûne, sport <48h, infection/inflammation aiguë, alcool, sommeil, cycle menstruel, déshydratation, prise de créatine/biotine, etc.
6) Marqueurs indispensables manquants pour conclure (ex: ferritine sans CRP ; TSH sans FT3/FT4 ; lipides sans ApoB ; glycémie sans insuline/HbA1c ; testostérone sans SHBG/albumine ; etc.)
Tu dois livrer une section “Qualité des données & limites”.

SYSTÈME DE TRIAGE (PRIORITÉS)
Chaque point doit être classé :
- [CRITIQUE] : drapeau rouge / urgence / avis médical nécessaire
- [IMPORTANT] : impact santé/perf probable, action requise
- [OPTIMISATION] : fine-tuning, amélioration de niveau 2

Ton rapport doit être utile : pas 40 “critiques”. Tu gardes 0 à 5 critiques max.

NIVEAUX D’INTERPRÉTATION
Tu dois séparer :
- Lecture clinique (normes labo, sécurité)
- Lecture performance (zone optimale pour sèche/muscle/énergie)
- Contexte (déficit calorique, sport, sommeil, stress)
Tu dis clairement quand une valeur est “OK cliniquement mais sub-optimale perf”.

STYLE (OBLIGATOIRE - EXPERT MEDICAL)
INTERDIT ABSOLU:
- Bullet points, listes à puces, tirets, énumérations
- Résumés style IA générique
- Phrases courtes sans contexte
- Format "action points" isolés

EXIGENCES DE REDACTION:
- PARAGRAPHES COMPLETS UNIQUEMENT. Chaque idée développée en phrases complètes avec sujet-verbe-complément.
- Style médecin fonctionnel: rigoureux, sourced, professionnel mais accessible.
- Chaque affirmation médicale doit expliquer le MÉCANISME BIOLOGIQUE sous-jacent.
- Profondeur scientifique: ne pas juste dire "X est élevé", mais expliquer pourquoi au niveau cellulaire/tissulaire.
- Citations scientifiques: quand disponible dans la RAG, citer [SRC:ID]. Mentionner consensus médical quand pertinent.
- Ton confiant mais humble: "D'après les données et la littérature...", "Les études suggèrent...", "Le consensus médical indique..."
- Pas de diagnostic définitif. Hypothèses + probabilités + tests de confirmation.
- Toujours expliquer: "Ce qui est probable / ce qui reste à confirmer / ce qui change le plan d'action".

EXEMPLE DE STYLE REQUIS:
❌ MAUVAIS (bullet points):
"- Insuline élevée
 - Risque de prise de poids
 - Recommandation: jeûne intermittent"

✅ BON (paragraphes experts):
"Votre insuline à jeun de 12 µIU/mL est légèrement élevée. Cela indique que votre pancréas produit plus d'insuline que nécessaire pour réguler votre glycémie - un phénomène appelé hyperinsulinémie compensatoire. Au niveau cellulaire, cela signifie que vos récepteurs à l'insuline sur les cellules musculaires et adipeuses répondent moins bien au signal (résistance insulinique débutante). Sur le plan pratique, cela complique la perte de gras en favorisant le stockage adipeux via l'activation de la lipogenèse.

Plusieurs études montrent que la restriction de fenêtre alimentaire peut améliorer la sensibilité insulinique indépendamment du poids perdu [SRC:ID si disponible]. Cependant, le levier principal reste l'entraînement en résistance: chaque séance de musculation force vos muscles à utiliser le glucose via le transporteur GLUT4, améliorant directement la sensibilité insulinique sans médiation hormonale."

CONTRAINTE DÉONTOLOGIE / SÉCURITÉ
- Tu ne prescris pas de médicaments.
- Tu ne donnes pas de protocole de dopage injectables.
- Tu peux évoquer : “discussion avec médecin” pour TRT, statines, metformine, etc. mais jamais en mode “fais X”.
- Suppléments : prudent, cohérent, avec précautions.

LONGUEUR (tu veux du ULTRA LONG)
- Objectif : 35 000 à 90 000 caractères (espaces inclus), selon densité des marqueurs.
- Si tu es limité par le système : tu gardes l’essentiel + tu bascules le surplus en “Annexes”.
- Tu privilégies : actions + interprétation + interconnexions. Le “lore” scientifique passe après.

FORMAT STRICT DES SECTIONS (NE CHANGE PAS LES TITRES)
## Synthese executive
## Qualite des donnees & limites
## Tableau de bord (scores & priorites)
## Potentiel recomposition (perte de gras + gain de muscle)
## Lecture compartimentee par axes
### Axe 1 — Potentiel musculaire & androgenes
### Axe 2 — Metabolisme & gestion du risque diabete
### Axe 3 — Lipides & risque cardio-metabolique
### Axe 4 — Thyroide & depense energetique
### Axe 5 — Foie, bile & detox metabolique
### Axe 6 — Rein, hydratation & performance
### Axe 7 — Inflammation, immunite & terrain
### Axe 8 — Hematologie, oxygenation & endurance
### Axe 9 — Micronutriments (vitamines & mineraux)
### Axe 10 — Electrolytes, crampes, pression & performance
### Axe 11 — Stress, sommeil, recuperation (si donnees)
## Interconnexions majeures (le pattern)
## Deep dive — marqueurs prioritaires (top 8 a 15)
## Plan d'action 90 jours (hyper concret)
### Jours 1-14 (Stabilisation)
### Jours 15-30 (Phase d'Attaque)
### Jours 31-60 (Consolidation)
### Jours 61-90 (Optimisation)
### Retest & conditions de prelevement
## Nutrition & entrainement (traduction pratique)
## Supplements & stack (minimaliste mais impact)
## Annexes (ultra long)
### Annex A — Marqueurs secondaires (lecture rapide)
### Annex B — Hypotheses & tests de confirmation
### Annex C — Glossaire utile
## Sources (bibliotheque)

RÈGLES DÉTAILLÉES PAR SECTION

## Synthese executive
Rédaction en paragraphes complets (3-5 paragraphes, environ 800-1200 mots).
Tu annonces le diagnostic de terrain en phrases complètes, en expliquant le pattern global observé. Par exemple: "Votre bilan révèle un terrain métabolique en transition vers la résistance insulinique, accompagné d'une inflammation systémique de bas grade qui pourrait compromettre vos objectifs de recomposition corporelle."

Dans un deuxième paragraphe, tu identifies les 3 à 6 priorités en expliquant pourquoi chacune est importante et comment elles s'interconnectent. Utilise des phrases comme "La première priorité concerne...", "En parallèle, il faudra adresser...", "Cela est d'autant plus critique que...".

Dans un troisième paragraphe, tu présentes les opportunités de performance en expliquant le mécanisme: pourquoi l'optimisation de X permettra d'améliorer Y au niveau physiologique.

Tu intègres naturellement les scores dans le texte: "Votre score santé global se situe à 72/100 (confiance élevée), principalement limité par... Le score recomposition corporelle est de 65/100 (confiance moyenne), avec un potentiel d'amélioration significatif si..."

Tu conclus par la stratégie: "La logique d'intervention consiste à prioriser X car c'est le facteur limitant principal, avant d'optimiser Y et Z."

## Qualite des donnees & limites
Rédaction en paragraphes. Premier paragraphe: tu identifies les limitations méthodologiques (unités, ranges, contexte manquant) en expliquant l'impact sur l'interprétation. Deuxième paragraphe: tu donnes les recommandations pour le prochain prélèvement, en expliquant pourquoi chaque condition est importante.

## Tableau de bord (scores & priorites)
Rédaction en paragraphes structurés.
Premier paragraphe: "Les priorités critiques à adresser immédiatement sont..." (tu les nommes et expliques brièvement l'urgence en phrases complètes).
Deuxième paragraphe: "Les quick wins facilement implémentables incluent..." (tu expliques pourquoi ce sont des gains rapides).
Troisième paragraphe si drapeaux rouges: "Attention particulière requise sur..." (tu expliques le risque et la recommandation).

## Potentiel recomposition (perte de gras + gain de muscle)
Cette section est “signature Achzod” : tu relis tout au résultat esthétique/perf.
Tu dois couvrir :
1) Potentiel de sèche (insuline, inflammation, thyroïde, cortisol/sommeil si dispo)
2) Potentiel hypertrophie (androgènes, thyroïde, disponibilité énergétique, micronutriments)
3) Goulots d’étranglement (1 à 3)
4) Risques de plateau (sur-diet, sur-entraînement, fatigue du SNC, baisse T3, inflammation)
Tu dois conclure par : “les 3 leviers qui débloquent le physique”.

## Lecture compartimentee par axes
Pour chaque axe :
- Tu commences par un mini verdict (2 à 4 lignes) : OK / borderline / à corriger.
- Tu listes :
  - Marqueurs clés (ceux fournis)
Rédaction en paragraphes pour chaque axe:
- Paragraphe 1: Lecture clinique (valeurs, interprétation standard, sécurité)
- Paragraphe 2: Lecture performance (impact sur recomposition, énergie, récupération) avec mécanismes biologiques expliqués
- Paragraphe 3: Causes probables (tu expliques les hypothèses en ordre de probabilité, en reliant aux autres marqueurs)
- Paragraphe 4: Actions concrètes (tu expliques quoi faire et POURQUOI au niveau physiologique, pas de liste)
- Paragraphe 5 si nécessaire: Tests manquants pour confirmer
Tu ajoutes 0 à 2 citations [SRC:ID] quand ça renforce un point (pas du name-dropping).

## Interconnexions majeures (le pattern)
Rédaction en paragraphes (5 à 12 interconnexions maximum).

Pour chaque interconnexion, tu rédiges un paragraphe complet qui explique:
- Le PATTERN observé: quels marqueurs sont reliés et comment
- L'HYPOTHÈSE la plus probable expliquant cette interconnexion, avec le mécanisme biologique sous-jacent
- Ce qui CONFIRMERAIT cette hypothèse (tests, contexte, évolution)
- L'ACTION concrète qui découle de cette compréhension

Exemple: "Votre insuline élevée (12 µIU/mL) combinée à une CRP-us de 2.1 mg/L et des triglycérides à 140 mg/dL dessine un pattern d'inflammation métabolique. L'hypothèse la plus probable est que l'inflammation chronique de bas grade stimule la résistance insulinique via l'activation de la voie JNK et l'inhibition d'IRS-1, créant un cercle vicieux inflammatoire-métabolique. Cette hypothèse serait confirmée par un ratio TG/HDL élevé et une HbA1c en augmentation. L'action prioritaire consiste à réduire simultanément l'inflammation (via oméga-3, polyphénols, gestion du stress) et améliorer la sensibilité insulinique (via entraînement résistance et fenêtre alimentaire restreinte)."

Tu cites [SRC:ID] seulement si chunk supporte.

## Deep dive — marqueurs prioritaires (top 8 a 15)
Tu sélectionnes les marqueurs les plus importants pour :
- recomposition
- risque cardio-métabolique
- énergie/récup
Tu évites de deep dive 30 marqueurs.

FORMAT PAR MARQUEUR (PARAGRAPHES OBLIGATOIRES)
### [Nom du marqueur] — [CRITIQUE/IMPORTANT/OPTIMISATION]

Valeur et contexte: Tu commences par indiquer la valeur (X unité, range labo: Y) et tu la situes immédiatement dans le contexte clinique et performance.

Paragraphe 1 - Lecture clinique: Tu expliques ce que signifie cette valeur du point de vue médical standard. Quelle est la signification physiologique? Quels risques santé si hors norme? Le consensus médical dit quoi?

Paragraphe 2 - Lecture performance: Tu expliques l'impact spécifique sur la recomposition corporelle, l'énergie, la récupération. Tu détailles le MÉCANISME: comment ce marqueur influence-t-il concrètement le métabolisme, l'anabolisme, la lipolyse? Par quel système biologique (hormonal, enzymatique, cellulaire)?

Paragraphe 3 - Causes probables: Tu listes les causes par ordre de probabilité en EXPLIQUANT chacune. "La cause la plus probable est... car votre profil montre également... Au niveau cellulaire, cela s'explique par... Une deuxième hypothèse serait... mais moins probable car..."

Paragraphe 4 - Facteurs confondants et contexte: Tu expliques ce qui pourrait fausser l'interprétation (conditions de prélèvement, médicaments, infection récente, etc.)

Paragraphe 5 - Plan d'action détaillé: Tu expliques QU OI faire et POURQUOI au niveau biologique. Pas de liste. Exemple: "Pour normaliser ce marqueur, trois leviers sont disponibles. Le premier consiste à... car cela permet de... au niveau cellulaire. Le deuxième levier est... qui agit en..."

Paragraphe 6 si nécessaire - Tests complémentaires: Tu expliques quels tests permettraient de confirmer/infirmer les hypothèses et pourquoi.

Confiance et sources: Tu indiques le niveau de confiance (élevée/moyenne/faible) et tu cites les sources utilisées [SRC:ID] en fin de section.

## Plan d'action 90 jours (hyper concret)
Tu donnes un plan d'exécution rédigé en paragraphes complets, pas une liste de vœux.

Pour chaque phase (Jours 1-14, 15-30, 31-60, 61-90):
- Paragraphe 1 - Objectifs de la phase: Tu expliques ce qu'on cherche à accomplir pendant cette période et pourquoi. "Durant cette première phase de stabilisation, l'objectif principal est de... car cela permettra de... Les mécanismes visés sont..."
- Paragraphe 2 - Actions concrètes: Tu détailles les interventions en EXPLIQUANT le rationnel. "Vous allez mettre en place... Cette approche fonctionne en... Au niveau cellulaire, cela déclenche... Concrètement, cela signifie que..."
- Paragraphe 3 - Indicateurs de succès: Tu expliques comment savoir si ça marche. "Les signes que cette phase fonctionne incluent... mesurables par... Vous devriez observer... dans un délai de..."
- Paragraphe 4 - Erreurs à éviter: Tu expliques les pièges fréquents et pourquoi ils sont problématiques. "L'erreur la plus courante est de... ce qui compromet... car biologiquement..."

Section Retest:
Paragraphe détaillant quoi retester, quand, et pourquoi. Tu expliques les conditions de prélèvement en détail et leur importance physiologique.

Tu relies systématiquement le plan au résultat physique en expliquant la chaîne causale: "L'optimisation de X permettra Y car le mécanisme Z sera amélioré, se traduisant par une sèche plus facile / récup meilleure / force stable."

## Nutrition & entrainement (traduction pratique)
Rédaction en paragraphes complets qui traduisent les biomarqueurs en stratégies concrètes.

Paragraphe 1 - Structure nutritionnelle: Tu expliques la structure hebdomadaire recommandée en fonction des marqueurs. "Compte tenu de votre profil métabolique avec insuline élevée et inflammation présente, une approche de déficit intelligent s'impose. Concrètement, cela signifie... Le rationale biologique est que... Cette structure permet de..."

Paragraphe 2 - Timing et composition: Tu expliques le timing des nutriments (glucides péri-training, etc.) en liant aux marqueurs. "Le timing des glucides doit être optimisé autour de l'entraînement car... Physiologiquement, la fenêtre post-training permet... Concernant les protéines et fibres..."

Paragraphe 3 - Focus micronutriments: Tu relies les carences identifiées aux choix alimentaires. "Vos marqueurs indiquent une attention particulière sur... Ces micronutriments peuvent être optimisés via... car ils interviennent dans..."

Paragraphe 4 - Stratégie d'entraînement: Tu expliques le volume/intensité recommandé en fonction du profil. "Votre profil suggère un volume d'entraînement modéré avec... car vos marqueurs d'inflammation/stress indiquent... Un deload est recommandé si... Le cardio devrait être orienté vers zone 2 car... au contraire du HIIT qui dans votre cas..."

Paragraphe 5 - Récupération et NEAT: Tu expliques l'importance de la récupération basée sur les marqueurs. "La récupération est cruciale car vos marqueurs montrent... Le sommeil doit être priorisé car... Le NEAT (activité non-sportive) peut être augmenté via... car cela permet..."

RÈGLE : pas de macros chiffrées si tu n'as pas poids/taille/activité. Sinon tu proposes des plages avec le raisonnement.

## Supplements & stack (minimaliste mais impact)
Rédaction en paragraphes complets. Tu recommandes 6 à 14 suppléments maximum.

Pour chaque supplément, tu rédiges un paragraphe complet qui explique:
- POURQUOI ce supplément (quel biomarqueur/pattern il cible, quel mécanisme biologique)
- COMMENT il fonctionne au niveau cellulaire/enzymatique
- DOSE indicative prudente (ou plage) avec justification
- TIMING optimal et pourquoi (absorption, synergie avec repas/entraînement)
- DURÉE de supplémentation et rationale
- PRÉCAUTIONS et interactions possibles, expliquées

Exemple de rédaction attendue: "La vitamine D3 est prioritaire car votre taux de 18 ng/mL est sous-optimal. La vitamine D joue un rôle crucial dans la sensibilité insulinique via la régulation de l'expression génétique des récepteurs à l'insuline, et influence la synthèse de testostérone via les cellules de Leydig. Une dose de 4000-5000 UI par jour est recommandée, à prendre avec un repas contenant des graisses pour optimiser l'absorption (vitamine liposoluble). Cette supplémentation devrait être maintenue pendant au minimum 3 mois avant re-test. Attention aux interactions avec les corticoïdes qui peuvent diminuer l'absorption."

Si données insuffisantes: stack plus courte et tu l'assumes en expliquant pourquoi.

## Annexes (ultra long)
Annex A : marqueurs secondaires (lecture rapide)
- Format liste : statut + 1 ligne d’interprétation + action éventuelle.

Annex B : hypothèses & tests
- Tu listes les hypothèses non confirmées + tests pour confirmer/infirmer.

Annex C : glossaire
- Définitions simples en 1-2 lignes.

## Sources (bibliotheque)
- Liste des IDs utilisés, groupés par thème.

COMPORTEMENT FINAL
Tu produis UNIQUEMENT le rapport final, en respectant les titres.
Aucun commentaire sur tes règles.`;

const extractSourceIds = (text: string): string[] => {
  const matches = Array.from(text.matchAll(/\[SRC:([^\]]+)\]/g)).map((match) => match[1].trim());
  return Array.from(new Set(matches.filter(Boolean)));
};

const REQUIRED_HEADINGS = [
  "## Synthese executive",
  "## Qualite des donnees & limites",
  "## Tableau de bord (scores & priorites)",
  "## Potentiel recomposition (perte de gras + gain de muscle)",
  "## Lecture compartimentee par axes",
  "## Interconnexions majeures (le pattern)",
  "## Deep dive — marqueurs prioritaires (top 8 a 15)",
  "## Plan d'action 90 jours (hyper concret)",
  "## Nutrition & entrainement (traduction pratique)",
  "## Supplements & stack (minimaliste mais impact)",
  "## Annexes (ultra long)",
  "## Sources (bibliotheque)",
];

const REQUIRED_HEADINGS_NO_SOURCES = REQUIRED_HEADINGS.filter(
  (heading) => heading !== "## Sources (bibliotheque)"
);

const getMissingHeadings = (text: string, headings: string[]) =>
  headings.filter((heading) => !text.includes(heading));

const buildSourcesSectionFromText = (text: string): string => {
  const ids = extractSourceIds(text);
  if (!ids.length) {
    return "## Sources (bibliotheque)\n- Aucune source fournie";
  }
  return `## Sources (bibliotheque)\n${ids.map((id) => `- [SRC:${id}]`).join("\n")}`;
};

const stripSourcesSection = (text: string): string => {
  const match = text.match(/(^## Sources\b|\n## Sources\b)/);
  if (!match || match.index === undefined) return text.trim();
  return text.slice(0, match.index).trim();
};

const ensureSourcesSection = (text: string): string => {
  if (!text) return "";
  const base = stripSourcesSection(text);
  return `${base}\n\n${buildSourcesSectionFromText(text)}`.trim();
};

const insertMissingSections = (text: string, missing: string): string => {
  if (!missing.trim()) return text.trim();
  const base = stripSourcesSection(text);
  const merged = `${base}\n\n${missing.trim()}`.trim();
  return ensureSourcesSection(merged);
};

const stripEmojis = (text: string): string => {
  if (!text) return "";
  return text.replace(/[\p{Extended_Pictographic}\uFE0F]/gu, "");
};

const extractPlan90Section = (text: string): string => {
  if (!text) return "";
  const headings = [
    "## Plan d'action 90 jours (hyper concret)",
    "## Plan d'action 90 jours",
    "## Plan 90 jours",
  ];
  const start = headings
    .map((heading) => ({ heading, index: text.indexOf(heading) }))
    .find((entry) => entry.index !== -1)?.index;
  if (start === undefined) return "";
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
  if (text.includes("## Plan d'action 90 jours")) return text.trim();

  const anchors = ["## Nutrition & entrainement", "## Supplements & stack", "## Sources (bibliotheque)"];
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

const trimAiAnalysis = (text: string, maxChars = 90000): string => {
  if (!text) return "";
  const cleaned = stripEmojis(text).trim();
  if (cleaned.length <= maxChars) return cleaned;
  const sourcesIndex = text.indexOf("## Sources (bibliotheque)");
  const planIndex = text.indexOf("## Plan d'action 90 jours");
  const nutritionIndex = text.indexOf("## Nutrition & entrainement");
  const sources = sourcesIndex !== -1 ? text.slice(sourcesIndex).trim() : "";
  const plan = planIndex !== -1 ? extractPlan90Section(text) : "";
  const tail = nutritionIndex !== -1 ? text.slice(nutritionIndex).trim() : "";

  if (sources || plan || tail) {
    const reserveSections = [plan, tail || sources].filter(Boolean);
    const reserveLen =
      reserveSections.reduce((sum, section) => sum + section.length, 0) +
      (reserveSections.length > 0 ? (reserveSections.length - 1) * 2 : 0);
    const keepBudget = maxChars - reserveLen - 2;

    if (keepBudget > 1000) {
      let headEnd = keepBudget;
      const cutPoints = [planIndex, nutritionIndex, sourcesIndex].filter((idx) => idx !== -1);
      if (cutPoints.length > 0) {
        headEnd = Math.min(headEnd, ...cutPoints);
      }
      const head = text.slice(0, headEnd);
      const lastBreak = head.lastIndexOf("\n\n");
      const safeHead = lastBreak > 1000 ? head.slice(0, lastBreak).trim() : head.trim();
      return stripEmojis([safeHead, plan, tail || sources].filter(Boolean).join("\n\n")).trim();
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
    stressLevel?: number;
    fastingHours?: number;
    drawTime?: string;
    lastTraining?: string;
    alcoholLast72h?: string;
    nutritionPhase?: string;
    supplementsUsed?: string[];
    infectionRecent?: string;
    poids?: number;
    taille?: number;
  }
): string {
  const formatList = (items: string[], emptyLabel: string) =>
    items.length ? items.map((item) => `- ${item}`).join("\n") : `- ${emptyLabel}`;
  const formatInline = (items: string[], emptyLabel: string) =>
    items.length ? items.join(", ") : emptyLabel;

  const summary = analysisResult.summary;
  const critical = analysisResult.markers.filter((m) => m.status === "critical");
  const suboptimal = analysisResult.markers.filter((m) => m.status === "suboptimal");
  const priority1 = analysisResult.recommendations.priority1.map((rec) => rec.action);
  const priority2 = analysisResult.recommendations.priority2.map((rec) => rec.action);
  const followUp = analysisResult.followUp.map(
    (item) => `- ${item.test} - ${item.delay} - ${item.objective}`
  );
  const alerts = analysisResult.alerts.map((alert) => `- ${alert}`);
  const correlations = buildLifestyleCorrelations(analysisResult.markers, userProfile);

  const missingData: string[] = [];
  if (!userProfile.poids) missingData.push("Poids");
  if (!userProfile.taille) missingData.push("Taille");
  if (!userProfile.sleepHours) missingData.push("Sommeil moyen");
  if (!userProfile.stressLevel) missingData.push("Stress percu");
  if (!userProfile.fastingHours) missingData.push("Jeune");
  if (!userProfile.drawTime) missingData.push("Heure prelevement");
  if (!userProfile.lastTraining) missingData.push("Dernier training");
  if (!userProfile.alcoholLast72h) missingData.push("Alcool 72h");
  if (!userProfile.nutritionPhase) missingData.push("Phase nutrition");

  const axisVerdict = (ids: string[]) => {
    const axisMarkers = analysisResult.markers.filter((m) => ids.includes(m.markerId));
    if (!axisMarkers.length) return "Non renseigne";
    if (axisMarkers.some((m) => m.status === "critical")) return "A corriger";
    if (axisMarkers.some((m) => m.status === "suboptimal")) return "Borderline";
    return "OK";
  };

  const axisMarkersList = (ids: string[], fallback: string) =>
    formatInline(
      analysisResult.markers
        .filter((m) => ids.includes(m.markerId))
        .map((m) => `${m.name} (${m.status})`),
      fallback
    );

  const axes = [
    {
      title: "### Axe 1 — Potentiel musculaire & androgenes",
      ids: ["testosterone_total", "testosterone_libre", "shbg", "estradiol", "lh", "fsh", "prolactine", "dhea_s", "cortisol", "igf1"],
      fallback: "Aucun marqueur androgene fourni",
    },
    {
      title: "### Axe 2 — Metabolisme & gestion du risque diabete",
      ids: ["glycemie_jeun", "hba1c", "insuline_jeun", "homa_ir", "triglycerides", "hdl", "acide_urique"],
      fallback: "Aucun marqueur metabolique fourni",
    },
    {
      title: "### Axe 3 — Lipides & risque cardio-metabolique",
      ids: ["ldl", "hdl", "triglycerides", "apob", "non_hdl", "lpa"],
      fallback: "Aucun marqueur lipidique fourni",
    },
    {
      title: "### Axe 4 — Thyroide & depense energetique",
      ids: ["tsh", "t4_libre", "t3_libre", "t3_reverse", "anti_tpo"],
      fallback: "Aucun marqueur thyroidien fourni",
    },
    {
      title: "### Axe 5 — Foie, bile & detox metabolique",
      ids: ["alt", "ast", "ggt", "bilirubine", "alp"],
      fallback: "Aucun marqueur hepatique fourni",
    },
    {
      title: "### Axe 6 — Rein, hydratation & performance",
      ids: ["creatinine", "egfr", "uree", "bun"],
      fallback: "Aucun marqueur renal fourni",
    },
    {
      title: "### Axe 7 — Inflammation, immunite & terrain",
      ids: ["crp_us", "homocysteine", "ferritine", "globules_blancs", "neutrophiles", "lymphocytes"],
      fallback: "Aucun marqueur inflammation fourni",
    },
    {
      title: "### Axe 8 — Hematologie, oxygenation & endurance",
      ids: ["hemoglobine", "hematocrite", "rbc", "mcv", "mch", "rdw", "fer_serique", "transferrine_sat"],
      fallback: "Aucun marqueur hematologique fourni",
    },
    {
      title: "### Axe 9 — Micronutriments (vitamines & mineraux)",
      ids: ["vitamine_d", "b12", "folate", "magnesium_rbc", "zinc", "cuivre"],
      fallback: "Aucun marqueur micronutriments fourni",
    },
    {
      title: "### Axe 10 — Electrolytes, crampes, pression & performance",
      ids: ["sodium", "potassium", "calcium", "chlore"],
      fallback: "Aucun marqueur electrolytes fourni",
    },
    {
      title: "### Axe 11 — Stress, sommeil, recuperation (si donnees)",
      ids: ["cortisol", "dhea_s"],
      fallback: "Aucun marqueur stress/sommeil fourni",
    },
  ];

  const axesText = axes
    .map((axis) => {
      const verdict = axisVerdict(axis.ids);
      const markersLine = axisMarkersList(axis.ids, axis.fallback);
      return [
        axis.title,
        `${verdict}.`,
        `- Marqueurs cles: ${markersLine}`,
        "- Lecture clinique: Non renseigne.",
        "- Lecture performance/bodybuilding: Non renseigne.",
        "- Causes probables (priorisees): Non renseigne.",
        "- Actions (3 a 7): Prioriser sommeil, nutrition, entrainement, puis retest.",
        "- Tests manquants: Non renseigne.",
      ].join("\n");
    })
    .join("\n\n");

  const deepDiveMarkers = selectDeepDiveMarkers(analysisResult.markers);
  const deepDiveText = deepDiveMarkers.length
    ? deepDiveMarkers
        .map((marker) => {
          const range = BIOMARKER_RANGES[marker.markerId];
          const normalRange =
            range && range.normalMin !== undefined && range.normalMax !== undefined
              ? `${range.normalMin} - ${range.normalMax}`
              : marker.normalRange || "N/A";
          const priority =
            marker.status === "critical"
              ? "CRITIQUE"
              : marker.status === "suboptimal"
              ? "IMPORTANT"
              : "OPTIMISATION";
          return [
            `### ${marker.name}`,
            `- Priorite: ${priority}`,
            `- Valeur: ${marker.value} ${marker.unit} | Range labo: ${normalRange} ${marker.unit || ""}`,
            `- Lecture clinique: ${marker.interpretation || "Non renseigne"}`,
            "- Lecture performance/bodybuilding: Non renseigne",
            "- Causes plausibles (ordre de probabilite): Non renseigne",
            "- Facteurs confondants: Non renseigne",
            "- Plan d'action (3 a 7 points):",
            "  - Suivre le plan d'action 90 jours.",
            "  - Re-tester dans 6-8 semaines.",
            "  - Ajuster nutrition et recuperation.",
            "- Tests / data a ajouter: Non renseigne",
            `- Confiance: ${missingData.length ? "faible" : "moyenne"}`,
            "- Sources (si utilisees): Non renseigne",
          ].join("\n");
        })
        .join("\n\n")
    : "### Aucun marqueur prioritaire";

  const patternLines = analysisResult.patterns.length
    ? analysisResult.patterns.map((pattern, index) => {
        return [
          `${index + 1}) Pattern observe: ${pattern.name}`,
          `   Hypothese probable: ${pattern.causes.join(", ") || "Non renseigne"}`,
          "   Ce qui confirmerait: Tests complementaires ou retest.",
          "   Action concrete: Suivre le plan 90 jours prioritaire.",
        ].join("\n");
      })
    : ["1) Pattern observe: Non renseigne\n   Hypothese probable: Non renseigne\n   Ce qui confirmerait: Non renseigne\n   Action concrete: Non renseigne"];

  return [
    "## Synthese executive",
    `- Optimal: ${summary.optimal.join(", ") || "Aucun"}`,
    `- A surveiller: ${summary.watch.join(", ") || "Aucun"}`,
    `- Action requise: ${summary.action.join(", ") || "Aucune"}`,
    `- Lecture globale: Profil ${userProfile.gender}${userProfile.age ? " (" + userProfile.age + " ans)" : ""} avec ${critical.length} critique(s) et ${suboptimal.length} a optimiser.`,
    "- Ce qui change tout si confirme: Contexte lifestyle complet + retest propre.",
    "",
    "## Qualite des donnees & limites",
    missingData.length
      ? `- Donnees manquantes: ${missingData.join(", ")}`
      : "- Donnees personnelles suffisantes pour ce rapport.",
    "- Contexte de prelevement: Non renseigne (jeune, entrainement, alcool).",
    "- Prochain prelevement: matin a jeun, 48h sans entrainement intense, hydratation stable.",
    "",
    "## Tableau de bord (scores & priorites)",
    "- TOP priorites:",
    formatList(summary.action, "Aucune priorite critique."),
    "- TOP quick wins:",
    formatList(priority1, "Structurer sommeil, marche post-prandiale, hydratation."),
    "- Drapeaux rouges:",
    formatList(critical.map((m) => m.name), "Aucun drapeau rouge majeur."),
    "",
    "## Potentiel recomposition (perte de gras + gain de muscle)",
    "- Potentiel seche: depend surtout du metabolisme et inflammation.",
    "- Potentiel hypertrophie: depend des androgens, recuperation, micronutriments.",
    "- Goulots d etranglement: Non renseigne.",
    "- Risques de plateau: Non renseigne.",
    "- Les 3 leviers qui debloquent le physique: sommeil, structure nutrition, entrainement dose.",
    "",
    "## Lecture compartimentee par axes",
    axesText,
    "",
    "## Interconnexions majeures (le pattern)",
    ...patternLines,
    "",
    "## Deep dive — marqueurs prioritaires (top 8 a 15)",
    deepDiveText,
    "",
    "## Plan d'action 90 jours (hyper concret)",
    "### Jours 1-14 (Stabilisation)",
    "- Objectifs: stabiliser sommeil, hydratation, apports.",
    "- Actions: prioriser routine sommeil, marche post-prandiale, proteins stables.",
    "- Indicateurs: energie, digestion, poids stable.",
    "- Erreurs a eviter: sur-entrainement, deficit agressif.",
    "### Jours 15-30 (Phase d'Attaque)",
    formatList(priority1, "Structurer nutrition et activite."),
    "### Jours 31-60 (Consolidation)",
    formatList(priority2, "Stabiliser habitudes et suivre la progression."),
    "### Jours 61-90 (Optimisation)",
    "- Objectifs: affiner details, corriger residuel.",
    "- Actions: ajuster nutrition et entrainement.",
    "- Indicateurs: performances et marqueurs cibles.",
    "- Erreurs a eviter: multiplier les changements.",
    "### Retest & conditions de prelevement",
    followUp.length ? followUp.join("\n") : "- Aucun controle prioritaire",
    "",
    "## Nutrition & entrainement (traduction pratique)",
    "- Nutrition: structurer les repas, limiter sucres rapides, prioriser fibres et proteines.",
    "- Entrainement: force 3x/sem + marche quotidienne, ajuster volume selon fatigue.",
    "",
    "## Supplements & stack (minimaliste mais impact)",
    formatList(priority2, "Non renseigne."),
    "",
    "## Annexes (ultra long)",
    "### Annex A — Marqueurs secondaires (lecture rapide)",
    formatList(
      analysisResult.markers
        .filter((m) => !critical.map((c) => c.markerId).includes(m.markerId))
        .map((m) => `${m.name} (${m.status})`),
      "Aucun marqueur secondaire"
    ),
    "### Annex B — Hypotheses & tests de confirmation",
    "- Non renseigne.",
    "### Annex C — Glossaire utile",
    "- Non renseigne.",
    "",
    "## Sources (bibliotheque)",
    "- Aucune source fournie",
  ].join("\n");
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
    stressLevel?: number;
    fastingHours?: number;
    drawTime?: string;
    lastTraining?: string;
    alcoholLast72h?: string;
    nutritionPhase?: string;
    supplementsUsed?: string[];
    infectionRecent?: string;
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
  const stressLevel = profile.stressLevel;
  const fastingHours = profile.fastingHours;
  const drawTime = profile.drawTime;
  const lastTraining = profile.lastTraining;
  const alcoholLast72h = profile.alcoholLast72h;
  const nutritionPhase = profile.nutritionPhase;
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

  if (typeof fastingHours === "number") {
    if (fastingHours < 8) {
      pushCorrelation({
        factor: "Jeune",
        current: `${fastingHours} h`,
        impact: "Jeune court peut biaiser glycemie, insuline et triglycerides.",
        recommendation: "Retest a jeun 10-12h (eau seule) pour une lecture propre.",
        status: fastingHours < 6 ? "critical" : "suboptimal",
        evidence: "Jeune <8h perturbe la comparabilite des marqueurs metaboliques.",
      });
    } else if (fastingHours > 14) {
      pushCorrelation({
        factor: "Jeune",
        current: `${fastingHours} h`,
        impact: "Jeune tres long peut modifier cortisol et lipides.",
        recommendation: "Vise 10-12h pour les prochains bilans.",
        status: fastingHours > 16 ? "suboptimal" : "normal",
        evidence: "Jeune tres long modifie certaines hormones matinales.",
      });
    } else {
      pushCorrelation({
        factor: "Jeune",
        current: `${fastingHours} h`,
        impact: "Jeune adequat pour une lecture metabolique fiable.",
        recommendation: "Garde ce format pour les prochains prelevements.",
        status: "optimal",
        evidence: "Jeune 8-12h standardise glucose et lipides.",
      });
    }
  }

  if (drawTime) {
    const drawLabelMap: Record<string, string> = {
      matin: "Matin (avant 10h)",
      milieu_journee: "Milieu de journee",
      apres_midi: "Apres-midi",
      soir: "Soir",
    };
    const drawLabel = drawLabelMap[drawTime] || drawTime;
    if (drawTime === "apres_midi" || drawTime === "soir") {
      pushCorrelation({
        factor: "Heure prelevement",
        current: drawLabel,
        impact: "Prelevement tardif peut fausser cortisol, testosterone et glycemie.",
        recommendation: "Vise un prelevement matin entre 7h et 10h.",
        status: "suboptimal",
        evidence: "Les hormones et la glycemie varient fortement dans la journee.",
      });
    } else {
      pushCorrelation({
        factor: "Heure prelevement",
        current: drawLabel,
        impact: "Horaire coherent pour comparer les marqueurs dans le temps.",
        recommendation: "Garde ce creneau pour les prochains bilans.",
        status: drawTime === "matin" ? "optimal" : "normal",
        evidence: "Les bilans du matin sont plus standardises.",
      });
    }
  }

  if (lastTraining) {
    const trainingLabelMap: Record<string, string> = {
      "<24h": "< 24h",
      "24-48h": "24-48h",
      "48-72h": "48-72h",
      ">72h": "> 72h",
    };
    const trainingLabel = trainingLabelMap[lastTraining] || lastTraining;
    if (lastTraining === "<24h") {
      pushCorrelation({
        factor: "Dernier training",
        current: trainingLabel,
        impact: "Training recent peut elever creatinine, CK, CRP et fausser la lecture.",
        recommendation: "Retest apres 48h de repos si certains marqueurs sont critiques.",
        status: "suboptimal",
        evidence: "L effort proche du bilan modifie les marqueurs musculaires et inflammatoires.",
      });
    } else if (lastTraining === "24-48h") {
      pushCorrelation({
        factor: "Dernier training",
        current: trainingLabel,
        impact: "Effort recent possible mais effets encore detectables sur certains marqueurs.",
        recommendation: "Idealement 48-72h sans training intense avant le prochain bilan.",
        status: "normal",
        evidence: "Le repos 48-72h stabilise creatinine et inflammation.",
      });
    } else {
      pushCorrelation({
        factor: "Dernier training",
        current: trainingLabel,
        impact: "Fenetre de repos adequate pour un bilan interpretable.",
        recommendation: "Conserve cette fenetre avant les prochains bilans.",
        status: "optimal",
        evidence: "Un repos suffisant stabilise les marqueurs musculaires.",
      });
    }
  }

  if (nutritionPhase) {
    const phaseLabelMap: Record<string, string> = {
      seche: "Seche (deficit)",
      maintenance: "Maintenance",
      bulk: "Prise de masse",
    };
    const phaseLabel = phaseLabelMap[nutritionPhase] || nutritionPhase;
    if (nutritionPhase === "seche") {
      const t3 = getMarker("t3_libre");
      const igf1 = getMarker("igf1");
      const impactBits = [];
      if (isFlaggedStatus(t3?.status)) impactBits.push("thyroide ralentie");
      if (isFlaggedStatus(igf1?.status)) impactBits.push("anabolisme freine");
      pushCorrelation({
        factor: "Phase nutrition",
        current: phaseLabel,
        impact: impactBits.length
          ? `Deficit associe a ${impactBits.join(" et ")}.`
          : "Deficit peut ralentir la recuperation si trop agressif.",
        recommendation: "Garde un deficit modere et planifie un refeed si fatigue.",
        status: impactBits.length ? "suboptimal" : "normal",
        evidence: "Deficits agressifs baissent T3 et IGF-1 chez les sportifs.",
      });
    } else if (nutritionPhase === "bulk") {
      pushCorrelation({
        factor: "Phase nutrition",
        current: phaseLabel,
        impact: "Surplus aide l anabolisme mais peut impacter glycemie et lipides.",
        recommendation: "Surveille glucose, triglycerides et HDL durant la prise de masse.",
        status: "normal",
        evidence: "Un surplus non maitrise degrade le profil metabolique.",
      });
    } else {
      pushCorrelation({
        factor: "Phase nutrition",
        current: phaseLabel,
        impact: "Maintenance stable, bon point pour lire les marqueurs.",
        recommendation: "Garde cette base et ajuste selon les objectifs.",
        status: "optimal",
        evidence: "Une maintenance stabile facilite l interpretation des bilans.",
      });
    }
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

  if (alcoholLast72h) {
    const alcoholLabelMap: Record<string, string> = {
      "0": "0 verre",
      "1-2": "1-2 verres",
      "3-5": "3-5 verres",
      "6+": "6+ verres",
    };
    const alcoholLabel = alcoholLabelMap[alcoholLast72h] || alcoholLast72h;
    const ggt = getMarker("ggt");
    const triglycerides = getMarker("triglycerides");
    const impactBits = [];
    if (isFlaggedStatus(ggt?.status)) impactBits.push("stress hepatique");
    if (isFlaggedStatus(triglycerides?.status)) impactBits.push("triglycerides hauts");
    if (alcoholLast72h === "6+" || alcoholLast72h === "3-5") {
      pushCorrelation({
        factor: "Alcool (72h)",
        current: alcoholLabel,
        impact: impactBits.length
          ? `Alcool recent associe a ${impactBits.join(" et ")}.`
          : "Alcool recent peut biaiser GGT, triglycerides et glycemie.",
        recommendation: "Stop alcool 72h avant le prochain bilan.",
        status: alcoholLast72h === "6+" ? "critical" : "suboptimal",
        evidence: "L alcool recent perturbe les marqueurs hepatiques et lipidiques.",
      });
    } else {
      pushCorrelation({
        factor: "Alcool (72h)",
        current: alcoholLabel,
        impact: alcoholLast72h === "0" ? "Pas d alcool recent, lecture plus fiable." : "Charge alcool faible, impact limite.",
        recommendation: "Garde cette discipline avant les bilans.",
        status: alcoholLast72h === "0" ? "optimal" : "normal",
        evidence: "Moins d alcool = meilleure sensibilite a l insuline et GGT stable.",
      });
    }
  }

  if (profile.infectionRecent === "oui") {
    pushCorrelation({
      factor: "Infection recente",
      current: "Oui",
      impact: "Inflammation recente peut eleveer CRP, ferritine et globules blancs.",
      recommendation: "Retest hors infection pour confirmer le terrain.",
      status: "suboptimal",
      evidence: "Les infections aiguës faussent les marqueurs inflammatoires.",
    });
  } else if (profile.infectionRecent === "non") {
    pushCorrelation({
      factor: "Infection recente",
      current: "Non",
      impact: "Pas d infection recente declaree, lecture plus fiable.",
      recommendation: "A conserver pour les prochains bilans.",
      status: "optimal",
      evidence: "Contexte stable = interpretation plus fiable.",
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
  console.log(`\n[BloodAnalysis] 🩸 DÉBUT GÉNÉRATION RAPPORT EXPERT`);
  console.log(`[BloodAnalysis] 📊 Nombre de marqueurs: ${analysisResult.markers.length}`);
  console.log(`[BloodAnalysis] 📚 Taille contexte RAG: ${knowledgeContext?.length || 0} chars`);
  console.log(`[BloodAnalysis] 👤 Profil: ${userProfile.gender}, ${userProfile.age || 'N/A'}ans`);

  const anthropic = new Anthropic();

  // Build the prompt with analysis data
  const markersTable = analysisResult.markers
    .map((marker) => {
      const range = BIOMARKER_RANGES[marker.markerId];
      const normalMin = range?.normalMin ?? null;
      const normalMax = range?.normalMax ?? null;
      const optimalMin = range?.optimalMin ?? null;
      const optimalMax = range?.optimalMax ?? null;
      const normalRange =
        normalMin !== null && normalMax !== null ? `${normalMin} - ${normalMax}` : marker.normalRange || "N/A";
      const optimalRange =
        optimalMin !== null && optimalMax !== null ? `${optimalMin} - ${optimalMax}` : marker.optimalRange || "N/A";
      const deltaNormal =
        normalMin !== null && normalMax !== null ? formatPercentDelta(marker.value, normalMin, normalMax) : "N/A";
      const deltaOptimal =
        optimalMin !== null && optimalMax !== null ? formatPercentDelta(marker.value, optimalMin, optimalMax) : "N/A";

      return [
        `- ${marker.name} (${marker.markerId})`,
        `  Categorie: ${marker.category || "Non renseignee"}`,
        `  Valeur mesuree: ${marker.value} ${marker.unit}`,
        `  Range labo normal: ${normalRange} ${marker.unit || ""}`,
        `  Range optimal performance: ${optimalRange} ${marker.unit || ""}`,
        `  Ecart vs normal: ${deltaNormal}`,
        `  Ecart vs optimal: ${deltaOptimal}`,
        `  Statut: ${marker.status}`,
        marker.interpretation ? `  Note: ${marker.interpretation}` : null,
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n");

  const patternsText = analysisResult.patterns.map(p =>
    `Pattern détecté: ${p.name}\nCauses: ${p.causes.join(", ")}`
  ).join("\n\n");

  const bmi =
    typeof userProfile.poids === "number" && typeof userProfile.taille === "number" && userProfile.taille > 0
      ? (userProfile.poids / Math.pow(userProfile.taille / 100, 2)).toFixed(1)
      : "N/A";
  const lifestyleBits: string[] = [];
  if (typeof userProfile.sleepHours === "number") {
    lifestyleBits.push(`Sommeil moyen: ${userProfile.sleepHours} h/nuit`);
  }
  if (typeof userProfile.stressLevel === "number") {
    lifestyleBits.push(`Stress percu: ${userProfile.stressLevel}/10`);
  }
  if (typeof userProfile.fastingHours === "number") {
    lifestyleBits.push(`Jeune avant prelevement: ${userProfile.fastingHours}h`);
  }
  if (userProfile.drawTime) {
    lifestyleBits.push(`Heure prelevement: ${userProfile.drawTime}`);
  }
  if (userProfile.lastTraining) {
    lifestyleBits.push(`Dernier training intense: ${userProfile.lastTraining}`);
  }
  if (userProfile.alcoholLast72h) {
    lifestyleBits.push(`Alcool 72h: ${userProfile.alcoholLast72h}`);
  }
  if (userProfile.nutritionPhase) {
    lifestyleBits.push(`Phase nutrition: ${userProfile.nutritionPhase}`);
  }
  if (userProfile.supplementsUsed && userProfile.supplementsUsed.length) {
    lifestyleBits.push(`Supplements: ${userProfile.supplementsUsed.join(", ")}`);
  }
  if (userProfile.infectionRecent) {
    lifestyleBits.push(`Infection recente: ${userProfile.infectionRecent}`);
  }
  if (typeof userProfile.poids === "number") {
    lifestyleBits.push(`Poids: ${userProfile.poids} kg`);
  }
  if (typeof userProfile.taille === "number") {
    lifestyleBits.push(`Taille: ${userProfile.taille} cm`);
  }
  if (bmi !== "N/A") {
    lifestyleBits.push(`IMC: ${bmi}`);
  }
  const lifestyleLine = lifestyleBits.length ? lifestyleBits.join(" | ") : "Non fourni";
  const deepDivePayload = await getBiomarkerDeepDiveContext(analysisResult.markers, {
    prenom: userProfile.prenom,
    nom: userProfile.nom,
    age: userProfile.age,
  });
  const availableSourceIds = new Set([
    ...extractSourceIds(deepDivePayload.context || ""),
    ...extractSourceIds(knowledgeContext || ""),
  ]);
  const minSources = availableSourceIds.size ? Math.min(8, availableSourceIds.size) : 0;
  const citationsRule = minSources
    ? `- Tu dois utiliser au moins ${minSources} IDs [SRC:ID] uniques dans le rapport.`
    : "- Si aucune source n'est fournie, ecris clairement \"source non fournie\" quand tu attribues.";

  const userPrompt = `PATIENT:
- Nom: ${userProfile.prenom ? `${userProfile.prenom} ${userProfile.nom || ""}`.trim() : "Non renseigne"}
- Sexe: ${userProfile.gender}
- Age: ${userProfile.age || "Non renseigne"}
- Objectifs: ${userProfile.objectives || "Performance et sante"}
- Medicaments: ${userProfile.medications || "Aucun"}
- Lifestyle: ${lifestyleLine}

DONNEES BIOMARQUEURS (reelles valeurs + ranges):
${markersTable}

PATTERNS DETECTES:
${patternsText || "Aucun pattern majeur detecte"}

RESUME:
- Optimal: ${analysisResult.summary.optimal.join(", ") || "Aucun"}
- A surveiller: ${analysisResult.summary.watch.join(", ") || "Aucun"}
- Action requise: ${analysisResult.summary.action.join(", ") || "Aucun"}

SOURCES PAR BIOMARQUEUR (chunks obligatoires, cite avec [SRC:ID]):
${deepDivePayload.context || "- Aucune source fournie pour les marqueurs."}

SOURCES GENERALES (chunks, cite avec [SRC:ID] si pertinent):
${knowledgeContext || "- Aucune source generale fournie."}

OBLIGATIONS FORMAT:
- Tu dois inclure TOUTES les sections avec les titres EXACTS (aucune omission).
${citationsRule}

GENERE le rapport final en respectant STRICTEMENT les titres du format.`;

  let output = "";
  let bestCandidate = "";
  let bestScore = -1;

  // Timeout wrapper for API calls (fast mode keeps shorter limits; full mode allows longer responses)
  const fastMode = process.env.BLOOD_ANALYSIS_FAST_MODE === "true" && process.env.NODE_ENV !== "production";
  const API_TIMEOUT_MS = fastMode ? 180000 : 600000;
  const maxTokens = Number(process.env.BLOOD_ANALYSIS_MAX_TOKENS || 16000);
  const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> => {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error("API_TIMEOUT")), ms)
      )
    ]);
  };

  const maxAttempts = fastMode ? 1 : 3;
  const minChars = fastMode ? 20000 : 35000;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const retryNote =
      attempt === 1
        ? ""
        : `\nATTENTION: Ta reponse precedente ne respectait pas le format strict. Corrige avec ZERO emoji, profondeur maximale, et une section Deep dive complete (format impose par marqueur). Rappels: sections obligatoires (${REQUIRED_HEADINGS_NO_SOURCES.join(
            " | "
          )}) et ${citationsRule}\n`;
    const prompt = `${userPrompt}\n${retryNote}`;

    try {
      console.log(`[BloodAnalysis] 🚀 Tentative ${attempt}/${maxAttempts} - Génération principale...`);
      console.log(`[BloodAnalysis] ⚙️  Model: ${process.env.BLOOD_ANALYSIS_MODEL || "claude-opus-4-5-20251101"}`);
      console.log(`[BloodAnalysis] ⚙️  Max tokens: ${maxTokens}`);
      console.log(`[BloodAnalysis] ⚙️  Timeout: ${API_TIMEOUT_MS / 1000}s`);
      console.log(`[BloodAnalysis] ⚙️  Prompt size: ${prompt.length} chars`);

      const startTime = Date.now();
      const response = await withTimeout(
        anthropic.messages.create({
          model: process.env.BLOOD_ANALYSIS_MODEL || "claude-opus-4-5-20251101",
          max_tokens: maxTokens,
          system: BLOOD_ANALYSIS_SYSTEM_PROMPT,
          messages: [{ role: "user", content: prompt }]
        }),
        API_TIMEOUT_MS
      );
      const duration = Math.round((Date.now() - startTime) / 1000);
      console.log(`[BloodAnalysis] ✅ Réponse reçue en ${duration}s`);

      const textContent = response.content.find(c => c.type === "text");
      const candidate = textContent?.text || "";
      console.log(`[BloodAnalysis] 📊 Longueur réponse: ${candidate.length} chars (min: ${minChars})`);

      const deepDiveCheck = validateDeepDive(candidate, deepDivePayload.markerNames);
      const missingHeadings = getMissingHeadings(candidate, REQUIRED_HEADINGS_NO_SOURCES);
      const uniqueSources = extractSourceIds(candidate).length;
      const citationsOk = uniqueSources >= minSources;
      const requiredOk = missingHeadings.length === 0;

      console.log(`[BloodAnalysis] 🔍 Validation:`);
      console.log(`   - Deep dive: ${deepDiveCheck.ok ? '✅' : '❌'} ${deepDiveCheck.ok ? '' : `(raison: ${deepDiveCheck.reason})`}`);
      console.log(`   - Sections requises: ${requiredOk ? '✅' : '❌'} ${requiredOk ? '' : `(manque: ${missingHeadings.join(', ')})`}`);
      console.log(`   - Citations: ${citationsOk ? '✅' : '❌'} (${uniqueSources}/${minSources})`);
      console.log(`   - Longueur: ${candidate.length >= minChars ? '✅' : '⚠️'} (${candidate.length}/${minChars})`);

      const score =
        candidate.length +
        (deepDiveCheck.ok ? 10000 : 0) +
        (requiredOk ? 15000 : 0) +
        (citationsOk ? 8000 : 0);
      if (score > bestScore) {
        bestScore = score;
        bestCandidate = candidate;
        console.log(`[BloodAnalysis] 📈 Nouveau meilleur score: ${score}`);
      }
      if (deepDiveCheck.ok && candidate.length >= minChars && requiredOk && citationsOk) {
        output = candidate;
        console.log(`[BloodAnalysis] 🎉 Rapport complet validé!`);
        break;
      } else {
        console.log(`[BloodAnalysis] ⚠️  Validation incomplète, tentative suivante...`);
      }
    } catch (err: any) {
      if (err.message === "API_TIMEOUT") {
        console.warn(`[BloodAnalysis] Attempt ${attempt} timed out after ${API_TIMEOUT_MS}ms`);
        if (attempt === maxAttempts) {
          console.log("[BloodAnalysis] All attempts timed out, using fallback");
          return buildFallbackAnalysis(analysisResult, userProfile);
        }
      } else {
        throw err;
      }
    }
  }

  if (!output) {
    output = bestCandidate;
  }

  if (!output.includes("## Plan d'action 90 jours")) {
    console.log(`[BloodAnalysis] 🔧 Fallback: Génération Plan 90 jours...`);
    const planPrompt = `Tu dois produire UNIQUEMENT la section "## Plan d'action 90 jours (hyper concret)" (avec les sous-sections exactes) pour ce bilan.

STYLE (OBLIGATOIRE - EXPERT MEDICAL):
INTERDIT ABSOLU:
- Bullet points, listes à puces, tirets, énumérations
- Format "action points" isolés
- Résumés style IA générique

EXIGENCES DE REDACTION:
- PARAGRAPHES COMPLETS UNIQUEMENT. Chaque idée développée en phrases complètes avec sujet-verbe-complément.
- Style médecin fonctionnel: rigoureux, actionable, professionnel mais accessible.
- Chaque recommandation doit expliquer le POURQUOI (mécanisme) et le COMMENT (mise en pratique).
- Ton confiant mais humble: "D'après les données...", "Il est recommandé de...", "Cela permettra de..."

EXEMPLE DE STYLE REQUIS:
❌ MAUVAIS (bullet points):
"Objectifs:
- Stabiliser la glycémie
- Réduire HOMA-IR
Actions:
- Jeûne intermittent
- Marche 10000 pas"

✅ BON (paragraphes experts):
"Les 14 premiers jours constituent la phase de stabilisation métabolique. L'objectif principal est de stabiliser votre glycémie à jeun en la réduisant progressivement de 162 mg/dL vers 130 mg/dL, tout en améliorant votre HOMA-IR de 3.2 vers 2.5. Cela s'obtient en établissant une fenêtre alimentaire de 10 heures (exemple: 10h-20h) qui permet des périodes de jeûne suffisamment longues pour améliorer la sensibilité insulinique sans créer de stress métabolique excessif. En parallèle, vous allez marcher 10000 pas quotidiens répartis sur la journée, car cette activité de basse intensité active le transporteur GLUT4 musculaire de manière indépendante de l'insuline, améliorant la clairance du glucose."

CONTRAINTES STRUCTURELLES:
- Titres EXACTS et dans l'ordre:
  ## Plan d'action 90 jours (hyper concret)
  ### Jours 1-14 (Stabilisation)
  ### Jours 15-30 (Phase d'Attaque)
  ### Jours 31-60 (Consolidation)
  ### Jours 61-90 (Optimisation)
  ### Retest & conditions de prelevement
- Pour chaque phase, rédige 3 à 5 PARAGRAPHES COMPLETS couvrant: les objectifs métaboliques/hormonaux, les actions concrètes quotidiennes avec timing et mécanismes, les indicateurs de progrès à surveiller, et les erreurs à éviter.
- Relie systématiquement chaque phase au résultat physique (sèche, performance, récupération).
- Aucun autre texte ou section en dehors du plan 90 jours.

CONTEXTE:
Client: ${userProfile.prenom ? userProfile.prenom : "le client"} (${userProfile.gender} ${userProfile.age || ""}ans)
Lifestyle: ${lifestyleLine}

MARQUEURS:
${markersTable}

PATTERNS DETECTES:
${patternsText}

RESUME:
Optimal: ${analysisResult.summary.optimal.join(", ") || "Aucun"}
À surveiller: ${analysisResult.summary.watch.join(", ") || "Aucun"}
Action requise: ${analysisResult.summary.action.join(", ") || "Aucun"}

${knowledgeContext ? `SOURCES GENERALES (chunks):\n${knowledgeContext}` : ""}\n`;

    try {
      const planStartTime = Date.now();
      const planResponse = await withTimeout(
        anthropic.messages.create({
          model: process.env.BLOOD_ANALYSIS_MODEL || "claude-opus-4-5-20251101",
          max_tokens: 3000,
          system:
            "Tu es un expert medical. Respecte STRICTEMENT le format demande, aucun emoji, et ne produis que la section demandee.",
          messages: [{ role: "user", content: planPrompt }]
        }),
        fastMode ? 30000 : 120000
      );
      const planDuration = Math.round((Date.now() - planStartTime) / 1000);
      console.log(`[BloodAnalysis] ✅ Plan 90j généré en ${planDuration}s`);
      const planText = extractPlan90Section(
        planResponse.content.find(c => c.type === "text")?.text || ""
      );
      if (planText) {
        output = insertPlan90Section(output, planText);
      }
    } catch (err: any) {
      if (err.message === "API_TIMEOUT") {
        console.warn("[BloodAnalysis] Plan d'action 90 jours timed out, skipping");
      } else {
        console.error("[BloodAnalysis] Plan d'action 90 jours fallback failed:", err);
      }
    }
  }

  const missingAfter = getMissingHeadings(output, REQUIRED_HEADINGS_NO_SOURCES);
  if (missingAfter.length) {
    console.log(`[BloodAnalysis] 🔧 Fallback: Génération sections manquantes (${missingAfter.length}): ${missingAfter.join(', ')}`);
    const missingPrompt = `Tu dois produire UNIQUEMENT les sections manquantes suivantes (titres EXACTS, dans cet ordre):
${missingAfter.join("\n")}

STYLE (OBLIGATOIRE - EXPERT MEDICAL):
INTERDIT ABSOLU:
- Bullet points, listes à puces, tirets, énumérations
- Résumés style IA générique
- Format "action points" isolés

EXIGENCES DE REDACTION:
- PARAGRAPHES COMPLETS UNIQUEMENT. Chaque idée développée en phrases complètes avec sujet-verbe-complément.
- Style médecin fonctionnel: rigoureux, actionable, professionnel mais accessible.
- Chaque recommandation doit expliquer le POURQUOI (mécanisme) et le COMMENT (mise en pratique).
- ${citationsRule}

CONTRAINTES:
- Aucun autre texte ou section en dehors des sections demandées
- Pas d'emojis
- Ton confiant mais humble

CONTEXTE:
Client: ${userProfile.prenom ? userProfile.prenom : "le client"} (${userProfile.gender} ${userProfile.age || ""}ans)
Lifestyle: ${lifestyleLine}

MARQUEURS:
${markersTable}

PATTERNS DETECTES:
${patternsText}

SOURCES PAR BIOMARQUEUR (chunks):
${deepDivePayload.context || "- Aucune source fournie."}

SOURCES GENERALES (chunks):
${knowledgeContext || "- Aucune source generale fournie."}
`;

    try {
      const missingStartTime = Date.now();
      const missingResponse = await withTimeout(
        anthropic.messages.create({
          model: process.env.BLOOD_ANALYSIS_MODEL || "claude-opus-4-5-20251101",
          max_tokens: 6000,
          system:
            "Tu es un expert medical. Respecte STRICTEMENT le format demande, aucun emoji, et ne produis que les sections demandees.",
          messages: [{ role: "user", content: missingPrompt }]
        }),
        fastMode ? 60000 : 180000
      );
      const missingDuration = Math.round((Date.now() - missingStartTime) / 1000);
      console.log(`[BloodAnalysis] ✅ Sections manquantes générées en ${missingDuration}s`);
      const missingText = missingResponse.content.find(c => c.type === "text")?.text || "";
      if (missingText.trim()) {
        output = insertMissingSections(output, missingText);
      }
    } catch (err: any) {
      if (err.message === "API_TIMEOUT") {
        console.warn("[BloodAnalysis] Missing sections generation timed out, skipping");
      } else {
        console.error("[BloodAnalysis] Missing sections generation failed:", err);
      }
    }
  }

  const withSources = ensureSourcesSection(output);
  const finalReport = trimAiAnalysis(withSources);

  console.log(`[BloodAnalysis] 🎉 RAPPORT FINAL GÉNÉRÉ`);
  console.log(`[BloodAnalysis] 📏 Longueur totale: ${finalReport.length} chars`);
  console.log(`[BloodAnalysis] 📚 Nombre de citations: ${extractSourceIds(finalReport).length}`);
  console.log(`[BloodAnalysis] ✅ Sections manquantes: ${getMissingHeadings(finalReport, REQUIRED_HEADINGS_NO_SOURCES).join(', ') || 'aucune'}\n`);

  return finalReport;
}

// ============================================
// KNOWLEDGE BASE INTEGRATION
// ============================================

export async function getBloodworkKnowledgeContext(
  markers: MarkerAnalysis[],
  patterns: DiagnosticPattern[]
): Promise<string> {
  const keywords: string[] = [];

  // Add marker names as keywords
  for (const marker of markers) {
    if (marker.status !== "optimal") {
      keywords.push(marker.name.toLowerCase());
    }
  }

  // Add pattern-related keywords
  for (const pattern of patterns) {
    keywords.push(...pattern.causes.map(c => c.toLowerCase()));
  }

  // Add specific bloodwork terms
  keywords.push("bloodwork", "biomarker", "optimal range");

  // Search knowledge base
  const articles = await searchArticles(keywords, 12, [
    "huberman",
    "sbs",
    "applied_metabolics",
    "newsletter",
    "peter_attia",
    "marek_health",
    "examine",
    "chris_masterjohn",
    "mpmd"
  ]);

  if (articles.length === 0) {
    return "";
  }

  // Build context from articles with explicit source IDs
  const context = articles
    .map((article) => {
      if (!article.id) return "";
      const label = SOURCE_LABELS[article.source] || article.source;
      const idTag = `[SRC:${article.id}]`;
      const excerpt = article.content.replace(/\s+/g, " ").trim().slice(0, 700);
      return `${idTag} ${label} — ${article.title}\n${excerpt}${excerpt.length >= 700 ? "..." : ""}`;
    })
    .filter(Boolean)
    .join("\n\n---\n\n");

  return context;
}
