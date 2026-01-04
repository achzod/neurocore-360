/**
 * NEUROCORE 360 - Discovery Scan
 * TRUE Ultrahuman Design - Scraped & Replicated
 */

import { useRef } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { motion, useScroll, useTransform } from "framer-motion";
import { Link } from "wouter";
import { ArrowRight, Check } from "lucide-react";

export default function AuditGratuit() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"]
  });

  const heroOpacity = useTransform(scrollYProgress, [0, 0.3], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.3], [1, 0.95]);

  return (
    <div ref={containerRef} className="bg-black min-h-screen">
      <Header />

      {/* HERO - Full Viewport */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Background Gradient */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-b from-black via-black to-black" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#0eff27]/5 rounded-full blur-[150px]" />
        </div>

        <motion.div
          style={{ opacity: heroOpacity, scale: heroScale }}
          className="relative z-10 max-w-5xl mx-auto px-6 text-center"
        >
          {/* Eyebrow */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-[#0eff27] text-sm font-medium tracking-[0.2em] uppercase mb-8"
          >
            Analyse Gratuite
          </motion.p>

          {/* Main Headline - Ultrahuman Style */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="text-white text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold leading-[0.95] tracking-[-0.04em] mb-8"
          >
            Discover what's
            <br />
            <span className="text-[#0eff27]">holding you back.</span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="text-white/60 text-lg sm:text-xl max-w-2xl mx-auto mb-12 leading-relaxed"
          >
            180 questions. 15 domaines. Un diagnostic complet de tes blocages
            metaboliques, hormonaux et comportementaux.
          </motion.p>

          {/* CTA Button - Ultrahuman Green */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            <Link href="/questionnaire">
              <button className="group inline-flex items-center gap-3 bg-[#0eff27] text-black font-semibold text-lg px-10 py-5 rounded-full hover:bg-[#0eff27]/90 transition-all duration-300 hover:scale-[1.02]">
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
            500+ scans completes
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

      {/* WHAT YOU GET - Bento Grid */}
      <section className="py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <h2 className="text-white text-4xl sm:text-5xl md:text-6xl font-bold tracking-[-0.04em] mb-6">
              Ce que tu obtiens.
            </h2>
            <p className="text-white/50 text-lg max-w-xl mx-auto">
              Un diagnostic precis. Sans flou. Sans bullshit.
            </p>
          </motion.div>

          {/* Bento Grid - Ultrahuman Style */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Large Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="lg:col-span-2 lg:row-span-2 relative overflow-hidden rounded-[32px] bg-gradient-to-br from-[#0eff27]/10 to-transparent border border-white/5 p-10"
            >
              <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-[#0eff27]/5 to-transparent" />
              <div className="relative z-10">
                <div className="text-[#0eff27] text-8xl font-bold tracking-[-0.04em] mb-4">15</div>
                <h3 className="text-white text-3xl font-bold tracking-[-0.02em] mb-4">
                  Domaines analyses
                </h3>
                <p className="text-white/50 text-lg leading-relaxed max-w-md">
                  Sommeil, energie, hormones, digestion, stress, metabolisme,
                  neurotransmetteurs, biomecanique, cardio, immunite...
                </p>
              </div>
            </motion.div>

            {/* Small Cards */}
            {[
              { number: "180", label: "Questions", desc: "Analyse exhaustive" },
              { number: "100", label: "Score global", desc: "Sur 100 points" },
              { number: "5-7", label: "Pages", desc: "Rapport detaille" },
              { number: "0€", label: "Gratuit", desc: "Sans engagement" },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="relative overflow-hidden rounded-[32px] bg-white/[0.02] border border-white/5 p-8 hover:bg-white/[0.04] transition-colors duration-300"
              >
                <div className="text-white text-4xl font-bold tracking-[-0.04em] mb-2">{item.number}</div>
                <div className="text-white text-lg font-medium mb-1">{item.label}</div>
                <div className="text-white/40 text-sm">{item.desc}</div>
              </motion.div>
            ))}
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
                <p className="text-[#0eff27] text-sm font-medium tracking-[0.2em] uppercase mb-6">
                  Analyse Complete
                </p>
                <h2 className="text-white text-4xl sm:text-5xl font-bold tracking-[-0.04em] mb-6">
                  Chaque aspect de ta sante, decode.
                </h2>
                <p className="text-white/50 text-lg leading-relaxed">
                  Notre algorithme analyse tes reponses pour identifier les desequilibres
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
                  className="group p-6 rounded-2xl border border-white/5 hover:border-[#0eff27]/20 bg-white/[0.01] hover:bg-white/[0.02] transition-all duration-300"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-2 h-2 rounded-full bg-[#0eff27] mt-2 group-hover:scale-125 transition-transform" />
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
              className="rounded-[32px] border border-white/10 bg-white/[0.02] p-8"
            >
              <div className="text-[#0eff27] text-sm font-medium tracking-[0.15em] uppercase mb-4">Discovery Scan</div>
              <div className="text-white text-5xl font-bold tracking-[-0.04em] mb-6">Gratuit</div>
              <ul className="space-y-4">
                {[
                  "Diagnostic complet 15 domaines",
                  "Score global sur 100",
                  "Identification des blocages",
                  "Rapport 5-7 pages",
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-white/70">
                    <Check className="w-5 h-5 text-[#0eff27]" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link href="/questionnaire">
                <button className="w-full mt-8 bg-[#0eff27] text-black font-semibold py-4 rounded-full hover:bg-[#0eff27]/90 transition-all">
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
              className="rounded-[32px] border border-[#0eff27]/30 bg-gradient-to-b from-[#0eff27]/5 to-transparent p-8"
            >
              <div className="text-[#0eff27] text-sm font-medium tracking-[0.15em] uppercase mb-4">Anabolic Bioscan</div>
              <div className="text-white text-5xl font-bold tracking-[-0.04em] mb-6">59€</div>
              <ul className="space-y-4">
                {[
                  "Tout le Discovery Scan",
                  "Protocoles d'action personnalises",
                  "Stack supplements optimise",
                  "Plan 30-60-90 jours",
                  "16 sections d'analyse",
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-white/70">
                    <Check className="w-5 h-5 text-[#0eff27]" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link href="/offers/anabolic-bioscan">
                <button className="w-full mt-8 bg-white/10 text-white font-semibold py-4 rounded-full border border-white/10 hover:bg-white/20 transition-all">
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
            <span className="text-[#0eff27]">tes blocages ?</span>
          </h2>
          <p className="text-white/50 text-lg mb-12 max-w-xl mx-auto">
            5 minutes. 180 questions. Un diagnostic qui peut tout changer.
          </p>
          <Link href="/questionnaire">
            <button className="group inline-flex items-center gap-3 bg-[#0eff27] text-black font-semibold text-lg px-12 py-5 rounded-full hover:bg-[#0eff27]/90 transition-all duration-300 hover:scale-[1.02]">
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
