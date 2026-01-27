export const BLOOD_THEME_LIGHT = {
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
  grid: "rgba(15, 23, 42, 0.05)",
  status: {
    optimal: "#10B981",
    normal: "#3B82F6",
    suboptimal: "#F59E0B",
    critical: "#EF4444",
  },
} as const;

export const BLOOD_THEME_DARK = {
  background: "#000000",
  surface: "#0a0a0a",
  surfaceMuted: "#1a1a1a",
  surfaceElevated: "#141414",
  primaryBlue: "rgb(2,121,232)",
  primaryBlueHover: "rgb(25,135,242)",
  textPrimary: "rgba(255,255,255,1)",
  textSecondary: "rgba(255,255,255,0.7)",
  textTertiary: "rgba(255,255,255,0.5)",
  borderSubtle: "rgba(255,255,255,0.08)",
  borderDefault: "rgba(255,255,255,0.13)",
  borderStrong: "rgba(255,255,255,0.2)",
  grid: "rgba(255,255,255,0.05)",
  status: {
    optimal: "#10B981",
    normal: "#3B82F6",
    suboptimal: "#F59E0B",
    critical: "#EF4444",
  },
} as const;

export type BloodTheme = typeof BLOOD_THEME_LIGHT;

export const BLOOD_THEMES = {
  light: BLOOD_THEME_LIGHT,
  dark: BLOOD_THEME_DARK,
} as const;
