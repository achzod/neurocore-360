/**
 * APEXLABS - Anabolic Bioscan Report
 * Style Ultrahuman - Dashboard Anabolic avec sections detaillees
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, Link } from 'wouter';
import { Sidebar } from '@/components/ultrahuman/Sidebar';
import { RadialProgress } from '@/components/ultrahuman/RadialProgress';
import { MetricsRadar, ProjectionChart } from '@/components/ultrahuman/Charts';
import { ULTRAHUMAN_THEMES } from '@/components/ultrahuman/themes';
import { Theme, SectionContent, Metric } from '@/components/ultrahuman/types';
import { COACHING_OFFER_TIERS, formatEuro, getDeductionAmount } from '@/components/ultrahuman/coachingOffers';
import { ReportErrorBoundary } from '@/components/ultrahuman/ReportErrorBoundary';
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
  Crown
} from 'lucide-react';

const THEMES: Theme[] = ULTRAHUMAN_THEMES;

const formatName = (value?: string) => {
  if (!value) return "Profil";
  return value
    .trim()
    .split(/\s+/)
    .map(part => (part ? part[0].toUpperCase() + part.slice(1).toLowerCase() : part))
    .join(" ");
};

const METRIC_ICONS: Record<string, React.ElementType> = {
  sommeil: Moon,
  stress: Brain,
  energie: Zap,
  digestion: Flame,
  training: Dumbbell,
  nutrition: Apple,
  lifestyle: Sun,
  mindset: Lightbulb,
  entrainement: Dumbbell,
  cardio: Heart,
  metabolisme: Flame,
  hormones: Brain,
};

const getMetricStatus = (value: number) => {
  if (value >= 8) return { label: 'FORT', color: 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]' };
  if (value >= 6) return { label: 'MOYEN', color: 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]' };
  if (value >= 4) return { label: 'FAIBLE', color: 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]' };
  return { label: 'CRITIQUE', color: 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]' };
};

const hasHtml = (value: string) => /<\s*[a-z][\s\S]*>/i.test(value);

const withAlpha = (hex: string, alpha: number): string => {
  const normalized = hex.replace('#', '');
  if (normalized.length !== 6) return hex;
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const normalizeTextInput = (value?: unknown): string => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    return value.map(item => normalizeTextInput(item)).filter(Boolean).join("\n\n");
  }
  if (typeof value === "object") {
    return Object.values(value as Record<string, unknown>)
      .map(item => normalizeTextInput(item))
      .filter(Boolean)
      .join("\n\n");
  }
  return String(value);
};

const parseCtaText = (text?: string) => {
  const safeText = normalizeTextInput(text);
  if (!safeText) {
    return { paragraphs: [] as string[], bullets: [] as string[], promoLine: "", bonusLine: "", emailLine: "", siteLine: "" };
  }
  const lines = safeText
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .filter(line => !/^[-=]{3,}$/.test(line))
    .filter(line => !/rapport genere/i.test(line))
    .filter(line => !/^tu\s+as\s+les\s+cl(?:e|\u00e9)s/i.test(line))
    .filter(line => !/^prochaines?\s+etapes?/i.test(line));

  const promoLine = lines.find(line => /code promo/i.test(line)) || "";
  const bonusLine = lines.find(line => /bonus/i.test(line)) || "";
  const emailLine = lines.find(line => /^email\s*:/i.test(line)) || "";
  const siteLine = lines.find(line => /^site\s*:/i.test(line)) || "";

  const bullets = lines
    .filter(line => /^(\+|\-|\d+\.)\s+/.test(line))
    .map(line => line.replace(/^(\+|\-|\d+\.)\s+/, "").trim());

  const paragraphs = lines.filter(line => {
    if (/^(rappel coaching|rappel important|infos importantes|coaching apexlabs|prochaines etapes|pret a transformer ces insights)$/i.test(line)) return false;
    if (/^tu\s+as\s+les\s+cl(?:e|\u00e9)s/i.test(line)) return false;
    if (/^prochaines?\s+etapes?/i.test(line)) return false;
    if (/^(formules?\s+disponibles|mes\s+formules)$/i.test(line)) return false;
    if (line === promoLine || line === bonusLine || line === emailLine || line === siteLine) return false;
    return !/^(\+|\-|\d+\.)\s+/.test(line);
  });

  return { paragraphs, bullets, promoLine, bonusLine, emailLine, siteLine };
};

// Narrative Report types from API
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

interface NarrativeReport {
  global: number;
  heroSummary: string;
  executiveNarrative: string;
  globalDiagnosis: string;
  sections: NarrativeSection[];
  prioritySections: string[];
  strengthSections: string[];
  radarMetrics?: Metric[];
  supplementStack: SupplementProtocol[];
  supplementsHtml?: string;
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
  auditType: 'GRATUIT' | 'PREMIUM' | 'ELITE' | 'DISCOVERY' | 'ANABOLIC_BIOSCAN' | 'ULTIMATE_SCAN' | 'BLOOD_ANALYSIS' | 'PEPTIDES';
}

const isAnalysisSection = (section: NarrativeSection): boolean => /analyse/i.test(section.title);

const AnabolicScanReport: React.FC = () => {
  const { auditId } = useParams();
  const [report, setReport] = useState<NarrativeReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<string>('dashboard');
  const [currentTheme, setCurrentTheme] = useState<Theme>(THEMES[0]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [clientName, setClientName] = useState<string>('Profil');
  const [generationStatus, setGenerationStatus] = useState<string>("");
  const [generationProgress, setGenerationProgress] = useState<number>(0);
  const [generationSection, setGenerationSection] = useState<string>("");
  const pollTimer = useRef<number | null>(null);
  const mainContentRef = useRef<HTMLDivElement>(null);

  // Review form state
  const [reviewRating, setReviewRating] = useState<number>(0);
  const [reviewComment, setReviewComment] = useState<string>('');
  const [reviewEmail, setReviewEmail] = useState<string>('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  // Fetch report data
  useEffect(() => {
    let cancelled = false;

    const loadNarrativeReport = async () => {
      const reportRes = await fetch(`/api/audits/${auditId}/narrative`);
      if (!reportRes.ok) {
        throw new Error('Erreur chargement rapport');
      }
      const reportData = await reportRes.json();
      if (reportData.error || reportData.message) {
        throw new Error(reportData.error || reportData.message);
      }
      setReport(reportData);
      if (reportData.sections?.length > 0) {
        setActiveSection(reportData.sections[0].id);
      }
    };

    const pollNarrativeStatus = async (attempt: number = 0) => {
      if (cancelled) return;
      try {
        const statusRes = await fetch(`/api/audits/${auditId}/narrative-status`);
        const statusData = await statusRes.json();
        setGenerationStatus(statusData.status || "");
        setGenerationProgress(statusData.progress ?? 0);
        setGenerationSection(statusData.currentSection || "");

        if (statusData.status === "completed") {
          await loadNarrativeReport();
          setLoading(false);
          return;
        }
        if (statusData.status === "failed") {
          setError(statusData.error || "Generation echouee. Reessaie dans quelques minutes.");
          setLoading(false);
          return;
        }
      } catch (err) {
        setError('Erreur de connexion');
        setLoading(false);
        return;
      }

      if (attempt < 120) {
        pollTimer.current = window.setTimeout(() => pollNarrativeStatus(attempt + 1), 5000);
      } else {
        setError('Generation trop longue. Reviens plus tard.');
        setLoading(false);
      }
    };

    const fetchReport = async () => {
      if (!auditId) {
        setError('ID audit manquant');
        setLoading(false);
        return;
      }

      try {
        // First get audit info
        const auditRes = await fetch(`/api/audits/${auditId}`);
        if (!auditRes.ok) {
          setError('Audit non trouve');
          setLoading(false);
          return;
        }
        const auditData = await auditRes.json();
        const nameFromResponses = auditData.responses?.prenom;
        setClientName(formatName(nameFromResponses || auditData.email?.split('@')[0] || 'Profil'));
        setReviewEmail(auditData.email || '');

        // Check if report is ready
        if (auditData.reportDeliveryStatus !== 'READY' && auditData.reportDeliveryStatus !== 'SENT') {
          setGenerationStatus("generating");
          setGenerationProgress(0);
          setGenerationSection("Initialisation...");
          await fetch(`/api/audits/${auditId}/generate-narrative`, { method: 'POST' });
          await pollNarrativeStatus(0);
          return;
        }

        // Get narrative report
        await loadNarrativeReport();
        setLoading(false);
      } catch (err) {
        setError('Erreur de connexion');
        setLoading(false);
      }
    };

    setLoading(true);
    setError(null);
    fetchReport();

    return () => {
      cancelled = true;
      if (pollTimer.current) {
        clearTimeout(pollTimer.current);
      }
    };
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

  const toHtml = (value: unknown) => {
    const safeValue = normalizeTextInput(value);
    if (!safeValue) return "";
    if (hasHtml(safeValue)) return safeValue;
    return safeValue
      .split(/\n\s*\n/)
      .map(p => p.trim())
      .filter(Boolean)
      .map(p => `<p>${p}</p>`)
      .join("");
  };

  const buildSectionHtml = (section: NarrativeSection) => {
    const intro = normalizeTextInput(section.introduction).trim();
    const blocks = [
      { label: "Analyse", text: intro },
      { label: "Ce qui bloque", text: normalizeTextInput(section.whatIsWrong) },
      { label: "Analyse personnalisee", text: normalizeTextInput(section.personalizedAnalysis) },
      { label: "Recommandations", text: normalizeTextInput(section.recommendations) },
      { label: "Plan d'action", text: normalizeTextInput(section.actionPlan) },
      { label: "Science", text: normalizeTextInput(section.scienceDeepDive) },
    ].filter((block) => block.text && block.text.trim().length > 0);

    if (intro && hasHtml(intro) && blocks.length === 1) {
      return intro;
    }

    return blocks
      .map((block) => `<h4>${block.label}</h4>${toHtml(block.text || "")}`)
      .join("");
  };

  const safeSections = Array.isArray(report?.sections) ? report.sections : [];
  const safeSupplementStack = Array.isArray(report?.supplementStack) ? report.supplementStack : [];
  const safeRadarMetrics = Array.isArray(report?.radarMetrics) ? report.radarMetrics : [];

  const navigationSections = useMemo<SectionContent[]>(() => {
    if (!report) return [];
    const narrativeSections: SectionContent[] = safeSections.map((section) => {
      const scoreLabel = section.score > 0 ? `Score ${Math.round(section.score)}%` : section.level ? section.level.toUpperCase() : "";
      return {
        id: section.id,
        title: section.title,
        subtitle: scoreLabel,
        content: buildSectionHtml(section),
      };
    });

    const hasSupplements = Boolean(report.supplementsHtml || safeSupplementStack.length > 0);
    const hasPlan = Boolean(report.weeklyPlan?.week1 || report.weeklyPlan?.week2 || report.weeklyPlan?.weeks3_4 || report.weeklyPlan?.months2_3);
    const showUpgrade = report.auditType === 'ANABOLIC_BIOSCAN';

    return [
      { id: 'dashboard', title: 'Dashboard', subtitle: 'Vue globale', content: '' },
      ...(report.ctaDebut ? [{ id: 'cta-debut', title: 'Rappel Coaching', subtitle: 'Important', content: '' }] : []),
      ...narrativeSections,
      ...(hasSupplements ? [{ id: 'supplements', title: 'Stack Supplements', subtitle: 'Protocole', content: '' }] : []),
      ...(hasPlan ? [{ id: 'plan', title: "Plan 12 Semaines", subtitle: 'Action', content: '' }] : []),
      ...(report.ctaFin ? [{ id: 'cta-fin', title: 'Coaching', subtitle: 'Prochaine etape', content: '' }] : []),
      ...(showUpgrade ? [{ id: 'upgrade', title: 'Ultimate Scan', subtitle: 'Upgrade', content: '' }] : []),
      { id: 'review', title: 'Ton Avis', subtitle: 'Feedback', content: '' },
    ];
  }, [report]);

  // Scroll handling
  useEffect(() => {
    const handleScroll = () => {
      if (!mainContentRef.current || navigationSections.length === 0) return;
      const container = mainContentRef.current;
      const totalScroll = container.scrollTop;
      const windowHeight = container.clientHeight;
      const totalHeight = container.scrollHeight - windowHeight;
      const progress = totalHeight > 0 ? (totalScroll / totalHeight) * 100 : 0;
      setScrollProgress(progress);

      const headings = navigationSections.map(s => document.getElementById(s.id));
      const scrollPos = container.scrollTop + 300;
      for (let i = headings.length - 1; i >= 0; i--) {
        const heading = headings[i];
        if (heading && heading.offsetTop <= scrollPos) {
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

  useEffect(() => {
    if (navigationSections.length > 0) {
      setActiveSection(navigationSections[0].id);
    }
  }, [navigationSections]);

  const renderOffersTable = (deductionAmount: number) => {
    const hasDeduction = deductionAmount > 0;
    return (
      <div className="mt-6 rounded-xl border overflow-hidden" style={{ borderColor: currentTheme.colors.border }}>
        <div
          className="px-4 py-3 flex flex-wrap items-center justify-between gap-2"
          style={{ backgroundColor: primarySoft, borderBottom: `1px solid ${primaryBorder}` }}
        >
          <span className="text-xs font-bold uppercase tracking-widest" style={{ color: primary }}>
            Formules coaching
          </span>
          <span className="text-xs" style={{ color: currentTheme.colors.textMuted }}>
            {hasDeduction
              ? `Deduction appliquee : -${formatEuro(deductionAmount)}`
              : "Aucune deduction appliquee sur ce rapport"}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ color: currentTheme.colors.textMuted }}>
                <th className="text-left font-semibold px-4 py-3">Offre</th>
                <th className="text-left font-semibold px-4 py-3">Duree</th>
                <th className="text-right font-semibold px-4 py-3">Prix standard</th>
                <th className="text-right font-semibold px-4 py-3">Prix apres deduction</th>
              </tr>
            </thead>
            <tbody>
              {COACHING_OFFER_TIERS.map((tier) => (
                <React.Fragment key={tier.id}>
                  <tr>
                    <td colSpan={4} className="px-4 pt-4 pb-2">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: currentTheme.colors.textMuted }}>
                          {tier.label}
                        </span>
                        <a
                          href={tier.href}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-semibold"
                          style={{ color: primary }}
                        >
                          Voir {tier.label}
                        </a>
                      </div>
                    </td>
                  </tr>
                  {tier.offers.map((offer, idx) => {
                    const after = Math.max(0, offer.price - deductionAmount);
                    return (
                      <tr key={`${tier.id}-${idx}`} style={{ borderBottom: `1px solid ${currentTheme.colors.border}` }}>
                        <td className="px-4 py-3">{tier.label}</td>
                        <td className="px-4 py-3">{offer.duration}</td>
                        <td className="px-4 py-3 text-right" style={{ color: currentTheme.colors.textMuted }}>
                          <span style={hasDeduction ? { textDecoration: "line-through" } : undefined}>
                            {formatEuro(offer.price)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold" style={{ color: primary }}>
                          {formatEuro(after)}
                        </td>
                      </tr>
                    );
                  })}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 text-xs" style={{ color: currentTheme.colors.textMuted }}>
          Le montant de ton scan est deduit a 100% sur chaque formule. Tu gardes la meme qualite de suivi, simplement moins cher.
        </div>
      </div>
    );
  };

  const renderCtaPanel = (text: string, badgeLabel: string, variant: 'debut' | 'fin') => {
    const { paragraphs, bullets, promoLine, emailLine, siteLine } = parseCtaText(text);
    const contactEmail = emailLine.replace(/^email\s*:\s*/i, "").trim() || "coaching@achzodcoaching.com";
    const contactSite = siteLine.replace(/^site\s*:\s*/i, "").trim() || "achzodcoaching.com";
    const promoCode = promoLine.match(/[A-Z0-9_-]{6,}/i)?.[0] || "";
    const summary = paragraphs.join(" ").replace(/\s+/g, " ").trim();
    const summaryTrimmed = summary.length > 380 ? `${summary.slice(0, 380).trim()}...` : summary;
    const siteUrl = contactSite.startsWith("http") ? contactSite : `https://${contactSite}`;
    const isDebut = variant === 'debut';
    const headline = isDebut ? "Rappel coaching" : "Passe a l'action";
    const subline = isDebut ? "Deduction 100% du scan" : "Execution + ajustements";
    const deductionAmount = getDeductionAmount(report?.auditType);
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

    if (!isDebut) {
      return (
        <div
          className="rounded-xl border p-6 md:p-8"
          style={{ backgroundColor: currentTheme.colors.surface, borderColor: currentTheme.colors.border }}
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-3 mb-2">
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
              <h4 className="text-2xl font-bold mb-2" style={{ color: currentTheme.colors.text }}>
                {headline}
              </h4>
              <p className="text-sm leading-relaxed" style={{ color: currentTheme.colors.textMuted }}>
                {summaryTrimmed || "Tu as la cartographie. Ce qui manque, c'est l'execution avec feedback et ajustements continus."}
              </p>
            </div>
            {promoCode && (
              <span className="text-xs font-mono px-2 py-1 rounded" style={{ color: primary, border: `1px solid ${primaryBorder}` }}>
                {promoCode}
              </span>
            )}
          </div>

          {renderOffersTable(deductionAmount)}

          <div
            className="mt-6 p-4 rounded-lg"
            style={{
              background: withAlpha(primary, 0.08),
              border: `1px solid ${primaryBorder}`
            }}
          >
            <p className="text-sm font-medium" style={{ color: primary }}>
              Deduction 100% du scan sur le coaching
            </p>
            <p className="text-xs mt-1" style={{ color: currentTheme.colors.textMuted }}>
              {promoCode ? `Code promo : ${promoCode}.` : "Code promo disponible apres validation."} Pour toute question, ecris-moi.
            </p>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-4 text-xs" style={{ color: currentTheme.colors.textMuted }}>
            <span>Email: <a href={`mailto:${contactEmail}`} className="font-semibold" style={{ color: currentTheme.colors.text }}>{contactEmail}</a></span>
            <span>Site: <a href={siteUrl} target="_blank" rel="noreferrer" className="font-semibold" style={{ color: currentTheme.colors.text }}>{contactSite}</a></span>
          </div>
        </div>
      );
    }

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

        <div className="grid sm:grid-cols-2 gap-3 mb-6">
          {bulletsToRender.map((bullet, idx) => (
            <div key={idx} className="flex items-start gap-2 text-sm" style={{ color: currentTheme.colors.textMuted }}>
              <span style={{ color: primary }}>-</span>
              <span>{bullet}</span>
            </div>
          ))}
        </div>

        {renderOffersTable(deductionAmount)}

        {bonusLine && (
          <div className="text-xs uppercase tracking-widest mb-4" style={{ color: primary }}>
            {bonusLine}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-4 text-xs" style={{ color: currentTheme.colors.textMuted }}>
          <span>Email: <a href={`mailto:${contactEmail}`} className="font-semibold" style={{ color: currentTheme.colors.text }}>{contactEmail}</a></span>
          <span>Site: <a href={siteUrl} target="_blank" rel="noreferrer" className="font-semibold" style={{ color: currentTheme.colors.text }}>{contactSite}</a></span>
        </div>
      </div>
    );
  };

  const displayName = formatName(clientName);
  const sectionScores = safeSections
    .map((section) => section.score)
    .filter((score): score is number => Number.isFinite(score));
  const derivedGlobalScore =
    sectionScores.length > 0
      ? Math.round(sectionScores.reduce((acc, score) => acc + score, 0) / sectionScores.length)
      : 0;
  const rawGlobalScore = Number.isFinite(report?.global) ? report.global : derivedGlobalScore;
  const globalScore =
    rawGlobalScore <= 10 && derivedGlobalScore >= 20 ? derivedGlobalScore : rawGlobalScore;
  const globalScore10 = Math.round((globalScore / 10) * 10) / 10;
  const primary = currentTheme.colors.primary;
  const primarySoft = withAlpha(primary, 0.12);
  const primaryBorder = withAlpha(primary, 0.25);

  const RADAR_LABELS: Record<string, string> = {
    'analyse-entrainement-et-periodisation': 'Entrainement',
    'analyse-systeme-cardiovasculaire': 'Cardio',
    'analyse-metabolisme-et-nutrition': 'Metabolisme',
    'analyse-sommeil-et-recuperation': 'Sommeil',
    'analyse-digestion-et-microbiote': 'Digestion',
    'analyse-axes-hormonaux': 'Hormones',
    'analyse-visuelle-et-posturale-complete': 'Posture',
    'analyse-biomecanique-et-sangle-profonde': 'Biomeca',
    'analyse-energie-et-recuperation': 'Energie',
    // Legacy ids (fallback)
    'profil-base': 'Profil',
    'composition-corporelle': 'Composition',
    'metabolisme-energie': 'Metabolisme',
    'nutrition-tracking': 'Nutrition',
    'digestion-microbiome': 'Digestion',
    'activite-performance': 'Entrainement',
    'sommeil-recuperation': 'Sommeil',
    'hrv-cardiaque': 'HRV',
    'cardio-endurance': 'Cardio',
    'analyses-biomarqueurs': 'Bio',
    'hormones-stress': 'Hormones',
    'lifestyle-substances': 'Style de vie',
    'biomecanique-mobilite': 'Mobilite',
    'psychologie-mental': 'Mental',
    'neurotransmetteurs': 'Neuro'
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

  const analysisSections = safeSections.filter(isAnalysisSection);
  const radarSections = (analysisSections.length > 0 ? analysisSections : safeSections).slice(0, 8);
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
  const reportRadar = safeRadarMetrics;
  const reportRadarLabels = reportRadar.map((m) => (m.label || '').toLowerCase());
  const hasUsableReportRadar =
    reportRadar.length >= 4 && reportRadarLabels.some(label => label && !label.includes('analyse'));
  const radarMetrics = hasUsableReportRadar ? reportRadar : metricsData;
  const fallbackMetricValue = globalScore10 > 0 ? globalScore10 : 6.5;
  const fallbackRadarMetrics: Metric[] = [
    { label: "Entrainement", value: fallbackMetricValue, max: 10, description: "Entrainement", key: "entrainement" },
    { label: "Cardio", value: fallbackMetricValue, max: 10, description: "Cardio", key: "cardio" },
    { label: "Metabolisme", value: fallbackMetricValue, max: 10, description: "Metabolisme", key: "metabolisme" },
    { label: "Sommeil", value: fallbackMetricValue, max: 10, description: "Sommeil", key: "sommeil" },
    { label: "Digestion", value: fallbackMetricValue, max: 10, description: "Digestion", key: "digestion" },
    { label: "Hormones", value: fallbackMetricValue, max: 10, description: "Hormones", key: "hormones" },
  ];

  const displayRadarMetrics = (radarMetrics.length ? radarMetrics : fallbackRadarMetrics)
    .map(metric => {
      const rawValue = typeof metric.value === "number" && !Number.isNaN(metric.value) ? metric.value : fallbackMetricValue;
      return {
        ...metric,
        value: Math.max(1, Math.min(10, rawValue)),
        max: 10,
      };
    })
    .filter(metric => typeof metric.value === "number");
  const finalRadarMetrics = displayRadarMetrics.length >= 4 ? displayRadarMetrics : fallbackRadarMetrics;
  const sortedMetrics = [...finalRadarMetrics].sort((a, b) => a.value - b.value);
  const worstMetric = sortedMetrics[0];
  const bestMetric = sortedMetrics[sortedMetrics.length - 1];
  const contentSections = navigationSections.filter(section => section.id !== 'dashboard');

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
    const currentIndex = navigationSections.findIndex(s => s.id === activeSection);
    let nextIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
    if (nextIndex < 0) nextIndex = 0;
    if (nextIndex >= navigationSections.length) nextIndex = navigationSections.length - 1;
    scrollToSection(navigationSections[nextIndex].id);
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
          auditType: 'ANABOLIC_BIOSCAN',
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

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: currentTheme.colors.background, color: currentTheme.colors.text }}>
        <div className="text-center max-w-md px-6">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" style={{ color: currentTheme.colors.primary }} />
          <p className="font-semibold mb-2">Preparation du rapport Anabolic...</p>
          {generationStatus && (
            <>
              <p className="text-sm" style={{ color: currentTheme.colors.textMuted }}>{generationSection || 'Analyse en cours'}</p>
              <div className="mt-4 h-2 w-full rounded-full overflow-hidden" style={{ backgroundColor: currentTheme.colors.surface }}>
                <div
                  className="h-full transition-all duration-300"
                  style={{ width: `${generationProgress}%`, backgroundColor: currentTheme.colors.primary }}
                />
              </div>
              <p className="text-xs mt-2" style={{ color: currentTheme.colors.textMuted }}>{generationProgress}%</p>
            </>
          )}
        </div>
      </div>
    );
  }

  // Error state
  if (error || !report) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: currentTheme.colors.background, color: currentTheme.colors.text }}>
        <div className="text-center max-w-md mx-auto px-4">
          <AlertCircle className="w-16 h-16 mx-auto mb-4" style={{ color: currentTheme.colors.primary }} />
          <h2 className="text-xl font-bold mb-2">{error || 'Rapport non disponible'}</h2>
          <p className="text-sm mb-6" style={{ color: currentTheme.colors.textMuted }}>Le rapport n'est pas encore accessible. Reessaie dans quelques minutes.</p>
          <Link href="/dashboard">
            <button
              className="px-6 py-3 font-bold rounded-lg transition"
              style={{ backgroundColor: currentTheme.colors.primary, color: currentTheme.type === 'dark' ? '#000' : '#fff' }}
            >
              Retour au dashboard
            </button>
          </Link>
        </div>
      </div>
    );
  }

  const themeVars = {
    '--color-bg': currentTheme.colors.background,
    '--color-surface': currentTheme.colors.surface,
    '--color-border': currentTheme.colors.border,
    '--color-text': currentTheme.colors.text,
    '--color-text-muted': currentTheme.colors.textMuted,
    '--color-primary': currentTheme.colors.primary,
    '--color-grid': currentTheme.colors.grid,
    '--color-on-primary': currentTheme.type === 'dark' ? '#000' : '#fff',
    '--text': currentTheme.colors.text,
    '--text-secondary': currentTheme.colors.textMuted,
    '--text-muted': currentTheme.colors.textMuted,
    '--surface-1': currentTheme.colors.surface,
    '--surface-2': currentTheme.colors.background,
    '--border': currentTheme.colors.border,
    '--primary': currentTheme.colors.primary,
    '--accent-ok': currentTheme.colors.primary,
    '--accent-warning': currentTheme.colors.primary,
  } as React.CSSProperties;
  const scoreSummary =
    globalScore >= 75
      ? 'Une base solide.'
      : globalScore >= 60
      ? "Des axes d'optimisation identifies."
      : 'Plusieurs blocages a debloquer.';

  const renderReviewSection = () => (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <Star className="w-10 h-10 mx-auto mb-4" style={{ color: currentTheme.colors.primary }} />
        <h3 className="text-2xl font-bold mb-2">Ton avis compte</h3>
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          Laisse un avis et recois ton code promo <strong>-20%</strong> sur le coaching Achzod par email.
        </p>
      </div>

      {reviewSubmitted ? (
        <div className="text-center p-8 rounded-sm" style={{ backgroundColor: 'var(--color-surface)', border: `1px solid var(--color-border)` }}>
          <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-green-500" />
          <h4 className="text-xl font-bold mb-2">Merci pour ton avis !</h4>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            Ton retour m'aide a livrer des analyses encore plus precises.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmitReview} className="space-y-6 p-8 rounded-sm" style={{ backgroundColor: 'var(--color-surface)', border: `1px solid var(--color-border)` }}>
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

          <div>
            <label className="text-sm font-medium block mb-2" style={{ color: 'var(--color-text-muted)' }}>
              Ton commentaire (min. 10 caracteres)
            </label>
            <textarea
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              placeholder="Ton retour sur l'Anabolic Bioscan..."
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

          {reviewError && (
            <div className="text-red-500 text-sm text-center p-3 rounded-lg bg-red-500/10">
              {reviewError}
            </div>
          )}

          <button
            type="submit"
            disabled={reviewSubmitting}
            className="w-full py-3 rounded font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: currentTheme.colors.primary, color: currentTheme.type === 'dark' ? '#000' : '#fff' }}
          >
            {reviewSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Envoi...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <Send className="w-4 h-4" />
                Envoyer mon avis
              </span>
            )}
          </button>
        </form>
      )}
    </div>
  );

  const renderSectionBody = (section: SectionContent) => {
    if (section.id === 'cta-debut' && report.ctaDebut) {
      return renderCtaPanel(report.ctaDebut, "Rappel", "debut");
    }

    if (section.id === 'cta-fin' && report.ctaFin) {
      return renderCtaPanel(report.ctaFin, "Execution", "fin");
    }

    if (section.id === 'supplements') {
      return (
        <div className="p-6 rounded-sm border" style={{ backgroundColor: 'var(--color-surface)', border: `1px solid var(--color-border)` }}>
          {report.supplementsHtml && (
            <div
              className={`mb-8 prose max-w-none ${currentTheme.type === 'dark' ? 'prose-invert' : ''}`}
              style={{
                color: currentTheme.colors.text,
                '--tw-prose-body': currentTheme.colors.text,
                '--tw-prose-headings': currentTheme.colors.text,
                '--tw-prose-strong': currentTheme.colors.text,
                '--tw-prose-bullets': currentTheme.colors.primary
              } as React.CSSProperties}
              dangerouslySetInnerHTML={{ __html: report.supplementsHtml }}
            />
          )}

          {safeSupplementStack.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-border)]">
                    <th className="text-left py-3 px-2 text-[var(--color-text-muted)] font-bold">Supplement</th>
                    <th className="text-left py-3 px-2 text-[var(--color-text-muted)] font-bold">Dosage</th>
                    <th className="text-left py-3 px-2 text-[var(--color-text-muted)] font-bold">Timing</th>
                    <th className="text-left py-3 px-2 text-[var(--color-text-muted)] font-bold hidden md:table-cell">Duree</th>
                  </tr>
                </thead>
                <tbody>
                  {safeSupplementStack.slice(0, 10).map((supp, idx) => (
                    <tr key={idx} className="border-b border-[var(--color-border)]/50">
                      <td className="py-3 px-2">
                        <span className="font-medium" style={{ color: currentTheme.colors.primary }}>{supp.name}</span>
                        {supp.brands?.length > 0 && (
                          <div className="text-xs text-[var(--color-text-muted)]">{supp.brands[0]}</div>
                        )}
                      </td>
                      <td className="py-3 px-2">
                        <span className="px-2 py-1 rounded bg-[var(--color-bg)] text-xs font-mono">{supp.dosage}</span>
                      </td>
                      <td className="py-3 px-2 text-[var(--color-text-muted)]">{supp.timing}</td>
                      <td className="py-3 px-2 text-[var(--color-text-muted)] hidden md:table-cell">{supp.duration}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      );
    }

    if (section.id === 'plan') {
      return (
        <div className="space-y-4">
          {[
            { title: 'Semaine 1', subtitle: 'Fondations', content: report.weeklyPlan?.week1, alpha: 0.7 },
            { title: 'Semaine 2', subtitle: 'Consolidation', content: report.weeklyPlan?.week2, alpha: 0.55 },
            { title: 'Semaines 3-4', subtitle: 'Optimisation', content: report.weeklyPlan?.weeks3_4, alpha: 0.45 },
            { title: 'Mois 2-3', subtitle: 'Maintenance', content: report.weeklyPlan?.months2_3, alpha: 0.35 }
          ].map((phase, idx) => (
            <div key={idx} className="flex gap-4">
              <div className="w-1 rounded-full" style={{ backgroundColor: withAlpha(primary, phase.alpha) }} />
              <div className="flex-1 p-4 rounded border" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                <div className="flex items-center gap-2 mb-2">
                  <h4 className="font-bold">{phase.title}</h4>
                  <span className="px-2 py-0.5 rounded text-xs bg-[var(--color-bg)] text-[var(--color-text-muted)]">
                    {phase.subtitle}
                  </span>
                </div>
                <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">{phase.content}</p>
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (section.id === 'review') {
      return renderReviewSection();
    }

    if (section.id === 'upgrade') {
      return (
        <div className="p-8 rounded-xl border text-center" style={{ borderColor: primaryBorder, backgroundColor: primarySoft }}>
          <div className="flex items-center justify-center gap-2 mb-4">
            <Crown className="w-6 h-6" style={{ color: currentTheme.colors.primary }} />
            <span className="text-sm font-medium uppercase tracking-wider" style={{ color: currentTheme.colors.primary }}>
              Niveau Superieur
            </span>
          </div>
          <h2 className="text-2xl font-bold mb-4">Passe a l'Ultimate Scan</h2>
          <p className="mb-6 max-w-xl mx-auto" style={{ color: currentTheme.colors.textMuted }}>
            L'Ultimate Scan inclut l'analyse photo complete (posture, masse musculaire, repartition graisse), des protocoles correctifs biomecaniques, et un accompagnement personnalise pour des resultats encore plus precis.
          </p>
          <a
            href="/offers/ultimate-scan"
            className="inline-flex items-center gap-2 px-8 py-4 rounded font-semibold text-lg transition-all hover:scale-105"
            style={{
              backgroundColor: currentTheme.colors.primary,
              color: currentTheme.type === 'dark' ? '#000' : '#FFF'
            }}
          >
            <Zap className="w-5 h-5" />
            Debloquer l'Ultimate Scan
          </a>
          <p className="mt-4 text-sm" style={{ color: currentTheme.colors.textMuted }}>
            Garantie satisfait ou rembourse 30 jours
          </p>
        </div>
      );
    }

    return (
      <div
        className={`prose prose-lg max-w-none ${currentTheme.type === 'dark' ? 'prose-invert' : ''} prose-p:text-[var(--color-text)] prose-p:leading-relaxed prose-headings:text-[var(--color-text)] prose-strong:text-[var(--color-text)]`}
        style={{
          color: currentTheme.colors.text,
          '--tw-prose-body': currentTheme.colors.text,
          '--tw-prose-headings': currentTheme.colors.text,
          '--tw-prose-strong': currentTheme.colors.text,
          '--tw-prose-bullets': currentTheme.colors.primary
        } as React.CSSProperties}
        dangerouslySetInnerHTML={{ __html: section.content }}
      />
    );
  };

  const handleBoundaryRetry = () => {
    if (!auditId) return;
    fetch(`/api/audit/${auditId}/regenerate`, { method: 'POST' })
      .catch(() => {})
      .finally(() => {
        if (typeof window !== 'undefined') {
          window.location.reload();
        }
      });
  };

  return (
    <ReportErrorBoundary onRetry={handleBoundaryRetry}>
      <div
        className="ultrahuman-report flex h-screen font-sans overflow-hidden selection:bg-white/20 relative transition-colors duration-500"
        style={{ ...themeVars, backgroundColor: currentTheme.colors.background, color: currentTheme.colors.text }}
      >
        <div className="fixed top-0 left-0 right-0 h-1 z-[60]" style={{ backgroundColor: 'var(--color-border)' }}>
          <div
            className="h-full transition-all duration-150 ease-out"
            style={{ width: `${scrollProgress}%`, backgroundColor: currentTheme.colors.primary }}
          />
        </div>

        <div
          className="fixed inset-0 pointer-events-none"
          style={{
            backgroundImage: `linear-gradient(to right, ${currentTheme.colors.grid} 1px, transparent 1px), linear-gradient(to bottom, ${currentTheme.colors.grid} 1px, transparent 1px)`,
            backgroundSize: '60px 60px'
          }}
        />

        <aside className={`fixed inset-y-0 left-0 z-50 w-80 transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} border-r flex flex-col`}
          style={{ backgroundColor: 'var(--color-bg)', borderColor: 'var(--color-border)' }}>
          <Sidebar
            sections={navigationSections}
            activeSection={activeSection}
            onNavigate={scrollToSection}
            themes={THEMES}
            currentTheme={currentTheme}
            onThemeChange={setCurrentTheme}
            clientName={displayName}
            auditType="ANABOLIC_BIOSCAN"
          />
        </aside>

        {mobileMenuOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-30 lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        <main ref={mainContentRef} className="flex-1 overflow-y-auto relative z-10 scroll-smooth">
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

          <div className="lg:hidden sticky top-0 z-40 backdrop-blur-md px-4 py-4 flex items-center justify-between" style={{ backgroundColor: 'var(--color-bg)', borderBottom: `1px solid var(--color-border)` }}>
            <span className="font-bold text-sm tracking-widest uppercase">{displayName}</span>
            <button onClick={() => setMobileMenuOpen(true)}><Menu size={20} /></button>
          </div>

          <div className="max-w-[1200px] mx-auto p-6 lg:p-12 space-y-12 lg:space-y-32">
            <div id="dashboard" className="pt-8 lg:pt-12">
              <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-12">
                <div className="space-y-6 max-w-2xl">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full" style={{ border: `1px solid var(--color-border)`, backgroundColor: 'var(--color-surface)' }}>
                    <span className="w-1.5 h-1.5 rounded-full animate-pulse bg-green-500"></span>
                    <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>Anabolic Bioscan</span>
                  </div>
                  <h1 className="text-5xl lg:text-7xl font-medium tracking-tighter leading-[0.9]">
                    {displayName}, <br />
                    <span style={{ color: currentTheme.colors.textMuted }}>voici ton bioscan.</span>
                  </h1>
                  <p className="text-lg leading-relaxed max-w-lg" style={{ color: 'var(--color-text-muted)' }}>
                    {Math.round(globalScore)}/100 — {scoreSummary}
                  </p>
                </div>

                <div className="flex gap-4 items-end">
                  <div className="text-right hidden md:block">
                    <div className="text-3xl font-bold font-mono">{Math.round(globalScore)}<span className="text-lg opacity-50">/100</span></div>
                    <div className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>Score Global</div>
                  </div>
                </div>
              </header>

              <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="lg:col-span-1 lg:row-span-2 rounded-sm p-8 flex flex-col justify-between relative overflow-hidden group" style={{ backgroundColor: 'var(--color-surface)', border: `1px solid var(--color-border)` }}>
                  <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity duration-500">
                    <Activity size={80} />
                  </div>
                  <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>Performance Globale</h3>
                  <div className="flex items-center justify-center py-8">
                    <RadialProgress
                      score={Math.round(globalScore)}
                      max={100}
                      size={180}
                      strokeWidth={4}
                      color={currentTheme.colors.primary}
                    />
                  </div>
                  <div className="flex items-center justify-center">
                    <span className={`text-xs font-medium px-3 py-1 rounded-full ${getMetricStatus(globalScore10).color}`}>
                      {getMetricStatus(globalScore10).label}
                    </span>
                  </div>
                </div>

                <div className="lg:col-span-2 lg:row-span-2 rounded-sm p-1 relative group" style={{ backgroundColor: 'var(--color-surface)', border: `1px solid var(--color-border)` }}>
                  <div className="absolute top-6 left-6 z-10">
                    <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>Balance Systemique</h3>
                  </div>
                  <div className="h-full w-full min-h-[300px] flex items-center justify-center pt-8">
                    <MetricsRadar
                      data={finalRadarMetrics}
                      color={currentTheme.colors.primary}
                      gridColor={currentTheme.colors.grid}
                      labelColor={currentTheme.colors.textMuted}
                      tooltipBg={currentTheme.colors.surface}
                      tooltipBorder={currentTheme.colors.border}
                      tooltipText={currentTheme.colors.text}
                    />
                  </div>
                </div>

                <div className="rounded-sm p-6 flex flex-col justify-between hover:opacity-90 transition-colors cursor-default" style={{ backgroundColor: 'var(--color-surface)', border: `1px solid var(--color-border)` }}>
                  <div className="flex justify-between items-start">
                    {React.createElement(METRIC_ICONS[worstMetric?.key || "stress"] || Brain, { size: 20, style: { color: 'var(--color-text-muted)' } })}
                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${getMetricStatus(worstMetric?.value || 0).color}`}>
                      {getMetricStatus(worstMetric?.value || 0).label}
                    </span>
                  </div>
                  <div>
                    <div className="text-2xl font-medium mt-4">{worstMetric?.value ?? globalScore10}<span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>/10</span></div>
                    <div className="text-xs font-mono uppercase mt-1" style={{ color: 'var(--color-text-muted)' }}>{worstMetric?.label || 'Priorite'}</div>
                  </div>
                </div>

                <div className="rounded-sm p-6 flex flex-col justify-between hover:opacity-90 transition-colors cursor-default" style={{ backgroundColor: 'var(--color-surface)', border: `1px solid var(--color-border)` }}>
                  <div className="flex justify-between items-start">
                    {React.createElement(METRIC_ICONS[bestMetric?.key || "energie"] || Zap, { size: 20, style: { color: 'var(--color-text-muted)' } })}
                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${getMetricStatus(bestMetric?.value || 0).color}`}>
                      {getMetricStatus(bestMetric?.value || 0).label}
                    </span>
                  </div>
                  <div>
                    <div className="text-2xl font-medium mt-4">{bestMetric?.value ?? globalScore10}<span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>/10</span></div>
                    <div className="text-xs font-mono uppercase mt-1" style={{ color: 'var(--color-text-muted)' }}>{bestMetric?.label || 'Point fort'}</div>
                  </div>
                </div>

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
                    <ProjectionChart color={currentTheme.colors.primary} currentScore={globalScore10} />
                  </div>
                </div>
              </section>
            </div>

            <div className="space-y-0 relative">
              <div className="absolute left-0 lg:left-[240px] top-0 bottom-0 w-[1px] hidden lg:block" style={{ backgroundColor: 'var(--color-border)' }}></div>

              {contentSections.map((section, idx) => (
                <section key={section.id} id={section.id} className="scroll-mt-32 group relative pb-24 lg:pb-32">
                  <div className="flex flex-col lg:flex-row gap-8 lg:gap-24">
                    <div className="lg:w-[240px] flex-shrink-0">
                      <div className="sticky top-24 pr-8 lg:text-right">
                        <span className="font-mono text-4xl lg:text-5xl font-bold group-hover:opacity-50 transition-colors block mb-2 opacity-20" style={{ color: 'var(--color-border)' }}>
                          {idx + 1 < 10 ? `0${idx + 1}` : idx + 1}
                        </span>
                        <h2 className="text-xl font-bold tracking-tight mb-2 leading-tight" style={{ color: 'var(--color-text)' }}>
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

                    <div className="flex-1 min-w-0">
                      {renderSectionBody(section)}
                    </div>
                  </div>
                </section>
              ))}
            </div>
          </div>
        </main>
      </div>
    </ReportErrorBoundary>
  );
};

export default AnabolicScanReport;
