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
    return "dark";
  });

  const theme = useMemo(() => BLOOD_THEMES[mode], [mode]);

  const toggleTheme = () => {
    setMode((prev) => (prev === "dark" ? "light" : "dark"));
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("blood-theme-mode", "dark");
  }, []);

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
