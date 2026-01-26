import { useMemo, useRef } from "react";
import { Link } from "wouter";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowRight, Beaker, Check, FileText, FlaskConical, Shield, Target, Upload, Zap } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const PRIMARY_BLUE = "rgb(2,121,232)";

type Panel = {
  title: string;
  count: number;
  bullets: string[];
};

const PANELS: Panel[] = [
  {
    title: "Hormones anaboliques",
    count: 10,
    bullets: [
      "Testosterone totale/libre, SHBG, estradiol",
      "LH, FSH, prolactine, DHEA-S",
      "Cortisol matin, IGF-1",
    ],
  },
  {
    title: "Thyroide",
    count: 5,
    bullets: ["TSH, T3 libre, T4 libre", "T3 reverse, anti-TPO", "Conversion et regulation endocrine"],
  },
  {
    title: "Metabolisme & lipides",
    count: 9,
    bullets: ["Glycemie, HbA1c, insuline, HOMA-IR", "TG, HDL, LDL", "ApoB, Lp(a)"],
  },
  {
    title: "Inflammation & fer",
    count: 5,
    bullets: ["CRP-us, homocysteine", "Ferritine, fer serique", "Saturation transferrine"],
  },
  {
    title: "Vitamines & mineraux",
    count: 5,
    bullets: ["Vitamine D, B12, folate", "Magnesium RBC", "Zinc"],
  },
  {
    title: "Hepatique & renal",
    count: 5,
    bullets: ["ALT, AST, GGT", "Creatinine, eGFR", "Lecture foie + rein"],
  },
];

const SOURCES = [
  { title: "Huberman Lab", detail: "Protocoles science-backed (sleep, hormones, nutrition)" },
  { title: "Peter Attia MD", detail: "Longevite, cardio-metabolique, prevention" },
  { title: "MPMD (Derek)", detail: "Hormones, biomarqueurs, optimisation" },
  { title: "Examine.com", detail: "Supplements et evidence (etudes, dosages)" },
  { title: "Chris Masterjohn", detail: "Micronutriments, methylation, metabolism" },
  { title: "Renaissance Periodization", detail: "Nutrition/entrainement, adherence, progression" },
  { title: "Stronger By Science", detail: "Science appliquee, entrainement, performance" },
];

const FAQ = [
  {
    q: "Pourquoi payer 99€ alors que mon labo me donne des resultats gratuits ?",
    a: "Ton labo te donne des ranges normaux (moyenne population). Ici, tu obtiens des ranges optimaux (performance/longevite), une lecture par systeme et un plan d'action priorise.",
  },
  {
    q: "Combien de biomarqueurs sont analyses ?",
    a: "Phase 1: 39 biomarqueurs realistes pour un PDF standard. Roadmap: +11 (NFS + ionogramme + 3 ajouts) pour atteindre 50 en Phase 2.",
  },
  {
    q: "Est-ce que c'est medical ?",
    a: "C'est un compte-rendu educatif et actionnable, base sur des ranges numeriques et de la litterature. Si un marqueur est critique, tu dois consulter un medecin.",
  },
  {
    q: "Mon PDF est protege, je fais quoi ?",
    a: "Il faut un PDF deverrouille. Si le labo protege le fichier, convertis-le en PDF standard (ex: via un outil de deblocage) puis re-uploade.",
  },
  {
    q: "Je peux suivre l'evolution dans le temps ?",
    a: "Oui. Chaque upload cree un bilan historise. Des que tu as plusieurs bilans completes, tu vois les tendances et la trajectoire.",
  },
];

function BadgePill({ children }: { children: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-white/15 bg-white/[0.03] px-3 py-1 text-xs text-white/70">
      {children}
    </span>
  );
}

export default function BloodAnalysisOffer() {
  const exampleRef = useRef<HTMLDivElement | null>(null);
  const panelsRef = useRef<HTMLDivElement | null>(null);

  const { scrollYProgress } = useScroll();
  const heroGlow = useTransform(scrollYProgress, [0, 0.25], [0.9, 0.2]);

  const ctaHref = "/auth/login?next=/blood-dashboard";
  const trustRow = useMemo(
    () => [
      "Ranges numeriques precis",
      "Approche evidence-based",
      "Dashboard + export PDF",
    ],
    []
  );

  return (
    <div className="min-h-screen bg-black text-white">
      <Header />

      <section className="relative overflow-hidden">
        <motion.div
          className="pointer-events-none absolute inset-0"
          style={{
            opacity: heroGlow,
            background:
              "radial-gradient(circle at 50% 0%, rgba(2,121,232,0.16) 0%, transparent 55%)",
          }}
        />
        <div className="pointer-events-none absolute inset-0 opacity-30" style={{ backgroundImage: "linear-gradient(to right, rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.06) 1px, transparent 1px)", backgroundSize: "60px 60px" }} />

        <div className="relative mx-auto max-w-7xl px-6 pt-20 pb-16">
          <div className="grid gap-12 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="space-y-7"
            >
              <div className="flex flex-wrap items-center gap-2">
                <BadgePill>Nouveau</BadgePill>
                <BadgePill>Evidence-based</BadgePill>
                <BadgePill>39 biomarqueurs</BadgePill>
              </div>

              <h1 className="text-5xl md:text-7xl font-semibold tracking-tight leading-[0.95]">
                Blood Analysis.
                <br />
                <span style={{ color: PRIMARY_BLUE }}>Ranges optimaux vs normaux</span>
              </h1>

              <p className="text-white/70 text-lg leading-relaxed max-w-2xl">
                Upload ton PDF de laboratoire. Je decode tes biomarqueurs, je compare les ranges normaux aux
                ranges optimaux (performance/longevite), et je te livre un plan d'action priorise.
              </p>

              <div className="flex flex-wrap items-center gap-5 text-sm text-white/60">
                {trustRow.map((item) => (
                  <div key={item} className="inline-flex items-center gap-2">
                    <Check className="h-4 w-4" style={{ color: PRIMARY_BLUE }} />
                    <span>{item}</span>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Link href={ctaHref}>
                  <a className="group inline-flex items-center gap-3 rounded-full bg-white px-7 py-3 text-sm font-semibold text-black transition-all hover:scale-[1.02]">
                    Analyser mon bilan — 99€
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </a>
                </Link>
                <button
                  type="button"
                  onClick={() => panelsRef.current?.scrollIntoView({ behavior: "smooth" })}
                  className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-transparent px-6 py-3 text-sm text-white/80 hover:bg-white/5 transition-all"
                >
                  Voir les panels
                  <FileText className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => exampleRef.current?.scrollIntoView({ behavior: "smooth" })}
                  className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-transparent px-6 py-3 text-sm text-white/80 hover:bg-white/5 transition-all"
                >
                  Voir un exemple
                  <Beaker className="h-4 w-4" />
                </button>
              </div>

              <div className="pt-3 text-xs text-white/50">
                Paiement securise (Stripe) · RGPD · Analyse basee sur ton PDF (pas un service labo proprietaire).
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, ease: "easeOut", delay: 0.1 }}
              className="h-[360px] md:h-[440px]"
            >
              <div className="h-full rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                <BloodVisionVisual />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="bg-[#0a0a0a] py-24 px-6">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <p className="text-sm font-medium tracking-[0.2em] uppercase" style={{ color: PRIMARY_BLUE }}>
              Comment ca marche
            </p>
            <h2 className="mt-6 text-4xl md:text-5xl font-semibold tracking-tight">3 etapes. C'est tout.</h2>
          </div>

          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {[
              {
                step: "01",
                icon: Upload,
                title: "Upload ton PDF",
                desc: "Depose tes resultats de laboratoire (PDF deverrouille).",
                time: "10 sec",
              },
              {
                step: "02",
                icon: Beaker,
                title: "OCR + analyse",
                desc: "Extraction des biomarqueurs puis lecture evidence-based.",
                time: "2-5 min",
              },
              {
                step: "03",
                icon: Check,
                title: "Rapport + protocoles",
                desc: "Dashboard interactif + plan d'action priorise.",
                time: "Instantane",
              },
            ].map((item, idx) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, ease: "easeOut", delay: idx * 0.05 }}
                className="relative overflow-hidden rounded-xl border border-white/15 bg-white/[0.03] p-10"
              >
                <div className="absolute right-4 top-2 text-7xl font-semibold text-white/[0.06]">{item.step}</div>
                <div className="relative z-10">
                  <div className="h-12 w-12 rounded-lg border border-white/15 bg-white/[0.04] flex items-center justify-center">
                    <item.icon className="h-6 w-6" style={{ color: PRIMARY_BLUE }} />
                  </div>
                  <p className="mt-6 text-2xl font-semibold tracking-tight">{item.title}</p>
                  <p className="mt-3 text-white/70 leading-relaxed">{item.desc}</p>
                  <p className="mt-6 text-sm text-white/50">Duree: {item.time}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section ref={panelsRef} className="py-24 px-6">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <h2 className="text-4xl md:text-5xl font-semibold tracking-tight">39 biomarqueurs · 6 panels</h2>
            <p className="mt-4 text-white/60 max-w-3xl mx-auto">
              Un PDF standard contient rarement 80 biomarqueurs. Ici on couvre ce qui est realiste, exploitable, et actionnable.
              Roadmap: +11 marqueurs (NFS + ionogramme) pour atteindre 50.
            </p>
          </div>

          <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {PANELS.map((panel) => (
              <div
                key={panel.title}
                className="rounded-xl border border-white/10 bg-white/[0.03] p-8 hover:border-white/20 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold tracking-tight">{panel.title}</p>
                    <p className="mt-2 text-sm text-white/60">{panel.count} biomarqueurs analyses</p>
                  </div>
                  <span className="inline-flex items-center rounded-full border border-white/15 bg-white/[0.03] px-3 py-1 text-xs text-white/70">
                    Panel
                  </span>
                </div>
                <ul className="mt-6 space-y-2 text-sm text-white/70">
                  {panel.bullets.map((bullet) => (
                    <li key={bullet} className="flex gap-2">
                      <span className="mt-2 h-1.5 w-1.5 rounded-full" style={{ backgroundColor: PRIMARY_BLUE }} />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-8">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold tracking-tight">Phase 2</p>
                  <p className="mt-2 text-sm text-white/60">NFS + ionogramme + 3 ajouts</p>
                </div>
                <span className="inline-flex items-center rounded-full border border-white/15 bg-white/[0.03] px-3 py-1 text-xs text-white/70">
                  Coming soon
                </span>
              </div>
              <p className="mt-6 text-sm text-white/70 leading-relaxed">
                Ajout de 11 marqueurs frequents (hemoglobine, hematocrite, GR/GB, plaquettes, sodium/potassium/chlore, cholesterol total, ApoA1, uree).
              </p>
              <div className="mt-6 h-28 rounded-lg border border-white/10 bg-[radial-gradient(ellipse_at_center,_rgba(2,121,232,0.10)_0%,_transparent_70%)]" />
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#0a0a0a] py-24 px-6">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <h2 className="text-4xl md:text-5xl font-semibold tracking-tight">Ranges optimaux vs normaux</h2>
            <p className="mt-4 text-white/60 max-w-3xl mx-auto">
              “Normal” ne veut pas dire “optimal” si ton objectif est performance, composition corporelle, energie et longevite.
            </p>
          </div>

          <div className="mt-14 grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-10">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-lg border border-white/15 bg-white/[0.04] flex items-center justify-center">
                  <Shield className="h-5 w-5 text-white/80" />
                </div>
                <p className="text-2xl font-semibold tracking-tight">Ranges laboratoire (normaux)</p>
              </div>
              <p className="mt-4 text-white/70 leading-relaxed">
                Base sur la moyenne population (95%). Cela inclut sedentarite, surpoids, pathologies silencieuses. Utile pour depistage, pas pour optimisation.
              </p>
              <div className="mt-8 rounded-lg border border-white/10 bg-black/40 p-5">
                <p className="text-sm font-semibold">Exemple: testosterone totale</p>
                <p className="mt-2 text-sm text-white/70">Normal labo: 300–1000 ng/dL</p>
                <p className="mt-4 text-sm text-white/70">
                  350 = “normal”, mais souvent associe a fatigue, libido basse, progression lente.
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-10">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-lg border border-white/15 bg-white/[0.04] flex items-center justify-center">
                  <Target className="h-5 w-5" style={{ color: PRIMARY_BLUE }} />
                </div>
                <p className="text-2xl font-semibold tracking-tight">Ranges optimaux (performance)</p>
              </div>
              <p className="mt-4 text-white/70 leading-relaxed">
                Base sur top performers (litterature performance/longevite). Objectif: energie stable, meilleure recuperation, meilleure sensibilite metabolique.
              </p>
              <div className="mt-8 rounded-lg border border-white/10 bg-black/40 p-5">
                <p className="text-sm font-semibold">Exemple: testosterone totale</p>
                <p className="mt-2 text-sm text-white/70">Optimal: 600–900 ng/dL</p>
                <p className="mt-4 text-sm text-white/70">
                  700 = zone optimale: energie, libido et progression generalement meilleures.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-12 flex justify-center">
            <Link href={ctaHref}>
              <a className="inline-flex items-center gap-3 rounded-full border border-white/20 bg-white px-7 py-3 text-sm font-semibold text-black hover:scale-[1.02] transition-all">
                Decouvrir mes ranges optimaux
                <ArrowRight className="h-4 w-4" />
              </a>
            </Link>
          </div>
        </div>
      </section>

      <section className="py-24 px-6">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <h2 className="text-4xl md:text-5xl font-semibold tracking-tight">Bibliotheque de connaissances</h2>
            <p className="mt-4 text-white/60 max-w-3xl mx-auto">
              7 sources expertes. Corrélations et protocoles construits sur de la litterature, pas un PDF genere au hasard.
            </p>
            <p className="mt-2 text-xs text-white/50">
              Mise a jour reguliere. Objectif: rendre ton bilan compréhensible et actionnable.
            </p>
          </div>

          <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {SOURCES.map((item) => (
              <div key={item.title} className="rounded-xl border border-white/10 bg-white/[0.03] p-8">
                <p className="text-lg font-semibold">{item.title}</p>
                <p className="mt-3 text-sm text-white/70 leading-relaxed">{item.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section ref={exampleRef} className="bg-[#0a0a0a] py-24 px-6">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <h2 className="text-4xl md:text-5xl font-semibold tracking-tight">Exemple de rendu</h2>
            <p className="mt-4 text-white/60 max-w-3xl mx-auto">
              Score global + breakdown par panels, alertes prioritaires, biomarqueurs detailles, protocoles et suivi.
            </p>
          </div>

          <div className="mt-14 rounded-2xl border border-white/10 bg-black p-6">
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-10">
              <p className="text-xs uppercase tracking-[0.3em] text-white/50">Preview</p>
              <p className="mt-3 text-3xl font-semibold tracking-tight">Ton score global: 78/100</p>
              <p className="mt-3 text-white/70 max-w-2xl leading-relaxed">
                “Ton profil montre un axe cardio-metabolique a optimiser (TG/HDL), et un levier hormonal clair (testosterone libre). Je te donne un plan en 3 phases, avec une priorisation clinique.”
              </p>

              <div className="mt-10 grid gap-4 md:grid-cols-3">
                {["Hormones 72", "Thyroide 88", "Metabolisme 81", "Inflammation 65", "Vitamines 90", "Foie/Rein 92"]
                  .slice(0, 6)
                  .map((label) => (
                    <div key={label} className="rounded-lg border border-white/10 bg-black/40 px-4 py-4">
                      <p className="text-sm font-semibold">{label}</p>
                      <p className="mt-2 text-xs text-white/60">Interpretation + action</p>
                    </div>
                  ))}
              </div>

              <div className="mt-10 flex flex-wrap gap-3">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.03] px-4 py-2 text-sm text-white/70">
                  <Shield className="h-4 w-4" style={{ color: PRIMARY_BLUE }} />
                  Alertes prioritaires
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.03] px-4 py-2 text-sm text-white/70">
                  <FileText className="h-4 w-4" style={{ color: PRIMARY_BLUE }} />
                  Export PDF
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.03] px-4 py-2 text-sm text-white/70">
                  <Target className="h-4 w-4" style={{ color: PRIMARY_BLUE }} />
                  Plan 180 jours
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 px-6">
        <div className="mx-auto max-w-4xl">
          <div className="text-center">
            <h2 className="text-4xl md:text-5xl font-semibold tracking-tight">Questions frequentes</h2>
          </div>

          <div className="mt-10 rounded-xl border border-white/10 bg-white/[0.03] p-6">
            <Accordion type="single" collapsible className="w-full">
              {FAQ.map((item) => (
                <AccordionItem key={item.q} value={item.q} className="border-white/10">
                  <AccordionTrigger className="text-left text-white/90 hover:no-underline">
                    {item.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-white/70 leading-relaxed">
                    {item.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </section>

      <section className="bg-[#0a0a0a] py-20 px-6">
        <div className="mx-auto max-w-6xl text-center">
          <h2 className="text-4xl md:text-5xl font-semibold tracking-tight">Analyser ton bilan maintenant</h2>
          <p className="mt-4 text-white/60 max-w-2xl mx-auto">
            Tu uploade ton PDF. Tu recuperes un dashboard clair, des ranges optimaux, et un plan d'action.
          </p>
          <div className="mt-8 flex justify-center">
            <Link href={ctaHref}>
              <a className="group inline-flex items-center gap-3 rounded-full bg-white px-8 py-4 text-sm font-semibold text-black transition-all hover:scale-[1.02]">
                Lancer mon Blood Analysis — 99€
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </a>
            </Link>
          </div>
          <p className="mt-4 text-xs text-white/50">Paiement securise · Historique conserve · Export PDF</p>
        </div>
      </section>

      <Footer />
    </div>
  );
}

function BloodVisionVisual() {
  return (
    <div className="relative w-full h-full rounded-xl border border-white/10 bg-[radial-gradient(ellipse_at_top,_rgba(2,121,232,0.16)_0%,_transparent_55%)] overflow-hidden">
      <div className="absolute inset-0 bg-[#0a0a0a]" />
      <div
        className="absolute inset-0 opacity-35"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.06) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />
      <div className="relative z-10 p-6 h-full flex flex-col justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-white/50">Apercu dashboard</p>
          <p className="mt-3 text-white text-2xl font-semibold tracking-tight">Un dashboard. 39 biomarqueurs.</p>
          <p className="mt-2 text-white/60 text-sm leading-relaxed">
            Tu lis tes panels comme une carte: points forts, points d'attention, et actions immediates.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Hormones", Icon: Zap },
            { label: "Thyroide", Icon: Target },
            { label: "Metabo", Icon: Beaker },
            { label: "Inflamm", Icon: Shield },
            { label: "Vitamines", Icon: FileText },
            { label: "Foie/Rein", Icon: FlaskConical },
          ].map((item) => (
            <div key={item.label} className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-3">
              <item.Icon className="h-4 w-4" style={{ color: PRIMARY_BLUE }} />
              <p className="mt-2 text-xs text-white/70">{item.label}</p>
              <div className="mt-2 h-1.5 w-full rounded-full bg-white/10">
                <div className="h-1.5 rounded-full" style={{ width: "72%", backgroundColor: PRIMARY_BLUE }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
