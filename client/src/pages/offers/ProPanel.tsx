/**
 * APEXLABS - Ultimate Scan
 * Full Animations - 79€
 */

import { useRef } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { motion, useScroll, useTransform } from "framer-motion";
import { Link } from "wouter";
import { ArrowRight, Check, Camera, Activity, Watch, User, Zap, Brain, Heart } from "lucide-react";

// ============================================================================
// ANIMATED VISUALIZATION - Photo Analysis (Face, Dos, Profil)
// ============================================================================
function PhotoAnalysisVisual() {
  const views = [
    { label: "FACE", icon: User },
    { label: "DOS", icon: User },
    { label: "PROFIL", icon: User },
  ];

  return (
    <div className="relative w-full h-full bg-gradient-to-br from-purple-500/10 via-black to-purple-500/5 flex items-center justify-center overflow-hidden rounded-sm border border-white/5">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(168,85,247,0.1)_0%,_transparent_70%)]" />

      {/* Grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage: `linear-gradient(rgba(168,85,247,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(168,85,247,0.5) 1px, transparent 1px)`,
          backgroundSize: '20px 20px'
        }}
      />

      {/* Three photo slots */}
      <div className="flex gap-4">
        {views.map((view, i) => (
          <motion.div
            key={i}
            className="relative w-20 h-28 bg-black/50 border border-purple-500/30 rounded-sm overflow-hidden"
            animate={{
              borderColor: ['rgba(168,85,247,0.3)', 'rgba(168,85,247,0.8)', 'rgba(168,85,247,0.3)'],
            }}
            transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
          >
            {/* Scan line */}
            <motion.div
              className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-purple-400 to-transparent"
              animate={{ top: ['0%', '100%', '0%'] }}
              transition={{ duration: 2, repeat: Infinity, delay: i * 0.2 }}
            />

            {/* Body outline placeholder */}
            <div className="absolute inset-0 flex items-center justify-center">
              <view.icon className="w-10 h-14 text-purple-500/30" />
            </div>

            {/* Label */}
            <div className="absolute bottom-1 left-0 right-0 text-center">
              <span className="text-[10px] font-mono text-purple-400/80">{view.label}</span>
            </div>

            {/* Corner markers */}
            <div className="absolute top-1 left-1 w-2 h-2 border-l border-t border-purple-400/60" />
            <div className="absolute top-1 right-1 w-2 h-2 border-r border-t border-purple-400/60" />
            <div className="absolute bottom-4 left-1 w-2 h-2 border-l border-b border-purple-400/60" />
            <div className="absolute bottom-4 right-1 w-2 h-2 border-r border-b border-purple-400/60" />
          </motion.div>
        ))}
      </div>

      {/* Status text */}
      <div className="absolute bottom-4 left-4 text-xs font-mono">
        <motion.div
          className="text-purple-400"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          ANALYSE POSTURALE
        </motion.div>
        <div className="text-white/40">Biomecanique en cours</div>
      </div>
    </div>
  );
}

// ============================================================================
// ANIMATED VISUALIZATION - Wearables Orbit
// ============================================================================
function WearablesOrbitVisual() {
  const devices = [
    { name: "OURA", angle: 0 },
    { name: "WHOOP", angle: 72 },
    { name: "GARMIN", angle: 144 },
    { name: "APPLE", angle: 216 },
    { name: "FITBIT", angle: 288 },
  ];

  return (
    <div className="relative w-full h-full bg-gradient-to-br from-cyan-500/10 via-black to-cyan-500/5 flex items-center justify-center overflow-hidden rounded-sm border border-white/5">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(34,211,238,0.1)_0%,_transparent_70%)]" />

      {/* Central watch icon */}
      <motion.div
        className="relative z-10 w-20 h-20 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center"
        animate={{ scale: [1, 1.1, 1], borderColor: ['rgba(34,211,238,0.3)', 'rgba(34,211,238,0.6)', 'rgba(34,211,238,0.3)'] }}
        transition={{ duration: 3, repeat: Infinity }}
      >
        <Watch className="w-10 h-10 text-cyan-400" />
      </motion.div>

      {/* Orbiting devices */}
      {devices.map((device, i) => {
        const radius = 90;
        const angleRad = (device.angle * Math.PI) / 180;

        return (
          <motion.div
            key={i}
            className="absolute px-2 py-1 bg-cyan-500/10 border border-cyan-500/30 rounded text-[10px] font-mono text-cyan-400"
            style={{
              left: '50%',
              top: '50%',
            }}
            animate={{
              x: [
                Math.cos(angleRad) * radius - 20,
                Math.cos(angleRad + Math.PI * 2) * radius - 20,
              ],
              y: [
                Math.sin(angleRad) * radius - 10,
                Math.sin(angleRad + Math.PI * 2) * radius - 10,
              ],
              opacity: [0.6, 1, 0.6],
            }}
            transition={{
              duration: 12,
              repeat: Infinity,
              ease: "linear",
              delay: i * 0.2,
            }}
          >
            {device.name}
          </motion.div>
        );
      })}

      {/* Pulse rings */}
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="absolute w-20 h-20 rounded-full border border-cyan-400/30"
          style={{ left: '50%', top: '50%', marginLeft: '-40px', marginTop: '-40px' }}
          animate={{
            scale: [1, 2.5, 3],
            opacity: [0.4, 0.1, 0],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            delay: i * 1,
            ease: "easeOut",
          }}
        />
      ))}

      {/* Connection lines */}
      <svg className="absolute inset-0 w-full h-full">
        {devices.map((device, i) => {
          const angleRad = (device.angle * Math.PI) / 180;
          const x = 50 + Math.cos(angleRad) * 30;
          const y = 50 + Math.sin(angleRad) * 30;
          return (
            <motion.line
              key={i}
              x1="50%"
              y1="50%"
              x2={`${x}%`}
              y2={`${y}%`}
              stroke="rgba(34,211,238,0.2)"
              strokeWidth="1"
              animate={{ opacity: [0.2, 0.5, 0.2] }}
              transition={{ duration: 2, repeat: Infinity, delay: i * 0.2 }}
            />
          );
        })}
      </svg>

      {/* Status */}
      <div className="absolute bottom-4 right-4 text-xs font-mono text-right">
        <motion.div
          className="text-cyan-400"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          DATA SYNC
        </motion.div>
        <div className="text-white/40">5 appareils</div>
      </div>
    </div>
  );
}

// ============================================================================
// ANIMATED VISUALIZATION - 22 Sections Grid
// ============================================================================
function SectionsGridVisual() {
  const sections = [
    "Profil", "Sante", "Sommeil", "Stress", "Energie", "Digestion",
    "Training", "Nutrition", "Lifestyle", "Mindset", "Hormones",
    "Clinique", "Supps", "Bio", "Compo", "Timing",
    "Cardio", "HRV", "Blessures", "Psy", "Photo", "+"
  ];

  return (
    <div className="relative w-full h-full bg-gradient-to-br from-[#FCDD00]/10 via-black to-[#FCDD00]/5 flex items-center justify-center overflow-hidden rounded-sm border border-white/5 p-4">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(252,221,0,0.1)_0%,_transparent_70%)]" />

      <div className="grid grid-cols-6 gap-1.5 w-full">
        {sections.map((section, i) => (
          <motion.div
            key={i}
            className="aspect-square rounded-sm bg-[#FCDD00]/5 border border-[#FCDD00]/20 flex items-center justify-center"
            animate={{
              borderColor: ['rgba(252,221,0,0.2)', 'rgba(252,221,0,0.6)', 'rgba(252,221,0,0.2)'],
              backgroundColor: ['rgba(252,221,0,0.05)', 'rgba(252,221,0,0.15)', 'rgba(252,221,0,0.05)'],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              delay: i * 0.08,
            }}
          >
            <span className="text-[8px] font-mono text-[#FCDD00]/80 text-center leading-tight">
              {section}
            </span>
          </motion.div>
        ))}
      </div>

      {/* Counter */}
      <div className="absolute top-4 right-4 text-right">
        <motion.div
          className="text-3xl font-bold text-[#FCDD00]"
          animate={{ opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          22
        </motion.div>
        <div className="text-[10px] font-mono text-white/40">SECTIONS</div>
      </div>
    </div>
  );
}

// ============================================================================
// ANIMATED VISUALIZATION - Data Integration Flow
// ============================================================================
function IntegrationVisual() {
  const sources = [
    { icon: Brain, label: "QUESTIONNAIRE", color: "#FCDD00" },
    { icon: Camera, label: "PHOTOS", color: "#A855F7" },
    { icon: Activity, label: "WEARABLES", color: "#22D3EE" },
  ];

  return (
    <div className="relative w-full h-full bg-gradient-to-br from-[#FCDD00]/5 via-black to-cyan-500/5 flex items-center justify-center overflow-hidden rounded-sm border border-white/5">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(252,221,0,0.05)_0%,_transparent_70%)]" />

      {/* Three input sources */}
      <div className="flex gap-8 items-center">
        {sources.map((source, i) => (
          <motion.div
            key={i}
            className="flex flex-col items-center gap-2"
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
          >
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ backgroundColor: `${source.color}20`, border: `1px solid ${source.color}40` }}
            >
              <source.icon className="w-6 h-6" style={{ color: source.color }} />
            </div>
            <span className="text-[8px] font-mono text-white/60">{source.label}</span>
          </motion.div>
        ))}
      </div>

      {/* Flow lines to center */}
      <motion.div
        className="absolute w-32 h-[2px] bg-gradient-to-r from-[#FCDD00]/50 to-transparent"
        style={{ left: '20%', top: '50%' }}
        animate={{ opacity: [0.3, 0.8, 0.3], scaleX: [0.8, 1, 0.8] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      />
      <motion.div
        className="absolute w-32 h-[2px] bg-gradient-to-l from-cyan-400/50 to-transparent"
        style={{ right: '20%', top: '50%' }}
        animate={{ opacity: [0.3, 0.8, 0.3], scaleX: [0.8, 1, 0.8] }}
        transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}
      />

      {/* Central output */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2 px-4 py-2 bg-white/5 border border-white/20 rounded-sm"
        animate={{
          borderColor: ['rgba(255,255,255,0.2)', 'rgba(252,221,0,0.5)', 'rgba(255,255,255,0.2)'],
        }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <div className="text-xs font-mono text-white/80">RAPPORT 40-50 PAGES</div>
      </motion.div>

      {/* Status */}
      <div className="absolute top-4 left-4 text-xs font-mono">
        <motion.div
          className="text-[#FCDD00]"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          INTEGRATION
        </motion.div>
        <div className="text-white/40">3 sources de donnees</div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function ProPanel() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"]
  });

  const heroOpacity = useTransform(scrollYProgress, [0, 0.3], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.3], [1, 0.95]);

  const sections = [
    "Profil de Base", "Sante & Historique", "Sommeil", "Stress & Nerveux",
    "Energie", "Digestion", "Entrainement", "Nutrition Base",
    "Lifestyle", "Mindset", "Nutrition Detaillee", "Hormones",
    "Axes Cliniques", "Supplements", "Biomarqueurs", "Composition Corporelle",
    "Nutrition Timing", "Cardio & Performance", "HRV & Cardiaque",
    "Blessures & Douleurs", "Psychologie & Mental", "Analyse Photo"
  ];

  return (
    <div ref={containerRef} className="bg-[#050505] min-h-screen">
      <Header />

      {/* HERO */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-b from-[#050505] via-[#050505] to-[#050505]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] bg-[#FCDD00]/5 rounded-full blur-[180px]" />
          <div className="absolute bottom-1/4 left-1/4 w-[500px] h-[500px] bg-cyan-500/5 rounded-full blur-[150px]" />
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
            className="inline-flex items-center gap-2 bg-[#FCDD00]/10 border border-[#FCDD00]/20 rounded-sm px-4 py-2 mb-8"
          >
            <span className="text-[#FCDD00] text-xs font-mono uppercase tracking-widest">[ MOST COMPLETE ]</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="text-white text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black leading-[0.9] tracking-tighter mb-8"
          >
            Ultimate
            <br />
            <span className="text-[#FCDD00]">Scan.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="text-white/60 text-lg sm:text-xl max-w-2xl mx-auto mb-8 leading-relaxed"
          >
            ~210 questions sur 22 sections + analyse photo posturale + integration wearables.
            Nutrition timing, cardio & performance (Zone 2, HRV), blessures & mobilite, psychologie.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="flex items-center justify-center gap-4 mb-12"
          >
            <span className="text-white text-6xl font-bold tracking-[-0.04em]">79€</span>
            <span className="text-white/40">one-time</span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            <Link href="/questionnaire?plan=pro">
              <button className="group inline-flex items-center gap-3 bg-[#FCDD00] text-black font-semibold text-base px-8 py-4 rounded-sm hover:bg-[#FCDD00]/90 transition-all duration-300 hover:scale-[1.02] hover:-translate-y-0.5 shadow-[0_0_40px_rgba(252,221,0,0.3)]">
                Commencer mon Ultimate Scan
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

      {/* TRIPLE SOURCE - With Animated Visual */}
      <section className="py-32 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              <p className="text-[#FCDD00] text-sm font-medium tracking-[0.2em] uppercase mb-6">
                Triple Source
              </p>
              <h2 className="text-white text-4xl sm:text-5xl font-bold tracking-[-0.04em] mb-6 leading-tight">
                3 sources de donnees.
                <br />
                <span className="text-white/50">Precision maximale.</span>
              </h2>
              <p className="text-white/50 text-lg leading-relaxed mb-8">
                Je croise les donnees de ton questionnaire, tes photos et tes wearables
                pour generer le rapport le plus complet et precis possible.
              </p>
              <ul className="space-y-4">
                {["210 questions sur 22 sections", "Analyse photo posturale et biomecanique", "Integration donnees wearables (HRV, sommeil, activite)"].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-white/70">
                    <Check className="w-5 h-5 text-[#FCDD00]" />
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
                <IntegrationVisual />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* PHOTO ANALYSIS */}
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
                <PhotoAnalysisVisual />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="order-1 lg:order-2"
            >
              <p className="text-purple-400 text-sm font-medium tracking-[0.2em] uppercase mb-6">
                Analyse Photo
              </p>
              <h2 className="text-white text-4xl sm:text-5xl font-bold tracking-[-0.04em] mb-6 leading-tight">
                Ton corps,
                <br />
                <span className="text-purple-400">cartographie.</span>
              </h2>
              <p className="text-white/50 text-lg leading-relaxed mb-8">
                Envoie 3 photos: face, dos, profil. J'analyse ta morphologie,
                ta posture et ta biomecanique pour detecter les desequilibres
                invisibles qui limitent ta progression.
              </p>
              <ul className="space-y-4">
                {[
                  "Analyse morphologique complete",
                  "Detection des desequilibres posturaux",
                  "Evaluation biomecanique",
                  "Protocoles correctifs personnalises"
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-white/70">
                    <Check className="w-5 h-5 text-purple-400" />
                    {item}
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      {/* WEARABLES */}
      <section className="py-32 px-6 border-t border-white/5">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              <p className="text-cyan-400 text-sm font-medium tracking-[0.2em] uppercase mb-6">
                Integration Wearables
              </p>
              <h2 className="text-white text-4xl sm:text-5xl font-bold tracking-[-0.04em] mb-6 leading-tight">
                Tes donnees,
                <br />
                <span className="text-cyan-400">amplifiees.</span>
              </h2>
              <p className="text-white/50 text-lg leading-relaxed mb-8">
                Connecte ta montre ou ton tracker. Je croise tes donnees de sommeil,
                HRV, frequence cardiaque et activite avec ton questionnaire pour
                detecter des patterns invisibles.
              </p>
              <ul className="space-y-4">
                {[
                  "Analyse HRV et detection du surmenage",
                  "Correlation sommeil / energie / performance",
                  "Detection precoce du surentrainement",
                  "Recommandations de recuperation"
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-white/70">
                    <Check className="w-5 h-5 text-cyan-400" />
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
                <WearablesOrbitVisual />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 22 SECTIONS */}
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
                <SectionsGridVisual />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="order-1 lg:order-2"
            >
              <p className="text-[#FCDD00] text-sm font-medium tracking-[0.2em] uppercase mb-6">
                22 Sections
              </p>
              <h2 className="text-white text-4xl sm:text-5xl font-bold tracking-[-0.04em] mb-6 leading-tight">
                L'analyse la plus
                <br />
                <span className="text-[#FCDD00]">complete.</span>
              </h2>
              <p className="text-white/50 text-lg leading-relaxed mb-8">
                Chaque aspect de ta sante et performance analyse en profondeur.
                Du sommeil a la psychologie, en passant par la nutrition timing
                et l'analyse HRV.
              </p>
              <div className="flex flex-wrap gap-2">
                {sections.slice(0, 12).map((section, i) => (
                  <motion.span
                    key={i}
                    className="px-3 py-1 text-xs font-mono bg-white/5 border border-white/10 rounded-sm text-white/60"
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.05 }}
                  >
                    {section}
                  </motion.span>
                ))}
                <span className="px-3 py-1 text-xs font-mono bg-[#FCDD00]/10 border border-[#FCDD00]/30 rounded-sm text-[#FCDD00]">
                  +10 autres
                </span>
              </div>
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
            className="rounded-sm border border-[#FCDD00]/30 bg-gradient-to-b from-[#FCDD00]/10 to-transparent backdrop-blur-xl p-10 shadow-[0_0_60px_rgba(252,221,0,0.1)]"
          >
            <div className="grid sm:grid-cols-2 gap-6">
              {[
                "Questionnaire 22 sections",
                "Analyse photo posturale",
                "Integration wearables",
                "Score global sur 100",
                "Protocole Matin Anti-Cortisol",
                "Protocole Soir Sommeil",
                "Protocole Digestion 14 Jours",
                "Stack Supplements personnalise",
                "Analyse biomecanique",
                "Plan 30-60-90 jours",
                "Rapport 40-50 pages PDF",
                "Support prioritaire",
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-[#FCDD00] flex-shrink-0" />
                  <span className="text-white/80">{item}</span>
                </div>
              ))}
            </div>

            <div className="mt-10 pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-6">
              <div>
                <span className="text-white text-5xl font-bold tracking-[-0.04em]">79€</span>
                <span className="text-white/40 ml-2">one-time</span>
              </div>
              <Link href="/questionnaire?plan=pro">
                <button className="group inline-flex items-center gap-3 bg-[#FCDD00] text-black font-semibold text-base px-8 py-4 rounded-sm hover:bg-[#FCDD00]/90 transition-all duration-300 hover:scale-[1.02] hover:-translate-y-0.5 shadow-[0_0_40px_rgba(252,221,0,0.3)]">
                  Commencer maintenant
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
            L'analyse
            <br />
            <span className="text-[#FCDD00]">la plus complete.</span>
          </h2>
          <p className="text-white/50 text-lg mb-12 max-w-xl mx-auto">
            Questionnaire + photos + wearables. 22 sections. 210 questions.
            Le maximum de donnees pour le maximum de resultats.
          </p>
          <Link href="/questionnaire?plan=pro">
            <button className="group inline-flex items-center gap-3 bg-[#FCDD00] text-black font-semibold text-base px-8 py-4 rounded-sm hover:bg-[#FCDD00]/90 transition-all duration-300 hover:scale-[1.02] hover:-translate-y-0.5 shadow-[0_0_40px_rgba(252,221,0,0.3)]">
              Lancer mon Ultimate Scan — 79€
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </Link>
        </motion.div>
      </section>

      <Footer />
    </div>
  );
}
