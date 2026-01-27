import type { PropsWithChildren } from "react";
import { useBloodTheme } from "@/components/blood/BloodThemeContext";

export default function BloodShell({ children }: PropsWithChildren) {
  const { theme } = useBloodTheme();

  return (
    <div
      className="blood-uh min-h-screen relative overflow-hidden"
      style={{
        backgroundColor: theme.background,
        color: theme.textPrimary,
        ["--blood-bg" as string]: theme.background,
        ["--blood-surface" as string]: theme.surface,
        ["--blood-surface-muted" as string]: theme.surfaceMuted,
        ["--blood-surface-elevated" as string]: theme.surfaceElevated,
        ["--blood-text-primary" as string]: theme.textPrimary,
        ["--blood-text-secondary" as string]: theme.textSecondary,
        ["--blood-text-tertiary" as string]: theme.textTertiary,
        ["--blood-border-subtle" as string]: theme.borderSubtle,
        ["--blood-border-default" as string]: theme.borderDefault,
        ["--blood-border-strong" as string]: theme.borderStrong,
        ["--blood-primary" as string]: theme.primaryBlue,
        ["--blood-grid" as string]: theme.grid,
      }}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 50% 0%, rgba(2,121,232,0.14) 0%, transparent 60%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-35"
        style={{
          backgroundImage: `linear-gradient(to right, ${theme.grid} 1px, transparent 1px), linear-gradient(to bottom, ${theme.grid} 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }}
      />
      <div className="relative">{children}</div>
    </div>
  );
}
