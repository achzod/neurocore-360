import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Menu, X, LogOut, User, ChevronDown } from "lucide-react";
import { useState, useEffect } from "react";
import { ThemeToggle } from "./ThemeToggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const PRODUCTS = [
  { name: "Discovery Scan", href: "/offers/discovery-scan" },
  { name: "Anabolic Bioscan", href: "/offers/anabolic-bioscan" },
  { name: "Blood Analysis", href: "/offers/blood-analysis" },
  { name: "Ultimate Scan", href: "/offers/ultimate-scan" },
  { name: "Burnout Engine", href: "/offers/burnout-detection" },
];

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

  const isDashboard = location.startsWith("/dashboard");

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="flex flex-col">
              <span className="text-xl font-black tracking-tighter leading-none" data-testid="text-brand-name">
                APEX<span className="text-primary">LABS</span>
              </span>
              <span className="text-[10px] text-muted-foreground tracking-wide">by Achzod</span>
            </div>
          </Link>

          {/* Desktop Navigation - Products */}
          <nav className="hidden items-center gap-1 lg:flex">
            {PRODUCTS.map((product) => (
              <Link
                key={product.name}
                href={product.href}
                className="px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {product.name}
              </Link>
            ))}
            <Link
              href="/blog"
              className="px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Blog
            </Link>
          </nav>

          {/* Right side actions */}
          <div className="flex items-center gap-2">
            <ThemeToggle />

            {userEmail ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-1 sm:gap-2 px-2 sm:px-3" data-testid="button-user-menu">
                    <User className="h-4 w-4" />
                    <span className="hidden max-w-32 truncate sm:inline">{userEmail}</span>
                    <ChevronDown className="h-3 w-3 hidden sm:block" />
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
                    Déconnexion
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link href="/auth/login" className="hidden sm:block">
                <Button variant="ghost" size="sm" data-testid="button-login">
                  Connexion
                </Button>
              </Link>
            )}

            <Link href="/offers/ultimate-scan">
              <Button size="sm" className="px-4 text-sm font-semibold" data-testid="button-start-audit">
                Commencer
              </Button>
            </Link>

            {/* Mobile menu toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              data-testid="button-mobile-menu"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <nav className="border-t border-border py-4 lg:hidden">
            <div className="flex flex-col gap-2">
              {PRODUCTS.map((product) => (
                <Link
                  key={product.name}
                  href={product.href}
                  className="px-2 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {product.name}
                </Link>
              ))}
              <Link
                href="/blog"
                className="px-2 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
                onClick={() => setMobileMenuOpen(false)}
              >
                Blog
              </Link>
              <div className="my-2 border-t border-border" />
              {userEmail ? (
                <>
                  <Link
                    href="/dashboard"
                    className="px-2 py-2 text-sm font-medium text-muted-foreground"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Mes audits
                  </Link>
                  <button
                    onClick={() => {
                      handleLogout();
                      setMobileMenuOpen(false);
                    }}
                    className="px-2 py-2 text-sm font-medium text-destructive text-left"
                    data-testid="button-mobile-logout"
                  >
                    Déconnexion
                  </button>
                </>
              ) : (
                <Link
                  href="/auth/login"
                  className="px-2 py-2 text-sm font-medium text-muted-foreground"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Connexion
                </Link>
              )}
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
