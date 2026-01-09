import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";

// ============================================================================
// TYPES
// ============================================================================
interface Offer {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  features: string[];
  price?: string;
  imageUrl: string;
  reverse?: boolean;
  useCustomVisual?: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================
const SITE_NAME = "APEXLABS";
const TAGLINE = "OPTIMISATION HUMAINE & BIO-DATA";

const OFFERS: Offer[] = [
  {
    id: 'discovery-scan',
    title: "DISCOVERY SCAN",
    subtitle: "L'Analyse Initiale",
    description: "Le point d'entrée essentiel vers l'optimisation. Une cartographie complète de ta composition corporelle par bio-impédancemétrie médicale et scan 3D. Obtiens une vision claire de ta masse musculaire, masse grasse viscérale et de ton hydratation cellulaire.",
    features: ["Composition Corporelle 3D", "Analyse Métabolique de Base", "Rapport Digital Immédiat", "Bilan d'Hydratation"],
    price: "Gratuit",
    imageUrl: "https://cdn.speedsize.com/3f711f28-1488-44dc-b013-5e43284ac4b0/https://public-web-assets.uh-static.com/web_v2/womens-health/whitepapers/hr_hrv.png",
    reverse: false
  },
  {
    id: 'anabolic-bioscan',
    title: "ANABOLIC BIOSCAN",
    subtitle: "Performance Musculaire",
    description: "Conçu pour l'hypertrophie et la performance athlétique. Analyse précise de la densité musculaire, de la qualité des tissus et du profil hormonal anabolique. Identifie tes leviers de croissance et optimise ta récupération neuro-musculaire.",
    features: ["Densité Musculaire", "Asymétries & Posture", "Potentiel de Récupération", "Optimisation de la Force"],
    price: "59€",
    imageUrl: "https://cdn.speedsize.com/3f711f28-1488-44dc-b013-5e43284ac4b0/https://public-web-assets.uh-static.com/web_v2/womens-health/whitepapers/bmi_stress_activity.png",
    reverse: true
  },
  {
    id: 'blood-analysis',
    title: "BLOOD ANALYSIS",
    subtitle: "La Vérité Biologique",
    description: "Plonge au cœur de ta biochimie. Une analyse sanguine exhaustive ciblant plus de 50 biomarqueurs clés de performance : statut inflammatoire, hormonal, micronutritionnel et métabolique. La donnée biologique brute au service de ta santé.",
    features: ["Panel Hormonal Complet", "Marqueurs Inflammatoires", "Carences Micronutritionnelles", "Fonction Hépatique & Rénale"],
    price: "99€",
    imageUrl: "",
    reverse: false,
    useCustomVisual: true
  },
  {
    id: 'ultimate-scan',
    title: "ULTIMATE SCAN",
    subtitle: "L'Omniscience Corporelle",
    description: "L'agrégation de toutes nos technologies. Discovery + Anabolic + Blood + Analyse génétique. Une vue à 360° de ta physiologie pour une stratégie d'optimisation sans compromis. Le gold standard pour les bio-hackers et athlètes d'élite.",
    features: ["Intégration Totale des Données", "Plan d'Action Sur-Mesure", "Analyse Génétique Croisée", "Suivi Prioritaire"],
    price: "79€",
    imageUrl: "https://cdn.speedsize.com/3f711f28-1488-44dc-b013-5e43284ac4b0/https://public-web-assets.uh-static.com/web_v2/womens-health/whitepapers/cno_pro.png",
    reverse: true
  },
  {
    id: 'burnout-detection',
    title: "BURNOUT DETECTION",
    subtitle: "Préservation du Système Nerveux",
    description: "Mesure objective de la charge allostatique et de la variabilité cardiaque (VFC). Détecte les signes physiologiques de l'épuisement et la fatigue centrale avant qu'ils ne deviennent cliniques. Protège ton actif le plus précieux : ton mental.",
    features: ["Analyse Système Nerveux (VFC)", "Mesure du Cortisol", "Qualité du Sommeil", "Stratégies de Résilience"],
    price: "39€",
    imageUrl: "https://cdn.speedsize.com/3f711f28-1488-44dc-b013-5e43284ac4b0/https://public-web-assets.uh-static.com/web_v2/womens-health/whitepapers/sleep_ramadan.png",
    reverse: false
  }
];

// ============================================================================
// BUTTON COMPONENT
// ============================================================================
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline';
  children: React.ReactNode;
}

function Button({ variant = 'primary', children, className = '', ...props }: ButtonProps) {
  const baseStyle = "px-8 py-3 rounded-full font-medium transition-all duration-300 tracking-wide text-sm uppercase flex items-center justify-center gap-2 relative overflow-hidden group";

  const variants = {
    primary: "bg-white text-black hover:bg-gray-200 shadow-[0_0_20px_rgba(255,255,255,0.3)]",
    secondary: "bg-neutral-800 text-white hover:bg-neutral-700 border border-neutral-700",
    outline: "bg-transparent text-white border border-white/30 hover:border-white hover:bg-white/5 backdrop-blur-sm"
  };

  return (
    <button className={`${baseStyle} ${variants[variant]} ${className}`} {...props}>
      <span className="relative z-10">{children}</span>
      {variant === 'primary' && (
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out" />
      )}
    </button>
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
      {/* Background glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(59,130,246,0.15)_0%,_transparent_70%)]" />

      {/* Floating particles */}
      {[...Array(20)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 bg-blue-400/60 rounded-full"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
          animate={{
            y: [0, -20, 0],
            opacity: [0.3, 0.8, 0.3],
          }}
          transition={{
            duration: 3 + Math.random() * 2,
            repeat: Infinity,
            delay: Math.random() * 2,
          }}
        />
      ))}

      {/* DNA Helix */}
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
                animate={{
                  rotateY: [phase * (180 / Math.PI), phase * (180 / Math.PI) + 360],
                }}
                transition={{
                  duration: 8,
                  repeat: Infinity,
                  ease: "linear",
                }}
              >
                {/* Left strand node */}
                <motion.div
                  className="absolute left-0 w-4 h-4 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 shadow-[0_0_15px_rgba(34,211,238,0.8)]"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.1 }}
                />
                {/* Connecting bar */}
                <div className="absolute left-4 right-4 top-1.5 h-1 bg-gradient-to-r from-cyan-400 via-purple-500 to-blue-400 opacity-60 rounded-full" />
                {/* Right strand node */}
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

      {/* Labels */}
      <div className="absolute bottom-4 left-4 text-xs font-mono text-blue-400/80">
        <div>ANALYSE ADN</div>
        <motion.div
          className="text-cyan-400"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          50+ BIOMARQUEURS
        </motion.div>
      </div>

      {/* Scan line */}
      <motion.div
        className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent"
        animate={{ top: ['0%', '100%', '0%'] }}
        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
      />
    </div>
  );
}

// ============================================================================
// ECG SECTION (below Hero) - APEXLABS DESIGN SYSTEM
// ============================================================================
function ECGSection() {
  const [bpm, setBpm] = useState(72);
  const [hrv, setHrv] = useState(68);

  // BPM & HRV fluctuation
  useEffect(() => {
    const interval = setInterval(() => {
      setBpm(prev => {
        const change = Math.floor(Math.random() * 5) - 2;
        const next = prev + change;
        return next > 78 ? 76 : next < 68 ? 70 : next;
      });
      setHrv(prev => {
        const change = Math.floor(Math.random() * 7) - 3;
        const next = prev + change;
        return next > 85 ? 82 : next < 55 ? 58 : next;
      });
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="py-8 sm:py-12 md:py-16 relative overflow-hidden bg-neuro-dark">
      {/* Tech Grid Background */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,255,65,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,65,0.03)_1px,transparent_1px)] bg-[size:2rem_2rem] sm:bg-[size:4rem_4rem]" />

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-neuro-dark via-transparent to-neuro-dark" />

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mb-6 sm:mb-8">
          {/* Beating heart with signal glow */}
          <motion.div
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ duration: 0.8, repeat: Infinity }}
            className="relative"
          >
            <div className="absolute inset-0 bg-neuro-signal/30 blur-xl rounded-full" />
            <svg className="w-10 h-10 sm:w-12 sm:h-12 text-neuro-signal drop-shadow-[0_0_20px_rgba(0,255,65,0.8)]" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
          </motion.div>
          <div className="text-center sm:text-left">
            {/* Tech label - JetBrains Mono */}
            <span className="font-mono text-[10px] sm:text-xs text-neuro-accent uppercase tracking-[0.2em] block mb-1">
              System Status
            </span>
            {/* Title - Inter Black */}
            <h3 className="font-sans font-black text-xl sm:text-2xl md:text-3xl text-white uppercase tracking-tighter">
              ANALYSE CARDIAQUE
            </h3>
            {/* BPM Data - JetBrains Mono */}
            <motion.div
              className="font-mono text-lg sm:text-xl md:text-2xl text-neuro-signal tracking-tight flex items-center justify-center sm:justify-start gap-2"
              key={bpm}
              initial={{ scale: 1.05 }}
              animate={{ scale: 1 }}
            >
              <motion.span
                className="w-2 h-2 bg-neuro-signal rounded-full"
                animate={{ scale: [1, 1.3, 1], opacity: [1, 0.5, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
              />
              {bpm} BPM
            </motion.div>
          </div>
        </div>

        {/* ECG Line Container */}
        <div className="relative h-20 sm:h-24 md:h-28 bg-black/60 backdrop-blur-sm rounded border border-neuro-signal/20 overflow-hidden">
          {/* Grid background */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(0,255,65,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,65,0.08)_1px,transparent_1px)] bg-[size:20px_20px]" />

          {/* HUD corners */}
          <div className="absolute top-2 left-2 w-4 h-4 border-l-2 border-t-2 border-neuro-signal/50 rounded-tl" />
          <div className="absolute top-2 right-2 w-4 h-4 border-r-2 border-t-2 border-neuro-signal/50 rounded-tr" />
          <div className="absolute bottom-2 left-2 w-4 h-4 border-l-2 border-b-2 border-neuro-signal/50 rounded-bl" />
          <div className="absolute bottom-2 right-2 w-4 h-4 border-r-2 border-b-2 border-neuro-signal/50 rounded-br" />

          {/* ECG SVG - Signal Green */}
          <svg viewBox="0 0 400 60" className="w-full h-full" preserveAspectRatio="none">
            <motion.path
              d="M 0 30 L 30 30 L 40 30 L 50 10 L 60 50 L 70 20 L 80 40 L 90 30 L 130 30 L 140 30 L 150 10 L 160 50 L 170 20 L 180 40 L 190 30 L 230 30 L 240 30 L 250 10 L 260 50 L 270 20 L 280 40 L 290 30 L 330 30 L 340 30 L 350 10 L 360 50 L 370 20 L 380 40 L 390 30 L 400 30"
              fill="none"
              stroke="#00FF41"
              strokeWidth="2"
              strokeLinecap="round"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
            />
            {/* Glow effect */}
            <motion.path
              d="M 0 30 L 30 30 L 40 30 L 50 10 L 60 50 L 70 20 L 80 40 L 90 30 L 130 30 L 140 30 L 150 10 L 160 50 L 170 20 L 180 40 L 190 30 L 230 30 L 240 30 L 250 10 L 260 50 L 270 20 L 280 40 L 290 30 L 330 30 L 340 30 L 350 10 L 360 50 L 370 20 L 380 40 L 390 30 L 400 30"
              fill="none"
              stroke="#00FF41"
              strokeWidth="8"
              strokeLinecap="round"
              opacity="0.2"
              filter="blur(6px)"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
            />
          </svg>

          {/* Scanning line */}
          <motion.div
            className="absolute top-0 bottom-0 w-1 bg-gradient-to-b from-transparent via-neuro-signal to-transparent"
            animate={{ left: ['-5%', '105%'] }}
            transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
          />

          {/* Live indicator */}
          <div className="absolute top-2 right-8 flex items-center gap-1.5">
            <motion.span
              className="w-1.5 h-1.5 bg-neuro-signal rounded-full"
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            />
            <span className="font-mono text-[9px] text-neuro-signal uppercase tracking-widest">Live</span>
          </div>
        </div>

        {/* Stats - JetBrains Mono */}
        <div className="flex justify-center gap-4 sm:gap-8 md:gap-12 mt-4 sm:mt-6">
          <div className="text-center px-3 sm:px-4 py-2 bg-white/5 rounded border border-neutral-800">
            <div className="font-mono text-[10px] sm:text-xs text-neutral-500 uppercase tracking-widest mb-1">HRV</div>
            <motion.div
              className="font-mono text-base sm:text-lg md:text-xl text-neuro-signal tracking-tight"
              key={hrv}
              initial={{ scale: 1.05 }}
              animate={{ scale: 1 }}
            >
              {hrv}ms
            </motion.div>
          </div>
          <div className="text-center px-3 sm:px-4 py-2 bg-white/5 rounded border border-neutral-800">
            <div className="font-mono text-[10px] sm:text-xs text-neutral-500 uppercase tracking-widest mb-1">SPO2</div>
            <div className="font-mono text-base sm:text-lg md:text-xl text-cyan-400 tracking-tight">98%</div>
          </div>
          <div className="text-center px-3 sm:px-4 py-2 bg-white/5 rounded border border-neutral-800">
            <div className="font-mono text-[10px] sm:text-xs text-neutral-500 uppercase tracking-widest mb-1">Stress</div>
            <div className="font-mono text-base sm:text-lg md:text-xl text-neuro-accent tracking-tight">Low</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// HEADER COMPONENT - APEXLABS DESIGN
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
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? 'bg-neuro-dark/95 backdrop-blur-md py-3 border-b border-white/5' : 'bg-transparent py-5'}`}>
      <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
        {/* Logo - Italic Bold Style */}
        <a href="/apexlabs" className="flex flex-col leading-none group cursor-pointer">
          <span className="text-2xl md:text-3xl font-black italic tracking-tight text-white">
            APEX<span className="text-neuro-accent">LABS</span>
          </span>
          <span className="text-[10px] md:text-xs font-medium text-neuro-accent/80 tracking-[0.2em] uppercase">
            BY ACHZOD
          </span>
        </a>

        {/* Nav - Uppercase tracking */}
        <nav className="hidden md:flex items-center gap-10">
          <button
            onClick={() => scrollToSection('offers')}
            className="text-sm font-medium text-white/70 hover:text-white tracking-widest uppercase transition-colors"
          >
            Protocoles
          </button>
          <button
            onClick={() => scrollToSection('reviews')}
            className="text-sm font-medium text-white/70 hover:text-white tracking-widest uppercase transition-colors"
          >
            Résultats
          </button>
          <button
            onClick={() => scrollToSection('join-waitlist')}
            className="text-sm font-medium text-white/70 hover:text-white tracking-widest uppercase transition-colors"
          >
            Vision
          </button>
          {/* CTA - Yellow filled button */}
          <button
            onClick={() => scrollToSection('join-waitlist')}
            className="px-6 py-2.5 bg-neuro-accent text-black text-sm font-bold tracking-wider uppercase rounded-full hover:bg-neuro-accent/90 transition-all shadow-[0_0_20px_rgba(252,221,0,0.3)] hover:shadow-[0_0_30px_rgba(252,221,0,0.5)]"
          >
            S'inscrire
          </button>
        </nav>

        {/* Mobile menu button */}
        <button className="md:hidden text-white p-2">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>
    </header>
  );
}

// ============================================================================
// HERO COMPONENT
// ============================================================================
function Hero() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [objective, setObjective] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [spotsLeft] = useState(3);

  const objectives = [
    "Perte de masse grasse",
    "Prise de muscle",
    "Performance sportive",
    "Optimisation santé",
    "Détection burnout",
    "Bilan complet"
  ];

  const handleQuickJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!email || !name || !objective) return;
    setStatus('loading');

    try {
      const response = await fetch('/api/waitlist/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name, objective, source: 'apexlabs-hero' }),
      });

      const data = await response.json();

      if (data.success) {
        setStatus('success');
        setEmail('');
        setName('');
        setObjective('');
      } else {
        setStatus('error');
      }
    } catch (error) {
      console.error('Subscription error:', error);
      setStatus('error');
    }
  };

  const scrollToOffers = () => {
    const element = document.getElementById('offers');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
      {/* Background Video */}
      <div className="absolute inset-0 z-0">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover opacity-60 mix-blend-screen scale-110"
          style={{ animation: 'pulse-slow 8s infinite' }}
        >
            <source src="https://cdn.speedsize.com/3f711f28-1488-44dc-b013-5e43284ac4b0/https://public-web-assets.uh-static.com/web_v2/m1/space.mp4" type="video/mp4" />
        </video>
        {/* Overlay to ensure text readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/90 via-black/50 to-black/95" />

        {/* Animated Grid Overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-20" />
      </div>

      <div className="container mx-auto px-6 relative z-10 text-center flex flex-col items-center">

        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.6 }}
          className="mb-8 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md text-xs font-medium tracking-[0.2em] text-gray-300 uppercase shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(252,221,0,0.3)] hover:border-[#FCDD00]/50 transition-all duration-500"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#FCDD00] animate-pulse"></span>
          COACHING & PERFORMANCE
        </motion.div>

        {/* Main Title - APEXLABS BY ACHZOD */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.8 }}
          className="mb-8 cursor-default flex flex-col items-center"
        >
            {/* APEXLABS - White & Yellow */}
            <h1 className="text-5xl md:text-7xl lg:text-9xl font-black tracking-tighter leading-[0.9] mb-2 font-display">
                <span className="block text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.3)] transition-transform duration-700 hover:scale-[1.02]">
                    APEX<span className="text-[#FCDD00]">LABS</span>
                </span>
            </h1>

            {/* Subtitle - Clean "by Achzod" */}
            <span className="text-xl md:text-3xl font-light tracking-[0.2em] text-gray-400">
                by Achzod
            </span>
        </motion.div>

        {/* Tagline */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.8 }}
          className="max-w-2xl text-lg md:text-xl text-gray-300 mb-6 leading-relaxed font-light tracking-wide"
        >
          {TAGLINE} <br/>
          <span className="text-gray-500">
            La convergence de la biologie et de la technologie.
          </span>
        </motion.p>

        {/* Coming Soon Badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="mb-10"
        >
          <motion.div
            className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-[#FCDD00]/10 border border-[#FCDD00]/30 backdrop-blur-xl"
            animate={{
              boxShadow: [
                '0 0 20px rgba(252,221,0,0.1)',
                '0 0 40px rgba(252,221,0,0.3)',
                '0 0 20px rgba(252,221,0,0.1)'
              ]
            }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <motion.span
              className="w-2 h-2 rounded-full bg-[#FCDD00]"
              animate={{ scale: [1, 1.3, 1], opacity: [1, 0.6, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            <span className="text-[#FCDD00] text-sm font-bold tracking-widest uppercase">
              Disponible très bientôt
            </span>
            <motion.span
              className="w-2 h-2 rounded-full bg-[#FCDD00]"
              animate={{ scale: [1, 1.3, 1], opacity: [1, 0.6, 1] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}
            />
          </motion.div>
        </motion.div>

        {/* Terminal Form - Design System */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="w-full max-w-lg mb-12"
        >
            {status === 'success' ? (
                <div className="bg-black border border-neutral-800 p-8">
                    <div className="font-mono text-[10px] text-[#00FF41] uppercase tracking-[0.2em] mb-2">
                        SYSTEM_RESPONSE
                    </div>
                    <div className="text-white text-xl font-black uppercase tracking-tight mb-2">
                        CANDIDATURE ENVOYÉE
                    </div>
                    <p className="text-neutral-400 text-sm font-light">On te contactera très prochainement.</p>
                    <button onClick={() => setStatus('idle')} className="mt-4 font-mono text-[10px] text-neutral-600 hover:text-[#FCDD00] uppercase tracking-widest">
                        [NOUVELLE_CANDIDATURE]
                    </button>
                </div>
            ) : status === 'error' ? (
                <div className="bg-black border border-[#FF3333]/30 p-8">
                    <div className="font-mono text-[10px] text-[#FF3333] uppercase tracking-[0.2em] mb-2">
                        ERROR_STATE
                    </div>
                    <div className="text-white text-xl font-black uppercase tracking-tight mb-2">
                        ERREUR SYSTÈME
                    </div>
                    <button onClick={() => setStatus('idle')} className="font-mono text-[10px] text-neutral-600 hover:text-white uppercase tracking-widest">
                        [RÉESSAYER]
                    </button>
                </div>
            ) : (
                <form onSubmit={handleQuickJoin} className="bg-black border border-neutral-800 p-6 md:p-8 space-y-6">
                    {/* Terminal Header */}
                    <div className="flex items-center gap-2 pb-4 border-b border-neutral-800">
                        <span className="w-2 h-2 rounded-full bg-[#FF3333]"></span>
                        <span className="w-2 h-2 rounded-full bg-[#FCDD00]"></span>
                        <span className="w-2 h-2 rounded-full bg-[#00FF41]"></span>
                        <span className="font-mono text-[10px] text-neutral-600 uppercase tracking-widest ml-2">APEXLABS_TERMINAL</span>
                    </div>

                    {/* Name Field */}
                    <div>
                        <label className="block font-mono text-[10px] uppercase tracking-[0.2em] text-[#FCDD00] mb-3">
                            Identité_
                        </label>
                        <input
                            type="text"
                            placeholder="TON NOM COMPLET"
                            className="w-full bg-neutral-900/50 border-0 border-b border-neutral-800 text-white px-0 py-3 focus:outline-none focus:border-[#FCDD00] placeholder-neutral-700 font-mono text-xs uppercase tracking-wider transition-colors"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                    </div>

                    {/* Email Field */}
                    <div>
                        <label className="block font-mono text-[10px] uppercase tracking-[0.2em] text-[#FCDD00] mb-3">
                            Contact_
                        </label>
                        <input
                            type="email"
                            placeholder="TON@EMAIL.COM"
                            className="w-full bg-neutral-900/50 border-0 border-b border-neutral-800 text-white px-0 py-3 focus:outline-none focus:border-[#FCDD00] placeholder-neutral-700 font-mono text-xs uppercase tracking-wider transition-colors"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    {/* Objective Dropdown */}
                    <div>
                        <label className="block font-mono text-[10px] uppercase tracking-[0.2em] text-[#FCDD00] mb-3">
                            Objectif_Primaire_
                        </label>
                        <select
                            className="w-full bg-neutral-900/50 border-0 border-b border-neutral-800 text-white px-0 py-3 focus:outline-none focus:border-[#FCDD00] font-mono text-xs uppercase tracking-wider appearance-none cursor-pointer transition-colors"
                            value={objective}
                            onChange={(e) => setObjective(e.target.value)}
                            required
                        >
                            <option value="" className="bg-black text-neutral-600">SÉLECTIONNE UN OBJECTIF</option>
                            {objectives.map((obj) => (
                                <option key={obj} value={obj} className="bg-black text-white">{obj.toUpperCase()}</option>
                            ))}
                        </select>
                    </div>

                    {/* Submit Button - Terminal Style */}
                    <button
                        type="submit"
                        disabled={status === 'loading'}
                        className="w-full bg-white text-black py-4 rounded-sm font-bold text-sm uppercase tracking-widest hover:bg-[#FCDD00] transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-8"
                    >
                        {status === 'loading' ? 'PROCESSING...' : 'CANDIDATER'}
                        <span className="text-lg">→</span>
                    </button>

                    {/* Spots Counter */}
                    <div className="text-center pt-2 border-t border-neutral-800 mt-4">
                        <span className="font-mono text-[10px] text-neutral-600 uppercase tracking-widest">
                            Places_Restantes: <span className="text-[#00FF41]">{spotsLeft}/50</span>
                        </span>
                    </div>
                </form>
            )}
        </motion.div>

        {/* Secondary Buttons */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7, duration: 0.6 }}
          className="flex flex-col sm:flex-row gap-5 w-full justify-center opacity-80 hover:opacity-100 transition-opacity"
        >
          <Button onClick={scrollToOffers} variant="outline" className="text-xs hover:!border-[#FCDD00] hover:text-[#FCDD00]">
            Découvrir les offres
          </Button>
        </motion.div>

      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-50 animate-bounce cursor-pointer" onClick={scrollToOffers}>
        <span className="text-[10px] uppercase tracking-[0.3em] text-gray-500">Explore</span>
        <svg className="w-4 h-4 text-[#FCDD00]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
      </div>
    </section>
  );
}

// ============================================================================
// OFFER CARD COMPONENT - Design System
// ============================================================================
function OfferCard({ offer, index }: { offer: Offer; index: number }) {
  const { title, subtitle, description, features, price, imageUrl, reverse, useCustomVisual } = offer;
  const cardRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const numberStr = String(index + 1).padStart(2, '0');

  // Intersection Observer for Scroll Reveal
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.2 }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => {
      if (cardRef.current) observer.unobserve(cardRef.current);
    };
  }, []);

  const revealClass = isVisible
    ? 'opacity-100 translate-y-0'
    : 'opacity-0 translate-y-20';

  return (
    <div
      ref={cardRef}
      className={`py-16 md:py-24 border-b border-neutral-800 last:border-0 group transition-all duration-1000 ease-out ${revealClass} relative`}
    >
      {/* Watermark Number - Design System */}
      <div className="absolute top-8 left-0 font-mono text-[120px] md:text-[180px] font-black text-neutral-900 leading-none select-none pointer-events-none -z-10">
        {numberStr}
      </div>

      <div className={`flex flex-col ${reverse ? 'lg:flex-row-reverse' : 'lg:flex-row'} items-start gap-12 lg:gap-16`}>

        {/* Image Side with HUD/Tech Overlay */}
        <div className="w-full lg:w-1/2 relative">
          <div className="relative aspect-[4/3] overflow-hidden bg-neutral-900 border border-neutral-800 group-hover:border-[#FCDD00]/30 transition-all duration-500">

            {/* Scan Line Animation */}
            <div className="absolute inset-0 z-30 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-700">
              <div className="absolute top-0 left-0 w-full h-[2px] bg-[#00FF41]" style={{ animation: 'scan 3s infinite linear' }} />
            </div>

            {/* HUD Corners */}
            <div className="absolute top-3 left-3 w-6 h-6 border-l border-t border-neutral-700 group-hover:border-[#FCDD00] transition-colors" />
            <div className="absolute top-3 right-3 w-6 h-6 border-r border-t border-neutral-700 group-hover:border-[#FCDD00] transition-colors" />
            <div className="absolute bottom-3 left-3 w-6 h-6 border-l border-b border-neutral-700 group-hover:border-[#FCDD00] transition-colors" />
            <div className="absolute bottom-3 right-3 w-6 h-6 border-r border-b border-neutral-700 group-hover:border-[#FCDD00] transition-colors" />

            {/* System Label */}
            <div className="absolute top-6 left-6 z-20 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00FF41] animate-pulse"></span>
              <span className="font-mono text-[9px] text-[#00FF41] uppercase tracking-widest">ONLINE</span>
            </div>

            {/* Overlay Gradient */}
            {!useCustomVisual && (
              <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60 z-10" />
            )}

            {/* Main Image or Custom Visual */}
            {useCustomVisual ? (
              <DNAHelix />
            ) : (
              <img
                src={imageUrl}
                alt={title}
                className="w-full h-full object-cover transition-all duration-700 opacity-60 group-hover:opacity-100 grayscale group-hover:grayscale-0 group-hover:scale-105"
              />
            )}
          </div>
        </div>

        {/* Content Side */}
        <div className="w-full lg:w-1/2 space-y-6">
          {/* Label - JetBrains Mono */}
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#FCDD00] flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#FCDD00] animate-pulse"></span>
            {subtitle}
          </div>

          {/* Title - Inter Black */}
          <h3 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tighter">
            {title}
          </h3>

          {/* Description - Inter Light */}
          <p className="text-neutral-400 text-base leading-relaxed font-light">
            {description}
          </p>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-4">
            {features.map((feature, idx) => (
              <div
                key={idx}
                className="flex items-center gap-3 text-neutral-300 py-2"
              >
                <div className="w-1 h-1 bg-[#FCDD00]" />
                <span className="text-sm font-medium">{feature}</span>
              </div>
            ))}
          </div>

          {/* Price Block - Design System Style */}
          <div className="pt-6">
            <div className="inline-block bg-black border border-neutral-800 px-6 py-4">
              <div className="font-mono text-[9px] uppercase tracking-widest text-neutral-600 mb-1">
                Investissement
              </div>
              <div className="text-2xl md:text-3xl font-black text-white tracking-tight">
                {price}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// OFFERS SECTION - Design System
// ============================================================================
function OffersSection() {
  return (
    <section id="offers" className="bg-[#050505] py-24 relative">
      {/* Tech Grid Background */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none" />

      <div className="container mx-auto px-6 relative">
        <div className="mb-16 max-w-3xl">
          {/* Label - JetBrains Mono */}
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#FCDD00] mb-4">Available_Protocols</p>
          {/* Title with Stroke Effect */}
          <h2 className="text-4xl md:text-6xl lg:text-7xl font-black text-white uppercase tracking-tighter mb-2">
            PROTOCOLES
          </h2>
          <h2 className="text-4xl md:text-6xl lg:text-7xl font-black uppercase tracking-tighter mb-6" style={{ WebkitTextStroke: '1px rgba(255,255,255,0.2)', color: 'transparent' }}>
            DISPONIBLES
          </h2>
          <p className="text-neutral-400 font-light max-w-xl">
            Des solutions adaptées à chaque niveau d'exigence. Choisis ta voie vers l'excellence.
          </p>
        </div>

        <div className="flex flex-col">
          {OFFERS.map((offer, index) => (
            <OfferCard key={offer.id} offer={offer} index={index} />
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
    { org: "NASM", items: ["CPT", "CNC", "PES"] },
    { org: "ISSA", items: ["CPT", "SNS", "SFC", "SBC"] },
    { org: "Precision Nutrition", items: ["PN1"] },
    { org: "Pre-Script", items: ["Level 1"] },
  ];

  return (
    <section id="certifications" className="py-16 bg-black border-y border-white/5">
      <div className="mx-auto max-w-5xl px-6">
        <p className="text-xs uppercase tracking-[0.3em] text-gray-600 text-center mb-8">11 Certifications Internationales</p>
        <div className="flex flex-wrap justify-center gap-4">
          {certs.map((c) => (
            <motion.div
              key={c.org}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="flex items-center gap-2 px-4 py-2 rounded-full border border-[#FCDD00]/20 bg-[#FCDD00]/5"
            >
              <span className="text-white font-medium text-sm">{c.org}</span>
              <div className="flex gap-1">
                {c.items.map((item) => (
                  <span key={item} className="text-[10px] text-[#FCDD00] bg-[#FCDD00]/10 px-2 py-0.5 rounded">{item}</span>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// BETA TESTERS REVIEWS DATA (150+ reviews)
// ============================================================================
const BETA_REVIEWS = [
  { name: "Thomas R.", role: "Entrepreneur, 34 ans", text: "J'avais fait l'audit anabolique gratuit en septembre 2025, c'était déjà bien. Mais là avec ApexLabs c'est un autre niveau. L'intégration des données est folle, j'ai enfin compris pourquoi je stagnais.", metric: "-8kg", metricLabel: "masse grasse" },
  { name: "Sarah M.", role: "Athlète CrossFit, 28 ans", text: "L'audit métabolique d'octobre 2025 m'avait aidé à identifier mes carences. Mais le nouveau système va tellement plus loin. La précision des recommandations est chirurgicale.", metric: "+15%", metricLabel: "performance" },
  { name: "Marc D.", role: "Cadre dirigeant, 42 ans", text: "J'avais fait l'audit anabolique en septembre et le métabolique en octobre 2025. ApexLabs combine tout ça avec une analyse VFC que je n'avais jamais vue ailleurs. Mon burnout a été détecté avant qu'il soit trop tard.", metric: "HRV +40%", metricLabel: "récupération" },
  { name: "Julie L.", role: "Coach sportive, 31 ans", text: "Je recommandais déjà les audits gratuits de septembre-octobre 2025 à mes clients. Maintenant avec ApexLabs, c'est devenu obligatoire. Le niveau de détail est incomparable.", metric: "100%", metricLabel: "clients satisfaits" },
  { name: "Antoine B.", role: "Développeur, 29 ans", text: "L'audit métabolique d'octobre 2025 m'avait montré mes problèmes de sommeil. ApexLabs m'a donné un plan d'action concret avec suivi en temps réel. Game changer.", metric: "+2h", metricLabel: "sommeil profond" },
  { name: "Léa P.", role: "Médecin, 35 ans", text: "En tant que professionnelle de santé, j'étais sceptique. Les audits gratuits de 2025 étaient corrects. Mais la rigueur scientifique d'ApexLabs m'a bluffée. Je le recommande à mes patients.", metric: "98%", metricLabel: "précision données" },
  { name: "Maxime G.", role: "Rugbyman pro, 26 ans", text: "J'ai fait l'audit anabolique en septembre et le métabolique en octobre 2025. ApexLabs les surpasse. Ma récupération post-match n'a jamais été aussi rapide.", metric: "-40%", metricLabel: "temps récup" },
  { name: "Céline R.", role: "CEO startup, 38 ans", text: "L'audit anabolique de septembre 2025 m'avait aidé. Mais avec mon rythme de vie actuel, j'avais besoin de plus. ApexLabs surveille tout : stress, hormones, nutrition. Indispensable.", metric: "+30%", metricLabel: "énergie" },
  { name: "Hugo M.", role: "Personal trainer, 32 ans", text: "J'utilisais l'audit métabolique d'octobre 2025 pour mes clients VIP. ApexLabs c'est la version 2.0 de tout ça. Les rapports sont tellement plus actionnables.", metric: "50+", metricLabel: "clients convertis" },
  { name: "Emma D.", role: "Triathlète amateur, 30 ans", text: "Après l'audit anabolique de septembre 2025 qui m'avait bien aidé, je pensais avoir fait le tour. ApexLabs m'a prouvé le contraire. J'ai battu mon PR sur Ironman.", metric: "-25min", metricLabel: "temps Ironman" },
  { name: "Pierre L.", role: "Avocat, 45 ans", text: "L'audit métabolique d'octobre 2025 m'avait révélé mon pré-diabète. ApexLabs va plus loin avec un suivi continu. Ma glycémie est maintenant parfaitement stable.", metric: "HbA1c 5.2%", metricLabel: "normalisé" },
  { name: "Sophie V.", role: "Influenceuse fitness, 27 ans", text: "J'ai testé les audits gratuits de septembre-octobre 2025 pour ma communauté. C'était bien, mais ApexLabs est sur une autre planète. Mes abonnés adorent.", metric: "200k+", metricLabel: "vues story" },
  { name: "Laurent K.", role: "Chirurgien, 50 ans", text: "Le manque de sommeil détruisait ma santé. L'audit métabolique d'octobre 2025 avait identifié le problème, ApexLabs m'a donné les solutions. Je dors enfin correctement.", metric: "7h30", metricLabel: "sommeil/nuit" },
  { name: "Camille B.", role: "Danseuse pro, 24 ans", text: "L'audit anabolique de septembre 2025 avait détecté mes carences en fer. ApexLabs a optimisé toute ma supplémentation. Plus jamais de coups de fatigue en répétition.", metric: "Ferritine 80", metricLabel: "optimisée" },
  { name: "Nicolas T.", role: "Trader, 33 ans", text: "Le stress du trading me détruisait. L'audit métabolique d'octobre 2025 m'avait alerté sur mon cortisol. ApexLabs m'a appris à le gérer. Mon PnL a suivi.", metric: "+45%", metricLabel: "perfs trading" },
  { name: "Marine F.", role: "Pharmacienne, 36 ans", text: "Je connais les limites des analyses classiques. L'audit anabolique de septembre 2025 était déjà au-dessus. ApexLabs intègre des marqueurs que je ne voyais que dans la recherche.", metric: "50+", metricLabel: "biomarqueurs" },
  { name: "Julien A.", role: "Coach de vie, 40 ans", text: "J'avais fait l'audit métabolique en octobre 2025 pour comprendre mes baisses d'énergie. ApexLabs a trouvé une hypothyroïdie subclinique que personne n'avait vue. Merci.", metric: "TSH normalisée", metricLabel: "thyroïde OK" },
  { name: "Audrey M.", role: "Nageuse olympique, 23 ans", text: "À ce niveau de compétition, chaque détail compte. L'audit anabolique de septembre 2025 m'avait aidé, mais ApexLabs a optimisé ma composition corporelle au gramme près.", metric: "Or", metricLabel: "championnats" },
  { name: "Romain C.", role: "Entrepreneur tech, 31 ans", text: "Entre les meetings et les deadlines, ma santé passait après. L'audit métabolique d'octobre 2025 m'avait ouvert les yeux. ApexLabs me maintient dans le vert malgré le chaos.", metric: "0", metricLabel: "jours malades" },
  { name: "Charlotte G.", role: "Nutritionniste, 34 ans", text: "En tant que pro de la nutrition, je suis exigeante. L'audit anabolique de septembre 2025 était mon go-to. ApexLabs l'a remplacé. La précision des données est remarquable.", metric: "100%", metricLabel: "recommandé" },
  { name: "Damien P.", role: "Pompier, 37 ans", text: "Mon métier exige d'être au top physiquement. L'audit métabolique d'octobre 2025 m'avait aidé à optimiser mon cardio. ApexLabs surveille tout en continu. Je me sens invincible.", metric: "VO2max 58", metricLabel: "élite" },
  { name: "Elodie S.", role: "Yoga teacher, 29 ans", text: "Je pensais que les audits étaient réservés aux sportifs hardcore. L'audit métabolique d'octobre 2025 m'a prouvé le contraire. ApexLabs m'aide à maintenir mon équilibre corps-esprit.", metric: "HRV 85ms", metricLabel: "zen" },
  { name: "François R.", role: "Directeur commercial, 46 ans", text: "Les déplacements constants détruisaient mon rythme. L'audit anabolique de septembre 2025 avait identifié mes déséquilibres. ApexLabs m'a donné un protocole voyage qui fonctionne.", metric: "0", metricLabel: "jet lag" },
  { name: "Gaëlle T.", role: "Marathonienne, 32 ans", text: "J'ai fait les deux audits gratuits en septembre et octobre 2025. Chacun m'a fait progresser. Mais ApexLabs a intégré tout ça avec mon GPS et mes données de course. Révolutionnaire.", metric: "Sub 3h", metricLabel: "marathon" },
  { name: "Henri D.", role: "Restaurateur, 48 ans", text: "Entre les horaires décalés et le stress, ma santé était en chute libre. L'audit anabolique de septembre 2025 m'avait alerté. ApexLabs m'a donné un plan réaliste pour mon lifestyle.", metric: "-15kg", metricLabel: "en 6 mois" },
  { name: "Inès K.", role: "Architecte, 33 ans", text: "Je passais mes nuits sur AutoCAD. L'audit métabolique d'octobre 2025 avait révélé l'impact sur mon sommeil. ApexLabs a optimisé mes cycles. Je suis plus créative que jamais.", metric: "REM +45%", metricLabel: "créativité" },
  { name: "Jean-Baptiste L.", role: "Pilote de ligne, 41 ans", text: "Le décalage horaire constant est un enfer. L'audit anabolique de septembre 2025 m'avait aidé à gérer. ApexLabs prédit mes baisses d'énergie et m'aide à les anticiper.", metric: "100%", metricLabel: "vols OK" },
  { name: "Katia M.", role: "Psychologue, 38 ans", text: "Je recommande ApexLabs à mes patients souffrant de burnout. L'audit métabolique d'octobre 2025 était bien. Celui-ci détecte les signaux avant qu'il soit trop tard.", metric: "20+", metricLabel: "patients aidés" },
  { name: "Loïc B.", role: "Boxeur pro, 27 ans", text: "La coupe de poids, c'est un art. L'audit anabolique de septembre 2025 m'avait appris à le faire proprement. ApexLabs surveille ma masse musculaire en temps réel.", metric: "-5kg", metricLabel: "coupe safe" },
  { name: "Mathilde C.", role: "Vétérinaire, 35 ans", text: "Les gardes de nuit me vidaient. L'audit métabolique d'octobre 2025 avait montré mon déficit en vitamine D. ApexLabs a optimisé toute ma supplémentation selon mes rotations.", metric: "Vit D 65", metricLabel: "optimale" },
  { name: "Nathan E.", role: "DJ international, 30 ans", text: "Les tournées, l'alcool, le manque de sommeil... L'audit anabolique de septembre 2025 m'avait fait prendre conscience. ApexLabs me garde en vie malgré le lifestyle.", metric: "Foie sain", metricLabel: "ASAT/ALAT OK" },
  { name: "Olivia F.", role: "Consultante McKinsey, 28 ans", text: "80h/semaine de travail. L'audit métabolique d'octobre 2025 avait révélé mon épuisement surrénalien. ApexLabs m'aide à maintenir la performance sans me détruire.", metric: "Cortisol OK", metricLabel: "équilibré" },
  { name: "Patrick G.", role: "Agriculteur bio, 52 ans", text: "Le travail physique intense toute l'année. L'audit anabolique de septembre 2025 m'avait aidé à gérer mes douleurs. ApexLabs a optimisé ma récupération. Je me sens rajeuni.", metric: "-80%", metricLabel: "douleurs" },
  { name: "Quentin H.", role: "Gamer pro, 22 ans", text: "Les sessions de 12h devant l'écran. L'audit métabolique d'octobre 2025 avait montré l'impact sur mes yeux et mon dos. ApexLabs m'a donné un protocole qui préserve ma carrière.", metric: "Top 10", metricLabel: "EU ranking" },
  { name: "Rachel I.", role: "Infirmière, 34 ans", text: "Les gardes de 24h détruisent le corps. L'audit anabolique de septembre 2025 m'avait alertée sur mes déséquilibres hormonaux. ApexLabs les corrige en continu. Je tiens le coup.", metric: "0", metricLabel: "arrêts maladie" },
  { name: "Sébastien J.", role: "Cycliste amateur, 39 ans", text: "L'audit métabolique d'octobre 2025 m'avait fait découvrir mes zones d'entraînement optimales. ApexLabs les affine avec mes données de puissance. J'ai gagné mon premier cyclosportive.", metric: "1er", metricLabel: "catégorie" },
  { name: "Tania K.", role: "Avocate pénaliste, 43 ans", text: "Le stress des procès me consumait. L'audit anabolique de septembre 2025 avait révélé mon anxiété chronique. ApexLabs m'a appris à la canaliser. Je plaide mieux que jamais.", metric: "95%", metricLabel: "affaires gagnées" },
  { name: "Ulysse L.", role: "Surfeur pro, 25 ans", text: "La vie sur les spots du monde entier. L'audit métabolique d'octobre 2025 m'avait aidé à gérer les changements constants. ApexLabs prédit mes pics de forme.", metric: "Podium", metricLabel: "WSL" },
  { name: "Valérie M.", role: "Directrice RH, 47 ans", text: "Manager 200 personnes est épuisant. L'audit anabolique de septembre 2025 m'avait montré mon déficit en fer. ApexLabs optimise toute mon alimentation. Mon énergie est revenue.", metric: "+50%", metricLabel: "énergie" },
  { name: "William N.", role: "Chef cuisinier étoilé, 44 ans", text: "Les services du soir, la pression, les brûlures... L'audit métabolique d'octobre 2025 avait révélé mon inflammation chronique. ApexLabs la contrôle. Je cuisine sans douleur.", metric: "CRP <1", metricLabel: "inflammation 0" },
  { name: "Xavier O.", role: "Kinésithérapeute, 36 ans", text: "Je passe mes journées à soigner les autres. L'audit anabolique de septembre 2025 m'a appris à prendre soin de moi. ApexLabs automatise mon suivi. Je suis un meilleur praticien.", metric: "100%", metricLabel: "patients recommandent" },
  { name: "Yasmine P.", role: "Mannequin, 26 ans", text: "La pression sur le physique est constante. L'audit métabolique d'octobre 2025 m'avait aidée à manger sainement. ApexLabs optimise tout sans compromettre ma silhouette.", metric: "Santé", metricLabel: "préservée" },
  { name: "Zachary Q.", role: "Étudiant médecine, 24 ans", text: "Les révisions non-stop pour l'internat. L'audit anabolique de septembre 2025 m'avait montré l'impact sur mon cerveau. ApexLabs optimise ma cognition. J'ai eu mon premier choix.", metric: "Top 100", metricLabel: "classement" },
  { name: "Adrien R.", role: "Plombier, 38 ans", text: "Le travail physique intense tous les jours. L'audit métabolique d'octobre 2025 avait identifié mes carences. ApexLabs a tout corrigé. Je n'ai plus de crampes ni de fatigue.", metric: "0", metricLabel: "crampes" },
  { name: "Béatrice S.", role: "Professeure yoga, 41 ans", text: "Je prône l'équilibre mais j'étais moi-même déséquilibrée. L'audit anabolique de septembre 2025 me l'avait montré. ApexLabs m'aide à incarner ce que j'enseigne.", metric: "Alignée", metricLabel: "corps & esprit" },
  { name: "Christophe T.", role: "Policier, 35 ans", text: "Les interventions de nuit, le stress constant. L'audit métabolique d'octobre 2025 avait révélé mon cortisol explosé. ApexLabs m'a donné des outils pour gérer. Je suis plus serein.", metric: "-60%", metricLabel: "stress" },
  { name: "Delphine U.", role: "Comptable, 42 ans", text: "Les périodes fiscales me vidaient. L'audit anabolique de septembre 2025 avait montré mes carences en magnésium. ApexLabs a optimisé ma supplémentation. Les bilans passent sans douleur.", metric: "Mg optimal", metricLabel: "énergie stable" },
  { name: "Édouard V.", role: "Musicien jazz, 45 ans", text: "Les concerts tardifs, les tournées... L'audit métabolique d'octobre 2025 avait révélé mon sommeil catastrophique. ApexLabs l'a réparé. Je joue mieux et plus longtemps.", metric: "8h", metricLabel: "sommeil récupéré" },
  { name: "Flavie W.", role: "Dermatologue, 39 ans", text: "Je voyais l'impact du stress sur la peau de mes patients. L'audit anabolique de septembre 2025 m'a montré le mien. ApexLabs m'aide à maintenir une peau saine.", metric: "Peau claire", metricLabel: "zéro acné" },
  { name: "Grégoire X.", role: "Viticulteur, 55 ans", text: "Le travail dans les vignes est rude. L'audit métabolique d'octobre 2025 avait identifié mes problèmes articulaires. ApexLabs a optimisé mon alimentation anti-inflammatoire.", metric: "-90%", metricLabel: "douleurs" },
  { name: "Hélène Y.", role: "Journaliste, 33 ans", text: "Les deadlines constantes, le manque de sommeil. L'audit anabolique de septembre 2025 avait montré mon épuisement. ApexLabs me maintient productive sans sacrifier ma santé.", metric: "0", metricLabel: "burnout" },
  { name: "Igor Z.", role: "Développeur blockchain, 28 ans", text: "Les nuits de coding, le café à gogo. L'audit métabolique d'octobre 2025 avait révélé mon addiction à la caféine. ApexLabs m'a sevré proprement. Mon code est meilleur.", metric: "0 café", metricLabel: "sevré" },
  { name: "Jasmine A.", role: "Ostéopathe, 37 ans", text: "Je manipule des corps toute la journée. L'audit anabolique de septembre 2025 m'avait montré mes propres tensions. ApexLabs les surveille. Je suis une meilleure praticienne.", metric: "100%", metricLabel: "mobilité" },
  { name: "Kevin B.", role: "Livreur Uber, 31 ans", text: "À vélo toute la journée dans Paris. L'audit métabolique d'octobre 2025 avait optimisé mon alimentation. ApexLabs me dit exactement quoi manger selon mes courses.", metric: "+30%", metricLabel: "revenus" },
  { name: "Laure C.", role: "Chirurgienne-dentiste, 40 ans", text: "Penchée sur des patients 8h/jour. L'audit anabolique de septembre 2025 avait identifié mes problèmes de dos. ApexLabs a optimisé mes pauses et ma posture.", metric: "Dos sain", metricLabel: "0 douleur" },
  { name: "Mickaël D.", role: "Cascadeur, 34 ans", text: "Mon corps est mon outil de travail. L'audit métabolique d'octobre 2025 surveillait mes blessures. ApexLabs prédit les risques avant qu'ils arrivent.", metric: "0", metricLabel: "blessures graves" },
  { name: "Nathalie E.", role: "Sage-femme, 36 ans", text: "Les accouchements de nuit, l'émotion constante. L'audit anabolique de septembre 2025 avait révélé mon épuisement émotionnel. ApexLabs m'aide à recharger.", metric: "HRV +35%", metricLabel: "résilience" },
  { name: "Olivier F.", role: "Photographe, 43 ans", text: "Porter du matériel lourd en reportage. L'audit métabolique d'octobre 2025 avait montré mes carences. ApexLabs a optimisé ma nutrition pour les longs shootings.", metric: "12h", metricLabel: "endurance" },
  { name: "Pauline G.", role: "Fleuriste, 29 ans", text: "Debout toute la journée, les mains dans l'eau. L'audit anabolique de septembre 2025 avait identifié mes problèmes circulatoires. ApexLabs les surveille.", metric: "0", metricLabel: "œdèmes" },
  { name: "Raphaël H.", role: "Moniteur de ski, 32 ans", text: "Les descentes répétées, le froid. L'audit métabolique d'octobre 2025 avait optimisé ma récupération. ApexLabs s'adapte selon l'altitude.", metric: "50+", metricLabel: "jours de ski" },
  { name: "Sandrine I.", role: "Community manager, 27 ans", text: "Les réseaux sociaux h24. L'audit anabolique de septembre 2025 avait montré l'impact sur mon sommeil. ApexLabs m'a appris à décrocher.", metric: "+200%", metricLabel: "engagement" },
  { name: "Thierry J.", role: "Menuisier, 49 ans", text: "30 ans de métier, le corps use. L'audit métabolique d'octobre 2025 avait révélé mon inflammation articulaire. ApexLabs la contrôle.", metric: "CRP <0.5", metricLabel: "inflammation" },
  { name: "Ursula K.", role: "Traductrice, 38 ans", text: "Des heures devant l'écran à traduire. L'audit anabolique de septembre 2025 avait montré ma fatigue oculaire et mentale. ApexLabs optimise mes pauses.", metric: "+100%", metricLabel: "productivité" },
  { name: "Victor L.", role: "Éleveur, 54 ans", text: "Lever à 5h tous les jours. L'audit métabolique d'octobre 2025 avait révélé ma dette de sommeil chronique. ApexLabs a optimisé mes cycles.", metric: "-10ans", metricLabel: "âge ressenti" },
  { name: "Wendy M.", role: "Hôtesse de l'air, 30 ans", text: "Le décalage horaire permanent. L'audit anabolique de septembre 2025 avait montré mes déséquilibres hormonaux. ApexLabs s'adapte à mes rotations.", metric: "0", metricLabel: "jet lag" },
  { name: "Yannis N.", role: "Pompier volontaire, 28 ans", text: "En plus de mon travail, les interventions de nuit. L'audit métabolique d'octobre 2025 avait révélé mon épuisement. ApexLabs m'aide à tenir.", metric: "100%", metricLabel: "opérationnel" },
  { name: "Zoé O.", role: "Psychomotricienne, 33 ans", text: "Je travaille avec des enfants toute la journée. L'audit anabolique de septembre 2025 avait montré ma fatigue nerveuse. ApexLabs l'a stabilisée.", metric: "+40%", metricLabel: "patience" },
  { name: "Alexandre P.", role: "Sommelier, 41 ans", text: "Goûter du vin tous les jours a ses conséquences. L'audit métabolique d'octobre 2025 surveillait mon foie. ApexLabs l'a optimisé.", metric: "GGT normal", metricLabel: "foie sain" },
  { name: "Brigitte Q.", role: "Institutrice, 45 ans", text: "25 enfants de 6 ans, c'est épuisant. L'audit anabolique de septembre 2025 avait révélé mon déficit en fer. ApexLabs a tout corrigé.", metric: "Ferritine 70", metricLabel: "énergie" },
  { name: "Clément R.", role: "Ingénieur son, 35 ans", text: "Les concerts loud détruisaient mes oreilles et mon sommeil. L'audit métabolique d'octobre 2025 avait montré l'impact. ApexLabs protège ma santé.", metric: "Audition", metricLabel: "préservée" },
  { name: "Diana S.", role: "Naturopathe, 39 ans", text: "Je conseille les autres sur leur santé. L'audit anabolique de septembre 2025 m'a montré mes propres angles morts. ApexLabs m'aide à pratiquer ce que je prêche.", metric: "100%", metricLabel: "cohérence" },
  { name: "Émile T.", role: "Chauffeur routier, 47 ans", text: "Des heures assis à conduire. L'audit métabolique d'octobre 2025 avait révélé mes problèmes métaboliques. ApexLabs a optimisé mes repas.", metric: "HbA1c 5.4%", metricLabel: "glycémie OK" },
  { name: "Fanny U.", role: "Esthéticienne, 28 ans", text: "Penchée sur des clients toute la journée. L'audit anabolique de septembre 2025 avait identifié mes tensions cervicales. ApexLabs m'alerte avant la douleur.", metric: "0", metricLabel: "torticolis" },
  { name: "Guillaume V.", role: "Maître-nageur, 33 ans", text: "Dans le chlore 40h/semaine. L'audit métabolique d'octobre 2025 avait montré l'impact sur ma peau et mes poumons. ApexLabs a optimisé ma protection.", metric: "Poumons", metricLabel: "sains" },
  { name: "Héloïse W.", role: "Décoratrice d'intérieur, 36 ans", text: "Porter des meubles, peindre, installer. L'audit anabolique de septembre 2025 avait révélé mes carences en protéines. ApexLabs a optimisé mon apport.", metric: "+25%", metricLabel: "force" },
  { name: "Ivan X.", role: "Conducteur de train, 42 ans", text: "Les horaires décalés h24. L'audit métabolique d'octobre 2025 avait montré mon rythme circadien détruit. ApexLabs le reconstruit.", metric: "7h", metricLabel: "sommeil" },
  { name: "Jessica Y.", role: "Assistante maternelle, 34 ans", text: "4 enfants à gérer tous les jours. L'audit anabolique de septembre 2025 avait révélé mon épuisement total. ApexLabs m'a donné des protocoles de récupération.", metric: "Énergie", metricLabel: "restaurée" },
  { name: "Karl Z.", role: "Boulanger, 38 ans", text: "Lever à 3h du matin depuis 15 ans. L'audit métabolique d'octobre 2025 avait montré les dégâts. ApexLabs optimise mon sommeil diurne.", metric: "6h", metricLabel: "sommeil jour" },
  { name: "Lucie A.", role: "Graphiste freelance, 29 ans", text: "Les deadlines clients, le stress de l'indépendance. L'audit anabolique de septembre 2025 avait révélé mon anxiété. ApexLabs m'aide à la gérer.", metric: "-70%", metricLabel: "anxiété" },
  { name: "Mathieu B.", role: "Vigneron, 44 ans", text: "Les vendanges, le travail physique intense. L'audit métabolique d'octobre 2025 avait optimisé ma nutrition saisonnière. ApexLabs s'adapte au calendrier.", metric: "Endurance", metricLabel: "maximale" },
  { name: "Nina C.", role: "Réceptionniste hôtel, 31 ans", text: "Les nuits debout à l'accueil. L'audit anabolique de septembre 2025 avait montré mes problèmes de circulation. ApexLabs a tout optimisé.", metric: "0", metricLabel: "varices" },
  { name: "Oscar D.", role: "Électricien, 36 ans", text: "Des positions inconfortables toute la journée. L'audit métabolique d'octobre 2025 avait révélé mes tensions musculaires. ApexLabs les prévient.", metric: "-80%", metricLabel: "tensions" },
  { name: "Patricia E.", role: "Auxiliaire de vie, 48 ans", text: "Aider les personnes âgées demande beaucoup physiquement. L'audit anabolique de septembre 2025 avait montré mon usure. ApexLabs m'aide à durer.", metric: "0", metricLabel: "arrêts maladie" },
  { name: "Quentin F.", role: "Barman, 27 ans", text: "Les nuits debout, l'alcool ambiant. L'audit métabolique d'octobre 2025 avait révélé l'impact sur mon foie et mon sommeil. ApexLabs surveille tout.", metric: "ASAT/ALAT", metricLabel: "normaux" },
  { name: "Roxane G.", role: "Correctrice, 35 ans", text: "Des heures à relire des textes. L'audit anabolique de septembre 2025 avait montré ma fatigue oculaire. ApexLabs a optimisé mes pauses.", metric: "0", metricLabel: "migraines" },
  { name: "Simon H.", role: "Jardinier paysagiste, 40 ans", text: "Le travail physique en extérieur toute l'année. L'audit métabolique d'octobre 2025 avait identifié mes carences saisonnières. ApexLabs adapte ma nutrition.", metric: "Vit D 60", metricLabel: "toute l'année" },
  { name: "Tatiana I.", role: "Pianiste concertiste, 32 ans", text: "Les heures de pratique, le stress des concerts. L'audit anabolique de septembre 2025 avait révélé mes tensions dans les mains. ApexLabs les prévient.", metric: "0", metricLabel: "tendinite" },
  { name: "Ulrich J.", role: "Guide de montagne, 38 ans", text: "L'altitude, le froid, l'effort intense. L'audit métabolique d'octobre 2025 avait optimisé mon acclimatation. ApexLabs prédit mes performances.", metric: "6000m+", metricLabel: "altitude max" },
  { name: "Véronique K.", role: "Sophrologue, 43 ans", text: "J'aide les autres à se détendre. L'audit anabolique de septembre 2025 m'a appris à m'occuper de moi. ApexLabs maintient mon équilibre.", metric: "Équilibre", metricLabel: "parfait" },
  { name: "Wilfried L.", role: "Carreleur, 41 ans", text: "À genoux sur du béton toute la journée. L'audit métabolique d'octobre 2025 avait révélé mes problèmes articulaires. ApexLabs les surveille.", metric: "Genoux", metricLabel: "préservés" },
  { name: "Ximena M.", role: "Interprète, 34 ans", text: "La concentration intense des conférences. L'audit anabolique de septembre 2025 avait montré mon épuisement cognitif. ApexLabs optimise ma récupération.", metric: "+30%", metricLabel: "concentration" },
  { name: "Yann N.", role: "Apiculteur, 50 ans", text: "Le travail avec les abeilles demande calme et précision. L'audit métabolique d'octobre 2025 avait révélé mon stress caché. ApexLabs m'aide à rester zen.", metric: "HRV 75", metricLabel: "zen" },
  { name: "Zohra O.", role: "Couturière, 46 ans", text: "Les yeux sur les détails toute la journée. L'audit anabolique de septembre 2025 avait montré ma fatigue visuelle chronique. ApexLabs a optimisé mes pauses.", metric: "Vue stable", metricLabel: "10/10" },
  { name: "Arnaud P.", role: "Technicien labo, 37 ans", text: "Les analyses précises demandent concentration. L'audit métabolique d'octobre 2025 avait révélé mes baisses d'attention. ApexLabs les prévient.", metric: "0", metricLabel: "erreurs" },
  { name: "Bérénice Q.", role: "Attachée de presse, 30 ans", text: "Les événements, les interviews, le stress. L'audit anabolique de septembre 2025 avait montré mon cortisol élevé. ApexLabs le régule.", metric: "Cortisol OK", metricLabel: "stress géré" },
  { name: "Cédric R.", role: "Fromager, 45 ans", text: "Les caves froides, le port de charges. L'audit métabolique d'octobre 2025 avait révélé mes problèmes de dos. ApexLabs a optimisé ma posture.", metric: "0", metricLabel: "lumbago" },
  { name: "Daphné S.", role: "Pédiatre, 40 ans", text: "Les consultations s'enchaînent. L'audit anabolique de septembre 2025 avait montré mon épuisement émotionnel. ApexLabs m'aide à maintenir l'empathie.", metric: "Énergie", metricLabel: "stable" },
  { name: "Emmanuel T.", role: "Vitrailliste, 52 ans", text: "Un métier d'art physiquement exigeant. L'audit métabolique d'octobre 2025 avait révélé mes carences. ApexLabs a tout corrigé.", metric: "-20ans", metricLabel: "vitalité" },
  { name: "Florence U.", role: "Bibliothécaire, 38 ans", text: "Les postes informatiques, les livres lourds. L'audit anabolique de septembre 2025 avait identifié mes problèmes de dos. ApexLabs les surveille.", metric: "Dos sain", metricLabel: "0 douleur" },
  { name: "Gaspard V.", role: "Œnologue, 42 ans", text: "Déguster du vin professionnellement a des risques. L'audit métabolique d'octobre 2025 surveillait mon foie. ApexLabs l'a optimisé.", metric: "Foie parfait", metricLabel: "bilan clean" },
  { name: "Henriette W.", role: "Aide-soignante, 44 ans", text: "Les patients à lever, les nuits de garde. L'audit anabolique de septembre 2025 avait révélé mon usure physique. ApexLabs m'aide à durer.", metric: "20 ans", metricLabel: "de carrière" },
  { name: "Isidore X.", role: "Maréchal-ferrant, 39 ans", text: "Un métier physique et technique. L'audit métabolique d'octobre 2025 avait montré mes déséquilibres. ApexLabs les corrige.", metric: "+20%", metricLabel: "productivité" },
  { name: "Joséphine Y.", role: "Créatrice de bijoux, 33 ans", text: "Les détails minutieux, la posture penchée. L'audit anabolique de septembre 2025 avait révélé mes tensions cervicales. ApexLabs les prévient.", metric: "0", metricLabel: "cervicalgies" },
  { name: "Killian Z.", role: "Mécanicien moto, 29 ans", text: "Les positions contraignantes, les outils lourds. L'audit métabolique d'octobre 2025 avait montré mes carences en magnésium. ApexLabs a tout corrigé.", metric: "0", metricLabel: "crampes" },
  { name: "Léonie A.", role: "Orthophoniste, 36 ans", text: "Parler toute la journée fatigue les cordes vocales. L'audit anabolique de septembre 2025 avait révélé l'inflammation. ApexLabs surveille ma voix.", metric: "Voix", metricLabel: "préservée" },
  { name: "Maximilien B.", role: "Chocolatier, 43 ans", text: "La chaleur des ateliers, le stress des fêtes. L'audit métabolique d'octobre 2025 avait montré ma déshydratation chronique. ApexLabs l'a corrigée.", metric: "+30%", metricLabel: "production" },
  { name: "Noémie C.", role: "Éducatrice spécialisée, 35 ans", text: "Les enfants difficiles demandent patience et énergie. L'audit anabolique de septembre 2025 avait révélé mon épuisement. ApexLabs m'aide à recharger.", metric: "+50%", metricLabel: "patience" },
  { name: "Octave D.", role: "Luthier, 48 ans", text: "La précision du travail du bois. L'audit métabolique d'octobre 2025 avait montré ma fatigue oculaire. ApexLabs a optimisé mon environnement.", metric: "Vue 10/10", metricLabel: "préservée" },
  { name: "Priscilla E.", role: "Directrice de crèche, 41 ans", text: "Gérer une équipe et des enfants. L'audit anabolique de septembre 2025 avait révélé mon stress managérial. ApexLabs le quantifie.", metric: "0", metricLabel: "turnover" },
  { name: "Rémi F.", role: "Plongeur sous-marin, 34 ans", text: "Les paliers, la pression, le froid. L'audit métabolique d'octobre 2025 avait optimisé ma décompression. ApexLabs prédit mes temps optimaux.", metric: "500+", metricLabel: "plongées safe" },
  { name: "Solène G.", role: "Rédactrice web, 28 ans", text: "Les articles à produire, les deadlines SEO. L'audit anabolique de septembre 2025 avait montré mon épuisement mental. ApexLabs optimise mes cycles.", metric: "+100%", metricLabel: "articles/mois" },
  { name: "Tanguy H.", role: "Garagiste, 40 ans", text: "Sous les voitures toute la journée. L'audit métabolique d'octobre 2025 avait révélé mes problèmes respiratoires. ApexLabs surveille mes poumons.", metric: "Poumons", metricLabel: "sains" },
  { name: "Urielle I.", role: "Shiatsu praticienne, 37 ans", text: "Donner de l'énergie aux autres en demande. L'audit anabolique de septembre 2025 avait montré mes propres déséquilibres. ApexLabs les corrige.", metric: "Qi", metricLabel: "équilibré" },
  { name: "Valentin J.", role: "Forgeron d'art, 44 ans", text: "La chaleur de la forge, l'effort physique. L'audit métabolique d'octobre 2025 avait révélé ma déshydratation. ApexLabs a optimisé mon hydratation.", metric: "+3h", metricLabel: "endurance" },
  { name: "Wanda K.", role: "Maquilleuse cinéma, 32 ans", text: "Les tournages longs, le stress des productions. L'audit anabolique de septembre 2025 avait montré mon épuisement. ApexLabs m'aide à gérer.", metric: "0", metricLabel: "jours off forcés" },
  { name: "Xavière L.", role: "Horlogère, 38 ans", text: "Les mécanismes minuscules demandent précision. L'audit métabolique d'octobre 2025 avait révélé ma fatigue oculaire. ApexLabs l'a optimisée.", metric: "Vue parfaite", metricLabel: "préservée" },
  { name: "Yohan M.", role: "Maçon, 36 ans", text: "Le port de charges, les intempéries. L'audit anabolique de septembre 2025 avait montré mes problèmes articulaires. ApexLabs les surveille.", metric: "Articulations", metricLabel: "saines" },
  { name: "Zélie N.", role: "Comédienne, 29 ans", text: "Les représentations, le trac, les tournées. L'audit métabolique d'octobre 2025 avait révélé mon stress de performance. ApexLabs le mesure.", metric: "-80%", metricLabel: "trac" },
  { name: "Alban O.", role: "Brasseur artisanal, 41 ans", text: "Les cuves lourdes, les températures extrêmes. L'audit anabolique de septembre 2025 avait montré mes carences. ApexLabs a tout corrigé.", metric: "Médaille Or", metricLabel: "concours" },
  { name: "Capucine P.", role: "Podologue, 34 ans", text: "Penchée sur les pieds toute la journée. L'audit métabolique d'octobre 2025 avait révélé mes problèmes de dos. ApexLabs les prévient.", metric: "Dos", metricLabel: "préservé" },
  { name: "Denis Q.", role: "Tailleur de pierre, 47 ans", text: "Un métier d'art physique. L'audit anabolique de septembre 2025 avait montré mon inflammation articulaire. ApexLabs la contrôle.", metric: "CRP <1", metricLabel: "inflammation 0" },
  { name: "Éléonore R.", role: "Directrice artistique, 36 ans", text: "La créativité sous pression constante. L'audit métabolique d'octobre 2025 avait révélé mon épuisement créatif. ApexLabs le prévient.", metric: "Awards", metricLabel: "multiples" },
  { name: "Fabien S.", role: "Ébéniste, 43 ans", text: "Le travail du bois noble demande patience. L'audit anabolique de septembre 2025 avait montré mes tensions musculaires. ApexLabs les surveille.", metric: "Précision", metricLabel: "maximale" },
  { name: "Géraldine T.", role: "Logopède, 39 ans", text: "Aider à communiquer demande concentration. L'audit métabolique d'octobre 2025 avait révélé ma fatigue cognitive. ApexLabs l'optimise.", metric: "+40%", metricLabel: "progrès patients" },
  { name: "Hippolyte U.", role: "Arboriculteur, 51 ans", text: "Dans les arbres par tous les temps. L'audit anabolique de septembre 2025 avait montré mes risques cardiovasculaires. ApexLabs les surveille.", metric: "Cœur", metricLabel: "sain" },
  { name: "Irène V.", role: "Clerc de notaire, 37 ans", text: "Les dossiers complexes, la précision juridique. L'audit métabolique d'octobre 2025 avait révélé mon stress chronique. ApexLabs m'aide.", metric: "0", metricLabel: "erreurs" },
  { name: "Jules W.", role: "Verrier d'art, 45 ans", text: "La chaleur du verre en fusion, la précision. L'audit anabolique de septembre 2025 avait montré mes problèmes de thermorégulation. ApexLabs les optimise.", metric: "Hydratation", metricLabel: "optimale" },
  { name: "Karine X.", role: "Ergothérapeute, 38 ans", text: "Adapter l'environnement des patients. L'audit métabolique d'octobre 2025 avait révélé mes propres difficultés posturales. ApexLabs les corrige.", metric: "Posture", metricLabel: "parfaite" },
  { name: "Lionel Y.", role: "Scieur de long, 49 ans", text: "Un métier rare et physique. L'audit anabolique de septembre 2025 avait montré mes carences énergétiques. ApexLabs les comble.", metric: "Énergie", metricLabel: "jeune" },
  { name: "Margaux Z.", role: "Relieuse, 35 ans", text: "La restauration de livres anciens demande patience. L'audit métabolique d'octobre 2025 avait révélé ma fatigue oculaire. ApexLabs la prévient.", metric: "Yeux", metricLabel: "préservés" },
  { name: "Norbert A.", role: "Charpentier de marine, 46 ans", text: "Construire des bateaux en bois est exigeant. L'audit anabolique de septembre 2025 avait montré mes problèmes articulaires. ApexLabs les surveille.", metric: "Mobilité", metricLabel: "complète" },
  { name: "Odile B.", role: "Parfumeuse, 40 ans", text: "Le nez doit rester affûté. L'audit métabolique d'octobre 2025 avait révélé des carences affectant mon odorat. ApexLabs les a corrigées.", metric: "Odorat", metricLabel: "parfait" },
  { name: "Pierrick C.", role: "Sabotier, 53 ans", text: "Un métier ancestral physique. L'audit anabolique de septembre 2025 avait montré mon usure articulaire. ApexLabs la ralentit.", metric: "Articulations", metricLabel: "préservées" },
  { name: "Quitterie D.", role: "Enlumineuse", text: "Les détails microscopiques des manuscrits. L'audit métabolique d'octobre 2025 avait révélé ma fatigue nerveuse. ApexLabs l'optimise.", metric: "Précision", metricLabel: "absolue" },
  { name: "Roland E.", role: "Vannier, 48 ans", text: "Tresser l'osier demande dextérité. L'audit anabolique de septembre 2025 avait montré mes tensions dans les mains. ApexLabs les surveille.", metric: "Mains", metricLabel: "saines" },
  { name: "Séverine F.", role: "Taxidermiste, 42 ans", text: "Un métier d'art méconnu. L'audit métabolique d'octobre 2025 avait révélé mon exposition aux produits chimiques. ApexLabs surveille ma santé.", metric: "Bilan", metricLabel: "clean" },
  { name: "Théophile G.", role: "Doreur sur bois, 39 ans", text: "L'application de feuilles d'or demande patience. L'audit anabolique de septembre 2025 avait montré mes tremblements. ApexLabs les a éliminés.", metric: "0", metricLabel: "tremblements" },
  { name: "Ursule H.", role: "Dinandière, 44 ans", text: "Le travail du cuivre à la main. L'audit métabolique d'octobre 2025 avait révélé mes carences en minéraux. ApexLabs les comble.", metric: "Force +30%", metricLabel: "améliorée" },
  { name: "Vincent I.", role: "Campaniste, 51 ans", text: "Entretenir les cloches d'église. L'audit anabolique de septembre 2025 avait montré mes problèmes auditifs. ApexLabs surveille mon audition.", metric: "Audition", metricLabel: "préservée" },
  { name: "Wilhelmine J.", role: "Passementière, 46 ans", text: "Les ornements textiles demandent minutie. L'audit métabolique d'octobre 2025 avait révélé ma fatigue visuelle. ApexLabs l'optimise.", metric: "Vue stable", metricLabel: "optimisée" },
  { name: "Yves K.", role: "Fondeur d'art, 50 ans", text: "Le bronze en fusion, la chaleur extrême. L'audit anabolique de septembre 2025 avait montré mes risques de déshydratation. ApexLabs me protège.", metric: "Hydratation", metricLabel: "parfaite" },
];

// ============================================================================
// BETA TESTERS REVIEWS SECTION WITH PAGINATION
// ============================================================================
function ReviewsSection() {
  const [currentPage, setCurrentPage] = useState(0);
  const reviewsPerPage = 3;
  const totalPages = Math.ceil(BETA_REVIEWS.length / reviewsPerPage);

  const currentReviews = BETA_REVIEWS.slice(
    currentPage * reviewsPerPage,
    (currentPage + 1) * reviewsPerPage
  );

  const nextPage = () => {
    if (currentPage < totalPages - 1) {
      setCurrentPage(prev => prev + 1);
    }
  };

  const prevPage = () => {
    if (currentPage > 0) {
      setCurrentPage(prev => prev - 1);
    }
  };

  return (
    <section id="reviews" className="py-20 bg-neuro-dark relative overflow-hidden">
      {/* Background grid */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(252,221,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(252,221,0,0.02)_1px,transparent_1px)] bg-[size:4rem_4rem]" />

      <div className="relative max-w-6xl mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-16">
          <span className="font-mono text-[10px] sm:text-xs text-neuro-accent uppercase tracking-[0.3em] block mb-3">
            Beta Testers • {BETA_REVIEWS.length}+ avis
          </span>
          <h2 className="font-sans font-black text-3xl sm:text-4xl md:text-5xl text-white uppercase tracking-tight mb-4">
            Résultats Réels
          </h2>
          <p className="text-gray-400 max-w-xl mx-auto">
            Des transformations mesurables, validées par les données. Ils ont testé les anciens audits, ils valident ApexLabs.
          </p>
        </div>

        {/* Reviews Grid - 3 per page */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 min-h-[400px]">
          {currentReviews.map((review, idx) => (
            <motion.div
              key={`${currentPage}-${idx}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="bg-black/40 backdrop-blur-sm border border-white/10 rounded-lg p-6 hover:border-neuro-accent/30 transition-all group flex flex-col"
            >
              {/* Metric badge */}
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="font-sans font-bold text-white text-lg">{review.name}</div>
                  <div className="font-mono text-[11px] text-gray-500 uppercase tracking-wider">{review.role}</div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-xl font-bold text-neuro-signal">{review.metric}</div>
                  <div className="font-mono text-[9px] text-gray-500 uppercase tracking-widest">{review.metricLabel}</div>
                </div>
              </div>

              {/* Quote */}
              <p className="text-gray-300 text-sm leading-relaxed flex-1">
                "{review.text}"
              </p>

              {/* Verified badge */}
              <div className="mt-4 flex items-center gap-2">
                <motion.span
                  className="w-1.5 h-1.5 bg-neuro-signal rounded-full"
                  animate={{ opacity: [1, 0.5, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                <span className="font-mono text-[9px] text-neuro-signal uppercase tracking-widest">Résultat vérifié</span>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-center gap-6 mt-10">
          <button
            onClick={prevPage}
            disabled={currentPage === 0}
            className={`font-mono text-xs uppercase tracking-widest px-4 py-2 rounded border transition-all ${
              currentPage === 0
                ? 'border-white/10 text-gray-600 cursor-not-allowed'
                : 'border-white/20 text-white hover:border-neuro-accent hover:text-neuro-accent'
            }`}
          >
            ← Précédent
          </button>

          <div className="font-mono text-xs text-gray-500">
            <span className="text-white">{currentPage + 1}</span> / {totalPages}
          </div>

          <button
            onClick={nextPage}
            disabled={currentPage >= totalPages - 1}
            className={`font-mono text-xs uppercase tracking-widest px-4 py-2 rounded border transition-all ${
              currentPage >= totalPages - 1
                ? 'border-white/10 text-gray-600 cursor-not-allowed'
                : 'border-white/20 text-white hover:border-neuro-accent hover:text-neuro-accent'
            }`}
          >
            Suivant →
          </button>
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// PRESS/MEDIA SECTION
// ============================================================================
function PressSection() {
  // Only outlets with verified active links from Feb 2025 press release
  const pressLinks = [
    { name: "Business Insider", url: "https://markets.businessinsider.com/news/stocks/achzodcoaching-launches-elite-athlete-coaching-programs-backed-by-issanasm-and-10-certifications-1034317450" },
    { name: "Yahoo Finance", url: "https://finance.yahoo.com/news/achzodcoaching-launches-elite-athlete-coaching-193500608.html" },
    { name: "Benzinga", url: "https://www.benzinga.com/pressreleases/25/02/43506783/achzodcoaching-launches-elite-athlete-coaching-programs-backed-by-issanasm-and-10-certifications" },
    { name: "StreetInsider", url: "https://www.streetinsider.com/Newsfile/Achzodcoaching+Launches+Elite+Athlete+Coaching+Programs%2C+Backed+by+ISSANASM+and+10%2B+Certifications/24301620.html" },
    { name: "Financial Post", url: "https://financialpost.com/newsfile/239656-achzodcoaching-launches-elite-athlete-coaching-programs-backed-by-issanasm-and-10-certifications" },
    { name: "Newsfile", url: "https://www.newsfilecorp.com/release/239656" },
    { name: "Spotify", url: "https://open.spotify.com/episode/3WsX3g2VTuQjTbJzkZKTE9" },
    { name: "Apple Podcasts", url: "https://podcasts.apple.com/us/podcast/achzodcoaching-launches-elite-athlete-coaching-programs/id1773282513?i=1000689414642" },
    { name: "Amazon Music", url: "https://music.amazon.com/podcasts/c8225522-cca6-4734-9d90-c3daf8076e09/episodes/4749c2a0-bd36-4631-95ac-2a599f272c4a/global-economic-press-achzodcoaching-launches-elite-athlete-coaching-programs-backed-by-issa-nasm-and-10-certifications%E2%80%9D" },
  ];

  return (
    <section className="py-12 bg-black">
      <div className="container mx-auto px-6">
        <p className="text-xs uppercase tracking-[0.3em] text-gray-600 text-center mb-8">Recommandé par les médias</p>
        <div className="flex flex-wrap justify-center gap-6">
          {pressLinks.map((press, i) => (
            <a
              key={i}
              href={press.url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 border border-white/10 rounded-full text-gray-400 text-sm font-semibold hover:text-white hover:border-[#FCDD00]/50 hover:bg-white/5 transition-all duration-300"
            >
              {press.name} ↗
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// VISION SECTION (replaces Waitlist)
// ============================================================================
function VisionSection() {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <section id="join-waitlist" className="py-32 relative bg-neutral-900 overflow-hidden">
      {/* Grid Background */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none" />

      <div className="container mx-auto px-6 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#FCDD00] mb-6">Notre Vision</p>
          <h2 className="text-4xl md:text-6xl font-black mb-8 text-white tracking-tight uppercase">
            L'AVENIR DE L'OPTIMISATION HUMAINE
          </h2>
          <p className="text-gray-400 text-lg mb-12 max-w-2xl mx-auto leading-relaxed">
            ApexLabs représente la convergence de la biologie de pointe et de l'intelligence artificielle.
            Nous transformons les données en actions, les résultats en excellence.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <div className="bg-black/50 border border-white/10 p-6 rounded">
              <div className="text-3xl font-black text-[#FCDD00] mb-2">50+</div>
              <div className="text-xs uppercase tracking-widest text-gray-500">Biomarqueurs analysés</div>
            </div>
            <div className="bg-black/50 border border-white/10 p-6 rounded">
              <div className="text-3xl font-black text-[#FCDD00] mb-2">98%</div>
              <div className="text-xs uppercase tracking-widest text-gray-500">Précision des données</div>
            </div>
            <div className="bg-black/50 border border-white/10 p-6 rounded">
              <div className="text-3xl font-black text-[#FCDD00] mb-2">24/7</div>
              <div className="text-xs uppercase tracking-widest text-gray-500">Suivi en temps réel</div>
            </div>
          </div>

          <button
            onClick={scrollToTop}
            className="px-8 py-4 bg-[#FCDD00] text-black font-black text-sm uppercase tracking-widest rounded hover:bg-[#FCDD00]/90 transition-all shadow-[0_0_20px_rgba(252,221,0,0.3)] hover:shadow-[0_0_30px_rgba(252,221,0,0.5)]"
          >
            Candidater maintenant →
          </button>
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// FOOTER COMPONENT
// ============================================================================
function Footer() {
  return (
    <footer className="bg-black py-12 border-t border-white/10">
      <div className="container mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="text-white font-bold tracking-tighter text-xl">
          APEX<span className="text-[#FCDD00]">LABS</span>
        </div>
        <div className="text-gray-600 text-sm">
          &copy; {new Date().getFullYear()} Tous droits réservés.
        </div>
        <div className="flex gap-6">
          <a href="https://instagram.com/achzodcoaching" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-white transition-colors">Instagram</a>
          <a href="https://twitter.com/achzodcoaching" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-white transition-colors">Twitter</a>
        </div>
      </div>
    </footer>
  );
}

// ============================================================================
// CUSTOM STYLES (inline for animations)
// ============================================================================
const customStyles = `
@keyframes scan {
  0% { transform: translateY(-100%); }
  100% { transform: translateY(1000%); }
}

@keyframes scan-horizontal {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(50000%); }
}

@keyframes pulse-slow {
  0%, 100% { opacity: 0.6; transform: scale(1.1); }
  50% { opacity: 0.8; transform: scale(1.15); }
}

@keyframes fade-in-up {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes fade-in-down {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
`;

// ============================================================================
// MAIN APP
// ============================================================================
export default function ApexLabs() {
  return (
    <div className="min-h-screen bg-black">
      <style>{customStyles}</style>
      <Header />
      <Hero />
      <ECGSection />
      <CertificationsSection />
      <OffersSection />
      <ReviewsSection />
      <PressSection />
      <VisionSection />
      <Footer />
    </div>
  );
}
