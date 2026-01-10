import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  Cell,
  LineChart,
  Line,
  PieChart,
  Pie,
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Menu,
  X,
  ChevronRight,
  Activity,
  Zap,
  Brain,
  ArrowUpRight,
  ArrowDown,
  ArrowUp,
  Search,
  Check,
  AlertCircle,
  Moon,
  Heart,
  Dumbbell,
  FlaskConical,
  Target,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Flame,
  Droplets,
  Wind,
  Clock,
  Battery,
  Shield,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Pill,
  Calendar,
  BarChart3,
  Star,
} from 'lucide-react';

// ============================================================================
// TYPES (exported for use in other components)
// ============================================================================
export interface Theme {
  id: string;
  name: string;
  type: 'dark' | 'light';
  colors: {
    primary: string;
    background: string;
    surface: string;
    border: string;
    text: string;
    textMuted: string;
    grid: string;
    glow: string;
  };
}

export interface Metric {
  label: string;
  value: number;
  max: number;
  description: string;
  key: string;
}

export interface SectionContent {
  id: string;
  title: string;
  subtitle?: string;
  content: string;
  chips?: string[];
  score?: number;
  scoreLabel?: string;
  metrics?: { label: string; value: number; status: 'critical' | 'warning' | 'good' }[];
  chartType?: 'gauge' | 'bars' | 'timeline' | 'comparison' | 'stack';
}

export interface ReportData {
  clientName: string;
  clientAge?: number;
  date: string;
  globalScore: number;
  metrics: Metric[];
  sections: SectionContent[];
}

// ============================================================================
// THEMES
// ============================================================================
const THEMES: Theme[] = [
  {
    id: 'ultrahuman',
    name: 'M1 Black',
    type: 'dark',
    colors: {
      primary: '#FCDD00',
      background: '#000000',
      surface: '#0a0a0a',
      border: 'rgba(252, 221, 0, 0.15)',
      text: '#FFFFFF',
      textMuted: '#a1a1aa',
      grid: 'rgba(252, 221, 0, 0.05)',
      glow: 'rgba(252, 221, 0, 0.2)',
    },
  },
  {
    id: 'metabolic',
    name: 'Fire',
    type: 'dark',
    colors: {
      primary: '#FF4F00',
      background: '#050505',
      surface: '#111111',
      border: 'rgba(255, 79, 0, 0.2)',
      text: '#FFFFFF',
      textMuted: '#A1A1AA',
      grid: 'rgba(255, 79, 0, 0.08)',
      glow: 'rgba(255, 79, 0, 0.25)',
    },
  },
  {
    id: 'titanium',
    name: 'Titanium',
    type: 'light',
    colors: {
      primary: '#000000',
      background: '#F2F2F2',
      surface: '#FFFFFF',
      border: 'rgba(0, 0, 0, 0.08)',
      text: '#171717',
      textMuted: '#737373',
      grid: 'rgba(0, 0, 0, 0.04)',
      glow: 'rgba(0, 0, 0, 0.05)',
    },
  },
  {
    id: 'organic',
    name: 'Sand Stone',
    type: 'light',
    colors: {
      primary: '#A85A32',
      background: '#F0EFE9',
      surface: '#E6E4DD',
      border: 'rgba(168, 90, 50, 0.1)',
      text: '#292524',
      textMuted: '#78716C',
      grid: 'rgba(168, 90, 50, 0.05)',
      glow: 'rgba(168, 90, 50, 0.1)',
    },
  },
];

// ============================================================================
// DEFAULT DATA (fallback for demo)
// ============================================================================
const DEFAULT_REPORT_DATA: ReportData = {
  clientName: 'Julien R.',
  clientAge: 29,
  date: '2 Janvier 2026',
  globalScore: 5.8,
  metrics: [
    { label: 'Sommeil', value: 3.5, max: 10, description: 'Architecture', key: 'sommeil' },
    { label: 'Stress', value: 3.8, max: 10, description: 'Neuro-Endocrinien', key: 'stress' },
    { label: 'Hormones', value: 4.2, max: 10, description: 'Metabolisme', key: 'hormones' },
    { label: 'Digestion', value: 4.5, max: 10, description: 'Microbiote', key: 'digestion' },
    { label: 'Training', value: 2.5, max: 10, description: 'Performance', key: 'training' },
  ] as Metric[],
  sections: [
    {
      id: 'intro',
      title: 'Message d\'ouverture',
      subtitle: 'Introduction',
      content: `<p>Ton dossier est ouvert devant moi. Pas de surprises, pas de langue de bois : tu vas recevoir une analyse chirurgicale de ce qui bloque reellement ta progression.</p>
<p>Ce rapport decortique chaque systeme de ton corps — sommeil, stress, hormones, digestion, entrainement — et surtout comment ils s'influencent mutuellement. Ton score global de <strong>58/100</strong> cache une realite plus nuancee.</p>
<p>Tu vas comprendre pourquoi ton energie flanche malgre la discipline. Et surtout, quels leviers actionner — dans quel ordre — pour debloquer la machine.</p>`,
      chips: ['Analyse Chirurgicale', 'Blocages Identifies'],
      score: 58,
      scoreLabel: 'Score Global',
      chartType: 'gauge' as const,
    },
    {
      id: 'global',
      title: 'Lecture globale',
      subtitle: 'Le Paradoxe',
      content: `<p>Ton corps hurle quelque chose que tu refuses d'entendre.</p>
<p>Tu fais tout ce qu'on attend d'un gars qui veut optimiser sa sante. Et pourtant... tu stagnes. L'energie manque. La recuperation traine. Les resultats ne suivent pas l'investissement.</p>
<p><strong>Systeme nerveux : 38 sur 100.</strong> Le score le plus bas de ton bilan. Et c'est precisement ce score qui tire tout le reste vers le bas.</p>
<p>Stress eleve. Anxiete frequente. Concentration difficile. Ce triptyque raconte une histoire que ton corps connait par coeur : mode survie permanent. Ton systeme nerveux sympathique — celui qui gere la reponse au danger — tourne en surregime.</p>`,
      chips: ['Mode Survie', 'Sympathique Dominant', 'Frein Metabolique'],
      score: 38,
      scoreLabel: 'Systeme Nerveux',
      metrics: [
        { label: 'Stress', value: 85, status: 'critical' as const },
        { label: 'Anxiete', value: 72, status: 'critical' as const },
        { label: 'Focus', value: 35, status: 'warning' as const },
        { label: 'Energie', value: 28, status: 'critical' as const },
      ],
      chartType: 'bars' as const,
    },
    {
      id: 'sleep',
      title: 'Sommeil & recuperation',
      subtitle: 'Le Pilier Fragile',
      content: `<p>Ton score sommeil affiche <strong>35/100</strong>. Dette de sommeil massive : 679 heures/an. Deep Sleep < 10%.</p>
<p>Tu dors, oui. Mais tu ne recuperes pas comme tu le devrais. C'est pendant le sommeil profond (N3) que ton hypophyse libere le gros pulse d'hormone de croissance (GH) de la nuit.</p>
<p><strong>HRV estime : 26-32ms</strong> — systeme nerveux sature. Latence d'endormissement : 60-90 min. Reveils nocturnes : 3-4x par nuit.</p>
<p>Objectif : 7h30 minimum. Stack sommeil : Magnesium + Glycine + Inositol + Ashwagandha. Chambre 17-18°C, blackout complet.</p>`,
      chips: ['GH Tronquee', 'Reveils Nocturnes', 'HRV Critique'],
      score: 35,
      scoreLabel: 'Sommeil',
      metrics: [
        { label: 'Deep Sleep', value: 10, status: 'critical' as const },
        { label: 'REM', value: 18, status: 'warning' as const },
        { label: 'Latence', value: 25, status: 'critical' as const },
        { label: 'Continuite', value: 40, status: 'warning' as const },
      ],
      chartType: 'timeline' as const,
    },
    {
      id: 'digestion',
      title: 'Digestion & Microbiote',
      subtitle: 'L\'Axe Intestin-Cerveau',
      content: `<p>Ton score digestif a <strong>45/100</strong>. Dysbiose + Hypochlorhydrie + Leaky Gut probable.</p>
<p>Ballonnements quotidiens, reflux gastrique 2-3x/semaine, intolerances recentes (gluten, lactose). Fast-food 4-5x/semaine.</p>
<p><strong>Le Gluten et la Zonuline :</strong> L'exposition au gluten declenche la liberation de zonuline, qui ouvre les jonctions serrees de ton intestin. Resultat : permeabilite intestinale.</p>
<p>Protocole : Betaine HCL 650mg avec repas, Probiotiques 50 milliards CFU, L-Glutamine 5g matin, Eliminer gluten/lactose 30 jours.</p>`,
      chips: ['Leaky Gut', 'Fermentation', 'Malabsorption'],
      score: 45,
      scoreLabel: 'Digestion',
      metrics: [
        { label: 'Microbiote', value: 35, status: 'critical' as const },
        { label: 'Acidite', value: 30, status: 'critical' as const },
        { label: 'Permeabilite', value: 55, status: 'warning' as const },
        { label: 'Absorption', value: 48, status: 'warning' as const },
      ],
      chartType: 'comparison' as const,
    },
    {
      id: 'stress',
      title: 'Stress & systeme nerveux',
      subtitle: 'Le Goulot d\'Etranglement',
      content: `<p>Ton score systeme nerveux a <strong>38/100</strong> constitue le point le plus bas de ton bilan.</p>
<p>Fatigue surrenalienne Phase 2 avec cortisol bas matin, eleve soir. Deficit dopamine SEVERE (11/40). GABA : 16/40 — BAS.</p>
<p><strong>Impact hormonal :</strong> Le cortisol et la testosterone partagent un precurseur commun (Pregnenolone Steal). En mode survie, ton corps priorise le cortisol.</p>
<p>Protocole : Tyrosine 1g matin a jeun, Mucuna Pruriens 300mg, Ashwagandha KSM-66 600mg soir, Stop cafeine apres 10h.</p>`,
      chips: ['Axe HPA', 'Pregnenolone Steal', 'Dominance Sympathique'],
      score: 38,
      scoreLabel: 'Nerveux',
      metrics: [
        { label: 'Cortisol AM', value: 25, status: 'critical' as const },
        { label: 'Cortisol PM', value: 85, status: 'critical' as const },
        { label: 'Dopamine', value: 28, status: 'critical' as const },
        { label: 'GABA', value: 40, status: 'warning' as const },
      ],
      chartType: 'bars' as const,
    },
    {
      id: 'hormones',
      title: 'Profil hormonal',
      subtitle: 'Zone Grise',
      content: `<p>Cortisol/DHEA ratio effondre. Testosterone libre probablement basse (SHBG elevee). Thyroide ralentie (T3 libre potentiellement basse).</p>
<p><strong>Metaboliseur LENT cafeine</strong> — une tasse de cafe a 16h signifie encore 50% de la cafeine en circulation a 23h.</p>
<p>La cafeine ne te donne pas d'energie, elle bloque les recepteurs a adenosine (le signal de fatigue). Tu "fonctionnes" mais tu ne recuperes pas.</p>`,
      chips: ['Testosterone Libre', 'SHBG', 'Resistance Insuline'],
      score: 42,
      scoreLabel: 'Hormones',
      metrics: [
        { label: 'Testo Libre', value: 35, status: 'critical' as const },
        { label: 'DHEA', value: 40, status: 'warning' as const },
        { label: 'Thyroide', value: 45, status: 'warning' as const },
        { label: 'Insuline', value: 55, status: 'warning' as const },
      ],
      chartType: 'comparison' as const,
    },
    {
      id: 'training',
      title: 'Entrainement',
      subtitle: 'Sedentarite Extreme',
      content: `<p>Ton score Training : <strong>25/100</strong>. Sedentarite extreme : 10-12h assis/jour. 0 entrainement structure.</p>
<p>Steps quotidiens : 2000-3000 (besoin : 7000+). Mobilite nulle. Posture detruite (cyphose, text neck). Sarcopenie precoce.</p>
<p><strong>Emotional Eater + Limbic Friction eleve</strong> — tu manges tes emotions.</p>
<p>Protocole : Force basique 3x/semaine (Full Body 45min), Marche Zone 2 3x/semaine (30-40 min), Mobilite/etirements quotidiens, Meal prep dimanche.</p>`,
      chips: ['Dette de Recuperation', 'Sarcopenie', 'Sedentarite'],
      score: 25,
      scoreLabel: 'Training',
      metrics: [
        { label: 'Force', value: 15, status: 'critical' as const },
        { label: 'Cardio', value: 20, status: 'critical' as const },
        { label: 'Mobilite', value: 25, status: 'critical' as const },
        { label: 'NEAT', value: 30, status: 'critical' as const },
      ],
      chartType: 'bars' as const,
    },
    {
      id: 'supplements',
      title: 'Stack Supplements',
      subtitle: 'Combler les Failles',
      content: `<p><strong>MATIN :</strong></p>
<ul class="list-disc pl-5 space-y-1">
  <li>L-Tyrosine 1000mg (a jeun)</li>
  <li>L-Glutamine 5g</li>
  <li>Vitamine D3+K2 5000UI</li>
  <li>Omega-3 EPA 2g + DHA 1g</li>
  <li>Probiotiques 50B CFU</li>
</ul>
<p class="mt-4"><strong>MIDI :</strong></p>
<ul class="list-disc pl-5 space-y-1">
  <li>Betaine HCL 650mg</li>
  <li>Zinc Picolinate 30mg</li>
  <li>B-Complex</li>
  <li>Alpha-GPC 300mg</li>
</ul>
<p class="mt-4"><strong>SOIR :</strong></p>
<ul class="list-disc pl-5 space-y-1">
  <li>Magnesium Bisglycinate 400mg</li>
  <li>Glycine 3g</li>
  <li>Inositol 2g</li>
  <li>Ashwagandha KSM-66 600mg</li>
  <li>Taurine 2g</li>
</ul>`,
      chips: ['Magnesium', 'Vitamine D3', 'Zinc', 'Omega-3'],
      chartType: 'stack' as const,
    },
    {
      id: 'protocol',
      title: 'Protocole 90 Jours',
      subtitle: '3 Phases',
      content: `<p><strong>PHASE 1 — RESET (J1-30) :</strong></p>
<p>Sortir mode sympathique, remonter HRV, restaurer sommeil. Force basique 3x/semaine, Marche Zone 2 3x/semaine, 2400 kcal/jour, Stop cafeine apres 10h, Coucher 22h30.</p>
<p class="mt-4"><strong>PHASE 2 — BUILD (J31-60) :</strong></p>
<p>Perte gras visceral, gain masse musculaire. 4x Force (split Upper/Lower), 2x Zone 2 + 1x HIIT leger si HRV > 55, 2200 kcal (-200), Carb Cycling.</p>
<p class="mt-4"><strong>PHASE 3 — OPTIMIZE (J61-90) :</strong></p>
<p>Maintenance gains, performance maximale. 3x Force (5-3-1), 2x Conditionnement + 1x Zone 2, 2400 kcal maintenance, DEXA Scan + Bilan sanguin.</p>`,
      chips: ['RESET', 'BUILD', 'OPTIMIZE'],
      chartType: 'timeline' as const,
    },
    {
      id: 'predictions',
      title: 'Predictions',
      subtitle: '30 / 60 / 90 Jours',
      content: `<p><strong>SEMAINE 2 :</strong> Latence sommeil 60min → 25min, HRV 28ms → 48ms, Fringales -70%</p>
<p class="mt-4"><strong>SEMAINE 4 :</strong> Poids -4 a -5kg, Tour taille -3cm, Deep Sleep 10% → 18%, Libido +40%</p>
<p class="mt-4"><strong>SEMAINE 8 :</strong> Poids -7 a -9kg, Masse grasse 18% → 14%, HRV 65-70ms, Force +35-40%</p>
<p class="mt-4"><strong>SEMAINE 12 :</strong> Poids total -9 a -11kg, Masse grasse < 12%, HRV 70-75ms, Testosterone libre +40-45%, Bien-etre 4/10 → 9/10</p>`,
      chips: ['J+30', 'J+60', 'J+90'],
      chartType: 'timeline' as const,
    },
    {
      id: 'conclusion',
      title: 'Conclusion',
      subtitle: 'Le Choix',
      content: `<p>Tu as 29 ans et tu te sens comme un mec de 45 ans fatigue. Le probleme n'est pas "le stress du boulot" ou "la genetique".</p>
<p><strong>C'est un dereglement metabolique systemique.</strong></p>
<p>Si tu suis ce protocole 90 jours : reveils sans alarme, energie stable 7h-23h, muscles visibles, ventre plat.</p>
<p><strong>Ce n'est pas un regime. C'est une reprogrammation neurometabolique.</strong></p>
<p class="mt-6">La distance entre 35% et 95% de ton potentiel n'est pas un gouffre, c'est une serie de verrous a faire sauter. Le premier s'appelle systeme nerveux.</p>`,
      chips: ['Forces', 'Risques', 'Potentiel'],
      score: 95,
      scoreLabel: 'Potentiel J+90',
      chartType: 'gauge' as const,
    },
  ] as SectionContent[],
};

// ============================================================================
// ANIMATED COMPONENTS
// ============================================================================

// Animated Radial Progress with hover effects
const RadialProgress = ({
  score,
  max,
  size = 180,
  strokeWidth = 4,
  color = '#FCDD00',
  label,
  animated = true,
}: {
  score: number;
  max: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  label?: string;
  animated?: boolean;
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [animatedScore, setAnimatedScore] = useState(0);
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const progress = animatedScore / max;
  const dashoffset = circumference - progress * circumference;

  useEffect(() => {
    if (animated) {
      const timer = setTimeout(() => {
        setAnimatedScore(score);
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setAnimatedScore(score);
    }
  }, [score, animated]);

  return (
    <motion.div
      className="relative flex flex-col items-center justify-center cursor-pointer"
      style={{ width: size, height: size }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      animate={{
        scale: isHovered ? 1.05 : 1,
      }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    >
      {/* Glow effect on hover */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{
          background: `radial-gradient(circle, ${color}20 0%, transparent 70%)`,
        }}
        animate={{
          opacity: isHovered ? 1 : 0,
          scale: isHovered ? 1.2 : 1,
        }}
        transition={{ duration: 0.3 }}
      />

      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-border)"
          strokeWidth={strokeWidth}
          strokeOpacity={0.5}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={isHovered ? strokeWidth + 2 : strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={dashoffset}
          strokeLinecap="round"
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: dashoffset }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
          style={{
            filter: isHovered ? `drop-shadow(0 0 8px ${color})` : 'none',
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <motion.span
          className="text-5xl font-medium tracking-tighter"
          style={{ color: 'var(--color-text)' }}
          animate={{ scale: isHovered ? 1.1 : 1 }}
          transition={{ type: 'spring', stiffness: 300 }}
        >
          {Math.round(animatedScore * 10)}
        </motion.span>
        <span className="text-[10px] uppercase tracking-widest text-[var(--color-text-muted)] mt-1">/ {max * 10}</span>
        {label && (
          <motion.span
            className="text-[9px] uppercase tracking-widest mt-2 font-bold"
            style={{ color }}
            initial={{ opacity: 0 }}
            animate={{ opacity: isHovered ? 1 : 0.7 }}
          >
            {label}
          </motion.span>
        )}
      </div>
    </motion.div>
  );
};

// Mini Score Gauge for sections
const MiniGauge = ({
  score,
  max = 100,
  size = 100,
  color,
  label,
}: {
  score: number;
  max?: number;
  size?: number;
  color: string;
  label?: string;
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [animatedScore, setAnimatedScore] = useState(0);
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * Math.PI; // Half circle
  const progress = animatedScore / max;
  const dashoffset = circumference - progress * circumference;

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedScore(score), 500);
    return () => clearTimeout(timer);
  }, [score]);

  const getStatusColor = () => {
    if (score < 40) return '#ef4444';
    if (score < 60) return '#f59e0b';
    return '#22c55e';
  };

  return (
    <motion.div
      className="relative flex flex-col items-center cursor-pointer"
      style={{ width: size, height: size / 2 + 30 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      whileHover={{ scale: 1.05 }}
    >
      <svg width={size} height={size / 2 + 10} className="overflow-visible">
        {/* Background arc */}
        <path
          d={`M ${strokeWidth / 2} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${size / 2}`}
          fill="none"
          stroke="var(--color-border)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        {/* Progress arc */}
        <motion.path
          d={`M ${strokeWidth / 2} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${size / 2}`}
          fill="none"
          stroke={getStatusColor()}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: dashoffset }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
          style={{
            filter: isHovered ? `drop-shadow(0 0 6px ${getStatusColor()})` : 'none',
          }}
        />
      </svg>
      <motion.div
        className="absolute bottom-4 text-center"
        animate={{ y: isHovered ? -4 : 0 }}
      >
        <motion.span
          className="text-2xl font-bold"
          style={{ color: getStatusColor() }}
        >
          {Math.round(animatedScore)}
        </motion.span>
        <span className="text-xs text-[var(--color-text-muted)]">/{max}</span>
      </motion.div>
      {label && (
        <span className="text-[9px] uppercase tracking-widest text-[var(--color-text-muted)] mt-1 font-medium">
          {label}
        </span>
      )}
    </motion.div>
  );
};

// Animated Score Bar
const ScoreBar = ({
  label,
  value,
  status,
  delay = 0,
}: {
  label: string;
  value: number;
  status: 'critical' | 'warning' | 'good';
  delay?: number;
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [animatedValue, setAnimatedValue] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  const getColor = () => {
    if (status === 'critical') return '#ef4444';
    if (status === 'warning') return '#f59e0b';
    return '#22c55e';
  };

  const getIcon = () => {
    if (status === 'critical') return <XCircle size={12} />;
    if (status === 'warning') return <AlertTriangle size={12} />;
    return <CheckCircle2 size={12} />;
  };

  return (
    <motion.div
      className="group cursor-pointer"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: delay / 1000, duration: 0.4 }}
    >
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-xs font-medium text-[var(--color-text)] flex items-center gap-1.5">
          <motion.span
            style={{ color: getColor() }}
            animate={{ scale: isHovered ? 1.2 : 1 }}
          >
            {getIcon()}
          </motion.span>
          {label}
        </span>
        <motion.span
          className="text-xs font-bold"
          style={{ color: getColor() }}
          animate={{ scale: isHovered ? 1.15 : 1 }}
        >
          {Math.round(animatedValue)}%
        </motion.span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--color-border)' }}>
        <motion.div
          className="h-full rounded-full relative"
          style={{ backgroundColor: getColor() }}
          initial={{ width: 0 }}
          animate={{ width: `${animatedValue}%` }}
          transition={{ duration: 0.8, ease: 'easeOut', delay: delay / 1000 }}
        >
          {isHovered && (
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{
                background: `linear-gradient(90deg, transparent, ${getColor()}80, transparent)`,
              }}
              animate={{ x: ['0%', '100%'] }}
              transition={{ duration: 1, repeat: Infinity }}
            />
          )}
        </motion.div>
      </div>
    </motion.div>
  );
};

// Animated Metrics Radar with hover interactions
const MetricsRadar = ({ data, color }: { data: Metric[]; color: string }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const chartData = data.map((m) => ({
    subject: m.label,
    A: m.value,
    fullMark: m.max,
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="px-3 py-2 rounded-lg"
          style={{
            backgroundColor: 'var(--color-surface)',
            border: `1px solid ${color}40`,
            boxShadow: `0 4px 20px ${color}20`,
          }}
        >
          <p className="text-sm font-bold" style={{ color }}>{payload[0].payload.subject}</p>
          <p className="text-lg font-bold text-[var(--color-text)]">
            {payload[0].value}<span className="text-xs text-[var(--color-text-muted)]">/10</span>
          </p>
        </motion.div>
      );
    }
    return null;
  };

  return (
    <motion.div
      className="w-full h-[320px] relative cursor-pointer"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => { setIsHovered(false); setActiveIndex(null); }}
      animate={{ scale: isHovered ? 1.02 : 1 }}
      transition={{ type: 'spring', stiffness: 300 }}
    >
      {/* Glow effect */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{
          background: `radial-gradient(circle at center, ${color}10 0%, transparent 60%)`,
        }}
        animate={{ opacity: isHovered ? 1 : 0 }}
        transition={{ duration: 0.3 }}
      />

      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={chartData}>
          <PolarGrid
            stroke={isHovered ? `${color}30` : 'rgba(255,255,255,0.05)'}
            strokeWidth={isHovered ? 1.5 : 1}
          />
          <PolarAngleAxis
            dataKey="subject"
            tick={{
              fill: isHovered ? color : '#A1A1AA',
              fontSize: 11,
              fontWeight: 600
            }}
          />
          <PolarRadiusAxis angle={30} domain={[0, 10]} tick={false} axisLine={false} />
          <Radar
            name="Score"
            dataKey="A"
            stroke={color}
            strokeWidth={isHovered ? 4 : 3}
            fill={color}
            fillOpacity={isHovered ? 0.35 : 0.2}
            isAnimationActive={true}
            animationDuration={1500}
            dot={{
              fill: color,
              strokeWidth: isHovered ? 3 : 2,
              r: isHovered ? 6 : 4,
            }}
            activeDot={{
              r: 8,
              fill: color,
              stroke: 'var(--color-bg)',
              strokeWidth: 3,
            }}
          />
          <Tooltip content={<CustomTooltip />} />
        </RadarChart>
      </ResponsiveContainer>
    </motion.div>
  );
};

// Enhanced Projection Chart
const ProjectionChart = ({ color }: { color: string }) => {
  const [isHovered, setIsHovered] = useState(false);

  const data = [
    { name: 'Actuel', value: 35, potential: 35 },
    { name: 'J+30', value: 55, potential: 60 },
    { name: 'J+60', value: 75, potential: 80 },
    { name: 'J+90', value: 95, potential: 95 },
  ];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="px-4 py-3 rounded-lg"
          style={{
            backgroundColor: 'var(--color-surface)',
            border: `1px solid ${color}40`,
            boxShadow: `0 8px 32px ${color}30`,
          }}
        >
          <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color }}>{label}</p>
          <p className="text-2xl font-bold text-[var(--color-text)]">
            {payload[0].value}<span className="text-sm text-[var(--color-text-muted)]">%</span>
          </p>
          <p className="text-[10px] text-[var(--color-text-muted)] mt-1">Potentiel exploite</p>
        </motion.div>
      );
    }
    return null;
  };

  return (
    <motion.div
      className="w-full h-[200px] cursor-pointer"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      whileHover={{ scale: 1.01 }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorPotential" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={isHovered ? 0.5 : 0.3} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="name"
            stroke="#52525B"
            fontSize={10}
            tickLine={false}
            axisLine={false}
            tick={{ fill: isHovered ? color : '#52525B' }}
          />
          <YAxis hide domain={[0, 100]} />
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={isHovered ? 4 : 2}
            fill="url(#colorPotential)"
            dot={{
              fill: color,
              strokeWidth: 2,
              r: isHovered ? 6 : 4,
              stroke: 'var(--color-bg)',
            }}
            activeDot={{
              r: 10,
              fill: color,
              stroke: 'var(--color-bg)',
              strokeWidth: 4,
            }}
            animationDuration={1500}
          />
        </AreaChart>
      </ResponsiveContainer>
    </motion.div>
  );
};

// Section Chart - Timeline visualization
const TimelineChart = ({ color }: { color: string }) => {
  const [isHovered, setIsHovered] = useState(false);

  const data = [
    { phase: 'Actuel', sleep: 35, hrv: 28, energy: 30 },
    { phase: 'S2', sleep: 50, hrv: 48, energy: 45 },
    { phase: 'S4', sleep: 65, hrv: 60, energy: 60 },
    { phase: 'S8', sleep: 80, hrv: 68, energy: 78 },
    { phase: 'S12', sleep: 90, hrv: 75, energy: 92 },
  ];

  return (
    <motion.div
      className="w-full h-[180px] cursor-pointer"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
          <XAxis dataKey="phase" stroke="#52525B" fontSize={9} tickLine={false} />
          <YAxis hide domain={[0, 100]} />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--color-surface)',
              border: `1px solid var(--color-border)`,
              borderRadius: '8px',
            }}
            labelStyle={{ color: 'var(--color-text)', fontWeight: 'bold' }}
          />
          <Line
            type="monotone"
            dataKey="sleep"
            stroke="#8b5cf6"
            strokeWidth={2}
            dot={{ r: isHovered ? 5 : 3 }}
            activeDot={{ r: 8, stroke: '#8b5cf6', strokeWidth: 3 }}
            name="Sommeil"
          />
          <Line
            type="monotone"
            dataKey="hrv"
            stroke={color}
            strokeWidth={2}
            dot={{ r: isHovered ? 5 : 3 }}
            activeDot={{ r: 8, stroke: color, strokeWidth: 3 }}
            name="HRV"
          />
          <Line
            type="monotone"
            dataKey="energy"
            stroke="#f59e0b"
            strokeWidth={2}
            dot={{ r: isHovered ? 5 : 3 }}
            activeDot={{ r: 8, stroke: '#f59e0b', strokeWidth: 3 }}
            name="Energie"
          />
        </LineChart>
      </ResponsiveContainer>
    </motion.div>
  );
};

// Section Chart - Comparison Bar Chart
const ComparisonChart = ({ metrics, color }: { metrics: { label: string; value: number; status: string }[]; color: string }) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const getStatusColor = (status: string) => {
    if (status === 'critical') return '#ef4444';
    if (status === 'warning') return '#f59e0b';
    return '#22c55e';
  };

  return (
    <motion.div className="w-full h-[180px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={metrics} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
          <XAxis dataKey="label" stroke="#52525B" fontSize={9} tickLine={false} />
          <YAxis hide domain={[0, 100]} />
          <Tooltip
            cursor={{ fill: 'rgba(255,255,255,0.02)' }}
            contentStyle={{
              backgroundColor: 'var(--color-surface)',
              border: `1px solid var(--color-border)`,
              borderRadius: '8px',
            }}
          />
          <Bar
            dataKey="value"
            radius={[4, 4, 0, 0]}
            animationDuration={1200}
          >
            {metrics.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={hoveredIndex === index ? color : getStatusColor(entry.status)}
                style={{
                  filter: hoveredIndex === index ? `drop-shadow(0 0 8px ${color})` : 'none',
                  cursor: 'pointer',
                }}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </motion.div>
  );
};

// Supplement Stack Visualization
const StackVisualization = ({ color }: { color: string }) => {
  const [activeTime, setActiveTime] = useState<'matin' | 'midi' | 'soir'>('matin');

  const stacks = {
    matin: [
      { name: 'L-Tyrosine', dose: '1000mg', priority: 'high' },
      { name: 'L-Glutamine', dose: '5g', priority: 'high' },
      { name: 'Vit D3+K2', dose: '5000UI', priority: 'medium' },
      { name: 'Omega-3', dose: '3g', priority: 'high' },
      { name: 'Probiotiques', dose: '50B', priority: 'medium' },
    ],
    midi: [
      { name: 'Betaine HCL', dose: '650mg', priority: 'high' },
      { name: 'Zinc', dose: '30mg', priority: 'medium' },
      { name: 'B-Complex', dose: '1cap', priority: 'low' },
      { name: 'Alpha-GPC', dose: '300mg', priority: 'medium' },
    ],
    soir: [
      { name: 'Magnesium', dose: '400mg', priority: 'high' },
      { name: 'Glycine', dose: '3g', priority: 'high' },
      { name: 'Inositol', dose: '2g', priority: 'medium' },
      { name: 'Ashwagandha', dose: '600mg', priority: 'high' },
      { name: 'Taurine', dose: '2g', priority: 'low' },
    ],
  };

  const getPriorityColor = (priority: string) => {
    if (priority === 'high') return color;
    if (priority === 'medium') return '#f59e0b';
    return '#6b7280';
  };

  return (
    <div className="space-y-4">
      {/* Time selector */}
      <div className="flex gap-2">
        {(['matin', 'midi', 'soir'] as const).map((time) => (
          <motion.button
            key={time}
            onClick={() => setActiveTime(time)}
            className="px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all"
            style={{
              backgroundColor: activeTime === time ? color : 'var(--color-surface)',
              color: activeTime === time ? 'var(--color-bg)' : 'var(--color-text-muted)',
              border: `1px solid ${activeTime === time ? color : 'var(--color-border)'}`,
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {time}
          </motion.button>
        ))}
      </div>

      {/* Stack list */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTime}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="space-y-2"
        >
          {stacks[activeTime].map((supp, idx) => (
            <motion.div
              key={supp.name}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="flex items-center justify-between p-3 rounded-lg"
              style={{ backgroundColor: 'var(--color-surface)', border: `1px solid var(--color-border)` }}
            >
              <div className="flex items-center gap-3">
                <motion.div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: getPriorityColor(supp.priority) }}
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity, delay: idx * 0.2 }}
                />
                <span className="text-sm font-medium text-[var(--color-text)]">{supp.name}</span>
              </div>
              <span className="text-xs font-mono" style={{ color: getPriorityColor(supp.priority) }}>
                {supp.dose}
              </span>
            </motion.div>
          ))}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

// Section Visualization Component - renders appropriate chart based on section type
const SectionVisualization = ({ section, color }: { section: SectionContent; color: string }) => {
  if (!section.chartType) return null;

  return (
    <motion.div
      className="rounded-sm p-6 mb-8"
      style={{ backgroundColor: 'var(--color-surface)', border: `1px solid var(--color-border)` }}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
    >
      {/* Score Gauge - only show for sections with score and not gauge type (gauge shows its own) */}
      {section.score !== undefined && section.chartType !== 'gauge' && (
        <div className="flex justify-center mb-6">
          <MiniGauge score={section.score} color={color} label={section.scoreLabel} />
        </div>
      )}

      {/* Metrics Bars */}
      {section.metrics && section.chartType === 'bars' && (
        <div className="space-y-4">
          {section.metrics.map((metric, idx) => (
            <ScoreBar
              key={metric.label}
              label={metric.label}
              value={metric.value}
              status={metric.status}
              delay={idx * 150}
            />
          ))}
        </div>
      )}

      {/* Timeline Chart */}
      {section.chartType === 'timeline' && (
        <TimelineChart color={color} />
      )}

      {/* Comparison Chart */}
      {section.metrics && section.chartType === 'comparison' && (
        <ComparisonChart metrics={section.metrics} color={color} />
      )}

      {/* Stack Visualization */}
      {section.chartType === 'stack' && (
        <StackVisualization color={color} />
      )}

      {/* Gauge only */}
      {section.chartType === 'gauge' && !section.metrics && (
        <div className="flex justify-center">
          <RadialProgress
            score={section.score! / 10}
            max={10}
            size={160}
            color={color}
            label={section.scoreLabel}
          />
        </div>
      )}
    </motion.div>
  );
};

// How to Read Guide Component
const HowToReadGuide = ({ color }: { color: string }) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const features = [
    { icon: Menu, label: 'Table des matieres', desc: 'Navigation cliquable a gauche' },
    { icon: Search, label: 'Recherche', desc: 'Trouve rapidement une section' },
    { icon: Sparkles, label: '4 Themes', desc: 'Change le style visuel en bas de la sidebar' },
    { icon: BarChart3, label: 'Graphiques interactifs', desc: 'Survole pour plus de details' },
  ];

  return (
    <motion.div
      className="rounded-sm p-6 mb-8"
      style={{ backgroundColor: 'var(--color-surface)', border: `1px solid var(--color-border)` }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
    >
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between"
      >
        <h3 className="text-sm font-bold flex items-center gap-2">
          <AlertCircle size={16} style={{ color }} />
          Comment lire ce rapport
        </h3>
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronRight size={16} className="rotate-90" />
        </motion.div>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
              {features.map((feature, idx) => (
                <motion.div
                  key={feature.label}
                  className="p-3 rounded-lg text-center"
                  style={{ backgroundColor: 'var(--color-bg)' }}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  whileHover={{ scale: 1.02 }}
                >
                  <feature.icon size={20} className="mx-auto mb-2" style={{ color }} />
                  <p className="text-xs font-bold text-[var(--color-text)]">{feature.label}</p>
                  <p className="text-[10px] text-[var(--color-text-muted)] mt-1">{feature.desc}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// CTA Coaching Component
const CoachingCTA = ({ color }: { color: string }) => {
  const plans = [
    { name: 'STARTER', price: '97', duration: '1 mois', features: ['Plan personnalise', 'Support email'] },
    { name: 'TRANSFORM', price: '247', duration: '3 mois', features: ['Suivi hebdo', 'Ajustements', 'Support prioritaire'], popular: true },
    { name: 'ELITE', price: '497', duration: '6 mois', features: ['Coaching 1:1', 'Bilans mensuels', 'Acces VIP'] },
  ];

  return (
    <motion.div
      className="rounded-sm p-8 mb-8 relative overflow-hidden"
      style={{
        backgroundColor: 'var(--color-surface)',
        border: `2px solid ${color}40`,
        boxShadow: `0 0 60px ${color}10`
      }}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
    >
      {/* Background glow */}
      <div
        className="absolute inset-0 opacity-10"
        style={{ background: `radial-gradient(circle at 50% 0%, ${color} 0%, transparent 50%)` }}
      />

      <div className="relative z-10">
        <div className="text-center mb-8">
          <motion.div
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-4"
            style={{ backgroundColor: `${color}20`, border: `1px solid ${color}40` }}
            animate={{ scale: [1, 1.02, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Zap size={14} style={{ color }} />
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color }}>
              Passe a l'action
            </span>
          </motion.div>
          <h3 className="text-2xl font-bold text-[var(--color-text)] mb-2">
            Pret a transformer ton corps ?
          </h3>
          <p className="text-sm text-[var(--color-text-muted)] max-w-md mx-auto">
            Ce rapport t'a montre le chemin. Maintenant, laisse-moi t'accompagner pour atteindre tes objectifs.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {plans.map((plan, idx) => (
            <motion.div
              key={plan.name}
              className={`p-5 rounded relative ${plan.popular ? 'ring-2' : ''}`}
              style={{
                backgroundColor: 'var(--color-bg)',
                ringColor: plan.popular ? color : 'transparent'
              }}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              whileHover={{ y: -4, boxShadow: `0 10px 40px ${color}20` }}
            >
              {plan.popular && (
                <div
                  className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[10px] font-bold uppercase"
                  style={{ backgroundColor: color, color: 'var(--color-bg)' }}
                >
                  Populaire
                </div>
              )}
              <h4 className="text-xs font-bold tracking-wider text-[var(--color-text-muted)]">{plan.name}</h4>
              <div className="mt-2 mb-4">
                <span className="text-3xl font-bold text-[var(--color-text)]">{plan.price}€</span>
                <span className="text-xs text-[var(--color-text-muted)]">/{plan.duration}</span>
              </div>
              <ul className="space-y-2 mb-4">
                {plan.features.map(f => (
                  <li key={f} className="text-xs text-[var(--color-text-muted)] flex items-center gap-2">
                    <Check size={12} style={{ color }} />
                    {f}
                  </li>
                ))}
              </ul>
              <motion.a
                href="https://achzodcoaching.com"
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full py-2 rounded-lg text-center text-xs font-bold transition-all"
                style={{
                  backgroundColor: plan.popular ? color : 'transparent',
                  color: plan.popular ? 'var(--color-bg)' : 'var(--color-text)',
                  border: `1px solid ${plan.popular ? color : 'var(--color-border)'}`
                }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Choisir {plan.name}
              </motion.a>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

// Review Request Component
const ReviewRequest = ({ color }: { color: string }) => {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [comment, setComment] = useState('');

  const handleSubmit = () => {
    if (rating > 0) {
      // Here you would send the review to your backend
      console.log('Review submitted:', { rating, comment });
      setSubmitted(true);
    }
  };

  return (
    <motion.div
      className="rounded-sm p-8 text-center"
      style={{ backgroundColor: 'var(--color-surface)', border: `1px solid var(--color-border)` }}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
    >
      {!submitted ? (
        <>
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
          >
            <Heart size={40} className="mx-auto mb-4" style={{ color }} />
          </motion.div>
          <h3 className="text-xl font-bold text-[var(--color-text)] mb-2">
            Ton avis compte !
          </h3>
          <p className="text-sm text-[var(--color-text-muted)] mb-6 max-w-sm mx-auto">
            Comment as-tu trouvé ce rapport ? Ta note m'aide à m'améliorer.
          </p>

          {/* Star Rating */}
          <div className="flex justify-center gap-2 mb-6">
            {[1, 2, 3, 4, 5].map((star) => (
              <motion.button
                key={star}
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoveredRating(star)}
                onMouseLeave={() => setHoveredRating(0)}
                className="p-1"
                whileHover={{ scale: 1.2 }}
                whileTap={{ scale: 0.9 }}
              >
                <Star
                  size={32}
                  fill={(hoveredRating || rating) >= star ? color : 'transparent'}
                  stroke={(hoveredRating || rating) >= star ? color : 'var(--color-text-muted)'}
                  strokeWidth={1.5}
                />
              </motion.button>
            ))}
          </div>

          {rating > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="space-y-4"
            >
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Un commentaire ? (optionnel)"
                className="w-full max-w-sm mx-auto p-3 rounded-lg text-sm resize-none"
                style={{
                  backgroundColor: 'var(--color-bg)',
                  border: `1px solid var(--color-border)`,
                  color: 'var(--color-text)'
                }}
                rows={3}
              />
              <motion.button
                onClick={handleSubmit}
                className="px-6 py-2 rounded-lg text-sm font-bold"
                style={{ backgroundColor: color, color: 'var(--color-bg)' }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Envoyer ma note
              </motion.button>
            </motion.div>
          )}
        </>
      ) : (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="py-8"
        >
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 0.5 }}
          >
            <CheckCircle2 size={60} className="mx-auto mb-4" style={{ color }} />
          </motion.div>
          <h3 className="text-xl font-bold text-[var(--color-text)] mb-2">
            Merci pour ton retour !
          </h3>
          <p className="text-sm text-[var(--color-text-muted)]">
            Ta note de {rating}/5 a bien ete enregistree.
          </p>
        </motion.div>
      )}
    </motion.div>
  );
};

// Sidebar
const Sidebar = ({
  sections,
  activeSection,
  onNavigate,
  themes,
  currentTheme,
  onThemeChange,
}: {
  sections: SectionContent[];
  activeSection: string;
  onNavigate: (id: string) => void;
  themes: Theme[];
  currentTheme: Theme;
  onThemeChange: (theme: Theme) => void;
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredSections = useMemo(() => {
    if (!searchTerm) return sections;
    const lower = searchTerm.toLowerCase();
    return sections.filter((s) => s.title.toLowerCase().includes(lower) || (s.subtitle && s.subtitle.toLowerCase().includes(lower)));
  }, [sections, searchTerm]);

  return (
    <nav className="h-full flex flex-col">
      <div className="px-6 mb-4">
        <div className="relative">
          <input
            type="text"
            placeholder="Rechercher..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-md py-2 pl-9 pr-3 text-xs text-[var(--color-text)] placeholder-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-primary)] transition-colors"
          />
          <Search className="absolute left-3 top-2.5 text-[var(--color-text-muted)]" size={12} />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-2">
        <div className="space-y-0.5">
          <p className="px-2 text-[10px] font-mono font-bold text-[var(--color-text-muted)] uppercase tracking-widest mb-3">
            Table des matieres
          </p>

          {filteredSections.map((section, idx) => {
            const originalIndex = sections.findIndex((s) => s.id === section.id);
            const isActive = activeSection === section.id;

            return (
              <motion.button
                key={section.id}
                onClick={() => onNavigate(section.id)}
                className={`w-full text-left px-3 py-2 text-xs transition-all duration-200 flex items-center gap-3 group relative rounded-md
                  ${isActive ? 'bg-[var(--color-surface)] text-[var(--color-text)] font-medium' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)]/50'}`}
                whileHover={{ x: 4 }}
              >
                <span className={`font-mono text-[10px] ${isActive ? 'opacity-100' : 'opacity-40'}`}>
                  {originalIndex + 1 < 10 ? `0${originalIndex + 1}` : originalIndex + 1}
                </span>
                <span className="truncate">{section.title}</span>
                {section.score !== undefined && (
                  <span className="ml-auto text-[9px] font-mono opacity-50">{section.score}</span>
                )}
                {isActive && (
                  <motion.div
                    className="absolute right-2 w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: currentTheme.colors.primary }}
                    layoutId="activeIndicator"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                )}
              </motion.button>
            );
          })}
        </div>
      </div>

      <div className="p-6 border-t border-[var(--color-border)] mt-auto">
        <p className="text-[10px] font-mono font-bold text-[var(--color-text-muted)] uppercase tracking-widest mb-3">Theme</p>
        <div className="grid grid-cols-2 gap-2">
          {themes.map((theme) => (
            <motion.button
              key={theme.id}
              onClick={() => onThemeChange(theme)}
              className={`flex items-center justify-center gap-2 text-[10px] p-2 rounded border transition-all
                ${currentTheme.id === theme.id ? 'border-[var(--color-text)] bg-[var(--color-surface)] text-[var(--color-text)] font-bold' : 'border-transparent bg-[var(--color-bg)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <div className="w-2 h-2 rounded-full border border-white/10" style={{ backgroundColor: theme.colors.primary }} />
              {theme.name}
            </motion.button>
          ))}
        </div>
      </div>
    </nav>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================
interface FullReportProps {
  reportData?: ReportData;
  initialTheme?: 'neurocore' | 'ultrahuman' | 'metabolic' | 'titanium';
}

export function FullReport({ reportData = DEFAULT_REPORT_DATA, initialTheme = 'neurocore' }: FullReportProps = {}) {
  const [activeSection, setActiveSection] = useState<string>(reportData.sections[0]?.id || '');
  const [currentTheme, setCurrentTheme] = useState<Theme>(THEMES.find(t => t.id === initialTheme) || THEMES[0]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const mainContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--color-bg', currentTheme.colors.background);
    root.style.setProperty('--color-surface', currentTheme.colors.surface);
    root.style.setProperty('--color-border', currentTheme.colors.border);
    root.style.setProperty('--color-text', currentTheme.colors.text);
    root.style.setProperty('--color-text-muted', currentTheme.colors.textMuted);
    root.style.setProperty('--color-primary', currentTheme.colors.primary);
    root.style.setProperty('--color-grid', currentTheme.colors.grid);
  }, [currentTheme]);

  useEffect(() => {
    const handleScroll = () => {
      if (!mainContentRef.current) return;
      const container = mainContentRef.current;
      const totalScroll = container.scrollTop;
      const windowHeight = container.clientHeight;
      const totalHeight = container.scrollHeight - windowHeight;
      const progress = totalHeight > 0 ? (totalScroll / totalHeight) * 100 : 0;
      setScrollProgress(progress);

      const headings = reportData.sections.map((s) => document.getElementById(s.id));
      const scrollPos = container.scrollTop + 300;
      for (let i = headings.length - 1; i >= 0; i--) {
        const heading = headings[i];
        if (heading && heading.offsetTop <= scrollPos) {
          setActiveSection(reportData.sections[i].id);
          break;
        }
      }
    };
    const container = mainContentRef.current;
    if (container) container.addEventListener('scroll', handleScroll);
    return () => container?.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el && mainContentRef.current) {
      mainContentRef.current.scrollTo({ top: el.offsetTop - 100, behavior: 'smooth' });
    }
    setActiveSection(id);
    setMobileMenuOpen(false);
  };

  const navigateChapter = (direction: 'next' | 'prev') => {
    const currentIndex = reportData.sections.findIndex((s) => s.id === activeSection);
    let nextIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
    if (nextIndex < 0) nextIndex = 0;
    if (nextIndex >= reportData.sections.length) nextIndex = reportData.sections.length - 1;
    scrollToSection(reportData.sections[nextIndex].id);
  };

  return (
    <div
      className="flex h-screen font-sans overflow-hidden selection:bg-white/20 relative transition-colors duration-500"
      style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}
    >
      {/* Reading Progress Bar */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-1 z-[60]"
        style={{ backgroundColor: 'var(--color-border)' }}
      >
        <motion.div
          className="h-full"
          style={{ width: `${scrollProgress}%`, backgroundColor: currentTheme.colors.primary }}
          transition={{ duration: 0.1 }}
        />
      </motion.div>

      {/* Background Grid */}
      <div
        className="fixed inset-0 pointer-events-none opacity-50"
        style={{
          backgroundImage: `linear-gradient(to right, ${currentTheme.colors.grid} 1px, transparent 1px), linear-gradient(to bottom, ${currentTheme.colors.grid} 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
        }}
      />

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-80 transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} flex flex-col`}
        style={{ backgroundColor: 'var(--color-bg)', borderRight: `1px solid var(--color-border)` }}
      >
        <div className="p-8 pb-4 pt-10 relative">
          <div className="flex items-center gap-2 mb-1 mt-4">
            <motion.div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: currentTheme.colors.primary }}
              animate={{ scale: [1, 1.3, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <span className="text-xs font-mono font-bold tracking-widest uppercase">Neurocore 360</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight">
            Audit: {reportData.clientName}
          </h1>
          <div className="text-[10px] text-[var(--color-text-muted)] mt-1 font-mono">
            {reportData.sections.length} SECTIONS • PREMIUM
          </div>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col">
          <Sidebar
            sections={reportData.sections}
            activeSection={activeSection}
            onNavigate={scrollToSection}
            themes={THEMES}
            currentTheme={currentTheme}
            onThemeChange={setCurrentTheme}
          />
        </div>

        <button onClick={() => setMobileMenuOpen(false)} className="lg:hidden absolute top-4 right-4">
          <X size={20} />
        </button>
      </aside>

      {/* Main Content */}
      <main ref={mainContentRef} className="flex-1 overflow-y-auto relative z-10 scroll-smooth">
        {/* Floating Nav */}
        <motion.div
          className="fixed bottom-8 right-8 z-50 flex flex-col gap-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <motion.button
            onClick={() => scrollToSection('dashboard')}
            className="w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-xl"
            style={{ backgroundColor: 'var(--color-surface)', border: `1px solid var(--color-border)` }}
            whileHover={{ scale: 1.1, boxShadow: `0 0 20px ${currentTheme.colors.primary}30` }}
            whileTap={{ scale: 0.9 }}
          >
            <ArrowUp size={16} />
          </motion.button>
          <div className="flex flex-col rounded-full shadow-xl overflow-hidden" style={{ backgroundColor: 'var(--color-surface)', border: `1px solid var(--color-border)` }}>
            <motion.button
              onClick={() => navigateChapter('prev')}
              className="w-10 h-10 flex items-center justify-center hover:opacity-70 transition-opacity"
              whileHover={{ backgroundColor: 'var(--color-border)' }}
            >
              <ArrowUp size={16} />
            </motion.button>
            <div className="h-[1px] w-full" style={{ backgroundColor: 'var(--color-border)' }}></div>
            <motion.button
              onClick={() => navigateChapter('next')}
              className="w-10 h-10 flex items-center justify-center hover:opacity-70 transition-opacity"
              whileHover={{ backgroundColor: 'var(--color-border)' }}
            >
              <ArrowDown size={16} />
            </motion.button>
          </div>
        </motion.div>

        {/* Mobile Header */}
        <div
          className="lg:hidden sticky top-0 z-40 backdrop-blur-md px-4 py-4 flex items-center justify-between"
          style={{ backgroundColor: 'var(--color-bg)', borderBottom: `1px solid var(--color-border)` }}
        >
          <span className="font-bold text-sm tracking-widest uppercase">Audit {reportData.clientName}</span>
          <button onClick={() => setMobileMenuOpen(true)}>
            <Menu size={20} />
          </button>
        </div>

        <div className="max-w-[1200px] mx-auto p-6 lg:p-12 space-y-12 lg:space-y-32">
          {/* Dashboard Header */}
          <div id="dashboard" className="pt-8 lg:pt-12">
            <motion.header
              className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-12"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <div className="space-y-6 max-w-2xl">
                <motion.div
                  className="inline-flex items-center gap-2 px-3 py-1 rounded-full"
                  style={{ backgroundColor: 'var(--color-surface)', border: `1px solid var(--color-border)` }}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <motion.span
                    className="w-1.5 h-1.5 rounded-full bg-green-500"
                    animate={{ scale: [1, 1.3, 1], opacity: [1, 0.7, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                  <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[var(--color-text-muted)]">
                    Audit Premium
                  </span>
                </motion.div>
                <h1 className="text-5xl lg:text-7xl font-medium tracking-tighter leading-[0.9]">
                  {reportData.clientName.split(' ')[0]}, <br />
                  <span style={{ color: currentTheme.colors.textMuted }}>voici ton audit.</span>
                </h1>
                <p className="text-lg text-[var(--color-text-muted)] leading-relaxed max-w-lg">
                  Score global: {Math.round(reportData.globalScore * 10)}/100. Systeme nerveux critique. On va debloquer ca.
                </p>
              </div>
            </motion.header>

            {/* How to Read Guide */}
            <HowToReadGuide color={currentTheme.colors.primary} />

            {/* Dashboard Grid */}
            <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Main Score */}
              <motion.div
                className="lg:col-span-1 lg:row-span-2 rounded-sm p-8 flex flex-col justify-between relative overflow-hidden"
                style={{ backgroundColor: 'var(--color-surface)', border: `1px solid var(--color-border)` }}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
                whileHover={{ boxShadow: `0 0 40px ${currentTheme.colors.primary}15` }}
              >
                <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-[var(--color-text-muted)]">
                  Performance Globale
                </h3>
                <div className="flex items-center justify-center py-8">
                  <RadialProgress score={reportData.globalScore} max={10} size={180} color={currentTheme.colors.primary} />
                </div>
                <div className="flex items-center justify-center">
                  <motion.span
                    className="text-xs font-medium px-3 py-1 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20"
                    animate={{ scale: [1, 1.02, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    A OPTIMISER
                  </motion.span>
                </div>
              </motion.div>

              {/* Radar */}
              <motion.div
                className="lg:col-span-2 lg:row-span-2 rounded-sm p-1 relative"
                style={{ backgroundColor: 'var(--color-surface)', border: `1px solid var(--color-border)` }}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                whileHover={{ boxShadow: `0 0 40px ${currentTheme.colors.primary}15` }}
              >
                <div className="absolute top-6 left-6 z-10">
                  <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-[var(--color-text-muted)]">
                    Balance Systemique
                  </h3>
                </div>
                <div className="h-full w-full min-h-[300px] flex items-center justify-center pt-8">
                  <MetricsRadar data={reportData.metrics} color={currentTheme.colors.primary} />
                </div>
              </motion.div>

              {/* KPIs */}
              {[
                { icon: Brain, label: 'Systeme Nerveux', value: 3.8, status: 'CRITIQUE', statusColor: 'red' },
                { icon: Moon, label: 'Sommeil', value: 3.5, status: 'BAS', statusColor: 'amber' },
              ].map((kpi, idx) => (
                <motion.div
                  key={kpi.label}
                  className="rounded-sm p-6 flex flex-col justify-between cursor-pointer"
                  style={{ backgroundColor: 'var(--color-surface)', border: `1px solid var(--color-border)` }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + idx * 0.1 }}
                  whileHover={{
                    scale: 1.02,
                    boxShadow: `0 0 30px ${currentTheme.colors.primary}20`,
                    borderColor: currentTheme.colors.primary,
                  }}
                >
                  <div className="flex justify-between items-start">
                    <kpi.icon className="text-[var(--color-text-muted)]" size={20} />
                    <motion.span
                      className={`text-[10px] font-mono bg-${kpi.statusColor}-500/10 text-${kpi.statusColor}-500 px-1.5 py-0.5 rounded`}
                      animate={{ opacity: [1, 0.7, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      {kpi.status}
                    </motion.span>
                  </div>
                  <div>
                    <div className="text-2xl font-medium mt-4">
                      {kpi.value}<span className="text-sm text-[var(--color-text-muted)]">/10</span>
                    </div>
                    <div className="text-xs font-mono uppercase text-[var(--color-text-muted)] mt-1">{kpi.label}</div>
                  </div>
                </motion.div>
              ))}

              {/* Projection */}
              <motion.div
                className="lg:col-span-4 rounded-sm p-6 relative overflow-hidden flex flex-col md:flex-row gap-8 items-center"
                style={{ backgroundColor: 'var(--color-surface)', border: `1px solid var(--color-border)` }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                whileHover={{ boxShadow: `0 0 40px ${currentTheme.colors.primary}15` }}
              >
                <div className="w-full md:w-1/3">
                  <h3 className="text-sm font-bold mb-2 flex items-center gap-2" style={{ color: currentTheme.colors.primary }}>
                    <motion.span
                      animate={{ rotate: [0, 10, 0] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <ArrowUpRight size={16} />
                    </motion.span>
                    Potentiel Inexploite
                  </h3>
                  <p className="text-sm text-[var(--color-text-muted)]">
                    Actuellement a 35% de ton potentiel. En debloquant le systeme nerveux, projection 95% en 90 jours.
                  </p>
                </div>
                <div className="w-full md:w-2/3 h-[150px]">
                  <ProjectionChart color={currentTheme.colors.primary} />
                </div>
              </motion.div>
            </section>
          </div>

          {/* Long Form Content */}
          <div className="space-y-0 relative">
            <div className="absolute left-0 lg:left-[240px] top-0 bottom-0 w-[1px] hidden lg:block" style={{ backgroundColor: 'var(--color-border)' }}></div>

            {reportData.sections.map((section, idx) => (
              <motion.section
                key={section.id}
                id={section.id}
                className="scroll-mt-32 group relative pb-24 lg:pb-32"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true, margin: '-100px' }}
                transition={{ duration: 0.6 }}
              >
                <div className="flex flex-col lg:flex-row gap-8 lg:gap-24">
                  {/* Sticky Header */}
                  <div className="lg:w-[240px] flex-shrink-0">
                    <div className="sticky top-24 pr-8 lg:text-right">
                      <motion.span
                        className="font-mono text-4xl lg:text-5xl font-bold text-[var(--color-border)] group-hover:text-[var(--color-text-muted)] transition-colors block mb-2 opacity-30"
                        whileHover={{ scale: 1.1, opacity: 0.6 }}
                      >
                        {idx + 1 < 10 ? `0${idx + 1}` : idx + 1}
                      </motion.span>
                      <h2 className="text-xl font-bold tracking-tight mb-2 text-[var(--color-text)] leading-tight">
                        {section.title}
                      </h2>
                      {section.subtitle && (
                        <p className="text-xs font-mono uppercase tracking-widest mb-4" style={{ color: currentTheme.colors.primary }}>
                          {section.subtitle}
                        </p>
                      )}
                      {section.chips && (
                        <div className="flex flex-wrap lg:justify-end gap-2 mt-4">
                          {section.chips.map((chip, chipIdx) => (
                            <motion.span
                              key={chip}
                              className="px-2 py-1 text-[9px] font-mono uppercase rounded text-[var(--color-text-muted)]"
                              style={{ border: `1px solid var(--color-border)` }}
                              initial={{ opacity: 0, scale: 0.8 }}
                              whileInView={{ opacity: 1, scale: 1 }}
                              viewport={{ once: true }}
                              transition={{ delay: chipIdx * 0.1 }}
                              whileHover={{
                                borderColor: currentTheme.colors.primary,
                                color: currentTheme.colors.primary,
                              }}
                            >
                              {chip}
                            </motion.span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="flex-1 min-w-0">
                    {/* Section Visualization */}
                    <SectionVisualization section={section} color={currentTheme.colors.primary} />

                    <motion.div
                      className="prose prose-lg max-w-none prose-p:text-[var(--color-text-muted)] prose-p:text-[17px] prose-p:leading-relaxed prose-headings:text-[var(--color-text)] prose-strong:text-[var(--color-text)] prose-ul:text-[var(--color-text-muted)]"
                      dangerouslySetInnerHTML={{ __html: section.content }}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.6, delay: 0.2 }}
                    />
                  </div>
                </div>
              </motion.section>
            ))}
          </div>

          {/* CTA Coaching */}
          <CoachingCTA color={currentTheme.colors.primary} />

          {/* Review Request */}
          <ReviewRequest color={currentTheme.colors.primary} />

          {/* Footer */}
          <motion.footer
            className="py-24 flex flex-col md:flex-row justify-between items-start gap-8"
            style={{ borderTop: `1px solid var(--color-border)` }}
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            <div>
              <h4 className="font-bold text-lg mb-2 tracking-tight">Neurocore 360</h4>
              <p className="text-[var(--color-text-muted)] text-sm max-w-xs">
                Achzod Coaching - Excellence · Science · Transformation
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-widest">
                Confidential Report • {new Date().getFullYear()}
              </p>
            </div>
          </motion.footer>
        </div>
      </main>
    </div>
  );
}

export default FullReport;
