/**
 * NEUROCORE 360 - Types TypeScript
 */

export interface ClientData {
  'prenom'?: string;
  'nom'?: string;
  'age'?: string;
  'sexe'?: string;
  'taille'?: string;
  'poids'?: string;
  'objectif'?: string;
  'type-travail'?: string;
  'niveau-activite'?: string;
  'antecedents-medicaux'?: string[];
  'medicaments'?: string;
  'allergies'?: string[];

  'tour-taille'?: string;
  'tour-hanches'?: string;
  'masse-grasse'?: string;
  'objectif-poids'?: string;
  'evolution-poids'?: string;
  'nb-regimes'?: string;
  'morphologie'?: string;
  'zones-stockage'?: string[];
  'retention-eau'?: string;
  'cellulite'?: string;

  'energie-matin'?: string;
  'energie-apres-midi'?: string;
  'energie-soir'?: string;
  'coups-fatigue'?: string;
  'heure-fatigue'?: string;
  'frilosite'?: string;
  'transpiration'?: string;
  'metabolisme'?: string;
  'envies-sucre'?: string;
  'frequence-faim'?: string;

  [key: string]: any;
}

export interface PhotoAnalysis {
  fatDistribution: {
    visceral: "faible" | "modere" | "eleve" | "tres-eleve";
    subcutaneous: "faible" | "modere" | "eleve" | "tres-eleve";
    zones: string[];
    estimatedBF: string;
    waistToHipRatio: string;
  };
  posture: {
    headPosition: string;
    shoulderAlignment: string;
    spineAlignment: string;
    pelvicTilt: string;
    kneesAlignment: string;
    overallScore: number;
    issues: string[];
  };
  muscularBalance: {
    upperBody: string;
    lowerBody: string;
    leftRightSymmetry: string;
    anteriorPosterior: string;
    weakAreas: string[];
    strongAreas: string[];
  };
  medicalObservations: {
    skinCondition: string[];
    edemaPresence: string;
    vascularSigns: string[];
    potentialConcerns: string[];
  };
  recommendations: {
    posturalCorrections: string[];
    muscleGroupsToTarget: string[];
    mobilityWork: string[];
    medicalFollowUp: string[];
  };
  summary: string;
  confidenceLevel: number;
}

export interface AuditResult {
  success: boolean;
  txt?: string;
  html?: string;
  clientName?: string;
  error?: string;
  metadata?: {
    generationTimeMs: number;
    sectionsGenerated: number;
    modelUsed: string;
  };
}

export type SectionName = 
  // Executive Summary
  | "Executive Summary"
  // Analyses profondes
  | "Analyse visuelle et posturale complete"
  | "Analyse biomecanique et sangle profonde"
  | "Analyse entrainement et periodisation"
  | "Analyse systeme cardiovasculaire"
  | "Analyse metabolisme et nutrition"
  | "Analyse sommeil et recuperation"
  | "Analyse digestion et microbiote"
  | "Analyse axes hormonaux"
  // Protocoles fermes
  | "Protocole Matin Anti-Cortisol"
  | "Protocole Soir Verrouillage Sommeil"
  | "Protocole Digestion 14 Jours"
  | "Protocole Bureau Anti-Sedentarite"
  | "Protocole Entrainement Personnalise"
  // Plan concret
  | "Plan Semaine par Semaine 30-60-90"
  | "KPI et Tableau de Bord"
  | "Stack Supplements Optimise"
  // Conclusion
  | "Synthese et Prochaines Etapes";

export type AuditTier = 'FREE' | 'PREMIUM';
