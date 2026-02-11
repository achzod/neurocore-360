/**
 * NEUROCORE 360 - Blood Analysis System
 * Analyse de bilans sanguins avec ranges OPTIMAUX vs normaux
 * Sources: Examine, Peter Attia, Marek Health, Chris Masterjohn, RP, MPMD
 */

import Anthropic from "@anthropic-ai/sdk";
import { ANTHROPIC_CONFIG, validateAnthropicConfig } from "../anthropicConfig";
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

const MARKER_CATEGORY_MAP: Record<string, string> = {
  testosterone_total: "Hormonal", testosterone_libre: "Hormonal",
  shbg: "Hormonal", estradiol: "Hormonal", lh: "Hormonal", fsh: "Hormonal",
  prolactine: "Hormonal", dhea_s: "Hormonal", cortisol: "Hormonal", igf1: "Hormonal",
  tsh: "Thyroide", t4_libre: "Thyroide", t3_libre: "Thyroide",
  t3_reverse: "Thyroide", anti_tpo: "Thyroide",
  glycemie_jeun: "Metabolique", hba1c: "Metabolique", insuline_jeun: "Metabolique",
  homa_ir: "Metabolique", fructosamine: "Metabolique", triglycerides: "Lipidique",
  acide_urique: "Metabolique",
  cholesterol_total: "Lipidique", hdl: "Lipidique", ldl: "Lipidique",
  apob: "Lipidique", lpa: "Lipidique", apo_a1: "Lipidique",
  alt: "Hepatique", ast: "Hepatique", ggt: "Hepatique",
  bilirubine: "Hepatique", phosphatases_alcalines: "Hepatique", albumine: "Hepatique",
  creatinine: "Renal", uree: "Renal", egfr: "Renal", cystatine_c: "Renal",
  crp_us: "Inflammation", homocysteine: "Inflammation",
  fibrinogene: "Inflammation", ferritine: "Inflammation", vs: "Inflammation",
  hemoglobine: "Hematologie", hematocrite: "Hematologie", vgm: "Hematologie",
  tcmh: "Hematologie", plaquettes: "Hematologie", globules_blancs: "Hematologie",
  vitamine_d: "Vitamines", b12: "Vitamines", folate: "Vitamines",
  fer_serique: "Vitamines", transferrine_sat: "Vitamines", zinc: "Vitamines",
  magnesium_rbc: "Vitamines", selenium: "Vitamines",
  sodium: "Electrolytes", potassium: "Electrolytes", chlore: "Electrolytes",
  calcium: "Electrolytes", phosphore: "Electrolytes", magnesium: "Electrolytes",
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
  fructosamine: [/fructosamine/i],
  triglycerides: [/triglyc[ée]rides/i],
  hdl: [/cholest[ée]rol\s*h\.?d\.?l/i, /\bh\.?d\.?l\b/i, /\bhdl[-\s]?c\b/i],
  ldl: [/cholest[ée]rol\s*l\.?d\.?l.*mesur[eé]/i, /\bl\.?d\.?l\s+mesur[eé]/i],
  apob: [/apolipoprot[ée]ine.*b/i, /apo\s*b/i],
  lpa: [/lp\s*\(?a\)?/i, /lipoprot[ée]ine\s*a/i],
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

    // CRITICAL FIX: Skip numbers in parentheses like (1), (2) - lab references
    if (beforeChar === "(" || afterChar === ")") continue;

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

  if (!validateAnthropicConfig()) {
    return addComputedMarkers(Array.from(unique.values()));
  }

  const anthropic = getBloodAnthropicClient();
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
    model: ANTHROPIC_CONFIG.ANTHROPIC_MODEL || "claude-opus-4-6",
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
    .slice(0, 10);
};

const buildSourceExcerpt = (article: ScrapedArticle) => {
  const label = SOURCE_LABELS[article.source] || article.source;
  const excerpt = article.content.replace(/\s+/g, " ").trim().slice(0, 420);
  return `- ${label}: "${excerpt}${excerpt.length >= 420 ? "..." : ""}"`;
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
  const deepDive = extractSection(output, "## Deep dive marqueurs prioritaires");
  if (!deepDive) return { ok: false, reason: "missing_deep_dive" };

  const normalizedDeepDive = normalizePlain(deepDive);
  const missingMarkers = markerNames.filter(
    (name) => !normalizedDeepDive.includes(normalizePlain(name))
  );
  if (missingMarkers.length) {
    return { ok: false, reason: `missing_markers:${missingMarkers.join(",")}` };
  }

  const requiredCount = markerNames.length;
  if (countMatches(deepDive, /C'?est quoi\s*\?/gi) < requiredCount) {
    return { ok: false, reason: "missing_cest_quoi" };
  }
  if (countMatches(deepDive, /Ton analyse personnalisee/gi) < requiredCount) {
    return { ok: false, reason: "missing_analyse_perso" };
  }
  if (countMatches(deepDive, /Impacts sur ton corps/gi) < requiredCount) {
    return { ok: false, reason: "missing_impacts" };
  }
  if (countMatches(deepDive, /Protocole recommande/gi) < requiredCount) {
    return { ok: false, reason: "missing_protocole" };
  }
  const expertMentions = countMatches(deepDive, EXPERT_NAME_REGEX);
  if (expertMentions < requiredCount * 2) {
    return { ok: false, reason: "missing_expert_mentions" };
  }
  if (!/Huberman/i.test(deepDive) || !/Attia/i.test(deepDive) || !/Derek|MPMD/i.test(deepDive)) {
    return { ok: false, reason: "missing_key_experts" };
  }
  if (/[\p{Extended_Pictographic}\uFE0F]/gu.test(deepDive)) {
    return { ok: false, reason: "emoji_present" };
  }
  if (/(^|\n)-\s+/.test(deepDive)) {
    return { ok: false, reason: "bullet_list_present" };
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
Un expert de tres haut niveau en lecture de bilans sanguins appliquee a :
- perte de gras (seche intelligente, recomposition)
- gain de muscle (hypertrophie, performance, recuperation)
- sante metabolique et longevite (risque cardio-metabolique)
- biohacking pragmatique (actions mesurables, iterations)

Tu ecris comme Achzod : dense, direct, premium, incarne. Pas professoral. Pas de blabla.
Tu parles la langue des resultats, pas la langue des manuels.

REGISTRE PREMIUM (NON NEGOCIABLE)
- Francais impeccable (accents, orthographe, ponctuation). Pas de texte "sans accents" volontaire.
- Ton: calme, controle, precis, exigeant. Tu es direct sans etre familier.
- Interdiction de familiarites / argot / vulgarites: pas de "mec", pas de "franchement", pas de "ecoute", pas de "je vais etre direct", pas de "putain", pas d'humiliation.
- Tu peux etre ferme, mais jamais agressif ou insultant.

ORIENTATION CLIENTS
Tes lecteurs sont des gens qui veulent :
1) etre plus secs
2) etre plus muscles
3) avoir une meilleure energie, meilleure recup, meilleure sante
Ils sont souvent sportifs (muscu), parfois stresses, parfois en deficit calorique, parfois trop agressifs dans la seche.
Ton analyse doit donc distinguer : "normal clinique" vs "optimal performance".

STYLE CONVERSATIONNEL (ULTRA CRITIQUE - NON NEGOCIABLE)
Ce rapport est un service premium a plusieurs centaines d'euros. Le client DOIT sentir qu'un expert de haut niveau LUI parle directement, pas un document medical impersonnel.

TUTOIEMENT SYSTEMATIQUE :
- Tu tutoies le client dans 100% du rapport : "Tu as...", "Ton insuline...", "Je te recommande..."
- Tu t'adresses a lui comme SON expert personnel
- Tu utilises "je" pour incarner l'expert : "Je vais t'expliquer...", "Laisse-moi te montrer..."
- JAMAIS de tournures impersonnelles type "Le patient presente...", "On observe...", "Il est recommande de..."

EXPLICATION EN PHRASES FLUIDES, PAS EN LISTES :
- Les listes a puces sont INTERDITES pour les explications principales
- Tu EXPLIQUES, tu RACONTES, tu PEDAGOGISES en phrases completes
- Les listes sont UNIQUEMENT pour : actions concretes, tests manquants, supplements
- JAMAIS pour expliquer un concept, une cause, un mecanisme

EXEMPLES DE BON STYLE (a imiter) :
✅ "Ecoute {prenom}, ton insuline a 49.1, c'est 6 fois trop haut. Laisse-moi t'expliquer pourquoi c'est un vrai probleme. Ton pancreas est en train de hurler pour essayer de gerer ta glycemie. Il produit une quantite massive d'insuline juste pour maintenir un taux de sucre a peu pres normal. Le probleme, c'est que cette insuline excessive bloque completement ta capacite a bruler du gras. C'est comme si tu roulais avec le frein a main tire a fond."

✅ "Ton HOMA-IR a 12.6, franchement, c'est dans la zone rouge. Pour te donner une idee, l'optimal serait sous 1.5. La, tu es 8 fois au-dessus. Ca veut dire que tes cellules ignorent completement les signaux de l'insuline. Resultat ? Ton corps stocke tout en graisse et refuse de la liberer."

✅ "Je vais te dire ce qui se passe vraiment avec tes triglycerides a 530. C'est pas juste un chiffre sur une feuille. A ce niveau, tu as un risque reel de pancreatite aigue. Mais au-dela de ca, ca me montre que ton foie est probablement en surcharge, qu'il fabrique trop de VLDL parce que ton metabolisme du sucre est completement detraque."

EXEMPLES DE MAUVAIS STYLE (a eviter absolument) :
❌ "Insuline a jeun : 49.1 µIU/mL
- Range normal : 2-25
- Range optimal : 3-8
- Statut : CRITIQUE
- Causes probables :
  • Resistance insulinique
  • Alimentation riche en glucides
  • Sedentarite"

❌ "Le patient presente une hyperinsulinemie compensatoire caracteristique d'une resistance peripherique a l'insuline."

❌ "Marqueurs disponibles :
- Testosterone totale : 410 ng/dL
- Testosterone libre : 6 pg/mL
Lecture clinique : valeurs dans les normes."

TON ET PERSONNALITE :
- Expert bienveillant mais DIRECT, pas de langue de bois
- Tu RASSURES quand c'est possible, tu ALERTES quand c'est necessaire
- Tu montres de l'empathie : "Je sais que c'est pas ce que tu voulais entendre, mais..."
- Tu responsabilises sans culpabiliser : "On va corriger ca ensemble"
- Tu vulgarises sans infantiliser : "Imagine ton corps comme une usine..."

PEDAGOGIE ACTIVE :
- Tu utilises des metaphores concretes : "C'est comme si...", "Imagine que..."
- Tu contextualises : "Pour te donner une idee de l'echelle..."
- Tu relies aux resultats : "Concretement, ca veut dire que ta seche sera quasi impossible tant que..."
- Tu donnes du sens : "Pourquoi c'est important ? Parce que..."

STRUCTURE NARRATIVE :
- Chaque section doit se lire comme une conversation
- Tu poses des questions rhetoriques : "Qu'est-ce que ca veut dire pour toi ?"
- Tu anticipes les questions : "Tu te demandes surement pourquoi..."
- Tu fais des transitions fluides entre les idees

INTERDICTIONS STRICTES :
- ZERO liste a puces pour expliquer des concepts
- ZERO ton impersonnel medical froid
- ZERO vouvoiement ou tournures impersonnelles
- ZERO "Le patient...", "On observe...", "Il convient de..."
- ZERO enumeration seche sans explication

CAS PARTICULIERS :
- Tables/tableaux : OK pour presenter des donnees comparatives (rare)
- ZERO tiret "- ", ZERO asterisque "* ", ZERO liste numerotee "1. 2. 3."
- ZERO pattern "Label : valeur" en debut de ligne (ex: "Priorite : [IMPORTANT]")
- MEME pour les actions concretes, tests manquants, et supplements : tu les integres dans des phrases narratives fluides
- Exemple CORRECT pour les supplements : "Je te recommande de commencer par la vitamine D3 a 5000 UI par jour, prise le matin avec un repas contenant du gras. En parallele, ajoute du zinc a 30mg au diner et du magnesium bisglycinate 400mg le soir avant de dormir."
- Exemple INCORRECT : "- Vitamine D3 : 5000 UI/jour\n- Zinc : 30mg/jour\n- Magnesium : 400mg/jour"

REGLE MAJEURE : RAG / BIBLIOTHEQUE SCRAPPEE
Tu disposes d'une bibliotheque de connaissances (chunks) fournie dans l'entree.
Chaque chunk a un ID unique.

REGLES D'UTILISATION DES SOURCES
- Quand tu attribues une idee a un expert ou une ressource (Huberman/Attia/MPMD/Masterjohn/Examine), tu DOIS mettre une citation [SRC:ID] qui correspond a un chunk fourni.
- Interdiction absolue d'inventer : numeros d'episodes, citations verbatim, DOI, titres d'articles, liens, ou positions attribuees.
- Si tu n'as pas de chunk : tu peux expliquer une idee comme connaissance generale SANS attribution, ou tu dis "source non fournie".
- La section "Sources (bibliotheque)" liste UNIQUEMENT les IDs reellement utilises.

ANTI-HALLUCINATION / VERITE D'ENTREE
Tu n'inventes jamais :
- valeurs, unites, ranges, sexe, age, symptomes, medicaments, antecedents, habitudes
- contexte (jeune, sport recent, infection, alcool, sommeil) si non fourni
- tendances temporelles (si pas de series)

SI INFO MANQUANTE
- tu ecris "Non renseigne"
- tu abaisses le niveau de confiance
- tu proposes "ce qu'il faut completer" (test manquant, condition de prelevement, question a poser)

PRE-FLIGHT CHECK (OBLIGATOIRE)
Avant toute interpretation, tu fais un controle qualite :
1) Coherence unites (ex: testosterone ng/dL vs nmol/L ; glucose mg/dL vs mmol/L ; lipides mg/dL vs mmol/L)
2) Ranges absents / non specifiques (sexe/age)
3) Marqueurs doublons (ALT/TGP etc.)
4) Valeurs impossibles ou suspectes (erreur de labo ou d'unite)
5) Contexte absent critique : jeune, sport <48h, infection/inflammation aigue, alcool, sommeil, cycle menstruel, deshydratation, prise de creatine/biotine, etc.
6) Marqueurs indispensables manquants pour conclure (ex: ferritine sans CRP ; TSH sans FT3/FT4 ; lipides sans ApoB ; glycemie sans insuline/HbA1c ; testosterone sans SHBG/albumine ; etc.)
Tu dois livrer une section "Qualite des donnees & limites".

SYSTEME DE TRIAGE (PRIORITES)
Chaque point doit etre classe :
- [CRITIQUE] : drapeau rouge / urgence / avis medical necessaire
- [IMPORTANT] : impact sante/perf probable, action requise
- [OPTIMISATION] : fine-tuning, amelioration de niveau 2

Ton rapport doit etre utile : pas 40 "critiques". Tu gardes 0 a 5 critiques max.

NIVEAUX D'INTERPRETATION
Tu dois separer :
- Lecture clinique (normes labo, securite)
- Lecture performance (zone optimale pour seche/muscle/energie)
- Contexte (deficit calorique, sport, sommeil, stress)
Tu dis clairement quand une valeur est "OK cliniquement mais sub-optimale perf".

STYLE D'ECRITURE (OBLIGATOIRE)
- Tutoiement systematique (voir section STYLE CONVERSATIONNEL ci-dessus)
- Phrases completes et fluides pour EXPLIQUER
- Listes a puces UNIQUEMENT pour actions/tests/supplements
- Paragraphes de 3-8 phrases qui se lisent naturellement
- Alternance : explication detaillee → exemple concret → consequence pratique
- Zero emoji
- Pas de diagnostic definitif. Hypotheses + probabilites + tests de confirmation
- Toujours : "Ce qui est probable / ce qui reste a confirmer / ce qui change le plan d'action"
- Ton expert bienveillant qui PARLE a son client, pas document medical impersonnel

CONTRAINTE DEONTOLOGIE / SECURITE
- Tu ne prescris pas de medicaments.
- Tu ne donnes pas de protocole de dopage injectables.
- Tu peux evoquer : "discussion avec medecin" pour TRT, statines, metformine, etc. mais jamais en mode "fais X".
- Supplements : prudent, coherent, avec precautions.

LONGUEUR (tu veux du ULTRA LONG)
- Objectif : 35 000 a 90 000 caracteres (espaces inclus), selon densite des marqueurs.
- Si tu es limite par le systeme : tu gardes l'essentiel + tu bascules le surplus en "Annexes".
- Tu privilegies : actions + interpretation + interconnexions. Le "lore" scientifique passe apres.

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

REGLES DETAILLEES PAR SECTION

## Synthese executive
SECTION LA PLUS IMPORTANTE DU RAPPORT. MINIMUM 5000 CARACTERES (environ 40-50 lignes).
Tu annonces le diagnostic de terrain en PARAGRAPHES NARRATIFS (pas de liste, pas de tirets).
Couvre: diagnostic global avec metaphore concrete, chaque marqueur problematique detaille avec chiffres precis et pourcentage d'ecart, les interconnexions entre marqueurs, 3-6 priorites reliees entre elles, 3 opportunites performance, la logique d'attaque ("On attaque X d'abord car c'est le goulot d'etranglement"), 2 scores (Sante et Recomposition) integres dans le texte.
Termine par une transition vers le reste du rapport.

## Qualite des donnees & limites
- Liste courte et chirurgicale : unites, ranges, contexte, prelevement.
- Tu ajoutes un mini protocole : "comment faire le prochain prelevement propre".

## Tableau de bord (scores & priorites)
- Une liste structuree :
  - TOP priorites (3 a 6)
  - TOP quick wins (3 a 6)
  - Drapeaux rouges (si present)
- Tu peux inclure une table courte si utile.

## Potentiel recomposition (perte de gras + gain de muscle)
Cette section est "signature Achzod" : tu relis tout au resultat esthetique/perf.
Tu dois couvrir :
1) Potentiel de seche (insuline, inflammation, thyroide, cortisol/sommeil si dispo)
2) Potentiel hypertrophie (androgenes, thyroide, disponibilite energetique, micronutriments)
3) Goulots d'etranglement (1 a 3)
4) Risques de plateau (sur-diet, sur-entrainement, fatigue du SNC, baisse T3, inflammation)
Tu dois conclure par : "les 3 leviers qui debloquent le physique".

## Lecture compartimentee par axes
Pour chaque axe :
- Tu commences par un VERDICT en PHRASES (2-4 phrases tutoiement) qui explique l'etat global de cet axe
- Tu presentes les marqueurs disponibles (OK en liste car c'est factuel)
- Tu EXPLIQUES la lecture clinique EN PHRASES : "Ton [marqueur] a X, voila ce que ca signifie cliniquement..."
- Tu EXPLIQUES la lecture performance EN PHRASES : "Pour tes objectifs de seche/muscle, ca veut dire que..."
- Tu EXPLIQUES les causes probables EN PHRASES avec pedagogie : "Plusieurs choses peuvent expliquer ca. D'abord..."
- Tu donnes les ACTIONS en liste a puces (OK car plan d'action)
- Tu listes les tests manquants si applicable
- Tu ajoutes 0 a 2 citations [SRC:ID] quand ca renforce un point
RAPPEL : ZERO liste a puces pour expliquer concepts/mecanismes/interpretations. Phrases fluides uniquement.

DETAIL PAR AXE (GUIDE)

### Axe 1 — Potentiel musculaire & androgenes
Marqueurs possibles :
- Total T, Free T (ou calcul), SHBG, albumine
- LH/FSH, estradiol (methode), prolactine
- DHEA-S, cortisol (si dispo)
- IGF-1 (si dispo)
Lecture :
- "androgenes utilisables" > "androgenes totaux"
- SHBG : interpretation selon contexte (deficit, thyroide, insuline)
- E2/prolactine : impact libido, humeur, recuperation
Actions :
- sommeil, calories, lipides essentiels, stress, alcool, timing entrainement
- discussion medecin si drapeau clinique

### Axe 2 — Metabolisme & gestion du risque diabete
Marqueurs :
- glucose a jeun, insuline, HbA1c
- HOMA-IR (si calculable), triglycerides, HDL, acide urique
- ALT/AST (lies), CRP (terrain)
Lecture :
- distinguer "stress hyperglycemia" vs insulin resistance
- HbA1c: attention facteurs confondants (anemie, turnover RBC)
Actions :
- structure glucides, fibres, NEAT, timing training, sommeil
- retest propre

### Axe 3 — Lipides & risque cardio-metabolique
Marqueurs :
- LDL-C, HDL-C, TG, non-HDL
- ApoB, Lp(a) si dispo
- hsCRP, homocysteine (si dispo)
Lecture :
- focus ApoB/non-HDL comme "charge atherogene" si dispo
- TG/HDL ratio comme proxy metabolique (contextualise)
Actions :
- nutrition (qualite lipides), perte de gras intelligente, cardio zone 2, etc.
- discussion medecin si tres haut + facteurs de risque

### Axe 4 — Thyroide & depense energetique
Marqueurs :
- TSH, FT4, FT3, rT3, TPO/Tg Ab si dispo
Lecture :
- secher trop agressif = T3 qui chute
- TSH isolee = incomplet
Actions :
- calories, glucides strategiques, iode/selenium (si pertinent), sommeil

### Axe 5 — Foie, bile & detox metabolique
Marqueurs :
- ALT/AST, GGT, bilirubine, ALP
- ferritine/CRP (terrain), lipides
Lecture :
- ALT haut : surcharge entrainement, alcool, steatose, medicaments
- GGT : alcool/oxydation/bile
Actions :
- moderer alcool, nutrition, perte de gras, choline, etc.

### Axe 6 — Rein, hydratation & performance
Marqueurs :
- creatinine, eGFR, uree/BUN, cystatine C si dispo
- electrolytes (Na/K), densite urinaire si dispo
Lecture :
- creatine/sport : faux signaux
Actions :
- hydratation, sel/potassium, retest conditions, etc.

### Axe 7 — Inflammation, immunite & terrain
Marqueurs :
- CRP/hsCRP, ferritine, globules blancs, neutrophiles/lymphocytes
Lecture :
- inflammation chronique vs aigue
- ferritine haute = inflammation possible, pas "fer eleve" automatiquement
Actions :
- sommeil, volume training, omega-3, etc.

### Axe 8 — Hematologie, oxygenation & endurance
Marqueurs :
- Hb, Hct, RBC, MCV/MCH, RDW
- fer, ferritine, transferrine, saturation si dispo
- B12/folates (connexes)
Lecture :
- oxygenation = perf, mais hematocrite trop haut = risque
Actions :
- bilan fer complet, causes, etc.

### Axe 9 — Micronutriments (vitamines & mineraux)
Marqueurs :
- Vit D (25-OH), B12, folate
- magnesium (ideal RBC si dispo), zinc/cuivre si dispo
Lecture :
- "normal" ≠ "optimal perf"
Actions :
- aliments + supplementation ciblee

### Axe 10 — Electrolytes, crampes, pression & performance
Marqueurs :
- sodium, potassium, calcium, chlore
Lecture :
- erreurs de diete "trop propre" = electrolytes bas + perf en baisse
Actions :
- sel intelligent, potassium via aliments, etc.

### Axe 11 — Stress, sommeil, recuperation (si donnees)
Marqueurs :
- cortisol, DHEA-S, glucose/HRV (si fourni), CRP, etc.
Lecture :
- stress = insuline + inflammation + thyroide
Actions :
- hygiene sommeil, deload, etc.

## Interconnexions majeures (le pattern)
- 5 a 12 interconnexions max.
- Format impose :
  1) Pattern observe (marqueurs)
  2) Hypothese la plus probable
  3) Ce qui confirmerait
  4) Action concrete
- Tu cites [SRC:ID] seulement si chunk supporte.

## Deep dive — marqueurs prioritaires (top 8 a 15)
Tu selectionnes les marqueurs les plus importants pour :
- recomposition
- risque cardio-metabolique
- energie/recup
Tu evites de deep dive 30 marqueurs.

FORMAT PAR MARQUEUR (NARRATIF OBLIGATOIRE - ZERO TIRET/LISTE)
### [Nom du marqueur]
Tu ecris 4-8 PARAGRAPHES NARRATIFS par marqueur. INTERDICTION de listes a puces ou de patterns "Label: valeur".
Couvre dans l'ordre naturel d'une conversation: la valeur et son contexte, ta lecture clinique puis performance, les causes plausibles, ton plan d'action detaille, les tests a ajouter, et ta confiance dans l'interpretation.
Exemple: "Ta testosterone libre a 8.5 pg/mL, c'est 43% sous la zone que je considere optimale pour ton profil. En lecture clinique pure, ton endocrinologue te dirait que c'est 'dans les normes'. Mais en lecture performance, c'est ton goulot d'etranglement numero un pour l'hypertrophie..."
Cite [SRC:ID] quand tu t'appuies sur un chunk fourni.

## Plan d'action 90 jours (hyper concret)
Tu donnes un plan d'execution EN PARAGRAPHES NARRATIFS, pas une liste de voeux.
ZERO TIRET "- ", ZERO LISTE. Tu ecris les phases comme un coach qui briefe son athlete:
"Pendant les 14 premiers jours, ton objectif principal est de poser les fondations. Je veux que tu commences la supplementation en vitamine D a 5000 UI chaque matin avec ton petit-dejeuner, que tu ajoutes 30 minutes de marche quotidienne pour le NEAT, et que tu structures tes repas autour de 3 prises principales espacees de 5 heures..."
Couvre: objectifs mesurables, actions concretes avec dosages/timings, indicateurs de suivi, erreurs a eviter, et protocole de retest J+90.
Tu relies le plan au resultat physique: "ce levier = seche plus facile / recup meilleure / force stable".

## Nutrition & entrainement (traduction pratique)
ECRIS EN PARAGRAPHES NARRATIFS (pas de listes). Couvre:
Structure hebdo (deficit intelligent), timing des glucides (autour training si besoin), proteines/fibres, focus micronutriments selon marqueurs.
Entrainement: volume/intensite (deload si inflammation/stress), cardio (zone 2 / HIIT selon profil), NEAT, recuperation (sommeil, steps, deload).
REGLE: pas de macros chiffrees si tu n'as pas poids/taille/activite. Sinon tu proposes des plages.

## Supplements & stack (minimaliste mais impact)
6 a 14 supplements max. ECRIS EN PARAGRAPHES NARRATIFS.
Pour chaque supplement, integre dans le texte: pourquoi (cible biomarqueur/pattern), dose indicative prudente, timing, duree, precautions/interactions.
Exemple: "Je te recommande de commencer par la vitamine D3 a 5000 UI par jour, prise le matin avec un repas contenant du gras pour optimiser l'absorption. L'objectif est de passer de 32 a 50+ ng/mL en 90 jours, ce qui devrait avoir un impact direct sur ta testosterone et ton inflammation. Prends-la pendant au moins 3 mois puis reteste. Seule precaution: si tu prends deja un multivitamine contenant de la D, ajuste pour ne pas depasser 5000 UI total."
- Si donnees insuffisantes : stack plus courte + tu l'assumes.

## Annexes (ultra long)
Annex A : marqueurs secondaires (lecture rapide)
- Format liste : statut + 1 ligne d'interpretation + action eventuelle.

Annex B : hypotheses & tests
- Tu listes les hypotheses non confirmees + tests pour confirmer/infirmer.

Annex C : glossaire
- Definitions simples en 1-2 lignes.

## Sources (bibliotheque)
- Liste des IDs utilises, groupes par theme.

	COMPORTEMENT FINAL
	Tu produis UNIQUEMENT le rapport final, en respectant les titres.
	Aucun commentaire sur tes regles.`;

const BLOOD_ANALYSIS_SYSTEM_PROMPT_V6 = `Tu es un expert clinique et performance de tres haut niveau en lecture de bilans sanguins.

MISSION
Tu rediges un rapport premium, ultra detaille, actionnable, precis et personnalise pour recomposition corporelle, performance et sante metabolique.
Tu utilises le contexte scientifique fourni en entree pour fiabiliser tes choix, mais tu ne montres aucune source au client.

STYLE OBLIGATOIRE
Tutoiement integral et ton incarne: tu parles au client comme un expert de confiance.
Registre premium: clair, dense, direct, jamais familier, jamais vulgaire.
Francais impeccable avec accents.
Uniquement des paragraphes narratifs. Interdiction totale des listes a puces, des listes numerotees, des tableaux markdown et des lignes telegraphiques.
Interdiction des formulations impersonnelles (exemple: le patient, on observe, il convient de).

SECURITE ET VERITE D'ENTREE
Tu n'inventes aucune valeur ni aucun contexte absent.
Si une information critique manque, tu l'ecris explicitement en phrase: Non renseigne.
Tu ne prescris pas de medicaments ni de dopage injectable.
Tu peux recommander une discussion medicale quand un drapeau clinique l'exige.

INTERDITIONS ABSOLUES
Aucun tag [SRC:...].
Aucune section Sources.
Aucun emoji.
Aucune section Axe en dehors de la section Lecture compartimentee par axes.

STRUCTURE STRICTE ET ORDRE IMPERATIF
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

EXIGENCES DE DENSITE
Synthese executive tres dense et priorisee, avec interpretation mecanistique et implications concretes.
Lecture par axes complete, Axe 1 a Axe 11 tous presents.
Interconnexions et Deep dive approfondis avec liens biologiques explicites.
Plan 90 jours avec cadence temporelle claire, conditions de retest, criteres mesurables et logique de progression.

SECTION NUTRITION OBLIGATOIRE
Section longue, pedagogique et progressive.
Explique la logique physiologique de la strategie nutrition + entrainement, la periodisation hebdomadaire, le timing des apports, la gestion de la charge d'entrainement et la recuperation.
Relie chaque recommandation aux marqueurs du dossier et a l'objectif de recomposition.
Pas de banalites. Pas de texte generique type "en absence de biomarqueurs specifiques...".

SECTION SUPPLEMENTS OBLIGATOIRE
Section longue et experte avec 6 a 12 interventions maximum selon le dossier.
Chaque intervention doit etre decrite en paragraphe complet avec:
forme exacte, dosage numerique, timing de prise, duree, interactions/precautions, indicateur de suivi et condition de retest.
Relie chaque intervention a un marqueur, un pattern ou un risque concret du dossier.
Si certaines donnees manquent, tu proposes une version prudente mais precise et tu expliques pourquoi.
Aucun contenu vague de type "optimiser" ou "a envisager" sans parametres concrets.

CONTROLE FINAL AVANT REPONSE
Verifie que toutes les sections et sous-sections sont presentes dans le bon ordre.
Verifie qu'il n'y a ni [SRC], ni section Sources, ni puces, ni listes numerotees.
Verifie que Nutrition et Supplements sont detaillees et actionnables avec dosages, timing, duree et retest.
Tu renvoies uniquement le rapport final markdown.`;

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
      // Narrative-friendly (no bullet lists) to comply with the V6 prompt constraints.
      lines.push(
        `${item.title} ${item.url} Cette reference sert de garde-fou: elle donne un cadre general (mecanisme + associations observees) pour eviter de sur-interpreter un seul marqueur hors contexte.`
      );
    }
    lines.push("");
  }
  return lines.join("\n");
};

const ensureSourcesSection = (text: string): string => {
  if (!text) return "";
  if (/\n##\s+Sources\b/i.test(text)) {
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
  const candidates = ["## Plan d'action 90 jours", "## Plan 90 jours"];
  const starts = candidates.map((c) => text.indexOf(c)).filter((idx) => idx !== -1);
  const start = starts.length ? Math.min(...starts) : -1;
  if (start === -1) return "";
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
  if (text.includes("## Plan d'action 90 jours") || text.includes("## Plan 90 jours")) return text.trim();

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

const trimAiAnalysis = (text: string, maxChars = 100000): string => {
  if (!text) return "";
  const cleaned = stripEmojis(text).trim();
  if (cleaned.length <= maxChars) return cleaned;
  const sourcesIndex = (() => {
    const idxA = text.indexOf("## Sources (bibliotheque)");
    if (idxA !== -1) return idxA;
    return text.indexOf("## Sources scientifiques");
  })();
  const planIndex = (() => {
    const idxA = text.indexOf("## Plan d'action 90 jours");
    if (idxA !== -1) return idxA;
    return text.indexOf("## Plan 90 jours");
  })();
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

let bloodAnthropicClient: Anthropic | null = null;
function getBloodAnthropicClient(): Anthropic {
  if (!bloodAnthropicClient) {
    if (!validateAnthropicConfig()) {
      throw new Error("ANTHROPIC_API_KEY not configured");
    }
    bloodAnthropicClient = new Anthropic({ apiKey: ANTHROPIC_CONFIG.ANTHROPIC_API_KEY });
  }
  return bloodAnthropicClient;
}

const normalizeForCheck = (text: string) =>
  String(text || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const AXES_CANONICAL_HEADINGS = [
  "### Axe 1 — Potentiel musculaire & androgenes",
  "### Axe 2 — Metabolisme & gestion du risque diabete",
  "### Axe 3 — Lipides & risque cardio-metabolique",
  "### Axe 4 — Thyroide & depense energetique",
  "### Axe 5 — Foie, bile & detox metabolique",
  "### Axe 6 — Rein, hydratation & performance",
  "### Axe 7 — Inflammation, immunite & terrain",
  "### Axe 8 — Hematologie, oxygenation & endurance",
  "### Axe 9 — Micronutriments (vitamines & mineraux)",
  "### Axe 10 — Electrolytes, crampes, pression & performance",
  "### Axe 11 — Stress, sommeil, recuperation (si donnees)",
];

export const ensureAxesSectionTemplate = (fullText: string): string => {
  if (!fullText) return fullText;
  const sections = parseH2Sections(fullText);
  const axes = findSection(sections, ["Lecture compartimentee par axes", "Analyse par axe", "Analyse par axes"]);
  if (!axes) return fullText;

  const axesTitleNorm = normalizeForCheck(axes.title);
  const cleanedSections = sections.map((section) => {
    if (normalizeForCheck(section.title) === axesTitleNorm) return section;
    // If an axis heading leaked into another H2 section, keep text but demote heading markup.
    const cleaned = section.content.replace(/^###\s+(Axe\s+\d+\b[^\n]*)/gim, "$1");
    return { ...section, content: cleaned };
  });

  const cleanedAxes = cleanedSections.find((s) => normalizeForCheck(s.title) === axesTitleNorm) || axes;
  const normalizedAxes = normalizeForCheck(cleanedAxes.content || "");
  const missing = AXES_CANONICAL_HEADINGS.filter((h) => !normalizedAxes.includes(normalizeForCheck(h)));
  if (missing.length === 0) {
    return cleanedSections.map((s) => s.content.trim()).join("\n\n").trim() + "\n";
  }

  const additions = missing
    .map(
      (heading) =>
        `${heading}\n\nNon renseigne pour ce dossier a ce stade. Je garde cet axe visible pour conserver une lecture complete et je te recommande de le confirmer au prochain retest avec les marqueurs associes.`
    )
    .join("\n\n");

  const merged = `${cleanedAxes.content.trim()}\n\n${additions}`.trim();
  const rebuilt = replaceH2Section(cleanedSections.map((s) => s.content.trim()).join("\n\n").trim(), cleanedAxes.title, merged);
  return rebuilt;
};

export const sanitizeBloodReportRegister = (text: string): string => {
  if (!text) return text;
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

  for (const r of replacements) {
    out = out.replace(r.pattern, r.value);
  }

  // Hide citation tags in the client-facing report while still using knowledge context upstream.
  out = out.replace(/\s*\[SRC:[^\]]+\]\s*/g, " ");

  // Do not expose raw source bibliography section in the client-facing report.
  out = out.replace(/\n##\s+Sources[^\n]*[\s\S]*$/i, "");

  // Normalize misplaced axis headings: they must be H3 under the axis section.
  out = out.replace(/^##\s+(Axe\s+\d+\b[^\n]*)/gim, "### $1");

  // Clean whitespace artifacts introduced by replacements.
  out = out
    .replace(/[ \t]{2,}/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return out;
};

const validateBloodAnalysisReport = (output: string) => {
  const normalized = normalizeForCheck(output);

  const required: Array<{ id: string; checks: string[] }> = [
    { id: "synthese", checks: ["## synthese executive"] },
    { id: "qualite", checks: ["## qualite des donnees", "## qualite"] },
    { id: "dashboard", checks: ["## tableau de bord"] },
    { id: "potentiel", checks: ["## potentiel recomposition"] },
    { id: "axes", checks: ["## lecture compartimentee par axes", "## analyse par axe", "## analyse par axes"] },
    { id: "interconnexions", checks: ["## interconnexions majeures"] },
    { id: "deep_dive", checks: ["## deep dive"] },
    { id: "plan90", checks: ["## plan d'action 90 jours", "## plan d action 90 jours", "## plan 90 jours"] },
    { id: "nutrition", checks: ["## nutrition"] },
    { id: "supplements", checks: ["## supplements"] },
    { id: "annexes", checks: ["## annexes"] },
  ];

  const missing = required
    .filter((r) => !r.checks.some((c) => normalized.includes(c)))
    .map((r) => r.id);

  // Axes: all Axe 1..11 must exist as actual H3 headings.
  const axesOk = Array.from({ length: 11 }, (_, idx) => idx + 1).every((n) =>
    new RegExp(`^###\\s+Axe\\s+${n}\\b`, "mi").test(output)
  );
  if (!axesOk) missing.push("axes_subsections");

  const headings = (output.match(/^##\s+/gm) || []).length;
  if (headings < 11) missing.push("headings_count");

  if (/[\p{Extended_Pictographic}\uFE0F]/gu.test(output)) missing.push("emoji_present");

  return { ok: missing.length === 0, missing };
};

type H2Section = { title: string; content: string };

const parseH2Sections = (text: string): H2Section[] => {
  if (!text) return [];
  const lines = text.split("\n");
  const sections: H2Section[] = [];
  let current: H2Section | null = null;
  for (const line of lines) {
    if (line.startsWith("## ")) {
      if (current) sections.push(current);
      const title = line.slice(3).trim();
      current = { title, content: line + "\n" };
      continue;
    }
    if (current) current.content += line + "\n";
  }
  if (current) sections.push(current);
  return sections;
};

const findSection = (sections: H2Section[], includesAny: string[]): H2Section | null => {
  const keys = includesAny.map((k) => normalizeForCheck(k));
  for (const section of sections) {
    const title = normalizeForCheck(section.title);
    if (keys.some((k) => title.includes(k))) return section;
  }
  return null;
};

const auditSectionMinimums = (output: string) => {
  const sections = parseH2Sections(output);
  const issues: string[] = [];

  const minChars: Record<string, number> = {
    synthese: 7000,
    qualite: 3500,
    dashboard: 3500,
    axes: 9000,
    deep_dive: 9000,
    plan90: 7000,
    nutrition: 4500,
    supplements: 6000,
    annexes: 4500,
  };

  const synthese = findSection(sections, ["Synthese"]);
  const qualite = findSection(sections, ["Qualite"]);
  const dashboard = findSection(sections, ["Tableau de bord"]);
  const axes = findSection(sections, ["Lecture compartimentee par axes", "Analyse par axe"]);
  const deepDive = findSection(sections, ["Deep dive"]);
  const plan90 = findSection(sections, ["Plan d'action 90 jours", "Plan 90 jours"]);
  const nutrition = findSection(sections, ["Nutrition"]);
  const supplements = findSection(sections, ["Supplements", "Suppléments"]);
  const annexes = findSection(sections, ["Annexes"]);

  const checkLen = (id: keyof typeof minChars, section: H2Section | null) => {
    if (!section) {
      issues.push(`missing_section:${id}`);
      return;
    }
    if ((section.content || "").trim().length < minChars[id]) {
      issues.push(`short_section:${id}`);
    }
  };

  checkLen("synthese", synthese);
  checkLen("qualite", qualite);
  checkLen("dashboard", dashboard);
  checkLen("axes", axes);
  checkLen("deep_dive", deepDive);
  checkLen("plan90", plan90);
  checkLen("nutrition", nutrition);
  checkLen("supplements", supplements);
  checkLen("annexes", annexes);

  const countMatches = (text: string, pattern: RegExp) => (text.match(pattern) || []).length;

  if (nutrition) {
    const body = normalizeForCheck(nutrition.content || "");
    const nutritionSignals = countMatches(
      body,
      /\b(proteines|glucides|lipides|fibres|entrainement|training|cardio|zone 2|hiit|deload|neat|sommeil|recuperation)\b/g
    );
    const timingSignals = countMatches(body, /\b(matin|soir|avant|apres|pre|post|jours|semaine|j\+\d+)\b/g);
    const quantifiedSignals = countMatches(body, /\b\d+(?:[.,]\d+)?\s?(g|kg|h|heures|min|jours|semaines|kcal)\b/g);
    if (nutritionSignals < 16 || timingSignals < 10 || quantifiedSignals < 8) {
      issues.push("low_specificity:nutrition");
    }
  }

  if (supplements) {
    const body = normalizeForCheck(supplements.content || "");
    const dosageSignals = countMatches(body, /\b\d+(?:[.,]\d+)?\s?(mg|g|mcg|ug|iu|ui|ml)\b/g);
    const timingSignals = countMatches(body, /\b(matin|soir|coucher|avant|apres|repas|jeuner|a jeun)\b/g);
    const cautionSignals = countMatches(body, /\b(interaction|precaution|contre[- ]?indication|surveillance|retest|duree)\b/g);
    const paragraphCount = (supplements.content || "")
      .split(/\n\s*\n/g)
      .map((p) => p.trim())
      .filter(Boolean).length;
    if (dosageSignals < 10 || timingSignals < 8 || cautionSignals < 6 || paragraphCount < 8) {
      issues.push("low_specificity:supplements");
    }
  }

  return { issues, sections };
};

const auditStyleIssues = (output: string) => {
  const sections = parseH2Sections(output);
  const issues: string[] = [];
  const sectionHits: Record<string, string[]> = {};

  const addHit = (title: string, issue: string) => {
    if (!sectionHits[title]) sectionHits[title] = [];
    sectionHits[title].push(issue);
  };

  const normalized = normalizeForCheck(output);

  // Common "low quality / non premium" phrases we want to eliminate reliably.
  const bannedPhrases: Array<{ id: string; pattern: RegExp }> = [
    { id: "je_vais_etre_direct", pattern: /\bje vais etre direct\b/ },
    { id: "franchement", pattern: /\bfranchement\b/ },
    { id: "ecoute", pattern: /\becoute\b/ },
    { id: "mec", pattern: /\bmec\b/ },
    { id: "putain", pattern: /\bputain\b/ },
    { id: "bordel", pattern: /\bbordel\b/ },
    { id: "c_est_nul", pattern: /\bc est nul\b/ },
  ];

  // Medical/impersonal voice patterns that break the "incarne" style.
  const impersonal: Array<{ id: string; pattern: RegExp }> = [
    { id: "le_patient", pattern: /\ble patient\b/ },
    { id: "la_patiente", pattern: /\bla patiente\b/ },
    { id: "on_observe", pattern: /\bon observe\b/ },
    { id: "il_est_recommande", pattern: /\bil est recommande\b/ },
    { id: "il_convient_de", pattern: /\bil convient de\b/ },
    { id: "il_est_conseille", pattern: /\bil est conseille\b/ },
  ];

  // Global checks
  if (/^\s*[-*]\s+/m.test(output) || /^\s*\d+\.\s+/m.test(output)) {
    issues.push("bullets_present");
  }
  if (impersonal.some((p) => p.pattern.test(normalized))) {
    issues.push("impersonal_tone");
  }
  if (bannedPhrases.some((p) => p.pattern.test(normalized))) {
    issues.push("banned_phrase_present");
  }

  // Section attribution for targeted rewrites
  for (const s of sections) {
    const sNorm = normalizeForCheck(s.content || "");
    for (const p of bannedPhrases) {
      if (p.pattern.test(sNorm)) addHit(s.title, `banned_phrase:${p.id}`);
    }
    for (const p of impersonal) {
      if (p.pattern.test(sNorm)) addHit(s.title, `impersonal:${p.id}`);
    }
    if (/^\s*[-*]\s+/m.test(s.content || "") || /^\s*\d+\.\s+/m.test(s.content || "")) {
      addHit(s.title, "bullets_present");
    }
  }

  // Accent heuristics (best-effort). Not perfect, but catches "sans accents" reports.
  const accentPairs: Array<[string, string]> = [
    ["etre", "être"],
    ["tres", "très"],
    ["ca", "ça"],
    ["deja", "déjà"],
    ["meme", "même"],
    ["eleve", "élevé"],
    ["elevee", "élevée"],
    ["negligeable", "négligeable"],
  ];
  let accentMisses = 0;
  for (const [plain, accented] of accentPairs) {
    if (plain === accented) continue;
    const plainCount = (output.match(new RegExp(`\\b${plain}\\b`, "gi")) || []).length;
    const accentCount = (output.match(new RegExp(`\\b${accented}\\b`, "g")) || []).length;
    if (plainCount >= 4 && accentCount === 0) accentMisses++;
  }
  if (accentMisses >= 2) issues.push("missing_accents_suspected");

  return { issues, sectionHits };
};

const auditBloodReportAllIssues = (aiReport: string) => {
  const base = auditSectionMinimums(aiReport || "");
  const style = auditStyleIssues(aiReport || "");
  const merged = Array.from(new Set([...base.issues, ...style.issues]));
  return { issues: merged, sections: base.sections, style };
};

// Exposed for admin/meta refresh (no AI calls).
export const auditBloodReportQualityForMeta = (aiReport: string) => {
  return auditBloodReportAllIssues(aiReport || "").issues;
};

const replaceH2Section = (fullText: string, targetTitle: string, replacementSection: string): string => {
  if (!fullText || !targetTitle || !replacementSection) return fullText;
  const sections = parseH2Sections(fullText);
  const titleNorm = normalizeForCheck(targetTitle);

  const rebuilt: string[] = [];
  let replaced = false;
  for (const s of sections) {
    if (!replaced && normalizeForCheck(s.title) === titleNorm) {
      rebuilt.push(replacementSection.trim());
      replaced = true;
      continue;
    }
    rebuilt.push(s.content.trim());
  }
  // If we couldn't find the section, append at the end (best-effort).
  if (!replaced) rebuilt.push(replacementSection.trim());
  return rebuilt.filter(Boolean).join("\n\n").trim() + "\n";
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
  }
): string {
  const statusLabel = (status: MarkerStatus) =>
    status === "critical" ? "CRITIQUE" : status === "suboptimal" ? "IMPORTANT" : status === "optimal" ? "OPTIMISATION" : "NORMAL";

  const fmt = (value: unknown) => {
    if (value === null || value === undefined) return "Non renseigne";
    const txt = String(value).trim();
    return txt.length ? txt : "Non renseigne";
  };

  const formatMarkerTable = (markers: MarkerAnalysis[]): string => {
    if (!markers.length) return "| - | - | - | - | - |\n";
    return markers
      .map((m) => {
        const status = statusLabel(m.status);
        return `| ${m.name} | ${m.value} ${m.unit || ""} | ${m.normalRange || "N/A"} | ${m.optimalRange || "N/A"} | ${status} |`;
      })
      .join("\n");
  };

  const critical = analysisResult.markers.filter((m) => m.status === "critical");
  const suboptimal = analysisResult.markers.filter((m) => m.status === "suboptimal");
  const priorities = [...critical, ...suboptimal];

  const testedIds = new Set(analysisResult.markers.map((m) => m.markerId));
  const criticalMissing = ["testosterone_total", "cortisol", "tsh", "t3_libre", "vitamine_d", "hba1c", "ferritine", "crp_us"].filter(
    (id) => !testedIds.has(id)
  );

  const followUp = analysisResult.followUp.map((item) => `- ${item.test}: ${item.delay} - ${item.objective}`);
  const alerts = analysisResult.alerts.map((a) => `- ${a}`);

  const axisMarkers = {
    axe1: analysisResult.markers.filter((m) =>
      ["testosterone_total", "testosterone_libre", "shbg", "estradiol", "lh", "fsh", "prolactine", "dhea_s", "igf1"].includes(m.markerId)
    ),
    axe2: analysisResult.markers.filter((m) =>
      ["glycemie_jeun", "hba1c", "insuline_jeun", "homa_ir", "triglycerides", "acide_urique"].includes(m.markerId)
    ),
    axe3: analysisResult.markers.filter((m) =>
      ["cholesterol_total", "hdl", "ldl", "triglycerides", "apob", "lpa"].includes(m.markerId)
    ),
    axe4: analysisResult.markers.filter((m) =>
      ["tsh", "t4_libre", "t3_libre", "t3_reverse", "anti_tpo"].includes(m.markerId)
    ),
    axe5: analysisResult.markers.filter((m) =>
      ["alt", "ast", "ggt", "bilirubine", "albumine", "phosphatases_alcalines"].includes(m.markerId)
    ),
    axe6: analysisResult.markers.filter((m) =>
      ["creatinine", "uree", "egfr", "cystatine_c", "sodium", "potassium"].includes(m.markerId)
    ),
    axe7: analysisResult.markers.filter((m) =>
      ["crp_us", "homocysteine", "fibrinogene", "ferritine", "vs"].includes(m.markerId)
    ),
    axe8: analysisResult.markers.filter((m) =>
      ["hemoglobine", "hematocrite", "vgm", "tcmh", "plaquettes", "globules_blancs"].includes(m.markerId)
    ),
    axe9: analysisResult.markers.filter((m) =>
      ["vitamine_d", "b12", "folate", "fer_serique", "ferritine", "transferrine_sat", "zinc", "magnesium_rbc", "selenium"].includes(m.markerId)
    ),
    axe10: analysisResult.markers.filter((m) =>
      ["sodium", "potassium", "chlore", "calcium", "phosphore", "magnesium"].includes(m.markerId)
    ),
    axe11: analysisResult.markers.filter((m) => ["cortisol", "dhea_s"].includes(m.markerId)),
  };

  const sections: string[] = [];

  sections.push("## Synthese executive\n");
  sections.push(`- Critiques: ${critical.length}\n- Importants: ${suboptimal.length}\n`);
  if (priorities.length) {
    sections.push("\nPriorites:");
    priorities.slice(0, 8).forEach((m) => sections.push(`- ${statusLabel(m.status)}: ${m.name}`));
  }
  if (alerts.length) {
    sections.push("\nVigilance:");
    sections.push(alerts.join("\n"));
  }
  sections.push("\n---\n");

  sections.push("## Qualite des donnees & limites\n");
  sections.push(
    [
      `- Jeune: ${typeof userProfile.fastingHours === "number" ? `${userProfile.fastingHours} h` : "Non renseigne"}`,
      `- Heure de prelevement: ${fmt(userProfile.drawTime)}`,
      `- Dernier entrainement: ${fmt(userProfile.lastTraining)}`,
      `- Alcool (72h): ${fmt(userProfile.alcoholLast72h)}`,
      `- Infection recente: ${fmt(userProfile.infectionRecent)}`,
      `- Notes: sommeil, stress, hydratation et activite 48h avant peuvent modifier l'interpretation.`,
    ].join("\n")
  );
  if (criticalMissing.length) {
    sections.push("\nMarqueurs manquants critiques (a ajouter):");
    criticalMissing.forEach((id) => sections.push(`- ${id}`));
  } else {
    sections.push("\nMarqueurs manquants critiques: aucun detecte.");
  }
  sections.push("\n---\n");

  sections.push("## Tableau de bord (scores & priorites)\n");
  sections.push(`- Total marqueurs: ${analysisResult.markers.length}\n- A surveiller: ${analysisResult.summary.watch.length}\n- Action: ${analysisResult.summary.action.length}\n`);
  sections.push("\n---\n");

  sections.push("## Potentiel recomposition (perte de gras + gain de muscle)\n");
  sections.push(
    "Priorite: solidifier sante metabolique + recuperation, puis pousser progressivement volume/deficit. Si des freins sont presents (inflammation, energie, hormones), on les corrige d'abord.\n"
  );
  sections.push("\n---\n");

  sections.push("## Lecture compartimentee par axes\n");
  const pushAxis = (title: string, markers: MarkerAnalysis[]) => {
    sections.push(`### ${title}\n`);
    if (!markers.length) {
      sections.push("Non renseigne (aucun marqueur de cet axe dans ce bilan).\n");
      return;
    }
    sections.push("| Marqueur | Valeur | Range labo | Range optimal | Statut |");
    sections.push("|---|---|---|---|---|");
    sections.push(formatMarkerTable(markers));
    sections.push("");
  };
  pushAxis("Axe 1 — Potentiel musculaire & androgenes", axisMarkers.axe1);
  pushAxis("Axe 2 — Metabolisme & gestion du risque diabete", axisMarkers.axe2);
  pushAxis("Axe 3 — Lipides & risque cardio-metabolique", axisMarkers.axe3);
  pushAxis("Axe 4 — Thyroide & depense energetique", axisMarkers.axe4);
  pushAxis("Axe 5 — Foie, bile & detox metabolique", axisMarkers.axe5);
  pushAxis("Axe 6 — Rein, hydratation & performance", axisMarkers.axe6);
  pushAxis("Axe 7 — Inflammation, immunite & terrain", axisMarkers.axe7);
  pushAxis("Axe 8 — Hematologie, oxygenation & endurance", axisMarkers.axe8);
  pushAxis("Axe 9 — Micronutriments (vitamines & mineraux)", axisMarkers.axe9);
  pushAxis("Axe 10 — Electrolytes, crampes, pression & performance", axisMarkers.axe10);
  pushAxis("Axe 11 — Stress, sommeil, recuperation (si donnees)", axisMarkers.axe11);
  sections.push("\n---\n");

  sections.push("## Interconnexions majeures (le pattern)\n");
  if (analysisResult.patterns.length) {
    analysisResult.patterns.slice(0, 10).forEach((p) => {
      sections.push(`- ${p.name}${p.causes?.length ? ` (causes possibles: ${p.causes.join(", ")})` : ""}`);
    });
  } else {
    sections.push("- Aucun pattern fort detecte.\n");
  }
  sections.push("\n---\n");

  sections.push("## Deep dive — marqueurs prioritaires (top 8 a 15)\n");
  priorities.slice(0, 10).forEach((m) => {
    sections.push(`### ${m.name}\n- Valeur: ${m.value} ${m.unit || ""}\n- Statut: ${statusLabel(m.status)}\n- Note: ${m.interpretation || "Non renseigne"}\n`);
  });
  if (!priorities.length) sections.push("Aucun marqueur prioritaire detecte.\n");
  sections.push("\n---\n");

  sections.push("## Plan d'action 90 jours (hyper concret)\n");
  sections.push("### Jours 1-14 (Stabilisation)\n- Stabiliser sommeil, hydratation, regularite des repas.\n- Eviter alcool et entrainement tres intense 48h avant retest.\n");
  sections.push("### Jours 15-30 (Phase d'Attaque)\n- Appliquer les corrections sur les marqueurs CRITIQUES/IMPORTANTS.\n");
  sections.push("### Jours 31-60 (Consolidation)\n- Iterer nutrition/entrainement selon energie/recuperation.\n");
  sections.push("### Jours 61-90 (Optimisation)\n- Stabiliser et preparer le retest.\n");
  sections.push("### Retest & conditions de prelevement\n");
  sections.push(followUp.length ? followUp.join("\n") : "- Retest selon contexte.\n");
  sections.push("\n---\n");

  sections.push("## Nutrition & entrainement (traduction pratique)\n");
  sections.push(
    "- Nutrition: proteines suffisantes, fibres, qualite des lipides, glucides periodises autour du training.\n- Entrainement: volume progressif, deload si fatigue/inflammation, NEAT quotidien.\n"
  );
  sections.push("\n---\n");

  sections.push("## Supplements & stack (minimaliste mais impact)\n");
  sections.push(
    [
      "- Base (si tolere): omega-3, magnesium, vitamine D (si basse), creatine monohydrate.",
      "- Lipides (si LDL/ApoB hauts): fibres solubles (psyllium), phytosterols; bergamote possible (prudence si traitement).",
      "- Glycemie (si HOMA-IR/insuline/HbA1c hauts): marche post-prandiale; berberine possible (prudence interactions).",
      "- Inflammation (si CRP-us/homocysteine hauts): omega-3 + sommeil + gestion stress; B-vitamines si homocysteine elevee selon contexte.",
      "",
      "Precautions: si tu as des traitements ou antecedents, on valide chaque supplement (interactions possibles).",
    ].join("\n")
  );
  sections.push("\n---\n");

  sections.push("## Annexes (ultra long)\n");
  sections.push("### Annex A — Marqueurs secondaires (lecture rapide)\n");
  analysisResult.markers.slice(0, 60).forEach((m) => {
    sections.push(`- ${m.name}: ${m.value} ${m.unit || ""} (${statusLabel(m.status)})`);
  });
  sections.push("\n### Annex B — Hypotheses & tests de confirmation\n");
  sections.push("- Hypotheses: a confirmer par retest + contexte (prelevement, sommeil, alcool, infection, training).\n");
  if (criticalMissing.length) sections.push(`- Tests a ajouter: ${criticalMissing.join(", ")}`);
  sections.push("\n### Annex C — Glossaire utile\n");
  sections.push("- Range labo: reference population generale.\n- Range optimal: cible performance (contextuelle).\n- CRP-us: inflammation de bas grade.\n");
  sections.push("\n---\n");

  sections.push("## Sources (bibliotheque)\n");
  sections.push(buildSourcesSection());

  return trimAiAnalysis(sections.join("\n"));
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
): Promise<{ report: string; status: "generated" | "fallback"; model: string; validationMissing?: string[] }> {
  let client: ReturnType<typeof getBloodAnthropicClient>;
  try {
    client = getBloodAnthropicClient();
  } catch (initErr: any) {
    console.error("[BloodAnalysis] Anthropic client init failed:", initErr?.message || initErr);
    return {
      report: buildFallbackAnalysis(analysisResult, userProfile),
      status: "fallback",
      model: "fallback",
      validationMissing: [`init_error:${String(initErr?.message || initErr).slice(0, 200)}`],
    };
  }

  const markersTable = analysisResult.markers
    .map(
      (m) =>
        `- ${m.name} [${m.markerId}] (${MARKER_CATEGORY_MAP[m.markerId] || "Autre"}) : ${m.value} ${m.unit} (Normal: ${m.normalRange}, Optimal: ${m.optimalRange}) -> ${String(
          m.status || ""
        ).toUpperCase()}${m.interpretation ? ` | Note: ${m.interpretation}` : ""}`
    )
    .join("\n");

  const patternsText = analysisResult.patterns
    .map((p) => `- ${p.name}${p.causes?.length ? ` (causes possibles: ${p.causes.join(", ")})` : ""}`)
    .join("\n");

  const bmi =
    typeof userProfile.poids === "number" && typeof userProfile.taille === "number" && userProfile.taille > 0
      ? (userProfile.poids / Math.pow(userProfile.taille / 100, 2)).toFixed(1)
      : "Non renseigne";

  const lifestyleLine = `Sommeil: ${userProfile.sleepHours ?? "Non renseigne"} h/nuit | Training: ${userProfile.trainingHours ?? "Non renseigne"} h/sem | Deficit: ${userProfile.calorieDeficit ?? "Non renseigne"}% | Alcool: ${userProfile.alcoholWeekly ?? "Non renseigne"} verres/sem | Stress: ${userProfile.stressLevel ?? "Non renseigne"}/10 | Poids: ${userProfile.poids ?? "Non renseigne"} kg | Taille: ${userProfile.taille ?? "Non renseigne"} cm | IMC: ${bmi}`;

  const deepDivePayload = await getBiomarkerDeepDiveContext(analysisResult.markers, {
    prenom: userProfile.prenom,
    nom: userProfile.nom,
    age: userProfile.age,
  });
  const deepDiveContext = deepDivePayload.context ? deepDivePayload.context.slice(0, 14000) : "";
  const knowledgeContextTrimmed = knowledgeContext ? knowledgeContext.slice(0, 14000) : "";

  const basePrompt = [
    `Analyse ce bilan sanguin pour ${userProfile.prenom ? userProfile.prenom : "le client"} (${userProfile.gender} ${userProfile.age || ""}).`,
    `Objectifs: ${userProfile.objectives || "Performance et sante"}`,
    `Medicaments: ${userProfile.medications || "Non renseigne"}`,
    `Lifestyle: ${lifestyleLine}`,
    ``,
    `MARQUEURS (verite d'entree, ne reinvente rien):`,
    markersTable || "- Aucun",
    ``,
    `PATTERNS DETECTES:`,
    patternsText || "- Aucun",
    ``,
    `RESUME:`,
    `- Optimal: ${analysisResult.summary.optimal.join(", ") || "Aucun"}`,
    `- A surveiller: ${analysisResult.summary.watch.join(", ") || "Aucun"}`,
    `- Action requise: ${analysisResult.summary.action.join(", ") || "Aucun"}`,
    ``,
    deepDiveContext ? `DEEP DIVE - DONNEES & SOURCES PAR BIOMARQUEUR:\n${deepDiveContext}` : "",
    knowledgeContextTrimmed ? `CONTEXTE SCIENTIFIQUE (chunks; cite seulement les IDs fournis):\n${knowledgeContextTrimmed}` : "",
    ``,
    `CONTRAINTES DE SORTIE:`,
    `- Output en Markdown.`,
    `- Tu dois produire un rapport COMPLET avec TOUTES les sections/titres dans l'ordre EXACT defini par le system prompt (## / ###).`,
    `- Pas d'emoji.`,
    `- AUCUN tag de citation visible (pas de [SRC:...], pas de section "Sources").`,
    `- AUCUNE liste a puces ni numerotee. Pas de '-', pas de '*', pas de '1.' en debut de ligne.`,
    `- Section "Supplements & stack" obligatoire: ultra detaillee, explicative, mecanismes, dosages, timing, duree, interactions et conditions de retest.`,
    `- Section "Nutrition & entrainement" obligatoire: plan narratif concret et progressif, avec logique physiologique explicite.`,
    `- Si une info manque: ecris "Non renseigne" et baisse le niveau de confiance.`,
    `- Pas de diagnostic definitif, pas de prescription medicamenteuse, pas de protocole dopage/injectables.`,
  ]
    .filter(Boolean)
    .join("\n");

  const model = ANTHROPIC_CONFIG.ANTHROPIC_MODEL || "claude-opus-4-6";
  // Keep output bounded to avoid long-running requests in production.
  // Prioritise completeness/structure over extreme length.
  const maxTokens = 16000;

  const CANONICAL_ORDER = [
    "## Synthese executive",
    "## Qualite des donnees & limites",
    "## Tableau de bord (scores & priorites)",
    "## Potentiel recomposition (perte de gras + gain de muscle)",
    "## Lecture compartimentee par axes",
    "### Axe 1 — Potentiel musculaire & androgenes",
    "### Axe 2 — Metabolisme & gestion du risque diabete",
    "### Axe 3 — Lipides & risque cardio-metabolique",
    "### Axe 4 — Thyroide & depense energetique",
    "### Axe 5 — Foie, bile & detox metabolique",
    "### Axe 6 — Rein, hydratation & performance",
    "### Axe 7 — Inflammation, immunite & terrain",
    "### Axe 8 — Hematologie, oxygenation & endurance",
    "### Axe 9 — Micronutriments (vitamines & mineraux)",
    "### Axe 10 — Electrolytes, crampes, pression & performance",
    "### Axe 11 — Stress, sommeil, recuperation (si donnees)",
    "## Interconnexions majeures (le pattern)",
    "## Deep dive — marqueurs prioritaires (top 8 a 15)",
    "## Plan d'action 90 jours (hyper concret)",
    "## Nutrition & entrainement (traduction pratique)",
    "## Supplements & stack (minimaliste mais impact)",
    "## Annexes (ultra long)",
    "### Annex A — Marqueurs secondaires (lecture rapide)",
    "### Annex B — Hypotheses & tests de confirmation",
    "### Annex C — Glossaire utile",
  ];

  const stripSourcesFromReport = (text: string) => {
    const idx = text.search(/\n##\s+Sources\b/i);
    if (idx === -1) return text.trim();
    return text.slice(0, idx).trim();
  };

  const extractFromFirstH2 = (text: string) => {
    const idx = text.indexOf("## ");
    if (idx === -1) return text.trim();
    return text.slice(idx).trim();
  };

  /** Extract a fuzzy dedup key from a section title: first 3 significant words */
  const dedupKey = (title: string): string => {
    const normalized = normalizeForCheck(title)
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    const stopWords = new Set(["de", "des", "du", "le", "la", "les", "et", "en", "par", "a", "au", "aux", "si", "mais", "ou"]);
    const words = normalized.split(" ").filter(w => w.length > 1 && !stopWords.has(w));
    return words.slice(0, 3).join("_");
  };

  /** Deduplicate ## sections: keep first occurrence of each normalized title */
  const deduplicateSections = (text: string): string => {
    const lines = text.split("\n");
    const result: string[] = [];
    const seenH2s = new Set<string>();
    let skipUntilNextH2 = false;

    const checkH2 = (title: string): boolean => {
      const key = dedupKey(title);
      if (seenH2s.has(key)) {
        console.log(`[BloodAnalysis] Dedup: removing duplicate section '${title}' (key: ${key})`);
        return true; // duplicate
      }
      seenH2s.add(key);
      return false;
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const h2Match = line.match(/^## (.+)/);
      if (h2Match) {
        if (checkH2(h2Match[1])) {
          skipUntilNextH2 = true;
          continue;
        }
        skipUntilNextH2 = false;
      } else if (skipUntilNextH2) {
        if (line.match(/^## /)) {
          const newH2 = line.match(/^## (.+)/);
          if (newH2 && checkH2(newH2[1])) {
            continue;
          }
          skipUntilNextH2 = false;
        } else {
          continue; // skip content of duplicate section
        }
      }
      if (!skipUntilNextH2) {
        result.push(line);
      }
    }
    return result.join("\n").trim();
  };

  const firstMissingHeading = (text: string): string | null => {
    const normalized = normalizeForCheck(text);
    for (const heading of CANONICAL_ORDER) {
      const key = normalizeForCheck(heading);
      if (!normalized.includes(key)) return heading;
    }
    return null;
  };

  const callClaudeOnce = async (prompt: string, opts?: { system?: string }) => {
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

    const withTimeout = <T,>(p: Promise<T>, ms: number): Promise<T> =>
      Promise.race([
        p,
        new Promise<T>((_, reject) => setTimeout(() => reject(new Error("CLAUDE_TIMEOUT")), ms)),
      ]);

    const isRetryable = (err: any) => {
      const status = Number(err?.status || err?.statusCode || err?.response?.status);
      const msg = String(err?.message || err || "");
      if (status === 429 || status === 500 || status === 529) return true;
      if (/overloaded|rate limit|timeout|ECONNRESET|ETIMEDOUT/i.test(msg)) return true;
      if (msg.includes("CLAUDE_TIMEOUT")) return true;
      return false;
    };

    const MAX_ATTEMPTS = 2;
    const TIMEOUT_MS = 600_000;

    let lastErr: unknown = null;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        const streamPromise = async () => {
          const stream = client.messages.stream({
            model,
            max_tokens: maxTokens,
            temperature: 0.4,
            system: opts?.system || BLOOD_ANALYSIS_SYSTEM_PROMPT_V6,
            messages: [{ role: "user", content: prompt }],
          } as any);
          const finalMessage = await stream.finalMessage();
          const textContent = (finalMessage as any).content?.find((c: any) => c.type === "text");
          return String(textContent?.text || "").trim();
        };

        const candidate = await withTimeout(streamPromise(), TIMEOUT_MS);
        if (!candidate) throw new Error("Claude returned empty report");
        return sanitizeBloodReportRegister(stripEmojis(candidate)).trim();
      } catch (err: any) {
        lastErr = err;
        if (attempt < MAX_ATTEMPTS && isRetryable(err)) {
          const backoff = attempt === 1 ? 1500 : 3500;
          console.warn(`[BloodAnalysis] Claude retry ${attempt}/${MAX_ATTEMPTS - 1} after error:`, err?.message || err);
          await sleep(backoff);
          continue;
        }
        throw err;
      }
    }

    throw lastErr instanceof Error ? lastErr : new Error("Claude failed");
  };

  let output = "";
  let validation = { ok: false, missing: ["no_attempt"] as string[] };
  let qualityIssues: string[] = [];

  const SECTION_REWRITE_SYSTEM = `Tu es un expert en lecture de bilan sanguin.\n\nMISSION:\n- Tu REECRIS UNE SEULE section de rapport (Markdown) avec un titre '##' deja fourni.\n- Tu renvoies UNIQUEMENT cette section (du '##' jusqu'avant le prochain '##').\n\nREGLES STRICTES:\n- Francais impeccable (accents, orthographe), tutoiement.\n- Registre premium: calme, precis, jamais familier.\n- Interdiction: pas de \"mec\", pas de \"franchement\", pas de \"ecoute\", pas de \"je vais etre direct\", pas de vulgarites.\n- ZERO listes: pas de '- ', pas de '* ', pas de listes numerotees.\n- Pas d'emoji.\n- Tu n'inventes pas de donnees: si une info manque, ecris 'Non renseigne' en phrase.\n- Structure narrative: paragraphes fluides.\n`;

  const rewriteIfNeeded = async () => {
    const audit = auditBloodReportAllIssues(output);
    qualityIssues = audit.issues.slice();
    if (qualityIssues.length === 0) return;

    const pickTitle = (key: string): string | null => {
      const sections = audit.sections;
      if (key === "synthese") return findSection(sections, ["Synthese"])?.title || null;
      if (key === "qualite") return findSection(sections, ["Qualite"])?.title || null;
      if (key === "dashboard") return findSection(sections, ["Tableau de bord"])?.title || null;
      if (key === "axes") return findSection(sections, ["Lecture compartimentee par axes", "Analyse par axe"])?.title || null;
      if (key === "deep_dive") return findSection(sections, ["Deep dive"])?.title || null;
      if (key === "plan90") return findSection(sections, ["Plan d'action 90 jours", "Plan 90"])?.title || null;
      if (key === "nutrition") return findSection(sections, ["Nutrition"])?.title || null;
      if (key === "supplements") return findSection(sections, ["Supplements", "Suppléments"])?.title || null;
      if (key === "annexes") return findSection(sections, ["Annexes"])?.title || null;
      return null;
    };

    const styleTargetTitles = Object.keys(audit.style.sectionHits || {});

    // Rewrite up to 4 sections per generation to keep runtime/cost bounded.
    // 1) Fix missing/short core sections
    // 2) Fix style violations where they happen (banned phrases, bullets, impersonal tone, missing accents)
    const needsRewrite = (key: string) =>
      qualityIssues.includes(`short_section:${key}`) ||
      qualityIssues.includes(`missing_section:${key}`) ||
      qualityIssues.includes(`low_specificity:${key}`);

    const targetsByKey = ["supplements", "nutrition", "deep_dive", "axes", "annexes", "plan90", "qualite", "dashboard", "synthese"].filter(
      (k) => needsRewrite(k)
    );

    if (qualityIssues.includes("low_specificity:supplements") && !targetsByKey.includes("supplements")) {
      targetsByKey.unshift("supplements");
    }
    if (qualityIssues.includes("low_specificity:nutrition") && !targetsByKey.includes("nutrition")) {
      targetsByKey.unshift("nutrition");
    }

    // If we suspect "sans accents" output or banned phrases globally, prioritise rewriting the opening sections.
    if (qualityIssues.includes("missing_accents_suspected") || qualityIssues.includes("banned_phrase_present")) {
      if (!targetsByKey.includes("synthese")) targetsByKey.unshift("synthese");
      if (!targetsByKey.includes("qualite")) targetsByKey.push("qualite");
    }

    const targets: Array<{ key?: string; title?: string }> = [];
    for (const k of targetsByKey) targets.push({ key: k });
    for (const t of styleTargetTitles) targets.push({ title: t });

    // Dedupe titles after resolving keys.
    const resolvedTitles: string[] = [];
    for (const item of targets) {
      const title =
        item.title ||
        (item.key ? pickTitle(item.key) : null) ||
        (item.key === "synthese" ? "Synthese executive" : null);
      if (!title) continue;
      const norm = normalizeForCheck(title);
      if (resolvedTitles.some((x) => normalizeForCheck(x) === norm)) continue;
      resolvedTitles.push(title);
      if (resolvedTitles.length >= 4) break;
    }

    for (const title of resolvedTitles) {
      const isSynthese = normalizeForCheck(title).includes("synthese");
      const isSupplements = normalizeForCheck(title).includes("supplements");
      const isNutrition = normalizeForCheck(title).includes("nutrition");
      const minChars = isSynthese ? 7000 : isSupplements ? 6500 : isNutrition ? 5200 : 3200;

      const rewritePrompt = [
        basePrompt,
        ``,
        `SECTION A REECRIRE:`,
        `## ${title}`,
        ``,
        `OBJECTIF:`,
        `- Minimum ${minChars} caracteres (hors espaces)`,
        `- Paragraphes narratifs uniquement`,
        `- Concrete: donne des exemples, conditions de prelevement, limites, retest, et implications pratiques`,
        `- Registre premium, accents, et suppression explicite de toute familiarite / vulgarite`,
        `- Interdiction de listes (pas de tirets, pas de bullets, pas de "1.")`,
        `- Interdiction absolue de tags [SRC:...] et de section Sources`,
        isSupplements
          ? `- Pour Supplements: minimum 6 interventions clairement detaillees avec forme, dosage, timing, duree, precautions/interactions et condition de retest.`
          : `-`,
        isNutrition
          ? `- Pour Nutrition: periodisation hebdo, logique physiologique, entrainement (volume/intensite/cardio/NEAT), recuperation et timelines concretes.`
          : `-`,
        `- Interdiction des formulations vagues: "optimiser", "a envisager", "en absence de biomarqueurs specifiques" sans details concrets.`,
        ``,
        `REGLES:`,
        `- Retourne UNIQUEMENT la section complete, en commencant EXACTEMENT par:`,
        `## ${title}`,
        `- Ne rajoute aucun autre '##' apres. Pas de commentaires.`,
      ]
        .filter((line) => line !== `-`)
        .join("\n");

      const rewritten = await callClaudeOnce(rewritePrompt, { system: SECTION_REWRITE_SYSTEM });
      if (rewritten && rewritten.includes("## ")) {
        const parsed = parseH2Sections(rewritten);
        const first = parsed[0]?.content?.trim();
        if (first) output = replaceH2Section(output, title, first);
      }
    }

    // Re-audit after rewrites
    qualityIssues = auditBloodReportAllIssues(output).issues.slice();
  };

  // Pass 1: full report
  try {
    output = await callClaudeOnce(
      `${basePrompt}\n\nPRIORITE ABSOLUE: genere un rapport COMPLET et DETAILLE (35000-70000 caracteres) avec TOUTES les sections/axes du template. Tu as un budget de 16000 tokens. REGLES CRITIQUES:\n1. La Synthese executive DOIT faire minimum 7000 caracteres — c'est la premiere chose que le client lit. Detaille CHAQUE marqueur problematique, explique les interconnexions, donne ton verdict global avec des chiffres precis.\n2. ZERO tiret, ZERO bullet point, ZERO liste a puces. Uniquement des paragraphes narratifs fluides. Pas de \"- \", pas de \"* \", pas de listes numerotees \"1. 2. 3.\".\n3. Les sections \"Nutrition & entrainement\" et \"Supplements & stack\" doivent etre ultra detaillees, pedagogiques et actionnables, avec mecanismes, dosages, timing, interactions et retest.\n4. Interdit de montrer les sources au client: pas de tags [SRC:...], pas de section Sources.\n5. Assure-toi d'inclure les 11 sections ## et tous les ### Axe 1 a 11.`
    );
    output = ensureAxesSectionTemplate(output);
    validation = validateBloodAnalysisReport(output);
    if (validation.ok) {
      await rewriteIfNeeded();
      const after = ensureAxesSectionTemplate(sanitizeBloodReportRegister(trimAiAnalysis(output)));
      const remaining = auditSectionMinimums(after).issues;
      return {
        report: after,
        status: "generated",
        model,
        ...(remaining.length ? { validationMissing: remaining } : {}),
      };
    }
  } catch (err: any) {
    console.error("[BloodAnalysis] Claude generation failed (pass1):", err?.message || err);
    validation.missing.push(`pass1_error:${String(err?.message || err).slice(0, 200)}`);
  }

  // Pass 2/3: continuation from first missing heading in canonical order
  for (let pass = 2; pass <= 3; pass++) {
    try {
      const next = firstMissingHeading(output) || "## Annexes (ultra long)";
      const continuationPrompt = [
        basePrompt,
        ``,
        `RAPPORT PARTIEL (ne pas repeter, tu dois CONTINUER):`,
        stripSourcesFromReport(output).slice(-12000),
        ``,
        `MISSION: ecris UNIQUEMENT la suite du rapport en commençant EXACTEMENT par:`,
        next,
        ``,
        `Puis continue en respectant l'ordre CANONIQUE jusqu'a terminer par:`,
        `## Annexes (ultra long)`,
        ``,
        `REGLES STRICTES:`,
        `- Aucun titre en '#'. Utilise uniquement '##' et '###' comme dans le template.`,
        `- Ne repete aucune section deja presente dans le rapport partiel.`,
        `- Si une section manque de donnees, ecris 'Non renseigne' mais garde le titre.`,
        `- Pas d'emoji.`,
        `- Pas de [SRC:...] ni de section Sources.`,
        `- ZERO tiret, ZERO bullet point, ZERO "- ", ZERO "* ", ZERO liste numerotee. Uniquement des paragraphes narratifs fluides.`,
        `- Pas de pattern "Label : valeur" en debut de ligne. Integre les informations dans des phrases completes.`,
      ].join("\n");

      const continuation = await callClaudeOnce(continuationPrompt);
      const merged = `${stripSourcesFromReport(output)}\n\n${extractFromFirstH2(continuation)}`.trim();
      output = deduplicateSections(merged);
      output = ensureAxesSectionTemplate(output);
      validation = validateBloodAnalysisReport(output);
      if (validation.ok) {
        await rewriteIfNeeded();
        const after = ensureAxesSectionTemplate(sanitizeBloodReportRegister(trimAiAnalysis(output)));
        const remaining = auditSectionMinimums(after).issues;
        return {
          report: after,
          status: "generated",
          model,
          ...(remaining.length ? { validationMissing: remaining } : {}),
        };
      }
      console.warn(`[BloodAnalysis] Continuation pass ${pass} still invalid:`, validation.missing.join(", "));
    } catch (err: any) {
      console.error(`[BloodAnalysis] Claude generation failed (pass${pass}):`, err?.message || err);
      validation.missing.push(`pass${pass}_error:${String(err?.message || err).slice(0, 200)}`);
    }
  }

  console.warn("[BloodAnalysis] Falling back to deterministic report:", validation.missing.join(", "));
  return {
    report: ensureAxesSectionTemplate(sanitizeBloodReportRegister(buildFallbackAnalysis(analysisResult, userProfile))),
    status: "fallback",
    model: "fallback",
    validationMissing: validation.missing,
  };
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
  const articles = await searchArticles(keywords, 6, [
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

  // Build context from articles
  const context = articles
    .map((article) => `${article.title}\n${article.content.substring(0, 1000)}...`)
    .join("\n\n---\n\n");

  return context;
}
