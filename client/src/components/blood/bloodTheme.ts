export type BloodTheme = {
  background: string;
  backgroundGradient: string;
  surface: string;
  surfaceMuted: string;
  surfaceElevated: string;
  surfaceGlass: string;
  primaryBlue: string;
  primaryBlueHover: string;
  primaryGlow: string;
  accentGold: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  borderSubtle: string;
  borderDefault: string;
  borderStrong: string;
  borderGlow: string;
  border: string;
  grid: string;
  shadowSoft: string;
  shadowMedium: string;
  shadowStrong: string;
  status: {
    optimal: string;
    optimalBg: string;
    normal: string;
    normalBg: string;
    suboptimal: string;
    suboptimalBg: string;
    critical: string;
    criticalBg: string;
  };
};

export const BLOOD_THEME_LIGHT: BloodTheme = {
  background: "#FAFAFA",
  backgroundGradient: "linear-gradient(180deg, #FAFAFA 0%, #F0F4F8 100%)",
  surface: "#FFFFFF",
  surfaceMuted: "#F5F7FA",
  surfaceElevated: "#FFFFFF",
  surfaceGlass: "rgba(255, 255, 255, 0.85)",
  primaryBlue: "#0891B2",
  primaryBlueHover: "#06B6D4",
  primaryGlow: "rgba(8, 145, 178, 0.15)",
  accentGold: "#D97706",
  textPrimary: "#0F172A",
  textSecondary: "#475569",
  textTertiary: "#94A3B8",
  borderSubtle: "rgba(15, 23, 42, 0.06)",
  borderDefault: "rgba(15, 23, 42, 0.10)",
  borderStrong: "rgba(15, 23, 42, 0.18)",
  borderGlow: "rgba(8, 145, 178, 0.3)",
  border: "rgba(15, 23, 42, 0.10)",
  grid: "rgba(15, 23, 42, 0.04)",
  shadowSoft: "0 1px 2px rgba(0, 0, 0, 0.04)",
  shadowMedium: "0 4px 12px rgba(0, 0, 0, 0.06)",
  shadowStrong: "0 8px 30px rgba(0, 0, 0, 0.08)",
  status: {
    optimal: "#059669",
    optimalBg: "rgba(5, 150, 105, 0.08)",
    normal: "#0891B2",
    normalBg: "rgba(8, 145, 178, 0.08)",
    suboptimal: "#D97706",
    suboptimalBg: "rgba(217, 119, 6, 0.08)",
    critical: "#DC2626",
    criticalBg: "rgba(220, 38, 38, 0.08)",
  },
};

export const BLOOD_THEME_DARK: BloodTheme = {
  background: "#030712",
  backgroundGradient: "linear-gradient(180deg, #030712 0%, #0A0F1A 50%, #030712 100%)",
  surface: "#0D1117",
  surfaceMuted: "#161B22",
  surfaceElevated: "#1C2128",
  surfaceGlass: "rgba(13, 17, 23, 0.75)",
  primaryBlue: "#22D3EE",
  primaryBlueHover: "#67E8F9",
  primaryGlow: "rgba(34, 211, 238, 0.12)",
  accentGold: "#FBBF24",
  textPrimary: "#F8FAFC",
  textSecondary: "#94A3B8",
  textTertiary: "#64748B",
  borderSubtle: "rgba(248, 250, 252, 0.04)",
  borderDefault: "rgba(248, 250, 252, 0.08)",
  borderStrong: "rgba(248, 250, 252, 0.14)",
  borderGlow: "rgba(34, 211, 238, 0.25)",
  border: "rgba(248, 250, 252, 0.08)",
  grid: "rgba(248, 250, 252, 0.03)",
  shadowSoft: "0 1px 2px rgba(0, 0, 0, 0.3)",
  shadowMedium: "0 4px 16px rgba(0, 0, 0, 0.4)",
  shadowStrong: "0 12px 40px rgba(0, 0, 0, 0.5)",
  status: {
    optimal: "#34D399",
    optimalBg: "rgba(52, 211, 153, 0.12)",
    normal: "#22D3EE",
    normalBg: "rgba(34, 211, 238, 0.12)",
    suboptimal: "#FBBF24",
    suboptimalBg: "rgba(251, 191, 36, 0.12)",
    critical: "#F87171",
    criticalBg: "rgba(248, 113, 113, 0.12)",
  },
};

export const BLOOD_THEMES = {
  light: BLOOD_THEME_LIGHT,
  dark: BLOOD_THEME_DARK,
} as const;
