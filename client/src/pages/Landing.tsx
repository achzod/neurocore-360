import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
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
  Heart,
  Target,
  Sparkles,
} from "lucide-react";

// Certification logos
import issaLogo from "@assets/ISSA+Logo+_+Vertical+_+for-white-background_1767172975495.webp";
import pnLogo from "@assets/limage-19764_1767172975495.webp";
import preScriptLogo from "@assets/Pre-Script_1200x1200_1767172975495.webp";
import nasmLogo from "@assets/nasm-logo_1767172987583.jpg";

// ============================================================================
// SHADER BACKGROUND COMPONENT
// ============================================================================
function ShaderBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden">
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
// LIQUID GLASS BUTTON COMPONENT
// ============================================================================
interface LiquidGlassButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  className?: string;
  href?: string;
}

function LiquidGlassButton({ children, onClick, variant = 'primary', className = '', href }: LiquidGlassButtonProps) {
  const baseStyles = "relative px-8 py-4 rounded-2xl font-semibold text-sm uppercase tracking-wider transition-all duration-500 overflow-hidden group";

  const variants = {
    primary: `
      bg-[#FCDD00] text-black
      shadow-[0_0_40px_rgba(252,221,0,0.3),inset_0_1px_0_rgba(255,255,255,0.3)]
      hover:shadow-[0_0_60px_rgba(252,221,0,0.5),inset_0_1px_0_rgba(255,255,255,0.4)]
      hover:scale-[1.02]
      before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/30 before:to-transparent
      before:translate-x-[-200%] hover:before:translate-x-[200%] before:transition-transform before:duration-700
    `,
    secondary: `
      bg-white/5 text-white backdrop-blur-xl
      border border-white/10
      shadow-[0_8px_32px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.1)]
      hover:bg-white/10 hover:border-[#FCDD00]/30
      hover:shadow-[0_8px_32px_rgba(252,221,0,0.15),inset_0_1px_0_rgba(255,255,255,0.2)]
    `,
    outline: `
      bg-transparent text-white
      border-2 border-white/20 backdrop-blur-sm
      hover:border-[#FCDD00] hover:text-[#FCDD00]
      hover:shadow-[0_0_30px_rgba(252,221,0,0.2)]
    `,
  };

  const content = (
    <>
      <span className="relative z-10 flex items-center justify-center gap-2">
        {children}
      </span>
      {/* Liquid effect */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />
      </div>
    </>
  );

  if (href) {
    return (
      <Link href={href} className={`${baseStyles} ${variants[variant]} ${className} inline-flex items-center justify-center`}>
        {content}
      </Link>
    );
  }

  return (
    <button onClick={onClick} className={`${baseStyles} ${variants[variant]} ${className}`}>
      {content}
    </button>
  );
}

// ============================================================================
// HEADER COMPONENT - ApexLabs Style
// ============================================================================
function Header() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
      isScrolled
        ? 'bg-black/80 backdrop-blur-xl py-4 border-b border-[#FCDD00]/10'
        : 'bg-transparent py-6'
    }`}>
      <div className="container mx-auto px-6 flex justify-between items-center">
        <Link href="/" className="flex flex-col leading-none group cursor-pointer">
          <span className="text-2xl font-black tracking-tighter text-white uppercase">
            NEURO<span className="text-[#FCDD00]">CORE</span>
          </span>
          <span className="text-xs font-medium text-gray-500 tracking-widest group-hover:text-[#FCDD00] transition-colors">
            360° BIO-OPTIMIZATION
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          <button
            onClick={() => scrollToSection('offers')}
            className="text-sm font-medium text-gray-400 hover:text-[#FCDD00] transition-colors"
          >
            Offres
          </button>
          <button
            onClick={() => scrollToSection('results')}
            className="text-sm font-medium text-gray-400 hover:text-[#FCDD00] transition-colors"
          >
            Résultats
          </button>
          <button
            onClick={() => scrollToSection('testimonials')}
            className="text-sm font-medium text-gray-400 hover:text-[#FCDD00] transition-colors"
          >
            Témoignages
          </button>
          <LiquidGlassButton variant="outline" onClick={() => scrollToSection('cta')} className="!py-2 !px-6 !text-xs">
            Commencer
          </LiquidGlassButton>
        </nav>
      </div>
    </header>
  );
}

// ============================================================================
// HERO SECTION - Premium ApexLabs Style
// ============================================================================
function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <ShaderBackground />

      {/* Floating elements */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-[#FCDD00]/40 rounded-full"
            style={{
              left: `${20 + i * 15}%`,
              top: `${30 + (i % 3) * 20}%`,
            }}
            animate={{
              y: [0, -30, 0],
              opacity: [0.2, 0.8, 0.2],
            }}
            transition={{
              duration: 4 + i,
              repeat: Infinity,
              delay: i * 0.5,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 mx-auto max-w-6xl px-6 py-32 text-center">
        {/* Badge */}
        <motion.div
          className="inline-flex items-center gap-3 mb-8 px-5 py-2.5 rounded-full border border-[#FCDD00]/20 bg-[#FCDD00]/5 backdrop-blur-sm"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <motion.span
            className="w-2 h-2 rounded-full bg-[#FCDD00]"
            animate={{ opacity: [1, 0.4, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <span className="text-sm font-medium text-[#FCDD00]/80">par Achzod · 11 Certifications</span>
        </motion.div>

        {/* Main Title */}
        <motion.h1
          className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tight leading-[0.9] mb-8"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <span className="text-white">L'ANALYSE</span>
          <br />
          <span className="text-[#FCDD00]">CORPORELLE</span>
          <br />
          <span className="text-white italic font-light text-4xl sm:text-5xl md:text-6xl">la plus complète.</span>
        </motion.h1>

        {/* Tagline */}
        <motion.p
          className="text-xl md:text-2xl text-gray-500 mb-12 max-w-2xl mx-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          Données biomédicales, analyse comportementale, optimisation personnalisée.
          <span className="text-[#FCDD00]"> Votre corps mérite la précision.</span>
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          className="flex flex-col sm:flex-row gap-4 justify-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
        >
          <LiquidGlassButton variant="primary" onClick={() => document.getElementById('offers')?.scrollIntoView({ behavior: 'smooth' })}>
            Découvrir les offres
            <ArrowRight className="w-4 h-4" />
          </LiquidGlassButton>
          <LiquidGlassButton variant="secondary" href="/apexlabs">
            ApexLabs Pro
            <Sparkles className="w-4 h-4" />
          </LiquidGlassButton>
        </motion.div>

        {/* Stats */}
        <motion.div
          className="mt-20 grid grid-cols-3 gap-8 max-w-2xl mx-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.8 }}
        >
          {[
            { value: "500+", label: "Clients" },
            { value: "98%", label: "Satisfaction" },
            { value: "11", label: "Certifications" },
          ].map((stat, i) => (
            <div key={i} className="text-center">
              <div className="text-3xl md:text-4xl font-black text-[#FCDD00]">{stat.value}</div>
              <div className="text-sm text-gray-500 mt-1">{stat.label}</div>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <ChevronDown className="w-6 h-6 text-[#FCDD00]/50" />
      </motion.div>
    </section>
  );
}

// ============================================================================
// OFFERS SECTION
// ============================================================================
const OFFERS = [
  {
    id: 'discovery',
    title: "DISCOVERY SCAN",
    subtitle: "L'Analyse Initiale",
    description: "Cartographie complète de votre composition corporelle par bio-impédancemétrie médicale et scan 3D.",
    features: ["Composition corporelle 3D", "Analyse métabolique", "Rapport digital", "Bilan d'hydratation"],
    price: "149€",
    icon: Scan,
    color: "#FCDD00",
  },
  {
    id: 'anabolic',
    title: "ANABOLIC BIOSCAN",
    subtitle: "Performance Musculaire",
    description: "Analyse précise de la densité musculaire et du profil hormonal anabolique.",
    features: ["Densité musculaire", "Asymétries & posture", "Récupération", "Optimisation force"],
    price: "299€",
    icon: Activity,
    color: "#22d3ee",
  },
  {
    id: 'blood',
    title: "BLOOD ANALYSIS",
    subtitle: "La Vérité Biologique",
    description: "Analyse sanguine exhaustive ciblant plus de 50 biomarqueurs clés de performance.",
    features: ["Panel hormonal", "Marqueurs inflammatoires", "Carences", "Fonction organes"],
    price: "399€",
    icon: Droplet,
    color: "#ef4444",
  },
  {
    id: 'burnout',
    title: "BURNOUT ENGINE",
    subtitle: "Système Nerveux",
    description: "Mesure de la charge allostatique et variabilité cardiaque pour prévenir l'épuisement.",
    features: ["Analyse VFC", "Cortisol", "Qualité sommeil", "Résilience"],
    price: "349€",
    icon: Brain,
    color: "#a855f7",
  },
  {
    id: 'ultimate',
    title: "ULTIMATE SCAN",
    subtitle: "L'Omniscience",
    description: "L'agrégation de toutes nos technologies pour une vue 360° de votre physiologie.",
    features: ["Toutes les analyses", "Plan sur-mesure", "Génétique", "Suivi prioritaire"],
    price: "899€",
    icon: Target,
    color: "#FCDD00",
    featured: true,
  },
];

function OffersSection() {
  return (
    <section id="offers" className="relative py-32 overflow-hidden">
      <ShaderBackground />

      <div className="relative z-10 container mx-auto px-6">
        {/* Section Header */}
        <motion.div
          className="text-center mb-20"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <span className="text-[#FCDD00] text-sm font-bold tracking-widest uppercase mb-4 block">
            Nos Protocoles
          </span>
          <h2 className="text-4xl md:text-6xl font-black text-white mb-6">
            CHOISISSEZ VOTRE <span className="text-[#FCDD00]">NIVEAU</span>
          </h2>
          <p className="text-gray-500 text-lg max-w-2xl mx-auto">
            Des solutions adaptées à chaque niveau d'exigence. Du débutant à l'athlète d'élite.
          </p>
        </motion.div>

        {/* Offers Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {OFFERS.map((offer, index) => (
            <motion.div
              key={offer.id}
              className={`relative group ${offer.featured ? 'lg:col-span-1 lg:row-span-2' : ''}`}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
            >
              <div className={`
                h-full p-8 rounded-3xl border transition-all duration-500
                ${offer.featured
                  ? 'bg-gradient-to-br from-[#FCDD00]/10 via-black to-black border-[#FCDD00]/30 hover:border-[#FCDD00]'
                  : 'bg-white/[0.02] border-white/10 hover:border-white/30 hover:bg-white/[0.05]'
                }
                backdrop-blur-xl
              `}>
                {offer.featured && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-[#FCDD00] text-black text-xs font-bold rounded-full">
                    RECOMMANDÉ
                  </div>
                )}

                {/* Icon */}
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6"
                  style={{ backgroundColor: `${offer.color}15` }}
                >
                  <offer.icon className="w-7 h-7" style={{ color: offer.color }} />
                </div>

                {/* Content */}
                <div className="text-xs font-bold tracking-widest text-gray-500 mb-2">
                  {offer.subtitle}
                </div>
                <h3 className="text-2xl font-black text-white mb-3">{offer.title}</h3>
                <p className="text-gray-400 text-sm mb-6 leading-relaxed">{offer.description}</p>

                {/* Features */}
                <ul className="space-y-2 mb-8">
                  {offer.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-gray-300">
                      <Check className="w-4 h-4 text-[#FCDD00]" />
                      {feature}
                    </li>
                  ))}
                </ul>

                {/* Price & CTA */}
                <div className="flex items-center justify-between mt-auto pt-6 border-t border-white/10">
                  <div>
                    <span className="text-3xl font-black text-white">{offer.price}</span>
                  </div>
                  <LiquidGlassButton
                    variant={offer.featured ? 'primary' : 'outline'}
                    className="!py-2 !px-4 !text-xs"
                    href={`/checkout?offer=${offer.id}`}
                  >
                    Réserver
                    <ArrowRight className="w-3 h-3" />
                  </LiquidGlassButton>
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
// CERTIFICATIONS SECTION
// ============================================================================
function CertificationsSection() {
  const certs = [
    { org: "NASM", items: ["CPT", "CNC", "PES"], logo: nasmLogo },
    { org: "ISSA", items: ["CPT", "SNS", "SFC", "SBC"], logo: issaLogo },
    { org: "Precision Nutrition", items: ["PN1"], logo: pnLogo },
    { org: "Pre-Script", items: ["Level 1"], logo: preScriptLogo },
  ];

  return (
    <section className="py-20 bg-black border-y border-white/5">
      <div className="container mx-auto px-6">
        <p className="text-xs uppercase tracking-[0.3em] text-gray-600 text-center mb-10">
          11 Certifications Internationales
        </p>
        <div className="flex flex-wrap justify-center gap-8 items-center">
          {certs.map((cert, i) => (
            <motion.div
              key={cert.org}
              className="flex items-center gap-4 px-6 py-3 rounded-xl bg-white/[0.02] border border-white/5 hover:border-[#FCDD00]/20 transition-all"
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <img src={cert.logo} alt={cert.org} className="h-8 w-auto opacity-60 grayscale" />
              <div className="text-sm">
                <span className="text-white font-medium">{cert.org}</span>
                <span className="text-gray-500"> · {cert.items.join(", ")}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// RESULTS SECTION
// ============================================================================
function ResultsSection() {
  const results = [
    { metric: "+23%", label: "Force moyenne", desc: "en 12 semaines" },
    { metric: "-8kg", label: "Masse grasse", desc: "moyenne clients" },
    { metric: "4.9/5", label: "Satisfaction", desc: "500+ avis" },
    { metric: "98%", label: "Renouvellement", desc: "clients fidèles" },
  ];

  return (
    <section id="results" className="py-32 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-black via-[#FCDD00]/5 to-black" />

      <div className="relative z-10 container mx-auto px-6">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <span className="text-[#FCDD00] text-sm font-bold tracking-widest uppercase mb-4 block">
            Résultats Mesurables
          </span>
          <h2 className="text-4xl md:text-6xl font-black text-white">
            DES DONNÉES <span className="text-[#FCDD00]">CONCRÈTES</span>
          </h2>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {results.map((result, i) => (
            <motion.div
              key={i}
              className="text-center p-8 rounded-3xl bg-white/[0.02] border border-white/10 hover:border-[#FCDD00]/30 transition-all"
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <div className="text-4xl md:text-5xl font-black text-[#FCDD00] mb-2">{result.metric}</div>
              <div className="text-white font-medium mb-1">{result.label}</div>
              <div className="text-sm text-gray-500">{result.desc}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// TESTIMONIALS SECTION
// ============================================================================
function TestimonialsSection() {
  const testimonials = [
    {
      name: "Marc D.",
      role: "Entrepreneur",
      text: "L'analyse la plus complète que j'ai jamais faite. Les résultats ont changé ma façon de m'entraîner.",
      rating: 5,
    },
    {
      name: "Sophie L.",
      role: "Athlète CrossFit",
      text: "Le Burnout Engine m'a permis d'éviter le surentraînement. Indispensable pour la performance.",
      rating: 5,
    },
    {
      name: "Thomas R.",
      role: "Coach Personnel",
      text: "J'utilise les rapports pour tous mes clients VIP. La précision est incomparable.",
      rating: 5,
    },
  ];

  return (
    <section id="testimonials" className="py-32 relative overflow-hidden">
      <ShaderBackground />

      <div className="relative z-10 container mx-auto px-6">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <span className="text-[#FCDD00] text-sm font-bold tracking-widest uppercase mb-4 block">
            Témoignages
          </span>
          <h2 className="text-4xl md:text-6xl font-black text-white">
            ILS ONT <span className="text-[#FCDD00]">TESTÉ</span>
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <motion.div
              key={i}
              className="p-8 rounded-3xl bg-white/[0.02] border border-white/10 hover:border-[#FCDD00]/20 transition-all backdrop-blur-xl"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              {/* Stars */}
              <div className="flex gap-1 mb-4">
                {[...Array(t.rating)].map((_, j) => (
                  <Star key={j} className="w-4 h-4 fill-[#FCDD00] text-[#FCDD00]" />
                ))}
              </div>

              {/* Quote */}
              <p className="text-gray-300 mb-6 leading-relaxed">"{t.text}"</p>

              {/* Author */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#FCDD00]/20 flex items-center justify-center">
                  <span className="text-[#FCDD00] font-bold">{t.name[0]}</span>
                </div>
                <div>
                  <div className="text-white font-medium">{t.name}</div>
                  <div className="text-sm text-gray-500">{t.role}</div>
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
// FAQ SECTION
// ============================================================================
function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const faqs = [
    {
      q: "Comment se déroule une analyse ?",
      a: "Vous prenez rendez-vous, nous effectuons les mesures en cabinet (30-60min selon le protocole), et vous recevez votre rapport détaillé sous 48h.",
    },
    {
      q: "Les résultats sont-ils fiables ?",
      a: "Nous utilisons des équipements médicaux de dernière génération avec une précision de 99.7%. Chaque analyse est validée par un expert certifié.",
    },
    {
      q: "Puis-je faire plusieurs analyses ?",
      a: "Absolument ! Nous recommandons un suivi tous les 3 mois pour mesurer votre progression et ajuster votre protocole.",
    },
    {
      q: "Y a-t-il un suivi après l'analyse ?",
      a: "Oui, chaque analyse inclut une consultation de 30min pour expliquer les résultats et vous donner des recommandations personnalisées.",
    },
  ];

  return (
    <section className="py-32 relative">
      <div className="container mx-auto px-6 max-w-3xl">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <span className="text-[#FCDD00] text-sm font-bold tracking-widest uppercase mb-4 block">
            Questions Fréquentes
          </span>
          <h2 className="text-4xl md:text-5xl font-black text-white">
            VOS <span className="text-[#FCDD00]">QUESTIONS</span>
          </h2>
        </motion.div>

        <div className="space-y-4">
          {faqs.map((faq, i) => (
            <motion.div
              key={i}
              className="border border-white/10 rounded-2xl overflow-hidden hover:border-[#FCDD00]/20 transition-all"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="w-full p-6 flex items-center justify-between text-left"
              >
                <span className="font-medium text-white">{faq.q}</span>
                <ChevronDown className={`w-5 h-5 text-[#FCDD00] transition-transform ${openIndex === i ? 'rotate-180' : ''}`} />
              </button>
              <AnimatePresence>
                {openIndex === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="px-6 pb-6"
                  >
                    <p className="text-gray-400 leading-relaxed">{faq.a}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
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
    <section id="cta" className="py-32 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-t from-[#FCDD00]/10 via-transparent to-transparent" />

      <div className="relative z-10 container mx-auto px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="text-4xl md:text-6xl font-black text-white mb-6">
            PRÊT À <span className="text-[#FCDD00]">COMMENCER</span> ?
          </h2>
          <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto">
            Rejoignez les 500+ personnes qui ont transformé leur santé grâce à nos analyses.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <LiquidGlassButton variant="primary" onClick={() => document.getElementById('offers')?.scrollIntoView({ behavior: 'smooth' })}>
              Voir les offres
              <ArrowRight className="w-4 h-4" />
            </LiquidGlassButton>
            <LiquidGlassButton variant="secondary" href="/apexlabs">
              Explorer ApexLabs
            </LiquidGlassButton>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// ============================================================================
// FOOTER COMPONENT
// ============================================================================
function Footer() {
  return (
    <footer className="py-16 border-t border-white/5 bg-black">
      <div className="container mx-auto px-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="text-center md:text-left">
            <div className="text-xl font-black text-white mb-2">
              NEURO<span className="text-[#FCDD00]">CORE</span> 360
            </div>
            <p className="text-sm text-gray-500">Bio-Optimization par Achzod</p>
          </div>

          <div className="flex gap-8 text-sm text-gray-500">
            <Link href="/cgv" className="hover:text-[#FCDD00] transition-colors">CGV</Link>
            <Link href="/mentions-legales" className="hover:text-[#FCDD00] transition-colors">Mentions Légales</Link>
            <Link href="/faq" className="hover:text-[#FCDD00] transition-colors">FAQ</Link>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-white/5 text-center text-sm text-gray-600">
          © 2024 Neurocore 360. Tous droits réservés.
        </div>
      </div>
    </footer>
  );
}

// ============================================================================
// MAIN LANDING PAGE
// ============================================================================
export default function Landing() {
  return (
    <div className="min-h-screen bg-black">
      <Header />
      <main>
        <HeroSection />
        <OffersSection />
        <CertificationsSection />
        <ResultsSection />
        <TestimonialsSection />
        <FAQSection />
        <FinalCTASection />
      </main>
      <Footer />

      {/* Global styles for animations */}
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
      `}</style>
    </div>
  );
}
