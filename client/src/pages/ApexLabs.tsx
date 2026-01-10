import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { BETA_REVIEWS } from "@/data/betaReviews";

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
    description: "Tu stagnes, t'es creve, tu sais pas pourquoi. Ce scan gratuit analyse 10 domaines cles de ta sante en ~50 questions: sommeil, stress, energie, digestion, entrainement, nutrition, lifestyle et mindset. Tu repars avec un score global sur 100, la liste de tes blocages metaboliques et hormonaux, et un rapport de 5-7 pages. Le point de depart pour comprendre ce qui cloche vraiment.",
    features: ["10 domaines analyses", "Score global sur 100", "Identification des blocages", "Rapport 5-7 pages"],
    price: "Gratuit",
    imageUrl: "https://cdn.speedsize.com/3f711f28-1488-44dc-b013-5e43284ac4b0/https://public-web-assets.uh-static.com/web_v2/womens-health/whitepapers/hr_hrv.png",
    reverse: false
  },
  {
    id: 'anabolic-bioscan',
    title: "ANABOLIC BIOSCAN",
    subtitle: "Analyse Approfondie",
    description: "L'analyse complete pour ceux qui veulent des reponses. 150 questions sur 17 sections: profil hormonal detaille (testosterone, cortisol, thyroide), axes cliniques (diabete, SII, fatigue surrenalienne), nutrition avancee, supplements et composition corporelle. Tu recois un protocole Matin Anti-Cortisol, un protocole Soir Sommeil, un reset digestif 14 jours, un stack supplements personnalise et un plan d'action 30-60-90 jours. Rapport de 20+ pages.",
    features: ["17 sections d'analyse", "Profil hormonal complet", "Axes cliniques", "Stack supplements personnalise"],
    price: "59€",
    imageUrl: "https://cdn.speedsize.com/3f711f28-1488-44dc-b013-5e43284ac4b0/https://public-web-assets.uh-static.com/web_v2/womens-health/whitepapers/bmi_stress_activity.png",
    reverse: true
  },
  {
    id: 'blood-analysis',
    title: "BLOOD ANALYSIS",
    subtitle: "La Verite Biologique",
    description: "Ton medecin te dit que tout est 'normal' mais tu te sens toujours comme de la merde? Normal ≠ Optimal. Upload ton bilan sanguin et j'analyse 39 biomarqueurs sur 6 panels (hormonal, thyroidien, metabolique, inflammatoire, vitamines, hepatique/renal) avec des ranges OPTIMAUX. Je detecte les patterns invisibles, les correlations entre marqueurs, et je te donne des protocoles de correction cibles. Radars visuels + rapport complet.",
    features: ["39 biomarqueurs analyses", "6 panels complets", "Ranges optimaux", "Protocoles personnalises"],
    price: "99€",
    imageUrl: "",
    reverse: false,
    useCustomVisual: true
  },
  {
    id: 'ultimate-scan',
    title: "ULTIMATE SCAN",
    subtitle: "L'Analyse Complete",
    description: "Le scan le plus complet du marche. 210 questions sur 22 sections + analyse photo posturale (face, dos, profil) + integration de tes donnees wearables (Oura, Whoop, Garmin, Apple Watch). On couvre tout: nutrition timing, cardio & performance Zone 2, analyse HRV, blessures & mobilite, psychologie du mindset. Je croise 3 sources de donnees pour generer le rapport le plus precis possible. 40-50 pages de protocoles personnalises.",
    features: ["22 sections d'analyse", "Analyse photo posturale", "Integration wearables", "Protocole 30-60-90 jours"],
    price: "79€",
    imageUrl: "https://cdn.speedsize.com/3f711f28-1488-44dc-b013-5e43284ac4b0/https://public-web-assets.uh-static.com/web_v2/womens-health/whitepapers/cno_pro.png",
    reverse: true
  },
  {
    id: 'burnout-detection',
    title: "BURNOUT DETECTION",
    subtitle: "Detection Precoce",
    description: "Epuise. Irritable. Deconnecte. Si tu te reconnais, ce scan est pour toi. Questionnaire specialise de 80+ questions pour detecter les signes precoces du burnout AVANT qu'il soit trop tard. Tu recois un score de risque sur 100, l'identification de ta phase actuelle (alarme, resistance ou epuisement), une analyse de ton systeme nerveux et un protocole de recuperation structure sur 4 semaines. Plus tu detectes tot, plus tu recuperes vite.",
    features: ["Score de risque burnout", "Analyse systeme nerveux", "Qualite du sommeil", "Protocole recuperation 4 semaines"],
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
  const baseStyle = "px-8 py-3 rounded-sm font-medium transition-all duration-300 tracking-wide text-sm uppercase flex items-center justify-center gap-2 relative overflow-hidden group";

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
// HEADER COMPONENT - EXACT DESIGN SPECS
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
    <header className="fixed top-0 left-0 right-0 z-50 bg-black border-b border-neutral-900">
      <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
        {/* Logo - Inter Black, tracking-tighter */}
        <a href="/apexlabs" className="flex flex-col leading-none">
          <span className="text-xl font-black tracking-tighter text-white">
            APEX<span className="text-[#FCDD00]">LABS</span>
          </span>
          <span className="font-mono text-[10px] text-[#525252] tracking-widest uppercase">
            BY ACHZOD
          </span>
        </a>

        {/* Nav - Inter Bold, uppercase, gray */}
        <nav className="hidden md:flex items-center gap-8">
          <button onClick={() => scrollToSection('offers')} className="text-xs font-bold uppercase text-[#A3A3A3] hover:text-white transition-colors">
            Protocoles
          </button>
          <button onClick={() => scrollToSection('reviews')} className="text-xs font-bold uppercase text-[#A3A3A3] hover:text-white transition-colors">
            Résultats
          </button>
          <button onClick={() => scrollToSection('join-waitlist')} className="text-xs font-bold uppercase text-[#A3A3A3] hover:text-white transition-colors">
            Vision
          </button>
        </nav>

        {/* CTA Button - Yellow bg, black text, Inter Black, rounded-sm */}
        <button
          onClick={() => scrollToSection('offers')}
          className="px-5 py-2.5 bg-[#FCDD00] text-black text-xs font-black uppercase tracking-wide rounded-sm hover:bg-[#FCDD00]/90 transition-colors"
        >
          S'inscrire
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
  const [spotsLeft, setSpotsLeft] = useState(199);

  // Fetch real spots count from API on mount
  useEffect(() => {
    fetch('/api/waitlist/spots')
      .then(res => res.json())
      .then(data => {
        if (data.success && typeof data.spotsLeft === 'number') {
          setSpotsLeft(data.spotsLeft);
        }
      })
      .catch(() => {/* Keep default 199 on error */});
  }, []);

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
        setSpotsLeft(prev => Math.max(0, prev - 1));
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

  const scrollToReviews = () => {
    const element = document.getElementById('reviews');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
      {/* Floating Reviews Badge - Side */}
      <motion.button
        onClick={scrollToReviews}
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 1, duration: 0.6 }}
        className="fixed left-4 top-1/3 z-50 hidden md:flex flex-col items-center gap-2 px-3 py-4 bg-black/80 border border-[#FCDD00]/30 backdrop-blur-xl rounded-sm cursor-pointer hover:border-[#FCDD00] hover:bg-black/90 transition-all duration-300 group"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <motion.div
          className="flex gap-0.5"
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          {[1,2,3,4,5].map((i) => (
            <svg key={i} className="w-3 h-3 text-[#FCDD00]" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          ))}
        </motion.div>
        <span className="text-[#FCDD00] font-bold text-sm">4.9/5</span>
        <span className="text-white font-bold text-lg">{BETA_REVIEWS.length}</span>
        <span className="text-gray-400 text-[10px] uppercase tracking-wider">avis</span>
        <motion.div
          className="w-4 h-4 mt-1"
          animate={{ y: [0, 3, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          <svg viewBox="0 0 24 24" fill="none" className="w-full h-full text-[#FCDD00] opacity-60 group-hover:opacity-100 transition-opacity">
            <path d="M12 5v14m0 0l-6-6m6 6l6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </motion.div>
      </motion.button>

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
                    <p className="text-neutral-400 text-sm font-light">Je te contacterai très prochainement.</p>
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
                            Places_Restantes: <span className="text-[#00FF41]">{spotsLeft}</span>
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

          {/* Description - Inter Light with border-l */}
          <p className="text-neutral-400 text-base leading-relaxed font-light border-l-2 border-neutral-700 pl-4">
            {description}
          </p>

          {/* Features Grid - Chevron + JetBrains Mono Uppercase */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-4">
            {features.map((feature, idx) => (
              <div
                key={idx}
                className="flex items-center gap-3 py-2"
              >
                <span className="text-[#FCDD00] font-mono font-bold">&gt;</span>
                <span className="font-mono text-xs uppercase tracking-wide text-neutral-300">{feature}</span>
              </div>
            ))}
          </div>

          {/* Price Block - Design System Style */}
          <div className="pt-6 flex flex-col sm:flex-row items-start gap-4">
            <div className="inline-block bg-black border border-neutral-800 px-6 py-4">
              <div className="font-mono text-[9px] uppercase tracking-widest text-neutral-600 mb-1">
                Investissement
              </div>
              <div className="text-2xl md:text-3xl font-black text-white tracking-tight">
                {price}
              </div>
            </div>
            {/* CTA Button - Scroll to waitlist */}
            <button
              onClick={() => document.getElementById('join-waitlist')?.scrollIntoView({ behavior: 'smooth' })}
              className="px-6 py-4 bg-[#FCDD00] text-black font-mono text-xs uppercase tracking-widest hover:bg-[#FCDD00]/80 transition-colors flex items-center gap-2"
            >
              Réserver ma place
              <span>&gt;</span>
            </button>
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
        {/* Header with Stroke Text Effect */}
        <div className="text-center mb-16">
          <span className="font-mono text-[10px] sm:text-xs text-neuro-accent uppercase tracking-[0.3em] block mb-3">
            Beta Testers • {BETA_REVIEWS.length}+ avis • 4.9/5 ★
          </span>
          <h2 className="font-sans font-black text-3xl sm:text-4xl md:text-5xl lg:text-6xl text-white uppercase tracking-tighter mb-2">
            RÉSULTATS
          </h2>
          <h2 className="font-sans font-black text-3xl sm:text-4xl md:text-5xl lg:text-6xl uppercase tracking-tighter mb-6" style={{ WebkitTextStroke: '1px rgba(255,255,255,0.2)', color: 'transparent' }}>
            VALIDÉS
          </h2>
          <p className="text-gray-400 max-w-xl mx-auto">
            Des transformations mesurables, validées par les données. Ils ont testé les anciens audits, ils valident Le protocole.
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

              {/* Star rating */}
              <div className="flex items-center gap-0.5 mb-3">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className={`w-4 h-4 ${i < review.rating ? 'text-yellow-400' : 'text-gray-600'}`} fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
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
    { name: "Apple News", url: "https://www.newsfilecorp.com/release/239656" },
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
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#FCDD00] mb-6">Ma Vision</p>
          <h2 className="text-4xl md:text-6xl lg:text-7xl font-black mb-2 text-white tracking-tighter uppercase">
            OPTIMISATION
          </h2>
          <h2 className="text-4xl md:text-6xl lg:text-7xl font-black mb-8 tracking-tighter uppercase" style={{ WebkitTextStroke: '1px rgba(255,255,255,0.2)', color: 'transparent' }}>
            HUMAINE
          </h2>
          <p className="text-gray-400 text-lg mb-12 max-w-2xl mx-auto leading-relaxed">
            Le protocole représente ma méthode : analyser en profondeur ta physiologie pour identifier exactement ce qui bloque ta progression.
            Je transforme les données en actions, les résultats en excellence.
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
            className="px-8 py-4 bg-[#FCDD00] text-black font-black text-sm uppercase tracking-widest rounded-sm hover:bg-[#FCDD00]/90 transition-all shadow-[0_0_20px_rgba(252,221,0,0.3)] hover:shadow-[0_0_30px_rgba(252,221,0,0.5)]"
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
      <div className="container mx-auto px-6">
        {/* Main footer row */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-8">
          <div className="text-white font-bold tracking-tighter text-xl">
            APEX<span className="text-[#FCDD00]">LABS</span>
          </div>

          {/* Legal links */}
          <div className="flex gap-6 text-sm">
            <a href="mailto:achzodyt@gmail.com" className="text-gray-500 hover:text-[#FCDD00] transition-colors">Contact</a>
            <a href="/mentions-legales" className="text-gray-500 hover:text-[#FCDD00] transition-colors">Mentions légales</a>
            <a href="/cgv" className="text-gray-500 hover:text-[#FCDD00] transition-colors">Conditions générales</a>
          </div>

          {/* Social links */}
          <div className="flex gap-4 items-center">
            <a href="https://instagram.com/achzod" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-[#FCDD00] transition-colors" aria-label="Instagram">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
            </a>
            <a href="https://youtube.com/@achzod" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-[#FCDD00] transition-colors" aria-label="YouTube">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
              </svg>
            </a>
            <a href="https://twitter.com/achzod" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-[#FCDD00] transition-colors" aria-label="Twitter">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
            </a>
            <a href="https://facebook.com/achzod" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-[#FCDD00] transition-colors" aria-label="Facebook">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
            </a>
          </div>
        </div>

        {/* Copyright */}
        <div className="text-center text-gray-600 text-xs">
          &copy; {new Date().getFullYear()} AchzodCoaching. Tous droits réservés.
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
