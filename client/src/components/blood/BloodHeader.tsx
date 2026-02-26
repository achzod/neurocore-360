import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link, useLocation } from "wouter";
import { useBloodTheme } from "@/components/blood/BloodThemeContext";
import { ThemeToggle } from "@/components/blood/ThemeToggle";
import { motion } from "framer-motion";
import { ChevronLeft, Coins, LogOut, Share2, Sparkles } from "lucide-react";

type BloodHeaderProps = {
  credits?: number;
  title?: string;
  subtitle?: string;
  showShare?: boolean;
  onShare?: () => void;
  showAccountActions?: boolean;
  showBackButton?: boolean;
};

export default function BloodHeader({
  credits,
  title,
  subtitle,
  showShare = false,
  onShare,
  showAccountActions,
  showBackButton = false,
}: BloodHeaderProps) {
  const [, navigate] = useLocation();
  const { theme, mode } = useBloodTheme();

  const handleLogout = () => {
    localStorage.removeItem("apexlabs_token");
    localStorage.removeItem("neurocore_email");
    navigate("/auth/login");
  };

  const shouldShowAccount = showAccountActions ?? typeof credits === "number";

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="sticky top-0 z-40"
      style={{
        background: mode === "dark"
          ? "linear-gradient(180deg, rgba(3, 7, 18, 0.98) 0%, rgba(3, 7, 18, 0.92) 100%)"
          : "linear-gradient(180deg, rgba(250, 250, 250, 0.98) 0%, rgba(250, 250, 250, 0.92) 100%)",
        backdropFilter: "blur(24px) saturate(180%)",
        WebkitBackdropFilter: "blur(24px) saturate(180%)",
        borderBottom: `1px solid ${theme.borderSubtle}`,
      }}
    >
      <div className="mx-auto flex w-full max-w-6xl items-center gap-4 px-4 sm:px-6 py-4">
        {/* Left section */}
        <div className="flex items-center gap-3">
          {showBackButton && (
            <motion.button
              whileHover={{ scale: 1.05, x: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate("/blood-dashboard")}
              className="p-2 rounded-lg transition-colors"
              style={{
                color: theme.textSecondary,
                background: "transparent",
              }}
            >
              <ChevronLeft className="h-5 w-5" />
            </motion.button>
          )}

          <Link href="/blood-dashboard" className="group flex items-center gap-2">
            <motion.div
              className="relative"
              whileHover={{ scale: 1.02 }}
              transition={{ type: "spring", stiffness: 400 }}
            >
              {/* Logo glow effect */}
              <div
                className="absolute inset-0 blur-xl opacity-30 group-hover:opacity-50 transition-opacity duration-500"
                style={{ background: theme.primaryBlue }}
              />
              <span
                className="relative text-sm font-bold tracking-[0.25em] uppercase"
                style={{
                  color: theme.textPrimary,
                  textShadow: mode === "dark" ? `0 0 30px ${theme.primaryGlow}` : "none",
                }}
              >
                APEX<span style={{ color: theme.primaryBlue }}>LABS</span>
              </span>
            </motion.div>
          </Link>
        </div>

        {/* Center section - Title */}
        <div className="flex-1 text-center">
          {title && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="flex flex-col items-center"
            >
              <div className="flex items-center gap-2">
                <h1
                  className="text-sm font-semibold tracking-wide"
                  style={{ color: theme.textPrimary }}
                >
                  {title}
                </h1>
                <Sparkles
                  className="h-3.5 w-3.5"
                  style={{ color: theme.accentGold, opacity: 0.8 }}
                />
              </div>
              {subtitle && (
                <p
                  className="text-xs tracking-wide mt-0.5"
                  style={{ color: theme.textTertiary }}
                >
                  {subtitle}
                </p>
              )}
            </motion.div>
          )}
        </div>

        {/* Right section - Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          <ThemeToggle />

          {showShare && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onShare}
              className="p-2.5 rounded-xl transition-all duration-200"
              style={{
                border: `1px solid ${theme.borderDefault}`,
                color: theme.textSecondary,
                background: theme.surfaceGlass,
              }}
            >
              <Share2 className="h-4 w-4" />
            </motion.button>
          )}

          {shouldShowAccount && (
            <>
              {/* Credits badge - Premium style */}
              <motion.div
                whileHover={{ scale: 1.02 }}
                className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl"
                style={{
                  background: `linear-gradient(135deg, ${theme.surfaceMuted} 0%, ${theme.surface} 100%)`,
                  border: `1px solid ${theme.borderSubtle}`,
                  boxShadow: theme.shadowSoft,
                }}
              >
                <Coins className="h-4 w-4" style={{ color: theme.accentGold }} />
                <span
                  className="text-sm font-medium tabular-nums"
                  style={{ color: theme.textPrimary }}
                >
                  {credits ?? 0}
                </span>
                <span
                  className="text-xs"
                  style={{ color: theme.textTertiary }}
                >
                  crédits
                </span>
              </motion.div>

              {/* Buy credits button */}
              <Link href="/offers/blood-analysis">
                <motion.button
                  whileHover={{ scale: 1.02, y: -1 }}
                  whileTap={{ scale: 0.98 }}
                  className="hidden sm:flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200"
                  style={{
                    background: `linear-gradient(135deg, ${theme.primaryBlue} 0%, ${theme.primaryBlueHover} 100%)`,
                    color: "#FFFFFF",
                    boxShadow: `0 4px 14px ${theme.primaryGlow}`,
                  }}
                >
                  <Sparkles className="h-4 w-4" />
                  <span className="hidden lg:inline">Acheter des crédits</span>
                  <span className="lg:hidden">+</span>
                </motion.button>
              </Link>

              {/* Logout */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleLogout}
                className="p-2.5 rounded-xl transition-colors"
                style={{
                  color: theme.textTertiary,
                }}
              >
                <LogOut className="h-4 w-4" />
              </motion.button>
            </>
          )}
        </div>
      </div>
    </motion.header>
  );
}
