import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'wouter';
import { Sidebar } from '@/components/ultrahuman/Sidebar';
import { RadialProgress } from '@/components/ultrahuman/RadialProgress';
import { MetricsRadar, ProjectionChart } from '@/components/ultrahuman/Charts';
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
  AlertCircle
} from 'lucide-react';

// Theme definitions
const THEMES: Theme[] = [
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
      glow: 'rgba(255, 255, 255, 0.1)'
    }
  },
  {
    id: 'metabolic',
    name: 'Metabolic Fire',
    type: 'dark',
    colors: {
      primary: '#22c55e',
      background: '#050505',
      surface: '#111111',
      border: 'rgba(34, 197, 94, 0.2)',
      text: '#FFFFFF',
      textMuted: '#A1A1AA',
      grid: 'rgba(34, 197, 94, 0.08)',
      glow: 'rgba(34, 197, 94, 0.25)'
    }
  },
  {
    id: 'titanium',
    name: 'Titanium Light',
    type: 'light',
    colors: {
      primary: '#000000',
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
      primary: '#A85A32',
      background: '#F0EFE9',
      surface: '#E6E4DD',
      border: 'rgba(168, 90, 50, 0.1)',
      text: '#292524',
      textMuted: '#78716C',
      grid: 'rgba(168, 90, 50, 0.05)',
      glow: 'rgba(168, 90, 50, 0.1)'
    }
  }
];

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

const getScoreStatus = (value: number) => {
  if (value >= 8) return { label: 'FORT', color: 'bg-green-500/10 text-green-500' };
  if (value >= 6) return { label: 'MOYEN', color: 'bg-yellow-500/10 text-yellow-500' };
  if (value >= 4) return { label: 'FAIBLE', color: 'bg-orange-500/10 text-orange-500' };
  return { label: 'CRITIQUE', color: 'bg-red-500/10 text-red-500' };
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

        if (!data.success || !data.narrativeReport) {
          setError(data.error || 'Rapport non trouve');
          setLoading(false);
          return;
        }

        setReportData(data.narrativeReport);
        if (data.narrativeReport.sections?.length > 0) {
          setActiveSection(data.narrativeReport.sections[0].id);
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
              <div className="lg:col-span-1 lg:row-span-2 rounded-2xl p-8 flex flex-col justify-between relative overflow-hidden group" style={{ backgroundColor: 'var(--color-surface)', border: `1px solid var(--color-border)` }}>
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
              <div className="lg:col-span-2 lg:row-span-2 rounded-2xl p-1 relative group" style={{ backgroundColor: 'var(--color-surface)', border: `1px solid var(--color-border)` }}>
                <div className="absolute top-6 left-6 z-10">
                  <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>Balance Systemique</h3>
                </div>
                <div className="h-full w-full min-h-[300px] flex items-center justify-center pt-8">
                  <MetricsRadar data={reportData.metrics} color={currentTheme.colors.primary} />
                </div>
              </div>

              {/* Worst Metric KPI */}
              <div className="rounded-2xl p-6 flex flex-col justify-between hover:opacity-90 transition-colors cursor-default" style={{ backgroundColor: 'var(--color-surface)', border: `1px solid var(--color-border)` }}>
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
              <div className="rounded-2xl p-6 flex flex-col justify-between hover:opacity-90 transition-colors cursor-default" style={{ backgroundColor: 'var(--color-surface)', border: `1px solid var(--color-border)` }}>
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
              <div className="lg:col-span-4 rounded-2xl p-6 relative overflow-hidden flex flex-col md:flex-row gap-8 items-center" style={{ backgroundColor: 'var(--color-surface)', border: `1px solid var(--color-border)` }}>
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

          {/* Footer */}
          <footer className="py-24 flex flex-col md:flex-row justify-between items-start gap-8" style={{ borderTop: `1px solid var(--color-border)` }}>
            <div>
              <h4 className="font-bold text-lg mb-2 tracking-tight">Neurocore 360</h4>
              <p className="text-sm max-w-xs" style={{ color: 'var(--color-text-muted)' }}>
                Achzod Coaching - Excellence - Science - Transformation
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
