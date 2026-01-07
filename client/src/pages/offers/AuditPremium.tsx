/**
 * NEUROCORE 360 - Anabolic Bioscan
 * TRUE Ultrahuman Design - 59€
 */

import { useRef } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { motion, useScroll, useTransform } from "framer-motion";
import { Link } from "wouter";
import { ArrowRight, Check } from "lucide-react";

export default function AuditPremium() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"]
  });

  const heroOpacity = useTransform(scrollYProgress, [0, 0.3], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.3], [1, 0.95]);

  const protocols = [
    { name: "Protocole Matin Anti-Cortisol", desc: "Routine optimisee pour reduire le cortisol et maximiser l'energie" },
    { name: "Protocole Soir Sommeil", desc: "Sequence de relaxation pour un sommeil profond et reparateur" },
    { name: "Protocole Digestion 14 Jours", desc: "Reset digestif complet pour optimiser l'absorption" },
    { name: "Stack Supplements", desc: "Selection personnalisee basee sur tes desequilibres" },
  ];

  const sections = [
    "Energie & Vitalite", "Sommeil", "Hormones", "Metabolisme",
    "Stress", "Digestion", "Performance", "Neurotransmetteurs",
    "Thyroide", "Insuline", "Cortisol", "Testosterone",
    "Recuperation", "Inflammation", "Immunite", "Longevite"
  ];

  return (
    <div ref={containerRef} className="bg-black min-h-screen">
      <Header />

      {/* HERO */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-b from-black via-black to-black" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#FCDD00]/5 rounded-full blur-[150px]" />
          <div className="absolute top-1/4 right-1/4 w-[400px] h-[400px] bg-blue-500/5 rounded-full blur-[120px]" />
        </div>

        <motion.div
          style={{ opacity: heroOpacity, scale: heroScale }}
          className="relative z-10 max-w-5xl mx-auto px-6 text-center"
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 bg-[#FCDD00]/10 border border-[#FCDD00]/20 rounded-full px-4 py-2 mb-8"
          >
            <span className="text-[#FCDD00] text-sm font-medium">Best-seller</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="text-white text-[3rem] sm:text-[4.8rem] md:text-[7.2rem] lg:text-[9.6rem] xl:text-[12rem] font-bold leading-[0.9] tracking-[-0.04em] mb-8"
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
            Le diagnostic complet + les protocoles d'action.
            16 sections d'analyse. Plan 30-60-90 jours.
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
            <Link href="/questionnaire?plan=premium">
              <button className="group inline-flex items-center gap-3 bg-[#FCDD00] text-black font-semibold text-base px-8 py-4 rounded-full hover:bg-[#FCDD00]/90 transition-all duration-300 hover:scale-[1.02] hover:-translate-y-0.5 shadow-[0_0_40px_rgba(252,221,0,0.3)]">
                Commencer mon scan
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </Link>
            <Link href="/offers/ultimate-scan">
              <button className="text-white/60 hover:text-white transition-colors">
                Voir Ultimate Scan
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

      {/* 16 SECTIONS GRID */}
      <section className="py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <p className="text-[#FCDD00] text-sm font-medium tracking-[0.2em] uppercase mb-6">
              Analyse Complete
            </p>
            <h2 className="text-white text-4xl sm:text-5xl md:text-6xl font-bold tracking-[-0.04em] mb-6">
              16 sections. Zero angle mort.
            </h2>
          </motion.div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {sections.map((section, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.03 }}
                className="group relative overflow-hidden rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/10 p-6 hover:bg-white/[0.06] hover:border-[#FCDD00]/20 hover:-translate-y-0.5 transition-all duration-300"
              >
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-[#FCDD00] group-hover:scale-125 transition-transform" />
                  <span className="text-white text-sm font-medium">{section}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* PROTOCOLS */}
      <section className="py-32 px-6 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-start">
            <div className="lg:sticky lg:top-32">
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
              >
                <p className="text-[#FCDD00] text-sm font-medium tracking-[0.2em] uppercase mb-6">
                  Protocoles Inclus
                </p>
                <h2 className="text-white text-4xl sm:text-5xl font-bold tracking-[-0.04em] mb-6">
                  Pas juste un diagnostic.
                  <br />
                  <span className="text-white/50">Un plan d'action.</span>
                </h2>
                <p className="text-white/50 text-lg leading-relaxed">
                  Chaque protocole est personnalise selon tes resultats.
                  Pas de conseils generiques. Des actions concretes.
                </p>
              </motion.div>
            </div>

            <div className="space-y-6">
              {protocols.map((protocol, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="group p-8 rounded-[24px] border border-white/10 hover:border-[#FCDD00]/30 bg-white/[0.03] backdrop-blur-xl hover:bg-white/[0.06] hover:-translate-y-1 transition-all duration-300"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-[#FCDD00]/10 border border-[#FCDD00]/20 flex items-center justify-center">
                      <Check className="w-6 h-6 text-[#FCDD00]" />
                    </div>
                    <div>
                      <h3 className="text-white text-xl font-semibold mb-2">{protocol.name}</h3>
                      <p className="text-white/40">{protocol.desc}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* BENTO FEATURES */}
      <section className="py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="lg:col-span-2 relative overflow-hidden rounded-[32px] bg-gradient-to-br from-[#FCDD00]/10 to-transparent border border-white/5 p-10"
            >
              <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-[#FCDD00]/5 to-transparent" />
              <div className="relative z-10">
                <p className="text-[#FCDD00] text-sm font-medium tracking-[0.2em] uppercase mb-4">Plan Personnalise</p>
                <h3 className="text-white text-4xl font-bold tracking-[-0.02em] mb-4">
                  30-60-90 Jours
                </h3>
                <p className="text-white/50 text-lg leading-relaxed max-w-md">
                  Un roadmap clair avec des objectifs mesurables.
                  Semaine par semaine, tu sais exactement quoi faire.
                </p>
              </div>
            </motion.div>

            {[
              { number: "20+", label: "Pages de rapport" },
              { number: "4", label: "Protocoles inclus" },
              { number: "24h", label: "Delai de livraison" },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="relative overflow-hidden rounded-[32px] bg-white/[0.02] border border-white/5 p-8"
              >
                <div className="text-white text-4xl font-bold tracking-[-0.04em] mb-2">{item.number}</div>
                <div className="text-white/40">{item.label}</div>
              </motion.div>
            ))}
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
            <h2 className="text-white text-4xl sm:text-5xl font-bold tracking-[-0.04em] mb-6">
              Tout ce qui est inclus.
            </h2>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-[32px] border border-[#FCDD00]/30 bg-gradient-to-b from-[#FCDD00]/10 to-transparent backdrop-blur-xl p-10 shadow-[0_0_60px_rgba(252,221,0,0.1)]"
          >
            <div className="grid sm:grid-cols-2 gap-6">
              {[
                "Analyse complete 16 sections",
                "Score global sur 100",
                "Protocole Matin Anti-Cortisol",
                "Protocole Soir Sommeil",
                "Protocole Digestion 14 Jours",
                "Stack Supplements personnalise",
                "Plan 30-60-90 jours",
                "Rapport 20+ pages PDF",
                "Livraison sous 24-48h",
                "Support par email",
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
              <Link href="/questionnaire?plan=premium">
                <button className="group inline-flex items-center gap-3 bg-[#FCDD00] text-black font-semibold text-base px-8 py-4 rounded-full hover:bg-[#FCDD00]/90 transition-all duration-300 hover:scale-[1.02] hover:-translate-y-0.5 shadow-[0_0_40px_rgba(252,221,0,0.3)]">
                  Commencer maintenant
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* COMPARISON */}
      <section className="py-32 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-white text-4xl sm:text-5xl font-bold tracking-[-0.04em]">
              Compare les offres.
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-4">
            {[
              {
                name: "Discovery Scan",
                price: "Gratuit",
                features: ["15 domaines", "Score global", "5-7 pages"],
                href: "/offers/discovery-scan",
                current: false,
              },
              {
                name: "Anabolic Bioscan",
                price: "59€",
                features: ["16 sections", "4 protocoles", "20+ pages", "Plan 30-60-90j"],
                href: "/questionnaire?plan=premium",
                current: true,
              },
              {
                name: "Ultimate Scan",
                price: "79€",
                features: ["18 sections", "Analyse photo", "40-50 pages", "Biomecanique"],
                href: "/offers/ultimate-scan",
                current: false,
              },
            ].map((plan, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className={`rounded-[32px] p-8 ${
                  plan.current
                    ? "border-2 border-[#FCDD00] bg-[#FCDD00]/5"
                    : "border border-white/10 bg-white/[0.02]"
                }`}
              >
                {plan.current && (
                  <div className="text-[#FCDD00] text-xs font-medium tracking-[0.15em] uppercase mb-4">
                    Tu es ici
                  </div>
                )}
                <h3 className="text-white text-xl font-bold mb-2">{plan.name}</h3>
                <div className="text-white text-3xl font-bold tracking-[-0.04em] mb-6">{plan.price}</div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((f, j) => (
                    <li key={j} className="flex items-center gap-2 text-white/60 text-sm">
                      <Check className="w-4 h-4 text-[#FCDD00]" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link href={plan.href}>
                  <button
                    className={`w-full py-3 rounded-full font-semibold transition-all ${
                      plan.current
                        ? "bg-[#FCDD00] text-black hover:bg-[#FCDD00]/90"
                        : "bg-white/10 text-white hover:bg-white/20"
                    }`}
                  >
                    {plan.current ? "Choisir" : "Voir"}
                  </button>
                </Link>
              </motion.div>
            ))}
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
            Pret a passer
            <br />
            <span className="text-[#FCDD00]">au niveau superieur ?</span>
          </h2>
          <p className="text-white/50 text-lg mb-12 max-w-xl mx-auto">
            Diagnostic + protocoles + plan d'action. Tout ce qu'il te faut pour transformer ta sante.
          </p>
          <Link href="/questionnaire?plan=premium">
            <button className="group inline-flex items-center gap-3 bg-[#FCDD00] text-black font-semibold text-base px-8 py-4 rounded-full hover:bg-[#FCDD00]/90 transition-all duration-300 hover:scale-[1.02] hover:-translate-y-0.5 shadow-[0_0_40px_rgba(252,221,0,0.3)]">
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
