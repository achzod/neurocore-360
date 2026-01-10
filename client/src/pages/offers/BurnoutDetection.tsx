/**
 * APEXLABS - Burnout Detection
 * Full Animations - 39€
 */

import { useRef } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { motion, useScroll, useTransform } from "framer-motion";
import { Link } from "wouter";
import { ArrowRight, Check, AlertTriangle, Battery, Zap, Brain, Heart, Activity } from "lucide-react";

// ============================================================================
// ANIMATED VISUALIZATION - Stress Gauge
// ============================================================================
function StressGaugeVisual() {
  return (
    <div className="relative w-full h-full bg-gradient-to-br from-purple-500/10 via-black to-amber-500/5 flex items-center justify-center overflow-hidden rounded-sm border border-white/5">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(168,85,247,0.1)_0%,_transparent_70%)]" />

      {/* Gauge SVG */}
      <svg viewBox="0 0 100 60" className="w-52 h-32">
        {/* Background arc */}
        <path
          d="M 10 50 A 40 40 0 0 1 90 50"
          fill="none"
          stroke="rgba(168,85,247,0.1)"
          strokeWidth="8"
          strokeLinecap="round"
        />
        {/* Gradient sections */}
        <defs>
          <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#22C55E" />
            <stop offset="50%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#EF4444" />
          </linearGradient>
        </defs>
        {/* Animated fill arc */}
        <motion.path
          d="M 10 50 A 40 40 0 0 1 90 50"
          fill="none"
          stroke="url(#gaugeGradient)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray="126"
          initial={{ strokeDashoffset: 126 }}
          animate={{ strokeDashoffset: [126, 50, 80, 40, 126] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        />
        {/* Needle */}
        <motion.line
          x1="50"
          y1="50"
          x2="50"
          y2="20"
          stroke="#A855F7"
          strokeWidth="2"
          strokeLinecap="round"
          style={{ transformOrigin: '50px 50px' }}
          animate={{ rotate: [-60, 30, 0, 45, -60] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        />
        {/* Center dot */}
        <circle cx="50" cy="50" r="4" fill="#A855F7" />
      </svg>

      {/* Labels */}
      <div className="absolute bottom-16 left-8 text-xs font-mono text-green-400">LOW</div>
      <div className="absolute bottom-16 right-8 text-xs font-mono text-red-400">HIGH</div>

      {/* Status */}
      <div className="absolute bottom-4 left-4 text-xs font-mono">
        <motion.div
          className="text-purple-400"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          STRESS LEVEL
        </motion.div>
        <div className="text-white/40">Evaluation en cours</div>
      </div>
    </div>
  );
}

// ============================================================================
// ANIMATED VISUALIZATION - Burnout Phases
// ============================================================================
function BurnoutPhasesVisual() {
  const phases = [
    { label: "ALARME", color: "#F59E0B", level: 30 },
    { label: "RESISTANCE", color: "#F97316", level: 60 },
    { label: "EPUISEMENT", color: "#EF4444", level: 90 },
  ];

  return (
    <div className="relative w-full h-full bg-gradient-to-br from-amber-500/10 via-black to-red-500/5 flex items-center justify-center overflow-hidden rounded-sm border border-white/5 p-6">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(245,158,11,0.05)_0%,_transparent_70%)]" />

      <div className="w-full space-y-6">
        {phases.map((phase, i) => (
          <div key={i} className="relative">
            <div className="flex justify-between mb-2">
              <span className="text-xs font-mono text-white/60">{phase.label}</span>
              <motion.span
                className="text-xs font-mono"
                style={{ color: phase.color }}
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
              >
                {phase.level}%
              </motion.span>
            </div>
            <div className="h-3 bg-white/5 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: phase.color }}
                animate={{ width: ['0%', `${phase.level}%`, '0%'] }}
                transition={{ duration: 4, repeat: Infinity, delay: i * 0.5, ease: "easeInOut" }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Warning pulse */}
      <motion.div
        className="absolute top-4 right-4"
        animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 1, repeat: Infinity }}
      >
        <AlertTriangle className="w-6 h-6 text-amber-400" />
      </motion.div>
    </div>
  );
}

// ============================================================================
// ANIMATED VISUALIZATION - Recovery Timeline
// ============================================================================
function RecoveryTimelineVisual() {
  const weeks = ["S1", "S2", "S3", "S4"];

  return (
    <div className="relative w-full h-full bg-gradient-to-br from-purple-500/10 via-black to-green-500/5 flex items-center justify-center overflow-hidden rounded-sm border border-white/5 p-6">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(168,85,247,0.05)_0%,_transparent_70%)]" />

      <div className="w-full">
        {/* Timeline bar */}
        <div className="relative h-2 bg-white/10 rounded-full mb-8">
          <motion.div
            className="absolute left-0 top-0 h-full bg-gradient-to-r from-purple-500 via-blue-500 to-green-500 rounded-full"
            animate={{ width: ['0%', '100%'] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>

        {/* Week markers */}
        <div className="flex justify-between">
          {weeks.map((week, i) => (
            <motion.div
              key={i}
              className="text-center"
              animate={{
                opacity: [0.3, 1, 0.3],
                y: [0, -3, 0],
              }}
              transition={{ duration: 2, repeat: Infinity, delay: i * 0.5 }}
            >
              <motion.div
                className="w-10 h-10 rounded-full border-2 flex items-center justify-center mb-2 mx-auto"
                style={{
                  borderColor: i === 0 ? '#A855F7' : i === 1 ? '#3B82F6' : i === 2 ? '#22D3EE' : '#22C55E',
                }}
                animate={{
                  backgroundColor: [
                    'transparent',
                    i === 0 ? 'rgba(168,85,247,0.2)' : i === 1 ? 'rgba(59,130,246,0.2)' : i === 2 ? 'rgba(34,211,238,0.2)' : 'rgba(34,197,94,0.2)',
                    'transparent'
                  ],
                }}
                transition={{ duration: 2, repeat: Infinity, delay: i * 0.5 }}
              >
                <span className="text-sm font-bold text-white/80">{week}</span>
              </motion.div>
              <span className="text-[10px] font-mono text-white/40">
                {i === 0 ? 'RESET' : i === 1 ? 'REPAIR' : i === 2 ? 'REBUILD' : 'RESTORE'}
              </span>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Status */}
      <div className="absolute top-4 left-4 text-xs font-mono">
        <motion.div
          className="text-green-400"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          RECOVERY PATH
        </motion.div>
        <div className="text-white/40">4 semaines</div>
      </div>
    </div>
  );
}

// ============================================================================
// ANIMATED VISUALIZATION - Nervous System Analysis
// ============================================================================
function NervousSystemVisual() {
  const waves = Array.from({ length: 5 }, (_, i) => i);

  return (
    <div className="relative w-full h-full bg-gradient-to-br from-purple-500/10 via-black to-purple-500/5 flex items-center justify-center overflow-hidden rounded-sm border border-white/5">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(168,85,247,0.1)_0%,_transparent_70%)]" />

      {/* Brain icon */}
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10"
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 3, repeat: Infinity }}
      >
        <div className="w-16 h-16 rounded-full bg-purple-500/20 border border-purple-500/40 flex items-center justify-center">
          <Brain className="w-8 h-8 text-purple-400" />
        </div>
      </motion.div>

      {/* HRV-like waves */}
      <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
        {waves.map((i) => (
          <motion.path
            key={i}
            d={`M 0 ${50 + i * 10} Q 25 ${30 + i * 10}, 50 ${50 + i * 10} T 100 ${50 + i * 10}`}
            fill="none"
            stroke={`rgba(168,85,247,${0.1 + i * 0.05})`}
            strokeWidth="1"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: [0, 1, 0] }}
            transition={{ duration: 3, repeat: Infinity, delay: i * 0.2 }}
          />
        ))}
      </svg>

      {/* Pulse rings */}
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="absolute w-20 h-20 rounded-full border border-purple-400/30"
          style={{ left: '50%', top: '50%', marginLeft: '-40px', marginTop: '-40px' }}
          animate={{
            scale: [1, 2, 2.5],
            opacity: [0.4, 0.1, 0],
          }}
          transition={{
            duration: 2.5,
            repeat: Infinity,
            delay: i * 0.8,
            ease: "easeOut",
          }}
        />
      ))}

      {/* Data indicators */}
      <div className="absolute top-4 right-4 space-y-2">
        {[
          { label: "HRV", value: "42ms", color: "#A855F7" },
          { label: "STRESS", value: "67%", color: "#F59E0B" },
        ].map((item, i) => (
          <motion.div
            key={i}
            className="flex items-center gap-2 text-xs font-mono"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
          >
            <span className="text-white/40">{item.label}</span>
            <span style={{ color: item.color }}>{item.value}</span>
          </motion.div>
        ))}
      </div>

      {/* Status */}
      <div className="absolute bottom-4 left-4 text-xs font-mono">
        <motion.div
          className="text-purple-400"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          SYSTEME NERVEUX
        </motion.div>
        <div className="text-white/40">Analyse en cours</div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function BurnoutDetection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"]
  });

  const heroOpacity = useTransform(scrollYProgress, [0, 0.3], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.3], [1, 0.95]);

  const phases = [
    { phase: "Alarme", desc: "Stress aigu, premiers signes", recovery: "2-4 semaines", color: "amber" },
    { phase: "Resistance", desc: "Adaptation chronique", recovery: "1-3 mois", color: "orange" },
    { phase: "Epuisement", desc: "Burnout installe", recovery: "3-12 mois", color: "red" },
  ];

  const symptoms = [
    "Fatigue chronique",
    "Troubles du sommeil",
    "Irritabilite",
    "Perte de motivation",
    "Difficulte a se concentrer",
    "Detachement emotionnel",
  ];

  return (
    <div ref={containerRef} className="bg-[#050505] min-h-screen">
      <Header />

      {/* HERO */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-b from-[#050505] via-[#050505] to-[#050505]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-purple-500/5 rounded-full blur-[150px]" />
          <div className="absolute top-1/3 right-1/3 w-[400px] h-[400px] bg-amber-500/5 rounded-full blur-[120px]" />
          {/* Tech Grid Overlay */}
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `linear-gradient(rgba(252,221,0,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(252,221,0,0.3) 1px, transparent 1px)`,
              backgroundSize: '60px 60px'
            }}
          />
        </div>

        <motion.div
          style={{ opacity: heroOpacity, scale: heroScale }}
          className="relative z-10 max-w-5xl mx-auto px-6 text-center"
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 bg-purple-500/10 border border-purple-500/20 rounded-sm px-4 py-2 mb-8"
          >
            <AlertTriangle className="w-4 h-4 text-purple-400" />
            <span className="text-purple-400 text-xs font-mono uppercase tracking-widest">[ DETECTION PRECOCE ]</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="text-white text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black leading-[0.9] tracking-tighter mb-8"
          >
            Burnout
            <br />
            <span className="text-purple-400">Engine.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="text-white/60 text-lg sm:text-xl max-w-2xl mx-auto mb-8 leading-relaxed"
          >
            Questionnaire specialise pour detecter les signes precoces du burnout.
            Score de risque + analyse systeme nerveux + protocole de recuperation 4 semaines.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="flex items-center justify-center gap-4 mb-12"
          >
            <span className="text-white text-6xl font-bold tracking-[-0.04em]">39€</span>
            <span className="text-white/40">one-time</span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            <Link href="/burnout-detection">
              <button className="group inline-flex items-center gap-3 bg-purple-500 text-white font-semibold text-base px-8 py-4 rounded-sm hover:bg-purple-400 transition-all duration-300 hover:scale-[1.02] hover:-translate-y-0.5 shadow-[0_0_40px_rgba(168,85,247,0.3)]">
                Evaluer mon risque
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </Link>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="absolute bottom-12 left-1/2 -translate-x-1/2"
        >
          <div className="w-6 h-10 rounded-full border-2 border-white/20 flex items-start justify-center p-2">
            <motion.div
              animate={{ y: [0, 12, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="w-1.5 h-1.5 bg-white/60 rounded-full"
            />
          </div>
        </motion.div>
      </section>

      {/* WARNING SIGNS */}
      <section className="py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <p className="text-purple-400 text-sm font-medium tracking-[0.2em] uppercase mb-6">
              Signaux d'alerte
            </p>
            <h2 className="text-white text-4xl sm:text-5xl md:text-6xl font-bold tracking-[-0.04em] mb-6">
              Tu te reconnais ?
            </h2>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
            {symptoms.map((symptom, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="group rounded-sm bg-white/[0.03] backdrop-blur-xl border border-white/10 p-6 hover:bg-white/[0.06] hover:border-purple-500/30 hover:-translate-y-0.5 transition-all duration-300"
              >
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-purple-400 group-hover:scale-125 transition-transform" />
                  <span className="text-white/70">{symptom}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* STRESS GAUGE + NERVOUS SYSTEM */}
      <section className="py-32 px-6 border-t border-white/5">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              <p className="text-purple-400 text-sm font-medium tracking-[0.2em] uppercase mb-6">
                Analyse Profonde
              </p>
              <h2 className="text-white text-4xl sm:text-5xl font-bold tracking-[-0.04em] mb-6 leading-tight">
                Ton niveau de stress,
                <br />
                <span className="text-purple-400">quantifie.</span>
              </h2>
              <p className="text-white/50 text-lg leading-relaxed mb-8">
                J'evalue ton niveau de stress et de fatigue a travers 80+ questions ciblees.
                Analyse du systeme nerveux, de la charge mentale et des patterns de recuperation.
              </p>
              <ul className="space-y-4">
                {[
                  "Score de stress sur 100",
                  "Analyse HRV et systeme nerveux",
                  "Detection des patterns de fatigue",
                  "Evaluation charge mentale"
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-white/70">
                    <Check className="w-5 h-5 text-purple-400" />
                    {item}
                  </li>
                ))}
              </ul>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative"
            >
              <div className="aspect-[4/3]">
                <StressGaugeVisual />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* BURNOUT PHASES */}
      <section className="py-32 px-6 border-t border-white/5">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="order-2 lg:order-1"
            >
              <div className="aspect-[4/3]">
                <BurnoutPhasesVisual />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="order-1 lg:order-2"
            >
              <p className="text-amber-400 text-sm font-medium tracking-[0.2em] uppercase mb-6">
                Les 3 Phases
              </p>
              <h2 className="text-white text-4xl sm:text-5xl font-bold tracking-[-0.04em] mb-6 leading-tight">
                Ou en es-tu
                <br />
                <span className="text-amber-400">exactement ?</span>
              </h2>
              <p className="text-white/50 text-lg leading-relaxed mb-8">
                Le burnout evolue en 3 phases. Plus tu detectes tot, plus la recuperation est rapide.
                Je t'identifie precisement ou tu te situes.
              </p>
              <div className="space-y-4">
                {phases.map((phase, i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-4 p-3 rounded-sm border ${
                      phase.color === 'amber' ? 'border-amber-500/20 bg-amber-500/5' :
                      phase.color === 'orange' ? 'border-orange-500/20 bg-orange-500/5' :
                      'border-red-500/20 bg-red-500/5'
                    }`}
                  >
                    <div className={`w-2 h-2 rounded-full ${
                      phase.color === 'amber' ? 'bg-amber-400' :
                      phase.color === 'orange' ? 'bg-orange-400' :
                      'bg-red-400'
                    }`} />
                    <div>
                      <span className="text-white/80 font-medium">{phase.phase}</span>
                      <span className="text-white/40 text-sm ml-2">— {phase.recovery}</span>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* NERVOUS SYSTEM */}
      <section className="py-32 px-6 border-t border-white/5">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              <p className="text-purple-400 text-sm font-medium tracking-[0.2em] uppercase mb-6">
                Systeme Nerveux
              </p>
              <h2 className="text-white text-4xl sm:text-5xl font-bold tracking-[-0.04em] mb-6 leading-tight">
                Ton cerveau,
                <br />
                <span className="text-purple-400">decode.</span>
              </h2>
              <p className="text-white/50 text-lg leading-relaxed mb-8">
                J'analyse les signaux de ton systeme nerveux: variabilite cardiaque,
                patterns de stress, capacite de recuperation. Je detecte les desequilibres
                avant qu'ils ne deviennent critiques.
              </p>
              <ul className="space-y-4">
                {[
                  "Analyse variabilite cardiaque (HRV)",
                  "Detection suractivation sympathique",
                  "Evaluation capacite de recuperation",
                  "Recommandations personnalisees"
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-white/70">
                    <Check className="w-5 h-5 text-purple-400" />
                    {item}
                  </li>
                ))}
              </ul>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative"
            >
              <div className="aspect-square">
                <NervousSystemVisual />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* RECOVERY TIMELINE */}
      <section className="py-32 px-6 border-t border-white/5">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="order-2 lg:order-1"
            >
              <div className="aspect-[4/3]">
                <RecoveryTimelineVisual />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="order-1 lg:order-2"
            >
              <p className="text-green-400 text-sm font-medium tracking-[0.2em] uppercase mb-6">
                Protocole 4 Semaines
              </p>
              <h2 className="text-white text-4xl sm:text-5xl font-bold tracking-[-0.04em] mb-6 leading-tight">
                Ta roadmap
                <br />
                <span className="text-green-400">de recuperation.</span>
              </h2>
              <p className="text-white/50 text-lg leading-relaxed mb-8">
                Un protocole structure semaine par semaine pour sortir du burnout.
                Reset, repair, rebuild, restore. Chaque phase a ses objectifs.
              </p>
              <ul className="space-y-4">
                {[
                  "S1: Reset — Couper les sources de stress",
                  "S2: Repair — Restaurer le sommeil et l'energie",
                  "S3: Rebuild — Reconstruire les habitudes saines",
                  "S4: Restore — Consolider et prevenir la rechute"
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-white/70">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                    {item}
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="py-32 px-6 border-t border-white/5">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-white text-4xl sm:text-5xl font-bold tracking-[-0.04em]">
              Tout ce qui est inclus.
            </h2>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-sm border border-purple-500/30 bg-gradient-to-b from-purple-500/10 to-transparent backdrop-blur-xl p-10 shadow-[0_0_60px_rgba(168,85,247,0.1)]"
          >
            <div className="grid sm:grid-cols-2 gap-6">
              {[
                "Score de risque burnout",
                "Identification phase actuelle",
                "Analyse stress & fatigue",
                "Analyse systeme nerveux",
                "Protocole recuperation 4 semaines",
                "Alertes personnalisees",
                "Recommandations quotidiennes",
                "Rapport PDF complet",
                "Livraison sous 24-48h",
                "Support par email",
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-purple-400 flex-shrink-0" />
                  <span className="text-white/80">{item}</span>
                </div>
              ))}
            </div>

            <div className="mt-10 pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-6">
              <div>
                <span className="text-white text-5xl font-bold tracking-[-0.04em]">39€</span>
                <span className="text-white/40 ml-2">one-time</span>
              </div>
              <Link href="/burnout-detection">
                <button className="group inline-flex items-center gap-3 bg-purple-500 text-white font-semibold text-base px-8 py-4 rounded-sm hover:bg-purple-400 transition-all duration-300 hover:scale-[1.02] hover:-translate-y-0.5 shadow-[0_0_40px_rgba(168,85,247,0.3)]">
                  Evaluer mon risque
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-32 px-6">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto text-center"
        >
          <h2 className="text-white text-4xl sm:text-5xl md:text-6xl font-bold tracking-[-0.04em] mb-8">
            Ne laisse pas
            <br />
            <span className="text-purple-400">le burnout gagner.</span>
          </h2>
          <p className="text-white/50 text-lg mb-12 max-w-xl mx-auto">
            Detecte les signaux faibles. Agis avant qu'il ne soit trop tard.
            Score de risque + protocole de recuperation.
          </p>
          <Link href="/burnout-detection">
            <button className="group inline-flex items-center gap-3 bg-purple-500 text-white font-semibold text-base px-8 py-4 rounded-sm hover:bg-purple-400 transition-all duration-300 hover:scale-[1.02] hover:-translate-y-0.5 shadow-[0_0_40px_rgba(168,85,247,0.3)]">
              Lancer mon Burnout Engine — 39€
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </Link>
        </motion.div>
      </section>

      <Footer />
    </div>
  );
}
