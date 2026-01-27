import { Moon, Sun } from "lucide-react";
import { motion } from "framer-motion";
import { useBloodTheme } from "./BloodThemeContext";

export function ThemeToggle() {
  const { mode, toggleTheme, theme } = useBloodTheme();

  return (
    <motion.button
      type="button"
      onClick={toggleTheme}
      className="relative flex h-10 w-10 items-center justify-center rounded-lg"
      style={{
        backgroundColor: theme.surfaceMuted,
        border: `1px solid ${theme.borderDefault}`,
      }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      aria-label="Changer de theme"
    >
      <motion.span
        initial={false}
        animate={{
          rotate: mode === "dark" ? 0 : 180,
          scale: mode === "dark" ? 1 : 0,
          opacity: mode === "dark" ? 1 : 0,
        }}
        transition={{ duration: 0.25 }}
        className="absolute"
      >
        <Moon size={18} style={{ color: theme.textPrimary }} />
      </motion.span>
      <motion.span
        initial={false}
        animate={{
          rotate: mode === "light" ? 0 : 180,
          scale: mode === "light" ? 1 : 0,
          opacity: mode === "light" ? 1 : 0,
        }}
        transition={{ duration: 0.25 }}
        className="absolute"
      >
        <Sun size={18} style={{ color: theme.textPrimary }} />
      </motion.span>
    </motion.button>
  );
}
