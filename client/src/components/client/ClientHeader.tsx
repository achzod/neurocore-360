import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ClientHeaderProps {
  credits: number;
  variant?: "dark" | "light";
}

export function ClientHeader({ credits, variant = "dark" }: ClientHeaderProps) {
  const [, navigate] = useLocation();
  const isLight = variant === "light";
  const headerClass = isLight
    ? "sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur"
    : "sticky top-0 z-40 border-b border-white/10 bg-black/80 backdrop-blur";
  const brandClass = isLight
    ? "text-sm font-semibold tracking-[0.2em] text-slate-900"
    : "text-sm font-semibold tracking-[0.2em] text-white";
  const badgeClass = isLight ? "bg-slate-100 text-slate-700" : "bg-white/10 text-white";
  const buyButtonClass = isLight
    ? "bg-slate-900 text-white hover:bg-slate-800"
    : "bg-white/10 text-white hover:bg-white/20";
  const logoutClass = isLight ? "text-slate-500 hover:text-slate-900" : "text-white/60 hover:text-white";

  const handleLogout = () => {
    localStorage.removeItem("apexlabs_token");
    localStorage.removeItem("neurocore_email");
    navigate("/auth/login");
  };

  return (
    <header className={headerClass}>
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/dashboard" className={brandClass}>
          APEXLABS
        </Link>
        <div className="flex items-center gap-4">
          <Badge className={badgeClass}>
            Credits: {credits}
          </Badge>
          <Link href="/offers/blood-analysis">
            <Button variant="secondary" className={buyButtonClass}>
              Acheter des credits
            </Button>
          </Link>
          <Button variant="ghost" className={logoutClass} onClick={handleLogout}>
            Logout
          </Button>
        </div>
      </div>
    </header>
  );
}
