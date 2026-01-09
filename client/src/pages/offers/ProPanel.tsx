/**
 * APEXLABS - Ultimate Scan
 * TRUE Ultrahuman Design - 79€
 */

import { useRef } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { motion, useScroll, useTransform } from "framer-motion";
import { Link } from "wouter";
import { ArrowRight, Check, Camera, Activity, Bone } from "lucide-react";

export default function ProPanel() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"]
  });

  const heroOpacity = useTransform(scrollYProgress, [0, 0.3], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.3], [1, 0.95]);

  const sections = [
    "Energie & Vitalite", "Sommeil", "Hormones", "Metabolisme",
    "Stress", "Digestion", "Performance", "Neurotransmetteurs",
    "Thyroide", "Insuline", "Cortisol", "Testosterone",
    "Recuperation", "Inflammation", "Immunite", "Longevite",
    "Analyse Posturale", "Biomecanique"
  ];

  const wearables = [
    "Oura Ring", "Whoop", "Garmin", "Apple Watch", "Fitbit"
  ];

  return (
    <div ref={containerRef} className="bg-[#050505] min-h-screen">
      <Header />

      {/* HERO */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-b from-[#050505] via-[#050505] to-[#050505]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] bg-[#FCDD00]/5 rounded-full blur-[180px]" />
          <div className="absolute bottom-1/4 left-1/4 w-[500px] h-[500px] bg-[#FCDD00]/5 rounded-full blur-[150px]" />
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
            className="inline-flex items-center gap-2 bg-[#FCDD00]/10 border border-[#FCDD00]/20 rounded-sm px-4 py-2 mb-8"
          >
            <span className="text-[#FCDD00] text-xs font-mono uppercase tracking-widest">[ MOST COMPLETE ]</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="text-white text-[3rem] sm:text-[4.8rem] md:text-[7.2rem] lg:text-[9.6rem] xl:text-[12rem] font-bold leading-[0.9] tracking-[-0.04em] mb-8"
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
            L'analyse la plus complete. Questionnaire + photos + wearables.
            18 sections. 40-50 pages de rapport.
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

      {/* TRIPLE INPUT */}
      <section className="py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <p className="text-cyan-400 text-sm font-medium tracking-[0.2em] uppercase mb-6">
              Triple Source
            </p>
            <h2 className="text-white text-4xl sm:text-5xl md:text-6xl font-bold tracking-[-0.04em]">
              3 sources de donnees.
              <br />
              <span className="text-white/50">Precision maximale.</span>
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: Activity,
                title: "Questionnaire",
                desc: "180 questions couvrant 18 domaines de ta sante",
                color: "cyan"
              },
              {
                icon: Camera,
                title: "Photos",
                desc: "Analyse posturale et biomecanique par IA",
                color: "purple"
              },
              {
                icon: Bone,
                title: "Wearables",
                desc: "Donnees de tes appareils connectes",
                color: "green"
              }
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="relative overflow-hidden rounded-sm bg-white/[0.03] backdrop-blur-xl border border-white/10 p-10 hover:border-cyan-500/30 hover:-translate-y-1 transition-all duration-300 group"
              >
                <div className={`w-16 h-16 rounded-sm mb-6 flex items-center justify-center ${
                  item.color === 'cyan' ? 'bg-cyan-500/10' :
                  item.color === 'purple' ? 'bg-purple-500/10' : 'bg-[#FCDD00]/10'
                }`}>
                  <item.icon className={`w-8 h-8 ${
                    item.color === 'cyan' ? 'text-cyan-400' :
                    item.color === 'purple' ? 'text-purple-400' : 'text-[#FCDD00]'
                  }`} />
                </div>
                <h3 className="text-white text-2xl font-bold mb-3">{item.title}</h3>
                <p className="text-white/50">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 18 SECTIONS */}
      <section className="py-32 px-6 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <p className="text-cyan-400 text-sm font-medium tracking-[0.2em] uppercase mb-6">
              18 Sections
            </p>
            <h2 className="text-white text-4xl sm:text-5xl font-bold tracking-[-0.04em]">
              L'analyse la plus complete du marche.
            </h2>
          </motion.div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {sections.map((section, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.02 }}
                className="group rounded-sm bg-white/[0.03] backdrop-blur-xl border border-white/10 p-4 hover:bg-white/[0.06] hover:border-cyan-500/30 hover:-translate-y-0.5 transition-all duration-300"
              >
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 group-hover:scale-125 transition-transform" />
                  <span className="text-white text-xs font-medium">{section}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* PHOTO ANALYSIS */}
      <section className="py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <p className="text-purple-400 text-sm font-medium tracking-[0.2em] uppercase mb-6">
                Analyse Photo IA
              </p>
              <h2 className="text-white text-4xl sm:text-5xl font-bold tracking-[-0.04em] mb-6">
                Ta posture,
                <br />
                <span className="text-purple-400">decodee.</span>
              </h2>
              <p className="text-white/50 text-lg leading-relaxed mb-8">
                Envoie 4 photos (face, dos, profil gauche, profil droit).
                J'analyse ta posture, les desequilibres, les compensations
                et les zones de tension.
              </p>
              <ul className="space-y-4">
                {[
                  "Detection des desequilibres posturaux",
                  "Analyse des compensations musculaires",
                  "Identification des zones de tension",
                  "Recommandations correctives personnalisees"
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
                  <Camera className="w-20 h-20 text-purple-400/50 mx-auto mb-4" />
                  <p className="text-white/30 text-lg">4 photos analysees par IA</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* WEARABLES */}
      <section className="py-32 px-6 border-t border-white/5">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <p className="text-[#FCDD00] text-sm font-medium tracking-[0.2em] uppercase mb-6">
              Wearables Compatibles
            </p>
            <h2 className="text-white text-4xl sm:text-5xl font-bold tracking-[-0.04em] mb-6">
              Sync tes donnees.
            </h2>
            <p className="text-white/50 text-lg mb-12">
              Connecte tes appareils pour une analyse encore plus precise.
            </p>
          </motion.div>

          <div className="flex flex-wrap items-center justify-center gap-4">
            {wearables.map((device, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="px-6 py-4 rounded-full border border-white/10 bg-white/[0.02] text-white/70 hover:border-[#FCDD00]/30 hover:text-white transition-all"
              >
                {device}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* BENTO */}
      <section className="py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="lg:col-span-2 lg:row-span-2 relative overflow-hidden rounded-sm bg-gradient-to-br from-cyan-500/10 to-transparent border border-white/5 p-10"
            >
              <div className="relative z-10">
                <p className="text-cyan-400 text-sm font-medium tracking-[0.2em] uppercase mb-4">Rapport Complet</p>
                <div className="text-white text-7xl font-bold tracking-[-0.04em] mb-4">40-50</div>
                <h3 className="text-white text-2xl font-bold mb-4">Pages de rapport</h3>
                <p className="text-white/50 text-lg leading-relaxed">
                  L'analyse la plus detaillee. Chaque section expliquee.
                  Protocoles personnalises. Plan d'action complet.
                </p>
              </div>
            </motion.div>

            {[
              { number: "18", label: "Sections d'analyse" },
              { number: "4", label: "Protocoles inclus" },
              { number: "24h", label: "Delai livraison" },
              { number: "90j", label: "Plan d'action" },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="rounded-sm bg-white/[0.03] backdrop-blur-xl border border-white/10 p-8 hover:border-cyan-500/20 hover:-translate-y-1 transition-all duration-300"
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
            <h2 className="text-white text-4xl sm:text-5xl font-bold tracking-[-0.04em]">
              Tout ce qui est inclus.
            </h2>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-sm border border-cyan-500/30 bg-gradient-to-b from-cyan-500/10 to-transparent backdrop-blur-xl p-10 shadow-[0_0_60px_rgba(34,211,238,0.1)]"
          >
            <div className="grid sm:grid-cols-2 gap-6">
              {[
                "Analyse complete 18 sections",
                "Analyse photo posturale",
                "Integration wearables",
                "Score global sur 100",
                "Protocole Matin Anti-Cortisol",
                "Protocole Soir Sommeil",
                "Protocole Digestion 14 Jours",
                "Stack Supplements personnalise",
                "Analyse biomecanique complete",
                "Plan 30-60-90 jours",
                "Rapport 40-50 pages PDF",
                "Support prioritaire",
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-cyan-400 flex-shrink-0" />
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
                name: "Anabolic Bioscan",
                price: "59€",
                features: ["16 sections", "4 protocoles", "20+ pages"],
                href: "/offers/anabolic-bioscan",
                current: false,
              },
              {
                name: "Ultimate Scan",
                price: "79€",
                features: ["18 sections", "Analyse photo IA", "40-50 pages", "Wearables sync"],
                href: "/questionnaire?plan=pro",
                current: true,
              },
              {
                name: "Blood Analysis",
                price: "99€",
                features: ["Bilan sanguin", "50+ biomarqueurs", "Radars visuels"],
                href: "/offers/blood-analysis",
                current: false,
              },
            ].map((plan, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className={`rounded-sm p-8 ${
                  plan.current
                    ? "border-2 border-cyan-400 bg-cyan-500/5"
                    : "border border-white/10 bg-white/[0.02]"
                }`}
              >
                {plan.current && (
                  <div className="text-cyan-400 text-xs font-medium tracking-[0.15em] uppercase mb-4">
                    Tu es ici
                  </div>
                )}
                <h3 className="text-white text-xl font-bold mb-2">{plan.name}</h3>
                <div className="text-white text-3xl font-bold tracking-[-0.04em] mb-6">{plan.price}</div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((f, j) => (
                    <li key={j} className="flex items-center gap-2 text-white/60 text-sm">
                      <Check className="w-4 h-4 text-cyan-400" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link href={plan.href}>
                  <button
                    className={`w-full py-3 rounded-sm font-semibold transition-all ${
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
            L'analyse
            <br />
            <span className="text-cyan-400">la plus complete.</span>
          </h2>
          <p className="text-white/50 text-lg mb-12 max-w-xl mx-auto">
            Questionnaire + photos + wearables. 18 sections. 40-50 pages.
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
