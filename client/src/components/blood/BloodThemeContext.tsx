import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { BLOOD_THEMES, type BloodTheme } from "./bloodTheme";

type ThemeMode = "light" | "dark";

type BloodThemeContextValue = {
  theme: BloodTheme;
  mode: ThemeMode;
  toggleTheme: () => void;
  setMode: (mode: ThemeMode) => void;
};

const BloodThemeContext = createContext<BloodThemeContextValue | undefined>(undefined);

export function BloodThemeProvider({
  children,
  forcedMode,
}: {
  children: React.ReactNode;
  forcedMode?: ThemeMode;
}) {
  const [mode, setMode] = useState<ThemeMode>(() => {
    if (forcedMode) return forcedMode;
    if (typeof window === "undefined") return "light";
    // Check for dark mode from parent or system preference
    const isDark = document.documentElement.classList.contains('dark') ||
                   window.matchMedia('(prefers-color-scheme: dark)').matches ||
                   document.body.style.backgroundColor === 'rgb(0, 0, 0)';
    const stored = localStorage.getItem("blood-theme-mode");
    if (stored === "dark" || stored === "light") return stored;
    return isDark ? "dark" : "light";
  });

  const theme = useMemo(() => BLOOD_THEMES[mode], [mode]);

  const toggleTheme = () => {
    if (forcedMode) return;
    setMode((prev) => (prev === "dark" ? "light" : "dark"));
  };

  useEffect(() => {
    if (!forcedMode) return;
    if (mode !== forcedMode) {
      setMode(forcedMode);
    }
  }, [forcedMode, mode]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (forcedMode) return;
    localStorage.setItem("blood-theme-mode", mode);
  }, [mode, forcedMode]);

  return (
    <BloodThemeContext.Provider value={{ theme, mode, toggleTheme, setMode }}>
      {children}
    </BloodThemeContext.Provider>
  );
}

export function useBloodTheme() {
  const ctx = useContext(BloodThemeContext);
  if (!ctx) {
    throw new Error("useBloodTheme must be used within BloodThemeProvider");
  }
  return ctx;
}
