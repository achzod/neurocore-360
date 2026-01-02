import { useState, useEffect } from "react";
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

// BENTO DOMAINES - Variable size cards
function BentoDomainesSection() {
  // Assign sizes to create visual interest
  const getSizeClass = (idx: number): string => {
    // Pattern: Large, Small, Small, Medium, Small, Large...
    const pattern = [
      "md:col-span-4 md:row-span-2", // Large
      "md:col-span-4",               // Medium
      "md:col-span-4",               // Medium
      "md:col-span-6",               // Wide
      "md:col-span-6",               // Wide
      "md:col-span-4",               // Medium
      "md:col-span-4",               // Medium
      "md:col-span-4",               // Medium
      "md:col-span-6 md:row-span-2", // Large wide
      "md:col-span-6",               // Wide
      "md:col-span-4",               // Medium
      "md:col-span-4",               // Medium
      "md:col-span-4",               // Medium
      "md:col-span-8",               // Extra wide
      "md:col-span-4",               // Medium
    ];
    return pattern[idx % pattern.length];
  };

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

        {/* Bento Grid */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
          {QUESTIONNAIRE_SECTIONS.map((section, idx) => {
            const IconComponent = iconMap[section.icon] || User;
            const sizeClass = getSizeClass(idx);
            const isLarge = sizeClass.includes("row-span-2");

            return (
              <motion.div
                key={section.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: idx * 0.03 }}
                className={sizeClass}
              >
                <div className={`${bentoStyles.card} h-full flex ${isLarge ? 'flex-col justify-between' : 'items-start gap-4'} ${isLarge ? 'p-8' : 'p-5'}`}>
                  <div className={`flex ${isLarge ? 'h-14 w-14' : 'h-10 w-10'} shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary`}>
                    <IconComponent className={isLarge ? "h-7 w-7" : "h-5 w-5"} />
                  </div>
                  <div className={isLarge ? "mt-auto" : "flex-1"}>
                    <h3 className={`font-semibold text-foreground tracking-[-0.01em] ${isLarge ? 'text-xl mb-2' : 'text-sm'}`}>
                      {section.title}
                    </h3>
                    <p className={`text-muted-foreground ${isLarge ? 'text-sm' : 'text-xs'} line-clamp-2`}>
                      {section.description}
                    </p>
                  </div>
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

// BENTO TESTIMONIALS
function BentoTestimonialsSection() {
  const [reviews, setReviews] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchReviews = async () => {
    try {
      const response = await fetch("/api/reviews");
      const data = await response.json();
      if (data.success && data.reviews) {
        setReviews(data.reviews.slice(0, 6));
      }
    } catch (error) {
      console.error("Error fetching reviews:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
    const interval = setInterval(fetchReviews, 30000);
    return () => clearInterval(interval);
  }, []);

  const formatDate = (dateString: string | Date): string => {
    const date = new Date(dateString);
    const months = [
      "janv", "fév", "mars", "avr", "mai", "juin",
      "juil", "août", "sept", "oct", "nov", "déc"
    ];
    return `${date.getDate()} ${months[date.getMonth()]}`;
  };

  const averageRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : "4.8";
  const totalReviews = reviews.length;

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

  const displayReviews = reviews.length > 0 ? reviews : [];

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
                transition={{ duration: 0.4, delay: idx * 0.08 }}
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
