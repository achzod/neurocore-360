/**
 * NEUROCORE 360 - Anabolic Bioscan Offer Page
 * Ultrahuman-inspired premium design - 59€
 */

import { useState, useRef, useEffect } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion, useScroll, useTransform, AnimatePresence, useMotionValue, useSpring } from "framer-motion";
import { Link } from "wouter";
import {
  ArrowRight,
  Check,
  ChevronDown,
  Shield,
  Clock,
  Target,
  Activity,
  Zap,
  Brain,
  Heart,
  Flame,
  Moon,
  Dumbbell,
  Utensils,
  Sparkles,
  BarChart3,
  Scan,
  FlaskConical,
  Coffee,
  Bone,
  HeartHandshake,
  FileText,
  Lock,
  Play,
  Users,
} from "lucide-react";

// 16 Analysis domains with their icons and gradients
const analysisDomains = [
  { name: "Profil de Base", icon: Target, gradient: "from-emerald-500 to-green-600" },
  { name: "Composition Corporelle", icon: Activity, gradient: "from-blue-500 to-cyan-500" },
  { name: "Metabolisme & Energie", icon: Flame, gradient: "from-orange-500 to-amber-500" },
  { name: "Nutrition & Tracking", icon: Utensils, gradient: "from-green-500 to-emerald-500" },
  { name: "Digestion & Microbiome", icon: FlaskConical, gradient: "from-yellow-500 to-orange-500" },
  { name: "Activite & Performance", icon: Dumbbell, gradient: "from-purple-500 to-violet-500" },
  { name: "Sommeil & Recuperation", icon: Moon, gradient: "from-indigo-500 to-blue-500" },
  { name: "HRV & Cardiaque", icon: Heart, gradient: "from-red-500 to-rose-500" },
  { name: "Analyses & Biomarqueurs", icon: FlaskConical, gradient: "from-cyan-500 to-teal-500" },
  { name: "Hormones & Stress", icon: Zap, gradient: "from-amber-500 to-yellow-500" },
  { name: "Lifestyle & Substances", icon: Coffee, gradient: "from-pink-500 to-rose-500" },
  { name: "Biomecanique & Mobilite", icon: Bone, gradient: "from-teal-500 to-cyan-500" },
  { name: "Psychologie & Mental", icon: Brain, gradient: "from-violet-500 to-purple-500" },
  { name: "Neurotransmetteurs", icon: Sparkles, gradient: "from-rose-500 to-pink-500" },
  { name: "Hormones Sexuelles", icon: HeartHandshake, gradient: "from-lime-500 to-green-500" },
  { name: "Score Global", icon: BarChart3, gradient: "from-emerald-400 to-cyan-500" },
];

// Protocol cards
const protocols = [
  {
    title: "Protocole Matin Anti-Cortisol",
    desc: "Routine matinale scientifique pour optimiser ton eveil et reduire le stress chronique",
    icon: Flame,
    color: "orange"
  },
  {
    title: "Protocole Soir Sommeil",
    desc: "Sequence du coucher pour maximiser la qualite du sommeil profond et REM",
    icon: Moon,
    color: "indigo"
  },
  {
    title: "Protocole Digestion 14J",
    desc: "Reset digestif complet pour restaurer la fonction intestinale optimale",
    icon: FlaskConical,
    color: "green"
  },
  {
    title: "Stack Supplements",
    desc: "Dosages precis, timing d'administration, interactions et sources recommandees",
    icon: Zap,
    color: "amber"
  },
  {
    title: "Plan 30-60-90 Jours",
    desc: "Roadmap semaine par semaine avec objectifs mesurables et checkpoints",
    icon: Target,
    color: "cyan"
  },
];

// FAQ items
const faqItems = [
  {
    question: "Combien de temps prend le questionnaire ?",
    answer: "25-30 minutes. Divise en 16 sections. Tu peux sauvegarder et reprendre a tout moment."
  },
  {
    question: "Comment sont calcules les scores ?",
    answer: "Chaque domaine recoit un score de 0 a 100. Les scores sont ponderes selon l'impact sur ta sante. Un score global est calcule, et tes priorites sont identifiees automatiquement."
  },
  {
    question: "C'est quoi la difference avec l'Ultimate Scan ?",
    answer: "L'Anabolic Bioscan analyse via questionnaire. L'Ultimate Scan (79€) ajoute l'analyse photo : posture, morphotype, repartition graisseuse, biomecanique."
  },
  {
    question: "Les 59€ sont deduits du coaching ?",
    answer: "Oui. Si tu prends un coaching Essential ou Private Lab dans les 30 jours, les 59€ sont integralement deduits. Ton scan devient gratuit."
  },
  {
    question: "Combien de temps pour le rapport ?",
    answer: "24-48h apres completion. Tu recois un email avec acces au dashboard interactif + PDF 25-30 pages."
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
        <span className="text-lg font-medium text-white group-hover:text-emerald-400 transition-colors">
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

// Animated score display
function AnimatedScore({ score, label, color }: { score: number; label: string; color: string }) {
  const [displayScore, setDisplayScore] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      let current = 0;
      const interval = setInterval(() => {
        current += 1;
        setDisplayScore(current);
        if (current >= score) clearInterval(interval);
      }, 20);
      return () => clearInterval(interval);
    }, 500);
    return () => clearTimeout(timer);
  }, [score]);

  return (
    <div className="text-center">
      <div className={`text-4xl font-black ${color}`}>{displayScore}</div>
      <div className="text-xs text-white/40 mt-1">{label}</div>
    </div>
  );
}

export default function AuditPremium() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [isVideoPlaying, setIsVideoPlaying] = useState(true);
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
            <div className="absolute top-1/3 left-1/4 w-[700px] h-[700px] bg-emerald-500/20 rounded-full blur-[180px] animate-pulse" />
            <div className="absolute bottom-1/4 right-1/3 w-[500px] h-[500px] bg-green-500/15 rounded-full blur-[150px] animate-pulse" style={{ animationDelay: "1.5s" }} />
            <div className="absolute top-1/2 right-1/4 w-[400px] h-[400px] bg-teal-500/10 rounded-full blur-[120px]" />
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
                  <Badge className="mb-8 px-6 py-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-sm font-medium backdrop-blur-xl">
                    16 SECTIONS D'ANALYSE
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
                  <span className="text-white">Anabolic</span>
                  <br />
                  <span className="bg-gradient-to-r from-emerald-400 via-green-400 to-teal-400 bg-clip-text text-transparent">
                    Bioscan.
                  </span>
                </motion.h1>

                {/* Subheadline */}
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="mt-8 text-xl sm:text-2xl text-white/60 max-w-xl font-light leading-relaxed"
                >
                  L'analyse metabolique la plus complete.
                  <br />
                  <span className="text-white/40">Diagnostic + Protocoles + Plan d'action.</span>
                </motion.p>

                {/* Price */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="mt-8 flex items-baseline gap-3"
                >
                  <span className="text-5xl font-black text-emerald-400">59€</span>
                  <span className="text-white/40">one-time</span>
                  <Badge className="ml-2 bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
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
                  <Link href="/audit-complet/questionnaire">
                    <Button
                      size="lg"
                      className="h-16 px-10 text-lg font-semibold rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-white hover:scale-105 transition-all duration-300 shadow-[0_0_60px_rgba(16,185,129,0.4)]"
                    >
                      <Scan className="mr-3 h-5 w-5" />
                      Lancer mon Bioscan
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
                    <Clock className="h-4 w-4" /> 25-30 min
                  </span>
                  <span className="flex items-center gap-2">
                    <Shield className="h-4 w-4" /> Resultats 24-48h
                  </span>
                  <span className="flex items-center gap-2">
                    <Users className="h-4 w-4" /> +500 scans
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
                {/* Video container with glassmorphism */}
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

                  {/* Video caption */}
                  <div className="absolute bottom-6 left-6 right-6">
                    <p className="text-white font-semibold mb-1">Analyse metabolique avancee</p>
                    <p className="text-white/60 text-sm">Visualisation en temps reel de tes biomarqueurs</p>
                  </div>
                </div>

                {/* Floating score cards */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 }}
                  className="absolute -bottom-8 left-4 right-4 p-6 rounded-2xl border border-white/10 bg-black/80 backdrop-blur-xl"
                >
                  <div className="grid grid-cols-4 gap-4">
                    <AnimatedScore score={82} label="Metabolisme" color="text-emerald-400" />
                    <AnimatedScore score={71} label="Hormones" color="text-amber-400" />
                    <AnimatedScore score={78} label="Sommeil" color="text-indigo-400" />
                    <AnimatedScore score={76} label="Mental" color="text-purple-400" />
                  </div>
                </motion.div>

                {/* Background glow */}
                <div className="absolute -inset-8 bg-emerald-500/20 blur-[100px] rounded-full -z-10" />
              </motion.div>
            </div>
          </motion.div>
        </section>

        {/* === DOMAINS BENTO GRID === */}
        <section className="relative py-32 overflow-hidden">
          {/* Background */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-emerald-500/5 to-transparent" />

          <div className="relative mx-auto max-w-7xl px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-20"
            >
              <h2 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight" style={{ letterSpacing: "-0.03em" }}>
                16 domaines <span className="text-emerald-400">analyses</span>
              </h2>
              <p className="mt-6 text-xl text-white/50 max-w-2xl mx-auto">
                L'analyse la plus complete du marche. Chaque domaine score de 0 a 100.
              </p>
            </motion.div>

            {/* Bento Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {analysisDomains.map((domain, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.03 }}
                  className="group relative p-5 rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-xl hover:border-emerald-500/30 hover:bg-white/[0.04] transition-all duration-500"
                >
                  <div className={`inline-flex p-2.5 rounded-xl bg-gradient-to-br ${domain.gradient} mb-3`}>
                    <domain.icon className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="text-sm font-semibold text-white group-hover:text-emerald-400 transition-colors">
                    {domain.name}
                  </h3>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* === WHAT YOU GET === */}
        <section className="relative py-32 overflow-hidden">
          <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[200px]" />

          <div className="relative mx-auto max-w-7xl px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-20"
            >
              <h2 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight" style={{ letterSpacing: "-0.03em" }}>
                Ce que tu <span className="text-emerald-400">recois</span>
              </h2>
              <p className="mt-6 text-xl text-white/50">
                Bien plus qu'un simple questionnaire
              </p>
            </motion.div>

            <div className="grid lg:grid-cols-2 gap-8">
              {/* Report Preview */}
              <motion.div
                initial={{ opacity: 0, x: -40 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="relative p-8 rounded-3xl border border-white/10 bg-white/[0.02] backdrop-blur-xl"
              >
                <Badge className="absolute top-6 right-6 bg-emerald-500/20 text-emerald-400">
                  25-30 pages
                </Badge>

                <h3 className="text-2xl font-bold text-white mb-6">Rapport PDF Complet</h3>

                <div className="space-y-4">
                  {[
                    "Synthese executive avec priorites",
                    "Scores detailles par domaine",
                    "Analyse forces et faiblesses",
                    "Graphiques et visualisations",
                    "Recommandations personnalisees",
                    "Sources scientifiques citees",
                  ].map((item, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.1 }}
                      className="flex items-center gap-3"
                    >
                      <Check className="h-5 w-5 text-emerald-400 shrink-0" />
                      <span className="text-white/70">{item}</span>
                    </motion.div>
                  ))}
                </div>

                {/* Mock PDF preview */}
                <div className="mt-8 p-4 rounded-xl bg-white/5 border border-white/10">
                  <div className="flex gap-4">
                    <div className="w-16 h-20 rounded bg-gradient-to-br from-emerald-500/20 to-green-500/20 flex items-center justify-center">
                      <FileText className="h-8 w-8 text-emerald-400" />
                    </div>
                    <div>
                      <p className="font-semibold text-white">anabolic-bioscan-rapport.pdf</p>
                      <p className="text-sm text-white/40">Genere sous 24-48h</p>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Protocols Grid */}
              <div className="space-y-4">
                {protocols.map((protocol, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: 40 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="p-6 rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-xl hover:border-emerald-500/30 transition-all duration-300"
                  >
                    <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-xl bg-gradient-to-br ${
                        protocol.color === "orange" ? "from-orange-500 to-amber-500" :
                        protocol.color === "indigo" ? "from-indigo-500 to-blue-500" :
                        protocol.color === "green" ? "from-green-500 to-emerald-500" :
                        protocol.color === "amber" ? "from-amber-500 to-yellow-500" :
                        "from-cyan-500 to-teal-500"
                      }`}>
                        <protocol.icon className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-white mb-1">{protocol.title}</h4>
                        <p className="text-sm text-white/50">{protocol.desc}</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
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
                Anabolic vs <span className="text-cyan-400">Ultimate</span>
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
                </div>

                <Link href="/audit-complet/questionnaire">
                  <Button className="w-full mt-8 h-14 text-lg font-semibold rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-white">
                    Choisir Anabolic
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
              </motion.div>

              {/* Ultimate Scan */}
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="relative p-8 rounded-3xl border border-cyan-500/30 bg-cyan-500/5"
              >
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-cyan-500 text-white">
                  LE PLUS COMPLET
                </Badge>

                <div className="flex items-center justify-between mb-6 mt-2">
                  <h3 className="text-2xl font-bold text-cyan-400">Ultimate Scan</h3>
                  <span className="text-3xl font-black text-cyan-400">79€</span>
                </div>

                <div className="space-y-3">
                  {[
                    "Tout l'Anabolic Bioscan +",
                    "18 sections d'analyse",
                    "Analyse photo posturale",
                    "Morphotype & graisses",
                    "Analyse biomecanique",
                    "Rapport PDF 40-50 pages",
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Check className="h-5 w-5 text-cyan-400" />
                      <span className="text-white/70">{item}</span>
                    </div>
                  ))}
                </div>

                <Link href="/offers/ultimate-scan">
                  <Button className="w-full mt-8 h-14 text-lg font-semibold rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-white shadow-[0_0_40px_rgba(6,182,212,0.3)]">
                    Choisir Ultimate
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
              </motion.div>
            </div>
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
                Questions <span className="text-emerald-400">frequentes</span>
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
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[500px] bg-emerald-500/20 rounded-full blur-[200px]" />
          </div>

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative mx-auto max-w-4xl px-4 text-center"
          >
            <Scan className="h-20 w-20 text-emerald-400 mx-auto mb-8" />

            <h2
              className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-tight mb-8"
              style={{ letterSpacing: "-0.04em" }}
            >
              Pret pour ton
              <br />
              <span className="bg-gradient-to-r from-emerald-400 via-green-400 to-teal-400 bg-clip-text text-transparent">
                Anabolic Bioscan ?
              </span>
            </h2>

            <p className="text-xl text-white/50 mb-12 max-w-xl mx-auto">
              59€ deduits si tu prends un coaching.
              <br />
              L'investissement le plus rentable pour ta sante.
            </p>

            <Link href="/audit-complet/questionnaire">
              <Button
                size="lg"
                className="h-16 px-12 text-lg font-semibold rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-white hover:scale-105 transition-all duration-300 shadow-[0_0_80px_rgba(16,185,129,0.5)]"
              >
                <Scan className="mr-3 h-5 w-5" />
                Lancer mon Anabolic Bioscan
                <ArrowRight className="ml-3 h-5 w-5" />
              </Button>
            </Link>

            {/* Trust badges */}
            <div className="mt-12 flex flex-wrap items-center justify-center gap-8 text-sm text-white/30">
              <span className="flex items-center gap-2">
                <Lock className="h-4 w-4" /> Paiement securise
              </span>
              <span className="flex items-center gap-2">
                <Clock className="h-4 w-4" /> 25-30 minutes
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
