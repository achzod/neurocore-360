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
// SHADER BACKGROUND COMPONENT - ApexLabs Style
// ============================================================================
function ShaderBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Base gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-black via-neutral-950 to-black" />

      {/* Animated gradient orbs */}
      <motion.div
        className="absolute top-1/4 left-1/4 w-[800px] h-[800px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(252,221,0,0.08) 0%, transparent 70%)',
          filter: 'blur(60px)',
        }}
        animate={{
          x: [0, 100, 0],
          y: [0, -50, 0],
          scale: [1, 1.2, 1],
        }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(252,221,0,0.05) 0%, transparent 70%)',
          filter: 'blur(80px)',
        }}
        animate={{
          x: [0, -80, 0],
          y: [0, 80, 0],
          scale: [1.2, 1, 1.2],
        }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(252,221,0,0.3) 1px, transparent 1px),
            linear-gradient(90deg, rgba(252,221,0,0.3) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />

      {/* Noise texture */}
      <div className="absolute inset-0 opacity-[0.02] mix-blend-overlay bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJhIiB4PSIwIiB5PSIwIj48ZmVUdXJidWxlbmNlIGJhc2VGcmVxdWVuY3k9Ii43NSIgc3RpdGNoVGlsZXM9InN0aXRjaCIgdHlwZT0iZnJhY3RhbE5vaXNlIi8+PC9maWx0ZXI+PHJlY3Qgd2lkdGg9IjMwMCIgaGVpZ2h0PSIzMDAiIGZpbHRlcj0idXJsKCNhKSIgb3BhY2l0eT0iMC4xIi8+PC9zdmc+')]" />
    </div>
  );
}

// ============================================================================
// HERO SECTION - ApexLabs Style
// ============================================================================
function HeroSection() {
  const scrollToOffers = () => {
    const element = document.getElementById("offers");
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-black">
      {/* Shader Background */}
      <ShaderBackground />

      <div className="relative z-10 mx-auto max-w-6xl px-4 py-20 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          {/* Badge */}
          <motion.div
            className="mb-8 inline-flex items-center gap-2 rounded-full border border-gray-800 bg-gray-900/50 px-5 py-2.5 text-sm backdrop-blur-sm"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            <motion.span
              className="h-2 w-2 rounded-full bg-[#FCDD00]"
              animate={{ opacity: [1, 0.5, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <span className="text-gray-400">par Achzod</span>
          </motion.div>

          {/* Main headline - ApexLabs Style */}
          <motion.h1
            className="mb-8 text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tighter leading-[0.9]"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8 }}
          >
            <span className="text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">L'ANALYSE</span>
            <br />
            <span className="text-[#FCDD00] drop-shadow-[0_0_20px_rgba(252,221,0,0.4)]">CORPORELLE</span>
            <br />
            <span className="italic text-white font-light text-4xl sm:text-5xl md:text-6xl">la plus complète.</span>
          </motion.h1>

          {/* Tagline */}
          <motion.p
            className="mx-auto mb-12 max-w-xl text-xl text-gray-500"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.8 }}
          >
            Unlocking human potential
          </motion.p>

          {/* CTA Buttons - Liquid Glass Style */}
          <motion.div
            className="flex flex-col items-center justify-center gap-4 sm:flex-row"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.6 }}
          >
            <button
              onClick={scrollToOffers}
              className="group relative h-14 gap-3 px-10 text-base font-bold uppercase tracking-wider bg-[#FCDD00] text-black rounded-full transition-all duration-500 overflow-hidden shadow-[0_0_40px_rgba(252,221,0,0.3)] hover:shadow-[0_0_60px_rgba(252,221,0,0.5)] hover:scale-[1.02] flex items-center justify-center"
            >
              <span className="relative z-10 flex items-center gap-2">
                Unlock Your Potential
                <ArrowRight className="h-5 w-5" />
              </span>
              {/* Shimmer effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700" />
            </button>
            <Link href="/deduction-coaching">
              <button className="group h-14 gap-2 px-10 text-base font-medium border-2 border-white/20 text-white rounded-full transition-all duration-300 backdrop-blur-sm hover:border-[#FCDD00] hover:text-[#FCDD00] hover:shadow-[0_0_30px_rgba(252,221,0,0.2)] flex items-center justify-center">
                Montant 100% déduit
              </button>
            </Link>
          </motion.div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-10 left-1/2 -translate-x-1/2"
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <ChevronDown className="h-6 w-6 text-gray-600" />
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
      subtitle: "Diagnostic complet, sans recommandations",
      icon: Scan,
      color: "slate",
      href: "/offers/discovery-scan",
      features: [
        "Détection de tes blocages",
        "Patterns problématiques identifiés",
        "Déséquilibres révélés",
        "Score global sur 100",
        "Rapport diagnostic 5-7 pages",
      ],
    },
    {
      id: "anabolic",
      name: "Anabolic Bioscan",
      price: "59€",
      subtitle: "Diagnostic + Protocoles d'action",
      icon: Activity,
      color: "[#FCDD00]",
      href: "/offers/anabolic-bioscan",
      features: [
        "16 sections d'analyse",
        "Protocole Matin Anti-Cortisol",
        "Protocole Soir Sommeil",
        "Protocole Digestion 14 Jours",
        "Stack Supplements Optimise",
        "Plan 30-60-90 Jours",
      ],
    },
    {
      id: "ultimate",
      name: "Ultimate Scan",
      price: "79€",
      subtitle: "Diagnostic + Protocoles + Analyse photo",
      icon: Zap,
      color: "[#FCDD00]",
      href: "/offers/ultimate-scan",
      features: [
        "Tout l'Anabolic Bioscan",
        "Analyse visuelle et posturale",
        "Analyse biomecanique complete",
        "18 sections d'analyse",
        "Rapport 40-50 pages",
      ],
      popular: true,
    },
    {
      id: "blood",
      name: "Blood Analysis",
      price: "99€",
      subtitle: "Ton bilan sanguin décodé + protocoles",
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
      price: "39€",
      subtitle: "Détection + Protocole récupération",
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
    <section id="offers" className="py-32 bg-black">
      <div className="mx-auto max-w-7xl px-4">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mb-20 text-center"
        >
          <span className="text-[#FCDD00] text-sm font-bold tracking-widest uppercase mb-4 block">Nos Protocoles</span>
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-black text-white mb-4">CHOISIS TON <span className="text-[#FCDD00]">SCAN</span></h2>
          <p className="text-lg text-gray-500">Du diagnostic à l'optimisation complète.</p>
        </motion.div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          {offers.map((offer, index) => {
            const Icon = offer.icon;
            const isPopular = offer.popular;
            return (
              <motion.div
                key={offer.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Link href={offer.href}>
                  <div className={`group relative h-full cursor-pointer rounded-2xl border transition-all duration-300 hover:border-[#FCDD00]/50 ${isPopular ? 'border-[#FCDD00] bg-[#FCDD00]/5' : 'border-gray-800 bg-gray-900/50 hover:bg-gray-900'}`}>
                    {isPopular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <span className="bg-[#FCDD00] text-black text-xs font-semibold px-3 py-1 rounded-full">Populaire</span>
                      </div>
                    )}
                    <div className="p-6">
                      <div className="mb-4">
                        <Icon className={`h-6 w-6 ${isPopular ? 'text-[#FCDD00]' : 'text-gray-500'}`} />
                      </div>
                      <h3 className="text-lg font-semibold text-white mb-1">{offer.name}</h3>
                      <p className="text-xs text-gray-500 mb-4">{offer.subtitle}</p>
                      <div className={`text-3xl font-bold mb-6 ${isPopular ? 'text-[#FCDD00]' : 'text-white'}`}>
                        {offer.price}
                      </div>
                      <ul className="space-y-2">
                        {offer.features.slice(0, 4).map((feature, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-gray-400">
                            <Check className="h-4 w-4 text-[#FCDD00] mt-0.5 shrink-0" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                      <div className="mt-6 flex items-center gap-1 text-sm text-gray-500 group-hover:text-[#FCDD00] transition-colors">
                        <span>En savoir plus</span>
                        <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </div>
                    </div>
                  </div>
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
// CERTIFICATIONS SECTION - Premium Cards
// ============================================================================
function CertificationsSection() {
  const certifications = [
    {
      logo: issaLogo,
      name: "ISSA",
      fullName: "International Sports Sciences Association",
      certs: ["CPT", "SNS", "SFC", "SBC"],
      country: "USA"
    },
    {
      logo: nasmLogo,
      name: "NASM",
      fullName: "National Academy of Sports Medicine",
      certs: ["CPT", "CNC", "PBC", "PES", "CSNC"],
      country: "USA"
    },
    {
      logo: pnLogo,
      name: "Precision Nutrition",
      fullName: "PN1 Certified Coach",
      certs: ["PN1"],
      country: "CAN/USA/UK"
    },
    {
      logo: preScriptLogo,
      name: "Pre-Script",
      fullName: "Mobility & Stability",
      certs: ["Level 1"],
      country: "CAN/USA"
    },
  ];

  const mediaLogos = ["Yahoo Finance", "FOX 40", "BENZINGA", "StreetInsider", "MarketWatch"];

  return (
    <section className="bg-black py-20">
      <div className="mx-auto max-w-7xl px-4">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mb-16 text-center"
        >
          <p className="text-xs font-medium uppercase tracking-[0.3em] text-gray-500">
            11 Certifications Internationales
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-24">
          {certifications.map((cert, index) => (
            <motion.div
              key={cert.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="relative rounded-2xl border border-gray-800 bg-gray-950/50 p-6 hover:border-gray-700 transition-all duration-300"
            >
              <div className="h-16 mb-6 flex items-center justify-center">
                <img src={cert.logo} alt={cert.name} className="h-12 w-auto object-contain" />
              </div>
              <h3 className="text-xl font-bold text-white text-center mb-2">{cert.name}</h3>
              <p className="text-sm text-gray-500 text-center mb-6">{cert.fullName}</p>
              <div className="flex flex-wrap justify-center gap-2 mb-4">
                {cert.certs.map((c) => (
                  <span key={c} className="text-xs font-medium text-[#FCDD00] border border-[#FCDD00]/30 bg-[#FCDD00]/10 px-3 py-1 rounded-full">
                    {c}
                  </span>
                ))}
              </div>
              <p className="text-xs text-gray-600 text-center">{cert.country}</p>
            </motion.div>
          ))}
        </div>

        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-center">
          <p className="text-xs font-medium uppercase tracking-[0.3em] text-gray-600 mb-8">Vu dans les médias</p>
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12">
            {mediaLogos.map((media) => (
              <span key={media} className="text-sm text-gray-500 hover:text-gray-400 transition-colors">{media}</span>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}


// ============================================================================
// SOCIAL PROOF BANNER - Ultrahuman Style
// ============================================================================
function SocialProofBanner() {
  const scrollToReviews = () => {
    const element = document.getElementById("reviews");
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section className="py-16 bg-black border-y border-gray-900">
      <div className="mx-auto max-w-7xl px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex flex-col items-center gap-6 sm:flex-row sm:justify-between"
        >
          <div className="text-center sm:text-left">
            <h3 className="text-3xl sm:text-4xl font-bold">
              <span className="text-gray-500">Rejoins </span>
              <span className="text-white">500+</span>
              <span className="text-gray-500"> membres</span>
            </h3>
            <div className="mt-3 flex gap-1 justify-center sm:justify-start">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star key={i} className="h-5 w-5 fill-[#FCDD00] text-[#FCDD00]" />
              ))}
              <span className="ml-2 text-sm text-gray-500">4.9/5</span>
            </div>
          </div>
          <button
            onClick={scrollToReviews}
            className="h-12 px-8 font-medium border-2 border-white/20 text-white rounded-full transition-all duration-300 backdrop-blur-sm hover:border-[#FCDD00] hover:text-[#FCDD00] hover:shadow-[0_0_30px_rgba(252,221,0,0.2)]"
          >
            Voir les avis
          </button>
        </motion.div>
      </div>
    </section>
  );
}

// ============================================================================
// SYNC WEARABLES SECTION - Clean with Logos
// ============================================================================
function WearablesSection() {
  const wearables = [
    { name: "Apple Health", logo: "https://logo.clearbit.com/apple.com", available: true },
    { name: "Garmin", logo: "https://logo.clearbit.com/garmin.com", available: true },
    { name: "Fitbit", logo: "https://logo.clearbit.com/fitbit.com", available: true },
    { name: "Oura", logo: "https://logo.clearbit.com/ouraring.com", available: true },
    { name: "Google Fit", logo: "https://logo.clearbit.com/google.com", available: true },
    { name: "Samsung Health", logo: "https://logo.clearbit.com/samsung.com", available: true },
    { name: "Withings", logo: "https://logo.clearbit.com/withings.com", available: true },
    { name: "WHOOP", logo: "https://logo.clearbit.com/whoop.com", available: false, comingSoon: true },
    { name: "Ultrahuman", logo: "https://logo.clearbit.com/ultrahuman.com", available: true },
  ];

  return (
    <section className="py-20 bg-black">
      <div className="mx-auto max-w-5xl px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <p className="text-xs uppercase tracking-[0.3em] text-[#FCDD00] mb-4">Intégrations</p>
          <h2 className="mb-4 text-3xl sm:text-4xl md:text-5xl font-black text-white">Sync tes wearables</h2>
          <p className="mb-12 text-base text-gray-500">Connecte tes données pour une analyse plus précise</p>

          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12">
            {wearables.map((brand, index) => (
              <motion.div
                key={brand.name}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
                className={`relative flex flex-col items-center ${!brand.available ? "opacity-40" : "hover:opacity-80"} transition-opacity duration-300`}
              >
                {brand.comingSoon && <span className="absolute -top-3 text-[9px] text-gray-500">Bientôt</span>}
                <img src={brand.logo} alt={brand.name} className="h-8 w-8 object-contain mb-2 rounded grayscale hover:grayscale-0 transition-all duration-300" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                <span className="text-xs text-gray-500">{brand.name}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// ============================================================================
// MEASURABLE RESULTS SECTION - Ultrahuman Style
// ============================================================================
function MeasurableResultsSection() {
  const results = [
    { metric: "+34%", label: "Énergie moyenne", icon: Zap },
    { metric: "-45min", label: "Endormissement", icon: Clock },
    { metric: "+28%", label: "Performance", icon: TrendingUp },
    { metric: "2x", label: "Récupération", icon: Activity },
  ];

  return (
    <section className="relative py-32 bg-black overflow-hidden">
      {/* Subtle gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-gray-950 via-black to-black" />

      <div className="relative mx-auto max-w-7xl px-4">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mb-20 text-center"
        >
          <p className="text-xs uppercase tracking-[0.2em] text-[#FCDD00] mb-4">Résultats</p>
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-black text-white">Des améliorations mesurables</h2>
        </motion.div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {results.map((result, index) => {
            const Icon = result.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="group relative"
              >
                <div className="relative p-8 rounded-3xl border border-gray-800 bg-gray-900/30 transition-all duration-300 hover:border-[#FCDD00]/30 hover:bg-gray-900/50">
                  {/* Icon */}
                  <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FCDD00]/10 border border-[#FCDD00]/20">
                    <Icon className="h-7 w-7 text-[#FCDD00]" />
                  </div>

                  {/* Metric with animated counter effect */}
                  <motion.div
                    className="mb-2 text-5xl font-bold text-white"
                    initial={{ opacity: 0, scale: 0.5 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.2 + index * 0.1, type: "spring", stiffness: 100 }}
                  >
                    {result.metric}
                  </motion.div>

                  <div className="text-gray-500 text-sm uppercase tracking-wider">{result.label}</div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// ULTIMATE SCAN SECTION (Style Ultrahuman Premium - Redesign complet)
// ============================================================================
function UltimateScanSection() {
  return (
    <section className="relative min-h-screen overflow-hidden bg-black py-20 lg:py-0 lg:flex lg:items-center">
      {/* Animated background gradients */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-b from-black via-[#2a2000]/10 to-black" />
        <motion.div
          className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#FCDD00]/10 rounded-full blur-[128px]"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#FCDD00]/10 rounded-full blur-[128px]"
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 w-full">
        <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-center">
          {/* Left - Typography */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="text-center lg:text-left order-2 lg:order-1"
          >
            <motion.h2
              className="text-6xl sm:text-7xl lg:text-8xl xl:text-9xl font-bold italic text-[#FCDD00] leading-[0.9] tracking-tight mb-12"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              Tout en
              <br />
              <span className="text-white">un scan.</span>
            </motion.h2>

            <motion.p
              className="text-xl lg:text-2xl text-gray-400 mb-12 max-w-lg mx-auto lg:mx-0 leading-relaxed"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              Analyse visuelle. Biomécanique. Métabolique. Hormonale.
              <span className="block mt-2 text-white font-medium">18 sections. 40-50 pages.</span>
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.6 }}
            >
              <Link href="/offers/ultimate-scan">
                <button className="group relative h-16 px-10 text-lg font-bold uppercase tracking-wider bg-[#FCDD00] text-black rounded-full overflow-hidden transition-all duration-500 shadow-[0_0_40px_rgba(252,221,0,0.3)] hover:shadow-[0_0_60px_rgba(252,221,0,0.5)] hover:scale-[1.02] flex items-center justify-center">
                  <span className="relative z-10 flex items-center gap-3">
                    Ultimate Scan — 79€
                    <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700" />
                </button>
              </Link>
            </motion.div>
          </motion.div>

          {/* Right - Premium Phone Mockup */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8, rotateY: -15 }}
            whileInView={{ opacity: 1, scale: 1, rotateY: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1, delay: 0.3, ease: "easeOut" }}
            className="relative flex justify-center order-1 lg:order-2"
          >
            {/* Outer glow */}
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.div
                className="w-[400px] h-[400px] bg-[#FCDD00]/20 rounded-full blur-[100px]"
                animate={{ scale: [1, 1.1, 1], opacity: [0.4, 0.6, 0.4] }}
                transition={{ duration: 4, repeat: Infinity }}
              />
            </div>

            {/* Phone */}
            <div className="relative w-[300px] sm:w-[340px] perspective-1000">
              <motion.div
                className="relative"
                whileHover={{ scale: 1.02, rotateY: 5 }}
                transition={{ duration: 0.3 }}
              >
                {/* Phone frame */}
                <div className="relative bg-gradient-to-b from-gray-800 via-gray-900 to-black rounded-[3rem] p-2 shadow-[0_0_60px_rgba(0,0,0,0.8)] border border-gray-700/50">
                  {/* Notch */}
                  <div className="absolute top-4 left-1/2 -translate-x-1/2 w-24 h-6 bg-black rounded-full z-20" />

                  {/* Screen */}
                  <div className="bg-black rounded-[2.5rem] overflow-hidden">
                    {/* Status bar */}
                    <div className="flex justify-between items-center px-8 pt-3 pb-2">
                      <span className="text-white text-xs font-medium">9:41</span>
                      <div className="flex gap-1">
                        <div className="w-4 h-2 bg-white rounded-sm" />
                      </div>
                    </div>

                    {/* App content */}
                    <div className="px-4 pb-6">
                      {/* Header */}
                      <div className="text-center py-6">
                        <p className="text-[10px] text-gray-500 tracking-[0.2em] uppercase mb-2">Ultimate Scan</p>
                        <motion.div
                          className="relative inline-block"
                          initial={{ scale: 0 }}
                          whileInView={{ scale: 1 }}
                          viewport={{ once: true }}
                          transition={{ delay: 0.8, type: "spring", stiffness: 100 }}
                        >
                          <span className="text-6xl font-bold text-white">87</span>
                          <motion.div
                            className="absolute -right-2 -top-1 w-3 h-3 bg-[#FCDD00] rounded-full"
                            animate={{ scale: [1, 1.3, 1], opacity: [1, 0.7, 1] }}
                            transition={{ duration: 2, repeat: Infinity }}
                          />
                        </motion.div>
                        <p className="text-[#FCDD00] text-sm mt-1 font-medium">Score Global</p>
                      </div>

                      {/* Metrics */}
                      <div className="space-y-3">
                        {[
                          { label: "ANALYSE POSTURALE", score: 92, status: "Optimal", color: "[#FCDD00]" },
                          { label: "BIOMÉCANIQUE", score: 68, status: "À améliorer", color: "amber" },
                          { label: "MÉTABOLISME", score: 91, status: "Excellent", color: "[#FCDD00]" },
                        ].map((metric, i) => (
                          <motion.div
                            key={metric.label}
                            className="bg-gradient-to-r from-gray-900/90 to-gray-900/50 rounded-2xl p-4 border border-gray-800/50"
                            initial={{ opacity: 0, x: 20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 1 + i * 0.15 }}
                          >
                            <div className="flex justify-between items-center mb-3">
                              <span className="text-[9px] text-gray-500 tracking-[0.15em]">{metric.label}</span>
                              <span className={`text-[10px] font-medium ${metric.color === '[#FCDD00]' ? 'text-[#FCDD00]' : 'text-amber-400'}`}>
                                {metric.status}
                              </span>
                            </div>
                            <div className="flex items-end justify-between">
                              <span className="text-3xl font-bold text-white">{metric.score}</span>
                              <div className="flex-1 mx-4">
                                <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                                  <motion.div
                                    className={`h-full rounded-full ${metric.color === '[#FCDD00]' ? 'bg-[#FCDD00]' : 'bg-amber-500'}`}
                                    initial={{ width: 0 }}
                                    whileInView={{ width: `${metric.score}%` }}
                                    viewport={{ once: true }}
                                    transition={{ delay: 1.2 + i * 0.15, duration: 0.8, ease: "easeOut" }}
                                  />
                                </div>
                              </div>
                              <span className="text-xs text-gray-600">/100</span>
                            </div>
                          </motion.div>
                        ))}
                      </div>

                      {/* Bottom nav */}
                      <div className="flex justify-around mt-6 pt-4 border-t border-gray-800/50">
                        {[
                          { icon: "◎", label: "Scan", active: true },
                          { icon: "◇", label: "Protocoles", active: false },
                          { icon: "▢", label: "Suivi", active: false },
                          { icon: "◈", label: "Profile", active: false },
                        ].map((item) => (
                          <div key={item.label} className="flex flex-col items-center gap-1">
                            <span className={`text-lg ${item.active ? 'text-[#FCDD00]' : 'text-gray-700'}`}>{item.icon}</span>
                            <span className={`text-[8px] uppercase tracking-wider ${item.active ? 'text-[#FCDD00]' : 'text-gray-700'}`}>{item.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Reflection */}
                <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 w-3/4 h-12 bg-gradient-to-b from-gray-900/20 to-transparent blur-xl rounded-full" />
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// TESTIMONIALS SECTION - Ultrahuman Style
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
    <section id="reviews" className="py-32 bg-black">
      <div className="mx-auto max-w-7xl px-4">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mb-20 text-center"
        >
          <p className="text-xs uppercase tracking-[0.2em] text-[#FCDD00] mb-4">Témoignages</p>
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-black text-white">Ce qu'en disent mes clients</h2>
        </motion.div>

        <div className="grid gap-6 md:grid-cols-3">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.15 }}
              className="group"
            >
              <div className="h-full p-8 rounded-3xl border border-gray-800 bg-gray-900/30 transition-all duration-300 hover:border-[#FCDD00]/30 hover:bg-gray-900/50">
                {/* Rating */}
                <div className="mb-6 flex gap-1">
                  {Array.from({ length: testimonial.rating }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-[#FCDD00] text-[#FCDD00]" />
                  ))}
                </div>

                {/* Quote */}
                <Quote className="mb-4 h-6 w-6 text-gray-700" />
                <p className="mb-8 text-gray-300 leading-relaxed">{testimonial.content}</p>

                {/* Author */}
                <div className="pt-6 border-t border-gray-800">
                  <div className="font-semibold text-white">{testimonial.name}</div>
                  <div className="text-sm text-gray-500">{testimonial.role}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// BLOOD ANALYSIS SECTION - Ultrahuman Style
// ============================================================================
function BloodAnalysisSection() {
  const markers = [
    { label: "TESTOSTÉRONE", value: 687, unit: "ng/dL", status: "optimal", range: "600-900" },
    { label: "CORTISOL", value: 12.3, unit: "μg/dL", status: "watch", range: "8-15" },
    { label: "VITAMINE D", value: 58, unit: "ng/mL", status: "optimal", range: "50-80" },
  ];

  return (
    <section className="relative py-32 bg-black overflow-hidden">
      {/* Background glow */}
      <motion.div
        className="absolute top-1/2 right-0 w-[500px] h-[500px] bg-[#FCDD00]/5 rounded-full blur-[150px]"
        animate={{ opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 6, repeat: Infinity }}
      />

      <div className="relative mx-auto max-w-7xl px-4">
        <div className="grid gap-16 lg:grid-cols-2 lg:items-center">
          {/* Phone mockup */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="order-2 lg:order-1 flex justify-center"
          >
            <div className="relative w-[280px]">
              {/* Glow */}
              <div className="absolute inset-0 bg-[#FCDD00]/20 rounded-full blur-[80px]" />

              {/* Phone */}
              <div className="relative bg-gradient-to-b from-gray-800 to-gray-900 rounded-[2.5rem] p-2 border border-gray-700/50">
                <div className="bg-black rounded-[2rem] overflow-hidden p-4">
                  {/* Header */}
                  <div className="text-center mb-6">
                    <Droplet className="h-8 w-8 text-[#FCDD00] mx-auto mb-2" />
                    <p className="text-[10px] uppercase tracking-[0.2em] text-gray-600">Blood Analysis</p>
                    <p className="text-2xl font-bold text-white mt-1">12 marqueurs</p>
                  </div>

                  {/* Markers */}
                  <div className="space-y-3">
                    {markers.map((marker, i) => (
                      <motion.div
                        key={marker.label}
                        initial={{ opacity: 0, x: 20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.5 + i * 0.1 }}
                        className="bg-gray-900/80 rounded-xl p-3 border border-gray-800"
                      >
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-[9px] text-gray-500 tracking-wider">{marker.label}</span>
                          <span className={`text-[9px] ${marker.status === 'optimal' ? 'text-[#FCDD00]' : 'text-gray-400'}`}>
                            {marker.status === 'optimal' ? 'OPTIMAL' : 'À SURVEILLER'}
                          </span>
                        </div>
                        <div className="flex items-baseline gap-1">
                          <span className="text-xl font-bold text-white">{marker.value}</span>
                          <span className="text-xs text-gray-600">{marker.unit}</span>
                        </div>
                        <div className="mt-2 h-1 bg-gray-800 rounded-full overflow-hidden">
                          <motion.div
                            className={`h-full rounded-full ${marker.status === 'optimal' ? 'bg-[#FCDD00]' : 'bg-gray-500'}`}
                            initial={{ width: 0 }}
                            whileInView={{ width: `${(marker.value / 100) * 10}%` }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.7 + i * 0.1, duration: 0.6 }}
                          />
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Content */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="order-1 lg:order-2"
          >
            <p className="text-xs uppercase tracking-[0.2em] text-[#FCDD00] mb-4">Analyse sanguine</p>
            <h2 className="mb-4 text-4xl sm:text-5xl font-bold">
              <span className="text-white">Blood</span>
              <span className="italic text-[#FCDD00]"> Analysis</span>
            </h2>
            <p className="mb-8 text-lg text-gray-400 leading-relaxed">
              Upload ton bilan sanguin. Ranges optimaux de performance, pas les ranges "normaux" des labos.
            </p>

            <ul className="mb-10 space-y-4">
              {["Upload PDF en 30 sec", "Ranges optimaux", "Protocoles personnalisés"].map((feature, index) => (
                <motion.li
                  key={index}
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.3 + index * 0.1 }}
                  className="flex items-center gap-3"
                >
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#FCDD00]/10 border border-[#FCDD00]/30">
                    <Check className="h-3.5 w-3.5 text-[#FCDD00]" />
                  </div>
                  <span className="text-gray-300">{feature}</span>
                </motion.li>
              ))}
            </ul>

            <Link href="/offers/blood-analysis">
              <button className="group relative h-14 px-8 font-bold uppercase tracking-wider bg-[#FCDD00] text-black rounded-full overflow-hidden transition-all duration-500 shadow-[0_0_40px_rgba(252,221,0,0.3)] hover:shadow-[0_0_60px_rgba(252,221,0,0.5)] hover:scale-[1.02] flex items-center justify-center">
                <span className="relative z-10 flex items-center gap-2">
                  Blood Analysis — 99€
                  <ArrowRight className="h-5 w-5" />
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700" />
              </button>
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// BURNOUT ENGINE SECTION - Ultrahuman Style
// ============================================================================
function BurnoutEngineSection() {
  const riskFactors = [
    { label: "Stress chronique", level: 78 },
    { label: "Fatigue", level: 65 },
    { label: "Concentration", level: 42 },
  ];

  return (
    <section className="relative py-32 bg-gray-950 overflow-hidden">
      {/* Gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-black via-gray-950 to-black" />

      <div className="relative mx-auto max-w-7xl px-4">
        <div className="grid gap-16 lg:grid-cols-2 lg:items-center">
          {/* Content */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <p className="text-xs uppercase tracking-[0.2em] text-[#FCDD00] mb-4">Prévention</p>
            <h2 className="mb-4 text-4xl sm:text-5xl font-bold">
              <span className="text-white">Burnout</span>
              <span className="italic text-[#FCDD00]"> Engine</span>
            </h2>
            <p className="mb-8 text-lg text-gray-400 leading-relaxed">
              Le burnout ne prévient pas. Détecte les signaux faibles avant qu'il ne soit trop tard.
            </p>

            <div className="mb-10 grid grid-cols-2 gap-3">
              {["Fatigue chronique", "Concentration", "Irritabilité", "Troubles sommeil"].map((symptom, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2 + index * 0.1 }}
                  className="flex items-center gap-2 text-sm text-gray-400"
                >
                  <div className="h-1.5 w-1.5 rounded-full bg-[#FCDD00]" />
                  {symptom}
                </motion.div>
              ))}
            </div>

            <Link href="/offers/burnout-detection">
              <button className="group relative h-14 px-8 font-bold uppercase tracking-wider bg-[#FCDD00] text-black rounded-full overflow-hidden transition-all duration-500 shadow-[0_0_40px_rgba(252,221,0,0.3)] hover:shadow-[0_0_60px_rgba(252,221,0,0.5)] hover:scale-[1.02] flex items-center justify-center">
                <span className="relative z-10 flex items-center gap-2">
                  Détecter mon risque — 39€
                  <ArrowRight className="h-5 w-5" />
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700" />
              </button>
            </Link>
          </motion.div>

          {/* Dashboard mockup */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="flex justify-center"
          >
            <div className="relative w-full max-w-sm">
              {/* Glow */}
              <motion.div
                className="absolute inset-0 bg-[#FCDD00]/10 rounded-full blur-[100px]"
                animate={{ opacity: [0.3, 0.5, 0.3] }}
                transition={{ duration: 5, repeat: Infinity }}
              />

              {/* Card */}
              <div className="relative bg-gray-900/80 rounded-3xl border border-gray-800 p-8 backdrop-blur-sm">
                {/* Header */}
                <div className="text-center mb-8">
                  <Brain className="h-10 w-10 text-[#FCDD00] mx-auto mb-3" />
                  <p className="text-[10px] uppercase tracking-[0.2em] text-gray-600">Score Burnout</p>
                  <motion.p
                    className="text-6xl font-bold text-white mt-2"
                    initial={{ scale: 0 }}
                    whileInView={{ scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.5, type: "spring" }}
                  >
                    32
                  </motion.p>
                  <p className="text-sm text-[#FCDD00] mt-1">Risque modéré</p>
                </div>

                {/* Risk bars */}
                <div className="space-y-4">
                  {riskFactors.map((factor, i) => (
                    <motion.div
                      key={factor.label}
                      initial={{ opacity: 0 }}
                      whileInView={{ opacity: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.6 + i * 0.1 }}
                    >
                      <div className="flex justify-between text-xs mb-2">
                        <span className="text-gray-500">{factor.label}</span>
                        <span className="text-white">{factor.level}%</span>
                      </div>
                      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                        <motion.div
                          className={`h-full rounded-full ${factor.level > 70 ? 'bg-[#FCDD00]' : factor.level > 50 ? 'bg-gray-400' : 'bg-gray-600'}`}
                          initial={{ width: 0 }}
                          whileInView={{ width: `${factor.level}%` }}
                          viewport={{ once: true }}
                          transition={{ delay: 0.8 + i * 0.1, duration: 0.6 }}
                        />
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// ANABOLIC BIOSCAN SECTION - Ultrahuman Style
// ============================================================================
function AnabolicBioscanSection() {
  const sections = [
    { name: "Hormones", score: 78 },
    { name: "Métabolisme", score: 85 },
    { name: "Sommeil", score: 62 },
    { name: "Énergie", score: 91 },
  ];

  return (
    <section className="relative py-32 bg-black overflow-hidden">
      {/* Background glow */}
      <motion.div
        className="absolute top-1/2 left-0 w-[500px] h-[500px] bg-[#FCDD00]/5 rounded-full blur-[150px]"
        animate={{ opacity: [0.2, 0.4, 0.2] }}
        transition={{ duration: 7, repeat: Infinity }}
      />

      <div className="relative mx-auto max-w-7xl px-4">
        <div className="grid gap-16 lg:grid-cols-2 lg:items-center">
          {/* Phone mockup */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="order-2 lg:order-1 flex justify-center"
          >
            <div className="relative w-[280px]">
              {/* Glow */}
              <div className="absolute inset-0 bg-[#FCDD00]/15 rounded-full blur-[80px]" />

              {/* Phone */}
              <div className="relative bg-gradient-to-b from-gray-800 to-gray-900 rounded-[2.5rem] p-2 border border-gray-700/50">
                <div className="bg-black rounded-[2rem] overflow-hidden p-4">
                  {/* Header */}
                  <div className="text-center mb-6">
                    <Activity className="h-8 w-8 text-[#FCDD00] mx-auto mb-2" />
                    <p className="text-[10px] uppercase tracking-[0.2em] text-gray-600">Anabolic Bioscan</p>
                    <p className="text-2xl font-bold text-white mt-1">16 sections</p>
                  </div>

                  {/* Sections */}
                  <div className="space-y-3">
                    {sections.map((section, i) => (
                      <motion.div
                        key={section.name}
                        initial={{ opacity: 0, x: 20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.5 + i * 0.1 }}
                        className="bg-gray-900/80 rounded-xl p-3 border border-gray-800"
                      >
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-400">{section.name}</span>
                          <span className={`text-lg font-bold ${section.score > 80 ? 'text-[#FCDD00]' : section.score > 60 ? 'text-white' : 'text-gray-400'}`}>
                            {section.score}
                          </span>
                        </div>
                        <div className="mt-2 h-1 bg-gray-800 rounded-full overflow-hidden">
                          <motion.div
                            className={`h-full rounded-full ${section.score > 80 ? 'bg-[#FCDD00]' : section.score > 60 ? 'bg-gray-400' : 'bg-gray-600'}`}
                            initial={{ width: 0 }}
                            whileInView={{ width: `${section.score}%` }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.7 + i * 0.1, duration: 0.6 }}
                          />
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Content */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="order-1 lg:order-2"
          >
            <div className="inline-flex items-center gap-2 mb-4 px-3 py-1 rounded-full border border-[#FCDD00]/30 bg-[#FCDD00]/10">
              <span className="text-xs uppercase tracking-wider text-[#FCDD00]">Le plus populaire</span>
            </div>
            <h2 className="mb-4 text-4xl sm:text-5xl font-bold">
              <span className="text-white">Anabolic</span>
              <span className="italic text-[#FCDD00]"> Bioscan</span>
            </h2>
            <p className="mb-8 text-lg text-gray-400 leading-relaxed">
              16 sections. 6 analyses profondes. 5 protocoles personnalisés. Plan 30-60-90 jours.
            </p>

            <ul className="mb-10 space-y-4">
              {["16 sections d'analyse", "Protocoles personnalisés", "Stack suppléments", "Plan 30-60-90 jours"].map((feature, index) => (
                <motion.li
                  key={index}
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.3 + index * 0.1 }}
                  className="flex items-center gap-3"
                >
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#FCDD00]/10 border border-[#FCDD00]/30">
                    <Check className="h-3.5 w-3.5 text-[#FCDD00]" />
                  </div>
                  <span className="text-gray-300">{feature}</span>
                </motion.li>
              ))}
            </ul>

            <Link href="/offers/anabolic-bioscan">
              <button className="group relative h-14 px-8 font-bold uppercase tracking-wider bg-[#FCDD00] text-black rounded-full overflow-hidden transition-all duration-500 shadow-[0_0_40px_rgba(252,221,0,0.3)] hover:shadow-[0_0_60px_rgba(252,221,0,0.5)] hover:scale-[1.02] flex items-center justify-center">
                <span className="relative z-10 flex items-center gap-2">
                  Anabolic Bioscan — 59€
                  <ArrowRight className="h-5 w-5" />
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700" />
              </button>
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// DISCOVERY SCAN SECTION - Ultrahuman Style
// ============================================================================
function DiscoveryScanSection() {
  return (
    <section className="relative py-32 bg-gray-950 overflow-hidden">
      {/* Gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-black via-gray-950 to-black" />

      <div className="relative mx-auto max-w-7xl px-4">
        <div className="grid gap-16 lg:grid-cols-2 lg:items-center">
          {/* Content */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <div className="inline-flex items-center gap-2 mb-4 px-3 py-1 rounded-full border border-gray-700 bg-gray-900/50">
              <span className="text-xs uppercase tracking-wider text-gray-400">Gratuit</span>
            </div>
            <h2 className="mb-4 text-4xl sm:text-5xl font-bold">
              <span className="text-white">Discovery</span>
              <span className="italic text-[#FCDD00]"> Scan</span>
            </h2>
            <p className="mb-8 text-lg text-gray-400 leading-relaxed">
              Commence gratuitement. 4 sections. Rapport 5-7 pages. Pas de carte bancaire.
            </p>

            <ul className="mb-10 space-y-4">
              {["Executive Summary", "Analyse énergie", "Analyse métabolisme", "Plan 14 jours"].map((feature, index) => (
                <motion.li
                  key={index}
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2 + index * 0.1 }}
                  className="flex items-center gap-3"
                >
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#FCDD00]/10 border border-[#FCDD00]/30">
                    <Check className="h-3.5 w-3.5 text-[#FCDD00]" />
                  </div>
                  <span className="text-gray-300">{feature}</span>
                </motion.li>
              ))}
            </ul>

            <div className="flex flex-col gap-4 sm:flex-row">
              <Link href="/offers/discovery-scan">
                <button className="group relative h-14 px-8 font-bold uppercase tracking-wider bg-[#FCDD00] text-black rounded-full overflow-hidden transition-all duration-500 shadow-[0_0_40px_rgba(252,221,0,0.3)] hover:shadow-[0_0_60px_rgba(252,221,0,0.5)] hover:scale-[1.02] flex items-center justify-center">
                  <span className="relative z-10 flex items-center gap-2">
                    Commencer gratuitement
                    <ArrowRight className="h-5 w-5" />
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700" />
                </button>
              </Link>
              <Link href="/report">
                <button className="h-14 px-8 font-medium border-2 border-white/20 text-white rounded-full transition-all duration-300 backdrop-blur-sm hover:border-[#FCDD00] hover:text-[#FCDD00] hover:shadow-[0_0_30px_rgba(252,221,0,0.2)] flex items-center justify-center gap-2">
                  <FileText className="h-5 w-5" />
                  Exemple rapport
                </button>
              </Link>
            </div>
          </motion.div>

          {/* Dashboard mockup */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="flex justify-center"
          >
            <div className="relative w-full max-w-md">
              {/* Glow */}
              <motion.div
                className="absolute inset-0 bg-[#FCDD00]/10 rounded-full blur-[100px]"
                animate={{ opacity: [0.2, 0.4, 0.2] }}
                transition={{ duration: 6, repeat: Infinity }}
              />

              {/* Dashboard */}
              <div className="relative bg-gray-900/80 rounded-3xl border border-gray-800 p-6 backdrop-blur-sm">
                {/* Window controls */}
                <div className="mb-6 flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-gray-700" />
                  <div className="h-3 w-3 rounded-full bg-gray-700" />
                  <div className="h-3 w-3 rounded-full bg-gray-700" />
                </div>

                {/* Content */}
                <div className="space-y-4">
                  <motion.div
                    className="h-8 w-1/2 rounded-lg bg-gray-800"
                    initial={{ width: 0 }}
                    whileInView={{ width: "50%" }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.5, duration: 0.6 }}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    {[72, 85].map((score, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, scale: 0.9 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.6 + i * 0.1 }}
                        className="p-4 rounded-2xl bg-gray-800/50 border border-gray-700/50"
                      >
                        <div className="text-3xl font-bold text-white mb-1">{score}</div>
                        <div className="text-xs text-gray-500">Score</div>
                      </motion.div>
                    ))}
                  </div>

                  <motion.div
                    className="h-32 rounded-2xl bg-gray-800/50 border border-gray-700/50 p-4"
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.8 }}
                  >
                    <div className="h-full flex items-end gap-2">
                      {[40, 65, 45, 80, 55, 70, 60].map((h, i) => (
                        <motion.div
                          key={i}
                          className="flex-1 bg-[#FCDD00]/30 rounded-t"
                          initial={{ height: 0 }}
                          whileInView={{ height: `${h}%` }}
                          viewport={{ once: true }}
                          transition={{ delay: 1 + i * 0.05, duration: 0.4 }}
                        />
                      ))}
                    </div>
                  </motion.div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// FAQ SECTION - Comprehensive
// ============================================================================
function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const faqs = [
    {
      question: "Comment fonctionne l'analyse exactement ?",
      answer: "Je t'envoie un questionnaire ultra-détaillé de 180+ questions qui couvre tous les aspects de ta santé : sommeil, énergie, digestion, stress, hormones, nutrition, activité physique, historique médical. Chaque réponse génère des points de données que je croise pour identifier tes déséquilibres cachés. Le rapport final fait 30 à 50+ pages selon l'offre, avec des protocoles personnalisés que j'ai développés sur des années de pratique avec mes clients en coaching.",
    },
    {
      question: "Combien de temps prend le questionnaire ?",
      answer: "Compte entre 20 et 45 minutes selon l'offre choisie. Le Discovery Scan (gratuit) prend environ 15-20 minutes. L'Anabolic Bioscan et Ultimate Scan demandent 35-45 minutes car ils vont plus en profondeur. Tu peux sauvegarder ta progression à tout moment et reprendre plus tard - pas besoin de tout faire d'une traite.",
    },
    {
      question: "Le rapport remplace-t-il un médecin ?",
      answer: "Non, et ce n'est pas le but. Mon rapport est un outil d'optimisation et de prévention basé sur mes 11 certifications internationales et mon expérience terrain. Je t'aide à identifier ce qui pourrait être amélioré AVANT que ça devienne un problème médical. Pour toute pathologie ou symptôme inquiétant, consulte toujours un professionnel de santé. Mon travail vient en complément, pas en remplacement.",
    },
    {
      question: "Qui es-tu exactement, Achzod ?",
      answer: "Je suis coach certifié avec 11 certifications internationales (NASM, ISSA, Precision Nutrition, Pre-Script...). J'ai accompagné des centaines de clients en coaching individuel pendant des années. NEUROCORE 360 est l'aboutissement de toute cette expérience : je voulais rendre accessible à tous l'analyse approfondie que je faisais en one-to-one. Chaque protocole, chaque recommandation vient de mon expérience terrain, pas d'un template générique.",
    },
    {
      question: "Mes données sont-elles sécurisées ?",
      answer: "Absolument. Tes données sont chiffrées (SSL/TLS) et stockées sur des serveurs européens conformes au RGPD. Je ne vends JAMAIS tes données à des tiers - c'est une ligne rouge pour moi. Tu peux demander la suppression complète de tes données à tout moment. Ta vie privée n'est pas négociable.",
    },
    {
      question: "En combien de temps je reçois mon rapport ?",
      answer: "Le rapport est généré automatiquement dès que tu termines le questionnaire - tu le reçois en quelques minutes par email. Pour les offres premium (Ultimate Scan, Blood Analysis), je révise personnellement chaque rapport avant envoi, donc compte 24-48h maximum.",
    },
    {
      question: "Comment se passe le Blood Analysis ?",
      answer: "Tu uploades simplement le PDF de ton bilan sanguin (celui de ton labo). Je l'analyse avec des ranges optimaux de performance - pas les ranges 'normaux' des labos qui sont souvent trop larges. Tu obtiens une interprétation détaillée de chaque marqueur avec des protocoles ciblés pour corriger les déséquilibres identifiés.",
    },
    {
      question: "Le montant est-il déductible de mon coaching ?",
      answer: "Oui ! Si tu prends un coaching avec moi par la suite, le montant de ton rapport est intégralement déduit. Par exemple, si tu prends l'Ultimate Scan à 79€ puis un coaching, les 79€ sont déduits du prix du coaching. C'est ma façon de récompenser ceux qui veulent aller plus loin.",
    },
    {
      question: "Puis-je obtenir un remboursement ?",
      answer: "Oui, tu as 14 jours pour demander un remboursement si le rapport ne te convient pas. Pas de questions, pas de justification à fournir. Je préfère avoir des clients satisfaits que de garder quelqu'un qui n'est pas content. Envoie-moi simplement un email.",
    },
    {
      question: "Je peux synchroniser mes wearables ?",
      answer: "Oui ! Tu peux connecter Oura, Garmin, Fitbit, Apple Health, Google Fit, Samsung Health, Withings et Ultrahuman. Les données de tes wearables enrichissent l'analyse et permettent un suivi dans le temps. WHOOP arrive bientôt. Plus tu connectes de sources, plus l'analyse est précise.",
    },
  ];

  return (
    <section className="py-32 bg-gray-950">
      <div className="mx-auto max-w-3xl px-4">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mb-16 text-center"
        >
          <p className="text-xs uppercase tracking-[0.2em] text-[#FCDD00] mb-4">FAQ</p>
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-black text-white">Questions fréquentes</h2>
        </motion.div>

        <div className="space-y-3">
          {faqs.map((faq, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.05 }}
              className="rounded-2xl border border-gray-800 bg-gray-900/50 overflow-hidden"
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="flex w-full items-center justify-between p-5 text-left hover:bg-gray-900/80 transition-colors"
              >
                <span className="font-medium text-white">{faq.question}</span>
                <ChevronDown
                  className={`h-5 w-5 text-gray-500 transition-transform duration-200 ${
                    openIndex === index ? "rotate-180 text-[#FCDD00]" : ""
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
                    <div className="border-t border-gray-800 px-5 py-5 text-gray-400">
                      {faq.answer}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mt-10 text-center"
        >
          <Link href="/faq">
            <button className="gap-2 px-6 py-3 font-medium border-2 border-white/20 text-white rounded-full transition-all duration-300 backdrop-blur-sm hover:border-[#FCDD00] hover:text-[#FCDD00] hover:shadow-[0_0_30px_rgba(252,221,0,0.2)] flex items-center justify-center">
              Voir toutes les questions
              <ChevronRight className="h-4 w-4 ml-2" />
            </button>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}

// ============================================================================
// FINAL CTA SECTION - Ultrahuman Style
// ============================================================================
function FinalCTASection() {
  return (
    <section className="relative py-32 bg-black overflow-hidden">
      {/* Animated gradient */}
      <div className="absolute inset-0">
        <motion.div
          className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[#FCDD00]/10 rounded-full blur-[150px]"
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <div className="relative mx-auto max-w-4xl px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <h2 className="mb-6 text-4xl sm:text-5xl md:text-6xl font-black">
            <span className="text-white">PRÊT À</span>
            <br />
            <span className="text-[#FCDD00]">OPTIMISER</span>
            <br />
            <span className="italic text-white font-light text-3xl sm:text-4xl">ta biologie ?</span>
          </h2>
          <p className="mx-auto mb-12 max-w-xl text-lg text-gray-500">
            Rejoins 500+ utilisateurs qui ont transformé leur performance.
          </p>

          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/offers/ultimate-scan">
              <button className="group relative h-16 gap-3 px-10 text-lg font-bold uppercase tracking-wider bg-[#FCDD00] text-black rounded-full transition-all duration-500 overflow-hidden shadow-[0_0_40px_rgba(252,221,0,0.3)] hover:shadow-[0_0_60px_rgba(252,221,0,0.5)] hover:scale-[1.02] flex items-center justify-center">
                <span className="relative z-10 flex items-center gap-2">
                  Commencer — 79€
                  <ArrowRight className="h-5 w-5" />
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700" />
              </button>
            </Link>
            <Link href="/offers/discovery-scan">
              <button className="h-16 gap-2 px-10 text-lg font-medium border-2 border-white/20 text-white rounded-full transition-all duration-300 backdrop-blur-sm hover:border-[#FCDD00] hover:text-[#FCDD00] hover:shadow-[0_0_30px_rgba(252,221,0,0.2)] flex items-center justify-center">
                Essayer gratuitement
              </button>
            </Link>
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="mt-12 flex flex-wrap items-center justify-center gap-8 text-sm text-gray-600"
          >
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-[#FCDD00]/50" />
              <span>Paiement sécurisé</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-[#FCDD00]/50" />
              <span>Rapport 24-48h</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-[#FCDD00]/50" />
              <span>500+ utilisateurs</span>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

// ============================================================================
// MAIN LANDING PAGE - Full dark theme
// ============================================================================
export default function Landing() {
  return (
    <div className="min-h-screen bg-black">
      <Header />
      <main>
        <HeroSection />
        <FiveOffersSection />
        <CertificationsSection />
        <SocialProofBanner />
        <WearablesSection />
        <MeasurableResultsSection />
        <UltimateScanSection />
        <TestimonialsSection />
        <BloodAnalysisSection />
        <BurnoutEngineSection />
        <AnabolicBioscanSection />
        <DiscoveryScanSection />
        <FAQSection />
        <FinalCTASection />
      </main>
      <Footer />
      <FixedReviewsWidget />
    </div>
  );
}
