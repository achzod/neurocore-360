export interface Metric {
  label: string;
  value: number;
  max: number;
  description: string;
  key: string;
}

export interface SectionContent {
  id: string;
  title: string;
  subtitle?: string;
  content: string; // HTML string for rich text
  chips?: string[];
  metrics?: Metric[];
}

export interface ReportData {
  globalScore: number;
  metrics: Metric[];
  sections: SectionContent[];
}

export interface Theme {
  id: string;
  name: string;
  type: 'dark' | 'light';
  colors: {
    primary: string;      // Main accent color
    background: string;   // Page background
    surface: string;      // Card/Panel background
    border: string;       // Border color
    text: string;         // Primary text
    textMuted: string;    // Secondary text
    grid: string;         // Background grid color
    glow: string;         // Glow effects
  };
}