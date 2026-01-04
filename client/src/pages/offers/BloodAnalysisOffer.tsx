/**
 * NEUROCORE 360 - Blood Analysis
 * TRUE Ultrahuman Design - 99€
 */

import { useRef } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { motion, useScroll, useTransform } from "framer-motion";
import { Link } from "wouter";
import { ArrowRight, Check, Upload, Beaker } from "lucide-react";

export default function BloodAnalysisOffer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"]
  });

  const heroOpacity = useTransform(scrollYProgress, [0, 0.3], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.3], [1, 0.95]);

  const biomarkers = [
    { category: "Metabolisme", count: 12, color: "red" },
    { category: "Hormones", count: 8, color: "purple" },
    { category: "Inflammation", count: 6, color: "orange" },
    { category: "Thyroide", count: 5, color: "blue" },
    { category: "Vitamines", count: 8, color: "green" },
    { category: "Mineraux", count: 7, color: "cyan" },
    { category: "Lipides", count: 6, color: "yellow" },
    { category: "Foie & Reins", count: 8, color: "pink" },
  ];

  return (
    <div ref={containerRef} className="bg-black min-h-screen">
      <Header />

      {/* HERO */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-b from-black via-black to-black" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-red-500/5 rounded-full blur-[150px]" />
          <div className="absolute bottom-1/3 right-1/4 w-[400px] h-[400px] bg-blue-500/5 rounded-full blur-[120px]" />
        </div>

        <motion.div
          style={{ opacity: heroOpacity, scale: heroScale }}
          className="relative z-10 max-w-5xl mx-auto px-6 text-center"
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-full px-4 py-2 mb-8"
          >
            <span className="text-red-400 text-sm font-medium">Analyse Sanguine</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="text-white text-[3rem] sm:text-[4.8rem] md:text-[7.2rem] lg:text-[9.6rem] xl:text-[12rem] font-bold leading-[0.9] tracking-[-0.04em] mb-8"
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
            Upload ton bilan sanguin. J'analyse 50+ biomarqueurs
            et te donne des protocoles d'optimisation personnalises.
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
              <button className="group inline-flex items-center gap-3 bg-red-500 text-white font-semibold text-base px-8 py-4 rounded-full hover:bg-red-400 transition-all duration-300 hover:scale-[1.02] hover:-translate-y-0.5 shadow-[0_0_40px_rgba(239,68,68,0.3)]">
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
              { step: "02", title: "Analyse", desc: "J'analyse 50+ biomarqueurs", icon: Beaker },
              { step: "03", title: "Protocoles", desc: "Recois des recommandations personnalisees", icon: Check },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="relative overflow-hidden rounded-[32px] bg-white/[0.03] backdrop-blur-xl border border-white/10 p-10 hover:border-red-500/20 hover:-translate-y-1 transition-all duration-300"
              >
                <div className="text-red-500/20 text-8xl font-bold absolute top-4 right-4">{item.step}</div>
                <div className="relative z-10">
                  <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-6">
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

      {/* BIOMARKERS GRID */}
      <section className="py-32 px-6 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <p className="text-red-400 text-sm font-medium tracking-[0.2em] uppercase mb-6">
              50+ Biomarqueurs
            </p>
            <h2 className="text-white text-4xl sm:text-5xl font-bold tracking-[-0.04em] mb-6">
              Analyse complete de ton sang.
            </h2>
            <p className="text-white/50 text-lg max-w-2xl mx-auto">
              8 categories. 50+ marqueurs analyses. Chaque valeur interpretee
              et mise en contexte avec ton profil.
            </p>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {biomarkers.map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="group rounded-[24px] bg-white/[0.03] backdrop-blur-xl border border-white/10 p-6 hover:bg-white/[0.06] hover:border-red-500/30 hover:-translate-y-1 transition-all duration-300"
              >
                <div className="text-white text-3xl font-bold tracking-[-0.04em] mb-2">{item.count}</div>
                <div className="text-white/70 font-medium">{item.category}</div>
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
              <p className="text-red-400 text-sm font-medium tracking-[0.2em] uppercase mb-6">
                Ton Rapport
              </p>
              <h2 className="text-white text-4xl sm:text-5xl font-bold tracking-[-0.04em] mb-6">
                Pas juste des chiffres.
                <br />
                <span className="text-red-400">Des reponses.</span>
              </h2>
              <p className="text-white/50 text-lg leading-relaxed mb-8">
                Chaque biomarqueur est analyse, interprete et compare
                aux valeurs optimales (pas juste "normales").
                Tu recois des protocoles concrets pour corriger les desequilibres.
              </p>
              <ul className="space-y-4">
                {[
                  "Interpretation de chaque marqueur",
                  "Radars visuels par categorie",
                  "Detection des patterns a risque",
                  "Protocoles de correction",
                  "Supplements recommandes",
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-white/70">
                    <Check className="w-5 h-5 text-red-400" />
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
              <div className="aspect-square rounded-[48px] bg-gradient-to-br from-red-500/20 to-transparent border border-white/5 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-red-400 text-8xl font-bold tracking-[-0.04em] mb-4">50+</div>
                  <p className="text-white/30 text-lg">Biomarqueurs analyses</p>
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
            className="rounded-[32px] border border-red-500/30 bg-gradient-to-b from-red-500/10 to-transparent backdrop-blur-xl p-10 shadow-[0_0_60px_rgba(239,68,68,0.1)]"
          >
            <div className="grid sm:grid-cols-2 gap-6">
              {[
                "Analyse 50+ biomarqueurs",
                "8 categories de marqueurs",
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
                <button className="group inline-flex items-center gap-3 bg-red-500 text-white font-semibold text-base px-8 py-4 rounded-full hover:bg-red-400 transition-all duration-300 hover:scale-[1.02] hover:-translate-y-0.5 shadow-[0_0_40px_rgba(239,68,68,0.3)]">
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
            50+ biomarqueurs analyses. Protocoles personnalises.
          </p>
          <Link href="/blood-analysis">
            <button className="group inline-flex items-center gap-3 bg-red-500 text-white font-semibold text-base px-8 py-4 rounded-full hover:bg-red-400 transition-all duration-300 hover:scale-[1.02] hover:-translate-y-0.5 shadow-[0_0_40px_rgba(239,68,68,0.3)]">
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
