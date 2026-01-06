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
    imageUrl: "https://cdn.speedsize.com/3f711f28-1488-44dc-b013-5e43284ac4b0/https://public-web-assets.uh-static.com/web_v2/ring-buy/recovery/png/dynamicDesk.png",
    reverse: false
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
// BLOOD ANALYSIS VISUAL COMPONENT (DNA + ECG + SKELETON)
// ============================================================================
function DNAHelix() {
  // Body scan points with labels
  const bodyPoints = [
    { id: 'brain', x: 50, y: 8, label: 'CERVEAU', color: '#60a5fa' },
    { id: 'heart', x: 45, y: 28, label: 'CŒUR', color: '#f87171' },
    { id: 'lungs', x: 55, y: 26, label: 'POUMONS', color: '#4ade80' },
    { id: 'liver', x: 42, y: 38, label: 'FOIE', color: '#fbbf24' },
    { id: 'stomach', x: 55, y: 42, label: 'DIGESTIF', color: '#a78bfa' },
    { id: 'kidneys', x: 50, y: 48, label: 'REINS', color: '#f472b6' },
    { id: 'joints', x: 30, y: 60, label: 'ARTICULATIONS', color: '#22d3ee' },
  ];

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden bg-gradient-to-br from-blue-950 via-blue-900 to-black">
      {/* Background particles */}
      <div className="absolute inset-0">
        {[...Array(15)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-blue-400/30 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              opacity: [0.2, 0.8, 0.2],
              scale: [1, 1.5, 1],
            }}
            transition={{
              duration: 2 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>

      {/* Glowing orbs */}
      <motion.div
        className="absolute w-48 h-48 bg-blue-500/20 rounded-full blur-[60px]"
        animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 4, repeat: Infinity }}
      />

      {/* SKELETON BODY OUTLINE */}
      <div className="absolute inset-0 flex items-center justify-center">
        <svg viewBox="0 0 100 100" className="w-[60%] h-[85%] opacity-30">
          {/* Head */}
          <ellipse cx="50" cy="10" rx="8" ry="9" fill="none" stroke="#3b82f6" strokeWidth="0.5" />
          {/* Neck */}
          <line x1="50" y1="19" x2="50" y2="22" stroke="#3b82f6" strokeWidth="0.5" />
          {/* Torso */}
          <path d="M 35 22 Q 50 20 65 22 L 62 50 Q 50 52 38 50 Z" fill="none" stroke="#3b82f6" strokeWidth="0.5" />
          {/* Spine */}
          <line x1="50" y1="22" x2="50" y2="55" stroke="#3b82f6" strokeWidth="0.3" strokeDasharray="2,1" />
          {/* Arms */}
          <path d="M 35 24 L 20 40 L 15 55" fill="none" stroke="#3b82f6" strokeWidth="0.5" />
          <path d="M 65 24 L 80 40 L 85 55" fill="none" stroke="#3b82f6" strokeWidth="0.5" />
          {/* Pelvis */}
          <path d="M 38 50 Q 50 58 62 50" fill="none" stroke="#3b82f6" strokeWidth="0.5" />
          {/* Legs */}
          <path d="M 42 55 L 38 75 L 35 95" fill="none" stroke="#3b82f6" strokeWidth="0.5" />
          <path d="M 58 55 L 62 75 L 65 95" fill="none" stroke="#3b82f6" strokeWidth="0.5" />
        </svg>
      </div>

      {/* ANIMATED SCAN POINTS ON BODY */}
      <div className="absolute inset-0">
        {bodyPoints.map((point, idx) => (
          <motion.div
            key={point.id}
            className="absolute flex items-center gap-1"
            style={{ left: `${point.x}%`, top: `${point.y}%` }}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.2, duration: 0.5 }}
          >
            {/* Pulsing dot */}
            <motion.div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: point.color, boxShadow: `0 0 10px ${point.color}` }}
              animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: idx * 0.3 }}
            />
            {/* Label */}
            <motion.span
              className="text-[6px] font-mono font-bold tracking-wider whitespace-nowrap"
              style={{ color: point.color }}
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity, delay: idx * 0.2 }}
            >
              {point.label}
            </motion.span>
          </motion.div>
        ))}
      </div>

      {/* ECG HEARTBEAT LINE */}
      <div className="absolute bottom-8 left-4 right-4">
        <div className="flex items-center gap-2 mb-1">
          {/* Beating heart icon */}
          <motion.div
            animate={{ scale: [1, 1.3, 1] }}
            transition={{ duration: 0.8, repeat: Infinity }}
          >
            <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
          </motion.div>
          <span className="text-[8px] font-mono text-red-400">72 BPM</span>
        </div>

        {/* ECG Line SVG */}
        <svg viewBox="0 0 200 30" className="w-full h-8">
          <motion.path
            d="M 0 15 L 20 15 L 25 15 L 30 5 L 35 25 L 40 10 L 45 20 L 50 15 L 70 15 L 75 15 L 80 5 L 85 25 L 90 10 L 95 20 L 100 15 L 120 15 L 125 15 L 130 5 L 135 25 L 140 10 L 145 20 L 150 15 L 170 15 L 175 15 L 180 5 L 185 25 L 190 10 L 195 20 L 200 15"
            fill="none"
            stroke="#ef4444"
            strokeWidth="1.5"
            strokeLinecap="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          />
          {/* Glow effect */}
          <motion.path
            d="M 0 15 L 20 15 L 25 15 L 30 5 L 35 25 L 40 10 L 45 20 L 50 15 L 70 15 L 75 15 L 80 5 L 85 25 L 90 10 L 95 20 L 100 15 L 120 15 L 125 15 L 130 5 L 135 25 L 140 10 L 145 20 L 150 15 L 170 15 L 175 15 L 180 5 L 185 25 L 190 10 L 195 20 L 200 15"
            fill="none"
            stroke="#ef4444"
            strokeWidth="3"
            strokeLinecap="round"
            opacity="0.3"
            filter="blur(3px)"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          />
        </svg>
      </div>

      {/* Data overlay - top left */}
      <div className="absolute top-3 left-3 text-[8px] font-mono space-y-0.5">
        <motion.div
          className="text-blue-400"
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          SCAN BIOMÉTRIQUE
        </motion.div>
        <div className="text-cyan-400/60">50+ BIOMARQUEURS</div>
      </div>

      {/* Data overlay - top right */}
      <div className="absolute top-3 right-3 text-[8px] font-mono text-right space-y-0.5">
        <div className="text-green-400">STATUS: ACTIF</div>
        <motion.div
          className="text-blue-300/60"
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          ████████░░ 82%
        </motion.div>
      </div>
    </div>
  );
}

// ============================================================================
// HEADER COMPONENT
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
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? 'bg-black/80 backdrop-blur-md py-4 border-b border-white/10' : 'bg-transparent py-6'}`}>
      <div className="container mx-auto px-6 flex justify-between items-center">
        {/* Logo Section - APEXLABS (White/Yellow) + by Achzod */}
        <a
          href="https://www.achzodcoaching.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-col leading-none group cursor-pointer"
        >
          <span className="text-2xl font-black tracking-tighter text-white uppercase">
            APEX<span className="text-[#FCDD00]">LABS</span>
          </span>
          <span className="text-sm font-medium text-gray-400 tracking-wide group-hover:text-white transition-colors">
            by Achzod
          </span>
        </a>

        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-300">
          <button onClick={() => scrollToSection('offers')} className="hover:text-[#FCDD00] transition-colors">Offres</button>
          <button onClick={() => scrollToSection('certifications')} className="hover:text-[#FCDD00] transition-colors">Certifications</button>
          <Button variant="outline" onClick={() => scrollToSection('join-waitlist')} className="!px-6 !py-2 text-xs hover:!border-[#FCDD00] hover:text-[#FCDD00]">
            S'inscrire
          </Button>
        </nav>
      </div>
    </header>
  );
}

// ============================================================================
// HERO COMPONENT
// ============================================================================
function Hero() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success'>('idle');

  const handleQuickJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if(!email) return;
    setStatus('loading');
    setTimeout(() => {
      setStatus('success');
      setEmail('');
    }, 1500);
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
            <h1 className="text-5xl md:text-7xl lg:text-9xl font-black tracking-tighter leading-[0.9] mb-2">
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
          className="max-w-2xl text-lg md:text-xl text-gray-300 mb-10 leading-relaxed font-light tracking-wide"
        >
          {TAGLINE} <br/>
          <span className="text-gray-500">
            La convergence de la biologie et de la technologie.
          </span>
        </motion.p>

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
            ) : (
                <form onSubmit={handleQuickJoin} className="relative flex p-1 bg-black/40 backdrop-blur-xl border border-white/20 rounded-full transition-all duration-300 focus-within:border-[#FCDD00]/50 focus-within:shadow-[0_0_30px_rgba(252,221,0,0.1)]">
                    <input
                        type="email"
                        placeholder="Entrez votre email..."
                        className="flex-1 bg-transparent border-none text-white px-6 focus:ring-0 placeholder-gray-500 outline-none text-sm"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                    <button type="submit" className="bg-white text-black px-6 py-2.5 rounded-full font-bold text-xs uppercase tracking-widest hover:bg-[#FCDD00] hover:text-black transition-colors shadow-lg">
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
  const { id, title, subtitle, description, features, imageUrl, reverse } = offer;
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

  const isBloodAnalysis = id === 'blood-analysis';

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
          <div className={`relative aspect-[4/3] overflow-hidden rounded-xl bg-neutral-900 border transition-all duration-500 ${isBloodAnalysis ? 'border-blue-500/30 group-hover:border-blue-400/60 shadow-[0_0_50px_rgba(59,130,246,0.2)] group-hover:shadow-[0_0_80px_rgba(59,130,246,0.35)]' : 'border-[#FCDD00]/20 group-hover:border-[#FCDD00]/50 shadow-[0_0_50px_rgba(252,221,0,0.15)] group-hover:shadow-[0_0_80px_rgba(252,221,0,0.25)]'}`}>

            {/* Scan Line Animation */}
            <div className="absolute inset-0 z-30 pointer-events-none opacity-20 group-hover:opacity-100 transition-opacity duration-700">
                {isBloodAnalysis ? (
                  // Horizontal Heartbeat/ECG Scan
                  <div className="absolute top-0 left-0 h-full w-[2px] bg-[#FCDD00]/50 shadow-[0_0_20px_#FCDD00]" style={{ animation: 'scan-horizontal 2s infinite linear' }} />
                ) : (
                  // Vertical Scan
                  <div className="absolute top-0 left-0 w-full h-[10%] bg-gradient-to-b from-transparent via-[#FCDD00]/20 to-transparent" style={{ animation: 'scan 3s infinite linear' }} />
                )}
            </div>

            {/* HUD Elements Overlay */}
            <div className="absolute top-4 left-4 w-8 h-8 border-l-2 border-t-2 border-white/30 z-20 rounded-tl-lg group-hover:border-white/80 transition-colors" />
            <div className="absolute top-4 right-4 w-8 h-8 border-r-2 border-t-2 border-white/30 z-20 rounded-tr-lg group-hover:border-white/80 transition-colors" />
            <div className="absolute bottom-4 left-4 w-8 h-8 border-l-2 border-b-2 border-white/30 z-20 rounded-bl-lg group-hover:border-white/80 transition-colors" />
            <div className="absolute bottom-4 right-4 w-8 h-8 border-r-2 border-b-2 border-white/30 z-20 rounded-br-lg group-hover:border-white/80 transition-colors" />

            {/* Floating Label */}
            <div className={`absolute top-8 left-8 z-20 backdrop-blur-md px-3 py-1 border rounded text-[10px] tracking-widest uppercase font-bold shadow-lg ${isBloodAnalysis ? 'bg-black/60 border-blue-400/30 text-blue-400' : 'bg-black/60 border-[#FCDD00]/30 text-[#FCDD00]'}`}>
               {isBloodAnalysis ? 'ADN SEQUENCING // ACTIVE' : 'SYSTEM ONLINE'}
            </div>

             {/* Overlay Gradient for Noir effect */}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80 z-10" />

            {/* Main Image or DNA Animation */}
            {isBloodAnalysis ? (
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
          <div className={`absolute -inset-4 blur-[60px] rounded-full -z-10 opacity-20 group-hover:opacity-50 transition-opacity duration-700 animate-pulse ${isBloodAnalysis ? 'bg-blue-500/30' : 'bg-[#FCDD00]/20'}`} />
        </div>

        {/* Content Side */}
        <div className="w-full lg:w-1/2 space-y-8">
          <div>
            <div className={`text-xs font-bold uppercase tracking-[0.2em] mb-4 flex items-center gap-3 ${isBloodAnalysis ? 'text-blue-400' : 'text-[#FCDD00]'}`}>
              <span className={`w-2 h-2 rounded-full animate-pulse ${isBloodAnalysis ? 'bg-blue-400 shadow-[0_0_10px_#3b82f6]' : 'bg-[#FCDD00] shadow-[0_0_10px_#FCDD00]'}`}></span>
              {subtitle}
            </div>

            <h3 className="text-4xl md:text-6xl font-bold text-white mb-6 tracking-tight group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-gray-400 transition-all duration-300">
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
                className={`flex items-center gap-3 text-gray-300 bg-white/5 p-3 rounded-lg border border-white/5 transition-all duration-300 hover:translate-x-1 ${isBloodAnalysis ? 'hover:border-blue-400/30 hover:bg-white/10' : 'hover:border-[#FCDD00]/30 hover:bg-white/10'}`}
                style={{ transitionDelay: `${idx * 100}ms` }}
              >
                <div className={`w-1.5 h-1.5 rounded-full ${isBloodAnalysis ? 'bg-blue-400' : 'bg-[#FCDD00]'}`} />
                <span className="text-sm font-medium tracking-wide">{feature}</span>
              </div>
            ))}
          </div>

          <div className="pt-6">
            <Button variant="secondary" onClick={onSelect} className={`w-full sm:w-auto !border-white/20 ${isBloodAnalysis ? 'hover:!border-blue-400/50 hover:shadow-[0_0_30px_rgba(59,130,246,0.3)]' : 'hover:!border-[#FCDD00]/50 hover:shadow-[0_0_30px_rgba(252,221,0,0.3)]'}`}>
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
          <h2 className="text-3xl md:text-5xl font-bold mb-6 text-white">Mes Offres</h2>
          <p className="text-gray-400">
            Des solutions adaptées à chaque niveau d'exigence. Choisissez votre voie vers l'excellence cognitive.
          </p>
        </div>

        <div className="flex flex-col">
          {OFFERS.map((offer) => (
            <OfferCard key={offer.id} offer={offer} onSelect={handleSelect} />
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
// PRESS/MEDIA SECTION
// ============================================================================
function PressSection() {
  const logos = ["BENZINGA", "StreetInsider", "MarketWatch", "REUTERS", "Yahoo Finance", "AP News"];

  return (
    <section className="py-8 bg-black overflow-hidden">
      <p className="text-xs uppercase tracking-[0.3em] text-gray-600 text-center mb-6">Vu dans les médias</p>
      <div className="relative">
        <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-black to-transparent z-10" />
        <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-black to-transparent z-10" />
        <motion.div
          className="flex gap-16 items-center"
          animate={{ x: [0, -800] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        >
          {[...logos, ...logos, ...logos].map((logo, i) => (
            <span key={i} className="text-gray-600 text-lg font-semibold whitespace-nowrap">{logo}</span>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

// ============================================================================
// WAITLIST SECTION
// ============================================================================
function Waitlist() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success'>('idle');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setStatus('loading');

    // Simulate API call
    setTimeout(() => {
      console.log('Registered:', email);
      setStatus('success');
      setEmail('');
    }, 1500);
  };

  return (
    <section id="join-waitlist" className="py-32 relative bg-neutral-900 overflow-hidden">
      {/* Grid Background */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none" />

      <div className="container mx-auto px-6 relative z-10">
        <div className="max-w-4xl mx-auto bg-black/50 backdrop-blur-xl border border-white/10 rounded-3xl p-8 md:p-16 text-center">
          <h2 className="text-4xl md:text-6xl font-bold mb-6 text-white tracking-tight">
            ACCÈS ANTICIPÉ
          </h2>
          <p className="text-gray-400 text-lg mb-10 max-w-xl mx-auto">
            Rejoignez la liste d'attente exclusive pour Neurocore 360. Les places pour la phase bêta sont limitées.
          </p>

          {status === 'success' ? (
            <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-8 animate-pulse">
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
          <a href="#" className="text-gray-500 hover:text-white transition-colors">Instagram</a>
          <a href="#" className="text-gray-500 hover:text-white transition-colors">Twitter</a>
          <a href="#" className="text-gray-500 hover:text-white transition-colors">LinkedIn</a>
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
      <CertificationsSection />
      <PressSection />
      <OffersSection />
      <Waitlist />
      <Footer />
    </div>
  );
}
