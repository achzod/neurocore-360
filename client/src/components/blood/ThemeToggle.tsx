import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBloodTheme } from "./BloodThemeContext";

export function ThemeToggle() {
  const { mode, toggleTheme, theme } = useBloodTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className="h-9 w-9 rounded-full transition-colors"
      style={{ color: theme.textSecondary }}
      aria-label={mode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
    >
      {mode === "dark" ? (
        <Sun className="h-5 w-5" />
      ) : (
        <Moon className="h-5 w-5" />
      )}
    </Button>
  );
}
