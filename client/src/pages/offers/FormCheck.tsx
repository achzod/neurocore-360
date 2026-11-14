/**
 * APEXLABS - FormCheck V2 : page de vente.
 * Paiement Stripe (inchangé : POST /api/formcheck/checkout), upload, rapport PDF annoté par email.
 * Animations : framer-motion uniquement, prefers-reduced-motion respecté partout.
 */

import { useRef, useState, type ReactNode } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence, useInView, useReducedMotion } from "framer-motion";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import {
  ArrowRight,
  Activity,
  CalendarCheck,
  Check,
  ChevronDown,
  Gauge,
  Loader2,
  Lock,
  MailCheck,
  ScanEye,
  ShieldCheck,
  Timer,
  Trash2,
  Wrench,
  Zap,
} from "lucide-react";
import { ACCENT, CountUp, Reveal } from "@/components/formcheck/motion";
import { BiomechanicsFigure } from "@/components/formcheck/BiomechanicsFigure";
import { StepsDemo } from "@/components/formcheck/StepsDemo";
import { ReportPreview } from "@/components/formcheck/ReportPreview";
import { FilmingIllustration } from "@/components/formcheck/FilmingIllustration";

type PackId = "1" | "3" | "6";

const PACKS: Array<{
  id: PackId;
  name: string;
  price: string;
  unit: string;
  tagline: string;
  features: string[];
  popular?: boolean;
}> = [
  {
    id: "1",
    name: "1 analyse",
    price: "9,90 €",
    unit: "9,90 € l'analyse",
    tagline: "Pour vérifier un mouvement précis.",
    features: ["1 vidéo analysée", "Rapport PDF complet avec images annotées", "Corrections, exercices correctifs et plan sur 4 semaines"],
  },
  {
    id: "3",
    name: "3 analyses",
    price: "24,90 €",
    unit: "8,30 € l'analyse",
    tagline: "Pour tes 3 mouvements de base, ou pour suivre ta progression.",
    features: ["3 vidéos analysées", "Un rapport PDF complet à chaque vidéo", "Compare avant et après tes corrections"],
    popular: true,
  },
  {
    id: "6",
    name: "6 analyses",
    price: "44,90 €",
    unit: "7,48 € l'analyse",
    tagline: "Idéal pour les athlètes sérieux qui filment leurs séries chaque semaine.",
    features: ["6 vidéos analysées", "Un rapport PDF complet à chaque vidéo", "Suivi technique sur tout un cycle"],
  },
];

const HERO_TRUST = [
  { icon: Zap, text: "Exercice reconnu automatiquement" },
  { icon: MailCheck, text: "Sans compte : un lien personnel par email" },
  { icon: Trash2, text: "Vidéo supprimée après l'analyse" },
  { icon: Lock, text: "Paiement unique, sans abonnement" },
];

const FACTS = [
  { value: 100, prefix: "", label: "Ton score technique sur 100" },
  { value: 4, prefix: "", label: "Sous-scores : mise en place, exécution, stabilité, contrôle" },
  { value: 6, prefix: "Jusqu'à ", label: "Erreurs détaillées sur tes images annotées" },
  { value: 4, prefix: "", label: "Semaines de plan de correction" },
];

const CRITERIA = [
  "Tempo",
  "Rythme entre les reps",
  "Amplitude",
  "Symétrie",
  "Compensations",
  "Intensité et proximité de l'échec",
  "Trajectoire de la charge",
  "Gainage et position du dos",
  "Respiration",
  "Tête et regard",
  "Pieds et appuis",
];

const REPORT_BLOCKS = [
  { icon: Gauge, title: "Score sur 100 et 4 sous-scores", text: "Mise en place, exécution, stabilité, contrôle : tu sais exactement où tu en es." },
  { icon: Activity, title: "Les phases du mouvement", text: "Mise en place, départ, milieu, verrouillage, descente : chaque phase passée au crible." },
  { icon: Timer, title: "Le tempo rep par rep", text: "Descente, montée et pause pour chaque répétition, avec le nombre de reps de ta série." },
  { icon: ScanEye, title: "Jusqu'à 6 erreurs sur tes images", text: "Chaque erreur est montrée sur l'image de ta vidéo où elle se voit le mieux, avec le pourquoi." },
  { icon: Wrench, title: "Corrections et exercices correctifs", text: "Des consignes simples à te répéter pendant la série, et les exercices pour corriger." },
  { icon: CalendarCheck, title: "Un plan sur 4 semaines", text: "Semaine par semaine : le focus, les actions et la charge conseillée." },
];

const REPORT_EXTRAS = [
  "Tes 3 corrections prioritaires",
  "Tes points forts",
  "Amplitude et trajectoire de la charge",
  "Symétrie quand l'angle de vue le permet",
  "Gainage, compensations, tête et pieds",
  "Ta proximité de l'échec",
  "Tes consignes pour la prochaine séance",
  "Comment filmer ta prochaine vidéo",
];

const REPORT_PAGES = [
  { src: "/images/formcheck/rapport-page-score.webp", title: "Score et tableau de bord", alt: "Page 1 d'un rapport FormCheck : exercice reconnu, score sur 100 et sous-scores" },
  { src: "/images/formcheck/rapport-page-erreur.webp", title: "Erreur détaillée et correction", alt: "Page d'erreur d'un rapport FormCheck : image annotée, explication, correction et exercices correctifs" },
  { src: "/images/formcheck/rapport-page-plan.webp", title: "Plan de correction sur 4 semaines", alt: "Page du plan de correction sur 4 semaines d'un rapport FormCheck" },
];

const FILMING_TIPS = [
  "Une seule série, 60 secondes maximum, en .mp4 ou .mov (200 Mo maximum).",
  "Téléphone posé et stable, à hauteur de hanche, à 3 ou 4 mètres.",
  "De profil pour le squat, le soulevé de terre, le hip thrust et le développé couché. De face en complément si tu veux juger la symétrie.",
  "Corps entier et charge visibles de la première à la dernière répétition, avec une bonne lumière.",
];

const FAQ = [
  {
    q: "Comment se passe l'analyse ?",
    a: "Après ton paiement, tu reçois un lien personnel par email. Tu envoies la vidéo de ta série, sans rien avoir à préciser : l'exercice est reconnu automatiquement. Des images sont extraites sur toute la série, puis ta technique est analysée de façon automatique selon la méthode et la grille d'analyse d'Achzod. Ton rapport PDF arrive par email, en général en quelques minutes.",
  },
  {
    q: "Qui a conçu la méthode ?",
    a: "Achzod, coach expert en biomécanique, certifié NASM (CPT, CNC, CSNC). La grille d'analyse, les critères, les corrections et les exercices correctifs de FormCheck suivent sa méthode.",
  },
  {
    q: "Faut-il créer un compte ?",
    a: "Non. Pas de compte, pas de mot de passe : après ton paiement, tu reçois par email un lien personnel pour envoyer tes vidéos. Tes rapports arrivent aussi par email.",
  },
  {
    q: "Quand un crédit est-il utilisé ?",
    a: "Uniquement quand ton rapport est livré. Si ta vidéo est inexploitable (corps coupé, trop sombre) ou si aucun exercice de musculation n'y est reconnu, tu reçois un message clair pour la refilmer et ton crédit reste intact.",
  },
  {
    q: "Quels exercices sont pris en charge ?",
    a: "Les exercices de musculation : squat, front squat, soulevé de terre et ses variantes (roumain, sumo, sur blocs), développé couché, développé militaire, rowing, traction, hip thrust, fentes, squat bulgare, presse, pompes, dips et bien d'autres. Tu n'as pas à choisir l'exercice : il est reconnu automatiquement sur ta vidéo et indiqué en tête de ton rapport.",
  },
  {
    q: "Mes crédits expirent-ils ?",
    a: "Non. Tes crédits sont rattachés à ton email et tu les utilises quand tu veux, avec le même lien.",
  },
  {
    q: "Que devient ma vidéo ?",
    a: "Ta vidéo est supprimée dès que les images nécessaires à l'analyse sont extraites. Seules ces images et ton rapport sont conservés pour que tu puisses retélécharger ton PDF.",
  },
  {
    q: "Est-ce déductible d'un coaching ?",
    a: "Non. FormCheck est un service à part, au prix le plus bas possible, et n'est pas déductible des formules de coaching.",
  },
  {
    q: "Est-ce un avis médical ?",
    a: "Non. FormCheck analyse uniquement ta technique : placement, trajectoire, amplitude et tempo. Il ne pose aucun diagnostic et ne remplace pas un professionnel de santé. En cas de douleur, arrête et consulte.",
  },
];

function FAQItem({ q, a, id }: { q: string; a: string; id: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-white/10">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls={id}
        className="flex w-full items-start justify-between gap-6 py-5 text-left sm:py-6"
      >
        <h3 className="text-base font-semibold text-white sm:text-lg">{q}</h3>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.25 }} className="shrink-0 pt-1">
          <ChevronDown className="h-5 w-5" style={{ color: ACCENT }} />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={id}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <p className="pb-6 text-[15px] leading-relaxed text-white/70 sm:text-base">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function PrimaryCTA({ children, testId, href = "#packs" }: { children: ReactNode; testId?: string; href?: string }) {
  return (
    <a
      href={href}
      data-testid={testId}
      className="group relative inline-flex items-center justify-center gap-2 overflow-hidden px-7 py-4 text-base font-black text-black transition-transform active:scale-[0.98]"
      style={{ backgroundColor: ACCENT }}
    >
      <span className="relative z-10 flex items-center gap-2">
        {children}
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
      </span>
      <span className="pointer-events-none absolute inset-0 -translate-x-full bg-white/40 transition-transform duration-700 group-hover:translate-x-full" />
    </a>
  );
}

function SectionTitle({ eyebrow, title, sub, center = false }: { eyebrow?: string; title: string; sub?: string; center?: boolean }) {
  return (
    <Reveal className={center ? "mx-auto max-w-3xl text-center" : "max-w-2xl"}>
      {eyebrow && (
        <div className="text-xs font-black uppercase tracking-[0.2em]" style={{ color: ACCENT }}>
          {eyebrow}
        </div>
      )}
      <h2 className="mt-3 text-[34px] font-black leading-[1.05] tracking-[-0.04em] text-white sm:text-5xl">{title}</h2>
      {sub && <p className="mt-5 text-base leading-relaxed text-white/70 sm:text-lg">{sub}</p>}
    </Reveal>
  );
}

export default function FormCheck() {
  const [email, setEmail] = useState("");
  const [loadingPack, setLoadingPack] = useState<PackId | null>(null);
  const [error, setError] = useState<string | null>(null);
  const cancelled = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("cancelled") === "true";
  const reduce = useReducedMotion();

  const heroRef = useRef<HTMLElement>(null);
  const packsRef = useRef<HTMLElement>(null);
  const heroVisible = useInView(heroRef, { margin: "0px 0px -30% 0px" });
  const packsVisible = useInView(packsRef, { margin: "0px 0px -10% 0px" });
  const showSticky = !heroVisible && !packsVisible;

  const startCheckout = async (pack: PackId) => {
    setError(null);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) {
      setError("Indique ton email : c'est là que tu recevras ton lien d'envoi et tes rapports.");
      document.getElementById("formcheck-email")?.focus();
      return;
    }
    setLoadingPack(pack);
    try {
      const res = await fetch("/api/formcheck/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pack, email: email.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) throw new Error(data.message || "Le paiement n'a pas pu démarrer.");
      window.location.href = data.url;
    } catch (e: any) {
      setError(e?.message || "Le paiement n'a pas pu démarrer. Réessaie dans un instant.");
      setLoadingPack(null);
    }
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-black text-white">
      <Header hideCoachingLink />

      {/* HERO */}
      <section ref={heroRef} className="relative overflow-hidden px-5 pb-16 pt-16 sm:px-6 sm:pt-32 lg:pb-24">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_55%_at_70%_20%,rgba(252,221,0,0.13),transparent_70%)]" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[1.05fr_1fr] lg:gap-14">
          <div>
            <Reveal>
              <span
                className="inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[11px] font-black uppercase tracking-[0.16em]"
                style={{ borderColor: "rgba(252,221,0,0.5)", color: ACCENT }}
              >
                <span className="relative flex h-2 w-2">
                  {!reduce && <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60" style={{ backgroundColor: ACCENT }} />}
                  <span className="relative inline-flex h-2 w-2 rounded-full" style={{ backgroundColor: ACCENT }} />
                </span>
                FormCheck · Méthode Achzod
              </span>
            </Reveal>
            <Reveal delay={0.05}>
              <h1 className="mt-6 text-[40px] font-black leading-[1.02] tracking-[-0.045em] sm:text-6xl lg:text-[68px]">
                Ta technique,
                <br />
                <span style={{ color: ACCENT }}>passée au crible.</span>
              </h1>
            </Reveal>
            <Reveal delay={0.1}>
              <p className="mt-6 max-w-xl text-[17px] leading-relaxed text-white/75 sm:text-xl">
                Filme une série, envoie la vidéo. Elle est analysée selon la grille biomécanique d'Achzod, coach certifié NASM. Ton rapport PDF arrive par email en quelques minutes : score sur 100, erreurs montrées sur tes images, corrections et plan sur 4 semaines.
              </p>
            </Reveal>
            <Reveal delay={0.15}>
              <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
                <PrimaryCTA testId="formcheck-hero-cta">Analyser ma technique, dès 9,90 €</PrimaryCTA>
                <a href="#rapport" className="inline-flex items-center justify-center gap-2 border border-white/20 px-6 py-4 text-sm font-bold text-white transition-colors hover:bg-white/10">
                  Voir un vrai rapport
                </a>
              </div>
              <div className="mt-4">
                <Link href="/formcheck/upload" className="text-sm text-white/60 underline underline-offset-4 hover:text-white">
                  Déjà client ? Envoyer une vidéo
                </Link>
              </div>
            </Reveal>
            <Reveal delay={0.2}>
              <ul className="mt-8 grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
                {HERO_TRUST.map(({ icon: Icon, text }) => (
                  <li key={text} className="flex items-center gap-2.5 text-sm text-white/80">
                    <Icon className="h-4 w-4 shrink-0" style={{ color: ACCENT }} />
                    {text}
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>

          <Reveal delay={0.1} y={30}>
            <div className="relative mx-auto w-full max-w-[460px]">
              <div className="pointer-events-none absolute -inset-6 rounded-full bg-[radial-gradient(circle,rgba(252,221,0,0.12),transparent_65%)]" />
              <div className="relative overflow-hidden rounded-sm border border-white/10 bg-[#070707]">
                <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5">
                  <span className="text-[11px] font-black uppercase tracking-[0.16em]" style={{ color: ACCENT }}>
                    Analyse biomécanique
                  </span>
                  <span className="text-[11px] font-semibold text-white/55">Vue de profil</span>
                </div>
                <BiomechanicsFigure className="block h-auto w-full" />
              </div>
              <p className="mt-3 text-center text-xs text-white/55">L'analyse biomécanique de ta technique : angles, trajectoire, phases et erreurs.</p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* CHIFFRES DU RAPPORT */}
      <section className="border-y border-white/10 bg-white/[0.02] px-5 py-12 sm:px-6">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-4">
          {FACTS.map((f, i) => (
            <Reveal key={f.label} delay={0.08 * i}>
              <div className="text-4xl font-black tabular-nums tracking-[-0.04em] sm:text-5xl" style={{ color: ACCENT }}>
                {f.prefix && <span className="mr-1.5 text-sm font-bold tracking-normal text-white/70 sm:text-base">{f.prefix}</span>}
                <CountUp to={f.value} />
              </div>
              <p className="mt-2 text-sm leading-snug text-white/70">{f.label}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* MÉTHODE ACHZOD */}
      <section id="methode" className="px-5 py-20 sm:px-6 sm:py-28">
        <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <SectionTitle
              eyebrow="La méthode Achzod"
              title="La grille d'un coach expert en biomécanique."
              sub="Achzod est coach expert en biomécanique, certifié NASM. FormCheck applique sa méthode : sa grille d'analyse, ses critères de technique, ses corrections et ses consignes. Ta série est passée au crible critère par critère, et chaque correction vient avec la consigne qui va avec."
            />
            <Reveal delay={0.1}>
              <div className="mt-8 flex flex-wrap gap-3">
                {[
                  { code: "CPT", label: "Certified Personal Trainer" },
                  { code: "CNC", label: "Certified Nutrition Coach" },
                  { code: "CSNC", label: "Certified Sports Nutrition Coach" },
                ].map((c) => (
                  <div key={c.code} className="flex items-center gap-3 rounded-sm border border-white/10 bg-white/[0.03] px-4 py-3">
                    <ShieldCheck className="h-5 w-5 shrink-0" style={{ color: ACCENT }} />
                    <div>
                      <div className="text-sm font-black text-white">NASM {c.code}</div>
                      <div className="text-[11px] text-white/60">{c.label}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>

          <Reveal delay={0.1}>
            <div className="rounded-sm border border-white/10 bg-gradient-to-b from-white/[0.05] to-transparent p-6 sm:p-8">
              <div className="text-xs font-black uppercase tracking-[0.2em] text-white/60">Les critères évalués, un par un</div>
              <motion.ul
                className="mt-5 flex flex-wrap gap-2 sm:grid sm:grid-cols-2 sm:gap-2.5"
                initial={reduce ? "show" : "hidden"}
                whileInView="show"
                viewport={{ once: true, margin: "0px 0px -10% 0px" }}
                variants={{ hidden: {}, show: { transition: { staggerChildren: 0.07 } } }}
              >
                {CRITERIA.map((c) => (
                  <motion.li
                    key={c}
                    variants={{ hidden: { opacity: 0, x: -10 }, show: { opacity: 1, x: 0, transition: { duration: 0.4 } } }}
                    className="flex items-center gap-2 rounded-full border border-white/[0.09] bg-black/40 px-3 py-2 text-[13px] font-semibold text-white sm:gap-3 sm:rounded-sm sm:px-3.5 sm:py-2.5 sm:text-sm"
                  >
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: "rgba(252,221,0,0.16)" }}>
                      <Check className="h-3.5 w-3.5" style={{ color: ACCENT }} />
                    </span>
                    {c}
                  </motion.li>
                ))}
              </motion.ul>
              <p className="mt-5 text-sm text-white/60">Plus le score, les phases du mouvement, le tempo et tes erreurs avec leurs corrections.</p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* COMMENT ÇA MARCHE */}
      <section id="etapes" className="border-t border-white/10 px-5 py-20 sm:px-6 sm:py-28">
        <div className="mx-auto max-w-6xl">
          <SectionTitle eyebrow="Comment ça marche" title="Trois étapes. Quelques minutes." />
          <div className="mt-12">
            <StepsDemo />
          </div>
        </div>
      </section>

      {/* APERÇU DU RAPPORT */}
      <section id="rapport" className="relative border-t border-white/10 px-5 py-20 sm:px-6 sm:py-28">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_0%,rgba(252,221,0,0.07),transparent_70%)]" />
        <div className="relative mx-auto max-w-6xl">
          <SectionTitle
            eyebrow="Exemple réel"
            title="Voilà ce que tu reçois."
            sub="Extrait d'un vrai rapport FormCheck : soulevé de terre sur cales, 3 répétitions filmées de profil."
          />
          <div className="mt-12">
            <Reveal>
              <ReportPreview />
            </Reveal>
          </div>

          <div className="mt-16">
            <Reveal>
              <div className="text-xs font-black uppercase tracking-[0.2em] text-white/60">Les vraies pages du PDF</div>
            </Reveal>
            <div className="-mx-5 mt-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-4 sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-6 sm:overflow-visible sm:px-0 sm:pb-0">
              {REPORT_PAGES.map((p, i) => (
                <motion.figure
                  key={p.src}
                  className="w-[72%] shrink-0 snap-center sm:w-auto"
                  initial={reduce ? false : { opacity: 0, y: 40, rotate: i === 0 ? -4 : i === 2 ? 4 : 0 }}
                  whileInView={{ opacity: 1, y: 0, rotate: 0 }}
                  viewport={{ once: true, margin: "0px 0px -10% 0px" }}
                  transition={{ duration: 0.8, delay: 0.1 * i, ease: [0.22, 1, 0.36, 1] }}
                >
                  <div className="overflow-hidden rounded-sm border border-white/10 bg-white shadow-[0_24px_60px_-20px_rgba(0,0,0,0.9)] transition-transform duration-500 hover:-translate-y-1">
                    <img src={p.src} alt={p.alt} width={900} height={1272} loading="lazy" decoding="async" className="block h-auto w-full" />
                  </div>
                  <figcaption className="mt-3 text-sm font-semibold text-white/80">{p.title}</figcaption>
                </motion.figure>
              ))}
            </div>
          </div>

          <Reveal className="mt-12 flex justify-center">
            <PrimaryCTA testId="formcheck-report-cta">Je veux mon rapport</PrimaryCTA>
          </Reveal>
        </div>
      </section>

      {/* CONTENU DU RAPPORT */}
      <section id="contenu" className="border-t border-white/10 px-5 py-20 sm:px-6 sm:py-28">
        <div className="mx-auto max-w-6xl">
          <SectionTitle
            eyebrow="Ton rapport PDF"
            title="Tout ce que contient ton rapport."
            sub="Un PDF clair, sur fond blanc, à garder sur ton téléphone à la salle. Chaque erreur est montrée sur l'image de ta vidéo où elle se voit le mieux."
          />
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {REPORT_BLOCKS.map(({ icon: Icon, title, text }, i) => (
              <Reveal key={title} delay={0.06 * i}>
                <div className="group flex h-full gap-4 rounded-sm border border-white/10 bg-white/[0.03] p-5 transition-colors hover:border-[#FCDD00]/40 hover:bg-white/[0.05] sm:block sm:p-6">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm sm:h-11 sm:w-11" style={{ backgroundColor: "rgba(252,221,0,0.12)" }}>
                    <Icon className="h-5 w-5" style={{ color: ACCENT }} />
                  </div>
                  <div>
                    <h3 className="text-[17px] font-bold text-white sm:mt-5 sm:text-lg">{title}</h3>
                    <p className="mt-1.5 text-[15px] leading-relaxed text-white/70 sm:mt-2">{text}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal delay={0.1}>
            <div className="mt-8 rounded-sm border border-white/10 p-6">
              <div className="text-xs font-black uppercase tracking-[0.2em] text-white/60">Aussi dans ton PDF</div>
              <ul className="mt-4 grid gap-x-6 gap-y-2.5 sm:grid-cols-2 lg:grid-cols-4">
                {REPORT_EXTRAS.map((e) => (
                  <li key={e} className="flex items-start gap-2 text-sm text-white/85">
                    <Check className="mt-0.5 h-4 w-4 shrink-0" style={{ color: ACCENT }} />
                    {e}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </div>
      </section>

      {/* PACKS */}
      <section id="packs" ref={packsRef} className="relative scroll-mt-20 border-t border-white/10 px-5 py-20 sm:px-6 sm:py-28">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_45%_at_50%_100%,rgba(252,221,0,0.08),transparent_70%)]" />
        <div className="relative mx-auto max-w-6xl">
          <SectionTitle
            center
            eyebrow="Formules et tarifs"
            title="Choisis ton pack."
            sub="Paiement unique, sans abonnement. Un crédit = une vidéo analysée. Crédits sans date d'expiration."
          />

          {cancelled && (
            <p className="mx-auto mt-6 max-w-xl rounded-sm border border-white/15 bg-white/5 p-3 text-center text-sm text-white/75">
              Paiement annulé : aucun montant n'a été prélevé.
            </p>
          )}

          <Reveal className="mx-auto mt-10 max-w-xl">
            <label htmlFor="formcheck-email" className="mb-2 block text-sm font-semibold text-white/85">
              Ton email (pour recevoir ton lien d'envoi et tes rapports)
            </label>
            <input
              id="formcheck-email"
              data-testid="formcheck-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="toi@email.com"
              className="w-full rounded-sm border border-white/20 bg-white/5 px-4 py-3.5 text-base text-white placeholder:text-white/40 focus:border-[#FCDD00] focus:outline-none"
            />
            {error && (
              <p className="mt-3 text-sm text-red-400" role="alert">
                {error}
              </p>
            )}
          </Reveal>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {PACKS.map((pack, i) => (
              <Reveal key={pack.id} delay={0.08 * i} className="h-full">
                <div
                  data-testid={`formcheck-pack-${pack.id}`}
                  className={`relative flex h-full flex-col rounded-sm p-7 sm:p-8 ${
                    pack.popular ? "border-2 bg-[#FCDD00]/[0.07] shadow-[0_0_60px_-15px_rgba(252,221,0,0.35)]" : "border border-white/10 bg-white/[0.03]"
                  }`}
                  style={pack.popular ? { borderColor: ACCENT } : undefined}
                >
                  {pack.popular && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap px-3 py-1 text-xs font-black uppercase tracking-wider text-black" style={{ backgroundColor: ACCENT }}>
                      Recommandé
                    </span>
                  )}
                  <h3 className="text-2xl font-bold">{pack.name}</h3>
                  <div className="mt-4 text-5xl font-black tracking-[-0.03em]">{pack.price}</div>
                  <div className="mt-1 text-sm text-white/60">{pack.unit}</div>
                  <p className="mt-4 text-white/70">{pack.tagline}</p>
                  <ul className="mt-6 flex-grow space-y-3">
                    {pack.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm text-white/85">
                        <Check className="mt-0.5 h-4 w-4 shrink-0" style={{ color: ACCENT }} />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    data-testid={`formcheck-checkout-${pack.id}`}
                    onClick={() => startCheckout(pack.id)}
                    disabled={loadingPack !== null}
                    className={`mt-8 flex w-full items-center justify-center gap-2 py-4 font-black transition-all active:scale-[0.98] disabled:opacity-60 ${
                      pack.popular ? "text-black hover:brightness-95" : "border border-white/25 text-white hover:bg-white/10"
                    }`}
                    style={pack.popular ? { backgroundColor: ACCENT } : undefined}
                  >
                    {loadingPack === pack.id ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Choisir ce pack
                  </button>
                </div>
              </Reveal>
            ))}
          </div>
          <div className="mt-8 flex flex-col items-center gap-3 text-center text-sm text-white/60">
            <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
              <span className="flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5" style={{ color: ACCENT }} /> Paiement sécurisé par Stripe
              </span>
              <span className="flex items-center gap-1.5">
                <MailCheck className="h-3.5 w-3.5" style={{ color: ACCENT }} /> Sans compte
              </span>
              <span className="flex items-center gap-1.5">
                <Trash2 className="h-3.5 w-3.5" style={{ color: ACCENT }} /> Vidéo supprimée après l'analyse
              </span>
            </div>
            <p>Un crédit n'est utilisé que lorsque ton rapport est livré. Vidéo inexploitable ? Tu la refilmes, ton crédit reste intact.</p>
          </div>
        </div>
      </section>

      {/* BIEN FILMER */}
      <section className="border-t border-white/10 px-5 py-20 sm:px-6 sm:py-28">
        <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
          <div>
            <SectionTitle eyebrow="Avant de filmer" title="Bien filmer ta série." sub="Une vidéo propre, c'est une analyse précise. Trente secondes de mise en place suffisent." />
            <ul className="mt-8 space-y-4">
              {FILMING_TIPS.map((tip, i) => (
                <Reveal key={tip} delay={0.06 * i}>
                  <li className="flex items-start gap-3 text-[15px] text-white/85">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-black text-black" style={{ backgroundColor: ACCENT }}>
                      {i + 1}
                    </span>
                    <span>{tip}</span>
                  </li>
                </Reveal>
              ))}
            </ul>
          </div>
          <Reveal delay={0.1}>
            <div className="rounded-sm border border-white/10 bg-[#070707] p-4 sm:p-6">
              <FilmingIllustration className="block h-auto w-full" />
            </div>
          </Reveal>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="border-t border-white/10 px-5 py-20 sm:px-6 sm:py-28">
        <div className="mx-auto max-w-3xl">
          <SectionTitle center eyebrow="FAQ" title="Questions fréquentes" />
          <div className="mt-10">
            {FAQ.map((item, i) => (
              <FAQItem key={item.q} id={`formcheck-faq-${i}`} q={item.q} a={item.a} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="relative overflow-hidden border-t border-white/10 px-5 py-24 sm:px-6 sm:py-32">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_50%_60%_at_50%_100%,rgba(252,221,0,0.14),transparent_70%)]" />
        <Reveal className="relative mx-auto max-w-3xl text-center">
          <h2 className="text-[36px] font-black leading-[1.05] tracking-[-0.04em] sm:text-6xl">
            Ta prochaine série mérite
            <br />
            <span style={{ color: ACCENT }}>mieux qu'un doute.</span>
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-base text-white/70 sm:text-lg">
            Filme, envoie, corrige. Ton rapport arrive par email en quelques minutes, dès 9,90 €.
          </p>
          <div className="mt-10 flex justify-center">
            <PrimaryCTA testId="formcheck-final-cta">Choisir mon pack</PrimaryCTA>
          </div>
          <p className="mt-10 text-xs leading-relaxed text-white/50">
            FormCheck analyse uniquement la technique d'exécution. Il ne pose aucun diagnostic médical et ne remplace pas un professionnel de santé.
          </p>
        </Reveal>
      </section>

      <Footer hideCoachingLink />

      {/* CTA collant mobile */}
      <AnimatePresence>
        {showSticky && (
          <motion.div
            className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-black/90 px-4 pt-3 backdrop-blur-md md:hidden"
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 12px)" }}
            initial={reduce ? { opacity: 0 } : { y: 90 }}
            animate={reduce ? { opacity: 1 } : { y: 0 }}
            exit={reduce ? { opacity: 0 } : { y: 90 }}
            transition={{ type: "tween", duration: 0.3 }}
          >
            <a
              href="#packs"
              data-testid="formcheck-sticky-cta"
              className="flex w-full items-center justify-center gap-2 py-3.5 text-[15px] font-black text-black"
              style={{ backgroundColor: ACCENT }}
            >
              Analyser ma technique, dès 9,90 € <ArrowRight className="h-4 w-4" />
            </a>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
