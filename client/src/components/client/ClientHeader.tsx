import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ClientHeaderProps {
  credits: number;
}

export function ClientHeader({ credits }: ClientHeaderProps) {
  const [, navigate] = useLocation();

  const handleLogout = () => {
    localStorage.removeItem("apexlabs_token");
    localStorage.removeItem("neurocore_email");
    navigate("/auth/login");
  };

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-black/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/dashboard" className="text-sm font-semibold tracking-[0.2em] text-white">
          APEXLABS
        </Link>
        <div className="flex items-center gap-4">
          <Badge className="bg-white/10 text-white">
            Credits: {credits}
          </Badge>
          <Link href="/offers/blood-analysis">
            <Button variant="secondary" className="bg-white/10 text-white hover:bg-white/20">
              Acheter des credits
            </Button>
          </Link>
          <Button variant="ghost" className="text-white/60 hover:text-white" onClick={handleLogout}>
            Logout
          </Button>
        </div>
      </div>
    </header>
  );
}
