import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link, useLocation } from "wouter";
import { useBloodTheme } from "@/components/blood/BloodThemeContext";

export default function BloodHeader({ credits }: { credits: number }) {
  const [, navigate] = useLocation();
  const { theme } = useBloodTheme();

  const handleLogout = () => {
    localStorage.removeItem("apexlabs_token");
    localStorage.removeItem("neurocore_email");
    navigate("/auth/login");
  };

  return (
    <header
      className="sticky top-0 z-40 border-b backdrop-blur"
      style={{
        backgroundColor: `${theme.background}CC`,
        borderColor: theme.borderSubtle,
      }}
    >
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/blood-dashboard" className="text-sm font-semibold tracking-[0.2em] blood-text-primary">
          APEXLABS
        </Link>
        <div className="flex items-center gap-3">
          <Badge
            className="border"
            style={{
              backgroundColor: theme.surfaceMuted,
              color: theme.textSecondary,
              borderColor: theme.borderSubtle,
            }}
          >
            Credits: {credits}
          </Badge>
          <Link href="/offers/blood-analysis">
            <Button
              variant="secondary"
              className="hover:opacity-90"
              style={{ backgroundColor: theme.primaryBlue, borderColor: theme.primaryBlue, color: "white" }}
            >
              Acheter des credits
            </Button>
          </Link>
          <Button
            variant="ghost"
            className="hover:opacity-80"
            style={{ color: theme.textSecondary }}
            onClick={handleLogout}
          >
            Deconnexion
          </Button>
        </div>
      </div>
    </header>
  );
}
