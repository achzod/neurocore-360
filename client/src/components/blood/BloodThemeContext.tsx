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

export function BloodThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>(() => {
    if (typeof window === "undefined") return "light";
    const stored = localStorage.getItem("blood-theme-mode");
    if (stored === "dark" || stored === "light") return stored;
    return "light";
  });

  const theme = useMemo(() => BLOOD_THEMES[mode], [mode]);

  const toggleTheme = () => {
    setMode((prev) => (prev === "dark" ? "light" : "dark"));
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("blood-theme-mode", mode);
  }, [mode]);

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
