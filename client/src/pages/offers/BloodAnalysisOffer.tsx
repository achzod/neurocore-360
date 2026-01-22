/**
 * APEXLABS - Blood Analysis
 * Full Animations - 99€
 */

import { useRef } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { motion, useScroll, useTransform } from "framer-motion";
import { Link } from "wouter";
import { ArrowRight, Check, Upload, Beaker, Droplet, Activity, FileText } from "lucide-react";

// ============================================================================
// ANIMATED VISUALIZATION - DNA Helix (Blood Theme)
// ============================================================================
function DNAHelixVisual() {
  const points = Array.from({ length: 12 }, (_, i) => i);

  return (
    <div className="relative w-full h-full bg-gradient-to-br from-red-500/10 via-black to-red-500/5 flex items-center justify-center overflow-hidden rounded-sm border border-white/5">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(239,68,68,0.1)_0%,_transparent_70%)]" />

      {/* DNA Double Helix */}
      <div className="relative w-full h-48">
        {points.map((i) => {
          const yPos = (i / 11) * 100;
          const phase = (i * Math.PI) / 3;

          return (
            <motion.div key={i} className="absolute w-full" style={{ top: `${yPos}%` }}>
              {/* Left strand point */}
              <motion.div
                className="absolute w-3 h-3 rounded-full bg-red-500"
                animate={{
                  left: [`${30 + Math.sin(phase) * 20}%`, `${30 + Math.sin(phase + Math.PI) * 20}%`, `${30 + Math.sin(phase) * 20}%`],
                  opacity: [0.6, 1, 0.6],
                }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              />
              {/* Right strand point */}
              <motion.div
                className="absolute w-3 h-3 rounded-full bg-red-400"
                animate={{
                  left: [`${70 - Math.sin(phase) * 20}%`, `${70 - Math.sin(phase + Math.PI) * 20}%`, `${70 - Math.sin(phase) * 20}%`],
                  opacity: [0.6, 1, 0.6],
                }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              />
              {/* Connecting bar */}
              {i % 2 === 0 && (
                <motion.div
                  className="absolute h-[2px] bg-gradient-to-r from-red-500/60 via-red-400/80 to-red-500/60"
                  style={{ top: '6px' }}
                  animate={{
                    left: [`${32 + Math.sin(phase) * 20}%`, `${32 + Math.sin(phase + Math.PI) * 20}%`, `${32 + Math.sin(phase) * 20}%`],
                    width: [`${36 - Math.sin(phase) * 40}%`, `${36 - Math.sin(phase + Math.PI) * 40}%`, `${36 - Math.sin(phase) * 40}%`],
                  }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                />
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Pulse rings */}
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="absolute w-16 h-16 rounded-full border border-red-400/30"
          style={{ left: '50%', top: '50%', marginLeft: '-32px', marginTop: '-32px' }}
          animate={{
            scale: [1, 2.5, 3],
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

      {/* Status */}
      <div className="absolute bottom-4 left-4 text-xs font-mono">
        <motion.div
          className="text-red-400"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          ANALYSE ADN
        </motion.div>
        <div className="text-white/40">Biomarqueurs actifs</div>
      </div>
    </div>
  );
}

// ============================================================================
// ANIMATED VISUALIZATION - 6 Biomarker Panels
// ============================================================================
function BiomarkerPanelsVisual() {
  const panels = [
    { name: "HORMONAL", count: 10, color: "#A855F7" },
    { name: "THYROIDE", count: 5, color: "#3B82F6" },
    { name: "METABOLIQ", count: 9, color: "#EF4444" },
    { name: "INFLAMM", count: 5, color: "#F97316" },
    { name: "VITAMINES", count: 5, color: "#22C55E" },
    { name: "HEPATIQ", count: 5, color: "#06B6D4" },
  ];

  return (
    <div className="relative w-full h-full bg-gradient-to-br from-red-500/5 via-black to-purple-500/5 flex items-center justify-center overflow-hidden rounded-sm border border-white/5 p-4">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(239,68,68,0.05)_0%,_transparent_70%)]" />

      <div className="grid grid-cols-3 gap-3 w-full">
        {panels.map((panel, i) => (
          <motion.div
            key={i}
            className="relative rounded-sm p-3 overflow-hidden"
            style={{
              backgroundColor: `${panel.color}10`,
              border: `1px solid ${panel.color}30`,
            }}
            animate={{
              borderColor: [`${panel.color}30`, `${panel.color}60`, `${panel.color}30`],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              delay: i * 0.2,
            }}
          >
            {/* Fill bar animation */}
            <motion.div
              className="absolute bottom-0 left-0 right-0"
              style={{ backgroundColor: `${panel.color}20` }}
              animate={{
                height: ['0%', '100%', '0%'],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                delay: i * 0.3,
                ease: "easeInOut",
              }}
            />

            <div className="relative z-10">
              <motion.div
                className="text-2xl font-bold mb-1"
                style={{ color: panel.color }}
                animate={{ opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 2, repeat: Infinity, delay: i * 0.1 }}
              >
                {panel.count}
              </motion.div>
              <div className="text-[8px] font-mono text-white/50">{panel.name}</div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Total counter */}
      <div className="absolute top-4 right-4 text-right">
        <motion.div
          className="text-3xl font-bold text-red-400"
          animate={{ opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          39
        </motion.div>
        <div className="text-[10px] font-mono text-white/40">TOTAL</div>
      </div>
    </div>
  );
}

// ============================================================================
// ANIMATED VISUALIZATION - Blood Cells Flow
// ============================================================================
function BloodCellsVisual() {
  const cells = Array.from({ length: 15 }, (_, i) => ({
    id: i,
    size: 8 + Math.random() * 12,
    delay: Math.random() * 3,
    duration: 4 + Math.random() * 3,
    startY: Math.random() * 100,
    xOffset: Math.random() * 60 + 20,
  }));

  return (
    <div className="relative w-full h-full bg-gradient-to-br from-red-500/10 via-black to-red-500/5 flex items-center justify-center overflow-hidden rounded-sm border border-white/5">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(239,68,68,0.1)_0%,_transparent_70%)]" />

      {/* Flowing blood cells */}
      {cells.map((cell) => (
        <motion.div
          key={cell.id}
          className="absolute rounded-full"
          style={{
            width: cell.size,
            height: cell.size,
            background: `radial-gradient(circle at 30% 30%, #EF4444, #991B1B)`,
            boxShadow: '0 0 10px rgba(239,68,68,0.3)',
            left: `${cell.xOffset}%`,
          }}
          animate={{
            y: ['-20px', '250px'],
            x: [0, Math.sin(cell.id) * 30, 0],
            opacity: [0, 1, 1, 0],
          }}
          transition={{
            duration: cell.duration,
            repeat: Infinity,
            delay: cell.delay,
            ease: "linear",
          }}
        />
      ))}

      {/* Central droplet icon */}
      <motion.div
        className="relative z-10 w-20 h-20 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center"
        animate={{
          scale: [1, 1.1, 1],
          borderColor: ['rgba(239,68,68,0.4)', 'rgba(239,68,68,0.8)', 'rgba(239,68,68,0.4)'],
        }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <Droplet className="w-10 h-10 text-red-400" />
      </motion.div>

      {/* Vein lines */}
      <svg className="absolute inset-0 w-full h-full">
        <motion.path
          d="M 0 50% Q 25% 30%, 50% 50% T 100% 50%"
          fill="none"
          stroke="rgba(239,68,68,0.2)"
          strokeWidth="40"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      </svg>

      {/* Status */}
      <div className="absolute bottom-4 right-4 text-xs font-mono text-right">
        <motion.div
          className="text-red-400"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          FLUX SANGUIN
        </motion.div>
        <div className="text-white/40">Analyse en cours</div>
      </div>
    </div>
  );
}

// ============================================================================
// ANIMATED VISUALIZATION - Lab Report Generation
// ============================================================================
function LabReportVisual() {
  const lines = Array.from({ length: 8 }, (_, i) => i);

  return (
    <div className="relative w-full h-full bg-gradient-to-br from-white/5 via-black to-red-500/5 flex items-center justify-center overflow-hidden rounded-sm border border-white/5">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(255,255,255,0.02)_0%,_transparent_70%)]" />

      {/* Document */}
      <motion.div
        className="relative w-40 bg-white/5 border border-white/10 rounded-sm p-4 overflow-hidden"
        animate={{
          borderColor: ['rgba(255,255,255,0.1)', 'rgba(239,68,68,0.3)', 'rgba(255,255,255,0.1)'],
        }}
        transition={{ duration: 3, repeat: Infinity }}
      >
        {/* Header */}
        <div className="flex items-center gap-2 mb-4 pb-2 border-b border-white/10">
          <FileText className="w-4 h-4 text-red-400" />
          <span className="text-[10px] font-mono text-white/60">RAPPORT.PDF</span>
        </div>

        {/* Text lines appearing */}
        {lines.map((i) => (
          <motion.div
            key={i}
            className="h-2 rounded-full mb-2"
            style={{
              width: `${60 + Math.random() * 40}%`,
              backgroundColor: i === 0 ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.1)',
            }}
            initial={{ opacity: 0, width: 0 }}
            animate={{
              opacity: [0, 1, 1],
              width: [`0%`, `${60 + Math.random() * 40}%`],
            }}
            transition={{
              duration: 0.5,
              repeat: Infinity,
              repeatDelay: 4,
              delay: i * 0.2,
            }}
          />
        ))}

        {/* Scan line */}
        <motion.div
          className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-red-400/60 to-transparent"
          animate={{ top: ['0%', '100%'] }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        />
      </motion.div>

      {/* Processing indicators */}
      <div className="absolute top-4 left-4">
        <motion.div
          className="flex items-center gap-2"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1, repeat: Infinity }}
        >
          <div className="w-2 h-2 rounded-full bg-red-400" />
          <span className="text-[10px] font-mono text-red-400">GENERATING</span>
        </motion.div>
      </div>

      {/* Progress */}
      <div className="absolute bottom-4 left-4 right-4">
        <div className="h-1 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-red-400"
            animate={{ width: ['0%', '100%'] }}
            transition={{ duration: 3, repeat: Infinity }}
          />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function BloodAnalysisOffer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"]
  });

  const heroOpacity = useTransform(scrollYProgress, [0, 0.3], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.3], [1, 0.95]);

  const biomarkers = [
    { category: "Panel Hormonal", count: 10, color: "purple" },
    { category: "Panel Thyroidien", count: 5, color: "blue" },
    { category: "Panel Metabolique", count: 9, color: "red" },
    { category: "Panel Inflammatoire", count: 5, color: "orange" },
    { category: "Vitamines & Mineraux", count: 5, color: "green" },
    { category: "Hepatique & Renal", count: 5, color: "cyan" },
  ];

  return (
    <div ref={containerRef} className="bg-[#050505] min-h-screen">
      <Header />

      {/* HERO */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-b from-[#050505] via-[#050505] to-[#050505]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-red-500/5 rounded-full blur-[150px]" />
          <div className="absolute bottom-1/3 right-1/4 w-[400px] h-[400px] bg-blue-500/5 rounded-full blur-[120px]" />
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
            className="inline-flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-sm px-4 py-2 mb-8"
          >
            <span className="text-red-400 text-xs font-mono uppercase tracking-widest">[ ANALYSE SANGUINE ]</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="text-white text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black leading-[0.9] tracking-tighter mb-8"
          >
            Blood
            <br />
            <span className="text-red-400">Analysis.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="text-white/60 text-lg sm:text-xl max-w-2xl mx-auto mb-8 leading-relaxed"
          >
            Upload ton bilan sanguin. J'analyse 39 biomarqueurs sur 6 panels avec des ranges OPTIMAUX
            (pas juste "normaux"). Detection des patterns et protocoles personnalises.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="flex items-center justify-center gap-4 mb-12"
          >
            <span className="text-white text-6xl font-bold tracking-[-0.04em]">99€</span>
            <span className="text-white/40">one-time</span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            <Link href="/blood-analysis">
              <button className="group inline-flex items-center gap-3 bg-red-500 text-white font-semibold text-base px-8 py-4 rounded-sm hover:bg-red-400 transition-all duration-300 hover:scale-[1.02] hover:-translate-y-0.5 shadow-[0_0_40px_rgba(239,68,68,0.3)]">
                Analyser mon bilan
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

      {/* HOW IT WORKS */}
      <section className="py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <p className="text-red-400 text-sm font-medium tracking-[0.2em] uppercase mb-6">
              Comment ca marche
            </p>
            <h2 className="text-white text-4xl sm:text-5xl md:text-6xl font-bold tracking-[-0.04em]">
              3 etapes. C'est tout.
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { step: "01", title: "Upload", desc: "Telecharge ton bilan sanguin en PDF", icon: Upload },
              { step: "02", title: "Analyse", desc: "J'analyse 39 biomarqueurs", icon: Beaker },
              { step: "03", title: "Protocoles", desc: "Recois des recommandations personnalisees", icon: Check },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="relative overflow-hidden rounded-sm bg-white/[0.03] backdrop-blur-xl border border-white/10 p-10 hover:border-red-500/20 hover:-translate-y-1 transition-all duration-300"
              >
                <div className="text-red-500/20 text-8xl font-bold absolute top-4 right-4">{item.step}</div>
                <div className="relative z-10">
                  <div className="w-14 h-14 rounded-sm bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-6">
                    <item.icon className="w-7 h-7 text-red-400" />
                  </div>
                  <h3 className="text-white text-2xl font-bold mb-3">{item.title}</h3>
                  <p className="text-white/50">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* PDF WARNING */}
      <section className="py-16 px-6 border-t border-white/5">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-sm bg-gradient-to-br from-amber-500/10 to-orange-500/5 border border-amber-500/20 p-8"
          >
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-sm bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
                <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-white text-lg font-semibold mb-2">
                  PDF sans mot de passe requis
                </h3>
                <p className="text-white/60 mb-4 leading-relaxed">
                  Ton PDF de résultats sanguins ne doit pas avoir de mot de passe pour que notre système puisse l'analyser.
                </p>
                <div className="rounded-sm bg-white/5 border border-white/10 p-4">
                  <p className="text-white/80 text-sm mb-2 font-medium">
                    Si ton PDF est protégé :
                  </p>
                  <p className="text-white/60 text-sm">
                    Utilise{' '}
                    <a
                      href="https://www.ilovepdf.com/fr/debloquer_pdf"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-amber-400 hover:text-amber-300 underline"
                    >
                      iLovePDF
                    </a>
                    {' '}ou{' '}
                    <a
                      href="https://smallpdf.com/fr/deverrouiller-pdf"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-amber-400 hover:text-amber-300 underline"
                    >
                      SmallPDF
                    </a>
                    {' '}pour enlever le mot de passe avant de l'uploader.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* BLOOD CELLS + DNA SECTION */}
      <section className="py-32 px-6 border-t border-white/5">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              <p className="text-red-400 text-sm font-medium tracking-[0.2em] uppercase mb-6">
                Analyse Profonde
              </p>
              <h2 className="text-white text-4xl sm:text-5xl font-bold tracking-[-0.04em] mb-6 leading-tight">
                Ton sang,
                <br />
                <span className="text-red-400">decode.</span>
              </h2>
              <p className="text-white/50 text-lg leading-relaxed mb-8">
                Chaque biomarqueur est analyse, interprete et compare aux valeurs OPTIMALES
                (pas juste les ranges "normaux" du labo). Je detecte les patterns invisibles
                qui expliquent ta fatigue, tes blocages et tes performances.
              </p>
              <ul className="space-y-4">
                {[
                  "Ranges optimaux vs normaux",
                  "Detection patterns a risque",
                  "Correlations entre marqueurs",
                  "Protocoles correctifs cibles"
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-white/70">
                    <Check className="w-5 h-5 text-red-400" />
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
                <BloodCellsVisual />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 6 PANELS */}
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
                <BiomarkerPanelsVisual />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="order-1 lg:order-2"
            >
              <p className="text-red-400 text-sm font-medium tracking-[0.2em] uppercase mb-6">
                39 Biomarqueurs
              </p>
              <h2 className="text-white text-4xl sm:text-5xl font-bold tracking-[-0.04em] mb-6 leading-tight">
                6 panels.
                <br />
                <span className="text-red-400">Zero zone d'ombre.</span>
              </h2>
              <p className="text-white/50 text-lg leading-relaxed mb-8">
                Panel hormonal, thyroidien, metabolique, inflammatoire, vitamines et
                hepatique/renal. Chaque systeme analyse en detail pour une vision complete
                de ta biochimie.
              </p>
              <div className="grid grid-cols-2 gap-3">
                {biomarkers.map((item, i) => (
                  <motion.div
                    key={i}
                    className="px-3 py-2 bg-white/5 border border-white/10 rounded-sm"
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <span className="text-white/80 text-sm">{item.category}</span>
                    <span className="text-red-400 text-xs ml-2">({item.count})</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* DNA + REPORT SECTION */}
      <section className="py-32 px-6 border-t border-white/5">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              <p className="text-red-400 text-sm font-medium tracking-[0.2em] uppercase mb-6">
                Ton Rapport
              </p>
              <h2 className="text-white text-4xl sm:text-5xl font-bold tracking-[-0.04em] mb-6 leading-tight">
                Pas juste des chiffres.
                <br />
                <span className="text-red-400">Des reponses.</span>
              </h2>
              <p className="text-white/50 text-lg leading-relaxed mb-8">
                Un rapport PDF complet avec radars visuels, interpretation de chaque marqueur,
                detection des patterns a risque et protocoles de correction personnalises.
                Livraison sous 24-48h.
              </p>
              <ul className="space-y-4">
                {[
                  "Interpretation detaillee de chaque marqueur",
                  "Radars visuels par categorie",
                  "Protocoles supplements + lifestyle",
                  "Plan d'action prioritaire",
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-white/70">
                    <Check className="w-5 h-5 text-red-400" />
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
                <LabReportVisual />
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
            className="rounded-sm border border-red-500/30 bg-gradient-to-b from-red-500/10 to-transparent backdrop-blur-xl p-10 shadow-[0_0_60px_rgba(239,68,68,0.1)]"
          >
            <div className="grid sm:grid-cols-2 gap-6">
              {[
                "Analyse 39 biomarqueurs",
                "6 panels d'analyse",
                "Radars visuels interactifs",
                "Detection patterns a risque",
                "Interpretation personnalisee",
                "Protocoles de correction",
                "Stack supplements optimise",
                "Rapport PDF complet",
                "Livraison sous 24-48h",
                "Support par email",
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-red-400 flex-shrink-0" />
                  <span className="text-white/80">{item}</span>
                </div>
              ))}
            </div>

            <div className="mt-10 pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-6">
              <div>
                <span className="text-white text-5xl font-bold tracking-[-0.04em]">99€</span>
                <span className="text-white/40 ml-2">one-time</span>
              </div>
              <Link href="/blood-analysis">
                <button className="group inline-flex items-center gap-3 bg-red-500 text-white font-semibold text-base px-8 py-4 rounded-sm hover:bg-red-400 transition-all duration-300 hover:scale-[1.02] hover:-translate-y-0.5 shadow-[0_0_40px_rgba(239,68,68,0.3)]">
                  Analyser mon bilan
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
            Ton sang,
            <br />
            <span className="text-red-400">decode.</span>
          </h2>
          <p className="text-white/50 text-lg mb-12 max-w-xl mx-auto">
            Upload ton bilan. Je fais le reste.
            39 biomarqueurs analyses. Protocoles personnalises.
          </p>
          <Link href="/blood-analysis">
            <button className="group inline-flex items-center gap-3 bg-red-500 text-white font-semibold text-base px-8 py-4 rounded-sm hover:bg-red-400 transition-all duration-300 hover:scale-[1.02] hover:-translate-y-0.5 shadow-[0_0_40px_rgba(239,68,68,0.3)]">
              Lancer mon Blood Analysis — 99€
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </Link>
        </motion.div>
      </section>

      <Footer />
    </div>
  );
}
