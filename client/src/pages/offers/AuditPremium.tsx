/**
 * APEXLABS - Anabolic Bioscan
 * Anabolic Design with React Animations - 59€
 */

import { useRef } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { motion, useScroll, useTransform } from "framer-motion";
import { Link } from "wouter";
import { ArrowRight, Check, Zap, Moon, Pill, Calendar, Watch, TrendingUp } from "lucide-react";

// ============================================================================
// ANIMATED VISUALIZATION - Protocol Cards Animation
// ============================================================================
function ProtocolVisual() {
  const protocols = [
    { icon: Zap, label: "CORTISOL", color: "#FCDD00" },
    { icon: Moon, label: "SOMMEIL", color: "#8B5CF6" },
    { icon: Pill, label: "DIGESTION", color: "#10B981" },
    { icon: TrendingUp, label: "STACK", color: "#3B82F6" },
  ];

  return (
    <div className="relative w-full h-full bg-gradient-to-br from-[#FCDD00]/10 via-black to-[#FCDD00]/5 flex items-center justify-center overflow-hidden rounded-sm border border-white/5">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(252,221,0,0.1)_0%,_transparent_70%)]" />

      <div className="grid grid-cols-2 gap-4 p-6">
        {protocols.map((item, i) => (
          <motion.div
            key={i}
            className="flex flex-col items-center justify-center p-4 bg-black/40 border border-white/10 rounded-sm"
            animate={{
              scale: [1, 1.05, 1],
              borderColor: [`rgba(255,255,255,0.1)`, `${item.color}40`, `rgba(255,255,255,0.1)`]
            }}
            transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
          >
            <item.icon className="w-8 h-8 mb-2" style={{ color: item.color }} />
            <span className="text-xs font-mono text-white/60">{item.label}</span>
          </motion.div>
        ))}
      </div>

      <div className="absolute bottom-4 left-4 text-xs font-mono text-[#FCDD00]/80">
        <div>4 PROTOCOLES</div>
        <motion.div
          className="text-white/60"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          PERSONNALISES
        </motion.div>
      </div>
    </div>
  );
}

// ============================================================================
// ANIMATED VISUALIZATION - Timeline 30-60-90
// ============================================================================
function TimelineVisual() {
  const phases = [
    { day: "J30", label: "Reset", progress: 33 },
    { day: "J60", label: "Build", progress: 66 },
    { day: "J90", label: "Peak", progress: 100 },
  ];

  return (
    <div className="relative w-full h-full bg-gradient-to-br from-[#FCDD00]/10 via-black to-[#FCDD00]/5 flex items-center justify-center overflow-hidden rounded-sm border border-white/5">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(252,221,0,0.1)_0%,_transparent_70%)]" />

      <div className="w-full px-8">
        {/* Timeline bar */}
        <div className="relative h-2 bg-white/10 rounded-full mb-8">
          <motion.div
            className="absolute left-0 top-0 h-full bg-gradient-to-r from-[#FCDD00] to-[#FCDD00]/60 rounded-full"
            animate={{ width: ["0%", "100%", "0%"] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>

        {/* Phase markers */}
        <div className="flex justify-between">
          {phases.map((phase, i) => (
            <motion.div
              key={i}
              className="text-center"
              animate={{ opacity: [0.5, 1, 0.5], y: [0, -5, 0] }}
              transition={{ duration: 2, repeat: Infinity, delay: i * 0.5 }}
            >
              <div className="text-2xl font-bold text-[#FCDD00]">{phase.day}</div>
              <div className="text-xs text-white/50">{phase.label}</div>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="absolute top-4 right-4 text-xs font-mono text-right">
        <motion.div
          className="text-[#FCDD00]"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          ROADMAP
        </motion.div>
        <div className="text-white/40">Semaine par semaine</div>
      </div>
    </div>
  );
}

// ============================================================================
// ANIMATED VISUALIZATION - Wearables Sync
// ============================================================================
function WearablesVisual() {
  const devices = ["OURA", "WHOOP", "GARMIN", "APPLE", "FITBIT"];

  return (
    <div className="relative w-full h-full bg-gradient-to-br from-[#FCDD00]/10 via-black to-[#FCDD00]/5 flex items-center justify-center overflow-hidden rounded-sm border border-white/5">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(252,221,0,0.1)_0%,_transparent_70%)]" />

      {/* Central watch icon */}
      <motion.div
        className="absolute"
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ duration: 3, repeat: Infinity }}
      >
        <Watch className="w-16 h-16 text-[#FCDD00]/40" />
      </motion.div>

      {/* Orbiting device names */}
      {devices.map((device, i) => {
        const angle = (i / devices.length) * Math.PI * 2;
        const radius = 80;
        return (
          <motion.div
            key={i}
            className="absolute px-3 py-1 bg-[#FCDD00]/10 border border-[#FCDD00]/20 rounded text-xs font-mono text-[#FCDD00]/80"
            animate={{
              x: [Math.cos(angle) * radius, Math.cos(angle + Math.PI * 2) * radius],
              y: [Math.sin(angle) * radius, Math.sin(angle + Math.PI * 2) * radius],
              opacity: [0.5, 1, 0.5],
            }}
            transition={{ duration: 10, repeat: Infinity, ease: "linear", delay: i * 0.2 }}
          >
            {device}
          </motion.div>
        );
      })}

      {/* Pulse rings */}
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="absolute w-24 h-24 rounded-full border border-[#FCDD00]/20"
          animate={{ scale: [1, 2, 2.5], opacity: [0.4, 0.1, 0] }}
          transition={{ duration: 3, repeat: Infinity, delay: i * 1 }}
        />
      ))}

      <div className="absolute bottom-4 left-4 text-xs font-mono text-[#FCDD00]/80">
        <div>SYNC DATA</div>
        <motion.div
          className="text-white/60"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          HRV + SOMMEIL + ACTIVITE
        </motion.div>
      </div>
    </div>
  );
}

// ============================================================================
// ANIMATED VISUALIZATION - Sections Grid
// ============================================================================
function SectionsGridVisual() {
  const sections = [
    "PROFIL", "SANTE", "SOMMEIL", "STRESS",
    "ENERGIE", "DIGESTION", "TRAINING", "NUTRITION",
    "LIFESTYLE", "MINDSET", "HORMONES", "BIOMARQUEURS"
  ];

  return (
    <div className="relative w-full h-full bg-gradient-to-br from-[#FCDD00]/10 via-black to-[#FCDD00]/5 overflow-hidden rounded-sm border border-white/5 p-4">
      <div className="grid grid-cols-4 gap-2 h-full">
        {sections.map((section, i) => (
          <motion.div
            key={i}
            className="flex items-center justify-center bg-black/40 border border-white/10 rounded text-[8px] font-mono text-white/50"
            animate={{
              borderColor: [`rgba(255,255,255,0.1)`, `rgba(252,221,0,0.4)`, `rgba(255,255,255,0.1)`],
              color: [`rgba(255,255,255,0.5)`, `rgba(252,221,0,0.8)`, `rgba(255,255,255,0.5)`],
            }}
            transition={{ duration: 2, repeat: Infinity, delay: i * 0.15 }}
          >
            {section}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export default function AuditPremium() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"]
  });

  const heroOpacity = useTransform(scrollYProgress, [0, 0.3], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.3], [1, 0.95]);

  const protocols = [
    { name: "Protocole Matin Anti-Cortisol", desc: "Ta routine du matin pour reduire le cortisol et maximiser ton energie", icon: Zap },
    { name: "Protocole Soir Sommeil", desc: "Ta sequence de relaxation pour un sommeil profond et reparateur", icon: Moon },
    { name: "Protocole Digestion 14 Jours", desc: "Ton reset digestif complet pour optimiser l'absorption", icon: Pill },
    { name: "Stack Supplements", desc: "Ta selection personnalisee basee sur tes desequilibres", icon: TrendingUp },
  ];

  return (
    <div ref={containerRef} className="bg-[#050505] min-h-screen">
      <Header />

      {/* HERO */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-b from-[#050505] via-[#050505] to-[#050505]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#FCDD00]/5 rounded-full blur-[150px]" />
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
            <span className="text-[#FCDD00] text-xs font-mono uppercase tracking-widest">[ BEST-SELLER ]</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="text-white text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black leading-[0.9] tracking-tighter mb-8"
          >
            Anabolic
            <br />
            <span className="text-[#FCDD00]">Bioscan.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="text-white/60 text-lg sm:text-xl max-w-2xl mx-auto mb-8 leading-relaxed"
          >
            ~150 questions sur 17 sections: nutrition detaillee, profil hormonal,
            axes cliniques (thyroide, diabete, SII), supplements, biomarqueurs, composition corporelle.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="flex items-center justify-center gap-4 mb-12"
          >
            <span className="text-white text-6xl font-bold tracking-[-0.04em]">59€</span>
            <span className="text-white/40">one-time</span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link href="/questionnaire?plan=anabolic">
              <button className="group inline-flex items-center gap-3 bg-[#FCDD00] text-black font-semibold text-base px-8 py-4 rounded-sm hover:bg-[#FCDD00]/90 transition-all duration-300 hover:scale-[1.02] hover:-translate-y-0.5 shadow-[0_0_40px_rgba(252,221,0,0.3)]">
                Commencer mon scan
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

      {/* PROTOCOLS SECTION */}
      <section className="py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <p className="text-[#FCDD00] text-sm font-medium tracking-[0.2em] uppercase mb-6">
                4 Protocoles Inclus
              </p>
              <h2 className="text-white text-4xl sm:text-5xl font-bold tracking-[-0.04em] mb-6 leading-tight">
                Pas juste un diagnostic.
                <br />
                <span className="text-[#FCDD00]">Un plan d'action.</span>
              </h2>
              <p className="text-white/50 text-lg leading-relaxed mb-8">
                Je te donne les protocoles exacts a suivre. Pas de conseils generiques.
                Des actions concretes basees sur TES resultats.
              </p>
              <div className="space-y-4">
                {protocols.map((protocol, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-start gap-4 p-4 bg-white/[0.02] border border-white/5 rounded-sm"
                  >
                    <div className="w-10 h-10 rounded-sm bg-[#FCDD00]/10 border border-[#FCDD00]/20 flex items-center justify-center flex-shrink-0">
                      <protocol.icon className="w-5 h-5 text-[#FCDD00]" />
                    </div>
                    <div>
                      <h3 className="text-white font-semibold mb-1">{protocol.name}</h3>
                      <p className="text-white/40 text-sm">{protocol.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div className="aspect-square">
                <ProtocolVisual />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* TIMELINE 30-60-90 */}
      <section className="py-32 px-6 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="order-2 lg:order-1"
            >
              <div className="aspect-[4/3]">
                <TimelineVisual />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="order-1 lg:order-2"
            >
              <p className="text-[#FCDD00] text-sm font-medium tracking-[0.2em] uppercase mb-6">
                Plan 30-60-90 Jours
              </p>
              <h2 className="text-white text-4xl sm:text-5xl font-bold tracking-[-0.04em] mb-6 leading-tight">
                Un roadmap clair.
                <br />
                <span className="text-[#FCDD00]">Zero confusion.</span>
              </h2>
              <p className="text-white/50 text-lg leading-relaxed mb-8">
                Je te dis exactement quoi faire, semaine par semaine.
                Chaque phase a ses objectifs. Tu sais ou tu en es.
              </p>
              <ul className="space-y-4">
                {[
                  "J1-30 : Reset - Eliminer les blocages prioritaires",
                  "J31-60 : Build - Construire les nouvelles habitudes",
                  "J61-90 : Peak - Optimiser et consolider les gains",
                ].map((item, i) => (
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

      {/* WEARABLES */}
      <section className="py-32 px-6 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <p className="text-[#FCDD00] text-sm font-medium tracking-[0.2em] uppercase mb-6">
                Integration Wearables
              </p>
              <h2 className="text-white text-4xl sm:text-5xl font-bold tracking-[-0.04em] mb-6 leading-tight">
                Sync ta montre.
                <br />
                <span className="text-[#FCDD00]">J'affine le diagnostic.</span>
              </h2>
              <p className="text-white/50 text-lg leading-relaxed mb-8">
                Connecte ton wearable. Je croise tes donnees de sommeil, HRV et activite
                avec tes reponses pour des recommandations ultra-precises.
              </p>
              <ul className="space-y-4">
                {[
                  "Analyse HRV pour evaluer ton stress reel",
                  "Detection des troubles du sommeil caches",
                  "Correlation activite / fatigue / performance",
                  "Recommandations adaptees a tes donnees",
                ].map((item, i) => (
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
            >
              <div className="aspect-square">
                <WearablesVisual />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* WHAT'S INCLUDED */}
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
                "Analyse complete 17 sections",
                "156 questions personnalisees",
                "Integration wearables",
                "Protocole Matin Anti-Cortisol",
                "Protocole Soir Sommeil",
                "Protocole Digestion 14 Jours",
                "Stack Supplements personnalise",
                "Plan 30-60-90 jours",
                "Rapport 20+ pages PDF",
                "Livraison sous 24-48h",
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-[#FCDD00] flex-shrink-0" />
                  <span className="text-white/80">{item}</span>
                </div>
              ))}
            </div>

            <div className="mt-10 pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-6">
              <div>
                <span className="text-white text-5xl font-bold tracking-[-0.04em]">59€</span>
                <span className="text-white/40 ml-2">one-time</span>
              </div>
              <Link href="/questionnaire?plan=anabolic">
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
            Pret a passer
            <br />
            <span className="text-[#FCDD00]">au niveau superieur ?</span>
          </h2>
          <p className="text-white/50 text-lg mb-12 max-w-xl mx-auto">
            Diagnostic + protocoles + plan d'action. Tout ce qu'il te faut pour transformer ta sante.
          </p>
          <Link href="/questionnaire?plan=anabolic">
            <button className="group inline-flex items-center gap-3 bg-[#FCDD00] text-black font-semibold text-base px-8 py-4 rounded-sm hover:bg-[#FCDD00]/90 transition-all duration-300 hover:scale-[1.02] hover:-translate-y-0.5 shadow-[0_0_40px_rgba(252,221,0,0.3)]">
              Lancer mon Anabolic Bioscan — 59€
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </Link>
        </motion.div>
      </section>

      <Footer />
    </div>
  );
}
