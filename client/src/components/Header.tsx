import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Menu, X, LogOut, User, ChevronDown } from "lucide-react";
import { useState, useEffect } from "react";
import { ThemeToggle } from "./ThemeToggle";
import { AchzodMonogram } from "./AchzodLogo";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Header() {
  const [location, navigate] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    const email = localStorage.getItem("neurocore_email");
    setUserEmail(email);
  }, [location]);

  const handleLogout = () => {
    localStorage.removeItem("neurocore_email");
    setUserEmail(null);
    navigate("/");
  };

  const isLanding = location === "/" || location === "/audit-complet";
  const isDashboard = location.startsWith("/dashboard");

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary p-2">
              <AchzodMonogram className="h-full w-full text-primary-foreground" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold tracking-tight" data-testid="text-brand-name">
                NEUROCORE<span className="text-primary">360°</span>
              </span>
              <span className="hidden text-xs text-muted-foreground sm:block">
                by ACHZOD
              </span>
            </div>
          </Link>

          <nav className="hidden items-center gap-6 md:flex">
            {isLanding && (
              <>
                <a
                  href="#domaines"
                  className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                  data-testid="link-domains"
                >
                  15 Domaines
                </a>
                <a
                  href="#process"
                  className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                  data-testid="link-process"
                >
                  Comment ca marche
                </a>
                <a
                  href="#pricing"
                  className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                  data-testid="link-pricing"
                >
                  Prix
                </a>
                <Link
                  href="/faq"
                  className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                  data-testid="link-faq"
                >
                  FAQ
                </Link>
              </>
            )}
            {isDashboard && (
              <Link
                href="/dashboard"
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                data-testid="link-my-audits"
              >
                Mes audits
              </Link>
            )}
          </nav>

          <div className="flex items-center gap-3">
            {/* Bouton Homepage visible partout sauf landing */}
            {location !== "/" && location !== "/audit-complet" && (
              <Link href="/">
                <Button variant="ghost" size="sm" className="gap-2" data-testid="button-homepage">
                  Accueil
                </Button>
              </Link>
            )}
            <ThemeToggle />
            
            {userEmail ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-2" data-testid="button-user-menu">
                    <User className="h-4 w-4" />
                    <span className="hidden max-w-32 truncate sm:inline">{userEmail}</span>
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem className="text-muted-foreground text-xs">
                    {userEmail}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard" className="cursor-pointer" data-testid="menu-dashboard">
                      Mes audits
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={handleLogout} 
                    className="text-destructive cursor-pointer"
                    data-testid="button-logout"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Deconnexion
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link href="/auth/login">
                <Button variant="ghost" size="sm" data-testid="button-login">
                  Connexion
                </Button>
              </Link>
            )}
            
            <Link href="/audit-complet/questionnaire">
              <Button size="sm" data-testid="button-start-audit">
                Commencer
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              data-testid="button-mobile-menu"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {mobileMenuOpen && (
          <nav className="border-t border-border py-4 md:hidden">
            <div className="flex flex-col gap-4">
              {isLanding && (
                <>
                  <a
                    href="#domaines"
                    className="text-sm font-medium text-muted-foreground"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    15 Domaines
                  </a>
                  <a
                    href="#process"
                    className="text-sm font-medium text-muted-foreground"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Comment ca marche
                  </a>
                  <a
                    href="#pricing"
                    className="text-sm font-medium text-muted-foreground"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Prix
                  </a>
                  <Link
                    href="/faq"
                    className="text-sm font-medium text-muted-foreground"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    FAQ
                  </Link>
                </>
              )}
              {userEmail && (
                <>
                  <Link
                    href="/dashboard"
                    className="text-sm font-medium text-muted-foreground"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Mes audits
                  </Link>
                  <button
                    onClick={() => {
                      handleLogout();
                      setMobileMenuOpen(false);
                    }}
                    className="text-sm font-medium text-destructive text-left"
                    data-testid="button-mobile-logout"
                  >
                    Deconnexion
                  </button>
                </>
              )}
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
