/**
 * APEXLABS - Discovery Scan
 * TRUE Ultrahuman Design - 56 questions, 10 domaines
 */

import { useRef } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { motion, useScroll, useTransform } from "framer-motion";
import { Link } from "wouter";
import { ArrowRight, Check, Brain, Activity, Gauge, FileText } from "lucide-react";

// ============================================================================
// ANIMATED VISUALIZATION - Brain Scan (Detection)
// ============================================================================
function BrainScanVisual() {
  const nodes = Array.from({ length: 8 }, (_, i) => ({
    id: i,
    angle: (i / 8) * Math.PI * 2,
    radius: 35,
  }));

  return (
    <div className="relative w-full h-full bg-gradient-to-br from-[#FCDD00]/10 via-black to-[#FCDD00]/5 flex items-center justify-center overflow-hidden rounded-sm border border-white/5">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(252,221,0,0.1)_0%,_transparent_70%)]" />

      {/* Grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage: `linear-gradient(rgba(252,221,0,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(252,221,0,0.5) 1px, transparent 1px)`,
          backgroundSize: '20px 20px'
        }}
      />

      {/* Central Brain Icon */}
      <motion.div
        className="absolute z-10"
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      >
        <div className="w-20 h-20 rounded-full bg-[#FCDD00]/20 border border-[#FCDD00]/30 flex items-center justify-center">
          <Brain className="w-10 h-10 text-[#FCDD00]" />
        </div>
      </motion.div>

      {/* Orbiting Nodes */}
      {nodes.map((node, i) => (
        <motion.div
          key={node.id}
          className="absolute w-3 h-3 rounded-full bg-[#FCDD00]"
          style={{
            left: '50%',
            top: '50%',
          }}
          animate={{
            x: [
              Math.cos(node.angle) * node.radius,
              Math.cos(node.angle + Math.PI * 2) * node.radius,
            ],
            y: [
              Math.sin(node.angle) * node.radius,
              Math.sin(node.angle + Math.PI * 2) * node.radius,
            ],
            opacity: [0.4, 1, 0.4],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "linear",
            delay: i * 0.2,
          }}
        />
      ))}

      {/* Pulse Rings */}
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="absolute w-32 h-32 rounded-full border border-[#FCDD00]/30"
          animate={{
            scale: [1, 2, 2.5],
            opacity: [0.5, 0.2, 0],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            delay: i * 1,
            ease: "easeOut",
          }}
        />
      ))}

      {/* Corner Data */}
      <div className="absolute bottom-4 left-4 text-xs font-mono text-[#FCDD00]/80">
        <div>SCAN EN COURS</div>
        <motion.div
          className="text-white/60"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          10 DOMAINES
        </motion.div>
      </div>
    </div>
  );
}

// ============================================================================
// ANIMATED VISUALIZATION - Score Gauge
// ============================================================================
function ScoreGaugeVisual() {
  return (
    <div className="relative w-full h-full bg-gradient-to-br from-[#FCDD00]/10 via-black to-[#FCDD00]/5 flex items-center justify-center overflow-hidden rounded-sm border border-white/5">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(252,221,0,0.1)_0%,_transparent_70%)]" />

      {/* Gauge SVG */}
      <svg viewBox="0 0 100 60" className="w-48 h-28">
        {/* Background arc */}
        <path
          d="M 10 50 A 40 40 0 0 1 90 50"
          fill="none"
          stroke="rgba(252,221,0,0.1)"
          strokeWidth="8"
          strokeLinecap="round"
        />
        {/* Animated fill arc */}
        <motion.path
          d="M 10 50 A 40 40 0 0 1 90 50"
          fill="none"
          stroke="#FCDD00"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray="126"
          initial={{ strokeDashoffset: 126 }}
          animate={{ strokeDashoffset: [126, 40, 126] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />
        {/* Center score */}
        <motion.text
          x="50"
          y="48"
          textAnchor="middle"
          className="fill-white font-bold"
          style={{ fontSize: '16px' }}
          animate={{ opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <tspan className="fill-[#FCDD00]">78</tspan>
          <tspan className="fill-white/50" style={{ fontSize: '8px' }}>/100</tspan>
        </motion.text>
      </svg>

      {/* Data Points */}
      <div className="absolute bottom-4 right-4 text-xs font-mono text-right">
        <motion.div
          className="text-[#FCDD00]"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          SCORE GLOBAL
        </motion.div>
        <div className="text-white/40">Mis a jour en temps reel</div>
      </div>

      {/* Floating indicators */}
      {[
        { label: "Energie", value: 82, x: 15, y: 20 },
        { label: "Sommeil", value: 65, x: 75, y: 25 },
        { label: "Stress", value: 71, x: 20, y: 75 },
      ].map((item, i) => (
        <motion.div
          key={i}
          className="absolute text-xs font-mono"
          style={{ left: `${item.x}%`, top: `${item.y}%` }}
          animate={{ opacity: [0.3, 0.8, 0.3], y: [0, -3, 0] }}
          transition={{ duration: 2, repeat: Infinity, delay: i * 0.5 }}
        >
          <span className="text-white/40">{item.label}</span>
          <span className="text-[#FCDD00] ml-1">{item.value}</span>
        </motion.div>
      ))}
    </div>
  );
}

// ============================================================================
// ANIMATED VISUALIZATION - Report Document
// ============================================================================
function ReportDocVisual() {
  const lines = Array.from({ length: 8 }, (_, i) => i);

  return (
    <div className="relative w-full h-full bg-gradient-to-br from-[#FCDD00]/10 via-black to-[#FCDD00]/5 flex items-center justify-center overflow-hidden rounded-sm border border-white/5">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(252,221,0,0.1)_0%,_transparent_70%)]" />

      {/* Document Shape */}
      <motion.div
        className="relative w-32 h-44 bg-black/50 border border-white/10 rounded-sm overflow-hidden"
        animate={{ y: [0, -5, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      >
        {/* Header */}
        <div className="h-8 bg-[#FCDD00]/20 border-b border-white/10 flex items-center px-3">
          <FileText className="w-4 h-4 text-[#FCDD00]" />
          <div className="ml-2 w-12 h-2 bg-[#FCDD00]/40 rounded" />
        </div>

        {/* Content lines */}
        <div className="p-3 space-y-2">
          {lines.map((i) => (
            <motion.div
              key={i}
              className="h-1.5 bg-white/10 rounded"
              style={{ width: `${60 + Math.random() * 40}%` }}
              animate={{ opacity: [0.3, 0.7, 0.3], scaleX: [0.95, 1, 0.95] }}
              transition={{ duration: 2, repeat: Infinity, delay: i * 0.15 }}
            />
          ))}
        </div>

        {/* Chart placeholder */}
        <div className="absolute bottom-3 left-3 right-3 h-8 border border-white/10 rounded overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-[#FCDD00]/30 to-[#FCDD00]/10"
            animate={{ scaleX: [0.3, 1, 0.3] }}
            transition={{ duration: 3, repeat: Infinity }}
            style={{ transformOrigin: 'left' }}
          />
        </div>
      </motion.div>

      {/* Floating badges */}
      {["5-7 pages", "PDF"].map((label, i) => (
        <motion.div
          key={i}
          className="absolute px-2 py-1 bg-[#FCDD00]/10 border border-[#FCDD00]/30 rounded text-xs font-mono text-[#FCDD00]"
          style={{
            right: i === 0 ? '10%' : '15%',
            top: i === 0 ? '20%' : '70%',
          }}
          animate={{ opacity: [0.5, 1, 0.5], scale: [0.95, 1, 0.95] }}
          transition={{ duration: 2, repeat: Infinity, delay: i * 0.5 }}
        >
          {label}
        </motion.div>
      ))}
    </div>
  );
}

export default function AuditGratuit() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"]
  });

  const heroOpacity = useTransform(scrollYProgress, [0, 0.3], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.3], [1, 0.95]);

  return (
    <div ref={containerRef} className="bg-[#050505] min-h-screen">
      <Header />

      {/* HERO - Full Viewport */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Background with Grid */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-b from-[#050505] via-[#050505] to-[#050505]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#FCDD00]/5 rounded-full blur-[150px]" />
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
          {/* Eyebrow - Monospace */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-[#FCDD00] text-xs font-mono tracking-[0.3em] uppercase mb-8"
          >
            [ ANALYSE GRATUITE ]
          </motion.p>

          {/* Main Headline - TRUE Ultrahuman Style (9.6rem-12.5rem) */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="text-white text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black leading-[0.9] tracking-tighter mb-8"
          >
            Discover what's
            <br />
            <span className="text-[#FCDD00]">holding you back.</span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="text-white/60 text-lg sm:text-xl max-w-2xl mx-auto mb-12 leading-relaxed"
          >
            ~50 questions sur 10 domaines essentiels: sommeil, stress, energie, digestion,
            entrainement, nutrition, lifestyle. J'identifie tes blocages metaboliques et hormonaux.
          </motion.p>

          {/* CTA Button - Ultrahuman Green */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            <Link href="/questionnaire">
              <button className="group inline-flex items-center gap-3 bg-[#FCDD00] text-black font-semibold text-base px-8 py-4 rounded-sm hover:bg-[#FCDD00]/90 transition-all duration-300 hover:scale-[1.02] hover:-translate-y-0.5">
                Commencer le scan
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </Link>
          </motion.div>

          {/* Trust Badge */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.7 }}
            className="text-white/40 text-sm mt-8"
          >
            Scans complétés avec succès
          </motion.p>
        </motion.div>

        {/* Scroll Indicator */}
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

      {/* DETECTION DES BLOCAGES - Text + Image */}
      <section className="py-32 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-center">
            {/* Text */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              <p className="text-[#FCDD00] text-sm font-medium tracking-[0.2em] uppercase mb-6">
                Detection
              </p>
              <h2 className="text-white text-4xl sm:text-5xl font-bold tracking-[-0.04em] mb-6 leading-tight">
                Identifie ce qui te bloque vraiment.
              </h2>
              <p className="text-white/50 text-lg leading-relaxed mb-8">
                56 questions ciblees analysent chaque aspect de ta sante : sommeil,
                hormones, digestion, stress, metabolisme, lifestyle. Je detecte
                les desequilibres caches que tu ne soupconnes meme pas.
              </p>
              <ul className="space-y-4">
                {["10 domaines analyses en profondeur", "Patterns metaboliques identifies", "Desequilibres hormonaux reveles"].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-white/70">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#FCDD00]" />
                    {item}
                  </li>
                ))}
              </ul>
            </motion.div>

            {/* Animated Visual */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative"
            >
              <div className="aspect-[4/3]">
                <BrainScanVisual />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* SCORE GLOBAL - Text + Image (reversed) */}
      <section className="py-32 px-6 border-t border-white/5">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-center">
            {/* Animated Visual - Left on desktop */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="relative order-2 lg:order-1"
            >
              <div className="aspect-[4/3]">
                <ScoreGaugeVisual />
              </div>
            </motion.div>

            {/* Text - Right on desktop */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="order-1 lg:order-2"
            >
              <p className="text-[#FCDD00] text-sm font-medium tracking-[0.2em] uppercase mb-6">
                Score
              </p>
              <h2 className="text-white text-4xl sm:text-5xl font-bold tracking-[-0.04em] mb-6 leading-tight">
                Un score global sur 100.
              </h2>
              <p className="text-white/50 text-lg leading-relaxed mb-8">
                Ton score reflète l'etat actuel de ton systeme. Plus il est bas,
                plus tu as de leviers d'amelioration. Je te montre exactement
                où tu perds des points et pourquoi.
              </p>
              <ul className="space-y-4">
                {["Visualisation claire de tes forces", "Points faibles identifies", "Priorites d'action revelees"].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-white/70">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#FCDD00]" />
                    {item}
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      {/* RAPPORT DETAILLE - Text + Image */}
      <section className="py-32 px-6 border-t border-white/5">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-center">
            {/* Text */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              <p className="text-[#FCDD00] text-sm font-medium tracking-[0.2em] uppercase mb-6">
                Rapport
              </p>
              <h2 className="text-white text-4xl sm:text-5xl font-bold tracking-[-0.04em] mb-6 leading-tight">
                5-7 pages de diagnostic.
              </h2>
              <p className="text-white/50 text-lg leading-relaxed mb-8">
                Pas de blabla. Un rapport clair qui te dit exactement ce qui
                ne va pas. Chaque section explique tes resultats et ce qu'ils
                signifient pour ta sante au quotidien.
              </p>
              <ul className="space-y-4">
                {["Executive summary clair", "Analyse par domaine", "Points d'attention prioritaires"].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-white/70">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#FCDD00]" />
                    {item}
                  </li>
                ))}
              </ul>
            </motion.div>

            {/* Animated Visual */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative"
            >
              <div className="aspect-[4/3]">
                <ReportDocVisual />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* WHAT WE ANALYZE - Sticky Scroll */}
      <section className="py-32 px-6 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-start">
            {/* Sticky Left */}
            <div className="lg:sticky lg:top-32">
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
              >
                <p className="text-[#FCDD00] text-sm font-medium tracking-[0.2em] uppercase mb-6">
                  Analyse Complete
                </p>
                <h2 className="text-white text-4xl sm:text-5xl font-bold tracking-[-0.04em] mb-6">
                  Chaque aspect de ta sante, decode.
                </h2>
                <p className="text-white/50 text-lg leading-relaxed">
                  J'analyse tes reponses pour identifier les desequilibres
                  caches qui limitent ta performance.
                </p>
              </motion.div>
            </div>

            {/* Right - Scrollable List */}
            <div className="space-y-6">
              {[
                { title: "Energie & Vitalite", desc: "Niveaux d'energie, fatigue chronique, cycles circadiens" },
                { title: "Sommeil & Recuperation", desc: "Qualite du sommeil, phases de recuperation, insomnies" },
                { title: "Hormones", desc: "Testosterone, cortisol, thyroide, insuline" },
                { title: "Metabolisme", desc: "Digestion, absorption, microbiome, sensibilites" },
                { title: "Stress & Mental", desc: "Charge mentale, anxiete, burnout, resilience" },
                { title: "Biomecanique", desc: "Posture, douleurs, mobilite, compensations" },
                { title: "Performance", desc: "Force, endurance, recuperation musculaire" },
              ].map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="group p-6 rounded-sm border border-white/5 hover:border-[#FCDD00]/20 bg-white/[0.01] hover:bg-white/[0.02] transition-all duration-300"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-2 h-2 rounded-full bg-[#FCDD00] mt-2 group-hover:scale-125 transition-transform" />
                    <div>
                      <h3 className="text-white text-lg font-semibold mb-1">{item.title}</h3>
                      <p className="text-white/40 text-sm">{item.desc}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* COMPARISON */}
      <section className="py-32 px-6 bg-gradient-to-b from-black to-[#050505]">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-white text-4xl sm:text-5xl font-bold tracking-[-0.04em] mb-6">
              Gratuit vs Premium
            </h2>
            <p className="text-white/50 text-lg">
              Le Discovery Scan te donne le diagnostic. Les offres premium te donnent les solutions.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Free */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="rounded-sm border border-white/10 bg-white/[0.03] backdrop-blur-xl p-8 hover:border-white/20 transition-all duration-300"
            >
              <div className="text-[#FCDD00] text-sm font-medium tracking-[0.15em] uppercase mb-4">Discovery Scan</div>
              <div className="text-white text-5xl font-bold tracking-[-0.04em] mb-6">Gratuit</div>
              <ul className="space-y-4">
                {[
                  "Diagnostic complet 10 domaines",
                  "Score global sur 100",
                  "Identification des blocages",
                  "Rapport 5-7 pages",
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-white/70">
                    <Check className="w-5 h-5 text-[#FCDD00]" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link href="/questionnaire">
                <button className="w-full mt-8 bg-[#FCDD00] text-black font-semibold py-4 rounded-sm hover:bg-[#FCDD00]/90 transition-all">
                  Commencer
                </button>
              </Link>
            </motion.div>

            {/* Premium */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="rounded-sm border border-[#FCDD00]/30 bg-gradient-to-b from-[#FCDD00]/10 to-transparent backdrop-blur-xl p-8 hover:border-[#FCDD00]/50 transition-all duration-300 shadow-[0_0_60px_rgba(252,221,0,0.1)]"
            >
              <div className="text-[#FCDD00] text-sm font-medium tracking-[0.15em] uppercase mb-4">Anabolic Bioscan</div>
              <div className="text-white text-5xl font-bold tracking-[-0.04em] mb-6">59€</div>
              <ul className="space-y-4">
                {[
                  "Tout le Discovery Scan",
                  "Protocoles d'action personnalises",
                  "Stack supplements optimise",
                  "Plan 30-60-90 jours",
                  "17 sections d'analyse",
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-white/70">
                    <Check className="w-5 h-5 text-[#FCDD00]" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link href="/offers/anabolic-bioscan">
                <button className="w-full mt-8 bg-white/10 text-white font-semibold py-4 rounded-sm border border-white/10 hover:bg-white/20 transition-all">
                  En savoir plus
                </button>
              </Link>
            </motion.div>
          </div>
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
            Pret a decouvrir
            <br />
            <span className="text-[#FCDD00]">tes blocages ?</span>
          </h2>
          <p className="text-white/50 text-lg mb-12 max-w-xl mx-auto">
            5 minutes. 56 questions. Un diagnostic qui peut tout changer.
          </p>
          <Link href="/questionnaire">
            <button className="group inline-flex items-center gap-3 bg-[#FCDD00] text-black font-semibold text-base px-8 py-4 rounded-sm hover:bg-[#FCDD00]/90 transition-all duration-300 hover:scale-[1.02] hover:-translate-y-0.5 shadow-[0_0_40px_rgba(252,221,0,0.3)]">
              Lancer mon Discovery Scan
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </Link>
        </motion.div>
      </section>

      <Footer />
    </div>
  );
}
