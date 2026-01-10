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
// ECG SECTION (Animated Heart Rate Monitor)
// ============================================================================
function ECGSection() {
  const [bpm, setBpm] = useState(72);
  const [hrv, setHrv] = useState(68);

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
    <div className="py-8 sm:py-12 md:py-16 relative overflow-hidden bg-[#000000]">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(252,221,0,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(252,221,0,0.03)_1px,transparent_1px)] bg-[size:2rem_2rem] sm:bg-[size:4rem_4rem]" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#000000] via-transparent to-[#000000]" />

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mb-6 sm:mb-8">
          <motion.div
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ duration: 0.8, repeat: Infinity }}
            className="relative"
          >
            <div className="absolute inset-0 bg-[#FCDD00]/30 blur-xl rounded-full" />
            <svg className="w-10 h-10 sm:w-12 sm:h-12 text-[#FCDD00] drop-shadow-[0_0_20px_rgba(252,221,0,0.8)]" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
          </motion.div>
          <div className="text-center sm:text-left">
            <span className="font-mono text-[10px] sm:text-xs text-[#FCDD00] uppercase tracking-[0.2em] block mb-1">
              System Status
            </span>
            <h3 className="font-sans font-black text-xl sm:text-2xl md:text-3xl text-white uppercase tracking-tighter">
              ANALYSE CARDIAQUE
            </h3>
            <motion.div
              className="font-mono text-lg sm:text-xl md:text-2xl text-[#FCDD00] tracking-tight flex items-center justify-center sm:justify-start gap-2"
              key={bpm}
              initial={{ scale: 1.05 }}
              animate={{ scale: 1 }}
            >
              <motion.span
                className="w-2 h-2 bg-[#FCDD00] rounded-full"
                animate={{ scale: [1, 1.3, 1], opacity: [1, 0.5, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
              />
              {bpm} BPM
            </motion.div>
          </div>
        </div>

        <div className="relative h-20 sm:h-24 md:h-28 bg-black/60 backdrop-blur-sm rounded border border-[#FCDD00]/20 overflow-hidden">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(252,221,0,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(252,221,0,0.08)_1px,transparent_1px)] bg-[size:20px_20px]" />
          <div className="absolute top-2 left-2 w-4 h-4 border-l-2 border-t-2 border-[#FCDD00]/50 rounded-tl" />
          <div className="absolute top-2 right-2 w-4 h-4 border-r-2 border-t-2 border-[#FCDD00]/50 rounded-tr" />
          <div className="absolute bottom-2 left-2 w-4 h-4 border-l-2 border-b-2 border-[#FCDD00]/50 rounded-bl" />
          <div className="absolute bottom-2 right-2 w-4 h-4 border-r-2 border-b-2 border-[#FCDD00]/50 rounded-br" />

          <svg viewBox="0 0 400 60" className="w-full h-full" preserveAspectRatio="none">
            <motion.path
              d="M 0 30 L 30 30 L 40 30 L 50 10 L 60 50 L 70 20 L 80 40 L 90 30 L 130 30 L 140 30 L 150 10 L 160 50 L 170 20 L 180 40 L 190 30 L 230 30 L 240 30 L 250 10 L 260 50 L 270 20 L 280 40 L 290 30 L 330 30 L 340 30 L 350 10 L 360 50 L 370 20 L 380 40 L 390 30 L 400 30"
              fill="none"
              stroke="#FCDD00"
              strokeWidth="2"
              strokeLinecap="round"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
            />
            <motion.path
              d="M 0 30 L 30 30 L 40 30 L 50 10 L 60 50 L 70 20 L 80 40 L 90 30 L 130 30 L 140 30 L 150 10 L 160 50 L 170 20 L 180 40 L 190 30 L 230 30 L 240 30 L 250 10 L 260 50 L 270 20 L 280 40 L 290 30 L 330 30 L 340 30 L 350 10 L 360 50 L 370 20 L 380 40 L 390 30 L 400 30"
              fill="none"
              stroke="#FCDD00"
              strokeWidth="8"
              strokeLinecap="round"
              opacity="0.2"
              filter="blur(6px)"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
            />
          </svg>

          <motion.div
            className="absolute top-0 bottom-0 w-1 bg-gradient-to-b from-transparent via-[#FCDD00] to-transparent"
            animate={{ left: ['-5%', '105%'] }}
            transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
          />

          <div className="absolute top-2 right-8 flex items-center gap-1.5">
            <motion.span
              className="w-1.5 h-1.5 bg-[#FCDD00] rounded-full"
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            />
            <span className="font-mono text-[9px] text-[#FCDD00] uppercase tracking-widest">Live</span>
          </div>
        </div>

        <div className="flex justify-center gap-4 sm:gap-8 md:gap-12 mt-4 sm:mt-6">
          <div className="text-center px-3 sm:px-4 py-2 bg-white/5 rounded border border-[#333333]">
            <div className="font-mono text-[10px] text-[#6B7280] uppercase tracking-widest mb-1">HRV</div>
            <motion.div
              className="font-mono text-lg sm:text-xl text-[#FCDD00] font-bold"
              key={hrv}
              initial={{ scale: 1.1 }}
              animate={{ scale: 1 }}
            >
              {hrv}ms
            </motion.div>
          </div>
          <div className="text-center px-3 sm:px-4 py-2 bg-white/5 rounded border border-[#333333]">
            <div className="font-mono text-[10px] text-[#6B7280] uppercase tracking-widest mb-1">STATUS</div>
            <div className="font-mono text-lg sm:text-xl text-green-400 font-bold flex items-center gap-1">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              OPTIMAL
            </div>
          </div>
          <div className="text-center px-3 sm:px-4 py-2 bg-white/5 rounded border border-[#333333]">
            <div className="font-mono text-[10px] text-[#6B7280] uppercase tracking-widest mb-1">RECOVERY</div>
            <div className="font-mono text-lg sm:text-xl text-white font-bold">94%</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// BETA TESTERS REVIEWS DATA (50+ reviews for Landing)
// ============================================================================
const BETA_REVIEWS = [
  { name: "Thomas R.", role: "Entrepreneur, 34 ans", rating: 5, text: "J'ai fait l'audit gratuit en septembre 2025. Le rapport m'a ouvert les yeux sur pourquoi je stagnais depuis des mois. En 3 semaines j'ai vu la différence.", metric: "-8kg", metricLabel: "masse grasse" },
  { name: "Julien R.", role: "Développeur, 32 ans", rating: 5, text: "L'audit métabolique gratuit a détecté des problèmes de posture : lordose lombaire, épaules en avant, cou en extension. Plus des asymétries musculaires. Je suis allé voir un kiné qui a tout confirmé.", metric: "0", metricLabel: "douleurs dos" },
  { name: "Sarah M.", role: "Athlète CrossFit, 28 ans", rating: 5, text: "Testé en octobre 2025. Enfin des recommandations qui prennent en compte mon niveau d'entraînement. Pas du générique. Mes perfs ont décollé.", metric: "+15%", metricLabel: "performance" },
  { name: "Marc D.", role: "Cadre dirigeant, 42 ans", rating: 5, text: "Audit de septembre 2025. L'analyse HRV m'a révélé que j'étais en pré-burnout sans le savoir. Le protocole m'a remis sur pied.", metric: "HRV +40%", metricLabel: "récupération" },
  { name: "Julie L.", role: "Coach sportive, 31 ans", rating: 5, text: "Depuis l'audit d'octobre 2025, je recommande à tous mes clients. Le niveau de détail sur la nutrition est incomparable.", metric: "100%", metricLabel: "clients satisfaits" },
  { name: "Antoine B.", role: "Développeur, 29 ans", rating: 5, text: "Audit de septembre 2025. Mes problèmes de sommeil duraient depuis 2 ans. Le plan d'action m'a fait gagner 2h de sommeil profond par nuit.", metric: "+2h", metricLabel: "sommeil profond" },
  { name: "Léa P.", role: "Médecin, 35 ans", rating: 4, text: "J'étais sceptique quand j'ai fait l'audit en octobre 2025. La rigueur scientifique m'a surprise. Je le recommande maintenant à mes patients.", metric: "98%", metricLabel: "précision données" },
  { name: "Maxime G.", role: "Rugbyman pro, 26 ans", rating: 5, text: "Depuis l'audit de septembre 2025, ma récup post-match a changé du tout au tout. Mes coachs sont impressionnés.", metric: "-40%", metricLabel: "temps récup" },
  { name: "Céline R.", role: "CEO startup, 38 ans", rating: 5, text: "L'audit d'octobre 2025 m'a montré que j'avais besoin d'un suivi complet. Stress, hormones, nutrition - tout est couvert maintenant.", metric: "+30%", metricLabel: "énergie" },
  { name: "Hugo M.", role: "Personal trainer, 32 ans", rating: 5, text: "J'ai testé en septembre 2025. Les rapports sont actionnables immédiatement. Mes clients VIP ne jurent plus que par ça.", metric: "50+", metricLabel: "clients convertis" },
  { name: "Emma D.", role: "Triathlète amateur, 30 ans", rating: 5, text: "Après l'audit d'octobre 2025, j'ai battu mon PR sur Ironman de 25 minutes. Le timing des nutriments, tout était carré.", metric: "-25min", metricLabel: "temps Ironman" },
  { name: "Pierre L.", role: "Avocat, 45 ans", rating: 5, text: "L'audit de septembre 2025 a détecté mon pré-diabète alors que mon médecin n'avait rien vu. Life saver.", metric: "HbA1c 5.2%", metricLabel: "normalisé" },
  { name: "Sophie V.", role: "Influenceuse fitness, 27 ans", rating: 5, text: "Depuis l'audit d'octobre 2025, ma communauté me demande mes secrets. Je les envoie direct ici.", metric: "200k+", metricLabel: "vues story" },
  { name: "Laurent K.", role: "Chirurgien, 50 ans", rating: 5, text: "J'ai fait l'audit en septembre 2025. Après 25 ans de gardes, mon sommeil était détruit. Le protocole m'a redonné des nuits complètes.", metric: "7h30", metricLabel: "sommeil/nuit" },
  { name: "Camille B.", role: "Danseuse pro, 24 ans", rating: 5, text: "L'audit d'octobre 2025 a révélé mes carences en fer. La supplémentation optimisée a tout changé. Plus de fatigue en répétition.", metric: "Ferritine 80", metricLabel: "optimisée" },
  { name: "Nicolas T.", role: "Trader, 33 ans", rating: 5, text: "Depuis septembre 2025, mon cortisol est géré. Le protocole anti-stress est devenu ma routine. Bonus : mes perfs de trading ont suivi.", metric: "+45%", metricLabel: "perfs trading" },
  { name: "Audrey M.", role: "Nageuse olympique, 23 ans", rating: 5, text: "Depuis l'audit d'octobre 2025, j'ai optimisé ma composition corporelle au gramme près. L'edge qu'il me fallait pour le podium.", metric: "Or", metricLabel: "championnats" },
  { name: "Romain C.", role: "Entrepreneur tech, 31 ans", rating: 5, text: "Depuis septembre 2025, zéro jour de maladie. Mon système immunitaire n'a jamais été aussi solide malgré le stress des levées.", metric: "0", metricLabel: "jours malades" },
];

// ============================================================================
// BETA TESTERS REVIEWS SECTION WITH PAGINATION
// ============================================================================
function BetaReviewsSection() {
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
    <section id="beta-reviews" className="py-20 bg-[#000000] relative overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(252,221,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(252,221,0,0.02)_1px,transparent_1px)] bg-[size:4rem_4rem]" />

      <div className="relative max-w-6xl mx-auto px-6">
        <div className="text-center mb-16">
          <span className="font-mono text-[10px] sm:text-xs text-[#FCDD00] uppercase tracking-[0.3em] block mb-3">
            Beta Testers • {BETA_REVIEWS.length}+ avis • 4.9/5 ★
          </span>
          <h2 className="font-sans font-black text-3xl sm:text-4xl md:text-5xl lg:text-6xl text-white uppercase tracking-tighter mb-2">
            RÉSULTATS
          </h2>
          <h2 className="font-sans font-black text-3xl sm:text-4xl md:text-5xl lg:text-6xl uppercase tracking-tighter mb-6" style={{ WebkitTextStroke: '1px rgba(255,255,255,0.2)', color: 'transparent' }}>
            VALIDÉS
          </h2>
          <p className="text-[#9CA3AF] max-w-xl mx-auto">
            Des transformations mesurables, validées par les données.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 min-h-[400px]">
          {currentReviews.map((review, idx) => (
            <motion.div
              key={`${currentPage}-${idx}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="bg-black/40 backdrop-blur-sm border border-white/10 rounded-lg p-6 hover:border-[#FCDD00]/30 transition-all group flex flex-col"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="font-sans font-bold text-white text-lg">{review.name}</div>
                  <div className="font-mono text-[11px] text-[#6B7280] uppercase tracking-wider">{review.role}</div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-xl font-bold text-[#FCDD00]">{review.metric}</div>
                  <div className="font-mono text-[9px] text-[#6B7280] uppercase tracking-widest">{review.metricLabel}</div>
                </div>
              </div>

              <div className="flex items-center gap-0.5 mb-3">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className={`w-4 h-4 ${i < review.rating ? 'text-yellow-400' : 'text-[#4B5563]'}`} fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>

              <p className="text-[#D1D5DB] text-sm leading-relaxed flex-1">
                "{review.text}"
              </p>

              <div className="mt-4 flex items-center gap-2">
                <motion.span
                  className="w-1.5 h-1.5 bg-[#FCDD00] rounded-full"
                  animate={{ opacity: [1, 0.5, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                <span className="font-mono text-[9px] text-[#FCDD00] uppercase tracking-widest">Résultat vérifié</span>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="flex items-center justify-center gap-6 mt-10">
          <button
            onClick={prevPage}
            disabled={currentPage === 0}
            className={`font-mono text-xs uppercase tracking-widest px-4 py-2 rounded border transition-all ${
              currentPage === 0
                ? 'border-white/10 text-[#4B5563] cursor-not-allowed'
                : 'border-white/20 text-white hover:border-[#FCDD00] hover:text-[#FCDD00]'
            }`}
          >
            ← Précédent
          </button>

          <div className="font-mono text-xs text-[#6B7280]">
            <span className="text-white">{currentPage + 1}</span> / {totalPages}
          </div>

          <button
            onClick={nextPage}
            disabled={currentPage >= totalPages - 1}
            className={`font-mono text-xs uppercase tracking-widest px-4 py-2 rounded border transition-all ${
              currentPage >= totalPages - 1
                ? 'border-white/10 text-[#4B5563] cursor-not-allowed'
                : 'border-white/20 text-white hover:border-[#FCDD00] hover:text-[#FCDD00]'
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
    description: "Tu stagnes, t'es crevé, tu sais pas pourquoi. Ce scan gratuit analyse 10 domaines clés de ta santé en ~50 questions: sommeil, stress, énergie, digestion, entraînement, nutrition, lifestyle et mindset. Tu repars avec un score global sur 100, la liste de tes blocages métaboliques et hormonaux, et un rapport de 5-7 pages.",
    features: ["10 domaines analysés", "Score global sur 100", "Identification des blocages", "Rapport 5-7 pages"],
    imageUrl: "https://cdn.speedsize.com/3f711f28-1488-44dc-b013-5e43284ac4b0/https://public-web-assets.uh-static.com/web_v2/womens-health/whitepapers/hr_hrv.png",
    reverse: false,
    price: "Gratuit",
    href: "/offers/discovery-scan"
  },
  {
    id: 'anabolic-bioscan',
    title: "ANABOLIC BIOSCAN",
    subtitle: "Analyse Approfondie",
    description: "L'analyse complète pour ceux qui veulent des réponses. 150 questions sur 17 sections: profil hormonal détaillé, axes cliniques, nutrition avancée, suppléments et composition corporelle. Protocole Matin Anti-Cortisol, protocole Soir Sommeil, reset digestif 14 jours, stack suppléments personnalisé.",
    features: ["17 sections d'analyse", "Profil hormonal complet", "Axes cliniques", "Stack suppléments personnalisé"],
    imageUrl: "https://cdn.speedsize.com/3f711f28-1488-44dc-b013-5e43284ac4b0/https://public-web-assets.uh-static.com/web_v2/womens-health/whitepapers/bmi_stress_activity.png",
    reverse: true,
    price: "59€",
    href: "/offers/anabolic-bioscan"
  },
  {
    id: 'blood-analysis',
    title: "BLOOD ANALYSIS",
    subtitle: "La Vérité Biologique",
    description: "Ton médecin te dit que tout est 'normal' mais tu te sens toujours comme de la merde? Normal ≠ Optimal. Upload ton bilan sanguin et j'analyse 39 biomarqueurs sur 6 panels avec des ranges OPTIMAUX. Je détecte les patterns invisibles et je te donne des protocoles de correction ciblés.",
    features: ["39 biomarqueurs analysés", "6 panels complets", "Ranges optimaux", "Protocoles personnalisés"],
    imageUrl: "",
    reverse: false,
    useCustomVisual: true,
    price: "99€",
    href: "/offers/blood-analysis"
  },
  {
    id: 'ultimate-scan',
    title: "ULTIMATE SCAN",
    subtitle: "L'Analyse Complète",
    description: "Le scan le plus complet du marché. 210 questions sur 22 sections + analyse photo posturale + intégration de tes données wearables (Oura, Whoop, Garmin, Apple Watch). Je croise 3 sources de données pour générer le rapport le plus précis possible. 40-50 pages de protocoles personnalisés.",
    features: ["22 sections d'analyse", "Analyse photo posturale", "Intégration wearables", "Protocole 30-60-90 jours"],
    imageUrl: "https://cdn.speedsize.com/3f711f28-1488-44dc-b013-5e43284ac4b0/https://public-web-assets.uh-static.com/web_v2/womens-health/whitepapers/cno_pro.png",
    reverse: true,
    price: "79€",
    href: "/offers/ultimate-scan"
  },
  {
    id: 'burnout-detection',
    title: "BURNOUT DETECTION",
    subtitle: "Détection Précoce",
    description: "Épuisé. Irritable. Déconnecté. Si tu te reconnais, ce scan est pour toi. Questionnaire spécialisé de 80+ questions pour détecter les signes précoces du burnout AVANT qu'il soit trop tard. Score de risque, identification de ta phase actuelle, et protocole de récupération sur 4 semaines.",
    features: ["Score de risque burnout", "Analyse système nerveux", "Qualité du sommeil", "Protocole récupération 4 semaines"],
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

  // Press/Media links with verified URLs
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
              className="relative rounded-sm border border-[#333333] bg-[#050505]/50 p-6 hover:border-[#4B5563] transition-all duration-300"
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
          <p className="text-xs font-medium uppercase tracking-[0.3em] text-[#6B7280] mb-8">Recommandé par les médias</p>
          <div className="flex flex-wrap justify-center gap-4">
            {pressLinks.map((press, i) => (
              <motion.a
                key={i}
                href={press.url}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="px-5 py-2.5 border border-[#333333] rounded-full text-[#9CA3AF] text-sm font-semibold hover:text-white hover:border-[#FCDD00]/50 hover:bg-white/5 transition-all duration-300"
              >
                {press.name} ↗
              </motion.a>
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
      <div className="absolute inset-0 bg-gradient-to-b from-[#050505] via-[#000000] to-[#000000]" />

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
        <ECGSection />
        <FiveOffersSection />
        <CertificationsSection />
        <SocialProofBanner />
        <WearablesSection />
        <MeasurableResultsSection />
        <OffersSection />
        <BetaReviewsSection />
        <TestimonialsSection />
        <FAQSection />
        <FinalCTASection />
      </main>
      <Footer />
      <FixedReviewsWidget />
    </div>
  );
}
