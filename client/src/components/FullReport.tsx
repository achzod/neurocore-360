import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChevronDown,
  Brain,
  Moon,
  Dumbbell,
  FlaskConical,
  Target,
  ArrowRight,
  Sparkles,
} from "lucide-react";

// ============================================================================
// THEME
// ============================================================================
const COLORS = {
  green: "#0efc6d",
  blue: "#3b82f6",
  purple: "#a855f7",
  orange: "#f97316",
  red: "#ef4444",
};

// ============================================================================
// DATA
// ============================================================================
const radarData = [
  { domain: "Profil", score: 52 },
  { domain: "Compo", score: 48 },
  { domain: "Metabo", score: 42 },
  { domain: "Nutri", score: 55 },
  { domain: "Digest", score: 45 },
  { domain: "Activite", score: 25 },
  { domain: "Sommeil", score: 35 },
  { domain: "HRV", score: 28 },
];

const hrvData = [
  { day: "J1", value: 28 },
  { day: "J30", value: 48 },
  { day: "J60", value: 62 },
  { day: "J90", value: 72 },
];

const modules = [
  { id: 1, title: "Profil Anthropometrique", score: 52, icon: Target, color: COLORS.green },
  { id: 2, title: "Neuro-Endocrinien", score: 38, icon: Brain, color: COLORS.purple },
  { id: 3, title: "Architecture Sommeil", score: 35, icon: Moon, color: COLORS.blue },
  { id: 4, title: "Digestion & Microbiote", score: 45, icon: FlaskConical, color: COLORS.orange },
  { id: 5, title: "Entrainement", score: 25, icon: Dumbbell, color: COLORS.red },
];

const supplements = [
  { name: "L-Tyrosine", dose: "1g", time: "Matin" },
  { name: "Omega-3", dose: "3g", time: "Matin" },
  { name: "Magnesium", dose: "400mg", time: "Soir" },
  { name: "Ashwagandha", dose: "600mg", time: "Soir" },
];

// ============================================================================
// ANIMATED SCORE
// ============================================================================
function AnimatedScore({ value }: { value: number }) {
  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className="text-7xl md:text-8xl font-black"
      style={{ color: COLORS.green }}
    >
      {value}
    </motion.span>
  );
}

// ============================================================================
// SCORE RING
// ============================================================================
function ScoreRing({ score }: { score: number }) {
  const circumference = 2 * Math.PI * 90;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative w-56 h-56 md:w-64 md:h-64">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 200 200">
        <circle
          cx="100"
          cy="100"
          r="90"
          fill="none"
          stroke="rgba(255,255,255,0.05)"
          strokeWidth="4"
        />
        <motion.circle
          cx="100"
          cy="100"
          r="90"
          fill="none"
          stroke={COLORS.green}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <AnimatedScore value={score} />
        <span className="text-white/40 text-sm mt-2 tracking-widest">SCORE GLOBAL</span>
      </div>
    </div>
  );
}

// ============================================================================
// MODULE ROW
// ============================================================================
function ModuleRow({ module, index }: { module: typeof modules[0]; index: number }) {
  const [open, setOpen] = useState(false);
  const Icon = module.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-6 border-b border-white/5 group"
      >
        <div className="flex items-center gap-4">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ backgroundColor: `${module.color}15` }}
          >
            <Icon className="w-5 h-5" style={{ color: module.color }} />
          </div>
          <span className="text-white text-lg">{module.title}</span>
        </div>
        <div className="flex items-center gap-6">
          <span className="text-3xl font-bold" style={{ color: module.color }}>
            {module.score}
          </span>
          <motion.div animate={{ rotate: open ? 180 : 0 }}>
            <ChevronDown className="w-5 h-5 text-white/30" />
          </motion.div>
        </div>
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
            <div className="py-6 pl-14 text-white/60 text-sm leading-relaxed">
              Analyse detaillee du module {module.title}. Score de {module.score}/100
              indiquant une zone d'optimisation prioritaire dans votre protocole 90 jours.
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ============================================================================
// STAT CARD
// ============================================================================
function StatCard({ label, value, unit, delay = 0 }: { label: string; value: string; unit?: string; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="p-6 rounded-2xl bg-white/[0.02] border border-white/5"
    >
      <p className="text-white/40 text-xs uppercase tracking-widest mb-2">{label}</p>
      <p className="text-white text-3xl font-bold">
        {value}
        {unit && <span className="text-white/40 text-lg ml-1">{unit}</span>}
      </p>
    </motion.div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export function FullReport() {
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Hero */}
      <section className="min-h-screen flex flex-col items-center justify-center px-6 relative">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-8"
          >
            <Sparkles className="w-4 h-4" style={{ color: COLORS.green }} />
            <span className="text-sm text-white/60">Audit Premium</span>
          </motion.div>

          <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-4">
            NEUROCORE <span style={{ color: COLORS.green }}>360</span>
          </h1>
          <p className="text-white/40 text-lg mb-12">Julien R. — 29 ans — 2 Janvier 2026</p>

          <ScoreRing score={58} />

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="mt-12 text-white/50 max-w-md mx-auto"
          >
            Tech burnout metabolique detecte. Systeme nerveux sature,
            dopamine epuisee, sommeil detruit.
          </motion.p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="absolute bottom-12"
        >
          <ChevronDown className="w-6 h-6 text-white/20 animate-bounce" />
        </motion.div>
      </section>

      {/* Stats Grid */}
      <section className="px-6 py-24 max-w-5xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="HRV" value="28" unit="ms" delay={0} />
          <StatCard label="Deep Sleep" value="<10" unit="%" delay={0.1} />
          <StatCard label="Dopamine" value="11" unit="/40" delay={0.2} />
          <StatCard label="Cortisol" value="Phase 2" delay={0.3} />
        </div>
      </section>

      {/* Radar Chart */}
      <section className="px-6 py-24 max-w-5xl mx-auto">
        <motion.h2
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-2xl font-bold mb-12 text-center"
        >
          Vue 360
        </motion.h2>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="h-80"
        >
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData}>
              <PolarGrid stroke="rgba(255,255,255,0.1)" />
              <PolarAngleAxis
                dataKey="domain"
                tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 12 }}
              />
              <Radar
                dataKey="score"
                stroke={COLORS.green}
                fill={COLORS.green}
                fillOpacity={0.1}
                strokeWidth={2}
              />
            </RadarChart>
          </ResponsiveContainer>
        </motion.div>
      </section>

      {/* Modules */}
      <section className="px-6 py-24 max-w-3xl mx-auto">
        <motion.h2
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-2xl font-bold mb-12"
        >
          Analyse par Module
        </motion.h2>
        <div>
          {modules.map((module, i) => (
            <ModuleRow key={module.id} module={module} index={i} />
          ))}
        </div>
      </section>

      {/* HRV Projection */}
      <section className="px-6 py-24 max-w-5xl mx-auto">
        <motion.h2
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-2xl font-bold mb-4"
        >
          Projection HRV
        </motion.h2>
        <p className="text-white/40 mb-12">Evolution estimee sur 90 jours</p>
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="h-64"
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={hrvData}>
              <defs>
                <linearGradient id="hrvGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={COLORS.green} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={COLORS.green} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="day"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 12 }}
              />
              <YAxis hide domain={[0, 100]} />
              <Area
                type="monotone"
                dataKey="value"
                stroke={COLORS.green}
                strokeWidth={2}
                fill="url(#hrvGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>
      </section>

      {/* Protocol */}
      <section className="px-6 py-24 max-w-3xl mx-auto">
        <motion.h2
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-2xl font-bold mb-4"
        >
          Protocole 90 Jours
        </motion.h2>
        <p className="text-white/40 mb-12">3 phases de reprogrammation</p>

        <div className="space-y-6">
          {[
            { phase: 1, title: "RESET", desc: "Restaurer sommeil et HRV", days: "J1-30" },
            { phase: 2, title: "BUILD", desc: "Recomposition corporelle", days: "J31-60" },
            { phase: 3, title: "OPTIMIZE", desc: "Performance maximale", days: "J61-90" },
          ].map((p, i) => (
            <motion.div
              key={p.phase}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="flex items-center gap-6 p-6 rounded-2xl bg-white/[0.02] border border-white/5"
            >
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-black font-bold"
                style={{ backgroundColor: COLORS.green }}
              >
                {p.phase}
              </div>
              <div className="flex-1">
                <h3 className="text-white font-semibold">{p.title}</h3>
                <p className="text-white/40 text-sm">{p.desc}</p>
              </div>
              <span className="text-white/30 text-sm">{p.days}</span>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Supplements */}
      <section className="px-6 py-24 max-w-3xl mx-auto">
        <motion.h2
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-2xl font-bold mb-12"
        >
          Stack Essentiel
        </motion.h2>

        <div className="grid grid-cols-2 gap-4">
          {supplements.map((s, i) => (
            <motion.div
              key={s.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="p-5 rounded-2xl bg-white/[0.02] border border-white/5"
            >
              <p className="text-white font-medium">{s.name}</p>
              <p className="text-white/40 text-sm mt-1">{s.dose} — {s.time}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-32 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="text-4xl md:text-5xl font-black mb-6">
            Pret a <span style={{ color: COLORS.green }}>transformer</span> ta biologie?
          </h2>
          <p className="text-white/40 max-w-md mx-auto mb-10">
            90 jours. Pas de raccourcis. Resultats mesurables.
          </p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="inline-flex items-center gap-3 px-8 py-4 rounded-full font-semibold text-black"
            style={{ backgroundColor: COLORS.green }}
          >
            Commencer
            <ArrowRight className="w-5 h-5" />
          </motion.button>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-12 text-center border-t border-white/5">
        <p className="text-white/30 text-sm">
          NEUROCORE 360 — Coach: Achkan Zennadi
        </p>
      </footer>
    </div>
  );
}

export default FullReport;
