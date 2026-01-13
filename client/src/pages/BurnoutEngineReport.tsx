import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'wouter';
import { Sidebar } from '@/components/ultrahuman/Sidebar';
import { RadialProgress } from '@/components/ultrahuman/RadialProgress';
import { ULTRAHUMAN_THEMES } from '@/components/ultrahuman/themes';
import { SectionContent, Theme, Metric } from '@/components/ultrahuman/types';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Brain,
  CheckCircle2,
  Flame,
  Heart,
  Loader2,
  Menu,
  Send,
  Star,
  Target,
  Users,
  Zap,
  Moon
} from 'lucide-react';

const THEMES: Theme[] = ULTRAHUMAN_THEMES;

const withAlpha = (hex: string, alpha: number): string => {
  const normalized = hex.replace('#', '');
  if (normalized.length !== 6) return hex;
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

interface BurnoutReportData {
  globalScore: number;
  phase: 'alarme' | 'resistance' | 'epuisement';
  phaseLabel: string;
  phaseDescription?: string;
  clientName: string;
  generatedAt: string;
  metrics: Metric[];
  sections: SectionContent[];
  email?: string;
}

const METRIC_ICONS: Record<string, React.ElementType> = {
  energie: Zap,
  sommeil: Moon,
  cognitif: Brain,
  emotionnel: Heart,
  physique: Activity,
  social: Users
};

const PHASE_LABELS = {
  alarme: { label: 'Phase d\'Alarme', icon: AlertTriangle },
  resistance: { label: 'Phase de Resistance', icon: Target },
  epuisement: { label: 'Phase d\'Epuisement', icon: Flame }
};

const getPhaseConfig = (phase: 'alarme' | 'resistance' | 'epuisement', theme: Theme) => {
  const base = PHASE_LABELS[phase];
  return {
    label: base.label,
    icon: base.icon,
    color: theme.colors.primary,
    bgColor: withAlpha(theme.colors.primary, 0.12),
  };
};

const getLevelStatus = (level: 'optimal' | 'attention' | 'critique', theme: Theme) => {
  const primary = theme.colors.primary;
  const soft = withAlpha(primary, 0.12);
  switch (level) {
    case 'optimal':
      return { label: 'OPTIMAL', style: { color: primary, backgroundColor: soft }, barColor: primary };
    case 'attention':
      return { label: 'ATTENTION', style: { color: primary, backgroundColor: soft }, barColor: primary };
    case 'critique':
      return { label: 'CRITIQUE', style: { color: primary, backgroundColor: soft }, barColor: primary };
  }
};

const getMetricLevel = (value: number): 'optimal' | 'attention' | 'critique' => {
  if (value >= 8) return 'optimal';
  if (value >= 6) return 'attention';
  return 'critique';
};

const BurnoutEngineReport: React.FC = () => {
  const { auditId } = useParams();
  const [reportData, setReportData] = useState<BurnoutReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<string>('dashboard');
  const [currentTheme, setCurrentTheme] = useState<Theme>(THEMES[0]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const mainContentRef = useRef<HTMLDivElement>(null);

  const [reviewRating, setReviewRating] = useState<number>(0);
  const [reviewComment, setReviewComment] = useState<string>('');
  const [reviewEmail, setReviewEmail] = useState<string>('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [hasExistingReview, setHasExistingReview] = useState(false);

  const navigationSections = useMemo<SectionContent[]>(() => {
    const base: SectionContent[] = [
      { id: 'dashboard', title: 'Vue d\'ensemble', content: '' }
    ];
    if (reportData?.sections?.length) {
      base.push(...reportData.sections);
    }
    base.push({ id: 'review', title: 'Votre Avis', content: '' });
    return base;
  }, [reportData]);

  useEffect(() => {
    const fetchReport = async () => {
      if (!auditId) {
        setError('ID analyse manquant');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/burnout-detection/${auditId}`);
        const data = await response.json();

        if (data.error) {
          setError(data.error);
          setLoading(false);
          return;
        }

        if (typeof data.globalScore !== 'number' || !data.phase || !Array.isArray(data.sections)) {
          setError('Format de rapport invalide');
          setLoading(false);
          return;
        }

        setReportData(data);
        setReviewEmail(data.email || '');
      } catch (err) {
        setError('Erreur de chargement du rapport');
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [auditId]);

  useEffect(() => {
    if (!auditId) return;
    const checkExistingReview = async () => {
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

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--color-bg', currentTheme.colors.background);
    root.style.setProperty('--color-surface', currentTheme.colors.surface);
    root.style.setProperty('--color-border', currentTheme.colors.border);
    root.style.setProperty('--color-text', currentTheme.colors.text);
    root.style.setProperty('--color-text-muted', currentTheme.colors.textMuted);
    root.style.setProperty('--color-primary', currentTheme.colors.primary);
    root.style.setProperty('--color-grid', currentTheme.colors.grid);
    root.style.setProperty('--primary', currentTheme.colors.primary);
    root.style.setProperty('--text', currentTheme.colors.text);
    root.style.setProperty('--text-secondary', currentTheme.colors.textMuted);
    root.style.setProperty('--surface-2', currentTheme.colors.surface);
    root.style.setProperty('--accent-ok', currentTheme.colors.primary);
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

      const sections = navigationSections.map(s => document.getElementById(s.id));
      const scrollPos = container.scrollTop + 200;
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
      handleScroll();
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [navigationSections]);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el && mainContentRef.current) {
      mainContentRef.current.scrollTo({ top: el.offsetTop - 100, behavior: 'smooth' });
    }
    setActiveSection(id);
    setMobileMenuOpen(false);
  };

  const submitReview = async () => {
    if (!auditId || reviewRating === 0 || reviewComment.length < 10 || !reviewEmail) {
      setReviewError('Note, email et commentaire (10 caracteres min) requis');
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
          rating: reviewRating,
          comment: reviewComment,
          email: reviewEmail,
          auditType: 'BURNOUT'
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

  const phaseConfig = getPhaseConfig(reportData.phase, currentTheme);
  const primary = currentTheme.colors.primary;
  const primarySoft = withAlpha(primary, 0.12);
  const primaryBorder = withAlpha(primary, 0.3);
  const PhaseIcon = phaseConfig.icon;

  return (
    <div
      className="min-h-screen flex"
      style={{ backgroundColor: currentTheme.colors.background, color: currentTheme.colors.text }}
    >
      <div className="fixed top-0 left-0 right-0 h-1 bg-black/50 z-50">
        <div
          className="h-full transition-all duration-300"
          style={{ width: `${scrollProgress}%`, backgroundColor: currentTheme.colors.primary }}
        />
      </div>

      <aside
        className={`fixed lg:sticky top-0 left-0 h-screen w-72 border-r z-40 transition-transform lg:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ backgroundColor: currentTheme.colors.background, borderColor: currentTheme.colors.border }}
      >
        <Sidebar
          sections={navigationSections}
          activeSection={activeSection}
          onNavigate={scrollToSection}
          themes={THEMES}
          currentTheme={currentTheme}
          onThemeChange={setCurrentTheme}
          clientName={reportData.clientName || 'Client'}
          auditType="BURNOUT"
        />
      </aside>

      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <main ref={mainContentRef} className="flex-1 overflow-y-auto h-screen">
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg"
          style={{ backgroundColor: currentTheme.colors.surface }}
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="max-w-6xl mx-auto px-6 py-12">
          <section id="dashboard" className="mb-16 scroll-mt-24">
            <div className="grid lg:grid-cols-2 gap-8 mb-10">
              <div
                className="flex flex-col items-center justify-center p-8 rounded-sm border"
                style={{ backgroundColor: currentTheme.colors.surface, borderColor: currentTheme.colors.border }}
              >
                <RadialProgress
                  score={reportData.globalScore}
                  max={100}
                  subLabel="SCORE GLOBAL"
                  size={200}
                  strokeWidth={6}
                  color={currentTheme.colors.primary}
                />
              </div>

              <div
                className="p-6 rounded-sm border"
                style={{ backgroundColor: currentTheme.colors.surface, borderColor: currentTheme.colors.border }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <PhaseIcon className="w-6 h-6" style={{ color: phaseConfig.color }} />
                  <h2 className="text-xl font-semibold">{phaseConfig.label}</h2>
                </div>
                <div className="p-4 rounded" style={{ backgroundColor: phaseConfig.bgColor }}>
                  <p className="text-sm leading-relaxed">
                    {reportData.phaseDescription || reportData.phaseLabel}
                  </p>
                </div>
                <p className="text-sm mt-4" style={{ color: currentTheme.colors.textMuted }}>
                  Analyse generee le {new Date(reportData.generatedAt).toLocaleDateString('fr-FR')}.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {reportData.metrics.map((metric) => {
                const level = getMetricLevel(metric.value);
                const status = getLevelStatus(level, currentTheme);
                const Icon = METRIC_ICONS[metric.key] || Activity;
                const percent = Math.round((metric.value / metric.max) * 100);

                return (
                  <div
                    key={metric.key}
                    className="rounded p-4"
                    style={{ backgroundColor: currentTheme.colors.surface, border: `1px solid ${currentTheme.colors.border}` }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <Icon className="w-5 h-5" style={{ color: status.barColor }} />
                      <span className="text-xs px-2 py-1 rounded-full" style={status.style}>
                        {status.label}
                      </span>
                    </div>
                    <div className="text-2xl font-bold mb-1">{percent}%</div>
                    <div className="text-sm" style={{ color: currentTheme.colors.textMuted }}>
                      {metric.label}
                    </div>
                    <div className="mt-3 h-1.5 rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${percent}%`, backgroundColor: status.barColor }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {reportData.sections.map((section, idx) => (
            <section key={section.id} id={section.id} className="mb-12 scroll-mt-24">
              <div className="flex items-center gap-4 mb-6">
                <span className="text-4xl font-bold text-[var(--color-text-muted)]/20">
                  {String(idx + 1).padStart(2, '0')}
                </span>
                <div>
                  <h2 className="text-2xl font-bold">{section.title}</h2>
                  {section.subtitle && (
                    <p className="text-sm" style={{ color: currentTheme.colors.textMuted }}>
                      {section.subtitle}
                    </p>
                  )}
                </div>
              </div>

              {section.chips && section.chips.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {section.chips.map((chip) => (
                    <span
                      key={chip}
                      className="px-3 py-1 rounded-full text-xs"
                      style={{ backgroundColor: `${currentTheme.colors.primary}20`, color: currentTheme.colors.primary }}
                    >
                      {chip}
                    </span>
                  ))}
                </div>
              )}

              <div
                className={`p-6 rounded-sm border prose max-w-none ${currentTheme.type === 'dark' ? 'prose-invert' : ''}`}
                style={{ backgroundColor: currentTheme.colors.surface, borderColor: currentTheme.colors.border, color: currentTheme.colors.text }}
                dangerouslySetInnerHTML={{ __html: section.content }}
              />
            </section>
          ))}

          <section id="review" className="mb-12 scroll-mt-24">
            <div
              className="p-6 rounded-sm border"
              style={{ backgroundColor: currentTheme.colors.surface, borderColor: currentTheme.colors.border }}
            >
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Star size={20} style={{ color: currentTheme.colors.primary }} />
                Ton Avis Compte
              </h3>

              {reviewSubmitted ? (
                <div className="flex items-center gap-3 p-4 rounded border" style={{ backgroundColor: primarySoft, borderColor: primaryBorder }}>
                  <CheckCircle2 style={{ color: primary }} size={24} />
                  <div>
                    <p className="font-bold" style={{ color: primary }}>Merci pour ton avis !</p>
                    <p className="text-sm text-[var(--color-text-muted)]">Ton retour m'aide a m'ameliorer.</p>
                  </div>
                </div>
              ) : hasExistingReview ? (
                <div className="flex items-center gap-3 p-4 rounded border" style={{ backgroundColor: primarySoft, borderColor: primaryBorder }}>
                  <CheckCircle2 style={{ color: primary }} size={24} />
                  <div>
                    <p className="font-bold" style={{ color: primary }}>Avis deja enregistre</p>
                    <p className="text-sm text-[var(--color-text-muted)]">Merci pour ta contribution.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Note</label>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setReviewRating(star)}
                          className="transition-transform hover:scale-110"
                        >
                          <Star
                            size={32}
                            className={star <= reviewRating ? 'fill-current' : 'text-[var(--color-text-muted)]/30'}
                            style={star <= reviewRating ? { color: primary } : undefined}
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Commentaire</label>
                    <textarea
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      placeholder="Qu'as-tu pense de ton rapport ?"
                      className="w-full p-3 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text)] placeholder-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-primary)]"
                      rows={3}
                    />
                    <p className="text-xs text-[var(--color-text-muted)] mt-1">
                      {reviewComment.length}/10 caracteres minimum
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Email</label>
                    <input
                      type="email"
                      value={reviewEmail}
                      onChange={(e) => setReviewEmail(e.target.value)}
                      placeholder="ton@email.com"
                      className="w-full p-3 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text)] placeholder-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-primary)]"
                    />
                  </div>

                  {reviewError && (
                    <p className="text-red-400 text-sm">{reviewError}</p>
                  )}

                  <button
                    type="button"
                    onClick={submitReview}
                    disabled={reviewSubmitting}
                    className="flex items-center gap-2 px-6 py-3 rounded-lg font-bold transition-all disabled:opacity-50"
                    style={{ backgroundColor: currentTheme.colors.primary, color: currentTheme.type === 'dark' ? '#000' : '#fff' }}
                  >
                    {reviewSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                    Envoyer
                  </button>
                </div>
              )}
            </div>
          </section>
        </div>
      </main>

      <button
        onClick={() => scrollToSection('dashboard')}
        className="hidden lg:flex fixed bottom-6 right-6 p-3 rounded-full shadow-lg transition-all hover:scale-105"
        style={{ backgroundColor: currentTheme.colors.surface }}
      >
        <ArrowUp className="w-5 h-5" />
      </button>

      <button
        onClick={() => scrollToSection('review')}
        className="hidden lg:flex fixed bottom-6 right-16 p-3 rounded-full shadow-lg transition-all hover:scale-105"
        style={{ backgroundColor: currentTheme.colors.primary, color: currentTheme.type === 'dark' ? '#000' : '#fff' }}
      >
        <ArrowDown className="w-5 h-5" />
      </button>
    </div>
  );
};

export default BurnoutEngineReport;
