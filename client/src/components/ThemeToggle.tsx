import { Button } from "@/components/ui/button";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "./ThemeProvider";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          data-testid="button-theme-toggle"
          aria-label={theme === "dark" ? "Passer au mode clair" : "Passer au mode sombre"}
        >
          {theme === "dark" ? (
            <Sun className="h-5 w-5" data-testid="icon-sun" />
          ) : (
            <Moon className="h-5 w-5" data-testid="icon-moon" />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>{theme === "dark" ? "Mode clair" : "Mode sombre"}</p>
      </TooltipContent>
    </Tooltip>
  );
}
