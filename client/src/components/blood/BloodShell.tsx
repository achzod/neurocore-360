import type { PropsWithChildren } from "react";
import { BLOOD_THEME } from "@/components/blood/bloodTheme";

export default function BloodShell({ children }: PropsWithChildren) {
  return (
    <div className="blood-uh min-h-screen text-white relative overflow-hidden" style={{ backgroundColor: BLOOD_THEME.background }}>
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
          backgroundImage: `linear-gradient(to right, ${BLOOD_THEME.grid} 1px, transparent 1px), linear-gradient(to bottom, ${BLOOD_THEME.grid} 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }}
      />
      <div className="relative">{children}</div>
      <style>{`
        :root { --blood-primary: ${BLOOD_THEME.primaryBlue}; }
      `}</style>
    </div>
  );
}
