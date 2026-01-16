/**
 * APEXLABS - Ultimate Scan Report
 * Style Ultrahuman - Dashboard Ultimate avec analyse photo et biomecanique
 */

import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'wouter';
import { Sidebar } from '@/components/ultrahuman/Sidebar';
import { RadialProgress } from '@/components/ultrahuman/RadialProgress';
import { MetricsRadar, ProjectionChart } from '@/components/ultrahuman/Charts';
import { ULTRAHUMAN_THEMES } from '@/components/ultrahuman/themes';
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

const THEMES: Theme[] = ULTRAHUMAN_THEMES;

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
  ctaDebut?: string;
  ctaFin?: string;
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

const withAlpha = (hex: string, alpha: number): string => {
  const normalized = hex.replace('#', '');
  if (normalized.length !== 6) return hex;
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const parseCtaText = (text?: string) => {
  if (!text) {
    return { paragraphs: [] as string[], bullets: [] as string[], promoLine: "", bonusLine: "", emailLine: "", siteLine: "" };
  }
  const lines = text
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .filter(line => !/^[-=]{3,}$/.test(line))
    .filter(line => !/rapport genere/i.test(line));

  const promoLine = lines.find(line => /code promo/i.test(line)) || "";
  const bonusLine = lines.find(line => /bonus/i.test(line)) || "";
  const emailLine = lines.find(line => /^email\s*:/i.test(line)) || "";
  const siteLine = lines.find(line => /^site\s*:/i.test(line)) || "";

  const bullets = lines
    .filter(line => /^(\+|\-|\d+\.)\s+/.test(line))
    .map(line => line.replace(/^(\+|\-|\d+\.)\s+/, "").trim());

  const paragraphs = lines.filter(line => {
    if (/^(rappel coaching|rappel important|infos importantes|coaching apexlabs|prochaines etapes|pret a transformer ces insights)$/i.test(line)) return false;
    if (line === promoLine || line === bonusLine || line === emailLine || line === siteLine) return false;
    return !/^(\+|\-|\d+\.)\s+/.test(line);
  });

  return { paragraphs, bullets, promoLine, bonusLine, emailLine, siteLine };
};

const SECTION_ICON_BY_ID: Record<string, React.ElementType> = {
  'executive-summary': Target,
  'analyse-visuelle-et-posturale-complete': Bone,
  'analyse-biomecanique-et-sangle-profonde': Bone,
  'analyse-entrainement-et-periodisation': Dumbbell,
  'analyse-systeme-cardiovasculaire': HeartPulse,
  'analyse-metabolisme-et-nutrition': Flame,
  'analyse-sommeil-et-recuperation': Moon,
  'analyse-digestion-et-microbiote': Activity,
  'analyse-axes-hormonaux': Brain,
  'protocole-matin-anti-cortisol': Sun,
  'protocole-soir-verrouillage-sommeil': Moon,
  'protocole-digestion-14-jours': Flame,
  'protocole-bureau-anti-sedentarite': Activity,
  'protocole-entrainement-personnalise': Dumbbell,
  'plan-semaine-par-semaine-30-60-90': Calendar,
  'kpi-et-tableau-de-bord': Target,
  'stack-supplements-optimise': Pill,
  'synthese-et-prochaines-etapes': Target
};

const resolveSectionIcon = (section: NarrativeSection): React.ElementType => {
  const byId = SECTION_ICON_BY_ID[section.id];
  if (byId) return byId;
  const title = section.title.toLowerCase();
  if (title.includes('postur') || title.includes('visuelle')) return Bone;
  if (title.includes('biomecanique') || title.includes('mobilite')) return Bone;
  if (title.includes('entrainement')) return Dumbbell;
  if (title.includes('cardio')) return HeartPulse;
  if (title.includes('metabolisme') || title.includes('nutrition')) return Flame;
  if (title.includes('sommeil')) return Moon;
  if (title.includes('digestion')) return Activity;
  if (title.includes('hormon')) return Brain;
  return Activity;
};

const isAnalysisSection = (section: NarrativeSection): boolean => /analyse/i.test(section.title);

const getScoreStatus = (value: number, theme: Theme) => {
  const base = {
    backgroundColor: withAlpha(theme.colors.primary, 0.12),
    color: theme.colors.primary,
    borderColor: withAlpha(theme.colors.primary, 0.35)
  };
  if (value >= 80) return { label: 'EXCELLENT', style: base };
  if (value >= 65) return { label: 'BON', style: base };
  if (value >= 50) return { label: 'MOYEN', style: base };
  return { label: 'CRITIQUE', style: base };
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
  const [clientName, setClientName] = useState<string>('Profil');
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
        setClientName(auditData.email?.split('@')[0] || 'Profil');
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
    root.style.setProperty('--color-on-primary', currentTheme.type === 'dark' ? '#000' : '#fff');
    root.style.setProperty('--text', currentTheme.colors.text);
    root.style.setProperty('--text-secondary', currentTheme.colors.textMuted);
    root.style.setProperty('--text-muted', currentTheme.colors.textMuted);
    root.style.setProperty('--surface-1', currentTheme.colors.surface);
    root.style.setProperty('--surface-2', currentTheme.colors.background);
    root.style.setProperty('--border', currentTheme.colors.border);
    root.style.setProperty('--primary', currentTheme.colors.primary);
    root.style.setProperty('--accent-ok', currentTheme.colors.primary);
    root.style.setProperty('--accent-warning', currentTheme.colors.primary);
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

  const primary = currentTheme.colors.primary;
  const primarySoft = withAlpha(primary, 0.12);
  const primaryBorder = withAlpha(primary, 0.35);

  // Sidebar sections
  const sidebarSections: SectionContent[] = report?.sections.map(s => ({
    id: s.id,
    title: s.title,
    subtitle: `Score: ${s.score}%`,
    content: s.introduction
  })) || [];

  const renderCtaPanel = (text: string, badgeLabel: string, variant: 'debut' | 'fin') => {
    const { paragraphs, bullets, promoLine, bonusLine, emailLine, siteLine } = parseCtaText(text);
    const contactEmail = emailLine.replace(/^email\s*:\s*/i, "") || "coaching@achzodcoaching.com";
    const contactSite = siteLine.replace(/^site\s*:\s*/i, "") || "achzodcoaching.com";
    const promoCode = promoLine.match(/[A-Z0-9_-]{6,}/i)?.[0] || "";
    const summary = paragraphs.join(" ").replace(/\s+/g, " ").trim();
    const summaryTrimmed = summary.length > 360 ? `${summary.slice(0, 360).trim()}...` : summary;
    const isDebut = variant === 'debut';
    const siteUrl = contactSite.startsWith("http") ? contactSite : `https://${contactSite}`;
    const headline = isDebut ? "Rappel coaching" : "Execution accompagnee";
    const subline = isDebut ? "Deduction 100% du scan" : "Suivi humain + ajustements";
    const fallbackBullets = isDebut
      ? [
          "Deduction 100% du scan si coaching",
          "Ajustements hebdo personnalises",
          "Acces direct pour accelerer les decisions",
        ]
      : [
          "Pilotage des KPIs et corrections",
          "Protocoles adaptes a ton quotidien",
          "Suivi humain, pas un plan generique",
        ];
    const bulletsToRender = bullets.length > 0 ? bullets.slice(0, 6) : fallbackBullets;

    return (
      <div
        className="rounded-xl border p-6 md:p-8"
        style={{
          background: `linear-gradient(135deg, ${primary}12 0%, ${currentTheme.colors.surface} 100%)`,
          borderColor: primaryBorder
        }}
      >
        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <span
                className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full"
                style={{ backgroundColor: primarySoft, color: primary, border: `1px solid ${primaryBorder}` }}
              >
                {badgeLabel}
              </span>
              <span className="text-xs uppercase tracking-widest" style={{ color: currentTheme.colors.textMuted }}>
                {subline}
              </span>
            </div>
            <h4 className="text-2xl font-bold" style={{ color: currentTheme.colors.text }}>
              {headline}
            </h4>
            {summaryTrimmed && (
              <p className="text-sm leading-relaxed" style={{ color: currentTheme.colors.textMuted }}>
                {summaryTrimmed}
              </p>
            )}
          </div>
          {promoCode && (
            <span className="text-xs font-mono px-2 py-1 rounded" style={{ color: primary, border: `1px solid ${primaryBorder}` }}>
              {promoCode}
            </span>
          )}
        </div>

        <div className="grid gap-6 md:grid-cols-[1.4fr_1fr]">
          <div className="space-y-4">
            <div className="p-4 rounded-lg border" style={{ borderColor: primaryBorder, backgroundColor: primarySoft }}>
              <p className="text-[10px] uppercase tracking-widest mb-2" style={{ color: primary }}>
                Ce que tu obtiens
              </p>
              <ul className="space-y-2">
                {bulletsToRender.map((bullet, idx) => (
                  <li key={idx} className="text-sm" style={{ color: currentTheme.colors.text }}>
                    {bullet}
                  </li>
                ))}
              </ul>
            </div>

            {(bonusLine || promoLine) && (
              <div className="p-4 rounded-lg border" style={{ borderColor: currentTheme.colors.border, backgroundColor: primaryFaint }}>
                {bonusLine && (
                  <p className="text-xs uppercase tracking-widest mb-1" style={{ color: primary }}>
                    {bonusLine}
                  </p>
                )}
                {promoLine && (
                  <p className="text-xs" style={{ color: currentTheme.colors.textMuted }}>
                    {promoLine}
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="p-4 rounded-lg border" style={{ backgroundColor: currentTheme.colors.surface, borderColor: currentTheme.colors.border }}>
              <p className="text-[10px] uppercase tracking-widest mb-2" style={{ color: currentTheme.colors.textMuted }}>
                Contact direct
              </p>
              <p className="text-sm font-medium" style={{ color: currentTheme.colors.text }}>
                {contactEmail}
              </p>
              <p className="text-sm" style={{ color: currentTheme.colors.textMuted }}>
                {contactSite}
              </p>
            </div>

            <div className="grid gap-3">
              <a
                href={`mailto:${contactEmail}`}
                className="px-4 py-3 rounded-lg text-center text-sm font-semibold transition-all"
                style={{ backgroundColor: primary, color: 'var(--color-on-primary)' }}
              >
                Ecrire a Achzod
              </a>
              <a
                href={siteUrl}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-3 rounded-lg text-center text-sm font-semibold transition-all"
                style={{ border: `1px solid ${primary}`, color: primary }}
              >
                Voir le coaching
              </a>
            </div>
          </div>
        </div>

        <div className="mt-6 p-4 rounded-lg" style={{ backgroundColor: primaryFaint, border: `1px solid ${primaryBorder}` }}>
          <p className="text-sm font-semibold" style={{ color: primary }}>
            Deduction 100% du scan sur le coaching
          </p>
          <p className="text-xs mt-1" style={{ color: currentTheme.colors.textMuted }}>
            Le montant de ton Ultimate Scan est deduit si tu passes sur un suivi.
          </p>
        </div>
      </div>
    );
  };

  const allSections: SectionContent[] = [
    { id: 'dashboard', title: 'Dashboard', subtitle: 'Vue globale', content: '' },
    ...(report?.ctaDebut ? [{ id: 'cta-debut', title: 'Rappel Coaching', subtitle: 'Important', content: '' }] : []),
    { id: 'photo-analysis', title: 'Analyse Photo', subtitle: 'Visuelle', content: '' },
    ...sidebarSections,
    { id: 'supplements', title: 'Stack Supplements', subtitle: 'Protocole', content: '' },
    { id: 'plan', title: 'Plan 12 Semaines', subtitle: 'Action', content: '' },
    ...(report?.ctaFin ? [{ id: 'cta-fin', title: 'Coaching', subtitle: 'Prochaine etape', content: '' }] : []),
    { id: 'review', title: 'Votre Avis', subtitle: 'Feedback', content: '' }
  ];

  const RADAR_LABELS: Record<string, string> = {
    'analyse-visuelle-et-posturale-complete': 'Posture',
    'analyse-biomecanique-et-sangle-profonde': 'Biomeca',
    'analyse-entrainement-et-periodisation': 'Entrainement',
    'analyse-systeme-cardiovasculaire': 'Cardio',
    'analyse-metabolisme-et-nutrition': 'Metabolisme',
    'analyse-sommeil-et-recuperation': 'Sommeil',
    'analyse-digestion-et-microbiote': 'Digestion',
    'analyse-axes-hormonaux': 'Hormones',
    'analyse-energie-et-recuperation': 'Energie'
  };

  const shortLabelFromTitle = (title: string, fallback: string) => {
    const cleaned = title
      .replace(/^analyse\s+/i, "")
      .replace(/^protocole\s+/i, "")
      .replace(/^plan\s+/i, "")
      .replace(/^synthese\s+/i, "")
      .replace(/^kpi\s+et\s+tableau\s+de\s+bord\s*/i, "KPI ")
      .trim();
    const words = cleaned.split(/\s+/);
    return words.length > 1 ? words.slice(0, 2).join(" ") : fallback;
  };

  const analysisSections = report?.sections.filter(isAnalysisSection) || [];
  const radarSections = (analysisSections.length > 0 ? analysisSections : report?.sections || []).slice(0, 8);
  const resolveRadarLabel = (section: NarrativeSection) => {
    const byId = RADAR_LABELS[section.id];
    if (byId) return byId;
    const title = section.title
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    if (title.includes("entrainement")) return "Entrainement";
    if (title.includes("cardio") || title.includes("cardiovasculaire") || title.includes("hrv")) return "Cardio";
    if (title.includes("metabolisme") || title.includes("nutrition")) return "Metabolisme";
    if (title.includes("sommeil")) return "Sommeil";
    if (title.includes("digestion")) return "Digestion";
    if (title.includes("hormon")) return "Hormones";
    if (title.includes("postur") || title.includes("biomecanique")) return "Posture";
    if (title.includes("energie")) return "Energie";
    return shortLabelFromTitle(section.title, section.title);
  };
  const metricsData: Metric[] = radarSections.map(s => {
    const safeScore = s.score > 0 ? s.score : globalScore;
    return {
      label: resolveRadarLabel(s),
      value: Math.round((safeScore / 10) * 10) / 10,
      max: 10,
      description: s.title,
      key: s.id
    };
  });

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
    if (!auditId || reviewRating === 0 || reviewComment.length < 10 || !reviewEmail) {
      setReviewError('Veuillez remplir tous les champs (commentaire 10 caracteres minimum)');
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
          auditType: 'ULTIMATE_SCAN',
          rating: reviewRating,
          comment: reviewComment
        })
      });

      const data = await response.json();
      if (data.success) {
        setReviewSubmitted(true);
      } else {
        const detailMessages = Array.isArray(data.details)
          ? data.details.map((detail: { message?: string }) => detail.message).filter(Boolean).join(" ")
          : "";
        setReviewError(detailMessages || data.error || 'Erreur');
      }
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
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" style={{ color: currentTheme.colors.primary }} />
          <p className="text-white/70">Chargement du rapport Ultimate...</p>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <AlertCircle className="w-16 h-16 mx-auto mb-4" style={{ color: currentTheme.colors.primary }} />
          <h2 className="text-xl font-bold text-white mb-2">{error || 'Rapport non disponible'}</h2>
          <Link href="/dashboard">
            <button
              className="px-6 py-3 font-bold rounded-lg transition mt-6"
              style={{ backgroundColor: currentTheme.colors.primary, color: currentTheme.type === 'dark' ? '#000' : '#fff' }}
            >
              Retour au dashboard
            </button>
          </Link>
        </div>
      </div>
    );
  }

  const globalScore = report.global;

  return (
    <div className="ultrahuman-report min-h-screen flex" style={{ backgroundColor: currentTheme.colors.background, color: currentTheme.colors.text }}>
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
            <div
              className="flex items-center gap-2 px-3 py-1.5 rounded-full border"
              style={{ backgroundColor: primarySoft, borderColor: primaryBorder }}
            >
              <Zap size={14} style={{ color: primary }} />
              <span className="text-xs font-bold tracking-wider" style={{ color: primary }}>ULTIMATE SCAN</span>
            </div>
            <span className="text-xs text-[var(--color-text-muted)]">{report.sections.length} sections + Photo Analysis</span>
          </div>

          {report.ctaDebut && (
            <section id="cta-debut" className="mb-12">
              <h3 className="text-lg font-bold mb-4" style={{ color: primary }}>Rappel Coaching</h3>
              {renderCtaPanel(report.ctaDebut, "Rappel", "debut")}
            </section>
          )}

          {/* Dashboard */}
          <section id="dashboard" className="mb-16">
            <div className="grid lg:grid-cols-2 gap-8 mb-12">
              <div className="flex flex-col items-center justify-center p-8 rounded-sm border" style={{ backgroundColor: currentTheme.colors.surface, borderColor: currentTheme.colors.border }}>
                <RadialProgress score={globalScore} max={100} subLabel="SCORE GLOBAL" size={200} strokeWidth={6} color={currentTheme.colors.primary} />
                <div className="mt-4 text-center">
                  {(() => {
                    const status = getScoreStatus(globalScore, currentTheme);
                    return (
                      <span className="inline-block px-3 py-1 rounded-full text-xs font-bold border" style={status.style}>
                        {status.label}
                      </span>
                    );
                  })()}
                </div>
              </div>

              <div className="p-6 rounded-sm border" style={{ backgroundColor: currentTheme.colors.surface, borderColor: currentTheme.colors.border }}>
                <h3 className="text-sm font-bold mb-4 uppercase tracking-wider text-[var(--color-text-muted)]">Radar Performance</h3>
                <MetricsRadar
                  data={metricsData}
                  color={currentTheme.colors.primary}
                  gridColor={currentTheme.colors.grid}
                  labelColor={currentTheme.colors.textMuted}
                  tooltipBg={currentTheme.colors.surface}
                  tooltipBorder={currentTheme.colors.border}
                  tooltipText={currentTheme.colors.text}
                />
              </div>
            </div>

            {/* Executive Summary */}
            <div className="p-6 rounded-sm border mb-8" style={{ backgroundColor: currentTheme.colors.surface, borderColor: currentTheme.colors.border }}>
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Target size={20} style={{ color: primary }} />
                Synthese Executive Ultimate
              </h3>
              <div className={`prose max-w-none ${currentTheme.type === 'dark' ? 'prose-invert' : ''}`}>
                {report.heroSummary.split('\n').map((para, i) => (
                  para.trim() && <p key={i} className="text-[var(--color-text-muted)] leading-relaxed mb-3">{para}</p>
                ))}
              </div>
            </div>

            {/* Strengths & Weaknesses */}
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <div className="p-6 rounded-sm border" style={{ borderColor: primaryBorder, backgroundColor: primarySoft }}>
                <h4 className="text-sm font-bold mb-4 flex items-center gap-2" style={{ color: primary }}>
                  <TrendingUp size={16} /> Points Forts
                </h4>
                <div className="space-y-2">
                  {report.sections.filter(s => s.score >= 70).slice(0, 3).map(s => (
                    <div key={s.id} className="flex items-center justify-between p-2 rounded" style={{ backgroundColor: primarySoft }}>
                      <span className="text-sm">{s.title}</span>
                      <span className="text-xs font-bold" style={{ color: primary }}>{s.score}%</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-6 rounded-sm border" style={{ borderColor: primaryBorder, backgroundColor: primarySoft }}>
                <h4 className="text-sm font-bold mb-4 flex items-center gap-2" style={{ color: primary }}>
                  <TrendingDown size={16} /> Axes d'Optimisation
                </h4>
                <div className="space-y-2">
                  {report.sections.filter(s => s.score < 60).slice(0, 3).map(s => (
                    <div key={s.id} className="flex items-center justify-between p-2 rounded" style={{ backgroundColor: primarySoft }}>
                      <span className="text-sm">{s.title}</span>
                      <span className="text-xs font-bold" style={{ color: primary }}>{s.score}%</span>
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
                  {(() => {
                    const status = getScoreStatus(report.photoAnalysis.score, currentTheme);
                    return (
                      <span className="px-3 py-1 rounded-full text-xs font-bold border" style={status.style}>
                        {report.photoAnalysis.score}%
                      </span>
                    );
                  })()}
                </div>

                <div className="space-y-6">
                  <div>
                    <h4 className="text-sm font-bold text-[var(--color-text-muted)] mb-2">SYNTHESE</h4>
                    <p className="text-[var(--color-text)] leading-relaxed">{report.photoAnalysis.summary}</p>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="p-4 rounded bg-[var(--color-bg)]">
                      <h4 className="text-sm font-bold mb-2" style={{ color: primary }}>Analyse Posturale</h4>
                      <p className="text-sm text-[var(--color-text-muted)]">{report.photoAnalysis.postureAnalysis}</p>
                    </div>
                    <div className="p-4 rounded bg-[var(--color-bg)]">
                      <h4 className="text-sm font-bold mb-2" style={{ color: primary }}>Analyse Musculaire</h4>
                      <p className="text-sm text-[var(--color-text-muted)]">{report.photoAnalysis.muscularAnalysis}</p>
                    </div>
                    <div className="p-4 rounded bg-[var(--color-bg)]">
                      <h4 className="text-sm font-bold mb-2" style={{ color: primary }}>Analyse Adiposite</h4>
                      <p className="text-sm text-[var(--color-text-muted)]">{report.photoAnalysis.fatAnalysis}</p>
                    </div>
                    <div className="p-4 rounded bg-[var(--color-bg)]">
                      <h4 className="text-sm font-bold mb-2" style={{ color: primary }}>Recommandations</h4>
                      <p className="text-sm text-[var(--color-text-muted)]">{report.photoAnalysis.recommendations}</p>
                    </div>
                  </div>

                  {report.photoAnalysis.correctiveProtocol && (
                    <div className="p-4 rounded border" style={{ borderColor: primaryBorder, backgroundColor: primarySoft }}>
                      <h4 className="text-sm font-bold mb-2" style={{ color: primary }}>PROTOCOLE CORRECTIF</h4>
                      <p className="text-[var(--color-text)] leading-relaxed">{report.photoAnalysis.correctiveProtocol}</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-6 rounded-sm border" style={{ borderColor: primaryBorder, backgroundColor: primarySoft }}>
                <div className="flex items-start gap-3">
                  <AlertTriangle className="shrink-0 mt-1" size={20} style={{ color: primary }} />
                  <div>
                    <p className="font-bold" style={{ color: primary }}>Photos non disponibles</p>
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
            const Icon = resolveSectionIcon(section);
            const status = getScoreStatus(section.score, currentTheme);

            return (
              <section key={section.id} id={section.id} className="mb-12 scroll-mt-24">
                <div className="flex items-center gap-4 mb-6">
                  <span
                    className="text-5xl font-bold"
                    style={{ color: withAlpha(currentTheme.colors.textMuted, 0.2) }}
                  >
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <Icon size={20} style={{ color: currentTheme.colors.primary }} />
                      <h2 className="text-xl font-bold">{section.title}</h2>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="px-2 py-0.5 rounded text-xs font-bold border" style={status.style}>{section.score}%</span>
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
                    <div className="p-4 rounded border" style={{ backgroundColor: primarySoft, borderColor: primaryBorder }}>
                      <h4 className="text-sm font-bold mb-2" style={{ color: primary }}>CE QUI NE VA PAS</h4>
                      <p className="text-[var(--color-text-muted)] leading-relaxed whitespace-pre-line">{section.whatIsWrong}</p>
                    </div>
                  )}

                  {section.recommendations && (
                    <div className="p-4 rounded border" style={{ backgroundColor: primarySoft, borderColor: primaryBorder }}>
                      <h4 className="text-sm font-bold mb-2" style={{ color: primary }}>RECOMMANDATIONS</h4>
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
                    <div className="p-4 rounded border" style={{ backgroundColor: primarySoft, borderColor: primaryBorder }}>
                      <h4 className="text-sm font-bold mb-2" style={{ color: primary }}>SCIENCE DEEP DIVE</h4>
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
              <h2 className="text-xl font-bold">Stack Supplements Ultimate</h2>
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
              <h2 className="text-xl font-bold">Plan d'Action Ultimate 12 Semaines</h2>
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
              <h3 className="text-lg font-bold mb-4">Conclusion Ultimate</h3>
              <p className="text-[var(--color-text)] leading-relaxed">{report.conclusion}</p>
              <div className="mt-4 flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
                <Zap size={16} style={{ color: primary }} />
                <span>Analyse realisee par <strong>ACHZOD</strong> - Expert Metabolisme</span>
              </div>
            </section>
          )}

          {report.ctaFin && (
            <section id="cta-fin" className="mb-12">
              <h3 className="text-lg font-bold mb-4" style={{ color: primary }}>Coaching Personnalise</h3>
              {renderCtaPanel(report.ctaFin, "Execution", "fin")}
            </section>
          )}

          {/* Review */}
          <section id="review" className="mb-12 scroll-mt-24">
            <div className="p-6 rounded-sm border" style={{ backgroundColor: currentTheme.colors.surface, borderColor: currentTheme.colors.border }}>
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Star size={20} style={{ color: currentTheme.colors.primary }} />
                Ton Avis Ultimate
              </h3>

              {reviewSubmitted ? (
                <div className="flex items-center gap-3 p-4 rounded border" style={{ backgroundColor: primarySoft, borderColor: primaryBorder }}>
                  <CheckCircle2 size={24} style={{ color: primary }} />
                  <div>
                    <p className="font-bold" style={{ color: primary }}>Merci pour ton avis Ultimate !</p>
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
                          <Star
                            size={32}
                            className={star <= reviewRating ? 'fill-current' : ''}
                            style={star <= reviewRating ? { color: primary } : { color: withAlpha(currentTheme.colors.textMuted, 0.3) }}
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Commentaire</label>
                    <textarea
                      value={reviewComment}
                      onChange={e => setReviewComment(e.target.value)}
                      placeholder="Qu'as-tu pense de ton rapport Ultimate ?"
                      className="w-full p-3 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text)] placeholder-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-primary)]"
                      rows={3}
                    />
                    <p className="text-xs text-[var(--color-text-muted)] mt-1">
                      {reviewComment.length}/10 caracteres minimum
                    </p>
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
                  Accompagnement Ultimate
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
