/**
 * APEXLABS - Anabolic Bioscan Report
 * Style Ultrahuman - Dashboard Anabolic avec sections detaillees
 */

import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'wouter';
import { Sidebar } from '@/components/ultrahuman/Sidebar';
import { RadialProgress } from '@/components/ultrahuman/RadialProgress';
import { MetricsRadar, ProjectionChart } from '@/components/ultrahuman/Charts';
import { ULTRAHUMAN_THEMES } from '@/components/ultrahuman/themes';
import { Theme, SectionContent, Metric } from '@/components/ultrahuman/types';
import { COACHING_OFFER_TIERS, formatEuro, getDeductionAmount } from '@/components/ultrahuman/coachingOffers';
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

const SECTION_ICON_BY_ID: Record<string, React.ElementType> = {
  'executive-summary': Target,
  'analyse-entrainement-et-periodisation': Dumbbell,
  'analyse-systeme-cardiovasculaire': Heart,
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
  if (title.includes('entrainement')) return Dumbbell;
  if (title.includes('cardio')) return Heart;
  if (title.includes('metabolisme') || title.includes('nutrition')) return Flame;
  if (title.includes('sommeil')) return Moon;
  if (title.includes('digestion')) return Activity;
  if (title.includes('hormon')) return Brain;
  if (title.includes('protocole')) return Activity;
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

  // Scroll handling
  useEffect(() => {
    const handleScroll = () => {
      if (!mainContentRef.current || !report) return;
      const container = mainContentRef.current;
      const totalScroll = container.scrollTop;
      const windowHeight = container.clientHeight;
      const totalHeight = container.scrollHeight - windowHeight;
      const progress = totalHeight > 0 ? (totalScroll / totalHeight) * 100 : 0;
      setScrollProgress(progress);
    };

    const container = mainContentRef.current;
    if (container) container.addEventListener('scroll', handleScroll);
    return () => container?.removeEventListener('scroll', handleScroll);
  }, [report]);

  // Convert NarrativeSection to SectionContent for Sidebar
  const sidebarSections: SectionContent[] = report?.sections.map(s => ({
    id: s.id,
    title: s.title,
    subtitle: `Score: ${s.score}%`,
    content: s.introduction
  })) || [];

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

  // Add special sections
  const allSections: SectionContent[] = [
    { id: 'dashboard', title: 'Dashboard', subtitle: 'Vue globale', content: '' },
    ...(report?.ctaDebut ? [{ id: 'cta-debut', title: 'Rappel Coaching', subtitle: 'Important', content: '' }] : []),
    ...sidebarSections,
    { id: 'supplements', title: 'Stack Supplements', subtitle: 'Protocole', content: '' },
    { id: 'plan', title: 'Plan 12 Semaines', subtitle: 'Action', content: '' },
    ...(report?.ctaFin ? [{ id: 'cta-fin', title: 'Coaching', subtitle: 'Prochaine etape', content: '' }] : []),
    { id: 'review', title: 'Votre Avis', subtitle: 'Feedback', content: '' }
  ];

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
  const reportRadar = report?.radarMetrics || [];
  const reportRadarLabels = reportRadar.map((m) => (m.label || '').toLowerCase());
  const hasUsableReportRadar =
    reportRadar.length >= 4 && reportRadarLabels.some(label => label && !label.includes('analyse'));
  const radarMetrics = hasUsableReportRadar ? reportRadar : metricsData;

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
    if (nextIndex < 0) nextIndex = 0;
    if (nextIndex >= allSections.length) nextIndex = allSections.length - 1;
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

  const globalScore = report.global;
  const primary = currentTheme.colors.primary;
  const primarySoft = withAlpha(primary, 0.12);
  const primaryBorder = withAlpha(primary, 0.25);
  const primaryFaint = withAlpha(primary, 0.08);
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
  const toHtml = (value: string) => {
    if (!value) return "";
    if (/<[a-z][\s\S]*>/i.test(value)) return value;
    return value
      .split(/\n\s*\n/)
      .map(p => p.trim())
      .filter(Boolean)
      .map(p => `<p>${p}</p>`)
      .join("");
  };

  return (
    <div
      className="ultrahuman-report min-h-screen flex"
      style={{ ...themeVars, backgroundColor: currentTheme.colors.background, color: currentTheme.colors.text }}
    >
      {/* Progress Bar */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-black/50 z-50">
        <div
          className="h-full transition-all duration-300"
          style={{ width: `${scrollProgress}%`, backgroundColor: currentTheme.colors.primary }}
        />
      </div>

      {/* Mobile Menu Button */}
      <button
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg"
        style={{ backgroundColor: currentTheme.colors.surface }}
      >
        <Menu size={24} />
      </button>

      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 left-0 h-screen w-72 border-r z-40 transition-transform lg:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{
          backgroundColor: currentTheme.colors.background,
          borderColor: currentTheme.colors.border
        }}
      >
        <Sidebar
          sections={allSections}
          activeSection={activeSection}
          onNavigate={scrollToSection}
          themes={THEMES}
          currentTheme={currentTheme}
          onThemeChange={setCurrentTheme}
          clientName={clientName}
          auditType="ANABOLIC_BIOSCAN"
        />
      </aside>

      {/* Overlay for mobile */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Main Content */}
      <main
        ref={mainContentRef}
        className="flex-1 overflow-y-auto h-screen"
        style={{ backgroundColor: currentTheme.colors.background }}
      >
        <div className="max-w-4xl mx-auto px-6 py-12 lg:py-16">
          {/* Header Badge */}
          <div className="flex items-center gap-3 mb-8">
            <div
              className="flex items-center gap-2 px-3 py-1.5 rounded-full border"
              style={{ backgroundColor: primarySoft, borderColor: primaryBorder }}
            >
              <Crown size={14} style={{ color: primary }} />
              <span className="text-xs font-bold tracking-wider" style={{ color: primary }}>ANABOLIC BIOSCAN</span>
            </div>
            <span className="text-xs text-[var(--color-text-muted)]">{report.sections.length} sections</span>
          </div>

          {report.ctaDebut && (
            <section id="cta-debut" className="mb-12">
              <h3 className="text-lg font-bold mb-4" style={{ color: primary }}>Rappel Coaching</h3>
              {renderCtaPanel(report.ctaDebut, "Rappel", "debut")}
            </section>
          )}

          {/* Dashboard Section */}
          <section id="dashboard" className="mb-16">
            <div className="grid lg:grid-cols-2 gap-8 mb-12">
              {/* Score Circle */}
              <div className="flex flex-col items-center justify-center p-8 rounded-sm border"
                style={{ backgroundColor: currentTheme.colors.surface, borderColor: currentTheme.colors.border }}>
                <RadialProgress
                  score={globalScore}
                  max={100}
                  subLabel="SCORE GLOBAL"
                  size={200}
                  strokeWidth={6}
                  color={currentTheme.colors.primary}
                />
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

              {/* Radar Chart */}
              <div className="p-6 rounded-sm border"
                style={{ backgroundColor: currentTheme.colors.surface, borderColor: currentTheme.colors.border }}>
                <h3 className="text-sm font-bold mb-4 uppercase tracking-wider text-[var(--color-text-muted)]">
                  Radar Performance
                </h3>
                <MetricsRadar
                  data={radarMetrics}
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
            <div className="p-6 rounded-sm border mb-8"
              style={{ backgroundColor: currentTheme.colors.surface, borderColor: currentTheme.colors.border }}>
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Target size={20} style={{ color: primary }} />
                Synthese Executive
              </h3>
              <div className={`prose max-w-none ${currentTheme.type === 'dark' ? 'prose-invert' : ''}`}>
                {report.heroSummary.split('\n').map((para, i) => (
                  para.trim() && <p key={i} className="text-[var(--color-text-muted)] leading-relaxed mb-3">{para}</p>
                ))}
              </div>
            </div>

            {/* Strengths & Weaknesses */}
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <div
                className="p-6 rounded-sm border"
                style={{ borderColor: primaryBorder, backgroundColor: primaryFaint }}
              >
                <h4 className="text-sm font-bold mb-4 flex items-center gap-2" style={{ color: primary }}>
                  <TrendingUp size={16} />
                  Points Forts
                </h4>
                <div className="space-y-2">
                  {report.sections
                    .filter(s => s.score >= 70)
                    .slice(0, 3)
                    .map(s => (
                      <div key={s.id} className="flex items-center justify-between p-2 rounded" style={{ backgroundColor: primarySoft }}>
                        <span className="text-sm">{s.title}</span>
                        <span className="text-xs font-bold" style={{ color: primary }}>{s.score}%</span>
                      </div>
                    ))}
                </div>
              </div>

              <div
                className="p-6 rounded-sm border"
                style={{ borderColor: primaryBorder, backgroundColor: primaryFaint }}
              >
                <h4 className="text-sm font-bold mb-4 flex items-center gap-2" style={{ color: primary }}>
                  <TrendingDown size={16} />
                  Axes d'Optimisation
                </h4>
                <div className="space-y-2">
                  {report.sections
                    .filter(s => s.score < 60)
                    .slice(0, 3)
                    .map(s => (
                      <div key={s.id} className="flex items-center justify-between p-2 rounded" style={{ backgroundColor: primarySoft }}>
                        <span className="text-sm">{s.title}</span>
                        <span className="text-xs font-bold" style={{ color: primary }}>{s.score}%</span>
                      </div>
                    ))}
                </div>
              </div>
            </div>

            {/* Projection */}
            <div className="p-6 rounded-sm border"
              style={{ backgroundColor: currentTheme.colors.surface, borderColor: currentTheme.colors.border }}>
              <h3 className="text-sm font-bold mb-4 uppercase tracking-wider text-[var(--color-text-muted)]">
                Projection 90 Jours
              </h3>
              <ProjectionChart color={currentTheme.colors.primary} currentScore={globalScore / 10} />
            </div>
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
                      <span className="px-2 py-0.5 rounded text-xs font-bold border" style={status.style}>
                        {section.score}%
                      </span>
                      <span className="text-xs text-[var(--color-text-muted)]">{status.label}</span>
                    </div>
                  </div>
                </div>

                <div className="p-6 rounded-sm border space-y-6"
                  style={{ backgroundColor: currentTheme.colors.surface, borderColor: currentTheme.colors.border }}>

                  {section.introduction && (
                    <div>
                      <h4 className="text-sm font-bold text-[var(--color-text-muted)] mb-2">ANALYSE</h4>
                      <div
                        className={`prose max-w-none ${currentTheme.type === 'dark' ? 'prose-invert' : ''} prose-p:text-[var(--color-text)] prose-p:leading-relaxed prose-strong:text-[var(--color-text)] prose-ul:text-[var(--color-text-muted)]`}
                        style={{
                          color: currentTheme.colors.text,
                          '--tw-prose-body': currentTheme.colors.text,
                          '--tw-prose-headings': currentTheme.colors.text,
                          '--tw-prose-strong': currentTheme.colors.text,
                          '--tw-prose-bullets': currentTheme.colors.primary
                        } as React.CSSProperties}
                        dangerouslySetInnerHTML={{ __html: toHtml(section.introduction) }}
                      />
                    </div>
                  )}

                  {section.whatIsWrong && (
                    <div className="p-4 rounded border" style={{ backgroundColor: primarySoft, borderColor: primaryBorder }}>
                      <h4 className="text-sm font-bold mb-2" style={{ color: primary }}>CE QUI NE VA PAS</h4>
                      <div
                        className={`prose max-w-none ${currentTheme.type === 'dark' ? 'prose-invert' : ''} prose-p:text-[var(--color-text-muted)] prose-strong:text-[var(--color-text)]`}
                        style={{ color: currentTheme.colors.text } as React.CSSProperties}
                        dangerouslySetInnerHTML={{ __html: toHtml(section.whatIsWrong) }}
                      />
                    </div>
                  )}

                  {section.recommendations && (
                    <div className="p-4 rounded border" style={{ backgroundColor: primarySoft, borderColor: primaryBorder }}>
                      <h4 className="text-sm font-bold mb-2" style={{ color: primary }}>RECOMMANDATIONS</h4>
                      <div
                        className={`prose max-w-none ${currentTheme.type === 'dark' ? 'prose-invert' : ''} prose-p:text-[var(--color-text-muted)] prose-strong:text-[var(--color-text)]`}
                        style={{ color: currentTheme.colors.text } as React.CSSProperties}
                        dangerouslySetInnerHTML={{ __html: toHtml(section.recommendations) }}
                      />
                    </div>
                  )}

                  {section.actionPlan && (
                    <div>
                      <h4 className="text-sm font-bold text-[var(--color-text-muted)] mb-2">PLAN D'ACTION</h4>
                      <div
                        className={`prose max-w-none ${currentTheme.type === 'dark' ? 'prose-invert' : ''} prose-p:text-[var(--color-text)] prose-p:leading-relaxed prose-strong:text-[var(--color-text)]`}
                        style={{ color: currentTheme.colors.text } as React.CSSProperties}
                        dangerouslySetInnerHTML={{ __html: toHtml(section.actionPlan) }}
                      />
                    </div>
                  )}
                </div>
              </section>
            );
          })}

          {/* Supplements Section */}
          <section id="supplements" className="mb-12 scroll-mt-24">
            <div className="flex items-center gap-4 mb-6">
              <Pill size={24} style={{ color: currentTheme.colors.primary }} />
              <h2 className="text-xl font-bold">Stack Supplements Personnalise</h2>
            </div>

            <div className="p-6 rounded-sm border"
              style={{ backgroundColor: currentTheme.colors.surface, borderColor: currentTheme.colors.border }}>
              {report.supplementsHtml && (
                <div
                  className={`mb-8 prose max-w-none ${currentTheme.type === 'dark' ? 'prose-invert' : ''} prose-p:text-[var(--color-text-muted)] prose-strong:text-[var(--color-text)]`}
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

              {report.supplementStack?.length > 0 && (
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
                      {report.supplementStack?.slice(0, 10).map((supp, idx) => (
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
          </section>

          {/* Weekly Plan Section */}
          <section id="plan" className="mb-12 scroll-mt-24">
            <div className="flex items-center gap-4 mb-6">
              <Calendar size={24} style={{ color: currentTheme.colors.primary }} />
              <h2 className="text-xl font-bold">Plan d'Action 12 Semaines</h2>
            </div>

            <div className="space-y-4">
              {[
                { title: 'Semaine 1', subtitle: 'Fondations', content: report.weeklyPlan?.week1, alpha: 0.7 },
                { title: 'Semaine 2', subtitle: 'Consolidation', content: report.weeklyPlan?.week2, alpha: 0.55 },
                { title: 'Semaines 3-4', subtitle: 'Optimisation', content: report.weeklyPlan?.weeks3_4, alpha: 0.45 },
                { title: 'Mois 2-3', subtitle: 'Maintenance', content: report.weeklyPlan?.months2_3, alpha: 0.35 }
              ].map((phase, idx) => (
                <div key={idx} className="flex gap-4">
                  <div className="w-1 rounded-full" style={{ backgroundColor: withAlpha(primary, phase.alpha) }} />
                  <div className="flex-1 p-4 rounded border"
                    style={{ backgroundColor: currentTheme.colors.surface, borderColor: currentTheme.colors.border }}>
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
          </section>

          {/* Conclusion */}
          {report.conclusion && (
            <section className="mb-12 p-6 rounded-sm border-2"
              style={{ borderColor: currentTheme.colors.primary, backgroundColor: `${currentTheme.colors.primary}10` }}>
              <h3 className="text-lg font-bold mb-4">Conclusion</h3>
              <p className="text-[var(--color-text)] leading-relaxed">{report.conclusion}</p>
              <div className="mt-4 flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
                <Activity size={16} />
                <span>Analyse realisee par <strong>ACHZOD</strong></span>
              </div>
            </section>
          )}

          {report.ctaFin && (
            <section id="cta-fin" className="mb-12">
              <h3 className="text-lg font-bold mb-4" style={{ color: primary }}>Coaching Personnalise</h3>
              {renderCtaPanel(report.ctaFin, "Execution", "fin")}
            </section>
          )}

          {/* Review Section */}
          <section id="review" className="mb-12 scroll-mt-24">
            <div className="p-6 rounded-sm border"
              style={{ backgroundColor: currentTheme.colors.surface, borderColor: currentTheme.colors.border }}>
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Star size={20} style={{ color: currentTheme.colors.primary }} />
                Ton Avis Compte
              </h3>

              {reviewSubmitted ? (
                <div
                  className="flex items-center gap-3 p-4 rounded border"
                  style={{ backgroundColor: primarySoft, borderColor: primaryBorder }}
                >
                  <CheckCircle2 size={24} style={{ color: primary }} />
                  <div>
                    <p className="font-bold" style={{ color: primary }}>Merci pour ton avis !</p>
                    <p className="text-sm text-[var(--color-text-muted)]">Ton retour m'aide a m'ameliorer.</p>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmitReview} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Note</label>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map(star => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setReviewRating(star)}
                          className="transition-transform hover:scale-110"
                        >
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
                      placeholder="Qu'as-tu pense de ton rapport ?"
                      className="w-full p-3 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text)] placeholder-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-primary)]"
                      rows={3}
                    />
                    <p className="text-xs text-[var(--color-text-muted)] mt-1">
                      {reviewComment.length}/10 caracteres minimum
                    </p>
                  </div>

                  {reviewError && (
                    <p className="text-red-400 text-sm">{reviewError}</p>
                  )}

                  <button
                    type="submit"
                    disabled={reviewSubmitting}
                    className="flex items-center gap-2 px-6 py-3 rounded-lg font-bold transition-all disabled:opacity-50"
                    style={{ backgroundColor: currentTheme.colors.primary, color: currentTheme.type === 'dark' ? '#000' : '#fff' }}
                  >
                    {reviewSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                    Envoyer
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
          </section>

          {/* Footer */}
          <footer className="py-12 text-center" style={{ borderTop: `1px solid ${currentTheme.colors.border}` }}>
            <p className="text-sm" style={{ color: currentTheme.colors.textMuted }}>
              Anabolic Bioscan - ApexLabs by Achzod
            </p>
          </footer>
        </div>
      </main>

      {/* Floating Navigation */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-2 z-40">
        <button
          onClick={() => navigateChapter('prev')}
          className="p-3 rounded-full shadow-lg transition-all hover:scale-105"
          style={{ backgroundColor: currentTheme.colors.surface, borderColor: currentTheme.colors.border }}
        >
          <ArrowUp size={20} />
        </button>
        <button
          onClick={() => navigateChapter('next')}
          className="p-3 rounded-full shadow-lg transition-all hover:scale-105"
          style={{ backgroundColor: currentTheme.colors.primary, color: currentTheme.type === 'dark' ? '#000' : '#fff' }}
        >
          <ArrowDown size={20} />
        </button>
      </div>
    </div>
  );
};

export default AnabolicScanReport;
