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
  Heart,
} from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";
import { DNAHelix } from "@/components/animations/DNAHelix";
import { BodyVisualization } from "@/components/animations/BodyVisualization";

import issaLogo from "@assets/ISSA+Logo+_+Vertical+_+for-white-background_1767172975495.webp";
import pnLogo from "@assets/limage-19764_1767172975495.webp";
import preScriptLogo from "@assets/Pre-Script_1200x1200_1767172975495.webp";
import nasmLogo from "@assets/nasm-logo_1767172987583.jpg";

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
  // Dupliquer plusieurs fois pour remplir toute la largeur sans espaces vides
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

function HeroSection() {
  return (
    <section className="relative bg-background py-16 lg:py-24" data-testid="section-hero">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(var(--primary)/0.08),transparent_70%)]" />
      
      <div className="relative mx-auto max-w-4xl px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Badge 
            variant="outline" 
            className="mb-8 border-primary/50 bg-primary/10 px-4 py-1.5 text-primary"
            data-testid="badge-hero"
          >
            <Sparkles className="mr-2 h-3 w-3" />
            AUDIT 360 COMPLET
          </Badge>

          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl" data-testid="text-hero-title">
            Décode ton système métabolique.
            <br />
            <span className="bg-gradient-to-r from-primary via-purple-400 to-purple-500 bg-clip-text text-transparent">
              Optimise ta performance.
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground" data-testid="text-hero-subtitle">
            180+ biomarqueurs analysés en profondeur pour comprendre et optimiser ton métabolisme.
          </p>

          <div className="mt-10">
            <Link href="/audit-complet/questionnaire">
              <Button 
                size="lg" 
                className="gap-2 bg-primary px-8 text-lg hover:bg-primary/90"
                data-testid="button-hero-cta"
              >
                LANCER L'ANALYSE
                <ChevronRight className="h-5 w-5" />
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function StatsSection() {
  const stats = [
    { value: "180+", label: "Questions" },
    { value: "21", label: "Sections" },
    { value: "15", label: "Domaines" },
  ];

  return (
    <section className="border-y border-border/30 bg-muted/20 py-12" data-testid="section-stats">
      <div className="mx-auto max-w-4xl px-4">
        <div className="flex items-center justify-center gap-16 sm:gap-24">
          {stats.map((stat, idx) => (
            <div key={idx} className="text-center" data-testid={`stat-${stat.label.toLowerCase()}`}>
              <div className="text-4xl font-bold text-primary sm:text-5xl">{stat.value}</div>
              <div className="mt-1 text-sm text-muted-foreground">{stat.label}</div>
            </div>
          ))}
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

function DomainesSection() {
  return (
    <section id="domaines" className="relative border-y border-border/30 bg-background py-16 lg:py-24" data-testid="section-domaines">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(var(--primary)/0.05),transparent_70%)]" />
      <div className="relative mx-auto max-w-7xl px-4">
        <div className="mb-12 text-center">
          <Badge variant="outline" className="mb-4 border-primary/50 bg-primary/10 text-primary">
            Analyse Complète
          </Badge>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl" data-testid="text-domaines-title">
            15 Domaines d'Analyse
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
            Une approche holistique couvrant tous les aspects de ton métabolisme, ta biomécanique et ta santé globale
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {QUESTIONNAIRE_SECTIONS.map((section, idx) => {
            const IconComponent = iconMap[section.icon] || User;
            return (
              <motion.div
                key={section.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: idx * 0.05 }}
              >
                <Card className="h-full border-border/50 bg-card/50 transition-all hover:border-primary/50 hover:shadow-lg">
                  <CardContent className="flex items-start gap-4 p-6">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <IconComponent className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground">{section.title}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">{section.description}</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

      </div>
    </section>
  );
}

function BodyMappingSection() {
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
    <section className="relative border-y border-border/30 bg-background py-16 lg:py-24" data-testid="section-body-mapping">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(var(--primary)/0.05),transparent_70%)]" />
      <div className="relative mx-auto max-w-6xl px-4">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
            Cartographie complète de ton corps
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground text-lg">
            Survole les zones pour découvrir les points d'analyse
          </p>
        </div>

        {/* Animation BodyVisualization centrée */}
        <div className="flex justify-center mb-12">
          <div className="h-[500px] w-[500px] max-w-full">
            <BodyVisualization activeCategory={activeCategory || undefined} className="h-full w-full" />
          </div>
        </div>

        {/* Boutons de catégories en dessous */}
        <div className="mb-12">
          <p className="text-center text-muted-foreground mb-6 text-sm font-medium">
            Sélectionne une catégorie pour voir les zones analysées :
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 max-w-5xl mx-auto">
            {categories.map((category) => {
              const isActive = activeCategory === category.id;
              return (
                <motion.button
                  key={category.id}
                  onClick={() => setActiveCategory(isActive ? null : category.id)}
                  className={`
                    relative px-4 py-3 rounded-lg border-2 transition-all
                    ${isActive 
                      ? 'bg-card shadow-lg border-2' 
                      : 'border-border bg-card/50 hover:border-border/80'
                    }
                  `}
                  style={{
                    borderColor: isActive ? category.color : undefined,
                  }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <div 
                    className="text-sm font-semibold text-center"
                    style={{ color: isActive ? category.color : 'inherit' }}
                  >
                    {category.name}
                  </div>
                  {isActive && (
                    <motion.div
                      className="absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-background"
                      style={{ backgroundColor: category.color }}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                    />
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Section analyse temps réel */}
        <div className="mt-12 text-center">
          <div className="inline-flex items-center gap-3 px-6 py-3 rounded-lg bg-muted/50 border border-border/50">
            <Heart className="w-5 h-5 text-primary" />
            <div className="text-left">
              <p className="font-semibold text-sm">Analyse en temps réel</p>
              <p className="text-xs text-muted-foreground">
                Chaque zone est évaluée selon tes réponses
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ProcessSection() {
  const steps = [
    {
      step: 1,
      title: "Questionnaire Complet",
      description: "180+ questions sur 15 domaines : métabolisme, hormones, nutrition, biomécanique...",
      icon: CheckCircle2,
    },
    {
      step: 2,
      title: "Analyse Avancée",
      description: "J'analyse tes réponses et tes photos pour créer un profil complet personnalisé",
      icon: Brain,
    },
    {
      step: 3,
      title: "Rapport Personnalisé",
      description: "Reçois un rapport détaillé de 20+ pages avec scores, recommandations et plan d'action",
      icon: Award,
    },
    {
      step: 4,
      title: "Plan d'Action Concret",
      description: "Protocoles précis : suppléments, nutrition, exercices, timing... Tout est détaillé",
      icon: CheckCircle2,
    },
  ];

  return (
    <section id="process" className="relative border-y border-border/30 bg-muted/20 py-16 lg:py-24" data-testid="section-process">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mb-12 text-center">
          <Badge variant="outline" className="mb-4">
            Simple & Efficace
          </Badge>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl" data-testid="text-process-title">
            Comment ça marche ?
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
            En 4 étapes simples, découvre les leviers d'optimisation de ton métabolisme
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, idx) => {
            const IconComponent = step.icon;
            return (
              <motion.div
                key={step.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: idx * 0.1 }}
                className="relative"
              >
                <Card className="h-full border-border/50 bg-card/50 text-center">
                  <CardContent className="p-6">
                    <div className="mb-4 flex justify-center">
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-2xl font-bold text-primary">
                        {step.step}
                      </div>
                    </div>
                    <div className="mb-4 flex justify-center">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <IconComponent className="h-5 w-5" />
                      </div>
                    </div>
                    <h3 className="mb-2 text-lg font-semibold">{step.title}</h3>
                    <p className="text-sm text-muted-foreground">{step.description}</p>
                  </CardContent>
                </Card>
                {idx < steps.length - 1 && (
                  <div className="absolute -right-4 top-1/2 hidden -translate-y-1/2 lg:block">
                    <ChevronRight className="h-6 w-6 text-muted-foreground/30" />
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Animation DNA en dessous */}
        <div className="mt-16 flex justify-center">
          <div className="h-48 w-24">
            <DNAHelix />
          </div>
        </div>
      </div>
    </section>
  );
}

function TestimonialsSection() {
  const [reviews, setReviews] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchReviews = async () => {
    try {
      const response = await fetch("/api/reviews");
      const data = await response.json();
      if (data.success && data.reviews) {
        // Les reviews sont déjà triés par date DESC dans la query SQL
        setReviews(data.reviews.slice(0, 6)); // Limiter à 6 pour l'affichage
      }
    } catch (error) {
      console.error("Error fetching reviews:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
    // Rafraîchir toutes les 30 secondes pour mettre à jour automatiquement
    const interval = setInterval(fetchReviews, 30000);
    return () => clearInterval(interval);
  }, []);

  // Format date en français : "15 janv" ou "3 fév"
  const formatDate = (dateString: string | Date): string => {
    const date = new Date(dateString);
    const months = [
      "janv", "fév", "mars", "avr", "mai", "juin",
      "juil", "août", "sept", "oct", "nov", "déc"
    ];
    return `${date.getDate()} ${months[date.getMonth()]}`;
  };

  // Calculer la moyenne et le nombre total
  const averageRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : "4.8";
  const totalReviews = reviews.length;

  // Générer avatar initiale depuis le commentaire ou email
  const getAvatarInitial = (review: any): string => {
    if (review.email) {
      return review.email.charAt(0).toUpperCase();
    }
    if (review.comment) {
      return review.comment.charAt(0).toUpperCase();
    }
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

  // Fallback si pas de reviews (afficher les données statiques)
  const displayReviews = reviews.length > 0 ? reviews : [];

  return (
    <section className="py-16 lg:py-24" data-testid="section-testimonials">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mb-12 text-center">
          <div className="mb-4 flex items-center justify-center gap-3">
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star key={star} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
              ))}
            </div>
            <span className="text-xl font-bold">{averageRating}/5</span>
            <span className="text-sm text-muted-foreground">({totalReviews} avis)</span>
          </div>
          <h2 className="text-2xl font-bold sm:text-3xl" data-testid="text-testimonials-title">
            Ce qu'en disent mes clients
          </h2>
          <p className="mt-2 text-muted-foreground">
            Des résultats concrets, mesurables, reproductibles
          </p>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Chargement des avis...</div>
        ) : displayReviews.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">Aucun avis pour le moment</div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {displayReviews.map((review, idx) => (
              <motion.div
                key={review.id || idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: idx * 0.08 }}
              >
                <Card className="h-full border-border/50 bg-card/50" data-testid={`card-review-${idx}`}>
                  <CardContent className="flex h-full flex-col p-5">
                    <div className="mb-3 flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/20 text-sm font-bold text-primary">
                          {getAvatarInitial(review)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">
                              {review.email ? review.email.split("@")[0] : "Utilisateur"}
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {formatDate(review.createdAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mb-2 flex items-center gap-2">
                      {renderStars(review.rating)}
                    </div>
                    
                    <p className="flex-1 text-sm leading-relaxed text-muted-foreground">
                      {review.comment}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function PricingSection() {
  return (
    <section id="pricing" className="py-16 lg:py-24" data-testid="section-pricing">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mb-12 text-center">
          <Badge variant="outline" className="mb-4">
            Tarification transparente
          </Badge>
          <h2 className="text-2xl font-bold sm:text-3xl" data-testid="text-pricing-title">
            Choisis ton niveau d'analyse
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            Tu décides après avoir rempli le questionnaire
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2 items-stretch max-w-4xl mx-auto">
          {PRICING_PLANS.map((plan, index) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              className="relative flex"
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 z-10 -translate-x-1/2">
                  <Badge className="gap-1 px-3 py-1">
                    <Star className="h-3 w-3" />
                    Le + populaire
                  </Badge>
                </div>
              )}
              {"bestValue" in plan && plan.bestValue && (
                <div className="absolute -top-3 left-1/2 z-10 -translate-x-1/2">
                  <Badge variant="secondary" className="gap-1 bg-accent px-3 py-1 text-accent-foreground">
                    Best Value
                  </Badge>
                </div>
              )}
              <Card
                className={`h-full ${
                  plan.popular ? "border-primary ring-1 ring-primary" : ""
                }`}
                data-testid={`card-pricing-${plan.id}`}
              >
                <CardContent className="flex h-full flex-col p-6">
                  <div className="mb-4">
                    <h3 className="text-xl font-bold">{plan.name}</h3>
                    <p className="text-sm text-muted-foreground">{plan.subtitle}</p>
                  </div>
                  
                  <div className="mb-6">
                    <span className="text-4xl font-bold">{plan.priceLabel}</span>
                    {"coachingNote" in plan && plan.coachingNote && (
                      <p className="mt-1 text-xs text-primary">{plan.coachingNote}</p>
                    )}
                  </div>

                  <ul className="mb-6 flex-1 space-y-3">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                    {"lockedFeatures" in plan && plan.lockedFeatures?.map((feature, i) => (
                      <li key={`locked-${i}`} className="flex items-start gap-2 text-muted-foreground">
                        <Lock className="mt-0.5 h-4 w-4 shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Link href="/audit-complet/questionnaire">
                    <Button 
                      className="w-full" 
                      variant={plan.popular ? "default" : "outline"}
                      data-testid={`button-pricing-${plan.id}`}
                    >
                      {plan.cta}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTASection() {
  return (
    <section className="border-t border-border/30 bg-muted/20 py-16" data-testid="section-cta">
      <div className="mx-auto max-w-2xl px-4 text-center">
        <h2 className="text-2xl font-bold sm:text-3xl">
          Prêt à optimiser ta performance ?
        </h2>
        <p className="mt-4 text-muted-foreground">
          Commence ton audit 360 gratuit maintenant. Résultats en 24h.
        </p>
        <div className="mt-8">
          <Link href="/audit-complet/questionnaire">
            <Button size="lg" className="gap-2 px-8" data-testid="button-cta-start">
              Commencer l'analyse
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
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
        <HeroSection />
        <StatsSection />
        <DomainesSection />
        <BodyMappingSection />
        <ProcessSection />
        <PricingSection />
        <TestimonialsSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}
