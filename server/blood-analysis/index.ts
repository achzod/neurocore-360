/**
 * NEUROCORE 360 - Blood Analysis System
 * Analyse de bilans sanguins avec ranges OPTIMAUX vs normaux
 * Sources: Examine, Peter Attia, Marek Health, Chris Masterjohn, RP, MPMD
 */

import Anthropic from "@anthropic-ai/sdk";
import { searchArticles, searchFullText } from "../knowledge/storage";

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
  markerId: string;
  value: number;
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
  status: "optimal" | "normal" | "suboptimal" | "critical";
  interpretation: string;
}

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
    if (!isPlausibleMarkerValue(item.markerId, item.value)) continue;
    unique.set(item.markerId, item);
  }
  for (const item of textExtracted) {
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
    const range = BIOMARKER_RANGES[input.markerId];
    if (!range) continue;

    // Skip gender-specific markers for wrong gender
    if (range.genderSpecific && range.genderSpecific !== userProfile.gender) continue;

    const status = getMarkerStatus(input.value, range);
    const analysis: MarkerAnalysis = {
      markerId: input.markerId,
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

const BLOOD_ANALYSIS_SYSTEM_PROMPT = `Tu es un expert en analyse de bilans sanguins oriente sante + performance + composition corporelle.

REGLES DE STYLE:
- Ton clinique, precis, premium, sans emojis.
- Pas de mention d'IA.
- Cite des sources scientifiques dans une section dediee.
- Liens PubMed autorises.
- Utilise les ranges optimaux en priorite.
- Reste structure, pedagogique, conversationnel.
- Adresse-toi directement au client avec "tu/ta/ton".
- Jamais "patient" ou "utilisateur".
- Ne fais pas d'hypotheses sur les ressentis. Utilise "symptomes associes" si besoin.
- Pas de repetition: chaque section apporte une information nouvelle.
- Longueur cible: 900-1200 mots, maximum 18 000 caracteres.
- Chaque recommandation contient: action + dosage + timing + duree + objectif.
- Si une donnee manque, dis-le clairement et continue.

FORMAT DE REPONSE (respecte STRICTEMENT les titres):
## Synthese executive
- Alertes prioritaires: [liste concise ou "Aucune"]
- Optimal: [liste concise]
- A surveiller: [liste concise]
- Action requise: [liste concise]
- Lecture globale: [4-6 phrases, ton clinique + performance]

## Alertes prioritaires (si critique)
- [Marqueur]: valeur + risque + action immediate (1-2 phrases)

## Lecture systeme par systeme
### Hormonal
- Lecture clinique & impact performance: [5-6 phrases]
- Protocole cle: [2-3 actions]
### Thyroide
- Lecture clinique & impact performance: [5-6 phrases]
- Protocole cle: [2-3 actions]
### Metabolique
- Lecture clinique & impact performance: [5-6 phrases]
- Protocole cle: [2-3 actions]
### Inflammation
- Lecture clinique & impact performance: [5-6 phrases]
- Protocole cle: [2-3 actions]
### Vitamines & mineraux
- Lecture clinique & impact performance: [5-6 phrases]
- Protocole cle: [2-3 actions]
### Foie & rein
- Lecture clinique & impact performance: [5-6 phrases]
- Protocole cle: [2-3 actions]

## Interconnexions majeures
- [Marqueur A] + [Marqueur B] -> [impact physiologique en 1-2 phrases]
- Donne 2 a 4 correlations maximum.

## Deep dive marqueurs prioritaires
Pour 6 marqueurs max (les plus critiques / sous-optimaux):
- Verdict (1 ligne)
- Ce que ca veut dire (3-4 phrases, factuel)
- Symptomes associes (1-2 phrases)
- Protocole exact (actions + dosages + timing + duree)

## Plan 90 jours
### Jours 1-30
- [action + dosage + timing + duree + objectif]
### Jours 31-90
- [action + dosage + timing + duree + objectif]

## Nutrition & entrainement
- Nutrition (3-5 phrases)
- Entrainement (3-5 phrases)

## Supplements & stack
- Liste 6-8 supplements MAX avec: dosage, timing, duree, objectif.

## Sources scientifiques
- 2-3 citations par panel (format: Titre (Journal, annee) + lien PubMed)`;

const trimAiAnalysis = (text: string, maxChars = 18000): string => {
  if (!text) return "";
  if (text.length <= maxChars) return text.trim();
  const sliced = text.slice(0, maxChars);
  const lastBreak = sliced.lastIndexOf("\n\n");
  if (lastBreak > 1000) {
    return sliced.slice(0, lastBreak).trim();
  }
  return sliced.trim();
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
  }
): string {
  const formatList = (items: string[], emptyLabel: string) =>
    items.length ? items.map((item) => `- ${item}`).join("\n") : `- ${emptyLabel}`;

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
  const correlationLines = correlations.length
    ? correlations.map(
        (item) => `- ${item.factor} (${item.current}): ${item.impact} Action: ${item.recommendation}`
      )
    : ["- Donnees lifestyle insuffisantes pour calculer des correlations."];

  return [
    "## Synthese executive",
    `- Optimal: ${summary.optimal.join(", ") || "Aucun"}`,
    `- A surveiller: ${summary.watch.join(", ") || "Aucun"}`,
    `- Action requise: ${summary.action.join(", ") || "Aucune"}`,
    `- Lecture globale: Profil ${userProfile.gender}${userProfile.age ? " (" + userProfile.age + " ans)" : ""} avec ${critical.length} alerte(s) critique(s) et ${suboptimal.length} zone(s) a optimiser.`,
    "",
    "## Alertes prioritaires",
    alerts.length ? alerts.join("\n") : "- Aucun signal critique majeur.",
    "",
    "## Systeme par systeme",
    `### Hormonal\n- Points cles: ${formatList(
      analysisResult.markers
        .filter((m) =>
          [
            "testosterone_total",
            "testosterone_libre",
            "shbg",
            "estradiol",
            "lh",
            "fsh",
            "prolactine",
            "dhea_s",
            "cortisol",
            "igf1",
          ].includes(m.markerId)
        )
        .map((m) => `${m.name} (${m.status})`),
      "Aucun signal prioritaire"
    )}\n- Impact: Axe hormonal = energie, libido et composition corporelle.`,
    `### Thyroide\n- Points cles: ${formatList(
      analysisResult.markers
        .filter((m) => ["tsh", "t4_libre", "t3_libre", "t3_reverse", "anti_tpo"].includes(m.markerId))
        .map((m) => `${m.name} (${m.status})`),
      "Rien d urgent"
    )}\n- Impact: La thyroide pilote metabolisme et thermogenese.`,
    `### Metabolique\n- Points cles: ${formatList(
      analysisResult.markers
        .filter((m) =>
          [
            "glycemie_jeun",
            "hba1c",
            "insuline_jeun",
            "homa_ir",
            "triglycerides",
            "hdl",
            "ldl",
            "apob",
            "lpa",
          ].includes(m.markerId)
        )
        .map((m) => `${m.name} (${m.status})`),
      "Profil metabolique stable"
    )}\n- Impact: Base de la perte de gras et de l energie.`,
    `### Inflammation\n- Points cles: ${formatList(
      analysisResult.markers
        .filter((m) =>
          ["crp_us", "homocysteine", "ferritine", "fer_serique", "transferrine_sat"].includes(
            m.markerId
          )
        )
        .map((m) => `${m.name} (${m.status})`),
      "Inflammation controlee"
    )}\n- Impact: Inflammation basse = recuperation plus rapide.`,
    `### Vitamines\n- Points cles: ${formatList(
      analysisResult.markers
        .filter((m) => ["vitamine_d", "b12", "folate", "magnesium_rbc", "zinc"].includes(m.markerId))
        .map((m) => `${m.name} (${m.status})`),
      "Couverture micronutriments correcte"
    )}\n- Impact: Micronutriments = hormones, immunite, energie.`,
    `### Foie & rein\n- Points cles: ${formatList(
      analysisResult.markers
        .filter((m) => ["alt", "ast", "ggt", "creatinine", "egfr"].includes(m.markerId))
        .map((m) => `${m.name} (${m.status})`),
      "Fonctions hepatiques et renales stables"
    )}\n- Impact: Detox et elimination conditionnent la performance.`,
    "",
    "## Correlations lifestyle",
    ...correlationLines,
    "",
    "## Protocoles 90 jours",
    "### Jours 1-30",
    formatList(priority1, "Stabiliser sommeil, hydratation, apport proteique."),
    "### Jours 31-90",
    formatList(priority2, "Optimiser activite, nutrition et supplementation."),
    "",
    "## Controles a prevoir",
    followUp.length ? followUp.join("\n") : "- Aucun controle prioritaire",
    "",
    "## Vigilance",
    alerts.length ? alerts.join("\n") : "- Aucun signal critique majeur.",
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
    trainingHours?: number;
    calorieDeficit?: number;
    alcoholWeekly?: number;
    stressLevel?: number;
    poids?: number;
    taille?: number;
  }
): LifestyleCorrelation[] => {
  const correlations: LifestyleCorrelation[] = [];
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
    correlations.push({
      factor: "Sommeil",
      current: `${sleepHours} h/nuit`,
      impact: impactBits.length
        ? `Sommeil court associe a ${impactBits.join(" et ")}.`
        : "Sommeil court fragilise l axe hormonal et la recuperation.",
      recommendation: "Vise 7h30-8h30 et des horaires stables sur 14 jours.",
      evidence: "Sommeil <7h baisse la testosterone et augmente le stress physiologique.",
    });
  }

  if (typeof trainingHours === "number" && trainingHours >= 10) {
    const crp = getMarker("crp_us");
    const cortisol = getMarker("cortisol");
    const impactBits = [];
    if (isFlaggedStatus(crp?.status)) impactBits.push("inflammation elevee");
    if (isFlaggedStatus(cortisol?.status)) impactBits.push("cortisol eleve");
    correlations.push({
      factor: "Training",
      current: `${trainingHours} h/sem`,
      impact: impactBits.length
        ? `Volume eleve associe a ${impactBits.join(" et ")}.`
        : "Volume eleve peut limiter la recuperation et l anabolisme.",
      recommendation: "Reduis a 6-8 h/sem et planifie un deload toutes les 4-6 semaines.",
      evidence: "Surentrainement chronique augmente inflammation et catabolisme.",
    });
  }

  if (typeof calorieDeficit === "number" && calorieDeficit >= 25) {
    const t3 = getMarker("t3_libre");
    const igf1 = getMarker("igf1");
    const impactBits = [];
    if (isFlaggedStatus(t3?.status)) impactBits.push("thyroide ralentit");
    if (isFlaggedStatus(igf1?.status)) impactBits.push("anabolisme faible");
    correlations.push({
      factor: "Deficit calorique",
      current: `${calorieDeficit}%`,
      impact: impactBits.length
        ? `Deficit eleve associe a ${impactBits.join(" et ")}.`
        : "Deficit eleve peut ralentir le metabolisme et la recuperation.",
      recommendation: "Reste sous 15-20% de deficit et integre 1 refeed hebdo.",
      evidence: "Deficits agressifs baissent T3 et IGF-1 chez les sportifs.",
    });
  }

  if (typeof stressLevel === "number" && stressLevel >= 7) {
    const cortisol = getMarker("cortisol");
    const crp = getMarker("crp_us");
    const impactBits = [];
    if (isFlaggedStatus(cortisol?.status)) impactBits.push("cortisol desequilibre");
    if (isFlaggedStatus(crp?.status)) impactBits.push("inflammation elevee");
    correlations.push({
      factor: "Stress",
      current: `${stressLevel}/10`,
      impact: impactBits.length
        ? `Stress eleve associe a ${impactBits.join(" et ")}.`
        : "Stress eleve perturbe sommeil, glycemie et recuperation.",
      recommendation: "Integre 10-15 min/jour de respiration, marche lente ou NSDR.",
      evidence: "Stress chronique eleve cortisol et degrade la sensibilite a l insuline.",
    });
  }

  if (typeof alcoholWeekly === "number" && alcoholWeekly >= 6) {
    const ggt = getMarker("ggt");
    const triglycerides = getMarker("triglycerides");
    const impactBits = [];
    if (isFlaggedStatus(ggt?.status)) impactBits.push("stress hepatique");
    if (isFlaggedStatus(triglycerides?.status)) impactBits.push("triglycerides hauts");
    correlations.push({
      factor: "Alcool",
      current: `${alcoholWeekly} verres/sem`,
      impact: impactBits.length
        ? `Alcool associe a ${impactBits.join(" et ")}.`
        : "Alcool freine la lipolyse et surcharge le foie.",
      recommendation: "Passe sous 2-3 verres/sem pendant 4 semaines.",
      evidence: "L alcool eleve GGT et triglycerides chez les profils a risque.",
    });
  }

  if (typeof bmi === "number" && bmi >= 27) {
    const homa = getMarker("homa_ir");
    const triglycerides = getMarker("triglycerides");
    const impactBits = [];
    if (isFlaggedStatus(homa?.status)) impactBits.push("insulino resistance");
    if (isFlaggedStatus(triglycerides?.status)) impactBits.push("profil lipidique degrade");
    correlations.push({
      factor: "IMC",
      current: formatNumber(bmi),
      impact: impactBits.length
        ? `IMC eleve associe a ${impactBits.join(" et ")}.`
        : "IMC eleve augmente la charge metabolique globale.",
      recommendation: "Objectif: -5 a -10% de poids sur 8-12 semaines.",
      evidence: "Perte de gras visceral ameliore glycemie, lipides et inflammation.",
    });
  }

  return correlations.slice(0, 4);
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
  },
  knowledgeContext?: string
): Promise<string> {
  const anthropic = new Anthropic();

  // Build the prompt with analysis data
  const markersTable = analysisResult.markers.map(m =>
    `- ${m.name} [${m.markerId}] (${m.category}) : ${m.value} ${m.unit} (Normal: ${m.normalRange}, Optimal: ${m.optimalRange}) → ${m.status.toUpperCase()}${m.interpretation ? ` | Note: ${m.interpretation}` : ""}`
  ).join("\n");

  const patternsText = analysisResult.patterns.map(p =>
    `Pattern détecté: ${p.name}\nCauses: ${p.causes.join(", ")}`
  ).join("\n\n");

  const bmi =
    typeof userProfile.poids === "number" && typeof userProfile.taille === "number" && userProfile.taille > 0
      ? (userProfile.poids / Math.pow(userProfile.taille / 100, 2)).toFixed(1)
      : "N/A";
  const lifestyleLine = `Sommeil: ${userProfile.sleepHours ?? "N/A"} h/nuit | Training: ${userProfile.trainingHours ?? "N/A"} h/sem | Deficit: ${userProfile.calorieDeficit ?? "N/A"}% | Alcool: ${userProfile.alcoholWeekly ?? "N/A"} verres/sem | Stress: ${userProfile.stressLevel ?? "N/A"}/10 | Poids: ${userProfile.poids ?? "N/A"} kg | Taille: ${userProfile.taille ?? "N/A"} cm | IMC: ${bmi}`;

  const userPrompt = `Analyse ce bilan sanguin pour ${userProfile.prenom ? userProfile.prenom : "le client"} (${userProfile.gender} ${userProfile.age || ""}).
Objectifs: ${userProfile.objectives || "Performance et santé"}
Médicaments: ${userProfile.medications || "Aucun"}
Lifestyle: ${lifestyleLine}

MARQUEURS:
${markersTable}

PATTERNS DÉTECTÉS:
${patternsText}

RÉSUMÉ:
- Optimal: ${analysisResult.summary.optimal.join(", ") || "Aucun"}
- À surveiller: ${analysisResult.summary.watch.join(", ") || "Aucun"}
- Action requise: ${analysisResult.summary.action.join(", ") || "Aucun"}

${knowledgeContext ? `\nCONTEXTE SCIENTIFIQUE (cite 1-2 sources par panel, format court):\n${knowledgeContext}` : ""}

Génère une analyse complète selon le format demandé.`;

  const response = await anthropic.messages.create({
    model: "claude-opus-4-5-20251101",
    max_tokens: 4500,
    system: BLOOD_ANALYSIS_SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }]
  });

  const textContent = response.content.find(c => c.type === "text");
  return trimAiAnalysis(textContent?.text || "");
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
