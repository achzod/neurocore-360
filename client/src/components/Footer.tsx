import { Link } from "wouter";
import { SiInstagram, SiYoutube, SiFacebook } from "react-icons/si";
import { resetCookieConsent } from "@/components/CookieConsent";
import { buildWhatsAppUrl } from "@/lib/whatsapp";
import { trackWhatsAppClick } from "@/lib/analytics";

export function Footer() {
  const whatsappDestination = buildWhatsAppUrl(
    "Salut Achzod, je viens d'APEXLABS. Je veux ton avis pour savoir quelle offre ou quel coaching est adapte a mon cas."
  );

  return (
    <footer className="border-t border-[#333333] bg-[#000000]" role="contentinfo">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-4">
          <div className="md:col-span-2">
            <Link href="/" className="flex flex-col leading-none">
              <span className="text-xl font-black tracking-tighter text-white">
                APEX<span className="text-[#FCDD00]">LABS</span>
              </span>
              <span className="font-mono text-[10px] text-[#525252] tracking-widest uppercase">by Achzod</span>
            </Link>
            <p className="mt-4 max-w-md text-sm text-[#9CA3AF] font-light">
              L'analyse corporelle 360 la plus complète au monde. Rapport personnalisé par Achzod avec protocoles d'optimisation.
            </p>
            <div className="mt-4 flex gap-4">
              <a
                href="https://www.instagram.com/achzod/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#9CA3AF] transition-colors hover:text-[#FCDD00]"
                aria-label="Instagram"
                data-testid="link-instagram"
              >
                <SiInstagram className="h-5 w-5" />
              </a>
              <a
                href="https://www.youtube.com/channel/UCEsLHqeUffGZRXCH1gQw9rA"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#9CA3AF] transition-colors hover:text-[#FCDD00]"
                aria-label="YouTube"
                data-testid="link-youtube"
              >
                <SiYoutube className="h-5 w-5" />
              </a>
              <a
                href="https://www.facebook.com/achzod/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#9CA3AF] transition-colors hover:text-[#FCDD00]"
                aria-label="Facebook"
                data-testid="link-facebook"
              >
                <SiFacebook className="h-5 w-5" />
              </a>
            </div>
          </div>

          <div>
            <h4 className="mb-4 font-mono text-[10px] uppercase tracking-[0.2em] text-[#FCDD00]">Offres</h4>
            <ul className="space-y-3 text-sm text-[#9CA3AF]">
              <li>
                <Link href="/offers/discovery-scan" className="hover:text-white transition-colors">
                  Discovery Scan
                </Link>
              </li>
              <li>
                <Link href="/offers/anabolic-bioscan" className="hover:text-white transition-colors">
                  Anabolic Bioscan
                </Link>
              </li>
              <li>
                <Link href="/offers/blood-analysis" className="hover:text-white transition-colors">
                  Blood Analysis
                </Link>
              </li>
              <li>
                <Link href="/offers/ultimate-scan" className="hover:text-white transition-colors">
                  Ultimate Scan
                </Link>
              </li>
              <li>
                <Link href="/offers/formcheck" className="hover:text-white transition-colors">
                  FormCheck
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 font-mono text-[10px] uppercase tracking-[0.2em] text-[#FCDD00]">Ressources</h4>
            <ul className="space-y-3 text-sm text-[#9CA3AF]">
              <li>
                <Link href="/blog" className="hover:text-white transition-colors">
                  Blog
                </Link>
              </li>
              <li>
                <Link href="/press" className="hover:text-white transition-colors">
                  Presse
                </Link>
              </li>
              <li>
                <Link href="/faq" className="hover:text-white transition-colors">
                  FAQ
                </Link>
              </li>
              <li>
                <a
                  href={whatsappDestination}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-[#25D366] hover:text-white transition-colors"
                  onClick={() => {
                    try {
                      trackWhatsAppClick({
                        offer: "APEXLABS",
                        placement: "footer_contact",
                        tier: "orientation",
                        destination: whatsappDestination,
                      });
                    } catch {
                      // Analytics must never block contact.
                    }
                  }}
                >
                  WhatsApp Achzod
                </a>
              </li>
              <li>
                <a
                  href="https://achzodcoaching.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors"
                >
                  achzodcoaching.com
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-[#333333] pt-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <p className="text-sm text-[#9CA3AF] font-mono">
              © {new Date().getFullYear()} APEX LABS by ACHZOD. Tous droits réservés.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-[#9CA3AF]">
              <Link href="/mentions-legales" className="hover:text-white transition-colors">
                Mentions legales
              </Link>
              <Link href="/cgv" className="hover:text-white transition-colors">
                CGV
              </Link>
              <Link href="/politique-confidentialite" className="hover:text-white transition-colors">
                Confidentialite
              </Link>
              <button onClick={resetCookieConsent} className="hover:text-white transition-colors">
                Gerer mes cookies
              </button>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
