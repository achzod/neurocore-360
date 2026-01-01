// Design Tokens Material/Oura pour le redesign
// Ce fichier contient les constantes de design qui seront intégrées dans exportService.ts

export const OURA_DESIGN_TOKENS = {
  // Surfaces (Material Design style)
  surfaces: {
    bg: '#0B0B0F',           // Fond principal
    surface0: '#121212',     // Surface de base
    surface1: '#1E1E1E',     // Card low
    surface2: '#242424',     // Card mid
    surface3: '#2E2E2E',     // Modals/hero panels
  },
  // Texte
  text: {
    primary: 'rgba(255,255,255,0.92)',
    muted: 'rgba(255,255,255,0.65)',
    faint: 'rgba(255,255,255,0.42)',
  },
  // Accent (limité, pas saturé)
  accent: {
    primary: '#5eead4',      // Teal (désaturé)
    secondary: '#34d399',    // Vert doux (OK uniquement)
    warning: '#f59e0b',      // Ambre doux (à corriger uniquement)
  },
  // Bordure
  border: 'rgba(255,255,255,0.06)',
  // Typographie
  typo: {
    scoreTitle: '48-64px',   // Titre score (selon écran)
    h2: '18-22px',           // H2 sections
    body: '14-16px',         // Texte
    lineHeight: '1.6',
  },
  // Espacements (grille 12 colonnes desktop, 4 mobile)
  spacing: {
    cardPadding: '16-20px',
    sectionGap: '24-32px',
    containerMaxWidth: '1200px',
  }
};

