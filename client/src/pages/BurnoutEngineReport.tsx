import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'wouter';
import { Sidebar } from '@/components/ultrahuman/Sidebar';
import { RadialProgress } from '@/components/ultrahuman/RadialProgress';
import { Theme } from '@/components/ultrahuman/types';
import {
  Menu,
  ArrowUp,
  ArrowDown,
  Activity,
  Zap,
  Brain,
  Moon,
  Flame,
  Heart,
  Shield,
  Users,
  AlertTriangle,
  CheckCircle,
  Clock,
  Target,
  Pill,
  Utensils,
  Sparkles,
  Loader2,
  AlertCircle,
  Star,
  CheckCircle2,
  Send,
  BookOpen
} from 'lucide-react';

// Theme definitions - Coral/Red theme for Burnout
const THEMES: Theme[] = [
  {
    id: 'burnout',
    name: 'Coral Warning',
    type: 'dark',
    colors: {
      primary: '#FF6B6B',
      background: '#000000',
      surface: '#0a0a0a',
      border: 'rgba(255, 107, 107, 0.15)',
      text: '#FFFFFF',
      textMuted: '#a1a1aa',
      grid: 'rgba(255, 107, 107, 0.05)',
      glow: 'rgba(255, 107, 107, 0.2)'
    }
  },
  {
    id: 'calm',
    name: 'Deep Sea',
    type: 'dark',
    colors: {
      primary: '#38BDF8',
      background: '#050505',
      surface: '#111111',
      border: 'rgba(56, 189, 248, 0.15)',
      text: '#FFFFFF',
      textMuted: '#A1A1AA',
      grid: 'rgba(56, 189, 248, 0.05)',
      glow: 'rgba(56, 189, 248, 0.25)'
    }
  },
  {
    id: 'balance',
    name: 'Forest Zen',
    type: 'light',
    colors: {
      primary: '#22C55E',
      background: '#F2F2F2',
      surface: '#FFFFFF',
      border: 'rgba(34, 197, 94, 0.08)',
      text: '#171717',
      textMuted: '#737373',
      grid: 'rgba(34, 197, 94, 0.04)',
      glow: 'rgba(34, 197, 94, 0.05)'
    }
  },
  {
    id: 'warm',
    name: 'Sunset Rest',
    type: 'light',
    colors: {
      primary: '#F59E0B',
      background: '#FDF8F3',
      surface: '#FFFFFF',
      border: 'rgba(245, 158, 11, 0.1)',
      text: '#292524',
      textMuted: '#78716C',
      grid: 'rgba(245, 158, 11, 0.05)',
      glow: 'rgba(245, 158, 11, 0.1)'
    }
  }
];

// Burnout Analysis Result interface
interface BurnoutAnalysisResult {
  score: number;
  phase: "alarme" | "resistance" | "epuisement";
  phaseDescription: string;
  categories: {
    name: string;
    score: number;
    level: "optimal" | "attention" | "critique";
  }[];
  recommendations: {
    immediate: string[];
    shortTerm: string[];
    longTerm: string[];
  };
  protocols: {
    supplements: { name: string; dosage: string; reason: string }[];
    lifestyle: string[];
    nutrition: string[];
  };
  knowledgeInsights?: {
    title: string;
    source: string;
    excerpt: string;
  }[];
}

// Icon mapping for categories
const CATEGORY_ICONS: Record<string, React.ElementType> = {
  energie: Zap,
  sommeil: Moon,
  cognitif: Brain,
  emotionnel: Heart,
  physique: Activity,
  social: Users
};

// Phase colors and info
const PHASE_CONFIG = {
  alarme: {
    color: '#22C55E',
    bgColor: 'rgba(34, 197, 94, 0.1)',
    label: 'Phase d\'Alarme',
    icon: AlertTriangle,
    severity: 1
  },
  resistance: {
    color: '#F59E0B',
    bgColor: 'rgba(245, 158, 11, 0.1)',
    label: 'Phase de Résistance',
    icon: Shield,
    severity: 2
  },
  epuisement: {
    color: '#EF4444',
    bgColor: 'rgba(239, 68, 68, 0.1)',
    label: 'Phase d\'Épuisement',
    icon: Flame,
    severity: 3
  }
};

// Level status colors
const getLevelStatus = (level: "optimal" | "attention" | "critique") => {
  switch (level) {
    case 'optimal':
      return { label: 'OPTIMAL', color: 'bg-green-500/10 text-green-500', barColor: '#22C55E' };
    case 'attention':
      return { label: 'ATTENTION', color: 'bg-amber-500/10 text-amber-500', barColor: '#F59E0B' };
    case 'critique':
      return { label: 'CRITIQUE', color: 'bg-red-500/10 text-red-500', barColor: '#EF4444' };
  }
};

const BurnoutEngineReport: React.FC = () => {
  const { auditId } = useParams();
  const [reportData, setReportData] = useState<BurnoutAnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<string>('dashboard');
  const [currentTheme, setCurrentTheme] = useState<Theme>(THEMES[0]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const mainContentRef = useRef<HTMLDivElement>(null);

  // Review form state
  const [reviewRating, setReviewRating] = useState<number>(0);
  const [reviewComment, setReviewComment] = useState<string>('');
  const [reviewEmail, setReviewEmail] = useState<string>('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [hasExistingReview, setHasExistingReview] = useState(false);

  // Navigation sections for Burnout
  const navigationSections = [
    { id: 'dashboard', title: 'Vue d\'ensemble', icon: Activity },
    { id: 'phase', title: 'Phase Burnout', icon: AlertTriangle },
    { id: 'categories', title: 'Analyse Catégories', icon: Brain },
    { id: 'recommendations', title: 'Recommandations', icon: Target },
    { id: 'supplements', title: 'Protocole Suppléments', icon: Pill },
    { id: 'lifestyle', title: 'Mode de Vie', icon: Sparkles },
    { id: 'nutrition', title: 'Nutrition', icon: Utensils },
    { id: 'knowledge', title: 'Science & Références', icon: BookOpen },
    { id: 'review', title: 'Votre Avis', icon: Star }
  ];

  // Fetch report data
  useEffect(() => {
    const fetchReport = async () => {
      if (!auditId) {
        setError('ID analyse manquant');
        setLoading(false);
        return;
      }

      // Special case: load from localStorage for "latest" results
      if (auditId === 'latest') {
        try {
          const stored = localStorage.getItem('burnoutResult');
          if (stored) {
            const data = JSON.parse(stored);
            // Validate burnout data structure
            if (typeof data.score !== 'number' || !data.phase || !data.categories) {
              setError('Format de rapport invalide');
              setLoading(false);
              return;
            }
            setReportData(data);
            setLoading(false);
            return;
          }
        } catch (e) {
          console.error('Error loading from localStorage:', e);
        }
        setError('Aucune analyse récente trouvée');
        setLoading(false);
        return;
      }

      // Normal case: fetch from API
      try {
        const response = await fetch(`/api/burnout-detection/${auditId}`);
        const data = await response.json();

        if (data.error) {
          setError(data.error);
          setLoading(false);
          return;
        }

        // Validate burnout data structure
        if (typeof data.score !== 'number' || !data.phase || !data.categories) {
          setError('Format de rapport invalide');
          setLoading(false);
          return;
        }

        setReportData(data);
      } catch (err) {
        setError('Erreur de chargement du rapport');
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [auditId]);

  // Apply theme CSS variables
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

  // Scroll handling
  useEffect(() => {
    const handleScroll = () => {
      if (!mainContentRef.current) return;
      const container = mainContentRef.current;

      const totalScroll = container.scrollTop;
      const windowHeight = container.clientHeight;
      const totalHeight = container.scrollHeight - windowHeight;
      const progress = totalHeight > 0 ? (totalScroll / totalHeight) * 100 : 0;
      setScrollProgress(progress);

      // Scroll spy
      const sections = navigationSections.map(s => document.getElementById(s.id));
      const scrollPos = container.scrollTop + 300;

      for (let i = sections.length - 1; i >= 0; i--) {
        const section = sections[i];
        if (section && section.offsetTop <= scrollPos) {
          setActiveSection(navigationSections[i].id);
          break;
        }
      }
    };

    const container = mainContentRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [navigationSections]);

  // Scroll to section
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element && mainContentRef.current) {
      mainContentRef.current.scrollTo({
        top: element.offsetTop - 100,
        behavior: 'smooth'
      });
    }
    setMobileMenuOpen(false);
  };

  // Submit review
  const submitReview = async () => {
    if (reviewRating === 0) {
      setReviewError('Veuillez donner une note');
      return;
    }

    setReviewSubmitting(true);
    setReviewError(null);

    try {
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          auditId,
          rating: reviewRating,
          comment: reviewComment,
          email: reviewEmail,
          auditType: 'burnout'
        })
      });

      if (response.ok) {
        setReviewSubmitted(true);
      } else {
        const data = await response.json();
        setReviewError(data.error || 'Erreur lors de l\'envoi');
      }
    } catch (err) {
      setReviewError('Erreur de connexion');
    } finally {
      setReviewSubmitting(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-red-400 animate-spin mx-auto mb-4" />
          <p className="text-white/60">Chargement de votre analyse...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Analyse non trouvée</h1>
          <p className="text-white/60">{error}</p>
        </div>
      </div>
    );
  }

  if (!reportData) return null;

  const phaseConfig = PHASE_CONFIG[reportData.phase];
  const PhaseIcon = phaseConfig.icon;

  return (
    <div
      className="min-h-screen flex transition-colors duration-300"
      style={{
        backgroundColor: currentTheme.colors.background,
        color: currentTheme.colors.text
      }}
    >
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <Sidebar
          sections={navigationSections}
          activeSection={activeSection}
          currentTheme={currentTheme}
          themes={THEMES}
          onThemeChange={setCurrentTheme}
          onSectionClick={scrollToSection}
          scrollProgress={scrollProgress}
          tierBadge={
            <div className="flex items-center gap-2 mb-6">
              <Flame className="w-5 h-5" style={{ color: currentTheme.colors.primary }} />
              <span className="text-sm font-medium" style={{ color: currentTheme.colors.primary }}>
                BURNOUT ENGINE
              </span>
            </div>
          }
        />
      </div>

      {/* Mobile Header */}
      <div
        className="lg:hidden fixed top-0 left-0 right-0 z-50 px-4 py-3 backdrop-blur-xl border-b"
        style={{
          backgroundColor: `${currentTheme.colors.background}CC`,
          borderColor: currentTheme.colors.border
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5" style={{ color: currentTheme.colors.primary }} />
            <span className="font-bold">BURNOUT ENGINE</span>
          </div>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg transition-colors"
            style={{ backgroundColor: currentTheme.colors.surface }}
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div
            className="absolute top-full left-0 right-0 p-4 border-b"
            style={{
              backgroundColor: currentTheme.colors.background,
              borderColor: currentTheme.colors.border
            }}
          >
            {navigationSections.map((section) => {
              const Icon = section.icon;
              return (
                <button
                  key={section.id}
                  onClick={() => scrollToSection(section.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                    activeSection === section.id ? 'bg-white/10' : ''
                  }`}
                >
                  <Icon className="w-4 h-4" style={{
                    color: activeSection === section.id ? currentTheme.colors.primary : currentTheme.colors.textMuted
                  }} />
                  <span style={{
                    color: activeSection === section.id ? currentTheme.colors.text : currentTheme.colors.textMuted
                  }}>
                    {section.title}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Main Content */}
      <main
        ref={mainContentRef}
        className="flex-1 lg:ml-72 overflow-y-auto h-screen pt-16 lg:pt-0"
      >
        <div className="max-w-4xl mx-auto px-4 lg:px-8 py-8 lg:py-12">

          {/* Dashboard Section */}
          <section id="dashboard" className="mb-16">
            <div className="text-center mb-12">
              <div
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm mb-6"
                style={{ backgroundColor: phaseConfig.bgColor, color: phaseConfig.color }}
              >
                <PhaseIcon className="w-4 h-4" />
                <span className="font-medium">{phaseConfig.label}</span>
              </div>

              <h1 className="text-4xl lg:text-5xl font-bold mb-4">
                Analyse Burnout
              </h1>
              <p style={{ color: currentTheme.colors.textMuted }} className="text-lg max-w-2xl mx-auto">
                {reportData.phaseDescription}
              </p>
            </div>

            {/* Score Overview */}
            <div
              className="rounded-2xl p-8 mb-8"
              style={{
                backgroundColor: currentTheme.colors.surface,
                border: `1px solid ${currentTheme.colors.border}`
              }}
            >
              <div className="flex flex-col lg:flex-row items-center gap-8">
                <div className="relative">
                  <RadialProgress
                    value={100 - reportData.score}
                    max={100}
                    size={200}
                    strokeWidth={12}
                    color={phaseConfig.color}
                    backgroundColor={currentTheme.colors.grid}
                    label="Score Santé"
                    showPercentage
                  />
                </div>

                <div className="flex-1 text-center lg:text-left">
                  <h2 className="text-2xl font-bold mb-4">Score Global de Stress</h2>
                  <p style={{ color: currentTheme.colors.textMuted }} className="mb-6">
                    Un score de {reportData.score}% indique un niveau de stress {
                      reportData.score >= 70 ? 'élevé nécessitant une intervention urgente' :
                      reportData.score >= 40 ? 'modéré requérant une attention particulière' :
                      'faible avec de bonnes ressources de récupération'
                    }.
                  </p>

                  {/* Phase indicator */}
                  <div className="flex items-center gap-4 justify-center lg:justify-start">
                    {(['alarme', 'resistance', 'epuisement'] as const).map((phase) => {
                      const config = PHASE_CONFIG[phase];
                      const isActive = reportData.phase === phase;
                      return (
                        <div
                          key={phase}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
                            isActive ? 'ring-2' : 'opacity-40'
                          }`}
                          style={{
                            backgroundColor: config.bgColor,
                            ringColor: config.color
                          }}
                        >
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: config.color }}
                          />
                          <span className="text-xs font-medium capitalize">{phase}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {reportData.categories.slice(0, 6).map((cat) => {
                const status = getLevelStatus(cat.level);
                const IconComponent = CATEGORY_ICONS[cat.name.toLowerCase()] || Activity;
                return (
                  <div
                    key={cat.name}
                    className="rounded-xl p-4"
                    style={{
                      backgroundColor: currentTheme.colors.surface,
                      border: `1px solid ${currentTheme.colors.border}`
                    }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <IconComponent className="w-5 h-5" style={{ color: status.barColor }} />
                      <span className={`text-xs px-2 py-1 rounded-full ${status.color}`}>
                        {status.label}
                      </span>
                    </div>
                    <div className="text-2xl font-bold mb-1">{cat.score}%</div>
                    <div className="text-sm" style={{ color: currentTheme.colors.textMuted }}>
                      {cat.name}
                    </div>
                    {/* Progress bar */}
                    <div className="mt-3 h-1.5 rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${cat.score}%`,
                          backgroundColor: status.barColor
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Phase Section */}
          <section id="phase" className="mb-16">
            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
              <PhaseIcon className="w-8 h-8" style={{ color: phaseConfig.color }} />
              {phaseConfig.label}
            </h2>

            <div
              className="rounded-2xl p-6 lg:p-8"
              style={{
                backgroundColor: currentTheme.colors.surface,
                border: `1px solid ${currentTheme.colors.border}`
              }}
            >
              <div
                className="p-6 rounded-xl mb-6"
                style={{ backgroundColor: phaseConfig.bgColor }}
              >
                <p className="text-lg leading-relaxed">
                  {reportData.phaseDescription}
                </p>
              </div>

              {/* Phase explanation */}
              <div className="space-y-4">
                <h3 className="text-xl font-semibold">Comprendre ta situation</h3>
                <p style={{ color: currentTheme.colors.textMuted }}>
                  {reportData.phase === 'alarme' &&
                    "Tu es en phase d'alarme - ton corps réagit au stress mais a encore toutes ses ressources. C'est le moment idéal pour agir car tu peux rebondir rapidement avec les bonnes stratégies. Les ajustements mineurs maintenant éviteront des problèmes majeurs plus tard."}
                  {reportData.phase === 'resistance' &&
                    "Tu es en phase de résistance - ton corps compense depuis un moment et commence à s'épuiser. Tes surrénales travaillent en surcharge pour maintenir le cap. Sans changement, tu risques de basculer vers l'épuisement. Il est crucial d'agir maintenant."}
                  {reportData.phase === 'epuisement' &&
                    "Tu es en phase d'épuisement - tes ressources sont très faibles et ton corps montre des signes de burnout installé. Ce n'est pas une fatalité mais il faut agir de manière significative. Un repos profond et un accompagnement sont recommandés."}
                </p>
              </div>
            </div>
          </section>

          {/* Categories Section */}
          <section id="categories" className="mb-16">
            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
              <Brain className="w-8 h-8" style={{ color: currentTheme.colors.primary }} />
              Analyse par Catégorie
            </h2>

            <div className="space-y-4">
              {reportData.categories.map((cat) => {
                const status = getLevelStatus(cat.level);
                const IconComponent = CATEGORY_ICONS[cat.name.toLowerCase()] || Activity;

                return (
                  <div
                    key={cat.name}
                    className="rounded-xl p-6"
                    style={{
                      backgroundColor: currentTheme.colors.surface,
                      border: `1px solid ${currentTheme.colors.border}`
                    }}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="p-2 rounded-lg"
                          style={{ backgroundColor: `${status.barColor}20` }}
                        >
                          <IconComponent className="w-5 h-5" style={{ color: status.barColor }} />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg">{cat.name}</h3>
                          <span className={`text-xs px-2 py-1 rounded-full ${status.color}`}>
                            {status.label}
                          </span>
                        </div>
                      </div>
                      <div className="text-3xl font-bold" style={{ color: status.barColor }}>
                        {cat.score}%
                      </div>
                    </div>

                    {/* Full width progress bar */}
                    <div className="h-2 rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${cat.score}%`,
                          backgroundColor: status.barColor
                        }}
                      />
                    </div>

                    {/* Category interpretation */}
                    <p className="mt-4 text-sm" style={{ color: currentTheme.colors.textMuted }}>
                      {cat.level === 'critique' && `Ta ${cat.name.toLowerCase()} est en zone critique et nécessite une attention immédiate.`}
                      {cat.level === 'attention' && `Ta ${cat.name.toLowerCase()} montre des signes de tension qui méritent ton attention.`}
                      {cat.level === 'optimal' && `Ta ${cat.name.toLowerCase()} est dans une bonne zone. Continue ainsi !`}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Recommendations Section */}
          <section id="recommendations" className="mb-16">
            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
              <Target className="w-8 h-8" style={{ color: currentTheme.colors.primary }} />
              Plan d'Action
            </h2>

            <div className="space-y-6">
              {/* Immediate */}
              {reportData.recommendations.immediate.length > 0 && (
                <div
                  className="rounded-xl p-6"
                  style={{
                    backgroundColor: currentTheme.colors.surface,
                    border: `1px solid ${currentTheme.colors.border}`
                  }}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-lg bg-red-500/20">
                      <AlertTriangle className="w-5 h-5 text-red-500" />
                    </div>
                    <h3 className="text-xl font-semibold">Actions Immédiates</h3>
                  </div>
                  <ul className="space-y-3">
                    {reportData.recommendations.immediate.map((rec, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                        <span style={{ color: currentTheme.colors.textMuted }}>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Short Term */}
              {reportData.recommendations.shortTerm.length > 0 && (
                <div
                  className="rounded-xl p-6"
                  style={{
                    backgroundColor: currentTheme.colors.surface,
                    border: `1px solid ${currentTheme.colors.border}`
                  }}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-lg bg-amber-500/20">
                      <Clock className="w-5 h-5 text-amber-500" />
                    </div>
                    <h3 className="text-xl font-semibold">Court Terme (2-4 semaines)</h3>
                  </div>
                  <ul className="space-y-3">
                    {reportData.recommendations.shortTerm.map((rec, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
                        <span style={{ color: currentTheme.colors.textMuted }}>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Long Term */}
              {reportData.recommendations.longTerm.length > 0 && (
                <div
                  className="rounded-xl p-6"
                  style={{
                    backgroundColor: currentTheme.colors.surface,
                    border: `1px solid ${currentTheme.colors.border}`
                  }}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-lg bg-green-500/20">
                      <Target className="w-5 h-5 text-green-500" />
                    </div>
                    <h3 className="text-xl font-semibold">Long Terme (1-3 mois)</h3>
                  </div>
                  <ul className="space-y-3">
                    {reportData.recommendations.longTerm.map((rec, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                        <span style={{ color: currentTheme.colors.textMuted }}>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </section>

          {/* Supplements Protocol */}
          <section id="supplements" className="mb-16">
            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
              <Pill className="w-8 h-8" style={{ color: currentTheme.colors.primary }} />
              Protocole Suppléments
            </h2>

            <div
              className="rounded-xl overflow-hidden"
              style={{
                backgroundColor: currentTheme.colors.surface,
                border: `1px solid ${currentTheme.colors.border}`
              }}
            >
              {reportData.protocols.supplements.map((supp, idx) => (
                <div
                  key={idx}
                  className="p-6 border-b last:border-b-0"
                  style={{ borderColor: currentTheme.colors.border }}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-1">{supp.name}</h3>
                      <p className="text-sm" style={{ color: currentTheme.colors.textMuted }}>
                        {supp.reason}
                      </p>
                    </div>
                    <div
                      className="px-4 py-2 rounded-lg text-sm font-medium"
                      style={{
                        backgroundColor: `${currentTheme.colors.primary}20`,
                        color: currentTheme.colors.primary
                      }}
                    >
                      {supp.dosage}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Lifestyle Protocol */}
          <section id="lifestyle" className="mb-16">
            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
              <Sparkles className="w-8 h-8" style={{ color: currentTheme.colors.primary }} />
              Mode de Vie
            </h2>

            <div
              className="rounded-xl p-6"
              style={{
                backgroundColor: currentTheme.colors.surface,
                border: `1px solid ${currentTheme.colors.border}`
              }}
            >
              <ul className="space-y-4">
                {reportData.protocols.lifestyle.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-4">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${currentTheme.colors.primary}20` }}
                    >
                      <span className="text-sm font-bold" style={{ color: currentTheme.colors.primary }}>
                        {idx + 1}
                      </span>
                    </div>
                    <p className="pt-1" style={{ color: currentTheme.colors.textMuted }}>
                      {item}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* Nutrition Protocol */}
          <section id="nutrition" className="mb-16">
            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
              <Utensils className="w-8 h-8" style={{ color: currentTheme.colors.primary }} />
              Nutrition Anti-Stress
            </h2>

            <div
              className="rounded-xl p-6"
              style={{
                backgroundColor: currentTheme.colors.surface,
                border: `1px solid ${currentTheme.colors.border}`
              }}
            >
              <div className="grid gap-4">
                {reportData.protocols.nutrition.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-4 p-4 rounded-lg"
                    style={{ backgroundColor: `${currentTheme.colors.primary}10` }}
                  >
                    <CheckCircle2 className="w-5 h-5 flex-shrink-0" style={{ color: currentTheme.colors.primary }} />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Knowledge Section */}
          {reportData.knowledgeInsights && reportData.knowledgeInsights.length > 0 && (
            <section id="knowledge" className="mb-16">
              <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
                <BookOpen className="w-8 h-8" style={{ color: currentTheme.colors.primary }} />
                Science & Références
              </h2>

              <div className="space-y-4">
                {reportData.knowledgeInsights.map((insight, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl p-6"
                    style={{
                      backgroundColor: currentTheme.colors.surface,
                      border: `1px solid ${currentTheme.colors.border}`
                    }}
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className="p-2 rounded-lg flex-shrink-0"
                        style={{ backgroundColor: `${currentTheme.colors.primary}20` }}
                      >
                        <BookOpen className="w-5 h-5" style={{ color: currentTheme.colors.primary }} />
                      </div>
                      <div>
                        <h3 className="font-semibold mb-1">{insight.title}</h3>
                        <p className="text-xs mb-2" style={{ color: currentTheme.colors.primary }}>
                          Source: {insight.source}
                        </p>
                        <p className="text-sm" style={{ color: currentTheme.colors.textMuted }}>
                          {insight.excerpt}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Review Section */}
          <section id="review" className="mb-16">
            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
              <Star className="w-8 h-8" style={{ color: currentTheme.colors.primary }} />
              Ton Avis
            </h2>

            <div
              className="rounded-xl p-6"
              style={{
                backgroundColor: currentTheme.colors.surface,
                border: `1px solid ${currentTheme.colors.border}`
              }}
            >
              {reviewSubmitted ? (
                <div className="text-center py-8">
                  <CheckCircle2 className="w-16 h-16 mx-auto mb-4" style={{ color: currentTheme.colors.primary }} />
                  <h3 className="text-xl font-semibold mb-2">Merci pour ton retour !</h3>
                  <p style={{ color: currentTheme.colors.textMuted }}>
                    Ton avis nous aide à améliorer l'expérience.
                  </p>
                </div>
              ) : hasExistingReview ? (
                <div className="text-center py-8">
                  <CheckCircle2 className="w-16 h-16 mx-auto mb-4" style={{ color: currentTheme.colors.primary }} />
                  <h3 className="text-xl font-semibold mb-2">Tu as déjà laissé un avis</h3>
                  <p style={{ color: currentTheme.colors.textMuted }}>
                    Merci pour ta contribution !
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium mb-3">Note ton expérience</label>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          onClick={() => setReviewRating(star)}
                          className="p-2 transition-transform hover:scale-110"
                        >
                          <Star
                            className={`w-8 h-8 ${star <= reviewRating ? 'fill-current' : ''}`}
                            style={{ color: star <= reviewRating ? currentTheme.colors.primary : currentTheme.colors.textMuted }}
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Commentaire (optionnel)</label>
                    <textarea
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      placeholder="Partage ton expérience..."
                      rows={4}
                      className="w-full rounded-lg p-3 resize-none"
                      style={{
                        backgroundColor: currentTheme.colors.background,
                        border: `1px solid ${currentTheme.colors.border}`,
                        color: currentTheme.colors.text
                      }}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Email (optionnel)</label>
                    <input
                      type="email"
                      value={reviewEmail}
                      onChange={(e) => setReviewEmail(e.target.value)}
                      placeholder="ton@email.com"
                      className="w-full rounded-lg p-3"
                      style={{
                        backgroundColor: currentTheme.colors.background,
                        border: `1px solid ${currentTheme.colors.border}`,
                        color: currentTheme.colors.text
                      }}
                    />
                  </div>

                  {reviewError && (
                    <p className="text-red-500 text-sm">{reviewError}</p>
                  )}

                  <button
                    onClick={submitReview}
                    disabled={reviewSubmitting || reviewRating === 0}
                    className="w-full py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-opacity disabled:opacity-50"
                    style={{
                      backgroundColor: currentTheme.colors.primary,
                      color: currentTheme.type === 'dark' ? '#000' : '#FFF'
                    }}
                  >
                    {reviewSubmitting ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <Send className="w-5 h-5" />
                        Envoyer mon avis
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* CTA Coaching */}
          <section className="mb-16">
            <div
              className="rounded-2xl p-8 text-center"
              style={{
                background: `linear-gradient(135deg, ${currentTheme.colors.primary}15 0%, ${currentTheme.colors.surface} 100%)`,
                border: `1px solid ${currentTheme.colors.primary}30`
              }}
            >
              <div className="flex items-center justify-center gap-2 mb-4">
                <Heart className="w-6 h-6" style={{ color: currentTheme.colors.primary }} />
                <span className="text-sm font-medium uppercase tracking-wider" style={{ color: currentTheme.colors.primary }}>
                  Accompagnement Burnout
                </span>
              </div>
              <h2 className="text-2xl font-bold mb-4">Sortir du burnout avec un accompagnement</h2>
              <p className="mb-6 max-w-xl mx-auto" style={{ color: currentTheme.colors.textMuted }}>
                Le burnout ne se resout pas seul. Travaille avec moi pour mettre en place un protocole de recuperation adapte a ton niveau d'epuisement, avec un suivi personnalise jusqu'a ce que tu retrouves ton energie.
              </p>
              <a
                href="https://calendly.com/achzodcoaching/discovery"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-semibold text-lg transition-all hover:scale-105"
                style={{
                  backgroundColor: currentTheme.colors.primary,
                  color: currentTheme.type === 'dark' ? '#000' : '#FFF'
                }}
              >
                <Clock className="w-5 h-5" />
                Reserver un appel gratuit
              </a>
              <p className="mt-4 text-sm" style={{ color: currentTheme.colors.textMuted }}>
                30 min - Sans engagement - Urgences prioritaires
              </p>
            </div>
          </section>

          {/* Footer */}
          <footer className="text-center py-8 border-t" style={{ borderColor: currentTheme.colors.border }}>
            <p className="text-sm" style={{ color: currentTheme.colors.textMuted }}>
              Analyse generee par NEUROCORE 360 - Burnout Engine
            </p>
          </footer>
        </div>

        {/* Floating Navigation */}
        <div className="fixed bottom-6 right-6 lg:hidden flex flex-col gap-2">
          <button
            onClick={() => mainContentRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
            className="p-3 rounded-full shadow-lg"
            style={{
              backgroundColor: currentTheme.colors.surface,
              border: `1px solid ${currentTheme.colors.border}`
            }}
          >
            <ArrowUp className="w-5 h-5" />
          </button>
        </div>
      </main>
    </div>
  );
};

export default BurnoutEngineReport;
