/**
 * APEXLABS - Peptides Engine
 * Protocole peptides personnalise — 149€
 */

import { useState } from "react";
import { Link } from "wouter";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
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
    q: "Les peptides sont-ils legaux en France ?",
    a: "Les peptides de recherche ne sont pas approuves pour usage humain en France et sont vendus a des fins de recherche uniquement. Ce protocole est informatif et educatif. Tu es responsable de te renseigner sur la legislation de ton pays avant tout achat ou usage.",
  },
  {
    q: "Pourquoi 2 bilans sanguins sont inclus ?",
    a: "Un bilan avant le protocole etablit ta baseline (IGF-1, glycemie, marqueurs hepatiques). Un bilan apres 8-12 semaines mesure l'impact reel. C'est la seule facon de savoir si ton stack fonctionne et si tes organes repondent bien. Sans bilan, tu navigues a l'aveugle.",
  },
  {
    q: "Comment se deroule la reconstitution des peptides ?",
    a: "Le guide de reconstitution fourni couvre chaque etape: quantite de BAC water (eau bacteriostatique), calcul de la concentration en mcg/UI, technique d'injection sous-cutanee, conditions de stockage (refrigerateur 2-8°C), et duree de conservation une fois reconstitue (generalement 28-30 jours).",
  },
  {
    q: "Combien de molecules vais-je recevoir dans mon protocole ?",
    a: "Entre 2 et 4 molecules selon tes objectifs et ton profil de risque. Le principe directeur est le minimum efficace: un stack surchargee augmente les couts, les risques et la complexite sans ameliorer les resultats. Chaque molecule est justifiee par rapport a ton objectif principal.",
  },
  {
    q: "Faut-il une experience prealable avec les peptides ?",
    a: "Non. Le questionnaire evalue ton niveau et le protocole est adapte en consequence. Si tu es debutant, les molecules choisies sont celles avec le meilleur profil tolerance/efficacite et les dosages retenus sont conservatives. Le guide de reconstitution ne presuppose aucune experience.",
  },
  {
    q: "Pourquoi Peptaura et pas un autre fournisseur ?",
    a: "Peptaura fournit un certificat d'analyse (COA) par lot, teste par un laboratoire tiers independant. Les prix sont 50-60% inferieurs aux revendeurs classiques. C'est le fournisseur que j'utilise personnellement et que je recommande depuis plusieurs annees a ma communaute.",
  },
  {
    q: "Combien de temps avant de recevoir mon protocole ?",
    a: "Apres avoir complete le questionnaire de 35 questions, ton protocole est genere et livre par email sous 48h ouvrables. Tu recois le document peptides, le guide de reconstitution, les 2 codes Blood Analysis, et les liens Peptaura directement dans ta boite mail.",
  },
  {
    q: "Est-ce que ce protocole remplace un suivi medical ?",
    a: "Non. C'est un guide educatif base sur la litterature scientifique et les pratiques de la communaute de recherche sur les peptides. Si tu as une pathologie ou prends des medicaments, consulte un medecin avant d'utiliser des peptides. Les 2 bilans sanguins inclus sont la pour securiser ta demarche, pas pour remplacer un avis medical.",
  },
];

const CREDIBILITY = [
  {
    stat: "500+",
    label: "bilans sanguins analyses",
    desc: "Je lis des analyses de sang tous les jours.",
  },
  {
    stat: "86K",
    label: "abonnes YouTube",
    desc: "Ma communaute me fait confiance depuis des annees.",
  },
  {
    stat: "12",
    label: "masterclass peptides publiees",
    desc: "BPC-157, CJC-1295, TB-500... tout couvert en profondeur.",
  },
  {
    stat: "COA",
    label: "fournisseur verifie",
    desc: "Chaque lot teste avec certificat d'analyse independant.",
  },
  {
    stat: "min",
    label: "reduction des risques",
    desc: "Le minimum efficace, pas le maximum dangereux.",
  },
  {
    stat: "60%",
    label: "moins cher",
    desc: "Prix Peptaura vs revendeurs classiques sur le marche.",
  },
];

const STEPS = [
  {
    step: "01",
    icon: Brain,
    title: "Reponds au questionnaire",
    desc: "35 questions sur tes objectifs, ton historique, ta biologie et ta tolerance. Environ 10-15 minutes.",
    time: "10-15 min",
  },
  {
    step: "02",
    icon: TestTube,
    title: "Ton protocole est genere",
    desc: "Molecules retenues, dosages en mcg/jour, timing d'injection, reconstitution, et liens fournisseur.",
    time: "48h ouvrables",
  },
  {
    step: "03",
    icon: Syringe,
    title: "Recois tout par email",
    desc: "Protocole complet + 2 codes Blood Analysis offerts pour valider ta baseline et tes resultats.",
    time: "Email direct",
  },
];

const DELIVERABLES = [
  {
    icon: Syringe,
    title: "Protocole peptides",
    desc: "2 a 4 molecules, dosages precis en mcg/jour, timing d'injection, cycle et post-cycle.",
  },
  {
    icon: TestTube,
    title: "Guide reconstitution",
    desc: "BAC water, calcul concentration, technique sous-cutanee, stockage refrigerateur.",
  },
  {
    icon: Activity,
    title: "2 Blood Analyses incluses",
    desc: "Valeur 198 EUR. Bilans avant et apres pour mesurer l'impact reel sur tes biomarqueurs.",
  },
  {
    icon: Shield,
    title: "Liens Peptaura verifies",
    desc: "Acces direct au fournisseur COA. Prix -60% vs revendeurs. Lots verifies par labo tiers.",
  },
  {
    icon: Zap,
    title: "Guide effets secondaires",
    desc: "Signaux d'alerte, cas de reduction de dose, et quand stopper immediatement.",
  },
  {
    icon: CheckCircle2,
    title: "Stack supplements complementaire",
    desc: "Nutrients de support (zinc, magnesium, vitamine D) pour optimiser la reponse peptidique.",
  },
];

const OBJECTIVES = [
  {
    icon: Heart,
    title: "Recuperation & guerison",
    peptides: "BPC-157, TB-500",
    detail: "Reparation tendineuse, cicatrisation, reduction inflammation chronique.",
  },
  {
    icon: Zap,
    title: "GH & anti-aging",
    peptides: "CJC-1295, Ipamorelin",
    detail: "Stimulation naturelle de la GH, composition corporelle, sommeil profond.",
  },
  {
    icon: Flame,
    title: "Perte de graisse",
    peptides: "Tesamorelin, AOD-9604",
    detail: "Lipolyse ciblée, reduction graisse viscerale, preservation musculaire.",
  },
  {
    icon: Moon,
    title: "Sommeil profond",
    peptides: "DSIP, Epitalon",
    detail: "Qualite du sommeil, recuperation nocturne, reset circadien.",
  },
  {
    icon: Brain,
    title: "Performance cognitive",
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
    title: "Peau & cheveux",
    peptides: "GHK-Cu",
    detail: "Synthese collagene, epaississement cheveux, cicatrisation cutanee.",
  },
  {
    icon: Zap,
    title: "Endurance",
    peptides: "SS-31",
    detail: "Protection mitochondriale, reduction stress oxydatif, performance cardio.",
  },
];

const CHECKLIST = [
  "Protocole 2-4 molecules avec dosages exacts (mcg/jour)",
  "Guide de reconstitution etape par etape",
  "2 Blood Analyses incluses (valeur 198 EUR)",
  "Liens Peptaura COA verifie (prix -60%)",
  "Timing d'injection et duree du cycle",
  "Guide effets secondaires et signaux d'alerte",
  "Stack supplements complementaire",
  "Support email 30 jours post-livraison",
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
      transition={{ delay: index * 0.05 }}
      className="border-b border-white/10"
    >
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-start justify-between gap-8 py-7 text-left transition-colors hover:text-amber-400"
      >
        <h3 className="text-base font-semibold text-white">{q}</h3>
        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.3 }}
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
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <p className="pb-7 text-base leading-relaxed text-white/60">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ============================================================================
// BADGE PILL
// ============================================================================

function BadgePill({ children }: { children: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-white/15 bg-[#0a0a0a] px-3 py-1 text-xs text-white/70">
      {children}
    </span>
  );
}

// ============================================================================
// HERO VISUAL — Vial Reconstitution Animation
// ============================================================================

function VialReconstitutionVisual() {
  return (
    <div className="relative w-full h-full bg-[#0a0a0a] rounded-xl border border-white/10 overflow-hidden flex flex-col items-center justify-center gap-6">
      {/* Ambient glow */}
      <div
        className="absolute inset-0"
        style={{
          background: "radial-gradient(ellipse at center, rgba(245,158,11,0.10) 0%, transparent 65%)",
        }}
      />
      {/* Grid */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `linear-gradient(rgba(245,158,11,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(245,158,11,0.6) 1px, transparent 1px)`,
          backgroundSize: "24px 24px",
        }}
      />

      {/* Vial group */}
      <div className="relative z-10 flex items-end gap-8">
        {/* BAC water vial */}
        <motion.div
          className="flex flex-col items-center gap-2"
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
        >
          <div className="relative w-12 h-28 rounded-t-full rounded-b-sm overflow-hidden border border-amber-500/30 bg-black/60">
            {/* Fill level */}
            <motion.div
              className="absolute bottom-0 left-0 right-0"
              style={{ backgroundColor: "rgba(245,158,11,0.15)" }}
              animate={{ height: ["55%", "45%", "55%"] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            />
            {/* Shimmer */}
            <motion.div
              className="absolute left-1 w-1.5 rounded-full bg-white/20"
              style={{ bottom: "10%" }}
              animate={{ height: ["50%", "40%", "50%"], opacity: [0.4, 0.7, 0.4] }}
              transition={{ duration: 3, repeat: Infinity }}
            />
            {/* Cap */}
            <div
              className="absolute top-0 left-0 right-0 h-4 rounded-t-full"
              style={{ backgroundColor: "rgba(245,158,11,0.4)" }}
            />
          </div>
          <span className="text-[10px] font-mono" style={{ color: PRIMARY }}>BAC WATER</span>
        </motion.div>

        {/* Arrow / transfer pulse */}
        <motion.div
          className="mb-6 flex flex-col gap-1 items-center"
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.2, repeat: Infinity }}
        >
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: PRIMARY }}
              animate={{ opacity: [0.2, 1, 0.2] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
            />
          ))}
        </motion.div>

        {/* Peptide vial */}
        <motion.div
          className="flex flex-col items-center gap-2"
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
        >
          <div className="relative w-12 h-28 rounded-t-full rounded-b-sm overflow-hidden border border-amber-500/40 bg-black/70">
            {/* Powder residue + reconstituting fill */}
            <motion.div
              className="absolute bottom-0 left-0 right-0"
              style={{ background: "linear-gradient(to top, rgba(245,158,11,0.35), rgba(245,158,11,0.08))" }}
              animate={{ height: ["15%", "60%", "15%"] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
            />
            {/* Bubbles */}
            {[0, 1].map((i) => (
              <motion.div
                key={i}
                className="absolute w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: "rgba(245,158,11,0.5)", left: i === 0 ? "25%" : "55%" }}
                animate={{ bottom: ["5%", "75%"], opacity: [0.8, 0] }}
                transition={{ duration: 2, repeat: Infinity, delay: i * 0.7, ease: "easeOut" }}
              />
            ))}
            {/* Cap */}
            <div
              className="absolute top-0 left-0 right-0 h-4 rounded-t-full"
              style={{ backgroundColor: "rgba(245,158,11,0.55)" }}
            />
          </div>
          <span className="text-[10px] font-mono" style={{ color: PRIMARY }}>PEPTIDE</span>
        </motion.div>

        {/* Syringe */}
        <motion.div
          className="flex flex-col items-center gap-2"
          animate={{ y: [0, -3, 0], rotate: [0, -4, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
        >
          <div
            className="relative w-5 h-28 rounded-t-sm rounded-b-sm border overflow-hidden bg-black/50 flex flex-col"
            style={{ borderColor: "rgba(245,158,11,0.35)" }}
          >
            {/* Plunger */}
            <motion.div
              className="absolute top-0 left-0 right-0 h-3"
              style={{ backgroundColor: "rgba(245,158,11,0.5)" }}
              animate={{ top: ["0%", "30%", "0%"] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            />
            {/* Graduation marks */}
            {[20, 35, 50, 65, 80].map((pct) => (
              <div
                key={pct}
                className="absolute right-0 w-2 h-px bg-amber-500/30"
                style={{ top: `${pct}%` }}
              />
            ))}
            {/* Fill */}
            <motion.div
              className="absolute bottom-0 left-0 right-0"
              style={{ backgroundColor: "rgba(245,158,11,0.2)" }}
              animate={{ height: ["10%", "45%", "10%"] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            />
          </div>
          <span className="text-[10px] font-mono" style={{ color: PRIMARY }}>SERINGUE</span>
        </motion.div>
      </div>

      {/* Status bar */}
      <div className="relative z-10 flex flex-col items-center gap-1">
        <motion.p
          className="text-xs font-mono font-semibold tracking-widest"
          style={{ color: PRIMARY }}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.8, repeat: Infinity }}
        >
          RECONSTITUTION EN COURS
        </motion.p>
        <div className="w-40 h-1 rounded-full bg-white/10 overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: PRIMARY }}
            animate={{ width: ["0%", "100%", "0%"] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
        <p className="text-[10px] text-white/40 font-mono mt-1">DOSAGE CALCULE PAR OBJECTIF</p>
      </div>

      {/* Corner decorations */}
      <div className="absolute top-4 left-4 text-xs font-mono text-white/20">PE-PROTOCOL</div>
      <div className="absolute top-4 right-4 text-xs font-mono" style={{ color: `${PRIMARY}80` }}>
        APEXLABS
      </div>
    </div>
  );
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function PeptidesEngineOffer() {
  const { scrollYProgress } = useScroll();
  const heroGlow = useTransform(scrollYProgress, [0, 0.25], [0.9, 0.2]);

  const ctaHref = "/peptides-engine";
  const [hoveredObj, setHoveredObj] = useState<number | null>(null);

  const trustRow = ["Fournisseur verifie COA", "60% moins cher", "500+ bilans analyses"];

  return (
    <div className="min-h-screen bg-black text-white">
      <Header />

      {/* ================================================================ */}
      {/* HERO */}
      {/* ================================================================ */}
      <section className="relative overflow-hidden">
        <motion.div
          className="pointer-events-none absolute inset-0"
          style={{
            opacity: heroGlow,
            background: "radial-gradient(circle at 50% 0%, rgba(245,158,11,0.10) 0%, transparent 55%)",
          }}
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-25"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(15, 23, 42, 0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(15, 23, 42, 0.06) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />

        <div className="relative mx-auto max-w-7xl px-6 pt-20 pb-16">
          <div className="grid gap-12 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="space-y-7"
            >
              <div className="flex flex-wrap items-center gap-2">
                <BadgePill>NOUVEAU</BadgePill>
                <BadgePill>PERSONNALISE</BadgePill>
                <BadgePill>2 BILANS SANGUINS INCLUS</BadgePill>
              </div>

              <h1 className="text-5xl md:text-7xl font-semibold tracking-tight leading-[0.95]">
                Peptides Engine.
                <br />
                <span style={{ color: PRIMARY }}>Ton protocole sur-mesure.</span>
              </h1>

              <p className="text-white/70 text-lg leading-relaxed max-w-2xl">
                Reponds a 35 questions. Recois ton stack peptides personnalise avec dosages exacts, guide de
                reconstitution, et 2 bilans sanguins inclus pour verifier que tout fonctionne.
              </p>

              <div className="flex flex-wrap items-center gap-5 text-sm text-white/50">
                {trustRow.map((item) => (
                  <div key={item} className="inline-flex items-center gap-2">
                    <Check className="h-4 w-4" style={{ color: PRIMARY }} />
                    <span>{item}</span>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Link href={ctaHref}>
                  <a
                    className="group inline-flex items-center gap-3 rounded-full px-7 py-3 text-sm font-semibold text-white transition-all hover:scale-[1.02]"
                    style={{ backgroundColor: PRIMARY }}
                  >
                    Obtenir mon protocole — 149 EUR
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </a>
                </Link>
              </div>

              <div className="pt-3 text-xs text-white/40">
                Paiement securise (Stripe) · Livraison par email sous 48h · Valeur totale: 347 EUR
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, ease: "easeOut", delay: 0.1 }}
              className="h-[360px] md:h-[440px]"
            >
              <VialReconstitutionVisual />
            </motion.div>
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* WHY ACHZOD — CREDIBILITY */}
      {/* ================================================================ */}
      <section className="bg-[#0a0a0a] py-24 px-6">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <p
              className="text-sm font-medium tracking-[0.2em] uppercase"
              style={{ color: PRIMARY }}
            >
              POURQUOI ME FAIRE CONFIANCE
            </p>
            <h2 className="mt-5 text-4xl md:text-5xl font-semibold tracking-tight">
              Pas un vendeur de peptides.
              <br />
              Un coach qui connait la science.
            </h2>
          </div>

          <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {CREDIBILITY.map((item, idx) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, ease: "easeOut", delay: idx * 0.06 }}
                className="rounded-xl border border-white/10 bg-black p-8 hover:border-amber-500/25 transition-colors"
              >
                <p
                  className="text-3xl font-bold tracking-tight"
                  style={{ color: PRIMARY }}
                >
                  {item.stat}
                </p>
                <p className="mt-1 text-base font-semibold text-white">{item.label}</p>
                <p className="mt-3 text-sm text-white/60 leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* HOW IT WORKS — 3 STEPS */}
      {/* ================================================================ */}
      <section className="py-24 px-6">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <p
              className="text-sm font-medium tracking-[0.2em] uppercase"
              style={{ color: PRIMARY }}
            >
              Comment ca marche
            </p>
            <h2 className="mt-5 text-4xl md:text-5xl font-semibold tracking-tight">3 etapes. C'est tout.</h2>
          </div>

          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {STEPS.map((item, idx) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, ease: "easeOut", delay: idx * 0.06 }}
                className="relative overflow-hidden rounded-xl border border-white/10 bg-[#0a0a0a] p-10"
              >
                <div className="absolute right-4 top-2 text-7xl font-semibold text-white/[0.05]">
                  {item.step}
                </div>
                <div className="relative z-10">
                  <div className="h-12 w-12 rounded-lg border border-white/10 bg-black flex items-center justify-center">
                    <item.icon className="h-6 w-6" style={{ color: PRIMARY }} />
                  </div>
                  <p className="mt-6 text-2xl font-semibold tracking-tight">{item.title}</p>
                  <p className="mt-3 text-white/70 leading-relaxed">{item.desc}</p>
                  <p className="mt-6 text-sm text-white/40">Duree: {item.time}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* WHAT YOU GET — DELIVERABLES */}
      {/* ================================================================ */}
      <section className="bg-[#0a0a0a] py-24 px-6">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <p
              className="text-sm font-medium tracking-[0.2em] uppercase"
              style={{ color: PRIMARY }}
            >
              CE QUE TU RECOIS
            </p>
            <h2 className="mt-5 text-4xl md:text-5xl font-semibold tracking-tight">Tout ce qu'il faut. Rien de superflu.</h2>
            <p className="mt-4 text-white/50 max-w-2xl mx-auto">
              Six livrables concrets. Pas une note de cours, pas un PDF genere automatiquement. Un protocole actionnable.
            </p>
          </div>

          <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {DELIVERABLES.map((item, idx) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, ease: "easeOut", delay: idx * 0.06 }}
                className="rounded-xl border border-white/10 bg-black p-8 hover:border-amber-500/20 transition-colors group"
              >
                <div
                  className="h-11 w-11 rounded-lg border border-white/10 bg-[#0a0a0a] flex items-center justify-center group-hover:border-amber-500/30 transition-colors"
                >
                  <item.icon className="h-5 w-5" style={{ color: PRIMARY }} />
                </div>
                <p className="mt-5 text-lg font-semibold tracking-tight">{item.title}</p>
                <p className="mt-3 text-sm text-white/60 leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* OBJECTIVES GRID */}
      {/* ================================================================ */}
      <section className="py-24 px-6">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <p
              className="text-sm font-medium tracking-[0.2em] uppercase"
              style={{ color: PRIMARY }}
            >
              OBJECTIFS
            </p>
            <h2 className="mt-5 text-4xl md:text-5xl font-semibold tracking-tight">
              Quel est ton objectif ?
            </h2>
            <p className="mt-4 text-white/50 max-w-2xl mx-auto">
              Le questionnaire identifie ta priorite. Le protocole est construit autour de 1 objectif principal.
            </p>
          </div>

          <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {OBJECTIVES.map((obj, idx) => (
              <motion.div
                key={obj.title}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, ease: "easeOut", delay: idx * 0.05 }}
                onMouseEnter={() => setHoveredObj(idx)}
                onMouseLeave={() => setHoveredObj(null)}
                className="relative rounded-xl border border-white/10 bg-[#0a0a0a] p-6 cursor-default overflow-hidden transition-all hover:border-amber-500/30"
                style={{
                  boxShadow: hoveredObj === idx ? `0 0 20px rgba(245,158,11,0.08)` : "none",
                }}
              >
                <div className="flex items-start justify-between">
                  <div
                    className="h-10 w-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}
                  >
                    <obj.icon className="h-5 w-5" style={{ color: PRIMARY }} />
                  </div>
                </div>
                <p className="mt-4 text-base font-semibold tracking-tight">{obj.title}</p>
                <p
                  className="mt-1.5 text-xs font-mono tracking-wide"
                  style={{ color: PRIMARY }}
                >
                  {obj.peptides}
                </p>

                <AnimatePresence>
                  {hoveredObj === idx && (
                    <motion.p
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 4 }}
                      transition={{ duration: 0.2 }}
                      className="mt-3 text-xs text-white/55 leading-relaxed"
                    >
                      {obj.detail}
                    </motion.p>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* PRICING CARD */}
      {/* ================================================================ */}
      <section className="bg-[#0a0a0a] py-24 px-6">
        <div className="mx-auto max-w-lg">
          <div className="text-center mb-10">
            <p
              className="text-sm font-medium tracking-[0.2em] uppercase"
              style={{ color: PRIMARY }}
            >
              TARIF
            </p>
            <h2 className="mt-5 text-4xl md:text-5xl font-semibold tracking-tight">
              Un protocole. Un prix.
            </h2>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="rounded-2xl border bg-black p-8 md:p-10"
            style={{
              borderColor: "rgba(245,158,11,0.35)",
              boxShadow: "0 0 40px rgba(245,158,11,0.07), 0 0 0 1px rgba(245,158,11,0.10)",
            }}
          >
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-mono tracking-[0.25em] text-white/50">PEPTIDES ENGINE</p>
                <div className="mt-3 flex items-end gap-2">
                  <span className="text-5xl font-bold tracking-tight" style={{ color: PRIMARY }}>
                    149
                  </span>
                  <span className="text-2xl font-semibold text-white/80 mb-1">EUR</span>
                </div>
                <p className="mt-1 text-sm text-white/40">paiement unique</p>
              </div>
              <div
                className="rounded-full px-3 py-1 text-xs font-semibold"
                style={{ backgroundColor: "rgba(245,158,11,0.12)", color: PRIMARY, border: "1px solid rgba(245,158,11,0.3)" }}
              >
                MEILLEURE VALEUR
              </div>
            </div>

            {/* Crossed out value */}
            <p className="mt-4 text-sm text-white/40">
              Valeur totale:{" "}
              <span className="line-through">347 EUR</span>
            </p>

            {/* Divider */}
            <div className="my-7 border-t border-white/10" />

            {/* Checklist */}
            <ul className="space-y-3.5">
              {CHECKLIST.map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-white/80">
                  <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" style={{ color: PRIMARY }} />
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            {/* CTA */}
            <div className="mt-8">
              <Link href={ctaHref}>
                <a
                  className="group flex w-full items-center justify-center gap-3 rounded-full py-4 text-sm font-semibold text-white transition-all hover:scale-[1.01]"
                  style={{ backgroundColor: PRIMARY }}
                >
                  Obtenir mon protocole — 149 EUR
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </a>
              </Link>
            </div>

            {/* Fine print */}
            <p className="mt-4 text-center text-xs text-white/35">
              100% deductible du coaching · Paiement securise Stripe
            </p>
          </motion.div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* FAQ */}
      {/* ================================================================ */}
      <section className="py-24 px-6">
        <div className="mx-auto max-w-3xl">
          <div className="text-center">
            <p
              className="text-sm font-medium tracking-[0.2em] uppercase"
              style={{ color: PRIMARY }}
            >
              FAQ
            </p>
            <h2 className="mt-5 text-4xl md:text-5xl font-semibold tracking-tight">Questions frequentes</h2>
          </div>

          <div className="mt-12 rounded-xl border border-white/10 bg-[#0a0a0a] px-8">
            {FAQ.map((item, idx) => (
              <FAQItem key={item.q} q={item.q} a={item.a} index={idx} />
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* FINAL CTA */}
      {/* ================================================================ */}
      <section className="bg-[#0a0a0a] py-24 px-6">
        <div className="mx-auto max-w-4xl text-center">
          <motion.blockquote
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-2xl md:text-3xl font-medium leading-snug text-white/90 tracking-tight"
          >
            "Tu sais deja ce que tu veux prendre. Ce qu'il te manque, c'est le dosage exact
            <br className="hidden md:block" />
            et la certitude que tu ne fais pas de connerie."
          </motion.blockquote>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mt-10"
          >
            <Link href={ctaHref}>
              <a
                className="group inline-flex items-center gap-3 rounded-full px-8 py-4 text-sm font-semibold text-white transition-all hover:scale-[1.02]"
                style={{ backgroundColor: PRIMARY }}
              >
                Obtenir mon protocole — 149 EUR
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
              </a>
            </Link>
          </motion.div>

          <p className="mt-5 text-xs text-white/35">
            Livraison par email sous 48h · 2 bilans sanguins inclus · Paiement securise Stripe
          </p>
        </div>
      </section>

      <Footer />
    </div>
  );
}
