import { useState, useRef, useEffect } from "react";
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
      <div className="absolute inset-0 bg-gradient-to-br from-black via-[#050505] to-black" />

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
// DNA HELIX COMPONENT (for Blood Analysis)
// ============================================================================
function DNAHelix() {
  const numPairs = 12;
  const pairs = Array.from({ length: numPairs }, (_, i) => i);

  return (
    <div className="relative w-full h-full bg-gradient-to-br from-blue-950 via-black to-blue-900 flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(59,130,246,0.15)_0%,_transparent_70%)]" />
      {[...Array(20)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 bg-blue-400/60 rounded-full"
          style={{ left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%` }}
          animate={{ y: [0, -20, 0], opacity: [0.3, 0.8, 0.3] }}
          transition={{ duration: 3 + Math.random() * 2, repeat: Infinity, delay: Math.random() * 2 }}
        />
      ))}
      <div className="relative h-[280px] w-[120px]">
        <motion.div
          className="absolute inset-0"
          animate={{ rotateY: 360 }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          style={{ transformStyle: 'preserve-3d', perspective: 800 }}
        >
          {pairs.map((i) => {
            const yPos = (i / numPairs) * 100;
            const phase = (i / numPairs) * Math.PI * 2;
            return (
              <motion.div
                key={i}
                className="absolute w-full"
                style={{ top: `${yPos}%` }}
                animate={{ rotateY: [phase * (180 / Math.PI), phase * (180 / Math.PI) + 360] }}
                transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
              >
                <motion.div
                  className="absolute left-0 w-4 h-4 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 shadow-[0_0_15px_rgba(34,211,238,0.8)]"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.1 }}
                />
                <div className="absolute left-4 right-4 top-1.5 h-1 bg-gradient-to-r from-cyan-400 via-purple-500 to-blue-400 opacity-60 rounded-full" />
                <motion.div
                  className="absolute right-0 w-4 h-4 rounded-full bg-gradient-to-br from-blue-400 to-purple-600 shadow-[0_0_15px_rgba(147,51,234,0.8)]"
                  animate={{ scale: [1.2, 1, 1.2] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.1 }}
                />
              </motion.div>
            );
          })}
        </motion.div>
      </div>
      <div className="absolute bottom-4 left-4 text-xs font-mono text-blue-400/80">
        <div>ANALYSE ADN</div>
        <motion.div className="text-cyan-400" animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 2, repeat: Infinity }}>
          50+ BIOMARQUEURS
        </motion.div>
      </div>
      <motion.div
        className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent"
        animate={{ top: ['0%', '100%', '0%'] }}
        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
      />
    </div>
  );
}

// ============================================================================
// OFFERS DATA (ApexLabs Style)
// ============================================================================
interface Offer {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  features: string[];
  imageUrl: string;
  reverse: boolean;
  useCustomVisual?: boolean;
  price: string;
  href: string;
}

const LANDING_OFFERS: Offer[] = [
  {
    id: 'discovery-scan',
    title: "DISCOVERY SCAN",
    subtitle: "L'Analyse Initiale",
    description: "Le point d'entrée essentiel vers l'optimisation. Une cartographie complète de votre composition corporelle par bio-impédancemétrie médicale et scan 3D.",
    features: ["Composition Corporelle 3D", "Analyse Métabolique de Base", "Rapport Digital Immédiat", "Bilan d'Hydratation"],
    imageUrl: "https://cdn.speedsize.com/3f711f28-1488-44dc-b013-5e43284ac4b0/https://public-web-assets.uh-static.com/web_v2/womens-health/whitepapers/hr_hrv.png",
    reverse: false,
    price: "Gratuit",
    href: "/offers/discovery-scan"
  },
  {
    id: 'anabolic-bioscan',
    title: "ANABOLIC BIOSCAN",
    subtitle: "Performance Musculaire",
    description: "Conçu pour l'hypertrophie et la performance athlétique. Analyse précise de la densité musculaire et du profil hormonal anabolique.",
    features: ["Densité Musculaire", "Asymétries & Posture", "Potentiel de Récupération", "Optimisation de la Force"],
    imageUrl: "https://cdn.speedsize.com/3f711f28-1488-44dc-b013-5e43284ac4b0/https://public-web-assets.uh-static.com/web_v2/womens-health/whitepapers/bmi_stress_activity.png",
    reverse: true,
    price: "59€",
    href: "/offers/anabolic-bioscan"
  },
  {
    id: 'blood-analysis',
    title: "BLOOD ANALYSIS",
    subtitle: "La Vérité Biologique",
    description: "Plongez au cœur de votre biochimie. Une analyse sanguine exhaustive ciblant plus de 50 biomarqueurs clés de performance.",
    features: ["Panel Hormonal Complet", "Marqueurs Inflammatoires", "Carences Micronutritionnelles", "Fonction Hépatique & Rénale"],
    imageUrl: "",
    reverse: false,
    useCustomVisual: true,
    price: "99€",
    href: "/offers/blood-analysis"
  },
  {
    id: 'ultimate-scan',
    title: "ULTIMATE SCAN",
    subtitle: "L'Omniscience Corporelle",
    description: "L'agrégation de toutes nos technologies. Discovery + Anabolic + Blood + Analyse génétique. Une vue à 360° de votre physiologie.",
    features: ["Intégration Totale des Données", "Plan d'Action Sur-Mesure", "Analyse Génétique Croisée", "Suivi Prioritaire"],
    imageUrl: "https://cdn.speedsize.com/3f711f28-1488-44dc-b013-5e43284ac4b0/https://public-web-assets.uh-static.com/web_v2/womens-health/whitepapers/cno_pro.png",
    reverse: true,
    price: "79€",
    href: "/offers/ultimate-scan"
  },
  {
    id: 'burnout-detection',
    title: "BURNOUT DETECTION",
    subtitle: "Préservation du Système Nerveux",
    description: "Mesure objective de la charge allostatique et de la variabilité cardiaque (VFC). Détectez les signes physiologiques de l'épuisement.",
    features: ["Analyse Système Nerveux (VFC)", "Mesure du Cortisol", "Qualité du Sommeil", "Stratégies de Résilience"],
    imageUrl: "https://cdn.speedsize.com/3f711f28-1488-44dc-b013-5e43284ac4b0/https://public-web-assets.uh-static.com/web_v2/womens-health/whitepapers/sleep_ramadan.png",
    reverse: false,
    price: "39€",
    href: "/offers/burnout-detection"
  }
];

// ============================================================================
// OFFER CARD COMPONENT (ApexLabs Style)
// ============================================================================
function OfferCard({ offer }: { offer: Offer }) {
  const { title, subtitle, description, features, imageUrl, reverse, useCustomVisual, price, href } = offer;
  const cardRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setIsVisible(true); },
      { threshold: 0.2 }
    );
    if (cardRef.current) observer.observe(cardRef.current);
    return () => { if (cardRef.current) observer.unobserve(cardRef.current); };
  }, []);

  return (
    <div
      ref={cardRef}
      className={`py-24 border-b border-white/5 last:border-0 group transition-all duration-1000 ease-out ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-20'}`}
    >
      <div className={`flex flex-col ${reverse ? 'lg:flex-row-reverse' : 'lg:flex-row'} items-center gap-12 lg:gap-24`}>
        {/* Image Side with HUD/Tech Overlay */}
        <div className="w-full lg:w-1/2 relative">
          <div className="relative aspect-[4/3] overflow-hidden rounded bg-[#1a1a1a] border border-[#FCDD00]/20 group-hover:border-[#FCDD00]/50 shadow-[0_0_50px_rgba(252,221,0,0.15)] group-hover:shadow-[0_0_80px_rgba(252,221,0,0.25)] transition-all duration-500">
            {/* Scan Line Animation */}
            <div className="absolute inset-0 z-30 pointer-events-none opacity-20 group-hover:opacity-100 transition-opacity duration-700">
              <motion.div
                className="absolute left-0 w-full h-[10%] bg-gradient-to-b from-transparent via-[#FCDD00]/20 to-transparent"
                animate={{ top: ['0%', '90%', '0%'] }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              />
            </div>
            {/* HUD Corners */}
            <div className="absolute top-4 left-4 w-8 h-8 border-l-2 border-t-2 border-white/30 z-20 rounded-tl-lg group-hover:border-white/80 transition-colors" />
            <div className="absolute top-4 right-4 w-8 h-8 border-r-2 border-t-2 border-white/30 z-20 rounded-tr-lg group-hover:border-white/80 transition-colors" />
            <div className="absolute bottom-4 left-4 w-8 h-8 border-l-2 border-b-2 border-white/30 z-20 rounded-bl-lg group-hover:border-white/80 transition-colors" />
            <div className="absolute bottom-4 right-4 w-8 h-8 border-r-2 border-b-2 border-white/30 z-20 rounded-br-lg group-hover:border-white/80 transition-colors" />
            {/* Floating Label */}
            <div className="absolute top-8 left-8 z-20 backdrop-blur-md px-3 py-1 border rounded text-[10px] tracking-widest uppercase font-bold shadow-lg bg-[#000000]/60 border-[#FCDD00]/30 text-[#FCDD00]">
              SYSTEM ONLINE
            </div>
            {/* Overlay Gradient */}
            {!useCustomVisual && (
              <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80 z-10" />
            )}
            {/* Main Image or DNA Helix */}
            {useCustomVisual ? (
              <DNAHelix />
            ) : (
              <img src={imageUrl} alt={title} className="w-full h-full object-cover transition-all duration-700 transform opacity-70 group-hover:opacity-100 grayscale group-hover:grayscale-0 group-hover:scale-110 group-hover:rotate-1" />
            )}
          </div>
          {/* Glowing orb */}
          <div className="absolute -inset-4 bg-[#FCDD00]/20 blur-[60px] rounded-full -z-10 opacity-20 group-hover:opacity-50 transition-opacity duration-700 animate-pulse" />
        </div>

        {/* Content Side */}
        <div className="w-full lg:w-1/2 space-y-8">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.2em] mb-4 flex items-center gap-3 text-[#FCDD00]">
              <span className="w-2 h-2 rounded-full animate-pulse bg-[#FCDD00] shadow-[0_0_10px_#FCDD00]"></span>
              {subtitle}
            </div>
            <h3 className="text-4xl md:text-6xl font-black text-white mb-6 tracking-tight">
              {title}
            </h3>
            <p className="text-[#9CA3AF] text-lg leading-relaxed border-l border-white/10 pl-6 group-hover:border-white/40 transition-colors duration-500">
              {description}
            </p>
          </div>
          {/* Features - Chevron + JetBrains Mono */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-4">
            {features.map((feature, idx) => (
              <div key={idx} className="flex items-center gap-3 py-2">
                <span className="text-[#FCDD00] font-mono font-bold">&gt;</span>
                <span className="font-mono text-xs uppercase tracking-wide text-[#D1D5DB]">{feature}</span>
              </div>
            ))}
          </div>
          {/* Price + CTA */}
          <div className="pt-6 flex flex-col sm:flex-row items-start gap-4">
            <div className="inline-block bg-[#000000] border border-[#333333] px-6 py-4">
              <div className="font-mono text-[9px] uppercase tracking-widest text-[#6B7280] mb-1">Investissement</div>
              <div className="text-2xl md:text-3xl font-black text-white tracking-tight">{price}</div>
            </div>
            <Link href={href}>
              <button className="px-6 py-4 bg-[#000000] border border-white/30 text-white font-mono text-xs uppercase tracking-widest hover:border-[#FCDD00] hover:text-[#FCDD00] transition-colors flex items-center gap-2">
                En savoir plus
                <span>&gt;</span>
              </button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// OFFERS SECTION (ApexLabs Style)
// ============================================================================
function OffersSection() {
  return (
    <section id="detailed-offers" className="bg-[#000000] py-24 relative">
      <div className="container mx-auto px-6">
        <div className="mb-20 text-center max-w-3xl mx-auto">
          <span className="font-mono text-[10px] text-[#FCDD00] uppercase tracking-[0.2em] mb-4 block">Nos Protocoles</span>
          <h2 className="text-4xl md:text-6xl lg:text-7xl font-black text-white uppercase tracking-tighter mb-2">NOS</h2>
          <h2 className="text-4xl md:text-6xl lg:text-7xl font-black uppercase tracking-tighter mb-6" style={{ WebkitTextStroke: '1px rgba(255,255,255,0.2)', color: 'transparent' }}>OFFRES</h2>
          <p className="text-[#9CA3AF] font-light">Des solutions adaptées à chaque niveau d'exigence. Choisis ta voie vers l'excellence.</p>
        </div>
        <div className="flex flex-col">
          {LANDING_OFFERS.map((offer) => (
            <OfferCard key={offer.id} offer={offer} />
          ))}
        </div>
      </div>
    </section>
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
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#000000]">
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
            className="mb-8 inline-flex items-center gap-2 rounded-full border border-[#333333] bg-white/[0.03] px-5 py-2.5 text-sm backdrop-blur-sm"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            <motion.span
              className="h-2 w-2 rounded-full bg-[#FCDD00]"
              animate={{ opacity: [1, 0.5, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <span className="text-[#9CA3AF]">par Achzod</span>
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
            className="mx-auto mb-12 max-w-xl text-xl text-[#9CA3AF]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.8 }}
          >
            Unlocking human potential
          </motion.p>

          {/* CTA Buttons - APEXLABS Design System */}
          <motion.div
            className="flex flex-col items-center justify-center gap-4 sm:flex-row"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.6 }}
          >
            <button
              onClick={scrollToOffers}
              className="group relative h-14 gap-3 px-10 text-xs font-black uppercase tracking-wide bg-[#FCDD00] text-black rounded-sm transition-all duration-500 overflow-hidden shadow-[0_0_40px_rgba(252,221,0,0.3)] hover:shadow-[0_0_60px_rgba(252,221,0,0.5)] hover:bg-[#FCDD00]/90 flex items-center justify-center"
            >
              <span className="relative z-10 flex items-center gap-2">
                Commencer
                <ArrowRight className="h-5 w-5" />
              </span>
            </button>
            <Link href="/deduction-coaching">
              <button className="group h-14 gap-2 px-10 text-xs font-bold uppercase tracking-wide border border-white/30 text-white rounded-sm transition-all duration-300 hover:border-[#FCDD00] hover:text-[#FCDD00] flex items-center justify-center">
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
          <ChevronDown className="h-6 w-6 text-[#6B7280]" />
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
    <section id="offers" className="py-32 bg-[#000000]">
      <div className="mx-auto max-w-7xl px-4">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mb-20 text-center"
        >
          <span className="font-mono text-[10px] text-[#FCDD00] uppercase tracking-[0.2em] mb-4 block">Nos Protocoles</span>
          <h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-white uppercase tracking-tighter mb-2">CHOISIS</h2>
          <h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black uppercase tracking-tighter mb-6" style={{ WebkitTextStroke: '1px rgba(255,255,255,0.2)', color: 'transparent' }}>TON SCAN</h2>
          <p className="text-[#9CA3AF] font-light">Du diagnostic à l'optimisation complète.</p>
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
                  <div className={`group relative h-full cursor-pointer rounded-sm border transition-all duration-300 hover:border-[#FCDD00]/50 ${isPopular ? 'border-[#FCDD00] bg-[#FCDD00]/5' : 'border-[#333333] bg-white/[0.03] hover:bg-white/[0.05]'}`}>
                    {isPopular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <span className="bg-[#FCDD00] text-black text-xs font-semibold px-3 py-1 rounded-full">Populaire</span>
                      </div>
                    )}
                    <div className="p-6">
                      <div className="mb-4">
                        <Icon className={`h-6 w-6 ${isPopular ? 'text-[#FCDD00]' : 'text-[#9CA3AF]'}`} />
                      </div>
                      <h3 className="text-lg font-semibold text-white mb-1">{offer.name}</h3>
                      <p className="text-xs text-[#9CA3AF] mb-4">{offer.subtitle}</p>
                      <div className={`text-3xl font-bold mb-6 ${isPopular ? 'text-[#FCDD00]' : 'text-white'}`}>
                        {offer.price}
                      </div>
                      <ul className="space-y-2">
                        {offer.features.slice(0, 4).map((feature, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-[#9CA3AF]">
                            <Check className="h-4 w-4 text-[#FCDD00] mt-0.5 shrink-0" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                      <div className="mt-6 flex items-center gap-1 text-sm text-[#9CA3AF] group-hover:text-[#FCDD00] transition-colors">
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
    <section className="bg-[#000000] py-20">
      <div className="mx-auto max-w-7xl px-4">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mb-16 text-center"
        >
          <p className="text-xs font-medium uppercase tracking-[0.3em] text-[#9CA3AF]">
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
              className="relative rounded-sm border border-[#333333] bg-[#050505]/50 p-6 hover:border-gray-700 transition-all duration-300"
            >
              <div className="h-16 mb-6 flex items-center justify-center">
                <img src={cert.logo} alt={cert.name} className="h-12 w-auto object-contain" />
              </div>
              <h3 className="text-xl font-bold text-white text-center mb-2">{cert.name}</h3>
              <p className="text-sm text-[#9CA3AF] text-center mb-6">{cert.fullName}</p>
              <div className="flex flex-wrap justify-center gap-2 mb-4">
                {cert.certs.map((c) => (
                  <span key={c} className="text-xs font-medium text-[#FCDD00] border border-[#FCDD00]/30 bg-[#FCDD00]/10 px-3 py-1 rounded-full">
                    {c}
                  </span>
                ))}
              </div>
              <p className="text-xs text-[#6B7280] text-center">{cert.country}</p>
            </motion.div>
          ))}
        </div>

        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-center">
          <p className="text-xs font-medium uppercase tracking-[0.3em] text-[#6B7280] mb-8">Vu dans les médias</p>
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12">
            {mediaLogos.map((media) => (
              <span key={media} className="text-sm text-[#9CA3AF] hover:text-[#9CA3AF] transition-colors">{media}</span>
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
    <section className="py-16 bg-[#000000] border-y border-[#333333]">
      <div className="mx-auto max-w-7xl px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex flex-col items-center gap-6 sm:flex-row sm:justify-between"
        >
          <div className="text-center sm:text-left">
            <h3 className="text-3xl sm:text-4xl font-bold">
              <span className="text-[#9CA3AF]">Rejoins la </span>
              <span className="text-white">communauté</span>
            </h3>
            <div className="mt-3 flex gap-1 justify-center sm:justify-start">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star key={i} className="h-5 w-5 fill-[#FCDD00] text-[#FCDD00]" />
              ))}
              <span className="ml-2 text-sm text-[#9CA3AF]">4.9/5</span>
            </div>
          </div>
          <button
            onClick={scrollToReviews}
            className="h-12 px-8 text-xs font-bold uppercase tracking-wide border border-white/30 text-white rounded-sm transition-all duration-300 hover:border-[#FCDD00] hover:text-[#FCDD00]"
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
    <section className="py-20 bg-[#000000]">
      <div className="mx-auto max-w-5xl px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <p className="text-xs uppercase tracking-[0.3em] text-[#FCDD00] mb-4">Intégrations</p>
          <h2 className="mb-4 text-3xl sm:text-4xl md:text-5xl font-black text-white">Sync tes wearables</h2>
          <p className="mb-12 text-base text-[#9CA3AF]">Connecte tes données pour une analyse plus précise</p>

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
                {brand.comingSoon && <span className="absolute -top-3 text-[9px] text-[#9CA3AF]">Bientôt</span>}
                <img src={brand.logo} alt={brand.name} className="h-8 w-8 object-contain mb-2 rounded grayscale hover:grayscale-0 transition-all duration-300" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                <span className="text-xs text-[#9CA3AF]">{brand.name}</span>
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
    <section className="relative py-32 bg-[#000000] overflow-hidden">
      {/* Subtle gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-gray-950 via-black to-black" />

      <div className="relative mx-auto max-w-7xl px-4">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mb-20 text-center"
        >
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#FCDD00] mb-4">Résultats</p>
          <h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-white uppercase tracking-tighter mb-2">AMÉLIORATIONS</h2>
          <h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black uppercase tracking-tighter" style={{ WebkitTextStroke: '1px rgba(255,255,255,0.2)', color: 'transparent' }}>MESURABLES</h2>
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
                <div className="relative p-8 rounded-sm border border-[#333333] bg-white/[0.02] transition-all duration-300 hover:border-[#FCDD00]/30 hover:bg-white/[0.03]">
                  {/* Icon */}
                  <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-sm bg-[#FCDD00]/10 border border-[#FCDD00]/20">
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

                  <div className="text-[#9CA3AF] text-sm uppercase tracking-wider">{result.label}</div>
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
    <section id="reviews" className="py-32 bg-[#000000]">
      <div className="mx-auto max-w-7xl px-4">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mb-20 text-center"
        >
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#FCDD00] mb-4">Témoignages</p>
          <h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-white uppercase tracking-tighter mb-2">RÉSULTATS</h2>
          <h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black uppercase tracking-tighter" style={{ WebkitTextStroke: '1px rgba(255,255,255,0.2)', color: 'transparent' }}>VALIDÉS</h2>
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
              <div className="h-full p-8 rounded-sm border border-[#333333] bg-white/[0.02] transition-all duration-300 hover:border-[#FCDD00]/30 hover:bg-white/[0.03]">
                {/* Rating */}
                <div className="mb-6 flex gap-1">
                  {Array.from({ length: testimonial.rating }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-[#FCDD00] text-[#FCDD00]" />
                  ))}
                </div>

                {/* Quote */}
                <Quote className="mb-4 h-6 w-6 text-[#4B5563]" />
                <p className="mb-8 text-[#D1D5DB] leading-relaxed">{testimonial.content}</p>

                {/* Author */}
                <div className="pt-6 border-t border-[#333333]">
                  <div className="font-semibold text-white">{testimonial.name}</div>
                  <div className="text-sm text-[#9CA3AF]">{testimonial.role}</div>
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
      answer: "Je suis coach certifié avec 11 certifications internationales (NASM, ISSA, Precision Nutrition, Pre-Script...). J'ai accompagné des centaines de clients en coaching individuel pendant des années. APEXLABS est l'aboutissement de toute cette expérience : je voulais rendre accessible à tous l'analyse approfondie que je faisais en one-to-one. Chaque protocole, chaque recommandation vient de mon expérience terrain, pas d'un template générique.",
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
      question: "Je peux synchroniser mes wearables ?",
      answer: "Oui ! Tu peux connecter Oura, Garmin, Fitbit, Apple Health, Google Fit, Samsung Health, Withings et Ultrahuman. Les données de tes wearables enrichissent l'analyse et permettent un suivi dans le temps. WHOOP arrive bientôt. Plus tu connectes de sources, plus l'analyse est précise.",
    },
  ];

  return (
    <section className="py-32 bg-[#050505]">
      <div className="mx-auto max-w-3xl px-4">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mb-16 text-center"
        >
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#FCDD00] mb-4">FAQ</p>
          <h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-white uppercase tracking-tighter mb-2">QUESTIONS</h2>
          <h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black uppercase tracking-tighter" style={{ WebkitTextStroke: '1px rgba(255,255,255,0.2)', color: 'transparent' }}>FRÉQUENTES</h2>
        </motion.div>

        <div className="space-y-3">
          {faqs.map((faq, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.05 }}
              className="rounded-sm border border-[#333333] bg-white/[0.03] overflow-hidden"
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="flex w-full items-center justify-between p-5 text-left hover:bg-white/[0.05]/80 transition-colors"
              >
                <span className="font-medium text-white">{faq.question}</span>
                <ChevronDown
                  className={`h-5 w-5 text-[#9CA3AF] transition-transform duration-200 ${
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
                    <div className="border-t border-[#333333] px-5 py-5 text-[#9CA3AF]">
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
            <button className="gap-2 px-6 py-3 text-xs font-bold uppercase tracking-wide border border-white/30 text-white rounded-sm transition-all duration-300 hover:border-[#FCDD00] hover:text-[#FCDD00] flex items-center justify-center">
              Voir toutes les questions
              <span className="ml-2">&gt;</span>
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
    <section className="relative py-32 bg-[#000000] overflow-hidden">
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
          <h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-white uppercase tracking-tighter mb-2">OPTIMISATION</h2>
          <h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black uppercase tracking-tighter mb-8" style={{ WebkitTextStroke: '1px rgba(255,255,255,0.2)', color: 'transparent' }}>HUMAINE</h2>
          <p className="mx-auto mb-12 max-w-xl text-lg text-[#9CA3AF] font-light">
            Rejoins ceux qui ont transformé leur performance.
          </p>

          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/offers/discovery-scan">
              <button className="group relative h-14 gap-3 px-10 text-xs font-black uppercase tracking-wide bg-[#FCDD00] text-black rounded-sm transition-all duration-300 hover:bg-[#FCDD00]/90 flex items-center justify-center">
                <span className="relative z-10 flex items-center gap-2">
                  Commencer
                  <ArrowRight className="h-5 w-5" />
                </span>
              </button>
            </Link>
            <Link href="/offers/ultimate-scan">
              <button className="h-14 gap-2 px-10 text-xs font-bold uppercase tracking-wide border border-white/30 text-white rounded-sm transition-all duration-300 hover:border-[#FCDD00] hover:text-[#FCDD00] flex items-center justify-center">
                Ultimate Scan — 79€
              </button>
            </Link>
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="mt-12 flex flex-wrap items-center justify-center gap-8 text-sm text-[#6B7280]"
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
              <span>Communauté active</span>
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
    <div className="min-h-screen bg-[#000000]">
      <Header />
      <main>
        <HeroSection />
        <FiveOffersSection />
        <CertificationsSection />
        <SocialProofBanner />
        <WearablesSection />
        <MeasurableResultsSection />
        <OffersSection />
        <TestimonialsSection />
        <FAQSection />
        <FinalCTASection />
      </main>
      <Footer />
      <FixedReviewsWidget />
    </div>
  );
}
