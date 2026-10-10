import { Compass } from "lucide-react";
import { useLocation } from "wouter";
import { trackClick } from "@/lib/analytics";

const HIDDEN_PREFIXES = [
  "/admin",
  "/auth",
  "/login",
  "/dashboard",
  "/conversions",
  "/questionnaire",
  "/audit-complet/questionnaire",
  "/audit-complet/checkout",
  "/peptides-preview",
  "/peptides-engine",
  "/checkout",
];

const ORIENTATION_URL =
  "https://achzod-chat-orientation.onrender.com/?source=apexlabs&utm_source=apexlabs&utm_medium=floating_cta&utm_campaign=orientation";

// Une seule action flottante : l’orientation gratuite. WhatsApp reste disponible
// dans le header et dans les pages d’offre qui nécessitent un contact direct.
export function WhatsAppConversionHub() {
  const [location] = useLocation();
  const hidden = HIDDEN_PREFIXES.some((prefix) => location.startsWith(prefix));

  if (hidden) return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-[70]"
      style={{
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        maxHeight: "calc(100dvh - 2rem)",
      }}
    >
      <a
        href={ORIENTATION_URL}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => trackClick("apexlabs_orientation_floating", ORIENTATION_URL)}
        className="flex h-12 items-center justify-center gap-2 bg-[#25D366] px-4 text-sm font-black uppercase tracking-wide text-black shadow-[0_14px_35px_rgba(37,211,102,0.28)] transition-all hover:-translate-y-0.5 hover:bg-white"
        data-testid="global-orientation-cta"
      >
        <Compass className="h-5 w-5" />
        Mon orientation gratuite (90 s)
      </a>
    </div>
  );
}
