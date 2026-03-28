/**
 * APEXLABS - Peptides Engine Offer
 * Protocole peptides personnalise — 299€
 */

import { useState } from "react";
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
} from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

// ============================================================================
// CONSTANTS
// ============================================================================

const PRIMARY = "#F59E0B";

type FAQEntry = { q: string; a: string };

const FAQ: FAQEntry[] = [
  {
    q: "Pourquoi 299€ ?",
    a: "Tu economises 920€ des le 1er cycle. Le protocole + 2 blood analyses (valeur 198€) + acces source a prix labo = 697€ de valeur reelle. A 299€, c'est un investissement qui se rembourse en une seule commande de peptides au bon prix.",
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
    q: "C'est deductible du coaching ?",
    a: "Oui. Les 299€ sont 100% deductibles si tu prends un coaching Achzod. Le montant est credite integralement sur ton acompte coaching.",
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
    title: "On genere ton protocole",
    desc: "IA + expertise manuelle. Molecules, dosages en mcg/kg, timing, reconstitution. Verifie manuellement avant envoi.",
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
      className="border-b border-white/10"
    >
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-start justify-between gap-8 py-6 text-left transition-colors hover:text-amber-400"
      >
        <h3 className="text-base font-semibold text-white">{q}</h3>
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
            <p className="pb-6 text-sm leading-relaxed text-white/60">{a}</p>
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
    <Link href={href}>
      <motion.a
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className={`inline-flex cursor-pointer items-center gap-2 rounded-lg font-semibold transition-all ${
          large
            ? "px-10 py-5 text-lg"
            : "px-7 py-4 text-base"
        }`}
        style={{ backgroundColor: PRIMARY, color: "#000" }}
      >
        {children}
        <ArrowRight className="h-5 w-5" />
      </motion.a>
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
          <h2 className="mt-4 text-3xl font-bold text-white md:text-4xl">
            Ce que tu paies ailleurs vs via ma source
          </h2>
          <p className="mt-4 text-white/50 max-w-2xl mx-auto">
            Prix reels compares. Revendeurs FR/EU vs source directe laboratoire avec COA (Certificat d'Analyse) par lot.
          </p>
        </motion.div>

        {/* Per-peptide comparison table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="rounded-2xl border border-white/10 bg-[#0a0a0a] overflow-hidden mb-6"
        >
          {/* Header */}
          <div className="grid grid-cols-4 gap-4 px-6 py-4 border-b border-white/10 bg-white/5">
            <span className="text-xs font-mono uppercase tracking-wider text-white/40">Peptide</span>
            <span className="text-xs font-mono uppercase tracking-wider text-white/40 text-center">Revendeur FR/EU</span>
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
              className={`grid grid-cols-4 gap-4 px-6 py-4 items-center ${i < PRICE_TABLE.length - 1 ? "border-b border-white/5" : ""}`}
            >
              <div>
                <span className="text-sm font-medium text-white">{row.name}</span>
                <span className="ml-2 text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-white/40">{row.tag}</span>
              </div>
              <span className="text-sm text-white/40 text-center line-through">{row.reseller}</span>
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
            className="rounded-2xl border border-white/10 bg-[#0a0a0a] p-8"
          >
            <p className="mb-1 font-mono text-xs uppercase tracking-wider text-white/40">Revendeur classique</p>
            <p className="mb-2 text-4xl font-bold text-white/40">1 200€<span className="text-lg font-normal">/cycle</span></p>
            <p className="text-sm text-white/30">3 peptides × 8 vials × 50€ en moyenne</p>
            <ul className="mt-4 space-y-2">
              {["Prix gonfles x3-x10", "Pas de COA", "Aucune personnalisation"].map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-white/40">
                  <span className="text-red-500 mt-0.5">✕</span> {item}
                </li>
              ))}
            </ul>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="relative rounded-2xl border bg-[#0a0a0a] p-8"
            style={{ borderColor: PRIMARY }}
          >
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-4 py-1 text-xs font-semibold" style={{ backgroundColor: PRIMARY, color: "#000" }}>
              Via ton protocole
            </div>
            <p className="mb-1 font-mono text-xs uppercase tracking-wider" style={{ color: PRIMARY }}>Ma source (dans ton protocole)</p>
            <p className="mb-2 text-4xl font-bold text-white">~280€<span className="text-lg font-normal text-white/60">/cycle</span></p>
            <p className="text-sm text-white/50">3 peptides × 8 vials × ~$12 direct labo</p>
            <ul className="mt-4 space-y-2">
              {["Prix direct laboratoire", "COA par lot, labo tiers", "Protocole personnalise"].map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-white">
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
          <p className="text-lg text-white">
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
// DELIVERABLES GRID
// ============================================================================

function DeliverablesSection() {
  return (
    <section className="py-24 px-6 bg-[#050505]">
      <div className="mx-auto max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-14 text-center"
        >
          <SectionLabel>Ce que tu recois</SectionLabel>
          <h2 className="mt-4 text-3xl font-bold text-white md:text-4xl">
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
                className="rounded-xl border border-white/8 bg-[#0a0a0a] p-6"
              >
                <div
                  className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg"
                  style={{ backgroundColor: "rgba(245,158,11,0.1)" }}
                >
                  <Icon className="h-5 w-5" style={{ color: PRIMARY }} />
                </div>
                <h3 className="mb-2 text-sm font-semibold text-white">{item.title}</h3>
                <p className="text-sm leading-relaxed text-white/50">{item.desc}</p>
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
          <h2 className="mt-4 text-3xl font-bold text-white md:text-4xl">3 etapes, 48h</h2>
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
                      className="flex h-14 w-14 items-center justify-center rounded-full border-2 bg-[#0a0a0a]"
                      style={{ borderColor: PRIMARY }}
                    >
                      <Icon className="h-6 w-6" style={{ color: PRIMARY }} />
                    </div>
                  </div>
                  <div className="flex-1 rounded-xl border border-white/8 bg-[#0a0a0a] p-6">
                    <div className="mb-1 flex items-center gap-3">
                      <span className="font-mono text-xs" style={{ color: PRIMARY }}>{step.step}</span>
                      <span className="rounded-full border border-white/10 px-2 py-0.5 font-mono text-xs text-white/40">
                        {step.time}
                      </span>
                    </div>
                    <h3 className="mb-2 text-base font-semibold text-white">{step.title}</h3>
                    <p className="text-sm leading-relaxed text-white/55">{step.desc}</p>
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
    <section className="py-24 px-6 bg-[#050505]">
      <div className="mx-auto max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-14 text-center"
        >
          <SectionLabel>Objectifs couverts</SectionLabel>
          <h2 className="mt-4 text-3xl font-bold text-white md:text-4xl">
            8 categories. 74 molecules disponibles.
          </h2>
          <p className="mt-4 text-white/50">
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
                className="group rounded-xl border border-white/8 bg-[#0a0a0a] p-5 transition-colors hover:border-amber-500/30"
              >
                <div
                  className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg"
                  style={{ backgroundColor: "rgba(245,158,11,0.1)" }}
                >
                  <Icon className="h-4 w-4" style={{ color: PRIMARY }} />
                </div>
                <h3 className="mb-1 text-sm font-semibold text-white">{obj.title}</h3>
                <p className="mb-2 font-mono text-[11px]" style={{ color: PRIMARY }}>{obj.peptides}</p>
                <p className="text-xs leading-relaxed text-white/45">{obj.detail}</p>
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
    <section className="py-16 px-6 border-y border-white/8">
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
              <p className="mt-1 text-xs text-white/45">{item.label}</p>
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
            className="rounded-2xl border bg-[#0a0a0a] p-8"
            style={{ borderColor: "rgba(245,158,11,0.3)" }}
          >
            <div className="mb-4 flex items-center gap-3">
              <Users className="h-5 w-5" style={{ color: PRIMARY }} />
              <SectionLabel>Disponibilite</SectionLabel>
            </div>
            <p className="mb-3 text-2xl font-bold text-white">15 protocoles par mois</p>
            <p className="mb-6 text-sm text-white/55">
              Chaque protocole est verifie manuellement avant envoi. La limite mensuelle garantit la qualite de chaque livrable.
            </p>
            {/* Visual counter */}
            <div className="flex gap-2 flex-wrap">
              {Array.from({ length: 15 }).map((_, i) => (
                <div
                  key={i}
                  className="h-3 w-3 rounded-sm"
                  style={{
                    backgroundColor: i < 9 ? PRIMARY : "rgba(255,255,255,0.1)",
                  }}
                />
              ))}
            </div>
            <p className="mt-3 font-mono text-xs text-white/35">9/15 protocoles livres ce mois</p>
          </motion.div>

          {/* Guarantee */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="rounded-2xl border border-white/10 bg-[#0a0a0a] p-8"
          >
            <div className="mb-4 flex items-center gap-3">
              <Shield className="h-5 w-5" style={{ color: PRIMARY }} />
              <SectionLabel>Garantie resultats</SectionLabel>
            </div>
            <p className="mb-3 text-xl font-bold text-white leading-snug">
              Ton protocole refait gratuitement
            </p>
            <p className="text-sm leading-relaxed text-white/55">
              Si ton bilan mi-cycle ne montre aucune amelioration sur tes marqueurs cibles, on refait ton protocole gratuitement. Les 2 bilans sanguins inclus servent precisement a le mesurer objectivement.
            </p>
            <div className="mt-6 flex items-center gap-2">
              <Check className="h-4 w-4" style={{ color: PRIMARY }} />
              <p className="text-sm font-semibold text-white">Resultat mesurable ou protocole offert</p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// FAQ SECTION
// ============================================================================

function FAQSection() {
  return (
    <section className="py-24 px-6 bg-[#050505]">
      <div className="mx-auto max-w-3xl">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-14 text-center"
        >
          <SectionLabel>Questions frequentes</SectionLabel>
          <h2 className="mt-4 text-3xl font-bold text-white md:text-4xl">
            Tout ce que tu veux savoir
          </h2>
        </motion.div>

        <div>
          {FAQ.map((item, i) => (
            <FAQItem key={item.q} q={item.q} a={item.a} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// FINAL CTA
// ============================================================================

function FinalCTA() {
  return (
    <section className="py-32 px-6">
      <div className="mx-auto max-w-3xl text-center">
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <SectionLabel>Acces immediat</SectionLabel>
          <h2 className="mt-6 text-4xl font-bold text-white md:text-5xl leading-tight">
            Ton protocole peptides personnalise.{" "}
            <span style={{ color: PRIMARY }}>Livré en 48h.</span>
          </h2>
          <p className="mt-6 text-lg text-white/55 max-w-xl mx-auto">
            35 questions. Un protocole sur mesure. La source ou les peptides coutent 60-90% moins cher. 2 bilans sanguins inclus.
          </p>

          {/* Value breakdown */}
          <div className="mt-10 inline-flex flex-col items-center gap-2 rounded-2xl border border-white/10 bg-[#0a0a0a] px-10 py-7">
            <p className="font-mono text-xs uppercase tracking-wider text-white/40">Valeur totale</p>
            <p className="text-3xl font-bold text-white/30 line-through">697€</p>
            <p className="text-5xl font-bold text-white">299€</p>
            <p className="font-mono text-xs text-white/40">TVA incluse • Paiement securise</p>
          </div>

          <div className="mt-8 flex flex-col items-center gap-4">
            <CTAButton href="/peptides-engine" large>
              Acceder a mon protocole — 299€
            </CTAButton>
            <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-white/35">
              <span className="flex items-center gap-1.5">
                <Check className="h-3 w-3" style={{ color: PRIMARY }} />
                15 protocoles/mois max
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="h-3 w-3" style={{ color: PRIMARY }} />
                Livraison email 48h
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="h-3 w-3" style={{ color: PRIMARY }} />
                100% deductible du coaching
              </span>
            </div>
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
    <section className="relative overflow-hidden px-6 pb-24 pt-32">
      {/* Ambient glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: "radial-gradient(ellipse 60% 50% at 50% 0%, rgba(245,158,11,0.08) 0%, transparent 70%)",
        }}
      />
      {/* Grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(245,158,11,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(245,158,11,0.8) 1px, transparent 1px)`,
          backgroundSize: "40px 40px",
        }}
      />

      <div className="relative mx-auto max-w-4xl text-center">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/12 bg-[#0a0a0a] px-4 py-2"
        >
          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: PRIMARY }} />
          <span className="font-mono text-xs uppercase tracking-widest text-white/60">
            Protocole exclusif — 74 molecules disponibles
          </span>
        </motion.div>

        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-5xl font-bold leading-tight text-white md:text-6xl lg:text-7xl"
        >
          Ton protocole peptides.{" "}
          <span style={{ color: PRIMARY }}>Ta source secrete.</span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mx-auto mt-8 max-w-2xl text-lg leading-relaxed text-white/60 md:text-xl"
        >
          Reponds a 35 questions. Recois un protocole personnalise avec dosages exacts, guide de reconstitution calcule, calendrier hebdo, et acces direct a la source ou les peptides coutent{" "}
          <span className="font-semibold text-white">60-90% moins cher</span> que partout ailleurs.
        </motion.p>

        {/* Pricing */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-10 flex items-center justify-center gap-4"
        >
          <span className="text-2xl font-bold text-white/30 line-through">697€</span>
          <span className="text-5xl font-bold text-white">299€</span>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-8 flex flex-col items-center gap-4"
        >
          <CTAButton href="/peptides-engine" large>
            Acceder a mon protocole — 299€
          </CTAButton>

          <div className="flex flex-wrap items-center justify-center gap-5 text-xs text-white/35">
            <span className="flex items-center gap-1.5">
              <Clock className="h-3 w-3" />
              15 protocoles par mois maximum
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="h-3 w-3" style={{ color: PRIMARY }} />
              100% deductible du coaching Achzod
            </span>
          </div>
        </motion.div>

        {/* Trust indicators */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mt-14 flex flex-wrap items-center justify-center gap-6"
        >
          {[
            "Protocole verifie manuellement",
            "2 bilans sanguins inclus (198€)",
            "Support email 30 jours",
            "Garantie resultats",
          ].map((t) => (
            <div key={t} className="flex items-center gap-2 text-xs text-white/40">
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
    <div className="min-h-screen bg-black text-white">
      <Header />

      <main>
        <Hero />
        <PriceComparison />
        <DeliverablesSection />
        <HowItWorks />
        <ObjectivesSection />
        <CredibilityBar />
        <ScarcityGuarantee />
        <FAQSection />
        <FinalCTA />
      </main>

      <Footer />
    </div>
  );
}
