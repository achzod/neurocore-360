export type BloodTheme = {
  background: string;
  surface: string;
  surfaceMuted: string;
  surfaceElevated: string;
  primaryBlue: string;
  primaryBlueHover: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  borderSubtle: string;
  borderDefault: string;
  borderStrong: string;
  border: string;
  grid: string;
  status: {
    optimal: string;
    normal: string;
    suboptimal: string;
    critical: string;
  };
};

export const BLOOD_THEME_LIGHT: BloodTheme = {
  background: "#F7F5F0",
  surface: "#FFFFFF",
  surfaceMuted: "#F1EFE8",
  surfaceElevated: "#FFFFFF",
  primaryBlue: "rgb(2,121,232)",
  primaryBlueHover: "rgb(25,135,242)",
  textPrimary: "#0F172A",
  textSecondary: "#475569",
  textTertiary: "#64748B",
  borderSubtle: "rgba(15, 23, 42, 0.08)",
  borderDefault: "rgba(15, 23, 42, 0.14)",
  borderStrong: "rgba(15, 23, 42, 0.24)",
  border: "rgba(15, 23, 42, 0.14)",
  grid: "rgba(15, 23, 42, 0.05)",
  status: {
    optimal: "#10B981",
    normal: "#3B82F6",
    suboptimal: "#F59E0B",
    critical: "#EF4444",
  },
};

export const BLOOD_THEME_DARK: BloodTheme = {
  background: "#000000",
  surface: "#0a0a0a",
  surfaceMuted: "#1a1a1a",
  surfaceElevated: "#141414",
  primaryBlue: "#00E5FF",
  primaryBlueHover: "#2AF2FF",
  textPrimary: "rgba(255,255,255,1)",
  textSecondary: "rgba(255,255,255,0.75)",
  textTertiary: "rgba(255,255,255,0.45)",
  borderSubtle: "rgba(255,255,255,0.08)",
  borderDefault: "rgba(255,255,255,0.13)",
  borderStrong: "rgba(255,255,255,0.2)",
  border: "rgba(255,255,255,0.13)",
  grid: "rgba(255,255,255,0.05)",
  status: {
    optimal: "#10B981",
    normal: "#3B82F6",
    suboptimal: "#F59E0B",
    critical: "#EF4444",
  },
};

export const BLOOD_THEMES = {
  light: BLOOD_THEME_LIGHT,
  dark: BLOOD_THEME_DARK,
} as const;
