import React, { useMemo, useRef, useState, useEffect } from "react";
import { Link } from "wouter";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowRight, Beaker, Check, FileText, FlaskConical, Shield, Target, Upload, Zap, Activity, Dna, Flame } from "lucide-react";
import { AnimatedReportPreview } from "@/components/AnimatedReportPreview";
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
    q: "Pourquoi payer 99\u20ac alors que mon labo me donne des resultats gratuits ?",
    a: "Ton labo te donne des ranges \"normaux\" bases sur la moyenne de la population — y compris des gens malades. Ici, j'utilise des ranges optimaux de performance et de longevite issus de la litterature scientifique (Huberman, Attia, Examine.com). Tu recois une lecture par systeme (hormones, thyroide, metabolisme, inflammation, vitamines, foie/rein) avec un plan d'action priorise.",
  },
  {
    q: "Combien de biomarqueurs sont analyses ?",
    a: "39 biomarqueurs repartis sur 6 panels : hormones anaboliques (testosterone, cortisol, IGF-1...), thyroide (TSH, T3, T4, anti-TPO), metabolisme et lipides (glycemie, HbA1c, insuline, ApoB, Lp(a)), inflammation et fer (CRP-us, ferritine, homocysteine), vitamines et mineraux (vitamine D, B12, magnesium, zinc), et hepatique/renal (ALT, AST, creatinine, eGFR).",
  },
  {
    q: "Est-ce que ca remplace un medecin ?",
    a: "Non. C'est un compte-rendu educatif et actionnable base sur des ranges numeriques et de la litterature scientifique. Si un marqueur est hors des ranges critiques, je te le signale clairement et tu dois consulter un professionnel de sante. Mon analyse vient en complement de ton suivi medical, pas en remplacement.",
  },
  {
    q: "Mon PDF de labo est protege, je fais quoi ?",
    a: "Il faut un PDF non-verrouille pour que l'extraction des valeurs fonctionne. Si ton labo protege le fichier, tu peux le convertir en PDF standard via un outil de deblocage en ligne, puis le re-uploader. La plupart des labos fournissent directement un PDF non-protege.",
  },
  {
    q: "Combien de temps pour recevoir mon rapport ?",
    a: "Ton rapport est genere automatiquement et delivre sous 24h par email apres l'upload de ton PDF. Tu recois un email des que ton rapport est pret avec un lien direct vers ton dashboard.",
  },
  {
    q: "Je peux suivre l'evolution dans le temps ?",
    a: "Oui. Chaque upload cree un bilan historise dans ton dashboard. Des que tu as plusieurs bilans, tu vois les tendances et la trajectoire de chaque marqueur. C'est la meilleure facon de mesurer l'impact de tes changements d'hygiene de vie sur ta biologie reelle.",
  },
];

function BadgePill({ children }: { children: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-white/15 bg-[#0a0a0a] px-3 py-1 text-xs text-white/70">
      {children}
    </span>
  );
}

// --- Background Effects ---

const ParticleSystem = () => {
  const particles = useMemo(() => {
    return Array.from({ length: 60 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 3 + 1,
      duration: Math.random() * 20 + 10,
      delay: Math.random() * 5,
    }));
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-red-500/30 blur-[1px]"
          style={{ width: p.size, height: p.size, left: `${p.x}%`, top: `${p.y}%` }}
          animate={{ y: [0, -1000], x: [0, Math.sin(p.id) * 50], opacity: [0, 0.8, 0] }}
          transition={{ duration: p.duration, repeat: Infinity, delay: p.delay, ease: "linear" }}
        />
      ))}
    </div>
  );
};

const LiquidGlassBackground = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 bg-[#020202]">
    <div className="absolute inset-0 bg-[linear-gradient(to_right,#ef444405_1px,transparent_1px),linear-gradient(to_bottom,#ef444405_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,#000_70%,transparent_100%)]" />
    <motion.div
      animate={{ scale: [1, 1.1, 1], opacity: [0.15, 0.3, 0.15], rotate: [0, 45, 0] }}
      transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
      className="absolute -top-[20%] -left-[10%] w-[70vw] h-[70vw] rounded-full bg-red-900/20 mix-blend-screen blur-[120px]"
    />
    <motion.div
      animate={{ scale: [1, 1.3, 1], opacity: [0.1, 0.25, 0.1], rotate: [0, -45, 0] }}
      transition={{ duration: 30, repeat: Infinity, ease: "easeInOut" }}
      className="absolute top-[30%] -right-[20%] w-[60vw] h-[60vw] rounded-full bg-yellow-900/20 mix-blend-screen blur-[120px]"
    />
    <ParticleSystem />
  </div>
);

// --- Shared Animation Wrapper ---

const AnimationWrapper = ({
  children,
  title,
  value,
  status,
  extraUI,
  color = "red",
}: {
  children: React.ReactNode;
  title: string;
  value: string;
  status: string;
  extraUI?: React.ReactNode;
  color?: string;
}) => {
  const colorMap: Record<string, string> = {
    cyan: "border-yellow-500/20 shadow-[0_0_50px_rgba(234,179,8,0.1)]",
    red: "border-red-500/20 shadow-[0_0_50px_rgba(239,68,68,0.1)]",
    green: "border-green-500/20 shadow-[0_0_50px_rgba(34,197,94,0.1)]",
    yellow: "border-yellow-500/20 shadow-[0_0_50px_rgba(234,179,8,0.1)]",
  };
  const scanlineMap: Record<string, string> = {
    cyan: "bg-yellow-400/50 shadow-[0_0_20px_rgba(234,179,8,1)]",
    red: "bg-red-400/50 shadow-[0_0_20px_rgba(239,68,68,1)]",
    green: "bg-green-400/50 shadow-[0_0_20px_rgba(34,197,94,1)]",
    yellow: "bg-yellow-400/50 shadow-[0_0_20px_rgba(234,179,8,1)]",
  };
  const textMap: Record<string, string> = {
    cyan: "text-yellow-500",
    red: "text-red-500",
    green: "text-green-500",
    yellow: "text-yellow-500",
  };
  const dotMap: Record<string, string> = {
    cyan: "bg-yellow-500",
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
      className={`relative w-full max-w-lg aspect-square md:aspect-[4/5] rounded-3xl border bg-black/50 backdrop-blur-2xl overflow-hidden flex items-center justify-center group ${colorMap[color] ?? colorMap["red"]}`}
    >
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:1.5rem_1.5rem]" />
      <motion.div
        className={`absolute top-0 left-0 w-full h-[2px] z-20 ${scanlineMap[color] ?? scanlineMap["red"]}`}
        animate={{ y: ["0%", "400%", "0%"] }}
        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
      />
      {children}
      <div className="absolute top-4 left-4 bg-black/80 backdrop-blur-md border border-white/10 rounded-lg p-3 flex flex-col gap-1 z-30">
        <div className="flex items-center gap-2 mb-1">
          <div className={`w-2 h-2 rounded-full animate-pulse ${dotMap[color] ?? dotMap["red"]}`} />
          <span className={`text-[10px] font-mono uppercase tracking-wider ${textMap[color] ?? textMap["red"]}`}>{title}</span>
        </div>
        <span className="text-3xl font-bold text-white tracking-tighter">{value}</span>
        <span className="text-xs text-slate-400">{status}</span>
      </div>
      {extraUI}
    </motion.div>
  );
};

// --- 1. PDF Extraction Animation ---
const PDFExtractionAnimation = () => {
  const t = { duration: 2, repeat: Infinity, ease: "easeInOut" as const };
  const molecules = ["TESTO", "E2", "SHBG", "IGF-1", "HBA1C", "T3L", "CORTISOL"];

  return (
    <AnimationWrapper
      title="Extraction PDF"
      value="39/39"
      status="Biomarqueurs detectes"
      color="cyan"
      extraUI={
        <div className="absolute bottom-4 right-4 bg-black/80 backdrop-blur-md border border-cyan-500/30 rounded-lg p-3 flex flex-col gap-1 z-30 items-end">
          <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">Precision</span>
          <motion.span className="text-xl font-bold text-cyan-400" animate={{ opacity: [0.5, 1, 0.5] }} transition={t}>99.9%</motion.span>
        </div>
      }
    >
      <svg viewBox="0 0 100 100" className="w-full h-full absolute inset-0 overflow-visible p-8 z-10">
        <motion.rect x="30" y="20" width="40" height="50" rx="2" fill="rgba(6,182,212,0.05)" stroke="#06b6d4" strokeWidth="0.5" animate={{ y: [20, 18, 20] }} transition={t} />
        <motion.line x1="35" y1="30" x2="60" y2="30" stroke="#06b6d4" strokeWidth="1" strokeLinecap="round" animate={{ opacity: [0.2, 0.8, 0.2] }} transition={{ ...t, delay: 0.1 }} />
        <motion.line x1="35" y1="40" x2="65" y2="40" stroke="#06b6d4" strokeWidth="1" strokeLinecap="round" animate={{ opacity: [0.2, 0.8, 0.2] }} transition={{ ...t, delay: 0.2 }} />
        <motion.line x1="35" y1="50" x2="55" y2="50" stroke="#06b6d4" strokeWidth="1" strokeLinecap="round" animate={{ opacity: [0.2, 0.8, 0.2] }} transition={{ ...t, delay: 0.3 }} />
        {molecules.map((mol, i) => (
          <motion.text
            key={i}
            x={50}
            y={45}
            fill="#fff"
            fontSize="4"
            className="font-mono font-bold drop-shadow-[0_0_5px_rgba(6,182,212,0.8)]"
            initial={{ opacity: 0, scale: 0.5, x: 50, y: 45 }}
            animate={{
              opacity: [0, 1, 0],
              scale: [0.5, 1.2, 0.8],
              x: 50 + (Math.random() * 60 - 30),
              y: 20 + (Math.random() * 60 - 10),
            }}
            transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.4, ease: "easeOut" }}
          >
            {mol}
          </motion.text>
        ))}
        <motion.line x1="20" y1="20" x2="80" y2="20" stroke="#fff" strokeWidth="0.5" className="drop-shadow-[0_0_8px_#06b6d4]" animate={{ y1: [15, 75, 15], y2: [15, 75, 15] }} transition={t} />
      </svg>
    </AnimationWrapper>
  );
};

// --- 2. Anabolic Score Animation ---
const AnabolicScoreAnimation = () => {
  const t = { duration: 3, repeat: Infinity, ease: "easeInOut" as const };
  return (
    <AnimationWrapper
      title="Profil Hormonal"
      value="94/100"
      status="Score Anabolique"
      color="yellow"
      extraUI={
        <div className="absolute bottom-4 left-4 flex flex-col gap-2 z-30">
          <div className="bg-black/80 backdrop-blur-md border border-yellow-500/30 rounded p-2 flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse" />
            <span className="text-[10px] text-white font-mono uppercase">Testo Libre: <span className="text-yellow-400 font-bold">OPTIMAL</span></span>
          </div>
          <div className="bg-black/80 backdrop-blur-md border border-green-500/30 rounded p-2 flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
            <span className="text-[10px] text-white font-mono uppercase">Ratio T/E2: <span className="text-green-400 font-bold">PARFAIT</span></span>
          </div>
        </div>
      }
    >
      <svg viewBox="0 0 100 100" className="w-full h-full absolute inset-0 overflow-visible p-8 z-10">
        <circle cx="50" cy="50" r="35" fill="none" stroke="#333" strokeWidth="2" strokeDasharray="2 4" />
        <circle cx="50" cy="50" r="28" fill="none" stroke="#222" strokeWidth="6" />
        <motion.circle
          cx="50" cy="50" r="28" fill="none" stroke="#f59e0b" strokeWidth="6" strokeLinecap="round"
          strokeDasharray="175"
          className="drop-shadow-[0_0_15px_rgba(245,158,11,0.6)]"
          initial={{ strokeDashoffset: 175 }}
          animate={{ strokeDashoffset: [175, 20, 20] }}
          transition={{ duration: 4, repeat: Infinity, ease: "circOut" }}
          transform="rotate(-90 50 50)"
        />
        <motion.circle cx="50" cy="50" r="20" fill="rgba(245,158,11,0.1)" animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.6, 0.3] }} transition={t} />
        <text x="50" y="52" fill="#fff" fontSize="12" textAnchor="middle" className="font-black tracking-tighter">94</text>
        <text x="50" y="58" fill="#f59e0b" fontSize="4" textAnchor="middle" className="font-mono uppercase tracking-widest">Apex</text>
        <motion.g animate={{ rotate: 360 }} transition={{ duration: 10, repeat: Infinity, ease: "linear" }} style={{ transformOrigin: "50px 50px" }}>
          <circle cx="50" cy="15" r="3" fill="#f59e0b" className="drop-shadow-[0_0_5px_#f59e0b]" />
          <text x="50" y="10" fill="#94a3b8" fontSize="3" textAnchor="middle" className="font-mono">Free T</text>
          <circle cx="80" cy="70" r="2" fill="#10b981" />
          <text x="86" y="72" fill="#94a3b8" fontSize="3" textAnchor="start" className="font-mono">E2</text>
          <circle cx="20" cy="70" r="2.5" fill="#0ea5e9" />
          <text x="14" y="72" fill="#94a3b8" fontSize="3" textAnchor="end" className="font-mono">SHBG</text>
        </motion.g>
      </svg>
    </AnimationWrapper>
  );
};

// --- 3. Insulin Resistance Animation ---
const InsulinResistanceAnimation = () => {
  return (
    <AnimationWrapper
      title="Score Metabolique"
      value="0.8"
      status="HOMA-IR (Sensibilite Max)"
      color="red"
      extraUI={
        <div className="absolute top-4 right-4 bg-black/80 backdrop-blur-md border border-red-500/30 rounded-lg p-3 flex flex-col gap-1 z-30 items-end">
          <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">Resistance Insuline</span>
          <span className="text-sm font-bold text-red-400">NEGATIVE</span>
        </div>
      }
    >
      <svg viewBox="0 0 100 100" className="w-full h-full absolute inset-0 overflow-hidden p-8 z-10">
        <line x1="10" y1="80" x2="90" y2="80" stroke="#333" strokeWidth="1" />
        <line x1="10" y1="20" x2="10" y2="80" stroke="#333" strokeWidth="1" />
        <rect x="10" y="20" width="80" height="30" fill="rgba(239,68,68,0.05)" />
        <text x="88" y="35" fill="#ef4444" fontSize="3" textAnchor="end" className="font-mono opacity-50">Zone de Resistance</text>
        <rect x="10" y="50" width="80" height="30" fill="rgba(34,197,94,0.05)" />
        <text x="88" y="75" fill="#22c55e" fontSize="3" textAnchor="end" className="font-mono opacity-50">Zone Apex (Sensible)</text>
        <motion.path d="M 10 70 C 30 70, 40 25, 50 25 C 60 25, 70 65, 90 65" fill="none" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="2 2" className="opacity-40" />
        <motion.path
          d="M 10 70 C 30 70, 40 60, 50 60 C 60 60, 70 68, 90 68"
          fill="none" stroke="#22c55e" strokeWidth="3" strokeLinecap="round"
          className="drop-shadow-[0_0_10px_rgba(34,197,94,0.8)]"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: [0, 1, 1] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.g animate={{ x: [15, 85, 15], y: [70, 68, 70] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}>
          <circle cx="0" cy="0" r="3" fill="#fff" className="drop-shadow-[0_0_8px_#fff]" />
          <circle cx="0" cy="0" r="6" fill="none" stroke="#22c55e" strokeWidth="0.5" />
        </motion.g>
        <text x="10" y="85" fill="#64748b" fontSize="3" className="font-mono">Glucose</text>
        <text x="50" y="85" fill="#64748b" fontSize="3" textAnchor="middle" className="font-mono">Insuline</text>
        <text x="90" y="85" fill="#64748b" fontSize="3" textAnchor="end" className="font-mono">HbA1c</text>
      </svg>
    </AnimationWrapper>
  );
};

// --- 4. Biomarker Matrix Animation ---
const BiomarkerMatrixAnimation = () => {
  const biomarkers = [
    "Testosterone Totale", "Testosterone Libre", "SHBG", "Estradiol (E2)", "Prolactine",
    "IGF-1", "DHEA-S", "Cortisol", "TSH", "T3 Libre", "T4 Libre", "Insuline", "HbA1c",
    "Vitamine D3", "Zinc", "Magnesium", "Ferritine", "hs-CRP", "Homocysteine", "ALAT", "ASAT", "GGT",
  ];
  const [activeIndices, setActiveIndices] = useState<number[]>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      const next: number[] = [];
      for (let i = 0; i < 5; i++) next.push(Math.floor(Math.random() * biomarkers.length));
      setActiveIndices(next);
    }, 800);
    return () => clearInterval(interval);
  }, []);

  return (
    <AnimationWrapper
      title="Panel Complet"
      value="39"
      status="Molecules Analysees"
      color="green"
      extraUI={
        <div className="absolute bottom-4 right-4 bg-black/80 backdrop-blur-md border border-green-500/30 rounded-lg p-3 flex flex-col gap-1 z-30 items-end">
          <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">Profondeur</span>
          <span className="text-sm font-bold text-green-400">Niveau Cellulaire</span>
        </div>
      }
    >
      <div className="absolute inset-0 p-8 pt-24 pb-16 overflow-hidden flex flex-wrap gap-2 justify-center items-center content-center z-10">
        {biomarkers.map((marker, i) => {
          const isActive = activeIndices.includes(i);
          return (
            <motion.div
              key={i}
              animate={{
                color: isActive ? "#4ade80" : "#475569",
                textShadow: isActive ? "0 0 10px rgba(74,222,128,0.8)" : "none",
                scale: isActive ? 1.05 : 1,
              }}
              transition={{ duration: 0.3 }}
              className="text-[9px] sm:text-[11px] font-mono uppercase px-2 py-1 border border-white/5 rounded bg-black/20"
            >
              {marker}
            </motion.div>
          );
        })}
      </div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_30%,rgba(0,0,0,0.8)_100%)] z-20 pointer-events-none" />
    </AnimationWrapper>
  );
};

// --- 5. Body Map Animation ---
const BodyMapAnimation = () => (
  <AnimationWrapper
    title="Bilan Global"
    value="APEX"
    status="Potentiel Debloque"
    color="red"
    extraUI={
      <div className="absolute top-1/2 left-4 -translate-y-1/2 flex flex-col gap-3 z-30">
        <div className="bg-black/80 backdrop-blur-md border border-red-500/30 rounded p-2 flex flex-col gap-0.5">
          <span className="text-[9px] text-slate-400 font-mono uppercase">Potentiel Hypertrophie</span>
          <span className="text-xs font-bold text-red-400">MAXIMISE</span>
        </div>
        <div className="bg-black/80 backdrop-blur-md border border-yellow-500/30 rounded p-2 flex flex-col gap-0.5">
          <span className="text-[9px] text-slate-400 font-mono uppercase">Drive Dopaminergique</span>
          <span className="text-xs font-bold text-yellow-400">OPTIMISE</span>
        </div>
        <div className="bg-black/80 backdrop-blur-md border border-green-500/30 rounded p-2 flex flex-col gap-0.5">
          <span className="text-[9px] text-slate-400 font-mono uppercase">Oxydation Graisses</span>
          <span className="text-xs font-bold text-green-400">ACTIVE</span>
        </div>
      </div>
    }
  >
    <svg viewBox="0 0 100 100" className="w-full h-full absolute inset-0 overflow-visible p-8 pl-24 z-10">
      <path d="M 50 15 C 43 15 43 28 50 28 C 57 28 57 15 50 15 Z M 35 40 C 35 32 65 32 65 40 L 70 85 L 60 85 L 55 60 L 45 60 L 40 85 L 30 85 Z" fill="none" stroke="#334155" strokeWidth="1.5" strokeLinejoin="round" />
      <motion.circle cx="50" cy="21" r="3" fill="#eab308" className="drop-shadow-[0_0_12px_rgba(234,179,8,1)]" animate={{ opacity: [0.5, 1, 0.5], scale: [1, 1.3, 1] }} transition={{ duration: 1.5, repeat: Infinity, delay: 0 }} />
      <motion.line x1="50" y1="21" x2="70" y2="15" stroke="#eab308" strokeWidth="0.5" className="opacity-50" />
      <text x="72" y="16" fill="#eab308" fontSize="3" className="font-mono font-bold">NEURO</text>
      <motion.circle cx="53" cy="45" r="3" fill="#ef4444" className="drop-shadow-[0_0_12px_rgba(239,68,68,1)]" animate={{ opacity: [0.5, 1, 0.5], scale: [1, 1.2, 1] }} transition={{ duration: 1.2, repeat: Infinity, delay: 0.5 }} />
      <motion.line x1="53" y1="45" x2="75" y2="40" stroke="#ef4444" strokeWidth="0.5" className="opacity-50" />
      <text x="77" y="41" fill="#ef4444" fontSize="3" className="font-mono font-bold">hs-CRP</text>
      <motion.circle cx="50" cy="60" r="3" fill="#22c55e" className="drop-shadow-[0_0_12px_rgba(34,197,94,1)]" animate={{ opacity: [0.5, 1, 0.5], scale: [1, 1.2, 1] }} transition={{ duration: 2, repeat: Infinity, delay: 1 }} />
      <motion.line x1="50" y1="60" x2="75" y2="65" stroke="#22c55e" strokeWidth="0.5" className="opacity-50" />
      <text x="77" y="66" fill="#22c55e" fontSize="3" className="font-mono font-bold">METABOLISME</text>
      <motion.circle cx="38" cy="45" r="2.5" fill="#ef4444" className="drop-shadow-[0_0_10px_rgba(239,68,68,1)]" animate={{ opacity: [0.5, 1, 0.5], scale: [1, 1.4, 1] }} transition={{ duration: 1.8, repeat: Infinity, delay: 1.5 }} />
      <motion.circle cx="62" cy="45" r="2.5" fill="#ef4444" className="drop-shadow-[0_0_10px_rgba(239,68,68,1)]" animate={{ opacity: [0.5, 1, 0.5], scale: [1, 1.4, 1] }} transition={{ duration: 1.8, repeat: Infinity, delay: 1.5 }} />
      <motion.line x1="62" y1="45" x2="80" y2="50" stroke="#ef4444" strokeWidth="0.5" className="opacity-50" />
      <text x="82" y="51" fill="#ef4444" fontSize="3" className="font-mono font-bold">ANABOLISME</text>
    </svg>
  </AnimationWrapper>
);

// --- Feature Row Layout ---

type FeatureRowProps = {
  title: string;
  description: string;
  icon: React.ElementType;
  animation: React.ComponentType;
  reverse?: boolean;
  color?: "red" | "green" | "yellow";
};

const FeatureRow = ({ title, description, icon: Icon, animation: AnimationComponent, reverse = false, color = "red" }: FeatureRowProps) => {
  const colorMap = {
    red: {
      border: "border-red-900/30",
      shadow: "shadow-[0_0_30px_rgba(239,68,68,0.1)]",
      hoverShadow: "group-hover:shadow-[0_0_50px_rgba(239,68,68,0.2)]",
      hoverBorder: "group-hover:border-red-500/50",
      iconBg: "bg-red-500/10",
      iconColor: "text-red-500",
      gradient: "from-red-500/5",
    },
    green: {
      border: "border-green-900/30",
      shadow: "shadow-[0_0_30px_rgba(34,197,94,0.1)]",
      hoverShadow: "group-hover:shadow-[0_0_50px_rgba(34,197,94,0.2)]",
      hoverBorder: "group-hover:border-green-500/50",
      iconBg: "bg-green-500/10",
      iconColor: "text-green-500",
      gradient: "from-green-500/5",
    },
    yellow: {
      border: "border-yellow-900/30",
      shadow: "shadow-[0_0_30px_rgba(234,179,8,0.1)]",
      hoverShadow: "group-hover:shadow-[0_0_50px_rgba(234,179,8,0.2)]",
      hoverBorder: "group-hover:border-yellow-500/50",
      iconBg: "bg-yellow-500/10",
      iconColor: "text-yellow-500",
      gradient: "from-yellow-500/5",
    },
  };
  const theme = colorMap[color];

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.7, ease: "easeOut" }}
      className={`flex flex-col ${reverse ? "lg:flex-row-reverse" : "lg:flex-row"} items-center gap-8 lg:gap-16 p-8 lg:p-12 w-full rounded-3xl bg-black/40 backdrop-blur-sm border ${theme.border} ${theme.shadow} ${theme.hoverShadow} ${theme.hoverBorder} transition-all duration-500 group mb-16 relative overflow-hidden`}
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${theme.gradient} to-transparent opacity-50 pointer-events-none`} />
      <div className="flex-1 flex flex-col items-center lg:items-start text-center lg:text-left relative z-10">
        <div className={`w-16 h-16 rounded-2xl ${theme.iconBg} border ${theme.border} flex items-center justify-center mb-8 ${theme.iconColor} transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3`}>
          <Icon size={32} />
        </div>
        <h2 className="text-3xl md:text-4xl font-black mb-6 tracking-tighter uppercase text-white">{title}</h2>
        <p className="text-lg text-slate-300 leading-relaxed font-light">{description}</p>
      </div>
      <div className="flex-1 w-full flex justify-center relative z-10">
        <AnimationComponent />
      </div>
    </motion.div>
  );
};

export default function BloodAnalysisOffer() {
  const exampleRef = useRef<HTMLDivElement | null>(null);
  const panelsRef = useRef<HTMLDivElement | null>(null);

  const { scrollYProgress } = useScroll();
  const heroGlow = useTransform(scrollYProgress, [0, 0.25], [0.9, 0.2]);

  const ctaHref = "/blood-analysis";
  const trustRow = useMemo(
    () => [
      "Ranges numeriques precis",
      "Approche evidence-based",
      "Dashboard + export PDF",
    ],
    []
  );

  return (
    <div className="blood-uh min-h-screen bg-[#020202] text-white relative overflow-x-hidden">
      <LiquidGlassBackground />
      <Header />

      <section className="relative overflow-hidden z-10">
        <motion.div
          className="pointer-events-none absolute inset-0"
          style={{
            opacity: heroGlow,
            background:
              "radial-gradient(circle at 50% 0%, rgba(2,121,232,0.10) 0%, transparent 55%)",
          }}
        />
        <div className="pointer-events-none absolute inset-0 opacity-30" style={{ backgroundImage: "linear-gradient(to right, rgba(15, 23, 42, 0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(15, 23, 42, 0.06) 1px, transparent 1px)", backgroundSize: "60px 60px" }} />

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

              <div className="flex flex-wrap items-center gap-5 text-sm text-white/50">
                {trustRow.map((item) => (
                  <div key={item} className="inline-flex items-center gap-2">
                    <Check className="h-4 w-4" style={{ color: PRIMARY_BLUE }} />
                    <span>{item}</span>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Link href={ctaHref}>
                  <a
                    className="group inline-flex items-center gap-3 rounded-full px-7 py-3 text-sm font-semibold text-white transition-all hover:scale-[1.02]"
                    style={{ backgroundColor: PRIMARY_BLUE }}
                  >
                    Analyser mon bilan — 99€
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </a>
                </Link>
                <button
                  type="button"
                  onClick={() => panelsRef.current?.scrollIntoView({ behavior: "smooth" })}
                  className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-transparent px-6 py-3 text-sm text-white/80 hover:bg-white/10 transition-all"
                >
                  Voir les panels
                  <FileText className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => exampleRef.current?.scrollIntoView({ behavior: "smooth" })}
                  className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-transparent px-6 py-3 text-sm text-white/80 hover:bg-white/10 transition-all"
                >
                  Voir un exemple
                  <Beaker className="h-4 w-4" />
                </button>
              </div>

              <div className="pt-3 text-xs text-white/40">
                Paiement securise (Stripe) · RGPD · Analyse basee sur ton PDF (pas un service labo proprietaire).
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, ease: "easeOut", delay: 0.1 }}
              className="flex items-center justify-center"
            >
              <PDFExtractionAnimation />
            </motion.div>
          </div>
        </div>
      </section>

      <section className="relative z-10 bg-gradient-to-b from-transparent via-[#050505] to-[#020202] py-20 px-6">
        <div className="mx-auto max-w-7xl">
          <FeatureRow
            title="Score Anabolique"
            description="La testosterone totale ne veut rien dire seule. J'analyse ta Testosterone Libre, ta SHBG, ton Estradiol (E2) et ta Prolactine pour calculer ton veritable potentiel anabolique et ta capacite a construire du muscle."
            icon={Flame}
            animation={AnabolicScoreAnimation}
            reverse={true}
            color="yellow"
          />
          <FeatureRow
            title="Resistance a l'Insuline"
            description="La fatigue chronique et le stockage de gras abdominal proviennent souvent d'une sensibilite a l'insuline detruite. Je traque ton HOMA-IR, ton HbA1c et ta glycemie a jeun pour relancer ton moteur metabolique."
            icon={Activity}
            animation={InsulinResistanceAnimation}
            reverse={false}
            color="red"
          />
          <FeatureRow
            title="39 Molecules Decryptees"
            description="Un panel sanguin d'elite. De la fonction thyroidienne (TSH, T3L, T4L) aux marqueurs d'inflammation silencieuse (hs-CRP, Homocysteine) en passant par les carences critiques (D3, Zinc, Magnesium)."
            icon={Dna}
            animation={BiomarkerMatrixAnimation}
            reverse={true}
            color="green"
          />
          <FeatureRow
            title="Plan d'Action Personnalise"
            description="Ton sang ne ment pas. Recois un protocole exact : nutrition ciblee, supplementation millimetree et ajustements d'entrainement bases sur TES datas pour debloquer ton drive et ton hypertrophie."
            icon={Shield}
            animation={BodyMapAnimation}
            reverse={false}
            color="red"
          />
        </div>
      </section>

      {/* Pricing Card */}
      <section className="relative z-10 bg-[#0a0a0a] py-20 px-6">
        <div className="mx-auto max-w-2xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="rounded-2xl border border-white/15 bg-black/60 backdrop-blur-sm p-10"
            style={{ boxShadow: "0 0 60px rgba(2,121,232,0.12)" }}
          >
            <div className="flex items-end gap-2 mb-2">
              <span className="text-5xl font-black text-white tracking-tighter">99€</span>
              <span className="text-white/40 text-sm mb-2">acompte — deductible du coaching</span>
            </div>
            <p className="text-white/50 text-sm mb-8">Acces immediat apres paiement. Rapport livre sous 24h.</p>
            <ul className="space-y-3 mb-10">
              {[
                "39 biomarqueurs analyses sur 6 panels",
                "Ranges optimaux vs normaux (pas juste \u00abnormal\u00bb)",
                "Plan d\u2019action personnalise et priorise",
                "Dashboard interactif + export PDF",
                "Historique et suivi dans le temps",
                "100% deductible du coaching Achzod",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-white/80">
                  <Check className="h-4 w-4 mt-0.5 shrink-0" style={{ color: PRIMARY_BLUE }} />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <Link href={ctaHref}>
              <a
                className="group w-full inline-flex items-center justify-center gap-3 rounded-full px-7 py-4 text-sm font-semibold text-white transition-all hover:scale-[1.02]"
                style={{ backgroundColor: PRIMARY_BLUE }}
              >
                Analyser mon bilan — 99€
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </a>
            </Link>
            <p className="mt-4 text-center text-xs text-white/30">Paiement securise par Stripe · Carte ou PayPal</p>
          </motion.div>
        </div>
      </section>

      {/* Marqueurs à demander — section complète */}
      <section className="relative z-10 bg-[#0a0a0a] pb-16 px-6">
        <div className="mx-auto max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <div className="text-center mb-8">
              <h2 className="text-3xl font-semibold tracking-tight mb-3">Quels marqueurs demander a ton medecin ?</h2>
              <p className="text-white/50 text-sm max-w-2xl mx-auto">Montre cette liste a ton medecin ou demande-la directement au laboratoire. La plupart sont rembourses sur prescription.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/40 p-8">
              <div className="grid md:grid-cols-2 gap-6">
                {PANELS.map((panel) => (
                  <div key={panel.title}>
                    <h3 className="font-semibold text-sm mb-2" style={{ color: PRIMARY_BLUE }}>{panel.title} ({panel.count} marqueurs)</h3>
                    <p className="text-white/50 text-xs leading-relaxed">{panel.bullets.join(". ")}.</p>
                  </div>
                ))}
              </div>
              <div className="mt-6 p-4 rounded-xl" style={{ background: "rgba(2,121,232,0.06)", borderColor: "rgba(2,121,232,0.2)" }}>
                <p className="text-white/60 text-xs"><strong className="text-white/80">Astuce :</strong> Imprime cette page ou fais une capture d'ecran. Dis a ton medecin que tu veux un bilan complet pour optimisation de sante. Apres l'achat, je t'envoie aussi la liste par email.</p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Comment ca marche */}
      <section className="relative z-10 bg-[#0a0a0a] py-24 px-6">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <p className="text-sm font-medium tracking-[0.2em] uppercase" style={{ color: PRIMARY_BLUE }}>
              Comment ca marche
            </p>
            <h2 className="mt-6 text-4xl md:text-5xl font-semibold tracking-tight">4 etapes. Simple.</h2>
          </div>

          <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[
              {
                step: "01",
                icon: Zap,
                title: "Achete ton analyse",
                desc: "Paiement securise 99\u20ac par carte ou PayPal. Tu recois immediatement l'acces au dashboard.",
                time: "< 1 min",
              },
              {
                step: "02",
                icon: FlaskConical,
                title: "Fais ta prise de sang",
                desc: "Demande les marqueurs listes ci-dessous a ton medecin ou labo. Je t'envoie la liste complete apres l'achat.",
                time: "Selon ton labo",
              },
              {
                step: "03",
                icon: Upload,
                title: "Upload ton PDF",
                desc: "Depose tes resultats (PDF non-verrouille) sur ton dashboard client.",
                time: "10 sec",
              },
              {
                step: "04",
                icon: Check,
                title: "Recois ton rapport",
                desc: "Dashboard interactif + ranges optimaux + plan d'action priorise. Livre sous 24h.",
                time: "Sous 24h",
              },
            ].map((item, idx) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, ease: "easeOut", delay: idx * 0.07 }}
                className="relative overflow-hidden rounded-xl border border-white/15 bg-[#0a0a0a] p-8"
              >
                <div className="absolute right-4 top-2 text-7xl font-semibold text-white/[0.06]">{item.step}</div>
                <div className="relative z-10">
                  <div className="h-12 w-12 rounded-lg border border-white/15 bg-[#0a0a0a] flex items-center justify-center">
                    <item.icon className="h-6 w-6" style={{ color: PRIMARY_BLUE }} />
                  </div>
                  <p className="mt-6 text-xl font-semibold tracking-tight">{item.title}</p>
                  <p className="mt-3 text-white/70 leading-relaxed text-sm">{item.desc}</p>
                  <p className="mt-6 text-sm text-white/40">Duree: {item.time}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>


      <section ref={panelsRef} className="relative z-10 py-24 px-6 bg-[#0a0a0a]">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <h2 className="text-4xl md:text-5xl font-semibold tracking-tight">39 biomarqueurs · 6 panels</h2>
            <p className="mt-4 text-white/50 max-w-3xl mx-auto">
              Un PDF standard contient rarement 80 biomarqueurs. Ici on couvre ce qui est realiste, exploitable, et actionnable.
              Roadmap: +11 marqueurs (NFS + ionogramme) pour atteindre 50.
            </p>
          </div>

          <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {PANELS.map((panel) => (
              <div
                key={panel.title}
                className="rounded-xl border border-white/15 bg-[#0a0a0a] p-8 hover:border-white/15 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold tracking-tight">{panel.title}</p>
                    <p className="mt-2 text-sm text-white/50">{panel.count} biomarqueurs analyses</p>
                  </div>
                  <span className="inline-flex items-center rounded-full border border-white/15 bg-[#0a0a0a] px-3 py-1 text-xs text-white/70">
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

            <div className="rounded-xl border border-white/15 bg-[#0a0a0a] p-8">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold tracking-tight">Phase 2</p>
                  <p className="mt-2 text-sm text-white/50">NFS + ionogramme + 3 ajouts</p>
                </div>
                <span className="inline-flex items-center rounded-full border border-white/15 bg-[#0a0a0a] px-3 py-1 text-xs text-white/70">
                  Coming soon
                </span>
              </div>
              <p className="mt-6 text-sm text-white/70 leading-relaxed">
                Ajout de 11 marqueurs frequents (hemoglobine, hematocrite, GR/GB, plaquettes, sodium/potassium/chlore, cholesterol total, ApoA1, uree).
              </p>
              <div className="mt-6 h-28 rounded-lg border border-white/15 bg-[radial-gradient(ellipse_at_center,_rgba(2,121,232,0.10)_0%,_transparent_70%)]" />
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-10 bg-[#0a0a0a] py-24 px-6">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <h2 className="text-4xl md:text-5xl font-semibold tracking-tight">Ranges optimaux vs normaux</h2>
            <p className="mt-4 text-white/50 max-w-3xl mx-auto">
              "Normal" ne veut pas dire "optimal" si ton objectif est performance, composition corporelle, energie et longevite.
            </p>
          </div>

          <div className="mt-14 grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-white/15 bg-[#0a0a0a] p-10">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-lg border border-white/15 bg-[#0a0a0a] flex items-center justify-center">
                  <Shield className="h-5 w-5 text-white/80" />
                </div>
                <p className="text-2xl font-semibold tracking-tight">Ranges laboratoire (normaux)</p>
              </div>
              <p className="mt-4 text-white/70 leading-relaxed">
                Base sur la moyenne population (95%). Cela inclut sedentarite, surpoids, pathologies silencieuses. Utile pour depistage, pas pour optimisation.
              </p>
              <div className="mt-8 rounded-lg border border-white/15 bg-[#0a0a0a] p-5">
                <p className="text-sm font-semibold">Exemple: testosterone totale</p>
                <p className="mt-2 text-sm text-white/70">Normal labo: 300–1000 ng/dL</p>
                <p className="mt-4 text-sm text-white/70">
                  350 = "normal", mais souvent associe a fatigue, libido basse, progression lente.
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-white/15 bg-[#0a0a0a] p-10">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-lg border border-white/15 bg-[#0a0a0a] flex items-center justify-center">
                  <Target className="h-5 w-5" style={{ color: PRIMARY_BLUE }} />
                </div>
                <p className="text-2xl font-semibold tracking-tight">Ranges optimaux (performance)</p>
              </div>
              <p className="mt-4 text-white/70 leading-relaxed">
                Base sur top performers (litterature performance/longevite). Objectif: energie stable, meilleure recuperation, meilleure sensibilite metabolique.
              </p>
              <div className="mt-8 rounded-lg border border-white/15 bg-[#0a0a0a] p-5">
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
              <a
                className="inline-flex items-center gap-3 rounded-full px-7 py-3 text-sm font-semibold text-white hover:scale-[1.02] transition-all"
                style={{ backgroundColor: PRIMARY_BLUE }}
              >
                Decouvrir mes ranges optimaux
                <ArrowRight className="h-4 w-4" />
              </a>
            </Link>
          </div>
        </div>
      </section>

      <section className="relative z-10 py-24 px-6 bg-[#0a0a0a]">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <h2 className="text-4xl md:text-5xl font-semibold tracking-tight">Bibliotheque de connaissances</h2>
            <p className="mt-4 text-white/50 max-w-3xl mx-auto">
              7 sources expertes. Corrélations et protocoles construits sur de la litterature, pas un PDF genere au hasard.
            </p>
            <p className="mt-2 text-xs text-white/40">
              Mise a jour reguliere. Objectif: rendre ton bilan compréhensible et actionnable.
            </p>
          </div>

          <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {SOURCES.map((item) => (
              <div key={item.title} className="rounded-xl border border-white/15 bg-[#0a0a0a] p-8">
                <p className="text-lg font-semibold">{item.title}</p>
                <p className="mt-3 text-sm text-white/70 leading-relaxed">{item.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section ref={exampleRef} className="relative z-10 bg-[#0a0a0a] py-24 px-6">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-14">
            <h2 className="text-4xl md:text-5xl font-semibold tracking-tight">Exemple de rapport</h2>
            <p className="mt-4 text-white/50 max-w-3xl mx-auto">
              Voici a quoi ressemble ton rapport. Score global, breakdown par panels, alertes, protocoles et plan d'action.
            </p>
          </div>

          <AnimatedReportPreview
            score={78}
            scoreColor={PRIMARY_BLUE}
            urlBar="apexlabs.achzodcoaching.com/analysis/rapport-demo"
            panels={[
              { name: "Hormones", score: 72 },
              { name: "Thyroide", score: 88 },
              { name: "Metabolisme", score: 61 },
              { name: "Inflammation", score: 65 },
              { name: "Vitamines", score: 90 },
              { name: "Foie/Rein", score: 92 },
            ]}
            alert={{
              title: "Testosterone libre: 8.2 pg/mL",
              detail: "Range optimal: 15-25 pg/mL. Sous le seuil optimal de 40%. Action recommandee.",
            }}
            biomarkers={[
              { name: "Testosterone totale", value: "485 ng/dL", range: "600-900", status: "low" },
              { name: "Testosterone libre", value: "8.2 pg/mL", range: "15-25", status: "critical" },
              { name: "SHBG", value: "62 nmol/L", range: "20-50", status: "high" },
              { name: "Estradiol (E2)", value: "28 pg/mL", range: "20-35", status: "optimal" },
              { name: "Cortisol matin", value: "18.5 µg/dL", range: "10-20", status: "optimal" },
              { name: "IGF-1", value: "195 ng/mL", range: "200-350", status: "low" },
            ]}
            protocol={{
              title: "Phase 1 — Semaines 1-4",
              items: [
                "Supplementation Vitamine D3: 4000 UI/jour avec repas gras",
                "Magnesium bisglycinate: 400mg au coucher",
                "Zinc picolinate: 30mg avec diner",
                "Reduire stress chronique: protocole HRV + respiration",
                "Optimiser sommeil: 7-8h, coucher avant 23h",
              ],
            }}
          />
        </div>
      </section>

      <section className="relative z-10 py-24 px-6 bg-[#0a0a0a]">
        <div className="mx-auto max-w-4xl">
          <div className="text-center">
            <h2 className="text-4xl md:text-5xl font-semibold tracking-tight">Questions frequentes</h2>
          </div>

          <div className="mt-10 rounded-xl border border-white/15 bg-[#0a0a0a] p-6">
            <Accordion type="single" collapsible className="w-full">
              {FAQ.map((item) => (
                <AccordionItem key={item.q} value={item.q} className="border-white/15">
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

      <section className="relative z-10 bg-[#0a0a0a] py-20 px-6">
        <div className="mx-auto max-w-6xl text-center">
          <h2 className="text-4xl md:text-5xl font-semibold tracking-tight">Analyser ton bilan maintenant</h2>
          <p className="mt-4 text-white/50 max-w-2xl mx-auto">
            Tu uploade ton PDF. Tu recuperes un dashboard clair, des ranges optimaux, et un plan d'action.
          </p>
          <div className="mt-8 flex justify-center">
            <Link href={ctaHref}>
              <a
                className="group inline-flex items-center gap-3 rounded-full px-8 py-4 text-sm font-semibold text-white transition-all hover:scale-[1.02]"
                style={{ backgroundColor: PRIMARY_BLUE }}
              >
                Lancer mon Blood Analysis — 99€
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </a>
            </Link>
          </div>
          <p className="mt-4 text-xs text-white/40">Paiement securise · Historique conserve · Export PDF</p>
        </div>
      </section>

      <Footer />
    </div>
  );
}

