import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'wouter';
import { Sidebar } from '@/components/ultrahuman/Sidebar';
import { RadialProgress } from '@/components/ultrahuman/RadialProgress';
import { MetricsRadar, ProjectionChart } from '@/components/ultrahuman/Charts';
import { ULTRAHUMAN_THEMES } from '@/components/ultrahuman/themes';
import { Theme, ReportData } from '@/components/ultrahuman/types';
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
  Send
} from 'lucide-react';

const THEMES: Theme[] = ULTRAHUMAN_THEMES;

// Icon mapping for metrics
const METRIC_ICONS: Record<string, React.ElementType> = {
  sommeil: Moon,
  stress: Brain,
  energie: Zap,
  digestion: Flame,
  training: Dumbbell,
  nutrition: Apple,
  lifestyle: Sun,
  mindset: Lightbulb
};

// Theme-aware score status - uses CSS custom property for theme consistency
const getScoreStatus = (value: number) => {
  // All states use theme's primary color for M1 (yellow) consistency
  if (value >= 8) return { label: 'FORT', color: 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]' };
  if (value >= 6) return { label: 'MOYEN', color: 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]' };
  if (value >= 4) return { label: 'FAIBLE', color: 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]' };
  return { label: 'CRITIQUE', color: 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]' };
};

const DiscoveryScanReport: React.FC = () => {
  const { auditId } = useParams();
  const [reportData, setReportData] = useState<ReportData | null>(null);
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

  // Fetch report data
  useEffect(() => {
    const fetchReport = async () => {
      if (!auditId) {
        setError('ID audit manquant');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/discovery-scan/${auditId}`);
        const data = await response.json();

        // Check if error response
        if (data.error) {
          setError(data.error);
          setLoading(false);
          return;
        }

        // API returns ReportData directly (not wrapped)
        if (!data.globalScore || !data.sections) {
          setError('Format de rapport invalide');
          setLoading(false);
          return;
        }

        setReportData(data);
        if (data.sections?.length > 0) {
          setActiveSection(data.sections[0].id);
        }
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
      if (!mainContentRef.current || !reportData) return;
      const container = mainContentRef.current;

      const totalScroll = container.scrollTop;
      const windowHeight = container.clientHeight;
      const totalHeight = container.scrollHeight - windowHeight;
      const progress = totalHeight > 0 ? (totalScroll / totalHeight) * 100 : 0;
      setScrollProgress(progress);

      // Scroll spy
      const headings = reportData.sections.map(s => document.getElementById(s.id));
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
  }, [reportData]);

  // Check if review already exists
  useEffect(() => {
    const checkExistingReview = async () => {
      if (!auditId) return;
      try {
        const response = await fetch(`/api/review/check/${auditId}`);
        const data = await response.json();
        if (data.success && data.hasReview) {
          setHasExistingReview(true);
          setReviewSubmitted(true);
        }
      } catch (err) {
        console.error('Error checking review:', err);
      }
    };
    checkExistingReview();
  }, [auditId]);

  // Submit review handler
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auditId || reviewRating === 0 || reviewComment.length < 10 || !reviewEmail) {
      setReviewError('Veuillez remplir tous les champs (note, email, et commentaire de 10 caracteres minimum)');
      return;
    }

    setReviewSubmitting(true);
    setReviewError(null);

    try {
      const response = await fetch('/api/submit-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          auditId,
          email: reviewEmail,
          auditType: 'DISCOVERY',
          rating: reviewRating,
          comment: reviewComment
        })
      });

      const data = await response.json();

      if (data.success) {
        setReviewSubmitted(true);
      } else {
        setReviewError(data.error || 'Erreur lors de la soumission');
      }
    } catch (err) {
      setReviewError('Erreur de connexion au serveur');
    } finally {
      setReviewSubmitting(false);
    }
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el && mainContentRef.current) {
      mainContentRef.current.scrollTo({ top: el.offsetTop - 100, behavior: 'smooth' });
    }
    setActiveSection(id);
    setMobileMenuOpen(false);
  };

  const navigateChapter = (direction: 'next' | 'prev') => {
    if (!reportData) return;
    const currentIndex = reportData.sections.findIndex(s => s.id === activeSection);
    let nextIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
    if (nextIndex < 0) nextIndex = 0;
    if (nextIndex >= reportData.sections.length) nextIndex = reportData.sections.length - 1;
    scrollToSection(reportData.sections[nextIndex].id);
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-white/50 mx-auto mb-4" />
          <p className="text-white/70">Chargement du rapport...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !reportData) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-white/70">{error || 'Rapport non disponible'}</p>
        </div>
      </div>
    );
  }

  // Get worst metrics for KPI cards
  const sortedMetrics = [...reportData.metrics].sort((a, b) => a.value - b.value);
  const worstMetric = sortedMetrics[0];
  const bestMetric = sortedMetrics[sortedMetrics.length - 1];

  return (
    <div
      className="flex h-screen font-sans overflow-hidden selection:bg-white/20 relative transition-colors duration-500"
      style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}
    >
      {/* Progress Bar */}
      <div className="fixed top-0 left-0 right-0 h-1 z-[60]" style={{ backgroundColor: 'var(--color-border)' }}>
        <div
          className="h-full transition-all duration-150 ease-out"
          style={{ width: `${scrollProgress}%`, backgroundColor: currentTheme.colors.primary }}
        />
      </div>

      {/* Background Grid */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(to right, ${currentTheme.colors.grid} 1px, transparent 1px), linear-gradient(to bottom, ${currentTheme.colors.grid} 1px, transparent 1px)`,
          backgroundSize: '60px 60px'
        }}
      />

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-80 transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} border-r flex flex-col`}
        style={{ backgroundColor: 'var(--color-bg)', borderColor: 'var(--color-border)' }}>
        <Sidebar
          sections={reportData.sections}
          activeSection={activeSection}
          onNavigate={scrollToSection}
          themes={THEMES}
          currentTheme={currentTheme}
          onThemeChange={setCurrentTheme}
          clientName={reportData.clientName}
          auditType={reportData.auditType}
        />
      </aside>

      {/* Main Content */}
      <main ref={mainContentRef} className="flex-1 overflow-y-auto relative z-10 scroll-smooth">
        {/* Floating Nav */}
        <div className="fixed bottom-8 right-8 z-50 flex flex-col gap-2">
          <button
            onClick={() => scrollToSection('dashboard')}
            className="w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-xl"
            style={{ backgroundColor: 'var(--color-surface)', border: `1px solid var(--color-border)`, color: 'var(--color-text-muted)' }}
          >
            <ArrowUp size={16} />
          </button>
          <div className="flex flex-col rounded-full shadow-xl overflow-hidden" style={{ backgroundColor: 'var(--color-surface)', border: `1px solid var(--color-border)` }}>
            <button onClick={() => navigateChapter('prev')} className="w-10 h-10 flex items-center justify-center hover:opacity-70 transition-colors" style={{ color: 'var(--color-text)' }}>
              <ArrowUp size={16} />
            </button>
            <div className="h-[1px] w-full" style={{ backgroundColor: 'var(--color-border)' }}></div>
            <button onClick={() => navigateChapter('next')} className="w-10 h-10 flex items-center justify-center hover:opacity-70 transition-colors" style={{ color: 'var(--color-text)' }}>
              <ArrowDown size={16} />
            </button>
          </div>
        </div>

        {/* Mobile Header */}
        <div className="lg:hidden sticky top-0 z-40 backdrop-blur-md px-4 py-4 flex items-center justify-between" style={{ backgroundColor: 'var(--color-bg)', borderBottom: `1px solid var(--color-border)` }}>
          <span className="font-bold text-sm tracking-widest uppercase">{reportData.clientName}</span>
          <button onClick={() => setMobileMenuOpen(true)}><Menu size={20} /></button>
        </div>

        <div className="max-w-[1200px] mx-auto p-6 lg:p-12 space-y-12 lg:space-y-32">
          {/* Hero Section */}
          <div id="dashboard" className="pt-8 lg:pt-12">
            <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-12">
              <div className="space-y-6 max-w-2xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full" style={{ border: `1px solid var(--color-border)`, backgroundColor: 'var(--color-surface)' }}>
                  <span className="w-1.5 h-1.5 rounded-full animate-pulse bg-green-500"></span>
                  <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>Discovery Scan</span>
                </div>
                <h1 className="text-5xl lg:text-7xl font-medium tracking-tighter leading-[0.9]">
                  {reportData.clientName}, <br />
                  <span style={{ color: currentTheme.colors.textMuted }}>voici ton scan.</span>
                </h1>
                <p className="text-lg leading-relaxed max-w-lg" style={{ color: 'var(--color-text-muted)' }}>
                  {reportData.globalScore}/10 — {reportData.globalScore >= 7 ? 'Une base solide.' : reportData.globalScore >= 5 ? 'Des axes d\'optimisation identifies.' : 'Plusieurs blocages a debloquer.'}
                </p>
              </div>

              <div className="flex gap-4 items-end">
                <div className="text-right hidden md:block">
                  <div className="text-3xl font-bold font-mono">{reportData.globalScore}<span className="text-lg opacity-50">/10</span></div>
                  <div className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>Score Global</div>
                </div>
              </div>
            </header>

            {/* Dashboard Grid */}
            <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Main Score */}
              <div className="lg:col-span-1 lg:row-span-2 rounded-sm p-8 flex flex-col justify-between relative overflow-hidden group" style={{ backgroundColor: 'var(--color-surface)', border: `1px solid var(--color-border)` }}>
                <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity duration-500">
                  <Activity size={80} />
                </div>
                <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>Performance Globale</h3>
                <div className="flex items-center justify-center py-8">
                  <RadialProgress
                    score={reportData.globalScore}
                    max={10}
                    size={180}
                    strokeWidth={4}
                    color={currentTheme.colors.primary}
                  />
                </div>
                <div className="flex items-center justify-center">
                  <span className={`text-xs font-medium px-3 py-1 rounded-full ${getScoreStatus(reportData.globalScore).color}`}>
                    {getScoreStatus(reportData.globalScore).label}
                  </span>
                </div>
              </div>

              {/* Radar Chart */}
              <div className="lg:col-span-2 lg:row-span-2 rounded-sm p-1 relative group" style={{ backgroundColor: 'var(--color-surface)', border: `1px solid var(--color-border)` }}>
                <div className="absolute top-6 left-6 z-10">
                  <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>Balance Systemique</h3>
                </div>
                <div className="h-full w-full min-h-[300px] flex items-center justify-center pt-8">
                  <MetricsRadar data={reportData.metrics} color={currentTheme.colors.primary} />
                </div>
              </div>

              {/* Worst Metric KPI */}
              <div className="rounded-sm p-6 flex flex-col justify-between hover:opacity-90 transition-colors cursor-default" style={{ backgroundColor: 'var(--color-surface)', border: `1px solid var(--color-border)` }}>
                <div className="flex justify-between items-start">
                  {React.createElement(METRIC_ICONS[worstMetric?.key] || Brain, { size: 20, style: { color: 'var(--color-text-muted)' } })}
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${getScoreStatus(worstMetric?.value || 0).color}`}>
                    {getScoreStatus(worstMetric?.value || 0).label}
                  </span>
                </div>
                <div>
                  <div className="text-2xl font-medium mt-4">{worstMetric?.value}<span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>/10</span></div>
                  <div className="text-xs font-mono uppercase mt-1" style={{ color: 'var(--color-text-muted)' }}>{worstMetric?.label}</div>
                </div>
              </div>

              {/* Best Metric KPI */}
              <div className="rounded-sm p-6 flex flex-col justify-between hover:opacity-90 transition-colors cursor-default" style={{ backgroundColor: 'var(--color-surface)', border: `1px solid var(--color-border)` }}>
                <div className="flex justify-between items-start">
                  {React.createElement(METRIC_ICONS[bestMetric?.key] || Zap, { size: 20, style: { color: 'var(--color-text-muted)' } })}
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${getScoreStatus(bestMetric?.value || 0).color}`}>
                    {getScoreStatus(bestMetric?.value || 0).label}
                  </span>
                </div>
                <div>
                  <div className="text-2xl font-medium mt-4">{bestMetric?.value}<span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>/10</span></div>
                  <div className="text-xs font-mono uppercase mt-1" style={{ color: 'var(--color-text-muted)' }}>{bestMetric?.label}</div>
                </div>
              </div>

              {/* Projection Chart */}
              <div className="lg:col-span-4 rounded-sm p-6 relative overflow-hidden flex flex-col md:flex-row gap-8 items-center" style={{ backgroundColor: 'var(--color-surface)', border: `1px solid var(--color-border)` }}>
                <div className="w-full md:w-1/3">
                  <h3 className="text-sm font-bold mb-2 flex items-center gap-2" style={{ color: 'var(--color-primary)' }}>
                    <Zap size={16} /> Potentiel
                  </h3>
                  <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                    En debloquant tes systemes prioritaires, projection d'amelioration sur 90 jours.
                  </p>
                </div>
                <div className="w-full md:w-2/3 h-[150px]">
                  <ProjectionChart color={currentTheme.colors.primary} currentScore={reportData.globalScore} />
                </div>
              </div>
            </section>
          </div>

          {/* Content Sections */}
          <div className="space-y-0 relative">
            <div className="absolute left-0 lg:left-[240px] top-0 bottom-0 w-[1px] hidden lg:block" style={{ backgroundColor: 'var(--color-border)' }}></div>

            {reportData.sections.map((section, idx) => (
              <section key={section.id} id={section.id} className="scroll-mt-32 group relative pb-24 lg:pb-32">
                <div className="flex flex-col lg:flex-row gap-8 lg:gap-24">
                  {/* Section Header */}
                  <div className="lg:w-[240px] flex-shrink-0">
                    <div className="sticky top-24 pr-8 lg:text-right">
                      <span className="font-mono text-4xl lg:text-5xl font-bold group-hover:opacity-50 transition-colors block mb-2 opacity-20" style={{ color: 'var(--color-border)' }}>
                        {idx + 1 < 10 ? `0${idx + 1}` : idx + 1}
                      </span>
                      <h2 className="text-xl font-bold tracking-tight mb-2 leading-tight">
                        {section.title}
                      </h2>
                      {section.subtitle && (
                        <p className="text-xs font-mono uppercase tracking-widest mb-4" style={{ color: currentTheme.colors.primary }}>
                          {section.subtitle}
                        </p>
                      )}
                      {section.chips && section.chips.length > 0 && (
                        <div className="flex flex-wrap lg:justify-end gap-2 mt-4">
                          {section.chips.map(chip => (
                            <span key={chip} className="px-2 py-1 text-[9px] font-mono uppercase rounded" style={{ border: `1px solid var(--color-border)`, color: 'var(--color-text-muted)' }}>
                              {chip}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Section Content */}
                  <div className="flex-1 min-w-0">
                    <div
                      className="prose prose-lg max-w-none"
                      style={{
                        '--tw-prose-body': 'var(--color-text-muted)',
                        '--tw-prose-headings': 'var(--color-text)',
                        '--tw-prose-strong': 'var(--color-text)',
                        '--tw-prose-bullets': 'var(--color-primary)'
                      } as React.CSSProperties}
                      dangerouslySetInnerHTML={{ __html: section.content }}
                    />
                  </div>
                </div>
              </section>
            ))}
          </div>

          {/* Review Section */}
          <section className="py-16" style={{ borderTop: `1px solid var(--color-border)` }}>
            <div className="max-w-2xl mx-auto">
              <div className="text-center mb-8">
                <Star className="w-10 h-10 mx-auto mb-4" style={{ color: currentTheme.colors.primary }} />
                <h3 className="text-2xl font-bold mb-2">Ton avis compte</h3>
                <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                  Laisse un avis et recois ton code promo <strong>-20%</strong> sur le coaching Achzod par email !
                </p>
              </div>

              {reviewSubmitted ? (
                <div className="text-center p-8 rounded-sm" style={{ backgroundColor: 'var(--color-surface)', border: `1px solid var(--color-border)` }}>
                  <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-green-500" />
                  <h4 className="text-xl font-bold mb-2">Merci pour ton avis !</h4>
                  <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                    {hasExistingReview
                      ? 'Ton avis est deja enregistre.'
                      : 'Je t envoie ton code promo par email apres validation.'}
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmitReview} className="space-y-6 p-8 rounded-sm" style={{ backgroundColor: 'var(--color-surface)', border: `1px solid var(--color-border)` }}>
                  {/* Star Rating */}
                  <div className="text-center">
                    <label className="text-sm font-medium block mb-3" style={{ color: 'var(--color-text-muted)' }}>
                      Ta note
                    </label>
                    <div className="flex justify-center gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setReviewRating(star)}
                          className="p-1 transition-transform hover:scale-110"
                        >
                          <Star
                            size={32}
                            className={star <= reviewRating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-400'}
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Email */}
                  <div>
                    <label className="text-sm font-medium block mb-2" style={{ color: 'var(--color-text-muted)' }}>
                      Ton email (pour recevoir le code promo)
                    </label>
                    <input
                      type="email"
                      value={reviewEmail}
                      onChange={(e) => setReviewEmail(e.target.value)}
                      placeholder="ton@email.com"
                      required
                      className="w-full px-4 py-3 rounded text-sm focus:outline-none focus:ring-2 transition-all"
                      style={{
                        backgroundColor: 'var(--color-bg)',
                        border: `1px solid var(--color-border)`,
                        color: 'var(--color-text)'
                      }}
                    />
                  </div>

                  {/* Comment */}
                  <div>
                    <label className="text-sm font-medium block mb-2" style={{ color: 'var(--color-text-muted)' }}>
                      Ton commentaire (min. 10 caracteres)
                    </label>
                    <textarea
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      placeholder="Qu'as-tu pense de ce Discovery Scan ? Ton avis m aide a te livrer encore mieux..."
                      rows={4}
                      required
                      minLength={10}
                      className="w-full px-4 py-3 rounded text-sm focus:outline-none focus:ring-2 transition-all resize-none"
                      style={{
                        backgroundColor: 'var(--color-bg)',
                        border: `1px solid var(--color-border)`,
                        color: 'var(--color-text)'
                      }}
                    />
                    <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                      {reviewComment.length}/10 caracteres minimum
                    </p>
                  </div>

                  {/* Error */}
                  {reviewError && (
                    <div className="text-red-500 text-sm text-center p-3 rounded-lg bg-red-500/10">
                      {reviewError}
                    </div>
                  )}

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={reviewSubmitting || reviewRating === 0 || reviewComment.length < 10 || !reviewEmail}
                    className="w-full py-4 rounded font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      backgroundColor: currentTheme.colors.primary,
                      color: currentTheme.type === 'dark' ? '#000' : '#fff'
                    }}
                  >
                    {reviewSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Envoi en cours...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Envoyer mon avis
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </section>

          {/* CTA Upgrade */}
          <section className="mb-16">
            <div
              className="rounded-sm p-8 text-center"
              style={{
                background: `linear-gradient(135deg, ${currentTheme.colors.primary}15 0%, ${currentTheme.colors.surface} 100%)`,
                border: `1px solid ${currentTheme.colors.primary}30`
              }}
            >
              <h2 className="text-2xl font-bold mb-4">Passe au niveau superieur</h2>
              <p className="mb-6 max-w-xl mx-auto" style={{ color: currentTheme.colors.textMuted }}>
                Ce Discovery Scan t'a donne un apercu de ton potentiel. L'Anabolic Bioscan va 10x plus loin avec des protocoles precis, un stack supplements personnalise, et un plan d'action semaine par semaine.
              </p>
              <a
                href="/offers/anabolic-bioscan"
                className="inline-flex items-center gap-2 px-8 py-4 rounded font-semibold text-lg transition-all hover:scale-105"
                style={{
                  backgroundColor: currentTheme.colors.primary,
                  color: currentTheme.type === 'dark' ? '#000' : '#FFF'
                }}
              >
                <Zap className="w-5 h-5" />
                Debloquer l'Anabolic Bioscan
              </a>
              <p className="mt-4 text-sm" style={{ color: currentTheme.colors.textMuted }}>
                Garantie satisfait ou rembourse 30 jours
              </p>
            </div>
          </section>

          {/* Footer */}
          <footer className="py-24 flex flex-col md:flex-row justify-between items-start gap-8" style={{ borderTop: `1px solid var(--color-border)` }}>
            <div>
              <h4 className="font-bold text-lg mb-2 tracking-tight">ApexLabs by Achzod</h4>
              <p className="text-sm max-w-xs" style={{ color: 'var(--color-text-muted)' }}>
                Excellence - Science - Transformation
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>
                Discovery Scan - {new Date(reportData.generatedAt).toLocaleDateString('fr-FR')}
              </p>
            </div>
          </footer>
        </div>
      </main>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setMobileMenuOpen(false)} />
      )}
    </div>
  );
};

export default DiscoveryScanReport;
