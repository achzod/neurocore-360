/**
 * NEUROCORE 360 - Blood Analysis Questionnaire
 * Questions pour saisir les valeurs du bilan sanguin
 */

export interface BloodMarkerQuestion {
  id: string;
  panel: string;
  name: string;
  unit: string;
  placeholder: string;
  required?: boolean;
  genderSpecific?: "homme" | "femme";
  hint?: string;
}

export interface BloodPanel {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  markers: BloodMarkerQuestion[];
}

// ============================================
// BLOOD PANELS
// ============================================

export const BLOOD_PANELS: BloodPanel[] = [
  {
    id: "hormonal",
    title: "Panel Hormonal",
    subtitle: "Testostérone, cortisol, SHBG, etc.",
    icon: "TrendingUp",
    markers: [
      { id: "testosterone_total", panel: "hormonal", name: "Testostérone totale", unit: "ng/dL", placeholder: "Ex: 550", genderSpecific: "homme", hint: "Optimal: 600-900" },
      { id: "testosterone_libre", panel: "hormonal", name: "Testostérone libre", unit: "pg/mL", placeholder: "Ex: 18", genderSpecific: "homme", hint: "Optimal: 15-25" },
      { id: "shbg", panel: "hormonal", name: "SHBG", unit: "nmol/L", placeholder: "Ex: 35", hint: "Optimal: 20-40" },
      { id: "estradiol", panel: "hormonal", name: "Estradiol (E2)", unit: "pg/mL", placeholder: "Ex: 28", hint: "Optimal: 20-35" },
      { id: "lh", panel: "hormonal", name: "LH", unit: "mIU/mL", placeholder: "Ex: 5.5", hint: "Optimal: 4-7" },
      { id: "fsh", panel: "hormonal", name: "FSH", unit: "mIU/mL", placeholder: "Ex: 5", hint: "Optimal: 3-8" },
      { id: "prolactine", panel: "hormonal", name: "Prolactine", unit: "ng/mL", placeholder: "Ex: 8", hint: "Optimal: 5-12" },
      { id: "dhea_s", panel: "hormonal", name: "DHEA-S", unit: "µg/dL", placeholder: "Ex: 350", hint: "Optimal: 300-450" },
      { id: "cortisol", panel: "hormonal", name: "Cortisol (matin)", unit: "µg/dL", placeholder: "Ex: 15", hint: "Optimal: 12-18" },
      { id: "igf1", panel: "hormonal", name: "IGF-1", unit: "ng/mL", placeholder: "Ex: 220", hint: "Optimal: 200-280" },
    ]
  },
  {
    id: "thyroid",
    title: "Panel Thyroïdien",
    subtitle: "TSH, T3, T4, anticorps",
    icon: "Activity",
    markers: [
      { id: "tsh", panel: "thyroid", name: "TSH", unit: "mIU/L", placeholder: "Ex: 1.5", required: true, hint: "Optimal: 0.5-2.0" },
      { id: "t4_libre", panel: "thyroid", name: "T4 libre", unit: "ng/dL", placeholder: "Ex: 1.3", hint: "Optimal: 1.2-1.6" },
      { id: "t3_libre", panel: "thyroid", name: "T3 libre", unit: "pg/mL", placeholder: "Ex: 3.2", hint: "Optimal: 3.0-4.0" },
      { id: "t3_reverse", panel: "thyroid", name: "T3 reverse", unit: "ng/dL", placeholder: "Ex: 12", hint: "Optimal: <15" },
      { id: "anti_tpo", panel: "thyroid", name: "Anti-TPO", unit: "IU/mL", placeholder: "Ex: 10", hint: "Optimal: <20" },
    ]
  },
  {
    id: "metabolic",
    title: "Panel Métabolique",
    subtitle: "Glycémie, insuline, lipides",
    icon: "Flame",
    markers: [
      { id: "glycemie_jeun", panel: "metabolic", name: "Glycémie à jeun", unit: "mg/dL", placeholder: "Ex: 85", required: true, hint: "Optimal: 75-90" },
      { id: "hba1c", panel: "metabolic", name: "HbA1c", unit: "%", placeholder: "Ex: 5.1", hint: "Optimal: <5.3%" },
      { id: "insuline_jeun", panel: "metabolic", name: "Insuline à jeun", unit: "µIU/mL", placeholder: "Ex: 5", hint: "Optimal: 3-8" },
      { id: "homa_ir", panel: "metabolic", name: "HOMA-IR", unit: "", placeholder: "Ex: 1.2", hint: "Optimal: <1.5" },
      { id: "triglycerides", panel: "metabolic", name: "Triglycérides", unit: "mg/dL", placeholder: "Ex: 70", hint: "Optimal: <80" },
      { id: "hdl", panel: "metabolic", name: "HDL", unit: "mg/dL", placeholder: "Ex: 60", required: true, hint: "Optimal: >55" },
      { id: "ldl", panel: "metabolic", name: "LDL", unit: "mg/dL", placeholder: "Ex: 90", required: true, hint: "Optimal: 70-100" },
      { id: "apob", panel: "metabolic", name: "ApoB", unit: "mg/dL", placeholder: "Ex: 75", hint: "Optimal: <80" },
      { id: "lpa", panel: "metabolic", name: "Lp(a)", unit: "mg/dL", placeholder: "Ex: 10", hint: "Optimal: <14" },
    ]
  },
  {
    id: "inflammation",
    title: "Panel Inflammatoire",
    subtitle: "CRP, homocystéine, fer",
    icon: "Thermometer",
    markers: [
      { id: "crp_us", panel: "inflammation", name: "CRP ultrasensible", unit: "mg/L", placeholder: "Ex: 0.3", hint: "Optimal: <0.5" },
      { id: "homocysteine", panel: "inflammation", name: "Homocystéine", unit: "µmol/L", placeholder: "Ex: 7", hint: "Optimal: 6-9" },
      { id: "ferritine", panel: "inflammation", name: "Ferritine", unit: "ng/mL", placeholder: "Ex: 100", required: true, hint: "Optimal H: 80-150, F: 50-100" },
      { id: "fer_serique", panel: "inflammation", name: "Fer sérique", unit: "µg/dL", placeholder: "Ex: 110", hint: "Optimal: 100-140" },
      { id: "transferrine_sat", panel: "inflammation", name: "Saturation transferrine", unit: "%", placeholder: "Ex: 35", hint: "Optimal: 30-45%" },
    ]
  },
  {
    id: "vitamins",
    title: "Vitamines & Minéraux",
    subtitle: "Vitamine D, B12, magnésium, zinc",
    icon: "Pill",
    markers: [
      { id: "vitamine_d", panel: "vitamins", name: "Vitamine D", unit: "ng/mL", placeholder: "Ex: 55", required: true, hint: "Optimal: 50-80" },
      { id: "b12", panel: "vitamins", name: "Vitamine B12", unit: "pg/mL", placeholder: "Ex: 600", hint: "Optimal: 500-800" },
      { id: "folate", panel: "vitamins", name: "Folate", unit: "ng/mL", placeholder: "Ex: 15", hint: "Optimal: 10-20" },
      { id: "magnesium_rbc", panel: "vitamins", name: "Magnésium RBC", unit: "mg/dL", placeholder: "Ex: 5.8", hint: "Optimal: 5.5-6.5" },
      { id: "zinc", panel: "vitamins", name: "Zinc", unit: "µg/dL", placeholder: "Ex: 95", hint: "Optimal: 90-110" },
    ]
  },
  {
    id: "liver_kidney",
    title: "Hépatique & Rénal",
    subtitle: "ALT, AST, GGT, créatinine",
    icon: "Heart",
    markers: [
      { id: "alt", panel: "liver_kidney", name: "ALT (SGPT)", unit: "U/L", placeholder: "Ex: 22", hint: "Optimal: <30" },
      { id: "ast", panel: "liver_kidney", name: "AST (SGOT)", unit: "U/L", placeholder: "Ex: 25", hint: "Optimal: <30" },
      { id: "ggt", panel: "liver_kidney", name: "GGT", unit: "U/L", placeholder: "Ex: 18", hint: "Optimal: <25" },
      { id: "creatinine", panel: "liver_kidney", name: "Créatinine", unit: "mg/dL", placeholder: "Ex: 1.0", hint: "Optimal: 0.9-1.1" },
      { id: "egfr", panel: "liver_kidney", name: "eGFR", unit: "mL/min", placeholder: "Ex: 110", hint: "Optimal: >100" },
    ]
  }
];

// ============================================
// HELPER FUNCTIONS
// ============================================

export function getAllBloodMarkers(): BloodMarkerQuestion[] {
  return BLOOD_PANELS.flatMap(panel => panel.markers);
}

export function getMarkersByGender(gender: "homme" | "femme"): BloodMarkerQuestion[] {
  return getAllBloodMarkers().filter(
    m => !m.genderSpecific || m.genderSpecific === gender
  );
}

export function getRequiredMarkers(): BloodMarkerQuestion[] {
  return getAllBloodMarkers().filter(m => m.required);
}

export function getPanelById(panelId: string): BloodPanel | undefined {
  return BLOOD_PANELS.find(p => p.id === panelId);
}

export function getMarkerById(markerId: string): BloodMarkerQuestion | undefined {
  return getAllBloodMarkers().find(m => m.id === markerId);
}

// ============================================
// BLOOD ANALYSIS PRICING
// ============================================

export const BLOOD_ANALYSIS_PRICING = {
  id: "blood-analysis",
  name: "Blood Analysis",
  price: 79,
  currency: "EUR",
  description: "Analyse approfondie de ton bilan sanguin avec ranges OPTIMAUX",
  features: [
    "Analyse de +30 biomarqueurs",
    "Ranges OPTIMAUX vs normaux",
    "Détection des patterns (Low T, Thyroid, etc.)",
    "Protocole personnalisé avec dosages",
    "Sources scientifiques citées",
    "Plan de contrôle de suivi"
  ],
  disclaimer: "Ne remplace pas une consultation médicale"
};
