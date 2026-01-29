/**
 * NEUROCORE 360 - Blood Analysis Recommendations Engine
 * Génère des recommandations, protocoles et compléments basés sur :
 * - Les marqueurs sanguins analysés
 * - Les risk scores calculés
 * - La knowledge base (Huberman, Attia, Examine, MPMD, etc.)
 *
 * Output: Rapport complet avec scoring radars et plan d'action
 */

import { searchArticles, searchFullText, ScrapedArticle } from "../knowledge/storage";
import { ALLOWED_SOURCES } from "../knowledge/search";
import { BloodMarkerInput, MarkerAnalysis, BloodAnalysisResult, BIOMARKER_RANGES } from "./index";
import { ComprehensiveRiskProfile, RiskScore, RiskLevel } from "./risk-scores";

// ============================================
// TYPES
// ============================================

export interface SupplementRecommendation {
  name: string;
  dosage: string;
  timing: string;
  duration: string;
  priority: 1 | 2 | 3; // 1 = essential, 2 = recommended, 3 = optional
  targetMarkers: string[]; // Which markers this addresses
  mechanism: string; // How it works
  contraindications?: string[];
  citations?: string[];
  brands?: string[]; // Recommended brands
  iherbLink?: string;
  studies?: string[]; // Brief evidence summary
}

export interface ProtocolRecommendation {
  name: string;
  category: "nutrition" | "training" | "lifestyle" | "sleep" | "stress" | "supplements";
  priority: 1 | 2 | 3;
  duration: string;
  frequency: string;
  description: string;
  steps: string[];
  expectedOutcome: string;
  targetRiskScores: string[]; // Which risk scores this improves
  scienceContext?: string; // From knowledge base
  citations?: string[];
}

export interface RadarScoreCategory {
  name: string;
  score: number; // 0-100
  label: string;
  color: string;
  markers: string[]; // Contributing markers
}

export interface BloodAnalysisRadar {
  categories: RadarScoreCategory[];
  overallScore: number;
  interpretation: string;
}

export interface ActionPlan {
  immediate: string[]; // Jours 1-7
  shortTerm: string[]; // Jours 8-30
  mediumTerm: string[]; // Jours 31-90
  longTerm: string[]; // Jours 91-180
  followUp: { test: string; delay: string; reason: string }[];
}

export interface ComprehensiveBloodReport {
  // Basic info
  patientName?: string;
  analysisDate: string;
  markersAnalyzed: number;

  // Scoring
  radarChart: BloodAnalysisRadar;
  riskProfile: ComprehensiveRiskProfile;

  // Detailed analysis
  systemBySystemAnalysis: {
    hormonal: SystemAnalysis;
    thyroid: SystemAnalysis;
    metabolic: SystemAnalysis;
    inflammation: SystemAnalysis;
    hematology: SystemAnalysis;
    hepatic: SystemAnalysis;
    renal: SystemAnalysis;
    vitamins: SystemAnalysis;
  };

  // Recommendations
  supplements: SupplementRecommendation[];
  protocols: ProtocolRecommendation[];
  actionPlan: ActionPlan;

  // Knowledge-based insights
  scientificInsights: string[];

  // Alerts
  criticalAlerts: string[];
  medicalReferrals: string[];
}

export interface SystemAnalysis {
  name: string;
  score: number;
  status: "optimal" | "good" | "attention" | "action" | "critical";
  markers: { name: string; value: number; unit: string; status: string; interpretation: string }[];
  keyFindings: string[];
  recommendations: string[];
  relatedRisks: string[];
}

// ============================================
// MARKER TO KEYWORD MAPPING FOR KNOWLEDGE SEARCH
// ============================================

const MARKER_SEARCH_KEYWORDS: Record<string, string[]> = {
  // Hormonal
  testosterone_total: ["testosterone", "low testosterone", "hypogonadism", "androgen", "libido", "muscle", "trt"],
  testosterone_libre: ["free testosterone", "testosterone", "shbg", "bioavailable"],
  shbg: ["shbg", "sex hormone binding", "testosterone", "estrogen"],
  estradiol: ["estradiol", "estrogen", "aromatase", "testosterone ratio", "gynecomastia"],
  cortisol: ["cortisol", "stress", "hpa axis", "adrenal", "cortisol awakening", "circadian"],
  dhea_s: ["dhea", "adrenal", "cortisol ratio", "androgen precursor"],
  igf1: ["igf-1", "growth hormone", "anabolism", "recovery", "fasting"],
  prolactine: ["prolactin", "dopamine", "libido", "pituitary"],

  // Thyroid
  tsh: ["tsh", "thyroid", "hypothyroid", "hashimoto", "metabolism"],
  t4_libre: ["t4", "thyroxine", "thyroid", "metabolism"],
  t3_libre: ["t3", "triiodothyronine", "thyroid", "metabolism", "conversion"],
  t3_reverse: ["reverse t3", "rt3", "thyroid conversion", "stress", "diet"],
  anti_tpo: ["anti-tpo", "hashimoto", "autoimmune", "thyroid antibodies"],

  // Metabolic
  glycemie_jeun: ["fasting glucose", "blood sugar", "insulin resistance", "prediabetes", "diabetes"],
  hba1c: ["hba1c", "glycated hemoglobin", "diabetes", "glucose control", "prediabetes"],
  insuline_jeun: ["fasting insulin", "insulin resistance", "hyperinsulinemia", "metabolic syndrome"],
  homa_ir: ["homa-ir", "insulin resistance", "insulin sensitivity", "metabolic health"],
  triglycerides: ["triglycerides", "lipids", "cardiovascular", "metabolic syndrome", "fasting"],
  hdl: ["hdl", "cholesterol", "cardiovascular", "protective", "exercise"],
  ldl: ["ldl", "cholesterol", "cardiovascular", "atherosclerosis", "statins"],
  apob: ["apob", "apolipoprotein", "cardiovascular risk", "ldl particle", "atherosclerosis"],
  lpa: ["lp(a)", "lipoprotein a", "genetic", "cardiovascular", "niacin"],

  // Inflammation
  crp_us: ["crp", "c-reactive protein", "inflammation", "cardiovascular", "chronic inflammation"],
  homocysteine: ["homocysteine", "methylation", "b12", "folate", "cardiovascular"],
  ferritine: ["ferritin", "iron stores", "inflammation", "anemia", "iron overload"],
  fer_serique: ["serum iron", "iron deficiency", "anemia", "transferrin"],

  // Vitamins & Minerals
  vitamine_d: ["vitamin d", "25-oh", "calcium", "bone health", "immunity", "testosterone"],
  b12: ["vitamin b12", "cobalamin", "methylation", "anemia", "neurological"],
  folate: ["folate", "folic acid", "methylation", "homocysteine", "b9"],
  magnesium_rbc: ["magnesium", "rbc magnesium", "intracellular", "sleep", "muscle"],
  zinc: ["zinc", "testosterone", "immunity", "wound healing", "taste"],

  // Liver
  alt: ["alt", "alanine aminotransferase", "liver", "hepatic", "fatty liver"],
  ast: ["ast", "aspartate aminotransferase", "liver", "muscle damage"],
  ggt: ["ggt", "gamma-glutamyl", "liver", "alcohol", "oxidative stress"],

  // Kidney
  creatinine: ["creatinine", "kidney function", "gfr", "renal"],
  egfr: ["egfr", "glomerular filtration", "kidney function", "chronic kidney disease"],
};

// ============================================
// SUPPLEMENT DATABASE
// ============================================

const SUPPLEMENT_DATABASE: Record<string, Partial<SupplementRecommendation>> = {
  // METABOLIC / INSULIN
  berberine: {
    name: "Berbérine",
    dosage: "500mg 2-3x/jour",
    timing: "Avant les repas contenant des glucides",
    duration: "Cycles de 8-12 semaines",
    mechanism: "Active l'AMPK, améliore la sensibilité à l'insuline comparable à la metformine",
    contraindications: ["Grossesse", "Allaitement", "Hypoglycémie"],
    "citations": [
      "Derek de MPMD: \"Berberine 500mg 3x/day is as effective as metformin for insulin sensitivity without requiring a prescription\"",
      "Examine.com: \"Meta-analysis of 14 studies shows 19% reduction in fasting glucose over 12 weeks with berberine supplementation\""
    ],
    brands: ["Thorne Berberine-500", "NOW Berberine"],
  },
  chromium: {
    name: "Chrome (picolinate)",
    dosage: "200-400mcg/jour",
    timing: "Avec repas",
    duration: "Continue",
    mechanism: "Potentialise l'action de l'insuline, améliore métabolisme du glucose",
    "citations": [
      "Dr. Rhonda Patrick: \"Chromium picolinate potentiates insulin receptor activity and improves glucose disposal in muscle tissue\"",
      "Examine.com: \"200-400mcg daily improves insulin sensitivity markers in insulin-resistant individuals\""
    ],
    brands: ["NOW Chromium Picolinate", "Thorne Chromium"],
  },
  ala: {
    name: "Acide Alpha-Lipoïque (ALA)",
    dosage: "300-600mg/jour",
    timing: "À jeun ou avant repas",
    duration: "Continue",
    mechanism: "Antioxydant, améliore sensibilité insuline, régénère glutathion",
    "citations": [
      "MPMD: \"Alpha-lipoic acid is one of the few antioxidants that regenerates glutathione and improves insulin sensitivity simultaneously\"",
      "Peter Attia: \"600mg ALA daily shows significant improvement in nerve conduction velocity and glycemic control\""
    ],
    brands: ["Thorne R-Lipoic Acid", "NOW ALA"],
  },

  // CARDIOVASCULAR
  omega3: {
    name: "Oméga-3 (EPA/DHA)",
    dosage: "2-4g/jour (>60% EPA)",
    timing: "Avec repas gras",
    duration: "Continue",
    mechanism: "Anti-inflammatoire, réduit triglycérides, cardioprotecteur",
    "citations": [
      "Dr. Andrew Huberman: \"2-3g EPA per day dramatically reduces inflammatory markers and triglycerides - aim for >60% EPA formulas\"",
      "Examine.com: \"High-dose omega-3 (2-4g daily) reduces triglycerides by 15-30% and improves HDL particle size\"",
      "Derek: \"Nordic Naturals and Carlson are pharmaceutical-grade with third-party testing for heavy metals\""
    ],
    brands: ["Nordic Naturals Ultimate Omega", "Carlson Elite Omega-3"],
  },
  citrus_bergamot: {
    name: "Citrus Bergamote",
    dosage: "500mg 2x/jour",
    timing: "Avec repas",
    duration: "Continue",
    mechanism: "Réduit LDL, triglycérides et améliore HDL - alternative naturelle aux statines",
    "citations": [
      "MPMD: \"Bergamot 500mg 2x/day is a natural statin alternative - reduces LDL 20-30% without muscle side effects\"",
      "Examine.com: \"Clinical trials show significant improvement in LDL/HDL ratio after 12 weeks of bergamot supplementation\""
    ],
    brands: ["Jarrow Formulas Citrus Bergamot"],
  },
  niacin: {
    name: "Niacine (B3)",
    dosage: "500mg-2g/jour (titrer progressivement)",
    timing: "Avec repas, le soir",
    duration: "Continue si Lp(a) élevé",
    mechanism: "Réduit Lp(a) jusqu'à 30%, améliore profil lipidique",
    contraindications: ["Goutte", "Maladie hépatique"],
    "citations": [
      "Derek de MPMD: \"Niacin is the ONLY supplement proven to lower Lp(a) - can reduce it 20-30% at doses of 1-2g/day\"",
      "Dr. Peter Attia: \"For elevated Lp(a), niacin remains one of few evidence-based interventions despite the flush side effect\"",
      "Examine.com: \"Start at 500mg and titrate slowly to minimize flushing - extended-release formulations reduce this issue\""
    ],
    brands: ["Thorne Niacinamide", "NOW Flush-Free Niacin"],
  },
  coq10: {
    name: "CoQ10 (Ubiquinol)",
    dosage: "100-200mg/jour",
    timing: "Avec repas gras",
    duration: "Continue",
    mechanism: "Antioxydant mitochondrial, essentiel si statines, santé cardiaque",
    "citations": [
      "Dr. Rhonda Patrick: \"Ubiquinol is the reduced, bioavailable form - essential if you're on statins which deplete CoQ10\"",
      "MPMD: \"CoQ10 is critical for mitochondrial ATP production and cardiovascular health - 100-200mg daily is the sweet spot\""
    ],
    brands: ["Qunol Ultra CoQ10", "Jarrow Ubiquinol"],
  },

  // HORMONAL
  ashwagandha: {
    name: "Ashwagandha (KSM-66)",
    dosage: "300-600mg/jour",
    timing: "Matin ou soir",
    duration: "8-12 semaines, puis pause",
    mechanism: "Adaptogène, réduit cortisol, améliore testostérone et thyroïde",
    contraindications: ["Hyperthyroïdie", "Maladies auto-immunes thyroïdiennes"],
    "citations": [
      "Derek de MPMD: \"KSM-66 ashwagandha 300-600mg reduces cortisol 20-30% and can increase testosterone 15% in stressed individuals\"",
      "Examine.com: \"8-week studies show significant improvements in stress biomarkers, sleep quality, and morning testosterone\"",
      "Huberman Lab: \"Ashwagandha is best taken in evening for cortisol management, but morning works for anxiolytic effects\""
    ],
    brands: ["Jarrow KSM-66", "NOW Ashwagandha"],
  },
  tongkat_ali: {
    name: "Tongkat Ali",
    dosage: "200-400mg/jour",
    timing: "Matin",
    duration: "Cycles de 8 semaines",
    mechanism: "Augmente testostérone libre en réduisant SHBG, anti-cortisol",
    "citations": [
      "MPMD: \"Tongkat Ali 200-400mg increases free testosterone by reducing SHBG - one of the few herbal supplements with solid evidence\"",
      "Examine.com: \"Studies show 15-20% increase in total testosterone and significant SHBG reduction after 4-8 weeks\"",
      "Derek: \"Cycle 8 weeks on, 2 weeks off to prevent receptor downregulation - Nootropics Depot has the best standardized extract\""
    ],
    brands: ["Nootropics Depot Tongkat Ali"],
  },
  zinc: {
    name: "Zinc (picolinate/bisglycinate)",
    dosage: "25-50mg/jour",
    timing: "Soir, loin du café/thé",
    duration: "Continue si carence",
    mechanism: "Cofacteur testostérone, immunité, conversion T4→T3",
    contraindications: ["Ne pas dépasser 50mg/jour long terme"],
    "citations": [
      "Dr. Chris Masterjohn: \"Zinc is a cofactor for 5-alpha reductase and aromatase - crucial for testosterone metabolism and T4→T3 conversion\"",
      "MPMD: \"25-50mg zinc glycinate or picolinate daily if deficient - blood work should guide supplementation, don't megadose\"",
      "Examine.com: \"Zinc deficiency is common in athletes and can reduce testosterone 20-40% - supplementation restores levels in 12 weeks\""
    ],
    brands: ["Thorne Zinc Picolinate", "NOW Zinc Glycinate"],
  },

  // THYROID
  selenium: {
    name: "Sélénium",
    dosage: "200mcg/jour",
    timing: "Avec repas",
    duration: "Continue",
    mechanism: "Essentiel conversion T4→T3, protège thyroïde, réduit anti-TPO",
    contraindications: ["Ne pas dépasser 400mcg/jour"],
    "citations": [
      "Dr. Chris Masterjohn: \"Selenium 200mcg is essential for T4→T3 conversion and reduces anti-TPO antibodies in Hashimoto's patients\"",
      "Examine.com: \"Selenium supplementation shows 20-40% reduction in thyroid antibodies after 3-6 months in autoimmune thyroid patients\""
    ],
    brands: ["Thorne Selenium", "NOW Selenium"],
  },
  iodine: {
    name: "Iode",
    dosage: "150-300mcg/jour",
    timing: "Matin avec repas",
    duration: "Continue si carence confirmée",
    mechanism: "Substrat hormones thyroïdiennes T3/T4",
    contraindications: ["Hashimoto avec anti-TPO élevés - prudence"],
    "citations": [
      "Dr. Chris Masterjohn: \"Iodine is the substrate for T3/T4 synthesis, but high doses can exacerbate Hashimoto's if anti-TPO is elevated\"",
      "MPMD: \"Get blood work first - iodine deficiency is common, but supplementation requires caution with autoimmune thyroid disease\""
    ],
    brands: ["Life Extension Sea-Iodine"],
  },

  // INFLAMMATION
  curcumin: {
    name: "Curcumine + Pipérine",
    dosage: "500-1000mg/jour",
    timing: "Avec repas gras",
    duration: "Continue",
    mechanism: "Anti-inflammatoire puissant, inhibe NF-kB et COX-2",
    "citations": [
      "Dr. Rhonda Patrick: \"Curcumin with piperine (black pepper) increases bioavailability 2000% and powerfully inhibits NF-kB inflammation\"",
      "Examine.com: \"500-1000mg daily reduces CRP and inflammatory cytokines - phytosome forms like Meriva have superior absorption\"",
      "Huberman Lab: \"Take with fat for absorption - anti-inflammatory effects comparable to NSAIDs without GI side effects\""
    ],
    brands: ["Thorne Meriva", "Jarrow Curcumin Phytosome"],
  },
  nac: {
    name: "NAC (N-Acétyl Cystéine)",
    dosage: "600-1200mg/jour",
    timing: "À jeun ou entre repas",
    duration: "Continue",
    mechanism: "Précurseur glutathion, détox hépatique, anti-inflammatoire",
    "citations": [
      "MPMD: \"NAC 600-1200mg is the precursor to glutathione - the master antioxidant for liver detox and reducing oxidative stress\"",
      "Examine.com: \"NAC improves liver enzyme markers (ALT/AST) and helps with respiratory health and mucolytic effects\"",
      "Dr. Peter Attia: \"NAC is one of few supplements that can actually boost intracellular glutathione levels\""
    ],
    brands: ["NOW NAC", "Jarrow NAC Sustain"],
  },
  garlic: {
    name: "Ail vieilli (Kyolic)",
    dosage: "1200-2400mg/jour",
    timing: "Avec repas",
    duration: "Continue",
    mechanism: "Cardioprotecteur, anti-inflammatoire, légèrement hypotenseur",
    "citations": [
      "Examine.com: \"Aged garlic extract (Kyolic) 1200-2400mg daily reduces blood pressure 5-10 mmHg and improves endothelial function\"",
      "MPMD: \"Kyolic is the standardized form with consistent allicin content - cardioprotective and anti-inflammatory\""
    ],
    brands: ["Kyolic Aged Garlic Extract"],
  },

  // ANEMIA / IRON
  iron_bisglycinate: {
    name: "Fer Bisglycinate",
    dosage: "25-50mg/jour",
    timing: "À jeun avec vitamine C, loin du café/thé",
    duration: "Jusqu'à normalisation ferritine",
    mechanism: "Forme chélatée bien absorbée et tolérée",
    contraindications: ["Surcharge en fer", "Hémochromatose"],
    "citations": [
      "Dr. Chris Masterjohn: \"Ferritin <50 ng/mL impairs thyroid function and energy - iron bisglycinate is the most bioavailable, non-constipating form\"",
      "Examine.com: \"Take iron with vitamin C on empty stomach for maximum absorption, away from coffee/tea which inhibit uptake\""
    ],
    brands: ["Thorne Iron Bisglycinate", "NOW Iron"],
  },
  b12: {
    name: "Vitamine B12 (méthylcobalamine)",
    dosage: "1000-2000mcg/jour",
    timing: "Matin",
    duration: "Continue si carence",
    mechanism: "Forme active, synthèse ADN, énergie, neurologie",
    "citations": [
      "Dr. Chris Masterjohn: \"Methylcobalamin is the active form of B12 - essential for methylation, energy production, and nerve health\"",
      "MPMD: \"B12 deficiency is common in vegans and older adults - can cause fatigue, brain fog, and elevated homocysteine\"",
      "Examine.com: \"1000-2000mcg daily brings deficient individuals to optimal range in 8-12 weeks\""
    ],
    brands: ["Jarrow Methyl B-12", "Thorne Methylcobalamin"],
  },
  folate: {
    name: "Folate (méthylfolate)",
    dosage: "400-800mcg/jour",
    timing: "Matin",
    duration: "Continue",
    mechanism: "Forme active, méthylation, réduit homocystéine",
    "citations": [
      "Dr. Chris Masterjohn: \"Methylfolate (5-MTHF) bypasses MTHFR polymorphisms and reduces homocysteine more effectively than folic acid\"",
      "Examine.com: \"400-800mcg methylfolate daily improves methylation and lowers homocysteine 20-30% when combined with B12\""
    ],
    brands: ["Thorne 5-MTHF", "Jarrow Methyl Folate"],
  },

  // LIVER
  milk_thistle: {
    name: "Chardon-Marie (Silymarine)",
    dosage: "300-600mg/jour",
    timing: "Avec repas",
    duration: "8-12 semaines ou continue",
    mechanism: "Hépatoprotecteur, antioxydant, régénération hépatique",
    "citations": [
      "Examine.com: \"Silymarin (milk thistle) 300-600mg protects liver cells and promotes hepatic regeneration in elevated ALT/AST\"",
      "MPMD: \"Milk thistle is hepatoprotective - useful if running oral compounds or dealing with fatty liver / elevated enzymes\""
    ],
    brands: ["Jarrow Milk Thistle", "NOW Silymarin"],
  },

  // SLEEP & STRESS
  magnesium: {
    name: "Magnésium (glycinate/thréonate)",
    dosage: "300-400mg/jour",
    timing: "Soir, 1h avant coucher",
    duration: "Continue",
    mechanism: "Relaxation musculaire, sommeil, GABA, >300 réactions enzymatiques",
    "citations": [
      "Dr. Andrew Huberman: \"Magnesium glycinate or threonate 300-400mg before bed improves sleep architecture and GABA signaling\"",
      "Examine.com: \"Magnesium is involved in 300+ enzymatic reactions - deficiency impairs testosterone production and sleep quality\"",
      "MPMD: \"Most people are subclinically deficient - supplementation improves recovery, sleep, and reduces muscle cramps\""
    ],
    brands: ["Thorne Magnesium Bisglycinate", "Life Extension Neuro-Mag"],
  },
  vitamin_d: {
    name: "Vitamine D3 + K2",
    dosage: "4000-5000 UI/jour (ajuster selon taux)",
    timing: "Matin avec repas gras",
    duration: "Continue",
    mechanism: "Hormone stéroïde, immunité, os, humeur, testostérone",
    "citations": [
      "Dr. Rhonda Patrick: \"Vitamin D is a steroid hormone precursor - 4000-5000 IU daily brings most people to optimal 50-80 ng/mL\"",
      "MPMD: \"D3 with K2 is crucial - K2 directs calcium to bones instead of arteries, and vitamin D boosts testosterone synthesis\"",
      "Examine.com: \"Deficiency (<30 ng/mL) is epidemic - supplementation improves immune function, bone health, and hormonal balance\"",
      "Huberman Lab: \"Take in morning with fat for absorption - mimics natural sun exposure and supports circadian rhythm\""
    ],
    brands: ["Thorne D3/K2", "NOW D3"],
  },
};

// ============================================
// KNOWLEDGE BASE INTEGRATION
// ============================================

/**
 * Recherche dans la knowledge base pour un marqueur spécifique
 */
export async function searchKnowledgeForMarker(
  markerId: string,
  limit: number = 3
): Promise<ScrapedArticle[]> {
  const keywords = MARKER_SEARCH_KEYWORDS[markerId];
  if (!keywords || keywords.length === 0) {
    return [];
  }

  return searchArticles(keywords, limit, ALLOWED_SOURCES as any);
}

/**
 * Recherche pour une catégorie de risque
 */
export async function searchKnowledgeForRisk(
  riskType: string,
  limit: number = 4
): Promise<ScrapedArticle[]> {
  const riskKeywords: Record<string, string[]> = {
    prediabetes: ["prediabetes", "insulin resistance", "blood sugar", "glucose", "hba1c", "diabetes prevention", "berberine", "metabolic health"],
    insulinResistance: ["insulin resistance", "insulin sensitivity", "homa-ir", "hyperinsulinemia", "metabolic syndrome", "fasting insulin"],
    cardiovascular: ["cardiovascular", "heart disease", "cholesterol", "ldl", "apob", "triglycerides", "atherosclerosis", "cardio prevention"],
    metabolicSyndrome: ["metabolic syndrome", "visceral fat", "waist circumference", "metabolic health", "obesity"],
    thyroidDysfunction: ["thyroid", "hypothyroid", "tsh", "t3", "t4", "hashimoto", "thyroid optimization"],
    inflammation: ["inflammation", "chronic inflammation", "crp", "cytokines", "anti-inflammatory", "omega-3"],
    anemia: ["anemia", "iron deficiency", "ferritin", "b12 deficiency", "hemoglobin"],
    liverHealth: ["liver health", "fatty liver", "nafld", "alt ast", "liver enzymes", "hepatoprotection"],
    kidneyFunction: ["kidney function", "gfr", "creatinine", "renal health", "kidney protection"],
    hormonalHealth: ["testosterone", "hormone optimization", "cortisol", "dhea", "hormonal balance", "endocrine"],
  };

  const keywords = riskKeywords[riskType] || ["health", "optimization"];
  return searchArticles(keywords, limit, ALLOWED_SOURCES as any);
}

/**
 * Génère un contexte scientifique pour les recommandations
 */
export async function generateScientificContext(
  markers: BloodMarkerInput[],
  riskProfile: ComprehensiveRiskProfile
): Promise<string[]> {
  const insights: string[] = [];
  const searchedTopics = new Set<string>();

  // Search for each critical/suboptimal marker
  for (const marker of markers) {
    const range = BIOMARKER_RANGES[marker.markerId];
    if (!range) continue;

    const isSuboptimal = marker.value < range.optimalMin || marker.value > range.optimalMax;
    if (!isSuboptimal) continue;

    if (!searchedTopics.has(marker.markerId)) {
      const articles = await searchKnowledgeForMarker(marker.markerId, 2);
      for (const article of articles) {
        // Extract key insight (first 500 chars of relevant content)
        const snippet = article.content.substring(0, 2000)
          .trim();
        insights.push(snippet);
      }
      searchedTopics.add(marker.markerId);
    }
  }

  // Search for critical risk areas
  const criticalRisks = Object.entries(riskProfile)
    .filter(([key, value]) => key !== 'timestamp' && key !== 'overallHealth' && (value as RiskScore).score < 60)
    .map(([key]) => key);

  for (const risk of criticalRisks.slice(0, 3)) { // Limit to top 3 risks
    const articles = await searchKnowledgeForRisk(risk, 2);
    for (const article of articles) {
      const snippet = article.content.substring(0, 2000)
        .trim();
      insights.push(snippet);
    }
  }

  return insights.slice(0, 20); // Return max 20 insights
}

// ============================================
// RADAR CHART GENERATION
// ============================================

const RADAR_COLORS: Record<string, string> = {
  excellent: "#22C55E", // green
  good: "#84CC16",      // lime
  attention: "#EAB308", // yellow
  action: "#F97316",    // orange
  critical: "#EF4444",  // red
};

function getRadarColor(score: number): string {
  if (score >= 80) return RADAR_COLORS.excellent;
  if (score >= 65) return RADAR_COLORS.good;
  if (score >= 50) return RADAR_COLORS.attention;
  if (score >= 35) return RADAR_COLORS.action;
  return RADAR_COLORS.critical;
}

function getRadarLabel(score: number): string {
  if (score >= 80) return "Excellent";
  if (score >= 65) return "Bon";
  if (score >= 50) return "À surveiller";
  if (score >= 35) return "Action requise";
  return "Critique";
}

export function generateBloodRadarChart(
  markers: MarkerAnalysis[],
  riskProfile: ComprehensiveRiskProfile
): BloodAnalysisRadar {
  // Define categories for radar
  const categoryDefinitions = [
    {
      name: "Hormonal",
      markers: ["testosterone_total", "testosterone_libre", "shbg", "estradiol", "cortisol", "dhea_s", "igf1", "prolactine"],
      riskScore: riskProfile.hormonalHealth
    },
    {
      name: "Thyroïde",
      markers: ["tsh", "t4_libre", "t3_libre", "t3_reverse", "anti_tpo"],
      riskScore: riskProfile.thyroidDysfunction
    },
    {
      name: "Métabolique",
      markers: ["glycemie_jeun", "hba1c", "insuline_jeun", "homa_ir", "triglycerides"],
      riskScore: riskProfile.prediabetes
    },
    {
      name: "Cardiovasculaire",
      markers: ["ldl", "hdl", "apob", "lpa", "triglycerides"],
      riskScore: riskProfile.cardiovascular
    },
    {
      name: "Inflammation",
      markers: ["crp_us", "homocysteine", "ferritine", "ggt"],
      riskScore: riskProfile.inflammation
    },
    {
      name: "Vitamines",
      markers: ["vitamine_d", "b12", "folate", "magnesium_rbc", "zinc"],
      riskScore: null // Calculate from markers
    },
    {
      name: "Foie",
      markers: ["alt", "ast", "ggt"],
      riskScore: riskProfile.liverHealth
    },
    {
      name: "Reins",
      markers: ["creatinine", "egfr"],
      riskScore: riskProfile.kidneyFunction
    }
  ];

  const categories: RadarScoreCategory[] = categoryDefinitions.map(def => {
    // Use risk score if available, otherwise calculate from markers
    let score: number;
    if (def.riskScore) {
      score = def.riskScore.score;
    } else {
      // Calculate from marker statuses
      const categoryMarkers = markers.filter(m => def.markers.includes(m.markerId));
      if (categoryMarkers.length === 0) {
        score = 75; // Default if no markers
      } else {
        const statusScores: Record<string, number> = {
          optimal: 100,
          normal: 75,
          suboptimal: 50,
          critical: 20
        };
        const total = categoryMarkers.reduce((sum, m) => sum + (statusScores[m.status] || 50), 0);
        score = Math.round(total / categoryMarkers.length);
      }
    }

    return {
      name: def.name,
      score,
      label: getRadarLabel(score),
      color: getRadarColor(score),
      markers: def.markers
    };
  });

  // Calculate overall score (weighted average)
  const weights = [1.2, 1.0, 1.3, 1.3, 1.1, 0.9, 0.9, 1.0]; // CV and metabolic weighted higher
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  const overallScore = Math.round(
    categories.reduce((sum, cat, i) => sum + cat.score * weights[i], 0) / totalWeight
  );

  // Generate interpretation
  const criticalCategories = categories.filter(c => c.score < 50);
  const strongCategories = categories.filter(c => c.score >= 80);

  let interpretation = `Score global: ${overallScore}/100. `;
  if (strongCategories.length > 0) {
    interpretation += `Points forts: ${strongCategories.map(c => c.name).join(", ")}. `;
  }
  if (criticalCategories.length > 0) {
    interpretation += `Priorités d'action: ${criticalCategories.map(c => c.name).join(", ")}.`;
  }
  if (criticalCategories.length === 0 && strongCategories.length === categories.length) {
    interpretation += "Excellent profil biologique global.";
  }

  return {
    categories,
    overallScore,
    interpretation
  };
}

// ============================================
// SUPPLEMENT RECOMMENDATIONS
// ============================================

export function generateSupplementRecommendations(
  markers: MarkerAnalysis[],
  riskProfile: ComprehensiveRiskProfile
): SupplementRecommendation[] {
  const recommendations: SupplementRecommendation[] = [];
  const addedSupplements = new Set<string>();

  const addSupplement = (
    key: string,
    priority: 1 | 2 | 3,
    targetMarkers: string[],
    condition: boolean
  ) => {
    if (condition && !addedSupplements.has(key)) {
      const base = SUPPLEMENT_DATABASE[key];
      if (base) {
        recommendations.push({
          name: base.name || key,
          dosage: base.dosage || "",
          timing: base.timing || "",
          duration: base.duration || "",
          priority,
          targetMarkers,
          mechanism: base.mechanism || "",
          citations: base.citations,
          contraindications: base.contraindications,
          brands: base.brands,
        });
        addedSupplements.add(key);
      }
    }
  };

  // METABOLIC / PREDIABETES
  if (riskProfile.prediabetes.score < 60) {
    addSupplement("berberine", 1, ["glycemie_jeun", "hba1c", "insuline_jeun", "homa_ir"], true);
    addSupplement("chromium", 2, ["glycemie_jeun", "insuline_jeun"], true);
    addSupplement("ala", 2, ["glycemie_jeun", "hba1c"], riskProfile.prediabetes.score < 50);
  }

  // CARDIOVASCULAR
  if (riskProfile.cardiovascular.score < 70) {
    addSupplement("omega3", 1, ["triglycerides", "crp_us", "hdl"], true);
    
    const ldl = markers.find(m => m.markerId === "ldl");
    const apob = markers.find(m => m.markerId === "apob");
    if ((ldl && ldl.value > 130) || (apob && apob.value > 100)) {
      addSupplement("citrus_bergamot", 2, ["ldl", "triglycerides"], true);
    }

    const lpa = markers.find(m => m.markerId === "lpa");
    if (lpa && lpa.value > 30) {
      addSupplement("niacin", 2, ["lpa"], true);
    }

    addSupplement("coq10", 2, ["cardio"], riskProfile.cardiovascular.score < 55);
  }

  // HORMONAL
  if (riskProfile.hormonalHealth.score < 65) {
    const testo = markers.find(m => m.markerId === "testosterone_total");
    const cortisol = markers.find(m => m.markerId === "cortisol");

    if (testo && testo.value < 550) {
      addSupplement("ashwagandha", 1, ["testosterone_total", "cortisol"], true);
      addSupplement("tongkat_ali", 2, ["testosterone_total", "shbg"], testo.value < 450);
    }

    addSupplement("zinc", 2, ["testosterone_total", "zinc"], true);

    if (cortisol && cortisol.value > 20) {
      addSupplement("ashwagandha", 1, ["cortisol"], true);
      addSupplement("magnesium", 1, ["cortisol", "sommeil"], true);
    }
  }

  // THYROID
  if (riskProfile.thyroidDysfunction.score < 70) {
    addSupplement("selenium", 1, ["tsh", "t3_libre", "anti_tpo"], true);
    
    const antiTpo = markers.find(m => m.markerId === "anti_tpo");
    if (!antiTpo || antiTpo.value < 50) {
      addSupplement("iodine", 2, ["tsh", "t4_libre"], true);
    }
    
    addSupplement("zinc", 2, ["t3_libre"], true);
  }

  // INFLAMMATION
  if (riskProfile.inflammation.score < 65) {
    addSupplement("omega3", 1, ["crp_us"], true);
    addSupplement("curcumin", 1, ["crp_us", "homocysteine"], true);
    addSupplement("nac", 2, ["ggt", "ferritine"], true);

    const hcy = markers.find(m => m.markerId === "homocysteine");
    if (hcy && hcy.value > 10) {
      addSupplement("b12", 1, ["homocysteine"], true);
      addSupplement("folate", 1, ["homocysteine"], true);
    }
  }

  // ANEMIA
  if (riskProfile.anemia.score < 65) {
    const ferritin = markers.find(m => m.markerId === "ferritine");
    if (ferritin && ferritin.value < 50) {
      addSupplement("iron_bisglycinate", 1, ["ferritine", "fer_serique"], true);
    }

    const b12Marker = markers.find(m => m.markerId === "b12");
    if (b12Marker && b12Marker.value < 500) {
      addSupplement("b12", 1, ["b12"], true);
    }

    const folateMarker = markers.find(m => m.markerId === "folate");
    if (folateMarker && folateMarker.value < 10) {
      addSupplement("folate", 1, ["folate"], true);
    }
  }

  // LIVER
  if (riskProfile.liverHealth.score < 70) {
    addSupplement("milk_thistle", 1, ["alt", "ast", "ggt"], true);
    addSupplement("nac", 2, ["alt", "ggt"], true);
  }

  // GENERAL WELLNESS
  const vitD = markers.find(m => m.markerId === "vitamine_d");
  if (vitD && vitD.value < 50) {
    addSupplement("vitamin_d", 1, ["vitamine_d"], true);
  } else if (!vitD) {
    // Default recommend if not tested
    addSupplement("vitamin_d", 3, ["vitamine_d"], true);
  }

  const mag = markers.find(m => m.markerId === "magnesium_rbc");
  if (mag && mag.value < 5.5) {
    addSupplement("magnesium", 1, ["magnesium_rbc"], true);
  } else {
    addSupplement("magnesium", 3, ["magnesium_rbc", "sommeil"], true);
  }

  // Sort by priority
  recommendations.sort((a, b) => a.priority - b.priority);

  return recommendations;
}

// ============================================
// PROTOCOL RECOMMENDATIONS
// ============================================

export function generateProtocolRecommendations(
  riskProfile: ComprehensiveRiskProfile
): ProtocolRecommendation[] {
  const protocols: ProtocolRecommendation[] = [];

  // METABOLIC PROTOCOLS
  if (riskProfile.prediabetes.score < 65 || riskProfile.insulinResistance.score < 65) {
    protocols.push({
      name: "Protocole Anti-Résistance Insuline",
      category: "nutrition",
      priority: 1,
      duration: "90 jours",
      frequency: "Quotidien",
      description: "Restaurer la sensibilité à l'insuline via alimentation et timing",
      steps: [
        "Manger fibres et protéines AVANT les glucides (réduit pic glycémique de 30-40%)",
        "Limiter glucides raffinés à <50g/jour",
        "Marche 15min après chaque repas principal",
        "Dernier repas 3h avant coucher minimum",
        "1 cuillère vinaigre de cidre avant repas glucidiques",
        "Considérer fenêtre alimentaire 8-10h (jeûne intermittent)"
      ],
      expectedOutcome: "Réduction HOMA-IR de 20-40%, meilleure énergie stable",
      citations: [
        "Dr. Andrew Huberman: \"Eating fiber and protein before carbohydrates reduces glucose spikes by 30-40% - a simple food sequencing hack\"",
        "Dr. Peter Attia: \"Postprandial walks of 15 minutes significantly improve glucose disposal and insulin sensitivity over time\"",
        "Examine.com: \"Apple cider vinegar before carb-heavy meals improves insulin sensitivity by slowing gastric emptying\""
      ],
      targetRiskScores: ["prediabetes", "insulinResistance", "metabolicSyndrome"],
    });
  }

  // CARDIOVASCULAR
  if (riskProfile.cardiovascular.score < 70) {
    protocols.push({
      name: "Protocole Cardio-Protection",
      category: "lifestyle",
      priority: 1,
      duration: "Continue",
      frequency: "Quotidien",
      description: "Optimiser profil lipidique et réduire risque cardiovasculaire",
      steps: [
        "Exercice Zone 2 (60-70% FCmax) 150-180min/semaine",
        "Réduire oméga-6 (huiles végétales industrielles)",
        "Augmenter oméga-3 (poissons gras 3x/semaine + supplément)",
        "Limiter alcool à 2 verres/semaine max",
        "Éliminer graisses trans (aliments ultra-transformés)",
        "Consommer 30g+ fibres/jour",
        "Légumes colorés à chaque repas (antioxydants)"
      ],
      expectedOutcome: "Amélioration ratio TG/HDL, réduction ApoB, CRP diminuée",
      citations: [
        "Dr. Andrew Huberman: \"Zone 2 cardio 150-180 min/week is the sweet spot for mitochondrial health and cardiovascular longevity\"",
        "Dr. Peter Attia: \"The TG/HDL ratio is a powerful predictor of cardiovascular risk - aim for <2 through diet and exercise\"",
        "MPMD: \"Omega-3 from fish 3x/week plus 2g EPA/DHA supplement dramatically reduces triglycerides and inflammation\""
      ],
      targetRiskScores: ["cardiovascular", "inflammation"],
    });
  }

  // HORMONAL (HOMME)
  if (riskProfile.hormonalHealth.score < 65) {
    protocols.push({
      name: "Protocole Optimisation Hormonale",
      category: "lifestyle",
      priority: 1,
      duration: "12 semaines",
      frequency: "Quotidien",
      description: "Maximiser production endogène de testostérone",
      steps: [
        "Sommeil 7-9h dans obscurité totale (production GH et testostérone)",
        "Musculation composée 3-4x/semaine (squats, deadlifts, presses)",
        "Éviter déficit calorique prolongé >500kcal",
        "Cholestérol alimentaire suffisant (4-6 œufs entiers/semaine)",
        "Zinc et magnésium via alimentation + supplémentation",
        "Réduire alcool (augmente aromatase)",
        "Exposition lumière naturelle 15min le matin",
        "Douche froide 2-3min (fin de douche)"
      ],
      expectedOutcome: "Augmentation testostérone 10-30%, meilleure libido et énergie",
      citations: [
        "Derek de MPMD: \"Heavy compound lifts 3-4x/week are non-negotiable for natural testosterone optimization - focus on squats, deadlifts, presses\"",
        "Dr. Andrew Huberman: \"7-9 hours of quality sleep in total darkness maximizes GH and testosterone production during the night\"",
        "Examine.com: \"Prolonged caloric deficits >500 kcal suppress testosterone 20-30% - maintain adequate calories for hormonal health\"",
        "MPMD: \"Morning sunlight exposure 10-20 minutes sets circadian rhythm and supports vitamin D synthesis for testosterone\""
      ],
      targetRiskScores: ["hormonalHealth"],
    });
  }

  // INFLAMMATION
  if (riskProfile.inflammation.score < 65) {
    protocols.push({
      name: "Protocole Anti-Inflammatoire",
      category: "nutrition",
      priority: 1,
      duration: "30 jours strict, puis maintenance",
      frequency: "Quotidien",
      description: "Réduire inflammation chronique systémique",
      steps: [
        "Éliminer sucres ajoutés et glucides raffinés",
        "Éliminer huiles végétales (soja, maïs, tournesol, colza)",
        "Augmenter poissons gras (saumon, sardines, maquereaux) 4x/semaine",
        "Épices anti-inflammatoires : curcuma, gingembre, cannelle",
        "Légumes crucifères quotidiens (brocoli, chou)",
        "Baies et fruits colorés (polyphénols)",
        "Réduire stress chronique (impact direct sur cytokines)"
      ],
      expectedOutcome: "Réduction CRP de 30-50%, meilleure récupération",
      citations: [
        "Dr. Rhonda Patrick: \"Eliminating seed oils (soybean, corn, canola) and increasing omega-3 dramatically shifts the inflammatory balance\"",
        "Dr. Andrew Huberman: \"Chronic stress elevates cytokines like IL-6 and TNF-alpha - managing stress is crucial for reducing inflammation\"",
        "Examine.com: \"High-dose omega-3 (2-4g EPA/DHA) reduces CRP by 30-50% in most individuals within 8-12 weeks\""
      ],
      targetRiskScores: ["inflammation", "cardiovascular"],
    });
  }

  // SLEEP / HPA
  if (riskProfile.hormonalHealth.score < 70) {
    protocols.push({
      name: "Protocole Sommeil Optimisé",
      category: "sleep",
      priority: 2,
      duration: "Continue",
      frequency: "Quotidien",
      description: "Optimiser qualité de sommeil pour récupération hormonale",
      steps: [
        "Chambre 18-19°C maximum",
        "Obscurité totale (masque si nécessaire)",
        "Arrêt écrans 1h avant coucher (lumière bleue bloque mélatonine)",
        "Heure de coucher fixe ±30min (rythme circadien)",
        "Magnésium glycinate 300mg 1h avant coucher",
        "Pas de caféine après 14h",
        "Exposition lumière vive le matin (reset circadien)"
      ],
      expectedOutcome: "Amélioration HRV, réduction cortisol matinal, meilleure récupération",
      citations: [
        "Dr. Andrew Huberman: \"Cool room temperature (18-19°C) facilitates core body temperature drop necessary for deep sleep\"",
        "Dr. Matthew Walker: \"Blue light exposure 1-2 hours before bed suppresses melatonin by 50% - use blue blockers or eliminate screens\"",
        "MPMD: \"Magnesium glycinate 300mg 1hr before bed improves sleep architecture and reduces night-time wakefulness\"",
        "Huberman Lab: \"Morning bright light exposure (10-20 min) advances circadian phase and improves nighttime sleep quality\""
      ],
      targetRiskScores: ["hormonalHealth"],
    });
  }

  // LIVER
  if (riskProfile.liverHealth.score < 70) {
    protocols.push({
      name: "Protocole Détox Hépatique",
      category: "nutrition",
      priority: 2,
      duration: "30 jours",
      frequency: "Quotidien",
      description: "Soutenir fonction hépatique et régénération",
      steps: [
        "Éliminer alcool complètement pendant 30 jours",
        "Réduire fructose (sodas, jus, excès de fruits)",
        "Légumes amers quotidiens (artichaut, endive, roquette)",
        "Chardon-marie 300mg 2x/jour",
        "NAC 600mg 2x/jour",
        "Hydratation 2-3L eau/jour",
        "Éviter médicaments hépatotoxiques si possible"
      ],
      expectedOutcome: "Réduction ALT/AST de 20-40%, meilleure digestion",
      citations: [
        "Examine.com: \"NAC 600-1200mg daily and milk thistle 300-600mg reduce elevated liver enzymes (ALT/AST) by 20-40% in 8 weeks\"",
        "Dr. Peter Attia: \"Eliminating alcohol for 30 days allows hepatic regeneration and significant improvement in liver function markers\"",
        "MPMD: \"Excess fructose from sodas and juices contributes to NAFLD - limit fructose intake to support liver health\""
      ],
      targetRiskScores: ["liverHealth"],
    });
  }

  // Sort by priority
  protocols.sort((a, b) => a.priority - b.priority);

  return protocols;
}

// ============================================
// ACTION PLAN
// ============================================

export function generateActionPlan(
  riskProfile: ComprehensiveRiskProfile,
  supplements: SupplementRecommendation[],
  protocols: ProtocolRecommendation[]
): ActionPlan {
  const immediate: string[] = [];
  const shortTerm: string[] = [];
  const mediumTerm: string[] = [];
  const longTerm: string[] = [];
  const followUp: { test: string; delay: string; reason: string }[] = [];

  // IMMEDIATE (Jours 1-7)
  immediate.push("Commander les suppléments prioritaires (Priority 1)");

  const priority1Supps = supplements.filter(s => s.priority === 1).slice(0, 3);
  for (const supp of priority1Supps) {
    immediate.push(`Commencer ${supp.name} - ${supp.dosage}`);
  }

  const criticalProtocols = protocols.filter(p => p.priority === 1);
  if (criticalProtocols.length > 0) {
    immediate.push(`Implémenter ${criticalProtocols[0].name}`);
  }

  if (riskProfile.prediabetes.score < 50 || riskProfile.cardiovascular.score < 40) {
    immediate.push("⚠️ Prendre RDV médecin pour discuter des résultats");
  }

  // SHORT-TERM (Jours 8-30)
  shortTerm.push("Évaluer tolérance aux suppléments, ajuster si nécessaire");
  shortTerm.push("Tracker alimentation 1 semaine pour identifier patterns");

  const priority2Supps = supplements.filter(s => s.priority === 2).slice(0, 2);
  for (const supp of priority2Supps) {
    shortTerm.push(`Ajouter ${supp.name} - ${supp.dosage}`);
  }

  if (protocols.length > 1) {
    shortTerm.push(`Intégrer ${protocols[1]?.name || "protocole secondaire"}`);
  }

  // MEDIUM-TERM (Jours 31-90)
  mediumTerm.push("Maintenir routine supplémentation");
  mediumTerm.push("Évaluer progrès subjectifs (énergie, sommeil, libido)");
  mediumTerm.push("Ajuster protocoles selon réponse");

  if (riskProfile.prediabetes.score < 70) {
    mediumTerm.push("Monitorer glycémie avec glucomètre si possible");
  }

  // LONG-TERM (Jours 91-180)
  longTerm.push("Recontrôle bilan sanguin complet");
  longTerm.push("Comparer évolution des marqueurs");
  longTerm.push("Ajuster stack suppléments selon nouveaux résultats");
  longTerm.push("Consolider habitudes durables");

  // FOLLOW-UP TESTS
  if (riskProfile.prediabetes.score < 70) {
    followUp.push({
      test: "HbA1c + Insuline à jeun + HOMA-IR",
      delay: "3 mois",
      reason: "Évaluer amélioration sensibilité insuline"
    });
  }

  if (riskProfile.thyroidDysfunction.score < 70) {
    followUp.push({
      test: "Panel thyroïdien complet (TSH, T4, T3, rT3, Anti-TPO)",
      delay: "6-8 semaines",
      reason: "Évaluer réponse au protocole thyroïde"
    });
  }

  if (riskProfile.cardiovascular.score < 70) {
    followUp.push({
      test: "Lipides complets (LDL, HDL, TG, ApoB, Lp(a))",
      delay: "3 mois",
      reason: "Évaluer impact protocole cardio"
    });
  }

  if (riskProfile.inflammation.score < 65) {
    followUp.push({
      test: "CRP-us + Homocystéine",
      delay: "6-8 semaines",
      reason: "Confirmer réduction inflammation"
    });
  }

  if (riskProfile.anemia.score < 70) {
    followUp.push({
      test: "Ferritine + Bilan martial",
      delay: "6-8 semaines",
      reason: "Vérifier repletion des réserves en fer"
    });
  }

  if (riskProfile.hormonalHealth.score < 65) {
    followUp.push({
      test: "Panel hormonal (Testo totale/libre, SHBG, E2, Cortisol)",
      delay: "3 mois",
      reason: "Évaluer optimisation hormonale"
    });
  }

  // Default follow-up if none specific
  if (followUp.length === 0) {
    followUp.push({
      test: "Bilan sanguin complet",
      delay: "6 mois",
      reason: "Suivi de routine"
    });
  }

  return { immediate, shortTerm, mediumTerm, longTerm, followUp };
}

// ============================================
// SYSTEM-BY-SYSTEM ANALYSIS
// ============================================

function getSystemStatus(score: number): SystemAnalysis["status"] {
  if (score >= 80) return "optimal";
  if (score >= 65) return "good";
  if (score >= 50) return "attention";
  if (score >= 35) return "action";
  return "critical";
}

export function generateSystemBySystemAnalysis(
  markers: MarkerAnalysis[],
  riskProfile: ComprehensiveRiskProfile
): ComprehensiveBloodReport["systemBySystemAnalysis"] {
  const markersBySystem: Record<string, string[]> = {
    hormonal: ["testosterone_total", "testosterone_libre", "shbg", "estradiol", "cortisol", "dhea_s", "igf1", "lh", "fsh", "prolactine"],
    thyroid: ["tsh", "t4_libre", "t3_libre", "t3_reverse", "anti_tpo"],
    metabolic: ["glycemie_jeun", "hba1c", "insuline_jeun", "homa_ir", "triglycerides", "hdl", "ldl", "apob", "lpa"],
    inflammation: ["crp_us", "homocysteine", "ferritine", "ggt"],
    hematology: ["ferritine", "fer_serique", "transferrine_sat", "b12", "folate"],
    hepatic: ["alt", "ast", "ggt"],
    renal: ["creatinine", "egfr"],
    vitamins: ["vitamine_d", "b12", "folate", "magnesium_rbc", "zinc"],
  };

  const systemRiskMap: Record<string, RiskScore> = {
    hormonal: riskProfile.hormonalHealth,
    thyroid: riskProfile.thyroidDysfunction,
    metabolic: riskProfile.prediabetes,
    inflammation: riskProfile.inflammation,
    hematology: riskProfile.anemia,
    hepatic: riskProfile.liverHealth,
    renal: riskProfile.kidneyFunction,
    vitamins: riskProfile.anemia, // Use anemia as proxy for vitamins
  };

  const systemNames: Record<string, string> = {
    hormonal: "Système Hormonal",
    thyroid: "Fonction Thyroïdienne",
    metabolic: "Métabolisme Glucidique",
    inflammation: "Profil Inflammatoire",
    hematology: "Hématologie & Fer",
    hepatic: "Fonction Hépatique",
    renal: "Fonction Rénale",
    vitamins: "Vitamines & Minéraux",
  };

  const result: any = {};

  for (const [system, markerIds] of Object.entries(markersBySystem)) {
    const systemMarkers = markers
      .filter(m => markerIds.includes(m.markerId))
      .map(m => ({
        name: m.name,
        value: m.value,
        unit: m.unit,
        status: m.status,
        interpretation: m.interpretation
      }));

    const riskScore = systemRiskMap[system];
    const score = riskScore?.score || 75;

    result[system] = {
      name: systemNames[system],
      score,
      status: getSystemStatus(score),
      markers: systemMarkers,
      keyFindings: riskScore?.factors
        .filter(f => f.contribution === "negative")
        .map(f => f.explanation)
        .slice(0, 3) || [],
      recommendations: riskScore?.recommendations?.slice(0, 4) || [],
      relatedRisks: riskScore?.markers_used || []
    } as SystemAnalysis;
  }

  return result;
}

// ============================================
// MAIN EXPORT: GENERATE FULL REPORT
// ============================================

export async function generateComprehensiveBloodReport(
  markers: BloodMarkerInput[],
  analysisResult: BloodAnalysisResult,
  riskProfile: ComprehensiveRiskProfile,
  patientName?: string
): Promise<ComprehensiveBloodReport> {
  // Generate radar chart
  const radarChart = generateBloodRadarChart(analysisResult.markers, riskProfile);

  // Generate supplement recommendations
  const supplements = generateSupplementRecommendations(analysisResult.markers, riskProfile);

  // Generate protocol recommendations
  const protocols = generateProtocolRecommendations(riskProfile);

  // Generate action plan
  const actionPlan = generateActionPlan(riskProfile, supplements, protocols);

  // Generate system-by-system analysis
  const systemBySystemAnalysis = generateSystemBySystemAnalysis(analysisResult.markers, riskProfile);

  // Get scientific insights from knowledge base
  const scientificInsights = await generateScientificContext(markers, riskProfile);

  // Generate alerts
  const criticalAlerts: string[] = [];
  const medicalReferrals: string[] = [];

  if (riskProfile.overallHealth.score < 40) {
    criticalAlerts.push("Score santé global critique - consultation médicale recommandée");
  }
  if (riskProfile.prediabetes.score < 35) {
    criticalAlerts.push("Risque pré-diabète/diabète élevé");
    medicalReferrals.push("Consultation endocrinologue/diabétologue");
  }
  if (riskProfile.cardiovascular.score < 40) {
    criticalAlerts.push("Risque cardiovasculaire élevé");
    medicalReferrals.push("Consultation cardiologique recommandée");
  }
  if (riskProfile.thyroidDysfunction.score < 40) {
    criticalAlerts.push("Dysfonction thyroïdienne significative");
    medicalReferrals.push("Consultation endocrinologue");
  }

  // Check for critical individual markers
  for (const marker of analysisResult.markers) {
    if (marker.status === "critical") {
      criticalAlerts.push(`${marker.name}: ${marker.value} ${marker.unit} - HORS NORMES`);
    }
  }

  return {
    patientName,
    analysisDate: new Date().toISOString(),
    markersAnalyzed: markers.length,
    radarChart,
    riskProfile,
    systemBySystemAnalysis,
    supplements,
    protocols,
    actionPlan,
    scientificInsights,
    criticalAlerts,
    medicalReferrals,
  };
}
