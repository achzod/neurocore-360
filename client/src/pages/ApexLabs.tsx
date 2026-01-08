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
    description: "Le point d'entrée essentiel vers l'optimisation. Une cartographie complète de votre composition corporelle par bio-impédancemétrie médicale et scan 3D. Obtenez une vision claire de votre masse musculaire, masse grasse viscérale et de votre hydratation cellulaire.",
    features: ["Composition Corporelle 3D", "Analyse Métabolique de Base", "Rapport Digital Immédiat", "Bilan d'Hydratation"],
    imageUrl: "https://cdn.speedsize.com/3f711f28-1488-44dc-b013-5e43284ac4b0/https://public-web-assets.uh-static.com/web_v2/womens-health/whitepapers/hr_hrv.png",
    reverse: false
  },
  {
    id: 'anabolic-bioscan',
    title: "ANABOLIC BIOSCAN",
    subtitle: "Performance Musculaire",
    description: "Conçu pour l'hypertrophie et la performance athlétique. Analyse précise de la densité musculaire, de la qualité des tissus et du profil hormonal anabolique. Identifiez vos leviers de croissance et optimisez votre récupération neuro-musculaire.",
    features: ["Densité Musculaire", "Asymétries & Posture", "Potentiel de Récupération", "Optimisation de la Force"],
    imageUrl: "https://cdn.speedsize.com/3f711f28-1488-44dc-b013-5e43284ac4b0/https://public-web-assets.uh-static.com/web_v2/womens-health/whitepapers/bmi_stress_activity.png",
    reverse: true
  },
  {
    id: 'blood-analysis',
    title: "BLOOD ANALYSIS",
    subtitle: "La Vérité Biologique",
    description: "Plongez au cœur de votre biochimie. Une analyse sanguine exhaustive ciblant plus de 50 biomarqueurs clés de performance : statut inflammatoire, hormonal, micronutritionnel et métabolique. La donnée biologique brute au service de votre santé.",
    features: ["Panel Hormonal Complet", "Marqueurs Inflammatoires", "Carences Micronutritionnelles", "Fonction Hépatique & Rénale"],
    imageUrl: "",
    reverse: false,
    useCustomVisual: true
  },
  {
    id: 'ultimate-scan',
    title: "ULTIMATE SCAN",
    subtitle: "L'Omniscience Corporelle",
    description: "L'agrégation de toutes nos technologies. Discovery + Anabolic + Blood + Analyse génétique. Une vue à 360° de votre physiologie pour une stratégie d'optimisation sans compromis. Le gold standard pour les bio-hackers et athlètes d'élite.",
    features: ["Intégration Totale des Données", "Plan d'Action Sur-Mesure", "Analyse Génétique Croisée", "Suivi Prioritaire"],
    imageUrl: "https://cdn.speedsize.com/3f711f28-1488-44dc-b013-5e43284ac4b0/https://public-web-assets.uh-static.com/web_v2/womens-health/whitepapers/cno_pro.png",
    reverse: true
  },
  {
    id: 'burnout-detection',
    title: "BURNOUT DETECTION",
    subtitle: "Préservation du Système Nerveux",
    description: "Mesure objective de la charge allostatique et de la variabilité cardiaque (VFC). Détectez les signes physiologiques de l'épuisement et la fatigue centrale avant qu'ils ne deviennent cliniques. Protégez votre actif le plus précieux : votre mental.",
    features: ["Analyse Système Nerveux (VFC)", "Mesure du Cortisol", "Qualité du Sommeil", "Stratégies de Résilience"],
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
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const handleQuickJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!email) return;
    setStatus('loading');

    try {
      const response = await fetch('/api/waitlist/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source: 'apexlabs-hero' }),
      });

      const data = await response.json();

      if (data.success) {
        setStatus('success');
        setEmail('');
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

        {/* Early Access Input */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="w-full max-w-md mb-12 relative group"
        >
            {/* Glowing border effect */}
            <div className="absolute -inset-1 bg-gradient-to-r from-[#FCDD00] via-white/20 to-[#FCDD00] opacity-30 blur-lg rounded-full group-hover:opacity-60 transition-opacity duration-1000"></div>

            {status === 'success' ? (
                <div className="bg-green-500/20 backdrop-blur-xl border border-green-500/50 text-green-400 px-8 py-4 rounded-full text-sm font-bold tracking-wider animate-pulse">
                    INSCRIPTION VALIDÉE
                </div>
            ) : status === 'error' ? (
                <div className="flex flex-col gap-2">
                    <div className="bg-red-500/20 backdrop-blur-xl border border-red-500/50 text-red-400 px-8 py-4 rounded-full text-sm font-bold tracking-wider">
                        ERREUR - RÉESSAYEZ
                    </div>
                    <button onClick={() => setStatus('idle')} className="text-xs text-gray-500 hover:text-white">
                        Réessayer
                    </button>
                </div>
            ) : (
                <form onSubmit={handleQuickJoin} className="relative flex p-1 bg-black/40 backdrop-blur-xl border border-white/20 rounded-full transition-all duration-300 focus-within:border-[#FCDD00]/50 focus-within:shadow-[0_0_30px_rgba(252,221,0,0.1)]">
                    <input
                        type="email"
                        placeholder="Entrez votre email..."
                        className="flex-1 bg-transparent border-none text-white px-6 focus:ring-0 placeholder-gray-500 outline-none text-sm"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                    <button type="submit" disabled={status === 'loading'} className="bg-white text-black px-6 py-2.5 rounded-full font-bold text-xs uppercase tracking-widest hover:bg-[#FCDD00] hover:text-black transition-colors shadow-lg disabled:opacity-50">
                        {status === 'loading' ? '...' : 'Rejoindre'}
                    </button>
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
// OFFER CARD COMPONENT
// ============================================================================
interface OfferCardProps {
  offer: Offer;
  onSelect: () => void;
}

function OfferCard({ offer, onSelect }: OfferCardProps) {
  const { id, title, subtitle, description, features, imageUrl, reverse, useCustomVisual } = offer;
  const cardRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

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
      className={`py-24 border-b border-white/5 last:border-0 group transition-all duration-1000 ease-out ${revealClass}`}
    >
      <div className={`flex flex-col ${reverse ? 'lg:flex-row-reverse' : 'lg:flex-row'} items-center gap-12 lg:gap-24`}>

        {/* Image Side with HUD/Tech Overlay */}
        <div className="w-full lg:w-1/2 relative">
          <div className="relative aspect-[4/3] overflow-hidden rounded bg-neutral-900 border border-[#FCDD00]/20 group-hover:border-[#FCDD00]/50 shadow-[0_0_50px_rgba(252,221,0,0.15)] group-hover:shadow-[0_0_80px_rgba(252,221,0,0.25)] transition-all duration-500">

            {/* Scan Line Animation */}
            <div className="absolute inset-0 z-30 pointer-events-none opacity-20 group-hover:opacity-100 transition-opacity duration-700">
              <div className="absolute top-0 left-0 w-full h-[10%] bg-gradient-to-b from-transparent via-[#FCDD00]/20 to-transparent" style={{ animation: 'scan 3s infinite linear' }} />
            </div>

            {/* HUD Elements Overlay */}
            <div className="absolute top-4 left-4 w-8 h-8 border-l-2 border-t-2 border-white/30 z-20 rounded-tl-lg group-hover:border-white/80 transition-colors" />
            <div className="absolute top-4 right-4 w-8 h-8 border-r-2 border-t-2 border-white/30 z-20 rounded-tr-lg group-hover:border-white/80 transition-colors" />
            <div className="absolute bottom-4 left-4 w-8 h-8 border-l-2 border-b-2 border-white/30 z-20 rounded-bl-lg group-hover:border-white/80 transition-colors" />
            <div className="absolute bottom-4 right-4 w-8 h-8 border-r-2 border-b-2 border-white/30 z-20 rounded-br-lg group-hover:border-white/80 transition-colors" />

            {/* Floating Label */}
            <div className="absolute top-8 left-8 z-20 backdrop-blur-md px-3 py-1 border rounded text-[10px] tracking-widest uppercase font-bold shadow-lg bg-black/60 border-[#FCDD00]/30 text-[#FCDD00]">
               SYSTEM ONLINE
            </div>

             {/* Overlay Gradient for Noir effect */}
            {!useCustomVisual && (
              <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80 z-10" />
            )}

            {/* Main Image or Custom Visual */}
            {useCustomVisual ? (
              <DNAHelix />
            ) : (
              <img
                src={imageUrl}
                alt={title}
                className="w-full h-full object-cover transition-all duration-700 transform opacity-70 group-hover:opacity-100 grayscale group-hover:grayscale-0 group-hover:scale-110 group-hover:rotate-1"
              />
            )}
          </div>

          {/* Decorative glowing orb behind */}
          <div className="absolute -inset-4 bg-[#FCDD00]/20 blur-[60px] rounded-full -z-10 opacity-20 group-hover:opacity-50 transition-opacity duration-700 animate-pulse" />
        </div>

        {/* Content Side */}
        <div className="w-full lg:w-1/2 space-y-8">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.2em] mb-4 flex items-center gap-3 text-[#FCDD00]">
              <span className="w-2 h-2 rounded-full animate-pulse bg-[#FCDD00] shadow-[0_0_10px_#FCDD00]"></span>
              {subtitle}
            </div>

            <h3 className="text-4xl md:text-6xl font-bold text-white mb-6 tracking-tight font-display group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-gray-400 transition-all duration-300">
              {title}
            </h3>

            <p className="text-gray-400 text-lg leading-relaxed border-l border-white/10 pl-6 group-hover:border-white/40 transition-colors duration-500">
              {description}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {features.map((feature, idx) => (
              <div
                key={idx}
                className="flex items-center gap-3 text-gray-300 bg-white/5 p-3 rounded-lg border border-white/5 hover:border-[#FCDD00]/30 hover:bg-white/10 transition-all duration-300 hover:translate-x-1"
                style={{ transitionDelay: `${idx * 100}ms` }}
              >
                <div className="w-1.5 h-1.5 rounded-full bg-[#FCDD00]" />
                <span className="text-sm font-medium tracking-wide">{feature}</span>
              </div>
            ))}
          </div>

          <div className="pt-6">
            <Button variant="secondary" onClick={onSelect} className="w-full sm:w-auto !border-white/20 hover:!border-[#FCDD00]/50 hover:shadow-[0_0_30px_rgba(252,221,0,0.3)]">
              Sélectionner le protocole
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// OFFERS SECTION
// ============================================================================
function OffersSection() {
  const handleSelect = () => {
    const element = document.getElementById('join-waitlist');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section id="offers" className="bg-black py-24 relative">
      <div className="container mx-auto px-6">
        <div className="mb-20 text-center max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-5xl font-bold mb-6 text-white font-display">Mes Offres</h2>
          <p className="text-gray-400">
            Des solutions adaptées à chaque niveau d'exigence. Choisissez votre voie vers l'excellence cognitive.
          </p>
        </div>

        <div className="flex flex-col">
          {/* Discovery Scan */}
          <OfferCard offer={OFFERS[0]} onSelect={handleSelect} />

          {/* Anabolic Bioscan */}
          <OfferCard offer={OFFERS[1]} onSelect={handleSelect} />

          {/* Blood Analysis (with DNA Helix visual) */}
          <OfferCard offer={OFFERS[2]} onSelect={handleSelect} />

          {/* Ultimate Scan */}
          <OfferCard offer={OFFERS[3]} onSelect={handleSelect} />

          {/* Burnout Detection */}
          <OfferCard offer={OFFERS[4]} onSelect={handleSelect} />
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
// BETA TESTERS REVIEWS SECTION
// ============================================================================
function ReviewsSection() {
  const reviews = [
    {
      name: "Thomas R.",
      role: "Entrepreneur, 34 ans",
      text: "En 3 mois de suivi avec Achzod, j'ai compris pourquoi je stagnais depuis des années. L'analyse bio-impédance a révélé un déséquilibre hormonal que personne n'avait détecté. Résultat : -8kg de gras, +4kg de muscle sec.",
      metric: "-8kg gras",
      metricLabel: "en 12 semaines"
    },
    {
      name: "Sarah M.",
      role: "Athlète CrossFit, 28 ans",
      text: "Le Discovery Scan m'a permis d'identifier mes carences en magnésium et zinc qui plombaient ma récupération. Depuis la correction, mes perfs ont explosé et je dors enfin correctement.",
      metric: "+15%",
      metricLabel: "performance"
    },
    {
      name: "Marc D.",
      role: "Cadre dirigeant, 42 ans",
      text: "J'étais au bord du burnout sans le savoir. L'analyse VFC a montré un système nerveux en surrégime. Le protocole de récupération d'Achzod m'a littéralement sauvé.",
      metric: "HRV +40%",
      metricLabel: "en 8 semaines"
    },
    {
      name: "Julie L.",
      role: "Coach sportive, 31 ans",
      text: "Je recommande ApexLabs à tous mes clients maintenant. La précision des données et la clarté des recommandations sont incomparables. C'est le chaînon manquant entre l'entraînement et les résultats.",
      metric: "100%",
      metricLabel: "clients satisfaits"
    }
  ];

  return (
    <section id="reviews" className="py-20 bg-neuro-dark relative overflow-hidden">
      {/* Background grid */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(252,221,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(252,221,0,0.02)_1px,transparent_1px)] bg-[size:4rem_4rem]" />

      <div className="relative max-w-6xl mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-16">
          <span className="font-mono text-[10px] sm:text-xs text-neuro-accent uppercase tracking-[0.3em] block mb-3">
            Beta Testers
          </span>
          <h2 className="font-sans font-black text-3xl sm:text-4xl md:text-5xl text-white uppercase tracking-tight mb-4">
            Résultats Réels
          </h2>
          <p className="text-gray-400 max-w-xl mx-auto">
            Des transformations mesurables, validées par les données.
          </p>
        </div>

        {/* Reviews Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {reviews.map((review, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              className="bg-black/40 backdrop-blur-sm border border-white/10 rounded-lg p-6 hover:border-neuro-accent/30 transition-all group"
            >
              {/* Metric badge */}
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="font-sans font-bold text-white text-lg">{review.name}</div>
                  <div className="font-mono text-[11px] text-gray-500 uppercase tracking-wider">{review.role}</div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-2xl font-bold text-neuro-signal">{review.metric}</div>
                  <div className="font-mono text-[10px] text-gray-500 uppercase tracking-widest">{review.metricLabel}</div>
                </div>
              </div>

              {/* Quote */}
              <p className="text-gray-300 text-sm leading-relaxed">
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
        <p className="text-xs uppercase tracking-[0.3em] text-gray-600 text-center mb-8">Couverture Presse</p>
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
// WAITLIST SECTION
// ============================================================================
function Waitlist() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setStatus('loading');
    setErrorMessage('');

    try {
      const response = await fetch('/api/waitlist/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source: 'apexlabs' }),
      });

      const data = await response.json();

      if (data.success) {
        setStatus('success');
        setEmail('');
      } else {
        setStatus('error');
        setErrorMessage(data.error || 'Une erreur est survenue');
      }
    } catch (error) {
      console.error('Subscription error:', error);
      setStatus('error');
      setErrorMessage('Erreur de connexion. Réessayez.');
    }
  };

  return (
    <section id="join-waitlist" className="py-32 relative bg-neutral-900 overflow-hidden">
      {/* Grid Background */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none" />

      <div className="container mx-auto px-6 relative z-10">
        <div className="max-w-4xl mx-auto bg-black/50 backdrop-blur-xl border border-white/10 rounded-sm p-8 md:p-16 text-center">
          <h2 className="text-4xl md:text-6xl font-bold mb-6 text-white tracking-tight font-display">
            ACCÈS ANTICIPÉ
          </h2>
          <p className="text-gray-400 text-lg mb-10 max-w-xl mx-auto">
            Rejoignez la liste d'attente exclusive pour Neurocore 360. Les places pour la phase bêta sont limitées.
          </p>

          {status === 'success' ? (
            <div className="bg-green-500/10 border border-green-500/20 rounded p-8">
              <p className="text-green-400 text-xl font-medium">Inscription confirmée.</p>
              <p className="text-gray-400 mt-2">Nous vous contacterons très prochainement.</p>
              <button
                onClick={() => setStatus('idle')}
                className="mt-6 text-sm text-gray-500 hover:text-white underline"
              >
                Inscrire un autre email
              </button>
            </div>
          ) : (
            <>
              <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-4 max-w-lg mx-auto">
                <input
                  type="email"
                  placeholder="votre@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1 bg-white/5 border border-white/10 rounded-full px-6 py-4 text-white placeholder-gray-600 focus:outline-none focus:border-white/40 focus:bg-white/10 transition-all"
                  required
                />
                <Button type="submit" disabled={status === 'loading'}>
                  {status === 'loading' ? 'Traitement...' : "S'inscrire"}
                </Button>
              </form>
              {status === 'error' && (
                <p className="mt-4 text-red-400 text-sm">{errorMessage}</p>
              )}
            </>
          )}

          <p className="mt-8 text-xs text-gray-600 uppercase tracking-widest">
            Sécurité des données garantie • Désabonnement à tout moment
          </p>
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
      <Waitlist />
      <Footer />
    </div>
  );
}
