/**
 * APEXLABS - Ultimate Scan Report (Elite Tier)
 * Style Ultrahuman - Dashboard Elite avec analyse photo et biomecanique
 */

import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'wouter';
import { Sidebar } from '@/components/ultrahuman/Sidebar';
import { RadialProgress } from '@/components/ultrahuman/RadialProgress';
import { MetricsRadar, ProjectionChart } from '@/components/ultrahuman/Charts';
import { Theme, SectionContent, Metric } from '@/components/ultrahuman/types';
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
  Dumbbell,
  Apple,
  Lightbulb,
  Sun,
  Loader2,
  AlertCircle,
  Star,
  CheckCircle2,
  Send,
  Download,
  Pill,
  Calendar,
  Target,
  TrendingUp,
  TrendingDown,
  Crown,
  Camera,
  AlertTriangle,
  Bone,
  HeartPulse
} from 'lucide-react';

// Theme definitions - Gold for Elite
const THEMES: Theme[] = [
  {
    id: 'ultrahuman',
    name: 'M1 Black',
    type: 'dark',
    colors: {
      primary: '#F59E0B', // Amber/Gold for Elite
      background: '#000000',
      surface: '#0a0a0a',
      border: 'rgba(245, 158, 11, 0.15)',
      text: '#FFFFFF',
      textMuted: '#a1a1aa',
      grid: 'rgba(245, 158, 11, 0.05)',
      glow: 'rgba(245, 158, 11, 0.2)'
    }
  },
  {
    id: 'metabolic',
    name: 'Ice Blue',
    type: 'dark',
    colors: {
      primary: '#38BDF8',
      background: '#020617',
      surface: '#0f172a',
      border: 'rgba(56, 189, 248, 0.15)',
      text: '#F1F5F9',
      textMuted: '#94A3B8',
      grid: 'rgba(56, 189, 248, 0.05)',
      glow: 'rgba(56, 189, 248, 0.25)'
    }
  },
  {
    id: 'titanium',
    name: 'Titanium Light',
    type: 'light',
    colors: {
      primary: '#D97706',
      background: '#F2F2F2',
      surface: '#FFFFFF',
      border: 'rgba(0, 0, 0, 0.08)',
      text: '#171717',
      textMuted: '#737373',
      grid: 'rgba(0, 0, 0, 0.04)',
      glow: 'rgba(0, 0, 0, 0.05)'
    }
  },
  {
    id: 'organic',
    name: 'Sand Stone',
    type: 'light',
    colors: {
      primary: '#D97706',
      background: '#F0EFE9',
      surface: '#E6E4DD',
      border: 'rgba(217, 119, 6, 0.1)',
      text: '#292524',
      textMuted: '#78716C',
      grid: 'rgba(217, 119, 6, 0.05)',
      glow: 'rgba(217, 119, 6, 0.1)'
    }
  }
];

// Types
interface SupplementProtocol {
  name: string;
  dosage: string;
  timing: string;
  duration: string;
  why: string;
  brands: string[];
  warnings?: string;
}

interface NarrativeSection {
  id: string;
  title: string;
  score: number;
  level: 'excellent' | 'bon' | 'moyen' | 'faible';
  isPremium: boolean;
  introduction: string;
  whatIsWrong: string;
  personalizedAnalysis: string;
  recommendations: string;
  supplements: SupplementProtocol[];
  actionPlan: string;
  scienceDeepDive: string;
}

interface PhotoAnalysis {
  summary: string;
  postureAnalysis: string;
  muscularAnalysis: string;
  fatAnalysis: string;
  recommendations: string;
  correctiveProtocol: string;
  score: number;
}

interface NarrativeReport {
  global: number;
  heroSummary: string;
  executiveNarrative: string;
  globalDiagnosis: string;
  sections: NarrativeSection[];
  prioritySections: string[];
  strengthSections: string[];
  supplementStack: SupplementProtocol[];
  lifestyleProtocol: string;
  weeklyPlan: {
    week1: string;
    week2: string;
    weeks3_4: string;
    months2_3: string;
  };
  conclusion: string;
  auditType: 'GRATUIT' | 'PREMIUM' | 'ELITE';
  photoAnalysis?: PhotoAnalysis;
}

// Icon mapping
const SECTION_ICONS: Record<string, React.ElementType> = {
  'profil-base': Activity,
  'composition-corporelle': Target,
  'metabolisme-energie': Flame,
  'nutrition-tracking': Apple,
  'digestion-microbiome': Activity,
  'activite-performance': Dumbbell,
  'sommeil-recuperation': Moon,
  'hrv-cardiaque': HeartPulse,
  'cardio-endurance': Heart,
  'analyses-biomarqueurs': Activity,
  'hormones-stress': Brain,
  'lifestyle-substances': Sun,
  'biomecanique-mobilite': Bone,
  'psychologie-mental': Lightbulb,
  'neurotransmetteurs': Brain,
  'blessures-douleurs': Bone,
  'nutrition-timing': Apple,
  'cardio-performance': HeartPulse
};

const getScoreStatus = (value: number) => {
  if (value >= 80) return { label: 'EXCELLENT', color: 'bg-amber-500/20 text-amber-400' };
  if (value >= 65) return { label: 'BON', color: 'bg-blue-500/20 text-blue-400' };
  if (value >= 50) return { label: 'MOYEN', color: 'bg-orange-500/20 text-orange-400' };
  return { label: 'CRITIQUE', color: 'bg-red-500/20 text-red-400' };
};

const UltimateScanReport: React.FC = () => {
  const { auditId } = useParams();
  const [report, setReport] = useState<NarrativeReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<string>('dashboard');
  const [currentTheme, setCurrentTheme] = useState<Theme>(THEMES[0]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [clientName, setClientName] = useState<string>('Client');
  const mainContentRef = useRef<HTMLDivElement>(null);

  // Review state
  const [reviewRating, setReviewRating] = useState<number>(0);
  const [reviewComment, setReviewComment] = useState<string>('');
  const [reviewEmail, setReviewEmail] = useState<string>('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  // Fetch report
  useEffect(() => {
    const fetchReport = async () => {
      if (!auditId) {
        setError('ID audit manquant');
        setLoading(false);
        return;
      }

      try {
        const auditRes = await fetch(`/api/audits/${auditId}`);
        if (!auditRes.ok) {
          setError('Audit non trouve');
          setLoading(false);
          return;
        }
        const auditData = await auditRes.json();
        setClientName(auditData.email?.split('@')[0] || 'Client');
        setReviewEmail(auditData.email || '');

        if (auditData.reportDeliveryStatus !== 'READY' && auditData.reportDeliveryStatus !== 'SENT') {
          setError('Rapport en cours de generation...');
          setLoading(false);
          return;
        }

        const reportRes = await fetch(`/api/audits/${auditId}/narrative`);
        if (!reportRes.ok) {
          setError('Erreur chargement rapport');
          setLoading(false);
          return;
        }

        const reportData = await reportRes.json();
        if (reportData.error || reportData.message) {
          setError(reportData.error || reportData.message);
          setLoading(false);
          return;
        }

        setReport(reportData);
        if (reportData.sections?.length > 0) {
          setActiveSection(reportData.sections[0].id);
        }
      } catch {
        setError('Erreur de connexion');
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [auditId]);

  // Theme CSS
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

  // Scroll
  useEffect(() => {
    const handleScroll = () => {
      if (!mainContentRef.current || !report) return;
      const container = mainContentRef.current;
      const totalHeight = container.scrollHeight - container.clientHeight;
      const progress = totalHeight > 0 ? (container.scrollTop / totalHeight) * 100 : 0;
      setScrollProgress(progress);
    };

    const container = mainContentRef.current;
    if (container) container.addEventListener('scroll', handleScroll);
    return () => container?.removeEventListener('scroll', handleScroll);
  }, [report]);

  // Sidebar sections
  const sidebarSections: SectionContent[] = report?.sections.map(s => ({
    id: s.id,
    title: s.title,
    subtitle: `Score: ${s.score}%`,
    content: s.introduction
  })) || [];

  const allSections: SectionContent[] = [
    { id: 'dashboard', title: 'Dashboard', subtitle: 'Vue globale', content: '' },
    { id: 'photo-analysis', title: 'Analyse Photo', subtitle: 'Visuelle', content: '' },
    ...sidebarSections,
    { id: 'supplements', title: 'Stack Supplements', subtitle: 'Protocole', content: '' },
    { id: 'plan', title: 'Plan 12 Semaines', subtitle: 'Action', content: '' },
    { id: 'review', title: 'Votre Avis', subtitle: 'Feedback', content: '' }
  ];

  const metricsData: Metric[] = report?.sections.slice(0, 8).map(s => ({
    label: s.title.split(' ')[0],
    value: Math.round(s.score / 10),
    max: 10,
    description: s.title,
    key: s.id
  })) || [];

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el && mainContentRef.current) {
      mainContentRef.current.scrollTo({ top: el.offsetTop - 100, behavior: 'smooth' });
    }
    setActiveSection(id);
    setMobileMenuOpen(false);
  };

  const navigateChapter = (direction: 'next' | 'prev') => {
    if (!report) return;
    const currentIndex = allSections.findIndex(s => s.id === activeSection);
    let nextIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
    nextIndex = Math.max(0, Math.min(nextIndex, allSections.length - 1));
    scrollToSection(allSections[nextIndex].id);
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auditId || reviewRating === 0 || reviewComment.length < 10) {
      setReviewError('Veuillez remplir tous les champs');
      return;
    }

    setReviewSubmitting(true);
    try {
      const response = await fetch('/api/submit-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          auditId,
          email: reviewEmail,
          auditType: 'ELITE',
          rating: reviewRating,
          comment: reviewComment
        })
      });

      const data = await response.json();
      if (data.success) setReviewSubmitted(true);
      else setReviewError(data.error || 'Erreur');
    } catch {
      setReviewError('Erreur de connexion');
    } finally {
      setReviewSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-amber-500 mx-auto mb-4" />
          <p className="text-white/70">Chargement du rapport Elite...</p>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <AlertCircle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">{error || 'Rapport non disponible'}</h2>
          <Link href="/dashboard">
            <button className="px-6 py-3 bg-amber-500 text-black font-bold rounded-lg hover:bg-amber-400 transition mt-6">
              Retour au dashboard
            </button>
          </Link>
        </div>
      </div>
    );
  }

  const globalScore = report.global;

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: currentTheme.colors.background, color: currentTheme.colors.text }}>
      {/* Progress Bar */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-black/50 z-50">
        <div className="h-full transition-all duration-300" style={{ width: `${scrollProgress}%`, backgroundColor: currentTheme.colors.primary }} />
      </div>

      {/* Mobile Menu */}
      <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg" style={{ backgroundColor: currentTheme.colors.surface }}>
        <Menu size={24} />
      </button>

      {/* Sidebar */}
      <aside className={`fixed lg:sticky top-0 left-0 h-screen w-72 border-r z-40 transition-transform lg:translate-x-0 ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}
        style={{ backgroundColor: currentTheme.colors.background, borderColor: currentTheme.colors.border }}>
        <Sidebar
          sections={allSections}
          activeSection={activeSection}
          onNavigate={scrollToSection}
          themes={THEMES}
          currentTheme={currentTheme}
          onThemeChange={setCurrentTheme}
          clientName={clientName}
          auditType="ULTIMATE_SCAN"
        />
      </aside>

      {mobileMenuOpen && <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setMobileMenuOpen(false)} />}

      {/* Main Content */}
      <main ref={mainContentRef} className="flex-1 overflow-y-auto h-screen" style={{ backgroundColor: currentTheme.colors.background }}>
        <div className="max-w-4xl mx-auto px-6 py-12 lg:py-16">
          {/* Header Badge */}
          <div className="flex items-center gap-3 mb-8">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30">
              <Zap size={14} className="text-amber-400" />
              <span className="text-xs font-bold text-amber-400 tracking-wider">ULTIMATE SCAN</span>
            </div>
            <span className="text-xs text-[var(--color-text-muted)]">{report.sections.length} sections + Photo Analysis</span>
          </div>

          {/* Dashboard */}
          <section id="dashboard" className="mb-16">
            <div className="grid lg:grid-cols-2 gap-8 mb-12">
              <div className="flex flex-col items-center justify-center p-8 rounded-sm border" style={{ backgroundColor: currentTheme.colors.surface, borderColor: currentTheme.colors.border }}>
                <RadialProgress score={globalScore} max={100} subLabel="SCORE GLOBAL" size={200} strokeWidth={6} color={currentTheme.colors.primary} />
                <div className="mt-4 text-center">
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${getScoreStatus(globalScore).color}`}>
                    {getScoreStatus(globalScore).label}
                  </span>
                </div>
              </div>

              <div className="p-6 rounded-sm border" style={{ backgroundColor: currentTheme.colors.surface, borderColor: currentTheme.colors.border }}>
                <h3 className="text-sm font-bold mb-4 uppercase tracking-wider text-[var(--color-text-muted)]">Radar Performance</h3>
                <MetricsRadar data={metricsData} color={currentTheme.colors.primary} />
              </div>
            </div>

            {/* Executive Summary */}
            <div className="p-6 rounded-sm border mb-8" style={{ backgroundColor: currentTheme.colors.surface, borderColor: currentTheme.colors.border }}>
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Target size={20} className="text-amber-400" />
                Synthese Executive Elite
              </h3>
              <div className="prose prose-invert max-w-none">
                {report.heroSummary.split('\n').map((para, i) => (
                  para.trim() && <p key={i} className="text-[var(--color-text-muted)] leading-relaxed mb-3">{para}</p>
                ))}
              </div>
            </div>

            {/* Strengths & Weaknesses */}
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <div className="p-6 rounded-sm border border-amber-500/20 bg-amber-500/5">
                <h4 className="text-sm font-bold mb-4 flex items-center gap-2 text-amber-400">
                  <TrendingUp size={16} /> Points Forts
                </h4>
                <div className="space-y-2">
                  {report.sections.filter(s => s.score >= 70).slice(0, 3).map(s => (
                    <div key={s.id} className="flex items-center justify-between p-2 rounded bg-amber-500/10">
                      <span className="text-sm">{s.title}</span>
                      <span className="text-xs font-bold text-amber-400">{s.score}%</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-6 rounded-sm border border-red-500/20 bg-red-500/5">
                <h4 className="text-sm font-bold mb-4 flex items-center gap-2 text-red-400">
                  <TrendingDown size={16} /> Axes d'Optimisation
                </h4>
                <div className="space-y-2">
                  {report.sections.filter(s => s.score < 60).slice(0, 3).map(s => (
                    <div key={s.id} className="flex items-center justify-between p-2 rounded bg-red-500/10">
                      <span className="text-sm">{s.title}</span>
                      <span className="text-xs font-bold text-red-400">{s.score}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-6 rounded-sm border" style={{ backgroundColor: currentTheme.colors.surface, borderColor: currentTheme.colors.border }}>
              <h3 className="text-sm font-bold mb-4 uppercase tracking-wider text-[var(--color-text-muted)]">Projection 90 Jours</h3>
              <ProjectionChart color={currentTheme.colors.primary} currentScore={globalScore / 10} />
            </div>
          </section>

          {/* Photo Analysis Section - ELITE ONLY */}
          <section id="photo-analysis" className="mb-12 scroll-mt-24">
            <div className="flex items-center gap-4 mb-6">
              <Camera size={24} style={{ color: currentTheme.colors.primary }} />
              <h2 className="text-xl font-bold">Analyse Visuelle & Posturale</h2>
            </div>

            {report.photoAnalysis ? (
              <div className="p-6 rounded-sm border" style={{ backgroundColor: currentTheme.colors.surface, borderColor: currentTheme.colors.border }}>
                <div className="flex items-center justify-between mb-6">
                  <span className="text-sm text-[var(--color-text-muted)]">Score visuel</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${getScoreStatus(report.photoAnalysis.score).color}`}>
                    {report.photoAnalysis.score}%
                  </span>
                </div>

                <div className="space-y-6">
                  <div>
                    <h4 className="text-sm font-bold text-[var(--color-text-muted)] mb-2">SYNTHESE</h4>
                    <p className="text-[var(--color-text)] leading-relaxed">{report.photoAnalysis.summary}</p>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="p-4 rounded bg-[var(--color-bg)]">
                      <h4 className="text-sm font-bold text-amber-400 mb-2">Analyse Posturale</h4>
                      <p className="text-sm text-[var(--color-text-muted)]">{report.photoAnalysis.postureAnalysis}</p>
                    </div>
                    <div className="p-4 rounded bg-[var(--color-bg)]">
                      <h4 className="text-sm font-bold text-blue-400 mb-2">Analyse Musculaire</h4>
                      <p className="text-sm text-[var(--color-text-muted)]">{report.photoAnalysis.muscularAnalysis}</p>
                    </div>
                    <div className="p-4 rounded bg-[var(--color-bg)]">
                      <h4 className="text-sm font-bold text-purple-400 mb-2">Analyse Adiposite</h4>
                      <p className="text-sm text-[var(--color-text-muted)]">{report.photoAnalysis.fatAnalysis}</p>
                    </div>
                    <div className="p-4 rounded bg-[var(--color-bg)]">
                      <h4 className="text-sm font-bold text-emerald-400 mb-2">Recommandations</h4>
                      <p className="text-sm text-[var(--color-text-muted)]">{report.photoAnalysis.recommendations}</p>
                    </div>
                  </div>

                  {report.photoAnalysis.correctiveProtocol && (
                    <div className="p-4 rounded border border-amber-500/30 bg-amber-500/10">
                      <h4 className="text-sm font-bold text-amber-400 mb-2">PROTOCOLE CORRECTIF</h4>
                      <p className="text-[var(--color-text)] leading-relaxed">{report.photoAnalysis.correctiveProtocol}</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-6 rounded-sm border border-amber-500/30 bg-amber-500/5">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="text-amber-400 shrink-0 mt-1" size={20} />
                  <div>
                    <p className="font-bold text-amber-400">Photos non disponibles</p>
                    <p className="text-sm text-[var(--color-text-muted)] mt-1">
                      Les photos n'ont pas ete soumises ou traitees. Pour une analyse visuelle complete,
                      soumets tes photos (face/profil/dos) lors de ton prochain audit.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* Detailed Sections */}
          {report.sections.map((section, idx) => {
            const Icon = SECTION_ICONS[section.id] || Activity;
            const status = getScoreStatus(section.score);

            return (
              <section key={section.id} id={section.id} className="mb-12 scroll-mt-24">
                <div className="flex items-center gap-4 mb-6">
                  <span className="text-5xl font-bold text-[var(--color-text-muted)]/20">{String(idx + 1).padStart(2, '0')}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <Icon size={20} style={{ color: currentTheme.colors.primary }} />
                      <h2 className="text-xl font-bold">{section.title}</h2>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${status.color}`}>{section.score}%</span>
                      <span className="text-xs text-[var(--color-text-muted)]">{status.label}</span>
                    </div>
                  </div>
                </div>

                <div className="p-6 rounded-sm border space-y-6" style={{ backgroundColor: currentTheme.colors.surface, borderColor: currentTheme.colors.border }}>
                  {section.introduction && (
                    <div>
                      <h4 className="text-sm font-bold text-[var(--color-text-muted)] mb-2">ANALYSE</h4>
                      <p className="text-[var(--color-text)] leading-relaxed whitespace-pre-line">{section.introduction}</p>
                    </div>
                  )}

                  {section.whatIsWrong && (
                    <div className="p-4 rounded bg-red-500/10 border border-red-500/20">
                      <h4 className="text-sm font-bold text-red-400 mb-2">CE QUI NE VA PAS</h4>
                      <p className="text-[var(--color-text-muted)] leading-relaxed whitespace-pre-line">{section.whatIsWrong}</p>
                    </div>
                  )}

                  {section.recommendations && (
                    <div className="p-4 rounded bg-amber-500/10 border border-amber-500/20">
                      <h4 className="text-sm font-bold text-amber-400 mb-2">RECOMMANDATIONS</h4>
                      <p className="text-[var(--color-text-muted)] leading-relaxed whitespace-pre-line">{section.recommendations}</p>
                    </div>
                  )}

                  {section.actionPlan && (
                    <div>
                      <h4 className="text-sm font-bold text-[var(--color-text-muted)] mb-2">PLAN D'ACTION</h4>
                      <p className="text-[var(--color-text)] leading-relaxed whitespace-pre-line">{section.actionPlan}</p>
                    </div>
                  )}

                  {section.scienceDeepDive && (
                    <div className="p-4 rounded bg-blue-500/10 border border-blue-500/20">
                      <h4 className="text-sm font-bold text-blue-400 mb-2">SCIENCE DEEP DIVE</h4>
                      <p className="text-[var(--color-text-muted)] leading-relaxed whitespace-pre-line text-sm">{section.scienceDeepDive}</p>
                    </div>
                  )}
                </div>
              </section>
            );
          })}

          {/* Supplements */}
          <section id="supplements" className="mb-12 scroll-mt-24">
            <div className="flex items-center gap-4 mb-6">
              <Pill size={24} style={{ color: currentTheme.colors.primary }} />
              <h2 className="text-xl font-bold">Stack Supplements Elite</h2>
            </div>

            <div className="p-6 rounded-sm border" style={{ backgroundColor: currentTheme.colors.surface, borderColor: currentTheme.colors.border }}>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--color-border)]">
                      <th className="text-left py-3 px-2 text-[var(--color-text-muted)] font-bold">Supplement</th>
                      <th className="text-left py-3 px-2 text-[var(--color-text-muted)] font-bold">Dosage</th>
                      <th className="text-left py-3 px-2 text-[var(--color-text-muted)] font-bold">Timing</th>
                      <th className="text-left py-3 px-2 text-[var(--color-text-muted)] font-bold hidden md:table-cell">Pourquoi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.supplementStack?.map((supp, idx) => (
                      <tr key={idx} className="border-b border-[var(--color-border)]/50">
                        <td className="py-3 px-2">
                          <span className="font-medium" style={{ color: currentTheme.colors.primary }}>{supp.name}</span>
                        </td>
                        <td className="py-3 px-2">
                          <span className="px-2 py-1 rounded bg-[var(--color-bg)] text-xs font-mono">{supp.dosage}</span>
                        </td>
                        <td className="py-3 px-2 text-[var(--color-text-muted)]">{supp.timing}</td>
                        <td className="py-3 px-2 text-[var(--color-text-muted)] text-xs hidden md:table-cell">{supp.why}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* Plan */}
          <section id="plan" className="mb-12 scroll-mt-24">
            <div className="flex items-center gap-4 mb-6">
              <Calendar size={24} style={{ color: currentTheme.colors.primary }} />
              <h2 className="text-xl font-bold">Plan d'Action Elite 12 Semaines</h2>
            </div>

            <div className="space-y-4">
              {[
                { title: 'Semaine 1', subtitle: 'Fondations', content: report.weeklyPlan?.week1 },
                { title: 'Semaine 2', subtitle: 'Consolidation', content: report.weeklyPlan?.week2 },
                { title: 'Semaines 3-4', subtitle: 'Optimisation', content: report.weeklyPlan?.weeks3_4 },
                { title: 'Mois 2-3', subtitle: 'Maintenance', content: report.weeklyPlan?.months2_3 }
              ].map((phase, idx) => (
                <div key={idx} className="flex gap-4">
                  <div className="w-1 rounded-full" style={{ backgroundColor: currentTheme.colors.primary }} />
                  <div className="flex-1 p-4 rounded border" style={{ backgroundColor: currentTheme.colors.surface, borderColor: currentTheme.colors.border }}>
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-bold">{phase.title}</h4>
                      <span className="px-2 py-0.5 rounded text-xs bg-[var(--color-bg)] text-[var(--color-text-muted)]">{phase.subtitle}</span>
                    </div>
                    <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">{phase.content}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Conclusion */}
          {report.conclusion && (
            <section className="mb-12 p-6 rounded-sm border-2" style={{ borderColor: currentTheme.colors.primary, backgroundColor: `${currentTheme.colors.primary}10` }}>
              <h3 className="text-lg font-bold mb-4">Conclusion Elite</h3>
              <p className="text-[var(--color-text)] leading-relaxed">{report.conclusion}</p>
              <div className="mt-4 flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
                <Zap size={16} className="text-amber-400" />
                <span>Analyse realisee par <strong>ACHZOD</strong> - Expert Metabolisme</span>
              </div>
            </section>
          )}

          {/* Review */}
          <section id="review" className="mb-12 scroll-mt-24">
            <div className="p-6 rounded-sm border" style={{ backgroundColor: currentTheme.colors.surface, borderColor: currentTheme.colors.border }}>
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Star size={20} style={{ color: currentTheme.colors.primary }} />
                Ton Avis Elite
              </h3>

              {reviewSubmitted ? (
                <div className="flex items-center gap-3 p-4 rounded bg-amber-500/10 border border-amber-500/20">
                  <CheckCircle2 className="text-amber-400" size={24} />
                  <div>
                    <p className="font-bold text-amber-400">Merci pour ton avis Elite !</p>
                    <p className="text-sm text-[var(--color-text-muted)]">Ton feedback est precieux.</p>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmitReview} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Note</label>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map(star => (
                        <button key={star} type="button" onClick={() => setReviewRating(star)} className="transition-transform hover:scale-110">
                          <Star size={32} className={star <= reviewRating ? 'fill-amber-400 text-amber-400' : 'text-[var(--color-text-muted)]/30'} />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Commentaire</label>
                    <textarea
                      value={reviewComment}
                      onChange={e => setReviewComment(e.target.value)}
                      placeholder="Qu'as-tu pense de ton rapport Elite ?"
                      className="w-full p-3 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text)] placeholder-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-primary)]"
                      rows={3}
                    />
                  </div>

                  {reviewError && <p className="text-red-400 text-sm">{reviewError}</p>}

                  <button type="submit" disabled={reviewSubmitting} className="flex items-center gap-2 px-6 py-3 rounded-lg font-bold transition-all disabled:opacity-50"
                    style={{ backgroundColor: currentTheme.colors.primary, color: currentTheme.type === 'dark' ? '#000' : '#fff' }}>
                    {reviewSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                    Envoyer
                  </button>
                </form>
              )}
            </div>
          </section>

          {/* CTA Coaching */}
          <section className="mb-16">
            <div
              className="rounded-sm p-8 text-center"
              style={{
                background: `linear-gradient(135deg, ${currentTheme.colors.primary}15 0%, ${currentTheme.colors.surface} 100%)`,
                border: `1px solid ${currentTheme.colors.primary}30`
              }}
            >
              <div className="flex items-center justify-center gap-2 mb-4">
                <Zap className="w-6 h-6" style={{ color: currentTheme.colors.primary }} />
                <span className="text-sm font-medium uppercase tracking-wider" style={{ color: currentTheme.colors.primary }}>
                  Accompagnement Premium
                </span>
              </div>
              <h2 className="text-2xl font-bold mb-4">Coaching 1:1 avec Achzod</h2>
              <p className="mb-6 max-w-xl mx-auto" style={{ color: currentTheme.colors.textMuted }}>
                Tu as maintenant ta feuille de route complete. Pour aller encore plus vite et eviter les erreurs, travaille directement avec moi. Suivi personnalise, ajustements en temps reel, resultats acceleres.
              </p>
              <a
                href="https://calendly.com/achzodcoaching/discovery"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-8 py-4 rounded font-semibold text-lg transition-all hover:scale-105"
                style={{
                  backgroundColor: currentTheme.colors.primary,
                  color: currentTheme.type === 'dark' ? '#000' : '#FFF'
                }}
              >
                <Calendar className="w-5 h-5" />
                Reserver un appel gratuit
              </a>
              <p className="mt-4 text-sm" style={{ color: currentTheme.colors.textMuted }}>
                30 min - Sans engagement
              </p>
            </div>
          </section>

          {/* Footer */}
          <footer className="py-12 text-center" style={{ borderTop: `1px solid ${currentTheme.colors.border}` }}>
            <p className="text-sm" style={{ color: currentTheme.colors.textMuted }}>
              Ultimate Scan - ApexLabs by Achzod
            </p>
          </footer>
        </div>
      </main>

      {/* Floating Nav */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-2 z-40">
        <button onClick={() => navigateChapter('prev')} className="p-3 rounded-full shadow-lg transition-all hover:scale-105" style={{ backgroundColor: currentTheme.colors.surface }}>
          <ArrowUp size={20} />
        </button>
        <button onClick={() => navigateChapter('next')} className="p-3 rounded-full shadow-lg transition-all hover:scale-105"
          style={{ backgroundColor: currentTheme.colors.primary, color: currentTheme.type === 'dark' ? '#000' : '#fff' }}>
          <ArrowDown size={20} />
        </button>
      </div>
    </div>
  );
};

export default UltimateScanReport;
