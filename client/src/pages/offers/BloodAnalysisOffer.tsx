/**
 * NEUROCORE 360 - Blood Analysis Offer Page
 * Ultrahuman-inspired premium design - 99€
 */

import { useState, useRef } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import {
  Beaker,
  ArrowRight,
  Check,
  Upload,
  Brain,
  Target,
  TrendingUp,
  Shield,
  FileText,
  Activity,
  ChevronDown,
  Zap,
  Clock,
  Lock,
  Heart,
  Flame,
  Droplets,
  Pill,
  Microscope,
  BarChart3,
  Users,
} from "lucide-react";

// Biomarker categories
const biomarkerCategories = [
  { name: "Cardiovasculaire", count: 12, color: "red", gradient: "from-red-500 to-rose-500" },
  { name: "Thyroidien", count: 5, color: "purple", gradient: "from-purple-500 to-violet-500" },
  { name: "Hormonal", count: 8, color: "amber", gradient: "from-amber-500 to-orange-500" },
  { name: "Metabolique", count: 6, color: "emerald", gradient: "from-emerald-500 to-green-500" },
  { name: "Hepatique", count: 6, color: "orange", gradient: "from-orange-500 to-amber-500" },
  { name: "Renal", count: 5, color: "blue", gradient: "from-blue-500 to-cyan-500" },
  { name: "Vitamines", count: 8, color: "cyan", gradient: "from-cyan-500 to-teal-500" },
  { name: "Inflammatoire", count: 4, color: "rose", gradient: "from-rose-500 to-pink-500" },
];

// Clinical patterns
const clinicalPatterns = [
  { name: "Low Testosterone Syndrome", desc: "Testosterone basse + SHBG elevee", icon: TrendingUp, color: "amber" },
  { name: "Hypothyroidie Subclinique", desc: "TSH haute + T3/T4 basses", icon: Activity, color: "purple" },
  { name: "Resistance a l'Insuline", desc: "HOMA-IR > 2.5 + HDL bas", icon: Flame, color: "orange" },
  { name: "Inflammation Chronique", desc: "hs-CRP elevee + Homocysteine haute", icon: Heart, color: "red" },
  { name: "Deficience Nutritionnelle", desc: "Vitamine D < 40 + B12 basse", icon: Droplets, color: "cyan" },
  { name: "Stress Surrenalien", desc: "Cortisol eleve + DHEA-S bas", icon: Brain, color: "emerald" },
];

// FAQ items
const faqItems = [
  {
    question: "Quels bilans sanguins acceptez-vous ?",
    answer: "Tous les bilans PDF de laboratoires francais et internationaux. Bilan standard ou panel hormonal complet."
  },
  {
    question: "C'est quoi la difference avec les ranges labo ?",
    answer: "Les ranges labo sont bases sur la population malade. Nos ranges optimaux viennent de Peter Attia, Marek Health, Bryan Johnson."
  },
  {
    question: "Combien de temps pour l'analyse ?",
    answer: "Moins de 2 minutes. Upload, extraction, analyse, rapport instantane."
  },
  {
    question: "Les 99€ sont deduits du coaching ?",
    answer: "Oui. Si tu prends un coaching dans les 30 jours, les 99€ sont integralement deduits."
  },
];

// FAQ Accordion
function FAQItem({ item, isOpen, onToggle, index }: {
  item: typeof faqItems[0];
  isOpen: boolean;
  onToggle: () => void;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.05 }}
      className="border-b border-white/10"
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between py-6 text-left group"
      >
        <span className="text-lg font-medium text-white group-hover:text-red-400 transition-colors">
          {item.question}
        </span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          className="ml-4 shrink-0"
        >
          <ChevronDown className="h-5 w-5 text-white/40" />
        </motion.div>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
          >
            <p className="pb-6 text-white/60 leading-relaxed">
              {item.answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function BloodAnalysisOffer() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });

  const heroOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.5], [1, 0.95]);

  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden">
      <Header />

      <main>
        {/* === HERO SECTION === */}
        <section
          ref={heroRef}
          className="relative min-h-screen flex items-center overflow-hidden"
        >
          {/* Animated background orbs */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-1/4 left-1/4 w-[700px] h-[700px] bg-red-500/20 rounded-full blur-[180px] animate-pulse" />
            <div className="absolute bottom-1/3 right-1/4 w-[500px] h-[500px] bg-rose-500/15 rounded-full blur-[150px] animate-pulse" style={{ animationDelay: "1s" }} />
            <div className="absolute top-1/2 right-1/3 w-[400px] h-[400px] bg-orange-500/10 rounded-full blur-[120px]" />
          </div>

          {/* Grid overlay */}
          <div
            className="absolute inset-0 opacity-[0.015]"
            style={{
              backgroundImage: "linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)",
              backgroundSize: "80px 80px",
            }}
          />

          <motion.div
            style={{ opacity: heroOpacity, scale: heroScale }}
            className="relative z-10 mx-auto max-w-7xl px-4 py-32"
          >
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              {/* Left - Content */}
              <div>
                {/* Badge */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <Badge className="mb-8 px-6 py-2 bg-red-500/10 text-red-400 border border-red-500/30 text-sm font-medium backdrop-blur-xl">
                    <Beaker className="mr-2 h-4 w-4" />
                    50+ BIOMARQUEURS
                  </Badge>
                </motion.div>

                {/* Main headline */}
                <motion.h1
                  initial={{ opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.8 }}
                  className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tight leading-[0.9]"
                  style={{ letterSpacing: "-0.04em" }}
                >
                  <span className="text-white">Blood</span>
                  <br />
                  <span className="bg-gradient-to-r from-red-400 via-rose-400 to-orange-400 bg-clip-text text-transparent">
                    Analysis.
                  </span>
                </motion.h1>

                {/* Subheadline */}
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="mt-8 text-xl sm:text-2xl text-white/60 max-w-xl font-light leading-relaxed"
                >
                  Upload ton bilan. Ranges optimaux.
                  <br />
                  <span className="text-white/40">Detection de patterns cliniques.</span>
                </motion.p>

                {/* Price */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="mt-8 flex items-baseline gap-3"
                >
                  <span className="text-5xl font-black text-red-400">99€</span>
                  <span className="text-white/40">one-time</span>
                  <Badge className="ml-2 bg-red-500/20 text-red-400 border-red-500/30">
                    Deduit du coaching
                  </Badge>
                </motion.div>

                {/* CTA */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 }}
                  className="mt-10 flex flex-col sm:flex-row gap-4"
                >
                  <Link href="/blood-analysis">
                    <Button
                      size="lg"
                      className="h-16 px-10 text-lg font-semibold rounded-2xl bg-red-500 hover:bg-red-400 text-white hover:scale-105 transition-all duration-300 shadow-[0_0_60px_rgba(239,68,68,0.4)]"
                    >
                      <Upload className="mr-3 h-5 w-5" />
                      Analyser mon bilan
                      <ArrowRight className="ml-3 h-5 w-5" />
                    </Button>
                  </Link>
                </motion.div>

                {/* Trust indicators */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.9 }}
                  className="mt-10 flex flex-wrap gap-6 text-sm text-white/40"
                >
                  <span className="flex items-center gap-2">
                    <Zap className="h-4 w-4" /> Resultats en 2 min
                  </span>
                  <span className="flex items-center gap-2">
                    <Shield className="h-4 w-4" /> Tous labos compatibles
                  </span>
                  <span className="flex items-center gap-2">
                    <Users className="h-4 w-4" /> +300 analyses
                  </span>
                </motion.div>
              </div>

              {/* Right - Visual */}
              <motion.div
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4, duration: 0.8 }}
                className="relative"
              >
                {/* Video container */}
                <div className="relative rounded-3xl overflow-hidden border border-white/10 bg-white/[0.02] backdrop-blur-xl shadow-2xl">
                  <video
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="w-full aspect-video object-cover"
                  >
                    <source
                      src="https://public-web-assets.uh-static.com/web_v2/blood-vision/buy/desktop/Web2K_1.mp4"
                      type="video/mp4"
                    />
                  </video>

                  {/* Gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />

                  {/* Overlay content */}
                  <div className="absolute bottom-6 left-6 right-6">
                    <p className="text-white font-semibold mb-1">Analyse sanguine avancee</p>
                    <p className="text-white/60 text-sm">Ranges optimaux vs ranges laboratoire</p>
                  </div>
                </div>

                {/* Floating biomarker values */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 }}
                  className="absolute -bottom-6 left-4 right-4 grid grid-cols-4 gap-2"
                >
                  {[
                    { label: "TSH", value: "1.8", status: "optimal" },
                    { label: "Vit D", value: "52", status: "optimal" },
                    { label: "CRP", value: "0.4", status: "optimal" },
                    { label: "Testo", value: "687", status: "optimal" },
                  ].map((marker, i) => (
                    <div key={i} className="p-3 rounded-xl bg-black/80 backdrop-blur-xl border border-white/10 text-center">
                      <div className="text-xs text-white/40 mb-1">{marker.label}</div>
                      <div className="text-lg font-bold text-emerald-400">{marker.value}</div>
                    </div>
                  ))}
                </motion.div>

                {/* Background glow */}
                <div className="absolute -inset-8 bg-red-500/20 blur-[100px] rounded-full -z-10" />
              </motion.div>
            </div>
          </motion.div>
        </section>

        {/* === BIOMARKERS GRID === */}
        <section className="relative py-32 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-red-500/5 to-transparent" />

          <div className="relative mx-auto max-w-7xl px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-20"
            >
              <h2 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight" style={{ letterSpacing: "-0.03em" }}>
                50+ <span className="text-red-400">biomarqueurs</span>
              </h2>
              <p className="mt-6 text-xl text-white/50 max-w-2xl mx-auto">
                8 categories analysees avec les ranges optimaux de medecine fonctionnelle
              </p>
            </motion.div>

            {/* Biomarker categories grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {biomarkerCategories.map((cat, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  className="group relative p-6 rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-xl hover:border-red-500/30 transition-all duration-500"
                >
                  <div className={`inline-flex p-2.5 rounded-xl bg-gradient-to-br ${cat.gradient} mb-4`}>
                    <Beaker className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-1">{cat.name}</h3>
                  <p className="text-sm text-white/40">{cat.count} marqueurs</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* === CLINICAL PATTERNS === */}
        <section className="relative py-32 overflow-hidden">
          <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-red-500/10 rounded-full blur-[200px]" />

          <div className="relative mx-auto max-w-7xl px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-20"
            >
              <h2 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight" style={{ letterSpacing: "-0.03em" }}>
                Detection de <span className="text-red-400">patterns</span>
              </h2>
              <p className="mt-6 text-xl text-white/50 max-w-2xl mx-auto">
                Les marqueurs ne sont pas regardes isolement. 15+ syndromes detectes.
              </p>
            </motion.div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {clinicalPatterns.map((pattern, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="p-6 rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-xl hover:border-red-500/30 transition-all duration-500"
                >
                  <div className={`inline-flex p-3 rounded-xl bg-${pattern.color}-500/10 mb-4`}>
                    <pattern.icon className={`h-5 w-5 text-${pattern.color}-400`} />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">{pattern.name}</h3>
                  <p className="text-sm text-white/50">{pattern.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* === WHAT YOU GET === */}
        <section className="relative py-32 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/[0.02] to-transparent" />

          <div className="relative mx-auto max-w-4xl px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="text-4xl sm:text-5xl font-black tracking-tight" style={{ letterSpacing: "-0.03em" }}>
                Ce que tu <span className="text-red-400">recois</span>
              </h2>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="p-8 rounded-3xl border border-red-500/30 bg-red-500/5"
            >
              <div className="grid sm:grid-cols-2 gap-4 mb-8">
                {[
                  "Analyse 50+ biomarqueurs",
                  "Ranges optimaux vs labo",
                  "Detection 15+ patterns",
                  "Protocole supplements",
                  "Rapport PDF complet",
                  "Dashboard interactif",
                  "Sources scientifiques",
                  "Resultats en 2 minutes",
                ].map((feature, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center gap-3"
                  >
                    <Check className="h-5 w-5 text-red-400 shrink-0" />
                    <span className="text-white/70">{feature}</span>
                  </motion.div>
                ))}
              </div>

              <div className="pt-8 border-t border-white/10 flex items-center justify-between">
                <div>
                  <span className="text-4xl font-black text-red-400">99€</span>
                  <span className="text-white/40 ml-2">one-time</span>
                </div>
                <Link href="/blood-analysis">
                  <Button className="h-14 px-8 text-lg font-semibold rounded-2xl bg-red-500 hover:bg-red-400 text-white">
                    Analyser mon bilan
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
              </div>
            </motion.div>
          </div>
        </section>

        {/* === FAQ === */}
        <section className="relative py-32">
          <div className="mx-auto max-w-3xl px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="text-4xl sm:text-5xl font-black tracking-tight" style={{ letterSpacing: "-0.03em" }}>
                Questions <span className="text-red-400">frequentes</span>
              </h2>
            </motion.div>

            <div>
              {faqItems.map((item, i) => (
                <FAQItem
                  key={i}
                  item={item}
                  index={i}
                  isOpen={openFaq === i}
                  onToggle={() => setOpenFaq(openFaq === i ? null : i)}
                />
              ))}
            </div>
          </div>
        </section>

        {/* === FINAL CTA === */}
        <section className="relative py-32 overflow-hidden">
          <div className="absolute inset-0">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[500px] bg-red-500/20 rounded-full blur-[200px]" />
          </div>

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative mx-auto max-w-4xl px-4 text-center"
          >
            <Beaker className="h-20 w-20 text-red-400 mx-auto mb-8" />

            <h2
              className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-tight mb-8"
              style={{ letterSpacing: "-0.04em" }}
            >
              Pret a decoder
              <br />
              <span className="bg-gradient-to-r from-red-400 via-rose-400 to-orange-400 bg-clip-text text-transparent">
                ton sang ?
              </span>
            </h2>

            <p className="text-xl text-white/50 mb-12 max-w-xl mx-auto">
              Upload ton PDF. Resultats en 2 minutes.
              <br />
              99€ deduits si tu prends un coaching.
            </p>

            <Link href="/blood-analysis">
              <Button
                size="lg"
                className="h-16 px-12 text-lg font-semibold rounded-2xl bg-red-500 hover:bg-red-400 text-white hover:scale-105 transition-all duration-300 shadow-[0_0_80px_rgba(239,68,68,0.5)]"
              >
                <Upload className="mr-3 h-5 w-5" />
                Analyser mon bilan sanguin
                <ArrowRight className="ml-3 h-5 w-5" />
              </Button>
            </Link>

            {/* Trust badges */}
            <div className="mt-12 flex flex-wrap items-center justify-center gap-8 text-sm text-white/30">
              <span className="flex items-center gap-2">
                <Lock className="h-4 w-4" /> Paiement securise
              </span>
              <span className="flex items-center gap-2">
                <Zap className="h-4 w-4" /> Resultats instantanes
              </span>
              <span className="flex items-center gap-2">
                <Shield className="h-4 w-4" /> Donnees RGPD
              </span>
            </div>
          </motion.div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
