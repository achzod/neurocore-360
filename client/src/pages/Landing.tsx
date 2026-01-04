import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { FixedReviewsWidget } from "@/components/FixedReviewsWidget";
import {
  Star,
  ArrowRight,
  ChevronRight,
  Check,
  Zap,
  Brain,
  Activity,
  Droplet,
  Scan,
  Quote,
  TrendingUp,
  Shield,
  Clock,
  Users,
  FileText,
  ChevronDown,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// Certification logos
import issaLogo from "@assets/ISSA+Logo+_+Vertical+_+for-white-background_1767172975495.webp";
import pnLogo from "@assets/limage-19764_1767172975495.webp";
import preScriptLogo from "@assets/Pre-Script_1200x1200_1767172975495.webp";
import nasmLogo from "@assets/nasm-logo_1767172987583.jpg";

// ============================================================================
// HERO SECTION
// ============================================================================
function HeroSection() {
  const scrollToOffers = () => {
    const element = document.getElementById("offers");
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden bg-background">
      {/* Subtle gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />

      <div className="relative z-10 mx-auto max-w-5xl px-4 py-20 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* Badge */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border/50 bg-background/80 px-4 py-2 text-sm backdrop-blur-sm">
            <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            <span className="text-muted-foreground">Powered by AI</span>
          </div>

          {/* Main headline */}
          <h1 className="mb-6 text-4xl font-black tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
            L'analyse corporelle 360
            <br />
            <span className="bg-gradient-to-r from-primary via-primary to-primary/70 bg-clip-text text-transparent">
              la plus complète au monde.
            </span>
          </h1>

          {/* Tagline */}
          <p className="mx-auto mb-10 max-w-2xl text-lg text-muted-foreground sm:text-xl">
            Unlocking human potential
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button size="lg" className="gap-2 px-8 text-base font-semibold" onClick={scrollToOffers}>
              Unlock Your Potential
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Link href="/deduction-coaching">
              <Button variant="outline" size="lg" className="gap-2 px-8 text-base">
                Montant 100% déduit
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// ============================================================================
// 5 OFFERS SECTION
// ============================================================================
function FiveOffersSection() {
  const offers = [
    {
      id: "discovery",
      name: "Discovery Scan",
      price: "Gratuit",
      subtitle: "Premier aperçu de ton potentiel",
      icon: Scan,
      color: "slate",
      href: "/offers/discovery-scan",
      features: [
        "Executive Summary personnalisé",
        "Analyse énergie & récupération",
        "Analyse métabolisme & nutrition",
        "Plan d'action 14 jours",
        "Rapport 5-7 pages PDF",
      ],
    },
    {
      id: "anabolic",
      name: "Anabolic Bioscan",
      price: "59€",
      subtitle: "Optimise tes hormones & métabolisme",
      icon: Activity,
      color: "emerald",
      href: "/offers/anabolic-bioscan",
      features: [
        "16 sections d'analyse",
        "Profil hormonal complet",
        "5 protocoles personnalisés",
        "Stack suppléments optimisé",
        "Plan 30-60-90 jours",
        "Rapport 25-30 pages",
      ],
    },
    {
      id: "ultimate",
      name: "Ultimate Scan",
      price: "79€",
      subtitle: "L'analyse la plus complète du marché",
      icon: Zap,
      color: "cyan",
      href: "/offers/ultimate-scan",
      features: [
        "18 sections ultra-détaillées",
        "Analyse photo posturale",
        "Analyse biomécanique complète",
        "Tout l'Anabolic Bioscan inclus",
        "Rapport 40-50 pages",
        "Support prioritaire",
      ],
      popular: true,
    },
    {
      id: "blood",
      name: "Blood Analysis",
      price: "99€",
      subtitle: "Décode ton bilan sanguin",
      icon: Droplet,
      color: "red",
      href: "/offers/blood-analysis",
      features: [
        "Upload PDF bilan sanguin",
        "Radars de risques visuels",
        "Interprétation experte",
        "Protocoles ciblés",
        "Suivi des marqueurs",
      ],
    },
    {
      id: "burnout",
      name: "Burnout Engine",
      price: "29€",
      subtitle: "Détecte avant la crise",
      icon: Brain,
      color: "purple",
      href: "/offers/burnout-detection",
      features: [
        "Score de risque burnout",
        "Analyse stress & fatigue",
        "Protocole 4 semaines",
        "Dashboard temps réel",
        "Alertes personnalisées",
      ],
    },
  ];

  return (
    <section id="offers" className="py-24 bg-muted/30">
      <div className="mx-auto max-w-7xl px-4">
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-3xl font-bold sm:text-4xl">5 offres. Un seul objectif.</h2>
          <p className="text-lg text-muted-foreground">Optimiser ta performance.</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
          {offers.map((offer, index) => {
            const Icon = offer.icon;
            return (
              <motion.div
                key={offer.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Link href={offer.href}>
                  <Card className={`group relative h-full cursor-pointer transition-all hover:shadow-lg hover:-translate-y-1 ${offer.popular ? 'ring-2 ring-primary' : ''}`}>
                    {offer.popular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <Badge className="bg-primary text-primary-foreground">Populaire</Badge>
                      </div>
                    )}
                    <CardContent className="p-6">
                      <div className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-${offer.color}-500/10`}>
                        <Icon className={`h-6 w-6 text-${offer.color}-500`} />
                      </div>
                      <h3 className="mb-1 text-lg font-bold">{offer.name}</h3>
                      <p className="mb-3 text-sm text-muted-foreground">{offer.subtitle}</p>
                      <div className="mb-4 text-2xl font-bold">{offer.price}</div>
                      <ul className="space-y-2">
                        {offer.features.map((feature, i) => (
                          <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Check className="h-4 w-4 text-primary" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                      <div className="mt-4 flex items-center gap-1 text-sm font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                        En savoir plus <ChevronRight className="h-4 w-4" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// CERTIFICATIONS SECTION
// ============================================================================
function CertificationsSection() {
  const certifications = [
    { logo: issaLogo, name: "ISSA", certs: ["CPT", "Nutritionist", "Bodybuilding Specialist"] },
    { logo: pnLogo, name: "Precision Nutrition", certs: ["Level 1 Certified", "Sleep, Stress & Recovery"] },
    { logo: preScriptLogo, name: "Pre-Script", certs: ["Movement Assessment", "Corrective Exercise"] },
    { logo: nasmLogo, name: "NASM", certs: ["CPT", "CES", "PES"] },
  ];

  return (
    <section className="border-y border-border/50 bg-background py-12 overflow-hidden">
      <div className="mx-auto max-w-7xl px-4">
        <div className="mb-8 text-center">
          <p className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
            10+ Certifications Internationales
          </p>
        </div>
        {/* Scrolling container */}
        <div className="relative">
          <div className="flex animate-scroll gap-16">
            {/* First set */}
            {certifications.map((cert, index) => (
              <div key={`first-${index}`} className="flex flex-col items-center gap-2 min-w-[200px]">
                <img
                  src={cert.logo}
                  alt={cert.name}
                  className="h-16 w-auto object-contain grayscale hover:grayscale-0 transition-all"
                />
                <div className="text-center">
                  <p className="text-xs font-semibold text-muted-foreground">{cert.name}</p>
                  <p className="text-[10px] text-muted-foreground/70">{cert.certs.join(" • ")}</p>
                </div>
              </div>
            ))}
            {/* Duplicate for seamless loop */}
            {certifications.map((cert, index) => (
              <div key={`second-${index}`} className="flex flex-col items-center gap-2 min-w-[200px]">
                <img
                  src={cert.logo}
                  alt={cert.name}
                  className="h-16 w-auto object-contain grayscale hover:grayscale-0 transition-all"
                />
                <div className="text-center">
                  <p className="text-xs font-semibold text-muted-foreground">{cert.name}</p>
                  <p className="text-[10px] text-muted-foreground/70">{cert.certs.join(" • ")}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// MEDIA LOGOS SECTION (Paru dans les médias)
// ============================================================================
function MediaLogosSection() {
  const mediaLogos = [
    { name: "Yahoo Finance", logo: "https://logo.clearbit.com/yahoo.com" },
    { name: "Bloomberg", logo: "https://logo.clearbit.com/bloomberg.com" },
    { name: "Business Insider", logo: "https://logo.clearbit.com/businessinsider.com" },
    { name: "Reuters", logo: "https://logo.clearbit.com/reuters.com" },
    { name: "Associated Press", logo: "https://logo.clearbit.com/ap.org" },
    { name: "MarketWatch", logo: "https://logo.clearbit.com/marketwatch.com" },
    { name: "Apple News", logo: "https://logo.clearbit.com/apple.com" },
    { name: "Google News", logo: "https://logo.clearbit.com/google.com" },
  ];

  return (
    <section className="py-8 bg-muted/30 overflow-hidden">
      <div className="mx-auto max-w-7xl px-4">
        <div className="mb-6 text-center">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Paru dans les médias
          </p>
        </div>
        {/* Scrolling container */}
        <div className="relative">
          <div className="flex animate-scroll-fast gap-12 items-center">
            {/* First set */}
            {mediaLogos.map((media, index) => (
              <Link key={`first-${index}`} href="/press">
                <img
                  src={media.logo}
                  alt={media.name}
                  className="h-8 w-auto object-contain grayscale opacity-50 hover:grayscale-0 hover:opacity-100 transition-all cursor-pointer"
                />
              </Link>
            ))}
            {/* Duplicate for seamless loop */}
            {mediaLogos.map((media, index) => (
              <Link key={`second-${index}`} href="/press">
                <img
                  src={media.logo}
                  alt={media.name}
                  className="h-8 w-auto object-contain grayscale opacity-50 hover:grayscale-0 hover:opacity-100 transition-all cursor-pointer"
                />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// SOCIAL PROOF BANNER (petit bloc en haut)
// ============================================================================
function SocialProofBanner() {
  const scrollToReviews = () => {
    const element = document.getElementById("reviews");
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section className="py-12 bg-muted/50">
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-2xl font-bold sm:text-3xl">
              <span className="text-muted-foreground">Rejoins </span>
              <span className="text-foreground">500+</span>
              <span className="text-muted-foreground"> membres qui ont </span>
              <span className="text-foreground">transformé leur vie</span>
            </h3>
            <div className="mt-2 flex gap-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star key={i} className="h-5 w-5 fill-amber-400 text-amber-400" />
              ))}
            </div>
          </div>
          <Button
            onClick={scrollToReviews}
            size="lg"
            variant="default"
            className="rounded-full px-6"
          >
            Voir les avis
          </Button>
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// SYNC WEARABLES SECTION
// ============================================================================
function WearablesSection() {
  return (
    <section className="py-24 bg-muted/30">
      <div className="mx-auto max-w-5xl px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="mb-4 text-3xl font-bold sm:text-4xl">Sync tes wearables</h2>
          <p className="mb-12 text-lg text-muted-foreground">
            Connecte tes données pour une analyse encore plus précise
          </p>

          <div className="flex flex-wrap items-center justify-center gap-8">
            {["Oura", "Whoop", "Garmin", "Apple Watch", "Fitbit"].map((brand) => (
              <div
                key={brand}
                className="flex h-16 w-32 items-center justify-center rounded-xl border border-border/50 bg-background px-4 py-3 text-lg font-semibold text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
              >
                {brand}
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// ============================================================================
// MEASURABLE RESULTS SECTION
// ============================================================================
function MeasurableResultsSection() {
  const results = [
    { metric: "+34%", label: "Énergie moyenne", icon: Zap },
    { metric: "-45min", label: "Temps d'endormissement", icon: Clock },
    { metric: "+28%", label: "Performance training", icon: TrendingUp },
    { metric: "2x", label: "Meilleure récupération", icon: Activity },
  ];

  return (
    <section className="py-24 bg-background">
      <div className="mx-auto max-w-7xl px-4">
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-3xl font-bold sm:text-4xl">Des résultats mesurables</h2>
          <p className="text-lg text-muted-foreground">Nos utilisateurs constatent des améliorations significatives</p>
        </div>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {results.map((result, index) => {
            const Icon = result.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="text-center"
              >
                <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                  <Icon className="h-8 w-8 text-primary" />
                </div>
                <div className="mb-2 text-4xl font-black text-foreground">{result.metric}</div>
                <div className="text-muted-foreground">{result.label}</div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// ULTIMATE SCAN SECTION (Analyse 360 nouvelle génération)
// ============================================================================
function UltimateScanSection() {
  const features = [
    "18 sections d'analyse ultra-détaillées",
    "Analyse photo posturale complète",
    "Analyse biomécanique & sangle profonde",
    "Tout l'Anabolic Bioscan inclus",
    "Rapport de 40-50 pages",
    "Protocoles biohacking avancés",
  ];

  return (
    <section className="py-24 bg-muted/30">
      <div className="mx-auto max-w-7xl px-4">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <Badge className="mb-4 bg-primary/10 text-primary">L'analyse complète</Badge>
            <h2 className="mb-4 text-3xl font-bold sm:text-4xl">
              Ultimate Scan
              <span className="block text-muted-foreground">Analyse 360 nouvelle génération</span>
            </h2>
            <p className="mb-8 text-lg text-muted-foreground">
              Métabolique + Hormonale + Biomécanique + Biohacking. L'analyse la plus complète pour comprendre ton corps et optimiser ta performance.
            </p>

            <ul className="mb-8 space-y-3">
              {features.map((feature, index) => (
                <li key={index} className="flex items-center gap-3">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10">
                    <Check className="h-4 w-4 text-primary" />
                  </div>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <div className="flex items-center gap-4">
              <Link href="/offers/ultimate-scan">
                <Button size="lg" className="gap-2">
                  Obtenir Ultimate Scan — 79€
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="relative"
          >
            {/* Mockup placeholder */}
            <div className="aspect-square rounded-3xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-8">
              <div className="h-full w-full rounded-2xl border border-primary/20 bg-background/50 backdrop-blur-sm" />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// TESTIMONIALS SECTION (Avis clients)
// ============================================================================
function TestimonialsSection() {
  const testimonials = [
    {
      name: "Thomas D.",
      role: "Entrepreneur",
      content: "Le rapport m'a ouvert les yeux sur mes déséquilibres hormonaux. En 3 mois, j'ai retrouvé mon énergie.",
      rating: 5,
    },
    {
      name: "Sophie M.",
      role: "Athlète CrossFit",
      content: "L'analyse biomécanique a identifié mes compensations. Mes performances ont explosé depuis.",
      rating: 5,
    },
    {
      name: "Marc L.",
      role: "Cadre dirigeant",
      content: "Le Burnout Engine m'a littéralement sauvé. J'étais au bord du gouffre sans le savoir.",
      rating: 5,
    },
  ];

  return (
    <section id="reviews" className="py-24 bg-muted/30">
      <div className="mx-auto max-w-7xl px-4">
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-3xl font-bold sm:text-4xl">Ce qu'en disent mes clients</h2>
          <p className="text-lg text-muted-foreground">Des résultats concrets, des vies transformées</p>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="h-full">
                <CardContent className="p-6">
                  <div className="mb-4 flex gap-1">
                    {Array.from({ length: testimonial.rating }).map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <Quote className="mb-4 h-8 w-8 text-muted-foreground/20" />
                  <p className="mb-6 text-foreground">{testimonial.content}</p>
                  <div>
                    <div className="font-semibold">{testimonial.name}</div>
                    <div className="text-sm text-muted-foreground">{testimonial.role}</div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// BLOOD ANALYSIS SECTION
// ============================================================================
function BloodAnalysisSection() {
  const features = [
    "Upload ton PDF en 30 secondes",
    "Ranges OPTIMAUX vs normaux du labo",
    "Radars de risques par catégorie",
    "Explication de chaque marqueur",
    "Protocoles suppléments personnalisés",
    "Sources scientifiques citées",
  ];

  return (
    <section className="py-24 bg-background">
      <div className="mx-auto max-w-7xl px-4">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="order-2 lg:order-1"
          >
            {/* Mockup placeholder */}
            <div className="aspect-square rounded-3xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-8">
              <div className="h-full w-full rounded-2xl border border-primary/20 bg-background/50 backdrop-blur-sm flex items-center justify-center">
                <Droplet className="h-24 w-24 text-primary/30" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="order-1 lg:order-2"
          >
            <Badge className="mb-4 bg-primary/10 text-primary">Analyse sanguine</Badge>
            <h2 className="mb-4 text-3xl font-bold sm:text-4xl">
              Blood Analysis
              <span className="block text-muted-foreground">Ton sang decode</span>
            </h2>
            <p className="mb-8 text-lg text-muted-foreground">
              Upload ton bilan sanguin et obtiens une analyse avec les ranges optimaux utilisés par les médecins de performance, pas les ranges "normaux" des labos.
            </p>

            <ul className="mb-8 space-y-3">
              {features.map((feature, index) => (
                <li key={index} className="flex items-center gap-3">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10">
                    <Check className="h-4 w-4 text-primary" />
                  </div>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <Link href="/offers/blood-analysis">
              <Button size="lg" className="gap-2">
                Analyser mon sang — 99€
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// BURNOUT ENGINE SECTION
// ============================================================================
function BurnoutEngineSection() {
  const symptoms = [
    "Fatigue chronique inexpliquée",
    "Difficultés de concentration",
    "Irritabilité croissante",
    "Troubles du sommeil",
    "Perte de motivation",
    "Douleurs physiques diffuses",
  ];

  return (
    <section className="py-24 bg-muted/30">
      <div className="mx-auto max-w-7xl px-4">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <Badge className="mb-4 bg-primary/10 text-primary">Prévention</Badge>
            <h2 className="mb-4 text-3xl font-bold sm:text-4xl">
              Burnout Engine
              <span className="block text-muted-foreground">Détecte avant la crise</span>
            </h2>
            <p className="mb-8 text-lg text-muted-foreground">
              Le burnout ne prévient pas. Notre questionnaire neuro-endocrinien détecte les signaux faibles avant qu'il ne soit trop tard.
            </p>

            <div className="mb-8">
              <p className="mb-4 font-semibold">Tu ressens ces symptômes ?</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {symptoms.map((symptom, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                    {symptom}
                  </div>
                ))}
              </div>
            </div>

            <Link href="/offers/burnout-detection">
              <Button size="lg" className="gap-2">
                Détecter mon risque — 29€
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="relative"
          >
            {/* Mockup placeholder */}
            <div className="aspect-square rounded-3xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-8">
              <div className="h-full w-full rounded-2xl border border-primary/20 bg-background/50 backdrop-blur-sm flex items-center justify-center">
                <Brain className="h-24 w-24 text-primary/30" />
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// ANABOLIC BIOSCAN SECTION
// ============================================================================
function AnabolicBioscanSection() {
  const features = [
    "16 sections d'analyse complète",
    "6 analyses profondes (hormones, métabolisme, sommeil...)",
    "5 protocoles fermés personnalisés",
    "Stack suppléments optimisé",
    "Plan 30-60-90 jours avec KPIs",
    "Rapport de 25-30 pages",
  ];

  return (
    <section className="py-24 bg-background">
      <div className="mx-auto max-w-7xl px-4">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="order-2 lg:order-1"
          >
            {/* Mockup placeholder */}
            <div className="aspect-square rounded-3xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-8">
              <div className="h-full w-full rounded-2xl border border-primary/20 bg-background/50 backdrop-blur-sm flex items-center justify-center">
                <Activity className="h-24 w-24 text-primary/30" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="order-1 lg:order-2"
          >
            <Badge className="mb-4 bg-primary/10 text-primary">Le plus populaire</Badge>
            <h2 className="mb-4 text-3xl font-bold sm:text-4xl">
              Anabolic Bioscan
              <span className="block text-muted-foreground">16 sections d'analyse complète</span>
            </h2>
            <p className="mb-8 text-lg text-muted-foreground">
              L'analyse qui a fait notre réputation. 6 analyses profondes, 5 protocoles personnalisés, stack suppléments, et plan 30-60-90 jours.
            </p>

            <ul className="mb-8 space-y-3">
              {features.map((feature, index) => (
                <li key={index} className="flex items-center gap-3">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10">
                    <Check className="h-4 w-4 text-primary" />
                  </div>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <Link href="/offers/anabolic-bioscan">
              <Button size="lg" className="gap-2">
                Obtenir Anabolic Bioscan — 59€
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// DISCOVERY SCAN SECTION (avec mockup dashboard)
// ============================================================================
function DiscoveryScanSection() {
  return (
    <section className="py-24 bg-muted/30">
      <div className="mx-auto max-w-7xl px-4">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <Badge className="mb-4">Gratuit</Badge>
            <h2 className="mb-4 text-3xl font-bold sm:text-4xl">
              Discovery Scan
              <span className="block text-muted-foreground">4 sections gratuites</span>
            </h2>
            <p className="mb-8 text-lg text-muted-foreground">
              Commence gratuitement et découvre ton profil en 4 sections. Rapport de 5-7 pages. Pas de carte bancaire requise.
            </p>

            <ul className="mb-8 space-y-3">
              {["Executive Summary personnalisé", "Analyse énergie & récupération", "Analyse métabolisme & nutrition", "Plan d'action 14 jours"].map((feature, index) => (
                <li key={index} className="flex items-center gap-3">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10">
                    <Check className="h-4 w-4 text-primary" />
                  </div>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <Link href="/offers/discovery-scan">
                <Button size="lg" className="gap-2">
                  Commencer gratuitement
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/report">
                <Button variant="outline" size="lg" className="gap-2">
                  <FileText className="h-4 w-4" />
                  Voir un rapport exemple
                </Button>
              </Link>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="relative"
          >
            {/* Dashboard mockup */}
            <div className="rounded-2xl border border-border bg-background p-4 shadow-2xl">
              <div className="mb-4 flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-red-500" />
                <div className="h-3 w-3 rounded-full bg-yellow-500" />
                <div className="h-3 w-3 rounded-full bg-green-500" />
              </div>
              <div className="space-y-4">
                <div className="h-8 w-1/3 rounded bg-muted" />
                <div className="grid grid-cols-3 gap-4">
                  <div className="h-24 rounded-lg bg-muted" />
                  <div className="h-24 rounded-lg bg-muted" />
                  <div className="h-24 rounded-lg bg-muted" />
                </div>
                <div className="h-40 rounded-lg bg-muted" />
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// FAQ SECTION
// ============================================================================
function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const faqs = [
    {
      question: "Comment fonctionne l'analyse ?",
      answer: "Tes reponses au questionnaire (180+ questions) sont analysees pour generer un rapport personnalise de 50+ pages. Des milliers de data points sont croises pour identifier tes desequilibres et te proposer des protocoles adaptes.",
    },
    {
      question: "Combien de temps prend le questionnaire ?",
      answer: "Entre 20 et 45 minutes selon l'offre choisie. Tu peux sauvegarder ta progression et reprendre plus tard.",
    },
    {
      question: "Le rapport remplace-t-il un médecin ?",
      answer: "Non. Nos rapports sont des outils d'optimisation et de prévention, pas des diagnostics médicaux. Pour toute question de santé, consulte un professionnel.",
    },
    {
      question: "Mes données sont-elles sécurisées ?",
      answer: "Absolument. Tes données sont chiffrées et stockées en Europe (RGPD). Nous ne vendons jamais tes données à des tiers.",
    },
    {
      question: "Puis-je obtenir un remboursement ?",
      answer: "Oui, tu as 14 jours pour demander un remboursement si le rapport ne te convient pas. Pas de questions.",
    },
  ];

  return (
    <section className="py-24 bg-background">
      <div className="mx-auto max-w-3xl px-4">
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-3xl font-bold sm:text-4xl">Questions fréquentes</h2>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="rounded-lg border border-border bg-card overflow-hidden"
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="flex w-full items-center justify-between p-4 text-left"
              >
                <span className="font-medium">{faq.question}</span>
                <ChevronDown
                  className={`h-5 w-5 text-muted-foreground transition-transform ${
                    openIndex === index ? "rotate-180" : ""
                  }`}
                />
              </button>
              <AnimatePresence>
                {openIndex === index && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="border-t border-border px-4 py-4 text-muted-foreground">
                      {faq.answer}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>

        <div className="mt-8 text-center">
          <Link href="/faq">
            <Button variant="outline" className="gap-2">
              Voir toutes les questions
              <ChevronRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// FINAL CTA SECTION
// ============================================================================
function FinalCTASection() {
  return (
    <section className="py-24 bg-gradient-to-t from-primary/10 via-primary/5 to-background">
      <div className="mx-auto max-w-4xl px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="mb-6 text-3xl font-bold sm:text-4xl md:text-5xl">
            Prêt à optimiser
            <br />
            <span className="text-primary">ta biologie ?</span>
          </h2>
          <p className="mx-auto mb-10 max-w-2xl text-lg text-muted-foreground">
            Rejoins les centaines d'utilisateurs qui ont déjà transformé leur performance grâce à APEX LABS.
          </p>

          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/offers/ultimate-scan">
              <Button size="lg" className="gap-2 px-8 text-base font-semibold">
                Commencer l'analyse — 79€
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/offers/discovery-scan">
              <Button variant="outline" size="lg" className="gap-2 px-8 text-base">
                Essayer gratuitement
              </Button>
            </Link>
          </div>

          <div className="mt-8 flex items-center justify-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              <span>Paiement sécurisé</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>Rapport en 24h</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span>500+ utilisateurs</span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// ============================================================================
// MAIN LANDING PAGE
// ============================================================================
export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <HeroSection />
        <FiveOffersSection />
        <CertificationsSection />
        <MediaLogosSection />
        <SocialProofBanner />
        <WearablesSection />
        <MeasurableResultsSection />
        <UltimateScanSection />
        <BloodAnalysisSection />
        <BurnoutEngineSection />
        <AnabolicBioscanSection />
        <DiscoveryScanSection />
        <TestimonialsSection />
        <FAQSection />
        <FinalCTASection />
      </main>
      <Footer />
      <FixedReviewsWidget />
    </div>
  );
}
