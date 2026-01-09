/**
 * APEXLABS - Burnout Detection
 * TRUE Ultrahuman Design - 39€
 */

import { useRef } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { motion, useScroll, useTransform } from "framer-motion";
import { Link } from "wouter";
import { ArrowRight, Check, AlertTriangle, Battery, Zap } from "lucide-react";

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
            Le burnout ne previent pas. Detecte les signaux faibles avant qu'il ne soit trop tard.
            Score de risque + protocole de recuperation 4 semaines.
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

      {/* 3 PHASES */}
      <section className="py-32 px-6 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <p className="text-purple-400 text-sm font-medium tracking-[0.2em] uppercase mb-6">
              Les 3 Phases
            </p>
            <h2 className="text-white text-4xl sm:text-5xl font-bold tracking-[-0.04em] mb-6">
              Ou en es-tu ?
            </h2>
            <p className="text-white/50 text-lg max-w-2xl mx-auto">
              Le burnout evolue en 3 phases. Plus tu detectes tot, plus la recuperation est rapide.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {phases.map((phase, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className={`relative overflow-hidden rounded-sm border p-8 ${
                  phase.color === 'amber' ? 'border-amber-500/20 bg-amber-500/5' :
                  phase.color === 'orange' ? 'border-orange-500/20 bg-orange-500/5' :
                  'border-red-500/20 bg-red-500/5'
                }`}
              >
                <div className={`text-6xl font-bold mb-4 ${
                  phase.color === 'amber' ? 'text-amber-400/20' :
                  phase.color === 'orange' ? 'text-orange-400/20' :
                  'text-red-400/20'
                }`}>
                  0{i + 1}
                </div>
                <h3 className={`text-2xl font-bold mb-2 ${
                  phase.color === 'amber' ? 'text-amber-400' :
                  phase.color === 'orange' ? 'text-orange-400' :
                  'text-red-400'
                }`}>
                  {phase.phase}
                </h3>
                <p className="text-white/50 mb-4">{phase.desc}</p>
                <div className="flex items-center gap-2">
                  <Battery className={`w-4 h-4 ${
                    phase.color === 'amber' ? 'text-amber-400' :
                    phase.color === 'orange' ? 'text-orange-400' :
                    'text-red-400'
                  }`} />
                  <span className="text-white/40 text-sm">Recuperation: {phase.recovery}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* WHAT YOU GET */}
      <section className="py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <p className="text-purple-400 text-sm font-medium tracking-[0.2em] uppercase mb-6">
                Ton Analyse
              </p>
              <h2 className="text-white text-4xl sm:text-5xl font-bold tracking-[-0.04em] mb-6">
                Score de risque.
                <br />
                <span className="text-purple-400">Protocole 4 semaines.</span>
              </h2>
              <p className="text-white/50 text-lg leading-relaxed mb-8">
                J'evalue ton niveau de stress et de fatigue a travers 80+ questions ciblees.
                Tu recois un score de risque burnout et un protocole de recuperation adapte.
              </p>
              <ul className="space-y-4">
                {[
                  "Score de risque burnout sur 100",
                  "Identification de ta phase actuelle",
                  "Analyse stress & fatigue",
                  "Protocole recuperation 4 semaines",
                  "Alertes personnalisees",
                  "Suivi evolution",
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-white/70">
                    <Check className="w-5 h-5 text-purple-400" />
                    {item}
                  </li>
                ))}
              </ul>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div className="aspect-square rounded-sm bg-gradient-to-br from-purple-500/20 to-transparent border border-white/5 flex items-center justify-center">
                <div className="text-center">
                  <Zap className="w-16 h-16 text-purple-400/50 mx-auto mb-4" />
                  <div className="text-purple-400 text-6xl font-bold tracking-[-0.04em] mb-2">Score</div>
                  <p className="text-white/30 text-lg">Risque Burnout</p>
                </div>
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
            className="rounded-sm border border-purple-500/30 bg-gradient-to-b from-purple-500/10 to-transparent backdrop-blur-xl p-10 shadow-[0_0_60px_rgba(168,85,247,0.1)]"
          >
            <div className="grid sm:grid-cols-2 gap-6">
              {[
                "Score de risque burnout",
                "Identification phase actuelle",
                "Analyse stress & fatigue",
                "Dashboard temps reel",
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
