import React from "react";
import { MessageCircle } from "lucide-react";
import { trackWhatsAppClick } from "@/lib/analytics";
import { buildWhatsAppUrl } from "@/lib/whatsapp";

export type DiscoveryWhatsAppPlacement = "report_top" | "report_sticky";

function buildDiscoveryWhatsAppMessage(clientName?: string): string {
  const normalizedName = clientName?.trim();
  const identity = normalizedName && normalizedName !== "Profil"
    ? ` Je suis ${normalizedName}.`
    : "";

  return `Salut Achzod, je viens de consulter mon Discovery Scan.${identity} J'aimerais ton avis sur mes résultats et savoir quelle prochaine étape est la plus adaptée :`;
}

export function DiscoveryWhatsAppLink({
  placement,
  clientName,
  label,
  className = "",
}: {
  placement: DiscoveryWhatsAppPlacement;
  clientName?: string;
  label: string;
  className?: string;
}) {
  const destination = buildWhatsAppUrl(buildDiscoveryWhatsAppMessage(clientName));

  return (
    <a
      href={destination}
      target="_blank"
      rel="noopener noreferrer"
      data-testid={`discovery-whatsapp-${placement}`}
      data-discovery-whatsapp="true"
      aria-label={`${label} (ouvre WhatsApp dans un nouvel onglet)`}
      className={`inline-flex items-center justify-center gap-2 rounded-xl bg-[#25D366] px-5 py-3 font-bold text-white shadow-[0_10px_30px_rgba(37,211,102,0.24)] transition-all hover:-translate-y-0.5 hover:bg-[#20BD5A] hover:shadow-[0_14px_34px_rgba(37,211,102,0.32)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25D366] focus-visible:ring-offset-2 ${className}`}
      onClick={() => {
        try {
          trackWhatsAppClick({
            offer: "Discovery Scan",
            placement,
            tier: "gratuit",
            destination,
          });
        } catch {
          // Analytics must never block access to WhatsApp.
        }
      }}
    >
      <MessageCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
      <span>{label}</span>
    </a>
  );
}
