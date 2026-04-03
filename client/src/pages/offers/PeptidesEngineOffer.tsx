/**
 * APEXLABS - Peptides Engine Offer
 * Protocole peptides personnalise — 299€
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
    q: "Pourquoi 299€ au lieu de 399€ ?",
    a: "C'est le prix de lancement. Le protocole inclut 2 blood analyses (valeur 198€), l'acces direct a la source a prix labo, et un suivi complet. A 299€, c'est un investissement qui se rembourse en une seule commande de peptides au bon prix. Et si tu prends un coaching 12 semaines, 150€ sont deduits de ta formule.",
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
      className={`relative w-full max-w-lg aspect-square md:aspect-[4/5] rounded-3xl border bg-black/50 backdrop-blur-2xl overflow-hidden flex items-center justify-center group ${colorMap[color]}`}
    >
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:1.5rem_1.5rem]" />
      <motion.div
        className={`absolute top-0 left-0 w-full h-[2px] z-20 ${scanlineMap[color]}`}
        animate={{ y: ["0%", "400%", "0%"] }}
        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
      />

      {children}

      <div className="absolute top-4 left-4 bg-black/80 backdrop-blur-md border border-white/10 rounded-lg p-3 flex flex-col gap-1 z-30">
        <div className="flex items-center gap-2 mb-1">
          <div className={`w-2 h-2 rounded-full animate-pulse ${dotMap[color]}`} />
          <span className={`text-[10px] font-mono uppercase tracking-wider ${textMap[color]}`}>{title}</span>
        </div>
        <span className="text-3xl font-bold text-white tracking-tighter">{value}</span>
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
        <div className="absolute bottom-4 left-4 bg-black/80 backdrop-blur-md border border-cyan-500/30 rounded p-2">
          <span className="text-[10px] text-cyan-400 font-mono uppercase">Analyse: <span className="text-white font-bold">MULTI-CIBLES</span></span>
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
        <div className="absolute bottom-4 right-4 bg-black/80 backdrop-blur-md border border-green-500/30 rounded p-2 flex flex-col items-end">
          <span className="text-[10px] text-green-400 font-mono uppercase">Statut Fournisseur</span>
          <span className="text-sm font-bold text-white">VÉRIFIÉ ACHZOD</span>
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
        <div className="absolute bottom-4 left-4 bg-black/80 backdrop-blur-md border border-yellow-500/30 rounded p-2">
          <span className="text-[10px] text-yellow-400 font-mono uppercase">Calculateur: <span className="text-white font-bold">INTÉGRÉ</span></span>
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
        <div className="absolute bottom-4 right-4 bg-black/80 backdrop-blur-md border border-red-500/30 rounded p-2 flex flex-col items-end">
          <span className="text-[10px] text-red-400 font-mono uppercase">Saturation</span>
          <span className="text-sm font-bold text-white">OPTIMALE</span>
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
          animate={{
            cx: [10, 20, 30, 50, 70, 90],
            cy: [90, 35, 60, 80, 85, 90],
          }}
          transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
        />
        <motion.circle cx="10" cy="90" r="2" fill="#06b6d4" className="drop-shadow-[0_0_5px_#06b6d4]"
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
    <section className="py-24 px-6 bg-[#050505]">
      <div className="mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16 text-center"
        >
          <SectionLabel>Ce que contient ton protocole</SectionLabel>
          <h2 className="mt-4 text-3xl font-bold text-white md:text-4xl">
            La science derriere chaque decision
          </h2>
          <p className="mt-4 text-white/50 max-w-2xl mx-auto">
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
                className={`relative flex flex-col ${card.reverse ? "lg:flex-row-reverse" : "lg:flex-row"} items-center gap-8 lg:gap-14 p-8 lg:p-12 rounded-3xl bg-black/40 backdrop-blur-sm border ${theme.border} ${theme.shadow} ${theme.hoverBorder} transition-all duration-500 overflow-hidden`}
              >
                {/* Background gradient */}
                <div className={`absolute inset-0 bg-gradient-to-br ${theme.gradient} to-transparent opacity-40 pointer-events-none`} />

                {/* Text side */}
                <div className="flex-1 flex flex-col items-center lg:items-start text-center lg:text-left relative z-10">
                  <div className={`w-14 h-14 rounded-2xl ${theme.iconBg} border ${theme.border} flex items-center justify-center mb-6 ${theme.iconColor}`}>
                    <IconComp size={28} />
                  </div>
                  <h3 className="text-2xl md:text-3xl font-black mb-4 tracking-tight uppercase text-white">
                    {card.title}
                  </h3>
                  <p className="text-base text-white/65 leading-relaxed">
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
    <section className="py-20 px-6 bg-[#060606]">
      <div className="mx-auto max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <p className="text-xs font-mono uppercase tracking-[0.3em] text-green-500 mb-3">Transparence totale</p>
          <h2 className="text-2xl md:text-3xl font-black text-white mb-3">
            Chaque lot est teste par un labo independant
          </h2>
          <p className="text-white/50 text-sm max-w-xl mx-auto">
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
            className="group rounded-2xl border border-green-900/30 bg-black/40 p-4 hover:border-green-500/40 transition-all overflow-hidden"
          >
            <img
              src="https://www.peptaura.com/coas/0f216e6b9a6c700dcf11bb051f6f7acf31ff0ac79d0230a572e2ee07f3558fbd.png"
              alt="Exemple COA - Certificat d'Analyse peptide"
              className="w-full rounded-lg opacity-80 group-hover:opacity-100 transition-opacity"
              loading="lazy"
            />
            <p className="text-center text-xs text-white/40 mt-3 font-mono">Exemple de COA (cliquer pour agrandir)</p>
          </motion.a>

          <motion.a
            href="https://www.peptaura.com/coas/32001f878ccdf779123172f705efb48db899480894340e0e32c2cef3bcc621f5.pdf"
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="group rounded-2xl border border-green-900/30 bg-black/40 p-6 hover:border-green-500/40 transition-all flex flex-col items-center justify-center gap-4"
          >
            <div className="w-20 h-20 rounded-2xl bg-green-500/10 flex items-center justify-center">
              <ExternalLink className="w-8 h-8 text-green-500" />
            </div>
            <div className="text-center">
              <p className="text-white font-bold mb-1">COA complet (PDF)</p>
              <p className="text-white/40 text-xs">Rapport HPLC avec chromatogramme, purete, identite moleculaire</p>
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
              <SectionLabel>Gage de qualite</SectionLabel>
            </div>
            <p className="mb-3 text-xl font-bold text-white leading-snug">
              Je construis ton protocole personnellement
            </p>
            <p className="text-sm leading-relaxed text-white/55">
              C'est moi, Achzod, qui analyse ton profil et qui valide chaque protocole avant de te l'envoyer. Les 2 bilans sanguins inclus te permettent de suivre tes marqueurs objectivement et de me contacter pour ajuster si besoin.
            </p>
            <div className="mt-6 flex items-center gap-2">
              <Check className="h-4 w-4" style={{ color: PRIMARY }} />
              <p className="text-sm font-semibold text-white">Mon expertise, ton suivi mesurable</p>
            </div>
          </motion.div>
        </div>

        {/* Coaching combo */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="mt-6 rounded-2xl border border-amber-500/20 bg-[#0a0a0a] p-8"
        >
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            <div className="flex-1">
              <p className="text-xs font-mono uppercase tracking-widest text-amber-500 mb-2">Peptides + Coaching</p>
              <p className="text-xl font-bold text-white mb-3">150€ deduits de ton coaching Elite/Private Lab (8 ou 12 semaines)</p>
              <p className="text-sm text-white/55 leading-relaxed mb-4">
                Tu peux commander tes peptides maintenant, prendre un coaching Achzod, et commencer le suivi une fois que tu as recu tes peptides. Pas besoin d'attendre pour s'organiser.
              </p>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-white/70">
                  <Check className="h-3.5 w-3.5 flex-shrink-0" style={{ color: PRIMARY }} />
                  <span>Commande tes peptides sur Peptaura</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-white/70">
                  <Check className="h-3.5 w-3.5 flex-shrink-0" style={{ color: PRIMARY }} />
                  <span>Prends ta formule coaching Elite ou Private Lab (8 ou 12 semaines)</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-white/70">
                  <Check className="h-3.5 w-3.5 flex-shrink-0" style={{ color: PRIMARY }} />
                  <span>Commence le coaching des que tu recois tes peptides</span>
                </div>
              </div>
            </div>
            <a
              href="https://www.achzodcoaching.com/formules-coaching"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-bold text-sm text-black whitespace-nowrap"
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
    <section className="py-20 px-6 bg-[#050505]">
      <div className="mx-auto max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <p className="text-xs font-mono uppercase tracking-[0.3em] mb-3" style={{ color: PRIMARY }}>Avis clients</p>
          <h2 className="text-2xl md:text-3xl font-black text-white mb-2">
            Ce qu'en pensent mes clients
          </h2>
          <div className="flex items-center justify-center gap-1 mb-2">
            {[1,2,3,4,5].map(i => (
              <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
            ))}
            <span className="text-white/50 text-sm ml-2">{reviews.length} avis</span>
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
              className="bg-white/[0.03] border border-white/10 rounded-xl p-5"
            >
              <div className="flex items-center gap-1 mb-3">
                {[1,2,3,4,5].map(s => (
                  <Star key={s} className={`w-3.5 h-3.5 ${s <= r.rating ? "fill-yellow-400 text-yellow-400" : "text-white/20"}`} />
                ))}
              </div>
              <p className="text-white/70 text-sm leading-relaxed mb-3">
                "{r.comment?.length > 120 ? r.comment.slice(0, 120) + "..." : r.comment}"
              </p>
              <p className="text-white/30 text-xs font-mono">
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
    <section className="py-16 px-6 bg-[#0a0a0a]">
      <div className="mx-auto max-w-5xl">
        {/* Garantie reponse */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-white/[0.02] border border-white/10 rounded-2xl p-8 mb-8 text-center"
        >
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center mx-auto mb-4">
            <Mail className="w-7 h-7 text-amber-500" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Je reponds personnellement a chaque message</h3>
          <p className="text-white/50 text-sm max-w-lg mx-auto mb-4">
            Une question sur ton protocole, un doute sur un dosage, besoin d'un ajustement ? Ecris-moi directement.
            Je reponds sous 24h, personnellement. Pas un assistant, pas un bot. Moi.
          </p>
          <a href="mailto:coaching@achzodcoaching.com" className="text-amber-500 font-mono text-sm hover:underline">
            coaching@achzodcoaching.com
          </a>
        </motion.div>

        {/* Logos de confiance */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="flex flex-wrap items-center justify-center gap-8 text-white/30 text-xs font-mono uppercase tracking-widest"
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

          {/* Price */}
          <div className="mt-10 inline-flex flex-col items-center gap-2 rounded-2xl border border-white/10 bg-[#0a0a0a] px-10 py-7">
            <p className="font-mono text-xs uppercase tracking-widest text-amber-500 mb-1">Prix de lancement</p>
            <div className="flex items-center gap-3">
              <p className="text-2xl font-bold text-white/30 line-through">399€</p>
              <p className="text-5xl font-bold text-white">299€</p>
            </div>
            <p className="font-mono text-xs text-white/40">TVA incluse · Paiement securise</p>
            <motion.p
              animate={{ opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="font-mono text-xs font-bold mt-2 tracking-wide"
              style={{ color: "#00E5FF" }}
            >150€ deduits de tout coaching Elite/Private Lab 8 ou 12 semaines</motion.p>
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
                2 bilans sanguins inclus
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
            Protocole exclusif · 74 molecules disponibles
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
          <span className="text-2xl font-bold text-white/30 line-through">399€</span>
          <span className="text-5xl font-bold text-white">299€</span>
          <span className="text-xs font-mono uppercase tracking-widest text-amber-500">Prix de lancement</span>
        </motion.div>
        <motion.p
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="mt-3 font-mono text-xs font-bold text-center tracking-wide"
          style={{ color: "#00E5FF" }}
        >150€ deduits de tout coaching Elite/Private Lab 8 ou 12 semaines</motion.p>

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
              Support email 30 jours
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
            "Qualite verifiee manuellement",
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

      <Footer />
    </div>
  );
}
