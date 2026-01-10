import { Link, useLocation } from "wouter";
import { Menu, X, LogOut, User, ChevronDown } from "lucide-react";
import { useState, useEffect } from "react";
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
    <header className="sticky top-0 z-50 w-full border-b border-[#333333] bg-[#000000]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          {/* Logo - APEXLABS Design System */}
          <Link href="/" className="flex items-center gap-2">
            <div className="flex flex-col leading-none">
              <span className="text-xl font-black tracking-tighter text-white" data-testid="text-brand-name">
                APEX<span className="text-[#FCDD00]">LABS</span>
              </span>
              <span className="font-mono text-[10px] text-[#525252] tracking-widest uppercase">by Achzod</span>
            </div>
          </Link>

          {/* Desktop Navigation - Inter Bold, uppercase, gray */}
          <nav className="hidden items-center gap-6 lg:flex">
            {PRODUCTS.map((product) => (
              <Link
                key={product.name}
                href={product.href}
                className="text-xs font-bold uppercase text-[#9CA3AF] transition-colors hover:text-white"
              >
                {product.name}
              </Link>
            ))}
            <Link
              href="/blog"
              className="text-xs font-bold uppercase text-[#9CA3AF] transition-colors hover:text-white"
            >
              Blog
            </Link>
          </nav>

          {/* Right side actions */}
          <div className="flex items-center gap-3">
            <a 
              href="https://www.achzodcoaching.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hidden sm:flex px-4 py-2 bg-[#FCDD00] text-black text-[10px] font-black uppercase tracking-widest hover:bg-white transition-all rounded-sm"
            >
              Coaching
            </a>
            {userEmail ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 px-3 py-2 text-xs font-bold uppercase text-[#9CA3AF] hover:text-white transition-colors" data-testid="button-user-menu">
                    <User className="h-4 w-4" />
                    <span className="hidden max-w-32 truncate sm:inline">{userEmail}</span>
                    <ChevronDown className="h-3 w-3 hidden sm:block" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-[#000000] border-[#333333]">
                  <DropdownMenuItem className="text-[#9CA3AF] text-xs font-mono">
                    {userEmail}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-[#333333]" />
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard" className="cursor-pointer text-white hover:text-[#FCDD00]" data-testid="menu-dashboard">
                      Mes audits
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-[#333333]" />
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="text-red-500 cursor-pointer"
                    data-testid="button-logout"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Déconnexion
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link href="/auth/login" className="hidden sm:block">
                <button className="text-xs font-bold uppercase text-[#9CA3AF] hover:text-white transition-colors" data-testid="button-login">
                  Connexion
                </button>
              </Link>
            )}

            <Link href="/offers/discovery-scan">
              <button className="px-5 py-2.5 text-xs font-black uppercase tracking-wide bg-[#FCDD00] text-black rounded-sm transition-all duration-300 hover:bg-[#FCDD00]/90" data-testid="button-start-audit">
                Commencer
              </button>
            </Link>

            {/* Mobile menu toggle */}
            <button
              className="lg:hidden p-2 text-[#9CA3AF] hover:text-white transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              data-testid="button-mobile-menu"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <nav className="border-t border-[#333333] py-4 lg:hidden bg-[#000000]">
            <div className="flex flex-col gap-1">
              {PRODUCTS.map((product) => (
                <Link
                  key={product.name}
                  href={product.href}
                  className="px-2 py-2 text-xs font-bold uppercase text-[#9CA3AF] hover:text-white transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {product.name}
                </Link>
              ))}
              <Link
                href="/blog"
                className="px-2 py-2 text-xs font-bold uppercase text-[#9CA3AF] hover:text-white transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Blog
              </Link>
              <div className="my-2 border-t border-[#333333]" />
              {userEmail ? (
                <>
                  <Link
                    href="/dashboard"
                    className="px-2 py-2 text-xs font-bold uppercase text-[#9CA3AF] hover:text-white transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Mes audits
                  </Link>
                  <button
                    onClick={() => {
                      handleLogout();
                      setMobileMenuOpen(false);
                    }}
                    className="px-2 py-2 text-xs font-bold uppercase text-red-500 text-left"
                    data-testid="button-mobile-logout"
                  >
                    Déconnexion
                  </button>
                </>
              ) : (
                <Link
                  href="/auth/login"
                  className="px-2 py-2 text-xs font-bold uppercase text-[#9CA3AF] hover:text-white transition-colors"
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
