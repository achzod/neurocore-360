import type { Theme } from "./types";

export const ULTRAHUMAN_THEMES: Theme[] = [
  {
    id: "ultrahuman",
    name: "M1 Black",
    type: "dark",
    colors: {
      primary: "#FCDD00",
      background: "#000000",
      surface: "#0a0a0a",
      border: "rgba(252, 221, 0, 0.15)",
      text: "#F8FAFC",
      textMuted: "#D1D5DB",
      grid: "rgba(252, 221, 0, 0.05)",
      glow: "rgba(252, 221, 0, 0.2)",
    },
  },
  {
    id: "metabolic",
    name: "Claude Creme",
    type: "light",
    colors: {
      primary: "#C46A2B",
      background: "#F4EDE3",
      surface: "#EFE4D3",
      border: "rgba(196, 106, 43, 0.2)",
      text: "#1C1209",
      textMuted: "#6B5B4D",
      grid: "rgba(196, 106, 43, 0.08)",
      glow: "rgba(196, 106, 43, 0.15)",
    },
  },
  {
    id: "titanium",
    name: "Titanium Light",
    type: "light",
    colors: {
      primary: "#000000",
      background: "#F2F2F2",
      surface: "#FFFFFF",
      border: "rgba(0, 0, 0, 0.08)",
      text: "#171717",
      textMuted: "#737373",
      grid: "rgba(0, 0, 0, 0.04)",
      glow: "rgba(0, 0, 0, 0.05)",
    },
  },
  {
    id: "organic",
    name: "Sand Stone",
    type: "light",
    colors: {
      primary: "#A85A32",
      background: "#F0EFE9",
      surface: "#E6E4DD",
      border: "rgba(168, 90, 50, 0.1)",
      text: "#292524",
      textMuted: "#78716C",
      grid: "rgba(168, 90, 50, 0.05)",
      glow: "rgba(168, 90, 50, 0.1)",
    },
  },
];
