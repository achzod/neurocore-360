/**
 * NEUROCORE 360 - Configuration centralisée Gemini
 */

export const GEMINI_CONFIG = {
  GEMINI_API_KEY: "AIzaSyAUqhl7sr7gmtoYdoLhRj-wg68l9xuzTpk",
  GEMINI_MODEL: "gemini-2.5-pro",
  GEMINI_TEMPERATURE: 0.85,
  GEMINI_MAX_TOKENS: 8000,
  GEMINI_MAX_RETRIES: 3,
  GEMINI_SLEEP_BETWEEN: 3,
};

export const AUDIT_TIERS = {
  FREE: {
    name: 'Gratuit',
    price: 0,
    sectionsUnlocked: [
      'Executive Summary',
      'Synthese Clinique et Prochaine Etape',
      'Cause Racine en 3 phrases'
    ],
    sectionsTeaser: [
      'Analyse visuelle et posturale complete',
      'Analyse metabolisme et nutrition',
      'Analyse sommeil et recuperation',
      'Analyse axes hormonaux'
    ],
    sectionsLocked: [
      'Analyse biomecanique et sangle profonde',
      'Analyse entrainement et periodisation',
      'Analyse systeme cardiovasculaire',
      'Analyse digestion et microbiote',
      'Protocole Matin Anti-Cortisol',
      'Protocole Soir Verrouillage Sommeil',
      'Protocole Digestion 14 Jours',
      'Protocole Bureau Anti-Sedentarite',
      'Protocole Entrainement Personnalise',
      'Plan d\'action 30/60/90 Jours',
      'KPI et Tableau de Bord',
      'Stack de Supplements Personnalise'
    ]
  },
  PREMIUM: {
    name: 'Premium',
    price: 49,
    sectionsUnlocked: 'ALL'
  },
  ELITE: {
    name: 'Elite',
    price: 149,
    sectionsUnlocked: 'ALL',
    extras: ['Appel 30min', 'Suivi 7 jours', 'Plan personnalisé PDF']
  }
};
