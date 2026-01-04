import { Link } from "wouter";
import { SiInstagram, SiYoutube, SiFacebook } from "react-icons/si";

export function Footer() {
  return (
    <footer className="border-t border-border bg-muted/30 relative overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-4">
          <div className="md:col-span-2">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-xl font-black tracking-tighter">
                APEX<span className="text-primary">LABS</span>
              </span>
            </Link>
            <p className="mt-4 max-w-md text-sm text-muted-foreground">
              L'analyse corporelle 360 la plus complète au monde. Rapport IA personnalisé avec protocoles d'optimisation.
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
            <h4 className="mb-4 text-sm font-semibold">Nos Offres</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li>
                <Link href="/offers/discovery-scan" className="hover:text-foreground">
                  Discovery Scan
                </Link>
              </li>
              <li>
                <Link href="/offers/anabolic-bioscan" className="hover:text-foreground">
                  Anabolic Bioscan
                </Link>
              </li>
              <li>
                <Link href="/offers/blood-analysis" className="hover:text-foreground">
                  Blood Analysis
                </Link>
              </li>
              <li>
                <Link href="/offers/ultimate-scan" className="hover:text-foreground">
                  Ultimate Scan
                </Link>
              </li>
              <li>
                <Link href="/offers/burnout-detection" className="hover:text-foreground">
                  Burnout Engine
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-semibold">Ressources</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li>
                <Link href="/blog" className="hover:text-foreground">
                  Blog
                </Link>
              </li>
              <li>
                <Link href="/press" className="hover:text-foreground">
                  Presse
                </Link>
              </li>
              <li>
                <Link href="/faq" className="hover:text-foreground">
                  FAQ
                </Link>
              </li>
              <li>
                <a href="mailto:coaching@achzodcoaching.com" className="hover:text-foreground">
                  Contact
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
              © {new Date().getFullYear()} APEX LABS by ACHZOD. Tous droits réservés.
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
