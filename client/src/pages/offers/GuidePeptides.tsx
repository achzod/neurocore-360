/**
 * Guide Peptides (ebook PDF, 99 €) : page de vente.
 * Paiement : POST /api/guide-peptides/checkout (Stripe Checkout, sans compte).
 * Livraison : lien de téléchargement privé par email (server/guidePeptides).
 * Design clair AchZod : crème, noir #15130e, jaune #FCDD00, Anton + Poppins.
 */

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "wouter";
import { ArrowRight, BookOpen, Check, ChevronDown, FileText, FlaskConical, Layers, Loader2, Lock, MailCheck, Microscope, Scale, ShieldCheck } from "lucide-react";

export const GP = {
  cream: "#fffdf7",
  sand: "#f7f4ec",
  line: "#e7e1d2",
  ink: "#15130e",
  muted: "#5f5a4e",
  yellow: "#FCDD00",
} as const;

export const ANTON = "'GP Anton', Impact, 'Arial Narrow', sans-serif";
export const POPPINS = "'GP Poppins', 'Helvetica Neue', Arial, sans-serif";

/** Polices servies par le site (client/public/fonts/guide-peptides), sans appel externe. */
export function GuidePeptidesFonts() {
  return (
    <style>{`
@font-face{font-family:'GP Anton';src:url('/fonts/guide-peptides/Anton-Regular.ttf') format('truetype');font-weight:400;font-display:swap}
@font-face{font-family:'GP Poppins';src:url('/fonts/guide-peptides/Poppins-Regular.ttf') format('truetype');font-weight:400;font-display:swap}
@font-face{font-family:'GP Poppins';src:url('/fonts/guide-peptides/Poppins-SemiBold.ttf') format('truetype');font-weight:600 800;font-display:swap}
.gp-anton{font-family:${ANTON};font-weight:400;letter-spacing:0.005em;text-transform:uppercase}
.gp-root p a,.gp-root label a{padding:0;min-height:0;min-width:0}
.gp-root input[type=checkbox]{padding:0;min-height:0;min-width:0;width:18px;height:18px}
.gp-hl{background:linear-gradient(transparent 58%, ${GP.yellow} 58%, ${GP.yellow} 92%, transparent 92%);padding:0 2px}
`}</style>
  );
}

const PRICE = "99\u00a0€";
const CTA_LABEL = `Je veux le guide · ${PRICE}`;

const INSIDE = [
  { icon: Microscope, title: "Les mécanismes", text: "Comment chaque molécule agit, sur quel récepteur, sur quel axe. Expliqué clairement, sans jargon inutile." },
  { icon: Scale, title: "La science face au marketing", text: "Ce que les études montrent vraiment, ce qui reste à prouver, et ce qui relève de la pure promesse commerciale." },
  { icon: ShieldCheck, title: "Juger une source", text: "Les critères concrets pour repérer un vendeur sérieux, lire une analyse et éviter les fioles qui ne contiennent pas ce qui est écrit dessus." },
  { icon: FlaskConical, title: "La masterclass de reconstitution", text: "Le matériel, l'hygiène, les gestes, la conservation : tout ce qu'on ne t'explique jamais quand on te vend une fiole." },
  { icon: Layers, title: "La logique du stacking et du timing", text: "Pourquoi certaines associations ont du sens et d'autres non, et comment raisonner le moment de chaque prise." },
  { icon: BookOpen, title: "83 molécules décryptées", text: "Une pharmacopée complète, classée par axe : GH, réparation, métabolisme, longévité, peau, cognition, hormones et plus." },
];

const CHAPTERS = [
  "Introduction",
  "C'est quoi un peptide",
  "Le marché des peptides en 2026",
  "Repérer une source fiable",
  "La masterclass de reconstitution",
  "La pharmacopée complète",
  "Axe GH/IGF-1 et myogenèse",
  "Réparation tissulaire et inflammation",
  "Métabolisme, GLP-1 et perte de gras",
  "Longévité, mitochondries et biorégulateurs",
  "Peau, cheveux et pigmentation",
  "Cognition, humeur et sommeil",
  "Autres axes : hormones sexuelles, immunité et santé",
  "Les blends",
  "Consommables et composés d'appoint",
  "L'art du stacking et du timing",
  "Conclusion",
  "Références",
];

const FAQ = [
  {
    q: "Sous quel format est le guide ?",
    a: "Un PDF de 199 pages, lisible sur téléphone, tablette et ordinateur. Tu peux l'enregistrer et le relire hors connexion.",
  },
  {
    q: "Quand est-ce que je le reçois ?",
    a: "Tout de suite. Dès que ton paiement est validé, tu peux le télécharger sur la page de confirmation, et le lien part aussi par email. Pas de compte à créer.",
  },
  {
    q: "Le lien de téléchargement expire-t-il ?",
    a: "Il est valable 30 jours et tu peux t'en servir autant de fois que tu veux. Passé ce délai, tu redemandes un lien neuf sur cette page avec ton email d'achat, il arrive en quelques secondes.",
  },
  {
    q: "Est-ce que je trouve des dosages ou des protocoles dedans ?",
    a: "Non, et c'est volontaire. Un protocole dépend de ton profil, de ton historique, de tes objectifs et de ton suivi. Le donner à tout le monde serait irresponsable. Pour ça, il y a Peptides Engine.",
  },
  {
    q: "Comment fonctionne le code BOOKPEPTIDES99 ?",
    a: "Il est dans ton email de livraison. Il te donne 99 € de réduction sur Peptides Engine, quelle que soit la formule, ou sur un coaching AchZod. Si tu passes à l'étape suivante, le guide ne t'aura rien coûté.",
  },
  {
    q: "Comment j'obtiens l'accès à tes sources ?",
    a: "Tu m'écris à achzodyt@gmail.com en indiquant ton numéro de commande (il est dans ton email de livraison). Je te réponds avec l'accès.",
  },
  {
    q: "Je peux être remboursé ?",
    a: "Le guide est un contenu numérique livré immédiatement. En commandant, tu demandes cette livraison immédiate et tu renonces à ton droit de rétractation : aucun remboursement après livraison du guide (article L221-28 du Code de la consommation, CGV article 7).",
  },
  {
    q: "Est-ce un avis médical ?",
    a: "Non. C'est un contenu éducatif, réservé à la recherche. Il t'aide à comprendre et à poser les bonnes questions, il ne remplace pas un médecin. Beaucoup de ces molécules ne sont pas autorisées pour un usage humain dans de nombreux pays.",
  },
];

function CTAButton({ children, href = "#commander", testId, full = false }: { children: ReactNode; href?: string; testId?: string; full?: boolean }) {
  return (
    <a
      href={href}
      data-testid={testId}
      className={`group inline-flex items-center justify-center gap-2 rounded-md px-7 py-4 text-base font-semibold transition-transform active:scale-[0.98] ${full ? "w-full" : ""}`}
      style={{ backgroundColor: GP.yellow, color: GP.ink, boxShadow: `0 0 0 2px ${GP.ink}, 4px 4px 0 2px ${GP.ink}` }}
    >
      {children}
      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
    </a>
  );
}

function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <span className="inline-block px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ backgroundColor: GP.yellow, color: GP.ink }}>
      {children}
    </span>
  );
}

function FAQItem({ q, a, id }: { q: string; a: string; id: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b" style={{ borderColor: GP.line }}>
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} aria-controls={id} className="flex w-full items-start justify-between gap-6 px-0 py-5 text-left">
        <h3 className="text-base font-semibold sm:text-lg" style={{ color: GP.ink }}>{q}</h3>
        <ChevronDown className={`mt-1 h-5 w-5 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} style={{ color: GP.ink }} />
      </button>
      {open && (
        <p id={id} className="pb-6 text-[15px] leading-relaxed sm:text-base" style={{ color: GP.muted }}>
          {a}
        </p>
      )}
    </div>
  );
}

/** Logo AchZod (même tracé que AchzodLogo.tsx), en noir sur fond clair. */
export function AchzodWordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`} style={{ color: GP.ink }}>
      <svg viewBox="0 0 38.047 30.012" className="h-7 w-7" fill="currentColor" aria-hidden>
        <path d="M128.282,57.01v6.646H108.06V59.6l4.9-19.315H119.9l-4.243,16.72Z" transform="translate(-90.235 -33.644)" />
        <path d="M19.506,0V4.048L14.6,23.366H7.667L11.91,6.646H0V0Z" />
      </svg>
      <span className="text-xl font-semibold tracking-tight">ACHZOD</span>
    </span>
  );
}

export function GuideTopBar({ showCta = true }: { showCta?: boolean }) {
  return (
    <header className="sticky top-0 z-40 border-b backdrop-blur" style={{ backgroundColor: "rgba(255,253,247,0.92)", borderColor: GP.line }}>
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3 sm:px-6">
        <Link href="/offers/guide-peptides" aria-label="AchZod, Guide Peptides">
          <AchzodWordmark />
        </Link>
        {showCta && (
          <a href="#commander" className="rounded-md px-4 py-2 text-sm font-semibold" style={{ backgroundColor: GP.ink, color: GP.yellow }}>
            Le guide · {PRICE}
          </a>
        )}
      </div>
    </header>
  );
}

export function GuideFooter() {
  return (
    <footer className="border-t px-5 py-10 sm:px-6" style={{ borderColor: GP.line, backgroundColor: GP.sand }}>
      <div className="mx-auto flex max-w-6xl flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <AchzodWordmark />
          <p className="mt-3 max-w-md text-xs leading-relaxed" style={{ color: GP.muted }}>
            Contenu éducatif, réservé à la recherche. Ce guide ne constitue pas un avis médical et ne remplace pas un professionnel de santé.
          </p>
        </div>
        <nav className="flex flex-wrap gap-x-5 gap-y-2 text-sm" style={{ color: GP.muted }}>
          <Link href="/cgv" className="underline-offset-4 hover:underline">CGV</Link>
          <Link href="/mentions-legales" className="underline-offset-4 hover:underline">Mentions légales</Link>
          <Link href="/politique-confidentialite" className="underline-offset-4 hover:underline">Confidentialité</Link>
          <Link href="/offers/peptides-engine" className="underline-offset-4 hover:underline">Peptides Engine</Link>
        </nav>
      </div>
    </footer>
  );
}

export default function GuidePeptides() {
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendEmail, setResendEmail] = useState("");
  const [resendState, setResendState] = useState<"idle" | "loading" | "done">("idle");
  const [showSticky, setShowSticky] = useState(false);
  const heroRef = useRef<HTMLElement>(null);
  const orderRef = useRef<HTMLElement>(null);
  const cancelled = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("cancelled") === "true";

  useEffect(() => {
    const onScroll = () => {
      const hero = heroRef.current?.getBoundingClientRect();
      const order = orderRef.current?.getBoundingClientRect();
      const pastHero = hero ? hero.bottom < 0 : false;
      const orderVisible = order ? order.top < window.innerHeight && order.bottom > 0 : false;
      setShowSticky(pastHero && !orderVisible);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const startCheckout = async () => {
    setError(null);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) {
      setError("Indique ton email : c'est là que tu recevras ton guide.");
      document.getElementById("gp-email")?.focus();
      return;
    }
    if (!consent) {
      setError("Coche la case pour recevoir ton guide tout de suite après le paiement.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/guide-peptides/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), consent: true }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) throw new Error(data.message || "Le paiement n'a pas pu démarrer.");
      window.location.href = data.url;
    } catch (e: any) {
      setError(e?.message || "Le paiement n'a pas pu démarrer. Réessaie dans un instant.");
      setLoading(false);
    }
  };

  const requestLink = async () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(resendEmail.trim())) return;
    setResendState("loading");
    await fetch("/api/guide-peptides/access-link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: resendEmail.trim() }),
    }).catch(() => null);
    setResendState("done");
  };

  return (
    <div className="gp-root min-h-screen overflow-x-hidden" style={{ backgroundColor: GP.cream, color: GP.ink, fontFamily: POPPINS }}>
      <GuidePeptidesFonts />
      <GuideTopBar />

      {/* HERO */}
      <section ref={heroRef} className="px-5 pb-16 pt-10 sm:px-6 sm:pt-16 lg:pb-24">
        <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-14">
          <div>
            <Eyebrow>Ebook PDF · 199 pages · Édition 2026</Eyebrow>
            <h1 className="gp-anton mt-6 text-[64px] leading-[0.92] sm:text-[96px] lg:text-[112px]" data-testid="gp-title">
              Peptides
            </h1>
            <p className="gp-anton mt-2 text-[28px] leading-tight sm:text-[40px]">Le guide de référence</p>
            <p className="mt-6 max-w-xl text-[17px] leading-relaxed sm:text-lg" style={{ color: GP.muted }}>
              83 molécules décryptées, de la science à la pratique. Ce qu'on sait vraiment, ce qu'on te vend, et comment faire la différence. <span className="font-semibold" style={{ color: GP.ink }}>Sans promesse miracle.</span>
            </p>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
              <CTAButton testId="gp-hero-cta">{CTA_LABEL}</CTAButton>
              <a href="#sommaire" className="self-start text-sm font-semibold underline underline-offset-4 sm:self-auto" style={{ color: GP.ink }}>
                Voir le sommaire
              </a>
            </div>
            <ul className="mt-8 grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2" style={{ color: GP.ink }}>
              {[
                { icon: MailCheck, text: "Téléchargement immédiat, par email" },
                { icon: Lock, text: "Paiement unique et sécurisé, sans compte" },
                { icon: FileText, text: "PDF lisible sur téléphone et ordinateur" },
                { icon: Check, text: "99 € offerts sur la suite avec ton code" },
              ].map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-2.5">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: GP.yellow }}>
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  {text}
                </li>
              ))}
            </ul>
          </div>
          <div className="relative mx-auto w-full max-w-[420px]">
            <div className="absolute -right-4 -top-4 h-full w-full rounded-sm" style={{ backgroundColor: GP.yellow }} aria-hidden />
            <img
              src="/images/guide-peptides/guide-peptides-couverture.webp"
              alt="Couverture du guide Peptides par AchZod"
              width={868}
              height={1166}
              className="relative w-full"
              loading="eager"
            />
          </div>
        </div>
      </section>

      {/* ACCROCHE */}
      <section className="border-y px-5 py-16 sm:px-6 sm:py-24" style={{ backgroundColor: GP.sand, borderColor: GP.line }}>
        <div className="mx-auto max-w-3xl">
          <p className="gp-anton text-[34px] leading-[1.05] sm:text-5xl">
            « On m'a vendu des peptides comme on vend un rêve : <span className="gp-hl">une fiole, une promesse, zéro explication.</span> »
          </p>
          <div className="mt-8 space-y-5 text-[17px] leading-relaxed" style={{ color: GP.ink }}>
            <p>Les peptides sont partout. Sur Instagram, dans les vestiaires, dans les messages privés. Chacun a son avis, son vendeur, son « stack qui change tout ».</p>
            <p>Et derrière ce bruit, il y a énormément de désinformation. Des molécules présentées comme miraculeuses sur la foi d'une étude chez le rat. Des fioles achetées sans savoir ce qu'elles contiennent vraiment. Des gens qui reconstituent n'importe comment, parce que personne ne leur a jamais expliqué.</p>
            <p>J'ai voulu comprendre. Alors j'ai fait ce que je fais pour tout le reste : j'ai lu les études, j'ai remonté les sources, j'ai comparé ce qu'on promet à ce qu'on sait réellement.</p>
            <p className="font-semibold">Ce guide, c'est tout ce travail, mis en ordre. Le livre que j'aurais aimé avoir le jour où on m'a tendu ma première fiole.</p>
          </div>
        </div>
      </section>

      {/* QUI JE SUIS */}
      <section className="px-5 py-16 sm:px-6 sm:py-24">
        <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <div className="grid grid-cols-5 gap-3">
            <img src="/images/guide-peptides/ach-pose-double-biceps.jpg" alt="Ach ajuste la pose double biceps d'un élève" width={1100} height={1100} loading="lazy" className="col-span-3 h-[300px] w-full rounded-sm object-cover sm:h-[460px]" />
            <img src="/images/guide-peptides/ach-correction-curl.jpg" alt="Ach corrige le curl d'un élève à la salle" width={900} height={1350} loading="lazy" className="col-span-2 h-[300px] w-full rounded-sm object-cover sm:h-[460px]" />
          </div>
          <div>
            <Eyebrow>Qui je suis</Eyebrow>
            <h2 className="gp-anton mt-5 text-[40px] leading-[1.02] sm:text-6xl">Ach, coach. Pas vendeur de fioles.</h2>
            <div className="mt-6 space-y-5 text-[17px] leading-relaxed" style={{ color: GP.muted }}>
              <p>Je suis coach, avec <span className="font-semibold" style={{ color: GP.ink }}>12 certifications internationales</span>. Mon métier, c'est d'accompagner des gens sur le terrain, à la salle, semaine après semaine.</p>
              <p>Depuis des années, je lis des études, je décortique des mécanismes et je teste avant de parler. Les peptides ne font pas exception : j'ai voulu séparer ce qui tient debout de ce qui relève du marketing.</p>
              <p>Ce guide, je l'ai écrit comme j'explique les choses à mes élèves. Directement, sans enrober, et avec les références pour vérifier.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CONTENU */}
      <section className="border-t px-5 py-16 sm:px-6 sm:py-24" style={{ borderColor: GP.line }}>
        <div className="mx-auto max-w-6xl">
          <div className="max-w-3xl">
            <Eyebrow>Ce qu'il y a dedans</Eyebrow>
            <h2 className="gp-anton mt-5 text-[40px] leading-[1.02] sm:text-6xl">Tout comprendre avant de toucher à quoi que ce soit.</h2>
          </div>
          <div className="mt-10 grid grid-cols-3 gap-3 sm:max-w-2xl">
            {[
              { n: "199", l: "pages" },
              { n: "83", l: "molécules décryptées" },
              { n: "18", l: "chapitres" },
            ].map((s) => (
              <div key={s.l} className="rounded-sm border-2 p-4 sm:p-5" style={{ borderColor: GP.ink, backgroundColor: "#fff" }}>
                <div className="gp-anton text-4xl sm:text-6xl">{s.n}</div>
                <div className="mt-1 text-xs font-semibold uppercase tracking-wider sm:text-sm" style={{ color: GP.muted }}>{s.l}</div>
              </div>
            ))}
          </div>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {INSIDE.map(({ icon: Icon, title, text }) => (
              <div key={title} className="rounded-sm border p-6" style={{ borderColor: GP.line, backgroundColor: "#fff" }}>
                <span className="flex h-10 w-10 items-center justify-center rounded-sm" style={{ backgroundColor: GP.yellow }}>
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 text-lg font-semibold">{title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed" style={{ color: GP.muted }}>{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SOMMAIRE */}
      <section id="sommaire" className="scroll-mt-20 border-y px-5 py-16 sm:px-6 sm:py-24" style={{ backgroundColor: GP.sand, borderColor: GP.line }}>
        <div className="mx-auto grid max-w-6xl items-start gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          <div>
            <Eyebrow>Le sommaire</Eyebrow>
            <h2 className="gp-anton mt-5 text-[40px] leading-[1.02] sm:text-6xl">18 chapitres, dans l'ordre où il faut les lire.</h2>
            <img src="/images/guide-peptides/guide-peptides-sommaire.webp" alt="Page du sommaire du guide Peptides" width={760} height={1075} loading="lazy" className="mt-8 hidden w-full max-w-sm rounded-sm border shadow-lg lg:block" style={{ borderColor: GP.line }} />
          </div>
          <ol className="divide-y rounded-sm border bg-white" style={{ borderColor: GP.line }}>
            {CHAPTERS.map((c, i) => (
              <li key={c} className="flex items-baseline gap-4 px-5 py-3.5" style={{ borderColor: GP.line }}>
                <span className="gp-anton w-8 shrink-0 text-lg" style={{ color: "#b9a400" }}>{String(i + 1).padStart(2, "0")}</span>
                <span className="text-[15px] font-semibold sm:text-base">{c}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* BONUS */}
      <section className="px-5 py-16 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-3xl">
            <Eyebrow>Inclus avec le guide</Eyebrow>
            <h2 className="gp-anton mt-5 text-[40px] leading-[1.02] sm:text-6xl">Deux bonus. Et un guide qui se paie tout seul.</h2>
          </div>
          <div className="mt-10 grid gap-5 lg:grid-cols-2">
            <div className="rounded-sm border-2 p-7" style={{ borderColor: GP.ink, backgroundColor: "#fff" }}>
              <div className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: GP.muted }}>Bonus 1</div>
              <h3 className="gp-anton mt-3 text-3xl">L'accès privé à mes sources</h3>
              <p className="mt-3 text-[16px] leading-relaxed" style={{ color: GP.muted }}>
                Les sources directes que j'utilise, réservées aux lecteurs du guide. Après ton achat, tu m'écris à <span className="font-semibold" style={{ color: GP.ink }}>achzodyt@gmail.com</span> avec ton numéro de commande, et je te réponds avec l'accès.
              </p>
            </div>
            <div className="rounded-sm border-2 p-7" style={{ borderColor: GP.ink, backgroundColor: GP.yellow }}>
              <div className="text-xs font-semibold uppercase tracking-[0.18em]">Bonus 2</div>
              <h3 className="gp-anton mt-3 text-3xl">99 € offerts sur la suite</h3>
              <p className="mt-3 text-[16px] leading-relaxed">
                Ton code <span className="rounded-sm px-1.5 py-0.5 font-semibold tracking-wider" style={{ backgroundColor: GP.ink, color: GP.yellow }}>BOOKPEPTIDES99</span> te donne 99 € de réduction sur Peptides Engine ou sur un coaching AchZod. Si tu vas plus loin avec moi, le guide ne t'aura rien coûté.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* HONNÊTETÉ */}
      <section className="px-5 pb-16 sm:px-6 sm:pb-24">
        <div className="mx-auto max-w-4xl rounded-sm border-l-[6px] p-7 sm:p-10" style={{ borderColor: GP.yellow, backgroundColor: GP.sand }}>
          <h2 className="gp-anton text-[32px] leading-[1.05] sm:text-5xl">Ce que tu ne trouveras pas dans ce guide</h2>
          <div className="mt-6 space-y-4 text-[17px] leading-relaxed">
            <p><span className="font-semibold">Aucun protocole. C'est volontaire.</span> Pas de dosages, pas de « cure type » à copier-coller. Un protocole sérieux dépend de ton âge, de ton historique, de tes objectifs, de tes analyses et de ton suivi. Le même pour tout le monde, ça n'existe pas.</p>
            <p>Le guide te donne les clés pour comprendre, poser les bonnes questions et ne plus te faire vendre du rêve. Si tu veux ensuite un protocole construit au cas par cas, c'est le rôle de <Link href="/offers/peptides-engine" className="font-semibold underline underline-offset-4">Peptides Engine</Link>, et ton code BOOKPEPTIDES99 y vaut 99 €.</p>
          </div>
        </div>
      </section>

      {/* COMMANDE */}
      <section id="commander" ref={orderRef} className="scroll-mt-20 border-t px-5 py-16 sm:px-6 sm:py-24" style={{ borderColor: GP.line, backgroundColor: GP.sand }}>
        <div className="mx-auto grid max-w-5xl items-center gap-10 lg:grid-cols-[0.8fr_1.2fr]">
          <img src="/images/guide-peptides/guide-peptides-couverture.webp" alt="Couverture du guide Peptides" width={868} height={1166} loading="lazy" className="mx-auto w-full max-w-[300px]" />
          <div className="rounded-sm border-2 p-6 sm:p-8" style={{ borderColor: GP.ink, backgroundColor: "#fff" }}>
            <div className="flex items-baseline justify-between gap-4">
              <h2 className="gp-anton text-3xl sm:text-4xl">Peptides, le guide de référence</h2>
            </div>
            <div className="mt-3 flex items-baseline gap-3">
              <span className="gp-anton text-6xl">{PRICE}</span>
              <span className="text-sm" style={{ color: GP.muted }}>TTC, paiement unique</span>
            </div>
            <ul className="mt-6 space-y-2.5 text-[15px]">
              {[
                "L'ebook PDF de 199 pages, 83 molécules décryptées",
                "Le téléchargement immédiat, et le lien par email",
                "Bonus : l'accès privé à mes sources",
                "Bonus : le code BOOKPEPTIDES99, 99\u00a0€ sur Peptides Engine ou un coaching",
              ].map((f) => (
                <li key={f} className="flex items-start gap-2.5">
                  <Check className="mt-0.5 h-4 w-4 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <label htmlFor="gp-email" className="mt-7 block text-sm font-semibold">Ton email (pour recevoir le guide)</label>
            <input
              id="gp-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="toi@exemple.com"
              className="mt-2 w-full rounded-md border-2 px-4 py-3 text-base outline-none focus:ring-2"
              style={{ borderColor: GP.ink, backgroundColor: GP.cream }}
              data-testid="gp-email"
            />
            <label className="mt-4 flex cursor-pointer items-start gap-3 text-[13px] leading-relaxed" style={{ color: GP.muted }}>
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1 h-4 w-4 shrink-0 accent-black" data-testid="gp-consent" />
              <span>
                Je veux recevoir le guide immédiatement après le paiement et je renonce à mon droit de rétractation pour ce contenu numérique (article L221-28 du Code de la consommation). J'accepte les <Link href="/cgv" className="underline">CGV</Link>.
              </span>
            </label>
            {cancelled && !error && (
              <p className="mt-4 rounded-md px-3 py-2 text-sm" style={{ backgroundColor: GP.sand }}>Paiement annulé, rien n'a été débité. Tu peux reprendre quand tu veux.</p>
            )}
            {error && <p className="mt-4 rounded-md border px-3 py-2 text-sm font-semibold" style={{ borderColor: "#c0392b", color: "#a93226", backgroundColor: "#fdf0ee" }}>{error}</p>}
            <button
              type="button"
              onClick={startCheckout}
              disabled={loading}
              data-testid="gp-checkout"
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-md px-7 py-4 text-base font-semibold transition-transform active:scale-[0.98] disabled:opacity-70"
              style={{ backgroundColor: GP.yellow, color: GP.ink, boxShadow: `0 0 0 2px ${GP.ink}, 4px 4px 0 2px ${GP.ink}` }}
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
              {loading ? "Redirection vers le paiement" : CTA_LABEL}
            </button>
            <p className="mt-4 flex items-center justify-center gap-2 text-xs" style={{ color: GP.muted }}>
              <Lock className="h-3.5 w-3.5" /> Paiement sécurisé par Stripe. Aucun compte à créer.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="px-5 py-16 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-3xl">
          <Eyebrow>Questions fréquentes</Eyebrow>
          <h2 className="gp-anton mt-5 text-[40px] leading-[1.02] sm:text-6xl">Avant de commander</h2>
          <div className="mt-8 border-t" style={{ borderColor: GP.line }}>
            {FAQ.map((f, i) => (
              <FAQItem key={f.q} q={f.q} a={f.a} id={`gp-faq-${i}`} />
            ))}
          </div>

          <div id="lien" className="mt-12 scroll-mt-24 rounded-sm border p-6" style={{ borderColor: GP.line, backgroundColor: GP.sand }}>
            <h3 className="text-lg font-semibold">Déjà acheté ? Reçois un nouveau lien</h3>
            <p className="mt-1 text-sm" style={{ color: GP.muted }}>Lien expiré ou email introuvable : indique ton email d'achat, un lien neuf part tout de suite.</p>
            {resendState === "done" ? (
              <p className="mt-4 text-sm font-semibold">Si un achat existe pour cette adresse, ton nouveau lien vient de partir. Pense à regarder dans tes spams.</p>
            ) : (
              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <input
                  type="email"
                  autoComplete="email"
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value)}
                  placeholder="Ton email d'achat"
                  className="w-full rounded-md border-2 px-4 py-3 text-base outline-none"
                  style={{ borderColor: GP.ink, backgroundColor: "#fff" }}
                />
                <button type="button" onClick={requestLink} disabled={resendState === "loading"} className="shrink-0 rounded-md px-5 py-3 text-sm font-semibold" style={{ backgroundColor: GP.ink, color: GP.yellow }}>
                  {resendState === "loading" ? "Envoi" : "Recevoir mon lien"}
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* DERNIER APPEL */}
      <section className="border-t px-5 py-16 text-center sm:px-6" style={{ borderColor: GP.line, backgroundColor: GP.yellow }}>
        <div className="mx-auto max-w-2xl">
          <h2 className="gp-anton text-[38px] leading-[1.02] sm:text-6xl">Arrête d'acheter des promesses. Commence par comprendre.</h2>
          <div className="mt-8">
            <a
              href="#commander"
              className="inline-flex items-center justify-center gap-2 rounded-md px-7 py-4 text-base font-semibold"
              style={{ backgroundColor: GP.ink, color: GP.yellow }}
              data-testid="gp-final-cta"
            >
              {CTA_LABEL}
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </section>

      {/* NOTE LÉGALE */}
      <section className="px-5 py-10 sm:px-6">
        <p className="mx-auto max-w-3xl text-center text-xs leading-relaxed" style={{ color: GP.muted }}>
          Note légale : ce guide est un contenu éducatif et informatif, réservé à la recherche. Il ne constitue ni un avis médical, ni une prescription, ni une incitation à l'usage d'une substance. Beaucoup des molécules décrites ne sont pas autorisées pour un usage humain dans de nombreux pays : renseigne-toi sur la législation qui s'applique à toi et consulte un professionnel de santé avant toute décision. Licence personnelle, non cessible.
        </p>
      </section>

      <GuideFooter />

      {/* CTA mobile collant */}
      <div
        className={`fixed inset-x-0 bottom-0 z-40 border-t p-3 transition-transform duration-300 sm:hidden ${showSticky ? "translate-y-0" : "translate-y-full"}`}
        style={{ backgroundColor: GP.cream, borderColor: GP.line }}
        aria-hidden={!showSticky}
      >
        <CTAButton full testId="gp-sticky-cta">{CTA_LABEL}</CTAButton>
      </div>
    </div>
  );
}
