import { FormEvent, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { MessageCircle, Send, X } from "lucide-react";
import { buildWhatsAppUrl } from "@/lib/whatsapp";
import { trackWhatsAppClick } from "@/lib/analytics";

const HIDDEN_PREFIXES = [
  "/admin",
  "/auth",
  "/login",
  "/dashboard",
  "/conversions",
];

function inferOffer(pathname: string): { offer: string; context: string } {
  if (pathname.includes("peptides")) {
    return { offer: "Peptides Engine", context: "optimisation avancee / peptides" };
  }
  if (pathname.includes("blood")) {
    return { offer: "Blood Analysis", context: "bilan sanguin / marqueurs" };
  }
  if (pathname.includes("ultimate")) {
    return { offer: "Ultimate Scan", context: "analyse complete / coaching" };
  }
  if (pathname.includes("anabolic")) {
    return { offer: "Anabolic Bioscan", context: "energie / hormones / recuperation" };
  }
  if (pathname.includes("discovery") || pathname.includes("questionnaire") || pathname.includes("scan")) {
    return { offer: "Discovery Scan", context: "premier diagnostic" };
  }
  return { offer: "APEXLABS", context: "orientation" };
}

function buildQuickMessage(offer: string, context: string): string {
  return [
    "Salut Achzod, je suis sur APEXLABS.",
    `Je regarde ${offer} (${context}).`,
    "Je veux ton avis pour savoir si je dois partir sur un scan, une analyse avancee ou un coaching.",
  ].join(" ");
}

export function WhatsAppConversionHub() {
  const [location] = useLocation();
  const [open, setOpen] = useState(false);
  const { offer, context } = useMemo(() => inferOffer(location), [location]);

  if (HIDDEN_PREFIXES.some((prefix) => location.startsWith(prefix))) {
    return null;
  }

  const quickDestination = buildWhatsAppUrl(buildQuickMessage(offer, context));

  const handleQuickClick = () => {
    try {
      trackWhatsAppClick({
        offer,
        placement: "global_floating_quick",
        tier: "orientation",
        destination: quickDestination,
      });
    } catch {
      // Analytics must never block WhatsApp access.
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const goal = String(form.get("goal") || "").trim();
    const blocker = String(form.get("blocker") || "").trim();
    const urgency = String(form.get("urgency") || "").trim();
    const contactEmail = String(form.get("contactEmail") || "").trim();
    const phone = String(form.get("phone") || "").trim();

    const message = [
      "Salut Achzod, je veux une orientation rapide.",
      `Page: ${offer}.`,
      contactEmail ? `Email: ${contactEmail}.` : "",
      phone ? `Tel: ${phone}.` : "",
      goal ? `Objectif: ${goal}.` : "",
      blocker ? `Blocage principal: ${blocker}.` : "",
      urgency ? `Urgence: ${urgency}.` : "",
      "Dis-moi si je dois faire un Discovery, une analyse avancee, Peptides/Blood, ou partir sur coaching.",
    ].filter(Boolean).join(" ");

    const destination = buildWhatsAppUrl(message);
    try {
      trackWhatsAppClick({
        offer,
        placement: "global_floating_form",
        tier: "orientation_form",
        destination,
        eventType: "form",
        contactEmail,
        phone,
        goal,
        blocker,
        urgency,
        message,
      });
    } catch {
      // Analytics must never block WhatsApp access.
    }

    window.open(destination, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="fixed bottom-4 right-4 z-[70] flex max-w-[calc(100vw-2rem)] flex-col items-end gap-3 sm:bottom-6 sm:right-6">
      {open && (
        <div className="w-[min(360px,calc(100vw-2rem))] border border-[#25D366]/40 bg-black/95 p-4 text-white shadow-[0_24px_80px_rgba(0,0,0,0.55)] backdrop-blur-md">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-[#25D366]">
                Orientation WhatsApp
              </p>
              <h2 className="mt-1 text-base font-black leading-tight">
                Je t'aide a choisir la bonne suite.
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex h-8 w-8 shrink-0 items-center justify-center border border-white/10 text-white/60 transition-colors hover:border-white/30 hover:text-white"
              aria-label="Fermer le formulaire WhatsApp"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <form className="space-y-3" onSubmit={handleSubmit}>
            <label className="block">
              <span className="mb-1 block text-xs font-bold uppercase text-white/55">Objectif</span>
              <select
                name="goal"
                className="h-11 w-full border border-white/10 bg-[#0b0b0b] px-3 text-sm text-white outline-none transition-colors focus:border-[#25D366]"
                defaultValue=""
              >
                <option value="" disabled>Choisir</option>
                <option>Perte de gras bloquee</option>
                <option>Prise de muscle / recomposition</option>
                <option>Energie, libido, testo, drive</option>
                <option>Optimisation avancee / peptides</option>
                <option>Coaching complet</option>
              </select>
            </label>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-xs font-bold uppercase text-white/55">Email</span>
                <input
                  name="contactEmail"
                  type="email"
                  autoComplete="email"
                  className="h-11 w-full border border-white/10 bg-[#0b0b0b] px-3 text-sm text-white placeholder:text-white/30 outline-none transition-colors focus:border-[#25D366]"
                  placeholder="ton@email.com"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-bold uppercase text-white/55">Tel</span>
                <input
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  className="h-11 w-full border border-white/10 bg-[#0b0b0b] px-3 text-sm text-white placeholder:text-white/30 outline-none transition-colors focus:border-[#25D366]"
                  placeholder="+33..."
                />
              </label>
            </div>

            <label className="block">
              <span className="mb-1 block text-xs font-bold uppercase text-white/55">Blocage</span>
              <input
                name="blocker"
                className="h-11 w-full border border-white/10 bg-[#0b0b0b] px-3 text-sm text-white placeholder:text-white/30 outline-none transition-colors focus:border-[#25D366]"
                placeholder="Ex: je stagne depuis 6 semaines"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-bold uppercase text-white/55">Timing</span>
              <select
                name="urgency"
                className="h-11 w-full border border-white/10 bg-[#0b0b0b] px-3 text-sm text-white outline-none transition-colors focus:border-[#25D366]"
                defaultValue="Je veux agir cette semaine"
              >
                <option>Je veux agir cette semaine</option>
                <option>Je compare les options</option>
                <option>Je veux juste comprendre d'abord</option>
              </select>
            </label>

            <button
              type="submit"
              className="flex h-12 w-full items-center justify-center gap-2 bg-[#25D366] px-4 text-sm font-black uppercase tracking-wide text-black transition-colors hover:bg-white"
            >
              <Send className="h-4 w-4" />
              Envoyer a Achzod
            </button>
          </form>
        </div>
      )}

      <div className="flex flex-col items-end gap-2 sm:flex-row">
        <a
          href={quickDestination}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleQuickClick}
          className="flex h-12 items-center justify-center gap-2 bg-[#25D366] px-4 text-sm font-black uppercase tracking-wide text-black shadow-[0_14px_35px_rgba(37,211,102,0.28)] transition-all hover:-translate-y-0.5 hover:bg-white"
          data-testid="global-whatsapp-quick"
        >
          <MessageCircle className="h-5 w-5" />
          WhatsApp Achzod
        </a>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="flex h-12 items-center justify-center border border-[#25D366]/50 bg-black/90 px-4 text-xs font-black uppercase tracking-wide text-[#25D366] shadow-[0_14px_35px_rgba(0,0,0,0.35)] backdrop-blur transition-colors hover:border-[#25D366] hover:bg-[#25D366]/10"
          data-testid="global-whatsapp-form-toggle"
        >
          Petit formulaire
        </button>
      </div>
    </div>
  );
}
