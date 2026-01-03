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
} from 'recharts';
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
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================
interface Theme {
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

interface Metric {
  label: string;
  value: number;
  max: number;
  description: string;
  key: string;
}

interface SectionContent {
  id: string;
  title: string;
  subtitle?: string;
  content: string;
  chips?: string[];
}

// ============================================================================
// THEMES
// ============================================================================
const THEMES: Theme[] = [
  {
    id: 'neurocore',
    name: 'Neurocore',
    type: 'dark',
    colors: {
      primary: '#0efc6d',
      background: '#000000',
      surface: '#09090B',
      border: 'rgba(255, 255, 255, 0.08)',
      text: '#EDEDED',
      textMuted: '#71717A',
      grid: 'rgba(14, 252, 109, 0.06)',
      glow: 'rgba(14, 252, 109, 0.15)',
    },
  },
  {
    id: 'ultrahuman',
    name: 'M1 Black',
    type: 'dark',
    colors: {
      primary: '#E1E1E1',
      background: '#000000',
      surface: '#09090B',
      border: 'rgba(255, 255, 255, 0.12)',
      text: '#EDEDED',
      textMuted: '#71717A',
      grid: 'rgba(255, 255, 255, 0.08)',
      glow: 'rgba(255, 255, 255, 0.1)',
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
];

// ============================================================================
// DATA
// ============================================================================
const REPORT_DATA = {
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
    },
    {
      id: 'hormones',
      title: 'Profil hormonal',
      subtitle: 'Zone Grise',
      content: `<p>Cortisol/DHEA ratio effondre. Testosterone libre probablement basse (SHBG elevee). Thyroide ralentie (T3 libre potentiellement basse).</p>
<p><strong>Metaboliseur LENT cafeine</strong> — une tasse de cafe a 16h signifie encore 50% de la cafeine en circulation a 23h.</p>
<p>La cafeine ne te donne pas d'energie, elle bloque les recepteurs a adenosine (le signal de fatigue). Tu "fonctionnes" mais tu ne recuperes pas.</p>`,
      chips: ['Testosterone Libre', 'SHBG', 'Resistance Insuline'],
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
    },
  ] as SectionContent[],
};

// ============================================================================
// COMPONENTS
// ============================================================================

// Radial Progress
const RadialProgress = ({
  score,
  max,
  size = 180,
  strokeWidth = 4,
  color = '#0efc6d',
}: {
  score: number;
  max: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const progress = score / max;
  const dashoffset = circumference - progress * circumference;

  return (
    <div className="relative flex flex-col items-center justify-center" style={{ width: size, height: size }}>
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
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={dashoffset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-5xl font-medium tracking-tighter" style={{ color: 'var(--color-text)' }}>
          {score}
        </span>
        <span className="text-[10px] uppercase tracking-widest text-[var(--color-text-muted)] mt-1">/ {max}</span>
      </div>
    </div>
  );
};

// Metrics Radar
const MetricsRadar = ({ data, color }: { data: Metric[]; color: string }) => {
  const chartData = data.map((m) => ({
    subject: m.label,
    A: m.value,
    fullMark: m.max,
  }));

  return (
    <div className="w-full h-[320px] relative">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={chartData}>
          <PolarGrid stroke="rgba(255,255,255,0.05)" />
          <PolarAngleAxis dataKey="subject" tick={{ fill: '#A1A1AA', fontSize: 11, fontWeight: 600 }} />
          <PolarRadiusAxis angle={30} domain={[0, 10]} tick={false} axisLine={false} />
          <Radar
            name="Score"
            dataKey="A"
            stroke={color}
            strokeWidth={3}
            fill={color}
            fillOpacity={0.2}
            isAnimationActive={true}
            animationDuration={1500}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
};

// Projection Chart
const ProjectionChart = ({ color }: { color: string }) => {
  const data = [
    { name: 'Actuel', Potential: 35 },
    { name: 'J+30', Potential: 55 },
    { name: 'J+60', Potential: 75 },
    { name: 'J+90', Potential: 95 },
  ];

  return (
    <div className="w-full h-[200px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorPotential" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.3} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="name" stroke="#52525B" fontSize={10} tickLine={false} axisLine={false} />
          <YAxis hide domain={[0, 100]} />
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
          <Area type="monotone" dataKey="Potential" stroke={color} strokeWidth={2} fill="url(#colorPotential)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
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
              <button
                key={section.id}
                onClick={() => onNavigate(section.id)}
                className={`w-full text-left px-3 py-2 text-xs transition-all duration-200 flex items-center gap-3 group relative rounded-md
                  ${isActive ? 'bg-[var(--color-surface)] text-[var(--color-text)] font-medium' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)]/50'}`}
              >
                <span className={`font-mono text-[10px] ${isActive ? 'opacity-100' : 'opacity-40'}`}>
                  {originalIndex + 1 < 10 ? `0${originalIndex + 1}` : originalIndex + 1}
                </span>
                <span className="truncate">{section.title}</span>
                {isActive && <div className="absolute right-2 w-1.5 h-1.5 rounded-full" style={{ backgroundColor: currentTheme.colors.primary }}></div>}
              </button>
            );
          })}
        </div>
      </div>

      <div className="p-6 border-t border-[var(--color-border)] mt-auto">
        <p className="text-[10px] font-mono font-bold text-[var(--color-text-muted)] uppercase tracking-widest mb-3">Theme</p>
        <div className="grid grid-cols-2 gap-2">
          {themes.map((theme) => (
            <button
              key={theme.id}
              onClick={() => onThemeChange(theme)}
              className={`flex items-center justify-center gap-2 text-[10px] p-2 rounded border transition-all
                ${currentTheme.id === theme.id ? 'border-[var(--color-text)] bg-[var(--color-surface)] text-[var(--color-text)] font-bold' : 'border-transparent bg-[var(--color-bg)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}
            >
              <div className="w-2 h-2 rounded-full border border-white/10" style={{ backgroundColor: theme.colors.background }} />
              {theme.name}
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export function FullReport() {
  const [activeSection, setActiveSection] = useState<string>(REPORT_DATA.sections[0].id);
  const [currentTheme, setCurrentTheme] = useState<Theme>(THEMES[0]);
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

      const headings = REPORT_DATA.sections.map((s) => document.getElementById(s.id));
      const scrollPos = container.scrollTop + 300;
      for (let i = headings.length - 1; i >= 0; i--) {
        const heading = headings[i];
        if (heading && heading.offsetTop <= scrollPos) {
          setActiveSection(REPORT_DATA.sections[i].id);
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
    const currentIndex = REPORT_DATA.sections.findIndex((s) => s.id === activeSection);
    let nextIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
    if (nextIndex < 0) nextIndex = 0;
    if (nextIndex >= REPORT_DATA.sections.length) nextIndex = REPORT_DATA.sections.length - 1;
    scrollToSection(REPORT_DATA.sections[nextIndex].id);
  };

  return (
    <div
      className="flex h-screen font-sans overflow-hidden selection:bg-white/20 relative transition-colors duration-500"
      style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}
    >
      {/* Reading Progress Bar */}
      <div className="fixed top-0 left-0 right-0 h-1 z-[60]" style={{ backgroundColor: 'var(--color-border)' }}>
        <div
          className="h-full transition-all duration-150 ease-out"
          style={{ width: `${scrollProgress}%`, backgroundColor: currentTheme.colors.primary }}
        />
      </div>

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
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: currentTheme.colors.primary }}></div>
            <span className="text-xs font-mono font-bold tracking-widest uppercase">Neurocore 360</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight">
            Audit: {REPORT_DATA.clientName}
          </h1>
          <div className="text-[10px] text-[var(--color-text-muted)] mt-1 font-mono">
            {REPORT_DATA.sections.length} SECTIONS • PREMIUM
          </div>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col">
          <Sidebar
            sections={REPORT_DATA.sections}
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
        <div className="fixed bottom-8 right-8 z-50 flex flex-col gap-2">
          <button
            onClick={() => scrollToSection('dashboard')}
            className="w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-xl"
            style={{ backgroundColor: 'var(--color-surface)', border: `1px solid var(--color-border)` }}
          >
            <ArrowUp size={16} />
          </button>
          <div className="flex flex-col rounded-full shadow-xl overflow-hidden" style={{ backgroundColor: 'var(--color-surface)', border: `1px solid var(--color-border)` }}>
            <button onClick={() => navigateChapter('prev')} className="w-10 h-10 flex items-center justify-center hover:opacity-70 transition-opacity">
              <ArrowUp size={16} />
            </button>
            <div className="h-[1px] w-full" style={{ backgroundColor: 'var(--color-border)' }}></div>
            <button onClick={() => navigateChapter('next')} className="w-10 h-10 flex items-center justify-center hover:opacity-70 transition-opacity">
              <ArrowDown size={16} />
            </button>
          </div>
        </div>

        {/* Mobile Header */}
        <div
          className="lg:hidden sticky top-0 z-40 backdrop-blur-md px-4 py-4 flex items-center justify-between"
          style={{ backgroundColor: 'var(--color-bg)', borderBottom: `1px solid var(--color-border)` }}
        >
          <span className="font-bold text-sm tracking-widest uppercase">Audit {REPORT_DATA.clientName}</span>
          <button onClick={() => setMobileMenuOpen(true)}>
            <Menu size={20} />
          </button>
        </div>

        <div className="max-w-[1200px] mx-auto p-6 lg:p-12 space-y-12 lg:space-y-32">
          {/* Dashboard Header */}
          <div id="dashboard" className="pt-8 lg:pt-12">
            <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-12">
              <div className="space-y-6 max-w-2xl">
                <div
                  className="inline-flex items-center gap-2 px-3 py-1 rounded-full"
                  style={{ backgroundColor: 'var(--color-surface)', border: `1px solid var(--color-border)` }}
                >
                  <span className="w-1.5 h-1.5 rounded-full animate-pulse bg-green-500"></span>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[var(--color-text-muted)]">
                    Audit Premium
                  </span>
                </div>
                <h1 className="text-5xl lg:text-7xl font-medium tracking-tighter leading-[0.9]">
                  {REPORT_DATA.clientName.split(' ')[0]}, <br />
                  <span style={{ color: currentTheme.colors.textMuted }}>voici ton audit.</span>
                </h1>
                <p className="text-lg text-[var(--color-text-muted)] leading-relaxed max-w-lg">
                  Score global: {Math.round(REPORT_DATA.globalScore * 10)}/100. Systeme nerveux critique. On va debloquer ca.
                </p>
              </div>
            </header>

            {/* Dashboard Grid */}
            <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Main Score */}
              <div
                className="lg:col-span-1 lg:row-span-2 rounded-2xl p-8 flex flex-col justify-between relative overflow-hidden"
                style={{ backgroundColor: 'var(--color-surface)', border: `1px solid var(--color-border)` }}
              >
                <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-[var(--color-text-muted)]">
                  Performance Globale
                </h3>
                <div className="flex items-center justify-center py-8">
                  <RadialProgress score={REPORT_DATA.globalScore} max={10} size={180} color={currentTheme.colors.primary} />
                </div>
                <div className="flex items-center justify-center">
                  <span className="text-xs font-medium px-3 py-1 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20">
                    A OPTIMISER
                  </span>
                </div>
              </div>

              {/* Radar */}
              <div
                className="lg:col-span-2 lg:row-span-2 rounded-2xl p-1 relative"
                style={{ backgroundColor: 'var(--color-surface)', border: `1px solid var(--color-border)` }}
              >
                <div className="absolute top-6 left-6 z-10">
                  <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-[var(--color-text-muted)]">
                    Balance Systemique
                  </h3>
                </div>
                <div className="h-full w-full min-h-[300px] flex items-center justify-center pt-8">
                  <MetricsRadar data={REPORT_DATA.metrics} color={currentTheme.colors.primary} />
                </div>
              </div>

              {/* KPIs */}
              <div
                className="rounded-2xl p-6 flex flex-col justify-between hover:opacity-80 transition-opacity cursor-default"
                style={{ backgroundColor: 'var(--color-surface)', border: `1px solid var(--color-border)` }}
              >
                <div className="flex justify-between items-start">
                  <Brain className="text-[var(--color-text-muted)]" size={20} />
                  <span className="text-[10px] font-mono bg-red-500/10 text-red-500 px-1.5 py-0.5 rounded">CRITIQUE</span>
                </div>
                <div>
                  <div className="text-2xl font-medium mt-4">
                    3.8<span className="text-sm text-[var(--color-text-muted)]">/10</span>
                  </div>
                  <div className="text-xs font-mono uppercase text-[var(--color-text-muted)] mt-1">Systeme Nerveux</div>
                </div>
              </div>

              <div
                className="rounded-2xl p-6 flex flex-col justify-between hover:opacity-80 transition-opacity cursor-default"
                style={{ backgroundColor: 'var(--color-surface)', border: `1px solid var(--color-border)` }}
              >
                <div className="flex justify-between items-start">
                  <Moon className="text-[var(--color-text-muted)]" size={20} />
                  <span className="text-[10px] font-mono bg-amber-500/10 text-amber-500 px-1.5 py-0.5 rounded">BAS</span>
                </div>
                <div>
                  <div className="text-2xl font-medium mt-4">
                    3.5<span className="text-sm text-[var(--color-text-muted)]">/10</span>
                  </div>
                  <div className="text-xs font-mono uppercase text-[var(--color-text-muted)] mt-1">Sommeil</div>
                </div>
              </div>

              {/* Projection */}
              <div
                className="lg:col-span-4 rounded-2xl p-6 relative overflow-hidden flex flex-col md:flex-row gap-8 items-center"
                style={{ backgroundColor: 'var(--color-surface)', border: `1px solid var(--color-border)` }}
              >
                <div className="w-full md:w-1/3">
                  <h3 className="text-sm font-bold mb-2 flex items-center gap-2" style={{ color: currentTheme.colors.primary }}>
                    <ArrowUpRight size={16} /> Potentiel Inexploite
                  </h3>
                  <p className="text-sm text-[var(--color-text-muted)]">
                    Actuellement a 35% de ton potentiel. En debloquant le systeme nerveux, projection 95% en 90 jours.
                  </p>
                </div>
                <div className="w-full md:w-2/3 h-[150px]">
                  <ProjectionChart color={currentTheme.colors.primary} />
                </div>
              </div>
            </section>
          </div>

          {/* Long Form Content */}
          <div className="space-y-0 relative">
            <div className="absolute left-0 lg:left-[240px] top-0 bottom-0 w-[1px] hidden lg:block" style={{ backgroundColor: 'var(--color-border)' }}></div>

            {REPORT_DATA.sections.map((section, idx) => (
              <section key={section.id} id={section.id} className="scroll-mt-32 group relative pb-24 lg:pb-32">
                <div className="flex flex-col lg:flex-row gap-8 lg:gap-24">
                  {/* Sticky Header */}
                  <div className="lg:w-[240px] flex-shrink-0">
                    <div className="sticky top-24 pr-8 lg:text-right">
                      <span className="font-mono text-4xl lg:text-5xl font-bold text-[var(--color-border)] group-hover:text-[var(--color-text-muted)] transition-colors block mb-2 opacity-30">
                        {idx + 1 < 10 ? `0${idx + 1}` : idx + 1}
                      </span>
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
                          {section.chips.map((chip) => (
                            <span
                              key={chip}
                              className="px-2 py-1 text-[9px] font-mono uppercase rounded text-[var(--color-text-muted)]"
                              style={{ border: `1px solid var(--color-border)` }}
                            >
                              {chip}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="flex-1 min-w-0">
                    <div
                      className="prose prose-lg max-w-none prose-p:text-[var(--color-text-muted)] prose-p:text-[17px] prose-p:leading-relaxed prose-headings:text-[var(--color-text)] prose-strong:text-[var(--color-text)] prose-ul:text-[var(--color-text-muted)]"
                      dangerouslySetInnerHTML={{ __html: section.content }}
                    />
                  </div>
                </div>
              </section>
            ))}
          </div>

          {/* Footer */}
          <footer className="py-24 flex flex-col md:flex-row justify-between items-start gap-8" style={{ borderTop: `1px solid var(--color-border)` }}>
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
          </footer>
        </div>
      </main>
    </div>
  );
}

export default FullReport;
