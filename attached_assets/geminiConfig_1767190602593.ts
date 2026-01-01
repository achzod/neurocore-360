/**
 * NEUROCORE 360 - Configuration centralisée Gemini
 */

export const GEMINI_CONFIG = {
  GEMINI_API_KEY: "AIzaSyCYpRQifyhMTFu-q0dihbomcOdB0eaogc4",
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
      'Introduction',
      'Moment Révélation',
      'Cause Racine en 3 phrases',
      'Radar Profil actuel et Profil optimisé'
    ],
    sectionsTeaser: [
      'Analyse visuelle photo face et dos',
      'Nutrition & métabolisme',
      'Sommeil & biohacking',
      'Axes hormonaux & bilans',
      'Feuille de Route en 6 Points',
      'Projection 30/60/90 jours'
    ],
    sectionsLocked: [
      'Sangle profonde / posture lombaires',
      'Analyse entraînement',
      'Cardio',
      'Digestion & tolérances',
      'Ton Potentiel Inexploité',
      'Ce qui va changer si on travaille ensemble',
      'Réassurance émotionnelle',
      'Synthèse clinique globale et Conclusion transformationnelle'
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
