/**
 * NEUROCORE 360 - Burnout Detection Offer Page
 * Ultrahuman-inspired premium design - 39€
 */

import { useState, useRef } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import {
  Brain,
  ArrowRight,
  Check,
  AlertTriangle,
  Activity,
  Battery,
  Zap,
  FileText,
  Target,
  Shield,
  Clock,
  TrendingDown,
  ChevronDown,
  Lock,
  Moon,
  Flame,
  Users,
  Calendar,
  BarChart3,
  BatteryWarning,
  BatteryLow,
} from "lucide-react";

// Burnout phases
const burnoutPhases = [
  {
    phase: 1,
    name: "Alarme",
    desc: "Stress aigu, activation sympathique. Le corps reagit mais n'est pas epuise.",
    recovery: "2-4 semaines",
    color: "amber",
    icon: AlertTriangle,
  },
  {
    phase: 2,
    name: "Resistance",
    desc: "Adaptation chronique. Cortisol eleve, le corps compense mais s'epuise.",
    recovery: "1-3 mois",
    color: "orange",
    icon: BatteryWarning,
  },
  {
    phase: 3,
    name: "Epuisement",
    desc: "Burnout installe. Crash hormonal. Intervention necessaire.",
    recovery: "3-12 mois",
    color: "red",
    icon: BatteryLow,
  },
];

// Protocol weeks
const protocolWeeks = [
  { week: 1, title: "Reset Nerveux", icon: Moon, focus: "Calmer le systeme nerveux" },
  { week: 2, title: "Nutrition Anti-Stress", icon: Flame, focus: "Nourrir les surrenales" },
  { week: 3, title: "Mouvement Doux", icon: Activity, focus: "Reactivation sans stress" },
  { week: 4, title: "Reconstruction", icon: Target, focus: "Routines durables" },
];

// Features
const features = [
  { icon: FileText, title: "Questionnaire 50 questions", desc: "Evaluation neuro-endocrinienne" },
  { icon: BarChart3, title: "Score Burnout 0-100", desc: "Quantification precise" },
  { icon: AlertTriangle, title: "Detection de Phase", desc: "Alarme, Resistance, Epuisement" },
  { icon: Brain, title: "Profil Hormonal Estime", desc: "Cortisol, DHEA, thyroide" },
  { icon: Calendar, title: "Protocole 4 Semaines", desc: "Plan de sortie personnalise" },
  { icon: Activity, title: "Dashboard Temps Reel", desc: "Suivi de ton evolution" },
];

// FAQ
const faqItems = [
  {
    question: "Comment le questionnaire detecte le burnout ?",
    answer: "Base sur les echelles validees (MBI, CBI) et enrichi par les symptomes neuro-endocriniens. 5 dimensions evaluees."
  },
  {
    question: "C'est quoi la difference avec un test de stress ?",
    answer: "Nous estimons l'impact sur l'axe HPA, les neurotransmetteurs et la thyroide. Pas juste le stress percu."
  },
  {
    question: "Que faire si je suis en phase 3 ?",
    answer: "Consultation medicale recommandee. Notre protocole est un debut, mais la phase 3 necessite un suivi long terme."
  },
  {
    question: "Combien de temps dure le questionnaire ?",
    answer: "8-10 minutes. 50 questions en sections thematiques. Resultats immediats."
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
        <span className="text-lg font-medium text-white group-hover:text-purple-400 transition-colors">
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

export default function BurnoutDetection() {
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
            <div className="absolute top-1/4 left-1/3 w-[700px] h-[700px] bg-purple-500/20 rounded-full blur-[180px] animate-pulse" />
            <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-red-500/15 rounded-full blur-[150px] animate-pulse" style={{ animationDelay: "1.5s" }} />
            <div className="absolute top-1/2 left-1/4 w-[400px] h-[400px] bg-orange-500/10 rounded-full blur-[120px]" />
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
                  <Badge className="mb-8 px-6 py-2 bg-purple-500/10 text-purple-400 border border-purple-500/30 text-sm font-medium backdrop-blur-xl">
                    <Brain className="mr-2 h-4 w-4" />
                    PREVENTION
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
                  <span className="text-white">Burnout</span>
                  <br />
                  <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-red-400 bg-clip-text text-transparent">
                    Detection.
                  </span>
                </motion.h1>

                {/* Subheadline */}
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="mt-8 text-xl sm:text-2xl text-white/60 max-w-xl font-light leading-relaxed"
                >
                  Detecte avant la crise.
                  <br />
                  <span className="text-white/40">Protocole de sortie personnalise.</span>
                </motion.p>

                {/* Price */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="mt-8 flex items-baseline gap-3"
                >
                  <span className="text-5xl font-black text-purple-400">39€</span>
                  <span className="text-white/40">one-time</span>
                </motion.div>

                {/* CTA */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 }}
                  className="mt-10 flex flex-col sm:flex-row gap-4"
                >
                  <Link href="/burnout-detection">
                    <Button
                      size="lg"
                      className="h-16 px-10 text-lg font-semibold rounded-2xl bg-purple-500 hover:bg-purple-400 text-white hover:scale-105 transition-all duration-300 shadow-[0_0_60px_rgba(168,85,247,0.4)]"
                    >
                      <Brain className="mr-3 h-5 w-5" />
                      Evaluer mon risque
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
                    <Clock className="h-4 w-4" /> 8-10 min
                  </span>
                  <span className="flex items-center gap-2">
                    <Zap className="h-4 w-4" /> Resultats immediats
                  </span>
                  <span className="flex items-center gap-2">
                    <Shield className="h-4 w-4" /> 100% confidentiel
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
                {/* Score visualization */}
                <div className="relative p-8 rounded-3xl border border-white/10 bg-white/[0.02] backdrop-blur-xl shadow-2xl">
                  {/* Score circle */}
                  <div className="relative w-48 h-48 mx-auto mb-8">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle cx="96" cy="96" r="88" stroke="rgba(255,255,255,0.1)" strokeWidth="12" fill="none" />
                      <circle
                        cx="96" cy="96" r="88"
                        stroke="url(#burnoutGradient)"
                        strokeWidth="12"
                        fill="none"
                        strokeDasharray={`${0.45 * 553} ${553}`}
                        strokeLinecap="round"
                      />
                      <defs>
                        <linearGradient id="burnoutGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#a855f7" />
                          <stop offset="100%" stopColor="#f97316" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-6xl font-black text-white">45</span>
                      <span className="text-sm text-white/40">sur 100</span>
                    </div>
                  </div>

                  {/* Phase indicator */}
                  <div className="p-4 rounded-2xl bg-orange-500/10 border border-orange-500/30 mb-6">
                    <div className="flex items-center gap-3">
                      <BatteryWarning className="h-6 w-6 text-orange-400" />
                      <div>
                        <p className="font-bold text-orange-400">Phase 2 : Resistance</p>
                        <p className="text-sm text-white/50">Intervention recommandee</p>
                      </div>
                    </div>
                  </div>

                  {/* Mini scores */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 rounded-xl bg-white/5 text-center">
                      <div className="text-xs text-white/40 mb-1">Physique</div>
                      <div className="text-xl font-bold text-amber-400">52</div>
                    </div>
                    <div className="p-3 rounded-xl bg-white/5 text-center">
                      <div className="text-xs text-white/40 mb-1">Mental</div>
                      <div className="text-xl font-bold text-orange-400">48</div>
                    </div>
                    <div className="p-3 rounded-xl bg-white/5 text-center">
                      <div className="text-xs text-white/40 mb-1">Emotionnel</div>
                      <div className="text-xl font-bold text-purple-400">38</div>
                    </div>
                  </div>
                </div>

                {/* Background glow */}
                <div className="absolute -inset-8 bg-purple-500/20 blur-[100px] rounded-full -z-10" />
              </motion.div>
            </div>
          </motion.div>
        </section>

        {/* === PHASES === */}
        <section className="relative py-32 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-purple-500/5 to-transparent" />

          <div className="relative mx-auto max-w-7xl px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-20"
            >
              <h2 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight" style={{ letterSpacing: "-0.03em" }}>
                Les 3 <span className="text-purple-400">phases</span>
              </h2>
              <p className="mt-6 text-xl text-white/50 max-w-2xl mx-auto">
                Plus tu detectes tot, plus la recuperation est rapide
              </p>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-6">
              {burnoutPhases.map((phase, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className={`relative p-8 rounded-3xl border bg-white/[0.02] backdrop-blur-xl ${
                    phase.color === "amber" ? "border-amber-500/30" :
                    phase.color === "orange" ? "border-orange-500/30" :
                    "border-red-500/30"
                  }`}
                >
                  <Badge className={`mb-6 ${
                    phase.color === "amber" ? "bg-amber-500/10 text-amber-400 border-amber-500/30" :
                    phase.color === "orange" ? "bg-orange-500/10 text-orange-400 border-orange-500/30" :
                    "bg-red-500/10 text-red-400 border-red-500/30"
                  }`}>
                    Phase {phase.phase}
                  </Badge>

                  <div className={`inline-flex p-3 rounded-2xl mb-4 ${
                    phase.color === "amber" ? "bg-amber-500/10" :
                    phase.color === "orange" ? "bg-orange-500/10" :
                    "bg-red-500/10"
                  }`}>
                    <phase.icon className={`h-6 w-6 ${
                      phase.color === "amber" ? "text-amber-400" :
                      phase.color === "orange" ? "text-orange-400" :
                      "text-red-400"
                    }`} />
                  </div>

                  <h3 className="text-2xl font-bold text-white mb-3">{phase.name}</h3>
                  <p className="text-white/50 mb-6">{phase.desc}</p>

                  <div className={`flex items-center gap-2 text-sm p-3 rounded-xl ${
                    phase.color === "amber" ? "bg-amber-500/5" :
                    phase.color === "orange" ? "bg-orange-500/5" :
                    "bg-red-500/5"
                  }`}>
                    <Clock className="h-4 w-4 text-white/40" />
                    <span className="text-white/60">Recuperation : <strong className="text-white">{phase.recovery}</strong></span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* === FEATURES === */}
        <section className="relative py-32 overflow-hidden">
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-purple-500/10 rounded-full blur-[200px]" />

          <div className="relative mx-auto max-w-7xl px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-20"
            >
              <h2 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight" style={{ letterSpacing: "-0.03em" }}>
                Ce qui est <span className="text-purple-400">inclus</span>
              </h2>
            </motion.div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {features.map((feature, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="p-6 rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-xl hover:border-purple-500/30 transition-all duration-500"
                >
                  <div className="inline-flex p-3 rounded-xl bg-purple-500/10 mb-4">
                    <feature.icon className="h-5 w-5 text-purple-400" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">{feature.title}</h3>
                  <p className="text-sm text-white/50">{feature.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* === PROTOCOL === */}
        <section className="relative py-32 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/[0.02] to-transparent" />

          <div className="relative mx-auto max-w-7xl px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="text-4xl sm:text-5xl font-black tracking-tight" style={{ letterSpacing: "-0.03em" }}>
                Protocole <span className="text-purple-400">4 semaines</span>
              </h2>
              <p className="mt-6 text-xl text-white/50">
                Adapte a ta phase de burnout
              </p>
            </motion.div>

            <div className="grid md:grid-cols-4 gap-4">
              {protocolWeeks.map((week, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="p-6 rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-xl text-center"
                >
                  <div className="flex items-center justify-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 font-bold">
                      {week.week}
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                      <week.icon className="h-5 w-5 text-purple-400" />
                    </div>
                  </div>
                  <h3 className="font-bold text-white mb-2">{week.title}</h3>
                  <p className="text-sm text-white/50">{week.focus}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* === PRICING === */}
        <section className="relative py-32 overflow-hidden">
          <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-purple-500/10 rounded-full blur-[200px]" />

          <div className="relative mx-auto max-w-4xl px-4">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="p-8 rounded-3xl border border-purple-500/30 bg-purple-500/5"
            >
              <div className="text-center mb-8">
                <span className="text-6xl font-black text-purple-400">39€</span>
                <span className="text-white/40 ml-2">one-time</span>
              </div>

              <div className="grid sm:grid-cols-2 gap-4 mb-8">
                {[
                  "Questionnaire 50 questions",
                  "Score burnout 0-100",
                  "Detection de phase",
                  "Profil hormonal estime",
                  "Protocole 4 semaines",
                  "Dashboard temps reel",
                  "Rapport PDF 18 pages",
                  "Recommandations supplements",
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Check className="h-5 w-5 text-purple-400 shrink-0" />
                    <span className="text-white/70">{item}</span>
                  </div>
                ))}
              </div>

              <Link href="/burnout-detection">
                <Button className="w-full h-14 text-lg font-semibold rounded-2xl bg-purple-500 hover:bg-purple-400 text-white shadow-[0_0_40px_rgba(168,85,247,0.3)]">
                  Evaluer mon risque
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
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
                Questions <span className="text-purple-400">frequentes</span>
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
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[500px] bg-purple-500/20 rounded-full blur-[200px]" />
          </div>

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative mx-auto max-w-4xl px-4 text-center"
          >
            <Battery className="h-20 w-20 text-purple-400 mx-auto mb-8" />

            <h2
              className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-tight mb-8"
              style={{ letterSpacing: "-0.04em" }}
            >
              Ne laisse pas
              <br />
              <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-red-400 bg-clip-text text-transparent">
                le burnout gagner
              </span>
            </h2>

            <p className="text-xl text-white/50 mb-12 max-w-xl mx-auto">
              8-10 minutes peuvent t'eviter des mois de recuperation.
            </p>

            <Link href="/burnout-detection">
              <Button
                size="lg"
                className="h-16 px-12 text-lg font-semibold rounded-2xl bg-purple-500 hover:bg-purple-400 text-white hover:scale-105 transition-all duration-300 shadow-[0_0_80px_rgba(168,85,247,0.5)]"
              >
                <Brain className="mr-3 h-5 w-5" />
                Evaluer mon risque maintenant
                <ArrowRight className="ml-3 h-5 w-5" />
              </Button>
            </Link>

            {/* Trust badges */}
            <div className="mt-12 flex flex-wrap items-center justify-center gap-8 text-sm text-white/30">
              <span className="flex items-center gap-2">
                <Lock className="h-4 w-4" /> 100% confidentiel
              </span>
              <span className="flex items-center gap-2">
                <Zap className="h-4 w-4" /> Resultats immediats
              </span>
              <span className="flex items-center gap-2">
                <Shield className="h-4 w-4" /> Base sur la science
              </span>
            </div>
          </motion.div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
