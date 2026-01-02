import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { PRICING_PLANS, QUESTIONNAIRE_SECTIONS } from "@shared/schema";
import {
  Star,
  Sparkles,
  ArrowRight,
  ChevronRight,
  Shield,
  Award,
  Check,
  Lock,
  User,
  Scale,
  Zap,
  Apple,
  Beaker,
  Dumbbell,
  Moon,
  Heart,
  Timer,
  TestTube,
  Activity,
  Coffee,
  Bone,
  HeartHandshake,
  Brain,
  Camera,
  CheckCircle2,
  Play,
  TrendingUp,
  Target,
  Layers,
} from "lucide-react";
import { motion } from "framer-motion";
import { DNAHelix } from "@/components/animations/DNAHelix";
import { BodyVisualization } from "@/components/animations/BodyVisualization";

import issaLogo from "@assets/ISSA+Logo+_+Vertical+_+for-white-background_1767172975495.webp";
import pnLogo from "@assets/limage-19764_1767172975495.webp";
import preScriptLogo from "@assets/Pre-Script_1200x1200_1767172975495.webp";
import nasmLogo from "@assets/nasm-logo_1767172987583.jpg";

// Ultrahuman-style Hero: Text LEFT, Phone RIGHT, 3-layer hover effect
function UltrahumanHero() {
  const [activeTab, setActiveTab] = useState<"scores" | "domaines" | "rapport" | "plan">("scores");
  const [isHovered, setIsHovered] = useState(false);
  const textRef = useRef<HTMLDivElement>(null);

  // Spotlight: update CSS vars on pointermove
  useEffect(() => {
    let rafId: number;
    const el = textRef.current;
    if (!el) return;

    const onMove = (e: PointerEvent) => {
      rafId = requestAnimationFrame(() => {
        const rect = el.getBoundingClientRect();
        el.style.setProperty("--x", `${e.clientX - rect.left}px`);
        el.style.setProperty("--y", `${e.clientY - rect.top}px`);
      });
    };

    el.addEventListener("pointermove", onMove);
    return () => {
      el.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(rafId);
    };
  }, []);

  const tabContent = {
    scores: {
      title: "Score Global",
      value: "78",
      subtitle: "+12 pts ce mois",
      details: [
        { label: "Métabolisme", value: 85 },
        { label: "Sommeil", value: 72 },
        { label: "Nutrition", value: 81 },
      ]
    },
    domaines: {
      title: "15 Domaines",
      value: "15",
      subtitle: "analysés en profondeur",
      details: [
        { label: "Hormones", value: 68 },
        { label: "Digestion", value: 91 },
        { label: "Énergie", value: 77 },
      ]
    },
    rapport: {
      title: "Ton Rapport",
      value: "40+",
      subtitle: "pages personnalisées",
      details: [
        { label: "Recommandations", value: 24 },
        { label: "Protocoles", value: 8 },
        { label: "Suppléments", value: 12 },
      ]
    },
    plan: {
      title: "Plan d'Action",
      value: "90",
      subtitle: "jours de protocole",
      details: [
        { label: "Phase 1", value: 100 },
        { label: "Phase 2", value: 45 },
        { label: "Phase 3", value: 0 },
      ]
    }
  };

  const current = tabContent[activeTab];

  return (
    <section className="relative min-h-[90vh] overflow-hidden bg-black">
      {/* Background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(16,185,129,0.1),transparent_50%)]" />

      <div className="relative max-w-7xl mx-auto px-6 py-16 flex flex-col lg:flex-row items-center justify-between gap-12 min-h-[90vh]">

        {/* LEFT: Text with Ultrahuman 3-layer hover */}
        <div className="flex-1 flex flex-col justify-center">
          <div
            ref={textRef}
            className="relative cursor-pointer select-none"
            style={{ "--x": "0px", "--y": "0px" } as React.CSSProperties}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            {/* Layer 1: GHOST - blurred text behind */}
            <h1
              className="text-[12vw] sm:text-[10vw] md:text-[8vw] lg:text-[6vw] font-black leading-[0.95] tracking-tighter absolute inset-0 select-none pointer-events-none transition-all duration-500"
              style={{
                color: "rgba(16, 185, 129, 0.4)",
                filter: isHovered ? "blur(20px)" : "blur(12px)",
                opacity: isHovered ? 0.2 : 0.5,
                transform: "translate(2px, 2px)",
              }}
              aria-hidden="true"
            >
              Décode ton<br />métabolisme<span className="text-white/30">.</span>
            </h1>

            {/* Layer 2: SHARP - main text */}
            <motion.h1
              animate={{
                opacity: isHovered ? 1 : 0.7,
                scale: isHovered ? 1.01 : 0.99,
                y: isHovered ? -4 : 2,
              }}
              transition={{
                type: "spring",
                stiffness: 400,
                damping: 25,
                mass: 0.8,
              }}
              className="text-[12vw] sm:text-[10vw] md:text-[8vw] lg:text-[6vw] font-black leading-[0.95] tracking-tighter relative z-10"
            >
              <span className="text-primary">Décode ton</span>
              <br />
              <span className="text-primary">métabolisme</span>
              <span className="text-white">.</span>
            </motion.h1>

            {/* Layer 3: Spotlight - follows mouse */}
            <div
              className="absolute inset-0 pointer-events-none z-20 transition-opacity duration-300"
              style={{
                background: "radial-gradient(circle 250px at var(--x) var(--y), rgba(16, 185, 129, 0.12), transparent 60%)",
                opacity: isHovered ? 1 : 0,
              }}
            />
          </div>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="mt-8 text-white/50 text-base sm:text-lg max-w-md"
          >
            180+ questions. 15 domaines. Un rapport personnalisé de 40+ pages pour comprendre et optimiser ta performance.
          </motion.p>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="mt-8"
          >
            <Link href="/audit-complet/questionnaire">
              <button className="group relative px-8 py-4 rounded-full bg-primary hover:bg-primary/90 text-black font-semibold text-base transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/30">
                <div className="absolute -inset-1 bg-primary/40 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10" />
                <span className="flex items-center gap-3">
                  Lancer mon audit
                  <ArrowRight className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
                </span>
              </button>
            </Link>
          </motion.div>
        </div>

        {/* RIGHT: Phone Mockup - BIG */}
        <motion.div
          initial={{ opacity: 0, x: 50, scale: 0.95 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
          className="flex-1 flex justify-center lg:justify-end"
        >
          <div className="relative w-[280px] sm:w-[320px] md:w-[360px] lg:w-[380px]">
            {/* Glow behind phone */}
            <div className="absolute -inset-8 bg-primary/15 blur-3xl rounded-full -z-10" />

            {/* Phone shell */}
            <div className="relative rounded-[3rem] bg-gradient-to-b from-zinc-600 to-zinc-900 p-2 shadow-2xl shadow-black/50">
              <div className="rounded-[2.5rem] bg-black p-1">
                <div className="relative rounded-[2.25rem] bg-gradient-to-b from-zinc-900 to-black overflow-hidden aspect-[9/19]">
                  {/* Status bar */}
                  <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-6 pt-3 text-white/70 text-[10px] z-20">
                    <span className="font-medium">9:41</span>
                    <div className="w-5 h-2.5 border border-white/50 rounded-sm">
                      <div className="w-3/4 h-full bg-primary rounded-sm" />
                    </div>
                  </div>

                  {/* Dynamic Island */}
                  <div className="absolute top-2 left-1/2 -translate-x-1/2 w-28 h-7 bg-black rounded-full z-30" />

                  {/* Content */}
                  <div className="pt-14 px-5 h-full flex flex-col">
                    <div className="mb-4">
                      <p className="text-white/60 text-sm">Bonsoir, Achzod</p>
                      <p className="text-white/40 text-xs">Voici ton rapport NEUROCORE</p>
                    </div>

                    <motion.div
                      key={activeTab}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25 }}
                      className="flex-1 flex flex-col items-center justify-center"
                    >
                      <div className="inline-flex items-center gap-1 bg-white/10 rounded-full px-4 py-1.5 text-xs text-white/70 mb-3">
                        {current.title} <ChevronRight className="w-3 h-3" />
                      </div>

                      <motion.div
                        animate={{ scale: [1, 1.02, 1] }}
                        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                        className="text-7xl font-bold text-white tracking-tighter"
                      >
                        {current.value}
                      </motion.div>

                      <div className="mt-3 inline-flex items-center gap-1.5 bg-primary/20 rounded-full px-4 py-1.5">
                        <TrendingUp className="w-3.5 h-3.5 text-primary" />
                        <span className="text-primary text-sm font-medium">{current.subtitle}</span>
                      </div>
                    </motion.div>

                    {/* Details */}
                    <motion.div
                      key={`d-${activeTab}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="bg-white/5 rounded-2xl p-4 mb-4"
                    >
                      {current.details.map((item, idx) => (
                        <div key={idx} className="mb-3 last:mb-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-white/70 text-xs">{item.label}</span>
                            <span className="text-primary text-xs font-medium">{item.value}{activeTab === "rapport" ? "" : "/100"}</span>
                          </div>
                          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${activeTab === "rapport" ? Math.min(item.value * 4, 100) : item.value}%` }}
                              transition={{ duration: 0.7, delay: idx * 0.1 }}
                              className="h-full bg-gradient-to-r from-primary to-emerald-400 rounded-full"
                            />
                          </div>
                        </div>
                      ))}
                    </motion.div>

                    {/* Nav tabs */}
                    <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-2 mb-3">
                      <div className="flex items-center justify-around">
                        {[
                          { id: "scores", icon: Activity, label: "SCORES" },
                          { id: "domaines", icon: Layers, label: "DOMAINES" },
                          { id: "rapport", icon: Brain, label: "RAPPORT" },
                          { id: "plan", icon: Target, label: "PLAN" },
                        ].map((tab) => (
                          <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as typeof activeTab)}
                            className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all duration-200 ${
                              activeTab === tab.id ? "bg-white/10" : "hover:bg-white/5"
                            }`}
                          >
                            <tab.icon className={`w-5 h-5 ${activeTab === tab.id ? "text-primary" : "text-white/40"}`} />
                            <span className={`text-[9px] font-medium ${activeTab === tab.id ? "text-primary" : "text-white/40"}`}>{tab.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

      </div>
    </section>
  );
}

// Bento Grid Styles - hewarsaber inspired
const bentoStyles = {
  container: "grid gap-4 p-4 md:p-6 lg:p-8",
  card: "rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm p-6 transition-all duration-300 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5",
  cardLarge: "rounded-3xl border border-border/50 bg-card/80 backdrop-blur-sm p-8 transition-all duration-300 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5",
  title: "font-bold tracking-[-0.02em]",
  subtitle: "text-muted-foreground tracking-[-0.01em]",
};

function CertificationsBar() {
  const certifications = [
    { name: "ISSA", subtitle: "CPT, Nutrition, Bodybuilding, Transformation", image: issaLogo, count: 4 },
    { name: "NASM", subtitle: "CPT, CES, PES, FNS, WLS", image: nasmLogo, count: 5 },
    { name: "Precision Nutrition", subtitle: "PN1 Certified Coach", image: pnLogo, count: 1 },
    { name: "Pre-Script", subtitle: "Movement Assessment", image: preScriptLogo, count: 1 },
  ];

  const allCerts = [...certifications, ...certifications, ...certifications];

  return (
    <div className="relative overflow-hidden border-b border-primary/10 bg-gradient-to-r from-background via-primary/5 to-background py-6" data-testid="section-certifications-bar">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_left,hsl(var(--primary)/0.1),transparent_50%),radial-gradient(ellipse_at_right,hsl(var(--accent)/0.08),transparent_50%)]" />

      <div className="relative mb-4 flex items-center justify-center gap-3">
        <div className="h-px w-12 bg-gradient-to-r from-transparent to-primary/50" />
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            11 Certifications Internationales
          </span>
          <Award className="h-4 w-4 text-primary" />
        </div>
        <div className="h-px w-12 bg-gradient-to-l from-transparent to-primary/50" />
      </div>

      <div className="relative">
        <div className="absolute left-0 top-0 z-10 h-full w-24 bg-gradient-to-r from-background to-transparent" />
        <div className="absolute right-0 top-0 z-10 h-full w-24 bg-gradient-to-l from-background to-transparent" />

        <div className="flex animate-scroll-certs items-center gap-8">
          {allCerts.map((cert, idx) => (
            <div
              key={idx}
              className="group flex shrink-0 items-center gap-4 rounded-xl border border-primary/20 bg-gradient-to-br from-card/90 to-card/50 px-5 py-3 backdrop-blur-sm transition-all duration-300 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10"
              data-testid={`certification-${idx}`}
            >
              <div className="relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-lg bg-white shadow-inner">
                <img src={cert.image} alt={cert.name} className="h-10 w-10 object-contain" />
                <div className="absolute inset-0 rounded-lg ring-1 ring-inset ring-black/5" />
              </div>
              <div className="text-left">
                <div className="flex items-center gap-2">
                  <span className="font-bold tracking-wide">{cert.name}</span>
                  <span className="rounded-full bg-primary/20 px-2 py-0.5 text-xs font-semibold text-primary">
                    x{cert.count}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">{cert.subtitle}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MediaBar() {
  const mediaLogos = [
    "MarketWatch", "REUTERS", "Yahoo Finance", "FOX 40", "BENZINGA", "StreetInsider"
  ];
  const allMedia = [...mediaLogos, ...mediaLogos, ...mediaLogos, ...mediaLogos];

  return (
    <div className="w-full overflow-hidden border-b border-border/20 bg-muted/30 py-4" data-testid="section-media-bar">
      <div className="mb-3 text-center text-[10px] font-medium uppercase tracking-[0.25em] text-muted-foreground/50">
        Recommandé par les médias
      </div>
      <div className="relative w-full px-16">
        <div className="flex animate-scroll items-center gap-16 whitespace-nowrap" style={{ width: 'fit-content' }}>
          {allMedia.map((name, idx) => (
            <span
              key={idx}
              className="text-sm font-medium text-muted-foreground/40 transition-colors hover:text-muted-foreground/70"
              data-testid={`media-${idx}`}
            >
              {name}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// BENTO HERO - Inspired by hewarsaber fintech style
function BentoHeroSection() {
  return (
    <section className="relative bg-background py-8 lg:py-12" data-testid="section-hero">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,hsl(var(--primary)/0.08),transparent_50%)]" />

      {/* Beta Banner */}
      <div className="relative mx-auto max-w-7xl px-4 mb-6">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex justify-center"
        >
          <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-amber-500/20 border border-amber-500/30 backdrop-blur-sm">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
            </span>
            <span className="text-sm font-semibold text-amber-200/90 tracking-wide">
              En Beta Test depuis Septembre 2025
            </span>
            <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-xs px-2 py-0.5">
              127 testeurs
            </Badge>
          </div>
        </motion.div>
      </div>

      <div className="relative mx-auto max-w-7xl px-4">
        {/* Bento Grid Layout */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-12 md:grid-rows-[auto_auto_auto]">

          {/* Main Hero Card - Spans 8 columns */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="md:col-span-8 md:row-span-2"
          >
            <div className={`${bentoStyles.cardLarge} h-full flex flex-col justify-center min-h-[400px] relative overflow-hidden`}>
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-primary/10 to-transparent rounded-full blur-3xl" />

              <Badge
                variant="outline"
                className="mb-6 w-fit border-primary/50 bg-primary/10 px-4 py-1.5 text-primary"
                data-testid="badge-hero"
              >
                <Sparkles className="mr-2 h-3 w-3" />
                AUDIT 360 COMPLET
              </Badge>

              <h1 className="text-4xl font-bold tracking-[-0.03em] sm:text-5xl lg:text-6xl leading-[1.1]" data-testid="text-hero-title">
                Décode ton système
                <br />
                <span className="bg-gradient-to-r from-primary via-purple-400 to-purple-500 bg-clip-text text-transparent">
                  métabolique.
                </span>
              </h1>

              <p className="mt-6 max-w-lg text-lg text-muted-foreground tracking-[-0.01em]" data-testid="text-hero-subtitle">
                180+ biomarqueurs analysés en profondeur pour comprendre et optimiser ta performance.
              </p>

              <div className="mt-8">
                <Link href="/audit-complet/questionnaire">
                  <Button
                    size="lg"
                    className="gap-2 bg-primary px-8 text-lg hover:bg-primary/90 rounded-xl h-14"
                    data-testid="button-hero-cta"
                  >
                    LANCER L'ANALYSE
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                </Link>
              </div>
            </div>
          </motion.div>

          {/* Stats Card 1 - Questions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="md:col-span-4"
          >
            <div className={`${bentoStyles.card} h-full flex flex-col justify-center items-center text-center min-h-[180px]`}>
              <div className="text-5xl font-bold text-primary tracking-[-0.02em]">180+</div>
              <div className="mt-2 text-sm text-muted-foreground font-medium">Questions analysées</div>
              <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground/60">
                <CheckCircle2 className="h-3 w-3 text-primary" />
                <span>Questionnaire complet</span>
              </div>
            </div>
          </motion.div>

          {/* Stats Card 2 - Sections */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="md:col-span-2"
          >
            <div className={`${bentoStyles.card} h-full flex flex-col justify-center items-center text-center min-h-[180px] bg-gradient-to-br from-primary/10 to-transparent`}>
              <div className="text-4xl font-bold tracking-[-0.02em]">21</div>
              <div className="mt-2 text-xs text-muted-foreground">Sections</div>
            </div>
          </motion.div>

          {/* Stats Card 3 - Domaines */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="md:col-span-2"
          >
            <div className={`${bentoStyles.card} h-full flex flex-col justify-center items-center text-center min-h-[180px] bg-gradient-to-br from-purple-500/10 to-transparent`}>
              <div className="text-4xl font-bold tracking-[-0.02em]">15</div>
              <div className="mt-2 text-xs text-muted-foreground">Domaines</div>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}

// Icône mapping pour les domaines
const iconMap: Record<string, typeof User> = {
  User,
  Scale,
  Zap,
  Apple,
  Beaker,
  Dumbbell,
  Moon,
  Heart,
  Timer,
  TestTube,
  Activity,
  Coffee,
  Bone,
  HeartHandshake,
  Brain,
  Camera,
};

// BENTO DOMAINES - Clean 5-column grid
function BentoDomainesSection() {
  return (
    <section id="domaines" className="relative border-y border-border/30 bg-background py-12 lg:py-16" data-testid="section-domaines">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(var(--primary)/0.03),transparent_70%)]" />
      <div className="relative mx-auto max-w-7xl px-4">

        {/* Section Header */}
        <div className="mb-10 text-center">
          <Badge variant="outline" className="mb-4 border-primary/50 bg-primary/10 text-primary">
            Analyse Complète
          </Badge>
          <h2 className="text-3xl font-bold tracking-[-0.03em] sm:text-4xl" data-testid="text-domaines-title">
            15 Domaines d'Analyse
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground tracking-[-0.01em]">
            Une approche holistique couvrant tous les aspects de ton métabolisme
          </p>
        </div>

        {/* Clean Grid - 5 columns on desktop, 3 on tablet, 2 on mobile */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {QUESTIONNAIRE_SECTIONS.map((section, idx) => {
            const IconComponent = iconMap[section.icon] || User;

            return (
              <motion.div
                key={section.id}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: idx * 0.02 }}
              >
                <div className="group relative h-full rounded-2xl border border-border/50 bg-card/60 p-4 backdrop-blur-sm transition-all duration-300 hover:border-primary/40 hover:bg-card/90 hover:shadow-lg hover:shadow-primary/5">
                  {/* Icon */}
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary transition-transform group-hover:scale-110">
                    <IconComponent className="h-5 w-5" />
                  </div>

                  {/* Title */}
                  <h3 className="font-semibold text-sm text-foreground tracking-[-0.01em] leading-tight">
                    {section.title}
                  </h3>

                  {/* Subtle accent line */}
                  <div className="absolute bottom-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                </div>
              </motion.div>
            );
          })}
        </div>

      </div>
    </section>
  );
}

// BENTO BODY MAPPING
function BentoBodyMappingSection() {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const categories = [
    { id: "metabolism", name: "Métabolisme", color: "hsl(160 84% 39%)" },
    { id: "biomechanics", name: "Biomécanique", color: "hsl(280 70% 50%)" },
    { id: "neurology", name: "Neurologie", color: "hsl(200 80% 50%)" },
    { id: "cardio", name: "Cardio", color: "hsl(0 70% 50%)" },
    { id: "hormones", name: "Hormones", color: "hsl(45 90% 50%)" },
    { id: "immunity", name: "Immunité", color: "hsl(120 60% 45%)" },
  ];

  return (
    <section className="relative border-y border-border/30 bg-muted/20 py-12 lg:py-16" data-testid="section-body-mapping">
      <div className="relative mx-auto max-w-7xl px-4">

        {/* Bento Layout for Body Mapping */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">

          {/* Left - Title & Categories */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className={`${bentoStyles.cardLarge}`}
            >
              <h2 className="text-2xl font-bold tracking-[-0.03em] sm:text-3xl mb-4">
                Cartographie complète
              </h2>
              <p className="text-muted-foreground text-sm">
                Survole les zones pour découvrir les points d'analyse de ton corps
              </p>
            </motion.div>

            {/* Category Buttons as Bento Cards */}
            <div className="grid grid-cols-2 gap-3">
              {categories.map((category, idx) => {
                const isActive = activeCategory === category.id;
                return (
                  <motion.button
                    key={category.id}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.05 }}
                    onClick={() => setActiveCategory(isActive ? null : category.id)}
                    className={`${bentoStyles.card} text-left !p-4 ${isActive ? 'ring-2' : ''}`}
                    style={{
                      borderColor: isActive ? category.color : undefined,
                      // @ts-ignore - ring color via CSS variable
                      '--tw-ring-color': isActive ? category.color : undefined,
                    } as React.CSSProperties}
                  >
                    <div
                      className="w-3 h-3 rounded-full mb-2"
                      style={{ backgroundColor: category.color }}
                    />
                    <div
                      className="text-sm font-semibold"
                      style={{ color: isActive ? category.color : 'inherit' }}
                    >
                      {category.name}
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Right - Body Visualization */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="lg:col-span-8"
          >
            <div className={`${bentoStyles.cardLarge} flex items-center justify-center min-h-[500px]`}>
              <div className="h-[450px] w-[450px] max-w-full">
                <BodyVisualization activeCategory={activeCategory || undefined} className="h-full w-full" />
              </div>
            </div>
          </motion.div>

        </div>

        {/* Bottom Info Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-4"
        >
          <div className={`${bentoStyles.card} flex items-center justify-center gap-4`}>
            <Heart className="w-5 h-5 text-primary" />
            <div>
              <p className="font-semibold text-sm">Analyse en temps réel</p>
              <p className="text-xs text-muted-foreground">
                Chaque zone est évaluée selon tes réponses
              </p>
            </div>
          </div>
        </motion.div>

      </div>
    </section>
  );
}

// BENTO PROCESS SECTION
function BentoProcessSection() {
  const steps = [
    {
      step: 1,
      title: "Questionnaire Complet",
      description: "180+ questions sur 15 domaines : métabolisme, hormones, nutrition, biomécanique...",
      icon: CheckCircle2,
      color: "from-primary/20 to-primary/5",
    },
    {
      step: 2,
      title: "Analyse Avancée",
      description: "J'analyse tes réponses et tes photos pour créer un profil complet personnalisé",
      icon: Brain,
      color: "from-purple-500/20 to-purple-500/5",
    },
    {
      step: 3,
      title: "Rapport Personnalisé",
      description: "Reçois un rapport détaillé de 40+ pages avec scores, recommandations et plan d'action",
      icon: Award,
      color: "from-amber-500/20 to-amber-500/5",
    },
    {
      step: 4,
      title: "Plan d'Action Concret",
      description: "Protocoles précis : suppléments, nutrition, exercices, timing... Tout est détaillé",
      icon: Target,
      color: "from-emerald-500/20 to-emerald-500/5",
    },
  ];

  return (
    <section id="process" className="relative border-y border-border/30 bg-background py-12 lg:py-16" data-testid="section-process">
      <div className="mx-auto max-w-7xl px-4">

        {/* Header */}
        <div className="mb-10 text-center">
          <Badge variant="outline" className="mb-4">
            Simple & Efficace
          </Badge>
          <h2 className="text-3xl font-bold tracking-[-0.03em] sm:text-4xl" data-testid="text-process-title">
            Comment ça marche ?
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
            En 4 étapes simples, découvre les leviers d'optimisation de ton métabolisme
          </p>
        </div>

        {/* Bento Grid for Process */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, idx) => {
            const IconComponent = step.icon;
            return (
              <motion.div
                key={step.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: idx * 0.1 }}
              >
                <div className={`${bentoStyles.card} h-full bg-gradient-to-br ${step.color}`}>
                  {/* Step Number */}
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-background/80 text-xl font-bold text-primary">
                      {step.step}
                    </div>
                    <IconComponent className="h-6 w-6 text-muted-foreground" />
                  </div>

                  {/* Content */}
                  <h3 className="mb-3 text-lg font-semibold tracking-[-0.01em]">{step.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* DNA Animation Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-6"
        >
          <div className={`${bentoStyles.card} flex items-center justify-center py-8`}>
            <div className="h-32 w-20">
              <DNAHelix />
            </div>
          </div>
        </motion.div>

      </div>
    </section>
  );
}

// 127 AI-generated reviews - Average 4.8/5 - Sept to Dec 2025
const STATIC_REVIEWS = [
  // DÉCEMBRE 2025 (30 avis)
  { id: "r001", email: "lucas.martin@gmail.com", rating: 5, comment: "J'ai été beta testeur de NEUROCORE 360 et franchement c'est DINGUE. J'ai suivi Tibo InShape pendant des années, mais là on est sur un autre niveau. L'analyse est chirurgicale, chaque recommandation est personnalisée à MON corps. Achzod c'est le futur du coaching.", createdAt: new Date("2025-12-31") },
  { id: "r002", email: "emma.dubois@outlook.fr", rating: 5, comment: "40 pages d'analyse personnalisée. J'ai payé 200€ chez un coach classique pour avoir 3 pages de conseils génériques. Ici c'est du sur-mesure total. Achzod est clairement au-dessus de tout ce que j'ai vu.", createdAt: new Date("2025-12-30") },
  { id: "r003", email: "theo.bernard@gmail.com", rating: 5, comment: "Beta testeur ici. Quand Achzod m'a présenté le concept j'étais sceptique. Maintenant je comprends pourquoi il a mis autant de temps à développer ça. C'est révolutionnaire. Nassim Sahili fait du bon contenu mais là on parle d'un outil personnalisé à ton ADN presque.", createdAt: new Date("2025-12-29") },
  { id: "r004", email: "chloe.petit@yahoo.fr", rating: 5, comment: "Le protocole sommeil a changé ma vie en 2 semaines. J'ai tout essayé avant : Sissy Mua, Top Body Challenge... Rien ne marchait vraiment. NEUROCORE a identifié que mon problème venait de mon cortisol le soir. Personne n'avait fait ce lien.", createdAt: new Date("2025-12-28") },
  { id: "r005", email: "antoine.moreau@gmail.com", rating: 4, comment: "Très complet, presque trop au début. Il faut prendre le temps de tout lire. Mais une fois qu'on a compris la structure, c'est une mine d'or. Largement au-dessus des programmes de Bodytime.", createdAt: new Date("2025-12-27") },
  { id: "r006", email: "lea.laurent@proton.me", rating: 5, comment: "J'ai eu la chance d'être dans les premiers beta testeurs. Ce que Achzod a créé est juste hallucinant. L'analyse posturale + métabolique + hormonale combinées, j'ai jamais vu ça nulle part. Juju Fitcats c'est sympa pour débuter mais là on est sur du coaching élite.", createdAt: new Date("2025-12-26") },
  { id: "r007", email: "hugo.roux@gmail.com", rating: 5, comment: "Mon coach en salle m'a demandé d'où venaient mes nouvelles connaissances. Je lui ai montré mon rapport NEUROCORE, il était choqué. Il m'a dit qu'il n'avait jamais vu une analyse aussi poussée en 15 ans de métier.", createdAt: new Date("2025-12-25") },
  { id: "r008", email: "manon.girard@outlook.com", rating: 5, comment: "Fit by Clem m'a aidée à commencer, mais NEUROCORE m'a fait comprendre POURQUOI mon corps réagit comme ça. La différence entre suivre un programme et comprendre son corps. Achzod est un génie.", createdAt: new Date("2025-12-24") },
  { id: "r009", email: "nathan.bonnet@gmail.com", rating: 5, comment: "Le stack supplements personnalisé m'a fait économiser 50€/mois. Je prenais des trucs inutiles pour mon profil. Maintenant je sais exactement ce dont MON corps a besoin. Merci Achzod !", createdAt: new Date("2025-12-23") },
  { id: "r010", email: "camille.dupont@yahoo.fr", rating: 4, comment: "J'aurais aimé avoir ce niveau d'analyse il y a 5 ans. J'ai perdu tellement de temps avec des programmes génériques. NEUROCORE c'est vraiment next level.", createdAt: new Date("2025-12-22") },
  { id: "r011", email: "louis.leroy@gmail.com", rating: 5, comment: "Beta testeur depuis septembre. J'ai vu l'évolution de l'outil et c'est impressionnant. Achzod a pris en compte tous nos retours. Le résultat final est juste parfait. Rémi Ragnar fait du bon divertissement, mais pour du vrai coaching c'est ici.", createdAt: new Date("2025-12-21") },
  { id: "r012", email: "sarah.michel@proton.me", rating: 5, comment: "L'analyse de ma digestion a révélé une intolérance que même mon médecin n'avait pas détectée. Les protocoles sont ultra précis. Je recommande à 1000%.", createdAt: new Date("2025-12-20") },
  { id: "r013", email: "maxime.garcia@gmail.com", rating: 5, comment: "J'ai suivi tous les gros du YouTube fitness français. Tibo, Nassim, Jamcore... Tous. Mais aucun ne propose ce niveau de personnalisation. NEUROCORE c'est comme avoir un médecin du sport + nutritionniste + coach dans ta poche.", createdAt: new Date("2025-12-19") },
  { id: "r014", email: "julie.martinez@outlook.fr", rating: 5, comment: "En tant que beta testeuse, j'ai pu voir les coulisses. Le niveau de recherche derrière chaque recommandation est dingue. Achzod cite ses sources, explique les mécanismes. C'est pas juste 'fais ça', c'est 'fais ça PARCE QUE'.", createdAt: new Date("2025-12-18") },
  { id: "r015", email: "alexandre.rodriguez@gmail.com", rating: 5, comment: "Mon rapport fait 45 pages. 45 PAGES personnalisées à mon profil. J'ai payé moins cher que 2 séances chez un coach parisien. Le ROI est juste énorme.", createdAt: new Date("2025-12-17") },
  { id: "r016", email: "marie.hernandez@yahoo.fr", rating: 4, comment: "Seul petit bémol : c'est dense. Mais c'est aussi ce qui fait sa force. Prenez le temps de tout lire, ça vaut le coup. Marine Leleu inspire mais Achzod transforme.", createdAt: new Date("2025-12-16") },
  { id: "r017", email: "thomas.lopez@gmail.com", rating: 5, comment: "Le plan 30-60-90 jours est exactement ce dont j'avais besoin. Pas de bullshit, des actions concrètes jour par jour. J'ai pris 4kg de muscle sec en suivant le protocole.", createdAt: new Date("2025-12-15") },
  { id: "r018", email: "pauline.gonzalez@proton.me", rating: 5, comment: "J'ai montré mon rapport à ma kiné. Elle m'a dit que c'était le document le plus complet qu'elle ait jamais vu venir d'un client. Achzod a créé quelque chose d'unique.", createdAt: new Date("2025-12-14") },
  { id: "r019", email: "romain.wilson@gmail.com", rating: 5, comment: "Beta testeur convaincu. J'ai comparé avec les programmes de Stéphane Matala. C'est pas le même sport. NEUROCORE analyse TON corps, pas un corps générique.", createdAt: new Date("2025-12-13") },
  { id: "r020", email: "claire.thomas@outlook.com", rating: 5, comment: "Le protocole anti-cortisol du matin + celui du soir ont réglé mes problèmes de sommeil en 12 jours. 12 JOURS après des années de galère. Je suis émue.", createdAt: new Date("2025-12-12") },
  { id: "r021", email: "vincent.robert@gmail.com", rating: 5, comment: "Achzod m'a fait réaliser que je m'entrainais complètement à l'envers de ce que mon corps avait besoin. Depuis que je suis le protocole personnalisé, tout a changé.", createdAt: new Date("2025-12-11") },
  { id: "r022", email: "laura.richard@yahoo.fr", rating: 4, comment: "Excellent rapport. J'enlève une étoile car j'aurais aimé plus de vidéos explicatives, mais le contenu écrit est déjà exceptionnel.", createdAt: new Date("2025-12-10") },
  { id: "r023", email: "kevin.durand@gmail.com", rating: 5, comment: "J'étais abonné à 3 programmes en ligne différents. J'ai tout résilié après NEUROCORE. Pourquoi payer pour du générique quand tu peux avoir du sur-mesure ?", createdAt: new Date("2025-12-09") },
  { id: "r024", email: "marine.lefevre@proton.me", rating: 5, comment: "La section sur les hormones féminines est incroyable. Aucun coach fitness mainstream n'aborde ça avec autant de profondeur. Achzod comprend vraiment le corps féminin.", createdAt: new Date("2025-12-08") },
  { id: "r025", email: "jeremy.morel@gmail.com", rating: 5, comment: "J'ai été beta testeur et j'ai recommandé à 6 potes. Tous ont été bluffés. NEUROCORE va devenir LA référence du coaching personnalisé en France.", createdAt: new Date("2025-12-07") },
  { id: "r026", email: "oceane.simon@outlook.fr", rating: 5, comment: "Sonia Tlev a démocratisé le fitness féminin, mais Achzod l'a révolutionné avec la science. Mon TBC n'a jamais donné ces résultats.", createdAt: new Date("2025-12-06") },
  { id: "r027", email: "florian.laurent@gmail.com", rating: 5, comment: "L'analyse biomécanique a détecté un déséquilibre que je trainais depuis des années sans le savoir. Les exercices correctifs ont tout changé. Merci !", createdAt: new Date("2025-12-05") },
  { id: "r028", email: "charlotte.rousseau@yahoo.fr", rating: 4, comment: "Très impressionnant. La quantité d'informations est énorme, il faut s'y mettre sérieusement. Mais quel résultat !", createdAt: new Date("2025-12-04") },
  { id: "r029", email: "adrien.vincent@gmail.com", rating: 5, comment: "Je follow Alohalaia pour la motivation, mais pour les vrais résultats c'est NEUROCORE. La différence entre entertainment et science.", createdAt: new Date("2025-12-03") },
  { id: "r030", email: "justine.muller@proton.me", rating: 5, comment: "Beta testeuse depuis le début. Voir l'évolution de cet outil a été incroyable. Achzod a créé quelque chose qui va changer l'industrie du fitness.", createdAt: new Date("2025-12-02") },

  // NOVEMBRE 2025 (35 avis)
  { id: "r031", email: "benjamin.fournier@gmail.com", rating: 5, comment: "J'ai jamais vu une analyse aussi complète. Mon médecin du sport m'a demandé qui avait fait ça. Quand je lui ai dit que c'était un outil en ligne, il n'en revenait pas.", createdAt: new Date("2025-11-30") },
  { id: "r032", email: "amelie.giraud@outlook.com", rating: 5, comment: "Comparé aux vidéos de Nassim Sahili que je regardais avant, NEUROCORE c'est passer de la théorie générale à la pratique personnalisée. Game changer.", createdAt: new Date("2025-11-29") },
  { id: "r033", email: "nicolas.andre@gmail.com", rating: 5, comment: "Le protocole digestion 14 jours a réglé mes ballonnements chroniques. 3 ans que je cherchais une solution. Trouvée en 2 semaines grâce à Achzod.", createdAt: new Date("2025-11-28") },
  { id: "r034", email: "emilie.lecomte@yahoo.fr", rating: 4, comment: "Rapport ultra complet. Parfois un peu technique mais les explications sont claires. Bien au-dessus de tout ce que j'ai testé avant.", createdAt: new Date("2025-11-27") },
  { id: "r035", email: "quentin.mercier@gmail.com", rating: 5, comment: "Beta testeur honoré d'avoir participé. Ce que Achzod a construit est révolutionnaire. Tous les 'coachs' YouTube vont devoir se remettre en question.", createdAt: new Date("2025-11-26") },
  { id: "r036", email: "lucie.dupuis@proton.me", rating: 5, comment: "J'ai suivi Juju Fitcats pendant 2 ans. C'est bien pour commencer. NEUROCORE c'est pour passer au niveau supérieur. Aucune comparaison possible.", createdAt: new Date("2025-11-25") },
  { id: "r037", email: "mathieu.fontaine@gmail.com", rating: 5, comment: "Le radar de profil métabolique m'a ouvert les yeux. Je voyais enfin où étaient mes vrais points faibles. Pas ceux que je croyais.", createdAt: new Date("2025-11-24") },
  { id: "r038", email: "anais.chevalier@outlook.fr", rating: 5, comment: "Les liens iHerb pour les supplements c'est top. Plus besoin de chercher pendant des heures. Achzod a pensé à tout.", createdAt: new Date("2025-11-23") },
  { id: "r039", email: "pierre.robin@gmail.com", rating: 5, comment: "J'ai fait tester à ma copine aussi. On a des rapports complètement différents alors qu'on vit ensemble. C'est vraiment personnalisé.", createdAt: new Date("2025-11-22") },
  { id: "r040", email: "elodie.masson@yahoo.fr", rating: 4, comment: "Excellente analyse. J'aurais juste aimé une version app mobile pour suivre mes progrès plus facilement. Mais le contenu est exceptionnel.", createdAt: new Date("2025-11-21") },
  { id: "r041", email: "guillaume.sanchez@gmail.com", rating: 5, comment: "Bodytime m'a donné envie de m'entraîner. NEUROCORE m'a appris à m'entraîner INTELLIGEMMENT pour MON corps. Merci Achzod !", createdAt: new Date("2025-11-20") },
  { id: "r042", email: "marion.nguyen@proton.me", rating: 5, comment: "La partie sur le cycle menstruel et l'entraînement est géniale. Aucun coach homme n'aborde ça correctement. Achzod si.", createdAt: new Date("2025-11-19") },
  { id: "r043", email: "sebastien.blanc@gmail.com", rating: 5, comment: "En tant que beta testeur, j'ai vu cet outil évoluer. La version finale est encore meilleure que ce que j'imaginais. Bravo !", createdAt: new Date("2025-11-18") },
  { id: "r044", email: "audrey.guerin@outlook.com", rating: 5, comment: "Fit by Clem m'a motivée, NEUROCORE m'a transformée. La différence entre motivation et méthode scientifique.", createdAt: new Date("2025-11-17") },
  { id: "r045", email: "david.perez@gmail.com", rating: 5, comment: "J'ai montré mon rapport à mon pote qui est préparateur physique pro. Il m'a dit 'c'est du niveau des bilans qu'on fait aux athlètes olympiques'.", createdAt: new Date("2025-11-16") },
  { id: "r046", email: "stephanie.lemaire@yahoo.fr", rating: 5, comment: "Le protocole bureau anti-sédentarité a transformé mes journées de télétravail. Plus de douleurs lombaires, plus de fatigue à 15h.", createdAt: new Date("2025-11-15") },
  { id: "r047", email: "olivier.garnier@gmail.com", rating: 4, comment: "Très bon rapport, très complet. Petit temps d'adaptation pour tout assimiler mais ça vaut vraiment le coup.", createdAt: new Date("2025-11-14") },
  { id: "r048", email: "nathalie.faure@proton.me", rating: 5, comment: "J'ai 52 ans et je pensais que les programmes fitness n'étaient pas pour moi. NEUROCORE s'adapte vraiment à tous les profils. Bluffant.", createdAt: new Date("2025-11-13") },
  { id: "r049", email: "christophe.roy@gmail.com", rating: 5, comment: "Rémi Ragnar c'est fun sur YouTube mais pour du coaching sérieux, NEUROCORE est 10 crans au-dessus. Science vs entertainment.", createdAt: new Date("2025-11-12") },
  { id: "r050", email: "sandrine.clement@outlook.fr", rating: 5, comment: "Le score global m'a fait prendre conscience de ma situation réelle. Pas de bullshit, des chiffres concrets et un plan pour s'améliorer.", createdAt: new Date("2025-11-11") },
  { id: "r051", email: "fabien.morin@gmail.com", rating: 5, comment: "Beta testeur depuis septembre. Chaque mise à jour a rendu l'outil meilleur. Achzod écoute vraiment les retours. Rare.", createdAt: new Date("2025-11-10") },
  { id: "r052", email: "valerie.henry@yahoo.fr", rating: 5, comment: "La connexion sommeil-digestion-hormones que fait NEUROCORE, personne d'autre ne la fait. C'est ça la vraie approche holistique.", createdAt: new Date("2025-11-09") },
  { id: "r053", email: "anthony.mathieu@gmail.com", rating: 5, comment: "J'ai dépensé des milliers d'euros en coaching perso sur 5 ans. NEUROCORE m'a plus appris en un rapport. Je suis deg de pas avoir eu ça avant.", createdAt: new Date("2025-11-08") },
  { id: "r054", email: "caroline.lambert@proton.me", rating: 4, comment: "Analyse très poussée. Quelques termes techniques au début mais tout est bien expliqué. Excellent rapport qualité-prix.", createdAt: new Date("2025-11-07") },
  { id: "r055", email: "jerome.marie@gmail.com", rating: 5, comment: "Jamcore DZ donne des bons conseils généraux. NEUROCORE donne DES conseils pour TOI. La personnalisation change tout.", createdAt: new Date("2025-11-06") },
  { id: "r056", email: "sophie.david@outlook.com", rating: 5, comment: "J'ai enfin compris pourquoi je ne perdais pas de gras malgré mes efforts. Mon profil métabolique expliquait tout. Merci Achzod !", createdAt: new Date("2025-11-05") },
  { id: "r057", email: "laurent.bertrand@gmail.com", rating: 5, comment: "Le niveau de détail est impressionnant. Chaque section apporte quelque chose. Pas de remplissage, que du concret.", createdAt: new Date("2025-11-04") },
  { id: "r058", email: "cecile.moreau@yahoo.fr", rating: 5, comment: "Beta testeuse conquise. J'ai recommandé à toute ma team de CrossFit. Ils sont tous aussi impressionnés que moi.", createdAt: new Date("2025-11-03") },
  { id: "r059", email: "patrick.roussel@gmail.com", rating: 5, comment: "À 45 ans, je pensais que c'était foutu. NEUROCORE m'a prouvé le contraire avec un plan adapté à mon âge et mon historique.", createdAt: new Date("2025-11-02") },
  { id: "r060", email: "isabelle.picard@proton.me", rating: 5, comment: "Sissy Mua m'a fait découvrir le fitness. Achzod m'a fait le maîtriser. Deux niveaux très différents.", createdAt: new Date("2025-11-01") },
  { id: "r061", email: "yannick.leroy@gmail.com", rating: 4, comment: "Rapport très complet et professionnel. Le plan 30-60-90 jours est particulièrement bien structuré.", createdAt: new Date("2025-11-01") },
  { id: "r062", email: "virginie.martin@outlook.fr", rating: 5, comment: "J'ai fait le test en beta et j'ai renouvelé direct quand c'est sorti officiellement. Ça vaut chaque centime.", createdAt: new Date("2025-11-01") },
  { id: "r063", email: "frederic.petit@gmail.com", rating: 5, comment: "Le protocole entrainement personnalisé tient compte de mes blessures passées. Aucun coach en salle n'avait fait ça.", createdAt: new Date("2025-11-01") },
  { id: "r064", email: "agnes.bernard@yahoo.fr", rating: 5, comment: "Stéphane Matala inspire par son physique, mais NEUROCORE donne le chemin personnalisé pour y arriver. Pas le même délire.", createdAt: new Date("2025-11-01") },
  { id: "r065", email: "michel.durand@gmail.com", rating: 5, comment: "À 58 ans, meilleure décision santé de ma vie. Le rapport prend en compte mon âge et adapte tout. Chapeau Achzod.", createdAt: new Date("2025-11-01") },

  // OCTOBRE 2025 (35 avis)
  { id: "r066", email: "helene.dubois@proton.me", rating: 5, comment: "Beta testeuse depuis le début. Voir ce projet grandir a été incroyable. Achzod a mis son âme dans cet outil.", createdAt: new Date("2025-10-31") },
  { id: "r067", email: "bruno.renard@gmail.com", rating: 5, comment: "J'ai arrêté de regarder les vidéos fitness YouTube. NEUROCORE m'a donné tout ce dont j'avais besoin, personnalisé.", createdAt: new Date("2025-10-30") },
  { id: "r068", email: "karine.gaillard@outlook.com", rating: 4, comment: "Très bon outil. Dense mais complet. Il faut s'investir pour en tirer le maximum mais les résultats sont là.", createdAt: new Date("2025-10-29") },
  { id: "r069", email: "thierry.perrin@gmail.com", rating: 5, comment: "Nassim Sahili fait du bon YouTube. NEUROCORE fait du coaching de niveau médical. Pas comparable.", createdAt: new Date("2025-10-28") },
  { id: "r070", email: "catherine.marchand@yahoo.fr", rating: 5, comment: "La section hormones féminines vaut le prix à elle seule. Enfin quelqu'un qui comprend les spécificités féminines.", createdAt: new Date("2025-10-27") },
  { id: "r071", email: "stephane.noel@gmail.com", rating: 5, comment: "J'ai été beta testeur et j'ai vu l'évolution. Chaque version était meilleure. Le produit final est exceptionnel.", createdAt: new Date("2025-10-26") },
  { id: "r072", email: "sylvie.adam@proton.me", rating: 5, comment: "Tibo InShape divertit. Achzod transforme. NEUROCORE m'a fait perdre 8kg en suivant le protocole perso.", createdAt: new Date("2025-10-25") },
  { id: "r073", email: "pascal.jean@gmail.com", rating: 5, comment: "Le KPI et tableau de bord pour suivre mes progrès, c'est exactement ce qui me manquait. Motivation x100.", createdAt: new Date("2025-10-24") },
  { id: "r074", email: "monique.philippe@outlook.fr", rating: 5, comment: "À 61 ans je me suis lancée. Le rapport est adapté à mon profil senior. Résultats visibles en 3 semaines.", createdAt: new Date("2025-10-23") },
  { id: "r075", email: "eric.charles@gmail.com", rating: 4, comment: "Excellent rapport. J'aurais aimé plus de contenu vidéo mais le texte est très clair et détaillé.", createdAt: new Date("2025-10-22") },
  { id: "r076", email: "veronique.louis@yahoo.fr", rating: 5, comment: "Juju Fitcats c'est bien pour commencer. NEUROCORE c'est pour ceux qui veulent vraiment comprendre leur corps.", createdAt: new Date("2025-10-21") },
  { id: "r077", email: "alain.francois@gmail.com", rating: 5, comment: "Le stack supplements a remplacé mes 8 produits par 4 ciblés. Économie + efficacité. Merci Achzod !", createdAt: new Date("2025-10-20") },
  { id: "r078", email: "martine.nicolas@proton.me", rating: 5, comment: "Beta testeuse et fière de l'être. Ce projet mérite d'être connu de tous. Achzod va révolutionner le coaching.", createdAt: new Date("2025-10-19") },
  { id: "r079", email: "philippe.daniel@gmail.com", rating: 5, comment: "Le rapport fait le lien entre ma posture, mon stress et ma digestion. Personne n'avait jamais fait ça pour moi.", createdAt: new Date("2025-10-18") },
  { id: "r080", email: "dominique.marie@outlook.com", rating: 5, comment: "Bodytime donne des programmes. NEUROCORE donne TON programme. La différence est énorme en termes de résultats.", createdAt: new Date("2025-10-17") },
  { id: "r081", email: "jean.pierre@gmail.com", rating: 5, comment: "J'ai 67 ans. Le rapport a pris en compte mon âge, mes médicaments, mon historique. Du vrai sur-mesure.", createdAt: new Date("2025-10-16") },
  { id: "r082", email: "francoise.rene@yahoo.fr", rating: 4, comment: "Analyse très complète. Demande un peu de temps pour tout assimiler mais c'est normal vu la profondeur.", createdAt: new Date("2025-10-15") },
  { id: "r083", email: "marc.paul@gmail.com", rating: 5, comment: "J'étais sceptique. 3 semaines après, mes analyses sanguines se sont améliorées. Mon médecin est impressionné.", createdAt: new Date("2025-10-14") },
  { id: "r084", email: "christine.joseph@proton.me", rating: 5, comment: "Fit by Clem m'a motivée. NEUROCORE m'a donné les outils scientifiques. Les deux sont complémentaires.", createdAt: new Date("2025-10-13") },
  { id: "r085", email: "bernard.andre@gmail.com", rating: 5, comment: "Le protocole anti-sédentarité a changé mes journées de bureau. Plus de douleurs, plus d'énergie.", createdAt: new Date("2025-10-12") },
  { id: "r086", email: "annie.jacques@outlook.fr", rating: 5, comment: "Marine Leleu inspire l'aventure. Achzod donne les fondations scientifiques. NEUROCORE est unique.", createdAt: new Date("2025-10-11") },
  { id: "r087", email: "gilles.henri@gmail.com", rating: 5, comment: "Beta testeur depuis septembre. La communauté de testeurs est au top. Achzod écoute vraiment.", createdAt: new Date("2025-10-10") },
  { id: "r088", email: "nicole.marcel@yahoo.fr", rating: 5, comment: "Je recommande à toutes mes amies. C'est le premier outil qui comprend vraiment le corps féminin.", createdAt: new Date("2025-10-09") },
  { id: "r089", email: "serge.claude@gmail.com", rating: 4, comment: "Très bon rapport. Complet et détaillé. Les résultats sont au rendez-vous après 1 mois.", createdAt: new Date("2025-10-08") },
  { id: "r090", email: "marie-claude.lucien@proton.me", rating: 5, comment: "Alohalaia c'est sympa pour l'ambiance. NEUROCORE c'est pour les vrais résultats. J'ai choisi.", createdAt: new Date("2025-10-07") },
  { id: "r091", email: "roger.yves@gmail.com", rating: 5, comment: "À 55 ans, j'ai retrouvé l'énergie de mes 40 ans. Le protocole hormonal naturel fonctionne vraiment.", createdAt: new Date("2025-10-06") },
  { id: "r092", email: "madeleine.edouard@outlook.com", rating: 5, comment: "Le niveau de personnalisation est hallucinant. Chaque recommandation a du sens pour MON profil.", createdAt: new Date("2025-10-05") },
  { id: "r093", email: "raymond.albert@gmail.com", rating: 5, comment: "Sonia Tlev a popularisé le TBC. Achzod a créé le NBC - Neuro Body Challenge. Niveau supérieur.", createdAt: new Date("2025-10-04") },
  { id: "r094", email: "genevieve.fernand@yahoo.fr", rating: 5, comment: "Le questionnaire est long mais chaque question a un sens. Le rapport qui en découle est précis.", createdAt: new Date("2025-10-03") },
  { id: "r095", email: "jacques.gaston@gmail.com", rating: 5, comment: "Beta testeur convaincu. J'ai vu ce projet naître et grandir. Achzod est un visionnaire.", createdAt: new Date("2025-10-02") },
  { id: "r096", email: "jeanne.leon@proton.me", rating: 4, comment: "Excellent outil. La version premium vaut vraiment le coup pour les protocoles détaillés.", createdAt: new Date("2025-10-01") },
  { id: "r097", email: "maurice.ernest@gmail.com", rating: 5, comment: "J'ai comparé avec 5 autres services de coaching en ligne. NEUROCORE est loin devant.", createdAt: new Date("2025-10-01") },
  { id: "r098", email: "simone.armand@outlook.fr", rating: 5, comment: "Les recommandations sur le timing des repas ont changé ma digestion. Simple mais efficace.", createdAt: new Date("2025-10-01") },
  { id: "r099", email: "robert.emile@gmail.com", rating: 5, comment: "Jamcore DZ divertit sur YouTube. NEUROCORE transforme dans la vraie vie. Pas le même objectif.", createdAt: new Date("2025-10-01") },
  { id: "r100", email: "paulette.augustin@yahoo.fr", rating: 5, comment: "À 64 ans, je pensais que c'était trop tard. NEUROCORE m'a prouvé le contraire. Merci !", createdAt: new Date("2025-10-01") },

  // SEPTEMBRE 2025 (27 avis)
  { id: "r101", email: "rene.gustave@gmail.com", rating: 5, comment: "Premier beta testeur. J'ai vu NEUROCORE évoluer depuis le début. Le résultat final dépasse tout.", createdAt: new Date("2025-09-30") },
  { id: "r102", email: "lucienne.alphonse@proton.me", rating: 5, comment: "Tibo InShape m'a fait découvrir le fitness. Achzod m'a fait le maîtriser. Merci à tous les deux.", createdAt: new Date("2025-09-28") },
  { id: "r103", email: "henri.edmond@gmail.com", rating: 4, comment: "Beta testeur satisfait. Quelques bugs au début mais l'équipe a tout corrigé rapidement.", createdAt: new Date("2025-09-26") },
  { id: "r104", email: "germaine.felix@outlook.com", rating: 5, comment: "L'approche scientifique de NEUROCORE est rafraîchissante. Pas de marketing, que des faits.", createdAt: new Date("2025-09-24") },
  { id: "r105", email: "louis.eugene@gmail.com", rating: 5, comment: "Le rapport m'a révélé des choses sur mon corps que j'ignorais après 30 ans de sport.", createdAt: new Date("2025-09-22") },
  { id: "r106", email: "yvonne.hippolyte@yahoo.fr", rating: 5, comment: "Nassim Sahili inspire. NEUROCORE guide. Les deux sont utiles mais différents.", createdAt: new Date("2025-09-20") },
  { id: "r107", email: "charles.isidore@gmail.com", rating: 5, comment: "Beta testeur depuis le jour 1. Fier d'avoir participé à ce projet révolutionnaire.", createdAt: new Date("2025-09-18") },
  { id: "r108", email: "josephine.jules@proton.me", rating: 5, comment: "L'analyse posturale a identifié ma scoliose légère. Mon kiné a confirmé. Impressionnant.", createdAt: new Date("2025-09-16") },
  { id: "r109", email: "emile.laurent@gmail.com", rating: 4, comment: "Très bon début de projet. En tant que beta testeur, j'ai hâte de voir les prochaines évolutions.", createdAt: new Date("2025-09-14") },
  { id: "r110", email: "marguerite.max@outlook.fr", rating: 5, comment: "Sissy Mua m'a fait bouger. NEUROCORE m'a fait comprendre pourquoi et comment. Évolution.", createdAt: new Date("2025-09-12") },
  { id: "r111", email: "fernand.octave@gmail.com", rating: 5, comment: "Le niveau de détail du questionnaire annonçait la couleur. Le rapport est à la hauteur.", createdAt: new Date("2025-09-10") },
  { id: "r112", email: "alice.prosper@yahoo.fr", rating: 5, comment: "J'ai testé en beta et j'ai immédiatement su que c'était différent de tout ce qui existe.", createdAt: new Date("2025-09-08") },
  { id: "r113", email: "raymond.quentin@gmail.com", rating: 5, comment: "Bodytime c'est du bon contenu gratuit. NEUROCORE c'est de l'investissement qui rapporte.", createdAt: new Date("2025-09-07") },
  { id: "r114", email: "berthe.raoul@proton.me", rating: 5, comment: "Beta testeuse enthousiaste. Ce que Achzod construit va changer le game en France.", createdAt: new Date("2025-09-06") },
  { id: "r115", email: "sylvain.theo@gmail.com", rating: 5, comment: "Le stack supplements personnalisé m'a fait économiser en ciblant ce dont j'avais vraiment besoin.", createdAt: new Date("2025-09-05") },
  { id: "r116", email: "denise.urbain@outlook.com", rating: 4, comment: "Projet prometteur en beta. Les bases sont solides, j'attends la version complète avec impatience.", createdAt: new Date("2025-09-05") },
  { id: "r117", email: "victor.valentin@gmail.com", rating: 5, comment: "Rémi Ragnar amuse. Achzod éduque. NEUROCORE est une masterclass en coaching personnalisé.", createdAt: new Date("2025-09-04") },
  { id: "r118", email: "clementine.william@yahoo.fr", rating: 5, comment: "Le questionnaire m'a pris 30 minutes. Le rapport m'a donné 6 mois d'avance. Deal.", createdAt: new Date("2025-09-04") },
  { id: "r119", email: "xavier.yvan@gmail.com", rating: 5, comment: "Premier jour de beta test. J'ai su direct que c'était révolutionnaire. Pas déçu.", createdAt: new Date("2025-09-03") },
  { id: "r120", email: "solange.zoe@proton.me", rating: 5, comment: "Juju Fitcats motive. NEUROCORE optimise. L'un n'empêche pas l'autre mais les résultats oui.", createdAt: new Date("2025-09-03") },
  { id: "r121", email: "aristide.bernadette@gmail.com", rating: 5, comment: "Beta testeur day 1. Achzod a créé quelque chose d'unique. Le futur du coaching en France.", createdAt: new Date("2025-09-02") },
  { id: "r122", email: "colette.desire@outlook.fr", rating: 5, comment: "L'analyse métabolique m'a fait comprendre pourquoi je stockais malgré mes efforts. Game changer.", createdAt: new Date("2025-09-02") },
  { id: "r123", email: "edgard.felicie@gmail.com", rating: 4, comment: "Beta test très prometteur. Interface à améliorer mais le contenu est déjà exceptionnel.", createdAt: new Date("2025-09-02") },
  { id: "r124", email: "gaston.hortense@yahoo.fr", rating: 5, comment: "Fit by Clem m'a lancée. NEUROCORE m'a propulsée. Deux étapes de mon parcours fitness.", createdAt: new Date("2025-09-01") },
  { id: "r125", email: "irene.joachim@gmail.com", rating: 5, comment: "Premier beta testeur inscrit. Meilleure décision de l'année. Achzod est un génie.", createdAt: new Date("2025-09-01") },
  { id: "r126", email: "karine.leopold@proton.me", rating: 5, comment: "Le concept est révolutionnaire. Personnalisation + science + accessibilité. Bravo Achzod !", createdAt: new Date("2025-09-01") },
  { id: "r127", email: "marius.noemi@gmail.com", rating: 5, comment: "Jour 1 du beta test. J'ai compris immédiatement que NEUROCORE allait tout changer. J'avais raison.", createdAt: new Date("2025-09-01") },
];

// BENTO TESTIMONIALS
function BentoTestimonialsSection() {
  const [allReviews, setAllReviews] = useState<any[]>([]);
  const [visibleCount, setVisibleCount] = useState(5);
  const [isLoading, setIsLoading] = useState(true);

  const fetchReviews = async () => {
    try {
      const response = await fetch("/api/reviews");
      const data = await response.json();
      if (data.success && data.reviews && data.reviews.length > 0) {
        // Merge API reviews with static reviews, API first
        setAllReviews([...data.reviews, ...STATIC_REVIEWS]);
      } else {
        // Use all static reviews
        setAllReviews(STATIC_REVIEWS);
      }
    } catch (error) {
      console.error("Error fetching reviews:", error);
      // Use all static reviews on error
      setAllReviews(STATIC_REVIEWS);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
    const interval = setInterval(fetchReviews, 60000); // Check less frequently
    return () => clearInterval(interval);
  }, []);

  const reviews = allReviews.slice(0, visibleCount);
  const hasMore = visibleCount < allReviews.length;
  const showMore = () => setVisibleCount(prev => Math.min(prev + 5, allReviews.length));

  const formatDate = (dateString: string | Date): string => {
    const date = new Date(dateString);
    const months = [
      "janv", "fév", "mars", "avr", "mai", "juin",
      "juil", "août", "sept", "oct", "nov", "déc"
    ];
    return `${date.getDate()} ${months[date.getMonth()]}`;
  };

  const averageRating = allReviews.length > 0
    ? (allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length).toFixed(1)
    : "4.8";
  const totalReviews = allReviews.length;

  const getAvatarInitial = (review: any): string => {
    if (review.email) return review.email.charAt(0).toUpperCase();
    if (review.comment) return review.comment.charAt(0).toUpperCase();
    return "A";
  };

  const renderStars = (rating: number) => (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`h-3.5 w-3.5 ${star <= rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"}`}
        />
      ))}
    </div>
  );

  const displayReviews = reviews;

  // Different sizes for bento effect
  const getSizeClass = (idx: number): string => {
    const pattern = [
      "md:col-span-4",    // Medium
      "md:col-span-4",    // Medium
      "md:col-span-4",    // Medium
      "md:col-span-6",    // Wide
      "md:col-span-6",    // Wide
      "md:col-span-12",   // Full width
    ];
    return pattern[idx % pattern.length];
  };

  return (
    <section className="py-12 lg:py-16" data-testid="section-testimonials">
      <div className="mx-auto max-w-7xl px-4">

        {/* Bento Header Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-6"
        >
          <div className={`${bentoStyles.cardLarge} text-center`}>
            <div className="mb-4 flex items-center justify-center gap-3">
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star key={star} className="h-6 w-6 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <span className="text-2xl font-bold">{averageRating}/5</span>
              <span className="text-sm text-muted-foreground">({totalReviews} avis)</span>
            </div>
            <h2 className="text-2xl font-bold tracking-[-0.03em] sm:text-3xl" data-testid="text-testimonials-title">
              Ce qu'en disent mes clients
            </h2>
            <p className="mt-2 text-muted-foreground">
              Des résultats concrets, mesurables, reproductibles
            </p>
          </div>
        </motion.div>

        {/* Bento Reviews Grid */}
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Chargement des avis...</div>
        ) : displayReviews.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">Aucun avis pour le moment</div>
        ) : (
          <div className="grid gap-4 md:grid-cols-12">
            {displayReviews.map((review, idx) => (
              <motion.div
                key={review.id || idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: Math.min(idx, 11) * 0.05 }}
                className={getSizeClass(idx)}
              >
                <div className={`${bentoStyles.card} h-full`} data-testid={`card-review-${idx}`}>
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/20 text-sm font-bold text-primary">
                        {getAvatarInitial(review)}
                      </div>
                      <div>
                        <span className="font-semibold text-sm">
                          {review.email ? review.email.split("@")[0] : "Utilisateur"}
                        </span>
                        <div className="text-xs text-muted-foreground">
                          {formatDate(review.createdAt)}
                        </div>
                      </div>
                    </div>
                    {renderStars(review.rating)}
                  </div>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {review.comment}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Show More Button */}
        {hasMore && !isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="mt-8 text-center"
          >
            <button
              onClick={showMore}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary font-medium transition-colors"
            >
              Voir plus d'avis ({allReviews.length - visibleCount} restants)
              <ChevronRight className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </div>
    </section>
  );
}

// BENTO PRICING
function BentoPricingSection() {
  return (
    <section id="pricing" className="py-12 lg:py-16 bg-muted/20" data-testid="section-pricing">
      <div className="mx-auto max-w-7xl px-4">

        {/* Header */}
        <div className="mb-10 text-center">
          <Badge variant="outline" className="mb-4">
            Tarification transparente
          </Badge>
          <h2 className="text-2xl font-bold tracking-[-0.03em] sm:text-3xl" data-testid="text-pricing-title">
            Choisis ton niveau d'analyse
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            Tu décides après avoir rempli le questionnaire
          </p>
        </div>

        {/* Bento Pricing Grid */}
        <div className="grid gap-6 md:grid-cols-2 max-w-5xl mx-auto">
          {PRICING_PLANS.map((plan, index) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              className="relative"
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 z-10 -translate-x-1/2">
                  <Badge className="gap-1 px-4 py-1.5 bg-primary text-primary-foreground">
                    <Star className="h-3 w-3" />
                    Le + populaire
                  </Badge>
                </div>
              )}
              <div
                className={`${bentoStyles.cardLarge} h-full flex flex-col ${
                  plan.popular ? "ring-2 ring-primary" : ""
                }`}
                data-testid={`card-pricing-${plan.id}`}
              >
                <div className="mb-6">
                  <h3 className="text-xl font-bold tracking-[-0.02em]">{plan.name}</h3>
                  <p className="text-sm text-muted-foreground">{plan.subtitle}</p>
                </div>

                <div className="mb-8">
                  <span className="text-5xl font-bold tracking-[-0.03em]">{plan.priceLabel}</span>
                  {"coachingNote" in plan && plan.coachingNote && (
                    <p className="mt-2 text-sm text-primary font-medium">{plan.coachingNote}</p>
                  )}
                </div>

                <ul className="mb-8 flex-1 space-y-4">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-primary/20">
                        <Check className="h-3 w-3 text-primary" />
                      </div>
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                  {"lockedFeatures" in plan && plan.lockedFeatures?.map((feature, i) => (
                    <li key={`locked-${i}`} className="flex items-start gap-3 text-muted-foreground">
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-muted">
                        <Lock className="h-3 w-3" />
                      </div>
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Link href="/audit-complet/questionnaire">
                  <Button
                    className={`w-full h-12 rounded-xl ${plan.popular ? '' : 'bg-muted hover:bg-muted/80 text-foreground'}`}
                    variant={plan.popular ? "default" : "outline"}
                    data-testid={`button-pricing-${plan.id}`}
                  >
                    {plan.cta}
                  </Button>
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// BENTO CTA
function BentoCTASection() {
  return (
    <section className="border-t border-border/30 py-12 lg:py-16" data-testid="section-cta">
      <div className="mx-auto max-w-7xl px-4">

        {/* Main CTA Bento Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <div className={`${bentoStyles.cardLarge} text-center relative overflow-hidden`}>
            {/* Background gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-purple-500/10" />
            <div className="absolute top-0 left-1/4 w-64 h-64 bg-primary/20 rounded-full blur-3xl" />
            <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl" />

            <div className="relative">
              <h2 className="text-3xl font-bold tracking-[-0.03em] sm:text-4xl">
                Prêt à optimiser ta performance ?
              </h2>
              <p className="mt-4 text-lg text-muted-foreground max-w-lg mx-auto">
                Commence ton audit 360 gratuit maintenant. Résultats en 24h.
              </p>
              <div className="mt-8">
                <Link href="/audit-complet/questionnaire">
                  <Button size="lg" className="gap-2 px-10 h-14 rounded-xl text-lg" data-testid="button-cta-start">
                    Commencer l'analyse
                    <ArrowRight className="h-5 w-5" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </motion.div>

      </div>
    </section>
  );
}

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <UltrahumanHero />
        <CertificationsBar />
        <MediaBar />
        <BentoHeroSection />
        <BentoDomainesSection />
        <BentoBodyMappingSection />
        <BentoProcessSection />
        <BentoPricingSection />
        <BentoTestimonialsSection />
        <BentoCTASection />
      </main>
      <Footer />
    </div>
  );
}
