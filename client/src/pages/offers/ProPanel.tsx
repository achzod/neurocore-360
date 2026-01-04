/**
 * NEUROCORE 360 - Ultimate Scan Offer Page
 * Ultrahuman-inspired premium design - 79€
 */

import { useState, useRef } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import {
  Zap,
  ArrowRight,
  Check,
  Watch,
  Activity,
  Heart,
  Bone,
  Brain,
  Crown,
  Target,
  ChevronDown,
  Lock,
  Shield,
  Clock,
  Sparkles,
  TrendingUp,
  BarChart3,
  Moon,
  Dumbbell,
  Camera,
  Scan,
  Users,
  Eye,
  Layers,
} from "lucide-react";

// Wearables supported (without emojis)
const wearables = [
  { name: "Apple Health", color: "#ffffff" },
  { name: "Oura Ring", color: "#C9A962" },
  { name: "Whoop", color: "#00A86B" },
  { name: "Garmin", color: "#007DC3" },
  { name: "Ultrahuman", color: "#FF4F00" },
  { name: "Polar", color: "#D40029" },
];

// Ultimate Scan exclusive features
const ultimateFeatures = [
  {
    icon: Camera,
    title: "Analyse Photo Complete",
    desc: "Posture, morphotype, repartition graisseuse analysees par IA",
    gradient: "from-cyan-500 to-blue-500"
  },
  {
    icon: Eye,
    title: "Analyse Visuelle Posturale",
    desc: "Detection des desequilibres, asymetries, compensations",
    gradient: "from-violet-500 to-purple-500"
  },
  {
    icon: Bone,
    title: "Analyse Biomecanique",
    desc: "Psoas, diaphragme, sangle abdominale profonde",
    gradient: "from-orange-500 to-amber-500"
  },
  {
    icon: Layers,
    title: "18 Sections d'Analyse",
    desc: "2 sections supplementaires vs Anabolic Bioscan",
    gradient: "from-emerald-500 to-green-500"
  },
  {
    icon: BarChart3,
    title: "Rapport 40-50 Pages",
    desc: "Le plus complet de notre gamme",
    gradient: "from-pink-500 to-rose-500"
  },
  {
    icon: Dumbbell,
    title: "Protocole Correction",
    desc: "Exercices correctifs pour tes desequilibres",
    gradient: "from-indigo-500 to-blue-500"
  },
];

// What's included
const includedFeatures = [
  "Tout l'Anabolic Bioscan inclus",
  "16 sections questionnaire",
  "5 protocoles fermes",
  "Stack supplements",
  "Plan 30-60-90 jours",
  "Analyse photo posturale",
  "Analyse morphotype",
  "Repartition graisseuse",
  "Analyse biomecanique",
  "18 sections totales",
  "Rapport PDF 40-50 pages",
];

// FAQ items
const faqItems = [
  {
    question: "C'est quoi la difference avec l'Anabolic Bioscan ?",
    answer: "L'Anabolic Bioscan (59€) analyse via questionnaire uniquement. L'Ultimate Scan (79€) ajoute l'analyse photo : posture, morphotype, repartition graisseuse, biomecanique. 18 sections au lieu de 16, rapport 40-50 pages."
  },
  {
    question: "Comment fonctionne l'analyse photo ?",
    answer: "Tu uploades 4 photos (face, dos, profil gauche, profil droit) en position standard. Notre IA analyse ta posture, detecte les asymetries, evalue ton morphotype et la repartition graisseuse."
  },
  {
    question: "Les 79€ sont deduits du coaching ?",
    answer: "Oui. Si tu prends un coaching dans les 30 jours, les 79€ sont integralement deduits. L'Ultimate Scan devient gratuit."
  },
  {
    question: "Combien de temps pour le rapport ?",
    answer: "24-48h apres completion. Tu recois un email avec acces au dashboard + PDF 40-50 pages."
  },
  {
    question: "Pour qui est l'Ultimate Scan ?",
    answer: "Athletes serieux, personnes avec douleurs posturales, ceux qui veulent l'analyse la plus complete. Si tu veux juste le questionnaire, l'Anabolic Bioscan suffit."
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
        <span className="text-lg font-medium text-white group-hover:text-cyan-400 transition-colors">
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

export default function ProPanel() {
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
            <div className="absolute top-1/4 right-1/4 w-[700px] h-[700px] bg-cyan-500/20 rounded-full blur-[180px] animate-pulse" />
            <div className="absolute bottom-1/3 left-1/4 w-[500px] h-[500px] bg-blue-500/15 rounded-full blur-[150px] animate-pulse" style={{ animationDelay: "1s" }} />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-violet-500/10 rounded-full blur-[200px]" />
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
                  <Badge className="mb-8 px-6 py-2 bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 text-sm font-medium backdrop-blur-xl">
                    <Crown className="mr-2 h-4 w-4" />
                    LE PLUS COMPLET
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
                  <span className="text-white">Ultimate</span>
                  <br />
                  <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-violet-400 bg-clip-text text-transparent">
                    Scan.
                  </span>
                </motion.h1>

                {/* Subheadline */}
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="mt-8 text-xl sm:text-2xl text-white/60 max-w-xl font-light leading-relaxed"
                >
                  Questionnaire + Analyse photo.
                  <br />
                  <span className="text-white/40">La precision maximale. 18 sections. 40-50 pages.</span>
                </motion.p>

                {/* Price */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="mt-8 flex items-baseline gap-3"
                >
                  <span className="text-5xl font-black text-cyan-400">79€</span>
                  <span className="text-white/40">one-time</span>
                  <Badge className="ml-2 bg-cyan-500/20 text-cyan-400 border-cyan-500/30">
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
                  <Link href="/audit-complet/questionnaire?tier=elite">
                    <Button
                      size="lg"
                      className="h-16 px-10 text-lg font-semibold rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-black hover:scale-105 transition-all duration-300 shadow-[0_0_60px_rgba(6,182,212,0.4)]"
                    >
                      <Zap className="mr-3 h-5 w-5" />
                      Lancer mon Ultimate Scan
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
                    <Camera className="h-4 w-4" /> Analyse photo IA
                  </span>
                  <span className="flex items-center gap-2">
                    <Clock className="h-4 w-4" /> Resultats 24-48h
                  </span>
                  <span className="flex items-center gap-2">
                    <Users className="h-4 w-4" /> +200 scans
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
                    className="w-full aspect-[4/5] object-cover"
                  >
                    <source
                      src="https://cdn.speedsize.com/3f711f28-1488-44dc-b013-5e43284ac4b0/https://public-web-assets.uh-static.com/web_v2/home/accuracy-section/CarousalRingVideo.mp4"
                      type="video/mp4"
                    />
                  </video>

                  {/* Gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent pointer-events-none" />

                  {/* Overlay content */}
                  <div className="absolute bottom-0 left-0 right-0 p-8">
                    <div className="grid grid-cols-3 gap-4 mb-6">
                      <div className="text-center p-3 rounded-xl bg-white/5 backdrop-blur-xl border border-white/10">
                        <div className="text-2xl font-black text-cyan-400">18</div>
                        <div className="text-xs text-white/40">Sections</div>
                      </div>
                      <div className="text-center p-3 rounded-xl bg-white/5 backdrop-blur-xl border border-white/10">
                        <div className="text-2xl font-black text-cyan-400">4</div>
                        <div className="text-xs text-white/40">Photos</div>
                      </div>
                      <div className="text-center p-3 rounded-xl bg-white/5 backdrop-blur-xl border border-white/10">
                        <div className="text-2xl font-black text-cyan-400">50</div>
                        <div className="text-xs text-white/40">Pages</div>
                      </div>
                    </div>
                    <p className="text-white font-semibold">Analyse visuelle et posturale</p>
                    <p className="text-white/60 text-sm">Morphotype, asymetries, biomecanique</p>
                  </div>
                </div>

                {/* Background glow */}
                <div className="absolute -inset-8 bg-cyan-500/20 blur-[100px] rounded-full -z-10" />
              </motion.div>
            </div>
          </motion.div>
        </section>

        {/* === FEATURES BENTO GRID === */}
        <section className="relative py-32 overflow-hidden">
          {/* Background */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-500/5 to-transparent" />

          <div className="relative mx-auto max-w-7xl px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-20"
            >
              <h2 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight" style={{ letterSpacing: "-0.03em" }}>
                Ce qui fait la <span className="text-cyan-400">difference</span>
              </h2>
              <p className="mt-6 text-xl text-white/50 max-w-2xl mx-auto">
                L'analyse photo transforme le diagnostic en precision maximale
              </p>
            </motion.div>

            {/* Bento Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {ultimateFeatures.map((feature, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="group relative p-8 rounded-3xl border border-white/10 bg-white/[0.02] backdrop-blur-xl hover:border-cyan-500/30 hover:bg-white/[0.04] transition-all duration-500"
                >
                  {/* Gradient overlay on hover */}
                  <div className={`absolute inset-0 rounded-3xl bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-500`} />

                  <div className="relative z-10">
                    <div className={`inline-flex p-3 rounded-2xl bg-gradient-to-br ${feature.gradient} mb-6`}>
                      <feature.icon className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-white/50 leading-relaxed">
                      {feature.desc}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* === COMPARISON === */}
        <section className="relative py-32 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/[0.02] to-transparent" />

          <div className="relative mx-auto max-w-5xl px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="text-4xl sm:text-5xl font-black tracking-tight" style={{ letterSpacing: "-0.03em" }}>
                <span className="text-emerald-400">Anabolic</span> vs <span className="text-cyan-400">Ultimate</span>
              </h2>
            </motion.div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Anabolic Bioscan */}
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="p-8 rounded-3xl border border-emerald-500/30 bg-emerald-500/5"
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-bold text-emerald-400">Anabolic Bioscan</h3>
                  <span className="text-3xl font-black text-emerald-400">59€</span>
                </div>

                <div className="space-y-3">
                  {[
                    "16 sections d'analyse",
                    "180+ questions",
                    "5 protocoles fermes",
                    "Stack supplements",
                    "Plan 30-60-90 jours",
                    "Rapport PDF 25-30 pages",
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Check className="h-5 w-5 text-emerald-400" />
                      <span className="text-white/70">{item}</span>
                    </div>
                  ))}
                  {[
                    "Analyse photo",
                    "Analyse posturale",
                    "Analyse biomecanique",
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3 opacity-40">
                      <div className="h-5 w-5 flex items-center justify-center text-white/30">—</div>
                      <span className="text-white/40 line-through">{item}</span>
                    </div>
                  ))}
                </div>

                <Link href="/offers/anabolic-bioscan">
                  <Button variant="outline" className="w-full mt-8 h-14 text-lg font-semibold rounded-2xl border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10">
                    Voir Anabolic Bioscan
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
              </motion.div>

              {/* Ultimate Scan */}
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="relative p-8 rounded-3xl border border-cyan-500/50 bg-cyan-500/5 shadow-[0_0_60px_rgba(6,182,212,0.15)]"
              >
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-cyan-500 text-white font-semibold">
                  RECOMMANDE
                </Badge>

                <div className="flex items-center justify-between mb-6 mt-2">
                  <h3 className="text-2xl font-bold text-cyan-400">Ultimate Scan</h3>
                  <span className="text-3xl font-black text-cyan-400">79€</span>
                </div>

                <div className="space-y-3">
                  {[
                    "Tout l'Anabolic Bioscan +",
                    "18 sections d'analyse",
                    "Analyse photo 4 angles",
                    "Analyse posturale IA",
                    "Morphotype & graisses",
                    "Analyse biomecanique",
                    "Protocole correction",
                    "Rapport PDF 40-50 pages",
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Check className="h-5 w-5 text-cyan-400" />
                      <span className="text-white/70">{item}</span>
                    </div>
                  ))}
                </div>

                <Link href="/audit-complet/questionnaire?tier=elite">
                  <Button className="w-full mt-8 h-14 text-lg font-semibold rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-black shadow-[0_0_40px_rgba(6,182,212,0.4)]">
                    Choisir Ultimate Scan
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
              </motion.div>
            </div>
          </div>
        </section>

        {/* === WHAT'S INCLUDED === */}
        <section className="relative py-32 overflow-hidden">
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-[200px]" />

          <div className="relative mx-auto max-w-4xl px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="text-4xl sm:text-5xl font-black tracking-tight" style={{ letterSpacing: "-0.03em" }}>
                Tout ce que tu <span className="text-cyan-400">recois</span>
              </h2>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="p-8 rounded-3xl border border-cyan-500/30 bg-cyan-500/5"
            >
              <div className="grid sm:grid-cols-2 gap-4">
                {includedFeatures.map((feature, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center gap-3"
                  >
                    <Check className="h-5 w-5 text-cyan-400 shrink-0" />
                    <span className="text-white/70">{feature}</span>
                  </motion.div>
                ))}
              </div>

              <div className="mt-8 pt-8 border-t border-white/10 flex items-center justify-between">
                <div>
                  <span className="text-4xl font-black text-cyan-400">79€</span>
                  <span className="text-white/40 ml-2">one-time</span>
                </div>
                <Link href="/audit-complet/questionnaire?tier=elite">
                  <Button className="h-14 px-8 text-lg font-semibold rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-black">
                    Obtenir Ultimate Scan
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
                Questions <span className="text-cyan-400">frequentes</span>
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
          {/* Background glow */}
          <div className="absolute inset-0">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[500px] bg-cyan-500/20 rounded-full blur-[200px]" />
          </div>

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative mx-auto max-w-4xl px-4 text-center"
          >
            <Zap className="h-20 w-20 text-cyan-400 mx-auto mb-8" />

            <h2
              className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-tight mb-8"
              style={{ letterSpacing: "-0.04em" }}
            >
              Pret pour
              <br />
              <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-violet-400 bg-clip-text text-transparent">
                l'analyse ultime ?
              </span>
            </h2>

            <p className="text-xl text-white/50 mb-12 max-w-xl mx-auto">
              Questionnaire + Photos = Precision maximale.
              <br />
              79€ deduits si tu prends un coaching.
            </p>

            <Link href="/audit-complet/questionnaire?tier=elite">
              <Button
                size="lg"
                className="h-16 px-12 text-lg font-semibold rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-black hover:scale-105 transition-all duration-300 shadow-[0_0_80px_rgba(6,182,212,0.5)]"
              >
                <Zap className="mr-3 h-5 w-5" />
                Lancer mon Ultimate Scan
                <ArrowRight className="ml-3 h-5 w-5" />
              </Button>
            </Link>

            {/* Trust badges */}
            <div className="mt-12 flex flex-wrap items-center justify-center gap-8 text-sm text-white/30">
              <span className="flex items-center gap-2">
                <Lock className="h-4 w-4" /> Paiement securise
              </span>
              <span className="flex items-center gap-2">
                <Camera className="h-4 w-4" /> Analyse photo IA
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
