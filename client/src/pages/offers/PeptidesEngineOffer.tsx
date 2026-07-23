/**
 * APEXLABS - Peptides Engine Offer
 * Protocole peptides personnalise — 199€ flash (jusqu'au 10 mai 2026 23h59 Paris) puis 399€
 */

import { useState, useEffect } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  Shield,
  Zap,
  Brain,
  Heart,
  Moon,
  Flame,
  Activity,
  TestTube,
  Syringe,
  FlaskConical,
  Calendar,
  ShoppingCart,
  Mail,
  Eye,
  AlertTriangle,
  Pill,
  Users,
  Clock,
  Network,
  ShieldCheck,
  Calculator,
  GitMerge,
  Star,
  Lock,
  CheckCircle,
  ExternalLink,
  MessageCircle,
} from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { trackWhatsAppClick } from "@/lib/analytics";
import { buildWhatsAppUrl } from "@/lib/whatsapp";

// ============================================================================
// CONSTANTS
// ============================================================================

// Apple-style palette: blanc / gris métal / bleu
const PRIMARY = "#0071E3";        // Apple blue (boutons + accents)
const TEXT_DARK = "#1D1D1F";       // Near-black headlines
const TEXT_MED = "#424245";        // Secondary text
const TEXT_GRAY = "#6E6E73";       // Body gray
const TEXT_FAINT = "#86868B";      // Captions
const SURFACE = "#FFFFFF";         // Pure white background
const SURFACE_2 = "#F5F5F7";       // Apple gray surface (cards)
const SURFACE_3 = "#FBFBFD";       // Slightly off-white sections
const BORDER = "#D2D2D7";          // Apple light border
const WHATSAPP_GREEN = "#25D366";
const WHATSAPP_TEXT = "#128C7E";

type PeptidesTierId = "solo" | "coached" | "tracked";
type WhatsAppPlacement =
  | "hero"
  | "pricing_assist"
  | "pricing_card"
  | "trust"
  | "faq"
  | "final"
  | "sticky";

const PEPTIDES_TIER_LABELS: Record<PeptidesTierId, string> = {
  solo: "Solo",
  coached: "Coached",
  tracked: "Tracked",
};

function buildPeptidesWhatsAppMessage(placement: WhatsAppPlacement, tier?: PeptidesTierId): string {
  if (tier) {
    return `Salut Achzod, je viens de la page Peptides Engine. Je regarde la formule ${PEPTIDES_TIER_LABELS[tier]}. J'ai une question avant de commander :`;
  }

  if (placement === "pricing_assist") {
    return "Salut Achzod, je viens de la page Peptides Engine. J'hésite entre Solo, Coached et Tracked. Mon objectif principal est :";
  }

  return "Salut Achzod, je viens de la page Peptides Engine. J'ai une question avant de commander :";
}

function PeptidesWhatsAppLink({
  placement,
  tier,
  label,
  className = "",
  filled = false,
}: {
  placement: WhatsAppPlacement;
  tier?: PeptidesTierId;
  label: string;
  className?: string;
  filled?: boolean;
}) {
  const destination = buildWhatsAppUrl(buildPeptidesWhatsAppMessage(placement, tier));

  return (
    <a
      href={destination}
      target="_blank"
      rel="noopener noreferrer"
      data-testid={`whatsapp-cta-${placement}${tier ? `-${tier}` : ""}`}
      data-whatsapp-inline={placement === "sticky" ? undefined : "true"}
      aria-label={`${label} (ouvre WhatsApp dans un nouvel onglet)`}
      className={`inline-flex items-center justify-center gap-2 rounded-full border px-5 py-3 font-semibold transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${className}`}
      style={{
        backgroundColor: filled ? WHATSAPP_GREEN : "#FFFFFF",
        borderColor: WHATSAPP_GREEN,
        color: filled ? "#FFFFFF" : WHATSAPP_TEXT,
        ["--tw-ring-color" as string]: WHATSAPP_GREEN,
      }}
      onClick={() => {
        try {
          trackWhatsAppClick({
            offer: "Peptides Engine",
            placement,
            tier,
            destination,
          });
        } catch {
          // Analytics must never block access to WhatsApp.
        }
      }}
    >
      <MessageCircle className="h-4 w-4" aria-hidden="true" />
      <span>{label}</span>
    </a>
  );
}

function StickyWhatsAppCTA() {
  const [visible, setVisible] = useState(false);
  const [inlineCtaVisible, setInlineCtaVisible] = useState(false);

  useEffect(() => {
    const hero = document.getElementById("peptides-hero");
    if (!hero) return;

    const updateVisibility = () => {
      setVisible(hero.getBoundingClientRect().bottom <= window.innerHeight * 0.55);
    };

    updateVisibility();
    window.addEventListener("scroll", updateVisibility, { passive: true });
    window.addEventListener("resize", updateVisibility);

    return () => {
      window.removeEventListener("scroll", updateVisibility);
      window.removeEventListener("resize", updateVisibility);
    };
  }, []);

  useEffect(() => {
    if (!("IntersectionObserver" in window)) return;

    const inlineCtas = Array.from(
      document.querySelectorAll<HTMLAnchorElement>(
        'a[data-whatsapp-inline="true"], a[href^="/peptides-engine?tier="]',
      ),
    );
    const visibleInlineCtas = new Set<Element>();
    const inlineCtaObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) visibleInlineCtas.add(entry.target);
          else visibleInlineCtas.delete(entry.target);
        });
        setInlineCtaVisible(visibleInlineCtas.size > 0);
      },
      { threshold: 0.2 },
    );

    inlineCtas.forEach((link) => inlineCtaObserver.observe(link));
    return () => inlineCtaObserver.disconnect();
  }, []);

  return (
    <AnimatePresence>
      {visible && !inlineCtaVisible && (
        <motion.div
          initial={{ opacity: 0, y: 18, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 18, scale: 0.96 }}
          className="fixed inset-x-3 z-40 md:left-auto md:right-6"
          style={{ bottom: "max(1rem, env(safe-area-inset-bottom))" }}
        >
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#25D366]/40 bg-white p-2 pl-4 shadow-[0_16px_50px_rgba(18,140,126,0.28)] md:min-w-[390px]">
            <div className="hidden min-w-0 text-left sm:block">
              <p className="truncate text-xs font-bold text-[#1D1D1F] md:text-sm">
                Une question avant d'acheter ?
              </p>
              <p className="hidden text-[11px] text-[#6E6E73] md:block">Réponse personnelle sous 24h</p>
            </div>
            <PeptidesWhatsAppLink
              placement="sticky"
              label="WhatsApp direct"
              filled
              className="w-full shrink-0 border-0 px-4 py-3 text-sm shadow-[0_8px_22px_rgba(18,140,126,0.3)] sm:w-auto"
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Flash promo deadline: jeudi 14 mai 2026 23:59 Paris (UTC+2)
const FLASH_DEADLINE_MS = new Date("2026-05-14T23:59:59+02:00").getTime();
const FLASH_PROMO_CODE = "PEPTIDES100";
const FLASH_PRICE = 199;
const REGULAR_PRICE = 399;

function pad2(n: number) {
  return String(Math.max(0, n)).padStart(2, "0");
}

function useCountdown(targetMs: number) {
  const [now, setNow] = useState<number>(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const diff = Math.max(0, targetMs - now);
  const days = Math.floor(diff / 86_400_000);
  const hours = Math.floor((diff % 86_400_000) / 3_600_000);
  const minutes = Math.floor((diff % 3_600_000) / 60_000);
  const seconds = Math.floor((diff % 60_000) / 1_000);
  return { days, hours, minutes, seconds, expired: diff <= 0 };
}

function FlashCountdown({ compact = false }: { compact?: boolean }) {
  const { days, hours, minutes, seconds, expired } = useCountdown(FLASH_DEADLINE_MS);
  if (expired) return null;

  const cellPad = compact ? "px-3 py-2" : "px-4 py-3 md:px-5 md:py-4";
  const digitSize = compact ? "text-2xl" : "text-3xl md:text-4xl";
  const labelSize = compact ? "text-[9px]" : "text-[10px]";

  return (
    <div className="inline-flex items-center gap-2 md:gap-3">
      {[
        { v: days, l: "JOURS" },
        { v: hours, l: "HEURES" },
        { v: minutes, l: "MIN" },
        { v: seconds, l: "SEC" },
      ].map((seg, i, arr) => (
        <div key={seg.l} className="flex items-center gap-2 md:gap-3">
          <div className="flex flex-col items-center">
            <div
              className={`${cellPad} rounded-md border border-[#0071E3]/30 bg-[#F5F5F7] font-mono ${digitSize} font-bold tabular-nums leading-none`}
              style={{ color: PRIMARY }}
            >
              {pad2(seg.v)}
            </div>
            <span className={`mt-1.5 font-mono ${labelSize} font-semibold tracking-[0.2em] text-[#86868B]`}>
              {seg.l}
            </span>
          </div>
          {i < arr.length - 1 && (
            <span className={`${digitSize} font-bold leading-none text-[#D2D2D7] -mt-3`}>:</span>
          )}
        </div>
      ))}
    </div>
  );
}

function FlashBanner() {
  const { expired } = useCountdown(FLASH_DEADLINE_MS);
  if (expired) return null;
  // Sticky just below the Header (Header is sticky top-0 z-50, ~64px tall).
  return (
    <div
      className="sticky top-[64px] z-[45] w-full border-b border-[#D2D2D7] bg-white/85 backdrop-blur-md"
    >
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-3 px-4 py-3 text-center md:gap-6">
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white md:text-[11px]"
          style={{ backgroundColor: PRIMARY }}
        >
          Fenêtre 72h
        </span>
        <span className="text-[13px] text-[#1D1D1F] md:text-sm">
          <strong className="text-[#1D1D1F]">{FLASH_PRICE}€</strong> au lieu de{" "}
          <span className="text-[#86868B] line-through">{REGULAR_PRICE}€</span> · code{" "}
          <strong style={{ color: PRIMARY }}>{FLASH_PROMO_CODE}</strong>
        </span>
        <FlashCountdown compact />
      </div>
    </div>
  );
}

type FAQEntry = { q: string; a: string };

const FAQ: FAQEntry[] = [
  {
    q: "Pourquoi 399€ ?",
    a: "Le contenu varie selon le tier. Solo (199€) : le protocole personnalise + l'acces source. Coached (299€) : tout Solo + 1 bilan sanguin + 30 jours de support ecrit. Tracked (399€) : tout Coached + 1 bilan supplementaire + 90 jours de support + 1 reecriture si evolution. Et dans les 3 tiers, le montant paye est integralement deduit de ton coaching Essential, Elite ou Private Lab 8 ou 12 semaines (crédit valable 8 semaines).",
  },
  {
    q: "C'est quoi la source premium ?",
    a: "Un marketplace avec 74 peptides a prix laboratoire, 13 fournisseurs certifies COA, testes par labo independant. Les prix sont 60-90% moins chers que les revendeurs classiques que tu trouves sur Google. C'est la source que j'utilise personnellement depuis plusieurs annees.",
  },
  {
    q: "C'est legal ?",
    a: "Les peptides de recherche ne sont pas approuves pour usage humain et sont vendus a des fins de recherche uniquement. Ce protocole est informatif et educatif. Tu es responsable de te renseigner sur la legislation de ton pays avant tout achat ou usage.",
  },
  {
    q: "Pourquoi 2 bilans sanguins ?",
    a: "Pre-cycle (baseline): IGF-1, glycemie, marqueurs hepatiques, hormones. Mi-cycle (mesurer l'impact reel): on compare avec ta baseline pour valider que ton protocole fonctionne sur tes marqueurs cibles. Sans bilan, tu navigues a l'aveugle.",
  },
  {
    q: "Comment je reconstitue mes peptides ?",
    a: "Le guide calcule dans ton rapport te donne: vial Xmg + Yml BAC water = Zmcg/ml, tire N unites par injection. Chaque molecule a sa fiche avec concentration cible, volume BAC water recommande, et calcul seringue adapte a ton dosage exact.",
  },
  {
    q: "Combien de molecules vais-je recevoir ?",
    a: "Entre 2 et 5 selon ton profil et tes objectifs. Le principe: minimum effective dose, pas de surcharge. Chaque molecule est justifiee par rapport a ton objectif principal. Un stack surchargee augmente couts, risques et complexite sans ameliorer les resultats.",
  },
  {
    q: "Faut-il de l'experience avec les peptides ?",
    a: "Non. Le questionnaire de 35 questions evalue ton niveau et adapte le protocole en consequence. Si tu es debutant, les molecules sont choisies pour leur profil tolerance/efficacite favorable, et les dosages sont conservatives. Le guide ne presuppose aucune experience.",
  },
  {
    q: "Quel est le delai de livraison ?",
    a: "48h apres paiement, par email. Tu recois: le rapport protocole complet, le guide de reconstitution calcule, le calendrier hebdomadaire, les 2 codes Blood Analysis, la liste de courses avec liens directs, et les guides injection et securite.",
  },
  {
    q: "Je peux combiner avec un coaching ?",
    a: "Oui. Si tu prends un coaching Achzod, ton coach integre ton protocole peptides dans ton suivi personnalise (nutrition, entrainement, supplementation). Les deux se completent parfaitement.",
  },
  {
    q: "Je peux revenir pour un autre cycle ?",
    a: "Oui. Un protocole update pour un deuxieme cycle (ajustements selon tes bilans mi-cycle) sera disponible a 99€. La source premium reste accessible indefiniment via les liens de ton rapport.",
  },
];

const CREDIBILITY = [
  { stat: "500+", label: "bilans sanguins analyses" },
  { stat: "86K", label: "abonnes YouTube" },
  { stat: "12", label: "masterclasses peptides" },
  { stat: "74", label: "molecules dans le catalogue" },
  { stat: "COA", label: "verifie par labo independant" },
];

const STEPS = [
  {
    step: "01",
    icon: Brain,
    title: "Reponds au questionnaire",
    desc: "35 questions sur tes objectifs, ton historique, ta biologie et ta tolerance. Sauvegarde auto.",
    time: "10-15 min",
  },
  {
    step: "02",
    icon: TestTube,
    title: "Je genere ton protocole",
    desc: "Analyse de ton profil, selection des molecules, dosages en mcg/kg, timing, reconstitution. Verifie et valide avant envoi.",
    time: "48h",
  },
  {
    step: "03",
    icon: Mail,
    title: "Tu recois tout par email",
    desc: "Rapport complet + codes Blood Analysis + liens directs source + guides injection et securite.",
    time: "Email direct",
  },
];

const DELIVERABLES = [
  {
    icon: Syringe,
    title: "Protocole personnalise 2-5 peptides",
    desc: "Dosages ajustes a ton poids en mcg/kg, timing AM/PM, duree et structure du cycle.",
  },
  {
    icon: FlaskConical,
    title: "Guide de reconstitution CALCULE",
    desc: "BAC water en ml, concentration cible, unites seringue par peptide. Zero calcul de ta part.",
  },
  {
    icon: Calendar,
    title: "Calendrier hebdomadaire AM/PM",
    desc: "Jour par jour, sites de rotation, timing precis. Imprimable et pret a l'emploi.",
  },
  {
    icon: ShoppingCart,
    title: "Liste de courses complete",
    desc: "Liens directs fournisseur + cout total estime. Tu sais exactement ce que le cycle va couter.",
  },
  {
    icon: Activity,
    title: "2 Blood Analyses incluses",
    desc: "Valeur 198€. Pre-cycle (baseline) + mi-cycle (mesurer l'impact reel sur tes marqueurs cibles).",
  },
  {
    icon: Eye,
    title: "Guide injection SC",
    desc: "Technique sous-cutanee, sites d'injection, rotation, choix des aiguilles. Avec illustrations.",
  },
  {
    icon: AlertTriangle,
    title: "Guide securite",
    desc: "Red flags a surveiller, quand reduire la dose, quand stopper immediatement.",
  },
  {
    icon: Pill,
    title: "Stack supplements complementaire",
    desc: "Zinc, magnesium, B6, D3. Les nutrients de support pour optimiser la reponse peptidique.",
  },
  {
    icon: Mail,
    title: "Support email 30 jours",
    desc: "Questions post-livraison sur ton protocole. Reponse sous 48h ouvrables.",
  },
];

const OBJECTIVES = [
  {
    icon: Heart,
    title: "Recovery & Healing",
    peptides: "BPC-157, TB-500",
    detail: "Reparation tendineuse, cicatrisation, reduction inflammation chronique.",
  },
  {
    icon: Zap,
    title: "GH & Anti-aging",
    peptides: "CJC-1295, Ipamorelin",
    detail: "Stimulation naturelle de la GH, composition corporelle, sommeil profond.",
  },
  {
    icon: Flame,
    title: "Fat Loss",
    peptides: "Tesamorelin, AOD-9604, Semaglutide",
    detail: "Lipolyse ciblee, reduction graisse viscerale, preservation musculaire.",
  },
  {
    icon: Moon,
    title: "Deep Sleep",
    peptides: "DSIP",
    detail: "Qualite du sommeil, recuperation nocturne, reset circadien.",
  },
  {
    icon: Brain,
    title: "Cognitive",
    peptides: "Semax, Selank",
    detail: "Focus, reduction anxiete, neuroprotection et memoire de travail.",
  },
  {
    icon: Activity,
    title: "Libido",
    peptides: "PT-141",
    detail: "Melanocortine centralement active, reponse sexuelle homme et femme.",
  },
  {
    icon: Shield,
    title: "Skin & Hair",
    peptides: "GHK-Cu",
    detail: "Synthese collagene, epaississement cheveux, cicatrisation cutanee.",
  },
  {
    icon: Zap,
    title: "Endurance",
    peptides: "SS-31, MOTS-c",
    detail: "Protection mitochondriale, reduction stress oxydatif, performance cardio.",
  },
];

// ============================================================================
// FAQ ITEM
// ============================================================================

function FAQItem({ q, a, index }: { q: string; a: string; index: number }) {
  const [open, setOpen] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.04 }}
      className="border-b border-[#D2D2D7]"
    >
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-start justify-between gap-8 py-6 text-left transition-colors hover:text-[#0071E3]"
      >
        <h3 className="text-base font-semibold text-[#1D1D1F]">{q}</h3>
        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.25 }}
          className="shrink-0 pt-0.5"
        >
          <ChevronDown className="h-5 w-5" style={{ color: PRIMARY }} />
        </motion.div>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <p className="pb-6 text-sm leading-relaxed text-[#6E6E73]">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ============================================================================
// SECTION LABEL
// ============================================================================

function SectionLabel({ children }: { children: string }) {
  return (
    <span className="font-mono text-xs uppercase tracking-widest" style={{ color: PRIMARY }}>
      {children}
    </span>
  );
}

// ============================================================================
// AMBER CTA BUTTON
// ============================================================================

function CTAButton({ children, href = "/peptides-engine", large = false }: { children: React.ReactNode; href?: string; large?: boolean }) {
  return (
    <Link
      href={href}
      className={`inline-flex cursor-pointer items-center gap-2 rounded-full bg-[#0071E3] font-semibold text-white transition-all hover:scale-[1.02] hover:bg-[#0077ED] active:scale-[0.98] ${
        large ? "px-9 py-4 text-base" : "px-7 py-3 text-[15px]"
      }`}
    >
      {children}
      <ArrowRight className="h-4 w-4" />
    </Link>
  );
}

// ============================================================================
// PRICE COMPARISON
// ============================================================================

const PRICE_TABLE = [
  { name: "BPC-157 (5mg)", reseller: "45-80€", source: "$9.65", sourceEur: "~9€", savings: "80-88%", tag: "Recovery" },
  { name: "TB-500 (5mg)", reseller: "50-90€", source: "$10.37", sourceEur: "~10€", savings: "80-89%", tag: "Recovery" },
  { name: "GHK-Cu (50mg)", reseller: "60-120€", source: "$7.64", sourceEur: "~7€", savings: "88-94%", tag: "Skin" },
  { name: "Ipamorelin (5mg)", reseller: "40-70€", source: "$8.92", sourceEur: "~8€", savings: "80-89%", tag: "GH" },
  { name: "CJC-1295 (2mg)", reseller: "50-85€", source: "$18.02", sourceEur: "~17€", savings: "66-80%", tag: "GH" },
  { name: "Retatrutide (10mg)", reseller: "150-300€", source: "$13.65", sourceEur: "~13€", savings: "91-96%", tag: "GLP-1" },
  { name: "Semaglutide (5mg)", reseller: "80-200€", source: "$5.64", sourceEur: "~5€", savings: "94-97%", tag: "GLP-1" },
  { name: "Tirzepatide (10mg)", reseller: "100-250€", source: "$9.65", sourceEur: "~9€", savings: "91-96%", tag: "GLP-1" },
];

function PriceComparison() {
  return (
    <section className="py-24 px-6">
      <div className="mx-auto max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-14 text-center"
        >
          <SectionLabel>La verite sur les prix</SectionLabel>
          <h2 className="mt-4 text-3xl font-bold text-[#1D1D1F] md:text-4xl">
            Ce que tu paies ailleurs vs via ma source
          </h2>
          <p className="mt-4 text-[#6E6E73] max-w-2xl mx-auto">
            Prix reels compares. Revendeurs FR/EU vs source directe laboratoire avec COA (Certificat d'Analyse) par lot.
          </p>
        </motion.div>

        {/* Per-peptide comparison table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="rounded-2xl border border-[#D2D2D7] bg-[#F5F5F7] overflow-hidden mb-6"
        >
          {/* Header */}
          <div className="grid grid-cols-4 gap-4 px-6 py-4 border-b border-[#D2D2D7] bg-white/5">
            <span className="text-xs font-mono uppercase tracking-wider text-[#86868B]">Peptide</span>
            <span className="text-xs font-mono uppercase tracking-wider text-[#86868B] text-center">Revendeur FR/EU</span>
            <span className="text-xs font-mono uppercase tracking-wider text-center" style={{ color: PRIMARY }}>Ma source</span>
            <span className="text-xs font-mono uppercase tracking-wider text-right" style={{ color: PRIMARY }}>Economie</span>
          </div>

          {/* Rows */}
          {PRICE_TABLE.map((row, i) => (
            <motion.div
              key={row.name}
              initial={{ opacity: 0, x: -10 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className={`grid grid-cols-4 gap-4 px-6 py-4 items-center ${i < PRICE_TABLE.length - 1 ? "border-b border-[#E5E5EA]" : ""}`}
            >
              <div>
                <span className="text-sm font-medium text-[#1D1D1F]">{row.name}</span>
                <span className="ml-2 text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-[#86868B]">{row.tag}</span>
              </div>
              <span className="text-sm text-[#86868B] text-center line-through">{row.reseller}</span>
              <span className="text-sm font-bold text-center" style={{ color: PRIMARY }}>{row.sourceEur}</span>
              <div className="text-right">
                <span className="text-sm font-bold text-emerald-400">-{row.savings}</span>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Cycle cost comparison */}
        <div className="grid gap-4 md:grid-cols-2 mb-6">
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="rounded-2xl border border-[#D2D2D7] bg-[#F5F5F7] p-8"
          >
            <p className="mb-1 font-mono text-xs uppercase tracking-wider text-[#86868B]">Revendeur classique</p>
            <p className="mb-2 text-4xl font-bold text-[#86868B]">1 200€<span className="text-lg font-normal">/cycle</span></p>
            <p className="text-sm text-[#A1A1A6]">3 peptides × 8 vials × 50€ en moyenne</p>
            <ul className="mt-4 space-y-2">
              {["Prix gonfles x3-x10", "Pas de COA", "Aucune personnalisation"].map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-[#86868B]">
                  <span className="text-red-500 mt-0.5">✕</span> {item}
                </li>
              ))}
            </ul>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="relative rounded-2xl border bg-[#F5F5F7] p-8"
            style={{ borderColor: PRIMARY }}
          >
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-4 py-1 text-xs font-semibold" style={{ backgroundColor: PRIMARY, color: "#fff" }}>
              Via ton protocole
            </div>
            <p className="mb-1 font-mono text-xs uppercase tracking-wider" style={{ color: PRIMARY }}>Ma source (dans ton protocole)</p>
            <p className="mb-2 text-4xl font-bold text-[#1D1D1F]">~280€<span className="text-lg font-normal text-[#6E6E73]">/cycle</span></p>
            <p className="text-sm text-[#6E6E73]">3 peptides × 8 vials × ~$12 direct labo</p>
            <ul className="mt-4 space-y-2">
              {["Prix direct laboratoire", "COA par lot, labo tiers", "Protocole personnalise"].map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-[#1D1D1F]">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" style={{ color: PRIMARY }} /> {item}
                </li>
              ))}
            </ul>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="rounded-xl border px-8 py-5 text-center"
          style={{ borderColor: `${PRIMARY}40`, backgroundColor: `${PRIMARY}08` }}
        >
          <p className="text-lg text-[#1D1D1F]">
            Tu economises{" "}
            <span className="font-black text-2xl" style={{ color: PRIMARY }}>920€</span>{" "}
            des le 1er cycle. Et chaque cycle apres. Le protocole se rembourse en <span className="font-bold" style={{ color: PRIMARY }}>une seule commande</span>.
          </p>
        </motion.div>
      </div>
    </section>
  );
}

// ============================================================================
// ANIMATED FEATURE CARDS — components adapted from peptides-ref/src/App.tsx
// ============================================================================

const AnimationWrapper = ({ children, title, value, status, extraUI, color = "cyan" }: {
  children: React.ReactNode;
  title: string;
  value: string;
  status: string;
  extraUI?: React.ReactNode;
  color?: "cyan" | "red" | "green" | "yellow";
}) => {
  const colorMap: Record<string, string> = {
    cyan: "border-cyan-500/20 shadow-[0_0_50px_rgba(6,182,212,0.1)]",
    red: "border-red-500/20 shadow-[0_0_50px_rgba(239,68,68,0.1)]",
    green: "border-green-500/20 shadow-[0_0_50px_rgba(34,197,94,0.1)]",
    yellow: "border-yellow-500/20 shadow-[0_0_50px_rgba(234,179,8,0.1)]",
  };
  const scanlineMap: Record<string, string> = {
    cyan: "bg-cyan-400/50 shadow-[0_0_20px_rgba(6,182,212,1)]",
    red: "bg-red-400/50 shadow-[0_0_20px_rgba(239,68,68,1)]",
    green: "bg-green-400/50 shadow-[0_0_20px_rgba(34,197,94,1)]",
    yellow: "bg-yellow-400/50 shadow-[0_0_20px_rgba(234,179,8,1)]",
  };
  const textMap: Record<string, string> = {
    cyan: "text-cyan-500",
    red: "text-red-500",
    green: "text-green-500",
    yellow: "text-yellow-500",
  };
  const dotMap: Record<string, string> = {
    cyan: "bg-cyan-500",
    red: "bg-red-500",
    green: "bg-green-500",
    yellow: "bg-yellow-500",
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      whileInView={{ opacity: 1, scale: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className={`relative w-full max-w-lg aspect-square md:aspect-[4/5] rounded-3xl border bg-white/50 backdrop-blur-2xl overflow-hidden flex items-center justify-center group ${colorMap[color]}`}
    >
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:1.5rem_1.5rem]" />
      <motion.div
        className={`absolute top-0 left-0 w-full h-[2px] z-20 ${scanlineMap[color]}`}
        animate={{ y: ["0%", "400%", "0%"] }}
        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
      />

      {children}

      <div className="absolute top-4 left-4 bg-white/80 backdrop-blur-md border border-[#D2D2D7] rounded-lg p-3 flex flex-col gap-1 z-30">
        <div className="flex items-center gap-2 mb-1">
          <div className={`w-2 h-2 rounded-full animate-pulse ${dotMap[color]}`} />
          <span className={`text-[10px] font-mono uppercase tracking-wider ${textMap[color]}`}>{title}</span>
        </div>
        <span className="text-3xl font-bold text-[#1D1D1F] tracking-tighter">{value}</span>
        <span className="text-xs text-slate-400">{status}</span>
      </div>

      {extraUI}
    </motion.div>
  );
};

const ArsenalAnimation = () => {
  const peptides = [
    { name: "BPC-157", x: 20, y: 20, color: "#06b6d4", val: "100%" },
    { name: "TB-500", x: 80, y: 20, color: "#ef4444", val: "98%" },
    { name: "RETATRUTIDE", x: 20, y: 80, color: "#eab308", val: "99%" },
    { name: "GHK-CU", x: 80, y: 80, color: "#22c55e", val: "95%" },
  ];

  return (
    <AnimationWrapper title="Arsenal" value="4" status="Composés Majeurs" color="cyan"
      extraUI={
        <div className="absolute bottom-4 left-4 bg-white/80 backdrop-blur-md border border-cyan-500/30 rounded p-2">
          <span className="text-[10px] text-cyan-400 font-mono uppercase">Analyse: <span className="text-[#1D1D1F] font-bold">MULTI-CIBLES</span></span>
        </div>
      }
    >
      <svg viewBox="0 0 100 100" className="w-full h-full absolute inset-0 overflow-visible p-8 z-10">
        {/* Radar Sweep */}
        <motion.g animate={{ rotate: 360 }} transition={{ duration: 4, repeat: Infinity, ease: "linear" }} style={{ transformOrigin: "50px 50px" }}>
          <path d="M 50 50 L 50 10 A 40 40 0 0 1 90 50 Z" fill="url(#radar-grad-arsenal)" className="opacity-30" />
        </motion.g>
        <defs>
          <linearGradient id="radar-grad-arsenal" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="rgba(6,182,212,0.8)" />
            <stop offset="100%" stopColor="rgba(6,182,212,0)" />
          </linearGradient>
        </defs>

        {/* Center Crosshair */}
        <circle cx="50" cy="50" r="10" fill="none" stroke="#06b6d4" strokeWidth="0.5" className="opacity-50" />
        <circle cx="50" cy="50" r="2" fill="#06b6d4" className="drop-shadow-[0_0_5px_#06b6d4]" />
        <line x1="50" y1="35" x2="50" y2="45" stroke="#06b6d4" strokeWidth="1" />
        <line x1="50" y1="55" x2="50" y2="65" stroke="#06b6d4" strokeWidth="1" />
        <line x1="35" y1="50" x2="45" y2="50" stroke="#06b6d4" strokeWidth="1" />
        <line x1="55" y1="50" x2="65" y2="50" stroke="#06b6d4" strokeWidth="1" />

        {/* Quadrant Targets */}
        {peptides.map((pep, i) => (
          <g key={i}>
            <rect x={pep.x - 15} y={pep.y - 12} width="30" height="24" fill="rgba(0,0,0,0.6)" stroke={pep.color} strokeWidth="0.5" className="opacity-80" />
            <path d={`M ${pep.x - 15} ${pep.y - 8} L ${pep.x - 15} ${pep.y - 12} L ${pep.x - 11} ${pep.y - 12}`} fill="none" stroke={pep.color} strokeWidth="1" />
            <path d={`M ${pep.x + 15} ${pep.y - 8} L ${pep.x + 15} ${pep.y - 12} L ${pep.x + 11} ${pep.y - 12}`} fill="none" stroke={pep.color} strokeWidth="1" />
            <path d={`M ${pep.x - 15} ${pep.y + 8} L ${pep.x - 15} ${pep.y + 12} L ${pep.x - 11} ${pep.y + 12}`} fill="none" stroke={pep.color} strokeWidth="1" />
            <path d={`M ${pep.x + 15} ${pep.y + 8} L ${pep.x + 15} ${pep.y + 12} L ${pep.x + 11} ${pep.y + 12}`} fill="none" stroke={pep.color} strokeWidth="1" />
            <text x={pep.x} y={pep.y - 2} fill="#fff" fontSize="3.5" textAnchor="middle" className="font-mono font-bold">{pep.name}</text>
            <rect x={pep.x - 10} y={pep.y + 4} width="20" height="2" fill="rgba(255,255,255,0.1)" />
            <motion.rect
              x={pep.x - 10} y={pep.y + 4} height="2" fill={pep.color}
              initial={{ width: 0 }}
              animate={{ width: [0, 20, 15, 20] }}
              transition={{ duration: 3, repeat: Infinity, delay: i * 0.5 }}
            />
            <text x={pep.x} y={pep.y + 9} fill={pep.color} fontSize="2.5" textAnchor="middle" className="font-mono">{pep.val} PURITY</text>
            <motion.line
              x1="50" y1="50" x2={pep.x} y2={pep.y}
              stroke={pep.color} strokeWidth="0.5" strokeDasharray="2 2"
              animate={{ strokeDashoffset: [0, -20], opacity: [0.2, 0.8, 0.2] }}
              transition={{ duration: 2, repeat: Infinity, delay: i * 0.2, ease: "linear" }}
            />
          </g>
        ))}
      </svg>
    </AnimationWrapper>
  );
};

const SourcingAnimation = () => {
  return (
    <AnimationWrapper title="Sourcing" value="99.9%" status="Pureté HPLC" color="green"
      extraUI={
        <div className="absolute bottom-4 right-4 bg-white/80 backdrop-blur-md border border-green-500/30 rounded p-2 flex flex-col items-end">
          <span className="text-[10px] text-green-400 font-mono uppercase">Statut Fournisseur</span>
          <span className="text-sm font-bold text-[#1D1D1F]">VÉRIFIÉ ACHZOD</span>
        </div>
      }
    >
      <svg viewBox="0 0 100 100" className="w-full h-full absolute inset-0 overflow-visible p-8 z-10">
        {/* Network Map */}
        <circle cx="50" cy="55" r="35" fill="none" stroke="#22c55e" strokeWidth="0.2" strokeDasharray="1 3" className="opacity-30" />
        <circle cx="50" cy="55" r="20" fill="none" stroke="#22c55e" strokeWidth="0.2" strokeDasharray="1 3" className="opacity-30" />

        {/* Scam Nodes (Red) */}
        <circle cx="25" cy="35" r="2" fill="#ef4444" className="opacity-50" />
        <text x="25" y="31" fill="#ef4444" fontSize="2.5" textAnchor="middle" className="font-mono">FAKE</text>
        <circle cx="75" cy="75" r="2" fill="#ef4444" className="opacity-50" />
        <text x="75" y="71" fill="#ef4444" fontSize="2.5" textAnchor="middle" className="font-mono">UNDERDOSED</text>

        {/* Verified Node (Green) */}
        <motion.circle cx="75" cy="35" r="4" fill="rgba(34,197,94,0.2)" stroke="#22c55e" strokeWidth="1" animate={{ scale: [1, 1.5, 1] }} transition={{ duration: 2, repeat: Infinity }} />
        <circle cx="75" cy="35" r="2" fill="#22c55e" className="drop-shadow-[0_0_10px_#22c55e]" />
        <text x="75" y="28" fill="#22c55e" fontSize="3" textAnchor="middle" className="font-mono font-bold">LABO PRIVÉ</text>

        {/* User Node */}
        <circle cx="25" cy="75" r="3" fill="#fff" />
        <text x="25" y="82" fill="#fff" fontSize="3" textAnchor="middle" className="font-mono font-bold">TOI</text>

        {/* Secure Connection Line */}
        <motion.path
          d="M 25 75 Q 50 55 75 35"
          fill="none" stroke="#22c55e" strokeWidth="1.5" strokeDasharray="4 4"
          animate={{ strokeDashoffset: [0, -20] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          className="drop-shadow-[0_0_5px_#22c55e]"
        />

        {/* Blocked Connection */}
        <line x1="25" y1="75" x2="25" y2="35" stroke="#ef4444" strokeWidth="0.5" strokeDasharray="1 2" className="opacity-50" />
        <line x1="22" y1="55" x2="28" y2="55" stroke="#ef4444" strokeWidth="1" />
      </svg>
    </AnimationWrapper>
  );
};

const ReconstitutionAnimation = () => {
  return (
    <AnimationWrapper title="Mathématiques" value="0.01ml" status="Précision Requise" color="yellow"
      extraUI={
        <div className="absolute bottom-4 left-4 bg-white/80 backdrop-blur-md border border-yellow-500/30 rounded p-2">
          <span className="text-[10px] text-yellow-400 font-mono uppercase">Calculateur: <span className="text-[#1D1D1F] font-bold">INTÉGRÉ</span></span>
        </div>
      }
    >
      <svg viewBox="0 0 100 100" className="w-full h-full absolute inset-0 overflow-visible p-8 z-10">
        {/* Syringe Body */}
        <rect x="40" y="20" width="20" height="50" rx="2" fill="rgba(255,255,255,0.05)" stroke="#eab308" strokeWidth="1" />
        <rect x="48" y="70" width="4" height="15" fill="#eab308" />
        <rect x="35" y="20" width="30" height="3" fill="#eab308" />

        {/* Graduations */}
        {[30, 40, 50, 60].map((y, i) => (
          <line key={i} x1="40" y1={y} x2="45" y2={y} stroke="#eab308" strokeWidth="0.5" />
        ))}

        {/* Plunger & Liquid */}
        <motion.rect
          x="42" y="25" width="16" height="40" fill="rgba(234,179,8,0.3)"
          initial={{ height: 40, y: 25 }}
          animate={{ height: [40, 10, 40], y: [25, 55, 25] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.rect
          x="42" y="23" width="16" height="2" fill="#eab308"
          animate={{ y: [23, 53, 23] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Math Equations */}
        <motion.text x="70" y="35" fill="#eab308" fontSize="4" className="font-mono font-bold" animate={{ opacity: [0, 1, 0] }} transition={{ duration: 2, repeat: Infinity, delay: 0 }}>10mg Vial</motion.text>
        <motion.text x="70" y="45" fill="#fff" fontSize="4" className="font-mono" animate={{ opacity: [0, 1, 0] }} transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}>+ 2ml BAC</motion.text>
        <motion.line x1="70" y1="50" x2="95" y2="50" stroke="#eab308" strokeWidth="0.5" animate={{ opacity: [0, 1, 0] }} transition={{ duration: 2, repeat: Infinity, delay: 1 }} />
        <motion.text x="70" y="60" fill="#eab308" fontSize="4" className="font-mono font-bold drop-shadow-[0_0_5px_#eab308]" animate={{ opacity: [0, 1, 0] }} transition={{ duration: 2, repeat: Infinity, delay: 1.5 }}>= 500mcg/0.1ml</motion.text>
      </svg>
    </AnimationWrapper>
  );
};

const SynergyAnimation = () => {
  return (
    <AnimationWrapper title="Pharmacocinétique" value="24/7" status="Couverture Récepteurs" color="red"
      extraUI={
        <div className="absolute bottom-4 right-4 bg-white/80 backdrop-blur-md border border-red-500/30 rounded p-2 flex flex-col items-end">
          <span className="text-[10px] text-red-400 font-mono uppercase">Saturation</span>
          <span className="text-sm font-bold text-[#1D1D1F]">OPTIMALE</span>
        </div>
      }
    >
      <svg viewBox="0 0 100 100" className="w-full h-full absolute inset-0 overflow-visible p-8 z-10">
        {/* Grid */}
        {[20, 40, 60, 80].map(y => (
          <line key={`h-${y}`} x1="10" y1={y} x2="90" y2={y} stroke="#334155" strokeWidth="0.5" className="opacity-30" />
        ))}
        {[20, 40, 60, 80].map(x => (
          <line key={`v-${x}`} x1={x} y1="10" x2={x} y2="90" stroke="#334155" strokeWidth="0.5" className="opacity-30" />
        ))}

        {/* Axes */}
        <line x1="10" y1="90" x2="90" y2="90" stroke="#64748b" strokeWidth="1" />
        <line x1="10" y1="90" x2="10" y2="10" stroke="#64748b" strokeWidth="1" />

        {/* Optimal Zone */}
        <rect x="10" y="30" width="80" height="30" fill="rgba(239,68,68,0.1)" />
        <text x="88" y="45" fill="#ef4444" fontSize="3" className="font-mono font-bold" textAnchor="end">THERAPEUTIC WINDOW</text>

        {/* Curve 1: Fast Acting (Red) */}
        <path d="M 10 90 Q 20 20 30 60 T 50 80 T 70 85 T 90 90" fill="none" stroke="#ef4444" strokeWidth="1.5" className="drop-shadow-[0_0_5px_#ef4444]" />

        {/* Curve 2: Slow Acting (Cyan) */}
        <path d="M 10 90 Q 30 80 50 40 T 90 45" fill="none" stroke="#06b6d4" strokeWidth="1.5" className="drop-shadow-[0_0_5px_#06b6d4]" />

        {/* Animated Playhead */}
        <motion.g animate={{ x: [10, 90] }} transition={{ duration: 5, repeat: Infinity, ease: "linear" }}>
          <line x1="0" y1="10" x2="0" y2="90" stroke="#fff" strokeWidth="0.5" className="drop-shadow-[0_0_5px_#fff]" />
          <polygon points="-2,10 2,10 0,14" fill="#fff" />
          <polygon points="-2,90 2,90 0,86" fill="#fff" />
        </motion.g>

        {/* Animated Intersection Dots */}
        <motion.circle cx="10" cy="90" r="2" fill="#ef4444" className="drop-shadow-[0_0_5px_#ef4444]"
          initial={{ cx: 10, cy: 90 }}
          animate={{
            cx: [10, 20, 30, 50, 70, 90],
            cy: [90, 35, 60, 80, 85, 90],
          }}
          transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
        />
        <motion.circle cx="10" cy="90" r="2" fill="#06b6d4" className="drop-shadow-[0_0_5px_#06b6d4]"
          initial={{ cx: 10, cy: 90 }}
          animate={{
            cx: [10, 30, 50, 70, 90],
            cy: [90, 60, 40, 42.5, 45],
          }}
          transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
        />

        {/* Data Readout */}
        <motion.g animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 2, repeat: Infinity }}>
          <rect x="15" y="15" width="35" height="15" fill="rgba(0,0,0,0.8)" stroke="#334155" strokeWidth="0.5" rx="2" />
          <text x="18" y="21" fill="#ef4444" fontSize="3" className="font-mono">PEAK: 2H</text>
          <text x="18" y="26" fill="#06b6d4" fontSize="3" className="font-mono">HALF-LIFE: 48H</text>
        </motion.g>
      </svg>
    </AnimationWrapper>
  );
};

// ============================================================================
// ANIMATED FEATURE SECTION
// ============================================================================

const FEATURE_CARDS = [
  {
    id: "arsenal",
    title: "L'ARSENAL CHIMIQUE",
    description:
      "BPC-157 et TB-500 pour reparer tes tissus a une vitesse surhumaine. Retatrutide pour une fonte adipeuse extreme sans perte musculaire. GHK-Cu pour inverser le vieillissement cellulaire. Je te donne acces aux molecules les plus puissantes du marche.",
    icon: Network,
    animation: ArsenalAnimation,
    color: "cyan" as const,
    reverse: false,
  },
  {
    id: "sourcing",
    title: "SOURCING UNDERGROUND",
    description:
      "Le marche est rempli de fakes et de sous-dosages dangereux. Ne te fais plus arnaquer. Je te donne l'acces direct a mes fournisseurs prives, testes par spectrometrie de masse (HPLC). Economise des centaines d'euros en achetant a la source avec une purete garantie a 99%.",
    icon: ShieldCheck,
    animation: SourcingAnimation,
    color: "green" as const,
    reverse: true,
  },
  {
    id: "reconstitution",
    title: "PROTOCOLES & RECONSTITUTION",
    description:
      "Une erreur de calcul et tu ruines ton cycle. Fini les calculs hasardeux. Je te fournis les calculateurs exacts : volume d'eau bacteriostatique precis, conversion mg/mcg, et graduation millimetree sur seringue a insuline pour chaque peptide.",
    icon: Calculator,
    animation: ReconstitutionAnimation,
    color: "yellow" as const,
    reverse: false,
  },
  {
    id: "synergy",
    title: "SYNERGIE & TIMINGS",
    description:
      "Savoir quoi prendre ne suffit pas. Il faut savoir QUAND. Protocoles a jeun, fenetres post-workout, gestion stricte de la demi-vie et cycles de desensibilisation pour eviter la saturation des recepteurs. Je supervise tes cycles pour maximiser tes resultats.",
    icon: GitMerge,
    animation: SynergyAnimation,
    color: "red" as const,
    reverse: true,
  },
];

const colorThemes = {
  cyan: {
    border: "border-cyan-900/30",
    iconBg: "bg-cyan-500/10",
    iconColor: "text-cyan-500",
    shadow: "shadow-[0_0_30px_rgba(6,182,212,0.08)]",
    hoverBorder: "hover:border-cyan-500/40",
    gradient: "from-cyan-500/5",
  },
  green: {
    border: "border-green-900/30",
    iconBg: "bg-green-500/10",
    iconColor: "text-green-500",
    shadow: "shadow-[0_0_30px_rgba(34,197,94,0.08)]",
    hoverBorder: "hover:border-green-500/40",
    gradient: "from-green-500/5",
  },
  yellow: {
    border: "border-yellow-900/30",
    iconBg: "bg-yellow-500/10",
    iconColor: "text-yellow-500",
    shadow: "shadow-[0_0_30px_rgba(234,179,8,0.08)]",
    hoverBorder: "hover:border-yellow-500/40",
    gradient: "from-yellow-500/5",
  },
  red: {
    border: "border-red-900/30",
    iconBg: "bg-red-500/10",
    iconColor: "text-red-500",
    shadow: "shadow-[0_0_30px_rgba(239,68,68,0.08)]",
    hoverBorder: "hover:border-red-500/40",
    gradient: "from-red-500/5",
  },
};

function AnimatedFeaturesSection() {
  return (
    <section className="py-24 px-6 bg-white">
      <div className="mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16 text-center"
        >
          <SectionLabel>Ce que contient ton protocole</SectionLabel>
          <h2 className="mt-4 text-3xl font-bold text-[#1D1D1F] md:text-4xl">
            La science derriere chaque decision
          </h2>
          <p className="mt-4 text-[#6E6E73] max-w-2xl mx-auto">
            Chaque element de ton protocole est documente, calcule et verifie. Pas d'improvisation.
          </p>
        </motion.div>

        <div className="space-y-10">
          {FEATURE_CARDS.map((card, index) => {
            const AnimComp = card.animation;
            const IconComp = card.icon;
            const theme = colorThemes[card.color];
            return (
              <motion.div
                key={card.id}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.7, ease: "easeOut", delay: 0.1 }}
                className={`relative flex flex-col ${card.reverse ? "lg:flex-row-reverse" : "lg:flex-row"} items-center gap-8 lg:gap-14 p-8 lg:p-12 rounded-3xl bg-white/40 backdrop-blur-sm border ${theme.border} ${theme.shadow} ${theme.hoverBorder} transition-all duration-500 overflow-hidden`}
              >
                {/* Background gradient */}
                <div className={`absolute inset-0 bg-gradient-to-br ${theme.gradient} to-transparent opacity-40 pointer-events-none`} />

                {/* Text side */}
                <div className="flex-1 flex flex-col items-center lg:items-start text-center lg:text-left relative z-10">
                  <div className={`w-14 h-14 rounded-2xl ${theme.iconBg} border ${theme.border} flex items-center justify-center mb-6 ${theme.iconColor}`}>
                    <IconComp size={28} />
                  </div>
                  <h3 className="text-2xl md:text-3xl font-black mb-4 tracking-tight uppercase text-[#1D1D1F]">
                    {card.title}
                  </h3>
                  <p className="text-base text-[#6E6E73] leading-relaxed">
                    {card.description}
                  </p>
                </div>

                {/* Animation side */}
                <div className="flex-1 w-full flex justify-center relative z-10">
                  <AnimComp />
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// COA EXAMPLES
// ============================================================================

function COASection() {
  return (
    <section className="py-20 px-6 bg-white">
      <div className="mx-auto max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <p className="text-xs font-mono uppercase tracking-[0.3em] text-green-500 mb-3">Transparence totale</p>
          <h2 className="text-2xl md:text-3xl font-black text-[#1D1D1F] mb-3">
            Chaque lot est teste par un labo independant
          </h2>
          <p className="text-[#6E6E73] text-sm max-w-xl mx-auto">
            Les fournisseurs Peptaura fournissent un COA (Certificate of Analysis) pour chaque lot produit. Purete verifiee par spectrometrie de masse (HPLC), generalement 98-99%.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6">
          <motion.a
            href="https://www.peptaura.com/coas/0f216e6b9a6c700dcf11bb051f6f7acf31ff0ac79d0230a572e2ee07f3558fbd.png"
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="group rounded-2xl border border-green-900/30 bg-white/40 p-4 hover:border-green-500/40 transition-all overflow-hidden"
          >
            <img
              src="https://www.peptaura.com/coas/0f216e6b9a6c700dcf11bb051f6f7acf31ff0ac79d0230a572e2ee07f3558fbd.png"
              alt="Exemple COA - Certificat d'Analyse peptide"
              className="w-full rounded-lg opacity-80 group-hover:opacity-100 transition-opacity"
              loading="lazy"
            />
            <p className="text-center text-xs text-[#86868B] mt-3 font-mono">Exemple de COA (cliquer pour agrandir)</p>
          </motion.a>

          <motion.a
            href="https://www.peptaura.com/coas/32001f878ccdf779123172f705efb48db899480894340e0e32c2cef3bcc621f5.pdf"
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="group rounded-2xl border border-green-900/30 bg-white/40 p-6 hover:border-green-500/40 transition-all flex flex-col items-center justify-center gap-4"
          >
            <div className="w-20 h-20 rounded-2xl bg-green-500/10 flex items-center justify-center">
              <ExternalLink className="w-8 h-8 text-green-500" />
            </div>
            <div className="text-center">
              <p className="text-[#1D1D1F] font-bold mb-1">COA complet (PDF)</p>
              <p className="text-[#86868B] text-xs">Rapport HPLC avec chromatogramme, purete, identite moleculaire</p>
            </div>
            <p className="text-xs text-green-500 font-mono">Cliquer pour telecharger</p>
          </motion.a>
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// DELIVERABLES GRID
// ============================================================================

function DeliverablesSection() {
  return (
    <section className="py-24 px-6 bg-white">
      <div className="mx-auto max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-14 text-center"
        >
          <SectionLabel>Ce que tu recois</SectionLabel>
          <h2 className="mt-4 text-3xl font-bold text-[#1D1D1F] md:text-4xl">
            9 livrables. Tout ce qu'il faut. Rien de superflu.
          </h2>
        </motion.div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {DELIVERABLES.map((item, i) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="rounded-xl border border-[#E5E5EA] bg-[#F5F5F7] p-6"
              >
                <div
                  className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg"
                  style={{ backgroundColor: "rgba(0,113,227,0.1)" }}
                >
                  <Icon className="h-5 w-5" style={{ color: PRIMARY }} />
                </div>
                <h3 className="mb-2 text-sm font-semibold text-[#1D1D1F]">{item.title}</h3>
                <p className="text-sm leading-relaxed text-[#6E6E73]">{item.desc}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// HOW IT WORKS
// ============================================================================

function HowItWorks() {
  return (
    <section className="py-24 px-6">
      <div className="mx-auto max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-14 text-center"
        >
          <SectionLabel>Processus</SectionLabel>
          <h2 className="mt-4 text-3xl font-bold text-[#1D1D1F] md:text-4xl">3 etapes, 48h</h2>
        </motion.div>

        <div className="relative">
          {/* Connecting line */}
          <div className="absolute left-[28px] top-10 bottom-10 w-px bg-white/8 md:left-1/2 md:-translate-x-px hidden md:block" />

          <div className="space-y-8">
            {STEPS.map((step, i) => {
              const Icon = step.icon;
              return (
                <motion.div
                  key={step.step}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.12 }}
                  className={`flex items-start gap-6 md:gap-10 ${i % 2 === 1 ? "md:flex-row-reverse" : ""}`}
                >
                  <div className="relative shrink-0">
                    <div
                      className="flex h-14 w-14 items-center justify-center rounded-full border-2 bg-[#F5F5F7]"
                      style={{ borderColor: PRIMARY }}
                    >
                      <Icon className="h-6 w-6" style={{ color: PRIMARY }} />
                    </div>
                  </div>
                  <div className="flex-1 rounded-xl border border-[#E5E5EA] bg-[#F5F5F7] p-6">
                    <div className="mb-1 flex items-center gap-3">
                      <span className="font-mono text-xs" style={{ color: PRIMARY }}>{step.step}</span>
                      <span className="rounded-full border border-[#D2D2D7] px-2 py-0.5 font-mono text-xs text-[#86868B]">
                        {step.time}
                      </span>
                    </div>
                    <h3 className="mb-2 text-base font-semibold text-[#1D1D1F]">{step.title}</h3>
                    <p className="text-sm leading-relaxed text-[#6E6E73]">{step.desc}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// OBJECTIVES
// ============================================================================

function ObjectivesSection() {
  return (
    <section className="py-24 px-6 bg-white">
      <div className="mx-auto max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-14 text-center"
        >
          <SectionLabel>Objectifs couverts</SectionLabel>
          <h2 className="mt-4 text-3xl font-bold text-[#1D1D1F] md:text-4xl">
            8 categories. 74 molecules disponibles.
          </h2>
          <p className="mt-4 text-[#6E6E73]">
            Le questionnaire identifie ton objectif principal et adapte le stack en consequence.
          </p>
        </motion.div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {OBJECTIVES.map((obj, i) => {
            const Icon = obj.icon;
            return (
              <motion.div
                key={obj.title}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
                className="group rounded-xl border border-[#E5E5EA] bg-[#F5F5F7] p-5 transition-colors hover:border-[#0071E3]/30"
              >
                <div
                  className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg"
                  style={{ backgroundColor: "rgba(0,113,227,0.1)" }}
                >
                  <Icon className="h-4 w-4" style={{ color: PRIMARY }} />
                </div>
                <h3 className="mb-1 text-sm font-semibold text-[#1D1D1F]">{obj.title}</h3>
                <p className="mb-2 font-mono text-[11px]" style={{ color: PRIMARY }}>{obj.peptides}</p>
                <p className="text-xs leading-relaxed text-[#86868B]">{obj.detail}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// CREDIBILITY BAR
// ============================================================================

function CredibilityBar() {
  return (
    <section className="py-16 px-6 border-y border-[#E5E5EA]">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-8">
          {CREDIBILITY.map((item, i) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="text-center"
            >
              <p className="text-2xl font-bold" style={{ color: PRIMARY }}>{item.stat}</p>
              <p className="mt-1 text-xs text-[#86868B]">{item.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// SCARCITY + GUARANTEE
// ============================================================================

function ScarcityGuarantee() {
  return (
    <section className="py-24 px-6">
      <div className="mx-auto max-w-4xl">
        <div className="grid gap-6 md:grid-cols-2">
          {/* Scarcity */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-2xl border bg-[#F5F5F7] p-8"
            style={{ borderColor: "rgba(0,113,227,0.3)" }}
          >
            <div className="mb-4 flex items-center gap-3">
              <Users className="h-5 w-5" style={{ color: PRIMARY }} />
              <SectionLabel>Disponibilite</SectionLabel>
            </div>
            <p className="mb-3 text-2xl font-bold text-[#1D1D1F]">15 protocoles par mois</p>
            <p className="text-sm text-[#6E6E73]">
              Chaque protocole est verifie manuellement avant envoi. La limite mensuelle garantit la qualite de chaque livrable.
            </p>
          </motion.div>

          {/* Guarantee */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="rounded-2xl border border-[#D2D2D7] bg-[#F5F5F7] p-8"
          >
            <div className="mb-4 flex items-center gap-3">
              <Shield className="h-5 w-5" style={{ color: PRIMARY }} />
              <SectionLabel>Gage de qualite</SectionLabel>
            </div>
            <p className="mb-3 text-xl font-bold text-[#1D1D1F] leading-snug">
              Je construis ton protocole personnellement
            </p>
            <p className="text-sm leading-relaxed text-[#6E6E73]">
              C'est moi, Achzod, qui analyse ton profil et qui valide chaque protocole avant de te l'envoyer. Les 2 bilans sanguins inclus te permettent de suivre tes marqueurs objectivement et de me contacter pour ajuster si besoin.
            </p>
            <div className="mt-6 flex items-center gap-2">
              <Check className="h-4 w-4" style={{ color: PRIMARY }} />
              <p className="text-sm font-semibold text-[#1D1D1F]">Mon expertise, ton suivi mesurable</p>
            </div>
          </motion.div>
        </div>

        {/* Coaching combo */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="mt-6 rounded-2xl border border-[#0071E3]/20 bg-[#F5F5F7] p-8"
        >
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            <div className="flex-1">
              <p className="text-xs font-mono uppercase tracking-widest text-[#0071E3] mb-2">Peptides + Coaching</p>
              <p className="text-xl font-bold text-[#1D1D1F] mb-3">Ton montant Peptides Engine (199€, 299€ ou 399€) est intégralement déduit de ton coaching Essential, Elite ou Private Lab 8 ou 12 semaines.</p>
              <p className="text-sm text-[#6E6E73] leading-relaxed mb-4">
                Tu peux commander tes peptides maintenant, prendre un coaching Achzod, et commencer le suivi une fois que tu as recu tes peptides. Le crédit déduction est valable 8 semaines à compter de la livraison de ton rapport.
              </p>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-[#424245]">
                  <Check className="h-3.5 w-3.5 flex-shrink-0" style={{ color: PRIMARY }} />
                  <span>Commande tes peptides sur Peptaura</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-[#424245]">
                  <Check className="h-3.5 w-3.5 flex-shrink-0" style={{ color: PRIMARY }} />
                  <span>Prends ta formule coaching Essential, Elite ou Private Lab (8 ou 12 semaines)</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-[#424245]">
                  <Check className="h-3.5 w-3.5 flex-shrink-0" style={{ color: PRIMARY }} />
                  <span>Commence le coaching des que tu recois tes peptides</span>
                </div>
              </div>
            </div>
            <a
              href="https://www.achzodcoaching.com/formules-coaching"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-bold text-sm text-white whitespace-nowrap"
              style={{ background: PRIMARY }}
            >
              Voir les formules coaching
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// ============================================================================
// FAQ SECTION
// ============================================================================

function FAQSection() {
  return (
    <section className="py-24 px-6 bg-white">
      <div className="mx-auto max-w-3xl">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-14 text-center"
        >
          <SectionLabel>Questions frequentes</SectionLabel>
          <h2 className="mt-4 text-3xl font-bold text-[#1D1D1F] md:text-4xl">
            Tout ce que tu veux savoir
          </h2>
        </motion.div>

        <div>
          {FAQ.map((item, i) => (
            <FAQItem key={item.q} q={item.q} a={item.a} index={i} />
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-12 rounded-2xl border border-[#D2D2D7] bg-[#F5F5F7] p-6 text-center md:p-8"
        >
          <div
            className="mx-auto flex h-12 w-12 items-center justify-center rounded-full"
            style={{ backgroundColor: `${WHATSAPP_GREEN}1A`, color: WHATSAPP_TEXT }}
          >
            <MessageCircle className="h-6 w-6" aria-hidden="true" />
          </div>
          <h3 className="mt-4 text-xl font-bold text-[#1D1D1F]">
            Encore une question avant de choisir ?
          </h3>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-[#6E6E73]">
            Écris-moi directement sur WhatsApp pour une question sur l'offre, la livraison ou le choix de la formule.
          </p>
          <PeptidesWhatsAppLink
            placement="faq"
            label="Écris-moi sur WhatsApp"
            filled
            className="mt-5 border-0 px-7 py-3.5 text-sm shadow-[0_10px_26px_rgba(18,140,126,0.24)]"
          />
          <p className="mt-3 text-[11px] text-[#86868B]">
            Les conseils médicaux personnalisés restent du ressort d'un professionnel de santé.
          </p>
        </motion.div>
      </div>
    </section>
  );
}

// ============================================================================
// FINAL CTA
// ============================================================================

// ============================================================================
// REVIEWS SECTION
// ============================================================================

function ReviewsSection() {
  const [reviews, setReviews] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/reviews")
      .then(r => r.json())
      .then(d => setReviews(d.reviews || []))
      .catch(() => {});
  }, []);

  if (reviews.length === 0) return null;

  return (
    <section className="py-20 px-6 bg-white">
      <div className="mx-auto max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <p className="text-xs font-mono uppercase tracking-[0.3em] mb-3" style={{ color: PRIMARY }}>Avis clients</p>
          <h2 className="text-2xl md:text-3xl font-black text-[#1D1D1F] mb-2">
            Ce qu'en pensent mes clients
          </h2>
          <div className="flex items-center justify-center gap-1 mb-2">
            {[1,2,3,4,5].map(i => (
              <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
            ))}
            <span className="text-[#6E6E73] text-sm ml-2">{reviews.length} avis</span>
          </div>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reviews.slice(0, 6).map((r, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="bg-white/[0.03] border border-[#D2D2D7] rounded-xl p-5"
            >
              <div className="flex items-center gap-1 mb-3">
                {[1,2,3,4,5].map(s => (
                  <Star key={s} className={`w-3.5 h-3.5 ${s <= r.rating ? "fill-yellow-400 text-yellow-400" : "text-[#D2D2D7]"}`} />
                ))}
              </div>
              <p className="text-[#424245] text-sm leading-relaxed mb-3">
                "{r.comment?.length > 120 ? r.comment.slice(0, 120) + "..." : r.comment}"
              </p>
              <p className="text-[#A1A1A6] text-xs font-mono">
                {r.auditType === "PEPTIDES_ENGINE" ? "Peptides Engine" : r.auditType === "ANABOLIC_BIOSCAN" ? "Anabolic Bioscan" : "Discovery Scan"}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// TRUST SECTION (Garantie + Logos)
// ============================================================================

function TrustSection() {
  return (
    <section className="py-16 px-6 bg-[#F5F5F7]">
      <div className="mx-auto max-w-5xl">
        {/* Garantie reponse */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-white/[0.02] border border-[#D2D2D7] rounded-2xl p-8 mb-8 text-center"
        >
          <div className="w-14 h-14 rounded-2xl bg-[#0071E3]/10 flex items-center justify-center mx-auto mb-4">
            <Mail className="w-7 h-7 text-[#0071E3]" />
          </div>
          <h3 className="text-xl font-bold text-[#1D1D1F] mb-2">Je reponds personnellement a chaque message</h3>
          <p className="text-[#6E6E73] text-sm max-w-lg mx-auto mb-4">
            Une question sur ton protocole, un doute sur un dosage, besoin d'un ajustement ? Ecris-moi directement.
            Je reponds sous 24h, personnellement. Pas un assistant, pas un bot. Moi.
          </p>
          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
            <PeptidesWhatsAppLink
              placement="trust"
              label="Me parler directement sur WhatsApp"
              filled
              className="w-full border-0 px-7 py-3.5 text-sm shadow-[0_10px_26px_rgba(18,140,126,0.24)] sm:w-auto"
            />
            <a href="mailto:coaching@achzodcoaching.com" className="px-4 py-3 font-mono text-xs text-[#0071E3] hover:underline">
              ou par email
            </a>
          </div>
        </motion.div>

        {/* Logos de confiance */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="flex flex-wrap items-center justify-center gap-8 text-[#A1A1A6] text-xs font-mono uppercase tracking-widest"
        >
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4" />
            <span>Paiement securise Stripe</span>
          </div>
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            <span>PayPal Buyer Protection</span>
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4" />
            <span>COA verifie par labo HPLC</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            <span>RGPD conforme</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function FinalCTA() {
  return (
    <section className="py-32 px-6">
      <div className="mx-auto max-w-5xl text-center">
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <SectionLabel>Démarre maintenant</SectionLabel>
          <h2 className="mt-6 text-4xl font-bold text-[#1D1D1F] md:text-5xl leading-tight">
            Choisis ton niveau d'accompagnement.{" "}
            <span style={{ color: PRIMARY }}>Livré sous 48h.</span>
          </h2>
          <p className="mt-6 text-lg text-[#6E6E73] max-w-2xl mx-auto">
            Le même protocole expert dans les trois offres. Ce qui change : les bilans sanguins, la durée du support, le crédit déductible sur ton coaching.
          </p>

          {/* 3 compact cards CTA */}
          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {PRICING_TIERS.map((tier) => {
              const isFeatured = tier.badge === "Le plus choisi";
              return (
                <Link
                  key={tier.id}
                  href={tier.href}
                  className={`group block rounded-2xl border-2 p-6 text-left transition-all hover:scale-[1.02] hover:shadow-lg ${
                    isFeatured
                      ? "border-[#0071E3] bg-[#0071E3]/5"
                      : "border-[#D2D2D7] bg-white hover:border-[#0071E3]"
                  }`}
                >
                    {tier.badge && (
                      <span
                        className="inline-block mb-3 rounded-full px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                        style={{
                          backgroundColor: isFeatured ? PRIMARY : "#1D1D1F",
                          color: "#fff",
                        }}
                      >
                        {tier.badge}
                      </span>
                    )}
                    <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#6E6E73]">
                      Peptides Engine
                    </p>
                    <h3 className="mt-1 text-2xl font-bold text-[#1D1D1F]">{tier.name}</h3>
                    <p className="mt-3 text-3xl font-bold text-[#1D1D1F]">
                      {tier.price}€
                    </p>
                    <p className="mt-1 text-xs font-mono text-[#0071E3]">
                      {tier.deduction}€ déductibles coaching
                    </p>
                    <div
                      className="mt-5 inline-flex items-center gap-2 text-sm font-semibold group-hover:gap-3 transition-all"
                      style={{ color: isFeatured ? PRIMARY : "#1D1D1F" }}
                    >
                      Choisir {tier.name}
                      <ArrowRight className="h-4 w-4" />
                    </div>
                </Link>
              );
            })}
          </div>

          <div className="mt-8 flex flex-col items-center justify-between gap-5 rounded-2xl border border-[#25D366]/40 bg-[#25D366]/[0.06] p-5 text-left sm:flex-row sm:p-6">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#25D366]/15 text-[#128C7E]">
                <MessageCircle className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <p className="font-bold text-[#1D1D1F]">Tu hésites encore entre les trois offres ?</p>
                <p className="mt-1 text-sm text-[#6E6E73]">Explique-moi ton objectif et je t'aide à choisir sans engagement.</p>
              </div>
            </div>
            <PeptidesWhatsAppLink
              placement="final"
              label="M'aider à choisir"
              filled
              className="w-full shrink-0 border-0 px-6 py-3.5 text-sm shadow-[0_10px_26px_rgba(18,140,126,0.22)] sm:w-auto"
            />
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-5 text-xs text-[#86868B]">
            <span className="flex items-center gap-1.5">
              <Clock className="h-3 w-3" />
              15 protocoles par mois maximum
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="h-3 w-3" style={{ color: PRIMARY }} />
              Livraison email sous 48h
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="h-3 w-3" style={{ color: PRIMARY }} />
              Crédit coaching valable 8 sem
            </span>
            <span className="flex items-center gap-1.5">
              <Lock className="h-3 w-3" style={{ color: PRIMARY }} />
              Paiement sécurisé Stripe + PayPal
            </span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// ============================================================================
// PRICING TIERS , 3 offres côte à côte
// ============================================================================

const PRICING_TIERS = [
  {
    id: "solo",
    name: "Solo",
    tagline: "Pour celui qui sait ce qu'il fait",
    price: 199,
    badge: null as string | null,
    deduction: 199,
    features: [
      { label: "Protocole personnalisé sur-mesure", included: true },
      { label: "Guide de reconstitution + calendrier injection", included: true },
      { label: "Accès source directe (-60 à -90% vs revendeurs)", included: true },
      { label: "Crédit déduction coaching 199€ (valable 8 sem)", included: true },
      { label: "Bilan sanguin baseline", included: false },
      { label: "Bilan sanguin mi-cycle", included: false },
      { label: "Support écrit post-livraison", included: false },
    ],
    description:
      "Le protocole expert, livré clé en main. Pour celui qui a déjà un bilan récent ou qui se chargera du suivi en autonomie.",
    ctaLabel: "Choisir Solo , 199€",
    href: "/peptides-engine?tier=solo",
  },
  {
    id: "coached",
    name: "Coached",
    tagline: "Le filet de sécurité + accompagnement",
    price: 299,
    badge: "Le plus choisi",
    deduction: 299,
    features: [
      { label: "Protocole personnalisé sur-mesure", included: true },
      { label: "Guide de reconstitution + calendrier injection", included: true },
      { label: "Accès source directe (-60 à -90% vs revendeurs)", included: true },
      { label: "Crédit déduction coaching 299€ (valable 8 sem)", included: true },
      { label: "1 Bilan sanguin (baseline OU mi-cycle, au choix)", included: true },
      { label: "Support écrit 30 jours post-livraison", included: true },
      { label: "Bilan sanguin supplémentaire", included: false },
    ],
    description:
      "La protection métabolique pendant le démarrage du cycle. Tu choisis quand utiliser ton bilan sanguin, et tu as accès direct à mon support écrit pendant 30 jours.",
    ctaLabel: "Choisir Coached , 299€",
    href: "/peptides-engine?tier=coached",
  },
  {
    id: "tracked",
    name: "Tracked",
    tagline: "Le track scientifique complet",
    price: 399,
    badge: "Maximum value",
    deduction: 399,
    features: [
      { label: "Protocole personnalisé sur-mesure", included: true },
      { label: "Guide de reconstitution + calendrier injection", included: true },
      { label: "Accès source directe (-60 à -90% vs revendeurs)", included: true },
      { label: "Crédit déduction coaching 399€ (valable 8 sem)", included: true },
      { label: "Bilan sanguin baseline (avant cycle)", included: true },
      { label: "Bilan sanguin mi-cycle (semaine 4 à 6)", included: true },
      { label: "Support écrit 90 jours post-livraison", included: true },
      { label: "1 réécriture protocole si évolution objectif", included: true },
    ],
    description:
      "Le track end-to-end : tu rentres avec une baseline mesurée, tu sors avec une comparaison avant/après. Et si ta situation change (blessure, opération), je réécris ton protocole une fois sans surcoût.",
    ctaLabel: "Choisir Tracked , 399€",
    href: "/peptides-engine?tier=tracked",
  },
] as const;

function PricingTiers() {
  return (
    <section id="offres" className="scroll-mt-16 py-24 px-6 bg-[#FBFBFD]">
      <div className="mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-14 text-center"
        >
          <SectionLabel>Choisis ton offre</SectionLabel>
          <h2 className="mt-4 text-3xl font-bold text-[#1D1D1F] md:text-4xl leading-tight">
            Trois niveaux d'accompagnement.<br className="hidden md:block" />{" "}
            <span style={{ color: PRIMARY }}>Le même protocole expert dans les trois.</span>
          </h2>
          <p className="mt-4 text-[#6E6E73] max-w-2xl mx-auto">
            Ce qui change entre les tiers : la quantité de bilans sanguins, la durée du support écrit, et le montant déductible sur ton coaching. Le rapport peptides reste identique.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-10 flex flex-col items-center justify-between gap-5 rounded-2xl border border-[#25D366]/40 bg-white p-5 shadow-[0_12px_36px_rgba(18,140,126,0.08)] sm:flex-row sm:p-6"
        >
          <div className="flex items-start gap-4 text-left">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#25D366]/15 text-[#128C7E]">
              <MessageCircle className="h-6 w-6" aria-hidden="true" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#1D1D1F]">Pas sûr du niveau qu'il te faut ?</h3>
              <p className="mt-1 text-sm leading-relaxed text-[#6E6E73]">
                Envoie-moi ton objectif sur WhatsApp. Je t'aide personnellement à choisir la bonne formule.
              </p>
            </div>
          </div>
          <PeptidesWhatsAppLink
            placement="pricing_assist"
            label="Aide-moi à choisir"
            filled
            className="w-full shrink-0 border-0 px-7 py-3.5 text-sm shadow-[0_10px_26px_rgba(18,140,126,0.24)] sm:w-auto"
          />
        </motion.div>

        <div className="grid gap-6 md:grid-cols-3">
          {PRICING_TIERS.map((tier, idx) => {
            const isFeatured = tier.badge === "Le plus choisi";
            return (
              <motion.div
                key={tier.id}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.08 }}
                className={`relative rounded-2xl border bg-white p-6 md:p-8 flex flex-col ${
                  isFeatured
                    ? "border-[#0071E3] shadow-2xl shadow-[#0071E3]/10 md:scale-105"
                    : "border-[#D2D2D7]"
                }`}
              >
                {tier.badge && (
                  <div
                    className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-4 py-1 text-xs font-bold whitespace-nowrap"
                    style={{
                      backgroundColor: isFeatured ? PRIMARY : "#1D1D1F",
                      color: "#fff",
                    }}
                  >
                    {tier.badge}
                  </div>
                )}

                <div className="flex flex-col items-start gap-2 mb-6">
                  <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#6E6E73]">
                    Peptides Engine
                  </p>
                  <h3 className="text-3xl font-bold text-[#1D1D1F]">{tier.name}</h3>
                  <p className="text-sm text-[#6E6E73]">{tier.tagline}</p>
                </div>

                <div className="mb-6">
                  <div className="flex items-end gap-2">
                    <span className="text-5xl font-bold text-[#1D1D1F]">{tier.price}€</span>
                    <span className="mb-2 text-sm text-[#86868B]">TTC</span>
                  </div>
                  <p className="mt-2 text-xs font-mono text-[#0071E3]">
                    {tier.deduction}€ déductibles sur ton coaching 8 ou 12 sem
                  </p>
                </div>

                <p className="mb-6 text-sm text-[#424245] leading-relaxed">{tier.description}</p>

                <ul className="space-y-3 mb-8 flex-grow">
                  {tier.features.map((f) => (
                    <li key={f.label} className="flex items-start gap-2.5 text-sm">
                      {f.included ? (
                        <Check
                          className="h-4 w-4 mt-0.5 flex-shrink-0"
                          style={{ color: PRIMARY }}
                        />
                      ) : (
                        <span className="h-4 w-4 mt-0.5 flex-shrink-0 inline-block rounded-full border border-[#D2D2D7]" />
                      )}
                      <span className={f.included ? "text-[#1D1D1F]" : "text-[#86868B] line-through"}>
                        {f.label}
                      </span>
                    </li>
                  ))}
                </ul>

                <Link
                  href={tier.href}
                  className="block w-full rounded-full px-6 py-4 text-center text-sm font-semibold text-white transition-colors"
                  style={{ backgroundColor: isFeatured ? PRIMARY : "#1D1D1F" }}
                >
                  {tier.ctaLabel}
                </Link>

                <PeptidesWhatsAppLink
                  placement="pricing_card"
                  tier={tier.id}
                  label={`Me conseiller sur ${tier.name}`}
                  filled
                  className="mt-3 w-full border-0 px-4 py-3 text-sm shadow-[0_8px_20px_rgba(18,140,126,0.2)]"
                />
              </motion.div>
            );
          })}
        </div>

        <p className="mt-10 text-center text-xs text-[#86868B] font-mono">
          Paiement Stripe ou PayPal · TVA incluse · Aucun remboursement après livraison du rapport (CGV art. 7)
        </p>
      </div>
    </section>
  );
}

// ============================================================================
// COACHING DEDUCTION TABLE , offre killer
// ============================================================================

const DEDUCTION_MATRIX = [
  {
    coachingName: "Essential",
    duration: "8 sem",
    basePrice: 399,
    soloFinal: 200,
    coachedFinal: 100,
    trackedFinal: 0,
  },
  {
    coachingName: "Essential",
    duration: "12 sem",
    basePrice: 549,
    soloFinal: 350,
    coachedFinal: 250,
    trackedFinal: 150,
  },
  {
    coachingName: "Elite",
    duration: "8 sem",
    basePrice: 649,
    soloFinal: 450,
    coachedFinal: 350,
    trackedFinal: 250,
  },
  {
    coachingName: "Elite",
    duration: "12 sem",
    basePrice: 899,
    soloFinal: 700,
    coachedFinal: 600,
    trackedFinal: 500,
  },
  {
    coachingName: "Private Lab",
    duration: "8 sem",
    basePrice: 799,
    soloFinal: 600,
    coachedFinal: 500,
    trackedFinal: 400,
  },
  {
    coachingName: "Private Lab",
    duration: "12 sem",
    basePrice: 1199,
    soloFinal: 1000,
    coachedFinal: 900,
    trackedFinal: 800,
  },
];

function CoachingDeduction() {
  return (
    <section className="py-24 px-6 bg-white">
      <div className="mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-12 text-center"
        >
          <SectionLabel>L'offre killer</SectionLabel>
          <h2 className="mt-4 text-3xl font-bold text-[#1D1D1F] md:text-5xl leading-tight">
            Ton Peptides Engine est{" "}
            <span style={{ color: PRIMARY }}>intégralement déduit</span><br className="hidden md:block" />
            sur ton coaching Essential, Elite ou Private Lab.
          </h2>
          <p className="mt-6 text-lg text-[#6E6E73] max-w-3xl mx-auto leading-relaxed">
            Tu paies ton protocole peptides aujourd'hui. Si tu décides de passer au coaching dans les 8 semaines, ton montant Peptides est retiré du prix du coaching 8 ou 12 semaines, peu importe la formule.
          </p>
          <p className="mt-4 text-sm font-mono text-[#86868B]">
            Crédit valable 8 semaines après livraison du rapport · Cumulable avec aucune autre promo
          </p>
        </motion.div>

        {/* Highlighted killer offer */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="mb-12 rounded-3xl border-2 border-[#0071E3] bg-gradient-to-br from-[#0071E3]/5 to-[#FBFBFD] p-8 md:p-12"
        >
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6 md:gap-12">
            <div className="flex-1">
              <p className="font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-[#0071E3] mb-3">
                Combo signature
              </p>
              <h3 className="text-2xl md:text-3xl font-bold text-[#1D1D1F] leading-tight">
                Tracked 399€ + Essential 8 sem
              </h3>
              <p className="mt-3 text-base text-[#424245] leading-relaxed">
                399€ Peptides Engine + 399€ Essential 8 sem = 399€ déduits. <strong className="text-[#1D1D1F]">Ton coaching Essential 8 semaines est totalement offert.</strong>
              </p>
              <p className="mt-3 text-sm text-[#6E6E73]">
                Tu paies une seule fois 399€ et tu repars avec : le protocole peptides personnalisé, 2 bilans sanguins, 90 jours de support, ET 8 semaines de coaching Essential complet. Pour le prix d'un coaching Essential seul.
              </p>
            </div>
            <div className="flex flex-col items-center md:items-end gap-2 md:gap-3 w-full md:w-auto">
              <div className="text-right">
                <p className="text-xs font-mono text-[#86868B] line-through">Valeur séparée 798€</p>
                <p className="text-5xl md:text-6xl font-bold text-[#1D1D1F] leading-none">399€</p>
                <p className="mt-1 text-xs font-mono text-[#0071E3]">Économie 399€</p>
              </div>
              <Link
                href="/peptides-engine?tier=tracked"
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#0071E3] px-6 py-3 text-sm font-semibold text-white transition-colors md:w-auto"
              >
                Réserver le combo signature
              </Link>
            </div>
          </div>
        </motion.div>

        {/* Full deduction matrix */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="rounded-2xl border border-[#D2D2D7] bg-white overflow-hidden"
        >
          <div className="px-6 py-5 border-b border-[#D2D2D7] bg-[#F5F5F7]">
            <h3 className="text-lg font-bold text-[#1D1D1F]">
              Combien tu paies vraiment selon ta combinaison
            </h3>
            <p className="mt-1 text-sm text-[#6E6E73]">
              Prix coaching final après application de ton crédit déduction Peptides Engine
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead className="bg-[#FBFBFD] border-b border-[#E5E5EA]">
                <tr>
                  <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-wider text-[#86868B]">
                    Coaching
                  </th>
                  <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-wider text-[#86868B]">
                    Durée
                  </th>
                  <th className="px-4 py-3 text-center font-mono text-[10px] uppercase tracking-wider text-[#86868B]">
                    Prix de base
                  </th>
                  <th className="px-4 py-3 text-center font-mono text-[10px] uppercase tracking-wider text-[#86868B]">
                    Solo 199€<br />
                    <span className="font-normal normal-case">après déduction</span>
                  </th>
                  <th className="px-4 py-3 text-center font-mono text-[10px] uppercase tracking-wider" style={{ color: PRIMARY }}>
                    Coached 299€<br />
                    <span className="font-normal normal-case">après déduction</span>
                  </th>
                  <th className="px-4 py-3 text-center font-mono text-[10px] uppercase tracking-wider text-[#86868B]">
                    Tracked 399€<br />
                    <span className="font-normal normal-case">après déduction</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {DEDUCTION_MATRIX.map((row, idx) => {
                  const isLastOfGroup = idx % 2 === 1;
                  const isFreeCell = row.trackedFinal === 0;
                  return (
                    <tr
                      key={`${row.coachingName}-${row.duration}`}
                      className={`${isLastOfGroup ? "border-b-2 border-[#E5E5EA]" : "border-b border-[#E5E5EA]/50"} hover:bg-[#FBFBFD]`}
                    >
                      <td className="px-4 py-4 font-semibold text-[#1D1D1F]">
                        {row.coachingName}
                      </td>
                      <td className="px-4 py-4 text-[#424245]">{row.duration}</td>
                      <td className="px-4 py-4 text-center text-[#86868B] line-through">
                        {row.basePrice}€
                      </td>
                      <td className="px-4 py-4 text-center font-semibold text-[#1D1D1F]">
                        {row.soloFinal}€
                      </td>
                      <td className="px-4 py-4 text-center font-bold" style={{ color: PRIMARY }}>
                        {row.coachedFinal}€
                      </td>
                      <td className="px-4 py-4 text-center">
                        {isFreeCell ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#0071E3] text-white px-3 py-1 text-xs font-bold">
                            GRATUIT
                          </span>
                        ) : (
                          <span className="font-semibold text-[#1D1D1F]">{row.trackedFinal}€</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="px-6 py-4 border-t border-[#D2D2D7] bg-[#FBFBFD]">
            <p className="text-xs text-[#6E6E73] leading-relaxed">
              <strong className="text-[#1D1D1F]">Comment ça marche :</strong> tu paies ton Peptides Engine, je te transmets ton crédit déduction par email avec ton rapport. Tu l'appliques sur ta commande coaching depuis{" "}
              <a href="https://www.achzodcoaching.com/formules-coaching" className="underline" style={{ color: PRIMARY }} target="_blank" rel="noopener noreferrer">
                achzodcoaching.com/formules-coaching
              </a>
              {" "}, valable uniquement sur les engagements 8 ou 12 semaines de Essential, Elite ou Private Lab.
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// ============================================================================
// HERO
// ============================================================================

function Hero() {
  return (
    <section id="peptides-hero" className="relative overflow-hidden px-6 pb-16 pt-2 md:pb-24 md:pt-32">
      {/* Ambient glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: "radial-gradient(ellipse 60% 50% at 50% 0%, rgba(0,113,227,0.08) 0%, transparent 70%)",
        }}
      />
      {/* Grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(0,113,227,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(0,113,227,0.8) 1px, transparent 1px)`,
          backgroundSize: "40px 40px",
        }}
      />

      <div className="relative mx-auto max-w-4xl text-center">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#D2D2D7] bg-[#F5F5F7] px-3 py-2 md:mb-8 md:px-4"
        >
          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: PRIMARY }} />
          <span className="font-mono text-[10px] uppercase tracking-widest text-[#6E6E73] md:text-xs">
            Protocole exclusif · 74 molecules disponibles
          </span>
        </motion.div>

        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-4xl font-bold leading-tight text-[#1D1D1F] md:text-6xl lg:text-7xl"
        >
          Ton protocole peptides.{" "}
          <span style={{ color: PRIMARY }}>Ta source secrete.</span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-[#6E6E73] md:mt-8 md:text-xl"
        >
          <span className="md:hidden">
            Réponds à 35 questions. Reçois ton protocole personnalisé : dosages exacts, reconstitution, calendrier hebdo et accès à la source, jusqu'à{" "}
            <span className="font-semibold text-[#1D1D1F]">60-90% moins chère.</span>
          </span>
          <span className="hidden md:inline">
            Reponds a 35 questions. Recois un protocole personnalise avec dosages exacts, guide de reconstitution calcule, calendrier hebdo, et acces direct a la source ou les peptides coutent{" "}
            <span className="font-semibold text-[#1D1D1F]">60-90% moins cher</span> que partout ailleurs.
          </span>
        </motion.p>

        {/* Pricing , 3 tiers d'entrée à partir de 199€ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-4 flex flex-col items-center gap-2 md:mt-10 md:gap-3"
        >
          <span className="font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-[#0071E3]">
            3 offres disponibles
          </span>
          <div className="flex items-end justify-center gap-3">
            <span className="text-lg font-medium text-[#6E6E73] md:text-2xl">à partir de</span>
            <span className="text-5xl font-bold text-[#1D1D1F] leading-none md:text-7xl">199€</span>
          </div>
          <span className="font-mono text-xs uppercase tracking-widest text-[#6E6E73]">
            TVA incluse · Paiement sécurisé · Aucun engagement
          </span>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-2 flex flex-col items-center gap-4 md:mt-8"
        >
          <div className="flex w-full max-w-2xl flex-col items-stretch justify-center gap-3 sm:flex-row">
            <a
              href="#offres"
              className="inline-flex items-center justify-center gap-2 rounded-full px-8 py-5 text-base font-semibold text-white shadow-lg transition-all hover:scale-[1.02] hover:shadow-xl"
              style={{ backgroundColor: PRIMARY }}
              onClick={(e) => {
                e.preventDefault();
                document.getElementById("offres")?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
            >
              Voir les 3 offres
              <ArrowRight className="h-5 w-5" />
            </a>
            <PeptidesWhatsAppLink
              placement="hero"
              label="Parler à Achzod sur WhatsApp"
              filled
              className="order-first border-0 px-8 py-5 text-base shadow-[0_12px_30px_rgba(18,140,126,0.26)] sm:order-last"
            />
          </div>

          <motion.p
            animate={{ opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
            className="max-w-md text-center font-mono text-[11px] font-bold tracking-wide md:text-xs"
            style={{ color: PRIMARY }}
          >
            Intégralement déduit de ton coaching Essential, Elite ou Private Lab 8 ou 12 sem
          </motion.p>

          <p className="text-xs font-medium text-[#128C7E]">
            Question avant de choisir ? Réponse personnelle sous 24h · Sans engagement
          </p>

          <div className="flex flex-wrap items-center justify-center gap-5 text-xs text-[#86868B]">
            <span className="flex items-center gap-1.5">
              <Clock className="h-3 w-3" />
              15 protocoles par mois maximum
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="h-3 w-3" style={{ color: PRIMARY }} />
              Livraison sous 24 à 48h
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="h-3 w-3" style={{ color: PRIMARY }} />
              Coaching déductible 8 sem
            </span>
          </div>
        </motion.div>

        {/* Trust indicators */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mt-10 flex flex-wrap items-center justify-center gap-4 md:mt-14 md:gap-6"
        >
          {[
            "Protocole rédigé manuellement",
            "Jusqu'à 2 bilans sanguins inclus",
            "Support écrit jusqu'à 90 jours",
            "Source directe -60 à -90%",
          ].map((t) => (
            <div key={t} className="flex items-center gap-2 text-xs text-[#86868B]">
              <CheckCircle2 className="h-3.5 w-3.5" style={{ color: PRIMARY }} />
              {t}
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

// ============================================================================
// PAGE
// ============================================================================

export default function PeptidesEngineOffer() {
  return (
    <div className="min-h-screen bg-white text-[#1D1D1F]">
      <Header />
      <FlashBanner />

      <main>
        <Hero />
        <PricingTiers />
        <CoachingDeduction />
        <PriceComparison />
        <DeliverablesSection />
        <AnimatedFeaturesSection />
        <COASection />
        <HowItWorks />
        <ObjectivesSection />
        <CredibilityBar />
        <ScarcityGuarantee />
        <ReviewsSection />
        <TrustSection />
        <FAQSection />
        <FinalCTA />
      </main>

      <StickyWhatsAppCTA />

      <Footer />
    </div>
  );
}
