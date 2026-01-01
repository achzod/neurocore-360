import { Link } from "wouter";
import { AchzodMonogram } from "./AchzodLogo";
import { SiInstagram, SiYoutube, SiFacebook } from "react-icons/si";

export function Footer() {
  return (
    <footer className="border-t border-border bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-4">
          <div className="md:col-span-2">
            <Link href="/" className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary p-2">
                <AchzodMonogram className="h-full w-full text-primary-foreground" />
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-bold tracking-tight">
                  NEUROCORE<span className="text-primary">360°</span>
                </span>
                <span className="text-xs text-muted-foreground">by ACHZOD</span>
              </div>
            </Link>
            <p className="mt-4 max-w-md text-sm text-muted-foreground">
              L'audit NEUROCORE 360 le plus complet du marche. 180 questions, 15 domaines
              d'expertise, rapport personnalise de 20+ pages.
            </p>
            <div className="mt-4 flex gap-4">
              <a 
                href="https://www.instagram.com/achzod/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-muted-foreground transition-colors hover:text-primary"
                data-testid="link-instagram"
              >
                <SiInstagram className="h-5 w-5" />
              </a>
              <a 
                href="https://www.youtube.com/channel/UCEsLHqeUffGZRXCH1gQw9rA" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-muted-foreground transition-colors hover:text-primary"
                data-testid="link-youtube"
              >
                <SiYoutube className="h-5 w-5" />
              </a>
              <a 
                href="https://www.facebook.com/achzod/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-muted-foreground transition-colors hover:text-primary"
                data-testid="link-facebook"
              >
                <SiFacebook className="h-5 w-5" />
              </a>
            </div>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-semibold">Navigation</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li>
                <Link href="/" className="hover:text-foreground">
                  Accueil
                </Link>
              </li>
              <li>
                <Link href="/audit-complet/questionnaire" className="hover:text-foreground">
                  Questionnaire
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="hover:text-foreground">
                  Dashboard
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-semibold">Contact</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li>
                <a href="mailto:coaching@achzodcoaching.com" className="hover:text-foreground">
                  coaching@achzodcoaching.com
                </a>
              </li>
              <li>
                <a
                  href="https://achzodcoaching.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground"
                >
                  achzodcoaching.com
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-border pt-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} ACHZOD - NEUROCORE 360°. Tous droits reserves.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
              <Link href="/mentions-legales" className="hover:text-foreground">
                Mentions legales
              </Link>
              <Link href="/cgv" className="hover:text-foreground">
                CGV
              </Link>
              <Link href="/mentions-legales" className="hover:text-foreground">
                Confidentialite
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
