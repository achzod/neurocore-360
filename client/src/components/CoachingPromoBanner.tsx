import { useState } from "react";
import { MessageCircle } from "lucide-react";
import { buildWhatsAppUrl } from "@/lib/whatsapp";
import { trackWhatsAppClick } from "@/lib/analytics";

type AuditKind =
  | "GRATUIT"
  | "DISCOVERY"
  | "PREMIUM"
  | "ANABOLIC"
  | "ELITE"
  | "ULTIMATE"
  | "BLOOD_ANALYSIS"
  | "BLOOD"
  | "PEPTIDES_ENGINE"
  | "PEPTIDES";

interface PromoInfo {
  code: string;
  description: string;
  recommendedFormules: Array<{ name: string; href: string }>;
}

type PeptidesTier = "solo" | "coached" | "tracked";

const FORMULE_ESSENTIAL = { name: "Essential", href: "https://www.achzodcoaching.com/coaching-essential" };
const FORMULE_ELITE = { name: "Elite", href: "https://www.achzodcoaching.com/coaching-elite" };
const FORMULE_PRIVATELAB = { name: "Private Lab", href: "https://www.achzodcoaching.com/coaching-achzod-private-lab" };

const PEPTIDES_PROMOS: Record<PeptidesTier, Pick<PromoInfo, "code" | "description">> = {
  solo: { code: "PEPTIDES199", description: "199 EUR deduits sur ton coaching" },
  coached: { code: "PEPTIDES299", description: "299 EUR deduits sur ton coaching" },
  tracked: { code: "PEPTIDES399", description: "399 EUR deduits sur ton coaching" },
};

function getPromoInfo(kind: AuditKind, peptidesTier?: PeptidesTier): PromoInfo {
  switch (kind) {
    case "PREMIUM":
    case "ANABOLIC":
      return {
        code: "BIOSCAN59",
        description: "59€ déduits sur ta formule coaching",
        recommendedFormules: [FORMULE_ESSENTIAL, FORMULE_ELITE],
      };
    case "ELITE":
    case "ULTIMATE":
      return {
        code: "ULTIMATE79",
        description: "79€ déduits sur ta formule coaching",
        recommendedFormules: [FORMULE_ELITE, FORMULE_PRIVATELAB],
      };
    case "BLOOD_ANALYSIS":
    case "BLOOD":
      return {
        code: "BLOOD99",
        description: "99€ déduits sur ta formule coaching",
        recommendedFormules: [FORMULE_ESSENTIAL, FORMULE_ELITE],
      };
    case "PEPTIDES_ENGINE":
    case "PEPTIDES": {
      const peptidePromo = PEPTIDES_PROMOS[peptidesTier || "coached"];
      return {
        ...peptidePromo,
        recommendedFormules: [FORMULE_ELITE, FORMULE_PRIVATELAB],
      };
    }
    case "GRATUIT":
    case "DISCOVERY":
    default:
      return {
        code: "DISCOVERY20",
        description: "-20% sur toutes les formules coaching",
        recommendedFormules: [FORMULE_ESSENTIAL, FORMULE_ELITE, FORMULE_PRIVATELAB],
      };
  }
}

function getAuditLabel(kind: AuditKind): string {
  switch (kind) {
    case "PREMIUM":
    case "ANABOLIC":
      return "Anabolic Bioscan";
    case "ELITE":
    case "ULTIMATE":
      return "Ultimate Scan";
    case "BLOOD_ANALYSIS":
    case "BLOOD":
      return "Blood Analysis";
    case "PEPTIDES_ENGINE":
    case "PEPTIDES":
      return "Peptides Engine";
    case "GRATUIT":
    case "DISCOVERY":
    default:
      return "Discovery Scan";
  }
}

interface CoachingPromoBannerProps {
  auditType: AuditKind;
  peptidesTier?: PeptidesTier;
  /** Optional extra className for outer wrapper. */
  className?: string;
  /** If true, allow the user to dismiss the banner via local-storage flag. */
  dismissible?: boolean;
}

// Sticky promo code banner at the top of a report page.
// Shows the client's code + coaching CTAs, so if they reopened the report
// days after the email they still have everything in front of them.
export function CoachingPromoBanner({
  auditType,
  peptidesTier,
  className = "",
  dismissible = true,
}: CoachingPromoBannerProps) {
  const storageKey = `apexlabs_coaching_banner_dismissed_${auditType}`;
  const [dismissed, setDismissed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try { return localStorage.getItem(storageKey) === "1"; } catch { return false; }
  });
  const [copied, setCopied] = useState(false);

  if (dismissed) return null;

  const promo = getPromoInfo(auditType, peptidesTier);
  const auditLabel = getAuditLabel(auditType);
  const whatsappDestination = buildWhatsAppUrl(
    `Salut Achzod, je viens de recevoir mon rapport ${auditLabel} APEXLABS. Je veux ton avis pour savoir si je dois appliquer seul, faire une analyse plus avancee ou partir sur coaching.`
  );

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(promo.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore ,  dismissable UX, not critical
    }
  };

  const onDismiss = () => {
    setDismissed(true);
    try { localStorage.setItem(storageKey, "1"); } catch {}
  };

  return (
    <div
      className={`relative w-full border-b border-[#FCDD00]/30 bg-gradient-to-r from-[#FCDD00]/10 via-[#FCDD00]/5 to-transparent ${className}`}
      role="region"
      aria-label="Bonus coaching"
    >
      <div className="mx-auto max-w-6xl px-4 py-3 sm:py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3 sm:items-center">
            <div className="flex-shrink-0 rounded-sm bg-[#FCDD00]/20 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-[#FCDD00]">
              Bonus
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white">
                Ton code coaching :{" "}
                <button
                  onClick={copyCode}
                  className="inline-flex items-center gap-1 rounded-sm bg-[#FCDD00] px-2 py-0.5 font-mono text-black transition-colors hover:bg-[#fce844]"
                  title="Cliquer pour copier"
                >
                  {promo.code}
                  <span className="text-[10px] opacity-70">{copied ? "✓" : "📋"}</span>
                </button>
              </p>
              <p className="mt-1 text-xs text-white/60">{promo.description}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <a
              href={whatsappDestination}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-sm bg-[#25D366] px-3 py-1.5 text-xs font-black uppercase tracking-wide text-black transition-colors hover:bg-white"
              onClick={() => {
                try {
                  trackWhatsAppClick({
                    offer: auditLabel,
                    placement: "report_coaching_banner",
                    tier: peptidesTier || auditType,
                    destination: whatsappDestination,
                  });
                } catch {
                  // Analytics must never block WhatsApp access.
                }
              }}
            >
              <MessageCircle className="h-3.5 w-3.5" />
              Avis WhatsApp
            </a>
            {promo.recommendedFormules.map((f) => (
              <a
                key={f.name}
                href={f.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-sm border border-white/20 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:border-[#FCDD00] hover:text-[#FCDD00]"
              >
                {f.name} →
              </a>
            ))}
            {dismissible && (
              <button
                onClick={onDismiss}
                className="ml-1 rounded-sm border border-white/10 px-2 py-1.5 text-xs text-white/40 hover:text-white/80"
                aria-label="Masquer la bannière"
                title="Masquer"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
