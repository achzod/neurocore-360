import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useInView, useMotionValue, useTransform, animate } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  Cell,
  LineChart,
  Line,
} from "recharts";
import {
  ChevronDown,
  ChevronRight,
  Target,
  Activity,
  Brain,
  Moon,
  Utensils,
  Dumbbell,
  Pill,
  Clock,
  Sun,
  Coffee,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Flame,
  Heart,
  Zap,
  Calendar,
  FlaskConical,
  Timer,
  Droplets,
  Award,
  User,
  FileText,
  Sparkles,
  Play,
  ArrowRight,
  BarChart3,
  CircleDot,
} from "lucide-react";

// ============================================================================
// ULTRAHUMAN-STYLE CSS VARIABLES & THEME
// ============================================================================
const THEME = {
  neonGreen: "#0efc6d",
  accentBlue: "#007ff5",
  accentPurple: "#a855f7",
  darkBg: "#0a0a0a",
  cardBg: "rgba(255,255,255,0.03)",
  cardBorder: "rgba(255,255,255,0.08)",
  glassBg: "rgba(255,255,255,0.05)",
  glassBlur: "blur(20px)",
};

// ============================================================================
// TYPES
// ============================================================================
interface ModuleData {
  id: string;
  title: string;
  icon: typeof Activity;
  color: string;
  score: number;
  summary: string;
  keyFindings: string[];
  recommendations: string[];
  alerts?: string[];
}

interface SupplementItem {
  name: string;
  dosage: string;
  timing: "matin" | "midi" | "soir";
  purpose: string;
  brands?: string[];
}

interface ProtocolPhase {
  phase: number;
  title: string;
  duration: string;
  objectives: string[];
  keyActions: string[];
}

interface PredictionData {
  week: string;
  metrics: { label: string; value: string; trend: "up" | "down" | "stable" }[];
}

// ============================================================================
// SAMPLE DATA
// ============================================================================
const sampleModules: ModuleData[] = [
  {
    id: "anthropometrique",
    title: "Profil Anthropometrique",
    icon: Target,
    color: THEME.neonGreen,
    score: 52,
    summary: "FFMI 17.9 - Masse musculaire FAIBLE. Zone skinny-fat avec debut accumulation gras visceral.",
    keyFindings: ["Ratio Taille/Hanche: 0.91", "Flexibilite metabolique ABSENTE", "Crash energetique sans nourriture 3-4h"],
    recommendations: ["Retrouver flexibilite metabolique", "Augmenter masse musculaire", "Reduire gras visceral"],
    alerts: ["Dependance glucose pure"],
  },
  {
    id: "neuro-endocrinien",
    title: "Analyse Neuro-Endocrinienne",
    icon: Brain,
    color: THEME.accentPurple,
    score: 38,
    summary: "Fatigue surrenalienne Phase 2. Deficit dopamine SEVERE (11/40).",
    keyFindings: ["Cortisol/DHEA effondre", "Testosterone libre basse", "Dopamine: 11/40 CRITIQUE"],
    recommendations: ["Tyrosine 1g matin", "Ashwagandha 600mg soir", "Stop cafeine apres 10h"],
    alerts: ["Phase 2 fatigue surrenalienne", "Metaboliseur LENT cafeine"],
  },
  {
    id: "sommeil",
    title: "Architecture Sommeil",
    icon: Moon,
    color: THEME.accentBlue,
    score: 35,
    summary: "Dette sommeil massive: 679h/an. Deep Sleep < 10%. HRV 26-32ms.",
    keyFindings: ["Duree: 5h15/nuit", "Latence: 60-90 min", "Deep Sleep < 10%"],
    recommendations: ["Objectif 7h30 min", "Stack sommeil soir", "Chambre 17-18C"],
    alerts: ["INTERDIT: HIIT, seances > 45min"],
  },
  {
    id: "digestion",
    title: "Digestion & Microbiote",
    icon: FlaskConical,
    color: "#f59e0b",
    score: 45,
    summary: "Dysbiose + Hypochlorhydrie + Leaky Gut probable.",
    keyFindings: ["Ballonnements quotidiens", "Reflux gastrique", "Fast-food 4-5x/semaine"],
    recommendations: ["Betaine HCL 650mg", "Probiotiques 50B CFU", "Eliminer gluten 30j"],
  },
  {
    id: "entrainement",
    title: "Entrainement & Comportement",
    icon: Dumbbell,
    color: "#ec4899",
    score: 25,
    summary: "Sedentarite extreme: 10-12h assis/jour. 0 entrainement structure.",
    keyFindings: ["Steps: 2000-3000/jour", "Mobilite nulle", "Posture detruite"],
    recommendations: ["Force 3x/semaine", "Marche Zone 2 3x/semaine", "Meal prep dimanche"],
  },
];

const sampleSupplements: SupplementItem[] = [
  { name: "L-Tyrosine", dosage: "1000mg", timing: "matin", purpose: "Precurseur dopamine" },
  { name: "Vitamine D3+K2", dosage: "5000UI", timing: "matin", purpose: "Immunite, hormones" },
  { name: "Omega-3", dosage: "3g EPA/DHA", timing: "matin", purpose: "Anti-inflammatoire" },
  { name: "Zinc Picolinate", dosage: "30mg", timing: "midi", purpose: "Testosterone" },
  { name: "Alpha-GPC", dosage: "300mg", timing: "midi", purpose: "Focus, acetylcholine" },
  { name: "Magnesium", dosage: "400mg", timing: "soir", purpose: "GABA, relaxation" },
  { name: "Glycine", dosage: "3g", timing: "soir", purpose: "Deep Sleep" },
  { name: "Ashwagandha", dosage: "600mg", timing: "soir", purpose: "Cortisol -27%" },
];

const radarData = [
  { domain: "Profil", score: 52, fullMark: 100 },
  { domain: "Compo", score: 48, fullMark: 100 },
  { domain: "Metabo", score: 42, fullMark: 100 },
  { domain: "Nutri", score: 55, fullMark: 100 },
  { domain: "Digest", score: 45, fullMark: 100 },
  { domain: "Activite", score: 25, fullMark: 100 },
  { domain: "Sommeil", score: 35, fullMark: 100 },
  { domain: "HRV", score: 28, fullMark: 100 },
  { domain: "Hormones", score: 38, fullMark: 100 },
  { domain: "Mental", score: 42, fullMark: 100 },
  { domain: "Neuro", score: 35, fullMark: 100 },
  { domain: "Libido", score: 40, fullMark: 100 },
];

const hrvTrendData = [
  { day: "J1", hrv: 28 },
  { day: "J7", hrv: 35 },
  { day: "J14", hrv: 45 },
  { day: "J30", hrv: 55 },
  { day: "J60", hrv: 65 },
  { day: "J90", hrv: 72 },
];

const bodyCompData = [
  { name: "Actuel", muscle: 32, fat: 18, water: 50 },
  { name: "J30", muscle: 34, fat: 16, water: 50 },
  { name: "J60", muscle: 36, fat: 14, water: 50 },
  { name: "J90", muscle: 38, fat: 12, water: 50 },
];

// ============================================================================
// ANIMATED NUMBER COMPONENT
// ============================================================================
function AnimatedNumber({ value, suffix = "" }: { value: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });
  const motionValue = useMotionValue(0);
  const rounded = useTransform(motionValue, (latest) => Math.round(latest));

  useEffect(() => {
    if (isInView) {
      animate(motionValue, value, { duration: 1.5, ease: "easeOut" });
    }
  }, [isInView, value, motionValue]);

  useEffect(() => {
    const unsubscribe = rounded.on("change", (latest) => {
      if (ref.current) {
        ref.current.textContent = `${latest}${suffix}`;
      }
    });
    return unsubscribe;
  }, [rounded, suffix]);

  return <span ref={ref}>0{suffix}</span>;
}

// ============================================================================
// GLOWING SCORE RING
// ============================================================================
function GlowingScoreRing({ score, size = 180, label }: { score: number; size?: number; label?: string }) {
  const circumference = 2 * Math.PI * 70;
  const strokeDashoffset = circumference - (score / 100) * circumference;
  const isInView = useInView({ once: true });

  const getGradientColors = (score: number) => {
    if (score >= 70) return [THEME.neonGreen, "#10b981"];
    if (score >= 50) return [THEME.accentBlue, "#3b82f6"];
    return ["#f59e0b", "#ef4444"];
  };

  const [color1, color2] = getGradientColors(score);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      {/* Glow effect */}
      <div
        className="absolute inset-0 rounded-full opacity-30 blur-2xl"
        style={{ background: `radial-gradient(circle, ${color1} 0%, transparent 70%)` }}
      />

      <svg className="w-full h-full -rotate-90" viewBox="0 0 160 160">
        {/* Background circle */}
        <circle
          cx="80"
          cy="80"
          r="70"
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="8"
        />
        {/* Animated progress circle */}
        <motion.circle
          cx="80"
          cy="80"
          r="70"
          fill="none"
          stroke={`url(#scoreGradient-${score})`}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1.5, ease: "easeOut", delay: 0.2 }}
        />
        <defs>
          <linearGradient id={`scoreGradient-${score}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={color1} />
            <stop offset="100%" stopColor={color2} />
          </linearGradient>
        </defs>
      </svg>

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-5xl font-black tracking-tighter" style={{ color: color1 }}>
          <AnimatedNumber value={score} />
        </span>
        {label && <span className="text-xs text-white/60 mt-1 uppercase tracking-widest">{label}</span>}
      </div>
    </div>
  );
}

// ============================================================================
// GLASSMORPHISM CARD
// ============================================================================
function GlassCard({
  children,
  className = "",
  glowColor,
  ...props
}: {
  children: React.ReactNode;
  className?: string;
  glowColor?: string;
  [key: string]: unknown;
}) {
  return (
    <motion.div
      className={`relative rounded-2xl overflow-hidden ${className}`}
      style={{
        background: THEME.cardBg,
        border: `1px solid ${THEME.cardBorder}`,
        backdropFilter: THEME.glassBlur,
      }}
      whileHover={{ scale: 1.01, borderColor: "rgba(255,255,255,0.15)" }}
      transition={{ duration: 0.2 }}
      {...props}
    >
      {glowColor && (
        <div
          className="absolute -top-20 -right-20 w-40 h-40 rounded-full opacity-20 blur-3xl pointer-events-none"
          style={{ background: glowColor }}
        />
      )}
      {children}
    </motion.div>
  );
}

// ============================================================================
// MODULE SCORE BAR
// ============================================================================
function ModuleScoreBar({ module, delay = 0 }: { module: ModuleData; delay?: number }) {
  const Icon = module.icon;
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.4 }}
    >
      <GlassCard glowColor={module.color}>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full p-4 sm:p-5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-expanded={isExpanded}
        >
          <div className="flex items-center gap-4">
            {/* Icon */}
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: `${module.color}20` }}
            >
              <Icon className="w-6 h-6" style={{ color: module.color }} />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-white text-sm sm:text-base truncate pr-2">{module.title}</h3>
                <span className="text-2xl font-black shrink-0" style={{ color: module.color }}>
                  {module.score}
                </span>
              </div>

              {/* Progress bar */}
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: `linear-gradient(90deg, ${module.color}, ${module.color}80)` }}
                  initial={{ width: 0 }}
                  animate={{ width: `${module.score}%` }}
                  transition={{ delay: delay + 0.3, duration: 0.8, ease: "easeOut" }}
                />
              </div>
            </div>

            {/* Chevron */}
            <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
              <ChevronDown className="w-5 h-5 text-white/50" />
            </motion.div>
          </div>
        </button>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className="px-5 pb-5 space-y-4">
                <div className="h-px bg-white/10" />

                <p className="text-sm text-white/70">{module.summary}</p>

                {/* Alerts */}
                {module.alerts && module.alerts.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {module.alerts.map((alert, i) => (
                      <Badge key={i} className="bg-red-500/20 text-red-400 border-red-500/30">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        {alert}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Key findings */}
                <div className="space-y-2">
                  {module.keyFindings.map((finding, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-start gap-2 text-sm"
                    >
                      <CircleDot className="w-4 h-4 mt-0.5 shrink-0" style={{ color: module.color }} />
                      <span className="text-white/70">{finding}</span>
                    </motion.div>
                  ))}
                </div>

                {/* Recommendations */}
                <div
                  className="rounded-xl p-4"
                  style={{ background: `${module.color}10`, border: `1px solid ${module.color}30` }}
                >
                  <h4 className="text-xs uppercase tracking-wider mb-2" style={{ color: module.color }}>
                    Recommandations
                  </h4>
                  <ul className="space-y-1">
                    {module.recommendations.map((rec, i) => (
                      <li key={i} className="text-sm text-white/80 flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" style={{ color: module.color }} />
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </GlassCard>
    </motion.div>
  );
}

// ============================================================================
// SUPPLEMENT PILL
// ============================================================================
function SupplementPill({ supplement, index }: { supplement: SupplementItem; index: number }) {
  const timingColors = {
    matin: { bg: "bg-amber-500/20", text: "text-amber-400", border: "border-amber-500/30" },
    midi: { bg: "bg-orange-500/20", text: "text-orange-400", border: "border-orange-500/30" },
    soir: { bg: "bg-blue-500/20", text: "text-blue-400", border: "border-blue-500/30" },
  };

  const colors = timingColors[supplement.timing];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.03 }}
      whileHover={{ scale: 1.03, y: -2 }}
      className={`rounded-xl p-3 border ${colors.bg} ${colors.border} cursor-default`}
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <span className="font-semibold text-sm text-white">{supplement.name}</span>
        <Badge variant="outline" className={`text-xs font-mono ${colors.text} border-current`}>
          {supplement.dosage}
        </Badge>
      </div>
      <p className="text-xs text-white/50">{supplement.purpose}</p>
    </motion.div>
  );
}

// ============================================================================
// PROTOCOL PHASE CARD
// ============================================================================
function ProtocolPhaseCard({
  phase,
  isActive,
  onClick,
}: {
  phase: { phase: number; title: string; duration: string };
  isActive: boolean;
  onClick: () => void;
}) {
  const phaseColors = [THEME.neonGreen, THEME.accentBlue, THEME.accentPurple];
  const color = phaseColors[phase.phase - 1];

  return (
    <motion.button
      onClick={onClick}
      className={`relative flex-1 min-w-[100px] p-4 rounded-xl text-left transition-all ${
        isActive ? "ring-2" : "hover:bg-white/5"
      }`}
      style={{
        background: isActive ? `${color}15` : "transparent",
        ringColor: isActive ? color : "transparent",
      }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="text-xs font-medium text-white/50">Phase {phase.phase}</div>
      <div className="font-bold text-white mt-1">{phase.title}</div>
      <div className="text-xs text-white/40 mt-1">{phase.duration}</div>

      {isActive && (
        <motion.div
          layoutId="activePhaseIndicator"
          className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-1 rounded-full"
          style={{ background: color }}
        />
      )}
    </motion.button>
  );
}

// ============================================================================
// METRIC CARD
// ============================================================================
function MetricCard({
  label,
  value,
  trend,
  icon: Icon,
  delay = 0,
}: {
  label: string;
  value: string;
  trend?: "up" | "down";
  icon: typeof Activity;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
    >
      <GlassCard className="p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center">
            <Icon className="w-5 h-5 text-white/60" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-white/50 uppercase tracking-wider">{label}</p>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-white">{value}</span>
              {trend && (
                <span className={trend === "up" ? "text-green-400" : "text-blue-400"}>
                  {trend === "up" ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                </span>
              )}
            </div>
          </div>
        </div>
      </GlassCard>
    </motion.div>
  );
}

// ============================================================================
// DAILY TIMELINE
// ============================================================================
function DailyTimeline() {
  const timeSlots = [
    { time: "07:00", label: "Reveil", icon: Sun, color: "#fbbf24", items: ["Lumiere naturelle 10min", "Supplements matin", "Petit-dej 40g prot"] },
    { time: "10:00", label: "Focus", icon: Brain, color: THEME.neonGreen, items: ["Deep work", "Dernier cafe", "Hydratation"] },
    { time: "12:30", label: "Midi", icon: Coffee, color: "#f97316", items: ["Repas equilibre", "Marche 10min", "Supplements midi"] },
    { time: "16:00", label: "Collation", icon: Zap, color: THEME.accentPurple, items: ["30g proteines", "Eviter sucre", "Pause active"] },
    { time: "19:00", label: "Diner", icon: Utensils, color: THEME.accentBlue, items: ["Glucides OK", "3h avant coucher", "Dernier repas"] },
    { time: "22:00", label: "Sleep", icon: Moon, color: "#6366f1", items: ["Supplements soir", "Zero ecran", "Coucher 22:30"] },
  ];

  return (
    <div className="relative">
      {/* Timeline line */}
      <div className="absolute left-6 top-0 bottom-0 w-px bg-gradient-to-b from-white/20 via-white/10 to-transparent" />

      <div className="space-y-4">
        {timeSlots.map((slot, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            className="relative flex gap-4 pl-12"
          >
            {/* Timeline dot */}
            <div
              className="absolute left-4 w-4 h-4 rounded-full border-2"
              style={{ borderColor: slot.color, background: `${slot.color}30` }}
            />

            {/* Content */}
            <GlassCard className="flex-1 p-4">
              <div className="flex items-center gap-3 mb-2">
                <slot.icon className="w-5 h-5" style={{ color: slot.color }} />
                <span className="font-mono text-sm text-white/50">{slot.time}</span>
                <span className="font-semibold text-white">{slot.label}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {slot.items.map((item, j) => (
                  <span key={j} className="text-xs px-2 py-1 rounded-full bg-white/5 text-white/60">
                    {item}
                  </span>
                ))}
              </div>
            </GlassCard>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// PREDICTIONS TIMELINE
// ============================================================================
function PredictionsTimeline() {
  const predictions = [
    { week: "S2", weight: "-2kg", hrv: "48ms", sleep: "7h", energy: "6/10" },
    { week: "S4", weight: "-5kg", hrv: "55ms", sleep: "7.5h", energy: "7/10" },
    { week: "S8", weight: "-8kg", hrv: "65ms", sleep: "7.5h", energy: "8/10" },
    { week: "S12", weight: "-11kg", hrv: "72ms", sleep: "7.5h", energy: "9/10" },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {predictions.map((pred, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
        >
          <GlassCard className="p-4 text-center" glowColor={i === 3 ? THEME.neonGreen : undefined}>
            <div
              className="text-2xl font-black mb-3"
              style={{ color: i === 3 ? THEME.neonGreen : "white" }}
            >
              {pred.week}
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-white/50">Poids</span>
                <span className="text-white font-medium">{pred.weight}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50">HRV</span>
                <span className="text-green-400 font-medium">{pred.hrv}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50">Sommeil</span>
                <span className="text-blue-400 font-medium">{pred.sleep}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50">Energie</span>
                <span className="text-amber-400 font-medium">{pred.energy}</span>
              </div>
            </div>
          </GlassCard>
        </motion.div>
      ))}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export function FullReport() {
  const [activePhase, setActivePhase] = useState(0);
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });

  const protocol = [
    { phase: 1, title: "RESET", duration: "J1-30", objectives: ["HRV", "Sommeil", "Stress"], keyActions: [] },
    { phase: 2, title: "BUILD", duration: "J31-60", objectives: ["Muscle", "Gras", "Force"], keyActions: [] },
    { phase: 3, title: "OPTIMIZE", duration: "J61-90", objectives: ["Performance", "Maintenance"], keyActions: [] },
  ];

  return (
    <div className="min-h-screen text-white" style={{ background: THEME.darkBg }}>
      <div className="max-w-6xl mx-auto px-4 py-8 sm:py-12 space-y-12">

        {/* ============================================================ */}
        {/* HERO HEADER */}
        {/* ============================================================ */}
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative overflow-hidden rounded-3xl p-6 sm:p-10"
          style={{
            background: "linear-gradient(135deg, rgba(14,252,109,0.1) 0%, rgba(0,127,245,0.1) 50%, rgba(168,85,247,0.1) 100%)",
            border: `1px solid ${THEME.cardBorder}`,
          }}
        >
          {/* Animated background */}
          <div className="absolute inset-0 opacity-30">
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-green-500 rounded-full blur-[150px] animate-pulse" />
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500 rounded-full blur-[150px] animate-pulse" style={{ animationDelay: "1s" }} />
          </div>

          <div className="relative flex flex-col lg:flex-row items-center gap-8">
            <GlowingScoreRing score={58} size={200} label="Score Global" />

            <div className="flex-1 text-center lg:text-left">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <Badge className="mb-4 bg-white/10 text-white border-white/20 text-xs uppercase tracking-widest">
                  <Sparkles className="w-3 h-3 mr-1" />
                  Audit Premium
                </Badge>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tighter"
                style={{ letterSpacing: "-0.04em" }}
              >
                NEUROCORE <span style={{ color: THEME.neonGreen }}>360</span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="text-white/60 mt-3 text-lg"
              >
                Audit Metabolique Complet - Julien R., 29 ans
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="flex flex-wrap items-center justify-center lg:justify-start gap-4 mt-6"
              >
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-white/40" />
                  <span className="text-white/60">2 Janvier 2026</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <User className="w-4 h-4 text-white/40" />
                  <span className="text-white/60">Coach: Achkan Zennadi</span>
                </div>
              </motion.div>
            </div>
          </div>
        </motion.section>

        {/* ============================================================ */}
        {/* KEY METRICS */}
        {/* ============================================================ */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard label="HRV Actuel" value="28ms" trend="down" icon={Heart} delay={0} />
          <MetricCard label="Deep Sleep" value="<10%" trend="down" icon={Moon} delay={0.1} />
          <MetricCard label="Dopamine" value="11/40" trend="down" icon={Brain} delay={0.2} />
          <MetricCard label="Masse Grasse" value="18%" trend="down" icon={Activity} delay={0.3} />
        </section>

        {/* ============================================================ */}
        {/* EXECUTIVE SUMMARY */}
        {/* ============================================================ */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <GlassCard className="p-6 sm:p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <h2 className="text-xl font-bold">Diagnostic</h2>
            </div>
            <p className="text-white/70 leading-relaxed text-lg">
              Ton profil revele un cas classique de <span className="text-red-400 font-semibold">"tech burnout metabolique"</span>:
              Systeme nerveux en mode SYMPATHIQUE permanent, deficit dopamine severe, architecture sommeil detruite.
              Sans intervention, risque de burnout clinique sous 12 mois.
            </p>
            <div className="flex flex-wrap gap-2 mt-4">
              <Badge className="bg-red-500/20 text-red-400 border-red-500/30">HRV 28ms</Badge>
              <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">4 cafes/jour</Badge>
              <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">5h sommeil</Badge>
              <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">Cortisol eleve</Badge>
            </div>
          </GlassCard>
        </motion.section>

        {/* ============================================================ */}
        {/* CHARTS SECTION */}
        {/* ============================================================ */}
        <section ref={sectionRef} className="grid lg:grid-cols-2 gap-6">
          {/* Radar Chart */}
          <GlassCard className="p-6">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5" style={{ color: THEME.neonGreen }} />
              Vue 360 - 12 Domaines
            </h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                  <PolarGrid stroke="rgba(255,255,255,0.1)" />
                  <PolarAngleAxis dataKey="domain" tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 11 }} />
                  <PolarRadiusAxis tick={false} axisLine={false} />
                  <Radar
                    name="Score"
                    dataKey="score"
                    stroke={THEME.neonGreen}
                    fill={THEME.neonGreen}
                    fillOpacity={0.2}
                    strokeWidth={2}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </GlassCard>

          {/* HRV Trend */}
          <GlassCard className="p-6">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5" style={{ color: THEME.accentBlue }} />
              Projection HRV 90 Jours
            </h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={hrvTrendData}>
                  <defs>
                    <linearGradient id="hrvGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={THEME.neonGreen} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={THEME.neonGreen} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="day" tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 12 }} axisLine={false} tickLine={false} domain={[20, 80]} />
                  <Tooltip
                    contentStyle={{ background: THEME.darkBg, border: `1px solid ${THEME.cardBorder}`, borderRadius: 8 }}
                    labelStyle={{ color: "white" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="hrv"
                    stroke={THEME.neonGreen}
                    strokeWidth={3}
                    fill="url(#hrvGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </GlassCard>
        </section>

        {/* ============================================================ */}
        {/* BODY COMPOSITION CHART */}
        {/* ============================================================ */}
        <GlassCard className="p-6">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5" style={{ color: THEME.accentPurple }} />
            Evolution Composition Corporelle
          </h3>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bodyCompData}>
                <XAxis dataKey="name" tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: THEME.darkBg, border: `1px solid ${THEME.cardBorder}`, borderRadius: 8 }}
                />
                <Bar dataKey="muscle" name="Muscle %" fill={THEME.neonGreen} radius={[4, 4, 0, 0]} />
                <Bar dataKey="fat" name="Gras %" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-6 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded" style={{ background: THEME.neonGreen }} />
              <span className="text-sm text-white/60">Muscle</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-red-500" />
              <span className="text-sm text-white/60">Gras</span>
            </div>
          </div>
        </GlassCard>

        {/* ============================================================ */}
        {/* MODULES ANALYSIS */}
        {/* ============================================================ */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Analyse par Module</h2>
            <Badge variant="outline" className="text-white/60 border-white/20">5 modules</Badge>
          </div>
          <div className="space-y-4">
            {sampleModules.map((module, i) => (
              <ModuleScoreBar key={module.id} module={module} delay={i * 0.1} />
            ))}
          </div>
        </section>

        {/* ============================================================ */}
        {/* PROTOCOL 90 DAYS */}
        {/* ============================================================ */}
        <section>
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
            <Calendar className="w-6 h-6" style={{ color: THEME.neonGreen }} />
            Protocole 90 Jours
          </h2>

          <GlassCard className="p-6">
            {/* Phase selector */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
              {protocol.map((phase, i) => (
                <ProtocolPhaseCard
                  key={i}
                  phase={phase}
                  isActive={activePhase === i}
                  onClick={() => setActivePhase(i)}
                />
              ))}
            </div>

            <Separator className="bg-white/10 mb-6" />

            {/* Daily timeline */}
            <h3 className="text-lg font-semibold mb-4">Journee Type - Phase {activePhase + 1}</h3>
            <DailyTimeline />
          </GlassCard>
        </section>

        {/* ============================================================ */}
        {/* SUPPLEMENTS */}
        {/* ============================================================ */}
        <section>
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
            <Pill className="w-6 h-6" style={{ color: THEME.accentBlue }} />
            Stack Supplements
          </h2>

          <div className="grid gap-6 md:grid-cols-3">
            {(["matin", "midi", "soir"] as const).map((timing) => (
              <div key={timing}>
                <div className="flex items-center gap-2 mb-3">
                  {timing === "matin" && <Sun className="w-5 h-5 text-amber-400" />}
                  {timing === "midi" && <Coffee className="w-5 h-5 text-orange-400" />}
                  {timing === "soir" && <Moon className="w-5 h-5 text-blue-400" />}
                  <span className="font-semibold capitalize text-white">{timing}</span>
                </div>
                <div className="space-y-2">
                  {sampleSupplements
                    .filter((s) => s.timing === timing)
                    .map((supp, i) => (
                      <SupplementPill key={i} supplement={supp} index={i} />
                    ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ============================================================ */}
        {/* PREDICTIONS */}
        {/* ============================================================ */}
        <section>
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
            <TrendingUp className="w-6 h-6" style={{ color: THEME.neonGreen }} />
            Predictions Resultats
          </h2>
          <PredictionsTimeline />
        </section>

        {/* ============================================================ */}
        {/* CONCLUSION CTA */}
        {/* ============================================================ */}
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <GlassCard
            className="p-8 sm:p-12 text-center relative overflow-hidden"
            glowColor={THEME.neonGreen}
          >
            <div className="absolute inset-0 opacity-20">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-green-500 via-blue-500 to-purple-500 rounded-full blur-[200px]" />
            </div>

            <div className="relative">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.6, type: "spring" }}
                className="w-20 h-20 mx-auto mb-6 rounded-2xl flex items-center justify-center"
                style={{ background: `${THEME.neonGreen}20` }}
              >
                <Zap className="w-10 h-10" style={{ color: THEME.neonGreen }} />
              </motion.div>

              <h2 className="text-3xl sm:text-4xl font-black mb-4" style={{ letterSpacing: "-0.04em" }}>
                Pret a <span style={{ color: THEME.neonGreen }}>hacker</span> ta biologie?
              </h2>

              <p className="text-white/60 max-w-xl mx-auto mb-8 text-lg">
                90 jours pour transformer ton metabolisme. Reveils sans alarm, energie stable,
                muscles visibles, ventre plat. Ce n'est pas un regime. C'est une reprogrammation neurometabolique.
              </p>

              <Button
                size="lg"
                className="rounded-full px-8 text-black font-bold"
                style={{ background: THEME.neonGreen }}
              >
                <Play className="w-5 h-5 mr-2" />
                Commencer le Protocole
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
          </GlassCard>
        </motion.section>

        {/* ============================================================ */}
        {/* FOOTER */}
        {/* ============================================================ */}
        <footer className="text-center text-white/40 text-sm py-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Award className="w-4 h-4" />
            <span>Coach: Achkan Zennadi - NEUROCORE 360</span>
          </div>
          <p>11 Certifications: ISSA | NASM | PN1 | Pre-Script</p>
        </footer>
      </div>
    </div>
  );
}

export default FullReport;
