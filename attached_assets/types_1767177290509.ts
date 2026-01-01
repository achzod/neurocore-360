/**
 * NEUROCORE 360 - Types TypeScript
 */

// Données client du questionnaire (140 questions)
export interface ClientData {
  // Section 1: Profil de Base
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

  // Section 2: Composition Corporelle
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

  // Section 3: Métabolisme & Énergie
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

  // ... (les autres sections)
  [key: string]: any;
}

// Analyse photo
export interface PhotoAnalysis {
  fatDistribution: {
    pattern: 'androide' | 'gynoide' | 'mixte';
    zones: string[];
    severity: 'legere' | 'moderee' | 'importante';
  };
  muscleBalance: {
    hautCorps: number; // 1-10
    basCorps: number; // 1-10
    symmetrie: number; // 1-10
    groupesAvance: string[];
    groupesRetard: string[];
  };
  postureIssues: {
    epaules: string;
    bassin: string;
    colonne: string;
    asymetries: string[];
  };
  structureOsseuse: {
    largeurEpaules: string;
    cageThoracique: string;
    ratioEpaulesTaille: string;
  };
}

// Résultat de génération d'audit
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

// Sections de l'audit
export type SectionName = 
  | "Introduction"
  | "Analyse visuelle photo face et dos"
  | "Sangle profonde / posture lombaires"
  | "Analyse entraînement"
  | "Cardio"
  | "Nutrition & métabolisme"
  | "Sommeil & biohacking"
  | "Digestion & tolérances"
  | "Axes hormonaux & bilans"
  | "Moment Révélation"
  | "Cause Racine en 3 phrases"
  | "Radar Profil actuel et Profil optimisé"
  | "Ton Potentiel Inexploité"
  | "Feuille de Route en 6 Points"
  | "Projection 30/60/90 jours"
  | "Ce qui va changer si on travaille ensemble"
  | "Réassurance émotionnelle"
  | "Stack de Suppléments"
  | "Synthèse clinique globale et Conclusion transformationnelle";

// Tier d'audit
export type AuditTier = 'FREE' | 'PREMIUM';


