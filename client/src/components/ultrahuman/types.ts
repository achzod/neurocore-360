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
}

export interface ReportData {
  globalScore: number;
  metrics: Metric[];
  sections: SectionContent[];
  clientName: string;
  generatedAt: string;
  auditType: string;
}

export interface Theme {
  id: string;
  name: string;
  type: 'dark' | 'light';
  colors: {
    primary: string;
    background: string;
    surface: string;
    border: string;
    text: string;
    textMuted: string;
    grid: string;
    glow: string;
  };
}
