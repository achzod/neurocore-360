/**
 * NEUROCORE 360 - Discovery Scan Offer Page
 * Ultrahuman-inspired premium design - FREE
 */

import { useState, useRef } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import {
  Compass,
  ArrowRight,
  Check,
  FileText,
  ChevronDown,
  Shield,
  Clock,
  Gift,
  Brain,
  BarChart3,
  Zap,
  Activity,
  Sparkles,
  Target,
  Eye,
  TrendingUp,
} from "lucide-react";

// Discovery Scan features
const discoveryFeatures = [
  {
    icon: Eye,
    title: "Detection des blocages",
    desc: "Identification precise de ce qui freine ta progression",
    gradient: "from-violet-500 to-purple-600"
  },
  {
    icon: Brain,
    title: "Patterns problematiques",
    desc: "Habitudes inconscientes qui sabotent tes resultats",
    gradient: "from-blue-500 to-cyan-500"
  },
  {
    icon: Activity,
    title: "Desequilibres identifies",
    desc: "Energie, sommeil, metabolisme - tout est analyse",
    gradient: "from-emerald-500 to-teal-500"
  },
  {
    icon: BarChart3,
    title: "Score global /100",
    desc: "Ton niveau actuel mesure scientifiquement",
    gradient: "from-amber-500 to-orange-500"
  },
  {
    icon: FileText,
    title: "Rapport 5-7 pages",
    desc: "Diagnostic complet sans les solutions",
    gradient: "from-rose-500 to-pink-500"
  },
  {
    icon: Target,
    title: "Zones prioritaires",
    desc: "Les leviers les plus impactants pour toi",
    gradient: "from-indigo-500 to-violet-500"
  },
];

// How it works steps
const processSteps = [
  {
    number: "01",
    title: "Questionnaire",
    desc: "50 questions sur ton mode de vie. 10 minutes chrono.",
    icon: FileText,
  },
  {
    number: "02",
    title: "Analyse IA",
    desc: "Nos algorithmes detectent tes patterns caches.",
    icon: Brain,
  },
  {
    number: "03",
    title: "Rapport",
    desc: "Diagnostic complet livre instantanement.",
    icon: BarChart3,
  },
];

// FAQ items
const faqItems = [
  {
    question: "Pourquoi c'est gratuit ?",
    answer: "Le Discovery Scan est notre porte d'entree. Il te permet de decouvrir la qualite de nos analyses sans engagement. Pour les solutions et protocoles, upgrade vers l'Anabolic Bioscan (59€).",
  },
  {
    question: "C'est quoi la difference avec l'Anabolic Bioscan ?",
    answer: "Le Discovery Scan identifie tes problemes. L'Anabolic Bioscan (59€) te donne les solutions : protocoles, supplements, plan 30-60-90 jours.",
  },
  {
    question: "Combien de temps pour le rapport ?",
    answer: "Instantane. Des que tu termines le questionnaire, ton rapport est genere et accessible.",
  },
  {
    question: "Mes donnees sont securisees ?",
    answer: "100% conformes RGPD. Chiffrees, jamais partagees. Tu peux demander la suppression a tout moment.",
  },
  {
    question: "Puis-je upgrader plus tard ?",
    answer: "Oui ! Depuis ton dashboard, tu peux passer a l'Anabolic Bioscan (59€) ou l'Ultimate Scan (79€) quand tu veux.",
  },
];

// Comparison tiers
const tiers = [
  {
    name: "Discovery Scan",
    price: "0€",
    label: "GRATUIT",
    color: "primary",
    features: ["Detection des blocages", "Patterns problematiques", "Score global /100", "Rapport 5-7 pages"],
    cta: "Commencer gratuit",
    href: "/audit-complet/questionnaire?plan=free",
    popular: false,
  },
  {
    name: "Anabolic Bioscan",
    price: "59€",
    label: "DIAGNOSTIC + PROTOCOLES",
    color: "emerald",
    features: ["Tout Discovery Scan +", "16 sections d'analyse", "Protocoles personnalises", "Stack supplements", "Plan 30-60-90 jours"],
    cta: "Obtenir Anabolic",
    href: "/offers/anabolic-bioscan",
    popular: false,
  },
  {
    name: "Ultimate Scan",
    price: "79€",
    label: "LE PLUS COMPLET",
    color: "cyan",
    features: ["Tout Anabolic Bioscan +", "Analyse photo", "Analyse posturale", "18 sections", "Rapport 40-50 pages"],
    cta: "Obtenir Ultimate",
    href: "/offers/ultimate-scan",
    popular: true,
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
        <span className="text-lg font-medium text-white group-hover:text-primary transition-colors">
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

export default function AuditGratuit() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });

  const heroOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.5], [1, 0.95]);
  const heroY = useTransform(scrollYProgress, [0, 0.5], [0, 100]);

  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden">
      <Header />

      <main>
        {/* === HERO SECTION === */}
        <section
          ref={heroRef}
          className="relative min-h-screen flex items-center justify-center overflow-hidden"
        >
          {/* Animated background orbs */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-primary/20 rounded-full blur-[150px] animate-pulse" />
            <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-violet-500/15 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: "1s" }} />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-cyan-500/10 rounded-full blur-[180px]" />
          </div>

          {/* Grid overlay */}
          <div
            className="absolute inset-0 opacity-[0.02]"
            style={{
              backgroundImage: "linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)",
              backgroundSize: "100px 100px",
            }}
          />

          <motion.div
            style={{ opacity: heroOpacity, scale: heroScale, y: heroY }}
            className="relative z-10 mx-auto max-w-7xl px-4 text-center"
          >
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Badge className="mb-8 px-6 py-2 bg-primary/10 text-primary border border-primary/30 text-sm font-medium backdrop-blur-xl">
                <Gift className="mr-2 h-4 w-4" />
                100% GRATUIT
              </Badge>
            </motion.div>

            {/* Main headline */}
            <motion.h1
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.8 }}
              className="text-5xl sm:text-7xl md:text-8xl lg:text-9xl font-black tracking-tight leading-[0.9]"
              style={{ letterSpacing: "-0.04em" }}
            >
              <span className="text-white">Discovery</span>
              <br />
              <span className="bg-gradient-to-r from-primary via-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                Scan.
              </span>
            </motion.h1>

            {/* Subheadline */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="mt-8 text-xl sm:text-2xl text-white/60 max-w-2xl mx-auto font-light"
            >
              On detecte tes blocages. Tu decouvres ce qui te freine.
              <br className="hidden sm:block" />
              <span className="text-white/40">Diagnostic complet. Zero engagement.</span>
            </motion.p>

            {/* CTA */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <Link href="/audit-complet/questionnaire?plan=free">
                <Button
                  size="lg"
                  className="h-16 px-12 text-lg font-semibold rounded-2xl bg-white text-black hover:bg-white/90 hover:scale-105 transition-all duration-300 shadow-[0_0_60px_rgba(255,255,255,0.3)]"
                >
                  <Compass className="mr-3 h-5 w-5" />
                  Commencer gratuitement
                  <ArrowRight className="ml-3 h-5 w-5" />
                </Button>
              </Link>
            </motion.div>

            {/* Trust indicators */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.9 }}
              className="mt-12 flex items-center justify-center gap-8 text-sm text-white/40"
            >
              <span className="flex items-center gap-2">
                <Clock className="h-4 w-4" /> 10 minutes
              </span>
              <span className="flex items-center gap-2">
                <Shield className="h-4 w-4" /> Sans carte bancaire
              </span>
              <span className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" /> Rapport instantane
              </span>
            </motion.div>
          </motion.div>

          {/* Scroll indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
            className="absolute bottom-12 left-1/2 -translate-x-1/2"
          >
            <motion.div
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-6 h-10 rounded-full border-2 border-white/20 flex items-start justify-center p-2"
            >
              <motion.div className="w-1.5 h-1.5 bg-white/40 rounded-full" />
            </motion.div>
          </motion.div>
        </section>

        {/* === STATS BAR === */}
        <section className="relative py-8 border-y border-white/10 bg-white/[0.02] backdrop-blur-xl">
          <div className="mx-auto max-w-7xl px-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {[
                { value: "50", label: "Questions" },
                { value: "5", label: "Domaines" },
                { value: "10", label: "Minutes" },
                { value: "0€", label: "A payer" },
              ].map((stat, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="text-center"
                >
                  <div className="text-4xl sm:text-5xl font-black text-white tracking-tight">
                    {stat.value}
                  </div>
                  <div className="text-sm text-white/40 mt-1 uppercase tracking-wider">
                    {stat.label}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* === FEATURES BENTO GRID === */}
        <section className="relative py-32 overflow-hidden">
          {/* Background glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[600px] bg-primary/5 rounded-full blur-[200px]" />

          <div className="relative mx-auto max-w-7xl px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-20"
            >
              <h2 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight" style={{ letterSpacing: "-0.03em" }}>
                Ce que tu <span className="text-primary">decouvres</span>
              </h2>
              <p className="mt-6 text-xl text-white/50 max-w-xl mx-auto">
                Un diagnostic complet de ton profil en 6 dimensions essentielles
              </p>
            </motion.div>

            {/* Bento Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {discoveryFeatures.map((feature, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className={`group relative p-8 rounded-3xl border border-white/10 bg-white/[0.02] backdrop-blur-xl hover:border-white/20 hover:bg-white/[0.04] transition-all duration-500 ${i === 0 || i === 5 ? "md:col-span-2 lg:col-span-1" : ""}`}
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

        {/* === PROCESS / HOW IT WORKS === */}
        <section className="relative py-32 bg-gradient-to-b from-transparent via-white/[0.02] to-transparent">
          <div className="mx-auto max-w-7xl px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-20"
            >
              <h2 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight" style={{ letterSpacing: "-0.03em" }}>
                Comment ca <span className="text-primary">marche</span>
              </h2>
              <p className="mt-6 text-xl text-white/50">
                Du questionnaire au rapport en moins de 15 minutes
              </p>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-8 relative">
              {/* Connecting line */}
              <div className="hidden md:block absolute top-24 left-[20%] right-[20%] h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

              {processSteps.map((step, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.2 }}
                  className="relative text-center"
                >
                  {/* Step number */}
                  <div className="relative inline-flex mb-8">
                    <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-white/10 to-white/5 border border-white/10 flex items-center justify-center backdrop-blur-xl">
                      <span className="text-3xl font-black text-primary">{step.number}</span>
                    </div>
                    <div className="absolute -inset-4 bg-primary/10 rounded-full blur-2xl -z-10" />
                  </div>

                  <h3 className="text-2xl font-bold text-white mb-3">
                    {step.title}
                  </h3>
                  <p className="text-white/50 max-w-xs mx-auto">
                    {step.desc}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* === COMPARISON / PRICING === */}
        <section className="relative py-32 overflow-hidden">
          {/* Background */}
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-[200px]" />
          <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[200px]" />

          <div className="relative mx-auto max-w-7xl px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight" style={{ letterSpacing: "-0.03em" }}>
                Compare les <span className="text-primary">offres</span>
              </h2>
              <p className="mt-6 text-xl text-white/50">
                Choisis le niveau d'analyse adapte a tes objectifs
              </p>
            </motion.div>

            <div className="grid lg:grid-cols-3 gap-6">
              {tiers.map((tier, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className={`relative p-8 rounded-3xl border backdrop-blur-xl transition-all duration-500 hover:scale-[1.02] ${
                    tier.popular
                      ? "border-cyan-500/50 bg-cyan-500/5 shadow-[0_0_60px_rgba(6,182,212,0.15)]"
                      : "border-white/10 bg-white/[0.02] hover:border-white/20"
                  }`}
                >
                  {/* Popular badge */}
                  {tier.popular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                      <Badge className="bg-cyan-500 text-white font-semibold px-4 py-1">
                        POPULAIRE
                      </Badge>
                    </div>
                  )}

                  {/* Header */}
                  <div className="mb-8">
                    <p className="text-xs font-semibold uppercase tracking-widest text-white/40 mb-2">
                      {tier.label}
                    </p>
                    <h3 className="text-2xl font-bold text-white mb-1">
                      {tier.name}
                    </h3>
                    <div className="flex items-baseline gap-1">
                      <span className={`text-5xl font-black ${tier.popular ? "text-cyan-400" : tier.color === "emerald" ? "text-emerald-400" : "text-primary"}`}>
                        {tier.price}
                      </span>
                      {tier.price !== "0€" && (
                        <span className="text-white/40 text-sm">one-time</span>
                      )}
                    </div>
                  </div>

                  {/* Features */}
                  <div className="space-y-4 mb-8">
                    {tier.features.map((feature, j) => (
                      <div key={j} className="flex items-center gap-3">
                        <Check className={`h-5 w-5 shrink-0 ${tier.popular ? "text-cyan-400" : tier.color === "emerald" ? "text-emerald-400" : "text-primary"}`} />
                        <span className="text-white/70">{feature}</span>
                      </div>
                    ))}
                  </div>

                  {/* CTA */}
                  <Link href={tier.href}>
                    <Button
                      className={`w-full h-14 text-lg font-semibold rounded-2xl transition-all duration-300 ${
                        tier.popular
                          ? "bg-cyan-500 hover:bg-cyan-400 text-white shadow-[0_0_40px_rgba(6,182,212,0.3)] hover:shadow-[0_0_60px_rgba(6,182,212,0.4)]"
                          : tier.price === "0€"
                            ? "bg-white text-black hover:bg-white/90"
                            : "bg-emerald-500 hover:bg-emerald-400 text-white"
                      }`}
                    >
                      {tier.cta}
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </Link>
                </motion.div>
              ))}
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
                Questions <span className="text-primary">frequentes</span>
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
          {/* Massive background glow */}
          <div className="absolute inset-0">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1200px] h-[600px] bg-primary/20 rounded-full blur-[200px]" />
          </div>

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative mx-auto max-w-4xl px-4 text-center"
          >
            <Compass className="h-20 w-20 text-primary mx-auto mb-8" />

            <h2
              className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-tight mb-8"
              style={{ letterSpacing: "-0.04em" }}
            >
              Pret a decouvrir
              <br />
              <span className="bg-gradient-to-r from-primary via-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                ton profil ?
              </span>
            </h2>

            <p className="text-xl text-white/50 mb-12 max-w-xl mx-auto">
              10 minutes. Gratuit. Sans engagement.
              <br />
              Commence maintenant.
            </p>

            <Link href="/audit-complet/questionnaire?plan=free">
              <Button
                size="lg"
                className="h-16 px-12 text-lg font-semibold rounded-2xl bg-white text-black hover:bg-white/90 hover:scale-105 transition-all duration-300 shadow-[0_0_80px_rgba(255,255,255,0.4)]"
              >
                <Compass className="mr-3 h-5 w-5" />
                Lancer mon Discovery Scan
                <ArrowRight className="ml-3 h-5 w-5" />
              </Button>
            </Link>

            {/* Trust badges */}
            <div className="mt-12 flex flex-wrap items-center justify-center gap-8 text-sm text-white/30">
              <span className="flex items-center gap-2">
                <Gift className="h-4 w-4" /> 100% gratuit
              </span>
              <span className="flex items-center gap-2">
                <Clock className="h-4 w-4" /> 10 minutes
              </span>
              <span className="flex items-center gap-2">
                <Shield className="h-4 w-4" /> Sans carte bancaire
              </span>
            </div>
          </motion.div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
